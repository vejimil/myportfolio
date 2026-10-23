/* Insam follower: trails the cursor around the site, naps when you stop,
   and loves head pats (side quest "Best Friends"). On touch screens Insam
   sits in the corner instead of following. */
(() => {
  const JB = window.JB;
  if (!JB) return;

  const followsPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SCALE = followsPointer ? 1.25 : 1;
  const WALK = { src: 'triends-demo-assets/characters/ginseng_walking.png', frame: 48 };
  const FLOWER = { src: 'triends-demo-assets/gimmicks/sunflower.png', frame: 64 };
  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };
  const STOP_DIST = 64;
  const NAP_AFTER = 4000;

  let el = null;
  let sprite = null;
  let rafId = null;
  let last = 0;
  let pos = { x: 70, y: window.innerHeight - 16 };
  let target = null;
  let dir = 'down';
  let moving = false;
  let frameTime = 0;
  let lastMoveAt = performance.now();
  let flowerUntil = 0;
  let hiddenByPlayfield = false;

  const look = () => (performance.now() < flowerUntil ? FLOWER : WALK);

  const paint = () => {
    const sheet = look();
    const size = sheet.frame * SCALE;
    const col = moving || sheet === FLOWER ? Math.floor(frameTime * 8) % 4 : 0;
    const row = sheet === FLOWER ? DIR_ROW.down : DIR_ROW[dir];
    sprite.style.width = `${size}px`;
    sprite.style.height = `${size}px`;
    sprite.style.backgroundImage = `url("${sheet.src}")`;
    sprite.style.backgroundSize = `${size * 4}px ${size * 4}px`;
    sprite.style.backgroundPosition = `${-col * size}px ${-row * size}px`;
    // Anchor at the feet so both sprite sheets stand on the same spot.
    el.style.transform = `translate3d(${Math.round(pos.x - size / 2)}px, ${Math.round(pos.y - size)}px, 0)`;
  };

  const clampToViewport = () => {
    pos.x = Math.max(24, Math.min(window.innerWidth - 24, pos.x));
    pos.y = Math.max(60, Math.min(window.innerHeight - 4, pos.y));
  };

  // Touch screens: Insam sits in the bottom-right corner and ducks out of the
  // way while the page scrolls, so it never sits on top of text being read.
  const dock = () => {
    pos = { x: window.innerWidth - 30, y: window.innerHeight - 8 };
    paint();
  };

  let scrollTimer = null;
  const onScroll = () => {
    el.classList.add('is-hidden');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => el && el.classList.remove('is-hidden'), 900);
  };

  const step = (time) => {
    const dt = Math.min((time - last) / 1000 || 0, 0.05);
    last = time;
    frameTime += dt;

    moving = false;
    if (target && !hiddenByPlayfield) {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > STOP_DIST) {
        const speed = Math.max(90, Math.min(360, dist * 2.4));
        const travel = Math.min(dist - STOP_DIST, speed * dt);
        pos.x += (dx / dist) * travel;
        pos.y += (dy / dist) * travel;
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';
        moving = true;
        lastMoveAt = time;
        el.classList.remove('is-sleeping');
      }
    }

    if (!moving && dir !== 'down' && time - lastMoveAt > 600) dir = 'down';
    if (!moving && time - lastMoveAt > NAP_AFTER) el.classList.add('is-sleeping');

    paint();

    const busy = moving || time < flowerUntil || time - lastMoveAt < NAP_AFTER + 50;
    rafId = busy && !document.hidden ? requestAnimationFrame(step) : null;
  };

  const wake = () => {
    if (rafId === null && el) {
      last = performance.now();
      rafId = requestAnimationFrame(step);
    }
  };

  const heart = () => {
    const h = document.createElement('span');
    h.className = 'follower-heart';
    h.setAttribute('aria-hidden', 'true');
    h.innerHTML =
      '<svg viewBox="0 0 8 7" shape-rendering="crispEdges"><path fill="currentColor" d="M1 0h2v1h2V0h2v1h1v3H7v1H6v1H5v1H3V6H2V5H1V4H0V1h1z"/><path fill="#ffd8e3" d="M1 1h2v1H1z"/></svg>';
    h.style.left = `${pos.x - 7 + (Math.random() * 24 - 12)}px`;
    h.style.top = `${pos.y - 66}px`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1000);
  };

  const onPet = (event) => {
    event.preventDefault();
    const pats = JB.pet();
    heart();
    el.classList.remove('is-sleeping');
    sprite.classList.remove('is-hopping');
    void sprite.offsetWidth;
    sprite.classList.add('is-hopping');
    lastMoveAt = performance.now();
    // The tenth pat (and the odd one after) shows off the sunflower form.
    if (pats === 10 || (pats > 10 && Math.random() < 0.2)) {
      flowerUntil = performance.now() + 2600;
      frameTime = 0;
    }
    wake();
  };

  const onPointerMove = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const overPlayfield = Boolean(event.target.closest && event.target.closest('[data-playfield], [data-hide-follower]'));
    if (overPlayfield !== hiddenByPlayfield) {
      hiddenByPlayfield = overPlayfield;
      el.classList.toggle('is-hidden', overPlayfield);
    }
    target = { x: event.clientX, y: event.clientY + 34 };
    wake();
  };

  const onResize = () => {
    if (followsPointer) {
      clampToViewport();
      paint();
    } else {
      dock();
    }
  };

  const mount = () => {
    if (el) return;
    el = document.createElement('div');
    el.className = 'follower';
    el.setAttribute('aria-hidden', 'true');
    el.title = 'Insam';
    el.innerHTML = '<div class="follower-sprite"></div><span class="follower-zzz">z<span>z</span><span>z</span></span>';
    sprite = el.firstElementChild;
    document.body.appendChild(el);
    el.addEventListener('pointerdown', onPet);
    sprite.addEventListener('animationend', () => sprite.classList.remove('is-hopping'));

    if (followsPointer) {
      clampToViewport();
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => {
        target = null;
      });
    } else {
      dock();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('resize', onResize);
    paint();
    wake();
  };

  const unmount = () => {
    if (!el) return;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
    clearTimeout(scrollTimer);
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    el.remove();
    el = null;
  };

  document.addEventListener('jb:prefs', (event) => {
    if (event.detail.key !== 'follower') return;
    if (event.detail.value) mount();
    else unmount();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake();
  });

  if (JB.getPref('follower', !JB.reduceMotion)) mount();
})();
