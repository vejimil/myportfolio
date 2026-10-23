/* Shared behaviour for every page: quests + HUD, hidden collectibles,
   lightbox, card media and the "Continue?" countdown. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ------------------------------------------------------------------
     Quests
     ------------------------------------------------------------------ */

  const MAIN = [
    { id: 'first-steps', icon: '▶', title: 'First Steps', desc: 'Moved the astronaut on the home screen.', hint: 'The home screen has a playable corner.' },
    { id: 'warp', icon: '◎', title: 'Warp Pad', desc: 'Entered a project through a portal.', hint: 'Walk into one of the glowing pads.' },
    { id: 'player-two', icon: '♥', title: 'Player Two Has Joined', desc: 'Opened one of the playable games.', hint: 'Every project has something to play.' },
    { id: 'explorer', icon: '✦', title: 'Explorer', desc: 'Read all three case studies.', hint: 'Visit every project page.' },
    { id: 'profile', icon: '☺', title: 'Character Select', desc: 'Checked the player profile.', hint: 'Who is P1, anyway?' },
    { id: 'say-hi', icon: '✉', title: 'Insert Coin', desc: 'Reached out by email.', hint: 'Continue?' }
  ];

  // Collectibles are coins for now; swap the icon/name here (and .collectible in CSS)
  // to turn them into characters later.
  const COLLECTIBLES = ['home', 'triends', 'words', 'arcade', 'profile', 'arties', 'follower'];
  const COLLECTIBLE_NAME = 'Coin';

  const SIDE = [
    { id: 'treasure', icon: '◉', title: 'Treasure Hunter', desc: `Found all ${COLLECTIBLES.length} hidden coins.`, hint: () => `${COLLECTIBLES.length} coins are hiding around the site — ${state.coins.length}/${COLLECTIBLES.length} found.` },
    { id: 'best-friends', icon: '❀', title: 'Best Friends', desc: 'Gave Insam ten head pats.', hint: () => `Take Insam out of the Desktop Follower window — it likes attention. (${Math.min(state.pets, 10)}/10)` },
    { id: 'patience', icon: '⧗', title: 'Patience', desc: 'Watched the countdown all the way to zero.', hint: 'Some countdowns are worth waiting for.' },
    { id: 'speedrun', icon: '»', title: 'Speedrunner', desc: 'Entered a portal within 5 seconds of pressing start.', hint: 'Gotta go fast — right after pressing start.' },
    { id: 'night-owl', icon: '☾', title: 'Night Owl', desc: 'Visited between midnight and 5 a.m.', hint: 'Come back when everyone else is asleep.' },
    { id: 'old-school', icon: '★', title: 'Old School', desc: '↑ ↑ ↓ ↓ ← → ← → B A. Respect.', hint: 'A very old code still works here.' }
  ];

  const ALL = [...MAIN, ...SIDE];
  const CASE_STUDIES = ['triends', 'words', 'arcade'];
  const STORAGE_KEY = 'jb-progress-v1';

  const loadState = () => {
    const fresh = { unlocked: {}, visited: [], coins: [], pets: 0, prefs: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === 'object') return { ...fresh, ...parsed };
    } catch (error) {
      /* storage unavailable: progress lives for this page view only */
    }
    return fresh;
  };

  const state = loadState();

  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* ignore */
    }
  };

  const countDone = (list) => list.filter((q) => state.unlocked[q.id]).length;

  const starButtons = document.querySelectorAll('[data-achievements-open]');

  const renderCount = () => {
    const side = countDone(SIDE);
    document.querySelectorAll('[data-star-count]').forEach((el) => {
      el.textContent = `${countDone(MAIN)}/${MAIN.length}${side ? ` +${side}` : ''}`;
    });
  };

  const bumpStars = () => {
    starButtons.forEach((btn) => {
      btn.classList.remove('is-bumped');
      void btn.offsetWidth;
      btn.classList.add('is-bumped');
    });
  };

  /* Toasts */
  const toastStack = document.createElement('div');
  toastStack.className = 'toast-stack';
  toastStack.setAttribute('role', 'status');
  toastStack.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastStack);

  const showToast = ({ icon, label, title, variant = '' }) => {
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`.trim();
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span>
        <span class="pixel">${label}</span>
        <strong>${title}</strong>
      </span>`;
    toastStack.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 600);
    }, 3200);
  };

  const unlock = (id) => {
    const quest = ALL.find((q) => q.id === id);
    if (!quest || state.unlocked[id]) return;
    state.unlocked[id] = Date.now();
    saveState();
    renderCount();
    const isSide = SIDE.includes(quest);
    showToast({
      icon: quest.icon,
      label: isSide ? 'Side quest complete' : 'Achievement unlocked',
      title: quest.title,
      variant: isSide ? 'toast-side' : ''
    });
    bumpStars();
  };

  const visit = (key) => {
    if (key === 'profile') unlock('profile');
    if (key === 'game') unlock('player-two');
    if (key.startsWith('case:')) {
      const name = key.slice(5);
      if (!state.visited.includes(name)) {
        state.visited.push(name);
        saveState();
      }
      if (CASE_STUDIES.every((c) => state.visited.includes(c))) unlock('explorer');
    }
  };

  const pet = () => {
    state.pets += 1;
    saveState();
    if (state.pets >= 10) unlock('best-friends');
    return state.pets;
  };

  const getPref = (key, fallback) => (key in state.prefs ? state.prefs[key] : fallback);

  const setPref = (key, value) => {
    state.prefs[key] = value;
    saveState();
    document.dispatchEvent(new CustomEvent('jb:prefs', { detail: { key, value } }));
  };

  window.JB = { unlock, pet, getPref, setPref, reduceMotion };

  /* Quest panel */
  let panel;

  const buildPanel = () => {
    panel = document.createElement('dialog');
    panel.className = 'ach-panel';
    panel.setAttribute('aria-labelledby', 'ach-title');
    document.body.appendChild(panel);
    panel.addEventListener('click', (event) => {
      if (event.target === panel) panel.close();
    });
  };

  const questRows = (list) =>
    list
      .map((q) => {
        const done = Boolean(state.unlocked[q.id]);
        const hint = typeof q.hint === 'function' ? q.hint() : q.hint;
        return `
          <li class="ach${done ? ' is-unlocked' : ''}">
            <span class="ach-icon" aria-hidden="true">${done ? q.icon : '?'}</span>
            <span>
              <strong>${done ? q.title : '???'}</strong>
              <span>${done ? q.desc : `Hint: ${hint}`}</span>
              <span class="sr-only">${done ? '(complete)' : '(locked)'}</span>
            </span>
          </li>`;
      })
      .join('');

  const renderPanel = () => {
    const petsOut = Boolean(window.JBPets && window.JBPets.isOut());
    const petControl = petsOut
      ? '<button type="button" class="ach-toggle" data-pets-home>Send pets home</button>'
      : '<a class="ach-toggle" href="desktop-follower.html">Pets: meet them →</a>';
    panel.innerHTML = `
      <div class="ach-head">
        <h2 id="ach-title">Quest log</h2>
        <button class="lightbox-close" type="button" data-close aria-label="Close quest log">×</button>
      </div>
      <h3 class="ach-group pixel"><span>Main quests</span><span>${countDone(MAIN)}/${MAIN.length}</span></h3>
      <ul class="ach-list">${questRows(MAIN)}</ul>
      <h3 class="ach-group ach-group-side pixel"><span>Side quests</span><span>${countDone(SIDE)}/${SIDE.length}</span></h3>
      <ul class="ach-list">${questRows(SIDE)}</ul>
      <div class="ach-foot">
        ${petControl}
        <button type="button" data-reset>Reset progress</button>
      </div>`;

    panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
    panel.querySelector('[data-pets-home]')?.addEventListener('click', () => {
      window.JBPets.recall();
      renderPanel();
    });
    panel.querySelector('[data-reset]').addEventListener('click', () => {
      state.unlocked = {};
      state.visited = [];
      state.coins = [];
      state.pets = 0;
      saveState();
      renderCount();
      document.querySelectorAll('.collectible').forEach((el) => {
        el.hidden = false;
        el.classList.remove('is-collected');
      });
      renderPanel();
    });
  };

  starButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!panel) buildPanel();
      renderPanel();
      panel.showModal();
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-ach]');
    if (trigger) unlock(trigger.dataset.ach);
  });

  renderCount();
  if (document.body.dataset.visit) visit(document.body.dataset.visit);

  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) unlock('night-owl');

  /* Side quest: Konami code */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;
  document.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      unlock('old-school');
    }
  });

  /* Side quest: hidden collectibles */
  document.querySelectorAll('.collectible').forEach((item) => {
    const id = item.dataset.collectible;
    if (state.coins.includes(id)) {
      item.hidden = true;
      return;
    }
    item.addEventListener('click', () => {
      if (state.coins.includes(id)) return;
      state.coins.push(id);
      saveState();
      item.classList.add('is-collected');
      setTimeout(() => {
        item.hidden = true;
      }, reduceMotion ? 0 : 650);
      showToast({
        icon: '◉',
        label: `${COLLECTIBLE_NAME} found · ${state.coins.length}/${COLLECTIBLES.length}`,
        title: state.coins.length === COLLECTIBLES.length ? 'That was the last one!' : 'Keep looking around…',
        variant: 'toast-side'
      });
      if (COLLECTIBLES.every((c) => state.coins.includes(c))) setTimeout(() => unlock('treasure'), 500);
    });
  });

  /* ------------------------------------------------------------------
     Lightbox for case-study images
     ------------------------------------------------------------------ */

  const zoomButtons = document.querySelectorAll('.zoom');
  if (zoomButtons.length) {
    const box = document.createElement('dialog');
    box.className = 'lightbox';
    box.setAttribute('aria-label', 'Image viewer');
    box.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Close image viewer">×</button>
      <img class="lightbox-shot" alt="" />
      <p class="lightbox-caption"></p>`;
    document.body.appendChild(box);

    const img = box.querySelector('img');
    const caption = box.querySelector('.lightbox-caption');
    box.querySelector('.lightbox-close').addEventListener('click', () => box.close());
    box.addEventListener('click', (event) => {
      if (event.target === box) box.close();
    });

    zoomButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const source = button.querySelector('img');
        const figcaption = button.closest('figure')?.querySelector('figcaption');
        img.src = source.currentSrc || source.src;
        img.alt = source.alt;
        img.classList.toggle('is-pixel', Boolean(button.closest('.shot-pixel')));
        caption.textContent = figcaption ? figcaption.textContent.trim().replace(/\s+/g, ' ') : '';
        caption.hidden = !figcaption;
        box.showModal();
      });
    });
  }

  /* ------------------------------------------------------------------
     Game cards: preview video on hover
     ------------------------------------------------------------------ */

  if (canHover && !reduceMotion) {
    document.querySelectorAll('[data-hover-video]').forEach((card) => {
      const media = card.querySelector('.game-card-media');
      let video;

      const play = () => {
        if (!video) {
          video = document.createElement('video');
          video.src = card.dataset.hoverVideo;
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.setAttribute('aria-hidden', 'true');
          media.appendChild(video);
        }
        video.play().then(() => video.classList.add('is-playing')).catch(() => {});
      };

      const stop = () => {
        if (!video) return;
        video.pause();
        video.classList.remove('is-playing');
      };

      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', stop);
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', (event) => {
        if (!card.contains(event.relatedTarget)) stop();
      });
    });
  }

  /* ------------------------------------------------------------------
     "Continue?" countdown (side quest: wait for it to hit zero)
     ------------------------------------------------------------------ */

  const countEl = document.querySelector('[data-continue-count]');
  if (countEl && !reduceMotion && 'IntersectionObserver' in window) {
    let timer = null;
    let n = 9;
    let watched = 0;
    const tick = () => {
      n = n <= 0 ? 9 : n - 1;
      watched += 1;
      countEl.textContent = n;
      if (n === 0 && watched >= 9) unlock('patience');
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) {
        timer = setInterval(tick, 1000);
      } else if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
        watched = 0;
      }
    }).observe(countEl);
  }

  /* Copy e-mail */
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = 'Copied!';
      } catch (error) {
        button.textContent = 'Copy failed';
      }
      setTimeout(() => {
        button.textContent = original;
      }, 1600);
    });
  });

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
