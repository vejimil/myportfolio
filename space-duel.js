(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      document.body.classList.toggle('menu-open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('space-reset');

  const W = 1200;
  const H = 780;
  const R = 16;
  const VR = 400;
  const BV = 980;
  const DMG = 10;
  const COOLDOWN = 0.2;
  const BR = 6;
  const IR = 9;
  const SPAWN_BASE = 2.1;
  const MAX_BULLETS = 160;
  const MAX_ITEMS = 6;
  const ATK_T = 6;
  const SPD_T = 6;
  const HEAL_V = 25;
  const ATK_K = 1.8;
  const SPD_K = 1.45;
  const EDGE = 16;
  const LV_DMG = 4;
  const STUN_T = 1;

  const pressed = new Set();
  const blockKeys = new Set(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','KeyR']);

  const game = {
    bullets: [],
    items: [],
    nextItemAt: 0,
    over: false,
    overlay: '',
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function d2(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  }

  function newPlayer(x, color) {
    return {
      x,
      y: H / 2,
      hp: 100,
      spd: VR,
      lvl: 1,
      stun: 0,
      atkUntil: 0,
      spdUntil: 0,
      cooldownUntil: 0,
      color,
      fireHeld: false,
      ldX: 0,
      ldY: -1,
    };
  }

  let p1;
  let p2;

  function resetGame() {
    p1 = newPlayer(EDGE + 60, '#5be37a');
    p2 = newPlayer(W - (EDGE + 60), '#5bc0e3');
    game.bullets = [];
    game.items = [];
    game.nextItemAt = performance.now() / 1000 + randomRange(SPAWN_BASE / 2, SPAWN_BASE * 1.5);
    game.over = false;
    game.overlay = '';
  }

  function nowSec() {
    return performance.now() / 1000;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function calcAtk(player, t) {
    let base = DMG + (player.lvl - 1) * LV_DMG;
    if (player.atkUntil > t) base *= ATK_K;
    return Math.round(base);
  }

  function fire(player, owner, t) {
    if (player.cooldownUntil > t || player.stun > t) return;
    player.cooldownUntil = t + COOLDOWN;

    const dmg = calcAtk(player, t);
    const count = Math.min(5, 1 + (player.lvl - 1));
    const baseAngle = Math.atan2(player.ldY, player.ldX);
    const spread = (Math.PI / 180) * 10;

    for (let j = 0; j < count; j += 1) {
      const angle = count === 1 ? baseAngle : baseAngle + (j - (count - 1) / 2) * spread;
      const qx = Math.cos(angle);
      const qy = Math.sin(angle);
      game.bullets.push({
        x: player.x + qx * (R + 6),
        y: player.y + qy * (R + 6),
        vx: qx * BV,
        vy: qy * BV,
        r: BR,
        dmg,
        owner,
        ttl: t + 2.5,
      });
    }
  }

  function burst(player, owner, t) {
    const dmg = calcAtk(player, t);
    const count = 24;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const qx = Math.cos(angle);
      const qy = Math.sin(angle);
      game.bullets.push({
        x: player.x + qx * (R + 4),
        y: player.y + qy * (R + 4),
        vx: qx * BV,
        vy: qy * BV,
        r: BR,
        dmg,
        owner,
        ttl: t + 2.0,
      });
    }
  }

  function spawnItem() {
    if (game.items.length >= MAX_ITEMS) return;
    const pool = [
      { kind: 'heal', color: '#3bd35f' },
      { kind: 'atk', color: '#ffbf47' },
      { kind: 'spd', color: '#47d0ff' },
      { kind: 'stun', color: '#ff5b5b' },
      { kind: 'lvl', color: '#c77dff' },
      { kind: 'nova', color: '#ffffff' },
    ];
    const item = pool[Math.floor(Math.random() * pool.length)];
    game.items.push({
      x: randomRange(EDGE, W - EDGE),
      y: randomRange(EDGE + 40, H - EDGE),
      r: IR,
      kind: item.kind,
      color: item.color,
    });
  }

  function applyItem(player, opponent, item, owner, t) {
    switch (item.kind) {
      case 'heal':
        player.hp = Math.min(100, player.hp + HEAL_V);
        break;
      case 'atk':
        player.atkUntil = t + ATK_T;
        break;
      case 'spd':
        player.spd = VR * SPD_K;
        player.spdUntil = t + SPD_T;
        break;
      case 'stun':
        opponent.stun = t + STUN_T;
        break;
      case 'lvl':
        player.lvl += 1;
        break;
      case 'nova':
        burst(player, owner, t);
        break;
      default:
        break;
    }
  }

  function updatePlayer(player, controls, dt, t) {
    let x = 0;
    let y = 0;
    if (pressed.has(controls.left)) x -= 1;
    if (pressed.has(controls.right)) x += 1;
    if (pressed.has(controls.up)) y -= 1;
    if (pressed.has(controls.down)) y += 1;

    if (player.stun > t) {
      x = 0;
      y = 0;
    }

    if (player.spdUntil && t > player.spdUntil) {
      player.spd = VR;
      player.spdUntil = 0;
    }
    if (player.atkUntil && t > player.atkUntil) {
      player.atkUntil = 0;
    }

    if (x || y) {
      const len = Math.hypot(x, y) || 1;
      const ux = x / len;
      const uy = y / len;
      player.x += ux * player.spd * dt;
      player.y += uy * player.spd * dt;
      player.ldX = ux;
      player.ldY = uy;
    }

    player.x = clamp(player.x, EDGE, W - EDGE);
    player.y = clamp(player.y, EDGE + 40, H - EDGE);

    const fireDown = pressed.has(controls.fire);
    if (fireDown && !player.fireHeld && player.stun <= t) {
      fire(player, controls.owner, t);
    }
    player.fireHeld = fireDown;
  }

  function update(dt) {
    const t = nowSec();
    if (game.over) return;

    updatePlayer(p1, { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', fire: 'Space', owner: 'A' }, dt, t);
    updatePlayer(p2, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', fire: 'Enter', owner: 'B' }, dt, t);

    for (let idx = game.bullets.length - 1; idx >= 0; idx -= 1) {
      const bullet = game.bullets[idx];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.ttl < t || bullet.x < -40 || bullet.x > W + 40 || bullet.y < -40 || bullet.y > H + 40) {
        game.bullets.splice(idx, 1);
        continue;
      }

      const target = bullet.owner === 'A' ? p2 : p1;
      if (d2(bullet.x, bullet.y, target.x, target.y) <= (bullet.r + R) ** 2) {
        target.hp = Math.max(0, target.hp - bullet.dmg);
        game.bullets.splice(idx, 1);
      }
    }

    if (game.bullets.length > MAX_BULLETS) {
      game.bullets.splice(0, game.bullets.length - MAX_BULLETS);
    }

    for (let idx = game.items.length - 1; idx >= 0; idx -= 1) {
      const item = game.items[idx];
      if (d2(p1.x, p1.y, item.x, item.y) <= (R + item.r) ** 2) {
        applyItem(p1, p2, item, 'A', t);
        game.items.splice(idx, 1);
        continue;
      }
      if (d2(p2.x, p2.y, item.x, item.y) <= (R + item.r) ** 2) {
        applyItem(p2, p1, item, 'B', t);
        game.items.splice(idx, 1);
      }
    }

    if (t > game.nextItemAt) {
      spawnItem();
      game.nextItemAt = t + randomRange(SPAWN_BASE / 2, SPAWN_BASE * 1.5);
    }

    if (p1.hp <= 0 || p2.hp <= 0) {
      game.over = true;
      game.overlay = p1.hp <= 0 && p2.hp <= 0 ? 'Draw!' : p1.hp <= 0 ? 'P2 Wins!' : 'P1 Wins!';
    }
  }

  function drawGrid() {
    ctx.fillStyle = '#101318';
    ctx.fillRect(0, 0, W, H);

    const step = 32;
    ctx.strokeStyle = '#151a22';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 40; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#0c0f14';
    ctx.fillRect(0, 0, W, 40);
  }

  function drawHud() {
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = p1.color;
    ctx.textAlign = 'left';
    ctx.fillText(`P1 (Lv${p1.lvl})`, 40, 20);
    ctx.strokeStyle = '#2a3342';
    ctx.strokeRect(140, 12, 200, 16);
    ctx.fillStyle = '#5be37a';
    ctx.fillRect(142, 14, (p1.hp / 100) * 196, 12);

    ctx.fillStyle = p2.color;
    ctx.textAlign = 'right';
    ctx.fillText(`P2 (Lv${p2.lvl})`, W - 40, 20);
    ctx.strokeStyle = '#2a3342';
    ctx.strokeRect(W - 340, 12, 200, 16);
    ctx.fillStyle = '#5bc0e3';
    ctx.fillRect(W - 338, 14, (p2.hp / 100) * 196, 12);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9aa6b2';
    ctx.fillText('P1: WASD + Space   |   P2: Arrow Keys + Enter', W / 2, 20);

    const status = (player) => {
      const s = [];
      if (player.atkUntil > nowSec()) s.push('ATK');
      if (player.spdUntil > nowSec()) s.push('SPD');
      if (player.stun > nowSec()) s.push('STUN');
      return s.join(' | ');
    };

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff7cc';
    ctx.fillText(status(p1), 360, 20);
    ctx.textAlign = 'right';
    ctx.fillText(status(p2), W - 360, 20);
  }

  function drawCircle(x, y, r, fill, outline, width = 2) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  function render() {
    drawGrid();
    drawHud();

    for (const item of game.items) {
      drawCircle(item.x, item.y, item.r, item.color, '#000000', 1);
    }

    drawCircle(p1.x, p1.y, R, p1.color, p1.stun > nowSec() ? '#ff5b5b' : '#0d0');
    drawCircle(p2.x, p2.y, R, p2.color, p2.stun > nowSec() ? '#ff5b5b' : '#00d');

    for (const bullet of game.bullets) {
      drawCircle(bullet.x, bullet.y, bullet.r, bullet.owner === 'A' ? '#9cf' : '#fc9', '#222222', 1);
    }

    if (game.over) {
      ctx.fillStyle = 'rgba(11, 14, 19, 0.82)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 48px Inter, sans-serif';
      ctx.fillText(game.overlay, W / 2, H / 2 - 12);
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillText('Press R to Restart', W / 2, H / 2 + 36);
    }
  }

  function handleKeyDown(event) {
    if (blockKeys.has(event.code)) event.preventDefault();
    pressed.add(event.code);
    if (event.code === 'KeyR') resetGame();
  }

  function handleKeyUp(event) {
    pressed.delete(event.code);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', handleKeyDown, { passive: false });
  document.addEventListener('keyup', handleKeyUp);
  resetBtn?.addEventListener('click', resetGame);

  resetGame();
  requestAnimationFrame(loop);
})();
