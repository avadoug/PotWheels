const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[],checks=[];const ok=name=>{checks.push(name);console.log('PASS',name);};
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/?test=1');
  await page.waitForFunction(()=>PotWheelsApp.snapshot().imageLoaded);
  await page.screenshot({path:'tests/title-desktop.png',fullPage:true});
  assert.ok(await page.getByRole('button',{name:'LET’S ROLL'}).isVisible());ok('title and Chris artwork load');
  await page.getByRole('button',{name:'HOW TO PLAY',exact:true}).click();assert.ok(await page.getByText('A little street smarts.').isVisible());await page.getByRole('button',{name:'← BACK'}).click();
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.locator('[data-setting="shake"]').uncheck();await page.locator('[data-setting="muted"]').check();await page.getByRole('button',{name:'← BACK'}).click();ok('help and settings controls');
  await page.getByRole('button',{name:'LET’S ROLL'}).click();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).player.col,6);
  await page.keyboard.press('d');await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).player.col,7);ok('arrows and WASD');
  const before=await page.evaluate(()=>PotWheelsApp.snapshot().cars[0].x);await page.waitForTimeout(220);assert.notEqual(await page.evaluate(()=>PotWheelsApp.snapshot().cars[0].x),before);ok('moving traffic');
  await page.keyboard.press('p');const paused=await page.evaluate(()=>PotWheelsApp.snapshot());await page.waitForTimeout(150);assert.deepEqual((await page.evaluate(()=>PotWheelsApp.snapshot())).cars,paused.cars);await page.getByRole('button',{name:'KEEP ROLLING'}).click();ok('pause freezes traffic and resume works');
  // Controlled fixtures exercise hard-to-reproduce collisions and expiry in the real renderer.
  await page.evaluate(()=>{const g=PotWheelsApp.game;g.pickups=[{col:g.player.col,row:g.player.row,kind:'taxi'},{col:g.player.col,row:g.player.row,kind:'apollo'}];g.collect();});
  await page.keyboard.press('Space');await page.waitForTimeout(80);let snap=await page.evaluate(()=>PotWheelsApp.snapshot());assert.ok(snap.effects.taxi>0);const stopped=snap.cars[0].x;await page.waitForTimeout(120);assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).cars[0].x,stopped);
  await page.locator('#ability').click();snap=await page.evaluate(()=>PotWheelsApp.snapshot());assert.ok(snap.effects.apollo>0);assert.equal(snap.inventory.length,0);ok('both strain pickups, keyboard and button activation');
  await page.evaluate(()=>{const g=PotWheelsApp.game;g.effects.apollo=0;g.effects.taxi=0;g.invulnerable=0;g.player.x=g.cars[0].x;g.player.y=g.cars[0].y;});await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).lives,2);ok('actual collision removes one life');
  await page.waitForTimeout(1000);assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).player.row,11);ok('respawn');
  // Complete a crossing using the actual input handler, with shield fixture to isolate navigation.
  await page.evaluate(()=>{const g=PotWheelsApp.game;g.effects.apollo=30;});
  for(let i=0;i<11;i++){await page.keyboard.press('ArrowUp');await page.waitForTimeout(145);}
  await page.waitForFunction(()=>PotWheelsApp.snapshot().screen==='complete');assert.ok((await page.evaluate(()=>PotWheelsApp.snapshot())).score>1000);await page.getByRole('button',{name:'ONE MORE RUN'}).click();assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).level,2);ok('crossing, scoring, victory screen, next stage');
  await page.screenshot({path:'tests/playing-desktop.png',fullPage:true});
  await page.evaluate(()=>{const g=PotWheelsApp.game;g.lives=1;g.invulnerable=0;g.effects.apollo=0;g.hit();});await page.waitForFunction(()=>PotWheelsApp.snapshot().screen==='gameover');assert.ok(await page.getByRole('button',{name:'ROLL AGAIN'}).isVisible());await page.getByRole('button',{name:'ROLL AGAIN'}).click();assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).lives,3);await page.keyboard.press('r');assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).score,0);ok('game-over, restart button and R');
  await page.reload();assert.ok((await page.evaluate(()=>PotWheelsApp.snapshot())).saved.best>0);assert.equal((await page.evaluate(()=>PotWheelsApp.snapshot())).settings.shake,false);await page.getByRole('button',{name:'HIGH SCORES'}).click();assert.ok((await page.locator('.score-table tbody tr').count())>=1);ok('localStorage score and settings persistence');
  for(const viewport of [{width:1920,height:1080},{width:1024,height:768},{width:768,height:1024}]){await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}ok('desktop laptop and tablet widths');
  const mobile=await browser.newContext({...devices['iPhone 13'],defaultBrowserType:undefined});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto('http://localhost:4173');await phone.waitForFunction(()=>PotWheelsApp.snapshot().imageLoaded);await phone.screenshot({path:'tests/title-mobile.png',fullPage:true});
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.getByRole('button',{name:'LET’S ROLL'}).tap();await phone.locator('[data-move="left"]').tap();await phone.waitForTimeout(200);assert.equal((await phone.evaluate(()=>PotWheelsApp.snapshot())).player.col,6);await phone.locator('#touch-pause').tap();assert.equal((await phone.evaluate(()=>PotWheelsApp.snapshot())).screen,'paused');await phone.getByRole('button',{name:'KEEP ROLLING'}).tap();await phone.screenshot({path:'tests/playing-mobile.png',fullPage:true});ok('mobile touch move, pause, resume and responsive width');
  const offline=await context.newPage();await offline.goto('file:///'+path.resolve('index.html').replace(/\\/g,'/'));await offline.waitForFunction(()=>PotWheelsApp.snapshot().imageLoaded);await offline.getByRole('button',{name:'LET’S ROLL'}).click();assert.equal((await offline.evaluate(()=>PotWheelsApp.snapshot())).state,'playing');ok('direct file launch without a build or server');
  assert.deepEqual(errors,[]);ok('no fatal browser errors');
  require('node:fs').writeFileSync('tests/browser-results.json',JSON.stringify({checks,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
