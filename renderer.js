import {center,width,clamp} from './engine.js';
const poly=(g,points,fill)=>{g.fillStyle=fill;g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.closePath();g.fill()};
const ellipse=(g,x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,Math.max(.2,rx),Math.max(.2,ry),0,0,7);g.fill()};
const rng=n=>{let v=Math.sin(n*127.1+45.6)*43758.5453;return v-Math.floor(v)};
function pine(g,x,y,s,night){if(s<.25)return;g.save();g.translate(x,y);g.scale(s,s);ellipse(g,3,1,8,2,'#426b8766');g.fillStyle='#513f3b';g.fillRect(-1,-12,2,15);for(let i=0;i<3;i++){let a=7-i*4;poly(g,[[-a,-4-i*5],[0,-23-i*5],[a,-4-i*5]],night?'#173449':'#244c55');poly(g,[[-a*.76,-7-i*5],[0,-23-i*5],[a*.15,-8-i*5]],night?'#66818b':'#c1e1e3')}g.restore()}
// Tux is prone and sliding away from the chase camera: the head/beak point up
// the hill on screen, the dark back faces us, and the feet trail near the camera.
function penguin(g,x,y,air,lean,scale=1,t=0){
 g.save();g.translate(x,y-air*7);g.rotate(lean*.1);g.scale(scale,scale);
 const kick=Math.sin(t*.012)*2;
 ellipse(g,3,21+air*7,20,3,'#19435866');
 // Sliding belly/snow contact is mostly hidden beneath the dark dorsal silhouette.
 ellipse(g,0,11,18,11,'#e9f3ed');
 poly(g,[[-12,10],[-23,13+kick],[-25,18+kick],[-8,18]],'#112733');
 poly(g,[[12,10],[23,13-kick],[25,18-kick],[8,18]],'#112733');
 ellipse(g,0,8,13,18,'#132b37');
 ellipse(g,-6,12,5,10,'#213f4d');ellipse(g,6,12,5,10,'#213f4d');
 ellipse(g,0,-7,11,10,'#142d3a');
 // A tiny orange beak peeks past the forward-facing head, not at the camera.
 poly(g,[[-3,-15],[3,-15],[0,-21]],'#f6ab48');
 ellipse(g,-7,23+kick*.4,6,3,'#eda64d');ellipse(g,7,23-kick*.4,6,3,'#eda64d');
 g.restore()
}
function drawObject(g,o,x,y,s,night){g.save();g.translate(x,y);g.scale(s,s);if(o.type==='fish'){ellipse(g,0,-8,8,4,'#fbc35f');poly(g,[[5,-8],[13,-13],[13,-3]],'#f5a942');ellipse(g,-3,-9,1,1,'#173d44')}else if(o.type==='boost'){ellipse(g,0,-9,11,11,'#b5f65666');ellipse(g,0,-9,8,8,'#adf768');poly(g,[[2,-16],[-4,-8],[0,-8],[-3,-1],[6,-11],[1,-11]],'#1c4450')}else if(o.type==='gate'){g.strokeStyle=night?'#a7f2dc':'#2c6e81';g.lineWidth=2;for(const a of [-13,13]){g.beginPath();g.moveTo(a,0);g.lineTo(a,-25);g.stroke();ellipse(g,a,-25,2,2,'#d8fff6')}poly(g,[[-13,-24],[13,-24],[13,-19],[-13,-19]],'#b0ef81')}else if(o.type==='rock'){poly(g,[[-10,0],[-6,-9],[1,-14],[7,-10],[12,0]],'#547187');poly(g,[[-6,-9],[1,-14],[4,-10],[-2,-7]],'#effaff')}else{poly(g,[[-13,0],[13,0],[8,-5],[-9,-5]],'#d98c5f');g.fillStyle='#ffe9d2';g.fillRect(-8,-5,15,1)}g.restore()}
export function renderScene(g,run,course,t){const c=course,z=run?.z||0,night=c.theme==='dusk',ice=c.theme==='ice',sky=g.createLinearGradient(0,0,0,240);sky.addColorStop(0,night?'#13233e':ice?'#467d9d':'#527f99');sky.addColorStop(.55,night?'#d47b7f':'#d8edf0');sky.addColorStop(1,'#d5e5ed');g.fillStyle=sky;g.fillRect(0,0,240,282);
 ellipse(g,188,49,night?12:16,night?12:16,night?'#fff3d5':'#fff9e3');
 for(let layer=0;layer<3;layer++){let pts=[[0,145]];for(let x=0;x<=250;x+=5){let crest=(layer===0?83:layer===1?102:123)-Math.abs(Math.sin(x*.024+layer*2.3))*22-Math.abs(Math.sin(x*.087+layer))*12;pts.push([x,crest])}pts.push([240,145]);poly(g,pts,night?['#62637e','#555d79','#6b7185'][layer]:['#a2c8da','#7eafc4','#6d9aad'][layer])}
 const h=73,ground=g.createLinearGradient(0,h,0,282);ground.addColorStop(0,night?'#ddc5d5':'#ecf8f8');ground.addColorStop(1,night?'#c4b6c8':'#b0cedb');g.fillStyle=ground;g.fillRect(0,h,240,282-h);
 // Chase camera tracks the winding centerline; a sampled width and vanishing point convey slope depth.
 const point=(d,x)=>{let zz=Math.max(0,z+d),q=1/(1+d*.029),bend=(center(zz,c)-center(z,c))*155*q;return {x:120+bend+(x-center(zz,c))*165*q,y:72+170*q,q}};
 const l=[],r=[];for(let d=240;d>=-12;d-=4){let zz=Math.max(0,z+d),w=width(zz,c)*.5,p=point(d,center(zz,c)-w);l.push([p.x,p.y]);p=point(d,center(zz,c)+w);r.push([p.x,p.y])}poly(g,[...l,...r.reverse()],night?'#e9dce2':'#f5fcf9');
 for(let side of [-1,1]){g.beginPath();for(let d=240;d>=-12;d-=4){let zz=Math.max(0,z+d),p=point(d,center(zz,c)+side*width(zz,c)*.5);if(d===240)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y)}g.strokeStyle=night?'#a989a5':'#9ac5cf';g.lineWidth=2;g.stroke()}
 // Terrain ribbon texture and offset groves preserve depth without WebGL or downloaded assets.
 for(let n=0;n<50;n++){let zz=Math.floor(z/11)*11+n*11,d=zz-z;if(d<0||d>245)continue;let q=1/(1+d*.029),side=n%2?1:-1,xx=center(zz,c)+side*(width(zz,c)*.5+.11+rng(n*3+c.seed)*.9),p=point(d,xx);pine(g,p.x,p.y,clamp(1.5*q,.16,1.2),night)}
 for(let n=0;n<75;n++){let zz=Math.floor(z/5)*5+n*5,d=zz-z;if(d<0||d>190)continue;let p=point(d,center(zz,c)+(rng(n*17+c.seed)-.5)*width(zz,c)*.8);ellipse(g,p.x,p.y,Math.max(.5,p.q*1.7),Math.max(.3,p.q*.6),night?'#b8b6ce77':'#a2c7d376')}
 if(run){for(const o of run.objects){let d=o.z-z;if(d<0||d>235)continue;let p=point(d,o.x);drawObject(g,o,p.x,p.y,clamp(p.q*1.5,.2,1.4),night)}let rider=point(-8,run.x);if(run.boost>0){for(let i=0;i<7;i++){let x=rider.x+(rng(i*13+t*.002)-.5)*32,y=235+i*7;ellipse(g,x,y,1+i*.2,3,'#b8f86baa')}}penguin(g,rider.x,222,run.air,run.steer,.82,t)}else penguin(g,120,217,0,0,.85,t);
}
