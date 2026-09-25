'use strict';
// Keyboard + gamepad input. Produces per-frame held/pressed maps for the player,
// plus edge-triggered menu navigation.
// Multiplayer: when JK.Input.p2Enabled is set (local versus), a second keyboard
// cluster and the second gamepad drive player 2; those keys stop feeding player 1.
// Player 1: WASD + J K L + U I O + Space + Q E H + Shift/F (arrows work too unless P2 is active)
// Player 2: arrows + B N M techniques + , . / attacks + Right Shift block + Enter domain + V throw + C dash + X amp (numpad mirrors included)
JK.Input = (function () {
  const keys = {};
  const keysPressed = {};
  const BUTTONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'kick', 't1', 't2', 't3', 'block', 'domain', 'throw', 'dash', 'amp'];

  const KEYMAP = {
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyJ: 'light', KeyK: 'heavy', KeyL: 'kick',
    KeyU: 't1', KeyI: 't2', KeyO: 't3',
    Space: 'block', Semicolon: 'block',
    ShiftLeft: 'dash', ShiftRight: 'dash', KeyF: 'dash',
    KeyQ: 'domain', KeyE: 'amp', KeyR: 'amp',
    KeyH: 'throw',
  };

  // Second keyboard cluster for local versus. These keys are removed from player 1's
  // map while player 2 is active, so the arrow cluster and Right Shift switch sides.
  const P2_KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Comma: 'light', Period: 'heavy', Slash: 'kick',
    KeyB: 't1', KeyN: 't2', KeyM: 't3',
    ShiftRight: 'block',
    Enter: 'domain', NumpadEnter: 'domain',
    KeyV: 'throw', KeyC: 'dash', KeyX: 'amp',
    Numpad1: 'light', Numpad2: 'heavy', Numpad3: 'kick',
    Numpad4: 't1', Numpad5: 't2', Numpad6: 't3',
    Numpad0: 'block', NumpadDecimal: 'throw', NumpadAdd: 'dash', NumpadMultiply: 'amp',
  };

  const state = { held: {}, pressed: {}, menu: {}, players: [null, null] };

  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!keys[e.code]) keysPressed[e.code] = true;
    keys[e.code] = true;
    JK.Audio.init();
    if (JK.Input.onKeyCapture) JK.Input.onKeyCapture(e);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  window.addEventListener('mousedown', () => JK.Audio.init());
  window.addEventListener('touchstart', () => JK.Audio.init(), { passive: true });

  // Gamepads: pad 0 drives player 1, pad 1 drives player 2.
  const PAD = { 2: 'light', 3: 'heavy', 0: 'kick', 4: 't1', 1: 't2', 5: 't3', 7: 'block', 6: 'domain', 8: 'throw', 10: 'dash', 11: 'amp' };
  let padPrev = {};
  let padHeld = [{}, {}];
  let padMenuPrev = {};
  let padMenu = {};
  function pollPad() {
    padHeld = [{}, {}];
    padMenu = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let pi = 0; pi < pads.length && pi < 2; pi++) {
      const p = pads[pi];
      if (!p) continue;
      const into = padHeld[pi];
      for (const idx in PAD) if (p.buttons[idx] && p.buttons[idx].pressed) into[PAD[idx]] = true;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.45 || (p.buttons[14] && p.buttons[14].pressed)) into.left = true;
      if (ax > 0.45 || (p.buttons[15] && p.buttons[15].pressed)) into.right = true;
      if (ay < -0.55 || (p.buttons[12] && p.buttons[12].pressed)) into.up = true;
      if (ay > 0.55 || (p.buttons[13] && p.buttons[13].pressed)) into.down = true;
      if (pi === 0) {
        if (p.buttons[9] && p.buttons[9].pressed) padMenu.pause = true;
        if (p.buttons[0] && p.buttons[0].pressed) padMenu.confirm = true;
        if (p.buttons[1] && p.buttons[1].pressed) padMenu.back = true;
      }
    }
  }

  let prevP1 = {};
  let prevP2 = {};

  function buildPlayer(idx, prevHeld) {
    const held = {};
    const pressed = {};
    for (const code in keys) {
      if (!keys[code]) continue;
      // while player 2 is active, their cluster no longer feeds player 1
      if (idx === 0 && JK.Input.p2Enabled && P2_KEYMAP[code]) continue;
      const b = idx === 0 ? KEYMAP[code] : P2_KEYMAP[code];
      if (b) held[b] = true;
    }
    for (const b in padHeld[idx]) held[b] = true;
    // also let player 2 use a second gamepad's shared buttons even when p2 isn't "enabled" (ignored)
    for (const b of BUTTONS) {
      if (held[b] && !prevHeld[b]) pressed[b] = true;
    }
    // Keyboard presses that happened and released within one frame still count.
    for (const code in keysPressed) {
      const b = idx === 0 ? KEYMAP[code] : P2_KEYMAP[code];
      if (b && (idx === 0 || JK.Input.p2Enabled)) pressed[b] = true;
    }
    return { held, pressed };
  }

  function update() {
    pollPad();
    const p1 = buildPlayer(0, prevP1);
    const p2 = buildPlayer(1, prevP2);
    prevP1 = p1.held;
    prevP2 = p2.held;
    state.held = p1.held;
    state.pressed = p1.pressed;
    state.players[0] = p1;
    state.players[1] = p2;

    // Menu navigation (edge triggered, with key repeat handled by browser keydown)
    const m = {};
    const kp = keysPressed;
    if (kp.ArrowUp || kp.KeyW) m.up = true;
    if (kp.ArrowDown || kp.KeyS) m.down = true;
    if (kp.ArrowLeft || kp.KeyA) m.left = true;
    if (kp.ArrowRight || kp.KeyD) m.right = true;
    if (kp.Enter || kp.KeyJ || kp.Space || kp.NumpadEnter) m.confirm = true;
    if (kp.Escape || kp.Backspace || kp.KeyK) m.back = true;
    if (kp.Escape || kp.KeyP) m.pause = true;
    if (kp.Tab) m.tab = true;
    if (kp.KeyR) m.reset = true;
    if (kp.KeyC) m.cdToggle = true;
    for (const k of ['up', 'down', 'left', 'right']) if (padHeld[0][k] && !padMenuPrev['d' + k]) m[k] = true;
    for (const k of ['pause', 'confirm', 'back']) if (padMenu[k] && !padMenuPrev[k]) m[k] = true;
    padMenuPrev = { ...padMenu, dup: padHeld[0].up, ddown: padHeld[0].down, dleft: padHeld[0].left, dright: padHeld[0].right };
    state.menu = m;
    for (const k in keysPressed) delete keysPressed[k];
  }

  function anyKey() {
    return Object.keys(state.menu).length > 0 || Object.keys(state.pressed).length > 0;
  }

  const api = { state, update, anyKey, BUTTONS, p2Enabled: false, onKeyCapture: null };
  return api;
})();

// A controller wraps a source of held/pressed buttons for a fighter.
// player: 1 = main keyboard cluster + gamepad 0, 2 = second cluster + gamepad 1.
JK.HumanController = class {
  constructor(player = 1) {
    this.player = player;
    this.held = {};
    this.pressed = {};
  }
  update() {
    const s = JK.Input.state.players[this.player - 1] || JK.Input.state;
    this.held = s.held;
    this.pressed = s.pressed;
  }
};
