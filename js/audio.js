'use strict';
// Web Audio engine: synthesized SFX, a step sequencer for original music,
// optional user-supplied music files, and a speech-synthesis announcer.
JK.Audio = (function () {
  let ctx = null;
  let master, comp, musicBus, sfxBus, reverb, reverbIn, noiseBuf, distCurve;
  const A = {};

  A.init = function () {
    if (ctx) { A.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.connect(comp);
    comp.connect(ctx.destination);
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus.connect(master);
    // Reverb
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.8, 2.2);
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 1;
    reverbIn.connect(reverb);
    const revOut = ctx.createGain();
    revOut.gain.value = 0.55;
    reverb.connect(revOut);
    revOut.connect(master);
    // Noise buffer
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    distCurve = makeDist(40);
    A.applyVolumes();
    initCustomMusic();
    initClips();
  };
  A.resume = function () {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  A.ready = () => !!ctx;
  A.now = () => (ctx ? ctx.currentTime : 0);

  A.applyVolumes = function () {
    const s = JK.settings;
    if (!ctx) return;
    master.gain.setTargetAtTime(s.master, ctx.currentTime, 0.05);
    musicBus.gain.setTargetAtTime(s.music, ctx.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime(s.sfx, ctx.currentTime, 0.05);
    for (const k in custom) if (custom[k].el) custom[k].el.volume = musicVol(custom[k]);
    if (curCustomKey && !useCustom(curCustomKey)) { const w = wantedKey; wantedKey = null; A.playMusic(w); }
    else if (!curCustomKey && wantedKey && useCustom(wantedKey)) { const w = wantedKey; wantedKey = null; A.playMusic(w); }
  };

  function makeImpulse(dur, decay) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function makeDist(k) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * JK.DEG) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // ---------- low-level voices ----------
  function out(dest, rev = 0) {
    const g = ctx.createGain();
    g.connect(dest || sfxBus);
    if (rev > 0) {
      const s = ctx.createGain();
      s.gain.value = rev;
      g.connect(s);
      s.connect(reverbIn);
    }
    return g;
  }
  function tone(o) {
    // o: {type,f,f2,t,dur,vol,a,dest,rev,detune,glide}
    const t = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.glide ?? o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = out(o.dest, o.rev);
    const a = o.a ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.3, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + o.dur);
      f.Q.value = o.q ?? 1;
      node.connect(f);
      node = f;
    }
    if (o.dist) {
      const ws = ctx.createWaveShaper();
      ws.curve = distCurve;
      node.connect(ws);
      node = ws;
    }
    node.connect(g);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
    return osc;
  }
  function noise(o) {
    // o: {t,dur,vol,type,f,f2,q,a,dest,rev}
    const t = o.t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = o.type || 'bandpass';
    filt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) filt.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    filt.Q.value = o.q ?? 1;
    const g = out(o.dest, o.rev);
    const a = o.a ?? 0.002;
    g.gain.setValueAtTime(0.0001, t);
    if (o.swell) {
      g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t + o.dur * 0.95);
      g.gain.linearRampToValueAtTime(0.0001, t + o.dur);
    } else {
      g.gain.linearRampToValueAtTime(o.vol ?? 0.3, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    }
    src.connect(filt);
    filt.connect(g);
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.05);
  }
  A.tone = (o) => ctx && tone(o);
  A.noise = (o) => ctx && noise(o);

  // ---------- SFX ----------
  const S = {};
  S.whoosh = (p = 1) => {
    noise({ dur: 0.16, vol: 0.12, f: 500 * p, f2: 2400 * p, q: 1.2, a: 0.05 });
  };
  S.whooshHeavy = () => {
    noise({ dur: 0.24, vol: 0.18, f: 300, f2: 1600, q: 1, a: 0.08 });
  };
  S.hit = (power = 1) => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 160 * (1.2 - power * 0.2), f2: 45, dur: 0.12 + power * 0.08, vol: 0.5 + power * 0.2, t });
    noise({ t, dur: 0.05 + power * 0.03, vol: 0.35, f: 1800 - power * 500, q: 0.7 });
    if (power > 1) {
      tone({ type: 'square', f: 90, f2: 30, dur: 0.22, vol: 0.25, lp: 900, dist: true, t });
      noise({ t, dur: 0.25, vol: 0.18, type: 'lowpass', f: 900, f2: 200, rev: 0.3 });
    }
  };
  S.block = (infinity) => {
    const t = ctx.currentTime;
    if (infinity) {
      tone({ type: 'sine', f: 1760, f2: 1600, dur: 0.5, vol: 0.12, rev: 0.6, t });
      tone({ type: 'sine', f: 2637, dur: 0.35, vol: 0.06, rev: 0.6, t });
      noise({ t, dur: 0.08, vol: 0.08, type: 'highpass', f: 4000 });
    } else {
      tone({ type: 'triangle', f: 420, f2: 180, dur: 0.08, vol: 0.3, t });
      noise({ t, dur: 0.07, vol: 0.28, f: 3200, q: 2 });
    }
  };
  S.slash = (big) => {
    const t = ctx.currentTime;
    noise({ t, dur: big ? 0.25 : 0.14, vol: big ? 0.3 : 0.22, type: 'highpass', f: 2500, f2: 6000 });
    tone({ type: 'sine', f: big ? 3200 : 4200, f2: big ? 2600 : 3800, dur: big ? 0.5 : 0.3, vol: 0.06, rev: 0.4, t });
    tone({ type: 'sawtooth', f: 900, f2: 300, dur: 0.09, vol: 0.06, lp: 3000, t });
  };
  S.jump = () => noise({ dur: 0.12, vol: 0.08, f: 800, f2: 1600, q: 0.8 });
  S.land = () => {
    tone({ type: 'sine', f: 90, f2: 40, dur: 0.12, vol: 0.25 });
    noise({ dur: 0.08, vol: 0.08, type: 'lowpass', f: 700 });
  };
  S.dash = () => noise({ dur: 0.2, vol: 0.14, f: 700, f2: 3000, q: 1.2, a: 0.02 });
  S.step = (v = 1) => {
    const t = ctx.currentTime;
    noise({ t, dur: 0.05, vol: 0.05 * v, type: 'lowpass', f: 500 + Math.random() * 300, q: 0.7 });
    tone({ type: 'sine', f: 120 + Math.random() * 30, f2: 60, dur: 0.05, vol: 0.05 * v, t });
  };
  S.justGuard = () => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 1568, dur: 0.35, vol: 0.12, rev: 0.5, t });
    tone({ type: 'sine', f: 2349, dur: 0.25, vol: 0.07, rev: 0.5, t: t + 0.03 });
    noise({ t, dur: 0.05, vol: 0.12, type: 'highpass', f: 5000 });
  };
  S.deny = (v = 1) => {
    if (!v) return;
    const t = ctx.currentTime;
    tone({ type: 'square', f: 180, f2: 140, dur: 0.09, vol: 0.05 * v, lp: 1200, t });
    tone({ type: 'square', f: 180, f2: 140, dur: 0.09, vol: 0.05 * v, lp: 1200, t: t + 0.1 });
  };
  S.skid = () => noise({ dur: 0.28, vol: 0.1, f: 2200, f2: 900, q: 2, a: 0.01 });
  S.roll = () => {
    const t = ctx.currentTime;
    noise({ t, dur: 0.22, vol: 0.1, f: 500, f2: 1400, q: 0.9, a: 0.03 });
    tone({ type: 'sine', f: 90, f2: 50, dur: 0.12, vol: 0.18, t });
  };
  S.bodyfall = () => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 110, f2: 35, dur: 0.3, vol: 0.5, t });
    noise({ t, dur: 0.25, vol: 0.18, type: 'lowpass', f: 600, f2: 150 });
  };
  S.charge = (f = 300, dur = 0.5) => {
    const t = ctx.currentTime;
    tone({ type: 'sawtooth', f, f2: f * 3, dur, vol: 0.07, lp: 1200, lp2: 5000, a: dur * 0.8, rev: 0.3, t });
    noise({ t, dur, vol: 0.1, f: 800, f2: 5000, q: 3, swell: true });
  };
  S.blue = () => {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone({ type: 'sine', f: 220 * (i + 1), f2: 880 * (i + 1), dur: 0.7, vol: 0.08, a: 0.3, rev: 0.5, t });
    noise({ t, dur: 0.8, vol: 0.2, f: 3000, f2: 300, q: 4, swell: true });
    tone({ type: 'sine', f: 55, f2: 40, dur: 1.0, vol: 0.35, a: 0.2, t });
  };
  S.red = () => {
    const t = ctx.currentTime;
    tone({ type: 'sawtooth', f: 200, f2: 60, dur: 0.6, vol: 0.18, lp: 3000, lp2: 300, dist: true, t });
    tone({ type: 'sine', f: 70, f2: 30, dur: 0.7, vol: 0.5, t });
    noise({ t, dur: 0.6, vol: 0.35, type: 'lowpass', f: 3000, f2: 200, rev: 0.4 });
  };
  S.purple = () => {
    const t = ctx.currentTime;
    tone({ type: 'sawtooth', f: 55, dur: 2.5, vol: 0.2, lp: 400, lp2: 3000, dist: true, a: 0.1, rev: 0.4, t });
    tone({ type: 'sine', f: 40, f2: 25, dur: 2.5, vol: 0.5, t });
    noise({ t, dur: 2.4, vol: 0.4, type: 'bandpass', f: 400, f2: 3000, q: 0.6, rev: 0.5 });
    [261.6, 311.1, 392, 466.2].forEach((f, i) => tone({ type: 'sine', f: f * 2, dur: 2.2, vol: 0.05, a: 0.6, rev: 0.8, t: t + i * 0.04 }));
  };
  S.purpleCharge = () => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 110, f2: 880, dur: 1.2, vol: 0.09, a: 1.0, rev: 0.7, t });
    tone({ type: 'sine', f: 131, f2: 1046, dur: 1.2, vol: 0.07, a: 1.0, rev: 0.7, t });
    noise({ t, dur: 1.2, vol: 0.2, f: 400, f2: 6000, q: 5, swell: true });
  };
  S.blackFlash = () => {
    const t = ctx.currentTime;
    // reverse swell into a distorted impact and crackling arcs
    noise({ t: t, dur: 0.06, vol: 0.5, type: 'highpass', f: 1500 });
    tone({ type: 'square', f: 120, f2: 25, dur: 0.6, vol: 0.35, lp: 2000, lp2: 100, dist: true, t });
    tone({ type: 'sine', f: 60, f2: 20, dur: 0.9, vol: 0.7, t });
    noise({ t, dur: 0.9, vol: 0.35, type: 'lowpass', f: 5000, f2: 150, rev: 0.6 });
    for (let i = 0; i < 12; i++) {
      const tt = t + 0.02 + Math.random() * 0.45;
      noise({ t: tt, dur: 0.02 + Math.random() * 0.03, vol: 0.25, type: 'highpass', f: 3000 + Math.random() * 4000 });
    }
  };
  S.fire = () => {
    const t = ctx.currentTime;
    noise({ t, dur: 1.0, vol: 0.4, type: 'lowpass', f: 1500, f2: 300, a: 0.05, rev: 0.3 });
    tone({ type: 'sawtooth', f: 80, f2: 40, dur: 0.8, vol: 0.2, lp: 600, dist: true, t });
    for (let i = 0; i < 16; i++) noise({ t: t + Math.random() * 0.9, dur: 0.02, vol: 0.12, type: 'highpass', f: 2000 + Math.random() * 3000 });
  };
  S.explosion = (big = 1) => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 90, f2: 25, dur: 0.8 * big, vol: 0.7, t });
    tone({ type: 'square', f: 60, f2: 20, dur: 0.6 * big, vol: 0.25, lp: 800, dist: true, t });
    noise({ t, dur: 1.1 * big, vol: 0.45, type: 'lowpass', f: 4000, f2: 120, rev: 0.5 });
  };
  S.teleport = () => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 2000, f2: 400, dur: 0.12, vol: 0.12, t });
    tone({ type: 'sine', f: 300, f2: 2400, dur: 0.12, vol: 0.1, t: t + 0.1, rev: 0.5 });
    noise({ t, dur: 0.18, vol: 0.12, type: 'highpass', f: 5000 });
  };
  S.clap = () => {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) noise({ t: t + i * 0.012, dur: 0.06, vol: 0.4, f: 1400, q: 1.5, rev: 0.6 });
  };
  S.gong = () => {
    const t = ctx.currentTime;
    [1, 2.4, 3.9, 5.2, 6.8].forEach((r, i) => tone({ type: 'sine', f: 62 * r, dur: 4 - i * 0.5, vol: 0.25 / (i + 1), a: 0.01, rev: 0.9, t }));
    noise({ t, dur: 0.3, vol: 0.15, type: 'lowpass', f: 900 });
  };
  S.domain = () => {
    const t = ctx.currentTime;
    S.clap();
    S.gong();
    tone({ type: 'sawtooth', f: 36.7, dur: 3.5, vol: 0.2, lp: 200, lp2: 1200, a: 1.2, rev: 0.4, t });
    noise({ t: t + 0.4, dur: 2.2, vol: 0.3, f: 200, f2: 4000, q: 1, swell: true, rev: 0.5 });
  };
  S.shatter = () => {
    const t = ctx.currentTime;
    noise({ t, dur: 0.6, vol: 0.4, type: 'highpass', f: 3000, f2: 8000, rev: 0.4 });
    for (let i = 0; i < 26; i++) tone({ type: 'sine', f: 2000 + Math.random() * 5000, dur: 0.2 + Math.random() * 0.6, vol: 0.05, t: t + Math.random() * 0.4, rev: 0.6 });
    tone({ type: 'sine', f: 80, f2: 30, dur: 0.6, vol: 0.4, t });
  };
  S.ko = () => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 70, f2: 20, dur: 1.8, vol: 0.8, t });
    noise({ t, dur: 2.2, vol: 0.4, type: 'lowpass', f: 3000, f2: 80, rev: 0.9 });
    tone({ type: 'sawtooth', f: 110, f2: 55, dur: 1.5, vol: 0.12, lp: 1200, rev: 0.8, t });
  };
  S.bell = () => {
    const t = ctx.currentTime;
    [1, 2.76, 5.4].forEach((r, i) => tone({ type: 'sine', f: 880 * r, dur: 1.4 - i * 0.3, vol: 0.12 / (i + 1), rev: 0.6, t }));
  };
  S.select = () => tone({ type: 'square', f: 880, f2: 1320, dur: 0.06, vol: 0.06, lp: 3000 });
  S.move = () => tone({ type: 'triangle', f: 660, dur: 0.05, vol: 0.07 });
  S.confirm = () => {
    const t = ctx.currentTime;
    tone({ type: 'square', f: 660, dur: 0.08, vol: 0.07, lp: 3000, t });
    tone({ type: 'square', f: 990, dur: 0.14, vol: 0.07, lp: 3000, t: t + 0.07 });
    noise({ t, dur: 0.2, vol: 0.06, type: 'highpass', f: 4000, rev: 0.4 });
  };
  S.back = () => tone({ type: 'triangle', f: 440, f2: 220, dur: 0.1, vol: 0.08 });
  S.cleave = () => {
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      noise({ t: t + i * 0.05, dur: 0.07, vol: 0.2, type: 'highpass', f: 3000 + i * 400 });
      tone({ type: 'sine', f: 3800 - i * 200, dur: 0.12, vol: 0.04, t: t + i * 0.05 });
    }
  };
  S.throwGrab = () => {
    tone({ type: 'triangle', f: 200, f2: 120, dur: 0.1, vol: 0.2 });
    noise({ dur: 0.08, vol: 0.12, f: 600 });
  };
  S.heartbeat = (v = 1) => {
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 70, f2: 38, dur: 0.22, vol: 0.7 * v, t });
    tone({ type: 'sine', f: 62, f2: 34, dur: 0.26, vol: 0.55 * v, t: t + 0.16 });
  };
  S.impact = () => {
    // huge cinematic hit: sub drop + distorted crack + long tail
    const t = ctx.currentTime;
    tone({ type: 'sine', f: 55, f2: 18, dur: 1.6, vol: 0.9, t });
    tone({ type: 'square', f: 110, f2: 28, dur: 0.7, vol: 0.3, lp: 1400, lp2: 90, dist: true, t });
    noise({ t, dur: 1.8, vol: 0.5, type: 'lowpass', f: 6000, f2: 90, rev: 0.9 });
    noise({ t, dur: 0.05, vol: 0.6, type: 'highpass', f: 2500 });
  };
  S.riser = (dur = 1.5) => {
    const t = ctx.currentTime;
    noise({ t, dur, vol: 0.28, f: 300, f2: 7000, q: 2, swell: true, rev: 0.5 });
    tone({ type: 'sawtooth', f: 80, f2: 640, dur, vol: 0.08, lp: 600, lp2: 4000, a: dur * 0.9, t });
  };
  S.burnout = () => tone({ type: 'sawtooth', f: 300, f2: 80, dur: 0.5, vol: 0.08, lp: 1500 });

  A.sfx = function (name, ...args) {
    if (!ctx || !S[name]) return;
    try { S[name](...args); } catch (e) { /* audio errors are non-fatal */ }
  };

  // ---------- Music: instruments ----------
  const I = {};
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  I.kick = (t, f, d, v, dst) => {
    tone({ type: 'sine', f: 150, f2: 42, glide: 0.1, dur: 0.35, vol: 0.9 * v, t, dest: dst });
    noise({ t, dur: 0.015, vol: 0.2 * v, type: 'highpass', f: 2000, dest: dst });
  };
  I.snare = (t, f, d, v, dst) => {
    noise({ t, dur: 0.18, vol: 0.4 * v, f: 1900, q: 0.8, dest: dst, rev: 0.2 });
    tone({ type: 'triangle', f: 190, f2: 150, dur: 0.1, vol: 0.3 * v, t, dest: dst });
  };
  I.clap = (t, f, d, v, dst) => {
    for (let i = 0; i < 3; i++) noise({ t: t + i * 0.011, dur: 0.08, vol: 0.3 * v, f: 1300, q: 1.2, dest: dst, rev: 0.3 });
  };
  I.hat = (t, f, d, v, dst) => noise({ t, dur: 0.035, vol: 0.14 * v, type: 'highpass', f: 7500, dest: dst });
  I.ohat = (t, f, d, v, dst) => noise({ t, dur: 0.22, vol: 0.1 * v, type: 'highpass', f: 6500, dest: dst });
  I.shaker = (t, f, d, v, dst) => noise({ t, dur: 0.06, vol: 0.07 * v, type: 'bandpass', f: 6000, q: 2, a: 0.02, dest: dst });
  I.taiko = (t, f, d, v, dst) => {
    tone({ type: 'sine', f: 95, f2: 52, glide: 0.25, dur: 0.7, vol: 0.9 * v, t, dest: dst, rev: 0.35 });
    noise({ t, dur: 0.12, vol: 0.35 * v, type: 'lowpass', f: 500, dest: dst, rev: 0.3 });
  };
  I.rim = (t, f, d, v, dst) => {
    tone({ type: 'square', f: 1700, dur: 0.03, vol: 0.08 * v, lp: 4000, t, dest: dst, rev: 0.3 });
  };
  I.cymbal = (t, f, d, v, dst) => noise({ t, dur: 1.8, vol: 0.12 * v, type: 'highpass', f: 5000, dest: dst, rev: 0.5 });
  I.swell = (t, f, d, v, dst) => noise({ t, dur: d, vol: 0.2 * v, f: 500, f2: 6000, q: 1, swell: true, dest: dst, rev: 0.6 });
  I.bass = (t, f, d, v, dst) => {
    tone({ type: 'sawtooth', f, dur: d + 0.05, vol: 0.22 * v, lp: 900, lp2: 200, q: 3, t, dest: dst });
    tone({ type: 'sine', f: f / 2, dur: d + 0.05, vol: 0.3 * v, t, dest: dst });
  };
  I.sub = (t, f, d, v, dst) => {
    tone({ type: 'sine', f, dur: d + 0.3, vol: 0.55 * v, a: 0.005, dist: true, lp: 300, t, dest: dst });
  };
  I.pad = (t, f, d, v, dst) => {
    [-8, 0, 7].forEach((dt) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = dt;
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = 1100;
      const g = out(dst, 0.5);
      const a = Math.min(0.6, d * 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045 * v, t + a);
      g.gain.setValueAtTime(0.045 * v, t + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
      o.connect(fl); fl.connect(g);
      o.start(t); o.stop(t + d + 1);
    });
  };
  I.choir = (t, f, d, v, dst) => {
    [0, 5].forEach((dt) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = dt;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5;
      const lg = ctx.createGain();
      lg.gain.value = 4;
      lfo.connect(lg); lg.connect(o.detune);
      const g = out(dst, 0.8);
      [700, 1150].forEach((ff) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 6;
        o.connect(bp); bp.connect(g);
      });
      const a = Math.min(0.8, d * 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16 * v, t + a);
      g.gain.setValueAtTime(0.16 * v, t + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.2);
      o.start(t); o.stop(t + d + 1.3);
      lfo.start(t); lfo.stop(t + d + 1.3);
    });
  };
  I.pluck = (t, f, d, v, dst) => {
    tone({ type: 'triangle', f, dur: 0.9, vol: 0.2 * v, t, dest: dst, rev: 0.3 });
    tone({ type: 'sawtooth', f, dur: 0.35, vol: 0.08 * v, lp: 4000, lp2: 500, t, dest: dst, rev: 0.3 });
  };
  I.koto = (t, f, d, v, dst) => {
    tone({ type: 'triangle', f, dur: 1.4, vol: 0.2 * v, t, dest: dst, rev: 0.45 });
    tone({ type: 'sine', f: f * 2, dur: 0.6, vol: 0.08 * v, t, dest: dst, rev: 0.45 });
    noise({ t, dur: 0.02, vol: 0.05 * v, type: 'highpass', f: 3000, dest: dst });
  };
  I.shamisen = (t, f, d, v, dst) => {
    tone({ type: 'square', f, dur: 0.35, vol: 0.09 * v, lp: 3500, lp2: 600, q: 4, t, dest: dst, rev: 0.25 });
    noise({ t, dur: 0.02, vol: 0.12 * v, f: 2500, q: 2, dest: dst });
  };
  I.bell = (t, f, d, v, dst) => {
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const mg = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(1, t + 1.6);
    mod.connect(mg); mg.connect(car.frequency);
    const g = out(dst, 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    car.connect(g);
    car.start(t); mod.start(t);
    car.stop(t + 2.5); mod.stop(t + 2.5);
  };
  I.piano = (t, f, d, v, dst) => {
    tone({ type: 'triangle', f, dur: 1.6, vol: 0.2 * v, lp: 2500, lp2: 700, t, dest: dst, rev: 0.4 });
    tone({ type: 'sine', f: f * 2, dur: 0.8, vol: 0.06 * v, t, dest: dst, rev: 0.4 });
  };
  I.lead = (t, f, d, v, dst) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(10, t + Math.min(0.4, d));
    lfo.connect(lg); lg.connect(o.detune);
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 2400; fl.Q.value = 2;
    const g = out(dst, 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09 * v, t + 0.02);
    g.gain.setValueAtTime(0.08 * v, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
    o.connect(fl); fl.connect(g);
    o.start(t); lfo.start(t);
    o.stop(t + d + 0.3); lfo.stop(t + d + 0.3);
  };
  I.flute = (t, f, d, v, dst) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.5;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.012, t + d * 0.6);
    lfo.connect(lg); lg.connect(o.frequency);
    const g = out(dst, 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16 * v, t + 0.07);
    g.gain.setValueAtTime(0.14 * v, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
    o.connect(g);
    o.start(t); lfo.start(t);
    o.stop(t + d + 0.4); lfo.stop(t + d + 0.4);
    noise({ t, dur: d + 0.2, vol: 0.025 * v, f: f * 2, q: 3, a: 0.06, dest: dst, rev: 0.5 });
  };
  I.strings = (t, f, d, v, dst) => {
    [-6, 6].forEach((dt) => tone({ type: 'sawtooth', f, detune: dt, dur: d + 0.15, a: 0.03, vol: 0.06 * v, lp: 2200, t, dest: dst, rev: 0.4 }));
  };
  I.arp = (t, f, d, v, dst) => {
    tone({ type: 'square', f, dur: 0.18, vol: 0.06 * v, lp: 3000, lp2: 800, q: 5, t, dest: dst, rev: 0.35 });
  };
  I.drone = (t, f, d, v, dst) => {
    tone({ type: 'sawtooth', f, dur: d + 0.8, vol: 0.12 * v, a: d * 0.3, lp: 350, q: 4, t, dest: dst, rev: 0.4 });
    tone({ type: 'sine', f: f / 2, dur: d + 0.8, vol: 0.2 * v, a: d * 0.3, t, dest: dst });
  };
  I.revbell = (t, f, d, v, dst) => {
    // reversed-feeling swell of a bright tone
    tone({ type: 'sine', f, dur: d, vol: 0.001, t, dest: dst });
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    const g = out(dst, 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1 * v, t + d * 0.95);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g); o.start(t); o.stop(t + d + 0.05);
  };

  // ---------- Music: pattern parsing & sequencer ----------
  const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function noteToMidi(s) {
    const m = /^([a-g])(#|b)?(-?\d)$/.exec(s);
    if (!m) return 60;
    let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return n + (parseInt(m[3], 10) + 1) * 12;
  }
  // Pattern: whitespace-separated steps. "." rest; "x"/"X" hits; "c4" note; "c4+e4+g4:8" chord lasting 8 steps.
  function parse(str) {
    const steps = str.trim().split(/\s+/);
    return steps.map((tok) => {
      if (tok === '.' || tok === '-') return null;
      let len = 1, vel = 1;
      let body = tok;
      if (body.includes(':')) {
        const [b, l] = body.split(':');
        body = b;
        len = parseFloat(l);
      }
      if (body === 'x') return { notes: [0], len, vel: 0.8 };
      if (body === 'X') return { notes: [0], len, vel: 1.15 };
      if (body === 'o') return { notes: [0], len, vel: 0.45 };
      if (body.endsWith('!')) { vel = 1.25; body = body.slice(0, -1); }
      if (body.endsWith('?')) { vel = 0.6; body = body.slice(0, -1); }
      return { notes: body.split('+').map((n) => midi(noteToMidi(n))), len, vel };
    });
  }
  A.parsePattern = parse;

  const songs = {};
  A.songs = songs;
  A.defineSong = function (name, def) {
    def.tracks.forEach((tr) => { tr.steps = parse(tr.p); });
    songs[name] = def;
  };

  let cur = null;
  let schedTimer = null;

  function stopSynthSong(fade = 0.6) {
    if (!cur) return;
    const c = cur;
    cur = null;
    try {
      c.gain.gain.cancelScheduledValues(ctx.currentTime);
      c.gain.gain.setValueAtTime(c.gain.gain.value, ctx.currentTime);
      c.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
      setTimeout(() => c.gain.disconnect(), fade * 1000 + 3000);
    } catch (e) { /* ignore */ }
  }
  function scheduler() {
    if (!cur || !ctx) return;
    const song = cur.song;
    const stepDur = 60 / song.bpm / 4;
    while (cur.nextTime < ctx.currentTime + 0.15) {
      if (song.once && cur.step >= song.once) return;
      const step = cur.step;
      for (const tr of song.tracks) {
        const ev = tr.steps[step % tr.steps.length];
        if (!ev) continue;
        const inst = I[tr.i];
        if (!inst) continue;
        const swing = song.swing && step % 2 === 1 ? stepDur * song.swing : 0;
        for (const f of ev.notes) {
          try { inst(cur.nextTime + swing, f * (tr.oct || 1), ev.len * stepDur, ev.vel * (tr.v ?? 1), cur.gain); } catch (e) { /* ignore */ }
        }
      }
      cur.step++;
      cur.nextTime += stepDur;
    }
  }

  // ---------- File-based music (OST + user overrides) ----------
  // Each key tries its candidates in order. Files dropped into music/ (see PUT_YOUR_MUSIC_HERE.txt)
  // win over the bundled soundtrack in audio/ost/, which wins over the synthesized tracks.
  const SOUNDTRACK = {
    menu: ['music/menu', 'audio/ost/delirious.mp3'],
    stage_jujutsu_high: ['music/stage_jujutsu_high', 'audio/ost/acrux.mp3'],
    stage_shibuya: ['music/stage_shibuya', 'audio/ost/with_rage.mp3'],
    stage_shinjuku: ['music/stage_shinjuku', 'audio/ost/defeat_here.mp3'],
    stage_kyoto: ['music/stage_kyoto', 'audio/ost/delirious.mp3'],
    domain_gojo: ['music/unlimited_void'], domain_sukuna: ['music/malevolent_shrine'],
    domain_yuji: ['music/yuji_domain'], domain_megumi: ['music/chimera_shadow_garden'],
    domain_jogo: ['music/coffin_of_the_iron_mountain'],
    domain_higuruma: ['music/deadly_sentencing', 'audio/ost/deadly_sentencing.mp3'], domain_nanami: ['music/overtime'],
    domain_yuta: ['music/authentic_mutual_love', 'audio/ost/this_is_pure_love.mp3'],
    domain_hakari: ['music/idle_death_gamble', 'audio/ost/private_pure_love_train.mp3'],
    jackpot: ['music/jackpot', 'audio/ost/jackpot.mp3'],
    victory: ['music/victory'],
  };
  A.SOUNDTRACK = SOUNDTRACK;
  const custom = {};
  function initCustomMusic() {
    for (const key in SOUNDTRACK) {
      const urls = [];
      for (const c of SOUNDTRACK[key]) {
        if (/\.\w+$/.test(c)) urls.push({ url: c, bundled: c.startsWith('audio/') });
        else urls.push({ url: c + '.mp3' }, { url: c + '.ogg' });
      }
      tryCustom(key, urls);
    }
  }
  function tryCustom(key, urls) {
    if (!urls.length) return;
    const { url, bundled } = urls[0];
    const el = new Audio();
    el.preload = 'auto';
    el.loop = key !== 'victory' && key !== 'jackpot';
    const entry = custom[key] || { el: null, ok: false };
    custom[key] = entry;
    el.addEventListener('canplaythrough', () => {
      if (entry.ok) return;
      entry.ok = true;
      entry.el = el;
      entry.bundled = !!bundled;
      el.volume = musicVol(entry);
      // the file finished loading after its synthesized stand-in started: swap it in
      if (wantedKey === key && curCustomKey !== key && useCustom(key)) { wantedKey = null; A.playMusic(key, { fadeIn: 1 }); }
    }, { once: true });
    el.addEventListener('error', () => { if (!entry.ok) tryCustom(key, urls.slice(1)); }, { once: true });
    el.src = url;
  }
  // OST masters are loud; keep them level with the synthesized score.
  function musicVol(entry) { return Math.min(1, JK.settings.master * JK.settings.music * (entry && entry.bundled ? 0.75 : 1)); }
  // Bundled OST can be switched off in Options (user files in music/ always play).
  function useCustom(key) {
    const e = custom[key];
    return !!(e && e.ok && (!e.bundled || JK.settings.ost !== false));
  }

  // ---------- Voice/SFX clips (audio files) ----------
  const CLIPS = {
    gojo_domain: 'audio/sfx/gojo_domain.mp3',
    sukuna_domain: 'audio/sfx/sukuna_domain.mp3',
    hollow_purple: 'audio/sfx/hollow_purple.mp3',
    fuga: 'audio/sfx/fuga.mp3',
    domain_generic: 'audio/sfx/domain_generic.mp3',
    higuruma_domain: 'audio/sfx/higuruma_domain.mp3',
    gojo_intro: 'audio/sfx/gojo_intro.mp3',
    sukuna_intro: 'audio/sfx/sukuna_intro.mp3',
  };
  const clips = {};
  // Recorded sound effects (generated with Higgsfield Seed Audio), layered over the synth SFX.
  const SAMPLES = {
    gavel: 'audio/sfx/gen/gavel.mp3', execution: 'audio/sfx/gen/execution.mp3', domain_boom: 'audio/sfx/gen/domain_boom.mp3',
    heavy_hit: 'audio/sfx/gen/heavy_hit.mp3', sword_manifest: 'audio/sfx/gen/sword_manifest.mp3', critical: 'audio/sfx/gen/critical.mp3',
    slot_spin: 'audio/sfx/gen/slot_spin.mp3', jackpot: 'audio/sfx/gen/jackpot.mp3', shutter: 'audio/sfx/gen/shutter.mp3',
    rika: 'audio/sfx/gen/rika.mp3', katana: 'audio/sfx/gen/katana.mp3',
  };
  const samples = {};
  A.sample = function (k, vol = 1) {
    const s = samples[k];
    if (!s || !s.ok) return false;
    const el = s.el.cloneNode();
    el.volume = JK.clamp(JK.settings.master * JK.settings.sfx * vol, 0, 1);
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  };
  function initClips() {
    for (const k in SAMPLES) {
      const el = new Audio();
      el.preload = 'auto';
      const entry = { el, ok: false };
      el.addEventListener('canplaythrough', () => { entry.ok = true; }, { once: true });
      el.src = SAMPLES[k];
      samples[k] = entry;
    }
    for (const k in CLIPS) {
      const el = new Audio();
      el.preload = 'auto';
      const entry = { el, ok: false };
      el.addEventListener('canplaythrough', () => { entry.ok = true; }, { once: true });
      el.src = CLIPS[k];
      clips[k] = entry;
    }
  }
  A.hasClip = (k) => !!(clips[k] && clips[k].ok) && JK.settings.ost !== false;
  A.clipDuration = (k) => (clips[k] && clips[k].ok && isFinite(clips[k].el.duration) ? clips[k].el.duration : 0);
  A.playClip = function (k, opts = {}) {
    const c = clips[k];
    if (!c || !c.ok) return false;
    try {
      const el = c.el;
      el.pause();
      el.currentTime = opts.offset || 0;
      el.volume = Math.min(1, JK.settings.master * JK.settings.sfx * (opts.vol ?? 1));
      el.play().catch(() => {});
      return true;
    } catch (e) { return false; }
  };
  A.stopClip = function (k) {
    const c = clips[k];
    if (c && c.ok) { try { c.el.pause(); } catch (e) { /* ignore */ } }
  };
  A.stopAllClips = function () { for (const k in clips) A.stopClip(k); };
  A.hasCustom = useCustom;
  A.currentTrack = () => wantedKey;
  let curCustomKey = null;
  let wantedKey = null;
  function stopCustom() {
    if (curCustomKey && custom[curCustomKey] && custom[curCustomKey].el) {
      const el = custom[curCustomKey].el;
      const start = el.volume;
      let k = 0;
      const iv = setInterval(() => {
        k++;
        el.volume = Math.max(0, start * (1 - k / 10));
        if (k >= 10) { clearInterval(iv); el.pause(); }
      }, 40);
    }
    curCustomKey = null;
  }

  A.playMusic = function (name, opts = {}) {
    if (!ctx) return;
    if (wantedKey === name && !opts.restart) return;
    wantedKey = name;
    stopSynthSong(opts.fade ?? 0.8);
    stopCustom();
    if (useCustom(name)) {
      const e = custom[name];
      const el = e.el;
      // looping stage themes resume where they left off unless a restart is wanted from the top
      if (opts.restart !== false || el.ended) el.currentTime = 0;
      el.volume = opts.fadeIn ? 0 : musicVol(e);
      el.play().catch(() => {});
      curCustomKey = name;
      if (opts.fadeIn) fadeEl(el, musicVol(e), opts.fadeIn);
      return;
    }
    const song = songs[name];
    if (!song) return;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(song.vol ?? 0.8, ctx.currentTime + (opts.fadeIn ?? 0.4));
    g.connect(musicBus);
    cur = { song, step: 0, nextTime: ctx.currentTime + 0.08, gain: g };
    if (!schedTimer) schedTimer = setInterval(scheduler, 25);
  };
  A.stopMusic = function (fade = 0.8) {
    wantedKey = null;
    stopSynthSong(fade);
    stopCustom();
  };
  function fadeEl(el, target, secs) {
    if (el._fade) clearInterval(el._fade);
    const start = el.volume, steps = Math.max(1, Math.round(secs * 25));
    let k = 0;
    el._fade = setInterval(() => {
      k++;
      el.volume = Math.max(0, Math.min(1, start + (target - start) * (k / steps)));
      if (k >= steps) { clearInterval(el._fade); el._fade = null; }
    }, 40);
  }
  A.duckMusic = function (amount, dur) {
    if (!ctx) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(JK.settings.music * amount, t);
    musicBus.gain.linearRampToValueAtTime(JK.settings.music, t + dur);
    if (curCustomKey && custom[curCustomKey] && custom[curCustomKey].el) {
      const e = custom[curCustomKey];
      e.el.volume = musicVol(e) * amount;
      fadeEl(e.el, musicVol(e), dur);
    }
  };

  // ---------- Announcer (speech synthesis) ----------
  let voices = [];
  function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
  if (window.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  A.hasJapaneseVoice = () => voices.some((v) => /^ja/i.test(v.lang));
  A.say = function (text, opts = {}) {
    if (!JK.settings.voice || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const lang = opts.lang || 'en-US';
      const v = voices.find((vv) => vv.lang && vv.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()) && /male|david|ichiro|keita|guy|mark/i.test(vv.name))
        || voices.find((vv) => vv.lang && vv.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
      if (!v && lang.startsWith('ja')) return false;
      if (v) u.voice = v;
      u.lang = lang;
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.pitch ?? 0.6;
      u.volume = Math.min(1, JK.settings.master * 1.1);
      if (opts.cancel !== false) speechSynthesis.cancel();
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  };

  return A;
})();
