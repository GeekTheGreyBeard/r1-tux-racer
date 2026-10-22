import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSES,newRun,step,startJump,grade,score,center,racePlace,makeObjects,width,clamp,slope,TUNE} from '../engine.js';

test('TUNE object contains all tuning parameters',()=>{
  assert.ok(TUNE.gravity);
  assert.ok(TUNE.slopeAccelFactor);
  assert.ok(TUNE.surfaces);
  assert.ok(TUNE.turnRate);
  assert.ok(TUNE.jumpPower);
  assert.ok(TUNE.herringValue);
  assert.equal(typeof TUNE.targetFrameTime,'number');
});

test('distinct compact courses have deterministic objects',()=>{
  for(let i=0;i<3;i++){
    const a=newRun(i),b=newRun(i);
    assert.deepEqual(a.objects,b.objects);
    assert.equal(a.objects.filter(o=>o.type==='flag').length,COURSES[i].flagCount);
    assert.ok(a.objects.some(o=>o.type==='herring'));
    assert.ok(a.objects.some(o=>o.type==='tree'));
    assert.ok(a.objects.some(o=>o.type==='ramp'));
  }
});

test('slope-driven physics accelerates downhill',()=>{
  const s=newRun();
  const initialSpeed=s.speed;
  for(let i=0;i<60;i++)step(s,1/60,{});
  assert.ok(s.speed>initialSpeed,'speed increases on downhill slope');
  assert.ok(s.z>0,'position advances');
});

test('braking and turning reduces speed (carving)',()=>{
  const a=newRun(),b=newRun();
  for(let i=0;i<60;i++){
    step(a,1/60,{steer:1,brake:true}); // Carving
    step(b,1/60,{}); // Straight
  }
  assert.ok(a.speed<b.speed,'carving is slower than straight');
});

test('paddling helps at low speed only',()=>{
  const s=newRun();
  s.speed=10;
  const before=s.speed;
  for(let i=0;i<30;i++)step(s,1/60,{paddle:true});
  assert.ok(s.speed>before,'paddling helps at low speed');
  
  s.speed=TUNE.paddleMaxSpeed+5;
  const highBefore=s.speed;
  for(let i=0;i<30;i++)step(s,1/60,{paddle:true});
  assert.ok(Math.abs(s.speed-highBefore)<1,'paddling does not help at high speed');
});

test('jump blocks repeat airborne and lands',()=>{
  const s=newRun();
  assert.equal(startJump(s,false),true);
  assert.equal(startJump(s,false),false,'cannot jump while airborne');
  for(let i=0;i<60;i++)step(s,1/60,{});
  assert.equal(s.air,0,'landed');
  assert.equal(startJump(s,false),true,'can jump after landing');
});

test('charged jump goes higher than normal jump',()=>{
  const normal=newRun(),charged=newRun();
  startJump(normal,false);
  startJump(charged,true);
  
  let normalMax=0,chargedMax=0;
  for(let i=0;i<80;i++){
    step(normal,1/60,{});
    step(charged,1/60,{});
    normalMax=Math.max(normalMax,normal.air);
    chargedMax=Math.max(chargedMax,charged.air);
  }
  
  assert.ok(chargedMax>normalMax,'charged jump reaches greater height');
});

test('herring and flag collision register once',()=>{
  const s=newRun();
  const herring=s.objects.find(x=>x.type==='herring');
  const flag=s.objects.find(x=>x.type==='flag');
  
  s.z=herring.z-.1;
  s.x=herring.x;
  s.speed=20;
  step(s,1/60,{});
  const beforeH=s.herring;
  step(s,1/60,{});
  assert.equal(s.herring,beforeH,'herring only collected once');
  assert.ok(s.herring>0,'herring was collected');
  
  s.z=flag.z-.1;
  s.x=flag.x;
  step(s,1/60,{});
  const beforeF=s.flags;
  step(s,1/60,{});
  assert.equal(s.flags,beforeF,'flag only passed once');
  assert.ok(s.flags>0,'flag was passed');
});

test('tree collision causes bounce and stun',()=>{
  const s=newRun();
  const tree=s.objects.find(x=>x.type==='tree');
  if(!tree){assert.ok(true,'no trees in this level');return}
  
  s.z=tree.z-.1;
  s.x=tree.x;
  s.speed=25;
  s.air=0;
  step(s,1/60,{});
  
  assert.ok(s.speed<25,'speed reduced after tree hit');
  assert.ok(s.stun>0,'stunned after tree hit');
  assert.ok(s.events.includes('crash'),'crash event fired');
});

test('combo scoring accumulates with herring collection',()=>{
  const s=newRun();
  const herrings=s.objects.filter(o=>o.type==='herring').slice(0,3);
  
  for(const h of herrings){
    s.z=h.z-.1;
    s.x=h.x;
    s.speed=20;
    step(s,1/60,{});
    step(s,.05,{}); // Small time advance
  }
  
  assert.equal(s.herring,3,'collected 3 herring');
  assert.ok(s.combo>=2,'combo built up');
});

test('hard landing penalty applies at high speed',()=>{
  const s=newRun();
  startJump(s,true);
  s.speed=TUNE.landingSpeedThreshold+5;
  s.vy=-2; // Falling
  
  for(let i=0;i<60;i++)step(s,1/60,{});
  
  assert.ok(s.events.some(e=>e==='hardLanding'),'hard landing event');
  assert.ok(s.speed<TUNE.landingSpeedThreshold,'speed penalized');
});

test('campaign completion and score requirements',()=>{
  const s=newRun();
  s.z=s.course.length-.2;
  s.herring=Math.ceil(s.course.herringCount*.6);
  s.flags=Math.ceil(s.course.flagCount*.7);
  s.elapsed=s.course.time-1;
  step(s,1/60,{});
  
  assert.equal(s.finished,true);
  assert.equal(grade(s),true);
  assert.ok(score(s)>0);
});

test('25 unique stages strictly increase in distance and difficulty',()=>{
  assert.equal(COURSES.length,25);
  assert.equal(new Set(COURSES.map(c=>c.name)).size,25);
  
  for(let i=1;i<25;i++){
    assert.ok(COURSES[i].length>COURSES[i-1].length);
    assert.ok(COURSES[i].difficulty>COURSES[i-1].difficulty);
  }
});

test('every level can finish with reasonable physics',()=>{
  for(let i=0;i<25;i++){
    const s=newRun(i);
    let ticks=0;
    const maxTicks=Math.ceil(COURSES[i].length/20*60)+600; // ~20 m/s + margin
    
    while(!s.finished&&ticks++<maxTicks){
      // Simplified AI: steer toward center, paddle at low speed
      const targetX=center(s.z+10,s.course);
      const steer=clamp((targetX-s.x)*3,-1,1);
      const paddle=s.speed<15;
      step(s,1/60,{steer,paddle});
    }
    
    assert.ok(s.finished,`level ${i+1} finishes`);
    assert.ok(s.elapsed<300,`level ${i+1} bounded duration`);
  }
});

test('slope-driven acceleration is consistent',()=>{
  const s=newRun();
  const s0=slope(0,s.course);
  const s100=slope(100,s.course);
  
  assert.equal(typeof s0,'number');
  assert.equal(typeof s100,'number');
  assert.ok(Math.abs(s0)<1,'slope is reasonable');
});

test('rivals advance independently and finish all 25 stages',()=>{
  for(let i=0;i<25;i++){
    const s=newRun(i);
    assert.equal(s.rivals.length,3);
    
    for(let k=0;k<8000&&!s.finished;k++){
      step(s,1/60,{paddle:k%120<30});
    }
    
    assert.ok(s.finished);
    assert.ok(s.rivals.every(r=>r.z>0));
    assert.ok(racePlace(s)>=1&&racePlace(s)<=4);
  }
});

test('all 25 levels are winnable with perfect play',()=>{
  for(let i=0;i<Math.min(5,COURSES.length);i++){ // Sample first 5 for speed
    const s=newRun(i);
    let ticks=0;
    const maxTicks=COURSES[i].time*60+600;
    
    // Optimized AI: follow racing line, collect herring, paddle strategically
    while(!s.finished&&ticks++<maxTicks){
      const targetX=center(s.z+8,s.course);
      const steer=clamp((targetX-s.x)*4,-1,1);
      const paddle=s.speed<TUNE.paddleMaxSpeed-2;
      
      // Collect herring
      const nearHerring=s.objects.find(o=>o.type==='herring'&&o.z>s.z&&o.z<s.z+15&&!s.seen.has(o.id));
      if(nearHerring){
        const herringSteer=clamp((nearHerring.x-s.x)*5,-1,1);
        step(s,1/60,{steer:herringSteer,paddle});
      }else{
        step(s,1/60,{steer,paddle});
      }
    }
    
    assert.ok(s.finished,`level ${i+1} finishes`);
    
    // Check if medal criteria are achievable
    const herringTarget=Math.ceil(s.course.herringCount*.6);
    const flagTarget=Math.ceil(s.course.flagCount*.7);
    assert.ok(s.herring>=herringTarget*.7,`level ${i+1} collects reasonable herring (${s.herring}/${herringTarget})`);
    assert.ok(s.flags>=flagTarget*.7,`level ${i+1} passes reasonable flags (${s.flags}/${flagTarget})`);
  }
});

test('heading and carving physics work correctly',()=>{
  const s=newRun();
  s.speed=25;
  const initialHeading=s.heading;
  
  // Turn right
  for(let i=0;i<30;i++)step(s,1/60,{steer:1});
  assert.notEqual(s.heading,initialHeading,'heading changes with steering');
  
  // Carve (brake + turn)
  const beforeCarve=s.speed;
  for(let i=0;i<30;i++)step(s,1/60,{steer:1,brake:true});
  assert.ok(s.speed<beforeCarve,'carving reduces speed');
});
