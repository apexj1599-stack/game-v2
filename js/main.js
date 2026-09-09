(() => {
  'use strict';

  // Nebula Survivors: dependency-free canvas runtime.
  // Everything initializes after DOM readiness so a partial page never becomes a silent black screen.
  const boot = () => {
    const required = ['game', 'menu', 'hud', 'upgrade', 'pause', 'gameover', 'runtimeError'];
    const missing = required.filter(id => !document.getElementById(id));
    const errorPanel = document.getElementById('runtimeError');
    const errorText = document.getElementById('runtimeErrorText');
    const fail = message => {
      console.error('[Nebula Survivors]', message);
      if (errorPanel && errorText) {
        errorText.textContent = String(message);
        errorPanel.classList.remove('hidden');
      }
    };

    if (missing.length) return fail(`Missing required UI: ${missing.join(', ')}`);

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return fail('This browser could not create a 2D canvas context.');

    const $ = id => document.getElementById(id);
    const ui = {
      app: $('app'), menu: $('menu'), hud: $('hud'), upgrade: $('upgrade'), pause: $('pause'), gameover: $('gameover'),
      grid: $('upgradeGrid'), level: $('level'), wave: $('wave'), time: $('time'), kills: $('kills'),
      hp: $('hpBar'), xp: $('xpBar'), boss: $('bossBar'), bossHp: $('bossHpBar'), bossName: $('bossName'),
      touch: $('touchControls'), joystick: $('joystick'), stick: $('stick'), toast: $('toast'), error: errorPanel,
      errorText, start: $('startBtn'), restart: $('restartBtn'), pauseBtn: $('pauseBtn'), resume: $('resumeBtn'),
      quit: $('quitBtn'), menuBtn: $('menuBtn')
    };

    let width = 1;
    let height = 1;
    let dpr = 1;
    let last = performance.now();
    let rafId = 0;
    let audioContext = null;
    let toastTimer = 0;

    const keys = Object.create(null);
    const joystick = { active: false, inputX: 0, inputY: 0, pointerId: null };
    const particles = [];

    const state = {
      active: false,
      paused: false,
      over: false,
      time: 0,
      kills: 0,
      level: 1,
      xp: 0,
      nextXp: 8,
      spawnTimer: 0.2,
      shotTimer: 0.1,
      weaponTimer: 0,
      bossSpawned: false,
      score: 0,
      player: null,
      enemies: [],
      bullets: [],
      gems: [],
      shots: 1,
      fireRate: 0.42,
      projectileSpeed: 650,
      projectileSize: 5,
      crit: 0.05,
      armor: 0,
      magnet: 120,
      regen: 0
    };

    const defaults = {
      bestTime: 0,
      bestLevel: 1,
      runs: 0
    };

    function readBest() {
      try {
        const saved = JSON.parse(localStorage.getItem('nebula-survivors-save') || '{}');
        return { ...defaults, ...saved };
      } catch {
        return { ...defaults };
      }
    }

    function writeBest() {
      const save = readBest();
      const next = {
        bestTime: Math.max(save.bestTime, state.time),
        bestLevel: Math.max(save.bestLevel, state.level),
        runs: save.runs + 1
      };
      try { localStorage.setItem('nebula-survivors-save', JSON.stringify(next)); } catch { /* storage can be unavailable */ }
      return next;
    }

    function formatTime(seconds) {
      const whole = Math.max(0, Math.floor(seconds));
      return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function circleHit(a, b) { return distance(a, b) < a.r + b.r; }

    function showToast(message) {
      if (!ui.toast) return;
      ui.toast.textContent = message;
      ui.toast.classList.remove('hidden');
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => ui.toast.classList.add('hidden'), 1500);
    }

    function panels(show) {
      [ui.menu, ui.hud, ui.upgrade, ui.pause, ui.gameover, ui.error].forEach(node => node && node.classList.add('hidden'));
      if (show) show.classList.remove('hidden');
    }

    function configureCanvas() {
      width = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1);
      height = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 1);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }

    function resetState() {
      state.time = 0; state.kills = 0; state.level = 1; state.xp = 0; state.nextXp = 8;
      state.spawnTimer = 0.18; state.shotTimer = 0.05; state.weaponTimer = 0; state.bossSpawned = false; state.score = 0;
      state.shots = 1; state.fireRate = 0.42; state.projectileSpeed = 650; state.projectileSize = 5; state.crit = 0.05;
      state.armor = 0; state.magnet = 120; state.regen = 0;
      state.player = { x: 0, y: 0, r: 18, hp: 100, maxHp: 100, speed: 250, damage: 25 };
      state.enemies.length = 0; state.bullets.length = 0; state.gems.length = 0; particles.length = 0;
      Object.keys(keys).forEach(k => { keys[k] = false; });
      joystick.active = false; joystick.inputX = joystick.inputY = 0;
      renderHud();
    }

    function ensureAudio() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!audioContext) audioContext = new AC();
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      } catch { /* audio is optional */ }
    }

    function blip(freq, duration = 0.05, type = 'sine', volume = 0.025) {
      if (!audioContext || audioContext.state !== 'running') return;
      try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(); osc.stop(audioContext.currentTime + duration);
      } catch { /* optional */ }
    }

    function particleBurst(x, y, count, fill) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 150;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.35, maxLife: 0.7, size: 1.5 + Math.random() * 3, fill });
      }
      if (particles.length > 500) particles.splice(0, particles.length - 500);
    }

    function spawnEnemy(forceBoss = false) {
      const p = state.player;
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(width, height) * 0.62 + 150;
      const wave = 1 + Math.floor(state.time / 30);
      const boss = forceBoss;
      const elite = !boss && Math.random() < Math.min(0.18, 0.02 + state.time * 0.0015);
      const hp = boss ? 1100 + state.time * 10 : elite ? 170 + state.time * 0.8 : 42 + state.time * 0.55;
      state.enemies.push({
        x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius,
        r: boss ? 44 : elite ? 22 : 14, hp, maxHp: hp,
        speed: boss ? 42 : elite ? 66 : 56 + Math.min(75, state.time * 0.25),
        damage: boss ? 24 + wave : elite ? 17 : 8 + wave * 0.8,
        boss, elite, hitFlash: 0
      });
    }

    function maybeSpawnBoss() {
      const minute = Math.floor(state.time / 60);
      if (minute > 0 && minute % 2 === 0 && !state.bossSpawned) {
        state.bossSpawned = true;
        spawnEnemy(true);
        showToast('⚠ WARDEN INCOMING');
        blip(90, 0.35, 'sawtooth', 0.06);
      }
      if (minute % 2 === 1) state.bossSpawned = false;
    }

    function findNearestEnemy(origin) {
      let best = null;
      let bestDistance = Infinity;
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const d = distance(origin, enemy);
        if (d < bestDistance) { best = enemy; bestDistance = d; }
      }
      return best;
    }

    function shoot() {
      const p = state.player;
      if (!p) return;
      const primary = findNearestEnemy(p);
      if (!primary) return;
      const base = Math.atan2(primary.y - p.y, primary.x - p.x);
      const spread = state.shots === 1 ? [0] : Array.from({ length: state.shots }, (_, i) => (i - (state.shots - 1) / 2) * 0.14);
      for (const offset of spread) {
        const angle = base + offset;
        const crit = Math.random() < state.crit;
        state.bullets.push({
          x: p.x, y: p.y, vx: Math.cos(angle) * state.projectileSpeed, vy: Math.sin(angle) * state.projectileSpeed,
          r: state.projectileSize, life: 1.7, damage: p.damage * (crit ? 2 : 1), crit
        });
      }
      blip(580 + Math.random() * 80, 0.025, 'square', 0.012);
    }

    function gainXp(amount) {
      state.xp += amount;
      while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp;
        state.level++;
        state.nextXp = Math.floor(state.nextXp * 1.23 + 3);
        showUpgrade();
        break;
      }
    }

    function damageEnemy(enemy, damage) {
      enemy.hp -= damage;
      enemy.hitFlash = 0.08;
      if (enemy.hp <= 0) {
        state.kills++;
        state.score += enemy.boss ? 1000 : enemy.elite ? 100 : 10;
        gainXp(enemy.boss ? 12 : enemy.elite ? 4 : 1);
        state.gems.push({ x: enemy.x, y: enemy.y, value: enemy.boss ? 12 : enemy.elite ? 4 : 1, pulse: Math.random() * Math.PI * 2 });
        particleBurst(enemy.x, enemy.y, enemy.boss ? 34 : 8, enemy.boss ? '#fb7185' : '#67e8f9');
        blip(enemy.boss ? 130 : enemy.elite ? 220 : 340, enemy.boss ? 0.22 : 0.06, 'triangle', enemy.boss ? 0.05 : 0.018);
      }
    }

    function update(dt) {
      const p = state.player;
      if (!p || !state.active || state.paused || state.over) return;
      state.time += dt;
      state.weaponTimer += dt;

      let dx = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);
      let dy = (keys.w || keys.arrowup ? -1 : 0) + (keys.s || keys.arrowdown ? 1 : 0);
      if (joystick.active) { dx = joystick.inputX; dy = joystick.inputY; }
      const len = Math.hypot(dx, dy);
      if (len > 0.001) {
        const factor = Math.min(1, len);
        p.x += dx / len * p.speed * factor * dt;
        p.y += dy / len * p.speed * factor * dt;
      }

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const wave = 1 + Math.floor(state.time / 30);
        const interval = clamp(0.7 - state.time * 0.0028, 0.16, 0.7);
        const count = Math.min(5, 1 + Math.floor(wave / 3));
        state.spawnTimer = interval;
        for (let i = 0; i < count; i++) spawnEnemy(false);
      }
      maybeSpawnBoss();

      state.shotTimer -= dt;
      if (state.shotTimer <= 0) { state.shotTimer = Math.max(0.14, state.fireRate); shoot(); }

      for (const bullet of state.bullets) {
        if (bullet.life <= 0) continue;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
        for (const enemy of state.enemies) {
          if (enemy.hp <= 0 || bullet.life <= 0) continue;
          if (circleHit(bullet, enemy)) damageEnemy(enemy, bullet.damage), bullet.life = 0;
        }
      }
      state.bullets = state.bullets.filter(b => b.life > 0);

      p.hp = Math.min(p.maxHp, p.hp + state.regen * dt);
      for (const enemy of state.enemies) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
        if (enemy.hp <= 0) continue;
        const d = Math.max(0.001, distance(enemy, p));
        if (d > enemy.r + p.r) {
          enemy.x += (p.x - enemy.x) / d * enemy.speed * dt;
          enemy.y += (p.y - enemy.y) / d * enemy.speed * dt;
        } else {
          p.hp -= Math.max(0, enemy.damage - state.armor) * dt;
        }
      }
      state.enemies = state.enemies.filter(e => e.hp > 0);

      for (const gem of state.gems) {
        gem.pulse += dt * 5;
        const d = distance(gem, p);
        if (d < state.magnet) {
          const n = Math.max(1, d);
          gem.x += (p.x - gem.x) / n * 360 * dt;
          gem.y += (p.y - gem.y) / n * 360 * dt;
        }
        if (distance(gem, p) < p.r + 11) { gainXp(gem.value); gem.dead = true; }
      }
      state.gems = state.gems.filter(g => !g.dead);

      for (const particle of particles) {
        particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= 0.98; particle.vy *= 0.98; particle.life -= dt;
      }
      for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);

      if (p.hp <= 0) finishRun();
      renderHud();
    }

    function drawBackground(cameraX, cameraY) {
      ctx.fillStyle = '#050a13';
      ctx.fillRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.75);
      glow.addColorStop(0, '#112b4b'); glow.addColorStop(0.55, '#081426'); glow.addColorStop(1, '#03060b');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(cameraX, cameraY);
      const size = 90;
      const left = -width + cameraX - size, right = width + cameraX + size;
      const top = -height + cameraY - size, bottom = height + cameraY + size;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,190,255,.10)';
      for (let x = Math.floor(left / size) * size; x < right; x += size) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
      for (let y = Math.floor(top / size) * size; y < bottom; y += size) { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
      ctx.restore();
    }

    function draw() {
      const p = state.player;
      if (!p) {
        ctx.fillStyle = '#050a13'; ctx.fillRect(0, 0, width, height);
        return;
      }
      const cameraX = width / 2 - p.x;
      const cameraY = height / 2 - p.y;
      drawBackground(cameraX, cameraY);

      ctx.save(); ctx.translate(cameraX, cameraY);
      for (const gem of state.gems) {
        const pulse = 1 + Math.sin(gem.pulse) * 0.15;
        ctx.fillStyle = '#67e8f9'; ctx.shadowBlur = 16; ctx.shadowColor = '#67e8f9';
        ctx.beginPath(); ctx.arc(gem.x, gem.y, 5 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      for (const bullet of state.bullets) {
        ctx.fillStyle = bullet.crit ? '#fbbf24' : '#f8fafc'; ctx.shadowBlur = 12; ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      for (const enemy of state.enemies) {
        ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : enemy.boss ? '#ef4444' : enemy.elite ? '#f59e0b' : '#45e0a8';
        ctx.shadowBlur = enemy.boss ? 20 : 9; ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        const barY = enemy.y - enemy.r - 10;
        ctx.fillStyle = '#172235'; ctx.fillRect(enemy.x - enemy.r, barY, enemy.r * 2, 4);
        ctx.fillStyle = enemy.boss ? '#fb7185' : enemy.elite ? '#fbbf24' : '#86efac';
        ctx.fillRect(enemy.x - enemy.r, barY, enemy.r * 2 * clamp(enemy.hp / enemy.maxHp, 0, 1), 4);
      }
      for (const particle of particles) {
        ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.fillStyle = particle.fill;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;

      const angle = Math.atan2((findNearestEnemy(p)?.y || p.y) - p.y, (findNearestEnemy(p)?.x || p.x) - p.x);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
      ctx.fillStyle = '#67e8f9'; ctx.shadowBlur = 24; ctx.shadowColor = '#67e8f9';
      ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-14, -14); ctx.lineTo(-7, 0); ctx.lineTo(-14, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      ctx.restore();
    }

    function renderHud() {
      const p = state.player;
      if (!p) return;
      if (ui.level) ui.level.textContent = state.level;
      if (ui.wave) ui.wave.textContent = 1 + Math.floor(state.time / 30);
      if (ui.time) ui.time.textContent = formatTime(state.time);
      if (ui.kills) ui.kills.textContent = state.kills;
      if (ui.hp) ui.hp.style.width = `${clamp(p.hp / p.maxHp, 0, 1) * 100}%`;
      if (ui.xp) ui.xp.style.width = `${clamp(state.xp / state.nextXp, 0, 1) * 100}%`;
      const boss = state.enemies.find(e => e.boss);
      if (ui.boss) ui.boss.classList.toggle('hidden', !boss);
      if (boss && ui.bossHp) ui.bossHp.style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
      if (ui.bossName && boss) ui.bossName.textContent = 'WARDEN';
    }

    const upgradePool = [
      { name: 'Overcharge', desc: '+25% weapon damage', tag: 'DAMAGE', apply: () => { state.player.damage *= 1.25; } },
      { name: 'Thrusters', desc: '+18% movement speed', tag: 'MOBILITY', apply: () => { state.player.speed *= 1.18; } },
      { name: 'Twin Shot', desc: '+1 projectile per volley', tag: 'WEAPON', apply: () => { state.shots = Math.min(5, state.shots + 1); } },
      { name: 'Rapid Core', desc: '10% faster fire rate', tag: 'WEAPON', apply: () => { state.fireRate = Math.max(0.12, state.fireRate * 0.9); } },
      { name: 'Reactor', desc: '+30 max HP and full heal', tag: 'SURVIVAL', apply: () => { state.player.maxHp += 30; state.player.hp = state.player.maxHp; } },
      { name: 'Singularity', desc: '+55 pickup range', tag: 'UTILITY', apply: () => { state.magnet += 55; } },
      { name: 'Plating', desc: 'Reduce contact damage by 3', tag: 'ARMOR', apply: () => { state.armor += 3; } },
      { name: 'Nano Repair', desc: '+1.5 HP per second', tag: 'REGEN', apply: () => { state.regen += 1.5; } },
      { name: 'Hyper Bolt', desc: '+20% projectile speed and size', tag: 'PROJECTILE', apply: () => { state.projectileSpeed *= 1.2; state.projectileSize += 1; } },
      { name: 'Critical Matrix', desc: '+8% critical chance', tag: 'CRIT', apply: () => { state.crit = Math.min(0.6, state.crit + 0.08); } }
    ];

    function showUpgrade() {
      if (!ui.grid) return;
      ui.grid.innerHTML = '';
      const choices = [...upgradePool].sort(() => Math.random() - 0.5).slice(0, 3);
      for (const upgrade of choices) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'upgrade-choice';
        button.innerHTML = `<span class="icon">✦</span><h3>${upgrade.name}</h3><p>${upgrade.desc}</p><span class="tag">${upgrade.tag}</span>`;
        button.addEventListener('click', () => {
          upgrade.apply();
          panels(ui.hud);
          if (ui.touch) ui.touch.classList.remove('hidden');
          state.paused = false;
          last = performance.now();
          showToast(`${upgrade.name} upgraded`);
        }, { once: true });
        ui.grid.appendChild(button);
      }
      state.paused = true;
      panels(ui.upgrade);
      if (ui.touch) ui.touch.classList.add('hidden');
      blip(760, 0.12, 'triangle', 0.03);
    }

    function finishRun() {
      if (state.over) return;
      state.active = false; state.over = true; state.paused = false;
      const best = writeBest();
      const finalTime = $('finalTime'); const finalLevel = $('finalLevel'); const finalKills = $('finalKills'); const finalShards = $('finalShards'); const bestTime = $('bestTime'); const bestLevel = $('bestLevel');
      if (finalTime) finalTime.textContent = formatTime(state.time);
      if (finalLevel) finalLevel.textContent = state.level;
      if (finalKills) finalKills.textContent = state.kills;
      if (finalShards) finalShards.textContent = state.xp;
      if (bestTime) bestTime.textContent = formatTime(best.bestTime);
      if (bestLevel) bestLevel.textContent = best.bestLevel;
      panels(ui.gameover);
      if (ui.touch) ui.touch.classList.add('hidden');
      blip(180, 0.5, 'sawtooth', 0.04);
    }

    function startRun() {
      ensureAudio();
      resetState();
      state.active = true; state.paused = false; state.over = false;
      panels(ui.hud);
      if (ui.touch) ui.touch.classList.remove('hidden');
      last = performance.now();
      showToast('SURVIVE • COLLECT • EVOLVE');
    }

    function togglePause() {
      if (!state.active || state.over) return;
      state.paused = !state.paused;
      if (state.paused) { panels(ui.pause); if (ui.touch) ui.touch.classList.add('hidden'); }
      else { panels(ui.hud); if (ui.touch) ui.touch.classList.remove('hidden'); last = performance.now(); }
    }

    function quitToMenu() {
      state.active = false; state.paused = false; state.over = false; panels(ui.menu); if (ui.touch) ui.touch.classList.add('hidden');
    }

    function pointerToJoystick(event) {
      if (!ui.joystick) return;
      const rect = ui.joystick.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const radius = Math.max(1, rect.width * 0.42);
      joystick.inputX = clamp(dx / radius, -1, 1);
      joystick.inputY = clamp(dy / radius, -1, 1);
      if (ui.stick) {
        ui.stick.style.transform = `translate(${joystick.inputX * radius * 0.52}px, ${joystick.inputY * radius * 0.52}px)`;
      }
    }

    function releaseJoystick() {
      joystick.active = false; joystick.pointerId = null; joystick.inputX = joystick.inputY = 0;
      if (ui.stick) ui.stick.style.transform = 'translate(0, 0)';
    }

    function frame(now) {
      try {
        const dt = clamp((now - last) / 1000, 0, 0.05);
        last = now;
        update(dt);
        draw();
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
        state.active = false;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    ui.start?.addEventListener('click', startRun);
    ui.restart?.addEventListener('click', startRun);
    ui.pauseBtn?.addEventListener('click', togglePause);
    ui.resume?.addEventListener('click', togglePause);
    ui.quit?.addEventListener('click', quitToMenu);
    ui.menuBtn?.addEventListener('click', quitToMenu);
    ui.error?.querySelector('button')?.addEventListener('click', () => window.location.reload());

    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      keys[key] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (key === 'p') togglePause();
    }, { passive: false });
    window.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { Object.keys(keys).forEach(key => { keys[key] = false; }); releaseJoystick(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.active && !state.paused) togglePause(); });
    window.addEventListener('resize', configureCanvas);

    if (ui.joystick) {
      ui.joystick.addEventListener('pointerdown', event => {
        joystick.active = true; joystick.pointerId = event.pointerId;
        ui.joystick.setPointerCapture?.(event.pointerId);
        pointerToJoystick(event);
      });
      ui.joystick.addEventListener('pointermove', event => { if (joystick.active && event.pointerId === joystick.pointerId) pointerToJoystick(event); });
      ui.joystick.addEventListener('pointerup', releaseJoystick);
      ui.joystick.addEventListener('pointercancel', releaseJoystick);
    }

    window.addEventListener('error', event => fail(event.error?.message || event.message || 'Unexpected JavaScript error.'));
    window.addEventListener('unhandledrejection', event => fail(event.reason?.message || String(event.reason || 'Unhandled promise rejection.')));

    configureCanvas();
    panels(ui.menu);
    draw();
    rafId = window.requestAnimationFrame(frame);
    window.addEventListener('beforeunload', () => window.cancelAnimationFrame(rafId), { once: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
