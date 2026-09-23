/* Pot Wheels — presentation, inputs, synthesized audio, and local persistence. */
(() => {
  'use strict';
  const {Game,STRAINS,W,H,xFor,yFor}=PotWheels;
  const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d');
  document.querySelector('.cabinet').append(document.querySelector('.touch-controls'));
  const STORAGE='pot-wheels-v1';
  const defaults={muted:false,volume:.35,shake:true,flashes:true,contrast:false,music:true,skin:'auto'};
  let saved={best:0,highest:1,scores:[],achievements:[],skins:['Street stock'],settings:{...defaults}};
  let storageAvailable=true;
  try{const data=JSON.parse(localStorage.getItem(STORAGE)||'null');if(data&&typeof data==='object'){saved.best=Number(data.best)||0;saved.highest=Number(data.highest)||1;for(const key of ['scores','achievements','skins'])if(Array.isArray(data[key]))saved[key]=data[key];saved.settings={...defaults,...data.settings};}}catch{storageAvailable=false;}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){saved.settings.shake=false;saved.settings.flashes=false;}
  const settings=saved.settings;
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{storageAvailable=false;}}
  let game=new Game(), screen='loading', returnScreen='title', toastTime=0, shake=0, last=0, accumulator=0, musicTime=0, musicNote=0, recorded=false, keyBuffer='', held=null, heldTime=0;
  const particles=[],floaters=[],keys=new Set();
  const portrait=new Image();portrait.src='assets/chris.png';
  const jokes=['The cure can wait. The traffic cannot.','Humidity: 62%. Survival: negotiable.','No mids. No brakes. Some regrets.','The chair has better rims than that taxi.','Trim jail had fewer moving parts.','A keeper pheno deserves a keeper wheelman.','Check both ways. Then check the terp profile.','The pH is perfect. The parking is terrible.','Carbon filter? This commute needs a traffic filter.','Respect the crosswalk. Fear the wheelman.'];
  let jokeIndex=Math.floor(Math.random()*jokes.length);
  const chairNames=['Street stock','Chrome rollers','Flame kit','Big rims','Grow-light glow','Spoiler alert','Turbo exhaust','Apollo boosters','Gold throne','Pot Wheels war machine'];
  let audio=null,master=null;
  function wakeAudio(){try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.connect(audio.destination);}if(audio.state==='suspended')audio.resume();master.gain.value=settings.muted?0:settings.volume;}catch{}}
  function tone(freq,duration=.08,type='square',gain=.08,delay=0,end=null){if(!audio||settings.muted)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02);}
  function sound(name){if(name==='move')tone(160,.035,'triangle',.06);if(name==='collect'){tone(660,.12,'sine',.16);tone(990,.15,'sine',.1,.06);}if(name==='near'){tone(520,.07);tone(780,.1,'square',.08,.07);}if(name==='power'){[261,392,523,784].forEach((f,i)=>tone(f,.2,'sawtooth',.045,i*.07));}if(name==='crash'){tone(110,.4,'sawtooth',.2,0,25);tone(48,.25,'square',.16);}if(name==='complete'){[523,659,784,1046].forEach((f,i)=>tone(f,.3,'square',.09,i*.12));}if(name==='gameover'){[330,294,220,110].forEach((f,i)=>tone(f,.3,'triangle',.15,i*.15));}if(name==='event'){tone(196,.25,'sawtooth',.08);tone(294,.3,'sawtooth',.06,.25);}}
  function applySettings(){document.body.classList.toggle('contrast',settings.contrast);document.body.classList.toggle('no-motion',!settings.flashes);$('sound').textContent=settings.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-label',settings.muted?'Unmute sound':'Mute sound');if(master)master.gain.value=settings.muted?0:settings.volume;save();}
  function toast(text,seconds=2.3){$('toast').textContent=text;$('toast').classList.add('visible');toastTime=seconds;}
  function burst(x,y,color,n=18){for(let i=0;i<n&&particles.length<180;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*145;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.7,max:1.2,color,size:2+Math.random()*4});}}
  function processEvents(){for(const e of game.events.splice(0)){
    if(e.type==='move')sound('move');
    if(e.type==='score'){if(e.points>=60)floaters.push({x:e.x,y:e.y,text:'+'+e.points,life:1,color:e.label==='CLOSE CALL'?'#edc36e':'#d6f899'});saved.best=Math.max(saved.best,game.score);}
    if(e.type==='collect'){sound('collect');burst(e.x,e.y,STRAINS[e.kind]?.color||'#c2ed79');if(STRAINS[e.kind])toast(STRAINS[e.kind].name+' in the stash · SPACE to use');}
    if(e.type==='power'){sound('power');burst(game.player.x,game.player.y,STRAINS[e.kind].color,35);toast(e.kind==='taxi'?'DIRTY TAXI · Your right of way.':'APOLLO 13 · Houston, we have no brakes.');}
    if(e.type==='near'){sound('near');toast(['CHAIR FORCE ONE!','THREAD THE NEEDLE!','TERPS SAVED!','NICE ROLL!'][game.stats.close%4],1.4);}
    if(e.type==='crash'){sound('crash');shake=settings.shake?10:0;burst(e.x,e.y,'#edc36e',36);toast(['NOT THE TERPS!','That was a very expensive pothole.','Chair: scratched. Dignity: intact.'][game.lives%3],2);}
    if(e.type==='achievement'&&!saved.achievements.includes(e.name)){saved.achievements.push(e.name);save();setAchievement(e.name);}
    if(e.type==='complete'){sound('complete');burst(game.player.x,100,'#edc36e',70);saveProgress();show('complete');}
    if(e.type==='gameover'){sound('gameover');recordScore();show('gameover');}
    if(e.type==='event'){sound('event');toast(e.name+' · '+e.detail,3.7);}
    if(e.type==='start'){toast('RUN '+String(game.level).padStart(2,'0')+' · '+game.stage.toUpperCase(),2);$('status').textContent=jokes[(jokeIndex++)%jokes.length];}
    if(e.type==='life')toast('KEEPER BONUS · One chair repair on the house.');
  }
    for(let i=1;i<=game.chairLevel;i++)if(!saved.skins.includes(chairNames[i-1])){saved.skins.push(chairNames[i-1]);toast('CHAIR UPGRADE · '+chairNames[i-1]);save();}
  }
  let achievementTime=0,achievement='';
  function setAchievement(name){achievement=name;achievementTime=3.5;}
  function saveProgress(){saved.best=Math.max(saved.best,game.score);saved.highest=Math.max(saved.highest,game.level);save();}
  function recordScore(){if(recorded)return;recorded=true;saveProgress();saved.scores.push({score:game.score,level:game.level,date:new Date().toLocaleDateString()});saved.scores.sort((a,b)=>b.score-a.score);saved.scores=saved.scores.slice(0,7);save();}
  function start(){wakeAudio();game.start();recorded=false;particles.length=0;floaters.length=0;keys.clear();held=null;show('playing');canvas.focus();}
  const backButton=()=>'<button class="secondary" data-action="back">← BACK</button>';
  function show(name){screen=name;const overlay=$('overlay');overlay.classList.toggle('hidden',name==='playing');overlay.classList.toggle('detail-modal',['how','settings','scores','about'].includes(name));overlay.scrollTop=0;$('pause').disabled=!['playing','paused'].includes(name);$('pause').textContent=name==='paused'?'▶':'Ⅱ';
    if(name==='playing'){overlay.innerHTML='';return;}
    if(name==='title'){game.state='title';overlay.innerHTML=`<div class="menu title-menu"><img class="hero" src="assets/chris.png" alt="Chris, with his long sandy beard, in a lime-green custom wheelchair"><div class="eyebrow">CHRIS HAS PLACES TO BE.</div><h2>POT<br>WHEELS</h2><div class="subtitle">THE DISPENSARY RUN</div><p>Premium flower.<br>Unreasonable traffic.<br>One absolute wheelman.</p><button class="primary" data-action="play">LET’S ROLL &nbsp; ↗</button><div class="menu-links"><button data-action="how">HOW TO PLAY</button><button data-action="scores">HIGH SCORES</button><button data-action="settings">SETTINGS</button><button data-action="about">ABOUT POT WHEELS</button></div></div>`;}
    if(name==='paused')overlay.innerHTML=`<div class="menu"><div class="eyebrow">PARKED. NOT DEFEATED.</div><h3>Taking a terp break.</h3><p>Traffic is on hold. Your run will be right here.</p><div class="menu-actions"><button class="primary" data-action="resume">KEEP ROLLING ↗</button><button class="secondary" data-action="settings">SETTINGS</button><button class="secondary" data-action="play">RESTART</button><button class="secondary" data-action="menu">MAIN MENU</button></div></div>`;
    if(name==='how')overlay.innerHTML=`<div class="menu"><div class="eyebrow">THE FIELD GUIDE</div><h3>A little street smarts.</h3><ol><li><b>Roll to the glowing dispensary at the top.</b> Arrow keys or WASD move one space. Hold to keep rolling.</li><li><b>Watch the gaps.</b> Green medians are safe. Upper medians become crash checkpoints.</li><li><b>Pick up DT and A13 jars.</b> Press Space or USE STRAIN to use the oldest jar in your two-slot stash.</li><li><b>Dirty Taxi</b> stops traffic for 4.5s. <b>Apollo 13</b> protects you for 5s. Time keeps ticking while you move!</li><li>Seed packs score 120; terp jars 60; strain jars 100. Close calls build combos up to ×5. Cross fast for bonus points.</li><li><b>P / Escape</b> pauses. <b>R</b> restarts. Three lives; earn a repair every third crossing. Touch arrows work too.</li></ol><p>Tip: Grab the first strain jar on the median above the first lane. Need a cosmic secret? Type APOLLO13.</p>${backButton()}</div>`;
    if(name==='settings'){overlay.innerHTML=`<div class="menu"><div class="eyebrow">YOUR RIDE, YOUR RULES</div><h3>Fine-tune the chair.</h3><label class="setting">Master volume <input id="volume" type="range" min="0" max="1" step=".05" value="${settings.volume}"></label>${[['muted','Mute all audio'],['music','Arcade music'],['shake','Screen shake'],['flashes','Animated glows & effects'],['contrast','High-contrast interface']].map(([key,label])=>`<label class="setting">${label}<input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`).join('')}<label class="setting">Chair style <select id="skin"><option value="auto">Auto upgrades</option>${chairNames.filter(n=>saved.skins.includes(n)).map(n=>`<option value="${chairNames.indexOf(n)+1}" ${String(settings.skin)===String(chairNames.indexOf(n)+1)?'selected':''}>${n}</option>`).join('')}</select></label><p>Preferences save on this device.${storageAvailable?'':' Storage is unavailable; this session still works.'}</p>${backButton()}</div>`;}
    if(name==='scores')overlay.innerHTML=`<div class="menu"><div class="eyebrow">LOCAL LEGENDS</div><h3>The high rollers.</h3><p>Personal best: <b>${saved.best.toLocaleString()}</b> · Furthest run: ${saved.highest}</p><table class="score-table"><thead><tr><th>RANK</th><th>SCORE</th><th>RUN</th><th>DATE</th></tr></thead><tbody>${saved.scores.length?saved.scores.map((s,i)=>`<tr><td>0${i+1}</td><td>${Number(s.score).toLocaleString()}</td><td>${Number(s.level)}</td><td>${String(s.date).replace(/[<>&"']/g,'')}</td></tr>`).join(''):'<tr><td colspan="4">Your first legendary commute goes here.</td></tr>'}</tbody></table><p>BADGES · ${saved.achievements.length}</p><div class="achievement-list">${saved.achievements.filter(a=>typeof a==='string').map(a=>a.replace(/[<>&"']/g,'')).join(' · ')||'Take your first roll to earn a badge.'}</div><div class="menu-actions">${backButton()}</div></div>`;
    if(name==='about')overlay.innerHTML=`<div class="menu"><div class="eyebrow">MEET THE WHEELMAN</div><h3>Chris. AKA Pot Wheels.</h3><p>Grower. Smoker. Terp hunter. Wheelman.</p><p>Known in this fictional arcade universe for premium flower, questionable traffic decisions, and a strict zero-mids policy. His wheelchair has a better upgrade path than most sports cars.</p><p>Inspired by your photo of Chris. Dirty Taxi and Apollo 13 come from your game brief. Their powers are arcade fiction.</p><p>Original art, roads, synthesized music and sound. No accounts. No ads. Just one increasingly unreasonable commute.</p>${backButton()}</div>`;
    if(name==='complete')overlay.innerHTML=`<div class="menu"><div class="eyebrow">THE TERP TEMPLE WELCOMES YOU</div><h3>Terps secured.</h3><p>“We saved the keeper pheno for you, Chris.”</p><div class="stats"><div>SCORE<b>${game.score.toLocaleString()}</b></div><div>CROSSING TIME<b>${game.elapsed.toFixed(1)}s</b></div><div>NEXT RUN<b>${String(game.level+1).padStart(2,'0')}</b></div></div><p>${game.level%3===0?'The growmies repaired your chair. One life restored (up to five).':'The flower is excellent. The next street is worse.'}</p><button class="primary" data-action="next">ONE MORE RUN ↗</button><div class="menu-actions"><button class="text-button" data-action="menu">Call it a day · Main menu</button></div></div>`;
    if(name==='gameover')overlay.innerHTML=`<div class="menu"><div class="eyebrow">POT WHEELS: TEMPORARILY DECOMMISSIONED</div><h3>Not the terps.</h3><p>The chair needs a tune-up. The legend does not.</p><div class="stats"><div>SCORE<b>${game.score.toLocaleString()}</b></div><div>BEST<b>${saved.best.toLocaleString()}</b></div><div>RUN REACHED<b>${game.level}</b></div></div><p>${game.stats.jars} finds · ${game.stats.close} close calls · ${game.stats.crossings} successful crossings</p><div class="menu-actions"><button class="primary" data-action="play">ROLL AGAIN ↗</button><button class="secondary" data-action="menu">MAIN MENU</button></div></div>`;
    const focus=overlay.querySelector('button');if(focus)focus.focus({preventScroll:true});
  }
  function subMenu(name){returnScreen=screen;if(screen==='playing'){game.pause();returnScreen='paused';}keys.clear();held=null;show(name);}
  function togglePause(){keys.clear();held=null;if(screen==='playing'){game.pause();show('paused');}else if(screen==='paused'){game.pause();show('playing');canvas.focus();}}
  $('overlay').addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;wakeAudio();
    if(action==='play')start();else if(action==='resume')togglePause();else if(action==='next'){game.nextLevel();show('playing');canvas.focus();}else if(action==='menu'){if(game.score>0)recordScore();show('title');}else if(action==='back')show(returnScreen);else subMenu(action);
  });
  $('overlay').addEventListener('input',e=>{if(e.target.id==='volume')settings.volume=Number(e.target.value);if(e.target.dataset.setting)settings[e.target.dataset.setting]=e.target.checked;if(e.target.id==='skin')settings.skin=e.target.value;applySettings();wakeAudio();});
  $('sound').onclick=()=>{settings.muted=!settings.muted;wakeAudio();applySettings();};$('pause').onclick=togglePause;$('touch-pause').onclick=togglePause;
  $('ability').onclick=$('touch-power').onclick=()=>{wakeAudio();game.activate();};$('help').onclick=()=>subMenu('how');$('about').onclick=()=>subMenu('about');$('brand').onclick=e=>{e.preventDefault();if(screen==='playing')togglePause();else if(screen==='title')canvas.focus();else{if(game.score>0)recordScore();show('title');}};
  const directions={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  window.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    const key=e.key.length===1?e.key.toLowerCase():e.key;
    if(directions[key]||[' ','Escape','p','r'].includes(key))e.preventDefault();
    if(e.repeat)return;
    if(e.key.length===1){keyBuffer=(keyBuffer+e.key.toUpperCase()).slice(-16);for(const code of ['APOLLO13','DIRTYTAXI','POTWHEELS','420'])if(keyBuffer.endsWith(code)){if(code==='POTWHEELS'){game.skinOverride=true;if(!saved.skins.includes(chairNames[9]))saved.skins.push(chairNames[9]);save();toast('WAR MACHINE UNLOCKED · Subtlety sold separately.');}else if(code==='APOLLO13'){game.effects.apollo=13;toast('APOLLO 13 · Cosmic clearance granted.');}else game.startEvent(code==='420'?'420':'taxi');keyBuffer='';}}
    if(key==='p'||key==='Escape'){if(screen==='playing'||screen==='paused')togglePause();else if(!['title','complete','gameover'].includes(screen))show(returnScreen);return;}
    if(key==='r'&&['playing','paused','gameover'].includes(screen)){start();return;}
    if(key==='Enter'&&screen==='complete'){game.nextLevel();show('playing');return;}
    if(key===' '&&screen==='playing'){wakeAudio();game.activate();return;}
    if(directions[key]&&screen==='playing'){keys.add(key);held=key;heldTime=.17;game.movePlayer(...directions[key]);}
  });
  window.addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;keys.delete(key);if(held===key){held=Array.from(keys).pop()||null;heldTime=0;}});
  document.querySelectorAll('[data-move]').forEach(b=>{const map={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};b.addEventListener('pointerdown',e=>{e.preventDefault();wakeAudio();b.setPointerCapture(e.pointerId);held=map[b.dataset.move];heldTime=.18;if(screen==='playing')game.movePlayer(...directions[held]);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{held=null;});});
  window.addEventListener('blur',()=>{keys.clear();held=null;if(screen==='playing')togglePause();saveProgress();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='playing')togglePause();});window.addEventListener('pagehide',saveProgress);
  function rr(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function text(str,x,y,size=12,color='#dee4ce',align='center',font='monospace'){ctx.fillStyle=color;ctx.font=`bold ${size}px ${font}`;ctx.textAlign=align;ctx.fillText(str,x,y);}
  function leaf(x,y,size,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;for(let i=-2;i<=2;i++){ctx.save();ctx.rotate(i*.42);ctx.beginPath();ctx.ellipse(0,-size*.4,size*.15,size*.55,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillRect(-1,0,2,size*.4);ctx.restore();}
  const background=document.createElement('canvas');background.width=W;background.height=H;const back=background.getContext('2d');
  function makeBackground(){const original=ctx; // Cache static asphalt detail separately to keep the frame loop light.
    back.fillStyle='#303c34';back.fillRect(0,0,W,H);
    let seed=42;for(let i=0;i<4500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%W;seed=(seed*1664525+1013904223)>>>0;const y=seed%H;back.fillStyle=i%2?'#ffffff05':'#00000012';back.fillRect(x,y,2,2);}
  }makeBackground();
  function drawWorld(){ctx.drawImage(background,0,0);const lanes=new Set(game.lanes.map(l=>l.row));
    for(let r=0;r<12;r++){const y=yFor(r)-25;if(lanes.has(r)){rr(0,y,W,50,0,r%2?'#242c2af2':'#28302cf2');ctx.strokeStyle='#75807355';ctx.lineWidth=2;ctx.setLineDash([23,24]);ctx.beginPath();ctx.moveTo(0,y+49);ctx.lineTo(W,y+49);ctx.stroke();ctx.setLineDash([]);const lane=game.lanes.find(l=>l.row===r);text(lane.dir>0?'→':'←',25,y+29,17,'#657368');text(lane.dir>0?'→':'←',875,y+29,17,'#657368');}
      else{rr(0,y,W,50,0,r===0?'#657257':'#4d6449');rr(0,y,W,5,0,'#99a67a');rr(0,y+45,W,5,0,'#293d30');for(let x=0;x<W;x+=60){ctx.fillStyle='#1a372324';ctx.fillRect(x,y+7,1,36);}if(r===3||r===6||r===9){for(const x of [24,876]){rr(x-10,y+14,20,25,4,'#293e2e');leaf(x,y+23,16,'#77915a');}text(r===6?'KEEPER LANE  ·  SAFE MEDIAN':r===3?'TRICHOME TRAIL':'TERPENE TURNPIKE',160,y+30,9,'#d1d6ac');if(game.checkpoint===r)text('CHECKPOINT ✓',755,y+30,10,'#d5f1a6');}}
    }
    // A glowing storefront, plus little grow-room windows.
    rr(0,0,W,81,0,'#1a2821');for(let x=25;x<W;x+=112){rr(x,11,84,50,3,'#314635');for(let j=0;j<3;j++){rr(x+9+j*23,29,15,23,2,'#c1ba6c66');rr(x+9+j*23,26,15,4,1,'#bccc9c');leaf(x+17+j*23,41,5,'#b5cb79');}}
    rr(265,0,370,76,0,'#1e3225');ctx.save();if(settings.flashes){ctx.shadowColor='#b3ff73';ctx.shadowBlur=13;}text('THE TERP TEMPLE',450,34,25,'#d1f8a4');ctx.restore();text('PREMIUM FLOWER. LEGENDARY ARRIVALS.',450,53,8,'#afbe98');rr(696,12,105,33,4,'#1b3326');text('OPEN 4:20',748,34,14,'#e2c782');
    for(let x=352;x<560;x+=27)rr(x,80,15,25,0,'#e1dba078');if(game.state==='complete'){const g=ctx.createLinearGradient(0,65,0,230);g.addColorStop(0,'#ffe09088');g.addColorStop(1,'#ffe09000');ctx.fillStyle=g;ctx.fillRect(310,64,280,166);}
    text('ROLL OUT ↑',450,704,11,'#c6d6b5');text('NO MIDS • NO PARKING',120,703,9,'#a4b398');text('CHAIR FORCE ONE',780,703,9,'#a4b398');
  }
  function drawCar(c){ctx.save();ctx.translate(c.x,c.y);if(c.dir<0)ctx.scale(-1,1);let color=c.color,label=c.label;
    if(game.event?.name==='taxi'){color='#e4be56';label='DIRTY TAXI';}
    rr(-c.w/2+3,-16,c.w,37,7,'#0006');rr(-c.w/2+10,-22,19,8,3,'#101613');rr(c.w/2-29,-22,19,8,3,'#101613');rr(-c.w/2+10,14,19,8,3,'#101613');rr(c.w/2-29,14,19,8,3,'#101613');
    rr(-c.w/2,-17,c.w,34,6,color);rr(-c.w/2+5,-13,c.w-10,6,3,'#ffffff29');rr(c.w/2-30,-13,17,26,3,'#253b39');rr(-c.w/2+15,-13,12,26,2,'#304843');rr(-c.w/2+31,-13,Math.max(9,c.w-64),26,3,color);rr(c.w/2-3,-12,4,8,1,'#fff1b0');rr(c.w/2-3,5,4,8,1,'#fff1b0');rr(-c.w/2,-12,3,7,1,'#df775e');rr(-c.w/2,5,3,7,1,'#df775e');
    if(c.name==='police'&&!game.event){rr(-5,-13,8,26,1,'#4e6063');rr(-4,-12,6,11,1,'#7696da');rr(-4,1,6,11,1,'#da7870');}
    if(c.name==='pickup'){rr(-c.w/2+7,-12,28,24,2,'#6c6b58');rr(-c.w/2+12,-8,16,16,2,'#8d9965');}
    if(c.name==='tractor'){rr(-c.w/2+8,-25,28,12,3,'#131b15');rr(-c.w/2+8,13,28,12,3,'#131b15');}
    if(label){if(c.dir<0)ctx.scale(-1,1);text(label,0,3,label.length>8?7:8,'#253229');}
    ctx.restore();if(game.effects.taxi>0){text('Ⅱ',c.x,c.y-24,11,'#edc36e');}
  }
  function drawPickup(item){if(item.collected)return;const x=xFor(item.col),y=yFor(item.row),s=STRAINS[item.kind];ctx.save();ctx.translate(x,y+(settings.flashes?Math.sin(game.time*3+item.col)*2:0));
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(0,14,14,5,0,0,Math.PI*2);ctx.fill();
    if(s){if(settings.flashes){ctx.shadowColor=s.color;ctx.shadowBlur=12;}rr(-13,-15,26,30,5,s.color);ctx.shadowBlur=0;rr(-11,-19,22,7,2,'#e1dfc0');rr(-10,-6,20,16,2,'#24352c');text(s.code,0,5,10,s.color);}
    else if(item.kind==='seed'){rr(-11,-15,22,29,2,'#d9c591');leaf(0,-1,9,'#66773e');text('SEED',0,11,5,'#354a2f');}
    else {rr(-10,-12,20,25,4,'#b0cb9877');rr(-10,-16,20,5,2,'#dfd4a8');leaf(0,2,10,'#c5eb84');}
    ctx.restore();}
  function drawPlayer(){const p=game.player;if(game.deathTimer>0&&game.state!=='gameover'&&Math.floor(game.time*15)%2)return;ctx.save();ctx.translate(p.x,p.y);let upgrade=settings.skin==='auto'?game.chairLevel:Number(settings.skin);if(game.skinOverride)upgrade=10;
    const hop=game.move?Math.sin(game.move.progress*Math.PI)*5:0;
    ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,12,23,9,0,0,Math.PI*2);ctx.fill();
    if(game.invulnerable>0||game.effects.apollo>0){ctx.strokeStyle=game.effects.apollo>0?'#d8b9ff':'#d4efa3';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,-9,30,38,0,0,Math.PI*2);ctx.stroke();if(settings.flashes){ctx.fillStyle='#ba8af322';ctx.fill();}}
    if(upgrade>=5){ctx.fillStyle=upgrade>=9?'#eec16b66':'#b58be855';ctx.beginPath();ctx.ellipse(0,12,29,11,0,0,Math.PI*2);ctx.fill();}
    if(upgrade>=3&&game.move){for(const x of [-16,16]){ctx.fillStyle=upgrade>=8?'#b994fa':'#e9aa63';ctx.beginPath();ctx.moveTo(x-5,10);ctx.lineTo(x,35+Math.random()*7);ctx.lineTo(x+5,10);ctx.fill();}}
    if(game.state==='complete')ctx.rotate(Math.sin(game.time*8)*.13);if(game.deathTimer>0)ctx.rotate(.45);
    if(portrait.complete&&portrait.naturalWidth)ctx.drawImage(portrait,-24,-53-hop,48,72);
    else {rr(-19,-8,38,25,5,'#c1e786');rr(-12,-28,24,29,3,'#eeeadd');ctx.fillStyle='#dcab87';ctx.beginPath();ctx.arc(0,-34,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ae8e6a';ctx.beginPath();ctx.moveTo(-11,-29);ctx.lineTo(0,-7);ctx.lineTo(11,-29);ctx.fill();}
    if(upgrade>=2){ctx.strokeStyle=upgrade>=9?'#ffd471':'#e5ebdc';ctx.lineWidth=upgrade>=4?3:1.5;for(const x of [-21,21]){ctx.beginPath();ctx.ellipse(x,2,4,13,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,2);ctx.lineTo(x+Math.sin(game.time*12)*4,2+Math.cos(game.time*12)*12);ctx.stroke();}}
    if(upgrade>=6){rr(-24,14,48,4,1,upgrade>=9?'#eec16b':'#a2c76c');}if(upgrade===10){rr(-31,-8,8,27,3,'#d9bc66');rr(23,-8,8,27,3,'#d9bc66');}
    ctx.restore();text('CHRIS',p.x,p.y+31,8,'#edf6d5');
  }
  function render(){ctx.save();if(shake>0&&settings.shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawWorld();for(const p of game.pickups)drawPickup(p);for(const c of game.cars)drawCar(c);drawPlayer();
    if(game.effects.taxi>0){const y=game.player.y;rr(18,y-19,65,38,5,'#edc36e');text('DIRTY',50,y-3,10,'#283527');text('TAXI',50,y+10,10,'#283527');ctx.strokeStyle='#edc36e88';ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(92,y);ctx.lineTo(game.player.x-36,y);ctx.stroke();ctx.setLineDash([]);}
    if((game.mode420>0||game.effects.apollo>0)&&settings.flashes){ctx.strokeStyle=game.mode420>0?'#b7f083':'#c7a1ff';ctx.lineWidth=7;ctx.strokeRect(4,4,W-8,H-8);for(let i=0;i<14;i++){const x=(i*137+game.time*12)%W,y=(i*79+game.time*6)%H;text('✦',x,y,12,'#ccb5f5');}}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);rr(p.x,p.y,p.size,p.size,1,p.color);}ctx.globalAlpha=1;
    for(const f of floaters){ctx.globalAlpha=Math.max(0,f.life);text(f.text,f.x,f.y,16,f.color);}ctx.globalAlpha=1;
    if(achievementTime>0){rr(290,674,320,33,5,'#17281feb');text('★ '+achievement,450,695,11,'#e8d793');}
    ctx.restore();
  }
  function updateHud(){const pad=n=>String(n).padStart(6,'0');$('score').textContent=pad(game.score);$('best').textContent=pad(saved.best);$('level').textContent=String(game.level).padStart(2,'0');$('lives').textContent='♥ '.repeat(Math.max(0,game.lives)).trim()||'—';$('lives').setAttribute('aria-label',game.lives+' lives');$('combo').textContent='×'+game.multiplier;$('stage').textContent=game.stage.toUpperCase();$('stash-count').textContent=game.inventory.length+' / 2';
    const s=STRAINS[game.inventory[0]];$('ability-name').textContent=s?s.name.toUpperCase():'EMPTY POCKETS';$('ability-description').textContent=s?s.description:'Find a strain jar on the road';$('ability').disabled=!s||screen!=='playing';$('touch-power').disabled=!s||screen!=='playing';$('touch-power').querySelector('small').textContent=s?s.name.toUpperCase():'USE STRAIN';
    const active=Object.entries(game.effects).filter(([,t])=>t>0).map(([k,t])=>STRAINS[k].name+' '+t.toFixed(1)+'s');if(game.mode420>0)active.push('4:20 ×2 '+game.mode420.toFixed(1)+'s');$('effect').textContent=active.join(' · ')||(game.inventory.length===2?'Next: '+STRAINS[game.inventory[1]].name:'No strain active');
  }
  let hudClock=0;
  function frame(stamp){const dt=Math.min((stamp-last)/1000||0,.05);last=stamp;accumulator+=dt;
    while(accumulator>=1/120){if(held&&screen==='playing'){heldTime-=1/120;if(heldTime<=0){if(game.movePlayer(...directions[held]))heldTime=.13;}}
      game.update(1/120);accumulator-=1/120;}
    processEvents();
    if(screen==='playing'||screen==='title'||screen==='gameover'||screen==='complete'){
      for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;if(p.life<=0)particles.splice(i,1);}for(let i=floaters.length-1;i>=0;i--){floaters[i].life-=dt;floaters[i].y-=25*dt;if(floaters[i].life<=0)floaters.splice(i,1);}}
    toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');achievementTime-=dt;shake=Math.max(0,shake-dt*24);
    if(screen==='playing'&&settings.music){musicTime-=dt;if(musicTime<=0){musicTime=game.mode420>0?.16:.25;const melody=[130.81,0,164.81,196,0,164.81,146.83,0,110,0,146.83,174.61,0,146.83,196,0];const note=melody[musicNote++%melody.length];if(note)tone(note*(game.mode420>0?2:1),.13,'triangle',.045);}}
    hudClock+=dt;if(hudClock>.075){updateHud();hudClock=0;}render();requestAnimationFrame(frame);
  }
  // Exposed read-only snapshot for QA; mutations are available only in explicit test mode.
  window.PotWheelsApp={snapshot:()=>({state:game.state,screen,score:game.score,level:game.level,lives:game.lives,player:{...game.player},inventory:[...game.inventory],effects:{...game.effects},cars:game.cars.map(c=>({x:c.x,y:c.y,w:c.w})),pickups:game.pickups.map(p=>({...p})),stats:{...game.stats},settings:{...settings},saved:JSON.parse(JSON.stringify(saved)),imageLoaded:portrait.complete&&portrait.naturalWidth>0})};
  if(new URLSearchParams(location.search).has('test'))Object.assign(window.PotWheelsApp,{get game(){return game;},step:dt=>game.update(dt)});
  applySettings();show('title');updateHud();requestAnimationFrame(frame);
})();
