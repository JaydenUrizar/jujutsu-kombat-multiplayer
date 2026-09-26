'use strict';
// On-screen touch controls for phones and tablets.
// A floating stick on the left and a compact button cluster on the right feed player 1
// through JK.Input.setVirtual, so they work in every mode, online versus included.
// Landscape: the controls sit over the bottom corners only (the HUD meters move up top).
// Portrait: the game is pinned to the top of the screen and the controls use the space below.
// They only appear during a fight; menus are driven by tapping the canvas.
JK.Touch = (function () {
  const root = document.getElementById('touch');
  const rotateHint = document.getElementById('rotate');
  const T = { active: false };
  if (!root) { T.layout = T.setActive = () => {}; T.hudTop = () => false; return T; }

  try { T.active = window.matchMedia('(pointer: coarse)').matches; } catch (e) { T.active = false; }

  const el = (cls, html = '', parent = root) => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    parent.appendChild(d);
    return d;
  };

  // ------------------------------------------------------------------ stick
  const zone = el('zone');
  const base = el('stick-base');
  const knob = el('stick-knob');
  const stick = { id: null, cx: 0, cy: 0, homeX: 0, homeY: 0, r: 56, dirs: {} };

  function setDirs(d) {
    for (const k of ['left', 'right', 'up', 'down']) {
      const on = !!d[k];
      if (on !== !!stick.dirs[k]) JK.Input.setVirtual(k, on);
    }
    stick.dirs = d;
  }
  function placeStick(x, y, kx = x, ky = y) {
    const R = stick.r, k = knob.offsetWidth / 2 || R * 0.42;
    base.style.left = x - R + 'px'; base.style.top = y - R + 'px';
    knob.style.left = kx - k + 'px'; knob.style.top = ky - k + 'px';
  }
  function moveStick(x, y) {
    let dx = x - stick.cx, dy = y - stick.cy;
    const len = Math.hypot(dx, dy), R = stick.r;
    if (len > R) { dx *= R / len; dy *= R / len; }
    placeStick(stick.cx, stick.cy, stick.cx + dx, stick.cy + dy);
    // 8-way: each axis engages past a dead zone, with overlapping arcs for diagonals.
    // Up needs a slightly firmer push so walking forward doesn't trigger stray jumps.
    const dead = R * 0.28, ax = Math.abs(dx), ay = Math.abs(dy);
    setDirs({
      left: dx < -dead && ax > ay * 0.45,
      right: dx > dead && ax > ay * 0.45,
      up: dy < -dead * 1.25 && ay > ax * 0.6,
      down: dy > dead && ay > ax * 0.6,
    });
  }
  function endStick() {
    stick.id = null;
    base.classList.remove('active');
    setDirs({});
    stick.cx = stick.homeX; stick.cy = stick.homeY;
    placeStick(stick.homeX, stick.homeY);
  }
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (stick.id !== null) return;
    stick.id = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    // the stick re-centres wherever the thumb lands (kept fully on screen)
    const R = stick.r, vw = JK.view.vw, vh = JK.view.vh;
    stick.cx = JK.clamp(e.clientX, R + 4, vw - R - 4);
    stick.cy = JK.clamp(e.clientY, R + 4, vh - R - 4);
    base.classList.add('active');
    moveStick(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) { e.preventDefault(); moveStick(e.clientX, e.clientY); } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, (e) => { if (e.pointerId === stick.id) endStick(); });

  // ------------------------------------------------------------------ buttons
  // id: [label, small caption, style class]
  const DEFS = {
    light: ['LIGHT', 'J', 'light'], heavy: ['HEAVY', 'K', 'heavy'], kick: ['KICK', 'L', 'kick'], block: ['BLOCK', '↓ = LOW', 'block'],
    t1: ['U', 'TECH', 'tech'], t2: ['I', 'TECH', 'tech'], t3: ['O', '1 BAR', 'tech'], dash: ['DASH', '', ''],
    throw: ['THROW', '', ''], amp: ['AMP', '', ''], domain: ['DOMAIN', '', 'domain'],
  };
  const btns = {};
  for (const id in DEFS) {
    const [label, cap, cls] = DEFS[id];
    const b = el('btn ' + cls, label + (cap ? '<small>' + cap + '</small>' : ''));
    btns[id] = b;
    const release = (e) => {
      if (b._pid !== e.pointerId) return;
      b._pid = null;
      b.classList.remove('down');
      JK.Input.setVirtual(id, false);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b._pid = e.pointerId;
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      b.classList.add('down');
      JK.Input.setVirtual(id, true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, release);
  }

  // one-shot buttons: pause and the training keys (TAB / R / C on a keyboard)
  function tapButton(cls, html, action) {
    const b = el(cls, html);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('down');
      JK.Input.menuPress(action);
      setTimeout(() => b.classList.remove('down'), 120);
    });
    return b;
  }
  const pauseZone = tapButton('pause-zone', '<span>❚❚</span>', 'pause');
  const pauseBtn = tapButton('btn pill', '❚❚ PAUSE', 'pause');
  const trainBtns = [
    tapButton('btn pill', 'DUMMY', 'tab'),
    tapButton('btn pill', 'RESET', 'reset'),
    tapButton('btn pill', 'CD', 'cdToggle'),
  ];

  function releaseAll() {
    for (const id in btns) { btns[id]._pid = null; btns[id].classList.remove('down'); }
    if (stick.id !== null) endStick();
    JK.Input.releaseVirtual();
  }

  // ------------------------------------------------------------------ layout
  function box(node, x, y, w, h, font) {
    const s = node.style;
    s.left = Math.round(x) + 'px'; s.top = Math.round(y) + 'px';
    s.width = Math.round(w) + 'px'; s.height = Math.round(h) + 'px';
    if (font) s.fontSize = Math.round(font) + 'px';
  }
  function show(node, on) { node.style.display = on ? '' : 'none'; }

  T.layout = function () {
    const v = JK.view;
    if (!v) return;
    const port = v.portrait, vw = v.vw, vh = v.vh, sf = v.safe;
    // sizes in CSS px; comfortably thumb-sized but compact
    const u = port ? 64 : 54, t = port ? 52 : 44, sm = port ? 34 : 30, gap = port ? 10 : 8, R = port ? 62 : 54;
    const right = sf.r + (port ? 14 : 12);
    const bottom = sf.b + (port ? 18 : 8);
    const p = u + gap;
    const colX = (c, w) => vw - right - u / 2 - c * p - w / 2; // left edge of a w-wide button centred on column c
    const rowY = (off, h) => vh - bottom - off - h;             // top edge of a row sitting `off` px above the bottom
    const place = (id, c, off, w, h, font, span = 1) => {
      const cw = w + (span - 1) * p;
      const x = colX(c + (span - 1) / 2, cw);
      box(btns[id], x, rowY(off, h), cw, h, font);
      btns[id].classList.toggle('pill', h < w * 0.8 || span > 1);
    };
    if (port) {
      // 3 columns:  THROW AMP DOMAIN / U I O / BLOCK-BLOCK DASH / LIGHT HEAVY KICK
      place('light', 2, 0, u, u, 15); place('heavy', 1, 0, u, u, 15); place('kick', 0, 0, u, u, 15);
      const r1 = u + gap;
      place('block', 1, r1, u, 50, 18, 2); place('dash', 0, r1, u, 50, 15);
      const r2 = r1 + 50 + gap;
      place('t1', 2, r2, t, t, 22); place('t2', 1, r2, t, t, 22); place('t3', 0, r2, t, t, 22);
      const r3 = r2 + t + gap;
      place('throw', 2, r3, u, sm, 13); place('amp', 1, r3, u, sm, 13); place('domain', 0, r3, u, sm, 13);
    } else {
      // 4 columns:  THROW AMP DOMAIN / DASH U I O / BLOCK LIGHT HEAVY KICK
      place('block', 3, 0, u, u, 12); place('light', 2, 0, u, u, 12); place('heavy', 1, 0, u, u, 12); place('kick', 0, 0, u, u, 12);
      const r1 = u + gap;
      place('dash', 3, r1, t, t, 11); place('t1', 2, r1, t, t, 20); place('t2', 1, r1, t, t, 20); place('t3', 0, r1, t, t, 20);
      const r2 = r1 + t + gap;
      place('throw', 2, r2, u, sm, 11); place('amp', 1, r2, u, sm, 11); place('domain', 0, r2, u, sm, 11);
    }

    // stick: resting spot bottom-left; the capture zone is generous but stays off the button cluster
    stick.r = R;
    box(base, 0, 0, R * 2, R * 2);
    const kn = Math.round(R * 0.84);
    box(knob, 0, 0, kn, kn);
    stick.homeX = sf.l + 18 + R;
    stick.homeY = vh - bottom - R - (port ? 40 : 4);
    const clusterLeft = colX(port ? 2 : 3, u) - 10;
    const zoneTop = port ? v.oy + v.h + 60 : vh * 0.3;
    box(zone, 0, zoneTop, Math.min(vw * (port ? 0.5 : 0.42), clusterLeft), vh - zoneTop);
    if (stick.id === null) { stick.cx = stick.homeX; stick.cy = stick.homeY; placeStick(stick.homeX, stick.homeY); }

    // pause + training buttons
    const s = v.scale, L = (x) => v.ox + x * s, Tp = (y) => v.oy + y * s;
    show(pauseZone, !port); show(pauseBtn, port);
    if (!port) {
      // the round timer itself is the pause button; the small badge sits just under it
      box(pauseZone, L(JK.W / 2 - 60), Tp(0), 120 * s, 138 * s);
      const tw = 62, th = 30, tg = 6, tx = L(JK.W - 14) - (tw * 3 + tg * 2);
      trainBtns.forEach((b, i) => box(b, tx + i * (tw + tg), Tp(304), tw, th, 13));
    } else {
      const y = v.oy + v.h + 12;
      box(pauseBtn, sf.l + 14, y, 96, 36, 15);
      const tw = 76, tg = 8, tx = vw - right - (tw * 3 + tg * 2);
      trainBtns.forEach((b, i) => box(b, tx + i * (tw + tg), y, tw, 36, 15));
    }
    rotateHint.style.top = v.oy + v.h + 28 + 'px';
  };

  T.setActive = function (on) {
    if (T.active === on) return;
    T.active = on;
    if (!on) releaseAll();
    T.layout();
  };
  // true while the landscape overlay is up, so the HUD moves its meters out from under the thumbs
  T.hudTop = () => T.active && !!JK.view && !JK.view.portrait;

  // a physical keyboard takes over from the touch controls (iPad keyboards, desktops)
  window.addEventListener('keydown', () => T.setActive(false));

  // ------------------------------------------------------------------ per-frame state
  let shown = false, trainShown = null, rotShown = false;
  function tick() {
    const M = JK.Menus, g = M && M.game;
    const fight = T.active && M && M.screen === 'fight' && !!g && !g.paused && !M.moveList;
    if (fight !== shown) {
      shown = fight;
      root.classList.toggle('on', fight);
      if (!fight) releaseAll();
    }
    const training = fight && g.mode === 'training';
    if (training !== trainShown) { trainShown = training; trainBtns.forEach((b) => show(b, training)); }
    if (fight) {
      const me = g.net && M.netLocalPlayer === 2 ? g.p2 : g.p1;
      if (me) {
        btns.domain.classList.toggle('ready', me.meter >= 300);
        for (const k of ['t1', 't2', 't3']) btns[k].classList.toggle('cooling', !!(me.cd && me.cd[k] > 0));
      }
    }
    const rot = T.active && !!JK.view && JK.view.portrait && !!M && M.screen !== 'fight';
    if (rot !== rotShown) { rotShown = rot; rotateHint.classList.toggle('on', rot); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return T;
})();
