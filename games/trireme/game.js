/* Trireme Trader: a merchant-adventurer game in the spirit of Sid Meier's Pirates! and Port Royale, set in the
   Mediterranean around 400 BC. Buy cheap, sell dear, take contracts, survive storms and ram pirates. */
(function () {
  'use strict';
  var $ = Kit.$, esc = Kit.esc;
  Kit.bar('Trireme Trader', [['b-fleet', '⛵', 'Your fleet'], ['b-log', '📜', 'Ledger'], ['b-help', '?', 'How to play']]);
  var main = document.createElement('main'); main.className = 'tr'; document.body.appendChild(main);
  main.innerHTML = '<div class="tr-top" id="top"></div><div class="tr-stage"><canvas id="cv"></canvas><div class="tr-side card" id="side"></div><div class="tr-msg" id="msg"></div></div>';
  var cv = $('#cv'), ctx = cv.getContext('2d');

  /* ---------- geography ---------- */
  var MED = [[-5.6, 36.1], [-4.4, 36.7], [-1, 37.6], [-0.3, 39.5], [0.9, 40.8], [2.2, 41.4], [3.2, 42.5], [4.8, 43.4], [5.4, 43.25], [7.3, 43.7], [8.9, 44.4], [9.8, 44.1], [10.5, 43], [11.2, 42.4], [12.3, 41.7], [13.6, 41.2], [14.3, 40.8], [14.8, 40.5], [15.6, 40.0], [15.8, 38.8], [15.6, 38.0], [16.1, 38.0], [16.6, 38.4], [17.1, 39.0], [17.2, 39.4], [16.9, 40.4], [17.6, 40.3], [18.5, 39.8], [18.5, 40.2], [17.9, 40.6], [16.9, 41.1], [16.1, 41.9], [14.7, 42.1], [13.5, 43.6], [12.6, 44.1], [12.3, 45.4], [13.7, 45.6], [13.9, 44.8], [15.2, 44.1], [16.4, 43.5], [18.1, 42.6], [19.4, 41.9], [19.5, 41.3], [19.4, 40.4], [20.0, 39.6], [20.7, 39.0], [21.1, 38.4], [21.6, 38.35], [22.9, 38.15], [21.9, 38.05], [21.3, 38.0], [21.1, 37.6], [21.7, 36.8], [22.4, 36.4], [22.5, 36.8], [23.0, 36.4], [23.2, 37.0], [22.9, 37.6], [23.05, 37.9], [23.6, 37.9], [24.0, 37.65], [24.1, 38.2], [23.4, 38.5], [22.9, 39.3], [22.6, 40.2], [22.9, 40.6], [23.4, 40.2], [24.0, 40.3], [24.4, 40.9], [25.9, 40.85], [26.45, 40.55], [27.5, 40.95], [28.8, 41.0], [28.85, 41.35], [28.6, 41.6], [28.0, 42.5], [28.6, 43.4], [28.8, 44.2], [29.7, 45.2], [30.7, 46.4], [31.8, 46.6], [33.5, 46.0], [32.6, 45.4], [33.6, 44.5], [34.5, 44.8], [35.4, 45.1], [36.6, 45.4], [37.5, 44.6], [38.8, 44.2], [39.8, 43.5], [41.5, 42.0], [41.6, 41.6], [40.5, 41.1], [39.7, 41.08], [38.4, 41.0], [37.0, 41.2], [36.0, 41.7], [35.2, 42.08], [33.5, 42.0], [31.4, 41.3], [30.2, 41.2], [29.35, 41.25], [29.25, 40.95], [29.8, 40.7], [28.9, 40.4], [27.6, 40.35], [26.75, 40.25], [26.5, 40.0], [26.1, 39.5], [26.8, 39.2], [26.8, 38.7], [26.4, 38.4], [27.1, 38.4], [26.4, 38.0], [27.2, 37.9], [27.3, 37.5], [27.4, 37.0], [28.0, 36.8], [28.2, 36.6], [29.2, 36.6], [30.4, 36.3], [30.6, 36.9], [31.8, 36.6], [32.6, 36.1], [34.0, 36.3], [34.9, 36.8], [36.1, 36.6], [35.9, 36.0], [35.8, 35.5], [35.9, 34.6], [35.5, 33.9], [35.2, 33.3], [34.9, 32.8], [34.5, 31.6], [33.8, 31.2], [32.3, 31.3], [31.0, 31.6], [29.9, 31.2], [28.0, 31.1], [25.2, 31.6], [24.0, 32.0], [23.0, 32.6], [22.0, 32.9], [20.1, 32.2], [19.9, 31.2], [19.0, 30.3], [16.5, 31.2], [15.2, 32.3], [13.2, 32.9], [11.5, 33.2], [10.5, 33.8], [10.9, 35.0], [11.0, 35.5], [10.5, 36.4], [11.1, 37.0], [10.3, 36.85], [10.0, 37.3], [8.6, 36.9], [7.0, 37.0], [5.0, 36.8], [3.0, 36.8], [1.0, 36.5], [-1.0, 35.7], [-2.2, 35.1], [-4.0, 35.2], [-5.3, 35.9], [-7.5, 35.6], [-7.5, 36.9], [-6.2, 36.8]];
  var ISLES = [[[12.4, 38.1], [13.4, 38.2], [15.6, 38.3], [15.1, 37.3], [15.2, 36.7], [14.4, 36.8], [12.6, 37.6]], [[8.4, 41.0], [9.6, 41.1], [9.8, 40.0], [9.6, 39.1], [8.9, 38.9], [8.4, 39.1], [8.5, 40.2]], [[9.4, 43.0], [9.6, 42.4], [9.3, 41.4], [8.7, 41.6], [8.6, 42.3]], [[23.5, 35.6], [24.3, 35.45], [25.6, 35.35], [26.3, 35.25], [26.1, 35.0], [24.8, 34.9], [23.6, 35.2]], [[32.3, 35.0], [33.0, 35.4], [34.6, 35.7], [33.9, 35.1], [33.6, 34.6], [32.4, 34.7]], [[27.7, 36.2], [28.2, 36.45], [28.1, 35.9], [27.7, 35.95]], [[22.8, 39.0], [23.4, 38.9], [24.6, 38.1], [24.2, 38.0], [23.5, 38.5]], [[25.9, 39.3], [26.4, 39.4], [26.6, 39.0], [26.0, 39.0]], [[2.4, 39.9], [3.4, 39.8], [3.2, 39.3], [2.4, 39.5]], [[25.85, 38.6], [26.15, 38.55], [26.1, 38.2], [25.9, 38.3]]];
  var DOTS = [[25.4, 37.1, .22], [25.2, 37.45, .1], [24.9, 37.7, .15], [25.4, 36.4, .15], [24.6, 36.75, .14], [14.5, 35.9, .1], [20.7, 38.3, .16], [19.9, 39.6, .2], [27.0, 37.75, .2], [26.9, 36.9, .12], [24.6, 40.65, .15], [23.4, 37.7, .12]];
  var LON0 = -7.5, LON1 = 42.5, LAT0 = 29.5, LAT1 = 47.2;

  // sea mask and paths
  var GR = 4, GW = Math.round((LON1 - LON0) * GR), GH = Math.round((LAT1 - LAT0) * GR), sea;
  function buildMask() {
    var c = document.createElement('canvas'); c.width = GW; c.height = GH; var g = c.getContext('2d');
    function P(p) { return [(p[0] - LON0) * GR, (LAT1 - p[1]) * GR]; }
    function fill(poly, col) { g.beginPath(); poly.forEach(function (q, i) { var a = P(q); i ? g.lineTo(a[0], a[1]) : g.moveTo(a[0], a[1]); }); g.closePath(); g.fillStyle = col; g.fill(); }
    g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH); fill(MED, '#fff'); ISLES.forEach(function (p) { fill(p, '#000'); });
    var d = g.getImageData(0, 0, GW, GH).data; sea = new Uint8Array(GW * GH); for (var i = 0; i < GW * GH; i++) sea[i] = d[i * 4] > 128 ? 1 : 0;
  }
  function cell(lon, lat) { return [Math.floor((lon - LON0) * GR), Math.floor((LAT1 - lat) * GR)]; }
  function nearestSea(lon, lat) { var c = cell(lon, lat); for (var r = 0; r < 8; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var x = c[0] + dx, y = c[1] + dy; if (x >= 0 && y >= 0 && x < GW && y < GH && sea[y * GW + x]) return [x, y]; } return c; }
  function path(a, b) { // A* on the sea grid, 8-way
    var s = nearestSea(a[0], a[1]), t = nearestSea(b[0], b[1]), N = GW * GH, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), open = [[0, s[1] * GW + s[0]]], T = t[1] * GW + t[0];
    gs[open[0][1]] = 0;
    var closed = new Uint8Array(N), i;
    function hpush(it) { open.push(it); var k = open.length - 1; while (k) { var pa = (k - 1) >> 1; if (open[pa][0] <= open[k][0]) break; var tmp = open[pa]; open[pa] = open[k]; open[k] = tmp; k = pa; } }
    function hpop() { var top = open[0], last = open.pop(); if (open.length) { open[0] = last; var k = 0; for (;;) { var l = 2 * k + 1, r = l + 1, m = k; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === k) break; var tmp = open[m]; open[m] = open[k]; open[k] = tmp; k = m; } } return top; }
    while (open.length) {
      var cur = hpop()[1]; if (closed[cur]) continue; closed[cur] = 1; if (cur === T) break;
      var cx = cur % GW, cy = (cur / GW) | 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= GW || y >= GH) continue; var n = y * GW + x; if (!sea[n] && n !== T) continue; var cst = gs[cur] + (dx && dy ? 1.414 : 1) + (coastal(x, y) ? 0 : .15); if (cst < gs[n]) { gs[n] = cst; from[n] = cur; hpush([cst + Math.hypot(x - t[0], y - t[1]), n]); } }
    }
    var out = [], c = T; while (c >= 0 && c !== s[1] * GW + s[0]) { out.push([(c % GW + .5) / GR + LON0, LAT1 - (((c / GW) | 0) + .5) / GR]); c = from[c]; }
    out.push([(s[0] + .5) / GR + LON0, LAT1 - (s[1] + .5) / GR]); out.reverse(); out[0] = a.slice(); out.push(b.slice());
    // smooth
    for (var k = 0; k < 2; k++) for (i = 1; i < out.length - 1; i++) out[i] = [(out[i - 1][0] + out[i][0] * 2 + out[i + 1][0]) / 4, (out[i - 1][1] + out[i][1] * 2 + out[i + 1][1]) / 4];
    return out;
  }
  function coastal(x, y) { for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < GW && Y < GH && !sea[Y * GW + X]) return true; } return false; }
  function plen(p) { var l = 0; for (var i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; }

  /* ---------- ports and goods ---------- */
  var GOODS = {
    grain: { n: 'Grain', p: 10, i: '🌾' }, wine: { n: 'Wine', p: 22, i: '🍷' }, oil: { n: 'Olive oil', p: 20, i: '🫒' }, pottery: { n: 'Painted pottery', p: 26, i: '🏺' },
    timber: { n: 'Timber', p: 16, i: '🪵' }, fish: { n: 'Salt fish', p: 14, i: '🐟' }, tin: { n: 'Tin', p: 60, i: '🪨' }, copper: { n: 'Copper', p: 40, i: '🟠' },
    silver: { n: 'Silver', p: 110, i: '🪙' }, purple: { n: 'Tyrian purple', p: 150, i: '🟣' }, papyrus: { n: 'Papyrus', p: 45, i: '📜' }, glass: { n: 'Glass', p: 55, i: '🔮' },
    incense: { n: 'Incense', p: 90, i: '💨' }, marble: { n: 'Marble', p: 35, i: '🏛️' }
  };
  var PORTS = [
    { id: 'athens', n: 'Athens (Piraeus)', lon: 23.64, lat: 37.94, make: ['oil', 'pottery', 'silver', 'marble'], want: ['grain', 'timber', 'fish', 'tin'], yard: 1, h: 'Athens lived on imported grain, much of it from the Black Sea, paid for with olive oil, painted pottery and silver from the mines at Laurion. The Piraeus was its harbour, joined to the city by the Long Walls.' },
    { id: 'corinth', n: 'Corinth', lon: 22.95, lat: 37.92, make: ['pottery', 'copper'], want: ['tin', 'grain', 'purple'], yard: 1, h: 'Corinth sat on the isthmus between two seas. Ships were dragged across on the diolkos, a stone trackway, to avoid the dangerous voyage round the Peloponnese. Corinthian bronze was famous.' },
    { id: 'syracuse', n: 'Syracuse', lon: 15.29, lat: 37.07, make: ['grain', 'wine'], want: ['pottery', 'purple', 'silver'], yard: 1, h: 'The richest Greek city of the west. Sicily was one of the great grain baskets of the ancient world.' },
    { id: 'carthage', n: 'Carthage', lon: 10.32, lat: 36.85, make: ['purple', 'grain', 'tin'], want: ['wine', 'oil', 'pottery'], yard: 1, h: 'The great Phoenician city of the west, founded from Tyre. Its circular military harbour could hold 220 warships, and its merchants guarded the routes to the tin of the Atlantic.' },
    { id: 'massalia', n: 'Massalia', lon: 5.37, lat: 43.29, make: ['wine', 'tin'], want: ['oil', 'pottery', 'papyrus'], h: 'A Greek colony at the mouth of the Rhône. Tin from Britain came overland through Gaul to Massalia. The explorer Pytheas sailed from here to Britain around 325 BC.' },
    { id: 'gadir', n: 'Gadir', lon: -6.29, lat: 36.53, make: ['tin', 'silver', 'fish'], want: ['wine', 'oil', 'glass', 'purple'], h: 'Gadir (Cádiz), beyond the Pillars of Heracles, was founded by Phoenicians from Tyre. It was the door to the silver of Spain and the tin of the north.' },
    { id: 'ostia', n: 'Rome (Ostia)', lon: 12.29, lat: 41.75, make: ['timber'], want: ['grain', 'purple', 'incense', 'marble', 'glass'], h: 'Around 400 BC Rome was a growing city in Latium, not yet master of Italy. Its port was at Ostia, at the mouth of the Tiber.' },
    { id: 'neapolis', n: 'Neapolis', lon: 14.25, lat: 40.83, make: ['wine', 'grain'], want: ['pottery', 'papyrus'], h: 'Neapolis means “new city”: today it is Naples. The wine of Campania was among the best in Italy.' },
    { id: 'tarentum', n: 'Taras', lon: 17.24, lat: 40.47, make: ['purple', 'fish', 'wine'], want: ['pottery', 'silver'], h: 'The only Spartan colony, Taras (Taranto) was rich from wool dyed with purple and from fishing.' },
    { id: 'delos', n: 'Delos', lon: 25.27, lat: 37.4, make: [], want: ['incense', 'purple', 'wine', 'grain'], h: 'The sacred island of Apollo, birthplace of the god. Later it became a huge free port and a centre of the slave trade.' },
    { id: 'rhodes', n: 'Rhodes', lon: 28.22, lat: 36.44, make: ['wine', 'pottery'], want: ['grain', 'timber', 'copper'], yard: 1, h: 'Rhodes was founded as one city in 408 BC. Its sea law became the model for later maritime law, and later it built the Colossus.' },
    { id: 'miletus', n: 'Miletus', lon: 27.28, lat: 37.53, make: ['oil', 'wine', 'pottery'], want: ['fish', 'grain', 'tin'], h: 'Miletus founded more colonies than any other Greek city, especially round the Black Sea. Thales, the first philosopher, was a Milesian.' },
    { id: 'byzantium', n: 'Byzantium', lon: 28.98, lat: 41.01, make: ['fish', 'timber'], want: ['oil', 'wine', 'pottery'], h: 'Byzantium controlled the Bosporus, the strait every Black Sea grain ship had to pass. Shoals of tunny swam past its harbour, the Golden Horn.' },
    { id: 'sinope', n: 'Sinope', lon: 35.15, lat: 42.02, make: ['timber', 'fish'], want: ['oil', 'wine', 'pottery'], yard: 1, h: 'A Milesian colony on the Black Sea, famous for its tunny fishing and its red earth pigment. Diogenes the Cynic was born here.' },
    { id: 'pantic', n: 'Panticapaeum', lon: 36.47, lat: 45.35, make: ['grain', 'fish'], want: ['wine', 'oil', 'pottery', 'silver'], h: 'Capital of the Bosporan kingdom in the Crimea. Its kings sent huge shipments of grain to Athens, which honoured them as citizens.' },
    { id: 'olbia', n: 'Olbia', lon: 31.9, lat: 46.6, make: ['grain', 'fish', 'timber'], want: ['wine', 'oil', 'pottery'], h: 'Olbia, “the happy city”, traded Greek wine and pottery with the Scythians for grain. Herodotus visited it.' },
    { id: 'tyre', n: 'Tyre', lon: 35.2, lat: 33.27, make: ['purple', 'glass', 'timber', 'incense'], want: ['silver', 'tin', 'grain'], yard: 1, h: 'Tyre was an island city and the greatest port of Phoenicia. Its purple dye, made from millions of murex sea snails, was worth more than its weight in silver. Alexander besieged it in 332 BC.' },
    { id: 'salamis', n: 'Salamis (Cyprus)', lon: 33.9, lat: 35.18, make: ['copper', 'timber'], want: ['oil', 'pottery', 'grain'], h: 'Cyprus was so rich in copper that the metal is named after the island. Salamis was its leading city.' },
    { id: 'alexandria', n: 'Naucratis (Nile)', lon: 29.9, lat: 31.2, make: ['grain', 'papyrus', 'incense', 'glass'], want: ['wine', 'oil', 'silver', 'timber'], h: 'Before Alexandria was founded, Greek trade with Egypt went through Naucratis in the Nile Delta. Egypt had grain, papyrus and linen, but almost no timber or silver.' },
    { id: 'cyrene', n: 'Cyrene', lon: 21.85, lat: 32.88, make: ['grain', 'incense'], want: ['wine', 'pottery', 'oil'], h: 'Cyrene’s fortune was silphium, a plant used as medicine and seasoning, now extinct. It also exported grain and horses.' },
    { id: 'knossos', n: 'Knossos (Crete)', lon: 25.13, lat: 35.34, make: ['oil', 'wine'], want: ['pottery', 'grain', 'timber'], h: 'Crete was ancient already: the palace of Knossos, home of the legends of Minos and the Minotaur, had fallen a thousand years before. Cretan archers were hired by every army.' }
  ];
  var BYID = {}; PORTS.forEach(function (p) { BYID[p.id] = p; });
  // regions where pirates hunt (lon, lat, radius, strength)
  var PIRATE_LAIRS = [[33.0, 36.3, 3.2, 1.5, 'Cilician'], [19.5, 41.5, 2.5, 1.2, 'Illyrian'], [24.5, 35.8, 2.2, 1.0, 'Cretan'], [9.0, 39.5, 3, .8, 'Etruscan'], [38, 43.5, 3.5, 1.1, 'Taurian']];
  var SHIPS = {
    pentekonter: { n: 'Pentekonter', cargo: 30, speed: 1.15, hull: 40, crew: 50, ram: .8, cost: 600, d: 'An old fifty-oared galley: fast for its size, small hold.' },
    holkas: { n: 'Holkas', cargo: 110, speed: .8, hull: 55, crew: 14, ram: .3, cost: 900, d: 'A round-bellied merchant ship under sail. Slow, roomy, cheap to crew, useless for ramming.' },
    hemiolia: { n: 'Hemiolia', cargo: 40, speed: 1.35, hull: 45, crew: 60, ram: .9, cost: 1400, d: 'The pirates’ favourite: a light, fast galley that can lower its mast and row.' },
    trireme: { n: 'Trireme', cargo: 15, speed: 1.6, hull: 60, crew: 170, ram: 1.5, cost: 3500, d: '170 rowers in three banks and a bronze ram. The deadliest ship of the age, but expensive to man.' },
    corbita: { n: 'Great merchantman', cargo: 260, speed: .7, hull: 90, crew: 26, ram: .3, cost: 4500, d: 'A big cargo ship that can carry 250 tonnes. Slow and fat, a prize for pirates.' },
    quinquereme: { n: 'Quinquereme', cargo: 50, speed: 1.3, hull: 120, crew: 300, ram: 1.7, cost: 9000, d: 'A huge war galley with five men to each set of oars and marines on deck.' }
  };

  /* ---------- state ---------- */
  var S;
  function fresh() {
    S = { money: 600, day: 0, year: -400, at: 'athens', pos: [23.64, 37.94], fleet: [{ k: 'holkas', n: 'Glaukos', hull: 55 }], cargo: {}, paid: {}, market: {}, contracts: [], done: 0, sunk: 0, rep: 0, log: [], hist: {}, over: false };
    PORTS.forEach(function (p) { S.market[p.id] = {}; Object.keys(GOODS).forEach(function (g) { S.market[p.id][g] = p.make.indexOf(g) >= 0 ? 140 + Math.random() * 40 : p.want.indexOf(g) >= 0 ? 20 + Math.random() * 30 : 70 + Math.random() * 30; }); });
    S.contracts = []; note('athens');
  }
  function cap() { return S.fleet.reduce(function (a, s) { return a + SHIPS[s.k].cargo; }, 0); }
  function load() { return Object.keys(S.cargo).reduce(function (a, g) { return a + S.cargo[g]; }, 0); }
  function crew() { return S.fleet.reduce(function (a, s) { return a + SHIPS[s.k].crew; }, 0); }
  function speed() { return Math.min.apply(null, S.fleet.map(function (s) { return SHIPS[s.k].speed; })); }
  function flag() { var best = S.fleet[0]; S.fleet.forEach(function (s) { if (SHIPS[s.k].ram > SHIPS[best.k].ram) best = s; }); return best; }
  function wages() { return Math.round(crew() * .12 + S.fleet.length * 2); }
  function price(pid, g, sell) {
    var p = BYID[pid], st = S.market[pid][g], base = GOODS[g].p, f = 1.75 - Math.min(200, st) / 200 * 1.2; // 0.55 .. 1.75
    if (p.make.indexOf(g) < 0 && p.want.indexOf(g) < 0) f = Math.max(.8, Math.min(1.3, f));
    var v = base * f; return Math.max(1, Math.round(sell ? v * .88 : v));
  }
  function season() { var m = Math.floor((S.day % 360) / 30); return m >= 7 && m <= 11 ? 'winter' : 'summer'; } // year starts in spring
  var MONTHS = ['Spring', 'Late spring', 'Early summer', 'Summer', 'High summer', 'Late summer', 'Autumn', 'Late autumn', 'Early winter', 'Winter', 'Deep winter', 'Late winter'];
  function dateTxt() { var y = S.year + Math.floor(S.day / 360); return MONTHS[Math.floor((S.day % 360) / 30)] + ', ' + (y < 0 ? -y + ' BC' : 'AD ' + y); }
  function rank() { var w = worth(); return w >= 100000 ? 'Richer than Croesus' : w >= 30000 ? 'Pentakosiomedimnos' : w >= 12000 ? 'Hippeus (knight)' : w >= 4000 ? 'Zeugites' : 'Thete'; }
  function worth() { var v = S.money; S.fleet.forEach(function (s) { v += SHIPS[s.k].cost * .6; }); Object.keys(S.cargo).forEach(function (g) { v += S.cargo[g] * GOODS[g].p * .8; }); return Math.round(v); }

  /* ---------- markets over time ---------- */
  function drift(days) {
    PORTS.forEach(function (p) { Object.keys(GOODS).forEach(function (g) {
      var st = S.market[p.id][g], target = p.make.indexOf(g) >= 0 ? 160 : p.want.indexOf(g) >= 0 ? 35 : 85;
      st += (target - st) * Math.min(1, .02 * days) + (Math.random() - .5) * 3 * Math.sqrt(days); S.market[p.id][g] = Math.max(0, Math.min(220, st));
    }); });
    if (Math.random() < days / 40) { var p = PORTS[Math.floor(Math.random() * PORTS.length)], gs = Object.keys(GOODS), g = gs[Math.floor(Math.random() * gs.length)], up = Math.random() < .5; S.market[p.id][g] = up ? 5 : 210; S.rumour = up ? GOODS[g].n + ' is scarce in ' + p.n + ': prices are high.' : 'A glut of ' + GOODS[g].n.toLowerCase() + ' in ' + p.n + ': it sells cheap.'; }
  }

  /* ---------- drawing the map ---------- */
  var cam = { x: 20, y: 38.5, s: 22 }, hoverPort = null, route = null, voyage = null, t0 = 0;
  function px(lon, lat) { return [cv.width / 2 + (lon - cam.x) * cam.s, cv.height / 2 - (lat - cam.y) * cam.s * 1.25]; }
  function unpx(x, y) { return [(x - cv.width / 2) / cam.s + cam.x, cam.y - (y - cv.height / 2) / (cam.s * 1.25)]; }
  function poly(p, fill, stroke) { ctx.beginPath(); p.forEach(function (q, i) { var a = px(q[0], q[1]); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
  function drawMap() {
    var dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); fitCam(); }
    var dark = document.documentElement.dataset.theme === 'dark';
    ctx.fillStyle = dark ? '#5b4d36' : '#e3cf9e'; ctx.fillRect(0, 0, cv.width, cv.height);
    var seaC = dark ? '#18405e' : '#5d93b8';
    poly(MED, seaC, dark ? '#2a5a7a' : '#8ab6d3'); ISLES.forEach(function (p) { poly(p, dark ? '#5b4d36' : '#e3cf9e', dark ? '#2a5a7a' : '#8ab6d3'); });
    DOTS.forEach(function (d) { var a = px(d[0], d[1]); ctx.beginPath(); ctx.arc(a[0], a[1], d[2] * cam.s, 0, 7); ctx.fillStyle = dark ? '#5b4d36' : '#e3cf9e'; ctx.fill(); });
    // waves
    ctx.strokeStyle = dark ? 'rgba(180,220,255,.12)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2;
    for (var i = 0; i < 70; i++) { var wl = LON0 + ((i * 7.31) % (LON1 - LON0)), wt = LAT0 + ((i * 3.77) % (LAT1 - LAT0)), c = cell(wl, wt); if (!sea[c[1] * GW + c[0]]) continue; var a = px(wl + Math.sin(t0 * .4 + i) * .2, wt); ctx.beginPath(); ctx.arc(a[0], a[1], 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    // pirate waters
    PIRATE_LAIRS.forEach(function (L) { var a = px(L[0], L[1]); ctx.beginPath(); ctx.arc(a[0], a[1], L[2] * cam.s * .8, 0, 7); ctx.fillStyle = 'rgba(160,30,20,.07)'; ctx.fill(); ctx.font = '600 ' + Math.max(10, cam.s * .45) + 'px Cinzel,serif'; ctx.fillStyle = 'rgba(140,30,20,.5)'; ctx.textAlign = 'center'; ctx.fillText('☠ ' + L[4], a[0], a[1]); });
    ctx.font = 'italic ' + Math.max(12, cam.s * .7) + 'px "Cormorant Garamond",Georgia,serif'; ctx.fillStyle = dark ? 'rgba(200,225,240,.6)' : 'rgba(30,70,100,.55)'; ctx.textAlign = 'center';
    [['Mare Internum', 18.5, 34.5], ['Euxine Sea', 34.5, 43.4], ['Aegean', 25.2, 38.9], ['Tyrrhenian', 12, 39.6], ['Ionian', 18.7, 37.3]].forEach(function (t) { var a = px(t[1], t[2]); ctx.fillText(t[0], a[0], a[1]); });
    // route
    var rt = voyage ? voyage.path : route && route.path;
    if (rt) { ctx.beginPath(); rt.forEach(function (q, i) { var a = px(q[0], q[1]); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#a8261c'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]); }
    // ports
    PORTS.forEach(function (p) {
      var a = px(p.lon, p.lat), here = !voyage && S.at === p.id, hv = hoverPort === p, k = S.contracts.some(function (c) { return c.to === p.id; });
      ctx.beginPath(); ctx.arc(a[0], a[1], hv || here ? 8 : 6, 0, 7); ctx.fillStyle = here ? '#a8261c' : k ? '#d8b860' : '#fffaf0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3b2b14'; ctx.stroke();
      ctx.font = '600 ' + Math.round(Math.max(11, Math.min(15, cam.s * .55))) + 'px system-ui'; ctx.textAlign = 'left'; ctx.lineWidth = 3; ctx.strokeStyle = dark ? 'rgba(0,0,0,.6)' : 'rgba(255,250,235,.85)'; ctx.strokeText(p.n, a[0] + 10, a[1] + 4); ctx.fillStyle = dark ? '#f3ead2' : '#2c2010'; ctx.fillText(p.n, a[0] + 10, a[1] + 4);
    });
    // the fleet
    var sp = px(S.pos[0], S.pos[1]), hd = voyage ? voyage.head : 0; ctx.save(); ctx.translate(sp[0], sp[1]); ctx.rotate(hd); shipIcon(ctx, 1.1); ctx.restore();
  }
  function shipIcon(c, k) { c.fillStyle = '#5a3a1e'; c.beginPath(); c.moveTo(14 * k, 0); c.quadraticCurveTo(4 * k, -6 * k, -12 * k, -4 * k); c.lineTo(-12 * k, 4 * k); c.quadraticCurveTo(4 * k, 6 * k, 14 * k, 0); c.fill(); c.fillStyle = '#f3ead2'; c.fillRect(-3 * k, -9 * k, 5 * k, 18 * k); }
  function fitCam() { var w = cv.width, h = cv.height; cam.s = Math.min(w / (LON1 - LON0), h / ((LAT1 - LAT0) * 1.25)) * 1.0; cam.x = (LON0 + LON1) / 2; cam.y = (LAT0 + LAT1) / 2; if (w < 700) { cam.s *= 1.6; cam.x = S ? S.pos[0] : 24; cam.y = S ? S.pos[1] : 38; } }

  /* ---------- input on the map ---------- */
  var drag = null;
  function evPt(e) { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; }
  function portAt(pt) { var best = null, bd = 22 * (window.devicePixelRatio || 1); PORTS.forEach(function (p) { var a = px(p.lon, p.lat), d = Math.hypot(a[0] - pt[0], a[1] - pt[1]); if (d < bd) { bd = d; best = p; } }); return best; }
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) { var pt = evPt(e); hoverPort = portAt(pt); cv.style.cursor = hoverPort ? 'pointer' : 'grab'; if (drag) { var d = window.devicePixelRatio || 1, dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true; if (drag.moved) { cam.x = drag.cx - dx * d / cam.s; cam.y = drag.cy + dy * d / (cam.s * 1.25); } } });
  cv.addEventListener('pointerup', function (e) { var d = drag; drag = null; if (!d || d.moved || battle) return; var p = portAt(evPt(e)); if (p && !voyage && !S.over) plan(p); });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); var pt = evPt(e), before = unpx(pt[0], pt[1]); cam.s = Math.max(8, Math.min(90, cam.s * (e.deltaY < 0 ? 1.15 : .87))); var after = unpx(pt[0], pt[1]); cam.x += before[0] - after[0]; cam.y += before[1] - after[1]; }, { passive: false });

  /* ---------- side panel: port ---------- */
  var tab = 'market', qty = 10;
  function side() {
    if (battle) return;
    var el = $('#side');
    if (voyage) { el.innerHTML = '<h2>⛵ At sea</h2><p>Bound for <b>' + BYID[voyage.to].n + '</b>.</p><div class="tr-bar"><i style="width:' + Math.round(voyage.d / voyage.len * 100) + '%"></i></div><p class="mute small">Day ' + voyage.days + ' of about ' + voyage.est + ' · wages ' + wages() + ' a day</p>'; return; }
    if (route) { var to = route.to, days = Math.ceil(route.len / speed() / dayDist()); el.innerHTML = '<h2>Set a course</h2><p>From ' + BYID[S.at].n + ' to <b>' + BYID[to].n + '</b></p><p>About <b>' + days + ' days</b> at sea · wages about ' + days * wages() + ' dr.</p>' + (season() === 'winter' ? '<p class="bad">It is the winter season. Storms are frequent and most sailors stay in port.</p>' : '') + risk(route.path) + '<div class="krow"><button class="btn gold" id="go">Set sail</button><button class="btn ghost" id="nogo">Cancel</button></div>'; $('#go').onclick = function () { sail(to, route.path); }; $('#nogo').onclick = function () { route = null; side(); }; return; }
    var p = BYID[S.at];
    var h = '<h2>' + p.n + '</h2><div class="seg tr-tabs">' + [['market', 'Market'], ['yard', 'Shipyard'], ['tavern', 'Tavern'], ['about', 'History']].map(function (t) { return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'market') {
      h += '<p class="small mute">Hold ' + load() + ' / ' + cap() + ' · Trade in lots of <span class="seg tr-q">' + [1, 10, 50].map(function (q) { return '<button class="' + (qty === q ? 'on' : '') + '" data-q="' + q + '">' + q + '</button>'; }).join('') + '</span></p><table class="kt tr-mk"><tr><th></th><th>Buy</th><th>Sell</th><th>Hold</th><th></th></tr>' +
        Object.keys(GOODS).map(function (g) { var b = price(p.id, g), s = price(p.id, g, true), have = S.cargo[g] || 0, tag = p.make.indexOf(g) >= 0 ? '<i class="tr-tag mk">made here</i>' : p.want.indexOf(g) >= 0 ? '<i class="tr-tag wt">wanted</i>' : '', paid = S.paid[g];
          return '<tr><td>' + GOODS[g].i + ' ' + GOODS[g].n + tag + '</td><td class="num">' + b + '</td><td class="num' + (have && paid && s > paid ? ' good' : have && paid && s < paid ? ' bad' : '') + '">' + s + '</td><td class="num">' + (have || '') + '</td><td class="tr-bs"><button data-buy="' + g + '"' + (S.money < b || load() >= cap() ? ' disabled' : '') + '>Buy</button><button data-sell="' + g + '"' + (!have ? ' disabled' : '') + '>Sell</button></td></tr>'; }).join('') + '</table>';
      if (S.rumour) h += '<p class="small">💬 ' + esc(S.rumour) + '</p>';
    } else if (tab === 'yard') {
      var dmg = S.fleet.reduce(function (a, s) { return a + SHIPS[s.k].hull - s.hull; }, 0), rc = dmg * 6;
      h += '<p>Your fleet:</p>' + S.fleet.map(function (s, i) { var D = SHIPS[s.k]; return '<div class="tr-ship"><b>' + esc(s.n) + '</b>, ' + D.n + ' <span class="mute small">hull ' + Math.round(s.hull) + '/' + D.hull + ' · hold ' + D.cargo + ' · ' + D.crew + ' crew</span>' + (S.fleet.length > 1 ? '<button class="btn ghost" data-sellship="' + i + '">Sell · ' + Math.round(D.cost * .55 * s.hull / D.hull) + '</button>' : '') + '</div>'; }).join('') +
        (dmg > 0 ? (p.yard ? '<p><button class="btn" id="rep"' + (S.money < rc ? ' disabled' : '') + '>Repair all · ' + rc + ' dr</button></p>' : '<p class="mute small">No shipwrights here for repairs. Look for ⚒️ ports.</p>') : '') +
        (p.yard ? '<p>Ships for sale' + (S.fleet.length >= 3 ? ' (fleet is full: three ships at most)' : '') + ':</p>' + Object.keys(SHIPS).map(function (k) { var D = SHIPS[k]; return '<div class="tr-ship"><b>' + D.n + '</b> <span class="mute small">hold ' + D.cargo + ' · speed ' + D.speed + ' · hull ' + D.hull + ' · ' + D.crew + ' crew</span><br><span class="small">' + D.d + '</span> <button class="btn" data-buyship="' + k + '"' + (S.money < D.cost || S.fleet.length >= 3 ? ' disabled' : '') + '>Buy · ' + D.cost + '</button></div>'; }).join('') : '<p class="mute small">This harbour builds no ships. Shipyards: ' + PORTS.filter(function (q) { return q.yard; }).map(function (q) { return q.n; }).join(', ') + '.</p>');
    } else if (tab === 'tavern') {
      ensureOffers(p);
      h += '<p class="small">Your contracts:</p>' + (S.contracts.length ? S.contracts.map(function (c) { return '<div class="tr-ship">Deliver <b>' + c.q + ' ' + GOODS[c.g].n.toLowerCase() + '</b> to ' + BYID[c.to].n + ' by day ' + c.by + ' for <b>' + c.pay + '</b>' + (c.to === p.id && (S.cargo[c.g] || 0) >= c.q ? ' <button class="btn gold" data-deliver="' + S.contracts.indexOf(c) + '">Deliver</button>' : '') + '</div>'; }).join('') : '<p class="mute small">None.</p>') +
        '<p class="small">Merchants looking for a ship:</p>' + p.offers.map(function (c, i) { return '<div class="tr-ship">' + c.q + ' ' + GOODS[c.g].n.toLowerCase() + ' to <b>' + BYID[c.to].n + '</b> within ' + (c.by - S.day) + ' days · pay <b>' + c.pay + '</b>' + (c.give ? ' <span class="mute small">(cargo supplied)</span>' : '') + ' <button class="btn" data-take="' + i + '"' + (S.contracts.length >= 4 || (c.give && load() + c.q > cap()) ? ' disabled' : '') + '>Accept</button></div>'; }).join('') +
        '<p class="small">💬 ' + esc(S.rumour || 'The sailors talk of nothing but the weather.') + '</p>';
    } else { h += '<p>' + p.h + '</p><p class="small mute">Makes: ' + (p.make.map(function (g) { return GOODS[g].n; }).join(', ') || 'nothing much') + '. Wants: ' + p.want.map(function (g) { return GOODS[g].n; }).join(', ') + '.' + (p.yard ? ' Shipyard ⚒️.' : '') + '</p>'; }
    h += '<p class="mute small tr-hint">Tap a port on the map to plan a voyage.</p>';
    el.innerHTML = h;
    Kit.$$('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; side(); }; });
    Kit.$$('[data-q]').forEach(function (b) { b.onclick = function () { qty = +b.dataset.q; side(); }; });
    Kit.$$('[data-buy]').forEach(function (b) { b.onclick = function () { trade(b.dataset.buy, qty); }; });
    Kit.$$('[data-sell]').forEach(function (b) { b.onclick = function () { trade(b.dataset.sell, -qty); }; });
    Kit.$$('[data-buyship]').forEach(function (b) { b.onclick = function () { buyShip(b.dataset.buyship); }; });
    Kit.$$('[data-sellship]').forEach(function (b) { b.onclick = function () { var s = S.fleet[+b.dataset.sellship], D = SHIPS[s.k]; if (load() > cap() - D.cargo) { msg('Unload cargo first: the other ships can’t hold it.', 1); return; } S.money += Math.round(D.cost * .55 * s.hull / D.hull); S.fleet.splice(+b.dataset.sellship, 1); side(); top(); }; });
    if ($('#rep')) $('#rep').onclick = function () { var dmg = S.fleet.reduce(function (a, s) { return a + SHIPS[s.k].hull - s.hull; }, 0); S.money -= dmg * 6; S.fleet.forEach(function (s) { s.hull = SHIPS[s.k].hull; }); Kit.sfx.good(); side(); top(); };
    Kit.$$('[data-take]').forEach(function (b) { b.onclick = function () { var c = p.offers.splice(+b.dataset.take, 1)[0]; if (c.give) { S.cargo[c.g] = (S.cargo[c.g] || 0) + c.q; S.paid[c.g] = S.paid[c.g] || 0; } S.contracts.push(c); msg('Contract accepted.'); side(); }; });
    Kit.$$('[data-deliver]').forEach(function (b) { b.onclick = function () { var c = S.contracts.splice(+b.dataset.deliver, 1)[0]; S.cargo[c.g] -= c.q; if (!S.cargo[c.g]) delete S.cargo[c.g]; S.money += c.pay; S.done++; S.rep += 2; Kit.sfx.win(); log('Delivered ' + c.q + ' ' + GOODS[c.g].n.toLowerCase() + ' to ' + BYID[c.to].n + ' for ' + c.pay + '.'); side(); top(); }; });
  }
  function risk(pth) { var r = pirateRisk(pth); return '<p class="small">' + (r > 2 ? '☠️ <b class="bad">Pirate waters.</b> Expect trouble.' : r > .8 ? '☠️ Some risk of pirates.' : 'Quiet waters.') + '</p>'; }
  function pirateRisk(pth) { var r = 0; pth.forEach(function (q, i) { if (i % 3) return; PIRATE_LAIRS.forEach(function (L) { if (Math.hypot(q[0] - L[0], q[1] - L[1]) < L[2]) r += L[3] * .3; }); }); return r; }
  function trade(g, q) {
    var p = BYID[S.at], n = 0;
    if (q > 0) { while (n < q && load() < cap() && S.money >= price(p.id, g)) { var pr = price(p.id, g); S.money -= pr; S.paid[g] = ((S.paid[g] || 0) * (S.cargo[g] || 0) + pr) / ((S.cargo[g] || 0) + 1); S.cargo[g] = (S.cargo[g] || 0) + 1; S.market[p.id][g] = Math.max(0, S.market[p.id][g] - 1.2); n++; } }
    else { q = -q; while (n < q && (S.cargo[g] || 0) > 0) { S.money += price(p.id, g, true); S.cargo[g]--; S.market[p.id][g] = Math.min(220, S.market[p.id][g] + 1.2); n++; } if (!S.cargo[g]) { delete S.cargo[g]; delete S.paid[g]; } }
    if (n) Kit.sfx.click(); side(); top(); save();
  }
  function buyShip(k) {
    var D = SHIPS[k]; if (S.money < D.cost || S.fleet.length >= 3) return;
    var names = ['Nike', 'Paralos', 'Salaminia', 'Thetis', 'Eukleia', 'Argo', 'Delphis', 'Halkyon', 'Kallisto', 'Sotira', 'Hermes', 'Amphitrite', 'Galene', 'Eudaimonia'];
    S.money -= D.cost; S.fleet.push({ k: k, n: names[Math.floor(Math.random() * names.length)], hull: D.hull }); Kit.sfx.win(); msg('You buy a ' + D.n + '.'); side(); top(); save();
  }
  function ensureOffers(p) {
    if (p.offersDay != null && S.day - p.offersDay < 20 && p.offers) return;
    p.offersDay = S.day; p.offers = [];
    for (var i = 0; i < 3; i++) {
      var dest = PORTS[Math.floor(Math.random() * PORTS.length)]; if (dest === p) continue;
      var give = Math.random() < .45, g = give ? (p.make.length ? p.make[Math.floor(Math.random() * p.make.length)] : 'pottery') : dest.want[Math.floor(Math.random() * dest.want.length)];
      var dist = Math.hypot(dest.lon - p.lon, dest.lat - p.lat), q = give ? 10 + Math.floor(Math.random() * 30) : 5 + Math.floor(Math.random() * 20);
      p.offers.push({ g: g, q: q, to: dest.id, by: S.day + Math.ceil(dist * 2.4 + 12), pay: Math.round((give ? dist * 18 + 80 : q * GOODS[g].p * 1.7 + dist * 10) * (1 + S.rep / 100)), give: give });
    }
  }

  /* ---------- voyages ---------- */
  function dayDist() { return season() === 'winter' ? .85 : 1; }
  function plan(p) { if (p.id === S.at) { route = null; side(); return; } var pt = path(S.pos, [p.lon, p.lat]); route = { to: p.id, path: pt, len: plen(pt) }; side(); }
  function sail(to, pth) {
    route = null; S.at = null; var len = plen(pth);
    voyage = { to: to, path: pth, len: len, d: 0, days: 0, est: Math.ceil(len / speed() / dayDist()), head: 0, next: 0 }; side(); top();
  }
  var dayT = 0;
  function tickVoyage(dt) {
    if (!voyage || battle || Kit._m || evt) return;
    var v = voyage, spd = speed() * dayDist();
    v.d = Math.min(v.len, v.d + spd * dt * 1.6); dayT += dt * 1.6;
    // position
    var d = v.d, p = v.path; for (var i = 1; i < p.length; i++) { var L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (d <= L) { var k = L ? d / L : 0; S.pos = [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k]; v.head = Math.atan2(-(p[i][1] - p[i - 1][1]) * 1.25, p[i][0] - p[i - 1][0]); break; } d -= L; }
    if (dayT >= 1) { dayT -= 1; newDay(); }
    if (v.d >= v.len && !evt && !battle) arrive();
    if (window.innerWidth < 820) { cam.x += (S.pos[0] - cam.x) * .05; cam.y += (S.pos[1] - cam.y) * .05; }
  }
  function newDay() {
    S.day++; voyage.days++; S.money -= wages(); drift(1);
    if (S.money < -300) { S.money = Math.min(S.money, -300); if (Math.random() < .2) { var g = Object.keys(S.cargo)[0]; if (g) { S.cargo[g] = Math.max(0, S.cargo[g] - 5); log('Unpaid rowers take some of the ' + GOODS[g].n.toLowerCase() + '.'); } } }
    S.contracts.forEach(function (c) { if (S.day > c.by && !c.late) { c.late = 1; S.rep = Math.max(-20, S.rep - 4); msg('A contract to ' + BYID[c.to].n + ' is overdue. The merchants will remember.', 1); } });
    S.contracts = S.contracts.filter(function (c) { return S.day <= c.by + 15; });
    // dangers
    var storm = season() === 'winter' ? .07 : .012, pir = 0;
    PIRATE_LAIRS.forEach(function (L) { var d = Math.hypot(S.pos[0] - L[0], S.pos[1] - L[1]); if (d < L[2]) pir = Math.max(pir, .075 * L[3] * (1 - d / L[2] * .5)); });
    pir *= .6 + Math.min(1.2, cargoValue() / 3000); pir = Math.max(pir, .006);
    if (Math.random() < storm) stormEvt();
    else if (Math.random() < pir) pirateEvt();
    else if (Math.random() < .012) luckEvt();
    top();
  }
  function cargoValue() { return Object.keys(S.cargo).reduce(function (a, g) { return a + S.cargo[g] * GOODS[g].p; }, 0); }
  function arrive() {
    var p = BYID[voyage.to]; S.at = p.id; S.pos = [p.lon, p.lat]; voyage = null; Kit.sfx.good();
    log('Arrived at ' + p.n + '.'); note(p.id); tab = S.contracts.some(function (c) { return c.to === p.id && (S.cargo[c.g] || 0) >= c.q; }) ? 'tavern' : 'market';
    side(); top(); save(); checkEnd();
  }
  function note(pid) { if (!S.hist[pid]) { S.hist[pid] = 1; var all = Kit.store.get('tr-ports', {}); all[pid] = 1; Kit.store.set('tr-ports', all); } }

  /* ---------- events ---------- */
  var evt = null;
  function event(title, html, opts) {
    evt = true;
    Kit.modal('<h2>' + title + '</h2>' + html + '<div class="krow">' + opts.map(function (o, i) { return '<button class="btn ' + (i ? 'ghost' : 'gold') + '" data-e="' + i + '"' + (o.dis ? ' disabled' : '') + '>' + o.t + '</button>'; }).join('') + '</div>', { sticky: true });
    Kit.$$('[data-e]').forEach(function (b) { b.onclick = function () { Kit.closeModal(); evt = null; opts[+b.dataset.e].f(); top(); side(); }; });
  }
  function stormEvt() {
    var lose = Math.random() < .5, txt = '';
    S.fleet.forEach(function (s) { s.hull -= 5 + Math.random() * 14; });
    if (lose) { var gs = Object.keys(S.cargo); gs.forEach(function (g) { var n = Math.ceil(S.cargo[g] * (.15 + Math.random() * .2)); S.cargo[g] -= n; if (!S.cargo[g]) delete S.cargo[g]; }); txt = '<p>Waves break over the deck. The crew throws part of the cargo overboard to keep her afloat.</p>'; }
    else txt = '<p>The sail splits and a steering oar breaks, but you ride it out.</p>';
    var sunk = S.fleet.filter(function (s) { return s.hull <= 0; }); if (sunk.length) { sunk.forEach(function (s) { S.fleet.splice(S.fleet.indexOf(s), 1); }); txt += '<p class="bad">The ' + sunk.map(function (s) { return esc(s.n); }).join(' and the ') + ' founders and sinks.</p>'; trimCargo(); }
    Kit.sfx.boom(); log('A storm' + (season() === 'winter' ? ' in the winter sea' : '') + '.');
    if (!S.fleet.length) { gameOver('Your last ship goes down in the storm. You are washed up on a beach, alive but penniless.'); return; }
    event('⛈️ Storm', txt + '<p class="mute small">The Greeks avoided sailing between November and March, the season Hesiod warned against.</p>', [{ t: 'Sail on', f: function () { } }]);
  }
  function trimCargo() { while (load() > cap()) { var gs = Object.keys(S.cargo); var g = gs[0]; S.cargo[g]--; if (!S.cargo[g]) delete S.cargo[g]; } }
  function luckEvt() {
    var r = Math.random();
    if (r < .35) event('🐬 Dolphins', '<p>Dolphins race beside the bow. The sailors take it as a sign of Apollo’s favour, and row with a will.</p>', [{ t: 'On we go', f: function () { if (voyage) voyage.d = Math.min(voyage.len, voyage.d + 1); } }]);
    else if (r < .7) { var g = Object.keys(GOODS)[Math.floor(Math.random() * 6)], q = 3 + Math.floor(Math.random() * 6); event('🛟 Wreckage', '<p>You find the wreck of a merchant ship, with ' + q + ' jars of ' + GOODS[g].n.toLowerCase() + ' still floating.</p>', [{ t: 'Haul them aboard', f: function () { var room = cap() - load(); S.cargo[g] = (S.cargo[g] || 0) + Math.min(q, room); } }, { t: 'Leave them', f: function () { } }]); }
    else event('⛵ A passing merchant', '<p>A Phoenician merchant hails you and shares news of prices along the coast.</p><p>' + esc(S.rumour || 'Prices are steady everywhere.') + '</p>', [{ t: 'Thank him', f: function () { } }]);
  }
  function pirateEvt() {
    var lair = PIRATE_LAIRS.reduce(function (a, L) { return Math.hypot(S.pos[0] - L[0], S.pos[1] - L[1]) < Math.hypot(S.pos[0] - a[0], S.pos[1] - a[1]) ? L : a; });
    var n = 1 + (Math.random() < .35 ? 1 : 0) + (Math.random() < .12 ? 1 : 0), kind = Math.random() < .7 ? 'hemiolia' : 'pentekonter', fl = SHIPS[flag().k];
    var flee = Math.max(.1, Math.min(.85, .5 + (speed() - SHIPS[kind].speed) * .9)), demand = Math.round(S.money * .25 + cargoValue() * .2);
    event('☠️ ' + lair[4] + ' pirates', '<p>' + (n > 1 ? n + ' ' + SHIPS[kind].n.toLowerCase() + 's' : 'A ' + SHIPS[kind].n.toLowerCase()) + ' with painted eyes on the bow ' + (n > 1 ? 'are' : 'is') + ' rowing hard toward you.</p><p class="small mute">Your best fighter: ' + esc(flag().n) + ', a ' + fl.n.toLowerCase() + ' (ram ' + fl.ram + ', hull ' + Math.round(flag().hull) + '). Chance to escape: ' + Math.round(flee * 100) + '%.</p>',
      [{ t: '⚔️ Fight', f: function () { startBattle(n, kind, lair[4]); } }, { t: '💨 Run for it', f: function () { if (Math.random() < flee) { msg('You show them your stern and escape.'); } else { msg('They are faster. You must fight!', 1); startBattle(n, kind, lair[4]); } } }, { t: '🪙 Pay ' + demand + ' dr', dis: S.money < demand && cargoValue() < 50, f: function () { if (S.money >= demand) S.money -= demand; else { Object.keys(S.cargo).forEach(function (g) { S.cargo[g] = Math.floor(S.cargo[g] * .6); if (!S.cargo[g]) delete S.cargo[g]; }); } log('Paid off ' + lair[4] + ' pirates.'); } }]);
  }

  /* ---------- sea battle ---------- */
  var battle = null, keys = {};
  function startBattle(n, kind, who) {
    var f = flag(), D = SHIPS[f.k], W = 1150, H = 760;
    battle = { W: W, H: H, who: who, t: 0, me: { x: W / 2, y: H * .7, a: -Math.PI / 2, v: 0, gear: 2, hull: f.hull, max: D.hull, ram: D.ram, spd: 60 + D.speed * 55, turn: 1.6, ship: f, r: 42, cool: 0, arrows: 0 }, foes: [], fx: [], over: false };
    for (var i = 0; i < n; i++) { var E = SHIPS[kind]; battle.foes.push({ x: W * (.25 + i * .25), y: H * .2, a: Math.PI / 2, v: 50, hull: E.hull, max: E.hull, ram: E.ram, spd: 60 + E.speed * 52, turn: 1.4, r: 38, cool: 0, ai: Math.random() }); }
    $('#side').innerHTML = '<h2>⚔️ Battle</h2><p>Ram them in the side at speed. Archers shoot when ships are close. Board a crippled ship by touching it slowly.</p><p class="small mute">← → or A D steer. ↑ ↓ or W S change stroke. On a phone use the buttons.</p><div class="tr-gears" id="gears"></div><div class="tr-pad"><button id="pl">⟲</button><button id="pd">−</button><button id="pu">+</button><button id="pr">⟳</button></div>';
    var hold = function (id, k) { var b = $(id); b.onpointerdown = function (e) { e.preventDefault(); keys[k] = 1; if (k === 'up') gear(1); if (k === 'down') gear(-1); }; b.onpointerup = b.onpointerleave = function () { keys[k] = 0; }; };
    hold('#pl', 'left'); hold('#pr', 'right'); hold('#pu', 'up'); hold('#pd', 'down'); gearUI();
    Kit.sfx.tone(160, .6, .12, 'sawtooth', 0, 120);
  }
  var GEARS = ['Back water', 'Stop', 'Slow', 'Cruise', 'Battle', 'Ramming speed'], GV = [-.3, 0, .35, .6, .85, 1.15];
  function gear(d) { if (!battle) return; battle.me.gear = Math.max(0, Math.min(5, battle.me.gear + d)); gearUI(); }
  function gearUI() { if ($('#gears')) $('#gears').innerHTML = GEARS.map(function (g, i) { return '<span class="' + (battle.me.gear === i ? 'on' : '') + '">' + g + '</span>'; }).reverse().join(''); }
  window.addEventListener('keydown', function (e) {
    if (!battle) return; var k = e.key;
    if (k === 'ArrowLeft' || k === 'a') keys.left = 1; if (k === 'ArrowRight' || k === 'd') keys.right = 1;
    if (k === 'ArrowUp' || k === 'w') { gear(1); e.preventDefault(); } if (k === 'ArrowDown' || k === 's') { gear(-1); e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') keys.left = 0; if (k === 'ArrowRight' || k === 'd') keys.right = 0; });
  function stepShip(s, dt, steer, target) {
    var want = s.spd * GV[s.gear];
    if (s.gear >= 5) { s.fatigue = (s.fatigue || 0) + dt; if (s.fatigue > 6 && s === battle.me) { s.gear = 4; gearUI(); msg('The rowers are exhausted.'); } } else s.fatigue = Math.max(0, (s.fatigue || 0) - dt * .5);
    s.v += (want - s.v) * Math.min(1, dt * .8);
    var tr = s.turn * (1.15 - Math.min(1, Math.abs(s.v) / s.spd) * .55);
    s.a += steer * tr * dt; s.x += Math.cos(s.a) * s.v * dt; s.y += Math.sin(s.a) * s.v * dt;
    var B = battle; if (s.x < 40 || s.x > B.W - 40 || s.y < 40 || s.y > B.H - 40) { s.x = Math.max(40, Math.min(B.W - 40, s.x)); s.y = Math.max(40, Math.min(B.H - 40, s.y)); s.v *= .9; }
    if (s.cool > 0) s.cool -= dt;
  }
  function tickBattle(dt) {
    var B = battle, me = B.me; if (!B || B.over) return; B.t += dt;
    stepShip(me, dt, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
    B.foes.forEach(function (f) {
      if (f.hull <= 0) { f.v *= .95; f.sink = (f.sink || 0) + dt; return; }
      // aim for a point beside the player: the side of his ship
      var lead = .6 + f.ai * .6, tx = me.x + Math.cos(me.a) * me.v * lead, ty = me.y + Math.sin(me.a) * me.v * lead, want = Math.atan2(ty - f.y, tx - f.x), da = Math.atan2(Math.sin(want - f.a), Math.cos(want - f.a));
      var dist = Math.hypot(me.x - f.x, me.y - f.y); f.gear = dist < 260 ? 5 : dist < 500 ? 4 : 3; if (f.hull < f.max * .3) f.gear = 2;
      stepShip(f, dt, Math.max(-1, Math.min(1, da * 2)));
    });
    // rams and collisions
    var all = [me].concat(B.foes.filter(function (f) { return f.hull > 0; }));
    all.forEach(function (a) { all.forEach(function (b) { if (a === b) return; var bx = a.x + Math.cos(a.a) * a.r, by = a.y + Math.sin(a.a) * a.r, dx = bx - b.x, dy = by - b.y; var ca = Math.cos(-b.a), sa = Math.sin(-b.a), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca; if ((lx * lx) / (b.r * b.r) + (ly * ly) / (b.r * .32 * b.r * .32) > 1) return; if (a.cool > 0) return;
      var rel = (a.v * Math.cos(a.a) - b.v * Math.cos(b.a)) * Math.cos(a.a) + (a.v * Math.sin(a.a) - b.v * Math.sin(b.a)) * Math.sin(a.a), side = Math.abs(Math.sin(a.a - b.a));
      a.cool = 1.2;
      if (rel > 25) { var dmg = rel * .32 * a.ram * (.3 + side * .9); b.hull -= dmg; a.hull -= dmg * .12; B.fx.push({ k: 'crash', x: bx, y: by, t: 0 }); Kit.sfx.boom(); if (a === me) msg('Rammed! ' + Math.round(dmg) + ' damage.'); else if (b === me) msg('You are rammed! ' + Math.round(dmg) + ' damage.', 1); }
      else if (a === me && b.hull < b.max * .35 && Math.abs(a.v) < 40) { board(b); }
      else { a.v *= -.3; } }); });
    // archers
    all.forEach(function (a) { all.forEach(function (b) { if (a === b || (a !== me && b !== me)) return; var d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 200 && Math.random() < dt * .9) { b.hull -= .6 + Math.random() * .8; B.fx.push({ k: 'arrow', x: a.x, y: a.y, tx: b.x, ty: b.y, t: 0 }); } }); });
    if (me.hull <= 0) endBattle(false);
    else if (B.foes.every(function (f) { return f.hull <= 0; })) { if (B.foes.every(function (f) { return f.sink > 1.5; })) endBattle(true); }
  }
  function board(f) { f.hull = 0; f.boarded = true; battle.fx.push({ k: 'board', x: f.x, y: f.y, t: 0 }); msg('Your marines board and take her!'); Kit.sfx.good(); }
  function endBattle(won) {
    var B = battle; B.over = true; var f = B.me.ship; f.hull = Math.max(1, B.me.hull);
    setTimeout(function () {
      battle = null; keys = {};
      if (won) {
        var loot = B.foes.reduce(function (a, f) { return a + (f.boarded ? 300 : 120) + Math.round(Math.random() * 150); }, 0), boarded = B.foes.filter(function (x) { return x.boarded; }).length; S.money += loot; S.sunk += B.foes.length; S.rep += 3;
        log('Beat ' + B.foes.length + ' ' + B.who + ' pirate ship' + (B.foes.length > 1 ? 's' : '') + ' and took ' + loot + ' dr.');
        event('🏆 Victory', '<p>The ' + B.who + ' pirates are beaten. ' + (boarded ? 'In the captured hold you find their plunder.' : 'You pick up what floats from the wreckage.') + '</p><p class="good">+' + loot + ' drachmae</p>' + (boarded && S.fleet.length < 3 ? '<p>You could keep a captured hemiolia as a prize.</p>' : ''), [{ t: 'Sail on', f: function () { } }].concat(boarded && S.fleet.length < 3 ? [{ t: 'Keep the prize ship', f: function () { S.fleet.push({ k: 'hemiolia', n: 'Prize of ' + B.who.slice(0, 4), hull: 25 }); } }] : []));
      } else {
        S.fleet.splice(S.fleet.indexOf(f), 1); trimCargo(); var lost = Math.round(S.money * .3); S.money -= lost; Object.keys(S.cargo).forEach(function (g) { S.cargo[g] = Math.floor(S.cargo[g] * .4); if (!S.cargo[g]) delete S.cargo[g]; });
        log('Lost the ' + f.n + ' to ' + B.who + ' pirates.');
        if (!S.fleet.length) { gameOver('The pirates take your last ship. You are put ashore on a lonely beach and must start again as a deckhand.'); return; }
        event('💀 Defeat', '<p>The ' + esc(f.n) + ' is holed and sinks. The pirates plunder the rest of the fleet: ' + lost + ' drachmae and much of the cargo.</p>', [{ t: 'Limp on', f: function () { } }]);
      }
      side(); top();
    }, 1200);
  }
  function drawBattle() {
    var B = battle, dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    var k = Math.min(cv.width / B.W, cv.height / B.H), ox = (cv.width - B.W * k) / 2, oy = (cv.height - B.H * k) / 2;
    ctx.fillStyle = '#1d4f73'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k);
    var g = ctx.createRadialGradient(B.W / 2, B.H / 2, 100, B.W / 2, B.H / 2, B.W * .7); g.addColorStop(0, '#3f87b5'); g.addColorStop(1, '#245f88'); ctx.fillStyle = g; ctx.fillRect(0, 0, B.W, B.H);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; for (var i = 0; i < 60; i++) { var x = (i * 271 + t0 * 14) % B.W, y = (i * 137) % B.H; ctx.beginPath(); ctx.arc(x, y, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    [B.me].concat(B.foes).forEach(function (s) { drawGalley(s, s === B.me); });
    B.fx = B.fx.filter(function (f) { f.t += 1 / 60; if (f.k === 'crash') { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - f.t) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + f.t * 60, 0, 7); ctx.stroke(); for (var j = 0; j < 6; j++) { ctx.fillStyle = '#6b4a2a'; ctx.fillRect(f.x + Math.cos(j) * f.t * 70, f.y + Math.sin(j * 2) * f.t * 70, 8, 3); } return f.t < 1; } if (f.k === 'arrow') { var q = f.t * 3; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; var ax = f.x + (f.tx - f.x) * q, ay = f.y + (f.ty - f.y) * q; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - (f.tx - f.x) * .05, ay - (f.ty - f.y) * .05); ctx.stroke(); return q < 1; } if (f.k === 'board') { ctx.font = '40px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚔️', f.x, f.y - 40 - f.t * 20); return f.t < 1.5; } return false; });
    ctx.restore();
    // bars
    ctx.font = '600 ' + 14 * dpr + 'px system-ui'; ctx.textAlign = 'left';
    bar(12 * dpr, 12 * dpr, B.me.hull / B.me.max, '#2d7a3e', esc(B.me.ship.n));
    B.foes.forEach(function (f, i) { bar(cv.width - 200 * dpr, (12 + i * 26) * dpr, Math.max(0, f.hull / f.max), '#a8261c', B.who + ' ' + (i + 1)); });
  }
  function bar(x, y, f, col, t) { var d = window.devicePixelRatio || 1; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y, 188 * d, 20 * d); ctx.fillStyle = col; ctx.fillRect(x + 2 * d, y + 2 * d, 184 * d * Math.max(0, f), 16 * d); ctx.fillStyle = '#fff'; ctx.fillText(t, x + 6 * d, y + 15 * d); }
  function drawGalley(s, mine) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); if (s.hull <= 0) { ctx.globalAlpha = Math.max(0, 1 - (s.sink || 0) / 2); ctx.rotate(.3); }
    // wake
    if (Math.abs(s.v) > 10 && s.hull > 0) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-s.r, -6); ctx.lineTo(-s.r - s.v * .8, -18); ctx.moveTo(-s.r, 6); ctx.lineTo(-s.r - s.v * .8, 18); ctx.stroke(); }
    // oars
    var n = 9, ph = t0 * (2 + Math.abs(s.v) / 25); ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 2;
    for (var i = 0; i < n; i++) { var x = -s.r * .7 + i * s.r * 1.4 / n, sw = Math.sin(ph + i * .2) * 6 * (s.v ? 1 : .2); [1, -1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(x, sd * s.r * .28); ctx.lineTo(x + sw, sd * s.r * .72); ctx.stroke(); }); }
    // hull
    ctx.fillStyle = mine ? '#6b4423' : '#3a2a1a'; ctx.beginPath(); ctx.moveTo(s.r * 1.15, 0); ctx.quadraticCurveTo(s.r * .4, -s.r * .34, -s.r, -s.r * .26); ctx.quadraticCurveTo(-s.r * 1.15, 0, -s.r, s.r * .26); ctx.quadraticCurveTo(s.r * .4, s.r * .34, s.r * 1.15, 0); ctx.fill();
    ctx.fillStyle = mine ? '#c9a25a' : '#8a2a20'; ctx.fillRect(-s.r * .8, -s.r * .1, s.r * 1.5, s.r * .2);
    ctx.fillStyle = '#b08d3a'; ctx.beginPath(); ctx.moveTo(s.r * 1.35, 0); ctx.lineTo(s.r * 1.05, -4); ctx.lineTo(s.r * 1.05, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.r * .85, -s.r * .16, 3, 0, 7); ctx.arc(s.r * .85, s.r * .16, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s.r * .87, -s.r * .16, 1.5, 0, 7); ctx.arc(s.r * .87, s.r * .16, 1.5, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---------- top bar, log, end ---------- */
  function top() {
    if (!S) return;
    $('#top').innerHTML = '<span class="' + (S.money < 0 ? 'bad' : '') + '">🪙 <b>' + Math.round(S.money).toLocaleString() + '</b> dr</span><span>⛵ <b>' + S.fleet.length + '</b> · hold <b>' + load() + '/' + cap() + '</b></span><span>👥 ' + crew() + ' crew · ' + wages() + '/day</span><span>📅 ' + dateTxt() + (season() === 'winter' ? ' ❄️' : '') + '</span><span title="Wealth rank">🏅 ' + rank() + '</span>' + (S.contracts.length ? '<span>📦 ' + S.contracts.length + ' contract' + (S.contracts.length > 1 ? 's' : '') + '</span>' : '');
  }
  function log(t) { S.log.unshift({ d: S.day, t: t }); if (S.log.length > 80) S.log.pop(); }
  function msg(t, bad) { var m = $('#msg'), d = document.createElement('div'); d.className = 'tr-m' + (bad ? ' bad' : ''); d.textContent = t; m.appendChild(d); while (m.children.length > 3) m.removeChild(m.firstChild); setTimeout(function () { d.classList.add('out'); }, 3500); setTimeout(function () { d.remove(); }, 4200); }
  function checkEnd() { if (S.day >= 360 * 25 && !S.over) { S.over = true; var w = worth(), best = Kit.store.get('tr-best', 0); if (w > best) Kit.store.set('tr-best', w); Kit.modal('<h2>🏛️ Retirement</h2><p>After 25 years at sea you retire to a house in the city. Your fortune: <b>' + w.toLocaleString() + ' drachmae</b>, the rank of <b>' + rank() + '</b>.</p><p>' + S.done + ' contracts completed, ' + S.sunk + ' pirate ships beaten.</p><p class="mute">' + (w > best ? 'A new record!' : 'Best fortune: ' + best.toLocaleString()) + '</p><div class="krow"><button class="btn gold" id="again">A new career</button></div>', { sticky: true }); $('#again').onclick = function () { Kit.closeModal(); start(); }; } }
  function gameOver(t) { S.over = true; Kit.store.set('tr-save', null); Kit.sfx.bad(); Kit.modal('<h2>🌊 Shipwrecked</h2><p>' + t + '</p><p>Your fortune at the end: ' + worth().toLocaleString() + ' drachmae.</p><div class="krow"><button class="btn gold" id="again">Start a new career</button></div>', { sticky: true }); $('#again').onclick = function () { Kit.closeModal(); start(); }; }
  function save() { if (!S.over && !voyage) Kit.store.set('tr-save', S); }
  function start() { fresh(); voyage = null; route = null; fitCam(); top(); side(); Kit.store.set('tr-save', null); }
  function help() { Kit.modal('<h2>Trireme Trader</h2><p>It is 400 BC. You own one small merchant ship in the Piraeus and 600 drachmae. Make your fortune in 25 years.</p><ul class="small"><li>Buy goods where they are <i class="tr-tag mk">made</i> and cheap; sell where they are <i class="tr-tag wt">wanted</i>. Prices change as you trade and over time.</li><li>Tap a port on the map to plan a voyage. Crew wages are paid every day at sea.</li><li>Take contracts in the tavern. Buy bigger ships at shipyards, up to three.</li><li>Winter (late autumn to late winter) brings storms. Pirate waters are marked ☠.</li><li>In battle: steer, set the stroke, and ram the enemy in the side at speed. Ramming speed tires the rowers. Touch a badly damaged ship slowly to board her.</li></ul><div class="krow"><button class="btn gold" data-close>Set sail</button></div>'); }
  function fleetModal() { Kit.modal('<h2>⛵ Your fleet</h2>' + S.fleet.map(function (s) { var D = SHIPS[s.k]; return '<p><b>' + esc(s.n) + '</b>, ' + D.n + ': hull ' + Math.round(s.hull) + '/' + D.hull + ', hold ' + D.cargo + ', ' + D.crew + ' crew, speed ' + D.speed + ', ram ' + D.ram + '</p>'; }).join('') + '<p>Cargo: ' + (Object.keys(S.cargo).map(function (g) { return S.cargo[g] + ' ' + GOODS[g].n.toLowerCase(); }).join(', ') || 'empty') + '</p><p class="mute small">Worth ' + worth().toLocaleString() + ' dr · rank ' + rank() + ' · reputation ' + S.rep + '</p><div class="krow"><button class="btn" data-close>Close</button></div>'); }
  function ledger() { var seen = Kit.store.get('tr-ports', {}); Kit.modal('<h2>📜 Ledger</h2>' + (S.log.length ? '<ol class="small tr-ledger">' + S.log.slice(0, 30).map(function (l) { return '<li><b>Day ' + l.d + '</b> ' + esc(l.t) + '</li>'; }).join('') + '</ol>' : '<p>Nothing yet.</p>') + '<p class="small">Ports visited (over all careers): ' + Object.keys(seen).length + ' of ' + PORTS.length + '.</p><div class="krow"><button class="btn" data-close>Close</button></div>'); }
  $('#b-help').onclick = help; $('#b-fleet').onclick = fleetModal; $('#b-log').onclick = ledger;

  /* ---------- loop ---------- */
  buildMask();
  var sv = Kit.store.get('tr-save', null);
  if (sv && sv.fleet && sv.fleet.length) { S = sv; top(); side(); setTimeout(fitCam, 0); } else { start(); if (!Kit.store.get('tr-seen', 0)) { Kit.store.set('tr-seen', 1); help(); } }
  var last = performance.now();
  function frame(now) { var dt = Math.min(.05, (now - last) / 1000); last = now; t0 += dt; if (battle) { tickBattle(dt); drawBattle(); } else { tickVoyage(dt); drawMap(); if (voyage && Math.random() < .1) side(); } requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  window.TRD = { get S() { return S; }, sail: sail, path: path, PORTS: PORTS, startBattle: startBattle, get battle() { return battle; }, plan: plan, trade: trade, newDay: newDay };
})();
