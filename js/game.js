'use strict';
// A match: rounds, timer, camera, HUD, domain expansions, clashes and finishers.
(function () {
  const W = JK.W, H = JK.H, GY = JK.GROUND;
  const ROUND_TIME = 99 * 60;
  const DOMAIN_TIME = 540;
  const A = JK.Audio;

  // Matchup-specific intro lines: 'p1>p2': [p1 line, p2 line]
  JK.RIVALS = {
    'gojo>sukuna': ['Let\'s see what the King of Curses has left.', 'At last. A meal worth savoring.'],
    'sukuna>gojo': ['Show me your limits, sorcerer.', 'Relax. I\'m the strongest.'],
    'yuji>sukuna': ['Give Megumi back!', 'Brat. You still don\'t understand.'],
    'sukuna>yuji': ['Kneel, brat.', 'I\'m taking you down myself!'],
    'megumi>sukuna': ['I won\'t let you use me again.', 'Your shadows will serve me now.'],
    'sukuna>megumi': ['Your technique will be mine.', 'Not while I\'m still standing.'],
    'gojo>jogo': ['You picked the wrong sorcerer.', 'Are you really the strongest?'],
    'jogo>gojo': ['I\'ll burn away that arrogance!', 'Nah, I\'d win.'],
    'yuji>jogo': ['You\'re the one who burned all those people.', 'Insect. Know your place!'],
    'jogo>yuji': ['Sukuna\'s vessel... how disappointing.', 'I\'m going to exorcise you.'],
    'yuji>megumi': ['Let\'s go, Fushiguro!', 'Don\'t hold back, Itadori.'],
    'megumi>yuji': ['Show me what you\'ve got, Itadori.', 'Here I come, Fushiguro!'],
    'yuji>gojo': ['Sensei, teach me something new!', 'Alright. Let\'s see your progress.'],
    'gojo>yuji': ['Lesson time, Yuji.', 'I won\'t go easy, Sensei!'],
    'megumi>gojo': ['I\'ll surpass you someday.', 'That\'s the spirit, Megumi.'],
    'gojo>megumi': ['Show me your shadows, Megumi.', 'I\'ll give it everything I have.'],
    'jogo>sukuna': ['Lord Sukuna... join us.', 'Then amuse me.'],
    'sukuna>jogo': ['A puff of smoke, pretending to be a volcano.', 'I\'ll prove curses are the true humans!'],
    'jogo>megumi': ['Shadows cannot stop fire.', 'Then I\'ll bury your flames.'],
    'megumi>jogo': ['Let\'s see you handle my shikigami.', 'Pests! All of you!'],
    'gojo>gojo': ['Two of me? The world isn\'t ready.', 'Nah, I\'d win.'],
    'sukuna>sukuna': ['A fake wearing my face.', 'Only one king sits on this throne.'],
    'yuji>yuji': ['Wait... is that me?', 'Guess I\'m fighting myself.'],
    'higuruma>yuji': ['Defendant Yuji Itadori. You stand accused of murder in Shibuya.', 'I did it. I won\'t run from it.'],
    'yuji>higuruma': ['I\'m not here to argue.', 'Then let the court decide.'],
    'higuruma>sukuna': ['Even a king must stand trial.', 'Amusing. Judge me, then.'],
    'sukuna>higuruma': ['A lawyer? Don\'t bore me.', 'The court is now in session.'],
    'higuruma>gojo': ['The strongest is not above the law.', 'Objection. I\'m just that good.'],
    'nanami>jogo': ['I have no intention of working overtime for you.', 'A human who thinks he can win? Burn!'],
    'jogo>nanami': ['Another sorcerer to reduce to ash.', 'It\'s six o\'clock. I\'m off the clock... but I\'ll make an exception.'],
    'nanami>yuji': ['Itadori-kun. Show me what you\'ve learned.', 'Nanamin! I won\'t hold back!'],
    'yuji>nanami': ['Nanamin! Spar with me!', 'Don\'t call me that. Come.'],
    'gojo>nanami': ['Nanami! Do your senpai a favor?', 'I already regret coming here.'],
    'nanami>gojo': ['I\'m billing you for this.', 'Aw, come on, Nanami.'],
    'nanami>higuruma': ['A lawyer. I left that kind of work behind.', 'The court is now in session.'],
    'higuruma>nanami': ['Another man who hates his job.', 'At least we agree on something.'],
    'nanami>sukuna': ['I won\'t let you use that boy.', 'A salaryman. How dull.'],
    'yuta>sukuna': ['Rika. This time, we don\'t hold anything back.', 'The Special Grade brat. Entertain me.'],
    'sukuna>yuta': ['You copy techniques? Copy this.', 'Rika... let\'s go.'],
    'yuta>gojo': ['Gojo-sensei. Please take this seriously.', 'Yuta! You\'ve gotten strong, huh?'],
    'gojo>yuta': ['Show me what my best student can do.', 'I\'ll try not to disappoint you, sensei.'],
    'yuta>yuji': ['Itadori-kun... I\'m sorry about this.', 'Wait, what did I do?!'],
    'yuji>yuta': ['Okkotsu-senpai! Let\'s go!', 'Don\'t worry. I\'ll go easy.'],
    'hakari>higuruma': ['A lawyer, huh? Let\'s gamble instead.', 'Gambling is illegal, Hakari.'],
    'higuruma>hakari': ['Your luck won\'t save you in my court.', 'Wanna bet?'],
    'hakari>yuta': ['The special grade! Now THAT\'S a high-stakes game.', 'Please... don\'t make this weird.'],
    'yuta>hakari': ['Hakari-senpai. Let\'s make this quick.', 'Quick? Where\'s the fun in that?'],
    'hakari>sukuna': ['Let\'s get fired up! Winner takes all!', 'A gambler. Your luck ran out.'],
    'sukuna>hakari': ['I\'ll cut through your luck.', 'Then let\'s see who hits the jackpot.'],
    'hakari>gojo': ['The strongest? Good odds, then.', 'Heh. You\'re fun, Hakari.'],
    'megumi>hakari': ['Hakari-senpai. We need you.', 'Then beat me first, Fushiguro!'],
  };
  // Idle Death Gamble: the riichi scenarios the domain cycles through
  JK.HAKARI_SCEN = ['TRANSIT CARD', 'SEAT STRUGGLE', 'POTTY EMERGENCY', 'PURE LOVE TRAIN'];
  JK.HOLD_COLORS = { green: '#2aff7a', red: '#ff3050', gold: '#ffd23a', rainbow: '#ffffff' };

  // keys used in the Deadly Sentencing trial and how they're shown
  JK.TRIAL_KEYS = ['up', 'down', 'left', 'right', 'light', 'heavy', 'kick'];
  JK.TRIAL_GLYPH = { up: '↑', down: '↓', left: '←', right: '→', light: 'J', heavy: 'K', kick: 'L' };

  JK.DUMMY_MODES = ['STAND', 'BLOCK', 'CROUCH BLOCK', 'JUMP', 'RANDOM GUARD', 'TECH ROLL'];

  class Game {
    constructor(opts) {
      this.opts = opts;
      this.mode = opts.mode || 'versus';
      this.frame = 0;
      this.projectiles = [];
      this.timers = [];
      this.announces = [];
      this.screenFx = [];
      this.stage = JK.getStage(opts.stage);
      let c1, c2;
      if (opts.net) {
        // Online versus: the local player drives their own fighter from keyboard/pad,
        // the remote fighter is fed by the lockstep session. Host is always p1.
        this.net = opts.net.session;
        this.netLocal = opts.net.localPlayer;
        this.net.opts = opts.net;
        const local = new JK.NetLocalController(this.net);
        const remote = new JK.NetRemoteController(this.net);
        c1 = this.netLocal === 1 ? local : remote;
        c2 = this.netLocal === 2 ? local : remote;
        this.net.attachGame(this);
      } else {
        this.net = null;
        this.netLocal = 0;
        c1 = new JK.HumanController(1);
        c2 = opts.p2human === 'local' ? new JK.HumanController(2) : new JK.AIController(this.mode === 'training' ? 'dummy' : opts.difficulty);
      }
      this.p1 = new JK.Fighter(this, opts.p1, 0, c1, opts.c1 || 0);
      this.p2 = new JK.Fighter(this, opts.p2, 1, c2, opts.c2 || 0);
      if (c2.bind) c2.bind(this.p2);
      this.winsNeeded = opts.roundsToWin || 2;
      this.stats = { p1: { maxCombo: 0, dmg: 0, bf: 0, domains: 0 }, p2: { maxCombo: 0, dmg: 0, bf: 0, domains: 0 } };
      this.cam = { x: JK.STAGE_W / 2, y: 0, z: 1, shake: 0, shakeT: 0, punch: 0, sx: 0, sy: 0 };
      this.round = 1;
      this.timer = ROUND_TIME;
      this.fighting = false;
      this.cinematic = false;
      this.domain = null;
      this.finishPhase = null;
      this.fin = null;
      this.slow = { t: 0, rate: 1, acc: 0 };
      this.flash = { color: '#fff', a: 0, decay: 0 };
      this.dim = { t: 0, a: 0 };
      this.cut = null;
      this.paused = false;
      this.ended = false;
      this.result = null;
      this.hud = { trail1: JK.MAX_HP, trail2: JK.MAX_HP, combo: null };
      if (opts.p1Hp) this.p1.hp = this.hud.trail1 = opts.p1Hp;
      A.playMusic(this.stage.music, { restart: true });
      this.startIntro();
    }

    // ------------------------------------------------------------ phase control
    setPhase(p) { this.phase = p; this.pt = 0; }
    // Pre-fight cutscene: establishing pan, a close-up + voice line for each fighter, then a VS slam.
    startIntro() {
      this.setPhase('intro');
      for (const f of [this.p1, this.p2]) f.setState('idle');
      const rival = JK.RIVALS[this.p1.id + '>' + this.p2.id];
      const line = (f, i) => {
        const clip = f.ch.introClip && A.hasClip(f.ch.introClip) ? f.ch.introClip : null;
        const text = clip ? f.ch.introLine : rival ? rival[i] : f.ch.quote;
        const len = clip ? Math.round(A.clipDuration(f.ch.introClip) * 60) + 30 : 115;
        return { clip, text, len: Math.max(115, len) };
      };
      const l1 = line(this.p1, 0), l2 = line(this.p2, 1);
      const EST = 85;
      this.intro = { l1, l2, s1: EST, s2: EST + l1.len, s3: EST + l1.len + l2.len };
      this.intro.end = this.intro.s3 + 55;
      this.cam.x = JK.STAGE_W / 2 - 650;
      this.cam.z = 0.9;
      A.sfx('riser', 1.4);
    }
    endIntro() {
      this.intro = null;
      A.stopAllClips();
      this.p1.setState('idle');
      this.p2.setState('idle');
      this.startRound();
    }
    startRound() {
      this.setPhase('roundstart');
      A.playMusic(this.stage.music); // resumes the stage theme if a domain or Jackpot silenced it
      this.fighting = false;
      this.timer = ROUND_TIME;
      const final = this.winsNeeded > 1 && this.p1.wins === this.winsNeeded - 1 && this.p2.wins === this.winsNeeded - 1;
      if (this.mode === 'survival') { this.announce('BATTLE ' + (this.opts.streak + 1), { dur: 70, size: 110 }); A.sfx('bell'); return; }
      this.announce(final ? 'FINAL ROUND' : 'ROUND ' + this.round, { dur: 70, size: 110 });
      A.say(final ? 'Final round' : 'Round ' + this.round, { pitch: 0.5, rate: 0.9 });
      A.sfx('bell');
    }
    resetRound() {
      this.projectiles.length = 0;
      JK.FX.clear();
      A.stopAllClips();
      this.endDomain(true);
      this.finishPhase = null;
      this.p1.resetRound(JK.STAGE_W / 2 - 260);
      this.p2.resetRound(JK.STAGE_W / 2 + 260);
      this.cam.x = JK.STAGE_W / 2;
      this.hud.trail1 = this.hud.trail2 = JK.MAX_HP;
      if (this.jackpotMusic) { this.jackpotMusic = false; A.playMusic(this.stage.music, { restart: true }); }
    }

    announce(text, o = {}) {
      this.announces.push(Object.assign({ text, t: -(o.delay || 0), dur: 60, size: 90, color: '#fff', glow: '#ff3050' }, o));
    }
    later(frames, fn) { this.timers.push({ t: frames, fn }); }
    shake(a, f) { if (!JK.settings.shake) return; this.cam.shake = Math.max(this.cam.shake, a); this.cam.shakeT = Math.max(this.cam.shakeT, f); }
    flashScreen(color, a, frames) { this.flash = { color, a, decay: a / Math.max(1, frames) }; }
    slowmo(frames, rate) { this.slow.t = Math.max(this.slow.t, frames); this.slow.rate = rate; }
    zoomPunch(a) { this.cam.punch = Math.max(this.cam.punch, a); }
    dimScreen(frames, a) { this.dim = { t: frames, a }; }
    cutIn(f, name, jp) { this.cut = { f, name, jp, t: 0 }; }
    // Super flash: the world stops while the caster charges (fighting-game "super freeze").
    superFreeze(f, frames) { this.sfz = { f, t: 0, total: frames }; f.invuln = Math.max(f.invuln, frames + 4); A.sfx('heartbeat', 0.8); }
    negFlash(frames = 4) { this.negT = frames; }

    bounds(f) {
      let min = 70, max = JK.STAGE_W - 70;
      if (f && !this.cinematic) {
        const o = f.opp;
        if (o && o.state !== 'thrown') { min = Math.max(min, o.x - 880); max = Math.min(max, o.x + 880); }
      }
      return { min, max };
    }
    chipFloor(def) { return this.finishPhase ? 0 : 1; }
    canDomain(f) {
      if (this.domain || this.finishPhase || this.phase !== 'fight') return false;
      if (f && f.jpT > 0) return false;
      if (this.mode === 'training') return true;
      return true;
    }
    shouldFinishThem(def) {
      if (this.mode === 'training' || this.finishPhase || this.phase !== 'fight') return false;
      const att = def.opp;
      return att.wins === this.winsNeeded - 1;
    }
    domainDmgMult(att, def) {
      const d = this.domain;
      if (!d || d.phase !== 'active') return 1;
      if (d.owner === att) {
        if (d.id === 'yuji_domain') return 0.72;
        if (d.id === 'unlimited_void') return 0.7;
        if (d.id === 'chimera_shadow_garden') return 1.2;
        if (d.id === 'deadly_sentencing' || d.id === 'overtime_collapse' || d.id === 'idle_death_gamble') return 1;
        if (d.id === 'authentic_mutual_love') return 1.05;
        return 1.1;
      }
      return 1;
    }

    // ------------------------------------------------------------ callbacks from fighters
    onHit(att, def, dmg, bf) {
      const who = att === this.p1 ? 1 : 2;
      this.hud.combo = { who, hits: def.comboTaken, dmg: def.comboDmg, t: 0 };
      const st = this.stats[who === 1 ? 'p1' : 'p2'];
      st.maxCombo = Math.max(st.maxCombo, def.comboTaken);
      st.dmg += dmg;
      this.trainNote(att, def, dmg, false);
      if (def.comboTaken === 5) A.say('Brutal', { pitch: 0.5, cancel: false });
      if (bf && att.id === 'yuji' && Math.random() < 0.5) A.say('Black flash!', { pitch: 0.9, rate: 1.2 });
    }
    onBlock(att, def) { this.trainNote(att, def, 0, true); }
    onDamage() {}
    onKOLand(f) {
      if (this.phase === 'fight' || this.phase === 'ko') this.koLanded = true;
    }

    // ------------------------------------------------------------ main update
    update() {
      // Netplay: a lockstep tick only runs once the peer's input for this frame has
      // arrived (or the runway covers it). While paused the tick clock is frozen.
      if (this.net) {
        if (this.paused || this.net.status !== 'fighting') return;
        if (!this.net.beginTick(this)) { this.netStalled = true; return; }
        this.netStalled = false;
      }
      // fighters read inputs every rendered frame (so presses are never lost during slow motion)
      this.p1.ctrl.update(this);
      this.p2.ctrl.update(this);
      this.p1.readInput();
      this.p2.readInput();
      const c = this.cam;
      this.camPrev = { x: c.x, y: c.y, z: c.z * (1 + c.punch) };
      if (this.paused) { this.snapshotAll(); this.slowing = false; return; }
      let steps = 1;
      this.slowing = this.slow.t > 0;
      if (this.slow.t > 0) {
        this.slow.t--;
        this.slow.acc += this.slow.rate;
        steps = Math.floor(this.slow.acc);
        this.slow.acc -= steps;
      }
      // only snapshot when the sim actually advances, so slow motion interpolates smoothly
      if (steps > 0) this.snapshotAll();
      for (let i = 0; i < steps; i++) this.step();
      JK.FX.update(steps > 0 ? 1 : 0.25);
      JK.FX.updateList(this.screenFx, 1);
      this.updateCamera();
      if (this.flash.a > 0) this.flash.a = Math.max(0, this.flash.a - this.flash.decay);
      if (this.negT > 0) this.negT--;
      if (this.dim.t > 0) this.dim.t--;
      if (this.cut) { this.cut.t++; if (this.cut.t > 60) this.cut = null; }
      for (let i = this.announces.length - 1; i >= 0; i--) { const a = this.announces[i]; a.t++; if (a.t > a.dur) this.announces.splice(i, 1); }
      if (this.hud.combo) { this.hud.combo.t++; if (this.hud.combo.t > 90) this.hud.combo = null; }
      this.hud.trail1 = JK.approach(this.hud.trail1, this.p1.hp, this.hud.trail1 > this.p1.hp + 1 && this.p1.state !== 'hitstun' && this.p1.state !== 'juggle' ? 6 : 0);
      this.hud.trail2 = JK.approach(this.hud.trail2, this.p2.hp, this.hud.trail2 > this.p2.hp + 1 && this.p2.state !== 'hitstun' && this.p2.state !== 'juggle' ? 6 : 0);
      if (this.hud.trail1 < this.p1.hp) this.hud.trail1 = this.p1.hp;
      if (this.hud.trail2 < this.p2.hp) this.hud.trail2 = this.p2.hp;
    }

    snapshotAll() {
      this.p1.snapshot();
      this.p2.snapshot();
      for (const p of this.projectiles) { p.px = p.x; p.py = p.y; }
    }

    step() {
      this.frame++;
      this.pt++;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        if (--this.timers[i].t <= 0) { const fn = this.timers[i].fn; this.timers.splice(i, 1); fn(); }
      }
      this.phaseLogic();
      if (this.domain) this.domainLogic();
      if (this.fin) { this.finisherLogic(); return; }
      if (this.sfz) {
        const z = this.sfz;
        z.t++;
        z.f.update();
        z.f.opp.updateAnim();
        this.pushApart(); // a lunging super must not pass through its frozen target
        if (z.t >= z.total || z.f.state !== 'move') this.sfz = null;
        return;
      }
      const frozen = this.domain && (this.domain.phase === 'cast' || this.domain.phase === 'clash' || this.domain.phase === 'expand');
      if (frozen) {
        const caster = this.domain.owner;
        caster.st++;
        caster.updateAnim();
        if (this.domain.phase === 'clash') this.domain.def.st++, this.domain.def.updateAnim();
        else this.domain.def.updateAnim();
        return;
      }
      this.p1.update();
      this.p2.update();
      this.pushApart();
      this.resolveHits();
      this.updateProjectiles();
      if (this.mode === 'training') this.trainingLogic();
    }

    phaseLogic() {
      const p1 = this.p1, p2 = this.p2;
      switch (this.phase) {
        case 'intro': {
          const I = this.intro;
          if (!I) { this.startRound(); break; }
          const t = this.pt;
          if (t === I.s1) { p1.setState('intro'); if (I.l1.clip) A.playClip(I.l1.clip); A.sfx('whooshHeavy'); }
          if (t === I.s2) { p2.setState('intro'); if (I.l2.clip) A.playClip(I.l2.clip); A.sfx('whooshHeavy'); }
          if (t === I.s3) { A.sfx('impact'); A.sfx('gong'); this.shake(14, 24); this.flashScreen('#ffffff', 0.7, 14); this.negT = 3; }
          if (t >= I.end || (!this.net && t > 15 && JK.Input.state.menu.confirm)) this.endIntro();
          break;
        }
        case 'roundstart':
          if (this.pt === 72) {
            this.announce('FIGHT!', { dur: 45, size: 150, glow: '#ffb020' });
            A.say('Fight!', { pitch: 0.5, rate: 1.1 });
            A.sfx('explosion', 0.5);
            this.shake(6, 10);
          }
          if (this.pt >= 76) { this.fighting = true; this.setPhase('fight'); }
          break;
        case 'fight': {
          if (this.fin) break; // finisher cinematic owns the match until it ends
          if (!this.domain || this.domain.phase === 'active') {
            if (this.mode !== 'training' && !this.finishPhase && !this.sfz && !this.cinematic) this.timer--;
          }
          // finish them
          if (!this.finishPhase) {
            for (const f of [p1, p2]) if (f.state === 'dizzy') this.startFinishThem(f.opp, f);
          } else this.finishThemLogic();
          const dead = [p1, p2].filter((f) => f.hp <= 0 && !f.dizzyPending && f.state !== 'dizzy');
          if (dead.length && !this.finishPhase) {
            this.fighting = false;
            this.koLanded = false;
            this.setPhase('ko');
            this.koWinner = dead.length === 2 ? null : dead[0].opp;
            this.slowmo(50, 0.3);
            this.shake(14, 20);
            this.flashScreen('#ffffff', 0.7, 12);
            A.sfx('ko');
            this.announce('K.O.', { dur: 110, size: 170, glow: '#ff1030', delay: 8 });
            A.say('K O', { pitch: 0.4, rate: 0.8 });
            this.endDomain(false);
          } else if (this.timer <= 0 && this.mode !== 'training') {
            this.fighting = false;
            this.setPhase('ko');
            this.koLanded = true;
            this.koWinner = p1.hp === p2.hp ? null : p1.hp > p2.hp ? p1 : p2;
            this.announce('TIME', { dur: 100, size: 150, glow: '#ffb020' });
            A.say('Time', { pitch: 0.5 });
            this.endDomain(false);
          }
          break;
        }
        case 'ko':
          if (this.pt > 130 && (this.koLanded || this.pt > 260)) {
            this.finishRound(this.koWinner);
          }
          break;
        case 'roundend':
          if (this.pt === 20 && this.roundWinner) {
            this.roundWinner.setState('win');
            const perfect = this.roundWinner.hp >= this.roundWinner.maxHp;
            this.announce(this.roundWinner.ch.short + ' WINS', { dur: 110, size: 96, sub: perfect ? 'FLAWLESS VICTORY' : '', glow: this.roundWinner.ch.color });
            A.say(this.roundWinner.ch.short.toLowerCase() + ' wins' + (perfect ? '. Flawless victory' : ''), { pitch: 0.5 });
          }
          if (this.pt === 20 && !this.roundWinner) this.announce('DRAW', { dur: 100, size: 120 });
          if (this.pt > 150) {
            if (p1.wins >= this.winsNeeded || p2.wins >= this.winsNeeded) this.endMatch();
            else { this.round++; this.resetRound(); this.startRound(); }
          }
          break;
        case 'matchend':
          break;
        default:
          break;
      }
    }

    finishRound(winner) {
      this.roundWinner = winner;
      if (winner) winner.wins++;
      else { const cap = this.winsNeeded - 1; this.p1.wins = Math.min(cap, this.p1.wins + 1); this.p2.wins = Math.min(cap, this.p2.wins + 1); }
      this.setPhase('roundend');
      for (const f of [this.p1, this.p2]) {
        if (f !== winner && f.state !== 'ko') { f.setState('ko'); }
      }
    }

    endMatch() {
      this.setPhase('matchend');
      const won = this.p1.wins >= this.winsNeeded;
      this.result = { winner: won ? 'p1' : 'p2', p1: this.p1.id, p2: this.p2.id };
      A.playMusic(won ? 'victory' : 'defeat', { restart: true });
      this.ended = true;
      if (this.opts.onEnd) this.later(80, () => this.opts.onEnd(this.result));
    }

    // ------------------------------------------------------------ Krushing Blow: an X-ray of the bone giving way
    krushingBlow(att, def, cx, cy, src) {
      this.slowmo(46, 0.22);
      this.negFlash(4);
      this.shake(24, 30);
      this.zoomPunch(0.18);
      this.flashScreen('#ffffff', 0.5, 8);
      A.sample('heavy_hit', 1); A.sfx('impact'); A.sfx('shatter');
      if (this.stats) { const k = att === this.p1 ? 'p1' : 'p2'; this.stats[k].krush = (this.stats[k].krush || 0) + 1; }
      const ox = cx - def.x, oy = cy - def.y;
      const zig = [[0, -34], [-7, -14], [6, -2], [-5, 12], [4, 34]];
      JK.FX.add({
        type: 'custom', layer: 'front', x: cx, y: cy, life: 64,
        u: (p) => { p.x = def.x + ox; p.y = def.y + oy; },
        d: (ctx, p, k) => {
          const r = 60 + JK.ease.outCubic(Math.min(1, k * 5)) * 46;
          const a = k < 0.8 ? 1 : (1 - k) / 0.2;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6,14,32,0.9)'; ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          ctx.clip();
          const sep = k > 0.1 ? Math.min(12, (k - 0.1) * 70) : 0;
          const bone = () => {
            ctx.fillStyle = '#e9edf5'; ctx.strokeStyle = '#7a86a0'; ctx.lineWidth = 2.5;
            ctx.beginPath(); JK.roundRect(ctx, -80, -11, 160, 22, 8); ctx.fill(); ctx.stroke();
            for (const [bx, by] of [[-84, -11], [-84, 11], [84, -11], [84, 11]]) { ctx.beginPath(); ctx.arc(bx, by, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(122,134,160,0.6)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-70, -4); ctx.lineTo(70, -4); ctx.stroke();
          };
          for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(-0.35);
            ctx.beginPath();
            ctx.moveTo(zig[0][0], zig[0][1] - 200);
            for (const [zx, zy] of zig) ctx.lineTo(zx, zy);
            ctx.lineTo(zig[zig.length - 1][0], 200);
            ctx.lineTo(side * 300, 200); ctx.lineTo(side * 300, -200);
            ctx.closePath();
            ctx.clip();
            ctx.translate(side * sep, side * sep * 0.25);
            ctx.rotate(side * sep * 0.012);
            bone();
            ctx.restore();
          }
          // the fracture line, with splinters
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(-0.35);
          ctx.strokeStyle = '#05080f'; ctx.lineWidth = 3 + sep * 0.4;
          ctx.beginPath(); zig.forEach(([zx, zy], i) => (i ? ctx.lineTo(zx, zy * 0.5) : ctx.moveTo(zx, zy * 0.5))); ctx.stroke();
          ctx.strokeStyle = '#ff4050'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-18, -20); ctx.moveTo(4, 6); ctx.lineTo(20, 18); ctx.moveTo(-2, 10); ctx.lineTo(-14, 22); ctx.stroke();
          ctx.restore();
          if (k > 0.1 && k < 0.5) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 6; i++) { const an = Math.random() * Math.PI * 2; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(p.x + Math.cos(an) * 20, p.y + Math.sin(an) * 20, 3, 3); }
          }
          ctx.restore();
        },
      });
      JK.FX.text(def.x, def.y - 310, 'KRUSHING BLOW', { size: 70, font: JK.FONT_TITLE, color: '#ffffff', strokeW: 10, life: 90, vy: -0.12 });
      void src;
    }

    // ------------------------------------------------------------ Hakari: Idle Death Gamble + Jackpot
    hakariUse(f) {
      const d = this.domain;
      if (!d || !d.hk || d.hk.spin || d.jackpot) return;
      const H = d.hk;
      H.uses++;
      A.sfx('select');
      JK.FX.text(f.x, f.y - 280, 'BALL IN  ' + H.uses + ' / 2', { size: 28, font: JK.FONT_TITLE, color: '#ffd23a', life: 36 });
      if (H.uses < 2) {
        // keep the other button ready so the second ball can go in quickly
        for (const k of ['t1', 't2']) f.cd[k] = Math.min(f.cd[k] || 0, 20);
        return;
      }
      H.uses = 0;
      // both techniques cool down for a long time before the next spin can be started
      for (const k of ['t1', 't2']) { f.cd[k] = 330; (f.cdMax || (f.cdMax = {}))[k] = 330; }
      this.startSpin(d);
    }
    startSpin(d) {
      const H = d.hk;
      const heat = H.heat;
      const reach = JK.simRandom() < 0.6 + heat * 0.1 - (d.simple ? 0.2 : 0);
      let color = null, jackpot = false;
      if (reach) {
        const r = JK.simRandom();
        const rb = 0.04 + heat * 0.03, gd = 0.16 + heat * 0.07, rd = 0.35;
        color = r < rb ? 'rainbow' : r < rb + gd ? 'gold' : r < rb + gd + rd ? 'red' : 'green';
        jackpot = JK.simRandom() < { rainbow: 1, gold: 0.6, red: 0.33, green: 0.15 }[color];
      }
      if (JK.debug && JK.debug.forceJackpot !== undefined) { jackpot = JK.debug.forceJackpot; color = jackpot ? 'rainbow' : 'green'; }
      const n = JK.simRandi(1, 7);
      const reels = jackpot ? [color === 'rainbow' ? 7 : n, 0, 0] : reach ? [n, n, (n % 7) + 1] : [n, (n % 7) + 1, ((n + 2) % 7) + 1];
      if (jackpot) reels[1] = reels[2] = reels[0];
      H.spin = { t: 0, reach: reach || jackpot, color, jackpot, reels, stops: [34, 62, reach || jackpot ? 196 : 92] };
      H.spins++;
      if (!A.sample('slot_spin', 0.7)) A.sfx('riser', 0.9);
      this.announce('SPIN!', { dur: 40, size: 70, glow: '#ffd23a' });
    }
    hakariLogic(d, alive) {
      const H = d.hk, f = d.owner;
      if (d.jackpot) { this.jackpotCelebration(d); return; }
      // the machine's sure-hit: a shower of golden balls every so often
      if (alive && d.t % 160 === 80) {
        const sk = d.simple ? 0.4 : 1;
        for (let i = 0; i < 3; i++) {
          this.projectiles.push(new JK.Projectile({
            owner: f, kind: 'pachinko', gold: true, r: 14, x: d.def.x + (i - 1) * 50, y: -760 - i * 90, w: 60, h: 60, vx: 0, vy: 15, life: 70, dmg: 10 * sk, kb: 2, hitstun: 10, hitstop: 3, power: 1,
            level: 'unblockable', sureHit: true, sparkColor: '#ffd23a', prio: 0, dir: f.facing,
            u: (p, g2) => { p.y += p.vy; if (p.y > -20) p.kill(g2); },
            d: (ctx, p) => { JK.drawGlow(ctx, '#ffd23a', p.x, p.y, 40, 0.5); ctx.fillStyle = '#ffe89a'; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6a4a08'; ctx.lineWidth = 2; ctx.stroke(); },
          }));
        }
      }
      const S = H.spin;
      if (!S) return;
      S.t++;
      if (S.t === S.stops[0] || S.t === S.stops[1]) { A.sfx('rim'); A.sfx('clap'); }
      if (S.reach && S.t === S.stops[1] + 2) {
        const col = JK.HOLD_COLORS[S.color] || '#ffffff';
        this.announce('REACH!', { dur: 60, size: 110, glow: col, sub: JK.HAKARI_SCEN[H.scen] + ' RIICHI' });
        this.flashScreen(col, 0.3, 12);
        A.sfx('riser', 2.2);
        this.shake(6, 10);
      }
      if (S.reach && S.t > S.stops[1] && S.t < S.stops[2] && S.t % 30 === 0) A.sfx('heartbeat', 0.8 + S.t / 200);
      if (S.t === S.stops[2]) {
        A.sfx('rim'); A.sfx('clap');
        if (S.jackpot) {
          d.jackpot = { t: 0 };
        } else {
          H.scen = (H.scen + 1) % JK.HAKARI_SCEN.length;
          H.heat = Math.min(3, H.heat + 1);
          d.bg.scenario = H.scen;
          this.announce(S.reach ? 'SO CLOSE...' : 'NO LUCK', { dur: 60, size: 64, glow: '#888888', sub: 'SCENARIO SHIFT: ' + JK.HAKARI_SCEN[H.scen] });
          A.sfx('deny', 1);
        }
      }
      if (S.t > S.stops[2] + 60) H.spin = null;
    }
    jackpotCelebration(d) {
      const J = d.jackpot, f = d.owner;
      J.t++;
      const t = J.t;
      if (t === 1) {
        this.cinematic = true;
        f.move = null; f.setState('scripted');
        A.stopMusic(0.2);
        if (!A.sample('jackpot', 1)) { A.sfx('bell'); A.sfx('gong'); }
        A.sfx('explosion', 1.4);
        this.negT = 4;
        this.flashScreen('#ffd23a', 0.9, 24);
        this.shake(20, 30);
        this.announce('JACKPOT!!', { dur: 110, size: 150, glow: '#2aff7a', color: '#ffe89a', sub: '7 · 7 · 7' });
      }
      f.scriptPose = JK.Rig.sample(f.ch.winAnim, t);
      f.scriptBlend = 0.4;
      if (t % 2 === 0) {
        for (let i = 0; i < 3; i++) JK.FX.add({ type: 'dot', x: this.cam.x + (Math.random() - 0.5) * 1400, y: -760, vx: (Math.random() - 0.5) * 2, vy: 9 + Math.random() * 6, drag: 1, r: 10 + Math.random() * 8, color: JK.pick(['#ffd23a', '#ffe89a', '#2aff7a', '#ffffff']), life: 90 });
      }
      if (t % 20 === 10) { JK.FX.add({ type: 'ring', x: f.x, y: f.y - 120, r0: 20, r1: 260, w: 10, color: t % 40 ? '#2aff7a' : '#ffd23a', life: 18 }); this.shake(5, 6); }
      if (t === 110) {
        this.endDomain(false);
        this.startJackpot(f);
      }
    }
    startJackpot(f) {
      f.jpT = 2400; // 40 seconds
      f.burnout = 0;
      f.move = null;
      f.setState('idle');
      for (const k in f.cd) f.cd[k] = 0;
      this.cinematic = false;
      A.playMusic('jackpot', { restart: true, fadeIn: 0.2 });
      this.jackpotMusic = true;
      this.announce('JACKPOT', { dur: 120, size: 120, glow: '#2aff7a', sub: 'INFINITE CURSED ENERGY · AUTOMATIC REVERSE CURSED TECHNIQUE' });
      this.flashScreen('#9dffc4', 0.6, 16);
      this.shake(16, 24);
      for (let i = 0; i < 4; i++) JK.FX.add({ type: 'ring', x: f.x, y: f.y - 120, r0: 20, r1: 260 + i * 120, w: 14 - i * 3, color: i % 2 ? '#ffffff' : '#2aff7a', life: 20 + i * 6 });
      JK.FX.add({
        type: 'custom', layer: 'back', x: f.x, y: 0, life: 50,
        d: (ctx, p, k) => {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const w = 140 * (1 - k) + 20;
          const gr = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
          gr.addColorStop(0, 'rgba(42,255,122,0)'); gr.addColorStop(0.5, `rgba(200,255,220,${0.8 * (1 - k)})`); gr.addColorStop(1, 'rgba(42,255,122,0)');
          ctx.fillStyle = gr; ctx.fillRect(p.x - w, -1400, w * 2, 1400);
          ctx.restore();
        },
      });
    }
    endJackpot(f, silent) {
      f.jpT = 0;
      if (this.jackpotMusic) {
        this.jackpotMusic = false;
        if (!silent && this.phase === 'fight' && !this.domain && !this.finishPhase && !this.fin) A.playMusic(this.stage.music, { restart: true, fadeIn: 1.5 });
      }
      if (!silent && f.hp > 0) {
        JK.FX.text(f.x, f.y - 280, 'JACKPOT OVER', { size: 34, font: JK.FONT_TITLE, color: '#9dffc4', life: 50 });
        JK.FX.add({ type: 'ring', x: f.x, y: f.y - 120, r0: 200, r1: 10, w: 6, color: '#2aff7a', life: 18 });
      }
    }
    drawSlots(ctx, d) {
      const H = d.hk, S = H.spin;
      const cx = W / 2, cy = 236;
      const col = S && S.reach && S.t > S.stops[1] ? JK.HOLD_COLORS[S.color] || '#ffffff' : '#ffd23a';
      ctx.save();
      ctx.fillStyle = 'rgba(6,10,8,0.82)';
      ctx.beginPath(); JK.roundRect(ctx, cx - 170, cy - 48, 340, 112, 12); ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = S && S.color === 'rainbow' && S.t > S.stops[1] ? `hsl(${(this.frame * 12) % 360},100%,65%)` : col;
      ctx.stroke();
      if (S && S.reach && S.t > S.stops[1] && S.t < S.stops[2]) JK.drawGlow(ctx, col, cx, cy, 240, 0.25 + Math.sin(this.frame * 0.4) * 0.1);
      for (let i = 0; i < 3; i++) {
        const x = cx - 100 + i * 100, y = cy;
        ctx.fillStyle = '#f4f0e0';
        ctx.fillRect(x - 38, y - 34, 76, 68);
        ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 3; ctx.strokeRect(x - 38, y - 34, 76, 68);
        let digit, spinning = false;
        if (!S) digit = H.last ? H.last[i] : i + 1;
        else if (S.t >= S.stops[i]) digit = S.reels[i];
        else { spinning = true; digit = ((Math.floor(this.frame * (i === 2 && S.reach && S.t > S.stops[1] ? 0.25 : 0.7)) + i * 3) % 7) + 1; }
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 38, y - 34, 76, 68); ctx.clip();
        const off = spinning ? (this.frame * 9) % 30 - 15 : 0;
        JK.text(ctx, String(digit), x, y + 4 + off, { size: 58, color: digit === 7 ? '#e02030' : '#1a1a1a', font: JK.FONT_TITLE });
        if (spinning) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 38, y - 30 + ((this.frame * 7 + k * 17) % 64), 76, 3); }
        ctx.restore();
      }
      if (S && S.t >= S.stops[2]) H.last = S.reels;
      // ball counter + scenario
      const uses = H.uses;
      JK.text(ctx, S ? (S.reach && S.t > S.stops[1] ? 'REACH · ' + (S.color || '').toUpperCase() + ' HOLD' : 'SPINNING...') : 'BALLS  ' + '●'.repeat(uses) + '○'.repeat(2 - uses) + '   (U / I)', cx, cy + 50, { size: 17, font: JK.FONT_UI, color: col, stroke: '#000', strokeW: 3, weight: 'bold' });
      JK.text(ctx, 'SCENARIO: ' + JK.HAKARI_SCEN[H.scen] + (H.heat ? '   HEAT ' + '▲'.repeat(H.heat) : ''), cx, cy - 60, { size: 16, font: JK.FONT_UI, color: '#d8ffe8', stroke: '#000', strokeW: 3, weight: 'bold' });
      ctx.restore();
    }
    // Yuta's domain: katanas burst out of the ground under the target
    katanaStrike(caster, def, dmg) {
      const x = def.x + def.vx * 8;
      this.projectiles.push(new JK.Projectile({
        owner: caster, kind: 'katana', x, y: -110, w: 70, h: 220, vx: 0, life: 40, from: 12, to: 15, dmg, level: 'unblockable', sureHit: true,
        kb: 3, hitstun: 16, hitstop: 6, power: 2, sparkColor: '#b8a8ff', slashFx: true, sfx: 'slash', launch: true, launchVy: -9, airKb: 2, prio: 0, persist: true, dir: caster.facing, seed: Math.random() * 6,
        u: (p) => { if (p.t === p.from) { A.sfx('slash', true); JK.FX.dust(p.x, 0, 0, 4); } },
        d: (ctx, p) => {
          if (p.t < p.from) {
            ctx.strokeStyle = `rgba(184,168,255,${p.t / p.from})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(p.x, 0, 40, 8, 0, 0, Math.PI * 2); ctx.stroke();
            return;
          }
          const age = p.t - p.from;
          const h = Math.min(1, age / 3) * 230;
          const a = p.t > p.life - 10 ? (p.life - p.t) / 10 : 1;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(p.x, 0);
          ctx.rotate(Math.sin(p.seed) * 0.15);
          JK.drawGlow(ctx, '#b8a8ff', 0, -h / 2, 90, 0.4);
          ctx.fillStyle = '#e6eaf4'; ctx.strokeStyle = '#1c1a28'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6, -h + 20); ctx.lineTo(0, -h); ctx.lineTo(6, -h + 24); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        },
      }));
    }

    // ------------------------------------------------------------ finish them / finishers
    startFinishThem(winner, loser) {
      this.finishPhase = { winner, loser, t: 0 };
      loser.invuln = 50;
      this.projectiles.length = 0;
      this.endDomain(false);
      this.announce('FINISH THEM!', { dur: 120, size: 120, glow: '#ff1030' });
      A.say('Finish them!', { pitch: 0.35, rate: 0.85 });
      A.duckMusic(0.3, 3);
    }
    finishThemLogic() {
      const fp = this.finishPhase;
      fp.t++;
      const w = fp.winner, l = fp.loser;
      if (l.state !== 'dizzy') {
        // finished normally with a hit
        if (l.hp <= 0 && l.state === 'ko') {
          this.finishPhase = null;
        }
        return;
      }
      if (w.pressed('domain') && w.actionable() && Math.abs(w.x - l.x) < 320) {
        w.consume('domain');
        this.startFinisher(w, l);
        return;
      }
      if (fp.t > 330) {
        l.setState('ko');
        l.dead = true;
        this.finishPhase = null;
        this.fighting = false;
        this.koLanded = true;
        this.koWinner = w;
        this.setPhase('ko');
        this.pt = 100;
      }
    }
    startFinisher(w, l) {
      this.fin = { w, l, t: 0 };
      this.finishPhase = null;
      this.announces.length = 0;
      this.cinematic = true;
      this.fighting = false;
      w.setState('scripted');
      l.setState('dizzy');
      w.faceOpp();
      l.facing = -w.facing;
      A.stopMusic(0.6);
      A.sfx('domain');
      this.projectiles.length = 0;
    }
    finisherLogic() {
      const F = this.fin;
      F.t++;
      const { w, l } = F;
      const t = F.t;
      const P = JK.Rig.P;
      w.st++; l.st++;
      w.updateAnim(); l.updateAnim();
      const hand = () => ({ x: w.x + w.J.haF.x * w.facing, y: w.y + w.J.haF.y });
      if (w.id === 'gojo') {
        if (t === 1) {
          w.eyesOpen = true;
          this.dimScreen(160, 0.6);
          F.clip = JK.settings.ost !== false && A.playClip('hollow_purple', { offset: 0 });
          if (!F.clip) A.say('Hollow purple', { pitch: 0.7, rate: 0.85 });
        }
        if (t < 108) {
          w.scriptPose = t < 80 ? P({ y: -108, lean: -4, head: -12, hF: [50, -44], hB: [-50, -40], gF: 'point', gB: 'point', fF: [26, 0], fB: [-26, 0] }) : P({ y: -106, lean: 2, head: -4, hF: [44, -24], hB: [36, -22], gF: 'point', gB: 'point', fF: [22, 0], fB: [-22, 0] });
          const h = hand();
          JK.FX.add({ type: 'dot', x: h.x - w.facing * 20, y: h.y, vx: 0, vy: 0, r: 30 + t * 0.6, color: t < 80 ? '#3f7bff' : '#a040ff', life: 4 });
          JK.FX.add({ type: 'dot', x: h.x + w.facing * 10, y: h.y, vx: 0, vy: 0, r: 30 + t * 0.6, color: t < 80 ? '#ff2a2a' : '#a040ff', life: 4 });
          if (t === 20 && !F.clip) A.sfx('purpleCharge');
          if (t === 30) JK.FX.text(w.x, w.y - 300, '虚式「茈」', { size: 70, color: '#d8a0ff', life: 80 });
        }
        if (t === 108) {
          this.negT = 5;
          A.sfx('impact');
          w.scriptPose = P({ y: -102, x: 10, lean: 14, head: -2, hF: [84, -18], hB: [-10, 20], gF: 'point', gB: 'open', fF: [38, 0], fB: [-24, 0] });
          A.sfx(F.clip ? 'explosion' : 'purple', 0.8);
          this.shake(20, 50);
          this.flashScreen('#e8c0ff', 0.8, 20);
          const h = hand();
          F.orb = { x: h.x, y: w.y - 140, r: 10 };
        }
        if (F.orb) {
          F.orb.x += w.facing * 14; F.orb.r = Math.min(170, F.orb.r + 10);
          JK.FX.add({ type: 'custom', x: 0, y: 0, life: 2, d: (ctx) => { JK.drawGlow(ctx, '#7a1cff', F.orb.x, F.orb.y, F.orb.r * 3, 0.9); const g = ctx.createRadialGradient(F.orb.x, F.orb.y, 1, F.orb.x, F.orb.y, F.orb.r); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#d8a8ff'); g.addColorStop(1, '#5a10b0'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(F.orb.x, F.orb.y, F.orb.r, 0, Math.PI * 2); ctx.fill(); } });
          if (!l.finishFx && Math.abs(F.orb.x - l.x) < F.orb.r) l.finishFx = { type: 'disintegrate', t: 0, color: '#b060ff', dir: w.facing };
          if (t % 3 === 0) JK.FX.debris(F.orb.x, 0, 2, '#3a3448');
        }
      } else if (w.id === 'sukuna') {
        if (t === 1) { this.dimScreen(200, 0.5); A.say('World cutting slash', { pitch: 0.2, rate: 0.8 }); }
        w.scriptPose = t < 50 ? P({ y: -106, lean: -4, head: -8, hF: [20, -90], gF: 'open', hB: [10, 46], gB: 'open', fF: [26, 0], fB: [-26, 0] })
          : P({ y: -100, x: 12, lean: 20, head: 4, hF: [80, 40], gF: 'open', hB: [0, 46], gB: 'open', fF: [40, 0], fB: [-26, 0] });
        if (t === 20) JK.FX.text(w.x, w.y - 300, '世界を断つ斬撃', { size: 58, color: '#ff4050', life: 90 });
        if (t === 50) {
          A.sfx('slash', true); A.sfx('gong');
          this.flashScreen('#ffffff', 1, 30);
          this.shake(10, 20);
          const cx = l.x, cy = l.y - 120;
          JK.FX.add({ type: 'cut', x1: cx - 1400, y1: cy - 500, x2: cx + 1400, y2: cy + 500, w: 8, color: '#ff3040', life: 120 });
          F.cutAng = Math.atan2(1000, 2800);
        }
        if (t === 95) { l.finishFx = { type: 'split', t: 0, ang: F.cutAng, cy: -120 }; A.sfx('ko'); }
      } else if (w.id === 'yuji') {
        if (t === 1) { this.dimScreen(180, 0.45); }
        const hitT = [30, 50, 70, 92];
        if (t < 26) w.scriptPose = w.poses.crouch;
        else if (t < 110) {
          const k = Math.floor((t - 26) / 10) % 2;
          w.scriptPose = k ? P({ y: -100, x: 16, lean: 20, tw: -4, hF: [20, 6], hB: [88, -16], fF: [48, 0], fB: [-28, 0] }) : P({ y: -100, x: 16, lean: 20, hF: [88, -20], hB: [16, 6], fF: [48, 0], fB: [-28, 0] });
        } else w.scriptPose = P({ y: -120, x: 14, lean: -8, head: -14, hF: [28, -92], hB: [10, 12], fF: [34, -4], fB: [-20, 0] });
        if (t === 26) { w.x = l.x - w.facing * 110; w.ghostT = 10; A.sfx('dash'); }
        if (hitT.includes(t)) {
          JK.FX.blackFlash(l.x, l.y - 140, w.facing, t !== hitT[0]);
          A.sfx('blackFlash');
          this.shake(14, 12);
          this.flashScreen('#000', 0.5, 6);
          l.flashT = 4; l.flashColor = '#ff2040';
          l.x += w.facing * 10;
          if (t === 30) A.say('Black flash', { pitch: 0.9, rate: 1.1 });
        }
        if (t === 112) { l.finishFx = { type: 'launch', t: 0, dir: w.facing }; A.sfx('explosion', 1.5); this.shake(20, 20); JK.FX.shockwave(l.x, 0, '#ff3040', 1.5); }
      } else if (w.id === 'jogo') {
        // Maximum: Meteor crushes and incinerates the dazed opponent
        if (t === 1) { this.dimScreen(180, 0.5); A.sfx('charge', 120, 0.8); }
        w.scriptPose = P({ y: -110, lean: -10, head: -18, hF: [40, -84], hB: [30, -80], gF: 'open', gB: 'open', fF: [24, 0], fB: [-24, 0] });
        if (t === 12) JK.FX.text(w.x, w.y - 300, '極ノ番「隕」', { size: 64, color: '#ffb060', life: 80 });
        if (t < 40 && t % 2 === 0) JK.FX.add({ type: 'flame', x: w.x + (Math.random() - 0.5) * 50, y: w.y - 260, vx: 0, vy: -2, r: 22, life: 20 });
        if (t === 30) { F.met = { kind: 'meteor', x: l.x - w.facing * 260, y: -1300, vx: w.facing * 5.2, vy: 12, r: 150, t: 0, landed: false }; A.sfx('whooshHeavy'); }
        if (F.met && !F.met.landed) {
          const m = F.met;
          m.t++; m.vy += 0.8; m.x += m.vx; m.y += m.vy;
          JK.FX.add({ type: 'custom', x: 0, y: 0, life: 2, d: (ctx) => JK.drawMeteor(ctx, m) });
          if (m.t % 2 === 0) JK.FX.add({ type: 'flame', x: m.x, y: m.y - m.r * 0.5, vx: -m.vx, vy: -4, r: 46, life: 20 });
          if (m.y >= -140) {
            m.landed = true;
            A.sfx('explosion', 2); A.sfx('fire');
            this.shake(26, 40);
            this.flashScreen('#ffc070', 0.9, 24);
            JK.FX.explosion(l.x, -90, 2.6, '#ff6a1a');
            JK.FX.shockwave(l.x, 0, '#ffb060', 2.4);
            JK.FX.debris(l.x, 0, 30, '#4a3a30');
            l.finishFx = { type: 'disintegrate', t: 0, dir: w.facing, colors: ['#ff7a1a', '#ffd070', '#3a1a10'] };
          }
        }
      } else if (w.id === 'higuruma') {
        // Deadly Sentencing, abridged: the court convenes in the dark, Judgeman passes sentence,
        // a pillar of light delivers the golden Executioner's Sword, and the sentence is carried out.
        if (t === 1) {
          F.bg = JK.getDomain('deadly_sentencing');
          F.bg.verdict = null; F.bg.tilt = 0; F.bgA = 0;
          A.sfx('domain'); A.sfx('impact');
          this.negT = 3; this.shake(10, 14);
        }
        F.bgA = Math.min(1, F.bgA + 0.05);
        const bg = F.bg;
        bg.speaking = t > 14 && t < 44;
        bg.tilt = Math.min(1, t / 50);
        const gavelUp = P({ y: -106, lean: -2, head: -8, hF: [30, -50], hB: [30, -10], gB: 'open', fF: [24, 0], fB: [-24, 0], wa: -10, ws: 1.5 });
        const gavelDown = P({ y: -104, lean: 10, head: 0, hF: [44, 6], hB: [30, -10], gB: 'open', fF: [24, 0], fB: [-24, 0], wa: 40, ws: 1.5 });
        const swordUp = P({ y: -110, lean: -10, head: -14, hF: [-8, -76], hB: [12, -62], gB: 'open', fF: [26, 0], fB: [-28, 0], wa: -10 });
        const follow = P({ y: -88, x: 20, lean: 40, head: 12, hF: [72, 62], hB: [-44, 8], gB: 'open', fF: [64, 0], fB: [-34, 0], wa: -20 });
        w.scriptPose = t < 40 ? gavelUp : t < 58 ? gavelDown : t < 120 ? swordUp : follow;
        if (t === 16) this.announce('JUDGEMAN: THE DEFENDANT IS FOUND GUILTY', { dur: 40, size: 32, glow: '#b39cff' });
        if (t === 42) {
          // the gavel falls
          A.sfx('gong'); A.sample('gavel', 1);
          this.shake(16, 18); this.negT = 2;
          bg.verdict = { jp: '死刑', color: '#ffffff' };
          this.announce('DEATH PENALTY', { dur: 70, size: 110, glow: '#ffd21a' });
          JK.FX.shockwave(w.x + w.facing * 60, 0, '#b39cff', 1.2);
        }
        if (t >= 60 && t < 120) {
          const h = hand();
          if (t === 60) { w.swordT = 400; A.sfx('riser', 1.1); A.sample('sword_manifest', 1); }
          // a pillar of golden light pours into Higuruma's hand
          const k = 1 - (t - 60) / 60;
          JK.FX.add({
            type: 'custom', x: 0, y: 0, life: 2, layer: 'back',
            d: (ctx) => {
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const bw = 14 + 50 * k;
              const g = ctx.createLinearGradient(h.x - bw, 0, h.x + bw, 0);
              g.addColorStop(0, 'rgba(255,210,26,0)'); g.addColorStop(0.5, `rgba(255,240,160,${0.75 * k + 0.2})`); g.addColorStop(1, 'rgba(255,210,26,0)');
              ctx.fillStyle = g;
              ctx.fillRect(h.x - bw, -1200, bw * 2, h.y + 1200);
              ctx.restore();
              JK.drawGlow(ctx, '#ffd21a', h.x, h.y, 160 + 60 * Math.sin(t * 0.4), 0.7);
            },
          });
          if (t % 2 === 0) JK.FX.add({ type: 'spark', x: h.x + (Math.random() - 0.5) * 80, y: h.y + 40, vx: 0, vy: -6 - Math.random() * 6, len: 22, w: 2, color: '#ffd21a', life: 16 });
          if (t % 20 === 0) this.shake(4, 8);
        }
        if (t === 120) {
          // the cut: he passes straight through them
          const from = w.x;
          w.x = l.x + w.facing * 170; w.ghostT = 16;
          A.sample('execution', 1); A.sfx('slash', true);
          this.negT = 6;
          this.flashScreen('#ffe680', 1, 30);
          this.shake(20, 28);
          this.zoomPunch(0.15);
          const cy = l.y - 120;
          F.cutAng = 0.32;
          JK.FX.add({ type: 'cut', x1: l.x - Math.cos(F.cutAng) * 1100, y1: cy - Math.sin(F.cutAng) * 1100, x2: l.x + Math.cos(F.cutAng) * 1100, y2: cy + Math.sin(F.cutAng) * 1100, w: 10, color: '#ffd21a', life: 130 });
          JK.FX.add({ type: 'cut', x1: l.x - 900, y1: cy - 290, x2: l.x + 900, y2: cy + 290, w: 3, color: '#ffffff', life: 130 });
          JK.FX.add({ type: 'custom', x: 0, y: 0, life: 24, d: (ctx, p, k) => {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(255,220,80,${1 - k})`; ctx.lineWidth = 40 * (1 - k);
            ctx.beginPath(); ctx.moveTo(from, l.y - 130); ctx.lineTo(from + (w.x - from) * Math.min(1, k * 4), l.y - 130); ctx.stroke();
            ctx.restore();
          } });
          JK.FX.text(l.x, l.y - 320, '死刑執行', { size: 96, color: '#ffe680', life: 120, vy: -0.1 });
        }
        if (t === 150) {
          l.finishFx = { type: 'split', t: 0, ang: F.cutAng, cy: -120, glow: '#ffd21a' };
          A.sfx('ko'); A.sfx('shatter');
          for (let i = 0; i < 40; i++) JK.FX.add({ type: 'dot', x: l.x + (Math.random() - 0.5) * 80, y: l.y - 60 - Math.random() * 140, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 5, r: 8 + Math.random() * 14, color: JK.pick(['#ffd21a', '#fff4a0', '#ffffff']), life: 50 });
        }
      } else if (w.id === 'nanami') {
        // a critical 7:3 strike, then the building collapses on them
        if (t === 1) { this.dimScreen(200, 0.5); w.loose = true; }
        if (t === 8) { JK.ratioMark(l, 60); JK.FX.text(w.x, w.y - 320, '十劃呪法', { size: 56, color: '#ffcf80', life: 70 }); }
        w.scriptPose = t < 50 ? P({ y: -104, x: -4, lean: -6, head: -6, hF: [-4, -60], hB: [20, 10], gB: 'open', fF: [26, 0], fB: [-30, 0], wa: -40 })
          : P({ y: -98, x: 14, lean: 24, head: 2, hF: [80, 24], hB: [0, 20], gB: 'open', fF: [48, 0], fB: [-28, 0], wa: -20 });
        if (t === 50) {
          w.x = l.x - w.facing * 120; w.ghostT = 10;
          A.sfx('dash'); A.sfx('slash', true); A.sfx('impact');
          this.negT = 3; this.shake(14, 16); this.flashScreen('#ffcf80', 0.6, 12);
          l.flashT = 5; l.flashColor = '#ffae42';
          JK.FX.add({ type: 'cut', x1: l.x - 200, y1: l.y - 60, x2: l.x + 200, y2: l.y - 260, w: 6, color: '#ffcf80', life: 30 });
          JK.FX.text(l.x, l.y - 290, 'CRITICAL', { size: 44, font: JK.FONT_TITLE, color: '#ffcf80', life: 40 });
        }
        if (t === 80) { JK.FX.text(l.x, l.y - 330, '瓦落瓦落', { size: 76, color: '#ffcf80', life: 90 }); A.sfx('explosion', 1.6); this.shake(22, 60); JK.FX.shockwave(l.x, 0, '#ffcf80', 2); }
        if (t >= 80 && t < 150 && t % 3 === 0) JK.FX.add({ type: 'debris', x: l.x + (Math.random() - 0.5) * 360, y: -700, vx: (Math.random() - 0.5) * 3, vy: 8, r: 8 + Math.random() * 14, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, color: JK.pick(['#6e655e', '#8a8078', '#4a4440']), life: 70 });
        if (t === 96) { l.finishFx = { type: 'sink', t: 0 }; A.sfx('bodyfall'); JK.FX.debris(l.x, 0, 30, '#6e655e'); }
      } else if (w.id === 'yuta') {
        // Rika manifests fully, snatches the opponent out of the air, and Pure Love erases them
        if (t === 1) { this.dimScreen(230, 0.55); JK.Audio.say('Rika.', { pitch: 0.85, rate: 0.9 }); F.rika = 0; A.sample('rika', 0.9); }
        F.rika = Math.min(1, F.rika + 0.04);
        const reach = JK.clamp((t - 40) / 18, 0, 1);
        JK.FX.add({ type: 'custom', layer: 'back', x: 0, y: 0, life: 2, d: (ctx) => JK.drawRika(ctx, w.x - w.facing * 150, 0, 1.25, w.facing, t, F.rika, reach) });
        w.scriptPose = t < 96 ? P({ y: -104, lean: 2, head: -6, hF: [30, 10], hB: [18, 16], gB: 'open', fF: [26, 0], fB: [-26, 0], wa: -30 })
          : P({ y: -100, x: 8, lean: 12, head: -4, hF: [86, -30], hB: [70, -26], gF: 'open', gB: 'open', fF: [40, 0], fB: [-30, 0], wv: 0 });
        if (t === 16) JK.FX.text(w.x, w.y - 320, '里香', { size: 90, color: '#ff9ac8', life: 80 });
        if (t >= 56 && t < 170) {
          // caught in Rika's claws and hoisted up
          l.y = Math.max(-50, l.y - 3);
          l.x += (w.x + w.facing * 250 - l.x) * 0.12;
          if (t === 56) { A.sfx('hit', 3); this.shake(10, 12); }
        }
        if (t === 96) { JK.Audio.say('Pure love.', { pitch: 0.8, rate: 0.85 }); A.sfx('riser', 0.8); }
        if (t === 118) {
          A.sfx('explosion', 1.8); A.sfx('impact');
          this.negT = 5; this.shake(26, 50); this.zoomPunch(0.14); this.flashScreen('#ffd8ec', 0.9, 20);
          const hx = w.x + w.facing * 90, hy = w.y - 165;
          JK.FX.add({ type: 'custom', layer: 'front', x: 0, y: 0, life: 70, d: (ctx, p, k) => JK.drawPureLoveBeam(ctx, { t: k * 70, life: 70, x0: hx, dir: w.facing, y: hy }) });
          JK.FX.text(w.x, w.y - 330, '純愛砲', { size: 84, color: '#ffd8ec', life: 90 });
        }
        if (t === 124) l.finishFx = { type: 'disintegrate', t: 0, dir: w.facing, colors: ['#ff9ac8', '#ffffff', '#a898ff'] };
      } else if (w.id === 'hakari') {
        // the reels line up 7-7-7 and Hakari cashes in on the opponent
        if (t === 1) { this.dimScreen(230, 0.5); A.sfx('riser', 1.2); A.sample('slot_spin', 0.8); }
        const stops = [26, 40, 64];
        const mx = (w.x + l.x) / 2;
        if (t < 150) {
          JK.FX.add({
            type: 'custom', layer: 'front', x: 0, y: 0, life: 2,
            d: (ctx) => {
              ctx.save();
              ctx.fillStyle = 'rgba(6,10,8,0.85)'; ctx.fillRect(mx - 190, -470, 380, 130);
              ctx.strokeStyle = t >= 64 ? `hsl(${(t * 14) % 360},100%,65%)` : '#ffd23a'; ctx.lineWidth = 5; ctx.strokeRect(mx - 190, -470, 380, 130);
              for (let i = 0; i < 3; i++) {
                const x = mx - 115 + i * 115;
                ctx.fillStyle = '#f4f0e0'; ctx.fillRect(x - 46, -452, 92, 94);
                const dgt = t >= stops[i] ? 7 : ((Math.floor(t * 0.8) + i * 3) % 7) + 1;
                JK.text(ctx, String(dgt), x, -402, { size: 76, color: dgt === 7 ? '#e02030' : '#1a1a1a', font: JK.FONT_TITLE });
              }
              ctx.restore();
            },
          });
        }
        if (stops.includes(t)) { A.sfx('rim'); A.sfx('clap'); }
        if (t === 64) {
          A.sample('jackpot', 1) || A.sfx('bell');
          this.negT = 3; this.flashScreen('#ffd23a', 0.8, 20); this.shake(16, 20);
          this.announce('JACKPOT', { dur: 80, size: 130, glow: '#2aff7a', color: '#ffe89a' });
          w.jpT = 400;
        }
        w.scriptPose = t < 100 ? JK.Rig.sample(w.ch.winAnim, t) : t < 112 ? P(w.poses.crouch, { hF: [30, 30] })
          : P({ y: -122, x: 10, lean: -10, head: -14, hF: [28, -96], hB: [-6, 26], gB: 'open', fF: [30, -8], fB: [-16, 0], aF: 20 });
        if (t === 100) { w.x = l.x - w.facing * 80; w.ghostT = 12; A.sfx('dash'); }
        if (t === 112) {
          A.sfx('explosion', 2); A.sfx('impact');
          this.negT = 4; this.shake(28, 40); this.zoomPunch(0.15); this.flashScreen('#9dffc4', 0.8, 18);
          JK.FX.explosion(l.x, l.y - 130, 2, '#2aff7a');
          for (let i = 0; i < 26; i++) { const sz = 6 + Math.random() * 12; JK.FX.add({ type: 'shard', x: l.x, y: l.y - 130, vx: (Math.random() - 0.5) * 24, vy: -4 - Math.random() * 14, g: 0.45, pts: [[0, 0], [sz, sz * (Math.random() - 0.5)], [sz * (Math.random() - 0.3), sz]], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5, color: JK.pick(['#2aff7a', '#d8ffe8', '#3a4a40']), life: 50 }); }
          l.finishFx = { type: 'launch', t: 0, dir: w.facing };
          JK.FX.text(l.x, l.y - 330, '大当たり', { size: 84, color: '#9dffc4', life: 90 });
        }
        if (t > 112 && t < 200 && t % 2 === 0) JK.FX.add({ type: 'dot', x: this.cam.x + (Math.random() - 0.5) * 1400, y: -760, vx: 0, vy: 10 + Math.random() * 6, drag: 1, r: 12, color: JK.pick(['#ffd23a', '#ffe89a', '#2aff7a']), life: 90 });
      } else {
        if (t === 1) { this.dimScreen(180, 0.55); }
        w.scriptPose = P({ y: -104, lean: 4, head: -4, hF: [40, -20], hB: [38, -16], gF: 'sign', gB: 'sign', fF: [26, 0], fB: [-26, 0] });
        if (t === 10) JK.FX.text(w.x, w.y - 300, '影', { size: 90, color: '#9a8aff', life: 80 });
        if (t > 10 && t < 140) {
          const r = Math.min(200, (t - 10) * 5);
          JK.FX.add({ type: 'custom', x: 0, y: 0, life: 2, layer: 'back', d: (ctx) => { ctx.fillStyle = '#05040c'; ctx.beginPath(); ctx.ellipse(l.x, 2, r, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); } });
        }
        if (t === 40) { l.finishFx = { type: 'sink', t: 0 }; A.sfx('whooshHeavy'); }
        if (t === 60 || t === 75) {
          const side = t === 60 ? -1 : 1;
          this.projectiles.push(new JK.Projectile({ owner: w, kind: 'wolf', x: l.x + side * 60, y: -60, vx: 0, life: 40, dir: -side, from: 9999, d: (ctx, p) => JK.drawShiki.wolf(ctx, p.x, p.y - Math.min(40, p.t * 4), p.dir, p.t, side > 0) }));
          A.sfx('hit', 2);
        }
      }
      if (l.finishFx) l.finishFx.t++;
      for (const p of this.projectiles) { p.t++; if (p.t > p.life) p.dead = true; }
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      if (t === 205) {
        this.announce('EXORCISED', { dur: 140, size: 130, glow: '#b01020', sub: w.ch.short + ' WINS' });
        A.say('Exorcised', { pitch: 0.3, rate: 0.75 });
        A.sfx('ko');
      }
      if (t === 330) {
        this.fin = null;
        this.cinematic = false;
        w.wins++;
        w.setState('win');
        l.hidden = true;
        this.endMatch();
      }
    }

    // ------------------------------------------------------------ domain expansion
    startDomain(caster) {
      const def = caster.opp;
      const info = caster.ch.domain;
      this.domain = {
        owner: caster, def, id: info.id, info, bg: JK.getDomain(info.id), phase: 'cast', t: 0,
        canClash: def.meter >= 300 && def.state !== 'ko' && !info.ult && !def.ch.domain.ult, clash: null,
      };
      const bg = this.domain.bg;
      bg.verdict = null; bg.speaking = false; bg.crack = 0; bg.tilt = 0;
      caster.meter = 0;
      this.stats[caster === this.p1 ? 'p1' : 'p2'].domains++;
      caster.setState('domaincast');
      caster.move = null;
      caster.invuln = 9999;
      this.cinematic = true;
      this.projectiles.length = 0;
      A.stopMusic(0.4);
      A.sfx('domain');
      A.sfx('impact');
      this.negT = 4;
      this.flashScreen('#000', 0.6, 20);
      this.shake(12, 26);
      this.zoomPunch(0.1);
      this.castVoice(this.domain, 0);
    }
    // Real voice clip when available (timed to the cinematic), otherwise text-to-speech.
    castVoice(d, offset) {
      const info = d.info;
      d.clip = info.clip && JK.settings.ost !== false && A.playClip(info.clip, { offset, vol: 1 });
      d.nameAt = d.clip ? info.clipNameAt ?? 60 : 60;
      d.castLen = d.clip ? info.clipCastLen ?? 110 : 110;
      if (d.clip || offset) return;
      if (info.ult) { A.say(info.cry || info.name, { pitch: d.owner.ch.voicePitch ?? 0.7, rate: 0.85 }); return; }
      const spoke = A.hasJapaneseVoice() && A.say('領域展開', { lang: 'ja-JP', pitch: d.owner.ch.voicePitch ?? 0.7, rate: 0.8 });
      if (!spoke) A.say('Domain expansion', { pitch: d.owner.ch.voicePitch ?? 0.7, rate: 0.85 });
    }
    domainLogic() {
      const d = this.domain;
      d.t++;
      const caster = d.owner, def = d.def;
      if (d.phase === 'cast') {
        if (d.canClash && d.t < 70) {
          const wants = def.ctrl.pressed.domain || def.pressed('domain') || (def.ctrl instanceof JK.AIController && d.t === 25 + Math.floor(JK.simRandom() * 20) && def.ctrl.level !== 'easy' && JK.simRandom() < 0.8);
          if (wants) { def.consume('domain'); this.startClash(); return; }
        }
        // Simple Domain: the defender spends 1 bar to blunt the sure-hit (block during the cast)
        if (!d.simple && d.t > 8 && d.t < (d.castLen || 110) - 6 && def.meter >= 100) {
          const human = !(def.ctrl instanceof JK.AIController);
          const wants = human ? def.ctrl.pressed.block : def.ctrl.level !== 'easy' && !d.canClash && d.t === 34 && JK.simRandom() < (def.ctrl.level === 'pro' || def.ctrl.level === 'expert' ? 0.9 : 0.5);
          if (wants) {
            def.meter -= 100;
            d.simple = true;
            this.announce('簡易領域  SIMPLE DOMAIN', { dur: 70, size: 34, side: def === this.p1 ? -1 : 1, glow: '#9fd8ff', delay: 0 });
            A.sfx('block', true);
          }
        }
        if (d.t === (d.nameAt || 60)) { this.shake(14, 20); this.flashScreen(caster.ch.color, 0.4, 12); A.sfx('clap'); A.sfx('impact'); this.negT = 2; }
        if (d.t % 42 === 20) A.sfx('heartbeat', 0.6 + d.t / 200);
        if (d.t === Math.max(2, (d.castLen || 110) - 85)) A.sfx('riser', 1.4);
        // debris and cursed energy lifting off the ground around the caster
        if (d.t % 3 === 0) {
          const x = caster.x + (Math.random() - 0.5) * 420;
          JK.FX.add({ type: 'debris', x, y: -2, vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 3, r: 2 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, color: '#5a5048', life: 60 });
          JK.FX.add({ type: 'dot', x: caster.x + (Math.random() - 0.5) * 160, y: -Math.random() * 260, vx: 0, vy: -3 - Math.random() * 3, r: 14 + Math.random() * 14, color: caster.ch.aura, life: 30 });
        }
        if (d.t === 60 && !d.clip) {
          const name = d.info.say;
          if (name) {
            const jp = A.hasJapaneseVoice() && A.say(d.info.jp, { lang: 'ja-JP', pitch: caster.ch.voicePitch ?? 0.7, rate: 0.75, cancel: false });
            if (!jp) A.say(name, { pitch: caster.ch.voicePitch ?? 0.7, rate: 0.8, cancel: false });
          }
        }
        if (d.t >= (d.castLen || 110)) { d.phase = 'expand'; d.t = 0; A.playMusic(d.info.music, { restart: true, fadeIn: 1.5 }); this.expandImpact(caster); }
        return;
      }
      if (d.phase === 'clash') { this.clashLogic(); return; }
      if (d.phase === 'expand') {
        if (d.t >= 36) {
          d.phase = 'active';
          d.t = 0;
          this.cinematic = false;
          caster.invuln = 0;
          caster.setState('idle');
          if (d.id === 'unlimited_void') { def.voidT = d.simple ? 90 : 280; caster.eyesOpen = true; def.move = null; if (def.state !== 'juggle' && def.state !== 'knockdown') def.setState('voided'); A.sfx('blue'); }
          if (d.id === 'yuji_domain') def.slowT = d.simple ? 180 : DOMAIN_TIME;
          if (d.id === 'deadly_sentencing') {
            // the trial: no violence is allowed until the verdict is read
            this.cinematic = true;
            for (const f of [caster, def]) { if (f.state !== 'juggle' && f.state !== 'knockdown') f.setState('idle'); f.move = null; }
            d.trial = this.newTrial(d);
          }
          if (d.id === 'overtime_collapse') { caster.otT = Math.max(caster.otT, DOMAIN_TIME + 60); caster.loose = true; }
          if (d.id === 'idle_death_gamble') {
            d.hk = { uses: 0, spin: null, scen: 0, heat: 0, spins: 0 };
            d.bg.scenario = 0;
            for (const k of ['t1', 't2']) caster.cd[k] = 0;
          }
          if (d.id !== 'deadly_sentencing') this.announce(d.info.name, { dur: 80, size: 64, sub: d.info.sub ? d.info.jp + ' · ' + d.info.sub : d.info.jp, glow: caster.ch.color });
        }
        return;
      }
      if (d.phase === 'active') {
        // sure-hit effects
        const alive = def.hp > 0 && def.state !== 'ko' && def.state !== 'dizzy';
        const sk = d.simple ? 0.4 : 1;
        if (d.id === 'malevolent_shrine' && alive) {
          if (d.t % 16 === 0) this.sureHit(def, 7 * sk, false, '#ff4050');
          if (d.t % 90 === 45) this.sureHit(def, 30 * sk, true, '#ff2040');
        }
        if (d.id === 'coffin_iron_mountain' && alive) {
          if (d.t % 18 === 0) this.sureHit(def, 7 * sk, false, '#ff7a1a', 'fire');
          if (d.t % 100 === 50) {
            JK.spawnVolcano(caster, def.x + def.vx * 6, { from: 16, to: 26, dmg: 38 * sk, level: 'unblockable', sureHit: true, burn: 0, launchVy: -12 });
          }
        }
        if (d.id === 'chimera_shadow_garden' && alive && d.t % 80 === 40) {
          this.projectiles.push(new JK.Projectile({
            owner: caster, kind: 'wolf', x: def.x - def.facing * 120, y: -44, w: 120, h: 80, vx: def.facing * 14, life: 30, dmg: 42 * sk, kb: 6, hitstun: 18, blockstun: 12,
            hitstop: 6, power: 2, level: 'unblockable', sureHit: true, sparkColor: '#8a7cff', dir: def.facing,
            u: (p) => { p.x += p.vx; }, d: (ctx, p) => JK.drawShiki.wolf(ctx, p.x, p.y, p.dir, p.t, (d.t / 80) % 2 < 1),
          }));
          A.sfx('dash');
        }
        if (d.id === 'deadly_sentencing') { this.trialLogic(d, alive); return; }
        if (d.id === 'idle_death_gamble') { this.hakariLogic(d, alive); if (d.jackpot || !this.domain) return; }
        if (d.id === 'authentic_mutual_love' && alive) {
          if (d.t % 100 === 50) this.katanaStrike(caster, def, 26 * sk);
          if (d.t % 5 === 0) JK.FX.add({ type: 'dot', layer: 'back', x: this.cam.x + (Math.random() - 0.5) * 1400, y: -700, vx: -1, vy: 2.5, drag: 1, r: 5, color: '#ffe0f0', alpha: 0.7, life: 200 });
        }
        if (d.id === 'overtime_collapse') {
          d.bg.crack = Math.min(1, d.t / (d.info.dur || DOMAIN_TIME));
          if (alive && d.t % 75 === 30) this.dropSlab(caster, def, 30 * sk);
          if (d.t % 40 === 0) this.shake(3, 6);
        }
        const dur = d.info.dur || DOMAIN_TIME;
        if (d.t >= dur && !(d.hk && d.hk.spin)) {
          if (d.id === 'overtime_collapse' && alive) {
            // the whole floor gives way
            JK.FX.text(def.x, def.y - 300, '瓦落瓦落', { size: 80, color: '#ffcf80', life: 70 });
            JK.FX.debris(def.x, 0, 40, '#6e655e');
            JK.FX.shockwave(def.x, 0, '#ffcf80', 2);
            A.sfx('explosion', 1.8); A.sfx('impact');
            this.shake(24, 36);
            this.negT = 3;
            def.receive(caster, { dmg: 95 * sk, level: 'unblockable', kb: 6, knockdown: true, knockVy: -11, airKb: 5, hitstun: 24, hitstop: 12, power: 3, sparkColor: '#ffae42', noBF: true }, def.x, def.y - 120, { sureHit: true, projectile: true, dir: caster.facing });
          }
          if (d.id === 'yuji_domain' && alive) {
            JK.FX.blackFlash(def.x, def.y - 140, caster.facing);
            A.sfx('blackFlash');
            def.receive(caster, { dmg: 100 * sk, level: 'unblockable', kb: 8, hitstun: 20, hitstop: 12, power: 3, noBF: true }, def.x, def.y - 140, { sureHit: true, projectile: true, dir: caster.facing });
          }
          if (d.id === 'unlimited_void' && alive) {
            def.receive(caster, { dmg: 115 * sk, level: 'unblockable', kb: 4, hitstun: 24, hitstop: 10, power: 2, sparkColor: '#9fe8ff' }, def.x, def.y - 150, { sureHit: true, projectile: true, dir: caster.facing });
          }
          this.endDomain(false);
        }
      }
    }
    // ------------------------------------------------------------ Deadly Sentencing: the trial
    // A race between prosecution (Higuruma) and defense. Each side types button sequences:
    // the prosecutor's present EVIDENCE, the defendant's raise an OBJECTION that destroys one.
    //   3+ evidence: the prosecutor may REST THE CASE (Q) -> CONFISCATION
    //   5 evidence : DEATH PENALTY (the Executioner's Sword)
    //   clock runs out first -> NOT GUILTY
    newTrial(d) {
      const T = { t: 0, intro: 330, total: 1320, time: 1320, ev: 0, objections: 0, over: false, verdict: null, vt: 0, simple: !!d.simple };
      T.pro = this.trialSide(d.owner, true, T);
      T.def = this.trialSide(d.def, false, T);
      return T;
    }
    trialSide(f, prosecutor, T) {
      const s = { f, prosecutor, human: !(f.ctrl instanceof JK.AIController), idx: 0, lock: 0, err: 0, ok: 0, aiT: 0, done: 0 };
      s.seq = this.trialSeq(this.trialLen(s, T));
      return s;
    }
    trialLen(s, T) {
      // a human prosecutor gets short sequences; CPU prosecutors grow longer ones as evidence piles up
      if (s.prosecutor) return (s.human ? (T.ev >= 3 ? 6 : 4) : 4 + Math.min(2, Math.floor(T.ev / 2))) + (T.simple ? 1 : 0);
      return Math.min(11, 8 + T.objections);
    }
    trialSeq(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        let k;
        do { k = JK.simPick(JK.TRIAL_KEYS); } while (i > 0 && k === out[i - 1]);
        out.push(k);
      }
      return out;
    }
    trialLogic(d, alive) {
      const T = d.trial, bg = d.bg, caster = d.owner, def = d.def;
      T.t++;
      if (!alive && !T.over) { this.endDomain(false); return; }
      if (T.over) { this.verdictLogic(d); return; }
      // Judgeman reads the charge before the clock starts
      if (T.t < T.intro) {
        bg.speaking = true;
        // a human who has read the rules can start the clock early with J
        const human = T.pro.human ? T.pro : T.def.human ? T.def : null;
        if (human && !this.net && T.t > 90 && T.t < T.intro - 20 && (human.f.ctrl.pressed.light || JK.Input.state.menu.confirm)) T.t = T.intro - 20;
        if (T.t === T.intro - 20) { A.sfx('gong'); A.sample('gavel', 0.9); this.shake(8, 10); }
        return;
      }
      bg.speaking = false;
      T.time--;
      if (T.time % 60 === 0 && T.time <= 300) A.sfx('heartbeat', 1.2);
      this.trialInput(T, T.pro, T.def);
      this.trialInput(T, T.def, T.pro);
      bg.tilt = JK.approach(bg.tilt || 0, T.ev / 5, 0.03);
      if (T.ev >= 5) this.startVerdict(d, 'death');
      else if (T.rest) this.startVerdict(d, 'confiscation');
      else if (T.time <= 0) this.startVerdict(d, 'innocent');
      void caster; void def;
    }
    trialInput(T, s, other) {
      if (s.err > 0) s.err--;
      if (s.objT > 0) s.objT--;
      if (s.ok > 0) s.ok--;
      if (s.lock > 0) { s.lock--; return; }
      let tok = null, rest = false;
      if (s.human) {
        const p = s.f.ctrl.pressed;
        for (const k of JK.TRIAL_KEYS) if (p[k]) { tok = k; break; }
        if (p.domain) rest = true;
      } else {
        const sk = s.f.ctrl.trialSkill;
        if (!sk) return; // training dummy stays silent
        // against a human the CPU types at human-friendly speeds (Pro ~2 keys/s)
        const speed = sk.speed * (other.human ? 1.5 : 1), err = sk.err + (other.human ? 0.03 : 0);
        if (s.prosecutor && T.ev >= 3 && this.aiRests(T, s.f.ctrl.level)) rest = true;
        else if (++s.aiT >= speed) {
          s.aiT = Math.floor(JK.simRandom() * speed * 0.4) - speed * 0.2;
          const want = s.seq[s.idx];
          tok = JK.simRandom() < err ? JK.simPick(JK.TRIAL_KEYS.filter((k) => k !== want)) : want;
        }
      }
      if (rest) {
        if (!s.prosecutor) return;
        if (T.ev >= 3) T.rest = true;
        else { s.err = 12; A.sfx('deny', s.human ? 1 : 0); }
        return;
      }
      if (!tok) return;
      if (tok !== s.seq[s.idx]) {
        // a slip: the sequence restarts and the side is flustered for a moment
        s.idx = 0; s.lock = s.human ? 10 : 24; s.err = s.lock;
        A.sfx('deny', s.human ? 1 : 0.4);
        return;
      }
      s.idx++;
      A.sfx('select');
      if (s.idx < s.seq.length) return;
      s.done++;
      s.ok = 20;
      if (s.prosecutor) {
        T.ev++;
        A.sfx('clap'); A.sample('gavel', 0.45);
        this.shake(6, 8);
        this.announce('EVIDENCE ' + T.ev + ' / 5', { dur: 40, size: 40, glow: '#e2bb4a' });
      } else {
        T.objections++;
        const lost = T.ev > 0;
        T.ev = Math.max(0, T.ev - 1);
        this.announce('OBJECTION!', { dur: 45, size: 96, glow: '#ff4050', sub: lost ? 'EVIDENCE DISMISSED' : '' });
        A.sfx('impact'); A.sfx('gong');
        this.shake(10, 12);
        this.negT = 2;
        // the prosecution loses its train of thought
        other.seq = this.trialSeq(this.trialLen(other, T));
        other.idx = 0; other.lock = 30; other.err = 30; other.objT = 30;
      }
      s.seq = this.trialSeq(this.trialLen(s, T));
      s.idx = 0;
    }
    // CPU prosecutors: pros press for the death penalty, weaker ones take what they can get
    aiRests(T, level) {
      if (T.ev >= 4 && T.time < 240) return true;
      if (T.time < (level === 'pro' || level === 'expert' ? 120 : level === 'normal' ? 260 : 420)) return true;
      if (level === 'easy') return JK.simRandom() < 0.02;
      if (level === 'normal') return T.ev === 3 && JK.simRandom() < 0.004;
      return false;
    }
    startVerdict(d, kind) {
      const T = d.trial;
      T.over = true; T.verdict = kind; T.vt = 0;
    }
    verdictLogic(d) {
      const T = d.trial, bg = d.bg, caster = d.owner, def = d.def;
      T.vt++;
      if (T.vt === 1) {
        A.sfx('gong'); A.sample('gavel', 1);
        this.shake(16, 22);
        this.negT = 3;
        if (T.verdict === 'innocent') {
          bg.verdict = { jp: '無罪', color: '#9fd8ff' };
          this.announce('NOT GUILTY', { dur: 120, size: 110, glow: '#6fb0ff', sub: 'THE DEFENDANT IS ACQUITTED' });
        } else if (T.verdict === 'confiscation') {
          bg.verdict = { jp: '没収', color: '#b39cff' };
          def.confiscT = 1800;
          def.meter = 0;
          if (def.jpT > 0) this.endJackpot(def, true);
          this.announce('CONFISCATION', { dur: 120, size: 100, glow: '#b39cff', sub: 'TECHNIQUES SEALED · CURSED ENERGY SEIZED' });
          A.sfx('shatter');
          for (let i = 0; i < 4; i++) JK.FX.add({ type: 'ring', x: def.x, y: def.y - 120, r0: 240 - i * 50, r1: 20, w: 6, color: '#b39cff', life: 22 + i * 6 });
          JK.FX.text(def.x, def.y - 280, '没収', { size: 64, color: '#d8c8ff', life: 80 });
          // Judgeman's gavel comes down on the guilty
          this.later(40, () => {
            if (def.hp <= 0 || def.state === 'ko') return;
            JK.FX.shockwave(def.x, 0, '#b39cff', 1.4);
            A.sample('gavel', 0.9);
            JK.FX.add({ type: 'flash', x: def.x, y: def.y - 120, r: 180, color: '#b39cff', life: 12 });
            A.sfx('explosion', 0.8);
            def.receive(caster, { dmg: 80, level: 'unblockable', kb: 4, knockdown: true, knockVy: -8, airKb: 3, hitstun: 20, hitstop: 10, power: 3, sparkColor: '#b39cff', noBF: true }, def.x, def.y - 150, { sureHit: true, projectile: true, dir: caster.facing });
          });
        } else {
          bg.verdict = { jp: '死刑', color: '#ffffff' };
          caster.execT = 1800;
          A.sample('sword_manifest', 1);
          this.announce('DEATH PENALTY', { dur: 120, size: 104, glow: '#ffffff', sub: 'THE EXECUTIONER\'S SWORD IS GRANTED' });
          this.flashScreen('#ffffff', 0.8, 20);
          A.sfx('shatter'); A.sfx('slash', true);
          for (let i = 0; i < 16; i++) JK.FX.add({ type: 'spark', x: caster.x, y: caster.y - 150, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18, len: 28, w: 3, color: '#ffffff', life: 18 });
        }
      }
      if (T.vt >= 150) {
        // keys typed during the trial must not spill into the fight
        for (const f of [caster, def]) { f.buf = {}; f.dashReq = null; }
        this.cinematic = false;
        this.endDomain(false);
      }
    }
    drawTrial(ctx, d) {
      const T = d.trial;
      const intro = T.t < T.intro;
      const fade = T.over ? Math.max(0, 1 - T.vt / 40) : Math.min(1, T.t / 20);
      if (fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      // clock
      const k = T.time / T.total;
      const bx = W / 2 - 300, by = 86;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 4, by - 4, 608, 22);
      ctx.fillStyle = k < 0.28 ? (Math.floor(T.t / 8) % 2 ? '#ff3040' : '#ff8090') : '#d8cfe8';
      ctx.fillRect(bx, by, 600 * k, 14);
      JK.text(ctx, 'THE TRIAL  ' + (T.time / 60).toFixed(1) + 's', W / 2, by + 36, { size: 26, color: '#fff', stroke: '#000', strokeW: 5, spacing: 3 });
      // evidence track: 3 = confiscation, 5 = death penalty
      ctx.fillStyle = 'rgba(4,2,8,0.78)';
      ctx.beginPath(); JK.roundRect(ctx, W / 2 - 330, 128, 540, 70, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,74,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const x = W / 2 - 160 + i * 80, y = 152;
        const filled = i < T.ev;
        ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = filled ? (i === 4 ? '#ffffff' : '#e2bb4a') : 'rgba(20,16,28,0.85)';
        ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = i === 2 ? '#b39cff' : i === 4 ? '#ffffff' : '#6a5a3a'; ctx.stroke();
        if (filled) JK.drawGlow(ctx, i === 4 ? '#ffffff' : '#e2bb4a', x, y, 36, 0.5);
      }
      JK.text(ctx, 'CONFISCATION', W / 2, 186, { size: 15, font: JK.FONT_UI, color: '#c8b8ff', stroke: '#000', strokeW: 3, weight: 'bold' });
      JK.text(ctx, 'DEATH', W / 2 + 160, 186, { size: 15, font: JK.FONT_UI, color: '#ffffff', stroke: '#000', strokeW: 3, weight: 'bold' });
      JK.text(ctx, 'EVIDENCE', W / 2 - 200, 153, { size: 18, color: '#e2bb4a', stroke: '#000', strokeW: 4, align: 'right' });
      // one panel per side (P1 left, CPU right)
      for (const s of [T.pro, T.def]) this.drawTrialSide(ctx, T, s, s.f === this.p1, intro);
      // instructions for the human player
      const me = T.pro.f === this.p1 ? T.pro : T.def;
      if (me.human) {
        const msg = me.prosecutor
          ? (T.ev >= 3 ? 'PRESS  Q  TO REST YOUR CASE (CONFISCATION)  ·  OR PUSH ON TO 5 FOR THE DEATH PENALTY' : 'TYPE THE SEQUENCE TO PRESENT EVIDENCE  ·  3 = CONFISCATION  ·  5 = DEATH PENALTY')
          : 'TYPE THE SEQUENCE TO OBJECT  ·  EACH OBJECTION DESTROYS ONE PIECE OF EVIDENCE  ·  SURVIVE THE CLOCK';
        JK.text(ctx, msg, W / 2, H - 92, { size: 19, font: JK.FONT_UI, color: '#f0e6d8', stroke: '#000', strokeW: 4, weight: 'bold' });
      }
      if (intro) {
        const a = Math.min(1, T.t / 14);
        ctx.fillStyle = `rgba(0,0,0,${0.7 * a})`;
        ctx.fillRect(W / 2 - 440, 222, 880, 190);
        ctx.fillStyle = JK.rgba('#b39cff', 0.8 * a);
        ctx.fillRect(W / 2 - 440, 222, 880, 2); ctx.fillRect(W / 2 - 440, 410, 880, 2);
        // Judgeman's charge, typed out
        const charge = 'JUDGEMAN: THE DEFENDANT STANDS ACCUSED OF VIOLENCE WITH CURSED ENERGY.';
        JK.text(ctx, charge.slice(0, Math.floor(T.t * 0.9)), W / 2, 256, { size: 26, color: '#d8c8ff', alpha: a, spacing: 1 });
        const b = JK.clamp((T.t - 45) / 20, 0, 1);
        JK.text(ctx, 'THE PROSECUTION MUST PROVE ITS CASE BEFORE THE CLOCK RUNS OUT', W / 2, 302, { size: 22, color: '#fff', alpha: b, spacing: 1 });
        JK.text(ctx, 'Arrows + J K L enter a sequence · a wrong key resets it · the defense can OBJECT', W / 2, 338, { size: 18, font: JK.FONT_UI, color: '#ddd', alpha: b });
        JK.text(ctx, '3 evidence + Q: CONFISCATION   ·   5 evidence: DEATH PENALTY   ·   time out: NOT GUILTY', W / 2, 376, { size: 18, font: JK.FONT_UI, color: '#e2bb4a', alpha: b, weight: 'bold' });
        const human = T.pro.human || T.def.human;
        if (human && T.t > 90) JK.text(ctx, 'THE CLOCK STARTS IN ' + Math.ceil((T.intro - T.t) / 60) + '  ·  PRESS J WHEN READY', W / 2, 402, { size: 16, font: JK.FONT_UI, color: Math.floor(T.t / 20) % 2 ? '#ffffff' : '#b39cff', weight: 'bold' });
      } else {
        // the rules stay pinned in the corner for the whole trial
        const x0 = 24, y0 = 236;
        ctx.fillStyle = 'rgba(4,2,8,0.72)';
        ctx.beginPath(); JK.roundRect(ctx, x0, y0, 268, 104, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(179,156,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        const rows = [['RULES', '#b39cff'], ['Type the sequence · a wrong key resets it', '#ddd'], ['3 evidence + Q  →  CONFISCATION', '#c8b8ff'], ['5 evidence  →  DEATH PENALTY', '#ffffff'], ['Clock runs out  →  NOT GUILTY', '#9fd8ff']];
        rows.forEach(([txt, c], i) => JK.text(ctx, txt, x0 + 12, y0 + 16 + i * 19, { size: i ? 14 : 15, align: 'left', font: JK.FONT_UI, color: c, weight: 'bold' }));
      }
      ctx.restore();
    }
    drawTrialSide(ctx, T, s, left, intro) {
      const x0 = left ? 70 : W - 70, al = left ? 'left' : 'right';
      const y = H - 190;
      const role = s.prosecutor ? 'PROSECUTION' : 'DEFENSE';
      JK.text(ctx, role + '  ·  ' + s.f.ch.short, x0, y - 44, { size: 26, align: al, color: s.prosecutor ? '#e2bb4a' : '#ff8090', stroke: '#000', strokeW: 5, spacing: 2 });
      const n = s.seq.length, bw = 42, gap = 6;
      const total = n * bw + (n - 1) * gap;
      const sx = left ? x0 : x0 - total;
      for (let i = 0; i < n; i++) {
        const bx = sx + i * (bw + gap);
        const done = i < s.idx, cur = i === s.idx && !intro;
        ctx.fillStyle = s.err > 0 ? 'rgba(90,10,20,0.85)' : done ? 'rgba(40,70,40,0.85)' : 'rgba(10,8,16,0.85)';
        ctx.beginPath(); JK.roundRect(ctx, bx, y - 21, bw, 42, 6); ctx.fill();
        ctx.lineWidth = cur ? 3 : 1.5;
        ctx.strokeStyle = cur ? (Math.floor(T.t / 6) % 2 ? '#ffffff' : '#e2bb4a') : s.ok > 0 ? '#6fe07a' : 'rgba(200,190,220,0.5)';
        ctx.stroke();
        // opponents' sequences are hidden: you only see how far along they are
        const show = s.human || intro || done;
        JK.text(ctx, show ? JK.TRIAL_GLYPH[s.seq[i]] : '?', bx + bw / 2, y + 1, { size: 24, font: JK.TRIAL_KEYS.indexOf(s.seq[i]) < 4 ? 'sans-serif' : JK.FONT_TITLE, color: done ? '#9fe8a0' : '#fff', stroke: '#000', strokeW: 3 });
      }
      if (s.lock > 0) JK.text(ctx, s.objT > 0 ? 'OBJECTED!' : 'SLIP!', left ? sx + total + 14 : sx - 14, y, { size: 22, align: left ? 'left' : 'right', color: '#ff5060', stroke: '#000', strokeW: 4 });
    }

    // Overtime: Collapse — a slab of ceiling drops on the target after a telegraphed shadow.
    dropSlab(caster, def, dmg) {
      const x = JK.clamp(def.x + def.vx * 14, 100, JK.STAGE_W - 100);
      this.projectiles.push(new JK.Projectile({
        owner: caster, kind: 'slab', x, y: -900, w: 150, h: 110, vx: 0, vy: 0, life: 90, from: 9999, to: 9999, dmg, level: 'unblockable', sureHit: true,
        kb: 3, hitstun: 18, hitstop: 6, power: 2, sparkColor: '#ffae42', prio: 3, persist: true, dir: caster.facing,
        u: (p, g2) => {
          if (p.landed) { if (p.t > p.to + 14) p.kill(g2); return; }
          if (p.t < 26) return; // shadow telegraph first
          p.vy += 1.6; p.y += p.vy;
          if (p.y >= -60) {
            p.y = -60; p.landed = true; p.from = p.t; p.to = p.t + 3;
            JK.FX.debris(p.x, 0, 14, '#6e655e'); JK.FX.dust(p.x, 0, 0, 10);
            A.sfx('bodyfall'); A.sfx('explosion', 0.6);
            g2.shake(8, 10);
          }
        },
        d: (ctx, p) => {
          const k = JK.clamp(1 + p.y / 900, 0.15, 1);
          ctx.fillStyle = `rgba(0,0,0,${0.2 + 0.4 * k})`;
          ctx.beginPath(); ctx.ellipse(p.x, 2, 90 * k + 20, 12, 0, 0, Math.PI * 2); ctx.fill();
          if (p.t < 26) return;
          const a = p.landed ? Math.max(0, 1 - (p.t - p.to) / 14) : 1;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(p.x, p.y);
          ctx.rotate(0.08);
          ctx.fillStyle = '#8a8078'; ctx.fillRect(-75, -40, 150, 80);
          ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 4; ctx.strokeRect(-75, -40, 150, 80);
          ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(-70, -58); ctx.moveTo(40, -40); ctx.lineTo(52, -60); ctx.moveTo(10, 40); ctx.lineTo(4, 58); ctx.stroke();
          ctx.restore();
        },
      }));
    }
    expandImpact(caster) {
      A.sample('domain_boom', 0.9);
      A.sfx('explosion', 1.6);
      A.sfx('impact');
      A.sfx('shatter');
      this.negT = 5;
      this.shake(26, 44);
      this.zoomPunch(0.16);
      this.flashScreen('#ffffff', 0.9, 18);
      const col = caster.ch.color;
      for (let i = 0; i < 4; i++) JK.FX.add({ type: 'ring', x: caster.x, y: caster.y - 120, r0: 20, r1: 500 + i * 260, w: 18 - i * 3, color: i % 2 ? '#ffffff' : col, life: 26 + i * 8 });
      JK.FX.shockwave(caster.x, 0, col, 3);
      JK.FX.debris(caster.x, 0, 30, '#5a5048');
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        JK.FX.add({ type: 'bolt', x1: caster.x, y1: caster.y - 120, x2: caster.x + Math.cos(a) * 420, y2: caster.y - 120 + Math.sin(a) * 300, w: 3, jag: 40, seg: 8, color: '#ffffff', glow: col, life: 16 });
      }
    }
    sureHit(def, dmg, big, color, style) {
      const g = this;
      const cx = def.x + (JK.simRandom() - 0.5) * 40, cy = def.y - 60 - JK.simRandom() * 140;
      const ang = JK.simRandom() * Math.PI;
      const L = big ? 400 : 160;
      if (style === 'fire') {
        for (let i = 0; i < 5; i++) JK.FX.add({ type: 'flame', x: def.x + (Math.random() - 0.5) * 50, y: def.y - Math.random() * 200, vx: 0, vy: -2, r: 18, life: 20 });
        def.hp = Math.max(def.hp - dmg, def.hp > 60 || def.jpT > 0 ? 1 : 0);
        def.flashT = 2; def.flashColor = '#ff9040';
        if (def.hp <= 0) def.receive(this.domain.owner, { dmg: 1, level: 'unblockable', kb: 3, hitstun: 10, hitstop: 2 }, cx, cy, { sureHit: true, projectile: true });
        return;
      }
      JK.FX.add({ type: 'cut', x1: cx - Math.cos(ang) * L, y1: cy - Math.sin(ang) * L, x2: cx + Math.cos(ang) * L, y2: cy + Math.sin(ang) * L, w: big ? 5 : 2.5, color, life: big ? 20 : 12 });
      if (big) {
        def.receive(this.domain.owner, { dmg, level: 'unblockable', kb: 2, hitstun: 12, hitstop: 4, power: 1, sparkColor: color, slashFx: true, sfx: 'slash', noBF: true }, cx, cy, { sureHit: true, projectile: true, dir: JK.simRandom() < 0.5 ? 1 : -1 });
      } else {
        def.hp = Math.max(def.hp - dmg, def.hp > 60 || def.jpT > 0 ? 1 : 0);
        def.flashT = 2; def.flashColor = '#ff6070';
        A.sfx('slash');
        if (def.hp <= 0) def.receive(this.domain.owner, { dmg: 1, level: 'unblockable', kb: 3, hitstun: 10, hitstop: 2 }, cx, cy, { sureHit: true, projectile: true });
      }
      JK.FX.slashMarks(cx, cy, 1, color, big ? 1.2 : 0.6);
      void g;
    }
    endDomain(silent) {
      const d = this.domain;
      if (!d) return;
      this.domain = null;
      this.cinematic = this.fin ? true : false;
      d.owner.invuln = 0;
      if (d.owner.state === 'domaincast') d.owner.setState('idle');
      if (d.def.state === 'domaincast') d.def.setState('idle');
      d.def.voidT = 0;
      d.def.slowT = 0;
      if (d.def.state === 'voided') d.def.setState('idle');
      d.owner.eyesOpen = false;
      if (d.id === 'overtime_collapse') d.owner.otT = Math.min(d.owner.otT, 120);
      if (silent) return;
      if (d.phase === 'active' || d.phase === 'expand') {
        d.owner.burnout = 300;
        JK.FX.shatterScreen(this.screenFx, d.owner.ch.color);
        A.sfx('shatter');
        this.flashScreen('#ffffff', 0.5, 14);
      }
      // back to the stage theme mid-fight; on a KO the domain's theme fades out instead of playing on
      if (this.phase === 'fight' && !this.fin) A.playMusic(this.stage.music, { restart: true, fadeIn: 1.5 });
      else if (!this.fin) A.stopMusic(1.2);
    }

    // ------------------------------------------------------------ domain clash
    startClash() {
      const d = this.domain;
      d.phase = 'clash';
      d.t = 0;
      d.def.meter = 0;
      d.def.setState('domaincast');
      d.def.invuln = 9999;
      d.clash = { a: 0, b: 0, dur: 200, aiAcc: 0 };
      d.bg2 = JK.getDomain(d.def.ch.domain.id);
      A.stopAllClips();
      const di = d.def.ch.domain;
      if (di.clip && JK.settings.ost !== false) A.playClip(di.clip, { offset: 0 });
      this.announce('DOMAIN CLASH!', { dur: 80, size: 100, glow: '#ffd040', sub: 'MASH ATTACK BUTTONS!' });
      A.say('Domain clash!', { pitch: 0.5 });
      A.sfx('explosion', 1.5);
      this.shake(16, 30);
      this.flashScreen('#ffffff', 0.8, 16);
    }
    clashLogic() {
      const d = this.domain, c = d.clash;
      const btns = ['light', 'heavy', 'kick', 't1', 't2', 't3'];
      const mash = (f) => {
        if (f.ctrl instanceof JK.AIController) {
          c.aiAcc = (c.aiAcc || 0) + f.ctrl.clashRate / 60 * (0.7 + Math.random() * 0.6);
          if (c.aiAcc >= 1) { c.aiAcc -= 1; return 1; }
          return 0;
        }
        let n = 0;
        for (const b of btns) if (f.ctrl.pressed[b]) n++;
        return n;
      };
      c.a += mash(d.owner);
      c.b += mash(d.def);
      if (d.t % 6 === 0) { this.shake(4, 6); A.sfx('hit', 1); }
      if (d.t >= c.dur) {
        const winnerIsDef = c.b > c.a;
        const loser = winnerIsDef ? d.owner : d.def;
        const winner = winnerIsDef ? d.def : d.owner;
        loser.setState('idle');
        loser.invuln = 0;
        if (winnerIsDef) {
          d.owner = winner; d.def = loser; d.info = winner.ch.domain; d.id = d.info.id; d.bg = d.bg2;
        }
        d.phase = 'expand';
        d.t = 0;
        winner.setState('domaincast');
        A.stopAllClips();
        if (d.info.clip && JK.settings.ost !== false) A.playClip(d.info.clip, { offset: d.info.clipNameOffset || 0 });
        A.playMusic(d.info.music, { restart: true, fadeIn: 1 });
        A.sfx('shatter');
        this.flashScreen('#ffffff', 0.9, 20);
        this.announce(winner.ch.short + ' OVERWHELMS!', { dur: 70, size: 70, glow: winner.ch.color });
      }
    }

    // ------------------------------------------------------------ physics helpers
    pushApart() {
      const a = this.p1, b = this.p2;
      if (a.state === 'thrown' || b.state === 'thrown' || a.hidden || b.hidden) return;
      if (a.state === 'knockdown' || b.state === 'knockdown' || a.state === 'ko' || b.state === 'ko' || a.state === 'techroll' || b.state === 'techroll') return;
      if (Math.abs(a.y - b.y) > 150) return;
      const minD = 54;
      let dx = b.x - a.x;
      if (Math.abs(dx) >= minD) return;
      if (Math.abs(dx) < 0.5) dx = a.facing > 0 ? 1 : -1;
      const over = minD - Math.abs(dx);
      const s = Math.sign(dx);
      const bA = this.bounds(a), bB = this.bounds(b);
      let ma = over / 2, mb = over / 2;
      if ((s > 0 && a.x - ma < bA.min) || (s < 0 && a.x + ma > bA.max)) { mb = over; ma = 0; }
      if ((s > 0 && b.x + mb > bB.max) || (s < 0 && b.x - mb < bB.min)) { ma = over; mb = 0; }
      a.x -= s * ma;
      b.x += s * mb;
    }

    resolveHits() {
      const a = this.p1, b = this.p2;
      const ha = this.checkContact(a, b), hb = this.checkContact(b, a);
      if (ha) { a.hitsDone[ha.idx] = true; b.receive(a, a.move, ha.cx, ha.cy); }
      if (hb && b.move) { b.hitsDone[hb.idx] = true; a.receive(b, b.move, hb.cx, hb.cy); }
    }
    checkContact(att, def) {
      const hb = att.activeHitbox();
      if (!hb) return null;
      const m = att.move;
      if (m.throw) {
        if (!def.grounded || def.invuln > 0 || !['idle', 'walk', 'crouch', 'block', 'blockstun', 'landing', 'dash', 'run', 'skid'].includes(def.state)) return null;
      }
      for (const box of def.hurtboxes()) {
        const k = hb.box;
        if (k.x0 < box.x1 && k.x1 > box.x0 && k.y0 < box.y1 && k.y1 > box.y0) {
          return { idx: hb.idx, cx: (Math.max(k.x0, box.x0) + Math.min(k.x1, box.x1)) / 2, cy: (Math.max(k.y0, box.y0) + Math.min(k.y1, box.y1)) / 2 };
        }
      }
      return null;
    }

    updateProjectiles() {
      const P = this.projectiles;
      for (const p of P) {
        if (p.dead) continue;
        p.t++;
        if (p.u) p.u(p, this); else { p.x += p.vx; p.y += p.vy; }
        if (p.t > p.life || p.x < -200 || p.x > JK.STAGE_W + 200) { p.kill(this); continue; }
      }
      // projectile vs projectile
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i], b = P[j];
        if (a.dead || b.dead || a.owner === b.owner || !a.dmg || !b.dmg) continue;
        const ba = a.box(), bb = b.box();
        if (ba.x0 < bb.x1 && ba.x1 > bb.x0 && ba.y0 < bb.y1 && ba.y1 > bb.y0) {
          if (a.prio > b.prio) b.kill(this);
          else if (b.prio > a.prio) a.kill(this);
          else { a.kill(this); b.kill(this); }
          JK.FX.add({ type: 'flash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: 140, color: '#ffffff', life: 12 });
          A.sfx('explosion', 0.7);
          this.shake(6, 8);
        }
      }
      // projectile vs fighters
      for (const p of P) {
        if (p.dead || !p.active || !p.dmg) continue;
        if (p.hitCount >= p.hits || p.t - p.lastHit < p.every) continue;
        const def = p.owner.opp;
        const pb = p.box();
        for (const box of def.hurtboxes()) {
          if (pb.x0 < box.x1 && pb.x1 > box.x0 && pb.y0 < box.y1 && pb.y1 > box.y0) {
            const cx = (Math.max(pb.x0, box.x0) + Math.min(pb.x1, box.x1)) / 2;
            const cy = (Math.max(pb.y0, box.y0) + Math.min(pb.y1, box.y1)) / 2;
            p.hitCount++;
            p.lastHit = p.t;
            const last = p.hitCount >= p.hits;
            const src = p.knockdownLast && last ? Object.assign({}, p, { knockdown: true, knockVy: -9, airKb: 9 }) : p;
            def.receive(p.owner, src, cx, cy, { projectile: true, dir: p.dir, sureHit: !!p.sureHit });
            // area attacks (eruptions, meteors, Hollow Purple) keep playing out after their last hit
            if (last && !p.persist) p.kill(this);
            break;
          }
        }
      }
      this.projectiles = P.filter((p) => !p.dead);
    }

    trainingLogic() {
      const p1 = this.p1, p2 = this.p2;
      const T = this.train || (this.train = { inputs: [], adv: null, track: null, lastDmg: 0, maxCombo: 0, maxDmg: 0 });
      p1.meter = 300;
      for (const f of [p1, p2]) {
        if (f.hp <= 0) f.hp = 1;
        if (f.comboTaken === 0 && (f.actionable() || f.state === 'voided') && this.frame % 2 === 0) f.hp = Math.min(f.maxHp, f.hp + 6);
      }
      const menu = JK.Input.state.menu;
      if (menu.tab) {
        const c = p2.ctrl;
        c.dummyMode = (c.dummyMode + 1) % JK.DUMMY_MODES.length;
        this.announce('DUMMY: ' + JK.DUMMY_MODES[c.dummyMode], { dur: 50, size: 44 });
        A.sfx('select');
      }
      if (menu.reset) this.trainingReset();
      if (menu.cdToggle) {
        this.noCd = !this.noCd;
        for (const f of [p1, p2]) for (const k in f.cd) f.cd[k] = 0;
        this.announce('COOLDOWNS ' + (this.noCd ? 'OFF' : 'ON'), { dur: 50, size: 44 });
        A.sfx('select');
      }
      // input display (numpad notation relative to facing + buttons pressed this frame)
      const h = p1.ctrl.held, pr = p1.ctrl.pressed;
      const hx = (h.right ? 1 : 0) - (h.left ? 1 : 0), hy = (h.up ? 1 : 0) - (h.down ? 1 : 0);
      const dir = 5 + hx * p1.facing + hy * 3;
      const btns = ['light', 'heavy', 'kick', 't1', 't2', 't3', 'block', 'dash', 'throw', 'domain'].filter((b) => pr[b]);
      const top = T.inputs[0];
      if (!top || top.dir !== dir || btns.length) T.inputs.unshift({ dir, btns, n: 1 });
      else top.n++;
      if (T.inputs.length > 14) T.inputs.length = 14;
      // frame advantage: who is free to act first after the last hit/block
      const tr = T.track;
      if (tr) {
        tr.t++;
        const free = (f) => f.actionable() || (f.state === 'air' && !f.move) || f.state === 'dash' || f.state === 'run';
        if (tr.a === null && free(tr.att)) tr.a = tr.t;
        if (tr.d === null && free(tr.def)) tr.d = tr.t;
        if (tr.def.state === 'knockdown' || tr.def.state === 'juggle' || tr.def.state === 'wallsplat') { T.adv = { v: 'KD', block: tr.block }; T.track = null; }
        else if (tr.a !== null && tr.d !== null) { T.adv = { v: tr.d - tr.a, block: tr.block }; T.track = null; }
        else if (tr.t > 240) T.track = null;
      }
    }
    trainingReset() {
      this.projectiles.length = 0;
      JK.FX.clear();
      this.endDomain(true);
      const back = this.p1.x > this.p2.x;
      this.p1.resetRound(JK.STAGE_W / 2 + (back ? 170 : -170));
      this.p2.resetRound(JK.STAGE_W / 2 + (back ? -170 : 170));
      this.p1.facing = this.p1.vface = back ? -1 : 1;
      this.p2.facing = this.p2.vface = -this.p1.facing;
      this.p1.snapshot(); this.p2.snapshot();
      this.cam.x = JK.STAGE_W / 2;
      this.camPrev = null;
      this.hud.trail1 = this.hud.trail2 = JK.MAX_HP;
      this.announce('RESET', { dur: 30, size: 44 });
    }
    // Hit / block bookkeeping for the training readouts.
    trainNote(att, def, dmg, block) {
      if (this.mode !== 'training' || !this.train) return;
      const T = this.train;
      T.track = { att, def, t: 0, a: null, d: null, block };
      if (att === this.p1 && !block) {
        T.lastDmg = dmg;
        T.maxCombo = Math.max(T.maxCombo, def.comboTaken);
        T.maxDmg = Math.max(T.maxDmg, def.comboDmg);
      }
    }

    // ------------------------------------------------------------ camera
    updateCamera() {
      const c = this.cam;
      const a = this.p1, b = this.p2;
      let tx = (a.x + b.x) / 2;
      const dist = Math.abs(a.x - b.x);
      let tz = JK.clamp(1180 / (dist + 470), 0.78, 1.16);
      const top = Math.min(a.y, b.y);
      let ty = top < -140 ? (top + 140) * 0.55 : 0;
      const d = this.domain;
      if (d && (d.phase === 'cast' || d.phase === 'clash')) {
        if (d.phase === 'cast') { tx = d.owner.x + d.owner.facing * 40; tz = 1.55; ty = -60; }
        else { tx = (a.x + b.x) / 2; tz = 1.1; ty = -20; }
      }
      if (this.fin) {
        const w = this.fin.w, l = this.fin.l;
        tx = (w.x + l.x) / 2; tz = 1.3; ty = -40;
        if (l.finishFx && l.finishFx.type === 'launch') { ty = Math.max(-500, l.finishFx.y || 0) * 0.5; tz = 1.1; }
      }
      const I = this.phase === 'intro' ? this.intro : null;
      if (I) {
        const t = this.pt;
        if (t < I.s1) { tx = JK.STAGE_W / 2 - 650 + (650 * t) / I.s1; tz = 0.9; ty = -30; }
        else if (t < I.s2) { tx = a.x - 150; tz = 2.1; ty = -40; }
        else if (t < I.s3) { tx = b.x + 150; tz = 2.1; ty = -40; }
        else { tx = (a.x + b.x) / 2; tz = 1.08; ty = -10; }
      }
      if (this.sfz) { tx = this.sfz.f.x + this.sfz.f.facing * 60; tz = 1.6; ty = -90; }
      if (d && d.phase === 'cast') tz = 1.5 + Math.min(0.6, d.t / (d.castLen || 110) * 0.6);
      c.z += (tz - c.z) * 0.1;
      const z = c.z * (1 + c.punch);
      const half = W / 2 / z;
      tx = JK.clamp(tx, half, JK.STAGE_W - half);
      c.x += (tx - c.x) * 0.14;
      c.y += (ty - c.y) * 0.12;
      c.punch *= 0.86;
      if (c.shakeT > 0) {
        c.shakeT--;
        c.sx = (Math.random() - 0.5) * c.shake * 2;
        c.sy = (Math.random() - 0.5) * c.shake * 2;
        if (c.shakeT === 0) c.shake = 0;
      } else { c.sx = c.sy = 0; }
    }

    // ------------------------------------------------------------ rendering
    // Interpolate the camera, fighters and projectiles between sim ticks, then draw.
    draw(ctx) {
      const smooth = JK.settings.smooth !== false;
      const ta = smooth ? JK.clamp(JK.tickAlpha ?? 1, 0, 1) : 1;
      // in slow motion the sim steps less than once per tick; blend across the whole step
      this.renderAlpha = !smooth ? 1 : this.slowing ? JK.clamp(this.slow.acc + ta * this.slow.rate, 0, 1) : ta;
      const c = this.cam, cp = this.camPrev;
      const save = { x: c.x, y: c.y, z: c.z, punch: c.punch };
      if (cp && ta < 1 && Math.abs(cp.x - c.x) < 300) {
        const z1 = c.z * (1 + c.punch);
        c.x = cp.x + (c.x - cp.x) * ta;
        c.y = cp.y + (c.y - cp.y) * ta;
        c.z = cp.z + (z1 - cp.z) * ta;
        c.punch = 0;
      }
      const moved = [];
      if (this.renderAlpha < 1) {
        for (const p of this.projectiles) {
          if (p.px === undefined || Math.abs(p.x - p.px) > 120) continue;
          moved.push([p, p.x, p.y]);
          p.x = p.px + (p.x - p.px) * this.renderAlpha;
          p.y = p.py + (p.y - p.py) * this.renderAlpha;
        }
      }
      try { this.drawScene(ctx); } finally {
        Object.assign(c, save);
        for (const [p, x, y] of moved) { p.x = x; p.y = y; }
      }
    }

    drawScene(ctx) {
      const c = this.cam;
      const z = c.z * (1 + c.punch);
      const cam = { x: c.x, y: c.y, z };
      const t = this.frame;
      const d = this.domain;
      ctx.save();
      ctx.translate(c.sx, c.sy);
      // slow camera roll during a domain cast for a dizzying, cinematic feel
      if (d && d.phase === 'cast') {
        ctx.translate(W / 2, H / 2);
        ctx.rotate(Math.sin(t * 0.045) * 0.02);
        ctx.scale(1.03, 1.03);
        ctx.translate(-W / 2, -H / 2);
      }
      // background
      if (d && (d.phase === 'expand' || d.phase === 'active')) {
        if (d.phase === 'expand') {
          this.stage.drawBack(ctx, cam, t);
          const k = JK.ease.inCubic(Math.min(1, d.t / 36));
          const ox = W / 2 + (d.owner.x - c.x) * z, oy = GY + (d.owner.y - 120 - c.y) * z;
          ctx.save();
          ctx.beginPath(); ctx.arc(ox, oy, 20 + k * 1500, 0, Math.PI * 2); ctx.clip();
          d.bg.drawBack(ctx, cam, t);
          ctx.restore();
          ctx.strokeStyle = JK.rgba(d.owner.ch.color, 0.9); ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(ox, oy, 20 + k * 1500, 0, Math.PI * 2); ctx.stroke();
        } else d.bg.drawBack(ctx, cam, t);
      } else if (d && d.phase === 'clash') {
        const c2 = d.clash;
        const ratio = JK.clamp(0.5 + (c2.a - c2.b) / Math.max(12, (c2.a + c2.b)) * 0.5, 0.15, 0.85);
        const ownerLeft = d.owner.x < d.def.x;
        const split = W * (ownerLeft ? ratio : 1 - ratio);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, split, H); ctx.clip();
        (ownerLeft ? d.bg : d.bg2).drawBack(ctx, cam, t);
        ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(split, 0, W - split, H); ctx.clip();
        (ownerLeft ? d.bg2 : d.bg).drawBack(ctx, cam, t);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
        ctx.beginPath();
        for (let y = 0; y <= H; y += 30) ctx.lineTo(split + (Math.random() - 0.5) * 24, y);
        ctx.stroke();
        JK.drawGlow(ctx, '#ffffff', split, H / 2, 300, 0.5);
        ctx.restore();
      } else {
        this.stage.drawBack(ctx, cam, t);
        if (this.fin && this.fin.bg) { ctx.save(); ctx.globalAlpha = this.fin.bgA || 0; this.fin.bg.drawBack(ctx, cam, t); ctx.restore(); }
      }
      // cast darkening
      if (d && d.phase === 'cast') {
        const k = Math.min(1, d.t / 30);
        ctx.fillStyle = `rgba(0,0,0,${0.75 * k})`;
        ctx.fillRect(0, 0, W, H);
        const ox = W / 2 + (d.owner.x - c.x) * z, oy = GY + (d.owner.y - 130 - c.y) * z;
        JK.drawGlow(ctx, d.owner.ch.aura, ox, oy, 380 * k, 0.6);
      }
      if (this.sfz) {
        const z = this.sfz, f = z.f;
        const k = Math.min(1, z.t / 8);
        ctx.fillStyle = `rgba(0,0,0,${0.7 * k})`;
        ctx.fillRect(0, 0, W, H);
        const sx = W / 2 + (f.x - c.x) * cam.z, sy = GY + (f.y - 120 - c.y) * cam.z;
        JK.drawGlow(ctx, f.ch.aura, sx, sy, 420, 0.5 * k);
        this.drawFocusLines(ctx, sx, sy, f.ch.aura, 0.8 * k);
      }
      if (d && d.phase === 'cast') {
        const sx = W / 2 + (d.owner.x - c.x) * cam.z, sy = GY + (d.owner.y - 130 - c.y) * cam.z;
        this.drawFocusLines(ctx, sx, sy, d.owner.ch.aura, Math.min(1, d.t / 40));
      }
      if (this.dim.t > 0) {
        ctx.fillStyle = `rgba(0,0,0,${this.dim.a * Math.min(1, this.dim.t / 10)})`;
        ctx.fillRect(0, 0, W, H);
      }
      // world
      ctx.save();
      ctx.translate(W / 2, GY);
      ctx.scale(z, z);
      ctx.translate(-c.x, -c.y);
      JK.FX.draw(ctx, 'back');
      if (d && d.simple && d.phase !== 'clash') {
        const f = d.def;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(160,220,255,0.75)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(f.x, 0, 120, 22, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,220,255,0.35)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(f.x, 0, 110, 18, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + this.frame * 0.02;
          ctx.fillStyle = 'rgba(200,240,255,0.7)';
          ctx.fillRect(f.x + Math.cos(a) * 120 - 2, Math.sin(a) * 22 - 2, 4, 4);
        }
        ctx.restore();
      }
      const order = this.p1.state === 'move' && this.p2.state !== 'move' ? [this.p2, this.p1] : [this.p1, this.p2];
      for (const f of order) this.drawFighter(ctx, f);
      for (const p of this.projectiles) if (p.d) p.d(ctx, p);
      JK.FX.draw(ctx, 'front');
      if (JK.settings.hitboxes) for (const p of this.projectiles) { const b = p.box(); ctx.strokeStyle = 'rgba(255,200,0,0.9)'; ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
      ctx.restore();
      // foreground
      if (d && d.phase === 'active') d.bg.drawFront(ctx, cam, t);
      else if (this.fin && this.fin.bg) this.fin.bg.drawFront(ctx, cam, t);
      else if (!(d && d.phase === 'clash')) this.stage.drawFront(ctx, cam, t);
      ctx.restore();

      // overlays
      if (d && d.phase === 'active' && d.id === 'malevolent_shrine' && !this.paused) {
        if (t % 2 === 0) {
          const x1 = c.x + (Math.random() - 0.5) * 1700, y1 = -700 + Math.random() * 400;
          const a = Math.random() * Math.PI;
          JK.FX.add({ type: 'cut', x1, y1, x2: x1 + Math.cos(a) * 900, y2: y1 + Math.abs(Math.sin(a)) * 900, w: 2.5, color: Math.random() < 0.5 ? '#ffffff' : '#ff4050', life: 10 });
        }
        if (t % 7 === 0) JK.FX.slashMarks(c.x + (Math.random() - 0.5) * 1100, -120 - Math.random() * 380, 1, '#ff3048', 1.4);
      }
      if (this.flash.a > 0) {
        ctx.fillStyle = JK.rgba(this.flash.color, Math.min(1, this.flash.a));
        ctx.fillRect(0, 0, W, H);
      }
      // vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      const cine = (d && (d.phase === 'cast' || d.phase === 'clash' || d.phase === 'expand')) || this.fin || this.phase === 'intro' || this.sfz || (d && d.trial);
      // pulsing domain-coloured vignette while a domain is active
      if (d && d.phase === 'active') {
        const pulse = 0.25 + Math.sin(t * 0.12) * 0.1;
        const dv = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
        dv.addColorStop(0, 'rgba(0,0,0,0)');
        dv.addColorStop(1, JK.rgba(d.info.vignette || d.owner.ch.color, d.info.vignette ? pulse + 0.15 : pulse));
        ctx.fillStyle = dv;
        ctx.fillRect(0, 0, W, H);
      }
      this.letterbox = JK.approach(this.letterbox || 0, cine ? 1 : 0, 0.08);
      if (this.letterbox > 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, 70 * this.letterbox);
        ctx.fillRect(0, H - 70 * this.letterbox, W, 70 * this.letterbox);
      }
      if (d && d.phase === 'cast') this.drawDomainTitle(ctx, d);
      if (d && d.trial) this.drawTrial(ctx, d);
      if (d && d.hk && d.phase === 'active' && !d.jackpot) this.drawSlots(ctx, d);
      if (this.phase === 'intro' && this.intro) this.drawIntro(ctx);
      if (d && d.phase === 'clash') this.drawClash(ctx, d);
      if (this.cut) this.drawCutIn(ctx);
      if (!cine) JK.HUD.draw(ctx, this);
      this.drawAnnounces(ctx);
      JK.FX.drawList(ctx, this.screenFx);
      if (this.negT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // Anime focus lines converging on a point (redrawn with new randomness every frame).
    drawFocusLines(ctx, cx, cy, color, k) {
      if (k <= 0) return;
      ctx.save();
      const R = Math.hypot(W, H);
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2;
        const inner = 170 + Math.random() * 260;
        const w = 0.004 + Math.random() * 0.012;
        ctx.fillStyle = i % 5 === 0 ? JK.rgba(color, 0.5 * k) : `rgba(255,255,255,${(0.12 + Math.random() * 0.25) * k})`;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
        ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
        ctx.fill();
      }
      ctx.restore();
    }

    drawIntro(ctx) {
      const I = this.intro, t = this.pt;
      const st = this.stage;
      if (t < I.s1) {
        const k = Math.min(1, t / 20), out = t > I.s1 - 15 ? (I.s1 - t) / 15 : 1;
        ctx.save();
        ctx.globalAlpha = k * out;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, H - 190, 560 * k, 90);
        ctx.fillStyle = '#c9a24a';
        ctx.fillRect(0, H - 190, 560 * k, 3);
        ctx.restore();
        JK.text(ctx, st.jp, 40, H - 168, { size: 22, align: 'left', font: JK.FONT_JP, color: '#c9a24a', alpha: k * out });
        JK.text(ctx, st.name, 40, H - 130, { size: 48, align: 'left', color: '#fff', stroke: '#000', strokeW: 6, alpha: k * out, spacing: 4 });
      }
      const card = (f, l, start, len, left) => {
        const lt = t - start;
        if (lt < 0 || lt >= len) return;
        const k = JK.ease.outCubic(Math.min(1, lt / 16));
        const out = lt > len - 12 ? (len - lt) / 12 : 1;
        const x = left ? 60 - 400 * (1 - k) : W - 60 + 400 * (1 - k);
        const al = left ? 'left' : 'right';
        ctx.save();
        ctx.globalAlpha = out;
        const g = ctx.createLinearGradient(left ? 0 : W, 0, left ? 700 : W - 700, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(left ? 0 : W - 700, 150, 700, 190);
        ctx.fillStyle = f.ch.color;
        ctx.fillRect(left ? 0 : W - 700 * k, 336, 700 * k, 4);
        ctx.restore();
        JK.text(ctx, f.ch.jp, x, 190, { size: 34, align: al, font: JK.FONT_JP, color: f.ch.color, stroke: '#000', strokeW: 5, alpha: out });
        JK.text(ctx, f.ch.name, x, 250, { size: 86, align: al, color: '#fff', stroke: '#000', strokeW: 9, alpha: out, spacing: 4, shadow: f.ch.color, shadowBlur: 24 });
        JK.text(ctx, (f.ch.costumeName ? f.ch.costumeName.toUpperCase() + '  ·  ' : '') + f.ch.title.toUpperCase(), x, 308, { size: 24, align: al, font: JK.FONT_UI, color: '#ddd', alpha: out, weight: 'bold' });
        // subtitle
        const sk = Math.min(1, Math.max(0, (lt - 10) / 12)) * out;
        JK.text(ctx, '\u201C' + l.text + '\u201D', W / 2, H - 110, { size: 34, color: '#fff', stroke: '#000', strokeW: 6, alpha: sk, font: JK.FONT_UI, weight: 'bold' });
      };
      card(this.p1, I.l1, I.s1, I.l1.len, true);
      card(this.p2, I.l2, I.s2, I.l2.len, false);
      if (t >= I.s3) {
        const lt = t - I.s3;
        const k = Math.min(1, lt / 8);
        ctx.save();
        ctx.translate(W / 2, H / 2 - 40);
        ctx.scale(1 + (1 - k) * 2.5, 1 + (1 - k) * 2.5);
        JK.text(ctx, '対', 0, -30, { size: 190, font: JK.FONT_JP, color: 'rgba(255,40,60,0.9)', stroke: '#000', strokeW: 8, alpha: k });
        JK.text(ctx, 'VS', 0, 60, { size: 120, color: '#fff', stroke: '#000', strokeW: 10, alpha: k, shadow: '#ff2040', shadowBlur: 30 });
        ctx.restore();
        JK.text(ctx, this.p1.ch.short, W / 2 - 330, H / 2 + 20, { size: 60, color: this.p1.ch.color, stroke: '#000', strokeW: 7, alpha: k });
        JK.text(ctx, this.p2.ch.short, W / 2 + 330, H / 2 + 20, { size: 60, color: this.p2.ch.color, stroke: '#000', strokeW: 7, alpha: k });
      }
      if (Math.floor(t / 30) % 2 === 0) JK.text(ctx, 'ENTER — SKIP', W - 20, 100, { size: 18, align: 'right', font: JK.FONT_UI, color: '#bbb', alpha: 0.8 });
    }

    drawFighter(ctx, f) {
      const F = f.finishFx;
      if (!F) { f.draw(ctx); return; }
      const k = F.t;
      if (F.type === 'disintegrate') {
        const p = Math.min(1, k / 70);
        ctx.save();
        ctx.beginPath();
        const edge = f.x - F.dir * 60 + F.dir * p * 180;
        if (F.dir > 0) ctx.rect(edge, -600, 800, 800); else ctx.rect(edge - 800, -600, 800, 800);
        ctx.clip();
        ctx.globalAlpha = 1 - p * 0.6;
        f.draw(ctx);
        ctx.restore();
        if (p < 1) for (let i = 0; i < 6; i++) JK.FX.add({ type: 'dot', x: edge + (Math.random() - 0.5) * 20, y: f.y - Math.random() * 230, vx: F.dir * (2 + Math.random() * 6), vy: -Math.random() * 3, r: 6 + Math.random() * 10, color: JK.pick(F.colors || ['#b060ff', '#ffffff', '#6a20c0']), life: 30 });
        if (p >= 1) f.hidden = true;
      } else if (F.type === 'split') {
        const s = Math.min(1, k / 50);
        const ang = F.ang;
        const cx = f.x, cy = f.y + F.cy;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const half = (sign, dx, dy, rot) => {
          ctx.save();
          ctx.beginPath();
          const L = 800;
          const ux = Math.cos(ang), uy = Math.sin(ang);
          ctx.moveTo(cx - ux * L, cy - uy * L);
          ctx.lineTo(cx + ux * L, cy + uy * L);
          ctx.lineTo(cx + ux * L + nx * L * sign, cy + uy * L + ny * L * sign);
          ctx.lineTo(cx - ux * L + nx * L * sign, cy - uy * L + ny * L * sign);
          ctx.closePath();
          ctx.clip();
          ctx.translate(dx, dy);
          ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
          f.draw(ctx);
          ctx.restore();
        };
        const slide = JK.ease.inQuad(s) * 130;
        const fall = Math.max(0, k - 34);
        half(1, 0, 0, 0);
        half(-1, Math.cos(ang) * slide * -f.facing, Math.min(110, Math.sin(ang) * slide + fall * fall * 0.08), -s * 0.9 * f.facing);
        if (k < 40) JK.drawGlow(ctx, F.glow || '#ff2040', cx, cy, 120 * (1 - k / 40), 0.8);
        if (k < 60 && k % 2 === 0) JK.FX.add({ type: 'dot', x: cx + (Math.random() - 0.5) * 80, y: cy + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, g: 0.3, r: 5, color: F.glow ? JK.pick([F.glow, '#fff4a0']) : '#c01020', life: 40 });
      } else if (F.type === 'sink') {
        ctx.save();
        ctx.beginPath(); ctx.rect(f.x - 400, -900, 800, 900); ctx.clip();
        ctx.translate(0, Math.min(280, k * 3.5));
        f.draw(ctx);
        ctx.restore();
      } else if (F.type === 'launch') {
        F.y = -k * k * 0.35;
        ctx.save();
        ctx.translate(f.x + F.dir * k * 3, F.y);
        ctx.rotate(k * 0.25 * F.dir);
        ctx.translate(-f.x, -f.y + 110);
        f.draw(ctx);
        ctx.restore();
        if (k === 60) JK.FX.add({ type: 'flash', x: f.x + F.dir * 180, y: -700, r: 60, color: '#ffffff', life: 40, layer: 'front' });
      }
    }

    drawDomainTitle(ctx, d) {
      const t = d.t;
      if (t < 20) return;
      const k = Math.min(1, (t - 20) / 14);
      const col = d.owner.ch.color;
      ctx.save();
      // brush stroke banner
      ctx.globalAlpha = k;
      const y = 200;
      // ragged ink-brush banner
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.beginPath();
      const rr = JK.rng(d.info.id.length * 97);
      ctx.moveTo(0, y - 80);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x * k, y - 86 + rr() * 16);
      for (let x = W; x >= 0; x -= 40) ctx.lineTo(x * k, y + 78 + rr() * 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = JK.rgba(col, 0.25);
      ctx.fillRect(0, y - 20, W * k, 40);
      ctx.fillStyle = JK.rgba(col, 0.9);
      ctx.fillRect(0, y - 92, W * k, 3);
      ctx.fillRect(W * (1 - k), y + 89, W * k, 3);
      const sc = 1 + (1 - JK.ease.outCubic(k)) * 0.8;
      ctx.translate(W / 2, y - 20);
      ctx.scale(sc, sc);
      JK.text(ctx, d.info.titleJp || '領域展開', 0, 0, { size: 96, font: JK.FONT_JP, color: '#ffffff', stroke: '#000', strokeW: 10, shadow: col, shadowBlur: 30 });
      ctx.restore();
      JK.text(ctx, d.info.title || 'DOMAIN EXPANSION', W / 2, y + 52, { size: 34, color: col, alpha: k, spacing: 12 });
      const nameAt = d.nameAt || 60;
      // extreme close-up on the caster's eye just before the name is spoken
      if (t > nameAt - 34 && t < nameAt + 14) {
        const e = t - (nameAt - 34);
        const bk = Math.min(1, e / 6) * Math.min(1, (nameAt + 14 - t) / 6);
        const by = 470, bh = 120;
        ctx.save();
        ctx.globalAlpha = bk;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, by - bh / 2 - 4, W, bh + 8);
        ctx.beginPath(); ctx.rect(0, by - bh / 2, W, bh); ctx.clip();
        const sc = 9;
        const left = d.owner.facing > 0;
        JK.drawPortrait(ctx, d.owner.ch, W / 2 - (left ? 8 : -8) * sc - (e * 1.2) * (left ? 1 : -1), by + 10.8 * sc, sc, { flip: !left, face: 'angry', eyesOpen: d.owner.id === 'gojo', glowEyes: true });
        JK.drawGlow(ctx, d.owner.ch.aura, W / 2, by, 220, 0.35);
        ctx.restore();
        ctx.fillStyle = JK.rgba(col, bk);
        ctx.fillRect(0, by - bh / 2 - 4, W, 3);
        ctx.fillRect(0, by + bh / 2 + 1, W, 3);
      }
      if (t > nameAt) {
        const k2 = Math.min(1, (t - nameAt) / 12);
        JK.text(ctx, d.info.jp, W / 2, H - 150, { size: 64, font: JK.FONT_JP, color: '#fff', stroke: '#000', strokeW: 8, alpha: k2, shadow: col, shadowBlur: 24 });
        JK.text(ctx, d.info.name, W / 2, H - 100, { size: 30, color: col, alpha: k2, spacing: 6 });
      }
      if (d.canClash && t < 70 && d.def === this.p1) {
        const blink = Math.floor(t / 6) % 2;
        JK.text(ctx, 'PRESS Q TO CLASH!', W / 2, 110, { size: 40, color: blink ? '#ffd040' : '#fff', stroke: '#000', strokeW: 6 });
      }
    }
    drawClash(ctx, d) {
      const c = d.clash;
      const tot = Math.max(1, c.a + c.b);
      const pa = c.a / tot;
      const ownerIsP1 = d.owner === this.p1;
      const p1v = ownerIsP1 ? pa : 1 - pa;
      const x = W / 2 - 300, y = H - 130;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 6, y - 6, 612, 38);
      ctx.fillStyle = this.p1.ch.color; ctx.fillRect(x, y, 600 * p1v, 26);
      ctx.fillStyle = this.p2.ch.color; ctx.fillRect(x + 600 * p1v, y, 600 * (1 - p1v), 26);
      JK.text(ctx, 'MASH  J / K / L / U / I / O !', W / 2, y - 30, { size: 34, color: Math.floor(d.t / 5) % 2 ? '#ffd040' : '#fff', stroke: '#000', strokeW: 6 });
      JK.text(ctx, String(Math.ceil((c.dur - d.t) / 60)), W / 2, 130, { size: 80, color: '#fff', stroke: '#000', strokeW: 8 });
    }
    drawCutIn(ctx) {
      const c = this.cut;
      const k = c.t < 10 ? JK.ease.outCubic(c.t / 10) : c.t > 48 ? 1 - (c.t - 48) / 12 : 1;
      const left = c.f === this.p1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, k);
      const y = 150;
      ctx.translate(left ? -W * (1 - k) : W * (1 - k), 0);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 40); ctx.lineTo(W, y + 90); ctx.lineTo(0, y + 130); ctx.fill();
      ctx.fillStyle = JK.rgba(c.f.ch.color, 0.85);
      ctx.fillRect(0, y + 124, W, 4);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 40); ctx.lineTo(W, y + 90); ctx.lineTo(0, y + 130); ctx.clip();
      JK.drawPortrait(ctx, c.f.ch, left ? 240 : W - 240, y + 70, 3.4, { flip: !left, face: 'shout', eyesOpen: c.f.eyesOpen });
      ctx.restore();
      JK.text(ctx, c.jp, left ? W - 330 : 330, y + 30, { size: 56, font: JK.FONT_JP, color: '#fff', stroke: '#000', strokeW: 8 });
      JK.text(ctx, c.name, left ? W - 330 : 330, y + 85, { size: 36, color: c.f.ch.color, spacing: 4 });
      ctx.restore();
    }
    drawAnnounces(ctx) {
      for (const a of this.announces) {
        if (a.t < 0) continue;
        const e = a.t / a.dur;
        const inT = Math.min(1, a.t / 8);
        const out = e > 0.8 ? 1 - (e - 0.8) / 0.2 : 1;
        const sc = 1 + (1 - JK.ease.outBack(inT)) * 1.5;
        let x = W / 2, y = H / 2 - 60;
        if (a.side) { x = a.side < 0 ? 320 : W - 320; y = H - 150; }
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc, sc);
        JK.text(ctx, a.text, 0, 0, { size: a.size, color: a.color, stroke: '#000', strokeW: Math.max(6, a.size / 10), alpha: out, shadow: a.glow, shadowBlur: 30 });
        ctx.restore();
        if (a.sub) JK.text(ctx, a.sub, x, y + a.size * 0.6 + 10, { size: Math.max(22, a.size * 0.3), color: '#ffe0a0', stroke: '#000', strokeW: 5, alpha: out * inT, spacing: 3 });
      }
    }
  }

  JK.Game = Game;
})();
