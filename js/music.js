'use strict';
// Original step-sequenced compositions (16th-note steps). Every track loops at its own length.
(function () {
  const R = (s, n) => Array(n).fill(s).join(' ');
  const H = (tok, len) => (len <= 1 ? tok : tok + ':' + len + ' ' + R('.', len - 1)); // held note/chord
  const J = (...parts) => parts.join(' ');
  const def = JK.Audio.defineSong;

  // ---------------- MENU: dark hybrid trap, D minor ----------------
  def('menu', {
    bpm: 84, vol: 0.75,
    tracks: [
      { i: 'pad', v: 0.8, p: J(H('d3+f3+a3', 16), H('bb2+d3+f3', 16), H('g2+bb2+d3', 16), H('a2+c#3+e3', 16)) },
      { i: 'sub', v: 0.9, p: J(H('d2', 12), '. . d2:2 .', H('bb1', 14), '. .', H('g1', 12), '. . g1 .', H('a1', 10), 'a1 . a2 . a1 .') },
      { i: 'kick', p: J('X . . . . . . . . . x . . . . .', 'X . . . . . . x . . x . . . . .') },
      { i: 'clap', v: 0.8, p: '. . . . . . . . x . . . . . . .' },
      { i: 'hat', v: 0.9, p: J('x . x . x . x . x . x x x . x .', 'x . x . x . x . x x x x x . x .') },
      { i: 'taiko', v: 0.7, p: J(R('.', 48), 'X . . . X . . . X . X . X X X X') },
      { i: 'koto', v: 1, p: J(
        'd5 . . a4 . . f4 . g4 . a4 . . . c5 .',
        'd5 . . f5 . . e5 . d5 . . . a4 . . .',
        'bb4 . . a4 . . g4 . f4 . g4 . . . a4 .',
        'e4 . . f4 . . g4 . a4:4 . . . c#5 . e5 .',
        'f5 . . e5 . . d5 . a4 . . . d5 . f5 .',
        'g5 . . f5 . . d5 . bb4 . . . d5 . . .',
        'g5 . . f5 . . d5 . bb4 . a4 . g4 . f4 .',
        'e4 . . g4 . . bb4 . a4:6 . . . . . . .') },
      { i: 'choir', v: 0.5, p: J(H('a4', 32), H('f4', 16), H('e4', 16)) },
    ],
  });

  // ---------------- STAGE: Tokyo Jujutsu High — driving rock, E minor ----------------
  def('stage_jujutsu_high', {
    bpm: 150, vol: 0.7,
    tracks: [
      { i: 'kick', p: J('X . . . . . x . X . . . . . . .', 'X . . . . . x . X . x . . . . .') },
      { i: 'snare', p: J('. . . . X . . . . . . . X . . .', '. . . . X . . . . . . . X . X x') },
      { i: 'hat', p: 'X o x o X o x o X o x o X o x o' },
      { i: 'bass', p: J(
        'e2 . e2 . e2 . e2 . e2 . e2 . e3 . d3 .',
        'c2 . c2 . c2 . c2 . c2 . c2 . c3 . b2 .',
        'g2 . g2 . g2 . g2 . g2 . g2 . g3 . a2 .',
        'd2 . d2 . d2 . d2 . d2 . d2 . f#2 . d2 .') },
      { i: 'strings', v: 0.9, p: J(
        'e3+b3+e4:3 . . . . . e3+b3+e4:2 . . . e3+b3+e4:4 . . . . .',
        'c3+g3+c4:3 . . . . . c3+g3+c4:2 . . . c3+g3+c4:4 . . . . .',
        'g3+d4+g4:3 . . . . . g3+d4+g4:2 . . . g3+d4+g4:4 . . . . .',
        'd3+a3+d4:3 . . . . . d3+a3+d4:2 . . . f#3+a3+d4:4 . . . . .') },
      { i: 'lead', v: 1, p: J(
        'e5 . . e5 . . d5 . e5 . . g5 . . f#5 .',
        'e5:4 . . . b4 . . . d5 . . . e5:4 . . .',
        'c5 . . c5 . . b4 . c5 . . e5 . . d5 .',
        'b4:6 . . . . . a4 . b4 . d5 . f#5:3 . . .',
        'g5 . . g5 . . f#5 . g5 . . b5 . . a5 .',
        'g5:4 . . . e5 . . . g5 . . . a5:4 . . .',
        'b5 . . a5 . . g5 . a5 . . g5 . . f#5 .',
        'e5:8 . . . . . . . b4 . d5 . e5:4 . . .') },
      { i: 'cymbal', v: 0.8, p: J('X', R('.', 127)) },
    ],
  });

  // ---------------- STAGE: Shibuya Incident — dark four-on-the-floor, F# minor ----------------
  const arpBar = (a, b, c, d) => J(a, b, c, b, d, c, b, c, a, b, c, b, d, c, b, c);
  def('stage_shibuya', {
    bpm: 128, vol: 0.7,
    tracks: [
      { i: 'kick', p: 'X . . . x . . . x . . . x . . .' },
      { i: 'clap', p: '. . . . x . . . . . . . x . . .' },
      { i: 'ohat', p: '. . x . . . x . . . x . . . x .' },
      { i: 'hat', v: 0.6, p: 'x x . x x x . x x x . x x x . x' },
      { i: 'sub', v: 0.9, p: J(
        'f#1:3 . . f#1:3 . . f#1:2 . f#1:3 . . f#2:2 . f#1 . .',
        'd1:3 . . d1:3 . . d1:2 . d1:3 . . d2:2 . d1 . .',
        'a1:3 . . a1:3 . . a1:2 . a1:3 . . a2:2 . a1 . .',
        'e1:3 . . e1:3 . . e1:2 . e1:3 . . e2:2 . c#2 . .') },
      { i: 'arp', v: 0.9, p: J(arpBar('f#4', 'a4', 'c#5', 'f#5'), arpBar('d4', 'f#4', 'a4', 'd5'), arpBar('a3', 'c#4', 'e4', 'a4'), arpBar('e4', 'g#4', 'b4', 'e5')) },
      { i: 'pad', v: 0.6, p: J(H('f#3+a3+c#4', 16), H('d3+f#3+a3', 16), H('c#3+e3+a3', 16), H('b2+e3+g#3', 16)) },
      { i: 'lead', v: 0.8, p: J(R('.', 64),
        'c#5:6 . . . . . b4:2 . a4:4 . . . g#4:4 . . .',
        'a4:6 . . . . . f#4:2 . a4:4 . . . d5:4 . . .',
        'c#5:6 . . . . . e5:2 . c#5:4 . . . a4:4 . . .',
        'b4:12 . . . . . . . . . . . g#4:4 . . .') },
    ],
  });

  // ---------------- STAGE: Shinjuku Showdown — epic taiko/strings, C minor ----------------
  const ost = (r, f, o) => J(r, r, f, r, o, r, f, r, r, r, f, r, o, f, r, f);
  def('stage_shinjuku', {
    bpm: 140, vol: 0.7,
    tracks: [
      { i: 'taiko', p: J('X . . x . . X . x . X . X . x x', 'X . . x . . X . x . X . X x X x') },
      { i: 'kick', p: 'X . . . . . . . X . . . . . . .' },
      { i: 'snare', v: 0.6, p: J(R('.', 48), '. . . . . . . . x x X x X x X X') },
      { i: 'strings', v: 0.8, p: J(ost('c4', 'g4', 'c5'), ost('ab3', 'eb4', 'ab4'), ost('bb3', 'f4', 'bb4'), ost('g3', 'd4', 'g4')) },
      { i: 'choir', v: 0.8, p: J(H('c4+eb4+g4', 16), H('ab3+c4+eb4', 16), H('bb3+d4+f4', 16), H('g3+b3+d4', 16)) },
      { i: 'bass', v: 0.8, p: J(H('c2', 16), H('ab1', 16), H('bb1', 16), H('g1', 16)) },
      { i: 'lead', v: 1, p: J(R('.', 64),
        'g5:6 . . . . . f5 . eb5 . f5 . g5:4 . . .',
        'ab5:6 . . . . . g5 . eb5:8 . . . . . . .',
        'f5:6 . . . . . eb5 . d5 . eb5 . f5:4 . . .',
        'd5:6 . . . . . b4 . g4:8 . . . . . . .') },
      { i: 'cymbal', p: J('X', R('.', 63)) },
    ],
  });

  // ---------------- STAGE: Kyoto Bamboo Grove — traditional, A minor pentatonic ----------------
  def('stage_kyoto', {
    bpm: 100, vol: 0.75,
    tracks: [
      { i: 'taiko', v: 0.7, p: J('X . . . . . . . x . . . . . . .', 'X . . . . . x . x . . . X . . .') },
      { i: 'shaker', p: 'x . x x x . x x x . x x x . x x' },
      { i: 'rim', v: 0.8, p: '. . . . x . . . . . . . x . . x' },
      { i: 'koto', v: 0.9, p: J(
        'a3 e4 a4 c5 . e4 a4 . a3 e4 a4 c5 . b4 a4 .',
        'f3 c4 f4 a4 . c4 f4 . f3 c4 f4 a4 . g4 f4 .',
        'g3 d4 g4 b4 . d4 g4 . g3 d4 g4 b4 . a4 g4 .',
        'e3 b3 e4 g4 . b3 e4 . e3 b3 e4 g#4 . b4 e5 .') },
      { i: 'pad', v: 0.45, p: J(H('a3+c4+e4', 16), H('f3+a3+c4', 16), H('g3+b3+d4', 16), H('e3+g#3+b3', 16)) },
      { i: 'bass', v: 0.6, p: J(H('a1', 16), H('f1', 16), H('g1', 16), H('e1', 16)) },
      { i: 'flute', v: 1, p: J(
        'e5:6 . . . . . d5 . c5:4 . . . d5 . e5 .',
        'a4:12 . . . . . . . . . . . c5 . d5 .',
        'e5:6 . . . . . g5 . e5:4 . . . d5 . c5 .',
        'b4:12 . . . . . . . . . . . . . . .',
        'a5:6 . . . . . g5 . e5:4 . . . g5 . a5 .',
        'c6:8 . . . . . . . a5:6 . . . . . g5 .',
        'e5:6 . . . . . d5 . c5 . d5 . e5:4 . . .',
        'a4:16 . . . . . . . . . . . . . . .') },
    ],
  });

  // ---------------- DOMAIN: Unlimited Void — cosmic, A lydian (original piece) ----------------
  def('domain_gojo', {
    bpm: 66, vol: 0.85,
    tracks: [
      { i: 'drone', v: 0.9, p: H('a1', 64) },
      { i: 'choir', v: 0.7, p: J(H('a3+e4+g#4', 32), H('f#3+c#4+e4', 16), H('d3+a3+c#4', 16)) },
      { i: 'bell', v: 1, p: J(
        'a4 . e5 . g#5 . b5 . d#6 . b5 . g#5 . e5 .',
        'c#5 . g#5 . b5 . e6 . d#6 . b5 . g#5 . d#5 .',
        'f#4 . c#5 . e5 . a5 . g#5 . e5 . c#5 . a4 .',
        'd4 . a4 . c#5 . f#5 . g#5 . f#5 . e5 . c#5 .') },
      { i: 'revbell', v: 1, p: J(H('e6', 16), R('.', 16), H('g#6', 16), H('d#6', 16)) },
      { i: 'sub', v: 0.6, p: J('a1:8', R('.', 31), 'f#1:8', R('.', 15), 'd1:8', R('.', 15)) },
      { i: 'rim', v: 0.5, p: J('x . . . . . . . . . . x . . . .', '. . . x . . . . . x . . . . . x') },
      { i: 'swell', v: 0.8, p: J(R('.', 48), H('x', 16)) },
    ],
  });

  // ---------------- DOMAIN: Malevolent Shrine — ominous taiko, E phrygian (original piece) ----------------
  def('domain_sukuna', {
    bpm: 96, vol: 0.9,
    tracks: [
      { i: 'drone', v: 1, p: H('e1', 64) },
      { i: 'taiko', p: J('X . . x . . X . . . X . x . x .', 'X . . x . . X . X . X x X x X x') },
      { i: 'kick', p: 'X . . . . . . . X . . . . . . .' },
      { i: 'choir', v: 0.9, p: J(H('e3+g3+b3', 16), H('f3+a3+c4', 16), H('e3+g3+b3', 16), H('d3+f3+bb3', 16)) },
      { i: 'shamisen', v: 1, p: J(
        'e4 e4 f4 e4 . . e4 f4 g4 f4 e4 . b3 . c4 .',
        'f4 f4 g4 f4 . . e4 f4 e4 d4 c4 . b3 . c4 .',
        'e4 e4 f4 e4 . . b4 c5 b4 a4 g4 . f4 . e4 .',
        'd4 d4 e4 f4 . . e4 d4 c4 b3 c4 . bb3:4 . . .') },
      { i: 'strings', v: 0.7, p: J('e2 . e2 . f2 . e2 . e2 . e2 . g2 . f2 .', 'e2 . e2 . f2 . e2 . d2 . d2 . c2 . bb1 .') },
      { i: 'cymbal', v: 0.9, p: J('X', R('.', 63)) },
      { i: 'swell', v: 0.9, p: J(R('.', 56), H('x', 8)) },
    ],
  });

  // ---------------- DOMAIN: Yuji's (unnamed) domain — nostalgic sunset station (original piece) ----------------
  const pArp = (a, b, c, d, e) => J(a, b, c, d, e, d, c, b, a, b, c, d, e, d, c, b);
  def('domain_yuji', {
    bpm: 84, vol: 0.85,
    tracks: [
      { i: 'piano', v: 0.9, p: J(pArp('a3', 'e4', 'a4', 'c5', 'e5'), pArp('f3', 'c4', 'f4', 'a4', 'c5'), pArp('c3', 'g3', 'c4', 'e4', 'g4'), pArp('g3', 'd4', 'g4', 'b4', 'd5')) },
      { i: 'shaker', v: 0.9, p: 'x . . x x . . . x . . x x . . .' },
      { i: 'kick', v: 0.6, p: 'X . . . . . . . x . . . . . . .' },
      { i: 'pad', v: 0.5, p: J(H('a3+c4+e4', 16), H('f3+a3+c4', 16), H('e3+g3+c4', 16), H('d3+g3+b3', 16)) },
      { i: 'sub', v: 0.6, p: J(H('a1', 16), H('f1', 16), H('c2', 16), H('g1', 16)) },
      { i: 'flute', v: 0.9, p: J(
        'e5:8 . . . . . . . d5:4 . . . c5:4 . . .',
        'c5:8 . . . . . . . a4:8 . . . . . . .',
        'g4:4 . . . c5:4 . . . e5:4 . . . g5:4 . . .',
        'f#5:4 . . . g5:12 . . . . . . . . . . .',
        'a5:8 . . . . . . . g5:4 . . . e5:4 . . .',
        'f5:8 . . . . . . . c5:8 . . . . . . .',
        'e5:6 . . . . . d5:2 . c5:4 . . . g4:4 . . .',
        'b4:8 . . . . . . . d5:8 . . . . . . .') },
    ],
  });

  // ---------------- DOMAIN: Chimera Shadow Garden (Megumi) — dark liquid pulse (original piece) ----------------
  def('domain_megumi', {
    bpm: 108, vol: 0.85,
    tracks: [
      { i: 'drone', v: 0.9, p: H('b0', 64) },
      { i: 'kick', p: 'X . . . . . X . . . X . . . . .' },
      { i: 'hat', v: 0.7, p: '. . x . . . x . . . x . . x x .' },
      { i: 'pad', v: 0.7, p: J(H('b2+d3+f#3', 16), H('g2+b2+d3', 16), H('e2+g2+b2', 16), H('f#2+a#2+c#3', 16)) },
      { i: 'bell', v: 0.7, p: J('b4 . . f#5 . . d5 . . . b4 . . c#5 . .', 'd5 . . a5 . . f#5 . . . e5 . . d5 . .') },
      { i: 'sub', v: 0.8, p: J('b1:3 . . b1 . . b1:2 . . . b1 . a1 . . .', 'g1:3 . . g1 . . g1:2 . . . f#1:4 . . . . .') },
    ],
  });

  // ---------------- DOMAIN: Coffin of the Iron Mountain (Jogo) — molten war drums (original piece) ----------------
  def('domain_jogo', {
    bpm: 118, vol: 0.9,
    tracks: [
      { i: 'drone', v: 1, p: H('d1', 64) },
      { i: 'taiko', p: J('X . x . X . . x X . x . X x X .', 'X . x . X . . x X . X x X x X X') },
      { i: 'kick', p: 'X . . . X . . . X . . . X . . .' },
      { i: 'strings', v: 0.9, p: J('d3 d3 d3 f3 d3 d3 eb3 d3 d3 d3 d3 f3 g3 f3 eb3 d3', 'c3 c3 c3 eb3 c3 c3 d3 c3 bb2 bb2 bb2 d3 eb3 d3 c3 bb2') },
      { i: 'choir', v: 0.8, p: J(H('d3+f3+a3', 16), H('eb3+g3+bb3', 16), H('d3+f3+a3', 16), H('c3+eb3+g3', 16)) },
      { i: 'lead', v: 0.8, p: J(R('.', 32), 'a4:6 . . . . . bb4:2 . a4:4 . . . g4:4 . . .', 'f4:6 . . . . . g4:2 . eb4:8 . . . . . . .') },
      { i: 'cymbal', v: 0.9, p: J('X', R('.', 63)) },
    ],
  });

  // ---------------- DOMAIN: Deadly Sentencing (Higuruma) — solemn courtroom, gavel strikes (original piece) ----------------
  def('domain_higuruma', {
    bpm: 96, vol: 0.85,
    tracks: [
      { i: 'drone', v: 0.8, p: H('d1', 64) },
      { i: 'taiko', p: J('X . . . . . . . X . . . . . . .', 'X . . . . . . . X . . X . X . .') },
      { i: 'choir', v: 0.8, p: J(H('d3+f3+a3', 16), H('bb2+d3+f3', 16), H('g2+bb2+d3', 16), H('a2+c#3+e3', 16)) },
      { i: 'piano', v: 0.7, p: J('d4 . a4 . f4 . a4 . d4 . a4 . f4 . a4 .', 'bb3 . f4 . d4 . f4 . bb3 . f4 . d4 . f4 .', 'g3 . d4 . bb3 . d4 . g3 . d4 . bb3 . d4 .', 'a3 . e4 . c#4 . e4 . a3 . e4 . c#4 . e4 .') },
      { i: 'revbell', v: 0.6, p: J('d5:8 . . . . . . .', R('.', 56)) },
      { i: 'sub', v: 0.7, p: J(H('d1', 16), H('bb0', 16), H('g0', 16), H('a0', 16)) },
    ],
  });

  // ---------------- ULTIMATE: Overtime: Collapse (Nanami) — driving after-hours pulse (original piece) ----------------
  def('domain_nanami', {
    bpm: 132, vol: 0.85,
    tracks: [
      { i: 'kick', p: 'X . . . X . . X X . . . X . . .' },
      { i: 'snare', v: 0.8, p: '. . . . X . . . . . . . X . . x' },
      { i: 'hat', v: 0.7, p: 'x . x x x . x . x . x x x . x x' },
      { i: 'bass', v: 0.9, p: J('e2 . e2 g2 . a2 . b2 e2 . e2 d3 . b2 . a2', 'c2 . c2 e2 . g2 . a2 b1 . b1 d#2 . f#2 . a2') },
      { i: 'strings', v: 0.7, p: J(H('e3+g3+b3', 8), H('e3+g3+b3', 8), H('c3+e3+g3', 8), H('b2+d#3+f#3', 8)) },
      { i: 'lead', v: 0.7, p: J(R('.', 32), 'b4:3 . . a4 . g4:2 . e4:4 . . . g4 a4 . b4 .', 'c5:6 . . . . . b4:2 . a4:4 . . . f#4:4 . . .') },
      { i: 'cymbal', v: 0.7, p: J('X', R('.', 63)) },
    ],
  });

  // ---------------- DOMAIN: Authentic Mutual Love (Yuta) — soaring strings over a steady pulse (original piece) ----------------
  def('domain_yuta', {
    bpm: 128, vol: 0.85,
    tracks: [
      { i: 'kick', p: 'X . . . X . . . X . . . X . . x' },
      { i: 'hat', v: 0.6, p: '. . x . . . x . . . x . . . x x' },
      { i: 'strings', v: 0.9, p: J(H('a3+c4+e4', 16), H('f3+a3+c4', 16), H('c3+e3+g3', 16), H('g3+b3+d4', 16)) },
      { i: 'piano', v: 0.8, p: J('a4 c5 e5 a5 e5 c5 a4 e4 f4 a4 c5 f5 c5 a4 f4 c4', 'c5 e5 g5 c6 g5 e5 c5 g4 d5 g5 b5 d6 b5 g5 d5 b4') },
      { i: 'choir', v: 0.6, p: J(H('e4', 16), H('c4', 16), H('g4', 16), H('b4', 16)) },
      { i: 'sub', v: 0.8, p: J(H('a1', 16), H('f1', 16), H('c2', 16), H('g1', 16)) },
      { i: 'cymbal', v: 0.7, p: J('X', R('.', 63)) },
    ],
  });

  // ---------------- DOMAIN: Idle Death Gamble (Hakari) — pachinko-parlour house groove (original piece) ----------------
  def('domain_hakari', {
    bpm: 126, vol: 0.85,
    tracks: [
      { i: 'kick', p: 'X . . . X . . . X . . . X . . .' },
      { i: 'clap', v: 0.8, p: '. . . . X . . . . . . . X . . .' },
      { i: 'ohat', v: 0.8, p: '. . X . . . X . . . X . . . X .' },
      { i: 'bass', v: 0.9, p: J('g2 . g2 . bb2 . g2 . c3 . g2 . f2 . d2 .', 'eb2 . eb2 . g2 . eb2 . f2 . f2 . d2 . f2 .') },
      { i: 'bell', v: 0.6, p: J('g5 . d5 . bb5 . d5 . g5 . d5 . a5 . f5 .', 'g5 . eb5 . bb5 . eb5 . f5 . c5 . a5 . d5 .') },
      { i: 'pad', v: 0.6, p: J(H('g3+bb3+d4', 16), H('eb3+g3+bb3', 16)) },
    ],
  });

  // ---------------- JACKPOT (Hakari) — double-time victory lap (original piece) ----------------
  def('jackpot', {
    bpm: 150, vol: 0.9,
    tracks: [
      { i: 'kick', p: 'X . . . X . . . X . . . X . X .' },
      { i: 'snare', v: 0.8, p: '. . . . X . . . . . . . X . . x' },
      { i: 'hat', v: 0.8, p: 'x x x x x x x x x x x x x x x x' },
      { i: 'bass', v: 1, p: J('c3 . c3 c3 . c3 eb3 . f3 . f3 f3 . g3 . bb3', 'ab2 . ab2 ab2 . ab2 c3 . bb2 . bb2 bb2 . d3 . f3') },
      { i: 'lead', v: 0.8, p: J('c5:2 . eb5 . g5:2 . c6:4 . . . bb5 . g5 .', 'ab5:2 . g5 . f5:2 . eb5:4 . . . d5 . f5 .') },
      { i: 'strings', v: 0.7, p: J(H('c4+eb4+g4', 16), H('ab3+c4+eb4', 8), H('bb3+d4+f4', 8)) },
      { i: 'cymbal', v: 0.8, p: J('X', R('.', 31)) },
    ],
  });

  // ---------------- Victory fanfare (plays once) ----------------
  def('victory', {
    bpm: 120, vol: 0.8, once: 48,
    tracks: [
      { i: 'lead', v: 1, p: J('e5:2 . e5 . g5:2 . b5:6 . . . . . . . a5 b5', 'e6:16 . . . . . . . . . . . . . . .', R('.', 16)) },
      { i: 'strings', v: 1, p: J('e3+b3+e4:2 . e3+b3+e4 . g3+d4+g4:2 . b3+f#4+b4:6 . . . . . . . . .', H('c4+e4+g4+b4', 16), R('.', 16)) },
      { i: 'taiko', p: J('X . X . X . X . . . . . X X X X', 'X', R('.', 31)) },
      { i: 'cymbal', p: J(R('.', 16), 'X', R('.', 31)) },
    ],
  });

  // ---------------- Defeat sting (plays once) ----------------
  def('defeat', {
    bpm: 70, vol: 0.8, once: 32,
    tracks: [
      { i: 'choir', v: 1, p: J(H('e3+g3+b3', 8), H('c3+eb3+g3', 8), H('b2+d3+f#3', 16)) },
      { i: 'taiko', p: J('X', R('.', 15), 'X', R('.', 15)) },
      { i: 'piano', v: 0.8, p: J('b4 . . . g4 . . . e4 . . . eb4 . . .', 'd#4:16', R('.', 15)) },
    ],
  });
})();
