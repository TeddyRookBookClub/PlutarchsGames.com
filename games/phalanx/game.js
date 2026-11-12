/* Phalanx: turn-based tactics on seven real battles of antiquity.
   Units face a direction; attacks on the flank or rear hurt far more. Hoplites in an unbroken line hold better,
   cavalry charge, archers shoot, elephants frighten horses, and the Macedonian phalanx falls apart on rough ground. */
(function () {
  'use strict';
  var $ = Kit.$, esc = Kit.esc;
  Kit.bar('Phalanx', [['b-battles', '⚔️', 'Battles'], ['b-help', '?', 'How to play']]);
  var main = document.createElement('main'); main.className = 'ph'; document.body.appendChild(main);
  main.innerHTML = '<div class="ph-stage"><canvas id="cv"></canvas><div class="ph-banner" id="banner"></div></div><aside class="ph-side card" id="side"></aside>';
  var cv = $('#cv'), ctx = cv.getContext('2d');

  /* ---------- units ---------- */
  // atk, def, mv, rng (0 = melee), ratk, flags: heavy (shield wall), pike (front only), cav, light, chariot, ele, rough (no penalty on rough ground)
  var U = {
    hoplite: { n: 'Hoplites', i: '🛡️', atk: 10, def: 12, mv: 2, mor: 90, heavy: 1, d: 'Citizen spearmen with big round shields. Strong in a line; slow to turn.' },
    spartan: { n: 'Spartiates', i: '🛡️', atk: 13, def: 14, mv: 2, mor: 130, heavy: 1, d: 'Professional soldiers trained since boyhood. They do not retreat.' },
    sacred: { n: 'Sacred Band', i: '🛡️', atk: 14, def: 13, mv: 2, mor: 130, heavy: 1, d: '150 pairs of lovers, the elite of Thebes.' },
    sarissa: { n: 'Pike phalanx', i: '🔱', atk: 12, def: 17, mv: 2, mor: 100, heavy: 1, pike: 1, d: 'Six-metre sarissas: a hedge of points in front, helpless on the flanks or on rough ground.' },
    hypaspist: { n: 'Hypaspists', i: '🛡️', atk: 12, def: 12, mv: 3, mor: 110, heavy: 1, d: 'The shield-bearers, Alexander’s elite infantry, quicker than the phalanx.' },
    peltast: { n: 'Peltasts', i: '🗡️', atk: 6, def: 5, mv: 3, rng: 2, ratk: 6, mor: 70, light: 1, rough: 1, d: 'Javelin-throwers with light wicker shields.' },
    archer: { n: 'Archers', i: '🏹', atk: 3, def: 4, mv: 2, rng: 4, ratk: 7, mor: 60, light: 1, d: 'Shoot at long range. Do not let them be caught in melee.' },
    slinger: { n: 'Slingers', i: '🎯', atk: 3, def: 4, mv: 3, rng: 3, ratk: 6, mor: 60, light: 1, rough: 1, d: 'Lead shot from Rhodes or the Balearic Isles.' },
    lightcav: { n: 'Light horse', i: '🐎', atk: 7, def: 5, mv: 5, rng: 2, ratk: 4, mor: 70, cav: 1, d: 'Fast javelin-horsemen. Harass and ride away.' },
    companion: { n: 'Companions', i: '🐎', atk: 14, def: 9, mv: 4, mor: 120, cav: 1, d: 'Macedonian heavy cavalry. Charge into a flank and the battle is won.' },
    cav: { n: 'Cavalry', i: '🐎', atk: 10, def: 7, mv: 4, mor: 90, cav: 1, d: 'Horsemen with spears. Charge for a bonus.' },
    immortal: { n: 'Immortals', i: '🏹', atk: 9, def: 9, mv: 2, rng: 3, ratk: 5, mor: 110, d: 'The king’s guard of 10,000, always kept at full strength. Bow and spear behind wicker shields.' },
    levy: { n: 'Levy', i: '⚔️', atk: 6, def: 6, mv: 2, mor: 60, d: 'Infantry from the far ends of the empire, lightly armed.' },
    chariot: { n: 'Scythed chariots', i: '🛞', atk: 17, def: 4, mv: 5, mor: 70, cav: 1, chariot: 1, d: 'Blades on the wheels. Terrifying once; then they are spent.' },
    elephant: { n: 'Elephants', i: '🐘', atk: 15, def: 11, mv: 3, mor: 70, ele: 1, d: 'Horses will not face them. Wounded, they may trample their own side.' },
    legion: { n: 'Legionaries', i: '⚔️', atk: 11, def: 11, mv: 2, rng: 1, ratk: 4, mor: 100, rough: 1, d: 'Roman maniples: pilum and short sword, flexible on any ground.' },
    triarii: { n: 'Triarii', i: '🛡️', atk: 10, def: 14, mv: 2, mor: 120, heavy: 1, rough: 1, d: 'Veteran spearmen of the third line.' },
    gaul: { n: 'Gauls & Iberians', i: '⚔️', atk: 11, def: 7, mv: 2, mor: 80, rough: 1, d: 'Fierce swordsmen, quick to charge and quick to tire.' },
    african: { n: 'African veterans', i: '🛡️', atk: 12, def: 12, mv: 2, mor: 120, heavy: 1, d: 'Hannibal’s best infantry, wearing captured Roman armour.' },
    numidian: { n: 'Numidian horse', i: '🐎', atk: 8, def: 5, mv: 6, rng: 2, ratk: 4, mor: 80, cav: 1, d: 'Riders without bridles who never stand still.' }
  };
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  var TER = {
    '.': { n: 'Open ground', c: 1 }, h: { n: 'Hill', c: 2, def: 1.25, rough: 1 }, f: { n: 'Woods', c: 2, def: 1.2, rough: 1, cav: .6 }, m: { n: 'Marsh', c: 3, def: .85, rough: 1, cav: .5 },
    w: { n: 'Sea', c: 99 }, M: { n: 'Mountain', c: 99 }, r: { n: 'River', c: 99 }, d: { n: 'Ford', c: 3, def: .8, rough: 1 }, s: { n: 'Beach', c: 1 }, x: { n: 'Old wall', c: 1, def: 1.35 }
  };

  /* ---------- battles ---------- */
  // map rows (top = enemy side). units: [type, x, y, facing, side, label?, hp?]  side 0 = player
  var BATTLES = [
    { id: 'marathon', n: 'Marathon', y: '490 BC', me: 'Athenians and Plataeans', foe: 'Persians', cols: ['#2a5ec9', '#c7a428'], turns: 14, goal: 0.6,
      intro: 'The Persians have landed at Marathon, 40 km from Athens. Miltiades has thinned the Athenian centre to make the line as long as the Persian one, and packed the wings deep. The Persian cavalry is away. Strike now.',
      after: 'The Athenian wings won and turned inward on the Persian centre. Herodotus counts 6,400 Persian dead to 192 Athenians, who were buried in the mound that still stands on the plain. The story of a runner carrying the news to Athens comes much later.',
      map: ['wwwwwwwwwwwwwwww', 'ssssssssssssssss', 'mm..............', 'mm..............', 'mm..............', 'm...............', '...............h', '..............hh', '.............hhh', '............hhhh'],
      u: [['hoplite', 4, 7, 0, 0], ['hoplite', 5, 7, 0, 0, 'Plataeans'], ['hoplite', 6, 7, 0, 0, 'Centre', 60], ['hoplite', 7, 7, 0, 0, 'Centre', 60], ['hoplite', 8, 7, 0, 0, 'Centre', 60], ['hoplite', 9, 7, 0, 0, 'Miltiades', 100, 1], ['hoplite', 10, 7, 0, 0], ['hoplite', 11, 7, 0, 0], ['hoplite', 4, 8, 0, 0], ['hoplite', 11, 8, 0, 0], ['archer', 7, 8, 0, 0, 'Slaves and archers', 50],
        ['levy', 4, 3, 2, 1, 'Saka'], ['levy', 5, 3, 2, 1], ['immortal', 6, 3, 2, 1], ['immortal', 7, 3, 2, 1, 'Datis', 100, 1], ['immortal', 8, 3, 2, 1], ['immortal', 9, 3, 2, 1], ['levy', 10, 3, 2, 1], ['levy', 11, 3, 2, 1], ['archer', 6, 2, 2, 1], ['archer', 8, 2, 2, 1], ['archer', 10, 2, 2, 1]] },
    { id: 'thermopylae', n: 'Thermopylae', y: '480 BC', me: 'Leonidas and the Greeks', foe: 'Xerxes', cols: ['#b8342a', '#c7a428'], turns: 12, hold: 1,
      intro: 'King Leonidas holds the narrow pass of the Hot Gates with 300 Spartans and a few thousand allies, behind an old Phocian wall. Xerxes’ army must come through here. Hold the pass for twelve turns. Beware: there is a mountain path behind you.',
      after: 'For two days the Greeks held. On the third, a local man, Ephialtes, showed the Persians the Anopaea path over the mountain. Leonidas sent most of the allies away and stayed with the Spartans, Thespians and Thebans. “Go tell the Spartans, stranger passing by, that here, obedient to their laws, we lie.”',
      map: ['MMMMMMMMMMMMMMMM', 'MMMMMMMMMMMMMMMM', 'MMMMMMMMMhhhMMMM', '..MMMMMM....MMM.', '....x...........', '....x...........', '....x...........', 'sssssssssMssssss', 'wwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwww'],
      u: [['spartan', 5, 4, 1, 0, 'Leonidas', 100, 1], ['spartan', 5, 5, 1, 0, 'The 300'], ['hoplite', 5, 6, 1, 0, 'Thespians'], ['hoplite', 3, 5, 1, 0, 'Thebans'], ['hoplite', 3, 4, 1, 0, 'Arcadians'], ['hoplite', 3, 6, 1, 0, 'Corinthians'], ['slinger', 2, 5, 1, 0, 'Helots', 60],
        ['levy', 12, 4, 3, 1, 'Medes'], ['levy', 12, 5, 3, 1, 'Medes'], ['levy', 12, 6, 3, 1, 'Kissians'], ['archer', 14, 5, 3, 1], ['levy', 14, 4, 3, 1, 'Xerxes', 100, 1]],
      waves: { 3: [['levy', 15, 4], ['levy', 15, 5], ['levy', 15, 6]], 5: [['immortal', 15, 4], ['immortal', 15, 5], ['immortal', 15, 6]], 7: [['immortal', 0, 3, 'Hydarnes'], ['immortal', 0, 4]], 8: [['levy', 15, 5], ['levy', 15, 6], ['archer', 15, 4]], 10: [['immortal', 15, 4], ['levy', 15, 5], ['levy', 15, 6]] } },
    { id: 'leuctra', n: 'Leuctra', y: '371 BC', me: 'Epaminondas of Thebes', foe: 'Sparta', cols: ['#2a5ec9', '#b8342a'], turns: 12, goal: 0.5, king: 1,
      intro: 'Sparta has never lost a pitched battle on equal terms. Epaminondas tries something new: his left wing is fifty shields deep, led by the Sacred Band, and his weak right is held back. Smash the Spartan right where King Cleombrotus stands. Kill or rout the king and Sparta breaks.',
      after: 'The deep Theban column broke the Spartan right, and Cleombrotus was killed: the first Spartan king to fall in battle since Leonidas. Of 700 Spartiates present, 400 died. Spartan power never recovered.',
      map: ['.......hhh......', '................', '................', '................', '................', '................', '................', '................', '.f..............', 'ff..............'],
      u: [['sacred', 3, 6, 0, 0, 'Pelopidas'], ['hoplite', 3, 7, 0, 0, 'Thebans'], ['hoplite', 4, 6, 0, 0, 'Thebans'], ['hoplite', 4, 7, 0, 0, 'Epaminondas', 100, 1], ['hoplite', 6, 7, 0, 0, 'Boeotians', 70], ['hoplite', 8, 8, 0, 0, 'Boeotians', 70], ['hoplite', 10, 8, 0, 0, 'Boeotians', 70], ['cav', 3, 5, 0, 0, 'Theban horse'], ['peltast', 12, 8, 0, 0],
        ['spartan', 3, 2, 2, 1, 'Cleombrotus', 100, 1], ['spartan', 4, 2, 2, 1], ['hoplite', 2, 2, 2, 1, 'Spartan allies'], ['hoplite', 6, 2, 2, 1, 'Allies'], ['hoplite', 8, 2, 2, 1, 'Allies'], ['hoplite', 10, 2, 2, 1, 'Allies'], ['hoplite', 12, 2, 2, 1, 'Allies'], ['cav', 4, 3, 2, 1, 'Spartan horse', 70]] },
    { id: 'gaugamela', n: 'Gaugamela', y: '331 BC', me: 'Alexander', foe: 'Darius III', cols: ['#7a3fa0', '#c7a428'], turns: 14, goal: 0.45, king: 1,
      intro: 'Darius has chosen a wide plain and levelled it for his scythed chariots. His army is far larger than yours. Alexander leads the Companions on the right, edging along the line until a gap opens. Find the gap and ride for Darius.',
      after: 'Alexander drove the Companions into the gap that opened in the Persian line, straight at Darius, who fled. The empire of the Persians was finished. Darius was murdered by his own satraps the next year.',
      map: ['................', '................', '................', '................', '................', '................', '................', '................', '................', '.........hh.....'],
      u: [['cav', 2, 7, 0, 0, 'Thessalians (Parmenion)'], ['sarissa', 4, 7, 0, 0], ['sarissa', 5, 7, 0, 0], ['sarissa', 6, 7, 0, 0], ['sarissa', 7, 7, 0, 0], ['hypaspist', 8, 7, 0, 0], ['hypaspist', 9, 7, 0, 0], ['companion', 11, 7, 0, 0, 'Alexander', 100, 1], ['companion', 12, 7, 0, 0, 'Companions'], ['peltast', 13, 7, 0, 0, 'Agrianians'], ['archer', 7, 8, 0, 0, 'Cretan archers'],
        ['chariot', 5, 4, 2, 1], ['chariot', 7, 4, 2, 1], ['chariot', 9, 4, 2, 1], ['chariot', 11, 4, 2, 1], ['levy', 3, 2, 2, 1], ['levy', 4, 2, 2, 1], ['levy', 5, 2, 2, 1], ['immortal', 7, 2, 2, 1], ['immortal', 8, 1, 2, 1, 'Darius', 100, 1], ['immortal', 9, 2, 2, 1], ['levy', 10, 2, 2, 1], ['levy', 11, 2, 2, 1], ['elephant', 6, 3, 2, 1], ['cav', 13, 2, 2, 1, 'Bactrians'], ['cav', 14, 3, 2, 1, 'Scythians'], ['cav', 1, 2, 2, 1, 'Mazaeus'], ['cav', 2, 3, 2, 1]] },
    { id: 'hydaspes', n: 'The Hydaspes', y: '326 BC', me: 'Alexander', foe: 'King Porus', cols: ['#7a3fa0', '#2d7a3e'], turns: 14, goal: 0.5,
      intro: 'In India, King Porus waits across the Hydaspes river with war elephants. On a stormy night Alexander crossed upstream. Now his army is over the river. The elephants terrify horses: hit them with infantry and missiles, and use the cavalry on the flanks.',
      after: 'Hemmed in, the wounded elephants trampled their own side. Porus fought on until he was badly wounded. Asked how he wished to be treated, he answered “like a king”, and Alexander gave him back his kingdom.',
      map: ['r.......ff......', 'r...............', 'rr..............', '.r..............', '.r..............', '.rr.............', '..r.............', '..rd............', '...r............', '...r............'],
      u: [['companion', 12, 7, 0, 0, 'Alexander', 100, 1], ['companion', 13, 7, 0, 0], ['sarissa', 6, 7, 0, 0], ['sarissa', 7, 7, 0, 0], ['sarissa', 8, 7, 0, 0], ['hypaspist', 9, 7, 0, 0], ['hypaspist', 10, 7, 0, 0], ['archer', 8, 8, 0, 0, 'Horse archers'], ['peltast', 5, 8, 0, 0, 'Agrianians'], ['cav', 4, 7, 0, 0, 'Coenus'],
        ['elephant', 5, 3, 2, 1], ['elephant', 7, 3, 2, 1], ['elephant', 9, 3, 2, 1], ['elephant', 11, 3, 2, 1], ['levy', 5, 2, 2, 1], ['levy', 7, 2, 2, 1], ['levy', 9, 2, 2, 1, 'Porus', 100, 1], ['levy', 11, 2, 2, 1], ['archer', 8, 1, 2, 1], ['chariot', 13, 2, 2, 1], ['cav', 14, 2, 2, 1], ['cav', 3, 2, 2, 1]] },
    { id: 'cannae', n: 'Cannae', y: '216 BC', me: 'Hannibal', foe: 'Rome', cols: ['#a8761c', '#b8342a'], turns: 14, goal: 0.7,
      intro: 'Eight Roman legions, the largest army Rome has ever sent out, face you on the plain by the river Aufidus. Your centre of Gauls and Iberians bows out toward them and will give way. Let it. Your African veterans wait on both wings, and your cavalry must beat theirs and close the trap from behind.',
      after: 'The Roman mass pushed into the bending centre until the Africans turned inward and Hasdrubal’s cavalry closed the ring from behind. Perhaps 50,000 Romans died in a single afternoon. The double envelopment at Cannae is still studied in military schools.',
      map: ['r...............', 'r...............', 'r...............', 'r...............', 'r...............', 'r...............', 'r...............', 'r...............', 'r...............', 'r...............'],
      u: [['cav', 2, 7, 0, 0, 'Hasdrubal'], ['cav', 2, 8, 0, 0, 'Iberian horse'], ['african', 4, 7, 0, 0], ['african', 4, 8, 0, 0], ['gaul', 5, 6, 0, 0], ['gaul', 6, 5, 0, 0], ['gaul', 7, 5, 0, 0, 'Hannibal', 100, 1], ['gaul', 8, 5, 0, 0], ['gaul', 9, 5, 0, 0], ['gaul', 10, 6, 0, 0], ['african', 11, 7, 0, 0], ['african', 11, 8, 0, 0], ['numidian', 13, 7, 0, 0], ['numidian', 14, 8, 0, 0], ['slinger', 7, 7, 0, 0, 'Balearics'],
        ['cav', 2, 2, 2, 1, 'Roman horse', 80], ['legion', 4, 2, 2, 1], ['legion', 5, 2, 2, 1], ['legion', 6, 2, 2, 1], ['legion', 7, 2, 2, 1, 'Paullus', 100, 1], ['legion', 8, 2, 2, 1], ['legion', 9, 2, 2, 1], ['legion', 10, 2, 2, 1], ['legion', 6, 1, 2, 1], ['legion', 7, 1, 2, 1], ['legion', 8, 1, 2, 1], ['peltast', 7, 3, 2, 1, 'Velites'], ['cav', 12, 2, 2, 1, 'Allied horse', 80]] },
    { id: 'pydna', n: 'Pydna', y: '168 BC', me: 'Aemilius Paullus', foe: 'Perseus of Macedon', cols: ['#b8342a', '#7a3fa0'], turns: 14, goal: 0.5,
      intro: 'The Macedonian phalanx is coming at you, a wall of pikes nobody can face head-on. Paullus later said it was the most frightening sight of his life. But the ground ahead is broken. Fall back to the hills and let the phalanx break up on the rough ground, then send maniples into the gaps.',
      after: 'As the phalanx advanced over uneven ground, gaps opened in it. Roman maniples pushed into the gaps and the pikemen, unable to turn, were cut down. Perseus fled. Macedon became a Roman province twenty years later.',
      map: ['................', '................', '................', '.....hh..f......', '....hhh.ff.hh...', '...hh..fff.hh...', '....h.....hhh...', '................', '................', '................'],
      u: [['legion', 4, 8, 0, 0], ['legion', 6, 8, 0, 0], ['legion', 8, 8, 0, 0, 'Paullus', 100, 1], ['legion', 10, 8, 0, 0], ['legion', 12, 8, 0, 0], ['triarii', 7, 9, 0, 0], ['elephant', 13, 7, 0, 0, 'Numidian elephants'], ['cav', 2, 8, 0, 0], ['cav', 14, 8, 0, 0], ['peltast', 6, 7, 0, 0, 'Velites'],
        ['sarissa', 4, 1, 2, 1], ['sarissa', 5, 1, 2, 1], ['sarissa', 6, 1, 2, 1], ['sarissa', 7, 1, 2, 1], ['sarissa', 8, 1, 2, 1], ['sarissa', 9, 1, 2, 1], ['sarissa', 10, 1, 2, 1], ['peltast', 12, 1, 2, 1, 'Thracians'], ['cav', 2, 1, 2, 1, 'Perseus', 100, 1], ['cav', 13, 1, 2, 1]] }
  ];

  /* ---------- state ---------- */
  var BT, map, units, turn, side, sel, phase, logL, anim = [], over, W = 16, H = 10;
  function start(bi) {
    BT = BATTLES[bi]; map = BT.map.map(function (r) { return r.split(''); }); W = map[0].length; H = map.length;
    units = []; BT.u.forEach(function (d) { addUnit(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7]); });
    turn = 1; side = 0; sel = null; over = false; logL = [];
    log('Turn 1. Your move.'); render(); intro(bi);
  }
  var uid = 1;
  function addUnit(t, x, y, f, s, label, hp, gen) {
    var D = U[t]; var u = { id: uid++, t: t, x: x, y: y, f: f, s: s, label: label || D.n, hp: hp || 100, mor: D.mor * ((hp || 100) / 100 * .4 + .6), gen: !!gen, moved: false, acted: false, rout: false, gone: false, dx: x, dy: y };
    units.push(u); return u;
  }
  function at(x, y) { for (var i = 0; i < units.length; i++) { var u = units[i]; if (!u.gone && u.x === x && u.y === y) return u; } return null; }
  function ter(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? null : TER[map[y][x]]; }
  function alive(s) { return units.filter(function (u) { return u.s === s && !u.gone && !u.rout; }); }
  function routedFrac(s) { var all = units.filter(function (u) { return u.s === s && u.t !== 'chariot'; }); var r = all.filter(function (u) { return u.rout || u.gone; }); var tot = 0, lost = 0; all.forEach(function (u) { tot += 1; }); return all.length ? r.length / all.length : 0; }

  /* ---------- movement ---------- */
  function reach(u) {
    var D = U[u.t], best = {}, q = [[u.x, u.y, D.mv]], out = []; best[u.x + ',' + u.y] = D.mv;
    while (q.length) {
      var c = q.shift();
      if (c[0] !== u.x || c[1] !== u.y) { if (adjEnemy(c[0], c[1], u.s) && !(c[0] === u.x && c[1] === u.y)) continue; }
      DIRS.forEach(function (d) {
        var x = c[0] + d[0], y = c[1] + d[1], T = ter(x, y); if (!T || T.c >= 99) return; if (at(x, y)) return;
        var cost = T.c; if (D.cav && T.cav) cost += 1; if (D.pike && T.rough) cost += 1; var left = c[2] - cost;
        if (left < 0) { if (c[2] === D.mv) left = 0; else return; } // a unit can always take one step
        var k = x + ',' + y; if (best[k] != null && best[k] >= left) return; best[k] = left; q.push([x, y, left]);
      });
    }
    Object.keys(best).forEach(function (k) { var p = k.split(',').map(Number); if (p[0] !== u.x || p[1] !== u.y) out.push(p); });
    return out;
  }
  function adjEnemy(x, y, s) { return DIRS.some(function (d) { var o = at(x + d[0], y + d[1]); return o && o.s !== s && !o.rout; }); }
  function stepPath(u, tx, ty) { // BFS path for animation
    var prev = {}, q = [[u.x, u.y]], k0 = u.x + ',' + u.y; prev[k0] = null;
    while (q.length) { var c = q.shift(); if (c[0] === tx && c[1] === ty) break; DIRS.forEach(function (d) { var x = c[0] + d[0], y = c[1] + d[1], k = x + ',' + y, T = ter(x, y); if (!T || T.c >= 99 || prev.hasOwnProperty(k) || (at(x, y) && !(x === tx && y === ty))) return; prev[k] = c; q.push([x, y]); }); }
    var p = [], c2 = [tx, ty]; while (c2) { p.unshift(c2); c2 = prev[c2[0] + ',' + c2[1]]; } return p;
  }

  /* ---------- combat ---------- */
  function relSide(att, def) { // where is att relative to def's facing: front, flank or rear
    var dx = Math.sign(att.x - def.x), dy = Math.sign(att.y - def.y), F = DIRS[def.f];
    if (dx === F[0] && dy === F[1]) return 'front'; if (dx === -F[0] && dy === -F[1]) return 'rear'; return 'flank';
  }
  function defOf(u, from, ranged) {
    var D = U[u.t], T = ter(u.x, u.y), d = D.def;
    if (D.pike && T.rough) d *= .5; // the phalanx breaks up on rough ground
    if (from === 'flank') d *= D.pike ? .35 : .6; if (from === 'rear') d *= .4;
    if (T.def && !(ranged && T === TER.f && false)) d *= T.def;
    if (D.heavy && from === 'front') { var L = DIRS[(u.f + 3) % 4], R = DIRS[(u.f + 1) % 4], a = at(u.x + L[0], u.y + L[1]), b = at(u.x + R[0], u.y + R[1]); var n = (a && a.s === u.s && U[a.t].heavy && !a.rout ? 1 : 0) + (b && b.s === u.s && U[b.t].heavy && !b.rout ? 1 : 0); d *= 1 + n * .12; }
    if (ranged && D.heavy && from === 'front') d *= 1.5;
    if (u.rout) d *= .3;
    return d;
  }
  function strengthF(u) { return .35 + .65 * u.hp / 100; }
  function meleeDmg(a, d, charge) {
    var A = U[a.t], D = U[d.t], from = relSide(a, d), atk = A.atk * strengthF(a);
    if (charge && (A.cav || A.ele)) atk *= A.chariot ? 2 : 1.45;
    if (A.cav && D.ele) atk *= .45;
    if (A.ele && !D.ele) atk *= D.cav ? 1.5 : 1.15;
    if (A.cav && ter(a.x, a.y).cav) atk *= ter(a.x, a.y).cav;
    if (D.pike && from === 'front' && (A.cav || A.chariot)) atk *= .55;
    if (gNear(a)) atk *= 1.1;
    var h = ter(a.x, a.y) === TER.h && ter(d.x, d.y) !== TER.h ? 1.15 : 1;
    return 8 * atk * h / defOf(d, from, false);
  }
  function rangedDmg(a, d) { var A = U[a.t], from = relSide(a, d), dist = Math.abs(a.x - d.x) + Math.abs(a.y - d.y), r = A.ratk * strengthF(a) * (dist > A.rng * .6 ? .8 : 1); if (U[d.t].ele) r *= 1.2; return 6 * r / defOf(d, from, true); }
  function gNear(u) { return units.some(function (g) { return g.gen && g.s === u.s && !g.gone && !g.rout && Math.abs(g.x - u.x) + Math.abs(g.y - u.y) <= 2; }); }
  function inRange(a, d) { var A = U[a.t]; if (!A.rng) return false; var dist = Math.abs(a.x - d.x) + Math.abs(a.y - d.y); var r = A.rng + (ter(a.x, a.y) === TER.h ? 1 : 0); return dist <= r && dist >= 1 && !(dist === 1 && !A.light && !A.cav && A.rng === 1 ? false : false); }
  function adjacent(a, d) { return Math.abs(a.x - d.x) + Math.abs(a.y - d.y) === 1; }
  function hurt(u, dmg, from) {
    var r = .85 + Math.random() * .3; dmg *= r; u.hp = Math.max(0, u.hp - dmg);
    u.mor -= dmg * .9 + (from === 'flank' ? 8 : from === 'rear' ? 16 : 0) - (gNear(u) ? 3 : 0);
    if (U[u.t].ele && u.hp < 50 && !u.mad && Math.random() < .5) { u.mad = true; log('🐘 A wounded elephant panics!'); }
    if ((u.mor <= 0 || u.hp <= 10) && !u.rout) rout(u);
    return Math.round(dmg);
  }
  function rout(u) {
    u.rout = true; u.mor = 0; floatTxt(u, 'Routs!', '#ffd34d'); log((u.s ? '❌ Enemy ' : '⚠️ Your ') + u.label + ' break' + (u.label.slice(-1) === 's' ? '' : 's') + ' and run!');
    units.forEach(function (o) { if (o !== u && o.s === u.s && !o.rout && !o.gone && Math.abs(o.x - u.x) + Math.abs(o.y - u.y) <= 2) { o.mor -= u.gen ? 25 : 6; if (o.mor <= 0) rout(o); } });
    if (u.gen && BT.king && u.s === 1) { log('👑 The enemy commander has fled!'); }
    Kit.sfx.bad();
  }
  function attack(a, d, charge) {
    var A = U[a.t], from = relSide(a, d), melee = adjacent(a, d) && !(A.rng && !A.cav && A.rng > 1 && false), txt;
    if (adjacent(a, d) && !(A.rng >= 2 && !A.cav && A.atk < 7)) {
      var dm = hurt(d, meleeDmg(a, d, charge), from); floatTxt(d, '−' + dm, '#ff6b5b'); txt = a.label + ' attack' + (from !== 'front' ? ' the ' + from.toUpperCase() + ' of ' : ' ') + d.label + ' (−' + dm + ')';
      if (A.chariot) { a.hp -= 25; a.mor -= 20; if (a.hp <= 12 || a.mor <= 0) rout(a); }
      // counterattack from the front
      if (!d.rout && from === 'front' && d.hp > 0) { var cd = hurt(a, meleeDmg(d, a, false) * .55, relSide(d, a)); floatTxt(a, '−' + cd, '#ff6b5b'); txt += ', they hit back (−' + cd + ')'; }
      Kit.sfx.hit(); shake(d);
    } else {
      var rd = hurt(d, rangedDmg(a, d), from); floatTxt(d, '−' + rd, '#ff9b5b'); txt = a.label + ' shoot at ' + d.label + ' (−' + rd + ')'; Kit.sfx.tone(900, .12, .05, 'triangle', 0, 400); arrow(a, d);
    }
    log((a.s ? '◆ ' : '◇ ') + txt); a.acted = true; a.moved = true;
  }

  /* ---------- turns ---------- */
  function endTurn() {
    if (over || side !== 0) return; sel = null; side = 1; render();
    upkeep(1); setTimeout(ai, 350);
  }
  function upkeep(s) {
    units.forEach(function (u) { if (u.s !== s || u.gone) return; u.moved = false; u.acted = false; u.chargeLen = 0; if (!u.rout) u.mor = Math.min(U[u.t].mor, u.mor + (gNear(u) ? 7 : 3)); });
    // routed units flee; mad elephants rampage
    units.filter(function (u) { return u.s === s && u.rout && !u.gone; }).forEach(function (u) { flee(u); });
    units.filter(function (u) { return u.s === s && u.mad && !u.gone && !u.rout; }).forEach(function (u) { var n = units.filter(function (o) { return o !== u && !o.gone && adjacent(o, u); }); if (n.length) { var v = n[Math.floor(Math.random() * n.length)]; var dm = hurt(v, 12, 'flank'); floatTxt(v, '−' + dm, '#ff6b5b'); log('🐘 The maddened elephant tramples ' + (v.s === u.s ? 'its own ' : '') + v.label + '.'); } });
  }
  function flee(u) {
    var home = u.s === 0 ? DIRS[2] : DIRS[0]; var steps = U[u.t].mv;
    for (var i = 0; i < steps; i++) { var opts = DIRS.map(function (d) { return [u.x + d[0], u.y + d[1], d]; }).filter(function (p) { var T = ter(p[0], p[1]); return !T || (T.c < 99 && !at(p[0], p[1])); }); if (!opts.length) { u.hp -= 15; if (u.hp <= 0) remove(u); return; }
      opts.sort(function (a, b) { var sa = a[2] === home ? -3 : 0, sb = b[2] === home ? -3 : 0; sa -= nearestEnemyDist(a[0], a[1], u.s); sb -= nearestEnemyDist(b[0], b[1], u.s); return sa - sb; });
      var p = opts[0]; if (!ter(p[0], p[1])) { remove(u); return; } u.x = p[0]; u.y = p[1]; }
  }
  function remove(u) { u.gone = true; log((u.s ? 'Enemy ' : 'Your ') + u.label + ' have left the field.'); }
  function nearestEnemyDist(x, y, s) { var m = 99; units.forEach(function (o) { if (o.s !== s && !o.gone && !o.rout) m = Math.min(m, Math.abs(o.x - x) + Math.abs(o.y - y)); }); return m; }
  function ai() {
    if (over) return;
    var mine = alive(1).sort(function (a, b) { return nearestEnemyDist(a.x, a.y, 1) - nearestEnemyDist(b.x, b.y, 1); }), i = 0;
    (function next() {
      if (over) return;
      if (i >= mine.length) { finishAI(); return; }
      var u = mine[i++]; if (u.gone || u.rout) { next(); return; }
      aiUnit(u); render(); setTimeout(next, 260);
    })();
  }
  function aiUnit(u) {
    var D = U[u.t], foes = alive(1 - u.s); if (!foes.length) return;
    var holdBack = BT.hold ? false : (BT.id === 'leuctra' && turn < 2) || (BT.id === 'pydna' ? false : false);
    if (u.gen && foes.every(function (f) { return Math.abs(f.x - u.x) + Math.abs(f.y - u.y) > 3; }) && BT.king) return; // the king stays back
    if (holdBack) return;
    // ranged: shoot from where we are or from a safe tile
    if (D.rng && (D.light || D.cav || u.t === 'immortal')) {
      var tgt = bestShot(u); if (tgt && !adjEnemy(u.x, u.y, u.s)) { face(u, tgt); attack(u, tgt); return; }
      var tiles = reach(u), bestT = null, bs = -1e9;
      tiles.forEach(function (t) { var ox = u.x, oy = u.y; u.x = t[0]; u.y = t[1]; var s = -1e9, tg = bestShot(u); if (tg) s = 20 - (adjEnemy(t[0], t[1], u.s) ? 30 : 0) - tg.hp * .1; else s = -nearestEnemyDist(t[0], t[1], u.s); u.x = ox; u.y = oy; if (s > bs) { bs = s; bestT = t; } });
      if (bestT) moveTo(u, bestT[0], bestT[1]); var tg2 = bestShot(u); if (tg2) { face(u, tg2); attack(u, tg2); } else if (D.atk >= 8) meleeAny(u); return;
    }
    meleeAny(u, true);
  }
  function meleeAny(u, canMove) {
    var foes = alive(1 - u.s), best = null, bs = -1e9, tiles = canMove !== false && !u.moved ? reach(u).concat([[u.x, u.y]]) : [[u.x, u.y]];
    tiles.forEach(function (t) { foes.forEach(function (f) { if (Math.abs(f.x - t[0]) + Math.abs(f.y - t[1]) !== 1) return; var ox = u.x, oy = u.y; u.x = t[0]; u.y = t[1]; var dm = meleeDmg(u, f, Math.abs(t[0] - ox) + Math.abs(t[1] - oy) >= 2), side = relSide(u, f), back = side === 'front' ? meleeDmg(f, u, false) * .55 : 0; u.x = ox; u.y = oy; var s = dm * (f.hp < 40 ? 1.5 : 1) - back * .8 + (f.gen ? 6 : 0); if (s > bs) { bs = s; best = [t, f]; } }); });
    if (best) { var charge = Math.abs(best[0][0] - u.x) + Math.abs(best[0][1] - u.y) >= 2; if (best[0][0] !== u.x || best[0][1] !== u.y) moveTo(u, best[0][0], best[0][1]); face(u, best[1]); attack(u, best[1], charge); return; }
    if (!u.moved && canMove !== false) { // advance on the nearest enemy
      var tiles2 = reach(u), bt = null, bd = nearestEnemyDist(u.x, u.y, u.s); tiles2.forEach(function (t) { var d = nearestEnemyDist(t[0], t[1], u.s); if (d < bd) { bd = d; bt = t; } });
      if (bt) { moveTo(u, bt[0], bt[1]); var n = nearestFoe(u); if (n) face(u, n); }
    }
  }
  function nearestFoe(u) { var b = null, bd = 99; alive(1 - u.s).forEach(function (f) { var d = Math.abs(f.x - u.x) + Math.abs(f.y - u.y); if (d < bd) { bd = d; b = f; } }); return b; }
  function bestShot(u) { var b = null, bs = -1; alive(1 - u.s).forEach(function (f) { if (!inRange(u, f)) return; var s = rangedDmg(u, f) + (100 - f.hp) * .05; if (s > bs) { bs = s; b = f; } }); return b; }
  function face(u, t) { var dx = t.x - u.x, dy = t.y - u.y; u.f = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); }
  function moveTo(u, x, y) { var p = stepPath(u, x, y); if (p.length > 1) { var a = p[p.length - 2], b = p[p.length - 1]; u.f = b[0] > a[0] ? 1 : b[0] < a[0] ? 3 : b[1] > a[1] ? 2 : 0; } u.path = p; u.pt = 0; u.x = x; u.y = y; u.moved = true; }
  function finishAI() {
    if (check()) return;
    side = 0; turn++; upkeep(0);
    // reinforcements
    if (BT.waves && BT.waves[turn]) BT.waves[turn].forEach(function (w) { if (!at(w[1], w[2])) addUnit(w[0], w[1], w[2], w[1] < 4 ? 1 : 3, 1, w[3]); }), log(turn === 7 && BT.id === 'thermopylae' ? '⚠️ Ephialtes has shown the Persians the mountain path: Immortals behind you!' : '⚠️ Enemy reinforcements arrive.');
    log('Turn ' + turn + '. Your move.');
    if (check()) return; render();
  }
  function check() {
    if (over) return true;
    var foeR = routedFrac(1), myR = routedFrac(0), king = BT.king && units.some(function (u) { return u.gen && u.s === 1 && (u.rout || u.gone); });
    if (myR >= .6 || (BT.hold && units.some(function (u) { return u.s === 1 && !u.rout && !u.gone && u.x <= 1 && u.y >= 3 && u.y <= 6 && u.t !== 'immortal'; }) && turn > 2)) { end(false); return true; }
    if (BT.hold) { if (turn > BT.turns) { end(true); return true; } return false; }
    if (foeR >= BT.goal || king) { end(true); return true; }
    if (turn > BT.turns) { end(false, 'Night falls with the battle undecided.'); return true; }
    return false;
  }
  function end(won, why) {
    over = true; render(); var stars = won ? (routedFrac(0) < .15 ? 3 : routedFrac(0) < .35 ? 2 : 1) : 0;
    var rec = Kit.store.get('ph-done', {}); if (won && (rec[BT.id] || 0) < stars) { rec[BT.id] = stars; Kit.store.set('ph-done', rec); }
    won ? Kit.sfx.win() : Kit.sfx.bad();
    Kit.modal('<p class="chip">' + BT.n + ' · ' + BT.y + '</p><h2>' + (won ? 'Victory! ' + '⭐'.repeat(stars) : 'Defeat') + '</h2><p>' + (won ? 'The enemy line has broken.' : why || 'Your army can fight no more.') + '</p><p class="mute">' + BT.after + '</p><div class="krow"><button class="btn gold" id="e-again">Fight again</button><button class="btn ghost" id="e-list">All battles</button></div>', { sticky: true });
    $('#e-again').onclick = function () { Kit.closeModal(); start(BATTLES.indexOf(BT)); }; $('#e-list').onclick = function () { Kit.closeModal(); menu(); };
  }

  /* ---------- player input ---------- */
  var TS = 56, OX = 0, OY = 0, hov = null;
  function layout() { var dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); TS = Math.floor(Math.min(cv.width / W, cv.height / H)); OX = Math.floor((cv.width - TS * W) / 2); OY = Math.floor((cv.height - TS * H) / 2); }
  function tileOf(e) { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1, x = Math.floor(((e.clientX - r.left) * d - OX) / TS), y = Math.floor(((e.clientY - r.top) * d - OY) / TS); return x >= 0 && y >= 0 && x < W && y < H ? [x, y] : null; }
  cv.addEventListener('pointermove', function (e) { hov = tileOf(e); });
  cv.addEventListener('pointerleave', function () { hov = null; });
  cv.addEventListener('click', function (e) {
    if (over || side !== 0 || busy()) return; var t = tileOf(e); if (!t) return; var u = at(t[0], t[1]);
    if (sel && u && u.s === 1 && canHit(sel, u)) { var ch = sel.chargeLen >= 2; face(sel, u); attack(sel, u, ch); sel.acted = true; afterAct(); return; }
    if (u && u.s === 0) { if (u.rout) { info(u); return; } sel = u; render(); return; }
    if (u && u.s === 1) { info(u); return; }
    if (sel && !sel.moved && reach(sel).some(function (p) { return p[0] === t[0] && p[1] === t[1]; })) { var ox = sel.x, oy = sel.y; moveTo(sel, t[0], t[1]); sel.chargeLen = Math.abs(t[0] - ox) + Math.abs(t[1] - oy); Kit.sfx.click(); render(); if (!targets(sel).length && !U[sel.t].heavy) {} return; }
    sel = null; render();
  });
  function canHit(a, d) { if (a.acted || d.rout && false) return false; var A = U[a.t]; return adjacent(a, d) || (A.rng && inRange(a, d) && !adjEnemy(a.x, a.y, a.s)) || (A.rng && inRange(a, d) && A.cav); }
  function targets(a) { return alive(1).concat(units.filter(function (u) { return u.s === 1 && u.rout && !u.gone; })).filter(function (d) { return canHit(a, d); }); }
  function afterAct() { var s = sel; sel = null; render(); if (check()) return; if (alive(0).every(function (u) { return u.acted; })) setTimeout(endTurn, 400); }
  window.addEventListener('keydown', function (e) {
    if (Kit._m) return; if (e.key === 'Enter') endTurn(); if (e.key === 'Escape') { sel = null; render(); }
    if (sel && !sel.acted) { var k = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (k != null) { e.preventDefault(); turnTo(k); } }
    if (e.key === 'Tab') { e.preventDefault(); var free = alive(0).filter(function (u) { return !u.acted; }); if (free.length) { var i = free.indexOf(sel); sel = free[(i + 1) % free.length]; render(); } }
  });
  function turnTo(k) { if (!sel || sel.acted) return; var heavy = U[sel.t].heavy; if (heavy && sel.moved && sel.f !== k) { msgBanner('Heavy infantry can’t move and wheel in the same turn.'); return; } sel.f = k; if (heavy) { sel.moved = true; } render(); }

  /* ---------- drawing ---------- */
  var floats = [], t0 = 0, shakeU = {}, arrows = [];
  function floatTxt(u, t, c) { floats.push({ x: u.x, y: u.y, t: 0, s: t, c: c }); }
  function shake(u) { shakeU[u.id] = .3; }
  function arrow(a, d) { arrows.push({ x0: a.x, y0: a.y, x1: d.x, y1: d.y, t: 0 }); }
  function busy() { return units.some(function (u) { return u.path && u.pt < u.path.length - 1; }); }
  var TC = { '.': ['#c9c18a', '#c2ba82'], h: ['#b4a06a', '#a99460'], f: ['#8aa05a', '#7f9652'], m: ['#8ea38a', '#839a80'], w: ['#3f7fae', '#3a78a6'], M: ['#8a8174', '#7d7468'], r: ['#4a8cc0', '#4486ba'], d: ['#a9b9a8', '#9eb09c'], s: ['#e2d4a4', '#dbcd9c'], x: ['#b9ab8a', '#ae9f7e'] };
  function draw() {
    var dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect(); if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) layout();
    var dark = document.documentElement.dataset.theme === 'dark';
    ctx.fillStyle = dark ? '#0b1a13' : '#e9dfc5'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!BT) return;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var c = map[y][x], X = OX + x * TS, Y = OY + y * TS, v = ((x * 7 + y * 13) % 5) / 5;
      ctx.fillStyle = TC[c][(x + y) % 2]; ctx.fillRect(X, Y, TS + 1, TS + 1);
      if (c === 'h') { ctx.fillStyle = 'rgba(255,240,200,.25)'; ctx.beginPath(); ctx.ellipse(X + TS * .45, Y + TS * .55, TS * .4, TS * .25, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = 'rgba(90,70,40,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(X + TS * .5, Y + TS * .6, TS * .38, TS * .22, 0, Math.PI, 0); ctx.stroke(); }
      if (c === 'f') for (var k = 0; k < 4; k++) { var tx = X + TS * (.22 + (k % 2) * .5 + v * .05), ty = Y + TS * (.3 + Math.floor(k / 2) * .42); ctx.fillStyle = '#4f6e30'; ctx.beginPath(); ctx.arc(tx, ty, TS * .16, 0, 7); ctx.fill(); ctx.fillStyle = '#5f8038'; ctx.beginPath(); ctx.arc(tx - TS * .04, ty - TS * .04, TS * .09, 0, 7); ctx.fill(); }
      if (c === 'm') { ctx.strokeStyle = '#5e7a50'; ctx.lineWidth = 1.5; for (k = 0; k < 5; k++) { var mx = X + TS * (.15 + k * .17); ctx.beginPath(); ctx.moveTo(mx, Y + TS * .75); ctx.lineTo(mx + 2, Y + TS * .45); ctx.stroke(); } }
      if (c === 'M') { ctx.fillStyle = '#6e665b'; ctx.beginPath(); ctx.moveTo(X + TS * .05, Y + TS * .95); ctx.lineTo(X + TS * .5, Y + TS * .12); ctx.lineTo(X + TS * .95, Y + TS * .95); ctx.fill(); ctx.fillStyle = '#ece7de'; ctx.beginPath(); ctx.moveTo(X + TS * .38, Y + TS * .34); ctx.lineTo(X + TS * .5, Y + TS * .12); ctx.lineTo(X + TS * .62, Y + TS * .34); ctx.fill(); }
      if (c === 'w' || c === 'r') { ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X + TS * .5 + Math.sin(t0 + x) * 3, Y + TS * .5, TS * .18, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      if (c === 'x') { ctx.fillStyle = '#8d7f62'; for (k = 0; k < 4; k++) ctx.fillRect(X + TS * .38, Y + k * TS * .25 + 2, TS * .24, TS * .2); }
      ctx.strokeStyle = 'rgba(60,50,30,.08)'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, TS, TS);
    }
    // move and target highlights
    if (sel && side === 0 && !over) {
      if (!sel.moved) reach(sel).forEach(function (p) { ctx.fillStyle = 'rgba(70,130,255,.28)'; ctx.fillRect(OX + p[0] * TS + 2, OY + p[1] * TS + 2, TS - 4, TS - 4); });
      if (!sel.acted) targets(sel).forEach(function (d) { ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 3; ctx.strokeRect(OX + d.x * TS + 3, OY + d.y * TS + 3, TS - 6, TS - 6); });
    }
    if (hov) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(OX + hov[0] * TS + 1, OY + hov[1] * TS + 1, TS - 2, TS - 2); }
    units.forEach(function (u) { if (!u.gone) drawUnit(u); });
    // prediction tooltip
    if (sel && hov && side === 0) { var tg = at(hov[0], hov[1]); if (tg && tg.s === 1 && canHit(sel, tg)) { var from = relSide(sel, tg), dm = adjacent(sel, tg) && !(U[sel.t].rng >= 2 && !U[sel.t].cav && U[sel.t].atk < 7) ? meleeDmg(sel, tg, sel.chargeLen >= 2) : rangedDmg(sel, tg); tip(OX + tg.x * TS + TS / 2, OY + tg.y * TS, '≈ −' + Math.round(dm) + (from !== 'front' ? ' · ' + from.toUpperCase() + '!' : '')); } }
    arrows = arrows.filter(function (a) { a.t += 1 / 30; var k = Math.min(1, a.t * 2), x = OX + (a.x0 + (a.x1 - a.x0) * k + .5) * TS, y = OY + (a.y0 + (a.y1 - a.y0) * k + .5) * TS - Math.sin(k * Math.PI) * TS; ctx.fillStyle = '#2b1d0e'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); return a.t < .5; });
    floats = floats.filter(function (f) { f.t += 1 / 60; ctx.font = '700 ' + Math.round(TS * .3) + 'px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; var X = OX + (f.x + .5) * TS, Y = OY + f.y * TS - f.t * 30; ctx.strokeText(f.s, X, Y); ctx.fillStyle = f.c; ctx.fillText(f.s, X, Y); return f.t < 1.4; });
  }
  function tip(x, y, t) { ctx.font = '700 ' + Math.round(TS * .26) + 'px system-ui'; var w = ctx.measureText(t).width + 14; ctx.fillStyle = 'rgba(20,10,5,.85)'; ctx.fillRect(x - w / 2, y - TS * .42, w, TS * .36); ctx.fillStyle = '#ffe6a8'; ctx.textAlign = 'center'; ctx.fillText(t, x, y - TS * .15); }
  function drawUnit(u) {
    // animate along path
    if (u.path && u.pt < u.path.length - 1) { u.pt = Math.min(u.path.length - 1, u.pt + .15); var i = Math.floor(u.pt), k = u.pt - i, a = u.path[i], b = u.path[Math.min(i + 1, u.path.length - 1)]; u.dx = a[0] + (b[0] - a[0]) * k; u.dy = a[1] + (b[1] - a[1]) * k; } else { u.dx = u.x; u.dy = u.y; }
    var D = U[u.t], X = OX + (u.dx + .5) * TS, Y = OY + (u.dy + .5) * TS, col = BT.cols[u.s], sh = shakeU[u.id] || 0;
    if (sh > 0) { X += Math.sin(t0 * 60) * 3; shakeU[u.id] = sh - 1 / 60; }
    ctx.save(); ctx.translate(X, Y); ctx.rotate(u.f * Math.PI / 2); if (u.rout) ctx.globalAlpha = .55;
    var w = TS * .82, h = TS * .58;
    if (sel === u) { ctx.fillStyle = 'rgba(255,230,120,.55)'; ctx.fillRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8); }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
    ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
    // little soldiers: rows across, front at -y (facing up before rotation)
    var rows = D.cav || D.ele ? 2 : 3, cols = D.ele ? 2 : D.cav ? 4 : 6, n = Math.max(1, Math.round(rows * cols * u.hp / 100)), dot = TS * (D.ele ? .14 : .055);
    for (var j = 0; j < rows * cols && j < n; j++) { var cx = -w / 2 + w * ((j % cols) + .5) / cols, cy = -h / 2 + h * (Math.floor(j / cols) + .5) / rows;
      if (D.cav) { ctx.fillStyle = '#5a3a1e'; ctx.fillRect(cx - dot * .8, cy - dot * 1.6, dot * 1.6, dot * 3.2); ctx.fillStyle = '#f0d6b0'; ctx.beginPath(); ctx.arc(cx, cy, dot * .8, 0, 7); ctx.fill(); }
      else if (D.ele) { ctx.fillStyle = '#7d7a75'; ctx.beginPath(); ctx.ellipse(cx, cy, dot, dot * 1.3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#efe8da'; ctx.fillRect(cx - dot * .5, cy - dot * 1.7, 2, dot * .6); }
      else { ctx.fillStyle = D.heavy ? '#d6a940' : '#e8d8b0'; ctx.beginPath(); ctx.arc(cx, cy, dot * 1.25, 0, 7); ctx.fill(); ctx.strokeStyle = '#2b1d0e'; ctx.lineWidth = D.pike ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(cx + dot, cy); ctx.lineTo(cx + dot, cy - (D.pike ? dot * 7 : dot * 3.5)); ctx.stroke(); } }
    // facing chevron
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -h / 2 - TS * .14); ctx.lineTo(-TS * .09, -h / 2 - 1); ctx.lineTo(TS * .09, -h / 2 - 1); ctx.fill();
    ctx.restore();
    // badges
    ctx.font = Math.round(TS * .26) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(D.i, X - TS * .3, Y + TS * .42);
    if (u.gen) ctx.fillText('⭐', X + TS * .32, Y - TS * .28);
    // strength and morale bars
    var bw = TS * .7; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(X - bw / 2, Y + TS * .4, bw, 5); ctx.fillStyle = u.hp > 60 ? '#5ad16b' : u.hp > 30 ? '#f2c94c' : '#ef5a4a'; ctx.fillRect(X - bw / 2, Y + TS * .4, bw * u.hp / 100, 5);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(X - bw / 2, Y + TS * .4 + 6, bw, 3); ctx.fillStyle = '#7ab8ff'; ctx.fillRect(X - bw / 2, Y + TS * .4 + 6, bw * Math.max(0, u.mor) / U[u.t].mor, 3);
    if (u.s === 0 && u.acted && side === 0 && !u.rout) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(OX + u.x * TS + 1, OY + u.y * TS + 1, TS - 2, TS - 2); }
    if (u.rout) { ctx.font = Math.round(TS * .3) + 'px system-ui'; ctx.fillText('🏳️', X, Y); }
  }

  /* ---------- side panel ---------- */
  function render() {
    if (!BT) return; var s = sel;
    var mine = alive(0).length, foes = alive(1).length;
    var h = '<p class="chip">' + BT.n + ' · ' + BT.y + '</p><h2>' + (side === 0 ? 'Turn ' + turn + ' of ' + BT.turns : 'The enemy moves…') + '</h2>' +
      '<p class="small">' + (BT.hold ? 'Hold the pass until the end of turn ' + BT.turns + '. Do not let the enemy reach the far side of the wall.' : 'Rout ' + Math.round(BT.goal * 100) + '% of the enemy' + (BT.king ? ', or their commander ⭐' : '') + ', within ' + BT.turns + ' turns.') + '</p>' +
      '<div class="ph-score"><span style="--c:' + BT.cols[0] + '">' + esc(BT.me) + ' <b>' + mine + '</b></span><span style="--c:' + BT.cols[1] + '">' + esc(BT.foe) + ' <b>' + foes + '</b> · routed ' + Math.round(routedFrac(1) * 100) + '%</span></div>';
    if (s) {
      var D = U[s.t], T = ter(s.x, s.y);
      h += '<div class="ph-unit"><b>' + D.i + ' ' + esc(s.label) + '</b>' + (s.gen ? ' ⭐ commander' : '') + '<br><span class="small mute">' + D.n + ' · ' + T.n + '</span><br><span class="small">Strength ' + Math.round(s.hp) + ' · morale ' + Math.round(Math.max(0, s.mor)) + ' · attack ' + D.atk + ' · defence ' + D.def + ' · move ' + D.mv + (D.rng ? ' · range ' + D.rng : '') + '</span><p class="small mute">' + D.d + '</p>' +
        (s.acted ? '<p class="small">Done for this turn.</p>' : '<p class="small">' + (!s.moved ? 'Tap a blue square to move, ' : '') + 'tap a red-framed enemy to attack, or set the facing:</p><div class="ph-face">' + ['↑', '→', '↓', '←'].map(function (a, i) { return '<button data-f="' + i + '" class="' + (s.f === i ? 'on' : '') + '">' + a + '</button>'; }).join('') + '<button id="u-done">Done</button></div>') + '</div>';
    } else h += '<p class="small mute">Tap one of your units. Tab cycles through units that have not acted; arrow keys turn the selected unit; Enter ends the turn.</p>';
    h += '<div class="krow"><button class="btn gold" id="end"' + (side !== 0 || over ? ' disabled' : '') + '>End turn ⏎</button></div><ol class="ph-log">' + logL.slice(0, 14).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>';
    $('#side').innerHTML = h;
    if ($('#end')) $('#end').onclick = endTurn;
    Kit.$$('[data-f]').forEach(function (b) { b.onclick = function () { turnTo(+b.dataset.f); }; });
    if ($('#u-done')) $('#u-done').onclick = function () { sel.acted = true; afterAct(); };
  }
  function info(u) { sel = null; render(); var D = U[u.t]; $('#side').insertAdjacentHTML('beforeend', ''); msgBanner(D.i + ' ' + u.label + (u.label === D.n ? '' : ' (' + D.n + ')') + ': strength ' + Math.round(u.hp) + ', morale ' + Math.round(Math.max(0, u.mor)) + (u.rout ? ', routed' : '')); }
  function msgBanner(t) { var b = $('#banner'); b.textContent = t; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('on'); }, 2600); }
  function log(t) { logL.unshift(t); if (logL.length > 40) logL.pop(); }
  function intro(bi) { var b = BATTLES[bi]; Kit.modal('<p class="chip">' + b.y + '</p><h2>' + b.n + '</h2><p>You command <b>' + b.me + '</b> against <b>' + b.foe + '</b>.</p><p>' + b.intro + '</p><div class="krow"><button class="btn gold" data-close>To battle</button></div>'); }
  function menu() {
    var rec = Kit.store.get('ph-done', {});
    Kit.modal('<h2>⚔️ Battles</h2><div class="ph-list">' + BATTLES.map(function (b, i) { return '<button class="ph-b" data-b="' + i + '"><b>' + b.n + '</b> <span class="mute small">' + b.y + '</span><span>' + (rec[b.id] ? '⭐'.repeat(rec[b.id]) : '') + '</span><small>' + b.me + ' vs ' + b.foe + '</small></button>'; }).join('') + '</div>');
    Kit.$$('[data-b]').forEach(function (b) { b.onclick = function () { Kit.closeModal(); start(+b.dataset.b); }; });
  }
  function help() { Kit.modal('<h2>Phalanx</h2><p>Each turn, every unit may <b>move</b> and then <b>attack</b> once. Tap a unit, tap a blue square, then tap a red-framed enemy.</p><ul class="small"><li><b>Facing</b> matters most. Attacks on a flank do far more damage and shake morale; attacks from the rear are worse still. Only the defender’s front strikes back.</li><li>Heavy infantry (🛡️) is stronger with friends at its shoulders, but cannot move and turn in the same turn.</li><li>Cavalry that moves two squares or more before attacking <b>charges</b>. Horses will not face elephants.</li><li>The pike phalanx is a wall to the front and helpless on its flanks or on hills and woods.</li><li>Units with no morale left <b>rout</b> and run, shaking their neighbours. Commanders ⭐ steady troops within two squares.</li><li>Hills help the defender and add range; woods and marsh slow horses.</li></ul><div class="krow"><button class="btn gold" data-close>Understood</button></div>'); }
  $('#b-battles').onclick = menu; $('#b-help').onclick = help;

  function frame(now) { t0 = now / 1000; draw(); requestAnimationFrame(frame); }
  layout(); window.addEventListener('resize', layout);
  start(0); if (!Kit.store.get('ph-seen', 0)) { Kit.store.set('ph-seen', 1); help(); }
  requestAnimationFrame(frame);
  window.PH = { get units() { return units; }, start: start, endTurn: endTurn, get turn() { return turn; }, get side() { return side; }, attack: attack, moveTo: moveTo, reach: reach, targets: targets, alive: alive, aiUnit: aiUnit, BATTLES: BATTLES, get over() { return over; }, check: check, meleeAny: meleeAny, set side(v) { side = v; } };
})();
