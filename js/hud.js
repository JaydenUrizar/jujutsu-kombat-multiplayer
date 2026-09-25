'use strict';
// In-fight HUD.
JK.HUD = (function () {
  const W = JK.W;

  function skewRect(ctx, x, y, w, h, sk) {
    ctx.beginPath();
    ctx.moveTo(x + sk, y);
    ctx.lineTo(x + w + sk, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  function bar(ctx, x, y, w, h, frac, trail, color, flip) {
    ctx.save();
    if (flip) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
    // frame
    skewRect(ctx, x - 5, y - 5, w + 10, h + 10, 12);
    ctx.fillStyle = '#0b0608';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c9a24a';
    ctx.stroke();
    skewRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = '#240a10';
    ctx.fill();
    ctx.save();
    skewRect(ctx, x, y, w, h, 10);
    ctx.clip();
    // trail (recent damage), anchored at the inner edge
    const tw = w * JK.clamp(trail, 0, 1);
    ctx.fillStyle = '#e8303e';
    ctx.fillRect(x + w - tw, y, tw + 12, h);
    const fw = w * JK.clamp(frac, 0, 1);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const low = frac < 0.25;
    g.addColorStop(0, low ? '#ffb0a0' : JK.mix(color, '#ffffff', 0.45));
    g.addColorStop(0.5, low ? '#ff5a3a' : color);
    g.addColorStop(1, low ? '#a0201a' : JK.mix(color, '#000000', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(x + w - fw, y, fw + 12, h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y + 2, w + 12, h * 0.28);
    if (low && Math.floor(performance.now() / 180) % 2) { ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect(x, y, w + 12, h); }
    ctx.restore();
    ctx.restore();
  }

  function meter(ctx, x, y, f, flip, t) {
    const segW = 92, segH = 13, gap = 8;
    const full = f.meter >= 300;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const sx = flip ? x - (i + 1) * (segW + gap) : x + i * (segW + gap);
      skewRect(ctx, sx - 2, y - 2, segW + 4, segH + 4, 6);
      ctx.fillStyle = '#07050a'; ctx.fill();
      ctx.strokeStyle = 'rgba(200,170,90,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      const v = JK.clamp((f.meter - i * 100) / 100, 0, 1);
      if (v > 0) {
        ctx.save();
        skewRect(ctx, sx, y, segW, segH, 5);
        ctx.clip();
        ctx.fillStyle = v >= 1 ? f.ch.color : JK.mix(f.ch.color, '#000000', 0.45);
        if (flip) ctx.fillRect(sx + segW * (1 - v), y, segW * v + 6, segH);
        else ctx.fillRect(sx, y, segW * v + 6, segH);
        if (v >= 1) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx, y, segW + 6, 4); }
        ctx.restore();
        if (v >= 1) JK.drawGlow(ctx, f.ch.color, sx + segW / 2, y + segH / 2, 50, full ? 0.5 + Math.sin(t * 0.2) * 0.3 : 0.25);
      }
    }
    const lx = flip ? x - 3 * (segW + gap) : x;
    techSlots(ctx, x, y - 64, f, flip, t);
    JK.text(ctx, '呪力', flip ? x + 26 : x - 30, y + 7, { size: 20, font: JK.FONT_JP, color: '#ddd', stroke: '#000', strokeW: 4 });
    if (full) {
      const blink = 0.6 + Math.sin(t * 0.25) * 0.4;
      JK.text(ctx, (f.ch.domain.ult ? 'ULTIMATE' : 'DOMAIN') + ' READY  [Q]', lx + (3 * (segW + gap)) / 2, y - 16, { size: 22, color: f.ch.color, stroke: '#000', strokeW: 5, alpha: blink, spacing: 2 });
    }
    if (f.zoneT > 0) {
      const zx = flip ? x - 3 * (segW + gap) - 70 : x + 3 * (segW + gap) + 70;
      JK.text(ctx, '黒閃 ZONE', zx, y + 7, { size: 22, font: JK.FONT_JP, color: Math.floor(t / 6) % 2 ? '#ff2a3a' : '#ffffff', stroke: '#000', strokeW: 4 });
    }
    if (f.jpT > 0) {
      const blink = 0.75 + Math.sin(t * 0.3) * 0.25;
      JK.text(ctx, 'JACKPOT ' + Math.ceil(f.jpT / 60) + 's  ·  RCT ∞', lx + (3 * (segW + gap)) / 2, y - 16, { size: 22, color: '#2aff7a', stroke: '#000', strokeW: 5, alpha: blink, spacing: 2 });
    } else if (f.confiscT > 0) {
      JK.text(ctx, 'CONFISCATED ' + Math.ceil(f.confiscT / 60), lx + (3 * (segW + gap)) / 2, y - 16, { size: 20, color: '#c8b8ff', stroke: '#000', strokeW: 4 });
    } else if (f.execT > 0) {
      JK.text(ctx, 'EXECUTIONER\'S SWORD ' + Math.ceil(f.execT / 60) + '  [O]', lx + (3 * (segW + gap)) / 2, y - 16, { size: 20, color: '#ffe066', stroke: '#000', strokeW: 4 });
    } else if (f.burnout > 0) {
      JK.text(ctx, 'TECHNIQUE BURNOUT ' + Math.ceil(f.burnout / 60), lx + (3 * (segW + gap)) / 2, y - 16, { size: 20, color: '#aaa', stroke: '#000', strokeW: 4 });
    }
    ctx.restore();
  }

  // U / I / O technique slots with cooldown sweeps
  const SLOTS = [['t1', 'U'], ['t2', 'I'], ['t3', 'O']];
  function techSlots(ctx, x, y, f, flip, t) {
    const size = 32, gap = 8;
    SLOTS.forEach(([grp, key], i) => {
      const bx = flip ? x - (i + 1) * (size + gap) : x + i * (size + gap);
      const cd = (f.cd && f.cd[grp]) || 0;
      const max = (f.cdMax && f.cdMax[grp]) || 1;
      const needMeter = grp === 't3' && !(f.jpT > 0) && f.meter < ((f.moves.t3 && f.moves.t3.cost) || 100);
      const sealed = f.burnout > 0 || f.confiscT > 0;
      const sword = grp === 't3' && f.execT > 0;
      const ready = sword ? f.execCd <= 0 && !sealed : cd <= 0 && !sealed && !needMeter;
      const deny = f.cdDeny && f.cdDeny[grp] > 0;
      ctx.save();
      ctx.fillStyle = 'rgba(8,6,12,0.85)';
      ctx.beginPath(); JK.roundRect(ctx, bx, y, size, size, 6); ctx.fill();
      if (ready) JK.drawGlow(ctx, f.ch.color, bx + size / 2, y + size / 2, 26, 0.35);
      if (cd > 0) {
        // remaining cooldown drains from the top
        const k = Math.min(1, cd / max);
        ctx.save();
        ctx.beginPath(); JK.roundRect(ctx, bx, y, size, size, 6); ctx.clip();
        ctx.fillStyle = JK.rgba(f.ch.color, 0.28);
        ctx.fillRect(bx, y + size * k, size, size * (1 - k));
        ctx.restore();
      }
      ctx.lineWidth = deny ? 3 : 2;
      ctx.strokeStyle = deny ? (Math.floor(t / 3) % 2 ? '#ff3040' : '#ffffff') : ready ? f.ch.color : 'rgba(140,130,150,0.6)';
      ctx.beginPath(); JK.roundRect(ctx, bx, y, size, size, 6); ctx.stroke();
      ctx.restore();
      if (sword && !sealed) {
        JK.drawGlow(ctx, '#ffd21a', bx + size / 2, y + size / 2, 30, 0.45 + Math.sin(t * 0.2) * 0.2);
        JK.text(ctx, f.execCd > 0 ? (f.execCd / 60).toFixed(1) : '剣', bx + size / 2, y + size / 2 + 1, { size: f.execCd > 0 ? 16 : 20, font: f.execCd > 0 ? JK.FONT_UI : JK.FONT_JP, color: '#ffffff', stroke: '#000', strokeW: 3 });
      } else if (sealed) JK.text(ctx, '封', bx + size / 2, y + size / 2 + 1, { size: 20, font: JK.FONT_JP, color: '#b39cff', stroke: '#000', strokeW: 3 });
      else if (cd > 0) JK.text(ctx, (cd / 60).toFixed(cd < 60 ? 1 : 0), bx + size / 2, y + size / 2 + 1, { size: 16, font: JK.FONT_UI, color: '#ddd', stroke: '#000', strokeW: 3, weight: 'bold' });
      else JK.text(ctx, key, bx + size / 2, y + size / 2 + 1, { size: 20, color: needMeter ? '#666' : '#fff', stroke: '#000', strokeW: 3 });
    });
  }

  function draw(ctx, g) {
    const p1 = g.p1, p2 = g.p2;
    const t = g.frame;
    const BW = 470, BY = 34, BH = 26;
    // portraits
    for (const [f, x, flip] of [[p1, 52, false], [p2, W - 52, true]]) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, 50, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#10080c'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = f.ch.color; ctx.stroke();
      ctx.clip();
      JK.drawPortrait(ctx, f.ch, x, 56, 1.75, { flip, face: f.state === 'hitstun' || f.state === 'juggle' ? 'hurt' : 'normal', eyesOpen: f.eyesOpen });
      ctx.restore();
    }
    bar(ctx, 100, BY, BW, BH, p1.hp / p1.maxHp, g.hud.trail1 / p1.maxHp, p1.ch.color, false);
    bar(ctx, W - 100 - BW, BY, BW, BH, p2.hp / p2.maxHp, g.hud.trail2 / p2.maxHp, p2.ch.color, true);
    // names
    JK.text(ctx, p1.ch.name, 106, BY + BH + 20, { size: 24, align: 'left', color: '#fff', stroke: '#000', strokeW: 5, spacing: 2 });
    JK.text(ctx, p1.ch.jp, 106 + ctx.measureText ? 106 + 14 * p1.ch.name.length + 10 : 300, BY + BH + 21, { size: 17, align: 'left', font: JK.FONT_JP, color: '#c9a24a', stroke: '#000', strokeW: 4 });
    JK.text(ctx, p2.ch.name, W - 106, BY + BH + 20, { size: 24, align: 'right', color: '#fff', stroke: '#000', strokeW: 5, spacing: 2 });
    JK.text(ctx, p2.ch.jp, W - 106 - 14 * p2.ch.name.length - 10, BY + BH + 21, { size: 17, align: 'right', font: JK.FONT_JP, color: '#c9a24a', stroke: '#000', strokeW: 4 });
    // round wins
    for (let i = 0; i < (g.winsNeeded || 2); i++) {
      for (const [f, x] of [[p1, 540 - i * 26], [p2, W - 540 + i * 26]]) {
        const won = f.wins > i;
        ctx.beginPath(); ctx.arc(x, BY + BH + 20, 9, 0, Math.PI * 2);
        ctx.fillStyle = won ? '#c8202e' : 'rgba(0,0,0,0.6)'; ctx.fill();
        ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.stroke();
        if (won) JK.text(ctx, '勝', x, BY + BH + 21, { size: 12, font: JK.FONT_JP, color: '#fff' });
      }
    }
    // timer
    ctx.save();
    ctx.translate(W / 2, BY + 12);
    ctx.beginPath();
    ctx.moveTo(-42, -26); ctx.lineTo(42, -26); ctx.lineTo(52, 0); ctx.lineTo(42, 30); ctx.lineTo(-42, 30); ctx.lineTo(-52, 0); ctx.closePath();
    ctx.fillStyle = '#0b0608'; ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2.5; ctx.stroke();
    const secs = g.mode === 'training' ? '∞' : String(Math.max(0, Math.ceil(g.timer / 60)));
    JK.text(ctx, secs, 0, 3, { size: 50, color: g.timer < 600 && g.mode !== 'training' ? '#ff5050' : '#fff', stroke: '#000', strokeW: 4 });
    ctx.restore();
    const diff = g.mode === 'training' ? 'TRAINING' : g.mode === 'survival' ? 'SURVIVAL · ' + (g.opts.difficulty || '').toUpperCase() : (g.opts.difficulty || '').toUpperCase();
    JK.text(ctx, diff, W / 2, BY + 58, { size: 16, color: '#c9a24a', stroke: '#000', strokeW: 3, spacing: 3 });
    // meters
    meter(ctx, 60, JK.H - 40, p1, false, t);
    meter(ctx, W - 60, JK.H - 40, p2, true, t);
    // combo counter
    const c = g.hud.combo;
    if (c && c.hits >= 2) {
      const a = c.t > 60 ? 1 - (c.t - 60) / 30 : 1;
      const cx0 = g.mode === 'training' ? 300 : 120;
      const x = c.who === 1 ? cx0 : W - cx0;
      const sc = 1 + Math.max(0, 1 - c.t / 6) * 0.4;
      ctx.save();
      ctx.translate(x, 230);
      ctx.scale(sc, sc);
      JK.text(ctx, c.hits + '', 0, 0, { size: 84, color: '#ffd040', stroke: '#000', strokeW: 8, alpha: a });
      ctx.restore();
      JK.text(ctx, 'HIT COMBO', x, 282, { size: 26, color: '#fff', stroke: '#000', strokeW: 5, alpha: a, spacing: 3 });
      JK.text(ctx, Math.round(c.dmg / JK.MAX_HP * 100) + '% DMG', x, 310, { size: 20, color: '#ff8080', stroke: '#000', strokeW: 4, alpha: a });
    }
    // Black Flash timing prompt (player Yuji)
    if (p1.id === 'yuji' && p1.state === 'move' && p1.move && p1.move.id === 't2') {
      const m = p1.mt;
      if (m >= 8 && m <= 18) {
        const now = m >= 11 && m <= 17;
        JK.text(ctx, now ? '黒閃 NOW! [I]' : 'READY...', W / 2, 150, { size: now ? 48 : 30, color: now ? '#ff2a3a' : '#999', stroke: '#000', strokeW: 6, font: now ? JK.FONT_JP : JK.FONT_TITLE });
      }
    }
    // Nanami's 7:3 timing prompt
    if (p1.id === 'nanami' && p1.state === 'move' && p1.move && p1.move.id === 't1' && p1.ratio) {
      const r = p1.ratio, near = Math.abs(r.pos - 0.7) <= r.win;
      JK.text(ctx, near ? '7:3  NOW! [U]' : 'STRIKE AT 7:3  [U]', W / 2, 150, { size: near ? 46 : 30, color: near ? '#ffcf80' : '#aaa', stroke: '#000', strokeW: 6 });
    }
    // Breaker prompt while the player is being comboed with 2 bars stocked
    if ((p1.state === 'hitstun' || p1.state === 'juggle') && p1.comboTaken >= 2 && p1.meter >= 200 && g.fighting) {
      JK.text(ctx, 'BREAKER!  → + SPACE', 250, JK.H - 110, { size: 30, color: Math.floor(t / 5) % 2 ? '#ffffff' : p1.ch.color, stroke: '#000', strokeW: 6 });
    }
    if (g.finishPhase && g.finishPhase.winner === p1 && g.finishPhase.t > 30) {
      const blink = Math.floor(g.frame / 8) % 2;
      JK.text(ctx, 'GET CLOSE AND PRESS  Q  FOR YOUR FINISHER', W / 2, JK.H - 110, { size: 34, color: blink ? '#ff3040' : '#ffd27a', stroke: '#000', strokeW: 6, spacing: 2 });
      JK.text(ctx, '(or strike them to end it)', W / 2, JK.H - 78, { size: 20, font: JK.FONT_UI, color: '#ddd', stroke: '#000', strokeW: 4 });
    }
    // controls reminder at the start of the first round
    if (g.round === 1 && g.phase === 'fight' && g.timer > 99 * 60 - 420 && g.mode !== 'training' && !g.domain) {
      const a = Math.min(1, (g.timer - (99 * 60 - 420)) / 60);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(W / 2 - 400, 128, 800, 58);
      JK.text(ctx, 'J K L attack · U I O techniques · SPACE block · SHIFT dash · H throw · Q domain · ESC moves', W / 2, 146, { size: 19, font: JK.FONT_UI, color: '#f0e6d8', weight: 'bold' });
      JK.text(ctx, 'E during a special = AMPLIFY  ·  → + SPACE while comboed = BREAKER  ·  Just Guard then K = counter', W / 2, 170, { size: 16, font: JK.FONT_UI, color: '#ffd27a', weight: 'bold' });
      ctx.restore();
    }
    if (g.mode === 'training') {
      JK.text(ctx, 'TRAINING · TAB dummy: ' + JK.DUMMY_MODES[p2.ctrl.dummyMode || 0] + ' · R reset · C cooldowns ' + (g.noCd ? 'OFF' : 'ON') + ' · ESC menu', W / 2, JK.H - 18, { size: 18, color: '#ccc', stroke: '#000', strokeW: 3, font: JK.FONT_UI });
      trainingPanel(ctx, g);
    }
  }

  const ARROWS = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '•', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
  const BTN = { light: 'L', heavy: 'H', kick: 'K', t1: 'U', t2: 'I', t3: 'O', block: 'BLK', dash: 'DSH', throw: 'THR', domain: 'Q', amp: 'AMP' };
  const BTN_COL = { light: '#ffd27a', heavy: '#ff7a5a', kick: '#8fe07a', t1: '#7ab8ff', t2: '#b88fff', t3: '#ff6ad0', block: '#cccccc', dash: '#9fe8ff', throw: '#ffffff', domain: '#ff3050', amp: '#ffffff' };
  function trainingPanel(ctx, g) {
    const T = g.train;
    if (!T) return;
    // input history, newest on top
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(14, 180, 150, 14 * 26 + 10);
    T.inputs.forEach((e, i) => {
      const y = 198 + i * 26;
      const a = 1 - i / 16;
      JK.text(ctx, String(Math.min(99, e.n)), 44, y, { size: 16, align: 'right', font: JK.FONT_UI, color: '#888', alpha: a });
      JK.text(ctx, ARROWS[e.dir], 64, y, { size: 22, font: 'sans-serif', color: e.dir === 5 ? '#666' : '#fff', alpha: a });
      let x = 84;
      for (const b of e.btns) {
        JK.text(ctx, BTN[b], x, y, { size: 17, align: 'left', font: JK.FONT_UI, color: BTN_COL[b], alpha: a, weight: 'bold' });
        x += BTN[b].length * 10 + 8;
      }
    });
    // readouts
    const x0 = W - 250, y0 = 180;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x0, y0, 236, 114);
    const row = (label, val, i, col = '#fff') => {
      JK.text(ctx, label, x0 + 12, y0 + 20 + i * 25, { size: 17, align: 'left', font: JK.FONT_UI, color: '#aaa', weight: 'bold' });
      JK.text(ctx, val, x0 + 224, y0 + 20 + i * 25, { size: 20, align: 'right', font: JK.FONT_UI, color: col, weight: 'bold' });
    };
    const adv = T.adv;
    const advStr = !adv ? '—' : adv.v === 'KD' ? 'KNOCKDOWN' : (adv.v > 0 ? '+' : '') + adv.v + (adv.block ? ' (blk)' : '');
    const advCol = !adv || adv.v === 'KD' ? '#fff' : adv.v > 0 ? '#6fe07a' : adv.v < 0 ? '#ff6a6a' : '#fff';
    row('HIT DAMAGE', (T.lastDmg / JK.MAX_HP * 100).toFixed(1) + '%', 0);
    row('BEST COMBO', T.maxCombo + ' hits', 1);
    row('BEST COMBO DMG', (T.maxDmg / JK.MAX_HP * 100).toFixed(1) + '%', 2);
    row('FRAME ADV', advStr, 3, advCol);
  }

  return { draw, bar, skewRect };
})();
