/* Ancient Festival Tycoon — the expansion for Plutarch's Games.
   35 more buildings (shows, food and shops, care, scenery), a carpenter for breakdowns, a fifth rank,
   and 17 more scenarios for 22 in all. Loaded after art.js, vocab.js and fest-data.js, before game.js. */
(function (W) {
  'use strict';
  var A = W.FestArt, FV = W.FestVocab, FD = W.FestData, P = A.P, poly = A.poly, shade = A.shade;
  var DRAW = A.DRAW;

  // ---------- buildings ----------
  // kind: show | food | drink | shop | rest | toilet | decor. Same fields as the original game.
  var DEF = {
    puppets:    { size: [1, 2], cost: 260, upkeep: 8, kind: 'show', fun: 26, dur: 6, cap: 6, price: 3, value: 5, group: 'gShows', appeal: 2 },
    dancers:    { size: [2, 2], cost: 420, upkeep: 14, kind: 'show', fun: 32, dur: 8, cap: 10, price: 3, value: 6, group: 'gShows', appeal: 3 },
    swings:     { size: [2, 1], cost: 300, upkeep: 6, kind: 'show', fun: 24, dur: 5, cap: 4, price: 2, value: 4, group: 'gShows', appeal: 2 },
    oracle:     { size: [2, 2], cost: 480, upkeep: 15, kind: 'show', fun: 26, dur: 7, cap: 4, price: 7, value: 9, group: 'gShows', appeal: 3 },
    poetry:     { size: [2, 2], cost: 450, upkeep: 14, kind: 'show', fun: 30, energy: 8, dur: 10, cap: 12, price: 3, value: 6, group: 'gShows', appeal: 3, only: 'greece' },
    pantomime:  { size: [2, 2], cost: 520, upkeep: 18, kind: 'show', fun: 36, dur: 10, cap: 14, price: 5, value: 8, group: 'gShows', appeal: 4, only: 'rome' },
    maze:       { size: [3, 3], cost: 700, upkeep: 12, kind: 'show', fun: 44, energy: -6, dur: 14, cap: 16, price: 4, value: 8, group: 'gShows', appeal: 5, rank: 2 },
    archery:    { size: [3, 2], cost: 650, upkeep: 20, kind: 'show', fun: 40, dur: 9, cap: 10, price: 5, value: 8, group: 'gShows', appeal: 4, rank: 2 },
    menagerie:  { size: [3, 3], cost: 1100, upkeep: 45, kind: 'show', fun: 52, dur: 12, cap: 20, price: 8, value: 12, group: 'gShows', appeal: 6, rank: 3 },
    torchrace:  { size: [5, 2], cost: 1300, upkeep: 45, kind: 'show', fun: 62, energy: -6, dur: 13, cap: 30, price: 8, value: 13, group: 'gShows', appeal: 7, rank: 3 },
    boatrace:   { size: [4, 3], cost: 1600, upkeep: 55, kind: 'show', fun: 68, dur: 14, cap: 32, price: 10, value: 15, group: 'gShows', appeal: 8, rank: 3 },
    bullleap:   { size: [3, 3], cost: 1900, upkeep: 70, kind: 'show', fun: 78, dur: 14, cap: 30, price: 12, value: 18, group: 'gShows', appeal: 9, rank: 4 },
    naumachia:  { size: [5, 4], cost: 4500, upkeep: 160, kind: 'show', fun: 98, dur: 20, cap: 80, price: 18, value: 28, group: 'gShows', appeal: 12, rank: 5, only: 'rome' },
    olives:     { size: [1, 1], cost: 120, upkeep: 4, kind: 'food', hunger: -35, dur: 2, cap: 3, price: 2, value: 3, group: 'gFood' },
    figs:       { size: [1, 1], cost: 160, upkeep: 5, kind: 'food', hunger: -40, fun: 5, dur: 3, cap: 3, price: 3, value: 5, group: 'gFood' },
    sausages:   { size: [1, 1], cost: 190, upkeep: 7, kind: 'food', hunger: -62, dur: 3, cap: 3, price: 4, value: 6, group: 'gFood' },
    fish:       { size: [1, 1], cost: 220, upkeep: 8, kind: 'food', hunger: -58, dur: 3, cap: 3, price: 4, value: 6, group: 'gFood', rank: 2 },
    cakes:      { size: [1, 1], cost: 200, upkeep: 6, kind: 'food', hunger: -45, fun: 8, dur: 3, cap: 3, price: 4, value: 6, group: 'gFood' },
    water:      { size: [1, 1], cost: 90, upkeep: 3, kind: 'drink', thirst: -45, dur: 2, cap: 3, price: 1, value: 3, group: 'gFood' },
    kykeon:     { size: [1, 1], cost: 170, upkeep: 6, kind: 'drink', thirst: -60, hunger: -10, dur: 3, cap: 3, price: 3, value: 5, group: 'gFood' },
    wreaths:    { size: [1, 1], cost: 210, upkeep: 6, kind: 'shop', fun: 18, dur: 3, cap: 3, price: 5, value: 7, group: 'gFood', appeal: 1 },
    pottery:    { size: [1, 1], cost: 260, upkeep: 8, kind: 'shop', fun: 20, dur: 4, cap: 3, price: 8, value: 10, group: 'gFood', appeal: 1, rank: 2 },
    masks:      { size: [1, 1], cost: 240, upkeep: 7, kind: 'shop', fun: 22, dur: 3, cap: 3, price: 6, value: 9, group: 'gFood', appeal: 1, rank: 2 },
    toys:       { size: [1, 1], cost: 180, upkeep: 5, kind: 'shop', fun: 16, dur: 3, cap: 3, price: 4, value: 6, group: 'gFood', appeal: 1 },
    physician:  { size: [2, 2], cost: 600, upkeep: 22, kind: 'rest', energy: 55, fun: 4, dur: 8, cap: 6, price: 4, value: 7, group: 'gCare', rank: 2 },
    awning:     { size: [2, 1], cost: 140, upkeep: 2, kind: 'rest', energy: 16, dur: 5, cap: 6, price: 0, value: 0, group: 'gCare', decor: 0.6 },
    laurel:     { size: [1, 1], cost: 30, kind: 'decor', decor: 1.2, group: 'gDecor' },
    plane:      { size: [1, 1], cost: 45, kind: 'decor', decor: 1.6, group: 'gDecor' },
    palm:       { size: [1, 1], cost: 60, kind: 'decor', decor: 1.8, group: 'gDecor', rank: 2 },
    hedge:      { size: [1, 1], cost: 12, kind: 'decor', decor: 0.6, group: 'gDecor' },
    herm:       { size: [1, 1], cost: 110, kind: 'decor', decor: 2, group: 'gDecor' },
    column:     { size: [1, 1], cost: 90, kind: 'decor', decor: 1.6, group: 'gDecor' },
    lamp:       { size: [1, 1], cost: 60, kind: 'decor', decor: 0.5, light: 2, group: 'gDecor' },
    pond:       { size: [2, 2], cost: 260, upkeep: 2, kind: 'decor', decor: 3.5, group: 'gDecor', rank: 2 },
    arch:       { size: [2, 1], cost: 900, kind: 'decor', decor: 5, group: 'gDecor', rank: 3, only: 'rome' },
    obelisk:    { size: [1, 1], cost: 700, kind: 'decor', decor: 4, group: 'gDecor', rank: 3, only: 'rome' },
    tripod:     { size: [1, 1], cost: 500, kind: 'decor', decor: 4, group: 'gDecor', rank: 3, only: 'greece' },
  };
  var STAFF = { carpenter: { hire: 80, wage: 35, tunic: '#6b5a3a', hair: '#3a2a1e' } };

  // ---------- names (Greek / Latin / English) and what visitors think on the way out ----------
  var B = {
    puppets: { g: 'νευρόσπαστα', l: 'neurospasta', e: 'puppet show' }, dancers: { g: 'χορός', l: 'chorus', e: 'dancing floor' },
    swings: { g: 'αἰῶραι', l: 'oscilla', e: 'swings' }, oracle: { g: 'μαντεῖον', l: 'sortilegus', e: 'fortune teller' },
    poetry: { g: 'ῥαψῳδοί', l: 'recitatio', e: 'rhapsode’s stage' }, pantomime: { g: 'παντόμιμος', l: 'pantomimus', e: 'pantomime stage' },
    maze: { g: 'λαβύρινθος', l: 'labyrinthus', e: 'hedge labyrinth' }, archery: { g: 'τοξεία', l: 'certamen sagittarum', e: 'archery contest' },
    menagerie: { g: 'θηρία', l: 'vivarium', e: 'menagerie' }, torchrace: { g: 'λαμπαδηδρομία', l: 'lampadedromia', e: 'torch-race track' },
    boatrace: { g: 'νεῶν ἅμιλλα', l: 'certamen navale', e: 'boat-race pond' }, bullleap: { g: 'ταυροκαθάψια', l: 'ludus taurorum', e: 'bull-leaping ring' },
    naumachia: { g: 'ναυμαχία', l: 'naumachia', e: 'mock sea battle' },
    olives: { g: 'ἐλαῖαι', l: 'olivae', e: 'olive stand' }, figs: { g: 'σῦκα', l: 'ficus', e: 'figs and honey' }, sausages: { g: 'ἀλλᾶντες', l: 'botuli', e: 'sausage grill' },
    fish: { g: 'ἰχθύες', l: 'pisces', e: 'fried fish' }, cakes: { g: 'πλακοῦντες', l: 'placentae', e: 'honey cakes' }, water: { g: 'ὑδροφόρος', l: 'aquarius', e: 'water seller' },
    kykeon: { g: 'κυκεών', l: 'posca', e: 'barley drink (Greece) / posca (Rome)' }, wreaths: { g: 'στέφανοι', l: 'coronae', e: 'wreath seller' },
    pottery: { g: 'κέραμος', l: 'fictilia', e: 'painted pottery' }, masks: { g: 'πρόσωπα', l: 'personae', e: 'theater masks' }, toys: { g: 'ἀστράγαλοι', l: 'tali', e: 'knucklebones and toys' },
    physician: { g: 'ἰατρός', l: 'medicus', e: 'physician' }, awning: { g: 'σκιάς', l: 'velum', e: 'shade awning' },
    laurel: { g: 'δάφνη', l: 'laurus', e: 'laurel' }, plane: { g: 'πλάτανος', l: 'platanus', e: 'plane tree' }, palm: { g: 'φοῖνιξ', l: 'palma', e: 'palm' },
    hedge: { g: 'φραγμός', l: 'saepes', e: 'hedge' }, herm: { g: 'ἑρμῆς', l: 'herma', e: 'herm' }, column: { g: 'κίων', l: 'columna', e: 'column' },
    lamp: { g: 'λυχνοῦχος', l: 'candelabrum', e: 'lamp stand' }, pond: { g: 'λίμνη', l: 'piscina', e: 'lily pond' },
    arch: { g: 'ἁψίς', l: 'arcus', e: 'triumphal arch' }, obelisk: { g: 'ὀβελίσκος', l: 'obeliscus', e: 'obelisk' }, tripod: { g: 'τρίπους', l: 'tripus', e: 'victory tripod' },
    carpenter: { g: 'τέκτων', l: 'faber', e: 'carpenter (fixes breakdowns)' },
  };
  var FUN = { g: 'Ὡς ἡδύ!', l: 'Quam iucundum!', e: '' }, FOOD = { g: 'Ἡδὺ τὸ βρῶμα.', l: 'Bene sapit.', e: '' }, BUY = { g: 'Καλὸν τὸ δῶρον.', l: 'Pulchrum donum.', e: '' }, REST = { g: 'Νῦν ἀναπαύομαι.', l: 'Nunc quiesco.', e: '' };
  var TH = {
    puppets: [FUN, 'The puppets were so funny!'], dancers: [FUN, 'I danced with the chorus!'], swings: [FUN, 'Higher! Higher!'], oracle: [FUN, 'The seer says I will be lucky.'],
    poetry: [FUN, 'The rhapsode sang of Achilles.'], pantomime: [FUN, 'Not a word spoken, and I cried!'], maze: [FUN, 'I found my way out of the labyrinth!'],
    archery: [FUN, 'Right in the middle of the target!'], menagerie: [FUN, 'I saw a real lion!'], torchrace: [FUN, 'The torch stayed lit all the way!'],
    boatrace: [FUN, 'The blue boat won by a nose.'], bullleap: [FUN, 'She somersaulted right over the bull!'], naumachia: [FUN, 'A sea battle in the middle of the city!'],
    olives: [FOOD, 'Lovely salty olives.'], figs: [FOOD, 'Figs with honey: perfect.'], sausages: [FOOD, 'What a sausage!'], fish: [FOOD, 'Fresh from the sea.'],
    cakes: [FOOD, 'Sweet honey cake.'], water: [FOOD, 'Cool water at last.'], kykeon: [FOOD, 'That barley drink hit the spot.'],
    wreaths: [BUY, 'A wreath like a champion’s!'], pottery: [BUY, 'A painted cup to take home.'], masks: [BUY, 'I bought a comic mask!'], toys: [BUY, 'New knucklebones for my sister.'],
    physician: [REST, 'The physician bandaged my blister.'], awning: [REST, 'Nice to sit in the shade.'],
  };
  Object.keys(B).forEach(function (k) { FV.B[k] = B[k]; });
  Object.keys(TH).forEach(function (k) { var t = TH[k][0]; FV.T[k] = { g: t.g, l: t.l, e: TH[k][1] }; });
  FV.T.broken = { g: 'Κατέαγε.', l: 'Fractum est.', e: 'It’s broken down!' };
  FV.RANKS.push({ g: 'ἀγωνοθέτης', l: 'censor', e: 'master of the games', v: 900, f: 80, need: '900 visitors in all and fame of 80' });

  // ---------- art ----------
  function ring(c, cx, cy, r, z, fill, stroke) { c.beginPath(); A.isoEllipse(c, cx, cy, z, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } }
  function dot(c, x, y, z, rx, ry, col) { var q = P(x, y, z); c.fillStyle = col; c.beginPath(); c.ellipse(q[0], q[1], rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  function pole(c, x, y, z0, z1, col, w) { var a = P(x, y, z0), b = P(x, y, z1); c.strokeStyle = col; c.lineWidth = w || 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  function fig(c, x, y, z, col, hair) { var q = P(x, y, z); A.person(c, q[0], q[1], col, hair); }
  function goods(list) { return function (c) { return function () { list.forEach(function (g) { dot(c, g[0], g[1], 16, g[2], g[3], g[4]); }); }; }; }
  function stallWith(items, vine, cloth) { return function (c, w, h, p) { A.stall(c, p, goods(items)(c), vine, cloth); }; }

  DRAW.puppets = function (c, w, h, p) {
    A.shadow(c, w, h, .3); A.mbox(c, .15, .2, .7, 1.6, 0, 26, p.wood);
    A.box(c, .14, .4, .02, 1.2, 14, 26, p.cloth[0], p.cloth[0], shade(p.cloth[0], -.2));
    poly(c, [P(.12, .2, 26), P(.12, 1.8, 26), P(.12, 1.8, 42), P(.12, .2, 42)], shade(p.accent2, .1));
    fig(c, .14, .8, 26, '#d9534f', '#222'); fig(c, .14, 1.2, 28, '#4a90d9', '#a0764a');
    poly(c, [P(.1, .15, 42), P(.9, .15, 42), P(.9, 1.85, 42), P(.1, 1.85, 42)], p.roof);
  };
  DRAW.dancers = function (c, w, h, p) {
    ring(c, 1, 1, .95, 0, p.stone, p.stoneD); ring(c, 1, 1, .78, 1, shade(p.stone, .15));
    for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2; fig(c, 1 + Math.cos(a) * .5, 1 + Math.sin(a) * .5, 1, k % 2 ? p.cloth[0] : '#e7d9b8', k % 2 ? '#222' : '#7a5530'); }
    A.column(c, 1, 1, 0, 30, p.marble, 2); dot(c, 1, 1, 33, 4, 4, p.accent2);
  };
  DRAW.swings = function (c, w, h, p) {
    A.shadow(c, w, h, .3); [[.15, .5], [1.85, .5]].forEach(function (q) { pole(c, q[0], q[1], 0, 44, p.wood, 3); });
    var a = P(.15, .5, 44), b = P(1.85, .5, 44); c.strokeStyle = p.wood; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    [.6, 1.35].forEach(function (x, k) { var t = P(x, .5, 44), s = P(x + .1, .5, 12); c.strokeStyle = '#6b5a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(t[0], t[1]); c.lineTo(s[0], s[1]); c.stroke(); c.fillStyle = p.wood; c.fillRect(s[0] - 5, s[1], 10, 2); fig(c, x + .1, .5, 12, k ? p.cloth[0] : '#e7d9b8'); });
  };
  DRAW.oracle = function (c, w, h, p) {
    A.shadow(c, w, h, .4); var b = P(1, 1, 0), t = P(1, 1, 58);
    c.fillStyle = '#5b3a7a'; c.beginPath(); c.moveTo(t[0], t[1]); c.lineTo(b[0] - 34, b[1] - 2); c.quadraticCurveTo(b[0], b[1] + 14, b[0] + 34, b[1] - 2); c.closePath(); c.fill();
    c.fillStyle = '#7a52a3'; c.beginPath(); c.moveTo(t[0], t[1]); c.lineTo(b[0], b[1] + 6); c.lineTo(b[0] + 34, b[1] - 2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(30,15,40,.85)'; c.beginPath(); c.moveTo(b[0] + 4, b[1] + 5); c.lineTo(b[0] + 16, b[1]); c.lineTo(t[0] + 6, t[1] + 34); c.closePath(); c.fill();
    dot(c, 1, 1, 60, 3, 3, p.accent2); for (var k = 0; k < 6; k++) { dot(c, .75 + k * .03, 1.55, 18 + k * 7, 4 + k, 3 + k * .5, 'rgba(220,220,230,' + (.5 - k * .07) + ')'); }
    pole(c, .75, 1.55, 0, 14, p.accent2, 2);
  };
  DRAW.poetry = function (c, w, h, p) {
    for (var k = 0; k <= 10; k++) { var a = Math.PI * (.5 + k / 10), x = 1 + Math.cos(a) * .8, y = 1 + Math.sin(a) * .8; A.mbox(c, x - .1, y - .1, .2, .2, 0, 10, p.marble); }
    A.mbox(c, .85, .85, .3, .3, 0, 6, p.stone); fig(c, 1, 1, 6, '#f3efe4', '#8a8a8a');
    var q = P(1.1, 1, 18); c.strokeStyle = p.accent2; c.lineWidth = 1.5; c.beginPath(); c.arc(q[0] + 4, q[1], 4, Math.PI, 0); c.stroke();
    fig(c, .45, 1.4, 10, p.cloth[0]); fig(c, .5, .6, 10, '#c9a24a');
  };
  DRAW.pantomime = function (c, w, h, p) {
    A.shadow(c, w, h, .3); A.mbox(c, .2, .2, 1.6, 1.6, 0, 12, p.stone);
    A.box(c, .2, .2, .15, 1.6, 12, 46, p.marble, shade(p.marble, -.1), shade(p.marble, -.2));
    poly(c, [P(.35, .3, 12), P(.35, 1.7, 12), P(.35, 1.7, 44), P(.35, .3, 44)], p.cloth[0]);
    for (var k = 0; k < 4; k++) poly(c, [P(.36, .35 + k * .35, 44), P(.36, .5 + k * .35, 44), P(.36, .42 + k * .35, 36)], p.accent2);
    fig(c, 1.1, 1, 12, '#f3efe4', '#222'); dot(c, .36, .7, 30, 5, 6, '#f3efe4'); dot(c, .36, 1.3, 30, 5, 6, '#f3efe4');
  };
  DRAW.maze = function (c, w, h, p) {
    var hed = p.leafD, H = 11;
    function wall(x, y, ww, hh) { A.box(c, x, y, ww, hh, 0, H, shade(hed, .15), shade(hed, -.05), shade(hed, -.2)); }
    c.fillStyle = p.sand; poly(c, [P(0, 0, 0), P(3, 0, 0), P(3, 3, 0), P(0, 3, 0)], p.path);
    wall(0, 0, 3, .15); wall(0, 0, .15, 1.2); wall(0, 1.6, .15, 1.4); wall(2.85, 0, .15, 3); wall(0, 2.85, 3, .15);
    wall(.6, .6, 1.8, .15); wall(.6, .6, .15, 1.6); wall(1.2, 1.2, 1.2, .15); wall(1.2, 1.8, .15, .8); wall(2.25, .6, .15, 1.4); wall(.6, 2.25, 1.1, .15);
    A.column(c, 1.5, 1.5, 0, 22, p.marble, 2); dot(c, 1.5, 1.5, 25, 3, 3, p.accent2);
  };
  DRAW.archery = function (c, w, h, p) {
    poly(c, [P(0, 0, 0), P(3, 0, 0), P(3, 2, 0), P(0, 2, 0)], p.sand);
    [.5, 1.5].forEach(function (y) { var q = P(2.7, y, 18); A.mbox(c, 2.55, y - .2, .3, .4, 0, 8, '#d9b85a');
      ['#f3efe4', '#c33', '#f3efe4', '#c33'].forEach(function (col, k) { c.fillStyle = col; c.beginPath(); c.ellipse(q[0], q[1], 9 - k * 2, 11 - k * 2.5, 0, 0, Math.PI * 2); c.fill(); }); });
    fig(c, .5, .5, 0, p.cloth[0]); fig(c, .5, 1.5, 0, '#e7d9b8');
    var a = P(.6, .5, 14), b = P(1.6, .55, 16); c.strokeStyle = '#3a2a1e'; c.lineWidth = 1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  };
  DRAW.menagerie = function (c, w, h, p) {
    poly(c, [P(0, 0, 0), P(3, 0, 0), P(3, 3, 0), P(0, 3, 0)], shade(p.grass ? p.grass[0] : '#93b061', -.05));
    A.tree(c, .7, .7, p, 'olive', 3); A.tree(c, 2.3, .6, p, 'cypress', 4);
    dot(c, 1.6, 1.8, 6, 12, 7, '#d9a63a'); dot(c, 2.05, 1.6, 10, 8, 8, '#a8641e'); dot(c, 2.1, 1.62, 11, 5, 5, '#d9a63a');
    dot(c, 1, 2.3, 8, 6, 4, '#2a6ac9'); for (var k = 0; k < 5; k++) dot(c, .82 + k * .05, 2.15, 14 + k, 3, 6, k % 2 ? '#1f8a6a' : '#2a6ac9');
    for (var i = 0; i <= 12; i++) { var t = i / 12; [[t * 3, 0], [3, t * 3], [t * 3, 3], [0, t * 3]].forEach(function (q) { pole(c, q[0], q[1], 0, 16, '#6b5a3a', 1.5); }); }
    [[0, 0, 3, 0], [3, 0, 3, 3], [0, 3, 3, 3], [0, 0, 0, 3]].forEach(function (s) { var a = P(s[0], s[1], 14), b = P(s[2], s[3], 14); c.strokeStyle = '#6b5a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); });
  };
  DRAW.torchrace = function (c, w, h, p) {
    poly(c, A.stadium(0, 0, w, h, .08, 0), p.stoneD); poly(c, A.stadium(0, 0, w, h, .25, 1), '#c99a5a'); poly(c, A.stadium(0, 0, w, h, .65, 1), shade(p.grass ? p.grass[1] : '#8ba95a', 0));
    for (var k = 0; k < 6; k++) { var x = .9 + k * .65; pole(c, x, .12, 0, 20, p.wood, 2); dot(c, x, .12, 23, 3, 5, '#ffb347'); dot(c, x, .12, 24, 1.5, 2.5, '#fff3b0'); }
    fig(c, 1.6, 1.75, 1, p.cloth[0]); dot(c, 1.64, 1.75, 22, 2.5, 4, '#ffb347'); fig(c, 2.3, 1.8, 1, '#e7d9b8');
  };
  DRAW.boatrace = function (c, w, h, p) {
    poly(c, [P(0, 0, 0), P(w, 0, 0), P(w, h, 0), P(0, h, 0)], p.stone);
    poly(c, [P(.25, .25, 1), P(w - .25, .25, 1), P(w - .25, h - .25, 1), P(.25, h - .25, 1)], p.water);
    c.strokeStyle = 'rgba(255,255,255,.35)'; for (var k = 0; k < 6; k++) { var a = P(.6 + k * .5, .8 + (k % 3) * .6, 1); c.beginPath(); c.moveTo(a[0] - 6, a[1]); c.lineTo(a[0] + 6, a[1] - 2); c.stroke(); }
    [[1, .8, '#c33'], [1.9, 1.5, p.cloth[0]], [2.7, 2.2, '#e0b83a']].forEach(function (b) { var q = P(b[0], b[1], 2); c.fillStyle = '#6b4422'; c.beginPath(); c.moveTo(q[0] - 14, q[1]); c.lineTo(q[0] + 14, q[1] - 6); c.lineTo(q[0] + 10, q[1] + 2); c.lineTo(q[0] - 10, q[1] + 6); c.fill(); c.fillStyle = b[2]; c.fillRect(q[0] - 1, q[1] - 20, 2, 18); poly(c, [[q[0] + 1, q[1] - 20], [q[0] + 10, q[1] - 12], [q[0] + 1, q[1] - 6]], b[2]); });
  };
  DRAW.bullleap = function (c, w, h, p) {
    ring(c, 1.5, 1.5, 1.45, 0, p.stoneD); ring(c, 1.5, 1.5, 1.25, 2, p.sand);
    for (var k = 0; k < 16; k++) { var a = k / 16 * Math.PI * 2; A.mbox(c, 1.5 + Math.cos(a) * 1.35 - .07, 1.5 + Math.sin(a) * 1.35 - .07, .14, .14, 0, 10, k % 2 ? '#b8342a' : p.marble); }
    dot(c, 1.5, 1.6, 10, 18, 9, '#3a2418'); dot(c, 1.95, 1.4, 13, 8, 7, '#3a2418'); var hq = P(2.05, 1.35, 20); c.strokeStyle = '#efe6cf'; c.lineWidth = 2; c.beginPath(); c.moveTo(hq[0] - 5, hq[1]); c.quadraticCurveTo(hq[0] - 8, hq[1] - 8, hq[0] - 2, hq[1] - 10); c.moveTo(hq[0] + 5, hq[1]); c.quadraticCurveTo(hq[0] + 8, hq[1] - 8, hq[0] + 3, hq[1] - 10); c.stroke();
    var j = P(1.5, 1.5, 34); c.save(); c.translate(j[0], j[1]); c.rotate(Math.PI); A.person(c, 0, 0, '#c33', '#222'); c.restore();
  };
  DRAW.naumachia = function (c, w, h, p) {
    A.box(c, 0, 0, w, h, 0, 6, p.stone, shade(p.stone, -.1), shade(p.stone, -.2));
    poly(c, [P(.35, .35, 6), P(w - .35, .35, 6), P(w - .35, h - .35, 6), P(.35, h - .35, 6)], shade(p.water, -.1));
    for (var k = 0; k < 9; k++) { var q = P(.8 + (k % 3) * 1.4, .9 + Math.floor(k / 3) * .9, 6); c.strokeStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(q[0] - 8, q[1]); c.lineTo(q[0] + 8, q[1] - 3); c.stroke(); }
    [[1.6, 1.5, p.cloth[0]], [3.3, 2.4, '#2f5f93']].forEach(function (b) { var q = P(b[0], b[1], 7); c.fillStyle = '#5a3b22'; c.beginPath(); c.moveTo(q[0] - 26, q[1]); c.lineTo(q[0] + 26, q[1] - 10); c.lineTo(q[0] + 20, q[1] + 4); c.lineTo(q[0] - 20, q[1] + 10); c.fill(); c.fillRect(q[0] - 1, q[1] - 34, 2, 32); poly(c, [[q[0] + 1, q[1] - 34], [q[0] + 18, q[1] - 26], [q[0] + 16, q[1] - 10], [q[0] + 1, q[1] - 14]], b[2]); for (var o = -18; o < 20; o += 6) { c.strokeStyle = '#3a2412'; c.beginPath(); c.moveTo(q[0] + o, q[1] + 2); c.lineTo(q[0] + o - 4, q[1] + 10); c.stroke(); } });
    for (var i = 0; i < 6; i++) A.column(c, .15 + i * (w - .3) / 5, .15, 6, 30, p.marble, 2);
  };
  DRAW.olives = stallWith([[.35, .5, 4, 3, '#556b2f'], [.55, .45, 4, 3, '#3a4a20'], [.5, .65, 4, 3, '#6b7f3a']]);
  DRAW.figs = stallWith([[.35, .5, 4, 4, '#6b3a5a'], [.55, .45, 4, 4, '#7a4a6a'], [.5, .65, 5, 3, '#e0a830']]);
  DRAW.sausages = function (c, w, h, p) { A.stall(c, p, function () { for (var k = 0; k < 4; k++) dot(c, .3 + k * .12, .5, 16, 5, 2, '#8a3a2a'); dot(c, .5, .65, 15, 6, 3, '#ff8a2a'); }, false, ['#7a3a2a', '#e7d9b8']); };
  DRAW.fish = stallWith([[.35, .5, 6, 2.5, '#9fb4c8'], [.55, .5, 6, 2.5, '#b8c8d8'], [.45, .65, 6, 2.5, '#8aa0b8']], false, ['#2f6f93', '#f3efe4']);
  DRAW.cakes = stallWith([[.35, .5, 5, 3, '#e0b070'], [.55, .45, 5, 3, '#d8a050'], [.5, .65, 5, 3, '#f0c880']], false, ['#c9a24a', '#f3efe4']);
  DRAW.water = function (c, w, h, p) { A.shadow(c, 1, 1, .3); dot(c, .5, .5, 0, 14, 7, p.stone); [[.4, .4], [.6, .55], [.45, .65]].forEach(function (q) { var b = P(q[0], q[1], 0); c.fillStyle = '#b8683f'; c.beginPath(); c.ellipse(b[0], b[1] - 9, 5, 9, 0, 0, Math.PI * 2); c.fill(); c.fillRect(b[0] - 1.5, b[1] - 21, 3, 4); }); fig(c, .7, .3, 0, '#2f6f93'); };
  DRAW.kykeon = stallWith([[.35, .5, 4, 6, '#c9a24a'], [.55, .45, 4, 6, '#b8683f'], [.5, .65, 4, 6, '#d8b878']], true);
  DRAW.wreaths = stallWith([[.35, .5, 6, 4, '#4d7a30'], [.55, .45, 6, 4, '#6f8a47'], [.5, .65, 6, 4, '#c9a24a']], false, ['#4d6630', '#f3efe4']);
  DRAW.pottery = stallWith([[.35, .5, 4, 6, '#c96a3a'], [.55, .45, 4, 6, '#1d1d1d'], [.5, .65, 4, 6, '#d9884a']]);
  DRAW.masks = stallWith([[.35, .5, 5, 6, '#f3efe4'], [.55, .45, 5, 6, '#f3efe4'], [.5, .65, 5, 6, '#e0b83a']], false, ['#5b3a7a', '#f3efe4']);
  DRAW.toys = stallWith([[.35, .5, 3, 3, '#f3efe4'], [.45, .55, 3, 3, '#e7d9b8'], [.6, .5, 5, 5, '#c33']], false, ['#c9a24a', '#2f5f93']);
  DRAW.physician = function (c, w, h, p) {
    A.shadow(c, w, h, .4); A.mbox(c, .2, .2, 1.6, 1.6, 0, 30, p.marble); A.hipRoof(c, .15, .15, 1.7, 1.7, 30, 16, p.roof);
    var q = P(1.8, 1, 20); c.strokeStyle = '#5a3b22'; c.lineWidth = 2; c.beginPath(); c.moveTo(q[0], q[1] + 6); c.lineTo(q[0], q[1] - 12); c.stroke();
    c.strokeStyle = '#3a7a3a'; c.lineWidth = 1.6; c.beginPath(); for (var k = 0; k < 4; k++) { c.moveTo(q[0] - 3, q[1] + 4 - k * 4); c.quadraticCurveTo(q[0] + 4, q[1] + 2 - k * 4, q[0] - 3, q[1] - k * 4); } c.stroke();
  };
  DRAW.awning = function (c, w, h, p) {
    [[.1, .1], [1.9, .1], [.1, .9], [1.9, .9]].forEach(function (q) { pole(c, q[0], q[1], 0, 30, p.wood, 2); });
    for (var k = 0; k < 6; k++) poly(c, [P(.1 + k * .3, .1, 30), P(.4 + k * .3, .1, 30), P(.4 + k * .3, .9, 28), P(.1 + k * .3, .9, 28)], k % 2 ? p.cloth[0] : p.cloth[1]);
    A.mbox(c, .3, .4, 1.4, .2, 0, 6, p.wood);
  };
  function treeDraw(kind) {
    return function (c, w, h, p, seed) {
      var b = P(.5, .5, 0), r = A.mulberry(seed || 9);
      c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(b[0] + 4, b[1] + 2, 16, 7, 0, 0, Math.PI * 2); c.fill();
      if (kind === 'palm') {
        c.strokeStyle = '#8a6a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(b[0], b[1]); c.quadraticCurveTo(b[0] + 8, b[1] - 30, b[0] + 4, b[1] - 56); c.stroke();
        for (var k = 0; k < 7; k++) { var a = k / 7 * Math.PI * 2; c.strokeStyle = k % 2 ? '#4d7a30' : '#3d6a28'; c.lineWidth = 4; c.beginPath(); c.moveTo(b[0] + 4, b[1] - 56); c.quadraticCurveTo(b[0] + 4 + Math.cos(a) * 14, b[1] - 66, b[0] + 4 + Math.cos(a) * 24, b[1] - 50 + Math.sin(a) * 8); c.stroke(); }
        return;
      }
      c.strokeStyle = shade(p.wood, kind === 'plane' ? .3 : 0); c.lineWidth = kind === 'plane' ? 5 : 3; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0], b[1] - 26); c.stroke();
      var n = kind === 'plane' ? 9 : 6, col = kind === 'plane' ? '#5f8a3a' : '#3f6a2e';
      for (var i = 0; i < n; i++) { var ox = (r() - .5) * (kind === 'plane' ? 40 : 22), oy = -28 - r() * (kind === 'plane' ? 26 : 30), rr = kind === 'plane' ? 10 + r() * 6 : 6 + r() * 4; c.fillStyle = i % 2 ? shade(col, -.12) : shade(col, .12); c.beginPath(); c.ellipse(b[0] + ox, b[1] + oy, rr, rr * .85, 0, 0, Math.PI * 2); c.fill(); }
    };
  }
  DRAW.laurel = treeDraw('laurel'); DRAW.plane = treeDraw('plane'); DRAW.palm = treeDraw('palm');
  DRAW.hedge = function (c, w, h, p) { A.box(c, .08, .08, .84, .84, 0, 14, shade(p.leafD, .15), shade(p.leafD, -.05), shade(p.leafD, -.2)); for (var k = 0; k < 5; k++) dot(c, .2 + k * .15, .3 + (k % 2) * .3, 14, 4, 3, shade(p.leaf, .1)); };
  DRAW.herm = function (c, w, h, p) { A.shadow(c, 1, 1, .2); A.mbox(c, .38, .38, .24, .24, 0, 34, p.marble); dot(c, .5, .5, 40, 6, 7, p.marble); dot(c, .5, .5, 37, 5, 4, '#bdb39a'); };
  DRAW.column = function (c, w, h, p) { A.shadow(c, 1, 1, .2); A.mbox(c, .3, .3, .4, .4, 0, 4, p.stone); A.column(c, .5, .5, 4, 52, p.marble, 4); A.mbox(c, .3, .3, .4, .4, 52, 56, p.marble); };
  DRAW.lamp = function (c, w, h, p) { pole(c, .5, .5, 0, 34, '#6b5a3a', 2); dot(c, .5, .5, 36, 5, 2, '#c9a24a'); dot(c, .5, .5, 39, 2.5, 3.5, '#ffb347'); dot(c, .5, .5, 40, 1.2, 1.8, '#fff3b0'); };
  DRAW.pond = function (c, w, h, p) { ring(c, 1, 1, .95, 0, p.stone); ring(c, 1, 1, .82, 1, p.water); [[.7, .8], [1.25, 1.2], [1, 1.35]].forEach(function (q) { dot(c, q[0], q[1], 1, 5, 2.5, '#4d8a3a'); dot(c, q[0], q[1], 2, 2, 1.5, '#f6c3d9'); }); };
  DRAW.arch = function (c, w, h, p) { A.shadow(c, w, h, .3); A.mbox(c, .1, .2, .5, .6, 0, 50, p.marble); A.mbox(c, 1.4, .2, .5, .6, 0, 50, p.marble); A.mbox(c, .1, .2, 1.8, .6, 50, 66, p.marble); poly(c, [P(.6, .8, 30), P(1.4, .8, 30), P(1.4, .8, 50), P(.6, .8, 50)], shade(p.marble, -.05)); var q = P(1, .8, 58); c.fillStyle = p.accent2; c.fillRect(q[0] - 14, q[1] - 3, 28, 5); };
  DRAW.obelisk = function (c, w, h, p) { A.shadow(c, 1, 1, .2); A.mbox(c, .25, .25, .5, .5, 0, 8, p.stone); var a = P(.4, .6, 8), b = P(.6, .6, 8), t = P(.5, .5, 78); poly(c, [a, b, t], '#c9b48a'); poly(c, [b, P(.6, .4, 8), t], '#a8936a'); dot(c, .5, .5, 78, 2, 2, p.accent2); };
  DRAW.tripod = function (c, w, h, p) { A.shadow(c, 1, 1, .2); A.mbox(c, .25, .25, .5, .5, 0, 14, p.marble); [[.35, .4], [.65, .4], [.5, .65]].forEach(function (q) { pole(c, q[0], q[1], 14, 40, '#b8862a', 2); }); dot(c, .5, .5, 42, 10, 5, '#c9962a'); dot(c, .5, .5, 43, 7, 3, '#e8c060'); };
  ['laurel', 'plane', 'palm', 'hedge', 'herm', 'column', 'lamp', 'pond', 'arch', 'obelisk', 'tripod'].forEach(function (k) { A.NODOOR[k] = 1; });

  // ---------- scenarios: 17 more for 22 in all ----------
  function cnt(t, n) { return function (s) { return (s.count[t] || 0) >= n; }; }
  function sum(types, n) { return function (s) { return types.reduce(function (a, t) { return a + (s.count[t] || 0); }, 0) >= n; }; }
  var MORE = [
    { id: 'anthesteria', setting: 'greece', icon: '🍷', e: 'The Anthesteria', coins: 4000, days: 6, m0: 6, unlock: ['swings', 'kykeon'],
      blurb: 'Early spring: new wine is opened, children get little jugs, and girls ride swings in memory of Erigone.',
      goals: [{ e: 'Build 2 working swings', test: cnt('swings', 2) }, { e: 'Build 3 drink stalls of any kind', test: sum(['tavern', 'fountain', 'water', 'kykeon'], 3) }, { e: 'Welcome 90 visitors', test: function (s) { return s.totalVisitors >= 90; } }] },
    { id: 'pythian', setting: 'greece', icon: '🎶', e: 'The Pythian Games', coins: 5500, days: 7, m0: 11, unlock: ['poetry', 'stadium', 'tripod'],
      blurb: 'At Delphi, Apollo’s games crown singers and lyre players before athletes. Win them a laurel.',
      goals: [{ e: 'Build a music hall and a rhapsode’s stage', test: function (s) { return s.count.odeum >= 1 && s.count.poetry >= 1; } }, { e: 'Welcome 120 visitors on festival days', test: function (s) { return s.festVisitors >= 120; } }, { e: 'Reach fame 75', test: function (s) { return s.fame >= 75; } }] },
    { id: 'thesmophoria', setting: 'greece', icon: '🌾', e: 'Harvest of Demeter', coins: 3200, days: 6, m0: 3, unlock: ['figs', 'cakes', 'olives'],
      blurb: 'Autumn sowing time. A small budget, hungry crowds: feed them well and cheaply.',
      goals: [{ e: 'Build 5 food stalls', test: sum(['bakery', 'olives', 'figs', 'sausages', 'fish', 'cakes'], 5) }, { e: 'Earn 1,200 coins from stalls', test: function (s) { return s.shopSales >= 1200; } }, { e: 'Average happiness of 72 (with 15+ visitors)', test: function (s) { return s.visitors >= 15 && s.avgHappy >= 72; } }] },
    { id: 'isthmian', setting: 'greece', icon: '🌊', e: 'The Isthmian Games', coins: 7000, days: 8, m0: 9, unlock: ['boatrace', 'fish', 'stadium'],
      blurb: 'Poseidon’s games at Corinth, by the sea. Race boats as well as runners.',
      goals: [{ e: 'Build a working boat-race pond', test: cnt('boatrace', 1) }, { e: 'Build a running track', test: cnt('stadium', 1) }, { e: 'Welcome 200 visitors', test: function (s) { return s.totalVisitors >= 200; } }] },
    { id: 'labyrinth', setting: 'greece', icon: '🌀', e: 'The Labyrinth of Knossos', coins: 6500, days: 8, m0: 2, unlock: ['maze', 'bullleap'],
      blurb: 'On Crete, they remember Daedalus and the bull-leapers. Build a hedge labyrinth and a bull-leaping ring.',
      goals: [{ e: 'Build a working hedge labyrinth', test: cnt('maze', 1) }, { e: 'Build a working bull-leaping ring', test: cnt('bullleap', 1) }, { e: 'Have 9,000 coins', test: function (s) { return s.coins >= 9000; } }] },
    { id: 'torches', setting: 'greece', icon: '🔥', e: 'Torches for Prometheus', coins: 5000, days: 6, m0: 3, unlock: ['torchrace', 'lamp'],
      blurb: 'Night races with torches honour the Titan who stole fire. Light the paths so no one is left in the dark.',
      goals: [{ e: 'Build a working torch-race track', test: cnt('torchrace', 1) }, { e: 'Place 10 torches or lamp stands', test: sum(['torch', 'lamp'], 10) }, { e: 'Reach fame 70', test: function (s) { return s.fame >= 70; } }] },
    { id: 'marathon', setting: 'greece', icon: '🏃', e: 'Heroes of Marathon', coins: 2500, days: 9, m0: 2,
      blurb: 'A tiny purse and a long road. Start small, grow carefully, and finish rich.',
      goals: [{ e: 'Welcome 250 visitors', test: function (s) { return s.totalVisitors >= 250; } }, { e: 'Have 6,000 coins', test: function (s) { return s.coins >= 6000; } }, { e: 'Reach the rank of magistrate', test: function (s) { return s.rank >= 3; } }] },
    { id: 'delos', setting: 'greece', icon: '🏝️', e: 'The Island of Delos', coins: 6000, days: 7, m0: 10, unlock: ['dancers', 'palm', 'pond'],
      blurb: 'Apollo’s birthplace. Choruses of young dancers come from every island. Make it the prettiest festival in Greece.',
      goals: [{ e: 'Build 2 working dancing floors', test: cnt('dancers', 2) }, { e: 'Place 25 pieces of scenery', test: function (s) { return s.decor >= 25; } }, { e: 'Average happiness of 80 (with 20+ visitors)', test: function (s) { return s.visitors >= 20 && s.avgHappy >= 80; } }] },
    { id: 'asclepius', setting: 'greece', icon: '⚕️', e: 'Festival of Asclepius', coins: 5000, days: 6, m0: 7, unlock: ['physician', 'baths'],
      blurb: 'Pilgrims come to the healing god at Epidaurus. Look after them: rest, baths and a physician.',
      goals: [{ e: 'Build a physician and baths', test: function (s) { return s.count.physician >= 1 && s.count.baths >= 1; } }, { e: 'Build 4 benches, stoas or awnings', test: sum(['bench', 'stoa', 'awning'], 4) }, { e: 'Average happiness of 78 (with 20+ visitors)', test: function (s) { return s.visitors >= 20 && s.avgHappy >= 78; } }] },
    { id: 'megalesia', setting: 'rome', icon: '🦁', e: 'The Megalesian Games', coins: 6000, days: 6, m0: 3, unlock: ['menagerie', 'pantomime'],
      blurb: 'April games for the Great Mother, Cybele: plays, music, and a procession with lions.',
      goals: [{ e: 'Build a working menagerie', test: cnt('menagerie', 1) }, { e: 'Build a pantomime stage and a theater', test: function (s) { return s.count.pantomime >= 1 && s.count.theater >= 1; } }, { e: 'Welcome 110 visitors on festival days', test: function (s) { return s.festVisitors >= 110; } }] },
    { id: 'floralia', setting: 'rome', icon: '🌸', e: 'The Floralia', coins: 4500, days: 6, m0: 3, unlock: ['wreaths', 'flowers'],
      blurb: 'Flora’s festival at the end of April: flowers everywhere, bright clothes, and wreaths on every head.',
      goals: [{ e: 'Plant 20 flower beds', test: cnt('flowers', 20) }, { e: 'Build 2 wreath sellers', test: cnt('wreaths', 2) }, { e: 'Reach fame 72', test: function (s) { return s.fame >= 72; } }] },
    { id: 'apollinares', setting: 'rome', icon: '🏹', e: 'The Apollinarian Games', coins: 6000, days: 7, m0: 6, unlock: ['archery', 'masks'],
      blurb: 'July games for Apollo, first held when Hannibal threatened Rome. Plays, archery and masks.',
      goals: [{ e: 'Build an archery contest', test: cnt('archery', 1) }, { e: 'Build 2 theaters', test: cnt('theater', 2) }, { e: 'Earn 2,000 coins from shops and stalls', test: function (s) { return s.shopSales >= 2000; } }] },
    { id: 'consualia', setting: 'rome', icon: '🐎', e: 'The Consualia', coins: 7500, days: 8, m0: 7, unlock: ['hippodrome'],
      blurb: 'Harvest games for Consus, whose altar was buried in the Circus Maximus. Horses and mules wear flower crowns.',
      goals: [{ e: 'Build 2 working circuses', test: cnt('hippodrome', 2) }, { e: 'Welcome 300 visitors', test: function (s) { return s.totalVisitors >= 300; } }, { e: 'Have 10,000 coins', test: function (s) { return s.coins >= 10000; } }] },
    { id: 'naumachia', setting: 'rome', icon: '⚓', e: 'Caesar’s Sea Battle', coins: 12000, days: 9, m0: 8, unlock: ['naumachia', 'arch', 'obelisk'],
      blurb: 'In 46 BC Julius Caesar dug a lake beside the Tiber and staged a battle between real ships. Outdo him.',
      goals: [{ e: 'Build a working mock sea battle', test: cnt('naumachia', 1) }, { e: 'Build a triumphal arch', test: cnt('arch', 1) }, { e: 'Welcome 400 visitors', test: function (s) { return s.totalVisitors >= 400; } }] },
    { id: 'lupercalia', setting: 'rome', icon: '🐺', e: 'The Lupercalia', coins: 3500, days: 5, m0: 1, unlock: ['sausages', 'toys'],
      blurb: 'Mid-February, at the cave where the she-wolf nursed Romulus and Remus. Cold, busy and short.',
      goals: [{ e: 'Welcome 100 visitors', test: function (s) { return s.totalVisitors >= 100; } }, { e: 'Build 3 places to rest', test: sum(['bench', 'stoa', 'awning', 'inn', 'baths'], 3) }, { e: 'Average happiness of 70 (with 15+ visitors)', test: function (s) { return s.visitors >= 15 && s.avgHappy >= 70; } }] },
    { id: 'aqueducts', setting: 'rome', icon: '💧', e: 'Water for the People', coins: 8000, days: 7, m0: 5, unlock: ['aqueduct', 'water', 'pond'],
      blurb: 'A dry summer. Bring water in by aqueduct and keep every visitor’s cup full.',
      goals: [{ e: 'Build 2 aqueducts', test: cnt('aqueduct', 2) }, { e: 'Build 6 drink stalls or fountains', test: sum(['tavern', 'fountain', 'water', 'kykeon'], 6) }, { e: 'Average happiness of 78 (with 20+ visitors)', test: function (s) { return s.visitors >= 20 && s.avgHappy >= 78; } }] },
    { id: 'master', setting: 'rome', icon: '👑', e: 'Master of the Games', coins: 5000, days: 12, m0: 0,
      blurb: 'The final challenge: twelve months, a modest purse, and the whole city watching.',
      goals: [{ e: 'Reach the rank of master of the games', test: function (s) { return s.rank >= 5; } }, { e: 'Earn 25,000 coins in all', test: function (s) { return s.income >= 25000; } }, { e: 'Have 12 working attractions', test: function (s) { return s.shows >= 12; } }] },
  ];
  MORE.forEach(function (q) { FD.SCEN.push(q); });

  W.FestMore = { DEF: DEF, STAFF: STAFF };
})(window);
