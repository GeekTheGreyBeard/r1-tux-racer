export const COURSES = [
  {name:'Pinewake',subtitle:'A gentle blue-hour descent',length:900,gateCount:7,target:5,time:72,seed:11,theme:'pine'},
  {name:'Glasswind',subtitle:'The ridge turns sharp',length:1120,gateCount:9,target:7,time:83,seed:37,theme:'ice'},
  {name:'Emberfall',subtitle:'The mountain after sunset',length:1360,gateCount:11,target:9,time:98,seed:71,theme:'dusk'}
];
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const center=(z,c)=>Math.sin(z*.006+c.seed)*.18+Math.sin(z*.018+c.seed*.19)*.09;
export const width=(z,c)=>.83-.09*Math.sin(z*.004+c.seed);
export function makeObjects(c){
  const objects=[];
  for(let i=0;i<c.gateCount;i++){
    const z=115+i*(c.length-210)/(c.gateCount-1), x=center(z,c)+(i%2 ? .27 : -.27);
    objects.push({type:'gate',z,x,id:`g${i}`});
    objects.push({type:'fish',z:z+27,x:center(z+27,c)+(i%2 ? -.20:.20),id:`f${i}`});
    if(i>0)objects.push({type:i%3===0?'ramp':'rock',z:z+53,x:center(z+53,c)+(i%2 ? -.16:.16),id:`h${i}`});
  }
  for(let i=0;i<4;i++) { const z=80+i*(c.length-160)/4; objects.push({type:'fish',z,x:center(z,c),id:`bonus${i}`}); }
  return objects.sort((a,b)=>a.z-b.z);
}
export function newRun(courseIndex=0){
  const c=COURSES[courseIndex];if(!c)throw Error('Unknown course');
  return {courseIndex,course:c,objects:makeObjects(c),seen:new Set(),x:center(0,c),z:0,speed:14,elapsed:0,fish:0,gates:0,missed:0,hits:0,jumps:0,air:0,vy:0,stun:0,invuln:0,brake:false,steer:0,finished:false,events:[]};
}
export function jump(s){if(s.finished||s.air>0||s.stun>0)return false;s.vy=3.5;s.air=.01;s.jumps++;s.events.push('jump');return true;}
export function grade(s){return s.fish>=s.course.target && s.gates>=Math.ceil(s.course.gateCount*.65) && s.elapsed<=s.course.time && s.hits<4;}
export function score(s){return Math.max(0,Math.round(s.gates*160+s.fish*85+Math.max(0,s.course.time-s.elapsed)*12-s.hits*100-s.missed*45));}
export function step(s,dt,input={}){
  if(s.finished)return s;
  dt=clamp(dt,0,.05);s.events=[];s.elapsed+=dt;s.steer=clamp(input.steer||0,-1,1);s.brake=!!input.brake;
  s.stun=Math.max(0,s.stun-dt);s.invuln=Math.max(0,s.invuln-dt);
  const target=s.brake?9:27+Math.min(5,s.z/300);s.speed+=(target-s.speed)*Math.min(1,dt*(s.stun?1.5:.65));
  const old=s.z;s.z=Math.min(s.course.length,s.z+s.speed*dt);
  s.x+=s.steer*(s.stun?.12:.66)*dt;const edge=width(s.z,s.course)*.5;
  if(Math.abs(s.x-center(s.z,s.course))>edge){s.speed=Math.min(s.speed,15);s.x=clamp(s.x,center(s.z,s.course)-edge-.1,center(s.z,s.course)+edge+.1);}
  if(s.air>0){s.vy-=9.6*dt;s.air+=s.vy*dt;if(s.air<=0){s.air=0;s.vy=0;s.events.push('land');}}
  for(const o of s.objects){if(o.z<=old||o.z>s.z||s.seen.has(o.id))continue;s.seen.add(o.id);
    const dx=Math.abs(s.x-o.x);
    if(o.type==='gate'){if(dx<.19){s.gates++;s.events.push('gate');}else{s.missed++;s.events.push('miss');}}
    if(o.type==='fish'&&dx<.16){s.fish++;s.events.push('fish');}
    if(o.type==='ramp'&&dx<.16&&s.air===0){s.vy=4.5;s.air=.01;s.jumps++;s.events.push('ramp');}
    if(o.type==='rock'&&dx<.16&&s.air<.13&&s.invuln<=0){s.hits++;s.stun=.8;s.invuln=1.3;s.speed*=.46;s.events.push('hit');}
  }
  if(s.z>=s.course.length){s.finished=true;s.events.push('finish');}
  return s;
}
