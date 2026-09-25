'use strict';
// Poses, animations, frame data and special techniques for every character.
(function () {
  const P = JK.Rig.P;
  const FX = JK.FX;
  const SFX = (n, ...a) => JK.Audio.sfx(n, ...a);

  // ------------------------------------------------------------------ projectiles
  JK.Projectile = class {
    constructor(o) {
      Object.assign(this, {
        t: 0, w: 40, h: 40, vx: 0, vy: 0, life: 90, hits: 1, every: 8, prio: 1, dead: false,
        hitCount: 0, lastHit: -99, level: 'mid', special: true, from: 0, to: 99999, kb: 6, hitstun: 18, blockstun: 14, hitstop: 6, power: 2,
      }, o);
      this.dir = this.dir || Math.sign(this.vx) || this.owner.facing;
    }
    box() { return { x0: this.x - this.w / 2, x1: this.x + this.w / 2, y0: this.y - this.h / 2, y1: this.y + this.h / 2 }; }
    get active() { return this.t >= this.from && this.t <= this.to; }
    kill(game) {
      if (this.dead) return;
      this.dead = true;
      if (this.onDeath) this.onDeath(this, game);
    }
  };

  // ------------------------------------------------------------------ generic poses (hip ~ -104)
  const G = {};
  G.stance = P({ y: -104, lean: 6, head: -3, hF: [30, -8], hB: [24, 2], fF: [26, 0], fB: [-24, 0] });
  G.crouch = P({ y: -70, lean: 16, head: -10, hF: [34, -6], hB: [28, 4], fF: [32, 0], fB: [-28, 0] });
  G.jump = P({ y: -112, lean: 4, head: -4, hF: [28, -22], hB: [20, -12], fF: [22, -34], fB: [-14, -16], aF: 30, aB: 20 });
  G.fall = P({ y: -110, lean: 0, head: 2, hF: [36, -30], hB: [-12, -24], fF: [20, -12], fB: [-18, -4], aF: 20, aB: 10, gF: 'open', gB: 'open' });
  G.tuck = P({ y: -118, lean: 34, head: 14, hF: [30, 14], hB: [26, 20], fF: [26, -60], fB: [12, -54], aF: 40, aB: 40 });
  G.block = P({ y: -102, x: -4, lean: -2, head: 8, hF: [16, -28], hB: [26, -16], gF: 'open', gB: 'open', fF: [22, 0], fB: [-30, 0] });
  G.cblock = P({ y: -70, lean: 10, head: 8, hF: [20, -26], hB: [28, -14], gF: 'open', gB: 'open', fF: [32, 0], fB: [-28, 0] });
  G.hitHigh = P({ y: -103, x: -10, lean: -22, head: -28, hF: [-8, 34], hB: [-20, 24], gF: 'open', gB: 'open', fF: [30, 0], fB: [-32, 0] });
  G.hitBody = P({ y: -97, x: -4, lean: 30, head: 18, hF: [16, 36], hB: [10, 32], gF: 'open', gB: 'open', fF: [26, 0], fB: [-30, 0] });
  G.air = P({ y: -106, lean: -12, head: -22, hF: [-22, -44], hB: [-36, -22], gF: 'open', gB: 'open', fF: [34, -24], fB: [-2, -12], aF: 40, aB: 30 });
  G.down = P({ x: -14, y: -16, rot: -88, lean: 0, head: -6, hF: [-6, 64], hB: [30, 50], gF: 'open', gB: 'open', fF: [-4, 90], fB: [-26, 84], aF: 0, aB: 0 });
  G.dash = P({ y: -98, lean: 26, head: -12, hF: [8, 22], hB: [-34, 26], fF: [42, -10], fB: [-42, -6], aF: 20, aB: 30 });
  G.backdash = P({ y: -106, lean: -14, head: 6, hF: [22, -12], hB: [16, -2], fF: [12, -14], fB: [-32, -6], aF: 10, aB: 10 });

  // ------------------------------------------------------------------ anim helpers
  function atk(st, s, a, r, wind, hit, follow) {
    const tot = s + a + r;
    const keys = [[0, st]];
    if (wind) keys.push([Math.max(1, Math.round(s * 0.6)), wind, 'outQuad']);
    keys.push([s, hit, 'outExpo']);
    keys.push([s + a, follow || hit, 'linear']);
    keys.push([s + a + Math.round(r * 0.35), follow || hit, 'linear']);
    keys.push([tot, st, 'inOut']);
    return { keys };
  }
  const seq = (...keys) => ({ keys });

  // ------------------------------------------------------------------ shared normals
  function normals(ch, st) {
    const d = ch.dmgScale || 1;
    const cr = ch.poses.crouch;
    const jp = ch.poses.jump;
    const claw = ch.id === 'sukuna' ? 'claw' : 'fist';
    const M = {};
    M.light = {
      name: 'Jab', normal: true, startup: 4, active: 3, recovery: 8, dmg: 40 * d, hitstun: 15, blockstun: 11, kb: 4, level: 'high',
      hit: [30, 102, -194, -150], hitstop: 6, power: 1, whoosh: 3, trail: 'hF',
      chain: { light: 'light2', heavy: 'heavy', kick: 'kick' },
      anim: atk(st, 4, 3, 8, P({ y: -104, lean: 8, hF: [18, -8], hB: [22, 2], fF: [28, 0], fB: [-24, 0], gF: claw }),
        P({ y: -102, x: 6, lean: 12, head: -4, tw: 10, hF: [80, -10], hB: [20, 4], fF: [34, 0], fB: [-24, 0], gF: claw })),
    };
    M.light2 = {
      name: 'Cross', normal: true, startup: 5, active: 3, recovery: 10, dmg: 50 * d, hitstun: 16, blockstun: 12, kb: 5, level: 'high',
      hit: [30, 110, -196, -150], hitstop: 7, power: 1, whoosh: 3, trail: 'hB', vel: [[2, 7, 3]],
      chain: { heavy: 'heavy', kick: 'kick', light: 'light3' },
      anim: atk(st, 5, 3, 10, P({ y: -103, lean: 4, tw: 10, hF: [26, -6], hB: [8, 0], fF: [28, 0], fB: [-24, 0] }),
        P({ y: -101, x: 10, lean: 16, head: -4, tw: -3, hF: [18, 6], hB: [86, -12], fF: [38, 0], fB: [-26, 0], gB: claw })),
    };
    M.light3 = {
      name: 'Rising Elbow', normal: true, startup: 6, active: 4, recovery: 17, dmg: 55 * d, hitstun: 22, blockstun: 14, kb: 4, level: 'mid',
      hit: [20, 90, -230, -140], hitstop: 8, power: 2, whoosh: 4, trail: 'hF', launch: true, launchVy: -14, airKb: 3, jumpCancel: true,
      chain: {},
      anim: atk(st, 6, 4, 17, P({ y: -96, lean: 18, hF: [10, 20], hB: [24, 0], fF: [30, 0], fB: [-26, 0] }),
        P({ y: -110, x: 10, lean: -4, head: -12, hF: [30, -60], hB: [14, 10], fF: [36, 0], fB: [-20, 0], aB: 20 })),
    };
    M.heavy = {
      name: 'Haymaker', normal: true, startup: 9, active: 4, recovery: 16, dmg: 90 * d, hitstun: 20, blockstun: 16, kb: 10, level: 'high',
      hit: [30, 110, -205, -145], hitstop: 10, power: 2, whoosh: 6, whooshHeavy: true, trail: 'hF', bfChance: 0.05, vel: [[4, 10, 4]], krush: 'counter',
      chain: { kick: 'kick' },
      anim: atk(st, 9, 4, 16, P({ y: -102, x: -4, lean: -8, tw: 10, hF: [-20, -6], hB: [28, -4], fF: [24, 0], fB: [-30, 0] }),
        P({ y: -100, x: 16, lean: 22, head: 0, tw: -6, hF: [76, -26], hB: [14, 10], fF: [46, 0], fB: [-26, 0], gF: claw }),
        P({ y: -100, x: 16, lean: 26, head: 2, tw: -6, hF: [62, 8], hB: [14, 10], fF: [46, 0], fB: [-26, 0], gF: claw })),
    };
    M.kick = {
      name: 'Roundhouse', normal: true, startup: 8, active: 4, recovery: 14, dmg: 75 * d, hitstun: 20, blockstun: 14, kb: 7, level: 'mid',
      hit: [40, 138, -160, -95], hitstop: 8, power: 2, whoosh: 5, trail: 'fF', bfChance: 0.04,
      chain: { kick: 'kick2' },
      anim: atk(st, 8, 4, 14, P({ y: -110, lean: -4, hF: [26, -14], hB: [0, 10], fF: [26, -56], fB: [-16, 0], aF: 40 }),
        P({ y: -112, x: -4, lean: -24, head: 8, hF: [20, -4], hB: [-26, 12], fF: [128, -124], aF: 78, fB: [-12, 0] })),
    };
    // L, L: the string ender blasts them across the stage (wall splats!)
    M.kick2 = {
      name: 'Spinning Heel', normal: true, startup: 8, active: 4, recovery: 20, dmg: 70 * d, hitstun: 22, blockstun: 16, kb: 12, level: 'mid',
      hit: [30, 150, -215, -120], hitstop: 11, power: 3, whoosh: 5, whooshHeavy: true, trail: 'fB', knockdown: true, knockVy: -9, airKb: 12, bfChance: 0.05,
      chain: {},
      anim: seq([0, P({ y: -112, x: -4, lean: -24, head: 8, hF: [20, -4], hB: [-26, 12], fF: [60, -60], aF: 60, fB: [-12, 0] })],
        [5, P({ y: -106, x: 4, lean: 18, head: 14, rot: 0, hF: [30, 10], hB: [-10, 20], fF: [10, 0], fB: [-50, -40], aB: 40 }), 'outQuad'],
        [8, P({ y: -112, x: 6, lean: -30, head: 10, hF: [10, 10], hB: [-30, 0], fF: [-10, 0], fB: [120, -150], aB: 80 }), 'outExpo'],
        [14, P({ y: -112, x: 6, lean: -30, head: 10, hF: [10, 10], hB: [-30, 0], fF: [-10, 0], fB: [118, -146], aB: 80 })],
        [32, st, 'inOut']),
    };
    // ← + L: a long pushback kick to make space
    M.bkick = {
      name: 'Push Kick', normal: true, startup: 9, active: 4, recovery: 16, dmg: 60 * d, hitstun: 18, blockstun: 14, kb: 14, level: 'mid',
      hit: [40, 150, -150, -80], hitstop: 8, power: 2, whoosh: 6, trail: 'fF', chain: {},
      anim: atk(st, 9, 4, 16, P({ y: -108, lean: -10, hF: [20, -14], hB: [0, 6], fF: [30, -60], aF: 40, fB: [-20, 0] }),
        P({ y: -110, x: -6, lean: -20, head: 6, hF: [14, -6], hB: [-20, 10], fF: [142, -70], aF: 90, fB: [-18, 0] })),
    };
    M.fheavy = {
      name: 'Overhead Smash', normal: true, startup: 16, active: 3, recovery: 18, dmg: 85 * d, hitstun: 22, blockstun: 16, kb: 7, level: 'overhead',
      hit: [40, 115, -205, -70], hitstop: 10, power: 2, whoosh: 12, whooshHeavy: true, trail: 'hF', vel: [[5, 15, 5]], krush: 'counter',
      chain: {},
      anim: atk(st, 16, 3, 18, P({ y: -112, lean: -16, head: -12, hF: [16, -76], hB: [6, -72], fF: [26, 0], fB: [-24, 0] }),
        P({ y: -84, x: 20, lean: 42, head: 12, hF: [66, 52], hB: [58, 56], fF: [52, 0], fB: [-24, 0] })),
      onFrame: (f, t) => { if (t === 16) { FX.shockwave(f.x + f.facing * 90, 0, '#ffffff', 0.6); f.game.shake(4, 6); } },
    };
    M.clight = {
      name: 'Low Jab', normal: true, crouch: true, startup: 4, active: 3, recovery: 8, dmg: 30 * d, hitstun: 14, blockstun: 10, kb: 4, level: 'mid',
      hit: [28, 98, -130, -90], hitstop: 5, power: 1, whoosh: 3,
      chain: { light: 'clight', heavy: 'uppercut', kick: 'sweep' },
      anim: atk(cr, 4, 3, 8, null, P(cr, { x: 4, lean: 20, hF: [74, 4], gF: claw })),
    };
    M.uppercut = {
      name: 'Uppercut', normal: true, startup: 9, active: 5, recovery: 26, dmg: 110 * d, hitstun: 30, blockstun: 16, kb: 3, level: 'mid',
      hit: [10, 80, -270, -120], hitstop: 11, power: 3, whoosh: 7, whooshHeavy: true, trail: 'hF', launch: true, launchVy: -18, airKb: 3,
      bfChance: 0.06, jumpCancel: true, chain: {}, krush: 'cp',
      anim: atk(cr, 9, 5, 26, P(cr, { y: -64, lean: 22, hF: [4, 22], hB: [26, -4] }),
        P({ y: -118, x: 10, lean: -8, head: -14, hF: [26, -88], hB: [10, 12], fF: [32, -4], fB: [-20, 0], aF: 10, gF: claw })),
    };
    M.sweep = {
      name: 'Sweep', normal: true, crouch: true, startup: 9, active: 4, recovery: 22, dmg: 70 * d, hitstun: 20, blockstun: 14, kb: 4, level: 'low',
      hit: [50, 152, -36, 0], hitstop: 8, power: 2, whoosh: 7, trail: 'fF', knockdown: true, knockVy: -6, airKb: 2, hurt: [-30, 40, -100, 0],
      chain: {},
      anim: atk(cr, 9, 4, 22, P(cr, { y: -58, lean: 12 }),
        P({ y: -46, x: -6, lean: -32, head: -6, hF: [-8, 58], hB: [-30, 52], gF: 'open', gB: 'open', fF: [146, -4], aF: 86, fB: [-30, 0] })),
    };
    M.jlight = {
      name: 'Air Jab', normal: true, air: true, startup: 5, active: 7, recovery: 8, dmg: 50 * d, hitstun: 16, blockstun: 12, kb: 4, level: 'overhead',
      hit: [20, 98, -180, -110], hitstop: 6, power: 1, whoosh: 3, trail: 'hF', chain: { heavy: 'jheavy', kick: 'jkick' },
      anim: atk(jp, 5, 7, 8, null, P(jp, { lean: 14, hF: [72, 22], gF: claw })),
    };
    M.jheavy = {
      name: 'Air Hammer', normal: true, air: true, startup: 8, active: 6, recovery: 10, dmg: 85 * d, hitstun: 20, blockstun: 14, kb: 6, level: 'overhead',
      hit: [20, 104, -170, -70], hitstop: 9, power: 2, whoosh: 6, trail: 'hF', chain: {}, bfChance: 0.04,
      anim: atk(jp, 8, 6, 10, P(jp, { hF: [10, -62], hB: [4, -58], lean: -12 }), P(jp, { hF: [66, 42], hB: [58, 46], lean: 32 })),
    };
    M.jkick = {
      name: 'Flying Kick', normal: true, air: true, startup: 7, active: 10, recovery: 6, dmg: 75 * d, hitstun: 18, blockstun: 14, kb: 7, level: 'overhead',
      hit: [30, 120, -90, -10], hitstop: 8, power: 2, whoosh: 5, trail: 'fF', chain: {},
      anim: atk(jp, 7, 10, 6, null, P({ y: -110, lean: -16, head: 0, hF: [20, -22], hB: [-22, -12], fF: [104, -40], aF: 72, fB: [-10, -52], aB: 40 })),
    };
    // Flawless Block Attack: K right after a Just Guard. Fast, invulnerable, knocks them away.
    M.fba = {
      name: 'Flawless Block Attack', startup: 5, active: 4, recovery: 20, dmg: 65 * d, hitstun: 22, blockstun: 14, kb: 13, level: 'mid', invuln: 10,
      hit: [20, 130, -220, -80], hitstop: 12, power: 3, whoosh: 3, whooshHeavy: true, trail: 'hF', trailColor: '#c8f0ff', knockdown: true, knockVy: -8, airKb: 11, noBF: true,
      anim: atk(st, 5, 4, 20, P({ y: -100, x: -6, lean: -6, tw: 10, hF: [-10, -10], hB: [26, -6], fF: [22, 0], fB: [-30, 0], gF: claw }),
        P({ y: -98, x: 18, lean: 24, head: -2, tw: -6, hF: [90, -24], hB: [10, 12], fF: [52, 0], fB: [-30, 0], gF: claw })),
      onStart: (f) => { f.ghostT = 12; FX.text(f.x, f.y - 280, 'FLAWLESS BLOCK', { size: 32, font: JK.FONT_TITLE, color: '#c8f0ff', life: 36 }); SFX('dash'); },
    };
    M.throw = {
      name: 'Throw', startup: 5, active: 3, recovery: 26, dmg: 0, level: 'throw', throw: true, hit: [20, 88, -200, -60],
      anim: atk(st, 5, 3, 26, null, P({ y: -104, x: 8, lean: 14, hF: [64, -12], hB: [58, -2], gF: 'open', gB: 'open', fF: [36, 0], fB: [-24, 0] })),
      onThrow: (att, def, g) => {
        att.startMove('throwHit');
        def.setState('thrown');
        def.move = null;
        att.throwVictim = def;
        def.thrower = att;
        SFX('throwGrab');
      },
    };
    M.throwHit = {
      name: 'Throw', startup: 40, active: 0, recovery: 14, dmg: 0,
      anim: seq(
        [0, P({ y: -104, x: 8, lean: 14, hF: [64, -12], hB: [58, -2], gF: 'open', gB: 'open', fF: [36, 0], fB: [-24, 0] })],
        [14, P({ y: -110, x: 0, lean: -10, head: -10, hF: [40, -70], hB: [30, -64], gF: 'open', gB: 'open', fF: [28, 0], fB: [-26, 0] }), 'outQuad'],
        [24, P({ y: -90, x: 16, lean: 40, head: 10, hF: [70, 40], hB: [60, 44], gF: 'open', gB: 'open', fF: [50, 0], fB: [-26, 0] }), 'inCubic'],
        [54, st]),
      onFrame: (att, t, g) => {
        const v = att.throwVictim;
        if (!v) return;
        // throw escape: press throw (or J+L) right as you're grabbed
        if (t >= 2 && t <= 11 && (v.pressed('throw') || (v.pressed('light') && v.pressed('kick')))) {
          v.consume('throw'); v.consume('light'); v.consume('kick');
          att.throwVictim = null; v.thrower = null;
          v.y = 0; v.setState('blockstun'); v.hs = 14; v.vx = att.facing * 9;
          att.move = null; att.setState('blockstun'); att.hs = 14; att.vx = -att.facing * 9;
          FX.add({ type: 'flash', x: (att.x + v.x) / 2, y: att.y - 120, r: 120, color: '#ffffff', life: 10 });
          FX.text((att.x + v.x) / 2, att.y - 270, 'THROW ESCAPE', { size: 36, font: JK.FONT_TITLE, color: '#ffffff', life: 40 });
          SFX('block'); SFX('whoosh');
          g.shake(6, 8);
          return;
        }
        const back = !!att.throwBack;
        if (t < 24) {
          const J = att.J;
          v.x = att.x + att.facing * (J.haF.x + 10);
          v.y = Math.min(0, J.haF.y + 120);
          v.facing = -att.facing;
          if (back && t >= 10) {
            // back throw: swing them over your head to the other side
            const k = JK.ease.inOut(Math.min(1, (t - 10) / 13));
            v.x = att.x + att.facing * (J.haF.x + 10) * (1 - 2 * k);
            v.y = -Math.sin(k * Math.PI) * 190;
            v.facing = att.facing * (k > 0.5 ? 1 : -1);
          }
        }
        if (att.ch.throwFx) att.ch.throwFx(att, v, t, g);
        if (t === 24) {
          v.setState('idle');
          att.throwVictim = null;
          v.thrower = null;
          if (back) { v.x = att.x - att.facing * 70; v.y = Math.min(v.y, -20); }
          v.receive(att, { dmg: 110 * (att.ch.dmgScale || 1), level: 'unblockable', knockdown: true, knockVy: -9, airKb: 7, kb: 8, hitstop: 10, power: 3, sfx: 'hit' },
            v.x, v.y - 120, { sureHit: true, dir: back ? -att.facing : att.facing });
          FX.shockwave(v.x, 0, '#ffffff', 0.8);
          g.shake(8, 10);
        }
      },
    };
    return M;
  }

  // ------------------------------------------------------------------ projectile visuals
  function drawBlue(ctx, p) {
    const r = p.r * (0.9 + Math.sin(p.t * 0.5) * 0.08) * Math.min(1, p.t / 8);
    JK.drawGlow(ctx, '#1f5bff', p.x, p.y, r * 4.2, 0.85);
    JK.drawGlow(ctx, '#7fd0ff', p.x, p.y, r * 2.2, 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.strokeStyle = JK.rgba(i % 2 ? '#bfeaff' : '#4aa8ff', 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.1 + (i % 3) * 0.25), p.t * 0.35, p.t * 0.35 + 1.6);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#06103a';
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2); ctx.stroke();
  }
  function drawRed(ctx, p) {
    const r = p.r * (0.95 + Math.sin(p.t * 0.9) * 0.08);
    for (let i = 1; i <= 4; i++) JK.drawGlow(ctx, '#ff2020', p.x - p.dir * i * 22, p.y, r * (2.4 - i * 0.35), 0.35);
    JK.drawGlow(ctx, '#ff1a1a', p.x, p.y, r * 3.4, 0.9);
    JK.drawGlow(ctx, '#ffb0a0', p.x, p.y, r * 1.6, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y);
    ctx.rotate(p.t * 0.25);
    ctx.fillStyle = 'rgba(255,90,70,0.8)';
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(r * 0.6, -4); ctx.lineTo(r * 1.9, 0); ctx.lineTo(r * 0.6, 4); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff2ee';
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  function drawPurple(ctx, p) {
    const r = p.r * Math.min(1, p.t / 6);
    JK.drawGlow(ctx, '#7a1cff', p.x, p.y, r * 3.2, 0.9);
    const grd = ctx.createRadialGradient(p.x, p.y, r * 0.1, p.x, p.y, r);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.35, '#e6c8ff');
    grd.addColorStop(0.7, '#9b3cff');
    grd.addColorStop(1, '#3a0680');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,220,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      ctx.strokeStyle = 'rgba(210,150,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      ctx.lineTo(p.x + Math.cos(a + 0.2) * r * 1.5, p.y + Math.sin(a + 0.2) * r * 1.5);
      ctx.lineTo(p.x + Math.cos(a - 0.1) * r * 1.9, p.y + Math.sin(a - 0.1) * r * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawDismantle(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);
    ctx.rotate(p.tilt || 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = JK.rgba('#ff6070', 0.35 - i * 0.1);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-30 - i * 40, -20 + i * 14); ctx.lineTo(-110 - i * 40, -20 + i * 14); ctx.stroke();
    }
    JK.drawGlow(ctx, '#ff2a40', 0, 0, 90, 0.5);
    ctx.fillStyle = 'rgba(255,240,245,0.95)';
    ctx.beginPath();
    ctx.moveTo(-6, -70);
    ctx.quadraticCurveTo(34, 0, -6, 70);
    ctx.quadraticCurveTo(16, 0, -6, -70);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,60,80,0.9)'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  function drawFuga(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);
    JK.drawGlow(ctx, '#ff5a1a', 0, 0, 170, 0.8);
    JK.drawGlow(ctx, '#ffd070', 10, 0, 80, 0.9);
    ctx.globalCompositeOperation = 'lighter';
    const fl = Math.sin(p.t * 0.8) * 4;
    ctx.fillStyle = 'rgba(255,120,40,0.9)';
    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.quadraticCurveTo(10, -30 - fl, -90, -12);
    ctx.quadraticCurveTo(-60, 0, -90, 12);
    ctx.quadraticCurveTo(10, 30 + fl, 70, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,1)';
    ctx.beginPath();
    ctx.moveTo(62, 0);
    ctx.quadraticCurveTo(10, -12, -40, -4);
    ctx.lineTo(-40, 4);
    ctx.quadraticCurveTo(10, 12, 62, 0);
    ctx.fill();
    ctx.restore();
  }
  // Shikigami ---------------------------------------------------------
  function outline(ctx, fill) {
    ctx.lineWidth = 3; ctx.strokeStyle = '#0a0a12'; ctx.lineJoin = 'round';
    ctx.stroke(); ctx.fillStyle = fill; ctx.fill();
  }
  function drawWolf(ctx, x, y, dir, t, white) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const run = Math.sin(t * 0.6);
    const body = white ? '#e9e9f2' : '#16161f';
    const mark = white ? '#16161f' : '#e9e9f2';
    JK.drawGlow(ctx, '#5a4bd6', 0, 0, 90, 0.35);
    // back legs
    ctx.beginPath(); ctx.moveTo(-34, 4); ctx.lineTo(-44 - run * 14, 40); ctx.lineTo(-36 - run * 14, 42); ctx.lineTo(-24, 8); ctx.closePath(); outline(ctx, body);
    ctx.beginPath(); ctx.moveTo(26, 4); ctx.lineTo(34 + run * 14, 40); ctx.lineTo(42 + run * 14, 40); ctx.lineTo(36, 4); ctx.closePath(); outline(ctx, body);
    // body
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 20, -0.05, 0, Math.PI * 2); outline(ctx, body);
    // tail
    ctx.beginPath(); ctx.moveTo(-42, -6); ctx.quadraticCurveTo(-70, -24 + run * 6, -80, -10); ctx.quadraticCurveTo(-64, -8, -44, 4); outline(ctx, body);
    // front legs
    ctx.beginPath(); ctx.moveTo(-28, 8); ctx.lineTo(-30 + run * 16, 42); ctx.lineTo(-22 + run * 16, 42); ctx.lineTo(-16, 10); ctx.closePath(); outline(ctx, body);
    ctx.beginPath(); ctx.moveTo(30, 8); ctx.lineTo(28 - run * 16, 42); ctx.lineTo(36 - run * 16, 42); ctx.lineTo(40, 6); ctx.closePath(); outline(ctx, body);
    // head
    ctx.beginPath();
    ctx.moveTo(34, -10); ctx.lineTo(52, -30); ctx.lineTo(56, -44); ctx.lineTo(62, -30); ctx.lineTo(86, -18); ctx.lineTo(84, -8); ctx.lineTo(56, -2); ctx.closePath();
    outline(ctx, body);
    ctx.fillStyle = mark;
    ctx.beginPath(); ctx.moveTo(56, -24); ctx.lineTo(70, -20); ctx.lineTo(60, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffdd55';
    ctx.beginPath(); ctx.arc(66, -22, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawNue(ctx, x, y, dir, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const flap = Math.sin(t * 0.5);
    JK.drawGlow(ctx, '#9ad8ff', 0, 0, 120, 0.4);
    // wings
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-40, -60 * s * flap - 20, -110, -50 * flap * s - 10);
      ctx.lineTo(-80, -10 * flap * s);
      ctx.lineTo(-96, 10 - 20 * flap * s);
      ctx.lineTo(-60, 14);
      ctx.closePath();
      outline(ctx, s > 0 ? '#1d1a2c' : '#2b2740');
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2); outline(ctx, '#2b2740');
    // mask face
    ctx.beginPath(); ctx.ellipse(30, -6, 14, 14, 0, 0, Math.PI * 2); outline(ctx, '#e8e2d6');
    ctx.fillStyle = '#b01020'; ctx.beginPath(); ctx.arc(34, -8, 3, 0, Math.PI * 2); ctx.fill();
    // talons
    ctx.strokeStyle = '#d8c070'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(18, 34); ctx.moveTo(-4, 16); ctx.lineTo(4, 34); ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.5) FX.add({ type: 'bolt', x1: x, y1: y, x2: x + (Math.random() - 0.5) * 140, y2: y + (Math.random() - 0.5) * 100, w: 1.5, jag: 16, seg: 5, color: '#e8f6ff', glow: '#3aa8ff', life: 5 });
  }
  function drawToad(ctx, x, y, dir, t, tongue) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.beginPath(); ctx.ellipse(0, -30, 44, 32, 0, 0, Math.PI * 2); outline(ctx, '#3c4a3a');
    ctx.beginPath(); ctx.ellipse(-6, -34, 30, 18, 0, 0, Math.PI * 2); ctx.fillStyle = '#566a52'; ctx.fill();
    ctx.beginPath(); ctx.arc(20, -58, 10, 0, Math.PI * 2); outline(ctx, '#e7e2b0');
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(22, -58, 4, 0, Math.PI * 2); ctx.fill();
    if (tongue > 0) {
      ctx.strokeStyle = '#0a0a12'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(36, -30); ctx.lineTo(36 + tongue * 0.45, -30 - tongue); ctx.stroke();
      ctx.strokeStyle = '#d0506a'; ctx.lineWidth = 8;
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.restore();
  }
  function drawElephant(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    JK.drawGlow(ctx, '#6ac8ff', 0, 40, 200, 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, 110, 70, 0, 0, Math.PI * 2); outline(ctx, '#6c6f7e');
    for (const lx of [-70, -30, 30, 70]) { ctx.beginPath(); JK.roundRect(ctx, lx - 16, 30, 32, 60, 8); outline(ctx, '#5c5f6e'); }
    ctx.beginPath(); ctx.ellipse(80, -30, 50, 44, 0, 0, Math.PI * 2); outline(ctx, '#6c6f7e');
    ctx.beginPath(); ctx.moveTo(116, -20); ctx.quadraticCurveTo(150, 30, 130, 80); ctx.lineTo(116, 76); ctx.quadraticCurveTo(128, 30, 104, 0); outline(ctx, '#6c6f7e');
    ctx.beginPath(); ctx.ellipse(56, -30, 30, 38, 0.2, 0, Math.PI * 2); outline(ctx, '#7a7d8c');
    ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.moveTo(110, 4); ctx.lineTo(140, 20); ctx.lineTo(112, 14); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(98, -40, 4, 0, Math.PI * 2); ctx.fill();
    // mask markings
    ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(84, -60); ctx.lineTo(110, -50); ctx.stroke();
    ctx.restore();
  }
  JK.drawShiki = { wolf: drawWolf, nue: drawNue, toad: drawToad, elephant: drawElephant };

  // ------------------------------------------------------------------ helpers for specials
  function handPos(f, which = 'haF') {
    const J = f.J;
    return { x: f.x + J[which].x * f.facing, y: f.y + J[which].y };
  }
  function spawn(f, o) {
    const p = new JK.Projectile(Object.assign({ owner: f, amp: f.amp }, o));
    f.game.projectiles.push(p);
    return p;
  }

  // ================================================================== GOJO
  function gojoMoves(ch, M, st) {
    const pocket = { gB: 'pocket', hB: [-4, 70] };
    M.t1 = {
      name: 'Lapse: Blue', special: true, startup: 16, active: 1, recovery: 22, dmg: 0,
      anim: seq([0, st], [10, P({ y: -106, lean: 2, head: -6, hF: [40, -40], gF: 'point', fF: [22, 0], fB: [-20, 0], ...pocket }), 'outQuad'],
        [16, P({ y: -104, x: 4, lean: 8, head: -4, hF: [72, -20], gF: 'point', fF: [28, 0], fB: [-20, 0], ...pocket }), 'outExpo'], [30, P({ y: -104, x: 4, lean: 8, hF: [70, -18], gF: 'point', fF: [28, 0], fB: [-20, 0], ...pocket })], [39, st]),
      onStart: (f) => { SFX('charge', 400, 0.3); },
      onFrame: (f, t, g) => {
        if (t < 16 && t % 2 === 0) { const h = handPos(f); FX.add({ type: 'dot', x: h.x, y: h.y, vx: 0, vy: 0, r: 14 + t, color: '#4aa8ff', life: 8 }); }
        if (t === 16) {
          SFX('blue');
          const x = f.x + f.facing * 170, y = f.y - 150;
          spawn(f, {
            kind: 'blue', x, y, r: 34, w: 110, h: 150, vx: f.facing * 2.4, life: 76, hits: 7, every: 8, dmg: 12, kb: -3, hitstun: 14, blockstun: 12, hitstop: 2, power: 1,
            sparkColor: '#6fc8ff', prio: 2, pierce: true, chip: 3, sfx: 'hit',
            u: (p, g2) => {
              p.x += p.vx; p.vx *= 0.99;
              const o = p.owner.opp;
              if (o && o.state !== 'knockdown' && o.state !== 'ko' && o.invuln <= 0) {
                const dx = p.x - o.x;
                if (Math.abs(dx) < 460 && Math.abs(dx) > 30) o.x += Math.sign(dx) * (o.state === 'block' || o.state === 'blockstun' ? 1.6 : 2.6);
              }
              if (p.t % 2 === 0) {
                FX.add({ type: 'swirl', cx: p.x, cy: p.y, ang: Math.random() * 6.28, rad: 120 + Math.random() * 60, spin: 0.12, pull: 3.4, r: 6 + Math.random() * 8, color: JK.pick(['#8fd8ff', '#3f7bff', '#ffffff']), life: 36, x: p.x, y: p.y });
              }
              if (p.t % 10 === 0) FX.debris(p.x + (Math.random() - 0.5) * 100, 0, 1, '#556');
            },
            d: drawBlue,
            onDeath: (p, g2) => {
              FX.add({ type: 'ring', x: p.x, y: p.y, r0: 120, r1: 4, w: 6, color: '#8fd8ff', life: 14 });
              FX.add({ type: 'flash', x: p.x, y: p.y, r: 140, color: '#4aa8ff', life: 12 });
              SFX('explosion', 0.6);
              // final implosion hits anyone caught in the pull
              const o = p.owner.opp;
              if (o && Math.abs(o.x - p.x) < 120 && o.hurtboxes().length) {
                o.receive(p.owner, { dmg: 45, kb: 5, knockdown: true, knockVy: -8, airKb: 4, hitstun: 20, blockstun: 14, hitstop: 8, power: 2, special: true, sparkColor: '#6fc8ff', chip: 6 }, o.x, o.y - 130, { projectile: true, dir: Math.sign(o.x - p.x) || p.dir });
              }
            },
          });
        }
      },
    };
    M.t2 = {
      name: 'Reversal: Red', special: true, startup: 22, active: 1, recovery: 22, dmg: 0,
      anim: seq([0, st], [16, P({ y: -104, lean: -2, head: -8, hF: [30, -40], gF: 'point', fF: [22, 0], fB: [-22, 0], ...pocket }), 'outQuad'],
        [22, P({ y: -102, x: 8, lean: 12, head: -4, hF: [78, -24], gF: 'point', fF: [34, 0], fB: [-22, 0], ...pocket }), 'outExpo'], [34, P({ y: -102, x: 8, lean: 10, hF: [70, -20], gF: 'point', fF: [34, 0], fB: [-22, 0], ...pocket })], [45, st]),
      onStart: (f) => { SFX('charge', 250, 0.35); },
      onFrame: (f, t, g) => {
        if (t < 22) { const h = handPos(f); JK.FX.add({ type: 'dot', x: h.x + (Math.random() - 0.5) * 40, y: h.y + (Math.random() - 0.5) * 40, vx: 0, vy: 0, r: 8 + t * 0.6, color: '#ff2a2a', life: 10 }); }
        if (t === 22) {
          SFX('red');
          g.shake(6, 8);
          const h = handPos(f);
          FX.add({ type: 'flash', x: h.x, y: h.y, r: 120, color: '#ff3030', life: 10 });
          FX.add({ type: 'ring', x: h.x, y: h.y, r0: 10, r1: 110, w: 8, color: '#ff4040', life: 14 });
          f.vx = -f.facing * 6;
          spawn(f, {
            kind: 'red', x: h.x + f.facing * 30, y: h.y, r: 26, w: 70, h: 70, vx: f.facing * 17, life: 70, dmg: 84, kb: 14, knockdown: true, knockVy: -9, airKb: 12,
            hitstun: 24, blockstun: 18, hitstop: 12, power: 3, sparkColor: '#ff4040', prio: 2, chip: 11,
            u: (p) => { p.x += p.vx; if (p.t % 2 === 0) FX.add({ type: 'dot', x: p.x - p.dir * 20, y: p.y + (Math.random() - 0.5) * 20, vx: -p.dir * 2, vy: 0, r: 16, color: '#ff3a2a', life: 12 }); },
            d: drawRed,
            onDeath: (p) => { FX.explosion(p.x, p.y, 0.7, '#ff3a2a'); SFX('explosion', 0.8); },
          });
        }
      },
    };
    M.t1d = {
      name: 'Teleport', special: true, startup: 10, active: 1, recovery: 19, dmg: 0, invuln: 16,
      anim: seq([0, st], [6, P(st, { lean: 10 })], [12, st], [22, st]),
      onStart: (f) => { SFX('teleport'); FX.add({ type: 'ring', x: f.x, y: f.y - 110, r0: 60, r1: 4, w: 4, color: '#8fd8ff', life: 10 }); },
      onFrame: (f, t, g) => {
        if (t === 4) f.hidden = true;
        if (t === 10) {
          const o = f.opp;
          const side = Math.sign(o.x - f.x) || 1;
          const b = g.bounds(f);
          let nx = o.x + side * 95;
          if (nx < b.min || nx > b.max) nx = o.x - side * 95;
          f.x = JK.clamp(nx, b.min, b.max);
          f.hidden = false;
          f.faceOpp();
          FX.add({ type: 'ring', x: f.x, y: f.y - 110, r0: 4, r1: 80, w: 4, color: '#8fd8ff', life: 12 });
          FX.add({ type: 'flash', x: f.x, y: f.y - 110, r: 90, color: '#6fc8ff', life: 8 });
        }
      },
    };
    // Hollow Purple: a full super-freeze cinematic. "Kyoshiki... Murasaki" plays while Blue and Red
    // form in each hand, collide, and the erasing mass is released on frame 108.
    const hpOpen = P({ y: -106, lean: 0, head: -8, hF: [46, -30], hB: [-46, -26], gF: 'point', gB: 'point', fF: [26, 0], fB: [-26, 0] });
    const hpRaise = P({ y: -108, lean: -4, head: -12, hF: [50, -44], hB: [-50, -40], gF: 'point', gB: 'point', fF: [26, 0], fB: [-26, 0] });
    const hpJoin = P({ y: -106, lean: 4, head: -4, hF: [46, -26], hB: [40, -24], gF: 'point', gB: 'point', fF: [26, 0], fB: [-24, 0] });
    const hpFire = P({ y: -102, x: 12, lean: 16, head: -2, hF: [88, -18], hB: [-14, 22], gF: 'point', gB: 'open', fF: [42, 0], fB: [-26, 0] });
    M.t3 = {
      name: 'Hollow Purple', special: true, cost: 200, startup: 108, active: 1, recovery: 28, dmg: 0, invuln: 112,
      anim: seq([0, st], [18, hpOpen, 'outQuad'], [70, hpRaise, 'inOut'], [92, hpJoin, 'inCubic'], [108, hpFire, 'outExpo'], [126, hpFire], [136, st]),
      onStart: (f, g) => {
        f.eyesOpen = true;
        g.superFreeze(f, 100);
        g.cutIn(f, 'HOLLOW PURPLE', '虚式「茈」');
        f.purpleClip = JK.settings.ost !== false && JK.Audio.playClip('hollow_purple', { offset: 0 });
        if (!f.purpleClip) { SFX('purpleCharge'); JK.Audio.say('Hollow purple', { rate: 0.9, pitch: 0.7 }); }
        SFX('riser', 1.7);
      },
      onFrame: (f, t, g) => {
        const hf = handPos(f, 'haF'), hb = handPos(f, 'haB');
        if (t < 92) {
          const grow = Math.min(1, t / 60);
          // Lapse: Blue gathering in one hand, Reversal: Red in the other
          FX.add({ type: 'dot', x: hb.x, y: hb.y, vx: 0, vy: 0, r: 40 + grow * 55, color: '#2f6bff', life: 3 });
          FX.add({ type: 'dot', x: hb.x, y: hb.y, vx: 0, vy: 0, r: 14 + grow * 18, color: '#dff6ff', life: 3 });
          FX.add({ type: 'dot', x: hf.x, y: hf.y, vx: 0, vy: 0, r: 40 + grow * 55, color: '#ff2020', life: 3 });
          FX.add({ type: 'dot', x: hf.x, y: hf.y, vx: 0, vy: 0, r: 14 + grow * 18, color: '#fff0ee', life: 3 });
          if (t % 2 === 0) {
            FX.add({ type: 'swirl', cx: hb.x, cy: hb.y, ang: Math.random() * 6.28, rad: 90, spin: 0.2, pull: 3, r: 6, color: '#8fd8ff', life: 26, x: hb.x, y: hb.y });
            FX.add({ type: 'spark', x: hf.x, y: hf.y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, len: 16, w: 2, color: '#ff5040', life: 10 });
          }
          if (t > 40 && t % 6 === 0) FX.add({ type: 'bolt', x1: hb.x, y1: hb.y, x2: hf.x, y2: hf.y, w: 2, jag: 26, seg: 7, color: '#ffffff', glow: '#b060ff', life: 5 });
          if (t % 20 === 0) g.shake(3 + t / 20, 10);
        } else if (t < 108) {
          if (t === 92) { SFX('impact'); g.negFlash(2); g.shake(10, 16); FX.add({ type: 'ring', x: hf.x, y: hf.y, r0: 10, r1: 220, w: 10, color: '#c080ff', life: 16 }); }
          const k = (t - 92) / 16;
          FX.add({ type: 'dot', x: hf.x, y: hf.y, vx: 0, vy: 0, r: 60 + k * 90, color: '#9b3cff', life: 3 });
          FX.add({ type: 'dot', x: hf.x, y: hf.y, vx: 0, vy: 0, r: 20 + k * 30, color: '#ffffff', life: 3 });
          if (t % 2 === 0) FX.add({ type: 'bolt', x1: hf.x, y1: hf.y, x2: hf.x + (Math.random() - 0.5) * 220, y2: hf.y + (Math.random() - 0.5) * 220, w: 2.5, jag: 30, seg: 6, color: '#ffffff', glow: '#b060ff', life: 5 });
        }
        if (t === 108) {
          SFX('impact');
          SFX(f.purpleClip ? 'explosion' : 'purple', 1.2);
          g.negFlash(4);
          g.shake(24, 44);
          g.zoomPunch(0.14);
          g.flashScreen('#e8c0ff', 0.75, 14);
          f.vx = -f.facing * 10;
          spawn(f, {
            kind: 'purple', persist: true, x: hf.x + f.facing * 80, y: f.y - 140, r: 112, w: 220, h: 230, vx: f.facing * 15, life: 150, hits: 8, every: 5, dmg: 46,
            kb: 6, hitstun: 14, blockstun: 12, hitstop: 4, power: 3, sparkColor: '#c070ff', prio: 3, pierce: true, chip: 16, knockdownLast: true,
            u: (p, g2) => {
              // while it has someone caught, the sphere slows and grinds them at its core
              const grinding = p.hitCount > 0 && p.hitCount < p.hits;
              p.x += p.vx * (grinding ? 0.22 : 1);
              if (grinding) {
                const o = p.owner.opp;
                if (o.hurtboxes().length) o.x += (p.x - o.x) * 0.3;
                if (p.t % 2 === 0) FX.add({ type: 'spark', x: o.x, y: o.y - 120, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, len: 24, w: 3, color: '#e0b0ff', life: 10 });
              }
              for (let i = 0; i < 2; i++) FX.add({ type: 'dot', x: p.x - p.dir * (60 + Math.random() * 60), y: p.y + (Math.random() - 0.5) * 190, vx: -p.dir * 4, vy: 0, r: 30, color: JK.pick(['#9b3cff', '#e0b0ff', '#5a10b0']), life: 18 });
              if (p.t % 3 === 0) FX.debris(p.x, 0, 3, '#4a4458');
              if (p.t % 4 === 0) FX.add({ type: 'smoke', layer: 'back', x: p.x - p.dir * 40, y: -6, vx: 0, vy: -0.5, r: 30, color: '#1a1020', alpha: 0.6, life: 60 });
              if (p.t % 10 === 0) g2.shake(6, 8);
            },
            d: drawPurple,
            // the erasing mass drags its victim along so every hit connects
            onHit(att, def) { def.vx = this.vx * 0.98; if (def.state === 'juggle') def.vy = Math.min(def.vy, -3); },
            onDeath: (p) => { FX.explosion(p.x, p.y, 1.6, '#b060ff'); },
          });
        }
        if (t === 130) f.eyesOpen = false;
      },
    };
    M.domain = domainMove(ch, st, P({ y: -106, lean: 0, head: -6, hF: [14, -32], gF: 'sign', fF: [16, 0], fB: [-18, 0], ...pocket }));
    ch.throwFx = (att, v, t, g) => {
      if (t === 2) { FX.add({ type: 'ring', x: v.x, y: v.y - 110, r0: 80, r1: 6, w: 5, color: '#6fc8ff', life: 12 }); SFX('blue'); }
      if (t === 24) { FX.add({ type: 'flash', x: v.x, y: v.y - 110, r: 140, color: '#ff3030', life: 12 }); SFX('red'); }
    };
  }

  // ================================================================== SUKUNA
  function sukunaMoves(ch, M, st) {
    const dismantle = (f, air) => {
      SFX('slash');
      const h = handPos(f);
      spawn(f, {
        kind: 'dismantle', x: h.x + f.facing * 30, y: air ? f.y - 90 : f.y - 130, w: 60, h: 140, vx: f.facing * 21, vy: air ? 6 : 0, tilt: air ? 0.35 : 0,
        life: 50, dmg: 70, kb: 7, hitstun: 18, blockstun: 14, hitstop: 7, power: 2, sparkColor: '#ff4060', slashFx: true, sfx: 'slash', chip: 10,
        u: (p) => { p.x += p.vx; p.y += p.vy; if (p.y > -60) { p.y = -60; p.vy = 0; } },
        d: drawDismantle,
        onDeath: (p) => FX.slashMarks(p.x, p.y, 2, '#ff6070', 0.8),
      });
    };
    M.t1 = {
      name: 'Dismantle', special: true, startup: 12, active: 1, recovery: 18, dmg: 0,
      anim: seq([0, st], [8, P({ y: -104, lean: 0, head: -4, hF: [-10, -50], gF: 'claw', hB: [10, 40], gB: 'open', fF: [26, 0], fB: [-26, 0] }), 'outQuad'],
        [12, P({ y: -102, x: 8, lean: 16, head: 2, hF: [70, 20], gF: 'claw', hB: [0, 40], gB: 'open', fF: [36, 0], fB: [-26, 0] }), 'outExpo'], [24, P({ y: -102, x: 8, lean: 14, hF: [66, 24], gF: 'claw', hB: [0, 40], gB: 'open', fF: [36, 0], fB: [-26, 0] })], [31, st]),
      onFrame: (f, t) => { if (t === 12) dismantle(f, false); },
      trail: 'hF', trailColor: '#ff4060',
    };
    M.jt1 = {
      name: 'Air Dismantle', special: true, air: true, startup: 9, active: 1, recovery: 14, dmg: 0, float: 12,
      anim: seq([0, ch.poses.jump], [6, P(ch.poses.jump, { hF: [-10, -50], gF: 'claw' })], [9, P(ch.poses.jump, { hF: [70, 30], gF: 'claw', lean: 18 }), 'outExpo'], [24, ch.poses.jump]),
      onFrame: (f, t) => { if (t === 9) dismantle(f, true); },
    };
    M.t2 = {
      name: 'Cleave', special: true, startup: 14, active: 18, recovery: 20, hits: 6, hitEvery: 3, dmg: 22, hitstun: 20, blockstun: 10, kb: 1.5, level: 'mid',
      hit: [20, 100, -210, -60], hitstop: 3, power: 1, sparkColor: '#ff3050', slashFx: true, sfx: 'slash', chip: 4, vel: [[4, 14, 10]], ghost: true,
      anim: seq([0, st], [10, P({ y: -98, lean: 22, head: 0, hF: [10, 10], gF: 'open', hB: [-20, 30], gB: 'open', fF: [40, 0], fB: [-30, 0] }), 'outQuad'],
        [14, P({ y: -100, x: 14, lean: 18, head: 2, hF: [74, -10], gF: 'open', hB: [-10, 30], gB: 'open', fF: [44, 0], fB: [-26, 0] }), 'outExpo'],
        [32, P({ y: -100, x: 14, lean: 18, hF: [72, -8], gF: 'open', hB: [-10, 30], gB: 'open', fF: [44, 0], fB: [-26, 0] })], [52, st]),
      onFrame: (f, t, g) => {
        if (t === 14) SFX('cleave');
        if (t >= 14 && t < 32 && t % 3 === 0 && f.connected) {
          const o = f.opp;
          FX.slashMarks(o.x, o.y - 120, 1, '#ff5060', 1);
        }
      },
      onHit: (att, def, g) => {
        const last = att.mt >= 14 + 15;
        if (last) { def.setState('juggle'); def.vy = -8; def.vx = att.facing * 8; def.y = -2; }
      },
    };
    M.t1d = {
      name: 'Rising Cleave', special: true, startup: 7, active: 6, recovery: 26, dmg: 90, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 8,
      hit: [0, 90, -290, -80], hitstop: 10, power: 3, sparkColor: '#ff3050', slashFx: true, sfx: 'slash', launch: true, launchVy: -17, airKb: 4, chip: 10,
      anim: seq([0, st], [4, P(ch.poses.crouch, { hF: [30, 30], gF: 'claw' })], [7, P({ y: -120, x: 6, lean: -10, head: -12, hF: [30, -94], gF: 'claw', hB: [-10, 30], gB: 'open', fF: [30, -10], fB: [-16, 0], aF: 20 }), 'outExpo'], [20, P({ y: -120, x: 6, lean: -10, hF: [30, -90], gF: 'claw', hB: [-10, 30], gB: 'open', fF: [30, -10], fB: [-16, 0] })], [39, st]),
      onFrame: (f, t) => { if (t === 7) { FX.add({ type: 'slash', x: f.x + f.facing * 40, y: f.y - 190, ang: -Math.PI / 2 + f.facing * 0.3, len: 200, curve: 26, w: 8, color: '#ff3050', life: 14 }); SFX('slash', true); } },
    };
    M.t3 = {
      name: 'Divine Flame: Open', special: true, cost: 100, startup: 72, active: 1, recovery: 28, dmg: 0, invuln: 74,
      anim: seq([0, st],
        [30, P({ y: -104, lean: 0, head: -4, hF: [60, -20], hB: [30, -20], gF: 'open', gB: 'fist', fF: [30, 0], fB: [-28, 0] }), 'outQuad'],
        [68, P({ y: -104, lean: -4, head: -4, hF: [72, -22], hB: [-24, -18], gF: 'open', gB: 'fist', fF: [30, 0], fB: [-30, 0] }), 'inOut'],
        [72, P({ y: -102, x: 6, lean: 6, head: -2, hF: [76, -20], hB: [-30, -10], gF: 'open', gB: 'open', fF: [34, 0], fB: [-30, 0] }), 'outExpo'],
        [100, st]),
      onStart: (f, g) => {
        SFX('charge', 150, 0.6);
        g.superFreeze(f, 62);
        g.cutIn(f, 'DIVINE FLAME: OPEN', '竈「開」');
        // the voice line ends ~1.3s in; the arrow flies on frame 72 as the word finishes
        const clip = JK.settings.ost !== false && JK.Audio.playClip('fuga', { offset: 0 });
        if (!clip) JK.Audio.say('Open', { rate: 0.8, pitch: 0.3 });
      },
      onFrame: (f, t, g) => {
        if (t < 72) {
          const hf = handPos(f, 'haF'), hb = handPos(f, 'haB');
          for (let i = 0; i < 3; i++) FX.add({ type: 'flame', x: JK.lerp(hb.x, hf.x, Math.random()), y: JK.lerp(hb.y, hf.y, Math.random()), vx: 0, vy: -0.5, r: 12 + t * 0.35, life: 14 });
          if (t % 3 === 0) FX.add({ type: 'flame', x: f.x + (Math.random() - 0.5) * 160, y: -Math.random() * 40, vx: 0, vy: -3, r: 26, life: 26 });
        }
        if (t === 72) {
          SFX('fire');
          SFX('impact');
          g.negFlash(3);
          g.shake(18, 26);
          g.zoomPunch(0.1);
          const h = handPos(f);
          spawn(f, {
            kind: 'fuga', x: h.x + f.facing * 40, y: h.y, w: 150, h: 70, vx: f.facing * 18, life: 80, dmg: 240, kb: 12, knockdown: true, knockVy: -10, airKb: 11,
            hitstun: 26, blockstun: 20, hitstop: 14, power: 3, sparkColor: '#ff8a2a', prio: 3, burn: 150, chip: 30,
            u: (p) => { p.x += p.vx; for (let i = 0; i < 2; i++) FX.add({ type: 'flame', x: p.x - p.dir * (40 + Math.random() * 60), y: p.y + (Math.random() - 0.5) * 30, vx: -p.dir * 2, vy: -0.5, r: 20 + Math.random() * 14, life: 18 }); },
            d: drawFuga,
            onDeath: (p, g2) => { FX.explosion(p.x, p.y, 1.4, '#ff7a1a'); SFX('explosion', 1.2); g2.shake(12, 16); },
          });
        }
      },
    };
    M.domain = domainMove(ch, st, P({ y: -104, lean: 4, head: 2, hF: [34, -14], hB: [38, -12], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] }));
    ch.throwFx = (att, v, t, g) => {
      if (t > 4 && t < 24 && t % 4 === 0) { FX.slashMarks(v.x, v.y - 110, 1, '#ff4060', 0.8); SFX('slash'); }
    };
  }

  // ================================================================== YUJI
  function yujiMoves(ch, M, st) {
    M.t1 = {
      name: 'Divergent Fist', special: true, startup: 13, active: 4, recovery: 18, dmg: 70, hitstun: 26, blockstun: 16, kb: 6, level: 'mid',
      hit: [30, 110, -200, -120], hitstop: 8, power: 2, sparkColor: '#5aa8ff', vel: [[4, 13, 11]], ghost: true, trail: 'hF', trailColor: '#5aa8ff', bfChance: 0.08, chip: 8,
      anim: seq([0, st], [8, P({ y: -98, lean: 16, head: -6, hF: [-10, 0], hB: [30, -10], fF: [34, 0], fB: [-34, 0] }), 'outQuad'],
        [13, P({ y: -100, x: 16, lean: 20, head: -4, tw: 10, hF: [84, -16], hB: [16, 6], fF: [48, 0], fB: [-28, 0] }), 'outExpo'],
        [22, P({ y: -100, x: 16, lean: 18, hF: [80, -14], hB: [16, 6], fF: [48, 0], fB: [-28, 0] })], [35, st]),
      onHit: (att, def, g, bf) => {
        // delayed cursed-energy impact
        g.later(10, () => {
          if (def.state === 'ko' || def.invuln > 0) return;
          const src = { dmg: 55, hitstun: 20, kb: 10, level: 'unblockable', hitstop: 8, power: 2, sparkColor: '#4fa3ff', knockdown: def.y < -2, noBF: true };
          def.receive(att, src, def.x, def.y - 140, { sureHit: true, projectile: true, dir: att.facing });
          FX.add({ type: 'ring', x: def.x, y: def.y - 140, r0: 10, r1: 130, w: 8, color: '#4fa3ff', life: 16 });
          FX.text(def.x, def.y - 250, '逕庭拳', { size: 38, color: '#8fd0ff', life: 40 });
        });
      },
    };
    M.t2 = {
      name: 'Black Flash', special: true, startup: 18, active: 4, recovery: 20, dmg: 80, hitstun: 26, blockstun: 16, kb: 11, level: 'mid',
      hit: [30, 115, -205, -120], hitstop: 10, power: 3, sparkColor: '#ff3040', vel: [[8, 18, 6]], trail: 'hF', trailColor: '#ff2030', bfChance: 0.1, chip: 10,
      anim: seq([0, st], [12, P({ y: -100, x: -6, lean: -6, head: -8, tw: 12, hF: [-30, -10], hB: [30, -14], fF: [26, 0], fB: [-34, 0] }), 'outQuad'],
        [18, P({ y: -100, x: 18, lean: 22, head: -4, tw: -4, hF: [88, -22], hB: [14, 8], fF: [50, 0], fB: [-28, 0] }), 'outExpo'],
        [28, P({ y: -100, x: 18, lean: 20, hF: [82, -18], hB: [14, 8], fF: [50, 0], fB: [-28, 0] })], [42, st]),
      onStart: (f) => { f.bfForce = false; f.bfPrompt = true; },
      onFrame: (f, t, g) => {
        // the timing window: press the technique button again as the fist sparks
        if (t >= 11 && t <= 17) {
          const h = handPos(f);
          FX.add({ type: 'dot', x: h.x, y: h.y, vx: 0, vy: 0, r: 22, color: '#ff2030', life: 4 });
          if (t % 2 === 0) FX.add({ type: 'bolt', x1: h.x, y1: h.y, x2: h.x + (Math.random() - 0.5) * 70, y2: h.y + (Math.random() - 0.5) * 70, w: 2, jag: 10, seg: 4, life: 4 });
          if (f.ctrl.pressed.t2 || (f.ctrl.aiBF && t === f.ctrl.aiBF)) {
            f.bfForce = true;
            FX.add({ type: 'ring', x: h.x, y: h.y, r0: 50, r1: 4, w: 4, color: '#ff2030', life: 8 });
          }
        }
        if (t === 22) { f.bfForce = false; f.bfPrompt = false; }
      },
    };
    M.t1d = {
      name: 'Manji Kick', special: true, startup: 8, active: 5, recovery: 24, dmg: 85, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 6,
      hit: [10, 100, -270, -90], hitstop: 10, power: 3, sparkColor: '#5aa8ff', launch: true, launchVy: -17, airKb: 4, trail: 'fF', bfChance: 0.08, chip: 8,
      anim: seq([0, st], [4, ch.poses.crouch], [8, P({ y: -124, x: 0, lean: -34, head: -10, hF: [-20, 10], hB: [-30, 20], fF: [70, -200], aF: 60, fB: [-10, -20], aB: 30 }), 'outExpo'],
        [20, P({ y: -120, lean: -30, hF: [-20, 10], hB: [-30, 20], fF: [60, -190], aF: 60, fB: [-10, -20] })], [37, st]),
      vel: [[8, 14, 0, -6]], air: false,
    };
    M.t3 = {
      name: 'Cursed Barrage', special: true, cost: 100, startup: 12, active: 36, recovery: 24, hits: 9, hitEvery: 4, dmg: 25, hitstun: 22, blockstun: 8, kb: 1, level: 'mid',
      hit: [20, 110, -210, -90], hitstop: 3, power: 1, sparkColor: '#5aa8ff', vel: [[2, 12, 12]], ghost: true, chip: 3,
      anim: seq([0, st], [8, P({ y: -98, lean: 22, hF: [10, 10], hB: [-10, 10], fF: [40, 0], fB: [-30, 0] })],
        [12, P({ y: -100, x: 12, lean: 18, hF: [84, -20], hB: [20, 0], fF: [44, 0], fB: [-28, 0] }), 'outExpo'],
        [16, P({ y: -100, x: 12, lean: 18, hF: [20, 0], hB: [86, -10], tw: -4, fF: [44, 0], fB: [-28, 0] })],
        [20, P({ y: -100, x: 12, lean: 18, hF: [84, -24], hB: [20, 0], fF: [44, 0], fB: [-28, 0] })],
        [24, P({ y: -100, x: 12, lean: 18, hF: [20, 0], hB: [86, -16], tw: -4, fF: [44, 0], fB: [-28, 0] })],
        [28, P({ y: -100, x: 12, lean: 18, hF: [84, -10], hB: [20, 0], fF: [44, 0], fB: [-28, 0] })],
        [32, P({ y: -100, x: 12, lean: 18, hF: [20, 0], hB: [86, -20], tw: -4, fF: [44, 0], fB: [-28, 0] })],
        [36, P({ y: -100, x: 12, lean: 18, hF: [84, -16], hB: [20, 0], fF: [44, 0], fB: [-28, 0] })],
        [40, ch.poses.crouch],
        [44, P({ y: -120, x: 14, lean: -8, head: -14, hF: [28, -90], hB: [10, 12], fF: [34, -4], fB: [-20, 0] }), 'outExpo'],
        [60, P({ y: -118, x: 14, lean: -8, hF: [28, -88], hB: [10, 12], fF: [34, -4], fB: [-20, 0] })], [72, st]),
      onStart: (f, g) => { g.cutIn(f, 'CURSED BARRAGE', '連撃'); g.superFreeze(f, 10); },
      onFrame: (f, t) => { if (t >= 12 && t < 44 && t % 4 === 0) SFX('whoosh', 1.3); },
      onHit: (att, def, g) => {
        if (att.mt >= 44) {
          def.setState('juggle'); def.vy = -18; def.vx = att.facing * 4; def.y = -2;
          if (JK.simRandom() < 0.35 || att.bfForce) { FX.blackFlash(def.x, def.y - 140, att.facing); SFX('blackFlash'); def.hp -= 60; g.onDamage(def, 60); g.shake(12, 14); }
        }
      },
    };
    M.domain = domainMove(ch, st, P({ y: -104, lean: 6, head: -6, hF: [32, -10], hB: [32, -6], gF: 'fist', gB: 'open', fF: [26, 0], fB: [-26, 0] }));
    ch.throwFx = (att, v, t, g) => {
      if (t === 24) { FX.add({ type: 'ring', x: v.x, y: 0, r0: 10, r1: 150, w: 10, color: '#5aa8ff', flat: 0.25, life: 16 }); FX.debris(v.x, 0, 12); }
    };
  }

  // ================================================================== MEGUMI
  function megumiMoves(ch, M, st) {
    const sign = P({ y: -104, lean: 4, head: -4, hF: [40, -20], hB: [38, -16], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] });
    const shadowPuff = (x, y) => {
      for (let i = 0; i < 10; i++) FX.add({ type: 'smoke', x: x + (Math.random() - 0.5) * 60, y: y - Math.random() * 40, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, r: 14 + Math.random() * 12, color: '#0b0a18', alpha: 0.7, life: 30 });
    };
    M.t1 = {
      name: 'Divine Dogs', special: true, startup: 14, active: 1, recovery: 20, dmg: 0,
      anim: seq([0, st], [10, sign, 'outQuad'], [14, P(sign, { x: 6, lean: 12, hF: [60, -10] })], [35, st]),
      onFrame: (f, t, g) => {
        if (t === 14) {
          shadowPuff(f.x + f.facing * 40, 0);
          SFX('dash');
          f.dogWhite = !f.dogWhite;
          const white = f.dogWhite;
          spawn(f, {
            kind: 'wolf', x: f.x + f.facing * 50, y: -44, w: 120, h: 80, vx: f.facing * 13, life: 70, dmg: 80, kb: 8, hitstun: 20, blockstun: 14, hitstop: 8, power: 2,
            sparkColor: '#8a7cff', chip: 10, level: 'mid',
            u: (p) => { p.x += p.vx; if (p.t % 4 === 0) FX.dust(p.x - p.dir * 40, 0, -p.dir, 1, '#2a2640'); },
            d: (ctx, p) => drawWolf(ctx, p.x, p.y, p.dir, p.t, white),
            onDeath: (p) => shadowPuff(p.x, 0),
          });
        }
      },
    };
    M.t2 = {
      name: 'Nue', special: true, startup: 16, active: 1, recovery: 20, dmg: 0,
      anim: seq([0, st], [12, P(sign, { hF: [30, -60], hB: [26, -56] }), 'outQuad'], [16, P(sign, { hF: [60, -50], hB: [50, -46] })], [36, st]),
      onFrame: (f, t, g) => {
        if (t === 16) {
          const o = f.opp;
          const sx = f.x - f.facing * 60, sy = -420;
          const tx = o.x, ty = o.y - 120;
          const d = Math.hypot(tx - sx, ty - sy) || 1;
          SFX('whooshHeavy');
          spawn(f, {
            kind: 'nue', x: sx, y: sy, w: 110, h: 80, vx: ((tx - sx) / d) * 12, vy: ((ty - sy) / d) * 12, life: 90, dmg: 90, kb: 6, hitstun: 22, blockstun: 14, hitstop: 9,
            power: 2, sparkColor: '#9ad8ff', level: 'overhead', chip: 10, dir: Math.sign(tx - sx) || f.facing,
            u: (p) => { p.x += p.vx; p.y += p.vy; if (p.y > -40) p.kill(g); },
            d: (ctx, p) => drawNue(ctx, p.x, p.y, p.dir, p.t),
            onDeath: (p) => { FX.add({ type: 'flash', x: p.x, y: p.y, r: 120, color: '#9ad8ff', life: 10 }); shadowPuff(p.x, p.y + 40); },
          });
        }
      },
    };
    M.t1d = {
      name: 'Toad', special: true, startup: 8, active: 1, recovery: 26, dmg: 0, invuln: 6,
      anim: seq([0, st], [6, P(sign, { y: -80, lean: 16 })], [30, P(sign, { y: -84, lean: 14 })], [35, st]),
      onFrame: (f, t, g) => {
        if (t === 6) {
          shadowPuff(f.x + f.facing * 70, 0);
          spawn(f, {
            kind: 'toad', persist: true, x: f.x + f.facing * 70, y: -150, w: 120, h: 260, vx: 0, life: 30, from: 6, to: 12, dmg: 80, kb: 3, hitstun: 26, blockstun: 16, hitstop: 9,
            power: 2, sparkColor: '#d0506a', launch: true, launchVy: -16, airKb: -4, chip: 8, dir: f.facing,
            d: (ctx, p) => drawToad(ctx, p.x, 0, p.dir, p.t, p.t < 6 ? 0 : p.t < 14 ? (p.t - 6) * 32 : Math.max(0, 256 - (p.t - 14) * 30)),
            onDeath: (p) => shadowPuff(p.x, 0),
          });
        }
      },
    };
    M.t3 = {
      name: 'Max Elephant', special: true, cost: 100, startup: 20, active: 1, recovery: 26, dmg: 0,
      anim: seq([0, st], [16, P(sign, { hF: [30, -74], hB: [24, -70], head: -14, lean: -6 }), 'outQuad'], [46, P(sign, { hF: [30, -74], hB: [24, -70], head: -14, lean: -6 })], [56, st]),
      onStart: (f, g) => { g.cutIn(f, 'MAX ELEPHANT', '満象'); g.superFreeze(f, 18); },
      onFrame: (f, t, g) => {
        if (t === 20) {
          const o = f.opp;
          const x = o.x;
          SFX('whooshHeavy');
          spawn(f, {
            kind: 'elephant', persist: true, x, y: -900, w: 240, h: 200, vx: 0, vy: 0, life: 100, from: 999, to: 999, dmg: 190, kb: 5, hitstun: 30, blockstun: 22, hitstop: 14, power: 3,
            sparkColor: '#6ac8ff', level: 'overhead', knockdown: true, knockVy: -8, airKb: 3, chip: 25, dir: f.facing,
            u: (p, g2) => {
              if (!p.landed) {
                p.vy += 1.1; p.y += p.vy;
                if (p.y >= -130) {
                  p.y = -130; p.landed = true; p.from = p.t; p.to = p.t + 5;
                  SFX('explosion', 1.3); g2.shake(18, 20);
                  for (let i = 0; i < 40; i++) FX.add({ type: 'dot', x: p.x + (Math.random() - 0.5) * 200, y: -10, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 12, g: 0.5, r: 10 + Math.random() * 10, color: '#6ac8ff', life: 40, drag: 0.99 });
                  FX.add({ type: 'ring', x: p.x, y: -4, r0: 20, r1: 320, w: 12, color: '#9adcff', flat: 0.2, life: 26 });
                  FX.debris(p.x, 0, 16);
                }
              } else if (p.t > p.to + 20) p.kill(g2);
            },
            d: (ctx, p) => {
              ctx.save();
              ctx.fillStyle = `rgba(0,0,0,${JK.clamp(0.2 + (p.y + 900) / 1200, 0, 0.6)})`;
              ctx.beginPath(); ctx.ellipse(p.x, 0, 140, 16, 0, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
              drawElephant(ctx, p.x, p.y, p.t);
            },
            onDeath: (p) => shadowPuff(p.x, 0),
          });
        }
      },
    };
    M.domain = domainMove(ch, st, P({ y: -104, lean: 4, head: -4, hF: [32, -14], hB: [34, -10], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] }));
    ch.throwFx = (att, v, t, g) => { if (t === 2 || t === 24) shadowPuff(v.x, 0); };
  }

  // ================================================================== JOGO
  function drawInsect(ctx, p) {
    const fl = Math.sin(p.t * 1.3) * 5;
    const ang = Math.atan2(p.vy, p.vx);
    JK.drawGlow(ctx, '#ff6a1a', p.x, p.y, 34, 0.7);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255,220,150,0.55)';
    ctx.beginPath(); ctx.ellipse(-2, -6 - fl * 0.3, 7, 3 + fl * 0.4, -0.4, 0, Math.PI * 2); ctx.ellipse(-2, 6 + fl * 0.3, 7, 3 + fl * 0.4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    outline(ctx, '#3a1a10');
    ctx.fillStyle = '#ffb03a';
    ctx.beginPath(); ctx.ellipse(2, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawVolcano(ctx, p) {
    if (p.t < p.from) {
      // telegraph: glowing crack + smoke where the ground will erupt
      const k = p.t / p.from;
      const pulse = 0.5 + Math.sin(p.t * 0.6) * 0.5;
      ctx.fillStyle = `rgba(255,120,30,${0.25 + 0.5 * k * pulse})`;
      ctx.beginPath(); ctx.ellipse(p.x, 2, 50 + 20 * k, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,200,80,${0.4 + 0.5 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x - 44, 3); ctx.lineTo(p.x - 14, -1); ctx.lineTo(p.x + 6, 4); ctx.lineTo(p.x + 40, 0); ctx.stroke();
      return;
    }
    const age = p.t - p.from;
    const h = age < 6 ? age * 60 : p.t > p.to + 6 ? Math.max(0, 340 - (p.t - p.to - 6) * 30) : 340;
    if (h <= 0) return;
    JK.drawGlow(ctx, '#ff5a1a', p.x, -h / 2, h * 0.7, 0.7);
    const g = ctx.createLinearGradient(p.x - 60, 0, p.x + 60, 0);
    g.addColorStop(0, 'rgba(180,30,10,0.0)'); g.addColorStop(0.2, 'rgba(230,70,20,0.95)');
    g.addColorStop(0.5, 'rgba(255,230,140,1)'); g.addColorStop(0.8, 'rgba(230,70,20,0.95)'); g.addColorStop(1, 'rgba(180,30,10,0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x - 64, 0);
    for (let y = 0; y <= h; y += 20) ctx.lineTo(p.x - 44 - Math.sin(y * 0.05 + p.t * 0.6) * 12 + y * 0.05, -y);
    for (let y = h; y >= 0; y -= 20) ctx.lineTo(p.x + 44 + Math.sin(y * 0.05 + p.t * 0.5) * 12 - y * 0.05, -y);
    ctx.closePath();
    ctx.fill();
  }
  function drawMeteor(ctx, p) {
    // ground shadow telegraph
    const k = JK.clamp(1 + p.y / 1100, 0.1, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.45 * k})`;
    ctx.beginPath(); ctx.ellipse(p.x, 2, 150 * k + 40, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,90,20,${0.25 * k})`;
    ctx.beginPath(); ctx.ellipse(p.x, 2, 190 * k, 20, 0, 0, Math.PI * 2); ctx.fill();
    if (p.landed) return;
    const r = p.r;
    for (let i = 1; i <= 5; i++) JK.drawGlow(ctx, '#ff5a1a', p.x - p.vx * i * 3, p.y - p.vy * i * 3.2, r * (1.6 - i * 0.18), 0.35);
    JK.drawGlow(ctx, '#ff8a2a', p.x, p.y, r * 2.4, 0.8);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.t * 0.03);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const rr = r * (0.88 + ((i * 7) % 5) * 0.04); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
    ctx.fillStyle = '#3a2420'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#120806'; ctx.stroke();
    ctx.strokeStyle = '#ffb03a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.1, r * 0.1); ctx.lineTo(r * 0.3, -r * 0.3);
    ctx.moveTo(-r * 0.2, r * 0.5); ctx.lineTo(r * 0.2, r * 0.25); ctx.lineTo(r * 0.55, r * 0.45);
    ctx.stroke();
    ctx.restore();
  }
  JK.drawVolcano = drawVolcano;
  JK.drawMeteor = drawMeteor;

  function spawnVolcano(f, x, opts = {}) {
    return spawn(f, Object.assign({
      kind: 'volcano', persist: true, x, y: -160, w: 120, h: 320, from: 30, to: 40, life: 74, dmg: 102, launch: true, launchVy: -16, airKb: 3, kb: 4,
      hitstun: 24, blockstun: 16, hitstop: 10, power: 3, sparkColor: '#ff8a2a', burn: 90, chip: 14, level: 'mid', prio: 3, dir: f.facing,
      u: (p, g2) => {
        if (p.t < p.from && p.t % 3 === 0) FX.add({ type: 'smoke', x: p.x + (Math.random() - 0.5) * 60, y: -4, vx: 0, vy: -1.2, r: 10, color: '#3a2a26', alpha: 0.5, life: 30 });
        if (p.t === p.from) { SFX('explosion', 1); SFX('fire'); g2.shake(9, 12); FX.debris(p.x, 0, 12, '#4a3a30'); }
        if (p.t >= p.from && p.t < p.to + 10) for (let i = 0; i < 3; i++) FX.add({ type: 'flame', x: p.x + (Math.random() - 0.5) * 70, y: -Math.random() * 300, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 3, r: 22 + Math.random() * 18, life: 22 });
      },
      d: drawVolcano,
    }, opts));
  }
  JK.spawnVolcano = spawnVolcano;

  function jogoMoves(ch, M, st) {
    const palm = P({ y: -102, x: 8, lean: 12, head: -2, hF: [78, -16], gF: 'open', hB: [0, 34], gB: 'open', fF: [34, 0], fB: [-26, 0] });
    const up = P({ y: -108, lean: -8, head: -14, hF: [30, -80], hB: [18, -74], gF: 'open', gB: 'open', fF: [24, 0], fB: [-24, 0] });
    const slam = P({ y: -88, x: 8, lean: 34, head: 10, hF: [52, 52], hB: [42, 56], gF: 'open', gB: 'open', fF: [36, 0], fB: [-26, 0] });
    M.t1 = {
      name: 'Ember Insects', special: true, startup: 14, active: 1, recovery: 22, dmg: 0,
      anim: seq([0, st], [10, P({ y: -104, lean: 0, hF: [16, -34], gF: 'open', hB: [4, 42], gB: 'open', fF: [26, 0], fB: [-24, 0] }), 'outQuad'], [14, palm, 'outExpo'], [28, palm], [36, st]),
      onFrame: (f, t, g) => {
        if (t !== 14 && t !== 18 && t !== 22) return;
        const h = handPos(f);
        const k = (t - 14) / 4;
        SFX('whoosh', 1.4);
        spawn(f, {
          kind: 'insect', x: h.x, y: h.y, w: 34, h: 34, vx: f.facing * (8 - k), vy: -4 + k * 3, life: 100, dmg: 30, kb: 4, hitstun: 14, blockstun: 10, hitstop: 4,
          power: 1, sparkColor: '#ff8a2a', chip: 5, prio: 1,
          u: (p) => {
            const o = p.owner.opp;
            if (p.t > 10 && o) {
              const tx = o.x, ty = o.y - 120;
              const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
              p.vx = p.vx * 0.93 + (dx / d) * 9 * 0.07;
              p.vy = p.vy * 0.93 + (dy / d) * 9 * 0.07;
              p.dir = Math.sign(p.vx) || p.dir;
            }
            p.x += p.vx; p.y += p.vy;
            if (p.y > -20) p.y = -20;
            if (p.t % 2 === 0) FX.add({ type: 'flame', x: p.x, y: p.y, vx: -p.vx * 0.2, vy: -0.5, r: 10, life: 12 });
          },
          d: drawInsect,
          onDeath: (p) => { FX.explosion(p.x, p.y, 0.35, '#ff7a1a'); SFX('explosion', 0.4); },
        });
      },
    };
    M.t2 = {
      name: 'Volcano', special: true, startup: 18, active: 1, recovery: 34, dmg: 0,
      anim: seq([0, st], [10, up, 'outQuad'], [16, slam, 'inCubic'], [34, slam], [42, st]),
      onFrame: (f, t, g) => {
        if (t === 16) {
          g.shake(5, 8);
          FX.shockwave(f.x + f.facing * 50, 0, '#ff8a2a', 0.6);
          const o = f.opp;
          spawnVolcano(f, JK.clamp(o.x + o.vx * 8, 90, JK.STAGE_W - 90));
        }
      },
    };
    M.t1d = {
      name: 'Flame Burst', special: true, startup: 8, active: 5, recovery: 26, dmg: 85, hitstun: 24, blockstun: 16, kb: 7, level: 'mid', invuln: 9,
      hit: [-50, 135, -270, 0], hitstop: 10, power: 3, sparkColor: '#ff8a2a', launch: true, launchVy: -15, airKb: 6, burn: 60, chip: 10,
      anim: seq([0, st], [5, P(ch.poses.crouch, { hF: [24, 20], hB: [14, 22], gF: 'open', gB: 'open' })],
        [8, P({ y: -112, lean: -10, head: -16, hF: [40, -64], hB: [-34, -54], gF: 'open', gB: 'open', fF: [30, 0], fB: [-30, 0] }), 'outExpo'],
        [22, P({ y: -112, lean: -10, head: -16, hF: [40, -62], hB: [-34, -52], gF: 'open', gB: 'open', fF: [30, 0], fB: [-30, 0] })], [39, st]),
      onFrame: (f, t, g) => { if (t === 8) { FX.explosion(f.x + f.facing * 40, f.y - 120, 0.9, '#ff7a1a'); SFX('explosion', 0.8); SFX('fire'); g.shake(8, 10); } },
    };
    M.t3 = {
      name: 'Maximum: Meteor', special: true, cost: 100, startup: 28, active: 1, recovery: 30, dmg: 0, invuln: 10,
      anim: seq([0, st], [16, up, 'outQuad'], [28, P(up, { hF: [44, -84], hB: [34, -80] })], [52, up], [58, st]),
      onStart: (f, g) => { SFX('charge', 120, 0.5); g.superFreeze(f, 24); g.cutIn(f, 'MAXIMUM: METEOR', '極ノ番「隕」'); },
      onFrame: (f, t, g) => {
        if (t < 28 && t % 2 === 0) FX.add({ type: 'flame', x: f.x + (Math.random() - 0.5) * 60, y: f.y - 250 - Math.random() * 40, vx: 0, vy: -2, r: 20, life: 20 });
        if (t !== 28) return;
        const o = f.opp;
        SFX('whooshHeavy');
        spawn(f, {
          kind: 'meteor', persist: true, x: o.x - f.facing * 160, y: -1150, r: 120, w: 400, h: 260, vx: f.facing * 3.4, vy: 8, life: 150, from: 9999, to: 9999,
          dmg: 170, kb: 8, hitstun: 30, blockstun: 22, hitstop: 14, power: 3, sparkColor: '#ff7a1a', level: 'mid', knockdown: true, knockVy: -10, airKb: 6,
          burn: 120, chip: 28, prio: 3, dir: f.facing,
          u: (p, g2) => {
            if (!p.landed) {
              p.vy += 0.7; p.x += p.vx; p.y += p.vy;
              if (p.t % 2 === 0) FX.add({ type: 'flame', x: p.x + (Math.random() - 0.5) * p.r, y: p.y - p.r * 0.6, vx: -p.vx, vy: -4, r: 40, life: 20 });
              if (p.y >= -130) {
                p.y = -130; p.landed = true; p.from = p.t; p.to = p.t + 6;
                SFX('explosion', 1.8); SFX('fire'); g2.shake(22, 26); g2.flashScreen('#ffb060', 0.5, 14);
                FX.explosion(p.x, -80, 2.2, '#ff6a1a');
                FX.shockwave(p.x, 0, '#ffb060', 2);
                FX.debris(p.x, 0, 26, '#4a3a30');
              }
            } else if (p.t > p.to + 24) p.kill(g2);
          },
          d: drawMeteor,
        });
      },
    };
    M.domain = domainMove(ch, st, P({ y: -104, lean: 2, head: -6, hF: [30, -26], hB: [34, -22], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] }));
    ch.throwFx = (att, v, t, g) => { if (t === 24) { FX.explosion(v.x, v.y - 100, 0.8, '#ff7a1a'); SFX('fire'); } };
  }

  // ================================================================== HIGURUMA
  function drawGavelProj(ctx, p) {
    const pal = p.owner.ch.pal;
    JK.drawGlow(ctx, '#b39cff', p.x, p.y, 70, 0.4);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.t * 0.5 * p.dir);
    ctx.scale(2.3, 2.3);
    ctx.translate(-20, 0);
    JK.Rig.poly(ctx, [[-8, -2.6], [34, -2.6], [34, 2.6], [-8, 2.6]], pal.wood);
    JK.Rig.poly(ctx, [[30, -13], [46, -13], [46, 13], [30, 13]], pal.wood);
    ctx.fillStyle = pal.metal;
    ctx.fillRect(30, -13, 3.5, 26); ctx.fillRect(42.5, -13, 3.5, 26);
    ctx.restore();
  }
  function higurumaMoves(ch, M, st) {
    const gold = '#d9b650';
    M.t1 = {
      name: 'Gavel Strike', special: true, startup: 12, active: 5, recovery: 18, dmg: 90, hitstun: 22, blockstun: 16, kb: 11, level: 'mid',
      hit: [40, 175, -230, -70], hitstop: 10, power: 3, sparkColor: gold, vel: [[4, 11, 8]], chip: 10, whoosh: 7, whooshHeavy: true, trail: 'hF', trailColor: '#b39cff',
      anim: seq([0, st],
        [8, P({ y: -106, x: -6, lean: -10, head: -8, hF: [-14, -58], hB: [20, 20], gB: 'open', fF: [22, 0], fB: [-30, 0], wa: -40, ws: 2.2 }), 'outQuad'],
        [12, P({ y: -94, x: 16, lean: 30, head: 6, hF: [80, 22], hB: [10, 30], gB: 'open', fF: [50, 0], fB: [-28, 0], wa: 38, ws: 2.8 }), 'outExpo'],
        [26, P({ y: -94, x: 16, lean: 28, head: 6, hF: [78, 26], hB: [10, 30], gB: 'open', fF: [50, 0], fB: [-28, 0], wa: 38, ws: 2.4 })], [38, st]),
      onFrame: (f, t, g) => {
        if (t === 12) { FX.shockwave(f.x + f.facing * 150, 0, gold, 0.5); g.shake(5, 8); FX.add({ type: 'ring', x: f.x + f.facing * 140, y: f.y - 130, r0: 10, r1: 90, w: 5, color: '#b39cff', life: 12 }); }
      },
    };
    M.t1d = {
      name: 'Gavel Uppercut', special: true, startup: 8, active: 5, recovery: 24, dmg: 85, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 7,
      hit: [0, 120, -300, -80], hitstop: 10, power: 3, sparkColor: gold, launch: true, launchVy: -17, airKb: 4, chip: 8, trail: 'hF', trailColor: '#b39cff',
      anim: seq([0, st], [4, P(ch.poses.crouch, { hF: [30, 30], wa: 60, ws: 1.6 })],
        [8, P({ y: -118, x: 8, lean: -12, head: -14, hF: [34, -90], hB: [0, 30], gB: 'open', fF: [30, -6], fB: [-18, 0], wa: -10, ws: 2.4 }), 'outExpo'],
        [20, P({ y: -118, x: 8, lean: -12, head: -14, hF: [32, -88], hB: [0, 30], gB: 'open', fF: [30, -6], fB: [-18, 0], wa: -10, ws: 2 })], [37, st]),
    };
    M.t2 = {
      name: 'Gavel Toss', special: true, startup: 16, active: 1, recovery: 20, dmg: 0,
      anim: seq([0, st], [10, P({ y: -106, x: -4, lean: -8, head: -6, hF: [-20, -40], hB: [20, 20], gB: 'open', fF: [22, 0], fB: [-30, 0], wa: -60, ws: 1.4 }), 'outQuad'],
        [16, P({ y: -100, x: 12, lean: 20, head: 0, hF: [80, -20], hB: [0, 30], gB: 'open', gF: 'open', fF: [44, 0], fB: [-26, 0], wv: 0 }), 'outExpo'],
        [26, P({ y: -100, x: 12, lean: 18, hF: [76, -16], hB: [0, 30], gB: 'open', gF: 'open', fF: [44, 0], fB: [-26, 0], wv: 0 })], [36, P(st, { wv: 0 })]),
      onFrame: (f, t, g) => {
        if (t !== 16) return;
        SFX('whooshHeavy');
        f.gavelOut = true;
        const h = handPos(f);
        spawn(f, {
          kind: 'gavel', x: h.x, y: f.y - 150, w: 80, h: 80, vx: f.facing * 15, life: 90, hits: 2, every: 16, dmg: 62, kb: 6, hitstun: 18, blockstun: 14, hitstop: 6,
          power: 2, sparkColor: gold, chip: 7, prio: 2, pierce: true, persist: true,
          u: (p, g2) => {
            p.x += p.vx;
            p.vx -= p.dir * 0.52; // slows, then boomerangs back to the owner
            if (p.t % 3 === 0) FX.add({ type: 'dot', x: p.x, y: p.y, vx: 0, vy: 0, r: 26, color: '#b39cff', life: 10 });
            const o = p.owner;
            if (p.t > 20 && Math.sign(p.vx) !== p.dir && Math.abs(p.x - o.x) < 50) p.kill(g2);
          },
          d: drawGavelProj,
          onDeath: (p) => { p.owner.gavelOut = false; FX.add({ type: 'flash', x: p.x, y: p.y, r: 60, color: '#e8d8ff', life: 8 }); },
        });
      },
    };
    // O: the gavel swells to colossal size and comes down as an overhead
    M.t3 = {
      name: 'Colossal Gavel', special: true, cost: 100, startup: 30, active: 5, recovery: 30, dmg: 160, hitstun: 30, blockstun: 20, kb: 8, level: 'overhead',
      hit: [30, 250, -320, 0], hitstop: 14, power: 3, knockdown: true, knockVy: -9, airKb: 8, chip: 22, sparkColor: gold, invuln: 18,
      anim: seq([0, st],
        [22, P({ y: -110, lean: -12, head: -14, hF: [-6, -76], hB: [10, -60], gB: 'open', fF: [24, 0], fB: [-28, 0], wa: -20, ws: 4.2 }), 'outQuad'],
        [30, P({ y: -86, x: 24, lean: 42, head: 10, hF: [80, 40], hB: [50, 50], gB: 'open', fF: [58, 0], fB: [-30, 0], wa: 15, ws: 4.2 }), 'inCubic'],
        [46, P({ y: -86, x: 24, lean: 40, head: 10, hF: [80, 42], hB: [50, 50], gB: 'open', fF: [58, 0], fB: [-30, 0], wa: 15, ws: 4 })], [66, st]),
      onStart: (f, g) => {
        g.superFreeze(f, 24);
        g.cutIn(f, 'COLOSSAL GAVEL', '裁きの槌');
        SFX('charge', 140, 0.5);
      },
      onFrame: (f, t, g) => {
        if (t < 30 && t % 3 === 0) { const h = handPos(f); FX.add({ type: 'dot', x: h.x, y: h.y - 80, vx: 0, vy: -1, r: 30, color: '#b39cff', life: 12 }); }
        if (t === 30) {
          SFX('explosion', 1.2); SFX('impact'); JK.Audio.sample('gavel', 1);
          g.shake(16, 20);
          FX.shockwave(f.x + f.facing * 200, 0, gold, 1.6);
          FX.debris(f.x + f.facing * 200, 0, 20, '#5a4a40');
        }
      },
    };
    // Execution: only available while holding the Executioner's Sword (Death Penalty).
    // Slow, telegraphed and blockable, but it kills outright if it connects.
    const swordUp = P({ y: -108, lean: -10, head: -12, hF: [-8, -74], hB: [12, -60], gB: 'open', fF: [24, 0], fB: [-28, 0], wa: -10 });
    const swordCut = P({ y: -92, x: 26, lean: 34, head: 8, hF: [84, 34], hB: [30, 40], gB: 'open', fF: [58, 0], fB: [-30, 0], wa: -35 });
    M.exec = {
      name: 'Execution', special: true, startup: 30, active: 3, recovery: 44, dmg: 9999, chip: 0, hitstun: 30, blockstun: 24, kb: 12, level: 'mid', noBF: true,
      hit: [30, 150, -250, -40], hitstop: 26, power: 3, knockdown: true, knockVy: -8, airKb: 6, sparkColor: '#ffffff', slashFx: true, sfx: 'slash',
      anim: seq([0, st], [26, swordUp, 'outQuad'], [30, swordCut, 'outExpo'], [48, swordCut], [77, st]),
      onStart: (f) => { f.execCd = 150; SFX('charge', 300, 0.5); },
      onFrame: (f, t, g) => {
        const h = handPos(f);
        if (t < 30 && t % 2 === 0) FX.add({ type: 'spark', x: h.x + (Math.random() - 0.5) * 30, y: h.y - 70 - Math.random() * 60, vx: 0, vy: -3, len: 14, w: 2, color: '#ffffff', life: 10 });
        if (t === 22) {
          // the glint: a readable warning before the blade falls
          FX.add({ type: 'flash', x: h.x, y: h.y - 110, r: 110, color: '#ffffff', life: 10 });
          FX.add({ type: 'burst', x: h.x, y: h.y - 110, r: 50, n: 8, seed: Math.random() * 6, color: '#ffffff', life: 10 });
          SFX('justGuard');
        }
        if (t === 30) SFX('slash', true);
      },
      onHit: (att, def, g) => {
        att.execT = 0; // the sentence has been carried out
        JK.Audio.sample('execution', 1);
        g.negFlash(6);
        g.slowmo(44, 0.2);
        g.flashScreen('#ffffff', 0.9, 24);
        g.shake(24, 30);
        SFX('gong'); SFX('impact');
        FX.add({ type: 'cut', x1: def.x - 700, y1: def.y - 700, x2: def.x + 700, y2: def.y + 300, w: 9, color: '#ffffff', life: 60 });
        FX.text(def.x, def.y - 300, '死刑執行', { size: 90, color: '#ffffff', life: 90 });
        FX.text(def.x, def.y - 232, 'SENTENCE CARRIED OUT', { size: 30, font: JK.FONT_TITLE, color: '#ff4050', life: 90 });
      },
      onBlock: (att, def, g) => {
        SFX('block'); SFX('slash');
        g.shake(10, 12);
        att.vx = -att.facing * 9;
        for (let i = 0; i < 12; i++) FX.add({ type: 'spark', x: def.x - def.facing * 10, y: def.y - 140, vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 16, len: 18, w: 2, color: '#ffffff', life: 12 });
      },
    };
    M.domain = domainMove(ch, st, P({ y: -106, lean: -2, head: -8, hF: [30, -50], hB: [30, -10], gB: 'open', fF: [24, 0], fB: [-24, 0], wa: -10, ws: 1.5 }));
    ch.throwFx = (att, v, t, g) => {
      if (t === 24) { FX.add({ type: 'ring', x: v.x, y: v.y - 110, r0: 10, r1: 120, w: 8, color: gold, life: 14 }); SFX('hit', 2); }
    };
  }

  // ================================================================== NANAMI
  // The 7:3 point: a line across the target, split at seven-tenths, marks the weak point.
  // With `att`, a marker sweeps down the line (att.ratio.pos 0..1): strike when it reaches 7:3.
  function ratioMark(def, life = 30, att = null) {
    FX.add({
      type: 'custom', layer: 'front', x: def.x, y: def.y, life,
      u: (p) => { p.x = def.x; p.y = def.y; },
      d: (ctx, p, k) => {
        const a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
        const top = p.y - 232, bot = p.y - 12, mid = top + (bot - top) * 0.7;
        const r = att && att.ratio;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = JK.rgba('#ffcf80', 0.8 * a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(p.x, bot); ctx.stroke();
        for (let i = 0; i <= 10; i++) { const y = top + (bot - top) * (i / 10); ctx.beginPath(); ctx.moveTo(p.x - 6, y); ctx.lineTo(p.x + 6, y); ctx.stroke(); }
        if (r) {
          // the critical window around the 7:3 point
          const wy0 = top + (bot - top) * (0.7 - r.win), wy1 = top + (bot - top) * (0.7 + r.win);
          ctx.fillStyle = JK.rgba(r.judged === 'crit' ? '#ffffff' : '#ff8a2a', 0.35 * a);
          ctx.fillRect(p.x - 30, wy0, 60, wy1 - wy0);
        }
        ctx.strokeStyle = JK.rgba('#ff8a2a', a); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(p.x - 26, mid); ctx.lineTo(p.x + 26, mid); ctx.stroke();
        if (r && !r.judged) {
          const my = top + (bot - top) * r.pos;
          ctx.strokeStyle = JK.rgba('#ffffff', a); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(p.x - 40, my); ctx.lineTo(p.x + 40, my); ctx.stroke();
          ctx.fillStyle = JK.rgba('#ffffff', a);
          ctx.beginPath(); ctx.moveTo(p.x - 48, my); ctx.lineTo(p.x - 58, my - 6); ctx.lineTo(p.x - 58, my + 6); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(p.x + 48, my); ctx.lineTo(p.x + 58, my - 6); ctx.lineTo(p.x + 58, my + 6); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        JK.drawGlow(ctx, '#ff9a3a', p.x, mid, 40, 0.6 * a);
        JK.text(ctx, '7 : 3', p.x + 44, mid, { size: 22, color: '#ffcf80', stroke: '#000', strokeW: 4, alpha: a });
      },
    });
  }
  // The payoff for a perfectly timed 7:3: time slows, the screen inverts and the target is split at the ratio line.
  function ratioCritFx(att, def, g) {
    const cy = def.y - 78, cx = def.x;
    g.slowmo(26, 0.22);
    g.negFlash(4);
    g.shake(22, 26);
    g.zoomPunch(0.16);
    g.flashScreen('#ffcf80', 0.45, 14);
    if (!JK.Audio.sample('critical', 1)) { SFX('impact'); SFX('slash', true); }
    SFX('blackFlash');
    const ang = -att.facing * 0.12;
    FX.add({ type: 'cut', x1: cx - Math.cos(ang) * 1000, y1: cy - Math.sin(ang) * 1000, x2: cx + Math.cos(ang) * 1000, y2: cy + Math.sin(ang) * 1000, w: 10, color: '#ffae42', life: 30 });
    FX.add({ type: 'cut', x1: cx - 700, y1: cy + 2, x2: cx + 700, y2: cy - 2, w: 3, color: '#ffffff', life: 34 });
    FX.add({ type: 'burst', x: cx, y: cy, r: 170, n: 24, seed: Math.random() * 6, color: '#000000', add: false, life: 16 });
    FX.add({ type: 'burst', x: cx, y: cy, r: 120, n: 16, seed: Math.random() * 6, color: '#ffae42', life: 14 });
    for (let i = 0; i < 3; i++) FX.add({ type: 'ring', x: cx, y: cy, r0: 10, r1: 180 + i * 90, w: 12 - i * 3, color: i === 1 ? '#ffffff' : '#ffae42', life: 18 + i * 6 });
    for (let i = 0; i < 18; i++) {
      const sz = 6 + Math.random() * 12;
      FX.add({ type: 'shard', x: cx, y: cy, vx: (Math.random() - 0.5) * 22, vy: -4 - Math.random() * 10, g: 0.5, pts: [[0, 0], [sz, sz * (Math.random() - 0.5)], [sz * (Math.random() - 0.3), sz]], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5, color: JK.pick(['#ffae42', '#1a1008', '#ffe0a8']), life: 44 });
    }
    // ten ratio lines racing outward from the target
    FX.add({
      type: 'custom', layer: 'front', x: cx, y: cy, life: 30,
      d: (ctx, p, k) => {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i <= 10; i++) {
          const y = cy - 154 + i * 22;
          const w = 60 + k * 900;
          ctx.strokeStyle = JK.rgba(i === 7 ? '#ffffff' : '#ffae42', (1 - k) * (i === 7 ? 1 : 0.5));
          ctx.lineWidth = i === 7 ? 4 : 1.5;
          ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx + w, y); ctx.stroke();
        }
        ctx.restore();
      },
    });
    FX.text(cx, def.y - 300, '7 : 3', { size: 110, font: JK.FONT_TITLE, color: '#ffcf80', strokeW: 10, life: 70, vy: -0.2 });
    FX.text(cx, def.y - 226, 'CRITICAL HIT', { size: 34, font: JK.FONT_TITLE, color: '#ffffff', life: 70, vy: -0.2 });
  }
  function drawRubble(ctx, p) {
    if (p.t < p.from) {
      ctx.strokeStyle = `rgba(40,30,20,${0.3 + (p.t / p.from) * 0.5})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - 40, 2); ctx.lineTo(p.x - 10, -2); ctx.lineTo(p.x + 8, 3); ctx.lineTo(p.x + 38, -1); ctx.stroke();
      return;
    }
    const age = p.t - p.from;
    const h = (age < 5 ? age / 5 : p.t > p.to + 10 ? Math.max(0, 1 - (p.t - p.to - 10) / 14) : 1) * (p.big ? 190 : 150);
    if (h <= 1) return;
    const rr = JK.rng(p.seed);
    for (let i = 0; i < 4; i++) {
      const bx = p.x + (i - 1.5) * 22 + (rr() - 0.5) * 10, bh = h * (0.6 + rr() * 0.4), bw = 20 + rr() * 16, tilt = (rr() - 0.5) * 0.5;
      ctx.save();
      ctx.translate(bx, 0);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.moveTo(-bw / 2, 0); ctx.lineTo(-bw / 2 + 3, -bh * 0.8); ctx.lineTo(0, -bh); ctx.lineTo(bw / 2 - 2, -bh * 0.85); ctx.lineTo(bw / 2, 0); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#8a8078' : '#6e655e'; ctx.fill();
      ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-bw / 2 + 4, -bh * 0.7); ctx.lineTo(-2, -bh * 0.92); ctx.stroke();
      ctx.restore();
    }
  }
  function nanamiMoves(ch, M, st) {
    const orange = '#ffae42';
    // Ratio Technique: a stance where a marker sweeps down the opponent. Press U again as it
    // crosses the 7:3 point for a critical; press off the mark (or wait) for a plain cut.
    const SWEEP = 30;
    const ratioReady = P({ y: -100, x: -2, lean: 2, head: -6, hF: [8, -30], hB: [26, 8], gB: 'open', fF: [30, 0], fB: [-30, 0], wa: -60 });
    const ratioCut = P({ y: -98, x: 14, lean: 24, head: 2, hF: [80, 24], hB: [0, 20], gB: 'open', fF: [48, 0], fB: [-28, 0], wa: -20 });
    M.t1 = {
      name: 'Ratio Technique: 7:3', special: true, startup: SWEEP + 6, active: 1, recovery: 1, dmg: 0,
      anim: seq([0, st], [8, ratioReady, 'outQuad'], [SWEEP + 6, P(ratioReady, { head: -4, lean: 4 })]),
      onStart: (f) => {
        f.ratio = { pos: 0, win: f.otT > 0 ? 0.15 : 0.085, judged: null };
        ratioMark(f.opp, SWEEP + 40, f);
        SFX('charge', 500, 0.35);
      },
      onFrame: (f, t, g) => {
        const r = f.ratio;
        if (!r) return;
        r.pos = JK.clamp((t - 2) / SWEEP, 0, 1);
        const press = t >= 3 && (f.ctrl.pressed.t1 || (f.ctrl.aiRatio && t === f.ctrl.aiRatio));
        if (!press && t < SWEEP + 3) return;
        f.consume('t1');
        r.judged = press && Math.abs(r.pos - 0.7) <= r.win ? 'crit' : 'miss';
        if (r.judged === 'crit') {
          const o = f.opp;
          FX.add({ type: 'ring', x: o.x, y: o.y - 78, r0: 60, r1: 4, w: 4, color: '#ffffff', life: 8 });
          SFX('justGuard');
        } else if (press) FX.text(f.opp.x, f.opp.y - 270, 'OFF THE MARK', { size: 24, font: JK.FONT_TITLE, color: '#aaaaaa', life: 30 });
        f.startMove(r.judged === 'crit' ? 't1c' : 't1s');
      },
    };
    const cutBase = {
      special: true, startup: 4, active: 4, recovery: 18, hitstun: 22, blockstun: 15, level: 'mid', hit: [30, 160, -225, -100],
      power: 2, sparkColor: orange, vel: [[1, 6, 9]], trail: 'hF', trailColor: orange, slashFx: true, sfx: 'slash', whoosh: 2,
      anim: seq([0, ratioReady], [4, ratioCut, 'outExpo'], [12, ratioCut], [26, st]),
    };
    M.t1s = Object.assign({}, cutBase, { name: 'Ratio Cut', dmg: 62, kb: 8, hitstop: 9, chip: 7 });
    // the perfectly timed strike: massive damage, blasts the target away (wall splats!)
    M.t1c = Object.assign({}, cutBase, {
      name: 'Ratio Technique: CRITICAL', dmg: 215, kb: 12, hitstop: 20, power: 3, chip: 20, knockdown: true, knockVy: -12, airKb: 13, noBF: true,
      onHit: (att, def, g) => ratioCritFx(att, def, g),
      onBlock: (att, def, g) => { FX.add({ type: 'ring', x: def.x, y: def.y - 120, r0: 10, r1: 120, w: 6, color: orange, life: 12 }); g.shake(8, 10); },
    });
    M.t1d = {
      name: 'Rising Ratio', special: true, startup: 8, active: 5, recovery: 24, dmg: 84, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 7,
      hit: [0, 125, -295, -90], hitstop: 10, power: 3, sparkColor: orange, launch: true, launchVy: -17, airKb: 4, chip: 8, trail: 'hF', trailColor: orange, slashFx: true, sfx: 'slash',
      anim: seq([0, st], [4, P(ch.poses.crouch, { hF: [30, 24], wa: -10 })],
        [8, P({ y: -118, x: 8, lean: -12, head: -14, hF: [36, -88], hB: [0, 24], gB: 'open', fF: [30, -6], fB: [-18, 0], wa: -60 }), 'outExpo'],
        [20, P({ y: -118, x: 8, lean: -12, head: -14, hF: [34, -86], hB: [0, 24], gB: 'open', fF: [30, -6], fB: [-18, 0], wa: -60 })], [37, st]),
    };
    M.t2 = {
      name: 'Collapse', special: true, startup: 18, active: 1, recovery: 26, dmg: 0,
      anim: seq([0, st], [10, P({ y: -106, lean: -8, head: -10, hF: [10, -70], hB: [16, -50], gB: 'open', fF: [24, 0], fB: [-26, 0], wa: -20 }), 'outQuad'],
        [18, P({ y: -84, x: 16, lean: 40, head: 10, hF: [70, 64], hB: [40, 56], gB: 'open', fF: [50, 0], fB: [-28, 0], wa: -10 }), 'inCubic'],
        [36, P({ y: -84, x: 16, lean: 38, head: 10, hF: [70, 64], hB: [40, 56], gB: 'open', fF: [50, 0], fB: [-28, 0], wa: -10 })], [44, st]),
      onFrame: (f, t, g) => {
        if (t !== 18) return;
        SFX('explosion', 0.8); SFX('impact');
        g.shake(9, 12);
        FX.shockwave(f.x + f.facing * 80, 0, '#c8b8a0', 0.8);
        FX.text(f.x + f.facing * 60, f.y - 260, '瓦落瓦落', { size: 44, color: '#ffcf80', life: 40 });
        for (let i = 0; i < 4; i++) {
          const last = i === 3;
          spawn(f, {
            kind: 'rubble', x: f.x + f.facing * (110 + i * 85), y: -70, w: 96, h: 150, from: 2 + i * 5, to: 8 + i * 5, life: 40 + i * 5, seed: 7 + i,
            dmg: last ? 40 : 24, kb: last ? 7 : 3, hitstun: 18, blockstun: 10, hitstop: 5, power: 2, level: 'low', sparkColor: '#d8c8a8', chip: 4, prio: 2, persist: true,
            knockdown: last, knockVy: -10, airKb: 6, big: last, dir: f.facing,
            u: (p, g2) => { if (p.t === p.from) { FX.debris(p.x, 0, 8, '#6e655e'); FX.dust(p.x, 0, 0, 5); SFX('bodyfall'); g2.shake(3, 4); } },
            d: drawRubble,
          });
        }
      },
    };
    M.t3 = {
      name: 'Overtime', special: true, cost: 100, startup: 40, active: 1, recovery: 16, dmg: 0, invuln: 44,
      anim: seq([0, st], [16, P(st, { head: -12, lean: -2, hB: [12, -36], gB: 'open' }), 'outQuad'], [32, P(st, { head: -10, lean: -2, hB: [26, -20], gB: 'open' })],
        [40, P(st, { head: -6, lean: 10, hF: [44, 0] }), 'outExpo'], [56, st]),
      onStart: (f, g) => {
        g.superFreeze(f, 40);
        g.cutIn(f, 'OVERTIME', '時間外労働');
        SFX('charge', 180, 0.6);
        JK.Audio.say('Overtime.', { pitch: 0.55, rate: 0.9 });
      },
      onFrame: (f, t, g) => {
        if (t === 26) f.loose = true; // loosens the tie
        if (t !== 40) return;
        f.otT = 600;
        SFX('impact'); SFX('gong');
        // (Overtime also doubles the 7:3 timing window)
        g.shake(10, 14);
        g.flashScreen('#ffcf80', 0.35, 10);
        for (let i = 0; i < 3; i++) FX.add({ type: 'ring', x: f.x, y: f.y - 120, r0: 10, r1: 160 + i * 70, w: 8 - i * 2, color: i % 2 ? '#ffffff' : orange, life: 18 + i * 6 });
        FX.text(f.x, f.y - 290, '18:00', { size: 58, font: JK.FONT_TITLE, color: '#ffcf80', life: 70 });
      },
    };
    M.domain = domainMove(ch, st, P({ y: -104, lean: 6, head: -6, hF: [40, 0], hB: [22, -30], gB: 'open', fF: [26, 0], fB: [-26, 0], wa: -70 }));
    ch.throwFx = (att, v, t, g) => {
      if (t === 24) { ratioMark(v, 20); FX.add({ type: 'ring', x: v.x, y: v.y - 110, r0: 10, r1: 110, w: 8, color: orange, life: 14 }); SFX('slash', true); }
    };
  }
  JK.ratioMark = ratioMark;
  JK.drawRubble = drawRubble;

  // ================================================================== HAKARI
  function drawShutter(ctx, p) {
    // two corrugated shutter doors slide in from both sides and slam on the target
    const shut = Math.min(1, p.t / p.from);
    const k = JK.ease.inCubic(shut);
    const gap = 230 * (1 - k) + p.w * 0.02;
    const fade = p.t > p.to + 14 ? Math.max(0, 1 - (p.t - p.to - 14) / 12) : 1;
    if (fade <= 0) return;
    const top = -300, h = 300;
    ctx.save();
    ctx.globalAlpha = fade * (p.t < 3 ? p.t / 3 : 1);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? p.x - gap - 110 : p.x + gap;
      ctx.fillStyle = '#7a8088';
      ctx.fillRect(x0, top, 110, h);
      ctx.fillStyle = '#5a6068';
      for (let y = top + 8; y < top + h; y += 16) ctx.fillRect(x0, y, 110, 6);
      ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 4; ctx.strokeRect(x0, top, 110, h);
      ctx.fillStyle = '#2aff7a';
      ctx.fillRect(side < 0 ? x0 + 104 : x0, top, 6, h);
    }
    ctx.restore();
    if (shut >= 1 && p.t < p.to + 6) JK.drawGlow(ctx, '#2aff7a', p.x, -150, 180, 0.6 * fade);
  }
  function drawPachinko(ctx, p) {
    const r = p.r || 22;
    JK.drawGlow(ctx, p.gold ? '#ffd23a' : '#2aff7a', p.x, p.y, r * 3, 0.45);
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, 1, p.x, p.y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, p.gold ? '#ffe89a' : '#dfe6ee'); g.addColorStop(1, p.gold ? '#a07010' : '#6a7280');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  function drawRoughWave(ctx, p) {
    const rr = JK.rng(p.seed + Math.floor(p.t / 2));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    JK.drawGlow(ctx, '#2aff7a', p.x, -110, 200, 0.6);
    ctx.fillStyle = 'rgba(42,255,122,0.55)';
    ctx.beginPath();
    ctx.moveTo(p.x - 70 * p.dir, 0);
    for (let i = 0; i <= 10; i++) {
      const y = -i * 24;
      ctx.lineTo(p.x + p.dir * (30 + rr() * 50 - i * 2), y);
    }
    ctx.lineTo(p.x - 60 * p.dir, -250);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,255,232,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // Rough energy: jagged, abrasive cursed energy that sticks to whatever it touches
  function roughShards(x, y, n = 8, spread = 1) {
    for (let i = 0; i < n; i++) {
      const sz = 5 + Math.random() * 9;
      FX.add({ type: 'shard', x, y, vx: (Math.random() - 0.5) * 16 * spread, vy: (Math.random() - 0.7) * 14 * spread, g: 0.4, pts: [[0, 0], [sz, sz * (Math.random() - 0.5)], [sz * (Math.random() - 0.3), sz]], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5, color: JK.pick(['#2aff7a', '#8a9a8e', '#d8ffe8', '#3a4a40']), life: 30 });
    }
  }
  function hakariMoves(ch, M, st) {
    const green = '#2aff7a';
    const inMyDomain = (f) => { const d = f.game.domain; return !!(d && d.owner === f && d.phase === 'active' && d.id === 'idle_death_gamble'); };
    const spinUse = (f) => { if (inMyDomain(f)) f.game.hakariUse(f); };
    const pushOpen = P({ y: -102, x: 6, lean: 8, head: -2, hF: [58, -16], hB: [50, -18], gF: 'open', gB: 'open', fF: [32, 0], fB: [-26, 0] });
    M.t1 = {
      name: 'Shutter Doors', special: true, startup: 8, active: 1, recovery: 26, dmg: 0,
      anim: seq([0, st], [6, P({ y: -104, lean: -4, head: -6, hF: [50, -34], hB: [-40, -28], gF: 'open', gB: 'open', fF: [26, 0], fB: [-26, 0] }), 'outQuad'],
        [8, pushOpen, 'outExpo'], [26, pushOpen], [35, st]),
      onFrame: (f, t, g) => {
        if (t !== 8) return;
        const o = f.opp;
        const x = f.x + f.facing * JK.clamp((o.x - f.x) * f.facing, 130, 470);
        SFX('whooshHeavy');
        spawn(f, {
          kind: 'shutter', x, y: -140, w: 150, h: 270, vx: 0, life: 50, from: 11, to: 14, dmg: 80, kb: 2, hitstun: 26, blockstun: 16, hitstop: 11, power: 3, level: 'mid',
          sparkColor: green, chip: 8, prio: 2, persist: true, dir: f.facing,
          u: (p, g2) => {
            if (p.t === p.from) {
              if (!JK.Audio.sample('shutter', 0.9)) { SFX('impact'); SFX('block', false); }
              g2.shake(8, 10);
              FX.add({ type: 'flash', x: p.x, y: -150, r: 160, color: green, life: 10 });
              FX.dust(p.x, 0, 0, 6);
            }
          },
          d: drawShutter,
          onHit(att, def) { def.vx *= 0.2; },
        });
        spinUse(f);
      },
    };
    M.t2 = {
      name: 'Pachinko Ball', special: true, startup: 11, active: 1, recovery: 18, dmg: 0,
      anim: seq([0, st], [7, P({ y: -104, x: -4, lean: -8, head: -6, hF: [-16, -30], hB: [24, 6], gF: 'fist', gB: 'open', fF: [22, 0], fB: [-30, 0] }), 'outQuad'],
        [11, P({ y: -100, x: 10, lean: 18, head: 0, hF: [80, -30], hB: [0, 24], gF: 'open', gB: 'open', fF: [44, 0], fB: [-26, 0] }), 'outExpo'],
        [20, P({ y: -100, x: 10, lean: 16, hF: [76, -26], hB: [0, 24], gF: 'open', gB: 'open', fF: [44, 0], fB: [-26, 0] })], [29, st]),
      onFrame: (f, t, g) => {
        if (t !== 11) return;
        SFX('whoosh');
        const h = handPos(f);
        const dom = inMyDomain(f);
        // inside the domain the machine pays out a spray of golden balls
        const vys = dom ? [-11, -7.5, -4] : [-8];
        vys.forEach((vy, i) => spawn(f, {
          kind: 'pachinko', x: h.x, y: h.y, w: 50, h: 50, r: dom ? 18 : 22, gold: dom, vx: f.facing * (12 + i * 1.5), vy, life: 100, hits: 1, dmg: dom ? 30 : 64, kb: 7, hitstun: 20, blockstun: 14,
          hitstop: 7, power: 2, sparkColor: dom ? '#ffd23a' : '#e8f0ff', chip: 6, prio: 1, bounces: 0,
          u: (p) => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.72;
            if (p.y > -24) { p.y = -24; p.vy = -Math.abs(p.vy) * 0.7; p.vx *= 0.92; p.bounces++; SFX('rim'); if (p.bounces > 3) p.kill(f.game); }
            if (p.t % 2 === 0) FX.add({ type: 'dot', x: p.x, y: p.y, vx: 0, vy: 0, r: 12, color: p.gold ? '#ffd23a' : '#9dffc4', life: 8 });
          },
          d: drawPachinko,
        }));
        spinUse(f);
      },
    };
    M.t1d = {
      name: 'Rough Uppercut', special: true, startup: 8, active: 5, recovery: 24, dmg: 88, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 7,
      hit: [0, 100, -300, -80], hitstop: 10, power: 3, sparkColor: green, launch: true, launchVy: -17, airKb: 4, chip: 9, trail: 'hF', trailColor: green,
      anim: seq([0, st], [4, P(ch.poses.crouch, { hF: [30, 30] })],
        [8, P({ y: -120, x: 8, lean: -10, head: -14, hF: [28, -92], hB: [-6, 26], gB: 'open', fF: [30, -8], fB: [-16, 0], aF: 20 }), 'outExpo'],
        [20, P({ y: -120, x: 8, lean: -10, head: -14, hF: [28, -90], hB: [-6, 26], gB: 'open', fF: [30, -8], fB: [-16, 0] })], [37, st]),
      onFrame: (f, t) => { if (t === 8) roughShards(handPos(f).x, handPos(f).y, 6); },
    };
    M.t3 = {
      name: 'Rough Energy', special: true, cost: 100, startup: 16, active: 5, recovery: 24, dmg: 95, hitstun: 30, blockstun: 18, kb: 6, level: 'mid',
      hit: [30, 150, -225, -90], hitstop: 12, power: 3, sparkColor: green, chip: 14, vel: [[11, 17, 13]], ghost: true, trail: 'hF', trailColor: green,
      anim: seq([0, st], [12, P({ y: -100, x: -8, lean: -6, head: -4, tw: 12, hF: [-24, -4], hB: [30, -10], fF: [30, 0], fB: [-36, 0] }), 'outQuad'],
        [16, P({ y: -98, x: 20, lean: 24, head: -2, tw: -6, hF: [92, -20], hB: [10, 12], fF: [56, 0], fB: [-30, 0] }), 'outExpo'],
        [26, P({ y: -98, x: 20, lean: 22, hF: [88, -18], hB: [10, 12], fF: [56, 0], fB: [-30, 0] })], [45, st]),
      onStart: (f, g) => { g.superFreeze(f, 16); g.cutIn(f, 'ROUGH ENERGY', '荒い呪力'); SFX('charge', 200, 0.5); },
      onFrame: (f, t) => {
        if (t < 16 && t % 2 === 0) { const h = handPos(f); roughShards(h.x, h.y, 1, 0.3); FX.add({ type: 'dot', x: h.x, y: h.y, vx: 0, vy: 0, r: 20 + t, color: green, life: 6 }); }
      },
      onHit: (att, def, g) => {
        // the rough energy sticks... then detonates
        FX.add({
          type: 'custom', x: def.x, y: def.y, life: 26,
          u: (p) => { p.x = def.x; p.y = def.y; },
          d: (ctx, p, k) => {
            const rr = JK.rng(Math.floor(p.t));
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = JK.rgba('#2aff7a', 0.8); ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i <= 14; i++) {
              const a = (i / 14) * Math.PI * 2, r = 70 + rr() * 40 * (0.5 + k);
              const x = p.x + Math.cos(a) * r * 0.7, y = p.y - 120 + Math.sin(a) * r;
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke(); ctx.restore();
          },
        });
        g.later(24, () => {
          if (def.state === 'ko' || def.hp <= 0 || def.invuln > 0) return;
          FX.explosion(def.x, def.y - 120, 1.1, green);
          roughShards(def.x, def.y - 120, 14, 1.3);
          SFX('explosion', 1); g.shake(12, 14);
          def.receive(att, { dmg: 85, level: 'unblockable', knockdown: true, knockVy: -10, airKb: 9, kb: 8, hitstun: 24, hitstop: 10, power: 3, sparkColor: green, noBF: true }, def.x, def.y - 130, { sureHit: true, projectile: true, dir: att.facing });
        });
      },
    };

    // ---- JACKPOT: every attack becomes a heavy blast of rough cursed energy (hyper armor on the big ones)
    const blast = (f, x, y, s = 1) => {
      FX.add({ type: 'flash', x, y, r: 130 * s, color: green, life: 10 });
      FX.add({ type: 'ring', x, y, r0: 10, r1: 150 * s, w: 8, color: green, life: 14 });
      roughShards(x, y, Math.round(6 * s), s);
    };
    const jpBase = { sparkColor: green, trail: 'hF', trailColor: green, noBF: true };
    M.jp_light = Object.assign({}, jpBase, {
      name: 'Jackpot Jab', normal: true, startup: 4, active: 3, recovery: 9, dmg: 60, hitstun: 17, blockstun: 12, kb: 5, level: 'high',
      hit: [30, 130, -205, -140], hitstop: 7, power: 2, chip: 6, whoosh: 2,
      chain: { light: 'jp_light2', heavy: 'jp_heavy', kick: 'jp_kick' }, anim: M.light.anim,
      onFrame: (f, t) => { if (t === 4) { const h = handPos(f); blast(f, h.x + f.facing * 30, h.y, 0.5); } },
    });
    M.jp_light2 = Object.assign({}, jpBase, {
      name: 'Jackpot Hook', normal: true, startup: 5, active: 3, recovery: 11, dmg: 72, hitstun: 19, blockstun: 13, kb: 6, level: 'high',
      hit: [30, 140, -205, -140], hitstop: 8, power: 2, chip: 7, whoosh: 2, trail: 'hB',
      chain: { heavy: 'jp_heavy', kick: 'jp_kick' }, anim: M.light2.anim,
      onFrame: (f, t) => { if (t === 5) { const h = handPos(f, 'haB'); blast(f, h.x + f.facing * 30, h.y, 0.6); } },
    });
    M.jp_heavy = Object.assign({}, jpBase, {
      name: 'Rough Cannon', normal: true, armor: true, startup: 9, active: 5, recovery: 18, dmg: 135, hitstun: 24, blockstun: 18, kb: 12, level: 'mid',
      hit: [30, 240, -225, -110], hitstop: 13, power: 3, chip: 16, knockdown: true, knockVy: -9, airKb: 13, whoosh: 6, whooshHeavy: true, chain: { kick: 'jp_kick' }, anim: M.heavy.anim,
      onFrame: (f, t, g) => {
        if (t !== 9) return;
        const h = handPos(f);
        blast(f, h.x + f.facing * 60, h.y, 1.1);
        FX.add({ type: 'slash', x: h.x + f.facing * 90, y: h.y, ang: f.facing > 0 ? 0 : Math.PI, len: 220, curve: 0, w: 26, color: green, life: 10 });
        SFX('explosion', 0.6); g.shake(8, 8);
      },
    });
    M.jp_kick = Object.assign({}, jpBase, {
      name: 'Jackpot Kick', normal: true, armor: true, startup: 8, active: 4, recovery: 16, dmg: 115, hitstun: 22, blockstun: 16, kb: 13, level: 'mid',
      hit: [40, 170, -175, -80], hitstop: 12, power: 3, chip: 13, knockdown: true, knockVy: -9, airKb: 14, whoosh: 5, trail: 'fF', chain: {}, anim: M.kick.anim,
      onFrame: (f, t) => { if (t === 8) blast(f, f.x + f.facing * 130, f.y - 130, 0.9); },
    });
    M.jp_t1 = Object.assign({}, jpBase, {
      name: 'Jackpot Burst', special: true, armor: true, startup: 12, active: 4, recovery: 24, dmg: 150, hitstun: 28, blockstun: 20, kb: 10, level: 'mid',
      hit: [-150, 210, -320, 0], hitstop: 14, power: 3, chip: 18, launch: true, launchVy: -16, airKb: 8,
      anim: seq([0, st], [9, P({ y: -86, lean: 24, head: 10, hF: [20, 40], hB: [14, 44], fF: [40, 0], fB: [-40, 0] }), 'outQuad'],
        [12, P({ y: -116, lean: -14, head: -18, hF: [40, -80], hB: [-30, -76], gF: 'open', gB: 'open', fF: [40, 0], fB: [-40, 0] }), 'outExpo'],
        [26, P({ y: -116, lean: -14, head: -18, hF: [40, -80], hB: [-30, -76], gF: 'open', gB: 'open', fF: [40, 0], fB: [-40, 0] })], [40, st]),
      onFrame: (f, t, g) => {
        if (t !== 12) return;
        SFX('explosion', 1.2); SFX('impact');
        g.shake(14, 16); g.zoomPunch(0.06);
        for (let i = 0; i < 3; i++) FX.add({ type: 'ring', x: f.x, y: f.y - 130, r0: 20, r1: 200 + i * 80, w: 12 - i * 3, color: i === 1 ? '#ffffff' : green, life: 16 + i * 5 });
        FX.explosion(f.x, f.y - 130, 1.3, green);
        roughShards(f.x, f.y - 130, 16, 1.5);
      },
    });
    M.jp_t1d = Object.assign({}, jpBase, {
      name: 'Rising Surge', special: true, armor: true, startup: 7, active: 6, recovery: 22, dmg: 115, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 6,
      hit: [0, 140, -360, -60], hitstop: 12, power: 3, chip: 12, launch: true, launchVy: -18, airKb: 4,
      anim: M.t1d.anim,
      onFrame: (f, t) => {
        if (t !== 7) return;
        const x = f.x + f.facing * 60;
        FX.add({ type: 'custom', layer: 'back', x, y: 0, life: 18, d: (ctx, p, k) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const w = 70 * (1 - k); const gr = ctx.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(42,255,122,0)'); gr.addColorStop(0.5, `rgba(200,255,220,${0.8 * (1 - k)})`); gr.addColorStop(1, 'rgba(42,255,122,0)'); ctx.fillStyle = gr; ctx.fillRect(x - w, -700, w * 2, 700); ctx.restore(); } });
        roughShards(x, -100, 10, 1.2); SFX('explosion', 0.7);
      },
    });
    M.jp_t2 = Object.assign({}, jpBase, {
      name: 'Rough Wave', special: true, armor: true, startup: 12, active: 1, recovery: 18, dmg: 0,
      anim: seq([0, st], [8, P({ y: -96, lean: -6, head: -6, hF: [-20, -60], hB: [-30, -50], gF: 'open', gB: 'open', fF: [30, 0], fB: [-36, 0] }), 'outQuad'],
        [12, P({ y: -84, x: 16, lean: 40, head: 12, hF: [70, 60], hB: [56, 62], gF: 'open', gB: 'open', fF: [52, 0], fB: [-30, 0] }), 'inCubic'], [30, st]),
      onFrame: (f, t, g) => {
        if (t !== 12) return;
        SFX('explosion', 0.9); g.shake(10, 10);
        spawn(f, {
          kind: 'roughwave', x: f.x + f.facing * 90, y: -110, w: 110, h: 220, vx: f.facing * 17, life: 60, hits: 3, every: 5, dmg: 50, kb: 5, hitstun: 18, blockstun: 12, hitstop: 5,
          power: 2, sparkColor: green, chip: 7, prio: 3, pierce: true, knockdownLast: true, seed: Math.floor(Math.random() * 999),
          u: (p) => { p.x += p.vx; if (p.t % 2 === 0) FX.debris(p.x, 0, 1, '#4a5a50'); },
          d: drawRoughWave,
          onDeath: (p) => FX.explosion(p.x, p.y, 0.8, green),
        });
      },
    });
    M.jp_t3 = Object.assign({}, jpBase, {
      name: 'Jackpot Rush', special: true, armor: true, cost: 0, startup: 20, active: 28, recovery: 26, hits: 7, hitEvery: 4, dmg: 34, hitstun: 22, blockstun: 10, kb: 1.5, level: 'mid',
      hit: [20, 150, -230, -60], hitstop: 4, power: 2, chip: 5, vel: [[16, 24, 12]], ghost: true,
      anim: seq([0, st], [16, P({ y: -98, lean: 18, head: -4, hF: [10, -6], hB: [16, 0], fF: [36, 0], fB: [-36, 0] })],
        [20, P({ y: -100, x: 14, lean: 22, hF: [92, -18], hB: [16, 6], fF: [48, 0], fB: [-28, 0] })],
        [24, P({ y: -100, x: 14, lean: 22, tw: -4, hF: [20, 6], hB: [92, -14], fF: [48, 0], fB: [-28, 0] })],
        [28, P({ y: -100, x: 14, lean: 22, hF: [92, -18], hB: [16, 6], fF: [48, 0], fB: [-28, 0] })],
        [32, P({ y: -100, x: 14, lean: 22, tw: -4, hF: [20, 6], hB: [92, -14], fF: [48, 0], fB: [-28, 0] })],
        [36, P({ y: -100, x: 14, lean: 22, hF: [92, -18], hB: [16, 6], fF: [48, 0], fB: [-28, 0] })],
        [40, P({ y: -100, x: 14, lean: 22, tw: -4, hF: [20, 6], hB: [92, -14], fF: [48, 0], fB: [-28, 0] })],
        [48, P({ y: -118, x: 12, lean: -8, head: -14, hF: [30, -92], hB: [10, 12], fF: [34, -4], fB: [-20, 0] }), 'outExpo'], [74, st]),
      onStart: (f, g) => { g.superFreeze(f, 18); g.cutIn(f, 'JACKPOT RUSH', '大当たり'); SFX('charge', 260, 0.5); },
      onFrame: (f, t, g) => {
        if (t >= 20 && t < 48 && t % 4 === 0) { const h = handPos(f, t % 8 ? 'haB' : 'haF'); blast(f, h.x + f.facing * 30, h.y, 0.5); }
        if (t === 48 && f.connected) {
          const o = f.opp;
          if (o.hurtboxes().length && Math.abs(o.x - f.x) < 260) {
            FX.explosion(o.x, o.y - 130, 1.6, green);
            SFX('explosion', 1.4); SFX('impact');
            g.shake(20, 20); g.flashScreen('#9dffc4', 0.5, 12);
            o.receive(f, { dmg: 120, level: 'unblockable', launch: true, launchVy: -18, airKb: 12, kb: 10, hitstun: 30, hitstop: 14, power: 3, sparkColor: green, noBF: true }, o.x, o.y - 140, { sureHit: true, projectile: true, dir: f.facing });
          }
        }
      },
    });
    M.domain = domainMove(ch, st, P({ y: -104, lean: 4, head: -6, hF: [40, -24], hB: [36, -20], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] }));
    ch.throwFx = (att, v, t, g) => { if (t === 24) { roughShards(v.x, v.y - 110, 10); SFX('hit', 2); } };
  }

  // ================================================================== YUTA
  // Rika: a towering curse with a gaping grin and grasping arms. (x, y) = where she stands.
  function drawRika(ctx, x, y, s, dir, t, a = 1, reach = 0) {
    if (a <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * s, s);
    JK.drawGlow(ctx, '#ff4a98', 40, -240, 280, 0.25 * a);
    JK.drawGlow(ctx, '#5a2aff', 0, -160, 240, 0.25 * a);
    ctx.globalAlpha = a * 0.92;
    const skin = '#d9d2e6', shade = '#7a6a98', dark = '#140a1c';
    const bob = Math.sin(t * 0.12) * 5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // jointed arm: shoulder -> elbow -> clawed hand
    const arm = (sx, sy, hx, hy, w) => {
      const ex = (sx + hx) / 2 - 20, ey = Math.max(sy, hy) + 40;
      for (const [lw, c] of [[w + 7, dark], [w, skin]]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      }
      ctx.strokeStyle = shade; ctx.lineWidth = w * 0.35;
      ctx.beginPath(); ctx.moveTo(sx, sy + w * 0.25); ctx.lineTo(ex, ey + w * 0.25); ctx.stroke();
      ctx.fillStyle = skin; ctx.strokeStyle = dark; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(hx, hy, w * 0.9, w * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark;
      for (let i = 0; i < 5; i++) {
        const an = -0.9 + i * 0.42;
        const cx = hx + Math.cos(an) * w * 0.7, cy = hy + Math.sin(an) * w * 0.6;
        ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.quadraticCurveTo(cx + Math.cos(an) * 30, cy + Math.sin(an) * 30 - 6, cx + Math.cos(an) * 52, cy + Math.sin(an) * 52); ctx.lineTo(cx + 4, cy + 3); ctx.closePath(); ctx.fill();
      }
    };
    // dark mane streaming behind her
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(40, -350 + bob);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-40 - i * 12 + Math.sin(t * 0.1 + i) * 8, -330 + i * 34 + bob);
    ctx.lineTo(-10, -140); ctx.lineTo(30, -260 + bob); ctx.closePath(); ctx.fill();
    arm(-10, -250 + bob, 110 + reach * 150, -170 + bob + reach * 60, 18);
    // hunched torso dissolving into smoke
    const gr = ctx.createLinearGradient(0, -320, 0, 0);
    gr.addColorStop(0, skin); gr.addColorStop(0.55, shade); gr.addColorStop(1, 'rgba(60,40,90,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.bezierCurveTo(-70, -130, -60, -270, -5, -310 + bob);
    ctx.bezierCurveTo(40, -330 + bob, 80, -290 + bob, 70, -220 + bob);
    ctx.bezierCurveTo(60, -150, 40, -60, 25, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.stroke();
    // ribs
    ctx.strokeStyle = JK.rgba('#3a2a50', 0.8); ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-30, -250 + i * 26 + bob); ctx.quadraticCurveTo(15, -238 + i * 26 + bob, 50, -252 + i * 26 + bob); ctx.stroke(); }
    // head: a crown of horns, tiny burning eyes, and that enormous grin
    const hx = 62, hy = -318 + bob;
    ctx.fillStyle = dark;
    for (let i = 0; i < 7; i++) {
      const bx = hx - 48 + i * 15, h = 24 + (i % 2) * 22 + (i === 3 ? 16 : 0);
      ctx.beginPath(); ctx.moveTo(bx - 7, hy - 36); ctx.quadraticCurveTo(bx - 4, hy - 40 - h * 0.6, bx + 3, hy - 38 - h); ctx.lineTo(bx + 8, hy - 38); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(hx, hy, 58, 48, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = JK.rgba('#7a6a98', 0.5);
    ctx.beginPath(); ctx.ellipse(hx - 22, hy + 8, 30, 34, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26060e';
    ctx.beginPath(); ctx.moveTo(hx - 30, hy + 2); ctx.quadraticCurveTo(hx + 18, hy + 58, hx + 60, hy - 6); ctx.quadraticCurveTo(hx + 18, hy + 20, hx - 30, hy + 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#f8f4ff';
    for (let i = 0; i < 10; i++) {
      const u = i / 9, mx = hx - 26 + u * 84, my = hy + 3 + Math.sin(u * Math.PI) * 14 - u * 8;
      ctx.beginPath(); ctx.moveTo(mx - 3.5, my); ctx.lineTo(mx, my + 9); ctx.lineTo(mx + 3.5, my); ctx.closePath(); ctx.fill();
      const ly = hy + 3 + Math.sin(u * Math.PI) * 30 - u * 8;
      if (i > 1 && i < 8) { ctx.beginPath(); ctx.moveTo(mx - 3, ly); ctx.lineTo(mx, ly - 8); ctx.lineTo(mx + 3, ly); ctx.closePath(); ctx.fill(); }
    }
    for (const [ex, ey] of [[hx + 12, hy - 20], [hx + 36, hy - 24]]) {
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(ex, ey, 9, 6, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2a6a'; ctx.beginPath(); ctx.arc(ex + 1, ey, 2.8, 0, Math.PI * 2); ctx.fill();
      JK.drawGlow(ctx, '#ff2a6a', ex, ey, 18, 0.7);
    }
    arm(30, -235 + bob, 160 + reach * 170, -140 + bob + reach * 70, 22);
    ctx.restore();
  }
  JK.drawRika = drawRika;
  JK.drawPachinko = drawPachinko;
  function drawPureLoveBeam(ctx, p) {
    const k = p.t < 8 ? p.t / 8 : p.t > p.life - 16 ? Math.max(0, (p.life - p.t) / 16) : 1;
    const x0 = p.x0, x1 = p.x0 + p.dir * 2600, y = p.y, hh = 90 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, c] of [[hh * 1.8, 'rgba(122,74,255,0.25)'], [hh, 'rgba(255,106,168,0.45)'], [hh * 0.55, 'rgba(230,220,255,0.85)'], [hh * 0.2, 'rgba(255,255,255,1)']]) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.min(x0, x1), y - w / 2 + Math.sin(p.t * 0.9) * 2, Math.abs(x1 - x0), w);
    }
    JK.drawGlow(ctx, '#ff9ac8', x0, y, 200 * k, 0.8);
    ctx.restore();
  }
  JK.drawPureLoveBeam = drawPureLoveBeam;
  function yutaMoves(ch, M, st) {
    const violet = '#b8a8ff', pink = '#ff6aa8';
    const cutPose = P({ y: -98, x: 18, lean: 26, head: 0, hF: [84, -10], hB: [-10, 20], gB: 'open', fF: [56, 0], fB: [-30, 0], wa: -10 });
    M.t1 = {
      name: 'Cursed Blade', special: true, startup: 9, active: 5, recovery: 17, dmg: 86, hitstun: 22, blockstun: 16, kb: 9, level: 'mid',
      hit: [30, 185, -215, -90], hitstop: 10, power: 2, sparkColor: violet, vel: [[2, 10, 16]], ghost: true, trail: 'hF', trailColor: violet, slashFx: true, sfx: 'slash', chip: 9, whoosh: 9,
      anim: seq([0, st], [5, P({ y: -100, x: -6, lean: 10, head: -4, hF: [-6, 10], hB: [16, 12], gB: 'open', fF: [36, 0], fB: [-36, 0], wa: -150 }), 'outQuad'],
        [9, cutPose, 'outExpo'], [20, cutPose], [31, st]),
      onFrame: (f, t) => { if (t === 9) { FX.add({ type: 'slash', x: f.x + f.facing * 120, y: f.y - 150, ang: f.facing > 0 ? 0.15 : Math.PI - 0.15, len: 280, curve: 34, w: 12, color: violet, life: 12 }); JK.Audio.sample('katana', 0.5); } },
    };
    M.t1d = {
      name: 'Rising Moon', special: true, startup: 8, active: 5, recovery: 24, dmg: 86, hitstun: 26, blockstun: 16, kb: 3, level: 'mid', invuln: 7,
      hit: [0, 130, -300, -80], hitstop: 10, power: 3, sparkColor: violet, launch: true, launchVy: -17, airKb: 4, chip: 8, trail: 'hF', trailColor: violet, slashFx: true, sfx: 'slash',
      anim: seq([0, st], [4, P(ch.poses.crouch, { hF: [30, 24], wa: 60 })],
        [8, P({ y: -118, x: 8, lean: -12, head: -14, hF: [36, -88], hB: [0, 24], gB: 'open', fF: [30, -6], fB: [-18, 0], wa: -30 }), 'outExpo'],
        [20, P({ y: -118, x: 8, lean: -12, head: -14, hF: [34, -86], hB: [0, 24], gB: 'open', fF: [30, -6], fB: [-18, 0], wa: -30 })], [37, st]),
      onFrame: (f, t) => { if (t === 8) FX.add({ type: 'slash', x: f.x + f.facing * 50, y: f.y - 190, ang: -Math.PI / 2 + f.facing * 0.3, len: 220, curve: 28, w: 9, color: violet, life: 14 }); },
    };
    // I: Rika lunges out from behind Yuta and rakes everything in front of him
    M.t2 = {
      name: 'Rika', special: true, startup: 14, active: 1, recovery: 22, dmg: 0,
      anim: seq([0, st], [10, P({ y: -104, lean: -4, head: -8, hF: [40, -30], hB: [30, -26], gB: 'open', fF: [26, 0], fB: [-26, 0], wa: -60 }), 'outQuad'], [36, P(st, { head: -6 })], [37, st]),
      onStart: (f) => { f.rikaT = 50; SFX('charge', 160, 0.4); },
      onFrame: (f, t, g) => {
        if (t !== 14) return;
        if (!JK.Audio.sample('rika', 0.7)) SFX('whooshHeavy');
        g.shake(6, 8);
        spawn(f, {
          kind: 'rika', x: f.x + f.facing * 60, y: -150, w: 210, h: 260, vx: f.facing * 13, life: 34, hits: 3, every: 7, dmg: 44, kb: 8, hitstun: 22, blockstun: 14, hitstop: 8,
          power: 3, sparkColor: pink, slashFx: true, sfx: 'slash', chip: 7, prio: 3, pierce: true, persist: true, knockdownLast: true, from: 4, to: 24, dir: f.facing,
          u: (p) => { p.x += p.vx; p.vx *= 0.94; },
          d: (ctx, p) => drawRika(ctx, p.x - p.dir * 90, 0, 0.72, p.dir, p.t, Math.min(1, p.t / 4) * (p.t > 26 ? Math.max(0, (34 - p.t) / 8) : 1), JK.clamp((p.t - 4) / 8, 0, 1)),
        });
      },
    };
    // ← + I: Cursed Speech (copied from Inumaki). Freezes the target in place; it strains Yuta's throat.
    M.t2b = {
      name: 'Cursed Speech: "Don\'t move."', special: true, startup: 12, active: 1, recovery: 20, dmg: 0,
      anim: seq([0, st], [8, P(st, { head: -10, lean: -2, hB: [22, -64], gB: 'open' }), 'outQuad'], [30, P(st, { head: -8, hB: [22, -60], gB: 'open' })], [33, st]),
      onStart: (f) => { JK.Audio.say('Don\'t move.', { pitch: 0.8, rate: 1 }); },
      onFrame: (f, t, g) => {
        if (t !== 12) return;
        f.hp = Math.max(1, f.hp - 12); // throat backlash
        const h = handPos(f, 'haB');
        FX.text(f.x + f.facing * 60, f.y - 280, '動くな', { size: 54, color: '#e8e0ff', life: 40 });
        SFX('riser', 0.3);
        spawn(f, {
          kind: 'speech', x: f.x + f.facing * 60, y: f.y - 140, w: 90, h: 240, vx: f.facing * 18, life: 22, hits: 1, dmg: 5, kb: 0, hitstun: 2, blockstun: 2, hitstop: 4, power: 1,
          level: 'unblockable', sparkColor: '#e8e0ff', prio: 0, dir: f.facing,
          u: (p) => { p.x += p.vx; if (p.t % 2 === 0) FX.add({ type: 'ring', x: p.x, y: p.y, r0: 20, r1: 110, w: 4, color: '#e8e0ff', flat: 1.6, life: 10 }); },
          d: () => {},
          onHit(att, def) { def.stunT = 44; FX.text(def.x, def.y - 280, 'FROZEN', { size: 30, font: JK.FONT_TITLE, color: '#e8e0ff', life: 40 }); },
        });
        void h;
      },
    };
    // O: Pure Love — Yuta and a fully manifested Rika fire a colossal beam of cursed energy
    const beamPose = P({ y: -100, x: 8, lean: 12, head: -4, hF: [86, -30], hB: [70, -26], gF: 'open', gB: 'open', fF: [40, 0], fB: [-30, 0], wv: 0 });
    M.t3 = {
      name: 'Pure Love', special: true, cost: 200, startup: 70, active: 1, recovery: 30, dmg: 0, invuln: 74,
      anim: seq([0, st], [24, P({ y: -106, lean: -4, head: -10, hF: [30, -50], hB: [20, -44], gF: 'open', gB: 'open', fF: [26, 0], fB: [-26, 0], wv: 0 }), 'outQuad'], [70, beamPose, 'inCubic'], [100, beamPose], [110, st]),
      onStart: (f, g) => {
        g.superFreeze(f, 62);
        g.cutIn(f, 'PURE LOVE', '純愛砲');
        f.rikaT = 110;
        SFX('riser', 1.2); SFX('charge', 120, 0.6);
        JK.Audio.say('Pure love.', { pitch: 0.8, rate: 0.85 });
      },
      onFrame: (f, t, g) => {
        const h = handPos(f);
        if (t < 70) {
          FX.add({ type: 'dot', x: h.x + f.facing * 20, y: h.y, vx: 0, vy: 0, r: 20 + t * 0.9, color: t % 4 < 2 ? pink : '#e8e0ff', life: 4 });
          if (t % 3 === 0) FX.add({ type: 'swirl', cx: h.x, cy: h.y, ang: Math.random() * 6.28, rad: 140, spin: 0.15, pull: 4, r: 8, color: JK.pick([pink, violet, '#ffffff']), life: 30, x: h.x, y: h.y });
          if (t % 20 === 0) g.shake(3 + t / 20, 10);
        }
        if (t === 70) {
          SFX('explosion', 1.4); SFX('impact');
          g.negFlash(4); g.shake(22, 40); g.zoomPunch(0.12);
          g.flashScreen('#ffd8ec', 0.7, 16);
          spawn(f, {
            kind: 'purelove', x: h.x + f.facing * 700, x0: h.x, y: h.y, w: 1400, h: 150, vx: 0, life: 44, hits: 8, every: 4, dmg: 34, kb: 6, hitstun: 16, blockstun: 12, hitstop: 3,
            power: 3, sparkColor: pink, chip: 9, prio: 4, pierce: true, persist: true, knockdownLast: true, dir: f.facing,
            u: (p, g2) => { if (p.t % 6 === 0) g2.shake(6, 6); },
            d: drawPureLoveBeam,
          });
        }
      },
    };
    // Inside Authentic Mutual Love, U draws a katana holding a copied technique
    const COPIES = ['dom_t1bf', 'dom_t1ex', 'dom_t1gb', 'dom_t1ice'];
    M.dom_t1 = {
      name: 'Copy', special: true, noAmp: true, startup: 2, active: 1, recovery: 1, dmg: 0,
      anim: seq([0, st], [2, P(st, { hF: [10, 40], wa: 80 })]),
      onFrame: (f, t, g) => {
        if (t !== 2) return;
        const pick = COPIES.filter((c) => c !== f.lastCopy);
        const id = JK.simPick(pick);
        f.lastCopy = id;
        FX.add({ type: 'ring', x: f.x, y: f.y - 20, r0: 10, r1: 90, w: 4, color: violet, flat: 0.25, life: 12, layer: 'back' });
        SFX('slash');
        f.startMove(id);
      },
    };
    const label = (f, en, jp) => { FX.text(f.x, f.y - 300, jp, { size: 46, color: '#e8e0ff', life: 50 }); FX.text(f.x, f.y - 256, en, { size: 24, font: JK.FONT_TITLE, color: violet, life: 50 }); };
    M.dom_t1bf = {
      name: 'Copy: Black Flash', special: true, startup: 12, active: 4, recovery: 20, dmg: 70, hitstun: 26, blockstun: 16, kb: 8, level: 'mid', blackFlash: true,
      hit: [30, 120, -205, -120], hitstop: 10, power: 3, sparkColor: '#ff2040', vel: [[3, 12, 12]], ghost: true, trail: 'hB', trailColor: '#ff2040',
      anim: seq([0, st], [8, P({ y: -98, lean: 16, head: -6, hF: [20, 20], hB: [-12, 0], gB: 'fist', fF: [34, 0], fB: [-34, 0] }), 'outQuad'],
        [12, P({ y: -100, x: 16, lean: 22, head: -4, tw: -4, hF: [16, 10], hB: [90, -16], fF: [48, 0], fB: [-28, 0] }), 'outExpo'], [22, P({ y: -100, x: 16, lean: 20, hF: [16, 10], hB: [86, -14], fF: [48, 0], fB: [-28, 0] })], [34, st]),
      onStart: (f) => label(f, 'COPY: BLACK FLASH', '黒閃'),
    };
    M.dom_t1ex = {
      name: 'Copy: Cursed Speech "Explode."', special: true, startup: 10, active: 1, recovery: 22, dmg: 0,
      anim: M.t2b.anim,
      onStart: (f) => { label(f, 'COPY: CURSED SPEECH', '爆ぜろ'); JK.Audio.say('Explode.', { pitch: 0.8, rate: 1 }); },
      onFrame: (f, t, g) => {
        if (t !== 10) return;
        f.hp = Math.max(1, f.hp - 15);
        const o = f.opp;
        const x = o.x;
        FX.add({ type: 'ring', x, y: o.y - 120, r0: 120, r1: 10, w: 4, color: '#ffffff', life: 16 });
        g.later(16, () => {
          FX.explosion(x, o.y - 120, 1.2, '#ff8ac8');
          SFX('explosion', 1); g.shake(12, 12);
          if (Math.abs(o.x - x) < 120 && o.hurtboxes().length) o.receive(f, { dmg: 95, level: 'unblockable', knockdown: true, knockVy: -10, airKb: 7, kb: 7, hitstun: 24, hitstop: 10, power: 3, sparkColor: '#ff8ac8', noBF: true }, o.x, o.y - 130, { sureHit: true, projectile: true, dir: f.facing });
        });
      },
    };
    M.dom_t1gb = {
      name: 'Copy: Granite Blast', special: true, startup: 16, active: 1, recovery: 24, dmg: 0,
      anim: seq([0, st], [12, P({ y: -104, lean: 0, head: -6, hF: [50, -30], hB: [44, -26], gF: 'open', gB: 'open', fF: [28, 0], fB: [-26, 0] }), 'outQuad'], [16, beamPose, 'outExpo'], [34, beamPose], [40, st]),
      onStart: (f) => { label(f, 'COPY: GRANITE BLAST', '石流龍'); SFX('charge', 300, 0.3); },
      onFrame: (f, t, g) => {
        if (t !== 16) return;
        SFX('explosion', 0.9); g.shake(10, 12);
        const h = handPos(f);
        spawn(f, {
          kind: 'granite', x: h.x + f.facing * 500, x0: h.x, y: h.y, w: 1000, h: 90, vx: 0, life: 22, hits: 3, every: 5, dmg: 34, kb: 6, hitstun: 16, blockstun: 12, hitstop: 4,
          power: 2, sparkColor: '#ffd8a0', chip: 6, prio: 3, pierce: true, persist: true, knockdownLast: true, dir: f.facing,
          d: (ctx, p) => {
            const k = p.t < 4 ? p.t / 4 : Math.max(0, (p.life - p.t) / 10);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255,200,120,${0.4 * k})`; ctx.fillRect(Math.min(p.x0, p.x0 + p.dir * 1000), p.y - 40 * k, 1000, 80 * k);
            ctx.fillStyle = `rgba(255,255,230,${0.9 * k})`; ctx.fillRect(Math.min(p.x0, p.x0 + p.dir * 1000), p.y - 14 * k, 1000, 28 * k);
            ctx.restore();
          },
        });
      },
    };
    M.dom_t1ice = {
      name: 'Copy: Thin Ice Breaker', special: true, startup: 18, active: 4, recovery: 24, dmg: 0,
      anim: seq([0, st], [12, P({ y: -108, lean: -8, head: -12, hF: [30, -70], hB: [20, -60], gF: 'open', gB: 'open', fF: [26, 0], fB: [-26, 0], wv: 0 }), 'outQuad'],
        [18, P({ y: -90, x: 12, lean: 30, head: 8, hF: [70, 50], hB: [60, 54], gF: 'open', gB: 'open', fF: [46, 0], fB: [-28, 0], wv: 0 }), 'inCubic'], [42, st]),
      onStart: (f) => { label(f, 'COPY: SKY MANIPULATION', '薄氷破り'); },
      onFrame: (f, t, g) => {
        if (t !== 18) return;
        const o = f.opp;
        SFX('shatter'); SFX('explosion', 0.8);
        g.shake(14, 16); g.flashScreen('#cfe8ff', 0.4, 10);
        spawn(f, {
          kind: 'skyfold', x: o.x, y: -160, w: 220, h: 320, vx: 0, life: 20, from: 2, to: 6, dmg: 88, kb: 6, hitstun: 24, blockstun: 16, hitstop: 10, power: 3, level: 'overhead',
          sparkColor: '#cfe8ff', chip: 10, prio: 2, knockdown: true, knockVy: -6, airKb: 5, persist: true, dir: f.facing,
          d: (ctx, p) => {
            const k = p.t / p.life;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(207,232,255,${1 - k})`; ctx.lineWidth = 3;
            for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - 60); ctx.lineTo(p.x + Math.cos(a) * 260 * (0.4 + k), p.y - 60 + Math.sin(a) * 200 * (0.4 + k)); ctx.stroke(); }
            ctx.restore();
          },
        });
      },
    };
    M.domain = domainMove(ch, st, P({ y: -104, lean: 4, head: -6, hF: [34, -20], hB: [28, -22], gF: 'sign', gB: 'open', fF: [26, 0], fB: [-26, 0], wa: -90 }));
    ch.throwFx = (att, v, t, g) => { if (t === 24) { FX.slashMarks(v.x, v.y - 110, 2, violet, 1); SFX('slash', true); } };
  }

  // Reverse Cursed Technique (Gojo, Sukuna): heal, costs 1 bar, interrupted if hit.
  function rctMove(st) {
    const pose = P(st, { lean: -4, head: -14, hF: [18, -6], hB: [14, -2], gF: 'open', gB: 'open' });
    return {
      name: 'Reverse Cursed Technique', special: true, cost: 100, startup: 10, active: 1, recovery: 48, dmg: 0,
      anim: seq([0, st], [10, pose, 'outQuad'], [50, pose], [58, st]),
      onStart: (f, g) => { SFX('bell'); FX.text(f.x, f.y - 280, '反転術式', { size: 44, color: '#d8ffe8', life: 60 }); },
      onFrame: (f, t, g) => {
        if (t < 10 || t >= 50) return;
        f.hp = Math.min(f.maxHp, f.hp + 3.5);
        if (t % 2 === 0) FX.add({ type: 'dot', x: f.x + (Math.random() - 0.5) * 60, y: f.y - Math.random() * 220, vx: 0, vy: -2.5, r: 12, color: JK.pick(['#c8ffe0', '#ffffff', '#8fffc0']), life: 24 });
      },
    };
  }

  function domainMove(ch, st, signPose) {
    return {
      name: 'Domain Expansion', special: true, cost: 300, startup: 4, active: 1, recovery: 6, dmg: 0, invuln: 400,
      anim: seq([0, st], [16, signPose, 'outQuad'], [400, signPose]),
      onStart: (f, g) => { g.startDomain(f); },
    };
  }

  // ------------------------------------------------------------------ per-character poses + builder
  function setupPoses(ch, over) {
    const p = {};
    for (const k in G) p[k] = G[k];
    Object.assign(p, over);
    ch.poses = p;
  }

  const C = JK.Characters;

  // Gojo: hands in pockets, relaxed
  setupPoses(C.gojo, {
    stance: P({ y: -107, lean: -2, head: -3, hF: [3, 70], hB: [-4, 70], gF: 'pocket', gB: 'pocket', fF: [16, 0], fB: [-18, 0] }),
  });
  C.gojo.infinity = true;
  C.gojo.dmgScale = 0.74;
  C.gojo.walk = 1.0;
  C.gojo.walkStyle = 'cross';
  C.gojo.voicePitch = 0.8;
  C.gojo.idlePose = (f, t) => {
    const s = f.poses.stance;
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.05) * 1.2, head: s.head + Math.sin(t * 0.03) * 3, lean: s.lean + Math.sin(t * 0.04) * 1 });
  };
  C.gojo.winAnim = seq([0, C.gojo.poses.stance], [20, P({ y: -107, lean: -4, head: -10, hF: [16, -36], gF: 'sign', hB: [-4, 70], gB: 'pocket', fF: [14, 0], fB: [-18, 0] }), 'outBack'], [9999, P({ y: -107, lean: -4, head: -10, hF: [16, -36], gF: 'sign', hB: [-4, 70], gB: 'pocket', fF: [14, 0], fB: [-18, 0] })]);
  C.gojo.introAnim = seq([0, C.gojo.poses.stance], [20, P({ y: -107, lean: -2, head: -8, hF: [18, -44], gF: 'open', hB: [-4, 70], gB: 'pocket', fF: [16, 0], fB: [-18, 0] }), 'outQuad'], [60, P({ y: -107, lean: -2, head: -8, hF: [18, -46], gF: 'open', hB: [-4, 70], gB: 'pocket', fF: [16, 0], fB: [-18, 0] })], [80, C.gojo.poses.stance]);

  // Sukuna: menacing, claws out
  setupPoses(C.sukuna, {
    stance: P({ y: -103, lean: 9, head: 6, hF: [30, 4], hB: [10, 46], gF: 'claw', gB: 'open', fF: [30, 0], fB: [-28, 0] }),
  });
  C.sukuna.dmgScale = 0.96;
  C.sukuna.walk = 0.95;
  C.sukuna.walkStyle = 'cross';
  C.sukuna.voicePitch = 0.2;
  C.sukuna.idlePose = (f, t) => {
    const s = f.poses.stance;
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.06) * 1.5, hF: [s.hF[0] + Math.sin(t * 0.07) * 3, s.hF[1] + Math.cos(t * 0.07) * 2] });
  };
  C.sukuna.winAnim = seq([0, C.sukuna.poses.stance], [24, P({ y: -108, lean: -12, head: -24, hF: [50, -34], hB: [-40, -34], gF: 'open', gB: 'open', fF: [22, 0], fB: [-22, 0] }), 'outQuad'],
    [60, P({ y: -108, lean: -14, head: -30, hF: [52, -38], hB: [-42, -36], gF: 'open', gB: 'open', fF: [22, 0], fB: [-22, 0] })], [9999, P({ y: -108, lean: -14, head: -30, hF: [52, -38], hB: [-42, -36], gF: 'open', gB: 'open', fF: [22, 0], fB: [-22, 0] })]);
  C.sukuna.introAnim = seq([0, C.sukuna.poses.stance], [20, P(C.sukuna.poses.stance, { head: 34 })], [40, P(C.sukuna.poses.stance, { head: -24 })], [70, C.sukuna.poses.stance]);

  // Yuji: boxing stance, bouncy
  setupPoses(C.yuji, {
    stance: P({ y: -101, lean: 10, head: -4, hF: [34, -16], hB: [24, -8], fF: [30, 0], fB: [-28, 0] }),
  });
  C.yuji.dmgScale = 1.18;
  C.yuji.walk = 1.12;
  C.yuji.dash = 1.1;
  C.yuji.bfBoost = 2.2;
  C.yuji.voicePitch = 1.0;
  C.yuji.idlePose = (f, t) => {
    const s = f.poses.stance;
    const b = Math.abs(Math.sin(t * 0.11));
    return Object.assign({}, s, { y: s.y + b * 4 - 2, hF: [s.hF[0] + Math.sin(t * 0.11) * 2, s.hF[1] + b * 3], fF: [s.fF[0], 0], fB: [s.fB[0], 0] });
  };
  C.yuji.winAnim = seq([0, C.yuji.poses.stance], [18, P({ y: -108, lean: -2, head: -12, hF: [22, -84], hB: [20, 20], fF: [20, 0], fB: [-22, 0] }), 'outBack'], [9999, P({ y: -108, lean: -2, head: -12, hF: [22, -84], hB: [20, 20], fF: [20, 0], fB: [-22, 0] })]);
  C.yuji.introAnim = seq([0, C.yuji.poses.stance], [14, P({ y: -104, lean: 6, hF: [44, -6], hB: [40, -6], gB: 'open', fF: [26, 0], fB: [-26, 0] })], [22, P({ y: -104, lean: 8, hF: [40, -4], hB: [44, -6], gB: 'open', fF: [26, 0], fB: [-26, 0] })],
    [40, P({ y: -104, lean: 8, hF: [40, -4], hB: [44, -6], gB: 'open', fF: [26, 0], fB: [-26, 0] })], [60, C.yuji.poses.stance]);

  // Megumi: shadow hand-sign ready
  setupPoses(C.megumi, {
    stance: P({ y: -104, lean: 6, head: -2, hF: [28, -6], hB: [18, 8], gF: 'sign', gB: 'open', fF: [26, 0], fB: [-26, 0] }),
  });
  C.megumi.dmgScale = 1.12;
  C.megumi.walk = 1.0;
  C.megumi.voicePitch = 0.8;
  C.megumi.idlePose = (f, t) => {
    const s = f.poses.stance;
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.06) * 1.3 });
  };
  C.megumi.winAnim = seq([0, C.megumi.poses.stance], [20, P({ y: -107, lean: -1, head: -6, hF: [3, 70], hB: [-4, 70], gF: 'pocket', gB: 'pocket', fF: [14, 0], fB: [-16, 0] })], [9999, P({ y: -107, lean: -1, head: -6, hF: [3, 70], hB: [-4, 70], gF: 'pocket', gB: 'pocket', fF: [14, 0], fB: [-16, 0] })]);
  C.megumi.introAnim = seq([0, C.megumi.poses.stance], [20, P({ y: -104, lean: 4, hF: [40, -22], hB: [38, -18], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] })], [60, P({ y: -104, lean: 4, hF: [40, -22], hB: [38, -18], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] })], [80, C.megumi.poses.stance]);

  // Jogo: short-tempered volcano curse, one palm forward
  setupPoses(C.jogo, {
    stance: P({ y: -104, lean: 5, head: 2, hF: [24, 20], hB: [6, 46], gF: 'open', gB: 'open', fF: [28, 0], fB: [-26, 0] }),
  });
  C.jogo.dmgScale = 1.0;
  C.jogo.walk = 0.9;
  C.jogo.voicePitch = 0.5;
  C.jogo.idlePose = (f, t) => {
    const s = f.poses.stance;
    if (t % 14 === 0 && f.x !== undefined && f.J) JK.FX.add({ type: 'smoke', layer: 'back', x: f.x + (f.J.head.x) * f.facing, y: f.y + f.J.head.y - 40, vx: -f.facing * 0.3, vy: -1.2, r: 7, color: '#6a6060', alpha: 0.4, life: 40 });
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.07) * 1.4, hF: [s.hF[0] + Math.sin(t * 0.05) * 3, s.hF[1]] });
  };
  C.jogo.winAnim = seq([0, C.jogo.poses.stance], [22, P({ y: -110, lean: -12, head: -22, hF: [40, -80], hB: [-30, -76], gF: 'open', gB: 'open', fF: [24, 0], fB: [-24, 0] }), 'outBack'],
    [9999, P({ y: -110, lean: -12, head: -22, hF: [40, -80], hB: [-30, -76], gF: 'open', gB: 'open', fF: [24, 0], fB: [-24, 0] })]);
  C.jogo.introAnim = seq([0, C.jogo.poses.stance], [20, P(C.jogo.poses.stance, { head: -24, lean: -6, hF: [30, -20] })], [55, P(C.jogo.poses.stance, { head: -24, lean: -6, hF: [30, -20] })], [75, C.jogo.poses.stance]);

  // Higuruma: calm lawyer, gavel held low
  setupPoses(C.higuruma, {
    stance: P({ y: -106, lean: 3, head: -4, hF: [24, 16], hB: [6, 52], gF: 'fist', gB: 'open', fF: [22, 0], fB: [-22, 0], wa: -110 }),
  });
  C.higuruma.dmgScale = 1.4;
  C.higuruma.walk = 1.02;
  C.higuruma.walkStyle = 'cross';
  C.higuruma.voicePitch = 0.6;
  C.higuruma.idlePose = (f, t) => {
    const s = f.poses.stance;
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.05) * 1.2, hF: [s.hF[0], s.hF[1] + Math.sin(t * 0.08) * 3], wa: s.wa + Math.sin(t * 0.08) * 6 });
  };
  C.higuruma.winAnim = seq([0, C.higuruma.poses.stance], [20, P({ y: -107, lean: -4, head: -12, hF: [30, -60], hB: [6, 52], gB: 'open', fF: [20, 0], fB: [-20, 0], wa: -20, ws: 1.8 }), 'outBack'],
    [9999, P({ y: -107, lean: -4, head: -12, hF: [30, -60], hB: [6, 52], gB: 'open', fF: [20, 0], fB: [-20, 0], wa: -20, ws: 1.8 })]);
  C.higuruma.introAnim = seq([0, C.higuruma.poses.stance], [20, P(C.higuruma.poses.stance, { hF: [40, -40], wa: -30, ws: 1.8, head: -8 }), 'outQuad'],
    [28, P(C.higuruma.poses.stance, { hF: [46, -6], wa: 20, ws: 1.8, head: -2 }), 'inCubic'], [60, P(C.higuruma.poses.stance, { hF: [46, -6], wa: 20, ws: 1.8 })], [80, C.higuruma.poses.stance]);

  // Nanami: businesslike guard, blade forward
  setupPoses(C.nanami, {
    stance: P({ y: -103, lean: 8, head: -4, hF: [34, 14], hB: [22, 12], gF: 'fist', gB: 'open', fF: [28, 0], fB: [-26, 0], wa: -38 }),
  });
  C.nanami.dmgScale = 1.16;
  C.nanami.walk = 0.95;
  C.nanami.voicePitch = 0.55;
  C.nanami.idlePose = (f, t) => {
    const s = f.poses.stance;
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.055) * 1.3, head: s.head + Math.sin(t * 0.03) * 1.5 });
  };
  C.nanami.winAnim = seq([0, C.nanami.poses.stance], [20, P({ y: -107, lean: -2, head: -6, hF: [16, -36], hB: [26, -66], gB: 'point', fF: [18, 0], fB: [-20, 0], wa: -150 }), 'outQuad'],
    [9999, P({ y: -107, lean: -2, head: -6, hF: [16, -36], hB: [26, -66], gB: 'point', fF: [18, 0], fB: [-20, 0], wa: -150 })]);
  C.nanami.introAnim = seq([0, C.nanami.poses.stance], [20, P(C.nanami.poses.stance, { hB: [26, -68], gB: 'point', head: -6 }), 'outQuad'], [60, P(C.nanami.poses.stance, { hB: [26, -68], gB: 'point', head: -6 })], [80, C.nanami.poses.stance]);

  // Hakari: loose, cocky guard
  setupPoses(C.hakari, {
    stance: P({ y: -103, lean: 8, head: -4, hF: [32, -10], hB: [20, 4], gF: 'fist', gB: 'fist', fF: [30, 0], fB: [-28, 0] }),
  });
  C.hakari.dmgScale = 1.06;
  C.hakari.walk = 1.05;
  C.hakari.voicePitch = 0.75;
  C.hakari.idlePose = (f, t) => {
    const s = f.poses.stance;
    // a rhythmic bounce, like he's dancing to the pachinko music
    const b = Math.sin(t * 0.14);
    return Object.assign({}, s, { y: s.y + Math.abs(b) * 3 - 1, lean: s.lean + b * 2, hF: [s.hF[0] + b * 3, s.hF[1] + Math.abs(b) * 2], head: s.head + b * 2 });
  };
  C.hakari.winAnim = seq([0, C.hakari.poses.stance], [14, P({ y: -106, lean: -4, head: -10, hF: [40, -60], hB: [-30, -56], gF: 'open', gB: 'open', fF: [30, 0], fB: [-20, -10], aB: 20 }), 'outBack'],
    [30, P({ y: -104, lean: 6, head: 4, hF: [-20, -60], hB: [40, -56], gF: 'open', gB: 'open', fF: [20, -10], fB: [-30, 0], aF: 20 })], [46, P({ y: -106, lean: -4, head: -10, hF: [40, -60], hB: [-30, -56], gF: 'open', gB: 'open', fF: [30, 0], fB: [-20, -10], aB: 20 })],
    [62, P({ y: -104, lean: 6, head: 4, hF: [-20, -60], hB: [40, -56], gF: 'open', gB: 'open', fF: [20, -10], fB: [-30, 0], aF: 20 })], [78, P({ y: -106, lean: -4, head: -10, hF: [40, -60], hB: [-30, -56], gF: 'open', gB: 'open', fF: [30, 0], fB: [-20, -10], aB: 20 })]);
  C.hakari.winAnim.loop = true;
  C.hakari.introAnim = seq([0, C.hakari.poses.stance], [16, P(C.hakari.poses.stance, { hF: [36, -50], gF: 'point', head: -8 }), 'outQuad'], [60, P(C.hakari.poses.stance, { hF: [36, -52], gF: 'point', head: -8 })], [80, C.hakari.poses.stance]);

  // Yuta: katana drawn low, calm
  setupPoses(C.yuta, {
    stance: P({ y: -103, lean: 8, head: -4, hF: [30, 10], hB: [18, 16], gF: 'fist', gB: 'open', fF: [30, 0], fB: [-28, 0], wa: -30 }),
  });
  C.yuta.dmgScale = 1.1;
  C.yuta.walk = 1.06;
  C.yuta.dash = 1.05;
  C.yuta.voicePitch = 0.85;
  C.yuta.idlePose = (f, t) => {
    const s = f.poses.stance;
    return Object.assign({}, s, { y: s.y + Math.sin(t * 0.06) * 1.3, wa: s.wa + Math.sin(t * 0.05) * 4 });
  };
  C.yuta.winAnim = seq([0, C.yuta.poses.stance], [20, P({ y: -107, lean: -2, head: -6, hF: [8, 30], hB: [-4, 60], gB: 'open', fF: [16, 0], fB: [-18, 0], wa: 150 }), 'outQuad'],
    [9999, P({ y: -107, lean: -2, head: -6, hF: [8, 30], hB: [-4, 60], gB: 'open', fF: [16, 0], fB: [-18, 0], wa: 150 })]);
  C.yuta.introAnim = seq([0, C.yuta.poses.stance], [20, P(C.yuta.poses.stance, { hB: [20, -40], gB: 'open', head: -8 }), 'outQuad'], [60, P(C.yuta.poses.stance, { hB: [20, -42], gB: 'open', head: -8 })], [80, C.yuta.poses.stance]);

  const SPECIALS = { hakari: hakariMoves, yuta: yutaMoves, gojo: gojoMoves, sukuna: sukunaMoves, yuji: yujiMoves, megumi: megumiMoves, jogo: jogoMoves, higuruma: higurumaMoves, nanami: nanamiMoves };
  // Technique cooldowns (frames), per move. Each button (U / I / O) has its own cooldown timer;
  // using any move on that button starts it. Unlisted moves use the button default.
  JK.CD_DEFAULT = { t1: 100, t2: 140, t3: 360 };
  const COOLDOWNS = {
    gojo: { t1: 200, t2: 210, t1d: 130, t3: 480, t3d: 720 },
    sukuna: { t1: 130, jt1: 130, t2: 170, t1d: 100, t3: 420, t3d: 720 },
    yuji: { t1: 95, t2: 120, t1d: 90, t3: 300 },
    megumi: { t1: 180, t2: 160, t1d: 110, t3: 360 },
    jogo: { t1: 130, t2: 140, t1d: 100, t3: 420 },
    higuruma: { t1: 95, t1d: 85, t2: 120, t3: 360 },
    nanami: { t1: 100, t1s: 100, t1c: 100, t1d: 100, t2: 170, t3: 1200 },
    hakari: { t1: 110, t2: 90, t1d: 100, t3: 360, jp_t1: 70, jp_t1d: 60, jp_t2: 60, jp_t3: 420 },
    yuta: { t1: 85, t1d: 95, t2: 130, t2b: 420, t3: 600, dom_t1: 40, dom_t1bf: 40, dom_t1ex: 40, dom_t1gb: 40, dom_t1ice: 40 },
  };
  // Which cooldown slot a move id uses: t1 / jt1 / t1d / t1b -> 't1'
  JK.cdGroup = (id) => { const m = /t[123]/.exec(id || ''); return m ? m[0] : null; };

  const cache = {};
  JK.buildMoves = function (ch) {
    if (cache[ch.id]) return cache[ch.id];
    const st = ch.poses.stance;
    const M = normals(ch, st);
    SPECIALS[ch.id](ch, M, st);
    if (ch.id === 'gojo' || ch.id === 'sukuna') M.t3d = rctMove(st);
    for (const k in M) {
      M[k].id = k;
      const grp = M[k].special && k !== 'domain' && !M[k].normal ? JK.cdGroup(k) : null;
      if (grp) M[k].cd = (COOLDOWNS[ch.id] || {})[k] ?? JK.CD_DEFAULT[grp];
    }
    cache[ch.id] = M;
    return M;
  };

  // Move list shown in the pause menu / character select.
  JK.MOVE_LIST = {
    common: [
      ['J / K / L', 'Light / Heavy / Kick'],
      ['J, J, J', 'Jab > Cross > Rising Elbow (launcher)'],
      ['↓ + K', 'Uppercut (launcher, anti-air)'],
      ['↓ + L', 'Sweep (low)'],
      ['→ + K', 'Overhead Smash (beats crouch block)'],
      ['H  or  J+L', 'Throw (beats block)'],
      ['SPACE', 'Block (hold ↓ to block low)'],
      ['SHIFT  or  →→', 'Dash (←+SHIFT backdash, also in air)'],
      ['SHIFT on hit', 'Dash-cancel a normal to chase'],
      ['L, L', 'Roundhouse > Spinning Heel (wall splat)'],
      ['← + L', 'Push Kick (makes space)'],
      ['Air J, K', 'Air strings: J then K or L'],
      ['SPACE (vs domain)', 'Simple Domain: 1 bar, weakens sure-hit'],
      ['U / I / O', 'Each technique button has its own cooldown'],
      ['E in a special', 'AMPLIFY: ½ bar, +35% dmg (during startup)'],
      ['SPACE just before a hit', 'Just Guard, then K: Flawless Block Attack'],
      ['→ + SPACE (comboed)', 'BREAKER: 2 bars, knocks the attacker away'],
      ['← + H', 'Back throw · press H when grabbed to escape'],
      ['Counter / punish', 'Some hits become KRUSHING BLOWS (once each)'],
    ],
    gojo: [['U', 'Lapse: Blue — pulls the enemy in'], ['I', 'Reversal: Red — repelling blast'], ['↓ + U', 'Teleport behind the enemy'], ['O  (2 bars)', 'Hollow Purple — super: erasing mass, ~26%'], ['↓ + O  (1 bar)', 'Reverse Cursed Technique — heal'], ['Q  (3 bars)', 'Domain: Unlimited Void — enemy paralyzed'], ['Passive', 'Infinity: no chip damage when blocking']],
    sukuna: [['U', 'Dismantle — flying slash (also in air)'], ['I', 'Cleave — rushing multi-cut'], ['↓ + U', 'Rising Cleave — anti-air'], ['O  (1 bar)', 'Divine Flame: Open — fire arrow, burns'], ['↓ + O  (1 bar)', 'Reverse Cursed Technique — heal'], ['Q  (3 bars)', 'Domain: Malevolent Shrine — endless slashes']],
    jogo: [['U', 'Ember Insects — three homing fire bugs'], ['I', 'Volcano — eruption under the enemy'], ['↓ + U', 'Flame Burst — explosive anti-air'], ['O  (1 bar)', 'Maximum: Meteor — colossal meteor drop'], ['Q  (3 bars)', 'Domain: Coffin of the Iron Mountain — burning sure-hit'], ['Passive', 'Heavy fire techniques leave the enemy burning']],
    yuji: [['U', 'Divergent Fist — delayed second impact'], ['I', 'Black Flash — press I AGAIN as the fist sparks'], ['↓ + U', 'Manji Kick — launcher'], ['O  (1 bar)', 'Cursed Barrage — rush combo'], ['Q  (3 bars)', 'Domain Expansion — every hit is a Black Flash'], ['Passive', 'Higher Black Flash chance on heavy hits']],
    higuruma: [['U', 'Gavel Strike — the gavel grows mid-swing'], ['I', 'Gavel Toss — boomerang, hits twice'], ['↓ + U', 'Gavel Uppercut — anti-air launcher'], ['O  (1 bar)', 'Colossal Gavel — giant overhead slam'], ['Q  (3 bars)', 'Deadly Sentencing — win the trial'], ['O (w/ Sword)', 'Execution — slow, blockable, kills on hit']],
    nanami: [['U, then U', 'Ratio 7:3 — strike ON the mark: CRITICAL'], ['I', 'Collapse — rubble erupts forward (low)'], ['↓ + U', 'Rising Ratio — anti-air launcher'], ['O  (1 bar)', 'Overtime — 10s: +30% dmg, easier 7:3'], ['Q  (3 bars)', 'Ultimate: Overtime Collapse'], ['Tip', 'Press U as the marker crosses 7:3']],
    hakari: [['U', 'Shutter Doors — slam shut on the enemy'], ['I', 'Pachinko Ball — bouncing ball'], ['↓ + U', 'Rough Uppercut — anti-air launcher'], ['O  (1 bar)', 'Rough Energy — sticks, then detonates'], ['Q  (3 bars)', 'Idle Death Gamble — use U / I twice to spin'], ['JACKPOT', '40s: energy moveset, constant RCT, only the Executioner\'s Sword can kill']],
    yuta: [['U', 'Cursed Blade — lunging katana slash'], ['I', 'Rika — she lunges out and rakes the enemy'], ['← + I', 'Cursed Speech: "Don\'t move." — freezes them'], ['↓ + U', 'Rising Moon — anti-air launcher'], ['O  (2 bars)', 'Pure Love — colossal cursed energy beam'], ['Q  (3 bars)', 'Authentic Mutual Love — U copies techniques']],
    megumi: [['U', 'Divine Dogs — shadow wolf charge'], ['I', 'Nue — diving strike from above (overhead)'], ['↓ + U', 'Toad — tongue launcher, anti-air'], ['O  (1 bar)', 'Max Elephant — crushing drop on the enemy'], ['Q  (3 bars)', 'Domain: Chimera Shadow Garden — shadow ambush']],
  };
})();
