'use strict';
// Menu flow: title -> main -> select -> difficulty -> stage -> VS -> fight -> results.
JK.Menus = (function () {
  const W = JK.W, H = JK.H;
  const A = JK.Audio;
  const M = {
    screen: 'title', t: 0, sel: 0, hits: [], mouse: { x: 0, y: 0, down: false, click: false },
    cfg: { mode: 'versus', p1: 'yuji', p2: 'sukuna', difficulty: 'normal', stage: 'jujutsu_high' },
    game: null, particles: [], thumbs: {},
  };

  function go(screen, sel = 0) {
    if (screen !== 'fight' && screen !== 'results' && screen !== 'lobby') JK.Input.p2Enabled = false;
    if (screen !== 'fight' && screen !== 'results' && A.stopAllClips) A.stopAllClips();
    M.screen = screen;
    M.t = 0;
    M.sel = sel;
    M.subSel = 0;
  }
  M.go = go;

  // --------------------------------------------------------------- helpers
  function ember() {
    if (M.particles.length < 90) M.particles.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 1.6, r: 2 + Math.random() * 4, c: JK.pick(['#ff3050', '#6fc8ff', '#b784ff', '#ff8a3a']), life: 0 });
  }
  function bg(t, tint = '#1a0610') {
    const g = JK.ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#050308');
    g.addColorStop(1, tint);
    const ctx = JK.ctx;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // painted key art behind the menus, drifting slowly, dimmed so the UI stays readable
    const art = JK.ART && JK.ART.title;
    if (art && art.ready && JK.settings.painted !== false) {
      const s = Math.max(W / art.width, H / art.height) * 1.08;
      const dx = Math.sin(t * 0.002) * 30, dy = Math.cos(t * 0.0017) * 12;
      ctx.drawImage(art, W / 2 - (art.width * s) / 2 + dx, H / 2 - (art.height * s) / 2 + dy, art.width * s, art.height * s);
      ctx.fillStyle = g; ctx.globalAlpha = 0.62; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    // brush-texture diagonal streaks
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ff2040';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const y = ((i * 170 + t * 0.3) % (H + 300)) - 150;
      ctx.moveTo(-100, y); ctx.lineTo(W + 100, y - 260); ctx.lineTo(W + 100, y - 240); ctx.lineTo(-100, y + 26);
      ctx.fill();
    }
    ctx.restore();
    ember();
    for (let i = M.particles.length - 1; i >= 0; i--) {
      const p = M.particles[i];
      p.x += p.vx + Math.sin((t + i * 20) * 0.02) * 0.3;
      p.y += p.vy;
      if (p.y < -20) M.particles.splice(i, 1);
      else JK.drawGlow(ctx, p.c, p.x, p.y, p.r * 4, 0.5);
    }
  }
  function button(ctx, label, x, y, w, h, selected, onClick, opts = {}) {
    const hover = M.mouse.x > x && M.mouse.x < x + w && M.mouse.y > y && M.mouse.y < y + h;
    M.hits.push({ x, y, w, h, fn: onClick, idx: opts.idx });
    const on = selected || hover;
    ctx.save();
    JK.HUD.skewRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = on ? 'rgba(200,30,50,0.85)' : 'rgba(10,6,10,0.75)';
    ctx.fill();
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.strokeStyle = on ? '#ffd27a' : 'rgba(201,162,74,0.6)';
    ctx.stroke();
    if (on) JK.drawGlow(ctx, '#ff2a40', x + w / 2, y + h / 2, w * 0.6, 0.25);
    ctx.restore();
    JK.text(ctx, label, x + w / 2 + 7, y + h / 2 + 2, { size: opts.size || 34, color: on ? '#fff' : '#d8ccc0', spacing: 3 });
    if (opts.sub) JK.text(ctx, opts.sub, x + w / 2 + 7, y + h + 16, { size: 16, font: JK.FONT_UI, color: '#aaa' });
    return hover;
  }
  function title(ctx, str, jp, y = 70) {
    JK.text(ctx, jp, W / 2, y - 30, { size: 26, font: JK.FONT_JP, color: 'rgba(255,60,80,0.7)', spacing: 6 });
    JK.text(ctx, str, W / 2, y + 22, { size: 58, color: '#fff', stroke: '#000', strokeW: 8, spacing: 6, shadow: '#ff2040', shadowBlur: 20 });
  }
  function hint(ctx, str) {
    JK.text(ctx, str, W / 2, H - 24, { size: 18, font: JK.FONT_UI, color: '#9a8f88' });
  }
  function fakeFighter(ch) { return { poses: ch.poses, st: M.t }; }
  function drawIdle(ctx, id, x, y, s, flip, opts = {}) {
    const ch = JK.getCharacter(id, opts.costume || 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (flip ? -1 : 1), s);
    const pose = opts.pose || ch.idlePose(fakeFighter(ch), M.t);
    JK.drawCharacter(ctx, ch, pose, { cloth: Math.sin(M.t * 0.05) * 5, hairSway: Math.sin(M.t * 0.04) * 2, glowEyes: opts.glow, eyesOpen: opts.eyesOpen, face: opts.face });
    ctx.restore();
  }
  function stageThumb(id) {
    if (M.thumbs[id]) return M.thumbs[id];
    const s = JK.STAGES[id];
    const art = JK.ART && JK.ART[id];
    const waiting = s.paint && art && !art.ready && !art.failed;
    s.build();
    const big = JK.makeCanvas(W, H);
    const g = big.getContext('2d');
    s.drawBack(g, { x: JK.STAGE_W / 2, y: 0, z: 1 }, 100);
    const c = JK.makeCanvas(384, 216);
    c.getContext('2d').drawImage(big, 0, 0, 384, 216);
    s.L = null;
    if (!waiting) M.thumbs[id] = c; // re-render once the painting has loaded
    return c;
  }

  // --------------------------------------------------------------- screens
  const S = {};

  S.title = {
    update(inp) {
      if (M.t > 10 && (JK.Input.anyKey() || M.mouse.click)) { A.init(); A.sfx('confirm'); A.playMusic('menu'); go('main'); }
    },
    draw(ctx, t) {
      bg(t, '#12040a');
      // twin characters with contrasting auras
      JK.drawGlow(ctx, '#3f7bff', 270, 430, 380, 0.45);
      JK.drawGlow(ctx, '#ff2030', W - 270, 430, 380, 0.45);
      drawIdle(ctx, 'gojo', 300, 690, 2.15, false, { glow: true });
      drawIdle(ctx, 'sukuna', W - 300, 690, 2.15, true, { glow: true });
      // logo
      const pulse = 1 + Math.sin(t * 0.05) * 0.015;
      ctx.save();
      ctx.translate(W / 2, 210);
      ctx.scale(pulse, pulse);
      JK.text(ctx, '呪術', 0, -70, { size: 110, font: JK.FONT_JP, color: 'rgba(220,20,40,0.9)', stroke: '#000', strokeW: 6 });
      JK.text(ctx, 'JUJUTSU', 0, 20, { size: 120, color: '#fff', stroke: '#000', strokeW: 12, spacing: 10, shadow: '#ff2040', shadowBlur: 40 });
      JK.text(ctx, 'KOMBAT', 0, 118, { size: 104, color: '#ffd27a', stroke: '#000', strokeW: 12, spacing: 18, shadow: '#ff6a00', shadowBlur: 30 });
      ctx.restore();
      if (Math.floor(t / 30) % 2 === 0) JK.text(ctx, 'PRESS ANY KEY', W / 2, 520, { size: 36, color: '#fff', stroke: '#000', strokeW: 6, spacing: 8 });
      hint(ctx, 'A fan-made fighting game · sounds & music are synthesized originals');
    },
  };

  const MAIN_ITEMS = [
    ['ARCADE', 'Fight through every sorcerer', () => { M.cfg.mode = 'arcade'; JK.Input.p2Enabled = false; go('select'); }],
    ['VERSUS CPU', 'Pick your opponent, difficulty and stage', () => { M.cfg.mode = 'versus'; JK.Input.p2Enabled = false; go('select'); }],
    ['LOCAL VERSUS', 'Two players, one keyboard', () => { M.cfg.mode = 'versus2p'; JK.Input.p2Enabled = true; go('select'); }],
    ['ONLINE VERSUS', 'Fight a friend over the internet', () => { JK.Input.p2Enabled = false; go('lobby'); }],
    ['SURVIVAL', 'Endless foes, health carries over', () => { M.cfg.mode = 'survival'; JK.Input.p2Enabled = false; go('select'); }],
    ['TRAINING', 'Practice combos against a dummy', () => { M.cfg.mode = 'training'; JK.Input.p2Enabled = false; go('select'); }],
    ['HOW TO PLAY', 'Controls and move lists', () => go('howto')],
    ['OPTIONS', 'Audio, voice, effects', () => go('options')],
  ];
  S.main = {
    update(inp) {
      if (inp.up) { M.sel = (M.sel + MAIN_ITEMS.length - 1) % MAIN_ITEMS.length; A.sfx('move'); }
      if (inp.down) { M.sel = (M.sel + 1) % MAIN_ITEMS.length; A.sfx('move'); }
      if (inp.confirm) { A.sfx('confirm'); MAIN_ITEMS[M.sel][2](); }
      if (inp.back) { A.sfx('back'); go('title'); }
    },
    draw(ctx, t) {
      bg(t);
      const id = JK.CHAR_ORDER[Math.floor(t / 240) % JK.CHAR_ORDER.length];
      JK.drawGlow(ctx, JK.Characters[id].aura, W - 300, 450, 340, 0.4);
      drawIdle(ctx, id, W - 300, 690, 2.1, true, { glow: true });
      JK.text(ctx, 'JUJUTSU KOMBAT', 330, 90, { size: 64, color: '#fff', stroke: '#000', strokeW: 8, spacing: 6, shadow: '#ff2040', shadowBlur: 20 });
      JK.text(ctx, '呪術廻戦 × 格闘', 330, 140, { size: 26, font: JK.FONT_JP, color: '#ff4060' });
      MAIN_ITEMS.forEach(([label, sub], i) => {
        if (button(ctx, label, 90, 150 + i * 64, 440, 50, M.sel === i, () => { M.sel = i; A.sfx('confirm'); MAIN_ITEMS[i][2](); }, { size: 30, sub: M.sel === i ? sub : '' })) M.sel = i;
      });
      hint(ctx, '↑↓ / W S to move · ENTER / J to select · ESC back · mouse works too');
    },
  };

  // Character select (P1 then CPU). Up/down cycles costumes.
  M.cost = { 0: {}, 1: {} };
  function costumeOf(side, id) { return M.cost[side][id] || 0; }
  S.select = {
    update(inp) {
      const n = JK.CHAR_ORDER.length;
      const picking = M.subSel || 0; // 0 = P1, 1 = CPU
      if (inp.left) { M.sel = (M.sel + n - 1) % n; A.sfx('move'); }
      if (inp.right) { M.sel = (M.sel + 1) % n; A.sfx('move'); }
      if (inp.up || inp.down) this.cycle(inp.up ? -1 : 1);
      if (inp.confirm) this.pick();
      if (inp.back) {
        A.sfx('back');
        if (picking === 1) { M.subSel = 0; M.sel = JK.CHAR_ORDER.indexOf(M.cfg.p1); } else go('main');
      }
    },
    cycle(d) {
      const side = M.subSel || 0, id = JK.CHAR_ORDER[M.sel];
      const count = (JK.COSTUMES[id] || [1]).length;
      M.cost[side][id] = (costumeOf(side, id) + d + count) % count;
      A.sfx('select');
    },
    pick() {
      const id = JK.CHAR_ORDER[M.sel];
      A.sfx('confirm');
      const ch = JK.Characters[id];
      if (!M.subSel) {
        M.cfg.p1 = id;
        M.cfg.c1 = costumeOf(0, id);
        A.say(ch.short.toLowerCase(), { pitch: 0.5 });
        if (M.cfg.mode === 'arcade') {
          M.ladder = JK.CHAR_ORDER.filter((c) => c !== id);
          // the final opponent is always one of the two strongest
          M.ladder.sort((a, b) => (a === 'sukuna') - (b === 'sukuna') || (a === 'gojo') - (b === 'gojo'));
          M.ladderIdx = 0;
          M.cfg.p2 = M.ladder[0];
          M.cfg.c2 = 0;
          go('difficulty', 1);
        } else if (M.cfg.mode === 'survival') {
          M.survival = { streak: 0, hp: JK.MAX_HP };
          nextSurvivalFoe();
          go('difficulty', 1);
        } else {
          M.subSel = 1;
          M.sel = (M.sel + (M.cfg.mode === 'training' ? 1 : 2)) % JK.CHAR_ORDER.length;
        }
      } else {
        M.cfg.p2 = id;
        M.cfg.c2 = costumeOf(1, id);
        if (M.cfg.mode === 'training' || M.cfg.mode === 'versus2p') go('stage');
        else go('difficulty', 1);
      }
    },
    draw(ctx, t) {
      bg(t, '#0a0616');
      const picking = M.subSel || 0;
      title(ctx, picking ? (M.cfg.mode === 'training' ? 'CHOOSE DUMMY' : M.cfg.mode === 'versus2p' ? 'PLAYER 2 — CHOOSE' : 'CHOOSE OPPONENT') : 'CHOOSE YOUR SORCERER', '術師選択');
      const cur = JK.CHAR_ORDER[M.sel];
      const cost = costumeOf(picking, cur);
      const ch = JK.getCharacter(cur, cost);
      // big previews
      const px = picking ? W - 215 : 215;
      JK.drawGlow(ctx, ch.aura, px, 500, 300, 0.45);
      drawIdle(ctx, cur, px, 705, 1.75, picking === 1, { glow: true, costume: cost });
      if (picking) {
        const p1c = JK.Characters[M.cfg.p1];
        drawIdle(ctx, M.cfg.p1, 215, 705, 1.75, false, { costume: M.cfg.c1 || 0 });
        JK.text(ctx, p1c.name, 215, 300, { size: 26, color: p1c.color, stroke: '#000', strokeW: 5 });
      }
      // info panel
      const bx = W / 2 - 200, iy = 305;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, iy, 400, 250);
      ctx.strokeStyle = JK.rgba(ch.color, 0.8); ctx.lineWidth = 2; ctx.strokeRect(bx, iy, 400, 250);
      JK.text(ctx, ch.name, bx + 200, iy + 34, { size: 40, color: ch.color, stroke: '#000', strokeW: 6, spacing: 2 });
      JK.text(ctx, ch.jp + ' · ' + ch.title, bx + 200, iy + 70, { size: 20, font: JK.FONT_JP, color: '#ddd' });
      const stats = [['POWER', ch.stats.power], ['SPEED', ch.stats.speed], ['RANGE', ch.stats.range], ['DIFFICULTY', ch.stats.difficulty]];
      stats.forEach(([k, v], i) => {
        JK.text(ctx, k, bx + 30, iy + 110 + i * 30, { size: 20, align: 'left', color: '#bbb', font: JK.FONT_UI, weight: 'bold' });
        for (let j = 0; j < 5; j++) {
          ctx.fillStyle = j < v ? ch.color : 'rgba(255,255,255,0.12)';
          ctx.fillRect(bx + 180 + j * 38, iy + 102 + i * 30, 32, 12);
        }
      });
      JK.text(ctx, (ch.domain.ult ? 'Ultimate: ' : 'Domain: ') + ch.domain.name.replace('DOMAIN EXPANSION: ', ''), bx + 200, iy + 232, { size: 18, font: JK.FONT_UI, color: '#ffd27a' });
      // costume selector
      const list = JK.COSTUMES[cur] || [{ name: 'Default' }];
      const cy = iy + 285;
      JK.text(ctx, '◀   COSTUME ' + (cost + 1) + '/' + list.length + ':  ' + list[cost].name.toUpperCase() + '   ▶', W / 2, cy, { size: 26, color: '#fff', stroke: '#000', strokeW: 5, spacing: 2 });
      JK.text(ctx, '↑ ↓ to change costume', W / 2, cy + 26, { size: 16, font: JK.FONT_UI, color: '#aaa' });
      M.hits.push({ x: W / 2 - 260, y: cy - 20, w: 80, h: 40, fn: () => this.cycle(-1) });
      M.hits.push({ x: W / 2 + 180, y: cy - 20, w: 80, h: 40, fn: () => this.cycle(1) });
      // cards
      const n = JK.CHAR_ORDER.length;
      const gap = n > 7 ? 10 : 14, cw = Math.min(130, Math.floor((W - 50 - (n - 1) * gap) / n)), chh = 150;
      const x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
      JK.CHAR_ORDER.forEach((id, i) => {
        const c = JK.getCharacter(id, costumeOf(picking, id));
        const x = x0 + i * (cw + gap), y = 122;
        const on = i === M.sel;
        const hover = M.mouse.x > x && M.mouse.x < x + cw && M.mouse.y > y && M.mouse.y < y + chh;
        M.hits.push({ x, y, w: cw, h: chh, fn: () => { if (M.sel === i) this.pick(); else { M.sel = i; A.sfx('move'); } } });
        if (hover && !on) { M.sel = i; }
        ctx.save();
        ctx.fillStyle = on ? JK.rgba(c.color, 0.35) : 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, cw, chh);
        ctx.beginPath(); ctx.rect(x, y, cw, chh); ctx.clip();
        JK.drawGlow(ctx, c.aura, x + cw / 2, y + 80, 100, on ? 0.6 : 0.2);
        JK.drawPortrait(ctx, c, x + cw / 2, y + 66, 2.4, { face: on ? 'shout' : 'normal' });
        ctx.restore();
        ctx.lineWidth = on ? 4 : 2;
        ctx.strokeStyle = on ? '#ffd27a' : 'rgba(201,162,74,0.5)';
        ctx.strokeRect(x, y, cw, chh);
        JK.text(ctx, c.short, x + cw / 2, y + chh - 14, { size: 24, color: '#fff', stroke: '#000', strokeW: 5 });
      });
      hint(ctx, '← → choose · ↑ ↓ costume · ENTER confirm · ESC back');
    },
  };
  function nextSurvivalFoe() {
    M.cfg.p2 = JK.pick(JK.CHAR_ORDER);
    M.cfg.c2 = Math.floor(Math.random() * (JK.COSTUMES[M.cfg.p2] || [1]).length);
    M.cfg.stage = JK.pick(JK.STAGE_ORDER);
  }

  const DIFFS = [
    ['EASY', 'easy', 'Slow reactions, rarely blocks. Learn the basics.', '#6fe07a'],
    ['NORMAL', 'normal', 'Blocks, punishes and combos. A fair fight.', '#ffd24a'],
    ['PRO', 'pro', 'Reads you, hit-confirms, anti-airs and clashes domains.', '#ff3a4a'],
    ['EXPERT', 'expert', 'Instant reactions, Just Guards, punishes every whiff. No mercy.', '#c050ff'],
  ];
  S.difficulty = {
    update(inp) {
      if (inp.left || inp.up) { M.sel = (M.sel + DIFFS.length - 1) % DIFFS.length; A.sfx('move'); }
      if (inp.right || inp.down) { M.sel = (M.sel + 1) % DIFFS.length; A.sfx('move'); }
      if (inp.confirm) this.pick(M.sel);
      if (inp.back) { A.sfx('back'); go('select'); }
    },
    pick(i) {
      A.sfx('confirm');
      M.cfg.difficulty = DIFFS[i][1];
      if (M.cfg.mode === 'arcade') { M.cfg.stage = JK.pick(JK.STAGE_ORDER); go('vs'); } else if (M.cfg.mode === 'survival') go('vs'); else go('stage');
    },
    draw(ctx, t) {
      bg(t, '#10060a');
      title(ctx, 'SELECT DIFFICULTY', '難易度');
      DIFFS.forEach(([label, , desc, col], i) => {
        const w = 270, gap = 26, x = W / 2 - (DIFFS.length * w + (DIFFS.length - 1) * gap) / 2 + i * (w + gap), y = 210, h = 340;
        const on = M.sel === i;
        const hover = M.mouse.x > x && M.mouse.x < x + w && M.mouse.y > y && M.mouse.y < y + h;
        if (hover) M.sel = i;
        M.hits.push({ x, y, w, h, fn: () => this.pick(i) });
        ctx.fillStyle = on ? JK.rgba(col, 0.22) : 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, h);
        ctx.lineWidth = on ? 4 : 2;
        ctx.strokeStyle = on ? col : 'rgba(201,162,74,0.4)';
        ctx.strokeRect(x, y, w, h);
        if (on) JK.drawGlow(ctx, col, x + w / 2, y + 110, 160, 0.35);
        JK.text(ctx, ['初級', '中級', '一級', '特級'][i], x + w / 2, y + 90, { size: 80, font: JK.FONT_JP, color: col, stroke: '#000', strokeW: 6 });
        JK.text(ctx, label, x + w / 2, y + 170, { size: 48, color: '#fff', stroke: '#000', strokeW: 6, spacing: 4 });
        wrap(ctx, desc, x + w / 2, y + 220, w - 40, 22);
        for (let k = 0; k <= i; k++) JK.text(ctx, '★', x + w / 2 - i * 16 + k * 32, y + h - 24, { size: 26, color: col });
      });
      hint(ctx, '← → choose · ENTER confirm · ESC back');
    },
  };
  function wrap(ctx, text, x, y, maxW, lh) {
    ctx.font = `20px ${JK.FONT_UI}`;
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { JK.text(ctx, line, x, yy, { size: 20, font: JK.FONT_UI, color: '#ccc' }); line = w; yy += lh; } else line = test;
    }
    if (line) JK.text(ctx, line, x, yy, { size: 20, font: JK.FONT_UI, color: '#ccc' });
  }

  S.stage = {
    update(inp) {
      const n = JK.STAGE_ORDER.length;
      if (inp.left) { M.sel = (M.sel + n - 1) % n; A.sfx('move'); }
      if (inp.right) { M.sel = (M.sel + 1) % n; A.sfx('move'); }
      if (inp.up || inp.down) { M.sel = (M.sel + 2) % n; A.sfx('move'); }
      if (inp.confirm) this.pick(M.sel);
      if (inp.back) { A.sfx('back'); go(M.cfg.mode === 'training' ? 'select' : 'difficulty', 1); }
    },
    pick(i) {
      A.sfx('confirm');
      M.cfg.stage = JK.STAGE_ORDER[i];
      go('vs');
    },
    draw(ctx, t) {
      bg(t, '#060a14');
      title(ctx, 'SELECT STAGE', '舞台');
      JK.STAGE_ORDER.forEach((id, i) => {
        const s = JK.STAGES[id];
        const col = i % 2, row = Math.floor(i / 2);
        const x = 170 + col * 500, y = 150 + row * 262, w = 440, h = 228;
        const on = M.sel === i;
        const hover = M.mouse.x > x && M.mouse.x < x + w && M.mouse.y > y && M.mouse.y < y + h;
        if (hover) M.sel = i;
        M.hits.push({ x, y, w, h, fn: () => this.pick(i) });
        ctx.drawImage(stageThumb(id), x, y, w, h);
        ctx.fillStyle = on ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, y, w, h);
        ctx.lineWidth = on ? 4 : 2;
        ctx.strokeStyle = on ? '#ffd27a' : 'rgba(201,162,74,0.4)';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x, y + h - 56, w, 56);
        JK.text(ctx, s.name, x + w / 2, y + h - 36, { size: 30, color: on ? '#fff' : '#ccc', spacing: 2 });
        JK.text(ctx, s.jp, x + w / 2, y + h - 12, { size: 16, font: JK.FONT_JP, color: '#c9a24a' });
      });
      hint(ctx, 'Arrows choose · ENTER confirm · ESC back');
    },
  };

  S.vs = {
    update() {
      if (M.t === 1) fixMirror();
      if (M.t === 1) { A.sfx('gong'); A.say(JK.Characters[M.cfg.p1].short.toLowerCase() + ' versus ' + JK.Characters[M.cfg.p2].short.toLowerCase(), { pitch: 0.5 }); }
      if (M.t > 170 || (M.t > 40 && JK.Input.state.menu.confirm)) startGame();
    },
    draw(ctx, t) {
      const c1 = JK.getCharacter(M.cfg.p1, M.cfg.c1 || 0), c2 = JK.getCharacter(M.cfg.p2, M.cfg.c2 || 0);
      const k = JK.ease.outCubic(Math.min(1, M.t / 25));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 80, 0); ctx.lineTo(W / 2 - 80, H); ctx.lineTo(0, H); ctx.clip();
      const g1 = ctx.createLinearGradient(0, 0, W / 2, H); g1.addColorStop(0, JK.mix(c1.color, '#000', 0.4)); g1.addColorStop(1, '#050208');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
      JK.drawGlow(ctx, c1.aura, 330, 420, 400, 0.5);
      drawIdle(ctx, M.cfg.p1, -300 + 600 * k, 720, 2.5, false, { glow: true, face: 'shout', costume: M.cfg.c1 || 0 });
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(W / 2 + 80, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W / 2 - 80, H); ctx.clip();
      const g2 = ctx.createLinearGradient(W, 0, W / 2, H); g2.addColorStop(0, JK.mix(c2.color, '#000', 0.4)); g2.addColorStop(1, '#050208');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      JK.drawGlow(ctx, c2.aura, W - 330, 420, 400, 0.5);
      drawIdle(ctx, M.cfg.p2, W + 300 - 600 * k, 720, 2.5, true, { glow: true, face: 'shout', costume: M.cfg.c2 || 0 });
      ctx.restore();
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(W / 2 + 80, 0); ctx.lineTo(W / 2 - 80, H); ctx.stroke();
      const vsk = Math.min(1, Math.max(0, (M.t - 15) / 12));
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(1 + (1 - vsk) * 3, 1 + (1 - vsk) * 3);
      JK.text(ctx, '対', 0, -20, { size: 170, font: JK.FONT_JP, color: 'rgba(255,40,60,0.9)', stroke: '#000', strokeW: 8, alpha: vsk });
      JK.text(ctx, 'VS', 0, 60, { size: 110, color: '#fff', stroke: '#000', strokeW: 10, alpha: vsk, shadow: '#ff2040', shadowBlur: 30 });
      ctx.restore();
      JK.text(ctx, c1.name, 60 + 300 * (1 - k) * -1, 80, { size: 54, align: 'left', color: c1.color, stroke: '#000', strokeW: 7, spacing: 3 });
      JK.text(ctx, c1.jp, 60, 130, { size: 30, align: 'left', font: JK.FONT_JP, color: '#fff', stroke: '#000', strokeW: 5, alpha: k });
      JK.text(ctx, c2.name, W - 60 + 300 * (1 - k), H - 120, { size: 54, align: 'right', color: c2.color, stroke: '#000', strokeW: 7, spacing: 3 });
      JK.text(ctx, c2.jp, W - 60, H - 70, { size: 30, align: 'right', font: JK.FONT_JP, color: '#fff', stroke: '#000', strokeW: 5, alpha: k });
      const st = JK.STAGES[M.cfg.stage];
      const modeTag = M.cfg.mode === 'training' ? '' : M.cfg.mode === 'versus2p' ? '  ·  LOCAL VERSUS' : M.cfg.mode === 'netmatch' ? '  ·  ONLINE' : '  ·  ' + M.cfg.difficulty.toUpperCase();
      JK.text(ctx, st.name + modeTag, W / 2, H - 20, { size: 24, color: '#c9a24a', stroke: '#000', strokeW: 4, spacing: 3 });
      if (M.cfg.mode === 'survival') JK.text(ctx, 'SURVIVAL · BATTLE ' + (M.survival.streak + 1) + '  ·  HP ' + Math.round(M.survival.hp / JK.MAX_HP * 100) + '%', W / 2, 40, { size: 30, color: '#fff', stroke: '#000', strokeW: 5, spacing: 4 });
      if (M.cfg.mode === 'arcade') JK.text(ctx, 'BATTLE ' + (M.ladderIdx + 1) + ' / ' + M.ladder.length, W / 2, 40, { size: 30, color: '#fff', stroke: '#000', strokeW: 5, spacing: 4 });
    },
  };

  // --------------------------------------------------------------- online lobby
  M.lobby = { phase: 'idle', sel: 0, joinInput: '', msg: '', stageIdx: 0, picks: { host: { char: 'yuji', costume: 0 }, guest: { char: 'sukuna', costume: 0 } } };

  function sendMyPick() {
    const s = JK.NET.session;
    if (!s) return;
    const me = s.role === 'host' ? M.lobby.picks.host : M.lobby.picks.guest;
    s.send({ t: s.role === 'host' ? 'hpick' : 'gpick', char: me.char, costume: me.costume });
  }
  function buildNetCfg() {
    const L = M.lobby;
    const p1 = L.picks.host.char, p2 = L.picks.guest.char;
    const c1 = L.picks.host.costume;
    let c2 = L.picks.guest.costume;
    if (p1 === p2 && c1 === c2) c2 = (c2 + 1) % (JK.COSTUMES[p2] || [1, 1]).length; // tell mirror matches apart
    return { p1, p2, c1, c2, stage: JK.STAGE_ORDER[L.stageIdx], seed: (Math.random() * 0xffffffff) >>> 0 };
  }
  function enterPicking() {
    const L = M.lobby, s = JK.NET.session;
    L.phase = 'picking';
    L.msg = '';
    const me = s.role === 'host' ? L.picks.host : L.picks.guest;
    const cnt = (JK.COSTUMES[me.char] || [1]).length;
    me.costume = me.costume % cnt;
    sendMyPick();
    JK.Input.onKeyCapture = s.role === 'host' ? (e) => {
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (i >= 0 && L.stageIdx !== i) { L.stageIdx = i; s.send({ t: 'stage', idx: i }); A.sfx('move'); }
    } : null;
  }
  function wireSession(s) {
    s.onStatus = () => { if (s.status === 'linked' && M.lobby.phase !== 'picking') { A.sfx('confirm'); enterPicking(); } };
    s.onPause = () => { if (M.game) M.game.paused = true; };
    s.onResume = (base) => { s.applyResume(base); if (M.game) M.game.paused = false; };
    s.on('hpick', (m) => { M.lobby.picks.host = { char: m.char, costume: m.costume }; A.sfx('move'); });
    s.on('gpick', (m) => { M.lobby.picks.guest = { char: m.char, costume: m.costume }; A.sfx('move'); });
    s.on('stage', (m) => { M.lobby.stageIdx = m.idx; A.sfx('move'); });
    s.on('start', (m) => startNetMatch({ ...m.cfg, localPlayer: 2 }));
    s.on('both-rematch', () => {
      if (s.role !== 'host') return;
      const cfg = buildNetCfg();
      s.send({ t: 'start', cfg });
      startNetMatch({ ...cfg, localPlayer: 1 });
    });
  }

  S.lobby = {
    act(i) {
      const L = M.lobby;
      A.sfx('confirm');
      if (i === 0) {
        const s = JK.NET.newSession('host', JK.NET.newCode());
        wireSession(s);
        s.connect();
        L.phase = 'hosting';
      } else {
        L.phase = 'joining';
        L.joinInput = '';
        JK.Input.onKeyCapture = (e) => {
          if (/^Key[A-Z]$/.test(e.code) || /^Digit[2-9]$/.test(e.code)) {
            if (L.joinInput.length < 4) { L.joinInput += e.code.replace(/^Key|^Digit/, ''); A.sfx('move'); }
          } else if (e.code === 'Backspace') L.joinInput = L.joinInput.slice(0, -1);
        };
      }
    },
    startMatch() {
      const s = JK.NET.session;
      if (!s || s.role !== 'host') return;
      A.sfx('gong');
      const cfg = buildNetCfg();
      s.send({ t: 'start', cfg });
      startNetMatch({ ...cfg, localPlayer: 1 });
    },
    update(inp) {
      const L = M.lobby;
      const s = JK.NET.session;
      if (inp.back) {
        A.sfx('back');
        if (L.phase === 'idle') { go('main'); return; }
        JK.NET.destroy();
        M.netSession = null;
        JK.Input.onKeyCapture = null;
        L.phase = 'idle';
        return;
      }
      if (L.phase === 'idle') {
        if (inp.up || inp.down) { L.sel = (L.sel + 1) % 2; A.sfx('move'); }
        if (inp.confirm) this.act(L.sel);
        return;
      }
      if (s && s.status === 'error') { L.phase = 'error'; L.msg = s.error; JK.Input.onKeyCapture = null; return; }
      if (L.phase === 'hosting' || L.phase === 'joining') {
        if (s && s.status === 'linked') enterPicking();
        else if (L.phase === 'joining' && inp.confirm && L.joinInput.length === 4) {
          JK.Input.onKeyCapture = null;
          const sess = JK.NET.newSession('guest', L.joinInput.toUpperCase());
          wireSession(sess);
          sess.connect();
        }
        return;
      }
      if (L.phase === 'picking' && s) {
        const me = s.role === 'host' ? L.picks.host : L.picks.guest;
        const n = JK.CHAR_ORDER.length;
        if (inp.left) { me.char = JK.CHAR_ORDER[(JK.CHAR_ORDER.indexOf(me.char) + n - 1) % n]; me.costume = 0; sendMyPick(); A.sfx('move'); }
        if (inp.right) { me.char = JK.CHAR_ORDER[(JK.CHAR_ORDER.indexOf(me.char) + 1) % n]; me.costume = 0; sendMyPick(); A.sfx('move'); }
        if (inp.up || inp.down) {
          const cnt = (JK.COSTUMES[me.char] || [1]).length;
          me.costume = (me.costume + (inp.up ? -1 : 1) + cnt) % cnt;
          sendMyPick(); A.sfx('select');
        }
        if (s.role === 'host' && inp.confirm) this.startMatch();
      }
    },
    draw(ctx, t) {
      const L = M.lobby;
      bg(t, '#060a14');
      title(ctx, 'ONLINE VERSUS', 'オンライン対戦');
      const s = JK.NET.session;
      if (!JK.NET.supported) {
        JK.text(ctx, 'The networking library did not load (are you offline?)', W / 2, 340, { size: 26, font: JK.FONT_UI, color: '#ff5a5a' });
        JK.text(ctx, 'Single-player modes still work.', W / 2, 380, { size: 20, font: JK.FONT_UI, color: '#aaa' });
        hint(ctx, 'ESC back');
        return;
      }
      if (L.phase === 'idle') {
        if (button(ctx, 'HOST ROOM', W / 2 - 220, 280, 440, 56, L.sel === 0, () => { L.sel = 0; this.act(0); }, { sub: L.sel === 0 ? 'Get a room code to share' : '' })) L.sel = 0;
        if (button(ctx, 'JOIN ROOM', W / 2 - 220, 380, 440, 56, L.sel === 1, () => { L.sel = 1; this.act(1); }, { sub: L.sel === 1 ? 'Enter a friend\'s code' : '' })) L.sel = 1;
        JK.text(ctx, 'Free peer-to-peer (WebRTC). Both players need the site open.', W / 2, 490, { size: 19, font: JK.FONT_UI, color: '#9a8f88' });
        JK.text(ctx, 'On one computer? Use two WINDOWS side by side — background tabs freeze and stall the match.', W / 2, 522, { size: 18, font: JK.FONT_UI, color: '#ffd27a' });
        hint(ctx, '↑↓ choose · ENTER confirm · ESC back');
        return;
      }
      if (L.phase === 'hosting') {
        JK.text(ctx, 'ROOM CODE', W / 2, 250, { size: 30, font: JK.FONT_UI, color: '#c9a24a', spacing: 4 });
        JK.text(ctx, s ? s.code : '…', W / 2, 340, { size: 110, color: '#fff', stroke: '#000', strokeW: 10, spacing: 20, shadow: '#ff2040', shadowBlur: 24 });
        JK.text(ctx, 'Share this code — waiting for your opponent' + '…'.repeat(1 + (Math.floor(t / 30) % 3)), W / 2, 430, { size: 22, font: JK.FONT_UI, color: '#9a8f88' });
        hint(ctx, 'ESC cancel');
        return;
      }
      if (L.phase === 'joining') {
        JK.text(ctx, 'ENTER ROOM CODE', W / 2, 250, { size: 30, font: JK.FONT_UI, color: '#c9a24a', spacing: 4 });
        for (let i = 0; i < 4; i++) {
          const x = W / 2 - 190 + i * 120;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, 300, 96, 110);
          ctx.strokeStyle = i === L.joinInput.length ? '#ffd27a' : 'rgba(201,162,74,0.5)';
          ctx.lineWidth = i === L.joinInput.length ? 3 : 2;
          ctx.strokeRect(x, 300, 96, 110);
          JK.text(ctx, L.joinInput[i] || (i === L.joinInput.length ? '_' : ''), x + 48, 358, { size: 62, color: '#fff' });
        }
        JK.text(ctx, s && s.status === 'connecting' ? 'CONNECTING…' : 'Type the 4-letter code your friend shared', W / 2, 460, { size: 22, font: JK.FONT_UI, color: '#9a8f88' });
        if (L.joinInput.length === 4) JK.text(ctx, 'Press ENTER to connect', W / 2, 500, { size: 24, font: JK.FONT_UI, color: '#ffd27a' });
        hint(ctx, 'A–Z / 2–9 · ENTER connect · ESC back');
        return;
      }
      if (L.phase === 'error') {
        JK.text(ctx, L.msg || 'Connection failed.', W / 2, 340, { size: 28, font: JK.FONT_UI, color: '#ff5a5a' });
        hint(ctx, 'ESC back');
        return;
      }
      if (L.phase === 'picking' && s) {
        const isHost = s.role === 'host';
        JK.text(ctx, 'ROOM ' + s.code + '  ·  LINKED', W / 2, 130, { size: 20, font: JK.FONT_UI, color: '#6fe07a', spacing: 2 });
        const sides = [['host', 300, false], ['guest', W - 300, true]];
        for (const [who, x, flip] of sides) {
          const pick = L.picks[who];
          const ch = JK.getCharacter(pick.char, pick.costume || 0);
          const mine = (who === 'host') === isHost;
          JK.drawGlow(ctx, ch.aura, x, 430, 300, mine ? 0.5 : 0.25);
          drawIdle(ctx, pick.char, x, 560, 1.6, flip, { costume: pick.costume || 0, glow: mine });
          JK.text(ctx, mine ? 'YOU' : 'OPPONENT', x, 180, { size: 24, font: JK.FONT_UI, color: mine ? '#ffd27a' : '#9a8f88', spacing: 3 });
          JK.text(ctx, ch.name, x, 620, { size: 30, color: ch.color, stroke: '#000', strokeW: 5 });
          const costumes = JK.COSTUMES[pick.char] || [{ name: 'Default' }];
          JK.text(ctx, costumes[pick.costume || 0].name.toUpperCase(), x, 650, { size: 18, font: JK.FONT_UI, color: '#ccc' });
        }
        const me = isHost ? L.picks.host : L.picks.guest;
        JK.text(ctx, '← → character  ·  ↑ ↓ costume', W / 2, 230, { size: 20, font: JK.FONT_UI, color: '#aaa' });
        if (s.remoteHidden) JK.text(ctx, "Your opponent's window is in the background — the match will hold until they return.", W / 2, 155, { size: 17, font: JK.FONT_UI, color: '#ffd24a' });
        // stage picker (host only)
        JK.text(ctx, 'STAGE', W / 2, 268, { size: 18, font: JK.FONT_UI, color: '#c9a24a', spacing: 3 });
        JK.STAGE_ORDER.forEach((id, i) => {
          const w = 200, gap = 20;
          const x = W / 2 - (JK.STAGE_ORDER.length * w + (JK.STAGE_ORDER.length - 1) * gap) / 2 + i * (w + gap), y = 690 - 116, hh = 110;
          const on = L.stageIdx === i;
          if (isHost) {
            M.hits.push({ x, y, w, h: hh, fn: () => { if (L.stageIdx !== i) { L.stageIdx = i; s.send({ t: 'stage', idx: i }); A.sfx('confirm'); } } });
          }
          ctx.globalAlpha = isHost ? 1 : 0.55;
          ctx.drawImage(stageThumb(id), x, y, w, hh);
          ctx.globalAlpha = 1;
          ctx.lineWidth = on ? 4 : 2;
          ctx.strokeStyle = on ? '#ffd27a' : 'rgba(201,162,74,0.5)';
          ctx.strokeRect(x, y, w, hh);
          JK.text(ctx, JK.STAGES[id].name, x + w / 2, y + hh - 14, { size: 17, font: JK.FONT_UI, color: '#fff', stroke: '#000', strokeW: 3 });
        });
        if (isHost) {
          if (button(ctx, 'START MATCH', W / 2 - 150, 660, 300, 46, false, () => this.startMatch(), { size: 26 })) { /* hover */ }
          JK.text(ctx, 'or press ENTER · stage: click a card or press 1–4', W / 2, H - 12, { size: 16, font: JK.FONT_UI, color: '#9a8f88' });
        } else {
          JK.text(ctx, 'Waiting for the host to start' + '…'.repeat(1 + (Math.floor(t / 30) % 3)), W / 2, 686, { size: 22, font: JK.FONT_UI, color: '#9a8f88' });
          hint(ctx, 'ESC leave room');
        }
      }
    },
  };

  // Mirror matches: the CPU wears a different costume so the two fighters are easy to tell apart.
  function fixMirror() {
    const c = M.cfg;
    if (c.p1 === c.p2 && (c.c1 || 0) === (c.c2 || 0)) c.c2 = ((c.c1 || 0) + 1) % (JK.COSTUMES[c.p2] || [1, 1]).length;
  }
  function startGame() {
    const cfg = M.cfg;
    JK.Input.p2Enabled = cfg.mode === 'versus2p';
    JK.FX.clear();
    A.stopAllClips();
    fixMirror();
    const surv = cfg.mode === 'survival' && M.survival;
    // netplay: seed the shared deterministic RNG so both peers simulate identical matches
    if (cfg.mode === 'netmatch' && M.netSeed !== undefined) JK.seedSim(M.netSeed);
    else JK.stopSim();
    M.game = new JK.Game({
      p1: cfg.p1, p2: cfg.p2, c1: cfg.c1 || 0, c2: cfg.c2 || 0, stage: cfg.stage, difficulty: cfg.difficulty, mode: cfg.mode,
      p2human: cfg.mode === 'versus2p' ? 'local' : null,
      net: cfg.mode === 'netmatch' ? { session: M.netSession, localPlayer: M.netLocalPlayer } : null,
      roundsToWin: surv ? 1 : 3, p1Hp: surv ? M.survival.hp : 0, streak: surv ? M.survival.streak : 0,
      onEnd: (res) => { M.result = res; if (cfg.mode === 'survival') survivalResult(res); go('results'); },
    });
    go('fight');
  }
  M.startGame = startGame;

  // Launch an online match from the lobby (host builds the config, guest receives it).
  function startNetMatch(cfg) {
    JK.Input.p2Enabled = false;
    M.cfg.mode = 'netmatch';
    M.cfg.p1 = cfg.p1;
    M.cfg.p2 = cfg.p2;
    M.cfg.c1 = cfg.c1 || 0;
    M.cfg.c2 = cfg.c2 || 0;
    M.cfg.stage = cfg.stage;
    M.netSeed = cfg.seed;
    M.netSession = JK.NET.session;
    M.netLocalPlayer = cfg.localPlayer;
    startGame();
  }
  M.startNetMatch = startNetMatch;

  const PAUSE_ITEMS = ['RESUME', 'MOVE LIST', 'RESTART', 'CHARACTER SELECT', 'MAIN MENU'];
  const NET_PAUSE_ITEMS = ['RESUME', 'MOVE LIST', 'LEAVE ROOM'];
  function leaveNetToLobby(msg) {
    if (M.netSession) M.netSession.leave();
    M.netSession = null;
    JK.stopSim();
    A.playMusic('menu');
    M.lobbyMsg = msg || '';
    go('lobby');
  }
  S.fight = {
    update(inp) {
      const g = M.game;
      if (!g) return;
      if (g.net && (g.net.status === 'error' || g.net.status === 'closed')) {
        leaveNetToLobby(g.net.error || 'Disconnected.');
        return;
      }
      if (M.moveList) {
        if (inp.back || inp.confirm || inp.pause) { M.moveList = false; A.sfx('back'); }
        return;
      }
      if (g.paused) {
        const items = g.net ? NET_PAUSE_ITEMS : PAUSE_ITEMS;
        if (inp.up) { M.sel = (M.sel + items.length - 1) % items.length; A.sfx('move'); }
        if (inp.down) { M.sel = (M.sel + 1) % items.length; A.sfx('move'); }
        if (inp.confirm) this.pauseAction(M.sel);
        if (inp.pause || inp.back) this.pauseAction(0);
        return;
      }
      if (inp.pause && !g.ended) {
        g.paused = true; M.sel = 0; A.sfx('select');
        if (g.net) g.net.requestPause();
        return;
      }
      g.update();
    },
    pauseAction(i) {
      const g = M.game;
      A.sfx('confirm');
      if (i === 0) { g.paused = false; if (g.net) g.net.requestResume(); }
      else if (i === 1) M.moveList = true;
      else if (g.net) leaveNetToLobby('Left the room.');
      else if (i === 2) startGame();
      else if (i === 3) { A.playMusic('menu'); go('select'); }
      else { A.playMusic('menu'); go('main'); }
    },
    draw(ctx, t) {
      const g = M.game;
      if (!g) return;
      g.draw(ctx);
      if (g.net) {
        const s = g.net;
        let state = g.netStalled ? 'SYNCING…' : '';
        if (s.remoteHidden) state = "WAITING — OPPONENT'S WINDOW IS IN THE BACKGROUND";
        else if (s.localHidden) state = 'PAUSED — THIS WINDOW IS IN THE BACKGROUND';
        JK.text(ctx, 'ROOM ' + s.code + '  ·  ' + (s.ping || '—') + ' ms' + (s.desync ? '  ·  DESYNC DETECTED' : state ? '  ·  ' + state : ''), W - 26, 22, { size: 18, align: 'right', font: JK.FONT_UI, color: s.desync ? '#ff4050' : state ? '#ffd24a' : 'rgba(255,255,255,0.55)' });
        if (s.remoteHidden) JK.text(ctx, 'The match resumes automatically when they switch back.', W / 2, 60, { size: 20, font: JK.FONT_UI, color: '#ffd24a' });
        else if (s.desync) JK.text(ctx, 'The match state drifted apart — results may differ between players.', W / 2, 60, { size: 20, font: JK.FONT_UI, color: '#ff4050' });
      }
      if (g.paused && !M.moveList) {
        const items = g.net ? NET_PAUSE_ITEMS : PAUSE_ITEMS;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        title(ctx, 'PAUSED', '一時停止', 150);
        items.forEach((label, i) => {
          if (button(ctx, label, W / 2 - 220, 230 + i * 74, 440, 54, M.sel === i, () => this.pauseAction(i), { size: 30 })) M.sel = i;
        });
      }
      if (M.moveList) drawMoveList(ctx, g.p1.id);
    },
  };

  function drawMoveList(ctx, id) {
    const ch = JK.Characters[id];
    ctx.fillStyle = 'rgba(4,2,8,0.92)'; ctx.fillRect(0, 0, W, H);
    title(ctx, ch.name + ' — MOVE LIST', ch.jp, 60);
    const col = (list, x, head) => {
      JK.text(ctx, head, x, 140, { size: 30, align: 'left', color: ch.color, spacing: 3 });
      list.forEach(([k, d], i) => {
        JK.text(ctx, k, x, 185 + i * 40, { size: 24, align: 'left', color: '#ffd27a', font: JK.FONT_UI, weight: 'bold' });
        JK.text(ctx, d, x + 170, 185 + i * 40, { size: 22, align: 'left', color: '#ddd', font: JK.FONT_UI });
      });
    };
    col(JK.MOVE_LIST.common, 70, 'UNIVERSAL');
    col(JK.MOVE_LIST[id], 680, 'CURSED TECHNIQUES');
    JK.text(ctx, 'Specials cancel from any normal that connects. Uppercut and the 3rd jab launch — follow up in the air.', W / 2, H - 80, { size: 20, font: JK.FONT_UI, color: '#aaa' });
    hint(ctx, 'ESC / ENTER to close');
  }

  function survivalResult(res) {
    const s = M.survival;
    if (res.winner === 'p1') {
      s.streak++;
      s.hp = Math.min(JK.MAX_HP, Math.max(1, M.game.p1.hp) + JK.MAX_HP * 0.3);
    }
    let best = 0;
    try { best = +localStorage.getItem('jk_survival_best') || 0; } catch (e) { /* ignore */ }
    s.newBest = s.streak > best;
    s.best = Math.max(best, s.streak);
    try { localStorage.setItem('jk_survival_best', String(s.best)); } catch (e) { /* ignore */ }
  }

  S.results = {
    update(inp) {
      const items = this.items();
      if (inp.up) { M.sel = (M.sel + items.length - 1) % items.length; A.sfx('move'); }
      if (inp.down) { M.sel = (M.sel + 1) % items.length; A.sfx('move'); }
      if (inp.confirm) { A.sfx('confirm'); items[M.sel][1](); }
      if (M.game) M.game.update();
    },
    items() {
      const iWon = () => M.result && ((M.result.winner === 'p1') === (M.netLocalPlayer === 1));
      const won = M.result && (M.cfg.mode === 'netmatch' ? iWon() : M.result.winner === 'p1');
      if (M.cfg.mode === 'netmatch') {
        return [
          ['REMATCH', () => { if (M.netSession) M.netSession.requestRematch(); }],
          ['LEAVE ROOM', () => leaveNetToLobby('Left the room.')],
        ];
      }
      if (M.cfg.mode === 'arcade') {
        if (won && M.ladderIdx >= M.ladder.length - 1) return [['CONTINUE', () => go('ending')]];
        if (won) return [['NEXT BATTLE', () => { M.ladderIdx++; M.cfg.p2 = M.ladder[M.ladderIdx]; M.cfg.stage = JK.pick(JK.STAGE_ORDER); A.playMusic('menu'); go('vs'); }], ['MAIN MENU', () => { A.playMusic('menu'); go('main'); }]];
        return [['RETRY', () => startGame()], ['MAIN MENU', () => { A.playMusic('menu'); go('main'); }]];
      }
      if (M.cfg.mode === 'survival') {
        if (won) return [['NEXT OPPONENT', () => { nextSurvivalFoe(); A.playMusic('menu'); go('vs'); }], ['MAIN MENU', () => { A.playMusic('menu'); go('main'); }]];
        return [['TRY AGAIN', () => { M.survival = { streak: 0, hp: JK.MAX_HP }; nextSurvivalFoe(); go('vs'); }], ['MAIN MENU', () => { A.playMusic('menu'); go('main'); }]];
      }
      return [['REMATCH', () => startGame()], ['CHARACTER SELECT', () => { A.playMusic('menu'); go('select'); }], ['MAIN MENU', () => { A.playMusic('menu'); go('main'); }]];
    },
    draw(ctx, t) {
      if (M.game) M.game.draw(ctx);
      // in netplay "p1" is always the host — judge victory from the viewer's seat
      const meIsP1 = M.cfg.mode === 'netmatch' ? M.netLocalPlayer === 1 : true;
      const won = M.result && ((M.result.winner === 'p1') === meIsP1);
      const k = Math.min(1, M.t / 20);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
      JK.text(ctx, won ? '勝利' : '敗北', W / 2, 110, { size: 100, font: JK.FONT_JP, color: won ? 'rgba(255,210,120,0.9)' : 'rgba(160,20,30,0.9)', stroke: '#000', strokeW: 8, alpha: k });
      JK.text(ctx, won ? 'VICTORY' : 'DEFEAT', W / 2, 200, { size: 84, color: '#fff', stroke: '#000', strokeW: 10, spacing: 12, alpha: k, shadow: won ? '#ffb020' : '#ff1030', shadowBlur: 30 });
      // match stats
      const st = M.game && M.game.stats && M.game.stats.p1;
      if (st) {
        const cells = [['MAX COMBO', st.maxCombo + ' HITS'], ['DAMAGE', Math.round(st.dmg / JK.MAX_HP * 100) + '%'], ['BLACK FLASHES', String(st.bf)], ['DOMAINS', String(st.domains)], ['JUST GUARDS', String(st.jg || 0)], ['WALL SPLATS', String(st.splats || 0)]];
        const cw = 170, x0 = W / 2 - (cells.length * cw) / 2;
        ctx.save(); ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0 - 10, 250, cells.length * cw + 20, 72);
        ctx.restore();
        cells.forEach(([label, val], i) => {
          const x = x0 + i * cw + cw / 2;
          JK.text(ctx, label, x, 268, { size: 18, font: JK.FONT_UI, color: '#c9a24a', alpha: k, weight: 'bold' });
          JK.text(ctx, val, x, 300, { size: 34, color: '#fff', stroke: '#000', strokeW: 5, alpha: k });
        });
      }
      if (M.cfg.mode === 'survival' && M.survival) {
        const sv = M.survival;
        const line = won ? 'STREAK ' + sv.streak + '  ·  NEXT FIGHT HP ' + Math.round(sv.hp / JK.MAX_HP * 100) + '%' : 'FINAL STREAK ' + sv.streak + '  ·  BEST ' + sv.best + (sv.newBest && sv.streak > 0 ? '  ·  NEW RECORD!' : '');
        JK.text(ctx, line, W / 2, 348, { size: 28, color: '#ffd27a', stroke: '#000', strokeW: 5, alpha: k, spacing: 2 });
      }
      if (M.cfg.mode === 'netmatch' && M.netSession && M.netSession.wantRematch && !M.netSession.peerWantRematch) {
        JK.text(ctx, 'WAITING FOR OPPONENT…', W / 2, 352, { size: 24, font: JK.FONT_UI, color: '#9a8f88', alpha: 0.5 + 0.5 * Math.sin(t * 0.1) });
      }
      this.items().forEach(([label, fn], i) => {
        if (button(ctx, label, W / 2 - 210, 385 + i * 74, 420, 54, M.sel === i, () => { A.sfx('confirm'); fn(); }, { size: 30 })) M.sel = i;
      });
    },
  };

  S.ending = {
    update(inp) { if (M.t > 90 && (inp.confirm || inp.back || M.mouse.click)) { A.playMusic('menu'); go('main'); } },
    draw(ctx, t) {
      bg(t, '#1a1004');
      const id = M.cfg.p1;
      const ch = JK.Characters[id];
      JK.drawGlow(ctx, ch.aura, W / 2, 420, 420, 0.5);
      drawIdle(ctx, id, W / 2, 712, 1.7, false, { glow: true, pose: JK.Rig.sample(ch.winAnim, M.t) });
      JK.text(ctx, '最強', W / 2, 120, { size: 120, font: JK.FONT_JP, color: 'rgba(255,210,120,0.9)', stroke: '#000', strokeW: 8 });
      JK.text(ctx, 'THE STRONGEST', W / 2, 220, { size: 80, color: '#fff', stroke: '#000', strokeW: 10, spacing: 10, shadow: ch.color, shadowBlur: 30 });
      JK.text(ctx, ch.name + ' has conquered every sorcerer on ' + M.cfg.difficulty.toUpperCase(), W / 2, 280, { size: 26, font: JK.FONT_UI, color: '#ffd27a', stroke: '#000', strokeW: 4 });
      if (M.t > 90) hint(ctx, 'Press ENTER to return to the main menu');
    },
  };

  let howTab = 0;
  S.howto = {
    update(inp) {
      const pages = JK.CHAR_ORDER.length + 3;
      if (inp.left) { howTab = (howTab + pages - 1) % pages; A.sfx('move'); }
      if (inp.right) { howTab = (howTab + 1) % pages; A.sfx('move'); }
      if (inp.back || inp.confirm) { A.sfx('back'); go('main', 6); }
    },
    draw(ctx, t) {
      bg(t, '#08060e');
      if (howTab === 0) {
        title(ctx, 'HOW TO PLAY', '操作方法');
        const rows = [
          ['MOVE', 'A / D  or  ← →', 'Walk · double-tap to dash'],
          ['DASH / RUN', 'SHIFT  (or F)', 'Dash · keep holding → to run · hold ← to backdash'],
          ['JUMP / CROUCH', 'W / S  or  ↑ ↓', 'Hold ↓ to crouch'],
          ['ATTACKS', 'J  K  L', 'Light · Heavy · Kick'],
          ['TECHNIQUES', 'U  I  O', 'Cursed techniques · cooldowns shown on the HUD'],
          ['BLOCK', 'SPACE', 'Hold · ↓ for lows · tap late to JUST GUARD'],
          ['THROW', 'H  (or J+L)', 'Beats blocking opponents'],
          ['DOMAIN', 'Q', 'Needs 3 full bars of cursed energy'],
          ['PAUSE', 'ESC / P', 'Move list, restart, quit'],
          ['GAMEPAD', 'X Y A · LB B RB', 'Light Heavy Kick · Techniques · RT block · LT domain'],
        ];
        rows.forEach(([a, b, c], i) => {
          const y = 150 + i * 52;
          JK.text(ctx, a, 200, y, { size: 28, align: 'left', color: '#ff5a6a', spacing: 2 });
          JK.text(ctx, b, 480, y, { size: 28, align: 'left', color: '#ffd27a', font: JK.FONT_UI, weight: 'bold' });
          JK.text(ctx, c, 760, y, { size: 22, align: 'left', color: '#ccc', font: JK.FONT_UI });
        });
        JK.text(ctx, 'Cursed energy builds as you fight. When a domain opens against you with 3 bars, press Q to CLASH and mash!', W / 2, H - 70, { size: 20, font: JK.FONT_UI, color: '#aaa' });
      } else if (howTab === 1) {
        title(ctx, 'MOVEMENT & DEFENSE', '体術');
        const rows = [
          ['RUN', 'SHIFT, hold →', 'Sprint in. Attack out of a run and you keep the momentum'],
          ['RUNNING JUMP', '↑ while running', 'A longer, faster jump'],
          ['AIR DASH', 'SHIFT in the air', 'Once per jump · hold ← to air-dash backwards'],
          ['AIR CONTROL', '← → in the air', 'Drift a little to adjust your landing'],
          ['DASH CANCEL', 'SHIFT on hit', 'Cancel a connecting normal into a dash to extend combos'],
          ['JUST GUARD', 'tap SPACE late', 'Block right before impact: no chip, faster recovery, +energy'],
          ['TECH ROLL', 'SHIFT / SPACE on the floor', 'Quick rise · hold ← or → to roll away or through'],
          ['WALL SPLAT', 'juggle into the edge', 'Opponents slam into the veil and hang there. Follow up!'],
          ['TRAINING', 'TAB · R · C', 'Dummy behaviour · reset · cooldowns on/off'],
        ];
        rows.forEach(([a, b, c], i) => {
          const y = 150 + i * 54;
          JK.text(ctx, a, 130, y, { size: 28, align: 'left', color: '#ff5a6a', spacing: 2 });
          JK.text(ctx, b, 390, y, { size: 24, align: 'left', color: '#ffd27a', font: JK.FONT_UI, weight: 'bold' });
          JK.text(ctx, c, 690, y, { size: 20, align: 'left', color: '#ccc', font: JK.FONT_UI });
        });
      } else if (howTab === 2) {
        title(ctx, 'MULTIPLAYER', '対戦');
        const rows = [
          ['LOCAL VERSUS', 'Main menu', 'Two players on one keyboard. Pick a fighter for each side, then a stage.'],
          ['P1 KEYS', 'unchanged', 'WASD + J K L · U I O techniques · SPACE block · Q domain · E amp · H throw · L-Shift dash'],
          ['P2 KEYS', 'right side', 'ARROWS move · B N M techniques · , . / attacks · R-Shift block · ENTER domain · V throw · C dash · X amp'],
          ['P2 GAMEPAD', 'second pad', 'Plug in a second controller — pad 1 drives player 2 automatically.'],
          ['ONLINE VERSUS', 'Main menu', 'One player hosts and shares a 4-letter room code; the other joins. Host is the left (P1) side.'],
          ['ONLINE RULES', 'fair play', 'Both players get the same ~100ms input delay. Ping shows in the top-right during a match.'],
          ['PAUSE', 'online', 'Either player can pause; resuming re-syncs both games. Leave from pause or the results screen.'],
          ['REMATCH', 'results', 'Both players must pick REMATCH. The lobby keeps your picks so you can switch fighters.'],
          ['DESYNC', 'rare', 'If a warning appears the games drifted apart (usually a connection hiccup) — leave and rematch.'],
        ];
        rows.forEach(([a, b, c], i) => {
          const y = 150 + i * 54;
          JK.text(ctx, a, 130, y, { size: 24, align: 'left', color: '#ff5a6a', spacing: 2 });
          JK.text(ctx, b, 340, y, { size: 20, align: 'left', color: '#ffd27a', font: JK.FONT_UI, weight: 'bold' });
          wrap(ctx, c, 760, y, 460, 20);
        });
        JK.text(ctx, 'The host picks the stage and starts the match; both players pick their own fighter and costume.', W / 2, H - 60, { size: 18, font: JK.FONT_UI, color: '#aaa' });
      } else drawMoveList(ctx, JK.CHAR_ORDER[howTab - 3]);
      hint(ctx, '← → switch page (' + (howTab + 1) + '/' + (JK.CHAR_ORDER.length + 3) + ') · ESC back');
    },
  };

  const OPTS = [
    ['MASTER VOLUME', 'master'], ['MUSIC VOLUME', 'music'], ['SFX VOLUME', 'sfx'],
    ['ANIME OST + VOICE CLIPS', 'ost'], ['ANNOUNCER VOICE', 'voice'], ['SCREEN SHAKE', 'shake'], ['SMOOTH MOTION', 'smooth'], ['PAINTED BACKGROUNDS', 'painted'], ['SHOW HITBOXES', 'hitboxes'], ['BACK', null],
  ];
  S.options = {
    update(inp) {
      if (inp.up) { M.sel = (M.sel + OPTS.length - 1) % OPTS.length; A.sfx('move'); }
      if (inp.down) { M.sel = (M.sel + 1) % OPTS.length; A.sfx('move'); }
      const key = OPTS[M.sel][1];
      if (key && typeof JK.settings[key] === 'number' && (inp.left || inp.right)) {
        JK.settings[key] = JK.clamp(Math.round((JK.settings[key] + (inp.right ? 0.1 : -0.1)) * 10) / 10, 0, 1);
        A.applyVolumes(); JK.saveSettings(); A.sfx('select');
      }
      if (inp.confirm || ((inp.left || inp.right) && key && typeof JK.settings[key] === 'boolean')) this.act(M.sel);
      if (inp.back) { A.sfx('back'); go('main', 5); }
    },
    act(i) {
      const key = OPTS[i][1];
      if (!key) { A.sfx('back'); go('main', 5); return; }
      if (typeof JK.settings[key] === 'boolean') { JK.settings[key] = !JK.settings[key]; JK.saveSettings(); A.sfx('confirm'); if (key === 'ost') A.applyVolumes(); }
    },
    draw(ctx, t) {
      bg(t, '#060810');
      title(ctx, 'OPTIONS', '設定');
      OPTS.forEach(([label, key], i) => {
        const y = 140 + i * 48;
        const on = M.sel === i;
        const hover = M.mouse.y > y - 22 && M.mouse.y < y + 22 && M.mouse.x > 260 && M.mouse.x < 1020;
        if (hover) M.sel = i;
        M.hits.push({ x: 260, y: y - 22, w: 760, h: 44, fn: () => {
          if (key && typeof JK.settings[key] === 'number') {
            const v = JK.clamp((M.mouse.x - 640) / 300, 0, 1);
            JK.settings[key] = Math.round(v * 10) / 10; A.applyVolumes(); JK.saveSettings(); A.sfx('select');
          } else this.act(i);
        } });
        if (on) { ctx.fillStyle = 'rgba(200,30,50,0.3)'; ctx.fillRect(260, y - 22, 760, 44); }
        JK.text(ctx, label, 290, y, { size: 30, align: 'left', color: on ? '#fff' : '#bbb', spacing: 2 });
        if (!key) return;
        const v = JK.settings[key];
        if (typeof v === 'number') {
          ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(640, y - 6, 300, 12);
          ctx.fillStyle = '#ff4060'; ctx.fillRect(640, y - 6, 300 * v, 12);
          JK.text(ctx, Math.round(v * 100) + '%', 990, y, { size: 24, color: '#fff', align: 'right', font: JK.FONT_UI });
        } else JK.text(ctx, v ? 'ON' : 'OFF', 790, y, { size: 30, color: v ? '#6fe07a' : '#ff5a5a' });
      });
      if (OPTS[M.sel][1] === 'smooth') JK.text(ctx, 'Smooth motion blends frames on 120/144 Hz screens and smooths slow-mo. Turn off for the lowest input delay.', W / 2, H - 102, { size: 17, font: JK.FONT_UI, color: '#ffd27a' });
      JK.text(ctx, 'Anime OST: menu & stage themes + domain, Hollow Purple and Fuga voice clips. OFF = original synth score.', W / 2, H - 78, { size: 17, font: JK.FONT_UI, color: '#aaa' });
      JK.text(ctx, 'More music: drop files into music/ (see PUT_YOUR_MUSIC_HERE.txt), e.g. unlimited_void.mp3 for a domain theme.', W / 2, H - 54, { size: 17, font: JK.FONT_UI, color: '#aaa' });
      hint(ctx, '↑↓ select · ← → adjust · ESC back');
    },
  };

  // --------------------------------------------------------------- frame
  M.update = function () {
    const inp = JK.Input.state.menu;
    M.t++;
    const s = S[M.screen];
    // mouse click dispatch (from last frame's hit regions)
    if (M.mouse.click) {
      for (const h of M.hits) {
        if (M.mouse.x > h.x && M.mouse.x < h.x + h.w && M.mouse.y > h.y && M.mouse.y < h.y + h.h) { h.fn(); break; }
      }
    }
    if (s) s.update(inp);
    M.mouse.click = false;
  };
  M.draw = function (ctx) {
    M.hits = [];
    const s = S[M.screen];
    if (s) s.draw(ctx, M.t);
  };
  return M;
})();
