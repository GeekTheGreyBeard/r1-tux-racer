import {center,width,clamp,lerp,slope,rivalX,TUNE} from './engine.js';

const poly=(g,points,fill)=>{g.fillStyle=fill;g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.closePath();g.fill()};
const ellipse=(g,x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,Math.max(.2,rx),Math.max(.2,ry),0,0,7);g.fill()};
const rng=n=>{let v=Math.sin(n*127.1+45.6)*43758.5453;return v-Math.floor(v)};

// Tux sprite poses (original art, no GPL assets)
// Belly-slide penguin: black/white, orange beak/feet, colored scarf
function tuxPenguin(g,x,y,air,lean,pose='slide',scale=1,t=0,scarf='#e58d5c'){
  g.save();
  g.translate(x,y-air*7);
  
  if(pose==='tumble'){
    // Crashed/tumbling
    g.rotate((t*.01)%(Math.PI*2));
    ellipse(g,0,0,16,16,'#172a39');
    ellipse(g,0,0,11,11,'#f3f3e9');
    poly(g,[[-6,-8],[-12,-4],[-10,2],[-4,0]],'#f4a542'); // Beak
    ellipse(g,-4,-2,1.5,1.5,'#faf9ed');
    g.restore();
    return;
  }
  
  if(pose==='air'){
    // In-air tuck
    g.rotate(lean*.15);
    ellipse(g,3,24+air*6,20,3,'#19435855');
    ellipse(g,0,0,14,19,'#172a39');
    ellipse(g,0,2,10,15,'#f3f3e9');
    poly(g,[[-6,-10],[-10,-8],[-8,-2],[-4,-5]],'#152938'); // Left flipper
    poly(g,[[6,-10],[10,-8],[8,-2],[4,-5]],'#152938'); // Right flipper
    poly(g,[[-8,8],[-13,16],[-10,18],[-6,13]],'#efa94d'); // Left foot
    poly(g,[[8,8],[13,16],[10,18],[6,13]],'#efa94d'); // Right foot
    poly(g,[[-4,-16],[4,-16],[0,-24]],'#f4a542'); // Beak
    ellipse(g,-4,-13,2,2,'#faf9ed'); // Eye
    ellipse(g,4,-13,2,2,'#faf9ed');
    g.fillStyle=scarf;g.fillRect(-9,-4,18,3);
    g.restore();
    return;
  }
  
  // Ground poses: slide, paddle left/right, carve left/right
  g.rotate(lean*.1);
  g.scale(scale,scale);
  
  const kick=pose==='paddle'?Math.sin(t*.018)*2.5:0;
  const slideAnim=Math.sin(t*.008)*.8;
  
  // Shadow
  ellipse(g,3,22+slideAnim,21,3,'#19435866');
  
  // Body - prone downhill
  ellipse(g,0,9,17,12,'#f6f6e9'); // White belly sides
  
  // Flippers - paddling animation
  if(pose==='paddle'){
    poly(g,[[-11,5],[-26,8+kick],[-24,14+kick],[-9,15]],'#152938');
    poly(g,[[11,5],[26,8-kick],[24,14-kick],[9,15]],'#152938');
  }else{
    poly(g,[[-11,5],[-25,12],[-23,18],[-9,15]],'#152938');
    poly(g,[[11,5],[25,12],[23,18],[9,15]],'#152938');
  }
  
  ellipse(g,0,8,14,17,'#172a39'); // Black back
  ellipse(g,0,2,10,12,'#f3f3e9'); // White chest
  ellipse(g,0,8,8,12,'#213747'); // Dorsal spine
  
  // Head - white cheek patches
  ellipse(g,-7,-7,5,7,'#f6f6e9');
  ellipse(g,7,-7,5,7,'#f6f6e9');
  ellipse(g,0,-9,10,10,'#142938'); // Black crown
  
  // Eyes
  ellipse(g,-5,-11,1.5,2,'#faf9ed');
  ellipse(g,5,-11,1.5,2,'#faf9ed');
  
  // Orange beak pointing forward
  poly(g,[[-4,-17],[4,-17],[0,-24]],'#f4a542');
  
  // Scarf
  g.fillStyle=scarf;
  g.fillRect(-10,-1,20,3);
  
  // Webbed feet
  ellipse(g,-7,23+kick*.3,6,3,'#efa94d');
  ellipse(g,7,23-kick*.3,6,3,'#efa94d');
  
  g.restore();
}

// Tree sprites - multiple sizes
function pine(g,x,y,size,night){
  if(size<.3)return;
  g.save();
  g.translate(x,y);
  g.scale(size,size);
  
  // Shadow
  ellipse(g,3,1,8,2,'#426b8766');
  
  // Trunk
  g.fillStyle='#513f3b';
  g.fillRect(-1,-12,2,15);
  
  // Branches - 3 layers
  const green=night?'#173449':'#244c55';
  const highlight=night?'#66818b':'#c1e1e3';
  
  for(let i=0;i<3;i++){
    const w=7-i*4;
    poly(g,[[-w,-4-i*5],[0,-23-i*5],[w,-4-i*5]],green);
    poly(g,[[-w*.76,-7-i*5],[0,-23-i*5],[w*.15,-8-i*5]],highlight);
  }
  
  g.restore();
}

// Particle system (pooled, max 48)
const particlePool=Array.from({length:TUNE.particlePoolSize},()=>({
  active:false,type:'snow',x:0,y:0,vx:0,vy:0,life:0,maxLife:1,size:1
}));

function spawnParticle(type,x,y,vx,vy,life,size=1){
  const p=particlePool.find(p=>!p.active);
  if(!p)return;
  Object.assign(p,{active:true,type,x,y,vx,vy,life,maxLife:life,size});
}

function updateParticles(dt){
  for(const p of particlePool){
    if(!p.active)continue;
    p.life-=dt;
    if(p.life<=0){p.active=false;continue}
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.vy+=2*dt; // Gravity on spray
  }
}

function drawParticles(g,camX,camY,q){
  for(const p of particlePool){
    if(!p.active)continue;
    const alpha=p.life/p.maxLife;
    const sx=120+(p.x-camX)*165*q;
    const sy=72+170*q+(p.y-camY)*165*q;
    
    if(p.type==='spray'){
      g.fillStyle=`rgba(230,240,250,${alpha*.6})`;
      g.fillRect(sx-p.size*.5,sy-p.size*.5,p.size,p.size);
    }else if(p.type==='sparkle'){
      g.fillStyle=`rgba(255,220,100,${alpha*.8})`;
      g.fillRect(sx-p.size,sy-p.size,p.size*2,p.size*2);
    }else if(p.type==='puff'){
      g.fillStyle=`rgba(240,248,255,${alpha*.5})`;
      g.beginPath();
      g.arc(sx,sy,p.size*3*alpha,0,7);
      g.fill();
    }
  }
}

// Pre-rendered sky cache
const skyCache=new Map();
function getSkyCanvas(night,ice,storm){
  const key=`${night?'n':'d'}${ice?'i':'p'}${storm?'s':''}`;
  if(skyCache.has(key))return skyCache.get(key);
  
  const c=document.createElement('canvas');
  c.width=240;c.height=282;
  const g=c.getContext('2d');
  
  // Sky gradient
  const sky=g.createLinearGradient(0,0,0,240);
  if(storm){
    sky.addColorStop(0,'#0e1c2e');
    sky.addColorStop(.55,'#4a5566');
    sky.addColorStop(1,'#7a8590');
  }else if(night){
    sky.addColorStop(0,'#13233e');
    sky.addColorStop(.55,'#d47b7f');
    sky.addColorStop(1,'#d5e5ed');
  }else if(ice){
    sky.addColorStop(0,'#467d9d');
    sky.addColorStop(.55,'#d8edf0');
    sky.addColorStop(1,'#d5e5ed');
  }else{
    sky.addColorStop(0,'#527f99');
    sky.addColorStop(.55,'#d8edf0');
    sky.addColorStop(1,'#d5e5ed');
  }
  g.fillStyle=sky;
  g.fillRect(0,0,240,282);
  
  // Sun/moon
  const orb=storm?null:{x:188,y:49,r:night?12:16,color:night?'#fff3d5':'#fff9e3'};
  if(orb)ellipse(g,orb.x,orb.y,orb.r,orb.r,orb.color);
  
  // Mountains with parallax
  const layers=storm?['#3e4555','#4a5368','#5a627a']:night?['#62637e','#555d79','#6b7185']:['#a2c8da','#7eafc4','#6d9aad'];
  for(let layer=0;layer<3;layer++){
    let pts=[[0,145]];
    for(let x=0;x<=250;x+=5){
      const crest=(layer===0?83:layer===1?102:123)-Math.abs(Math.sin(x*.024+layer*2.3))*22-Math.abs(Math.sin(x*.087+layer))*12;
      pts.push([x,crest]);
    }
    pts.push([240,145]);
    poly(g,pts,layers[layer]);
  }
  
  skyCache.set(key,c);
  return c;
}

// Chase camera with smooth following and roll
let camera={x:0,z:0,targetX:0,targetZ:0,roll:0,targetRoll:0,lookAhead:15};

function updateCamera(run,dt){
  if(!run)return;
  
  // Look-ahead based on speed
  camera.lookAhead=15+run.speed*.5;
  camera.targetZ=run.z+camera.lookAhead;
  camera.targetX=run.x;
  
  // Roll based on turn rate
  const turnVel=(run.vx||0)/Math.max(1,run.speed);
  camera.targetRoll=-turnVel*.25;
  
  // Smooth interpolation
  camera.z=lerp(camera.z,camera.targetZ,Math.min(1,dt*4));
  camera.x=lerp(camera.x,camera.targetX,Math.min(1,dt*5));
  camera.roll=lerp(camera.roll,camera.targetRoll,Math.min(1,dt*3));
}

// Falling snow particles (storm theme)
let snowFall=[];
function initSnowFall(){
  snowFall=Array.from({length:30},()=>({
    x:Math.random()*240,
    y:Math.random()*282,
    speed:.3+Math.random()*.5,
    size:1+Math.random()*1.5
  }));
}
function updateSnowFall(dt){
  for(const s of snowFall){
    s.y+=s.speed*60*dt;
    if(s.y>282){s.y=0;s.x=Math.random()*240}
  }
}

export function renderScene(g,run,course,t,frameTime=16){
  const c=course;
  const z=camera.z||run?.z||0;
  const camX=camera.x||run?.x||0;
  const night=c.theme==='dusk';
  const ice=c.theme==='ice';
  const storm=c.difficulty>=20;
  
  // Performance scaling
  const performanceScale=frameTime>TUNE.targetFrameTime?TUNE.targetFrameTime/frameTime:1;
  const particlesEnabled=performanceScale>.5;
  const effectsEnabled=performanceScale>.7;
  
  // Sky
  g.drawImage(getSkyCanvas(night,ice,storm),0,0);
  
  // Ground horizon
  const h=73;
  const ground=g.createLinearGradient(0,h,0,282);
  if(storm){
    ground.addColorStop(0,'#c8d1dc');
    ground.addColorStop(1,'#8a9aae');
  }else if(night){
    ground.addColorStop(0,'#ddc5d5');
    ground.addColorStop(1,'#c4b6c8');
  }else{
    ground.addColorStop(0,'#ecf8f8');
    ground.addColorStop(1,'#b0cedb');
  }
  g.fillStyle=ground;
  g.fillRect(0,h,240,282-h);
  
  // Perspective projection
  const point=(d,x)=>{
    const zz=Math.max(0,z+d);
    const q=1/(1+d*.029);
    const centerOffset=center(zz,c)-camX;
    const bend=centerOffset*155*q;
    return {x:120+bend+(x-center(zz,c))*165*q,y:72+170*q,q,zz};
  };
  
  // Track ribbon with slope shading
  const trackPoints=[];
  for(let d=240;d>=-12;d-=4){
    const zz=Math.max(0,z+d);
    const w=width(zz,c)*.5;
    const s=slope(zz,c);
    const p=point(d,center(zz,c));
    trackPoints.push({d,zz,w,slope:s,center:p});
  }
  
  // Draw track surface with alternating slope bands
  for(let i=0;i<trackPoints.length-1;i++){
    const curr=trackPoints[i];
    const next=trackPoints[i+1];
    const brightness=.85+curr.slope*2; // Darker on steep slopes
    const band=Math.floor(curr.zz/15)%2===0; // Alternating bands
    const shade=band?.95:1;
    
    let baseColor;
    if(storm)baseColor=`rgb(${200*brightness*shade},${210*brightness*shade},${220*brightness*shade})`;
    else if(night)baseColor=`rgb(${233*brightness*shade},${220*brightness*shade},${226*brightness*shade})`;
    else baseColor=`rgb(${245*brightness*shade},${252*brightness*shade},${249*brightness*shade})`;
    
    const l1=[curr.center.x-curr.w*165*curr.center.q,curr.center.y];
    const r1=[curr.center.x+curr.w*165*curr.center.q,curr.center.y];
    const l2=[next.center.x-next.w*165*next.center.q,next.center.y];
    const r2=[next.center.x+next.w*165*next.center.q,next.center.y];
    
    poly(g,[l1,r1,r2,l2],baseColor);
  }
  
  // Snowbanks at edges
  if(effectsEnabled){
    for(let d=240;d>=0;d-=8){
      const p=point(d,center(d+z,c));
      const w=width(d+z,c)*.5;
      for(const side of[-1,1]){
        const bx=p.x+side*w*165*p.q;
        const by=p.y;
        g.fillStyle=night?'#d4c1cf':'#f9fdff';
        g.beginPath();
        g.ellipse(bx,by+2*p.q,8*p.q,3*p.q,0,0,7);
        g.fill();
      }
    }
  }
  
  // Track edge lines
  for(const side of[-1,1]){
    g.beginPath();
    for(let d=240;d>=-12;d-=4){
      const p=point(d,center(d+z,c)+side*width(d+z,c)*.5);
      if(d===240)g.moveTo(p.x,p.y);
      else g.lineTo(p.x,p.y);
    }
    g.strokeStyle=night?'#a989a5':storm?'#6a7c8f':'#9ac5cf';
    g.lineWidth=2;
    g.stroke();
  }
  
  // Collect and sort sprites by distance
  const sprites=[];
  
  // Trees
  for(let n=0;n<50;n++){
    const zz=Math.floor(z/11)*11+n*11;
    const d=zz-z;
    if(d<0||d>245)continue;
    const side=n%2?1:-1;
    const offset=width(zz,c)*.5+.11+rng(n*3+c.seed)*.9;
    const xx=center(zz,c)+side*offset;
    const p=point(d,xx);
    const size=clamp(1.5*p.q,.2,1.2);
    sprites.push({d,type:'tree',x:p.x,y:p.y,size,night});
  }
  
  // Rivals
  if(run){
    for(const rival of run.rivals){
      const d=rival.z-z;
      if(d>=-15&&d<=235){
        const p=point(d,rivalX(rival,rival.z,c));
        sprites.push({d,type:'rival',x:p.x,y:p.y,q:p.q,rival,idx:run.rivals.indexOf(rival)});
      }
    }
  }
  
  // Objects
  if(run){
    for(const o of run.objects){
      const d=o.z-z;
      if(d>=0&&d<=235){
        const p=point(d,o.x);
        sprites.push({d,type:'object',x:p.x,y:p.y,q:p.q,o});
      }
    }
  }
  
  // Tux
  if(run&&!run.finished){
    const riderD=-8;
    const rider=point(riderD,run.x);
    const pose=run.crashed&&run.stun>.3?'tumble':run.air>.1?'air':run.paddling?'paddle':'slide';
    const lean=run.carving?(run.vx>0?1:-1):0;
    sprites.push({d:riderD,type:'tux',x:rider.x,y:rider.y,q:rider.q,air:run.air,lean,pose});
  }
  
  // Sort far to near
  sprites.sort((a,b)=>b.d-a.d);
  
  // Draw sprites
  for(const s of sprites){
    if(s.type==='tree'){
      pine(g,s.x,s.y,s.size,s.night);
    }else if(s.type==='rival'){
      const scarves=['#e78c73','#8dd7e2','#dfc37c'];
      tuxPenguin(g,s.x,s.y-7/(1+s.d*.029),0,0,'slide',clamp(s.q*.9,.23,.78),t+s.rival.phase*100,scarves[s.idx]);
    }else if(s.type==='object'){
      drawObject(g,s.o,s.x,s.y,clamp(s.q*1.5,.2,1.4),night,ice);
    }else if(s.type==='tux'){
      // Snow spray particles behind Tux
      if(particlesEnabled&&run.speed>15&&Math.random()<.3){
        spawnParticle('spray',run.x+(Math.random()-.5)*.3,0,(Math.random()-.5)*2,-1+Math.random()*2,.4,1+Math.random());
      }
      tuxPenguin(g,s.x,s.y,s.air,s.lean,s.pose,.82,t);
    }
  }
  
  // Draw particles
  if(particlesEnabled&&run){
    updateParticles(1/60);
    drawParticles(g,camX,0,point(-8,run.x).q);
  }
  
  // Finish line
  if(run){
    const finishD=c.length-z;
    if(finishD>=-12&&finishD<=235){
      const q=1/(1+finishD*.029);
      const w=width(c.length,c)*.5;
      const left=point(finishD,center(c.length,c)-w);
      const right=point(finishD,center(c.length,c)+w);
      
      g.save();
      g.strokeStyle='#172b3c';
      g.lineWidth=Math.max(2,q*12);
      g.setLineDash([Math.max(2,q*8),Math.max(2,q*8)]);
      g.beginPath();
      g.moveTo(left.x,left.y);
      g.lineTo(right.x,right.y);
      g.stroke();
      g.setLineDash([]);
      
      g.fillStyle='#edb55c';
      g.fillRect(left.x-2,left.y-28*q,3,28*q);
      g.fillRect(right.x-1,right.y-28*q,3,28*q);
      
      g.fillStyle='#162d40';
      g.font=`bold ${Math.max(5,9*q)}px sans-serif`;
      g.textAlign='center';
      g.fillText('FINISH',(left.x+right.x)/2,left.y-14*q);
      g.restore();
    }
  }
  
  // Falling snow (storm levels)
  if(storm&&effectsEnabled){
    if(snowFall.length===0)initSnowFall();
    updateSnowFall(1/60);
    g.fillStyle='rgba(255,255,255,0.4)';
    for(const s of snowFall){
      g.fillRect(s.x,s.y,s.size,s.size);
    }
  }
  
  // Vignette
  if(effectsEnabled){
    const vig=g.createRadialGradient(120,141,60,120,141,190);
    vig.addColorStop(0,'rgba(0,0,0,0)');
    vig.addColorStop(1,'rgba(0,0,0,0.25)');
    g.fillStyle=vig;
    g.fillRect(0,0,240,282);
  }
  
  // Camera roll visualization (subtle)
  if(Math.abs(camera.roll)>.01){
    g.save();
    g.translate(120,141);
    g.rotate(camera.roll);
    g.translate(-120,-141);
    // Already rendered, just showing roll effect would need full re-render
    // For simplicity, roll is minimal visual feedback
    g.restore();
  }
  
  // Update camera
  if(run)updateCamera(run,1/60);
}

function drawObject(g,o,x,y,s,night,ice){
  g.save();
  g.translate(x,y);
  g.scale(s,s);
  
  if(o.type==='herring'){
    // Herring (was fish)
    ellipse(g,0,-8,8,4,'#fbc35f');
    poly(g,[[5,-8],[13,-13],[13,-3]],'#f5a942');
    ellipse(g,-3,-9,1,1,'#173d44');
  }else if(o.type==='flag'){
    // Flag marker
    g.strokeStyle=night?'#d4a8f2':'#4c8ef8';
    g.lineWidth=2;
    g.beginPath();
    g.moveTo(0,0);
    g.lineTo(0,-25);
    g.stroke();
    
    poly(g,[[0,-25],[15,-22],[15,-18],[0,-20]],night?'#b88ede':'#6ba3ff');
  }else if(o.type==='ramp'){
    // Jump ramp
    poly(g,[[-13,0],[13,0],[8,-5],[-9,-5]],'#d98c5f');
    g.fillStyle='#ffe9d2';
    g.fillRect(-8,-5,15,1);
  }
  
  g.restore();
}
