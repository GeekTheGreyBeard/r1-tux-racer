import {renderScene} from './renderer.js';
import {COURSES,newRun,step,startJump,grade,score,racePlace,clamp,TUNE} from './engine.js';

const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d');

let state='menu',selected=0,unlocked=0,run=null,last=0;
let tilt=0,tiltBase=null,tiltLive=false,tiltAt=0;
let keys=new Set(),touch={left:false,right:false,brake:false,paddle:false};
let charging=false,chargeStart=0;
let pickerPage=0,noticeUntil=0,hudCache={};
let audio=null,slideSound=null;
let lastWheel=0,lastWheelDir=0,accumulator=0;
let lastTap=null;
let frameTimes=[],avgFrameTime=16;

// Load progress
try{unlocked=clamp(Number((window.creationStorage||localStorage).getItem('snowline-unlocked'))||0,0,COURSES.length-1)}catch{}

// Audio setup
function sound(type){
  try{
    if(!audio)return;
    const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
    
    if(type==='crash'){
      o.type='sawtooth';
      o.frequency.setValueAtTime(140,t);
      o.frequency.exponentialRampToValueAtTime(70,t+.15);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.12,t+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t+.18);
    }else if(type==='herring'){
      o.type='sine';
      o.frequency.setValueAtTime(620,t);
      o.frequency.exponentialRampToValueAtTime(980,t+.11);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.09,t+.01);
      g.gain.exponentialRampToValueAtTime(.0001,t+.14);
    }else if(type==='flag'){
      o.type='triangle';
      o.frequency.setValueAtTime(480,t);
      o.frequency.exponentialRampToValueAtTime(720,t+.15);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.1,t+.015);
      g.gain.exponentialRampToValueAtTime(.0001,t+.18);
    }else if(type==='land'){
      o.type='sine';
      o.frequency.setValueAtTime(280,t);
      o.frequency.exponentialRampToValueAtTime(230,t+.12);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.06,t+.015);
      g.gain.exponentialRampToValueAtTime(.0001,t+.15);
    }else if(type==='hardLanding'){
      o.type='sawtooth';
      o.frequency.setValueAtTime(160,t);
      o.frequency.exponentialRampToValueAtTime(90,t+.2);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.1,t+.02);
      g.gain.exponentialRampToValueAtTime(.0001,t+.25);
    }else{
      o.type='sine';
      o.frequency.setValueAtTime(420,t);
      o.frequency.exponentialRampToValueAtTime(580,t+.12);
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.08,t+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t+.15);
    }
    
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t+.3);
  }catch{}
}

// Sliding snow sound - follows speed
function updateSlideSound(){
  if(!audio||!run||run.finished||run.air>.1)return;
  
  if(!slideSound){
    try{
      slideSound={osc:null,gain:null,filter:null};
      slideSound.osc=audio.createOscillator();
      slideSound.osc.type='sawtooth';
      slideSound.filter=audio.createBiquadFilter();
      slideSound.filter.type='lowpass';
      slideSound.gain=audio.createGain();
      slideSound.gain.gain.value=0;
      slideSound.osc.connect(slideSound.filter).connect(slideSound.gain).connect(audio.destination);
      slideSound.osc.start();
    }catch{slideSound=null;return}
  }
  
  const targetVol=Math.min(.08,run.speed/400);
  const targetFreq=50+run.speed*2;
  const targetFilter=800+run.speed*15;
  
  slideSound.gain.gain.linearRampToValueAtTime(targetVol,audio.currentTime+.1);
  slideSound.osc.frequency.linearRampToValueAtTime(targetFreq,audio.currentTime+.1);
  slideSound.filter.frequency.linearRampToValueAtTime(targetFilter,audio.currentTime+.1);
}

function announce(s){$('notice').textContent=s;noticeUntil=performance.now()+1100}

function picker(){
  const root=$('picker');root.replaceChildren();
  const pages=Math.ceil(COURSES.length/5);
  pickerPage=clamp(pickerPage,0,pages-1);
  
  const nav=document.createElement('div');
  nav.className='picker-nav';
  const prev=document.createElement('button');
  prev.textContent='◀';
  prev.disabled=pickerPage===0;
  prev.onclick=()=>{pickerPage--;picker()};
  const label=document.createElement('span');
  label.textContent=`LEVELS ${pickerPage*5+1}–${Math.min(COURSES.length,(pickerPage+1)*5)} / ${COURSES.length}`;
  const next=document.createElement('button');
  next.textContent='▶';
  next.disabled=pickerPage===pages-1;
  next.onclick=()=>{pickerPage++;picker()};
  nav.append(prev,label,next);
  root.append(nav);
  
  const list=document.createElement('div');
  list.className='picker-list';
  COURSES.slice(pickerPage*5,pickerPage*5+5).forEach((c,j)=>{
    const i=pickerPage*5+j;
    const b=document.createElement('button');
    b.textContent=`${String(i+1).padStart(2,'0')} ${c.name}${i>unlocked?' · LOCKED':''}`;
    b.disabled=i>unlocked;
    b.className=i===selected?'active':'';
    b.onclick=()=>{selected=i;picker();describeCourse()};
    list.append(b);
  });
  root.append(list);
}

function describeCourse(){
  const c=COURSES[selected];
  $('description').textContent=`${c.subtitle}. ${c.length}m · ${c.flagCount} flags · ${c.herringCount} herring · ${c.time}s par.`;
}

function menu(mode='menu'){
  state=mode;
  $('panel').classList.remove('results','credits');
  $('panel').hidden=false;
  $('controls').hidden=true;
  $('hud').hidden=true;
  $('pause').hidden=true;
  $('panel').querySelector('h1').innerHTML='SNOWLINE<br><em>SPRINT</em>';
  $('primary').innerHTML='START DESCENT <span>↗</span>';
  $('menuButton').hidden=true;
  $('creditsButton').hidden=false;
  pickerPage=Math.floor(selected/5);
  picker();
  describeCourse();
}

function showCredits(){
  state='credits';
  $('panel').classList.add('credits');
  $('panel').classList.remove('results');
  $('panel').hidden=false;
  $('controls').hidden=true;
  $('hud').hidden=true;
  $('pause').hidden=true;
  $('panel').querySelector('h1').innerHTML='CREDITS';
  $('description').innerHTML=`<p><strong>Snowline Sprint</strong><br>An original Tux Racer-inspired downhill arcade racer for Rabbit R1.</p>
<p>Tux the penguin by Larry Ewing (lewing@isc.tamu.edu), created with The GIMP.</p>
<p>Game design, code, and art: Geek the Grey Beard<br>Inspired by Tux Racer (Sunspire Studios, 2000)<br>Not an official Tux Racer product.</p>
<p>Physics: slope-driven acceleration, carving, air control<br>Tuning: ${Object.keys(TUNE).length} parameters in TUNE object</p>`;
  $('picker').hidden=true;
  $('primary').innerHTML='BACK TO MENU';
  $('creditsButton').hidden=true;
  $('primary').onclick=()=>{$('picker').hidden=false;menu()};
}

function start(){
  run=newRun(selected);
  tiltBase=null;
  tiltLive=false;
  charging=false;
  chargeStart=0;
  lastTap=null;
  hudCache={};
  accumulator=0;
  frameTimes=[];
  
  state='racing';
  $('panel').hidden=true;
  $('controls').hidden=false;
  $('hud').hidden=false;
  $('pause').hidden=false;
  last=performance.now();
  
  announce(COURSES[selected].name.toUpperCase());
  
  if(!audio)try{audio=new (window.AudioContext||window.webkitAudioContext)()}catch{}
  audio?.resume();
  
  requestTilt();
}

function requestTilt(){
  if(typeof DeviceOrientationEvent==='undefined')return;
  if(typeof DeviceOrientationEvent.requestPermission==='function'){
    DeviceOrientationEvent.requestPermission().catch(()=>{});
  }
}

// Input setup
window.addEventListener('deviceorientation',e=>{
  if(typeof e.gamma!=='number')return;
  if(tiltBase===null)tiltBase=e.gamma;
  tilt=clamp((e.gamma-tiltBase)/24,-1,1);
  tiltLive=true;
  tiltAt=performance.now();
});

if(window.creationSensors?.accelerometer){
  window.creationSensors.accelerometer.addEventListener('reading',()=>{
    const acc=window.creationSensors.accelerometer;
    if(typeof acc.x!=='number')return;
    if(tiltBase===null)tiltBase=acc.x*57.3;
    tilt=clamp((acc.x*57.3-tiltBase)/24,-1,1);
    tiltLive=true;
    tiltAt=performance.now();
  });
}

// R1 hardware events
window.addEventListener('scrollUp',()=>{
  if(state==='racing'){
    touch.paddle=true;
    announce('PADDLE');
  }
});

window.addEventListener('scrollDown',()=>{
  if(state==='racing'){
    touch.brake=!touch.brake;
    announce(touch.brake?'BRAKE':'COAST');
  }
});

window.addEventListener('sideClick',()=>{
  if(state==='racing'&&!charging){
    startJump(run,false);
  }
});

// Long press for charged jump
window.addEventListener('longPressStart',()=>{
  if(state==='racing'){
    charging=true;
    chargeStart=performance.now();
  }
});

window.addEventListener('longPressEnd',()=>{
  if(charging&&state==='racing'){
    startJump(run,true);
  }
  charging=false;
});

function finish(){
  state='results';
  $('hud').hidden=true;
  $('controls').hidden=true;
  $('pause').hidden=true;
  $('panel').hidden=false;
  $('panel').classList.add('results');
  
  if(slideSound){
    slideSound.gain.gain.linearRampToValueAtTime(0,audio.currentTime+.2);
  }
  
  const medal=grade(run);
  const place=racePlace(run);
  const win=medal&&place===1;
  
  if(win&&selected===unlocked&&unlocked<COURSES.length-1){
    unlocked++;
    pickerPage=Math.floor(unlocked/5);
    try{
      (window.creationStorage||localStorage).setItem('snowline-unlocked',String(unlocked));
    }catch{}
  }
  
  picker();
  
  $('panel').querySelector('h1').innerHTML='FINISH LINE<br><em>'+(place===1?'VICTORY':`PLACE ${place} / 4`)+'</em>';
  
  const maxCombo=run.combo>3?` · ${run.combo}x combo!`:'';
  const herringTarget=Math.ceil(run.course.herringCount*.6);
  const flagTarget=Math.ceil(run.course.flagCount*.7);
  
  $('description').textContent=`${COURSES[selected].name} · ${Math.ceil(run.elapsed)}s · ${run.herring}/${run.course.herringCount} herring · ${run.flags}/${run.course.flagCount} flags${maxCombo} · Score ${score(run)}. ${medal?'Medal earned!':'Medal needs '+herringTarget+' herring, '+flagTarget+' flags, and par time.'} ${win?(selected<COURSES.length-1?'Next level unlocked.':'All 25 levels cleared!'):'Finish first with a medal to unlock the next level.'}`;
  
  $('primary').innerHTML=win&&selected<COURSES.length-1?'NEXT LEVEL <span>↗</span>':'RACE AGAIN <span>↗</span>';
  $('menuButton').hidden=false;
  $('creditsButton').hidden=true;
  
  sound(win?'herring':'crash');
}

// UI handlers
$('menuButton').onclick=()=>menu();

$('creditsButton').onclick=()=>showCredits();

$('primary').onclick=()=>{
  if(state==='paused'){
    state='racing';
    $('panel').hidden=true;
    last=performance.now();
    return;
  }
  if(state==='results'&&grade(run)&&racePlace(run)===1&&selected<COURSES.length-1){
    selected++;
  }
  start();
};

$('pause').onclick=()=>{
  if(state!=='racing')return;
  state='paused';
  $('panel').classList.remove('results');
  $('panel').hidden=false;
  $('panel').querySelector('h1').innerHTML='TAKE A<br><em>BREATH</em>';
  $('description').textContent='Paddle to go faster. Carve by braking while turning. Hold jump to charge. The mountain awaits.';
  $('primary').innerHTML='RESUME <span>↗</span>';
  $('menuButton').hidden=false;
  $('creditsButton').hidden=true;
};

// Touch controls
for(const id of ['left','right','brake']){
  const b=$(id);
  b.onpointerdown=e=>{
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    touch[id]=true;
  };
  b.onpointerup=b.onpointercancel=()=>touch[id]=false;
}

$('paddle').onpointerdown=e=>{
  e.preventDefault();
  if(state==='racing')touch.paddle=true;
};
$('paddle').onpointerup=$('paddle').onpointercancel=()=>touch.paddle=false;

$('jump').onpointerdown=e=>{
  e.preventDefault();
  if(state==='racing'&&!charging){
    charging=true;
    chargeStart=performance.now();
  }
};
$('jump').onpointerup=$('jump').onpointercancel=()=>{
  if(charging&&state==='racing'){
    const held=(performance.now()-chargeStart)/1000;
    startJump(run,held>.3);
  }
  charging=false;
};

// Double-tap gesture for jump
const taps=new Map();
$('shell').addEventListener('pointerdown',e=>{
  if(state!=='racing'||e.target.closest('button,.controls,.panel,.hud'))return;
  taps.set(e.pointerId,{x:e.clientX,y:e.clientY,t:performance.now()});
});
$('shell').addEventListener('pointercancel',e=>{taps.delete(e.pointerId);lastTap=null});
$('shell').addEventListener('pointerup',e=>{
  const down=taps.get(e.pointerId);
  taps.delete(e.pointerId);
  if(!down||state!=='racing')return;
  const now=performance.now();
  if(now-down.t>300||Math.hypot(e.clientX-down.x,e.clientY-down.y)>18){
    lastTap=null;
    return;
  }
  if(lastTap&&lastTap.id===e.pointerType&&now-lastTap.t<360&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<75){
    startJump(run,false);
    lastTap=null;
  }else{
    lastTap={x:e.clientX,y:e.clientY,t:now,id:e.pointerType};
  }
});

// Wheel events
window.addEventListener('wheel',e=>{
  if(state!=='racing'||!e.deltaY)return;
  const now=performance.now();
  const dir=Math.sign(e.deltaY);
  if(dir===lastWheelDir&&now-lastWheel<150)return;
  lastWheel=now;
  lastWheelDir=dir;
  e.preventDefault();
  
  if(e.deltaY<0){
    touch.paddle=true;
    setTimeout(()=>touch.paddle=false,100);
    announce('PADDLE');
  }else{
    touch.brake=!touch.brake;
    announce(touch.brake?'BRAKE':'COAST');
  }
},{passive:false});

// Keyboard
window.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  
  if((e.code==='ArrowUp'||e.code==='KeyW')&&state==='racing'&&!e.repeat){
    touch.paddle=true;
  }
  if(e.code==='Space'&&state==='racing'&&!e.repeat&&!charging){
    charging=true;
    chargeStart=performance.now();
  }
  if(e.code==='Escape'&&state==='racing'){
    $('pause').click();
  }
});

window.addEventListener('keyup',e=>{
  keys.delete(e.code);
  if(e.code==='ArrowUp'||e.code==='KeyW'){
    touch.paddle=false;
  }
  if(e.code==='Space'&&charging){
    const held=(performance.now()-chargeStart)/1000;
    if(state==='racing')startJump(run,held>.3);
    charging=false;
  }
});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&state==='racing')$('pause').click();
});

// Rendering and game loop
function render(){
  const c=run?.course||COURSES[selected];
  const frameStart=performance.now();
  
  renderScene(ctx,run,c,frameStart,avgFrameTime);
  
  const frameEnd=performance.now();
  const frameTime=frameEnd-frameStart;
  frameTimes.push(frameTime);
  if(frameTimes.length>60)frameTimes.shift();
  avgFrameTime=frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length;
  
  if(!run)return;
  
  // HUD updates (cached)
  const timer=`${Math.floor(run.elapsed/60).toString().padStart(2,'0')}:${Math.floor(run.elapsed%60).toString().padStart(2,'0')}`;
  if(hudCache.timer!==timer){$('timer').textContent=hudCache.timer=timer}
  
  const herringHud=`${run.herring}/${c.herringCount}${run.combo>1?' · '+run.combo+'x':''}`;
  if(hudCache.herringHud!==herringHud){$('herringHud').textContent=hudCache.herringHud=herringHud}
  
  const flagHud=`${run.flags}/${c.flagCount}`;
  if(hudCache.flagHud!==flagHud){$('flagHud').textContent=hudCache.flagHud=flagHud}
  
  const speedHud=`${Math.round(run.speed)} m/s`;
  if(hudCache.speedHud!==speedHud){$('speedHud').textContent=hudCache.speedHud=speedHud}
  
  const progress=`${run.z/c.length*100}%`;
  if(hudCache.progress!==progress){$('progress').style.width=hudCache.progress=progress}
  
  const courseHud=c.name.toUpperCase();
  if(hudCache.courseHud!==courseHud){$('courseHud').textContent=hudCache.courseHud=courseHud}
  
  const distanceHud=`${Math.ceil(Math.max(0,c.length-run.z))}m`;
  if(hudCache.distanceHud!==distanceHud){$('distanceHud').textContent=hudCache.distanceHud=distanceHud}
  
  const place=racePlace(run);
  const nearestRival=[...run.rivals].sort((a,b)=>Math.abs(a.z-run.z)-Math.abs(b.z-run.z))[0];
  const gap=Math.round(nearestRival.z-run.z);
  const rivalsHud=`${place}/4 · ${nearestRival.name} ${gap>0?'+':''}${gap}m`;
  if(hudCache.rivalsHud!==rivalsHud){$('rivalsHud').textContent=hudCache.rivalsHud=rivalsHud}
  
  const modeHud=run.carving?'CARVING':run.paddling?'PADDLING':run.air>.1?'AIRBORNE':'SLIDING';
  if(hudCache.modeHud!==modeHud){$('modeHud').textContent=hudCache.modeHud=modeHud}
  
  // Jump charge indicator
  if(charging){
    const held=(performance.now()-chargeStart)/1000;
    $('notice').textContent=held>.3?'CHARGED!':'CHARGING...';
    noticeUntil=performance.now()+100;
  }
}

function frame(t){
  const dt=Math.min(.05,(t-last)/1000||0);
  last=t;
  
  if(state==='racing'){
    const steer=(touch.right||keys.has('ArrowRight')||keys.has('KeyD')?1:0)
              -(touch.left||keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
    
    const input={
      steer:steer||((tiltLive&&t-tiltAt<1000&&Math.abs(tilt)>.08)?tilt:0),
      brake:touch.brake||keys.has('ArrowDown')||keys.has('KeyS'),
      paddle:touch.paddle,
      charging,
      jump:false // Jump handled separately via event
    };
    
    accumulator+=dt;
    const fixedDt=1/60;
    while(accumulator>=fixedDt){
      step(run,fixedDt,input);
      accumulator-=fixedDt;
    }
    
    // Event handling
    for(const e of run.events){
      if(e==='herring'){
        announce(`HERRING +${TUNE.herringValue}${run.combo>1?' · '+run.combo+'x COMBO!':''}`);
        sound('herring');
      }else if(e==='flag'){
        announce(`FLAG +${TUNE.flagValue}`);
        sound('flag');
      }else if(e==='crash'){
        announce('TREE! CRASHED');
        sound('crash');
      }else if(e==='land'){
        sound('land');
      }else if(e==='hardLanding'){
        announce('HARD LANDING!');
        sound('hardLanding');
      }else if(e==='jump'||e==='chargedJump'||e==='ramp'){
        announce(e==='chargedJump'?'CHARGED JUMP!':'JUMP');
        sound('jump');
      }
    }
    
    if(run.finished)finish();
    
    updateSlideSound();
  }
  
  if(t>noticeUntil)$('notice').textContent='';
  render();
  requestAnimationFrame(frame);
}

picker();
describeCourse();
requestAnimationFrame(frame);

// Debug interface
window.__snowline={
  get state(){return state},
  get run(){return run},
  get unlocked(){return unlocked},
  get avgFrameTime(){return avgFrameTime},
  start,
  step:(dt,input)=>{
    if(state==='racing'){
      step(run,dt,input);
      if(run.finished)finish();
    }
  },
  jump:()=>startJump(run,false)
};
