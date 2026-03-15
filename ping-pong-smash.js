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

  const canvas = document.getElementById('pong-canvas');
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('pong-reset');

  const WIDTH = 1200;
  const HEIGHT = 700;
  const PADDLE_W = 20;
  const PADDLE_H = 150;
  const BALL_R = 15;
  const LEFT_X = 60;
  const RIGHT_X = WIDTH - 60;
  const PADDLE_SPEED = 920;
  const WIN_SCORE = 7;
  const SPEED_MIN = 620;
  const SPEED_MAX = 920;
  const SMASH_WINDOW_X = 30;
  const SMASH_COOLDOWN = 0.6;
  const SMASH_SPEED = 1500;
  const SMASH_SPEED_MAX = 1680;
  const SMASH_Y_GAIN = 1.15;
  const SMASH_FLASH_MS = 220;

  const keys = new Set();
  const blockCodes = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'KeyW', 'KeyS', 'KeyD', 'KeyP', 'KeyR', 'Space']);

  const state = {
    leftScore: 0,
    rightScore: 0,
    leftY: HEIGHT / 2,
    rightY: HEIGHT / 2,
    ballX: WIDTH / 2,
    ballY: HEIGHT / 2,
    vx: 0,
    vy: 0,
    paused: false,
    running: true,
    banner: '',
    bannerColor: '#ffffff',
    countdownValue: 0,
    countdownTimer: 0,
    pendingServeDir: null,
    lastSmashL: -999,
    lastSmashR: -999,
    smashFlashUntil: 0,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function isDeuce() {
    return state.leftScore >= WIN_SCORE - 1 && state.rightScore >= WIN_SCORE - 1 && state.leftScore === state.rightScore;
  }

  function isGameOver() {
    if (Math.max(state.leftScore, state.rightScore) < WIN_SCORE) return false;
    return Math.abs(state.leftScore - state.rightScore) >= 2;
  }

  function updateBanner() {
    if (!state.running) return;
    state.banner = isDeuce() ? 'DEUCE' : '';
    state.bannerColor = '#ffffff';
  }

  function resetPositions() {
    state.leftY = HEIGHT / 2;
    state.rightY = HEIGHT / 2;
    state.ballX = WIDTH / 2;
    state.ballY = HEIGHT / 2;
    state.vx = 0;
    state.vy = 0;
  }

  function startCountdown(direction) {
    state.countdownValue = 2;
    state.countdownTimer = 1;
    state.pendingServeDir = direction;
    state.vx = 0;
    state.vy = 0;
  }

  function serveBall(direction) {
    const angle = (Math.random() * 0.7) - 0.35;
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    const dirX = direction === null ? (Math.random() < 0.5 ? -1 : 1) : direction;
    state.vx = dirX * speed * (1 - Math.abs(angle) * 0.5);
    state.vy = speed * angle;
  }

  function resetMatch() {
    state.leftScore = 0;
    state.rightScore = 0;
    state.paused = false;
    state.running = true;
    state.banner = '';
    state.lastSmashL = -999;
    state.lastSmashR = -999;
    resetPositions();
    updateBanner();
    startCountdown(null);
  }

  function onPoint(directionForServe) {
    if (directionForServe === 1) {
      state.leftScore += 1;
    } else {
      state.rightScore += 1;
    }

    if (isGameOver()) {
      state.running = false;
      state.paused = true;
      state.banner = state.leftScore > state.rightScore ? 'Left Wins! (R to Reset)' : 'Right Wins! (R to Reset)';
      state.bannerColor = '#ffffff';
      return;
    }

    resetPositions();
    updateBanner();
    startCountdown(directionForServe);
  }

  function trySmash(leftSide, nowSec) {
    if (state.paused || !state.running || state.countdownValue > 0) return;

    if (leftSide) {
      if (nowSec - state.lastSmashL < SMASH_COOLDOWN || state.vx >= 0) return;
    } else {
      if (nowSec - state.lastSmashR < SMASH_COOLDOWN || state.vx <= 0) return;
    }

    const paddleY = leftSide ? state.leftY : state.rightY;
    const paddleEdge = leftSide ? LEFT_X + PADDLE_W / 2 : RIGHT_X - PADDLE_W / 2;
    const expectedBallX = leftSide ? paddleEdge + BALL_R : paddleEdge - BALL_R;
    const closeX = Math.abs(expectedBallX - state.ballX) <= SMASH_WINDOW_X;
    const closeY = Math.abs(state.ballY - paddleY) <= (PADDLE_H / 2 + BALL_R);
    if (!closeX || !closeY) return;

    const rel = clamp((state.ballY - paddleY) / (PADDLE_H / 2), -1, 1);
    const target = Math.min(SMASH_SPEED_MAX, SMASH_SPEED);
    const dirX = leftSide ? 1 : -1;
    state.vx = dirX * target * (1 - 0.35 * Math.abs(rel));
    state.vy = rel * target * SMASH_Y_GAIN;
    state.ballX = expectedBallX;
    state.smashFlashUntil = performance.now() + SMASH_FLASH_MS;

    if (leftSide) {
      state.lastSmashL = nowSec;
    } else {
      state.lastSmashR = nowSec;
    }
  }

  function handleKeyDown(event) {
    if (blockCodes.has(event.code)) event.preventDefault();
    keys.add(event.code);

    const nowSec = performance.now() / 1000;
    if (event.code === 'KeyD') trySmash(true, nowSec);
    if (event.code === 'ArrowLeft') trySmash(false, nowSec);
    if (event.code === 'KeyP') {
      if (!state.running || state.countdownValue > 0) return;
      state.paused = !state.paused;
      if (state.paused) {
        state.banner = 'PAUSED';
        state.bannerColor = '#ffffff';
      } else {
        updateBanner();
      }
    }
    if (event.code === 'KeyR') resetMatch();
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
  }

  function update(dt) {
    if (!state.paused && state.running) {
      if (keys.has('KeyW')) state.leftY -= PADDLE_SPEED * dt;
      if (keys.has('KeyS')) state.leftY += PADDLE_SPEED * dt;
      if (keys.has('ArrowUp')) state.rightY -= PADDLE_SPEED * dt;
      if (keys.has('ArrowDown')) state.rightY += PADDLE_SPEED * dt;

      state.leftY = clamp(state.leftY, PADDLE_H / 2, HEIGHT - PADDLE_H / 2);
      state.rightY = clamp(state.rightY, PADDLE_H / 2, HEIGHT - PADDLE_H / 2);

      if (state.countdownValue > 0) {
        state.countdownTimer -= dt;
        if (state.countdownTimer <= 0) {
          state.countdownValue -= 1;
          if (state.countdownValue <= 0) {
            serveBall(state.pendingServeDir);
            updateBanner();
          } else {
            state.countdownTimer += 1;
          }
        }
        return;
      }

      state.ballX += state.vx * dt;
      state.ballY += state.vy * dt;

      if (state.ballY - BALL_R <= 0) {
        state.ballY = BALL_R;
        state.vy = Math.abs(state.vy);
      } else if (state.ballY + BALL_R >= HEIGHT) {
        state.ballY = HEIGHT - BALL_R;
        state.vy = -Math.abs(state.vy);
      }

      if (state.ballX + BALL_R < 0) {
        onPoint(-1);
        return;
      }
      if (state.ballX - BALL_R > WIDTH) {
        onPoint(1);
        return;
      }

      const leftRect = { x: LEFT_X - PADDLE_W / 2, y: state.leftY - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
      const rightRect = { x: RIGHT_X - PADDLE_W / 2, y: state.rightY - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
      const ballRect = { x: state.ballX - BALL_R, y: state.ballY - BALL_R, w: BALL_R * 2, h: BALL_R * 2 };

      if (state.vx < 0 && overlap(leftRect, ballRect)) {
        const rel = clamp((state.ballY - state.leftY) / (PADDLE_H / 2), -1, 1);
        const speed = Math.hypot(state.vx, state.vy) || SPEED_MIN;
        state.vx = Math.abs(speed);
        state.vy = rel * speed;
        const normalized = Math.hypot(state.vx, state.vy) || 1;
        const target = clamp(normalized, SPEED_MIN, SPEED_MAX);
        state.vx *= target / normalized;
        state.vy *= target / normalized;
        state.ballX = leftRect.x + leftRect.w + BALL_R;
      }

      if (state.vx > 0 && overlap(rightRect, ballRect)) {
        const rel = clamp((state.ballY - state.rightY) / (PADDLE_H / 2), -1, 1);
        const speed = Math.hypot(state.vx, state.vy) || SPEED_MIN;
        state.vx = -Math.abs(speed);
        state.vy = rel * speed;
        const normalized = Math.hypot(state.vx, state.vy) || 1;
        const target = clamp(normalized, SPEED_MIN, SPEED_MAX);
        state.vx *= target / normalized;
        state.vy *= target / normalized;
        state.ballX = rightRect.x - BALL_R;
      }
    }
  }

  function drawText(text, x, y, size, color, align = 'center') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px Inter, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.restore();

    drawText(`${state.leftScore} : ${state.rightScore}`, WIDTH / 2, 60, 34, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(LEFT_X - PADDLE_W / 2, state.leftY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
    ctx.fillRect(RIGHT_X - PADDLE_W / 2, state.rightY - PADDLE_H / 2, PADDLE_W, PADDLE_H);

    ctx.beginPath();
    ctx.fillStyle = performance.now() < state.smashFlashUntil ? '#ffea00' : '#ffffff';
    ctx.arc(state.ballX, state.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#888888';
    ctx.font = '600 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Left: W/S + D Smash   ·   Right: ↑/↓ + ← Smash   ·   P Pause   ·   R Reset', WIDTH / 2, HEIGHT - 28);

    if (state.countdownValue > 0) {
      drawText(String(state.countdownValue), WIDTH / 2, HEIGHT / 2, 46, '#ff5b5b');
    } else if (state.banner) {
      drawText(state.banner, WIDTH / 2, HEIGHT / 2, 54, state.bannerColor);
    }
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
  resetBtn?.addEventListener('click', resetMatch);

  resetMatch();
  requestAnimationFrame(loop);
})();
