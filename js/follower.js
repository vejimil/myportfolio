/* Site pets: the astronaut and Insam stay in the Desktop Follower demo until
   the visitor clicks that window — then they hop out and follow the cursor
   around the whole site (until sent home). On touch screens they sit in the
   bottom-right corner instead of following. */
(() => {
  const JB = window.JB;
  if (!JB) return;

  const SCALE = 0.75;
  const followsPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
  const NAP_AFTER = 4000;
  const FLICK_SPEED = 2600; // CSS px per second
  const TUMBLE_COOLDOWN = 4000;

  const SPECIES = [
    { id: 'astronaut', walk: { src: 'triends-demo-assets/characters/astronaut_walking.png', frame: 64 }, gap: 48, clumsy: 0.45 },
    {
      id: 'insam',
      walk: { src: 'triends-demo-assets/characters/ginseng_walking.png', frame: 48 },
      flower: { src: 'triends-demo-assets/gimmicks/sunflower.png', frame: 64 },
      gap: 34,
      clumsy: 0.85
    }
  ];

  let pets = [];
  let mounted = false;
  let rafId = null;
  let last = 0;
  let target = null;
  let lastPointer = null;
  let flickSpeed = 0;
  let hiddenByPlayfield = false;
  let scrollTimer = null;

  /* ---------- Rendering ---------- */

  const paint = (pet, now) => {
    const sheet = now < pet.flowerUntil && pet.kind.flower ? pet.kind.flower : pet.kind.walk;
    const size = Math.round(sheet.frame * SCALE);
    const animating = pet.moving || sheet !== pet.kind.walk;
    const col = animating ? Math.floor(pet.frameT * 8) % 4 : 0;
    const row = sheet === pet.kind.walk ? DIR_ROW[pet.dir] : DIR_ROW.down;
    const s = pet.sprite.style;
    s.width = `${size}px`;
    s.height = `${size}px`;
    s.backgroundImage = `url("${sheet.src}")`;
    s.backgroundSize = `${size * 4}px ${size * 4}px`;
    s.backgroundPosition = `${-col * size}px ${-row * size}px`;
    pet.el.style.transform = `translate3d(${Math.round(pet.x - size / 2)}px, ${Math.round(pet.y - size)}px, 0)`;
    pet.el.classList.toggle('is-tumbling', now < pet.tumbleUntil);
    pet.el.classList.toggle('is-waving', now < pet.waveUntil);
  };

  /* ---------- Simulation ---------- */

  const step = (time) => {
    const dt = Math.min((time - last) / 1000 || 0, 0.05);
    last = time;
    flickSpeed *= Math.pow(0.02, dt);
    let busy = false;

    pets.forEach((pet, i) => {
      pet.frameT += dt;
      pet.moving = false;
      const leader = i === 0 ? target : pets[i - 1];

      if (time >= pet.tumbleUntil && leader && !hiddenByPlayfield && followsPointer) {
        const dx = leader.x - pet.x;
        const dy = leader.y - pet.y;
        const dist = Math.hypot(dx, dy);
        if (dist > pet.kind.gap) {
          const speed = Math.max(90, Math.min(380, dist * 2.4));
          const travel = Math.min(dist - pet.kind.gap, speed * dt);
          pet.x += (dx / dist) * travel;
          pet.y += (dy / dist) * travel;
          if (Math.abs(dx) > Math.abs(dy)) pet.dir = dx > 0 ? 'right' : 'left';
          else pet.dir = dy > 0 ? 'down' : 'up';
          pet.moving = true;
          pet.lastMoveAt = time;
          pet.el.classList.remove('is-sleeping');

          // A fast flick of the cursor can trip a walking pet over.
          if (flickSpeed > FLICK_SPEED && time > pet.cooldownUntil && Math.random() < pet.kind.clumsy * dt * 6) {
            pet.tumbleUntil = time + 1100;
            pet.cooldownUntil = time + TUMBLE_COOLDOWN;
          }
        }
      }

      if (!pet.moving && pet.dir !== 'down' && time - pet.lastMoveAt > 600) pet.dir = 'down';
      if (!pet.moving && time - pet.lastMoveAt > NAP_AFTER) pet.el.classList.add('is-sleeping');

      paint(pet, time);
      busy = busy || pet.moving || time < pet.flowerUntil || time < pet.tumbleUntil || time < pet.waveUntil || time - pet.lastMoveAt < NAP_AFTER + 50;
    });

    rafId = busy && !document.hidden ? requestAnimationFrame(step) : null;
  };

  const wake = () => {
    if (rafId === null && mounted) {
      last = performance.now();
      rafId = requestAnimationFrame(step);
    }
  };

  /* ---------- Interaction ---------- */

  const heart = (pet) => {
    const h = document.createElement('span');
    h.className = 'follower-heart';
    h.setAttribute('aria-hidden', 'true');
    h.innerHTML =
      '<svg viewBox="0 0 8 7" shape-rendering="crispEdges"><path fill="currentColor" d="M1 0h2v1h2V0h2v1h1v3H7v1H6v1H5v1H3V6H2V5H1V4H0V1h1z"/><path fill="#ffd8e3" d="M1 1h2v1H1z"/></svg>';
    h.style.left = `${pet.x - 6 + (Math.random() * 16 - 8)}px`;
    h.style.top = `${pet.y - 52}px`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1000);
  };

  const onPet = (pet) => (event) => {
    if (event.button === 2) return;
    event.preventDefault();
    const now = performance.now();
    const pats = JB.pet();
    heart(pet);
    pet.el.classList.remove('is-sleeping');
    pet.sprite.classList.remove('is-hopping');
    void pet.sprite.offsetWidth;
    pet.sprite.classList.add('is-hopping');
    pet.lastMoveAt = now;
    // Insam shows off the sunflower form on the tenth pat, and now and then after.
    if (pet.kind.flower && (pats === 10 || (pats > 10 && Math.random() < 0.2))) {
      pet.flowerUntil = now + 2600;
      pet.frameT = 0;
    }
    wake();
  };

  const onWave = (pet) => (event) => {
    event.preventDefault();
    pet.waveUntil = performance.now() + 1100;
    pet.lastMoveAt = performance.now();
    wake();
  };

  const onPointerMove = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const overPlayfield = Boolean(event.target.closest && event.target.closest('[data-playfield]'));
    if (overPlayfield !== hiddenByPlayfield) {
      hiddenByPlayfield = overPlayfield;
      pets.forEach((pet) => pet.el.classList.toggle('is-hidden', overPlayfield));
    }
    const now = performance.now();
    if (lastPointer) {
      const dt = Math.max((now - lastPointer.t) / 1000, 0.001);
      const speed = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / dt;
      flickSpeed = Math.max(flickSpeed * 0.6, speed);
    }
    lastPointer = { x: event.clientX, y: event.clientY, t: now };
    target = { x: event.clientX, y: event.clientY + 30 };
    wake();
  };

  const onMouseLeave = () => {
    target = null;
  };

  const dock = () => {
    pets.forEach((pet, i) => {
      pet.x = window.innerWidth - 26 - (pets.length - 1 - i) * 34;
      pet.y = window.innerHeight - 8;
      paint(pet, performance.now());
    });
  };

  const onScroll = () => {
    pets.forEach((pet) => pet.el.classList.add('is-hidden'));
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => pets.forEach((pet) => pet.el.classList.remove('is-hidden')), 900);
  };

  const onResize = () => {
    if (!followsPointer) {
      dock();
      return;
    }
    pets.forEach((pet) => {
      pet.x = Math.max(16, Math.min(window.innerWidth - 16, pet.x));
      pet.y = Math.max(48, Math.min(window.innerHeight - 4, pet.y));
      paint(pet, performance.now());
    });
  };

  /* ---------- Mount / unmount ---------- */

  const mount = (starts) => {
    if (mounted) return;
    mounted = true;
    const now = performance.now();
    pets = SPECIES.map((kind, i) => {
      const el = document.createElement('div');
      el.className = 'follower';
      el.setAttribute('aria-hidden', 'true');
      el.title = kind.id === 'insam' ? 'Insam' : 'Astronaut';
      el.innerHTML = '<div class="follower-sprite"></div><span class="follower-zzz">z<span>z</span><span>z</span></span><span class="follower-bubble">hi!</span>';
      document.body.appendChild(el);
      const start = starts && starts[i];
      const pet = {
        kind,
        el,
        sprite: el.firstElementChild,
        x: start ? start.x : 60 + i * 30,
        y: start ? start.y : window.innerHeight - 20,
        dir: 'down',
        moving: false,
        frameT: 0,
        lastMoveAt: now,
        flowerUntil: 0,
        tumbleUntil: 0,
        cooldownUntil: 0,
        waveUntil: 0
      };
      el.addEventListener('pointerdown', onPet(pet));
      el.addEventListener('contextmenu', onWave(pet));
      pet.sprite.addEventListener('animationend', () => pet.sprite.classList.remove('is-hopping'));
      return pet;
    });

    if (followsPointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onMouseLeave);
    } else {
      dock();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('resize', onResize);
    pets.forEach((pet) => paint(pet, now));
    wake();
  };

  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    clearTimeout(scrollTimer);
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    pets.forEach((pet) => pet.el.remove());
    pets = [];
  };

  const announce = () => document.dispatchEvent(new CustomEvent('jb:pets', { detail: { out: mounted } }));

  window.JBPets = {
    isOut: () => mounted,
    release(starts) {
      JB.setPref('pets', true);
      mount(starts);
      announce();
    },
    recall() {
      JB.setPref('pets', false);
      unmount();
      announce();
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake();
  });

  if (JB.getPref('pets', false)) mount();
})();
