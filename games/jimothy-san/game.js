'use strict';
/* Jimothy-san — a hunched raccoon's platform adventure. Eight levels; every other one is a mine-cart ride.
   Plain canvas 2D, no images: everything is drawn with paths so it stays sharp at any size.
   Sections: setup · input · sound · save · level building · player · enemies · mine carts · drawing · screens · loop */

/* ---------- setup ---------- */
const W = 960, H = 540, TILE = 40, ROWS = 14;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let SCALE = 1, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SCALE = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = Math.round(W * SCALE) + 'px'; cv.style.height = Math.round(H * SCALE) + 'px';
  cv.width = Math.round(W * SCALE * DPR); cv.height = Math.round(H * SCALE * DPR);
}
addEventListener('resize', resize); resize();
const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* ---------- input ---------- */
const K = {}, PRESS = {};
const MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowUp: 'up', KeyW: 'up',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyX: 'act', ShiftLeft: 'act', ShiftRight: 'act', KeyJ: 'act', Enter: 'start', Escape: 'pause', KeyP: 'pause', KeyM: 'mute' };
addEventListener('keydown', e => { const k = MAP[e.code]; if (!k) return; e.preventDefault(); if (!K[k]) PRESS[k] = true; K[k] = true; Sound.init(); });
addEventListener('keyup', e => { const k = MAP[e.code]; if (k) K[k] = false; });
addEventListener('blur', () => { for (const k in K) K[k] = false; if (S.mode === 'play') S.paused = true; });
const pressed = k => { const v = PRESS[k]; PRESS[k] = false; return v; };
// touch
const touchBox = document.getElementById('touch');
if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) {
  touchBox.hidden = false; const held = {};
  const sync = () => { for (const k of ['left', 'right', 'down', 'act', 'jump']) { const on = Object.values(held).includes(k); if (on && !K[k]) PRESS[k] = true; K[k] = on; } touchBox.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', Object.values(held).includes(b.dataset.k))); };
  touchBox.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); Sound.init();
    if (b.dataset.k === 'pause') { PRESS.pause = true; return; } held[e.pointerId] = b.dataset.k; sync(); });
  const up = e => { delete held[e.pointerId]; sync(); };
  touchBox.addEventListener('pointerup', up); touchBox.addEventListener('pointercancel', up);
  touchBox.addEventListener('pointermove', e => { if (!(e.pointerId in held)) return; const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest && el.closest('[data-k]'); if (b && b.dataset.k !== 'pause' && held[e.pointerId] !== b.dataset.k) { held[e.pointerId] = b.dataset.k; sync(); } });
}
cv.addEventListener('pointerdown', e => { Sound.init(); PRESS.tap = { x: (e.offsetX) / SCALE, y: (e.offsetY) / SCALE }; });
// gamepad
const padWas = {};
function pollPad() {
  let gp = null; try { gp = navigator.getGamepads && [...navigator.getGamepads()].find(p => p); } catch (e) { }
  if (!gp) return;
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const st = { left: ax < -.4 || b(14), right: ax > .4 || b(15), down: ay > .5 || b(13), up: ay < -.5 || b(12), jump: b(0) || b(1), act: b(2) || b(3) || b(7) || b(5), start: b(9), pause: b(9) };
  for (const k in st) { if (st[k] && !padWas[k]) { PRESS[k] = true; Sound.init(); } if (st[k] || padWas[k]) K[k] = st[k]; padWas[k] = st[k]; }
}

/* ---------- sound: a tiny chiptune synth ---------- */
const Sound = {
  ctx: null, muted: false, master: null, songT: 0, step: 0,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = .5; this.master.connect(this.ctx.destination); } catch (e) { } },
  tone(f, d, v, type, when, slide) {
    if (!this.ctx || this.muted) return; const t = when || this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .02);
  },
  noise(d, v, f) { if (!this.ctx || this.muted) return; const n = this.ctx.createBufferSource(), b = this.ctx.createBuffer(1, this.ctx.sampleRate * d, this.ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length); n.buffer = b; const fl = this.ctx.createBiquadFilter(); fl.frequency.value = f || 1200; const g = this.ctx.createGain(); g.gain.value = v; n.connect(fl); fl.connect(g); g.connect(this.master); n.start(); },
  jump() { this.tone(330, .16, .12, 'square', 0, 660); },
  cap() { this.tone(1320, .07, .07, 'square'); this.tone(1980, .1, .05, 'square', this.ctx && this.ctx.currentTime + .05); },
  stomp() { this.tone(220, .12, .15, 'triangle', 0, 90); this.noise(.08, .12, 900); },
  roll() { this.noise(.25, .1, 500); },
  hurt() { this.tone(400, .3, .15, 'sawtooth', 0, 120); },
  boom() { this.noise(.4, .25, 400); },
  life() { if (!this.ctx) return; const t = this.ctx.currentTime;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, .18, .1, 'square', t + i * .09)); },
  letter() { if (!this.ctx) return; const t = this.ctx.currentTime;[784, 988, 1175].forEach((f, i) => this.tone(f, .14, .09, 'triangle', t + i * .07)); },
  clear() { if (!this.ctx) return; const t = this.ctx.currentTime;[523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, .22, .1, 'square', t + i * .13)); },
  // background music: a short pattern per world (scale degrees over a bass line)
  SONGS: [
    { bpm: 132, root: 60, scale: [0, 2, 4, 7, 9], mel: [0, 2, 4, 2, 5, 4, 2, 0, 1, 2, 4, 5, 4, 2, 1, 2], bass: [0, 0, 5, 5, 3, 3, 4, 4] },
    { bpm: 150, root: 57, scale: [0, 3, 5, 7, 10], mel: [0, 1, 2, 4, 3, 2, 1, 2, 0, 1, 2, 3, 4, 3, 2, 1], bass: [0, 0, 3, 3, 4, 4, 2, 2] },
    { bpm: 118, root: 62, scale: [0, 2, 4, 7, 9], mel: [4, 3, 2, 0, 2, 3, 4, 5, 4, 2, 1, 0, 1, 2, 3, 2], bass: [0, 0, 4, 4, 5, 5, 3, 3] },
    { bpm: 156, root: 59, scale: [0, 2, 3, 7, 8], mel: [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 6, 5, 4, 3, 2], bass: [0, 0, 5, 5, 3, 3, 4, 4] },
    { bpm: 124, root: 55, scale: [0, 3, 5, 7, 10], mel: [4, 4, 2, 3, 4, 5, 4, 2, 0, 1, 2, 4, 2, 1, 0, 1], bass: [0, 0, 2, 2, 3, 3, 4, 4] },
    { bpm: 164, root: 52, scale: [0, 1, 4, 5, 7], mel: [0, 1, 2, 1, 3, 2, 4, 3, 5, 4, 3, 2, 1, 2, 1, 0], bass: [0, 0, 1, 1, 0, 0, 3, 3] },
    { bpm: 128, root: 57, scale: [0, 2, 3, 5, 7], mel: [0, 0, 2, 4, 3, 2, 0, 1, 2, 2, 4, 6, 5, 4, 2, 1], bass: [0, 0, 3, 3, 4, 4, 2, 2] },
    { bpm: 170, root: 60, scale: [0, 2, 4, 5, 7], mel: [4, 5, 6, 4, 3, 4, 5, 3, 2, 3, 4, 2, 1, 2, 3, 4], bass: [0, 0, 5, 5, 3, 3, 4, 4] },
  ],
  song: -1,
  music(dt) {
    if (!this.ctx || this.muted || this.song < 0) return; const s = this.SONGS[this.song], beat = 60 / s.bpm / 2;
    this.songT -= dt; if (this.songT > 0) return; this.songT += beat; const st = this.step++;
    const note = d => s.root + s.scale[((d % s.scale.length) + s.scale.length) % s.scale.length] + 12 * Math.floor(d / s.scale.length), hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const m = s.mel[st % s.mel.length]; if (st % 16 !== 15) this.tone(hz(note(m) + 12), beat * .9, .035, 'square');
    if (st % 2 === 0) this.tone(hz(note(s.bass[(st >> 1) % s.bass.length]) - 12), beat * 1.8, .06, 'triangle');
    if (st % 4 === 2) this.noise(.05, .04, 6000);
  },
};

/* ---------- save ---------- */
const SAVE_KEY = 'jimothy-san-v1';
let SAVE = { unlocked: 1, best: {}, lives: 5 };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } };

/* ---------- game state ---------- */
const S = { mode: 'title', t: 0, sel: 0, paused: false, lives: SAVE.lives, caps: 0, hearts: 3, letters: 0, level: null, banner: 0, fade: 0 };
let L = null;   // the level being played
let P = null;   // the player
const parts = [];  // particles
function puff(x, y, n, col, sp, g, life) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (sp || 160) * (.3 + Math.random() * .7); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: g == null ? 600 : g, life: (life || .6) * (.6 + Math.random() * .6), t: 0, r: 2 + Math.random() * 3, col: col || '#fff' }); } }
function popText(x, y, txt, col) { parts.push({ x, y, vx: 0, vy: -70, g: 0, life: .9, t: 0, txt, col: col || '#ffe066' }); }

/* ---------- level building: platform levels ---------- */
function buildWalk(def) {
  const R = rng(def.seed), theme = THEMES[def.theme];
  const pool = CHUNKS.filter(c => c.d <= def.diff);
  const seq = [START_CHUNK];
  let lastIdx = -1;
  for (let i = 0; i < def.len; i++) {
    // later chunks lean toward the hardest the level allows; one checkpoint around the middle
    if (i === Math.floor(def.len / 2)) { seq.push(CHUNKS[6]); continue; }
    let c, idx; let tries = 0;
    do { const hard = pool.filter(x => x.d === def.diff); const from = (R() < .35 + i / def.len * .4 && hard.length) ? hard : pool; c = from[Math.floor(R() * from.length)]; idx = CHUNKS.indexOf(c); } while ((idx === lastIdx || idx === 6) && tries++ < 20);
    lastIdx = idx; seq.push(c);
  }
  seq.push(def.boss ? ARENA : END_CHUNK);
  // stitch columns
  const cols = [];
  for (const ch of seq) {
    const rows = ch.rows, wdt = Math.max(...rows.map(r => r.length)), top = ROWS - rows.length;
    for (let x = 0; x < wdt; x++) { const col = new Array(ROWS).fill('.'); for (let r = 0; r < rows.length; r++) { const row = rows[r], ch2 = x < row.length ? row[x] : (row[row.length - 1] === '#' ? '#' : '.'); col[top + r] = ch2; } cols.push(col); }
  }
  const w = cols.length, grid = new Uint8Array(w * ROWS), ents = [], letterSeq = 'JIMO';
  let li = 0;
  const T = { '#': 1, '=': 2, '^': 3 };
  for (let x = 0; x < w; x++) for (let y = 0; y < ROWS; y++) {
    const c = cols[x][y], px = x * TILE, py = y * TILE;
    if (T[c]) grid[y * w + x] = T[c];
    else if (c === 'o') ents.push({ type: 'cap', x: px + 20, y: py + 20, r: 11 });
    else if (c === 'L') { if (li < 4) ents.push({ type: 'letter', ch: letterSeq[li++], x: px + 20, y: py + 20, r: 18 }); }
    else if (c === 'H') ents.push({ type: 'heart', x: px + 20, y: py + 20, r: 14 });
    else if (c === 'K') ents.push({ type: 'check', x: px + 20, y: py + 40, hit: false });
    else if (c === 'G') ents.push({ type: 'goal', x: px + 20, y: py + 40 });
    else if (c === 'B') ents.push({ type: 'barrel', x: px + 20, y: py + 40 - 16, vx: 0, vy: 0, w: 30, h: 32, state: 'rest' });
    else if (c === 'T') ents.push({ type: 'tyre', x: px + 20, y: py + 40, sq: 0 });
    else if (c === 'p') ents.push(enemy('possum', px + 20, py + 40));
    else if (c === 'h') ents.push(enemy('hedgehog', px + 20, py + 40));
    else if (c === 'c') ents.push(enemy('crow', px + 20, py + 20));
    else if (c === 'z') ents.push(enemy('wasp', px + 20, py + 20));
    else if (c === 'f') ents.push(enemy('frog', px + 20, py + 40));
    else if (c === 'C') ents.push({ type: 'plat', crumble: true, x0: px, y0: py, x: px, y: py, w: TILE, h: 16, dx: 0, dy: 0, fall: 0, down: 0 });
    else if (c === 'M' || c === 'V') {
      if (cols[x - 1] && cols[x - 1][y] === c) continue; // one platform per run of letters
      let n = 1; while (cols[x + n] && cols[x + n][y] === c) n++;
      let range = c === 'M' ? 3.2 * TILE : 3 * TILE;
      if (c === 'V') { // stop above whatever is underneath (thorns or ground), so riding it down never hurts
        let floor = 99; for (let k = 0; k < n; k++) for (let yy = y + 1; yy < (cols[x + k] || []).length; yy++) if ('#^='.includes(cols[x + k][yy])) { floor = Math.min(floor, yy); break; }
        if (floor < 99) range = Math.max(TILE * .75, Math.min(range, floor * TILE - py - TILE * .8));
      }
      ents.push({ type: 'plat', axis: c === 'M' ? 'x' : 'y', x0: px, y0: py, x: px, y: py, w: n * TILE, h: 16, range, ph: R() * TAU, dx: 0, dy: 0 });
    }
  }
  if (def.boss) {
    const ax = (w - 15) * TILE, b = def.boss === 'possum'
      ? { type: 'boss', kind: 'possum', x: ax, y: 11 * TILE, w: 110, h: 84, vx: -120, vy: 0, hp: 3, max: 3, inv: 0, t: 0, alive: true, dir: -1, minX: (w - 29) * TILE, maxX: (w - 1) * TILE }
      : { type: 'boss', kind: 'crow', x: ax, y: 5 * TILE, x0: ax, y0: 5 * TILE, w: 90, h: 60, hp: 4, max: 4, inv: 0, t: 0, alive: true, dir: -1, phase: 'fly', minX: (w - 29) * TILE, maxX: (w - 1) * TILE };
    ents.push(b); ents.push({ type: 'goal', x: (w - 3) * TILE + 20, y: 11 * TILE, locked: true });
  }
  return { kind: 'walk', def, theme, w, grid, ents, pxW: w * TILE, pxH: ROWS * TILE, start: { x: 80, y: 11 * TILE }, check: null, deco: makeDeco(def, w * TILE, R) };
}
function enemy(kind, x, y) {
  const e = { type: 'enemy', kind, x, y, vx: 0, vy: 0, dir: -1, alive: true, t: Math.random() * 10, x0: x, y0: y };
  if (kind === 'possum') { e.w = 38; e.h = 28; e.vx = -70; }
  if (kind === 'hedgehog') { e.w = 36; e.h = 28; e.vx = -50; e.spiky = true; }
  if (kind === 'crow') { e.w = 40; e.h = 26; e.fly = true; }
  if (kind === 'wasp') { e.w = 32; e.h = 28; e.fly = true; e.spiky = true; }
  if (kind === 'frog') { e.w = 34; e.h = 26; e.vx = 0; e.hop = 1 + Math.random(); }
  return e;
}
function makeDeco(def, width, R) {
  // background silhouettes and foreground details, placed once
  const d = { hills: [], trees: [], props: [] };
  for (let x = -200; x < width / 3 + W; x += 160 + R() * 160) d.hills.push({ x, h: 120 + R() * 150, w: 220 + R() * 240 });
  for (let x = -100; x < width / 1.6 + W; x += 70 + R() * 120) d.trees.push({ x, h: 90 + R() * 120, s: R() });
  for (let x = 0; x < width; x += 90 + R() * 260) d.props.push({ x, s: R(), k: Math.floor(R() * 4) });
  return d;
}
const tileAt = (tx, ty) => (tx < 0 || tx >= L.w) ? 1 : (ty < 0 || ty >= ROWS) ? 0 : L.grid[ty * L.w + tx];

/* ---------- player ---------- */
function newPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, w: 40, h: 50, face: 1, ground: false, coyote: 0, jumpBuf: 0, roll: 0, rollCd: 0, slap: 0, carry: null, inv: 0, hurt: 0, anim: 0, duck: false, dead: 0, plat: null, squash: 0 };
}
function solidAt(px, py, vy, prevBottom) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE), t = tileAt(tx, ty);
  if (t === 1 || t === 3) return t;
  if (t === 2 && vy >= 0 && prevBottom <= ty * TILE + 2) return 2;
  return 0;
}
function stepPlayerWalk(dt) {
  const p = P;
  if (p.dead) { p.dead -= dt; p.vy += 2000 * dt; p.y += p.vy * dt; if (p.dead <= 0) loseLife(); return; }
  p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.rollCd = Math.max(0, p.rollCd - dt); p.squash = Math.max(0, p.squash - dt * 4);
  const left = K.left, right = K.right, dir = (right ? 1 : 0) - (left ? 1 : 0);
  p.duck = K.down && p.ground && !p.roll && !p.carry;
  if (pressed('jump')) p.jumpBuf = .12; else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  const act = pressed('act');
  // actions: grab / throw / slap / roll
  if (act && !p.hurt) {
    if (p.carry) throwBarrel();
    else if (p.ground && K.down) { p.slap = .35; slapGround(); }
    else { const b = L.ents.find(e => e.type === 'barrel' && e.state === 'rest' && Math.abs(e.x - p.x) < 44 && Math.abs(e.y - (p.y - 16)) < 40); if (b && p.ground) { b.state = 'held'; p.carry = b; Sound.tone(500, .08, .08); } else if (p.ground && !p.rollCd) { p.roll = .45; p.rollCd = .6; p.vx = p.face * 520; Sound.roll(); puff(p.x - p.face * 10, p.y, 6, 'rgba(230,220,200,.8)', 90, 200, .4); } }
  }
  if (p.slap > 0) p.slap -= dt;
  const ice = L.theme.ice && p.ground, maxV = p.carry ? 230 : ice ? 340 : 300, acc = p.ground ? (ice ? 700 : 1900) : 1300;
  if (p.roll > 0) { p.roll -= dt; p.vx = p.face * 520 * (p.roll > .1 ? 1 : .7); }
  else if (p.slap > 0 || p.duck) p.vx = lerp(p.vx, 0, 1 - Math.exp(-dt * 14));
  else if (dir) { p.face = dir; p.vx = clamp(p.vx + dir * acc * dt * (Math.sign(p.vx) === -dir ? 1.8 : 1), -maxV, maxV); }
  else { const f = (p.ground ? (ice ? 260 : 2200) : 500) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
  // jump (also out of a roll, even just off a ledge)
  if (p.jumpBuf > 0 && (p.ground || p.coyote > 0)) {
    p.vy = -900; p.ground = false; p.coyote = 0; p.jumpBuf = 0; p.plat = null; Sound.jump(); p.squash = .6;
    if (p.roll > 0) { p.roll = 0; p.vx = p.face * 400; }
  }
  if (!K.jump && p.vy < -320) p.vy = -320;
  p.vy = Math.min(p.vy + 2400 * dt, 1100);
  // ride a moving platform
  if (p.plat) { p.x += p.plat.dx; p.y += p.plat.dy; }
  moveBody(p, dt);
  if (p.ground) p.coyote = .1; else p.coyote -= dt;
  // fell into a pit
  if (p.y > L.pxH + 120) { die(); return; }
  // tiles that hurt
  const fx = Math.floor(p.x / TILE), fy = Math.floor((p.y + 2) / TILE);
  if (tileAt(fx, fy) === 3 && p.ground) hurt();
  p.anim += Math.abs(p.vx) * dt * .03 + dt;
  if (p.carry) { p.carry.x = p.x; p.carry.y = p.y - p.h - 14; }
}
function moveBody(b, dt) {
  const hw = b.w / 2;
  // x
  b.x += b.vx * dt;
  const top = b.y - b.h + 4, bot = b.y - 4;
  for (const yy of [top, (top + bot) / 2, bot]) {
    if (b.vx > 0 && (tileAt(Math.floor((b.x + hw) / TILE), Math.floor(yy / TILE)) & 1)) { b.x = Math.floor((b.x + hw) / TILE) * TILE - hw - .01; b.vx = 0; b.hitWall = 1; }
    if (b.vx < 0 && (tileAt(Math.floor((b.x - hw) / TILE), Math.floor(yy / TILE)) & 1)) { b.x = (Math.floor((b.x - hw) / TILE) + 1) * TILE + hw + .01; b.vx = 0; b.hitWall = -1; }
  }
  // y
  const prevBottom = b.y; b.y += b.vy * dt; b.ground = false;
  if (b.vy >= 0) {
    for (const xx of [b.x - hw + 3, b.x + hw - 3]) { const s = solidAt(xx, b.y, b.vy, prevBottom); if (s) { b.y = Math.floor(b.y / TILE) * TILE; b.vy = 0; b.ground = true; b.plat = null; break; } }
    if (!b.ground && b === P) for (const e of L.ents) if (e.type === 'plat' && !e.down && b.x + hw > e.x && b.x - hw < e.x + e.w && prevBottom <= e.y + 2 && b.y >= e.y) { b.y = e.y; b.vy = 0; b.ground = true; b.plat = e; break; }
  } else {
    for (const xx of [b.x - hw + 3, b.x + hw - 3]) { const t = tileAt(Math.floor(xx / TILE), Math.floor((b.y - b.h) / TILE)); if (t === 1 || t === 3) { b.y = (Math.floor((b.y - b.h) / TILE) + 1) * TILE + b.h; b.vy = 0; break; } }
  }
  if (b === P && b.plat) { const e = b.plat; if (!(b.x + hw > e.x && b.x - hw < e.x + e.w)) b.plat = null; else { b.ground = true; b.y = e.y; } }
}
function throwBarrel() {
  const b = P.carry; P.carry = null; b.state = 'thrown'; b.x = P.x + P.face * 30; b.y = P.y - 10; b.vx = P.face * 470; b.vy = -120; b.life = 4;
  Sound.tone(260, .12, .1, 'square', 0, 520);
}
function slapGround() {
  Sound.boom(); L.shake = .25; puff(P.x + P.face * 26, P.y, 14, 'rgba(220,200,170,.9)', 220, 500, .5);
  for (const e of L.ents) if (e.type === 'enemy' && e.alive && !e.fly && Math.abs(e.x - P.x) < 140 && Math.abs(e.y - P.y) < 30) kill(e, 'slap');
}
function hurt() {
  if (P.inv > 0 || P.dead) return;
  S.hearts--; Sound.hurt(); L.shake = .3;
  if (P.carry) { P.carry.state = 'thrown'; P.carry.vx = 0; P.carry.vy = -200; P.carry.life = 1; P.carry = null; }
  if (S.hearts <= 0) { die(); return; }
  P.inv = 1.6; P.hurt = .35; P.vy = -480; P.vx = -P.face * 260; P.roll = 0;
}
function die() { if (P.dead) return; P.dead = 1.6; P.vy = -700; P.vx = 0; S.hearts = 0; Sound.tone(500, .9, .14, 'square', 0, 80); Sound.song = -1; }
function loseLife() {
  S.lives--; SAVE.lives = Math.max(S.lives, 0); save();
  if (S.lives <= 0) { S.mode = 'gameover'; S.t = 0; S.lives = 5; SAVE.lives = 5; save(); return; }
  startLevel(S.levelIdx, true);
}
function kill(e, how) {
  e.alive = false; e.vy = -420; e.vx = (e.x > P.x ? 1 : -1) * 160; e.spin = 0; Sound.stomp(); puff(e.x, e.y - 10, 8, '#fff', 160);
  const pts = { possum: 1, hedgehog: 2, crow: 1, wasp: 3 }[e.kind] || 1; L.combo = (L.combo || 0) + 1;
  if (how === 'stomp' && L.combo > 2) popText(e.x, e.y - 40, '×' + L.combo, '#fff');
  addCaps(pts, e.x, e.y - 30, true);
}
function addCaps(n, x, y, quiet) {
  S.caps += n; if (!quiet) Sound.cap();
  if (S.caps >= 100) { S.caps -= 100; S.lives++; SAVE.lives = S.lives; save(); Sound.life(); popText(x, y - 20, '1-UP!', '#7dff9b'); }
}

/* ---------- entities on platform levels ---------- */
function stepEnts(dt) {
  const p = P;
  for (const e of L.ents) {
    if (e.type === 'plat' && e.crumble) {
      if (p.plat === e && !e.fall && !e.down) { e.fall = .5; Sound.noise(.1, .06, 900); }
      if (e.fall > 0) { e.fall -= dt; if (e.fall <= 0) { e.down = 4; if (p.plat === e) p.plat = null; puff(e.x + 20, e.y + 8, 6, '#a0703a', 100, 500, .5); } }
      if (e.down > 0) { e.down -= dt; e.y = e.y0 + (4 - e.down) * 220; if (e.down <= 0) { e.down = 0; e.fall = 0; e.y = e.y0; } }
      continue;
    }
    if (e.type === 'plat') {
      const ox = e.x, oy = e.y, s = Math.sin(S.t * 1.2 + e.ph);
      if (e.axis === 'x') e.x = e.x0 + s * e.range; else e.y = e.y0 + s * e.range;
      e.dx = e.x - ox; e.dy = e.y - oy;
    } else if (e.type === 'enemy') stepEnemy(e, dt);
    else if (e.type === 'boss') stepBoss(e, dt);
    else if (e.type === 'barrel' && e.state === 'thrown') {
      e.life -= dt; e.vy = Math.min(e.vy + 2200 * dt, 1100); e.hitWall = 0; moveBody(e, dt);
      if (e.ground && Math.abs(e.vx) > 50) e.vx = Math.sign(e.vx) * 470;
      e.rot = (e.rot || 0) + e.vx * dt / 16;
      for (const o of L.ents) if (o.type === 'boss' && o.alive && o.inv <= 0 && (o.kind === 'possum' || o.phase === 'low') && Math.abs(o.x - e.x) < (o.w + e.w) / 2 && Math.abs((o.y - o.h / 2) - (e.y - e.h / 2)) < (o.h + e.h) / 2) { o.hp--; o.inv = 1.4; e.life = 0; Sound.boom(); L.shake = .3; if (o.hp <= 0) bossDown(o); }
      for (const o of L.ents) if (o.type === 'enemy' && o.alive && Math.abs(o.x - e.x) < (o.w + e.w) / 2 && Math.abs((o.y - o.h / 2) - (e.y - e.h / 2)) < (o.h + e.h) / 2) kill(o, 'barrel');
      if (e.hitWall || e.life <= 0 || e.y > L.pxH + 100) { e.state = 'gone'; Sound.boom(); puff(e.x, e.y - 16, 16, '#a0703a', 260, 700, .7); }
    } else if (e.type === 'tyre') {
      e.sq = Math.max(0, e.sq - dt * 3);
      if (p.vy > 0 && Math.abs(p.x - e.x) < 34 && p.y >= e.y - 24 && p.y <= e.y - 4) { p.y = e.y - 24; p.vy = K.jump ? -1250 : -1050; p.ground = false; e.sq = 1; Sound.tone(180, .3, .14, 'triangle', 0, 520); p.roll = 0; }
    }
  }
  // a tip the first time each tricky enemy shows up
  for (const e of L.ents) if (e.type === 'enemy' && e.alive && TIPS[e.kind] && !SAVE['tip_' + e.kind] && Math.abs(e.x - p.x) < 520) { SAVE['tip_' + e.kind] = 1; save(); L.tip = { txt: TIPS[e.kind], t: 5 }; }
  if (L.tip) L.tip.t -= dt;
  // pickups and contact
  for (const e of L.ents) {
    if (e.gone) continue;
    const near = (r) => Math.abs(e.x - p.x) < r + p.w / 2 && Math.abs(e.y - (p.y - p.h / 2)) < r + p.h / 2;
    if (e.type === 'cap' && near(e.r)) { e.gone = true; addCaps(1, e.x, e.y); puff(e.x, e.y, 5, '#ffe066', 120, 0, .35); }
    else if (e.type === 'letter' && near(e.r)) { e.gone = true; S.letters |= 1 << 'JIMO'.indexOf(e.ch); Sound.letter(); popText(e.x, e.y - 24, e.ch + '!', '#ff9ad1'); if (S.letters === 15) { S.lives++; Sound.life(); popText(e.x, e.y - 50, 'J·I·M·O  1-UP!', '#7dff9b'); } }
    else if (e.type === 'heart' && near(e.r)) { e.gone = true; S.hearts = Math.min(3, S.hearts + 1); Sound.letter(); }
    else if (e.type === 'check' && !e.hit && Math.abs(e.x - p.x) < 40) { e.hit = true; L.check = { x: e.x, y: e.y }; Sound.life(); puff(e.x, e.y - 30, 18, '#ffe066', 220, 300, .8); popText(e.x, e.y - 70, 'Checkpoint', '#fff'); }
    else if (e.type === 'goal' && !e.locked && Math.abs(e.x - p.x) < 30 && !L.done) levelClear();
    else if (e.type === 'enemy' && e.alive && !p.dead) {
      const ex = Math.abs(e.x - p.x) < (e.w + p.w) / 2 - 4, ey = Math.abs((e.y - e.h / 2) - (p.y - p.h / 2)) < (e.h + p.h) / 2 - 4;
      if (!ex || !ey) continue;
      const fromAbove = p.vy > 60 && p.y - e.y < -e.h * .35;
      if (fromAbove && (!e.spiky || e.kind === 'wasp')) { kill(e, 'stomp'); p.vy = K.jump ? -820 : -560; p.roll = 0; }
      else if (fromAbove && e.kind === 'hedgehog') { p.vy = K.jump ? -760 : -520; p.roll = 0; Sound.tone(700, .06, .06, 'square', 0, 300); popText(e.x, e.y - 40, 'Spiky! Roll into it', '#ffd0a0'); }
      else if (p.roll > 0 && (e.kind === 'hedgehog' || e.kind === 'wasp')) kill(e, 'roll');
      else if (p.roll > 0 && !e.spiky && !e.fly) kill(e, 'roll');
      else if (p.roll > 0 && e.kind === 'crow' && e.y > p.y - 60) kill(e, 'roll');
      else hurt();
    }
  }
  if (p.ground) L.combo = 0;
}
const TIPS = { hedgehog: 'Hedgehogs are spiky: roll into them (X), slap the ground (↓ + X) or throw a barrel', wasp: 'Wasps: bounce on them, roll into them, or throw a barrel', frog: 'Frogs hop at you: bounce on them or roll' };
function stepEnemy(e, dt) {
  e.t += dt;
  if (!e.alive) { e.vy += 1800 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.spin = (e.spin || 0) + dt * 10; if (e.y > L.pxH + 200) e.gone = true; return; }
  if (e.fly) {
    if (e.kind === 'crow') { e.x = e.x0 - ((e.t * 60) % 400) * 0 + Math.sin(e.t * .9) * 120; e.y = e.y0 + Math.sin(e.t * 2.6) * 26; e.dir = Math.cos(e.t * .9) > 0 ? 1 : -1; }
    else { e.x = e.x0 + Math.sin(e.t * 1.4) * 70; e.y = e.y0 + Math.sin(e.t * 3.1) * 50; e.dir = Math.cos(e.t * 1.4) > 0 ? 1 : -1; }
    return;
  }
  if (e.kind === 'frog') { // hops toward Jimothy when he's near
    e.vy = Math.min(e.vy + 2200 * dt, 1100); e.hitWall = 0; moveBody(e, dt);
    if (e.ground) { e.vx = 0; e.hop -= dt; if (e.hop <= 0 && Math.abs(P.x - e.x) < 420) { e.hop = 1.1 + Math.random() * .6; e.vy = -620; e.vx = Math.sign(P.x - e.x) * 160; e.dir = Math.sign(e.vx); Sound.tone(300, .08, .04, 'triangle', 0, 600); } }
    if (e.y > L.pxH + 100) e.gone = true; return;
  }
  // walkers turn at walls and at ledges
  e.vy = Math.min(e.vy + 2200 * dt, 1100); e.hitWall = 0; moveBody(e, dt);
  const ahead = e.x + Math.sign(e.vx) * (e.w / 2 + 2);
  if (e.hitWall || (e.ground && !tileAt(Math.floor(ahead / TILE), Math.floor((e.y + 4) / TILE)))) e.vx = -e.vx || (e.kind === 'possum' ? 70 : 50);
  if (e.vx === 0) e.vx = e.kind === 'possum' ? -70 : -50;
  e.dir = Math.sign(e.vx);
  if (e.y > L.pxH + 100) e.gone = true;
}

/* ---------- bosses ----------
   King Possum stomps around his dump and hurls trash cans; land on his head three times.
   The Crow Baron circles high, drops eggs, then swoops low: stomp him four times while he's down. */
function stepBoss(b, dt) {
  const p = P; b.t += dt; b.inv = Math.max(0, b.inv - dt);
  if (!b.alive) { b.vy = (b.vy || 0) + 1600 * dt; b.y += b.vy * dt; b.spin = (b.spin || 0) + dt * 6; return; }
  const near = p.x > b.minX - 200; if (!near) return;
  if (!L.bossSeen) { L.bossSeen = true; popText(b.x, b.y - 120, b.kind === 'possum' ? 'KING POSSUM!' : 'THE CROW BARON!', '#ff7a8a'); Sound.song = -1; Sound.tone(110, .6, .15, 'sawtooth', 0, 70); }
  if (b.kind === 'possum') {
    const spd = 120 + (b.max - b.hp) * 50;
    b.vy = Math.min((b.vy || 0) + 2200 * dt, 1200); b.x += Math.sign(b.vx || -1) * spd * dt; b.y += b.vy * dt;
    if (b.y >= 11 * TILE) { if (b.vy > 600) { L.shake = .3; Sound.boom(); } b.y = 11 * TILE; b.vy = 0; b.ground = true; } else b.ground = false;
    if (b.x < b.minX + 60) b.vx = 1; if (b.x > b.maxX - 60) b.vx = -1; b.dir = Math.sign(b.vx || -1);
    b.cd = (b.cd || 2) - dt;
    if (b.cd <= 0 && b.ground) { b.cd = 2.6 - (b.max - b.hp) * .5; if (Math.random() < .45) b.vy = -950; else { const dir = Math.sign(p.x - b.x) || -1; L.ents.push({ type: 'can', x: b.x + dir * 50, y: b.y - 30, vx: dir * (300 + (b.max - b.hp) * 60), vy: -200, r: 16, life: 5 }); Sound.tone(220, .15, .1, 'square', 0, 110); } }
  } else {
    const hurt = b.max - b.hp;
    if (b.phase === 'fly') { b.x = (b.minX + b.maxX) / 2 + Math.sin(b.t * (.8 + hurt * .15)) * ((b.maxX - b.minX) / 2 - 80); b.y = 4 * TILE + Math.sin(b.t * 2.4) * 30; b.dir = Math.cos(b.t * .8) > 0 ? 1 : -1;
      b.egg = (b.egg || 1.4) - dt; if (b.egg <= 0) { b.egg = 1.3 - hurt * .2; L.ents.push({ type: 'can', egg: true, x: b.x, y: b.y + 20, vx: 0, vy: 0, r: 11, life: 4 }); }
      b.cd = (b.cd || 4) - dt; if (b.cd <= 0) { b.phase = 'dive'; b.tx = p.x; b.ty = 11 * TILE - 30; b.cd = 0; Sound.tone(700, .4, .08, 'sawtooth', 0, 200); } }
    else if (b.phase === 'dive') { const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy); if (d < 12) { b.phase = 'low'; b.lowT = 1.6; } else { b.x += dx / d * 520 * dt; b.y += dy / d * 520 * dt; b.dir = Math.sign(dx) || b.dir; } }
    else if (b.phase === 'low') { b.lowT -= dt; b.x += Math.sin(b.t * 10) * 20 * dt; if (b.lowT <= 0) { b.phase = 'rise'; } }
    else if (b.phase === 'rise') { b.y -= 360 * dt; if (b.y < 4 * TILE) { b.phase = 'fly'; b.cd = 3.5 - hurt * .4; } }
  }
  // contact with Jimothy
  const ex = Math.abs(b.x - p.x) < (b.w + p.w) / 2 - 6, ey = Math.abs((b.y - b.h / 2) - (p.y - p.h / 2)) < (b.h + p.h) / 2 - 6;
  if (ex && ey && !p.dead) {
    const above = p.vy > 60 && p.y < b.y - b.h * .45, stompable = b.kind === 'possum' || b.phase === 'low' || b.phase === 'dive';
    if (above && stompable && b.inv <= 0) { b.hp--; b.inv = 1.4; p.vy = -820; Sound.stomp(); L.shake = .3; puff(b.x, b.y - b.h, 14, '#fff', 220); if (b.kind === 'crow') { b.phase = 'rise'; } if (b.hp <= 0) bossDown(b); }
    else if (b.inv <= 0 || !above) hurt();
  }
}
function bossDown(b) {
  b.alive = false; b.vy = -500; Sound.clear(); addCaps(25, b.x, b.y - 80); popText(b.x, b.y - 140, 'Boss defeated!', '#7dff9b');
  for (const e of L.ents) { if (e.type === 'goal') e.locked = false; if (e.type === 'can') e.life = 0; }
  for (let k = 0; k < 20; k++) setTimeout(() => puff(b.x + (Math.random() - .5) * 200, b.y - 100, 4, ['#ffe066', '#ff7aa8', '#7de0ff'][k % 3], 220, 300, 1), k * 60);
}
function stepCans(dt) {
  for (const c of L.ents) {
    if (c.type !== 'can' || c.gone) continue;
    c.life -= dt; if (c.life <= 0) { c.gone = true; continue; }
    c.vy = Math.min(c.vy + 1800 * dt, 900); c.x += c.vx * dt; c.y += c.vy * dt; c.rot = (c.rot || 0) + c.vx * dt / 14;
    const floor = 11 * TILE - c.r; if (c.y > floor && tileAt(Math.floor(c.x / TILE), 11) === 1) { if (c.egg) { c.gone = true; puff(c.x, floor, 8, '#fff8e0', 120, 400, .5); continue; } c.y = floor; c.vy = -Math.abs(c.vy) * .35; }
    if (Math.abs(c.x - P.x) < c.r + P.w / 2 - 4 && Math.abs(c.y - (P.y - P.h / 2)) < c.r + P.h / 2 - 4) { if (P.roll > 0 && !c.egg) { c.gone = true; Sound.stomp(); puff(c.x, c.y, 8, '#aaa', 160); } else hurt(); }
  }
}
function drawBoss(b) {
  if (b.inv > 0 && Math.floor(S.t * 18) % 2 && b.alive) return;
  ctx.save(); ctx.translate(b.x, b.y); if (!b.alive) ctx.rotate(b.spin || 0);
  if (b.kind === 'possum') {
    ctx.scale(2.8 * (b.dir < 0 ? -1 : 1), 2.8); drawPossum({ x: 0, y: 0, dir: 1, t: b.t, alive: true });
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(4, -30); ctx.lineTo(7, -38); ctx.lineTo(10, -32); ctx.lineTo(13, -39); ctx.lineTo(16, -31); ctx.lineTo(19, -37); ctx.lineTo(20, -28); ctx.lineTo(4, -27); ctx.fill();
  } else {
    ctx.scale(2.6, 2.6); drawCrow(0, -10, b.dir, b.t * (b.phase === 'low' ? .3 : 1), true);
    ctx.fillStyle = '#1b1b22'; ctx.fillRect(10, -26, 10, 7); ctx.fillRect(8, -20, 14, 2); // top hat
    ctx.fillStyle = '#d8b860'; ctx.beginPath(); ctx.arc(19, -10, 3, 0, TAU); ctx.lineWidth = .8; ctx.strokeStyle = '#d8b860'; ctx.stroke(); // monocle
  }
  ctx.restore();
}
function drawCans() { for (const c of L.ents) if (c.type === 'can' && !c.gone) { if (c.egg) { ell(c.x, c.y, 9, 11, 0, '#fff8e0'); ell(c.x - 3, c.y - 3, 3, 4, 0, '#fff'); } else { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot || 0); ctx.fillStyle = '#9aa2a9'; rr(-14, -16, 28, 32, 4); ctx.fill(); ctx.fillStyle = '#7d858c'; ctx.fillRect(-14, -6, 28, 3); ctx.fillRect(-14, 4, 28, 3); ctx.restore(); } } }
function drawFrog(e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir < 0 ? -1 : 1, 1); if (!e.alive) ctx.rotate(e.spin || 0);
  const air = !e.ground; ell(0, -12, 17, air ? 9 : 11, 0, '#4caf50'); ell(4, -10, 11, 7, 0, '#a5e08a');
  ell(-6, -22, 5, 5, 0, '#4caf50'); ell(7, -22, 5, 5, 0, '#4caf50'); ell(-6, -23, 3, 3, 0, '#fff'); ell(7, -23, 3, 3, 0, '#fff'); ell(-5, -23, 1.5, 1.5, 0, '#111'); ell(8, -23, 1.5, 1.5, 0, '#111');
  ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(air ? -20 : -14, air ? 4 : 0); ctx.moveTo(10, -6); ctx.lineTo(air ? 18 : 12, air ? 4 : 0); ctx.stroke();
  ctx.restore();
}

/* ---------- mine-cart levels ---------- */
function buildCart(def) {
  const R = rng(def.seed), theme = THEMES[def.theme], d = def.diff;
  const segs = [], ev = [], caps = [];
  let x = 0, y = 380;
  const flat = n => { segs.push({ x0: x, x1: x + n, y0: y, y1: y }); x += n; };
  const ramp = (n, dy) => { const ny = clamp(y + dy, 220, 440); segs.push({ x0: x, x1: x + n, y0: y, y1: ny }); x += n; y = ny; };
  flat(900);
  let lettersLeft = 4, heartPlaced = false, checkPlaced = false;
  while (x < def.len) {
    const r = R(), every = CART.every[d] * (.7 + R() * .6), progress = x / def.len;
    if (r < .22) { // gap: jump it; caps over the arc
      const gw = lerp(CART.gapMin[d], CART.gapMax[d], R() * (.5 + progress * .5)); flat(160);
      const gx = x; x += gw; const ny = clamp(y + (R() - .6) * 90, 230, 430);
      for (let k = 1; k < 6; k++) { const f = k / 6; caps.push({ x: gx - 60 + f * (gw + 120), y: lerp(y, ny, f) - 70 - Math.sin(f * Math.PI) * 120 }); }
      y = ny; flat(180);
    } else if (r < .38) { // crate on the rail
      flat(240); ev.push({ k: 'crate', x: x - 120 }); flat(every * .6);
    } else if (r < .52 && d >= 0) { // low beam: duck
      flat(300); ev.push({ k: 'beam', x: x - 150 }); flat(every * .5);
    } else if (r < .64) { // crows over the rail
      flat(200); const n = 1 + Math.floor(R() * (1 + d)); for (let k = 0; k < n; k++) ev.push({ k: 'crow', x: x + k * 150, h: 135 + R() * 40 }); flat(every * .7 + n * 150);
    } else if (r < .74 && progress > .15) { // possum in a cart ahead: stomp it
      flat(120); ev.push({ k: 'pcart', x: x + 300 }); flat(every);
    } else if (r < .9) { // hills
      ramp(300 + R() * 200, (R() - .5) * 220); for (let k = 0; k < 4; k++) caps.push({ x: x - 260 + k * 60, y: y - 70 });
      ramp(260 + R() * 200, (R() - .5) * 200);
    } else { // big jump with double gap
      flat(140); const gx = x; x += CART.gapMin[d] * .9; flat(110); x += CART.gapMin[d] * .9; for (let k = 0; k < 7; k++) caps.push({ x: gx + k * 50, y: y - 150 - Math.sin(k / 6 * Math.PI) * 60 }); flat(200);
    }
    if (lettersLeft > 0 && progress > (4 - lettersLeft) * .22 + .08) { ev.push({ k: 'letter', x: x - 80, ch: 'JIMO'[4 - lettersLeft], h: 170 }); lettersLeft--; }
    if (!heartPlaced && progress > .5) { ev.push({ k: 'heart', x: x - 60, h: 140 }); heartPlaced = true; }
    if (!checkPlaced && x > def.len / 2) { checkPlaced = true; flat(200); ev.push({ k: 'check', x: x - 100 }); }
  }
  flat(1200); const endX = x - 900; ev.push({ k: 'goal', x: endX });
  const ents = ev.map(e => Object.assign({ alive: true, t: Math.random() * 6 }, e)).concat(caps.map(c => ({ k: 'cap', x: c.x, y: c.y, alive: true })));
  ents.forEach(e => { if (e.k === 'pcart') { e.v = 0; e.y = 0; } });
  return { kind: 'cart', def, theme, segs, ents, endX, pxW: x, start: { x: 120 }, check: null, deco: makeDeco(def, x, R), speed0: CART.speed[d], speedUp: CART.speedUp[d] };
}
function railY(x) {
  // binary search the rail pieces; null over a gap
  const s = L.segs; let lo = 0, hi = s.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (x < s[m].x0) hi = m - 1; else if (x > s[m].x1) lo = m + 1; else { const g = s[m]; return lerp(g.y0, g.y1, (x - g.x0) / (g.x1 - g.x0 || 1)); } }
  return null;
}
function newCartPlayer(x) { const y = railY(x) || 380; return { x, y, vy: 0, ground: true, duck: false, inv: 0, dead: 0, anim: 0, tilt: 0, face: 1, jumpBuf: 0, coyote: 0 }; }
function stepCart(dt) {
  const p = P;
  if (p.dead) { p.dead -= dt; p.vy += 2000 * dt; p.y += p.vy * dt; if (p.dead <= 0) loseLife(); return; }
  p.inv = Math.max(0, p.inv - dt);
  const prog = clamp(p.x / L.endX, 0, 1), speed = L.done ? Math.max(0, (L.speedNow || 300) - 260 * dt) : L.speed0 + L.speedUp * prog;
  L.speedNow = speed;
  p.x += speed * dt; p.anim += speed * dt;
  p.duck = K.down && p.ground;
  if (pressed('jump')) p.jumpBuf = .12; else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (p.jumpBuf > 0 && (p.ground || p.coyote > 0) && !L.done) { p.vy = -820; p.ground = false; p.jumpBuf = 0; p.coyote = 0; Sound.jump(); }
  if (!K.jump && p.vy < -300) p.vy = -300;
  const ry = railY(p.x);
  if (p.ground) {
    if (ry == null) { p.ground = false; p.coyote = .08; p.vy = 0; }
    else { const ry2 = railY(p.x + 6); p.tilt = ry2 != null ? Math.atan2(ry2 - ry, 6) : p.tilt; p.y = ry; }
  }
  if (!p.ground) {
    p.coyote -= dt; const prevY = p.y; p.vy = Math.min(p.vy + 2300 * dt, 1300); p.y += p.vy * dt; p.tilt = lerp(p.tilt, clamp(p.vy / 2000, -.4, .4), 1 - Math.exp(-dt * 6));
    if (ry != null && p.vy >= 0 && prevY <= ry + 4 && p.y >= ry) { p.y = ry; p.vy = 0; p.ground = true; Sound.noise(.06, .12, 2500); puff(p.x - 20, p.y, 6, '#ffcf6b', 140, 400, .35); }
  }
  if (p.ground && ((L.t * 60) | 0) % 5 === 0 && speed > 200) parts.push({ x: p.x - 26, y: p.y - 2, vx: -speed * .2 - 40 * Math.random(), vy: -80 - Math.random() * 120, g: 900, life: .3, t: 0, r: 1.5, col: L.theme.glow });
  if (p.y > H + 160) { die(); return; }
  const top = p.y - (p.duck ? 52 : 92), cx = p.x;
  for (const e of L.ents) {
    if (!e.alive) continue; e.t += dt;
    if (e.k === 'cap') { if (Math.abs(e.x - cx) < 30 && e.y > top - 10 && e.y < p.y + 6) { e.alive = false; addCaps(1, e.x, e.y); puff(e.x, e.y, 5, '#ffe066', 120, 0, .35); } continue; }
    if (e.k === 'letter' || e.k === 'heart') { const ey = (railY(e.x) || 380) - e.h; if (Math.abs(e.x - cx) < 34 && ey > top - 24 && ey < p.y) { e.alive = false; if (e.k === 'heart') { S.hearts = Math.min(3, S.hearts + 1); Sound.letter(); } else { S.letters |= 1 << 'JIMO'.indexOf(e.ch); Sound.letter(); popText(e.x, ey - 30, e.ch + '!', '#ff9ad1'); if (S.letters === 15) { S.lives++; Sound.life(); } } } continue; }
    if (e.k === 'check') { if (cx > e.x) { e.alive = false; L.check = { x: e.x + 40 }; Sound.life(); popText(cx, p.y - 120, 'Checkpoint', '#fff'); } continue; }
    if (e.k === 'goal') { if (cx > e.x && !L.done) levelClear(); continue; }
    if (e.k === 'pcart') { const ey = railY(e.x); if (ey == null) { e.y += 900 * dt; e.fall = true; } else e.y = ey; e.x += speed * .55 * dt * (e.x - cx < 900 ? 1 : 0); }
    const ex = e.x, ey = e.k === 'crow' ? (railY(e.x) || 380) - e.h + Math.sin(e.t * 4) * 12 : e.k === 'beam' ? (railY(e.x) || 380) - 70 : e.k === 'pcart' ? e.y : (railY(e.x) || 380);
    if (Math.abs(ex - cx) > 36) continue;
    if (p.inv > 0) continue;
    if (e.k === 'crate') { if (p.y > ey - 34) { e.alive = false; Sound.boom(); puff(ex, ey - 20, 16, '#a0703a', 260, 700, .7); cartHurt(); } }
    else if (e.k === 'beam') { if (top < ey) { cartHurt(); e.alive = false; } }
    else if (e.k === 'crow') { if (top < ey + 12 && p.y > ey - 18) { if (p.vy > 50 && p.y < ey + 6) { e.alive = false; Sound.stomp(); p.vy = -700; addCaps(1, ex, ey, true); puff(ex, ey, 8, '#fff', 160); } else { e.alive = false; cartHurt(); } } }
    else if (e.k === 'pcart') { if (p.y > ey - 66) { if (p.vy > 50 && p.y < ey - 30) { e.alive = false; e.dead = true; Sound.stomp(); p.vy = -760; addCaps(3, ex, ey - 60, true); popText(ex, ey - 90, '+3', '#ffe066'); } else { e.alive = false; cartHurt(); } } }
  }
}
function cartHurt() { if (P.inv > 0) return; S.hearts--; Sound.hurt(); L.shake = .35; if (S.hearts <= 0) die(); else P.inv = 1.5; }

/* ---------- level flow ---------- */
function startLevel(i, retry) {
  S.levelIdx = i; const def = LEVELS[i];
  const keepCheck = retry && L && L.def === def ? L.check : null;
  L = def.kind === 'walk' ? buildWalk(def) : buildCart(def); L.t = 0; L.shake = 0; L.check = keepCheck;
  if (L.kind === 'walk') {
    const st = keepCheck || L.start; P = newPlayer(st.x, st.y);
    if (keepCheck) for (const e of L.ents) if (e.type === 'check' && e.x <= keepCheck.x) e.hit = true;
  } else {
    P = newCartPlayer(keepCheck ? keepCheck.x : L.start.x);
    if (keepCheck) for (const e of L.ents) if (e.x < keepCheck.x + 300 && e.k !== 'goal') e.alive = false;
  }
  if (!retry) { S.letters = 0; S.lvlCaps0 = S.caps; }
  S.hearts = 3; parts.length = 0; S.mode = 'intro'; S.t = 0; S.paused = false;
  Sound.song = THEMES[def.theme].music; Sound.step = 0; Sound.songT = 0;
}
function levelClear() {
  L.done = true; L.doneT = 0; Sound.clear(); Sound.song = -1;
  const id = L.def.id, b = SAVE.best[id] || {};
  b.done = true; b.letters = (b.letters || 0) | S.letters; SAVE.best[id] = b;
  SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(LEVELS.length, S.levelIdx + 2)); SAVE.lives = S.lives; save();
  for (let k = 0; k < 40; k++) setTimeout(() => P && puff(P.x + (Math.random() - .5) * 300, (L.kind === 'cart' ? P.y : P.y) - 200 - Math.random() * 100, 3, ['#ffe066', '#ff7aa8', '#7de0ff', '#9dff8a'][k % 4], 200, 300, 1.2), k * 40);
}

/* ---------- drawing helpers ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function ell(x, y, rx, ry, rot, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function txt(s, x, y, size, col, align, stroke) {
  ctx.font = `800 ${size}px "Baloo 2", system-ui, sans-serif`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke !== false) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(10,14,20,.75)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}

/* Jimothy: big, hunched, knuckle-walking raccoon with a red headband. Origin at his feet. */
function drawJim(x, y, o) {
  const face = o.face || 1, t = o.t || 0, mode = o.mode || 'idle', sc = o.scale || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(face * sc, sc);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const fur = '#868a94', furD = '#5d616b', belly = '#d5d0c4', mask = '#26262d', band = '#d8343a';
  if (mode === 'roll') {
    ctx.rotate(t * 14); ell(0, -24, 26, 26, 0, fur);
    ctx.lineWidth = 6; ctx.strokeStyle = furD; for (const a of [0, 2.1, 4.2]) { ctx.beginPath(); ctx.arc(0, -24, 18, a, a + 1.2); ctx.stroke(); }
    ell(10, -32, 7, 5, 0, mask); ctx.fillStyle = band; ctx.fillRect(-26, -30, 52, 6);
    ctx.restore(); return;
  }
  const walk = mode === 'walk', bob = walk ? Math.abs(Math.sin(t * 6)) * 3 : Math.sin(t * 2) * 1.2, duck = mode === 'duck' || mode === 'slap';
  const sq = o.squash || 0; ctx.scale(1 - sq * .12, 1 + sq * .12 - (duck ? .22 : 0));
  // tail: thick, ringed, curling up behind
  ctx.save(); ctx.translate(-22, -26 - bob); ctx.rotate(-.5 + Math.sin(t * 3) * .12);
  for (let i = 0; i < 6; i++) { ell(-6 - i * 6, -i * 4.5, 10 - i * .6, 9 - i * .5, 0, i % 2 ? mask : fur); }
  ctx.restore();
  // back leg
  const sw = walk ? Math.sin(t * 6) : 0;
  ell(-12 - sw * 6, -9, 9, 11, .2, furD); ell(-10 - sw * 8, -2, 11, 5, 0, mask);
  // body: big hunched torso leaning forward
  ell(-2, -34 - bob, 28, 24, -.35, furD);
  ell(2, -32 - bob, 25, 21, -.35, fur);
  ell(10, -24 - bob, 13, 12, -.2, belly);
  // front leg
  ell(-4 + sw * 6, -9, 9, 11, -.1, fur); ell(-2 + sw * 8, -2, 11, 5, 0, mask);
  // far arm (behind head)
  const reach = mode === 'jump' ? -1 : mode === 'carry' ? -2 : 0;
  armPath(14, -40 - bob, reach === 0 ? 30 - sw * 10 : 6, reach === 0 ? -4 : -78, furD);
  // head: low and forward
  const hx = 24, hy = -38 - bob + (duck ? 6 : 0);
  ell(hx - 9, hy - 14, 7, 9, -.4, fur); ell(hx - 9, hy - 14, 3.5, 5, -.4, mask); // ear
  ell(hx + 5, hy - 15, 7, 9, .3, fur); ell(hx + 5, hy - 15, 3.5, 5, .3, mask);
  ell(hx, hy, 17, 15, 0, fur);
  ell(hx + 12, hy + 5, 11, 7, .1, belly); // snout
  ell(hx + 21, hy + 3, 4, 3.4, 0, '#1b1b20'); // nose
  // mask band across the eyes
  ctx.beginPath(); ctx.moveTo(hx - 15, hy - 3); ctx.quadraticCurveTo(hx + 2, hy - 12, hx + 17, hy - 4); ctx.quadraticCurveTo(hx + 18, hy + 4, hx + 8, hy + 2); ctx.quadraticCurveTo(hx, hy - 1, hx - 6, hy + 3); ctx.quadraticCurveTo(hx - 14, hy + 4, hx - 15, hy - 3); ctx.fillStyle = mask; ctx.fill();
  const blink = (Math.sin(t * 1.3) > .985) || mode === 'hurt';
  if (blink) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 3, hy - 3); ctx.lineTo(hx + 10, hy - 3); ctx.stroke(); }
  else { ell(hx + 7, hy - 3, 4.2, 4.6, 0, '#fff'); ell(hx + 8.2, hy - 2.6, 2.2, 2.6, 0, '#14141a'); ell(hx + 8.8, hy - 3.6, .9, .9, 0, '#fff'); }
  // headband with fluttering tails
  ctx.fillStyle = band; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 9, 17, 4.5, -.12, Math.PI, TAU); ctx.lineTo(hx + 16, hy - 6); ctx.lineTo(hx - 17, hy - 5); ctx.fill();
  const fl = Math.sin(t * 9) * 4; ctx.beginPath(); ctx.moveTo(hx - 16, hy - 8); ctx.quadraticCurveTo(hx - 28, hy - 12 + fl, hx - 36, hy - 4 + fl); ctx.lineTo(hx - 33, hy - 1 + fl); ctx.quadraticCurveTo(hx - 26, hy - 6, hx - 15, hy - 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + 2, hy - 9.5, 2.4, 0, TAU); ctx.fill();
  // mouth
  ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); if (mode === 'hurt') ctx.arc(hx + 13, hy + 10, 3, Math.PI, TAU); else ctx.arc(hx + 13, hy + 7, 3.5, .2, Math.PI - .4); ctx.stroke();
  // near arm: long, knuckles on the ground when walking
  armPath(8, -36 - bob, reach === 0 ? 34 + sw * 10 : reach === -2 ? -8 : 20, reach === 0 ? -3 : reach === -2 ? -80 : -70, fur, mode === 'slap');
  ctx.restore();
}
function armPath(sx, sy, hx, hy, col, slam) {
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + hx) / 2 + 8, (sy + hy) / 2 - 6, hx, hy); ctx.stroke();
  ell(hx + 2, hy - 1, slam ? 10 : 8, slam ? 6 : 6.5, 0, '#2c2c33');
}

function drawPossum(e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir < 0 ? -1 : 1, 1); if (!e.alive) ctx.rotate(e.spin || 0);
  const b = Math.abs(Math.sin(e.t * 9)) * 2;
  ctx.strokeStyle = '#e7a6b5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -10); ctx.quadraticCurveTo(-34, -6, -30, -22); ctx.stroke();
  ell(-2, -13 - b, 19, 12, 0, '#cfcac4'); ell(-4, -9 - b, 15, 7, 0, '#efeae2');
  ell(14, -17 - b, 10, 9, 0, '#e8e3db'); ell(23, -16 - b, 5, 4, 0, '#f0b6c3'); ell(25, -16 - b, 2, 2, 0, '#30202a');
  ell(9, -26 - b, 5, 5, 0, '#cfcac4'); ell(9, -26 - b, 2.5, 2.5, 0, '#f0b6c3');
  ell(15, -20 - b, 2.4, 2.4, 0, '#111'); ell(15.6, -20.8 - b, .7, .7, 0, '#fff');
  for (const k of [-10, 6]) ell(k + Math.sin(e.t * 9 + k) * 3, -2, 4, 3, 0, '#e7a6b5');
  ctx.restore();
}
function drawHedgehog(e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir < 0 ? -1 : 1, 1); if (!e.alive) ctx.rotate(e.spin || 0);
  const b = Math.abs(Math.sin(e.t * 7)) * 1.5;
  ctx.fillStyle = '#5a3a24'; for (let i = 0; i < 9; i++) { const a = Math.PI + .2 + i * .33; ctx.beginPath(); ctx.moveTo(-2 + Math.cos(a - .18) * 14, -12 - b + Math.sin(a - .18) * 12); ctx.lineTo(-2 + Math.cos(a) * 26, -12 - b + Math.sin(a) * 22); ctx.lineTo(-2 + Math.cos(a + .18) * 14, -12 - b + Math.sin(a + .18) * 12); ctx.fill(); }
  ell(-2, -12 - b, 17, 12, 0, '#7b5235'); ell(12, -9 - b, 9, 8, 0, '#e9cfa8'); ell(20, -9 - b, 3, 3, 0, '#222'); ell(13, -13 - b, 2, 2, 0, '#111');
  ctx.restore();
}
function drawCrow(x, y, dir, t, alive, spin) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -1 : 1, 1); if (!alive) ctx.rotate(spin || 0);
  const f = Math.sin(t * 14);
  ell(0, 0, 18, 11, 0, '#22252d'); ell(14, -6, 9, 8, 0, '#2b2f38');
  ctx.fillStyle = '#ffb22e'; ctx.beginPath(); ctx.moveTo(21, -7); ctx.lineTo(31, -4); ctx.lineTo(21, -2); ctx.fill();
  ell(16, -8, 2.6, 2.6, 0, '#fff'); ell(16.8, -8, 1.3, 1.3, 0, '#111');
  ctx.fillStyle = '#16181e'; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-8, -26 * f - 4, -22, -18 * f - 2); ctx.lineTo(-14, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-30, -4); ctx.lineTo(-28, 6); ctx.fill();
  ctx.restore();
}
function drawWasp(e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir < 0 ? -1 : 1, 1); if (!e.alive) ctx.rotate(e.spin || 0);
  ctx.globalAlpha = .7; ell(-2, -14, 9, 5, -.6 + Math.sin(e.t * 50) * .5, '#e8f7ff'); ell(4, -14, 9, 5, .6 - Math.sin(e.t * 50) * .5, '#e8f7ff'); ctx.globalAlpha = 1;
  ell(0, 0, 16, 11, 0, '#ffcc22'); ctx.fillStyle = '#1d1d22'; for (const k of [-7, 0, 7]) ctx.fillRect(k - 2, -10, 4, 20);
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-25, 3); ctx.lineTo(-15, 5); ctx.fill();
  ell(13, -3, 7, 7, 0, '#1d1d22'); ell(15, -5, 2.5, 2.5, 0, '#ff4a4a');
  ctx.restore();
}
function drawBarrel(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  rr(-15, -16, 30, 32, 7); ctx.fillStyle = '#9a6233'; ctx.fill(); ctx.strokeStyle = '#5c3a1c'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#6e7277'; ctx.fillRect(-15, -11, 30, 4); ctx.fillRect(-15, 7, 30, 4);
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(-5, -16); ctx.lineTo(-5, 16); ctx.moveTo(5, -16); ctx.lineTo(5, 16); ctx.stroke();
  ctx.restore();
}
function drawCap(x, y, t) {
  const s = Math.abs(Math.cos(t * 3 + x * .01));
  ctx.save(); ctx.translate(x, y); ctx.scale(.25 + s * .75, 1);
  ctx.fillStyle = '#c99318'; ctx.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = i % 2 ? 11 : 12.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
  ell(0, 0, 8.5, 8.5, 0, '#ffd84a'); ell(-2.5, -2.5, 3, 3, 0, '#fff3b0');
  ctx.restore();
}
function drawLetter(x, y, ch, t) {
  const b = Math.sin(t * 3) * 4;
  ell(x, y + b, 19, 19, 0, '#ff5fa2'); ell(x, y + b, 15, 15, 0, '#ffd1e6'); txt(ch, x, y + b + 1, 22, '#b0125a', 'center', false);
}
function drawHeart(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col || '#ff4d6d';
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8); ctx.bezierCurveTo(8, -16, 14, -4, 0, 6); ctx.fill(); ctx.restore();
}

/* ---------- drawing: backgrounds ---------- */
function drawSky(th, camX) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (th.snowfall) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 80; i++) { const sx = ((i * 97.3 - camX * .3 + Math.sin(S.t + i) * 20) % W + W) % W, sy = (i * 53 + S.t * (30 + i % 5 * 8)) % H; ctx.beginPath(); ctx.arc(sx, sy, 1 + i % 3, 0, TAU); ctx.fill(); } }
  if (th.night || th.moon) { // stars
    ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const sx = ((i * 137.5 - camX * .02) % W + W) % W, sy = (i * 61) % 260; ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(S.t * .8 + i)); ctx.fillRect(sx, sy, 2, 2); } ctx.globalAlpha = 1;
    if (th.moon) { ell(760, 110, 52, 52, 0, '#fff4d1'); ell(742, 98, 10, 10, 0, '#eadfb8'); ell(778, 124, 7, 7, 0, '#eadfb8'); const gl = ctx.createRadialGradient(760, 110, 40, 760, 110, 180); gl.addColorStop(0, 'rgba(255,240,200,.25)'); gl.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = gl; ctx.fillRect(560, 0, 400, 300); }
  } else if (!th.cart || th.clouds) { // sun and clouds
    const sunY = th === THEMES.town ? 300 : 90; const gl = ctx.createRadialGradient(780, sunY, 10, 780, sunY, 160); gl.addColorStop(0, 'rgba(255,250,220,.95)'); gl.addColorStop(.25, 'rgba(255,240,190,.5)'); gl.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = gl; ctx.fillRect(600, sunY - 170, 360, 340);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 6; i++) { const cx = ((i * 260 - camX * .08 - S.t * 6) % (W + 300) + W + 300) % (W + 300) - 150, cy = 60 + (i * 47) % 130; ell(cx, cy, 60, 18, 0, 'rgba(255,255,255,.8)'); ell(cx + 30, cy - 10, 38, 18, 0, 'rgba(255,255,255,.85)'); ell(cx - 30, cy - 4, 30, 14, 0, 'rgba(255,255,255,.8)'); }
  }
}
function drawLayers(th, camX, groundY) {
  const d = L.deco;
  // far hills
  ctx.fillStyle = th.far; ctx.beginPath(); ctx.moveTo(0, H);
  for (const h of d.hills) { const x = h.x - camX * .15; if (x > W + 300 || x + h.w < -300) continue; ctx.moveTo(x - h.w / 2, H); ctx.quadraticCurveTo(x, groundY - h.h * 1.6, x + h.w / 2, H); }
  ctx.fill();
  if (th.cart && !th.trestle) { // cave pillars / crystals / city
    for (const h of d.hills) { const x = h.x * 1.4 - camX * .35; if (x < -200 || x > W + 200) continue; ctx.fillStyle = th.mid; ctx.fillRect(x - 24, 0, 48, H);
      if (th === THEMES.crystal || th.icy) { ctx.fillStyle = 'rgba(141,232,255,.35)'; ctx.beginPath(); ctx.moveTo(x - 30, H * .6); ctx.lineTo(x, H * .6 - h.h * .7); ctx.lineTo(x + 30, H * .6); ctx.fill(); }
      if (th.lava) { ctx.fillStyle = 'rgba(255,120,40,.12)'; ctx.fillRect(x - 24, 0, 48, H); }
      if (th.ruins) { ctx.fillStyle = 'rgba(160,140,90,.5)'; ctx.fillRect(x - 30, H * .55, 60, 10); ctx.fillRect(x - 24, H * .55, 10, H); ctx.fillRect(x + 14, H * .55, 10, H); ctx.fillStyle = 'rgba(80,140,60,.6)'; ctx.beginPath(); ctx.arc(x, H * .55, 20, Math.PI, 0); ctx.fill(); }
    }
  }
  // mid trees / buildings
  for (const t of d.trees) {
    const x = t.x - camX * .45; if (x < -120 || x > W + 120) continue;
    if (th === THEMES.roof) { ctx.fillStyle = th.mid; ctx.fillRect(x - 36, groundY - t.h * 1.6, 72, H); ctx.fillStyle = t.s > .5 ? 'rgba(255,200,90,.55)' : 'rgba(120,220,255,.45)'; for (let wy = groundY - t.h * 1.6 + 14; wy < H; wy += 22) for (let wx = -26; wx < 26; wx += 16) if (((wx + wy + (t.x | 0)) >> 3) % 3) ctx.fillRect(x + wx, wy, 8, 10); }
    else if (th === THEMES.factory) { ctx.fillStyle = th.mid; ctx.fillRect(x - 18, groundY - t.h * 1.4, 36, H); ctx.fillRect(x - 40, groundY - t.h * .9, 80, H); ctx.fillStyle = 'rgba(255,170,80,.2)'; ctx.fillRect(x - 30, groundY - t.h * .8, 60, 6); ell(x, groundY - t.h * 1.4 - 20 - (S.t * 20 + t.x) % 60, 18, 12, 0, 'rgba(200,200,210,.25)'); }
    else if (th.trestle) { if (th.clouds) { ell(x, groundY - t.h * .2, 60 + t.s * 40, 18, 0, 'rgba(255,255,255,.75)'); } }
    else if (th.cart) { ctx.fillStyle = th.near; ctx.beginPath(); ctx.moveTo(x - 50, 0); ctx.lineTo(x, t.h * .9); ctx.lineTo(x + 50, 0); ctx.fill(); }
    else if (th.ice) { const hh = t.h * 1.1; ctx.fillStyle = th.mid; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, groundY - hh + k * hh * .2); ctx.lineTo(x - 22 - k * 7, groundY - hh * .55 + k * hh * .22); ctx.lineTo(x + 22 + k * 7, groundY - hh * .55 + k * hh * .22); ctx.fill(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, groundY - hh); ctx.lineTo(x - 10, groundY - hh * .8); ctx.lineTo(x + 10, groundY - hh * .8); ctx.fill(); ctx.fillStyle = th.mid; ctx.fillRect(x - 4, groundY - hh * .3, 8, hh * .3 + 60); }
    else if (th.jungle) { ctx.strokeStyle = th.mid; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, groundY + 60); ctx.quadraticCurveTo(x + 14, groundY - t.h * .6, x - 6, groundY - t.h * 1.2); ctx.stroke(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ell(x - 6 + Math.cos(a) * 30, groundY - t.h * 1.2 + Math.sin(a) * 10 + 8, 30, 8, a, k % 2 ? th.mid : th.near); } if (t.s > .6) { ctx.strokeStyle = 'rgba(30,90,50,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 20, 0); ctx.quadraticCurveTo(x + 30, groundY * .4, x + 18, groundY - t.h * .4); ctx.stroke(); } }
    else if (th.dump) { ctx.fillStyle = th.mid; ctx.beginPath(); ctx.moveTo(x - 70, groundY + 60); ctx.quadraticCurveTo(x - 30, groundY - t.h, x, groundY - t.h * .9); ctx.quadraticCurveTo(x + 40, groundY - t.h * .7, x + 80, groundY + 60); ctx.fill(); ctx.fillStyle = th.near; for (let k = 0; k < 5; k++) ctx.fillRect(x - 40 + k * 18 + (t.s * 30) % 10, groundY - t.h * .6 + (k % 3) * 18, 14 + k * 2, 8); }
    else if (th.castle) { ctx.fillStyle = th.mid; ctx.fillRect(x - 30, groundY - t.h * 1.7, 60, H); for (let k = 0; k < 4; k++) ctx.fillRect(x - 30 + k * 17, groundY - t.h * 1.7 - 12, 10, 12); ctx.fillStyle = 'rgba(255,210,120,.55)'; ctx.fillRect(x - 6, groundY - t.h * 1.4, 12, 18); if (t.s > .5) { ctx.fillStyle = '#8a2a3a'; ctx.fillRect(x + 22, groundY - t.h * 1.7 - 40, 2, 30); ctx.beginPath(); ctx.moveTo(x + 24, groundY - t.h * 1.7 - 40); ctx.lineTo(x + 40, groundY - t.h * 1.7 - 34); ctx.lineTo(x + 24, groundY - t.h * 1.7 - 28); ctx.fill(); } }
    else { ctx.fillStyle = th.mid; ctx.fillRect(x - 5, groundY - t.h, 10, t.h + 60); ell(x, groundY - t.h, 34 + t.s * 14, 44 + t.s * 18, 0, th.mid); ell(x - 18, groundY - t.h + 18, 24, 26, 0, th.mid);
      if (th === THEMES.town && t.s > .55) { ctx.fillStyle = '#5a3040'; ctx.fillRect(x - 26, groundY - t.h + 30, 52, 30); ctx.fillStyle = 'rgba(255,210,120,.8)'; ctx.fillRect(x - 6, groundY - t.h + 38, 12, 12); ctx.fillStyle = '#7a3a3a'; ctx.beginPath(); ctx.moveTo(x - 32, groundY - t.h + 30); ctx.lineTo(x, groundY - t.h + 8); ctx.lineTo(x + 32, groundY - t.h + 30); ctx.fill(); } }
  }
  if (th.fog) { ctx.fillStyle = th.fog; ctx.fillRect(0, 0, W, H); }
}

/* ---------- drawing: platform level ---------- */
function drawWalk() {
  const th = L.theme, p = P;
  const camX = clamp(p.x - W * .4, 0, L.pxW - W), camY = clamp(p.y - H * .62, 0, L.pxH - H);
  L.camX = lerp(L.camX == null ? camX : L.camX, camX, .2); L.camY = lerp(L.camY == null ? camY : L.camY, camY, .15);
  let cx = L.camX, cy = L.camY; if (L.shake > 0) { cx += (Math.random() - .5) * 12 * L.shake; cy += (Math.random() - .5) * 12 * L.shake; }
  drawSky(th, cx); drawLayers(th, cx, 11 * TILE - cy);
  ctx.save(); ctx.translate(-Math.round(cx), -Math.round(cy));
  // tiles
  const x0 = Math.max(0, Math.floor(cx / TILE) - 1), x1 = Math.min(L.w, Math.ceil((cx + W) / TILE) + 1);
  for (let tx = x0; tx < x1; tx++) for (let ty = 0; ty < ROWS; ty++) {
    const t = L.grid[ty * L.w + tx]; if (!t) continue; const X = tx * TILE, Y = ty * TILE;
    if (t === 1) drawGround(tx, ty, X, Y, th);
    else if (t === 2) { drawGirder(X, Y, th.girder); }
    else if (t === 3) { ctx.fillStyle = th.ground; ctx.fillRect(X, Y + 20, TILE, 20); ctx.fillStyle = '#3f6b33'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(X + k * 10, Y + 22); ctx.lineTo(X + k * 10 + 5, Y + 4 + (k % 2) * 6); ctx.lineTo(X + k * 10 + 10, Y + 22); ctx.fill(); } ctx.fillStyle = '#d0e8a0'; for (let k = 0; k < 4; k++) ctx.fillRect(X + k * 10 + 4, Y + 5 + (k % 2) * 6, 2, 3); }
  }
  // props in front of the background, behind the action
  for (const pr of L.deco.props) { if (pr.x < cx - 80 || pr.x > cx + W + 80) continue; const tx = Math.floor(pr.x / TILE); let ty = 0; while (ty < ROWS && tileAt(tx, ty) !== 1) ty++; if (ty >= ROWS || tileAt(tx, ty - 1)) continue; drawProp(pr, pr.x, ty * TILE, th); }
  // entities
  for (const e of L.ents) {
    if (e.gone || e.x < cx - 100 || e.x > cx + W + 100) continue;
    if (e.type === 'cap') drawCap(e.x, e.y, S.t);
    else if (e.type === 'letter') drawLetter(e.x, e.y, e.ch, S.t);
    else if (e.type === 'heart') { drawHeart(e.x, e.y + Math.sin(S.t * 4) * 3, 1.6); }
    else if (e.type === 'plat' && e.crumble) { if (e.down < 3.6) { ctx.save(); if (e.fall > 0) ctx.translate((Math.random() - .5) * 3, 0); ctx.globalAlpha = e.down > 0 ? .4 : 1; drawGirder(e.x, e.y, '#a0703a'); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.moveTo(e.x + 12, e.y); ctx.lineTo(e.x + 18, e.y + 14); ctx.moveTo(e.x + 28, e.y); ctx.lineTo(e.x + 24, e.y + 14); ctx.stroke(); ctx.restore(); } }
    else if (e.type === 'plat') { for (let k = 0; k < e.w; k += TILE) drawGirder(e.x + k, e.y, '#3a8fd9'); }
    else if (e.type === 'tyre') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1 + e.sq * .2, 1 - e.sq * .35); ell(0, -12, 26, 12, 0, '#1e1f24'); ell(0, -14, 16, 6, 0, '#3a3c44'); ctx.restore(); }
    else if (e.type === 'barrel' && e.state !== 'gone') drawBarrel(e.x, e.y - 16 + (e.state === 'held' ? 16 : 0), e.rot);
    else if (e.type === 'check') drawCheck(e.x, e.y, e.hit);
    else if (e.type === 'goal') { if (!e.locked) drawGoal(e.x, e.y); }
    else if (e.type === 'boss') drawBoss(e);
    else if (e.type === 'enemy') { if (e.kind === 'frog') drawFrog(e); else if (e.kind === 'possum') drawPossum(e); else if (e.kind === 'hedgehog') drawHedgehog(e); else if (e.kind === 'crow') drawCrow(e.x, e.y, e.dir, e.t, e.alive, e.spin); else drawWasp(e); }
  }
  drawCans();
  // player
  if (!(p.inv > 0 && Math.floor(S.t * 20) % 2) || p.dead) {
    const mode = p.dead ? 'hurt' : p.roll > 0 ? 'roll' : p.hurt > 0 ? 'hurt' : p.slap > 0 ? 'slap' : p.duck ? 'duck' : p.carry ? 'carry' : !p.ground ? 'jump' : Math.abs(p.vx) > 20 ? 'walk' : 'idle';
    ell(p.x, p.y, 26, 5, 0, 'rgba(0,0,0,.18)');
    drawJim(p.x, p.y, { face: p.face, t: mode === 'walk' ? p.anim : S.t, mode, squash: p.squash });
  }
  drawParts();
  ctx.restore();
}

/* Ground tiles are auto-tiled: each tile looks at its four neighbours (a 4-bit mask, like edge Wang tiles) and draws
   a grass or stone cap with rounded corners where it is exposed, darker cliff edges on open sides, a shadow lip
   underneath, and scattered details chosen by a hash of its position so the ground never looks stamped out. */
const thash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
function drawGround(tx, ty, X, Y, th) {
  const solid = (a, b) => tileAt(a, b) === 1 || tileAt(a, b) === 3;
  const up = !solid(tx, ty - 1), lf = !solid(tx - 1, ty), rt = !solid(tx + 1, ty), dn = ty < ROWS - 1 && !solid(tx, ty + 1);
  const depth = (() => { let d = 0; while (d < 4 && solid(tx, ty - d - 1)) d++; return d; })();
  const r = 12, h = thash(tx, ty);
  // body: darker the deeper it is
  ctx.fillStyle = depth === 0 ? th.ground : shadeHex(th.ground, -0.08 * Math.min(depth, 3));
  ctx.beginPath();
  const tl = up && lf, tr = up && rt, bl = dn && lf, br = dn && rt;
  ctx.moveTo(X + (tl ? r : 0), Y); ctx.lineTo(X + TILE - (tr ? r : 0), Y); if (tr) ctx.quadraticCurveTo(X + TILE, Y, X + TILE, Y + r);
  ctx.lineTo(X + TILE, Y + TILE - (br ? r : 0)); if (br) ctx.quadraticCurveTo(X + TILE, Y + TILE, X + TILE - r, Y + TILE);
  ctx.lineTo(X + (bl ? r : 0), Y + TILE); if (bl) ctx.quadraticCurveTo(X, Y + TILE, X, Y + TILE - r);
  ctx.lineTo(X, Y + (tl ? r : 0)); if (tl) ctx.quadraticCurveTo(X, Y, X + r, Y);
  ctx.closePath(); ctx.fill();
  // open sides: a darker rim
  ctx.fillStyle = 'rgba(0,0,0,.16)'; if (lf) ctx.fillRect(X, Y + (up ? 8 : 0), 4, TILE - (up ? 8 : 0) - (bl ? r : 0)); if (rt) ctx.fillRect(X + TILE - 4, Y + (up ? 8 : 0), 4, TILE - (up ? 8 : 0) - (br ? r : 0));
  if (dn) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(X + (bl ? r : 0), Y + TILE - 5, TILE - (bl ? r : 0) - (br ? r : 0), 5); }
  // details inside
  if (!up || depth > 0) {
    if (h < .18) { ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(X + 8 + h * 120, Y + 14 + h * 60, 5, 3.5, 0, 0, TAU); ctx.fill(); }
    else if (h < .3) { ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 6, Y + 6 + h * 40); ctx.quadraticCurveTo(X + 20, Y + 20, X + 30, Y + 10 + h * 50); ctx.stroke(); }
    else if (h < .34 && depth > 1) drawCap(X + 20, Y + 22, 0);
    else if (h < .5) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(X + h * 40, Y + 26, 6, 4); }
  }
  // the cap on top
  if (up) {
    const cap = th.top, cy = Y;
    ctx.fillStyle = cap; ctx.beginPath(); ctx.moveTo(X + (lf ? r : 0), cy); ctx.lineTo(X + TILE - (rt ? r : 0), cy); if (rt) ctx.quadraticCurveTo(X + TILE, cy, X + TILE + 2, cy + 10); else ctx.lineTo(X + TILE, cy + 10);
    // wavy lower edge of the grass
    for (let k = 4; k >= 0; k--) { const px = X + k * TILE / 4, py = cy + 10 + (((tx * 4 + k) * 7) % 5 > 2 ? 4 : 1); ctx.lineTo(px, py); }
    if (lf) ctx.quadraticCurveTo(X - 2, cy + 10, X, cy + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(X + (lf ? r - 4 : 0), cy, TILE - (lf ? r - 4 : 0) - (rt ? r - 4 : 0), 3);
    if (th === THEMES.forest || th === THEMES.town || th.jungle) {
      // tufts and the odd flower, hashed
      ctx.fillStyle = shadeHex(cap, .1); for (let k = 0; k < 3; k++) { const gx = X + 6 + ((h * 97 + k * 13) % 1) * 28; ctx.beginPath(); ctx.moveTo(gx - 3, cy); ctx.lineTo(gx, cy - 5 - k); ctx.lineTo(gx + 3, cy); ctx.fill(); }
      if (h > .82) { ctx.fillStyle = ['#ff7aa8', '#ffe066', '#fff'][Math.floor(h * 30) % 3]; ctx.beginPath(); ctx.arc(X + 10 + h * 18, cy - 6, 2.4, 0, TAU); ctx.fill(); ctx.fillStyle = '#3c8a3a'; ctx.fillRect(X + 9.4 + h * 18, cy - 4, 1.2, 4); }
    } else if (th.ice) { ctx.fillStyle = 'rgba(190,225,255,.9)'; for (let k = 0; k < 3; k++) { if (thash(tx * 3 + k, ty) > .45) { const ix = X + 6 + k * 12; ctx.beginPath(); ctx.moveTo(ix, cy + 10); ctx.lineTo(ix + 4, cy + 10); ctx.lineTo(ix + 2, cy + 18 + thash(tx, k) * 8); ctx.fill(); } } } else if (th === THEMES.roof || th === THEMES.factory || th.castle || th.dump) {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(X, cy + 10, TILE, 2); if (h > .7) { ctx.fillStyle = '#d8b860'; ctx.fillRect(X + 4, cy + 3, 6, 3); ctx.fillRect(X + 14, cy + 3, 6, 3); }
    }
  }
  if ((th === THEMES.roof || th === THEMES.factory || th.castle) && !up) { ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, TILE - 1, TILE - 1); if ((tx + ty) % 2) { ctx.beginPath(); ctx.moveTo(X, Y + 20); ctx.lineTo(X + TILE, Y + 20); ctx.stroke(); } }
}
function shadeHex(hex, f) { const n = parseInt(hex.slice(1), 16); const c = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); return '#' + ((1 << 24) | (c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1); }
function drawGirder(X, Y, col) {
  ctx.fillStyle = col; ctx.fillRect(X, Y, TILE + .5, 14); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X, Y + 11, TILE + .5, 3);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(X, Y, TILE, 2);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 2, Y + 12); ctx.lineTo(X + 20, Y + 2); ctx.lineTo(X + 38, Y + 12); ctx.stroke();
  ell(X + 6, Y + 7, 2, 2, 0, 'rgba(0,0,0,.4)'); ell(X + 34, Y + 7, 2, 2, 0, 'rgba(0,0,0,.4)');
}
function drawProp(pr, x, y, th) {
  if (th.ice) { if (pr.k < 2) { ell(x, y - 10, 12, 12, 0, '#fff'); ell(x, y - 26, 9, 9, 0, '#fff'); ell(x - 3, y - 28, 1.5, 1.5, 0, '#222'); ell(x + 3, y - 28, 1.5, 1.5, 0, '#222'); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x + 8, y - 24); ctx.lineTo(x, y - 23); ctx.fill(); } else { ctx.fillStyle = 'rgba(190,230,255,.8)'; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 2, y - 22); ctx.lineTo(x + 4, y); ctx.fill(); } return; }
  if (th.jungle) { for (let k = 0; k < 4; k++) ell(x + (k - 1.5) * 8, y - 8 - k % 2 * 4, 10, 4, (k - 1.5) * .6, k % 2 ? '#2f8a3a' : '#3fae4a'); if (pr.k === 0) ell(x + 4, y - 16, 4, 4, 0, '#ff5a8a'); return; }
  if (th.dump) { if (pr.k < 2) { ctx.fillStyle = '#7d858c'; rr(x - 12, y - 30, 24, 30, 3); ctx.fill(); ctx.fillStyle = '#9aa2a9'; ctx.fillRect(x - 14, y - 34, 28, 6); } else { ell(x, y - 6, 16, 8, 0, '#6a5a4a'); ell(x - 6, y - 10, 6, 4, 0, '#c33'); ell(x + 5, y - 11, 5, 3, 0, '#3a7ac9'); } return; }
  if (th.castle) { if (pr.k < 2) { ctx.fillStyle = '#5a3b22'; ctx.fillRect(x - 2, y - 40, 4, 40); ell(x, y - 44, 5, 7, 0, '#ffb347'); ell(x, y - 46, 2.5, 4, 0, '#fff3b0'); } else { ctx.fillStyle = '#8a2a3a'; ctx.fillRect(x - 10, y - 46, 20, 30); ctx.fillStyle = '#d8b860'; ctx.beginPath(); ctx.moveTo(x - 4, y - 36); ctx.lineTo(x + 4, y - 36); ctx.lineTo(x, y - 28); ctx.fill(); } return; }
  if (th === THEMES.forest || th === THEMES.town) {
    if (pr.k === 0) { ell(x, y - 6, 16, 9, 0, '#3c8a3a'); ell(x + 10, y - 10, 10, 8, 0, '#4ea84a'); }
    else if (pr.k === 1) { ctx.fillStyle = '#7d858c'; rr(x - 12, y - 30, 24, 30, 3); ctx.fill(); ctx.fillStyle = '#9aa2a9'; ctx.fillRect(x - 14, y - 34, 28, 6); ell(x, y - 37, 5, 3, 0, '#9aa2a9'); } // trash can
    else if (pr.k === 2) { ctx.fillStyle = '#ff6d8a'; for (const k of [-6, 4, 10]) { ctx.fillRect(x + k, y - 16, 2, 16); ell(x + k + 1, y - 18, 4, 4, 0, k > 0 ? '#ffd84a' : '#ff6d8a'); } }
    else { ell(x, y - 4, 10, 5, 0, '#8a8f96'); }
  } else if (th === THEMES.roof) {
    if (pr.k < 2) { ctx.fillStyle = '#5a5470'; ctx.fillRect(x - 3, y - 50, 6, 50); ctx.fillRect(x - 16, y - 50, 32, 4); ell(x - 14, y - 46, 4, 4, 0, '#ff3e8a'); }
    else { ctx.fillStyle = '#4a4560'; ctx.fillRect(x - 18, y - 24, 36, 24); ctx.fillStyle = '#6a6488'; ctx.fillRect(x - 18, y - 24, 36, 4); }
  } else if (th === THEMES.factory) {
    if (pr.k < 2) { ctx.fillStyle = '#c9a227'; ctx.fillRect(x - 14, y - 26, 28, 26); ctx.fillStyle = '#222'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 14 + k * 10, y - 26, 5, 26); }
    else { ctx.save(); ctx.translate(x, y - 22); ctx.rotate(S.t * (pr.s > .5 ? 1 : -1)); ctx.fillStyle = '#6b737c'; for (let k = 0; k < 8; k++) { ctx.rotate(TAU / 8); ctx.fillRect(-4, -22, 8, 8); } ell(0, 0, 16, 16, 0, '#6b737c'); ell(0, 0, 5, 5, 0, '#2a2f35'); ctx.restore(); }
  }
}
function drawCheck(x, y, hit) {
  ctx.fillStyle = '#5c3a1c'; ctx.fillRect(x - 3, y - 70, 6, 70);
  ctx.fillStyle = hit ? '#ffd84a' : '#bdbdbd'; ctx.beginPath(); ctx.moveTo(x + 3, y - 70); ctx.lineTo(x + 40, y - 60 + Math.sin(S.t * 6) * 3); ctx.lineTo(x + 3, y - 48); ctx.fill();
  txt('★', x + 18, y - 59, 16, hit ? '#b0125a' : '#777', 'center', false);
}
function drawGoal(x, y) {
  // a gleaming trash can of glory
  const g = ctx.createRadialGradient(x, y - 60, 5, x, y - 60, 110); g.addColorStop(0, 'rgba(255,240,150,.55)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 180, 240, 200);
  ctx.fillStyle = '#c7ccd2'; rr(x - 24, y - 56, 48, 56, 5); ctx.fill(); ctx.fillStyle = '#a3a9b0'; for (const k of [-12, 0, 12]) ctx.fillRect(x + k - 2, y - 52, 4, 48);
  ctx.save(); ctx.translate(x, y - 60); ctx.rotate(Math.sin(S.t * 3) * .15); ctx.fillStyle = '#ffd84a'; ctx.fillRect(-28, -6, 56, 8); ell(0, -8, 8, 5, 0, '#ffd84a'); ctx.restore();
  txt('GOAL', x, y - 92 + Math.sin(S.t * 3) * 3, 22, '#ffe066');
}
function drawParts() {
  for (const q of parts) {
    const a = 1 - q.t / q.life;
    if (q.txt) { ctx.globalAlpha = a; txt(q.txt, q.x, q.y, 22, q.col); ctx.globalAlpha = 1; continue; }
    ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
}

/* ---------- drawing: mine-cart level ---------- */
function drawCartLevel() {
  const th = L.theme, p = P;
  const camX = p.x - 280; let cx = camX, cy = 0;
  if (L.shake > 0) { cx += (Math.random() - .5) * 14 * L.shake; cy += (Math.random() - .5) * 14 * L.shake; }
  drawSky(th, cx); drawLayers(th, cx, 420);
  if (th.lava) { const g = ctx.createLinearGradient(0, H - 120, 0, H); g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(1, 'rgba(255,120,30,.75)'); ctx.fillStyle = g; ctx.fillRect(0, H - 120, W, 120); ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 26 - Math.sin(x * .03 + S.t * 3) * 6); ctx.lineTo(W, H); ctx.fill(); }
  ctx.save(); ctx.translate(-Math.round(cx), Math.round(cy));
  // supports and rail
  const a = cx - 40, b = cx + W + 40;
  for (const s of L.segs) {
    if (s.x1 < a || s.x0 > b) continue;
    for (let x = Math.ceil(Math.max(s.x0, a) / 80) * 80; x < Math.min(s.x1, b); x += 80) {
      const y = lerp(s.y0, s.y1, (x - s.x0) / (s.x1 - s.x0 || 1));
      if (th.trestle) { ctx.strokeStyle = '#2a2f45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x - 30, H); ctx.moveTo(x, y + 6); ctx.lineTo(x + 30, H); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 22, y + 80); ctx.lineTo(x + 22, y + 80); ctx.stroke(); }
      else { ctx.fillStyle = th.tie; ctx.fillRect(x - 5, y + 6, 10, H - y); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, y + 6, 3, H - y); }
    }
    // ties
    ctx.fillStyle = th.tie; for (let x = Math.ceil(Math.max(s.x0, a) / 22) * 22; x < Math.min(s.x1, b); x += 22) { const y = lerp(s.y0, s.y1, (x - s.x0) / (s.x1 - s.x0 || 1)); ctx.fillRect(x - 4, y + 1, 8, 8); }
    ctx.strokeStyle = th.rail; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(Math.max(s.x0, a), lerp(s.y0, s.y1, (Math.max(s.x0, a) - s.x0) / (s.x1 - s.x0 || 1))); ctx.lineTo(Math.min(s.x1, b), lerp(s.y0, s.y1, (Math.min(s.x1, b) - s.x0) / (s.x1 - s.x0 || 1))); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
    // buffers at the ends of a piece that faces a gap
    if (railY(s.x1 + 2) == null && s.x1 > a && s.x1 < b) { ctx.fillStyle = '#d33'; ctx.fillRect(s.x1 - 6, s.y1 - 14, 8, 14); }
  }
  // lanterns along the way
  if (!th.trestle) for (let x = Math.ceil(a / 360) * 360; x < b; x += 360) { const y = (railY(x) || 380) - 210; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke(); const g = ctx.createRadialGradient(x, y + 8, 2, x, y + 8, 90); g.addColorStop(0, th.glow); g.addColorStop(.15, th.glow + '88'); g.addColorStop(1, th.glow + '00'); ctx.fillStyle = g; ctx.fillRect(x - 90, y - 82, 180, 180); ell(x, y + 8, 6, 8, 0, '#fff6d0'); }
  // events
  for (const e of L.ents) {
    if (e.x < a - 60 || e.x > b + 60) continue;
    const ry = railY(e.x) || 380;
    if (e.k === 'cap' && e.alive) drawCap(e.x, e.y, S.t);
    else if (e.k === 'letter' && e.alive) drawLetter(e.x, ry - e.h, e.ch, S.t);
    else if (e.k === 'heart' && e.alive) drawHeart(e.x, ry - e.h, 1.6);
    else if (e.k === 'crate' && e.alive) { ctx.fillStyle = '#a7743d'; ctx.fillRect(e.x - 18, ry - 34, 36, 34); ctx.strokeStyle = '#5c3a1c'; ctx.lineWidth = 3; ctx.strokeRect(e.x - 18, ry - 34, 36, 34); ctx.beginPath(); ctx.moveTo(e.x - 18, ry - 34); ctx.lineTo(e.x + 18, ry); ctx.moveTo(e.x + 18, ry - 34); ctx.lineTo(e.x - 18, ry); ctx.stroke(); txt('!', e.x, ry - 50 + Math.sin(S.t * 8) * 3, 20, '#ffe066'); }
    else if (e.k === 'beam') { const y = ry - 70; ctx.fillStyle = '#5a3b22'; ctx.fillRect(e.x - 22, 0, 14, y); ctx.fillRect(e.x - 50, y - 18, 100, 18); ctx.fillStyle = '#f5c518'; for (let k = -50; k < 50; k += 20) { ctx.beginPath(); ctx.moveTo(e.x + k, y); ctx.lineTo(e.x + k + 10, y); ctx.lineTo(e.x + k + 4, y - 18); ctx.lineTo(e.x + k - 6, y - 18); ctx.fill(); } if (e.x - P.x < 400 && e.x > P.x) txt('▼ DUCK', e.x, y + 26, 16, '#ffe066'); }
    else if (e.k === 'crow' && e.alive) drawCrow(e.x, ry - e.h + Math.sin(e.t * 4) * 12, -1, e.t, true);
    else if (e.k === 'pcart' && !e.dead && e.y < H + 100) { drawCart(e.x, e.y, 0, '#6b6f78'); drawPossum({ x: e.x + 4, y: e.y - 22, dir: 1, t: e.t, alive: true }); }
    else if (e.k === 'check' && e.alive) drawCheck(e.x, ry, false);
    else if (e.k === 'goal') { ctx.fillStyle = '#ffe066'; ctx.fillRect(e.x - 4, ry - 140, 8, 140); for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#111' : '#fff'; ctx.fillRect(e.x + 4 + (k % 3) * 14, ry - 140 + Math.floor(k / 3) * 14, 14, 14); } txt('GOAL', e.x, ry - 160, 22, '#ffe066'); }
  }
  // player in cart
  if (!(p.inv > 0 && Math.floor(S.t * 20) % 2) || p.dead) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt || 0);
    drawJim(-4, -18 + (p.duck ? 22 : 0), { face: 1, t: S.t, mode: p.dead ? 'hurt' : p.ground ? (p.duck ? 'duck' : 'idle') : 'jump', scale: .95 });
    drawCart(0, 0, p.anim, '#8a6a4a');
    ctx.restore();
  }
  drawParts();
  ctx.restore();
}
function drawCart(x, y, roll, col) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-34, -42); ctx.lineTo(34, -42); ctx.lineTo(28, -10); ctx.lineTo(-28, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-34, -42, 68, 6); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-30, -34, 60, 3);
  ctx.strokeStyle = '#3d3d44'; ctx.lineWidth = 3; ctx.strokeRect(-33, -42, 66, 4);
  for (const wx of [-18, 18]) { ell(wx, -6, 9, 9, 0, '#2c2c33'); ctx.save(); ctx.translate(wx, -6); ctx.rotate(roll / 9); ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-1.5, -7, 3, 14); ctx.fillRect(-7, -1.5, 14, 3); ctx.restore(); }
  ctx.restore();
}

/* ---------- HUD ---------- */
function drawHUD() {
  for (let i = 0; i < 3; i++) drawHeart(118 + i * 34, 58, 1.7, i < S.hearts ? '#ff4d6d' : 'rgba(0,0,0,.35)');
  drawCap(120, 92, 0); txt('× ' + S.caps, 138, 93, 22, '#ffe066', 'left');
  // lives: a little Jimothy head
  ctx.save(); ctx.translate(W - 120, 60); ell(0, 0, 16, 14, 0, '#868a94'); ctx.fillStyle = '#26262d'; ctx.fillRect(-14, -4, 28, 7); ell(5, -1, 3, 3, 0, '#fff'); ctx.fillStyle = '#d8343a'; ctx.fillRect(-15, -12, 30, 5); ctx.restore();
  txt('× ' + S.lives, W - 98, 61, 24, '#fff', 'left');
  'JIMO'.split('').forEach((c, i) => { const on = S.letters & (1 << i); ell(W - 160 + i * 30, 98, 12, 12, 0, on ? '#ff5fa2' : 'rgba(0,0,0,.3)'); txt(c, W - 160 + i * 30, 99, 15, on ? '#fff' : 'rgba(255,255,255,.35)', 'center', false); });
  const boss = L && L.kind === 'walk' && L.bossSeen && L.ents.find(e => e.type === 'boss' && e.alive);
  if (boss) { txt(boss.kind === 'possum' ? 'King Possum' : 'The Crow Baron', W / 2, 26, 20, '#ff9aa8'); for (let i = 0; i < boss.max; i++) drawHeart(W / 2 - (boss.max - 1) * 18 + i * 36, 54, 1.5, i < boss.hp ? '#ff4d6d' : 'rgba(0,0,0,.35)'); }
  if (L && L.kind === 'cart') { const prog = clamp(P.x / L.endX, 0, 1); rr(W / 2 - 150, 22, 300, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); rr(W / 2 - 150, 22, 300 * prog, 10, 5); ctx.fillStyle = '#ffe066'; ctx.fill(); drawCart(W / 2 - 150 + 300 * prog, 22, 0, '#8a6a4a'); }
}

/* ---------- screens ---------- */
const MAP_PTS = [[110, 440], [200, 385], [150, 315], [240, 262], [325, 322], [400, 385], [440, 300], [455, 222],
  [560, 222], [628, 298], [585, 390], [688, 425], [768, 365], [705, 282], [790, 232], [826, 138]];
function island(cx, cy, rx, ry) {
  ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 22, ry + 18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5bb25a'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
}
function drawMap() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5fb8f0'); g.addColorStop(1, '#cdeeff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3d8fd1'; ctx.fillRect(0, 140, W, H); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect((i * 97 + S.t * 20) % W, 160 + (i * 53) % 360, 24, 2); }
  island(280, 345, 240, 150); island(700, 305, 210, 190);
  // west island: forest and town; east island: snow mountain, jungle, castle
  ctx.fillStyle = '#2f6440'; for (const [tx, ty] of [[90, 330], [140, 270], [330, 240], [300, 440], [210, 455], [400, 450]]) { ell(tx, ty, 22, 26, 0, '#2f6440'); ctx.fillStyle = '#5c3a1c'; ctx.fillRect(tx - 3, ty + 18, 6, 12); }
  ctx.fillStyle = '#4a9a4a'; ctx.beginPath(); ctx.moveTo(700, 300); ctx.lineTo(805, 110); ctx.lineTo(905, 300); ctx.fill(); ctx.fillStyle = '#7a8496'; ctx.beginPath(); ctx.moveTo(760, 190); ctx.lineTo(805, 110); ctx.lineTo(850, 190); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(785, 145); ctx.lineTo(805, 110); ctx.lineTo(825, 145); ctx.fill();
  for (const [tx, ty] of [[560, 420], [640, 470], [520, 330]]) { ctx.strokeStyle = '#2f7a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx, ty + 14); ctx.lineTo(tx + 2, ty - 14); ctx.stroke(); for (let k = 0; k < 5; k++) ell(tx + Math.cos(k * 1.25) * 12, ty - 16 + Math.sin(k * 1.25) * 4, 12, 4, k * 1.25, '#3fae4a'); }
  ctx.fillStyle = '#6a6470'; ctx.fillRect(840, 210, 34, 50); for (let k = 0; k < 3; k++) ctx.fillRect(840 + k * 13, 200, 8, 10); ctx.fillStyle = '#8a2a3a'; ctx.fillRect(856, 178, 2, 22); ctx.beginPath(); ctx.moveTo(858, 178); ctx.lineTo(872, 184); ctx.lineTo(858, 190); ctx.fill();
  // rope bridge between the islands
  ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(470, 216); ctx.quadraticCurveTo(507, 236, 545, 216); ctx.stroke(); for (let k = 0; k < 8; k++) { const bx = 474 + k * 9.5; ctx.fillStyle = '#a07a40'; ctx.fillRect(bx, 220 + Math.sin(k / 7 * Math.PI) * 9, 6, 3); }
  ctx.setLineDash([4, 10]); ctx.lineWidth = 5; ctx.strokeStyle = '#7a5a2a'; ctx.beginPath(); MAP_PTS.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
  LEVELS.forEach((lv, i) => {
    const [x, y] = MAP_PTS[i], open = i < SAVE.unlocked, done = SAVE.best[lv.id] && SAVE.best[lv.id].done, sel = i === S.sel;
    ell(x, y + 6, 22, 9, 0, 'rgba(0,0,0,.2)');
    ell(x, y, sel ? 22 : 18, sel ? 22 : 18, 0, !open ? '#888' : done ? '#ffd84a' : lv.boss ? '#b05aff' : lv.kind === 'cart' ? '#ff8a3d' : '#ff5f8f');
    ell(x, y, sel ? 15 : 12, sel ? 15 : 12, 0, open ? '#fff' : '#bbb');
    txt(lv.kind === 'cart' ? '🛒' : lv.boss ? '👑' : String((i >> 1) + 1), x, y + 1, 14, '#333', 'center', false);
    const lt = SAVE.best[lv.id] && SAVE.best[lv.id].letters; if (lt === 15) txt('★', x + 18, y - 18, 16, '#ff5fa2');
  });
  const [jx, jy] = MAP_PTS[S.sel]; drawJim(jx - 6, jy - 16 + Math.sin(S.t * 5) * 2, { face: 1, t: S.t, mode: 'idle', scale: .8 });
  rr(W / 2 - 250, 14, 500, 92, 18); ctx.fillStyle = 'rgba(10,30,20,.8)'; ctx.fill(); ctx.strokeStyle = '#d8b860'; ctx.lineWidth = 2; ctx.stroke();
  const lv = LEVELS[S.sel];
  txt(lv.title, W / 2, 46, 30, '#fff'); txt((lv.kind === 'cart' ? 'Mine-cart ride' : lv.boss ? 'Platform level with a boss' : 'Platform level') + ' · ' + (S.sel < SAVE.unlocked ? (TOUCH() ? 'tap to play' : 'Enter or Space to play') : 'locked'), W / 2, 82, 16, '#d8b860', 'center', false);
  txt('Level ' + (S.sel + 1) + ' of ' + LEVELS.length + '   ·   Lives × ' + S.lives + '   Caps × ' + S.caps, W - 20, H - 20, 16, '#fff', 'right');
}
const TOUCH = () => !touchBox.hidden;
function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1a13'); g.addColorStop(1, '#004225'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .12; for (let i = 0; i < 18; i++) drawGirder(i * 60 - (S.t * 30) % 60, 470, '#d8b860'); ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(W / 2, 300, 20, W / 2, 300, 300); glow.addColorStop(0, 'rgba(216,184,96,.35)'); glow.addColorStop(1, 'rgba(216,184,96,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  drawJim(W / 2 - 10, 440, { face: 1, t: S.t, mode: 'idle', scale: 3.1 });
  txt('JIMOTHY-SAN', W / 2, 92, 72, '#f3ead2'); txt('a raccoon, some girders, and a lot of mine carts', W / 2, 146, 20, '#d8b860', 'center', false);
  if (Math.sin(S.t * 4) > -.4) txt(TOUCH() ? 'Tap to start' : 'Press Enter or Space', W / 2, 500, 24, '#fff');
  txt('← → move · Space jump · X roll / grab / throw · ↓+X slap the ground · ↓ duck in a cart', W / 2, 186, 15, 'rgba(243,234,210,.7)', 'center', false);
}
function drawIntro() {
  const lv = LEVELS[S.levelIdx], a = clamp(1.6 - S.t, 0, 1);
  if (L.kind === 'walk') drawWalk(); else drawCartLevel();
  ctx.fillStyle = `rgba(0,10,5,${.75 * a})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a; txt(lv.title, W / 2, H / 2 - 20, 54, '#fff'); txt(lv.kind === 'cart' ? 'Hold on to your hat. Jump gaps, duck beams.' : 'Find J · I · M · O and reach the goal.', W / 2, H / 2 + 30, 20, '#d8b860', 'center', false); ctx.globalAlpha = 1;
}

/* ---------- main loop ---------- */
let last = 0;
function frame(now) {
  requestAnimationFrame(frame); pollPad();
  const dt = Math.min(.033, (now - last) / 1000 || 0); last = now; S.t += dt;
  Sound.music(dt);
  if (pressed('mute')) Sound.muted = !Sound.muted;
  ctx.setTransform(SCALE * DPR, 0, 0, SCALE * DPR, 0, 0);
  const tap = PRESS.tap; PRESS.tap = null;
  if (S.mode === 'title') {
    drawTitle(); if (pressed('start') || pressed('jump') || tap) { S.mode = 'map'; S.sel = Math.min(SAVE.unlocked - 1, LEVELS.length - 1); S.t = 0; }
  } else if (S.mode === 'map') {
    if (pressed('right') || pressed('up')) S.sel = Math.min(SAVE.unlocked - 1, S.sel + 1);
    if (pressed('left') || pressed('down')) S.sel = Math.max(0, S.sel - 1);
    if (tap) { MAP_PTS.forEach(([x, y], i) => { if (Math.hypot(tap.x - x, tap.y - y) < 34 && i < SAVE.unlocked) { if (S.sel === i) PRESS.start = true; S.sel = i; } }); }
    drawMap();
    if (pressed('start') || pressed('jump') || pressed('act')) { S.caps = S.caps || 0; startLevel(S.sel); }
  } else if (S.mode === 'intro') {
    drawIntro(); if (S.t > 1.6) { S.mode = 'play'; S.t = 0; }
  } else if (S.mode === 'play') {
    if (pressed('pause') || pressed('start')) S.paused = !S.paused;
    if (!S.paused) {
      L.t += dt; L.shake = Math.max(0, L.shake - dt);
      if (L.kind === 'walk') { if (!L.done) { stepPlayerWalk(dt); stepEnts(dt); stepCans(dt); } else { L.doneT += dt; P.vx = 0; } }
      else { stepCart(dt); if (L.done) L.doneT += dt; }
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t > q.life) { parts.splice(i, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    }
    if (L.kind === 'walk') drawWalk(); else drawCartLevel();
    drawHUD();
    if (L.tip && L.tip.t > 0) { ctx.globalAlpha = Math.min(1, L.tip.t); ctx.fillStyle = 'rgba(10,20,15,.8)'; ctx.fillRect(W / 2 - 330, 92, 660, 40); txt(L.tip.txt, W / 2, 118, 17, '#ffe9b0', 'center', false); ctx.globalAlpha = 1; }
    if (L.done) {
      const a = clamp(L.doneT / .6, 0, 1); ctx.fillStyle = `rgba(0,20,10,${.5 * a})`; ctx.fillRect(0, 0, W, H);
      txt('Level clear!', W / 2, H / 2 - 30, 60 * (.6 + .4 * a), '#ffe066'); txt(S.letters === 15 ? 'All four letters!  J · I · M · O' : 'Letters ' + 'JIMO'.split('').map((c, i) => S.letters & (1 << i) ? c : '·').join(' '), W / 2, H / 2 + 26, 22, '#fff');
      if (L.doneT > 2.8) { S.mode = S.levelIdx === LEVELS.length - 1 ? 'won' : 'map'; S.sel = Math.min(SAVE.unlocked - 1, S.levelIdx + 1); S.t = 0; }
    }
    if (S.paused) { ctx.fillStyle = 'rgba(0,10,5,.6)'; ctx.fillRect(0, 0, W, H); txt('Paused', W / 2, H / 2 - 20, 56, '#fff'); txt('Enter to resume · Esc twice for the map', W / 2, H / 2 + 30, 18, '#d8b860', 'center', false); if (pressed('pause')) { S.paused = false; S.mode = 'map'; Sound.song = -1; } }
  } else if (S.mode === 'gameover') {
    ctx.fillStyle = '#0b1a13'; ctx.fillRect(0, 0, W, H); drawJim(W / 2, 380, { face: 1, t: S.t, mode: 'hurt', scale: 2.2 }); txt('Game over', W / 2, 120, 64, '#ff7a8a'); txt('Jimothy dusts himself off. Five fresh lives.', W / 2, 180, 20, '#f3ead2', 'center', false);
    if (S.t > 1.2 && (pressed('start') || pressed('jump') || tap)) { S.mode = 'map'; S.t = 0; }
  } else if (S.mode === 'won') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2b55'); g.addColorStop(1, '#004225'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (Math.random() < .5) puff(Math.random() * W, -10, 2, ['#ffe066', '#ff7aa8', '#7de0ff', '#9dff8a'][Math.floor(Math.random() * 4)], 60, 120, 4);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t > q.life) { parts.splice(i, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; } drawParts();
    drawJim(W / 2, 440, { face: 1, t: S.t, mode: 'jump', scale: 2.6 });
    txt('Jimothy-san did it!', W / 2, 100, 58, '#ffe066'); txt('All sixteen levels cleared, two bosses beaten. The trash cans of the world salute you.', W / 2, 160, 20, '#fff', 'center', false);
    const stars = LEVELS.filter(l => SAVE.best[l.id] && SAVE.best[l.id].letters === 15).length; txt('J·I·M·O found in ' + stars + ' of ' + LEVELS.length + ' levels', W / 2, 196, 18, '#d8b860', 'center', false);
    if (S.t > 2 && (pressed('start') || pressed('jump') || tap)) { S.mode = 'map'; S.t = 0; }
  }
  for (const k in PRESS) if (k !== 'tap') PRESS[k] = false;
}
cv.tabIndex = 0; cv.focus();
requestAnimationFrame(frame);
window.JIM = { S, LEVELS, startLevel, get L() { return L; }, get P() { return P; } };
