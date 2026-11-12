'use strict';
/* Heroes of Hellas: how the Norse and Irish buildings, units and creatures look.
   drawBld and drawUnit in render.js call civBld and civUnit first; if they return true, the Greek drawing is skipped. */

function roundHouse(cx, cy, r, h, rh, wall, thatch) {
  const ry = r * .5;
  // wall: the front half of a cylinder
  ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI); ctx.lineTo(cx - r, cy - h); ctx.ellipse(cx, cy - h, r, ry, 0, Math.PI, 0, true); ctx.closePath();
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, shade(wall, .95)); g.addColorStop(1, shade(wall, .65)); ctx.fillStyle = g; ctx.fill();
  // door
  ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.ellipse(cx - r * .25, cy + ry * .55 - h * .32, r * .13, h * .34, 0, 0, TAU); ctx.fill();
  // thatch: a cone over an eave
  const R = r * 1.18, RY = R * .5, top = cy - h - rh;
  ctx.beginPath(); ctx.moveTo(cx - R, cy - h + 2); ctx.ellipse(cx, cy - h + 2, R, RY, 0, Math.PI, 0, true); ctx.lineTo(cx, top); ctx.closePath(); ctx.fillStyle = thatch; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + R, cy - h + 2); ctx.ellipse(cx, cy - h + 2, R, RY, 0, 0, Math.PI * .5); ctx.closePath(); ctx.fillStyle = shade(thatch, .78); ctx.fill();
  ctx.strokeStyle = shade(thatch, .6); ctx.lineWidth = 1; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(cx, top + 2); ctx.lineTo(cx + k * R / 3.4, cy - h + 2 + RY * (1 - Math.abs(k) / 3.6) * .9); ctx.stroke(); }
  return top;
}
function dragonHorns(px, py, s) { ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - 3 * s, py + 2 * s); ctx.quadraticCurveTo(px - 10 * s, py - 8 * s, px - 4 * s, py - 12 * s); ctx.moveTo(px + 3 * s, py + 2 * s); ctx.quadraticCurveTo(px + 10 * s, py - 8 * s, px + 4 * s, py - 12 * s); ctx.stroke(); }
function roundShields(f, col, k0, n, y0) { for (let k = 0; k < n; k++) { const t = k0 + k * (1 - 2 * k0) / Math.max(1, n - 1), p = [lerp(f.l[0], f.b[0], t), lerp(f.l[1], f.b[1], t)]; ell(p[0], p[1] - y0, 5, 5, col); ell(p[0], p[1] - y0, 1.6, 1.6, '#c9c9c9'); } }

function civBld(e, ghost) {
  const civ = civOf(e.owner); if (civ === 'greek' || !G) return false;
  const s = e.size, x = e.x, y = e.y, own = e.owner, T = G.time, C = teamCol(own), f = foot(x, y, s), c = proj(x + s / 2, y + s / 2);
  const norse = civ === 'norse' || civ === 'jotun';
  switch (e.t) {
    case 'agora':
      if (norse) {
        box(x, y, s, 5, '#8a7a5a', '#9c8c68');
        box(x, y, s, 24, '#6b4a2e', null, { inset: .3 }); hipRoof(x, y, s, 24, 32, '#6f8a3a', .2);
        dragonHorns(c[0], c[1] - 58, 1.2); roundShields(foot(x + .3, y + .3, s - .6), C.main, .15, 4, 12);
        ctx.globalAlpha = .45 + Math.sin(T * 3) * .1; ell(c[0] + 10, c[1] - 62 - (T * 8) % 10, 4, 3, '#ccc'); ctx.globalAlpha = ghost ? .6 : 1;
        flag(f.r[0] - 10, f.r[1] - 26, 22, own, T);
      } else {
        // a ringfort: an earth bank, a palisade, and the chief's roundhouse inside
        ell(c[0], c[1], 96, 48, '#7a8a4a'); ell(c[0], c[1], 84, 42, '#8f7a50'); ell(c[0], c[1], 76, 38, '#9cae5c');
        ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 3; for (let a = Math.PI * .05; a < Math.PI * .95; a += .14) { const px = c[0] + Math.cos(a) * 82, py = c[1] + Math.sin(a) * 41; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 12); ctx.stroke(); }
        roundHouse(c[0], c[1] - 4, 34, 20, 34, '#c9b48a', '#b08a3e');
        flag(c[0] + 48, c[1] - 10, 26, own, T);
      }
      return true;
    case 'house':
      if (norse) { box(x, y, s, 14, '#7a5532', null, { inset: .2 }); hipRoof(x, y, s, 14, 18, '#7d9a45', .1); const ff = foot(x + .2, y + .2, s - .4); ctx.fillStyle = '#3a2614'; const d = [lerp(ff.l[0], ff.b[0], .5), lerp(ff.l[1], ff.b[1], .5)]; ctx.fillRect(d[0] - 3, d[1] - 11, 6, 10); ctx.fillStyle = C.main; ctx.fillRect(d[0] - 1, d[1] - 15, 3, 3); }
      else { roundHouse(c[0], c[1], 22, 14, 22, '#d1bf96', '#b8913f'); ell(c[0] + 18, c[1] - 16, 2.5, 2.5, C.main); }
      return true;
    case 'storehouse':
      if (norse) { box(x, y, s, 16, '#5e4128', null, { inset: .25 }); hipRoof(x, y, s, 16, 12, '#4f4436', .15); }
      else roundHouse(c[0], c[1], 20, 12, 18, '#b9a57a', '#a07a36');
      for (const k of [.25, .55]) { const p = [lerp(f.l[0], f.b[0], k), lerp(f.l[1], f.b[1], k) + 2]; ell(p[0], p[1] - 6, 5, 6, norse ? '#8a6038' : '#a88a5a'); ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0] - 5, p[1] - 6); ctx.lineTo(p[0] + 5, p[1] - 6); ctx.stroke(); }
      flag(f.r[0] - 6, f.r[1] - 18, 14, own, T); return true;
    case 'barracks':
      if (norse) { box(x, y, s, 22, '#5a3b22', null, { inset: .2 }); hipRoof(x, y, s, 22, 22, '#4a4038', .1); dragonHorns(c[0], c[1] - 50, 1); roundShields(foot(x + .2, y + .2, s - .4), C.main, .15, 4, 11); }
      else { roundHouse(c[0], c[1], 36, 22, 30, '#c2ab80', '#9c7a38'); for (const dx of [-24, -8, 8, 24]) { ell(c[0] + dx, c[1] + 4 - 12, 5, 6, '#9a2a1e'); ell(c[0] + dx, c[1] + 4 - 12, 1.6, 2, '#e3c26a'); } }
      flag(c[0], c[1] - (norse ? 52 : 66), 18, own, T); return true;
    case 'range':
      box(x, y, s, 3, '#8f7a50', '#a89060', { inset: .1 });
      if (norse) { box(x + 1.6, y, 1.2, 14, '#5e4128', null); hipRoof(x + 1.6, y, 1.2, 14, 12, '#6f8a3a'); }
      else roundHouse(proj(x + 2.2, y + .6)[0], proj(x + 2.2, y + .6)[1], 14, 10, 14, '#c9b48a', '#a8823a');
      for (const k of [.3, .65]) { const p = proj(x + .6 + k, y + 2.2); ell(p[0], p[1] - 9, 7, 9, '#e9dcb8'); ell(p[0], p[1] - 9, 4.5, 6, norse ? '#2a4a8a' : '#2d7a3e'); ell(p[0], p[1] - 9, 2, 3, '#e9dcb8'); }
      flag(f.t[0], f.t[1] - 4, 18, own, T); return true;
    case 'stable':
      if (norse) { box(x, y, s, 18, '#6b4a2e', null, { inset: .2 }); hipRoof(x, y, s, 18, 14, '#7d9a45', .1); }
      else { roundHouse(proj(x + 1, y + 1)[0], proj(x + 1, y + 1)[1], 20, 12, 18, '#c9b48a', '#a8823a'); const p = proj(x + 2.2, y + 2.2); ell(p[0], p[1] - 8, 8, 8, '#5a3b22'); ell(p[0], p[1] - 8, 6, 6, '#b8a080'); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1.5; for (let a = 0; a < TAU; a += TAU / 8) { ctx.beginPath(); ctx.moveTo(p[0], p[1] - 8); ctx.lineTo(p[0] + Math.cos(a) * 6, p[1] - 8 + Math.sin(a) * 6); ctx.stroke(); } }
      ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.l[0], f.l[1] - 6); ctx.lineTo(f.b[0], f.b[1] - 6); ctx.lineTo(f.r[0], f.r[1] - 6); ctx.stroke();
      flag(f.r[0] - 8, f.r[1] - 22, 14, own, T); return true;
    case 'temple':
      if (norse) {
        // a stave-built hof with stacked roofs and dragon-head gables
        box(x, y, s, 6, '#7a6a52', '#8a7a5a');
        box(x, y, s, 22, '#4a2f1a', null, { inset: .35 }); hipRoof(x, y, s, 22, 12, '#2f2a26', .25);
        box(x + .9, y + .9, s - 1.8, 40, '#4a2f1a', null); hipRoof(x + .9, y + .9, s - 1.8, 40, 12, '#2f2a26');
        box(x + 1.2, y + 1.2, s - 2.4, 56, '#4a2f1a', null); hipRoof(x + 1.2, y + 1.2, s - 2.4, 56, 18, '#2f2a26');
        dragonHorns(c[0], c[1] - 46, 1); dragonHorns(c[0], c[1] - 64, .8);
        ctx.globalAlpha = .45 + Math.sin(T * 2) * .15; ell(c[0], c[1] - 84, 5, 5, '#ffe58a'); ctx.globalAlpha = ghost ? .6 : 1;
      } else {
        // a sacred grove: oaks around a ring of standing stones and a fire
        ell(c[0], c[1], 70, 35, '#6f8f4a');
        for (let k = 0; k < 7; k++) { const a = Math.PI * (k / 7) * 2 + .3, px = c[0] + Math.cos(a) * 30, py = c[1] + Math.sin(a) * 15; if (Math.sin(a) < 0) { ctx.fillStyle = '#8a8a80'; ctx.fillRect(px - 3, py - 16, 6, 16); } }
        for (const [dx, dy, r] of [[-48, -6, 20], [46, -4, 22], [-20, -26, 18], [24, -24, 20]]) { ctx.fillStyle = '#5a3b22'; ctx.fillRect(c[0] + dx - 3, c[1] + dy - 26, 6, 26); ell(c[0] + dx, c[1] + dy - 36, r, r * .8, '#3f6a2e'); ell(c[0] + dx - 6, c[1] + dy - 42, r * .6, r * .5, '#5a8a40'); }
        const fl = Math.sin(T * 9) * 2; ell(c[0], c[1] - 2, 7, 3, '#5a3b22'); poly([[c[0] - 5, c[1] - 3], [c[0], c[1] - 18 - fl], [c[0] + 5, c[1] - 3]], '#ff9a2a'); poly([[c[0] - 2, c[1] - 3], [c[0], c[1] - 11 - fl], [c[0] + 2, c[1] - 3]], '#ffe066');
        for (let k = 0; k < 7; k++) { const a = Math.PI * (k / 7) * 2 + .3, px = c[0] + Math.cos(a) * 30, py = c[1] + Math.sin(a) * 15; if (Math.sin(a) >= 0) { ctx.fillStyle = '#9a9a90'; ctx.fillRect(px - 3, py - 18, 6, 18); ctx.fillStyle = '#6a6a62'; ctx.fillRect(px + 1, py - 18, 2, 18); } }
      }
      flag(f.l[0] + 8, f.l[1] - 8, 30, own, T); return true;
    case 'tower':
      box(x, y, s, 50, norse ? '#6b4a2e' : '#7a5a36', null, { inset: .15 });
      if (norse) hipRoof(x, y, s, 50, 14, '#4a4038', .05);
      else { const p = proj(x + .5, y + .5); poly([[p[0] - 18, p[1] - 50], [p[0], p[1] - 72], [p[0] + 18, p[1] - 50]], '#a8823a'); }
      flag(proj(x + .5, y + .5)[0], proj(x + .5, y + .5)[1] - 62, 16, own, T); return true;
    case 'palace': case 'ruin':
      if (civ === 'jotun') { box(x, y, s, 8, '#8a9aa8', '#a8b8c4'); box(x, y, s, 40, '#5a6a78', null, { inset: .3 }); hipRoof(x, y, s, 40, 30, '#c8d8e4', .2); dragonHorns(c[0], c[1] - 76, 1.4); flag(c[0], c[1] - 80, 22, own, T); return true; }
      if (civ === 'fomori') { for (const [dx, dy, r] of [[.5, .6, 26], [1.6, 1.4, 22], [2.4, .5, 18]]) { const p = proj(x + dx, y + dy); poly([[p[0] - r, p[1]], [p[0] - r * .6, p[1] - r * 1.4], [p[0] + r * .5, p[1] - r * 1.5], [p[0] + r, p[1]]], '#5a6050'); poly([[p[0] - r * .6, p[1] - r * 1.4], [p[0] + r * .5, p[1] - r * 1.5], [p[0] + r * .2, p[1] - r * 1.7]], '#6f7860'); } flag(c[0], c[1] - 40, 26, own, T); return true; }
      if (civ === 'irish') { roundHouse(c[0], c[1], 40, 26, 36, '#c2ab80', '#9c7a38'); flag(c[0] + 30, c[1] - 30, 26, own, T); return true; }
      if (civ === 'norse') { box(x, y, s, 26, '#5a3b22', null, { inset: .2 }); hipRoof(x, y, s, 26, 26, '#6f8a3a', .1); dragonHorns(c[0], c[1] - 58, 1.2); flag(c[0], c[1] - 60, 22, own, T); return true; }
      return false;
    case 'forge': { box(x, y, s, 14, '#5e4128', null, { inset: .25 }); hipRoof(x, y, s, 14, 10, '#4a4038', .15); const p = proj(x + .5, y + s - .3); ctx.fillStyle = '#555'; ctx.fillRect(p[0] - 6, p[1] - 8, 12, 6); ctx.globalAlpha = .6 + Math.sin(T * 7) * .3; ell(p[0] + 12, p[1] - 6, 5, 4, '#ff8a2a'); ctx.globalAlpha = 1; for (let k = 0; k < 3; k++) { const t2 = (T * .6 + k / 3) % 1; ctx.globalAlpha = .4 * (1 - t2); ell(c[0] + 4, c[1] - 34 - t2 * 30, 4 + t2 * 6, 3 + t2 * 4, '#bbb'); } ctx.globalAlpha = 1; return true; }
    case 'hoard': { for (let k = 0; k < 14; k++) { const a = k * 2.4, r = (k % 5) * 4; ell(c[0] + Math.cos(a) * r, c[1] - 4 - k * .8 + Math.sin(a) * r * .5, 5, 3, k % 3 ? '#e8c03a' : '#ffd96a'); } ctx.globalAlpha = .3 + Math.sin(T * 3) * .15; ell(c[0], c[1] - 10, 26, 14, '#fff3a0'); ctx.globalAlpha = 1; return true; }
    case 'well': { ell(c[0], c[1], 22, 11, '#8a8a80'); ell(c[0], c[1] - 2, 17, 8.5, '#3a6aa8'); ell(c[0] - 4, c[1] - 4, 6, 2, 'rgba(255,255,255,.5)'); for (let k = 0; k < 3; k++) { const a = T * 2 + k * 2; ctx.globalAlpha = .5; ell(c[0] + Math.cos(a) * 8, c[1] - 14 - (T * 10 + k * 7) % 20, 2, 2, '#bfe0ff'); } ctx.globalAlpha = 1; return true; }
    case 'stone': { const p = proj(x + .5, y + .5); ctx.fillStyle = '#8a8a80'; ctx.fillRect(p[0] - 4, p[1] - 26, 8, 26); ctx.strokeStyle = '#555'; ctx.lineWidth = 1; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(p[0] - 4, p[1] - 6 - k * 4); ctx.lineTo(p[0] - 1, p[1] - 6 - k * 4); ctx.stroke(); } return true; }
  }
  return false;
}

/* ---------- people ---------- */
function nhelm(X, py, f, s) { ctx.save(); ctx.translate(X, py); ctx.scale(f * (s || 1), s || 1); ctx.fillStyle = '#8a8f96'; ctx.beginPath(); ctx.moveTo(-5.2, -25); ctx.quadraticCurveTo(0, -36, 5.2, -25); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#6a6f76'; ctx.fillRect(1, -26, 2, 5); ctx.restore(); }
function beard(X, py, f, col, s) { ctx.save(); ctx.translate(X, py); ctx.scale(f * (s || 1), s || 1); poly([[-2, -23], [5, -22], [2, -16], [-1, -18]], col); ctx.restore(); }
function weapon(X, py, f, kind, lunge, s) {
  ctx.save(); ctx.translate(X, py); ctx.scale(f * (s || 1), s || 1); ctx.lineCap = 'round';
  if (kind === 'axe') { ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(3, -10); ctx.lineTo(9 + lunge, -28); ctx.stroke(); poly([[8 + lunge, -29], [14 + lunge, -31], [13 + lunge, -24], [9 + lunge, -26]], '#cfd3d8'); }
  if (kind === 'spear') { ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(10 + lunge, -32); ctx.stroke(); poly([[10 + lunge, -32], [12 + lunge, -38], [8 + lunge, -33]], '#d8d8d8'); }
  if (kind === 'sword') { ctx.strokeStyle = '#e0e4ea'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(14 + lunge, -24); ctx.stroke(); ctx.strokeStyle = '#c9a03a'; ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(7, -16); ctx.stroke(); }
  if (kind === 'hammer') { ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(10 + lunge, -24); ctx.stroke(); ctx.save(); ctx.translate(10 + lunge, -24); ctx.rotate(-.5); ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(-6, -4, 12, 3); ctx.restore(); }
  if (kind === 'club') { ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(13 + lunge, -30); ctx.stroke(); ell(14 + lunge, -32, 4.5, 4.5, '#6b4a2e'); }
  if (kind === 'sling') { ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1; const a = (G ? G.time : 0) * 14; ctx.beginPath(); ctx.moveTo(4, -18); ctx.lineTo(4 + Math.cos(a) * 8, -22 + Math.sin(a) * 5); ctx.stroke(); ell(4 + Math.cos(a) * 8, -22 + Math.sin(a) * 5, 1.6, 1.6, '#777'); }
  if (kind === 'bow') { ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(6, -18, 8, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#eee'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(6 + Math.cos(-1.2) * 8, -18 + Math.sin(-1.2) * 8); ctx.lineTo(6 + Math.cos(1.2) * 8, -18 + Math.sin(1.2) * 8); ctx.stroke(); }
  if (kind === 'staff') { ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(8, -34); ctx.stroke(); ctx.globalAlpha = .6 + Math.sin((G ? G.time : 0) * 5) * .3; ell(8, -35, 3, 3, '#b8ff9a'); ctx.globalAlpha = 1; }
  ctx.restore();
}
function shieldR(X, py, f, col, rim, s) { ctx.save(); ctx.translate(X, py); ctx.scale(f * (s || 1), s || 1); ell(-4, -15, 6.5, 7.5, col); ell(-4, -15, 2, 2.2, rim || '#cfd3d8'); ctx.restore(); }
function beast(X, py, f, sc, col, o) {
  o = o || {}; const T = G ? G.time : 0, walk = o.walk || 0;
  ctx.save(); ctx.translate(X, py); ctx.scale(f * sc, sc);
  ctx.strokeStyle = shade(col, .7); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; for (const [lx, ph] of [[-9, 0], [-5, 2], [6, 1], [10, 3]]) { ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx + Math.sin((o.anim || 0) * 10 + ph) * 3 * walk, 0); ctx.stroke(); }
  ell(0, -13, 14, 8, col);
  if (o.kind === 'wolf') { poly([[10, -18], [22, -14], [21, -10], [10, -10]], col); poly([[12, -19], [14, -26], [16, -18]], shade(col, .8)); ell(19, -15, 1.3, 1.3, o.eye || '#ffd23a'); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -14); ctx.quadraticCurveTo(-22, -12, -24, -4); ctx.stroke(); if (o.jaw) { poly([[18, -11], [26, -6 + Math.sin(T * 6) * 2], [17, -8]], '#a02020'); } }
  else if (o.kind === 'bull') { ell(13, -14, 7, 6, shade(col, 1.1)); ell(19, -12, 3, 3, '#8a6a5a'); ctx.strokeStyle = '#efe6cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, -18); ctx.quadraticCurveTo(10, -26, 6, -27); ctx.moveTo(15, -18); ctx.quadraticCurveTo(18, -26, 22, -26); ctx.stroke(); ell(15, -15, 1.2, 1.2, '#111'); }
  else if (o.kind === 'dog') { ell(13, -17, 7, 6, shade(col, 1.05)); poly([[17, -16], [24, -13], [17, -11]], col); poly([[9, -21], [11, -28], [14, -21]], shade(col, .8)); ell(15, -18, 1.2, 1.2, '#ffe14a'); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(7, -15, 5, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

function civUnit(e, X, py, walk, f, lunge, C, T) {
  const t = e.t, civ = civOf(e.owner);
  switch (t) {
    case 'villager':
      if (civ === 'greek' || civ === 'jotun' || civ === 'fomori') return false;
      person(X, py, { tunic: civ === 'norse' ? (e.carry && e.carry.amt > 0 ? '#7f8aa0' : '#8e9ab0') : (e.carry && e.carry.amt > 0 ? '#c9a24a' : '#d8b860'), cape: civ === 'irish' ? C.main : null, sash: civ === 'norse' ? C.main : null, walk, face: f, hair: civ === 'norse' ? '#c8a050' : '#8a3a1a' });
      if (civ === 'norse') beard(X, py, f, '#c8a050');
      { const wk = e.working && !e.moving ? Math.sin(T * 9) : 0; ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(10, -22 + wk * 6); ctx.stroke(); if (e.carry && e.carry.amt > 1) ell(-6, -18, 4, 4, { food: '#c33', wood: '#8a5a2e', gold: '#ffd447' }[e.carry.type]); ctx.restore(); }
      return true;
    case 'huskarl': person(X, py, { tunic: C.dark, walk, face: f, hair: '#a07030', legs: '#4a3a2a' }); nhelm(X, py, f); beard(X, py, f, '#a07030'); weapon(X, py, f, 'axe', lunge); shieldR(X, py, f, C.main); return true;
    case 'berserkr': person(X, py, { tunic: '#d8a888', cape: '#5a3a22', walk, face: f, hair: '#3a2410', legs: '#5a3a22' }); ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ell(0, -27, 5.5, 4, '#5a3a22'); ell(-3, -31, 2, 2, '#5a3a22'); ell(3, -31, 2, 2, '#5a3a22'); ctx.restore(); beard(X, py, f, '#3a2410'); weapon(X, py, f, 'axe', lunge * 1.5); return true;
    case 'bowman': person(X, py, { tunic: '#8e9ab0', sash: C.main, walk, face: f, hair: '#c8a050' }); nhelm(X, py, f); weapon(X, py, f, 'bow', 0); return true;
    case 'raider': case 'chariot': {
      if (t === 'chariot') {
        ctx.save(); ctx.translate(X, py); ctx.scale(f, 1);
        for (const hx of [10, 16]) { ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 2; for (const [lx, ph] of [[-4, 0], [4, 2]]) { ctx.beginPath(); ctx.moveTo(hx + lx * .6, -8); ctx.lineTo(hx + lx * .6 + Math.sin(e.anim * 12 + ph) * 3 * (walk ? 1 : 0), 0); ctx.stroke(); } ell(hx, -11, 8, 4.5, hx === 10 ? '#6a4428' : '#8a6040'); ell(hx + 7, -16, 3, 4, hx === 10 ? '#6a4428' : '#8a6040'); }
        ell(-8, -4, 6, 6, '#3a2a1a'); ell(-8, -4, 3, 3, '#8a6a4a'); poly([[-16, -8], [2, -8], [2, -16], [-16, -16]], '#9a6a3a'); ctx.restore();
        person(X - f * 12, py - 8, { tunic: '#e6d8b0', walk: 0, face: f, hair: '#8a3a1a', scale: .8 }); person(X - f * 5, py - 8, { tunic: C.dark, cape: C.main, walk: 0, face: f, hair: '#3a2410', scale: .85 }); weapon(X - f * 5, py - 8, f, 'spear', lunge, .85);
        return true;
      }
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.6; for (const [lx, ph] of [[-9, 0], [-5, 1.5], [6, 3], [10, 4.5]]) { ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx + Math.sin(e.anim * 12 + ph) * 3 * (walk ? 1 : 0), 0); ctx.stroke(); }
      ell(0, -13, 13, 6, '#8a6a4a'); ell(12, -20, 4, 7, '#8a6a4a'); ell(15, -24, 5, 3, '#7a5a3a'); ctx.restore();
      person(X - f, py - 12, { tunic: C.dark, walk: 0, face: f, hair: '#c8a050', scale: .9 }); nhelm(X - f, py - 12, f, .9); weapon(X - f, py - 12, f, 'spear', lunge, .9); return true;
    }
    case 'troll': person(X, py, { tunic: '#6a7458', walk, face: f, skin: '#8a9478', hair: '#4a5040', scale: 2.2 }); ctx.save(); ctx.translate(X, py); ctx.scale(f * 2.2, 2.2); ell(4, -24, 3, 2.5, '#7a8468'); ell(2, -27, 1, 1, '#ffde4a'); ctx.restore(); weapon(X, py, f, 'club', lunge, 2.2); return true;
    case 'fian': person(X, py, { tunic: '#e6d8b0', cape: C.main, walk, face: f, hair: '#b0582a' }); weapon(X, py, f, 'spear', lunge); shieldR(X, py, f, C.dark, '#e3c26a', .85); return true;
    case 'curad': person(X, py, { tunic: C.dark, cape: '#e6d8b0', walk, face: f, hair: '#e0c070', legs: '#4a3a2a' }); weapon(X, py, f, 'sword', lunge); ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); poly([[-9, -24], [0, -24], [0, -6], [-9, -6]], C.main); ctx.strokeStyle = '#e3c26a'; ctx.lineWidth = 1; ctx.strokeRect(-9, -24, 9, 18); ctx.restore(); return true;
    case 'slinger': person(X, py, { tunic: '#d8c8a0', sash: C.main, walk, face: f, hair: '#b0582a' }); weapon(X, py, f, 'sling', 0); return true;
    case 'druid': person(X, py, { tunic: '#f2efe6', cape: '#e0dcc8', walk, face: f, hair: '#ddd' }); beard(X, py, f, '#e6e6e6'); weapon(X, py, f, 'staff', 0); return true;
    case 'aossi': ctx.globalAlpha = (ctx.globalAlpha || 1) * (.75 + Math.sin(T * 3 + e.id) * .15); person(X, py - 3 - Math.sin(T * 2 + e.id) * 2, { tunic: '#d8f0e8', cape: '#9ad8c8', walk, face: f, hair: '#f6f0c0', skin: '#f0e8f8', scale: 1.15 }); weapon(X, py - 3, f, 'sword', lunge, 1.15); ctx.globalAlpha = 1; ell(X, py - 20, 14, 18, 'rgba(180,255,220,.12)'); return true;
    case 'centaur': {
      ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.3, 1.3); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2.4; for (const [lx, ph] of [[-9, 0], [-5, 1.5], [6, 3], [10, 4.5]]) { ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx + Math.sin(e.anim * 12 + ph) * 3 * (walk ? 1 : 0), 0); ctx.stroke(); } ell(-1, -13, 12, 6, '#8a5a32'); poly([[-12, -15], [-18, -8], [-13, -12]], '#3a2a1a'); ctx.restore();
      person(X + f * 9, py - 13, { tunic: '#e0b088', walk: 0, face: f, hair: '#3a2410', scale: 1.05 }); beard(X + f * 9, py - 13, f, '#3a2410', 1.05); weapon(X + f * 9, py - 13, f, 'bow', 0, 1.05); return true;
    }
    // heroes
    case 'thor': person(X, py, { tunic: '#7a2a1e', cape: '#b8342a', walk, face: f, hair: '#c8461e', scale: 1.3 }); beard(X, py, f, '#c8461e', 1.3); if (!(G && G.scen.id === 'thrym' && !G.flags.unveiled)) weapon(X, py, f, 'hammer', lunge, 1.3); if (G && G.scen.id === 'thrym' && !G.flags.unveiled) { ctx.globalAlpha = .75; ell(X + f * 2, py - 33, 8, 9, '#f8f4ea'); ctx.globalAlpha = 1; } return true;
    case 'loki': person(X, py, { tunic: '#2f6b3a', cape: '#1f4a2a', walk, face: f, hair: '#d8a040', scale: 1.15 }); ctx.globalAlpha = .5 + Math.sin(T * 4) * .3; ell(X + f * 8, py - 24, 3, 3, '#9aff7a'); ctx.globalAlpha = 1; return true;
    case 'sigurd': person(X, py, { tunic: '#d8c8a0', cape: C.main, walk, face: f, helmet: '#ffd447', scale: 1.25 }); weapon(X, py, f, 'sword', lunge, 1.25); shieldR(X, py, f, '#c9a03a', '#fff', 1.25); if (e.gram) { ctx.globalAlpha = .4 + Math.sin(T * 5) * .2; ell(X + f * 16, py - 30, 4, 4, '#bfe8ff'); ctx.globalAlpha = 1; } return true;
    case 'odin': person(X, py, { tunic: '#4a5a6a', cape: '#2a3440', walk, face: f, hair: '#cfcfcf', scale: 1.25 }); beard(X, py, f, '#dcdcdc', 1.25); ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.25, 1.25); ell(0, -31, 8, 2, '#2a3440'); ell(0, -33, 4, 3, '#2a3440'); ctx.restore(); weapon(X, py, f, 'spear', lunge, 1.25); for (const k of [0, 1]) ell(X + Math.cos(T * 2 + k * 3) * 16, py - 44 + Math.sin(T * 3 + k) * 3, 3.2, 1.6, '#111'); return true;
    case 'vidarr': person(X, py, { tunic: '#5a4a3a', cape: '#3a3a3a', walk, face: f, hair: '#8a7050', scale: 1.25 }); beard(X, py, f, '#8a7050', 1.25); weapon(X, py, f, 'sword', lunge, 1.25); ell(X + f * 3, py - 1, 6, 3, '#4a3020'); return true;
    case 'lugh': person(X, py, { tunic: '#f6e7b0', cape: '#e8a020', walk, face: f, hair: '#ffd34a', scale: 1.25 }); weapon(X, py, f, 'sling', 0, 1.25); ctx.globalAlpha = .25 + Math.sin(T * 3) * .1; ell(X, py - 30, 14, 14, '#fff3a0'); ctx.globalAlpha = 1; return true;
    case 'nuada': person(X, py, { tunic: '#e6d8b0', cape: '#2a5ea0', walk, face: f, hair: '#c8b070', scale: 1.25 }); beard(X, py, f, '#c8b070', 1.25); weapon(X, py, f, 'sword', lunge, 1.25); ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.25, 1.25); ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, -19); ctx.lineTo(-7, -12); ctx.stroke(); ctx.restore(); return true;
    case 'dagda': person(X, py, { tunic: '#7a5a2a', cape: '#5a3a1a', walk, face: f, hair: '#5a3a1a', scale: 1.5 }); beard(X, py, f, '#5a3a1a', 1.5); weapon(X, py, f, 'club', lunge, 1.5); return true;
    case 'cuchulainn': { const r = e.riastrad; person(X, py, { tunic: r ? '#8a1e1e' : '#e6d8b0', cape: '#b8342a', walk, face: f, hair: '#2a1a10', skin: r ? '#d07a6a' : '#e0b088', scale: r ? 1.45 : 1.25 }); weapon(X, py, f, 'spear', lunge, r ? 1.45 : 1.25); shieldR(X, py, f, '#e6d8b0', '#b8342a', 1.25); if (r) { ctx.globalAlpha = .5; ell(X, py - 52 - Math.sin(T * 8) * 3, 3, 10, '#5a0a0a'); ctx.globalAlpha = 1; } return true; }
    case 'nechtan': person(X, py, { tunic: '#3a3a3a', cape: C.main, walk, face: f, hair: '#3a2410', scale: 1.2 }); weapon(X, py, f, 'sword', lunge, 1.2); shieldR(X, py, f, C.dark, '#ccc', 1.2); return true;
    case 'ferdiad': person(X, py, { tunic: '#8a8a7a', cape: C.main, walk, face: f, hair: '#3a2410', skin: '#b8b0a0', scale: 1.4 }); weapon(X, py, f, 'sword', lunge, 1.4); shieldR(X, py, f, '#6a6a5a', '#ddd', 1.4); return true;
    // creatures
    case 'jotunn': case 'thrym': { const k = t === 'thrym'; person(X, py, { tunic: k ? '#3a4a6a' : '#6a7a8a', cape: k ? '#2a3a5a' : null, walk, face: f, skin: '#b8cad8', hair: '#e8f0f8', scale: k ? 2.6 : 2.2 }); beard(X, py, f, '#e8f0f8', k ? 2.6 : 2.2); if (k) { ctx.save(); ctx.translate(X, py); ctx.scale(f * 2.6, 2.6); poly([[-4, -30], [-3, -34], [-1, -31], [1, -35], [3, -31], [4, -34], [4, -30]], '#ffd447'); ctx.restore(); } weapon(X, py, f, 'club', lunge, k ? 2.6 : 2.2); return true; }
    case 'draugr': person(X, py, { tunic: '#5a5a52', walk, face: f, skin: '#9aa59a', hair: '#3a3a36', legs: '#5a5a52' }); weapon(X, py, f, 'sword', lunge); ctx.save(); ctx.translate(X, py); ctx.scale(f, 1); ell(2, -26, 1, 1, '#c0ff9a'); ctx.restore(); return true;
    case 'fenrir': beast(X, py, f, 2.6, '#6a6a72', { kind: 'wolf', walk: walk ? 1 : 0, anim: e.anim, jaw: true, eye: '#ffd23a' }); return true;
    case 'hound': beast(X, py, f, 1.7, '#4a3a2e', { kind: 'dog', walk: walk ? 1 : 0, anim: e.anim }); return true;
    case 'bull': beast(X, py, f, 2, '#5a3a22', { kind: 'bull', walk: walk ? 1 : 0, anim: e.anim }); return true;
    case 'jormungandr': case 'fafnir': {
      const fa = t === 'fafnir', c1 = fa ? '#7a5a2a' : '#2f5a6a', c2 = fa ? '#9a7a3a' : '#3f7a8a';
      ctx.save(); ctx.translate(X, py); ctx.scale(f, 1);
      for (let k = 0; k < 8; k++) { const a = T * 1.2 + k * .8; ell(-40 + k * 9, -8 - Math.sin(a) * 4, 13 - k * .3, 10 - k * .3, k % 2 ? c1 : c2); }
      ctx.strokeStyle = c1; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(30, -12); ctx.quadraticCurveTo(40, -34, 34, -50); ctx.stroke();
      ell(38, -56, 14, 10, c2); poly([[44, -54], [60, -50], [44, -48]], c1); ell(40, -60, 3, 2.5, '#ff3');
      if (fa) for (let k = 0; k < 4; k++) poly([[24 + k * 5, -60 + k * 2], [28 + k * 5, -74 + k * 3], [32 + k * 5, -58 + k * 2]], '#5a3a1a');
      if (fa) { poly([[-6, -14], [-24, -44 - Math.sin(T * 4) * 6], [8, -18]], 'rgba(90,60,30,.85)'); }
      ctx.restore(); return true;
    }
    case 'surtr': person(X, py, { tunic: '#3a1a12', cape: '#8a2a10', walk, face: f, skin: '#5a2a1a', hair: '#ff6a1a', scale: 2.6 }); ctx.save(); ctx.translate(X, py); ctx.scale(f * 2.6, 2.6); ctx.strokeStyle = '#ffb02a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(16 + lunge, -30); ctx.stroke(); ctx.globalAlpha = .5 + Math.sin(T * 9) * .3; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); ctx.globalAlpha = .25; ell(X, py - 40, 34, 40, '#ff7a1a'); ctx.globalAlpha = 1; return true;
    case 'fomor': person(X, py, { tunic: '#4a5a40', walk, face: f, skin: '#8a9a7a', hair: '#2a3020', scale: 1.7 }); ctx.save(); ctx.translate(X, py); ctx.scale(f * 1.7, 1.7); ell(1.5, -26, 2.4, 2.4, '#fff'); ell(2, -26, 1.2, 1.2, '#a01010'); ctx.restore(); weapon(X, py, f, 'club', lunge, 1.7); return true;
    case 'balor': {
      person(X, py, { tunic: '#2a3a2a', cape: '#1a2a1a', walk, face: f, skin: '#7a8a6a', hair: '#1a1a12', scale: 3 });
      const open = G && (G.time % 6) < 3; ctx.save(); ctx.translate(X, py); ctx.scale(f * 3, 3);
      ell(1, -27, 3.4, open ? 2.6 : .7, open ? '#fff3c0' : '#5a6a4a'); if (open) { ell(1.4, -27, 1.6, 1.6, '#c01010'); ctx.globalAlpha = .3 + Math.sin(T * 8) * .15; ell(1, -27, 7, 5, '#ff5a2a'); ctx.globalAlpha = 1; }
      ctx.restore(); return true;
    }
  }
  return false;
}
