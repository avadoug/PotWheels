// Seeded playability audit: no invincibility, no teleporting, no power-up fixtures.
const {Game,xFor,yFor}=require('../engine.js');
const fs=require('node:fs');
function safe(g,dx,dy){const p=g.player,col=p.col+dx,row=p.row+dy;if(col<0||col>14||row<0||row>11)return false;
  for(let t=0;t<=.23;t+=1/120){const blend=Math.min(1,t/.095),x=p.x+(xFor(col)-p.x)*blend,y=p.y+(yFor(row)-p.y)*blend;
    for(const c of g.cars){const cx=c.x+c.speed*c.dir*t;if(Math.abs(cx-x)<c.w/2+17&&Math.abs(c.y-y)<32)return false;}}
  return true;
}
const results=[];
for(const level of [1,3,7])for(const cautious of [false,true]){
  let wins=0,livesLost=0,totalTime=0;
  for(let seed=1;seed<=100;seed++){
    const g=new Game(seed);g.start();g.level=level;g.makeLevel();let nextDecision=0;
    for(let t=0;t<60*120&&g.state==='playing';t++){
      if(t>=nextDecision&&!g.move&&g.deathTimer<=0){nextDecision=t+24;
        if(!cautious)g.movePlayer(0,-1);
        else if(safe(g,0,-1))g.movePlayer(0,-1);
        else if(!safe(g,0,0))for(const [dx,dy] of [[-1,0],[1,0],[0,1]])if(safe(g,dx,dy)){g.movePlayer(dx,dy);break;}
      }g.update(1/120);livesLost+=g.events.filter(e=>e.type==='crash').length;g.events.length=0;
    }
    if(g.state==='complete'){wins++;totalTime+=g.elapsed;}
  }
  results.push({level,strategy:cautious?'time gaps':'blind forward',wins,attempts:100,averageSeconds:wins?+(totalTime/wins).toFixed(2):null,livesLost});
}
console.table(results);fs.writeFileSync('tests/balance-results.json',JSON.stringify(results,null,2));
if(results.find(r=>r.level===1&&r.strategy==='time gaps').wins<90)process.exitCode=1;
