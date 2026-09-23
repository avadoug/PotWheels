/* Deterministic game rules, independent of drawing, sound, and the DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PotWheels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 900, H = 720, COLS = 15, STEP = 60, ROW = 50, TOP = 108;
  const STAGES = ['Quick Run','Rush Hour','Trim Jail Escape','Dirty Taxi District','Terp Traffic','Harvest Weekend','Dispensary Grand Opening'];
  const STRAINS = {
    taxi: {name:'Dirty Taxi',code:'DT',color:'#edc36e',duration:4.5,description:'Traffic stops for 4.5 seconds'},
    apollo: {name:'Apollo 13',code:'A13',color:'#c7a1ff',duration:5,description:'Cosmic shield for 5 seconds'}
  };
  const VEHICLES = [
    {name:'sedan',w:83,color:'#abc9b3'}, {name:'pickup',w:106,color:'#b9a085'},
    {name:'van',w:118,color:'#b7c880',label:'CLONE CO.'}, {name:'sports',w:74,color:'#dc8b6e'},
    {name:'taxi',w:94,color:'#e4be56',label:'DIRTY TAXI'}, {name:'bus',w:151,color:'#b7a5d2',label:'TRIM JAIL'},
    {name:'police',w:90,color:'#d9dfd3',label:'TERP PATROL'}, {name:'tractor',w:97,color:'#87aa67'},
    {name:'limo',w:155,color:'#8b9aaf',label:'PHENO VIP'}, {name:'pizza',w:82,color:'#cf887e',label:'MUNCHIES'},
    {name:'tiny',w:53,color:'#dcb7d1'}, {name:'monster',w:122,color:'#a1bece'}
  ];
  function rng(seed) {return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const xFor=c=>c*STEP+STEP/2, yFor=r=>TOP+r*ROW;
  class Game {
    constructor(seed=Date.now()) {this.random=rng(seed);this.state='title';this.events=[];this.time=0;this.score=0;this.level=1;this.lives=3;this.combo=1;this.inventory=[];this.effects={taxi:0,apollo:0};this.mode420=0;this.event=null;this.skinOverride=false;this.stats={jars:0,close:0,crossings:0};this.earned=new Set();this.makeLevel();}
    emit(type,data={}) {this.events.push({type,...data});}
    start() {this.score=0;this.level=1;this.lives=3;this.combo=1;this.comboTime=0;this.inventory=[];this.effects={taxi:0,apollo:0};this.mode420=0;this.event=null;this.time=0;this.stats={jars:0,close:0,crossings:0};this.earned.clear();this.events=[];this.state='playing';this.makeLevel();this.achievement('FIRST ROLL');this.emit('start');}
    achievement(name) {if(!this.earned.has(name)){this.earned.add(name);this.emit('achievement',{name});}}
    makeLevel() {
      this.elapsed=0;this.bestRow=11;this.checkpoint=11;this.move=null;this.moveCooldown=0;this.deathTimer=0;this.invulnerable=.4;this.comboTime=0;
      this.player={col:7,row:11,x:xFor(7),y:yFor(11)};
      this.lanes=[];this.cars=[];this.pickups=[];this.effects={taxi:0,apollo:0};this.event=null;this.eventAt=(this.level===1?14:5)+this.random()*5;this.mode420=0;
      const rows=this.level===1?[1,2,4,5,8,10]:[1,2,4,5,7,8,10];
      for(const [i,row] of rows.entries()) {
        const dir=i%2?1:-1;
        const speed=(49+(i%3)*16+Math.min(this.level-1,12)*9)*(row===10?.86:1);
        // A fixed lane velocity prevents overtaking and preserves intentional gaps.
        const gap=Math.max(125,220-this.level*7)+(i%2)*30;
        const lane={row,dir,speed,cars:[],gap};
        let px=-220+this.random()*160;
        while(px<W+200){const car=this.createCar(lane,px);lane.cars.push(car);this.cars.push(car);px+=car.w+gap+this.random()*50;}
        this.lanes.push(lane);
      }
      this.pickups.push({id:'starter',col:7,row:9,kind:this.level%2?'taxi':'apollo'}, {id:'median',col:5+Math.floor(this.random()*5),row:6,kind:this.level%2?'apollo':'taxi'});
      for(let i=0;i<6;i++) {const row=[10,8,7,5,4,2][i],col=2+Math.floor(this.random()*11);this.pickups.push({id:'loot'+i,col,row,kind:i%3===0?'seed':'jar'});}
      if(this.level%3===0)this.pickups.push({id:'rare',col:12,row:3,kind:'apollo'});
    }
    createCar(lane,x) {let n=Math.floor(this.random()*VEHICLES.length);if(this.level<3)n%=6;if(this.level===4&&this.random()<.5)n=4;if(this.level===6&&this.random()<.5)n=2;
      const type=VEHICLES[n];return {...type,x,y:yFor(lane.row),row:lane.row,dir:lane.dir,speed:lane.speed,near:false,passed:false,id:this.random()};}
    get multiplier(){return this.combo*(this.mode420>0?2:1);}
    get chairLevel(){return this.skinOverride?10:Math.min(10,1+Math.floor(this.score/1800));}
    get stage(){return STAGES[this.level-1]||'Endless / '+(this.level-7);}
    addScore(base,label,x=this.player.x,y=this.player.y) {const points=Math.round(base*this.multiplier);this.score+=points;this.emit('score',{points,label,x,y});}
    bumpCombo(){this.combo=Math.min(5,this.combo+1);this.comboTime=5;if(this.combo===5)this.achievement('ABSOLUTE MENACE');}
    movePlayer(dx,dy) {
      if(this.state!=='playing'||this.move||this.moveCooldown>0||this.deathTimer>0)return false;
      const p=this.player,col=clamp(p.col+dx,0,COLS-1),row=clamp(p.row+dy,0,11);
      if(col===p.col&&row===p.row)return false;
      this.move={fromX:p.x,fromY:p.y,toX:xFor(col),toY:yFor(row),progress:0,duration:this.mode420>0?.065:.095};
      p.col=col;p.row=row;this.emit('move');return true;
    }
    activate(){if(this.state!=='playing'||this.deathTimer>0||!this.inventory.length)return false;
      const kind=this.inventory.shift(),s=STRAINS[kind];this.effects[kind]=s.duration;
      this.emit('power',{kind,name:s.name});this.achievement(s.name.toUpperCase());return true;
    }
    pause(){if(this.state==='playing'){this.state='paused';return true;}if(this.state==='paused'){this.state='playing';return true;}return false;}
    hit(){if(this.state!=='playing'||this.deathTimer>0||this.invulnerable>0||this.effects.apollo>0)return false;
      this.lives--;this.combo=1;this.comboTime=0;this.move=null;this.effects={taxi:0,apollo:0};this.deathTimer=.85;
      this.emit('crash',{x:this.player.x,y:this.player.y});
      if(this.lives<=0){this.state='gameover';this.emit('gameover');}return true;
    }
    collect(){for(const item of this.pickups){if(item.col!==this.player.col||item.row!==this.player.row||item.collected)continue;
      if(STRAINS[item.kind]&&this.inventory.length>=2)continue;
      item.collected=true;this.stats.jars++;if(STRAINS[item.kind])this.inventory.push(item.kind);
      this.addScore(item.kind==='seed'?120:STRAINS[item.kind]?100:60,STRAINS[item.kind]?STRAINS[item.kind].name:'TERPS +');
      this.bumpCombo();this.emit('collect',{kind:item.kind,x:this.player.x,y:this.player.y});
      if(this.stats.jars>=10)this.achievement('KEEPER PHENO');
    }}
    complete(){if(this.state!=='playing')return;this.stats.crossings++;const bonus=500+Math.max(0,Math.round(35-this.elapsed))*15+this.lives*100;
      this.addScore(bonus,'TERPS SECURED');this.state='complete';this.emit('complete',{bonus});this.achievement('TERPS SECURED');
      if(this.level===3)this.achievement('TRIM JAIL ESCAPEE');if(this.elapsed<12)this.achievement('ZERO BRAKES');
      if(this.level%3===0&&this.lives<5){this.lives++;this.emit('life');}if(this.level>=7)this.achievement('ROAD WARRIOR');}
    nextLevel(){if(this.state!=='complete')return;this.level++;this.makeLevel();this.state='playing';this.emit('start');}
    startEvent(name){if(this.state!=='playing'&&this.state!=='title')return;
      if(name==='420'){this.mode420=12;for(let i=0;i<8;i++)this.pickups.push({id:'event'+i,col:1+Math.floor(this.random()*13),row:1+Math.floor(this.random()*10),kind:'jar'});this.emit('event',{name:'4:20 — GOOD TIMING.',detail:'Double points. Faster wheels. Twelve seconds.'});}
      else {this.event={name,left:9};this.emit('event',{name:name==='taxi'?'DIRTY TAXI CONVOY':'HARVEST DAY',detail:name==='taxi'?'Somebody ordered the whole fleet.':'The growmies brought extra jars.'});if(name==='harvest')for(let i=0;i<5;i++)this.pickups.push({id:'harvest'+i,col:2+Math.floor(this.random()*11),row:3+i,kind:'seed'});}
    }
    update(dt) {
      dt=Math.min(dt,.05);this.time+=dt;
      if(this.state!=='playing'&&this.state!=='title'&&this.state!=='gameover')return;
      const live=this.state==='playing';
      if(live){this.elapsed+=dt;this.moveCooldown=Math.max(0,this.moveCooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
        for(const key in this.effects)this.effects[key]=Math.max(0,this.effects[key]-dt);
        this.mode420=Math.max(0,this.mode420-dt);if(this.comboTime>0){this.comboTime-=dt;if(this.comboTime<=0)this.combo=1;}
        if(this.event){this.event.left-=dt;if(this.event.left<=0)this.event=null;}
        if(this.elapsed>this.eventAt&&!this.event){this.eventAt=Infinity;if(this.level>1||this.random()<.25)this.startEvent(this.random()<.23?'420':this.random()<.5?'taxi':'harvest');}
      }
      const factor=live&&this.effects.taxi>0?0:live&&this.mode420>0?1.18:1;
      for(const lane of this.lanes) {
        for(const c of lane.cars){c.x+=lane.speed*lane.dir*dt*factor;
          if(lane.dir===1&&c.x-c.w/2>W+140){c.x=Math.min(...lane.cars.filter(v=>v!==c).map(v=>v.x-v.w/2))-lane.gap-c.w/2;c.near=false;c.passed=false;}
          if(lane.dir===-1&&c.x+c.w/2< -140){c.x=Math.max(...lane.cars.filter(v=>v!==c).map(v=>v.x+v.w/2))+lane.gap+c.w/2;c.near=false;c.passed=false;}
        }
      }
      if(!live)return;
      if(this.deathTimer>0){this.deathTimer-=dt;if(this.deathTimer<=0){this.player={col:7,row:this.checkpoint,x:xFor(7),y:yFor(this.checkpoint)};this.invulnerable=.55;}return;}
      if(this.move){const m=this.move;m.progress=Math.min(1,m.progress+dt/m.duration);const t=m.progress;
        this.player.x=m.fromX+(m.toX-m.fromX)*t;this.player.y=m.fromY+(m.toY-m.fromY)*t;
        if(t===1){this.move=null;if(this.player.row<this.bestRow){this.addScore(20,'',this.player.x,this.player.y);this.bestRow=this.player.row;}
          if(this.player.row===6||this.player.row===3)this.checkpoint=Math.min(this.checkpoint,this.player.row);
          this.collect();if(this.player.row===0){this.complete();return;}}
      }
      // Small forgiving hitbox; movement and collisions are both sampled at 120 Hz.
      const p=this.player;
      for(const c of this.cars){const dx=Math.abs(p.x-c.x),dy=Math.abs(p.y-c.y);
        if(dx<c.w/2+13&&dy<29){if(this.hit())break;}
        else if(dx<c.w/2+35&&dy<31&&!c.passed&&this.invulnerable===0&&this.effects.apollo===0)c.near=true;
        if(c.near&&!c.passed&&((p.x-c.x)*c.dir< -c.w/2-35||dy>55)){
          c.passed=true;c.near=false;if(this.invulnerable===0&&this.effects.apollo===0){this.stats.close++;this.addScore(80,'CLOSE CALL');this.bumpCombo();this.emit('near');if(this.stats.close>=5)this.achievement('TRAFFIC SURVIVOR');}
        }
      }
    }
  }
  return {Game,STRAINS,STAGES,VEHICLES,W,H,COLS,STEP,ROW,TOP,xFor,yFor,rng,clamp};
});
