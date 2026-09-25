'use strict';
// Skeletal rig: poses (IK targets), interpolation, and the layered cel-shaded body renderer.
// Character space: origin at feet on the ground, +x = forward (facing direction), -y = up.
JK.Rig = (function () {
  const L = { thigh: 60, shin: 59, torso: 72, shoulder: 63, upper: 40, fore: 38, neck: 11, headR: 16 };
  const D = JK.DEG;

  const BASE = {
    x: 0, y: -108, lean: 4, head: 0, rot: 0, tw: 7,
    hF: [22, 40], hB: [16, 44], fF: [18, 0], fB: [-18, 0], aF: 0, aB: 0,
    gF: 'fist', gB: 'fist', elF: 1, elB: 1, sq: 1,
    // held weapon (front hand): angle relative to the forearm (deg), scale, visibility
    wa: -80, ws: 1, wv: 1,
  };
  // P(overrides) builds a pose on top of BASE; P(pose, overrides) builds on another pose.
  const P = (a, b) => (b === undefined ? Object.assign({}, BASE, a) : Object.assign({}, BASE, a, b));

  function lerpPose(a, b, t) {
    const o = {};
    for (const k in b) {
      const va = a[k] ?? BASE[k], vb = b[k];
      if (typeof vb === 'number') o[k] = va + (vb - va) * t;
      else if (Array.isArray(vb)) o[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
      else o[k] = t < 0.35 ? va : vb;
    }
    return o;
  }

  // anim: {keys:[[frame, pose, ease?], ...], loop?:bool}
  function sample(anim, f) {
    const keys = anim.keys;
    if (!keys.length) return BASE;
    const last = keys[keys.length - 1][0];
    if (anim.loop && last > 0) f = f % last;
    if (f <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [f0, p0] = keys[i];
      const [f1, p1, e] = keys[i + 1];
      if (f >= f0 && f <= f1) {
        const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
        return lerpPose(p0, p1, (JK.ease[e] || JK.ease.inOut)(t));
      }
    }
    return keys[keys.length - 1][1];
  }

  function ik(sx, sy, tx, ty, a, b, bend) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const maxd = a + b - 0.5, mind = Math.abs(a - b) + 2;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    if (d < mind) { const s = mind / Math.max(d, 0.001); dx *= s; dy *= s; d = mind; }
    const base = Math.atan2(dy, dx);
    const cosA = JK.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const ang = base + bend * Math.acos(cosA);
    return { mx: sx + Math.cos(ang) * a, my: sy + Math.sin(ang) * a, ex: sx + dx, ey: sy + dy };
  }

  // Solve joint positions from a pose.
  function solve(p) {
    const J = {};
    const lean = p.lean * D;
    const ux = Math.sin(lean), uy = -Math.cos(lean); // torso up
    const px = Math.cos(lean), py = Math.sin(lean); // torso perpendicular (forward)
    J.lean = lean;
    J.hip = { x: p.x, y: p.y };
    J.neck = { x: p.x + ux * L.torso, y: p.y + uy * L.torso };
    const sb = { x: p.x + ux * L.shoulder, y: p.y + uy * L.shoulder };
    J.shF = { x: sb.x + px * p.tw, y: sb.y + py * p.tw };
    J.shB = { x: sb.x - px * p.tw, y: sb.y - py * p.tw };
    J.hipF = { x: p.x + px * 5, y: p.y + py * 5 };
    J.hipB = { x: p.x - px * 5, y: p.y - py * 5 };
    const ha = lean + p.head * D;
    J.headA = ha;
    J.head = { x: J.neck.x + Math.sin(ha) * (L.neck + L.headR * 0.8), y: J.neck.y - Math.cos(ha) * (L.neck + L.headR * 0.8) };
    // arms
    let r = ik(J.shF.x, J.shF.y, J.shF.x + p.hF[0], J.shF.y + p.hF[1], L.upper, L.fore, p.elF);
    J.elF = { x: r.mx, y: r.my }; J.haF = { x: r.ex, y: r.ey };
    r = ik(J.shB.x, J.shB.y, J.shB.x + p.hB[0], J.shB.y + p.hB[1], L.upper, L.fore, p.elB);
    J.elB = { x: r.mx, y: r.my }; J.haB = { x: r.ex, y: r.ey };
    // legs: foot targets are sole contact points; ankle sits above
    const anF = { x: p.fF[0] - Math.sin(p.aF * D) * 7, y: p.fF[1] - Math.cos(p.aF * D) * 7 };
    const anB = { x: p.fB[0] - Math.sin(p.aB * D) * 7, y: p.fB[1] - Math.cos(p.aB * D) * 7 };
    r = ik(J.hipF.x, J.hipF.y, anF.x, anF.y, L.thigh, L.shin, -1);
    J.knF = { x: r.mx, y: r.my }; J.anF = { x: r.ex, y: r.ey };
    r = ik(J.hipB.x, J.hipB.y, anB.x, anB.y, L.thigh, L.shin, -1);
    J.knB = { x: r.mx, y: r.my }; J.anB = { x: r.ex, y: r.ey };
    J.aF = p.aF * D; J.aB = p.aB * D;
    J.gF = p.gF; J.gB = p.gB;
    J.rot = p.rot * D;
    J.sq = p.sq;
    J.wa = (p.wa ?? -80) * D;
    J.ws = p.ws ?? 1;
    J.wv = p.wv ?? 1;
    return J;
  }

  // ---------------- drawing primitives ----------------
  let OUT = '#0a0a12';
  let OW = 3.2;
  let GHOST = false;
  let BLINK = false;
  function setStyle(outline, width, ghost) { OUT = outline; OW = width; GHOST = ghost; }
  function setBlink(b) { BLINK = b; }

  function finish(ctx, fill) {
    if (!GHOST && OUT) {
      ctx.lineWidth = OW;
      ctx.strokeStyle = OUT;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function capsulePath(ctx, ax, ay, bx, by, r1, r2) {
    const ang = Math.atan2(by - ay, bx - ax);
    const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ax + nx * r1, ay + ny * r1);
    ctx.lineTo(bx + nx * r2, by + ny * r2);
    ctx.arc(bx, by, r2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    ctx.lineTo(ax - nx * r1, ay - ny * r1);
    ctx.arc(ax, ay, r1, ang - Math.PI / 2, ang + Math.PI / 2, true);
    ctx.closePath();
  }
  function capsule(ctx, a, b, r1, r2, fill) {
    capsulePath(ctx, a.x, a.y, b.x, b.y, r1, r2);
    finish(ctx, fill);
  }
  // Cel-shaded limb: base capsule, a hard shadow band on the side away from the light
  // (light comes from the front and above), then the outline redrawn on top.
  function limb(ctx, a, b, r1, r2, fill, shadeCol) {
    capsule(ctx, a, b, r1, r2, fill);
    if (GHOST || !shadeCol) return;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    let nx = -uy, ny = ux;
    if (nx - ny > 0) { nx = -nx; ny = -ny; }
    const r = Math.max(r1, r2), off = Math.min(r1, r2) * 0.28;
    ctx.save();
    capsulePath(ctx, a.x, a.y, b.x, b.y, r1, r2);
    ctx.clip();
    ctx.fillStyle = shadeCol;
    ctx.beginPath();
    ctx.moveTo(a.x - ux * r + nx * off, a.y - uy * r + ny * off);
    ctx.lineTo(b.x + ux * r + nx * off, b.y + uy * r + ny * off);
    ctx.lineTo(b.x + ux * r + nx * r * 2, b.y + uy * r + ny * r * 2);
    ctx.lineTo(a.x - ux * r + nx * r * 2, a.y - uy * r + ny * r * 2);
    ctx.closePath();
    ctx.fill();
    // soft highlight on the lit side
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x - nx * (r1 - 2.5), a.y - ny * (r1 - 2.5));
    ctx.lineTo(b.x - nx * (r2 - 2.5), b.y - ny * (r2 - 2.5));
    ctx.stroke();
    ctx.restore();
    if (OUT) {
      capsulePath(ctx, a.x, a.y, b.x, b.y, r1, r2);
      ctx.lineWidth = OW * 0.75; ctx.strokeStyle = OUT; ctx.stroke();
    }
  }
  function poly(ctx, pts, fill, close = true) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
    finish(ctx, fill);
  }
  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    finish(ctx, fill);
  }

  // Hand shapes, oriented along the forearm.
  function hand(ctx, el, ha, shape, pal) {
    if (shape === 'pocket' || shape === 'hidden') return;
    const ang = Math.atan2(ha.y - el.y, ha.x - el.x);
    ctx.save();
    ctx.translate(ha.x, ha.y);
    ctx.rotate(ang);
    const skin = pal.hand || pal.skin;
    if (shape === 'open' || shape === 'claw') {
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(9, -6);
      ctx.quadraticCurveTo(17, -5, 18, -1);
      ctx.lineTo(18, 2);
      ctx.quadraticCurveTo(15, 6, 9, 6);
      ctx.lineTo(-2, 6);
      ctx.closePath();
      finish(ctx, skin);
      if (!GHOST) {
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(9, -2); ctx.lineTo(17, -1);
        ctx.moveTo(9, 2); ctx.lineTo(16, 3);
        ctx.stroke();
      }
      if (shape === 'claw' && pal.nail && !GHOST) {
        ctx.fillStyle = pal.nail;
        ctx.fillRect(16, -4, 3, 2); ctx.fillRect(16, 0, 3, 2);
      }
    } else if (shape === 'point' || shape === 'sign') {
      circle(ctx, 3, 0, 6.2, skin);
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(19, -3.5);
      ctx.lineTo(19.5, 0);
      ctx.lineTo(4, 1);
      ctx.closePath();
      finish(ctx, skin);
      if (shape === 'sign') {
        ctx.beginPath();
        ctx.moveTo(4, 1); ctx.lineTo(17, 3); ctx.lineTo(16.5, 6); ctx.lineTo(4, 4);
        ctx.closePath();
        finish(ctx, skin);
      }
    } else {
      // fist
      ctx.beginPath();
      JK.roundRect(ctx, -3, -6.5, 13, 13, 5);
      finish(ctx, skin);
      if (!GHOST) {
        ctx.strokeStyle = OUT; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(7, -4); ctx.lineTo(7, 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function shoe(ctx, an, a, pal, style) {
    ctx.save();
    ctx.translate(an.x, an.y);
    ctx.rotate(a);
    if (style === 'sandal') {
      poly(ctx, [[-6, -3], [4, -4], [13, 1], [14, 6], [-7, 6]], pal.skin);
      if (!GHOST) {
        ctx.fillStyle = pal.shoe;
        ctx.fillRect(-8, 5, 23, 3);
        ctx.fillStyle = pal.shoe2 || pal.shoe;
        ctx.fillRect(-1, -2, 4, 7);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(-7, -4);
      ctx.lineTo(5, -5);
      ctx.quadraticCurveTo(16, -1, 17, 4);
      ctx.lineTo(17, 7);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      finish(ctx, pal.shoe);
      if (!GHOST && pal.sole) {
        ctx.fillStyle = pal.sole;
        ctx.fillRect(-8, 5, 25, 2.5);
      }
    }
    ctx.restore();
  }

  // ---------------- body renderer ----------------
  // ch.look: {coat, sleeves:'fitted'|'wide', legs:'pants'|'hakama', shoe}
  // hooks: ch.drawTorso(ctx,J,pal,fx), ch.drawHead(ctx,J,pal,fx), ch.drawBack(ctx,J,pal,fx)
  function drawBody(ctx, J, ch, pal, fx) {
    const look = ch.look;
    ctx.save();
    if (J.rot) {
      ctx.translate(J.hip.x, J.hip.y);
      ctx.rotate(J.rot);
      ctx.translate(-J.hip.x, -J.hip.y);
    }
    if (J.sq !== 1) {
      ctx.translate(0, 0);
      ctx.scale(2 - J.sq, J.sq);
    }
    const back = GHOST ? pal : pal.back;
    // behind-body extras (hood, coat back, hair back)
    if (ch.drawBack) ch.drawBack(ctx, J, pal, fx);
    // back arm
    drawArm(ctx, J.shB, J.elB, J.haB, J.gB, back, look, fx, false);
    // back leg
    drawLeg(ctx, J.hipB, J.knB, J.anB, J.aB, back, look);
    // torso + skirt/coat
    ch.drawTorso(ctx, J, pal, fx);
    // front leg
    drawLeg(ctx, J.hipF, J.knF, J.anF, J.aF, pal, look);
    if (ch.drawOverLegs) ch.drawOverLegs(ctx, J, pal, fx);
    // head
    ch.drawHead(ctx, J, pal, fx);
    // front arm (+ held weapon)
    drawArm(ctx, J.shF, J.elF, J.haF, J.gF, pal, look, fx, true);
    if (ch.drawWeapon && J.wv > 0.5 && J.gF !== 'hidden' && J.gF !== 'pocket' && !fx.noWeapon) {
      // weapon axis: forearm direction rotated by the pose's weapon angle
      const fa = Math.atan2(J.haF.y - J.elF.y, J.haF.x - J.elF.x);
      ctx.save();
      ctx.translate(J.haF.x + Math.cos(fa) * 4, J.haF.y + Math.sin(fa) * 4);
      ctx.rotate(fa + J.wa);
      ch.drawWeapon(ctx, J.ws, pal, fx);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawArm(ctx, sh, el, ha, grip, pal, look, fx, front) {
    if (look.sleeves === 'wide') {
      limb(ctx, sh, el, 8, 7, pal.skin, pal.skinS);
      limb(ctx, el, ha, 7, 6, pal.skin, pal.skinS);
      if (pal.tattoo && !GHOST) {
        // wrist bands
        const t1 = 0.62, t2 = 0.78;
        ctx.strokeStyle = pal.tattoo; ctx.lineWidth = 2.2;
        for (const t of [t1, t2]) {
          const x = el.x + (ha.x - el.x) * t, y = el.y + (ha.y - el.y) * t;
          const ang = Math.atan2(ha.y - el.y, ha.x - el.x) + Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6);
          ctx.lineTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6);
          ctx.stroke();
        }
      }
      hand(ctx, el, ha, grip, pal);
      // wide sleeve hangs from shoulder to beyond the elbow, swinging with cloth
      const sway = (fx.cloth || 0) * 0.6;
      const ax = el.x - sh.x, ay = el.y - sh.y;
      const len = Math.hypot(ax, ay) || 1;
      const dx = ax / len, dy = ay / len;
      const ex = el.x + dx * 10, ey = el.y + dy * 10;
      const hang = 26;
      poly(ctx, [
        [sh.x - dy * 9, sh.y + dx * 9],
        [sh.x + dy * 9, sh.y - dx * 9],
        [ex + dy * 11, ey - dx * 11],
        [ex + dy * 11 - sway, ey - dx * 11 + hang],
        [ex - dy * 12 - sway * 1.2, ey + dx * 12 + hang * 0.7],
        [ex - dy * 12, ey + dx * 12],
      ], pal.top);
      if (!GHOST && pal.topTrim) {
        ctx.strokeStyle = pal.topTrim; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex + dy * 11 - sway, ey - dx * 11 + hang);
        ctx.lineTo(ex - dy * 12 - sway * 1.2, ey + dx * 12 + hang * 0.7);
        ctx.stroke();
      }
    } else {
      limb(ctx, sh, el, 9.8, 8.6, pal.top, pal.topS);
      limb(ctx, el, ha, 8.6, 7.2, pal.top, pal.topS);
      // cuff
      if (!GHOST) {
        const cx = el.x + (ha.x - el.x) * 0.86, cy = el.y + (ha.y - el.y) * 0.86;
        ctx.fillStyle = pal.cuff || pal.topS;
        ctx.beginPath(); ctx.arc(cx, cy, 7.6, 0, Math.PI * 2); ctx.fill();
      }
      hand(ctx, el, ha, grip, pal);
    }
  }

  function drawLeg(ctx, hip, kn, an, a, pal, look) {
    if (look.legs === 'hakama') {
      // wide flowing trousers
      const flare = 17;
      limb(ctx, hip, kn, 13, 14, pal.pants, pal.pantsS);
      const ang = Math.atan2(an.y - kn.y, an.x - kn.x);
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      poly(ctx, [
        [kn.x + nx * 14, kn.y + ny * 14],
        [an.x + nx * flare, an.y + ny * flare - 2],
        [an.x - nx * flare, an.y - ny * flare - 2],
        [kn.x - nx * 14, kn.y - ny * 14],
      ], pal.pants);
      if (!GHOST) {
        ctx.strokeStyle = pal.pantsS; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(kn.x, kn.y); ctx.lineTo(an.x + nx * 5, an.y + ny * 5);
        ctx.stroke();
      }
      shoe(ctx, an, a, pal, look.shoe);
    } else {
      limb(ctx, hip, kn, 12.8, 10.6, pal.pants, pal.pantsS);
      limb(ctx, kn, an, 10.6, 8.4, pal.pants, pal.pantsS);
      shoe(ctx, an, a, pal, look.shoe);
    }
  }

  // Torso outline in torso-local space (origin hip, up = -y). Returns nothing; caller transforms.
  function torsoPath(ctx, w = 1) {
    ctx.beginPath();
    ctx.moveTo(-14 * w, -70);
    ctx.quadraticCurveTo(-21 * w, -44, -14 * w, -18);
    ctx.lineTo(-15 * w, 5);
    ctx.lineTo(15 * w, 5);
    ctx.lineTo(13 * w, -18);
    ctx.quadraticCurveTo(22 * w, -40, 16 * w, -66);
    ctx.quadraticCurveTo(2, -77, -14 * w, -70);
    ctx.closePath();
  }
  function withTorso(ctx, J, fn) {
    ctx.save();
    ctx.translate(J.hip.x, J.hip.y);
    ctx.rotate(J.lean);
    fn();
    ctx.restore();
  }

  // Generic head base: skull + jaw, facing +x in head-local space (origin head center).
  function headBase(ctx, pal) {
    // skull + angular anime jaw in one silhouette
    ctx.beginPath();
    ctx.moveTo(-6, 11);
    ctx.bezierCurveTo(-19, 6, -19, -18, -3, -20);
    ctx.bezierCurveTo(10, -21, 16, -12, 15, -4);
    ctx.lineTo(16.5, 3);
    ctx.lineTo(14.5, 5);
    ctx.lineTo(14, 10);
    ctx.lineTo(9.5, 15.5);
    ctx.lineTo(4, 16);
    ctx.closePath();
    finish(ctx, pal.skin);
    if (!GHOST) {
      // jaw shadow + neck side
      ctx.fillStyle = JK.rgba('#8a5a48', 0.28);
      ctx.beginPath();
      ctx.moveTo(-6, 11); ctx.lineTo(4, 16); ctx.lineTo(9.5, 15.5); ctx.lineTo(3, 10); ctx.lineTo(-4, 6);
      ctx.closePath(); ctx.fill();
      // ear
      ctx.beginPath();
      ctx.ellipse(-5, 2, 2.6, 4, 0.15, 0, Math.PI * 2);
      ctx.fillStyle = pal.skin;
      ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5.5, 0); ctx.quadraticCurveTo(-4, 2, -5.5, 4); ctx.lineWidth = 0.9; ctx.stroke();
      // nose
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(15.5, 1); ctx.lineTo(16.8, 4.5); ctx.lineTo(14.5, 5); ctx.stroke();
    }
  }
  // Hair silhouette from explicit points (spike tips + valleys), tips sway with motion.
  function hair(ctx, pts, fill, sway = 0, shade = null) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const k = Math.max(0, -y - 8) / 30;
      const px = x - sway * k, py = y;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    finish(ctx, fill);
    if (shade && !GHOST) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(-30, -2); ctx.quadraticCurveTo(-10, -14, 4, -9); ctx.lineTo(4, 10); ctx.lineTo(-30, 10);
      ctx.fill();
      ctx.strokeStyle = JK.rgba('#000000', 0.18); ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -12); ctx.lineTo(-10, -26);
      ctx.moveTo(4, -13); ctx.lineTo(2, -28);
      ctx.moveTo(-8, -10); ctx.lineTo(-18, -18);
      ctx.stroke();
      ctx.restore();
    }
  }
  function neck(ctx, J, pal) {
    capsule(ctx, J.neck, { x: J.head.x - Math.sin(J.headA) * 6, y: J.head.y + Math.cos(J.headA) * 6 }, 6, 6, pal.skinS);
  }
  function withHead(ctx, J, fn) {
    ctx.save();
    ctx.translate(J.head.x, J.head.y);
    ctx.rotate(J.headA);
    fn();
    ctx.restore();
  }
  // Anime eye: x,y is eye center in head space.
  function eye(ctx, x, y, iris, opts = {}) {
    if (GHOST) return;
    const { angry = 0, glow = null, w = 7, h = 5 } = opts;
    const closed = opts.closed || (BLINK && !glow);
    if (closed) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - w * 0.6, y + 1); ctx.quadraticCurveTo(x, y + 3, x + w * 0.6, y); ctx.stroke();
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.55, y - 1 + angry);
    ctx.quadraticCurveTo(x, y - h - angry * 0.3, x + w * 0.6, y - 2 - angry);
    ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.7, x - w * 0.55, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.ellipse(x + 1.2, y - 0.2, w * 0.28, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05050a';
    ctx.beginPath(); ctx.ellipse(x + 1.4, y, w * 0.13, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 0.2, y - 2, 1.6, 1.6);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.6, y - 1 + angry);
    ctx.quadraticCurveTo(x, y - h - angry * 0.3, x + w * 0.7, y - 2 - angry);
    ctx.stroke();
    if (glow) JK.drawGlow(ctx, glow, x + 1, y, 11, 0.9);
  }
  function brow(ctx, x, y, angry, color) {
    if (GHOST) return;
    ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 1 - angry * 0.3);
    ctx.lineTo(x + 5, y + angry);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function mouth(ctx, x, y, kind) {
    if (GHOST) return;
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (kind === 'grin') {
      ctx.moveTo(x - 4, y - 1); ctx.quadraticCurveTo(x, y + 3, x + 3, y - 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 0.5); ctx.lineTo(x + 2.5, y - 1.5); ctx.lineTo(x, y + 1.5); ctx.closePath(); ctx.fill();
    } else if (kind === 'open') {
      ctx.fillStyle = '#3a0d12';
      ctx.ellipse(x, y + 1, 3, 3.2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (kind === 'hurt') {
      ctx.moveTo(x - 4, y + 1); ctx.lineTo(x - 1, y - 1); ctx.lineTo(x + 2, y + 1); ctx.lineTo(x + 4, y - 1);
      ctx.stroke();
    } else {
      ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y - 0.5);
      ctx.stroke();
    }
  }
  // Spiky hair from a list of [angleDeg, length, width] spikes around a pivot.
  function spikes(ctx, cx, cy, r, list, fill, sway = 0) {
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i < list.length; i++) {
      const [a, len, w] = list[i];
      const ang = (a + sway * (len / 20)) * D;
      const baseA1 = ang - (w * D) / 2, baseA2 = ang + (w * D) / 2;
      pts.push([cx + Math.cos(baseA1) * r, cy + Math.sin(baseA1) * r]);
      pts.push([cx + Math.cos(ang) * (r + len), cy + Math.sin(ang) * (r + len)]);
      pts.push([cx + Math.cos(baseA2) * r, cy + Math.sin(baseA2) * r]);
    }
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    finish(ctx, fill);
  }

  return {
    L, BASE, P, lerpPose, sample, solve, setStyle, setBlink, finish,
    capsule, capsulePath, limb, poly, circle, hand, shoe, drawBody, torsoPath, withTorso, headBase, neck, withHead,
    eye, brow, mouth, spikes, hair,
    get ghost() { return GHOST; },
    get OUT() { return OUT; },
  };
})();
