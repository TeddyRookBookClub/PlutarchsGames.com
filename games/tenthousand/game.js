/* The Ten Thousand: march Xenophon's Greek army home from Babylon to the Black Sea (401–400 BC), after the Anabasis.
   An Oregon-Trail-and-FTL-style journey: pick a route on the map, manage rations, silver, morale and the wounded, and
   choose tactics when the Persians, Carduchians and Chalybes stand in the way. */
(function () {
  'use strict';
  var $ = Kit.$, esc = Kit.esc;
  Kit.bar('The Ten Thousand', [['b-journal', '📜', 'Xenophon’s journal'], ['b-help', '?', 'How to play'], ['b-snd', '🔊', 'Sound']]);
  var main = document.createElement('main'); main.className = 'tt'; document.body.appendChild(main);
  main.innerHTML =
    '<div class="tt-res" id="res"></div>' +
    '<div class="tt-grid"><div class="tt-map card"><canvas id="cv" width="900" height="620"></canvas><div class="tt-pace" id="pace"></div></div>' +
    '<div class="tt-side"><div class="card tt-ev" id="ev"></div><div class="card tt-log"><h3>Day by day</h3><ol id="log"></ol></div></div></div>';
  var cv = $('#cv'), ctx = cv.getContext('2d');

  /* ---------- the route ---------- */
  // lon/lat of real places; region: mes (Mesopotamia), card (Carduchian hills), arm (Armenian highlands), north (the tribes), coast (Black Sea)
  var STAGES = [
    { n: 'Cunaxa', lon: 44.1, lat: 33.15, r: 'mes', story: 'cunaxa', d: 0 },
    { n: 'Villages of Parysatis', lon: 44.55, lat: 34.3, r: 'mes', story: 'parysatis', d: 7 },
    { n: 'The Zapatas river', lon: 43.62, lat: 35.95, r: 'mes', story: 'seized', d: 8, single: true },
    { n: 'The Persian horse', lon: 43.45, lat: 36.05, r: 'mes', story: 'mithradates', d: 2 },
    { n: 'Larisa', lon: 43.33, lat: 36.2, r: 'mes', story: 'larisa', d: 3 },
    { n: 'Mespila', lon: 43.15, lat: 36.4, r: 'mes', story: 'tissa', d: 4 },
    { n: 'Banks of the Tigris', lon: 42.85, lat: 36.95, r: 'mes', story: 'skins', d: 5 },
    { n: 'Carduchian hills', lon: 42.55, lat: 37.3, r: 'card', story: 'carduchi', d: 3 },
    { n: 'The high pass', lon: 42.25, lat: 37.6, r: 'card', story: 'guides', d: 3 },
    { n: 'The Centrites river', lon: 41.95, lat: 37.95, r: 'card', story: 'centrites', d: 4, single: true },
    { n: 'The Teleboas', lon: 41.75, lat: 38.7, r: 'arm', story: 'tiribazus', d: 6 },
    { n: 'The snows', lon: 41.6, lat: 39.2, r: 'arm', story: 'snow', d: 5 },
    { n: 'Underground villages', lon: 41.35, lat: 39.55, r: 'arm', story: 'villages', d: 4 },
    { n: 'The Phasis', lon: 41.75, lat: 40.1, r: 'arm', story: 'phasians', d: 7 },
    { n: 'Taochian strongholds', lon: 41.6, lat: 40.55, r: 'north', story: 'taochi', d: 5 },
    { n: 'Land of the Chalybes', lon: 40.95, lat: 40.6, r: 'north', story: 'chalybes', d: 7 },
    { n: 'Gymnias', lon: 40.25, lat: 40.3, r: 'north', story: 'gymnias', d: 6 },
    { n: 'Mount Theches', lon: 39.95, lat: 40.7, r: 'north', story: 'thalatta', d: 5, single: true },
    { n: 'Land of the Macrones', lon: 40.3, lat: 40.82, r: 'north', story: 'macrones', d: 3 },
    { n: 'Colchian heights', lon: 39.9, lat: 40.95, r: 'north', story: 'honey', d: 2 },
    { n: 'Trapezus', lon: 39.72, lat: 41.0, r: 'coast', story: 'trapezus', d: 2, single: true, endAct: 1 },
    { n: 'Cerasus', lon: 38.39, lat: 40.92, r: 'coast', story: 'cerasus', d: 3 },
    { n: 'Cotyora', lon: 37.88, lat: 41.0, r: 'coast', story: 'cotyora', d: 5 },
    { n: 'Sinope', lon: 35.15, lat: 42.02, r: 'coast', story: 'sinope', d: 4 },
    { n: 'Heraclea', lon: 31.42, lat: 41.29, r: 'coast', story: 'heraclea', d: 5 },
    { n: 'Calpe Harbour', lon: 30.25, lat: 41.15, r: 'coast', story: 'calpe', d: 4 },
    { n: 'Byzantium', lon: 28.98, lat: 41.01, r: 'coast', story: 'byzantium', d: 4, single: true, endAct: 2 }
  ];
  var KIND = {
    road: { i: '⚑', name: 'The road Xenophon took', tip: 'The historical route and its story.' },
    village: { i: '🏘️', name: 'Villages', tip: 'Food to forage, and perhaps trouble.' },
    hills: { i: '⛰️', name: 'High ground', tip: 'Slower, but harder to ambush.' },
    ford: { i: '〰️', name: 'A river ford', tip: 'Water and fish, and a crossing to make.' },
    market: { i: '⚖️', name: 'A market', tip: 'Buy rations with silver.' },
    shrine: { i: '🔥', name: 'A shrine', tip: 'Sacrifice, rest and recover morale.' },
    wild: { i: '🌲', name: 'Wild country', tip: 'Short cut through unknown land.' }
  };
  var REGION = { mes: 'Mesopotamia', card: 'Carduchian hills', arm: 'Armenia', north: 'The northern tribes', coast: 'The Black Sea coast' };

  /* ---------- state ---------- */
  var S, nodes, view = { busy: false };
  function fresh(mode) {
    S = { mode: mode || 'normal', day: 0, stage: 0, node: 0, food: 20, silver: 40, morale: 55, beasts: 400,
      H: 8600, P: 1400, Sl: 0, A: 400, C: 0, W: 300, start: 0, notes: [], log: [], flags: {}, pace: 'steady', leaders: ['Xenophon', 'Chirisophus', 'Timasion', 'Agasias', 'Lycius'], act: 1, over: false, seed: Date.now() % 100000 };
    if (mode === 'hard') { S.food = 14; S.morale = 45; S.silver = 25; }
    S.start = men(); nodes = build(S.seed); S.path = [[0, 0]];
  }
  function men() { return Math.round(S.H + S.P + S.Sl + S.A + S.C); }
  function build(seed) {
    var r = Kit.rng(seed), out = [];
    STAGES.forEach(function (st, i) {
      var k = st.single || i === 0 ? 1 : (r() < .35 ? 2 : 3), arr = [];
      var kinds = st.r === 'coast' ? ['market', 'village', 'shrine', 'hills'] : st.r === 'mes' ? ['village', 'ford', 'market', 'wild'] : st.r === 'arm' ? ['village', 'hills', 'wild', 'shrine'] : ['hills', 'village', 'wild', 'ford'];
      for (var j = 0; j < k; j++) {
        var road = j === Math.floor(k / 2), off = (j - (k - 1) / 2) * .26;
        var pv = STAGES[Math.max(0, i - 1)], nx = STAGES[Math.min(STAGES.length - 1, i + 1)], dx = nx.lon - pv.lon, dy = nx.lat - pv.lat, L = Math.hypot(dx, dy) || 1, ox = -dy / L, oy = dx / L;
        if (st.r === 'coast') { ox = 0; oy = -1; off = -Math.abs(off) * 1.4; }
        arr.push({ s: i, j: j, kind: road ? 'road' : kinds[Math.floor(r() * kinds.length)], lon: st.lon + ox * off, lat: st.lat + oy * off, d: road ? st.d : Math.max(1, st.d + (r() < .5 ? -1 : 1)) });
      }
      out.push(arr);
    });
    return out;
  }
  function stage() { return STAGES[S.stage]; }
  function region() { return stage().r; }

  /* ---------- map drawing ---------- */
  var LON0 = 27.6, LON1 = 46.4, LAT0 = 32.6, LAT1 = 43.2;
  // the camera follows the army: it frames the stages just behind and ahead
  var cam = { x: 42, y: 37, w: 9 };
  function camTarget() {
    if (!S) return { x: 37, y: 37.9, w: 18.8 };
    var lo = Math.max(0, S.stage - 2), hi = Math.min(STAGES.length - 1, S.stage + 3), a = 99, b = -99, c = 99, d = -99;
    for (var i = lo; i <= hi; i++) nodes[i].forEach(function (n) { a = Math.min(a, n.lon); b = Math.max(b, n.lon); c = Math.min(c, n.lat); d = Math.max(d, n.lat); });
    var w = Math.max(b - a + 1.6, (d - c + 1.4) * cv.width / cv.height / 1.25, 3.4);
    return { x: (a + b) / 2, y: (c + d) / 2, w: w };
  }
  function px(lon, lat) { var k = cv.width / cam.w; return [cv.width / 2 + (lon - cam.x) * k, cv.height / 2 - (lat - cam.y) * k * 1.25]; }
  var BLACKSEA = [[27.9, 41.9], [28.6, 43.2], [41.7, 43.2], [41.6, 41.6], [40.5, 41.12], [39.7, 41.08], [38.9, 41.1], [38.39, 41.0], [37.9, 41.08], [37.0, 41.2], [35.9, 41.75], [35.2, 42.1], [34.0, 41.98], [32.5, 41.85], [31.4, 41.35], [30.2, 41.2], [29.1, 41.25], [28.4, 41.4]];
  var MARMARA = [[26.9, 40.45], [29.0, 41.0], [29.8, 40.7], [29.1, 40.35], [27.6, 40.3]];
  var CASPIAN = [[46.4, 43.2], [47.6, 43.2], [47.6, 37.3], [46.4, 38.4]];
  var MED = [[27.6, 37.4], [27.6, 32.6], [34.3, 32.6], [35.0, 34.0], [35.9, 35.6], [36.1, 36.6], [35.3, 36.6], [33.8, 36.2], [31.0, 36.8], [29.5, 36.3], [28.0, 36.8]];
  var TIGRIS = [[39.9, 38.4], [40.5, 37.9], [41.6, 37.8], [42.2, 37.3], [42.8, 36.9], [43.15, 36.36], [43.3, 36.0], [43.7, 35.0], [44.3, 34.3], [44.4, 33.4], [44.8, 32.6]];
  var EUPHR = [[42.8, 39.6], [41.5, 39.2], [39.5, 39.2], [38.6, 38.7], [38.3, 37.9], [38.0, 36.9], [38.5, 36.0], [40.1, 35.3], [41.4, 34.4], [42.4, 34.0], [43.3, 33.2], [44.1, 32.6]];
  var VAN = [[42.3, 38.9], [43.1, 39.0], [43.6, 38.5], [42.9, 38.2], [42.4, 38.4]];
  var URMIA = [[45.2, 38.2], [45.8, 38.0], [45.6, 37.2], [45.2, 37.5]];
  var MTS = []; (function () { var r = Kit.rng(7); for (var i = 0; i < 260; i++) { var lon = 38 + r() * 8, lat = 37.2 + r() * 3.6; if (lat > 40.8 && lon < 41.6) continue; if (lat < 37.6 && lon > 43.4) continue; MTS.push([lon, lat, .7 + r() * .6]); } })();
  function poly(p, fill) { ctx.beginPath(); p.forEach(function (q, i) { var a = px(q[0], q[1]); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function line(p, col, w) { ctx.beginPath(); p.forEach(function (q, i) { var a = px(q[0], q[1]); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); }
  var hover = null, anim = 0;
  function draw() {
    var W = cv.width, H = cv.height, dark = document.documentElement.dataset.theme === 'dark';
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, dark ? '#3a3a2c' : '#e8dcb8'); g.addColorStop(1, dark ? '#4a3f2a' : '#e7cf9a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var sea = dark ? '#1d3b52' : '#7fa9bf';
    [BLACKSEA, MARMARA, CASPIAN, MED, VAN, URMIA].forEach(function (p) { poly(p, sea); });
    ctx.globalAlpha = .35; [BLACKSEA, MED].forEach(function (p) { line(p, dark ? '#8fb8d0' : '#f6f0de', 3); }); ctx.globalAlpha = 1;
    MTS.forEach(function (m) { var a = px(m[0], m[1]), s = Math.min(22, 9 * m[2] * 9 / cam.w); ctx.beginPath(); ctx.moveTo(a[0] - s, a[1] + s * .6); ctx.lineTo(a[0], a[1] - s * .7); ctx.lineTo(a[0] + s, a[1] + s * .6); ctx.closePath(); ctx.fillStyle = dark ? '#5d5240' : '#bfa676'; ctx.fill(); ctx.beginPath(); ctx.moveTo(a[0] - s * .3, a[1] - s * .25); ctx.lineTo(a[0], a[1] - s * .7); ctx.lineTo(a[0] + s * .3, a[1] - s * .25); ctx.fillStyle = S && S.stage >= 10 && S.stage <= 17 ? '#f4f6f8' : (dark ? '#776a52' : '#d8c497'); ctx.fill(); });
    line(TIGRIS, sea, 3.5); line(EUPHR, sea, 3.5);
    ctx.font = 'italic 15px "Cormorant Garamond",Georgia,serif'; ctx.fillStyle = dark ? '#c6d6e0' : '#3d6075'; ctx.textAlign = 'center';
    [['Euxine Sea', 34.5, 42.6], ['Tigris', 43.95, 35.0], ['Euphrates', 40.4, 35.7], ['Lake Van', 42.95, 38.55]].forEach(function (t) { var a = px(t[1], t[2]); ctx.fillText(t[0], a[0], a[1]); });
    ctx.fillStyle = dark ? '#d7c79a' : '#6c5530'; ctx.font = '600 13px Cinzel,Georgia,serif';
    [['ARMENIA', 42.9, 39.9], ['MESOPOTAMIA', 42.0, 35.2], ['CARDUCHIA', 43.6, 37.45], ['PAPHLAGONIA', 34.2, 41.0], ['BABYLONIA', 45.2, 33.0], ['THRACE', 28.4, 42.2]].forEach(function (t) { var a = px(t[1], t[2]); ctx.fillText(t[0], a[0], a[1]); });
    if (!S) return;
    // links between nodes
    for (var i = 0; i < nodes.length - 1; i++) nodes[i].forEach(function (a) { links(a).forEach(function (b) { var p = px(a.lon, a.lat), q = px(b.lon, b.lat); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.setLineDash([4, 5]); ctx.strokeStyle = dark ? 'rgba(240,230,200,.28)' : 'rgba(80,60,30,.3)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }); });
    // the path taken
    ctx.beginPath(); S.path.forEach(function (sj, k) { var n = nodes[sj[0]][sj[1]], a = px(n.lon, n.lat); k ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); });
    ctx.strokeStyle = '#a8261c'; ctx.lineWidth = 3.5; ctx.stroke();
    var nexts = view.busy || S.over ? [] : choices();
    nodes.forEach(function (arr, si) { arr.forEach(function (n) {
      var a = px(n.lon, n.lat), cur = si === S.stage && n.j === S.node, nx = nexts.indexOf(n) >= 0, past = si < S.stage || cur;
      var R = cur ? 11 : nx ? 10 : 6;
      if (nx) { ctx.beginPath(); ctx.arc(a[0], a[1], R + 5 + Math.sin(anim * 4) * 2, 0, 7); ctx.fillStyle = 'rgba(216,184,96,.35)'; ctx.fill(); }
      ctx.beginPath(); ctx.arc(a[0], a[1], R, 0, 7); ctx.fillStyle = cur ? '#a8261c' : nx ? '#d8b860' : past ? '#7d3b2a' : (dark ? '#2b3a30' : '#fffaf0'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dark ? '#e9dfc0' : '#3b2b14'; ctx.stroke();
      if (nx || (n === hover)) { ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(KIND[n.kind].i, a[0], a[1] - 15); }
    }); });
    // place names of the stages near you
    ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
    STAGES.forEach(function (st, i) { if (Math.abs(i - S.stage) > 3) return; var a = px(st.lon, st.lat); ctx.fillStyle = dark ? '#f3ead2' : '#2c2010'; ctx.fillText(st.n, a[0] + 14, a[1] + 4); });
    // the army marker
    var c = nodes[S.stage][S.node], a2 = px(c.lon, c.lat); ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🛡️', a2[0], a2[1] - 16);
    if (hover) { var hp = px(hover.lon, hover.lat), K = KIND[hover.kind], st2 = STAGES[hover.s], txt = K.name + ' · ' + hover.d + ' days' + (hover.kind === 'road' ? ' · ' + st2.n : ''); ctx.font = '600 13px system-ui'; var w = ctx.measureText(txt).width + 16, x = Math.min(W - w - 4, Math.max(4, hp[0] - w / 2)); ctx.fillStyle = 'rgba(10,30,20,.88)'; ctx.fillRect(x, hp[1] + 14, w, 24); ctx.fillStyle = '#f3ead2'; ctx.textAlign = 'left'; ctx.fillText(txt, x + 8, hp[1] + 31); }
  }
  function links(a) { var nx = nodes[a.s + 1]; if (!nx) return []; return nx.filter(function (b) { var ka = nodes[a.s].length, kb = nx.length; return ka === 1 || kb === 1 || Math.abs(a.j / (ka - 1) - b.j / (kb - 1)) <= .55; }); }
  function choices() { if (S.act === 1 && S.stage >= 20) return []; return links(nodes[S.stage][S.node]); }
  function pick(e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height, best = null, bd = 26;
    choices().forEach(function (n) { var a = px(n.lon, n.lat), d = Math.hypot(a[0] - x, a[1] - y); if (d < bd) { bd = d; best = n; } });
    return best;
  }
  cv.addEventListener('pointermove', function (e) { var n = pick(e); if (n !== hover) { hover = n; cv.style.cursor = n ? 'pointer' : 'default'; } });
  cv.addEventListener('click', function (e) { if (view.busy || S.over) return; var n = pick(e); if (n) go(n); });
  (function loop() { anim += 1 / 60; var tg = camTarget(); cam.x += (tg.x - cam.x) * .06; cam.y += (tg.y - cam.y) * .06; cam.w += (tg.w - cam.w) * .06; draw(); requestAnimationFrame(loop); })();

  /* ---------- the march ---------- */
  function log(t, cls) { S.log.unshift({ d: S.day, t: t, c: cls || '' }); if (S.log.length > 60) S.log.pop(); renderLog(); }
  function renderLog() { $('#log').innerHTML = S.log.slice(0, 30).map(function (l) { return '<li class="' + l.c + '"><b>Day ' + l.d + '</b> ' + l.t + '</li>'; }).join(''); }
  function scale(k) { ['H', 'P', 'Sl', 'A', 'C'].forEach(function (u) { S[u] = Math.max(0, Math.round(S[u] * k)); }); }
  function lose(n, w) { // n men lost, w share killed (rest wounded)
    var tot = men(); if (!tot) return 0; n = Math.min(n, tot); var k = 1 - n / tot; var before = tot; scale(k); var lost = before - men(); S.W += Math.round(lost * (1 - (w == null ? .5 : w))); return lost;
  }
  function cold() { return (S.stage >= 10 && S.stage <= 17); }
  function oneDay() {
    S.day++;
    var need = 1; S.food -= need;
    if (S.food < 0) { S.food = 0; var l = lose(men() * .016 + 20, .9); S.morale -= 3; S.beasts = Math.max(0, S.beasts - 6); if (Math.random() < .5) log('No rations. ' + l + ' men are lost to hunger and straggling.', 'bad'); }
    if (cold()) { var f = S.flags.oint ? .003 : .008, lc = lose(men() * f + 5, .6); S.beasts = Math.max(0, Math.round(S.beasts * .985)); S.morale -= S.flags.oint ? .5 : 1.2; if (Math.random() < .3) log('Snow and the north wind: ' + lc + ' men frostbitten or lost.', 'bad'); }
    var rec = Math.round(S.W * (S.pace === 'forced' ? .07 : .11)), die = Math.round(S.W * (S.pace === 'forced' ? .05 : .025));
    S.W = Math.max(0, S.W - rec - die); S.H += Math.round(rec * .75); S.P += rec - Math.round(rec * .75);
    if (S.pace === 'forced') S.morale -= 1.5;
    S.morale += (60 - S.morale) * .04; S.morale = Math.max(0, Math.min(100, S.morale));
  }
  function travelDays(n) { var d = n.d; if (S.pace === 'forced') d = Math.max(1, Math.round(d * .7)); if (S.W > men() * .12) d += 1; if (S.beasts < 50) d += 1; return d; }
  function go(n) {
    view.busy = true; hover = null; var days = travelDays(n), k = 0;
    log('March to ' + (n.kind === 'road' ? STAGES[n.s].n : KIND[n.kind].name.toLowerCase() + ' near ' + STAGES[n.s].n) + ': ' + days + ' days.');
    var t = setInterval(function () {
      oneDay(); k++; hud(); if (dead()) { clearInterval(t); return; }
      if (k >= days) { clearInterval(t); S.stage = n.s; S.node = n.j; S.path.push([n.s, n.j]); view.busy = false; arrive(n); }
    }, view.fast ? 0 : 140);
  }
  function dead() {
    if (men() < 700) { end(false, 'Too few are left to fight their way through. The remnant of the Ten Thousand is scattered in the hills and sold into slavery.'); return true; }
    if (S.morale <= 0) { end(false, 'The army loses heart. The men break into bands that bargain separately with the Persians, and the Ten Thousand are no more.'); return true; }
    return false;
  }
  function arrive(n) {
    save();
    if (n.kind === 'road') { var ev = STORY[STAGES[n.s].story]; ev && !(ev.hide && ev.hide()) ? show(ev) : back(); }
    else show(generic(n));
  }
  function back() {
    hud(); save(); if (dead()) return;
    var st = stage();
    if (st.endAct === 1 && S.act === 1) { actOne(); return; }
    if (st.endAct === 2) { end(true); return; }
    $('#ev').innerHTML = '<p class="chip">' + REGION[st.r] + '</p><h2>' + st.n + '</h2><p>Choose where the army marches next on the map. The gold circles are the roads open to you.</p>' +
      '<p class="mute small">' + choices().map(function (c) { return KIND[c.kind].i + ' <b>' + KIND[c.kind].name + '</b> (' + travelDays(c) + ' d): ' + KIND[c.kind].tip; }).join('<br>') + '</p>' +
      '<div class="krow"><button class="btn ghost" id="e-rest">Make camp for 2 days</button>' + (S.beasts >= 40 ? '<button class="btn ghost" id="e-eat">Slaughter 40 beasts (+3 rations)</button>' : '') + '</div>' +
      '<div class="tt-picks">' + choices().map(function (c, i) { return '<button class="btn" data-go="' + i + '">' + KIND[c.kind].i + ' ' + (c.kind === 'road' ? STAGES[c.s].n : KIND[c.kind].name) + '</button>'; }).join('') + '</div>';
    $('#e-rest').onclick = function () { for (var i = 0; i < 2; i++) { oneDay(); S.W = Math.round(S.W * .8); S.H += 0; S.morale += 4; } log('The army rests two days and tends the wounded.'); back(); };
    if ($('#e-eat')) $('#e-eat').onclick = function () { S.beasts -= 40; S.food += 3; log('Forty pack animals are slaughtered for meat.'); back(); };
    Kit.$$('[data-go]').forEach(function (b) { b.onclick = function () { go(choices()[+b.dataset.go]); }; });
  }

  /* ---------- events ---------- */
  // ev = { t: title, img: emoji, x: text, h: history note, c: [ { t: label, ok: fn → bool, f: fn → result text } ] }
  function show(ev) {
    if (ev.h) note(ev.t, ev.h);
    var opts = ev.c.filter(function (c) { return !c.hide || !c.hide(); });
    $('#ev').innerHTML = '<p class="chip">' + REGION[region()] + ' · ' + stage().n + '</p><h2>' + (ev.img ? ev.img + ' ' : '') + ev.t + '</h2><div class="tt-txt">' + (typeof ev.x === 'function' ? ev.x() : ev.x) + '</div>' +
      '<div class="tt-opts">' + opts.map(function (c, i) { var ok = !c.ok || c.ok(); return '<button class="tt-opt" data-o="' + i + '"' + (ok ? '' : ' disabled') + '>' + c.t + (c.why ? '<small>' + (typeof c.why === 'function' ? c.why() : c.why) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    Kit.$$('[data-o]').forEach(function (b) { b.onclick = function () { Kit.sfx.click(); var c = opts[+b.dataset.o], r = c.f(); hud(); if (S.over) return; if (r && r.battle) return; result(r, c.next); }; });
  }
  function result(txt, next) {
    if (dead()) return;
    $('#ev').innerHTML = '<div class="tt-txt">' + (txt || '') + '</div><div class="krow"><button class="btn gold" id="e-on">' + (next ? 'Go on' : 'Back to the map') + '</button></div>';
    $('#e-on').onclick = function () { next ? show(next) : back(); };
  }
  function note(t, h) { if (S.notes.some(function (n) { return n.t === t; })) return; S.notes.push({ t: t, h: h }); var all = Kit.store.get('tt-notes', {}); all[t] = h; Kit.store.set('tt-notes', all); }
  function gain(food, silver, morale, beasts) { var p = []; if (food) { S.food += food; p.push((food > 0 ? '+' : '') + food + ' rations'); } if (silver) { S.silver += silver; p.push((silver > 0 ? '+' : '') + silver + ' minae of silver'); } if (morale) { S.morale = Math.max(0, Math.min(100, S.morale + morale)); p.push('morale ' + (morale > 0 ? '+' : '') + morale); } if (beasts) { S.beasts = Math.max(0, S.beasts + beasts); p.push((beasts > 0 ? '+' : '') + beasts + ' beasts'); } return p.length ? '<p class="tt-fx">' + p.join(' · ') + '</p>' : ''; }
  function has(name) { return S.leaders.indexOf(name) >= 0; }
  function chance(p) { return Math.random() < p; }

  /* ---------- battle ---------- */
  // foe: { n: name, k: horse|tribe|phalanx|pass, s: strength in thousands of hoplite-equivalents, loot: [food, silver, beasts] }
  var TACTIC = {
    square: { n: 'Hollow square', d: 'Baggage and wounded inside, spears out on every side. Safe, slow.', m: { horse: 1.25, tribe: .9, phalanx: .85, pass: .55 }, hurt: .6 },
    charge: { n: 'Hoplites charge', d: 'Shields locked, the paean sung, a run at the enemy line.', m: { horse: .55, tribe: 1.05, phalanx: 1.35, pass: .7 }, hurt: 1 },
    heights: { n: 'Seize the heights', d: 'Peltasts and picked men climb round and take the ground above.', need: function () { return S.P >= 300; }, m: { horse: .8, tribe: 1.3, phalanx: .75, pass: 1.6 }, hurt: .8 },
    missile: { n: 'Slingers and archers', d: 'Rhodian lead shot outranges the Persian bows.', need: function () { return S.Sl + S.A >= 200; }, m: { horse: 1.45, tribe: 1.1, phalanx: .9, pass: 1.0 }, hurt: .7 },
    horse: { n: 'Cavalry pursuit', d: 'Your few horsemen chase down the enemy as he wavers.', need: function () { return S.C >= 40; }, m: { horse: 1.2, tribe: 1.1, phalanx: .9, pass: .6 }, hurt: .9 },
    bribe: { n: 'Pay for passage', d: 'Silver instead of blood, if they will take it.', need: function () { return true; }, m: {}, hurt: 0 },
    night: { n: 'Night march', d: 'Slip away in the dark. Persian horses are hobbled at night.', m: {}, hurt: 0 }
  };
  function power() { return (S.H + S.P * .7 + S.Sl * 1.1 + S.A * .9 + S.C * 2) / 1000 * (.6 + S.morale / 125); }
  function battle(foe, after) {
    var ks = Object.keys(TACTIC).filter(function (k) { return k !== 'bribe' || foe.bribe; }).filter(function (k) { return k !== 'night' || foe.k === 'horse' || foe.k === 'phalanx'; });
    var cost = Math.round(foe.s * 12);
    $('#ev').innerHTML = '<p class="chip">Battle · ' + stage().n + '</p><h2>⚔️ ' + foe.n + '</h2><div class="tt-txt"><p>' + foe.x + '</p></div>' +
      '<div class="tt-odds"><span>Your army <b>' + power().toFixed(1) + '</b></span><span>The enemy <b>' + foe.s.toFixed(1) + '</b></span><span class="mute">' + ({ horse: 'Horsemen and archers', tribe: 'Hill tribesmen', phalanx: 'Infantry in line', pass: 'Holding a pass' })[foe.k] + '</span></div>' +
      '<div class="tt-opts">' + ks.map(function (k) { var T = TACTIC[k], ok = (!T.need || T.need()) && (k !== 'bribe' || S.silver >= cost); var m = T.m[foe.k]; return '<button class="tt-opt" data-t="' + k + '"' + (ok ? '' : ' disabled') + '>' + T.n + (m ? ' <i class="tt-m ' + (m >= 1.2 ? 'g' : m < .8 ? 'b' : '') + '">' + (m >= 1.2 ? 'strong here' : m < .8 ? 'weak here' : 'fair') + '</i>' : '') + '<small>' + (k === 'bribe' ? 'Costs ' + cost + ' minae. ' : '') + T.d + (T.need && !T.need() ? ' (you lack the men)' : '') + '</small></button>'; }).join('') + '</div>';
    Kit.$$('[data-t]').forEach(function (b) { b.onclick = function () { fight(foe, b.dataset.t, cost, after); }; });
  }
  function fight(foe, k, cost, after) {
    var T = TACTIC[k], txt;
    if (k === 'bribe') { S.silver -= cost; txt = '<p>The silver changes hands. They let you pass, watching from the rocks.</p>' + gain(0, 0, -2); Kit.sfx.click(); return result(txt, after); }
    if (k === 'night') {
      oneDay(); if (chance(foe.k === 'horse' ? .75 : .5)) { txt = '<p>The army marches through the night with no fires lit. By dawn the enemy is far behind.</p>' + gain(0, 0, -3); }
      else { var l0 = lose(men() * .02 + 40, .5); txt = '<p>The enemy catches the rearguard at first light in a scramble of baggage and mules. ' + l0 + ' men are lost.</p>' + gain(-2, 0, -6, -30); }
      return result(txt, after);
    }
    var lead = 1 + (k === 'heights' && has('Chirisophus') ? .15 : 0) + (k === 'charge' && has('Agasias') ? .1 : 0) + (k === 'horse' && has('Lycius') ? .15 : 0) + (k === 'square' && has('Timasion') ? .1 : 0) + (S.flags.slingers && k === 'missile' ? .15 : 0);
    var r = power() * (T.m[foe.k] || 1) * lead / foe.s * (.8 + Math.random() * .4);
    var base = foe.s * 1000 * (S.mode === 'hard' ? .08 : .065) * T.hurt, lost, verdict;
    if (r > 1.25) { lost = lose(base / r, .35); verdict = '<p class="good"><b>Victory.</b> The enemy breaks and runs. You lose ' + lost + ' men.</p>' + gain(foe.loot[0], foe.loot[1], 8, foe.loot[2]); Kit.sfx.win(); }
    else if (r > .85) { lost = lose(base * 1.3, .45); verdict = '<p><b>A hard fight.</b> You force your way through, but ' + lost + ' men fall or are wounded.</p>' + gain(Math.round(foe.loot[0] / 2), 0, 1); Kit.sfx.hit(); }
    else { lost = lose(base * 2.4, .55); verdict = '<p class="bad"><b>A bitter day.</b> The army gets through only after heavy losses: ' + lost + ' men, and part of the baggage.</p>' + gain(-Math.min(S.food, 3), 0, -12, -Math.round(S.beasts * .15)); Kit.sfx.bad(); if (chance(.25) && S.leaders.length > 1) { var who = S.leaders[1 + Math.floor(Math.random() * (S.leaders.length - 1))]; S.leaders.splice(S.leaders.indexOf(who), 1); verdict += '<p class="bad">' + who + ' is among the dead.</p>'; } }
    log(foe.n + ': ' + T.n.toLowerCase() + ', ' + lost + ' lost.', r > .85 ? '' : 'bad');
    result('<p class="mute">' + T.n + ' against ' + foe.n.toLowerCase() + '.</p>' + verdict, after);
    return { battle: true };
  }
  function foe(n, k, s, x, loot, bribe) { return { n: n, k: k, s: s * 1.7 * (S.mode === 'hard' ? 1.15 : 1) * (1 + S.stage * .015), x: x, loot: loot || [3, 5, 20], bribe: bribe != null ? bribe : (k === 'tribe' || k === 'pass') }; }

  /* ---------- the story, stage by stage ---------- */
  var STORY = {
    cunaxa: { img: '🏛️', t: 'After Cunaxa', x: '<p>September, 401 BC. Cyrus the Younger has hired more than ten thousand Greek soldiers to take the Persian throne from his brother Artaxerxes. At Cunaxa, near Babylon, the Greeks won their part of the battle, but Cyrus charged at his brother and was killed.</p><p>Now the Greeks stand victorious in the middle of the Persian Empire, with no paymaster and no reason to be there. The satrap Tissaphernes offers to guide them home. They are 1,500 miles from the nearest Greek city.</p>',
      h: 'The story of this march is the Anabasis, “the march up-country”, written by Xenophon of Athens, who was there. Cunaxa was fought in 401 BC about 70 km north of Babylon.',
      c: [{ t: 'Accept Tissaphernes as guide', why: 'Safer roads for now. Can he be trusted?', f: function () { S.flags.trust = 1; log('Tissaphernes leads the army north.'); return '<p>The army follows the satrap’s men north along the Tigris. They keep their distance, and the two camps watch each other at night.</p>' + gain(4, 0, 0); } },
        { t: 'March apart, with a strong guard', why: 'Clearchus keeps the army in battle order.', f: function () { S.flags.wary = 1; log('The army marches apart from the Persians, in battle order.'); return '<p>Clearchus, the Spartan, insists the army marches in order of battle and camps apart. It is slower, and the men grumble, but nobody is caught off guard.</p>' + gain(0, 0, 4); } }] },
    parysatis: { img: '🌾', t: 'The villages of Parysatis', x: '<p>The road passes villages that belong to Parysatis, the queen mother, who loved Cyrus more than his brother. To insult her, Tissaphernes lets the Greeks plunder them freely, everything except the slaves.</p>',
      h: 'Xenophon says Tissaphernes gave the villages of Parysatis to the Greeks to plunder “in mockery of Cyrus” (Anabasis 2.4.27). There was grain, cattle and sheep in plenty.',
      c: [{ t: 'Take grain and cattle', f: function () { return '<p>The men fill every sack they have and drive the cattle with the column.</p>' + gain(9, 0, 3, 60); } },
        { t: 'Take only what you need', why: 'Fewer enemies along the road', f: function () { S.flags.mercy = (S.flags.mercy || 0) + 1; return '<p>You take enough for the march and leave the rest. Word travels fast in the villages along the river.</p>' + gain(5, 0, 1); } }] },
    seized: { img: '🗡️', t: 'The generals are seized', x: '<p>At the Zapatas river, Tissaphernes invites the Greek generals to a feast to settle their quarrels. Clearchus goes, with four other generals and twenty captains. None of them come back. They are taken to the king and beheaded.</p><p>That night the camp is silent. Nobody lights a fire. Then a young Athenian who has come along as a friend of one of the generals, not as a soldier, wakes from a dream of lightning striking his father’s house. His name is Xenophon.</p>',
      h: 'The arrest of Clearchus, Proxenus, Menon, Agias and Socrates the Achaean happened by the Zapatas (the Great Zab). Xenophon’s dream and his speech to the captains are in Anabasis 3.1.',
      c: [{ t: 'Rally the captains: elect new generals tonight', why: 'Xenophon is chosen to lead the rearguard', f: function () { log('Xenophon is elected general. Chirisophus leads the van.', 'good'); return '<p>Xenophon goes from fire to fire. New generals are elected before dawn: Chirisophus the Spartan leads the van, and Xenophon, the youngest, takes the rearguard.</p><p>He tells the army: “Up to now the gods have been on our side. It is the Persians who broke their oaths.”</p>' + gain(0, 0, 18); } },
        { t: 'Burn the wagons and tents first', why: 'Faster march, fewer mouths and less baggage', f: function () { S.flags.burnt = 1; S.beasts = Math.round(S.beasts * .7); log('The wagons and tents are burnt.', 'good'); return '<p>On Xenophon’s advice, the army burns the wagons, the tents and everything not needed for war. A light army marches faster and fights better.</p>' + gain(-1, 0, 12); } }] },
    mithradates: { img: '🏹', t: 'Mithradates harries the rearguard', x: '<p>Mithradates, who once served Cyrus, follows with horsemen, archers and slingers. They shoot from beyond the reach of Cretan bows and ride off before the hoplites can close. Men fall and nobody can hit back.</p>',
      h: 'After this, Xenophon formed a company of about 200 slingers from the Rhodians in the army, who used lead shot that outranged the Persian slingers, and 50 horsemen from the baggage horses (Anabasis 3.3.16–20).',
      c: [{ t: 'Pay the Rhodians to form a corps of slingers', why: '200 slingers, 15 minae', ok: function () { return S.silver >= 15; }, f: function () { S.silver -= 15; S.Sl += 200; S.H -= 200; S.flags.slingers = 1; return '<p>The Rhodians in the ranks were slingers at home. With lead shot they throw twice as far as the Persians with their fist-sized stones.</p><p>You also have the best of the baggage horses saddled.</p>' + mount(); } },
        { t: 'Fight it out now', f: function () { battle(foe('Mithradates’ horse', 'horse', 3, 'Four hundred horsemen and four thousand archers and slingers circle the rearguard.', [0, 6, 30]), STORY.mithradates2); return { battle: true }; } }] },
    mithradates2: { img: '🐎', t: 'Lessons of the rearguard', x: '<p>The skirmish shows the problem. Without slingers and horsemen, the army can only suffer.</p>', c: [{ t: 'Form slingers and horsemen now', ok: function () { return S.silver >= 15; }, f: function () { S.silver -= 15; S.Sl += 200; S.H -= 200; S.flags.slingers = 1; return '<p>Two hundred Rhodian slingers are paid and equipped.</p>' + mount(); } }, { t: 'Push on as you are', f: function () { return '<p>The army hurries on. The horsemen will be back.</p>' + gain(0, 0, -3); } }] },
    larisa: { img: '🏚️', t: 'Larisa, a ruined city', x: '<p>A great empty city stands by the Tigris, with brick walls twenty-five feet thick and a stone pyramid beside it. The locals say the Medes once lived here, and that the gods hid the city in a cloud when the Persians came.</p>',
      h: 'Xenophon’s “Larisa” is the ruins of Nimrud (Kalhu), and “Mespila” is Nineveh. Both were Assyrian capitals, destroyed about 200 years before he passed. He did not know the name Assyria for them.',
      c: [{ t: 'Search the ruins', f: function () { if (chance(.6)) return '<p>Villagers have hidden grain in the old storerooms.</p>' + gain(5, 2, 2); return '<p>Only dust, bats and broken bricks.</p>' + gain(0, 0, -1); } },
        { t: 'March past without stopping', f: function () { oneDay(); return '<p>The army marches on without a halt.</p>'; } }] },
    tissa: { img: '🔥', t: 'Tissaphernes burns the villages', x: '<p>Near Mespila, the satrap himself appears with a great army. When the Greeks march, he races ahead and sets fire to the villages they need for food.</p>',
      h: 'Tissaphernes tried scorched earth against the Greeks. The Greeks noticed that the Persians always camped about seven miles away, because their horses were tethered and hobbled at night and they feared a night attack (3.4.35).',
      c: [{ t: 'Attack his army in the plain', f: function () { battle(foe('Tissaphernes’ army', 'horse', 6.5, 'The satrap’s horsemen and archers spread across the plain.', [6, 25, 40]), null); return { battle: true }; } },
        { t: 'Race him to the villages', why: 'Forced march; save what food you can', f: function () { oneDay(); var got = chance(.55); return got ? '<p>The peltasts reach the villages before the fires do.</p>' + gain(6, 0, 3) : '<p>Smoke rises ahead. You find only ash.</p>' + gain(-1, 0, -4); } }] },
    skins: { img: '🎈', t: 'The Tigris is too deep', x: '<p>The road north is blocked by the river on one side and mountains on the other. A Rhodian soldier comes to the generals with an idea: “Give me two thousand inflated skins and a talent of silver, and I will make a bridge.” The army has plenty of dead sheep and goats.</p><p>Prisoners say the mountain road leads into the land of the Carduchians, a people so warlike that a royal army of 120,000 once went in and not one came out.</p>',
      h: 'The Rhodian’s skin bridge was never built: the enemy cavalry on the far bank made it impossible (3.5.8–12). The generals chose the Carduchian mountains instead, which cost the army more than all its battles with the king.',
      c: [{ t: 'Pay for the bridge of skins', why: '30 minae; a gamble, but you avoid the mountains', ok: function () { return S.silver >= 30; }, f: function () { S.silver -= 30; if (chance(.35)) { S.flags.bridge = 1; S.stage = 9; S.node = 0; S.path.push([9, 0]); return '<p>Against the odds the bridge holds. Skins tied together, weighed down with stones and covered with brush and earth, carry the army across at night. You bypass the Carduchian hills.</p>' + gain(0, 0, 10); } return '<p>Persian horsemen line the far bank. Nobody could build under their arrows. The silver is gone, and the mountains are still the only way.</p>' + gain(0, 0, -5); } },
        { t: 'Into the Carduchian mountains', f: function () { return '<p>The generals decide on the mountains. The army leaves at night, the wounded on what animals are left.</p>'; } }] },
    carduchi: { img: '🪨', t: 'Boulders from above', x: '<p>The Carduchians abandon their villages and take to the heights. From the cliffs above the road, they roll down boulders as big as wagons, and their archers draw bows three cubits long. Their arrows go through shields and breastplates.</p>',
      h: 'Xenophon says the seven days in Carduchia were worse than everything the king and Tissaphernes had done to them (4.3.2). The Carduchians were the ancestors, perhaps, of the Kurds.',
      c: [{ t: 'Fight through', f: function () { battle(foe('Carduchian warriors', 'pass', 4.5, 'The road winds below cliffs lined with archers and piles of stones.', [5, 0, 10]), null); return { battle: true }; } },
        { t: 'Leave the baggage to move fast', why: 'Lose beasts and captives, gain speed', f: function () { S.beasts = Math.round(S.beasts * .55); var l = lose(men() * .02, .5); return '<p>Everything not essential is left behind, along with the captives. The column moves twice as fast, and still ' + l + ' men are hit.</p>' + gain(0, 0, -2); } }] },
    guides: { img: '🧭', t: 'Two prisoners and a pass', x: '<p>The way ahead climbs to a pass that the Carduchians hold. Two captured men are questioned about another way round. The first says he knows no other road. The second is silent.</p>',
      h: 'This is grim history: the first prisoner was killed in front of the second, who then admitted that he had kept quiet because his daughter was married to someone who lived on that road (4.1.23). He led a night attack round the pass.',
      c: [{ t: 'Send volunteers round in the rain at night', why: 'The heights trick; needs peltasts', ok: function () { return S.P >= 200; }, f: function () { if (chance(.75)) { log('Volunteers seize the heights above the pass.', 'good'); return '<p>Two thousand volunteers climb all night in pouring rain and fall on the guards at dawn in the mist. The trumpets sound, and the pass is yours.</p>' + gain(2, 0, 9); } var l = lose(160, .6); return '<p>The climbers lose their way in the dark. By the time they reach the top, ' + l + ' men have fallen to stones and arrows.</p>' + gain(0, 0, -4); } },
        { t: 'Storm the pass directly', f: function () { battle(foe('Carduchians in the pass', 'pass', 5, 'They hold the ridge above the only road.', [3, 0, 0]), null); return { battle: true }; } }] },
    centrites: { img: '🌊', t: 'The Centrites river', x: '<p>The Centrites divides the Carduchians from Armenia. It is two hundred feet wide and up to the chest. On the far bank, horsemen of the Armenian satrap Orontas wait. Behind you, the Carduchians are gathering on the hills.</p><p>That night Xenophon dreams he is in fetters, and that they fall off by themselves.</p>',
      h: 'Two young men, gathering firewood, found a ford by the river where the rocks came down to the water (4.3.10). The army made a feint at one crossing and crossed at another, with Xenophon holding the rearguard against the Carduchians.',
      c: [{ t: 'Feint at one ford, cross at the other', why: 'The young men’s ford', f: function () { if (chance(.7)) return '<p>The horsemen ride to block the feint. The real column crosses upstream singing the paean, and the satrap’s men flee. The rearguard runs across last, under stones.</p>' + gain(0, 0, 8) + lossTxt(lose(80, .5)); return '<p>The ruse half works. The army crosses, but the rearguard is caught in midstream.</p>' + lossTxt(lose(320, .5)) + gain(0, 0, -3); } },
        { t: 'Force the crossing', f: function () { battle(foe('Orontas’ horsemen at the river', 'horse', 4.2, 'You must wade chest-deep under their javelins.', [0, 8, 30]), null); return { battle: true }; } }] },
    tiribazus: { img: '🤝', t: 'Tiribazus offers a truce', x: '<p>Tiribazus, governor of western Armenia and a friend of the king, rides up with horsemen. He offers a bargain: he will not harm the Greeks if they do not burn the houses, and they may take what supplies they need.</p>',
      h: 'Tiribazus was the man who had the honour of helping the king onto his horse. He broke the truce; the Greeks raided his camp and took his silver-footed couch and his drinking cups (4.4.21).',
      c: [{ t: 'Accept, but send scouts', f: function () { S.flags.tiri = 1; if (chance(.65)) return '<p>The scouts find Tiribazus waiting in ambush in the mountains. You strike his camp first. His tent, his silver-footed couch, his cups and the men who called themselves his bakers and wine-pourers are all taken.</p>' + gain(5, 25, 9, 30); return '<p>The truce holds for now, and the villages have food.</p>' + gain(5, 0, 2); } },
        { t: 'Refuse and burn as you go', f: function () { battle(foe('Tiribazus’ horsemen', 'horse', 3.8, 'He wants vengeance and has cut you off.', [4, 15, 30]), null); return { battle: true }; } }] },
    snow: { img: '❄️', t: 'The north wind', x: '<p>The snow falls six feet deep. The north wind blows in the men’s faces, freezing everything. Pack animals and slaves die in the drifts, and about thirty soldiers. Men go snow-blind, and lose toes to frostbite.</p>',
      h: 'A soothsayer advised sacrificing to the North Wind, and Xenophon writes that “it seemed clear to everyone” that the wind then slackened (4.5.4). Men who covered their eyes with something black were spared snow-blindness.',
      c: [{ t: 'Sacrifice to the North Wind', f: function () { if (chance(.7)) return '<p>The seer sacrifices. The wind drops a little, and the army staggers on.</p>' + gain(0, 0, 6); return '<p>The wind does not care.</p>' + lossTxt(lose(120, .7)); } },
        { t: 'Light fires all night', why: 'Costs a day; the beasts suffer less', f: function () { oneDay(); return '<p>Men who keep fires burning all night survive. Others, too tired to move, sit in the snow until it melts down to the earth beneath them.</p>' + gain(0, 0, 2, 10); } },
        { t: 'Anoint the men with oil and pig fat', why: 'Prevents frostbite for the rest of the cold', ok: function () { return S.beasts >= 30; }, f: function () { S.flags.oint = 1; return '<p>In the villages are pig fat, sesame oil, bitter-almond oil and turpentine. The men rub it in before they march.</p>' + gain(0, 0, 3, -30); } }] },
    villages: { img: '🍺', t: 'The underground villages', x: '<p>The Armenian houses are dug into the ground, with an opening like a well and ladders down. Goats, sheep, cattle and fowl live inside with the people. There is wheat, barley, and a barley wine in great bowls, with the grains floating on top and reeds for straws.</p><p>The headman offers to guide you.</p>',
      h: 'Xenophon’s Armenian barley wine is one of the oldest descriptions of beer. He says it was very strong unless mixed with water, and “very pleasant to one used to it” (4.5.26). The village horses were being raised as tribute to the king.',
      c: [{ t: 'Rest a week and treat the headman as a friend', f: function () { for (var i = 0; i < 4; i++) oneDay(); S.W = Math.round(S.W * .5); S.flags.guide = 1; return '<p>The men feast, sing and sleep warm. The headman gives Xenophon a colt; you give it back to him fattened. His son stays as a hostage.</p>' + gain(12, 0, 15, 40) + mount(30); } },
        { t: 'Take food and horses and go', f: function () { return '<p>You take what you need and the colts for the cavalry.</p>' + gain(8, 0, 5, 20) + mount(40); } }] },
    phasians: { img: '⛰️', t: 'The Phasians hold the pass', x: '<p>The guide has fled in the night after Chirisophus struck him in anger for not finding villages. Now the Chalybes, Taochians and Phasians hold the pass ahead.</p>',
      h: 'Xenophon teases the Spartan Chirisophus here: Spartans are trained from boyhood to steal, so the army should “steal” a piece of the mountain. Chirisophus answers that Athenians are famous for stealing public money (4.6.14–16).',
      hide: function () { return S.flags.guide; },
      c: [{ t: '“Steal” a piece of the mountain by night', why: 'Xenophon’s plan', ok: function () { return S.P >= 200; }, f: function () { if (chance(.8)) return '<p>A night detachment takes the ridge above. At dawn the enemy sees Greeks on both sides and runs.</p>' + gain(4, 0, 8, 20); return '<p>Dawn comes too soon.</p>' + lossTxt(lose(200, .5)); } },
        { t: 'Attack straight up', f: function () { battle(foe('Tribesmen in the pass', 'pass', 4.8, 'They wait above on the ridge.', [4, 0, 30]), null); return { battle: true }; } }] },
    taochi: { img: '🏰', t: 'A Taochian stronghold', x: '<p>The Taochians live in strongholds where they have stored all their food. Your rations are gone. One fortress has cattle inside but stands on a cliff; the only approach is under a hail of rolling stones.</p>',
      h: 'Callimachus the captain dodged out from behind a tree to draw each volley of stones, then darted back; when the rocks ran out, the Greeks rushed the place. Xenophon tells the ending, a tragic one for the defenders, without flinching (4.7.2–14).',
      c: [{ t: 'Draw their stones, then rush the wall', f: function () { if (chance(.7)) return '<p>Callimachus makes a game of it, darting out to draw a volley and back to cover, until the stones run out. Agasias races him to the wall.</p>' + gain(10, 0, 6, 80); return '<p>Too many men are hit before the stones run out.</p>' + lossTxt(lose(250, .6)) + gain(6, 0, -2, 40); } },
        { t: 'Go hungry and march on', f: function () { return '<p>You leave the stronghold alone.</p>' + gain(-2, 0, -5); } }] },
    chalybes: { img: '🛡️', t: 'The Chalybes', x: '<p>The bravest people on the whole march. They wear linen corslets down to the groin with cords instead of skirts, greaves and helmets, a knife at the belt, and a spear twenty-two feet long. They cut off the heads of the men they kill.</p>',
      h: 'The Chalybes were famous in Greek legend as the first people to work iron. Xenophon says they lived mostly from mining and their land had little food, so the army lived on the cattle taken from the Taochians.',
      c: [{ t: 'Fight in line of battle', f: function () { battle(foe('The Chalybes', 'tribe', 6, 'They come down to fight hand to hand.', [0, 10, 0]), null); return { battle: true }; } },
        { t: 'Keep to the high ground and move fast', f: function () { oneDay(); oneDay(); var l = lose(men() * .015, .5); return '<p>They follow and fight the rearguard every day, but never catch the column.</p>' + lossTxt(l); } }] },
    gymnias: { img: '🏙️', t: 'The ruler of Gymnias', x: '<p>At Gymnias, a large and prosperous city, the ruler sends a guide. He promises to bring the Greeks within five days to a place where they can see the sea, on one condition: that they lay waste the land of his enemies on the way.</p>',
      h: 'This guide was as good as his word. At the end he was given a horse, a silver cup, a Persian robe and ten darics, and he asked for rings, and got many from the soldiers (4.7.27).',
      c: [{ t: 'Accept the bargain', f: function () { S.flags.gymnias = 1; return '<p>The guide leads the army through his enemies’ villages, which are burnt and plundered.</p>' + gain(8, 6, 4, 30); } },
        { t: 'Hire him with silver instead', why: '10 minae', ok: function () { return S.silver >= 10; }, f: function () { S.silver -= 10; S.flags.mercy = (S.flags.mercy || 0) + 1; return '<p>The guide shrugs and takes the silver.</p>' + gain(2, 0, 2); } }] },
    thalatta: { img: '🌊', t: '“Thalatta! Thalatta!”', x: '<p>On the fifth day the vanguard reaches the top of Mount Theches. Xenophon, at the rear, hears shouting and thinks it is an attack. He mounts his horse and rides forward with Lycius and the cavalry, and as he comes nearer he can hear what the soldiers are shouting:</p><p class="tt-big">“Thalatta! Thalatta!” <span>The sea! The sea!</span></p><p>Everyone runs, the rearguard too, the pack animals and the horses. At the top the soldiers embrace each other, and the generals and captains, with tears in their eyes.</p>',
      h: 'The most famous moment in the Anabasis (4.7.21–25). The soldiers built a great cairn of stones on the summit and laid on it the shields and spears they had captured.',
      c: [{ t: 'Build a cairn of stones and captured shields', f: function () { log('The sea! The army sees the Euxine.', 'good'); Kit.sfx.win(); return '<p>Every man carries a stone. The pile grows into a cairn and the captured wicker shields are laid on top.</p>' + gain(0, 0, 30); } }] },
    macrones: { img: '🗣️', t: 'The Macrones', x: '<p>A river blocks the way, and on the far bank stand the Macrones, armed and shouting. Then a peltast comes to Xenophon. He says he was once a slave in Athens, and he thinks he understands their language. He thinks this is his own country.</p>',
      h: 'The peltast talked to the Macrones, who asked why the Greeks had come. The two sides exchanged spears as a pledge: a Greek spear for a Macronian one, “for they said that was their custom” (4.8.7). The Macrones then helped them across.',
      c: [{ t: 'Let him speak to them', f: function () { log('The Macrones exchange spears with the Greeks in friendship.', 'good'); return '<p>He calls across the river, and they answer. Spears are exchanged as a pledge, and the Macrones cut down trees to help the army cross and hold a market.</p>' + gain(6, 0, 8); } },
        { t: 'Force the river', f: function () { battle(foe('The Macrones', 'tribe', 3.5, 'They line the far bank.', [3, 0, 10]), null); return { battle: true }; } }] },
    honey: { img: '🍯', t: 'The Colchians and the honey', x: '<p>The Colchians stand on a ridge to block the last mountain before the coast. Xenophon has the army attack in columns of companies, about eighty of them, with gaps between, so that the enemy line cannot cover them all.</p><p>Beyond the ridge are villages full of food, and many beehives.</p>',
      h: 'Soldiers who ate the honey lost their senses, vomited and could not stand; the army lay about “as if after a defeat”. They recovered on the next day or the day after (4.8.20). This is “mad honey”, from rhododendron nectar, still found around the Black Sea.',
      c: [{ t: 'Attack in columns; let the men eat their fill', f: function () { for (var i = 0; i < 2; i++) oneDay(); return '<p>The columns go up and the Colchians break. The men fall on the honey, and by evening the camp looks like a battlefield after a defeat. They recover two days later.</p>' + gain(8, 0, -6) + lossTxt(lose(40, 1)); } },
        { t: 'Attack, and forbid the honey', f: function () { return '<p>The ridge is taken. Most men obey the order. Most.</p>' + gain(6, 0, 2); } }] },
    cerasus: { img: '📋', t: 'Review at Cerasus', x: function () { return '<p>At Cerasus the army is counted under arms. Xenophon’s number was 8,600 hoplites. You have <b>' + men().toLocaleString() + '</b> fighting men.</p><p>The money from selling captives is shared out, and a tenth set aside for Apollo and Artemis of Ephesus.</p>'; },
      h: 'Xenophon later bought land at Scillus near Olympia with Artemis’ tenth and built a small copy of the Ephesian temple, with a yearly festival and hunting for all the neighbours (5.3.7–13).',
      c: [{ t: 'Set aside the god’s tenth', ok: function () { return S.silver >= 10; }, f: function () { S.silver -= 10; S.flags.tithe = 1; return '<p>The tenth is entrusted to the generals.</p>' + gain(0, 0, 8); } }, { t: 'Keep all the silver', f: function () { return '<p>Some of the men mutter about the gods.</p>' + gain(0, 0, -4); } }] },
    trapezus: { img: '🏆', t: 'Trapezus: games by the sea', x: '<p>Trapezus is a Greek city. The citizens send oxen, barley meal and wine. The army stays thirty days, sacrifices to Zeus the Saviour and Heracles, and holds games on the steep hill above the city.</p><p>A boys’ footrace, a long race for Cretans, wrestling, boxing and the pancration, and a horse race down the hillside into the sea and back up to the altar. Most horses roll down; few climb back.</p>',
      h: 'Dracontius the Spartan, exiled as a boy for killing another boy by accident, was put in charge of the games (4.8.25). The spectators shouted and laughed at the horses struggling up the slope.',
      c: [{ t: 'Hold the games', f: function () { return '<p>The men cheer each other hoarse.</p>' + gain(14, 0, 20, 20); } }] },
    cotyora: { img: '⚖️', t: 'Xenophon on trial', x: '<p>At Cotyora the army reviews its generals. Some soldiers accuse Xenophon of striking men on the march.</p><p>He answers that he struck a man who was burying a comrade alive to get out of carrying him, and others who lay down in the snow to die. “If I struck to save a life, judge me for that.”</p>',
      h: 'Xenophon defends himself at length in Anabasis 5.8, and the army acquits him. He admits he sometimes struck men to keep them moving, “just as a father strikes a son”.',
      c: [{ t: 'Make the speech', f: function () { return '<p>The army acquits him, and the men who knew him in the snow laugh at the accusers.</p>' + gain(0, 0, 8); } }] },
    sinope: { img: '⛵', t: 'Ships from Sinope', x: '<p>Envoys from Sinope arrive. The coast road ahead runs through Paphlagonia, where the horsemen are the best in Asia. They offer ships for part of the way.</p>',
      h: 'The army sailed from Cotyora to Sinope and on to Heraclea. They also offered the supreme command to Xenophon, which he refused after the omens of his sacrifice were bad. They elected Chirisophus instead (6.1.19–32).',
      c: [{ t: 'Hire the ships', why: '25 minae; saves days and the dangerous road', ok: function () { return S.silver >= 25; }, f: function () { S.silver -= 25; S.stage = 24; S.node = 0; S.path.push([24, 0]); return '<p>The fleet carries the army along the coast to Heraclea in a few days of fair wind.</p>' + gain(0, 0, 6); } },
        { t: 'March by land', f: function () { return '<p>The column sets off along the coast road.</p>'; } }] },
    heraclea: { img: '💔', t: 'The army splits', x: '<p>At Heraclea the army quarrels about money. The Arcadians and Achaeans, more than half the army, choose their own generals and leave. Chirisophus keeps his own men. Xenophon is left with about two thousand.</p>',
      h: 'The split was a disaster. The Arcadians were trapped on a hill by the Thracians of Bithynia, and Xenophon had to march to rescue them. Chirisophus died of a fever soon afterwards (6.2–6.4).',
      c: [{ t: 'Plead for unity', f: function () { if (chance(.55)) return '<p>For once the army listens.</p>' + gain(0, 0, 6); var l = lose(men() * .1, 0); return '<p>They go their own way. Later you must rescue them. ' + l + ' never come back.</p>' + gain(0, 0, -8); } },
        { t: 'Let them go; rescue them later', f: function () { var l = lose(men() * .07, .3); return '<p>The Arcadians land in Bithynia and are trapped on a hill. You march through the night lighting fires to make your force look larger, and the Thracians flee.</p>' + lossTxt(l) + gain(0, 0, 4); } }] },
    calpe: { img: '🌳', t: 'Calpe Harbour', x: '<p>A headland with a spring and a harbour, timber, fields and vines. Xenophon sees it would make a fine colony. The soldiers fear he means to keep them in Asia.</p>',
      h: 'Xenophon did think of founding a city on the Black Sea, and he never denied it. The soldiers wanted only to go home to Greece (5.6.15–6.4.7).',
      c: [{ t: 'Talk of a colony', f: function () { return '<p>The men suspect a trick, and the omens are bad. The plan is dropped.</p>' + gain(0, 0, -6); } }, { t: 'Promise to take them home', f: function () { return '<p>The army cheers and marches on.</p>' + gain(0, 0, 6); } }] }
  };
  STORY.byzantium = null; STORY.cerasus.next = null;
  function lossTxt(l) { return l ? '<p class="bad">' + l + ' men lost.</p>' : ''; }
  function mount(n) { n = n || 50; var h = Math.min(n, Math.floor(S.beasts / 4)); S.C += h; S.beasts -= h; S.H -= Math.min(S.H, h); return h ? '<p class="tt-fx">+' + h + ' horsemen</p>' : ''; }

  /* ---------- side roads ---------- */
  function generic(n) {
    var R = region();
    if (n.kind === 'village') return { img: '🏘️', t: 'Villages', x: R === 'arm' ? '<p>Snow lies on the roofs. Smoke rises from holes in the ground.</p>' : '<p>A cluster of mud-brick houses, the people hiding or watching.</p>',
      c: [{ t: 'Forage', f: function () { var food = 4 + Math.floor(Math.random() * 6); if (chance(R === 'card' || R === 'north' ? .45 : .2)) { battle(foe('Angry villagers', 'tribe', 1.6 + S.stage * .1, 'Men gather with spears and slings as the foragers spread out.', [food, 0, 20]), null); return { battle: true }; } return '<p>Barley, wheat, beans, and a few goats.</p>' + gain(food, 0, 2, 10); } },
        { t: 'Buy food peacefully', why: '8 minae', ok: function () { return S.silver >= 8; }, f: function () { S.silver -= 8; return '<p>The elders sell what they can spare.</p>' + gain(6, 0, 1); } }] };
    if (n.kind === 'market') return { img: '⚖️', t: 'A market', x: '<p>Traders have followed the army, or the town is willing to sell.</p>',
      c: [{ t: 'Buy 10 rations (12 minae)', ok: function () { return S.silver >= 12; }, f: function () { S.silver -= 12; return gain(10, 0, 1); } },
        { t: 'Sell 50 beasts (+10 minae)', ok: function () { return S.beasts >= 60; }, f: function () { S.beasts -= 50; return gain(0, 10, 0); } },
        { t: 'Hire 100 mercenary slingers (14 minae)', ok: function () { return S.silver >= 14; }, f: function () { S.silver -= 14; S.Sl += 100; return '<p>A hundred slingers join the march.</p>'; } },
        { t: 'Leave', f: function () { return ''; } }] };
    if (n.kind === 'shrine') return { img: '🔥', t: 'An altar by the road', x: '<p>An old altar stands in a grove. The seer offers to sacrifice for good omens.</p>',
      c: [{ t: 'Sacrifice a beast (−5 beasts)', ok: function () { return S.beasts >= 5; }, f: function () { S.beasts -= 5; return chance(.7) ? '<p>The omens are good.</p>' + gain(0, 0, 9) : '<p>The liver looks wrong. The men are uneasy.</p>' + gain(0, 0, -2); } },
        { t: 'Rest here two days', f: function () { oneDay(); oneDay(); S.W = Math.round(S.W * .7); return '<p>The wounded rest in the shade.</p>' + gain(0, 0, 5); } }] };
    if (n.kind === 'ford') return { img: '〰️', t: 'A river crossing', x: '<p>The river is cold and fast, but there are fish, reeds and water for the beasts.</p>',
      c: [{ t: 'Fish and refill the water skins', f: function () { oneDay(); return gain(3, 0, 2, 5); } }, { t: 'Cross at once', f: function () { if (chance(.25)) { var l = lose(40, 1); return '<p>A few men are swept away.</p>' + lossTxt(l) + gain(0, 0, 0, -10); } return '<p>Everyone gets across.</p>'; } }] };
    if (n.kind === 'hills') return chance(.5) ? { img: '⛰️', t: 'Ambush on the ridge', x: '<p>Tribesmen hiding in the rocks above.</p>', c: [{ t: 'Fight', f: function () { battle(foe('Hill tribesmen', R === 'mes' ? 'horse' : 'tribe', 2 + S.stage * .12, 'They hold the slope above you.', [3, 4, 10]), null); return { battle: true }; } }] }
      : { img: '⛰️', t: 'A quiet climb', x: '<p>The high ground is empty. The men can see far ahead and sleep easier.</p>', c: [{ t: 'March on', f: function () { return gain(0, 0, 4); } }] };
    // wild
    var r = Math.random();
    if (r < .33) return { img: '🦌', t: 'Game in the woods', x: '<p>Wild asses, ostriches and bustards on the plains, or deer in the hills. The horsemen try to run them down.</p>', c: [{ t: 'Hunt', f: function () { return S.C >= 30 ? '<p>The horsemen take turns chasing, like a relay. Good meat tonight.</p>' + gain(4, 0, 3) : '<p>Without horses the beasts outrun everyone.</p>' + gain(1, 0, 0); } }, { t: 'March on', f: function () { return ''; } }] };
    if (r < .66) return { img: '🌫️', t: 'Lost in the mist', x: '<p>The scouts have lost the way.</p>', c: [{ t: 'Wait for the mist to lift', f: function () { oneDay(); return '<p>A day lost, but the road is found.</p>'; } }, { t: 'Press on by guesswork', f: function () { if (chance(.5)) return '<p>A lucky guess.</p>'; oneDay(); oneDay(); return '<p>Two days of wandering.</p>' + gain(0, 0, -4); } }] };
    return { img: '🎒', t: 'Abandoned baggage', x: '<p>An abandoned camp: sacks, a few mules, a chest.</p>', c: [{ t: 'Take it', f: function () { return gain(3, Math.floor(Math.random() * 8), 1, 15); } }] };
  }

  /* ---------- acts and ending ---------- */
  function actOne() {
    var sc = score();
    $('#ev').innerHTML = '<p class="chip">The sea</p><h2>🏆 You reached Trapezus</h2><p>After ' + S.day + ' days, ' + men().toLocaleString() + ' men stand on the shore of the Euxine Sea. Xenophon reached it in about five months with roughly 8,600 hoplites still in the ranks.</p><p>Score so far: <b>' + sc + '</b></p>' +
      '<p class="mute">The march is not over: the coast road to Byzantium lies ahead, with new quarrels, ships, a split army and a city that shuts its gates.</p><div class="krow"><button class="btn gold" id="a-on">March on to Byzantium</button><button class="btn ghost" id="a-end">End here</button></div>';
    Kit.sfx.win();
    $('#a-on').onclick = function () { S.act = 2; save(); back(); };
    $('#a-end').onclick = function () { end(true); };
  }
  function score() { return Math.max(0, Math.round(men() * 1 + S.food * 20 + S.silver * 10 + S.morale * 15 - S.day * 15 + (S.act === 2 && stage().endAct === 2 ? 3000 : 0) + (S.mode === 'hard' ? 1500 : 0))); }
  function end(won, why) {
    S.over = true; Kit.store.set('tt-save', null); var sc = won ? score() : 0, best = Kit.store.get('tt-best', 0);
    if (won && sc > best) Kit.store.set('tt-best', sc);
    if (won) Kit.sfx.win(); else Kit.sfx.bad();
    var byz = stage().endAct === 2;
    $('#ev').innerHTML = '<h2>' + (won ? (byz ? '🏛️ Byzantium' : '🌊 Home by the sea') : '💀 The march ends') + '</h2>' +
      (won ? '<p>' + (byz ? 'The army reaches Byzantium. When the Spartan admiral shuts them outside the walls, the soldiers break in, and Xenophon talks them out of sacking a Greek city. They take service with the Thracian prince Seuthes, and finally with Sparta.' : 'The Ten Thousand have come home to the Greek world.') + '</p><p><b>' + men().toLocaleString() + '</b> men survived of ' + S.start.toLocaleString() + ', in ' + S.day + ' days.</p><p>Score <b>' + sc + '</b>' + (sc > best ? ' · a new best!' : ' · best ' + best) + '</p>'
        : '<p>' + why + '</p>') +
      '<p class="mute small">You found ' + S.notes.length + ' notes from the Anabasis. Open the journal (📜) to read them.</p><div class="krow"><button class="btn gold" id="x-new">March again</button><button class="btn ghost" id="x-hard">Hard march</button></div>';
    $('#x-new').onclick = function () { newGame('normal'); }; $('#x-hard').onclick = function () { newGame('hard'); };
  }

  /* ---------- hud ---------- */
  function hud() {
    var m = Math.round(S.morale), f = S.food;
    $('#res').innerHTML = [['📅', 'Day', S.day], ['🛡️', 'Hoplites', S.H], ['🗡️', 'Peltasts', S.P], ['🎯', 'Slingers & archers', S.Sl + S.A], ['🐎', 'Horsemen', S.C], ['🩹', 'Wounded', S.W], ['🌾', 'Rations (days)', f, f <= 3 ? 'bad' : ''], ['🪙', 'Silver (minae)', S.silver], ['🐂', 'Beasts', S.beasts], ['🔥', 'Morale', m, m < 30 ? 'bad' : m > 70 ? 'good' : '']]
      .map(function (r) { return '<span class="' + (r[3] || '') + '" title="' + r[1] + '">' + r[0] + ' <b>' + Math.round(r[2]).toLocaleString() + '</b><small>' + r[1] + '</small></span>'; }).join('');
    $('#pace').innerHTML = '<span class="mute small">Pace</span><div class="seg">' + [['steady', 'Steady'], ['forced', 'Forced march']].map(function (p) { return '<button class="' + (S.pace === p[0] ? 'on' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div><span class="mute small">' + men().toLocaleString() + ' fighting men · ' + S.leaders.join(', ') + '</span>';
    Kit.$$('[data-p]').forEach(function (b) { b.onclick = function () { S.pace = b.dataset.p; hud(); }; });
  }
  function save() { if (!S.over) Kit.store.set('tt-save', { S: S }); }
  function newGame(mode) {
    fresh(mode); renderLog(); hud(); log('The army stands at Cunaxa, ' + men().toLocaleString() + ' strong.'); show(STORY.cunaxa); S.path = [[0, 0]];
  }
  function help() {
    Kit.modal('<h2>The Ten Thousand</h2><p>In 401 BC about ten thousand Greek mercenaries were stranded deep in the Persian Empire, their employer dead and their generals murdered. Xenophon, a young Athenian, helped lead them home through Mesopotamia, the Carduchian mountains and the snows of Armenia to the Black Sea. He wrote it all down in the <i>Anabasis</i>.</p>' +
      '<ul><li>Choose the next stop on the map. ⚑ is the historical road and its story; side roads have food, markets, shrines, or trouble.</li><li>Each day eats one ration. Without food, men starve and straggle. In the snows, cold takes men every day unless they are anointed against frostbite.</li><li>Wounded men recover slowly and slow the march. Forced marches are faster but cost morale and lives.</li><li>In battle, pick tactics that suit the enemy: a hollow square against horsemen, the heights against men holding a pass, slingers against archers.</li><li>If morale falls to nothing, or fewer than 700 men are left, the army dissolves.</li></ul><div class="krow"><button class="btn gold" data-close>March</button></div>');
  }
  function journal() {
    var all = Kit.store.get('tt-notes', {}), ks = Object.keys(all);
    Kit.modal('<h2>📜 Xenophon’s journal</h2><p class="mute small">Notes from the Anabasis you have found on your marches: ' + ks.length + ' of ' + Object.keys(STORY).filter(function (k) { return STORY[k] && STORY[k].h; }).length + '.</p>' + (ks.length ? ks.map(function (k) { return '<details><summary><b>' + esc(k) + '</b></summary><p>' + esc(all[k]) + '</p></details>'; }).join('') : '<p>No notes yet.</p>') + '<div class="krow"><button class="btn" data-close>Close</button></div>');
  }
  $('#b-help').onclick = help; $('#b-journal').onclick = journal;
  $('#b-snd').onclick = function () { $('#b-snd').textContent = Kit.sfx.toggle() ? '🔊' : '🔇'; }; if (!Kit.sfx.on) $('#b-snd').textContent = '🔇';

  var sv = Kit.store.get('tt-save', null);
  if (sv && sv.S && !sv.S.over) { S = sv.S; nodes = build(S.seed); renderLog(); hud(); back(); Kit.toast('Your march continues where you left it.'); }
  else { newGame('normal'); if (!Kit.store.get('tt-seen', 0)) { Kit.store.set('tt-seen', 1); help(); } }

  window.TT = { view: view, get S() { return S; }, go: go, choices: choices, STORY: STORY, newGame: newGame, back: back, oneDay: oneDay, men: men };
})();
