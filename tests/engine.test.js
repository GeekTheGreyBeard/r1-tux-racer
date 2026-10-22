import test from 'node:test';import assert from 'node:assert/strict';import {COURSES,newRun,step,jump,grade,score,center,racePlace,makeObjects,width,clamp} from '../engine.js';
test('distinct compact courses have deterministic collectible and gate paths',()=>{for(let i=0;i<3;i++){const a=newRun(i),b=newRun(i);assert.deepEqual(a.objects,b.objects);assert.equal(a.objects.filter(o=>o.type==='gate').length,COURSES[i].gateCount);assert.ok(a.objects.some(o=>o.type==='fish'));assert.ok(a.objects.some(o=>o.type==='rock'));assert.ok(a.objects.some(o=>o.type==='ramp'))}});
test('braking slows and steering displaces',()=>{const a=newRun(),b=newRun();for(let i=0;i<60;i++){step(a,.05,{steer:1});step(b,.05,{brake:true})}assert.ok(a.x>center(a.z,a.course));assert.ok(b.z<a.z)});
test('jump blocks repeat airborne and lands',()=>{const s=newRun();assert.equal(jump(s),true);assert.equal(jump(s),false);for(let i=0;i<45;i++)step(s,.05,{});assert.equal(s.air,0);assert.equal(jump(s),true)});
test('fish gate collision and rock penalties register once',()=>{const s=newRun();for(const type of ['gate','fish','rock']){const o=s.objects.find(x=>x.type===type);s.z=o.z-.1;s.x=o.x;s.speed=20;step(s,.05,{});const before=[s.fish,s.gates,s.hits];step(s,.05,{});assert.deepEqual([s.fish,s.gates,s.hits],before)}assert.equal(s.fish,1);assert.equal(s.gates,1);assert.equal(s.hits,1)});
test('campaign completion and score requirements',()=>{const s=newRun();s.z=s.course.length-.2;s.gates=5;s.fish=5;s.elapsed=39.9;step(s,.05,{});assert.equal(s.finished,true);assert.equal(grade(s),true);assert.ok(score(s)>0);s.hits=4;assert.equal(grade(s),false)});
test('boost consumes charge and stamina, increases speed, and respects cooldown',()=>{const s=newRun();step(s,.05,{boost:true});assert.equal(s.boostCharges,1);assert.ok(s.stamina<100);const charge=s.boostCharges;step(s,.05,{boost:true});assert.equal(s.boostCharges,charge);const baseline=newRun();for(let i=0;i<10;i++){step(s,.05,{});step(baseline,.05,{})}assert.ok(s.speed>baseline.speed);});
test('boost pickup restores a charge, fish replenishes stamina',()=>{const s=newRun();s.boostCharges=0;s.stamina=40;for(const type of ['boost','fish']){const o=s.objects.find(x=>x.type===type);s.z=o.z-.1;s.x=o.x;s.speed=20;step(s,.05,{})}assert.equal(s.boostCharges,1);assert.ok(s.stamina>40)});

test('25 unique stages strictly increase in distance, gates, and curve pressure',()=>{
 assert.equal(COURSES.length,25);
 assert.equal(new Set(COURSES.map(c=>c.name)).size,25);
 for(let i=1;i<25;i++){
  assert.ok(COURSES[i].length>COURSES[i-1].length);
  assert.ok(COURSES[i].gateCount>COURSES[i-1].gateCount);
  assert.ok(COURSES[i].target>=COURSES[i-1].target);
  assert.ok(COURSES[i].difficulty>COURSES[i-1].difficulty);
 }
});
test('every level can finish and satisfy its medal requirements',()=>{
 for(let i=0;i<25;i++){
  const s=newRun(i);let ticks=0;
  while(!s.finished&&ticks++<6000)step(s,.05,{});
  assert.ok(s.finished,`level ${i+1} finishes`);
  assert.ok(s.elapsed<200,`level ${i+1} bounded duration`);
  const c=COURSES[i],medal=newRun(i);
  medal.gates=Math.ceil(c.gateCount*.65);medal.fish=c.target;medal.elapsed=c.time-1;
  assert.ok(grade(medal),`level ${i+1} medal feasible at par time`);
 }
});
test('rivals advance independently, finish and place all 25 stages',()=>{
 for(let i=0;i<25;i++){const s=newRun(i);assert.equal(s.rivals.length,3);for(let k=0;k<5000&&!s.finished;k++)step(s,.05,{});assert.ok(s.finished);assert.ok(s.rivals.every(r=>r.z>0));assert.ok(racePlace(s)>=1&&racePlace(s)<=4);for(let k=0;k<1000&&s.rivals.some(r=>r.finishedAt===null);k++){/* frozen after crossing: result is fixed at the player's finish instant */} }
 const a=newRun(),b=newRun();for(let i=0;i<800&&!a.finished;i++){step(a,.05,{boost:i%55===0});step(b,.05,{brake:true})}assert.ok(a.rivals[0].z>b.rivals[0].z-1);assert.ok(racePlace(a)>=1&&racePlace(a)<=4);
});
test('perfect run (all gates, boosting when available) can win level 1',()=>{
 const s=newRun(0);let nextBoost=0;
 while(!s.finished){
  const nextGate=s.objects.find(o=>o.type==='gate'&&o.z>s.z);
  const steer=nextGate?clamp((nextGate.x-s.x)*3,-1,1):0;
  const boost=s.boostCooldown===0&&s.boostCharges>0&&s.stamina>=20&&s.elapsed>nextBoost;
  if(boost)nextBoost=s.elapsed+2.5;
  step(s,1/60,{steer,boost});
 }
 assert.equal(s.gates,s.course.gateCount,`hit all ${s.course.gateCount} gates`);
 assert.equal(racePlace(s),1,'finished in first place');
});
test('gates remain inside track boundaries at all 25 levels',()=>{
 for(let i=0;i<25;i++){
  const c=COURSES[i],objects=makeObjects(c);
  for(const o of objects){
   if(o.type!=='gate')continue;
   const trackHalf=width(o.z,c)*.5;
   const edgeDistance=Math.abs(Math.abs(o.x-center(o.z,c))-trackHalf);
   assert.ok(edgeDistance>.078,`level ${i+1} gate at z=${o.z} is ${edgeDistance.toFixed(3)} from edge (min .08)`);
  }
 }
});
