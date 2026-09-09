(() => {
'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const ui={menu:$('menu'),hud:$('hud'),upgrade:$('upgrade'),pause:$('pause'),gameover:$('gameover'),grid:$('upgradeGrid'),level:$('level'),wave:$('wave'),time:$('time'),kills:$('kills'),hp:$('hpBar'),xp:$('xpBar'),boss:$('bossBar'),bossHp:$('bossHpBar'),touch:$('touchControls'),joy:$('joystick'),stick:$('stick'),toast:$('toast'),error:$('runtimeError'),errorText:$('runtimeErrorText')};
let W=0,H=0,dpr=1;
const keys={};
const game={running:false,paused:false,over:false,time:0,kills:0,wave:1,level:1,xp:0,nextXp:8,spawn:0,player:null,enemies:[],bullets:[],gems:[],last:0};
const upgrades=[['damage','Overcharge','+25% damage'],['speed','Thrusters','+20% speed'],['hp','Reactor Core','+30 max HP'],['magnet','Singularity','+50 pickup range']];
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,W*dpr);canvas.height=Math.max(1,H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
function show(el){[ui.menu,ui.hud,ui.upgrade,ui.pause,ui.gameover,ui.error].forEach(x=>x&&x.classList.add('hidden'));el&&el.classList.remove('hidden')}
function fmt(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function reset(){game.running=true;game.paused=false;game.over=false;game.time=0;game.kills=0;game.wave=1;game.level=1;game.xp=0;game.nextXp=8;game.spawn=.1;game.enemies=[];game.bullets=[];game.gems=[];game.player={x:0,y:0,r:18,hp:100,maxHp:100,speed:240,damage:25,magnet:110,armor:0};show(ui.hud);ui.touch&&ui.touch.classList.remove('hidden');updateHud()}
function spawn(){const p=game.player,a=Math.random()*Math.PI*2,r=Math.max(W,H)*.65+80;const boss=game.time>0&&Math.floor(game.time)%60===0&&game.time>59;game.enemies.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,r:boss?42:14,hp:boss?900:45,maxHp:boss?900:45,speed:boss?38:55,damage:boss?28:10,boss})}
function shoot(){const p=game.player;let target=null,best=Infinity;for(const e of game.enemies){const d=dist(p,e);if(d<best){best=d;target=e}}if(!target)return;const a=Math.atan2(target.y-p.y,target.x-p.x);game.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*650,vy:Math.sin(a)*650,r:5,life:1.4,damage:p.damage})}
function update(dt){const p=game.player;if(!p)return;game.time+=dt;game.wave=1+Math.floor(game.time/30);let x=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0),y=(keys.w||keys.arrowup?-1:0)+(keys.s||keys.arrowdown?1:0);if(ui.joy&&ui.joy.active){x=ui.joy.x;y=ui.joy.y}const m=Math.hypot(x,y);if(m){p.x+=x/m*p.speed*dt;p.y+=y/m*p.speed*dt}
 game.spawn-=dt;if(game.spawn<=0){game.spawn=Math.max(.18,.7-game.time*.003);const n=game.time>90?3:game.time>45?2:1;for(let i=0;i<n;i++)spawn()}
 if(Math.floor(game.time)===60&&Math.floor(game.time-dt)<60)spawn();
 if(!game._shot)game._shot=0;game._shot-=dt;if(game._shot<=0){game._shot=.42;shoot()}
 for(const b of game.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of game.enemies){if(e.hp>0&&b.life>0&&dist(b,e)<b.r+e.r){e.hp-=b.damage;b.life=0;if(e.hp<=0){game.kills++;game.gems.push({x:e.x,y:e.y,v:e.boss?4:1})}}}}
 game.bullets=game.bullets.filter(b=>b.life>0);for(const e of game.enemies){if(e.hp<=0)continue;const d=Math.max(.001,dist(e,p));if(d>e.r+p.r){e.x+=(p.x-e.x)/d*e.speed*dt;e.y+=(p.y-e.y)/d*e.speed*dt}else p.hp-=e.damage*dt}game.enemies=game.enemies.filter(e=>e.hp>0);
 for(const g of game.gems){if(dist(g,p)<p.magnet){const d=Math.max(1,dist(g,p));g.x+=(p.x-g.x)/d*350*dt;g.y+=(p.y-g.y)/d*350*dt}if(dist(g,p)<p.r+9){game.xp+=g.v;g.dead=true}}game.gems=game.gems.filter(g=>!g.dead);
 if(game.xp>=game.nextXp){game.xp-=game.nextXp;game.level++;game.nextXp=Math.floor(game.nextXp*1.25+4);showUpgrade()}
 if(p.hp<=0)end();updateHud()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#07101d';ctx.fillRect(0,0,W,H);const p=game.player;if(!p)return;const sx=W/2-p.x,sy=H/2-p.y;ctx.save();ctx.translate(sx,sy);ctx.strokeStyle='rgba(130,180,230,.12)';ctx.lineWidth=1;const size=80,l=p.x-W/2-80,r=p.x+W/2+80,t=p.y-H/2-80,b=p.y+H/2+80;for(let x=Math.floor(l/size)*size;x<r;x+=size){ctx.beginPath();ctx.moveTo(x,t);ctx.lineTo(x,b);ctx.stroke()}for(let y=Math.floor(t/size)*size;y<b;y+=size){ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(r,y);ctx.stroke()}
 for(const g of game.gems){ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.arc(g.x,g.y,6,0,Math.PI*2);ctx.fill()}
 for(const b of game.bullets){ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}
 for(const e of game.enemies){ctx.fillStyle=e.boss?'#ef4444':'#45e0a8';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1b2638';ctx.fillRect(e.x-e.r,e.y-e.r-8,e.r*2,4);ctx.fillStyle='#86efac';ctx.fillRect(e.x-e.r,e.y-e.r-8,e.r*2*clamp(e.hp/e.maxHp,0,1),4)}
 ctx.fillStyle='#67e8f9';ctx.shadowBlur=20;ctx.shadowColor='#67e8f9';ctx.beginPath();ctx.moveTo(p.x+22,p.y);ctx.lineTo(p.x-14,p.y-14);ctx.lineTo(p.x-7,p.y);ctx.lineTo(p.x-14,p.y+14);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.restore()}
function updateHud(){const p=game.player;if(!p)return;ui.level.textContent=game.level;ui.wave.textContent=game.wave;ui.time.textContent=fmt(game.time);ui.kills.textContent=game.kills;ui.hp.style.width=clamp(p.hp/p.maxHp,0,1)*100+'%';ui.xp.style.width=clamp(game.xp/game.nextXp,0,1)*100+'%';const boss=game.enemies.find(e=>e.boss);ui.boss.classList.toggle('hidden',!boss);if(boss)ui.bossHp.style.width=clamp(boss.hp/boss.maxHp,0,1)*100+'%'}
function showUpgrade(){ui.grid.innerHTML='';const list=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);for(const u of list){const b=document.createElement('button');b.className='upgrade-card';b.innerHTML='<strong>'+u[1]+'</strong><small>'+u[2]+'</small>';b.onclick=()=>{if(u[0]==='damage')game.player.damage*=1.25;if(u[0]==='speed')game.player.speed*=1.2;if(u[0]==='hp'){game.player.maxHp+=30;game.player.hp=game.player.maxHp}if(u[0]==='magnet')game.player.magnet+=50;show(ui.hud);ui.touch.classList.remove('hidden')};ui.grid.appendChild(b)}show(ui.upgrade);ui.touch.classList.add('hidden')}
function end(){game.over=true;game.running=false;$('finalTime').textContent=fmt(game.time);$('finalLevel').textContent=game.level;$('finalKills').textContent=game.kills;$('finalShards').textContent=game.xp;show(ui.gameover);ui.touch.classList.add('hidden')}
function pause(){if(!game.running||game.over)return;game.paused=!game.paused;if(game.paused){show(ui.pause);ui.touch.classList.add('hidden')}else{show(ui.hud);ui.touch.classList.remove('hidden');game.last=performance.now()}}
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault();if(e.key.toLowerCase()==='p')pause()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
if(ui.joy){ui.joy.x=0;ui.joy.y=0;ui.joy.active=false;ui.joy.addEventListener('pointerdown',e=>{ui.joy.active=true;ui.joy.setPointerCapture(e.pointerId)});ui.joy.addEventListener('pointermove',e=>{if(!ui.joy.active)return;const r=ui.joy.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=Math.max(1,Math.hypot(dx,dy));ui.joy.x=dx/m;ui.joy.y=dy/m});['pointerup','pointercancel'].forEach(ev=>ui.joy.addEventListener(ev,()=>{ui.joy.active=false;ui.joy.x=ui.joy.y=0}))}
$('startBtn').onclick=reset;$('restartBtn').onclick=reset;$('pauseBtn').onclick=pause;$('resumeBtn').onclick=pause;$('quitBtn').onclick=()=>{game.running=false;show(ui.menu);ui.touch.classList.add('hidden')};$('menuBtn').onclick=()=>{game.running=false;show(ui.menu);ui.touch.classList.add('hidden')};
function frame(now){const dt=Math.min(.033,(now-(game.last||now))/1000);game.last=now;if(game.running&&!game.paused&&!game.over)update(dt);draw();requestAnimationFrame(frame)}
addEventListener('error',e=>{if(ui.error){ui.errorText.textContent=e.message||'Unknown JavaScript error';show(ui.error)}});addEventListener('unhandledrejection',e=>{if(ui.error){ui.errorText.textContent=String(e.reason||'Unknown error');show(ui.error)}});
resize();show(ui.menu);requestAnimationFrame(frame);
})();
