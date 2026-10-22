// Tux Racer-inspired physics and gameplay for Snowline Sprint
export const TUNE = Object.freeze({
  // Physics - slope-driven acceleration model
  gravity: 9.8,
  slopeAccelFactor: 2.5, // Strong downhill acceleration
  baseFriction: 0.15, // Low friction for good glide
  dragCoeff: 0.008, // Minimal air resistance
  paddleForce: 25, // Strong paddle power
  paddleMaxSpeed: 22, // Paddle helps up to this speed
  
  // Surface types modify friction and grip
  surfaces: {
    ice: { friction: 0.12, grip: 0.4 },
    packed: { friction: 0.15, grip: 0.8 },
    deep: { friction: 0.25, grip: 0.6 },
    rough: { friction: 0.35, grip: 0.9 }
  },
  
  // Turning and carving
  turnRate: 3.2, // Base turn rate (rad/s at low speed)
  turnSpeedPenalty: 0.06, // Speed reduces turn rate slightly
  carveAngle: 0.4, // Brake+turn carve tightness multiplier
  carveDrag: 0.4, // Additional drag when carving
  
  // Air physics
  airGravity: 9.6,
  jumpPower: 4.0, // Tap jump
  chargedJumpPower: 5.5, // Long-press charged jump
  cresthLaunchThreshold: 0.15, // Slope change to launch
  cresthLaunchBoost: 2.0, // Extra vy from crest
  airSteerFactor: 0.2, // Limited steering in air
  landingSpeedThreshold: 38, // Hard landing above this speed
  hardLandingPenalty: 0.5, // Speed multiplier on hard landing
  
  // Collisions
  treeBounceSpeed: 0.3, // Speed multiplier on tree hit
  treeStunDuration: 0.7,
  treeInvulnDuration: 1.3,
  
  // Scoring
  herringValue: 100,
  comboDecay: 1.8, // Seconds before combo resets
  comboMultiplier: 0.15, // Extra per herring in combo
  flagValue: 200,
  
  // Course generation
  herringSpacing: 45, // Distance between herring
  flagSpacing: 8, // Flags per course
  treeMinDistance: 35, // Min distance between trees
  treeDensity: 0.7, // Trees per difficulty level
  
  // Rivals (keep them)
  rivalPaceBase: 24,
  rivalPaceSpread: 1.3,
  rivalLevelBoost: 0.11,
  
  // Performance auto-scaling
  targetFrameTime: 20, // ms - effects scale back if exceeded
  particlePoolSize: 48,
  maxTreesOnScreen: 30
});

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
  name,
  subtitle:SUBTITLES[i]||`Stage ${i+1} · ${['pine forest','glacial ridge','sunset slope','high pass','storm crest'][i%5]}`,
  length:900+90*i,
  herringCount:Math.floor((900+90*i)/TUNE.herringSpacing),
  flagCount:TUNE.flagSpacing+Math.floor(i/3),
  time:Math.ceil((900+90*i)/25*1.25), // Par based on ~25 m/s average
  seed:11+i*29,
  theme:['pine','ice','dusk','pine','ice'][i%5],
  surface:i<8?'packed':i<16?'ice':'deep',
  difficulty:i,
  treeCount:Math.min(TUNE.maxTreesOnScreen,Math.floor(8+i*TUNE.treeDensity))
})));

export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const lerp=(a,b,t)=>a+(b-a)*t;

// Track geometry with tighter curves for steering challenge (B8)
export const center=(z,c)=>{
  const d=c.difficulty||0;
  const tightness=1.5+d*0.05; // Tighter curves at higher levels
  return Math.sin(z*(.008+d*.00012)*tightness+c.seed)*(.22+d*.0035)
    +Math.sin(z*(.022+d*.0002)*tightness+c.seed*.19)*(.11+d*.0018);
};

export const width=(z,c)=>.75-(c.difficulty||0)*.008-.08*Math.sin(z*.004+c.seed);

// Slope calculation for physics
export const slope=(z,c)=>{
  const baseSlope=-0.18; // General downhill
  const d=c.difficulty||0;
  return baseSlope+Math.sin(z*.015+c.seed*.7)*(.08+d*.003)
    +Math.sin(z*.042+c.seed*1.3)*.035;
};

const rng=n=>{let v=Math.sin(n*127.1+45.6)*43758.5453;return v-Math.floor(v)};

export function makeObjects(c){
  const objects=[];
  
  // Herring in trails along the racing line (B8 consideration - follow optimal path)
  for(let i=0;i<c.herringCount;i++){
    const z=80+i*TUNE.herringSpacing+rng(i*3+c.seed)*12;
    if(z>c.length-100)continue;
    const offset=(rng(i*7+c.seed)-.5)*.15; // Slight variation from center
    objects.push({type:'herring',z,x:center(z,c)+offset,id:`h${i}`});
  }
  
  // Flags as course markers
  for(let i=0;i<c.flagCount;i++){
    const z=100+i*(c.length-200)/(c.flagCount-1);
    const side=i%2?1:-1;
    const trackHalf=width(z,c)*.5;
    const x=center(z,c)+side*clamp(trackHalf-.12,.08,trackHalf-.08);
    objects.push({type:'flag',z,x,id:`f${i}`});
  }
  
  // Trees as obstacles at edges
  for(let i=0;i<c.treeCount;i++){
    const z=Math.floor(rng(i*11+c.seed)*c.length*.85)+80;
    const side=(rng(i*13+c.seed)>.5)?1:-1;
    const trackHalf=width(z,c)*.5;
    const offset=trackHalf+.08+rng(i*17+c.seed)*.25;
    const size=.6+rng(i*19+c.seed)*.8;
    objects.push({type:'tree',z,x:center(z,c)+side*offset,id:`t${i}`,size});
  }
  
  // Ramps for jumps
  const rampCount=3+Math.floor(c.difficulty/5);
  for(let i=0;i<rampCount;i++){
    const z=200+i*(c.length-350)/(rampCount-1||1);
    objects.push({type:'ramp',z,x:center(z,c),id:`r${i}`});
  }
  
  return objects.sort((a,b)=>a.z-b.z);
}

export const RIVAL_NAMES=['Skye','Pip','Nori'];
export function rivalX(r,z,c){return center(z,c)+r.lane+Math.sin(z*.013+r.phase)*.055;}

export function racePlace(s){
  return 1+s.rivals.filter(r=>r.z>s.z || (s.finished&&r.finishedAt!==null&&r.finishedAt<s.finishTime)).length;
}

export function newRun(courseIndex=0){
  const c=COURSES[courseIndex];
  if(!c)throw Error('Unknown course');
  
  const surface=TUNE.surfaces[c.surface]||TUNE.surfaces.packed;
  
  return {
    courseIndex,
    course:c,
    objects:makeObjects(c),
    seen:new Set(),
    
    // Position and motion
    x:center(0,c),
    z:0,
    heading:Math.PI/2, // Facing downhill (rad)
    speed:12, // Start with some initial speed
    vx:0,
    vz:12,
    
    // Air physics
    air:0,
    vy:0,
    jumpCharge:0,
    lastSlope:slope(0,c),
    
    // State
    elapsed:0,
    paddling:false,
    carving:false,
    crashed:false,
    stun:0,
    invuln:0,
    
    // Scoring
    herring:0,
    flags:0,
    combo:0,
    comboTimer:0,
    jumps:0,
    
    // Finish
    finished:false,
    finishTime:null,
    
    // Rivals
    rivals:RIVAL_NAMES.map((name,j)=>({
      name,
      lane:(j-1)*.16,
      phase:j*2.1,
      z:0,
      speed:12,
      finishedAt:null,
      pace:clamp(TUNE.rivalPaceBase-j*TUNE.rivalPaceSpread+courseIndex*TUNE.rivalLevelBoost,22,28)
    })),
    
    // Surface
    friction:surface.friction,
    grip:surface.grip,
    
    events:[]
  };
}

export function startJump(s,charged=false){
  if(s.finished||s.air>0||s.stun>0)return false;
  s.vy=charged?TUNE.chargedJumpPower:TUNE.jumpPower;
  s.air=.01;
  s.jumps++;
  s.events.push(charged?'chargedJump':'jump');
  return true;
}

export function grade(s){
  const herringTarget=Math.ceil(s.course.herringCount*.6);
  const flagTarget=Math.ceil(s.course.flagCount*.7);
  return s.herring>=herringTarget && s.flags>=flagTarget && s.elapsed<=s.course.time;
}

export function score(s){
  const base=s.herring*TUNE.herringValue+s.flags*TUNE.flagValue;
  const timeBonus=Math.max(0,s.course.time-s.elapsed)*15;
  return Math.round(base+timeBonus);
}

export function step(s,dt,input={}){
  if(s.finished)return s;
  dt=clamp(dt,0,.05);
  s.events=[];
  s.elapsed+=dt;
  
  // Update rivals (simplified physics)
  for(const r of s.rivals){
    if(r.finishedAt!==null)continue;
    const oldR=r.z;
    const targetSpeed=r.pace*(1+.055*Math.sin(s.elapsed*.43+r.phase));
    r.speed+=(targetSpeed-r.speed)*Math.min(1,dt*.65);
    r.z=Math.min(s.course.length,r.z+r.speed*dt);
    if(r.z>=s.course.length)r.finishedAt=s.elapsed-dt+dt*(s.course.length-oldR)/(r.speed*dt||1);
  }
  
  // Update timers
  s.stun=Math.max(0,s.stun-dt);
  s.invuln=Math.max(0,s.invuln-dt);
  s.jumpCharge=input.charging?Math.min(s.jumpCharge+dt,.8):0;
  s.comboTimer=Math.max(0,s.comboTimer-dt);
  if(s.comboTimer===0)s.combo=0;
  
  // Jump release
  if(input.jump&&s.jumpCharge>.3){
    startJump(s,true);
  }else if(input.jump&&s.jumpCharge===0){
    startJump(s,false);
  }
  
  const currentSlope=slope(s.z,s.course);
  const old=s.z;
  
  if(s.air>0){
    // Air physics
    s.vy-=TUNE.airGravity*dt;
    s.air+=s.vy*dt;
    
    // Limited air steering
    const airTurn=(input.steer||0)*TUNE.airSteerFactor*dt;
    s.heading=clamp(s.heading+airTurn,0,Math.PI);
    
    // Maintain velocity
    s.vz=s.speed*Math.cos(s.heading-Math.PI/2);
    s.vx=s.speed*Math.sin(s.heading-Math.PI/2);
    
    if(s.air<=0){
      // Landing
      s.air=0;
      s.vy=0;
      s.events.push('land');
      
      // Hard landing penalty
      if(s.speed>TUNE.landingSpeedThreshold){
        s.speed*=TUNE.hardLandingPenalty;
        s.stun=.5;
        s.events.push('hardLanding');
      }
    }
  }else{
    // Ground physics - slope-driven acceleration
    // Negative slope = downhill = should accelerate
    const slopeAccel=-currentSlope*TUNE.gravity*TUNE.slopeAccelFactor;
    
    // Paddling (only helps at low speed)
    const paddling=!!(input.paddle);
    s.paddling=paddling;
    const paddleAccel=paddling&&s.speed<TUNE.paddleMaxSpeed?TUNE.paddleForce:0;
    
    // Friction and drag
    const friction=s.friction*TUNE.baseFriction*(s.stun?.5:1);
    const drag=TUNE.dragCoeff*s.speed*s.speed;
    
    // Carving increases drag
    const turning=!!(input.steer&&Math.abs(input.steer)>.1);
    const braking=!!input.brake;
    s.carving=braking&&turning;
    const carveDrag=s.carving?TUNE.carveDrag*s.speed:0;
    
    // Net acceleration
    const accel=slopeAccel+paddleAccel-friction-drag-carveDrag;
    s.speed=Math.max(1,s.speed+accel*dt); // Min speed 1
    
    // Turning - harder at speed
    const baseTurnRate=TUNE.turnRate/(1+s.speed*TUNE.turnSpeedPenalty);
    const turnRate=s.carving?baseTurnRate*TUNE.carveAngle:baseTurnRate;
    const turn=(input.steer||0)*turnRate*s.grip*dt*(s.stun?.5:1);
    s.heading=clamp(s.heading+turn,0,Math.PI);
    
    // Velocity from heading
    s.vz=s.speed*Math.cos(s.heading-Math.PI/2);
    s.vx=s.speed*Math.sin(s.heading-Math.PI/2);
    
    // Crest launch
    const slopeDelta=currentSlope-s.lastSlope;
    if(slopeDelta>TUNE.cresthLaunchThreshold&&s.speed>20){
      s.vy=TUNE.cresthLaunchBoost;
      s.air=.01;
      s.events.push('crest');
    }
  }
  
  s.lastSlope=currentSlope;
  
  // Update position
  s.z=Math.min(s.course.length,s.z+Math.abs(s.vz)*dt);
  s.x+=s.vx*dt;
  
  // Track boundaries - bounce trees, constrain to track
  const trackCenter=center(s.z,s.course);
  const trackHalf=width(s.z,s.course)*.5;
  
  if(Math.abs(s.x-trackCenter)>trackHalf){
    s.x=clamp(s.x,trackCenter-trackHalf,trackCenter+trackHalf);
    s.speed*=.7; // Scrubbing edge
    s.vx*=-.5; // Bounce
  }
  
  // Object collisions
  for(const o of s.objects){
    if(o.z<=old||o.z>s.z||s.seen.has(o.id))continue;
    
    const dx=Math.abs(s.x-o.x);
    const hitbox={
      herring:.08,
      flag:.12,
      tree:.15*(o.size||1),
      ramp:.18
    }[o.type]||.1;
    
    if(dx<hitbox){
      s.seen.add(o.id);
      
      if(o.type==='herring'){
        s.herring++;
        s.combo++;
        s.comboTimer=TUNE.comboDecay;
        s.events.push('herring');
      }else if(o.type==='flag'){
        s.flags++;
        s.events.push('flag');
      }else if(o.type==='tree'&&s.invuln<=0&&s.air<.2){
        s.speed*=TUNE.treeBounceSpeed;
        s.stun=TUNE.treeStunDuration;
        s.invuln=TUNE.treeInvulnDuration;
        s.crashed=true;
        s.combo=0;
        s.comboTimer=0;
        s.events.push('crash');
      }else if(o.type==='ramp'&&s.air===0&&dx<.15){
        s.vy=4.2+s.speed*.08;
        s.air=.01;
        s.jumps++;
        s.events.push('ramp');
      }
    }
  }
  
  // Finish
  if(s.z>=s.course.length){
    s.finished=true;
    s.finishTime=s.elapsed-dt+dt*(s.course.length-old)/(Math.abs(s.vz)*dt||1);
    s.events.push('finish');
  }
  
  return s;
}
