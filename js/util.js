'use strict';
// Shared namespace + small math/drawing helpers.
const JK = (window.JK = {});

JK.W = 1280;
JK.H = 720;
JK.GROUND = 610; // screen-space y of the ground line at zoom 1
JK.STAGE_W = 2400;
JK.DEG = Math.PI / 180;

JK.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
JK.lerp = (a, b, t) => a + (b - a) * t;
JK.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
JK.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
JK.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
JK.chance = (p) => Math.random() < p;
JK.sign = (v) => (v < 0 ? -1 : 1);
JK.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
JK.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

JK.ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  snap: (t) => (t < 1 ? 0 : 1),
};

// Seeded RNG, used where drawings must be stable frame to frame (stage props, stars, etc.)
JK.rng = function (seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 100000) / 100000;
  };
};

// Netplay determinism. While an online match is live, every randomness call that can
// change the simulation (damage rolls, Black Flash, Hakari's reels, trial sequences)
// draws from this one shared seeded stream, so both peers stay in lockstep.
// Outside netplay the stream is null and everything falls back to Math.random.
JK._simRng = null;
JK.seedSim = function (seed) { JK._simRng = (seed >>> 0) || 1; };
JK.stopSim = function () { JK._simRng = null; };
JK.simRandom = function () {
  if (JK._simRng !== null) {
    let s = JK._simRng;
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    JK._simRng = s >>> 0;
    return (s % 100000) / 100000;
  }
  return Math.random();
};
JK.simPick = (arr) => arr[Math.floor(JK.simRandom() * arr.length)];
JK.simRandi = (a, b) => Math.floor(a + JK.simRandom() * (b - a + 1));

JK.hex2rgb = function (hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
JK.rgba = function (hex, a) {
  const [r, g, b] = JK.hex2rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
JK.mix = function (hexA, hexB, t) {
  const a = JK.hex2rgb(hexA), b = JK.hex2rgb(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

JK.makeCanvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

// Cached soft radial glow sprites, drawn with 'lighter' for cheap bloom.
JK._glowCache = {};
JK.glow = function (color, size = 128) {
  const key = color + size;
  if (JK._glowCache[key]) return JK._glowCache[key];
  const c = JK.makeCanvas(size, size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, JK.rgba(color, 1));
  grd.addColorStop(0.25, JK.rgba(color, 0.55));
  grd.addColorStop(0.6, JK.rgba(color, 0.15));
  grd.addColorStop(1, JK.rgba(color, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  JK._glowCache[key] = c;
  return c;
};
JK.drawGlow = function (ctx, color, x, y, r, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const spr = JK.glow(color);
  const prev = ctx.globalCompositeOperation;
  const pa = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = pa * alpha;
  ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = pa;
  ctx.globalCompositeOperation = prev;
};

// Text helpers ---------------------------------------------------------------
JK.FONT_TITLE = '"Bebas Neue", "Anton", Impact, sans-serif';
JK.FONT_JP = '"Yuji Syuku", "Zen Antique", "Yu Mincho", "MS Mincho", serif';
JK.FONT_UI = '"Rajdhani", "Segoe UI", sans-serif';

JK.text = function (ctx, str, x, y, opts = {}) {
  const {
    size = 32, font = JK.FONT_TITLE, color = '#fff', align = 'center', baseline = 'middle',
    stroke = null, strokeW = 6, shadow = null, shadowBlur = 0, alpha = 1, weight = '', spacing = 0,
  } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowBlur = shadowBlur;
  }
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
};

JK.roundRect = function (ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Persistent settings --------------------------------------------------------
JK.settings = {
  master: 0.8, music: 0.55, sfx: 0.9, voice: true, shake: true, hitboxes: false, ost: true, smooth: true, painted: true,
};
try {
  const saved = JSON.parse(localStorage.getItem('jk_settings') || 'null');
  if (saved) Object.assign(JK.settings, saved);
} catch (e) { /* storage unavailable */ }
JK.saveSettings = function () {
  try { localStorage.setItem('jk_settings', JSON.stringify(JK.settings)); } catch (e) { /* ignore */ }
};
