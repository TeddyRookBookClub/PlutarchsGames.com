'use strict';
/* Heroes of Hellas — drawing the world: isometric terrain, buildings, units, effects, fog and the minimap. */

const TW = 64, TH = 32;
const cv = document.getElementById('world'), ctx = cv.getContext('2d');
const CAM = { x: 0, y: 0, z: 1 };
let VW = 0, VH = 0, DPR = 1;
function resizeView() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = cv.clientWidth; VH = cv.clientHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); }
const proj = (x, y) => [(x - y) * TW / 2, (x + y) * TH / 2];
function toScreen(x, y, z) { const [px, py] = proj(x, y); return [(px - CAM.x) * CAM.z + VW / 2, (py - (z || 0) * TH - CAM.y) * CAM.z + VH / 2]; }
function toWorld(sx, sy) { const px = (sx - VW / 2) / CAM.z + CAM.x, py = (sy - VH / 2) / CAM.z + CAM.y; const a = px / (TW / 2), b = py / (TH / 2); return { x: (a + b) / 2, y: (b - a) / 2 }; }
function centerOn(x, y) { const [px, py] = proj(x, y); CAM.x = px; CAM.y = py; }

/* ---------- terrain tiles, pre-rendered ---------- */
const TER_COL = [['#7fae4f', '#86b553', '#79a84a', '#8ab858'], ['#b59a68', '#ad9260', '#bba06d', '#a88e5d'], ['#e4d39a', '#dccb90', '#e8d8a2', '#d8c78b'], ['#2f78b7', '#2b72af', '#3380c0', '#2c74b2'],
  ['#5aa3c9', '#61aacf', '#559dc3', '#5ea7cc'], ['#6f8f55', '#67874e', '#76955b', '#6b8b51'], ['#c9c2b0', '#c2baa7', '#cfc8b6', '#bdb5a2'], ['#6b9a46', '#729f4b', '#679542', '#6e9d48'], ['#8d8473', '#857c6b', '#938a79', '#8a8170']];
const TILE_IMG = [];
function buildTiles() {
  const R = rng(5);
  for (let t = 0; t < TER_COL.length; t++) { TILE_IMG[t] = []; for (let v = 0; v < 4; v++) {
    const c = document.createElement('canvas'); c.width = TW + 2; c.height = TH + 2; const g = c.getContext('2d');
    g.translate(1, 1); g.beginPath(); g.moveTo(TW / 2, -.5); g.lineTo(TW + .5, TH / 2); g.lineTo(TW / 2, TH + .5); g.lineTo(-.5, TH / 2); g.closePath(); g.fillStyle = TER_COL[t][v]; g.fill(); g.save(); g.clip();
    // speckles for texture
    for (let k = 0; k < 26; k++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; const x = R() * TW, y = R() * TH; g.fillRect(x, y, 2 + R() * 3, 1 + R() * 2); }
    if (t === 0 || t === 7) for (let k = 0; k < 7; k++) { g.strokeStyle = 'rgba(40,80,20,.35)'; g.beginPath(); const x = R() * TW, y = R() * TH; g.moveTo(x, y); g.lineTo(x + 1, y - 3); g.stroke(); }
    if (t === 5) for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(70,120,150,.35)'; g.beginPath(); g.ellipse(R() * TW, R() * TH, 6, 2, 0, 0, TAU); g.fill(); }
    if (t === 6) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.moveTo(TW / 4, TH / 4); g.lineTo(TW * .75, TH * .75); g.moveTo(TW * .75, TH / 4); g.lineTo(TW / 4, TH * .75); g.stroke(); }
    g.restore(); TILE_IMG[t].push(c);
  } }
}
buildTiles();

/* ---------- Wang-style corner tiles ----------
   Terrain lives on tiles, but we draw it from the tile's four CORNERS. Each corner takes the most common terrain
   of the four tiles that meet there. A tile is drawn as its lowest corner terrain, then each higher terrain on top
   through a mask: 15 corner patterns × 2 variants, with soft, noisy borders. The noise fades to zero along tile edges,
   so a border always meets the edge at its midpoint and neighbouring tiles join without seams. */
const PRIO = [5, 4, 3, 0, 1, 2, 7, 6, 7];               // drawing order per terrain (higher draws on top)
const EDGE = { 2: 'rgba(120,96,50,.35)', 0: 'rgba(40,70,20,.28)', 7: 'rgba(40,70,20,.3)', 1: 'rgba(90,70,40,.3)', 6: 'rgba(80,76,66,.35)', 5: 'rgba(40,60,30,.3)', 4: 'rgba(255,255,255,.35)', 8: 'rgba(80,76,66,.35)' };
const MASK = {};   // MASK[t][mask][variant] -> canvas
function buildMasks() {
  const R = rng(9), W = TW + 2, H = TH + 2;
  const noise = []; for (let v = 0; v < 2; v++) { const g = []; for (let i = 0; i < 64; i++) g.push(R()); noise.push(g); }
  const nz = (v, u, w) => { const g = noise[v], f = (a, b) => g[((a & 7) * 8 + (b & 7))]; const x = u * 6, y = w * 6, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; return lerp(lerp(f(ix, iy), f(ix + 1, iy), fx), lerp(f(ix, iy + 1), f(ix + 1, iy + 1), fx), fy) - .5; };
  for (let t = 0; t < TER_COL.length; t++) {
    MASK[t] = [];
    const src = TILE_IMG[t][0].getContext('2d').getImageData(0, 0, W, H).data;
    for (let m = 1; m < 16; m++) {
      MASK[t][m] = [];
      for (let v = 0; v < 2; v++) {
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
        const c00 = m & 1 ? 1 : 0, c10 = m & 2 ? 1 : 0, c11 = m & 4 ? 1 : 0, c01 = m & 8 ? 1 : 0;
        for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
          const a = (px - 1 - TW / 2) / (TW / 2), b = (py - 1) / (TH / 2), u = (a + b) / 2, w = (b - a) / 2;
          if (u < -.03 || w < -.03 || u > 1.03 || w > 1.03) continue;
          const uu = clamp(u, 0, 1), ww = clamp(w, 0, 1);
          const f = c00 * (1 - uu) * (1 - ww) + c10 * uu * (1 - ww) + c11 * uu * ww + c01 * (1 - uu) * ww;
          const fade = Math.min(1, Math.sin(Math.PI * uu) * Math.sin(Math.PI * ww) * 3);
          const val = f + nz(v, uu + m * .37, ww) * .55 * fade;
          if (val < .5) continue;
          const o = (py * W + px) * 4, edge = val < .58;
          d[o] = src[o]; d[o + 1] = src[o + 1]; d[o + 2] = src[o + 2]; d[o + 3] = src[o + 3] || 255;
          if (edge) { const k = t === 4 || t === 2 ? 1.12 : .8; d[o] = clamp(d[o] * k, 0, 255); d[o + 1] = clamp(d[o + 1] * k, 0, 255); d[o + 2] = clamp(d[o + 2] * k, 0, 255); }
        }
        g.putImageData(img, 0, 0); MASK[t][m].push(c);
      }
    }
  }
}
buildMasks();
let VTX = null, VTX_G = null;
function buildVertices() {
  const n = G.n, V = new Uint8Array((n + 1) * (n + 1)), cnt = new Uint8Array(9);
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    cnt.fill(0); let best = 0, bc = -1;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const tx = clamp(x + dx, 0, n - 1), ty = clamp(y + dy, 0, n - 1); let t = G.ter[ty * n + tx]; if (t === TER.maze) t = TER.stone; cnt[t]++; }
    for (let t = 0; t < 9; t++) if (cnt[t] > bc || (cnt[t] === bc && cnt[t] && PRIO[t] > PRIO[best])) { bc = cnt[t]; best = t; }
    V[y * (n + 1) + x] = best;
  }
  VTX = V; VTX_G = G;
}
// little things scattered on the ground, chosen by a hash of the tile position so they never flicker
function tileHash(x, y) { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function groundDeco(x, y, t, p) {
  const h = tileHash(x, y); if (h > .22) return;
  const h2 = tileHash(y + 99, x + 7), cx = p[0] + (h2 - .5) * 30, cy = p[1] + TH / 2 + (tileHash(x + 3, y + 5) - .5) * 12;
  if (t === TER.grass || t === TER.hill) {
    if (h < .07) { for (let k = 0; k < 3; k++) ell(cx + k * 4 - 4, cy - (k % 2) * 2, 1.6, 1.6, ['#f6f2e0', '#f5d34a', '#d987c7'][(h2 * 3 | 0)]); }
    else if (h < .15) { ctx.strokeStyle = 'rgba(50,90,30,.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(cx + k * 2, cy); ctx.lineTo(cx + k * 3, cy - 5 - Math.abs(k)); } ctx.stroke(); }
    else { ell(cx, cy, 3, 1.8, '#9a968a'); ell(cx - 1, cy - .6, 1.6, .8, '#bdb9ad'); }
  } else if (t === TER.sand) { if (h < .1) { ell(cx, cy, 2.5, 1.2, '#f2e6c4'); } else { ctx.strokeStyle = 'rgba(150,120,60,.4)'; ctx.beginPath(); ctx.arc(cx, cy, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
  else if (t === TER.dirt) { ell(cx, cy, 2.2, 1.3, '#8a7656'); ell(cx + 5, cy + 1, 1.4, .9, '#8a7656'); }
  else if (t === TER.marsh) { ctx.strokeStyle = '#4d7a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(cx + k * 2, cy); ctx.lineTo(cx + k * 2 + (k - 1.5), cy - 8 - k); } ctx.stroke(); }
}
function drawTerrainTile(x, y, p, n) {
  if (VTX_G !== G) buildVertices();
  const N1 = n + 1, c = [VTX[y * N1 + x], VTX[y * N1 + x + 1], VTX[(y + 1) * N1 + x + 1], VTX[(y + 1) * N1 + x]];
  let base = c[0]; for (const t of c) if (PRIO[t] < PRIO[base]) base = t;
  const v = (x * 7 + y * 13) & 3, X = p[0] - TW / 2 - 1, Y = p[1] - 1;
  ctx.drawImage(TILE_IMG[base][v], X, Y);
  const layers = [...new Set(c)].filter(t => t !== base).sort((a, b) => PRIO[a] - PRIO[b]);
  for (const t of layers) { let m = 0; for (let k = 0; k < 4; k++) if (PRIO[c[k]] >= PRIO[t]) m |= 1 << k; if (m === 15) ctx.drawImage(TILE_IMG[t][v], X, Y); else ctx.drawImage(MASK[t][m][(x + y) & 1], X, Y); }
  const top = layers.length ? layers[layers.length - 1] : base;
  if (c[0] === c[1] && c[1] === c[2] && c[2] === c[3]) groundDeco(x, y, top, p);
  return base;
}

/* ---------- small drawing helpers ---------- */
function poly(pts, fill, stroke) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } }
function ell(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
const teamCol = o => PLAYER_COLORS[o] || { main: '#d9c27a', dark: '#8a7a40', light: '#fff1b8' };
// footprint corners of a building in world-space pixels (no camera)
function foot(x, y, s) { return { t: proj(x, y), r: proj(x + s, y), b: proj(x + s, y + s), l: proj(x, y + s) }; }
function box(x, y, s, h, wall, roofCol, opts) {
  opts = opts || {}; const f = foot(x + (opts.inset || 0), y + (opts.inset || 0), s - 2 * (opts.inset || 0)), up = p => [p[0], p[1] - h];
  poly([f.l, f.b, up(f.b), up(f.l)], shade(wall, .82));   // left face
  poly([f.b, f.r, up(f.r), up(f.b)], shade(wall, .68));   // right face
  if (roofCol) poly([up(f.t), up(f.r), up(f.b), up(f.l)], roofCol);
  return { f, up, h };
}
function hipRoof(x, y, s, h, rh, col, inset) {
  const i = inset || 0, f = foot(x + i, y + i, s - 2 * i), c = proj(x + s / 2, y + s / 2), apex = [c[0], c[1] - h - rh], up = p => [p[0], p[1] - h];
  poly([up(f.l), up(f.b), apex], shade(col, .85)); poly([up(f.b), up(f.r), apex], shade(col, .7));
  poly([up(f.t), up(f.l), apex], shade(col, 1.05)); poly([up(f.r), up(f.t), apex], shade(col, .95));
  ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { const a = up(f.l), b = up(f.b); ctx.beginPath(); ctx.moveTo(lerp(a[0], apex[0], k / 4), lerp(a[1], apex[1], k / 4)); ctx.lineTo(lerp(b[0], apex[0], k / 4), lerp(b[1], apex[1], k / 4)); ctx.stroke(); }
}
function columns(a, b, h, n, col) { for (let k = 0; k <= n; k++) { const x = lerp(a[0], b[0], k / n), y = lerp(a[1], b[1], k / n); ctx.fillStyle = shade(col, .75); ctx.fillRect(x - 2.5, y - h, 5, h); ctx.fillStyle = col; ctx.fillRect(x - 2.5, y - h, 2.5, h); ctx.fillRect(x - 3.5, y - h - 2, 7, 3); } }
function flag(px, py, h, owner, t) { const c = teamCol(owner).main; ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - h); ctx.stroke(); const w = Math.sin((t || 0) * 4 + px) * 2; poly([[px, py - h], [px + 12, py - h + 3 + w], [px, py - h + 8]], c); }

/* ---------- resources ---------- */
function drawRes(e) {
  const [px, py] = proj(e.x + .5, e.y + .5);
  if (e.t === 'tree') {
    const k = e.v, s = .85 + k * .4 * (e.amount / e.max * .3 + .7);
    ell(px + 4, py + 2, 13 * s, 5 * s, 'rgba(0,0,0,.18)');
    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(px - 2, py - 14 * s, 4, 14 * s);
    if (k < .35) { // cypress
      poly([[px, py - 52 * s], [px + 9 * s, py - 12 * s], [px, py - 8 * s], [px - 9 * s, py - 12 * s]], '#2f5a2e'); poly([[px, py - 52 * s], [px + 9 * s, py - 12 * s], [px, py - 8 * s]], '#24492a');
    } else if (k < .7) { // olive
      ell(px, py - 22 * s, 16 * s, 12 * s, '#6f8f4e'); ell(px - 7 * s, py - 26 * s, 9 * s, 8 * s, '#839f5c'); ell(px + 7 * s, py - 20 * s, 9 * s, 7 * s, '#5f7f43'); ell(px - 3, py - 30 * s, 5 * s, 4 * s, '#9db574');
    } else { // pine
      for (let l = 0; l < 3; l++) poly([[px, py - (44 - l * 9) * s], [px + (12 + l * 3) * s, py - (20 - l * 6) * s], [px - (12 + l * 3) * s, py - (20 - l * 6) * s]], l % 2 ? '#3d6b35' : '#457a3c');
    }
  } else if (e.t === 'gold') {
    const s = .5 + .5 * e.amount / e.max;
    ell(px, py + 2, 22, 8, 'rgba(0,0,0,.18)');
    poly([[px - 18 * s, py], [px - 10 * s, py - 16 * s], [px + 4 * s, py - 20 * s], [px + 18 * s, py - 6 * s], [px + 12 * s, py + 4], [px - 8, py + 5]], '#8a8478');
    poly([[px - 10 * s, py - 16 * s], [px + 4 * s, py - 20 * s], [px + 2, py - 6]], '#a39d90');
    for (const [dx, dy] of [[-6, -9], [4, -13], [9, -4], [-2, -3]]) { ell(px + dx * s, py + dy * s, 3, 2, '#ffd447'); ell(px + dx * s - 1, py + dy * s - 1, 1, 1, '#fff6c0'); }
  } else if (e.t === 'berry') {
    ell(px, py + 1, 14, 6, 'rgba(0,0,0,.18)'); ell(px, py - 7, 13, 9, '#3f7a3a'); ell(px - 5, py - 10, 7, 6, '#4f8f45');
    const n = Math.ceil(7 * e.amount / e.max); for (let k = 0; k < n; k++) ell(px - 8 + (k * 5) % 16, py - 12 + ((k * 7) % 9), 2.2, 2.2, '#c2244b');
  }
}

/* ---------- buildings ---------- */
function drawBld(e, ghost) {
  const s = e.size, x = e.x, y = e.y, own = e.owner, T = G ? G.time : 0, C = teamCol(own), D = BUILDINGS[e.t];
  const f = foot(x, y, s); ctx.save(); if (ghost) ctx.globalAlpha = .6;
  // shadow and plinth
  poly([[f.t[0] + 8, f.t[1] + 4], [f.r[0] + 10, f.r[1] + 4], [f.b[0] + 8, f.b[1] + 6], [f.l[0] + 6, f.l[1] + 4]], 'rgba(0,0,0,.16)');
  if (e.built < 1 && !ghost) {
    const h = 6 + 30 * e.built * (s / 3 + .4);
    box(x, y, s, 4, '#c8b48a', '#d8c49a', { inset: .1 });
    box(x, y, s, h, '#a37b4b', null, { inset: .25 });
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2; const ff = foot(x + .25, y + .25, s - .5);
    for (const p of [ff.l, ff.b, ff.r]) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - h - 8); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(ff.l[0], ff.l[1] - h); ctx.lineTo(ff.b[0], ff.b[1] - h); ctx.lineTo(ff.r[0], ff.r[1] - h); ctx.stroke();
    ctx.restore(); return;
  }
  switch (e.t) {
    case 'agora': {
      box(x, y, s, 6, '#d9cfb3', '#e6dcc0');
      const w = '#efe6cf'; const b = box(x, y, s, 30, w, null, { inset: .45 });
      columns([f.l[0] + 10, f.l[1] - 6], [f.b[0], f.b[1] - 6 - 6], 26, 6, '#fbf6e9');
      columns([f.b[0], f.b[1] - 12], [f.r[0] - 10, f.r[1] - 6], 26, 6, '#f2ecdc');
      hipRoof(x, y, s, 34, 20, '#c0583a', .25);
      flag(proj(x + s / 2, y + s / 2)[0], proj(x + s / 2, y + s / 2)[1] - 52, 22, own, T);
      break;
    }
    case 'house': {
      box(x, y, s, 20, '#f1ead9', null, { inset: .2 });
      const ff = foot(x + .2, y + .2, s - .4); ctx.fillStyle = '#5a3b22'; const d = [lerp(ff.l[0], ff.b[0], .45), lerp(ff.l[1], ff.b[1], .45)]; ctx.fillRect(d[0] - 3, d[1] - 13, 7, 12);
      ctx.fillStyle = '#4a6d8a'; const wdw = [lerp(ff.b[0], ff.r[0], .5), lerp(ff.b[1], ff.r[1], .5)]; ctx.fillRect(wdw[0] - 3, wdw[1] - 15, 6, 5);
      hipRoof(x, y, s, 20, 14, '#c4613f', .1); ctx.fillStyle = C.main; ctx.fillRect(d[0] - 1, d[1] - 18, 3, 3);
      break;
    }
    case 'storehouse': {
      box(x, y, s, 18, '#a77d4f', null, { inset: .2 }); hipRoof(x, y, s, 18, 10, '#8c6a46', .1);
      for (const k of [.25, .5, .75]) { const p = [lerp(f.l[0], f.b[0], k), lerp(f.l[1], f.b[1], k) + 2]; ell(p[0], p[1] - 6, 4, 6, '#b8613a'); ell(p[0], p[1] - 12, 2.5, 1.5, '#8a3f20'); }
      flag(f.r[0] - 6, f.r[1] - 18, 14, own, T); break;
    }
    case 'farm': {
      poly([f.t, f.r, f.b, f.l], '#a5874f');
      for (let k = 1; k < 6; k++) { const a = [lerp(f.l[0], f.t[0], k / 6), lerp(f.l[1], f.t[1], k / 6)], b = [lerp(f.b[0], f.r[0], k / 6), lerp(f.b[1], f.r[1], k / 6)]; ctx.strokeStyle = '#d8b84a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 1.5; poly([f.t, f.r, f.b, f.l], null, '#7a5a30'); break;
    }
    case 'barracks': {
      box(x, y, s, 26, '#b7ae9e', null, { inset: .2 }); hipRoof(x, y, s, 26, 14, '#a54a33', .1);
      const ff = foot(x + .2, y + .2, s - .4); for (const k of [.2, .45, .7]) { const p = [lerp(ff.l[0], ff.b[0], k), lerp(ff.l[1], ff.b[1], k)]; ell(p[0], p[1] - 14, 5, 5, C.main); ell(p[0], p[1] - 14, 2, 2, C.light); }
      flag(proj(x + s / 2, y + s / 2)[0], proj(x + s / 2, y + s / 2)[1] - 44, 18, own, T); break;
    }
    case 'range': {
      box(x, y, s, 4, '#a98f63', '#c8ad7c', { inset: .1 });
      box(x + 1.6, y, 1.2, 18, '#9a7148', null); hipRoof(x + 1.6, y, 1.2, 18, 10, '#8f5a36');
      for (const k of [.3, .65]) { const p = proj(x + .6 + k, y + 2.2); ell(p[0], p[1] - 10, 7, 9, '#f2e6c8'); ell(p[0], p[1] - 10, 4.5, 6, '#c33'); ell(p[0], p[1] - 10, 2, 3, '#f2e6c8'); }
      flag(f.t[0], f.t[1] - 4, 18, own, T); break;
    }
    case 'stable': {
      box(x, y, s, 22, '#8a6038', null, { inset: .2 }); hipRoof(x, y, s, 22, 12, '#6b4a2e', .1);
      const p = proj(x + .6, y + s - .2); ell(p[0], p[1] - 4, 8, 5, '#d9b85a'); ell(p[0] + 4, p[1] - 7, 6, 4, '#e7c96a');
      flag(f.r[0] - 8, f.r[1] - 22, 14, own, T); break;
    }
    case 'temple': {
      box(x, y, s, 8, '#ddd6c6', '#ebe5d6');
      box(x, y, s, 34, '#f5f1e8', null, { inset: .5 });
      columns([f.l[0] + 12, f.l[1] - 8], [f.b[0], f.b[1] - 8 - 6], 30, 5, '#ffffff'); columns([f.b[0], f.b[1] - 14], [f.r[0] - 12, f.r[1] - 8], 30, 5, '#f4f0e6');
      hipRoof(x, y, s, 38, 18, '#e8e1d0', .3);
      const c = proj(x + s / 2, y + s / 2); ctx.globalAlpha = .45 + Math.sin(T * 2) * .15; ell(c[0], c[1] - 64, 6, 6, '#ffe58a'); ctx.globalAlpha = ghost ? .6 : 1;
      flag(f.l[0] + 8, f.l[1] - 8, 30, own, T); break;
    }
    case 'tower': {
      box(x, y, s, 56, '#b9b09e', '#d1c8b4', { inset: .1 });
      const ff = foot(x + .1, y + .1, s - .2); for (const p of [ff.t, ff.r, ff.b, ff.l]) { ctx.fillStyle = '#a99f8c'; ctx.fillRect(p[0] - 3, p[1] - 64, 6, 8); }
      flag(proj(x + .5, y + .5)[0], proj(x + .5, y + .5)[1] - 60, 18, own, T); break;
    }
    case 'wall': {
      for (let k = 0; k < 4; k++) { const p = proj(x + .15 + k * .23, y + .85 - k * .23); ctx.fillStyle = k % 2 ? '#7a5a36' : '#8e6b42'; ctx.fillRect(p[0] - 3, p[1] - 22, 6, 22); poly([[p[0] - 3, p[1] - 22], [p[0], p[1] - 27], [p[0] + 3, p[1] - 22]], '#6b4a2e'); }
      if (own === 0) { const p = proj(x + .5, y + .5); ctx.fillStyle = '#5a5146'; ctx.fillRect(p[0] - 14, p[1] - 32, 28, 32); ctx.fillStyle = '#c9a227'; ell(p[0], p[1] - 16, 3, 3, '#c9a227'); }
      break;
    }
    case 'palace': {
      box(x, y, s, 8, '#d9c8a0', '#e8d8b0');
      box(x, y, s, 30, '#efdcb0', null, { inset: .4 });
      const red = '#b8342a'; columns([f.l[0] + 14, f.l[1] - 8], [f.b[0], f.b[1] - 14], 26, 7, red); columns([f.b[0], f.b[1] - 14], [f.r[0] - 14, f.r[1] - 8], 26, 7, red);
      box(x + .9, y + .9, s - 1.8, 50, '#f2e2bc', '#e6d2a6');
      const c = proj(x + s / 2, y + s / 2); for (const dx of [-14, 14]) { poly([[c[0] + dx - 7, c[1] - 52], [c[0] + dx - 9, c[1] - 66], [c[0] + dx - 3, c[1] - 56], [c[0] + dx + 3, c[1] - 56], [c[0] + dx + 9, c[1] - 66], [c[0] + dx + 7, c[1] - 52]], '#e8e0cc'); }
      flag(c[0], c[1] - 60, 24, own, T); break;
    }
    case 'shrine': {
      box(x, y, s, 6, '#d8d2c2', '#ebe6da'); box(x, y, s, 24, '#f7f3ea', null, { inset: .35 }); hipRoof(x, y, s, 24, 12, '#ebe4d2', .25);
      const c = proj(x + s / 2, y + s / 2); ell(c[0], c[1] - 46 + Math.sin(T * 2) * 2, 5, 6, '#8a7a5a'); ell(c[0] - 2, c[1] - 48 + Math.sin(T * 2) * 2, 1.4, 1.4, '#ffe066'); ell(c[0] + 2, c[1] - 48 + Math.sin(T * 2) * 2, 1.4, 1.4, '#ffe066');
      if (G && !G.flags.mirrorTaken) { ctx.globalAlpha = .3 + Math.sin(T * 3) * .15; ell(c[0], c[1] - 20, 30, 18, '#fff3a0'); ctx.globalAlpha = 1; }
      break;
    }
    case 'argo': {
      const c = proj(x + s / 2, y + s / 2), bob = Math.sin(T * 1.5) * 2;
      ctx.save(); ctx.translate(c[0], c[1] + bob);
      poly([[-46, -6], [46, -14], [38, 6], [-36, 12]], '#6b4422'); poly([[-46, -6], [46, -14], [44, -18], [-48, -10]], '#8a5a2e');
      ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.5; for (let k = -34; k < 36; k += 7) { ctx.beginPath(); ctx.moveTo(k, 4); ctx.lineTo(k - 6, 16); ctx.stroke(); }
      poly([[46, -14], [56, -30], [50, -14]], '#8a5a2e'); ell(-40, -2, 4, 4, '#3a6aa8');
      ctx.fillStyle = '#5a3b22'; ctx.fillRect(-2, -78, 4, 70);
      poly([[2, -74], [34, -64 + Math.sin(T) * 2], [30, -22], [2, -18]], '#f4ecd8'); poly([[2, -60], [33, -52], [32, -42], [2, -48]], C.main);
      ctx.restore(); break;
    }
    case 'oak': {
      const c = proj(x + s / 2, y + s / 2); ell(c[0] + 8, c[1] + 4, 40, 14, 'rgba(0,0,0,.2)');
      ctx.fillStyle = '#5a3b22'; ctx.fillRect(c[0] - 6, c[1] - 50, 12, 50);
      ell(c[0], c[1] - 70, 46, 32, '#3f6a2e'); ell(c[0] - 22, c[1] - 78, 26, 20, '#4f7f38'); ell(c[0] + 22, c[1] - 62, 24, 18, '#355f28'); ell(c[0] + 6, c[1] - 92, 22, 16, '#5a8a40');
      if (G && !G.flags.dragonDead || G && !(G.byId.get(G.flags.hero) || {}).fleece) { ctx.globalAlpha = .35 + Math.sin(T * 3) * .15; ell(c[0] + 14, c[1] - 52, 22, 18, '#ffe066'); ctx.globalAlpha = 1; poly([[c[0] + 6, c[1] - 62], [c[0] + 24, c[1] - 60], [c[0] + 22, c[1] - 40], [c[0] + 8, c[1] - 42]], '#f5c518'); }
      break;
    }
    case 'ruin': {
      for (const [dx, dy] of [[.4, .5], [1.3, 1.2]]) { const p = proj(x + dx, y + dy); poly([[p[0] - 16, p[1]], [p[0], p[1] - 24], [p[0] + 16, p[1]]], k(own)); poly([[p[0], p[1] - 24], [p[0] + 16, p[1]], [p[0] + 4, p[1]]], shade(teamCol(own).main, .7)); }
      function k(o) { return shade(teamCol(o).main, .95); }
      flag(f.r[0] - 8, f.r[1] - 4, 26, own, T); break;
    }
  }
  if (!ghost && e.hp < e.maxHp && e.built >= 1 && e.hp < e.maxHp * .5) { const c = proj(x + s / 2, y + s / 2); for (let k = 0; k < 3; k++) { const t2 = (T * .8 + k / 3) % 1; ctx.globalAlpha = (1 - t2) * .5; ell(c[0] + Math.sin(k * 3 + T) * 6, c[1] - 30 - t2 * 40, 8 + t2 * 8, 6 + t2 * 6, '#555'); } ctx.globalAlpha = 1; }
  ctx.restore();
}

/* ---------- units ---------- */
function person(px, py, o) {
  // a little Greek figure: o = { tunic, skin, walk, face, lunge, scale, helmet, cape, hair }
  const s = o.scale || 1, w = o.walk || 0, f = o.face || 1;
  ctx.save(); ctx.translate(px, py); ctx.scale(f * s, s);
  ctx.strokeStyle = o.legs || '#6b4a32'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-1.5, -9); ctx.lineTo(-2 - w * 3, 0); ctx.moveTo(1.5, -9); ctx.lineTo(2 + w * 3, 0); ctx.stroke();
  if (o.cape) poly([[-3, -21], [-8 - Math.abs(w) * 2, -6], [-1, -8]], o.cape);
  poly([[-5, -20], [5, -20], [6, -8], [-6, -8]], o.tunic); ctx.fillStyle = shade(o.tunic, .8); ctx.fillRect(-6, -11, 12, 2);
  if (o.sash) { ctx.strokeStyle = o.sash; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(5, -12); ctx.stroke(); }
  ell(0, -25, 4.6, 4.8, o.skin || '#e0b088');
  if (o.hair) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.arc(0, -26, 4.8, Math.PI, TAU); ctx.fill(); }
  if (o.helmet) { ctx.fillStyle = '#c9a03a'; ctx.beginPath(); ctx.arc(0, -26, 5.2, Math.PI * .9, TAU + .1); ctx.fill(); ctx.fillRect(-5, -26, 3, 5); ctx.fillStyle = o.helmet; ctx.beginPath(); ctx.moveTo(-6, -31); ctx.quadraticCurveTo(0, -38, 6, -31); ctx.lineTo(4, -29); ctx.quadraticCurveTo(0, -34, -4, -29); ctx.fill(); }
  ctx.restore();
}
function drawUnit(e, alpha) {
  const [px, py] = proj(e.x, e.y), D = UNITS[e.t], C = teamCol(e.owner), T = G.time;
  const walk = e.moving || (e.path && e.path.length) ? Math.sin(e.anim * 10) : 0, f = e.face || 1, lunge = e.swing > 0 ? Math.sin((.25 - e.swing) / .25 * Math.PI) * 4 : 0;
  ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
  const big = D.myth ? 2.4 : D.hero ? 1.25 : e.t === 'cavalry' || e.t === 'ram' ? 1.4 : 1;
  ell(px, py, 9 * big, 4 * big, 'rgba(0,0,0,.22)');
  if (D.hero && e.owner === 1) { ctx.globalAlpha = (alpha == null ? 1 : alpha) * (.35 + Math.sin(T * 3) * .15); ell(px, py, 13, 6, '#ffe066'); ctx.globalAlpha = alpha == null ? 1 : alpha; }
  const X = px + f * lunge + (e.dance ? Math.sin(T * 12) * 3 : 0);
  switch (e.t) {
    case 'villager': {
      person(X, py, { tunic: e.carry && e.carry.amt > 0 ? '#c9b48a' : '#d8c8a0', sash: C.main, walk, face: f, hair: '#3a2a1a' });
      const wk = e.working && !e.moving ? Math.sin(T * 9) : 0;
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(10, -22 + wk * 6); ctx.stroke();
      if (e.working === 'wood') { ctx.fillStyle = '#999'; ctx.fillRect(8, -25 + wk * 6, 4, 4); } else if (e.working === 'gold') { ctx.fillStyle = '#888'; ctx.fillRect(7, -24 + wk * 6, 6, 2); } else if (e.working === 'farm' || e.working === 'food') { ctx.strokeStyle = '#aaa'; ctx.beginPath(); ctx.arc(10, -20 + wk * 6, 3, 0, Math.PI); ctx.stroke(); }
      if (e.carry && e.carry.amt > 1) { const col = { food: '#c33', wood: '#8a5a2e', gold: '#ffd447' }[e.carry.type]; ell(-6, -18, 4, 4, col); }
      ctx.restore(); break;
    }
    case 'hoplite': case 'spartos': {
      const sp = e.t === 'spartos';
      person(X, py, { tunic: sp ? '#9a9486' : C.dark, walk, face: f, helmet: sp ? '#666' : C.main, skin: sp ? '#cfc8b8' : '#e0b088', legs: sp ? '#9a9486' : '#6b4a32' });
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1);
      ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(10 + lunge, -30); ctx.stroke(); ctx.fillStyle = '#ccc'; poly([[10 + lunge, -30], [12 + lunge, -35], [8 + lunge, -31]], '#d8d8d8');
      ell(5, -15, 6.5, 7.5, sp ? '#77705f' : C.main); ell(5, -15, 3, 3.4, sp ? '#9a9486' : C.light); ctx.restore(); break;
    }
    case 'archer': {
      person(X, py, { tunic: '#e7dcc0', sash: C.main, walk, face: f, hair: '#3a2a1a' });
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(6, -18, 8, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#eee'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(6 + Math.cos(-1.2) * 8, -18 + Math.sin(-1.2) * 8); ctx.lineTo(6 + Math.cos(1.2) * 8, -18 + Math.sin(1.2) * 8); ctx.stroke(); ctx.fillStyle = C.main; ctx.fillRect(-6, -22, 3, 10); ctx.restore(); break;
    }
    case 'cavalry': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); const g = Math.sin(e.anim * 12) * (walk ? 1 : 0);
      ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.6; for (const [lx, ph] of [[-9, 0], [-5, 1.5], [6, 3], [10, 4.5]]) { ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx + Math.sin(e.anim * 12 + ph) * 3 * (walk ? 1 : 0), 0); ctx.stroke(); }
      ell(0, -13 + g * .5, 13, 6, '#7a5232'); ell(12, -20 + g * .5, 4, 7, '#7a5232'); ell(15, -24 + g * .5, 5, 3, '#6a4428'); poly([[-12, -15], [-19, -8], [-14, -13]], '#3a2a1a');
      ctx.restore();
      person(X - f * 1, py - 12, { tunic: C.dark, walk: 0, face: f, helmet: C.main, scale: .9 });
      ctx.save(); ctx.translate(X, py - 12); ctx.scale(f, 1); ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(16 + lunge, -26); ctx.stroke(); ctx.restore(); break;
    }
    case 'ram': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1);
      for (const wx of [-10, 10]) ell(wx, -4, 5, 5, '#3a2a1a');
      poly([[-16, -8], [16, -8], [12, -26], [-12, -26]], '#8a6038'); poly([[-14, -24], [14, -24], [0, -34]], '#6b4a2e');
      ctx.fillStyle = '#5a3b22'; ctx.fillRect(-4 + lunge * 2, -16, 26, 6); ell(22 + lunge * 2, -13, 4, 4, '#8a8a8a'); ctx.fillStyle = C.main; ctx.fillRect(-12, -26, 6, 4); ctx.restore(); break;
    }
    case 'perseus': case 'theseus': case 'jason': case 'heracles': {
      const her = e.t === 'heracles';
      person(X, py, { tunic: her ? '#c9a46a' : '#f2ead0', cape: her ? '#b98a3a' : C.main, walk, face: f, helmet: her ? null : '#ffd447', hair: her ? '#3a2410' : null, scale: 1.25 });
      ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.25, 1.25);
      if (her) { ctx.fillStyle = '#d9a63a'; ctx.beginPath(); ctx.arc(0, -27, 5.5, Math.PI * .85, TAU + .15); ctx.fill(); ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(13 + lunge, -26); ctx.stroke(); }
      else { ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(13 + lunge, -22); ctx.stroke(); ell(-4, -15, 6, 7, e.mirror ? '#f0f4ff' : '#c9a03a'); if (e.mirror) ell(-5, -17, 2, 3, '#ffffff'); }
      if (e.t === 'perseus') { ctx.fillStyle = '#fff'; poly([[-2, -2], [-7, -6], [-3, -4]], '#fff'); poly([[2, -2], [-3, -6], [1, -4]], '#fff'); }
      if (e.fleece) { ctx.globalAlpha = .9; poly([[-8, -24], [-14, -10], [-4, -8], [-2, -20]], '#f5c518'); ctx.globalAlpha = 1; }
      ctx.restore(); break;
    }
    case 'medea': person(X, py, { tunic: '#6b3aa8', cape: '#3d1f6b', walk, face: f, hair: '#1a1020', scale: 1.15 }); ctx.globalAlpha = .5 + Math.sin(T * 4) * .3; ell(X + f * 8, py - 22, 3, 3, '#d9a8ff'); break;
    case 'ariadne': person(X, py, { tunic: '#f6f0e6', cape: '#c6403a', walk, face: f, hair: '#5a2a10', scale: 1.1 }); ell(X + f * 6, py - 14, 3, 3, '#d02a2a'); break;
    case 'medusa': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1);
      ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-12, -8 + Math.sin(T * 3) * 3, 0, -6); ctx.quadraticCurveTo(8, -4, 4, -24); ctx.stroke();
      ctx.strokeStyle = '#6b9a4a'; ctx.lineWidth = 4; ctx.stroke();
      poly([[-6, -46], [8, -46], [8, -24], [-4, -24]], '#3d6a2e'); ell(2, -54, 8, 8, '#a9c28a');
      for (let k = 0; k < 7; k++) { const a = -Math.PI + k * .5, sw = Math.sin(T * 6 + k) * 3; ctx.strokeStyle = k % 2 ? '#3d7a2a' : '#5aa040'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(2 + Math.cos(a) * 6, -56 + Math.sin(a) * 6); ctx.quadraticCurveTo(2 + Math.cos(a) * 14 + sw, -58 + Math.sin(a) * 14, 2 + Math.cos(a) * 16, -60 + Math.sin(a) * 16 + sw); ctx.stroke(); }
      ell(5, -55, 2, 1.5, '#ff3'); ell(0, -55, 2, 1.5, '#ff3'); ctx.restore(); break;
    }
    case 'minotaur': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.9, 1.9);
      ctx.strokeStyle = '#4a2a18'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(-4 - walk * 3, 0); ctx.moveTo(3, -10); ctx.lineTo(4 + walk * 3, 0); ctx.stroke();
      poly([[-7, -26], [7, -26], [8, -10], [-8, -10]], '#6b3d22'); ctx.fillStyle = '#8a1f1f'; ctx.fillRect(-8, -13, 16, 4);
      ctx.strokeStyle = '#6b3d22'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(6, -24); ctx.lineTo(12 + lunge, -16); ctx.stroke();
      ell(2, -31, 6.5, 6, '#5a3018'); ell(7, -29, 3.5, 3, '#8a6048');
      ctx.strokeStyle = '#efe6cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -35); ctx.quadraticCurveTo(-9, -38, -8, -44); ctx.moveTo(5, -35); ctx.quadraticCurveTo(10, -38, 9, -44); ctx.stroke();
      ell(4, -32, 1.3, 1.3, '#ff4a2a'); ctx.restore(); break;
    }
    case 'dragon': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1);
      for (let k = 0; k < 7; k++) { const a = T * 1.2 + k * .8; ell(-34 + k * 9, -8 - Math.sin(a) * 4, 13 - k * .4, 10 - k * .3, k % 2 ? '#2f6b3a' : '#3d8a4a'); }
      ctx.strokeStyle = '#2f6b3a'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(26, -12); ctx.quadraticCurveTo(36, -34, 30, -50); ctx.stroke();
      ell(34, -56, 14, 10, '#3d8a4a'); poly([[40, -54], [56, -50], [40, -48]], '#2f6b3a'); ell(36, -60, 3, 2.5, G.flags.drowsy ? '#2f6b3a' : '#ff3'); for (let k = 0; k < 4; k++) poly([[22 + k * 5, -60 + k * 2], [26 + k * 5, -74 + k * 3], [30 + k * 5, -58 + k * 2]], '#a8d05a');
      if (G.flags.drowsy) { ctx.globalAlpha = .7; ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('z', 46, -70 - (T * 10) % 14); ctx.fillText('Z', 52, -82 - (T * 10) % 14); } ctx.restore(); break;
    }
    case 'lion': case 'boar': {
      const lion = e.t === 'lion', col = lion ? '#d9a63a' : '#4a3426';
      ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.6, 1.6);
      ctx.strokeStyle = shade(col, .7); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; for (const [lx, ph] of [[-9, 0], [-5, 2], [6, 1], [10, 3]]) { ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx + Math.sin(e.anim * 10 + ph) * 3 * (walk ? 1 : 0), 0); ctx.stroke(); }
      ell(0, -13, 14, 8, col); if (lion) { ell(12, -17, 9, 9, '#a8641e'); ell(14, -16, 6, 5.5, col); ell(17, -15, 2, 1.5, '#3a2210'); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, -15); ctx.quadraticCurveTo(-20, -24, -18, -28); ctx.stroke(); }
      else { ell(13, -14, 7, 6, shade(col, 1.1)); ell(19, -12, 3, 3, '#8a6a5a'); ctx.strokeStyle = '#efe6cf'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(18, -10); ctx.quadraticCurveTo(22, -12, 21, -17); ctx.stroke(); for (let k = 0; k < 5; k++) poly([[-10 + k * 4, -20], [-8 + k * 4, -25], [-6 + k * 4, -20]], '#2a1a10'); }
      ell(lion ? 15 : 14, lion ? -19 : -17, 1.3, 1.3, '#111'); ctx.restore(); break;
    }
    case 'hydra': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ell(0, -10, 24, 13, '#3a6a3a');
      const heads = clamp(Math.ceil(e.hp / e.maxHp * 7) + 2, 3, 9);
      for (let k = 0; k < heads; k++) { const a = -2.6 + k * (2.4 / (heads - 1)), sw = Math.sin(T * 2 + k * 1.3) * 5, hx = Math.cos(a) * 34 + sw, hy = -20 + Math.sin(a) * 34; ctx.strokeStyle = '#3f7a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(hx * .4, hy * .3 - 10, hx, hy); ctx.stroke(); ell(hx, hy, 6, 4.5, '#4f8f45'); ell(hx + 3, hy - 1, 1.3, 1.3, '#ff3'); }
      ctx.restore(); break;
    }
    case 'cyclops': {
      person(X, py, { tunic: '#7a6a52', walk, face: f, skin: '#c99a7a', scale: 2.1, hair: '#3a2a1a' });
      ctx.save(); ctx.translate(X, py); ctx.scale(f * 2.1, 2.1); ell(1.5, -26, 2.2, 2.2, '#fff'); ell(2, -26, 1.1, 1.1, '#222'); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(12 + lunge, -28); ctx.stroke(); ctx.restore(); break;
    }
    case 'trojanhorse': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f * 2.2, 2.2);
      for (const wx of [-10, 10]) { ell(wx, -3, 3.5, 3.5, '#3a2a1a'); ell(wx, -3, 1.4, 1.4, '#8a6a4a'); }
      ctx.fillStyle = '#7a5530'; ctx.fillRect(-14, -9, 28, 4);
      for (const [lx] of [[-9], [-4], [5], [10]]) { ctx.fillStyle = '#a37b4b'; ctx.fillRect(lx - 1.5, -22, 3, 14); }
      ell(0, -26, 15, 7, '#b8895a'); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = .6; for (let k = -12; k < 14; k += 4) { ctx.beginPath(); ctx.moveTo(k, -32); ctx.lineTo(k, -20); ctx.stroke(); }
      ctx.fillStyle = '#b8895a'; poly([[9, -28], [15, -44], [21, -46], [24, -42], [17, -38], [14, -26]], '#b8895a'); ell(21, -44, 5, 3.4, '#a37b4b'); ell(22, -45, 1, 1, '#2a1a10');
      ctx.fillStyle = '#6b4a2e'; for (let k = 0; k < 5; k++) ctx.fillRect(12 + k * 1.6, -46 + k * 3, 3, 2);
      ctx.restore(); break;
    }
    case 'pegasus': {
      ctx.save(); ctx.translate(X, py - 14 - Math.sin(T * 3) * 4); ctx.scale(f * 1.3, 1.3); const fl = Math.sin(T * 10);
      ell(0, 4 + 14 / 1.3, 9, 3, 'rgba(0,0,0,.15)');
      ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 2.4; for (const lx of [-8, -4, 5, 9]) { ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx + 3, 0); ctx.stroke(); }
      ell(0, -11, 12, 5.5, '#fafaff'); ell(11, -18, 3.5, 6, '#fafaff'); ell(14, -22, 4.5, 2.8, '#f0f0f8'); poly([[-11, -12], [-18, -6], [-13, -10]], '#dcdcf0');
      poly([[-2, -14], [-14, -30 - fl * 8], [4, -16]], '#ffffff'); poly([[0, -14], [-8, -34 - fl * 10], [8, -16]], '#eef2ff');
      ctx.restore(); break;
    }
    default: person(X, py, { tunic: C.main, walk, face: f });
  }
  ctx.restore();
}
function drawStatue(f) { ctx.save(); ctx.filter = 'grayscale(1) brightness(1.15)'; drawUnit({ x: f.x, y: f.y, t: f.unit, owner: f.owner, face: f.face, anim: 0, hp: 1, maxHp: 1 }, 1); ctx.restore(); const [px, py] = proj(f.x, f.y); ell(px, py + 1, 10, 4, '#9a968c'); }
function drawCorpse(f) {
  const [px, py] = proj(f.x, f.y), a = 1 - f.t / f.life; ctx.globalAlpha = a * .8;
  if (UNITS[f.unit].myth) { ell(px, py, 22, 8, '#5a6a3a'); } else { ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 2 * f.face * .9); person(0, 6, { tunic: teamCol(f.owner).dark, skin: '#d0a080' }); ctx.restore(); }
  ctx.globalAlpha = 1;
}

/* ---------- frame ---------- */
let HOVER = null;
function drawWorld() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b0f0a'; ctx.fillRect(0, 0, VW, VH);
  if (!G) return;
  const n = G.n, z = CAM.z, T = G.time;
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (VW / 2 - CAM.x * z), DPR * (VH / 2 - CAM.y * z));
  // visible world rectangle (in projected pixels)
  const L = CAM.x - VW / 2 / z - TW, R = CAM.x + VW / 2 / z + TW, Tp = CAM.y - VH / 2 / z - TH * 3, B = CAM.y + VH / 2 / z + TH * 4;
  const vis = (x, y) => { const p = proj(x, y); return p[0] > L && p[0] < R && p[1] > Tp && p[1] < B; };
  // terrain
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const p = proj(x, y); if (p[0] < L || p[0] > R || p[1] < Tp || p[1] > B) continue;
    const i = y * n + x; if (!G.exp[i]) continue;
    const t = G.ter[i]; drawTerrainTile(x, y, p, n);
    if (t === TER.water && G.vis[i]) { const k = Math.sin(T * 1.5 + x * .7 + y * 1.3); if (k > .6) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0] - 8, p[1] + 16); ctx.lineTo(p[0] + 6, p[1] + 16 - 3); ctx.stroke(); } }
    if (t === TER.maze) { // labyrinth walls are raised stone
      const f = foot(x, y, 1), h = 22; poly([f.l, f.b, [f.b[0], f.b[1] - h], [f.l[0], f.l[1] - h]], '#7d7466'); poly([f.b, f.r, [f.r[0], f.r[1] - h], [f.b[0], f.b[1] - h]], '#6a6255'); poly([[f.t[0], f.t[1] - h], [f.r[0], f.r[1] - h], [f.b[0], f.b[1] - h], [f.l[0], f.l[1] - h]], '#a39a88');
    }
  }
  // Ariadne's thread
  if (G.thread) { ctx.strokeStyle = '#e02a2a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -T * 20; ctx.beginPath(); G.thread.forEach((q, k) => { const p = proj(q.x, q.y); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.setLineDash([]); }
  // flat things under everything: farms, rubble, corpses, selection rings
  for (const e of G.ents) if (e.kind === 'bld' && BUILDINGS[e.t].farm && G.exp[e.y * n + e.x] && vis(e.x + 1, e.y + 1)) drawBld(e);
  for (const f of G.fx) if ((f.k === 'corpse' || f.k === 'rubble') && G.exp[Math.floor(f.y) * n + Math.floor(f.x)]) { if (f.k === 'corpse') drawCorpse(f); else { const ff = foot(f.x, f.y, f.size); ctx.globalAlpha = 1 - f.t / f.life; poly([ff.t, ff.r, ff.b, ff.l], '#7a7466'); for (let k = 0; k < 8; k++) { const p = proj(f.x + (k * .37 % 1) * f.size, f.y + (k * .61 % 1) * f.size); ell(p[0], p[1] - 3, 5, 3, '#9a9282'); } ctx.globalAlpha = 1; } }
  for (const e of G.sel) { if (e.dead) continue; if (e.kind === 'unit') { const [px, py] = proj(e.x, e.y), big = UNITS[e.t].myth ? 2.4 : UNITS[e.t].hero ? 1.3 : 1; ctx.strokeStyle = e.owner === 1 ? '#7dff7d' : e.owner === 0 ? '#ffe066' : '#ff5a5a'; ctx.lineWidth = 1.6 / z; ctx.beginPath(); ctx.ellipse(px, py, 11 * big, 5.5 * big, 0, 0, TAU); ctx.stroke(); } else if (e.kind === 'bld') { const f = foot(e.x, e.y, e.size); poly([f.t, f.r, f.b, f.l], null, e.owner === 1 ? '#7dff7d' : '#ff5a5a'); } }
  // sort and draw upright things
  const list = [];
  for (const e of G.ents) {
    if (e.kind === 'bld' && BUILDINGS[e.t].farm) continue;
    const c = center(e), i = Math.floor(c.y) * n + Math.floor(c.x);
    if (!vis(c.x, c.y)) continue;
    if (e.kind === 'unit') { if (!G.vis[i] && e.owner !== 1) continue; list.push([e.x + e.y, e]); }
    else if (e.kind === 'bld') { let seen = false; for (let j = 0; j < e.size && !seen; j++) for (let k = 0; k < e.size; k++) if (G.exp[(e.y + j) * n + e.x + k]) { seen = true; break; } if (seen) list.push([e.x + e.y + e.size * 2 - 1.2, e]); }
    else if (G.exp[i]) list.push([e.x + e.y + 1, e]);
  }
  for (const f of G.fx) if (f.k === 'statue' && G.exp[Math.floor(f.y) * n + Math.floor(f.x)] && vis(f.x, f.y)) list.push([f.x + f.y, f]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, e] of list) { if (e.k === 'statue') drawStatue(e); else if (e.kind === 'unit') drawUnit(e); else if (e.kind === 'bld') drawBld(e); else drawRes(e); }
  // health bars
  for (const e of G.ents) {
    if (e.kind === 'res') continue; const c = center(e), i = Math.floor(c.y) * n + Math.floor(c.x); if (!G.vis[i] && e.owner !== 1) continue; if (!vis(c.x, c.y)) continue;
    const show = G.sel.includes(e) || (e.hp < e.maxHp && (e.kind === 'unit' || e.built >= 1)) || (e.kind === 'bld' && e.built < 1); if (!show || e.maxHp > 9000) continue;
    const [px, py] = proj(c.x, c.y), D = D_(e), hgt = e.kind === 'bld' ? 30 + e.size * 18 : (D.myth ? 70 : D.hero ? 42 : 34), w = e.kind === 'bld' ? 40 : D.myth ? 46 : 22;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(px - w / 2 - 1, py - hgt - 1, w + 2, 5);
    const fr = e.kind === 'bld' && e.built < 1 ? e.built : e.hp / e.maxHp; ctx.fillStyle = e.kind === 'bld' && e.built < 1 ? '#ffd447' : e.owner === 1 ? '#5adf5a' : e.owner === 0 ? '#ffe066' : '#ef4a3a'; ctx.fillRect(px - w / 2, py - hgt, w * fr, 3);
  }
  // missiles
  for (const m of G.missiles) {
    if (!G.vis[Math.floor(m.y) * n + Math.floor(m.x)]) continue; const [px, py] = proj(m.x, m.y), arc = Math.sin(clamp(m.t * 3, 0, Math.PI)) * 14 + m.z * 12;
    if (m.kind === 'arrow') { const [tx, ty] = proj(m.tx, m.ty), a = Math.atan2(ty - py, tx - px); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, py - arc); ctx.lineTo(px - Math.cos(a) * 8, py - arc - Math.sin(a) * 8); ctx.stroke(); }
    else if (m.kind === 'gaze') { ctx.globalAlpha = .7; ell(px, py - 24, 6, 6, '#a8ff6a'); ctx.globalAlpha = 1; }
    else if (m.kind === 'fire') { ell(px, py - 20, 8, 6, '#ff7a2a'); ell(px, py - 20, 4, 3, '#ffe066'); }
    else { ell(px, py - 20, 5, 5, '#c58aff'); }
  }
  // effects
  for (const f of G.fx) {
    if (f.k === 'p') { const [px, py] = proj(f.x, f.y); ctx.globalAlpha = 1 - f.t / f.life; ctx.fillStyle = f.col; ctx.fillRect(px - 1.5, py - f.z * TH - 1.5, 3, 3); ctx.globalAlpha = 1; }
    else if (f.k === 'txt') { const [px, py] = proj(f.x, f.y); ctx.globalAlpha = 1 - f.t / f.life; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = f.col; ctx.fillText(f.text, px, py - 30 - f.z * 12); ctx.globalAlpha = 1; }
    else if (f.k === 'boom') { const [px, py] = proj(f.x, f.y), r = f.t / f.life; ctx.globalAlpha = 1 - r; ell(px, py - 6, 20 + r * 20, 10 + r * 10, f.col); ctx.globalAlpha = 1; }
    else if (f.k === 'bolt') { const [px, py] = proj(f.x, f.y); ctx.globalAlpha = 1 - f.t / f.life; ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 4; ctx.beginPath(); let yy = py - 400, xx = px; ctx.moveTo(xx, yy); while (yy < py) { yy += 30; xx = px + (Math.random() - .5) * 30; ctx.lineTo(xx, Math.min(yy, py)); } ctx.stroke(); ell(px, py, 60, 28, 'rgba(255,250,200,.4)'); ctx.globalAlpha = 1; }
    else if (f.k === 'say') { const u = G.byId.get(f.follow); if (u) { f.x = u.x; f.y = u.y; } const [px, py] = proj(f.x, f.y), a = Math.min(1, (f.life - f.t) * 2); ctx.globalAlpha = a; ctx.font = '600 15px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center'; const w1 = ctx.measureText(f.gr).width; ctx.font = 'italic 11px Georgia, serif'; const w2 = ctx.measureText(f.tr + ' · ' + f.en).width, w = Math.max(w1, w2) + 14, by = py - 62; ctx.fillStyle = 'rgba(250,244,226,.95)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - w / 2, by - 30, w, 34, 8) : ctx.rect(px - w / 2, by - 30, w, 34); ctx.fill(); poly([[px - 5, by + 4], [px + 5, by + 4], [px, by + 11]], 'rgba(250,244,226,.95)'); ctx.fillStyle = '#1d2a22'; ctx.font = '600 15px "Cormorant Garamond", Georgia, serif'; ctx.fillText(f.gr, px, by - 14); ctx.fillStyle = '#5d6b62'; ctx.font = 'italic 11px Georgia, serif'; ctx.fillText(f.tr + ' · ' + f.en, px, by - 1); ctx.globalAlpha = 1; }
    else if (f.k === 'wave') { const [px, py] = proj(f.x, f.y), r = f.t / f.life; ctx.globalAlpha = 1 - r; ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(px, py, 30 + r * 110, 15 + r * 55, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  if (G.aegisT > 0) for (const e of G.ents) if (e.kind === 'unit' && e.owner === 1 && vis(e.x, e.y)) { const [px, py] = proj(e.x, e.y); ctx.globalAlpha = .25; ell(px, py - 12, 12, 16, '#9fd8ff'); ctx.globalAlpha = 1; }
  // fog
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x; if (G.vis[i]) continue; const p = proj(x, y); if (p[0] < L || p[0] > R || p[1] < Tp || p[1] > B) continue;
    ctx.fillStyle = G.exp[i] ? 'rgba(8,12,8,.45)' : '#0b0f0a';
    ctx.beginPath(); ctx.moveTo(p[0], p[1] - 1); ctx.lineTo(p[0] + TW / 2 + 1, p[1] + TH / 2); ctx.lineTo(p[0], p[1] + TH + 1); ctx.lineTo(p[0] - TW / 2 - 1, p[1] + TH / 2); ctx.closePath(); ctx.fill();
  }
  // placement ghost
  if (UI.placing && UI.mouse) {
    const w = toWorld(UI.mouse.x, UI.mouse.y), D = BUILDINGS[UI.placing], bx = Math.floor(w.x - D.size / 2 + .5), by = Math.floor(w.y - D.size / 2 + .5);
    const ok = canPlace(UI.placing, bx, by, 1);
    drawBld({ t: UI.placing, x: bx, y: by, size: D.size, owner: 1, built: 1, hp: 1, maxHp: 1 }, true);
    const f = foot(bx, by, D.size); ctx.lineWidth = 2 / z; poly([f.t, f.r, f.b, f.l], ok ? 'rgba(80,255,80,.18)' : 'rgba(255,60,60,.3)', ok ? '#5f5' : '#f55');
    UI.ghostAt = { x: bx, y: by, ok };
  }
  // target marker for powers
  if (UI.power && UI.mouse) { const w = toWorld(UI.mouse.x, UI.mouse.y), [px, py] = proj(w.x, w.y), r = POWERS[UI.power].radius; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.ellipse(px, py, r * TW / 1.4, r * TH / 1.4, 0, 0, TAU); ctx.stroke(); }
  // move markers
  for (const mk of UI.marks) { const [px, py] = proj(mk.x, mk.y), r = 1 - (performance.now() - mk.t) / 600; if (r <= 0) continue; ctx.strokeStyle = mk.col; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.ellipse(px, py, 12 * r + 4, 6 * r + 2, 0, 0, TAU); ctx.stroke(); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // drag box
  if (UI.box) { const b = UI.box; ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(125,255,125,.08)'; ctx.fillRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); ctx.strokeRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); }
}

/* ---------- minimap ---------- */
const mm = document.getElementById('minimap'), mctx = mm.getContext('2d');
let MM_BASE = null;
const MM = { size: 180 };
function mmProj(x, y) { const n = G.n, s = MM.size; return [(x - y) / n * s / 2 + s / 2, (x + y) / n * s / 4 + 2]; }
function drawMinimap() {
  if (!G) return; const n = G.n, S = MM.size; mm.width = S * DPR; mm.height = S / 2 * DPR + 6 * DPR; mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  mctx.clearRect(0, 0, S, S); const cols = ['#7fae4f', '#b59a68', '#e4d39a', '#2f78b7', '#5aa3c9', '#6f8f55', '#c9c2b0', '#6b9a46', '#6a6255'];
  const k = S / n / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x; if (!G.exp[i]) continue; const [px, py] = mmProj(x, y);
    let c = cols[G.ter[i]]; const o = G.occ[i]; if (o) { const e = G.byId.get(o); if (e && e.kind === 'res') c = e.t === 'tree' ? '#2f5a2e' : e.t === 'gold' ? '#ffd447' : '#c2244b'; }
    mctx.fillStyle = c; mctx.fillRect(px - k, py, k * 2 + .5, k + .5);
    if (!G.vis[i]) { mctx.fillStyle = 'rgba(0,0,0,.4)'; mctx.fillRect(px - k, py, k * 2 + .5, k + .5); }
  }
  for (const e of G.ents) {
    if (e.kind === 'res') continue; const c = center(e), i = Math.floor(c.y) * n + Math.floor(c.x);
    if (e.owner !== 1 && !(e.kind === 'bld' ? G.exp[i] : G.vis[i])) continue;
    const [px, py] = mmProj(c.x, c.y); mctx.fillStyle = e.owner === 0 ? '#ffe066' : e.owner === 3 ? '#b05aff' : teamCol(e.owner).main;
    const s = e.kind === 'bld' ? 2 + e.size : UNITS[e.t].myth || UNITS[e.t].hero ? 4 : 2.4; mctx.fillRect(px - s / 2, py - s / 2, s, s);
  }
  // camera frame
  const a = toWorld(0, 0), b = toWorld(VW, 0), c = toWorld(VW, VH), d = toWorld(0, VH);
  mctx.strokeStyle = '#fff'; mctx.lineWidth = 1; mctx.beginPath(); [a, b, c, d].forEach((p, i) => { const q = mmProj(p.x, p.y); i ? mctx.lineTo(q[0], q[1]) : mctx.moveTo(q[0], q[1]); }); mctx.closePath(); mctx.stroke();
  if (G.alertAt && G.time - G.alertT < 6) { const [px, py] = mmProj(G.alertAt.x, G.alertAt.y); mctx.strokeStyle = '#ff3'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(px, py, 4 + (G.time * 8) % 8, 0, TAU); mctx.stroke(); }
}
function minimapToWorld(mx, my) { const n = G.n, S = MM.size; const a = (mx - S / 2) / (S / 2) * n, b = (my - 2) / (S / 4) * n; return { x: (a + b) / 2, y: (b - a) / 2 }; }
