'use strict';
// Online versus. Lockstep input-sync over a WebRTC data channel (PeerJS public broker, free).
// Both peers run the identical deterministic simulation; only 15-button input bitmasks
// cross the wire, tagged with the sim tick they belong to and delayed a few frames so
// they arrive in time. A rolling state hash comparison catches any divergence.
// Requires https://unpkg.com/peerjs (loaded from index.html). Single-player never touches this.
JK.NET = (function () {
  const PREFIX = 'jkombat-net-v1-';
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1: readable room codes
  const DELAY = 6; // input delay in sim frames (~100 ms) — the lockstep runway
  const BITORDER = JK.Input.BUTTONS;

  const S = {
    supported: typeof window.Peer !== 'undefined',
    session: null,
  };

  function newCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return c;
  }

  function packMask(held) {
    let m = 0;
    for (let i = 0; i < BITORDER.length; i++) if (held[BITORDER[i]]) m |= (1 << i);
    return m;
  }
  function maskHeld(m) {
    const held = {};
    for (let i = 0; i < BITORDER.length; i++) if ((m >> i) & 1) held[BITORDER[i]] = true;
    return held;
  }

  // State fingerprint exchanged every 120 ticks. Any drift between peers shows up here.
  function matchHash(g) {
    const f = (x) => Math.round(x * 50) / 50;
    const p1 = g.p1, p2 = g.p2;
    return [
      g.frame, g.timer, g.phase,
      f(p1.x), f(p1.y), f(p1.vx), f(p1.vy), Math.round(p1.hp), Math.round(p1.meter), p1.state, p1.st, p1.move ? p1.move.id : '',
      f(p2.x), f(p2.y), f(p2.vx), f(p2.vy), Math.round(p2.hp), Math.round(p2.meter), p2.state, p2.st, p2.move ? p2.move.id : '',
      g.projectiles.length, g.timers.length, f(g.cam.x),
    ].join('|');
  }

  class NetSession {
    constructor(role, code) {
      this.role = role;               // 'host' | 'guest'
      this.code = code;
      this.peer = null;
      this.conn = null;
      this.status = 'connecting';     // connecting | waiting | linked | fighting | closed | error
      this.error = '';
      this.ping = 0;
      this.desync = false;
      this.tick = 0;
      this.delay = DELAY;
      this.runway = DELAY;            // ticks below this never stall (startup runway)
      this.localQ = {};               // tick -> input mask (our own, delayed)
      this.remoteQ = {};              // tick -> input mask (peer's)
      this.lastRemoteMask = 0;
      this.myHash = {};               // tick -> hash of our sim at that tick
      this.peerHash = {};
      this.wantRematch = false;
      this.peerWantRematch = false;
      this.handlers = {};
      this.onStatus = null;           // (session) => lobby refresh
      this._stallSince = 0;
      this._pingSentAt = 0;
    }

    on(type, fn) { this.handlers[type] = fn; }
    emit(type, msg) { if (this.handlers[type]) this.handlers[type](msg); }
    setStatus(st) { this.status = st; if (this.onStatus) this.onStatus(this); }

    connect() {
      if (!S.supported) { this.fail('Networking library failed to load (offline?)'); return; }
      const id = PREFIX + this.code;
      this.peer = this.role === 'host' ? new window.Peer(id) : new window.Peer();
      this.peer.on('error', (err) => {
        // host: the code is taken — roll a fresh one and try again
        if (this.role === 'host' && (err.type === 'unavailable-id' || /taken/i.test(err.message || ''))) {
          this.code = newCode();
          try { this.peer.destroy(); } catch (e) { /* ignore */ }
          this.connect();
          return;
        }
        if (this.role === 'guest' && (err.type === 'peer-unavailable')) {
          this.fail('No room with code ' + this.code + '. Check the code and try again.');
          return;
        }
        this.fail('Network error: ' + (err.type || err.message || 'unknown'));
      });
      if (this.role === 'host') {
        this.peer.on('open', () => this.setStatus('waiting'));
        this.peer.on('connection', (conn) => this.wire(conn));
      } else {
        this.peer.on('open', () => {
          const conn = this.peer.connect(PREFIX + this.code, { reliable: true });
          this.wire(conn);
        });
      }
    }

    wire(conn) {
      this.conn = conn;
      conn.on('open', () => {
        this.setStatus('linked');
        this.send({ t: 'hello', v: 1 });
      });
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        switch (msg.t) {
          case 'hello': this.setStatus('linked'); break;
          case 'ping': this.send({ t: 'pong', ts: msg.ts }); break;
          case 'pong': this.ping = Math.round(performance.now() - msg.ts); break;
          case 'i': this.remoteQ[msg.f] = msg.m; break;
          case 'h':
            this.peerHash[msg.f] = msg.h;
            if (this.myHash[msg.f] !== undefined) this.compareHash(msg.f);
            break;
          case 'pause': if (this.onPause) this.onPause(); break;
          case 'resume': if (this.onResume) this.onResume(msg.base); break;
          case 'rematch':
            this.peerWantRematch = true;
            this.emit('rematch');
            break;
          case 'leave': this.fail('Opponent left the room.'); break;
          default: this.emit(msg.t, msg);
        }
      });
      const gone = () => { if (this.status === 'fighting' || this.status === 'linked') this.fail('Opponent disconnected.'); };
      conn.on('close', gone);
      conn.on('error', gone);
    }

    compareHash(f) {
      const a = this.myHash[f], b = this.peerHash[f];
      delete this.myHash[f]; delete this.peerHash[f];
      if (a !== b) {
        this.desync = true;
        console.warn('[netplay] desync at tick', f, '\n  local :', a, '\n  remote:', b);
      }
    }

    send(obj) {
      if (this.conn && this.conn.open) {
        try { this.conn.send(obj); } catch (e) { /* channel closing */ }
      }
    }

    fail(msg) {
      this.error = msg;
      this.setStatus('error');
      try { if (this.conn) this.conn.close(); } catch (e) { /* ignore */ }
      try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
    }

    leave() {
      this.send({ t: 'leave' });
      setTimeout(() => {
        try { if (this.conn) this.conn.close(); } catch (e) { /* ignore */ }
        try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
      }, 120);
      this.setStatus('closed');
    }

    // ------------------------------------------------------------ match sync
    attachGame(g) {
      this.game = g;
      this.tick = 0;
      this.runway = DELAY;
      this.localQ = {};
      this.remoteQ = {};
      this.myHash = {};
      this.peerHash = {};
      this.wantRematch = false;
      this.peerWantRematch = false;
      this.desync = false;
      this._stallSince = 0;
      this.lastRemoteMask = 0;
      this.setStatus('fighting');
    }

    // Called at the top of Game.update() while a netplay match is live.
    // Samples the local held map, schedules it DELAY frames ahead, and waits for the
    // peer's input for the current tick. Returns false (and freezes the sim) if it
    // hasn't arrived yet.
    beginTick(g) {
      const at = this.tick + this.delay;
      const m = packMask(JK.Input.state.held);
      this.localQ[at] = m;
      this.send({ t: 'i', f: at, m });

      if (this.remoteQ[this.tick] === undefined) {
        if (this.tick < this.runway) {
          this.remoteQ[this.tick] = 0; // startup runway: no peer input yet
        } else {
          if (!this._stallSince) this._stallSince = performance.now();
          else if (performance.now() - this._stallSince > 2500) {
            this._stallSince = 0;
            this.fail('Connection lost — opponent stopped responding.');
          }
          return false;
        }
      }
      this._stallSince = 0;
      this.lastRemoteMask = this.remoteQ[this.tick] !== undefined ? this.remoteQ[this.tick] : 0;

      if (this.tick % 120 === 0) {
        const h = matchHash(g);
        this.myHash[this.tick] = h;
        if (this.peerHash[this.tick] !== undefined) this.compareHash(this.tick);
        this.send({ t: 'h', f: this.tick, h });
        for (const k in this.localQ) if (+k < this.tick) delete this.localQ[k];
        for (const k in this.remoteQ) if (+k < this.tick) delete this.remoteQ[k];
      }
      if (this.tick % 90 === 0) { this._pingSentAt = performance.now(); this.send({ t: 'ping', ts: this._pingSentAt }); }
      this.tick++;
      return true;
    }

    maskLocal(tick) { const m = this.localQ[tick]; return m === undefined ? 0 : m; }
    takeRemote(tick) {
      const m = this.remoteQ[tick];
      delete this.remoteQ[tick];
      return m === undefined ? 0 : m;
    }

    // Pause / resume: either side may pause. Resuming jumps both tick clocks forward
    // to a fresh base with empty queues, which re-aligns the lockstep after the freeze.
    requestPause() { this.send({ t: 'pause' }); }
    requestResume() {
      const base = this.tick + 240;
      this.applyResume(base);
      this.send({ t: 'resume', base });
    }
    applyResume(base) {
      this.tick = base;
      this.runway = base + this.delay;
      this.localQ = {};
      this.remoteQ = {};
      this.myHash = {};
      this.peerHash = {};
      this._stallSince = 0;
      if (this.localCtrl) this.localCtrl.reset();
      if (this.remoteCtrl) this.remoteCtrl.reset();
    }

    requestRematch() {
      this.wantRematch = true;
      this.send({ t: 'rematch' });
      if (this.peerWantRematch) this.emit('both-rematch');
    }
  }

  // Controllers ---------------------------------------------------------------
  // The local player's input passes through the same DELAY queue the peer receives,
  // so both fighters are equally delayed and the sim stays symmetric.
  class NetLocalController {
    constructor(session) {
      this.s = session;
      session.localCtrl = this;
      this.held = {};
      this.pressed = {};
      this.prev = 0;
      this.cur = 0;
    }
    reset() { this.prev = 0; this.cur = 0; }
    update() {
      const tick = this.s.tick - 1;
      let m = this.s.localQ[tick];
      if (m === undefined) m = 0;
      this.cur = m;
      this.held = maskHeld(m);
      this.pressed = maskHeld(m & ~this.prev);
      this.prev = m;
    }
  }
  class NetRemoteController {
    constructor(session) {
      this.s = session;
      session.remoteCtrl = this;
      this.held = {};
      this.pressed = {};
      this.prev = 0;
    }
    reset() { this.prev = 0; }
    update() {
      const tick = this.s.tick - 1;
      const m = this.s.takeRemote(tick);
      this.held = maskHeld(m);
      this.pressed = maskHeld(m & ~this.prev);
      this.prev = m;
    }
  }

  JK.NetLocalController = NetLocalController;
  JK.NetRemoteController = NetRemoteController;

  S.newSession = function (role, code) {
    S.session = new NetSession(role, code);
    return S.session;
  };
  S.destroy = function () {
    if (S.session) {
      try { if (S.session.conn) S.session.conn.close(); } catch (e) { /* ignore */ }
      try { if (S.session.peer) S.session.peer.destroy(); } catch (e) { /* ignore */ }
      S.session = null;
    }
  };

  S.DELAY = DELAY;
  S.newCode = newCode;
  return S;
})();
