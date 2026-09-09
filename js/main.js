(() => {
  'use strict';

  // Stable, dependency-free browser game runtime.
  const canvas = document.getElementById('game');
  const ctx = canvas && canvas.getContext('2d');
  if (!canvas || !ctx) return;

  const el = id => document.getElementById(id);
  const ui = {
    menu: el('menu'), hud: el('hud'), upgrade: el('upgrade'), pause: el('pause'), gameover: el('gameover'),
    grid: el('upgradeGrid'), level: el('level'), wave: el('wave'), time: el('time'), kills: el('kills'),
    hp: el('hpBar'), xp: el('xpBar'), boss: el('bossBar'), bossHp: el('bossHpBar'), touch: el('touchControls'),
    joystick: el('joystick'), error: el('runtimeError'), errorText: el('runtimeErrorText')
  };

  let width = 1, height = 1, last = performance.now();
  const keys = Object.create(null);
  const state = {
    active: false, paused: false, over: false, time: 0, kills: 0, level: 1, xp: 0, nextXp: 8,
    spawnTimer: .2, shotTimer: .1, player: null, enemies: [], bullets: [], gems: []
  };

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function panels(show) {
    [ui.menu, ui.hud, ui.upgrade, ui.pause, ui.gameover, ui.error].forEach(node => {
      if (node) node.classList.add('hidden');
    });
    if (show) show.classList.remove('hidden');
  }

  function formatTime(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function startRun() {
    state.active = true; state.paused = false; state.over = false; state.time = 0; state.kills = 0;
    state.level = 1; state.xp = 0; state.nextXp = 8; state.spawnTimer = .15; state.shotTimer = .05;
    state.player = { x: 0, y: 0, r: 18, hp: 100, maxHp: 100, speed: 250, damage: 25, magnet: 120 };
    state.enemies.length = 0; state.bullets.length = 0; state.gems.length = 0;
    panels(ui.hud);
    if (ui.touch) ui.touch.classList.remove('hidden');
    updateHud();
  }

  function spawnEnemy() {
    const p = state.player;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(width, height) * .65 + 120;
    const boss = state.time >= 59.5 && state.time < 60.5;
    const hp = boss ? 900 : 45 + state.time * .12;
    state.enemies.push({ x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius,
      r: boss ? 42 : 14, hp, maxHp: hp, speed: boss ? 38 : 55 + Math.min(40, state.time * .08),
      damage: boss ? 28 : 10, boss });
  }

  function shoot() {
    const p = state.player;
    let target = null, best = Infinity;
    for (const enemy of state.enemies) {
      const d = distance(p, enemy);
      if (d < best) { best = d; target = enemy; }
    }
    if (!target) return;
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    state.bullets.push({ x: p.x, y: p.y, vx: Math.cos(angle) * 650, vy: Math.sin(angle) * 650, r: 5, life: 1.4, damage: p.damage });
  }

  function update(dt) {
    const p = state.player;
    if (!p) return;
    state.time += dt;

    let dx = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);
    let dy = (keys.w || keys.arrowup ? -1 : 0) + (keys.s || keys.arrowdown ? 1 : 0);
    if (ui.joystick && ui.joystick.active) { dx = ui.joystick.inputX || 0; dy = ui.joystick.inputY || 0; }
    const length = Math.hypot(dx, dy);
    if (length) { p.x += dx / length * p.speed * dt; p.y += dy / length * p.speed * dt; }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = Math.max(.18, .7 - state.time * .003);
      const count = state.time > 90 ? 3 : state.time > 45 ? 2 : 1;
      for (let i = 0; i < count; i++) spawnEnemy();
    }

    state.shotTimer -= dt;
    if (state.shotTimer <= 0) { state.shotTimer = .42; shoot(); }

    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || bullet.life <= 0) continue;
        if (distance(bullet, enemy) < bullet.r + enemy.r) {
          enemy.hp -= bullet.damage; bullet.life = 0;
          if (enemy.hp <= 0) {
            state.kills++;
            state.gems.push({ x: enemy.x, y: enemy.y, value: enemy.boss ? 4 : 1 });
          }
        }
      }
    }
    state.bullets = state.bullets.filter(b => b.life > 0);

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const d = Math.max(.001, distance(enemy, p));
      if (d > enemy.r + p.r) {
        enemy.x += (p.x - enemy.x) / d * enemy.speed * dt;
        enemy.y += (p.y - enemy.y) / d * enemy.speed * dt;
      } else {
        p.hp -= enemy.damage * dt;
      }
    }
    state.enemies = state.enemies.filter(e => e.hp > 0);

    for (const gem of state.gems) {
      const d = distance(gem, p);
      if (d < p.magnet) {
        const n = Math.max(1, d);
        gem.x += (p.x - gem.x) / n * 350 * dt;
        gem.y += (p.y - gem.y) / n * 350 * dt;
      }
      if (distance(gem, p) < p.r + 9) { state.xp += gem.value; gem.dead = true; }
    }
    state.gems = state.gems.filter(g => !g.dead);

    if (state.xp >= state.nextXp) {
      state.xp -= state.nextXp; state.level++;
      state.nextXp = Math.floor(state.nextXp * 1.25 + 4);
      showUpgrade();
    }
    if (p.hp <= 0) finishRun();
    updateHud();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#07101d'; ctx.fillRect(0, 0, width, height);
    const p = state.player;
    if (!p) {
      ctx.fillStyle = '#10213a'; ctx.fillRect(0, 0, width, height);
      return;
    }
    const cameraX = width / 2 - p.x, cameraY = height / 2 - p.y;
    ctx.save(); ctx.translate(cameraX, cameraY);

    const size = 80;
    const left = p.x - width / 2 - size, right = p.x + width / 2 + size;
    const top = p.y - height / 2 - size, bottom = p.y + height / 2 + size;
    ctx.strokeStyle = 'rgba(130,180,230,.13)'; ctx.lineWidth = 1;
    for (let x = Math.floor(left / size) * size; x < right; x += size) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
    for (let y = Math.floor(top / size) * size; y < bottom; y += size) { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }

    for (const gem of state.gems) { ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(gem.x, gem.y, 6, 0, Math.PI * 2); ctx.fill(); }
    for (const bullet of state.bullets) { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2); ctx.fill(); }
    for (const enemy of state.enemies) {
      ctx.fillStyle = enemy.boss ? '#ef4444' : '#45e0a8'; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b2638'; ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 8, enemy.r * 2, 4);
      ctx.fillStyle = '#86efac'; ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 8, enemy.r * 2 * clamp(enemy.hp / enemy.maxHp, 0, 1), 4);
    }
    ctx.fillStyle = '#67e8f9'; ctx.shadowBlur = 22; ctx.shadowColor = '#67e8f9';
    ctx.beginPath(); ctx.moveTo(p.x + 23, p.y); ctx.lineTo(p.x - 14, p.y - 14); ctx.lineTo(p.x - 7, p.y); ctx.lineTo(p.x - 14, p.y + 14); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  }

  function updateHud() {
    const p = state.player; if (!p) return;
    if (ui.level) ui.level.textContent = state.level;
    if (ui.wave) ui.wave.textContent = 1 + Math.floor(state.time / 30);
    if (ui.time) ui.time.textContent = formatTime(state.time);
    if (ui.kills) ui.kills.textContent = state.kills;
    if (ui.hp) ui.hp.style.width = clamp(p.hp / p.maxHp, 0, 1) * 100 + '%';
    if (ui.xp) ui.xp.style.width = clamp(state.xp / state.nextXp, 0, 1) * 100 + '%';
    const boss = state.enemies.find(e => e.boss);
    if (ui.boss) ui.boss.classList.toggle('hidden', !boss);
    if (boss && ui.bossHp) ui.bossHp.style.width = clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%';
  }

  function showUpgrade() {
    if (!ui.grid) return;
    ui.grid.innerHTML = '';
    const choices = [
      ['Overcharge', '+25% damage', () => state.player.damage *= 1.25],
      ['Thrusters', '+20% movement speed', () => state.player.speed *= 1.2],
      ['Reactor Core', '+30 maximum HP', () => { state.player.maxHp += 30; state.player.hp = state.player.maxHp; }],
      ['Singularity', '+50 pickup range', () => state.player.magnet += 50]
    ].sort(() => Math.random() - .5).slice(0, 3);
    for (const [name, description, apply] of choices) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'upgrade-choice';
      button.innerHTML = '<strong>' + name + '</strong><br><small>' + description + '</small>';
      button.onclick = () => { apply(); panels(ui.hud); if (ui.touch) ui.touch.classList.remove('hidden'); };
      ui.grid.appendChild(button);
    }
    panels(ui.upgrade); if (ui.touch) ui.touch.classList.add('hidden');
  }

  function finishRun() {
    state.active = false; state.over = true;
    const time = ui.gameover && el('finalTime'); if (time) time.textContent = formatTime(state.time);
    const level = el('finalLevel'); if (level) level.textContent = state.level;
    const kills = el('finalKills'); if (kills) kills.textContent = state.kills;
    const shards = el('finalShards'); if (shards) shards.textContent = state.xp;
    panels(ui.gameover); if (ui.touch) ui.touch.classList.add('hidden');
  }

  function togglePause() {
    if (!state.active || state.over) return;
    state.paused = !state.paused;
    if (state.paused) { panels(ui.pause); if (ui.touch) ui.touch.classList.add('hidden'); }
    else { panels(ui.hud); if (ui.touch) ui.touch.classList.remove('hidden'); last = performance.now(); }
  }

  window.addEventListener('keydown', event => {
    keys[event.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) event.preventDefault();
    if (event.key.toLowerCase() === 'p') togglePause();
  });
  window.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener('resize', resize);

  if (ui.joystick) {
    ui.joystick.inputX = 0; ui.joystick.inputY = 0; ui.joystick.active = false;
    ui.joystick.addEventListener('pointerdown', e => { ui.joystick.active = true; ui.joystick.setPointerCapture(e.pointerId); });
    ui.joystick.addEventListener('pointermove', e => {
      if (!ui.joystick.active) return;
      const r = ui.joystick.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const m = Math.max(1, Math.hypot(dx, dy));
      ui.joystick.inputX = clamp(dx / (r.width / 2), -1, 1);
      ui.joystick.inputY = clamp(dy / (r.height / 2), -1, 1);
    });
    ['pointerup', 'pointercancel'].forEach(type => ui.joystick.addEventListener(type, () => { ui.joystick.active = false; ui.joystick.inputX = ui.joystick.inputY = 0; }));
  }

  if (el('startBtn')) el('startBtn').addEventListener('click', startRun);
  if (el('restartBtn')) el('restartBtn').addEventListener('click', startRun);
  if (el('pauseBtn')) el('pauseBtn').addEventListener('click', togglePause);
  if (el('resumeBtn')) el('resumeBtn').addEventListener('click', togglePause);
  if (el('quitBtn')) el('quitBtn').addEventListener('click', () => { state.active = false; panels(ui.menu); if (ui.touch) ui.touch.classList.add('hidden'); });
  if (el('menuBtn')) el('menuBtn').addEventListener('click', () => { state.active = false; panels(ui.menu); if (ui.touch) ui.touch.classList.add('hidden'); });

  window.addEventListener('error', event => {
    if (ui.error && ui.errorText) { ui.errorText.textContent = event.message || 'JavaScript error'; panels(ui.error); }
  });
  window.addEventListener('unhandledrejection', event => {
    if (ui.error && ui.errorText) { ui.errorText.textContent = String(event.reason || 'Unhandled error'); panels(ui.error); }
  });

  resize();
  panels(ui.menu);
  requestAnimationFrame(function loop(now) {
    const dt = Math.min(.033, Math.max(0, (now - last) / 1000));
    last = now;
    if (state.active && !state.paused && !state.over) update(dt);
    draw();
    requestAnimationFrame(loop);
  });
})();
