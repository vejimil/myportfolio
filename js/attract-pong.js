/* "Attract mode" for the Arcade card: two AI paddles play Ping-Pong Smash
   on their own, including the occasional smash. */
(() => {
  const canvas = document.querySelector('[data-attract-pong]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = 320;
  const H = Number(canvas.getAttribute('height')) || 200;
  const PAD_H = 34;
  const PAD_W = 5;
  const BASE_SPEED = 150;
  const FONT = '"Silkscreen", ui-monospace, monospace';

  const left = { x: 14, y: H / 2, aim: 0, color: '#4fe0b0' };
  const right = { x: W - 14 - PAD_W, y: H / 2, aim: 0, color: '#6fc3ff' };
  const ball = { x: W / 2, y: H / 2, vx: BASE_SPEED, vy: 60 };
  const score = [0, 0];
  let smashText = 0;
  let smashColor = '#ffcc33';
  let rafId = null;
  let visible = false;
  let last = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    draw();
  };

  const serve = (dir) => {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = BASE_SPEED * dir;
    ball.vy = (Math.random() * 2 - 1) * 90;
  };

  const think = (paddle, dt) => {
    const coming = (paddle === left && ball.vx < 0) || (paddle === right && ball.vx > 0);
    const goal = coming ? ball.y + paddle.aim : H / 2;
    const maxStep = (coming ? 170 : 70) * dt;
    paddle.y += Math.max(-maxStep, Math.min(maxStep, goal - paddle.y));
    paddle.y = Math.max(PAD_H / 2, Math.min(H - PAD_H / 2, paddle.y));
  };

  const hit = (paddle, dir) => {
    const offset = (ball.y - paddle.y) / (PAD_H / 2);
    const smash = Math.random() < 0.22;
    const speed = Math.min(Math.abs(ball.vx) * 1.06, 330) * (smash ? 1.7 : 1);
    ball.vx = speed * dir;
    ball.vy = offset * 160 + (Math.random() * 2 - 1) * 30;
    // Next aim: sometimes miss on purpose so points actually get scored.
    const other = paddle === left ? right : left;
    other.aim = Math.random() < 0.18 ? (Math.random() < 0.5 ? -1 : 1) * (PAD_H * 0.9) : (Math.random() * 2 - 1) * 8;
    if (smash) {
      smashText = 0.7;
      smashColor = paddle.color;
    }
  };

  const update = (dt) => {
    think(left, dt);
    think(right, dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y < 3 || ball.y > H - 3) {
      ball.vy *= -1;
      ball.y = Math.max(3, Math.min(H - 3, ball.y));
    }

    if (ball.vx < 0 && ball.x < left.x + PAD_W + 3 && ball.x > left.x - 4 && Math.abs(ball.y - left.y) < PAD_H / 2 + 3) {
      ball.x = left.x + PAD_W + 3;
      hit(left, 1);
    }
    if (ball.vx > 0 && ball.x > right.x - 3 && ball.x < right.x + PAD_W + 4 && Math.abs(ball.y - right.y) < PAD_H / 2 + 3) {
      ball.x = right.x - 3;
      hit(right, -1);
    }

    if (ball.x < -10) {
      score[1] = (score[1] + 1) % 10;
      serve(1);
    } else if (ball.x > W + 10) {
      score[0] = (score[0] + 1) % 10;
      serve(-1);
    }

    smashText = Math.max(0, smashText - dt);
  };

  const draw = () => {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = 4; y < H; y += 12) ctx.fillRect(W / 2 - 1, y, 2, 6);

    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`${score[0]}  ${score[1]}`, W / 2, 10);

    ctx.fillStyle = left.color;
    ctx.fillRect(left.x, Math.round(left.y - PAD_H / 2), PAD_W, PAD_H);
    ctx.fillStyle = right.color;
    ctx.fillRect(right.x, Math.round(right.y - PAD_H / 2), PAD_W, PAD_H);

    ctx.fillStyle = smashText > 0 ? smashColor : '#ffcc33';
    ctx.fillRect(Math.round(ball.x - 3), Math.round(ball.y - 3), 6, 6);

    if (smashText > 0) {
      ctx.globalAlpha = Math.min(1, smashText * 2.5);
      ctx.font = `18px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = smashColor;
      ctx.fillText('SMASH!', W / 2, H / 2 + 34);
      ctx.globalAlpha = 1;
    }

    ctx.font = `8px ${FONT}`;
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('DEMO · CPU VS CPU', W / 2, H - 8);
  };

  const frame = (time) => {
    const dt = Math.min((time - last) / 1000 || 0, 0.05);
    last = time;
    update(dt);
    draw();
    rafId = visible && !document.hidden ? requestAnimationFrame(frame) : null;
  };

  const start = () => {
    if (reduceMotion || rafId !== null) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  };

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
  if (document.fonts) document.fonts.load(`8px ${FONT}`).then(draw).catch(() => {});
  serve(1);
  resize();
})();
