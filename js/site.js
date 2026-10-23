/* Shared behaviour for every page: achievements + HUD, lightbox, card media,
   the "Continue?" countdown and a small secret. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ------------------------------------------------------------------
     Achievements
     ------------------------------------------------------------------ */

  const ACHIEVEMENTS = [
    { id: 'first-steps', icon: '▶', title: 'First Steps', desc: 'Moved the astronaut on the home screen.', hint: 'The home screen has a playable corner.' },
    { id: 'warp', icon: '◎', title: 'Warp Pad', desc: 'Entered a project through a portal.', hint: 'Walk into one of the glowing pads.' },
    { id: 'player-two', icon: '♥', title: 'Player Two Has Joined', desc: 'Opened one of the playable games.', hint: 'Every project has something to play.' },
    { id: 'explorer', icon: '✦', title: 'Explorer', desc: 'Read all three case studies.', hint: 'Visit every project page.' },
    { id: 'profile', icon: '☺', title: 'Character Select', desc: 'Checked the player profile.', hint: 'Who is P1, anyway?' },
    { id: 'say-hi', icon: '✉', title: 'Insert Coin', desc: 'Reached out by email.', hint: 'Continue?' }
  ];
  const SECRET = { id: 'old-school', icon: '★', title: 'Old School', desc: '↑ ↑ ↓ ↓ ← → ← → B A. Respect.', secret: true };
  const ALL = [...ACHIEVEMENTS, SECRET];
  const CASE_STUDIES = ['triends', 'words', 'arcade'];
  const STORAGE_KEY = 'jb-progress-v1';

  const loadState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === 'object') {
        return { unlocked: parsed.unlocked || {}, visited: parsed.visited || [] };
      }
    } catch (error) {
      /* storage unavailable: progress lives for this page view only */
    }
    return { unlocked: {}, visited: [] };
  };

  const state = loadState();

  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* ignore */
    }
  };

  const unlockedCount = () => ACHIEVEMENTS.filter((a) => state.unlocked[a.id]).length;

  const starButtons = document.querySelectorAll('[data-achievements-open]');

  const renderCount = () => {
    const secret = state.unlocked[SECRET.id] ? ' +★' : '';
    document.querySelectorAll('[data-star-count]').forEach((el) => {
      el.textContent = `${unlockedCount()}/${ACHIEVEMENTS.length}${secret}`;
    });
  };

  /* Toasts */
  const toastStack = document.createElement('div');
  toastStack.className = 'toast-stack';
  toastStack.setAttribute('role', 'status');
  toastStack.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastStack);

  const showToast = (achievement) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${achievement.icon}</span>
      <span>
        <span class="pixel">${achievement.secret ? 'Secret unlocked' : 'Achievement unlocked'}</span>
        <strong>${achievement.title}</strong>
      </span>`;
    toastStack.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 600);
    }, 3200);
  };

  const unlock = (id) => {
    const achievement = ALL.find((a) => a.id === id);
    if (!achievement || state.unlocked[id]) return;
    state.unlocked[id] = Date.now();
    saveState();
    renderCount();
    showToast(achievement);
    starButtons.forEach((btn) => {
      btn.classList.remove('is-bumped');
      void btn.offsetWidth;
      btn.classList.add('is-bumped');
    });
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

  window.JB = { unlock };

  /* Achievement panel */
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

  const renderPanel = () => {
    const rows = ALL.filter((a) => !a.secret || state.unlocked[a.id])
      .map((a) => {
        const done = Boolean(state.unlocked[a.id]);
        return `
          <li class="ach${done ? ' is-unlocked' : ''}">
            <span class="ach-icon" aria-hidden="true">${done ? a.icon : '?'}</span>
            <span>
              <strong>${done ? a.title : '???'}</strong>
              <span>${done ? a.desc : `Hint: ${a.hint}`}</span>
              <span class="sr-only">${done ? '(unlocked)' : '(locked)'}</span>
            </span>
          </li>`;
      })
      .join('');

    panel.innerHTML = `
      <div class="ach-head">
        <h2 id="ach-title">Achievements · ${unlockedCount()}/${ACHIEVEMENTS.length}</h2>
        <button class="lightbox-close" type="button" data-close aria-label="Close achievements">×</button>
      </div>
      <ul class="ach-list">${rows}</ul>
      <div class="ach-foot">
        <span class="pixel">${state.unlocked[SECRET.id] ? 'Secret found' : '1 secret hidden'}</span>
        <button type="button" data-reset>Reset progress</button>
      </div>`;

    panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
    panel.querySelector('[data-reset]').addEventListener('click', () => {
      state.unlocked = {};
      state.visited = [];
      saveState();
      renderCount();
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

  /* Secret: Konami code */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;
  document.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      unlock(SECRET.id);
    }
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
     "Continue?" countdown
     ------------------------------------------------------------------ */

  const countEl = document.querySelector('[data-continue-count]');
  if (countEl && !reduceMotion && 'IntersectionObserver' in window) {
    let timer = null;
    let n = 9;
    const tick = () => {
      n = n <= 0 ? 9 : n - 1;
      countEl.textContent = n;
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) {
        timer = setInterval(tick, 1000);
      } else if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
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
