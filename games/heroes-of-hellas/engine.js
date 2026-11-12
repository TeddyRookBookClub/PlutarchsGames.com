'use strict';
/* Heroes of Hellas — simulation: map, pathfinding, units, buildings, economy, combat, enemy AI, scenarios.
   The world is a square grid of tiles; units live at fractional tile positions; buildings occupy whole tiles.
   Player 1 is you, 2 is the enemy city, 3 is monsters, 0 is nature (trees, mines, shrines). */

const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// terrain
const TER = { grass: 0, dirt: 1, sand: 2, water: 3, shallow: 4, marsh: 5, stone: 6, hill: 7, maze: 8 };
const TER_BLOCK = [0, 0, 0, 1, 0, 0, 0, 0, 1];
const TER_SLOW = [1, 1, 1, 1, .75, .6, 1, .9, 1];

let G = null;   // the game

/* ---------- new game ---------- */
function newGame(scen, opts) {
  const n = scen.map.size, seed = scen.map.seed || (Math.random() * 1e9 | 0);
  G = {
    scen, opts: opts || {}, n, R: rng(seed), time: 0, ents: [], byId: new Map(), nextId: 1,
    ter: new Uint8Array(n * n), block: new Uint8Array(n * n), occ: new Int32Array(n * n), // occ: building or resource id on a tile
    vis: new Uint8Array(n * n), exp: new Uint8Array(n * n), fogT: 0,
    players: {}, sel: [], missiles: [], fx: [], msgs: [], objectives: scen.objectives.map(o => Object.assign({ done: false, failed: false }, o)),
    state: 'play', flags: {}, aiT: 0, waveT: 0, wave: 0, aegisT: 0, speed: 1,
  };
  for (const p of [0, 1, 2, 3]) G.players[p] = { id: p, res: { food: 0, wood: 0, gold: 0, favor: 0 }, age: 0, techs: new Set(), pop: 0, cap: 0, researching: new Set() };
  Object.assign(G.players[1].res, scen.start);
  Object.assign(G.players[2].res, { food: 400, wood: 400, gold: 300, favor: 0 });
  genMap(scen.map);
  SETUP[scen.id] ? SETUP[scen.id](G) : SETUP.skirmish(G);
  rebuildBlock(); updateFog(true); recount();
  return G;
}

/* ---------- map generation ---------- */
function valueNoise(R, n, scale) {
  const g = Math.ceil(n / scale) + 2, v = new Float32Array(g * g); for (let i = 0; i < v.length; i++) v[i] = R();
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => { const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy), a = v[iy * g + ix], b = v[iy * g + ix + 1], c = v[(iy + 1) * g + ix], d = v[(iy + 1) * g + ix + 1]; return lerp(lerp(a, b, tx), lerp(c, d, tx), ty); };
}
function genMap(m) {
  const n = G.n, R = G.R, N1 = valueNoise(R, n, 7), N2 = valueNoise(R, n, 4), N3 = valueNoise(R, n, 11);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let t = TER.grass; const v = N1(x, y);
    if (v > .72) t = TER.dirt; if (N3(x, y) > .78) t = TER.hill;
    if (m.sea) {
      const d = m.sea === 'west' ? x : m.sea === 'east' ? n - 1 - x : m.sea === 'south' ? n - 1 - y : y;
      const coast = 5 + N2(x, y) * 4;
      if (d < coast - 2) t = TER.water; else if (d < coast - 1) t = TER.shallow; else if (d < coast + 1) t = TER.sand;
    }
    G.ter[y * n + x] = t;
  }
  // forests
  const F = valueNoise(R, n, 6);
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    const i = y * n + x; if (G.ter[i] !== TER.grass && G.ter[i] !== TER.hill && G.ter[i] !== TER.dirt) continue;
    if (F(x, y) > 1 - m.forest * .55 && R() < .85) addRes('tree', x, y);
    else if (R() < .012) addRes('tree', x, y);
  }
}
function addRes(t, x, y, amount) {
  const i = y * G.n + x; if (G.occ[i]) return null; if (TER_BLOCK[G.ter[i]] && t !== 'fish') return null;
  const e = { id: G.nextId++, kind: 'res', t, owner: 0, x, y, amount: amount || { tree: 120, gold: 500, berry: 150 }[t], max: 0, v: G.R() };
  e.max = e.amount; G.ents.push(e); G.byId.set(e.id, e); G.occ[i] = e.id; return e;
}
function clearArea(cx, cy, r) {
  for (const e of G.ents) if (e.kind === 'res' && dist(e.x, e.y, cx, cy) < r) removeEnt(e);
}
function goldMine(cx, cy) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [-1, 1]]) if (G.R() < .8 || !dx) { const x = cx + dx, y = cy + dy; clearTile(x, y); addRes('gold', x, y); } }
function berries(cx, cy) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]]) { clearTile(cx + dx, cy + dy); addRes('berry', cx + dx, cy + dy); } }
function clearTile(x, y) { const id = G.occ[y * G.n + x]; if (id) { const e = G.byId.get(id); if (e && e.kind === 'res') removeEnt(e); } }
function setTer(x, y, t) { if (x >= 0 && y >= 0 && x < G.n && y < G.n) G.ter[y * G.n + x] = t; }
function paint(cx, cy, r, t) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (dist(x, y, cx, cy) <= r) setTer(x, y, t); }
function scatterRes(R, kind, count, avoid) {
  let placed = 0, tries = 0;
  while (placed < count && tries++ < 400) {
    const x = 4 + Math.floor(R() * (G.n - 10)), y = 4 + Math.floor(R() * (G.n - 10));
    if (TER_BLOCK[G.ter[y * G.n + x]] || G.ter[y * G.n + x] === TER.sand) continue;
    if (avoid.some(a => dist(a[0], a[1], x, y) < a[2])) continue;
    kind === 'gold' ? goldMine(x, y) : berries(x, y); placed++; avoid.push([x, y, 7]);
  }
}

/* ---------- entities ---------- */
function addUnit(t, owner, x, y, extra) {
  const D = UNITS[t]; const e = Object.assign({ id: G.nextId++, kind: 'unit', t, owner, x: x + .5, y: y + .5, hp: D.hp, maxHp: D.hp, state: 'idle', path: null, cd: 0, face: 1, anim: G.R() * 10, carry: null, home: { x: x + .5, y: y + .5 }, lastHit: -99, hitBy: 0 }, extra || {});
  G.ents.push(e); G.byId.set(e.id, e); return e;
}
function addBld(t, owner, x, y, built) {
  const D = BUILDINGS[t]; const e = { id: G.nextId++, kind: 'bld', t, owner, x, y, size: D.size, hp: built === false ? 1 : D.hp, maxHp: D.hp, built: built === false ? 0 : 1, queue: [], cd: 0, rally: null, lastHit: -99 };
  G.ents.push(e); G.byId.set(e.id, e);
  for (let j = 0; j < e.size; j++) for (let i = 0; i < e.size; i++) { clearTile(x + i, y + j); G.occ[(y + j) * G.n + x + i] = e.id; }
  if (G.block) markBlock(e);
  return e;
}
function removeEnt(e) {
  e.dead = true; const k = G.ents.indexOf(e); if (k >= 0) G.ents.splice(k, 1); G.byId.delete(e.id);
  if (e.kind === 'res') { G.occ[e.y * G.n + e.x] = 0; G.block[e.y * G.n + e.x] = TER_BLOCK[G.ter[e.y * G.n + e.x]]; }
  if (e.kind === 'bld') { for (let j = 0; j < e.size; j++) for (let i = 0; i < e.size; i++) { const q = (e.y + j) * G.n + e.x + i; if (G.occ[q] === e.id) G.occ[q] = 0; G.block[q] = TER_BLOCK[G.ter[q]]; } }
  const s = G.sel.indexOf(e); if (s >= 0) G.sel.splice(s, 1);
}
function markBlock(e) { if (BUILDINGS[e.t] && BUILDINGS[e.t].walkable) return; for (let j = 0; j < e.size; j++) for (let i = 0; i < e.size; i++) G.block[(e.y + j) * G.n + e.x + i] = 1; }
function rebuildBlock() {
  const n = G.n; for (let i = 0; i < n * n; i++) G.block[i] = TER_BLOCK[G.ter[i]];
  for (const e of G.ents) { if (e.kind === 'res') G.block[e.y * n + e.x] = 1; else if (e.kind === 'bld') markBlock(e); }
}
const isEnemy = (a, b) => a.owner !== b.owner && a.owner !== 0 && b.owner !== 0;
const center = e => e.kind === 'bld' ? { x: e.x + e.size / 2, y: e.y + e.size / 2 } : e.kind === 'res' ? { x: e.x + .5, y: e.y + .5 } : { x: e.x, y: e.y };
function edgeDist(u, e) { // distance from a unit to the nearest point of an entity
  if (e.kind === 'unit') return dist(u.x, u.y, e.x, e.y);
  const s = e.kind === 'bld' ? e.size : 1, cx = clamp(u.x, e.x, e.x + s), cy = clamp(u.y, e.y, e.y + s); return dist(u.x, u.y, cx, cy);
}
const D_ = e => e.kind === 'unit' ? UNITS[e.t] : e.kind === 'bld' ? BUILDINGS[e.t] : null;

/* ---------- pathfinding: A* on tiles, 8 directions, no corner cutting ---------- */
const PF = { g: null, f: null, from: null, stamp: null, cur: 1, heap: [] };
function findPath(sx, sy, goal, maxNodes) {
  const n = G.n, N = n * n;
  if (!PF.g || PF.g.length !== N) { PF.g = new Float32Array(N); PF.from = new Int32Array(N); PF.stamp = new Uint32Array(N); PF.closed = new Uint32Array(N); }
  const st = ++PF.cur, h = PF.heap; h.length = 0;
  sx = clamp(Math.floor(sx), 0, n - 1); sy = clamp(Math.floor(sy), 0, n - 1);
  const s = sy * n + sx; PF.g[s] = 0; PF.stamp[s] = st; PF.from[s] = -1;
  const hx = goal.x, hy = goal.y, H = i => { const dx = Math.abs(i % n - hx), dy = Math.abs(((i / n) | 0) - hy); return Math.max(dx, dy) + .41 * Math.min(dx, dy); };
  const push = (i, f) => { h.push([f, i]); let k = h.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (h[p][0] <= h[k][0]) break; [h[p], h[k]] = [h[k], h[p]]; k = p; } };
  const pop = () => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let k = 0; for (; ;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; } } return top; };
  push(s, H(s)); let best = s, bestH = H(s), count = 0; const lim = maxNodes || 5000;
  while (h.length && count++ < lim) {
    const [, i] = pop(); if (PF.closed[i] === st) continue; PF.closed[i] = st;
    const x = i % n, y = (i / n) | 0;
    if (goal.test(x, y)) { best = i; bestH = 0; break; }
    const hh = H(i); if (hh < bestH) { bestH = hh; best = i; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx; if (G.block[j] && !goal.test(nx, ny)) continue;
      if (dx && dy && (G.block[y * n + nx] || G.block[ny * n + x])) continue;
      const cost = (dx && dy ? 1.414 : 1) / TER_SLOW[G.ter[j]], ng = PF.g[i] + cost;
      if (PF.stamp[j] !== st || ng < PF.g[j]) { PF.stamp[j] = st; PF.g[j] = ng; PF.from[j] = i; push(j, ng + H(j)); }
    }
  }
  const out = []; let i = best; while (i >= 0 && i !== s) { out.push({ x: i % n + .5, y: ((i / n) | 0) + .5 }); i = PF.from[i]; }
  out.reverse(); return { path: out, reached: bestH === 0 };
}
const goalPoint = (x, y) => ({ x: Math.floor(x), y: Math.floor(y), test: (a, b) => a === Math.floor(x) && b === Math.floor(y) });
function goalNear(e) { // any free tile touching the entity
  const s = e.kind === 'bld' ? e.size : 1, x0 = e.x | 0, y0 = e.y | 0;
  return { x: x0 + (s >> 1), y: y0 + (s >> 1), test: (a, b) => a >= x0 - 1 && a <= x0 + s && b >= y0 - 1 && b <= y0 + s && !(a >= x0 && a < x0 + s && b >= y0 && b < y0 + s) && !G.block[b * G.n + a] };
}
function goalInside(e) { return { x: e.x, y: e.y, test: (a, b) => a >= e.x && a < e.x + e.size && b >= e.y && b < e.y + e.size }; }
function moveTo(u, goal) {
  if (UNITS[u.t].flying) { u.path = [{ x: goal.x + .5, y: goal.y + .5 }]; u.pathT = G.time; return true; }
  const r = findPath(u.x, u.y, goal); u.path = r.path; u.pathT = G.time;
  if (!r.path.length && !goal.test(Math.floor(u.x), Math.floor(u.y))) u.path = null;
  return r.reached;
}

/* ---------- orders ---------- */
function order(units, kind, target, opts) {
  opts = opts || {};
  const list = units.filter(u => u.kind === 'unit' && !u.dead);
  // formation offsets for group moves
  const cols = Math.ceil(Math.sqrt(list.length));
  list.forEach((u, k) => {
    u.attackMove = false; u.target = null; u.build = null; u.res = null; u.farm = null;
    if (kind === 'move') {
      const ox = (k % cols - (cols - 1) / 2) * .9, oy = (Math.floor(k / cols) - (cols - 1) / 2) * .9;
      let tx = clamp(target.x + ox, .5, G.n - .5), ty = clamp(target.y + oy, .5, G.n - .5);
      if (G.block[Math.floor(ty) * G.n + Math.floor(tx)]) { tx = target.x; ty = target.y; }
      u.state = 'move'; u.attackMove = !!opts.attackMove; moveTo(u, goalPoint(tx, ty)); u.dest = { x: tx, y: ty };
    } else if (kind === 'attack') { u.state = 'attack'; u.target = target.id; u.path = null; }
    else if (kind === 'gather') { if (!UNITS[u.t].civ || UNITS[u.t].hero) { order([u], 'move', center(target)); return; } u.state = 'gather'; u.res = target.id; u.resT = target.t; u.path = null; }
    else if (kind === 'build') { if (!UNITS[u.t].civ || UNITS[u.t].hero) return; u.state = 'build'; u.build = target.id; u.path = null; }
    else if (kind === 'farm') { if (!UNITS[u.t].civ || UNITS[u.t].hero) return; u.state = 'farm'; u.farm = target.id; u.path = null; }
    else if (kind === 'dropoff') { u.state = 'return'; u.path = null; }
  });
}
// right-click (or tap) on something: decide what the selected units should do
function smartOrder(units, x, y, ent) {
  const mine = units.filter(u => u.owner === 1 && u.kind === 'unit'); if (!mine.length) return null;
  if (ent && ent.kind === 'res') { const civ = mine.filter(u => UNITS[u.t].civ && !UNITS[u.t].hero), mil = mine.filter(u => !civ.includes(u)); order(civ, 'gather', ent); if (mil.length) order(mil, 'move', { x, y }); return civ.length ? 'gather' : 'move'; }
  if (ent && ent.kind === 'bld' && ent.owner === 1) {
    const civ = mine.filter(u => UNITS[u.t].civ && !UNITS[u.t].hero), mil = mine.filter(u => !civ.includes(u));
    if (!ent.built) order(civ, 'build', ent);
    else if (BUILDINGS[ent.t].farm) order(civ.slice(0, 1), 'farm', ent);
    else if (BUILDINGS[ent.t].drop) order(civ.filter(u => u.carry && u.carry.amt > 0), 'dropoff', ent);
    else if (ent.hp < ent.maxHp) order(civ, 'build', ent);
    if (mil.length) order(mil, 'move', { x, y }); return 'build';
  }
  if (ent && (ent.kind === 'unit' || ent.kind === 'bld') && isEnemy(mine[0], ent) && !ent.dead) {
    const fighters = mine.filter(u => !UNITS[u.t].noAttack); order(fighters, 'attack', ent); return 'attack';
  }
  order(mine, 'move', { x, y }); return 'move';
}

/* ---------- economy helpers ---------- */
const P = id => G.players[id];
const canAfford = (pid, cost) => !cost || Object.keys(cost).every(k => P(pid).res[k] >= cost[k]);
const pay = (pid, cost) => { if (cost) for (const k in cost) P(pid).res[k] -= cost[k]; };
const refund = (pid, cost) => { if (cost) for (const k in cost) P(pid).res[k] += cost[k]; };
function recount() {
  for (const pid of [1, 2]) { const p = P(pid); p.pop = 0; p.cap = 0; }
  for (const e of G.ents) {
    if (e.owner !== 1 && e.owner !== 2) continue;
    if (e.kind === 'unit' && !UNITS[e.t].hero) P(e.owner).pop += UNITS[e.t].pop ?? 1;
    if (e.kind === 'bld' && e.built >= 1 && BUILDINGS[e.t].pop) P(e.owner).cap += BUILDINGS[e.t].pop;
    if (e.kind === 'bld') for (const q of e.queue) if (q.unit) P(e.owner).pop += UNITS[q.unit].pop || 1;
  }
  for (const pid of [1, 2]) P(pid).cap = Math.min(P(pid).cap + (P(pid).capBonus || 0), 130);
}
const carryCap = u => P(u.owner).techs.has('wheelbarrow') ? 15 : 10;
function gatherRate(u, type) { const T = P(u.owner).techs; return { food: .75, wood: .6, gold: .55 }[type] * (type === 'wood' && T.has('axes') ? 1.25 : 1) * (type === 'gold' && T.has('picks') ? 1.25 : 1); }
const resType = t => t === 'tree' ? 'wood' : t === 'gold' ? 'gold' : 'food';
function nearestDrop(u, type) {
  let best = null, bd = 1e9;
  for (const e of G.ents) if (e.kind === 'bld' && e.owner === u.owner && e.built >= 1 && BUILDINGS[e.t].drop && BUILDINGS[e.t].drop.includes(type)) { const d = edgeDist(u, e); if (d < bd) { bd = d; best = e; } }
  return best;
}
function nearestRes(x, y, t, maxD, owner) {
  let best = null, bd = maxD || 1e9;
  for (const e of G.ents) if (e.kind === 'res' && e.t === t && e.amount > 0) { const d = dist(x, y, e.x + .5, e.y + .5); if (d < bd && (owner !== 1 || G.exp[e.y * G.n + e.x])) { bd = d; best = e; } }
  return best;
}
function canPlace(t, x, y, pid) {
  const D = BUILDINGS[t], n = G.n;
  if (x < 1 || y < 1 || x + D.size > n - 1 || y + D.size > n - 1) return false;
  for (let j = 0; j < D.size; j++) for (let i = 0; i < D.size; i++) {
    const q = (y + j) * n + x + i; if (G.block[q] || G.occ[q] || G.ter[q] === TER.water || G.ter[q] === TER.maze) return false;
    if (pid === 1 && !G.exp[q]) return false;
    for (const u of G.ents) if (u.kind === 'unit' && u.owner !== pid && Math.floor(u.x) === x + i && Math.floor(u.y) === y + j) return false;
  }
  return true;
}
function placeBuilding(pid, t, x, y, builders) {
  const D = BUILDINGS[t]; if (!canPlace(t, x, y, pid) || !canAfford(pid, D.cost)) return null;
  pay(pid, D.cost); const b = addBld(t, pid, x, y, false);
  // nudge any of our units standing there out of the way
  for (const u of G.ents) if (u.kind === 'unit' && u.x >= x && u.x < x + D.size && u.y >= y && u.y < y + D.size && !D.walkable) { u.x = x - .5; u.y = y + D.size + .5; }
  if (builders && builders.length) order(builders, 'build', b);
  return b;
}
function queueTrain(b, ut) {
  const D = UNITS[ut], p = P(b.owner);
  if (b.queue.length >= 6 || !canAfford(b.owner, D.cost) || (D.age || 0) > p.age) return false;
  if (p.pop + (D.pop || 1) > p.cap) { if (b.owner === 1) say('You need more houses.', 'warn'); return false; }
  pay(b.owner, D.cost); b.queue.push({ unit: ut, t: 0, total: D.time }); recount(); return true;
}
function queueTech(b, tid) {
  const T = TECHS[tid], p = P(b.owner);
  if (p.techs.has(tid) || p.researching.has(tid) || (T.age || 0) > p.age || !canAfford(b.owner, T.cost) || b.queue.length >= 6) return false;
  if (T.ageUp && T.ageUp !== p.age + 1) return false;
  pay(b.owner, T.cost); p.researching.add(tid); b.queue.push({ tech: tid, t: 0, total: T.time }); return true;
}
function cancelQueue(b, idx) {
  const q = b.queue[idx]; if (!q) return; b.queue.splice(idx, 1);
  if (q.unit) refund(b.owner, UNITS[q.unit].cost); else { refund(b.owner, TECHS[q.tech].cost); P(b.owner).researching.delete(q.tech); }
  recount();
}

/* ---------- combat ---------- */
function damageFor(a, d) {
  const A = UNITS[a.t] || BUILDINGS[a.t], Dd = D_(d), pa = P(a.owner);
  let atk = A.atk || 0;
  if (a.kind === 'unit') {
    if ((a.t === 'hoplite' || a.t === 'cavalry') && pa.techs.has('spears')) atk += 2;
    if (A.missile === 'arrow' && pa.techs.has('fletching')) atk += 1;
    if (A.hero && pa.age >= 2) atk *= 1.25;
  } else if (pa.techs.has('fletching')) atk += 1;
  if (A.onlyBuildings && d.kind !== 'bld') return 0;
  if (a.owner === 1 && G.furyT > 0) atk *= 1.5; if (a.heraBoost) atk *= a.heraBoost;
  let mult = 1, b = A.bonus || {};
  if (d.kind === 'bld') mult = b.building || (a.kind === 'unit' && !A.hero && !A.myth ? .35 : A.myth ? 1.2 : .6);
  else { const ty = Dd.type; if (b[ty]) mult = b[ty]; if (Dd.myth && b.myth) mult = b.myth; }
  if (d.kind === 'unit' && Dd.arrowproof && (A.missile || a.kind === 'bld') && !A.hero) return 0;
  let armor = (Dd && Dd.armor) || 0;
  if (d.kind === 'unit' && d.owner > 0 && P(d.owner).techs.has('bronze') && !Dd.civ && !Dd.myth) armor += 1;
  if (d.kind === 'bld') armor = 2;
  return Math.max(1, atk * mult - armor);
}
function hit(a, d, amt) {
  if (d.dead || amt <= 0) { if (amt === 0 && d.kind === 'unit' && UNITS[d.t].arrowproof && a.owner === 1) fxText(d.x, d.y, 'immune', '#ddd'); return; }
  if (d.owner === 1 && G.aegisT > 0 && d.kind === 'unit') { fxText(d.x, d.y, '🛡', '#9cf'); return; }
  d.hp -= amt; d.lastHit = G.time; d.hitBy = a.id;
  if (a.kind === 'unit' && UNITS[a.t].hero) d.lastHeroHit = G.time;
  if (d.owner === 1 && G.time - (G.alertT || -99) > 12 && a.owner !== 1) { G.alertT = G.time; say('We are under attack!', 'warn'); G.alertAt = center(d); SND && SND.alarm(); }
  // retaliate / call for help
  if (d.kind === 'unit' && d.state === 'idle' && !UNITS[d.t].civ) { d.state = 'attack'; d.target = a.id; }
  if (d.kind === 'unit' && UNITS[d.t].civ && !UNITS[d.t].hero && d.owner === 1 && d.state !== 'flee') { /* villagers keep working; the alarm tells the player */ }
  if (d.hp <= 0) kill(d, a);
}
function kill(d, a) {
  if (d.dead) return;
  if (d.kind === 'unit') { fxBurst(d.x, d.y, UNITS[d.t].myth ? '#a3e05a' : '#c33', 10); G.fx.push({ k: 'corpse', x: d.x, y: d.y, t: 0, life: 14, unit: d.t, owner: d.owner, face: d.face }); }
  else if (d.kind === 'bld') { fxBurst(d.x + d.size / 2, d.y + d.size / 2, '#bba', 30); G.fx.push({ k: 'rubble', x: d.x, y: d.y, size: d.size, t: 0, life: 40 }); SND && SND.crash(); }
  removeEnt(d); recount();
  SCEN_EVENTS.onKill && SCEN_EVENTS.onKill(d, a);
}
function petrify(d) {
  if (d.dead) return; G.fx.push({ k: 'statue', x: d.x, y: d.y, t: 0, life: 1e9, unit: d.t, owner: d.owner, face: d.face });
  fxBurst(d.x, d.y, '#bbb', 12); if (d.owner === 1) say(UNITS[d.t].name + ' was turned to stone!', 'warn');
  removeEnt(d); recount(); SCEN_EVENTS.onKill && SCEN_EVENTS.onKill(d, null, 'stone');
}
function fire(a, d, kind) {
  const c = center(d), A = UNITS[a.t] || BUILDINGS[a.t];
  G.missiles.push({ x: a.x + (a.size ? a.size / 2 : 0), y: a.y + (a.size ? a.size / 2 : 0), z: a.size ? 2 : .8, from: a.id, owner: a.owner, to: d.id, tx: c.x, ty: c.y, kind: kind || 'arrow', speed: kind === 'gaze' ? 9 : kind === 'fire' ? 7 : 11, dmg: damageFor(a, d), splash: A.splash || 0, t: 0 });
}
function stepMissiles(dt) {
  for (let i = G.missiles.length - 1; i >= 0; i--) {
    const m = G.missiles[i], tgt = G.byId.get(m.to);
    if (tgt) { const c = center(tgt); m.tx = c.x; m.ty = c.y; }
    const d = dist(m.x, m.y, m.tx, m.ty), step = m.speed * dt; m.t += dt;
    if (d <= step) {
      G.missiles.splice(i, 1); const src = G.byId.get(m.from) || { kind: 'unit', t: 'archer', owner: m.owner, id: m.from };
      if (m.kind === 'gaze') { if (tgt && !tgt.dead) { if (tgt.kind === 'unit' && !(UNITS[tgt.t].hero && tgt.mirror) && !UNITS[tgt.t].myth) petrify(tgt); else hit(src, tgt, m.dmg); } }
      else if (m.splash) { for (const e of G.ents.slice()) if ((e.kind === 'unit' || e.kind === 'bld') && e.owner !== m.owner && e.owner !== 0 && edgeDist({ x: m.tx, y: m.ty }, e) < m.splash) hit(src, e, m.dmg * (e === tgt ? 1 : .6)); G.fx.push({ k: 'boom', x: m.tx, y: m.ty, t: 0, life: .5, col: '#ff8a2a' }); }
      else if (tgt && !tgt.dead) hit(src, tgt, m.dmg);
      continue;
    }
    m.x += (m.tx - m.x) / d * step; m.y += (m.ty - m.y) / d * step;
  }
}

/* ---------- unit behaviour ---------- */
function findEnemy(u, range, pred) {
  let best = null, bd = range;
  for (const e of G.ents) {
    if ((e.kind !== 'unit' && e.kind !== 'bld') || !isEnemy(u, e) || e.dead) continue;
    if (pred && !pred(e)) continue;
    if (u.owner === 2 || u.owner === 3) { /* AI sees everything in range */ } else if (e.kind === 'unit' && !G.vis[Math.floor(e.y) * G.n + Math.floor(e.x)] && u.owner === 1) continue;
    const d = edgeDist(u, e) + (e.kind === 'bld' ? 2.5 : 0) + (e.kind === 'unit' && UNITS[e.t].civ ? 1 : 0);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function stepUnit(u, dt) {
  const D = UNITS[u.t]; u.cd = Math.max(0, u.cd - dt); u.anim += dt;
  if (D.regen && u.hp < u.maxHp && G.time - u.lastHit > 6) u.hp = Math.min(u.maxHp, u.hp + D.regen * dt);
  if (D.regenMyth && u.hp < u.maxHp && G.time - (u.lastHeroHit || -99) > 3) u.hp = Math.min(u.maxHp, u.hp + D.regenMyth * dt);
  if (u.stun > 0) { u.stun -= dt; u.dance = true; return; } u.dance = false;
  const st = u.state;
  if (st === 'idle') {
    if (!D.civ && !D.noAttack && (G.time + u.id * .13) % .5 < dt) {
      const e = findEnemy(u, D.sight + (u.owner === 3 ? 0 : 0), D.onlyBuildings ? (x => x.kind === 'bld') : null);
      if (e) { u.state = 'attack'; u.target = e.id; u.path = null; u.guard = true; }
      else if ((u.owner === 3 || u.owner === 2) && dist(u.x, u.y, u.home.x, u.home.y) > 1.5 && !u.path) { moveTo(u, goalPoint(u.home.x, u.home.y)); }
    }
    followPath(u, dt);
  } else if (st === 'move') {
    if (u.attackMove && (G.time + u.id * .13) % .5 < dt) { const e = findEnemy(u, D.sight); if (e) { u.state = 'attack'; u.target = e.id; u.path = null; u.resume = u.dest; return; } }
    if (!followPath(u, dt)) { u.state = 'idle'; if (u.resume && u.attackMove) { } }
  } else if (st === 'attack') stepAttack(u, D, dt);
  else if (st === 'gather') stepGather(u, dt);
  else if (st === 'return') stepReturn(u, dt);
  else if (st === 'build') stepBuild(u, dt);
  else if (st === 'farm') stepFarm(u, dt);
}
function followPath(u, dt) {
  if (!u.path || !u.path.length) { u.path = null; return false; }
  const p = u.path[0], d = dist(u.x, u.y, p.x, p.y), sp = UNITS[u.t].speed * (P(u.owner).techs.has('wheelbarrow') && UNITS[u.t].civ ? 1.1 : 1) * TER_SLOW[G.ter[Math.floor(u.y) * G.n + Math.floor(u.x)] || 0] * (u.charging ? 2.2 : 1) * (u.owner === 1 && G.swiftT > 0 ? 1.6 : 1) * (u.stun > 0 ? 0 : 1) * dt;
  if (Math.abs(p.x - u.x) > .01) u.face = p.x - u.x + (p.y - u.y) * 0 > 0 ? 1 : -1;
  // iso: screen x is (x - y); face by screen direction
  const sdx = (p.x - u.x) - (p.y - u.y); if (Math.abs(sdx) > .05) u.face = sdx > 0 ? 1 : -1;
  u.moving = true;
  if (d <= sp) { u.x = p.x; u.y = p.y; u.path.shift(); if (!u.path.length) { u.path = null; return false; } }
  else { u.x += (p.x - u.x) / d * sp; u.y += (p.y - u.y) / d * sp; }
  return true;
}
function stepAttack(u, D, dt) {
  const t = G.byId.get(u.target);
  if (!t || t.dead || (t.kind === 'unit' && u.owner === 1 && !G.vis[Math.floor(t.y) * G.n + Math.floor(t.x)] && !t.monsterVisible)) {
    u.target = null; u.charging = false;
    if (u.resume) { const r = u.resume; u.resume = null; order([u], 'move', r, { attackMove: true }); return; }
    u.state = 'idle'; u.path = null; return;
  }
  // monsters and guards don't chase forever
  if ((u.owner === 3 || u.guard) && dist(u.x, u.y, u.home.x, u.home.y) > (u.owner === 3 ? 9 : 14) && u.owner !== 1) { u.state = 'idle'; u.target = null; u.guard = false; moveTo(u, goalPoint(u.home.x, u.home.y)); return; }
  const range = D.range + (D.missile === 'arrow' && P(u.owner).techs.has('fletching') ? 1 : 0), d = edgeDist(u, t);
  if (d <= range + (t.kind === 'unit' ? .35 : .15)) {
    u.path = null; u.moving = false; u.charging = false; const c = center(t); const sdx = (c.x - u.x) - (c.y - u.y); if (Math.abs(sdx) > .05) u.face = sdx > 0 ? 1 : -1;
    if (u.cd <= 0) {
      let cd = D.cd; if (u.t === 'dragon' && G.flags.drowsy) cd *= 2.2;
      u.cd = cd; u.swing = .25;
      if (D.missile) { fire(u, t, D.missile); SND && SND.shoot(D.missile); }
      else { let dmg = damageFor(u, t); if (u.t === 'dragon' && G.flags.drowsy) dmg *= .5; hit(u, t, dmg); SND && SND.clash(u); }
    }
  } else {
    if (D.charge && d > 2.5 && d < 7) u.charging = true;
    const c = center(t);
    if (!u.path || G.time - u.pathT > (d < 4 ? .4 : 1.2)) moveTo(u, t.kind === 'bld' ? goalNear(t) : goalPoint(c.x, c.y));
    if (!followPath(u, dt) && d > range + 1.5 && G.time - u.pathT > .3) { /* stuck: give up after a while */ u.stuck = (u.stuck || 0) + dt; if (u.stuck > 3) { u.stuck = 0; u.state = 'idle'; u.target = null; } }
  }
  if (u.swing > 0) u.swing -= dt;
}
function adjacent(u, e) { return edgeDist(u, e) < 1.0; }
function stepGather(u, dt) {
  let r = G.byId.get(u.res);
  if (!r || r.dead || r.amount <= 0) { r = nearestRes(u.x, u.y, u.resT, 10, u.owner); if (!r) { if (u.carry && u.carry.amt) { u.state = 'return'; } else u.state = 'idle'; return; } u.res = r.id; u.path = null; }
  const type = resType(r.t);
  if (u.carry && u.carry.type !== type && u.carry.amt > 0) { u.state = 'return'; u.after = r.id; return; }
  if (!adjacent(u, r)) { if (!u.path || G.time - u.pathT > 3) { moveTo(u, goalNear(r)); if (!u.path) { /* unreachable: try another */ u.res = null; r.unreach = G.time; } } followPath(u, dt); return; }
  u.path = null; u.moving = false; u.working = type;
  const c = center(r), sdx = (c.x - u.x) - (c.y - u.y); if (Math.abs(sdx) > .05) u.face = sdx > 0 ? 1 : -1;
  if (!u.carry || u.carry.type !== type) u.carry = { type, amt: 0 };
  const g = Math.min(gatherRate(u, type) * dt, r.amount); u.carry.amt += g; r.amount -= g;
  if (r.amount <= 0) { const k = r.t; removeEnt(r); if (k === 'tree') fxBurst(c.x, c.y, '#6a4', 6); u.res = null; }
  if (u.carry.amt >= carryCap(u)) { u.state = 'return'; u.after = u.res; u.path = null; }
}
function stepReturn(u, dt) {
  if (!u.carry || u.carry.amt <= 0) { u.state = u.after ? 'gather' : 'idle'; u.res = u.after; return; }
  const d = nearestDrop(u, u.carry.type); if (!d) { u.state = 'idle'; return; }
  if (!adjacent(u, d)) { if (!u.path || G.time - u.pathT > 3) moveTo(u, goalNear(d)); followPath(u, dt); return; }
  P(u.owner).res[u.carry.type] += u.carry.amt; if (u.owner === 1 && G.R() < .3) SND && SND.drop();
  u.carry.amt = 0; u.path = null;
  if (u.farmAfter) { u.state = 'farm'; u.farm = u.farmAfter; u.farmAfter = null; return; }
  if (u.after && G.byId.get(u.after)) { u.state = 'gather'; u.res = u.after; } else if (u.resT) { u.state = 'gather'; u.res = null; } else u.state = 'idle';
}
function stepBuild(u, dt) {
  const b = G.byId.get(u.build);
  if (!b || b.dead) { u.state = 'idle'; return; }
  if (b.built >= 1 && b.hp >= b.maxHp) { u.state = 'idle'; afterBuild(u, b); return; }
  if (!adjacent(u, b)) { if (!u.path || G.time - u.pathT > 3) moveTo(u, goalNear(b)); followPath(u, dt); return; }
  u.path = null; u.moving = false; u.working = 'build';
  const c = center(b), sdx = (c.x - u.x) - (c.y - u.y); if (Math.abs(sdx) > .05) u.face = sdx > 0 ? 1 : -1;
  const D = BUILDINGS[b.t];
  if (b.built < 1) {
    const builders = G.ents.filter(x => x.kind === 'unit' && x.build === b.id && x.state === 'build').length || 1, rate = (1 / D.time) * (3 / (builders + 2));
    b.built = Math.min(1, b.built + rate * dt * (b.owner === 1 && G.opts.instant ? 60 : 1)); b.hp = Math.max(b.hp, b.maxHp * b.built);
    if (b.built >= 1) { b.hp = b.maxHp; recount(); if (b.owner === 1) { say(D.name + ' built.'); SND && SND.built(); } SCEN_EVENTS.onBuilt && SCEN_EVENTS.onBuilt(b); }
  } else { b.hp = Math.min(b.maxHp, b.hp + 15 * dt); P(u.owner).res.wood -= .02 * dt; }
}
function afterBuild(u, b) {
  const D = BUILDINGS[b.t];
  if (D.farm && !G.ents.some(x => x.farm === b.id && x !== u)) { order([u], 'farm', b); return; }
  if (D.drop && b.t === 'storehouse') { const r = nearestRes(u.x, u.y, 'tree', 6, u.owner) || nearestRes(u.x, u.y, 'gold', 6, u.owner); if (r) order([u], 'gather', r); return; }
  // help with any unfinished building nearby
  const other = G.ents.find(x => x.kind === 'bld' && x.owner === u.owner && x.built < 1 && dist(x.x, x.y, u.x, u.y) < 8); if (other) order([u], 'build', other);
}
function stepFarm(u, dt) {
  const f = G.byId.get(u.farm); if (!f || f.dead) { u.state = 'idle'; return; }
  if (f.built < 1) { order([u], 'build', f); return; }
  const inside = u.x >= f.x && u.x <= f.x + f.size && u.y >= f.y && u.y <= f.y + f.size;
  if (!inside) { if (!u.path || G.time - u.pathT > 3) moveTo(u, goalInside(f)); followPath(u, dt); if (!u.path && !inside) { u.x = f.x + .7; u.y = f.y + .7; } return; }
  u.path = null; u.moving = false; u.working = 'farm';
  // wander along the rows while working
  u.fx = (u.fx || 0) + dt; u.x = f.x + .5 + (Math.sin(u.fx * .35) * .5 + .5) * (f.size - 1); u.y = f.y + .5 + ((u.fx * .08) % 1) * (f.size - 1);
  if (!u.carry || u.carry.type !== 'food') u.carry = { type: 'food', amt: 0 };
  u.carry.amt += .52 * dt * (P(u.owner).techs.has('wheelbarrow') ? 1.1 : 1);
  if (u.carry.amt >= carryCap(u)) { u.state = 'return'; u.farmAfter = f.id; u.after = null; u.path = null; }
}
function separate(dt) {
  const us = G.ents.filter(e => e.kind === 'unit' && e.state !== 'farm');
  const n = G.n;
  for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
    const a = us[i], b = us[j], dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) > .7 || Math.abs(dy) > .7) continue;
    const d = Math.hypot(dx, dy) || .01, r = (UNITS[a.t].myth || UNITS[b.t].myth) ? .9 : .5; if (d >= r) continue;
    const push = (r - d) * .5 * Math.min(1, dt * 8), nx = dx / d, ny = dy / d;
    const am = a.moving && !b.moving ? .3 : 1, bm = b.moving && !a.moving ? .3 : 1;
    const ax = a.x - nx * push * am, ay = a.y - ny * push * am, bx = b.x + nx * push * bm, by = b.y + ny * push * bm;
    if (!G.block[Math.floor(ay) * n + Math.floor(ax)]) { a.x = ax; a.y = ay; }
    if (!G.block[Math.floor(by) * n + Math.floor(bx)]) { b.x = bx; b.y = by; }
  }
  for (const u of us) u.moving = false;
}

/* ---------- buildings ---------- */
function stepBld(b, dt) {
  const D = BUILDINGS[b.t]; if (b.built < 1) return;
  b.cd = Math.max(0, b.cd - dt);
  if (D.atk && b.owner && b.cd <= 0) { const e = findEnemy({ x: b.x + b.size / 2, y: b.y + b.size / 2, owner: b.owner }, D.range + (P(b.owner).techs.has('fletching') ? 1 : 0) + b.size / 2, x => x.kind === 'unit'); if (e) { b.cd = D.cd; fire(b, e, 'arrow'); } }
  if (D.temple && b.owner) {
    b.favT = (b.favT || 0) + dt; if (b.favT > 3.5) { b.favT = 0; P(b.owner).res.favor = Math.min(200, P(b.owner).res.favor + 1); }
    for (const u of G.ents) if (u.kind === 'unit' && u.owner === b.owner && u.hp < u.maxHp && edgeDist(u, b) < 4) u.hp = Math.min(u.maxHp, u.hp + 1.5 * dt);
  }
  const q = b.queue[0]; if (!q) return;
  const p = P(b.owner);
  if (q.unit && p.pop > p.cap && q.t === 0) return;
  q.t += dt * (b.owner === 1 && G.opts.instant ? 40 : 1) * (b.owner === 2 ? (G.aiMul || 1) : 1);
  if (q.t >= q.total) {
    b.queue.shift();
    if (q.unit) {
      const spot = freeSpotNear(b); const u = addUnit(q.unit, b.owner, spot.x, spot.y);
      if (b.rally) { if (b.rally.res && UNITS[q.unit].civ) { const r = G.byId.get(b.rally.res); if (r) order([u], 'gather', r); else order([u], 'move', b.rally); } else order([u], 'move', b.rally); }
      if (b.owner === 1) SND && SND.ready(q.unit);
      recount();
    } else {
      const T = TECHS[q.tech]; p.researching.delete(q.tech); p.techs.add(q.tech);
      if (T.ageUp) { p.age = T.ageUp; if (b.owner === 1) { say('Welcome to the ' + AGES[p.age] + '!', 'gold'); SND && SND.fanfare(); } if (p.age === 2) for (const u of G.ents) if (u.kind === 'unit' && u.owner === b.owner && UNITS[u.t].hero) { u.maxHp *= 1.25; u.hp *= 1.25; } }
      else if (b.owner === 1) say(T.name + ' researched.');
    }
  }
}
function freeSpotNear(b) {
  const n = G.n; for (let r = 1; r < 8; r++) for (let k = 0; k < 40; k++) {
    const a = k / 40 * TAU, x = Math.floor(b.x + b.size / 2 + Math.cos(a) * (b.size / 2 + r)), y = Math.floor(b.y + b.size / 2 + Math.sin(a) * (b.size / 2 + r));
    if (x > 0 && y > 0 && x < n - 1 && y < n - 1 && !G.block[y * n + x]) return { x, y };
  }
  return { x: b.x, y: b.y + b.size };
}

/* ---------- fog of war ---------- */
function updateFog(force) {
  const n = G.n; G.vis.fill(0);
  for (const e of G.ents) {
    if (e.owner !== 1 || (e.kind !== 'unit' && e.kind !== 'bld')) continue;
    const D = D_(e), r = (D.sight || 3) + (e.kind === 'bld' ? e.size / 2 : 0), c = center(e);
    const x0 = Math.max(0, Math.floor(c.x - r)), x1 = Math.min(n - 1, Math.ceil(c.x + r)), y0 = Math.max(0, Math.floor(c.y - r)), y1 = Math.min(n - 1, Math.ceil(c.y + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x + .5 - c.x) ** 2 + (y + .5 - c.y) ** 2 <= r * r) { G.vis[y * n + x] = 1; G.exp[y * n + x] = 1; }
  }
  if (G.opts.reveal) { G.vis.fill(1); G.exp.fill(1); }
}

/* ---------- god powers ---------- */
function usePower(pid, id, x, y) {
  const W = POWERS[id], p = P(pid); if (p.res.favor < W.favor) return false;
  if (pid === 1 && !G.ents.some(e => e.kind === 'bld' && e.owner === 1 && e.t === 'temple' && e.built >= 1)) { say('Build a temple first.', 'warn'); return false; }
  p.res.favor -= W.favor;
  if (id === 'bolt') { G.fx.push({ k: 'bolt', x, y, t: 0, life: .7 }); SND && SND.thunder(); for (const e of G.ents.slice()) if ((e.kind === 'unit' || e.kind === 'bld') && e.owner !== pid && e.owner !== 0 && edgeDist({ x, y }, e) < W.radius) hit({ kind: 'unit', t: 'perseus', owner: pid, id: -1 }, e, W.dmg * (e.kind === 'bld' ? .5 : 1)); }
  if (id === 'aegis') { G.aegisT = 12; say('Athena\'s aegis shields your army!', 'gold'); SND && SND.fanfare(); }
  if (id === 'harvest') { p.res.food += 250; say('Demeter blesses the harvest: +250 food.', 'gold'); }
  if (!['bolt', 'aegis', 'harvest', 'wave'].includes(id)) { extraPower(pid, id, x, y); return true; }
  if (id === 'wave') { G.fx.push({ k: 'wave', x, y, t: 0, life: 1.2 }); SND && SND.wave(); for (const e of G.ents.slice()) if (e.kind === 'unit' && e.owner !== pid && e.owner !== 0 && dist(e.x, e.y, x, y) < W.radius) { const a = Math.atan2(e.y - y, e.x - x); const nx = e.x + Math.cos(a) * 2.5, ny = e.y + Math.sin(a) * 2.5; if (!G.block[Math.floor(ny) * G.n + Math.floor(nx)]) { e.x = nx; e.y = ny; } hit({ kind: 'unit', t: 'perseus', owner: pid, id: -1 }, e, W.dmg); } }
  return true;
}

/* ---------- enemy AI (player 2) ---------- */
function stepAI(dt) {
  G.aiT -= dt; if (G.aiT > 0) return; G.aiT = 2;
  const me = P(2), sk = !!G.scen.skirmish, diff = G.opts.diff || 1;
  const mine = G.ents.filter(e => e.owner === 2);
  const agora = mine.find(e => e.kind === 'bld' && (e.t === 'agora' || e.t === 'palace' || e.t === 'ruin'));
  const blds = mine.filter(e => e.kind === 'bld'), units = mine.filter(e => e.kind === 'unit');
  const vills = units.filter(u => u.t === 'villager'), army = units.filter(u => !UNITS[u.t].civ);
  // campaign cities get a steady income instead of running a full economy
  if (!sk) { me.res.food += 14 * diff; me.res.gold += 7 * diff; me.res.wood += 10 * diff; }
  if (!agora && !blds.length) return;
  // economy (skirmish): keep villagers busy
  if (sk) {
    // split the villagers roughly half on food, a third on wood, the rest on gold
    const on = { food: 0, wood: 0, gold: 0 }; for (const v of vills) { const k = v.state === 'farm' ? 'food' : v.resT ? resType(v.resT) : null; if (k) on[k]++; }
    const share = { food: .48, wood: .32, gold: .2 };
    for (const v of vills) {
      if (v.state !== 'idle') continue;
      const need = Object.keys(share).sort((a, b) => on[a] / vills.length - share[a] - (on[b] / vills.length - share[b]))[0];
      on[need]++;
      if (need === 'food') {
        const r = nearestRes(v.x, v.y, 'berry', 16), farm = blds.find(b => b.t === 'farm' && b.built >= 1 && !G.ents.some(x => x.farm === b.id && !x.dead));
        if (r) order([v], 'gather', r); else if (farm) order([v], 'farm', farm); else { const t = nearestRes(v.x, v.y, 'tree', 30); if (t) order([v], 'gather', t); }
      } else { const r = nearestRes(v.x, v.y, need === 'wood' ? 'tree' : 'gold', 40) || nearestRes(v.x, v.y, 'tree', 40); if (r) order([v], 'gather', r); }
    }
    const target = Math.min(28, 8 + Math.floor(G.time / 25));
    if (agora && agora.built >= 1 && vills.length < target && agora.queue.length < 2) queueTrain(agora, 'villager');
    // build: houses, then barracks, storehouse, farms, range, stable, temple, towers
    const want = [];
    if (me.cap - me.pop < 4 && me.cap < 120) want.push('house');
    const count = t => blds.filter(b => b.t === t).length;
    if (count('barracks') < 1 && G.time > 60) want.push('barracks');
    if (count('storehouse') < 1 && G.time > 90) want.push('storehouse');
    if (count('farm') < Math.min(14, Math.ceil(vills.length * .45)) && !nearestRes(agora ? agora.x : 0, agora ? agora.y : 0, 'berry', 14)) want.push('farm');
    if (me.age >= 1 && count('range') < 1) want.push('range');
    if (me.age >= 1 && count('stable') < 1 && G.time > 420) want.push('stable');
    if (me.age >= 1 && count('temple') < 1 && G.time > 500) want.push('temple');
    if (me.age >= 1 && count('tower') < 3 && G.time > 600) want.push('tower');
    if (me.age === 0 && G.time > 240 && agora && !agora.queue.some(q => q.tech)) queueTech(agora, 'age1');
    if (me.age === 1 && G.time > 780 && agora && !agora.queue.some(q => q.tech)) queueTech(agora, 'age2');
    const builder = vills.find(v => v.state === 'gather' && v.resT !== 'gold') || vills[0];
    if (want.length && builder && agora && !blds.some(b => b.built < 1)) {
      const t = want[0], D = BUILDINGS[t];
      if (canAfford(2, D.cost)) for (let k = 0; k < 40; k++) { const a = G.R() * TAU, r = 4 + G.R() * 8, x = Math.round(agora.x + 1 + Math.cos(a) * r), y = Math.round(agora.y + 1 + Math.sin(a) * r); if (canPlace(t, x, y, 2)) { placeBuilding(2, t, x, y, [builder]); break; } }
    }
  }
  // military production
  const cap = sk ? 120 : Math.min(60, 10 + Math.floor(G.time / 30)) * diff;
  if (army.length < cap) for (const b of blds) {
    if (b.built < 1 || b.queue.length >= 2) continue;
    const opts = (BUILDINGS[b.t].trains || []).filter(t => t !== 'villager' && (UNITS[t].age || 0) <= me.age);
    if (b.t === 'palace' || b.t === 'ruin') opts.push('hoplite');
    if (opts.length) { const t = opts[Math.floor(G.R() * opts.length)]; if (!sk && me.pop >= me.cap) me.cap += 5; queueTrain(b, t); }
  }
  // defend: anything of ours under attack recently pulls nearby soldiers
  const hurt = blds.concat(units).find(e => G.time - e.lastHit < 4 && G.byId.get(e.hitBy));
  if (hurt) { const foe = G.byId.get(hurt.hitBy); for (const s of army) if (s.state === 'idle' && dist(s.x, s.y, hurt.x, hurt.y) < 16) { s.state = 'attack'; s.target = foe.id; } }
  // attack waves
  G.waveT += 2;
  const firstWave = (sk ? 480 : 240) / diff, gap = (sk ? 200 : 170) / diff;
  if (G.waveT > (G.wave === 0 ? firstWave : gap)) {
    const idle = army.filter(s => s.state === 'idle' && !s.keepHome);
    const need = Math.min(30, 4 + G.wave * 3);
    if (idle.length >= need || (G.waveT > firstWave + 200 && idle.length >= 3)) {
      G.waveT = 0; G.wave++;
      const targets = G.ents.filter(e => e.owner === 1 && e.kind === 'bld'), tgt = targets.length ? targets[Math.floor(G.R() * targets.length)] : G.ents.find(e => e.owner === 1);
      if (tgt) { const c = center(tgt); order(idle, 'move', c, { attackMove: true }); if (G.wave > 0) say('An enemy army is marching on your city!', 'warn'); }
    }
  }
}

/* ---------- messages and effects ---------- */
function say(text, kind) { G.msgs.push({ text, kind: kind || '', t: G.time }); if (G.msgs.length > 6) G.msgs.shift(); if (window.UI) UI.toast(text, kind); }
function fxBurst(x, y, col, n) { for (let i = 0; i < n; i++) G.fx.push({ k: 'p', x, y, z: .4, vx: (G.R() - .5) * 3, vy: (G.R() - .5) * 3, vz: 2 + G.R() * 3, t: 0, life: .6 + G.R() * .4, col }); }
function fxText(x, y, text, col) { G.fx.push({ k: 'txt', x, y, z: 1.2, t: 0, life: 1, text, col }); }
function stepFx(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.t += dt; if (f.t > f.life) { G.fx.splice(i, 1); continue; } if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vz -= 9 * dt; f.z = Math.max(0, f.z + f.vz * dt); } if (f.k === 'txt') f.z += dt; }
}

/* ---------- main step ---------- */
function step(dt) {
  if (G.state !== 'play') return;
  G.time += dt; G.aegisT = Math.max(0, G.aegisT - dt); G.furyT = Math.max(0, (G.furyT || 0) - dt); G.swiftT = Math.max(0, (G.swiftT || 0) - dt);
  for (const e of G.ents.slice()) { if (e.dead) continue; if (e.kind === 'unit') stepUnit(e, dt); else if (e.kind === 'bld') stepBld(e, dt); }
  separate(dt); stepMissiles(dt); stepFx(dt);
  stepAI(dt);
  G.fogT -= dt; if (G.fogT <= 0) { G.fogT = .25; updateFog(); }
  if (SCEN_TICK[G.scen.id]) SCEN_TICK[G.scen.id](G, dt); else SCEN_TICK.skirmish(G, dt);
}
function objective(id, done) { const o = G.objectives.find(x => x.id === id); if (o && !o.done && done) { o.done = true; say('Objective complete: ' + o.text.replace(/^Optional: /, ''), 'gold'); SND && SND.fanfare(); } }
function checkWin() {
  if (G.state !== 'play') return;
  if (G.objectives.filter(o => o.main).every(o => o.done)) { G.state = 'won'; UI && UI.end(true); }
}
function lose(why) { if (G.state !== 'play') return; G.state = 'lost'; G.loseWhy = why; UI && UI.end(false, why); }
const SCEN_EVENTS = {};
