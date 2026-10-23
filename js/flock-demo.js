/* Desktop Follower demo: a web re-creation of the macOS app's behaviour
   (conga-line follow, look at the cursor, tumble on fast flicks, wave on
   right-click, get bored when idle) using Triends sprites. Clicking the
   window lets the pets hop out and follow the visitor around the site
   (see follower.js). */
(() => {
  const canvas = document.querySelector('[data-flock-demo]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = 480;
  const H = 270;
  const GROUND_TOP = 34;
  const FONT = '"Galmuri7", ui-monospace, monospace';
  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
  const FLICK_SPEED = 1300; // world px per second
  const TUMBLE_COOLDOWN = 4;

  // Same idea as Personality.swift: one system, different numbers per character.
  const pets = [
    { src: 'triends-demo-assets/characters/astronaut_walking.png', frame: 64, foot: 60, speed: 118, gap: 44, clumsy: 0.45, boredAfter: 2.4 },
    { src: 'triends-demo-assets/characters/ginseng_walking.png', frame: 48, foot: 44, speed: 138, gap: 42, clumsy: 0.85, boredAfter: 1.8 }
  ].map((p, i) => ({
    ...p,
    img: null,
    x: 200 - i * 30,
    y: 190 + i * 6,
    dir: 'down',
    state: 'rest',
    stateT: 0,
    idleT: 0,
    frameT: 0,
    jumpT: -1,
    waveT: -1,
    cooldown: 0,
    boredDir: 'down'
  }));

  let pointer = null;
  let lastPointer = null;
  let flickSpeed = 0;
  let scale = 1;
  let rafId = null;
  let last = 0;
  let clock = 0;
  let visible = true;
  let out = false;
  let ripples = [];
  let leaving = false;
  const recallBtn = document.querySelector('[data-pets-recall]');
  const figure = canvas.closest('figure') || canvas;

  const toWorld = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H
    };
  };

  const faceToward = (pet, tx, ty) => {
    const dx = tx - pet.x;
    const dy = ty - pet.y;
    if (Math.abs(dx) > Math.abs(dy)) pet.dir = dx > 0 ? 'right' : 'left';
    else pet.dir = dy > 0 ? 'down' : 'up';
  };

  const setState = (pet, state) => {
    if (pet.state === state) return;
    pet.state = state;
    pet.stateT = 0;
  };

  const update = (dt) => {
    clock += dt;
    flickSpeed *= Math.pow(0.02, dt);
    if (out) return;

    pets.forEach((pet, i) => {
      pet.stateT += dt;
      pet.frameT += dt;
      pet.cooldown = Math.max(0, pet.cooldown - dt);
      if (pet.jumpT >= 0) pet.jumpT = pet.jumpT + dt > 0.45 ? -1 : pet.jumpT + dt;
      if (pet.waveT >= 0) pet.waveT = pet.waveT + dt > 1.1 ? -1 : pet.waveT + dt;

      if (pet.state === 'tumble') {
        if (pet.stateT > 1.1) setState(pet, 'rest');
        return;
      }

      const leader = i === 0 ? pointer && { x: pointer.x, y: Math.max(GROUND_TOP + 30, pointer.y + 18) } : pets[i - 1];
      if (!leader) {
        idle(pet, dt);
        return;
      }

      const dx = leader.x - pet.x;
      const dy = leader.y - pet.y;
      const dist = Math.hypot(dx, dy);

      if (dist > pet.gap) {
        const step = Math.min(dist - pet.gap, pet.speed * dt * (dist > pet.gap * 3 ? 1.6 : 1));
        pet.x += (dx / dist) * step;
        pet.y += (dy / dist) * step;
        faceToward(pet, leader.x, leader.y);
        setState(pet, 'move');
        pet.idleT = 0;

        // A fast flick of the cursor can trip a moving pet over.
        if (flickSpeed > FLICK_SPEED && pet.cooldown === 0 && Math.random() < pet.clumsy * dt * 6) {
          setState(pet, 'tumble');
          pet.cooldown = TUMBLE_COOLDOWN;
        }
      } else {
        idle(pet, dt);
        if (pointer && pet.state === 'rest') faceToward(pet, pointer.x, pointer.y);
      }

      pet.x = Math.max(20, Math.min(W - 20, pet.x));
      pet.y = Math.max(GROUND_TOP + 30, Math.min(H - 8, pet.y));
    });
  };

  const idle = (pet, dt) => {
    pet.idleT += dt;
    if (pet.idleT > pet.boredAfter) {
      if (pet.state !== 'bored') {
        setState(pet, 'bored');
        pet.boredDir = pet.dir;
      }
      // Glance around now and then, like the app's idle "bored" loop.
      if (pet.stateT > 1.3) {
        pet.stateT = 0;
        const options = ['left', 'right', 'down'].filter((d) => d !== pet.dir);
        pet.dir = options[Math.floor(Math.random() * options.length)];
      }
    } else if (pet.state !== 'rest') {
      setState(pet, 'rest');
    }
  };

  /* ---------- Drawing ---------- */

  const drawDesktop = () => {
    ctx.fillStyle = '#172426';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1f3133';
    for (let y = GROUND_TOP + 6; y < H; y += 12) {
      for (let x = 6; x < W; x += 12) ctx.fillRect(x, y, 1, 1);
    }

    // Menu bar
    ctx.fillStyle = '#fff6dc';
    ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = '#2b1d2e';
    ctx.fillRect(0, 16, W, 2);
    ctx.font = `8px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('Desktop Follower', 10, 8);
    ctx.textAlign = 'right';
    ctx.fillText('9:41', W - 10, 8);
    // Sprout icon in the menu bar
    const ix = W - 48;
    ctx.fillStyle = '#38b764';
    ctx.fillRect(ix, 4, 3, 2);
    ctx.fillRect(ix + 4, 3, 3, 2);
    ctx.fillStyle = '#e3c991';
    ctx.fillRect(ix + 1, 6, 5, 6);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#5d7a7b';
    ctx.fillText(out ? 'they are out on the site — come back here to call them home' : 'move · right-click: wave · flick fast: tumble · click: take them along', 10, H - 10);
  };

  const drawPet = (pet) => {
    const size = pet.frame;
    const hop = pet.jumpT >= 0 ? Math.sin((pet.jumpT / 0.45) * Math.PI) * 16 : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(pet.x - 9), Math.round(pet.y - 1), 18, 3);

    if (!pet.img) return;

    if (pet.state === 'tumble') {
      // Fallen over: lie on the side, with little stars circling.
      ctx.save();
      ctx.translate(Math.round(pet.x), Math.round(pet.y - 8));
      ctx.rotate(pet.dir === 'left' ? -Math.PI / 2 : Math.PI / 2);
      ctx.drawImage(pet.img, 0, DIR_ROW.down * size, size, size, -size / 2, -pet.foot + 8, size, size);
      ctx.restore();
      if (!reduceMotion) {
        ctx.fillStyle = '#ffcd75';
        for (let s = 0; s < 3; s += 1) {
          const a = clock * 5 + (s * Math.PI * 2) / 3;
          ctx.fillRect(Math.round(pet.x + Math.cos(a) * 12), Math.round(pet.y - 26 + Math.sin(a) * 4), 2, 2);
        }
      }
      return;
    }

    const moving = pet.state === 'move';
    const col = moving ? Math.floor(pet.frameT * 8) % 4 : 0;
    ctx.drawImage(
      pet.img,
      col * size,
      DIR_ROW[pet.dir] * size,
      size,
      size,
      Math.round(pet.x - size / 2),
      Math.round(pet.y - pet.foot - hop),
      size,
      size
    );

    if (pet.waveT >= 0) {
      ctx.font = `8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6dc';
      const by = Math.round(pet.y - pet.foot - 6);
      ctx.fillRect(Math.round(pet.x - 12), by - 8, 24, 11);
      ctx.fillStyle = '#b13e53';
      ctx.fillText('hi!', Math.round(pet.x), by - 2);
    } else if (pet.state === 'bored' && pet.idleT > 6) {
      ctx.font = `8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#41a6f6';
      ctx.fillText('z', Math.round(pet.x + 12), Math.round(pet.y - pet.foot + 4 - (Math.floor(clock * 2) % 2) * 2));
    }
  };

  // Pixel arrow cursor, drawn in-canvas so the scene reads on its own.
  const CURSOR = ['X', 'XX', 'XOX', 'XOOX', 'XOOOX', 'XOOOOX', 'XOOOOOX', 'XOOOXXXX', 'XOXOX', 'XX XOX', 'X  XOX', '    XX'];
  const drawCursor = () => {
    if (!pointer) return;
    const ox = Math.round(pointer.x);
    const oy = Math.round(pointer.y);
    CURSOR.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === ' ') return;
        ctx.fillStyle = c === 'X' ? '#2b1d2e' : '#fff6dc';
        ctx.fillRect(ox + x, oy + y, 1, 1);
      });
    });
  };

  const render = () => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawDesktop();
    // Rings spreading from where the pets broke out of the screen.
    ripples = ripples.filter((r) => r.t < 1);
    ripples.forEach((r) => {
      r.t += 1 / 40;
      const rad = Math.round(6 + r.t * 46);
      ctx.fillStyle = r.t < 0.5 ? '#fff6dc' : '#5d7a7b';
      for (let a = 0; a < 24; a += 1) {
        const ang = (a / 24) * Math.PI * 2;
        ctx.fillRect(Math.round(r.x + Math.cos(ang) * rad), Math.round(r.y + Math.sin(ang) * rad * 0.6), 2, 2);
      }
    });
    if (out) {
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6dc';
      ctx.fillText("They're out!", W / 2, H / 2 - 10);
      ctx.font = `8px ${FONT}`;
      ctx.fillStyle = '#9fb3b3';
      ctx.fillText('Move your cursor anywhere on the site.', W / 2, H / 2 + 12);
    } else {
      [...pets].sort((a, b) => a.y - b.y).forEach(drawPet);
    }
    drawCursor();
  };

  /* ---------- Loop ---------- */

  const frame = (time) => {
    const dt = Math.min((time - last) / 1000 || 0, 0.05);
    last = time;
    update(dt);
    render();
    rafId = visible && !document.hidden ? requestAnimationFrame(frame) : null;
  };

  const start = () => {
    if (rafId !== null) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / W;
    render();
  };

  /* ---------- Input ---------- */

  canvas.addEventListener('pointermove', (event) => {
    const p = toWorld(event);
    const now = performance.now();
    if (lastPointer) {
      const dt = Math.max((now - lastPointer.t) / 1000, 0.001);
      const speed = Math.hypot(p.x - lastPointer.x, p.y - lastPointer.y) / dt;
      flickSpeed = Math.max(flickSpeed * 0.6, speed);
    }
    lastPointer = { ...p, t: now };
    pointer = p;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer = null;
    lastPointer = null;
  });

  // Click: the pets jump, then hop out of the window onto the page.
  canvas.addEventListener('pointerdown', (event) => {
    pointer = toWorld(event);
    if (event.button === 2 || out || leaving || !window.JBPets) return;
    leaving = true;
    // Keep whatever way each pet is facing; they leave the screen looking that way.
    pets.forEach((pet) => {
      if (pet.state === 'tumble') pet.state = 'rest';
      pet.jumpT = 0;
    });
    // Release at the top of the hop so the page sprites take over mid-air.
    setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      const k = rect.width / W; // CSS px per canvas px
      // Land on the window's top edge if it's on screen, otherwise just below it.
      const landY = rect.top > 70 ? rect.top - 2 : Math.min(rect.bottom + 44, window.innerHeight - 12);
      const starts = pets.map((pet, i) => {
        const hop = pet.jumpT >= 0 ? Math.sin((pet.jumpT / 0.45) * Math.PI) * 16 : 0;
        const x = rect.left + pet.x * k;
        return {
          x,
          y: rect.top + (pet.y - hop) * k,
          size: Math.round(pet.frame * k),
          dir: pet.dir,
          landX: x + (i === 0 ? 30 : -30),
          landY
        };
      });
      leaving = false;
      figure.classList.remove('is-shaking');
      void figure.offsetWidth;
      figure.classList.add('is-shaking');
      ripples = pets.map((pet) => ({ x: pet.x, y: pet.y - 20, t: 0 }));
      window.JBPets.release(starts);
    }, 200);
  });

  const setOut = (value) => {
    out = value;
    if (recallBtn) recallBtn.hidden = !out;
    if (!out) {
      pets.forEach((pet, i) => {
        pet.x = W / 2 - i * 34;
        pet.y = 200;
        pet.state = 'rest';
        pet.jumpT = 0;
      });
    }
    render();
  };

  document.addEventListener('jb:pets', (event) => setOut(event.detail.out));
  if (recallBtn) recallBtn.addEventListener('click', () => window.JBPets && window.JBPets.recall());

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    pets.forEach((pet) => {
      if (pet.state !== 'tumble') pet.waveT = 0;
    });
  });

  /* ---------- Boot ---------- */

  pets.forEach((pet) => {
    const img = new Image();
    img.onload = () => {
      pet.img = img;
      render();
    };
    img.src = pet.src;
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) start();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  if (document.fonts) document.fonts.load(`8px ${FONT}`).then(render).catch(() => {});
  resize();
  setOut(Boolean(window.JBPets && window.JBPets.isOut()));
  start();
})();
