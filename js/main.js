'use strict';
// Boot: canvas scaling, fixed-timestep loop, mouse mapping.
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  JK.ctx = ctx;
  let scale = 1, ox = 0, oy = 0, dpr = 1;
  // Where the canvas sits on screen; touch.js lays its controls out around it.
  const view = (JK.view = { scale: 1, ox: 0, oy: 0, w: JK.W, h: JK.H, vw: 0, vh: 0, portrait: false, safe: { t: 0, r: 0, b: 0, l: 0 } });

  // iPhone notch / Dynamic Island / home-indicator insets, read from CSS env().
  function safeInsets() {
    const el = document.getElementById('safe-probe');
    if (!el) return { t: 0, r: 0, b: 0, l: 0 };
    const cs = getComputedStyle(el);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    // documentElement.clientWidth ignores any layout-viewport widening on phones
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = window.innerHeight || document.documentElement.clientHeight;
    const safe = safeInsets();
    const portrait = h > w;
    // Keep the picture clear of the notch / Dynamic Island on the sides (landscape)
    // or the top (portrait). The home indicator may overlap the bottom edge.
    const aw = Math.max(100, w - safe.l - safe.r), ah = Math.max(100, h - safe.t);
    scale = Math.min(aw / JK.W, (portrait ? ah : h) / JK.H);
    const cw = Math.floor(JK.W * scale), ch = Math.floor(JK.H * scale);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ox = Math.floor(safe.l + (aw - cw) / 2);
    // portrait phones: pin the game to the top so the touch controls get the space below it
    oy = portrait ? Math.floor(safe.t) : Math.floor((h - ch) / 2);
    canvas.style.left = ox + 'px';
    canvas.style.top = oy + 'px';
    Object.assign(view, { scale, ox, oy, w: cw, h: ch, vw: w, vh: h, portrait, safe });
    if (JK.Touch) JK.Touch.layout();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  // Pointer events cover mouse, touch and pen with one code path.
  const toLogical = (e) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });
  const onControls = (e) => e.target && e.target.closest && e.target.closest('#touch .zone, #touch .btn, #touch .pause-zone');
  window.addEventListener('pointermove', (e) => {
    if (onControls(e)) return;
    const p = toLogical(e); JK.Menus.mouse.x = p.x; JK.Menus.mouse.y = p.y;
  });
  window.addEventListener('pointerdown', (e) => {
    if (onControls(e)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = toLogical(e);
    JK.Menus.mouse.x = p.x; JK.Menus.mouse.y = p.y;
    if (e.pointerType === 'touch' && JK.Touch) JK.Touch.setActive(true);
    // regions that must run inside the gesture itself (e.g. opening a text prompt on iOS)
    const h = JK.Menus.hitAt(p.x, p.y);
    if (h && h.now) { h.fn(); return; }
    JK.Menus.mouse.click = true;
  });
  // stop iOS pinch-zoom, double-tap zoom and the long-press menu from hijacking the game
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

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
