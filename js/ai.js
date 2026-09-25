'use strict';
// CPU opponent. Perceives the player through a delayed snapshot buffer (reaction time),
// then blocks, anti-airs, punishes, zones and runs hit-confirmed combos depending on difficulty.
(function () {
  const LEVELS = {
    easy: { amp: 0, breaker: 0, tech: 0.1, fba: 0.1, react: 26, block: 0.16, antiAir: 0.1, punish: 0.12, combo: 0.2, special: 0.1, aggr: 0.35, domain: 0.004, jump: 0.05, throwRate: 0.04, bf: 0.12, mistake: 0.3, think: 20, clash: 4.5, finisher: 0.25, ratio: 0.12, exec: 0.05, trial: { speed: 34, err: 0.12 } },
    normal: { amp: 0.12, breaker: 0.012, tech: 0.3, fba: 0.35, react: 15, block: 0.5, antiAir: 0.45, punish: 0.45, combo: 0.65, special: 0.28, aggr: 0.55, domain: 0.02, jump: 0.08, throwRate: 0.14, bf: 0.45, mistake: 0.1, think: 10, clash: 7.5, finisher: 0.6, ratio: 0.33, exec: 0.2, trial: { speed: 24, err: 0.07 } },
    pro: { amp: 0.3, breaker: 0.05, tech: 0.55, fba: 0.8, react: 8, block: 0.88, antiAir: 0.85, punish: 0.9, combo: 0.96, special: 0.38, aggr: 0.66, domain: 0.08, jump: 0.1, throwRate: 0.28, bf: 0.9, mistake: 0.02, think: 5, clash: 10.5, finisher: 1, ratio: 0.55, exec: 0.45, trial: { speed: 17, err: 0.04 } },
    // Expert: near frame-perfect defence, Just Guards on reaction, punishes nearly every whiff
    expert: { amp: 0.5, breaker: 0.12, tech: 0.85, fba: 1, jg: 0.75, punishMul: 0.8, react: 2, block: 0.97, antiAir: 0.95, punish: 0.98, combo: 1, special: 0.42, aggr: 0.72, domain: 0.1, jump: 0.1, throwRate: 0.3, bf: 0.97, mistake: 0, think: 3, clash: 12.5, finisher: 1, ratio: 0.78, exec: 0.6, trial: { speed: 14, err: 0.03 } },
    dummy: { dummy: true, react: 10, think: 999 },
  };

  // Combo routes: {b: button, d: 'down'|'fwd'|null}
  const R = (...steps) => steps.map((s) => (typeof s === 'string' ? { b: s } : s));
  const ROUTES = {
    gojo: [R('light', 'light', 'heavy', 't2'), R('light', 'light', 't1'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('kick', 't2'), R('heavy', 'kick')],
    sukuna: [R('light', 'light', 'heavy', 't2'), R('light', 'light', 't1'), R('kick', 't2'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', 't1')],
    yuji: [R('light', 'light', 'heavy', 't1'), R('light', 'light', 't2'), R('light', 'light', 'light'), R('kick', 't1'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', 't2')],
    megumi: [R('light', 'light', 'heavy', 't1'), R('light', 'light', 't1'), R('kick', 't1'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' })],
    jogo: [R('light', 'light', 'heavy', { b: 't1', d: 'down' }), R('light', 'light', 't1'), R('kick', 't2'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', { b: 't1', d: 'down' })],
    higuruma: [R('light', 'light', 'heavy', 't1'), R('light', 'kick', 't1'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', 't1'), R('light', 'light', 'heavy', 't3'), R('light', 'light', 'light')],
    nanami: [R('light', 'light', 'heavy', 't1'), R('light', 'light', 't2'), R('kick', 't1'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', 't1')],
    yuta: [R('light', 'light', 'heavy', 't1'), R('light', 'light', 't2'), R('kick', 'kick'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', 't1'), R('light', 'kick', 't2')],
    hakari: [R('light', 'light', 'heavy', 't1'), R('light', 'light', 't2'), R('kick', 'kick'), R({ b: 'light', d: 'down' }, { b: 'heavy', d: 'down' }), R('heavy', 't3'), R('light', 'light', 'light')],
  };
  const ZONER = { gojo: ['t2', 't1', 't2', 't3'], sukuna: ['t1', 't1', 't3'], yuji: ['t1'], megumi: ['t1', 't2', 't2'], jogo: ['t1', 't2', 't2', 't3'], higuruma: ['t2', 't2'], nanami: ['t2', 't3'], yuta: ['t2', 't2', 't2b'], hakari: ['t2', 't1', 't2'] };
  const ANTI_AIR = { gojo: 'uppercut', sukuna: 't1d', yuji: 't1d', megumi: 't1d', jogo: 't1d', higuruma: 't1d', nanami: 't1d', yuta: 't1d', hakari: 't1d' };

  class AIController {
    constructor(level) {
      this.level = level;
      this.p = LEVELS[level] || LEVELS.normal;
      this.held = {};
      this.pressed = {};
      this.hist = [];
      this.queue = [];
      this.cool = 0;
      this.blockT = 0;
      this.blockLow = false;
      this.route = null;
      this.routeIdx = 0;
      this.routeWait = 0;
      this.threatId = null;
      this.oppBlockFrames = 0;
      this.aiBF = 0;
      this.dummyMode = 0;
      this.rg = false;
    }
    bind(f) { this.f = f; }
    // can this button's technique be used right now (cooldown, burnout, meter)?
    ready(b) {
      const f = this.f;
      const grp = JK.cdGroup(b);
      if (!grp) return true;
      if (f.burnout > 0 || f.confiscT > 0 || !f.cdReady(grp)) return false;
      if (grp === 't3' && f.execT > 0) return false; // O is Execution while the sword is out
      if (grp === 't3') return f.jpT > 0 || f.meter >= ((f.moves.t3 && f.moves.t3.cost) || 100);
      return true;
    }

    press(b) { this.pressed[b] = true; }
    dirKey(dir) {
      const f = this.f;
      if (dir === 'fwd') return f.facing > 0 ? 'right' : 'left';
      if (dir === 'back') return f.facing > 0 ? 'left' : 'right';
      return dir;
    }
    snapshot(o, g) {
      const m = o.state === 'move' ? o.move : null;
      return {
        x: o.x, y: o.y, vx: o.vx, vy: o.vy, state: o.state, facing: o.facing,
        moveId: m ? m.id : null, mt: o.mt, m, hp: o.hp,
      };
    }

    update(g) {
      this.pressed = {};
      const f = this.f;
      if (!f) return;
      const o = f.opp;
      this.hist.push(this.snapshot(o, g));
      if (this.hist.length > 40) this.hist.shift();
      const seen = this.hist[Math.max(0, this.hist.length - 1 - this.p.react)];
      const held = {};
      if (this.p.dummy) {
        // training dummy behaviours: 0 stand, 1 block, 2 crouch block, 3 jump, 4 random guard, 5 tech roll
        const m = this.dummyMode;
        const guard = f.actionable() || f.state === 'blockstun' || f.state === 'block';
        if ((m === 1 || m === 2) && guard) { held.block = true; if (m === 2) held.down = true; }
        if (m === 3 && f.actionable()) held.up = true;
        if (m === 4) {
          if (f.actionable() && f.state !== 'block' && g.frame % 30 === 0) this.rg = Math.random() < 0.5;
          if (this.rg && guard) { held.block = true; if (o.state === 'move' && o.move && o.move.level === 'low') held.down = true; }
        }
        if (m === 5 && f.state === 'knockdown' && f.st === 8) {
          const r = Math.random();
          if (r < 0.4) held[this.dirKey('back')] = true; else if (r < 0.7) held[this.dirKey('fwd')] = true;
          this.press('dash');
        }
        this.held = held;
        return;
      }
      if (!g.fighting && !g.finishPhase) { this.held = {}; this.queue.length = 0; return; }
      if (g.cinematic) { this.held = {}; return; }
      if (o.state === 'block' || o.state === 'blockstun') this.oppBlockFrames++;
      else this.oppBlockFrames = Math.max(0, this.oppBlockFrames - 0.5);

      // Finish them
      if (g.finishPhase) {
        if (g.finishPhase.winner === f) this.finishLogic(g, held, o);
        this.held = held;
        return;
      }

      const dist = Math.abs(o.x - f.x);
      if (this.cool > 0) this.cool--;

      // throw escape
      if (f.state === 'thrown' && f.st === 5 && Math.random() < (this.p.tech || 0)) { this.press('throw'); this.held = held; return; }
      // Breaker: spend 2 bars to bust out of a long combo
      if ((f.state === 'hitstun' || f.state === 'juggle') && f.comboTaken >= 3 && f.meter >= 200 && Math.random() < (this.p.breaker || 0)) {
        held[this.dirKey('fwd')] = true; this.press('block'); this.held = held; return;
      }
      // Flawless Block Attack right after a Just Guard
      if (f.jgT > 0 && f.jgT < 15 && Math.random() < (this.p.fba || 0) * 0.35) { this.press('heavy'); this.held = held; return; }
      // Amplify a special early in its startup when there's meter to spare
      if (f.state === 'move' && f.move && f.move.special && !f.move.cost && f.mt === 3 && !f.amp && f.meter >= 150 && Math.random() < (this.p.amp || 0)) this.press('amp');

      // Executioner's Sword: go for the kill when the opponent can't block
      if (f.execT > 0 && f.execCd <= 0 && f.burnout <= 0 && f.actionable() && dist < 150) {
        const open = ['hitstun', 'getup', 'landing', 'dizzy', 'skid'].includes(o.state) || (o.state === 'move' && o.move && o.mt > o.move.startup + o.move.active);
        if (Math.random() < (open ? this.p.exec : this.p.exec * 0.03)) { this.press('t3'); this.held = held; return; }
      }

      // tech out of knockdowns (quick rise / roll away / roll through)
      if (f.state === 'knockdown' && f.st === 7) {
        const rate = { easy: 0.1, normal: 0.4, pro: 0.7, expert: 0.9 }[this.level] || 0;
        if (Math.random() < rate) {
          const r = Math.random();
          if (r < 0.4) held[this.dirKey('back')] = true; else if (r < 0.6) held[this.dirKey('fwd')] = true;
          this.press('dash');
        }
        this.held = held;
        return;
      }

      // 1) running combo: press next step when the current move connected
      if (this.route && f.state === 'move') {
        const m = f.move;
        const step = this.route[this.routeIdx];
        if (step && f.connected && f.mt >= m.startup && f.mt < m.startup + m.active + 8) {
          const cont = f.hitConfirmed ? Math.random() < this.p.combo + 0.03 : (this.level === 'pro' || this.level === 'expert' ? step.b === 'light' : Math.random() < 0.3);
          if (cont && ++this.routeWait > (this.level === 'pro' || this.level === 'expert' ? 1 : 3)) {
            if (step.d) held[this.dirKey(step.d)] = true;
            this.press(step.b);
            this.setBF(step.b);
            this.routeIdx++;
            this.routeWait = 0;
            if (this.routeIdx >= this.route.length) this.route = null;
          } else if (!cont) this.route = null;
        }
        if (step && step.d) held[this.dirKey(step.d)] = true;
        this.held = held;
        return;
      }
      if (f.state !== 'move') this.route = null;

      // 2) defensive reactions (need a free state)
      const free = f.actionable() || f.state === 'blockstun';
      if (free) {
        const threat = this.detectThreat(g, seen, dist);
        if (threat) {
          if (this.threatId !== threat.id) {
            this.threatId = threat.id;
            this.blockRoll = Math.random() < this.p.block;
            this.aaRoll = Math.random() < this.p.antiAir;
          }
          if (threat.air && this.aaRoll && f.actionable() && dist < 280) {
            const aa = ANTI_AIR[f.id] || 'uppercut';
            this.doMove(this.ready(aa) ? aa : 'uppercut', held);
            this.held = held;
            return;
          }
          if (this.blockRoll) {
            this.blockT = threat.frames;
            this.blockLow = threat.low;
            // Expert: tap block a couple of frames before impact for a Just Guard
            if (this.p.jg && threat.hitAt && this.jgFor !== threat.id) { this.jgFor = threat.id; this.jgAt = Math.random() < this.p.jg ? threat.hitAt - 2 : -1; }
          }
        } else this.threatId = null;
      }
      if (this.blockT > 0 && (free || f.state === 'block')) {
        this.blockT--;
        held.block = true;
        if (this.p.jg && g.frame === this.jgAt) this.press('block');
        if (this.blockLow) held.down = true;
        this.queue.length = 0;
        this.held = held;
        return;
      }

      // 3) punish whiffs
      if (f.actionable() && seen.state === 'move' && seen.m && !seen.m.air) {
        const m = seen.m;
        const rec = seen.mt - (m.startup + m.active);
        if (rec > 0 && rec < m.recovery - 6 && dist < 200 && Math.random() < this.p.punish * (this.p.punishMul || 0.25)) {
          this.startRoute(held, dist);
          this.held = held;
          return;
        }
      }

      // running: keep sprinting in, then open up with a combo
      if (f.state === 'run') {
        this.queue.length = 0;
        if (dist < 200) this.startRoute(held, dist); else held[this.dirKey('fwd')] = true;
        this.held = held;
        return;
      }

      // 4) queued plan
      if (this.queue.length) {
        const q = this.queue[0];
        if (q.hold) for (const k of q.hold) held[this.dirKey(k)] = true;
        if (q.press && !q.done) {
          for (const k of q.press) this.press(k);
          q.done = true;
          if (q.press.includes('t2')) this.setBF('t2');
        }
        if (q.until && q.until(f, o, g)) q.frames = 0;
        if (--q.frames <= 0) this.queue.shift();
        this.held = held;
        return;
      }

      // 5) think
      if (f.actionable() || f.state === 'air') this.think(g, held, dist, seen, o);
      this.held = held;
    }

    setBF(b) {
      const f = this.f;
      // Nanami: when to strike during the Ratio stance (frame 23 is dead on 7:3)
      if (f.id === 'nanami' && b === 't1') {
        const r = Math.random();
        this.aiRatio = r < this.p.ratio ? 23 : r < this.p.ratio + 0.3 ? 23 + JK.pick([-6, -5, 5, 6]) : 0;
      }
      if (f.id === 'yuji' && b === 't2') this.aiBF = Math.random() < this.p.bf ? 11 + Math.floor(Math.random() * 6) : 0;
    }
    get aiBFFrame() { return this.aiBF; }
    get trialSkill() { return this.p.trial || null; }

    detectThreat(g, s, dist) {
      const f = this.f;
      // projectile threats
      for (const p of g.projectiles) {
        if (p.owner === f || p.dead) continue;
        const dx = f.x - p.x;
        const approaching = Math.sign(dx) === Math.sign(p.vx || (f.x - p.x)) || p.kind === 'elephant' || p.kind === 'nue' || p.kind === 'blue' || p.kind === 'volcano' || p.kind === 'meteor' || p.kind === 'insect';
        if (approaching && Math.abs(dx) < 340 && Math.abs(p.y - (f.y - 110)) < 220) return { id: p, frames: 16, low: false, air: false };
      }
      if (s.state !== 'move' || !s.m || !s.m.hit) {
        if ((s.state === 'air' || (s.m && s.m.air)) && s.y < -60 && Math.sign(f.x - s.x) === Math.sign(s.vx || s.facing) && dist < 300) return { id: 'air' + Math.round(s.y / 50), frames: 14, low: false, air: true };
        return null;
      }
      const m = s.m;
      const reach = m.hit[1] + 40;
      if (dist > reach + 30) return null;
      if (s.mt > m.startup + m.active) return null;
      const air = !!m.air || s.y < -40;
      return { id: s.moveId + ':' + (g.frame - s.mt), frames: m.startup + m.active - s.mt + 6, low: m.level === 'low', air, hitAt: g.frame + (m.startup - s.mt) - this.p.react };
    }

    doMove(id, held) {
      const map = {
        light: ['light'], heavy: ['heavy'], kick: ['kick'], uppercut: ['heavy', 'down'], sweep: ['kick', 'down'], clight: ['light', 'down'],
        fheavy: ['heavy', 'fwd'], t1: ['t1'], t2: ['t2'], t3: ['t3'], t1d: ['t1', 'down'], t2b: ['t2', 'back'], throw: ['throw'], domain: ['domain'],
      };
      const e = map[id];
      if (!e) return;
      if (e[1]) held[this.dirKey(e[1])] = true;
      this.press(e[0]);
      this.setBF(e[0]);
    }

    startRoute(held, dist) {
      const f = this.f;
      const routes = ROUTES[f.id] || ROUTES.yuji;
      let r = JK.pick(routes);
      if (this.level === 'easy') r = r.slice(0, 1 + Math.floor(Math.random() * 2));
      // Yuji spends meter on barrage at the end of a combo
      if (f.meter >= 100 && this.level !== 'easy' && Math.random() < 0.5 && this.ready('t3')) r = r.slice(0, 2).concat([{ b: 't3' }]);
      // stop the route before any technique that is still on cooldown
      const cut = r.findIndex((s) => !this.ready(s.b));
      if (cut === 0) r = [{ b: 'light' }, { b: 'light' }, { b: 'heavy' }];
      else if (cut > 0) r = r.slice(0, cut);
      const first = r[0];
      if (first.d) held[this.dirKey(first.d)] = true;
      this.press(first.b);
      this.route = r;
      this.routeIdx = 1;
      this.routeWait = 0;
      if (this.routeIdx >= r.length) this.route = null;
    }

    plan(steps) { this.queue = steps.map((s) => Object.assign({ frames: 1 }, s)); }

    think(g, held, dist, seen, o) {
      const f = this.f, p = this.p;
      if (this.cool > 0) return;
      this.cool = p.think + Math.floor(Math.random() * p.think);
      if (Math.random() < p.mistake) { this.plan([{ frames: 10 + Math.random() * 30 }]); return; }

      if (f.state === 'air') {
        if (dist > 230 && dist < 480 && Math.abs(f.vy) < 4 && !f.airDashUsed && this.level !== 'easy' && Math.random() < 0.5) { held[this.dirKey('fwd')] = true; this.press('dash'); return; }
        if (dist < 170 && f.vy > -4) this.press(JK.pick(['heavy', 'kick', 'kick']));
        return;
      }
      // Reverse cursed technique when hurt and out of reach
      if (f.moves.t3d && f.meter >= 100 && f.hp < f.maxHp * 0.38 && dist > 260 && this.ready('t3') && Math.random() < (this.level === 'easy' ? 0.05 : 0.35)) {
        held.down = true; this.press('t3'); return;
      }
      // Domain expansion
      if (f.meter >= 300 && !g.domain && f.confiscT <= 0) {
        const smart = this.level === 'pro' || this.level === 'expert' ? (o.state === 'knockdown' || o.state === 'hitstun' || dist > 260 || Math.random() < 0.15) : true;
        if (smart && Math.random() < p.domain * (this.level === 'pro' || this.level === 'expert' ? 6 : 3)) { this.press('domain'); return; }
      }
      // Hakari in his own domain: keep feeding the machine
      const hk = g.domain && g.domain.owner === f && g.domain.hk && !g.domain.hk.spin;
      if (hk && f.burnout <= 0 && (this.ready('t1') || this.ready('t2'))) {
        const b = this.ready('t2') && (dist > 200 || !this.ready('t1')) ? 't2' : 't1';
        this.press(b); return;
      }
      // Inside our own domain: be aggressive
      const myDomain = g.domain && g.domain.owner === f && g.domain.phase === 'active';
      const oppStunned = o.state === 'voided';
      if (myDomain || oppStunned) {
        if (dist > 130) this.plan([{ hold: ['fwd'], frames: 8, until: (ff, oo) => Math.abs(oo.x - ff.x) < 120 }]);
        else this.startRoute(held, dist);
        return;
      }
      // Jackpot: nothing to fear, go all in
      if (f.jpT > 0) {
        if (dist > 170) {
          if (this.ready('t2') && Math.random() < 0.4) { this.press('t2'); return; }
          this.plan([{ hold: ['fwd'], frames: 10, until: (ff, oo) => Math.abs(oo.x - ff.x) < 150 }]); return;
        }
        if (this.ready('t3') && Math.random() < 0.25) { this.press('t3'); return; }
        if (this.ready('t1') && Math.random() < 0.3) { this.press('t1'); return; }
        this.startRoute(held, dist); return;
      }
      const zoners = (ZONER[f.id] || []).filter((b) => this.ready(b.replace('b', '')));
      const r = Math.random();
      if (dist > 380) {
        if (f.burnout <= 0 && r < p.special * 1.6 && zoners.length) {
          const t = JK.pick(zoners);
          if (t === 't2b') { this.doMove('t2b', held); return; }
          this.press(t); this.setBF(t); return;
        }
        if (r < p.aggr) {
          if (Math.random() < 0.5) this.plan([{ hold: ['fwd'], press: ['dash'], frames: 10 }, { hold: ['fwd'], frames: 6 }]);
          else this.plan([{ hold: ['fwd'], frames: 20 + Math.random() * 25 }]);
        } else this.plan([{ frames: 10 + Math.random() * 20 }]);
        return;
      }
      if (dist > 190) {
        if (f.burnout <= 0 && r < p.special) {
          const opts = (f.id === 'yuji' ? ['t1', 't2'] : f.id === 'sukuna' || f.id === 'nanami' ? ['t2', 't1'] : zoners).filter((b) => this.ready(b));
          if (opts.length) {
            const t = JK.pick(opts);
            this.press(t); this.setBF(t);
            return;
          }
        }
        if (r < p.jump) { this.plan([{ hold: ['fwd', 'up'], frames: 6 }]); return; }
        if (r < p.aggr + p.jump) { this.plan([{ hold: ['fwd'], frames: 10 + Math.random() * 15, until: (ff, oo) => Math.abs(oo.x - ff.x) < 150 }]); return; }
        if (r < p.aggr + 0.25) { this.plan([{ hold: ['back'], frames: 10 + Math.random() * 10 }]); return; }
        this.plan([{ hold: ['block'], frames: 12 }]);
        return;
      }
      // close range
      // throws only reach ~110px: step in first instead of whiffing from range
      const throwPlan = () => {
        if (dist < 105) { this.press('throw'); return; }
        this.plan([{ hold: ['fwd'], frames: 14, until: (ff, oo) => Math.abs(oo.x - ff.x) < 95 }, { press: ['throw'], frames: 1 }]);
      };
      if (this.oppBlockFrames > 30 && Math.random() < p.throwRate * 3) { throwPlan(); this.oppBlockFrames = 0; return; }
      if (r < p.throwRate) { throwPlan(); return; }
      if (r < p.aggr) {
        const mix = Math.random();
        if (this.level !== 'easy' && mix < 0.15) { this.doMove('sweep', held); return; }
        if (this.level !== 'easy' && mix < 0.25) { this.doMove('fheavy', held); return; }
        this.startRoute(held, dist);
        return;
      }
      if (r < p.aggr + 0.15) { this.plan([{ hold: ['back'], press: ['dash'], frames: 12 }]); return; }
      this.plan([{ hold: ['block'], frames: 10 + Math.random() * 16 }]);
    }

    finishLogic(g, held, o) {
      const f = this.f;
      const dist = Math.abs(o.x - f.x);
      if (!f.actionable()) return;
      if (this.finDecided === undefined) this.finDecided = Math.random() < this.p.finisher;
      if (dist > 150) { held[this.dirKey('fwd')] = true; return; }
      if (g.finishPhase.t > 40) this.press(this.finDecided ? 'domain' : 'heavy');
    }

    // mash rate during a domain clash (presses per second)
    get clashRate() { return this.p.clash || 6; }
  }

  JK.AIController = AIController;
  JK.AI_LEVELS = LEVELS;
})();
