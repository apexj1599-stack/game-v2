(() => {
'use strict';
function boot(){
 const canvas=document.getElementById('game');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 const $=id=>document.getElementById(id);
 const ui={menu:$('menu'),hud:$('hud'),upgrade:$('upgrade'),pause:$('pause'),over:$('gameover'),level:$('level'),wave:$('wave'),time:$('time'),kills:$('kills'),hp:$('hpBar'),xp:$('xpBar'),grid:$('upgradeGrid')};
 let W=innerWidth,H=innerHeight,dpr=1,last=performance.now(),running=false,paused=false,time=0,kills=0,level=1,xp=0,nextXP=8,spawnClock=0,shotClock=0;
 const player={x:0,y:0,r:24,hp:100,maxHp:100,speed:260,damage:25};
 const enemies=[],bullets=[],gems=[],keys={};
 function resize(){W=Math.max(320,innerWidth);H=Math.max(240,innerHeight);dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
 function hideAll(){[ui.menu,ui.hud,ui.upgrade,ui.pause,ui.over].forEach(x=>x&&x.classList.add('hidden'))}
 function show(x){hideAll();x&&x.classList.remove('hidden')}
 function spawn(){const a=Math.random()*Math.PI*2,r=320+Math.random()*160;enemies.push({x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,r:16,hp:50+time*1.5,speed:45+Math.random()*35})}
 function start(){player.x=0;player.y=0;player.hp=100;time=0;kills=0;level=1;xp=0;nextXP=8;spawnClock=0;shotClock=0;enemies.length=0;bullets.length=0;gems.length=0;for(let i=0;i<7;i++)spawn();running=true;paused=false;show(ui.hud);last=performance.now()}
 function upgrade(){const choices=[['OVERCHARGE','Damage +30%',()=>player.damage*=1.3],['THRUSTERS','Speed +20%',()=>player.speed*=1.2],['REACTOR','Max HP +30',()=>{player.maxHp+=30;player.hp=player.maxHp}]];ui.grid.innerHTML='';choices.sort(()=>Math.random()-.5).forEach(c=>{const b=document.createElement('button');b.className='upgrade-choice';b.type='button';b.innerHTML='<span class="icon">✦</span><h3>'+c[0]+'</h3><p>'+c[1]+'</p>';b.onclick=()=>{c[2]();paused=false;show(ui.hud);last=performance.now()};ui.grid.appendChild(b)});paused=true;show(ui.upgrade)}
 function addXP(v){xp+=v;if(xp>=nextXP){xp-=nextXP;level++;nextXP=Math.floor(nextXP*1.3+3);upgrade()}}
 function shoot(){if(!enemies.length)return;let target=null,best=Infinity;for(const e of enemies){const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<best){best=d;target=e}}if(!target)return;const a=Math.atan2(target.y-player.y,target.x-player.x);bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*700,vy:Math.sin(a)*700,r:7,life:1.4})}
 function update(dt){if(!running||paused)return;time+=dt;
  let dx=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0),dy=(keys.w||keys.arrowup?-1:0)+(keys.s||keys.arrowdown?1:0);const n=Math.hypot(dx,dy)||1;player.x+=dx/n*player.speed*dt;player.y+=dy/n*player.speed*dt;
  spawnClock-=dt;if(spawnClock<=0){spawnClock=Math.max(.25,.75-time*.002);spawn()}
  shotClock-=dt;if(shotClock<=0){shotClock=.42;shoot()}
  for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of enemies){if(e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){e.hp=0;b.life=0;kills++;gems.push({x:e.x,y:e.y});addXP(1);break}}}
  for(const e of enemies){if(e.hp<=0)continue;const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;if(d>e.r+player.r)e.x+=dx/d*e.speed*dt,e.y+=dy/d*e.speed*dt;else player.hp-=10*dt}
  for(const g of gems){const d=Math.hypot(player.x-g.x,player.y-g.y);if(d<130){g.x+=(player.x-g.x)/Math.max(d,1)*320*dt;g.y+=(player.y-g.y)/Math.max(d,1)*320*dt}if(d<30)g.dead=true}
  for(let i=enemies.length-1;i>=0;i--)if(enemies[i].hp<=0)enemies.splice(i,1);for(let i=bullets.length-1;i>=0;i--)if(bullets[i].life<=0)bullets.splice(i,1);for(let i=gems.length-1;i>=0;i--)if(gems[i].dead)gems.splice(i,1);
  if(player.hp<=0){running=false;show(ui.over)}
  ui.level.textContent=level;ui.wave.textContent=1+Math.floor(time/30);ui.time.textContent=String(Math.floor(time/60)).padStart(2,'0')+':'+String(Math.floor(time%60)).padStart(2,'0');ui.kills.textContent=kills;ui.hp.style.width=Math.max(0,player.hp/player.maxHp*100)+'%';ui.xp.style.width=xp/nextXP*100+'%';
 }
 function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle='#06101d';ctx.fillRect(0,0,W,H);const bg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.7);bg.addColorStop(0,'#173d61');bg.addColorStop(1,'#02050b');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2;ctx.save();ctx.translate(cx-player.x,cy-player.y);ctx.strokeStyle='rgba(120,210,255,.14)';ctx.lineWidth=1;for(let x=-2500;x<=2500;x+=80){ctx.beginPath();ctx.moveTo(x,-2500);ctx.lineTo(x,2500);ctx.stroke()}for(let y=-2500;y<=2500;y+=80){ctx.beginPath();ctx.moveTo(-2500,y);ctx.lineTo(2500,y);ctx.stroke()}
  for(const g of gems){ctx.fillStyle='#67e8f9';ctx.shadowBlur=16;ctx.shadowColor='#67e8f9';ctx.beginPath();ctx.arc(g.x,g.y,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  for(const b of bullets){ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.shadowColor='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  for(const e of enemies){ctx.fillStyle='#ff477e';ctx.shadowBlur=18;ctx.shadowColor='#ff477e';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(e.x-5,e.y-3,3,0,Math.PI*2);ctx.arc(e.x+5,e.y-3,3,0,Math.PI*2);ctx.fill()}
  ctx.restore();ctx.save();ctx.translate(cx,cy);ctx.fillStyle='#54e7ff';ctx.shadowBlur=35;ctx.shadowColor='#54e7ff';ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(-18,-18);ctx.lineTo(-9,0);ctx.lineTo(-18,18);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(4,0,6,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 $('startBtn')?.addEventListener('click',start);$('restartBtn')?.addEventListener('click',start);$('pauseBtn')?.addEventListener('click',()=>{if(running){paused=true;show(ui.pause)}});$('resumeBtn')?.addEventListener('click',()=>{paused=false;show(ui.hud);last=performance.now()});$('quitBtn')?.addEventListener('click',()=>{running=false;show(ui.menu)});$('menuBtn')?.addEventListener('click',()=>{running=false;show(ui.menu)});
 addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='p'&&running){paused=!paused;show(paused?ui.pause:ui.hud);last=performance.now()}});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('resize',resize);
 resize();hideAll();ui.menu.classList.remove('hidden');draw();requestAnimationFrame(function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();