'use strict';
/* ---------- utilities ---------- */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapAngle = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % 9973 + 7; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), u), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), u), v);
}
function fbm(x, y, s, o) { let a = 0, amp = .5, f = 1; for (let i = 0; i < (o || 4); i++) { a += amp * vnoise(x * f, y * f, s + i * 17); amp *= .5; f *= 2; } return a; }
const fmtTime = t => { if (!isFinite(t)) return '--:--.---'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3); };
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

const CHARACTERS = [
  { id: 'fox', name: 'Miso', kind: 'Fox', fur: 0xf2843a, snout: 0xfff3e2, ear: 'point', car: 0xff5a3c, trim: 0xfff1d6 },
  { id: 'hare', name: 'Juniper', kind: 'Hare', fur: 0xe9dfd2, snout: 0xffffff, ear: 'long', car: 0x9b6fe0, trim: 0xffe066 },
  { id: 'bear', name: 'Bram', kind: 'Bear', fur: 0x8a5a3a, snout: 0xe3c29a, ear: 'round', car: 0x2f9e4f, trim: 0xfff1d6 },
  { id: 'cat', name: 'Suki', kind: 'Cat', fur: 0xfafafa, snout: 0xffd9e2, ear: 'point', car: 0xff7fb0, trim: 0xffffff },
  { id: 'owl', name: 'Wren', kind: 'Owl', fur: 0xa9825c, snout: 0xf6b632, ear: 'tuft', car: 0xf6b632, trim: 0x5a3d2b },
  { id: 'penguin', name: 'Pip', kind: 'Penguin', fur: 0x2b3142, snout: 0xffa23a, ear: 'none', car: 0x29b6f6, trim: 0xffffff },
  { id: 'frog', name: 'Tango', kind: 'Frog', fur: 0x62c654, snout: 0xc9f29a, ear: 'eyes', car: 0xb7e23a, trim: 0x1f6a3a },
  { id: 'wolf', name: 'Nova', kind: 'Wolf', fur: 0x8f9bb0, snout: 0xe8eef7, ear: 'point', car: 0x2f4fd6, trim: 0x9fe8ff },
  { id: 'raccoon', name: 'Jimothy', kind: 'Raccoon', fur: 0x8d8f96, snout: 0xf6f4ee, ear: 'mask', car: 0x12b5a6, trim: 0xffe066 },
];
const CLASSES = {
  easy: { name: 'Cruiser', top: 42, acc: 12.5, gears: 5 },
  medium: { name: 'Sport', top: 60, acc: 16, gears: 6 },
  hard: { name: 'Formula', top: 91, acc: 23, gears: 8 },
};
var A_LAT = 30;         // cornering grip (m/s^2), identical for every car
const KMH = 3.8;        // display scale so the top class reads ~345 km/h
const HW = 12.5;        // road half-width

/* ---------- circuits registry: TR(id, name, real-world inspiration, world, length, points, overrides) ---------- */
const TRACKS = [];
function TR(id, name, real, world, length, pts, over) {
  const th = THEMES[world]; if (!th) throw new Error('no world ' + world);
  TRACKS.push(Object.assign({}, th, over || {}, { id, name, real, worldKey: world, length, pts, seed: strHash(id), hw: HW }));
}

/* ---------- track builder ---------- */
function buildTrack(def, reverse) {
  let P = def.pts.map(p => p.slice());
  if (reverse) P = [P[0]].concat(P.slice(1).reverse());
  const hs = def.hs || 1.4;
  const mk = k => { const c = new THREE.CatmullRomCurve3(P.map(p => new THREE.Vector3(p[0] * k, p[2] * hs, -p[1] * k)), true, 'centripetal'); c.arcLengthDivisions = 4000; return c; };
  let c = mk(1); const k = def.length / c.getLength(); c = mk(k);
  const L = c.getLength(), N = Math.round(L / 3), ds = L / N, sp = c.getSpacedPoints(N);
  const F = () => new Float32Array(N);
  const T = { def, N, L, ds, k, hw: def.hw, px: F(), py: F(), pz: F(), tx: F(), tz: F(), rx: F(), rz: F(), th: F(), kap: F(), kapS: F(), slope: F(), wall: F(), bridge: new Uint8Array(N), under: new Uint8Array(N) };
  for (let i = 0; i < N; i++) { T.px[i] = sp[i].x; T.py[i] = sp[i].y; T.pz[i] = sp[i].z; }
  const sm = (arr, w, passes) => { for (let p = 0; p < passes; p++) { const o = Float32Array.from(arr); for (let i = 0; i < N; i++) { let s = 0; for (let j = -w; j <= w; j++) s += o[(i + j + N) % N]; arr[i] = s / (2 * w + 1); } } };
  { const wv = def.wave === undefined ? 6 : def.wave, r = rng(def.seed * 3 + 1), a = r() * TAU, b = r() * TAU, cph = r() * TAU; for (let i = 0; i < N; i++) { const f = i / N * TAU; T.py[i] += wv * (Math.sin(2 * f + a) * .5 + Math.sin(3 * f + b) * .32 + Math.sin(5 * f + cph) * .2 + 1); } }
  sm(T.py, 6, 3);
  // keep gradients drivable: cap the steepest slope
  let ms = 0; for (let i = 0; i < N; i++) ms = Math.max(ms, Math.abs(T.py[(i + 1) % N] - T.py[(i + N - 1) % N]) / (2 * ds));
  const cap = def.maxSlope || .2; if (ms > cap) { let mn = 1e9; for (let i = 0; i < N; i++) mn = Math.min(mn, T.py[i]); for (let i = 0; i < N; i++) T.py[i] = mn + (T.py[i] - mn) * cap / ms; }
  for (let i = 0; i < N; i++) {
    const a = (i + N - 1) % N, b = (i + 1) % N;
    let dx = T.px[b] - T.px[a], dz = T.pz[b] - T.pz[a]; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    T.tx[i] = dx; T.tz[i] = dz; T.rx[i] = -dz; T.rz[i] = dx; T.th[i] = Math.atan2(dx, dz);
    T.slope[i] = (T.py[b] - T.py[a]) / (2 * ds);
  }
  for (let i = 0; i < N; i++) { const a = (i + N - 1) % N, b = (i + 1) % N; T.kap[i] = -wrapAngle(T.th[b] - T.th[a]) / (2 * ds); T.kapS[i] = T.kap[i]; }
  sm(T.kapS, 4, 2);
  // bridge detection: where the circuit crosses itself, the higher road becomes a bridge
  const core = new Uint8Array(N), low = new Uint8Array(N), R2 = (T.hw * 2 + 5) ** 2; T.clash = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const g = Math.abs(i - j); if (Math.min(g, N - g) < 50) continue;
    const dx = T.px[i] - T.px[j], dz = T.pz[i] - T.pz[j], d2 = dx * dx + dz * dz;
    if (d2 < R2) { if (T.py[i] > T.py[j] + 7) { core[i] = 1; low[j] = 1; } else if (Math.abs(T.py[i] - T.py[j]) <= 7) T.clash++; }
  }
  const distTo = (flags) => { const d = new Float32Array(N).fill(1e6); for (let i = 0; i < N; i++) if (flags[i]) for (let j = -30; j <= 30; j++) { const q = (i + j + N) % N; d[q] = Math.min(d[q], Math.abs(j)); } return d; };
  const dc = distTo(core), dl = distTo(low);
  T.hasBridge = false;
  for (let i = 0; i < N; i++) {
    T.bridge[i] = dc[i] <= 10 ? 1 : 0; T.under[i] = dl[i] <= 10 ? 1 : 0; if (T.bridge[i]) T.hasBridge = true;
    T.wall[i] = T.hw + 0.7 + 11.3 * smooth(10, 24, dc[i]);
  }
  T.minX = T.minZ = T.minY = 1e9; T.maxX = T.maxZ = T.maxY = -1e9; let sy = 0;
  for (let i = 0; i < N; i++) { T.minX = Math.min(T.minX, T.px[i]); T.maxX = Math.max(T.maxX, T.px[i]); T.minZ = Math.min(T.minZ, T.pz[i]); T.maxZ = Math.max(T.maxZ, T.pz[i]); T.minY = Math.min(T.minY, T.py[i]); T.maxY = Math.max(T.maxY, T.py[i]); sy += T.py[i]; }
  T.avgY = sy / N; T.wy = T.minY - (def.waterDrop || 2.6);
  T.dist = (x, z) => { let m = 1e12; for (let i = 0; i < N; i += 2) { const dx = x - T.px[i], dz = z - T.pz[i], d = dx * dx + dz * dz; if (d < m) m = d; } return Math.sqrt(m); };
  T.at = (frac) => ((Math.floor(frac * N) % N) + N) % N;
  // corners, numbered from the start line
  const sg = new Int8Array(N), thr = 1 / 240;
  for (let i = 0; i < N; i++) sg[i] = Math.abs(T.kapS[i]) > thr ? Math.sign(T.kapS[i]) : 0;
  for (let i = 0; i < N; i++) if (!sg[i]) { let a = 0, b = 0; for (let q = 1; q <= 5; q++) { if (!a) a = sg[(i - q + N) % N]; if (!b) b = sg[(i + q) % N]; } if (a && a === b) sg[i] = a; }
  let s0 = 0; while (s0 < N && sg[s0]) s0++; if (s0 === N) s0 = 0;
  T.corners = [];
  for (let q = 0; q < N;) {
    const i = (s0 + q) % N; if (!sg[i]) { q++; continue; }
    let e = q, ang = 0, km = 0, apex = i; while (e < N && sg[(s0 + e) % N] === sg[i]) { const j = (s0 + e) % N, kk = Math.abs(T.kapS[j]); ang += kk * ds; if (kk > km) { km = kk; apex = j; } e++; }
    if (ang > .32) T.corners.push({ a: i, b: (s0 + e - 1) % N, apex, dir: sg[i], r: 1 / km, ang }); q = e;
  }
  T.corners.sort((a, b) => a.a - b.a); T.corners.forEach((c, i) => c.n = i + 1);
  // ideal racing line: an elastic band pulled tight inside the road edges
  const ln = new Float32Array(N), lim = i => Math.min(T.hw - 2.8, T.wall[i] - 3.4), K = 7;
  for (let it = 0; it < 90; it++) for (let i = 0; i < N; i++) {
    const p = (i - K + N) % N, q = (i + K) % N, mx = (T.px[p] + T.rx[p] * ln[p] + T.px[q] + T.rx[q] * ln[q]) / 2 - T.px[i] - T.rx[i] * ln[i], mz = (T.pz[p] + T.rz[p] * ln[p] + T.pz[q] + T.rz[q] * ln[q]) / 2 - T.pz[i] - T.rz[i] * ln[i];
    ln[i] = clamp(ln[i] + .6 * (mx * T.rx[i] + mz * T.rz[i]), -lim(i), lim(i));
  }
  sm(ln, 3, 2); T.line = ln; T.lineK = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = (i - 3 + N) % N, b = (i + 3) % N, X = j => T.px[j] + T.rx[j] * ln[j], Z = j => T.pz[j] + T.rz[j] * ln[j]; T.lineK[i] = Math.abs(wrapAngle(Math.atan2(X(b) - X(i), Z(b) - Z(i)) - Math.atan2(X(i) - X(a), Z(i) - Z(a)))) / (3 * ds); }
  sm(T.lineK, 3, 2);
  return T;
}

/* speed limit profile along the lap for a given grip use, top speed and braking */
function speedProfile(T, top, aLat, brake, kap) {
  const N = T.N, v = new Float32Array(N); kap = kap || T.kapS;
  for (let i = 0; i < N; i++) v[i] = Math.min(top, Math.sqrt(aLat / Math.max(Math.abs(kap[i]), 1e-5)));
  for (let p = 0; p < 2; p++) for (let i = N - 1; i >= 0; i--) { const n = (i + 1) % N; v[i] = Math.min(v[i], Math.sqrt(v[n] * v[n] + 2 * brake * T.ds)); }
  return v;
}
function lapEstimate(T, cls) { const v = speedProfile(T, cls.top, A_LAT * .8, 30); let t = 0; for (let i = 0; i < T.N; i++) t += T.ds / v[i]; return t * 1.1; }

/* ---------- worlds ----------
   Each world is a palette + vegetation + a list of landmarks that are placed automatically around whatever circuit uses it.
   tree spec: [type, weight, colours, trunk]; colours are a list of hex values or an {h,s,l} range for continuous variation. */
const THEMES = {};
const AUT = { h: [0.0, 0.155], s: [.72, .96], l: [.4, .6] };      // every shade from deep red through orange to yellow
const BASE = {
  world: 'Meadow', accent: '#7ccf6a', music: 'summer',
  sky: { top: 0x1877e0, hor: 0xb8e6ff, bot: 0x9fd9b0, cloud: 0xffffff, cloudAmt: .4 },
  sun: { dir: [-0.35, 0.82, 0.3], color: 0xfffbe8, int: 1.1 }, amb: { sky: 0xd8f0ff, ground: 0x7fb26a, int: 0.72 },
  fog: { color: 0xc8ecff, density: 0.0004 },
  ground: [0x2f8a3e, 0x48a044, 0x8fbc45], rock: 0xa49a84, sand: 0xf0e0a6, curb: [0xe53935, 0xffffff], roadTint: 0xffffff,
  water: { color: 0x1fa3d8, opacity: .84, spec: 0xffffff }, lakes: 2,
  hills: { amp: 18, freq: 0.0055 }, rise: 95, mountain: [0x3f8f6a, 0xdff3e0], mtnH: 1,
  trees: [['round', 60, [0x2f9e4f, 0x45b85c, 0x1f8a4c, 0x7ccf4a], 0x6b4a32], ['pine', 15, [0x2f6d45], 0x5a4030]],
  roadside: ['round', [0x2f9e4f, 0x45b85c], 0x6b4a32, .6], forest: .44, nTrees: 1,
  fill: { n: 5000, shape: 'blob', colors: [0x2f9e4f, 0x45b85c, 0x1f8a4c, 0x3da850] },
  flowers: [0xffd23d, 0xff7a3d, 0xff4f81, 0xffffff, 0x7a5cff], grass: 0x36a046, nFlowers: 1,
  particles: { n: 600, size: .28, colors: [0xfff6b0, 0xffffff], fall: -.2, sway: 1.2, wind: [.5, .2], round: true },
  clouds: 26, props: [], floaters: ['balloon', 4], birds: 3, boats: 0,
};
const world = (key, base, o) => { THEMES[key] = Object.assign({}, typeof base === 'string' ? THEMES[base] : base, o); };

/* --- the four seasons --- */
world('sakura', BASE, {
  world: 'Cherry Blossom Japan', accent: '#ff8fbd', music: 'spring',
  sky: { top: 0x4f9fee, hor: 0xffdbe9, bot: 0xcfe6c4, cloud: 0xffffff, cloudAmt: .55 }, sun: { dir: [0.5, 0.6, 0.38], color: 0xfff0dc, int: 1.0 }, amb: { sky: 0xe6eeff, ground: 0x9dbb86, int: 0.74 },
  fog: { color: 0xf5dde8, density: 0.00046 }, ground: [0x63b25a, 0x7fc468, 0xeba9c4], rock: 0x9c978c, sand: 0xe8d9aa, curb: [0xff6fa5, 0xffffff],
  water: { color: 0x57bcd4, opacity: .86, spec: 0xffffff }, mountain: [0x6f93b8, 0xf4f8ff],
  trees: [['round', 62, [0xffb3d1, 0xff9ac4, 0xffcfe4, 0xfff0f6, 0xf88db4], 0x4a3328], ['round', 14, [0x6fc36a, 0x8fd67a, 0x58b565], 0x6b4a32], ['pine', 6, [0x3f8f58], 0x5a4030]],
  roadside: ['round', [0xffb3d1, 0xff9ac4, 0xffcfe4, 0xfff0f6], 0x4a3328, .85], forest: .36, nTrees: 1.3,
  fill: { n: 6000, shape: 'blob', colors: [0xffb3d1, 0xff9ac4, 0xffcfe4, 0xf7a8c8, 0x7cc673, 0xfde4ee] },
  flowers: [0xff7fb0, 0xffffff, 0xffe066, 0xc8a2ff, 0xff5a5f], grass: 0x5fb85a,
  particles: { n: 1500, size: .5, colors: [0xffc4dc, 0xffffff, 0xff9ec7], fall: 1.5, sway: 1.6, wind: [1.2, .5] },
  props: [['ferris', 1], ['arch', 3, 'torii'], ['pagoda', 2], ['lanterns', 1, [0xff5a7a, 0xffffff, 0xffb347]]], floaters: ['balloon', 5],
});
world('fuji', 'sakura', {
  world: 'Dawn under the Volcano', sky: { top: 0x6a8fe0, hor: 0xffc9b8, bot: 0xd9c8d8, cloud: 0xffe6dc, cloudAmt: .5 }, sun: { dir: [0.7, 0.3, -0.3], color: 0xffd9b8, int: 1.0 },
  fog: { color: 0xf7d6cf, density: 0.00042 }, props: [['peak', 1, 'fuji'], ['arch', 2, 'torii'], ['pagoda', 2], ['lanterns', 1, [0xff5a7a, 0xffffff]]], lakes: 3,
});
world('tropic', BASE, {
  world: 'Tropical Lakeside', accent: '#ffc928', music: 'summer', curb: [0xffc928, 0x1e88e5],
  trees: [['round', 40, [0x2f9e4f, 0x45b85c, 0x1f8a4c, 0x7ccf4a], 0x6b4a32], ['round', 14, [0x9b6fe0, 0xff6a3d, 0xffd23d, 0xff5fa2], 0x5a4030], ['cypress', 8, [0x1f7a4a, 0x2a8a55], 0x5a4030], ['palm', 18, [0x3fae4c, 0x58c05a], 0x9a7a52], ['giant', 6, [0x23803f, 0x2f9e4f], 0x5a4030]],
  roadside: ['palm', [0x3fae4c, 0x58c05a], 0x9a7a52, .6], forest: .38, nTrees: 1.3, fill: { n: 7000, shape: 'blob', colors: [0x2f9e4f, 0x45b85c, 0x1f8a4c, 0x3da850, 0x6cc04a] },
  props: [['village', 2, 'pastel']], floaters: ['balloon', 6], birds: 4, boats: 7,
});
world('autumn', BASE, {
  world: 'Autumn Forest', accent: '#ff9a3d', music: 'autumn',
  sky: { top: 0x4a6fc4, hor: 0xffc581, bot: 0xb98a5a, cloud: 0xffd9b0, cloudAmt: .6 }, sun: { dir: [-0.72, 0.3, -0.42], color: 0xffc98a, int: 1.1 }, amb: { sky: 0xffe2c4, ground: 0xa07a50, int: 0.7 },
  fog: { color: 0xf7c998, density: 0.00052 }, ground: [0x9fb04a, 0xc2a83e, 0xd9772e], rock: 0x8d8478, sand: 0xd9c58e, curb: [0xf08a24, 0xfff5e0], roadTint: 0xfff4e6,
  water: { color: 0x3d8fb5, opacity: .86, spec: 0xffe0b0 }, hills: { amp: 24, freq: 0.0055 }, rise: 130, mountain: [0x7a5f86, 0xffe9d6],
  trees: [['round', 70, AUT, 0x4f3a2a], ['tall', 12, AUT, 0x4f3a2a], ['giant', 8, AUT, 0x4f3a2a], ['pine', 7, [0x2f5d3a, 0x3a6b42], 0x4f3a2a]],
  roadside: ['round', AUT, 0x4f3a2a, 1], forest: .05, nTrees: 2.1, fill: { n: 15000, shape: 'blob', colors: AUT },
  flowers: [0xf6b632, 0xe8552d, 0x8b3fa0, 0xffffff, 0xd9302b], grass: 0x9a9a3e,
  particles: { n: 1500, size: .62, colors: [0xe8552d, 0xf6b632, 0xc93a2b, 0xf08a24, 0xffd23d], fall: 2.0, sway: 2.2, wind: [2.2, .8] },
  props: [['cabin', 6, [0xb5372e, 0x7a3b2e, 0x3d6b52]], ['hay', 1]], floaters: ['balloon', 6], birds: 4,
});
world('maple', 'autumn', {
  world: 'Maple Lakes', accent: '#ff6b4a', sky: { top: 0x2f7fe0, hor: 0xcfe8ff, bot: 0xb5a58a, cloud: 0xffffff, cloudAmt: .45 }, sun: { dir: [0.4, 0.7, 0.35], color: 0xfff4e0, int: 1.1 }, amb: { sky: 0xe6f2ff, ground: 0xb07a50, int: 0.72 },
  fog: { color: 0xdcecf7, density: 0.00042 }, lakes: 4, mountain: [0x8a4a3a, 0xf4e9e0],
  trees: [['round', 70, { h: [0.0, 0.1], s: [.75, .96], l: [.4, .56] }, 0x4f3a2a], ['tall', 10, { h: [.1, .16], s: [.8, .95], l: [.5, .6] }, 0xe8e4da], ['pine', 14, [0x2f5d3a, 0x3a6b42], 0x4f3a2a]],
  fill: { n: 15000, shape: 'blob', colors: { h: [0.0, 0.13], s: [.75, .96], l: [.38, .58] } }, boats: 5,
});
world('momiji', 'autumn', {
  world: 'Maple Temple Garden', accent: '#ff5a4a', music: 'spring', fog: { color: 0xf2d2b8, density: 0.0006 }, curb: [0xd9302b, 0xffffff],
  props: [['arch', 4, 'torii'], ['pagoda', 3], ['lanterns', 1, [0xff8a3d, 0xffe066]]], lakes: 3, floaters: ['balloon', 0],
});
world('aurora', BASE, {
  world: 'Northern Lights', accent: '#6fe3c1', music: 'winter', night: true,
  sky: { top: 0x040a24, hor: 0x16405e, bot: 0x0a1830, cloud: 0x2a4a66, cloudAmt: .12, stars: 1, aurora: 1 }, sun: { dir: [0.4, 0.55, -0.5], color: 0xbfd6ff, int: 0.62 }, amb: { sky: 0x9fe0d8, ground: 0x566c9a, int: 0.84 },
  fog: { color: 0x14344f, density: 0.00042 }, ground: [0xeaf4ff, 0xd6e8fa, 0xc2dcf5], rock: 0x8292a8, sand: 0xdcecff, roadTint: 0xcfe0f5,
  water: { color: 0x7fc4dc, opacity: .93, spec: 0x9fffd8 }, lakes: 0, island: 100, hills: { amp: 9, freq: 0.008 }, rise: 0, mountain: [0x33507a, 0xeaf6ff], mtnH: 1.3,
  trees: [['pineSnow', 70, [0xf2f2f2], 0x4a3a30], ['round', 14, [0xe6f2ff, 0xd0e6fa, 0xf6fbff], 0xd8d8d0]], roadside: ['pineSnow', [0xf2f2f2], 0x4a3a30, .7], forest: .3, nTrees: 1.2,
  fill: { n: 2500, shape: 'cone', colors: [0xdfeaf5, 0xc8dcee, 0x9fc0d0] }, flowers: [0xbfe6ff, 0xe8f6ff, 0x9fd8ff], grass: 0xcfe2f5, nFlowers: .35,
  particles: { n: 1700, size: .34, colors: [0xffffff, 0xe6f4ff], fall: 3.2, sway: 1.0, wind: [1.5, .6], round: true }, clouds: 9,
  props: [['cabin', 7, [0xb5372e, 0x7a3b2e], 'snow'], ['lamps', 1, 0xffc878], ['snowmen', 14]], floaters: ['balloon', 0], birds: 0,
});
world('nordic', BASE, {
  world: 'Midnight Sun Fjord', accent: '#ffb37a', music: 'winter',
  sky: { top: 0x3f5fae, hor: 0xffb48a, bot: 0x6a6f9a, cloud: 0xffc9b0, cloudAmt: .5 }, sun: { dir: [0.8, 0.16, 0.3], color: 0xffb890, int: 1.05 }, amb: { sky: 0xdcd6ff, ground: 0x5f7a6a, int: 0.72 },
  fog: { color: 0xf0b89a, density: 0.0005 }, ground: [0x4f8f5a, 0x6aa060, 0x9aa870], curb: [0x1e63c8, 0xffe066], water: { color: 0x2f6f9a, opacity: .9, spec: 0xffc8a0 }, lakes: 5, hills: { amp: 26, freq: 0.006 }, rise: 150, mountain: [0x4a5f7a, 0xfff0e6], mtnH: 1.5,
  trees: [['pine', 80, [0x2f6d45, 0x3a7a50, 0x275a3c], 0x5a4030], ['tall', 14, [0xa8c860, 0xc8d870], 0xe8e4da]], roadside: ['pine', [0x2f6d45, 0x3a7a50], 0x5a4030, .9], forest: .12, nTrees: 1.8,
  fill: { n: 13000, shape: 'cone', colors: [0x2f6d45, 0x3a7a50, 0x275a3c, 0x44865a] }, props: [['cabin', 8, [0xb5372e, 0xc9462e]]], floaters: ['balloon', 2], boats: 6,
});
world('snowday', 'aurora', {
  world: 'Winter Palace', accent: '#8fd0ff', night: false, island: 0, lakes: 2,
  sky: { top: 0x3f8fe8, hor: 0xdff0ff, bot: 0xcfe4f5, cloud: 0xffffff, cloudAmt: .45 }, sun: { dir: [0.5, 0.5, 0.4], color: 0xfff6e8, int: 0.95 }, amb: { sky: 0xdcecff, ground: 0xa8b8d0, int: 0.62 },
  fog: { color: 0xe4f0fc, density: 0.0005 }, roadTint: 0xe6eef8, hills: { amp: 20, freq: 0.006 }, rise: 120, mtnH: 1.5, clouds: 22,
  fill: { n: 9000, shape: 'cone', colors: [0xeaf2fa, 0xd0e2f0, 0x8fb5a8, 0xf8fbff] }, forest: .2, nTrees: 1.6,
  props: [['domes', 1, 'onion'], ['cabin', 6, [0xb5372e, 0x2f6fb5], 'snow'], ['snowmen', 16], ['church', 1]], floaters: ['balloon', 4],
});

/* --- mountains and countryside --- */
world('alpine', BASE, {
  world: 'Alpine Meadows', accent: '#8fe36f', music: 'summer',
  sky: { top: 0x1f7fe8, hor: 0xcfeaff, bot: 0xa8d8a0, cloud: 0xffffff, cloudAmt: .35 }, ground: [0x43993f, 0x5aac48, 0x82bd4c], curb: [0xe53935, 0xffffff],
  hills: { amp: 30, freq: 0.006 }, rise: 190, mountain: [0x6f7f92, 0xffffff], mtnH: 1.6,
  trees: [['pine', 70, [0x2f6d45, 0x3a7a50, 0x275a3c], 0x5a4030], ['round', 20, [0x4fae4c, 0x6cc45a], 0x6b4a32]], roadside: ['pine', [0x2f6d45, 0x3a7a50], 0x5a4030, .5], forest: .5, nTrees: 1.2,
  fill: { n: 9000, shape: 'cone', colors: [0x2f6d45, 0x3a7a50, 0x275a3c] }, flowers: [0xffffff, 0xffe066, 0x7a8cff, 0xff7fb0, 0xff5a5f], nFlowers: 1.6,
  props: [['cabin', 9, [0x8a5a3a, 0x7a3b2e]], ['church', 1], ['herd', 5, 'cow'], ['peak', 1, 'horn']], floaters: ['balloon', 4], lakes: 2,
});
world('alpenglow', 'alpine', {
  world: 'Alpenglow', accent: '#ff9fb0', music: 'autumn', sky: { top: 0x5a5fb8, hor: 0xffb0a0, bot: 0x8a7a9a, cloud: 0xffc0b0, cloudAmt: .5 }, sun: { dir: [-0.8, 0.2, 0.3], color: 0xffb098, int: 1.05 }, amb: { sky: 0xe8d0ff, ground: 0x6f8f6a, int: 0.72 },
  fog: { color: 0xf2b8a8, density: 0.00045 }, mountain: [0x7a6f92, 0xffd0c8],
});
world('england', BASE, {
  world: 'Castles and Standing Stones', accent: '#9fd66a', music: 'spring',
  sky: { top: 0x4f8fd8, hor: 0xdfeaf2, bot: 0xa8c8a0, cloud: 0xffffff, cloudAmt: .75 }, sun: { dir: [0.3, 0.7, 0.5], color: 0xfff4e0, int: 1.0 }, fog: { color: 0xdce8ee, density: 0.00055 },
  ground: [0x418f3c, 0x52a044, 0x72b04c], curb: [0x1f5fbf, 0xffffff], hills: { amp: 20, freq: 0.006 }, rise: 80, mountain: [0x5f8f6a, 0xcfe6c8], mtnH: .6,
  trees: [['round', 60, [0x2f8f45, 0x3fa04f, 0x55b05a, 0x237a3c], 0x5a4030], ['giant', 12, [0x2f8f45, 0x3fa04f], 0x5a4030], ['tall', 12, [0x4fae4c, 0x6cc45a], 0x6b4a32]], roadside: ['round', [0x2f8f45, 0x3fa04f, 0x55b05a], 0x5a4030, .7], forest: .42, nTrees: 1.4,
  fill: { n: 7000, shape: 'blob', colors: [0x2f8f45, 0x3fa04f, 0x55b05a, 0x237a3c] }, clouds: 40,
  props: [['castle', 1], ['stonehenge', 1], ['herd', 6, 'sheep'], ['village', 2, 'stone'], ['church', 1]], floaters: ['balloon', 3],
});
world('bluebell', 'england', {
  world: 'Bluebell Wood', accent: '#9f8fff', ground: [0x4fa648, 0x6a78d8, 0x8a6fe0], flowers: [0x7a6fff, 0x9f8fff, 0x5a5fd8, 0xffffff], nFlowers: 2.2, forest: .1, nTrees: 2,
  fill: { n: 13000, shape: 'blob', colors: [0x2f8f45, 0x3fa04f, 0x55b05a, 0x7cc66a] }, props: [['cabin', 5, [0x7a3b2e, 0x3d6b52]], ['herd', 4, 'deer'], ['village', 1, 'stone']], sky: { top: 0x4f8fd8, hor: 0xe6e8f8, bot: 0xa8b8d0, cloud: 0xffffff, cloudAmt: .5 },
});
world('greenhell', BASE, {
  world: 'Deep Green Forest', accent: '#4fd08a', music: 'autumn',
  sky: { top: 0x3f7fc8, hor: 0xd8ead8, bot: 0x8ab890, cloud: 0xf4f8f0, cloudAmt: .7 }, fog: { color: 0xcfe2d0, density: 0.0007 }, ground: [0x2f7a3a, 0x3f8f45, 0x5a9a48],
  hills: { amp: 30, freq: 0.006 }, rise: 150, mountain: [0x2f6a4a, 0xbfdcc0], mtnH: .8,
  trees: [['pine', 50, [0x1f5a38, 0x2a6a42, 0x1a4a30], 0x4a3a2a], ['round', 30, [0x2f8f45, 0x237a3c, 0x3fa04f], 0x4a3a2a], ['giant', 14, [0x237a3c, 0x2f8f45], 0x4a3a2a]],
  roadside: ['pine', [0x1f5a38, 0x2a6a42], 0x4a3a2a, 1], forest: .04, nTrees: 2.2, fill: { n: 16000, shape: 'cone', colors: [0x1f5a38, 0x2a6a42, 0x1a4a30, 0x2f7a45] },
  props: [['castle', 1], ['cabin', 5, [0x7a3b2e, 0x8a5a3a]], ['herd', 4, 'deer']], floaters: ['balloon', 2], clouds: 34,
});
world('orchard', 'england', {
  world: 'Apple Blossom Valley', accent: '#ffc4d8', trees: [['round', 50, [0xffffff, 0xffe6ee, 0xffd0e0, 0xf6f6ee], 0x5a4030], ['round', 30, [0x3fa04f, 0x55b05a], 0x5a4030], ['tall', 10, [0x4fae4c], 0x6b4a32]],
  roadside: ['round', [0xffffff, 0xffe6ee, 0xffd0e0], 0x5a4030, .85], fill: { n: 7000, shape: 'blob', colors: [0xffffff, 0xffe6ee, 0x3fa04f, 0x55b05a, 0xffd0e0] },
  particles: { n: 900, size: .42, colors: [0xffffff, 0xffe6ee], fall: 1.3, sway: 1.5, wind: [1, .4] }, props: [['village', 3, 'stone'], ['church', 1], ['herd', 5, 'cow'], ['windmill', 2]],
});
world('tulip', BASE, {
  world: 'Tulip Fields and Windmills', accent: '#ff5a8a', music: 'spring',
  sky: { top: 0x2f86e8, hor: 0xd8eeff, bot: 0xb8d8a0, cloud: 0xffffff, cloudAmt: .6 }, ground: [0x43963f, 0x54a548, 0x6cb24c], sand: 0xdccb98, curb: [0xff7a1a, 0xffffff],
  stripes: { colors: [0xff3b4f, 0xffd23d, 0xff7fb0, 0xffffff, 0x9b5fe0, 0xff8a1a], width: 15, amt: .62 }, hills: { amp: 12, freq: 0.006 }, rise: 30, mountain: [0x6f9fb8, 0xeaf6ff], mtnH: .35, sea: true, lakes: 1,
  trees: [['tall', 60, [0x4fae4c, 0x6cc45a, 0x3f9a45], 0x6b4a32], ['round', 20, [0x3fa04f, 0x55b05a], 0x5a4030]], roadside: ['tall', [0x4fae4c, 0x6cc45a], 0x6b4a32, .5], forest: .6, nTrees: .7, fill: { n: 1500, shape: 'blob', colors: [0x3fa04f, 0x55b05a] },
  flowers: [0xff3b4f, 0xffd23d, 0xff7fb0, 0xffffff, 0x9b5fe0], nFlowers: 2.2, props: [['windmill', 8], ['village', 2, 'dutch'], ['herd', 4, 'cow'], ['lighthouse', 1]], boats: 8, clouds: 36,
});
world('lavender', BASE, {
  world: 'Lavender Provence', accent: '#b48cff', music: 'summer',
  sky: { top: 0x2f7fe0, hor: 0xffe2c0, bot: 0xc8b890, cloud: 0xfff0e0, cloudAmt: .35 }, sun: { dir: [-0.6, 0.45, 0.4], color: 0xffe2b8, int: 1.1 }, fog: { color: 0xf4dcc0, density: 0.00042 },
  ground: [0x8faa50, 0xb8b060, 0xd8c070], curb: [0x8e5fe0, 0xffffff], stripes: { colors: [0x8e5fe0, 0x7a4fd0, 0xa878f0, 0x6f9a48], width: 13, amt: .7 }, hills: { amp: 20, freq: 0.006 }, rise: 90, mountain: [0x8f8fb8, 0xf4e9e0], mtnH: .8,
  trees: [['cypress', 40, [0x2f6d45, 0x275a3c], 0x5a4030], ['round', 30, [0x7a9a58, 0x8faa60, 0x5f8a48], 0x6b5a42], ['flat', 14, [0x2f7a45, 0x3a8a50], 0x6b4a32]], roadside: ['cypress', [0x2f6d45, 0x275a3c], 0x5a4030, .5], forest: .55, nTrees: .9,
  fill: { n: 3500, shape: 'blob', colors: [0x7a9a58, 0x5f8a48, 0x2f6d45] }, flowers: [0x8e5fe0, 0xffd23d, 0xff5a5f, 0xffffff], nFlowers: 1.8,
  props: [['castle', 1, 'chateau'], ['village', 3, 'provence'], ['church', 1], ['windmill', 2]], floaters: ['balloon', 7], birds: 4,
});
world('sunflower', 'lavender', { world: 'Sunflower Plains', accent: '#ffd23d', stripes: { colors: [0xffd23d, 0xf2b81f, 0x6f9a48, 0xffe066], width: 15, amt: .72 }, curb: [0xffd23d, 0x2f8a3e], sky: { top: 0x1f7fe8, hor: 0xd8eeff, bot: 0xc8d890, cloud: 0xffffff, cloudAmt: .4 }, sun: { dir: [0.3, 0.8, 0.3], color: 0xfffbe8, int: 1.1 }, fog: { color: 0xdcecf7, density: 0.0004 }, flowers: [0xffd23d, 0xffe066, 0xff8a1a, 0xffffff], props: [['village', 3, 'provence'], ['church', 2], ['windmill', 3], ['herd', 4, 'cow']] });
world('vineyard', 'lavender', { world: 'Vineyard Hills', accent: '#c9e86a', stripes: { colors: [0x4f8a38, 0x8fb850, 0x3f7a30, 0xb8c860], width: 9, amt: .75 }, curb: [0x7a1f3a, 0xffffff], props: [['castle', 2, 'chateau'], ['village', 2, 'provence'], ['church', 1]], hills: { amp: 26, freq: 0.006 } });
world('lamancha', BASE, {
  world: 'Windmills of the Plateau', accent: '#ffcf6a', music: 'desert',
  sky: { top: 0x1f6fe0, hor: 0xffe8c0, bot: 0xd8c090, cloud: 0xffffff, cloudAmt: .3 }, fog: { color: 0xf2e2c0, density: 0.00038 }, ground: [0xd8b860, 0xc8a850, 0xa8a850], rock: 0xb89a70, curb: [0xd9302b, 0xffd23d],
  hills: { amp: 22, freq: 0.005 }, rise: 80, mountain: [0xa87a5a, 0xf2e2c8], mtnH: .8, lakes: 1,
  trees: [['round', 40, [0x7a9a58, 0x8faa60, 0x6a8a50], 0x6b5a42], ['flat', 20, [0x3a7a45, 0x2f6d40], 0x6b4a32], ['cypress', 14, [0x2f6d45], 0x5a4030]], roadside: ['round', [0x7a9a58, 0x8faa60], 0x6b5a42, .4], forest: .58, nTrees: .8,
  fill: { n: 2500, shape: 'blob', colors: [0x7a9a58, 0x6a8a50, 0x8faa60] }, flowers: [0xd9302b, 0xffd23d, 0xffffff], grass: 0xc8a850,
  props: [['windmill', 9, 'white'], ['castle', 1], ['village', 3, 'white'], ['herd', 3, 'cow']], floaters: ['balloon', 3],
});
world('andalusia', 'lamancha', { world: 'Orange Groves', accent: '#ff9a3d', ground: [0x8fae50, 0xb8b060, 0xd8b860], trees: [['round', 60, [0x2f8a3e, 0x3a9a48], 0x6b4a32], ['palm', 14, [0x3fae4c], 0x9a7a52], ['cypress', 12, [0x2f6d45], 0x5a4030]], roadside: ['round', [0x2f8a3e, 0x3a9a48], 0x6b4a32, .85], forest: .4, nTrees: 1.2, flowers: [0xff8a1a, 0xff9a3d, 0xffffff, 0xffb347], nFlowers: 2, props: [['village', 4, 'white'], ['church', 1], ['castle', 1], ['domes', 1, 'mosque']] });
world('pampas', BASE, {
  world: 'Pampas under the Andes', accent: '#9fd8ff', ground: [0xb8b060, 0xa8a850, 0x8fae50], grass: 0xc8b860, hills: { amp: 12, freq: 0.005 }, rise: 60, mountain: [0x6a6f92, 0xffffff], mtnH: 1.9,
  trees: [['giant', 20, [0x2f8a3e, 0x3a9a48], 0x6b4a32], ['round', 20, [0x4f9a45], 0x6b4a32], ['tall', 20, [0x6cc45a], 0xe8e4da]], roadside: ['tall', [0x6cc45a, 0x4fae4c], 0xe8e4da, .4], forest: .6, nTrees: .7, fill: { n: 1500, shape: 'blob', colors: [0x4f9a45, 0x2f8a3e] },
  props: [['herd', 8, 'cow'], ['cabin', 4, [0xfaf6ee]], ['windmill', 2, 'white'], ['peak', 1, 'horn']], lakes: 2,
});
world('savanna', BASE, {
  world: 'Golden Savanna', accent: '#ffb347', music: 'desert',
  sky: { top: 0x4a5fb8, hor: 0xffb060, bot: 0xb88a50, cloud: 0xffc890, cloudAmt: .35 }, sun: { dir: [-0.85, 0.2, 0.2], color: 0xffb870, int: 1.15 }, amb: { sky: 0xffe0b8, ground: 0xa88a50, int: 0.72 }, fog: { color: 0xf2b878, density: 0.00045 },
  ground: [0xd8b050, 0xc8a048, 0xb8a850], rock: 0x9a7a5a, grass: 0xd8b850, curb: [0x2f8a3e, 0xffd23d], hills: { amp: 16, freq: 0.005 }, rise: 60, mountain: [0x8a6a5a, 0xf2c8a0], mtnH: .7, lakes: 2,
  trees: [['flat', 60, [0x4f8a38, 0x5f9a40, 0x3f7a30], 0x5a4030], ['giant', 8, [0x5f8a40], 0x8a7a6a], ['bush', 30, [0x8a9a48, 0xa8a850], 0x5a4030]], roadside: ['flat', [0x4f8a38, 0x5f9a40], 0x5a4030, .35], forest: .56, nTrees: .8,
  fill: { n: 2200, shape: 'blob', colors: [0x4f8a38, 0x5f9a40, 0x8a9a48] }, flowers: [0xffd23d, 0xff8a1a, 0xffffff], nFlowers: .6,
  props: [['herd', 5, 'giraffe'], ['herd', 4, 'elephant'], ['herd', 4, 'zebra'], ['butte', 4, 'kopje'], ['cabin', 3, [0xb89a60], 'hut']], floaters: ['balloon', 3], birds: 5,
});
world('outback', BASE, {
  world: 'Red Centre', accent: '#ff6b3d', music: 'desert',
  sky: { top: 0x1f6fe0, hor: 0xffd8b0, bot: 0xd88a60, cloud: 0xffffff, cloudAmt: .25 }, fog: { color: 0xf2c8a0, density: 0.0004 }, ground: [0xc9552e, 0xd86a3a, 0xb88a48], rock: 0xa8482a, sand: 0xe8a870, grass: 0xb8a850, curb: [0xffd23d, 0x2f8a3e],
  hills: { amp: 14, freq: 0.005 }, rise: 50, mountain: [0xa8482a, 0xe88a5a], mtnH: .6, lakes: 2, water: { color: 0x3fa8a0, opacity: .86, spec: 0xffffff },
  trees: [['tall', 40, [0x8aa870, 0x9ab878, 0x7a9a68], 0xe8e0d0], ['round', 20, [0x7a9a58, 0x8aa860], 0xd8d0c0], ['bush', 30, [0xa8a860, 0x8a9a50], 0x6b5a42]], roadside: ['tall', [0x8aa870, 0x9ab878], 0xe8e0d0, .4], forest: .55, nTrees: .8,
  fill: { n: 2000, shape: 'blob', colors: [0x8aa870, 0x7a9a58] }, flowers: [0xffd23d, 0xffffff, 0xff5a5f], nFlowers: .6, props: [['uluru', 1], ['butte', 5], ['herd', 5, 'roo'], ['windmill', 2, 'white']], birds: 4,
});
world('mesa', BASE, {
  world: 'Red Rock Canyon', accent: '#ff8a4a', music: 'desert',
  sky: { top: 0x1a60d8, hor: 0xffe0c0, bot: 0xd89a70, cloud: 0xffffff, cloudAmt: .28 }, fog: { color: 0xf2d0b0, density: 0.00036 }, ground: [0xc9743f, 0xd98a52, 0xe0a070], rock: 0xb85a34, sand: 0xe8b888, grass: 0x9aa860, curb: [0x29b6f6, 0xffffff],
  hills: { amp: 22, freq: 0.005 }, rise: 90, mountain: [0xb85a34, 0xe89a6a], mtnH: .8, lakes: 0,
  trees: [['cactus', 50, [0x4f8a48, 0x5f9a50], 0x4f8a48], ['bush', 50, [0x9aa870, 0x8a9a60, 0xb8b078], 0x6b5a42]], roadside: ['cactus', [0x4f8a48, 0x5f9a50], 0x4f8a48, .3], forest: .5, nTrees: .9, fill: { n: 0 },
  flowers: [0xffd23d, 0xff5a8a, 0xffffff], nFlowers: .5, particles: { n: 500, size: .22, colors: [0xf2d0a0, 0xe8b888], fall: .2, sway: 2.5, wind: [3, 1], round: true },
  props: [['butte', 16], ['herd', 3, 'horse'], ['cabin', 3, [0x8a5a3a]], ['windmill', 2, 'white']], floaters: ['balloon', 5], birds: 3,
});
world('mesadusk', 'mesa', { world: 'Canyon Sunset', accent: '#ff6fa0', sky: { top: 0x3a2f8a, hor: 0xff8a5a, bot: 0x8a4a5a, cloud: 0xff9a8a, cloudAmt: .5, stars: .4 }, sun: { dir: [0.85, 0.15, -0.2], color: 0xff9a6a, int: 1.1 }, amb: { sky: 0xd8b0ff, ground: 0xa86a5a, int: 0.74 }, fog: { color: 0xe88a70, density: 0.00042 }, mountain: [0x8a3a4a, 0xff9a7a] });

/* --- ancient worlds --- */
world('egypt', BASE, {
  world: 'Ancient Egypt', accent: '#ffd76a', music: 'desert',
  sky: { top: 0x1f7fe8, hor: 0xffe6b8, bot: 0xe8c890, cloud: 0xffffff, cloudAmt: .15 }, sun: { dir: [0.4, 0.75, 0.3], color: 0xfff2d0, int: 1.15 }, amb: { sky: 0xfff0d0, ground: 0xd8b070, int: 0.74 }, fog: { color: 0xf4e0b0, density: 0.00036 },
  ground: [0xcfae6e, 0xc29e60, 0xd9bb80], rock: 0xb08a58, sand: 0xdcc490, grass: 0x6aa848, curb: [0x1f6fbf, 0xffd23d], roadTint: 0xfff0d8,
  hills: { amp: 20, freq: 0.0045 }, rise: 70, mountain: [0xd8b070, 0xf2dcb0], mtnH: .5, lakes: 2, water: { color: 0x2f9ab8, opacity: .88, spec: 0xffffff },
  trees: [['palm', 80, [0x3fae4c, 0x58c05a, 0x4f9a40], 0x9a7a52], ['bush', 20, [0x6aa848, 0x8ab858], 0x6b5a42]], roadside: ['palm', [0x3fae4c, 0x58c05a], 0x9a7a52, .45], forest: .62, nTrees: .6, fill: { n: 0 },
  flowers: [0xff5a8a, 0xffffff, 0x4fa8e8], nFlowers: .4, particles: { n: 500, size: .2, colors: [0xf2e0b0, 0xffe8c0], fall: .15, sway: 2, wind: [2.5, .8], round: true },
  props: [['pyramid', 3], ['sphinx', 1], ['obelisk', 6], ['columns', 3], ['herd', 4, 'camel'], ['temple', 1, 'egypt']], clouds: 8, floaters: ['balloon', 3], birds: 3, boats: 4,
});
world('babylon', 'egypt', {
  world: 'Hanging Gardens of Babylon', accent: '#4fc8ff', sky: { top: 0x4a5fc8, hor: 0xffc890, bot: 0xc89a70, cloud: 0xffd0a8, cloudAmt: .4 }, sun: { dir: [-0.8, 0.25, 0.3], color: 0xffc890, int: 1.1 }, fog: { color: 0xf2c898, density: 0.00042 },
  ground: [0xc8b070, 0x7aa850, 0xd8c080], curb: [0x1f4fbf, 0xffd23d], lakes: 3, forest: .45, nTrees: 1.1,
  trees: [['palm', 60, [0x3fae4c, 0x58c05a], 0x9a7a52], ['round', 25, [0x2f9e4f, 0xff7fb0, 0x45b85c, 0xffd23d], 0x6b4a32], ['cypress', 10, [0x2f6d45], 0x5a4030]], roadside: ['palm', [0x3fae4c, 0x58c05a], 0x9a7a52, .7],
  flowers: [0xff5a8a, 0xffd23d, 0xffffff, 0x9b6fe0], nFlowers: 1.4, props: [['ziggurat', 1], ['arch', 3, 'ishtar'], ['obelisk', 4], ['columns', 3], ['herd', 3, 'camel'], ['lamps', 1, 0xffb060]], floaters: ['lantern', 30],
});
world('arabia', BASE, {
  world: 'Arabian Nights', accent: '#ffc86a', music: 'desert', night: true,
  sky: { top: 0x070a2a, hor: 0x3a2f6a, bot: 0x1a1838, cloud: 0x3a3f6a, cloudAmt: .12, stars: 1 }, sun: { dir: [-0.4, 0.6, 0.4], color: 0xc8d0ff, int: 0.6 }, amb: { sky: 0xb8b8f0, ground: 0x8a6a70, int: 0.8 }, fog: { color: 0x2a2850, density: 0.0004 },
  ground: [0xd8b888, 0xc8a878, 0xe0c898], rock: 0xa88a68, sand: 0xe8d0a0, grass: 0x6a9a58, curb: [0x1fa88a, 0xffffff], roadTint: 0xd8d0e8,
  hills: { amp: 22, freq: 0.0045 }, rise: 60, mountain: [0x5a4a7a, 0xb8a8d0], mtnH: .5, lakes: 1, water: { color: 0x2f6aa8, opacity: .9, spec: 0xc8d0ff },
  trees: [['palm', 85, [0x3f9a55, 0x4faa60], 0x8a6a52], ['bush', 15, [0x6a9a58], 0x6b5a42]], roadside: ['palm', [0x3f9a55, 0x4faa60], 0x8a6a52, .6], forest: .6, nTrees: .7, fill: { n: 0 },
  flowers: [0xff5a8a, 0xffffff], nFlowers: .3, particles: { n: 400, size: .2, colors: [0xffe8c0], fall: .1, sway: 1.5, wind: [1.5, .5], round: true }, clouds: 6,
  props: [['domes', 2, 'mosque'], ['minaret', 6], ['tent', 8], ['herd', 3, 'camel'], ['lamps', 1, 0xffb060], ['arch', 2, 'stone']], floaters: ['lantern', 40], birds: 0,
});
world('casbah', 'egypt', { world: 'Casbah Coast', accent: '#4fd8d0', sea: true, lakes: 0, curb: [0x1fa88a, 0xffffff], props: [['village', 5, 'white'], ['domes', 2, 'mosque'], ['minaret', 4], ['herd', 3, 'camel'], ['lighthouse', 1], ['tent', 5]], boats: 8, forest: .5, nTrees: .9 });
world('bosphorus', BASE, {
  world: 'Domes of the Golden Horn', accent: '#ffb86a', music: 'desert', sky: { top: 0x3a6fd0, hor: 0xffd8a8, bot: 0xb8a888, cloud: 0xffe8d0, cloudAmt: .45 }, sun: { dir: [-0.7, 0.35, 0.3], color: 0xffd8a8, int: 1.1 }, fog: { color: 0xf2d8b0, density: 0.00045 },
  ground: [0x7aa850, 0x9ab058, 0xc8b870], curb: [0xd9302b, 0xffffff], sea: true, lakes: 0, hills: { amp: 24, freq: 0.006 }, rise: 100, mtnH: .7,
  trees: [['cypress', 40, [0x2f6d45, 0x275a3c], 0x5a4030], ['round', 40, [0x4f9a45, 0x6aaa50, 0xff7fb0], 0x6b4a32], ['flat', 10, [0x2f7a45], 0x6b4a32]], roadside: ['cypress', [0x2f6d45, 0x275a3c], 0x5a4030, .6], forest: .45, nTrees: 1.1,
  props: [['domes', 3, 'mosque'], ['minaret', 5], ['mausoleum', 1], ['village', 4, 'pastel'], ['lighthouse', 1], ['columns', 2]], boats: 10, birds: 5, floaters: ['balloon', 4],
});
world('rome', BASE, {
  world: 'Ancient Rome', accent: '#ffb86a', music: 'autumn',
  sky: { top: 0x2f7fe0, hor: 0xffe0b0, bot: 0xc8b080, cloud: 0xfff0d8, cloudAmt: .4 }, sun: { dir: [-0.6, 0.5, 0.4], color: 0xffe8c0, int: 1.12 }, fog: { color: 0xf4dcb8, density: 0.00042 },
  ground: [0x7aa048, 0xa8a850, 0xd8b860], rock: 0xc8b8a0, curb: [0xb5262e, 0xffd76a], hills: { amp: 22, freq: 0.006 }, rise: 90, mountain: [0x8a8fa8, 0xf4ece0], mtnH: .8, lakes: 1,
  trees: [['cypress', 34, [0x2f6d45, 0x275a3c, 0x3a7a50], 0x5a4030], ['flat', 30, [0x2f7a45, 0x3a8a50, 0x276a3c], 0x6b4a32], ['round', 22, [0x7a9a58, 0x8faa60], 0x6b5a42]], roadside: ['cypress', [0x2f6d45, 0x275a3c], 0x5a4030, .7], forest: .48, nTrees: 1.1,
  fill: { n: 3500, shape: 'blob', colors: [0x2f7a45, 0x7a9a58, 0x3a8a50] }, flowers: [0xd9302b, 0xffd23d, 0xffffff, 0x9b6fe0], nFlowers: 1.3,
  props: [['colosseum', 1], ['aqueduct', 2], ['arch', 2, 'triumph'], ['columns', 5], ['temple', 2, 'rome'], ['statue', 2]], floaters: ['balloon', 3], birds: 4,
});
world('romenight', 'rome', {
  world: 'Saturnalia by Torchlight', accent: '#ff8a3d', night: true, sky: { top: 0x0a0a2a, hor: 0x5a2f4a, bot: 0x1a1428, cloud: 0x4a3050, cloudAmt: .2, stars: 1 }, sun: { dir: [0.3, 0.6, 0.5], color: 0xc8c8ff, int: 0.55 }, amb: { sky: 0xd0b8e8, ground: 0x8a6a5a, int: 0.8 }, fog: { color: 0x2a1a38, density: 0.00042 },
  props: [['colosseum', 2], ['arch', 4, 'triumph'], ['columns', 6], ['temple', 2, 'rome'], ['statue', 4], ['lamps', 1, 0xff8a3d], ['signs', 26]], floaters: ['lantern', 30], birds: 0, clouds: 8,
});
world('tuscany', 'rome', { world: 'Cypress Hills', accent: '#c9e86a', stripes: { colors: [0x8fa848, 0xc8b858, 0x6f9a40, 0xd8c868], width: 16, amt: .5 }, hills: { amp: 34, freq: 0.0065 }, rise: 120, props: [['village', 5, 'tuscan'], ['church', 2], ['castle', 1], ['aqueduct', 1], ['herd', 3, 'horse']], floaters: ['balloon', 6] });
world('greece', BASE, {
  world: 'Ancient Greece', accent: '#5fc8ff', music: 'spring',
  sky: { top: 0x1570e8, hor: 0xc8e8ff, bot: 0xb8d0c0, cloud: 0xffffff, cloudAmt: .28 }, sun: { dir: [0.4, 0.8, 0.3], color: 0xfffbe8, int: 1.15 }, fog: { color: 0xd0e8f8, density: 0.00038 },
  ground: [0x86a34c, 0xa9a765, 0xc9bd8e], rock: 0xc8c0b0, sand: 0xdcd0b0, curb: [0x1f6fd8, 0xffffff], sea: true, lakes: 0, hills: { amp: 26, freq: 0.006 }, rise: 110, mountain: [0x8a9aa8, 0xf4f4f0], mtnH: .8, water: { color: 0x1a8fd8, opacity: .86, spec: 0xffffff },
  trees: [['round', 50, [0x9aab7a, 0x8a9a6a, 0xa8b888], 0x6b5a42], ['cypress', 30, [0x2f6d45, 0x275a3c], 0x5a4030], ['bush', 20, [0xff7fb0, 0xff5a8a, 0x9aab7a], 0x6b5a42]], roadside: ['round', [0x9aab7a, 0x8a9a6a], 0x6b5a42, .55], forest: .5, nTrees: 1,
  fill: { n: 3000, shape: 'blob', colors: [0x9aab7a, 0x8a9a6a, 0x2f6d45] }, flowers: [0xff5a5f, 0xffd23d, 0xffffff, 0x7a5cff], nFlowers: 1.3,
  props: [['temple', 3, 'greek'], ['colossus', 1], ['columns', 6], ['village', 3, 'white'], ['statue', 3], ['arch', 1, 'columns']], boats: 9, birds: 4, floaters: ['balloon', 2],
});
world('olympus', 'greece', {
  world: 'Mount Olympus above the Clouds', accent: '#ffe08a', sea: false, island: 70, waterDrop: 9,
  sky: { top: 0x2f6fe0, hor: 0xffe0b0, bot: 0xfff0e0, cloud: 0xffffff, cloudAmt: .2 }, sun: { dir: [0.75, 0.3, 0.3], color: 0xffe0a8, int: 1.15 }, amb: { sky: 0xfff0d8, ground: 0xd8c8b0, int: 0.78 }, fog: { color: 0xfff0dc, density: 0.0005 },
  water: { color: 0xffffff, opacity: .97, spec: 0xffffff, glow: 0xb8b0a8 }, ground: [0x9db85a, 0xe8e4d8, 0xd8d0c0], mountain: [0x9a9aa8, 0xffffff], mtnH: 1.3, hills: { amp: 14, freq: 0.007 },
  props: [['temple', 4, 'greek'], ['zeus', 1], ['columns', 8], ['statue', 4], ['arch', 2, 'columns']], boats: 0, particles: { n: 700, size: .26, colors: [0xffe8a0, 0xffffff], fall: -.3, sway: 1.5, wind: [.8, .3], round: true }, clouds: 30,
});
world('riviera', BASE, {
  world: 'Riviera Harbour', accent: '#4fd8ff', music: 'summer',
  sky: { top: 0x1570e8, hor: 0xd0ecff, bot: 0xb8d8c8, cloud: 0xffffff, cloudAmt: .3 }, ground: [0x6aa850, 0x8ab858, 0xc8c070], rock: 0xd8c8b0, curb: [0xe53935, 0xffffff], sea: true, lakes: 0, hills: { amp: 30, freq: 0.007 }, rise: 140, mountain: [0x8a9a98, 0xf0f0e8], mtnH: .9,
  water: { color: 0x1a9ad8, opacity: .86, spec: 0xffffff }, trees: [['palm', 30, [0x3fae4c, 0x58c05a], 0x9a7a52], ['cypress', 25, [0x2f6d45, 0x275a3c], 0x5a4030], ['round', 30, [0x4f9a45, 0xff5fa2, 0xff7fb0, 0x6aaa50], 0x6b4a32], ['flat', 12, [0x2f7a45], 0x6b4a32]],
  roadside: ['palm', [0x3fae4c, 0x58c05a], 0x9a7a52, .6], forest: .45, nTrees: 1.1, fill: { n: 3500, shape: 'blob', colors: [0x4f9a45, 0x2f6d45, 0x6aaa50] }, flowers: [0xff5fa2, 0xffd23d, 0xffffff, 0xff5a5f], nFlowers: 1.4,
  props: [['village', 8, 'pastel'], ['lighthouse', 1], ['church', 1], ['castle', 1]], boats: 16, birds: 5, floaters: ['balloon', 3],
});
world('jungle', BASE, {
  world: 'Temples in the Jungle', accent: '#5fe08a', music: 'east',
  sky: { top: 0x3f8fd0, hor: 0xd8f0d0, bot: 0x8ab890, cloud: 0xf4fff0, cloudAmt: .65 }, fog: { color: 0xc8e6c8, density: 0.0008 }, ground: [0x2f8a3e, 0x3f9a45, 0x5aa848], curb: [0xffd23d, 0x1f8a4c],
  hills: { amp: 30, freq: 0.006 }, rise: 140, mountain: [0x2f7a4a, 0x9fd0a0], mtnH: .9, lakes: 3, water: { color: 0x2fa890, opacity: .88, spec: 0xffffff },
  trees: [['giant', 30, [0x1f8a3f, 0x2f9e4f, 0x23803f], 0x5a4030], ['palm', 30, [0x3fae4c, 0x58c05a], 0x8a6a52], ['round', 30, [0x2f9e4f, 0x45b85c, 0xff5a5f, 0xffd23d], 0x5a4030]], roadside: ['giant', [0x1f8a3f, 0x2f9e4f], 0x5a4030, 1], forest: .04, nTrees: 2.2,
  fill: { n: 16000, shape: 'blob', colors: [0x1f8a3f, 0x2f9e4f, 0x23803f, 0x45b85c, 0x3da850] }, flowers: [0xff5a5f, 0xffd23d, 0xff5fa2, 0xffffff, 0x9b6fe0], nFlowers: 1.6,
  props: [['steppyr', 3], ['arch', 2, 'stone'], ['columns', 3, 'totem'], ['statue', 3]], floaters: ['balloon', 2], birds: 7, birdCol: 0xff3b4f, clouds: 34,
});
world('china', BASE, {
  world: 'Jade Mountains', accent: '#ff5a4a', music: 'east',
  sky: { top: 0x5a9ad8, hor: 0xe8f2e8, bot: 0xa8c8b0, cloud: 0xffffff, cloudAmt: .7 }, fog: { color: 0xd8ead8, density: 0.00075 }, ground: [0x4f9a55, 0x62aa5a, 0x8ab868], curb: [0xd9302b, 0xffd23d],
  hills: { amp: 30, freq: 0.006 }, rise: 150, mountain: [0x4f8a6a, 0xcfe8d0], mtnH: 1.35, lakes: 3, water: { color: 0x4fa8a0, opacity: .88, spec: 0xffffff },
  trees: [['tall', 40, [0x6ab850, 0x7cc65a, 0x58a848], 0x8aa850], ['pine', 25, [0x2f6d45, 0x3a7a50], 0x5a4030], ['round', 25, [0x3fa04f, 0xffb3d1, 0x55b05a], 0x5a4030]], roadside: ['tall', [0x6ab850, 0x7cc65a], 0x8aa850, .8], forest: .25, nTrees: 1.6,
  fill: { n: 10000, shape: 'blob', colors: [0x3fa04f, 0x55b05a, 0x2f8a45, 0x6ab850] }, props: [['pagoda', 4], ['greatwall', 2], ['arch', 3, 'paifang'], ['lanterns', 1, [0xff3b3b, 0xffd23d]], ['village', 2, 'china']], floaters: ['lantern', 14], birds: 4, boats: 5, clouds: 36,
});
world('tigerbay', 'china', { world: 'Pagoda Bay at Dusk', accent: '#ff8fa0', sea: true, lakes: 0, sky: { top: 0x4a4fa8, hor: 0xffa890, bot: 0x8a7a9a, cloud: 0xffb8a8, cloudAmt: .5 }, sun: { dir: [0.8, 0.2, 0.3], color: 0xffb090, int: 1.05 }, amb: { sky: 0xe0c8f0, ground: 0x6f8f6a, int: 0.74 }, fog: { color: 0xf0b0a0, density: 0.0006 }, props: [['pagoda', 5], ['arch', 2, 'paifang'], ['lanterns', 1, [0xff3b3b, 0xffd23d]], ['village', 3, 'china'], ['lighthouse', 1]], boats: 12 });
world('india', BASE, {
  world: 'Marble Palace', accent: '#ffa03d', music: 'desert',
  sky: { top: 0x5a6fc8, hor: 0xffc0a0, bot: 0xc8a088, cloud: 0xffd0b8, cloudAmt: .45 }, sun: { dir: [0.75, 0.28, 0.3], color: 0xffc8a0, int: 1.1 }, amb: { sky: 0xffe0d0, ground: 0x9a8a60, int: 0.74 }, fog: { color: 0xf4c8a8, density: 0.0005 },
  ground: [0x7aa850, 0x9ab058, 0xd8a850], curb: [0xff8a1a, 0xffffff], lakes: 3, hills: { amp: 18, freq: 0.005 }, rise: 70, mtnH: .7,
  trees: [['round', 45, [0x2f8a3e, 0x3a9a48, 0xff8a1a, 0xff5a8a], 0x6b4a32], ['palm', 30, [0x3fae4c, 0x58c05a], 0x9a7a52], ['giant', 12, [0x2f8a3e], 0x6b4a32]], roadside: ['palm', [0x3fae4c, 0x58c05a], 0x9a7a52, .7], forest: .4, nTrees: 1.2,
  flowers: [0xff8a1a, 0xffd23d, 0xff5a8a, 0xffffff], nFlowers: 2.2, props: [['domes', 2, 'taj'], ['minaret', 4], ['herd', 4, 'elephant'], ['arch', 2, 'stone'], ['village', 2, 'pastel']], floaters: ['lantern', 16], birds: 5,
});

/* --- cities --- */
world('neon', BASE, {
  world: 'Neon City', accent: '#ff4fd8', music: 'city', night: true,
  sky: { top: 0x06061e, hor: 0x5a1f6a, bot: 0x140a28, cloud: 0x3a2050, cloudAmt: .25, stars: .5 }, sun: { dir: [0.3, 0.6, 0.5], color: 0xb8b8ff, int: 0.5 }, amb: { sky: 0xd0a8ff, ground: 0x6a5a8a, int: 0.85 }, fog: { color: 0x2a1040, density: 0.0005 },
  ground: [0x2a3a40, 0x34484a, 0x2f5a48], rock: 0x4a4a5a, sand: 0x5a5a6a, grass: 0x2f6a50, curb: [0xff4fd8, 0x29e6ff], roadTint: 0xb8b0d0, hills: { amp: 6, freq: 0.006 }, rise: 10, mountain: [0x2a1f4a, 0x5a3f8a], mtnH: .5,
  lakes: 1, sea: true, water: { color: 0x1a2a5a, opacity: .93, spec: 0xff7fe8 }, trees: [['palm', 60, [0x2f8a6a, 0x3a9a7a], 0x6a5a6a], ['round', 30, [0x2f7a5a, 0x3a8a6a], 0x4a3a4a]], roadside: ['palm', [0x2f8a6a, 0x3a9a7a], 0x6a5a6a, .5], forest: .6, nTrees: .5, fill: { n: 0 },
  flowers: [0xff4fd8, 0x29e6ff], nFlowers: .2, particles: { n: 300, size: .2, colors: [0xff9fe8, 0x9ff0ff], fall: -.15, sway: 1, wind: [.4, .2], round: true }, clouds: 8,
  city: { n: 170, h: [22, 130], night: true }, props: [['signs', 44], ['ferris', 1], ['lamps', 1, 0x29e6ff]], floaters: ['lantern', 0], birds: 0, boats: 6,
});
world('vegas', 'neon', { world: 'Neon Mirage', accent: '#ffd23d', sea: false, lakes: 0, ground: [0x5a4a40, 0x6a5a48, 0x4a4a48], hills: { amp: 5, freq: 0.005 }, rise: 40, mountain: [0x4a2f3a, 0x8a5a5a], mtnH: .8, props: [['signs', 60], ['sphere', 1], ['ferris', 1], ['lamps', 1, 0xffd23d], ['pyramid', 1], ['arch', 2, 'neon']], boats: 0 });
world('miami', BASE, {
  world: 'Flamingo Sunset', accent: '#ff7fb8', music: 'city',
  sky: { top: 0x3a4fc8, hor: 0xff9fb0, bot: 0xffc8a0, cloud: 0xffb8c8, cloudAmt: .45 }, sun: { dir: [-0.85, 0.16, 0.2], color: 0xffa890, int: 1.05 }, amb: { sky: 0xffd0e8, ground: 0x8a9a8a, int: 0.8 }, fog: { color: 0xffb0b8, density: 0.00045 },
  ground: [0x4faa60, 0x62ba68, 0xe8d8a8], curb: [0xff7fb8, 0x29d6e6], sea: true, lakes: 1, hills: { amp: 6, freq: 0.006 }, rise: 10, mtnH: .3, water: { color: 0x2fb8c8, opacity: .86, spec: 0xffc8d8 },
  trees: [['palm', 80, [0x3fae6c, 0x58c07a], 0x9a7a62], ['round', 15, [0xff7fb8, 0x4faa60], 0x6b4a32]], roadside: ['palm', [0x3fae6c, 0x58c07a], 0x9a7a62, .85], forest: .5, nTrees: .9, fill: { n: 0 },
  flowers: [0xff7fb8, 0xffffff, 0xffd23d], city: { n: 110, h: [18, 90], night: true, pastel: true }, props: [['signs', 30], ['herd', 5, 'flamingo'], ['village', 3, 'pastel'], ['lighthouse', 1]], boats: 14, birds: 5, floaters: ['balloon', 3],
});
world('metro', BASE, {
  world: 'Riverfront Skyline', accent: '#6fb8ff', music: 'city', sky: { top: 0x2f7fe0, hor: 0xd0e8ff, bot: 0xa8c0d0, cloud: 0xffffff, cloudAmt: .5 }, ground: [0x3f9a48, 0x55aa50, 0x7ab858], curb: [0x1f5fbf, 0xffffff], hills: { amp: 6, freq: 0.006 }, rise: 15, mtnH: .4, lakes: 2, sea: true,
  trees: [['round', 70, [0x2f9e4f, 0x45b85c, 0x1f8a4c, 0xffb347], 0x6b4a32], ['tall', 14, [0x4fae4c], 0x6b4a32]], roadside: ['round', [0x2f9e4f, 0x45b85c], 0x6b4a32, .6], forest: .5, nTrees: .8, fill: { n: 800, shape: 'blob', colors: [0x2f9e4f, 0x45b85c] },
  city: { n: 170, h: [20, 140], night: false }, props: [['ferris', 1], ['lighthouse', 1]], boats: 10, floaters: ['balloon', 4],
});
world('carnival', BASE, {
  world: 'Midnight Carnival', accent: '#ffd23d', music: 'city', night: true,
  sky: { top: 0x050a28, hor: 0x2f2f6a, bot: 0x0f1430, cloud: 0x2a3060, cloudAmt: .2, stars: 1 }, sun: { dir: [0.3, 0.6, 0.5], color: 0xc0c8ff, int: 0.55 }, amb: { sky: 0xb8c0f0, ground: 0x5a6a7a, int: 0.85 }, fog: { color: 0x1a2048, density: 0.00045 },
  ground: [0x2f6a48, 0x3a7a50, 0x4a8a58], curb: [0xffd23d, 0xd9302b], roadTint: 0xc8c8e0, hills: { amp: 14, freq: 0.006 }, rise: 50, mountain: [0x2a2f5a, 0x5a5f9a], mtnH: .6, lakes: 1, water: { color: 0x1a2a5a, opacity: .92, spec: 0xffe8a0 },
  trees: [['round', 60, [0x2f7a50, 0x3a8a5a, 0x276a48], 0x4a3a3a], ['pine', 20, [0x1f5a40], 0x4a3a3a]], roadside: ['round', [0x2f7a50, 0x3a8a5a], 0x4a3a3a, .7], forest: .35, nTrees: 1.3, fill: { n: 6000, shape: 'blob', colors: [0x2f7a50, 0x276a48, 0x3a8a5a] },
  particles: { n: 500, size: .26, colors: [0xffe8a0, 0xff9fb0, 0x9fd0ff], fall: -.25, sway: 1.2, wind: [.5, .2], round: true }, clouds: 8,
  props: [['ferris', 3], ['tent', 12, 'circus'], ['lamps', 1, 0xffd23d], ['signs', 26], ['arch', 2, 'neon']], floaters: ['lantern', 40], birds: 0,
});

/* --- beyond Earth, under the sea, and into the fire --- */
world('moon', BASE, {
  world: 'The Moon', accent: '#bfe0ff', music: 'space', night: true, space: true,
  sky: { top: 0x000004, hor: 0x05060f, bot: 0x000004, cloud: 0, cloudAmt: 0, stars: 1.6, neb: [0x2a1a5a, 0x0a3a5a], nebAmt: .35 }, sun: { dir: [0.6, 0.4, 0.3], color: 0xffffff, int: 1.25 }, amb: { sky: 0x8aa0d0, ground: 0x6a6a78, int: 0.5 }, fog: { color: 0x05060f, density: 0.00012 },
  ground: [0x9a9aa2, 0x86868e, 0xb0b0b6], rock: 0x6a6a72, sand: 0x9a9aa2, grass: 0x8a8a92, curb: [0xffa01a, 0xffffff], roadTint: 0xd0d0e0, hills: { amp: 22, freq: 0.006 }, rise: 80, mountain: [0x7a7a84, 0xc8c8d0], mtnH: 1.2, lakes: 0, noWater: true, craters: true,
  trees: [['crystal', 100, [0x8fe8ff, 0xbfa8ff, 0xffffff], 0]], roadside: ['crystal', [0x8fe8ff, 0xbfa8ff], 0, .12], forest: .66, nTrees: .35, fill: { n: 0 }, flowers: [0x8a8a92, 0xa8a8b0], nFlowers: .5, rocks: 600,
  particles: { n: 0, size: .2, colors: [0xffffff], fall: 0, sway: 0, wind: [0, 0], round: true }, clouds: 0,
  props: [['spacedome', 5], ['rocket', 2], ['antenna', 5], ['lamps', 1, 0x8fe8ff], ['arch', 3, 'neon']], skyObj: [['earth', 2.2, .5, 520]], floaters: ['ufo', 4], birds: 0,
});
world('mars', 'moon', {
  world: 'Mars', accent: '#ff7a4a', night: false, sky: { top: 0x8a5a4a, hor: 0xe8b088, bot: 0xa86a4a, cloud: 0xf2c8a8, cloudAmt: .25, stars: .25 }, sun: { dir: [-0.6, 0.5, 0.3], color: 0xffe0c8, int: 1.05 }, amb: { sky: 0xf2c0a0, ground: 0xa85a3a, int: 0.72 }, fog: { color: 0xd89a70, density: 0.00045 },
  ground: [0xb5532e, 0xc96a3a, 0x9a4526], rock: 0x8a3a22, sand: 0xc96a3a, grass: 0xa85a3a, curb: [0xffffff, 0x29b6f6], roadTint: 0xf0d8c8, hills: { amp: 28, freq: 0.0055 }, rise: 130, mountain: [0x8a3a22, 0xd88a5a], mtnH: 1.2,
  trees: [['crystal', 100, [0xffb86a, 0xff7a4a], 0]], roadside: ['crystal', [0xffb86a], 0, .06], nTrees: .2, flowers: [0x9a4526, 0xb5532e], rocks: 700,
  particles: { n: 700, size: .2, colors: [0xe8a878, 0xf2c0a0], fall: .1, sway: 3, wind: [4, 1.5], round: true }, clouds: 0,
  props: [['spacedome', 6], ['rocket', 2], ['antenna', 4], ['butte', 12], ['peak', 1, 'olympus'], ['lamps', 1, 0xffb86a], ['arch', 2, 'neon']], skyObj: [['moonlet', 1.0, .7, 60], ['moonlet', 4.0, .45, 34]],
});
world('saturn', 'moon', {
  world: 'Ice Moon of the Ringed Planet', accent: '#ffe6a8', sky: { top: 0x02041a, hor: 0x101a4a, bot: 0x04061a, cloud: 0, cloudAmt: 0, stars: 1.5, aurora: .35, neb: [0x1a2a6a, 0x3a1a5a], nebAmt: .5 }, sun: { dir: [-0.5, 0.45, 0.4], color: 0xfff0d8, int: 1.0 }, amb: { sky: 0xa8c8ff, ground: 0x6a7a9a, int: 0.7 }, fog: { color: 0x101a4a, density: 0.0002 },
  ground: [0xdcecff, 0xc0d8f5, 0xa8c8f0], rock: 0x8aa0c8, sand: 0xdcecff, grass: 0xc0d8f5, curb: [0xffe6a8, 0x3a5ad8], roadTint: 0xd8e4ff, mountain: [0x6a8ac8, 0xf4faff], mtnH: 1.3, lakes: 3, noWater: false, water: { color: 0x2ad0c8, opacity: .9, spec: 0xffffff, glow: 0x0a5a58 },
  trees: [['crystal', 100, [0x8fe8ff, 0xffffff, 0x6fa8ff], 0]], roadside: ['crystal', [0x8fe8ff, 0xffffff], 0, .35], forest: .5, nTrees: .9, flowers: [0xbfe6ff, 0xffffff], rocks: 300,
  particles: { n: 900, size: .22, colors: [0xffffff, 0xbfe6ff], fall: .5, sway: 1, wind: [1, .4], round: true },
  props: [['spacedome', 5], ['rocket', 1], ['antenna', 4], ['lamps', 1, 0xffe6a8], ['arch', 3, 'neon']], skyObj: [['ringed', 2.6, .42, 900]],
});
world('nebula', 'moon', {
  world: 'Crystal Nebula', accent: '#d08fff', night: true, sky: { top: 0x0a0428, hor: 0x5a1f8a, bot: 0x12063a, cloud: 0, cloudAmt: 0, stars: 1.4, neb: [0xff4fa8, 0x2fc8ff], nebAmt: 1 }, sun: { dir: [0.4, 0.6, -0.4], color: 0xf0d0ff, int: 0.8 }, amb: { sky: 0xd0a0ff, ground: 0x4a6a9a, int: 0.85 }, fog: { color: 0x3a1a6a, density: 0.0004 },
  ground: [0x5a3a9a, 0x3a5aa8, 0x2f8a9a], rock: 0x4a3a7a, sand: 0x6a5ab8, grass: 0x4fd8c8, curb: [0xff4fd8, 0x29e6ff], roadTint: 0xc8b8f0, mountain: [0x3a2a7a, 0xb88aff], mtnH: 1.5, lakes: 3, noWater: false, craters: false, water: { color: 0x29e6ff, opacity: .9, spec: 0xffffff, glow: 0x0a6a7a },
  trees: [['crystal', 40, [0xff7fe8, 0x7ff0ff, 0xb48cff, 0xffe066], 0], ['giant', 30, [0xff5fb8, 0xb45fff, 0x4fd8e8], 0x3a2a6a], ['round', 30, [0xff7fd0, 0x9f6fff, 0x5fe0d8], 0x3a2a6a]], roadside: ['crystal', [0xff7fe8, 0x7ff0ff, 0xb48cff], 0, .6], forest: .3, nTrees: 1.4,
  fill: { n: 6000, shape: 'blob', colors: [0xff5fb8, 0xb45fff, 0x4fd8e8, 0x7a4fd8] }, flowers: [0xff7fe8, 0x7ff0ff, 0xffe066], nFlowers: 1.4, rocks: 140,
  particles: { n: 900, size: .26, colors: [0xff9fe8, 0x9ff0ff, 0xffe8a0], fall: -.35, sway: 1.4, wind: [.4, .2], round: true },
  props: [['spacedome', 4], ['antenna', 3], ['lamps', 1, 0xff7fe8], ['arch', 4, 'neon'], ['rocket', 1]], skyObj: [['ringed', 0.8, .5, 700], ['moonlet', 3.6, .6, 120]], floaters: ['ufo', 6],
});
world('volcano', BASE, {
  world: 'Rivers of Fire', accent: '#ff5a1f', music: 'space', night: true,
  sky: { top: 0x0a0408, hor: 0x6a1a0a, bot: 0x1a0806, cloud: 0x4a1a12, cloudAmt: .55, stars: .3 }, sun: { dir: [0.3, 0.5, 0.5], color: 0xffa878, int: 0.55 }, amb: { sky: 0xff9a6a, ground: 0x8a3a2a, int: 0.8 }, fog: { color: 0x3a0e08, density: 0.0006 },
  ground: [0x2e2628, 0x3c3032, 0x4c2c22], rock: 0x1e1a1c, sand: 0x6a2a14, grass: 0x4a3a34, curb: [0xff5a1f, 0xffd23d], roadTint: 0xc8b0a8, hills: { amp: 30, freq: 0.006 }, rise: 150, mountain: [0x2a2022, 0x5a2a1a], mtnH: 1.5,
  lakes: 5, water: { color: 0xff5a14, opacity: 1, spec: 0xffd23d, glow: 0xff4a0a }, trees: [['bush', 40, [0x3a2e2a, 0x4a3a34], 0x2a2022], ['crystal', 30, [0xff8a3d, 0xffd23d, 0xff5a1f], 0], ['tall', 20, [0x2a2224], 0x1e1a1c]],
  roadside: ['crystal', [0xff8a3d, 0xffd23d], 0, .3], forest: .5, nTrees: .8, fill: { n: 0 }, flowers: [0xff8a3d, 0x4a3a34], nFlowers: .5, rocks: 500,
  particles: { n: 1300, size: .3, colors: [0xff8a3d, 0xffd23d, 0xff5a1f], fall: -1.6, sway: 2, wind: [1.2, .5], round: true }, clouds: 14,
  props: [['peak', 2, 'volcano'], ['butte', 10, 'basalt'], ['lamps', 1, 0xff8a3d], ['arch', 2, 'stone'], ['columns', 3, 'basalt']], floaters: ['lantern', 0], birds: 0,
});
world('reef', BASE, {
  world: 'Sunken Atlantis', accent: '#4fe8d8', music: 'space', underwater: true, noWater: true,
  sky: { top: 0x7fe0f0, hor: 0x0f6a9a, bot: 0x063a5a, cloud: 0xc8fff8, cloudAmt: .5 }, sun: { dir: [0.2, 0.9, 0.2], color: 0xc8fff0, int: 0.95 }, amb: { sky: 0x8fe0f0, ground: 0x2f7a9a, int: 0.85 }, fog: { color: 0x0f6a9a, density: 0.0016 },
  ground: [0xe8d8a8, 0xd8c898, 0x8fc8b8], rock: 0x6a8a9a, sand: 0xe8d8a8, grass: 0x3fa878, curb: [0xff7a5a, 0xffffff], roadTint: 0xc8e8f0, hills: { amp: 26, freq: 0.006 }, rise: 110, mountain: [0x1f5a7a, 0x3f8aa8], mtnH: 1, lakes: 0,
  trees: [['round', 45, [0xff5fa2, 0xff8a3d, 0xb45fff, 0xffd23d, 0xff3b6a, 0x4fe8d8], 0xe8c8b8], ['tall', 30, [0x2fa860, 0x3fb870, 0x1f8a50], 0x2fa860], ['bush', 25, [0xff7fb8, 0xffb347, 0x9f6fff], 0xe8c8b8], ['giant', 8, [0xff5fa2, 0xb45fff], 0xe8c8b8]],
  roadside: ['round', [0xff5fa2, 0xff8a3d, 0xb45fff, 0xffd23d], 0xe8c8b8, .8], forest: .25, nTrees: 1.6, fill: { n: 7000, shape: 'blob', colors: [0xff5fa2, 0xff8a3d, 0xb45fff, 0x2fa860, 0x4fe8d8, 0xffd23d] },
  flowers: [0xff5fa2, 0xffd23d, 0x4fe8d8, 0xffffff], nFlowers: 1.8, particles: { n: 1400, size: .3, colors: [0xffffff, 0xc8fff8], fall: -2.2, sway: .8, wind: [.3, .1], round: true }, clouds: 0,
  props: [['temple', 3, 'greek'], ['columns', 8], ['statue', 4], ['arch', 3, 'columns'], ['colossus', 1], ['wreck', 2]], floaters: ['whale', 3], birds: 9, birdCol: 0xff8a3d, birdH: [6, 40],
});

/* realms group the worlds in the circuit browser */
const REALMS = ['Forests & seasons', 'Countryside', 'Deserts & savanna', 'Ancient worlds', 'Cities', 'Beyond Earth'];
const REALM_OF = { 'Forests & seasons': 'sakura fuji tropic autumn maple momiji aurora nordic snowday bluebell greenhell jungle', 'Countryside': 'alpine alpenglow england orchard tulip lavender sunflower vineyard lamancha andalusia pampas tuscany riviera china tigerbay', 'Deserts & savanna': 'savanna outback mesa mesadusk casbah', 'Ancient worlds': 'egypt babylon arabia bosphorus rome romenight greece olympus india', 'Cities': 'neon vegas miami metro carnival', 'Beyond Earth': 'moon mars saturn nebula volcano reef' };
for (const r in REALM_OF) for (const k of REALM_OF[r].split(' ')) { if (!THEMES[k]) throw new Error('realm: no world ' + k); THEMES[k].realm = r; }

/* ---------- circuits ---------- pts: [mapX, mapY (north up), elevation]; the first point is the start line. */
TR('sakura-crossing', 'Sakura Crossing', 'Suzuka', 'sakura', 4300, [[520, 45, 22], [700, 20, 18], [820, -10, 14], [880, -80, 11], [840, -160, 10], [760, -185, 11],
[680, -150, 14], [610, -195, 17], [540, -150, 20], [470, -195, 23], [400, -160, 26], [320, -190, 28], [240, -200, 27], [170, -180, 22], [130, -120, 14], [120, -40, 6], [125, 40, 6],
[165, 110, 10], [175, 170, 14], [130, 200, 17], [60, 185, 19], [-60, 170, 23], [-180, 190, 27], [-300, 230, 30], [-400, 250, 30], [-470, 200, 27], [-460, 120, 23], [-380, 70, 20],
[-200, 20, 17], [0, -20, 16.5], [120, -40, 17], [260, -70, 19], [330, -70, 21], [390, -40, 23], [398, -5, 24], [380, 28, 24], [402, 56, 24], [450, 52, 23]], { cal: 3, hs: 1.6, wave: 0 });
TR('sunlake-park', 'Sunlake Park', 'Interlagos', 'tropic', 4100, [[400, -60, 30], [405, 90, 36], [395, 210, 40], [375, 280, 38], [310, 320, 32], [272, 385, 26],
[235, 445, 22], [150, 470, 20], [70, 440, 18], [25, 380, 16], [-10, 240, 11], [-50, 80, 6], [-80, -80, 3], [-95, -170, 2], [-70, -235, 2], [0, -255, 3], [70, -235, 6], [100, -170, 10],
[110, -80, 16], [120, 10, 22], [160, 70, 25], [230, 70, 24], [260, 10, 22], [255, -50, 20], [225, -110, 16], [205, -160, 13], [225, -205, 12], [275, -200, 14], [315, -165, 17], [338, -195, 15], [322, -235, 10], [305, -275, 6], [325, -315, 5], [375, -315, 7], [405, -270, 12], [405, -170, 22]], { cal: 21, hs: 1.6 });
TR('ember-forest', 'Ember Forest', 'Spa-Francorchamps', 'autumn', 4700, [[-320, 8, 40], [-420, 32, 41], [-470, 52, 41], [-482, 92, 39], [-440, 112, 35], [-360, 102, 24], [-280, 108, 12],
[-230, 125, 8], [-190, 160, 14], [-140, 178, 25], [0, 222, 36], [200, 282, 48], [380, 330, 58], [440, 336, 60], [480, 312, 60], [520, 322, 59], [560, 290, 57], [572, 220, 52], [575, 140, 46], [540, 92, 42], [480, 96, 40], [430, 90, 37],
[395, 30, 31], [360, -45, 25], [340, -120, 19], [360, -190, 14], [420, -232, 10], [478, -252, 8], [502, -295, 6], [490, -350, 4], [430, -390, 3], [350, -380, 4],
[200, -330, 10], [0, -232, 20], [-120, -150, 28], [-190, -82, 34], [-200, -48, 36], [-238, -36, 37], [-262, -6, 38]], { cal: 12, hs: 1.5 });
TR('aurora-isle', 'Aurora Isle', 'Montreal', 'aurora', 4000, [[-380, -60, 4], [-470, -61, 4], [-520, -68, 4.5], [-560, -92, 5], [-600, -80, 5.5], [-612, -30, 6.5], [-580, 12, 7.5], [-510, 38, 9],
[-440, 34, 10], [-398, 10, 10.5], [-350, 6, 11], [-300, 32, 12], [-220, 52, 14], [-120, 60, 15], [-60, 50, 14], [-20, 75, 12], [30, 95, 10], [80, 80, 8],
[200, 70, 6], [300, 65, 5], [350, 60, 5], [385, 36, 5.5], [425, 32, 6], [460, 52, 7], [560, 56, 10], [640, 50, 12], [690, 38, 13], [712, 0, 13], [690, -44, 12], [640, -56, 11], [500, -50, 8], [300, -65, 5.5], [100, -55, 4], [-100, -65, 3.5],
[-170, -64, 3.5], [-200, -42, 3.5], [-232, -44, 3.5], [-262, -62, 4], [-300, -60, 4]], { cal: 7, hs: 2 });

/* the rest of the 2026 season */
TR('billabong-park', 'Billabong Park', 'Albert Park', 'outback', 4300, [[-300, -100, 6], [-300, 60, 7], [-280, 140, 8], [-230, 170, 9], [-200, 230, 10], [-120, 270, 12], [0, 260, 13], [80, 290, 12], [180, 270, 10], [300, 250, 8], [380, 180, 6], [400, 80, 5], [370, 0, 5], [400, -80, 6], [360, -170, 8], [260, -210, 10], [150, -190, 11], [60, -230, 10], [-60, -250, 8], [-160, -230, 7], [-220, -260, 6], [-290, -230, 6]], { cal: 1, lakes: 3, forest: .45, nTrees: 1.2 });
TR('jade-dragon', 'Jade Dragon', 'Shanghai', 'china', 4900, [[-200, 200, 10], [100, 200, 10], [220, 195, 11], [290, 150, 13], [285, 85, 16], [230, 60, 18], [190, 95, 17], [150, 80, 15], [110, 20, 12], [60, -50, 9], [10, -75, 8], [-25, -40, 8], [-50, 30, 10], [-110, 60, 12], [-165, 30, 13], [-190, -40, 12], [-170, -110, 10], [-100, -160, 8], [-60, -230, 6], [-80, -290, 5], [-30, -330, 4], [60, -320, 4], [300, -290, 5], [520, -260, 7], [590, -225, 8], [600, -165, 9], [560, -130, 10], [480, -120, 10], [430, -80, 10], [440, 0, 10], [480, 80, 10], [470, 180, 10], [420, 250, 10], [330, 285, 10], [-100, 290, 10], [-260, 280, 10], [-300, 240, 10], [-270, 205, 10]], { cal: 2 });
TR('pharaohs-run', "Pharaoh's Run", 'Bahrain', 'egypt', 4500, [[-250, 0, 12], [150, 0, 10], [230, -10, 9], [260, -60, 8], [220, -90, 8], [240, -140, 9], [330, -260, 14], [340, -310, 16], [290, -330, 16], [200, -280, 14], [140, -300, 13], [80, -250, 12], [20, -270, 12], [-40, -250, 13], [-60, -200, 15], [-20, -170, 16], [60, -170, 16], [120, -140, 14], [110, -90, 12], [60, -80, 12], [-150, -110, 16], [-260, -120, 20], [-320, -170, 22], [-310, -240, 20], [-360, -290, 18], [-430, -270, 16], [-460, -200, 14], [-440, -80, 12], [-400, -20, 12], [-330, 0, 12]], { cal: 4 });
TR('lantern-corniche', 'Lantern Corniche', 'Jeddah', 'arabia', 4700, [[0, -400, 5], [10, -200, 5], [-20, -80, 6], [20, 40, 7], [-10, 160, 8], [30, 280, 9], [0, 400, 10], [20, 500, 10], [70, 540, 10], [120, 500, 9], [100, 400, 8], [140, 300, 7], [100, 200, 6], [140, 100, 6], [110, 0, 5], [150, -100, 5], [120, -220, 5], [150, -340, 5], [130, -460, 5], [80, -520, 5], [20, -500, 5]], { cal: 5, sea: true, seaDir: 2, lakes: 0, boats: 8 });
TR('flamingo-bay', 'Flamingo Bay', 'Miami', 'miami', 4500, [[-300, 0, 5], [-100, 10, 5], [60, 30, 5], [120, 80, 6], [100, 140, 6], [140, 190, 7], [230, 200, 7], [300, 160, 8], [380, 180, 8], [440, 140, 8], [430, 60, 7], [470, 0, 6], [440, -60, 6], [380, -50, 7], [340, -90, 9], [360, -130, 9], [320, -160, 7], [200, -170, 5], [-100, -190, 5], [-380, -200, 5], [-450, -170, 5], [-460, -110, 5], [-420, -60, 5], [-380, -20, 5]], { cal: 6 });
TR('porto-azzurro', 'Porto Azzurro', 'Monaco', 'riviera', 3900, [[-200, -40, 6], [-200, 80, 7], [-185, 140, 9], [-130, 165, 13], [-20, 190, 22], [80, 230, 30], [150, 235, 33], [200, 200, 34], [260, 190, 31], [310, 160, 26], [330, 115, 22], [300, 85, 19], [315, 50, 16], [360, 40, 13], [390, 0, 9], [360, -50, 7], [280, -90, 6], [160, -110, 5], [90, -105, 5], [60, -130, 5], [20, -120, 5], [-40, -130, 5], [-70, -160, 5], [-110, -150, 5], [-150, -170, 5], [-190, -150, 5], [-205, -110, 5]], { cal: 8, seaDir: 1, wave: 2 });
TR('colossus-harbour', 'Colossus Harbour', 'Barcelona-Catalunya', 'greece', 4600, [[-300, 0, 12], [100, 0, 10], [230, 0, 8], [270, -30, 8], [300, -10, 9], [340, 40, 12], [330, 110, 16], [270, 150, 18], [210, 120, 20], [170, 150, 22], [110, 190, 24], [40, 170, 22], [20, 110, 18], [-30, 90, 16], [-60, 130, 18], [-110, 170, 22], [-180, 180, 26], [-230, 140, 26], [-380, 130, 20], [-460, 120, 16], [-490, 70, 14], [-450, 40, 14], [-410, 60, 15], [-380, 40, 15], [-390, 0, 14], [-350, -10, 13]], { cal: 9, seaDir: 1 });
TR('edelweiss-ring', 'Edelweiss Ring', 'Red Bull Ring', 'alpine', 3900, [[0, -200, 10], [0, 0, 22], [10, 120, 32], [60, 160, 36], [200, 200, 46], [380, 260, 60], [430, 270, 62], [440, 230, 60], [300, 150, 50], [200, 60, 40], [150, -20, 32], [160, -90, 26], [230, -140, 22], [250, -210, 18], [220, -280, 14], [140, -310, 12], [60, -300, 10], [10, -270, 9]], { cal: 10 });
TR('stonecircle', 'Stonecircle', 'Silverstone', 'england', 4900, [[0, -250, 8], [60, -150, 8], [130, -80, 9], [150, -20, 10], [110, 30, 10], [130, 70, 10], [90, 90, 10], [40, 60, 10], [-60, 0, 9], [-220, -120, 8], [-250, -170, 8], [-300, -190, 8], [-340, -150, 8], [-320, -90, 9], [-260, -60, 9], [-180, 10, 10], [-100, 120, 12], [-40, 220, 14], [0, 270, 15], [60, 280, 15], [140, 250, 14], [200, 270, 13], [260, 230, 12], [320, 240, 12], [370, 190, 11], [400, 60, 10], [410, -120, 8], [390, -200, 8], [330, -240, 8], [240, -230, 8], [180, -270, 8], [120, -300, 8], [50, -310, 8], [10, -290, 8]], { cal: 11 });
TR('sunflower-bowl', 'Sunflower Bowl', 'Hungaroring', 'sunflower', 4300, [[0, -200, 20], [0, 50, 14], [20, 120, 10], [70, 130, 10], [90, 80, 12], [120, 20, 8], [180, 0, 8], [220, 40, 10], [300, 60, 16], [380, 120, 24], [400, 180, 28], [440, 230, 30], [500, 220, 30], [520, 160, 28], [500, 100, 26], [530, 60, 26], [500, 20, 25], [520, -40, 24], [480, -90, 22], [500, -150, 20], [450, -200, 18], [380, -230, 16], [320, -200, 16], [270, -230, 17], [230, -290, 18], [170, -300, 19], [80, -320, 20], [20, -290, 20]], { cal: 13 });
TR('tulip-dunes', 'Tulip Dunes', 'Zandvoort', 'tulip', 4200, [[0, -200, 10], [0, 80, 10], [30, 140, 10], [90, 150, 11], [130, 100, 12], [150, 20, 12], [190, -40, 12], [205, -100, 10], [240, -140, 9], [290, -110, 10], [300, -50, 14], [340, 30, 22], [400, 90, 26], [460, 110, 24], [510, 70, 18], [520, 0, 14], [480, -50, 12], [420, -70, 11], [400, -130, 10], [430, -190, 10], [400, -250, 9], [250, -290, 8], [180, -280, 8], [150, -310, 8], [110, -300, 8], [50, -320, 8], [10, -280, 9]], { cal: 14, seaDir: 2 });
TR('circus-maximus', 'Circus Maximus', 'Monza', 'rome', 4800, [[0, -300, 5], [0, 150, 6], [0, 200, 6], [20, 225, 6], [0, 250, 6], [5, 290, 7], [40, 380, 9], [110, 430, 11], [200, 440, 13], [280, 430, 14], [305, 410, 14], [330, 430, 15], [390, 420, 16], [430, 380, 16], [420, 320, 14], [380, 280, 13], [330, 150, 10], [300, 60, 8], [290, 10, 8], [250, -20, 8], [270, -60, 7], [250, -100, 7], [240, -250, 5], [235, -350, 5], [215, -420, 5], [150, -450, 5], [70, -430, 5], [20, -380, 5]], { cal: 15 });
TR('windmill-plateau', 'Windmill Plateau', 'Madrid', 'lamancha', 4400, [[0, 0, 10], [250, 0, 12], [330, 20, 14], [360, 80, 18], [320, 130, 22], [340, 190, 26], [420, 230, 30], [520, 220, 34], [600, 160, 36], [620, 60, 32], [580, -30, 26], [600, -120, 20], [540, -190, 16], [430, -200, 14], [350, -150, 14], [260, -180, 12], [160, -230, 10], [40, -240, 8], [-80, -200, 8], [-140, -110, 9], [-110, -30, 10]], { cal: 16 });
TR('citadel-of-flame', 'Citadel of Flame', 'Baku', 'arabia', 5000, [[-500, 0, 5], [300, 0, 5], [400, 10, 5], [440, 30, 5], [450, 100, 6], [430, 150, 6], [330, 160, 6], [280, 180, 7], [270, 260, 8], [240, 300, 8], [100, 310, 9], [20, 300, 10], [-20, 340, 11], [-80, 330, 12], [-140, 290, 14], [-180, 310, 18], [-230, 280, 22], [-260, 220, 24], [-320, 210, 24], [-360, 160, 22], [-460, 150, 16], [-560, 120, 10], [-620, 70, 7], [-610, 20, 5], [-560, 0, 5]], { cal: 17, world: 'Citadel of Flame', props: [['castle', 2], ['greatwall', 3], ['minaret', 5], ['domes', 1, 'mosque'], ['lamps', 1, 0xff8a3d], ['arch', 3, 'stone'], ['signs', 20]], sea: true, lakes: 0 });
TR('lantern-bay', 'Lantern Bay', 'Singapore', 'neon', 4500, [[-200, 0, 5], [100, 0, 5], [160, 10, 5], [180, 60, 6], [150, 100, 6], [170, 150, 7], [260, 170, 7], [400, 180, 8], [440, 220, 8], [420, 280, 8], [340, 290, 8], [300, 340, 8], [220, 350, 7], [180, 300, 7], [100, 290, 6], [60, 340, 6], [-20, 350, 6], [-60, 300, 6], [-40, 240, 6], [-120, 220, 6], [-180, 260, 6], [-260, 250, 5], [-280, 180, 5], [-240, 130, 5], [-300, 80, 5], [-290, 20, 5]], { cal: 18 });
TR('tranquility-base', 'Tranquility Base', 'Circuit of the Americas', 'moon', 4700, [[60, -200, 10], [60, -40, 14], [60, 60, 34], [40, 110, 40], [-10, 125, 40], [-40, 80, 36], [-40, 0, 28], [-70, -60, 22], [-130, -80, 20], [-160, -130, 18], [-220, -140, 16], [-250, -190, 14], [-310, -200, 12], [-350, -240, 10], [-430, -250, 10], [-500, -260, 12], [-560, -300, 14], [-570, -360, 12], [-530, -400, 10], [-300, -420, 8], [-150, -430, 8], [-90, -410, 9], [-70, -360, 10], [-110, -320, 11], [-90, -270, 12], [-40, -250, 12], [-10, -290, 11], [-30, -340, 10], [-10, -390, 9], [40, -380, 9], [60, -320, 9]], { cal: 19 });
TR('temple-of-the-sun', 'Temple of the Sun', 'Mexico City', 'jungle', 4500, [[-400, 0, 10], [250, 0, 10], [330, -10, 10], [350, -50, 11], [320, -80, 12], [340, -120, 13], [400, -140, 14], [440, -200, 16], [400, -260, 18], [300, -270, 18], [240, -230, 17], [160, -250, 16], [120, -200, 15], [40, -210, 14], [0, -160, 13], [-80, -170, 12], [-140, -120, 12], [-220, -130, 12], [-300, -180, 12], [-380, -190, 12], [-420, -150, 12], [-390, -110, 12], [-440, -80, 11], [-480, -110, 11], [-520, -80, 10], [-500, -30, 10]], { cal: 20 });
TR('neon-mirage', 'Neon Mirage', 'Las Vegas', 'vegas', 4900, [[-100, -250, 5], [-100, -150, 5], [-80, -100, 5], [-30, -90, 5], [0, -50, 5], [-20, 0, 5], [-20, 150, 6], [0, 220, 6], [80, 240, 6], [300, 230, 7], [380, 250, 7], [420, 300, 7], [480, 300, 7], [520, 250, 7], [520, -250, 5], [500, -320, 5], [440, -340, 5], [200, -330, 5], [100, -350, 5], [0, -340, 5], [-70, -310, 5]], { cal: 22 });
TR('hanging-gardens', 'Hanging Gardens', 'Lusail', 'babylon', 4600, [[-300, 0, 6], [200, 0, 6], [280, -20, 7], [310, -80, 8], [280, -140, 9], [200, -150, 10], [150, -200, 11], [180, -270, 12], [260, -290, 12], [340, -260, 12], [420, -290, 11], [430, -360, 10], [370, -410, 9], [270, -400, 9], [180, -430, 8], [80, -410, 8], [20, -350, 8], [-60, -340, 7], [-100, -280, 7], [-60, -210, 7], [-100, -140, 6], [-180, -150, 6], [-240, -210, 6], [-320, -220, 6], [-390, -170, 6], [-400, -80, 6], [-370, -20, 6]], { cal: 23 });
TR('nebula-marina', 'Nebula Marina', 'Yas Marina', 'nebula', 4600, [[0, 0, 6], [250, 0, 6], [320, 20, 7], [340, 80, 8], [300, 130, 9], [330, 190, 10], [420, 210, 10], [470, 170, 10], [450, 100, 9], [500, 40, 8], [600, 60, 8], [640, 10, 7], [620, -60, 6], [500, -100, 6], [300, -140, 6], [100, -150, 6], [40, -190, 6], [-40, -180, 6], [-60, -120, 6], [-140, -100, 6], [-200, -140, 6], [-270, -110, 6], [-270, -40, 6], [-220, 0, 6], [-120, 5, 6]], { cal: 24, wave: 9 });

/* classic venues, part one */
TR('aqueduct-park', 'Aqueduct Park', 'Imola', 'rome', 4600, [[0, 0, 10], [250, 20, 10], [330, 40, 10], [360, 70, 10], [400, 60, 10], [480, 90, 10], [540, 120, 11], [570, 150, 12], [610, 140, 12], [680, 170, 13], [700, 220, 15], [660, 250, 18], [560, 260, 26], [460, 300, 34], [400, 290, 34], [340, 250, 26], [300, 270, 22], [260, 240, 22], [180, 260, 28], [150, 240, 28], [120, 265, 28], [0, 250, 22], [-100, 225, 14], [-170, 200, 11], [-200, 140, 10], [-180, 80, 10], [-200, 30, 10], [-160, 0, 10], [-80, -5, 10]], { sky: { top: 0x4a5fc8, hor: 0xffc890, bot: 0xc89a70, cloud: 0xffd0a8, cloudAmt: .45 }, sun: { dir: [-0.8, 0.25, 0.3], color: 0xffc890, int: 1.1 }, fog: { color: 0xf2c898, density: 0.00042 } });
TR('castle-ring', 'Castle Ring', 'Nürburgring', 'greenhell', 4700, [[0, 0, 20], [250, 0, 18], [320, -20, 14], [340, -70, 12], [290, -100, 12], [260, -60, 13], [210, -70, 13], [190, -130, 12], [240, -180, 10], [320, -170, 10], [380, -210, 9], [380, -290, 8], [350, -340, 8], [290, -340, 9], [250, -290, 12], [170, -270, 16], [110, -300, 20], [30, -280, 24], [-50, -300, 27], [-130, -270, 28], [-200, -290, 27], [-260, -250, 26], [-260, -180, 25], [-220, -130, 24], [-260, -80, 23], [-240, -30, 22], [-180, 5, 21], [-100, 0, 20]]);
TR('green-labyrinth', 'Green Labyrinth', 'Nürburgring Nordschleife', 'greenhell', 5800, [[0, 0, 60], [150, 0, 58], [230, -30, 54], [260, -90, 48], [330, -120, 42], [360, -190, 36], [430, -230, 30], [450, -310, 24], [520, -350, 18], [540, -430, 12], [490, -490, 8], [410, -480, 6], [360, -530, 5], [280, -520, 8], [230, -570, 12], [150, -550, 18], [110, -610, 24], [30, -600, 30], [-20, -650, 36], [-100, -630, 42], [-140, -560, 46], [-220, -540, 50], [-250, -470, 56], [-330, -450, 62], [-350, -370, 68], [-300, -310, 72], [-340, -250, 76], [-420, -230, 80], [-440, -150, 82], [-380, -100, 80], [-400, -30, 76], [-340, 20, 72], [-260, 0, 68], [-200, 40, 66], [-120, 10, 63]], { hs: 1.2 });
TR('pinewood-dash', 'Pinewood Dash', 'Hockenheim', 'nordic', 5000, [[0, 0, 8], [150, 0, 8], [210, 20, 8], [230, 70, 9], [330, 250, 12], [420, 430, 15], [440, 470, 16], [470, 480, 16], [480, 520, 17], [520, 600, 18], [600, 640, 19], [690, 620, 19], [730, 550, 18], [720, 400, 15], [700, 360, 14], [720, 320, 14], [710, 150, 11], [690, 60, 10], [640, 20, 9], [600, 10, 9], [540, -10, 9], [500, 30, 9], [440, 20, 9], [420, -30, 9], [350, -50, 9], [300, -90, 8], [220, -100, 8], [100, -110, 8], [-20, -100, 8], [-70, -60, 8], [-60, -10, 8], [-20, 0, 8]]);
TR('red-planet-speedway', 'Red Planet Speedway', 'AVUS', 'mars', 4300, [[0, -600, 5], [-15, -100, 8], [10, 150, 10], [0, 400, 12], [20, 500, 16], [90, 560, 20], [170, 540, 20], [200, 460, 16], [190, 300, 12], [205, 0, 8], [195, -500, 5], [180, -600, 5], [140, -660, 5], [90, -690, 5], [40, -670, 5], [10, -640, 5]], { wave: 12 });
TR('golden-horn', 'Golden Horn', 'Istanbul Park', 'bosphorus', 4700, [[0, 0, 20], [-250, 0, 20], [-320, -20, 14], [-340, -80, 10], [-300, -120, 10], [-230, -110, 12], [-180, -150, 16], [-200, -220, 20], [-160, -270, 24], [-80, -260, 26], [-40, -200, 26], [40, -190, 24], [120, -230, 20], [200, -220, 18], [250, -160, 18], [240, -80, 20], [290, -60, 21], [370, -70, 22], [430, -110, 20], [500, -90, 20], [620, -20, 18], [670, 40, 18], [650, 100, 18], [590, 110, 18], [400, 70, 19], [200, 40, 20], [100, 10, 20]]);
TR('monsoon-canopy', 'Monsoon Canopy', 'Sepang', 'jungle', 5000, [[-350, 0, 10], [100, 0, 10], [180, -10, 10], [215, -55, 11], [180, -95, 12], [130, -85, 12], [90, -130, 13], [40, -140, 14], [-40, -110, 15], [-120, -140, 16], [-200, -110, 17], [-280, -150, 18], [-320, -220, 18], [-260, -280, 17], [-160, -270, 16], [-80, -310, 15], [20, -290, 14], [100, -330, 13], [200, -300, 12], [260, -230, 12], [340, -200, 12], [380, -120, 11], [360, -30, 10], [380, 40, 10], [340, 80, 10], [150, 90, 10], [-460, 85, 10], [-530, 60, 10], [-545, 15, 10], [-500, -5, 10]]);
TR('lavender-stripes', 'Lavender Stripes', 'Paul Ricard', 'lavender', 4800, [[-300, 0, 10], [100, 0, 10], [170, 10, 10], [200, 50, 11], [170, 90, 12], [190, 140, 13], [260, 150, 14], [300, 110, 14], [380, 100, 15], [430, 140, 16], [420, 200, 17], [360, 230, 18], [100, 240, 18], [-300, 250, 16], [-360, 250, 16], [-390, 270, 16], [-420, 250, 16], [-600, 250, 14], [-680, 230, 13], [-710, 170, 12], [-690, 100, 12], [-640, 60, 12], [-580, 70, 12], [-540, 30, 11], [-480, 40, 11], [-440, 0, 10], [-380, -10, 10]]);
TR('chateau-loop', 'Château Loop', 'Magny-Cours', 'vineyard', 4200, [[100, -80, 10], [300, -80, 10], [380, -60, 10], [420, 0, 11], [410, 90, 12], [350, 150, 13], [260, 150, 13], [-100, 170, 14], [-350, 180, 16], [-420, 165, 16], [-435, 125, 16], [-395, 100, 15], [-200, 95, 14], [-90, 85, 13], [-50, 45, 12], [-80, 5, 12], [-150, 0, 12], [-200, -40, 11], [-170, -90, 10], [-100, -100, 10], [0, -85, 10]]);
TR('champagne-triangle', 'Champagne Triangle', 'Reims', 'vineyard', 4200, [[0, 0, 10], [300, 60, 14], [420, 90, 16], [470, 60, 16], [460, 0, 14], [400, -70, 12], [410, -130, 10], [340, -170, 9], [300, -220, 8], [150, -380, 5], [110, -430, 5], [60, -440, 5], [30, -400, 6], [-20, -330, 7], [-100, -280, 8], [-90, -210, 9], [-150, -150, 10], [-230, -40, 12], [-220, 10, 12], [-160, 10, 11]], { wave: 10 });
TR('orchard-valley', 'Orchard Valley', 'Rouen-Les-Essarts', 'orchard', 3900, [[0, 0, 40], [100, -60, 34], [90, -110, 30], [170, -130, 27], [180, -180, 23], [230, -220, 18], [250, -310, 10], [220, -370, 6], [170, -360, 6], [160, -300, 10], [100, -220, 18], [-20, -180, 26], [-80, -140, 28], [-140, -210, 31], [-260, -170, 38], [-300, -90, 42], [-250, -20, 44], [-120, 20, 42]]);
TR('ember-caldera', 'Ember Caldera', 'Clermont-Ferrand', 'volcano', 4300, [[0, 0, 30], [120, 20, 34], [190, 80, 40], [170, 160, 46], [220, 230, 52], [310, 240, 56], [360, 180, 52], [430, 160, 48], [470, 90, 42], [440, 20, 36], [480, -50, 30], [430, -110, 26], [350, -90, 24], [300, -150, 20], [220, -140, 18], [170, -200, 16], [90, -190, 18], [60, -120, 22], [-20, -110, 24], [-70, -50, 27]]);
TR('golden-mustard-loop', 'Golden Mustard Loop', 'Dijon-Prenois', 'sunflower', 3900, [[-200, 0, 20], [200, 0, 16], [280, -20, 14], [310, -80, 12], [270, -140, 14], [190, -130, 18], [140, -180, 22], [60, -190, 26], [10, -140, 26], [-60, -150, 22], [-120, -210, 18], [-210, -210, 16], [-280, -150, 16], [-300, -60, 18], [-270, -10, 20]], { world: 'Mustard Fields' });
TR('midnight-carnival', 'Midnight Carnival', 'Le Mans Bugatti', 'carnival', 4200, [[0, 0, 12], [200, 0, 16], [300, 10, 22], [360, 40, 26], [380, 90, 22], [430, 110, 16], [470, 170, 12], [460, 240, 11], [400, 270, 11], [320, 250, 11], [280, 290, 11], [200, 310, 11], [140, 280, 11], [150, 220, 11], [100, 170, 11], [40, 180, 11], [-40, 150, 11], [-80, 180, 11], [-140, 160, 11], [-170, 100, 11], [-140, 40, 11], [-90, 5, 12]]);
TR('lighthouse-point', 'Lighthouse Point', 'Estoril', 'riviera', 4500, [[-300, 0, 14], [100, 0, 12], [180, -15, 12], [220, -70, 12], [190, -130, 13], [120, -140, 14], [80, -190, 15], [110, -250, 16], [190, -260, 16], [230, -320, 14], [180, -370, 12], [-50, -360, 8], [-130, -340, 8], [-150, -290, 9], [-110, -260, 10], [-60, -230, 11], [-90, -180, 12], [-170, -170, 13], [-230, -200, 14], [-300, -190, 15], [-360, -140, 16], [-380, -60, 16], [-350, -15, 15]], { world: 'Lighthouse Coast', props: [['lighthouse', 3], ['village', 6, 'white'], ['church', 1], ['temple', 1, 'greek']] });
TR('cliffside-coaster', 'Cliffside Coaster', 'Portimão', 'riviera', 4700, [[-250, 0, 30], [150, 0, 18], [230, -20, 14], [260, -80, 20], [210, -130, 30], [130, -110, 36], [80, -160, 30], [110, -230, 18], [190, -250, 12], [250, -310, 20], [220, -380, 32], [130, -390, 38], [60, -340, 30], [-20, -360, 20], [-100, -330, 14], [-140, -260, 22], [-220, -240, 34], [-290, -280, 40], [-370, -250, 32], [-400, -170, 22], [-360, -100, 16], [-380, -30, 22], [-330, 5, 28]], { world: 'Clifftop Coast' });
TR('mount-olympus', 'Mount Olympus', 'Monsanto Park', 'olympus', 3900, [[0, 0, 20], [150, 20, 26], [250, 80, 34], [280, 170, 42], [230, 250, 50], [130, 280, 56], [40, 240, 60], [-50, 270, 56], [-140, 240, 48], [-190, 160, 40], [-150, 90, 32], [-210, 30, 26], [-170, -40, 20], [-80, -30, 18]]);
TR('port-wine-quay', 'Port Wine Quay', 'Boavista', 'riviera', 4200, [[0, 0, 8], [300, 0, 8], [360, 20, 9], [380, 80, 12], [360, 250, 20], [330, 310, 22], [270, 320, 22], [100, 300, 18], [-100, 310, 14], [-160, 280, 12], [-170, 220, 10], [-120, 180, 10], [-140, 120, 9], [-200, 90, 8], [-210, 30, 8], [-160, 0, 8]], { world: 'Old Port Town', sky: { top: 0x3a5fc8, hor: 0xffc8a0, bot: 0xb8a088, cloud: 0xffd8c0, cloudAmt: .45 }, sun: { dir: [0.8, 0.22, 0.3], color: 0xffc8a0, int: 1.1 }, fog: { color: 0xf4c8a8, density: 0.00045 } });
TR('tuscan-ribbon', 'Tuscan Ribbon', 'Mugello', 'tuscany', 4800, [[-350, 0, 20], [150, 0, 24], [230, -10, 26], [270, -60, 24], [240, -110, 22], [180, -100, 24], [130, -150, 28], [160, -220, 32], [240, -240, 34], [290, -300, 30], [250, -360, 24], [160, -370, 20], [90, -320, 22], [10, -330, 26], [-50, -380, 30], [-140, -370, 32], [-180, -300, 28], [-260, -280, 24], [-300, -210, 20], [-380, -200, 18], [-440, -150, 16], [-450, -70, 17], [-420, -15, 19]]);
TR('temple-coast', 'Temple Coast', 'Pescara', 'greece', 4500, [[0, 0, 5], [150, 0, 5], [200, -30, 5], [250, 0, 5], [400, 0, 5], [480, 20, 6], [510, 80, 10], [470, 200, 24], [430, 280, 32], [370, 290, 36], [380, 350, 42], [300, 380, 46], [180, 400, 50], [80, 360, 44], [20, 280, 34], [-40, 180, 22], [-120, 100, 12], [-140, 40, 7], [-90, 0, 5]], { seaDir: 1, props: [['temple', 5, 'greek'], ['columns', 8], ['village', 4, 'white'], ['statue', 4], ['arch', 2, 'columns'], ['lighthouse', 1]] });
TR('acacia-ridge', 'Acacia Ridge', 'Kyalami', 'savanna', 4500, [[0, 0, 30], [250, -20, 22], [330, -50, 18], [360, -110, 16], [320, -170, 18], [240, -160, 22], [190, -210, 26], [220, -280, 30], [300, -300, 32], [330, -360, 28], [280, -410, 22], [180, -400, 18], [100, -350, 20], [20, -370, 24], [-60, -330, 28], [-80, -250, 32], [-150, -200, 36], [-160, -110, 36], [-110, -40, 34]]);
TR('lions-shore', "Lion's Shore", 'East London', 'savanna', 3800, [[0, 0, 10], [250, 0, 10], [340, -30, 12], [380, -110, 14], [350, -200, 14], [260, -240, 12], [160, -220, 12], [150, -150, 12], [90, -130, 12], [60, -190, 11], [90, -270, 10], [0, -260, 8], [-70, -200, 8], [-90, -100, 9], [-60, -30, 10]], { sea: true, lakes: 1, boats: 4, world: 'Savanna by the Sea' });
TR('red-centre-streets', 'Red Centre Streets', 'Adelaide', 'outback', 4500, [[0, 0, 8], [150, 0, 8], [200, 20, 8], [220, 60, 8], [260, 80, 9], [280, 130, 9], [280, 220, 10], [310, 260, 10], [370, 270, 10], [400, 320, 10], [380, 380, 10], [320, 400, 10], [-100, 390, 9], [-180, 380, 9], [-210, 330, 9], [-190, 280, 9], [-130, 250, 9], [-120, 180, 8], [-160, 120, 8], [-140, 50, 8], [-80, 5, 8]]);
TR('ringed-speedway', 'Ringed Speedway', 'Indianapolis', 'saturn', 4700, [[0, -300, 6], [0, 200, 6], [20, 300, 8], [90, 360, 10], [180, 360, 10], [240, 300, 8], [250, 200, 6], [210, 150, 6], [150, 160, 6], [120, 110, 6], [160, 60, 6], [230, 50, 6], [260, 0, 6], [240, -60, 6], [170, -70, 6], [130, -120, 6], [160, -180, 6], [230, -200, 6], [250, -260, 6], [220, -340, 6], [150, -390, 6], [70, -390, 6], [15, -350, 6]], { wave: 10 });
TR('maple-glen', 'Maple Glen', 'Watkins Glen', 'maple', 5000, [[0, 0, 20], [200, 0, 20], [260, -20, 22], [290, -80, 28], [270, -150, 36], [310, -210, 42], [290, -280, 46], [250, -450, 48], [240, -500, 48], [260, -530, 48], [230, -560, 47], [180, -620, 44], [100, -640, 40], [40, -600, 36], [20, -520, 30], [-60, -420, 24], [-140, -400, 20], [-180, -330, 18], [-140, -270, 20], [-60, -260, 24], [-30, -200, 26], [-90, -150, 24], [-110, -80, 22], [-70, -20, 20]]);
TR('palm-harbour', 'Palm Harbour', 'Long Beach', 'miami', 4500, [[-200, 0, 5], [200, 0, 5], [260, -10, 5], [280, -50, 6], [250, -90, 6], [270, -140, 7], [330, -160, 8], [350, -220, 9], [300, -260, 9], [150, -260, 8], [100, -300, 8], [20, -290, 7], [0, -230, 6], [-200, -220, 6], [-400, -210, 5], [-470, -200, 5], [-500, -150, 5], [-480, -90, 5], [-420, -40, 5], [-320, -5, 5]], { world: 'Palm Harbour by Day', sky: { top: 0x1877e0, hor: 0xc8ecff, bot: 0xa8d8c8, cloud: 0xffffff, cloudAmt: .35 }, sun: { dir: [0.4, 0.8, 0.3], color: 0xfffbe8, int: 1.1 }, amb: { sky: 0xd8f0ff, ground: 0x8fb28a, int: 0.74 }, fog: { color: 0xc8ecff, density: 0.0004 }, city: { n: 110, h: [18, 90], night: false } });

/* classic venues, part two */
TR('steel-river', 'Steel River', 'Detroit', 'metro', 4300, [[0, 0, 5], [200, 0, 5], [250, 10, 5], [260, 60, 6], [260, 150, 7], [280, 200, 7], [340, 210, 8], [360, 260, 8], [340, 310, 8], [200, 310, 7], [150, 330, 7], [100, 310, 7], [-150, 310, 6], [-200, 290, 6], [-210, 240, 6], [-180, 200, 6], [-200, 150, 5], [-260, 140, 5], [-280, 90, 5], [-260, 30, 5], [-200, 0, 5]]);
TR('saguaro-grid', 'Saguaro Grid', 'Phoenix', 'mesa', 4200, [[0, 0, 6], [250, 0, 6], [300, 10, 6], [310, 60, 7], [310, 200, 9], [330, 250, 10], [380, 260, 10], [400, 310, 11], [380, 360, 11], [150, 360, 10], [100, 340, 9], [90, 290, 9], [50, 260, 8], [-100, 260, 7], [-150, 240, 7], [-160, 190, 6], [-160, 60, 6], [-140, 15, 6], [-90, 0, 6]], { wave: 10 });
TR('lone-star-mesa', 'Lone Star Mesa', 'Dallas', 'mesadusk', 4100, [[0, 0, 8], [200, 10, 8], [260, 50, 9], [250, 120, 10], [300, 170, 10], [380, 160, 10], [430, 200, 11], [420, 270, 12], [350, 300, 12], [280, 270, 11], [200, 300, 10], [120, 280, 10], [60, 310, 9], [-20, 290, 9], [-60, 230, 8], [-20, 170, 8], [-70, 120, 8], [-60, 40, 8]], { wave: 10 });
TR('caesars-night-circuit', "Caesar's Night Circuit", 'Caesars Palace', 'romenight', 5000, [[0, 0, 5], [400, 0, 5], [450, 20, 5], [460, 70, 5], [420, 100, 5], [150, 100, 5], [110, 130, 5], [120, 180, 5], [160, 200, 5], [420, 200, 5], [460, 230, 5], [460, 280, 5], [420, 300, 5], [150, 300, 5], [110, 330, 5], [120, 380, 5], [160, 400, 5], [420, 400, 5], [470, 430, 5], [470, 480, 5], [420, 500, 5], [-20, 500, 5], [-80, 470, 5], [-90, 400, 5], [-90, 100, 5], [-70, 30, 5]], { wave: 8 });
TR('gator-airfield', 'Gator Airfield', 'Sebring', 'tropic', 4900, [[0, 0, 5], [300, 0, 5], [360, 20, 5], [380, 80, 5], [350, 130, 5], [270, 130, 5], [230, 170, 5], [250, 230, 5], [400, 260, 5], [450, 300, 5], [440, 360, 5], [380, 390, 5], [100, 380, 5], [40, 400, 5], [-20, 380, 5], [-40, 320, 5], [0, 270, 5], [-20, 210, 5], [-100, 190, 5], [-200, 200, 5], [-260, 160, 5], [-250, 90, 5], [-190, 60, 5], [-160, 10, 5], [-90, -5, 5]], { world: 'Everglades', lakes: 5, wave: 8, props: [['herd', 5, 'flamingo'], ['cabin', 5, [0xfaf6ee, 0xc8553a]], ['windmill', 2, 'white']] });
TR('canyon-raceway', 'Canyon Raceway', 'Riverside', 'mesa', 4500, [[0, 0, 10], [200, 0, 12], [260, -30, 14], [300, -10, 16], [350, -50, 18], [400, -30, 20], [450, -70, 22], [520, -60, 22], [570, -110, 20], [560, -180, 16], [500, -220, 12], [100, -260, 8], [0, -270, 8], [-70, -240, 8], [-100, -170, 9], [-80, -80, 10], [-50, -20, 10]], { wave: 9 });
TR('loon-lake', 'Loon Lake', 'Mosport', 'nordic', 4200, [[0, 0, 30], [150, -10, 26], [230, -50, 20], [250, -130, 14], [200, -200, 12], [220, -280, 16], [300, -320, 22], [330, -400, 28], [300, -460, 30], [240, -460, 30], [220, -400, 32], [120, -300, 40], [20, -220, 46], [-60, -160, 48], [-120, -90, 44], [-90, -20, 36]], { world: 'Northern Lakes at Dusk' });
TR('laurentian-blaze', 'Laurentian Blaze', 'Mont-Tremblant', 'autumn', 4300, [[0, 0, 20], [150, 10, 24], [220, 60, 30], [200, 130, 36], [250, 190, 40], [330, 190, 38], [380, 250, 34], [350, 320, 30], [270, 330, 28], [220, 280, 26], [150, 300, 24], [100, 360, 22], [20, 350, 20], [-20, 290, 20], [30, 230, 22], [10, 160, 22], [-60, 140, 20], [-110, 80, 18], [-80, 20, 18]], { lakes: 4, world: 'Autumn Mountains', sky: { top: 0x3f7fe0, hor: 0xffe0c0, bot: 0xb5a58a, cloud: 0xffffff, cloudAmt: .5 }, sun: { dir: [0.5, 0.55, 0.4], color: 0xfff0d8, int: 1.1 } });
TR('hedgerow-hollow', 'Hedgerow Hollow', 'Brands Hatch', 'england', 4600, [[0, 0, 30], [120, 10, 30], [190, 40, 26], [220, 100, 14], [200, 160, 10], [220, 220, 18], [200, 270, 24], [150, 280, 24], [130, 230, 20], [100, 160, 14], [40, 140, 14], [-150, 150, 14], [-220, 130, 14], [-260, 170, 16], [-330, 260, 22], [-420, 300, 26], [-500, 270, 26], [-540, 200, 22], [-500, 130, 18], [-420, 110, 18], [-340, 60, 20], [-260, 40, 22], [-200, -10, 24], [-120, -20, 28]]);
TR('castle-park', 'Castle Park', 'Donington Park', 'england', 4500, [[0, 0, 30], [200, 0, 30], [260, -20, 28], [280, -80, 24], [240, -160, 14], [260, -240, 8], [240, -300, 6], [180, -310, 8], [80, -270, 16], [-20, -290, 24], [-90, -260, 28], [-110, -200, 30], [-80, -140, 34], [-120, -90, 36], [-300, -80, 34], [-350, -70, 33], [-370, -40, 32], [-400, -30, 32], [-480, -40, 30], [-510, -10, 28], [-480, 20, 28], [-350, 30, 28], [-300, 60, 29], [-260, 40, 29], [-200, 5, 30]], { props: [['castle', 2], ['herd', 6, 'sheep'], ['village', 2, 'stone'], ['church', 1], ['arch', 2, 'stone']] });
TR('steeplechase', 'Steeplechase', 'Aintree', 'england', 4400, [[0, 0, 8], [250, 0, 8], [320, 20, 9], [340, 80, 10], [300, 130, 10], [200, 140, 10], [150, 180, 11], [170, 250, 12], [250, 280, 12], [280, 340, 12], [240, 400, 11], [150, 410, 10], [-100, 380, 9], [-200, 350, 8], [-250, 280, 8], [-220, 200, 8], [-250, 120, 8], [-220, 40, 8], [-150, 5, 8]], { props: [['herd', 8, 'horse'], ['village', 3, 'stone'], ['church', 1], ['stonehenge', 1]], wave: 9 });
TR('bluebell-wood', 'Bluebell Wood', 'Zolder', 'bluebell', 4300, [[0, 0, 12], [200, 0, 12], [270, 20, 13], [300, 80, 14], [270, 140, 16], [190, 150, 18], [150, 200, 20], [180, 260, 20], [260, 270, 18], [300, 320, 16], [270, 380, 14], [180, 390, 14], [120, 350, 15], [40, 360, 16], [-20, 320, 16], [-10, 250, 15], [-70, 210, 14], [-140, 230, 13], [-200, 190, 12], [-190, 110, 12], [-130, 70, 12], [-140, 20, 12], [-80, -5, 12]]);
TR('windmill-flats', 'Windmill Flats', 'Nivelles', 'tulip', 3800, [[0, 0, 8], [300, 0, 8], [380, 30, 9], [410, 110, 10], [370, 190, 11], [280, 220, 12], [200, 190, 12], [120, 220, 11], [40, 200, 10], [-40, 230, 9], [-120, 200, 8], [-160, 120, 8], [-130, 40, 8], [-70, 5, 8]], { sea: false, lakes: 3, boats: 4 });
TR('alpine-airstrip', 'Alpine Airstrip', 'Zeltweg', 'alpine', 3900, [[0, 0, 10], [400, 0, 10], [460, 20, 10], [480, 80, 10], [470, 300, 12], [440, 360, 12], [380, 370, 12], [340, 330, 12], [340, 150, 11], [300, 100, 10], [100, 90, 10], [-20, 90, 10], [-80, 70, 10], [-90, 20, 10], [-50, 0, 10]], { wave: 9 });
TR('alpenglow-ring', 'Alpenglow Ring', 'Österreichring', 'alpenglow', 4300, [[0, -200, 10], [0, 50, 24], [30, 150, 36], [110, 210, 44], [300, 260, 56], [420, 290, 62], [480, 270, 62], [500, 210, 58], [440, 120, 48], [350, 60, 40], [300, -20, 32], [330, -100, 26], [280, -170, 22], [200, -180, 20], [150, -240, 16], [120, -320, 12], [50, -340, 10], [10, -290, 10]]);
TR('matterhorn-wood', 'Matterhorn Wood', 'Bremgarten', 'alpine', 4000, [[0, 0, 20], [150, 30, 22], [260, 100, 26], [310, 200, 32], [280, 300, 38], [190, 350, 42], [80, 340, 44], [0, 280, 42], [-90, 290, 38], [-170, 240, 32], [-190, 150, 26], [-140, 70, 22], [-180, 0, 20], [-120, -50, 19], [-50, -30, 19]], { forest: .08, nTrees: 2, world: 'Forest under the Horn', roadside: ['pine', [0x2f6d45, 0x3a7a50], 0x5a4030, 1], fill: { n: 14000, shape: 'cone', colors: [0x2f6d45, 0x3a7a50, 0x275a3c] } });
TR('la-mancha-twist', 'La Mancha Twist', 'Jarama', 'lamancha', 4300, [[-200, 0, 14], [150, 0, 14], [220, -20, 14], [240, -80, 12], [200, -120, 12], [140, -100, 14], [90, -140, 18], [110, -210, 22], [180, -230, 24], [220, -290, 24], [180, -340, 22], [100, -330, 20], [50, -280, 20], [-20, -300, 22], [-80, -260, 24], [-70, -190, 22], [-130, -150, 20], [-210, -170, 18], [-270, -130, 16], [-280, -50, 14], [-250, -5, 14]]);
TR('orange-grove', 'Orange Grove', 'Jerez', 'andalusia', 4600, [[-200, 0, 12], [150, 0, 12], [220, -15, 13], [250, -70, 14], [210, -120, 15], [130, -110, 16], [90, -160, 17], [120, -230, 18], [210, -250, 18], [300, -230, 17], [360, -270, 16], [340, -340, 15], [260, -360, 14], [60, -340, 13], [-40, -360, 12], [-120, -320, 12], [-130, -240, 12], [-190, -200, 12], [-270, -220, 12], [-330, -170, 12], [-330, -80, 12], [-290, -20, 12]]);
TR('acropolis-hill', 'Acropolis Hill', 'Montjuïc', 'greece', 3900, [[0, 0, 30], [150, -10, 26], [230, -60, 20], [250, -150, 12], [200, -230, 8], [110, -250, 8], [60, -190, 12], [40, -120, 14], [-30, -110, 16], [-40, -170, 17], [-100, -220, 20], [-190, -200, 26], [-230, -120, 32], [-200, -40, 36], [-110, -10, 34]], { hs: 1.8, world: 'The Acropolis', props: [['temple', 5, 'greek'], ['columns', 8], ['statue', 5], ['arch', 2, 'columns'], ['village', 2, 'white']] });
TR('mosaic-boulevard', 'Mosaic Boulevard', 'Pedralbes', 'riviera', 4500, [[0, 0, 8], [500, 0, 8], [560, 20, 8], [580, 80, 9], [540, 130, 10], [300, 180, 12], [250, 230, 14], [260, 300, 16], [200, 340, 16], [-50, 330, 14], [-110, 290, 12], [-100, 220, 10], [-150, 150, 9], [-140, 60, 8], [-90, 10, 8]], { world: 'Mosaic City', stripes: { colors: [0xff5a5f, 0xffd23d, 0x29b6f6, 0x7ccf4a, 0xff8fc0], width: 16, amt: .35 } });
TR('atlantis-dock', 'Atlantis Dock', 'Valencia', 'reef', 4700, [[0, 0, 8], [200, 0, 8], [260, 20, 8], [270, 80, 9], [230, 120, 10], [250, 180, 11], [330, 200, 12], [450, 190, 12], [520, 220, 12], [530, 290, 11], [480, 330, 10], [300, 330, 10], [240, 370, 10], [150, 360, 10], [120, 300, 9], [30, 290, 9], [-40, 330, 9], [-130, 320, 8], [-170, 260, 8], [-140, 190, 8], [-190, 130, 8], [-170, 50, 8], [-110, 5, 8]], { wave: 12 });
TR('winter-palace-park', 'Winter Palace Park', 'Sochi', 'snowday', 4900, [[0, 0, 8], [250, 0, 8], [320, 10, 8], [360, 60, 9], [380, 130, 10], [340, 210, 11], [250, 250, 12], [150, 230, 12], [80, 270, 12], [100, 340, 13], [190, 370, 14], [290, 360, 14], [350, 400, 14], [330, 470, 13], [240, 490, 12], [100, 470, 11], [20, 430, 10], [-60, 450, 10], [-130, 410, 9], [-120, 330, 9], [-60, 290, 9], [-90, 220, 8], [-160, 200, 8], [-180, 120, 8], [-140, 40, 8], [-80, 5, 8]], { wave: 9 });
TR('marigold-palace', 'Marigold Palace', 'Buddh', 'india', 4700, [[0, 0, 10], [200, 0, 14], [270, -20, 20], [300, -80, 26], [270, -140, 28], [400, -300, 16], [440, -370, 12], [400, -420, 12], [330, -400, 14], [280, -340, 18], [200, -330, 20], [150, -390, 22], [70, -400, 22], [20, -350, 20], [40, -280, 18], [-20, -230, 16], [-100, -250, 14], [-160, -200, 12], [-150, -120, 10], [-180, -50, 10], [-120, -5, 10]]);
TR('tiger-bay', 'Tiger Bay', 'Korea International', 'tigerbay', 5000, [[0, 0, 6], [150, 0, 6], [210, 20, 6], [220, 80, 7], [190, 120, 8], [100, 400, 10], [80, 470, 10], [110, 520, 10], [170, 510, 10], [190, 450, 10], [260, 200, 8], [290, 120, 8], [350, 100, 8], [400, 140, 9], [420, 220, 10], [480, 260, 11], [540, 230, 11], [550, 150, 10], [500, 100, 9], [520, 30, 8], [470, -20, 7], [380, -30, 7], [300, -70, 6], [200, -60, 6], [120, -90, 6], [30, -70, 6], [-40, -90, 6], [-80, -50, 6], [-60, -5, 6]]);
TR('fuji-sunrise', 'Fuji Sunrise', 'Fuji Speedway', 'fuji', 4800, [[-400, 0, 20], [300, 0, 14], [380, -10, 12], [410, -60, 12], [370, -110, 14], [280, -110, 16], [220, -160, 18], [240, -240, 20], [200, -320, 22], [110, -350, 24], [30, -320, 26], [-20, -340, 26], [-60, -300, 26], [-30, -260, 26], [-140, -240, 28], [-260, -270, 30], [-320, -260, 30], [-350, -230, 31], [-380, -250, 32], [-440, -220, 34], [-480, -160, 36], [-450, -110, 34], [-500, -60, 30], [-470, -10, 24]]);
TR('momiji-garden', 'Momiji Garden', 'Aida', 'momiji', 4100, [[0, 0, 14], [200, 0, 14], [260, 20, 15], [280, 80, 18], [240, 130, 20], [160, 120, 20], [120, 170, 22], [150, 240, 24], [230, 260, 24], [260, 320, 22], [220, 370, 20], [130, 360, 18], [90, 300, 18], [20, 290, 18], [-40, 330, 18], [-110, 300, 16], [-120, 220, 15], [-70, 170, 15], [-110, 110, 14], [-100, 30, 14], [-50, 0, 14]]);
TR('pampas-run', 'Pampas Run', 'Buenos Aires', 'pampas', 4500, [[0, 0, 8], [300, 0, 8], [370, 20, 8], [400, 80, 9], [370, 140, 10], [280, 150, 10], [230, 200, 11], [260, 270, 12], [350, 290, 12], [400, 350, 12], [370, 420, 11], [280, 430, 10], [100, 400, 9], [20, 420, 9], [-60, 390, 8], [-80, 310, 8], [-30, 250, 8], [-60, 180, 8], [-140, 160, 8], [-180, 90, 8], [-150, 20, 8], [-90, 0, 8]], { wave: 9 });
TR('sugarloaf-bay', 'Sugarloaf Bay', 'Jacarepaguá', 'tropic', 4700, [[-300, 0, 6], [300, 0, 6], [380, 20, 6], [410, 80, 7], [380, 140, 8], [300, 150, 8], [250, 200, 8], [280, 260, 9], [250, 320, 9], [150, 330, 9], [-300, 320, 7], [-380, 300, 7], [-410, 240, 7], [-370, 190, 7], [-290, 190, 7], [-250, 140, 7], [-290, 90, 6], [-380, 80, 6], [-420, 30, 6], [-380, 0, 6]], { sea: true, lakes: 1, boats: 12, world: 'Tropical Bay', mtnH: 1.8, mountain: [0x3f8f5a, 0x9a9a8a] });
TR('polar-night', 'Polar Night', 'Anderstorp', 'aurora', 4500, [[0, 0, 6], [350, 0, 6], [420, 20, 6], [440, 80, 7], [400, 120, 8], [320, 110, 8], [280, 150, 9], [300, 210, 10], [380, 230, 10], [400, 290, 10], [360, 340, 10], [270, 330, 9], [230, 280, 9], [150, 290, 9], [110, 350, 9], [30, 360, 8], [-30, 320, 8], [-20, 250, 8], [-80, 210, 7], [-90, 130, 7], [-50, 90, 6], [-100, 40, 6], [-60, 0, 6]], { island: 0, lakes: 4, world: 'Polar Night Forest', hills: { amp: 18, freq: 0.006 }, rise: 90, forest: .15, nTrees: 1.8, fill: { n: 9000, shape: 'cone', colors: [0xdfeaf5, 0xc8dcee, 0x9fc0d0, 0xf4f8ff] }, wave: 10 });
TR('casbah-coast', 'Casbah Coast', 'Ain-Diab', 'casbah', 4300, [[0, 0, 6], [400, 20, 6], [470, 50, 7], [490, 120, 10], [440, 300, 20], [390, 360, 22], [320, 370, 22], [100, 330, 18], [-100, 300, 14], [-160, 250, 12], [-170, 180, 10], [-120, 80, 8], [-70, 10, 6]], { seaDir: 1 });

/* ---------- world: terrain, road, sky, vegetation ---------- */
const C3 = h => new THREE.Color(h);
const UNIT = {};
function unitGeos() {
  if (UNIT.box) return UNIT;
  UNIT.box = new THREE.BoxGeometry(1, 1, 1); UNIT.cyl = new THREE.CylinderGeometry(1, 1, 1, 10); UNIT.cone = new THREE.ConeGeometry(1, 1, 7);
  UNIT.sph = new THREE.IcosahedronGeometry(1, 1); UNIT.pyr = new THREE.ConeGeometry(1, 1, 4); UNIT.ball = new THREE.SphereGeometry(1, 14, 10);
  UNIT.hip = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); UNIT.hip.rotateY(Math.PI / 4);           // unit-square pyramid roof
  UNIT.oct = new THREE.CylinderGeometry(1, 1, 1, 8); UNIT.taper = new THREE.CylinderGeometry(.6, 1, 1, 8); UNIT.lo = new THREE.IcosahedronGeometry(1, 0);
  const g = new THREE.CylinderGeometry(1, 1, 1, 3); g.rotateX(-Math.PI / 2); g.scale(1 / 1.732, 1 / 1.5, 1); g.translate(0, 1 / 3, 0); UNIT.gab = g;   // gable prism: x,z in [-.5,.5], y in [0,1]
  return UNIT;
}
function mergeGeo(list) {
  const pos = [], col = [];
  for (const [g0, m, cf] of list) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone(); if (m) g.applyMatrix4(m);
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); const c = cf(p[i], p[i + 1], p[i + 2]); col.push(c[0], c[1], c[2]); }
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); return g;
}
class Builder {
  constructor() { this.items = []; }
  add(geo, color, x, y, z, sx, sy, sz, rx, ry, rz) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new THREE.Vector3(sx, sy, sz));
    const c = C3(color), a = [c.r, c.g, c.b]; this.items.push([geo, m, () => a]); return this;
  }
  geo() { return mergeGeo(this.items); }
  mesh(mat) { return new THREE.Mesh(this.geo(), mat); }
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; }
function textTex(lines, bg, fg, w, h) {
  return canvasTex(w || 512, h || 128, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => { g.font = '800 ' + (l[1] || 56) + 'px system-ui, sans-serif'; g.fillText(l[0], W / 2, H * (i + .5) / lines.length + 2); });
  });
}
function colOf(spec, R, out) {
  if (Array.isArray(spec)) return out.set(spec[Math.floor(R() * spec.length)]);
  return out.setHSL(lerp(spec.h[0], spec.h[1], R()), lerp(spec.s[0], spec.s[1], R()), lerp(spec.l[0], spec.l[1], R()));
}

function makeGround(T) {
  const def = T.def, sx = [], sy = [], sz = [], N = T.N;
  for (let i = 0; i < N; i += 3) if (!T.bridge[i]) { sx.push(T.px[i]); sy.push(T.py[i]); sz.push(T.pz[i]); }
  const n = sx.length, hw = T.hw, wy = T.wy, seed = def.seed, f = def.hills.freq, amp = def.hills.amp, R = rng(seed * 13 + 5);
  // lakes are placed automatically beside the lowest parts of the lap
  const lakes = [], order = Array.from({ length: N }, (_, i) => i).sort((a, b) => T.py[a] - T.py[b]);
  for (let q = 0, tries = 0; q < (def.lakes | 0) && tries < 80; tries++) {
    const i = order[Math.floor(R() * N * .3)], side = R() < .5 ? -1 : 1, dist = 120 + R() * 120, cx = T.px[i] + T.rx[i] * side * dist, cz = T.pz[i] + T.rz[i] * side * dist;
    if (T.dist(cx, cz) < 95 || lakes.some(l => Math.hypot(l[0] - cx, l[1] - cz) < 230)) continue;
    lakes.push([cx, cz, 110 + R() * 100, 80 + R() * 80]); q++;
  }
  // the sea lies off one side of the circuit
  let sdx = 0, sdz = 0, ext = 0; const seaDir = def.sea ? (def.seaDir !== undefined ? def.seaDir : Math.floor(R() * 4)) : -1;
  if (def.sea) { sdx = [1, 0, -1, 0][seaDir]; sdz = [0, 1, 0, -1][seaDir]; ext = -1e9; for (let i = 0; i < N; i++) ext = Math.max(ext, T.px[i] * sdx + T.pz[i] * sdz); }
  const G = { d: 0, lakes, seaDir, wy };
  G.sea = (x, z) => def.sea ? smooth(ext - 30, ext + 75, x * sdx + z * sdz + (fbm(x * .006, z * .006, seed + 6, 3) - .5) * 110) : 0;
  G.h = (x, z) => {
    let sw = 0, sh = 0, dm = 1e12;
    for (let j = 0; j < n; j++) { const dx = x - sx[j], dz = z - sz[j], d2 = dx * dx + dz * dz; if (d2 < dm) dm = d2; const w = 1 / ((d2 + 9) * (d2 + 9)); sw += w; sh += w * sy[j]; }
    const hT = sh / sw, d = Math.sqrt(dm); G.d = d;
    let nat = hT + (fbm(x * f, z * f, seed, 4) - .5) * 2 * amp * smooth(hw + 10, 150, d) + (fbm(x * f * .3, z * f * .3, seed + 9, 3) - .35) * def.rise * smooth(60, 500, d);
    if (def.craters) {
      const cs = 210, gx = Math.floor(x / cs), gz = Math.floor(z / cs);
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
        const a = gx + ox, b = gz + oz, r = 26 + hash2(a, b, seed + 53) * 62, q = Math.hypot(x - (a + hash2(a, b, seed + 31)) * cs, z - (b + hash2(a, b, seed + 47)) * cs) / r;
        if (q < 1.5) nat += (q < 1 ? -.22 * r * (1 - q * q) + .07 * r * q * q : .14 * r * (1.5 - q)) * smooth(hw + 24, hw + 80, d);
      }
    }
    const guard = smooth(hw + 14, hw + 55, d);
    for (const l of lakes) { const q = Math.hypot((x - l[0]) / l[2], (z - l[1]) / l[3]) + (fbm(x * .01, z * .01, seed + 2, 2) - .5) * .35; nat = lerp(nat, wy - 4, (1 - smooth(.75, 1.1, q)) * guard); }
    if (def.sea) nat = lerp(nat, wy - 5, G.sea(x, z) * guard);
    if (def.island) nat = lerp(nat, wy - 5, smooth(def.island, def.island + 70, d + (fbm(x * .008, z * .008, seed + 4, 3) - .5) * 90));
    return lerp(hT - .6, nat, smooth(hw + 8, hw + 26, d));
  };
  const g0 = C3(def.ground[0]), g1 = C3(def.ground[1]), g2 = C3(def.ground[2]), rock = C3(def.rock), sand = C3(def.sand), st = def.stripes, stc = st ? st.colors.map(C3) : null;
  G.color = (x, z, h, slope, out, dd) => {
    const nn = fbm(x * .02, z * .02, seed + 3, 3), m = fbm(x * .006, z * .006, seed + 5, 3);
    out.copy(g0).lerp(g1, smooth(.3, .7, nn)).lerp(g2, smooth(.5, .66, m) * .8);
    if (st && dd > hw + 16) {
      const ang = Math.floor(fbm(x * .0016, z * .0016, seed + 33, 1) * 5) * .9, band = Math.floor((x * Math.cos(ang) + z * Math.sin(ang)) / Math.max(16, st.width)), k = stc.length;
      out.lerp(stc[((band % k) + k) % k], smooth(.4, .5, fbm(x * .0032, z * .0032, seed + 21, 2)) * st.amt * smooth(hw + 16, hw + 34, dd) * (1 - smooth(.25, .55, slope)));
    }
    out.lerp(rock, smooth(.5, 1.0, slope)); if (!def.noWater) out.lerp(sand, 1 - smooth(wy + .3, wy + 2.0, h));
    return out;
  };
  return G;
}

const SKY_VS = 'varying vec3 vDir; void main(){ vDir=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }';
const SKY_FS = `
uniform vec3 top,hor,bot,sunDir,sunCol,cloudCol,nebA,nebB; uniform float time,aurora,stars,cloudAmt,nebAmt; varying vec3 vDir;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=0.,w=.5;for(int i=0;i<4;i++){a+=w*noise(p);p=p*2.03+7.1;w*=.5;}return a;}
void main(){
  vec3 d=normalize(vDir); float h=d.y;
  vec3 col=h>0.?mix(hor,top,pow(h,.5)):mix(hor,bot,pow(-h,.35));
  float sd=max(dot(d,sunDir),0.);
  col+=sunCol*(smoothstep(.9992,.9996,sd)*1.2+pow(sd,60.)*.3+pow(sd,7.)*.12);
  if(nebAmt>0.){ float n1=fbm(d.xz*2.2+d.y*2.6), n2=fbm(d.zy*2.6+vec2(4.3,1.7)); col+=nebAmt*smoothstep(-.1,.25,h)*(nebA*pow(n1,3.)*2.2+nebB*pow(n2,3.)*2.2); }
  if(h>0.){
    vec2 p=d.xz/(h+.18);
    if(cloudAmt>0.){ float c=fbm(p*1.1+vec2(time*.006,0.)); col=mix(col,cloudCol,smoothstep(.5,.78,c)*smoothstep(.0,.25,h)*cloudAmt); }
    if(stars>0.){ vec3 sp=d*150.; vec3 cell=floor(sp); float r=hash(cell.xy+cell.z*17.3); vec3 f=fract(sp)-.5;
      col+=stars*step(.992,r)*smoothstep(.4,.05,length(f))*(.55+.45*sin(time*2.+r*90.))*smoothstep(0.,.2,h); }
    if(aurora>0.){
      float n=fbm(vec2(p.x*.7+time*.03,p.y*.5-time*.01));
      float band=smoothstep(.35,.95,sin(p.y*2.2+n*7.+time*.12)*.5+.5);
      float band2=smoothstep(.5,1.,sin(p.x*1.3-p.y*1.1+n*5.-time*.08)*.5+.5)*.6;
      float rays=.55+.45*sin(p.x*26.+n*30.+time*.7);
      float a=(band+band2)*rays*smoothstep(.03,.22,h)*(1.-smoothstep(.55,.95,h));
      vec3 ac=mix(vec3(.15,1.,.55),vec3(.55,.3,1.),smoothstep(.15,.6,h+n*.25-.1));
      ac=mix(ac,vec3(.1,.8,.95),band2*.5);
      col+=a*ac*aurora*.85;
    }
  }
  gl_FragColor=vec4(col,1.);
}`;

/* tree shapes: [canopy geometry, trunk min, trunk max, radius min, radius max, vertical squash, trunk thickness] */
const TREE_SHAPES = { round: ['round', 2.4, 4.0, 2.5, 3.8, .9, .32], flat: ['round', 4.4, 6.8, 3.6, 5.0, .34, .3], tall: ['round', 2.2, 3.4, 1.5, 2.1, 2.3, .22], bush: ['round', .2, .5, 1.2, 2.0, .75, .2], giant: ['round', 6.5, 10, 5.2, 7.4, .85, .75] };

function buildWorld(T, Q) {
  const def = T.def, R = rng(def.seed * 7 + 1), U = unitGeos(), hw = T.hw, N = T.N, wy = T.wy;
  const W = { group: new THREE.Group(), anim: [], Q }, grp = W.group;
  const ground = makeGround(T); W.ground = ground;
  const pick = a => a[Math.floor(R() * a.length)];
  const lam = (o) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true, flatShading: true }, o || {}));
  const dry = y => def.noWater || y > wy + .8;

  /* sky + light */
  const s = def.sky, sunDir = new THREE.Vector3(...def.sun.dir).normalize(), neb = s.neb || [0, 0];
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C3(s.top) }, hor: { value: C3(s.hor) }, bot: { value: C3(s.bot) }, sunDir: { value: sunDir }, sunCol: { value: C3(def.sun.color) }, cloudCol: { value: C3(s.cloud) }, time: { value: 0 }, aurora: { value: s.aurora || 0 }, stars: { value: s.stars || 0 }, cloudAmt: { value: s.cloudAmt }, nebA: { value: C3(neb[0]) }, nebB: { value: C3(neb[1]) }, nebAmt: { value: s.nebAmt || 0 } }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; grp.add(sky);
  const skyGrp = new THREE.Group(); grp.add(skyGrp); W.skyGrp = skyGrp;
  W.fog = new THREE.FogExp2(def.fog.color, def.fog.density);
  grp.add(new THREE.HemisphereLight(def.amb.sky, def.amb.ground, def.amb.int * (def.night ? .82 : .72)));
  const sun = new THREE.DirectionalLight(def.sun.color, def.sun.int * (def.night ? .8 : .74)); grp.add(sun); grp.add(sun.target);
  if (Q === 2) { sun.castShadow = true; const sc = sun.shadow.camera; sc.left = sc.bottom = -100; sc.right = sc.top = 100; sc.near = 10; sc.far = 600; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6; }

  /* terrain */
  const M = 520, cell = Q === 0 ? 13 : 8.5;
  const x0 = T.minX - M, x1 = T.maxX + M, z0 = T.minZ - M, z1 = T.maxZ + M, nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell);
  const edgeY = def.island ? wy - 5 : T.avgY + def.rise * .12; W.bounds = { x0, x1, z0, z1 };
  const farCol = C3(def.ground[0]).lerp(C3(def.ground[1]), .5);
  {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position, cnt = p.count, H = new Float32Array(cnt), E = new Float32Array(cnt), D = new Float32Array(cnt), col = new Float32Array(cnt * 3), c = new THREE.Color();
    for (let i = 0; i < cnt; i++) { const x = p.getX(i), z = p.getZ(i); const e = smooth(0, .45, Math.min(x - x0, x1 - x, z - z0, z1 - z) / M); E[i] = e; const h = ground.h(x, z); D[i] = ground.d; H[i] = lerp(lerp(edgeY, wy - 5, ground.sea(x, z)), h, e); p.setY(i, H[i]); }
    const cs = (x1 - x0) / nx;
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const i = iz * (nx + 1) + ix, l = iz * (nx + 1) + Math.max(ix - 1, 0), r = iz * (nx + 1) + Math.min(ix + 1, nx), u = Math.max(iz - 1, 0) * (nx + 1) + ix, d = Math.min(iz + 1, nz) * (nx + 1) + ix;
      const sl = Math.hypot(H[r] - H[l], H[d] - H[u]) / (2 * cs);
      ground.color(p.getX(i), p.getZ(i), H[i], sl, c, D[i]); if (!def.island) c.lerp(farCol, 1 - E[i]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; grp.add(m);
    if (!def.island) {
      const fm = new THREE.MeshLambertMaterial({ color: farCol }), B = 9000;
      [[x0 - B / 2, (z0 + z1) / 2, B, z1 - z0 + 2 * B, 2], [x1 + B / 2, (z0 + z1) / 2, B, z1 - z0 + 2 * B, 0], [(x0 + x1) / 2, z0 - B / 2, x1 - x0, B, 3], [(x0 + x1) / 2, z1 + B / 2, x1 - x0, B, 1]].forEach(r => {
        if (r[4] === ground.seaDir) return;
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(r[2], r[3]), fm); pm.rotation.x = -Math.PI / 2; pm.position.set(r[0], edgeY, r[1]); grp.add(pm);
      });
    }
  }
  /* water (or lava, or a sea of cloud) */
  if (!def.noWater) {
    const wd = def.water, wm = wd.glow ? new THREE.MeshLambertMaterial({ color: wd.color, emissive: wd.glow, transparent: wd.opacity < 1, opacity: wd.opacity }) : new THREE.MeshPhongMaterial({ color: wd.color, transparent: true, opacity: wd.opacity, shininess: 110, specular: wd.spec });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), wm); w.rotation.x = -Math.PI / 2; w.position.y = wy; grp.add(w);
  }
  /* road */
  {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const j = i % N, y = T.py[j] + .06, v = i * T.ds / 26;
      pos.push(T.px[j] - T.rx[j] * hw, y, T.pz[j] - T.rz[j] * hw, T.px[j] + T.rx[j] * hw, y, T.pz[j] + T.rz[j] * hw); uv.push(0, v, 1, v);
      if (i < N) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = canvasTex(256, 512, (c, w, h) => {
      c.fillStyle = '#51545e'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { const v = 70 + Math.random() * 40 | 0; c.fillStyle = `rgba(${v},${v},${v + 8},.35)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      c.fillStyle = 'rgba(40,42,50,.22)'; c.fillRect(w * .3, 0, w * .08, h); c.fillRect(w * .62, 0, w * .08, h);
      c.fillStyle = '#f4f4f0'; c.fillRect(7, 0, 5, h); c.fillRect(w - 12, 0, 5, h); c.fillRect(w / 2 - 2.5, 0, 5, h * .42);
    });
    tex.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, color: def.roadTint, side: THREE.DoubleSide })); m.receiveShadow = true; grp.add(m);
  }
  /* curbs, verge, rails, bridge deck */
  {
    const pos = [], col = [], c = new THREE.Color();
    const quad = (a, b, cc, d, k) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], cc[0], cc[1], cc[2], b[0], b[1], b[2], d[0], d[1], d[2], cc[0], cc[1], cc[2]); for (let i = 0; i < 6; i++) col.push(k.r, k.g, k.b); };
    const P = (i, lat, dy) => [T.px[i] + T.rx[i] * lat, T.py[i] + dy, T.pz[i] + T.rz[i] * lat];
    const c0 = C3(def.curb[0]), c1 = C3(def.curb[1]), stone = C3(0xc2bdb2), stoneD = C3(0x8f8a80), railA = C3(0xffffff), railB = C3(def.curb[0]);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, band = (Math.floor(i / 2) % 2) ? c0 : c1;
      for (const sd of [-1, 1]) {
        const wi = T.wall[i], wj = T.wall[j];
        if (T.bridge[i]) {
          quad(P(i, sd * hw, .05), P(i, sd * (hw + 1.4), .05), P(j, sd * hw, .05), P(j, sd * (hw + 1.4), .05), stone);
          quad(P(i, sd * (hw + 1.4), .05), P(i, sd * (hw + 1.4), -1.7), P(j, sd * (hw + 1.4), .05), P(j, sd * (hw + 1.4), -1.7), stoneD);
        } else {
          quad(P(i, sd * hw, .07), P(i, sd * (hw + 1.5), .11), P(j, sd * hw, .07), P(j, sd * (hw + 1.5), .11), band);
          const oi = Math.min(hw + 9.5, wi + .2), oj = Math.min(hw + 9.5, wj + .2);
          const mi = P(i, sd * oi, -1.3 * (oi - hw - 1.5) / 8);
          ground.color(mi[0], mi[2], T.py[i], 0, c, 0);
          quad(P(i, sd * (hw + 1.5), .05), mi, P(j, sd * (hw + 1.5), .05), P(j, sd * oj, -1.3 * (oj - hw - 1.5) / 8), c.clone());
        }
        if (wi < hw + 11.6) {
          const rc = (Math.floor(i / 3) % 2) ? railA : railB;
          quad(P(i, sd * wi, -.4), P(i, sd * wi, 1.15), P(j, sd * wj, -.4), P(j, sd * wj, 1.15), rc);
          quad(P(i, sd * wi, 1.15), P(i, sd * (wi + .5), 1.15), P(j, sd * wj, 1.15), P(j, sd * (wj + .5), 1.15), stone);
          quad(P(i, sd * (wi + .5), -.4), P(i, sd * (wi + .5), 1.15), P(j, sd * (wj + .5), -.4), P(j, sd * (wj + .5), 1.15), rc);
        }
      }
      if (T.bridge[i]) quad(P(i, -hw - 1.4, -1.7), P(i, hw + 1.4, -1.7), P(j, -hw - 1.4, -1.7), P(j, hw + 1.4, -1.7), stoneD);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.receiveShadow = true; grp.add(m);
  }
  const B = new Builder(), BE = new Builder(), glow = [];   // static lit props, static glowing props, glow sprites
  /* bridge pillars */
  for (let i = 0; i < N; i += 6) if (T.bridge[i]) {
    let ok = true; for (let j = 0; j < N; j += 2) if (T.under[j] && Math.hypot(T.px[i] - T.px[j], T.pz[i] - T.pz[j]) < hw + 14.5) { ok = false; break; }
    const gy = ground.h(T.px[i], T.pz[i]), hgt = T.py[i] - 1.7 - gy + 1;
    if (ok && hgt > 1.5) for (const sd of [-1, 1]) B.add(U.box, 0xb0aba0, T.px[i] + T.rx[i] * sd * (hw - 1), gy - 1 + hgt / 2, T.pz[i] + T.rz[i] * sd * (hw - 1), 2.2, hgt, 2.2, 0, T.th[i], 0);
  }
  /* start line + gantry + grandstand */
  W.lights = [];
  const dummy = new THREE.Object3D();
  {
    const chk = canvasTex(256, 32, (c) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 16, y * 16, 16, 16); } });
    const g = new THREE.PlaneGeometry(2 * hw, 2.6); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: chk })); m.position.set(T.px[0], T.py[0] + .09, T.pz[0]); m.rotation.y = T.th[0]; grp.add(m);
    const gi = 4, th = T.th[gi], y = T.py[gi];
    for (const sd of [-1, 1]) B.add(U.cyl, 0x39404f, T.px[gi] + T.rx[gi] * sd * (hw + 3), y + 4.6, T.pz[gi] + T.rz[gi] * sd * (hw + 3), .38, 10.5, .38);
    B.add(U.box, 0x39404f, T.px[gi], y + 9.6, T.pz[gi], 2 * hw + 7, 1.9, .7, 0, th, 0);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2 * hw + 5, 1.7), new THREE.MeshBasicMaterial({ map: textTex([['TEDDY ROOK RACING  ·  ' + def.name.toUpperCase(), 40]], '#1b2030', '#ffffff', 1024, 64), side: THREE.DoubleSide }));
    sign.position.set(T.px[gi] - T.tx[gi] * .4, y + 9.6, T.pz[gi] - T.tz[gi] * .4); sign.rotation.y = th + Math.PI; grp.add(sign);
    for (let l = 0; l < 5; l++) {
      const lm = new THREE.Mesh(U.ball, new THREE.MeshBasicMaterial({ color: 0x222222 })); lm.scale.setScalar(.55);
      const lat = (l - 2) * 2.4; lm.position.set(T.px[gi] + T.rx[gi] * lat - T.tx[gi] * .5, y + 7.9, T.pz[gi] + T.rz[gi] * lat - T.tz[gi] * .5); grp.add(lm); W.lights.push(lm);
    }
    const si = (N - 16) % N, sd = -1, crowd = [];
    for (let r = 0; r < 5; r++) {
      const lat = sd * (hw + 14 + r * 2.2), cx = T.px[si] + T.rx[si] * lat, cz = T.pz[si] + T.rz[si] * lat, gy = T.py[si] - .6;
      B.add(U.box, 0xd9dde6, cx, gy + (r + 1) * .55, cz, 2.2, (r + 1) * 1.1, 46, 0, T.th[si], 0);
      for (let q = 0; q < 46; q++) if (R() < .85) { const o = -22 + q; crowd.push({ x: cx + T.tx[si] * o, y: gy + (r + 1) * 1.1 + .55, z: cz + T.tz[si] * o, c: pick([0xff5a5f, 0xffd23d, 0x29b6f6, 0x7ccf4a, 0xff7fb0, 0xffffff, 0x9b6fe0, 0xff8a3d]) }); }
    }
    const lat = sd * (hw + 19), cx = T.px[si] + T.rx[si] * lat, cz = T.pz[si] + T.rz[si] * lat;
    B.add(U.box, def.curb[0], cx, T.py[si] + 9.5, cz, 13, .4, 48, 0, T.th[si], -.12 * sd);
    for (const o of [-22, 0, 22]) B.add(U.cyl, 0x8a93a6, cx + T.rx[si] * sd * 5.5 + T.tx[si] * o, T.py[si] + 4.5, cz + T.rz[si] * sd * 5.5 + T.tz[si] * o, .3, 10.5, .3);
    const cm = new THREE.InstancedMesh(U.box, new THREE.MeshLambertMaterial(), crowd.length);
    crowd.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.scale.set(.6, 1.1, .6); dummy.rotation.set(0, T.th[si], 0); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); cm.setColorAt(i, C3(p.c)); });
    grp.add(cm); W.crowd = { mesh: cm, list: crowd, th: T.th[si] };
  }

  /* vegetation */
  const shade = (lo, hi, y0, y1) => (x, y, z) => { const t = lo + (hi - lo) * clamp((y - y0) / (y1 - y0), 0, 1); return [t, t, t]; };
  const mat4 = (x, y, z, sx, sy, sz, rx, ry, rz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx, sy, sz));
  const pineParts = [[1, 1.25, .62], [.78, 1.1, 1.3], [.55, 1.0, 1.95]], sh = shade(.7, 1.08, -1, 1);
  const GEO = {
    round: mergeGeo([[U.sph, mat4(0, 0, 0, 1, 1, 1), sh], [U.lo, mat4(.72, -.25, .3, .7, .68, .7), sh], [U.lo, mat4(-.6, -.2, -.45, .75, .74, .75), sh], [U.lo, mat4(.1, .55, -.1, .68, .66, .68), sh]]),
    pine: mergeGeo(pineParts.map(p => [U.cone, mat4(0, p[2], 0, p[0], p[1], p[0]), shade(.72, 1.1, 0, 2.4)])),
    pineSnow: mergeGeo(pineParts.map(p => [U.cone, mat4(0, p[2], 0, p[0], p[1], p[0]), (x, y, z) => (y - p[2]) / p[1] > -.12 ? [.95, .98, 1.05] : [.2, .42, .36]])),
    cypress: mergeGeo([[U.cone, mat4(0, 1.3, 0, .48, 2.6, .48), shade(.7, 1.1, 0, 2.6)]]),
    palm: mergeGeo([0, 1, 2, 3, 4, 5, 6].map(i => [U.pyr, new THREE.Matrix4().makeRotationY(i * TAU / 7).multiply(mat4(0, -.12, .62, .2, 1.35, .09, 1.95, 0, 0)), shade(.8, 1.1, -.6, .2)])),
    cactus: mergeGeo([[U.oct, mat4(0, 1.6, 0, .36, 3.2, .36), shade(.8, 1.1, 0, 3.2)], [U.oct, mat4(.62, 1.5, 0, .2, .9, .2, 0, 0, Math.PI / 2), shade(.9, .9, 0, 1)], [U.oct, mat4(1.0, 2.05, 0, .2, 1.3, .2), shade(.85, 1.1, 1.4, 2.7)], [U.oct, mat4(-.58, 1.0, 0, .2, .8, .2, 0, 0, Math.PI / 2), shade(.9, .9, 0, 1)], [U.oct, mat4(-.9, 1.5, 0, .2, 1.1, .2), shade(.85, 1.1, 1, 2)]]),
    crystal: mergeGeo([[new THREE.OctahedronGeometry(1, 0), mat4(0, 1.5, 0, .5, 1.7, .5), shade(.55, 1.15, 0, 3.2)], [new THREE.OctahedronGeometry(1, 0), mat4(.5, .8, .2, .28, .95, .28, 0, 0, -.35), shade(.55, 1.1, 0, 2)], [new THREE.OctahedronGeometry(1, 0), mat4(-.4, .7, -.3, .24, .8, .24, .3, 0, .3), shade(.55, 1.1, 0, 2)]]),
    trunk: (() => { const g = new THREE.CylinderGeometry(.6, 1, 1, 6); g.translate(0, .5, 0); return g; })(),
    fillblob: mergeGeo([[U.lo, mat4(0, 0, 0, 1, .8, 1), shade(.62, 1.1, -.8, .8)]]),
    fillcone: mergeGeo([[new THREE.ConeGeometry(1, 1, 6), mat4(0, .5, 0, 1, 1, 1), shade(.62, 1.12, 0, 1)]]),
  };
  const veg = {}, vegS = {}; for (const k of ['round', 'pine', 'pineSnow', 'cypress', 'palm', 'cactus', 'crystal', 'trunk']) { veg[k] = []; vegS[k] = []; }
  const jitter = (hex) => { const c = C3(hex), f = .88 + R() * .24; c.r *= f; c.g *= f; c.b *= f; return c; };
  const tcol = (spec) => { const c = colOf(spec, R, new THREE.Color()), f = .9 + R() * .2; c.r *= f; c.g *= f; c.b *= f; return c; };
  function addTree(type, x, z, colors, trunkCol, near) {
    const y = ground.h(x, z); if (!dry(y)) return false;
    const V = near ? vegS : veg, sc = .8 + R() * .75, ry = R() * TAU, col = tcol(colors), S = TREE_SHAPES[type];
    if (S) { const th = lerp(S[1], S[2], R()) * sc, r = lerp(S[3], S[4], R()) * sc, tk = S[6] * sc; V.trunk.push([x, y - .3, z, tk, th + .5, tk, ry, C3(trunkCol)]); V.round.push([x, y + th + r * S[5] * .55, z, r, r * S[5], r, ry, col]); }
    else if (type === 'pine' || type === 'pineSnow') { V.trunk.push([x, y - .3, z, .3 * sc, 1.6 * sc, .3 * sc, ry, C3(trunkCol)]); V[type].push([x, y + .9 * sc, z, 2.3 * sc, 3.7 * sc, 2.3 * sc, ry, col]); }
    else if (type === 'cypress') V.cypress.push([x, y - .2, z, 2.2 * sc, 3.6 * sc, 2.2 * sc, ry, col]);
    else if (type === 'palm') { const th = (6 + R() * 4) * sc; V.trunk.push([x, y - .3, z, .22 * sc, th + .3, .22 * sc, ry, C3(trunkCol)]); V.palm.push([x, y + th, z, 3.4 * sc, 3.4 * sc, 3.4 * sc, ry, col]); }
    else if (type === 'cactus') V.cactus.push([x, y - .2, z, 1.5 * sc, 1.5 * sc * (.8 + R() * .6), 1.5 * sc, ry, col]);
    else if (type === 'crystal') V.crystal.push([x, y - .4, z, 1.6 * sc, 1.6 * sc * (.8 + R() * 1.4), 1.6 * sc, ry, col]);
    return true;
  }
  const rs = def.roadside;
  for (let row = 0; row < (rs[3] >= .85 ? 2 : 1); row++) for (let i = row * 2; i < N; i += 4) for (const sd of [-1, 1]) {
    if (R() > rs[3] || T.bridge[i] || T.under[i]) continue;
    const lat = sd * (hw + 14.5 + row * 11 + R() * 9), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat;
    if (T.dist(x, z) > hw + 12.5) addTree(rs[0], x, z, rs[1], rs[2], true);
  }
  {
    const target = [700, 1500, 2500][Q] * (def.nTrees || 1), tw = def.trees.reduce((a, t) => a + t[1], 0); let made = 0;
    for (let tr = 0; tr < target * 8 && made < target; tr++) {
      const i = Math.floor(R() * N), lat = (R() < .5 ? -1 : 1) * (hw + 26 + Math.pow(R(), 1.5) * 250), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat;
      if (T.dist(x, z) < hw + 16) continue;
      if (fbm(x * .0045, z * .0045, def.seed + 8, 3) < def.forest && R() > .1) continue;
      let w = R() * tw, t = def.trees[0]; for (const q of def.trees) { w -= q[1]; if (w <= 0) { t = q; break; } }
      if (addTree(t[0], x, z, t[2], t[3], false)) made++;
    }
  }
  function inst(geo, mat, list, cast) {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.scale.set(p[3], p[4], p[5]); dummy.rotation.set(0, p[6], 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, p[7]); });
    m.castShadow = !!cast; grp.add(m); return m;
  }
  const vmat = lam(), tmat = new THREE.MeshLambertMaterial({ flatShading: true }), cmat = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const V of [veg, vegS]) {
    for (const k of ['round', 'pine', 'pineSnow', 'cypress', 'palm', 'cactus']) inst(GEO[k], vmat, V[k], V === vegS);
    inst(GEO.crystal, cmat, V.crystal, false); inst(GEO.trunk, tmat, V.trunk, V === vegS);
  }
  /* distant forest: a cheap canopy on every hillside */
  if (def.fill && def.fill.n) {
    const fl = [], want = Math.round(def.fill.n * [.3, .65, 1][Q]), cone = def.fill.shape === 'cone';
    for (let tr = 0; tr < want * 5 && fl.length < want; tr++) {
      const x = lerp(x0 + 30, x1 - 30, R()), z = lerp(z0 + 30, z1 - 30, R());
      if (fbm(x * .0045, z * .0045, def.seed + 8, 3) < def.forest - .04 && R() > .15) continue;
      if (T.dist(x, z) < 190) continue;
      const y = ground.h(x, z); if (!dry(y + .2)) continue;
      const r = cone ? 3 + R() * 2.2 : 4.6 + R() * 3.8;
      fl.push(cone ? [x, y - .5, z, r, r * (2.6 + R() * 1.2), r, R() * 3, tcol(def.fill.colors)] : [x, y + r * .5, z, r, r * (.9 + R() * .5), r, R() * 3, tcol(def.fill.colors)]);
    }
    inst(cone ? GEO.fillcone : GEO.fillblob, vmat, fl, false);
  }
  /* flowers, grass tufts, rocks */
  {
    const fl = [], gr = [], rk = [], nF = [1200, 3200, 6000][Q] * (def.nFlowers === undefined ? 1 : def.nFlowers);
    for (let q = 0; q < nF * 1.5; q++) {
      const i = Math.floor(R() * N); if (T.bridge[i]) continue;
      const lat = (R() < .5 ? -1 : 1) * (hw + 10.5 + R() * R() * 34), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat, y = ground.h(x, z);
      if (!dry(y - .4) || ground.d < hw + 9) continue;
      if (q % 3) fl.push([x, y + .25, z, .24 + R() * .16, .2, .24 + R() * .16, R() * 3, jitter(pick(def.flowers))]);
      else gr.push([x, y, z, .22, .5 + R() * .5, .22, R() * 3, jitter(def.grass)]);
    }
    for (let q = 0; q < (def.rocks || 140); q++) {
      const i = Math.floor(R() * N), lat = (R() < .5 ? -1 : 1) * (hw + 13 + R() * (def.rocks ? 220 : 60)), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat, y = ground.h(x, z);
      if (T.bridge[i] || T.under[i] || ground.d < hw + 12.5) continue; const sc = .7 + R() * R() * (def.rocks ? 5 : 2.2); rk.push([x, y + sc * .2, z, sc, sc * .7, sc * 1.2, R() * 3, jitter(def.rock)]);
    }
    inst(new THREE.OctahedronGeometry(1, 0), tmat, fl);
    const gg = new THREE.ConeGeometry(1, 1, 4); gg.translate(0, .5, 0); inst(gg, tmat, gr);
    inst(new THREE.DodecahedronGeometry(1, 0), tmat, rk, true);
  }
  /* clouds */
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (def.clouds) {
    const list = [], cc = C3(s.cloud);
    for (let q = 0; q < def.clouds; q++) {
      const a = R() * TAU, rad = 500 + R() * 2400, bx = Math.cos(a) * rad, bz = Math.sin(a) * rad, by = T.maxY + 300 + R() * 260, big = .8 + R() * .9;
      for (let k = 0; k < 6; k++) list.push([bx + (R() - .5) * 190 * big, by + (R() - .5) * 26, bz + (R() - .5) * 120 * big, (55 + R() * 55) * big, (24 + R() * 16) * big, (45 + R() * 40) * big, R() * 3]);
    }
    const cm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: cc.clone().multiplyScalar(.28), emissive: cc.clone().multiplyScalar(def.night ? .3 : .78), fog: false, transparent: true, opacity: def.night ? .7 : .96 }), list.length);
    list.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.scale.set(p[3], p[4], p[5]); dummy.rotation.set(0, p[6], 0); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); });
    const cg = new THREE.Group(); cg.position.set(cx, 0, cz); cg.add(cm); grp.add(cg); W.anim.push((t, dt) => { cg.rotation.y += dt * .004; });
  }
  /* mountains */
  const R0 = Math.hypot(x1 - x0, z1 - z0) / 2 + 260, baseY = (def.island ? wy : edgeY) - 30;
  {
    const items = [], mc = C3(def.mountain[0]), sc = C3(def.mountain[1]), mh = def.mtnH || 1;
    for (let q = 0; q < 54; q++) {
      const a = q / 54 * TAU + R() * .1, rad = R0 + 350 + (mh - 1) * 600 + R() * 1300, hgt = (170 + R() * 300 + (rad - R0) * .16) * mh, br = hgt * (1.1 + R() * .8) / Math.sqrt(mh), g = new THREE.ConeGeometry(1, 1, 9, 4), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < .49) { const j = 1 + (hash2(i, q, 5) - .5) * .5; p.setX(i, p.getX(i) * j); p.setZ(i, p.getZ(i) * j); p.setY(i, y + (hash2(i, q, 9) - .5) * .12); } }
      const line = .08 + R() * .16;
      items.push([g, mat4(cx + Math.cos(a) * rad, baseY + hgt / 2, cz + Math.sin(a) * rad, br, hgt, br, 0, R() * 3, 0), (x, y, z) => { const t = (y - baseY) / hgt, c = t > .5 + line + (hash2(Math.round(x * .05), Math.round(z * .05), 3) - .5) * .12 ? sc : mc, f = .72 + t * .4; return [c.r * f, c.g * f, c.b * f]; }]);
    }
    grp.add(new THREE.Mesh(mergeGeo(items), lam()));
  }
  /* landmarks, creatures, floating things */
  const dot = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  buildProps({ T, def, W, grp, B, BE, R, U, ground, lam, glow, pick, mat4, shade, wy, hw, N, dry, dummy, cx, cz, R0, baseY, skyGrp, sunDir, Q, bounds: W.bounds });
  const bm = B.mesh(lam()); bm.castShadow = true; grp.add(bm);
  if (BE.items.length) grp.add(BE.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  if (glow.length) {
    const pos = [], col = []; glow.forEach(g => { pos.push(g[0], g[1], g[2]); const c = C3(g[3]); col.push(c.r, c.g, c.b); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    grp.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 13, map: dot, vertexColors: true, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending })));
  }
  /* drifting petals / leaves / snow / embers / bubbles */
  W.particles = () => { };
  if (def.particles.n) {
    const pc = def.particles, n = Math.round(pc.n * [.4, .75, 1][Q]), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = new Float32Array(n), BX = 110, BY = 46;
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() - .5) * BX; pos[i * 3 + 1] = R() * BY; pos[i * 3 + 2] = (R() - .5) * BX; const c = C3(pick(pc.colors)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; ph[i] = R() * 20; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tex = pc.round ? dot : canvasTex(32, 32, c => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(16, 16, 14, 8, .6, 0, TAU); c.fill(); });
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: pc.size, map: tex, vertexColors: true, transparent: true, alphaTest: .15, depthWrite: false })); pts.frustumCulled = false; grp.add(pts);
    W.particles = (t, dt, cam) => {
      const wxv = pc.wind[0], wzv = pc.wind[1];
      for (let i = 0; i < n; i++) {
        let x = pos[i * 3] + (wxv + Math.sin(t * .9 + ph[i]) * pc.sway) * dt, y = pos[i * 3 + 1] - pc.fall * (0.7 + (ph[i] % 1) * .6) * dt, z = pos[i * 3 + 2] + (wzv + Math.cos(t * .7 + ph[i]) * pc.sway) * dt;
        x = cam.x + ((((x - cam.x + BX / 2) % BX) + BX) % BX) - BX / 2; z = cam.z + ((((z - cam.z + BX / 2) % BX) + BX) % BX) - BX / 2; y = cam.y - 8 + ((((y - cam.y + 8) % BY) + BY) % BY);
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      }
      g.attributes.position.needsUpdate = true;
    };
  }
  W.signArch = (i, text, color) => {
    const b = new Builder(), y = T.py[i];
    for (const sd of [-1, 1]) b.add(U.cyl, color, T.px[i] + T.rx[i] * sd * (T.wall[i] + .6), y + 3.6, T.pz[i] + T.rz[i] * sd * (T.wall[i] + .6), .25, 8.6, .25);
    const g = new THREE.Group(), m = b.mesh(lam()); g.add(m);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2 * T.wall[i] + 1.2, 2), new THREE.MeshBasicMaterial({ map: textTex([[text, 64]], '#' + C3(color).getHexString(), '#ffffff', 1024, 96), side: THREE.DoubleSide, transparent: true, opacity: .93 }));
    sg.position.set(T.px[i], y + 7, T.pz[i]); sg.rotation.y = T.th[i] + Math.PI; g.add(sg); return g;
  };
  W.update = (t, dt, cam, focus) => {
    sky.position.copy(cam); skyGrp.position.copy(cam); skyMat.uniforms.time.value = t;
    for (const a of W.anim) a(t, dt);
    W.particles(t, dt, cam);
    sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(sunDir, 260);
    if (W.crowd && (W.crowdT = (W.crowdT || 0) + dt) > .05) {
      W.crowdT = 0; const cm = W.crowd.mesh; W.crowd.list.forEach((p, i) => { if ((i * 7 + Math.floor(t * 3)) % 5 === 0) { dummy.position.set(p.x, p.y + Math.abs(Math.sin(t * 6 + i)) * .35, p.z); dummy.scale.set(.6, 1.1, .6); dummy.rotation.set(0, W.crowd.th, 0); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); } }); cm.instanceMatrix.needsUpdate = true;
    }
  };
  W.dispose = () => grp.traverse(o => { if (o.geometry && !Object.values(UNIT).includes(o.geometry)) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
  return W;
}

/* ---------- landmarks, creatures and floating things; all placed automatically around any circuit ---------- */
const HOUSES = {
  pastel: [[0xffd9a8, 0xffb8b8, 0xfff0c8, 0xc8e0ff, 0xffe0e8, 0xfff4e0], 0xc8553a], white: [[0xffffff, 0xf6f2ea, 0xfff8ee], 0x2f6fd8], stone: [[0xc8bca8, 0xb8ac98, 0xd8ccb8], 0x6a5a52],
  tuscan: [[0xe8c890, 0xd8a870, 0xf0d8a8], 0xb85a3a], provence: [[0xf2e2c0, 0xe8d0a8, 0xf8ecd0], 0xc8693a], dutch: [[0xb8553a, 0xc8693a, 0xe8dcc8], 0x3a3a42], china: [[0xe8e0d0, 0xd8d0c0], 0x2f5a4a],
};
const CRITTERS = {   // body length, body height, body width, leg, neck, head, colour, second colour
  cow: [2.3, 1.2, 1.0, 1.0, .5, .8, 0xfaf6ee, 0x2a2a2a], sheep: [1.4, .9, .9, .55, .2, .5, 0xf4f0e8, 0x3a3a3a], deer: [1.7, .9, .6, 1.2, 1.0, .5, 0xa8703a, 0xe8d8c0], horse: [2.3, 1.1, .8, 1.5, 1.2, .7, 0x7a4a2a, 0x2a1a12],
  camel: [2.6, 1.3, .9, 1.8, 1.7, .7, 0xc89a60, 0xb88a50], giraffe: [2.4, 1.3, .8, 2.8, 4.4, .8, 0xe8b850, 0x8a5a2a], elephant: [3.8, 2.6, 2.0, 1.9, .3, 1.5, 0x8a8a92, 0x7a7a82], zebra: [2.1, 1.1, .7, 1.3, 1.0, .65, 0xf4f4f4, 0x1a1a1a],
  roo: [1.2, 1.5, .7, .9, .5, .5, 0xb87a4a, 0xe8c8a0], flamingo: [.8, .6, .5, 1.6, 1.4, .3, 0xff7fa8, 0xff5a8a],
};
function buildProps(X) {
  const { T, def, W, grp, B, BE, R, U, ground, lam, glow, pick, mat4, shade, wy, hw, N, dry, dummy, cx, cz, R0, baseY, skyGrp, Q } = X;
  const night = !!def.night, used = [], marble = 0xf2eee4; W.marks = [];
  const A = (p, sc, Bx) => { const c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), k = sc || 1; return (geo, col, x, y, z, sx, sy, sz, rx, ry, rz) => (Bx || B).add(geo, col, p.x + (c * x + s * z) * k, p.y + y * k, p.z + (-s * x + c * z) * k, sx * k, sy * k, sz * k, rx || 0, (ry || 0) + (p.yaw || 0), rz || 0); };
  function place(frac, side, dist, rad, wet) {
    for (let t = 0; t < 18; t++) {
      const i = T.at(frac + (t >> 1) * .041 * (t % 2 ? 1 : -1)), sd = (t % 4 < 2 ? side : -side), d = dist * (1 + (t >> 2) * .3), x = T.px[i] + T.rx[i] * sd * (hw + d), z = T.pz[i] + T.rz[i] * sd * (hw + d);
      if (T.dist(x, z) < hw + 14 + rad || used.some(u => Math.hypot(u[0] - x, u[1] - z) < u[2] + rad)) continue;
      const y = ground.h(x, z); if (!wet && !dry(y)) continue;
      used.push([x, z, rad]); return { x, y, z, th: T.th[i], i, side: sd, yaw: Math.atan2(T.px[i] - x, T.pz[i] - z) };
    }
    return null;
  }
  // straight, clear stretches where something can span the road
  const spotsUsed = [];
  function spot(frac) {
    for (let t = 0; t < 60; t++) {
      const i = T.at(frac + t * .013 * (t % 2 ? 1 : -1));
      if (Math.abs(T.kapS[i]) > .006 || T.bridge[i] || T.under[i] || T.wall[i] < hw + 11.9 || i < 30 || i > N - 40) continue;
      if (spotsUsed.some(s => Math.min(Math.abs(s - i), N - Math.abs(s - i)) < 36)) continue;
      let ok = true; for (const sd of [-1, 1]) if (T.dist(T.px[i] + T.rx[i] * sd * (hw + 20), T.pz[i] + T.rz[i] * sd * (hw + 20)) < hw + 14) ok = false;
      if (!ok) continue; spotsUsed.push(i); return i;
    }
    return -1;
  }
  const lit = (x, y, z, col, size) => glow.push([x, y, z, col, size || 12]);

  /* ----- things placed beside the circuit: name -> [min dist, max dist, footprint radius, builder] ----- */
  const K = {};
  K.pyramid = [150, 320, 70, (p, o, k) => { const a = A(p), s = k ? .5 + R() * .4 : 1, r = 124 * s, h = 80 * s, c = night ? 0xa898b8 : 0xe6c486; a(U.hip, c, 0, h / 2 - 5, 0, r, h + 10, r); a(U.hip, 0xffe9a8, 0, h * .94, 0, r * .13, h * .13, r * .13); if (night) lit(p.x, p.y + h + 3, p.z, 0xffe9a8, 40); }];
  K.sphinx = [34, 70, 22, (p) => { const a = A(p, 1.5), c = 0xdcb878; a(U.box, 0xc8a468, 0, .8, 2, 12, 1.6, 34); a(U.box, c, 0, 4.4, 0, 8, 6, 24); a(U.box, c, 0, 9.5, 10, 5.4, 6.6, 5.4); a(U.box, 0x2f6fb5, 0, 10.4, 8.4, 7.6, 7.4, 2.6); a(U.box, 0xffd76a, 0, 13.4, 10.2, 5.8, 1, 5.8); for (const s of [-1, 1]) a(U.box, c, s * 3, 1.8, 15, 2.2, 2.2, 9); }];
  K.obelisk = [15.5, 26, 2.5, (p) => { const a = A(p), h = 20 + R() * 12; a(U.box, 0xd8b078, 0, 1, 0, 4.4, 2, 4.4); a(U.taper, 0xe8c890, 0, h / 2 + 2, 0, 1.5, h, 1.5, 0, Math.PI / 8); a(U.hip, 0xffd76a, 0, h + 3.2, 0, 2.3, 2.6, 2.3); }];
  K.temple = [55, 150, 32, (p, o) => {
    const a = A(p, .9 + R() * .5), eg = o === 'egypt', w = 22, d = eg ? 30 : 40, h = eg ? 15 : 13, col = eg ? 0xe0c088 : marble, roof = o === 'rome' ? 0xc8553a : eg ? 0xd0b078 : 0xe8e2d4;
    a(U.box, col, 0, -3, 0, w + 7, 8, d + 7); a(U.box, col, 0, 1.6, 0, w + 3.5, 1.2, d + 3.5); a(U.box, eg ? 0xc8a468 : 0xdcd6c8, 0, 2.2 + h / 2, 0, w - 7, h, d - 9);
    for (let x = -w / 2; x <= w / 2 + .1; x += w / 5) for (let z = -d / 2; z <= d / 2 + .1; z += d / (eg ? 6 : 9)) if (Math.abs(x) > w / 2 - .2 || Math.abs(z) > d / 2 - .2) { a(U.cyl, eg && (Math.round(x + z) & 1) ? 0xd87a4a : col, x, 2.2 + h / 2, z, eg ? 1.4 : .95, h, eg ? 1.4 : .95); if (!eg) a(U.box, col, x, 2.4 + h, z, 2.5, .5, 2.5); }
    a(U.box, col, 0, 3.4 + h, 0, w + 2.4, 2, d + 2.4); if (eg) a(U.box, 0x2f6fb5, 0, 4.9 + h, 0, w + 3.4, 1, d + 3.4); else a(U.gab, roof, 0, 4.4 + h, 0, w + 3.4, 5.5, d + 3.4);
    if (night) for (const s of [-1, 1]) { a(U.ball, 0xffb060, s * 4, 4, d / 2 + 3, .7, .9, .7, 0, 0, 0); lit(p.x, p.y + 6, p.z, 0xffb060, 22); }
  }];
  K.mausoleum = [70, 150, 30, (p) => { const a = A(p, 1.2); a(U.box, marble, 0, 6, 0, 30, 20, 26); for (let x = -13; x <= 13; x += 4.33) for (const z of [-11, 11]) a(U.cyl, marble, x, 22, z, .9, 12, .9); for (let z = -6.6; z <= 7; z += 4.4) for (const x of [-13, 13]) a(U.cyl, marble, x, 22, z, .9, 12, .9); a(U.box, 0xdcd6c8, 0, 22, 0, 22, 12, 18); a(U.box, marble, 0, 29, 0, 30, 2, 26); for (let s = 0; s < 7; s++) a(U.box, s % 2 ? marble : 0xe4ddd0, 0, 31 + s * 1.7, 0, 28 - s * 3.6, 1.7, 24 - s * 3.1); a(U.box, 0xffd76a, 0, 45, 0, 5, 4, 3); }];
  K.colosseum = [110, 210, 78, (p) => {
    const a = A(p, 1.15), ra = 56, rb = 43, n = 44, gap = R() * TAU;
    a(U.oct, 0xe0cc9a, 0, .4, 0, ra * .8, 1, rb * .8);
    for (let t = 0; t < 4; t++) for (let k = 0; k < n; k++) {
      const an = k / n * TAU, da = Math.abs(wrapAngle(an - gap)); if (t >= 2 && da < .5 + (t - 2) * .5) continue;
      const x = Math.cos(an) * ra, z = Math.sin(an) * rb, tan = Math.atan2(-Math.sin(an) * ra, Math.cos(an) * rb), ry = -tan;
      a(U.box, t % 2 ? 0xe8dcc0 : 0xdccfae, x, 4.5 + t * 9.6, z, 3, 8.2, 4.6, 0, ry + Math.PI / 2, 0); a(U.box, 0xf0e6cc, x, 9.2 + t * 9.6, z, 8.4, 1.5, 5.2, 0, ry, 0);
      if (t < 3) a(U.box, 0xe4d8ba, x * .86, 4.5 + t * 9.6, z * .86, 2.4, 8.2, 2.4, 0, ry, 0);
    }
    if (night) lit(p.x, p.y + 20, p.z, 0xff9a4a, 70);
  }];
  K.lighthouse = [40, 120, 12, (p) => { const a = A(p, 1.1); a(U.box, 0xd8ccb8, 0, 5, 0, 16, 14, 16); a(U.box, marble, 0, 22, 0, 10, 20, 10); a(U.oct, marble, 0, 39, 0, 3.6, 14, 3.6); a(U.cyl, 0xd8ccb8, 0, 47, 0, 2.6, 3, 2.6); a(U.ball, 0xffe9a8, 0, 50, 0, 2, 2, 2, 0, 0, 0); a(U.cone, 0xc8553a, 0, 53.2, 0, 2.8, 3.4, 2.8); A(p, 1.1, BE)(U.ball, 0xfff2b0, 0, 50, 0, 1.7, 1.7, 1.7); lit(p.x, p.y + 55, p.z, 0xfff2b0, night ? 46 : 20); }];
  K.ziggurat = [100, 190, 62, (p) => {
    const a = A(p, 1.1), brick = 0xc89a68;
    for (let t = 0; t < 5; t++) {
      const w = 100 - t * 18, y = 4 + t * 9; a(U.box, t % 2 ? brick : 0xd8aa78, 0, y - (t ? 0 : 5), 0, w, 9 + (t ? 0 : 10), w);
      for (let q = 0; q < 26 - t * 4; q++) { const e = Math.floor(R() * 4), u = (R() - .5) * (w - 6), ex = e < 2 ? u : (e === 2 ? 1 : -1) * (w / 2 - 3), ez = e < 2 ? (e ? 1 : -1) * (w / 2 - 3) : u, sc = 2 + R() * 2.4; a(U.lo, pick([0x2f9e4f, 0x45b85c, 0x1f8a4c, 0xff7fb0, 0xffd23d, 0x3da850]), ex, y + 4.5 + sc * .6, ez, sc, sc * .9, sc); if (q % 3 === 0) a(U.box, 0x2f9e4f, ex * 1.045, y + 1, ez * 1.045, e < 2 ? 3 : .5, 6, e < 2 ? .5 : 3); }
      a(U.box, 0x6fd0f0, 0, y, w / 2 + .3, 5, 9, .5);
    }
    a(U.box, 0x1f4fbf, 0, 50, 0, 16, 8, 16); a(U.hip, 0xffd76a, 0, 56, 0, 18, 4, 18); for (let t = 0; t < 5; t++) a(U.box, 0xe0c090, 0, t * 9 + 1, (100 - t * 18) / 2 + 3.5, 10, 6, 7);
    if (night) lit(p.x, p.y + 56, p.z, 0xffd76a, 50);
  }];
  K.village = [36, 120, 28, (p, o) => {
    const st = HOUSES[o] || HOUSES.pastel, n = 7 + Math.floor(R() * 5);
    for (let q = 0; q < n; q++) {
      const an = R() * TAU, rr = R() * 24, x = p.x + Math.cos(an) * rr, z = p.z + Math.sin(an) * rr, y = ground.h(x, z); if (!dry(y) || T.dist(x, z) < hw + 17) continue;
      const a = A({ x, y, z, yaw: p.yaw + Math.floor(R() * 4) * Math.PI / 2 + (R() - .5) * .3 }), w = 5 + R() * 3.5, d = 5 + R() * 3.5, h = 4 + R() * 5;
      a(U.box, pick(st[0]), 0, h / 2 - 1.5, 0, w, h + 3, d);
      if (o === 'white' && R() < .3) a(U.ball, st[1], 0, h, 0, w * .42, w * .38, w * .42); else if (o === 'dutch' || o === 'stone') a(U.gab, st[1], 0, h, 0, w + .8, 3 + R(), d + .8); else a(U.hip, st[1], 0, h + (o === 'china' ? .9 : 1.3), 0, (w + 1) * (o === 'china' ? 1.25 : 1), o === 'china' ? 1.8 : 2.6, (d + 1) * (o === 'china' ? 1.25 : 1));
      if (night) { A({ x, y, z, yaw: p.yaw }, 1, BE)(U.box, 0xffd98a, 0, h * .5, d / 2 + .06, 1.2, 1.3, .1); lit(x, y + h * .5, z, 0xffc070, 12); }
    }
  }];
  K.church = [45, 110, 14, (p) => { const a = A(p), c = pick([0xf4ece0, 0xe8dcc8, 0xffffff]); a(U.box, c, 0, 3, 0, 9, 10, 20); a(U.gab, 0x7a4a3a, 0, 8, 0, 10, 5, 21); a(U.box, c, 0, 10, 11, 6, 24, 6); a(U.hip, 0x4a5a6a, 0, 28, 11, 6.8, 12, 6.8); if (night) lit(p.x, p.y + 12, p.z, 0xffc070, 20); }];
  K.castle = [100, 210, 40, (p, o) => {
    const a = A(p, 1.1), ch = o === 'chateau', st = ch ? 0xf2ead8 : 0xb0aa9c, roof = ch ? 0x4a5a7a : 0xb5372e;
    a(U.box, ch ? 0x8a9a6a : 0x8a8478, 0, -4, 0, 60, 10, 60);
    for (const s of [-1, 1]) { a(U.box, st, s * 24, 6, 0, 3, 11, 48); a(U.box, st, 0, 6, s * 24, 48, 11, 3); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { a(U.cyl, st, sx * 24, 10, sz * 24, 4.6, 20, 4.6); a(U.cone, roof, sx * 24, 24.5, sz * 24, 5.6, 9, 5.6); }
    a(U.box, st, 0, 13, 0, 17, 26, 17); if (ch) a(U.hip, roof, 0, 31, 0, 19, 10, 19); else for (let q = 0; q < 8; q++) a(U.box, st, Math.cos(q * Math.PI / 4) * 8, 27, Math.sin(q * Math.PI / 4) * 8, 2.6, 2.2, 2.6);
    a(U.cyl, 0x5a4a3a, 0, 33, 0, .2, 12, .2); a(U.box, pick([0xd9302b, 0xffd23d, 0x2f6fd8]), 1.9, 37, 0, 3.6, 2.2, .15); a(U.box, 0x4a3a2a, 0, 4, 25.6, 6, 8, .6);
    if (night) lit(p.x, p.y + 14, p.z, 0xffc070, 40);
  }];
  K.stonehenge = [36, 80, 26, (p) => { const a = A(p, 1.2), c = 0x9a9a92; for (let k = 0; k < 16; k++) { const an = k / 16 * TAU, x = Math.cos(an) * 20, z = Math.sin(an) * 20; if (R() < .15) continue; a(U.box, c, x, 3.4, z, 2.4, 7.5 + R(), 1.5, 0, -an + Math.PI / 2, 0); if (k % 2 && R() < .8) { const am = (k + .5) / 16 * TAU; a(U.box, 0xa8a8a0, Math.cos(am) * 20, 7.8, Math.sin(am) * 20, 8.4, 1.4, 1.9, 0, -am + Math.PI / 2, 0); } } for (let k = 0; k < 5; k++) { const an = k / 5 * TAU * .7 - 1, x = Math.cos(an) * 10, z = Math.sin(an) * 10; for (const s of [-1.6, 1.6]) a(U.box, c, x + Math.sin(an) * s, 4.4, z - Math.cos(an) * s, 2.2, 9.6, 1.6, 0, -an + Math.PI / 2, 0); a(U.box, 0xa8a8a0, x, 9.8, z, 6, 1.5, 2, 0, -an + Math.PI / 2, 0); } }];
  K.pagoda = [32, 95, 13, (p) => { const a = A(p, 1 + R() * .5), wall = pick([0xb5372e, 0xf2e8d8, 0xc8482e]); a(U.box, 0xb0a898, 0, -1, 0, 16, 4, 16); for (let t = 0; t < 5; t++) { const w = 11 - t * 1.5, y = 3.2 + t * 6; a(U.box, wall, 0, y, 0, w, 4.4, w); a(U.hip, 0x2f3f3c, 0, y + 3.3, 0, w * 1.95, 2, w * 1.95); a(U.box, 0xffd76a, 0, y + 2.3, 0, w * 1.5, .3, w * 1.5); } a(U.cone, 0xffd76a, 0, 36, 0, .5, 6, .5); if (night) lit(p.x, p.y + 12, p.z, 0xff8a4a, 26); }];
  K.domes = [60, 150, 32, (p, o) => {
    const a = A(p, 1.15);
    if (o === 'onion') {
      a(U.box, 0xd8c8b8, 0, 0, 0, 34, 6, 34); const cols = [0xd9302b, 0x2f6fd8, 0x2fa860, 0xffd23d, 0xff8a1a];
      [[0, 0, 30, 5.4], [-10, -10, 19, 4], [10, -10, 21, 4], [-10, 10, 20, 4], [10, 10, 18, 4]].forEach((t, k) => { a(U.oct, k ? 0xf2e8d8 : 0xc8482e, t[0], t[2] / 2 + 3, t[1], t[3], t[2], t[3]); a(U.ball, cols[k], t[0], t[2] + 3 + t[3] * 1.05, t[1], t[3] * 1.25, t[3] * 1.5, t[3] * 1.25); a(U.cone, 0xffd76a, t[0], t[2] + 3 + t[3] * 2.9, t[1], t[3] * .45, t[3] * 1.6, t[3] * .45); });
    } else {
      const taj = o === 'taj', wall = taj ? 0xfaf6f0 : 0xe8d8b8, dome = taj ? 0xffffff : pick([0x2fb8b0, 0xffd76a, 0x3f8fd8]);
      a(U.box, taj ? 0xf0e8dc : 0xd8c8a8, 0, -1, 0, 54, 6, 54); a(U.box, wall, 0, 11, 0, 30, 18, 30); a(U.box, taj ? 0x6a5a6a : 0x3a4a6a, 0, 9, 15.2, 8, 13, .6); a(U.gab, wall, 0, 15.5, 15.3, 8, 3, .6);
      a(U.cyl, wall, 0, 22.5, 0, 9.5, 5, 9.5); a(U.ball, dome, 0, 27.5, 0, 10.5, taj ? 12.5 : 9, 10.5); a(U.cone, 0xffd76a, 0, 40 - (taj ? 0 : 3), 0, .6, 5, .6);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { a(U.ball, dome, sx * 10.5, 21.5, sz * 10.5, 3.6, 4, 3.6); a(U.cyl, wall, sx * 24, 15, sz * 24, 1.5, 32, 1.5); a(U.cyl, wall, sx * 24, 28, sz * 24, 2.3, .8, 2.3); a(U.ball, dome, sx * 24, 32, sz * 24, 1.9, 2.3, 1.9); }
    }
    if (night) lit(p.x, p.y + 22, p.z, 0xffd0a0, 60);
  }];
  K.minaret = [16, 60, 3.5, (p) => { const a = A(p), h = 24 + R() * 10, c = pick([0xf2e8d8, 0xe8d8b8]); a(U.oct, c, 0, h / 2, 0, 1.5, h, 1.5); a(U.cyl, c, 0, h * .78, 0, 2.4, .8, 2.4); a(U.cone, pick([0x2fb8b0, 0xffd76a]), 0, h + 2.4, 0, 1.7, 5, 1.7); if (night) { A(p, 1, BE)(U.cyl, 0xffe2a8, 0, h * .78 + .8, 0, 1.7, .5, 1.7); lit(p.x, p.y + h * .8, p.z, 0xffc878, 16); } }];
  K.tent = [15.5, 42, 6, (p, o) => { const a = A(p), c = pick([0xb5372e, 0x2f6fb5, 0xe8d0a8, 0x8e5fe0, 0xffd23d]); if (o === 'circus') { a(U.cyl, 0xfaf6ee, 0, 2, 0, 6, 4, 6); a(U.cone, c, 0, 7, 0, 6.8, 6, 6.8); a(U.cyl, 0x5a4a3a, 0, 11.5, 0, .12, 4, .12); a(U.box, 0xffd23d, 1, 13, 0, 2, 1, .1); } else { a(U.hip, c, 0, 2.4, 0, 9, 4.8, 9); a(U.box, 0xfaf0d8, 0, .9, 0, 7, 1.8, 7); } if (night) { lit(p.x, p.y + 3, p.z, 0xffb060, 14); } }];
  K.spacedome = [26, 120, 17, (p) => { const a = A(p), r = 8 + R() * 8; a(U.cyl, 0x5a6478, 0, .6, 0, r * 1.06, 2.4, r * 1.06); a(U.ball, 0xdfefff, 0, 1.4, 0, r, r * .78, r); a(U.box, 0x8a94a8, 0, 2, r + 2.5, 3.4, 3.4, 6); const e = A(p, 1, BE); for (let k = 0; k < 10; k++) e(U.box, pick([0x8fe8ff, 0xffe9a8]), Math.cos(k * TAU / 10) * r * .985, 2.6, Math.sin(k * TAU / 10) * r * .985, 1.2, .9, .3, 0, -k * TAU / 10 + Math.PI / 2, 0); lit(p.x, p.y + r * .5, p.z, 0x8fe8ff, r * 2.2); }];
  K.rocket = [45, 130, 11, (p) => { const a = A(p, 1 + R() * .4); a(U.box, 0x6a7080, 0, .3, 0, 16, 1.6, 16); a(U.cyl, 0xf4f6fa, 0, 15, 0, 2.6, 24, 2.6); a(U.cyl, 0xd9302b, 0, 20, 0, 2.66, 2, 2.66); a(U.cone, 0xd9302b, 0, 30.5, 0, 2.6, 7, 2.6); for (let k = 0; k < 3; k++) a(U.box, 0xd9302b, Math.cos(k * TAU / 3) * 3.4, 5, Math.sin(k * TAU / 3) * 3.4, 3, 6, .4, 0, -k * TAU / 3, 0); for (const s of [-1, 1]) a(U.box, 0x8a5a3a, -6.5, 14, s * 1.6, .4, 28, .4); for (let y = 4; y < 28; y += 5) a(U.box, 0x8a5a3a, -5, y, 0, 3.4, .4, 3.6); A(p, 1, BE)(U.ball, 0xff4a4a, -6.5, 28.6, 0, .6, .6, .6); lit(p.x, p.y + 29, p.z, 0xff4a4a, 14); }];
  K.antenna = [15.5, 60, 4, (p) => { const a = A(p), h = 16 + R() * 12; a(U.cyl, 0x9aa4b8, 0, h / 2, 0, .22, h, .22); a(U.cone, 0xe8eef8, 0, h + .5, 1, 4, 1.8, 4, -2.2, R() * 6, 0); A(p, 1, BE)(U.ball, 0xff4a4a, 0, h + 2.6, 0, .4, .4, .4); lit(p.x, p.y + h + 2.6, p.z, 0xff4a4a, 9); }];
  K.butte = [90, 340, 42, (p, o) => {
    const a = A(p), bas = o === 'basalt', kop = o === 'kopje', cols = bas ? [0x2a2426, 0x34282a, 0x3e2e2a] : kop ? [0x9a8a78, 0x8a7a68, 0xa89a88] : [C3(def.rock).getHex(), 0xc9743f, 0xd98a52, 0xe0a070, 0xb85a34];
    if (kop) { for (let q = 0; q < 7; q++) { const s = 5 + R() * 9; a(U.lo, pick(cols), (R() - .5) * 26, s * .5, (R() - .5) * 26, s, s * .8, s); } return; }
    let r = 20 + R() * 30, y = -6; const n = 3 + Math.floor(R() * 3);
    for (let q = 0; q < n; q++) { const h = (q ? 10 : 22) + R() * 18; a(U.oct, cols[q % cols.length], (R() - .5) * 4, y + h / 2, (R() - .5) * 4, r, h, r * (.7 + R() * .3), 0, R() * 3, 0); y += h; r *= .62 + R() * .25; }
    if (bas && R() < .5) { A(p, 1, BE)(U.oct, 0xff5a14, 0, y + .2, 0, r * .9, .5, r * .7); lit(p.x, p.y + y + 2, p.z, 0xff5a14, 40); }
  }];
  K.uluru = [200, 330, 110, (p) => { const a = A(p); a(U.ball, 0xb84a2a, 0, -6, 0, 135, 44, 74); a(U.ball, 0xa8401f, 30, -8, 20, 90, 34, 60); }];
  K.steppyr = [60, 150, 36, (p) => { const a = A(p, 1 + R() * .3), c = [0x9a9a86, 0x8a9078]; for (let t = 0; t < 6; t++) a(U.box, c[t % 2], 0, 2.5 + t * 5 - (t ? 0 : 5), 0, 56 - t * 7.6, 5 + (t ? 0 : 10), 56 - t * 7.6); a(U.box, 0xb0b09a, 0, 15, 24, 9, 34, 22, .75, 0, 0); a(U.box, 0xa0a08a, 0, 33.5, 0, 12, 7, 9); a(U.box, 0x8a9078, 0, 39, 0, 10, 4, 2.4); a(U.box, 0x2a2a2a, 0, 32.6, 4.6, 3.4, 5, .4); if (night) lit(p.x, p.y + 36, p.z, 0xff9a4a, 30); }];
  K.wreck = [30, 110, 18, (p) => { const a = A(p); a(U.box, 0x6a4a32, 0, 3, 0, 8, 7, 30, 0, 0, .35); a(U.box, 0x5a3e2a, 1.5, 6.5, -12, 7, 5, 7, 0, 0, .35); a(U.cyl, 0x5a3e2a, -3, 13, 2, .35, 18, .35, 0, 0, .35); a(U.cyl, 0x5a3e2a, -2.4, 10, -8, .3, 12, .3, 0, 0, .5); a(U.box, 0xe8e0c8, -5.5, 16, 2, 7, 5, .2, 0, 0, .35); }];
  K.zeus = [60, 130, 30, (p) => {
    const a = A(p, 1.25), gold = 0xffd76a, iv = 0xf8f0e0; a(U.box, marble, 0, -2, 0, 40, 8, 34);
    for (const sx of [-1, 1]) for (let z = -14; z <= 14; z += 5.6) a(U.cyl, marble, sx * 17, 15, z, 1.1, 26, 1.1); a(U.box, marble, 0, 29, 0, 38, 2, 32);
    a(U.box, 0x8a5a3a, 0, 6, -4, 12, 8, 10); a(U.box, 0x8a5a3a, 0, 14, -8.5, 12, 14, 1.6); a(U.box, gold, 0, 9, 1.5, 9, 4, 8); a(U.box, iv, 0, 15.5, -2, 8, 10, 5); a(U.ball, iv, 0, 23, -1.6, 2.8, 3, 2.8); a(U.cyl, gold, 0, 25.4, -1.6, 2.9, .8, 2.9);
    for (const s of [-1, 1]) a(U.box, gold, s * 3, 5, 6.5, 2.6, 7, 2.6); a(U.cyl, gold, 6.5, 14, 2, .3, 24, .3); a(U.box, iv, 5.4, 17, 0, 2, 2, 6, .5, 0, 0); a(U.ball, gold, -6, 17.5, 3, 1.4, 1.4, 1.4);
    lit(p.x, p.y + 20, p.z, 0xffe9a8, 44);
  }];
  K.sphere = [110, 190, 44, (p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(34, 28, 18), new THREE.MeshBasicMaterial({ color: 0xff4fd8 })); m.position.set(p.x, p.y + 30, p.z); grp.add(m); A(p)(U.cyl, 0x2a2a3a, 0, 2, 0, 20, 6, 20); lit(p.x, p.y + 30, p.z, 0xff7fe8, 150); W.anim.push(t => m.material.color.setHSL((t * .05) % 1, .9, .58)); }];
  K.cabin = [28, 70, 8, (p, o, k, style) => {
    const a = A(p), snow = style === 'snow', hut = style === 'hut', roof = snow ? 0xf4f8ff : hut ? 0xc8a860 : pick(o || [0xb5372e]);
    a(U.box, hut ? 0xb89a70 : 0x8a5a3a, 0, 1, 0, hut ? 6 : 7.5, 6.5, 6); if (hut) a(U.cone, roof, 0, 6.4, 0, 5.4, 4.6, 5.4); else { a(U.gab, roof, 0, 4.2, 0, 8.6, 3.6, 7.2); a(U.box, 0x6b4a32, 2, 6.4, -1.5, .9, 2.6, .9); }
    const e = A(p, 1, BE); for (const s of [-2.2, 2.2]) e(U.box, night ? 0xffd98a : 0x3a4a5a, s, 2.4, 3.03, 1.3, 1.4, .1); if (night) lit(p.x, p.y + 3, p.z, 0xffc070, 16);
  }];
  K.ferris = [70, 130, 30, (p) => {
    const Rw = 24, hub = p.y + Rw + 5, g = new THREE.Group(), yaw = p.yaw; g.position.set(p.x, hub, p.z); g.rotation.y = yaw;
    for (const f of [-1, 1]) for (const l of [-1, 1]) B.add(U.cyl, 0xf4f4f8, p.x + Math.cos(yaw) * l * 7 + Math.sin(yaw) * f * 2.4, hub - (Rw + 5) / 2, p.z - Math.sin(yaw) * l * 7 + Math.cos(yaw) * f * 2.4, .45, Rw + 9, .45, 0, yaw, l * .47);
    const wb = new Builder(), cols = [0xff5a7a, 0xffd23d, 0x29b6f6, 0x7ccf4a, 0xff8fc0, 0x9b6fe0];
    for (const f of [-1.6, 1.6]) wb.add(new THREE.TorusGeometry(Rw, .35, 6, 40), 0xffffff, 0, 0, f, 1, 1, 1);
    for (let k = 0; k < 12; k++) wb.add(U.box, 0xffe3ee, 0, 0, 0, .25, Rw * 2, .25, 0, 0, k * Math.PI / 12);
    wb.add(U.cyl, 0xff7fb0, 0, 0, 0, 2, 4.4, 2, Math.PI / 2, 0, 0);
    const wheel = wb.mesh(night ? new THREE.MeshBasicMaterial({ vertexColors: true }) : lam()); g.add(wheel); const gond = [];
    for (let k = 0; k < 12; k++) { const gm = new Builder().add(U.box, cols[k % 6], 0, -2.3, 0, 3, 2.6, 2.6).add(U.hip, 0xffffff, 0, -.6, 0, 3.2, 1, 3.2).mesh(night ? new THREE.MeshBasicMaterial({ vertexColors: true }) : lam()); wheel.add(gm); gm.position.set(Math.cos(k * TAU / 12) * Rw, Math.sin(k * TAU / 12) * Rw, 0); gond.push(gm); }
    grp.add(g); W.anim.push((t) => { wheel.rotation.z = t * .12; for (const gm of gond) gm.rotation.z = -wheel.rotation.z; }); if (night) lit(p.x, hub, p.z, 0xff9fd0, 90);
  }];
  K.windmill = [40, 110, 12, (p, o) => {
    const wh = o === 'white', g0 = new THREE.CylinderGeometry(2.2, 3.6, 15, 8); g0.translate(0, 7.5, 0);
    const mill = new THREE.Mesh(mergeGeo([[g0, null, wh ? shade(.9, 1.05, 0, 15) : (x, y) => { const t = .55 + y * .02; return [t, t * .8, t * .62]; }], [U.cone, mat4(0, 16.4, 0, 2.8, 3, 2.8), () => wh ? [.25, .28, .4] : [.85, .3, .25]]]), lam());
    mill.position.set(p.x, p.y - .5, p.z); mill.rotation.y = p.yaw + (R() - .5); grp.add(mill);
    const bl = new Builder(); for (let k = 0; k < 4; k++) bl.add(U.box, 0xfff6e0, Math.cos(k * Math.PI / 2) * 5.5, Math.sin(k * Math.PI / 2) * 5.5, 0, 11, 1.8, .15, 0, 0, k * Math.PI / 2);
    const blades = bl.mesh(lam()); blades.position.set(0, 14.5, 3.1); mill.add(blades); const ph = R() * 6; W.anim.push(t => { blades.rotation.z = t * .7 + ph; });
  }];
  K.statue = [15.5, 22, 2.5, (p) => { const a = A(p), c = pick([marble, 0xb8763a, 0xe8e2d4]); a(U.box, 0xd8d0c0, 0, 1.5, 0, 3, 3.6, 3); a(U.taper, c, 0, 5.8, 0, 1, 5, .8); a(U.ball, c, 0, 9.2, 0, .8, .9, .8); a(U.box, c, 1.1, 8.6, 0, .5, 3.2, .5, 0, 0, -.7); a(U.box, c, -.9, 6.4, .3, .5, 2.6, .5, .4, 0, .2); }];
  K.columns = [15, 22, 9, (p, o) => {
    const i0 = p.i, sd = p.side;
    for (let k = 0; k < 6; k++) {
      const i = (i0 + k * 3) % N; if (T.wall[i] < hw + 11.9) continue; const lat = sd * (hw + 15.5 + (k % 2) * 3), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat; if (T.dist(x, z) < hw + 14) continue;
      const y = ground.h(x, z), h = o ? 5 + R() * 10 : (R() < .4 ? 3 + R() * 5 : 11);
      if (o === 'totem') { for (let q = 0; q < 4; q++) B.add(U.box, pick([0xd9302b, 0xffd23d, 0x2fa860, 0x2f6fd8, 0x8a5a3a]), x, y + 1.3 + q * 2.6, z, 2.2 - q * .2, 2.6, 2.2 - q * .2, 0, T.th[i], 0); }
      else if (o === 'basalt') { for (let q = 0; q < 4; q++) B.add(U.cyl, 0x2e2628, x + (R() - .5) * 3, y + h * (.3 + R() * .3) - 1, z + (R() - .5) * 3, 1.1, h * (.6 + R() * .6), 1.1); }
      else { B.add(U.box, marble, x, y + .3, z, 2.6, 1, 2.6, 0, T.th[i], 0); B.add(U.cyl, marble, x, y + h / 2 + .6, z, .85, h, .85); if (h > 10) B.add(U.box, marble, x, y + h + .9, z, 2.3, .7, 2.3, 0, T.th[i], 0); }
    }
  }];
  /* ----- things that span the road ----- */
  function arch(i, style) {
    const w = T.wall[i], th = T.th[i], y0 = T.py[i] - .8;
    const b = (geo, col, lat, y, sx, sy, sz, rx, ry, rz, Bx) => (Bx || B).add(geo, col, T.px[i] + T.rx[i] * lat, y0 + y, T.pz[i] + T.rz[i] * lat, sx, sy, sz, rx || 0, th + (ry || 0), rz || 0);
    if (style === 'torii') { for (const s of [-1, 1]) { b(U.cyl, 0xd9302b, s * (w + 1.8), 7, .75, 14, .75); b(U.box, 0x2a2a2a, s * (w + 1.8), .8, 2.2, 1.6, 2.2); } b(U.box, 0xd9302b, 0, 11.4, 2 * w + 7, 1, 1.1); b(U.box, 0xd9302b, 0, 14, 2 * w + 10, 1.2, 1.6); b(U.box, 0x2a2a2a, 0, 15, 2 * w + 12, .8, 2.2); b(U.box, 0xd9302b, 0, 12.7, 1.4, 1.7, .5); }
    else if (style === 'triumph') { const c = 0xe8dcc0; for (const s of [-1, 1]) { b(U.box, c, s * (w + 5), 10, 8, 22, 9); for (const z of [-1, 1]) b(U.cyl, marble, s * (w + .6), 9, .7, 16, .7, 0, 0, 0); } b(U.box, c, 0, 25.5, 2 * w + 18, 9, 9); b(U.box, marble, 0, 20.6, 2 * w + 19.5, 1, 10); b(U.box, marble, 0, 30.4, 2 * w + 19.5, 1, 10); b(U.box, 0xffd76a, 0, 32.6, 7, 3.4, 3); b(U.box, 0xb5262e, 0, 25.5, 2 * w, 3, 9.2); if (night) lit(T.px[i], y0 + 20, T.pz[i], 0xff9a4a, 50); }
    else if (style === 'ishtar') { const c = 0x1f4fbf; for (const s of [-1, 1]) { b(U.box, c, s * (w + 5.5), 13, 9, 28, 10); b(U.box, 0xffd23d, s * (w + 5.5), 8, 9.2, .8, 10.2); b(U.box, 0xffd23d, s * (w + 5.5), 18, 9.2, .8, 10.2); for (let q = -1; q <= 1; q++) b(U.box, c, s * (w + 5.5 + q * 3.2), 28.2, 2, 2.4, 10); } b(U.box, c, 0, 22, 2 * w + 3, 8, 8); b(U.box, 0xffd23d, 0, 18.3, 2 * w + 3, .7, 8.2); for (let q = -4; q <= 4; q++) b(U.box, c, q * (w / 4.6), 27, 2.2, 2.2, 8); if (night) lit(T.px[i], y0 + 20, T.pz[i], 0x6f9fff, 50); }
    else if (style === 'stone') { const c = 0xa8a294; for (const s of [-1, 1]) { b(U.cyl, c, s * (w + 5), 10, 4.2, 22, 4.2); b(U.cone, pick([0xb5372e, 0x4a5a7a, 0x6a6a5a]), s * (w + 5), 24.5, 5, 8, 5); } b(U.box, c, 0, 18, 2 * w + 4, 5, 5); for (let q = -5; q <= 5; q++) b(U.box, c, q * (w / 5.6), 21.2, 1.6, 1.6, 5); if (night) lit(T.px[i], y0 + 14, T.pz[i], 0xff9a4a, 40); }
    else if (style === 'paifang') { for (const s of [-1, 1]) { b(U.cyl, 0xc8302b, s * (w + 2), 7.5, .85, 15, .85); b(U.box, 0x9a9a92, s * (w + 2), .8, 2.6, 1.6, 2.6); } b(U.box, 0xc8302b, 0, 13, 2 * w + 6, 1.6, 1.4); b(U.box, 0x1f6fbf, 0, 14.6, 2 * w + 6, 1.4, 1.2); b(U.gab, 0x2f6a4a, 0, 15.3, 5, 2.6, 2 * w + 12, 0, Math.PI / 2); b(U.gab, 0x2f6a4a, 0, 18.2, 4, 2.2, w + 4, 0, Math.PI / 2); b(U.box, 0xc8302b, 0, 17.2, w, 1.6, 1.2); b(U.box, 0xffd76a, 0, 13, 5, 2.2, 1.6); }
    else if (style === 'columns') { for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { b(U.cyl, marble, s * (w + 2.2 + q * 3.6), 8, .95, 16, .95); b(U.box, marble, s * (w + 2.2 + q * 3.6), 16.3, 2.4, .6, 2.4); } b(U.box, marble, 0, 17.6, 2 * w + 22, 2.2, 3.6); b(U.gab, 0xe8e2d4, 0, 18.7, 4, 5.5, 2 * w + 24, 0, Math.PI / 2); }
    else if (style === 'neon') { const c = pick([0xff4fd8, 0x29e6ff, 0xffd23d, 0x7fff7a, 0xb48cff]); BE.add(new THREE.TorusGeometry(w + 3, .5, 6, 48), c, T.px[i], y0 + 3, T.pz[i], 1, .78, 1, 0, th, 0); for (const s of [-1, 1]) b(U.box, 0x2a2a3a, s * (w + 3), 1.4, 2.4, 3, 2.4); lit(T.px[i], y0 + (w + 3) * .78 + 3, T.pz[i], c, 34); for (const s of [-1, 1]) lit(T.px[i] + T.rx[i] * s * (w + 3), y0 + 6, T.pz[i] + T.rz[i] * s * (w + 3), c, 26); }
  }
  function aqueduct(i) {
    const th = T.th[i], dy = T.py[i] + 16, c = 0xe0d2b4; let lo = 0, hi = 0;
    for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) {
      const lat = sd * (T.wall[i] + 3.5 + k * 13), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat; if (k && T.dist(x, z) < hw + 15) break;
      const gy = ground.h(x, z), top = dy + 7; if (gy > dy + 4) break; B.add(U.box, c, x, (gy - 3 + dy) / 2, z, 3.6, dy - gy + 3, 5.4, 0, th, 0); B.add(U.box, c, x, dy + 4.6, z, 2.4, 5, 4.6, 0, th, 0); if (sd < 0) lo = lat; else hi = lat;
      if (k < 5) B.add(U.box, c, T.px[i] + T.rx[i] * (lat + sd * 6.5), dy + 4.6, T.pz[i] + T.rz[i] * (lat + sd * 6.5), 2, 5, 4.4, 0, th, 0);
    }
    const mid = (lo + hi) / 2, span = hi - lo + 5;
    B.add(U.box, c, T.px[i] + T.rx[i] * mid, dy + 1, T.pz[i] + T.rz[i] * mid, span, 2.4, 5.8, 0, th, 0); B.add(U.box, 0xd0c2a2, T.px[i] + T.rx[i] * mid, dy + 8, T.pz[i] + T.rz[i] * mid, span, 2, 5.2, 0, th, 0);
  }
  function colossus(i) {
    const w = T.wall[i] + 4.5, th = T.th[i], y0 = T.py[i] - 1, c = night ? 0xc89060 : 0xb8763a, P = (lat, f) => [T.px[i] + T.rx[i] * lat + T.tx[i] * (f || 0), T.pz[i] + T.rz[i] * lat + T.tz[i] * (f || 0)];
    for (const s of [-1, 1]) { const ang = Math.atan((w - 5.5) / 34), L = Math.hypot(34, w - 5.5), m = P(s * (w + 5.5) / 2); B.add(U.taper, c, m[0], y0 + 17, m[1], 3.2, L + 2, 3.2, 0, th, -s * ang); const f = P(s * w); B.add(U.box, c, f[0], y0 + 1, f[1], 5, 2.4, 8, 0, th, 0); B.add(U.box, 0xe8dcc0, f[0], y0 - 1.5, f[1], 9, 4, 12, 0, th, 0); }
    const o = P(0); B.add(U.box, 0xfaf0d8, o[0], y0 + 37, o[1], 13, 8, 7, 0, th, 0); B.add(U.box, c, o[0], y0 + 47, o[1], 12, 14, 6.5, 0, th, 0); B.add(U.ball, c, o[0], y0 + 58.5, o[1], 3.4, 3.8, 3.4); for (let k = 0; k < 7; k++) { const an = (k - 3) * .42; B.add(U.cone, 0xffd76a, o[0] + T.rx[i] * Math.sin(an) * 4.6, y0 + 61.5 + Math.cos(an) * 3.4, o[1] + T.rz[i] * Math.sin(an) * 4.6, .5, 4, .5, 0, th, -an); }
    const sh = P(9), hd = P(13.5); B.add(U.cyl, c, (sh[0] + hd[0]) / 2, y0 + 61, (sh[1] + hd[1]) / 2, 1.5, 18, 1.5, 0, th, .28); B.add(U.cone, 0xffd76a, hd[0], y0 + 70.5, hd[1], 2.2, 2.4, 2.2, Math.PI, 0, 0); BE.add(U.cone, 0xffb347, hd[0], y0 + 73.6, hd[1], 1.7, 4.4, 1.7); lit(hd[0], y0 + 74, hd[1], 0xffb347, 44);
    const s2 = P(-9), h2 = P(-10.5, 3); B.add(U.cyl, c, s2[0], y0 + 44, s2[1], 1.4, 15, 1.4, 0, th, .12); B.add(U.oct, 0xffd76a, h2[0], y0 + 40, h2[1], 5, .8, 5, Math.PI / 2, th, 0);
  }

  /* ----- run the world's landmark list ----- */
  for (const pr of (def.props || [])) {
    const kind = pr[0], n = pr[1], o = pr[2], off = R();
    if (K[kind]) { const k = K[kind]; for (let q = 0; q < n; q++) { const p = place((q + off) / n + (R() - .5) * .06, R() < .5 ? -1 : 1, lerp(k[0], k[1], kind === 'pyramid' && !q ? .2 : R()), k[2]); if (p) { k[3](p, o, q, pr[3]); W.marks.push([kind, p.x, p.y, p.z]); } } }
    else if (kind === 'arch') for (let q = 0; q < n; q++) { const i = spot((q + off) / n); if (i >= 0) { arch(i, o); W.marks.push(['arch', T.px[i], T.py[i], T.pz[i], i]); } }
    else if (kind === 'aqueduct') for (let q = 0; q < n; q++) { const i = spot((q + off) / n); if (i >= 0) { aqueduct(i); W.marks.push(['aqueduct', T.px[i], T.py[i], T.pz[i], i]); } }
    else if (kind === 'colossus') { const i = spot(off); if (i >= 0) { colossus(i); W.marks.push(['colossus', T.px[i], T.py[i], T.pz[i], i]); } }
    else if (kind === 'herd') for (let q = 0; q < n; q++) {
      const c = CRITTERS[o], i0 = T.at((q + off) / n + (R() - .5) * .05), sd = R() < .5 ? -1 : 1, lat0 = T.wall[i0] + 6 + R() * 26;
      for (let m = 0; m < 3 + Math.floor(R() * 4); m++) {
        const i = (i0 + Math.floor(R() * 10)) % N, lat = sd * (lat0 + R() * 14), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat; if (T.bridge[i] || T.under[i] || T.dist(x, z) < hw + 15) continue;
        const y = ground.h(x, z); if (!dry(y)) continue; const a = A({ x, y, z, yaw: R() * TAU }, .9 + R() * .35), [bl, bh, bw, lg, nk, hd, c1, c2] = c, by = lg + bh / 2;
        a(U.box, c1, 0, by, 0, bw, bh, bl); for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (o !== 'flamingo' || sz > 0) a(U.box, o === 'zebra' || o === 'cow' ? c2 : c1, sx * bw * .34, lg / 2, sz * bl * .36, .26 + bw * .08, lg, .26 + bw * .08);
        const nz = bl / 2, ny = by + bh * .3, tilt = o === 'giraffe' ? .25 : o === 'flamingo' ? .15 : .7; a(U.box, c1, 0, ny + Math.cos(tilt) * nk / 2, nz + Math.sin(tilt) * nk / 2, bw * .45, nk + .3, bw * .45, tilt, 0, 0);
        const hy = ny + Math.cos(tilt) * nk, hz = nz + Math.sin(tilt) * nk; a(U.box, o === 'sheep' || o === 'flamingo' ? c2 : c1, 0, hy + hd * .2, hz + hd * .3, hd * .7, hd * .7, hd * 1.1);
        if (o === 'cow' || o === 'zebra' || o === 'giraffe') { a(U.box, c2, bw * .2, by + .1, bl * .15, bw * 1.02, bh * .55, bl * .3); a(U.box, c2, -bw * .1, by, -bl * .28, bw * 1.02, bh * .7, bl * .2); }
        if (o === 'camel') a(U.lo, c2, 0, by + bh * .6, -.1, bw * .5, bh * .5, bl * .28);
        if (o === 'elephant') { a(U.box, c1, 0, hy - 1.4, hz + 1.3, .5, 2.6, .5); for (const s of [-1, 1]) { a(U.box, c2, s * 1.0, hy + .2, hz - .2, .2, 1.5, 1.3); a(U.cone, 0xfaf6ee, s * .45, hy - .8, hz + 1.2, .14, 1.2, .14, 1.9, 0, 0); } }
        if (o === 'deer') for (const s of [-1, 1]) a(U.box, 0xe8d8c0, s * .2, hy + .7, hz, .08, .8, .08, 0, 0, s * .4);
        if (o === 'roo') a(U.box, c1, 0, lg * .6, -bl * .9, .3, .3, 1.6, -.3, 0, 0);
      }
    }
    else if (kind === 'greatwall') for (let q = 0; q < n; q++) {
      const f0 = (q + off) / n, sd = R() < .5 ? -1 : 1, dist = 70 + R() * 50; let k = 0;
      for (let i = T.at(f0), e = 0; e < Math.floor(N * .16); e += 5, i = (i + 5) % N, k++) {
        const lat = sd * (hw + dist + Math.sin(e * .03) * 18), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat; if (T.dist(x, z) < hw + 24) continue; const y = ground.h(x, z); if (!dry(y)) continue;
        B.add(U.box, 0xa8a090, x, y + 1, z, 5, 11, 17.5, 0, T.th[i], 0); B.add(U.box, 0x989080, x, y + 7, z, 5.8, 1.2, 17.5, 0, T.th[i], 0); if (k % 5 === 0) { B.add(U.box, 0xa8a090, x, y + 5, z, 9, 19, 9, 0, T.th[i], 0); B.add(U.hip, 0x5a5a52, x, y + 16, z, 11, 3, 11, 0, T.th[i], 0); }
      }
    }
    else if (kind === 'peak') for (let q = 0; q < n; q++) {
      const an = off * TAU + q * 2.4, rr0 = { fuji: 1150, horn: 520, olympus: 1700 }[o] || 760, rad = R0 - 120 + rr0 + q * 200, px = cx + Math.cos(an) * rad, pz = cz + Math.sin(an) * rad, mc = C3(def.mountain[0]), sc = C3(def.mountain[1]); let g, h, r, cf;
      if (o === 'fuji') { h = 760; r = 1150; g = new THREE.CylinderGeometry(.07, 1, 1, 22, 6); cf = (x, y) => { const t = (y - baseY) / h, c = t > .62 ? [1, 1, 1] : [.38, .5, .72]; return [c[0] * (.8 + t * .3), c[1] * (.8 + t * .3), c[2] * (.8 + t * .3)]; }; }
      else if (o === 'horn') { h = 900; r = 520; g = new THREE.ConeGeometry(1, 1, 5, 5); cf = (x, y) => { const t = (y - baseY) / h, c = t > .42 ? sc : mc, f = .7 + t * .45; return [c.r * f, c.g * f, c.b * f]; }; }
      else if (o === 'olympus') { h = 620; r = 1700; g = new THREE.CylinderGeometry(.22, 1, 1, 20, 4); cf = (x, y) => { const t = (y - baseY) / h, f = .65 + t * .5; return [mc.r * f, mc.g * f, mc.b * f]; }; }
      else { h = 560 + q * 120; r = 760; g = new THREE.CylinderGeometry(.16, 1, 1, 16, 5); cf = (x, y, z) => { const t = (y - baseY) / h, st = hash2(Math.round(Math.atan2(z - pz, x - px) * 9), 3, 7) > .72 && t > .35; return st ? [1, .42 * t + .1, .05] : [.17 + t * .08, .13, .13]; }; const top = new THREE.Mesh(new THREE.CylinderGeometry(r * .15, r * .15, 6, 16), new THREE.MeshBasicMaterial({ color: 0xff6a1a, fog: false })); top.position.set(px, baseY + h + 1, pz); grp.add(top); lit(px, baseY + h + 40, pz, 0xff5a14, 900); }
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < .49 && y > -.49) { const j = 1 + (hash2(i, q, 15) - .5) * (o === 'horn' ? .5 : .14); p.setX(i, p.getX(i) * j); p.setZ(i, p.getZ(i) * j); } }
      grp.add(new THREE.Mesh(mergeGeo([[g, mat4(px, baseY + h / 2, pz, r, h, r), cf]]), o === 'volcano' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : lam()));
    }
    else if (kind === 'lamps' || kind === 'lanterns') for (let i = 6, k = 0; i < N; i += kind === 'lamps' ? 14 : 22, k++) {
      if (T.wall[i] < hw + 11.9) continue; const sd = k % 2 ? 1 : -1, lat = sd * (hw + 12.8), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat, y = T.py[i] - .8; if (T.dist(x, z) < hw + 11.5) continue;
      if (kind === 'lamps') { B.add(U.cyl, 0x2a3142, x, y + 3, z, .13, 6, .13); BE.add(U.ball, o, x, y + 6.2, z, .5, .5, .5); lit(x, y + 6.2, z, o, 11); }
      else { B.add(U.cyl, 0x5a3d2b, x, y + 2.4, z, .11, 4.8, .11); B.add(U.box, 0x5a3d2b, x - T.rx[i] * sd * .9, y + 4.7, z - T.rz[i] * sd * .9, 2.0, .12, .12, 0, T.th[i], 0); BE.add(U.ball, pick(o), x - T.rx[i] * sd * 1.7, y + 4.0, z - T.rz[i] * sd * 1.7, .5, .65, .5); }
    }
    else if (kind === 'signs') for (let q = 0; q < n; q++) {
      const i = Math.floor(R() * N); if (T.wall[i] < hw + 11.9 || i < 20) continue; const sd = R() < .5 ? -1 : 1, lat = sd * (hw + 14 + R() * 5), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat; if (T.dist(x, z) < hw + 13) continue;
      const y = T.py[i] - .8, h = 5 + R() * 8, w2 = 2.5 + R() * 5, c = pick([0xff4fd8, 0x29e6ff, 0xffd23d, 0x7fff7a, 0xb48cff, 0xff6a3d]); B.add(U.box, 0x1a1a2a, x, y + 2, z, .5, 4, .5); BE.add(U.box, c, x, y + 4 + h / 2, z, .5, h, w2, 0, T.th[i], 0); BE.add(U.box, 0x14142a, x - T.rx[i] * sd * .3, y + 4 + h / 2, z - T.rz[i] * sd * .3, .2, h * .7, w2 * .6, 0, T.th[i], 0); lit(x, y + 4 + h / 2, z, c, 18);
    }
    else if (kind === 'snowmen') for (let q = 0; q < n; q++) {
      const i = Math.floor(R() * N), sd = R() < .5 ? -1 : 1, lat = sd * (hw + 13.5 + R() * 4), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat, y = ground.h(x, z); if (T.bridge[i] || !dry(y) || T.dist(x, z) < hw + 13) continue;
      B.add(U.ball, 0xffffff, x, y + 1, z, 1.2, 1.1, 1.2).add(U.ball, 0xffffff, x, y + 2.6, z, .85, .8, .85).add(U.ball, 0xffffff, x, y + 3.8, z, .58, .58, .58);
      const a = T.th[i] + (R() - .5), sx = Math.sin(a), sz = Math.cos(a); B.add(U.cone, 0xff8a3d, x - sx * .7, y + 3.8, z - sz * .7, .12, .6, .12, -Math.PI / 2, a, 0); B.add(U.cyl, 0xd93a3a, x, y + 3.25, z, .68, .22, .68); B.add(U.cyl, 0x2a3142, x, y + 4.55, z, .42, .6, .42);
    }
    else if (kind === 'hay') for (let q = 0; q < 50; q++) {
      const i = Math.floor(R() * N), lat = (R() < .5 ? -1 : 1) * (hw + 13 + R() * 22), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat, y = ground.h(x, z); if (T.bridge[i] || !dry(y) || T.dist(x, z) < hw + 12.5) continue;
      if (q % 2) B.add(U.cyl, 0xe2b64a, x, y + 1.1, z, 1.25, 1.7, 1.25, Math.PI / 2, R() * 3, 0); else for (let k = 0; k < 4; k++) { const sc = .45 + R() * .5; B.add(U.ball, 0xf07a1c, x + (R() - .5) * 4, y + sc * .6, z + (R() - .5) * 4, sc, sc * .75, sc); }
    }
  }

  /* ----- a skyline of towers ----- */
  if (def.city) {
    const ct = def.city, nb = Math.round(ct.n * [.5, .8, 1][Q]), tex = canvasTex(64, 64, (c) => {
      c.fillStyle = ct.night ? '#0b0e1c' : '#5f8fc0'; c.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { const on = Math.random() < (ct.night ? .45 : 1); c.fillStyle = ct.night ? (on ? ['#ffe9a8', '#ffd98a', '#9fe8ff', '#ffb8e8'][Math.floor(Math.random() * 4)] : '#141a30') : (Math.random() < .5 ? '#a8d0f0' : '#8fc0e8'); c.fillRect(x * 10.6 + 2, y * 8 + 1.5, 7, 5); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter;
    const lists = [[], [], []], reps = [2, 5, 10];
    for (let q = 0; q < nb * 4 && lists[0].length + lists[1].length + lists[2].length < nb; q++) {
      const i = Math.floor(R() * N), sd = R() < .5 ? -1 : 1, lat = sd * (T.wall[i] + 16 + Math.pow(R(), 1.6) * 300), x = T.px[i] + T.rx[i] * lat, z = T.pz[i] + T.rz[i] * lat; if (T.dist(x, z) < hw + 30) continue;
      const y = ground.h(x, z); if (!dry(y)) continue; const far = clamp((Math.abs(lat) - hw) / 220, 0, 1), h = lerp(ct.h[0], ct.h[1], Math.pow(R(), 2.2 - far * 1.4)), k = h < 34 ? 0 : h < 75 ? 1 : 2, w = 14 + R() * 18;
      const c = ct.pastel ? C3(pick([0xffc8d8, 0xc8f0ff, 0xfff0c8, 0xffffff, 0xd8c8ff])) : ct.night ? C3(pick([0xffffff, 0xd8e8ff, 0xffe0f0, 0xe8ffd8])) : C3(pick([0xffffff, 0xe8f0f8, 0xd0e0f0, 0xf8f0e0]));
      lists[k].push([x, y + h / 2 - 3, z, w, h + 6, 14 + R() * 18, T.th[i], c]); if (ct.night && h > 70) lit(x, y + h + 2, z, 0xff3a3a, 16);
    }
    lists.forEach((l, k) => {
      if (!l.length) return; const g = new THREE.BoxGeometry(1, 1, 1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, uv.getX(i) * 2); uv.setY(i, uv.getY(i) * reps[k]); }
      const m = new THREE.InstancedMesh(g, ct.night ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex }), l.length);
      l.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.scale.set(p[3], p[4], p[5]); dummy.rotation.set(0, p[6], 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, p[7]); }); grp.add(m);
    });
  }
  /* ----- things in the sky beyond the sky ----- */
  for (const so of (def.skyObj || [])) {
    const [kind, az, el, size] = so, D = 7000, pos = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(D), sg = new THREE.SphereGeometry(1, 28, 18); let cf;
    if (kind === 'earth') cf = (x, y, z) => { const n = fbm(x * 2.2 + 5, z * 2.2 + y * 2.4, 91, 4), cl = fbm(x * 3 + 9, y * 4 + z * 3, 44, 3); let c = n > .52 ? [.25, .62, .3] : [.1, .32, .78]; if (Math.abs(y) > .86) c = [1, 1, 1]; if (cl > .6) c = [1, 1, 1]; return c; };
    else if (kind === 'ringed') cf = (x, y) => { const b = Math.sin(y * 16) * .5 + .5, b2 = Math.sin(y * 41 + 1) * .5 + .5; return [.95 - b * .16, .8 - b * .2 - b2 * .06, .55 - b * .2]; };
    else cf = (x, y, z) => { const n = .55 + fbm(x * 4, z * 4 + y * 3, 12, 3) * .5; return [n, n * .96, n * .9]; };
    const m = new THREE.Mesh(mergeGeo([[sg, null, cf]]), new THREE.MeshLambertMaterial({ vertexColors: true, fog: false })); m.position.copy(pos); m.scale.setScalar(size * D / 2400); m.rotation.set(.4, 1, .3); skyGrp.add(m);
    if (kind === 'ringed') { const rg = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.35, 64, 3), new THREE.MeshBasicMaterial({ color: 0xe8d8b0, side: THREE.DoubleSide, transparent: true, opacity: .72, fog: false })); rg.rotation.x = Math.PI / 2 - .35; rg.rotation.y = .3; m.add(rg); const rg2 = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.78, 64, 1), new THREE.MeshBasicMaterial({ color: 0x1a1430, side: THREE.DoubleSide, transparent: true, opacity: .6, fog: false })); rg2.rotation.copy(rg.rotation); rg2.position.y = .001; m.add(rg2); }
    W.anim.push((t) => { m.rotation.y = 1 + t * .01; });
  }
  /* ----- floaters, birds or fish, boats ----- */
  const fl = def.floaters || ['balloon', 0];
  if (fl[0] === 'lantern' && fl[1]) {
    const n = fl[1] * 6, pos = [], col = []; for (let q = 0; q < n; q++) { pos.push(lerp(T.minX - 120, T.maxX + 120, R()), T.avgY + 12 + R() * 110, lerp(T.minZ - 120, T.maxZ + 120, R())); const c = C3(pick([0xffb347, 0xff8a3d, 0xffd98a])); col.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dot = canvasTex(32, 32, (c) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); });
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 5, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); grp.add(pts); W.anim.push(t => { pts.position.y = Math.sin(t * .15) * 6; pts.position.x = Math.sin(t * .05) * 14; });
  } else for (let q = 0; q < fl[1]; q++) {
    let m; const bx = lerp(T.minX - 150, T.maxX + 150, R()), bz = lerp(T.minZ - 150, T.maxZ + 150, R()), ph = R() * 10, sp = .5 + R();
    if (fl[0] === 'balloon') {
      const cA = C3(pick([0xff5a5f, 0xffd23d, 0x29b6f6, 0xff7fb0, 0x9b6fe0, 0xff8a3d, 0x4fd1a5])), cB = C3(pick([0xffffff, 0xfff1d6, 0xffe066]));
      m = new THREE.Mesh(mergeGeo([[new THREE.SphereGeometry(1, 16, 10), mat4(0, 0, 0, 10, 12, 10), (x, y, z) => { const c = Math.floor((Math.atan2(z, x) + Math.PI) / TAU * 8 + .001) % 2 ? cA : cB; return [c.r, c.g, c.b]; }], [U.cone, mat4(0, -11, 0, 5.2, 7, 5.2, Math.PI, 0, 0), () => [cA.r * .9, cA.g * .9, cA.b * .9]], [U.box, mat4(0, -16.5, 0, 2.6, 2.2, 2.6), () => [.55, .38, .22]]]), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: night ? 0x7a5a3a : 0x222222 }));
      const by = T.maxY + 60 + R() * 120; W.anim.push(t => { m.position.set(bx + Math.sin(t * .02 * sp + ph) * 90, by + Math.sin(t * .3 + ph) * 5, bz + Math.cos(t * .017 * sp + ph) * 90); m.rotation.y = t * .05 + ph; });
    } else if (fl[0] === 'ufo') {
      m = new Builder().add(U.ball, 0x9aa4b8, 0, 0, 0, 7, 1.4, 7).add(U.ball, 0x6a7488, 0, -.6, 0, 4, 1.2, 4).mesh(lam()); const dm = new THREE.Mesh(U.ball, new THREE.MeshBasicMaterial({ color: pick([0x8fe8ff, 0x7fff9a, 0xff9fe8]) })); dm.scale.set(2.8, 2, 2.8); dm.position.y = 1; m.add(dm);
      const by = T.maxY + 40 + R() * 70, rad = 120 + R() * 200; W.anim.push(t => { const a = t * .12 * sp + ph; m.position.set(bx + Math.cos(a) * rad, by + Math.sin(t * .8 + ph) * 6, bz + Math.sin(a) * rad); m.rotation.y = t * 1.5; });
    } else {  // whale
      const c = pick([0x3a5a8a, 0x4a6a9a, 0x5a7aa8]); m = new Builder().add(U.ball, c, 0, 0, 0, 7, 6, 20).add(U.ball, 0xdce8f0, 0, -2, 2, 6, 4.4, 16).add(U.cone, c, 0, 0, -22, 3.4, 12, 2.2, -Math.PI / 2, 0, 0).add(U.box, c, 0, 0, -29, 14, .8, 5).add(U.box, c, 8, -2, 6, 8, .8, 4, 0, 0, -.3).add(U.box, c, -8, -2, 6, 8, .8, 4, 0, 0, .3).mesh(lam());
      const by = T.maxY + 36 + R() * 40, rad = 160 + R() * 220, dir = R() < .5 ? 1 : -1; W.anim.push(t => { const a = t * .035 * sp * dir + ph; m.position.set(bx + Math.cos(a) * rad, by + Math.sin(t * .25 + ph) * 8, bz + Math.sin(a) * rad); m.rotation.y = -a + (dir > 0 ? 0 : Math.PI); m.rotation.x = Math.sin(t * .25 + ph) * .08; });
    }
    grp.add(m);
  }
  if (def.boats) {
    const lk = ground.lakes;
    for (let q = 0, tr = 0; q < def.boats && tr < 300; tr++) {
      let bx, bz; if (lk.length && (!def.sea || R() < .3)) { const l = lk[Math.floor(R() * lk.length)], a = R() * TAU, rr = R() * .5; bx = l[0] + Math.cos(a) * l[2] * rr; bz = l[1] + Math.sin(a) * l[3] * rr; } else { bx = lerp(T.minX - 380, T.maxX + 380, R()); bz = lerp(T.minZ - 380, T.maxZ + 380, R()); }
      if (ground.h(bx, bz) > wy - 2.2) continue; q++;
      const m = new Builder().add(U.box, 0xfaf6ee, 0, .5, 0, 2.2, 1.1, 6.5).add(U.cyl, 0x8a5a3a, 0, 4.5, .4, .1, 8, .1).add(U.pyr, pick([0xffffff, 0xff5a5f, 0xffd23d, 0xff8fc0, 0x29b6f6]), 0, 4.8, -1.2, .12, 7, 2.6).mesh(lam());
      const ph = R() * 9, ang = R() * TAU; grp.add(m); W.anim.push(t => { const u = t * .35 + ph; m.position.set(bx + Math.sin(ang) * Math.sin(u * .1) * 30, wy + Math.sin(u) * .12, bz + Math.cos(ang) * Math.sin(u * .1) * 30); m.rotation.set(Math.sin(u) * .04, ang + (Math.cos(u * .1) < 0 ? Math.PI : 0), Math.sin(u * .7) * .06); });
    }
  }
  if (def.birds) {
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .5, -1.6, .5, -.2, 0, 0, -.3, 0, 0, .5, 0, 0, -.3, 1.6, .5, -.2], 3)); bg.computeVertexNormals();
    const bm = new THREE.MeshBasicMaterial({ color: def.birdCol || 0x2a2f3a, side: THREE.DoubleSide }), bh = def.birdH || [45, 105];
    for (let q = 0; q < def.birds; q++) {
      const fx = lerp(T.minX, T.maxX, R()), fz = lerp(T.minZ, T.maxZ, R()), rad = 150 + R() * 250, hgt = T.avgY + lerp(bh[0], bh[1], R()), sp = (.08 + R() * .06) * (R() < .5 ? -1 : 1), birds = [];
      for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(bg, bm); b.scale.setScalar(1.3); grp.add(b); birds.push(b); }
      W.anim.push(t => birds.forEach((b, k) => { const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1, a = t * sp + q * 2 - row * .03 * Math.sign(sp); b.position.set(fx + Math.cos(a) * (rad + side * row * 4), hgt + Math.sin(t * .5 + k) * 1.5, fz + Math.sin(a) * (rad + side * row * 4)); b.rotation.y = -a + (sp > 0 ? 0 : Math.PI); b.scale.y = 1.3 * Math.sin(t * 7 + k * 1.3); }));
    }
  }
}

/* ---------- vehicles: thirteen looks, one identical set of physics ---------- */
const VEHICLES = [
  { id: 'car', name: 'Grand Prix car' }, { id: 'train', name: 'Steam engine' }, { id: 'bike', name: 'Motorbike' }, { id: 'chariot', name: 'Roman chariot' }, { id: 'horse', name: 'Horseback' },
  { id: 'pod', name: 'Twin-jet pod' }, { id: 'tank', name: 'Battle tank' }, { id: 'truck', name: 'Monster truck' }, { id: 'golf', name: 'Golf cart' }, { id: 'clown', name: 'Clown car' },
  { id: 'hover', name: 'Hoverboard' }, { id: 'skate', name: 'Skateboard' }, { id: 'broom', name: 'Flying broom' }, { id: 'dragon', name: 'Dragon' }, { id: 'eagle', name: 'Bald eagle' },
  { id: 'chair', name: 'Wheelchair' }, { id: 'bed', name: 'Hospital bed' }, { id: 'bin', name: 'Dumpster' },
];
/* every vehicle is scaled to the same envelope and every driver is the same size, so nothing blocks the view more than anything else */
const VEH_SCALE = { car: 1, train: .55, bike: .69, chariot: .57, horse: .52, pod: .88, tank: .69, truck: .56, golf: .75, clown: .7, hover: .85, skate: .86, broom: .88, dragon: .6, eagle: .62, chair: .82, bed: .8, bin: .76 };
const VEH_HOVER = { pod: .4, hover: .35, broom: .5, dragon: .75, eagle: .75 };
let WHEEL_GEO;
const WHEEL_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
const VEH_MAT = () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
function addDriver(b, ch, X, Y, Z, s, torso, nose) {
  const U = unitGeos(), a = (g, c, x, y, z, sx, sy, sz, rx, ry, rz) => b.add(g, c, X + x * s, Y + y * s, Z + z * s, sx * s, sy * s, sz * s, rx, ry, rz);
  if (torso) { a(U.box, ch.trim, 0, -1.0, 0, .72, 1.05, .46); for (const k of [-1, 1]) a(U.box, ch.trim, k * .46, -.85, .22, .18, .75, .18, -.7, 0, 0); if (torso > 1) for (const k of [-1, 1]) a(U.box, 0x2a2f3a, k * .2, -1.95, 0, .24, .95, .26); }
  if (ch.ear === 'eyes') {   // frog: wide flat head, pale chin, long mouth, eyes bulging on top
    a(U.ball, ch.fur, 0, -.04, 0, .56, .36, .48); a(U.ball, ch.snout, 0, -.19, .08, .48, .22, .42); a(U.box, 0x1f5a34, 0, -.09, .43, .56, .035, .1); a(U.box, 0x1f5a34, -.3, -.06, .36, .1, .035, .1, 0, .7, .4); a(U.box, 0x1f5a34, .3, -.06, .36, .1, .035, .1, 0, -.7, -.4);
    a(U.ball, 0x1f5a34, -.07, .06, .46, .025, .025, .02); a(U.ball, 0x1f5a34, .07, .06, .46, .025, .025, .02);
    for (const k of [-1, 1]) { a(U.ball, ch.fur, k * .27, .3, .18, .2, .2, .2); a(U.ball, 0xffffff, k * .27, .33, .3, .15, .15, .11); a(U.ball, 0x16181d, k * .27, .33, .39, .075, .09, .04); }
    if (nose) a(U.ball, 0xff2a2a, 0, 0, .5, .13, .13, .13);
  } else {
    a(U.ball, ch.fur, 0, 0, 0, .46, .44, .46); a(U.ball, ch.snout, 0, -.1, .36, .2, .17, .2);
    a(U.ball, 0x16181d, -.17, .1, .38, .06, .07, .05); a(U.ball, 0x16181d, .17, .1, .38, .06, .07, .05); a(U.ball, nose ? 0xff2a2a : 0x16181d, 0, -.05, .55, nose ? .14 : .06, nose ? .14 : .05, nose ? .14 : .05);
  }
  if (!torso) a(U.box, ch.trim, 0, -.42, 0, .62, .16, .62);
  if (ch.ear === 'point') for (const k of [-1, 1]) { a(U.cone, ch.fur, k * .28, .5, -.02, .16, .38, .13, 0, 0, -k * .25); a(U.cone, ch.snout, k * .28, .47, .05, .08, .24, .06, 0, 0, -k * .25); }
  if (ch.ear === 'mask') { for (const k of [-1, 1]) { a(U.ball, 0x23262e, k * .2, .1, .33, .19, .13, .12, 0, 0, -k * .25); a(U.ball, 0xffffff, k * .18, .11, .41, .07, .075, .05); a(U.ball, 0x16181d, k * .18, .11, .45, .035, .04, .02); a(U.ball, ch.fur, k * .3, .42, -.02, .15, .17, .1); a(U.ball, 0x23262e, k * .3, .43, .04, .09, .1, .06); a(U.ball, ch.snout, k * .3, .2, .3, .1, .05, .06, 0, 0, -k * .5); } a(U.box, 0x23262e, 0, .3, .28, .1, .26, .2, -.5, 0, 0); }
  if (ch.ear === 'long') for (const k of [-1, 1]) { a(U.ball, ch.fur, k * .2, .85, -.06, .11, .5, .09, -.15, 0, -k * .12); a(U.ball, 0xffc2d4, k * .2, .85, 0, .05, .36, .04, -.15, 0, -k * .12); }
  if (ch.ear === 'round') for (const k of [-1, 1]) { a(U.ball, ch.fur, k * .36, .36, 0, .17, .17, .12); a(U.ball, ch.snout, k * .36, .36, .07, .09, .09, .06); }
  if (ch.ear === 'tuft') { for (const k of [-1, 1]) { a(U.cone, 0x6b4a32, k * .3, .46, 0, .1, .3, .1, 0, 0, -k * .6); a(U.ball, 0xffffff, k * .17, .1, .34, .13, .13, .06); } a(U.cone, ch.snout, 0, -.06, .5, .07, .2, .07, Math.PI / 2, 0, 0); }
  if (ch.ear === 'none') { a(U.ball, 0xffffff, 0, -.06, .24, .32, .3, .26); a(U.cone, ch.snout, 0, -.04, .58, .09, .26, .07, Math.PI / 2, 0, 0); }
}
function buildVehicle(kind, ch) {
  const U = unitGeos(), b = new Builder(), body = ch.car, trim = ch.trim, dark = 0x23262e, HP = Math.PI / 2;
  const V = { wheels: [], hover: 0, roll: .05, parts: [], flame: [.7, -2.6], bob: 0, S: VEH_SCALE[kind] || 1, seat: [0, 1.28, .1, 0, false] };
  const seat = (X, Y, Z, s_, torso, nose) => { V.seat = [X, Y, Z, torso || 0, !!nose]; };
  const part = (bld, fn, x, y, z) => { const m = bld.mesh(VEH_MAT()); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; V.parts.push({ mesh: m, fn }); return m; };
  const wing = (col, col2, len, wid, x, y, z, sp) => { for (const k of [-1, 1]) { const w = new Builder().add(U.box, col, k * len / 2, 0, 0, len, .09, wid).add(U.box, col2, k * len * .86, 0, -wid * .1, len * .3, .1, wid * .8).add(U.box, col, k * len * .45, 0, -wid * .55, len * .8, .08, wid * .3); part(w, (m, c, t) => { m.rotation.z = k * (Math.sin(t * sp + (c.x || 0) * .05) * .55 + .12); }, k * x, y, z); } };
  const flag = (x, y, z, hgt) => { const k = 1 / V.S, h = hgt || 1.3, f = new Builder().add(U.cyl, 0xc8ccd4, 0, h / 2 * k, 0, .025 * k, h * k, .025 * k).add(U.ball, 0xffd76a, 0, h * k, 0, .05 * k, .05 * k, .05 * k);
    for (let i = 0; i < 5; i++) f.add(U.box, i % 2 ? 0xffffff : 0xd9302b, 0, (h - .06 - i * .085) * k, -.37 * k, .02 * k, .085 * k, .72 * k); f.add(U.box, 0x1f3f9a, 0, (h - .145) * k, -.15 * k, .03 * k, .255 * k, .3 * k);
    part(f, (m, c, t) => { m.rotation.y = Math.sin(t * 6 + (c.x || 0) * .1) * .2; }, x, y, z); };
  if (kind === 'train') {
    b.add(U.box, dark, 0, .58, .2, 1.5, .26, 4.7).add(U.cyl, body, 0, 1.4, .95, .74, 2.7, .74, HP, 0, 0).add(U.cyl, dark, 0, 1.4, 2.4, .78, .4, .78, HP, 0, 0).add(U.ball, trim, 0, 1.4, 2.62, .3, .3, .12)
      .add(U.cyl, dark, 0, 2.4, 1.95, .2, .8, .2).add(U.taper, dark, 0, 2.9, 1.95, .36, .3, .36, Math.PI, 0, 0).add(U.ball, 0xffd76a, 0, 2.15, .95, .3, .34, .3).add(U.cyl, 0xffd76a, 0, 2.2, .2, .13, .3, .13)
      .add(U.box, trim, 0, 1.75, -1.35, 1.7, 1.75, 1.5).add(U.box, dark, 0, 2.3, -.58, 1.3, .5, .06).add(U.box, dark, 0, 1.5, -2.25, 1.5, 1.1, .5)
      .add(U.gab, 0xd9302b, 0, .3, 2.75, 1.6, .7, .9, HP, 0, 0).add(U.box, 0xd9302b, 0, .75, 0, 1.72, .12, 3.6);
    V.wheels = [[-.82, 1.75, .46, .22, 0], [.82, 1.75, .46, .22, 0], [-.82, .55, .52, .22, 0], [.82, .55, .52, .22, 0], [-.82, -1.25, .66, .24, 0], [.82, -1.25, .66, .24, 0]];
    seat(0, 2.85, -1.35, 1); V.flame = [1.2, -2.7];
    for (let k = 0; k < 3; k++) part(new Builder().add(U.lo, 0xffffff, 0, 0, 0, .34, .34, .34), (m, c, t) => { const u = (t * .9 + k / 3) % 1; m.position.set(0, 3.2 + u * 2.2, 1.95 - u * (1 + c.speed * .05)); m.scale.setScalar(.6 + u * 1.6); });
  } else if (kind === 'bike') {
    b.add(U.box, dark, 0, .78, 0, .3, .42, 2.0).add(U.box, body, 0, 1.1, .38, .52, .42, .95).add(U.box, dark, 0, 1.02, -.55, .44, .16, .95).add(U.box, body, 0, 1.0, -1.25, .34, .16, .7, .25, 0, 0)
      .add(U.box, 0xc8ccd4, 0, .98, 1.32, .12, 1.15, .12, -.45, 0, 0).add(U.box, dark, 0, 1.52, 1.02, 1.05, .08, .08).add(U.ball, trim, 0, 1.3, 1.5, .2, .2, .16).add(U.cyl, 0xc8ccd4, .3, .5, -.9, .09, 1.5, .09, HP, 0, 0).add(U.box, body, 0, 1.18, 1.12, .44, .3, .3);
    V.wheels = [[0, 1.6, .56, .2, 1], [0, -1.45, .6, .3, 0]]; seat(0, 2.25, -.2, 1, 1); V.roll = .38; V.flame = [.6, -2.2];
  } else if (kind === 'chariot') {
    const gold = 0xffd76a;
    b.add(U.box, 0x7a4a2a, 0, .78, -.9, 1.7, .16, 1.6).add(U.box, body, 0, 1.4, -.12, 1.8, 1.15, .14).add(U.box, body, -.86, 1.3, -.8, .13, .95, 1.4).add(U.box, body, .86, 1.3, -.8, .13, .95, 1.4)
      .add(U.box, gold, 0, 2.0, -.12, 1.9, .12, .2).add(U.ball, gold, 0, 1.4, -.02, .34, .34, .08).add(U.box, 0x7a4a2a, 0, .8, 1.3, .12, .12, 2.9);
    V.wheels = [[-1.08, -.9, .82, .14, 0], [1.08, -.9, .82, .14, 0]]; seat(0, 2.75, -.95, 1, 1); V.flame = [.8, -2];
    [[-.56, 0xf4f0e8], [.56, 0x7a4a2a]].forEach(([x, col], k) => {
      const h = new Builder().add(U.box, col, 0, 1.2, 0, .52, .62, 1.5).add(U.box, col, 0, 1.75, .85, .3, .85, .32, .7, 0, 0).add(U.box, col, 0, 2.1, 1.25, .3, .34, .62).add(U.box, 0x2a1a12, 0, 1.9, .7, .1, .7, .3, .7, 0, 0).add(U.box, 0x2a1a12, 0, 1.2, -.9, .1, .6, .12, -.5, 0, 0).add(U.box, body, 0, 1.55, .1, .56, .1, .5);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) h.add(U.box, col, sx * .17, .45, sz * .55, .13, .9, .13);
      part(h, (m, c, t) => { const g = Math.min(1, c.speed / 20); m.position.y = Math.abs(Math.sin(t * 9 + k * 1.6)) * .22 * g; m.rotation.x = Math.sin(t * 9 + k * 1.6) * .07 * g; }, x, 0, 2.7);
    });
  } else if (kind === 'pod') {
    for (const k of [-1, 1]) b.add(U.cyl, body, k * 1.02, .65, 1.6, .44, 2.5, .44, HP, 0, 0).add(U.cyl, dark, k * 1.02, .65, 2.9, .5, .3, .5, HP, 0, 0).add(U.cyl, 0x8fe8ff, k * 1.02, .65, .32, .3, .12, .3, HP, 0, 0).add(U.box, trim, k * 1.02, 1.12, 1.4, .08, .5, 1.2).add(U.box, 0x9aa4b8, k * .58, .66, -.2, .05, .05, 2.5, 0, -k * .22, 0);
    b.add(U.box, 0xff4fd8, 0, .65, 1.9, 2.0, .07, .07).add(U.ball, trim, 0, .62, -1.7, .72, .52, 1.15).add(U.box, body, 0, .95, -2.5, .1, .7, .6).add(U.box, dark, 0, .98, -1.2, .6, .2, .4);
    V.bob = .1; seat(0, 1.35, -1.7, 1); V.flame = [.65, -3];
  } else if (kind === 'tank') {
    for (const k of [-1, 1]) { b.add(U.box, dark, k * .98, .42, 0, .56, .84, 4.5); for (let z = -1.7; z <= 1.7; z += .85) b.add(U.cyl, 0x4a4f5a, k * 1.27, .4, z, .36, .06, .36, 0, 0, HP); }
    b.add(U.box, body, 0, .82, 0, 1.6, .62, 4.1).add(U.box, body, 0, .95, 2.0, 1.6, .3, .7, .5, 0, 0).add(U.oct, trim, 0, 1.42, -.25, .9, .58, .9).add(U.cyl, dark, 0, 1.45, 1.6, .14, 2.6, .14, HP, 0, 0).add(U.cyl, dark, 0, 1.45, 2.9, .2, .3, .2, HP, 0, 0).add(U.box, dark, -.5, 1.3, -1.6, .3, .4, .5);
    seat(0, 2.18, -.25, 1); V.flame = [.9, -2.5]; flag(.6, 1.1, -1.9);
  } else if (kind === 'truck') {
    b.add(U.box, dark, 0, 1.12, 0, 1.5, .3, 4.5).add(U.box, body, 0, 1.62, 1.75, 1.75, .66, 1.35).add(U.box, body, 0, 1.75, .35, 1.8, .92, 1.5).add(U.box, 0x8fc0e8, 0, 2.05, 1.08, 1.6, .5, .06).add(U.box, trim, 0, 1.56, -1.45, 1.8, .6, 1.9)
      .add(U.box, 0xc8ccd4, 0, 1.3, 2.52, 1.9, .5, .14).add(U.box, dark, 0, 2.5, -.45, 1.7, .1, .1).add(U.cyl, 0xc8ccd4, -.8, 2.3, -.45, .09, 1.5, .09).add(U.cyl, 0xc8ccd4, .8, 2.3, -.45, .09, 1.5, .09).add(U.ball, 0xfff2b0, -.6, 1.7, 2.44, .16, .16, .06).add(U.ball, 0xfff2b0, .6, 1.7, 2.44, .16, .16, .06);
    V.wheels = [[-1.12, 1.7, .8, .6, 1], [1.12, 1.7, .8, .6, 1], [-1.12, -1.55, .8, .6, 0], [1.12, -1.55, .8, .6, 0]]; seat(0, 2.75, .25, 1); V.flame = [1.3, -2.6]; flag(-.8, 1.8, -2.2);
  } else if (kind === 'golf') {
    b.add(U.box, 0xfaf6ee, 0, .62, 0, 1.55, .46, 3.1).add(U.box, body, 0, .9, 1.25, 1.5, .34, .7, -.3, 0, 0).add(U.box, trim, 0, 1.05, -.4, 1.35, .5, .55).add(U.box, trim, 0, 1.5, -.72, 1.35, .7, .14).add(U.box, body, 0, 2.5, -.1, 1.65, .1, 2.3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(U.box, 0xc8ccd4, sx * .72, 1.7, -.1 + sz * 1.0, .07, 1.55, .07);
    b.add(U.cyl, 0xd9302b, .42, 1.4, -1.38, .22, 1.1, .22, -.15, 0, 0).add(U.cyl, 0xc8ccd4, .36, 2.1, -1.5, .03, .6, .03).add(U.cyl, 0xc8ccd4, .5, 2.15, -1.48, .03, .7, .03).add(U.box, dark, 0, 1.25, .75, .06, .5, .06, -.5, 0, 0).add(U.ball, 0xffffff, -.5, .92, 1.0, .1, .1, .1);
    V.wheels = [[-.86, 1.3, .32, .24, 1], [.86, 1.3, .32, .24, 1], [-.86, -1.2, .32, .24, 0], [.86, -1.2, .32, .24, 0]]; seat(0, 1.85, -.3, 1); V.flame = [.6, -1.9]; flag(-.72, .85, -1.5);
  } else if (kind === 'hover') {
    b.add(U.box, body, 0, .1, 0, 1.0, .14, 2.8).add(U.box, trim, 0, .1, 1.5, .8, .12, .4, -.3, 0, 0).add(U.box, trim, 0, .1, -1.5, .8, .12, .4, .3, 0, 0).add(U.cyl, 0x8fe8ff, 0, -.02, .85, .32, .1, .32).add(U.cyl, 0x8fe8ff, 0, -.02, -.85, .32, .1, .32).add(U.box, 0x8fe8ff, 0, .02, 0, 1.06, .04, 2.2);
    V.bob = .12; V.roll = .3; seat(0, 1.5, -.1, 1, 1); V.flame = [.1, -1.9];
  } else if (kind === 'skate') {
    b.add(U.box, body, 0, .38, 0, .9, .09, 2.7).add(U.box, body, 0, .46, 1.5, .9, .09, .5, -.4, 0, 0).add(U.box, body, 0, .46, -1.5, .9, .09, .5, .4, 0, 0).add(U.box, dark, 0, .44, 0, .8, .03, 2.5).add(U.box, 0xc8ccd4, 0, .27, 1.0, .8, .1, .16).add(U.box, 0xc8ccd4, 0, .27, -1.0, .8, .1, .16);
    V.wheels = [[-.4, 1.0, .17, .14, 1], [.4, 1.0, .17, .14, 1], [-.4, -1.0, .17, .14, 0], [.4, -1.0, .17, .14, 0]]; V.roll = .26; seat(0, 1.82, -.1, 1, 1); V.flame = [.4, -1.8];
  } else if (kind === 'dragon') {
    b.add(U.ball, body, 0, 0, .3, .9, .8, 1.5).add(U.ball, trim, 0, -.28, .3, .7, .56, 1.3).add(U.cone, body, 0, 0, -2.1, .55, 2.7, .5, -HP, 0, 0).add(U.gab, trim, 0, -.05, -3.6, .9, .7, .1, -HP, 0, 0)
      .add(U.taper, body, 0, .75, 1.75, .4, 1.6, .4, .95, 0, 0).add(U.box, body, 0, 1.4, 2.6, .6, .5, .95).add(U.box, body, 0, 1.3, 3.15, .44, .32, .5).add(U.ball, 0xffe066, -.26, 1.58, 2.75, .1, .1, .1).add(U.ball, 0xffe066, .26, 1.58, 2.75, .1, .1, .1)
      .add(U.cone, trim, -.22, 1.85, 2.2, .1, .6, .1, -.6, 0, 0).add(U.cone, trim, .22, 1.85, 2.2, .1, .6, .1, -.6, 0, 0).add(U.cone, 0xffffff, -.16, 1.1, 3.3, .05, .2, .05, Math.PI, 0, 0).add(U.cone, 0xffffff, .16, 1.1, 3.3, .05, .2, .05, Math.PI, 0, 0);
    for (let k = 0; k < 6; k++) b.add(U.cone, trim, 0, .78 - k * .08, .6 - k * .7, .12, .4, .12, -.3, 0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(U.box, body, sx * .6, -.75, .3 + sz * .7, .22, .7, .22, sz * -.3, 0, 0).add(U.box, trim, sx * .6, -1.1, .42 + sz * .7, .28, .12, .4);
    wing(trim, body, 2.9, 1.9, .55, .45, .4, 6.5); V.bob = .14; V.roll = .22; seat(0, 1.3, -.1, 1); V.flame = [0, -3.9]; V.fire = [1.3, 3.5];
  } else if (kind === 'eagle') {
    const br = 0x4a3222, wh = 0xfafafa, ye = 0xffc928;
    b.add(U.ball, br, 0, 0, 0, .78, .68, 1.5).add(U.ball, wh, 0, .42, 1.45, .46, .46, .5).add(U.cone, ye, 0, .3, 2.0, .16, .5, .14, 1.9, 0, 0).add(U.ball, 0x16181d, -.3, .52, 1.62, .07, .07, .07).add(U.ball, 0x16181d, .3, .52, 1.62, .07, .07, .07)
      .add(U.box, wh, 0, .05, -1.7, 1.0, .1, 1.0).add(U.box, wh, -.45, .05, -2.0, .4, .09, .9, 0, .3, 0).add(U.box, wh, .45, .05, -2.0, .4, .09, .9, 0, -.3, 0).add(U.box, body, 0, .7, -.1, .86, .12, 1.0).add(U.box, trim, 0, .72, -.1, .9, .06, .3);
    for (const k of [-1, 1]) b.add(U.box, ye, k * .3, -.75, -.2, .1, .5, .1).add(U.box, ye, k * .3, -1.0, -.05, .26, .08, .4);
    wing(br, wh, 3.0, 1.5, .5, .25, .15, 5.2); V.bob = .14; V.roll = .25; seat(0, 1.3, -.1, 1); V.flame = [0, -2.6]; flag(0, .1, -2.2, 1.0);
  } else if (kind === 'broom') {
    b.add(U.cyl, 0x8a5a3a, 0, 0, .45, .09, 3.5, .09, HP, 0, 0).add(U.cone, 0xe2b64a, 0, 0, -1.95, .52, 1.5, .52, HP, 0, 0).add(U.cyl, body, 0, 0, -1.28, .2, .26, .2, HP, 0, 0).add(U.cone, 0xc89a3a, 0, 0, -2.3, .4, 1.0, .4, HP, 0, 0)
      .add(U.box, trim, 0, .1, -.2, .5, .1, .75).add(U.cyl, 0x2a2f3a, 0, -.2, 2.0, .02, .4, .02).add(U.ball, 0xffd76a, 0, -.48, 2.0, .16, .2, .16).add(U.cone, body, 0, .1, 2.25, .12, .3, .12, HP, 0, 0);
    V.bob = .16; V.roll = .32; seat(0, 1.32, -.2, 1, 1); V.flame = [0, -2.9];
  } else if (kind === 'chair') {
    const ch_ = 0xc8ccd4;
    b.add(U.box, dark, 0, .72, -.05, 1.0, .1, 1.0).add(U.box, body, 0, .82, -.05, .95, .12, .95).add(U.box, body, 0, 1.32, -.55, .95, 1.0, .12).add(U.box, ch_, -.52, 1.05, -.1, .06, .08, .9).add(U.box, ch_, .52, 1.05, -.1, .06, .08, .9)
      .add(U.box, ch_, -.52, .9, .3, .06, .4, .06).add(U.box, ch_, .52, .9, .3, .06, .4, .06).add(U.box, ch_, -.45, 1.85, -.75, .06, .06, .42).add(U.box, ch_, .45, 1.85, -.75, .06, .06, .42).add(U.box, trim, -.45, 1.85, -.95, .09, .09, .16).add(U.box, trim, .45, 1.85, -.95, .09, .09, .16)
      .add(U.box, ch_, -.26, .5, .62, .05, .55, .05, .5, 0, 0).add(U.box, ch_, .26, .5, .62, .05, .55, .05, .5, 0, 0).add(U.box, dark, -.26, .28, .82, .3, .05, .3).add(U.box, dark, .26, .28, .82, .3, .05, .3).add(U.box, ch_, 0, .62, -.25, 1.3, .06, .06);
    V.wheels = [[-.64, -.25, .62, .09, 0], [.64, -.25, .62, .09, 0], [-.45, .72, .17, .1, 1], [.45, .72, .17, .1, 1]]; seat(0, 1.92, -.12, 1, 1); V.flame = [.7, -1.2]; flag(-.58, .7, -.8);
  } else if (kind === 'bed') {
    const wh = 0xfafafa, ch_ = 0xc8ccd4;
    b.add(U.box, ch_, 0, .58, 0, 1.4, .12, 3.0).add(U.box, wh, 0, .82, .3, 1.3, .3, 2.3).add(U.box, wh, 0, 1.18, -1.0, 1.3, .26, 1.15, -.6, 0, 0).add(U.box, 0xdcecff, 0, 1.52, -1.2, 1.0, .2, .55, -.6, 0, 0).add(U.box, body, 0, 1.05, .45, 1.36, .22, 1.8)
      .add(U.box, trim, 0, 1.2, -.42, 1.36, .12, .3).add(U.box, ch_, 0, .95, 1.5, 1.4, .7, .08).add(U.box, ch_, 0, 1.25, -1.55, 1.4, 1.2, .08).add(U.box, ch_, -.69, 1.2, .3, .05, .3, 1.3).add(U.box, ch_, .69, 1.2, .3, .05, .3, 1.3)
      .add(U.cyl, ch_, .62, 2.0, -1.5, .03, 1.9, .03).add(U.box, ch_, .5, 2.9, -1.5, .3, .04, .04).add(U.ball, 0x6fd8ff, .4, 2.65, -1.5, .13, .22, .08).add(U.box, 0xd9302b, 0, 1.17, .5, .5, .02, .16).add(U.box, 0xd9302b, 0, 1.17, .5, .16, .02, .5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(U.box, ch_, sx * .6, .38, sz * 1.3, .06, .34, .06);
    V.wheels = [[-.6, 1.3, .2, .14, 1], [.6, 1.3, .2, .14, 1], [-.6, -1.3, .2, .14, 0], [.6, -1.3, .2, .14, 0]]; seat(0, 1.95, -.85, 1, 0); V.flame = [.7, -1.8];
  } else if (kind === 'bin') {
    const rim = 0x2a2f3a, bag = 0x23262e;
    b.add(U.box, body, 0, .95, 0, 1.75, 1.15, 2.7).add(U.box, body, 0, .5, 0, 1.5, .3, 2.4).add(U.box, rim, 0, 1.55, 0, 1.85, .1, 2.8).add(U.box, trim, 0, 1.05, 1.36, 1.2, .1, .02).add(U.box, trim, 0, .8, 1.36, .8, .1, .02)
      .add(U.box, rim, -.93, .95, 0, .12, .28, 1.3).add(U.box, rim, .93, .95, 0, .12, .28, 1.3).add(U.box, rim, 0, 2.05, -1.42, 1.85, .08, 1.3, 1.25, 0, 0).add(U.box, rim, 0, 1.63, .75, 1.85, .08, 1.3, .08, 0, 0)
      .add(U.lo, bag, -.5, 1.75, -.75, .4, .36, .4).add(U.lo, bag, .5, 1.7, -.55, .34, .3, .34).add(U.box, 0xc89a5a, .55, 1.75, -1.0, .5, .4, .4, 0, .4, .2).add(U.box, 0xffd23d, -.2, 1.68, -1.05, .1, .04, .4, 0, .6, 0).add(U.cyl, 0xc8ccd4, .3, 1.75, -.2, .1, .26, .1, 1.2, .5, 0);
    V.wheels = [[-.75, 1.1, .2, .16, 1], [.75, 1.1, .2, .16, 1], [-.75, -1.1, .2, .16, 0], [.75, -1.1, .2, .16, 0]]; seat(0, 2.1, -.25, 1, 0); V.flame = [.9, -1.6];
  } else if (kind === 'horse') {
    const coat = 0x8a5a34, mane = 0x2a1a12;
    b.add(U.box, coat, 0, 1.7, 0, .75, .8, 2.2).add(U.box, coat, 0, 2.35, 1.25, .42, 1.15, .46, .6, 0, 0).add(U.box, coat, 0, 2.85, 1.85, .4, .42, .85).add(U.box, 0xf4e6d0, 0, 2.8, 2.25, .3, .28, .12).add(U.box, mane, 0, 2.5, 1.0, .12, 1.05, .3, .6, 0, 0)
      .add(U.cone, coat, -.14, 3.15, 1.6, .07, .24, .07).add(U.cone, coat, .14, 3.15, 1.6, .07, .24, .07).add(U.ball, 0x16181d, -.21, 2.92, 2.0, .05, .06, .05).add(U.ball, 0x16181d, .21, 2.92, 2.0, .05, .06, .05)
      .add(U.box, mane, 0, 1.5, -1.25, .14, .95, .14, -.4, 0, 0).add(U.box, trim, 0, 2.09, -.05, .84, .06, 1.25).add(U.box, body, 0, 2.16, -.05, .8, .14, .9).add(U.box, body, 0, 2.3, -.5, .7, .2, .12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(new Builder().add(U.box, coat, 0, -.62, 0, .2, 1.3, .2).add(U.box, mane, 0, -1.28, 0, .24, .16, .26), (m, c, t) => { m.rotation.x = Math.sin(t * 11 + (sz > 0 ? 0 : Math.PI) + (sx > 0 ? .7 : 0) + (c.x || 0) * .01) * .7 * Math.min(1, c.speed / 14); }, sx * .26, 1.36, sz * .82);
    V.bob = .06; seat(0, 3.02, -.12, 1, 1); V.flame = [1.6, -1.6];
  } else if (kind === 'clown') {
    const dots = [0xffd23d, 0x29b6f6, 0xff4f81, 0x7ccf4a, 0xffffff, 0x9b6fe0];
    b.add(U.ball, body, 0, .95, 0, 1.15, .72, 1.9).add(U.box, dark, 0, .5, 0, 1.6, .2, 3.0).add(U.box, 0xffd23d, 0, .55, 1.95, 1.8, .22, .2).add(U.box, 0xffd23d, 0, .55, -1.95, 1.8, .22, .2)
      .add(U.ball, 0xfff2b0, -.5, 1.0, 1.72, .2, .2, .12).add(U.ball, 0xfff2b0, .5, 1.0, 1.72, .2, .2, .12).add(U.ball, 0xff2a2a, 0, .95, 1.9, .2, .2, .14)
      .add(U.cone, 0xffd76a, 1.2, 1.3, .6, .22, .6, .22, HP, 0, 0).add(U.ball, 0x16181d, 1.2, 1.3, .2, .16, .16, .16).add(U.cyl, 0xc8ccd4, -.7, 2.0, -1.2, .03, 1.5, .03).add(U.ball, 0xff4f81, -.7, 2.8, -1.2, .22, .22, .08).add(U.ball, 0xffd23d, -.7, 2.8, -1.16, .1, .1, .08);
    for (let k = 0; k < 14; k++) { const a = k * 2.4, e = (k % 3 - 1) * .5 + .3, x = Math.cos(a) * Math.cos(e) * 1.13, y = Math.sin(e) * .7, z = Math.sin(a) * Math.cos(e) * 1.86; b.add(U.ball, dots[k % 6], x, .97 + y, z, .17, .17, .17); }
    V.wheels = [[-1.1, 1.35, .5, .34, 1], [1.1, 1.35, .38, .3, 1], [-1.1, -1.3, .4, .3, 0], [1.1, -1.3, .56, .36, 0]]; V.wobble = true; seat(0, 2.05, -.15, 1, 0, true); V.flame = [.8, -2.2];
  } else {
    const nose = new THREE.CylinderGeometry(.32, 1, 1, 6);
    b.add(U.box, dark, 0, .26, 0, 1.75, .12, 3.9).add(U.box, body, 0, .55, -.15, 1.05, .5, 3.0).add(nose, body, 0, .5, 2.05, .5, 1.7, .4, HP, 0, 0)
      .add(U.box, trim, 0, .26, 2.8, 2.35, .08, .6).add(U.box, body, -1.15, .4, 2.8, .08, .34, .65).add(U.box, body, 1.15, .4, 2.8, .08, .34, .65)
      .add(U.box, trim, -.74, .5, -.25, .5, .4, 1.6).add(U.box, trim, .74, .5, -.25, .5, .4, 1.6).add(U.box, body, 0, .95, -1.15, .6, .55, 1.3).add(U.box, dark, 0, 1.25, -.75, .34, .3, .4)
      .add(U.box, trim, 0, 1.45, -1.95, 2.05, .09, .6).add(U.box, dark, -.5, 1.1, -1.9, .08, .7, .3).add(U.box, dark, .5, 1.1, -1.9, .08, .7, .3)
      .add(U.box, body, -1.02, 1.3, -1.95, .07, .55, .7).add(U.box, body, 1.02, 1.3, -1.95, .07, .55, .7).add(U.box, dark, 0, .78, .55, .7, .08, .5);
    V.wheels = [[-1.08, 1.8, .5, .46, 1], [1.08, 1.8, .5, .46, 1], [-1.12, -1.5, .56, .58, 0], [1.12, -1.5, .56, .58, 0]]; seat(0, 1.28, .1, 1);
  }
  V.hover = VEH_HOVER[kind] || 0; V.body = b.mesh(VEH_MAT()); V.body.castShadow = true;
  const d = new Builder(), st = V.seat; addDriver(d, ch, st[0] * V.S, st[1] * V.S, st[2] * V.S, 1, st[3], st[4]); V.driver = d.mesh(VEH_MAT()); V.driver.castShadow = true;
  return V;
}
function makeCar(ch, isPlayer, kind) {
  const U = unitGeos();
  if (!WHEEL_GEO) {
    const t = new THREE.CylinderGeometry(1, 1, 1, 16), h = new THREE.CylinderGeometry(.55, .55, 1.06, 10), rz = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
    WHEEL_GEO = mergeGeo([[t, rz, () => [.1, .1, .12]], [h, rz, () => [.75, .77, .8]], [U.box, new THREE.Matrix4().makeScale(1.1, .22, .9), () => [.2, .2, .23]]]);
  }
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const V = buildVehicle(kind, ch), vg = new THREE.Group(); vg.scale.setScalar(V.S); tilt.add(vg); tilt.add(V.driver); vg.add(V.body); for (const p of V.parts) vg.add(p.mesh);
  const wheels = V.wheels.map(w => { const m = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT); m.position.set(w[0], w[2], w[1]); m.scale.set(w[3], w[2], w[2]); m.rotation.order = 'YXZ'; m.castShadow = true; m.userData.steer = w[4]; m.userData.r = w[2] * V.S; vg.add(m); return m; });
  const flame = new THREE.Mesh(U.cone, new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, opacity: .85 }));
  if (V.fire) { flame.rotation.x = Math.PI / 2; flame.position.set(0, V.fire[0] * V.S, (V.fire[1] + 1) * V.S); } else { flame.rotation.x = -Math.PI / 2; flame.position.set(0, V.flame[0] * V.S, V.flame[1] * V.S); }
  flame.scale.set(.35, 1.6, .35); flame.visible = false; tilt.add(flame);
  const sparks = [-1, 1].map(s => { const m = new THREE.Mesh(U.sph, new THREE.MeshBasicMaterial({ color: 0x6fd8ff })); m.position.set(s * .9, .25 - V.hover * .6, -1.5); m.visible = false; tilt.add(m); return m; });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); blob.rotation.x = -Math.PI / 2; blob.scale.set(1.6, 2.9, 1); blob.position.y = .12; g.add(blob);
  return { ch, isPlayer, kind, V, mesh: g, tilt, wheels, flame, sparks, blob, x: 0, y: 0, z: 0, th: 0, vx: 0, vz: 0, vF: 0, speed: 0, steer: 0, si: 0, lat: 0, along: 0, lap: 0, maxLap: 0, drift: 0, driftT: 0, boostT: 0, meter: 35, slip: 0, topMul: 1, skillTop: 1, lapStart: 0, best: Infinity, last: 0, laps: [], sec: 0, secStart: 0, secs: [], lapSecs: [], gear: 0, rpm: 0, finished: false, finishTime: 0, dirty: false, pos: 1, lanePref: 0, laneT: 0, latT: 0, stuck: 0, spin: 0, aiBoost: 10 };
}
/* small pictures of each vehicle for the setup screen, drawn with the real models */
function vehicleThumbs(ch) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1.4, .5, 100), out = {}; sc.background = new THREE.Color(0x1c2542);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x556080, .85)); const dl = new THREE.DirectionalLight(0xffffff, .8); dl.position.set(4, 8, 6); sc.add(dl);
  const pr = renderer.getPixelRatio(), sh = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.setPixelRatio(1); renderer.setSize(224, 160, false);
  for (const v of VEHICLES) {
    const c = makeCar(ch, false, v.id); c.tilt.position.y = c.V.hover; c.blob.visible = false; sc.add(c.mesh); c.V.parts.forEach(p => p.fn(p.mesh, { speed: 0, x: 0 }, .3));
    const far = v.id === 'dragon' || v.id === 'eagle' || v.id === 'car' || v.id === 'pod' ? 9.5 : 7.6; cam.position.set(far * .62, far * .34 + c.V.hover * .5, far * .62); cam.lookAt(0, .85 + c.V.hover * .7, .2); cam.updateProjectionMatrix();
    renderer.render(sc, cam); out[v.id] = renderer.domElement.toDataURL('image/png'); sc.remove(c.mesh);
    c.mesh.traverse(o => { if (o.geometry && o.geometry !== WHEEL_GEO && !Object.values(UNIT).includes(o.geometry)) o.geometry.dispose(); });
  }
  renderer.shadowMap.enabled = sh; renderer.setPixelRatio(pr); G.resize(); return out;
}

/* ---------- game: cars, physics, AI, race flow ---------- */
const $ = id => document.getElementById(id);
var G = window.G = { state: 'boot', t: 0, cars: [], toasts: [], points: 0, view: 0 };
const RACE = () => OPT.mode === 'race' || OPT.mode === 'gp';
const OPT = { mode: 'race', items: true, track: 'sakura-crossing', hud: 'full', char: 0, laps: 3, klass: 'medium', ai: 'normal', opp: 7, grid: 'back', dir: 'fwd', boost: true, chal: true, bump: true, rubber: true, units: 'both', veh: 'car', rivals: 'mixed', line: false, cs: { rings: 1, coins: 1, pads: 1, slalom: 1, trap: 1, drift: 1, sprint: 1, start: 1, close: 1, hotlap: 1, clean: 1 }, cam: 'chase', quality: 'high', sfx: 70, music: 40 };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
Object.assign(OPT, store.get('sgp_opts', {}));
let BEST = store.get('sgp_best2', {});
const trackDef = () => TRACKS.find(t => t.id === OPT.track) || TRACKS[0];
const bestKey = () => OPT.track + '|' + OPT.klass + '|' + OPT.dir;

let renderer, scene, camera;
function initGL() {
  renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(66, 1, 1, 14000);
  const rs = () => { const w = $('app').clientWidth || innerWidth, h = $('app').clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  addEventListener('resize', rs); rs(); G.resize = rs;
}
const QN = () => ({ low: 0, medium: 1, high: 2 })[OPT.quality];
function loadTrack(cb) {
  const key = OPT.track + '|' + OPT.dir + '|' + OPT.quality;
  if (G.worldKey === key) return cb && cb();
  $('loading').hidden = false; $('loadText').textContent = 'Building ' + trackDef().name + '…';
  setTimeout(() => {
    if (G.W) { scene.remove(G.W.group); G.W.dispose(); }
    clearRace();
    G.def = trackDef(); G.T = buildTrack(G.def, OPT.dir === 'rev'); G.W = buildWorld(G.T, QN()); G.worldKey = key;
    scene.add(G.W.group); scene.fog = G.W.fog;
    renderer.shadowMap.enabled = QN() === 2; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, [1, 1.5, 2][QN()])); G.resize();
    buildMinimap(); G.fly = 30; G.fpsN = 0; G.fpsT = 0;
    $('loading').hidden = true; if (G.state === 'menu') syncMenu(); cb && cb();
  }, 40);
}

function clearRace() {
  clearItems();
  for (const c of G.cars) scene.remove(c.mesh); G.cars = []; G.player = null;
  if (G.chal) { scene.remove(G.chal.group); G.chal = null; }
  if (G.lineMesh) { scene.remove(G.lineMesh); G.lineMesh.geometry.dispose(); G.lineMesh = null; }
}
function placeCar(c, i, lat) {
  const T = G.T; c.si = i; c.x = T.px[i] + T.rx[i] * lat; c.z = T.pz[i] + T.rz[i] * lat; c.th = T.th[i]; c.vx = c.vz = 0; c.vF = 0; c.steer = 0; c.drift = 0; c.lat = lat; c.along = 0; c.y = T.py[i]; c.latT = lat;
}

function locate(c) {
  const T = G.T, N = T.N; let best = c.si, bd = 1e12;
  for (let o = -8; o <= 8; o++) { const i = (c.si + o + N) % N, dx = c.x - T.px[i], dz = c.z - T.pz[i], d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
  if (best !== c.si) { const prev = c.si; c.si = best; if (prev > N * .75 && best < N * .25) c.lap++; else if (prev < N * .25 && best > N * .75) c.lap--; }
  const i = c.si, dx = c.x - T.px[i], dz = c.z - T.pz[i]; c.lat = dx * T.rx[i] + dz * T.rz[i]; c.along = dx * T.tx[i] + dz * T.tz[i];
}
function stepCar(c, inp, dt) {
  inp = itemInput(c, inp, dt);
  const T = G.T, cls = G.cls;
  c.steer += clamp(inp.steer - c.steer, -dt * 6, dt * 6);
  let fx = Math.sin(c.th), fz = Math.cos(c.th), vF = c.vx * fx + c.vz * fz;
  const off = Math.abs(c.lat) > T.hw + 1.7;
  if (c.drift) {
    c.driftT += dt;
    if (!inp.drift || vF < cls.top * .25 || off) {
      if (OPT.boost && !off && c.driftT > 1.0) { c.boostT = c.driftT > 2.2 ? 1.3 : .7; if (c.isPlayer) { Sound.whoosh(); addPoints(c.driftT > 2.2 ? 60 : 25); } }
      c.drift = 0; c.driftT = 0;
    }
  } else if (inp.drift && Math.abs(inp.steer) > .4 && vF > cls.top * .4 && !off) { c.drift = Math.sign(inp.steer); c.driftT = 0; }
  let yaw = Math.min(2.3, A_LAT / Math.max(Math.abs(vF), 8)), st = c.steer;
  if (c.drift) { st = c.drift * .5 + c.steer * .7; yaw *= 1.12; }
  c.th -= st * yaw * dt * (vF >= 0 ? 1 : -1) * Math.min(1, Math.abs(vF) / 3);
  fx = Math.sin(c.th); fz = Math.cos(c.th); const rx = -fz, rz = fx;
  vF = c.vx * fx + c.vz * fz; let vL = c.vx * rx + c.vz * rz;
  let top = cls.top * c.topMul, acc = cls.acc; c.boosting = false;
  if (c.boostT > 0) { c.boostT -= dt; top *= 1.2; acc *= 2.2; c.boosting = true; }
  if (inp.boost && c.meter > 0 && OPT.boost && vF > 5) { c.meter = Math.max(0, c.meter - 26 * dt); top *= 1.17; acc *= 1.9; c.boosting = true; }
  if (c.slip > 0) { top *= 1.045; acc *= 1.2; }
  if (off) top *= .5;
  if (inp.throttle > 0 && vF < top) vF = Math.min(top, vF + acc * inp.throttle * (1.05 - Math.pow(Math.max(vF, 0) / top, 2) * .8) * dt);
  if (vF > top) vF -= Math.min(vF - top, (off ? 32 : 9) * dt);
  if (inp.brake > 0) { if (vF > .3) vF = Math.max(0, vF - 42 * inp.brake * dt); else if (inp.throttle <= 0) vF = Math.max(vF - 10 * dt, -11); }
  else if (inp.throttle <= 0) { vF -= vF * .4 * dt; }
  vF -= 6 * T.slope[c.si] * (fx * T.tx[c.si] + fz * T.tz[c.si]) * dt;
  vL *= Math.exp(-(c.drift ? 2.6 : off ? 4.5 : 9.5) * dt);
  c.vx = fx * vF + rx * vL; c.vz = fz * vF + rz * vL;
  c.x += c.vx * dt; c.z += c.vz * dt;
  locate(c);
  const w = T.wall[c.si] - 1.0;
  if (Math.abs(c.lat) > w) {
    const sg = Math.sign(c.lat), i = c.si, over = Math.abs(c.lat) - w; c.x -= T.rx[i] * sg * over; c.z -= T.rz[i] * sg * over; c.lat = sg * w;
    const vr = c.vx * T.rx[i] + c.vz * T.rz[i];
    if (vr * sg > 0) { c.vx -= T.rx[i] * vr * 1.25; c.vz -= T.rz[i] * vr * 1.25; const loss = Math.min(.3, Math.abs(vr) * .012); c.vx *= 1 - loss; c.vz *= 1 - loss; if (Math.abs(vr) > 7 && c.isPlayer) Sound.thud(); }
    const tt = T.th[i] + (c.vF < 0 ? Math.PI : 0); c.th += wrapAngle(tt - c.th) * Math.min(1, 2.5 * dt);
    c.dirty = true;
  }
  if (off) c.dirty = true;
  c.speed = Math.hypot(c.vx, c.vz); c.vF = vF; c.off = off;
  c.y = T.py[c.si] + T.slope[c.si] * c.along - Math.min(.6, Math.max(0, Math.abs(c.lat) - T.hw - 1.5) * .1625);
}
function collide() {
  const cs = G.cars;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const a = cs[i], b = cs[j], dx = b.x - a.x, dz = b.z - a.z; if (Math.abs(dx) > 5 || Math.abs(dz) > 5 || Math.abs(a.y - b.y) > 2.5) continue;
    const fx = Math.sin(a.th), fz = Math.cos(a.th), lon = dx * fx + dz * fz, la = -dx * fz + dz * fx, q = Math.sqrt(lon * lon / 21 + la * la / 4.8), d = Math.hypot(dx, dz);
    if (q >= 1 || d < 1e-3) continue;
    const nx = dx / d, nz = dz / d, pen = (1 - q) * 1.1; a.x -= nx * pen; a.z -= nz * pen; b.x += nx * pen; b.z += nz * pen;
    const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (rel < 0) { const k = rel * .55; a.vx += nx * k; a.vz += nz * k; b.vx -= nx * k; b.vz -= nz * k; if ((a.isPlayer || b.isPlayer) && rel < -3) Sound.thud(.5); }
  }
}
const AI_LEVEL = { easy: { grip: .56, top: .93 }, normal: { grip: .72, top: .97 }, hard: { grip: .9, top: 1.0 } };
function aiInput(c, dt) {
  const T = G.T, N = T.N, v = c.speed;
  c.laneT -= dt; if (c.laneT <= 0) { c.laneT = 3 + Math.random() * 6; c.lanePref = (Math.random() * 2 - 1) * .6; }
  for (const o of G.cars) {
    if (o === c) continue; const dsi = (o.si - c.si + N) % N;
    if (dsi > 0 && dsi < 9 && Math.abs(o.y - c.y) < 3) { const dl = o.lat - c.lat; if (Math.abs(dl) < 3 && o.speed < v + 2) c.lanePref = clamp(c.lanePref + (dl > 0 || (dl === 0 && c.lat > 0) ? -1 : 1) * dt * 2.2, -.85, .85); }
  }
  const la = Math.max(3, Math.round((8 + v * .42) / T.ds)), ti = (c.si + la) % N;
  const line = clamp(T.kapS[(c.si + la * 2) % N] * 55, -1, 1);
  const lt = (line * .62 + c.lanePref * (1 - Math.abs(line) * .75)) * Math.min(T.hw - 1.8, T.wall[ti] - 2.4);
  c.latT = lerp(c.latT, lt, 1 - Math.exp(-dt * 2.2));
  const err = wrapAngle(Math.atan2(T.px[ti] + T.rx[ti] * c.latT - c.x, T.pz[ti] + T.rz[ti] * c.latT - c.z) - c.th);
  let vt = c.prof[(c.si + 2) % N] * (c.rb || 1); if (c.finished) vt *= .6;
  if (G.state === 'racing' && !c.finished) { if (v < 2) c.stuck += dt; else c.stuck = 0; if (c.stuck > 2.5) { placeCar(c, c.si, 0); c.stuck = 0; } }
  let boost = false;
  if (OPT.boost && !c.isPlayer) { c.aiBoost -= dt; if (c.aiBoost <= 0 && c.prof[(c.si + 40) % N] > G.cls.top * c.skillTop * .97 && v > G.cls.top * .6) { c.boostT = 1.3; c.aiBoost = 16 + Math.random() * 16; } }
  return { steer: clamp(-err * 2.6, -1, 1), throttle: v < vt ? 1 : 0, brake: v > vt + 1.5 ? clamp((v - vt) / 6, .25, 1) : 0, drift: false, boost };
}

/* ---------- input ---------- */
const KEYS = {};
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
addEventListener('keydown', e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.code !== 'Escape') return;
  if (G.state !== 'menu' && GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.repeat) return; KEYS[e.code] = true;
  if (G.state === 'racing' || G.state === 'countdown' || G.state === 'paused') {
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    if (G.state === 'paused') return;
    if (e.code === 'KeyR' && G.state === 'racing' && G.player) { placeCar(G.player, G.player.si, 0); G.player.dirty = true; }
    if (e.code === 'KeyC') { G.view = (G.view + 1) % 3; toast(['Chase camera', 'Far camera', 'Hood camera'][G.view]); }
    if (e.code === 'KeyH') { OPT.hud = HUDS[(HUDS.indexOf(OPT.hud) + 1) % HUDS.length]; applyHud(); toast(HUD_NAME[OPT.hud]); if (OPT.hud !== 'off') store.set('sgp_opts', OPT); }
    if (e.code === 'KeyL') { OPT.line = !OPT.line; if (OPT.line && !G.lineMesh) buildLine(); toast(OPT.line ? 'Racing line on' : 'Racing line off'); store.set('sgp_opts', OPT); }
    if (e.code === 'KeyM') { Sound.muted = !Sound.muted; Sound.applyVol(); toast(Sound.muted ? 'Sound off' : 'Sound on'); }
  } else if (G.state === 'finished' && e.code === 'Enter') { $('btnAgain').click(); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; if (G.state === 'racing') togglePause(); });
function playerInput() {
  let steer = (KEYS.ArrowRight || KEYS.KeyD ? 1 : 0) - (KEYS.ArrowLeft || KEYS.KeyA ? 1 : 0), throttle = KEYS.ArrowUp || KEYS.KeyW ? 1 : 0, brake = KEYS.ArrowDown || KEYS.KeyS ? 1 : 0;
  let drift = !!KEYS.Space, boost = !!(KEYS.ShiftLeft || KEYS.ShiftRight || KEYS.KeyX);
  const gp = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(p => p) : null;
  if (gp) {
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > .15) steer = ax; const b = i => gp.buttons[i] ? gp.buttons[i].value : 0;
    // A or ZR go, B or ZL brake, L or R drift, X boost, Y item (in padPoll)
    throttle = Math.max(throttle, b(7), b(1)); brake = Math.max(brake, b(6), b(0)); drift = drift || b(5) > .5 || b(4) > .5; boost = boost || b(3) > .5;
    if (b(14)) steer = -1; if (b(15)) steer = 1;
  }
  G.lookBack = !!KEYS.KeyB;
  return G.inp = touchInput({ steer, throttle, brake, drift, boost });
}

/* ---------- race setup ---------- */
function startRace() {
  loadTrack(() => {
    clearRace(); Sound.init();
    const T = G.T, N = T.N; G.cls = CLASSES[OPT.klass];
    const nOpp = RACE() ? OPT.opp : 0, total = nOpp + 1, lvl = AI_LEVEL[OPT.ai];
    const pSlot = OPT.grid === 'front' ? 0 : OPT.grid === 'mid' ? Math.floor(nOpp / 2) : nOpp;
    const others = CHARACTERS.filter((c, i) => i !== OPT.char), ROM = ['', ' II', ' III', ' IV', ' V']; let oi = 0, rank = 0;
    const vi = Math.max(0, VEHICLES.findIndex(v => v.id === OPT.veh)), wide = total > 12 ? 3 : 2;
    for (let k = 0; k < total; k++) {
      const isP = k === pSlot; let ch = CHARACTERS[OPT.char], kind = VEHICLES[vi].id;
      if (!isP) { const cyc = Math.floor(oi / others.length), base = others[oi % others.length]; ch = base; if (cyc) { const cc = new THREE.Color(base.car), hsl = {}; cc.getHSL(hsl); cc.setHSL((hsl.h + cyc * .13) % 1, hsl.s, clamp(hsl.l + (cyc % 2 ? -.12 : .1), .25, .75)); ch = Object.assign({}, base, { car: cc.getHex(), name: base.name + ROM[cyc] }); } if (OPT.rivals === 'mixed') kind = VEHICLES[(vi + 1 + oi * 5) % VEHICLES.length].id; oi++; }
      const c = makeCar(ch, isP, kind);
      const skill = isP ? 1 : 1 - (nOpp > 1 ? rank++ / (nOpp - 1) : 0) * .12 + (Math.random() - .5) * .04;
      c.skillTop = isP ? 1 : lvl.top * (1 - (1 - skill) * .25); c.topMul = c.skillTop;
      c.prof = speedProfile(T, G.cls.top * c.skillTop, A_LAT * (isP ? .8 : lvl.grip * skill), 30);
      placeCar(c, (N - Math.round((9 + Math.floor(k / wide) * 7.5 + (k % wide) * 2) / T.ds) + N) % N, wide === 3 ? (k % 3 - 1) * 7.4 : (k % 2 ? 1 : -1) * 5.4);
      c.pos = k + 1; c.aiBoost = 8 + Math.random() * 20; c.blob.visible = QN() < 2;
      scene.add(c.mesh); G.cars.push(c); if (isP) G.player = c;
    }
    G.bestSec = [Infinity, Infinity, Infinity]; G.bestTrace = null; G.trace = new Float32Array(N); G.gLat = G.gLon = 0; G.inp = null;
    G.laps = OPT.mode === 'free' ? Infinity : OPT.laps; G.raceTime = 0; G.points = 0; G.cd = 4.2; G.cdStage = -1; G.finishShown = false; G.overtakes = 0;
    G.view = ({ chase: 0, far: 1, hood: 2 })[OPT.cam]; G.camTh = G.player.th; G.camY = G.player.y + 4; G.acc = 0;
    buildChallenges(); buildLine(); buildItems(); G.startDone = false; G.early = false;
    G.W.lights.forEach(l => l.material.color.set(0x222222));
    G.state = 'countdown'; showScreen(null); $('hud').hidden = false; $('hud').className = 'mode-' + OPT.mode + (OPT.boost ? '' : ' noboost') + (OPT.chal ? '' : ' nochal');
    if (OPT.hud === 'off') OPT.hud = 'full';
    updateCars(0); Sound.music(G.def.music); hudStatic(); updateHUD(true);
    $('app').focus();
  });
}
const CHALS = [['rings', 'Gold rings', 'Fly through eight rings a lap for boost'], ['coins', 'Coin trail', 'Follow the ideal line through a corner'], ['pads', 'Boost pads', 'Arrows on the road that fire you forward'],
['drift', 'Drift zone', 'Longest slide through a marked corner'], ['sprint', 'Sector sprint', 'Beat a target time between two arches'], ['start', 'Rocket start', 'Hit the throttle right on green'],
['close', 'Close calls', 'Pass rivals with inches to spare'], ['hotlap', 'Hot lap bounty', 'Beat your own best lap'], ['clean', 'Clean lap', 'A lap without touching grass or walls']];
const CH = id => OPT.chal && (id === 'trap' || OPT.cs[id]);
function buildLine() {
  const T = G.T, N = T.N; G.lineProf = speedProfile(T, G.cls.top * 1.02, A_LAT * .92, 34, T.lineK); if (!OPT.line) return;
  const pos = new Float32Array(N * 6), col = new Float32Array(N * 6), idx = [];
  for (let i = 0; i < N; i++) for (let k = 0; k < 2; k++) { const lat = T.line[i] + (k ? .8 : -.8), o = i * 6 + k * 3; pos[o] = T.px[i] + T.rx[i] * lat; pos[o + 1] = T.py[i] + .1; pos[o + 2] = T.pz[i] + T.rz[i] * lat; col[o + 1] = 1; }
  for (let i = 0; i < N + 260; i++) { const a = (i % N) * 2, b = ((i + 1) % N) * 2; if (i % 4 === 3) idx.push(a, a, a, a, a, a); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  G.lineMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, fog: false })); G.lineMesh.frustumCulled = false; scene.add(G.lineMesh);
}
function updateLine() {
  const m = G.lineMesh, p = G.player; if (!m || !p) return; m.visible = OPT.line && !p.finished; if (!m.visible) return;
  const T = G.T, N = T.N, col = m.geometry.attributes.color.array, n = 190, v = p.speed;
  for (let q = 0; q < n; q++) { const i = (p.si + q) % N, over = v - G.lineProf[i], r = clamp(over / 9 + .15, 0, 1), g = clamp(1.15 - over / 9, 0, 1); for (let k = 0; k < 2; k++) { const o = i * 6 + k * 3; col[o] = r; col[o + 1] = g; col[o + 2] = over < -14 ? .35 : .08; } }
  m.geometry.attributes.color.needsUpdate = true; m.geometry.setDrawRange(((p.si + 2) % N) * 6, n * 6);
}
function buildChallenges() {
  const T = G.T, N = T.N, grp = new THREE.Group(), U = unitGeos(), ch = { group: grp, rings: [], gates: [], pads: [], coins: [], trapBest: 0, driftScore: 0, stats: {} }; G.chal = ch; scene.add(grp);
  if (!OPT.chal) return;
  const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {})), at = (i, lat, y) => new THREE.Vector3(T.px[i] + T.rx[i] * lat, T.py[i] + y, T.pz[i] + T.rz[i] * lat);
  // straights, longest first
  const runs = []; for (let i = 70, a = -1; i <= N - 50; i++) { const ok = i < N - 50 && Math.abs(T.kapS[i]) < .0035 && !T.bridge[i] && !T.under[i]; if (ok && a < 0) a = i; if (!ok && a >= 0) { runs.push([a, i - a]); a = -1; } }
  runs.sort((x, y) => y[1] - x[1]);
  if (CH('rings')) { const rg = new THREE.TorusGeometry(2.7, .26, 8, 28); for (let k = 0; k < 8; k++) { const i = Math.floor((k + .6) / 8 * N), lat = clamp(Math.sin(k * 2.3 + T.def.seed) * 7.5, -(T.wall[i] - 4), T.wall[i] - 4), m = new THREE.Mesh(rg, basic(0xffe066, { transparent: true, opacity: .95 })); m.position.copy(at(i, lat, 2.6)); m.rotation.y = T.th[i]; grp.add(m); ch.rings.push({ i, lat, m, on: true }); } }
  const pf = speedProfile(T, 400, A_LAT, 30); let ti = 60; for (let i = 60; i < N - 60; i++) if (pf[i] > pf[ti] && !T.bridge[i]) ti = i;
  if (CH('trap')) ch.trap = ti;
  let bs = 0, bi = 60, w = 54, sum = 0; const ks = i => Math.abs(T.kapS[(i + N) % N]);
  for (let i = 0; i < w; i++) sum += ks(60 + i);
  for (let i = 60; i < N - 60 - w; i++) { if (sum > bs && Math.abs(i - ti) > 80) { let br = 0; for (let q = 0; q < w; q += 6) br |= T.bridge[i + q] | T.under[i + q]; if (!br) { bs = sum; bi = i; } } sum += ks(i + w) - ks(i); }
  if (CH('drift')) { ch.dz0 = (bi - 6 + N) % N; ch.dz1 = (bi + w) % N; ch.inZone = false; grp.add(G.W.signArch(ch.dz0, 'DRIFT ZONE  »»', 0x8e44ff)); grp.add(G.W.signArch(ch.dz1, 'DRIFT ZONE END', 0x5b6478)); }
  if (false) {
    const r = runs[0], n = Math.min(6, Math.floor((r[1] - 14) / 16)), pg = new THREE.CylinderGeometry(.14, .14, 3.4, 6), fg = new THREE.BoxGeometry(.1, .9, 1.4);
    for (let k = 0; k < n; k++) { const i = r[0] + 10 + k * 16, g = (k % 2 ? 1 : -1) * 5.6, c = k % 2 ? 0xff4a4a : 0x3a9fff, gm = new THREE.Group(); for (const e of [-1, 1]) { const pm = new THREE.Mesh(pg, basic(0xffffff)); pm.position.copy(at(i, g + e * 3.5, 1.5)); gm.add(pm); const f = new THREE.Mesh(fg, basic(c)); f.position.copy(at(i, g + e * 3.5, 2.9)); f.rotation.y = T.th[i]; gm.add(f); } grp.add(gm); ch.gates.push({ i, g, m: gm, done: 0 }); }
    grp.add(G.W.signArch(r[0] + 2, 'SLALOM  ‹ ›', 0x1f9e6a));
  }
  if (CH('pads')) {
    const tex = canvasTex(64, 128, (c) => { c.fillStyle = '#10b6ff'; c.fillRect(0, 0, 64, 128); c.strokeStyle = '#fff'; c.lineWidth = 9; c.lineJoin = 'miter'; for (let y = 0; y < 3; y++) { c.beginPath(); c.moveTo(8, 118 - y * 38); c.lineTo(32, 92 - y * 38); c.lineTo(56, 118 - y * 38); c.stroke(); } }), pg = new THREE.PlaneGeometry(5.4, 9); pg.rotateX(-Math.PI / 2);
    [.2, .52, .84].forEach((f, k) => { let i = Math.floor(f * N); for (let q = 0; q < 60; q++) { const j = (i + q) % N; if (Math.abs(T.kapS[j]) < .004 && !T.bridge[j] && j > 60 && j < N - 40) { i = j; break; } } const lat = (k % 2 ? 1 : -1) * 4.5, m = new THREE.Mesh(pg, basic(0xffffff, { map: tex, transparent: true, opacity: .92, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.copy(at(i, lat, .12)); m.rotation.y = T.th[i] + Math.PI; m.rotation.x = 0; grp.add(m); ch.pads.push({ i, lat, m, t: 0 }); });
  }
  if (CH('coins')) {
    const cs = T.corners.slice().sort((a, b) => b.ang - a.ang).find(c => { const d = (c.apex - bi + N) % N; return !(CH('drift') && d < w + 10) && c.apex > 80 && c.apex < N - 60 && !T.bridge[c.apex]; });
    if (cs) { const a = cs.a - 16, len = ((cs.b - cs.a + N) % N) + 32, cg = new THREE.CylinderGeometry(.85, .85, .18, 14); cg.rotateX(Math.PI / 2); for (let k = 0; k < 14; k++) { const i = (a + Math.round(k * len / 13) + N) % N, m = new THREE.Mesh(cg, basic(0xffd23d)); m.position.copy(at(i, T.line[i], 1.3)); grp.add(m); ch.coins.push({ i, lat: T.line[i], m, on: true }); } }
  }
  if (CH('sprint')) { let a = Math.floor(N * .37); while (T.bridge[a] || T.under[a]) a++; const b = a + Math.round(450 / T.ds); let tt = 0; for (let i = a; i < b; i++) tt += T.ds / G.player.prof[i % N]; ch.sp0 = a; ch.sp1 = b % N; ch.spTarget = tt * 1.13; grp.add(G.W.signArch(a, 'SPRINT  ' + ch.spTarget.toFixed(1) + ' s', 0xff8a1a)); grp.add(G.W.signArch(b % N, 'SPRINT FINISH', 0x5b6478)); }
  ch.reset = () => { for (const r of ch.rings) { r.on = true; r.missed = false; r.m.visible = true; } for (const c of ch.coins) { c.on = true; c.m.visible = true; } ch.coinN = 0; for (const g of ch.gates) g.done = 0; ch.gateN = 0; };
}
function addPoints(n) { if (OPT.chal) G.points += n; }
function tickChallenges(dt) {
  const ch = G.chal, p = G.player, T = G.T, N = T.N; if (!ch || !OPT.chal || !p || p.finished) return;
  const near = (i, span) => { const d = (p.si - i + N) % N; return d < span || d > N - span; }, st = ch.stats;
  for (const r of ch.rings) {
    r.m.rotation.z += dt * 1.5; if (!r.on) continue; const d = (p.si - r.i + N) % N;
    if (near(r.i, 2) && Math.abs(p.lat - r.lat) < 3 && Math.abs(p.y - T.py[r.i]) < 4) { r.on = false; r.m.visible = false; p.meter = Math.min(100, p.meter + 25); ch.combo = (ch.combo || 0) + 1; st.rings = (st.rings || 0) + 1; addPoints(100 * ch.combo); Sound.chime(ch.combo); toast('Ring ' + (ch.combo > 1 ? '×' + ch.combo + '  ' : '') + '+' + 100 * ch.combo, 'gold'); }
    else if (d > 4 && d < 30 && !r.missed) { r.missed = true; ch.combo = 0; }
  }
  for (const c of ch.coins) { c.m.rotation.y += dt * 4; if (c.on && near(c.i, 2) && Math.abs(p.lat - c.lat) < 2.6) { c.on = false; c.m.visible = false; ch.coinN = (ch.coinN || 0) + 1; st.coins = (st.coins || 0) + 1; addPoints(25); Sound.tone(1320 + ch.coinN * 60, .12, .1, 'square'); if (ch.coinN === ch.coins.length) { addPoints(300); toast('Perfect line!  +300', 'gold'); Sound.chime(4); } } }
  for (const g of ch.gates) if (!g.done && near(g.i, 2)) { const hit = Math.abs(p.lat - g.g) < 3.5; g.done = 1; if (hit) { ch.gateN = (ch.gateN || 0) + 1; addPoints(60); Sound.tone(990, .1, .1, 'triangle'); if (ch.gateN === ch.gates.length) { addPoints(300); st.slalom = (st.slalom || 0) + 1; toast('Slalom ace!  +300', 'green'); Sound.chime(3); } } }
  for (const d of ch.pads) { d.t -= dt; if (d.t <= 0 && near(d.i, 2) && Math.abs(p.lat - d.lat) < 3.1 && p.vF > 5) { d.t = 3; p.boostT = Math.max(p.boostT, 1.1); st.pads = (st.pads || 0) + 1; addPoints(30); Sound.whoosh(); toast('Boost pad!', 'gold'); } }
  if (ch.trap !== undefined) { const dT = (p.si - ch.trap + N) % N; if (dT < 3 && !ch.trapDone && p.vF > 5) { ch.trapDone = true; const sp = p.speed, best = sp > ch.trapBest; if (best) ch.trapBest = sp; addPoints(Math.round(sp * 3)); } else if (dT > 20 && dT < 60) ch.trapDone = false; }
  if (ch.dz0 !== undefined) {
    const zl = (ch.dz1 - ch.dz0 + N) % N, inside = (p.si - ch.dz0 + N) % N < zl;
    if (inside && !ch.inZone) { ch.inZone = true; ch.zoneDist = 0; } if (inside && p.drift) ch.zoneDist += p.speed * dt;
    if (!inside && ch.inZone) { ch.inZone = false; const m = Math.round(ch.zoneDist); if (m > 5) { addPoints(m * 3); ch.driftScore = Math.max(ch.driftScore, m); toast('Drift zone  ' + m + ' m  +' + m * 3, 'violet'); } }
  }
  if (ch.sp0 !== undefined) {
    if (!ch.spOn && near(ch.sp0, 2) && p.vF > 3) { ch.spOn = true; ch.spT = G.raceTime; }
    if (ch.spOn && near(ch.sp1, 2)) { ch.spOn = false; const t = G.raceTime - ch.spT, ok = t <= ch.spTarget; if (t > 2 && ok) { addPoints(400); st.sprint = (st.sprint || 0) + 1; Sound.chime(5); toast('Sprint  ' + t.toFixed(2) + ' s  ·  beat the target  +400', 'gold'); } }
  }
  if (CH('start') && !G.startDone && G.inp) { if (G.inp.throttle > 0) { G.startDone = true; if (!G.early && G.raceTime < .38) { p.boostT = 1.3; addPoints(150); st.start = 1; Sound.whoosh(); toast('Rocket start!  +150', 'gold'); } } else if (G.raceTime > 1) G.startDone = true; }
  if (CH('close') && G.raceTime > 5) for (const o of G.cars) { if (o === p || (o.ccT || 0) > G.raceTime) continue; const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < 4.4 && Math.abs(o.y - p.y) < 2 && p.speed - o.speed > 2.5) { o.ccT = G.raceTime + 7; st.close = (st.close || 0) + 1; addPoints(40); toast('Close call  +40', ''); } }
}
function onLap(c) {
  const t = G.raceTime;
  if (c.lap > 1) { c.last = t - c.lapStart; c.laps.push(c.last); if (c.last < c.best) { c.best = c.last; c.newBest = true; } else c.newBest = false; }
  c.lapStart = t;
  if (c.isPlayer) {
    if (c.lap > 1) {
      const s3 = t - c.secStart; c.secs[2] = s3; sectorPop(2, s3, G.bestSec[2]); if (s3 < G.bestSec[2]) G.bestSec[2] = s3; c.lapSecs.push(c.secs.slice());
      if (c.newBest) G.bestTrace = G.trace.slice();
      const rec = !BEST[bestKey()] || c.last < BEST[bestKey()];
      if (rec) { BEST[bestKey()] = c.last; store.set('sgp_best2', BEST); }
      addLapRow(c.lap - 1, c.last, c.secs, c.newBest);
      toast('Lap ' + (c.lap - 1) + '  ' + fmtTime(c.last) + (rec ? '  ·  personal best!' : ''), rec ? 'gold' : '');
      if (!c.dirty && CH('clean')) { addPoints(250); toast('Clean lap  +250', 'green'); }
      if (CH('hotlap') && c.newBest && c.laps.length > 1) { addPoints(300); toast('Hot lap bounty  +300', 'gold'); }
    }
    c.dirty = false; c.sec = 0; c.secStart = t; c.secs = []; G.trace.fill(0);
    if (G.chal && G.chal.reset) G.chal.reset();
    if (c.lap === G.laps && G.laps > 1) { toast('Final lap!', 'red'); Sound.beep(880, .12, .2); setTimeout(() => Sound.beep(1175, .25, .2), 140); }
    else if (c.lap > 1 && c.lap <= G.laps) Sound.beep(660, .12, .15);
  }
  if (c.lap > G.laps && !c.finished) { c.finished = true; c.finishTime = t; if (c.isPlayer) { Sound.fanfare(); G.finishAt = G.t + 2.2; toast(RACE() ? 'Finished ' + ordinal(c.pos) + '!' : 'Finished!', 'gold'); } }
}
function tick(h) {
  if (G.state === 'countdown') {
    G.cd -= h; const stage = G.cd > 3 ? -1 : G.cd > 2 ? 0 : G.cd > 1 ? 1 : G.cd > 0 ? 2 : 3;
    if (stage !== G.cdStage) {
      G.cdStage = stage; const L = G.W.lights;
      if (stage >= 0 && stage < 3) { for (let i = 0; i <= stage * 2 && i < 5; i++) L[i].material.color.set(0xff2a2a); Sound.beep(440, .18, .25); $('count').textContent = 3 - stage; $('count').className = 'show'; }
      if (stage === 3) { L.forEach(l => l.material.color.set(0x35ff6a)); Sound.beep(880, .5, .3); $('count').textContent = 'GO!'; $('count').className = 'show go'; setTimeout(() => { $('count').className = ''; }, 900); G.state = 'racing'; G.early = !G.auto && playerInput().throttle > 0; }
    }
    return;
  }
  G.raceTime += h; const p = G.player, N = G.T.N;
  for (const c of G.cars) {
    if (!c.isPlayer && OPT.rubber && p) { const gap = ((c.lap - p.lap) * N + c.si - p.si) * G.T.ds; c.rb = clamp(1 - gap * .00035, .93, 1.05); c.topMul = c.skillTop * c.rb; }
    stepCar(c, c.isPlayer && !c.finished && !G.auto ? playerInput() : aiInput(c, h), h);
    if (c.lap > c.maxLap) { c.maxLap = c.lap; onLap(c); }
    const rr = clamp(c.speed / (G.cls.top * 1.2), 0, .999) * G.cls.gears; c.gear = Math.floor(rr); c.rpm = .25 + (rr - c.gear) * .75;
    if (c.isPlayer && c.lap >= 1 && !c.finished) { G.trace[c.si] = G.raceTime - c.lapStart; const sc = Math.min(2, Math.floor(c.si * 3 / N)); if (sc === c.sec + 1) { const sp = G.raceTime - c.secStart; c.secs[c.sec] = sp; sectorPop(c.sec, sp, G.bestSec[c.sec]); if (sp < G.bestSec[c.sec]) G.bestSec[c.sec] = sp; c.sec = sc; c.secStart = G.raceTime; } }
    if (c.slip > 0) c.slip -= h;
  }
  if (OPT.bump) collide();
  if (OPT.boost) for (const c of G.cars) {
    if (c.speed < G.cls.top * .55) continue;
    for (const o of G.cars) { if (o === c) continue; const d = (o.si - c.si + N) % N; if (d >= 2 && d <= 10 && Math.abs(o.lat - c.lat) < 2.4 && Math.abs(o.y - c.y) < 3) { c.slip = .25; if (c.isPlayer) { c.meter = Math.min(100, c.meter + 8 * h); G.slipT = G.t; } break; } }
  }
  if (p) { if (p.drift) p.meter = Math.min(100, p.meter + 6 * h); else p.meter = Math.min(100, p.meter + 1.2 * h); }
  tickChallenges(h); tickItems(h);
  // standings
  const order = G.cars.slice().sort((a, b) => (a.finished || b.finished) ? (a.finished && b.finished ? a.finishTime - b.finishTime : a.finished ? -1 : 1) : (b.lap * N + b.si + b.along / G.T.ds) - (a.lap * N + a.si + a.along / G.T.ds));
  order.forEach((c, i) => { const np = i + 1; if (c.isPlayer && np < c.pos && G.raceTime > 4 && !c.finished) { G.overtakes++; addPoints(50); } c.pos = np; });
  G.order = order;
  if (p && p.vF > 4) { const T = G.T, dot = Math.sin(p.th) * T.tx[p.si] + Math.cos(p.th) * T.tz[p.si]; G.wrong = dot < -.4 ? (G.wrong || 0) + h : 0; } else G.wrong = 0;
}
function updateCars(dt) {
  const T = G.T;
  for (const c of G.cars) {
    c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.y = c.th;
    const fx = Math.sin(c.th), fz = Math.cos(c.th), sa = T.slope[c.si] * (fx * T.tx[c.si] + fz * T.tz[c.si]), k = 1 - Math.exp(-dt * 10);
    const V = c.V; c.tilt.rotation.x = lerp(c.tilt.rotation.x, -Math.atan(sa), k); c.tilt.rotation.z = lerp(c.tilt.rotation.z, c.steer * Math.min(1, c.speed / 30) * V.roll, k);
    c.tilt.rotation.y = lerp(c.tilt.rotation.y, c.drift ? -c.drift * .3 : 0, k); c.tilt.position.y = V.hover + (V.bob ? Math.sin(G.t * 3 + c.x * .1) * V.bob : 0) + (c.off && !V.hover ? Math.sin(G.t * 40 + c.x) * .04 : 0);
    for (const pt of V.parts) pt.fn(pt.mesh, c, G.t);
    if (c.isPlayer && dt > 0) { const a = Math.atan2(c.vx, c.vz), k2 = 1 - Math.exp(-dt * 8); if (c.pA !== undefined) { G.gLat = lerp(G.gLat, -wrapAngle(a - c.pA) / dt * c.speed / 9.81 * (c.speed > 3 ? 1 : 0), k2); G.gLon = lerp(G.gLon, -(c.speed - c.pV) / dt / 9.81, k2); } c.pA = a; c.pV = c.speed; }
    c.spin += c.vF * dt; c.wheels.forEach((w, i) => { w.rotation.x = c.spin / w.userData.r; if (w.userData.steer) w.rotation.y = -c.steer * .42; if (V.wobble) w.rotation.z = Math.sin(G.t * 9 + i * 1.7) * .22; });
    c.flame.visible = !!c.boosting; if (c.boosting) { c.flame.scale.y = 1.4 + Math.random() * .9; c.flame.material.color.set(c.boostT > 0 ? 0xffa64d : 0x6fd8ff); }
    const sp = !!c.drift && c.driftT > 1.0; c.sparks.forEach(s => { s.visible = sp; if (sp) { s.scale.setScalar(.14 + Math.random() * .16); s.material.color.set(c.driftT > 2.2 ? 0xff9a3d : 0x6fd8ff); } });
  }
}
const _look = new THREE.Vector3(), _focus = new THREE.Vector3();
function updateCamera(dt) {
  const p = G.player, T = G.T; if (!p) return;
  const orbit = p.finished;
  const want = orbit ? G.camTh + dt * .5 : (p.speed > 4 ? Math.atan2(p.vx, p.vz) * .35 + p.th * .65 : p.th);
  if (orbit) G.camTh = want; else { const dth = wrapAngle((p.speed > 4 ? wrapAngle(Math.atan2(p.vx, p.vz) - p.th) * .35 + p.th : p.th) - G.camTh); G.camTh += dth * (1 - Math.exp(-dt * 6)); }
  const th = G.camTh + (G.lookBack && !orbit ? Math.PI : 0), v = orbit ? 1 : G.view, dist = [8.6, 13, -.4][v], hgt = [3.3, 5.4, 1.75][v], sx = Math.sin(th), sz = Math.cos(th);
  let cy = p.y + hgt; if (v < 2) { const bi = (p.si - Math.round(dist / T.ds) * (G.lookBack ? -1 : 1) + T.N * 2) % T.N; cy = Math.max(cy, T.py[bi] + hgt * .62); }
  G.camY = lerp(G.camY, cy, 1 - Math.exp(-dt * 9));
  camera.position.set(p.x - sx * dist, G.camY, p.z - sz * dist);
  _look.set(p.x + sx * 8, p.y + (v === 2 ? 1.5 : 1.7), p.z + sz * 8); camera.lookAt(_look);
  const f = 64 + 15 * smooth(.2, 1.25, p.speed / G.cls.top) + (p.boosting ? 5 : 0); camera.fov = lerp(camera.fov, f, 1 - Math.exp(-dt * 4)); camera.updateProjectionMatrix();
  p.tilt.visible = true;
}
function togglePause() {
  if (G.state === 'racing' || G.state === 'countdown') { G.prevState = G.state; G.state = 'paused'; showScreen('pause'); Sound.pause(true); }
  else if (G.state === 'paused') { G.state = G.prevState; showScreen(null); Sound.pause(false); }
}
function toMenu() { GP.active = false; clearRace(); G.state = 'menu'; $('hud').hidden = true; showScreen('menu'); if (OPT.hud === 'off') OPT.hud = 'full'; syncMenu(); Sound.stopEngine(); Sound.pause(false); G.fly = 30; }
function showResults() {
  G.finishShown = true; G.state = 'finished'; const p = G.player, N = G.T.N, rows = [];
  G.order.forEach((c, i) => {
    let t = c.finishTime, est = false; if (!c.finished) { est = true; t = G.raceTime + Math.max(0, ((G.laps + 1 - c.lap) * N - c.si) * G.T.ds) / (G.cls.top * .72); }
    rows.push(`<tr class="${c.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:#${C3(c.ch.car).getHexString()}"></span>${c.ch.name} <small>${c.ch.kind} · ${VEHICLES.find(v => v.id === c.kind).name}</small></td><td>${fmtTime(t)}${est ? '<small> est.</small>' : ''}</td><td>${fmtTime(c.best)}</td></tr>`);
  });
  $('resTitle').textContent = RACE() ? (p.pos === 1 ? 'Victory!' : 'Finished ' + ordinal(p.pos)) : 'Session complete';
  $('resSub').textContent = G.def.name + ' (' + G.def.world + ') · ' + G.cls.name + ' class · ' + G.laps + (G.laps === 1 ? ' lap' : ' laps');
  $('resTable').innerHTML = '<tr><th></th><th>Driver</th><th>Time</th><th>Best lap</th></tr>' + rows.join('');
  const ch = G.chal, ex = [];
  if (OPT.chal) { ex.push(['Style points', G.points]); if (ch.trapBest) ex.push(['Top speed', fmtSpeed(ch.trapBest)]); if (ch.driftScore) ex.push(['Longest zone drift', ch.driftScore + ' m']); if (RACE()) ex.push(['Overtakes', G.overtakes]); const S = ch.stats; if (S.rings) ex.push(['Rings', S.rings]); if (S.coins) ex.push(['Coins', S.coins]); if (S.slalom) ex.push(['Slalom aces', S.slalom]); if (S.sprint) ex.push(['Sprints won', S.sprint]); if (S.close) ex.push(['Close calls', S.close]); if (S.start) ex.push(['Rocket start', 'Yes']); }
  $('resExtra').innerHTML = ex.map(e => `<div><b>${e[1]}</b><span>${e[0]}</span></div>`).join('');
  $('resLaps').innerHTML = p.laps.length ? '<tr><th>Your laps</th><th>Time</th><th>S1</th><th>S2</th><th>S3</th></tr>' + p.laps.map((t, i) => `<tr class="${t === p.best ? 'me' : ''}"><td>Lap ${i + 1}</td><td>${fmtTime(t)}</td>` + [0, 1, 2].map(k => `<td>${p.lapSecs[i] && p.lapSecs[i][k] ? p.lapSecs[i][k].toFixed(3) : '–'}</td>`).join('') + '</tr>').join('') : '';
  showScreen('results'); gpAfterResults();
}

/* ---------- main loop ---------- */
let lastT = 0; const padWas = {};
function padPoll() {
  let gp = null; try { gp = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(p => p) : null; } catch (e) { } if (!gp) return;
  const hit = i => { const v = !!(gp.buttons[i] && gp.buttons[i].pressed), was = padWas[i]; padWas[i] = v; return v && !was; }, plus = hit(9), a = hit(1), b = hit(0), minus = hit(8), up = hit(12), dn = hit(13);
  if (G.state === 'menu' && !$('menu').hidden) { if (plus || a) startRace(); if (up || dn) { const i = TRACKS.findIndex(t => t.id === OPT.track); OPT.track = TRACKS[(i + (dn ? 1 : TRACKS.length - 1)) % TRACKS.length].id; syncMenu(); loadTrack(); } }
  else if (G.state === 'racing' || G.state === 'countdown') { if (plus) togglePause(); if (minus) { G.view = (G.view + 1) % 3; } if (hit(2) && G.player) useItem(G.player); }
  else if (G.state === 'paused') { if (plus || a) togglePause(); else if (b) { Sound.pause(false); toMenu(); } }
  else if (G.state === 'finished' && G.finishShown) { if (plus || a) { if (!$('cupEnd').hidden) gpBegin(); else $('btnAgain').click(); } else if (b) toMenu(); }
}
let padHinted = false;
function frame(now) {
  requestAnimationFrame(frame); padPoll();
  if (!padHinted && navigator.getGamepads && Array.from(navigator.getGamepads()).some(p => p)) { padHinted = true; toast('🎮 A or ZR go · B or ZL brake · stick steers · L/R drift · X boost · Y item · + pause · − camera', '', 7000); }
  const dt = Math.min((now - lastT) / 1000 || 0, .05); lastT = now;
  if (!G.T || !G.W) return;
  const paused = G.state === 'paused'; if (!paused) G.t += dt;
  const T = G.T;
  if (G.state === 'menu') {
    if (!OPT.qSet && OPT.quality !== 'low' && G.fpsN >= 0) { G.fpsN++; G.fpsT += dt; if (G.fpsT > 3.5) { if (G.fpsN / G.fpsT < 27) { OPT.quality = OPT.quality === 'high' ? 'medium' : 'low'; syncMenu(); loadTrack(); } else G.fpsN = -1; } }
    G.fly = (G.fly + dt * 26) % T.L; const u = G.fly / T.ds, i = Math.floor(u) % T.N, j = (i + 1) % T.N, f = u - Math.floor(u), a = (i + 24) % T.N, b = (a + 1) % T.N, sway = Math.sin(G.t * .13) * 5;
    camera.position.set(lerp(T.px[i], T.px[j], f) + T.rx[i] * sway, lerp(T.py[i], T.py[j], f) + 7.5 + Math.sin(G.t * .2) * 2.5, lerp(T.pz[i], T.pz[j], f) + T.rz[i] * sway);
    _look.set(lerp(T.px[a], T.px[b], f), lerp(T.py[a], T.py[b], f) + 3, lerp(T.pz[a], T.pz[b], f)); camera.lookAt(_look); camera.fov = 62; camera.updateProjectionMatrix(); _focus.copy(camera.position);
  } else if (G.state === 'debug') { _focus.copy(camera.position);
  } else if (!paused) {
    G.acc += dt; const H = 1 / 120; let n = 0; while (G.acc >= H && n++ < 8) { tick(H); G.acc -= H; }
    updateCars(dt); updateCamera(dt); itemsFrame(dt); updateLine(); updateHUD(); Sound.engine(G.player, G.cls);
    if (G.player) _focus.set(G.player.x, G.player.y, G.player.z);
    if (G.player && G.player.finished && !G.finishShown && G.t > G.finishAt) showResults();
  }
  G.W.update(G.t, paused ? 0 : dt, camera.position, _focus);
  renderer.render(scene, camera);
}

/* ---------- sound ---------- */
const MUSIC = {
  spring: { bpm: 96, root: 62, scale: [0, 2, 4, 7, 9], prog: [0, 7, 9, 5], wave: 'triangle' },
  summer: { bpm: 116, root: 60, scale: [0, 2, 4, 7, 9, 11], prog: [0, 5, 7, 5], wave: 'triangle' },
  autumn: { bpm: 84, root: 57, scale: [0, 3, 5, 7, 10], prog: [0, 8, 10, 7], wave: 'triangle' },
  winter: { bpm: 72, root: 64, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 2, 0, -3], wave: 'sine' },
  desert: { bpm: 92, root: 62, scale: [0, 1, 4, 5, 7, 8, 11], prog: [0, 1, 0, -2], wave: 'triangle' },
  east: { bpm: 88, root: 64, scale: [0, 2, 5, 7, 9], prog: [0, 5, 7, 0], wave: 'sine' },
  city: { bpm: 122, root: 57, scale: [0, 3, 5, 7, 10], prog: [0, 3, 8, 7], wave: 'square' },
  space: { bpm: 66, root: 60, scale: [0, 2, 4, 6, 8, 10], prog: [0, 4, 2, 6], wave: 'sine' },
};
const Sound = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const A = window.AudioContext || window.webkitAudioContext, c = this.ctx = new A();
      const gn = (v, to) => { const g = c.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
      this.master = gn(1, c.destination); this.sfx = gn(.7, this.master); this.mus = gn(.3, this.master);
      this.ef = c.createBiquadFilter(); this.ef.type = 'lowpass'; this.eg = gn(0, this.sfx); this.ef.connect(this.eg);
      this.o1 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = c.createOscillator(); this.o2.type = 'square';
      const g2 = gn(.5, this.ef); this.o1.connect(this.ef); this.o2.connect(g2); this.o1.start(); this.o2.start();
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true; ns.start();
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2; this.skg = gn(0, this.sfx); ns.connect(bp); bp.connect(this.skg);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; this.wg = gn(0, this.sfx); ns.connect(lp); lp.connect(this.wg);
      this.mbus = gn(1, this.mus); const dl = c.createDelay(1); dl.delayTime.value = .36; const fb = gn(.33, dl); this.mbus.connect(dl); dl.connect(fb); dl.connect(this.mus);
      this.applyVol();
    } catch (e) { this.ctx = null; }
  },
  applyVol() { if (!this.ctx) return; this.sfx.gain.value = this.muted ? 0 : OPT.sfx / 100; this.mus.gain.value = this.muted ? 0 : OPT.music / 100 * .55; },
  tone(f, dur, vol, type, dest, when, att) {
    if (!this.ctx) return; const c = this.ctx, t = (when || c.currentTime), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || .01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + .05); return o;
  },
  beep(f, d, v) { this.tone(f, d, v, 'square'); },
  chime(n) { if (!this.ctx) return; const t = this.ctx.currentTime;[0, 4, 7].forEach((s, i) => this.tone(880 * Math.pow(2, (s + Math.min(n, 8) * 2) / 12), .35, .13, 'sine', this.sfx, t + i * .06)); },
  whoosh() { if (!this.ctx) return; const o = this.tone(180, .5, .12, 'sawtooth'); if (o) o.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + .45); },
  thud(v) { this.tone(75, .16, .45 * (v || 1), 'sine'); this.tone(140, .08, .2 * (v || 1), 'triangle'); },
  fanfare() { if (!this.ctx) return; const t = this.ctx.currentTime;[523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .45, .16, 'triangle', this.sfx, t + i * .12)); },
  engine(p, cls) {
    if (!this.ctx || !p) return; const t = this.ctx.currentTime, r = clamp(p.speed / (cls.top * 1.2), 0, 1), rpm = p.rpm || 0, f = 58 + rpm * 66 + (p.gear || 0) * 11;
    this.o1.frequency.setTargetAtTime(f, t, .05); this.o2.frequency.setTargetAtTime(f / 2, t, .05); this.ef.frequency.setTargetAtTime(380 + rpm * 1100 + r * 700, t, .05);
    const live = G.state === 'racing' || G.state === 'countdown' || G.state === 'finished';
    this.eg.gain.setTargetAtTime(live ? .05 + .05 * r : 0, t, .08); this.skg.gain.setTargetAtTime(live ? (p.drift ? .1 : 0) + (p.off ? .09 * r : 0) : 0, t, .06); this.wg.gain.setTargetAtTime(live ? r * r * .16 : 0, t, .1);
  },
  stopEngine() { if (!this.ctx) return; const t = this.ctx.currentTime; this.eg.gain.setTargetAtTime(0, t, .05); this.skg.gain.setTargetAtTime(0, t, .05); this.wg.gain.setTargetAtTime(0, t, .05); this.stopMusic(); },
  pause(b) { if (this.ctx) { if (b) this.ctx.suspend(); else this.ctx.resume(); } },
  stopMusic() { if (this.mTimer) clearInterval(this.mTimer); this.mTimer = null; },
  music(id) {
    this.stopMusic(); if (!this.ctx) return; const m = MUSIC[id] || MUSIC.summer, c = this.ctx, step = 30 / m.bpm, hz = n => 440 * Math.pow(2, (n - 69) / 12); let next = c.currentTime + .2, idx = 0, walk = 4;
    this.mTimer = setInterval(() => {
      if (c.state !== 'running') return;
      if (next < c.currentTime) next = c.currentTime + .05;
      while (next < c.currentTime + .3) {
        const s = idx % 8, cr = m.root + m.prog[Math.floor(idx / 8) % 4];
        if (s === 0) { [cr - 12, cr - 5, cr + 2].forEach(n => this.tone(hz(n), step * 8.5, .05, 'triangle', this.mbus, next, .5)); this.tone(hz(cr - 24), step * 5, .11, 'sine', this.mbus, next, .03); }
        if (s === 4) this.tone(hz(cr - 17), step * 3, .07, 'sine', this.mbus, next, .03);
        if (Math.random() < (s % 2 ? .45 : .8)) { walk = clamp(walk + Math.round((Math.random() - .5) * 4), 0, m.scale.length * 2 - 1); const n = m.root + 12 + m.scale[walk % m.scale.length] + 12 * Math.floor(walk / m.scale.length); this.tone(hz(n), step * 2.2, m.wave === 'square' ? .03 : .06, m.wave, this.mbus, next, .012); }
        next += step; idx++;
      }
    }, 90);
  },
};

/* ---------- HUD ---------- */
const fmtSpeed = v => { const k = Math.round(v * KMH) + ' km/h', m = Math.round(v * KMH * .621) + ' mph'; return OPT.units === 'mph' ? m : OPT.units === 'kmh' ? k : k + ' / ' + m; };
const fmtGap = t => (t >= 0 ? '+' : '−') + Math.abs(t).toFixed(t < 10 && t > -10 ? 3 : 1);
function toast(text, cls, ms) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.textContent = text; const box = $('toasts'); box.appendChild(d); while (box.children.length > 4) box.removeChild(box.firstChild); setTimeout(() => d.remove(), ms || 2600); }
function showScreen(id) { for (const s of ['menu', 'pause', 'results', 'browser', 'cupEnd']) $(s).hidden = s !== id; }
const HUDS = ['full', 'standard', 'minimal', 'off'], HUD_NAME = { full: 'Broadcast display', standard: 'Standard display', minimal: 'Minimal display', off: 'Display hidden' };
function applyHud() { const h = $('hud'); HUDS.forEach(k => h.classList.toggle('hud-' + k, OPT.hud === k)); }
let mini = {}, elev = null;
function buildMinimap() {
  const T = G.T, S = 360, pad = 26, sc = Math.min((S - 2 * pad) / (T.maxX - T.minX), (S - 2 * pad) / (T.maxZ - T.minZ)), ox = (S - (T.maxX - T.minX) * sc) / 2, oz = (S - (T.maxZ - T.minZ) * sc) / 2;
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const X = x => ox + (x - T.minX) * sc, Z = z => oz + (z - T.minZ) * sc;
  const path = (a, b) => { g.beginPath(); for (let i = a; i <= b; i += 2) { const j = i % T.N; i > a ? g.lineTo(X(T.px[j]), Z(T.pz[j])) : g.moveTo(X(T.px[j]), Z(T.pz[j])); } };
  g.lineJoin = g.lineCap = 'round'; path(0, T.N + 2); g.strokeStyle = 'rgba(10,14,28,.75)'; g.lineWidth = 15; g.stroke();
  const third = Math.floor(T.N / 3);['#ff6b6b', '#6fd8ff', '#ffe066'].forEach((c, k) => { path(k * third, k === 2 ? T.N + 2 : (k + 1) * third + 2); g.strokeStyle = c; g.lineWidth = 7; g.stroke(); });
  path(0, T.N + 2); g.strokeStyle = 'rgba(255,255,255,.82)'; g.lineWidth = 4.5; g.stroke();
  g.save(); g.translate(X(T.px[0]), Z(T.pz[0])); g.rotate(-T.th[0]); g.fillStyle = '#ff3b5c'; g.fillRect(-11, -2.5, 22, 5); g.restore();
  mini = { cv, X, Z };
  // elevation profile strip
  const ec = document.createElement('canvas'); ec.width = 520; ec.height = 84; const e = ec.getContext('2d'), rng_ = Math.max(8, T.maxY - T.minY), EY = y => 70 - (y - T.minY) / rng_ * 54;
  e.beginPath(); e.moveTo(0, 84); for (let i = 0; i <= T.N; i += 2) e.lineTo(i / T.N * 520, EY(T.py[i % T.N])); e.lineTo(520, 84); e.closePath(); e.fillStyle = 'rgba(13,19,38,.6)'; e.fill();
  e.beginPath(); for (let i = 0; i <= T.N; i += 2) { const x = i / T.N * 520, y = EY(T.py[i % T.N]); i ? e.lineTo(x, y) : e.moveTo(x, y); } e.strokeStyle = 'rgba(255,255,255,.9)'; e.lineWidth = 3; e.stroke();
  e.fillStyle = 'rgba(255,255,255,.35)'; for (const k of [1, 2]) e.fillRect(k * 520 / 3 - 1, 8, 2, 76);
  elev = { cv: ec, EY };
}
function drawMinimap() {
  const g = $('mini').getContext('2d'); g.clearRect(0, 0, 360, 360); g.drawImage(mini.cv, 0, 0);
  for (const c of G.cars) if (!c.isPlayer) { g.beginPath(); g.arc(mini.X(c.x), mini.Z(c.z), 6, 0, TAU); g.fillStyle = '#' + C3(c.ch.car).getHexString(); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(10,14,28,.9)'; g.stroke(); }
  const p = G.player; if (p) { g.beginPath(); g.arc(mini.X(p.x), mini.Z(p.z), 9, 0, TAU); g.fillStyle = '#' + C3(p.ch.car).getHexString(); g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#fff'; g.stroke(); }
  if (OPT.hud !== 'full' || !p) return;
  const e = $('elev').getContext('2d'); e.clearRect(0, 0, 520, 84); e.drawImage(elev.cv, 0, 0); const x = p.si / G.T.N * 520, y = elev.EY(p.y);
  e.beginPath(); e.arc(x, y, 7, 0, TAU); e.fillStyle = '#' + C3(p.ch.car).getHexString(); e.fill(); e.lineWidth = 3; e.strokeStyle = '#fff'; e.stroke();
  const gm = $('gmeter').getContext('2d'); gm.clearRect(0, 0, 120, 120); gm.strokeStyle = 'rgba(255,255,255,.5)'; gm.lineWidth = 2; for (const r of [26, 52]) { gm.beginPath(); gm.arc(60, 60, r, 0, TAU); gm.stroke(); } gm.beginPath(); gm.moveTo(60, 6); gm.lineTo(60, 114); gm.moveTo(6, 60); gm.lineTo(114, 60); gm.stroke();
  gm.beginPath(); gm.arc(60 + clamp(G.gLat || 0, -3.3, 3.3) * 16, 60 + clamp(G.gLon || 0, -3.3, 3.3) * 16, 8, 0, TAU); gm.fillStyle = '#ffe066'; gm.fill();
}
function hudStatic() {
  $('hTotal').textContent = '/' + G.cars.length; $('hLapN').textContent = isFinite(G.laps) ? '/' + G.laps : '';
  const rec = BEST[bestKey()]; $('hRec').textContent = rec ? fmtTime(rec) : '--:--.---';
  $('hUnit').textContent = OPT.units === 'mph' ? 'mph' : 'km/h'; $('hSpeed2').hidden = OPT.units !== 'both'; $('hTrack').textContent = G.def.name; $('hWorld').textContent = G.def.world;
  $('lapList').innerHTML = ''; $('hDelta').textContent = ''; $('revs').innerHTML = '<i></i>'.repeat(12); $('sector').className = ''; applyHud();
}
function sectorPop(k, t, best) {
  const el = $('sector'), d = isFinite(best) ? t - best : 0, cls = !isFinite(best) || d < 0 ? 'pb' : 'slow';
  el.innerHTML = `<small>SECTOR ${k + 1}</small><b>${t.toFixed(3)}</b>` + (isFinite(best) ? `<span>${fmtGap(d)}</span>` : ''); el.className = 'show ' + cls; clearTimeout(sectorPop.t); sectorPop.t = setTimeout(() => { el.className = ''; }, 2600);
}
function addLapRow(n, t, secs, isBest) {
  const box = $('lapList'); box.querySelectorAll('.best').forEach(e => isBest && e.classList.remove('best'));
  const d = document.createElement('div'); d.className = isBest ? 'best' : ''; d.innerHTML = `<small>L${n}</small><span>${fmtTime(t)}</span>`; d.title = secs.map(s => s.toFixed(3)).join(' / '); box.appendChild(d); while (box.children.length > 7) box.removeChild(box.firstChild);
}
let hudN = 0;
function updateHUD(force) {
  const p = G.player; if (!p) return; hudN++; const T = G.T, N = T.N, full = OPT.hud === 'full';
  $('hSpeedV').textContent = Math.round(p.speed * KMH * (OPT.units === 'mph' ? .621 : 1)); if (OPT.units === 'both') $('hSpeed2V').textContent = Math.round(p.speed * KMH * .621);
  $('boostFill').style.transform = 'scaleX(' + (p.meter / 100).toFixed(3) + ')';
  $('hud').classList.toggle('boosting', !!p.boosting); $('hud').classList.toggle('slip', G.t - (G.slipT || -9) < .3 && !p.boosting);
  $('wrong').hidden = !(G.wrong > .8);
  const gear = p.vF < -.5 ? 'R' : p.speed < .5 ? 'N' : (p.gear + 1); if ($('hGear').textContent !== String(gear)) $('hGear').textContent = gear;
  const leds = $('revs').children, on = Math.round((p.rpm || 0) * 12); for (let i = 0; i < 12; i++) leds[i].className = i < on ? (i < 5 ? 'g' : i < 9 ? 'r' : 'b') : '';
  if (G.inp) { $('thr').style.transform = 'scaleY(' + G.inp.throttle + ')'; $('brk').style.transform = 'scaleY(' + G.inp.brake + ')'; }
  if (hudN % 4 && !force) return;
  $('hPosN').textContent = p.pos; $('hPosS').textContent = ordinal(p.pos).replace(/\d+/, '');
  $('hLapC').textContent = Math.max(1, Math.min(p.lap, isFinite(G.laps) ? G.laps : 1e9));
  $('hTime').textContent = fmtTime(p.finished ? p.finishTime : G.raceTime).slice(0, -1);
  const cur = G.state === 'countdown' || p.lap < 1 ? 0 : G.raceTime - p.lapStart;
  $('hCur').textContent = fmtTime(cur).slice(0, -1); $('hBest').textContent = fmtTime(p.best);
  $('hPts').textContent = OPT.chal ? G.points.toLocaleString() + ' pts' : '';
  const rec = BEST[bestKey()]; if (rec) $('hRec').textContent = fmtTime(rec);
  if (G.bestTrace && p.lap > 1 && !p.finished && G.bestTrace[p.si] > 0) { const d = cur - G.bestTrace[p.si], el = $('hDelta'); el.textContent = fmtGap(d); el.className = d <= 0 ? 'up' : 'down'; } else $('hDelta').textContent = '';
  // next corner
  const cs = T.corners; let nc = null, bd = 1e9; for (const c of cs) { const d = (c.apex - p.si + N) % N; if (d < bd) { bd = d; nc = c; } }
  const cb = $('cornerBox');
  if (nc && OPT.hud !== 'minimal') {
    const d0 = (nc.a - p.si + N) % N, inside = d0 > N / 2, dist = inside ? 0 : d0 * T.ds, vS = Math.sqrt(A_LAT * .85 * nc.r), sev = nc.r < 45 ? 3 : nc.r < 95 ? 2 : nc.r < 170 ? 1 : 0;
    cb.hidden = dist > 520; $('cNum').textContent = 'T' + nc.n; $('cDist').textContent = inside ? 'apex' : Math.round(dist / 10) * 10 + ' m'; $('cSpd').textContent = vS < G.cls.top * .97 ? '≈ ' + fmtSpeed(vS) : 'flat out';
    const ar = $('cArrow'); ar.setAttribute('class', 's' + sev); ar.style.transform = 'scaleX(' + (nc.dir > 0 ? 1 : -1) + ')';
    cb.classList.toggle('brake', !inside && p.speed > vS + 3 && dist < (p.speed * p.speed - vS * vS) / 72 + 14); $('cBar').style.transform = 'scaleX(' + clamp(1 - dist / 520, 0, 1) + ')';
  } else cb.hidden = true;
  // timing tower
  if (full && G.order && (hudN % 12 === 0 || force)) {
    const lead = G.order[0], prog = c => c.lap * N + c.si + c.along / T.ds; let h = '';
    const show = new Set([0, 1, 2]), me = G.order.indexOf(p); for (let q = me - 3; q <= me + 3; q++) show.add(clamp(q + (me < 6 ? 6 - me - 3 : 0), 0, G.order.length - 1)); let prev = -1;
    G.order.forEach((c, i) => {
      if (G.order.length > 11 && !show.has(i)) return; if (i - prev > 1) h += '<p></p>'; prev = i;
      let gap = ''; if (i) { const dd = (prog(lead) - prog(c)) * T.ds; gap = c.finished && lead.finished ? '+' + (c.finishTime - lead.finishTime).toFixed(1) : dd > T.L ? '+' + Math.floor(dd / T.L) + ' LAP' : '+' + (dd / Math.max(c.speed, G.cls.top * .45)).toFixed(1); } else gap = G.order.length > 1 ? 'LEADER' : '';
      h += `<div class="${c.isPlayer ? 'me' : ''}"><b>${i + 1}</b><i style="background:#${C3(c.ch.car).getHexString()}"></i><span>${c.ch.name.slice(0, 3).toUpperCase()}</span><em>${gap}</em></div>`;
    });
    $('tower').innerHTML = h;
  }
  drawMinimap();
}

/* ---------- menu ---------- */
function avatarSVG(ch) {
  const h = c => '#' + C3(c).getHexString(), f = h(ch.fur), s = h(ch.snout); let ears = '', face = '';
  if (ch.ear === 'point') ears = `<path d="M12 26 L15 6 L28 18Z M52 26 L49 6 L36 18Z" fill="${f}"/><path d="M16 21 L17 11 L24 18Z M48 21 L47 11 L40 18Z" fill="${s}"/>`;
  if (ch.ear === 'long') ears = `<ellipse cx="23" cy="13" rx="5.5" ry="14" fill="${f}"/><ellipse cx="41" cy="13" rx="5.5" ry="14" fill="${f}"/><ellipse cx="23" cy="14" rx="2.4" ry="10" fill="#ffc2d4"/><ellipse cx="41" cy="14" rx="2.4" ry="10" fill="#ffc2d4"/>`;
  if (ch.ear === 'round') ears = `<circle cx="15" cy="20" r="8" fill="${f}"/><circle cx="49" cy="20" r="8" fill="${f}"/><circle cx="15" cy="20" r="4" fill="${s}"/><circle cx="49" cy="20" r="4" fill="${s}"/>`;
  if (ch.ear === 'tuft') ears = `<path d="M12 24 L10 8 L24 18Z M52 24 L54 8 L40 18Z" fill="#6b4a32"/>`;
  if (ch.ear === 'eyes') ears = `<circle cx="20" cy="18" r="9" fill="${f}"/><circle cx="44" cy="18" r="9" fill="${f}"/><circle cx="20" cy="17" r="5.5" fill="#fff"/><circle cx="44" cy="17" r="5.5" fill="#fff"/><circle cx="20" cy="17" r="2.6" fill="#16181d"/><circle cx="44" cy="17" r="2.6" fill="#16181d"/>`;
  if (ch.ear === 'mask') ears = `<circle cx="15" cy="19" r="8" fill="${f}"/><circle cx="49" cy="19" r="8" fill="${f}"/><circle cx="15" cy="19" r="4" fill="#23262e"/><circle cx="49" cy="19" r="4" fill="#23262e"/>`;
  if (ch.ear === 'mask') face = `<ellipse cx="32" cy="46" rx="10" ry="8" fill="${s}"/><path d="M32 24 L29 34 L35 34Z" fill="#23262e"/><ellipse cx="23" cy="35" rx="9" ry="6" fill="#23262e" transform="rotate(-14 23 35)"/><ellipse cx="41" cy="35" rx="9" ry="6" fill="#23262e" transform="rotate(14 41 35)"/><path d="M13 30 Q22 25 30 30" stroke="${s}" stroke-width="2.4" fill="none"/><path d="M34 30 Q42 25 51 30" stroke="${s}" stroke-width="2.4" fill="none"/><circle cx="24" cy="35" r="3" fill="#fff"/><circle cx="40" cy="35" r="3" fill="#fff"/><circle cx="24" cy="35" r="1.5" fill="#16181d"/><circle cx="40" cy="35" r="1.5" fill="#16181d"/><ellipse cx="32" cy="42" rx="3.2" ry="2.4" fill="#16181d"/>`;
  else if (ch.ear === 'tuft') face = `<circle cx="23" cy="34" r="8" fill="#fff"/><circle cx="41" cy="34" r="8" fill="#fff"/><circle cx="23" cy="34" r="3" fill="#16181d"/><circle cx="41" cy="34" r="3" fill="#16181d"/><path d="M32 38 L28 44 L36 44Z" fill="${s}"/>`;
  else if (ch.ear === 'none') face = `<ellipse cx="32" cy="42" rx="14" ry="13" fill="#fff"/><circle cx="25" cy="34" r="2.6" fill="#16181d"/><circle cx="39" cy="34" r="2.6" fill="#16181d"/><path d="M32 38 L26 43 L38 43Z" fill="${s}"/>`;
  else if (ch.ear === 'eyes') face = `<path d="M22 44 Q32 51 42 44" stroke="#1f6a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  else face = `<ellipse cx="32" cy="45" rx="10" ry="8" fill="${s}"/><circle cx="24" cy="35" r="2.8" fill="#16181d"/><circle cx="40" cy="35" r="2.8" fill="#16181d"/><ellipse cx="32" cy="41.5" rx="3.2" ry="2.4" fill="#16181d"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${ears}<circle cx="32" cy="38" r="21" fill="${f}"/>${face}</svg>`;
}
const SEGS = {
  mode: [['race', 'Race'], ['gp', 'Grand Prix'], ['time', 'Time trial'], ['free', 'Free drive']],
  klass: [['easy', 'Cruiser'], ['medium', 'Sport'], ['hard', 'Formula']],
  ai: [['easy', 'Relaxed'], ['normal', 'Balanced'], ['hard', 'Fierce']],
  grid: [['back', 'Back'], ['mid', 'Middle'], ['front', 'Pole']],
  dir: [['fwd', 'Forward'], ['rev', 'Reverse']],
  units: [['both', 'Both'], ['kmh', 'km/h'], ['mph', 'mph']],
  rivals: [['mixed', 'A mix of everything'], ['same', 'Same as mine']],
  cam: [['chase', 'Chase'], ['far', 'Far'], ['hood', 'Hood']],
  hud: [['full', 'Broadcast'], ['standard', 'Standard'], ['minimal', 'Minimal']],
  quality: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']],
};
const MODE_HINT = { gp: '', race: 'Line up on the grid and race the pack to the flag.', time: 'Just you and the clock. Your best lap on each circuit is saved.', free: 'No rivals, no lap limit. Take in the view; press Esc when you are done.' };
const hexOf = c => '#' + C3(c).getHexString();
function outlinePath(t) {
  if (t._path) return t._path;
  const c = new THREE.CatmullRomCurve3(t.pts.map(p => new THREE.Vector3(p[0], 0, -p[1])), true, 'centripetal'), ps = c.getPoints(150); let a = 1e9, b = -1e9, e = 1e9, f = -1e9;
  for (const p of ps) { a = Math.min(a, p.x); b = Math.max(b, p.x); e = Math.min(e, p.z); f = Math.max(f, p.z); }
  const sc = 100 / Math.max(b - a, f - e), ox = (120 - (b - a) * sc) / 2, oz = (120 - (f - e) * sc) / 2;
  return t._path = ps.map((p, q) => (q ? 'L' : 'M') + (ox + (p.x - a) * sc).toFixed(1) + ' ' + (oz + (p.z - e) * sc).toFixed(1)).join('') + 'Z';
}
function cardHTML(t, big) {
  const d = outlinePath(t);
  return `<button type="button" class="card${big ? ' big' : ''}" data-track="${t.id}" style="--a:${t.accent};--s1:${hexOf(t.sky.top)};--s2:${hexOf(t.sky.hor)}"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="${d}" fill="none" stroke="rgba(10,14,28,.55)" stroke-width="7" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/></svg><span class="season">${t.world}</span><span class="tname">${t.name}</span><span class="real">${t.cal ? 'Round ' + t.cal + ' · ' : ''}after ${t.real}</span></button>`;
}
let brFilter = 'all';
function renderBrowser() {
  const q = $('brSearch').value.trim().toLowerCase();
  const list = TRACKS.filter(t => (brFilter === 'all' || (brFilter === 'cal' ? t.cal : brFilter === 'classic' ? !t.cal : t.realm === brFilter)) && (!q || (t.name + ' ' + t.real + ' ' + t.world).toLowerCase().includes(q)));
  list.sort((a, b) => (a.cal || 99) - (b.cal || 99) || a.name.localeCompare(b.name));
  $('brGrid').innerHTML = list.map(t => cardHTML(t)).join('') || '<p class="hint">No circuits match that search.</p>';
  $('brGrid').querySelectorAll('.card').forEach(b => b.classList.toggle('on', b.dataset.track === OPT.track));
  $('brCount').textContent = list.length + (list.length === 1 ? ' circuit' : ' circuits');
  $('brChips').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === brFilter));
}
function buildMenu() {
  const segHTML = k => `<div class="seg" role="group" data-opt="${k}">${SEGS[k].map(o => `<button type="button" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
  const row = (label, inner, cls, hint) => `<div class="row ${cls || ''}"><label>${label}</label><div>${inner}${hint ? `<p class="hint" id="${hint}"></p>` : ''}</div></div>`;
  const rangeHTML = (k, min, max) => `<div class="rng"><input type="range" id="opt_${k}" data-range="${k}" min="${min}" max="${max}" step="1" aria-label="${k}"><output id="out_${k}"></output></div>`;
  document.querySelector('[data-slot=mode]').innerHTML = segHTML('mode');
  $('chars').innerHTML = CHARACTERS.map((c, i) => `<button type="button" class="char" data-char="${i}" style="--car:#${C3(c.car).getHexString()}" title="${c.name} the ${c.kind}">${avatarSVG(c)}<span>${c.name}</span></button>`).join('');
  $('vehs').innerHTML = VEHICLES.map(v => `<button type="button" class="veh" data-veh="${v.id}"><img alt="" id="vt_${v.id}"><span>${v.name}</span></button>`).join('');
  $('raceOpts').innerHTML =
    row('Laps', `<div class="step"><button type="button" data-step="-1" aria-label="Fewer laps">−</button><input type="number" id="opt_laps" min="1" max="99" inputmode="numeric" aria-label="Laps"><button type="button" data-step="1" aria-label="More laps">+</button></div>`, 'r-laps') +
    row('Speed class', segHTML('klass'), '', 'klassHint') +
    row('Opponents', rangeHTML('opp', 0, 25), 'r-race') +
    row('Rivals drive', segHTML('rivals'), 'r-race') +
    row('Rival skill', segHTML('ai'), 'r-race') +
    row('Grid slot', segHTML('grid'), 'r-race') +
    row('Direction', segHTML('dir'));
  const tg = (k, title, sub, cls) => `<button type="button" class="tog ${cls || ''}" data-tog="${k}" role="switch"><i></i><span><b>${title}</b><small>${sub}</small></span></button>`;
  $('toggles').innerHTML = tg('items', 'Item boxes', 'Rainbow boxes on the road hand out honey rockets, peels, homing bees, bubble shields and thunderclouds. Press E to use.') + tg('boost', 'Boosts', 'Drift turbo, slipstream and a boost meter. Turn off for pure racing.') + tg('line', 'Racing line', 'Paints the ideal path on the road: green to go, red to brake. Press L in a race to switch.') + tg('chal', 'Mid-race challenges', 'Pick which ones appear, scored as style points.') + `<div id="chalPick" class="chips">${CHALS.map(c => `<button type="button" data-ch="${c[0]}" title="${c[2]}">${c[1]}</button>`).join('')}</div>` + tg('bump', 'Bumping', 'Cars can nudge each other. Off makes rivals pass through.', 'r-race') + tg('rubber', 'Catch-up', 'Keeps the pack close so races stay tight.', 'r-race');
  $('dispOpts').innerHTML = row('On-screen', segHTML('hud'), '', 'hudHint') + row('Speed in', segHTML('units')) + row('Camera', segHTML('cam')) + row('Detail', segHTML('quality'), '', 'qHint') + row('Sound', rangeHTML('sfx', 0, 100)) + row('Music', rangeHTML('music', 0, 100));
  const realms = [['all', 'All'], ['cal', '2026 season'], ['classic', 'Classic venues']].concat(REALMS.map(r => [r, r]));
  $('brChips').innerHTML = realms.map(r => `<button type="button" data-f="${r[0]}">${r[1]}</button>`).join('');
  const menu = $('menu');
  menu.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; let reload = false;
    if (b.dataset.v) { const k = b.parentNode.dataset.opt; OPT[k] = b.dataset.v; reload = k === 'dir' || k === 'quality'; if (k === 'quality') OPT.qSet = true; }
    else if (b.dataset.track || b.id === 'btnBrowse') { $('brSearch').value = ''; showScreen('browser'); renderBrowser(); const on = $('brGrid').querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' }); return; }
    else if (b.id === 'btnRandom') { OPT.track = TRACKS[Math.floor(Math.random() * TRACKS.length)].id; reload = true; }
    else if (b.dataset.char) { OPT.char = +b.dataset.char; drawThumbs(); }
    else if (b.dataset.veh) OPT.veh = b.dataset.veh;
    else if (b.dataset.ch) OPT.cs[b.dataset.ch] = OPT.cs[b.dataset.ch] ? 0 : 1;
    else if (b.dataset.tog) OPT[b.dataset.tog] = !OPT[b.dataset.tog];
    else if (b.dataset.step) OPT.laps = clamp(OPT.laps + +b.dataset.step, 1, 99);
    else return;
    syncMenu(); if (reload) loadTrack();
  });
  menu.addEventListener('input', e => {
    const t = e.target; if (t.dataset.range) { OPT[t.dataset.range] = +t.value; Sound.applyVol(); } else if (t.id === 'opt_laps') { const v = parseInt(t.value, 10); if (v >= 1) OPT.laps = clamp(v, 1, 99); else return; }
    syncMenu(true);
  });
  $('browser').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.f) { brFilter = b.dataset.f; renderBrowser(); }
    else if (b.dataset.track) { OPT.track = b.dataset.track; showScreen('menu'); syncMenu(); loadTrack(); }
    else if (b.id === 'brClose') showScreen('menu');
  });
  $('brSearch').addEventListener('input', renderBrowser);
  $('opt_laps').addEventListener('blur', () => syncMenu());
  $('btnStart').addEventListener('click', () => OPT.mode === 'gp' ? gpBegin() : startRace());
  $('btnResume').addEventListener('click', togglePause);
  $('btnRestart').addEventListener('click', () => { Sound.pause(false); startRace(); });
  $('btnQuit').addEventListener('click', toMenu); $('hudMenu').addEventListener('click', () => { if (G.state === 'racing' || G.state === 'countdown') togglePause(); }); $('btnMenu').addEventListener('click', toMenu); $('btnAgain').addEventListener('click', () => GP.active ? gpNext() : startRace());
  syncMenu();
}
function syncMenu(typing) {
  const t = trackDef(), m = $('menu');
  document.documentElement.style.setProperty('--accent', t.accent);
  m.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(OPT[s.dataset.opt]) === b.dataset.v)));
  m.querySelectorAll('.char').forEach(b => b.classList.toggle('on', +b.dataset.char === OPT.char));
  m.querySelectorAll('.veh').forEach(b => b.classList.toggle('on', b.dataset.veh === OPT.veh));
  m.querySelectorAll('#chalPick button').forEach(b => b.classList.toggle('on', !!OPT.cs[b.dataset.ch])); $('chalPick').hidden = !OPT.chal;
  const nOn = CHALS.filter(c => OPT.cs[c[0]]).length; $('chalHint').textContent = OPT.chal ? nOn + ' of ' + CHALS.length + ' challenges on. Hover a name to see what it asks of you.' : ''; $('chalHint').hidden = !OPT.chal;
  m.querySelectorAll('.tog').forEach(b => { b.classList.toggle('on', !!OPT[b.dataset.tog]); b.setAttribute('aria-checked', !!OPT[b.dataset.tog]); });
  m.querySelectorAll('[data-range]').forEach(r => { r.value = OPT[r.dataset.range]; $('out_' + r.dataset.range).textContent = OPT[r.dataset.range]; });
  if (!typing) $('opt_laps').value = OPT.laps;
  m.className = 'screen m-' + OPT.mode;
  $('modeHint').textContent = OPT.mode === 'gp' ? gpHint() + cupShelf() : MODE_HINT[OPT.mode];
  $('trackSel').innerHTML = cardHTML(t, true);
  const c = CLASSES[OPT.klass], est = G.T && G.T.def.id === t.id ? lapEstimate(G.T, c) : 0, gain = G.T && G.T.def.id === t.id ? Math.round(G.T.maxY - G.T.minY) : 0;
  $('trackBlurb').innerHTML = `${TRACKS.length} circuits to choose from. <b>${t.name}</b> is set in <b>${t.world}</b>` + (est ? `, with ${G.T.corners.length} corners and ${gain} m between its lowest and highest points.` : '.');
  $('klassHint').textContent = `Tops out near ${fmtSpeed(c.top)}` + (est ? `; a lap here takes about ${Math.floor(est / 60)}:${String(Math.round(est % 60)).padStart(2, '0')}.` : '.');
  $('hudHint').textContent = { full: 'Timing tower, sectors, live delta, gears, revs, pedals, g-force, next corner and elevation.', standard: 'Lap times, gear, speed, next corner and the map.', minimal: 'Just position, lap and speed.' }[OPT.hud] + ' Press H in a race to switch.';
  $('qHint').textContent = { low: 'Fewer trees and no shadows, for older laptops.', medium: 'Full scenery without shadows.', high: 'Everything on, with shadows.' }[OPT.quality];
  const ch = CHARACTERS[OPT.char], rec = BEST[bestKey()];
  $('summary').innerHTML = `<b>${ch.name} the ${ch.kind}</b> on a ${(VEHICLES.find(v => v.id === OPT.veh) || VEHICLES[0]).name.toLowerCase()} · ${t.name}` + (OPT.mode === 'free' ? '' : ` · ${OPT.laps} ${OPT.laps === 1 ? 'lap' : 'laps'}`) + (rec ? ` · best lap ${fmtTime(rec)}` : '');
  $('btnStart').textContent = { gp: 'Start the ' + cupOf(OPT.track).name, race: 'Start race', time: 'Start time trial', free: 'Go for a drive' }[OPT.mode];
  store.set('sgp_opts', OPT);
}
function drawThumbs() { try { const th = vehicleThumbs(CHARACTERS[OPT.char]); for (const v of VEHICLES) $('vt_' + v.id).src = th[v.id]; } catch (e) { } }
function boot() {
  try { initGL(); } catch (e) { $('loadText').textContent = 'This browser could not start 3D graphics (WebGL). Try a recent Chrome, Edge, Firefox or Safari.'; return; }
  if (!TRACKS.some(t => t.id === OPT.track)) OPT.track = TRACKS[0].id; if (!(OPT.char >= 0 && OPT.char < CHARACTERS.length)) OPT.char = 0; if (!HUDS.includes(OPT.hud)) OPT.hud = 'full'; if (!VEHICLES.some(v => v.id === OPT.veh)) OPT.veh = 'car'; if (!OPT.cs || typeof OPT.cs !== 'object') OPT.cs = {}; if (!['both', 'kmh', 'mph'].includes(OPT.units)) OPT.units = 'both'; OPT.opp = clamp(OPT.opp | 0, 0, 25);
  buildMenu(); drawThumbs(); G.state = 'menu'; showScreen('menu'); loadTrack(() => syncMenu()); requestAnimationFrame(frame);
}
// boot() runs at the end of extras.js, once everything is loaded.

