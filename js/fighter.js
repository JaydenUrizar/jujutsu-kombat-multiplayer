'use strict';
// Fighter: state machine, physics, input handling, hit resolution, rendering.
(function () {
  const GRAV = 1.12;
  const JUMP_V = -21.8;
  const BUFFER = 10;
  const AMP_COST = 50; // Amplify: press E during a special's startup
  const BREAKER_COST = 200; // Breaker: block + forward while being comboed
  const MAX_HP = 1400;
  JK.MAX_HP = MAX_HP;
  const P = JK.Rig.P;

  const ACTIONABLE = { idle: 1, walk: 1, crouch: 1, block: 1 };

  class Fighter {
    constructor(game, chId, side, ctrl, costume = 0) {
      this.game = game;
      this.ch = JK.getCharacter(chId, costume);
      this.id = chId;
      this.moves = JK.buildMoves(this.ch);
      this.poses = this.ch.poses;
      this.side = side;
      this.ctrl = ctrl;
      this.maxHp = MAX_HP;
      this.meter = 0;
      this.wins = 0;
      this.resetRound(side === 0 ? JK.STAGE_W / 2 - 260 : JK.STAGE_W / 2 + 260);
      this.krushUsed = {}; // Krushing Blows: each one once per match
    }

    resetRound(x) {
      this.x = x;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.facing = this.side === 0 ? 1 : -1;
      this.hp = this.maxHp;
      this.state = 'idle';
      this.st = 0;
      this.move = null;
      this.mt = 0;
      this.freeze = 0;
      this.hs = 0;
      this.comboTaken = 0;
      this.comboDmg = 0;
      this.jugCount = 0;
      this.invuln = 0;
      this.burnout = 0;
      this.voidT = 0;
      this.slowT = 0;
      this.burnT = 0;
      this.tsAcc = 0;
      this.buf = {};
      this.tap = { fwd: -99, back: -99 };
      this.pose = Object.assign({}, this.poses.stance);
      this.J = JK.Rig.solve(this.pose);
      this.ghosts = [];
      this.trail = [];
      this.flashT = 0;
      this.flashColor = '#ffffff';
      this.cloth = 0;
      this.clothV = 0;
      this.hairSway = 0;
      this.airAction = false;
      this.flip = 0;
      this.hitLevel = 'high';
      this.face = 'normal';
      this.eyesOpen = false;
      this.aura = 0;
      this.dmgMult = 1;
      this.bfWindow = 0;
      this.bfForce = false;
      this.dead = false;
      this.lastHitBy = null;
      this.dizzy = false;
      this.hidden = false;
      this.fxTimer = 0;
      this.throwVictim = null;
      this.thrower = null;
      this.zoneT = 0;
      this.airDashT = 0;
      this.airDashUsed = false;
      // presentation-only motion state (springs, turn-around, step cycle)
      this.vface = this.facing;
      this.walkPh = 0;
      this.stepC = 0;
      this.sp = { sq: 0, sqV: 0, lean: 0, leanV: 0, head: 0, headV: 0, x: 0, xV: 0 };
      this.splatUsed = false;
      this.runJump = false;
      // technique cooldowns (per button) and character buffs
      this.cd = { t1: 0, t2: 0, t3: 0 };
      this.cdDeny = {};
      this.otT = 0; // Nanami: Overtime
      this.execT = 0; // Higuruma: Executioner's Sword (death penalty)
      this.execCd = 0;
      this.confiscT = 0; // cursed technique confiscated by Deadly Sentencing
      this.swordT = 0;
      this.gavelOut = false;
      this.loose = false;
      this.amp = false; // current special is Amplified
      this.jgT = 0; // Flawless Block Attack window after a Just Guard
      this.jpT = 0; // Hakari: Jackpot
      this.stunT = 0; // Cursed Speech: "Don't move."
      this.rikaT = 0; // Yuta: Rika manifested
      this.prevX = this.x; this.prevY = this.y; this.prevPose = null;
    }

    // Kick a presentation spring (squash, lean, head, x): an instant offset plus velocity.
    kick(key, pos, vel = 0) {
      const s = this.sp;
      s[key] += pos;
      s[key + 'V'] += vel;
    }

    get opp() { return this.side === 0 ? this.game.p2 : this.game.p1; }
    get grounded() { return this.y >= 0 && this.vy >= 0; }
    get airborne() { return this.y < 0 || this.state === 'air' || this.state === 'juggle' || this.state === 'wallsplat'; }
    actionable() { return !!ACTIONABLE[this.state] || (this.state === 'skid' && this.st >= 3); }
    held(b) { return !!this.ctrl.held[b]; }
    fwdHeld() { return this.facing > 0 ? this.held('right') : this.held('left'); }
    backHeld() { return this.facing > 0 ? this.held('left') : this.held('right'); }
    pressed(b) { return this.buf[b] !== undefined && this.game.frame - this.buf[b] <= BUFFER; }
    cdReady(grp) { return (this.cd[grp] || 0) <= 0; }
    // pressed a technique that is still cooling down: flash its HUD slot
    denyCd(grp) {
      if (!this.cdDeny[grp]) JK.Audio.sfx('deny', this.ctrl instanceof JK.HumanController ? 1 : 0);
      this.cdDeny[grp] = 16;
    }
    consume(b) { delete this.buf[b]; }

    setState(s) {
      this.state = s;
      this.st = 0;
    }

    // ---------------------------------------------------------------- input
    readInput() {
      const c = this.ctrl;
      const f = this.game.frame;
      for (const b in c.pressed) {
        if (!c.pressed[b]) continue;
        this.buf[b] = f;
        if (b === 'block') {
          // mashing block locks Just Guard out for a moment
          if (f - (this.blockPressF ?? -99) < 20) this.jgLock = f + 30;
          this.blockPressF = f;
        }
        if (b === 'left' || b === 'right') {
          const dir = (b === 'right') === (this.facing > 0) ? 'fwd' : 'back';
          if (f - this.tap[dir] < 13 && this.actionable() && this.grounded) this.dashReq = dir;
          this.tap[dir] = f;
        }
      }
    }

    pickMove(context) {
      const id = this.pickMoveRaw(context);
      if (!id) return id;
      const M = this.moves;
      // Hakari's Jackpot replaces his moveset with heavy energy attacks
      if (this.jpT > 0 && M['jp_' + id]) return 'jp_' + id;
      // inside your own domain some techniques change (Yuta's Copy)
      const d = this.game.domain;
      if (d && d.owner === this && d.phase === 'active' && M['dom_' + id]) return 'dom_' + id;
      return id;
    }
    pickMoveRaw(context) {
      const M = this.moves;
      const g = this.game;
      // Flawless Block Attack: K right after a Just Guard
      if (this.jgT > 0 && context !== 'air' && this.pressed('heavy') && M.fba) {
        this.consume('heavy'); this.jgT = 0;
        return 'fba';
      }
      if (this.pressed('domain') && this.meter >= 300 && !g.domain && context !== 'air' && M.domain && g.canDomain(this) && this.confiscT <= 0) {
        this.consume('domain');
        return 'domain';
      }
      if (context !== 'air') {
        const lk = this.pressed('light') && this.pressed('kick') && Math.abs(this.buf.light - this.buf.kick) <= 3;
        if (this.pressed('throw') || lk) {
          this.consume('throw'); this.consume('light'); this.consume('kick');
          this.throwBack = this.backHeld();
          return 'throw';
        }
      }
      const tech = this.burnout <= 0 && this.confiscT <= 0;
      // holding the Executioner's Sword turns O into Execution
      if (tech && this.execT > 0 && M.exec && context !== 'air' && this.pressed('t3')) {
        this.consume('t3');
        if (this.execCd > 0) this.denyCd('t3');
        else return 'exec';
      }
      const down = this.held('down');
      const back = this.backHeld();
      if (tech) {
        if (this.pressed('t3')) {
          const id = context === 'air' ? 'jt3' : down && M.t3d ? 't3d' : 't3';
          if (M[id] && !this.cdReady('t3')) { this.consume('t3'); this.denyCd('t3'); }
          else if (M[id] && this.meter >= (this.jpT > 0 && M['jp_' + id] ? M['jp_' + id].cost ?? 0 : M[id].cost ?? 100)) { this.consume('t3'); return id; }
        }
        for (const t of ['t2', 't1']) {
          if (!this.pressed(t)) continue;
          if (!this.cdReady(t)) { this.consume(t); this.denyCd(t); continue; }
          let id = context === 'air' ? 'j' + t : down ? t + 'd' : back && M[t + 'b'] ? t + 'b' : t;
          if (!M[id] && context !== 'air') id = t;
          if (M[id]) { this.consume(t); return id; }
        }
      }
      if (context === 'air') {
        if (this.airAction) return null;
        if (this.pressed('heavy')) { this.consume('heavy'); return 'jheavy'; }
        if (this.pressed('kick')) { this.consume('kick'); return 'jkick'; }
        if (this.pressed('light')) { this.consume('light'); return 'jlight'; }
        return null;
      }
      if (down) {
        if (this.pressed('heavy')) { this.consume('heavy'); return 'uppercut'; }
        if (this.pressed('kick')) { this.consume('kick'); return 'sweep'; }
        if (this.pressed('light')) { this.consume('light'); return 'clight'; }
        return null;
      }
      if (this.pressed('heavy')) { this.consume('heavy'); return this.fwdHeld() ? 'fheavy' : 'heavy'; }
      if (this.pressed('kick')) { this.consume('kick'); return back && M.bkick ? 'bkick' : 'kick'; }
      if (this.pressed('light')) { this.consume('light'); return 'light'; }
      return null;
    }

    // ---------------------------------------------------------------- update
    update() {
      const g = this.game;
      if (this.flashT > 0) this.flashT--;
      if (this.tryBreaker()) return;
      if (this.freeze > 0) {
        this.freeze--;
        // buffered presses don't age during hitstop, so combos stay easy to input
        for (const b in this.buf) this.buf[b]++;
        this.tap.fwd++; this.tap.back++;
        return;
      }
      // Time scaling (slowed inside Yuji's domain)
      if (this.slowT > 0) {
        this.slowT--;
        this.tsAcc += 0.55;
        if (this.tsAcc < 1) { this.updateAnim(); return; }
        this.tsAcc -= 1;
      }
      this.st++;
      if (this.invuln > 0) this.invuln--;
      // cooldowns recover faster during Overtime
      const cdRate = this.otT > 0 ? 1.5 : 1;
      for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - cdRate);
      for (const k in this.cdDeny) if (this.cdDeny[k] > 0) this.cdDeny[k]--;
      if (this.otT > 0) {
        if (--this.otT === 0) this.loose = false;
        if (this.st % 5 === 0) JK.FX.add({ type: 'dot', layer: 'back', x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * 210, vx: 0, vy: -2, r: 10, color: '#ffae42', alpha: 0.6, life: 26 });
      }
      if (this.jgT > 0) this.jgT--;
      if (this.rikaT > 0) this.rikaT--;
      if (this.jpT > 0) this.jackpotTick();
      if (this.execT > 0) this.execT--;
      if (this.execCd > 0) this.execCd--;
      if (this.confiscT > 0) this.confiscT--;
      if (this.swordT > 0) this.swordT--;
      this.dmgMult = (this.otT > 0 ? 1.3 : 1) * (this.jpT > 0 ? 1.15 : 1);
      if (this.burnout > 0) this.burnout--;
      if (this.voidT > 0) this.voidT--;
      if (this.bfWindow > 0) this.bfWindow--;
      if (this.zoneT > 0) {
        this.zoneT--;
        if (this.st % 6 === 0) {
          const hx = this.x + (Math.random() - 0.5) * 60, hy = this.y - 40 - Math.random() * 180;
          JK.FX.add({ type: 'bolt', x1: hx, y1: hy, x2: hx + (Math.random() - 0.5) * 50, y2: hy + (Math.random() - 0.5) * 50, w: 1.6, jag: 10, seg: 4, life: 5 });
        }
      }
      if (this.burnT > 0) {
        this.burnT--;
        if (this.burnT % 20 === 0 && this.hp > 1) { this.hp = Math.max(1, this.hp - 8); this.game.onDamage(this, 8); }
        if (this.st % 3 === 0) JK.FX.add({ type: 'flame', x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * 180, vx: 0, vy: -1, r: 14, life: 22 });
      }
      if (g.fighting) this.meter = Math.min(300, this.meter + (g.domain ? 0 : 0.055));

      this.stateLogic();
      this.physics();
      this.updateAnim();
    }

    // Jackpot: green cursed energy pours off him and his reverse cursed technique never stops.
    jackpotTick() {
      const g = this.game;
      this.jpT--;
      if (this.hp > 0 && this.state !== 'ko') this.hp = Math.min(this.maxHp, this.hp + (this.state === 'hitstun' || this.state === 'juggle' ? 0.5 : 1.1));
      if (g.frame % 2 === 0) {
        JK.FX.add({ type: 'dot', layer: 'back', x: this.x + (Math.random() - 0.5) * 70, y: this.y - Math.random() * 230, vx: (Math.random() - 0.5) * 1.5, vy: -2.5 - Math.random() * 2, r: 12 + Math.random() * 12, color: JK.pick(['#2aff7a', '#9dffc4', '#18c860']), alpha: 0.7, life: 26 });
      }
      if (g.frame % 7 === 0) JK.FX.add({ type: 'bolt', x1: this.x + (Math.random() - 0.5) * 60, y1: this.y - 40 - Math.random() * 170, x2: this.x + (Math.random() - 0.5) * 120, y2: this.y - 40 - Math.random() * 170, w: 1.8, jag: 14, seg: 4, color: '#d8ffe8', glow: '#2aff7a', life: 6 });
      if (this.jpT === 0) g.endJackpot(this);
    }

    // Breaker: block + forward while being comboed spends 2 bars to blast the attacker away.
    tryBreaker() {
      const g = this.game;
      const s = this.state;
      if (s !== 'hitstun' && s !== 'juggle') return false;
      if (this.comboTaken < 2 || this.meter < BREAKER_COST || this.hp <= 0 || this.dizzyPending || !g.fighting || g.cinematic || g.finishPhase) return false;
      if (!this.pressed('block') || !this.fwdHeld()) return false;
      const att = this.lastHitBy;
      if (!att || att === this) return false;
      this.consume('block');
      this.meter -= BREAKER_COST;
      const dir = Math.sign(att.x - this.x) || this.facing;
      att.move = null;
      att.throwVictim = null;
      att.setState('juggle');
      att.vy = -9; att.vx = dir * 11; att.y = Math.min(att.y, -2);
      att.freeze = 10;
      this.freeze = 10;
      this.invuln = 24;
      this.comboTaken = 0; this.comboDmg = 0; this.jugCount = 0;
      if (this.y < -2) { this.setState('air'); this.airAction = true; this.vy = -6; this.vx = -dir * 3; }
      else { this.setState('idle'); this.vx = -dir * 4; }
      this.faceOpp();
      const cx = (this.x + att.x) / 2, cy = this.y - 120;
      JK.FX.add({ type: 'flash', x: cx, y: cy, r: 220, color: this.ch.aura, life: 14 });
      for (let i = 0; i < 3; i++) JK.FX.add({ type: 'ring', x: this.x, y: this.y - 120, r0: 20, r1: 180 + i * 90, w: 12 - i * 3, color: i === 1 ? '#ffffff' : this.ch.aura, life: 16 + i * 6 });
      JK.FX.shockwave(this.x, 0, this.ch.aura, 1.3);
      JK.FX.text(this.x, this.y - 280, 'BREAKER', { size: 64, font: JK.FONT_TITLE, color: '#ffffff', life: 55 });
      JK.Audio.sfx('impact'); JK.Audio.sfx('explosion', 0.7);
      g.shake(14, 16); g.zoomPunch(0.08); g.flashScreen(this.ch.aura, 0.35, 10);
      if (g.stats) { const k = this === g.p1 ? 'p1' : 'p2'; g.stats[k].breakers = (g.stats[k].breakers || 0) + 1; }
      return true;
    }

    stateLogic() {
      const g = this.game;
      const s = this.state;
      const canAct = g.fighting && !g.cinematic;
      if (this.voidT > 0 && (ACTIONABLE[s] || s === 'air') && this.grounded) {
        this.setState('voided');
      }
      if (this.stunT > 0 && (ACTIONABLE[s] || s === 'dash' || s === 'run' || s === 'skid' || s === 'landing') && this.grounded) {
        this.setState('stunned');
      }

      switch (s) {
        case 'idle':
        case 'walk':
        case 'crouch':
        case 'block': {
          if (this.grounded && (ACTIONABLE[s])) this.faceOpp();
          if (!canAct) {
            this.vx *= 0.7;
            if (s !== 'idle') this.setState('idle');
            break;
          }
          const mv = this.pickMove('ground');
          if (mv) { this.startMove(mv); break; }
          if (this.pressed('dash')) {
            this.consume('dash');
            this.startDash(this.backHeld() ? 'back' : 'fwd');
            break;
          }
          if (this.held('block')) {
            if (s !== 'block') this.setState('block');
            this.crouching = this.held('down');
            this.vx *= 0.6;
            break;
          }
          if (this.dashReq) {
            const d = this.dashReq;
            this.dashReq = null;
            this.startDash(d);
            break;
          }
          if (this.pressed('up') || this.held('up')) {
            this.consume('up');
            this.setState('jumpsquat');
            break;
          }
          if (this.held('down')) {
            if (s !== 'crouch') this.setState('crouch');
            this.vx *= 0.6;
            break;
          }
          const spd = this.ch.walk || 1;
          // walking eases in over a few frames instead of snapping to full speed
          if (this.fwdHeld()) {
            if (s !== 'walk') this.setState('walk');
            this.vx += (5.1 * spd * this.facing - this.vx) * 0.5;
            this.walkDir = 1;
          } else if (this.backHeld()) {
            if (s !== 'walk') this.setState('walk');
            this.vx += (-4.0 * spd * this.facing - this.vx) * 0.5;
            this.walkDir = -1;
          } else {
            if (s !== 'idle') this.setState('idle');
            this.vx *= 0.5;
          }
          break;
        }
        case 'jumpsquat':
          this.vx *= this.runJump ? 0.97 : 0.8;
          if (this.st === 1) this.kick('sq', -0.07);
          if (this.st >= 3) {
            const dir = this.fwdHeld() ? 1 : this.backHeld() ? -1 : 0;
            this.vy = JUMP_V;
            this.vx = dir * (dir > 0 ? (this.runJump ? 9 : 6.2) : 5.4) * this.facing;
            this.flip = dir;
            this.jumpVx = Math.abs(this.vx);
            this.runJump = false;
            this.airAction = false;
            this.airDashUsed = false;
            this.setState('air');
            this.y = -1;
            this.kick('sq', 0.1, 0.02);
            JK.Audio.sfx('jump');
            JK.FX.dust(this.x, 0, 0, 5);
            JK.FX.add({ type: 'ring', x: this.x, y: -3, r0: 6, r1: 60, w: 3, color: '#ffffff', flat: 0.2, life: 10, layer: 'back' });
          }
          break;
        case 'air': {
          // light air control: drift toward the held direction, never faster than the jump itself
          if (canAct && this.airDashT <= 0 && !this.airAction) {
            const dh = this.fwdHeld() ? 1 : this.backHeld() ? -1 : 0;
            if (dh) {
              const cap = Math.max(this.jumpVx || 0, 2.6);
              const nv = this.vx + dh * 0.14 * this.facing;
              if (Math.abs(nv) <= cap || Math.abs(nv) < Math.abs(this.vx)) this.vx = nv;
            }
          }
          if (canAct) {
            if (this.pressed('dash') && !this.airDashUsed && this.airDashT <= 0) {
              // air dash: a flat burst through the air, once per jump
              this.consume('dash');
              const dir = this.backHeld() ? -1 : 1;
              this.airDashUsed = true;
              this.airDashT = 13;
              this.airDashDir = dir;
              this.flip = 0;
              this.vx = dir * 14 * this.facing;
              this.vy = 0;
              this.ghostT = 16;
              JK.Audio.sfx('dash');
              JK.FX.add({ type: 'ring', x: this.x, y: this.y - 110, r0: 10, r1: 90, w: 5, color: this.ch.aura, life: 12 });
              break;
            }
            const mv = this.pickMove('air');
            if (mv) { this.startMove(mv); this.airAction = true; this.airDashT = 0; }
          }
          break;
        }
        case 'dash':
          this.vx *= 0.88;
          // dash cancel: block or jump out of a dash once it's under way
          if (canAct && this.st >= 5 && this.y >= 0) {
            if (this.held('block')) { this.setState('block'); this.vx *= 0.4; break; }
            if (this.pressed('up')) { this.consume('up'); this.runJump = this.dashDir > 0; this.setState('jumpsquat'); break; }
          }
          if (canAct && this.st >= 5 && this.dashDir > 0) {
            // attack straight out of a dash, keeping some of the slide
            const mv = this.pickMove('ground');
            if (mv) { const v = this.vx; this.startMove(mv); this.vx = v * 0.55; break; }
          }
          // keep holding forward through a dash to break into a run
          if (canAct && this.dashDir > 0 && this.st >= this.dashLen - 4 && this.fwdHeld() && this.y >= 0) {
            this.setState('run');
            this.vx = Math.max(Math.abs(this.vx), 8) * this.facing;
            break;
          }
          if (this.st >= this.dashLen && this.y >= 0) this.setState('idle');
          break;
        case 'run': {
          this.faceOpp();
          if (!canAct) { this.startSkid(); break; }
          const mv = this.pickMove('ground');
          if (mv) { const v = this.vx; this.startMove(mv); this.vx = v * 0.6; break; }
          if (this.pressed('up') || this.held('up')) {
            this.consume('up');
            this.runJump = true;
            this.setState('jumpsquat');
            break;
          }
          const o = this.opp;
          const close = Math.abs(o.x - this.x) < 78 && o.y > -120;
          if (!this.fwdHeld() || this.held('block') || this.held('down') || close || this.atWall) { this.startSkid(); break; }
          this.vx += (11 * (this.ch.walk || 1) * this.facing - this.vx) * 0.2;
          if (this.st % 4 === 0) JK.FX.dust(this.x - this.facing * 20, 0, -this.facing, 1);
          if (this.st % 18 === 0) JK.FX.add({ type: 'spark', x: this.x, y: this.y - 60 - Math.random() * 120, vx: -this.facing * 14, vy: 0, len: 46, w: 2, color: '#ffffff', life: 9 });
          break;
        }
        case 'skid':
          this.vx *= 0.84;
          if (this.st <= 6 && this.st % 2 === 0 && Math.abs(this.vx) > 1.5) JK.FX.dust(this.x + this.facing * 18, 0, this.facing, 1);
          if (canAct && this.st >= 3) {
            const mv = this.pickMove('ground');
            if (mv) { this.startMove(mv); break; }
            if (this.held('block')) { this.setState('block'); break; }
          }
          if (this.st >= 9) this.setState('idle');
          break;
        case 'techroll':
          this.vx *= 0.93;
          if (this.st >= 21) { this.recover(); this.invuln = 5; }
          break;
        case 'wallsplat':
          // pinned against the veil, then peel off and fall back into the open
          this.vx = 0;
          if (this.st >= 22) {
            this.setState('juggle');
            this.vy = -3;
            this.vx = -this.splatDir * 3.2;
          }
          break;
        case 'move':
          this.updateMove();
          break;
        case 'hitstun':
          this.vx *= 0.86;
          if (--this.hs <= 0) this.recover();
          break;
        case 'blockstun':
          this.vx *= 0.82;
          if (canAct && this.jgT > 0 && this.pressed('heavy') && this.moves.fba) { this.consume('heavy'); this.jgT = 0; this.startMove('fba'); break; }
          if (--this.hs <= 0) this.setState(this.held('block') ? 'block' : 'idle');
          break;
        case 'stunned':
          // frozen in place by Cursed Speech
          this.vx *= 0.7;
          if (--this.stunT <= 0 || !canAct) { this.stunT = 0; this.setState('idle'); }
          break;
        case 'juggle':
          // landing handled in physics()
          break;
        case 'knockdown':
          this.vx *= 0.8;
          // tech: Shift or block on the ground = quick rise; hold ← / → to roll away or through
          if (canAct && this.st >= 6 && this.st <= 30 && !this.dizzyPending && this.hp > 0 && (this.pressed('dash') || this.pressed('block'))) {
            this.consume('dash'); this.consume('block');
            const dir = this.fwdHeld() ? 1 : this.backHeld() ? -1 : 0;
            this.techRoll(dir);
            break;
          }
          if (this.st >= 38) {
            if (this.dizzyPending) { this.dizzyPending = false; this.setState('dizzy'); this.invuln = 0; break; }
            this.setState('getup');
            this.invuln = 24;
          }
          break;
        case 'getup':
          if (this.st >= 22) { this.recover(); this.invuln = 6; }
          break;
        case 'voided':
          this.vx *= 0.8;
          if (this.voidT <= 0) this.recover();
          break;
        case 'thrown':
          break;
        case 'dizzy':
          this.vx *= 0.8;
          break;
        case 'ko':
          this.vx *= 0.85;
          break;
        default:
          break;
      }
    }

    techRoll(dir) {
      JK.Audio.sfx('roll');
      JK.FX.dust(this.x, 0, 0, 6);
      if (!dir) {
        // quick rise in place
        this.setState('getup');
        this.st = 9;
        this.invuln = 22;
        this.kick('sq', -0.08);
        return;
      }
      this.setState('techroll');
      this.rollDir = dir;
      this.vx = dir * 8.5 * this.facing;
      this.invuln = 26;
      this.ghostT = 12;
    }

    startSkid() {
      this.setState('skid');
      JK.Audio.sfx('skid');
      this.kick('lean', -6, -1.5);
    }

    recover() {
      this.comboTaken = 0;
      this.comboDmg = 0;
      this.jugCount = 0;
      this.splatUsed = false;
      if (this.voidT > 0) { this.setState('voided'); return; }
      this.setState(this.held('down') ? 'crouch' : 'idle');
    }

    faceOpp() {
      const o = this.opp;
      if (!o) return;
      const d = o.x - this.x;
      if (Math.abs(d) > 4) this.facing = d > 0 ? 1 : -1;
    }

    startDash(dir) {
      this.setState('dash');
      this.dashDir = dir === 'fwd' ? 1 : -1;
      this.dashLen = dir === 'fwd' ? 14 : 16;
      this.vx = (dir === 'fwd' ? 18 : -14) * this.facing * (this.ch.dash || 1);
      if (dir === 'back') { this.invuln = 8; this.vy = -5; this.y = -1; }
      JK.Audio.sfx('dash');
      JK.FX.dust(this.x, 0, -this.facing * this.dashDir, 6);
      // burst ring at the feet + speed streaks trailing behind
      JK.FX.add({ type: 'ring', x: this.x, y: -4, r0: 8, r1: 80, w: 5, color: this.ch.aura, flat: 0.22, life: 14, layer: 'back' });
      for (let i = 0; i < 6; i++) {
        const y = this.y - 30 - Math.random() * 170;
        JK.FX.add({ type: 'spark', x: this.x, y, vx: -this.facing * this.dashDir * (10 + Math.random() * 8), vy: 0, len: 40, w: 2, color: '#ffffff', life: 10 });
      }
      this.ghostT = 14;
      this.kick('sq', -0.05, 0.03);
      this.kick('lean', dir === 'fwd' ? 6 : -6);
    }

    // ---------------------------------------------------------------- moves
    startMove(id) {
      const m = this.moves[id];
      if (!m) return;
      const prev = this.state === 'move' ? this.move : null;
      this.amp = !!(this.amp && prev && JK.cdGroup(prev.id) && JK.cdGroup(prev.id) === JK.cdGroup(id));
      this.setState('move');
      this.move = m;
      this.mt = 0;
      this.hitsDone = {};
      this.connected = false;
      this.hitConfirmed = false;
      this.whiffed = false;
      this.trail.length = 0;
      if (m.cost) this.meter = Math.max(0, this.meter - m.cost);
      if (m.cd && !this.game.noCd) {
        const grp = JK.cdGroup(id);
        this.cd[grp] = Math.max(this.cd[grp] || 0, m.cd);
        (this.cdMax || (this.cdMax = {}))[grp] = this.cd[grp];
      }
      if (!m.air) {
        this.vx *= m.keepMomentum ? 1 : 0.2;
      }
      if (m.air && this.grounded && !m.groundOk) { this.y = -1; }
      if (m.invuln) this.invuln = Math.max(this.invuln, m.invuln);
      if (m.onStart) m.onStart(this, this.game);
      if (m.say) JK.Audio.say(m.say, { lang: 'en-US', rate: 1.1, pitch: this.ch.voicePitch ?? 0.7 });
    }

    updateMove() {
      const m = this.move;
      const g = this.game;
      this.mt++;
      const t = this.mt;
      // scripted velocity [from, to, vx, vy?]
      let setVel = false;
      if (m.vel) {
        for (const v of m.vel) {
          if (t >= v[0] && t < v[1]) {
            this.vx = v[2] * this.facing;
            if (v[3] !== undefined) this.vy = v[3];
            setVel = true;
          }
        }
      }
      if (!setVel && !m.air && this.grounded) this.vx *= 0.75;
      if (m.whoosh !== undefined && t === m.whoosh) JK.Audio.sfx(m.whooshHeavy ? 'whooshHeavy' : 'whoosh');
      // Amplify: press E during a special's startup to power it up (half a bar)
      if (!this.amp && m.special && !m.cost && !m.noAmp && m.id !== 'domain' && t <= Math.min(m.startup, 14) && this.meter >= AMP_COST && this.pressed('amp') && g.fighting && !g.cinematic) {
        this.consume('amp');
        this.amp = true;
        this.meter -= AMP_COST;
        this.flashT = 4; this.flashColor = '#ffffff';
        this.ghostT = Math.max(this.ghostT || 0, 18);
        JK.FX.add({ type: 'ring', x: this.x, y: this.y - 120, r0: 150, r1: 10, w: 6, color: '#ffffff', life: 12 });
        JK.FX.add({ type: 'flash', x: this.x, y: this.y - 120, r: 150, color: this.ch.aura, life: 10 });
        JK.FX.text(this.x, this.y - 270, 'AMPLIFIED', { size: 34, font: JK.FONT_TITLE, color: '#ffffff', life: 36 });
        JK.Audio.sfx('justGuard');
      }
      if (m.onFrame) m.onFrame(this, t, g);
      if (this.state !== 'move' || this.move !== m) return; // hook changed state
      // trail capture
      if (m.trail && t >= m.startup - 3 && t < m.startup + m.active + 2) {
        const J = this.J;
        const pt = J[m.trail === 'hF' ? 'haF' : m.trail === 'hB' ? 'haB' : m.trail === 'fF' ? 'anF' : 'anB'];
        if (pt) this.trail.push({ x: this.x + pt.x * this.facing, y: this.y + pt.y, t: 0 });
      }
      // cancels
      if (this.tryCancel()) return;
      const total = m.startup + m.active + m.recovery;
      if (m.air && this.y >= 0 && t > 2) {
        // landed during air move
        this.move = null;
        this.land();
        return;
      }
      if (t >= total) {
        this.move = null;
        if (this.y < 0) { this.setState('air'); this.airAction = true; }
        else this.setState(this.held('down') ? 'crouch' : 'idle');
      }
    }

    tryCancel() {
      const m = this.move;
      const g = this.game;
      if (!g.fighting || g.cinematic) return false;
      const t = this.mt;
      if (m.normal && !this.connected && m.chain && t >= m.startup && t < m.startup + m.active + 8) {
        // dial-in strings keep going even when the first hit whiffs
        for (const b in m.chain) {
          if (this.pressed(b) && this.moves[m.chain[b]]) {
            this.consume(b);
            this.startMove(m.chain[b]);
            return true;
          }
        }
      }
      if (m.normal && this.connected && t >= m.startup && t < m.startup + m.active + 12) {
        // special cancel
        const ctx = m.air ? 'air' : 'ground';
        const savedDown = this.held('down');
        let next = null;
        for (const b of ['domain', 't3', 't2', 't1']) {
          if (this.pressed(b)) { next = this.pickMove(ctx); break; }
        }
        if (!next && m.chain) {
          for (const b in m.chain) {
            if (this.pressed(b)) {
              this.consume(b);
              next = m.chain[b];
              break;
            }
          }
        }
        if (!next && !m.air && this.hitConfirmed && this.pressed('dash')) {
          // dash-cancel a connecting normal to chase for more hits
          this.consume('dash');
          this.move = null;
          this.startDash('fwd');
          return true;
        }
        if (!next && m.jumpCancel && this.hitConfirmed && (this.pressed('up') || this.held('up'))) {
          this.consume('up');
          this.move = null;
          this.setState('jumpsquat');
          return true;
        }
        if (next && this.moves[next]) {
          this.startMove(next);
          return true;
        }
        void savedDown;
      }
      if (m.superCancel && this.connected && t >= m.startup && t < m.startup + m.active + 14) {
        if (this.pressed('t3') || this.pressed('domain')) {
          const next = this.pickMove('ground');
          if (next === 't3' || next === 'domain') { this.startMove(next); return true; }
        }
      }
      return false;
    }

    land() {
      const impact = JK.clamp(this.vy / 20, 0, 1);
      this.y = 0;
      this.vy = 0;
      this.airDashT = 0;
      this.airDashUsed = false;
      this.jumpVx = 0;
      this.vx *= 0.3;
      this.flip = 0;
      this.setState('landing');
      JK.Audio.sfx('land');
      JK.FX.dust(this.x, 0, 0, 3 + Math.round(impact * 4));
      this.kick('sq', -0.06 - impact * 0.08);
      this.landT = 3;
    }

    // ---------------------------------------------------------------- physics
    physics() {
      const g = this.game;
      const s = this.state;
      if (s === 'thrown' || s === 'domaincast') return;
      if (s === 'landing') {
        this.vx *= 0.7;
        if (--this.landT <= 0) this.setState(this.held('down') ? 'crouch' : 'idle');
      }
      this.x += this.vx;
      const floating = this.move && this.move.float && this.mt < this.move.float;
      if (s === 'wallsplat') {
        // stuck to the wall, sliding down slowly
        this.vy = 0;
        this.y = Math.min(-8, this.y + 0.9);
      } else if (this.y < 0 || this.vy < 0) {
        if (this.airDashT > 0 && s === 'air') { this.airDashT--; this.vy = 0; this.vx *= 0.97; }
        else if (!floating) this.vy += s === 'juggle' ? 0.9 : GRAV;
        else this.vy *= 0.8;
        this.y += this.vy;
        if (this.y >= 0) {
          this.y = 0;
          if (s === 'air') this.land();
          else if (s === 'dash') { this.vy = 0; }
          else if (s === 'juggle') this.juggleLand();
          else if (s === 'move' && this.move && this.move.air) { this.move = null; this.land(); }
          else { this.vy = 0; }
        }
      }
      // stage + camera bounds
      const b = g.bounds(this);
      if (this.x < b.min) { this.x = b.min; this.atWall = -1; }
      else if (this.x > b.max) { this.x = b.max; this.atWall = 1; }
      else this.atWall = 0;
      // Wall splat: a juggled fighter blasted into the stage edge slams into the veil
      const stageWall = this.x <= 71 || this.x >= JK.STAGE_W - 71;
      if (s === 'juggle' && stageWall && this.atWall && !this.splatUsed && !this.dizzyPending && this.hp > 0 &&
        Math.sign(this.vx) === this.atWall && Math.abs(this.vx) > 6 && g.fighting && !g.cinematic) this.wallSplat();
    }

    wallSplat() {
      const g = this.game;
      const dir = this.atWall;
      this.splatUsed = true;
      this.splatDir = dir;
      this.setState('wallsplat');
      this.facing = -dir;
      this.vface = -dir;
      this.vx = 0; this.vy = 0;
      this.y = Math.min(this.y, -60);
      this.jugCount++;
      this.freeze = 7;
      if (this.lastHitBy) this.lastHitBy.freeze = Math.max(this.lastHitBy.freeze, 5);
      this.kick('sq', -0.12);
      this.kick('lean', -10, -2);
      this.kick('head', -18, -3);
      const wx = this.x + dir * 34, cy = this.y - 110;
      JK.FX.add({ type: 'veil', x: wx, y: cy, dir, color: '#8fb0ff', life: 30, layer: 'back' });
      for (let i = 0; i < 12; i++) {
        const sz = 5 + Math.random() * 9;
        const pts = [[0, 0], [sz, sz * (Math.random() - 0.5)], [sz * (Math.random() - 0.3), sz]];
        JK.FX.add({ type: 'shard', x: wx, y: cy + (Math.random() - 0.5) * 140, vx: -dir * (2 + Math.random() * 7), vy: -3 - Math.random() * 5, g: 0.45, pts, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, color: JK.pick(['#c8d6ff', '#6f86c8', '#ffffff']), life: 40 });
      }
      JK.FX.add({ type: 'flash', x: wx, y: cy, r: 160, color: '#b8c8ff', life: 10 });
      JK.FX.text(this.x - dir * 40, this.y - 270, 'WALL SPLAT', { size: 36, font: JK.FONT_TITLE, color: '#dfe6ff', life: 50 });
      JK.Audio.sfx('impact');
      JK.Audio.sfx('bodyfall');
      if (g.stats && this.lastHitBy) { const k = this.lastHitBy === g.p1 ? 'p1' : 'p2'; g.stats[k].splats = (g.stats[k].splats || 0) + 1; }
      g.shake(11, 14);
      g.zoomPunch(0.07);
    }

    juggleLand() {
      const g = this.game;
      if (this.vy > 9 && !this.bounced) {
        this.bounced = true;
        this.vy = -6;
        this.y = -1;
        JK.Audio.sfx('bodyfall');
        JK.FX.dust(this.x, 0, 0, 8);
        g.shake(4, 6);
        return;
      }
      this.bounced = false;
      this.vy = 0;
      this.vx *= 0.4;
      JK.FX.dust(this.x, 0, 0, 6);
      if (this.hp <= 0 && !this.dizzyPending) {
        this.setState('ko');
        this.dead = true;
        JK.Audio.sfx('bodyfall');
        g.onKOLand(this);
        return;
      }
      this.setState('knockdown');
      this.invuln = 60;
      JK.Audio.sfx('bodyfall');
      this.comboTaken = 0;
      this.comboDmg = 0;
      this.jugCount = 0;
    }

    // ---------------------------------------------------------------- hit detection
    hurtboxes() {
      if (this.invuln > 0 || this.hidden) return [];
      const s = this.state;
      if (s === 'knockdown' || s === 'getup' || s === 'ko' || s === 'domaincast') return [];
      let box;
      const m = s === 'move' ? this.move : null;
      if (m && m.hurt) box = m.hurt;
      else if (s === 'crouch' || (s === 'block' && this.crouching) || (s === 'blockstun' && this.crouching) || (m && m.crouch)) box = [-28, 28, -138, 0];
      else if (s === 'juggle' || s === 'wallsplat') box = [-42, 42, -150, -10];
      else if (this.y < -2 || s === 'air') box = [-24, 24, -205, -20];
      else box = [-24, 24, -232, 0];
      const out = [this.worldBox(box)];
      if (m && m.hit && this.mt >= m.startup && this.mt < m.startup + m.active + Math.min(10, m.recovery)) {
        const h = m.hit;
        out.push(this.worldBox([h[0], h[1] - 14, h[2] + 8, h[3] - 8]));
      }
      return out;
    }
    worldBox(b) {
      const [x0, x1, y0, y1] = b;
      if (this.facing > 0) return { x0: this.x + x0, x1: this.x + x1, y0: this.y + y0, y1: this.y + y1 };
      return { x0: this.x - x1, x1: this.x - x0, y0: this.y + y0, y1: this.y + y1 };
    }

    activeHitbox() {
      const m = this.move;
      if (this.state !== 'move' || !m || !m.hit) return null;
      const t = this.mt;
      if (t < m.startup || t >= m.startup + m.active) return null;
      const idx = m.hits ? Math.min(m.hits - 1, Math.floor((t - m.startup) / (m.hitEvery || 3))) : 0;
      if (this.hitsDone[idx]) return null;
      return { box: this.worldBox(m.hit), idx };
    }

    // Attempt to hit the opponent with the current move. Returns true on contact.
    tryHit(def) {
      const hb = this.activeHitbox();
      if (!hb) return false;
      const m = this.move;
      if (m.throw) {
        if (!def.grounded || def.invuln > 0 || !['idle', 'walk', 'crouch', 'block', 'blockstun', 'landing', 'dash', 'move', 'run', 'skid'].includes(def.state)) return false;
        if (def.state === 'move' && def.move && def.move.air) return false;
      }
      const boxes = def.hurtboxes();
      for (const b of boxes) {
        const box = hb.box;
        if (box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0) {
          this.hitsDone[hb.idx] = true;
          const cx = (Math.max(box.x0, b.x0) + Math.min(box.x1, b.x1)) / 2;
          const cy = (Math.max(box.y0, b.y0) + Math.min(box.y1, b.y1)) / 2;
          def.receive(this, m, cx, cy);
          return true;
        }
      }
      return false;
    }

    isBlocking(level, attacker) {
      if (!this.grounded) return false;
      const s = this.state;
      const blockingState = s === 'block' || s === 'blockstun' || ((s === 'idle' || s === 'walk' || s === 'crouch') && this.held('block'));
      if (!blockingState || this.game.cinematic) return false;
      if (!this.game.fighting) return false;
      const crouch = s === 'crouch' || this.held('down');
      if (level === 'unblockable' || level === 'throw') return false;
      if (level === 'low' && !crouch) return false;
      if (level === 'overhead' && crouch) return false;
      // must face the attacker (auto-facing handles most cases)
      const dir = attacker.x - this.x;
      if (Math.abs(dir) > 10 && Math.sign(dir) !== this.facing) return false;
      return true;
    }

    // Generic hit/block reception. `src` is a move or projectile descriptor.
    receive(att, src, cx, cy, opts = {}) {
      const g = this.game;
      const dir = opts.dir ?? att.facing;
      if (!opts.projectile) att.connected = true;
      const level = src.throw ? 'throw' : src.level || 'mid';
      // Throws
      if (src.throw) {
        att.hitConfirmed = true;
        if (src.onThrow) src.onThrow(att, this, g);
        return 'hit';
      }
      if (this.isBlocking(level, att) && !opts.sureHit) {
        this.crouching = this.held('down');
        this.setState('blockstun');
        this.hs = src.blockstun ?? 12;
        this.vx = dir * (src.kb ?? 5) * 0.9;
        if (this.atWall && Math.sign(this.atWall) === dir) att.vx = -dir * (src.kb ?? 5) * 0.8;
        let chip = src.chip ?? (src.special ? src.dmg * 0.14 : 0);
        if (this.ch.infinity) chip = 0;
        // Just Guard: block pressed right before the hit = no chip, faster recovery, bonus energy
        const just = g.frame - (this.blockPressF ?? -99) <= 6 && g.frame > (this.jgLock || 0) && g.fighting;
        if (just) {
          chip = 0;
          this.jgT = 16; // Flawless Block Attack window
          this.hs = Math.max(3, Math.round(this.hs * 0.45));
          this.vx *= 0.5;
          this.meter = Math.min(300, this.meter + 22);
          this.blockPressF = -99;
          JK.FX.add({ type: 'ring', x: cx, y: cy, r0: 6, r1: 90, w: 5, color: '#ffffff', life: 14 });
          JK.FX.add({ type: 'flash', x: cx, y: cy, r: 90, color: '#c8f0ff', life: 10 });
          JK.FX.text(this.x, this.y - 262, 'JUST GUARD', { size: 30, font: JK.FONT_TITLE, color: '#c8f0ff', life: 40 });
          JK.Audio.sfx('justGuard');
          if (g.stats) g.stats[this === g.p1 ? 'p1' : 'p2'].jg = (g.stats[this === g.p1 ? 'p1' : 'p2'].jg || 0) + 1;
        }
        if (chip > 0 && (src.amp || (src === att.move && att.amp))) chip *= 1.5;
        if (chip > 0) { this.hp = Math.max(this.hp - chip, this.jpT > 0 ? 1 : g.chipFloor(this)); g.onDamage(this, chip); }
        att.meter = Math.min(300, att.meter + (src.dmg || 0) * 0.06);
        this.meter = Math.min(300, this.meter + (src.dmg || 0) * 0.05);
        const f = Math.min(8, Math.round((src.hitstop ?? 6) * 0.7));
        if (!opts.noFreeze) { if (!opts.projectile) att.freeze = Math.max(att.freeze, f); this.freeze = f; }
        JK.FX.blockSpark(cx, cy, dir, !!this.ch.infinity);
        const bp = Math.min(3, src.power ?? 1);
        this.kick('lean', -3 * bp, -0.8 * bp);
        this.kick('x', -4 * bp);
        JK.Audio.sfx('block', !!this.ch.infinity);
        if (src.onBlock) src.onBlock(att, this, g);
        g.onBlock(att, this);
        return 'block';
      }
      if (!opts.projectile) att.hitConfirmed = true;
      // hyper armor (Jackpot energy attacks): soak the hit without flinching
      const dm = this.state === 'move' ? this.move : null;
      if (dm && dm.armor && this.mt < dm.startup + dm.active && !opts.sureHit && src.id !== 'exec' && (src.dmg || 0) < 400) {
        const ad = Math.min((src.dmg || 0) * 0.5 * att.dmgMult, Math.max(0, this.hp - (this.jpT > 0 ? 1 : 0)));
        this.hp -= ad;
        this.flashT = 3; this.flashColor = '#9dffc4';
        this.kick('lean', -3, -1);
        const f = Math.min(8, src.hitstop ?? 6);
        if (!opts.noFreeze) { if (!opts.projectile) att.freeze = Math.max(att.freeze, f); this.freeze = f; }
        JK.FX.hitSpark(cx, cy, dir, 1, '#9dffc4');
        JK.FX.add({ type: 'ring', x: cx, y: cy, r0: 10, r1: 70, w: 4, color: '#9dffc4', life: 10 });
        JK.Audio.sfx('block', true);
        g.onHit(att, this, ad, false);
        return 'armor';
      }
      // counter hit (caught starting a move) / punish (caught recovering)
      const counter = !!dm && this.mt < dm.startup && !opts.projectile;
      const punish = !!dm && !dm.air && this.mt >= dm.startup + dm.active && !opts.projectile;
      // damage
      const scale = Math.max(0.35, 1 - 0.09 * this.comboTaken);
      const ampK = src.amp || (src === att.move && att.amp) ? 1.35 : 1;
      let dmg = (src.dmg || 0) * scale * att.dmgMult * ampK * (g.domainDmgMult ? g.domainDmgMult(att, this) : 1);
      if (counter) dmg *= 1.15; else if (punish) dmg *= 1.1;
      const krush = src.krush && src.id && !att.krushUsed[src.id] && g.fighting &&
        (src.krush === 'counter' ? counter : src.krush === 'punish' ? punish : counter || punish);
      if (krush) { dmg *= 1.6; att.krushUsed[src.id] = true; }
      let bf = false;
      // "The zone": after a Black Flash, more Black Flashes come easily for a while
      const zone = att.zoneT > 0 ? 3 : 1;
      if (src.blackFlash || att.bfForce || (src.bfChance && JK.simRandom() < src.bfChance * (att.ch.bfBoost || 1) * zone)) {
        bf = src.dmg >= 40;
      }
      if (g.domain && g.domain.owner === att && g.domain.id === 'yuji_domain' && !src.noBF) bf = true;
      if (bf) {
        dmg *= 2.2;
        if (att.zoneT <= 0) this.game.announce('IN THE ZONE', { dur: 50, size: 40, side: att === this.game.p1 ? -1 : 1, glow: '#ff2030' });
        att.zoneT = 480;
        if (this.game.stats) this.game.stats[att === this.game.p1 ? 'p1' : 'p2'].bf++;
      }
      dmg = Math.min(dmg, Math.max(0, this.hp)); // overkill (e.g. Execution) doesn't count as damage dealt
      // Jackpot: nothing but the Executioner's Sword can finish Hakari
      if (this.jpT > 0 && src.id !== 'exec') dmg = Math.min(dmg, Math.max(0, this.hp - 1));
      this.hp -= dmg;
      this.comboTaken++;
      this.comboDmg += dmg;
      this.lastHitBy = att;
      this.flashT = 3;
      this.flashColor = bf ? '#ff2040' : '#ffffff';
      att.meter = Math.min(300, att.meter + dmg * 0.2 * (bf ? 1.5 : 1));
      this.meter = Math.min(300, this.meter + dmg * 0.12);
      if (this.state === 'move' && this.move) { this.move = null; }
      if (this.throwVictim) this.throwVictim = null;
      const hitstop = krush ? 26 : bf ? 20 : (src.hitstop ?? 7) + (counter ? 3 : 0);
      if (!opts.noFreeze) { if (!opts.projectile) att.freeze = Math.max(att.freeze, hitstop); this.freeze = hitstop; }
      this.hitLevel = cy < this.y - 150 ? 'high' : 'body';
      // recoil springs: the pose snaps with the blow, overshoots, and settles
      const rp = Math.min(3, src.power ?? 1) * (bf ? 1.6 : 1);
      if (this.hitLevel === 'high') { this.kick('head', -9 * rp, -2 * rp); this.kick('lean', -4 * rp, -1 * rp); }
      else { this.kick('lean', 6 * rp, 1.5 * rp); this.kick('head', 5 * rp); }
      this.kick('x', -5 * rp);
      this.kick('sq', -0.03 * rp);
      // reaction
      const airborne = this.y < -2 || this.state === 'juggle' || this.state === 'air';
      const kb = src.kb ?? 5;
      const wasVoided = this.state === 'voided';
      if (this.hp <= 0 && !this.dizzyPending && g.shouldFinishThem && g.shouldFinishThem(this)) {
        this.hp = 0;
        this.dizzyPending = true;
        this.burnT = 0;
      }
      if (this.hp <= 0 && !this.dizzyPending) {
        this.hp = 0;
        this.setState('juggle');
        this.vy = -12;
        this.vx = dir * 7;
        this.y = Math.min(this.y, -2);
      } else if (src.launch || airborne || src.knockdown || (this.dizzyPending && !this.dizzy)) {
        this.setState('juggle');
        this.jugCount++;
        const decay = Math.max(0.35, 1 - this.jugCount * 0.12);
        if (src.launch) this.vy = (src.launchVy ?? -17) * (airborne ? decay : 1);
        else if (src.knockdown && !airborne) this.vy = src.knockVy ?? -7;
        else this.vy = Math.min(-4, -9 * decay);
        this.vx = dir * (src.airKb ?? kb * 0.8);
        this.y = Math.min(this.y, -2);
      } else {
        this.setState('hitstun');
        this.hs = (wasVoided ? Math.max(src.hitstun ?? 16, 20) : src.hitstun ?? 16) + (counter ? 6 : punish ? 3 : 0) + (ampK > 1 ? 4 : 0);
        this.vx = dir * kb;
        if (this.atWall && Math.sign(this.atWall) === dir) att.vx = -dir * kb * 0.9;
      }
      if (src.burn && !this.dizzyPending) this.burnT = Math.max(this.burnT, src.burn);
      if (this.dizzyPending) this.invuln = 999; // no juggling a defeated fighter before "FINISH THEM"
      // feedback
      const power = src.power ?? 1;
      if (bf) {
        JK.FX.blackFlash(cx, cy, dir);
        JK.Audio.sfx('blackFlash');
        g.shake(16, 18);
        g.flashScreen('#000000', 0.55, 6);
        g.slowmo(14, 0.35);
        g.zoomPunch(0.12);
      } else {
        JK.FX.hitSpark(cx, cy, dir, power, src.sparkColor || att.ch.color);
        if (src.slashFx) JK.FX.slashMarks(cx, cy, 2 + power, src.sparkColor || '#ff5060', 0.8);
        JK.Audio.sfx(src.sfx || 'hit', power);
        if (power >= 3 && !src.sfx) JK.Audio.sample('heavy_hit', 0.8);
        if (power >= 2) g.shake(power * 3, 8 + power * 2);
        if (power >= 3) g.zoomPunch(0.05);
      }
      if (krush) g.krushingBlow(att, this, cx, cy, src);
      else if (counter && this.hp > 0) JK.FX.text(this.x, this.y - 262, 'COUNTER', { size: 30, font: JK.FONT_TITLE, color: '#ffd040', life: 32 });
      else if (punish && this.hp > 0) JK.FX.text(this.x, this.y - 262, 'PUNISH', { size: 30, font: JK.FONT_TITLE, color: '#ff7a5a', life: 32 });
      if (src.onHit) src.onHit(att, this, g, bf);
      g.onHit(att, this, dmg, bf);
      return 'hit';
    }

    // ---------------------------------------------------------------- animation
    updateAnim() {
      const g = this.game;
      // real distance covered since the last animation tick drives the step cycle
      this.animV = JK.clamp((this.x - (this.animX ?? this.x)) * this.facing, -20, 20);
      this.animX = this.x;
      const P0 = this.poses;
      let target;
      let blend = 0.3;
      const s = this.state;
      const t = g.frame;
      this.face = 'normal';
      switch (s) {
        case 'idle':
          target = this.ch.idlePose(this, t);
          if (this.hp < this.maxHp * 0.25 && g.fighting) {
            // badly hurt: heavier breathing, shoulders sagging
            const b = Math.sin(t * 0.13);
            target = Object.assign({}, target, { y: target.y + 4 + b * 2, lean: target.lean + 6 + b * 2, head: target.head + 8 });
          }
          break;
        case 'landing':
          target = JK.Rig.lerpPose(this.ch.idlePose(this, t), P0.crouch, 0.5 * (this.landT / 4));
          blend = 0.55;
          break;
        case 'walk':
          target = walkPose(this, P0.stance, t);
          blend = 0.5;
          break;
        case 'run':
          target = runPose(this, P0, t);
          blend = 0.45;
          break;
        case 'skid': {
          const k = Math.min(1, this.st / 3);
          target = P(P0.backdash, { lean: -18 + k * 8, y: -96, fF: [44, 0], fB: [-22, 0], aF: -18, aB: 0 });
          blend = 0.5;
          break;
        }
        case 'techroll': {
          const k = JK.clamp(this.st / 18, 0, 1);
          target = P(P0.tuck, { y: -62, fF: [26, -6], fB: [12, 0], rot: this.rollDir * 360 * JK.ease.inOut(k) });
          if (this.st > 17) target = P(P0.crouch, { rot: this.rollDir * 360 });
          blend = 0.6;
          break;
        }
        case 'wallsplat': {
          const k = Math.min(1, this.st / 22);
          target = P(P0.hitHigh, { lean: -16 + k * 10, head: -24 + k * 16, x: -14, hF: [-28, -36 + k * 50], hB: [-40, -26 + k * 44], fF: [18, -10], fB: [-8, -4], aF: 40, aB: 30, gF: 'open', gB: 'open' });
          blend = this.st <= 1 ? 1 : 0.2;
          this.face = 'hurt';
          break;
        }
        case 'crouch':
          target = P0.crouch;
          blend = 0.35;
          break;
        case 'block':
        case 'blockstun':
          target = this.crouching ? P0.cblock : P0.block;
          blend = s === 'blockstun' ? 0.6 : 0.45;
          break;
        case 'jumpsquat':
          target = P0.crouch;
          blend = 0.6;
          break;
        case 'air': {
          const up = this.vy < 0;
          if (this.airDashT > 0) {
            target = this.airDashDir > 0 ? P0.dash : P0.backdash;
            blend = 0.5;
          } else if (this.flip) {
            const tt = JK.clamp((this.vy - JUMP_V) / (-JUMP_V * 2), 0, 1);
            target = Object.assign({}, P0.tuck, { rot: this.flip * 360 * JK.ease.inOut(JK.clamp((tt - 0.1) / 0.75, 0, 1)) });
            blend = 0.45;
          } else {
            // blend smoothly through the apex instead of snapping from rise to fall
            const k = JK.ease.inOut(JK.clamp((this.vy + 7) / 14, 0, 1));
            target = JK.Rig.lerpPose(P0.jump, P0.fall, k);
            void up;
          }
          break;
        }
        case 'dash':
          target = this.dashDir > 0 ? P0.dash : P0.backdash;
          blend = 0.4;
          break;
        case 'move': {
          const m = this.move;
          target = JK.Rig.sample(m.anim, this.mt);
          blend = m.blend ?? 0.8;
          if (m.face) this.face = m.face;
          break;
        }
        case 'hitstun':
          target = this.hitLevel === 'high' ? P0.hitHigh : P0.hitBody;
          blend = this.st <= 1 ? 1 : 0.26;
          this.face = 'hurt';
          break;
        case 'juggle': {
          const spin = JK.clamp(this.vy / 16, -1, 1);
          target = Object.assign({}, P0.air, { rot: -40 - spin * 30 });
          blend = 0.3;
          this.face = 'hurt';
          break;
        }
        case 'knockdown':
        case 'ko':
          target = P0.down;
          blend = 0.3;
          this.face = 'hurt';
          break;
        case 'getup': {
          const k = this.st / 22;
          target = k < 0.5 ? JK.Rig.lerpPose(P0.down, P0.crouch, k * 2) : JK.Rig.lerpPose(P0.crouch, P0.stance, (k - 0.5) * 2);
          blend = 0.5;
          break;
        }
        case 'stunned':
          target = Object.assign({}, P0.stance, { lean: -2 + Math.sin(t * 0.3) * 1.5, head: -6, x: Math.sin(t * 0.9) * 1.5 });
          blend = 0.2;
          this.face = 'hurt';
          break;
        case 'voided':
          target = Object.assign({}, P0.hitHigh, { lean: -6 + Math.sin(t * 0.05) * 2, head: -18, hF: [8, 50], hB: [4, 52], gF: 'open', gB: 'open' });
          blend = 0.1;
          this.face = 'hurt';
          break;
        case 'dizzy': {
          const w = Math.sin(t * 0.06);
          target = Object.assign({}, P0.hitBody, { lean: 14 + w * 10, head: 10 + w * 12, x: w * 8, hF: [10, 52], hB: [6, 54], gF: 'open', gB: 'open' });
          blend = 0.12;
          this.face = 'hurt';
          break;
        }
        case 'thrown':
          target = P0.air;
          blend = 0.4;
          this.face = 'hurt';
          break;
        case 'win':
          target = JK.Rig.sample(this.ch.winAnim, this.st);
          blend = 0.25;
          break;
        case 'intro':
          target = JK.Rig.sample(this.ch.introAnim, this.st);
          blend = 0.3;
          break;
        case 'domaincast':
          target = JK.Rig.sample(this.moves.domain.anim, Math.min(this.st, 200));
          blend = 0.3;
          this.face = 'shout';
          break;
        case 'lose':
          target = P0.down;
          break;
        case 'scripted':
          target = this.scriptPose || P0.stance;
          blend = this.scriptBlend || 0.3;
          if (this.scriptFace) this.face = this.scriptFace;
          break;
        default:
          target = P0.stance;
      }
      // rotations are angles: after a flip or roll (360 deg) unwind the short way, not backwards
      const tr = target.rot || 0;
      let pr = this.pose.rot || 0;
      while (pr - tr > 180) pr -= 360;
      while (tr - pr > 180) pr += 360;
      if (pr !== (this.pose.rot || 0)) this.pose = Object.assign({}, this.pose, { rot: pr });
      this.pose = JK.Rig.lerpPose(this.pose, target, blend);
      // presentation springs (squash & stretch, recoil)
      const sp = this.sp;
      for (const [k, stiff, damp] of SPRINGS) {
        sp[k + 'V'] = (sp[k + 'V'] - sp[k] * stiff) * damp;
        sp[k] += sp[k + 'V'];
      }
      sp.sq = JK.clamp(sp.sq, -0.22, 0.22);
      // turn-around: flip through a squeeze instead of popping
      this.vface = JK.approach(this.vface, this.facing, 0.34);
      this.J = JK.Rig.solve(this.displayPose());
      // footsteps
      if (s === 'walk' || s === 'run') {
        const c = Math.cos(this.walkPh * Math.PI * 2);
        if (Math.sign(c) !== Math.sign(this.stepC) && this.stepC !== 0) {
          JK.FX.dust(this.x + this.facing * (c < 0 ? 14 : -14), 0, -this.facing * Math.sign(this.vx * this.facing || 1), s === 'run' ? 3 : 1);
          JK.Audio.sfx('step', s === 'run' ? 1 : 0.55);
        }
        this.stepC = c;
      } else this.stepC = 0;
      // secondary motion
      const accel = -this.vx * this.facing * 1.2;
      this.clothV += (accel - this.cloth) * 0.18;
      this.clothV *= 0.72;
      this.cloth += this.clothV;
      this.cloth = JK.clamp(this.cloth + Math.sin(t * 0.1 + this.side) * 0.3, -16, 22);
      this.hairSway = JK.clamp(this.cloth * 0.4 + (this.vy < 0 ? 2 : this.y < 0 ? -2 : 0), -8, 8);
      // ghosts
      if (this.ghostT > 0) this.ghostT--;
      const wantGhost = this.ghostT > 0 || (this.move && this.move.ghost);
      if (wantGhost && g.frame % 3 === 0) {
        this.ghosts.push({ x: this.x, y: this.y, facing: this.facing, pose: this.displayPose(), life: 14 });
      }
      for (let i = this.ghosts.length - 1; i >= 0; i--) if (--this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
      for (let i = this.trail.length - 1; i >= 0; i--) if (++this.trail[i].t > 8) this.trail.splice(i, 1);
      // aura when meter is full or during specials
      const auraOn = this.meter >= 300 || (this.move && this.move.special) || this.state === 'domaincast' || this.otT > 0 || this.execT > 0 || this.jpT > 0;
      this.aura = JK.approach(this.aura, auraOn ? 1 : 0, 0.05);
      if (this.aura > 0.2 && g.frame % 2 === 0 && !this.hidden) JK.FX.aura(this.x, this.y, this.jpT > 0 ? '#2aff7a' : this.amp && this.move ? '#ffffff' : this.ch.aura, this.jpT > 0 ? 1.6 : 1, 50, 200);
    }

    // ---------------------------------------------------------------- draw
    // Pose actually shown: the smoothed pose plus the presentation springs.
    displayPose() {
      const p = this.pose, s = this.sp;
      return Object.assign({}, p, { sq: (p.sq ?? 1) * (1 + s.sq), lean: p.lean + s.lean, head: p.head + s.head, x: (p.x || 0) + s.x });
    }
    // Remember where we were at the start of this sim tick, for render interpolation.
    snapshot() {
      this.prevX = this.x;
      this.prevY = this.y;
      this.prevVface = this.vface;
      this.prevPose = this.displayPose();
    }

    draw(ctx) {
      if (this.hidden) return;
      const g = this.game;
      // Render interpolation: draw between the last two sim ticks so motion is smooth on
      // high-refresh displays. Big jumps (teleports, round resets) snap instead.
      const al = g.renderAlpha ?? 1;
      const lerp = al < 1 && this.prevPose && Math.abs(this.x - this.prevX) < 90 && Math.abs(this.y - this.prevY) < 90;
      const X = lerp ? this.prevX + (this.x - this.prevX) * al : this.x;
      const Y = lerp ? this.prevY + (this.y - this.prevY) * al : this.y;
      const cur = this.displayPose();
      let pp = this.prevPose;
      if (lerp && Math.abs((pp.rot || 0) - (cur.rot || 0)) > 180) {
        let r = pp.rot || 0;
        while (r - (cur.rot || 0) > 180) r -= 360;
        while ((cur.rot || 0) - r > 180) r += 360;
        pp = Object.assign({}, pp, { rot: r });
      }
      const pose = lerp ? JK.Rig.lerpPose(pp, cur, al) : cur;
      let vf = lerp ? this.prevVface + (this.vface - this.prevVface) * al : this.vface;
      if (Math.abs(vf) < 0.4) vf = (vf < 0 || (vf === 0 && this.facing < 0) ? -1 : 1) * 0.4;
      // ground shadow
      ctx.save();
      const sh = JK.clamp(1 + Y / 400, 0.3, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.35 * sh})`;
      ctx.beginPath();
      ctx.ellipse(X, 2, 46 * sh, 9 * sh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // afterimages
      for (const gh of this.ghosts) {
        ctx.save();
        ctx.globalAlpha = (gh.life / 14) * 0.35;
        ctx.translate(gh.x, gh.y);
        ctx.scale(gh.facing, 1);
        JK.drawCharacter(ctx, this.ch, gh.pose, { ghost: true, noWeapon: this.gavelOut, sword: this.swordT > 0 || this.execT > 0, palette: this.ghostPal || (this.ghostPal = JK.makeGhostPalette(this.ch.aura)) });
        ctx.restore();
      }
      // smear trail
      if (this.trail.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < this.trail.length; i++) {
          const a = this.trail[i - 1], b = this.trail[i];
          const al = (1 - b.t / 8) * 0.55;
          ctx.strokeStyle = JK.rgba(this.move && this.move.trailColor || this.ch.color, al);
          ctx.lineWidth = 18 * (1 - b.t / 8) + 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      // aura glow behind body
      if (this.aura > 0.05) {
        const J = this.J;
        const chest = { x: X + J.neck.x * this.facing, y: Y + (J.neck.y + J.hip.y) / 2 };
        const pulse = 0.8 + Math.sin(g.frame * 0.2) * 0.2;
        const jp = this.jpT > 0;
        JK.drawGlow(ctx, jp ? '#2aff7a' : this.ch.aura, chest.x, chest.y, (jp ? 230 : 150) * pulse, (jp ? 0.7 : 0.45) * this.aura);
      }
      // Rika looms behind Yuta while he charges Pure Love
      if (this.id === 'yuta' && this.rikaT > 0 && this.state === 'move' && this.move && this.move.id === 't3') {
        const a = Math.min(1, (110 - this.rikaT) / 20) * (this.rikaT < 15 ? this.rikaT / 15 : 1);
        JK.drawRika(ctx, X - this.facing * 150, 0, 1.1, this.facing, g.frame, a * 0.8, JK.clamp((this.mt - 60) / 10, 0, 1) * 0.3);
      }
      // body
      ctx.save();
      let sx = 0;
      if (this.freeze > 0 && (this.state === 'hitstun' || this.state === 'juggle' || this.state === 'blockstun')) sx = (Math.random() - 0.5) * 6;
      ctx.translate(X + sx, Y);
      ctx.scale(vf, 1);
      const fx = {
        cloth: this.cloth, hairSway: this.hairSway, face: this.face, eyesOpen: this.eyesOpen,
        glowEyes: this.aura > 0.5, t: g.frame, rim: this.jpT > 0 ? '#2aff7a' : g.stage ? g.stage.rim : null, jackpot: this.jpT > 0, rika: this.rikaT,
        // natural blinking while not fighting hard
        blink: !!ACTIONABLE[this.state] && (g.frame + this.side * 97) % 223 < 6,
        noWeapon: this.gavelOut, sword: this.swordT > 0 || this.execT > 0, loose: this.loose,
      };
      if (this.flashT > 0) fx.palette = this.flashPal(this.flashColor);
      JK.drawCharacter(ctx, this.ch, pose, fx);
      if (this.state === 'voided') {
        // information overload: flickering glyph streaks over the victim
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = JK.rgba(JK.pick(['#9fe8ff', '#ffffff', '#c7a0ff']), 0.5);
          ctx.fillRect(-40 + Math.random() * 80, -230 + Math.random() * 220, 2 + Math.random() * 30, 1.5);
        }
      }
      ctx.restore();
      if (JK.settings.hitboxes) this.drawBoxes(ctx);
    }
    flashPal(color) {
      this._fp = this._fp || {};
      if (!this._fp[color]) {
        const p = JK.makeGhostPalette(color);
        this._fp[color] = p;
      }
      return this._fp[color];
    }
    drawBoxes(ctx) {
      ctx.save();
      ctx.lineWidth = 2;
      for (const b of this.hurtboxes()) {
        ctx.strokeStyle = 'rgba(80,160,255,0.9)';
        ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      }
      const hb = this.activeHitbox();
      if (hb) {
        ctx.fillStyle = 'rgba(255,40,40,0.35)';
        ctx.fillRect(hb.box.x0, hb.box.y0, hb.box.x1 - hb.box.x0, hb.box.y1 - hb.box.y0);
      }
      ctx.restore();
    }
  }

  // stiffness, damping for each presentation spring
  const SPRINGS = [['sq', 0.26, 0.74], ['lean', 0.2, 0.74], ['head', 0.22, 0.7], ['x', 0.25, 0.7]];

  // Walk cycle driven by distance travelled, so planted feet stay (nearly) planted.
  // Each foot spends half the cycle planted (sliding back at body speed) and half swinging forward.
  function footCycle(p, stride, lift) {
    p = ((p % 1) + 1) % 1;
    if (p < 0.5) return { x: stride * (1 - 4 * p), y: 0, a: 0 };
    const u = (p - 0.5) * 2;
    return { x: -stride + 2 * stride * JK.ease.inOut(u), y: -Math.sin(u * Math.PI) * lift, a: Math.sin(u * Math.PI) * 18 };
  }
  function walkPose(f, st, t) {
    const cross = f.ch.walkStyle === 'cross';
    const stride = f.ch.stride || (cross ? 22 : 16);
    const vf = f.vx * f.facing;
    const v = Math.abs(f.animV) < Math.abs(vf) * 0.35 ? vf * 0.35 : f.animV;
    // phase advances with distance; shuffle walks slide a little so they don't look frantic
    f.walkPh += v / (4 * stride) * (cross ? 1 : 0.8);
    const ph = f.walkPh;
    const base = f.ch.walkBase ? f.ch.walkBase(f, t) : st;
    const cF = cross ? 4 : st.fF[0] * 0.85, cB = cross ? -4 : st.fB[0] * 0.85;
    const a = footCycle(ph, stride, cross ? 12 : 10), b = footCycle(ph + 0.5, stride, cross ? 12 : 10);
    const bob = Math.cos(ph * Math.PI * 4);
    const swing = Math.sin(ph * Math.PI * 2);
    let y = st.y + bob * 2.2 + 1;
    if (cross) {
      // upright stroll: hip height follows the planted leg, so it is nearly straight at mid-stance
      const L = 123; // hip-to-sole with an almost straight leg (thigh + shin + ankle)
      let h = L;
      if (a.y > -4) h = Math.min(h, Math.sqrt(L * L - Math.pow(cF + a.x - 5, 2)));
      if (b.y > -4) h = Math.min(h, Math.sqrt(L * L - Math.pow(cB + b.x + 5, 2)));
      y = -h;
    }
    const o = Object.assign({}, base, {
      y,
      fF: [cF + a.x, a.y], aF: a.a,
      fB: [cB + b.x, b.y], aB: b.a,
      lean: st.lean + vf * 0.7,
      head: st.head - vf * 0.4,
      tw: (st.tw || 7) + swing * 2,
    });
    // arm swing opposite the legs (hands in pockets stay put)
    if (base.gF !== 'pocket') o.hF = [base.hF[0] - swing * (cross ? 9 : 3), base.hF[1] + Math.abs(swing) * 2];
    if (base.gB !== 'pocket') o.hB = [base.hB[0] + swing * (cross ? 9 : 3), base.hB[1] + Math.abs(swing) * 2];
    return o;
  }
  // Full sprint: long strides, forward lean, pumping arms.
  function runPose(f, P0, t) {
    const stride = 30;
    const vf = f.vx * f.facing;
    const v = Math.abs(f.animV) < Math.abs(vf) * 0.35 ? vf * 0.35 : f.animV;
    f.walkPh += v / (4 * stride);
    const ph = f.walkPh;
    const a = footCycle(ph, stride, 22), b = footCycle(ph + 0.5, stride, 22);
    const bob = Math.cos(ph * Math.PI * 4);
    const swing = Math.sin(ph * Math.PI * 2);
    const pocket = P0.stance.gF === 'pocket';
    return P(P0.dash, {
      y: -98 + bob * 4,
      lean: 27 + bob * 2,
      head: -14,
      fF: [8 + a.x, a.y], aF: a.a + 10,
      fB: [-8 + b.x, b.y], aB: b.a + 10,
      hF: pocket ? [3, 70] : [18 - swing * 26, 20 - Math.abs(swing) * 14],
      hB: pocket ? [-4, 70] : [-6 + swing * 26, 22 - Math.abs(swing) * 14],
      gF: pocket ? 'pocket' : P0.dash.gF, gB: pocket ? 'pocket' : P0.dash.gB,
    });
  }

  JK.Fighter = Fighter;
  JK.GRAV = GRAV;
})();
