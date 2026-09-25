'use strict';
// Boot: canvas scaling, fixed-timestep loop, mouse mapping.
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  JK.ctx = ctx;
  let scale = 1, ox = 0, oy = 0, dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    scale = Math.min(w / JK.W, h / JK.H);
    const cw = Math.floor(JK.W * scale), ch = Math.floor(JK.H * scale);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ox = Math.floor((w - cw) / 2);
    oy = Math.floor((h - ch) / 2);
    canvas.style.left = ox + 'px';
    canvas.style.top = oy + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  const toLogical = (e) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });
  window.addEventListener('mousemove', (e) => { const p = toLogical(e); JK.Menus.mouse.x = p.x; JK.Menus.mouse.y = p.y; });
  window.addEventListener('mousedown', (e) => {
    const p = toLogical(e);
    JK.Menus.mouse.x = p.x; JK.Menus.mouse.y = p.y;
    JK.Menus.mouse.click = true;
  });

  // Fixed 60 Hz simulation, render every animation frame.
  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(250, now - last);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 5) {
      if (JK.debug.freeze) { acc = 0; break; }
      JK.Input.update();
      try { JK.Menus.update(); } catch (e) { console.error(e); }
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
    // fraction of the way to the next sim tick, used to interpolate rendering
    JK.tickAlpha = acc / STEP;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    try { JK.Menus.draw(ctx); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  // Wait briefly for web fonts so the canvas text renders with them (falls back if offline).
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all([
        document.fonts.load('40px "Bebas Neue"'), document.fonts.load('40px "Yuji Syuku"', '領域展開呪術'), document.fonts.load('20px "Rajdhani"'),
      ]),
      new Promise((r) => setTimeout(r, 1800)),
    ])
    : Promise.resolve();
  fontsReady.catch(() => {}).then(() => {
    const l = document.getElementById('loading');
    if (l) l.remove();
    requestAnimationFrame(frame);
  });

  // Debug hook for automated checks.
  JK.debug = {
    get game() { return JK.Menus.game; },
    menus: JK.Menus,
    // advance the simulation n frames synchronously (for automated testing)
    step(n = 1, keys = null) {
      for (let i = 0; i < n; i++) {
        JK.Input.update();
        if (keys) { const k = typeof keys === 'function' ? keys(i) : keys; JK.Input.state.held = k.held || {}; JK.Input.state.pressed = k.pressed || {}; }
        JK.Menus.update();
      }
      JK.tickAlpha = 1;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      JK.Menus.draw(ctx);
    },
  };
})();
