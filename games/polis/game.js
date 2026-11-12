/* Polis: a Greek city builder in the spirit of Caesar III.
   Lay roads and houses; give the houses water, food, temples, goods, theatres and schools and they grow from tents to villas.
   Farms and workshops feed the markets, the bouleuterion collects taxes, the watch fights fires, and the gods want temples. */
(function () {
  'use strict';
  var $ = Kit.$, esc = Kit.esc;
  Kit.bar('Polis', [['b-adv', '📊', 'Advisers'], ['b-goals', '🎯', 'Goals'], ['b-menu', '☰', 'Cities and saves'], ['b-help', '?', 'How to play']]);
  var main = document.createElement('main'); main.className = 'po'; document.body.appendChild(main);
  main.innerHTML = '<div class="po-top" id="top"></div><div class="po-body"><nav class="po-tools" id="tools"></nav><div class="po-stage"><canvas id="cv"></canvas><div class="po-sub" id="sub" hidden></div><div class="po-info card" id="info" hidden></div><div class="po-ov" id="ov"></div><div class="po-msg" id="msg"></div></div></div>';
  var cv = $('#cv'), ctx = cv.getContext('2d');

  /* ---------- buildings ---------- */
  // s size, c cost, w workers, r service radius, svc service, h height, col colours, roof kind, prod/use goods
  var B = {
    road: { n: 'Road', cat: 'road', s: 1, c: 4, d: 'Houses need a road within two tiles. Drag to build.' },
    clear: { n: 'Clear land', cat: 'road', s: 1, c: 2, d: 'Clear trees, rubble or buildings. Drag to clear an area.' },
    house: { n: 'House plot', cat: 'house', s: 1, c: 10, d: 'Settlers move in if a road is close. Drag to mark out many plots.' },
    well: { n: 'Well', cat: 'water', s: 1, c: 15, w: 0, r: 2, svc: 'well', h: 6, d: 'Basic water for nearby houses (2 tiles).' },
    fountain: { n: 'Fountain house', cat: 'water', s: 1, c: 45, w: 2, r: 4, svc: 'fountain', h: 14, d: 'Clean running water within 4 tiles. Houses need it to become houses proper.' },
    farm: { n: 'Wheat farm', cat: 'food', s: 2, c: 40, w: 6, prod: 'wheat', rate: 24, h: 0, d: 'Grows wheat; twice as well on green meadow. Wheat goes to a granary.' },
    fishery: { n: 'Fishing wharf', cat: 'food', s: 2, c: 70, w: 6, prod: 'wheat', rate: 10, coast: true, h: 8, d: 'Fishermen bring in food. Must touch the sea.' },
    granary: { n: 'Granary', cat: 'food', s: 2, c: 90, w: 5, store: 'food', cap: 500, h: 22, d: 'Stores up to 500 food. Without one, the harvest rots.' },
    agora: { n: 'Agora market', cat: 'food', s: 2, c: 60, w: 5, r: 6, svc: 'market', h: 10, d: 'Market traders carry food and goods to houses within 6 tiles.' },
    olives: { n: 'Olive grove', cat: 'ind', s: 2, c: 40, w: 4, prod: 'olives', rate: 8, h: 0, d: 'Olives for the oil press.' },
    vines: { n: 'Vineyard', cat: 'ind', s: 2, c: 40, w: 4, prod: 'grapes', rate: 8, h: 0, d: 'Grapes for the winery.' },
    claypit: { n: 'Clay pit', cat: 'ind', s: 2, c: 30, w: 5, prod: 'clay', rate: 8, ugly: 1, h: 0, d: 'Digs clay for potters.' },
    quarry: { n: 'Marble quarry', cat: 'ind', s: 2, c: 70, w: 8, prod: 'marble', rate: 6, rock: true, ugly: 1, h: 0, d: 'Must touch rocky ground. Marble for monuments, and to sell.' },
    potter: { n: 'Potter', cat: 'ind', s: 2, c: 50, w: 6, make: 'pottery', from: 'clay', rate: 8, ugly: 1, h: 16, d: 'Clay into pottery. Fine houses need pottery.' },
    press: { n: 'Oil press', cat: 'ind', s: 2, c: 50, w: 6, make: 'oil', from: 'olives', rate: 8, ugly: 1, h: 16, d: 'Olives into oil, for lamps, cooking and the gymnasium.' },
    winery: { n: 'Winery', cat: 'ind', s: 2, c: 60, w: 6, make: 'wine', from: 'grapes', rate: 8, ugly: 1, h: 16, d: 'Grapes into wine. Only the best villas demand it.' },
    warehouse: { n: 'Warehouse', cat: 'ind', s: 2, c: 70, w: 5, store: 'goods', cap: 400, h: 20, d: 'Stores 400 of each raw material and good.' },
    temple_zeus: { n: 'Temple of Zeus', cat: 'god', s: 2, c: 120, w: 4, r: 7, svc: 'temple', god: 'zeus', h: 18, d: 'King of the gods. If he is angry, lightning strikes.' },
    temple_athena: { n: 'Temple of Athena', cat: 'god', s: 2, c: 120, w: 4, r: 7, svc: 'temple', god: 'athena', h: 18, d: 'Goddess of wisdom and crafts; she favours workshops.' },
    temple_demeter: { n: 'Temple of Demeter', cat: 'god', s: 2, c: 120, w: 4, r: 7, svc: 'temple', god: 'demeter', h: 18, d: 'Goddess of grain. Angry, she blights the harvest.' },
    temple_poseidon: { n: 'Temple of Poseidon', cat: 'god', s: 2, c: 120, w: 4, r: 7, svc: 'temple', god: 'poseidon', h: 18, d: 'God of the sea; trade and fishing depend on him.' },
    temple_dionysus: { n: 'Temple of Dionysus', cat: 'god', s: 2, c: 120, w: 4, r: 7, svc: 'temple', god: 'dionysus', h: 18, d: 'God of wine and theatre.' },
    altar: { n: 'Roadside shrine', cat: 'god', s: 1, c: 25, w: 0, r: 3, svc: 'temple', god: 'all', h: 8, d: 'A small shrine to all the gods, for a few houses (3 tiles).' },
    theatre: { n: 'Theatre', cat: 'cul', s: 3, c: 200, w: 8, r: 8, svc: 'theatre', h: 10, d: 'Tragedy and comedy. Townhouses want a theatre or school nearby.' },
    school: { n: 'School', cat: 'cul', s: 2, c: 100, w: 5, r: 6, svc: 'school', h: 14, d: 'A grammatistes teaches letters, a kitharistes music.' },
    gym: { n: 'Gymnasium', cat: 'cul', s: 3, c: 220, w: 8, r: 8, svc: 'gym', h: 12, d: 'Exercise, oil and philosophy. Villas need one.' },
    boule: { n: 'Bouleuterion', cat: 'civ', s: 2, c: 150, w: 8, r: 11, svc: 'tax', h: 20, d: 'The council house. Only houses within 11 tiles pay taxes.' },
    watch: { n: 'Night watch', cat: 'civ', s: 1, c: 30, w: 4, r: 7, svc: 'fire', h: 14, d: 'Watchmen put out fires within 7 tiles.' },
    architect: { n: 'Architect’s post', cat: 'civ', s: 1, c: 30, w: 4, r: 7, svc: 'repair', h: 14, d: 'Keeps buildings within 7 tiles from falling down.' },
    port: { n: 'Trading harbour', cat: 'civ', s: 2, c: 140, w: 8, coast: true, h: 10, d: 'Merchant ships buy and sell. Must touch the sea. Set trade in the advisers.' },
    garden: { n: 'Garden', cat: 'beauty', s: 1, c: 12, w: 0, beauty: 3, h: 0, d: 'Makes the neighbourhood more desirable.' },
    statue: { n: 'Statue', cat: 'beauty', s: 1, c: 40, w: 0, beauty: 6, h: 22, d: 'A bronze hero on a plinth. Very desirable.' },
    stoa: { n: 'Stoa', cat: 'beauty', s: 2, c: 120, w: 0, beauty: 8, h: 14, d: 'A long covered colonnade where people meet and talk.' },
    parthenon: { n: 'The Parthenon', cat: 'mon', s: 3, c: 1500, w: 20, mon: 300, god: 'athena', svc: 'temple', r: 12, beauty: 10, h: 34, d: 'Athena’s great temple. Needs 300 marble from your warehouses.' },
    library: { n: 'Great Library', cat: 'mon', s: 3, c: 1200, w: 15, mon: 150, svc: 'library', r: 14, beauty: 6, h: 26, d: 'A library of every book in the world. Needs 150 marble.' },
    pharos: { n: 'Pharos lighthouse', cat: 'mon', s: 2, c: 2000, w: 15, mon: 250, coast: true, beauty: 6, h: 70, d: 'One of the Seven Wonders. Must touch the sea; needs 250 marble. Trade doubles.' }
  };
  var CATS = [['road', '🛤️', 'Roads'], ['house', '🏠', 'Housing'], ['water', '⛲', 'Water'], ['food', '🌾', 'Food'], ['ind', '🏺', 'Industry'], ['god', '🏛️', 'Religion'], ['cul', '🎭', 'Culture'], ['civ', '⚖️', 'Government'], ['beauty', '🌳', 'Beauty'], ['mon', '⭐', 'Monuments']];
  var GODS = { zeus: 'Zeus', athena: 'Athena', demeter: 'Demeter', poseidon: 'Poseidon', dionysus: 'Dionysus' };
  var FEST = { zeus: 'the Olympia', athena: 'the Panathenaia', demeter: 'the Thesmophoria', poseidon: 'the Isthmia', dionysus: 'the City Dionysia' };
  var GOODS = { wheat: 'Food', olives: 'Olives', grapes: 'Grapes', clay: 'Clay', marble: 'Marble', pottery: 'Pottery', oil: 'Olive oil', wine: 'Wine' };
  var PRICE = { wheat: 3, olives: 4, grapes: 4, clay: 3, marble: 9, pottery: 10, oil: 13, wine: 15 };
  var HOUSE = ['Empty plot', 'Tent', 'Hut', 'Cottage', 'House', 'Fine house', 'Townhouse', 'Villa'];
  var CAP = [0, 5, 8, 12, 17, 23, 30, 38];
  var MONTHS = ['Hekatombaion', 'Metageitnion', 'Boedromion', 'Pyanepsion', 'Maimakterion', 'Poseideon', 'Gamelion', 'Anthesterion', 'Elaphebolion', 'Mounichion', 'Thargelion', 'Skirophorion'];

  /* ---------- scenarios ---------- */
  var SCEN = [
    { id: 'massalia', n: 'Massalia', y: -600, money: 3000, seed: 11, sea: 'w', goals: { pop: 300 }, hist: 'Greeks from Phocaea founded Massalia (Marseille) about 600 BC. The legend says the colonists’ leader married the local king’s daughter, who chose him at a feast by handing him a cup of water.', tip: 'Lay a road, mark out house plots beside it, then add a well and an agora fed by a farm and a granary.' },
    { id: 'cyrene', n: 'Cyrene', y: -630, money: 3200, seed: 23, sea: 'n', goals: { pop: 800, culture: 15 }, hist: 'Settlers from the island of Thera founded Cyrene in Libya about 630 BC, after the Delphic oracle told them to. It grew rich on grain, horses and silphium, a plant so prized it appears on the city’s coins.', tip: 'Temples let cottages become houses. Add a school too.' },
    { id: 'syracuse', n: 'Syracuse', y: -485, money: 3500, seed: 37, sea: 'e', goals: { pop: 1500, prosperity: 35, piety: 50 }, hist: 'Gelon made Syracuse the greatest city of the Greek west. After he beat the Carthaginians at Himera in 480 BC he built temples to Demeter and Persephone with the spoils.', tip: 'Fine houses need pottery and a fountain. Keep the gods content with several temples.' },
    { id: 'athens', n: 'Athens of Pericles', y: -447, money: 5000, seed: 53, sea: 's', goals: { pop: 2500, culture: 45, mon: 'parthenon' }, hist: 'Work on the Parthenon began in 447 BC, paid for partly from the treasury of the Delian League. It was designed by Ictinus and Callicrates, with sculpture overseen by Phidias, and dedicated in 438 BC.', tip: 'Quarry marble, store it in warehouses, then raise the Parthenon.' },
    { id: 'alexandria', n: 'Alexandria', y: -300, money: 6000, seed: 71, sea: 'n', goals: { pop: 4000, culture: 55, prosperity: 50, mon: 'library', mon2: 'pharos' }, hist: 'Founded by Alexander in 331 BC, Alexandria became the greatest Greek city of all. The Ptolemies built the Library and the Pharos, the lighthouse that was one of the Seven Wonders of the ancient world.', tip: 'A great city needs villas: gymnasium, school, theatre, wine and a beautiful neighbourhood.' },
    { id: 'free', n: 'Free build', y: -500, money: 8000, seed: 97, sea: 'w', goals: {}, hist: 'Build the city you want.', tip: 'No goals; no hurry.' }
  ];

  /* ---------- the map ---------- */
  var W = 44, H = 44, T, Bs, C, id = 1;
  // terrain: 0 grass, 1 meadow, 2 sea, 3 rock, 4 trees, 5 rubble
  function genMap(sc) {
    var r = Kit.rng(sc.seed), t = new Uint8Array(W * H);
    function noise(x, y, s) { return Math.sin(x * .31 * s + sc.seed) + Math.cos(y * .27 * s + sc.seed * 1.3) + Math.sin((x + y) * .17 * s); }
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var d = sc.sea === 'w' ? x : sc.sea === 'e' ? W - 1 - x : sc.sea === 'n' ? y : H - 1 - y, wob = Math.sin((sc.sea === 'w' || sc.sea === 'e' ? y : x) * .35 + sc.seed) * 1.6 + Math.sin((sc.sea === 'w' || sc.sea === 'e' ? y : x) * .9) * .8;
      var k = 0;
      if (d < 5 + wob) k = 2;
      else { var n = noise(x, y, 1); if (n > 1.6) k = 4; else if (n < -1.5) k = 1; else if (noise(x * 1.7, y * 1.3, 1.1) > 2.05) k = 3; else if (r() < .03) k = 4; }
      t[y * W + x] = k;
    }
    // clusters of rock and a meadow by the water
    for (var i = 0; i < 4; i++) { var cx = 8 + Math.floor(r() * (W - 16)), cy = 8 + Math.floor(r() * (H - 16)); for (var j = 0; j < 14; j++) { var xx = cx + Math.floor(r() * 4 - 1.5), yy = cy + Math.floor(r() * 4 - 1.5); if (t[yy * W + xx] !== 2) t[yy * W + xx] = 3; } }
    return t;
  }

  /* ---------- state ---------- */
  var G;
  function newCity(si) {
    var sc = SCEN[si];
    T = genMap(sc); Bs = []; C = {}; id = 1;
    G = { si: si, money: sc.money, month: 0, year: sc.y, pop: 0, tax: 8, wage: 1, stock: { wheat: 0, olives: 0, grapes: 0, clay: 0, marble: 0, pottery: 0, oil: 0, wine: 0 },
      trade: { wheat: 'keep', olives: 'keep', grapes: 'keep', clay: 'keep', marble: 'keep', pottery: 'keep', oil: 'keep', wine: 'keep' },
      mood: { zeus: 50, athena: 50, demeter: 50, poseidon: 50, dionysus: 50 }, angry: {}, curse: {}, ratings: { culture: 0, prosperity: 0, piety: 50 }, sentiment: 60, hist: [], won: false, fest: 0, events: [] };
    // start camera centred on land
    var sx = sc.sea === 'w' ? W * .6 : sc.sea === 'e' ? W * .4 : W / 2, sy = sc.sea === 'n' ? H * .6 : sc.sea === 's' ? H * .4 : H / 2;
    cam.x = (sx - sy) * TW / 2; cam.y = (sx + sy) * TH / 2; cam.z = 1;
    stats(); covers(); ui(); intro();
  }
  function at(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? y * W + x : -1; }
  var grid = []; // building index per tile
  function rebuildGrid() { grid = new Array(W * H); Bs.forEach(function (b) { for (var dy = 0; dy < b.s; dy++) for (var dx = 0; dx < b.s; dx++) grid[(b.y + dy) * W + b.x + dx] = b; }); }

  /* ---------- placement ---------- */
  function canPlace(k, x, y) {
    var D = B[k], s = D.s, touchSea = false, rock = false;
    for (var dy = 0; dy < s; dy++) for (var dx = 0; dx < s; dx++) { var i = at(x + dx, y + dy); if (i < 0) return false; if (grid[i]) return false; if (T[i] === 2 || T[i] === 5) return false; if (T[i] === 3) rock = true; }
    if (k !== 'quarry' && rock) return false;
    for (dy = -1; dy <= s; dy++) for (dx = -1; dx <= s; dx++) { var j = at(x + dx, y + dy); if (j >= 0 && T[j] === 2) touchSea = true; if (j >= 0 && T[j] === 3) rock = true; }
    if (D.coast && !touchSea) return false;
    if (D.rock && !rock) return false;
    if (D.mon && Bs.some(function (b) { return b.k === k; })) return false;
    return true;
  }
  function treeCost(x, y, s) { var n = 0; for (var dy = 0; dy < s; dy++) for (var dx = 0; dx < s; dx++) { var i = at(x + dx, y + dy); if (i >= 0 && T[i] === 4) n++; } return n * 3; }
  function place(k, x, y, quiet) {
    var D = B[k]; if (!canPlace(k, x, y)) return false;
    var cost = D.c + treeCost(x, y, D.s); if (G.money < cost && G.money - cost < -500) { if (!quiet) msg('Not enough drachmae.', 1); return false; }
    G.money -= cost;
    for (var dy = 0; dy < D.s; dy++) for (var dx = 0; dx < D.s; dx++) { var i = at(x + dx, y + dy); if (T[i] === 4) T[i] = 0; }
    var b = { id: id++, k: k, x: x, y: y, s: D.s, lv: 0, pop: 0, fire: 0, wear: 0, built: D.mon ? 0 : 1, need: k === 'house' ? 'a month for settlers to arrive' : '' };
    Bs.push(b); rebuildGrid(); dirty = true; return b;
  }
  function demolish(x, y) {
    var i = at(x, y); if (i < 0) return;
    var b = grid[i]; if (b) { Bs.splice(Bs.indexOf(b), 1); G.money -= 2; rebuildGrid(); dirty = true; return; }
    if (T[i] === 4 || T[i] === 5) { T[i] = 0; G.money -= 2; dirty = true; }
  }

  /* ---------- coverage ---------- */
  var cov = {}, desir = new Int8Array(W * H), roadNear = new Uint8Array(W * H), dirty = true;
  function covers() {
    ['well', 'fountain', 'market', 'temple', 'theatre', 'school', 'gym', 'tax', 'fire', 'repair', 'library'].forEach(function (k) { cov[k] = new Uint8Array(W * H); });
    G.godCov = {}; Object.keys(GODS).forEach(function (g) { G.godCov[g] = new Uint8Array(W * H); });
    desir = new Int8Array(W * H); roadNear = new Uint8Array(W * H);
    Bs.forEach(function (b) {
      var D = B[b.k];
      if (b.k === 'road') { for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var j = at(b.x + dx, b.y + dy); if (j >= 0) roadNear[j] = 1; } return; }
      if (D.svc && b.built >= 1 && (D.w ? b.staff > 0 || b.staff == null : true)) area(b, D.r, function (j) { cov[D.svc][j] = 1; if (D.god && D.god !== 'all') G.godCov[D.god][j] = 1; });
      var bv = D.beauty || (D.svc === 'temple' ? 2 : 0) - (D.ugly ? 4 : 0) - (b.k === 'farm' || b.k === 'olives' || b.k === 'vines' ? 1 : 0);
      if (bv) area(b, bv > 0 ? 3 : 2, function (j) { desir[j] = Math.max(-20, Math.min(40, desir[j] + bv)); });
      if (b.k === 'house' && b.lv >= 6) area(b, 1, function (j) { desir[j] += 1; });
    });
    dirty = false;
  }
  function area(b, r, f) { for (var y = b.y - r; y < b.y + b.s + r; y++) for (var x = b.x - r; x < b.x + b.s + r; x++) { var j = at(x, y); if (j >= 0) f(j); } }

  /* ---------- the monthly turn ---------- */
  function stats() {
    var pop = 0, jobs = 0;
    Bs.forEach(function (b) { if (b.k === 'house') pop += b.pop; else if (B[b.k].w && b.built >= 1) jobs += B[b.k].w; else if (B[b.k].mon && b.built < 1) jobs += B[b.k].w; });
    G.pop = pop; G.workers = Math.round(pop * .42); G.jobs = jobs; G.emp = jobs ? Math.min(1, G.workers / jobs) : 1; G.unemp = G.workers ? Math.max(0, (G.workers - jobs) / G.workers) : 0;
    G.capFood = 0; G.capGoods = 0; Bs.forEach(function (b) { if (b.k === 'granary') G.capFood += B.granary.cap; if (b.k === 'warehouse') G.capGoods += B.warehouse.cap; });
  }
  function month() {
    if (dirty) covers();
    stats();
    var e = G.emp, S = G.stock, log = [];
    // staff: buildings get workers in order of importance (food and water first)
    var order = ['fountain', 'granary', 'agora', 'farm', 'fishery', 'watch', 'architect', 'boule', 'warehouse'];
    var left = G.workers;
    Bs.slice().sort(function (a, b) { var ia = order.indexOf(a.k), ib = order.indexOf(b.k); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }).forEach(function (b) { var w = B[b.k].w || 0; if (!w || b.k === 'house') return; var got = Math.min(w, left); left -= got; b.staff = got / w; });
    // production
    var cursed = function (g) { return G.curse[g] > 0; }, bless = function (g) { return G.mood[g] > 85; };
    Bs.forEach(function (b) {
      var D = B[b.k], st = b.staff || 0; if (!st || b.built < 1) return;
      if (D.prod) {
        var amt = D.rate * st;
        if (b.k === 'farm') { var m = 0; for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) if (T[at(b.x + dx, b.y + dy)] === 1) m++; amt *= .6 + m * .25; if (cursed('demeter')) amt = 0; if (bless('demeter')) amt *= 1.4; }
        if (b.k === 'fishery' && cursed('poseidon')) amt = 0;
        S[D.prod] += amt; b.out = amt;
      }
      if (D.make) { var mk = Math.min(S[D.from], D.rate * st * (bless('athena') ? 1.3 : 1)); if (G.capGoods <= 0) mk = 0; S[D.from] -= mk; S[D.make] += mk; b.out = mk; }
    });
    // storage limits: food in granaries, everything else in warehouses
    var lostFood = Math.max(0, S.wheat - G.capFood); S.wheat = Math.min(S.wheat, G.capFood);
    ['olives', 'grapes', 'clay', 'marble', 'pottery', 'oil', 'wine'].forEach(function (k) { S[k] = Math.min(S[k], G.capGoods); });
    if (lostFood > 20 && !G.capFood) log.push('The harvest rots in the fields: build a granary.');
    // monuments take marble and time
    Bs.forEach(function (b) { var D = B[b.k]; if (!D.mon || b.built >= 1) return; var need = D.mon * (1 - b.built), take = Math.min(S.marble, D.mon / 8, need) * (b.staff || 0); S.marble -= take; b.built = Math.min(1, b.built + take / D.mon); if (b.built >= 1) { log.push(D.n + ' is complete!'); Kit.sfx.win(); dirty = true; } });
    // houses: consume, then grow or decline
    if (dirty) covers();
    var foodNeed = 0, taxed = 0;
    Bs.forEach(function (b) {
      if (b.k !== 'house') return; var i = at(b.x, b.y);
      var road = roadNear[i], water = cov.well[i] || cov.fountain[i], clean = cov.fountain[i], mk = cov.market[i];
      var food = false; if (mk && b.pop) { var want = Math.ceil(b.pop / 12); if (S.wheat >= want) { S.wheat -= want; food = true; } else foodNeed++; } else if (mk) food = S.wheat > 0;
      var god = cov.temple[i], pot = false, oil = false, wine = false;
      if (b.lv >= 4 && mk) { if (S.pottery >= 1) { S.pottery -= b.lv >= 6 ? 2 : 1; pot = true; } }
      if (b.lv >= 5 && mk) { if (S.oil >= 1) { S.oil -= 1; oil = true; } }
      if (b.lv >= 6 && mk) { if (S.wine >= 1) { S.wine -= 1; wine = true; } }
      var cul = cov.theatre[i] || cov.school[i], all = cov.theatre[i] && cov.school[i] && cov.gym[i], dz = desir[i];
      // what level could this house hold?
      var L = 0, need = '';
      if (road) L = 1; else need = 'a road within 2 tiles';
      if (L === 1) { if (water) L = 2; else need = 'water from a well or fountain'; }
      if (L === 2) { if (food) L = 3; else need = mk ? 'food in the granaries' : 'an agora market nearby'; }
      if (L === 3) { if (god) L = 4; else need = 'a temple or shrine nearby'; }
      if (L === 4) { if (clean && pot) L = 5; else need = !clean ? 'a fountain house (clean water)' : 'pottery from the market'; }
      if (L === 5) { if (cul && oil && dz >= 2) L = 6; else need = !cul ? 'a theatre or school nearby' : !oil ? 'olive oil from the market' : 'a nicer neighbourhood (gardens, statues)'; }
      if (L === 6) { if (all && wine && dz >= 6) L = 7; else need = !all ? 'a gymnasium, school and theatre all nearby' : !wine ? 'wine from the market' : 'a beautiful neighbourhood (statues, stoas)'; }
      b.need = need;
      if (L > b.lv) b.lv++; else if (L < b.lv) { b.down = (b.down || 0) + 1; if (b.down >= 2) { b.lv--; b.down = 0; } }
      if (L >= b.lv) b.down = 0;
      var cap = CAP[b.lv];
      if (b.pop < cap && G.sentiment >= 40) b.pop = Math.min(cap, b.pop + Math.max(1, Math.round(cap * (G.sentiment > 65 ? .4 : .25))));
      else if (b.pop > cap) b.pop = cap;
      else if (G.sentiment < 30 && b.pop > 0) b.pop = Math.max(0, b.pop - Math.ceil(b.pop * .12));
      if (cov.tax[i]) taxed += b.pop;
    });
    // money
    var taxes = Math.round(taxed * G.tax / 100 * 1.25), wages = Math.round(Math.min(G.workers, G.jobs) * .14 * G.wage);
    G.money += taxes - wages; G.lastTax = taxes; G.lastWages = wages;
    // trade
    var ports = Bs.filter(function (b) { return b.k === 'port' && (b.staff || 0) > .3; }).length, pharos = Bs.some(function (b) { return b.k === 'pharos' && b.built >= 1; }), sold = 0, bought = 0;
    if (ports && !cursed('poseidon')) {
      var capT = 60 * ports * (pharos ? 2 : 1) * (bless('poseidon') ? 1.5 : 1);
      Object.keys(G.trade).forEach(function (k) {
        var mode = G.trade[k];
        if (mode === 'sell' && S[k] > 20) { var q = Math.min(S[k] - 20, capT); S[k] -= q; sold += Math.round(q * PRICE[k]); }
        if (mode === 'buy') { var cap = k === 'wheat' ? G.capFood : G.capGoods, q2 = Math.min(Math.max(0, Math.min(cap, 150) - S[k]), capT); var cost = Math.round(q2 * PRICE[k] * 1.4); if (cost > 0 && G.money > cost) { S[k] += q2; bought += cost; } }
      });
      G.money += sold - bought;
    }
    G.lastTrade = sold - bought;
    // the gods
    var pop = Math.max(1, G.pop);
    Object.keys(GODS).forEach(function (g) {
      var n = Bs.filter(function (b) { return B[b.k].god === g && b.built >= 1; }).length + Bs.filter(function (b) { return b.k === 'altar'; }).length * .2;
      var target = 22 + 78 * Math.min(1, n * 650 / (pop + 250)); if (G.pop < 150) target = Math.max(target, 50);
      G.mood[g] += (target - G.mood[g]) * .12 - .3;
      G.mood[g] = Math.max(0, Math.min(100, G.mood[g]));
      if (G.curse[g] > 0) G.curse[g]--;
      if (G.mood[g] < 20) { G.angry[g] = (G.angry[g] || 0) + 1; if (G.angry[g] >= 4) { wrath(g, log); G.angry[g] = 0; G.mood[g] += 18; } } else G.angry[g] = 0;
    });
    // fire and collapse
    Bs.slice().forEach(function (b) {
      if (b.k === 'road' || B[b.k].s === 0 || b.k === 'garden') return; var i = at(b.x, b.y), D = B[b.k];
      if (cov.fire[i]) b.fire = 0; else b.fire += Math.random() * (D.make || b.k === 'house' && b.lv >= 2 ? 3.2 : 1.6);
      if (D.s >= 2 && b.k !== 'farm' && b.k !== 'olives' && b.k !== 'vines' && !D.mon) { if (cov.repair[i]) b.wear = 0; else b.wear += Math.random() * 2.2; }
      if (b.fire >= 100 && (b.k !== 'house' || b.pop > 0)) { ruin(b); log.push('🔥 Fire! ' + (b.k === 'house' ? 'A ' + HOUSE[b.lv].toLowerCase() : 'The ' + D.n.toLowerCase()) + ' burns down. Build a night watch nearby.'); }
      else if (b.wear >= 100) { ruin(b); log.push('🧱 The ' + D.n.toLowerCase() + ' collapses. An architect’s post would have kept it standing.'); }
    });
    // sentiment and immigration
    var short = foodNeed > 3;
    G.sentiment += ((70 - Math.max(0, G.tax - 7) * 5 - Math.max(0, G.unemp - .15) * 25 - (short ? 10 : 0) + (G.fest > 0 ? 12 : 0) + (G.money < 0 ? -15 : 0)) - G.sentiment) * .25;
    if (G.fest > 0) G.fest--;
    // calendar
    G.month++; if (G.month >= 12) { G.month = 0; G.year++; if (G.year === 0) G.year = 1; }
    stats(); ratings(); goals();
    if (G.money < -500) log.push('The treasury is deep in debt. Raise taxes or sell goods.');
    log.forEach(function (t) { msg(t); });
    ui(); save();
  }
  function ruin(b) { Bs.splice(Bs.indexOf(b), 1); for (var dy = 0; dy < b.s; dy++) for (var dx = 0; dx < b.s; dx++) T[at(b.x + dx, b.y + dy)] = 5; rebuildGrid(); dirty = true; Kit.sfx.boom(); fx.push({ x: b.x + b.s / 2, y: b.y + b.s / 2, t: 0, k: 'smoke' }); }
  function wrath(g, log) {
    Kit.sfx.bad();
    if (g === 'zeus') { var c = Bs.filter(function (b) { return b.k !== 'road' && !B[b.k].mon; }); if (c.length) { var b = c[Math.floor(Math.random() * c.length)]; ruin(b); log.push('⚡ Zeus is angry: lightning destroys the ' + (b.k === 'house' ? 'house' : B[b.k].n.toLowerCase()) + '. Build him temples.'); } }
    if (g === 'demeter') { G.curse.demeter = 4; log.push('🌾 Demeter is angry: the farms will yield nothing for 4 months.'); }
    if (g === 'poseidon') { G.curse.poseidon = 4; log.push('🌊 Poseidon is angry: no ships, no fish for 4 months.'); }
    if (g === 'athena') { G.stock.pottery = 0; G.stock.oil = Math.floor(G.stock.oil / 2); log.push('🦉 Athena is angry: the potters’ kilns crack and pottery is lost.'); }
    if (g === 'dionysus') { G.stock.wine = 0; G.sentiment -= 15; log.push('🍇 Dionysus is angry: the wine turns to vinegar and the people are restless.'); }
  }
  function ratings() {
    var hs = Bs.filter(function (b) { return b.k === 'house' && b.pop > 0; }), tp = 0, cu = 0, lv = 0;
    hs.forEach(function (b) { var i = at(b.x, b.y); tp += b.pop; cu += b.pop * (cov.temple[i] * .2 + cov.theatre[i] * .25 + cov.school[i] * .2 + cov.gym[i] * .2 + cov.library[i] * .15); lv += b.pop * b.lv; });
    var mons = Bs.filter(function (b) { return B[b.k].mon && b.built >= 1; }).length;
    G.ratings.culture = tp ? Math.min(100, Math.round(cu / tp * 100 + mons * 5)) : 0;
    G.ratings.prosperity = tp ? Math.min(100, Math.round(lv / tp / 7 * 80 + (G.money > 0 ? 10 : 0) + (G.unemp < .1 ? 10 : 0) - (G.money < 0 ? 10 : 0))) : 0;
    G.ratings.piety = Math.round(Object.keys(GODS).reduce(function (a, g) { return a + G.mood[g]; }, 0) / 5);
  }
  function goalList() {
    var g = SCEN[G.si].goals, out = [];
    if (g.pop) out.push(['Population ' + g.pop, G.pop >= g.pop, G.pop + ' / ' + g.pop]);
    ['culture', 'prosperity', 'piety'].forEach(function (k) { if (g[k]) out.push([k[0].toUpperCase() + k.slice(1) + ' ' + g[k], G.ratings[k] >= g[k], G.ratings[k] + ' / ' + g[k]]); });
    [g.mon, g.mon2].forEach(function (m) { if (m) { var b = Bs.find(function (x) { return x.k === m; }); out.push([B[m].n, !!(b && b.built >= 1), b ? Math.round(b.built * 100) + '%' : 'not begun']); } });
    return out;
  }
  function goals() {
    if (G.won || SCEN[G.si].id === 'free') return; var gl = goalList();
    if (gl.length && gl.every(function (x) { return x[1]; })) {
      G.won = true; Kit.sfx.win(); var done = Kit.store.get('po-done', {}); done[SCEN[G.si].id] = 1; Kit.store.set('po-done', done);
      Kit.modal('<h2>🏛️ ' + SCEN[G.si].n + ' flourishes</h2><p>You have met every goal in ' + yearTxt() + '.</p><p class="mute">' + SCEN[G.si].hist + '</p><div class="krow">' + (G.si < SCEN.length - 2 ? '<button class="btn gold" id="w-next">Next city: ' + SCEN[G.si + 1].n + '</button>' : '') + '<button class="btn ghost" data-close>Keep building</button></div>', { sticky: true });
      if ($('#w-next')) $('#w-next').onclick = function () { Kit.closeModal(); newCity(G.si + 1); };
    }
  }
  function yearTxt() { return G.year < 0 ? -G.year + ' BC' : 'AD ' + G.year; }

  /* ---------- drawing ---------- */
  var TW = 64, TH = 32, cam = { x: 0, y: 0, z: 1 }, fx = [], walkers = [], t0 = 0, hover = null, tool = null, drag = null, overlay = '';
  function iso(x, y) { return [(x - y) * TW / 2, (x + y) * TH / 2]; }
  function toScr(x, y) { var p = iso(x, y); return [(p[0] - cam.x) * cam.z + cv.width / 2, (p[1] - cam.y) * cam.z + cv.height / 2]; }
  function toTile(sx, sy) { var wx = (sx - cv.width / 2) / cam.z + cam.x, wy = (sy - cv.height / 2) / cam.z + cam.y; var x = (wx / (TW / 2) + wy / (TH / 2)) / 2, y = (wy / (TH / 2) - wx / (TW / 2)) / 2; return [Math.floor(x), Math.floor(y)]; }
  function diamond(x, y, w, h) { var a = toScr(x, y), b = toScr(x + w, y), c = toScr(x + w, y + h), d = toScr(x, y + h); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); }
  function hsh(x, y) { var h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  var TCOL = [['#9db560', '#86a24f'], ['#74a248', '#5f913d'], ['#3b7aa8', '#356f9c'], ['#a8a08e', '#958c7a'], ['#8aa653', '#76944a'], ['#8c8170', '#827766']];
  var mixC = {}; function mix(a, b, t) { t = Math.max(0, Math.min(1, t)); var key = a + b + Math.round(t * 16); if (mixC[key]) return mixC[key]; var A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16), r = Math.round((A >> 16) * (1 - t) + (Bc >> 16) * t), g = Math.round((A >> 8 & 255) * (1 - t) + (Bc >> 8 & 255) * t), bl = Math.round((A & 255) * (1 - t) + (Bc & 255) * t); return mixC[key] = 'rgb(' + r + ',' + g + ',' + bl + ')'; }
  function drawTile(x, y) {
    var i = y * W + x, k = T[i], v = hsh(x, y), z = cam.z;
    var sm = (Math.sin(x * .41) + Math.cos(y * .37) + Math.sin((x + y) * .23)) / 6 + .5 + (v - .5) * .12, col = mix(TCOL[k][0], TCOL[k][1], sm);
    if (k === 2) { var w = Math.sin(t0 * 1.5 + x * .7 + y * .5) * .5 + .5; col = 'rgb(' + Math.round(52 + w * 10) + ',' + Math.round(116 + w * 10) + ',' + Math.round(162 + w * 8) + ')'; }
    diamond(x, y, 1, 1); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    // shoreline foam
    if (k === 2 && z > .5) { [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(function (d) { var j = at(x + d[0], y + d[1]); if (j >= 0 && T[j] !== 2) { var p = toScr(x + .5 + d[0] * .45, y + .5 + d[1] * .45); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(p[0], p[1], 3 * z, 0, 7); ctx.fill(); } }); }
    if (overlay && k !== 2) { var c = cov[overlay]; if (c && c[i]) { diamond(x, y, 1, 1); ctx.fillStyle = 'rgba(255,215,90,.35)'; ctx.fill(); } }
    if (overlay === 'desir' && k !== 2) { var dz = desir[i]; if (dz) { diamond(x, y, 1, 1); ctx.fillStyle = dz > 0 ? 'rgba(40,180,80,' + Math.min(.6, dz * .06) + ')' : 'rgba(200,50,40,' + Math.min(.6, -dz * .1) + ')'; ctx.fill(); } }
  }
  function drawDeco(x, y) {
    var i = y * W + x, k = T[i], z = cam.z, p = toScr(x + .5, y + .5);
    if (k === 4) { // trees
      for (var n = 0; n < 3; n++) { var ox = (hsh(x + n, y) - .5) * 26 * z, oy = (hsh(x, y + n) - .5) * 12 * z, r = (6 + hsh(x * n, y) * 4) * z; ctx.fillStyle = '#5b4126'; ctx.fillRect(p[0] + ox - 1.2 * z, p[1] + oy - 4 * z, 2.4 * z, 6 * z); ctx.fillStyle = n % 2 ? '#3f6e2e' : '#4b7d33'; ctx.beginPath(); ctx.arc(p[0] + ox, p[1] + oy - 8 * z, r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(p[0] + ox - r * .3, p[1] + oy - 8 * z - r * .3, r * .45, 0, 7); ctx.fill(); }
    } else if (k === 3) { for (n = 0; n < 3; n++) { ox = (hsh(x + n, y * 2) - .5) * 30 * z; oy = (hsh(x * 2, y + n) - .5) * 12 * z; ctx.fillStyle = n ? '#c3bbab' : '#b2a995'; ctx.beginPath(); ctx.ellipse(p[0] + ox, p[1] + oy, 7 * z, 4.5 * z, 0, 0, 7); ctx.fill(); } }
    else if (k === 5) { for (n = 0; n < 5; n++) { ox = (hsh(x + n, y) - .5) * 30 * z; oy = (hsh(x, y + n) - .5) * 12 * z; ctx.fillStyle = n % 2 ? '#6d5f4c' : '#8f7e64'; ctx.fillRect(p[0] + ox, p[1] + oy, 5 * z, 3 * z); } }
    else if (k === 1 && z > .6 && hsh(x, y) > .6) { ctx.fillStyle = hsh(y, x) > .5 ? '#f2e46a' : '#f5f0e6'; ctx.fillRect(p[0] + (hsh(x, y * 3) - .5) * 20 * z, p[1] + (hsh(x * 3, y) - .5) * 8 * z, 2 * z, 2 * z); }
  }
  // a box on a footprint: x,y,s tiles, inset, height in px, colours
  function box(x, y, s, ins, h, top, left, right) {
    var z = cam.z, a = toScr(x + ins, y + ins), b = toScr(x + s - ins, y + ins), c = toScr(x + s - ins, y + s - ins), d = toScr(x + ins, y + s - ins), hh = h * z;
    ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] - hh); ctx.lineTo(d[0], d[1] - hh); ctx.closePath(); ctx.fillStyle = left; ctx.fill();
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0], b[1] - hh); ctx.lineTo(c[0], c[1] - hh); ctx.closePath(); ctx.fillStyle = right; ctx.fill();
    ctx.beginPath(); ctx.moveTo(a[0], a[1] - hh); ctx.lineTo(b[0], b[1] - hh); ctx.lineTo(c[0], c[1] - hh); ctx.lineTo(d[0], d[1] - hh); ctx.closePath(); ctx.fillStyle = top; ctx.fill();
    return { a: a, b: b, c: c, d: d, hh: hh };
  }
  function roof(q, rh, c1, c2) { // hipped roof over a box result
    var z = cam.z, ax = (q.a[0] + q.c[0]) / 2, ay = (q.a[1] + q.c[1]) / 2 - q.hh - rh * z, P = function (p) { return [p[0], p[1] - q.hh]; };
    var A = P(q.a), Bp = P(q.b), Cc = P(q.c), Dd = P(q.d);
    [[A, Bp, c2], [Dd, A, c1], [Cc, Dd, c1], [Bp, Cc, c2]].forEach(function (f) { ctx.beginPath(); ctx.moveTo(f[0][0], f[0][1]); ctx.lineTo(f[1][0], f[1][1]); ctx.lineTo(ax, ay); ctx.closePath(); ctx.fillStyle = f[2]; ctx.fill(); });
  }
  function columns(q, n, h) { var z = cam.z; ctx.strokeStyle = 'rgba(80,70,55,.55)'; ctx.lineWidth = Math.max(1, 1.2 * z); for (var i = 1; i < n; i++) { var t = i / n; [[q.d, q.c], [q.c, q.b]].forEach(function (e) { var x = e[0][0] + (e[1][0] - e[0][0]) * t, y = e[0][1] + (e[1][1] - e[0][1]) * t; ctx.beginPath(); ctx.moveTo(x, y - 2 * z); ctx.lineTo(x, y - h * z + 2 * z); ctx.stroke(); }); } }
  var LV = [['#c9b48a', '#a8916a', '#bba37a'], ['#e9dcc0', '#c8b593', '#d9c8a6'], ['#ead9b8', '#c9b28c', '#dbc39c'], ['#efe2c6', '#cdb894', '#dfcaa3'], ['#f3e9d2', '#d3c19f', '#e6d5b2'], ['#f6efe0', '#d8c8a8', '#ebdcbd'], ['#f8f3e8', '#dccdb0', '#eee2c8'], ['#fbf8f0', '#ded3bb', '#f1e8d3']];
  function drawB(b) {
    var D = B[b.k], z = cam.z, x = b.x, y = b.y, s = b.s, q, p = toScr(x + s / 2, y + s / 2);
    if (b.k === 'road') { diamond(x, y, 1, 1); ctx.fillStyle = '#cfb78f'; ctx.fill(); if (z > .5) { ctx.fillStyle = 'rgba(120,95,60,.25)'; for (var n = 0; n < 3; n++) { var pp = toScr(x + .25 + hsh(x + n, y) * .5, y + .25 + hsh(x, y + n) * .5); ctx.fillRect(pp[0], pp[1], 4 * z, 2 * z); } } return; }
    if (b.k === 'house') {
      if (b.lv === 0) { diamond(x + .15, y + .15, .7, .7); ctx.strokeStyle = '#7b6a48'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); return; }
      var c = LV[b.lv];
      if (b.lv === 1) { var a = toScr(x + .2, y + .8), bb = toScr(x + .8, y + .8), cc = toScr(x + .8, y + .2), top = [p[0], p[1] - 16 * z]; ctx.fillStyle = '#d6c7a2'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(bb[0], bb[1]); ctx.lineTo(top[0], top[1]); ctx.fill(); ctx.fillStyle = '#bba982'; ctx.beginPath(); ctx.moveTo(bb[0], bb[1]); ctx.lineTo(cc[0], cc[1]); ctx.lineTo(top[0], top[1]); ctx.fill(); return; }
      var h = [0, 0, 9, 11, 13, 15, 17, 20][b.lv], ins = b.lv >= 6 ? .06 : .14;
      q = box(x, y, 1, ins, h, c[0], c[1], c[2]);
      roof(q, 6 + b.lv * .6, b.lv >= 4 ? '#b5523a' : '#9a7a52', b.lv >= 4 ? '#cf6b4c' : '#b08d5f');
      if (b.lv >= 6 && z > .6) { ctx.fillStyle = '#3f7d3a'; ctx.beginPath(); ctx.arc(q.c[0] - 2 * z, q.c[1] - 2 * z, 3.5 * z, 0, 7); ctx.fill(); }
      if (b.fire > 70 && !cov.fire[at(x, y)]) warn(p, '🔥');
      return;
    }
    if (b.built < 1) { // scaffolding
      q = box(x, y, s, .08, 4, '#d8cdb5', '#b7a98c', '#c8bb9e');
      var hh = D.h * b.built; if (hh > 2) box(x, y, s, .12, 4 + hh, '#efe8d8', '#cfc4ad', '#e0d6c0');
      ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 1.5 * z; var a2 = toScr(x + .1, y + s - .1), b2 = toScr(x + s - .1, y + s - .1), c2 = toScr(x + s - .1, y + .1); [[a2, b2], [b2, c2]].forEach(function (e) { for (var i = 0; i <= 4; i++) { var t = i / 4, X = e[0][0] + (e[1][0] - e[0][0]) * t, Y = e[0][1] + (e[1][1] - e[0][1]) * t; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - D.h * z); ctx.stroke(); } });
      label(p, Math.round(b.built * 100) + '%', D.h); return;
    }
    switch (b.k) {
      case 'farm': case 'olives': case 'vines': case 'claypit': case 'quarry':
        diamond(x + .05, y + .05, s - .1, s - .1); ctx.fillStyle = { farm: G.curse && G.curse.demeter ? '#9a8a5a' : '#d8bf5a', olives: '#7c8e4a', vines: '#7a6a3a', claypit: '#a5683f', quarry: '#d6d0c2' }[b.k]; ctx.fill();
        ctx.strokeStyle = { farm: '#b99a34', olives: '#5d7036', vines: '#4f3f22', claypit: '#7d4a2a', quarry: '#b0a894' }[b.k]; ctx.lineWidth = 1.2 * z;
        for (var r = 1; r < 6; r++) { var u = r / 6, l1 = toScr(x + .1, y + .1 + u * (s - .2)), l2 = toScr(x + s - .1, y + .1 + u * (s - .2)); ctx.beginPath(); ctx.moveTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]); ctx.stroke(); }
        if (b.k === 'olives' || b.k === 'vines') for (r = 0; r < 6; r++) { var tp = toScr(x + .3 + (r % 3) * .7, y + .5 + Math.floor(r / 3) * .9); ctx.fillStyle = b.k === 'olives' ? '#6d8a4a' : '#5c3a5a'; ctx.beginPath(); ctx.arc(tp[0], tp[1] - 5 * z, (b.k === 'olives' ? 6 : 3.5) * z, 0, 7); ctx.fill(); }
        if (b.k === 'farm' || b.k === 'quarry' || b.k === 'claypit') { q = box(x + s - 1, y, 1, .3, 8, '#e3d2ae', '#bba278', '#cdb68c'); roof(q, 4, '#9a7a52', '#b08d5f'); }
        return;
      case 'well': diamond(x + .3, y + .3, .4, .4); ctx.fillStyle = '#8e8a80'; ctx.fill(); q = box(x, y, 1, .3, 5, '#2b5b85', '#9d978a', '#b4ad9e'); return;
      case 'fountain': q = box(x, y, 1, .15, 6, '#5d97c4', '#c9c1ae', '#ddd5c2'); box(x, y, 1, .38, 14, '#f0eadb', '#cdc3ad', '#e0d8c4'); ctx.fillStyle = 'rgba(160,210,255,.8)'; ctx.beginPath(); ctx.arc(p[0], p[1] - 16 * z + Math.sin(t0 * 6) * z, 2 * z, 0, 7); ctx.fill(); return;
      case 'garden': diamond(x + .05, y + .05, .9, .9); ctx.fillStyle = '#5f9a45'; ctx.fill(); for (r = 0; r < 4; r++) { tp = toScr(x + .25 + (r % 2) * .5, y + .25 + Math.floor(r / 2) * .5); ctx.fillStyle = ['#d65a7a', '#f2d24b', '#3e7a33', '#f5f0f0'][r]; ctx.beginPath(); ctx.arc(tp[0], tp[1] - 3 * z, 3.4 * z, 0, 7); ctx.fill(); } return;
      case 'statue': box(x, y, 1, .3, 8, '#efe8d8', '#cfc4ad', '#e0d6c0'); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(p[0] - 2.5 * z, p[1] - 22 * z, 5 * z, 12 * z); ctx.beginPath(); ctx.arc(p[0], p[1] - 24 * z, 2.8 * z, 0, 7); ctx.fill(); return;
      case 'altar': box(x, y, 1, .3, 6, '#efe8d8', '#cfc4ad', '#e0d6c0'); ctx.fillStyle = 'rgba(255,150,40,' + (.6 + Math.sin(t0 * 8) * .3) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1] - 9 * z, 2.5 * z, 0, 7); ctx.fill(); return;
      case 'theatre': {
        diamond(x + .05, y + .05, s - .1, s - .1); ctx.fillStyle = '#c9bea6'; ctx.fill();
        for (r = 0; r < 5; r++) { var rr = (1.35 - r * .2), cx2 = x + s - .2, cy2 = y + s - .2; ctx.beginPath(); for (var an = Math.PI; an <= Math.PI * 1.5 + .01; an += .1) { var pt = toScr(cx2 + Math.cos(an) * rr * 1.9, cy2 + Math.sin(an) * rr * 1.9); an === Math.PI ? ctx.moveTo(pt[0], pt[1] - (5 - r) * 3 * z) : ctx.lineTo(pt[0], pt[1] - (5 - r) * 3 * z); } ctx.strokeStyle = r % 2 ? '#e8e0cc' : '#d3c8b0'; ctx.lineWidth = 5 * z; ctx.stroke(); }
        q = box(x + s - 1, y + s - 1, 1, .1, 10, '#efe8d8', '#cfc4ad', '#e0d6c0'); return; }
      case 'port': case 'fishery': { diamond(x, y, s, s); ctx.fillStyle = '#8b6a43'; ctx.fill(); ctx.strokeStyle = '#6b4f30'; ctx.lineWidth = z; for (r = 1; r < 8; r++) { var w1 = toScr(x, y + r * s / 8), w2 = toScr(x + s, y + r * s / 8); ctx.beginPath(); ctx.moveTo(w1[0], w1[1]); ctx.lineTo(w2[0], w2[1]); ctx.stroke(); }
        q = box(x, y, 1, .1, b.k === 'port' ? 14 : 8, '#e3d2ae', '#bba278', '#cdb68c'); roof(q, 5, '#b5523a', '#cf6b4c');
        var sea = null; for (var yy = y - 1; yy <= y + s && !sea; yy++) for (var xx = x - 1; xx <= x + s && !sea; xx++) { var j = at(xx, yy); if (j >= 0 && T[j] === 2) sea = [xx, yy]; }
        if (sea && z > .4) { var sp = toScr(sea[0] + .5, sea[1] + .5), bob = Math.sin(t0 * 2 + b.id) * 1.5 * z; ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(sp[0], sp[1] + bob, 14 * z, 5 * z, -.45, 0, 7); ctx.fill(); if (b.k === 'port') { ctx.fillStyle = '#f2ead6'; ctx.fillRect(sp[0] - 1, sp[1] - 20 * z + bob, 12 * z, 14 * z); ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sp[0] - 1.2, sp[1] - 22 * z + bob, 2, 22 * z); } }
        return; }
      case 'pharos': { q = box(x, y, s, .05, 14, '#efe8d8', '#cfc4ad', '#e0d6c0'); var q2 = box(x, y, s, .3, 46, '#f3eee2', '#d4cab4', '#e6dece'); box(x, y, s, .45, 66, '#f6f2e8', '#d8cfba', '#ebe4d4'); ctx.fillStyle = 'rgba(255,200,80,' + (.6 + Math.sin(t0 * 3) * .3) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1] - 72 * z, 6 * z, 0, 7); ctx.fill(); return; }
    }
    // generic buildings
    var temple = D.svc === 'temple' && b.k !== 'altar', look = {
      granary: ['#e3d2ae', '#bba278', '#cdb68c', 'roof'], warehouse: ['#dcc9a2', '#b39a70', '#c6ae84', 'roof'], agora: ['#efe5cc', '#cbbd9b', '#ddd0b2', 'stalls'], potter: ['#d9c3a0', '#b39a76', '#c4ac88', 'kiln'],
      press: ['#d9c3a0', '#b39a76', '#c4ac88', 'roof'], winery: ['#d9c3a0', '#b39a76', '#c4ac88', 'roof'], school: ['#f0e6cf', '#cdbf9f', '#dfd2b5', 'roof'], gym: ['#e9e1cc', '#c6b99c', '#d8cdb3', 'court'],
      boule: ['#f3ecda', '#d2c6aa', '#e4dac2', 'cols'], watch: ['#d8c8a8', '#b5a37f', '#c7b693', 'tower'], architect: ['#d8c8a8', '#b5a37f', '#c7b693', 'roof'], stoa: ['#f3ecda', '#d2c6aa', '#e4dac2', 'cols'],
      library: ['#f5efe0', '#d6cbb2', '#e8dfca', 'cols'], parthenon: ['#f7f3e8', '#d9cfba', '#ece5d4', 'cols']
    }[b.k] || ['#f3ecda', '#d2c6aa', '#e4dac2', 'cols'];
    if (temple || look[3] === 'cols') {
      box(x, y, s, .04, 5, '#e3dccb', '#c3b9a2', '#d4cbb6');
      q = box(x, y, s, .14, D.h, look[0], 'rgba(0,0,0,0)', 'rgba(0,0,0,0)');
      var inner = box(x, y, s, .3, D.h - 2, look[0], look[1], look[2]); columns(q, s * 3 + 1, D.h); roof(q, 6 + s * 2, '#c96a4b', '#dd8160');
      if (b.k === 'parthenon' && z > .5) { ctx.fillStyle = '#2f5aa0'; ctx.fillRect(q.d[0] + (q.c[0] - q.d[0]) * .3, q.d[1] + (q.c[1] - q.d[1]) * .3 - D.h * z - 1, 3 * z, 3 * z); }
    } else {
      q = box(x, y, s, .1, D.h, look[0], look[1], look[2]);
      if (look[3] === 'roof') roof(q, 8, '#b5523a', '#cf6b4c');
      if (look[3] === 'kiln') { roof(q, 6, '#9a7a52', '#b08d5f'); if ((b.staff || 0) > 0 && z > .4) smoke(p, D.h + 10, b.id); }
      if (look[3] === 'stalls') { for (r = 0; r < 4; r++) { var st = toScr(x + .4 + (r % 2), y + .4 + Math.floor(r / 2)); ctx.fillStyle = ['#c0392b', '#2a62c9', '#d8b860', '#2d7a3e'][r]; ctx.beginPath(); ctx.moveTo(st[0] - 8 * z, st[1] - D.h * z - 2 * z); ctx.lineTo(st[0] + 8 * z, st[1] - D.h * z - 2 * z); ctx.lineTo(st[0], st[1] - D.h * z - 10 * z); ctx.fill(); } }
      if (look[3] === 'court') { diamond(x + .5, y + .5, s - 1, s - 1); ctx.fillStyle = '#d9c38f'; ctx.save(); ctx.translate(0, -D.h * z); ctx.fill(); ctx.restore(); }
      if (look[3] === 'tower') { var t2 = box(x, y, 1, .3, D.h + 8, '#d8c8a8', '#b5a37f', '#c7b693'); roof(t2, 5, '#b5523a', '#cf6b4c'); }
      if ((D.make || b.k === 'press' || b.k === 'winery') && (b.staff || 0) > 0 && z > .4 && look[3] !== 'kiln') smoke(p, D.h + 12, b.id);
    }
    if (D.w && (b.staff || 0) < .5 && z > .5) warn(p, '👷', D.h);
    else if ((b.fire > 70 && !cov.fire[at(x, y)]) || b.wear > 70) warn(p, b.fire > 70 ? '🔥' : '🧱', D.h);
  }
  function smoke(p, h, seed) { var z = cam.z; for (var i = 0; i < 3; i++) { var k = (t0 * .6 + i / 3 + seed * .13) % 1; ctx.fillStyle = 'rgba(230,230,230,' + (.5 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p[0] + Math.sin(k * 6 + seed) * 4 * z, p[1] - (h + k * 26) * z, (3 + k * 6) * z, 0, 7); ctx.fill(); } }
  function warn(p, e, h) { ctx.font = Math.round(13 * Math.max(.7, cam.z)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(e, p[0], p[1] - ((h || 18) + 12) * cam.z + Math.sin(t0 * 4) * 2); }
  function label(p, t, h) { ctx.font = '600 ' + Math.round(12 * Math.max(.8, cam.z)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#3b2b14'; ctx.fillText(t, p[0], p[1] - (h + 10) * cam.z); }
  function draw() {
    var dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2c5f86'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!G) return;
    var vis = [];
    // visible tile range (rough)
    var c1 = toTile(0, 0), c2 = toTile(cv.width, 0), c3 = toTile(0, cv.height), c4 = toTile(cv.width, cv.height);
    var x0 = Math.max(0, Math.min(c1[0], c3[0]) - 2), x1 = Math.min(W - 1, Math.max(c2[0], c4[0]) + 2), y0 = Math.max(0, Math.min(c1[1], c2[1]) - 2), y1 = Math.min(H - 1, Math.max(c3[1], c4[1]) + 2);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) drawTile(x, y);
    // ghost of the tool
    ghost();
    // draw decorations and buildings in depth order
    var items = [];
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var i = y * W + x; if (!grid[i] && (T[i] === 4 || T[i] === 3 || T[i] === 5 || T[i] === 1)) items.push([x + y + 1, 0, x, y]); }
    Bs.forEach(function (b) { if (b.x + b.s < x0 || b.x > x1 + 1 || b.y + b.s < y0 || b.y > y1 + 1) return; items.push([b.x + b.y + b.s * 2 - 1 - (b.k === 'road' ? 99 : 0), 1, b]); });
    walkers.forEach(function (w) { items.push([w.x + w.y + .9, 2, w]); });
    items.sort(function (a, b) { return a[0] - b[0]; });
    items.forEach(function (it) { if (it[1] === 0) drawDeco(it[2], it[3]); else if (it[1] === 1) drawB(it[2]); else drawWalker(it[2]); });
    fx = fx.filter(function (f) { f.t += 1 / 60; var p = toScr(f.x, f.y); for (var i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(80,70,60,' + (.5 * (1 - f.t / 3)) + ')'; ctx.beginPath(); ctx.arc(p[0] + Math.sin(i * 2 + f.t) * 10 * cam.z, p[1] - (f.t * 30 + i * 6) * cam.z, (6 + f.t * 6) * cam.z, 0, 7); ctx.fill(); } return f.t < 3; });
    if (hover && !tool && !drag) { var hb = grid[at(hover[0], hover[1])]; if (hb) { diamond(hb.x, hb.y, hb.s, hb.s); ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = 2; ctx.stroke(); } }
  }
  function ghost() {
    if (!tool || !hover) return;
    var cells = toolCells();
    cells.forEach(function (c) { var D = B[tool], s = tool === 'clear' || tool === 'road' || tool === 'house' ? 1 : D.s, ok = tool === 'clear' ? true : canPlace(tool, c[0], c[1]); diamond(c[0], c[1], s, s); ctx.fillStyle = ok ? 'rgba(90,220,120,.45)' : 'rgba(230,70,60,.45)'; ctx.fill(); });
    if (B[tool] && B[tool].r && cells.length === 1) { var c = cells[0], R = B[tool].r, s = B[tool].s; diamond(c[0] - R, c[1] - R, s + 2 * R, s + 2 * R); ctx.strokeStyle = 'rgba(255,230,120,.9)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
  }
  function toolCells() {
    if (!hover) return [];
    if (drag && drag.tool && (tool === 'road' || tool === 'house' || tool === 'clear')) {
      var a = drag.start, b = hover, out = [];
      if (tool === 'road') { var x = a[0], y = a[1]; var dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]); out.push([x, y]); while (x !== b[0]) { x += dx; out.push([x, y]); } while (y !== b[1]) { y += dy; out.push([x, y]); } return out; }
      for (var yy = Math.min(a[1], b[1]); yy <= Math.max(a[1], b[1]); yy++) for (var xx = Math.min(a[0], b[0]); xx <= Math.max(a[0], b[0]); xx++) out.push([xx, yy]);
      return out;
    }
    var s = B[tool] ? B[tool].s : 1; return [[hover[0] - (s > 1 ? Math.floor((s - 1) / 2) : 0), hover[1] - (s > 1 ? Math.floor((s - 1) / 2) : 0)]];
  }
  // little people walking the roads
  function updateWalkers(dt) {
    var want = Math.min(90, Math.floor(G.pop / 14)), roads = null;
    if (walkers.length < want && Math.random() < .2) { roads = Bs.filter(function (b) { return b.k === 'road'; }); if (roads.length) { var r = roads[Math.floor(Math.random() * roads.length)]; walkers.push({ x: r.x + .5, y: r.y + .5, tx: r.x + .5, ty: r.y + .5, c: ['#7a3b2a', '#2a4a7a', '#e9e2cf', '#3a6a3a', '#8a6a2a'][Math.floor(Math.random() * 5)], life: 40 + Math.random() * 40 }); } }
    walkers = walkers.filter(function (w) {
      w.life -= dt; var dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
      if (d < .05) { var opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (o) { return [Math.floor(w.tx) + o[0], Math.floor(w.ty) + o[1]]; }).filter(function (c) { var g = grid[at(c[0], c[1])]; return g && g.k === 'road'; }); if (!opts.length) return false; var back = opts.filter(function (c) { return c[0] + .5 !== w.px || c[1] + .5 !== w.py; }); var c = (back.length ? back : opts)[Math.floor(Math.random() * (back.length || opts.length))]; w.px = Math.floor(w.tx) + .5; w.py = Math.floor(w.ty) + .5; w.tx = c[0] + .5; w.ty = c[1] + .5; }
      else { var sp = Math.min(d, dt * 1.1); w.x += dx / d * sp; w.y += dy / d * sp; }
      var g = grid[at(Math.floor(w.x), Math.floor(w.y))]; return w.life > 0 && g && g.k === 'road';
    });
  }
  function drawWalker(w) { var z = cam.z, p = toScr(w.x + (w.c.length % 2 ? .1 : -.1), w.y); if (z < .45) return; ctx.fillStyle = w.c; ctx.fillRect(p[0] - 1.6 * z, p[1] - 8 * z, 3.2 * z, 7 * z); ctx.fillStyle = '#e8c29a'; ctx.beginPath(); ctx.arc(p[0], p[1] - 9.5 * z, 1.8 * z, 0, 7); ctx.fill(); }

  /* ---------- input ---------- */
  var pointers = {}, pinch = null;
  function evTile(e) { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; return toTile((e.clientX - r.left) * d, (e.clientY - r.top) * d); }
  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId); pointers[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pointers);
    if (ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; drag = null; return; }
    var t = evTile(e); hover = t;
    if (e.button === 2 || !tool) drag = { pan: true, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false, start: t };
    else drag = { tool: true, start: t };
  });
  cv.addEventListener('pointermove', function (e) {
    if (pointers[e.pointerId]) pointers[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pointers);
    if (pinch && ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; cam.z = Math.max(.35, Math.min(2.2, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); return; }
    hover = evTile(e);
    if (drag && drag.pan) { var d = window.devicePixelRatio || 1, dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; cam.x = drag.cx - dx * d / cam.z; cam.y = drag.cy - dy * d / cam.z; }
  });
  function up(e) {
    delete pointers[e.pointerId]; if (pinch) { if (!Object.keys(pointers).length) pinch = null; return; }
    if (!drag) return; var dg = drag; drag = null;
    if (dg.pan) { if (!dg.moved && e.button !== 2) info(hover); return; }
    if (dg.tool) { drag = dg; var cells = toolCells(); drag = null; apply(cells); }
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; drag = null; pinch = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); cam.z = Math.max(.35, Math.min(2.2, cam.z * (e.deltaY < 0 ? 1.12 : .89))); }, { passive: false });
  cv.addEventListener('pointerleave', function () { hover = null; });
  function apply(cells) {
    if (tool === 'clear') { cells.forEach(function (c) { demolish(c[0], c[1]); }); Kit.sfx.hit(); }
    else { var n = 0; cells.forEach(function (c) { if (place(tool, c[0], c[1], n > 0)) n++; }); if (n) Kit.sfx.click(); else if (cells.length === 1) msg(why(tool, cells[0][0], cells[0][1]), 1); }
    covers(); ui();
  }
  function why(k, x, y) { var D = B[k]; if (D.coast) return D.n + ' must touch the sea.'; if (D.rock) return 'A quarry must touch rocky ground.'; if (D.mon && Bs.some(function (b) { return b.k === k; })) return 'You can only build one ' + D.n + '.'; return 'You can’t build there.'; }
  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    var s = 40 / cam.z;
    if (e.key === 'Escape') { setTool(null); }
    else if (e.key === ' ') { e.preventDefault(); speed = speed ? 0 : 1; ui(); }
    else if (e.key === 'ArrowLeft' || e.key === 'a') cam.x -= s; else if (e.key === 'ArrowRight' || e.key === 'd') cam.x += s;
    else if (e.key === 'ArrowUp' || e.key === 'w') cam.y -= s; else if (e.key === 'ArrowDown' || e.key === 's') cam.y += s;
    else if (e.key === '+' || e.key === '=') cam.z = Math.min(2.2, cam.z * 1.15); else if (e.key === '-') cam.z = Math.max(.35, cam.z / 1.15);
    else if (e.key === 'r') setTool('road'); else if (e.key === 'h') setTool('house'); else if (e.key === 'x') setTool('clear');
  });

  /* ---------- the interface ---------- */
  var speed = 1, cat = null;
  function setTool(k) { tool = k; $('#info').hidden = true; if (!k) { $('#sub').hidden = true; cat = null; } renderTools(); }
  function renderTools() {
    $('#tools').innerHTML = CATS.map(function (c) { return '<button class="po-cat' + (cat === c[0] ? ' on' : '') + '" data-c="' + c[0] + '" title="' + c[2] + '"><span>' + c[1] + '</span><small>' + c[2] + '</small></button>'; }).join('');
    Kit.$$('[data-c]').forEach(function (b) { b.onclick = function () { cat = cat === b.dataset.c ? null : b.dataset.c; sub(); renderTools(); }; });
  }
  function sub() {
    var el = $('#sub'); if (!cat) { el.hidden = true; return; } el.hidden = false;
    var ks = Object.keys(B).filter(function (k) { return B[k].cat === cat; });
    el.innerHTML = ks.map(function (k) { var D = B[k]; return '<button class="po-b' + (tool === k ? ' on' : '') + '" data-k="' + k + '"><b>' + D.n + '</b><span class="mute">' + D.c + ' ₯' + (D.w ? ' · ' + D.w + ' workers' : '') + (D.mon ? ' · ' + D.mon + ' marble' : '') + '</span><small>' + D.d + '</small></button>'; }).join('') + '<button class="po-x" id="sub-x">✕</button>';
    Kit.$$('[data-k]').forEach(function (b) { b.onclick = function () { tool = b.dataset.k; sub(); if (window.innerWidth < 760) el.hidden = true; msg(B[tool].n + ': ' + (tool === 'road' || tool === 'house' || tool === 'clear' ? 'drag on the map.' : 'tap a spot on the map.') + ' Esc or the ✋ button to stop.'); ui(); }; });
    $('#sub-x').onclick = function () { cat = null; el.hidden = true; renderTools(); };
  }
  function ui() {
    if (!G) return;
    var R = G.ratings;
    $('#top').innerHTML = '<span title="Treasury" class="' + (G.money < 0 ? 'bad' : '') + '">₯ <b>' + Math.round(G.money).toLocaleString() + '</b></span><span title="Population">👥 <b>' + G.pop.toLocaleString() + '</b></span>' +
      '<span title="Food in granaries">🌾 <b>' + Math.round(G.stock.wheat) + '</b></span><span title="Workers / jobs" class="' + (G.emp < .85 ? 'bad' : '') + '">👷 <b>' + Math.min(G.workers, G.jobs) + '/' + G.jobs + '</b></span>' +
      '<span title="Culture · Prosperity · Piety">🎭 <b>' + R.culture + '</b> 💰 <b>' + R.prosperity + '</b> 🕊️ <b>' + R.piety + '</b></span><span class="po-date">' + MONTHS[G.month] + ', ' + yearTxt() + '</span>' +
      '<span class="po-speed">' + [[0, '⏸'], [1, '▶'], [2, '⏩'], [4, '⏭']].map(function (s) { return '<button data-s="' + s[0] + '" class="' + (speed === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</span>' +
      (tool ? '<button class="btn gold po-stop" id="stop">✋ ' + esc(B[tool].n) + '</button>' : '');
    Kit.$$('[data-s]').forEach(function (b) { b.onclick = function () { speed = +b.dataset.s; ui(); }; });
    if ($('#stop')) $('#stop').onclick = function () { setTool(null); ui(); };
    $('#ov').innerHTML = '<select id="ovs" title="Overlay"><option value="">No overlay</option>' + [['well', 'Wells'], ['fountain', 'Fountains'], ['market', 'Markets'], ['temple', 'Temples'], ['theatre', 'Theatres'], ['school', 'Schools'], ['gym', 'Gymnasia'], ['tax', 'Tax collection'], ['fire', 'Night watch'], ['repair', 'Architects'], ['desir', 'Desirability']].map(function (o) { return '<option value="' + o[0] + '"' + (overlay === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    $('#ovs').onchange = function () { overlay = this.value; };
  }
  function msg(t, bad) { var m = $('#msg'), d = document.createElement('div'); d.className = 'po-m' + (bad ? ' bad' : ''); d.textContent = t; m.appendChild(d); while (m.children.length > 4) m.removeChild(m.firstChild); setTimeout(function () { d.classList.add('out'); }, 5000); setTimeout(function () { d.remove(); }, 5800); }
  function info(t) {
    var el = $('#info'), b = t && grid[at(t[0], t[1])];
    if (!b || b.k === 'road') { el.hidden = true; return; }
    var D = B[b.k], h = '';
    if (b.k === 'house') h = '<h3>' + HOUSE[b.lv] + '</h3><p>' + b.pop + ' of ' + CAP[b.lv] + ' people</p>' + (b.need ? '<p class="mute">To grow it needs <b>' + b.need + '</b>.</p>' : '<p class="good">This house has everything it wants.</p>') + '<p class="mute small">Desirability ' + desir[at(b.x, b.y)] + (b.fire > 50 ? ' · fire risk ' + Math.round(b.fire) + '%' : '') + '</p>';
    else {
      h = '<h3>' + D.n + '</h3><p class="mute small">' + D.d + '</p>';
      if (D.w) h += '<p>Workers: ' + Math.round((b.staff || 0) * D.w) + ' / ' + D.w + '</p>';
      if (D.prod || D.make) h += '<p>Output: ' + Math.round(b.out || 0) + ' ' + GOODS[D.prod || D.make].toLowerCase() + ' a month</p>';
      if (D.store) h += '<p>' + (D.store === 'food' ? 'Food: ' + Math.round(G.stock.wheat) + ' / ' + G.capFood : Object.keys(GOODS).filter(function (k) { return k !== 'wheat'; }).map(function (k) { return GOODS[k] + ' ' + Math.round(G.stock[k]); }).join(' · ')) + '</p>';
      if (D.mon) h += '<p>' + (b.built >= 1 ? 'Complete.' : 'Building: ' + Math.round(b.built * 100) + '% · needs ' + Math.round(D.mon * (1 - b.built)) + ' more marble (you have ' + Math.round(G.stock.marble) + ')') + '</p>';
      if (D.god) h += '<p>' + (D.god === 'all' ? 'All the gods' : GODS[D.god] + ' is ' + moodTxt(G.mood[D.god])) + '</p>';
      if (b.wear > 40) h += '<p class="bad">Cracks in the walls (' + Math.round(b.wear) + '%)</p>';
    }
    el.innerHTML = h + '<div class="krow"><button class="btn ghost" id="i-del">Demolish</button><button class="btn" id="i-x">Close</button></div>'; el.hidden = false;
    $('#i-x').onclick = function () { el.hidden = true; }; $('#i-del').onclick = function () { demolish(b.x, b.y); covers(); el.hidden = true; ui(); };
  }
  function moodTxt(m) { return m > 85 ? 'delighted' : m > 65 ? 'pleased' : m > 40 ? 'content' : m > 20 ? 'displeased' : 'angry'; }
  function advisers(tab) {
    tab = tab || 'city'; var h = '<div class="seg po-tabs">' + [['city', 'City'], ['labour', 'Labour'], ['stock', 'Trade & stores'], ['gods', 'Gods']].map(function (t) { return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'city') {
      var lv = [0, 0, 0, 0, 0, 0, 0, 0]; Bs.forEach(function (b) { if (b.k === 'house') lv[b.lv]++; });
      h += '<table class="kt"><tr><td>Population</td><td class="num">' + G.pop + '</td></tr><tr><td>Mood of the people</td><td>' + (G.sentiment > 65 ? 'Happy' : G.sentiment > 45 ? 'Content' : G.sentiment > 30 ? 'Grumbling' : 'Angry: people are leaving') + '</td></tr><tr><td>Taxes last month</td><td class="num">+' + (G.lastTax || 0) + '</td></tr><tr><td>Wages last month</td><td class="num">−' + (G.lastWages || 0) + '</td></tr><tr><td>Trade last month</td><td class="num">' + (G.lastTrade || 0) + '</td></tr></table>' +
        '<p><label>Tax rate <b id="taxv">' + G.tax + '%</b> <input type="range" id="tax" min="0" max="20" value="' + G.tax + '"></label></p><p class="mute small">Above 7% the people grumble. Only houses near a bouleuterion pay.</p>' +
        '<p class="small">' + HOUSE.map(function (n, i) { return lv[i] ? n + ': ' + lv[i] : ''; }).filter(Boolean).join(' · ') + '</p>';
    } else if (tab === 'labour') {
      h += '<table class="kt"><tr><td>Workers (42% of people)</td><td class="num">' + G.workers + '</td></tr><tr><td>Jobs</td><td class="num">' + G.jobs + '</td></tr><tr><td>Unemployed</td><td class="num">' + Math.round(G.unemp * 100) + '%</td></tr><tr><td>Buildings staffed</td><td class="num">' + Math.round(G.emp * 100) + '%</td></tr></table><p class="mute small">When there are too few workers, the fountains, granaries, markets, farms, watch and architects are staffed first. Too many idle workers make people unhappy.</p>';
    } else if (tab === 'stock') {
      h += '<table class="kt"><tr><th>Good</th><th>Stored</th><th>Price</th><th>Trade</th></tr>' + Object.keys(GOODS).map(function (k) { return '<tr><td>' + GOODS[k] + '</td><td class="num">' + Math.round(G.stock[k]) + '</td><td class="num">' + PRICE[k] + '</td><td><select data-tr="' + k + '">' + [['keep', 'Keep'], ['sell', 'Sell surplus'], ['buy', 'Buy']].map(function (o) { return '<option value="' + o[0] + '"' + (G.trade[k] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</table><p class="mute small">Granaries hold ' + G.capFood + ' food; warehouses hold ' + G.capGoods + ' of each good. Trade needs a staffed trading harbour. Buying costs 40% over the price.</p>';
    } else {
      h += '<table class="kt">' + Object.keys(GODS).map(function (g) { var cost = Math.round(60 + G.pop * .25); return '<tr><td><b>' + GODS[g] + '</b></td><td>' + moodTxt(G.mood[g]) + ' (' + Math.round(G.mood[g]) + ')</td><td><button class="btn ghost" data-fest="' + g + '"' + (G.money < cost ? ' disabled' : '') + '>Hold ' + FEST[g] + ' · ' + cost + '</button></td></tr>'; }).join('') + '</table><p class="mute small">Each god needs temples in proportion to the size of the city. A festival pleases one god a great deal and the people too. Angry gods punish the city.</p>';
    }
    Kit.modal('<h2>📊 Advisers</h2>' + h + '<div class="krow"><button class="btn" data-close>Close</button></div>');
    Kit.$$('[data-tab]').forEach(function (b) { b.onclick = function () { advisers(b.dataset.tab); }; });
    if ($('#tax')) $('#tax').oninput = function () { G.tax = +this.value; $('#taxv').textContent = G.tax + '%'; };
    Kit.$$('[data-tr]').forEach(function (s) { s.onchange = function () { G.trade[s.dataset.tr] = s.value; }; });
    Kit.$$('[data-fest]').forEach(function (b) { b.onclick = function () { var g = b.dataset.fest, cost = Math.round(60 + G.pop * .25); G.money -= cost; G.mood[g] = Math.min(100, G.mood[g] + 30); G.fest = 3; Kit.sfx.win(); msg('The city celebrates ' + FEST[g] + ' in honour of ' + GODS[g] + '.'); advisers('gods'); ui(); }; });
  }
  function goalsModal() {
    var sc = SCEN[G.si], gl = goalList();
    Kit.modal('<p class="chip">' + yearTxt() + '</p><h2>🎯 ' + sc.n + '</h2>' + (gl.length ? '<table class="kt">' + gl.map(function (g) { return '<tr><td>' + (g[1] ? '✅' : '⬜') + ' ' + g[0] + '</td><td class="num">' + g[2] + '</td></tr>'; }).join('') + '</table>' : '<p>No goals: build as you like.</p>') + '<p class="mute small">Tip: ' + sc.tip + '</p><div class="krow"><button class="btn" data-close>Close</button></div>');
  }
  function menu() {
    var done = Kit.store.get('po-done', {});
    Kit.modal('<h2>🏛️ Cities</h2><div class="po-scen">' + SCEN.map(function (s, i) { return '<button class="po-sc" data-sc="' + i + '"><b>' + (done[s.id] ? '✅ ' : '') + s.n + '</b><span class="mute small">' + (s.y < 0 ? -s.y + ' BC' : s.y) + ' · ' + (Object.keys(s.goals).length ? Object.keys(s.goals).map(function (k) { var v = s.goals[k]; return typeof v === 'string' ? B[v].n : k + ' ' + v; }).join(', ') : 'no goals') + '</span></button>'; }).join('') + '</div><div class="krow">' + (G ? '<button class="btn" data-close>Back to ' + SCEN[G.si].n + '</button>' : '') + '</div>');
    Kit.$$('[data-sc]').forEach(function (b) { b.onclick = function () { Kit.closeModal(); newCity(+b.dataset.sc); }; });
  }
  function intro() { var sc = SCEN[G.si]; Kit.modal('<p class="chip">' + yearTxt() + '</p><h2>' + sc.n + '</h2><p>' + sc.hist + '</p>' + (goalList().length ? '<p><b>Goals:</b> ' + goalList().map(function (g) { return g[0]; }).join(', ') + '</p>' : '') + '<p class="mute small">Tip: ' + sc.tip + '</p><div class="krow"><button class="btn gold" data-close>Begin</button></div>'); }
  function help() {
    Kit.modal('<h2>Polis</h2><p>Found and grow a Greek city. Houses grow from tents into villas when they have what they need nearby. Tap a house to see what it wants next.</p><ol class="small"><li><b>Road</b> and <b>house plots</b> next to it. Settlers arrive.</li><li><b>Well</b> or <b>fountain</b> for water.</li><li><b>Farm → granary → agora</b> for food.</li><li>A <b>temple</b> or shrine.</li><li>Clay pit → <b>potter</b> → warehouse, and a fountain house, for fine houses.</li><li><b>Theatre</b> or <b>school</b>, <b>olive oil</b>, and gardens.</li><li>Villas need a <b>gymnasium</b>, school and theatre, <b>wine</b>, and statues.</li></ol><p class="small">The <b>bouleuterion</b> collects taxes. The <b>night watch</b> stops fires and <b>architects</b> stop collapses. Sell surplus at a <b>trading harbour</b>. Keep the five gods happy with temples and festivals.</p><p class="mute small">Drag to pan (right-drag with a tool), wheel or pinch to zoom, Esc to drop a tool, Space to pause. Keys: R road, H house, X clear.</p><div class="krow"><button class="btn gold" data-close>Build</button></div>');
  }
  function save() { try { Kit.store.set('po-save', { G: G, T: Array.from(T), Bs: Bs, id: id, cam: cam }); } catch (e) { } }
  function load() { var s = Kit.store.get('po-save', null); if (!s || !s.G) return false; G = s.G; T = Uint8Array.from(s.T); Bs = s.Bs; id = s.id; cam.x = s.cam.x; cam.y = s.cam.y; cam.z = s.cam.z; rebuildGrid(); covers(); stats(); ratings(); ui(); return true; }
  $('#b-adv').onclick = function () { advisers(); }; $('#b-goals').onclick = goalsModal; $('#b-menu').onclick = menu; $('#b-help').onclick = help;

  /* ---------- main loop ---------- */
  var acc = 0, last = performance.now();
  function frame(now) {
    var dt = Math.min(.1, (now - last) / 1000); last = now; t0 += dt;
    if (G && speed && !Kit._m) { acc += dt * speed; if (acc >= 4) { acc = 0; month(); } }
    if (G) updateWalkers(dt * (speed || 0));
    draw(); requestAnimationFrame(frame);
  }
  renderTools();
  T = new Uint8Array(W * H); Bs = []; rebuildGrid();
  if (!load()) { newCity(0); if (!Kit.store.get('po-seen', 0)) { Kit.store.set('po-seen', 1); help(); } } else msg('Welcome back to ' + SCEN[G.si].n + '.');
  requestAnimationFrame(frame);
  window.PO = { get G() { return G; }, get Bs() { return Bs; }, get T() { return T; }, place: place, month: month, newCity: newCity, covers: covers, cam: cam, B: B, setTool: setTool, at: at, get cov() { return cov; } };
})();
