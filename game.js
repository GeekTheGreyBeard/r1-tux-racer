import {renderScene} from './renderer.js';
import {COURSES,center,width,newRun,step,jump,grade,score,racePlace,clamp} from './engine.js';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
let pickerPage=0;let boostQueued=false;let state='menu',selected=0,unlocked=0,run=null,last=0,tilt=0,tiltBase=null,tiltLive=false,tiltAt=0,noticeUntil=0,keys=new Set(),touch={left:false,right:false,brake:false},audio=null,wheelBrake=false,lastTap=null;
try{unlocked=clamp(Number(localStorage.getItem('snowline-unlocked'))||0,0,COURSES.length-1)}catch{}
function sound(type){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type==='hit'?'sawtooth':'sine';o.frequency.setValueAtTime(type==='fish'?580:type==='hit'?130:380,t);o.frequency.exponentialRampToValueAtTime(type==='fish'?900:type==='hit'?75:510,t+.13);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.085,t+.014);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.17)}catch{}}
function announce(s){$('notice').textContent=s;noticeUntil=performance.now()+1100}
function picker(){
 const root=$('picker');root.replaceChildren();
 const pages=Math.ceil(COURSES.length/5);pickerPage=clamp(pickerPage,0,pages-1);
 const nav=document.createElement('div');nav.className='picker-nav';
 const prev=document.createElement('button');prev.textContent='◀';prev.disabled=pickerPage===0;prev.onclick=()=>{pickerPage--;picker()};
 const label=document.createElement('span');label.textContent=`LEVELS ${pickerPage*5+1}–${Math.min(COURSES.length,(pickerPage+1)*5)} / ${COURSES.length}`;
 const next=document.createElement('button');next.textContent='▶';next.disabled=pickerPage===pages-1;next.onclick=()=>{pickerPage++;picker()};
 nav.append(prev,label,next);root.append(nav);
 const list=document.createElement('div');list.className='picker-list';
 COURSES.slice(pickerPage*5,pickerPage*5+5).forEach((c,j)=>{
  const i=pickerPage*5+j,b=document.createElement('button');
  b.textContent=`${String(i+1).padStart(2,'0')} ${c.name}${i>unlocked?' · LOCKED':''}`;
  b.disabled=i>unlocked;b.className=i===selected?'active':'';
  b.onclick=()=>{selected=i;picker();describeCourse()};list.append(b)
 });root.append(list)
}
function describeCourse(){const c=COURSES[selected];$('description').textContent=`${c.subtitle}. ${c.length}m · ${c.gateCount} gates · ${c.target} fish · ${c.time}s par.`}
function menu(mode='menu'){state=mode;$('panel').classList.remove('results');$('panel').hidden=false;$('controls').hidden=true;$('hud').hidden=true;$('pause').hidden=true;$('panel').querySelector('h1').innerHTML='SNOWLINE<br><em>SPRINT</em>';$('primary').innerHTML='START DESCENT <span>↗</span>';$('menuButton').hidden=true;pickerPage=Math.floor(selected/5);picker();describeCourse()}
function start(){run=newRun(selected);tiltBase=null;tiltLive=false;wheelBrake=false;lastTap=null;state='racing';$('panel').classList.remove('results');$('panel').hidden=true;$('controls').hidden=false;$('hud').hidden=false;$('pause').hidden=false;last=performance.now();announce(COURSES[selected].name.toUpperCase());audio?.resume();requestTilt()}
function requestTilt(){if(typeof DeviceOrientationEvent==='undefined')return;if(typeof DeviceOrientationEvent.requestPermission==='function'){DeviceOrientationEvent.requestPermission().catch(()=>{});} }
window.addEventListener('deviceorientation',e=>{if(typeof e.gamma!=='number')return;if(tiltBase===null)tiltBase=e.gamma;tilt=clamp((e.gamma-tiltBase)/24,-1,1);tiltLive=true;tiltAt=performance.now()});
function finish(){state='results';$('hud').hidden=true;$('controls').hidden=true;$('pause').hidden=true;$('panel').hidden=false;$('panel').classList.add('results');const medal=grade(run),place=racePlace(run),win=medal&&place===1;if(win&&selected===unlocked&&unlocked<COURSES.length-1){unlocked++;pickerPage=Math.floor(unlocked/5);try{localStorage.setItem('snowline-unlocked',String(unlocked))}catch{}}picker();$('panel').querySelector('h1').innerHTML='FINISH LINE<br><em>'+ (place===1?'VICTORY':`PLACE ${place} / 4`) +'</em>';$('description').textContent=`${COURSES[selected].name} · ${Math.ceil(run.elapsed)}s · ${run.fish} fish · ${run.gates}/${run.course.gateCount} gates · ${run.hits} hits · Score ${score(run)}. ${medal?'Medal earned.':'Medal needs target fish, 65% gates, par time and fewer than four hits.'} ${win?(selected<COURSES.length-1?'Next level unlocked.':'All 25 levels cleared!'):'Finish first with a medal to unlock the next level.'}`;$('primary').innerHTML=win&&selected<COURSES.length-1?'NEXT LEVEL <span>↗</span>':'RACE AGAIN <span>↗</span>';$('menuButton').hidden=false;sound(win?'fish':'hit')}
$('menuButton').onclick=()=>menu();$('primary').onclick=()=>{if(state==='paused'){state='racing';$('panel').hidden=true;last=performance.now();return}if(state==='results'&&grade(run)&&racePlace(run)===1&&selected<COURSES.length-1)selected++;start()};$('pause').onclick=()=>{if(state!=='racing')return;state='paused';$('panel').classList.remove('results');$('panel').hidden=false;$('panel').querySelector('h1').innerHTML='TAKE A<br><em>BREATH</em>';$('description').textContent='The mountain waits. Tilt to steer, or use the arrows. Hold brake on tight turns.';$('primary').innerHTML='RESUME <span>↗</span>';$('menuButton').hidden=false};
for(const id of ['left','right','brake']){const b=$(id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(id==='brake'&&wheelBrake){wheelBrake=false;announce('BRAKE RELEASED')}else touch[id]=true};b.onpointerup=b.onpointercancel=()=>touch[id]=false}
$('boost').onpointerdown=e=>{e.preventDefault();if(state==='racing')boostQueued=true};
$('jump').onpointerdown=e=>{e.preventDefault();if(state==='racing')jump(run)};
// Gesture detector listens on the playfield, never UI buttons or panel.
// Pointer identity, travel and duration disqualify drags; a triple tap is one jump.
const taps=new Map();
$('shell').addEventListener('pointerdown',e=>{if(state!=='racing'||e.target.closest('button,.controls,.panel,.hud'))return;taps.set(e.pointerId,{x:e.clientX,y:e.clientY,t:performance.now()})});
$('shell').addEventListener('pointercancel',e=>{taps.delete(e.pointerId);lastTap=null});
$('shell').addEventListener('pointerup',e=>{const down=taps.get(e.pointerId);taps.delete(e.pointerId);if(!down||state!=='racing')return;const now=performance.now();if(now-down.t>300||Math.hypot(e.clientX-down.x,e.clientY-down.y)>18){lastTap=null;return}if(lastTap&&lastTap.id===e.pointerType&&now-lastTap.t<360&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<75){jump(run);lastTap=null}else lastTap={x:e.clientX,y:e.clientY,t:now,id:e.pointerType}});
window.addEventListener('wheel',e=>{if(state!=='racing'||!e.deltaY)return;e.preventDefault();if(e.deltaY<0){wheelBrake=false;boostQueued=true;announce('WHEEL ↑ BOOST')}else{wheelBrake=true;announce('WHEEL ↓ BRAKE')}},{passive:false});
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowDown','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if((e.code==='ArrowUp'||e.code==='KeyW')&&state==='racing'&&!e.repeat)boostQueued=true;if(e.code==='Space'&&state==='racing'&&!e.repeat)jump(run);if(e.code==='Escape'&&state==='racing')$('pause').click()});window.addEventListener('keyup',e=>keys.delete(e.code));
function render(){const c=run?.course||COURSES[selected];renderScene(ctx,run,c,performance.now());if(run){$('timer').textContent=`${Math.floor(run.elapsed/60).toString().padStart(2,'0')}:${Math.floor(run.elapsed%60).toString().padStart(2,'0')}`;$('fishHud').textContent=`◆ ${run.fish}/${c.target}`;$('gateHud').textContent=`◇ ${run.gates}/${c.gateCount}`;$('speedHud').textContent=`${Math.round(run.speed)} m/s`;$('progress').style.width=`${run.z/c.length*100}%`;$('staminaFill').style.width=`${run.stamina}%`;$('boostHud').textContent=`⚡ ${run.boostCharges} BOOST${run.boostCharges===1?'':'S'}`;$('courseHud').textContent=c.name.toUpperCase();$('distanceHud').textContent=`${Math.ceil(Math.max(0,c.length-run.z))}m TO FINISH`;const place=racePlace(run);$('rivalsHud').textContent=`${place}/4 · ${[...run.rivals].sort((a,b)=>Math.abs(a.z-run.z)-Math.abs(b.z-run.z)).slice(0,1).map(r=>`${r.name} ${Math.round(r.z-run.z)>0?'+':''}${Math.round(r.z-run.z)}m`).join('')}`;$('modeHud').textContent=run.brake?'BRAKING · WHEEL ↑ BOOST':run.boost>0?'BOOSTING · WHEEL ↓ BRAKE':'COAST · WHEEL ↑ BOOST / ↓ BRAKE'}}
function frame(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;if(state==='racing'){
 const steer=(touch.right||keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(touch.left||keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
 // Touch/keyboard takes priority while pressed; sensor tilt takes over otherwise.
 step(run,dt,{steer:steer||((tiltLive&&t-tiltAt<1000&&Math.abs(tilt)>.08)?tilt:0),brake:wheelBrake||touch.brake||keys.has('ArrowDown')||keys.has('KeyS'),boost:boostQueued});boostQueued=false;
 for(const e of run.events){if(e==='fish'||e==='gate'||e==='hit'||e==='ramp'){announce({fish:'FISH +85',gate:'CLEAN GATE +160',hit:'ROCK! SLOW DOWN',ramp:'AIRBORNE',boost:'BOOST!',charge:'BOOST +1'}[e]);sound(e)}}if(run.finished)finish();}
 if(t>noticeUntil)$('notice').textContent='';render();requestAnimationFrame(frame)}
picker();describeCourse();requestAnimationFrame(frame);
window.__snowline={get state(){return state},get run(){return run},get unlocked(){return unlocked},start,step:(dt,input)=>{if(state==='racing'){step(run,dt,input);if(run.finished)finish()}},jump:()=>jump(run)};
