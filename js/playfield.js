/* Home hero playfield: a side-on stage with three hand-placed entrances —
   Triends' mushroom house, World of Words' hanok gate, and an arcade
   cabinet. Walk the astronaut (Insam follows) to a door and press ↑ / E,
   or tap a door twice. */
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
  const GROUND = 232;
  const SPEED = 110;
  const GRAVITY = 520;
  const PIXEL_FONT = '"Galmuri7", ui-monospace, monospace';
  // Camera: the stage is painted on a 480x300 sheet; we show the part with the buildings.
  const VIEW = { x: 40, y: 50, w: 400, h: 250 };

  // Site palette (style.css): cream stage with ink outlines, like every other box on the page.
  const C = {
    ink: '#2b1d2e',
    deep: '#1c121e',
    cream: '#fff6dc',
    bevel: '#e3c991',
    shadow: '#cdb07a',
    soft: '#5d4858',
    red: '#b13e53',
    orange: '#ef7d57',
    yellow: '#ffcd75',
    green: '#38b764',
    teal: '#257179',
    blue: '#3b5dc9',
    sky: '#41a6f6'
  };

  const doors = [
    { label: 'TRIENDS', href: 'triends.html', x: 100, color: C.green, text: C.cream, box: [78, 150, 46, 82] },
    { label: 'WORLD OF WORDS', href: 'world-of-words.html', x: 240, color: C.orange, text: C.ink, box: [196, 146, 88, 86] },
    { label: 'ARCADE', href: 'arcade-games.html', x: 380, color: C.blue, text: C.cream, box: [350, 136, 60, 96] }
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
  const player = { x: 170, jump: 0, vy: 0, dir: 'down', moving: false, frameTime: 0, facing: 1 };
  const insam = { x: 144, jump: 0, vy: 0, dir: 'down', moving: false, frameTime: 0 };
  const keys = new Set();
  let target = null;
  let active = false;
  let entering = false;
  let hasMoved = false;
  let startedAt = 0;
  let lastInput = 'keys';
  let currentDoor = null;
  let visible = true;
  let rafId = null;
  let lastTime = 0;
  let clock = 0;
  let scale = 1;

  /* ---------- Static stage (painted once) ---------- */

  const stage = document.createElement('canvas');
  stage.width = W;
  stage.height = H;

  const paintStage = () => {
    const g = stage.getContext('2d');
    const R = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), w, h);
    };
    const outlined = (x, y, w, h, fill) => {
      R(x - 1, y - 1, w + 2, h + 2, C.ink);
      R(x, y, w, h, fill);
    };
    // A shape described as row widths, centred on cx, with a cream outline.
    const blob = (cx, top, widths, fill) => {
      widths.forEach((w, i) => R(cx - Math.floor(w / 2) - 1, top + i - 1, w + 2, 3, C.ink));
      widths.forEach((w, i) => R(cx - Math.floor(w / 2), top + i, w, 1, fill));
    };

    R(0, 0, W, H, C.cream);
    R(0, GROUND, W, 2, C.ink);

    /* Triends — mushroom house */
    outlined(80, 194, 40, 38, C.bevel);
    R(112, 194, 8, 38, C.shadow);
    outlined(93, 208, 14, 24, C.teal);
    R(103, 220, 2, 2, C.cream);
    outlined(84, 200, 6, 6, C.yellow);
    R(86, 200, 1, 6, C.ink);
    R(84, 202, 6, 1, C.ink);
    const cap = Array.from({ length: 30 }, (_, i) => 2 * Math.round(12 + 26 * Math.sqrt(i / 29)));
    blob(100, 164, cap, C.red);
    R(62, 193, 76, 2, C.soft);
    const spot = (x, y) => {
      R(x - 1, y, 3, 1, C.cream);
      R(x - 2, y + 1, 5, 2, C.cream);
      R(x - 1, y + 3, 3, 1, C.cream);
    };
    [[86, 180], [101, 169], [116, 182], [96, 186], [74, 188]].forEach(([x, y]) => spot(x, y));

    /* World of Words — hanok gate */
    const roof = Array.from({ length: 22 }, (_, i) => 2 * Math.round(20 + 28 * (i / 21) ** 0.8));
    blob(240, 152, roof, C.soft);
    for (let x = 204; x <= 276; x += 6) R(x, 158, 1, 14, C.ink);
    R(222, 150, 36, 2, C.ink);
    R(190, 170, 3, 2, C.ink); // upturned eaves
    R(287, 170, 3, 2, C.ink);
    outlined(204, 176, 72, 8, C.teal);
    for (let x = 208; x < 274; x += 6) R(x, 179, 2, 2, C.yellow);
    outlined(212, 185, 7, 47, C.orange);
    outlined(261, 185, 7, 47, C.orange);
    outlined(226, 187, 28, 11, C.cream);
    g.font = `8px ${PIXEL_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = C.ink;
    g.fillText('단어', 240, 193);

    /* Arcade — cabinet */
    outlined(350, 138, 60, 14, C.yellow);
    g.fillStyle = C.ink;
    g.fillText('ARCADE', 380, 146);
    outlined(354, 153, 52, 79, C.blue);
    R(356, 155, 1, 75, C.sky);
    outlined(360, 158, 40, 30, C.deep);
    outlined(356, 193, 48, 10, C.bevel);
    R(366, 187, 2, 7, C.ink);
    R(364, 185, 6, 4, C.red);
    R(381, 196, 4, 3, C.red);
    R(389, 196, 4, 3, C.yellow);
    outlined(372, 209, 16, 20, C.ink);
    R(378, 215, 4, 1, C.yellow);
    R(378, 221, 4, 1, C.yellow);
  };

  /* ---------- Animated details ---------- */

  const GLYPHS = ['あ', 'é', 'ñ', '가'];
  const cards = GLYPHS.map((glyph, i) => ({ glyph, x: 216 + i * 14, t: i / GLYPHS.length, speed: 0.22 + (i % 2) * 0.06 }));
  const pong = { bx: 380, by: 172, vx: 34, vy: 22, l: 172, r: 172 };

  const drawDetails = (dt) => {
    // Sprout on the mushroom roof
    const sway = reduceMotion ? 0 : Math.round(Math.sin(clock * 2.2));
    ctx.fillStyle = C.green;
    ctx.fillRect(100, 156, 1, 8);
    ctx.fillRect(95 + sway, 154, 5, 3);
    ctx.fillRect(101 + sway, 152, 5, 3);

    // Word cards falling like the Acid Rain game, above the gate
    ctx.font = `8px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    cards.forEach((card) => {
      const t = reduceMotion ? card.t : (card.t + clock * card.speed) % 1;
      const y = Math.round(100 + t * 40);
      if (t > 0.92) return;
      ctx.fillStyle = C.ink;
      ctx.fillRect(card.x - 7, y - 5, 14, 11);
      ctx.fillStyle = C.cream;
      ctx.fillRect(card.x - 6, y - 4, 12, 9);
      ctx.fillStyle = C.ink;
      ctx.fillText(card.glyph, card.x, y + 1);
    });

    // A tiny Pong match on the cabinet screen
    if (!reduceMotion) {
      pong.bx += pong.vx * dt;
      pong.by += pong.vy * dt;
      if (pong.by < 161 || pong.by > 184) pong.vy *= -1;
      if (pong.bx < 364 || pong.bx > 395) pong.vx *= -1;
      pong.l += (pong.by - pong.l) * Math.min(1, dt * 6);
      pong.r += (pong.by - pong.r) * Math.min(1, dt * 5);
    }
    ctx.fillStyle = C.soft;
    for (let y = 160; y < 187; y += 4) ctx.fillRect(380, y, 1, 2);
    ctx.fillStyle = C.green;
    ctx.fillRect(362, Math.round(pong.l) - 3, 1, 7);
    ctx.fillStyle = C.sky;
    ctx.fillRect(397, Math.round(pong.r) - 3, 1, 7);
    ctx.fillStyle = C.yellow;
    ctx.fillRect(Math.round(pong.bx), Math.round(pong.by), 2, 2);
  };

  const drawDoorHighlight = (door) => {
    const bob = reduceMotion ? 0 : Math.round(Math.sin(clock * 6) * 2);
    const [bx, by, bw] = door.box;
    const ax = door.x;
    const ay = by - 12 + bob;
    ctx.fillStyle = C.ink;
    ctx.fillRect(ax - 4, ay, 9, 2);
    ctx.fillRect(ax - 3, ay + 2, 7, 1);
    ctx.fillRect(ax - 2, ay + 3, 5, 1);
    ctx.fillRect(ax - 1, ay + 4, 3, 1);
    // Light spilling onto the ground in front of the door
    ctx.fillStyle = door.color;
    ctx.fillRect(bx + 4, GROUND + 2, bw - 8, 2);
  };

  const drawLabel = (door) => {
    const isActive = door === currentDoor;
    ctx.font = `8px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = GROUND + 22;
    const width = Math.ceil(ctx.measureText(door.label).width) + 10;
    const left = Math.round(door.x - width / 2);
    if (isActive) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(left - 1, y - 8, width + 2, 16);
      ctx.fillStyle = door.color;
      ctx.fillRect(left, y - 7, width, 14);
      ctx.fillStyle = door.text;
    } else {
      ctx.fillStyle = C.soft;
    }
    ctx.fillText(door.label, door.x, y + 1);
  };

  const drawCharacter = (who, img, frameSize, footOffset) => {
    const feet = GROUND - Math.round(who.jump);
    ctx.fillStyle = C.bevel;
    ctx.fillRect(Math.round(who.x - 8), GROUND - 3, 16, 2);
    if (!img) return;
    const col = who.moving ? Math.floor(who.frameTime * 8) % 4 : 0;
    ctx.drawImage(
      img,
      col * frameSize,
      DIR_ROW[who.dir] * frameSize,
      frameSize,
      frameSize,
      Math.round(who.x - frameSize / 2),
      Math.round(feet - footOffset),
      frameSize,
      frameSize
    );
  };

  const render = (dt = 0) => {
    ctx.setTransform(scale, 0, 0, scale, -VIEW.x * scale, -VIEW.y * scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(stage, 0, 0);
    drawDetails(dt);
    if (currentDoor) drawDoorHighlight(currentDoor);
    drawCharacter(insam, sprites.insam, 48, 44);
    drawCharacter(player, sprites.astronaut, 64, 60);
    doors.forEach(drawLabel);
  };

  /* ---------- Simulation ---------- */

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const physics = (who, dt) => {
    if (who.jump > 0 || who.vy > 0) {
      who.vy -= GRAVITY * dt;
      who.jump = Math.max(0, who.jump + who.vy * dt);
      if (who.jump === 0) who.vy = 0;
    }
  };

  const jump = () => {
    if (player.jump > 0) return;
    player.vy = 170;
    setTimeout(() => {
      if (insam.jump === 0) insam.vy = 150;
    }, 120);
  };

  const update = (dt) => {
    let dx = 0;
    if (active && !entering) {
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (dx) target = null;
      else if (target !== null) {
        const d = target - player.x;
        if (Math.abs(d) < 2) target = null;
        else dx = Math.sign(d);
      }
    }

    player.moving = dx !== 0;
    if (player.moving) {
      player.x = clamp(player.x + dx * SPEED * dt, VIEW.x + 14, VIEW.x + VIEW.w - 14);
      player.dir = dx > 0 ? 'right' : 'left';
      player.facing = dx;
      player.frameTime += dt;
      if (!hasMoved) {
        hasMoved = true;
        window.JB?.unlock('first-steps');
      }
    } else if (player.jump === 0) {
      player.dir = 'down';
    }

    // Insam trails a step behind the astronaut.
    const goal = player.x - 26 * player.facing;
    const gap = goal - insam.x;
    insam.moving = Math.abs(gap) > 3;
    if (insam.moving) {
      insam.x += Math.sign(gap) * Math.min(Math.abs(gap), SPEED * 1.1 * dt);
      insam.dir = gap > 0 ? 'right' : 'left';
      insam.frameTime += dt;
    } else {
      insam.dir = 'down';
    }

    physics(player, dt);
    physics(insam, dt);

    const found = doors.find((d) => Math.abs(player.x - d.x) < 16) || null;
    if (found !== currentDoor) {
      currentDoor = found;
      updatePrompt();
    }
  };

  const updatePrompt = () => {
    if (!currentDoor || !active) {
      promptEl.textContent = '';
      return;
    }
    promptEl.style.setProperty('--prompt-color', currentDoor.color);
    promptEl.innerHTML =
      lastInput === 'pointer'
        ? `Tap again to enter <strong>${currentDoor.label}</strong>`
        : `Press <kbd>↑</kbd> to enter <strong>${currentDoor.label}</strong>`;
  };

  const enter = (door) => {
    if (entering) return;
    entering = true;
    window.JB?.unlock('warp');
    if (performance.now() - startedAt < 5000) window.JB?.unlock('speedrun');
    flash.classList.add('is-on');
    setTimeout(() => {
      window.location.href = door.href;
    }, reduceMotion ? 0 : 320);
  };

  /* ---------- Loop ---------- */

  const frame = (time) => {
    const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;
    clock += dt;
    update(dt);
    render(dt);
    rafId = visible && !document.hidden ? requestAnimationFrame(frame) : null;
  };

  const startLoop = () => {
    if (rafId === null) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = screen.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / VIEW.w;
    render();
  };

  /* ---------- Input ---------- */

  const KEY_MAP = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right'
  };
  const ENTER_KEYS = new Set(['ArrowUp', 'w', 'W', 'e', 'E', 'Enter']);

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
    if (event.pointerType === 'touch' || event.pointerType === 'pen') lastInput = 'pointer';
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
    if (ENTER_KEYS.has(event.key)) {
      event.preventDefault();
      if (currentDoor) enter(currentDoor);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      jump();
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
    const x = VIEW.x + ((event.clientX - rect.left) / rect.width) * VIEW.w;
    const y = VIEW.y + ((event.clientY - rect.top) / rect.height) * VIEW.h;
    lastInput = 'pointer';
    const tapped = doors.find((d) => x > d.box[0] - 6 && x < d.box[0] + d.box[2] + 6 && y > d.box[1] - 16 && y < GROUND + 32);
    if (tapped && tapped === currentDoor) {
      enter(tapped);
      return;
    }
    target = tapped ? tapped.x : clamp(x, VIEW.x + 14, VIEW.x + VIEW.w - 14);
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

  paintStage();

  Promise.all([
    loadImage('triends-demo-assets/characters/astronaut_walking.png'),
    loadImage('triends-demo-assets/characters/ginseng_walking.png'),
    document.fonts ? Promise.all([document.fonts.load(`8px ${PIXEL_FONT}`), document.fonts.load(`8px ${PIXEL_FONT}`, '단어')]).catch(() => {}) : null
  ]).then(([astronaut, insamImg]) => {
    sprites.astronaut = astronaut;
    sprites.insam = insamImg;
    paintStage(); // repaint once the pixel font is ready (sign and marquee text)
    render();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(screen);
  else window.addEventListener('resize', resize);
  resize();
  startLoop();
})();
