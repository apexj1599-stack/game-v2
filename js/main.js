const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const ui = {
  menu:$('menu'), hud:$('hud'), upgrade:$('upgrade'), pause:$('pause'), gameover:$('gameover'),
  upgradeGrid:$('upgradeGrid'), level:$('level'), wave:$('wave'), time:$('time'), kills:$('kills'),
  hpBar:$('hpBar'), xpBar:$('xpBar'), bossBar:$('bossBar'), bossName:$('bossName'), bossHpBar:$('bossHpBar'),
  touch:$('touchControls'), joystick:$('joystick'), stick:$('stick'), toast:$('toast')
};

let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize); resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;

const saveKey='nebula-survivors-v2';
let save={coins:0,bestTime:0,bestLevel:1,highestWave:1,damageBonus:0,speedBonus:0,maxHpBonus:0};
try{Object.assign(save,JSON.parse(localStorage.getItem(saveKey)||'{}'))}catch{}
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(save))}catch{}}

const WEAPONS=[
 {id:'pulse',name:'Pulse Blaster',icon:'✦',color:'#67e8f9',rate:.48,damage:20,speed:650,range:850,shots:1,desc:'Fast homing-ish energy bolts.'},
 {id:'shards',name:'Void Shards',icon:'◆',color:'#c4b5fd',rate:1.15,damage:34,speed:460,range:520,shots:3,spread:1.0,desc:'Three projectiles in a fan.'},
 {id:'orbit',name:'Orbit Blades',icon:'◈',color:'#f0abfc',rate:0,damage:28,range:105,shots:2,desc:'Blades circle you and shred enemies.'},
 {id:'nova',name:'Solar Nova',icon:'✹',color:'#fb923c',rate:3.2,damage:82,range:175,shots:1,desc:'Periodic radial explosion.'},
 {id:'frost',name:'Frost Field',icon:'❄',color:'#93c5fd',rate:2.2,damage:48,range:150,shots:1,desc:'Damages every nearby enemy.'},
 {id:'arc',name:'Arc Lance',icon:'⚡',color:'#fde047',rate:1.55,damage:58,speed:900,range:900,shots:1,desc:'Piercing electric projectile.'},
 {id:'meteor',name:'Meteor Rain',icon:'☄',color:'#f97316',rate:4.3,damage:135,range:250,shots:2,desc:'Calls explosive meteors.'},
 {id:'drone',name:'Star Drones',icon:'✺',color:'#86efac',rate:1.65,damage:42,speed:560,range:750,shots:2,desc:'Seeking star bolts.'}
];
const UPGRADES=[
 {id:'damage',name:'Overcharge',icon:'⚔',desc:'+20% weapon damage.',tag:'POWER'},
 {id:'speed',name:'Thrusters',icon:'➤',desc:'+15% movement speed.',tag:'MOBILITY'},
 {id:'magnet',name:'Singularity',icon:'◎',desc:'+35 pickup range.',tag:'UTILITY'},
 {id:'armor',name:'Phase Armor',icon:'◉',desc:'-15% contact damage.',tag:'DEFENSE'},
 {id:'maxhp',name:'Reactor Core',icon:'♥',desc:'+20 max HP and heal.',tag:'SURVIVAL'},
 {id:'cooldown',name:'Rapid Circuit',icon:'⏱',desc:'Weapons fire 10% faster.',tag:'TEMPO'}
];

const keys={};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='p')togglePause()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

const touch={active:false,cx:0,cy:0,x:0,y:0};
function setStick(px,py){const r=52,dx=px-touch.cx,dy=py-touch.cy,m=Math.hypot(dx,dy)||1,s=Math.min(r,m);touch.x=dx/m*s/r;touch.y=dy/m*s/r;ui.stick.style.transform=`translate(${dx/m*s}px,${dy/m*s}px)`}
ui.joystick.addEventListener('pointerdown',e=>{touch.active=true;ui.joystick.setPointerCapture(e.pointerId);const r=ui.joystick.getBoundingClientRect();touch.cx=r.left+r.width/2;touch.cy=r.top+r.height/2;setStick(e.clientX,e.clientY)});
ui.joystick.addEventListener('pointermove',e=>{if(touch.active)setStick(e.clientX,e.clientY)});
for(const ev of ['pointerup','pointercancel','pointerleave'])ui.joystick.addEventListener(ev,()=>{touch.active=false;touch.x=touch.y=0;ui.stick.style.transform='translate(0,0)'});

const game={running:false,paused:false,over:false,time:0,kills:0,wave:1,level:1,xp:0,nextXp:12,shards:0,spawn:0,nextBoss:90,enemyId:0,projectileId:0,shake:0,cameraX:0,cameraY:0,last:performance.now(),enemies:[],projectiles:[],gems:[],particles:[],texts:[],player:null,cooldownBoost:0,magnetBoost:0,upgradeOpen:false};

function beep(freq=440,duration=.05,type='sine',volume=.012){try{const ac=game.audio||(game.audio=new AudioContext());const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;g.gain.value=volume;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+duration);o.stop(ac.currentTime+duration)}catch{}}
function player(){const hp=100+save.maxHpBonus;return{x:0,y:0,r:18,hp,maxHp:hp,speed:230*(1+save.speedBonus),magnet:115,power:1+save.damageBonus,armor:0,weapons:[{...WEAPONS[0],level:1,cd:0}],orbit:0}}
function reset(){Object.assign(game,{running:true,paused:false,over:false,time:0,kills:0,wave:1,level:1,xp:0,nextXp:12,shards:0,spawn:.2,nextBoss:90,enemyId:0,projectileId:0,shake:0,cameraX:0,cameraY:0,enemies:[],projectiles:[],gems:[],particles:[],texts:[],cooldownBoost:0,magnetBoost:0,upgradeOpen:false});game.player=player();showOnly(ui.hud);ui.touch.classList.remove('hidden');updateHUD();beep(520,.08,'triangle',.02)}
function showOnly(target){[ui.menu,ui.hud,ui.upgrade,ui.pause,ui.gameover].forEach(x=>x.classList.add('hidden'));target.classList.remove('hidden')}
function toast(text){ui.toast.textContent=text;ui.toast.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.add('hidden'),1500)}
function addText(x,y,text,color='#fff'){game.texts.push({x,y,text,color,life:.65})}
function burst(x,y,color,count=8,power=80){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(power*.3,power);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.6),max:.6,color,r:rand(1,4)})}}

function spawnEnemy(kind){const a=rand(0,Math.PI*2),radius=Math.max(W,H)*.72+rand(80,320),p=game.player;const data={grunt:[38,54,14,'#45e0a8',1],runner:[28,120,11,'#fb7185',1.5],brute:[150,36,25,'#94a3b8',3],ranged:[76,44,16,'#60a5fa',2],elite:[480,62,30,'#a78bfa',10],boss:[2400+game.time*20,34,52,'#ef4444',40]};const d=data[kind]||data.grunt,scale=1+game.time/180;game.enemies.push({id:++game.enemyId,x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius,hp:d[0]*scale,maxHp:d[0]*scale,speed:d[1]*(1+game.time*.001),r:d[2],color:d[3],kind,value:d[4],shoot:rand(1,3),boss:kind==='boss',hit:0})}
function spawnWave(dt){game.spawn-=dt;if(game.spawn<=0){game.spawn=Math.max(.12,.7-game.time*.0025);const count=game.time>150?4:game.time>90?3:game.time>45?2:1;for(let i=0;i<count;i++){const r=Math.random();let k='grunt';if(game.time>75&&r<.035)k='elite';else if(game.time>50&&r<.14)k='brute';else if(game.time>30&&r<.27)k='runner';else if(game.time>25&&r<.38)k='ranged';spawnEnemy(k)}}if(game.time>=game.nextBoss){spawnEnemy('boss');game.nextBoss+=90;toast('⚠ BOSS INBOUND');beep(110,.35,'sawtooth',.03)}}
function nearest(x,y,max=Infinity){let best=null,bd=max;for(const e of game.enemies){if(e.hp<=0)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<bd){best=e;bd=d}}return best}
function hitEnemy(e,dmg){if(!e||e.hp<=0)return;e.hp-=dmg;e.hit=.08;addText(e.x,e.y-e.r-5,Math.round(dmg),e.boss?'#fecaca':'#fef3c7');burst(e.x,e.y,e.color,e.boss?6:3,60);game.shake=Math.max(game.shake,e.boss?5:1.3);if(e.hp<=0){game.kills++;game.shards+=e.value;const n=e.boss?16:e.kind==='elite'?4:1;for(let i=0;i<n;i++)game.gems.push({x:e.x+rand(-12,12),y:e.y+rand(-12,12),value:e.boss?4:e.value,phase:rand(0,6)});save.coins+=e.boss?25:e.value;burst(e.x,e.y,e.color,e.boss?28:10,e.boss?190:100);beep(e.boss?90:240,e.boss?.2:.025,e.boss?'sawtooth':'square',e.boss?.025:.008)}}
function fire(w){const p=game.player;if(w.id==='orbit')return;const target=nearest(p.x,p.y,w.range||9999),damage=w.damage*p.power*(1+.13*(w.level-1));if(w.id==='nova'){if(target){for(const e of game.enemies)if(distance(target,e)<w.range)hitEnemy(e,damage);burst(target.x,target.y,w.color,22,150)}return}if(w.id==='frost'){for(const e of game.enemies)if(distance(p,e)<w.range)hitEnemy(e,damage);return}if(w.id==='meteor'){for(let i=0;i<w.shots;i++){const e=nearest(p.x+rand(-140,140),p.y+rand(-140,140),w.range);if(e){const ex=e.x,ey=e.y;setTimeout(()=>{if(game.running&&!game.over&&e.hp>0)hitEnemy(e,damage)},70+i*80);burst(ex,ey,w.color,9,90)}}return}if(!target)return;const base=Math.atan2(target.y-p.y,target.x-p.x);for(let i=0;i<w.shots;i++){const a=base+(i-(w.shots-1)/2)*(w.spread||0);game.projectiles.push({id:++game.projectileId,x:p.x,y:p.y,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,damage,life:(w.range||700)/(w.speed||1),r:6,color:w.color,pierce:w.id==='arc'?2:0,enemy:false})}}
function weapons(dt){const p=game.player;p.orbit+=dt*1.8;for(const w of p.weapons){if(w.id==='orbit')continue;w.cd-=dt;if(w.cd<=0){w.cd=Math.max(.12,w.rate*Math.pow(.9,w.level-1)*(1-game.cooldownBoost));fire(w)}}}
function move(dt){const p=game.player;let x=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0),y=(keys.w||keys.arrowup?-1:0)+(keys.s||keys.arrowdown?1:0);if(touch.active){x=touch.x;y=touch.y}const m=Math.hypot(x,y);if(m){p.x+=x/m*p.speed*dt;p.y+=y/m*p.speed*dt}game.cameraX+=(p.x-game.cameraX)*Math.min(1,dt*7);game.cameraY+=(p.y-game.cameraY)*Math.min(1,dt*7)}
function projectiles(dt){for(const b of game.projectiles){if(b.enemy)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0)continue;for(const e of game.enemies){if(e.hp<=0||b.life<=0)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){hitEnemy(e,b.damage);if(b.pierce>0)b.pierce--;else b.life=0}}}game.projectiles=game.projectiles.filter(b=>b.life>0)}
function enemies(dt){const p=game.player;for(const e of game.enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);const d=Math.max(.001,distance(e,p));if(e.kind==='ranged'&&d>270){e.shoot-=dt;if(e.shoot<=0){e.shoot=2.2;const a=Math.atan2(p.y-e.y,p.x-e.x);game.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*270,vy:Math.sin(a)*270,damage:8+game.time*.05,life:3,r:5,color:'#60a5fa',enemy:true})}}else if(d>e.r+p.r+5){e.x+=(p.x-e.x)/d*e.speed*dt;e.y+=(p.y-e.y)/d*e.speed*dt}else{p.hp-=Math.max(.1,(e.boss?30:12)*(1-p.armor)*dt)}}for(const b of game.projectiles){if(!b.enemy)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life>0&&Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r){p.hp-=b.damage;b.life=0;game.shake=4}}game.projectiles=game.projectiles.filter(b=>b.life>0);game.enemies=game.enemies.filter(e=>e.hp>0)}
function collect(dt){const p=game.player;for(const g of game.gems){g.phase+=dt*4;const d=distance(g,p);if(d<p.magnet+game.magnetBoost){const n=Math.max(1,d);g.x+=(p.x-g.x)/n*360*dt;g.y+=(p.y-g.y)/n*360*dt}if(distance(g,p)<p.r+10){game.xp+=g.value;g.dead=true}}game.gems=game.gems.filter(g=>!g.dead);while(game.xp>=game.nextXp){game.xp-=game.nextXp;game.level++;game.nextXp=Math.floor(game.nextXp*1.22+5);showUpgrade();break}}
function particles(dt){for(const a of game.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=Math.pow(.03,dt);a.vy*=Math.pow(.03,dt);a.life-=dt}game.particles=game.particles.filter(a=>a.life>0);for(const t of game.texts){t.y-=25*dt;t.life-=dt}game.texts=game.texts.filter(t=>t.life>0)}
function updateHUD(){const p=game.player;ui.level.textContent=game.level;ui.wave.textContent=game.wave;ui.time.textContent=fmt(game.time);ui.kills.textContent=game.kills;ui.hpBar.style.width=clamp(p.hp/p.maxHp*100,0,100)+'%';ui.xpBar.style.width=clamp(game.xp/game.nextXp*100,0,100)+'%';const boss=game.enemies.find(e=>e.boss&&e.hp>0);ui.bossBar.classList.toggle('hidden',!boss);if(boss){ui.bossName.textContent='WARDEN PRIME';ui.bossHpBar.style.width=clamp(boss.hp/boss.maxHp*100,0,100)+'%'}}
function showUpgrade(){game.paused=true;game.upgradeOpen=true;showOnly(ui.upgrade);ui.upgradeGrid.innerHTML='';const choices=[];const pool=[...UPGRADES];if(game.player.weapons.length<8&&Math.random()<.5)pool.push({weapon:true,...WEAPONS[game.player.weapons.length],tag:'NEW WEAPON',desc:'Add this weapon to your arsenal.'});while(choices.length<3){const c=pool[Math.floor(Math.random()*pool.length)];if(!choices.some(x=>x.id===c.id))choices.push(c)}for(const c of choices){const b=document.createElement('button');b.className='upgrade-choice';b.innerHTML=`<div class="icon">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p><span class="tag">${c.tag}</span>`;b.onclick=()=>chooseUpgrade(c);ui.upgradeGrid.appendChild(b)}beep(700,.1,'triangle',.018)}
function chooseUpgrade(c){const p=game.player;if(c.weapon){p.weapons.push({...c,level:1,cd:0});toast(`${c.name} acquired!`)}else if(c.id==='damage')p.power*=1.2;else if(c.id==='speed')p.speed*=1.15;else if(c.id==='magnet')game.magnetBoost+=35;else if(c.id==='armor')p.armor=clamp(p.armor+.15,0,.75);else if(c.id==='maxhp'){p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+20)}else if(c.id==='cooldown')game.cooldownBoost=clamp(game.cooldownBoost+.1,0,.6);if(!c.weapon){const w=p.weapons[Math.floor(Math.random()*p.weapons.length)];if(w&&w.level<8){w.level++;toast(`${w.name} Lv.${w.level}`)}}game.upgradeOpen=false;game.paused=false;showOnly(ui.hud);ui.touch.classList.remove('hidden');updateHUD()}
function togglePause(){if(!game.running||game.over||game.upgradeOpen)return;game.paused=!game.paused;showOnly(game.paused?ui.pause:ui.hud);if(game.paused)ui.touch.classList.add('hidden');else ui.touch.classList.remove('hidden')}
function endRun(){game.over=true;game.running=false;game.paused=false;save.bestTime=Math.max(save.bestTime,game.time);save.bestLevel=Math.max(save.bestLevel,game.level);save.highestWave=Math.max(save.highestWave,game.wave);persist();ui.finalTime.textContent=fmt(game.time);ui.finalLevel.textContent=game.level;ui.finalKills.textContent=game.kills;ui.finalShards.textContent=game.shards;ui.bestTime.textContent=fmt(save.bestTime);ui.bestLevel.textContent=save.bestLevel;ui.gameoverTitle.textContent=game.time>=180?'Arena conquered!':'The swarm wins.';showOnly(ui.gameover);ui.touch.classList.add('hidden');beep(70,.35,'sawtooth',.03)}

function draw(){ctx.clearRect(0,0,W,H);const shake=game.shake;ctx.save();ctx.translate(W/2-game.cameraX+(Math.random()-.5)*shake,H/2-game.cameraY+(Math.random()-.5)*shake);game.shake*=.88;
 const left=game.cameraX-W/2-80,right=game.cameraX+W/2+80,top=game.cameraY-H/2-80,bottom=game.cameraY+H/2+80;ctx.fillStyle='#07101d';ctx.fillRect(left,top,right-left,bottom-top);
 ctx.strokeStyle='rgba(120,170,220,.09)';ctx.lineWidth=1;const step=80;for(let x=Math.floor(left/step)*step;x<right;x+=step){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke()}for(let y=Math.floor(top/step)*step;y<bottom;y+=step){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke()}
 for(const g of game.gems){ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.phase);ctx.fillStyle='#67e8f9';ctx.shadowBlur=12;ctx.shadowColor='#67e8f9';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(5,0);ctx.lineTo(0,6);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();ctx.restore()}
 for(const b of game.projectiles){ctx.fillStyle=b.color||'#fff';ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
 for(const e of game.enemies){if(e.hp<=0)continue;ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.color;ctx.shadowBlur=e.boss?24:8;ctx.shadowColor=e.color;ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(e.boss){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke()}ctx.restore();if(e.hp<e.maxHp){ctx.fillStyle='#182435';ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2,4);ctx.fillStyle=e.boss?'#ef4444':'#86efac';ctx.fillRect(e.x-e.r,e.y-e.r-9,e.r*2*clamp(e.hp/e.maxHp,0,1),4)}}
 const p=game.player;if(p){if(p.weapons.some(w=>w.id==='orbit')){for(let i=0;i<2;i++){const a=p.orbit+i*Math.PI;const x=p.x+Math.cos(a)*105,y=p.y+Math.sin(a)*105;ctx.fillStyle='#f0abfc';ctx.shadowBlur=18;ctx.shadowColor='#f0abfc';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}}ctx.fillStyle='#67e8f9';ctx.shadowBlur=22;ctx.shadowColor='#67e8f9';ctx.beginPath();ctx.moveTo(p.x+22,p.y);ctx.lineTo(p.x-13,p.y-14);ctx.lineTo(p.x-8,p.y);ctx.lineTo(p.x-13,p.y+14);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#dffbff';ctx.beginPath();ctx.arc(p.x+2,p.y,5,0,Math.PI*2);ctx.fill()}
 for(const a of game.particles){ctx.globalAlpha=clamp(a.life/a.max,0,1);ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;for(const t of game.texts){ctx.globalAlpha=clamp(t.life/.65,0,1);ctx.fillStyle=t.color;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(t.text,t.x,t.y)}ctx.globalAlpha=1;ctx.restore()}

function tick(now){const dt=Math.min(.033,(now-game.last)/1000);game.last=now;if(game.running&&!game.paused&&!game.over){game.time+=dt;game.wave=1+Math.floor(game.time/30);move(dt);spawnWave(dt);weapons(dt);projectiles(dt);enemies(dt);collect(dt);particles(dt);if(game.player.hp<=0)endRun();updateHUD()}draw();requestAnimationFrame(tick)}
$('startBtn').onclick=()=>reset();$('restartBtn').onclick=()=>reset();$('pauseBtn').onclick=()=>togglePause();$('resumeBtn').onclick=()=>togglePause();$('quitBtn').onclick=()=>{game.running=false;game.paused=false;showOnly(ui.menu);ui.touch.classList.add('hidden')};$('menuBtn').onclick=()=>{game.running=false;showOnly(ui.menu);ui.touch.classList.add('hidden')};
addEventListener('visibilitychange',()=>{if(document.hidden&&game.running&&!game.paused)togglePause()});
showOnly(ui.menu);ui.touch.classList.add('hidden');requestAnimationFrame(tick);
