'use strict';
// Parallax stages + domain expansion interiors. All drawn procedurally.
(function () {
  const W = JK.W, H = JK.H, GY = JK.GROUND, SW = JK.STAGE_W;
  const LW = 2800; // layer width

  function layer(ctx, cam, img, f, baseY) {
    const zf = 1 + (cam.z - 1) * f;
    const cx = SW / 2 + (cam.x - SW / 2) * f;
    const sx = (SW / 2 - img.width / 2 - cx) * zf + W / 2;
    const sy = GY + (baseY - img.height - cam.y * f) * zf;
    ctx.drawImage(img, sx, sy, img.width * zf, img.height * zf);
  }
  // world->screen for a given parallax factor
  function proj(cam, f, u, v) {
    const zf = 1 + (cam.z - 1) * f;
    const cx = SW / 2 + (cam.x - SW / 2) * f;
    return [(u - cx) * zf + W / 2, GY + (v - cam.y * f) * zf, zf];
  }
  function lcanvas(h, draw, seed = 1) {
    const c = JK.makeCanvas(LW, h);
    const g = c.getContext('2d');
    draw(g, JK.rng(seed), LW, h);
    return c;
  }
  function skyGrad(ctx, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  function floor(ctx, cam, top, bottom, lineColor, spacing = 140, opts = {}) {
    const gy = GY - cam.y * cam.z;
    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, W, H - gy);
    if (!lineColor) return;
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const start = Math.floor((cam.x - 1200) / spacing) * spacing;
    for (let u = start; u < cam.x + 1200; u += spacing) {
      const [sx] = proj(cam, 1, u, 0);
      ctx.moveTo(sx, gy);
      ctx.lineTo(W / 2 + (sx - W / 2) * 2.2, H + 40);
    }
    const rows = opts.rows || [0.1, 0.28, 0.55, 0.9];
    for (const r of rows) {
      const y = gy + (H - gy) * r;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ painted backdrops
  // Stages and domains can carry a painted plate (art/<id>.jpg, generated with Higgsfield).
  // The painting is drawn as one parallax layer whose floor lines up with the fighters' floor;
  // live effects (rain, fog, Judgeman, cracks...) are still drawn in code on top of it.
  JK.ART = {};
  JK.loadArt = function (id) {
    if (JK.ART[id]) return JK.ART[id];
    const img = new Image();
    img.onload = () => { img.ready = true; };
    img.onerror = () => { img.failed = true; };
    img.src = 'art/' + id + '.jpg';
    JK.ART[id] = img;
    return img;
  };
  function paintBack(S, ctx, cam, t) {
    if (!S.paint || JK.settings.painted === false) return false;
    const img = JK.loadArt(S.paint.id || S.id);
    if (!img.ready) return false;
    const f = S.paint.f ?? 0.5, gf = S.paint.ground ?? 0.86;
    const zf = 1 + (cam.z - 1) * f;
    const h = ((GY + 80) / gf) * zf;
    const w = (h * img.width) / img.height;
    const cx = SW / 2 + (cam.x - SW / 2) * f;
    const x = W / 2 - w / 2 - (cx - SW / 2) * zf + (S.paint.dx || 0) * zf;
    const groundY = GY - cam.y * cam.z;
    const y = groundY - h * gf;
    // stretch the outermost rows if the camera ever sees past the painting's edges
    if (y > 0) ctx.drawImage(img, 0, 0, img.width, 2, x, 0, w, y + 2);
    if (y + h < H) ctx.drawImage(img, 0, img.height - 2, img.width, 2, x, y + h - 2, w, H - (y + h) + 2);
    ctx.drawImage(img, x, y, w, h);
    // settle the painting behind the cel-shaded fighters
    if (S.paint.tint) { ctx.fillStyle = S.paint.tint; ctx.fillRect(0, 0, W, H); }
    const gg = ctx.createLinearGradient(0, groundY - 40, 0, H);
    gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = gg; ctx.fillRect(0, groundY - 40, W, H - groundY + 40);
    return true;
  }
  JK.paintBack = paintBack;

  // ------------------------------------------------------------------ shared building blocks
  function mountains(g, r, w, h, color, peaks, jag) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, h);
    let x = 0;
    while (x <= w) {
      const y = h * (0.15 + r() * 0.5);
      g.lineTo(x, y);
      x += peaks * (0.5 + r());
      g.lineTo(x - peaks * 0.3, y + jag * r());
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  }
  function roof(g, x, y, w, h, color, edge) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x - w * 0.08, y + h);
    g.quadraticCurveTo(x + w * 0.1, y + h * 0.7, x + w * 0.2, y);
    g.lineTo(x + w * 0.8, y);
    g.quadraticCurveTo(x + w * 0.9, y + h * 0.7, x + w * 1.08, y + h);
    g.closePath();
    g.fill();
    if (edge) {
      g.fillStyle = edge;
      g.fillRect(x - w * 0.06, y + h - 4, w * 1.12, 4);
    }
  }
  function torii(g, x, y, s, color) {
    g.fillStyle = color;
    g.fillRect(x - 60 * s, y - 150 * s, 12 * s, 150 * s);
    g.fillRect(x + 48 * s, y - 150 * s, 12 * s, 150 * s);
    g.beginPath();
    g.moveTo(x - 90 * s, y - 165 * s);
    g.quadraticCurveTo(x, y - 150 * s, x + 90 * s, y - 165 * s);
    g.lineTo(x + 84 * s, y - 150 * s);
    g.quadraticCurveTo(x, y - 140 * s, x - 84 * s, y - 150 * s);
    g.closePath();
    g.fill();
    g.fillRect(x - 70 * s, y - 128 * s, 140 * s, 9 * s);
    g.fillStyle = '#1a1010';
    g.fillRect(x - 92 * s, y - 170 * s, 184 * s, 6 * s);
  }
  function sakuraTree(g, r, x, y, s) {
    g.strokeStyle = '#2a1a1c';
    g.lineCap = 'round';
    const branch = (bx, by, ang, len, w, d) => {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      g.lineWidth = w;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
      if (d > 0) {
        branch(ex, ey, ang - 0.4 - r() * 0.3, len * 0.72, w * 0.66, d - 1);
        branch(ex, ey, ang + 0.4 + r() * 0.3, len * 0.72, w * 0.66, d - 1);
      } else {
        for (let i = 0; i < 5; i++) {
          g.fillStyle = JK.pick(['#f7b6c8', '#f39ab4', '#fcd0dc', '#e888a4']);
          g.globalAlpha = 0.85;
          g.beginPath(); g.arc(ex + (r() - 0.5) * 40 * s, ey + (r() - 0.5) * 30 * s, (10 + r() * 16) * s, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
        }
      }
    };
    branch(x, y, -Math.PI / 2, 90 * s, 16 * s, 4);
  }

  // ------------------------------------------------------------------ STAGES
  const STAGES = {};

  STAGES.jujutsu_high = {
    paint: { ground: 0.86, tint: 'rgba(20,10,30,0.12)' },
    id: 'jujutsu_high', name: 'TOKYO JUJUTSU HIGH', jp: '東京都立呪術高等専門学校', music: 'stage_jujutsu_high', rim: '#ffc890',
    thumb: ['#2b3a6b', '#e8845a', '#ffd39a'],
    build() {
      this.L = {
        mtn: lcanvas(320, (g, r, w, h) => {
          mountains(g, r, w, h, '#6a4f7a', 220, 40);
          g.globalAlpha = 0.6; mountains(g, r, w, h, '#4a3a60', 160, 30); g.globalAlpha = 1;
        }, 11),
        forest: lcanvas(260, (g, r, w, h) => {
          g.fillStyle = '#2c2a3e';
          for (let x = 0; x < w; x += 18) {
            const th = 120 + r() * 120;
            g.beginPath(); g.moveTo(x - 20, h); g.lineTo(x, h - th); g.lineTo(x + 20, h); g.fill();
          }
          // pagoda
          const px = w * 0.62;
          for (let i = 0; i < 5; i++) {
            const ww = 150 - i * 22, yy = h - 50 - i * 42;
            g.fillStyle = '#1e1a2a'; g.fillRect(px - ww * 0.3, yy, ww * 0.6, 42);
            roof(g, px - ww / 2, yy - 18, ww, 22, '#1a1624');
          }
          g.fillRect(px - 3, h - 300, 6, 60);
        }, 12),
        school: lcanvas(360, (g, r, w, h) => {
          for (let i = 0; i < 6; i++) {
            const bx = 120 + i * 470 + r() * 60, bw = 300 + r() * 100, bh = 150 + r() * 60;
            g.fillStyle = '#e8dcc4';
            g.fillRect(bx, h - bh, bw, bh);
            g.fillStyle = '#5a3a2a';
            for (let k = 0; k <= 6; k++) g.fillRect(bx + (k / 6) * bw - 4, h - bh, 8, bh);
            g.fillRect(bx, h - bh * 0.55, bw, 7);
            g.fillStyle = 'rgba(255,190,110,0.55)';
            for (let k = 0; k < 6; k++) g.fillRect(bx + (k / 6) * bw + 10, h - bh * 0.45, bw / 6 - 20, bh * 0.3);
            roof(g, bx - 20, h - bh - 70, bw + 40, 74, '#2a2a36', '#8a6a4a');
          }
          torii(g, w * 0.5, h, 1.5, '#c8322a');
        }, 13),
        trees: lcanvas(420, (g, r, w, h) => {
          for (let i = 0; i < 7; i++) sakuraTree(g, r, 150 + i * 420 + r() * 100, h, 1.1 + r() * 0.4);
        }, 14),
      };
      this.petals = [];
      for (let i = 0; i < 60; i++) this.petals.push({ x: Math.random() * W, y: Math.random() * H, vx: 0.6 + Math.random(), vy: 0.6 + Math.random() * 0.8, r: 3 + Math.random() * 3, ph: Math.random() * 6 });
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#1f2a55'], [0.35, '#6a4a7a'], [0.62, '#e8845a'], [0.82, '#ffc27e'], [1, '#ffe0a8']]);
      const [sx, sy] = proj(cam, 0.05, SW / 2 + 260, -300);
      JK.drawGlow(ctx, '#ffb060', sx, sy, 380, 0.7);
      JK.drawGlow(ctx, '#fff0c0', sx, sy, 90, 1);
      // clouds
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const [cx, cy] = proj(cam, 0.08, (i * 420 + t * 0.15) % 2800 + SW / 2 - 1400, -470 + (i % 3) * 50);
        ctx.fillStyle = 'rgba(255,190,150,0.35)';
        ctx.beginPath(); ctx.ellipse(cx, cy, 150, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,80,120,0.25)';
        ctx.beginPath(); ctx.ellipse(cx + 20, cy + 10, 130, 12, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      layer(ctx, cam, this.L.mtn, 0.12, -60);
      layer(ctx, cam, this.L.forest, 0.3, -30);
      // warm haze
      ctx.fillStyle = 'rgba(255,170,110,0.12)';
      ctx.fillRect(0, GY - 260, W, 260);
      layer(ctx, cam, this.L.school, 0.55, -10);
      layer(ctx, cam, this.L.trees, 0.8, 4);
      floor(ctx, cam, '#8a7462', '#3e3230', 'rgba(40,24,20,0.35)', 150);
      // god rays
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = 0.05 + Math.sin(t * 0.01 + i) * 0.02;
        ctx.fillStyle = `rgba(255,200,140,${a})`;
        ctx.beginPath();
        ctx.moveTo(sx - 40 + i * 30, sy);
        ctx.lineTo(sx - 600 + i * 260, H);
        ctx.lineTo(sx - 480 + i * 260, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
    drawFront(ctx, cam, t) {
      for (const p of this.petals) {
        p.x += p.vx + Math.sin(t * 0.02 + p.ph) * 0.5; p.y += p.vy;
        if (p.y > H) { p.y = -10; p.x = Math.random() * W; }
        if (p.x > W) p.x = -10;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(t * 0.05 + p.ph);
        ctx.fillStyle = 'rgba(255,190,210,0.85)';
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
  };

  STAGES.shibuya = {
    paint: { ground: 0.87, tint: 'rgba(10,5,25,0.18)' },
    id: 'shibuya', name: 'SHIBUYA INCIDENT', jp: '渋谷事変', music: 'stage_shibuya', rim: '#9ac8ff',
    thumb: ['#0a0c22', '#2a1a4a', '#ff4fa0'],
    build() {
      const win = (g, r, bx, by, bw, bh, lit) => {
        for (let y = by + 10; y < by + bh - 10; y += 14) for (let x = bx + 8; x < bx + bw - 8; x += 12) {
          if (r() < lit) { g.fillStyle = JK.pick(['#ffe8a0', '#fff6d8', '#a8d8ff', '#ffd070']); g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(x, y, 6, 8); g.globalAlpha = 1; }
        }
      };
      this.L = {
        far: lcanvas(560, (g, r, w, h) => {
          for (let x = 0; x < w; x += 70 + r() * 60) {
            const bw = 60 + r() * 90, bh = 220 + r() * 320;
            g.fillStyle = '#10122a'; g.fillRect(x, h - bh, bw, bh);
            win(g, r, x, h - bh, bw, bh, 0.3);
          }
        }, 21),
        mid: lcanvas(460, (g, r, w, h) => {
          for (let x = 0; x < w; x += 200 + r() * 120) {
            const bw = 150 + r() * 120, bh = 200 + r() * 220;
            g.fillStyle = '#181432'; g.fillRect(x, h - bh, bw, bh);
            win(g, r, x, h - bh, bw, bh, 0.45);
            g.fillStyle = '#0c0a1c'; g.fillRect(x, h - bh, bw, 8);
          }
          // cylinder tower (109-style)
          const cx = w * 0.46;
          g.fillStyle = '#221c3e'; g.fillRect(cx - 70, h - 420, 140, 420);
          g.fillStyle = '#2e2650'; g.fillRect(cx - 70, h - 420, 40, 420);
          win(g, r, cx - 70, h - 400, 140, 380, 0.6);
        }, 22),
        near: lcanvas(300, (g, r, w, h) => {
          for (let i = 0; i < 12; i++) {
            const x = 80 + i * 240;
            g.fillStyle = '#0d0c18'; g.fillRect(x, h - 230, 6, 230);
            g.fillRect(x - 30, h - 232, 36, 5);
          }
          g.fillStyle = '#141222'; g.fillRect(0, h - 70, w, 70);
          g.fillStyle = '#1e1a30';
          for (let x = 0; x < w; x += 90) g.fillRect(x, h - 70, 60, 50);
        }, 23),
      };
      this.signs = [];
      const words = ['渋谷', '呪', 'SHIBUYA', '109', 'ハロウィン', 'TOHO', '居酒屋', 'KARAOKE'];
      for (let i = 0; i < 12; i++) this.signs.push({ u: SW / 2 - 1300 + i * 230 + Math.random() * 60, v: -220 - Math.random() * 180, word: words[i % words.length], color: JK.pick(['#ff4fa0', '#4fe8ff', '#ffd24f', '#b06bff', '#ff5a3a']), ph: Math.random() * 10 });
      this.rain = [];
      for (let i = 0; i < 140; i++) this.rain.push({ x: Math.random() * W, y: Math.random() * H, s: 14 + Math.random() * 10 });
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#04040f'], [0.5, '#12102e'], [0.8, '#2a1848'], [1, '#48205a']]);
      // the veil ("curtain") dome
      const [vx, vy] = proj(cam, 0.05, SW / 2, 200);
      ctx.save();
      ctx.strokeStyle = 'rgba(120,80,200,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(vx, vy, 1200, 900, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(10,0,20,0.35)';
      ctx.fill();
      ctx.restore();
      layer(ctx, cam, this.L.far, 0.15, -120);
      // aviation lights
      if (Math.floor(t / 40) % 2) for (let i = 0; i < 6; i++) { const [lx, ly] = proj(cam, 0.15, SW / 2 - 1200 + i * 460, -560 + (i % 3) * 60); JK.drawGlow(ctx, '#ff3030', lx, ly, 10, 0.9); }
      layer(ctx, cam, this.L.mid, 0.4, -50);
      // giant screen
      const [scx, scy, z4] = proj(cam, 0.4, SW / 2 - 420, -380);
      ctx.fillStyle = '#05050a'; ctx.fillRect(scx - 4 * z4, scy - 4 * z4, 188 * z4, 108 * z4);
      const hue = (t * 0.6) % 360;
      const gg = ctx.createLinearGradient(scx, scy, scx + 180 * z4, scy + 100 * z4);
      gg.addColorStop(0, `hsl(${hue},80%,55%)`); gg.addColorStop(1, `hsl(${(hue + 80) % 360},80%,40%)`);
      ctx.fillStyle = gg; ctx.fillRect(scx, scy, 180 * z4, 100 * z4);
      JK.text(ctx, '呪術', scx + 90 * z4, scy + 50 * z4, { size: 44 * z4, font: JK.FONT_JP, color: 'rgba(255,255,255,0.9)' });
      // neon signs
      for (const s of this.signs) {
        const [nx, ny, zf] = proj(cam, 0.5, s.u, s.v);
        if (nx < -200 || nx > W + 200) continue;
        const on = Math.sin(t * 0.3 + s.ph) > -0.95 || Math.random() > 0.5;
        ctx.save();
        ctx.shadowColor = s.color; ctx.shadowBlur = on ? 18 : 0;
        JK.text(ctx, s.word, nx, ny, { size: 30 * zf, font: /[a-z0-9]/i.test(s.word) ? JK.FONT_TITLE : JK.FONT_JP, color: on ? s.color : JK.rgba(s.color, 0.3), alpha: 0.95 });
        ctx.restore();
      }
      layer(ctx, cam, this.L.near, 0.7, 0);
      // wet asphalt + scramble crossing
      floor(ctx, cam, '#1a1826', '#07060c', null);
      const gy = GY - cam.y * cam.z;
      ctx.save();
      ctx.fillStyle = 'rgba(230,230,240,0.25)';
      for (let u = SW / 2 - 900; u < SW / 2 + 900; u += 70) {
        const [x1] = proj(cam, 1, u, 0), [x2] = proj(cam, 1, u + 36, 0);
        ctx.beginPath();
        ctx.moveTo(x1, gy + 18); ctx.lineTo(x2, gy + 18);
        ctx.lineTo(W / 2 + (x2 - W / 2) * 1.8, H); ctx.lineTo(W / 2 + (x1 - W / 2) * 1.8, H);
        ctx.fill();
      }
      // neon reflections
      ctx.globalCompositeOperation = 'lighter';
      for (const s of this.signs) {
        const [nx] = proj(cam, 0.5, s.u, s.v);
        const rg = ctx.createLinearGradient(0, gy, 0, H);
        rg.addColorStop(0, JK.rgba(s.color, 0.22)); rg.addColorStop(1, JK.rgba(s.color, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(nx - 20, gy, 40, H - gy);
      }
      ctx.restore();
    },
    drawFront(ctx, cam, t) {
      ctx.save();
      ctx.strokeStyle = 'rgba(170,190,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const r of this.rain) {
        r.y += r.s; r.x -= r.s * 0.2;
        if (r.y > H) { r.y = -20; r.x = Math.random() * (W + 200); }
        ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 4, r.y - 18);
      }
      ctx.stroke();
      ctx.restore();
    },
  };

  STAGES.shinjuku = {
    paint: { ground: 0.86, tint: 'rgba(20,8,8,0.15)' },
    id: 'shinjuku', name: 'SHINJUKU SHOWDOWN', jp: '人外魔境新宿決戦', music: 'stage_shinjuku', rim: '#ffb070',
    thumb: ['#3a3438', '#8a5a40', '#ff8a3a'],
    build() {
      const ruin = (g, r, x, h, bw, bh, col, lit) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x, h - bh);
        const steps = 5;
        for (let i = 1; i <= steps; i++) g.lineTo(x + (bw * i) / steps, h - bh + (r() - 0.3) * bh * 0.35);
        g.lineTo(x + bw, h);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,140,60,0.25)';
        for (let y = h - bh + 40; y < h - 10; y += 16) for (let xx = x + 8; xx < x + bw - 8; xx += 14) if (r() < lit) g.fillRect(xx, y, 6, 8);
      };
      this.L = {
        far: lcanvas(560, (g, r, w, h) => { for (let x = 0; x < w; x += 90 + r() * 80) ruin(g, r, x, h, 70 + r() * 90, 220 + r() * 320, '#3a3036', 0.05); }, 31),
        mid: lcanvas(420, (g, r, w, h) => {
          for (let x = 0; x < w; x += 220 + r() * 160) ruin(g, r, x, h, 160 + r() * 120, 160 + r() * 220, '#221c20', 0.08);
          // tilted poles + rebar
          g.strokeStyle = '#161214'; g.lineWidth = 6;
          for (let i = 0; i < 10; i++) { const x = r() * w; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (r() - 0.5) * 120, h - 160 - r() * 100); g.stroke(); }
        }, 32),
        rubble: lcanvas(160, (g, r, w, h) => {
          for (let i = 0; i < 70; i++) {
            const x = r() * w, s = 20 + r() * 60;
            g.fillStyle = JK.pick(['#2c2426', '#3a3032', '#241e20']);
            g.beginPath(); g.moveTo(x - s, h); g.lineTo(x - s * 0.4, h - s * (0.4 + r() * 0.8)); g.lineTo(x + s * 0.5, h - s * r() * 0.9); g.lineTo(x + s, h); g.fill();
          }
        }, 33),
      };
      this.embers = [];
      for (let i = 0; i < 70; i++) this.embers.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.3) * 0.8, vy: -0.4 - Math.random() * 1.2, r: 1.5 + Math.random() * 2.5, ph: Math.random() * 6 });
      this.smoke = [];
      for (let i = 0; i < 8; i++) this.smoke.push({ u: SW / 2 - 1200 + i * 340, ph: Math.random() * 100 });
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#1c1a20'], [0.45, '#4a3a3a'], [0.75, '#9a5a3a'], [1, '#d88a4a']]);
      const [fx, fy] = proj(cam, 0.08, SW / 2 - 300, -120);
      JK.drawGlow(ctx, '#ff6a2a', fx, fy, 500, 0.5);
      // smoke plumes
      for (const s of this.smoke) {
        for (let k = 0; k < 6; k++) {
          const [px, py] = proj(cam, 0.12, s.u + Math.sin((t + s.ph * 10) * 0.01 + k) * 30 + k * 20, -300 - k * 70 - ((t * 0.3 + s.ph) % 70));
          ctx.fillStyle = `rgba(30,24,26,${0.3 - k * 0.04})`;
          ctx.beginPath(); ctx.arc(px, py, 60 + k * 18, 0, Math.PI * 2); ctx.fill();
        }
      }
      layer(ctx, cam, this.L.far, 0.15, -100);
      ctx.fillStyle = 'rgba(200,120,70,0.12)'; ctx.fillRect(0, GY - 300, W, 300);
      layer(ctx, cam, this.L.mid, 0.45, -20);
      layer(ctx, cam, this.L.rubble, 0.8, 6);
      floor(ctx, cam, '#4a3e3a', '#1a1414', 'rgba(0,0,0,0.25)', 180);
      // cracks
      ctx.save();
      ctx.strokeStyle = 'rgba(10,6,6,0.6)'; ctx.lineWidth = 2;
      const rr = JK.rng(77);
      for (let i = 0; i < 12; i++) {
        let [x, y] = proj(cam, 1, SW / 2 - 1100 + i * 190, 0);
        y += 12 + rr() * 60;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rr() - 0.5) * 60; y += 8 + rr() * 12; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
    },
    drawFront(ctx, cam, t) {
      for (const e of this.embers) {
        e.x += e.vx + Math.sin(t * 0.03 + e.ph) * 0.4; e.y += e.vy;
        if (e.y < -10) { e.y = H + 10; e.x = Math.random() * W; }
        JK.drawGlow(ctx, '#ff8a3a', e.x, e.y, e.r * 4, 0.7);
      }
      ctx.fillStyle = 'rgba(80,60,50,0.08)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  STAGES.kyoto = {
    paint: { ground: 0.86, tint: 'rgba(5,10,25,0.15)' },
    id: 'kyoto', name: 'KYOTO BAMBOO GROVE', jp: '京都校 竹林', music: 'stage_kyoto', rim: '#b8d8ff',
    thumb: ['#050d1a', '#12304a', '#e8f2ff'],
    build() {
      const bamboo = (g, r, w, h, col, dens, wmin, wmax) => {
        for (let x = 0; x < w; x += dens * (0.5 + r())) {
          const bw = wmin + r() * (wmax - wmin);
          const lean = (r() - 0.5) * 20;
          g.fillStyle = col;
          g.beginPath(); g.moveTo(x, h); g.lineTo(x + lean, 0); g.lineTo(x + lean + bw, 0); g.lineTo(x + bw, h); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.35)';
          for (let y = h - 60 - r() * 40; y > 0; y -= 70 + r() * 30) g.fillRect(x + lean * (1 - y / h), y, bw + 2, 3);
          g.fillStyle = 'rgba(180,230,200,0.12)';
          g.fillRect(x + 2, 0, bw * 0.25, h);
        }
      };
      this.L = {
        hills: lcanvas(260, (g, r, w, h) => { mountains(g, r, w, h, '#0e2236', 260, 20); }, 41),
        bambooFar: lcanvas(620, (g, r, w, h) => bamboo(g, r, w, h, '#123028', 34, 8, 14), 42),
        bambooMid: lcanvas(700, (g, r, w, h) => bamboo(g, r, w, h, '#1a4034', 70, 14, 22), 43),
        shrine: lcanvas(320, (g, r, w, h) => {
          for (let i = 0; i < 6; i++) {
            const x = 200 + i * 460;
            g.fillStyle = '#5a5a60';
            g.fillRect(x - 10, h - 80, 20, 80);
            g.fillRect(x - 26, h - 130, 52, 50);
            roof(g, x - 40, h - 150, 80, 22, '#4a4a52');
            g.fillStyle = '#ffcf7a';
            g.fillRect(x - 14, h - 118, 28, 26);
          }
          torii(g, w * 0.3, h, 1.3, '#a02a24');
        }, 44),
        bambooNear: lcanvas(720, (g, r, w, h) => bamboo(g, r, w, h, '#0c1c16', 260, 26, 36), 45),
      };
      this.flies = [];
      for (let i = 0; i < 40; i++) this.flies.push({ x: Math.random() * W, y: GY - Math.random() * 400, ph: Math.random() * 10, s: 0.3 + Math.random() * 0.6 });
      this.stars = [];
      const r = JK.rng(46);
      for (let i = 0; i < 120; i++) this.stars.push([r() * W, r() * GY * 0.6, r()]);
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#030814'], [0.6, '#0c2240'], [1, '#1a3a5a']]);
      for (const [x, y, b] of this.stars) {
        ctx.fillStyle = `rgba(220,235,255,${0.3 + b * 0.6 * (0.7 + Math.sin(t * 0.05 + b * 20) * 0.3)})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      const [mx, my] = proj(cam, 0.04, SW / 2 + 200, -420);
      JK.drawGlow(ctx, '#9ac8ff', mx, my, 260, 0.6);
      ctx.fillStyle = '#eef4ff';
      ctx.beginPath(); ctx.arc(mx, my, 62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(160,180,210,0.35)';
      ctx.beginPath(); ctx.arc(mx - 18, my - 10, 12, 0, Math.PI * 2); ctx.arc(mx + 20, my + 16, 9, 0, Math.PI * 2); ctx.fill();
      layer(ctx, cam, this.L.hills, 0.1, -80);
      ctx.fillStyle = 'rgba(150,190,220,0.08)'; ctx.fillRect(0, GY - 330, W, 330);
      layer(ctx, cam, this.L.bambooFar, 0.3, -30);
      ctx.fillStyle = 'rgba(120,170,200,0.1)'; ctx.fillRect(0, 0, W, GY);
      layer(ctx, cam, this.L.bambooMid, 0.55, -10);
      layer(ctx, cam, this.L.shrine, 0.75, 2);
      floor(ctx, cam, '#2a3a30', '#0c1410', 'rgba(0,0,0,0.25)', 120);
      // moonlight path
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gy = GY - cam.y * cam.z;
      const lg = ctx.createLinearGradient(0, gy, 0, H);
      lg.addColorStop(0, 'rgba(140,180,220,0.15)'); lg.addColorStop(1, 'rgba(140,180,220,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, gy, W, H - gy);
      ctx.restore();
      // lantern glows
      for (let i = 0; i < 6; i++) {
        const [lx, ly] = proj(cam, 0.75, SW / 2 - 1400 + 200 + i * 460, -105);
        JK.drawGlow(ctx, '#ffb04a', lx, ly, 70 + Math.sin(t * 0.1 + i) * 5, 0.6);
      }
    },
    drawFront(ctx, cam, t) {
      for (const f of this.flies) {
        const x = f.x + Math.sin(t * 0.01 * f.s + f.ph) * 60, y = f.y + Math.cos(t * 0.013 * f.s + f.ph) * 30;
        const a = 0.4 + Math.sin(t * 0.08 + f.ph) * 0.4;
        JK.drawGlow(ctx, '#d8ff8a', x, y, 10, Math.max(0, a));
      }
      // near bamboo framing (translucent so fighters stay readable)
      if (!(JK.ART.kyoto && JK.ART.kyoto.ready && JK.settings.painted !== false)) {
        ctx.save();
        ctx.globalAlpha = 0.38;
        layer(ctx, cam, this.L.bambooNear, 1.25, 110);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(160,200,230,0.05)';
      ctx.fillRect(0, GY - 120, W, 200);
    },
  };

  // ------------------------------------------------------------------ DOMAIN INTERIORS
  const DOMAINS = {};

  DOMAINS.unlimited_void = {
    paint: { ground: 0.86, tint: 'rgba(0,0,20,0.1)' },
    rim: '#bfe6ff',
    build() {
      this.stars = [];
      for (let i = 0; i < 260; i++) this.stars.push({ a: Math.random() * Math.PI * 2, d: Math.random(), s: 0.004 + Math.random() * 0.012, c: JK.pick(['#ffffff', '#9fe8ff', '#c7a0ff', '#6fb0ff']) });
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      ctx.fillStyle = '#020210';
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H * 0.42;
      // nebula
      const neb = [['#3a1a7a', 520, 0.5], ['#0a3a7a', 420, 0.45], ['#7a2a9a', 260, 0.35]];
      neb.forEach(([c, r, a], i) => JK.drawGlow(ctx, c, cx + Math.sin(t * 0.004 + i * 2) * 120, cy + Math.cos(t * 0.003 + i) * 60, r, a));
      // star streams rushing outward (infinite information)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const s of this.stars) {
        s.d += s.s * (1 + s.d * 2);
        if (s.d > 1.2) { s.d = 0.02; s.a = Math.random() * Math.PI * 2; }
        const r1 = s.d * 900, r0 = Math.max(0, r1 - 20 - s.d * 80);
        ctx.strokeStyle = JK.rgba(s.c, Math.min(1, s.d * 1.5));
        ctx.lineWidth = 0.5 + s.d * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0 * 0.7);
        ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1 * 0.7);
        ctx.stroke();
      }
      ctx.restore();
      // event-horizon ring
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(${i === 1 ? '200,160,255' : '140,220,255'},${0.35 - i * 0.08})`;
        ctx.lineWidth = 10 - i * 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 170 + i * 24 + Math.sin(t * 0.05) * 4, 60 + i * 8, Math.sin(t * 0.002) * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 72, 0, Math.PI * 2); ctx.stroke();
      JK.drawGlow(ctx, '#ffffff', cx, cy, 120, 0.25);
      // reflective floor
      const gy = GY - cam.y * cam.z;
      const g = ctx.createLinearGradient(0, gy, 0, H);
      g.addColorStop(0, 'rgba(60,90,200,0.35)'); g.addColorStop(1, 'rgba(0,0,20,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, W, H - gy);
      ctx.strokeStyle = 'rgba(140,200,255,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#8fd8ff';
      ctx.beginPath();
      for (let u = -8; u <= 8; u++) { const x = W / 2 + u * 160 - ((cam.x * cam.z) % 160); ctx.moveTo(x, gy); ctx.lineTo(W / 2 + (x - W / 2) * 2.5, H); }
      ctx.stroke();
      ctx.restore();
    },
    drawFront(ctx, cam, t) {
      // floating glyphs of information
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const x = (i * 97 + t * (0.5 + (i % 3) * 0.4)) % (W + 100) - 50;
        const y = 80 + ((i * 53) % 400);
        JK.text(ctx, '無量空処'[i % 4], x, y, { size: 18 + (i % 4) * 8, font: JK.FONT_JP, color: 'rgba(160,220,255,0.18)' });
      }
      ctx.restore();
    },
  };

  DOMAINS.malevolent_shrine = {
    paint: { ground: 0.86, tint: 'rgba(20,0,0,0.12)' },
    rim: '#ff8a8a',
    build() {
      this.shrine = (() => {
        const c = JK.makeCanvas(900, 520);
        const g = c.getContext('2d');
        const cx = 450;
        // skulls piles
        const skull = (x, y, s) => {
          g.fillStyle = '#d8ccb8';
          g.beginPath(); g.arc(x, y, 14 * s, 0, Math.PI * 2); g.fill();
          g.fillRect(x - 8 * s, y + 6 * s, 16 * s, 10 * s);
          g.fillStyle = '#1a0606';
          g.beginPath(); g.arc(x - 5 * s, y, 4 * s, 0, Math.PI * 2); g.arc(x + 5 * s, y, 4 * s, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#6a1010'; g.lineWidth = 1; g.strokeRect(x - 8 * s, y + 6 * s, 16 * s, 10 * s);
        };
        const r = JK.rng(66);
        for (let i = 0; i < 160; i++) {
          const side = i % 2 ? -1 : 1;
          const x = cx + side * (230 + r() * 220);
          const y = 520 - r() * r() * 170;
          skull(x, y, 0.8 + r() * 0.6);
        }
        // shrine body
        g.fillStyle = '#2a0a0e';
        g.fillRect(cx - 170, 250, 340, 270);
        // tiers of roofs
        for (let i = 0; i < 3; i++) {
          const w = 520 - i * 120, y = 250 - i * 80;
          roof(g, cx - w / 2, y - 50, w, 56, '#140406', '#6a1418');
          g.fillStyle = '#300c10';
          g.fillRect(cx - w * 0.32, y - 10, w * 0.64, 30);
        }
        // the maw gate
        g.fillStyle = '#050000';
        g.beginPath(); g.ellipse(cx, 420, 120, 100, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8e0d0';
        for (let i = 0; i < 9; i++) {
          const tx = cx - 100 + i * 25;
          g.beginPath(); g.moveTo(tx, 330); g.lineTo(tx + 12, 368); g.lineTo(tx + 24, 330); g.fill();
          g.beginPath(); g.moveTo(tx, 520); g.lineTo(tx + 12, 478); g.lineTo(tx + 24, 520); g.fill();
        }
        // hands flanking the maw
        g.fillStyle = '#5a1a1a';
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(cx + s * 130, 520); g.lineTo(cx + s * 150, 380);
          for (let k = 0; k < 4; k++) { g.lineTo(cx + s * (160 + k * 12), 330 - k * 6); g.lineTo(cx + s * (166 + k * 12), 382); }
          g.lineTo(cx + s * 210, 520); g.fill();
        }
        return c;
      })();
      this.ripples = [];
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#0a0000'], [0.4, '#3a0206'], [0.75, '#8a0a12'], [1, '#c8201e']]);
      // swirling dark clouds
      for (let i = 0; i < 10; i++) {
        const x = (i * 180 + t * (0.3 + (i % 3) * 0.2)) % (W + 300) - 150;
        ctx.fillStyle = 'rgba(20,0,2,0.45)';
        ctx.beginPath(); ctx.ellipse(x, 90 + (i % 4) * 50, 220, 40, 0, 0, Math.PI * 2); ctx.fill();
      }
      const [sx, sy, zf] = proj(cam, 0.2, SW / 2, 20);
      JK.drawGlow(ctx, '#ff2020', sx, sy - 250 * zf, 520, 0.35);
      const img = this.shrine;
      const s = zf * 1.05;
      ctx.drawImage(img, sx - (img.width / 2) * s, sy - img.height * s, img.width * s, img.height * s);
      // blood pool floor
      const gy = GY - cam.y * cam.z;
      const g = ctx.createLinearGradient(0, gy, 0, H);
      g.addColorStop(0, '#5a0408'); g.addColorStop(1, '#140002');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, W, H - gy);
      // reflection of sky + ripples
      ctx.fillStyle = 'rgba(255,60,60,0.08)';
      ctx.fillRect(0, gy, W, 30);
      if (t % 12 === 0) this.ripples.push({ x: Math.random() * W, y: gy + 20 + Math.random() * (H - gy - 30), t: 0 });
      ctx.strokeStyle = 'rgba(255,120,120,0.3)';
      ctx.lineWidth = 1.5;
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.t++;
        ctx.globalAlpha = 1 - r.t / 60;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.t * 1.5, r.t * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
        if (r.t > 60) this.ripples.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    },
    drawFront(ctx, cam, t) {
      ctx.fillStyle = 'rgba(120,0,0,0.08)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  DOMAINS.yuji_domain = {
    paint: { ground: 0.86, tint: 'rgba(20,5,10,0.12)' },
    rim: '#ffd0a0',
    build() {
      this.field = lcanvas(90, (g, r, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#8a8a4a'); gr.addColorStop(1, '#5a6a2a');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,200,120,0.25)'; g.lineWidth = 1.5;
        for (let y = 6; y < h; y += 6 + y * 0.15) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 3); g.stroke(); }
        g.fillStyle = 'rgba(40,50,20,0.35)';
        for (let i = 0; i < 40; i++) { const x = r() * w; g.fillRect(x, 0, 2, h); }
      }, 51);
      this.trainX = -900;
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#3a2a5a'], [0.4, '#d8708a'], [0.7, '#ffb070'], [1, '#ffe0a0']]);
      const [sx, sy] = proj(cam, 0.03, SW / 2 - 200, -160);
      JK.drawGlow(ctx, '#ffb060', sx, sy, 420, 0.6);
      ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.arc(sx, sy, 56, 0, Math.PI * 2); ctx.fill();
      // distant hills + fields
      ctx.fillStyle = '#6a4a6a';
      ctx.beginPath(); ctx.moveTo(0, GY - 150);
      for (let x = 0; x <= W; x += 80) ctx.lineTo(x, GY - 150 - Math.sin(x * 0.01) * 30 - 20);
      ctx.lineTo(W, GY - 60); ctx.lineTo(0, GY - 60); ctx.fill();
      layer(ctx, cam, this.field, 0.3, 0);
      // power line poles
      ctx.strokeStyle = '#2a1a2a'; ctx.lineWidth = 3;
      const poles = [];
      for (let i = -2; i < 8; i++) {
        const [px, py] = proj(cam, 0.5, SW / 2 - 1200 + i * 380, -40);
        poles.push([px, py]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 260); ctx.moveTo(px - 30, py - 240); ctx.lineTo(px + 30, py - 240); ctx.stroke();
      }
      ctx.lineWidth = 1.2;
      for (let i = 0; i < poles.length - 1; i++) {
        const [ax, ay] = poles[i], [bx, by] = poles[i + 1];
        for (const off of [-30, 30]) {
          ctx.beginPath(); ctx.moveTo(ax + off, ay - 240); ctx.quadraticCurveTo((ax + bx) / 2 + off, ay - 200, bx + off, by - 240); ctx.stroke();
        }
      }
      // passing train on the far track
      this.trainX += 6;
      if (this.trainX > W + 1400) this.trainX = -1400 - Math.random() * 1200;
      const ty = GY - 90;
      for (let c = 0; c < 4; c++) {
        const x = this.trainX - c * 330;
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x, ty - 70, 320, 60);
        ctx.fillStyle = '#3a6a9a'; ctx.fillRect(x, ty - 30, 320, 8);
        ctx.fillStyle = 'rgba(255,220,160,0.8)';
        for (let w2 = 0; w2 < 7; w2++) ctx.fillRect(x + 16 + w2 * 42, ty - 62, 30, 20);
      }
      // platform
      const [plx, ply, zf] = proj(cam, 0.85, SW / 2 - 700, 0);
      ctx.fillStyle = '#8a7a6a'; ctx.fillRect(plx, ply - 40 * zf, 1400 * zf, 40 * zf);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(plx, ply - 40 * zf, 1400 * zf, 4 * zf);
      // station sign + bench
      const [bx, by, bz] = proj(cam, 0.85, SW / 2 + 300, -40);
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(bx, by - 150 * bz, 6 * bz, 150 * bz); ctx.fillRect(bx + 150 * bz, by - 150 * bz, 6 * bz, 150 * bz);
      ctx.fillStyle = '#f4f0e8'; ctx.fillRect(bx - 10 * bz, by - 180 * bz, 176 * bz, 50 * bz);
      JK.text(ctx, 'すくな　←　いたどり　→', bx + 78 * bz, by - 155 * bz, { size: 16 * bz, font: JK.FONT_JP, color: '#222' });
      const [bnx, bny, bnz] = proj(cam, 0.85, SW / 2 - 300, -40);
      ctx.fillStyle = '#5a3a2a'; ctx.fillRect(bnx, bny - 36 * bnz, 120 * bnz, 10 * bnz); ctx.fillRect(bnx + 8 * bnz, bny - 26 * bnz, 6 * bnz, 26 * bnz); ctx.fillRect(bnx + 106 * bnz, bny - 26 * bnz, 6 * bnz, 26 * bnz);
      floor(ctx, cam, '#8a6a5a', '#3a2a2a', 'rgba(40,20,20,0.25)', 160);
    },
    drawFront(ctx, cam, t) {
      ctx.fillStyle = 'rgba(255,170,120,0.1)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  DOMAINS.chimera_shadow_garden = {
    paint: { ground: 0.86, tint: 'rgba(5,0,20,0.12)' },
    rim: '#b0a0ff',
    build() { this.eyes = []; for (let i = 0; i < 26; i++) this.eyes.push({ x: Math.random() * W, y: 120 + Math.random() * (GY - 160), ph: Math.random() * 10 }); },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#030208'], [0.6, '#0e0a24'], [1, '#1e1640']]);
      JK.drawGlow(ctx, '#3a2a9a', W / 2, GY - 100, 600, 0.4);
      for (const e of this.eyes) {
        const open = Math.sin(t * 0.02 + e.ph) > 0.3;
        if (!open) continue;
        ctx.fillStyle = 'rgba(255,230,120,0.8)';
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 6, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(e.x + 18, e.y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      // shadow tendrils
      ctx.fillStyle = '#05040c';
      for (let i = 0; i < 12; i++) {
        const x = (i * 120 + Math.sin(t * 0.01 + i) * 30);
        ctx.beginPath();
        ctx.moveTo(x - 30, GY);
        ctx.quadraticCurveTo(x + Math.sin(t * 0.03 + i) * 40, GY - 150 - (i % 3) * 60, x + 30, GY);
        ctx.fill();
      }
      const gy = GY - cam.y * cam.z;
      const g = ctx.createLinearGradient(0, gy, 0, H);
      g.addColorStop(0, '#0c0a1e'); g.addColorStop(1, '#000000');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, W, H - gy);
      ctx.strokeStyle = 'rgba(120,100,255,0.2)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const y = gy + 10 + i * 18 + Math.sin(t * 0.05 + i) * 3;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 0.06 + i) * 3);
        ctx.stroke();
      }
    },
    drawFront(ctx, cam, t) {
      ctx.fillStyle = 'rgba(40,20,90,0.08)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  DOMAINS.coffin_iron_mountain = {
    paint: { ground: 0.86, tint: 'rgba(20,5,0,0.1)' },
    rim: '#ffb070',
    build() {
      this.walls = lcanvas(620, (g, r, w, h) => {
        // jagged crater walls rising on every side
        g.fillStyle = '#1a0c0a';
        g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 60) g.lineTo(x, h * (0.08 + 0.35 * Math.abs(Math.sin(x * 0.0021)) + r() * 0.12));
        g.lineTo(w, h); g.closePath(); g.fill();
        g.fillStyle = '#2a1410';
        g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 45) g.lineTo(x, h * (0.35 + 0.3 * Math.abs(Math.sin(x * 0.003 + 1)) + r() * 0.1));
        g.lineTo(w, h); g.closePath(); g.fill();
        // lava falls
        for (let i = 0; i < 9; i++) {
          const x = 120 + i * 310 + r() * 80, top = h * (0.3 + r() * 0.2), wd = 10 + r() * 14;
          const lg = g.createLinearGradient(0, top, 0, h);
          lg.addColorStop(0, 'rgba(255,200,90,0.95)'); lg.addColorStop(1, 'rgba(255,80,20,0.85)');
          g.fillStyle = lg;
          g.fillRect(x, top, wd, h - top);
        }
      }, 71);
      this.bubbles = [];
    },
    drawBack(ctx, cam, t) {
      if (paintBack(this, ctx, cam, t)) return;
      skyGrad(ctx, [[0, '#0c0404'], [0.45, '#3a0e06'], [0.8, '#8a2a0a'], [1, '#d0521a']]);
      // smoke columns + distant eruptions
      for (let i = 0; i < 5; i++) {
        const [ex, ey] = proj(cam, 0.08, SW / 2 - 900 + i * 450, -520);
        const k = ((t + i * 70) % 220) / 220;
        if (k < 0.4) JK.drawGlow(ctx, '#ff7a2a', ex, ey + 60, 160 * (1 - k), 0.5);
        ctx.fillStyle = 'rgba(20,10,10,0.45)';
        ctx.beginPath(); ctx.arc(ex + Math.sin(t * 0.01 + i) * 20, ey - k * 120, 60 + k * 60, 0, Math.PI * 2); ctx.fill();
      }
      layer(ctx, cam, this.walls, 0.25, -40);
      JK.drawGlow(ctx, '#ff5a1a', W / 2, GY + 40, 700, 0.35);
      // molten floor with glowing cracks
      const gy = GY - cam.y * cam.z;
      const g = ctx.createLinearGradient(0, gy, 0, H);
      g.addColorStop(0, '#3a1208'); g.addColorStop(1, '#120404');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, W, H - gy);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rr = JK.rng(81);
      for (let i = 0; i < 14; i++) {
        let [x, y] = proj(cam, 1, SW / 2 - 1300 + i * 190, 0);
        y += 8 + rr() * 70;
        const pulse = 0.5 + Math.sin(t * 0.05 + i) * 0.3;
        ctx.strokeStyle = `rgba(255,${120 + (i % 3) * 40},40,${pulse})`;
        ctx.lineWidth = 2 + rr() * 3;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rr() - 0.5) * 90; y += 4 + rr() * 10; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      // lava bubbles popping
      if (t % 9 === 0) this.bubbles.push({ x: Math.random() * W, y: gy + 10 + Math.random() * (H - gy - 20), t: 0 });
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.t++;
        JK.drawGlow(ctx, '#ffb04a', b.x, b.y, 8 + b.t * 0.6, Math.max(0, 0.7 - b.t / 40));
        if (b.t > 30) this.bubbles.splice(i, 1);
      }
    },
    drawFront(ctx, cam, t) {
      for (let i = 0; i < 30; i++) {
        const x = (i * 131 + t * (0.4 + (i % 4) * 0.3)) % (W + 40) - 20;
        const y = H - ((t * (1 + (i % 3) * 0.6) + i * 57) % (H + 40));
        JK.drawGlow(ctx, '#ff8a3a', x, y, 8 + (i % 3) * 3, 0.55);
      }
      // heat haze tint
      ctx.fillStyle = 'rgba(255,90,20,0.07)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  // Judgeman: the shikigami that presides over Deadly Sentencing (eyes bound, scales raised).
  function drawJudgeman(ctx, x, y, s, t, speaking, tiltTo = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const bob = Math.sin(t * 0.03) * 3;
    ctx.translate(0, bob);
    // robe / shoulders
    ctx.fillStyle = '#0c0a12';
    ctx.beginPath(); ctx.moveTo(-120, 120); ctx.quadraticCurveTo(-110, 10, -46, -10); ctx.lineTo(46, -10); ctx.quadraticCurveTo(110, 10, 120, 120); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a3050'; ctx.lineWidth = 3; ctx.stroke();
    // white collar ruff
    ctx.fillStyle = '#e8e4f0';
    ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(0, 30); ctx.lineTo(40, -10); ctx.closePath(); ctx.fill();
    // head
    ctx.fillStyle = '#d8d0dc';
    ctx.beginPath(); ctx.ellipse(0, -52, 38, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0810'; ctx.lineWidth = 4; ctx.stroke();
    // flat judge's cap
    ctx.fillStyle = '#14101c';
    ctx.fillRect(-46, -104, 92, 22);
    ctx.beginPath(); ctx.ellipse(0, -104, 46, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(-46, -88, 92, 4);
    // blindfold with stitched X marks
    ctx.fillStyle = '#16121e';
    ctx.fillRect(-40, -66, 80, 18);
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3;
    for (const ex of [-18, 18]) { ctx.beginPath(); ctx.moveTo(ex - 7, -63); ctx.lineTo(ex + 7, -51); ctx.moveTo(ex + 7, -63); ctx.lineTo(ex - 7, -51); ctx.stroke(); }
    // stitched mouth, opening while it speaks
    const open = speaking ? Math.abs(Math.sin(t * 0.35)) * 8 : 0;
    ctx.fillStyle = '#1a0a14';
    ctx.beginPath(); ctx.ellipse(0, -24, 16, 2 + open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0810'; ctx.lineWidth = 2;
    for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(i, -29 - open * 0.5); ctx.lineTo(i, -19 + open * 0.5); ctx.stroke(); }
    // scales of justice held aloft
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(90, 60); ctx.lineTo(96, -150); ctx.stroke();
    // the scales sway, or lean toward guilt as evidence piles up
    const tilt = tiltTo === null ? Math.sin(t * 0.04) * 0.12 : -0.05 + tiltTo * 0.45 + Math.sin(t * 0.05) * 0.03;
    ctx.save();
    ctx.translate(96, -150);
    ctx.rotate(tilt);
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.stroke();
    ctx.lineWidth = 2;
    for (const px of [-70, 70]) {
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px - 20, 50); ctx.moveTo(px, 0); ctx.lineTo(px + 20, 50); ctx.stroke();
      ctx.fillStyle = '#c9a24a';
      ctx.beginPath(); ctx.ellipse(px, 52, 24, 7, 0, 0, Math.PI); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }
  JK.drawJudgeman = drawJudgeman;

  // Soft fog: overlapping radial blobs drifting sideways and wrapping around the screen.
  function fogBand(ctx, y, h, alpha, speed, t, seed, color = '120,110,150') {
    const rr = JK.rng(seed);
    for (let i = 0; i < 9; i++) {
      const span = W + 700;
      const x = ((i * 190 + rr() * 120 + t * speed * (0.6 + rr() * 0.8)) % span + span) % span - 350;
      const yy = y + (rr() - 0.5) * h * 0.6 + Math.sin(t * 0.01 + i) * 8;
      const r = h * (0.8 + rr() * 0.7);
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    }
  }

  // Deadly Sentencing: a pitch-black courtroom swallowed by fog, Judgeman looming over the bench.
  DOMAINS.deadly_sentencing = {
    paint: { ground: 0.86, tint: 'rgba(0,0,0,0.05)' },
    rim: '#c8b8ff',
    build() { this.verdict = null; this.speaking = false; this.tilt = 0; this.bolt = 0; },
    drawBack(ctx, cam, t) {
      const painted = paintBack(this, ctx, cam, t);
      if (!painted) skyGrad(ctx, [[0, '#010103'], [0.55, '#050409'], [1, '#0b0812']]);
      const px = -(cam.x - SW / 2) * 0.15 * cam.z;
      // distant lightning through high windows
      if (t % 420 === 0 || (t % 420 === 18)) this.bolt = 10;
      if (this.bolt > 0) this.bolt--;
      const flash = this.bolt > 0 ? (this.bolt / 10) * 0.35 : 0;
      if (!painted) for (let i = -3; i <= 3; i++) {
        const wx = W / 2 + px * 0.6 + i * 300;
        ctx.fillStyle = `rgba(${60 + flash * 400},${50 + flash * 400},${90 + flash * 400},${0.12 + flash})`;
        ctx.beginPath(); ctx.moveTo(wx - 40, 190); ctx.lineTo(wx - 40, 60); ctx.quadraticCurveTo(wx, 20, wx + 40, 60); ctx.lineTo(wx + 40, 190); ctx.closePath(); ctx.fill();
      }
      // towering pillars dissolving into the dark
      if (!painted) for (let i = -5; i <= 5; i++) {
        const x = W / 2 + px * 0.8 + i * 230;
        const g = ctx.createLinearGradient(0, 0, 0, GY);
        g.addColorStop(0, 'rgba(18,14,26,0)'); g.addColorStop(0.4, 'rgba(18,14,26,0.9)'); g.addColorStop(1, 'rgba(26,20,36,1)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 34, 0, 68, GY);
        ctx.fillStyle = 'rgba(201,162,74,0.12)';
        ctx.fillRect(x - 34, GY - 90, 68, 4);
      }
      fogBand(ctx, 170, 220, 0.2, 0.25, t, 3);
      // the verdict hangs on scrolls either side of the bench
      if (this.verdict) {
        const v = this.verdict;
        for (const side of [-1, 1]) {
          const sx = W / 2 + px + side * 330;
          ctx.fillStyle = 'rgba(214,206,190,0.92)';
          ctx.fillRect(sx - 56, 70, 112, 270);
          ctx.fillStyle = '#2a1810';
          ctx.fillRect(sx - 64, 62, 128, 10); ctx.fillRect(sx - 64, 338, 128, 10);
          [...v.jp].forEach((c, i) => JK.text(ctx, c, sx, 145 + i * 118, { size: 104, font: JK.FONT_JP, color: v.color === '#ffffff' ? '#101014' : v.color, stroke: '#000', strokeW: 3, shadow: v.color, shadowBlur: 18 }));
        }
      }
      // Judgeman, huge and lit from below
      const jx = W / 2 + px, jy = GY - 300, js = 1.3;
      JK.drawGlow(ctx, '#5a3cc0', jx, jy + 60, 420, 0.35);
      drawJudgeman(ctx, jx, jy, js, t, this.speaking, this.tilt ?? null);
      JK.drawGlow(ctx, '#e2bb4a', jx - 18 * js, jy - 57 * js, 26, 0.25 + (this.speaking ? 0.3 : 0));
      JK.drawGlow(ctx, '#e2bb4a', jx + 18 * js, jy - 57 * js, 26, 0.25 + (this.speaking ? 0.3 : 0));
      // one harsh spotlight on the bench
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createLinearGradient(0, 0, 0, GY);
      sg.addColorStop(0, 'rgba(220,210,255,0.22)'); sg.addColorStop(1, 'rgba(220,210,255,0.02)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(jx - 24, 0); ctx.lineTo(jx + 24, 0); ctx.lineTo(jx + 330, GY); ctx.lineTo(jx - 330, GY); ctx.closePath(); ctx.fill();
      ctx.restore();
      // judge's bench
      ctx.fillStyle = '#24140e';
      ctx.fillRect(jx - 260, GY - 250, 520, 190);
      ctx.fillStyle = '#34201a';
      ctx.fillRect(jx - 280, GY - 262, 560, 22);
      ctx.strokeStyle = 'rgba(201,162,74,0.7)'; ctx.lineWidth = 3;
      ctx.strokeRect(jx - 260, GY - 250, 520, 190);
      for (let i = -2; i <= 2; i++) ctx.strokeRect(jx + i * 100 - 38, GY - 225, 76, 140);
      ctx.fillStyle = '#c9a24a';
      ctx.beginPath(); ctx.arc(jx, GY - 155, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#24140e';
      ctx.beginPath(); ctx.arc(jx, GY - 155, 18, 0, Math.PI * 2); ctx.fill();
      // witness stands, barely visible
      if (!painted) for (const side of [-1, 1]) {
        const wx = W / 2 + px * 1.3 + side * 520;
        ctx.fillStyle = '#1a100c';
        ctx.fillRect(wx - 90, GY - 150, 180, 110);
        ctx.strokeStyle = 'rgba(201,162,74,0.3)'; ctx.lineWidth = 2;
        ctx.strokeRect(wx - 90, GY - 150, 180, 110);
      }
      fogBand(ctx, GY - 160, 200, 0.24, 0.45, t, 11);
      // black mirror floor
      if (!painted) floor(ctx, cam, '#0e0a14', '#020104', 'rgba(201,162,74,0.07)', 150);
      JK.drawGlow(ctx, '#5a3cc0', jx, GY + 40, 360, 0.18);
      fogBand(ctx, GY + 10, 150, 0.32, 0.6, t, 29, '150,140,180');
      if (flash > 0) { ctx.fillStyle = `rgba(200,200,255,${flash * 0.25})`; ctx.fillRect(0, 0, W, H); }
    },
    drawFront(ctx, cam, t) {
      // low fog rolling in front of the fighters, and a heavy vignette
      fogBand(ctx, H - 60, 180, 0.3, 0.9, t, 47, '160,150,190');
      fogBand(ctx, GY - 60, 140, 0.12, 1.2, t, 53, '170,160,200');
      fogBand(ctx, GY - 240, 160, 0.07, -0.7, t, 61, '170,160,200');
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    },
  };

  // Overtime: Collapse — a high-rise office at 6 PM, cracking apart around Nanami's opponent.
  DOMAINS.overtime_collapse = {
    paint: { ground: 0.86, tint: 'rgba(20,10,0,0.08)' },
    rim: '#ffd9a0',
    build() {
      this.city = lcanvas(360, (g, r, w, h) => {
        g.fillStyle = '#2a1830';
        for (let x = 0; x < w; x += 30 + r() * 50) {
          const bh = 80 + r() * 240;
          g.fillRect(x, h - bh, 26 + r() * 40, bh);
        }
        g.fillStyle = 'rgba(255,200,120,0.5)';
        for (let i = 0; i < 400; i++) g.fillRect(r() * w, h - r() * 260, 2, 3);
      }, 33);
      this.crack = 0;
      this.dust = [];
    },
    drawBack(ctx, cam, t) {
      const painted = paintBack(this, ctx, cam, t);
      const px = -(cam.x - SW / 2) * 0.35 * cam.z;
      if (!painted) {
        skyGrad(ctx, [[0, '#2a1a3a'], [0.45, '#8a3a4a'], [0.75, '#f08a3a'], [1, '#ffcf70']]);
        // setting sun
        JK.drawGlow(ctx, '#ffd070', W * 0.62, GY - 170, 260, 0.8);
        ctx.fillStyle = '#ffe2a0';
        ctx.beginPath(); ctx.arc(W * 0.62, GY - 170, 48, 0, Math.PI * 2); ctx.fill();
        layer(ctx, cam, this.city, 0.12, -60);
        // window frames of the office floor
        ctx.fillStyle = '#16121a';
        ctx.fillRect(0, 0, W, 46);
        for (let i = -8; i <= 8; i++) ctx.fillRect(W / 2 + px + i * 170 - 7, 0, 14, GY - 30);
        ctx.fillRect(0, GY - 150, W, 10);
      }
      // wall clock stopped at six
      const cx = W / 2 + px + 85, cy = 110;
      ctx.fillStyle = '#ece6da'; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#16121a'; ctx.lineWidth = 5; ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 24); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 18); ctx.stroke();
      JK.text(ctx, '18:00', cx, cy + 56, { size: 22, font: JK.FONT_TITLE, color: '#ffe2a0', stroke: '#000', strokeW: 4 });
      if (!painted) {
        // desks and chairs in silhouette
        ctx.fillStyle = '#1c1420';
        for (let i = -6; i <= 6; i++) {
          const dx = W / 2 + px * 1.4 + i * 230;
          ctx.fillRect(dx - 70, GY - 60, 140, 12);
          ctx.fillRect(dx - 64, GY - 48, 8, 40); ctx.fillRect(dx + 56, GY - 48, 8, 40);
          ctx.fillRect(dx - 20, GY - 96, 40, 30);
        }
        // carpet floor
        floor(ctx, cam, '#3a2e34', '#120c10', 'rgba(255,200,140,0.08)', 160);
      }
      // cracks spreading as the building gives way
      const k = this.crack;
      if (k > 0) {
        const rr = JK.rng(55);
        ctx.strokeStyle = `rgba(20,10,10,${0.5 + k * 0.4})`; ctx.lineWidth = 2 + k * 3;
        for (let i = 0; i < 9; i++) {
          let x = rr() * W, y = rr() * GY;
          ctx.beginPath(); ctx.moveTo(x, y);
          const n = Math.floor(2 + k * 6);
          for (let j = 0; j < n; j++) { x += (rr() - 0.5) * 120; y += (rr() - 0.2) * 70; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      // dust falling from the ceiling
      if (t % 4 === 0) this.dust.push({ x: Math.random() * W, y: 40, vy: 1 + Math.random() * 2 });
      ctx.fillStyle = 'rgba(200,180,160,0.5)';
      for (let i = this.dust.length - 1; i >= 0; i--) {
        const d = this.dust[i];
        d.y += d.vy; d.vy += 0.05;
        ctx.fillRect(d.x, d.y, 2, 2);
        if (d.y > H) this.dust.splice(i, 1);
      }
    },
    drawFront(ctx, cam, t) {
      ctx.fillStyle = 'rgba(255,150,60,0.08)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  // Idle Death Gamble — "Private Pure Love Train": a pachinko parlour fused with a night train
  DOMAINS.idle_death_gamble = {
    paint: { ground: 0.86, tint: 'rgba(0,10,4,0.08)' },
    rim: '#b8ffd8',
    build() {
      this.pins = lcanvas(520, (g, r, w, h) => {
        g.fillStyle = '#06140c'; g.fillRect(0, 0, w, h);
        for (let y = 20; y < h; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < w; x += 26) {
          g.fillStyle = r() < 0.08 ? '#ffd23a' : 'rgba(180,200,190,0.35)';
          g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
        }
        for (let i = 0; i < 30; i++) { g.strokeStyle = JK.pick(['rgba(42,255,122,0.4)', 'rgba(255,210,58,0.35)', 'rgba(255,90,170,0.3)']); g.lineWidth = 3; g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 60, 0, Math.PI * 2); g.stroke(); }
      }, 71);
      this.scenario = 0;
    },
    drawBack(ctx, cam, t) {
      const painted = paintBack(this, ctx, cam, t);
      if (!painted) {
        skyGrad(ctx, [[0, '#020805'], [0.6, '#0a2416'], [1, '#12301e']]);
        layer(ctx, cam, this.pins, 0.3, -120);
        // train windows
        const px = -(cam.x - SW / 2) * 0.5 * cam.z;
        for (let i = -6; i <= 6; i++) {
          const x = W / 2 + px + i * 260;
          ctx.fillStyle = '#0c1a12'; ctx.fillRect(x - 100, GY - 330, 200, 150);
          ctx.fillStyle = 'rgba(42,255,122,0.12)'; ctx.fillRect(x - 92, GY - 322, 184, 134);
          ctx.strokeStyle = '#3a4a40'; ctx.lineWidth = 6; ctx.strokeRect(x - 100, GY - 330, 200, 150);
        }
        floor(ctx, cam, '#1a2a20', '#050a07', 'rgba(255,210,58,0.12)', 150);
      }
      // chasing marquee bulbs
      for (let i = 0; i < 26; i++) {
        const x = 30 + i * 48, on = (Math.floor(t / 4) + i) % 3 === 0;
        const c = ['#ffd23a', '#2aff7a', '#ff5aaa'][i % 3];
        ctx.fillStyle = on ? c : 'rgba(60,60,60,0.8)';
        ctx.beginPath(); ctx.arc(x, 18, 6, 0, Math.PI * 2); ctx.fill();
        if (on) JK.drawGlow(ctx, c, x, 18, 26, 0.6);
      }
      // the train's LED destination board announces the current riichi scenario
      const bx = W / 2, by = 128;
      ctx.fillStyle = '#0a0a06'; ctx.fillRect(bx - 220, by - 20, 440, 40);
      ctx.strokeStyle = '#3a3a2a'; ctx.lineWidth = 3; ctx.strokeRect(bx - 220, by - 20, 440, 40);
      ctx.save();
      ctx.beginPath(); ctx.rect(bx - 214, by - 18, 428, 36); ctx.clip();
      const msg = '★ ' + (JK.HAKARI_SCEN ? JK.HAKARI_SCEN[this.scenario || 0] : '') + ' RIICHI ★  PRIVATE PURE LOVE TRAIN  ';
      const off = (t * 2) % 700;
      JK.text(ctx, msg, bx + 350 - off, by + 1, { size: 22, color: '#ffb020', font: JK.FONT_UI, weight: 'bold', align: 'left' });
      JK.text(ctx, msg, bx + 350 - off - 700, by + 1, { size: 22, color: '#ffb020', font: JK.FONT_UI, weight: 'bold', align: 'left' });
      ctx.restore();
    },
    drawFront(ctx, cam, t) {
      ctx.fillStyle = 'rgba(42,255,122,0.05)';
      ctx.fillRect(0, 0, W, H);
      // sweeping spotlights
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const x = W / 2 + Math.sin(t * 0.02 + i * 3) * 500;
        const g = ctx.createLinearGradient(x, 0, x, H);
        g.addColorStop(0, i ? 'rgba(255,210,58,0.16)' : 'rgba(42,255,122,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 200, H); ctx.lineTo(x - 200, H); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
  };

  // Authentic Mutual Love — a bright, endless field of katanas, each holding a copied technique
  DOMAINS.authentic_mutual_love = {
    paint: { ground: 0.86, tint: 'rgba(10,0,20,0.06)' },
    rim: '#fff0f8',
    build() {
      this.swords = lcanvas(300, (g, r, w, h) => {
        for (let i = 0; i < 260; i++) {
          const x = r() * w, y = h - r() * 90, s = 0.4 + (y / h) * 0.8, tilt = (r() - 0.5) * 0.4;
          g.save(); g.translate(x, y); g.rotate(tilt); g.scale(s, s);
          g.fillStyle = '#2a2436'; g.fillRect(-2, -130, 4, 30);
          g.fillStyle = '#1a1622'; g.fillRect(-8, -102, 16, 4);
          g.fillStyle = '#d8dce8'; g.fillRect(-2, -98, 4, 98);
          g.restore();
        }
      }, 91);
    },
    drawBack(ctx, cam, t) {
      const painted = paintBack(this, ctx, cam, t);
      if (!painted) {
        skyGrad(ctx, [[0, '#dfe6f8'], [0.5, '#f3e8f2'], [1, '#fff4f0']]);
        JK.drawGlow(ctx, '#ffffff', W * 0.5, GY - 260, 420, 0.8);
        layer(ctx, cam, this.swords, 0.25, 10);
        floor(ctx, cam, '#d8d0dc', '#a898b0', 'rgba(80,60,100,0.12)', 170);
      }
      // god rays
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x = W * (0.2 + i * 0.22) + Math.sin(t * 0.01 + i) * 30;
        const g = ctx.createLinearGradient(x, 0, x, GY);
        g.addColorStop(0, 'rgba(255,240,250,0.16)'); g.addColorStop(1, 'rgba(255,240,250,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 160, GY); ctx.lineTo(x - 90, GY); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    drawFront(ctx, cam, t) {
      ctx.fillStyle = 'rgba(255,220,240,0.04)';
      ctx.fillRect(0, 0, W, H);
    },
  };

  JK.STAGES = STAGES;
  JK.STAGE_ORDER = ['jujutsu_high', 'shibuya', 'shinjuku', 'kyoto'];
  JK.DOMAINS = DOMAINS;
  JK.getStage = function (id) {
    const s = STAGES[id];
    if (!s.L && s.build) s.build();
    // free other stages' layer canvases
    for (const k in STAGES) if (k !== id && STAGES[k].L) STAGES[k].L = null;
    return s;
  };
  for (const k in DOMAINS) DOMAINS[k].id = DOMAINS[k].id || k;
  for (const id of [...JK.STAGE_ORDER, ...Object.keys(DOMAINS), 'title']) JK.loadArt(id);
  JK.getDomain = function (id) {
    const d = DOMAINS[id];
    if (!d.built) { d.build(); d.built = true; }
    return d;
  };
  // Stage preview thumbnail (for stage select)
  JK.drawStageThumb = function (ctx, id, x, y, w, h, t) {
    const s = STAGES[id];
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, s.thumb[0]); g.addColorStop(0.6, s.thumb[1]); g.addColorStop(1, s.thumb[2]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
})();
