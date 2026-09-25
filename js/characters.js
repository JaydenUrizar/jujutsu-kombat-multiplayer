'use strict';
// Character looks: palettes, outfits, heads. Move sets live in moves.js.
(function () {
  const R = JK.Rig;
  const D = JK.DEG;

  function palette(p) {
    const back = {};
    for (const k in p) back[k] = typeof p[k] === 'string' && p[k][0] === '#' ? JK.mix(p[k], '#000000', 0.28) : p[k];
    p.back = back;
    return p;
  }
  JK.makeGhostPalette = function (color) {
    const g = {};
    ['skin', 'skinS', 'hair', 'hairS', 'top', 'topS', 'pants', 'pantsS', 'shoe', 'sole', 'hand', 'cuff', 'obi', 'hood', 'hoodS', 'under', 'blindfold', 'topTrim', 'button', 'tattoo', 'shoe2', 'collar', 'rock', 'rockS', 'lava', 'obiTrim', 'nail', 'eye', 'shirt', 'tie', 'tieS', 'badge', 'wood', 'woodS', 'metal', 'blade', 'bladeS', 'wrap', 'wrapS', 'goggle', 'stubble', 'chain', 'grip', 'tsuba', 'ring'].forEach((k) => (g[k] = color));
    g.back = g;
    return g;
  };
  JK.makeFlashPalette = function (color) {
    const g = JK.makeGhostPalette(color);
    return g;
  };

  // ---------- shared outfit pieces ----------
  function jacketTorso(ctx, J, pal, fx, opt) {
    // coat/jacket skirt in character space (hangs with gravity + cloth sway)
    const hx = J.hip.x, hy = J.hip.y;
    const len = opt.skirt || 14;
    const sway = (fx.cloth || 0);
    if (!R.ghost || true) {
      const spread = Math.min(26, Math.abs(J.knF.x - J.knB.x) * 0.35);
      R.poly(ctx, [
        [hx - 15, hy - 6],
        [hx + 15, hy - 6],
        [hx + 17 + spread * 0.6, hy + len],
        [hx - 2, hy + len + 3],
        [hx - 19 - spread * 0.4 - sway, hy + len - 2],
      ], pal.topS);
    }
    R.withTorso(ctx, J, () => {
      R.torsoPath(ctx);
      R.finish(ctx, pal.top);
      if (!R.ghost) {
        // shading on back side
        ctx.save();
        R.torsoPath(ctx);
        ctx.clip();
        ctx.fillStyle = pal.topS;
        ctx.beginPath();
        ctx.moveTo(-22, -80); ctx.quadraticCurveTo(-6, -40, -18, 8); ctx.lineTo(-30, 8); ctx.lineTo(-30, -80);
        ctx.fill();
        // rim light
        ctx.strokeStyle = JK.rgba(fx.rim || '#9fb4ff', 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(17, -64); ctx.quadraticCurveTo(22, -40, 13, -18); ctx.stroke();
        ctx.restore();
        // front seam + buttons
        ctx.strokeStyle = pal.topS; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(11, -68); ctx.quadraticCurveTo(15, -40, 11, 4); ctx.stroke();
        ctx.fillStyle = pal.button || '#d9b347';
        [-58].forEach((y) => {
          ctx.beginPath(); ctx.arc(13.5, y, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#6b5018'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(13.5, y, 1.6, 0, Math.PI * 1.5); ctx.stroke();
        });
      }
      // collar
      if (opt.collar) {
        R.poly(ctx, [[-13, -68], [-11, -84], [3, -88], [14, -83], [16, -67], [2, -73]], pal.collar || pal.top);
        if (!R.ghost) {
          ctx.fillStyle = pal.button || '#d9b347';
          ctx.beginPath(); ctx.arc(13, -76, 2.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    });
  }

  function kimonoTorso(ctx, J, pal, fx) {
    const hx = J.hip.x, hy = J.hip.y;
    const sway = fx.cloth || 0;
    const spread = Math.min(34, Math.abs(J.knF.x - J.knB.x) * 0.5);
    // hakama top (covers thighs), drawn before the front leg
    R.poly(ctx, [
      [hx - 19, hy - 10], [hx + 19, hy - 10],
      [hx + 24 + spread * 0.5, hy + 40],
      [hx - 26 - spread * 0.5 - sway * 0.8, hy + 40],
    ], pal.pants);
    if (!R.ghost) {
      ctx.strokeStyle = pal.pantsS; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy - 4); ctx.lineTo(hx + 8 + spread * 0.2, hy + 38);
      ctx.moveTo(hx - 8, hy - 4); ctx.lineTo(hx - 12 - spread * 0.2, hy + 38);
      ctx.stroke();
    }
    R.withTorso(ctx, J, () => {
      R.torsoPath(ctx, 1.08);
      R.finish(ctx, pal.top);
      if (!R.ghost) {
        ctx.save();
        R.torsoPath(ctx, 1.08);
        ctx.clip();
        ctx.fillStyle = pal.topS;
        ctx.beginPath(); ctx.moveTo(-24, -80); ctx.quadraticCurveTo(-8, -40, -20, 8); ctx.lineTo(-30, 8); ctx.lineTo(-30, -80); ctx.fill();
        // open V neckline showing chest + tattoos
        ctx.fillStyle = pal.skin;
        ctx.beginPath(); ctx.moveTo(-3, -74); ctx.lineTo(17, -70); ctx.lineTo(9, -34); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = pal.tattoo; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(6, -62); ctx.quadraticCurveTo(12, -58, 15, -62); ctx.moveTo(7, -52); ctx.quadraticCurveTo(11, -49, 13, -53); ctx.stroke();
        // collar trims
        ctx.strokeStyle = pal.topTrim; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-3, -74); ctx.lineTo(9, -34); ctx.moveTo(17, -70); ctx.lineTo(9, -34); ctx.stroke();
        ctx.restore();
        // obi sash
        ctx.fillStyle = pal.obi;
        ctx.beginPath(); ctx.moveTo(-17, -28); ctx.lineTo(16, -28); ctx.lineTo(17, -12); ctx.lineTo(-17, -12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = R.OUT; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = JK.rgba(pal.obiTrim || '#8b1b24', 1);
        ctx.fillRect(-17, -21, 34, 2.5);
      }
    });
    // tie tails at the back of the obi, fluttering
    if (!R.ghost) {
      const bx = hx - 16, by = hy - 18;
      R.poly(ctx, [[bx, by], [bx - 16 - sway, by + 22], [bx - 8 - sway * 0.6, by + 26], [bx + 2, by + 4]], pal.obi);
    }
  }

  // ---------- heads ----------
  const HAIR = {
    gojoUp: [[13, -10], [19, -17], [10, -17], [15, -33], [5, -23], [4, -44], [-2, -25], [-9, -41], [-9, -22], [-21, -33], [-14, -15], [-27, -19], [-17, -7], [-25, -3], [-16, 2], [-11, -4], [-2, -11], [8, -11]],
    gojoDown: [[-16, 4], [-22, -2], [-17, -8], [-24, -14], [-15, -17], [-17, -27], [-6, -22], [-2, -31], [3, -21], [11, -27], [10, -17], [20, -14], [13, -10], [18, -2], [10, -7], [8, 1], [4, -9], [-6, -8], [-12, 0]],
    sukuna: [[13, -9], [18, -17], [8, -17], [7, -29], [-1, -19], [-7, -31], [-9, -19], [-19, -27], [-14, -14], [-25, -15], [-16, -7], [-23, -3], [-15, 0], [-8, -7], [2, -11]],
    yuji: [[13, -9], [17, -19], [8, -16], [9, -29], [1, -18], [-3, -30], [-6, -18], [-14, -27], [-12, -15], [-21, -19], [-15, -9], [-8, -8], [3, -11]],
    megumi: [[14, -6], [20, -12], [12, -14], [18, -27], [6, -20], [7, -37], [-1, -22], [-8, -37], [-8, -21], [-20, -31], [-14, -15], [-28, -20], [-17, -7], [-27, -3], [-16, 1], [-22, 9], [-11, 4], [-4, -6], [4, -12]],
  };
  const UNDERCUT = [[-4, -10], [-15, -9], [-17, 3], [-9, 9], [-6, 1]];

  function gojoHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      if (fx.glasses && !fx.eyesOpen) {
        // round black sunglasses, hair falling loose
        R.hair(ctx, HAIR.gojoDown, pal.hair, sway, pal.hairS);
        if (!R.ghost) {
          ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(3, -3); ctx.stroke();
          ctx.fillStyle = '#07070b';
          ctx.beginPath(); ctx.arc(9, -2.5, 5.6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = 'rgba(160,210,255,0.35)';
          ctx.beginPath(); ctx.ellipse(7.5, -4.5, 1.8, 1.1, -0.5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (fx.eyesOpen) {
        R.hair(ctx, HAIR.gojoDown, pal.hair, sway, pal.hairS);
        R.eye(ctx, 8, -2, pal.eye, { glow: pal.eye, w: 8.5, h: 6 });
        R.brow(ctx, 8, -9, fx.face === 'angry' ? 2 : 0, pal.hairS);
        if (!R.ghost) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(11.5, -5); ctx.lineTo(14.5, -7.5); ctx.stroke();
        }
      } else {
        R.hair(ctx, HAIR.gojoUp, pal.hair, sway, pal.hairS);
        // blindfold wraps the head, knot tails trail behind
        R.poly(ctx, [[-16, -10], [15.5, -10], [16.5, -2], [-16, -1]], pal.blindfold);
        if (!R.ghost) {
          const s2 = fx.cloth || 0;
          ctx.fillStyle = pal.blindfold;
          ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(-28 - s2 * 0.4, -13); ctx.lineTo(-25 - s2 * 0.4, -5); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-26 - s2 * 0.5, 2); ctx.lineTo(-21 - s2 * 0.5, 4); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-10, -7.5); ctx.lineTo(15, -7.5); ctx.stroke();
        }
      }
      R.mouth(ctx, 10, 10, fx.face === 'hurt' ? 'hurt' : fx.face === 'shout' ? 'open' : 'grin');
    });
  }

  function sukunaHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      R.poly(ctx, UNDERCUT, pal.under);
      R.hair(ctx, HAIR.sukuna, pal.hair, sway, pal.hairS);
      if (!R.ghost) {
        // face markings: stripes under the eyes + brow marks
        ctx.strokeStyle = pal.tattoo; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(4, 3.5); ctx.lineTo(13.5, 4.5);
        ctx.moveTo(4, 7.5); ctx.lineTo(12, 8.5);
        ctx.moveTo(7, -12); ctx.quadraticCurveTo(10.5, -14.5, 14, -12);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      const angry = fx.face === 'hurt' ? 0 : 2.5;
      R.eye(ctx, 8.5, -3, pal.eye, { angry, w: 7.5, h: 4.5, glow: fx.glowEyes ? pal.eye : null });
      if (!R.ghost) {
        // lower pair of eyes
        ctx.fillStyle = pal.eye;
        ctx.beginPath(); ctx.moveTo(6.5, 5.8); ctx.quadraticCurveTo(10, 4.4, 13, 5.6); ctx.quadraticCurveTo(10, 6.8, 6.5, 5.8); ctx.fill();
      }
      R.brow(ctx, 8, -9, 3, pal.hairS);
      R.mouth(ctx, 10, 11, fx.face === 'hurt' ? 'hurt' : fx.face === 'shout' ? 'open' : 'grin');
    });
  }

  function yujiHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      R.poly(ctx, UNDERCUT, pal.under);
      R.hair(ctx, HAIR.yuji, pal.hair, sway, pal.hairS);
      if (!R.ghost) {
        ctx.strokeStyle = JK.rgba('#7a3a3a', 0.55); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(12, 4.5); ctx.stroke();
      }
      const face = fx.face;
      if (face === 'hurt') R.eye(ctx, 8, -2, pal.eye, { closed: true });
      else R.eye(ctx, 8, -2, pal.eye, { angry: face === 'angry' || face === 'shout' ? 2 : 0.8, w: 7.5, h: 5.5, glow: fx.glowEyes ? '#ff2a2a' : null });
      R.brow(ctx, 8, -9, face === 'angry' || face === 'shout' ? 2.5 : 1, pal.hairS);
      R.mouth(ctx, 10, 10, face === 'hurt' ? 'hurt' : face === 'shout' ? 'open' : 'line');
    });
  }

  function megumiHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      R.hair(ctx, HAIR.megumi, pal.hair, sway, pal.hairS);
      R.poly(ctx, [[12, -12], [17, -3], [10, -7], [9, 0], [5, -9]], pal.hair);
      const face = fx.face;
      if (face === 'hurt') R.eye(ctx, 8, -2, pal.eye, { closed: true });
      else R.eye(ctx, 8, -2, pal.eye, { angry: 1.8, w: 7, h: 4.5 });
      R.brow(ctx, 8, -9, 2, pal.hairS);
      R.mouth(ctx, 10, 10, face === 'hurt' ? 'hurt' : face === 'shout' ? 'open' : 'line');
    });
  }

  function jogoHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      R.headBase(ctx, pal);
      // volcano crown
      R.poly(ctx, [[-17, -4], [-16, -16], [-12, -29], [11, -31], [16, -17], [17, -4], [4, -11]], pal.rock);
      if (!R.ghost) {
        ctx.fillStyle = pal.rockS;
        ctx.beginPath(); ctx.moveTo(-17, -4); ctx.lineTo(-16, -16); ctx.lineTo(-12, -29); ctx.lineTo(-5, -30); ctx.lineTo(-8, -9); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(20,10,8,0.6)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(2, -30); ctx.lineTo(0, -22); ctx.lineTo(4, -15); ctx.moveTo(12, -24); ctx.lineTo(9, -17); ctx.stroke();
        // crater with lava
        ctx.fillStyle = '#1a0806';
        ctx.beginPath(); ctx.ellipse(-0.5, -30, 11.5, 3.4, -0.05, 0, Math.PI * 2); ctx.fill();
        const heat = fx.glowEyes ? 1 : 0.55;
        ctx.fillStyle = JK.rgba(pal.lava, 0.9);
        ctx.beginPath(); ctx.ellipse(-0.5, -30.4, 8, 1.9, -0.05, 0, Math.PI * 2); ctx.fill();
        JK.drawGlow(ctx, pal.lava, 0, -32, 16 + heat * 10, 0.5 * heat);
        // single great eye + black tear marks
        ctx.fillStyle = '#fbf6e8';
        ctx.beginPath(); ctx.ellipse(8, -4, 6.2, 5.2, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = R.OUT; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.fillStyle = '#120806';
        ctx.beginPath(); ctx.arc(10, -4, 1.9, 0, Math.PI * 2); ctx.fill();
        if (fx.glowEyes) JK.drawGlow(ctx, '#ff7a1a', 10, -4, 9, 0.6);
        ctx.strokeStyle = pal.tattoo; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(6, 1.5); ctx.lineTo(5, 8); ctx.moveTo(10, 1.5); ctx.lineTo(10.5, 7); ctx.stroke();
        // jagged grin
        const hurt = fx.face === 'hurt';
        ctx.fillStyle = '#2a0c08';
        ctx.beginPath(); ctx.moveTo(4, 10); ctx.quadraticCurveTo(10, hurt ? 12 : 14, 15, 9); ctx.lineTo(14.5, 11.5); ctx.quadraticCurveTo(10, 15.5, 4.5, 11.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4ecd8';
        for (let i = 0; i < 4; i++) { const x = 5.5 + i * 2.4; ctx.beginPath(); ctx.moveTo(x, 10.3 + i * 0.3); ctx.lineTo(x + 1.2, 12.6); ctx.lineTo(x + 2.4, 10.3 + i * 0.3); ctx.fill(); }
      }
    });
  }

  // Business suit: jacket + open lapels over a shirt and tie (Higuruma, Nanami).
  function suitTorso(ctx, J, pal, fx, opt = {}) {
    jacketTorso(ctx, J, pal, fx, { skirt: opt.skirt || 26, collar: false });
    if (R.ghost) return;
    R.withTorso(ctx, J, () => {
      // shirt V between the lapels
      // (kept toward the chest's front edge so it shows past the arm in profile)
      ctx.save();
      ctx.translate(4, 0);
      ctx.fillStyle = pal.shirt;
      ctx.beginPath(); ctx.moveTo(-2, -75); ctx.lineTo(15, -71); ctx.lineTo(11, -30); ctx.closePath(); ctx.fill();
      // tie (loosened when fx.loose)
      const loose = fx.loose ? 1 : 0;
      ctx.fillStyle = pal.tie;
      ctx.beginPath();
      ctx.moveTo(6 + loose * 2, -71 + loose * 6); ctx.lineTo(11 + loose * 2, -71 + loose * 6); ctx.lineTo(10.5, -63 + loose * 6);
      ctx.lineTo(12.5, -36 + loose * 4); ctx.lineTo(9, -31 + loose * 4); ctx.lineTo(6.5, -36 + loose * 4); ctx.lineTo(8, -63 + loose * 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = R.OUT; ctx.lineWidth = 1.2; ctx.stroke();
      if (pal.tieS) {
        // patterned tie (Nanami's leopard print)
        ctx.fillStyle = pal.tieS;
        for (const [x, y] of [[9, -58], [10.5, -50], [8.5, -44], [10.5, -39], [9.5, -34]]) { ctx.beginPath(); ctx.arc(x, y + loose * 5, 1.2, 0, Math.PI * 2); ctx.fill(); }
      }
      // lapels
      ctx.fillStyle = pal.topS;
      ctx.beginPath(); ctx.moveTo(-2, -75); ctx.lineTo(3, -74); ctx.lineTo(9, -46); ctx.lineTo(10, -36); ctx.lineTo(4, -52); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, -70); ctx.lineTo(13, -70); ctx.lineTo(10.5, -44); ctx.lineTo(10, -36); ctx.lineTo(15, -54); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = R.OUT; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2, -75); ctx.lineTo(10, -36); ctx.lineTo(16, -70); ctx.stroke();
      if (pal.badge) {
        // lawyer's badge (sunflower + scales) on the lapel
        ctx.fillStyle = pal.badge;
        ctx.beginPath(); ctx.arc(3, -57, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6b5018'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      ctx.restore();
    });
  }

  const HAIR2 = {
    higuruma: [[14, -7], [16, -14], [10, -19], [5, -24], [-3, -23], [-9, -26], [-14, -20], [-20, -17], [-18, -9], [-21, -3], [-15, 2], [-12, -6], [-4, -11], [3, -9], [8, -12], [11, -5]],
    nanami: [[16, -6], [17, -13], [12, -20], [3, -24], [-6, -23], [-14, -20], [-19, -13], [-21, -4], [-17, 3], [-14, -6], [-9, -13], [-2, -16], [6, -15], [11, -11], [14, -4]],
  };

  function higurumaHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      if (!R.ghost) {
        // five o'clock shadow along the jaw
        ctx.fillStyle = JK.rgba(pal.stubble || '#3a3038', 0.35);
        ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(4, 15); ctx.lineTo(9.5, 15); ctx.lineTo(14, 10); ctx.lineTo(13, 7); ctx.lineTo(8, 12); ctx.lineTo(2, 10); ctx.closePath(); ctx.fill();
      }
      R.hair(ctx, HAIR2.higuruma, pal.hair, sway, pal.hairS);
      const face = fx.face;
      if (face === 'hurt') R.eye(ctx, 8, -2, pal.eye, { closed: true });
      else R.eye(ctx, 8, -2, pal.eye, { angry: 1.4, w: 7, h: 4.2, glow: fx.glowEyes ? '#e8c860' : null });
      if (!R.ghost) {
        // tired bags under the eyes
        ctx.strokeStyle = JK.rgba('#5a3a3a', 0.5); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(4.5, 2); ctx.quadraticCurveTo(8, 3.8, 12, 1.6); ctx.stroke();
      }
      R.brow(ctx, 8, -9, 2.2, pal.hairS);
      R.mouth(ctx, 10, 10, face === 'hurt' ? 'hurt' : face === 'shout' ? 'open' : 'line');
    });
  }

  function nanamiHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      R.hair(ctx, HAIR2.nanami, pal.hair, sway * 0.4, pal.hairS);
      if (!R.ghost) {
        // the 7:3 part
        ctx.strokeStyle = pal.hairS; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-4, -23); ctx.quadraticCurveTo(-3, -18, 0, -15.5); ctx.stroke();
        // goggles: dark lens + frame to the ear
        ctx.strokeStyle = '#1a1a1e'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(3, -3); ctx.stroke();
        ctx.fillStyle = pal.goggle || '#141418';
        ctx.beginPath(); JK.roundRect(ctx, 3, -7, 12, 8, 3); ctx.fill();
        ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = fx.glowEyes ? 'rgba(255,190,90,0.7)' : 'rgba(200,220,255,0.3)';
        ctx.beginPath(); ctx.ellipse(7, -5, 2.4, 1.2, -0.3, 0, Math.PI * 2); ctx.fill();
        if (fx.glowEyes) JK.drawGlow(ctx, '#ffb347', 9, -3, 12, 0.5);
      }
      R.brow(ctx, 8, -10, 2, pal.hairS);
      const face = fx.face;
      R.mouth(ctx, 10, 10, face === 'hurt' ? 'hurt' : face === 'shout' ? 'open' : 'line');
    });
  }

  // Weapons are drawn along +x from the gripping fist, scaled by ws.
  function drawGavel(ctx, ws, pal, fx) {
    if (fx.noWeapon) return;
    if (fx.sword) { drawExecSword(ctx, ws, pal, fx); return; }
    ctx.scale(ws, ws);
    R.poly(ctx, [[-8, -2.6], [34, -2.6], [34, 2.6], [-8, 2.6]], pal.wood);
    R.poly(ctx, [[30, -13], [46, -13], [46, 13], [30, 13]], pal.wood);
    if (!R.ghost) {
      ctx.fillStyle = pal.metal;
      ctx.fillRect(30, -13, 3.5, 26); ctx.fillRect(42.5, -13, 3.5, 26);
      ctx.fillStyle = pal.woodS;
      ctx.fillRect(34, -13, 8, 5);
      if (ws > 1.3) JK.drawGlow(ctx, '#b9a0ff', 38, 0, 30, 0.25 * Math.min(1, ws - 1.3));
    }
  }
  // The Executioner's Sword: a blade of glowing yellow light.
  function drawExecSword(ctx, ws, pal, fx) {
    ctx.scale(ws, ws);
    const pulse = 0.85 + Math.sin((fx.t || 0) * 0.25) * 0.15;
    if (!R.ghost) {
      for (let i = 0; i <= 4; i++) JK.drawGlow(ctx, '#ffd21a', 14 + i * 28, 0, 46, 0.34 * pulse);
      JK.drawGlow(ctx, '#fff4a0', 134, 0, 40, 0.5 * pulse);
    }
    // hilt + guard in dark gold
    R.poly(ctx, [[-16, -3.2], [4, -3.2], [4, 3.2], [-16, 3.2]], '#5a3a08');
    R.poly(ctx, [[1, -14], [8, -11], [8, 11], [1, 14]], '#c8900a');
    R.circle(ctx, -18, 0, 4.2, '#ffd21a');
    // the blade: bright yellow with a white-hot core
    ctx.beginPath();
    ctx.moveTo(8, -7); ctx.lineTo(118, -6); ctx.lineTo(140, 0); ctx.lineTo(118, 6); ctx.lineTo(8, 7); ctx.closePath();
    if (R.ghost) { ctx.fillStyle = pal.blade || '#ffd21a'; ctx.fill(); return; }
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a5a00'; ctx.stroke();
    const g = ctx.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, '#ffb800'); g.addColorStop(0.35, '#ffe24a'); g.addColorStop(0.5, '#fffbe0'); g.addColorStop(0.65, '#ffe24a'); g.addColorStop(1, '#ffb800');
    ctx.fillStyle = g; ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,255,230,${0.8 * pulse})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(132, 0); ctx.stroke();
    ctx.restore();
  }
  function drawNanamiBlade(ctx, ws, pal, fx) {
    if (fx.noWeapon) return;
    ctx.scale(ws, ws);
    // grip, then a thick blunt blade wrapped in patterned cloth
    R.poly(ctx, [[-10, -3], [2, -3], [2, 3], [-10, 3]], pal.wrapS);
    R.poly(ctx, [[2, -7.5], [96, -7.5], [100, -3], [100, 7.5], [2, 7.5]], pal.blade);
    if (!R.ghost) {
      ctx.fillStyle = pal.bladeS;
      ctx.fillRect(4, 3, 94, 4.5);
      // cloth wrapping with dot pattern over most of the blade
      ctx.fillStyle = pal.wrap;
      ctx.fillRect(2, -8, 64, 16);
      ctx.strokeStyle = R.OUT; ctx.lineWidth = 1.5; ctx.strokeRect(2, -8, 64, 16);
      ctx.fillStyle = pal.wrapS;
      for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(7 + i * 9 + j * 4, -3.5 + j * 7, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = JK.rgba(pal.wrapS, 0.8); ctx.lineWidth = 1;
      for (let x = 12; x < 66; x += 12) { ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x - 5, 8); ctx.stroke(); }
      if (fx.glowEyes) JK.drawGlow(ctx, '#ffb347', 80, 0, 40, 0.35);
    }
  }

  // ---------- Hakari ----------
  HAIR2.hakari = [[15, -8], [21, -17], [13, -19], [19, -29], [7, -25], [3, -34], [-5, -27], [-12, -32], [-14, -23], [-23, -24], [-19, -14], [-24, -8], [-17, -5], [-12, -11], [-4, -14], [4, -13], [10, -11]];
  function hakariHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      // short shaved sides under a swept-up crest
      if (!R.ghost) { ctx.fillStyle = JK.rgba(pal.under, 0.55); ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(-15, -9); ctx.lineTo(-15, 0); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); }
      R.hair(ctx, HAIR2.hakari, pal.hair, sway * 0.5, pal.hairS);
      const face = fx.face;
      const jp = fx.jackpot;
      if (face === 'hurt') R.eye(ctx, 8, -2, pal.eye, { closed: true });
      else R.eye(ctx, 8, -2, jp ? '#2aff7a' : pal.eye, { angry: 1.6, w: 7.2, h: 4.4, glow: jp || fx.glowEyes ? '#2aff7a' : null });
      R.brow(ctx, 8, -9, 2.4, pal.hairS);
      R.mouth(ctx, 10, 10, face === 'hurt' ? 'hurt' : face === 'shout' ? 'open' : 'grin');
    });
  }
  // open high-collar jacket over a shirt, gold chain
  function hakariTorso(ctx, J, pal, fx) {
    jacketTorso(ctx, J, pal, fx, { skirt: 22, collar: true });
    if (R.ghost) return;
    R.withTorso(ctx, J, () => {
      ctx.save();
      ctx.translate(4, 0);
      ctx.fillStyle = pal.shirt;
      ctx.beginPath(); ctx.moveTo(-1, -72); ctx.lineTo(14, -69); ctx.lineTo(11, -26); ctx.lineTo(5, -26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = R.OUT; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-1, -72); ctx.lineTo(5, -26); ctx.moveTo(14, -69); ctx.lineTo(11, -26); ctx.stroke();
      ctx.strokeStyle = pal.chain; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(1, -70); ctx.quadraticCurveTo(7, -56, 13, -68); ctx.stroke();
      ctx.fillStyle = pal.chain; ctx.beginPath(); ctx.arc(7, -58, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  // ---------- Yuta ----------
  HAIR2.yuta = [[15, -3], [17, -11], [12, -10], [14, -18], [7, -15], [6, -24], [-1, -19], [-4, -27], [-8, -20], [-15, -24], [-15, -16], [-23, -15], [-18, -7], [-23, -2], [-17, 1], [-19, 8], [-12, 3], [-7, -8], [1, -7], [6, -8], [10, -3]];
  function yutaHead(ctx, J, pal, fx) {
    R.neck(ctx, J, pal);
    R.withHead(ctx, J, () => {
      const sway = fx.hairSway || 0;
      R.headBase(ctx, pal);
      const face = fx.face;
      if (face === 'hurt') R.eye(ctx, 8, -1, pal.eye, { closed: true });
      else R.eye(ctx, 8, -1, pal.eye, { angry: face === 'shout' ? 2 : 0.6, w: 7.4, h: 5, glow: fx.glowEyes ? '#c8b8ff' : null });
      if (!R.ghost) {
        // the dark rings under his eyes
        ctx.strokeStyle = JK.rgba('#3a2a44', 0.55); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(4, 3); ctx.quadraticCurveTo(8, 5.2, 12.5, 2.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 4.6); ctx.quadraticCurveTo(8.5, 6.4, 11.5, 4.4); ctx.stroke();
      }
      R.hair(ctx, HAIR2.yuta, pal.hair, sway, pal.hairS);
      R.mouth(ctx, 10, 10, face === 'hurt' ? 'hurt' : face === 'shout' ? 'open' : 'line');
    });
  }
  // Yuta's katana: wrapped grip, round guard, long curved blade (glows with cursed energy)
  function drawKatana(ctx, ws, pal, fx) {
    if (fx.noWeapon) return;
    ctx.scale(ws, ws);
    R.poly(ctx, [[-22, -3.4], [8, -3.4], [8, 3.4], [-22, 3.4]], pal.grip);
    if (!R.ghost) {
      ctx.strokeStyle = pal.wrap; ctx.lineWidth = 1.2;
      for (let x = -20; x < 7; x += 5) { ctx.beginPath(); ctx.moveTo(x, -3.4); ctx.lineTo(x + 4, 3.4); ctx.moveTo(x + 4, -3.4); ctx.lineTo(x, 3.4); ctx.stroke(); }
    }
    R.poly(ctx, [[8, -8], [12, -8], [12, 8], [8, 8]], pal.tsuba);
    ctx.beginPath();
    ctx.moveTo(12, -3.4); ctx.quadraticCurveTo(70, -6, 124, -12); ctx.lineTo(128, -10); ctx.quadraticCurveTo(72, 0, 12, 3.4); ctx.closePath();
    if (R.ghost) { ctx.fillStyle = pal.blade; ctx.fill(); return; }
    if (fx.glowEyes) JK.drawGlow(ctx, '#b8a8ff', 70, -5, 70, 0.35);
    ctx.lineWidth = 2.4; ctx.strokeStyle = R.OUT; ctx.stroke();
    const g = ctx.createLinearGradient(0, -8, 0, 4);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, pal.blade); g.addColorStop(1, pal.bladeS);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(14, -1.5); ctx.quadraticCurveTo(70, -4, 122, -10.5); ctx.stroke();
  }
  // Yuta's white uniform: long coat with a high collar
  function yutaTorso(ctx, J, pal, fx) {
    jacketTorso(ctx, J, pal, fx, { skirt: 34, collar: true });
  }

  // ---------- character table ----------
  JK.Characters = {
    gojo: {
      id: 'gojo', name: 'SATORU GOJO', short: 'GOJO', jp: '五条 悟', title: 'The Strongest Sorcerer',
      color: '#6fc8ff', color2: '#b784ff', aura: '#7fd4ff', rim: '#bfe6ff',
      quote: 'Nah, I\'d win.',
      introClip: 'gojo_intro', introLine: 'Yo. It\'s been a while.',
      stats: { power: 4, speed: 4, range: 5, difficulty: 3 },
      pal: palette({
        skin: '#f7dfcf', skinS: '#dcb7a3', hair: '#f4f7ff', hairS: '#b8c6e8',
        top: '#1c2034', topS: '#11131f', collar: '#1c2034', pants: '#1c2034', pantsS: '#11131f',
        shoe: '#0c0c10', sole: '#30303b', blindfold: '#0b0b10', eye: '#7fe7ff', button: '#d9b347',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawTorso: (ctx, J, pal, fx) => jacketTorso(ctx, J, pal, fx, { skirt: 44, collar: true }),
      drawHead: gojoHead,
      domain: { id: 'unlimited_void', name: 'UNLIMITED VOID', jp: '無量空処', say: 'Muryōkūsho', music: 'domain_gojo', clip: 'gojo_domain', clipNameAt: 120, clipCastLen: 200, clipNameOffset: 1.9 },
    },
    sukuna: {
      id: 'sukuna', name: 'RYOMEN SUKUNA', short: 'SUKUNA', jp: '両面 宿儺', title: 'King of Curses',
      color: '#ff3b4e', color2: '#ff9a3b', aura: '#ff2a3d', rim: '#ffb0a0',
      quote: 'Know your place, fool.',
      introClip: 'sukuna_intro', introLine: 'Know your place... fool.',
      stats: { power: 5, speed: 4, range: 4, difficulty: 3 },
      pal: palette({
        skin: '#f2cfb8', skinS: '#d3a68d', hair: '#f28ba0', hairS: '#b9566d', under: '#6e2d3a',
        top: '#f1ece2', topS: '#cbc2b1', topTrim: '#a79c88', obi: '#16141b', obiTrim: '#8b1b24',
        pants: '#27232c', pantsS: '#141217', shoe: '#2c1d15', shoe2: '#5a2020', tattoo: '#17080b', eye: '#e3263a', nail: '#1a0a0a',
      }),
      look: { sleeves: 'wide', legs: 'hakama', shoe: 'sandal' },
      drawTorso: kimonoTorso,
      drawHead: sukunaHead,
      domain: { id: 'malevolent_shrine', name: 'MALEVOLENT SHRINE', jp: '伏魔御廚子', say: 'Fukuma Mizushi', music: 'domain_sukuna', clip: 'sukuna_domain', clipNameAt: 66, clipCastLen: 116, clipNameOffset: 0 },
    },
    yuji: {
      id: 'yuji', name: 'YUJI ITADORI', short: 'YUJI', jp: '虎杖 悠仁', title: 'Vessel of Sukuna',
      color: '#ff5a5a', color2: '#5aa8ff', aura: '#4fa3ff', rim: '#ffd0c0',
      quote: 'I\'ll exorcise you. No matter what.',
      stats: { power: 4, speed: 5, range: 2, difficulty: 2 },
      pal: palette({
        skin: '#f3d0b5', skinS: '#d4a688', hair: '#f3a4ab', hairS: '#b8646f', under: '#5b3434',
        top: '#1b1d27', topS: '#101118', hood: '#c92a36', hoodS: '#8c1b25', pants: '#1b1d27', pantsS: '#101118',
        shoe: '#1c1c22', sole: '#d23240', eye: '#83502f', button: '#d9b347',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawBack: (ctx, J, pal) => {
        // red hood behind the neck
        R.withTorso(ctx, J, () => {
          R.poly(ctx, [[-17, -60], [-22, -74], [-12, -86], [2, -84], [8, -72], [-4, -66]], pal.hood);
          if (!R.ghost) {
            ctx.fillStyle = pal.hoodS;
            ctx.beginPath(); ctx.moveTo(-14, -80); ctx.lineTo(-2, -80); ctx.lineTo(-6, -70); ctx.closePath(); ctx.fill();
          }
        });
      },
      drawTorso: (ctx, J, pal, fx) => {
        jacketTorso(ctx, J, pal, fx, { skirt: 16, collar: false });
        R.withTorso(ctx, J, () => {
          R.poly(ctx, [[-12, -70], [-4, -80], [10, -78], [16, -68], [4, -72]], pal.hood);
        });
      },
      drawHead: yujiHead,
      domain: { id: 'yuji_domain', name: 'DOMAIN EXPANSION: [UNNAMED]', jp: '名称不明', say: '', music: 'domain_yuji', clip: 'domain_generic', clipNameAt: 72, clipCastLen: 122 },
    },
    megumi: {
      id: 'megumi', name: 'MEGUMI FUSHIGURO', short: 'MEGUMI', jp: '伏黒 恵', title: 'Ten Shadows Heir',
      color: '#7b6cff', color2: '#3dd6c0', aura: '#6a5cff', rim: '#c8c0ff',
      quote: 'I\'ll save the ones I choose.',
      stats: { power: 3, speed: 4, range: 4, difficulty: 4 },
      pal: palette({
        skin: '#f1d4c0', skinS: '#d2ab95', hair: '#15171e', hairS: '#343a4e',
        top: '#1a1d2a', topS: '#0f111a', collar: '#1a1d2a', pants: '#1a1d2a', pantsS: '#0f111a',
        shoe: '#101014', sole: '#2a2a33', eye: '#3f7a78', button: '#d9b347',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawTorso: (ctx, J, pal, fx) => jacketTorso(ctx, J, pal, fx, { skirt: 18, collar: true }),
      drawHead: megumiHead,
      domain: { id: 'chimera_shadow_garden', name: 'CHIMERA SHADOW GARDEN', jp: '嵌合暗翳庭', say: 'Kangō Ankei Tei', music: 'domain_megumi', clip: 'domain_generic', clipNameAt: 72, clipCastLen: 122 },
    },
    jogo: {
      id: 'jogo', name: 'JOGO', short: 'JOGO', jp: '漏瑚', title: 'Disaster Curse of the Earth',
      color: '#ff7a1a', color2: '#ffd04a', aura: '#ff6a1a', rim: '#ffc08a',
      quote: 'Humans are the fakes. We curses are the real thing.',
      stats: { power: 5, speed: 3, range: 5, difficulty: 3 },
      pal: palette({
        skin: '#d8cfbf', skinS: '#b3a996', rock: '#8e857c', rockS: '#625952', lava: '#ff7a1a',
        top: '#ece2cc', topS: '#c9bda4', topTrim: '#9a3222', obi: '#3a2a22', obiTrim: '#d0602a',
        pants: '#4a3a30', pantsS: '#2e231c', shoe: '#2a1c14', shoe2: '#6a3020', tattoo: '#1a1010', eye: '#120806', nail: '#2a1a14',
      }),
      look: { sleeves: 'wide', legs: 'hakama', shoe: 'sandal' },
      drawTorso: kimonoTorso,
      drawHead: jogoHead,
      domain: { id: 'coffin_iron_mountain', name: 'COFFIN OF THE IRON MOUNTAIN', jp: '蓋棺鉄囲山', say: 'Gaikan Tetsuisen', music: 'domain_jogo', clip: 'domain_generic', clipNameAt: 72, clipCastLen: 122 },
    },
    higuruma: {
      id: 'higuruma', name: 'HIROMI HIGURUMA', short: 'HIGURUMA', jp: '日車 寛見', title: 'The Defense Attorney',
      color: '#d9b650', color2: '#9a7cff', aura: '#b39cff', rim: '#ffe6a8',
      quote: 'The court is now in session.',
      stats: { power: 4, speed: 3, range: 4, difficulty: 4 },
      pal: palette({
        skin: '#ecccb2', skinS: '#caa78e', hair: '#17171d', hairS: '#383844', stubble: '#2a2228',
        top: '#1c1c24', topS: '#101016', pants: '#1c1c24', pantsS: '#101016', shirt: '#eceef3', tie: '#30303e', badge: '#e2bb4a',
        shoe: '#0c0c10', sole: '#2a2a33', eye: '#2a2230', wood: '#7a4a2a', woodS: '#4a2a16', metal: '#e2bb4a', blade: '#eef2f8',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawTorso: (ctx, J, pal, fx) => suitTorso(ctx, J, pal, fx, { skirt: 30 }),
      drawHead: higurumaHead,
      drawWeapon: drawGavel,
      domain: { id: 'deadly_sentencing', name: 'DEADLY SENTENCING', jp: '誅伏賜死', say: 'Chūbuku Shishi', music: 'domain_higuruma', clip: 'higuruma_domain', clipNameAt: 72, clipCastLen: 122, vignette: '#07040c' },
    },
    nanami: {
      id: 'nanami', name: 'KENTO NANAMI', short: 'NANAMI', jp: '七海 建人', title: 'Grade 1 Salaryman',
      color: '#ffae42', color2: '#6fb0ff', aura: '#ffc766', rim: '#ffe0b0',
      quote: 'It\'s six o\'clock. From here on, it\'s overtime.',
      stats: { power: 5, speed: 3, range: 3, difficulty: 3 },
      pal: palette({
        skin: '#f1d6bf', skinS: '#d0ae94', hair: '#efdca4', hairS: '#b59a5a',
        top: '#d9caa4', topS: '#b09f7a', pants: '#d9caa4', pantsS: '#b09f7a', shirt: '#9cbad8', tie: '#dcb44e', tieS: '#4a2e12',
        shoe: '#3a2618', sole: '#1a120c', eye: '#2a2a30', goggle: '#141418', button: '#8a7a5a',
        blade: '#5d6068', bladeS: '#393b42', wrap: '#ece2c6', wrapS: '#7a6440',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawTorso: (ctx, J, pal, fx) => suitTorso(ctx, J, pal, fx, { skirt: 28 }),
      drawHead: nanamiHead,
      drawWeapon: drawNanamiBlade,
      // Nanami has no domain: his ultimate is an extension technique
      domain: { id: 'overtime_collapse', ult: true, name: 'OVERTIME: COLLAPSE', jp: '瓦落瓦落', say: 'Kawaragawara', music: 'domain_nanami', clip: null, title: 'EXTENSION TECHNIQUE', titleJp: '拡張術式', cry: 'Overtime.' },
    },
    hakari: {
      id: 'hakari', name: 'KINJI HAKARI', short: 'HAKARI', jp: '秤 金次', title: 'The Gambler',
      color: '#2aff7a', color2: '#ffd23a', aura: '#2aff7a', rim: '#b8ffd8',
      quote: 'Let\'s get fired up. Let\'s gamble!',
      stats: { power: 5, speed: 4, range: 3, difficulty: 5 },
      pal: palette({
        skin: '#f0d2b8', skinS: '#cfab92', hair: '#d8cfbc', hairS: '#8e846e', under: '#8e846e',
        top: '#1b1c22', topS: '#0f1014', collar: '#1b1c22', pants: '#23252d', pantsS: '#15161b', shirt: '#1e5a3c', chain: '#e8c250',
        shoe: '#101014', sole: '#e8e8e8', eye: '#3a3020', button: '#e8c250',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawTorso: hakariTorso,
      drawHead: hakariHead,
      domain: { id: 'idle_death_gamble', name: 'IDLE DEATH GAMBLE', jp: '坐殺博徒', say: 'Zasatsu Bakuto', music: 'domain_hakari', clip: 'domain_generic', clipNameAt: 72, clipCastLen: 122, sub: 'PRIVATE PURE LOVE TRAIN', dur: 1200 },
    },
    yuta: {
      id: 'yuta', name: 'YUTA OKKOTSU', short: 'YUTA', jp: '乙骨 憂太', title: 'Special Grade Sorcerer',
      color: '#b8a8ff', color2: '#ff6aa8', aura: '#a898ff', rim: '#e8e0ff',
      quote: 'Rika... lend me your strength.',
      stats: { power: 5, speed: 4, range: 4, difficulty: 4 },
      pal: palette({
        skin: '#f2d9c7', skinS: '#d1b19c', hair: '#15151c', hairS: '#353545',
        top: '#eceef3', topS: '#c3c6d0', collar: '#eceef3', pants: '#e2e4ea', pantsS: '#b9bcc7', button: '#9aa0b0', cuff: '#d4d7df',
        shoe: '#1a1a20', sole: '#2e2e36', eye: '#241c2e',
        grip: '#1a1622', wrap: '#6a5a8a', tsuba: '#2a2630', blade: '#dfe4ee', bladeS: '#8e96a8',
      }),
      look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      drawTorso: yutaTorso,
      drawHead: yutaHead,
      drawWeapon: drawKatana,
      domain: { id: 'authentic_mutual_love', name: 'AUTHENTIC MUTUAL LOVE', jp: '真贋相愛', say: 'Shingan Sōai', music: 'domain_yuta', clip: 'domain_generic', clipNameAt: 72, clipCastLen: 122, dur: 1200 },
    },
  };
  JK.CHAR_ORDER = ['yuji', 'gojo', 'sukuna', 'megumi', 'jogo', 'nanami', 'higuruma', 'yuta', 'hakari'];
  JK.makePalette = palette;

  // ---------- alternate costumes ----------
  // Costume 0 is the base look. Variants inherit everything else from the base character.
  JK.COSTUMES = {
    gojo: [
      { name: 'Blindfold' },
      { name: 'Sunglasses', glasses: true, pal: { top: '#15151b', topS: '#0b0b10', collar: '#15151b', pants: '#15151b', pantsS: '#0b0b10' } },
      { name: 'Hidden Inventory', glasses: true, pal: { top: '#2a2f45', topS: '#1a1e30', collar: '#2a2f45', pants: '#2a2f45', pantsS: '#1a1e30', hair: '#f4f7ff', button: '#b8c0d8' } },
    ],
    sukuna: [
      { name: 'Heian Kimono' },
      {
        name: 'Shibuya Vessel', vessel: true,
        pal: { top: '#1b1d27', topS: '#101118', hood: '#c92a36', hoodS: '#8c1b25', pants: '#1b1d27', pantsS: '#101118', shoe: '#1c1c22', sole: '#d23240', button: '#d9b347' },
        look: { sleeves: 'fitted', legs: 'pants', shoe: 'shoe' },
      },
      { name: 'Black Kimono', pal: { top: '#1c1a20', topS: '#0e0d11', topTrim: '#8b1b24', obi: '#e8e0d0', obiTrim: '#8b1b24', pants: '#e0d8c8', pantsS: '#b8ae9c' } },
    ],
    yuji: [
      { name: 'Uniform' },
      { name: 'Casual Hoodie', pal: { top: '#5d6272', topS: '#43475a', hood: '#e8e0d0', hoodS: '#b8b0a0', pants: '#27324b', pantsS: '#1a2236', sole: '#f2f2f2', button: '#e8e0d0' } },
      { name: 'Shinjuku', pal: { top: '#141414', topS: '#0a0a0a', hood: '#2a2a2a', hoodS: '#161616', pants: '#23262e', pantsS: '#15171c', sole: '#e0e0e0' } },
    ],
    megumi: [
      { name: 'Uniform' },
      { name: 'Culling Game', pal: { top: '#e9e9ef', topS: '#c3c3cf', collar: '#e9e9ef', pants: '#2a2a36', pantsS: '#1a1a24', button: '#8a8aa0' } },
      { name: 'Midnight', pal: { top: '#1c2a3a', topS: '#101a26', collar: '#1c2a3a', pants: '#1c2a3a', pantsS: '#101a26' } },
    ],
    jogo: [
      { name: 'Robe' },
      { name: 'Ash', pal: { top: '#5a5450', topS: '#3e3936', topTrim: '#ff7a1a', obi: '#1a1412', pants: '#1f1a18', pantsS: '#12100e', rock: '#4a4442', rockS: '#2e2a28' } },
      { name: 'Magma', pal: { skin: '#e2c9b0', top: '#7a1a12', topS: '#541008', topTrim: '#ffcf4a', obi: '#ffcf4a', obiTrim: '#7a1a12', pants: '#2a1210', pantsS: '#1a0a08' } },
    ],
    higuruma: [
      { name: 'Courtroom' },
      { name: 'Culling Game', pal: { top: '#3a3a44', topS: '#26262e', pants: '#3a3a44', pantsS: '#26262e', shirt: '#d8dce6', tie: '#8a1a2a' } },
      { name: 'Grey Pinstripe', pal: { top: '#5a5e6a', topS: '#40434d', pants: '#5a5e6a', pantsS: '#40434d', tie: '#1a2a4a', wood: '#3a2418', woodS: '#22140c' } },
    ],
    nanami: [
      { name: 'Office' },
      { name: 'Navy Suit', pal: { top: '#2a3450', topS: '#1a2236', pants: '#2a3450', pantsS: '#1a2236', shirt: '#e8ecf2', tie: '#c8a040' } },
      { name: 'Shibuya', pal: { top: '#b8a67e', topS: '#8c7c58', pants: '#b8a67e', pantsS: '#8c7c58', shirt: '#7a98b8', wrap: '#d8c8a8' } },
    ],
  };
  JK.COSTUMES.hakari = [
    { name: 'Culling Game' },
    { name: 'Conductor', pal: { top: '#1c2a4a', topS: '#111a30', collar: '#1c2a4a', pants: '#1c2a4a', pantsS: '#111a30', shirt: '#e8e2d0', button: '#e8c250' } },
    { name: 'Fever', pal: { top: '#e8e4d8', topS: '#bfb9aa', collar: '#e8e4d8', pants: '#2a2a30', pantsS: '#18181c', shirt: '#2aff7a', hair: '#3a332c', hairS: '#1c1814' } },
  ];
  JK.COSTUMES.yuta = [
    { name: 'White Uniform' },
    { name: 'Black Uniform', pal: { top: '#1a1d2a', topS: '#0f111a', collar: '#1a1d2a', pants: '#1a1d2a', pantsS: '#0f111a', cuff: '#12141d', button: '#d9b347' } },
    { name: 'Shinjuku', pal: { top: '#f4f4f6', topS: '#cdced6', collar: '#f4f4f6', pants: '#2c2c34', pantsS: '#1b1b22', wrap: '#c8384a' } },
  ];
  const variantCache = {};
  JK.getCharacter = function (id, costume = 0) {
    const base = JK.Characters[id];
    const list = JK.COSTUMES[id] || [];
    costume = ((costume % Math.max(1, list.length)) + list.length) % Math.max(1, list.length);
    if (!costume || !list[costume]) return base;
    const key = id + costume;
    if (variantCache[key]) return variantCache[key];
    const c = list[costume];
    const v = Object.create(base);
    const raw = {};
    for (const k in base.pal) if (k !== 'back') raw[k] = base.pal[k];
    v.pal = palette(Object.assign(raw, c.pal || {}));
    v.look = Object.assign({}, base.look, c.look || {});
    v.glasses = !!c.glasses;
    v.costume = costume;
    v.costumeName = c.name;
    if (c.vessel) {
      // Sukuna wearing Yuji's body and uniform
      const y = JK.Characters.yuji;
      v.drawTorso = y.drawTorso;
      v.drawBack = y.drawBack;
    }
    variantCache[key] = v;
    return v;
  };

  // Draw a fighter at a given character-space pose with effects.
  JK.drawCharacter = function (ctx, ch, pose, fx = {}) {
    const J = R.solve(pose);
    const pal = fx.palette || ch.pal;
    R.setStyle(fx.ghost ? null : '#0a0a12', 3.2, !!fx.ghost);
    fx.rim = fx.rim || ch.rim;
    if (ch.glasses) fx.glasses = true;
    R.setBlink(!!fx.blink);
    JK.Rig.drawBody(ctx, J, ch, pal, fx);
    R.setBlink(false);
    R.setStyle('#0a0a12', 3.2, false);
    return J;
  };

  // Portrait: head + shoulders, for HUD/menus. (x, y) is the head centre.
  JK.drawPortrait = function (ctx, ch, x, y, scale, opts = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (opts.flip ? -1 : 1), scale);
    const pose = R.P({ x: 0, y: -108, lean: 2, head: opts.head ?? -4, hF: [10, 58], hB: [4, 60], gF: 'hidden', gB: 'hidden' });
    ctx.translate(-3, 196);
    JK.drawCharacter(ctx, ch, pose, { face: opts.face || 'normal', eyesOpen: opts.eyesOpen, cloth: 0, glowEyes: opts.glowEyes });
    ctx.restore();
  };
})();
