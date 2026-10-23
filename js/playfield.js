/* Home hero playfield: walk the Triends astronaut (Insam follows) into a
   portal to open a project. Keyboard (WASD / arrows + E) or tap-to-move. */
(() => {
  const root = document.querySelector('[data-playfield]');
  if (!root) return;

  const screen = root.querySelector('.playfield-screen');
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const startBtn = root.querySelector('[data-playfield-start]');
  const startLabel = root.querySelector('[data-playfield-start-label]');
  const promptEl = root.querySelector('[data-playfield-prompt]');
  const flash = root.querySelector('.playfield-flash');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 480;
  const H = 300;
  const SPEED = 96;
  const PIXEL_FONT = '"Galmuri7", ui-monospace, monospace';

  const portals = [
    { label: 'TRIENDS', href: 'triends.html', color: '#38b764', x: 96, y: 104 },
    { label: 'WORLD OF WORDS', href: 'world-of-words.html', color: '#ef7d57', x: 240, y: 84 },
    { label: 'ARCADE', href: 'arcade-games.html', color: '#41a6f6', x: 384, y: 104 }
  ];

  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  const loadImage = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const sprites = {};
  const player = { x: 240, y: 236, dir: 'up', moving: false, frameTime: 0 };
  const insam = { x: 206, y: 250, dir: 'up', moving: false, frameTime: 0 };
  const keys = new Set();
  let target = null;
  let active = false;
  let entering = false;
  let hasMoved = false;
  let startedAt = 0;
  let lastInput = 'keys';
  let currentPortal = null;
  let visible = true;
  let rafId = null;
  let lastTime = 0;
  let clock = 0;
  let scale = 1;

  /* ---------- Static background (drawn once) ---------- */

  const mulberry32 = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const background = document.createElement('canvas');
  background.width = W;
  background.height = H;

  const paintBackground = () => {
    const g = background.getContext('2d');
    const rand = mulberry32(7);

    g.fillStyle = '#0f2326';
    g.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 16) {
      for (let x = 0; x < W; x += 16) {
        if ((x / 16 + y / 16) % 2 === 0) {
          g.fillStyle = '#11282b';
          g.fillRect(x, y, 16, 16);
        }
      }
    }

    // Dirt paths linking the start point to each portal.
    g.fillStyle = '#28433f';
    g.fillRect(96 - 10, 150, 384 - 96 + 20, 18);
    g.fillRect(240 - 10, 96, 20, H - 96);
    g.fillRect(96 - 10, 112, 20, 50);
    g.fillRect(384 - 10, 112, 20, 50);
    g.fillStyle = '#213a37';
    for (let i = 0; i < 90; i += 1) {
      const onH = rand() > 0.45;
      const px = onH ? 90 + rand() * 300 : 232 + rand() * 16;
      const py = onH ? 152 + rand() * 14 : 100 + rand() * 190;
      g.fillRect(Math.round(px), Math.round(py), 2, 2);
    }

    const onPath = (x, y) =>
      (y > 140 && y < 176 && x > 76 && x < 404) ||
      (x > 220 && x < 260 && y > 86) ||
      (Math.abs(x - 96) < 20 && y > 96 && y < 170) ||
      (Math.abs(x - 384) < 20 && y > 96 && y < 170);

    // Grass tufts
    for (let i = 0; i < 110; i += 1) {
      const x = Math.round(rand() * (W - 8) + 4);
      const y = Math.round(rand() * (H - 8) + 4);
      if (onPath(x, y)) continue;
      g.fillStyle = rand() > 0.5 ? '#2c6a4f' : '#3a8762';
      g.fillRect(x, y, 1, 3);
      g.fillRect(x + 2, y - 1, 1, 4);
      g.fillRect(x + 4, y + 1, 1, 2);
    }

    // Flowers
    const petals = ['#ff8fb1', '#ffd36b', '#9fd8ff', '#c9a2ff'];
    for (let i = 0; i < 26; i += 1) {
      const x = Math.round(rand() * (W - 10) + 5);
      const y = Math.round(rand() * (H - 10) + 5);
      if (onPath(x, y)) continue;
      g.fillStyle = petals[i % petals.length];
      g.fillRect(x - 1, y, 3, 1);
      g.fillRect(x, y - 1, 1, 3);
      g.fillStyle = '#fff6d6';
      g.fillRect(x, y, 1, 1);
    }

    // Glowing mushrooms in the corners, nodding to the Triends planet.
    const mushroom = (x, y, cap) => {
      g.fillStyle = '#d9cfe8';
      g.fillRect(x - 1, y - 4, 3, 5);
      g.fillStyle = cap;
      g.fillRect(x - 4, y - 7, 9, 3);
      g.fillRect(x - 3, y - 8, 7, 1);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(x - 2, y - 7, 1, 1);
      g.fillRect(x + 2, y - 6, 1, 1);
    };
    [[22, 40, '#9b6bff'], [36, 52, '#5bc8ff'], [450, 36, '#9b6bff'], [462, 280, '#5bc8ff'], [24, 270, '#ff7aa8'], [440, 214, '#9b6bff'], [150, 260, '#5bc8ff'], [330, 274, '#ff7aa8']].forEach(
      ([x, y, c]) => mushroom(x, y, c)
    );

    // Soft vignette
    const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);
  };

  /* ---------- Particles ---------- */

  const rand = mulberry32(42);
  const fireflies = Array.from({ length: 14 }, () => ({
    x: rand() * W,
    y: rand() * H,
    phase: rand() * Math.PI * 2,
    speed: 0.4 + rand() * 0.6
  }));

  const sparks = portals.map(() =>
    Array.from({ length: 7 }, () => ({ ox: rand() * 30 - 15, t: rand(), speed: 0.35 + rand() * 0.4 }))
  );

  /* ---------- Drawing helpers ---------- */

  const pixelEllipse = (cx, cy, rx, ry, color) => {
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y += 1) {
      const half = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2));
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
    }
  };

  const withAlpha = (hex, alpha) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  const drawPortal = (portal, index) => {
    const isActive = portal === currentPortal;
    const pulse = reduceMotion ? 0.5 : (Math.sin(clock * 3 + index) + 1) / 2;

    pixelEllipse(portal.x, portal.y, 30, 11, withAlpha(portal.color, 0.12 + pulse * 0.1));
    pixelEllipse(portal.x, portal.y, 24, 8, withAlpha(portal.color, 0.5));
    pixelEllipse(portal.x, portal.y, 18, 5, '#071214');
    pixelEllipse(portal.x, portal.y, 14, 3, withAlpha(portal.color, isActive ? 0.95 : 0.55));

    // Rising sparks
    sparks[index].forEach((s) => {
      const t = (s.t + (reduceMotion ? 0 : clock * s.speed)) % 1;
      ctx.fillStyle = withAlpha(portal.color, (1 - t) * (isActive ? 1 : 0.7));
      ctx.fillRect(Math.round(portal.x + s.ox * (1 - t * 0.4)), Math.round(portal.y - t * 46), 2, 2);
    });
  };

  // Drawn after the characters so the astronaut never hides a label;
  // the active label floats above the astronaut's head.
  const drawPortalLabel = (portal) => {
    const isActive = portal === currentPortal;
    ctx.font = `8px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bob = isActive && !reduceMotion ? Math.round(Math.sin(clock * 6) * 2) : 0;
    const labelY = (isActive ? Math.max(12, Math.round(player.y) - 74) : portal.y - 34) - bob;
    const width = Math.ceil(ctx.measureText(portal.label).width) + 10;
    ctx.fillStyle = isActive ? portal.color : 'rgba(0,0,0,0.75)';
    ctx.fillRect(Math.round(portal.x - width / 2), labelY - 7, width, 14);
    ctx.fillStyle = isActive ? '#06080b' : portal.color;
    ctx.fillText(portal.label, portal.x, labelY + 1);
    if (isActive) {
      ctx.fillStyle = portal.color;
      ctx.fillRect(portal.x - 3, labelY + 8, 7, 1);
      ctx.fillRect(portal.x - 2, labelY + 9, 5, 1);
      ctx.fillRect(portal.x - 1, labelY + 10, 3, 1);
    }
  };

  const drawCharacter = (who, img, frameSize, footOffset) => {
    pixelEllipse(who.x, who.y, 10, 3, 'rgba(0,0,0,0.35)');
    if (!img) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(who.x - 6, who.y - 20, 12, 20);
      return;
    }
    const col = who.moving ? Math.floor(who.frameTime * 8) % 4 : 0;
    const row = DIR_ROW[who.dir];
    ctx.drawImage(
      img,
      col * frameSize,
      row * frameSize,
      frameSize,
      frameSize,
      Math.round(who.x - frameSize / 2),
      Math.round(who.y - footOffset),
      frameSize,
      frameSize
    );
  };

  const render = () => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0);

    portals.forEach(drawPortal);

    const actors = [
      { who: insam, img: sprites.insam, size: 48, foot: 44 },
      { who: player, img: sprites.astronaut, size: 64, foot: 60 }
    ].sort((a, b) => a.who.y - b.who.y);
    actors.forEach((a) => drawCharacter(a.who, a.img, a.size, a.foot));

    portals.forEach(drawPortalLabel);

    fireflies.forEach((f) => {
      const glow = reduceMotion ? 0.6 : (Math.sin(clock * 2 * f.speed + f.phase) + 1) / 2;
      const x = f.x + (reduceMotion ? 0 : Math.sin(clock * f.speed + f.phase) * 6);
      const y = f.y + (reduceMotion ? 0 : Math.cos(clock * f.speed * 0.8 + f.phase) * 4);
      ctx.fillStyle = `rgba(216, 255, 138, ${0.15 + glow * 0.75})`;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    });
  };

  /* ---------- Simulation ---------- */

  const setDirFromDelta = (who, dx, dy) => {
    if (Math.abs(dx) > Math.abs(dy)) who.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) who.dir = dy > 0 ? 'down' : 'up';
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const update = (dt) => {
    let dx = 0;
    let dy = 0;

    if (active && !entering) {
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (keys.has('up')) dy -= 1;
      if (keys.has('down')) dy += 1;

      if (dx || dy) {
        target = null;
      } else if (target) {
        const tx = target.x - player.x;
        const ty = target.y - player.y;
        const dist = Math.hypot(tx, ty);
        if (dist < 2) target = null;
        else {
          dx = tx / dist;
          dy = ty / dist;
        }
      }
    }

    const len = Math.hypot(dx, dy);
    player.moving = len > 0;
    if (player.moving) {
      dx /= len;
      dy /= len;
      player.x = clamp(player.x + dx * SPEED * dt, 18, W - 18);
      player.y = clamp(player.y + dy * SPEED * dt, 44, H - 6);
      setDirFromDelta(player, dx, dy);
      player.frameTime += dt;
      if (!hasMoved) {
        hasMoved = true;
        window.JB?.unlock('first-steps');
      }
    }

    // Insam trails behind the astronaut.
    const fx = player.x - insam.x;
    const fy = player.y - insam.y;
    const followDist = Math.hypot(fx, fy);
    insam.moving = followDist > 30;
    if (insam.moving) {
      const step = Math.min(followDist - 30, SPEED * 1.05 * dt);
      insam.x += (fx / followDist) * step;
      insam.y += (fy / followDist) * step;
      setDirFromDelta(insam, fx, fy);
      insam.frameTime += dt;
    }

    const found = portals.find((p) => Math.hypot((player.x - p.x) / 1.6, player.y - p.y) < 14) || null;
    if (found !== currentPortal) {
      currentPortal = found;
      updatePrompt();
    }
  };

  const updatePrompt = () => {
    if (!currentPortal || !active) {
      promptEl.textContent = '';
      return;
    }
    promptEl.style.setProperty('--prompt-color', currentPortal.color);
    promptEl.innerHTML =
      lastInput === 'pointer'
        ? `Tap again to enter <strong>${currentPortal.label}</strong>`
        : `Press <kbd>E</kbd> to enter <strong>${currentPortal.label}</strong>`;
  };

  const enter = (portal) => {
    if (entering) return;
    entering = true;
    window.JB?.unlock('warp');
    if (performance.now() - startedAt < 5000) window.JB?.unlock('speedrun');
    flash.classList.add('is-on');
    setTimeout(() => {
      window.location.href = portal.href;
    }, reduceMotion ? 0 : 320);
  };

  /* ---------- Loop ---------- */

  const frame = (time) => {
    const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;
    clock += dt;
    update(dt);
    render();
    rafId = visible && !document.hidden ? requestAnimationFrame(frame) : null;
  };

  const startLoop = () => {
    if (rafId === null) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  };

  /* ---------- Sizing ---------- */

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = screen.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / W;
    render();
  };

  /* ---------- Input ---------- */

  const KEY_MAP = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down'
  };

  const activate = () => {
    if (!startedAt) startedAt = performance.now();
    active = true;
    startBtn.hidden = true;
    canvas.focus({ preventScroll: true });
    updatePrompt();
  };

  const deactivate = () => {
    active = false;
    keys.clear();
    target = null;
    if (!entering) {
      startLabel.textContent = '▶ Resume';
      startBtn.hidden = false;
    }
    updatePrompt();
  };

  startBtn.addEventListener('click', (event) => {
    lastInput = event.pointerType === 'touch' || event.pointerType === 'pen' ? 'pointer' : lastInput;
    activate();
  });

  canvas.addEventListener('blur', deactivate);

  canvas.addEventListener('keydown', (event) => {
    if (!active) return;
    const dir = KEY_MAP[event.key];
    if (dir) {
      event.preventDefault();
      keys.add(dir);
      if (lastInput !== 'keys') {
        lastInput = 'keys';
        updatePrompt();
      }
      return;
    }
    if (event.key === 'e' || event.key === 'E' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (currentPortal) enter(currentPortal);
    }
    if (event.key === 'Escape') canvas.blur();
  });

  canvas.addEventListener('keyup', (event) => {
    const dir = KEY_MAP[event.key];
    if (dir) keys.delete(dir);
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!active) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    lastInput = 'pointer';

    const tapped = portals.find((p) => Math.hypot((x - p.x) / 1.6, y - p.y) < 26 || (Math.abs(x - p.x) < 40 && y > p.y - 44 && y < p.y));
    if (tapped && tapped === currentPortal) {
      enter(tapped);
      return;
    }
    target = tapped ? { x: tapped.x, y: tapped.y } : { x: clamp(x, 18, W - 18), y: clamp(y, 44, H - 6) };
    updatePrompt();
  });

  /* ---------- Boot ---------- */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
    }).observe(root);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) startLoop();
  });

  window.addEventListener('pageshow', (event) => {
    // Coming back via the browser's back button restores this page from cache.
    if (event.persisted) {
      entering = false;
      flash.classList.remove('is-on');
    }
  });

  paintBackground();

  Promise.all([
    loadImage('triends-demo-assets/characters/astronaut_walking.png'),
    loadImage('triends-demo-assets/characters/ginseng_walking.png'),
    document.fonts ? document.fonts.load(`8px ${PIXEL_FONT}`).catch(() => {}) : null
  ]).then(([astronaut, insamImg]) => {
    sprites.astronaut = astronaut;
    sprites.insam = insamImg;
    render();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(screen);
  else window.addEventListener('resize', resize);
  resize();
  startLoop();
})();
