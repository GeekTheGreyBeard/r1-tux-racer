import { chromium } from 'playwright';
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';
const root=resolve(import.meta.dirname,'..');const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url==='/'?'/index.html':req.url));if(!path.startsWith(root+'/'))throw Error('invalid');const data=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(data)}catch{res.statusCode=404;res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:240,height:282},deviceScaleFactor:1,hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.goto(`http://127.0.0.1:${server.address().port}`);await page.screenshot({path:resolve(root,'screenshot-menu.png')});await page.locator('#primary').click();await page.waitForTimeout(400);if(await page.evaluate(()=>window.__snowline.state)!=='racing')throw Error('start failed');const x0=await page.evaluate(()=>window.__snowline.run.x);await page.locator('#right').dispatchEvent('pointerdown',{pointerId:1});await page.waitForTimeout(450);await page.locator('#right').dispatchEvent('pointerup',{pointerId:1});const x=await page.evaluate(()=>window.__snowline.run.x);if(x<=x0+.03)throw Error(`steering failed: ${x0} -> ${x}; errors: ${errors}`);await page.locator('#jump').dispatchEvent('pointerdown',{pointerId:2});if(await page.evaluate(()=>window.__snowline.run.jumps)<1)throw Error('jump failed');await page.locator('#boost').dispatchEvent('pointerdown',{pointerId:3});await page.waitForTimeout(60);if(await page.evaluate(()=>window.__snowline.run.boostCharges)!==1)throw Error('boost failed');// Two playfield taps jump; menu buttons and drag do not count as taps.
 await page.evaluate(()=>{const r=window.__snowline.run;r.air=0;r.vy=0});
 const jumps0=await page.evaluate(()=>window.__snowline.run.jumps);
 await page.locator('#scene').tap({position:{x:118,y:154}});await page.locator('#scene').tap({position:{x:118,y:154}});
 if(await page.evaluate(()=>window.__snowline.run.jumps)!==jumps0+1)throw Error('double tap failed');
 await page.evaluate(()=>{const r=window.__snowline.run;r.air=0;r.vy=0});
 const beforeUi=await page.evaluate(()=>window.__snowline.run.jumps);
 await page.locator('#pause').click();await page.locator('#primary').click();
 await page.locator('#scene').tap({position:{x:118,y:154}});
 if(await page.evaluate(()=>window.__snowline.run.jumps)!==beforeUi)throw Error('UI gestures contaminated tap pair');
 await page.mouse.wheel(0,80);await page.waitForTimeout(80);
 if(!await page.evaluate(()=>window.__snowline.run.brake))throw Error('wheel down did not brake');
 await page.mouse.wheel(0,-80);await page.waitForTimeout(80);
 if(await page.evaluate(()=>window.__snowline.run.brake))throw Error('wheel up did not release brake');
 if(!await page.locator('#modeHud').textContent().then(x=>/BOOST|COAST/.test(x)))throw Error('mode missing');
 await page.screenshot({path:resolve(root,'screenshot-gameplay.png')});await page.locator('#pause').click();if(await page.evaluate(()=>window.__snowline.state)!=='paused')throw Error('pause failed');await page.locator('#primary').click();await page.evaluate(()=>{let r=window.__snowline.run;r.z=r.course.length-.2;window.__snowline.step(.05,{})});if(await page.evaluate(()=>window.__snowline.state)!=='results')throw Error('finish failed');if(!await page.locator('h1').textContent().then(x=>x.includes('FINISH LINE')))throw Error('finish line results missing');if(await page.evaluate(()=>window.__snowline.run.z!==window.__snowline.run.course.length))throw Error('result not at actual finish');await page.screenshot({path:resolve(root,'screenshot-results.png')});
 // A qualifying first-stage finish must unlock stage two and persist after reload.
 await page.locator('#menuButton').click();await page.locator('#primary').click();
 await page.evaluate(()=>{const r=window.__snowline.run;r.z=r.course.length-.2;r.fish=r.course.target;r.gates=Math.ceil(r.course.gateCount*.65);r.elapsed=31;for(const o of r.rivals){o.z=Math.min(o.z,100);o.finishedAt=null}window.__snowline.step(.05,{})});
 if(await page.evaluate(()=>window.__snowline.unlocked)!==1)throw Error('victory medal did not unlock level two');if(!await page.locator('#primary').textContent().then(x=>x.includes('NEXT LEVEL')))throw Error('next level action missing');await page.screenshot({path:resolve(root,'screenshot-victory.png')});await page.locator('#primary').click();if(await page.evaluate(()=>window.__snowline.run.courseIndex)!==1)throw Error('next-level action failed');
 await page.reload();if(await page.locator('.picker-list button').nth(1).isDisabled())throw Error('unlock did not persist');

 // A qualifying medal unlocks the next stage; a persisted final unlock exposes level 25.
 await page.evaluate(()=>{localStorage.setItem('snowline-unlocked','24')});await page.reload();
 for(let j=0;j<4;j++)await page.locator('.picker-nav button').last().click();
 const finale=page.locator('.picker-list button').last();
 if(await finale.isDisabled() || !(await finale.textContent()).includes('25 Alpine Finale'))throw Error('final level locked or absent');
 await finale.click();await page.screenshot({path:resolve(root,'screenshot-level25-menu.png')});
 await page.locator('#primary').click();await page.waitForTimeout(200);
 if(await page.evaluate(()=>window.__snowline.run.courseIndex)!==24)throw Error('final level failed to start');
 await page.screenshot({path:resolve(root,'screenshot-level25-gameplay.png')});
 if(errors.length)throw Error(errors.join('; '));console.log(JSON.stringify({viewport:'240x282',start:true,steerX:x,jump:true,pause:true,finish:true,errors,screenshots:['screenshot-menu.png','screenshot-gameplay.png','screenshot-results.png']}));}finally{await browser.close();server.close()}
