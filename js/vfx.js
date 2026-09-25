'use strict';
// World-space particle/VFX system. Layers: 'back' (behind fighters) and 'front'.
JK.FX = (function () {
  const list = [];
  const T = {}; // type handlers {update(p), draw(ctx,p)}
  const FX = { list };

  FX.clear = () => { list.length = 0; };
  FX.add = function (p) {
    p.t = 0;
    p.life = p.life || 30;
    p.layer = p.layer || 'front';
    list.push(p);
    return p;
  };
  FX.update = function (slow = 1) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += slow;
      const h = T[p.type];
      if (h && h.update) h.update(p, slow);
      else {
        p.x += (p.vx || 0) * slow;
        p.y += (p.vy || 0) * slow;
      }
      if (p.t >= p.life) list.splice(i, 1);
    }
  };
  FX.draw = function (ctx, layer) {
    for (const p of list) {
      if (p.layer !== layer) continue;
      const h = T[p.type];
      if (h) h.draw(ctx, p);
    }
  };

  const k = (p) => p.t / p.life; // normalized age

  // ---------- particle types ----------
  T.spark = {
    update(p, s) {
      p.x += p.vx * s; p.y += p.vy * s;
      p.vx *= 0.9; p.vy = p.vy * 0.9 + (p.g || 0);
    },
    draw(ctx, p) {
      const a = 1 - k(p);
      const len = p.len * a;
      const ang = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = JK.rgba(p.color, a);
      ctx.lineWidth = p.w * a + 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
      ctx.stroke();
      ctx.strokeStyle = JK.rgba('#ffffff', a * 0.9);
      ctx.lineWidth = Math.max(0.5, p.w * a * 0.4);
      ctx.stroke();
      ctx.restore();
    },
  };
  T.dot = {
    update(p, s) {
      p.x += p.vx * s; p.y += p.vy * s;
      p.vx *= p.drag ?? 0.94; p.vy = p.vy * (p.drag ?? 0.94) + (p.g || 0);
    },
    draw(ctx, p) {
      const a = (1 - k(p)) * (p.alpha ?? 1);
      JK.drawGlow(ctx, p.color, p.x, p.y, p.r * (p.grow ? 1 + k(p) * p.grow : 1 - k(p) * 0.5), a);
    },
  };
  T.flash = {
    update() {},
    draw(ctx, p) {
      const e = k(p);
      const a = (1 - e) * (p.alpha ?? 1);
      JK.drawGlow(ctx, p.color, p.x, p.y, p.r * (0.6 + e * 0.8), a);
      JK.drawGlow(ctx, '#ffffff', p.x, p.y, p.r * 0.35 * (1 - e), a);
    },
  };
  T.ring = {
    update() {},
    draw(ctx, p) {
      const e = JK.ease.outCubic(k(p));
      const r = p.r0 + (p.r1 - p.r0) * e;
      ctx.save();
      if (p.add !== false) ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = JK.rgba(p.color, (1 - k(p)) * (p.alpha ?? 1));
      ctx.lineWidth = p.w * (1 - e) + 1;
      ctx.beginPath();
      if (p.flat) ctx.ellipse(p.x, p.y, r, r * p.flat, 0, 0, Math.PI * 2);
      else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  };
  T.smoke = {
    update(p, s) {
      p.x += p.vx * s; p.y += p.vy * s;
      p.vx *= 0.95; p.vy *= 0.95;
    },
    draw(ctx, p) {
      const e = k(p);
      ctx.save();
      ctx.globalAlpha = (1 - e) * (p.alpha ?? 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.5 + e * (p.grow ?? 1.2)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
  // Crescent slash arc (Sukuna's Dismantle/Cleave, sword-like cuts)
  T.slash = {
    update() {},
    draw(ctx, p) {
      const e = k(p);
      const grow = JK.ease.outExpo(Math.min(1, e * 3));
      const a = 1 - JK.ease.inQuad(e);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.globalCompositeOperation = 'lighter';
      const L = p.len * grow;
      ctx.beginPath();
      ctx.moveTo(-L / 2, 0);
      ctx.quadraticCurveTo(0, -p.curve, L / 2, 0);
      ctx.quadraticCurveTo(0, -p.curve + p.w, -L / 2, 0);
      ctx.fillStyle = JK.rgba(p.color, a * 0.9);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-L / 2, 0);
      ctx.quadraticCurveTo(0, -p.curve, L / 2, 0);
      ctx.strokeStyle = JK.rgba('#ffffff', a);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    },
  };
  // Straight thin cut line that flashes (sure-hit slashes)
  T.cut = {
    update() {},
    draw(ctx, p) {
      const e = k(p);
      const a = e < 0.2 ? e / 0.2 : 1 - (e - 0.2) / 0.8;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = JK.rgba(p.color, a);
      ctx.lineWidth = p.w * (1 - e * 0.6);
      ctx.beginPath();
      const g = Math.min(1, e * 5);
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x1 + (p.x2 - p.x1) * g, p.y1 + (p.y2 - p.y1) * g);
      ctx.stroke();
      ctx.strokeStyle = JK.rgba('#ffffff', a);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    },
  };
  // Jagged lightning (Black Flash arcs). Re-randomized each frame for flicker.
  T.bolt = {
    update() {},
    draw(ctx, p) {
      const e = k(p);
      const a = 1 - e;
      const pts = [];
      const n = p.seg || 8;
      const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const off = i === 0 || i === n ? 0 : (Math.random() - 0.5) * p.jag;
        pts.push([p.x1 + dx * t + nx * off, p.y1 + dy * t + ny * off]);
      }
      ctx.save();
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = JK.rgba(p.glow || '#ff1030', a * 0.8);
      ctx.lineWidth = p.w * 2.4;
      ctx.stroke();
      ctx.strokeStyle = JK.rgba(p.color || '#050005', a);
      ctx.lineWidth = p.w;
      ctx.stroke();
      ctx.restore();
    },
  };
  T.text = {
    update(p, s) { p.y += (p.vy ?? -0.4) * s; },
    draw(ctx, p) {
      const e = k(p);
      const sc = e < 0.12 ? JK.ease.outBack(e / 0.12) : 1;
      const a = e > 0.7 ? 1 - (e - 0.7) / 0.3 : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(sc * (p.sx || 1), sc);
      JK.text(ctx, p.str, 0, 0, { size: p.size || 40, font: p.font || JK.FONT_JP, color: p.color || '#fff', stroke: p.stroke || '#000', strokeW: p.strokeW || 6, alpha: a });
      ctx.restore();
    },
  };
  T.shard = {
    update(p, s) {
      p.x += p.vx * s; p.y += p.vy * s; p.vy += (p.g ?? 0.25) * s; p.rot += p.vr * s;
    },
    draw(ctx, p) {
      const a = 1 - k(p);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
  };
  T.debris = {
    update(p, s) {
      p.x += p.vx * s; p.y += p.vy * s; p.vy += 0.6 * s; p.rot += p.vr * s;
      if (p.y > 0) { p.y = 0; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5; }
    },
    draw(ctx, p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, (1 - k(p)) * 3);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
      ctx.restore();
    },
  };
  // Anime impact burst: radial wedge lines around a point
  T.burst = {
    update() {},
    draw(ctx, p) {
      const e = k(p);
      const a = 1 - e;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = p.add === false ? 'source-over' : 'lighter';
      ctx.fillStyle = JK.rgba(p.color, a);
      const r0 = p.r * (0.3 + e * 0.9), r1 = p.r * (1 + e * 1.4);
      for (let i = 0; i < p.n; i++) {
        const ang = p.seed + (i / p.n) * Math.PI * 2 + (i % 2) * 0.1;
        const w = 0.06 * (1 - e) + 0.01;
        const len = r1 * (0.6 + ((i * 37) % 10) / 20);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang - w) * r0, Math.sin(ang - w) * r0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.lineTo(Math.cos(ang + w) * r0, Math.sin(ang + w) * r0);
        ctx.fill();
      }
      ctx.restore();
    },
  };
  // Flame tongue particle (Fuga, fire)
  T.flame = {
    update(p, s) {
      p.x += p.vx * s; p.y += p.vy * s; p.vy -= 0.12 * s; p.vx *= 0.96;
    },
    draw(ctx, p) {
      const e = k(p);
      const c = e < 0.3 ? '#fff3b0' : e < 0.6 ? '#ff9a2a' : '#ff3a1a';
      JK.drawGlow(ctx, c, p.x, p.y, p.r * (1 - e * 0.6), 1 - e);
    },
  };
  // Swirling orb particles pulled toward a center (Blue)
  T.swirl = {
    update(p, s) {
      p.ang += p.spin * s;
      p.rad = Math.max(0, p.rad - p.pull * s);
      p.x = p.cx + Math.cos(p.ang) * p.rad;
      p.y = p.cy + Math.sin(p.ang) * p.rad * 0.8;
    },
    draw(ctx, p) {
      JK.drawGlow(ctx, p.color, p.x, p.y, p.r, (1 - k(p)) * (p.alpha ?? 1));
    },
  };
  // The veil (帳) lighting up where a fighter is slammed into the stage edge: hex cells + ripple.
  T.veil = {
    update() {},
    draw(ctx, p) {
      const e = k(p);
      const a = 1 - e;
      const R = 50 + JK.ease.outCubic(e) * 260;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, p.y);
      ctx.scale(0.28, 1);
      const s = 22, h = s * Math.sqrt(3);
      for (let gx = -12; gx <= 12; gx++) {
        for (let gy = -9; gy <= 9; gy++) {
          const cx = gx * s * 1.5, cy = gy * h + (gx & 1 ? h / 2 : 0);
          const d = Math.hypot(cx, cy);
          const front = 1 - Math.min(1, Math.abs(d - R) / 70);
          const inner = d < R ? 0.25 : 0;
          const al = (front * 0.9 + inner) * a;
          if (al < 0.03) continue;
          ctx.strokeStyle = JK.rgba(p.color, al);
          ctx.lineWidth = 2 + front * 3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const an = (i / 6) * Math.PI * 2;
            const px = cx + Math.cos(an) * s * 0.92, py = cy + Math.sin(an) * s * 0.92;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.strokeStyle = JK.rgba('#ffffff', a * 0.9);
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      JK.drawGlow(ctx, p.color, p.x, p.y, 140 * a + 40, 0.5 * a);
    },
  };
  T.custom = {
    update(p, s) { if (p.u) p.u(p, s); },
    draw(ctx, p) { p.d(ctx, p, k(p)); },
  };

  // ---------- presets ----------
  FX.hitSpark = function (x, y, dir, power = 1, color = '#ffd27a') {
    const n = 6 + power * 5;
    for (let i = 0; i < n; i++) {
      const ang = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.2;
      const sp = 6 + Math.random() * 10 * power;
      FX.add({ type: 'spark', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: 10 + power * 8, w: 2 + power, color, life: 10 + Math.random() * 8 });
    }
    FX.add({ type: 'flash', x, y, r: 40 + power * 30, color, life: 8 + power * 2 });
    FX.add({ type: 'burst', x, y, r: 30 + power * 18, n: 10 + power * 2, seed: Math.random() * 6, color: '#ffffff', life: 7 + power });
    if (power >= 2) FX.add({ type: 'ring', x, y, r0: 10, r1: 60 + power * 25, w: 6, color, life: 14 });
  };
  FX.blockSpark = function (x, y, dir, infinity) {
    if (infinity) {
      FX.add({ type: 'ring', x, y, r0: 8, r1: 55, w: 3, color: '#9fe6ff', life: 18 });
      FX.add({ type: 'ring', x, y, r0: 4, r1: 35, w: 2, color: '#ffffff', life: 12 });
      FX.add({ type: 'flash', x, y, r: 50, color: '#6fc8ff', life: 10, alpha: 0.7 });
      return;
    }
    for (let i = 0; i < 8; i++) {
      const ang = (dir > 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
      FX.add({ type: 'spark', x, y, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7 - 2, len: 10, w: 2, color: '#8fd0ff', life: 10, g: 0.3 });
    }
    FX.add({ type: 'flash', x, y, r: 36, color: '#7ab8ff', life: 7 });
  };
  FX.dust = function (x, y, dir = 0, n = 6, color = '#b8aa98') {
    for (let i = 0; i < n; i++) {
      FX.add({ type: 'smoke', layer: 'back', x: x + (Math.random() - 0.5) * 20, y: y - Math.random() * 8, vx: (dir || (Math.random() - 0.5)) * (1 + Math.random() * 3), vy: -Math.random() * 1.5, r: 8 + Math.random() * 10, color, alpha: 0.35, life: 30 + Math.random() * 20 });
    }
  };
  FX.slashMarks = function (x, y, n = 3, color = '#ff5060', size = 1) {
    for (let i = 0; i < n; i++) {
      FX.add({
        type: 'slash', x: x + (Math.random() - 0.5) * 50 * size, y: y + (Math.random() - 0.5) * 70 * size,
        ang: (Math.random() - 0.5) * 2.4 + (Math.random() < 0.5 ? 0 : Math.PI), len: (80 + Math.random() * 60) * size,
        curve: (10 + Math.random() * 10) * size, w: 5 * size, color, life: 14 + Math.random() * 6,
      });
    }
  };
  FX.blackFlash = function (x, y, dir, noText) {
    // distortion of space: black bolts with red glow, big shockwave
    for (let i = 0; i < 9; i++) {
      const ang = (Math.random() - 0.5) * Math.PI * 2;
      const len = 80 + Math.random() * 160;
      FX.add({ type: 'bolt', x1: x, y1: y, x2: x + Math.cos(ang) * len, y2: y + Math.sin(ang) * len, w: 3 + Math.random() * 3, jag: 34, seg: 7, life: 16 + Math.random() * 14 });
    }
    FX.add({ type: 'flash', x, y, r: 220, color: '#ff1a3a', life: 16 });
    FX.add({ type: 'ring', x, y, r0: 10, r1: 240, w: 14, color: '#ff2040', life: 20 });
    FX.add({ type: 'ring', x, y, r0: 10, r1: 170, w: 10, color: '#000000', life: 18, add: false, alpha: 0.9 });
    FX.add({ type: 'burst', x, y, r: 120, n: 18, seed: Math.random() * 6, color: '#000000', add: false, life: 14 });
    for (let i = 0; i < 20; i++) {
      const ang = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.6;
      const sp = 8 + Math.random() * 16;
      FX.add({ type: 'spark', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: 26, w: 4, color: '#ff2040', life: 18 });
    }
    if (noText) return;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].type === 'text' && (list[i].str === '黒閃' || list[i].str === 'BLACK FLASH')) list.splice(i, 1);
    FX.add({ type: 'text', x: x, y: y - 120, str: '黒閃', size: 84, color: '#ff2a3a', stroke: '#000', strokeW: 10, life: 60, vy: -0.3 });
    FX.add({ type: 'text', x: x, y: y - 62, str: 'BLACK FLASH', size: 30, font: JK.FONT_TITLE, color: '#fff', stroke: '#000', strokeW: 6, life: 60, vy: -0.3 });
  };
  FX.explosion = function (x, y, scale = 1, color = '#ff8a2a') {
    FX.add({ type: 'flash', x, y, r: 160 * scale, color, life: 18 });
    FX.add({ type: 'ring', x, y, r0: 10, r1: 170 * scale, w: 12, color, life: 20 });
    for (let i = 0; i < 26 * scale; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9 * scale;
      FX.add({ type: 'flame', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, r: 18 + Math.random() * 26 * scale, life: 26 + Math.random() * 20 });
    }
    for (let i = 0; i < 10 * scale; i++) {
      FX.add({ type: 'smoke', x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 2, r: 20 + Math.random() * 20, color: '#2a2224', alpha: 0.5, life: 60 + Math.random() * 30 });
    }
  };
  FX.shockwave = function (x, y, color = '#ffffff', size = 1) {
    FX.add({ type: 'ring', x, y: y - 4, r0: 10, r1: 180 * size, w: 8, color, flat: 0.18, life: 22, layer: 'back' });
    FX.dust(x, y, -1, 5);
    FX.dust(x, y, 1, 5);
  };
  FX.debris = function (x, y, n = 10, color = '#6b6258') {
    for (let i = 0; i < n; i++) {
      FX.add({ type: 'debris', x, y: y - 4, vx: (Math.random() - 0.5) * 14, vy: -4 - Math.random() * 12, r: 2 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5, color, life: 60 + Math.random() * 30 });
    }
  };
  FX.text = function (x, y, str, opts = {}) {
    FX.add(Object.assign({ type: 'text', x, y, str, life: 50 }, opts));
  };
  FX.aura = function (x, y, color, n = 2, spread = 40, h = 220) {
    for (let i = 0; i < n; i++) {
      FX.add({ type: 'dot', layer: 'back', x: x + (Math.random() - 0.5) * spread, y: y - Math.random() * h, vx: (Math.random() - 0.5) * 0.6, vy: -1.5 - Math.random() * 2.5, r: 10 + Math.random() * 16, color, alpha: 0.55, drag: 0.98, life: 24 + Math.random() * 16 });
    }
  };
  // Screen-space glass shards (domain shatter). Coordinates are screen pixels.
  FX.shatterScreen = function (arr, color) {
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * JK.W, y = Math.random() * JK.H;
      const s = 20 + Math.random() * 60;
      const pts = [[0, 0], [s * (0.5 + Math.random()), s * (Math.random() - 0.5)], [s * (Math.random() - 0.3), s * (0.4 + Math.random())]];
      arr.push({ type: 'shard', x, y, vx: (x - JK.W / 2) * 0.03 + (Math.random() - 0.5) * 6, vy: (y - JK.H / 2) * 0.03 - 4 - Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, pts, color: JK.rgba(color, 0.5 + Math.random() * 0.4), life: 50 + Math.random() * 40, t: 0, g: 0.35 });
    }
  };
  FX.updateList = function (arr, s = 1) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.t += s;
      T[p.type].update(p, s);
      if (p.t >= p.life) arr.splice(i, 1);
    }
  };
  FX.drawList = function (ctx, arr) { for (const p of arr) T[p.type].draw(ctx, p); };

  return FX;
})();
