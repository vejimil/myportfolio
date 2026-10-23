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
    { label: 'TRIENDS', href: 'triends.html', color: '#38b764', ink: '#fff6dc', x: 96, y: 104 },
    { label: 'WORLD OF WORDS', href: 'world-of-words.html', color: '#ef7d57', ink: '#2b1d2e', x: 240, y: 84 },
    { label: 'ARCADE', href: 'arcade-games.html', color: '#3b5dc9', ink: '#fff6dc', x: 384, y: 104 }
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

  // Palette shared with style.css so the map reads as part of the page.
  const C = {
    ink: '#2b1d2e',
    soft: '#5d4858',
    paper: '#f6ebcd',
    speck: '#e6d09f',
    cream: '#fff6dc',
    bevel: '#e3c991',
    green: '#38b764',
    teal: '#257179',
    red: '#b13e53',
    blue: '#3b5dc9'
  };

  /* A parchment world map drawn in ink: dotted routes, trees, a pond,
     mushrooms and a compass. Painted once into an offscreen canvas. */
  const paintBackground = () => {
    const g = background.getContext('2d');
    const rand = mulberry32(7);
    const px = (x, y, w = 1, h = 1) => g.fillRect(Math.round(x), Math.round(y), w, h);

    g.fillStyle = C.paper;
    g.fillRect(0, 0, W, H);
    g.fillStyle = C.speck;
    for (let i = 0; i < 900; i += 1) px(rand() * W, rand() * H);

    // Inner map border
    g.fillStyle = C.bevel;
    px(6, 6, W - 12, 1);
    px(6, H - 7, W - 12, 1);
    px(6, 6, 1, H - 12);
    px(W - 7, 6, 1, H - 12);

    // Dotted ink routes from the start point to each portal.
    g.fillStyle = C.soft;
    const dots = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      for (let d = 0; d <= len; d += 6) px(x1 + ((x2 - x1) * d) / len - 1, y1 + ((y2 - y1) * d) / len - 1, 2, 2);
    };
    dots(96, 158, 384, 158);
    dots(240, H - 10, 240, 96);
    dots(96, 114, 96, 158);
    dots(384, 114, 384, 158);

    const onRoute = (x, y) =>
      (Math.abs(y - 158) < 10 && x > 80 && x < 400) ||
      (Math.abs(x - 240) < 10 && y > 80) ||
      (Math.abs(x - 96) < 12 && y > 70 && y < 166) ||
      (Math.abs(x - 384) < 12 && y > 70 && y < 166);

    // Pond
    const pond = (cx, cy, rx, ry) => {
      for (let y = -ry; y <= ry; y += 1) {
        const half = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2));
        g.fillStyle = C.ink;
        px(cx - half - 1, cy + y, half * 2 + 2, 1);
      }
      for (let y = -ry + 1; y <= ry - 1; y += 1) {
        const half = Math.round((rx - 1) * Math.sqrt(1 - (y / (ry - 1)) ** 2));
        g.fillStyle = C.blue;
        px(cx - half, cy + y, half * 2, 1);
      }
      g.fillStyle = C.cream;
      px(cx - 14, cy - 3, 8, 1);
      px(cx + 4, cy + 2, 10, 1);
      px(cx - 4, cy + 5, 6, 1);
    };
    pond(62, 246, 36, 14);

    // Trees: round canopy drawn row by row, ink outline, two greens.
    const CANOPY = [5, 9, 11, 13, 13, 13, 11, 7];
    const tree = (x, y) => {
      const top = y - 3 - CANOPY.length;
      g.fillStyle = C.ink;
      px(x - 1, y - 3, 3, 4);
      CANOPY.forEach((w, r) => px(x - Math.floor(w / 2) - 1, top + r - 1, w + 2, 3));
      CANOPY.forEach((w, r) => {
        g.fillStyle = r >= CANOPY.length - 3 ? C.teal : C.green;
        px(x - Math.floor(w / 2), top + r, w, 1);
      });
      g.fillStyle = C.cream;
      px(x - 3, top + 2, 2, 1);
    };
    [[30, 40], [46, 52], [22, 64], [446, 40], [460, 58], [432, 196], [452, 210], [136, 282], [356, 280], [418, 268], [150, 214]].forEach(([x, y]) => tree(x, y));

    // Triends-style mushrooms
    const mushroom = (x, y) => {
      g.fillStyle = C.ink;
      px(x - 5, y - 8, 11, 4);
      px(x - 4, y - 9, 9, 1);
      px(x - 2, y - 4, 5, 5);
      g.fillStyle = C.red;
      px(x - 4, y - 8, 9, 3);
      g.fillStyle = C.cream;
      px(x - 2, y - 7, 1, 1);
      px(x + 2, y - 6, 1, 1);
      px(x - 1, y - 4, 3, 4);
    };
    [[178, 112], [306, 116], [330, 222], [118, 196], [470, 126]].forEach(([x, y]) => mushroom(x, y));

    // Grass in soft ink
    g.fillStyle = C.soft;
    for (let i = 0; i < 90; i += 1) {
      const x = Math.round(rand() * (W - 24) + 12);
      const y = Math.round(rand() * (H - 24) + 12);
      if (onRoute(x, y) || (Math.abs(x - 62) < 44 && Math.abs(y - 246) < 20)) continue;
      px(x, y, 1, 2);
      px(x + 2, y - 1, 1, 3);
      px(x + 4, y, 1, 2);
    }

    // Compass rose, bottom right
    const cx = 452;
    const cy = 246;
    g.fillStyle = C.ink;
    px(cx, cy - 12, 1, 25);
    px(cx - 12, cy, 25, 1);
    px(cx - 1, cy - 8, 3, 5);
    g.fillStyle = C.red;
    px(cx - 1, cy - 11, 3, 3);
    g.fillStyle = C.ink;
    g.font = `8px ${PIXEL_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillText('N', cx, cy - 15);
  };

  /* ---------- Particles ---------- */

  const rand = mulberry32(42);
  const sparks = portals.map(() =>
    Array.from({ length: 6 }, () => ({ ox: rand() * 26 - 13, t: rand(), speed: 0.35 + rand() * 0.4 }))
  );

  /* ---------- Drawing helpers ---------- */

  const pixelEllipse = (cx, cy, rx, ry, color) => {
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y += 1) {
      const half = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2));
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
    }
  };

  // Portals are map markers: an ink-outlined pad in the project's colour.
  const drawPortal = (portal, index) => {
    const isActive = portal === currentPortal;
    const pulse = reduceMotion ? 0 : Math.round((Math.sin(clock * 3 + index) + 1) * 1.5);

    if (isActive) pixelEllipse(portal.x, portal.y, 30 + pulse, 12 + Math.round(pulse / 2), C.cream);
    pixelEllipse(portal.x, portal.y, 25, 10, C.ink);
    pixelEllipse(portal.x, portal.y, 22, 8, portal.color);
    pixelEllipse(portal.x, portal.y, 14, 4, C.ink);
    pixelEllipse(portal.x, portal.y, 12, 3, isActive ? C.cream : portal.color);

    sparks[index].forEach((s) => {
      const t = (s.t + (reduceMotion ? 0 : clock * s.speed)) % 1;
      if (t > (isActive ? 1 : 0.6)) return;
      ctx.fillStyle = t < 0.3 ? portal.color : C.ink;
      ctx.fillRect(Math.round(portal.x + s.ox * (1 - t * 0.4)), Math.round(portal.y - 4 - t * 40), 2, 2);
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
    const labelY = (isActive ? Math.max(14, Math.round(player.y) - 74) : portal.y - 34) - bob;
    const width = Math.ceil(ctx.measureText(portal.label).width) + 10;
    const left = Math.round(portal.x - width / 2);
    ctx.fillStyle = C.ink;
    ctx.fillRect(left - 2, labelY - 9, width + 4, 18);
    ctx.fillStyle = isActive ? portal.color : C.cream;
    ctx.fillRect(left, labelY - 7, width, 14);
    ctx.fillStyle = isActive ? portal.ink : C.ink;
    ctx.fillText(portal.label, portal.x, labelY + 1);
    if (isActive) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(portal.x - 3, labelY + 10, 7, 1);
      ctx.fillRect(portal.x - 2, labelY + 11, 5, 1);
      ctx.fillRect(portal.x - 1, labelY + 12, 3, 1);
    }
  };

  const drawCharacter = (who, img, frameSize, footOffset) => {
    pixelEllipse(who.x, who.y, 9, 2, C.speck);
    if (!img) {
      ctx.fillStyle = C.ink;
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
    paintBackground(); // repaint once the pixel font is ready (compass label)
    render();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(screen);
  else window.addEventListener('resize', resize);
  resize();
  startLoop();
})();
