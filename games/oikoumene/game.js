/* Oikoumene: a 4X strategy game of the ancient world in the spirit of Civilization.
   Explore a random map, found cities, research technologies, build units, buildings and Wonders, and win by
   conquest, by knowledge, or by having the greatest civilization when time runs out. */
(function () {
  'use strict';
  var $ = Kit.$, esc = Kit.esc;
  Kit.bar('Oikoumene', [['b-tech', '📜', 'Technology'], ['b-civs', '🤝', 'Rivals and diplomacy'], ['b-menu', '☰', 'New game'], ['b-help', '?', 'How to play']]);
  var main = document.createElement('main'); main.className = 'oi'; document.body.appendChild(main);
  main.innerHTML = '<div class="oi-top" id="top"></div><div class="oi-stage"><canvas id="cv"></canvas><div class="oi-panel card" id="panel"></div><div class="oi-msg" id="msg"></div><button class="btn gold oi-end" id="endt">End turn ⏎</button><canvas id="mini" class="oi-mini"></canvas></div>';
  var cv = $('#cv'), ctx = cv.getContext('2d'), mini = $('#mini'), mctx = mini.getContext('2d');

  /* ---------- rules ---------- */
  var TT = { // terrain: food, prod, trade, move cost, defence bonus
    ocean: { n: 'Ocean', f: 1, p: 0, t: 2, m: 1, sea: 1, c: ['#2f6f9c', '#2c6893'] }, coast: { n: 'Coast', f: 1, p: 0, t: 2, m: 1, sea: 1, c: ['#4e93be', '#4a8cb6'] },
    grass: { n: 'Grassland', f: 2, p: 0, t: 1, m: 1, c: ['#86ad55', '#7fa650'] }, plains: { n: 'Plains', f: 1, p: 1, t: 1, m: 1, c: ['#b8b06a', '#b0a864'] },
    desert: { n: 'Desert', f: 0, p: 1, t: 0, m: 1, c: ['#dccb94', '#d6c48c'] }, hills: { n: 'Hills', f: 1, p: 2, t: 0, m: 2, d: .5, c: ['#a59360', '#9c8a58'] },
    forest: { n: 'Forest', f: 1, p: 2, t: 0, m: 2, d: .25, c: ['#4f7a3a', '#4a7336'] }, mount: { n: 'Mountains', f: 0, p: 1, t: 0, m: 3, d: 1, c: ['#8c867a', '#837d71'] },
    marsh: { n: 'Marsh', f: 1, p: 0, t: 0, m: 2, c: ['#6f8f6a', '#698864'] }
  };
  var RES = { wheat: { i: '🌾', f: 2 }, fish: { i: '🐟', f: 2 }, olives: { i: '🫒', f: 1, t: 1 }, wine: { i: '🍇', t: 3 }, horses: { i: '🐎', p: 1 }, iron: { i: '⛓️', p: 2 }, marble: { i: '🏛️', p: 2 }, silver: { i: '🪙', t: 4 } };
  var UNITS = {
    settler: { n: 'Settlers', i: '⛺', a: 0, d: 1, m: 1, c: 30, civ: 1, d2: 'Found a new city (B). Costs 1 population.' },
    warrior: { n: 'Warriors', i: '🪓', a: 1, d: 1, m: 1, c: 10 },
    archer: { n: 'Archers', i: '🏹', a: 2, d: 2, m: 1, c: 20, tech: 'archery' },
    hoplite: { n: 'Hoplites', i: '🛡️', a: 2, d: 4, m: 1, c: 25, tech: 'bronze' },
    horse: { n: 'Horsemen', i: '🐎', a: 3, d: 1, m: 2, c: 22, tech: 'horse' },
    trireme: { n: 'Trireme', i: '⛵', a: 1, d: 1, m: 3, c: 30, tech: 'sailing', sea: 1, carry: 2 },
    legion: { n: 'Legion', i: '⚔️', a: 5, d: 3, m: 1, c: 40, tech: 'iron' },
    catapult: { n: 'Catapult', i: '🪨', a: 7, d: 1, m: 1, c: 45, tech: 'math', siege: 1 },
    phalangite: { n: 'Pike phalanx', i: '🔱', a: 4, d: 6, m: 1, c: 45, tech: 'drill' },
    cavalry: { n: 'Companion cavalry', i: '🏇', a: 7, d: 3, m: 2, c: 50, tech: 'tactics' },
    elephant: { n: 'War elephants', i: '🐘', a: 8, d: 4, m: 1, c: 55, tech: 'tactics', res: 'ivory' },
    quinq: { n: 'Quinquereme', i: '🚢', a: 4, d: 3, m: 3, c: 45, tech: 'engineering', sea: 1, carry: 3 }
  };
  delete UNITS.elephant.res;
  var BLD = {
    granary: { n: 'Granary', c: 40, tech: 'pottery', d: 'Keeps half the food when the city grows.' },
    walls: { n: 'City walls', c: 50, tech: 'masonry', d: 'Defenders in the city are twice as strong.' },
    temple: { n: 'Temple', c: 40, tech: 'mysticism', d: '+2 content citizens.', happy: 2 },
    barracks: { n: 'Barracks', c: 40, tech: 'bronze', d: 'New units are veterans (+50%).' },
    library: { n: 'Library', c: 60, tech: 'writing', d: '+50% science.' },
    market: { n: 'Agora', c: 60, tech: 'currency', d: '+50% gold and +1 content.', happy: 1 },
    harbour: { n: 'Harbour', c: 50, tech: 'sailing', d: '+1 food on ocean tiles.', coast: 1 },
    theatre: { n: 'Theatre', c: 70, tech: 'drama', d: '+3 content citizens.', happy: 3 },
    aqueduct: { n: 'Aqueduct', c: 80, tech: 'engineering', d: 'Lets the city grow beyond 8.' },
    gymnasium: { n: 'Gymnasium', c: 70, tech: 'philosophy', d: '+25% science, +1 content.', happy: 1 }
  };
  var WON = {
    pyramids: { n: 'Pyramids', c: 180, tech: 'masonry', d: '+25% production in this city.' },
    colossus: { n: 'Colossus of Rhodes', c: 160, tech: 'bronze', d: '+1 trade on every ocean tile of this city.' },
    gardens: { n: 'Hanging Gardens', c: 200, tech: 'pottery', d: '+1 content in every city.' },
    oracle: { n: 'Oracle of Delphi', c: 180, tech: 'mysticism', d: 'Temples give double contentment.' },
    lighthouse: { n: 'Pharos of Alexandria', c: 200, tech: 'sailing', d: 'Ships move +1 and are veterans.' },
    library: { n: 'Great Library', c: 260, tech: 'philosophy', d: '+3 science in every city.' },
    parthenon: { n: 'Parthenon', c: 240, tech: 'drama', d: '+2 content in every city.' },
    mausoleum: { n: 'Mausoleum', c: 200, tech: 'engineering', d: 'Walls also make 1 citizen content.' },
    museion: { n: 'Museion', c: 400, tech: 'astronomy', d: 'A wonder of all knowledge. Building it wins the game by knowledge.' }
  };
  var TECH = {
    bronze: { n: 'Bronze Working', c: 20, req: [] }, pottery: { n: 'Pottery', c: 20, req: [] }, alphabet: { n: 'Alphabet', c: 24, req: [] }, horse: { n: 'Horseback Riding', c: 24, req: [] },
    masonry: { n: 'Masonry', c: 28, req: [] }, archery: { n: 'Archery', c: 28, req: ['bronze'] }, mysticism: { n: 'Mysticism', c: 36, req: ['alphabet'] }, sailing: { n: 'Sailing', c: 40, req: ['pottery'] },
    writing: { n: 'Writing', c: 44, req: ['alphabet'] }, iron: { n: 'Iron Working', c: 55, req: ['bronze'] }, currency: { n: 'Currency', c: 55, req: ['bronze'] }, math: { n: 'Mathematics', c: 65, req: ['alphabet', 'masonry'] },
    philosophy: { n: 'Philosophy', c: 85, req: ['writing', 'mysticism'] }, drama: { n: 'Drama', c: 85, req: ['writing'] }, tactics: { n: 'Cavalry Tactics', c: 90, req: ['horse', 'iron'] }, drill: { n: 'Macedonian Drill', c: 100, req: ['iron', 'math'] },
    engineering: { n: 'Engineering', c: 110, req: ['math', 'currency'] }, astronomy: { n: 'Astronomy', c: 140, req: ['math', 'philosophy'] }
  };
  var CIVS = [
    { id: 'athens', n: 'Athens', leader: 'Pericles', col: '#2a62c9', cities: ['Athens', 'Piraeus', 'Eleusis', 'Marathon', 'Sounion', 'Laurion', 'Acharnae', 'Brauron', 'Salamis', 'Oropos'] },
    { id: 'sparta', n: 'Sparta', leader: 'Leonidas', col: '#b8342a', cities: ['Sparta', 'Gytheion', 'Amyclae', 'Pylos', 'Messene', 'Sellasia', 'Boiai', 'Helos', 'Kardamyle', 'Thalamai'] },
    { id: 'macedon', n: 'Macedon', leader: 'Philip II', col: '#7a3fa0', cities: ['Pella', 'Aigai', 'Dion', 'Amphipolis', 'Philippi', 'Thessalonica', 'Pydna', 'Methone', 'Edessa', 'Beroea'] },
    { id: 'persia', n: 'Persia', leader: 'Darius', col: '#c7a428', cities: ['Persepolis', 'Susa', 'Babylon', 'Ecbatana', 'Pasargadae', 'Sardis', 'Gordion', 'Bactra', 'Arbela', 'Tarsus'] },
    { id: 'carthage', n: 'Carthage', leader: 'Hannibal', col: '#a8761c', cities: ['Carthage', 'Utica', 'Hadrumetum', 'Leptis', 'Gades', 'Motya', 'Panormus', 'Lilybaeum', 'Hippo', 'Thapsus'] },
    { id: 'rome', n: 'Rome', leader: 'Scipio', col: '#d0402a', cities: ['Rome', 'Ostia', 'Capua', 'Tarentum', 'Brundisium', 'Ariminum', 'Antium', 'Veii', 'Cumae', 'Neapolis'] },
    { id: 'egypt', n: 'Egypt', leader: 'Ptolemy', col: '#2d8a7a', cities: ['Alexandria', 'Memphis', 'Thebes', 'Naucratis', 'Pelusium', 'Heliopolis', 'Abydos', 'Elephantine', 'Saïs', 'Canopus'] }
  ];

  /* ---------- state ---------- */
  var W = 46, H = 30, G, T; // T: tiles {t, r, own, city}
  function idx(x, y) { return y * W + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function tile(x, y) { return inb(x, y) ? T[idx(x, y)] : null; }
  function genMap(seed, n) {
    var r = Kit.rng(seed), h = new Float32Array(W * H), m = new Float32Array(W * H);
    var blobs = []; for (var i = 0; i < 9; i++) blobs.push([4 + r() * (W - 8), 4 + r() * (H - 8), 4 + r() * 6]);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var v = -0.42; blobs.forEach(function (b) { var d = Math.hypot((x - b[0]) / 1.25, y - b[1]); v += Math.max(0, 1 - d / b[2]) * .9; }); v += (r() - .5) * .25 + Math.sin(x * .5 + seed) * .08 + Math.cos(y * .6) * .08; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) v = -1; h[idx(x, y)] = v; m[idx(x, y)] = r(); }
    T = []; for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var v2 = h[idx(x, y)], k, lat = Math.abs(y - H / 2) / (H / 2);
      if (v2 < 0) k = 'ocean'; else if (v2 > 1.05) k = 'mount'; else if (v2 > .78) k = 'hills'; else { var q = m[idx(x, y)]; k = lat > .75 ? (q < .5 ? 'plains' : 'forest') : lat < .25 && q < .35 ? 'desert' : q < .45 ? 'grass' : q < .7 ? 'plains' : q < .88 ? 'forest' : 'marsh'; }
      T.push({ t: k, x: x, y: y, own: -1, city: null, seen: 0 });
    }
    T.forEach(function (t) { if (t.t === 'ocean' && around(t.x, t.y, 1).some(function (o) { return !TT[o.t].sea; })) t.t = 'coast'; });
    T.forEach(function (t) { if (r() < .09) { var ks = TT[t.t].sea ? ['fish'] : t.t === 'grass' || t.t === 'plains' ? ['wheat', 'olives', 'wine', 'horses'] : t.t === 'hills' ? ['iron', 'marble', 'silver', 'wine'] : t.t === 'forest' ? ['horses'] : t.t === 'mount' ? ['iron', 'silver', 'marble'] : t.t === 'desert' ? ['silver'] : []; if (ks.length) t.r = ks[Math.floor(r() * ks.length)]; } });
  }
  function around(x, y, rad) { var o = []; for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) { if (!dx && !dy) continue; var t = tile(x + dx, y + dy); if (t) o.push(t); } return o; }
  function land(t) { return t && !TT[t.t].sea; }
  function cityTiles(c) { var o = [tile(c.x, c.y)]; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue; if (!dx && !dy) continue; var t = tile(c.x + dx, c.y + dy); if (t && (t.own === c.p || t.own < 0)) o.push(t); } return o; }

  function newGame(civi, nAI, diff) {
    var seed = Date.now() % 1e6; genMap(seed);
    G = { turn: 0, year: -800, players: [], units: [], cities: [], sel: null, me: 0, diff: diff || 1, msgs: [], over: false, wonders: {}, uid: 1, cid: 1, seed: seed };
    var picks = [civi]; while (picks.length < nAI + 1) { var k = Math.floor(Math.random() * CIVS.length); if (picks.indexOf(k) < 0) picks.push(k); }
    var starts = findStarts(picks.length);
    picks.forEach(function (ci, i) {
      var P = { i: i, civ: ci, n: CIVS[ci].n, col: CIVS[ci].col, ai: i > 0, gold: 30, sci: 0, research: null, techs: {}, tax: .5, war: {}, alive: true, nameI: 0, seen: new Uint8Array(W * H), score: 0 };
      G.players.push(P); var s = starts[i];
      addUnit(i, 'settler', s.x, s.y); addUnit(i, 'settler', s.x + (land(tile(s.x + 1, s.y)) ? 1 : 0), s.y + (land(tile(s.x + 1, s.y)) ? 0 : 1)); addUnit(i, 'warrior', s.x, s.y); addUnit(i, 'warrior', s.x, s.y);
      if (P.ai && G.diff >= 2) { addUnit(i, 'warrior', s.x, s.y); P.gold += 30; }
    });
    G.players.forEach(function (P) { G.players.forEach(function (Q) { if (P !== Q) P.war[Q.i] = 0; }); });
    G.players[0].research = 'bronze'; G.players.forEach(function (P) { if (P.ai) P.research = pickTech(P); });
    reveal(); centerOn(G.units[0]); selectNext(); ui();
    Kit.modal('<h2>' + CIVS[civi].n + '</h2><p>' + yearTxt() + '. Your people have settled by the sea. Found your first city with the settlers (press <b>B</b> or the button), then explore, expand and outlast your rivals.</p><p class="mute small">Win by conquest, by building the Museion, or with the highest score in AD 1.</p><div class="krow"><button class="btn gold" data-close>Begin</button></div>');
  }
  function findStarts(n) {
    var cand = T.filter(function (t) { return (t.t === 'grass' || t.t === 'plains') && around(t.x, t.y, 2).filter(land).length > 14; }), out = [];
    cand.sort(function () { return Math.random() - .5; });
    for (var i = 0; i < cand.length && out.length < n; i++) { var c = cand[i]; if (out.every(function (o) { return Math.hypot(o.x - c.x, o.y - c.y) > 11; })) out.push(c); }
    while (out.length < n) out.push(cand[out.length * 7 % cand.length]);
    return out;
  }
  function addUnit(p, k, x, y) { var u = { id: G.uid++, p: p, k: k, x: x, y: y, hp: 10, mv: UNITS[k].m, vet: false, fort: false, goto: null, sleep: false, cargo: [] }; G.units.push(u); return u; }
  function unitsAt(x, y) { return G.units.filter(function (u) { return u.x === x && u.y === y && !u.dead; }); }
  function cityAt(x, y) { var t = tile(x, y); return t && t.city; }
  function yearTxt() { var y = G.year; return y < 0 ? -y + ' BC' : 'AD ' + Math.max(1, y); }

  /* ---------- cities ---------- */
  function foundCity(u) {
    var t = tile(u.x, u.y), P = G.players[u.p];
    if (!land(t) || t.city || around(u.x, u.y, 2).some(function (o) { return o.city; })) { if (!P.ai) msg('Too close to another city.', 1); return false; }
    var name = CIVS[P.civ].cities[P.nameI++ % 10] + (P.nameI > 10 ? ' II' : '');
    var c = { id: G.cid++, p: u.p, n: name, x: u.x, y: u.y, pop: 1, food: 0, prod: 0, build: null, b: {}, cap: !G.cities.some(function (q) { return q.p === u.p; }) };
    G.cities.push(c); t.city = c; claim(c); kill(u);
    c.build = P.ai ? null : 'warrior';
    if (!P.ai) { msg('🏛️ ' + name + ' is founded.'); Kit.sfx.good(); }
    reveal(); return c;
  }
  function claim(c) { cityTiles(c).forEach(function (t) { if (t.own < 0) t.own = c.p; }); around(c.x, c.y, 2).forEach(function (t) { if (t.own < 0) t.own = c.p; }); tile(c.x, c.y).own = c.p; }
  function yields(t, c) { var Y = TT[t.t], R = t.r ? RES[t.r] : {}, f = Y.f + (R.f || 0), p = Y.p + (R.p || 0), tr = Y.t + (R.t || 0); if (c && TT[t.t].sea && c.b.harbour) f++; if (c && TT[t.t].sea && c.b.colossus) tr++; if (c && t.x === c.x && t.y === c.y) { f = Math.max(f, 2); p = Math.max(p, 1); tr = Math.max(tr, 1) + 1; } return { f: f, p: p, t: tr }; }
  function hasWonder(p, w) { return G.cities.some(function (c) { return c.p === p && c.b[w]; }); }
  function content(c) { var P = G.players[c.p], n = 4 - (G.diff >= 2 && !P.ai ? 1 : 0) + (c.b.temple ? (hasWonder(c.p, 'oracle') ? 4 : 2) : 0) + (c.b.theatre ? 3 : 0) + (c.b.market ? 1 : 0) + (c.b.gymnasium ? 1 : 0) + (hasWonder(c.p, 'gardens') ? 1 : 0) + (hasWonder(c.p, 'parthenon') ? 2 : 0) + (c.b.walls && hasWonder(c.p, 'mausoleum') ? 1 : 0); return n; }
  function work(c) { // pick the best tiles for the population
    var ts = cityTiles(c).filter(function (t) { return t.x !== c.x || t.y !== c.y; }).filter(function (t) { return !unitsAt(t.x, t.y).some(function (u) { return u.p !== c.p; }); });
    ts.sort(function (a, b) { var ya = yields(a, c), yb = yields(b, c); return (yb.f * 3 + yb.p * 2 + yb.t) - (ya.f * 3 + ya.p * 2 + ya.t); });
    var used = ts.slice(0, c.pop), tot = yields(tile(c.x, c.y), c); used.forEach(function (t) { var y = yields(t, c); tot.f += y.f; tot.p += y.p; tot.t += y.t; });
    var unhappy = Math.max(0, c.pop - content(c)); c.unrest = unhappy > c.pop / 2 && c.pop >= 4;
    var P = G.players[c.p], sci = Math.round(tot.t * (1 - P.tax)), gold = tot.t - sci;
    if (c.b.library) sci = Math.round(sci * 1.5); if (c.b.gymnasium) sci = Math.round(sci * 1.25); if (hasWonder(c.p, 'library')) sci += 3; if (c.b.market) gold = Math.round(gold * 1.5);
    var prod = tot.p * (c.b.pyramids ? 1.25 : 1); if (c.unrest) prod = 0;
    return { f: tot.f, p: Math.round(prod), t: tot.t, sci: sci, gold: gold, used: used, surplus: tot.f - c.pop * 2, unhappy: unhappy };
  }
  function growBox(c) { return 12 + c.pop * 7; }
  function costOf(k) { if (k === 'wealth') return 1e9; return UNITS[k] ? UNITS[k].c : BLD[k] ? BLD[k].c : WON[k].c; }
  function nameOf(k) { if (k === 'wealth') return 'Trade goods'; return UNITS[k] ? UNITS[k].n : BLD[k] ? BLD[k].n : WON[k].n; }
  function canBuild(c, k) {
    var P = G.players[c.p];
    if (k === 'wealth') return true;
    if (UNITS[k]) { var U = UNITS[k]; if (U.tech && !P.techs[U.tech]) return false; if (U.sea && !around(c.x, c.y, 1).some(function (t) { return TT[t.t].sea; })) return false; return true; }
    if (BLD[k]) { if (c.b[k] || (BLD[k].tech && !P.techs[BLD[k].tech])) return false; if (BLD[k].coast && !around(c.x, c.y, 1).some(function (t) { return TT[t.t].sea; })) return false; return true; }
    if (WON[k]) { if (G.wonders[k] || !P.techs[WON[k].tech]) return false; if (G.cities.some(function (o) { return o !== c && o.p === c.p && o.build === k; })) return false; return true; }
  }
  function options(c) { return Object.keys(UNITS).concat(Object.keys(BLD), Object.keys(WON), ['wealth']).filter(function (k) { return canBuild(c, k); }); }
  function cityTurn(c) {
    var P = G.players[c.p], y = work(c);
    c.food += y.surplus; var cap = c.b.aqueduct ? 20 : 8;
    if (c.food >= growBox(c)) { if (c.pop < cap) { c.pop++; c.food = c.b.granary ? Math.floor(growBox(c) / 2) : 0; if (!P.ai) msg(c.n + ' grows to ' + c.pop + '.'); } else c.food = growBox(c); }
    if (c.food < 0) { if (c.pop > 1) { c.pop--; c.food = 0; if (!P.ai) msg('Famine in ' + c.n + '!', 1); } else c.food = 0; }
    P.gold += y.gold; P.sci += y.sci;
    if (!c.build) { if (P.ai) aiBuild(c); else c.build = 'warrior'; }
    if (c.build && !canBuild(c, c.build)) { if (WON[c.build] && G.wonders[c.build] && !P.ai) msg('Another people finished the ' + WON[c.build].n + ' first. ' + c.n + ' switches production.', 1); c.build = null; if (P.ai) aiBuild(c); else c.build = 'warrior'; }
    if (c.build === 'wealth') { P.gold += Math.floor(y.p / 2); return; }
    c.prod += y.p;
    if (c.build && c.prod >= costOf(c.build)) {
      var k = c.build;
      if (k === 'settler' && c.pop < 2) return;
      c.prod -= costOf(k);
      if (UNITS[k]) { var u = addUnit(c.p, k, c.x, c.y); u.vet = !!c.b.barracks || (UNITS[k].sea && hasWonder(c.p, 'lighthouse')); if (k === 'settler') c.pop--; if (!P.ai) msg(c.n + ' trains ' + UNITS[k].n + '.'); }
      else if (BLD[k]) { c.b[k] = 1; if (!P.ai) msg(c.n + ' builds a ' + BLD[k].n + '.'); }
      else { c.b[k] = 1; G.wonders[k] = c.p; msg('✨ ' + P.n + ' completes the ' + WON[k].n + ' in ' + c.n + '!'); Kit.sfx.win(); if (k === 'museion') { endGame(c.p, 'knowledge'); } }
      if (P.ai || !UNITS[k] || k === 'settler') c.build = P.ai ? null : (BLD[k] || WON[k] ? 'warrior' : k);
    }
  }

  /* ---------- research ---------- */
  function techCost(P, k) { var n = Object.keys(P.techs).length; return Math.round(TECH[k].c * (1 + n * .12) * (P.ai && G.diff === 0 ? 1.3 : 1)); }
  function avail(P) { return Object.keys(TECH).filter(function (k) { return !P.techs[k] && TECH[k].req.every(function (r) { return P.techs[r]; }); }); }
  function pickTech(P) { var a = avail(P); if (!a.length) return null; a.sort(function (x, y) { return TECH[x].c - TECH[y].c; }); return a[Math.floor(Math.random() * Math.min(2, a.length))]; }
  function research(P) {
    if (!P.research) { P.research = P.ai ? pickTech(P) : null; if (!P.research) return; }
    if (P.sci >= techCost(P, P.research)) {
      P.sci -= techCost(P, P.research); P.techs[P.research] = 1; var done = P.research;
      if (!P.ai) { msg('📜 You discover ' + TECH[done].n + '!'); Kit.sfx.good(); }
      P.research = P.ai ? pickTech(P) : null;
      if (!P.ai && avail(P).length) setTimeout(function () { techModal(true); }, 300);
    }
  }

  /* ---------- movement and combat ---------- */
  function moveCost(u, t) { if (UNITS[u.k].sea) return TT[t.t].sea ? 1 : 99; if (TT[t.t].sea) return 99; return TT[t.t].m; }
  function passable(u, t) { if (!t) return false; if (UNITS[u.k].sea) return TT[t.t].sea || (t.city && t.city.p === u.p); return !TT[t.t].sea || canBoard(u, t); }
  function canBoard(u, t) { return unitsAt(t.x, t.y).some(function (s) { return s.p === u.p && UNITS[s.k].carry && s.cargo.length < UNITS[s.k].carry; }); }
  function enemyAt(u, x, y) { var e = unitsAt(x, y).filter(function (o) { return o.p !== u.p; }); var c = cityAt(x, y); return { units: e, city: c && c.p !== u.p ? c : null }; }
  function atWar(a, b) { return a !== b && G.players[a].war[b] === 1; }
  function path(u, tx, ty) { // A*
    var start = idx(u.x, u.y), goal = idx(tx, ty), open = [[0, start]], g = {}, from = {}; g[start] = 0;
    while (open.length) {
      open.sort(function (a, b) { return a[0] - b[0]; }); var cur = open.shift()[1]; if (cur === goal) break;
      var cx = cur % W, cy = (cur / W) | 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var t = tile(cx + dx, cy + dy); if (!t) continue; var ni = idx(t.x, t.y); if (ni !== goal && !passable(u, t)) continue; var e = enemyAt(u, t.x, t.y); if (ni !== goal && (e.units.length || e.city)) continue; var cst = g[cur] + (ni === goal ? 1 : Math.min(3, moveCost(u, t) === 99 ? 1 : moveCost(u, t))); if (g[ni] == null || cst < g[ni]) { g[ni] = cst; from[ni] = cur; open.push([cst + Math.max(Math.abs(t.x - tx), Math.abs(t.y - ty)), ni]); } }
      if (Object.keys(g).length > 2500) break;
    }
    if (from[goal] == null && goal !== start) return null;
    var p = [], c = goal; while (c !== start) { p.unshift([c % W, (c / W) | 0]); c = from[c]; } return p;
  }
  function step(u, x, y) { // one step; returns false if it cannot continue
    if (u.mv <= 0) return false; var t = tile(x, y); if (!t || Math.max(Math.abs(x - u.x), Math.abs(y - u.y)) !== 1) return false;
    var e = enemyAt(u, x, y);
    if (e.units.length || (e.city && !e.units.length)) {
      var owner = e.units.length ? e.units[0].p : e.city.p;
      if (!atWar(u.p, owner)) { if (!G.players[u.p].ai) msg('You are at peace with ' + G.players[owner].n + '. Declare war in the 🤝 Rivals panel first.', 1); return false; }
      if (UNITS[u.k].a === 0) return false;
      if (e.units.length) { attack(u, x, y); return false; }
      if (e.city) { if (UNITS[u.k].sea || UNITS[u.k].siege) return false; capture(u, e.city); }
    }
    if (!passable(u, t)) return false;
    var cost = moveCost(u, t); if (cost === 99 && canBoard(u, t)) { var ship = unitsAt(x, y).find(function (s) { return s.p === u.p && UNITS[s.k].carry && s.cargo.length < UNITS[s.k].carry; }); ship.cargo.push(u.id); cost = 1; u.mv = 0; }
    var ship2 = G.units.find(function (s) { return s.cargo.indexOf(u.id) >= 0; }); if (ship2 && !TT[t.t].sea) { ship2.cargo.splice(ship2.cargo.indexOf(u.id), 1); u.mv = 0; }
    u.x = x; u.y = y; u.mv = Math.max(0, u.mv - Math.min(cost === 99 ? 1 : cost, Math.max(1, u.mv))); u.fort = false;
    if (UNITS[u.k].carry) u.cargo.forEach(function (id) { var c = G.units.find(function (q) { return q.id === id; }); if (c) { c.x = x; c.y = y; } });
    if (u.p === G.me || !G.players[u.p].ai) reveal();
    var hut = tile(x, y); if (hut.ruin && !UNITS[u.k].sea) ruins(u, hut);
    return u.mv > 0;
  }
  function strength(u, def, t) {
    var U = UNITS[u.k], s = def ? U.d : U.a; if (def && s < 1) s = 1;
    s *= .5 + .5 * u.hp / 10; if (u.vet) s *= 1.5;
    if (def) { var T2 = TT[t.t]; s *= 1 + (T2.d || 0); if (u.fort) s *= 1.25; if (t.city) { s *= 1.5; if (t.city.b.walls) s *= 2; } if (u.k === 'phalangite' || u.k === 'hoplite') s *= 1.1; }
    return s;
  }
  function attack(a, x, y) {
    var t = tile(x, y), ds = unitsAt(x, y).filter(function (o) { return o.p !== a.p; }); if (!ds.length) return;
    var d = ds.sort(function (p, q) { return strength(q, true, t) - strength(p, true, t); })[0], A = strength(a, false, tile(a.x, a.y)), D = strength(d, true, t);
    var rounds = 0; while (a.hp > 0 && d.hp > 0 && rounds++ < 6) { var r = A / (A + D); if (Math.random() < r) d.hp -= 2 + Math.floor(Math.random() * 3); else if (!UNITS[a.k].siege) a.hp -= 2 + Math.floor(Math.random() * 3); else a.hp -= 1; }
    a.mv = 0; a.fort = false; var mine = a.p === G.me || d.p === G.me;
    fx.push({ x: x, y: y, t: 0 }); if (mine) Kit.sfx.hit();
    if (d.hp <= 0) { kill(d); if (mine) msg((a.p === G.me ? '⚔️ Your ' + UNITS[a.k].n + ' defeat ' : '💀 Enemy ' + UNITS[a.k].n + ' destroy your ') + (a.p === G.me ? G.players[d.p].n + ' ' + UNITS[d.k].n : UNITS[d.k].n) + '.', a.p !== G.me); if (Math.random() < .3) a.vet = true;
      // the stack dies if the defender falls outside a city
      if (!t.city) unitsAt(x, y).filter(function (o) { return o.p !== a.p; }).forEach(function (o) { kill(o); }); }
    if (a.hp <= 0) { kill(a); if (mine) msg(a.p === G.me ? '💀 Your ' + UNITS[a.k].n + ' are lost.' : '🛡️ Your ' + UNITS[d.k].n + ' hold!', a.p === G.me); }
  }
  function capture(u, c) {
    var old = c.p, P = G.players[u.p];
    c.pop = Math.max(1, c.pop - 1);
    if (c.pop <= 1 && !c.cap && Math.random() < .3) { msg(c.n + ' is razed.'); G.cities.splice(G.cities.indexOf(c), 1); tile(c.x, c.y).city = null; return; }
    c.p = u.p; c.cap = false; c.build = null; c.prod = 0; delete c.b.walls; cityTiles(c).forEach(function (t) { if (t.own === old) t.own = u.p; });
    var loot = Math.floor(G.players[old].gold * .3); G.players[old].gold -= loot; P.gold += loot;
    msg((u.p === G.me ? '🏛️ You capture ' : '⚠️ ' + P.n + ' captures ') + c.n + (loot ? ' and ' + loot + ' gold' : '') + '!', u.p !== G.me); Kit.sfx[u.p === G.me ? 'win' : 'bad']();
    if (!P.ai) c.build = 'warrior';
    checkAlive();
  }
  function kill(u) { u.dead = true; G.units = G.units.filter(function (x) { return x !== u; }); if (u.cargo) u.cargo.forEach(function (id) { var c = G.units.find(function (q) { return q.id === id; }); if (c && TT[tile(c.x, c.y).t].sea) kill(c); }); if (G.sel === u) G.sel = null; }
  function ruins(u, t) { t.ruin = 0; var P = G.players[u.p], r = Math.random(); if (r < .35) { P.gold += 25 + Math.floor(Math.random() * 25); if (!P.ai) msg('🏺 Ancient ruins: you find gold.'); } else if (r < .6) { var a = avail(P); if (a.length) { var k = a[Math.floor(Math.random() * a.length)]; P.techs[k] = 1; if (P.research === k) P.research = null; if (!P.ai) msg('📜 Ancient scrolls teach you ' + TECH[k].n + '!'); } } else if (r < .8) { addUnit(u.p, 'warrior', u.x, u.y); if (!P.ai) msg('🪓 Friendly tribesmen join you.'); } else { if (!P.ai) msg('The ruins are empty.'); } }
  function declare(a, b) {
    G.players[a].war[b] = 1; G.players[b].war[a] = 1; G.players[a].peaceT = G.players[b].peaceT = G.turn;
    msg('⚔️ ' + G.players[a].n + ' declares war on ' + G.players[b].n + '!', true);
  }
  function makePeace(a, b) { G.players[a].war[b] = 0; G.players[b].war[a] = 0; msg('🕊️ ' + G.players[a].n + ' and ' + G.players[b].n + ' make peace.'); }

  /* ---------- AI ---------- */
  function aiBuild(c) {
    var P = G.players[c.p], defenders = unitsAt(c.x, c.y).filter(function (u) { return UNITS[u.k].a > 0 && !UNITS[u.k].sea; }).length, myCities = G.cities.filter(function (q) { return q.p === c.p; }).length;
    var war = Object.keys(P.war).some(function (k) { return P.war[k]; }), best = function (list) { return list.filter(function (k) { return canBuild(c, k); }).pop(); };
    var def = best(['warrior', 'archer', 'hoplite', 'phalangite']), att = best(['warrior', 'horse', 'archer', 'legion', 'cavalry']);
    var settlers = G.units.filter(function (u) { return u.p === c.p && u.k === 'settler'; }).length;
    var army = G.units.filter(function (u) { return u.p === c.p && UNITS[u.k].a > 0; }).length, capA = myCities * (war ? 3 : 2) + 3;
    if (defenders < 1 + (war ? 1 : 0) + (c.pop >= 5 ? 1 : 0) && army < capA + 3) c.build = def;
    else if (myCities + settlers < 4 + G.diff * 2 && c.pop >= 2 && settlers < 2 && G.turn < 120) c.build = 'settler';
    else if (war && army < capA && Math.random() < .55) c.build = Math.random() < .3 && canBuild(c, 'catapult') ? 'catapult' : att;
    else { var bs = ['granary', 'temple', 'walls', 'library', 'market', 'harbour', 'barracks', 'theatre', 'gymnasium', 'aqueduct'].filter(function (k) { return canBuild(c, k); }); var ws = Object.keys(WON).filter(function (k) { return canBuild(c, k); });
      c.build = ws.length && Math.random() < .3 && c.pop >= 3 ? ws[Math.floor(Math.random() * ws.length)] : bs.length ? bs[0] : ws.length ? ws[0] : army < capA ? (Math.random() < .5 ? att : def) : 'wealth'; }
    if (!c.build) c.build = 'warrior';
  }
  function aiTurn(P) {
    if (!P.alive) return;
    var mine = G.cities.filter(function (c) { return c.p === P.i; });
    // diplomacy
    G.players.forEach(function (Q) {
      if (Q === P || !Q.alive) return; var met = P.seen[idx(capX(Q), capY(Q))] || G.turn > 40; if (!met) return;
      var my = power(P.i), their = power(Q.i);
      if (!P.war[Q.i] && G.turn > 25 && G.turn - (P.peaceT || 0) > 25 && my > their * (1.3 - G.diff * .15) && Math.random() < .025 + G.diff * .015) declare(P.i, Q.i);
      else if (P.war[Q.i] && G.turn - (P.peaceT || 0) > 20 && my < their * .7 && Math.random() < .15 && Q.ai) makePeace(P.i, Q.i);
    });
    var targets = G.cities.filter(function (c) { return atWar(P.i, c.p); });
    G.units.filter(function (u) { return u.p === P.i; }).slice().forEach(function (u) {
      if (u.dead) return; var U = UNITS[u.k];
      if (u.k === 'settler') { aiSettle(u, P); return; }
      if (U.sea) { u.fort = true; return; }
      var here = cityAt(u.x, u.y), guards = here ? unitsAt(u.x, u.y).filter(function (o) { return o.p === P.i && UNITS[o.k].a > 0; }) : [];
      if (here && here.p === P.i && guards.length <= 1 + (here.pop >= 5 ? 1 : 0) && U.d >= U.a) { u.fort = true; return; }
      // attack adjacent enemies we can beat
      var adj = around(u.x, u.y, 1).filter(function (t) { var e = enemyAt(u, t.x, t.y); return (e.units.length && atWar(P.i, e.units[0].p)) || (e.city && atWar(P.i, e.city.p) && !e.units.length); });
      if (adj.length && U.a > 0) { var t = adj[0], e = enemyAt(u, t.x, t.y); if (!e.units.length || strength(u, false, tile(u.x, u.y)) > strength(e.units[0], true, t) * .8) { step(u, t.x, t.y); return; } }
      if (targets.length && U.a >= 2 && u.hp > 5) { var tg = targets.sort(function (a, b) { return dist(u, a) - dist(u, b); })[0]; if (dist(u, tg) < 22) { goTo(u, tg.x, tg.y); return; } }
      if (u.hp < 6) { u.fort = true; u.hp = Math.min(10, u.hp + 1); return; }
      // explore or guard
      if (G.turn < 60 && u.k === 'warrior' && !here) { var un = nearestUnseen(u, P); if (un) { goTo(u, un.x, un.y); return; } }
      var home = mine.sort(function (a, b) { return unitsAt(a.x, a.y).length - unitsAt(b.x, b.y).length; })[0]; if (home && !(u.x === home.x && u.y === home.y)) goTo(u, home.x, home.y); else u.fort = true;
    });
    if (G.players[P.i].gold > 120) { var poor = mine.find(function (c) { return c.build && UNITS[c.build] && costOf(c.build) - c.prod < 40; }); if (poor) { var cst = (costOf(poor.build) - poor.prod) * 2; if (P.gold > cst + 60) { P.gold -= cst; poor.prod = costOf(poor.build); } } }
  }
  function capX(Q) { var c = G.cities.find(function (c) { return c.p === Q.i; }); return c ? c.x : 0; }
  function capY(Q) { var c = G.cities.find(function (c) { return c.p === Q.i; }); return c ? c.y : 0; }
  function power(i) { return G.units.filter(function (u) { return u.p === i; }).reduce(function (a, u) { return a + UNITS[u.k].a + UNITS[u.k].d; }, 0) + 1; }
  function dist(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
  function nearestUnseen(u, P) { var best = null, bd = 99; for (var r = 2; r < 14 && !best; r += 2) around(u.x, u.y, r).forEach(function (t) { if (!P.seen[idx(t.x, t.y)] && land(t)) { var d = dist(u, t); if (d < bd) { bd = d; best = t; } } }); return best; }
  function aiSettle(u, P) {
    if (!u.target || tile(u.target[0], u.target[1]).city || around(u.target[0], u.target[1], 2).some(function (o) { return o.city; })) {
      var best = null, bs = -1; for (var dy = -8; dy <= 8; dy++) for (var dx = -8; dx <= 8; dx++) { var t = tile(u.x + dx, u.y + dy); if (!land(t) || t.city || around(t.x, t.y, 2).some(function (o) { return o.city; }) || (t.own >= 0 && t.own !== P.i)) continue; var s = around(t.x, t.y, 2).reduce(function (a, o) { var y = yields(o); return a + y.f * 2 + y.p + y.t; }, 0) - Math.max(Math.abs(dx), Math.abs(dy)) * 2 + (around(t.x, t.y, 1).some(function (o) { return TT[o.t].sea; }) ? 4 : 0); if (s > bs) { bs = s; best = t; } }
      u.target = best ? [best.x, best.y] : null;
    }
    if (!u.target) { foundCity(u) || (u.fort = true); return; }
    if (u.x === u.target[0] && u.y === u.target[1]) { foundCity(u); return; }
    goTo(u, u.target[0], u.target[1]); if (!u.dead && u.x === u.target[0] && u.y === u.target[1] && u.mv >= 0) foundCity(u);
  }
  function goTo(u, x, y) { var p = path(u, x, y); if (!p) { u.fort = true; return; } for (var i = 0; i < p.length && u.mv > 0 && !u.dead; i++) { var ok = step(u, p[i][0], p[i][1]); if (u.x !== p[i][0] || u.y !== p[i][1]) break; if (!ok) break; } }

  /* ---------- turns ---------- */
  function endTurn() {
    if (G.over || busy) return; busy = true;
    // player's goto orders
    G.units.filter(function (u) { return u.p === G.me && u.goto && u.mv > 0; }).forEach(function (u) { goTo(u, u.goto[0], u.goto[1]); if (u.x === u.goto[0] && u.y === u.goto[1]) u.goto = null; });
    var me0 = G.players[G.me]; if (!me0.research && avail(me0).length) { me0.research = pickTech(me0); msg('Your scholars choose to study ' + TECH[me0.research].n + '.'); }
    G.players.forEach(function (P) { if (P.ai && P.alive) aiTurn(P); });
    G.cities.slice().forEach(cityTurn);
    G.players.forEach(function (P) { research(P); if (P.gold < 0) { P.gold = 0; var b = G.cities.find(function (c) { return c.p === P.i && Object.keys(c.b).some(function (k) { return BLD[k]; }); }); if (b) { var k = Object.keys(b.b).find(function (k) { return BLD[k]; }); delete b.b[k]; if (!P.ai) msg('Bankrupt! The ' + BLD[k].n + ' in ' + b.n + ' is sold.', 1); } } });
    // upkeep: units beyond free support cost gold
    G.players.forEach(function (P) { var n = G.units.filter(function (u) { return u.p === P.i; }).length, free = G.cities.filter(function (c) { return c.p === P.i; }).length * 2 + 2; P.gold -= Math.max(0, n - free) * (P.ai && G.diff < 2 ? .5 : 1); P.gold = Math.round(P.gold); });
    G.units.forEach(function (u) { if (u.hp < 10 && (u.mv === UNITS[u.k].m || u.fort)) u.hp = Math.min(10, u.hp + (cityAt(u.x, u.y) ? 3 : 1)); u.mv = UNITS[u.k].m + (UNITS[u.k].sea && hasWonder(u.p, 'lighthouse') ? 1 : 0); });
    G.turn++; G.year += G.year < -400 ? 10 : G.year < -100 ? 5 : 2; if (G.year === 0) G.year = 1;
    checkAlive(); score();
    if (G.year >= 1 && !G.over) { var best = G.players.slice().sort(function (a, b) { return b.score - a.score; })[0]; endGame(best.i, 'score'); }
    reveal(); busy = false; selectNext(); ui(); autosave();
  }
  var busy = false;
  function checkAlive() {
    G.players.forEach(function (P) { if (!P.alive) return; var has = G.cities.some(function (c) { return c.p === P.i; }) || G.units.some(function (u) { return u.p === P.i && u.k === 'settler'; }); if (!has && G.turn > 2) { P.alive = false; G.units = G.units.filter(function (u) { return u.p !== P.i; }); msg('🏳️ ' + P.n + ' has been destroyed.', P.i === G.me); } });
    if (!G.players[G.me].alive) endGame(-1, 'dead');
    else if (G.players.every(function (P) { return P.i === G.me || !P.alive; })) endGame(G.me, 'conquest');
  }
  function score() { G.players.forEach(function (P) { var cs = G.cities.filter(function (c) { return c.p === P.i; }); P.score = cs.reduce(function (a, c) { return a + c.pop * 3; }, 0) + Object.keys(P.techs).length * 4 + Object.keys(G.wonders).filter(function (k) { return G.wonders[k] === P.i; }).length * 15; }); }
  function endGame(w, how) {
    if (G.over) return; G.over = true; Kit.store.set('oi-save', null);
    var me = w === G.me, text = how === 'dead' ? 'Your civilization has fallen. Its cities now belong to others.' : how === 'conquest' ? 'Every rival is gone. The whole oikoumene, the inhabited world, is yours.' : how === 'knowledge' ? (me ? 'Your Museion gathers every book and scholar in the world. Your civilization will be remembered for ever.' : G.players[w].n + ' completes the Museion, and the age belongs to them.') : 'The age of the ancient world draws to a close. ' + (me ? 'Your civilization is the greatest of them all.' : G.players[w].n + ' is remembered as the greatest civilization.');
    if (me) Kit.sfx.win(); else Kit.sfx.bad();
    var rows = G.players.slice().sort(function (a, b) { return b.score - a.score; }).map(function (P) { return '<tr><td><i class="oi-dot" style="background:' + P.col + '"></i>' + P.n + (P.alive ? '' : ' (destroyed)') + '</td><td class="num">' + P.score + '</td></tr>'; }).join('');
    Kit.modal('<h2>' + (me ? '🏆 Victory' : '🏛️ The end of an age') + '</h2><p>' + text + '</p><table class="kt">' + rows + '</table><div class="krow"><button class="btn gold" id="ng">New game</button><button class="btn ghost" data-close>Look at the map</button></div>', { sticky: true });
    $('#ng').onclick = function () { Kit.closeModal(); menu(); };
  }

  /* ---------- fog ---------- */
  function reveal() {
    G.players.forEach(function (P) {
      var vis = function (x, y, r) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (inb(x + dx, y + dy)) P.seen[idx(x + dx, y + dy)] = 1; };
      G.units.forEach(function (u) { if (u.p === P.i) vis(u.x, u.y, tile(u.x, u.y).t === 'hills' || tile(u.x, u.y).t === 'mount' ? 2 : 1 + (UNITS[u.k].sea ? 1 : 0)); });
      G.cities.forEach(function (c) { if (c.p === P.i) vis(c.x, c.y, 2); });
    });
  }
  function visibleNow(x, y) { var me = G.me; return G.units.some(function (u) { return u.p === me && Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) <= 1 + (UNITS[u.k].sea ? 1 : 0); }) || G.cities.some(function (c) { return c.p === me && Math.max(Math.abs(c.x - x), Math.abs(c.y - y)) <= 2; }); }

  /* ---------- drawing ---------- */
  var cam = { x: 0, y: 0, z: 1 }, TS = 40, fx = [], t0 = 0, hov = null;
  function centerOn(o) { if (o) { cam.x = (o.x + .5) * TS; cam.y = (o.y + .5) * TS; } }
  function scr(x, y) { return [(x * TS - cam.x) * cam.z + cv.width / 2, (y * TS - cam.y) * cam.z + cv.height / 2]; }
  function draw() {
    var dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect(); if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    ctx.fillStyle = '#0d1b24'; ctx.fillRect(0, 0, cv.width, cv.height); if (!G) return;
    var me = G.players[G.me], s = TS * cam.z, x0 = Math.max(0, Math.floor((cam.x - cv.width / 2 / cam.z) / TS) - 1), x1 = Math.min(W - 1, Math.ceil((cam.x + cv.width / 2 / cam.z) / TS) + 1), y0 = Math.max(0, Math.floor((cam.y - cv.height / 2 / cam.z) / TS) - 1), y1 = Math.min(H - 1, Math.ceil((cam.y + cv.height / 2 / cam.z) / TS) + 1);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var t = T[idx(x, y)], p = scr(x, y); if (!me.seen[idx(x, y)]) { ctx.fillStyle = '#0d1b24'; ctx.fillRect(p[0], p[1], s + 1, s + 1); continue; }
      var Ty = TT[t.t]; ctx.fillStyle = Ty.c[(x * 3 + y * 7) % 2]; ctx.fillRect(p[0], p[1], s + 1, s + 1);
      deco(t, p, s);
      if (t.own >= 0) { var col = G.players[t.own].col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, 2.5 * cam.z); [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 0, 1, 1, 1], [-1, 0, 0, 0, 0, 1]].forEach(function (e) { var o = tile(x + e[0], y + e[1]); if (!o || o.own !== t.own) { ctx.beginPath(); ctx.moveTo(p[0] + e[2] * s, p[1] + e[3] * s); ctx.lineTo(p[0] + e[4] * s, p[1] + e[5] * s); ctx.stroke(); } }); ctx.fillStyle = col + '22'; ctx.fillRect(p[0], p[1], s, s); }
      if (t.r && cam.z > .55) { ctx.font = Math.round(s * .32) + 'px system-ui'; ctx.textAlign = 'right'; ctx.fillText(RES[t.r].i, p[0] + s - 2, p[1] + s - 3); }
      if (t.ruin) { ctx.font = Math.round(s * .45) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🏚️', p[0] + s / 2, p[1] + s * .65); }
      if (!visibleNow(x, y)) { ctx.fillStyle = 'rgba(10,20,30,.38)'; ctx.fillRect(p[0], p[1], s + 1, s + 1); }
    }
    // city work radius for selected city
    if (G.selCity) { cityTiles(G.selCity).forEach(function (t) { var p = scr(t.x, t.y); ctx.strokeStyle = 'rgba(255,240,180,.6)'; ctx.lineWidth = 1; ctx.strokeRect(p[0] + 1, p[1] + 1, s - 2, s - 2); }); work(G.selCity).used.forEach(function (t) { var p = scr(t.x, t.y), y = yields(t, G.selCity); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(p[0] + 2, p[1] + 2, s - 4, s * .3); ctx.font = '700 ' + Math.round(s * .22) + 'px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(y.f + '🌾' + y.p + '⚒' + y.t + '🪙', p[0] + s / 2, p[1] + s * .25); }); }
    // cities
    G.cities.forEach(function (c) { if (!me.seen[idx(c.x, c.y)]) return; var p = scr(c.x, c.y), col = G.players[c.p].col; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0] + s / 2, p[1] + s / 2, s * .42, 0, 7); ctx.fill(); ctx.strokeStyle = c.b.walls ? '#d9cfb5' : '#fff'; ctx.lineWidth = c.b.walls ? 4 : 2; ctx.stroke();
      ctx.fillStyle = '#f3ead2'; for (var k = 0; k < 4; k++) ctx.fillRect(p[0] + s * (.25 + k * .13), p[1] + s * (.38 - (k % 2) * .06), s * .1, s * .26); ctx.fillStyle = '#b5523a'; ctx.beginPath(); ctx.moveTo(p[0] + s * .22, p[1] + s * .38); ctx.lineTo(p[0] + s * .5, p[1] + s * .2); ctx.lineTo(p[0] + s * .78, p[1] + s * .38); ctx.fill();
      ctx.font = '700 ' + Math.max(11, Math.round(s * .3)) + 'px system-ui'; ctx.textAlign = 'center'; var label = c.n + ' ' + c.pop, w = ctx.measureText(label).width + 10; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p[0] + s / 2 - w / 2, p[1] + s + 1, w, s * .36 + 2); ctx.fillStyle = c.unrest ? '#ff8a7a' : '#fff'; ctx.fillText(label, p[0] + s / 2, p[1] + s * 1.3);
    });
    // units (top one of each tile)
    var drawn = {};
    G.units.slice().reverse().forEach(function (u) { var k = idx(u.x, u.y); if (drawn[k] || !me.seen[k] || (u.p !== G.me && !visibleNow(u.x, u.y))) return; if (G.units.some(function (s2) { return s2.cargo && s2.cargo.indexOf(u.id) >= 0; })) return; drawn[k] = 1; var p = scr(u.x, u.y), st = unitsAt(u.x, u.y).length, sel = G.sel === u, col = G.players[u.p].col, c = cityAt(u.x, u.y);
      var cx = p[0] + s / 2 + (c ? s * .3 : 0), cy = p[1] + s / 2 + (c ? -s * .3 : 0), rr = s * (c ? .26 : .36);
      if (sel) { ctx.fillStyle = 'rgba(255,230,120,' + (.5 + Math.sin(t0 * 6) * .3) + ')'; ctx.beginPath(); ctx.arc(cx, cy, rr + 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill(); ctx.strokeStyle = u.fort ? '#d9cfb5' : '#fff'; ctx.lineWidth = u.fort ? 3 : 1.5; ctx.stroke();
      ctx.font = Math.round(rr * 1.15) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(UNITS[u.k].i, cx, cy + rr * .4);
      if (u.hp < 10) { ctx.fillStyle = '#300'; ctx.fillRect(cx - rr, cy + rr, rr * 2, 3); ctx.fillStyle = '#4c4'; ctx.fillRect(cx - rr, cy + rr, rr * 2 * u.hp / 10, 3); }
      if (st > 1) { ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(rr * .7) + 'px system-ui'; ctx.fillText(st, cx + rr, cy - rr * .6); }
      if (u.cargo && u.cargo.length) { ctx.fillText('+' + u.cargo.length, cx - rr, cy - rr * .6); }
      if (u.p === G.me && u.mv > 0 && !u.fort && !u.sleep && !sel) { ctx.fillStyle = '#7dff8a'; ctx.beginPath(); ctx.arc(cx + rr * .8, cy + rr * .8, 3, 0, 7); ctx.fill(); }
    });
    // planned path
    if (G.sel && hov && G.sel.p === G.me) { var pp = planCache(G.sel, hov); if (pp) { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2.5; ctx.beginPath(); var a = scr(G.sel.x + .5, G.sel.y + .5); ctx.moveTo(a[0], a[1]); pp.forEach(function (q) { var b = scr(q[0] + .5, q[1] + .5); ctx.lineTo(b[0], b[1]); }); ctx.stroke(); ctx.setLineDash([]); var e = enemyAt(G.sel, hov[0], hov[1]); if (e.units.length || e.city) { var b2 = scr(hov[0], hov[1]); ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 3; ctx.strokeRect(b2[0] + 2, b2[1] + 2, s - 4, s - 4); } } }
    fx = fx.filter(function (f) { f.t += 1 / 60; var p = scr(f.x + .5, f.y + .5); ctx.strokeStyle = 'rgba(255,220,120,' + (1 - f.t) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], s * (.3 + f.t), 0, 7); ctx.stroke(); return f.t < 1; });
    drawMini();
  }
  var pc = { k: '', p: null };
  function planCache(u, h) { var k = u.id + ':' + u.x + ',' + u.y + '>' + h[0] + ',' + h[1]; if (pc.k !== k) { pc.k = k; pc.p = inb(h[0], h[1]) && G.players[G.me].seen[idx(h[0], h[1])] ? path(u, h[0], h[1]) : null; } return pc.p; }
  function deco(t, p, s) {
    var z = s / 40;
    if (t.t === 'forest') { for (var i = 0; i < 3; i++) { ctx.fillStyle = '#365f28'; ctx.beginPath(); var x = p[0] + s * (.25 + i * .25), y = p[1] + s * (.45 + (i % 2) * .2); ctx.moveTo(x, y - 9 * z); ctx.lineTo(x - 6 * z, y + 4 * z); ctx.lineTo(x + 6 * z, y + 4 * z); ctx.fill(); } }
    else if (t.t === 'hills') { ctx.fillStyle = 'rgba(80,60,30,.35)'; ctx.beginPath(); ctx.ellipse(p[0] + s * .35, p[1] + s * .62, s * .22, s * .14, 0, Math.PI, 0); ctx.ellipse(p[0] + s * .68, p[1] + s * .7, s * .2, s * .12, 0, Math.PI, 0); ctx.fill(); }
    else if (t.t === 'mount') { ctx.fillStyle = '#6c665b'; ctx.beginPath(); ctx.moveTo(p[0] + s * .12, p[1] + s * .85); ctx.lineTo(p[0] + s * .45, p[1] + s * .2); ctx.lineTo(p[0] + s * .78, p[1] + s * .85); ctx.fill(); ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(p[0] + s * .35, p[1] + s * .4); ctx.lineTo(p[0] + s * .45, p[1] + s * .2); ctx.lineTo(p[0] + s * .55, p[1] + s * .4); ctx.fill(); }
    else if (t.t === 'marsh') { ctx.strokeStyle = '#4c6a44'; ctx.lineWidth = 1.5; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(p[0] + s * (.2 + i * .2), p[1] + s * .8); ctx.lineTo(p[0] + s * (.22 + i * .2), p[1] + s * .55); ctx.stroke(); } }
    else if (TT[t.t].sea && s > 18) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p[0] + s * .5 + Math.sin(t0 + t.x) * 2, p[1] + s * .5, s * .15, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (t.t === 'desert' && s > 18) { ctx.fillStyle = 'rgba(180,150,90,.35)'; ctx.fillRect(p[0] + s * .2, p[1] + s * .6, s * .3, 2); }
  }
  function drawMini() {
    var me = G.players[G.me], w = mini.width = 184, h = mini.height = 120, sx = w / W, sy = h / H;
    mctx.fillStyle = '#0d1b24'; mctx.fillRect(0, 0, w, h);
    for (var i = 0; i < T.length; i++) { if (!me.seen[i]) continue; var t = T[i]; mctx.fillStyle = t.own >= 0 ? G.players[t.own].col : TT[t.t].c[0]; mctx.fillRect(t.x * sx, t.y * sy, sx + .5, sy + .5); }
    G.cities.forEach(function (c) { if (me.seen[idx(c.x, c.y)]) { mctx.fillStyle = '#fff'; mctx.fillRect(c.x * sx - 1, c.y * sy - 1, 3, 3); } });
    mctx.strokeStyle = '#fff'; mctx.strokeRect((cam.x - cv.width / 2 / cam.z) / TS * sx, (cam.y - cv.height / 2 / cam.z) / TS * sy, cv.width / cam.z / TS * sx, cv.height / cam.z / TS * sy);
  }

  /* ---------- input ---------- */
  var drag = null;
  function tileOf(e) { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1, x = ((e.clientX - r.left) * d - cv.width / 2) / cam.z + cam.x, y = ((e.clientY - r.top) * d - cv.height / 2) / cam.z + cam.y; return [Math.floor(x / TS), Math.floor(y / TS)]; }
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, btn: e.button }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) { hov = tileOf(e); if (drag) { var d = window.devicePixelRatio || 1, dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 7) drag.moved = true; if (drag.moved) { cam.x = drag.cx - dx * d / cam.z; cam.y = drag.cy - dy * d / cam.z; } } });
  cv.addEventListener('pointerup', function (e) { var d = drag; drag = null; if (!d || d.moved || !G || G.over) return; click(tileOf(e), d.btn === 2); });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); cam.z = Math.max(.35, Math.min(2.2, cam.z * (e.deltaY < 0 ? 1.12 : .89))); }, { passive: false });
  mini.addEventListener('click', function (e) { var r = mini.getBoundingClientRect(); cam.x = (e.clientX - r.left) / r.width * W * TS; cam.y = (e.clientY - r.top) / r.height * H * TS; });
  function click(t, right) {
    var x = t[0], y = t[1]; if (!inb(x, y)) return; var c = cityAt(x, y), us = unitsAt(x, y), mine = us.filter(function (u) { return u.p === G.me; });
    if (G.sel && G.sel.p === G.me && !(G.sel.x === x && G.sel.y === y) && (right || !mine.length || enemyAt(G.sel, x, y).units.length || (c && c.p !== G.me))) { order(G.sel, x, y); return; }
    if (c && c.p === G.me && (!mine.length || (G.sel && G.sel.x === x && G.sel.y === y) || G.selCity === c)) { if (G.selCity === c && mine.length) { G.selCity = null; G.sel = mine[0]; } else { G.selCity = c; G.sel = null; } ui(); return; }
    if (mine.length) { var i = G.sel ? mine.indexOf(G.sel) : -1; G.sel = mine[(i + 1) % mine.length]; G.sel.sleep = false; G.sel.fort = G.sel.fort && false; G.selCity = null; ui(); return; }
    G.sel = null; G.selCity = null; info(t); ui();
  }
  function order(u, x, y) {
    var p = path(u, x, y); if (!p) { msg('No route there.', 1); return; }
    u.goto = [x, y]; u.fort = false; u.sleep = false;
    for (var i = 0; i < p.length && u.mv > 0; i++) { var ok = step(u, p[i][0], p[i][1]); if (u.dead) break; if (u.x !== p[i][0] || u.y !== p[i][1]) { u.goto = null; break; } if (!ok) break; }
    if (u.dead || (u.goto && u.x === u.goto[0] && u.y === u.goto[1])) u.goto = null;
    if (u.mv <= 0 || u.dead) selectNext(); ui();
  }
  function selectNext() { var c = G.units.filter(function (u) { return u.p === G.me && u.mv > 0 && !u.fort && !u.sleep && !u.goto && !G.units.some(function (s) { return s.cargo && s.cargo.indexOf(u.id) >= 0 && false; }); }); G.sel = c[0] || null; if (G.sel) { G.selCity = null; centerSoft(G.sel); } }
  function centerSoft(u) { var p = scr(u.x, u.y); if (p[0] < 80 || p[1] < 80 || p[0] > cv.width - 80 || p[1] > cv.height - 80) centerOn(u); }
  window.addEventListener('keydown', function (e) {
    if (!G || Kit._m || G.over) return; var u = G.sel && G.sel.p === G.me ? G.sel : null, k = e.key;
    if (k === 'Enter') { endTurn(); return; }
    var dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1], '8': [0, -1], '2': [0, 1], '4': [-1, 0], '6': [1, 0], '7': [-1, -1], '9': [1, -1], '1': [-1, 1], '3': [1, 1] };
    if (u && dirs[k]) { e.preventDefault(); order(u, u.x + dirs[k][0], u.y + dirs[k][1]); return; }
    if (u && (k === 'b' || k === 'B') && u.k === 'settler') { foundCity(u); selectNext(); ui(); }
    if (u && (k === 'f' || k === 'F')) { u.fort = true; selectNext(); ui(); }
    if (u && k === ' ') { e.preventDefault(); u.mv = 0; selectNext(); ui(); }
    if (u && (k === 's' || k === 'S')) { u.sleep = true; selectNext(); ui(); }
    if (k === 'c' || k === 'C') { var c = G.sel || G.selCity; if (c) centerOn(c); }
  });

  /* ---------- panels ---------- */
  function ui() {
    if (!G) return; var P = G.players[G.me], inc = 0, sci = 0;
    G.cities.filter(function (c) { return c.p === G.me; }).forEach(function (c) { var y = work(c); inc += y.gold; sci += y.sci; });
    var upkeep = Math.max(0, G.units.filter(function (u) { return u.p === G.me; }).length - (G.cities.filter(function (c) { return c.p === G.me; }).length * 2 + 2));
    $('#top').innerHTML = '<span><i class="oi-dot" style="background:' + P.col + '"></i><b>' + P.n + '</b></span><span>📅 ' + yearTxt() + ' · turn ' + (G.turn + 1) + '</span><span title="Gold (income − unit upkeep)">🪙 <b>' + P.gold + '</b> (' + (inc - upkeep >= 0 ? '+' : '') + (inc - upkeep) + ')</span><span title="Research" class="oi-rs">📜 ' + (P.research ? TECH[P.research].n + ' ' + Math.min(99, Math.floor(P.sci / techCost(P, P.research) * 100)) + '%' : '<b>choose research</b>') + ' (+' + sci + ')</span><span title="Tax rate: share of trade to gold">⚖️ <input type="range" min="0" max="10" value="' + Math.round(P.tax * 10) + '" id="tax"> ' + Math.round(P.tax * 100) + '% tax</span><span title="Score">🏆 ' + P.score + '</span>';
    $('#tax').oninput = function () { P.tax = this.value / 10; ui(); };
    $('.oi-rs').onclick = function () { techModal(); };
    panel();
  }
  function panel() {
    var el = $('#panel'), u = G.sel, c = G.selCity, h = '';
    if (c) {
      var y = work(c), opts = options(c);
      h = '<h3>' + c.n + (c.cap ? ' ★' : '') + '</h3><p class="small">Population <b>' + c.pop + '</b> · food ' + c.food + '/' + growBox(c) + ' (' + (y.surplus >= 0 ? '+' : '') + y.surplus + ')' + (c.unrest ? ' · <b class="bad">unrest! production stops</b>' : y.unhappy ? ' · ' + y.unhappy + ' unhappy' : '') + '</p><p class="small">⚒ ' + y.p + ' production · 🪙 ' + y.gold + ' gold · 📜 ' + y.sci + ' science</p>' +
        '<p class="small">Building: <b>' + (c.build ? nameOf(c.build) : '—') + '</b> ' + (c.build ? c.prod + '/' + costOf(c.build) + ' (' + (y.p ? Math.ceil((costOf(c.build) - c.prod) / y.p) : '∞') + ' turns)' : '') + (c.build && !WON[c.build] ? ' <button class="btn ghost oi-buy" id="buy">Buy · ' + (costOf(c.build) - c.prod) * 2 + '</button>' : '') + '</p>' +
        '<div class="oi-opts">' + opts.map(function (k) { return '<button class="' + (c.build === k ? 'on' : '') + (WON[k] ? ' won' : '') + '" data-b="' + k + '" title="' + esc(UNITS[k] ? (UNITS[k].d2 || 'Attack ' + UNITS[k].a + ', defence ' + UNITS[k].d + ', moves ' + UNITS[k].m) : (BLD[k] || WON[k]).d) + '">' + (UNITS[k] ? UNITS[k].i + ' ' : WON[k] ? '✨ ' : '🏛️ ') + nameOf(k) + ' <small>' + costOf(k) + '</small></button>'; }).join('') + '</div>' +
        '<p class="small mute">Has: ' + (Object.keys(c.b).map(function (k) { return (BLD[k] || WON[k]).n; }).join(', ') || 'nothing yet') + '</p><button class="btn ghost" id="cx">Close</button>';
      el.innerHTML = h; el.hidden = false;
      Kit.$$('[data-b]').forEach(function (b) { b.onclick = function () { c.build = b.dataset.b; ui(); }; });
      if ($('#buy')) $('#buy').onclick = function () { var P = G.players[G.me], cst = (costOf(c.build) - c.prod) * 2; if (P.gold >= cst) { P.gold -= cst; c.prod = costOf(c.build); Kit.sfx.good(); ui(); } else msg('Not enough gold.', 1); };
      $('#cx').onclick = function () { G.selCity = null; ui(); };
      return;
    }
    if (u) {
      var U = UNITS[u.k], t = tile(u.x, u.y);
      h = '<h3>' + U.i + ' ' + U.n + (u.vet ? ' ★' : '') + '</h3><p class="small">' + (u.p === G.me ? '' : G.players[u.p].n + ' · ') + 'Attack ' + U.a + ' · defence ' + U.d + ' · moves ' + u.mv + '/' + U.m + ' · health ' + u.hp + '/10</p><p class="small mute">' + TT[t.t].n + (t.r ? ', ' + t.r : '') + (u.fort ? ' · fortified' : '') + '</p>';
      if (u.p === G.me) h += '<div class="krow">' + (u.k === 'settler' ? '<button class="btn gold" id="u-b">Found city (B)</button>' : '') + '<button class="btn ghost" id="u-f">Fortify (F)</button><button class="btn ghost" id="u-s">Skip (Space)</button><button class="btn ghost" id="u-z">Sleep (S)</button></div><p class="small mute">Tap a square to move; tap an enemy to attack. Arrow keys or numpad move one square.</p>';
      el.innerHTML = h; el.hidden = false;
      if ($('#u-b')) $('#u-b').onclick = function () { foundCity(u); selectNext(); ui(); };
      if ($('#u-f')) $('#u-f').onclick = function () { u.fort = true; selectNext(); ui(); };
      if ($('#u-s')) $('#u-s').onclick = function () { u.mv = 0; selectNext(); ui(); };
      if ($('#u-z')) $('#u-z').onclick = function () { u.sleep = true; selectNext(); ui(); };
      return;
    }
    var idle = G.units.filter(function (q) { return q.p === G.me && q.mv > 0 && !q.fort && !q.sleep && !q.goto; }).length;
    el.innerHTML = '<p class="small">' + (idle ? idle + ' units are waiting for orders.' : 'All units have moved.') + ' Tap a unit or a city.</p>'; el.hidden = false;
  }
  function info(t) { var T2 = tile(t[0], t[1]); if (!G.players[G.me].seen[idx(t[0], t[1])]) return; var y = yields(T2); msg(TT[T2.t].n + (T2.r ? ' with ' + T2.r : '') + ': ' + y.f + ' food, ' + y.p + ' production, ' + y.t + ' trade' + (T2.own >= 0 ? ' · ' + G.players[T2.own].n : '')); }
  function msg(t, bad) { if (!t) return; var m = $('#msg'), d = document.createElement('div'); d.className = 'oi-m' + (bad ? ' bad' : ''); d.textContent = t; m.appendChild(d); while (m.children.length > 5) m.removeChild(m.firstChild); setTimeout(function () { d.classList.add('out'); }, 5000); setTimeout(function () { d.remove(); }, 5800); }
  function techModal(auto) {
    var P = G.players[G.me], a = avail(P);
    Kit.modal('<h2>📜 Technology</h2><p class="small mute">Science banked: ' + P.sci + '. Choose what your scholars study next.</p><div class="oi-techs">' + Object.keys(TECH).map(function (k) { var T3 = TECH[k], have = P.techs[k], can = a.indexOf(k) >= 0, unl = [].concat(Object.keys(UNITS).filter(function (u) { return UNITS[u].tech === k; }).map(function (u) { return UNITS[u].i + ' ' + UNITS[u].n; }), Object.keys(BLD).filter(function (b) { return BLD[b].tech === k; }).map(function (b) { return BLD[b].n; }), Object.keys(WON).filter(function (w) { return WON[w].tech === k; }).map(function (w) { return '✨ ' + WON[w].n; })); return '<button class="oi-tech' + (have ? ' have' : can ? ' can' : '') + (P.research === k ? ' on' : '') + '" data-t="' + k + '"' + (can ? '' : ' disabled') + '><b>' + T3.n + '</b>' + (have ? ' ✓' : ' <small>' + techCost(P, k) + '</small>') + '<span>' + (T3.req.length ? 'Needs ' + T3.req.map(function (r) { return TECH[r].n; }).join(', ') + '. ' : '') + (unl.join(' · ') || '') + '</span></button>'; }).join('') + '</div><div class="krow"><button class="btn" data-close>Close</button></div>');
    Kit.$$('[data-t]').forEach(function (b) { b.onclick = function () { P.research = b.dataset.t; Kit.closeModal(); ui(); }; });
  }
  function civsModal() {
    var me = G.players[G.me];
    Kit.modal('<h2>🤝 Rivals</h2><table class="kt"><tr><th>Civilization</th><th>Cities</th><th>Score</th><th></th></tr>' + G.players.filter(function (P) { return P.i !== G.me; }).map(function (P) { var met = G.cities.some(function (c) { return c.p === P.i && me.seen[idx(c.x, c.y)]; }) || G.units.some(function (u) { return u.p === P.i && me.seen[idx(u.x, u.y)]; }); return '<tr><td><i class="oi-dot" style="background:' + P.col + '"></i>' + (met ? P.n + ' <span class="mute small">(' + CIVS[P.civ].leader + ')</span>' : 'Unknown') + (P.alive ? '' : ' 🏳️') + '</td><td class="num">' + (met ? G.cities.filter(function (c) { return c.p === P.i; }).length : '?') + '</td><td class="num">' + (met ? P.score : '?') + '</td><td>' + (!P.alive || !met ? '' : me.war[P.i] ? '<button class="btn ghost" data-peace="' + P.i + '">Propose peace</button>' : '<button class="btn ghost" data-war="' + P.i + '">Declare war</button>') + '</td></tr>'; }).join('') + '</table><div class="krow"><button class="btn" data-close>Close</button></div>');
    Kit.$$('[data-war]').forEach(function (b) { b.onclick = function () { Kit.closeModal(); declare(G.me, +b.dataset.war); ui(); }; });
    Kit.$$('[data-peace]').forEach(function (b) { b.onclick = function () { var q = +b.dataset.peace; Kit.closeModal(); if (power(q) < power(G.me) * 1.1 || Math.random() < .3) { makePeace(G.me, q); G.players[q].peaceT = G.turn; } else msg(G.players[q].n + ' refuses: “We will see you on the battlefield.”', 1); ui(); }; });
  }
  function menu() {
    Kit.modal('<h2>🏛️ Oikoumene</h2><p class="small">Choose your people:</p><div class="oi-civs">' + CIVS.map(function (c, i) { return '<button class="oi-civ" data-c="' + i + '"><i class="oi-dot" style="background:' + c.col + '"></i><b>' + c.n + '</b><small>' + c.leader + '</small></button>'; }).join('') + '</div><p class="small">Rivals <select id="m-n"><option>2</option><option selected>3</option><option>4</option><option>5</option></select> · Difficulty <select id="m-d"><option value="0">Easy</option><option value="1" selected>Normal</option><option value="2">Hard</option></select></p>' + (Kit.store.get('oi-save', null) ? '<div class="krow"><button class="btn" id="m-load">Continue saved game</button></div>' : ''));
    Kit.$$('[data-c]').forEach(function (b) { b.onclick = function () { var n = +$('#m-n').value, d = +$('#m-d').value; Kit.closeModal(); newGame(+b.dataset.c, n, d); }; });
    if ($('#m-load')) $('#m-load').onclick = function () { Kit.closeModal(); load(); };
  }
  function help() { Kit.modal('<h2>How to play</h2><ul class="small"><li><b>Settlers</b> found cities (B). Cities grow with food and build what you choose: tap a city.</li><li>Tap a unit, then a square to move there (several turns if needed). Tap an enemy to attack; you will be asked before declaring war.</li><li>Trade becomes gold and science; move the tax slider to choose. Research new technologies with 📜.</li><li>Hills, forests, mountains, fortifying (F) and city walls help defenders. Veterans fight 50% better.</li><li>Cities beyond four people grow unhappy; temples, theatres and agoras help. Half unhappy means unrest: no production.</li><li>Explore 🏚️ ruins for gifts. Triremes carry land units across water.</li><li>Win by destroying every rival, by building the ✨ Museion, or with the best score in AD 1.</li></ul><p class="mute small">Keys: arrows or numpad move, Enter ends the turn, F fortify, S sleep, Space skip, C centre. Drag to pan, wheel to zoom; tap the minimap to jump.</p><div class="krow"><button class="btn gold" data-close>To the map</button></div>'); }
  $('#b-tech').onclick = function () { if (G) techModal(); }; $('#b-civs').onclick = function () { if (G) civsModal(); }; $('#b-menu').onclick = menu; $('#b-help').onclick = help;
  $('#endt').onclick = endTurn;

  /* ---------- saving ---------- */
  function autosave() { if (G.over || G.turn % 2) return; try { Kit.store.set('oi-save', { G: Object.assign({}, G, { sel: null, selCity: null, players: G.players.map(function (P) { return Object.assign({}, P, { seen: Array.from(P.seen) }); }), cities: G.cities.map(function (c) { return c; }) }), T: T.map(function (t) { return { t: t.t, r: t.r, own: t.own, ruin: t.ruin, c: t.city ? t.city.id : 0 }; }) }); } catch (e) { } }
  function load() {
    var s = Kit.store.get('oi-save', null); if (!s) return menu();
    G = s.G; G.players.forEach(function (P) { P.seen = Uint8Array.from(P.seen); });
    var byId = {}; G.cities.forEach(function (c) { byId[c.id] = c; });
    T = s.T.map(function (q, i) { return { t: q.t, r: q.r, own: q.own, ruin: q.ruin, x: i % W, y: (i / W) | 0, city: q.c ? byId[q.c] : null }; });
    selectNext(); if (G.sel) centerOn(G.sel); else if (G.cities[0]) centerOn(G.cities.find(function (c) { return c.p === G.me; })); ui(); msg('Welcome back.');
  }
  // sprinkle ruins after a new map
  var _gen = genMap; genMap = function (seed) { _gen(seed); var r = Kit.rng(seed + 5); T.forEach(function (t) { if (land(t) && t.t !== 'mount' && r() < .012) t.ruin = 1; }); };

  function frame(n) { t0 = n / 1000; draw(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  if (Kit.store.get('oi-save', null)) load(); else { menu(); if (!Kit.store.get('oi-seen', 0)) { Kit.store.set('oi-seen', 1); } }
  window.OI = { cam: cam, TS: TS, get G() { return G; }, newGame: newGame, endTurn: endTurn, foundCity: foundCity, order: order, cityTurn: cityTurn, work: work };
})();
