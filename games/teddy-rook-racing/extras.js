'use strict';
/* =====================================================================================================
   Teddy Rook Racing — extras: item boxes, Grand Prix cups, touch controls and screen effects.
   Loaded after game.js and shares its globals (G, OPT, THREE, Sound, scene, camera, $ ...).
   game.js calls in here from a few places: stepCar (itemInput), tick (tickItems), startRace (buildItems),
   clearRace (clearItems), the frame loop (itemsFrame), showResults (gpAfterResults) and the menu (GP).
   ===================================================================================================== */

/* ---------- items ----------
   honey:   a jar of honey, eaten for a long rocket boost
   peel:    dropped behind; whoever drives over it spins out
   bee:     a homing bee that chases the car one place ahead
   bubble:  a bubble shield that pops instead of you, once, for 10 s
   thunder: a cloud that zaps everyone ahead of you (only for the back of the pack)
   triple:  three honey jars, one after another                                                     */
const ITEMS = {
  honey: { icon: '🍯', name: 'Honey rocket' },
  triple: { icon: '🍯🍯🍯', name: 'Triple honey' },
  peel: { icon: '🍌', name: 'Peel' },
  bee: { icon: '🐝', name: 'Homing bee' },
  bubble: { icon: '🫧', name: 'Bubble shield' },
  thunder: { icon: '⛈️', name: 'Thundercloud' },
};
// Odds by place: [leader ... last]. Leaders get defensive items, the back of the pack gets the strong ones.
function rollItem(c) {
  const n = G.cars.length, r = n > 1 ? (c.pos - 1) / (n - 1) : 0;
  const w = {
    peel: lerp(40, 6, r), bubble: lerp(30, 10, r), bee: lerp(12, 26, r), honey: lerp(18, 22, r),
    triple: r > .45 ? lerp(0, 22, (r - .45) / .55) : 0, thunder: r > .7 && n > 3 ? lerp(0, 14, (r - .7) / .3) : 0,
  };
  let sum = 0; for (const k in w) sum += w[k];
  let x = Math.random() * sum; for (const k in w) { x -= w[k]; if (x <= 0) return k; }
  return 'honey';
}

const IX = { boxes: [], peels: [], bees: [], group: null, flash: 0, shake: 0 };
let _boxGeo, _boxMat, _peelGeo, _peelMat, _beeParts, _bubbleGeo;
function itemAssets() {
  if (_boxGeo) return;
  _boxGeo = new THREE.BoxGeometry(1.7, 1.7, 1.7);
  const tex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); ['#ff5f8f', '#ffb347', '#ffe066', '#5ee7a0', '#53b8ff', '#b27bff'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.font = '900 86px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = 'rgba(40,20,60,.55)'; g.strokeText('?', w / 2, h / 2 + 6); g.fillStyle = '#fff'; g.fillText('?', w / 2, h / 2 + 6);
  });
  _boxMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .93 });
  // a peel: three yellow petals around a little stem
  const petal = new THREE.SphereGeometry(.55, 10, 8); petal.scale(1, .28, 2.1);
  const parts = []; for (let k = 0; k < 3; k++) { const p = petal.clone(); p.translate(0, .2, .75); p.rotateY(k * TAU / 3); parts.push(p); }
  const stem = new THREE.CylinderGeometry(.18, .26, .7, 8); stem.translate(0, .45, 0); parts.push(stem);
  _peelGeo = mergeSimple(parts); _peelMat = new THREE.MeshLambertMaterial({ color: 0xffd52e, emissive: 0x3a2a00 });
  _beeParts = {
    body: (() => { const s = new THREE.SphereGeometry(.7, 14, 10); s.scale(1, 1, 1.35); return s; })(),
    stripe: new THREE.TorusGeometry(.69, .13, 6, 18),
    wing: (() => { const s = new THREE.SphereGeometry(.55, 10, 6); s.scale(1, .12, .6); return s; })(),
  };
  _bubbleGeo = new THREE.SphereGeometry(1, 24, 16);
}
function mergeSimple(geos) {
  // merges non-indexed copies of simple geometries into one BufferGeometry (positions + normals)
  const pos = [], nor = [];
  for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out;
}
function trackAt(i, lat, y) { const T = G.T; return new THREE.Vector3(T.px[i] + T.rx[i] * lat, T.py[i] + y, T.pz[i] + T.rz[i] * lat); }

function clearItems() {
  if (IX.group) { scene.remove(IX.group); IX.group = null; }
  IX.boxes = []; IX.peels = []; IX.bees = []; IX.flash = 0; IX.shake = 0;
  const s = $('itemSlot'); if (s) s.className = '';
}
function buildItems() {
  clearItems(); if (!OPT.items || OPT.mode === 'time' || OPT.mode === 'free') { updateItemSlot(); return; }
  itemAssets();
  const T = G.T, N = T.N, grp = new THREE.Group(); IX.group = grp; scene.add(grp);
  const rows = [.14, .47, .79];
  for (const f of rows) {
    let i = Math.floor(f * N);
    for (let q = 0; q < 80; q++) { const j = (i + q) % N; if (!T.bridge[j] && !T.under[j] && Math.abs(T.kapS[j]) < .006) { i = j; break; } }
    const span = Math.min(T.hw - 1.6, T.wall[i] - 2.5), n = 5;
    for (let k = 0; k < n; k++) {
      const lat = -span + (2 * span) * k / (n - 1), m = new THREE.Mesh(_boxGeo, _boxMat);
      m.position.copy(trackAt(i, lat, 1.5)); m.rotation.y = T.th[i]; grp.add(m);
      IX.boxes.push({ i, lat, m, back: 0, ph: k * 1.3 });
    }
  }
  for (const c of G.cars) { c.item = null; c.roll = 0; c.useT = 0; c.spinT = 0; c.spinA = 0; c.shield = 0; c.honeyN = 0; if (c.bubble) { c.mesh.remove(c.bubble); c.bubble = null; } }
  updateItemSlot();
}

/* Called at the top of stepCar: a spinning car can't steer or accelerate. */
function itemInput(c, inp, dt) {
  if (c.spinT > 0) {
    c.spinT -= dt; c.spinA += dt * 14 * Math.min(1, c.spinT + .3);
    return { steer: 0, throttle: 0, brake: .35, drift: false, boost: false };
  }
  c.spinA = 0;
  return inp;
}
function spinOut(c, why) {
  if (c.finished || c.spinT > 0) return false;
  if (c.shield > 0) { c.shield = 0; popBubble(c); if (c.isPlayer) toast('Bubble popped!', ''); Sound.tone(1400, .12, .12, 'sine'); return false; }
  c.spinT = 1.15; c.drift = 0; c.boostT = 0;
  c.vx *= .4; c.vz *= .4;
  if (c.isPlayer) { IX.shake = .45; toast(why || 'Spun out!', 'red'); Sound.thud(1); }
  return true;
}
function popBubble(c) { if (c.bubble) { c.mesh.remove(c.bubble); c.bubble = null; } }

function useItem(c) {
  if (!c.item || c.roll > 0 || c.finished || c.spinT > 0 || G.state !== 'racing') return;
  const it = c.item, T = G.T, N = T.N;
  if (it === 'honey' || it === 'triple') {
    c.boostT = Math.max(c.boostT, 1.6);
    if (c.isPlayer) { Sound.whoosh(); addPoints(20); }
    if (it === 'triple') { c.honeyN = (c.honeyN || 3) - 1; if (c.honeyN > 0) { updateItemSlot(); return; } c.honeyN = 0; }
  } else if (it === 'peel') {
    const i = (c.si - Math.round(4 / T.ds) + N) % N, m = new THREE.Mesh(_peelGeo, _peelMat);
    m.position.copy(trackAt(i, c.lat, .05)); m.rotation.y = Math.random() * TAU; IX.group.add(m);
    IX.peels.push({ i, lat: c.lat, m, owner: c, safe: .6 });
    if (c.isPlayer) Sound.tone(300, .12, .12, 'triangle');
  } else if (it === 'bee') {
    const order = G.order || G.cars, idx = order.indexOf(c), target = idx > 0 ? order[idx - 1] : null;
    const g = new THREE.Group(), body = new THREE.Mesh(_beeParts.body, new THREE.MeshLambertMaterial({ color: 0xffc928, emissive: 0x4a3000 }));
    g.add(body);
    for (const z of [-.25, .3]) { const s = new THREE.Mesh(_beeParts.stripe, new THREE.MeshBasicMaterial({ color: 0x1b1b22 })); s.position.z = z; g.add(s); }
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(_beeParts.wing, new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: .75 })); w.position.set(s * .55, .55, -.05); g.add(w); return w; });
    g.position.copy(trackAt(c.si, c.lat, 2)); IX.group.add(g);
    IX.bees.push({ s: c.si + c.along / T.ds + 1.5, lap: c.lap, lat: c.lat, y: 2, g, wings, target, owner: c, life: 9 });
    if (c.isPlayer) { Sound.tone(220, .4, .1, 'sawtooth'); toast(target ? 'Bee away! Chasing ' + target.ch.name : 'Bee away!', 'gold'); }
  } else if (it === 'bubble') {
    c.shield = 10; popBubble(c);
    const b = new THREE.Mesh(_bubbleGeo, new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .22, depthWrite: false }));
    b.scale.set(2.4, 1.9, 3.3); b.position.y = 1.1; c.mesh.add(b); c.bubble = b;
    if (c.isPlayer) Sound.chime(2);
  } else if (it === 'thunder') {
    let hits = 0; for (const o of G.cars) if (o !== c && o.pos < c.pos && spinOut(o, 'Zapped by a thundercloud!')) hits++;
    if (c.isPlayer || G.player && G.player.pos < c.pos) IX.flash = .5;
    Sound.tone(70, .8, .25, 'sawtooth'); if (c.isPlayer) toast('Thundercloud!  ' + hits + ' zapped', 'violet');
  }
  c.item = null; c.honeyN = 0;
  if (c.isPlayer) updateItemSlot();
}

function tickItems(h) {
  if (!IX.group || !G.T) return;
  const T = G.T, N = T.N;
  // boxes
  for (const b of IX.boxes) {
    if (b.back > 0) { b.back -= h; if (b.back <= 0) b.m.visible = true; continue; }
    for (const c of G.cars) {
      if (c.finished) continue; const d = (c.si - b.i + N) % N;
      if ((d <= 1 || d >= N - 1) && Math.abs(c.lat - b.lat) < 2.1) {
        b.m.visible = false; b.back = 3.2;
        if (!c.item && !(c.roll > 0)) {
          c.item = rollItem(c); c.honeyN = c.item === 'triple' ? 3 : 0;
          if (c.isPlayer) { c.roll = .9; Sound.tone(880, .06, .08, 'square'); updateItemSlot(true); }
          else c.useT = 1 + Math.random() * 5;
        }
        break;
      }
    }
  }
  // player roulette
  const p = G.player;
  if (p && p.roll > 0) { p.roll -= h; if (p.roll <= 0) { p.roll = 0; Sound.tone(1320, .12, .1, 'triangle'); updateItemSlot(); } }
  // AI decisions
  for (const c of G.cars) {
    if (c.isPlayer || !c.item || c.finished) continue;
    c.useT -= h;
    if (c.item === 'peel') {
      const behind = G.cars.some(o => o !== c && ((c.si - o.si + N) % N) > 2 && ((c.si - o.si + N) % N) < 30 && Math.abs(o.lat - c.lat) < 3);
      if (behind && c.useT < 3) useItem(c); else if (c.useT < -6) useItem(c);
    } else if (c.item === 'bubble') { if (c.useT < 0) useItem(c); }
    else if (c.item === 'honey' || c.item === 'triple') { if (c.useT < 0 && Math.abs(T.kapS[(c.si + 20) % N]) < .006) useItem(c); }
    else if (c.useT < 0) useItem(c);
  }
  // shields wear off
  for (const c of G.cars) if (c.shield > 0) { c.shield -= h; if (c.shield <= 0) popBubble(c); }
  // peels
  for (let k = IX.peels.length - 1; k >= 0; k--) {
    const pl = IX.peels[k]; pl.safe -= h;
    for (const c of G.cars) {
      if (pl.safe > 0 && c === pl.owner) continue; const d = (c.si - pl.i + N) % N;
      if ((d <= 1 || d >= N - 1) && Math.abs(c.lat - pl.lat) < 1.9 && Math.abs(c.y - T.py[pl.i]) < 2.5) {
        const hit = spinOut(c, 'Slipped on a peel!'); if (hit && pl.owner === p && c !== p) { addPoints(150); toast('Peel got ' + c.ch.name + '!  +150', 'gold'); }
        IX.group.remove(pl.m); IX.peels.splice(k, 1); break;
      }
    }
  }
  // bees
  const top = G.cls.top;
  for (let k = IX.bees.length - 1; k >= 0; k--) {
    const b = IX.bees[k]; b.life -= h;
    let tgt = b.target; if (tgt && tgt.finished) tgt = b.target = null;
    b.s += (top * 1.55) / T.ds * h;
    if (b.s >= N) { b.s -= N; b.lap++; }
    const i = Math.floor(b.s) % N;
    let gap = Infinity;
    if (tgt) { gap = (tgt.lap * N + tgt.si + tgt.along / T.ds) - (b.lap * N + b.s); b.lat = lerp(b.lat, tgt.lat, 1 - Math.exp(-h * (gap < 25 ? 9 : 2.5))); }
    else b.lat = lerp(b.lat, T.line[i], 1 - Math.exp(-h * 2));
    let done = b.life <= 0;
    if (tgt && gap < 1.2 && Math.abs(tgt.lat - b.lat) < 3) {
      const hit = spinOut(tgt, 'Stung by a bee!');
      if (hit && b.owner === p) { addPoints(200); toast('Bee hit ' + tgt.ch.name + '!  +200', 'gold'); }
      done = true;
    } else if (!tgt) {
      for (const c of G.cars) if (c !== b.owner) { const d = (c.si - i + N) % N; if ((d <= 1 || d >= N - 1) && Math.abs(c.lat - b.lat) < 2.2) { spinOut(c, 'Stung by a bee!'); done = true; break; } }
    }
    if (done) { IX.group.remove(b.g); IX.bees.splice(k, 1); continue; }
    const f = b.s - Math.floor(b.s), j = (i + 1) % N;
    b.g.position.set(lerp(T.px[i], T.px[j], f) + T.rx[i] * b.lat, lerp(T.py[i], T.py[j], f) + 1.6 + Math.sin(G.t * 9) * .25, lerp(T.pz[i], T.pz[j], f) + T.rz[i] * b.lat);
    b.g.rotation.y = T.th[i];
  }
}

/* Visual-only work each frame: spinning boxes, spinning cars, bee wings, screen shake, speed lines. */
function itemsFrame(dt) {
  for (const b of IX.boxes) { b.m.rotation.x += dt * .9; b.m.rotation.z += dt * 1.3; b.m.position.y = G.T.py[b.i] + 1.5 + Math.sin(G.t * 2.4 + b.ph) * .22; }
  for (const b of IX.bees) for (const w of b.wings) w.rotation.z = Math.sin(G.t * 60) * .6 * Math.sign(w.position.x);
  for (const c of G.cars) {
    if (c.spinT > 0) c.tilt.rotation.y = c.spinA;
    if (c.bubble) { const s = 1 + Math.sin(G.t * 5) * .03; c.bubble.scale.set(2.4 * s, 1.9 * s, 3.3 * s); c.bubble.material.opacity = c.shield < 2 ? (Math.sin(G.t * 20) > 0 ? .3 : .08) : .22; }
  }
  if (IX.shake > 0) { IX.shake -= dt; const a = IX.shake * .5; camera.position.x += (Math.random() - .5) * a; camera.position.y += (Math.random() - .5) * a; }
  const fl = $('flash'); if (fl) { if (IX.flash > 0) IX.flash -= dt; fl.style.opacity = Math.max(0, IX.flash * 1.6).toFixed(2); }
  speedLines(dt);
}

function updateItemSlot(rolling) {
  const s = $('itemSlot'); if (!s) return; const p = G.player;
  const on = !!(OPT.items && IX.group && p);
  s.hidden = !on; if (!on) return;
  if (rolling || (p.roll > 0)) { s.className = 'rolling'; s.querySelector('b').textContent = '🎲'; s.querySelector('small').textContent = '…'; rollAnim(); return; }
  s.className = p.item ? 'ready' : '';
  const it = p.item && ITEMS[p.item];
  s.querySelector('b').textContent = it ? (p.item === 'triple' ? '🍯×' + (p.honeyN || 3) : it.icon) : '';
  s.querySelector('small').textContent = it ? it.name : (TOUCH.on ? 'Drive through a ? box' : 'Drive through a ? box · E to use');
}
function rollAnim() {
  const s = $('itemSlot'), keys = Object.keys(ITEMS), p = G.player; let n = 0;
  clearInterval(rollAnim.t);
  rollAnim.t = setInterval(() => { if (!p || !(p.roll > 0)) { clearInterval(rollAnim.t); return; } s.querySelector('b').textContent = ITEMS[keys[n++ % keys.length]].icon.slice(0, 2); }, 70);
}

/* ---------- speed lines: white streaks from the edges when going very fast or boosting ---------- */
const SL = { lines: [] };
function speedLines(dt) {
  const cv = $('speedfx'); if (!cv) return; const p = G.player;
  const W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W / 2)) { cv.width = Math.round(W / 2); cv.height = Math.round(H / 2); }
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  if (!p || G.state !== 'racing' || !G.cls) return;
  const k = clamp((p.speed / G.cls.top - .82) * 4, 0, 1) * .55 + (p.boosting ? .6 : 0);
  if (k <= .02) { SL.lines.length = 0; return; }
  const w = cv.width, h = cv.height, cx = w / 2, cy = h * .46, R = Math.hypot(w, h) / 2;
  while (SL.lines.length < 46 * k) SL.lines.push({ a: Math.random() * TAU, r: .55 + Math.random() * .4, l: .08 + Math.random() * .18, v: 1.8 + Math.random() * 1.6 });
  g.lineCap = 'round';
  for (let i = SL.lines.length - 1; i >= 0; i--) {
    const L = SL.lines[i]; L.r += L.v * dt; if (L.r > 1.15) { SL.lines.splice(i, 1); continue; }
    const ca = Math.cos(L.a), sa = Math.sin(L.a), r0 = L.r * R, r1 = (L.r + L.l) * R;
    g.strokeStyle = p.boosting && p.boostT > 0 ? `rgba(255,214,140,${.45 * k})` : `rgba(255,255,255,${.38 * k})`;
    g.lineWidth = 1.2 + L.l * 8;
    g.beginPath(); g.moveTo(cx + ca * r0, cy + sa * r0 * .7); g.lineTo(cx + ca * r1, cy + sa * r1 * .7); g.stroke();
  }
}

/* ---------- touch controls ---------- */
const TOUCH = { on: false, steer: 0, gas: 0, brake: 0, drift: 0, boost: 0 };
function initTouch() {
  const box = $('touch'); if (!box) return;
  const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  TOUCH.on = coarse; box.hidden = !coarse; if (!coarse) return;
  const held = {};
  const set = () => {
    TOUCH.steer = (held.right ? 1 : 0) - (held.left ? 1 : 0); TOUCH.gas = held.gas || TOUCH.autoGas ? 1 : 0; TOUCH.brake = held.brake ? 1 : 0; TOUCH.drift = held.drift ? 1 : 0; TOUCH.boost = held.boost ? 1 : 0;
    box.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', !!held[b.dataset.k]));
  };
  box.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault();
    const k = b.dataset.k;
    if (k === 'item') { if (G.player) useItem(G.player); return; }
    if (k === 'pause') { togglePause(); return; }
    held[k] = e.pointerId; b.setPointerCapture && b.setPointerCapture(e.pointerId); set();
  });
  const up = e => { for (const k in held) if (held[k] === e.pointerId) delete held[k]; set(); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up); box.addEventListener('lostpointercapture', up);
  box.addEventListener('contextmenu', e => e.preventDefault());
}
function touchInput(inp) {
  if (!TOUCH.on) return inp;
  if (TOUCH.steer) inp.steer = TOUCH.steer; if (TOUCH.gas) inp.throttle = 1; if (TOUCH.brake) inp.brake = 1;
  if (TOUCH.drift) inp.drift = true; if (TOUCH.boost) inp.boost = true;
  return inp;
}

/* ---------- Grand Prix: twenty cups of four circuits, points after every race, a podium at the end ---------- */
const CUP_NAMES = ['Laurel', 'Olive', 'Amphora', 'Lyre', 'Owl', 'Trident', 'Lightning', 'Sun', 'Moon', 'Star', 'Comet', 'Crown', 'Torch', 'Shield', 'Chariot', 'Pegasus', 'Phoenix', 'Griffin', 'Hydra', 'Titan', 'Cyclops', 'Siren', 'Muse', 'Oracle'];
const GP_POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const GP = { active: false, cup: null, race: 0, table: {} };
function cups() {
  if (cups.list) return cups.list;
  const sorted = TRACKS.slice().sort((a, b) => (a.cal || 99) - (b.cal || 99) || a.name.localeCompare(b.name)), out = [];
  for (let i = 0; i < sorted.length; i += 4) out.push({ name: (CUP_NAMES[out.length] || 'Bonus ' + (out.length + 1)) + ' Cup', tracks: sorted.slice(i, i + 4).map(t => t.id) });
  return cups.list = out;
}
const cupOf = id => cups().find(c => c.tracks.includes(id)) || cups()[0];
function gpHint() {
  const c = cupOf(OPT.track);
  return `${c.name}: ${c.tracks.map(id => TRACKS.find(t => t.id === id).name).join(' → ')}. Points after each race; the cup goes to whoever has the most after four. Pick any circuit to choose its cup.`;
}
function gpBegin() {
  const c = cupOf(OPT.track); GP.active = true; GP.cup = c; GP.race = 0; GP.table = {};
  OPT.track = c.tracks[0]; startRace();
}
function gpNext() {
  if (!GP.active) return startRace();
  if (GP.race >= GP.cup.tracks.length - 1) return gpPodium();
  GP.race++; OPT.track = GP.cup.tracks[GP.race]; startRace();
}
function gpAfterResults() {
  const again = $('btnAgain');
  if (OPT.mode === 'race' && G.player && G.player.pos === 1) confetti(2600);
  if (!GP.active) { again.textContent = 'Race again'; $('gpTable').hidden = true; return; }
  // award points once per race
  if (GP.scored !== GP.race + '|' + GP.cup.name) {
    GP.scored = GP.race + '|' + GP.cup.name;
    G.order.forEach((c, i) => { const k = c.ch.name; const e = GP.table[k] || (GP.table[k] = { name: c.ch.name, ch: c.ch, me: c.isPlayer, pts: 0, wins: 0 }); e.pts += GP_POINTS[i] || 0; if (i === 0) e.wins++; e.last = i + 1; });
  }
  const rows = Object.values(GP.table).sort((a, b) => b.pts - a.pts || b.wins - a.wins);
  $('gpTable').hidden = false;
  $('gpTable').innerHTML = `<tr><th colspan="3">${GP.cup.name} · after race ${GP.race + 1} of ${GP.cup.tracks.length}</th><th>Pts</th></tr>` +
    rows.slice(0, 12).map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:#${C3(r.ch.car).getHexString()}"></span>${r.name}</td><td><small>+${GP_POINTS[r.last - 1] || 0}</small></td><td><b>${r.pts}</b></td></tr>`).join('');
  again.textContent = GP.race >= GP.cup.tracks.length - 1 ? 'Award ceremony 🏆' : 'Next race: ' + TRACKS.find(t => t.id === GP.cup.tracks[GP.race + 1]).name;
  $('resSub').textContent += ' · ' + GP.cup.name + ', race ' + (GP.race + 1) + ' of ' + GP.cup.tracks.length;
}
function gpPodium() {
  const rows = Object.values(GP.table).sort((a, b) => b.pts - a.pts || b.wins - a.wins), me = rows.findIndex(r => r.me);
  const trophy = ['🏆', '🥈', '🥉'];
  $('podTitle').textContent = me === 0 ? 'You win the ' + GP.cup.name + '!' : me < 3 ? ordinal(me + 1) + ' in the ' + GP.cup.name + '!' : GP.cup.name + ' complete';
  $('podSub').textContent = me < 3 ? 'Up you go onto the podium.' : 'You finished ' + ordinal(me + 1) + ' overall. The podium is waiting next time.';
  const order = [1, 0, 2];
  $('podium').innerHTML = order.map(i => rows[i] ? `<div class="pod p${i + 1}${rows[i].me ? ' me' : ''}"><div class="who">${avatarSVG(rows[i].ch)}<b>${rows[i].name}</b><small>${rows[i].pts} pts</small></div><div class="step"><span>${trophy[i]}</span><em>${i + 1}</em></div></div>` : '').join('');
  $('podTable').innerHTML = rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:#${C3(r.ch.car).getHexString()}"></span>${r.name}</td><td>${r.wins ? r.wins + ' win' + (r.wins > 1 ? 's' : '') : ''}</td><td><b>${r.pts}</b></td></tr>`).join('');
  const won = JSON.parse(localStorage.getItem('trr_cups') || '{}');
  if (me < 3) { won[GP.cup.name] = Math.min(won[GP.cup.name] || 9, me + 1); try { localStorage.setItem('trr_cups', JSON.stringify(won)); } catch (e) { } }
  GP.active = false; G.state = 'finished'; showScreen('cupEnd');
  if (me < 3) { Sound.fanfare(); confetti(6000); }
}
function cupShelf() {
  let won = {}; try { won = JSON.parse(localStorage.getItem('trr_cups') || '{}'); } catch (e) { }
  const n = Object.keys(won).length; if (!n) return '';
  const g = Object.values(won).filter(v => v === 1).length;
  return ` Trophy shelf: ${g} gold, ${n - g} other podiums.`;
}

/* ---------- confetti ---------- */
function confetti(ms) {
  const cv = $('confetti'); if (!cv) return; cv.hidden = false;
  const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight, g = cv.getContext('2d');
  const cols = ['#ff5f8f', '#ffd23d', '#5ee7a0', '#53b8ff', '#b27bff', '#ffffff', '#ff8a3d'];
  const bits = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: -Math.random() * H * .8, vx: (Math.random() - .5) * 120, vy: 80 + Math.random() * 160, r: Math.random() * TAU, vr: (Math.random() - .5) * 12, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now(); let last = t0;
  cancelAnimationFrame(confetti.raf);
  const step = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; g.clearRect(0, 0, W, H);
    const fade = clamp((t0 + ms - now) / 800, 0, 1);
    for (const b of bits) { b.vy += 30 * dt; b.vx *= .995; b.x += b.vx * dt + Math.sin(now / 300 + b.r) * .6; b.y += b.vy * dt; b.r += b.vr * dt; if (b.y > H + 20 && now < t0 + ms - 1500) { b.y = -10; b.x = Math.random() * W; }
      g.save(); g.globalAlpha = fade; g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.w / 2, -b.h / 2, b.w, Math.abs(Math.cos(b.r * 1.3)) * b.h + 1); g.restore(); }
    if (now < t0 + ms) confetti.raf = requestAnimationFrame(step); else { g.clearRect(0, 0, W, H); cv.hidden = true; }
  };
  confetti.raf = requestAnimationFrame(step);
}

/* ---------- wiring that needs the DOM ---------- */
function initExtras() {
  initTouch();
  $('btnCupMenu').addEventListener('click', () => { $('confetti').hidden = true; toMenu(); });
  $('btnCupAgain').addEventListener('click', () => { $('confetti').hidden = true; gpBegin(); });
  addEventListener('keydown', e => {
    if ((e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'Enter') && G.state === 'racing' && G.player) { e.preventDefault(); useItem(G.player); }
  });
}
initExtras();
boot();
