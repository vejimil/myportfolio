/* Home hero playfield: a side-on gallery wall with three pixel frames
   holding real work — Triends key art, World of Words' Acid Rain game and a
   live Pong match. Walk the astronaut (Insam follows) to a frame and press
   ↑ / E, or tap a frame twice. */
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

  // Frames hang on the wall; box = [x, y, w, h] of the picture area.
  const FRAME = { w: 92, h: 58, top: 108 };
  const doors = [
    { label: 'TRIENDS', href: 'triends.html', x: 100, color: C.green, text: C.cream, art: 'assets/img/triends-cover.jpg' },
    { label: 'WORLD OF WORDS', href: 'world-of-words.html', x: 240, color: C.orange, text: C.ink, art: 'assets/img/wow-acid-rain-ja.jpg' },
    { label: 'ARCADE', href: 'arcade-games.html', x: 380, color: C.blue, text: C.cream, art: null }
  ].map((d) => ({ ...d, box: [d.x - FRAME.w / 2, FRAME.top, FRAME.w, FRAME.h] }));

  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  // Resolve only once the image is decoded: drawing a just-loaded but
  // undecoded image onto a canvas can silently produce a blank picture.
  const loadImage = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
        ready.then(() => resolve(img));
      };
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

  // Artwork is resampled to 2 samples per stage pixel, then drawn without
  // smoothing: detailed enough to read, still crisp like the rest of the scene.
  const ART_RES = 2;
  const pixelate = (img) => {
    const c = document.createElement('canvas');
    c.width = FRAME.w * ART_RES;
    c.height = FRAME.h * ART_RES;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    // cover-fit
    const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    return c;
  };

  const paintStage = () => {
    const g = stage.getContext('2d');
    g.imageSmoothingEnabled = false;
    const R = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), w, h);
    };

    R(0, 0, W, H, C.cream);
    R(0, GROUND, W, 2, C.ink);

    doors.forEach((door) => {
      const [x, y, w, h] = door.box;
      // String from both top corners of the frame up to a single nail.
      const nailY = y - 22;
      const hookL = x + 14;
      const hookR = x + w - 14;
      const top = y - 7;
      const steps = Math.max(1, Math.round(door.x - hookL));
      for (let i = 0; i <= steps; i += 1) {
        const k = i / steps;
        const sy = top + (nailY + 1 - top) * k;
        R(hookL + (door.x - hookL) * k, sy, 1, 1, C.soft);
        R(hookR + (door.x - hookR) * k, sy, 1, 1, C.soft);
      }
      R(door.x - 1, nailY - 1, 3, 3, C.ink);
      R(door.x, nailY - 1, 1, 1, C.bevel);
      // Frame: ink outline, wooden moulding, cream mat
      R(x - 7, y - 7, w + 14, h + 14, C.ink);
      R(x - 6, y - 6, w + 12, h + 12, C.yellow);
      R(x - 6, y + h + 3, w + 12, 3, C.shadow);
      R(x - 3, y - 3, w + 6, h + 6, C.ink);
      R(x - 2, y - 2, w + 4, h + 4, C.cream);
      R(x - 1, y - 1, w + 2, h + 2, C.ink);
      // Drop shadow on the wall
      R(x - 5, y + h + 7, w + 14, 2, C.bevel);
      R(x + w + 7, y - 5, 2, h + 14, C.bevel);
      if (door.pic) g.drawImage(door.pic, x, y, w, h);
      else R(x, y, w, h, C.deep);
    });
  };

  /* ---------- Animated details ---------- */

  const arcade = doors[2];
  const pong = { bx: 0, by: 0, vx: 46, vy: 30, l: 0, r: 0 };
  {
    const [x, y, w, h] = arcade.box;
    pong.bx = x + w / 2;
    pong.by = y + h / 2;
    pong.l = pong.r = pong.by;
  }

  const drawDetails = (dt) => {
    // A Pong match running inside the Arcade frame
    const [x, y, w, h] = arcade.box;
    if (!reduceMotion) {
      pong.bx += pong.vx * dt;
      pong.by += pong.vy * dt;
      if (pong.by < y + 3 || pong.by > y + h - 5) pong.vy *= -1;
      if (pong.bx < x + 8 || pong.bx > x + w - 10) pong.vx *= -1;
      pong.l += (pong.by - pong.l) * Math.min(1, dt * 6);
      pong.r += (pong.by - pong.r) * Math.min(1, dt * 5);
    }
    ctx.fillStyle = C.deep;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.soft;
    for (let yy = y + 3; yy < y + h - 2; yy += 6) ctx.fillRect(x + w / 2, yy, 1, 3);
    ctx.font = `8px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.bevel;
    ctx.fillText('3   5', x + w / 2 + 1, y + 4);
    ctx.fillStyle = C.green;
    ctx.fillRect(x + 5, Math.round(pong.l) - 6, 2, 12);
    ctx.fillStyle = C.sky;
    ctx.fillRect(x + w - 7, Math.round(pong.r) - 6, 2, 12);
    ctx.fillStyle = C.yellow;
    ctx.fillRect(Math.round(pong.bx), Math.round(pong.by), 3, 3);
  };

  const drawDoorHighlight = (door) => {
    const bob = reduceMotion ? 0 : Math.round(Math.sin(clock * 6) * 2);
    const [x, y, w, h] = door.box;
    // Frame lights up in the project's colour
    ctx.fillStyle = door.color;
    ctx.fillRect(x - 6, y - 6, w + 12, 3);
    ctx.fillRect(x - 6, y + h + 3, w + 12, 3);
    ctx.fillRect(x - 6, y - 6, 3, h + 12);
    ctx.fillRect(x + w + 3, y - 6, 3, h + 12);
    const ay = y - 30 + bob;
    ctx.fillStyle = C.ink;
    ctx.fillRect(door.x - 4, ay, 9, 2);
    ctx.fillRect(door.x - 3, ay + 2, 7, 1);
    ctx.fillRect(door.x - 2, ay + 3, 5, 1);
    ctx.fillRect(door.x - 1, ay + 4, 3, 1);
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
    if (leap) drawLeap(dt);
    else drawCharacter(player, sprites.astronaut, 64, 60);
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

  // Entering: the astronaut leaps up into the picture, shrinking as it goes
  // "into" the frame, then the screen flashes and the page opens.
  let leap = null;
  const LEAP_TIME = 0.55;
  const enter = (door) => {
    if (entering) return;
    entering = true;
    window.JB?.unlock('warp');
    if (performance.now() - startedAt < 5000) window.JB?.unlock('speedrun');
    const go = () => {
      flash.classList.add('is-on');
      setTimeout(() => {
        window.location.href = door.href;
      }, reduceMotion ? 0 : 260);
    };
    if (reduceMotion) {
      go();
      return;
    }
    const [x, y, w, h] = door.box;
    leap = { t: 0, door, fromX: player.x, fromY: GROUND - player.jump, toX: x + w / 2, toY: y + h * 0.7, go, done: false };
    player.dir = 'up';
    if (insam.jump === 0) insam.vy = 150;
  };

  const drawLeap = (dt) => {
    leap.t = Math.min(1, leap.t + dt / LEAP_TIME);
    const t = leap.t;
    const u = 1 - (1 - t) ** 2;
    const fx = leap.fromX + (leap.toX - leap.fromX) * u;
    const fy = leap.fromY + (leap.toY - leap.fromY) * u - Math.sin(t * Math.PI) * 34;
    const k = 1 - 0.75 * t * t; // shrink as it flies into the picture
    const img = sprites.astronaut;
    if (img && t < 1) {
      const size = 64 * k;
      ctx.save();
      const [bx, by, bw, bh] = leap.door.box;
      // Once over the frame, only the part inside the picture is visible.
      if (t > 0.55) {
        ctx.beginPath();
        ctx.rect(bx, by, bw, bh);
        ctx.clip();
      }
      ctx.drawImage(img, 0, DIR_ROW.up * 64, 64, 64, fx - size / 2, fy - size * (60 / 64), size, size);
      ctx.restore();
    }
    if (t >= 1 && !leap.done) {
      leap.done = true;
      leap.go();
    }
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
      leap = null;
      flash.classList.remove('is-on');
    }
  });

  paintStage();

  // Each asset paints as soon as it arrives; nothing waits on anything else.
  loadImage('triends-demo-assets/characters/astronaut_walking.png').then((img) => {
    sprites.astronaut = img;
    render();
  });
  loadImage('triends-demo-assets/characters/ginseng_walking.png').then((img) => {
    sprites.insam = img;
    render();
  });
  doors.forEach((d) => {
    if (!d.art) return;
    loadImage(d.art).then((img) => {
      if (!img) return;
      const apply = (tries) => {
        d.pic = pixelate(img);
        const c = d.pic.getContext('2d').getImageData(d.pic.width >> 1, d.pic.height >> 1, 1, 1).data;
        if (c[3] === 0 && tries > 0) {
          requestAnimationFrame(() => apply(tries - 1));
          return;
        }
        paintStage();
        render();
      };
      apply(5);
    });
  });
  if (document.fonts) document.fonts.load(`8px ${PIXEL_FONT}`).then(() => render()).catch(() => {});

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(screen);
  else window.addEventListener('resize', resize);
  resize();
  startLoop();
})();
