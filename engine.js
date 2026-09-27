const NAMES = [
  'Pinewake','Glasswind','Emberfall','Frostline','Silver Run',
  'Blue Divide','Needle Pass','Mooncrust','Rime Hollow','Northwind',
  'Icefall','Wolf Ridge','Cloudbreak','Cold Summit','Aurora Bend',
  'Whiteout','Cinder Snow','Echo Chute','Sky Needle','Glacier Gate',
  'Storm Crown','Black Ice','Last Light','High Traverse','Alpine Finale'
];
const SUBTITLES = ['A gentle blue-hour descent','The ridge turns sharp','The mountain after sunset',
  'Narrow snow between the pines','A quicker silver corridor'];
export const COURSES = Object.freeze(NAMES.map((name,i)=>Object.freeze({
  name,subtitle:SUBTITLES[i]||`Stage ${i+1} · ${['pine forest','glacial ridge','sunset slope','high pass','storm crest'][i%5]}`,
  length:900+90*i,gateCount:7+i,target:5+Math.floor(i*.65),
  // Par falls from roughly 12.5 to 5 seconds beyond a clean 27 m/s descent.
  time:Math.ceil((900+90*i)/27+39-i*.35),seed:11+i*29,
  theme:['pine','ice','dusk','pine','ice'][i%5],difficulty:i
})));
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const center=(z,c)=>{
  const d=c.difficulty||0;
  return Math.sin(z*(.006+d*.00009)+c.seed)*(.18+d*.0028)
    +Math.sin(z*(.018+d*.00015)+c.seed*.19)*(.09+d*.0014);
};
export const width=(z,c)=>.83-(c.difficulty||0)*.009-.09*Math.sin(z*.004+c.seed);
export function makeObjects(c){
  const objects=[];
  for(let i=0;i<c.gateCount;i++){
    const z=115+i*(c.length-210)/(c.gateCount-1);
    const side=i%2?1:-1, x=center(z,c)+side*(.24+(c.difficulty||0)*.002);
    objects.push({type:'gate',z,x,id:`g${i}`});
    if(i===2||i===c.gateCount-3||((c.difficulty||0)>12&&i===Math.floor(c.gateCount/2)))
      objects.push({type:'boost',z:z+12,x:center(z+12,c),id:`boost${i}`});
    objects.push({type:'fish',z:z+27,x:center(z+27,c)-side*.16,id:`f${i}`});
    if(i>0)objects.push({type:i%3===0?'ramp':'rock',z:z+53,
      x:center(z+53,c)-side*(.14+(c.difficulty||0)*.003),id:`h${i}`});
  }
  for(let i=0;i<4;i++) { const z=80+i*(c.length-160)/4; objects.push({type:'fish',z,x:center(z,c),id:`bonus${i}`}); }
  return objects.sort((a,b)=>a.z-b.z);
}
export const RIVAL_NAMES=['Skye','Pip','Nori'];
export function rivalX(r,z,c){return center(z,c)+r.lane+Math.sin(z*.013+r.phase)*.055;}
export function racePlace(s){return 1+s.rivals.filter(r=>r.z>s.z || (s.finished&&r.finishedAt!==null&&r.finishedAt<s.finishTime)).length;}
export function newRun(courseIndex=0){
  const c=COURSES[courseIndex];if(!c)throw Error('Unknown course');
  return {courseIndex,course:c,objects:makeObjects(c),seen:new Set(),x:center(0,c),z:0,speed:14,elapsed:0,fish:0,gates:0,missed:0,hits:0,jumps:0,air:0,vy:0,stun:0,invuln:0,stamina:100,boost:0,boostCharges:2,boostCooldown:0,brake:false,steer:0,finished:false,finishTime:null,rivals:RIVAL_NAMES.map((name,j)=>({name,lane:(j-1)*.16,phase:j*2.1,z:0,finishedAt:null,pace:clamp(29.5-j*1.55+courseIndex*.045,28,31)})),events:[]};
}
export function jump(s){if(s.finished||s.air>0||s.stun>0)return false;s.vy=3.5;s.air=.01;s.jumps++;s.events.push('jump');return true;}
export function grade(s){return s.fish>=s.course.target && s.gates>=Math.ceil(s.course.gateCount*.65) && s.elapsed<=s.course.time && s.hits<4;}
export function score(s){return Math.max(0,Math.round(s.gates*160+s.fish*85+Math.max(0,s.course.time-s.elapsed)*12-s.hits*100-s.missed*45));}
export function step(s,dt,input={}){
  if(s.finished)return s;
  dt=clamp(dt,0,.05);s.events=[];s.elapsed+=dt;for(const r of s.rivals){if(r.finishedAt!==null)continue;const oldR=r.z;r.z=Math.min(s.course.length,r.z+r.pace*(1+.055*Math.sin(s.elapsed*.43+r.phase))*dt);if(r.z>=s.course.length)r.finishedAt=s.elapsed-dt+dt*(s.course.length-oldR)/(r.pace*(1+.055*Math.sin(s.elapsed*.43+r.phase))*dt||1);}s.steer=clamp(input.steer||0,-1,1);s.brake=!!input.brake;
  s.boostCooldown=Math.max(0,s.boostCooldown-dt);if(input.boost&&s.boostCharges>0&&s.boostCooldown===0&&s.stamina>=20){s.boostCharges--;s.stamina-=20;s.boost=.9;s.boostCooldown=2.5;s.events.push('boost');}s.boost=Math.max(0,s.boost-dt);s.stamina=clamp(s.stamina+(s.brake?4:1.5)*dt,0,100);s.stun=Math.max(0,s.stun-dt);s.invuln=Math.max(0,s.invuln-dt);
  const target=s.brake?9:s.boost>0?44:27+Math.min(5,s.z/300);s.speed+=(target-s.speed)*Math.min(1,dt*(s.stun?1.5:.65));
  const old=s.z;s.z=Math.min(s.course.length,s.z+s.speed*dt);
  s.x+=s.steer*(s.stun?.12:.66)*dt;const edge=width(s.z,s.course)*.5;
  if(Math.abs(s.x-center(s.z,s.course))>edge){s.speed=Math.min(s.speed,15);s.x=clamp(s.x,center(s.z,s.course)-edge-.1,center(s.z,s.course)+edge+.1);}
  if(s.air>0){s.vy-=9.6*dt;s.air+=s.vy*dt;if(s.air<=0){s.air=0;s.vy=0;s.events.push('land');}}
  for(const o of s.objects){if(o.z<=old||o.z>s.z||s.seen.has(o.id))continue;s.seen.add(o.id);
    const dx=Math.abs(s.x-o.x);
    if(o.type==='gate'){if(dx<.19){s.gates++;s.events.push('gate');}else{s.missed++;s.events.push('miss');}}
    if(o.type==='fish'&&dx<.16){s.fish++;s.stamina=clamp(s.stamina+12,0,100);s.events.push('fish');}
    if(o.type==='boost'&&dx<.16){s.boostCharges=Math.min(3,s.boostCharges+1);s.events.push('charge');}
    if(o.type==='ramp'&&dx<.16&&s.air===0){s.vy=4.5;s.air=.01;s.jumps++;s.events.push('ramp');}
    if(o.type==='rock'&&dx<.16&&s.air<.13&&s.invuln<=0){s.hits++;s.stamina=Math.max(0,s.stamina-18);s.stun=.8;s.invuln=1.3;s.speed*=.46;s.events.push('hit');}
  }
  if(s.z>=s.course.length){s.finished=true;s.finishTime=s.elapsed-dt+dt*(s.course.length-old)/(s.speed*dt||1);s.events.push('finish');}
  return s;
}
