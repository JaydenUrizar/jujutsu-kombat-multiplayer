// Netplay determinism harness (Node, no dependencies).
// Builds TWO isolated VM sandboxes, each loading the game's simulation modules with
// browser stubs — exactly like two players' browser tabs. Each instance runs a JK.Game
// fed identical input scripts and the same seed. If any state diverges — a missed
// Math.random in the sim, a non-deterministic branch — the hashes split and the test
// fails with the first diverging tick.
//
//   node tools/desync-test.mjs            (run from the project root)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- browser stubs
function canvasStub() {
  return {
    width: 300, height: 300, style: {},
    getContext: () => ctxStub(),
  };
}
function ctxStub() {
  const grad = { addColorStop: () => {} };
  return new Proxy({}, {
    get(t, p) {
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return () => grad;
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (typeof p === 'string' && !(p in t)) return () => undefined;
      return t[p];
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
const audioParam = {
  value: 0,
  setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {},
  setTargetAtTime: () => {}, cancelScheduledValues: () => {}, cancelAndHoldAtTime: () => {},
};
function audioNode() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'gain' || p === 'frequency' || p === 'Q' || p === 'playbackRate' || p === 'pan' || p === 'detune') return audioParam;
      if (p === 'buffer' || p === 'loop' || p === 'onended') return t[p];
      if (p === 'destination') return audioNode();
      if (typeof p === 'string' && !(p in t)) return () => audioNode();
      return t[p];
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
class AudioContextStub {
  get currentTime() { return 0; }
  get destination() { return audioNode(); }
  get sampleRate() { return 44100; }
  get state() { return 'running'; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  decodeAudioData() { return Promise.resolve(audioNode()); }
}
for (const m of ['createGain', 'createOscillator', 'createBufferSource', 'createBiquadFilter', 'createDynamicsCompressor', 'createStereoPanner', 'createWaveShaper', 'createDelay', 'createScriptProcessor', 'createAnalyser', 'createConvolver', 'createPanner']) {
  AudioContextStub.prototype[m] = () => audioNode();
}
AudioContextStub.prototype.createBuffer = () => audioNode();
class AudioStub {
  constructor() { this.volume = 1; this.currentTime = 0; this.duration = 30; this.paused = true; this.loop = false; this.src = ''; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
  addEventListener() {}
  removeEventListener() {}
  cloneNode() { return new AudioStub(); }
}
class ImageStub {
  set src(v) { this._src = v; } // onload never fires: painted art falls back to procedural
  get src() { return this._src; }
  addEventListener() {}
}

// One isolated "browser tab": its own globals, its own JK namespace, its own sim RNG.
function loadInstance() {
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Math, JSON, Promise, Object, Array, String, Number, Boolean, Date, RegExp, Error, TypeError,
    isNaN, parseInt, parseFloat,
    performance,
    requestAnimationFrame: () => 0,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { getGamepads: () => [null, null], userAgent: 'node' },
    speechSynthesis: { getVoices: () => [], speak: () => {}, cancel: () => {}, addEventListener: () => {}, onvoiceschanged: null },
    AudioContext: AudioContextStub,
    webkitAudioContext: AudioContextStub,
    Audio: AudioStub,
    Image: ImageStub,
    devicePixelRatio: 1,
    innerWidth: 1280, innerHeight: 720,
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.document = {
    createElement: (tag) => (tag === 'canvas' ? canvasStub() : { style: {}, appendChild: () => {} }),
    getElementById: () => null,
    addEventListener: () => {},
    fonts: { load: () => Promise.resolve([]) },
    body: { appendChild: () => {} },
    hidden: false,
  };
  vm.createContext(sandbox);
  const FILES = ['util.js', 'audio.js', 'music.js', 'input.js', 'rig.js', 'characters.js', 'vfx.js', 'moves.js', 'stages.js', 'fighter.js', 'ai.js', 'hud.js', 'game.js'];
  for (const f of FILES) {
    const code = readFileSync(path.join(ROOT, 'js', f), 'utf8');
    try {
      vm.runInContext(code, sandbox, { filename: f });
    } catch (e) {
      throw new Error(`LOAD FAILED: ${f}: ${e.stack}`);
    }
  }
  return sandbox.JK;
}

// ---------------------------------------------------------------- harness
// deterministic input script generator (independent of the sims' own RNG)
function lcg(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeScript(seed, n, opts = {}) {
  const rng = lcg(seed);
  const ticks = [];
  const held = [{}, {}];
  for (let t = 0; t < n; t++) {
    const frame = [{}, {}];
    for (let p = 0; p < 2; p++) {
      const h = held[p];
      const hot = opts.hot && t % 180 < 60; // windows where meter is maxed: hunt for domains/supers
      for (const b of ALL_BUTTONS) {
        const rate = b === 'left' || b === 'right' || b === 'up' || b === 'down' ? 0.06
          : hot && (b === 'domain' || b === 't3' || b === 't1' || b === 't2') ? 0.09
          : hot && b === 'block' ? 0.08
          : 0.035;
        if (rng() < rate) h[b] = !h[b];
        if (h[b]) frame[p][b] = true;
      }
    }
    ticks.push(frame);
  }
  return ticks;
}

function makeSnapshot(JK) {
  return function snapshot(g) {
    const r = (x) => Math.round(x * 1000) / 1000;
    const f = (x) => ({
      x: r(x.x), y: r(x.y), vx: r(x.vx), vy: r(x.vy), hp: r(x.hp), meter: r(x.meter),
      st: x.state, s: x.st, mt: x.move ? x.move.id : '', mtr: r(x.mt || 0), burn: x.burnout, jg: x.jgT,
      wins: x.wins, cd: JSON.stringify(x.cd), lastCopy: x.lastCopy || '', jpT: x.jpT, zone: x.zoneT, conf: x.confiscT,
      buf: JSON.stringify(x.buf), tap: JSON.stringify(x.tap), dash: x.dashReq || '',
    });
    const d = g.domain;
    const dom = d ? d.id + ':' + d.phase + ':' + d.t
      + (d.hk ? ':hk' + JSON.stringify([d.hk.heat, d.hk.spins, d.hk.jackpot]) : '')
      + (d.trial ? ':tr' + JSON.stringify([d.trial.ev, d.trial.objections, d.trial.time, d.trial.rest]) : '') : '';
    return JSON.stringify({
      frame: g.frame, phase: g.phase, pt: g.pt, timer: g.timer,
      rng: JK._simRng, // stream position
      p1: f(g.p1), p2: f(g.p2),
      cam: [r(g.cam.x), r(g.cam.z)], dom,
      proj: g.projectiles.map((p) => [p.kind, r(p.x), r(p.y), p.t]),
      fx: typeof g.finishPhase === 'string' ? g.finishPhase : g.finishPhase ? 'obj' : '', fin: g.fin ? (g.fin.id || 'fin') : '', res: g.result ? g.result.winner : '',
      tim: g.timers.length,
    });
  };
}

const SCENARIOS = [
  { name: 'yuji vs gojo @ jujutsu_high', p1: 'yuji', p2: 'gojo', stage: 'jujutsu_high', seed: 0x5eed0001, ticks: 3600, script: 101, hot: true },
  { name: 'hakari vs higuruma @ shinjuku (jackpot + trial)', p1: 'hakari', p2: 'higuruma', stage: 'shinjuku', seed: 0x5eed0002, ticks: 5400, script: 202, hot: true },
  { name: 'yuta vs sukuna @ kyoto (copied techniques)', p1: 'yuta', p2: 'sukuna', stage: 'kyoto', seed: 0x5eed0003, ticks: 5400, script: 303, hot: true },
  { name: 'pure button mash both sides', p1: 'megumi', p2: 'jogo', stage: 'shibuya', seed: 0x5eed0004, ticks: 3600, script: 404, hot: false },
  { name: 'nanami vs nanami mirror @ shibuya', p1: 'nanami', p2: 'nanami', stage: 'shibuya', seed: 0x5eed0005, ticks: 3600, script: 505, hot: true },
  { name: 'KO + finisher grinder (forced kills)', p1: 'gojo', p2: 'sukuna', stage: 'shinjuku', seed: 0x5eed0006, ticks: 7200, script: 606, hot: true, kill: true },
];

const JK_A = loadInstance();
const JK_B = loadInstance();
const snapA = makeSnapshot(JK_A);
const snapB = makeSnapshot(JK_B);
const ALL_BUTTONS = JK_A.Input.BUTTONS;

let failures = 0;
for (const sc of SCENARIOS) {
  const ticks = makeScript(sc.script, sc.ticks, { hot: sc.hot });
  const make = (JK) => {
    JK.seedSim(sc.seed);
    return new JK.Game({
      p1: sc.p1, p2: sc.p2, c1: 0, c2: 1, stage: sc.stage, difficulty: 'pro', mode: 'versus',
      p2human: 'local', roundsToWin: 3,
      onEnd: () => {},
    });
  };
  const a = make(JK_A);
  const b = make(JK_B);
  let firstBad = -1;
  let diffDump = '';
  for (let t = 0; t < sc.ticks; t++) {
    const [i0, i1] = ticks[t];
    for (const JK of [JK_A, JK_B]) {
      const st = JK.Input.state;
      st.players[0] = { held: i0, pressed: Object.keys(i0).filter((k) => !(t > 0 && ticks[t - 1][0][k])).reduce((o, k) => ((o[k] = true), o), {}) };
      st.players[1] = { held: i1, pressed: Object.keys(i1).filter((k) => !(t > 0 && ticks[t - 1][1][k])).reduce((o, k) => ((o[k] = true), o), {}) };
      st.held = st.players[0].held;
      st.pressed = st.players[0].pressed;
    }
    // hunt mode: top up meter so domains/supers/amp/breakers actually fire
    if (sc.hot && t % 180 < 60) {
      for (const g of [a, b]) { g.p1.meter = 300; g.p2.meter = 300; }
    }
    // kill mode: drain one fighter so KOs, round resets and FINISH THEM all trigger
    if (sc.kill && t > 0 && t % 900 === 0) {
      for (const g of [a, b]) { g.p2.hp = 1; }
    }
    a.update();
    b.update();
    const ha = snapA(a), hb = snapB(b);
    if (ha !== hb) {
      firstBad = t;
      const ja = JSON.parse(ha), jb = JSON.parse(hb);
      for (const k of new Set([...Object.keys(ja), ...Object.keys(jb)])) {
        if (JSON.stringify(ja[k]) !== JSON.stringify(jb[k])) diffDump += `\n    ${k}: A=${JSON.stringify(ja[k])} B=${JSON.stringify(jb[k])}`;
      }
      break;
    }
  }
  if (firstBad >= 0) {
    failures++;
    console.error(`FAIL  ${sc.name} (tick ${firstBad})${diffDump}`);
  } else {
    const endInfo = `end=${a.ended ? 'KO' : 'live'} rounds=${a.p1.wins}-${a.p2.wins}`;
    console.log(`PASS  ${sc.name} · ${sc.ticks} ticks in lockstep · ${endInfo}`);
  }
  JK_A.stopSim();
  JK_B.stopSim();
}

if (failures) {
  console.error(`\n${failures}/${SCENARIOS.length} scenarios DESYNCED — netplay would not be safe.`);
  process.exit(1);
}
console.log(`\nAll ${SCENARIOS.length} scenarios stayed in perfect lockstep — netplay determinism verified.`);
