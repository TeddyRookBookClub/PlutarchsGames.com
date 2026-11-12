/* Odyssey: the Deck. A roguelike deckbuilder in the spirit of Slay the Spire, following Odysseus home from Troy.
   Three voyages, each ending in a boss: Polyphemus, Circe, and the suitors in the hall at Ithaca. */
(function () {
  'use strict';
  var $ = Kit.$, esc = Kit.esc;
  Kit.bar('Odyssey: the Deck', [['b-deck', '🂠', 'Your deck'], ['b-help', '?', 'How to play'], ['b-snd', '🔊', 'Sound']]);
  var main = document.createElement('main'); main.className = 'od'; document.body.appendChild(main);
  var R = Kit.rng(Date.now() % 1e9);
  function rnd(n) { return Math.floor(R() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- cards ---------- */
  // t: attack | skill | power | curse; c: cost; r: rarity (0 starter, 1 common, 2 uncommon, 3 rare); tg: needs a target
  var C = {
    strike: { n: 'Spear Thrust', t: 'attack', c: 1, r: 0, tg: 1, d: 'Deal {6} damage.', up: 3, f: function (x) { hit(x, 6 + x.u * 3); } },
    defend: { n: 'Bronze Shield', t: 'skill', c: 1, r: 0, d: 'Gain {5} block.', up: 3, f: function (x) { block(5 + x.u * 3); } },
    nobody: { n: '“Nobody”', t: 'skill', c: 0, r: 0, tg: 1, d: 'Apply {2} Weak. “My name is Nobody.”', up: 1, f: function (x) { debuff(x.tg, 'weak', 2 + x.u); } },
    arrows: { n: 'Arrows of Eurytus', t: 'attack', c: 1, r: 1, tg: 1, d: 'Deal {3} damage 3 times.', up: 1, f: function (x) { for (var i = 0; i < 3; i++) hit(x, 3 + x.u, true); } },
    sword: { n: 'Sword Cut', t: 'attack', c: 1, r: 1, tg: 1, d: 'Deal {9} damage.', up: 3, f: function (x) { hit(x, 9 + x.u * 3); } },
    bash: { n: 'Shield Bash', t: 'attack', c: 1, r: 1, tg: 1, d: 'Deal damage equal to your block{+}.', up: 4, f: function (x) { hit(x, P.block + x.u * 4); } },
    javelin: { n: 'Javelin', t: 'attack', c: 0, r: 1, tg: 1, d: 'Deal {4} damage.', up: 3, f: function (x) { hit(x, 4 + x.u * 3); } },
    oar: { n: 'Sweeping Oar', t: 'attack', c: 1, r: 1, d: 'Deal {5} damage to ALL enemies.', up: 3, f: function (x) { all(function (e) { hitE(e, 5 + x.u * 3); }); } },
    feint: { n: 'Feint', t: 'attack', c: 1, r: 1, tg: 1, d: 'Deal {5} damage. Apply 2 Vulnerable.', up: 3, f: function (x) { hit(x, 5 + x.u * 3); debuff(x.tg, 'vuln', 2); } },
    fleece: { n: 'Under the Ram', t: 'skill', c: 1, r: 1, d: 'Gain {8} block. Cling to the ram’s fleece.', up: 3, f: function (x) { block(8 + x.u * 3); } },
    counsel: { n: 'Athena’s Counsel', t: 'skill', c: 1, r: 1, d: 'Draw {3} cards.', up: 1, f: function (x) { draw(3 + x.u); } },
    feast: { n: 'Feast on the Shore', t: 'skill', c: 1, r: 1, ex: 1, d: 'Heal {5} HP. Exhaust.', up: 3, f: function (x) { heal(5 + x.u * 3); } },
    beggar: { n: 'Beggar’s Rags', t: 'skill', c: 1, r: 1, d: 'Gain {6} block. Apply 1 Weak to ALL enemies.', up: 3, f: function (x) { block(6 + x.u * 3); all(function (e) { debuff(e, 'weak', 1); }); } },
    boar: { n: 'The Boar of Parnassus', t: 'attack', c: 2, r: 2, tg: 1, d: 'Deal {15} damage. Odysseus got his scar hunting it.', up: 5, f: function (x) { hit(x, 15 + x.u * 5); } },
    fury: { n: 'Fury of Ithaca', t: 'attack', c: 2, r: 2, tg: 1, d: 'Deal {8} damage twice.', up: 2, f: function (x) { hit(x, 8 + x.u * 2, true); hit(x, 8 + x.u * 2, true); } },
    stake: { n: 'Olive-wood Stake', t: 'attack', c: 2, r: 2, tg: 1, ex: 1, d: 'Deal {18} damage. A giant is Stunned. Exhaust.', up: 6, f: function (x) { hit(x, 18 + x.u * 6); if (x.tg.big && x.tg.hp > 0) { x.tg.stun = 1; fxText(x.tg, 'Blinded!'); } } },
    wine: { n: 'Wine of Maron', t: 'skill', c: 2, r: 2, tg: 1, ex: 1, d: 'The enemy falls asleep: it skips its next move. Exhaust.', up: -1, f: function (x) { x.tg.stun = 1; fxText(x.tg, 'Asleep'); } },
    wax: { n: 'Wax in the Ears', t: 'skill', c: 1, r: 2, d: 'Gain {4} block. Exhaust every Song in your hand and gain 1 Artifact.', up: 3, f: function (x) { block(4 + x.u * 3); P.hand.filter(function (k) { return k.id === 'song'; }).forEach(function (k) { exhaust(k); }); P.art = (P.art || 0) + 1; } },
    moly: { n: 'Moly', t: 'skill', c: 1, r: 2, ex: 1, d: 'Remove your debuffs. Exhaust all curses in your hand. Gain {4} block. Exhaust.', up: 4, f: function (x) { P.weak = 0; P.vuln = 0; P.hand.filter(function (k) { return C[k.id].t === 'curse'; }).forEach(function (k) { exhaust(k); }); block(4 + x.u * 4); } },
    horse: { n: 'The Wooden Horse', t: 'skill', c: 2, r: 2, d: 'Gain {12} block. Next turn, draw 2 more cards.', up: 4, f: function (x) { block(12 + x.u * 4); P.nextDraw += 2; } },
    winds: { n: 'Bag of Winds', t: 'skill', c: 0, r: 2, ex: 1, d: 'Draw {2} cards. Gain 1 energy. Exhaust.', up: 1, f: function (x) { draw(2 + x.u); P.energy++; } },
    polytropos: { n: 'Man of Many Turns', t: 'skill', c: 0, r: 3, d: 'Gain {1} energy. Draw 1 card.', up: 1, f: function (x) { P.energy += 1 + x.u; draw(1); } },
    favour: { n: 'Athena’s Favour', t: 'power', c: 2, r: 2, d: 'At the start of each turn, gain {3} block.', up: 2, f: function (x) { P.favour += 3 + x.u * 2; } },
    iron: { n: 'Heart of Iron', t: 'power', c: 1, r: 2, d: 'Gain {2} Strength. “Bear up, my heart.”', up: 1, f: function (x) { P.str += 2 + x.u; } },
    crew: { n: 'Crew of Ithaca', t: 'power', c: 1, r: 2, d: 'At the start of each turn, deal {3} damage to a random enemy.', up: 2, f: function (x) { P.crew += 3 + x.u * 2; } },
    scheme: { n: 'Scheming', t: 'power', c: 1, r: 2, d: 'Whenever you play a Skill, gain {1} block.', up: 1, f: function (x) { P.scheme += 1 + x.u; } },
    axes: { n: 'Through Twelve Axes', t: 'attack', c: 3, r: 3, tg: 1, d: 'Deal {2} damage 12 times.', up: 1, f: function (x) { for (var i = 0; i < 12; i++) hit(x, 2 + x.u, true); } },
    slaughter: { n: 'Slaughter of the Suitors', t: 'attack', c: 3, r: 3, d: 'Deal {14} damage to ALL enemies.', up: 5, f: function (x) { all(function (e) { hitE(e, 14 + x.u * 5); }); } },
    bowstrung: { n: 'The Bow Is Strung', t: 'power', c: 2, r: 3, d: 'Gain {3} Strength.', up: 1, f: function (x) { P.str += 3 + x.u; } },
    lotus: { n: 'Lotus', t: 'curse', c: -1, r: 9, d: 'Unplayable. You have forgotten the way home.' },
    swine: { n: 'Swine', t: 'curse', c: -1, r: 9, d: 'Unplayable. Circe turned you into a pig.' },
    song: { n: 'Song of the Sirens', t: 'curse', c: -1, r: 9, d: 'Unplayable. If it is in your hand at the end of your turn, lose 3 HP.' },
    wrath: { n: 'Wrath of Helios', t: 'curse', c: -1, r: 9, d: 'Unplayable. You ate the cattle of the Sun.' }
  };
  var ART = { strike: '🔱', defend: '🛡️', nobody: '🙊', arrows: '🏹', sword: '🗡️', bash: '💥', javelin: '🎯', oar: '🚣', feint: '🤺', fleece: '🐏', counsel: '🦉', feast: '🍖', beggar: '🧥', boar: '🐗', fury: '⚔️', stake: '🪵', wine: '🍷', wax: '🕯️', moly: '🌼', horse: '🐴', winds: '💨', polytropos: '🌀', favour: '✨', iron: '❤️‍🔥', crew: '⛵', scheme: '🧠', axes: '🪓', slaughter: '🏹', bowstrung: '🎻', lotus: '🪷', swine: '🐖', song: '🎶', wrath: '☀️' };
  var POOL = Object.keys(C).filter(function (k) { return C[k].r >= 1 && C[k].r <= 3; });
  function card(id, u) { return { id: id, u: u || 0, k: Math.random().toString(36).slice(2, 8) }; }
  function cname(k) { return C[k.id].n + (k.u ? '+' : ''); }
  function cdesc(k) { var D = C[k.id]; return D.d.replace(/\{(\d+)\}/g, function (m, n) { return '<b' + (k.u ? ' class="up"' : '') + '>' + (+n + (k.u ? D.up : 0)) + '</b>'; }).replace('{+}', k.u ? ' <b class="up">+' + D.up + '</b>' : ''); }
  function cost(k) { var D = C[k.id]; return D.up === -1 && k.u ? D.c - 1 : D.c; }

  /* ---------- relics ---------- */
  var REL = {
    owl: { n: 'Athena’s Owl', i: '🦉', d: 'Start each combat with 1 Strength.' },
    armour: { n: 'Armour of Achilles', i: '🛡️', d: 'Start each combat with 8 block. You won it from Ajax.' },
    bag: { n: 'Aeolus’ Bag', i: '👜', d: 'Draw 2 extra cards on the first turn of each combat.' },
    sandals: { n: 'Sandals of Hermes', i: '🪽', d: '+1 energy on the first turn of each combat.' },
    loom: { n: 'Penelope’s Loom', i: '🧶', d: 'Heal 5 HP after each combat.' },
    veil: { n: 'Ino’s Veil', i: '🧣', d: 'The first time you would die, survive with 10 HP instead.' },
    argos: { n: 'Argos the Dog', i: '🐕', d: 'Heal 2 HP at the start of each combat. He waited twenty years.' },
    scar: { n: 'The Scar', i: '🩹', d: 'Your first attack in each combat deals 4 extra damage.' },
    tiresias: { n: 'Tiresias’ Staff', i: '🦯', d: 'Draw 1 extra card each turn.' },
    leucothea: { n: 'Leucothea’s Grace', i: '🌊', d: '+10 max HP.' },
    jar: { n: 'Maron’s Jar', i: '🏺', d: 'Enemies start each combat with 1 Weak.' },
    trident: { n: 'Shard of the Trident', i: '🔱', d: 'Gain 1 energy every third turn.' }
  };

  /* ---------- enemies ---------- */
  // m: list of moves cycled or chosen; each { k: atk|blk|buf|deb|add, v, n, s } ; big: giant (the stake stuns it)
  var E = {
    cicon: { n: 'Cicones Warrior', i: '⚔️', hp: [24, 28], m: [{ k: 'atk', v: 7 }, { k: 'blk', v: 6, a: 4 }, { k: 'atk', v: 9 }], h: 'Odysseus’ first stop after Troy was Ismarus, city of the Cicones. His men sacked it, then lingered to feast, and the Cicones came back with reinforcements (Book 9).' },
    spear: { n: 'Cicones Spearman', i: '🗡️', hp: [18, 22], m: [{ k: 'atk', v: 4, n: 2 }, { k: 'atk', v: 6 }] },
    lotus: { n: 'Lotus-eater', i: '🪷', hp: [20, 24], m: [{ k: 'add', c: 'lotus', n: 1 }, { k: 'atk', v: 5 }, { k: 'deb', s: 'weak', v: 2 }], h: 'Those who ate the lotus forgot all wish to go home. Odysseus dragged his men back to the ships weeping and tied them under the benches.' },
    goat: { n: 'Wild Goats', i: '🐐', hp: [14, 16], m: [{ k: 'atk', v: 5 }, { k: 'atk', v: 3, n: 2 }] },
    cavalry: { n: 'Cicones Horsemen', i: '🐎', hp: [58, 62], elite: 1, m: [{ k: 'atk', v: 13 }, { k: 'atk', v: 6, n: 2 }, { k: 'buf', v: 2 }] },
    poly: { n: 'Polyphemus', i: '👁️', hp: [120, 120], boss: 1, big: 1, m: [{ k: 'atk', v: 15 }, { k: 'deb', s: 'vuln', v: 2, a: 8 }, { k: 'buf', v: 2 }, { k: 'atk', v: 9, n: 2 }], h: 'The Cyclops trapped them in his cave and ate six of the crew. Odysseus got him drunk on the wine of Maron, told him his name was “Nobody”, and blinded him with a sharpened olive stake. Escaping under the rams, he could not resist shouting his real name, and Polyphemus prayed to his father Poseidon for revenge (Book 9).' },
    wolf: { n: 'Enchanted Wolf', i: '🐺', hp: [22, 26], m: [{ k: 'atk', v: 5, n: 2 }, { k: 'atk', v: 8 }] },
    lion: { n: 'Enchanted Lion', i: '🦁', hp: [30, 34], m: [{ k: 'atk', v: 11 }, { k: 'buf', v: 2 }] },
    laes: { n: 'Laestrygonian', i: '🗿', hp: [40, 46], big: 1, m: [{ k: 'atk', v: 14 }, { k: 'blk', v: 10 }, { k: 'atk', v: 8 }], h: 'Giant cannibals who smashed eleven of Odysseus’ twelve ships with boulders in their harbour and speared the men like fish (Book 10).' },
    antiphates: { n: 'King Antiphates', i: '👑', hp: [84, 90], elite: 1, big: 1, m: [{ k: 'atk', v: 18 }, { k: 'atk', v: 5, n: 3 }, { k: 'buf', v: 3, a: 10 }] },
    shade: { n: 'Shade of the Dead', i: '👻', hp: [26, 30], m: [{ k: 'deb', s: 'weak', v: 1, a: 6 }, { k: 'atk', v: 7 }] },
    circe: { n: 'Circe', i: '🧙‍♀️', hp: [150, 150], boss: 1, m: [{ k: 'add', c: 'swine', n: 2 }, { k: 'atk', v: 13 }, { k: 'blk', v: 15 }, { k: 'atk', v: 7, n: 2 }, { k: 'deb', s: 'weak', v: 2 }], h: 'The witch-goddess of Aiaia turned Odysseus’ scouts into pigs. Hermes gave Odysseus the herb moly to protect him, and he forced Circe to turn them back. They stayed a year (Book 10).' },
    siren: { n: 'Siren', i: '🪶', hp: [34, 38], elite: 1, m: [{ k: 'add', c: 'song', n: 2 }, { k: 'atk', v: 7 }], h: 'Homer’s Sirens were bird-women, not mermaids. Odysseus had the crew plug their ears with wax and tie him to the mast so he could hear the song and live (Book 12).' },
    scylla: { n: 'Scylla', i: '🐙', hp: [80, 84], elite: 1, m: [{ k: 'atk', v: 3, n: 6 }, { k: 'blk', v: 12 }, { k: 'atk', v: 4, n: 6 }], h: 'Scylla had six heads on long necks, each with three rows of teeth, and snatched six men from the deck. Opposite her lay Charybdis, the whirlpool (Book 12).' },
    charyb: { n: 'Charybdis', i: '🌀', hp: [70, 74], elite: 1, m: [{ k: 'dis' }, { k: 'atk', v: 12 }, { k: 'blk', v: 10 }], h: 'Three times a day Charybdis swallowed the sea and spat it out again. Odysseus survived by clinging to a fig tree above her until his raft came back up.' },
    suitor: { n: 'Suitor', i: '🍷', hp: [20, 24], m: [{ k: 'atk', v: 6 }, { k: 'blk', v: 5 }, { k: 'atk', v: 4, n: 2 }] },
    melanthius: { n: 'Melanthius', i: '🐐', hp: [34, 36], m: [{ k: 'blk', v: 8, a: 6 }, { k: 'deb', s: 'vuln', v: 1 }, { k: 'atk', v: 9 }], h: 'The disloyal goatherd who brought arms to the suitors from the storeroom.' },
    antinous: { n: 'Antinous', i: '🏺', hp: [110, 110], boss: 1, m: [{ k: 'atk', v: 14 }, { k: 'buf', v: 2, a: 8 }, { k: 'atk', v: 6, n: 3 }, { k: 'deb', s: 'weak', v: 2 }], h: 'The most arrogant of the 108 suitors, who threw a footstool at Odysseus while he was disguised as a beggar. He was the first to die: shot through the throat as he lifted a cup of wine (Book 22).' },
    eurymachus: { n: 'Eurymachus', i: '🗡️', hp: [70, 70], boss: 1, m: [{ k: 'blk', v: 10 }, { k: 'atk', v: 11 }, { k: 'atk', v: 5, n: 2 }] }
  };
  var ACTS = [
    { n: 'From Troy to the Cyclops', sea: 'The Aegean', fights: [['cicon'], ['spear', 'spear'], ['lotus', 'goat'], ['cicon', 'spear'], ['lotus', 'lotus'], ['goat', 'goat', 'goat']], elites: [['cavalry']], boss: ['poly'] },
    { n: 'The Laestrygonians and Circe', sea: 'The western sea', fights: [['wolf', 'wolf'], ['lion'], ['laes'], ['wolf', 'lion'], ['shade', 'shade'], ['laes', 'shade']], elites: [['antiphates']], boss: ['circe'] },
    { n: 'The Sirens, Scylla, and home', sea: 'The way to Ithaca', fights: [['shade', 'shade', 'shade'], ['suitor', 'suitor'], ['laes', 'wolf'], ['melanthius', 'suitor'], ['suitor', 'suitor', 'suitor']], elites: [['siren', 'siren'], ['scylla'], ['charyb']], boss: ['antinous', 'eurymachus', 'suitor'] }
  ];

  /* ---------- run state ---------- */
  var RUN, P;
  function newRun(asc) {
    RUN = { act: 0, floor: -1, node: null, hp: 75, max: 75, gold: 99, deck: [], rel: [], map: null, asc: asc || 0, kills: 0, seen: {} };
    for (var i = 0; i < 5; i++) RUN.deck.push(card('strike')); for (i = 0; i < 4; i++) RUN.deck.push(card('defend')); RUN.deck.push(card('nobody'));
    RUN.rel.push('owl'); RUN.map = genMap(); save(); showMap();
  }
  function has(r) { return RUN.rel.indexOf(r) >= 0; }

  /* ---------- the map ---------- */
  var FLOORS = 12;
  function genMap() {
    var fl = [];
    for (var f = 0; f < FLOORS; f++) {
      var n = f === FLOORS - 1 ? 1 : f === 0 ? 3 : 2 + rnd(3), row = [];
      for (var j = 0; j < n; j++) {
        var t = f === FLOORS - 1 ? 'boss' : f === 0 ? 'fight' : f === FLOORS - 2 ? 'rest' : f === 6 ? 'treasure' : (function () { var r = R(); return r < .45 ? 'fight' : r < .66 ? 'event' : r < .78 && f > 3 ? 'elite' : r < .9 ? 'rest' : 'shop'; })();
        if (t === 'rest' && f < 3) t = 'event';
        row.push({ f: f, j: j, t: t, x: n === 1 ? .5 : .12 + .76 * j / (n - 1) + (R() - .5) * .06, to: [] });
      }
      fl.push(row);
    }
    for (f = 0; f < FLOORS - 1; f++) {
      var a = fl[f], b = fl[f + 1];
      a.forEach(function (nd) { var best = b.slice().sort(function (p, q) { return Math.abs(p.x - nd.x) - Math.abs(q.x - nd.x); }); nd.to.push(best[0].j); if (best[1] && R() < .45) nd.to.push(best[1].j); });
      b.forEach(function (nd) { if (!a.some(function (p) { return p.to.indexOf(nd.j) >= 0; })) { var near = a.slice().sort(function (p, q) { return Math.abs(p.x - nd.x) - Math.abs(q.x - nd.x); })[0]; near.to.push(nd.j); } });
    }
    return fl;
  }
  var ICON = { fight: '⚔️', elite: '💀', event: '❓', rest: '🔥', shop: '⚖️', treasure: '🏺', boss: '👑' };
  var TNAME = { fight: 'Battle', elite: 'Elite', event: 'Unknown', rest: 'Camp on the shore', shop: 'Phoenician trader', treasure: 'Treasure', boss: 'Boss' };
  function showMap() {
    var A = ACTS[RUN.act], m = RUN.map, open = RUN.floor < 0 ? m[0].map(function (n) { return n.j; }) : m[RUN.floor][RUN.node].to;
    var H = FLOORS * 74 + 40;
    var svg = '<svg class="od-paths" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none">' + m.map(function (row, f) { return row.map(function (nd) { return nd.to.map(function (t) { var b = m[f + 1][t]; return '<line x1="' + nd.x * 100 + '" y1="' + (H - 40 - f * 74) + '" x2="' + b.x * 100 + '" y2="' + (H - 40 - (f + 1) * 74) + '"/>'; }).join(''); }).join(''); }).join('') + '</svg>';
    var nodes = m.map(function (row, f) { return row.map(function (nd) { var can = (RUN.floor < 0 ? f === 0 : f === RUN.floor + 1 && open.indexOf(nd.j) >= 0), here = f === RUN.floor && nd.j === RUN.node, past = (RUN.path || []).some(function (p) { return p[0] === f && p[1] === nd.j; }); return '<button class="od-node' + (can ? ' can' : '') + (here ? ' here' : '') + (past ? ' past' : '') + ' t-' + nd.t + '" style="left:' + nd.x * 100 + '%;top:' + (H - 40 - f * 74) + 'px" data-n="' + f + ',' + nd.j + '" title="' + TNAME[nd.t] + '"' + (can ? '' : ' tabindex="-1"') + '>' + ICON[nd.t] + '</button>'; }).join(''); }).join('');
    main.innerHTML = hudHTML() + '<div class="od-mapwrap"><div class="od-maphead"><p class="chip">Voyage ' + (RUN.act + 1) + ' of 3</p><h2>' + A.n + '</h2><p class="mute small">Choose your course. ⚔️ battle · 💀 elite · ❓ unknown · 🔥 camp · ⚖️ trader · 🏺 treasure · 👑 boss</p></div><div class="od-map" style="height:' + H + 'px">' + svg + nodes + '</div></div>';
    Kit.$$('.od-node.can').forEach(function (b) { b.onclick = function () { var p = b.dataset.n.split(',').map(Number); enter(p[0], p[1]); }; });
    var cur = $('.od-node.can'); if (cur) setTimeout(function () { cur.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50);
    bindHud();
  }
  function enter(f, j) {
    RUN.floor = f; RUN.node = j; RUN.path = (RUN.path || []).concat([[f, j]]); var nd = RUN.map[f][j]; save();
    if (nd.t === 'fight') fight(pick(ACTS[RUN.act].fights.slice(0, f < 4 ? 3 : 99)));
    else if (nd.t === 'elite') fight(pick(ACTS[RUN.act].elites), 'elite');
    else if (nd.t === 'boss') fight(ACTS[RUN.act].boss, 'boss');
    else if (nd.t === 'rest') rest();
    else if (nd.t === 'shop') shop();
    else if (nd.t === 'treasure') treasure();
    else event();
  }

  /* ---------- combat ---------- */
  var CB = null;
  function fight(list, kind) {
    var es = list.map(function (k, i) { var D = E[k], hp = D.hp[0] + rnd(D.hp[1] - D.hp[0] + 1); hp = Math.round(hp * (1 + RUN.act * .08 + RUN.asc * .1)); if (D.h) RUN.seen[k] = 1; return { k: k, n: D.n, i: D.i, hp: hp, max: hp, block: 0, str: 0, weak: has('jar') ? 1 : 0, vuln: 0, stun: 0, mi: rnd(D.m.length), big: D.big, idx: i }; });
    P = { hp: RUN.hp, max: RUN.max, block: 0, str: has('owl') ? 1 : 0, weak: 0, vuln: 0, art: 0, energy: 3, maxE: 3, draw: shuffle(RUN.deck.map(function (c) { return { id: c.id, u: c.u, k: c.k }; })), hand: [], disc: [], exh: [], favour: 0, crew: 0, scheme: 0, nextDraw: 0, turn: 0, firstAtk: has('scar'), molyShield: false };
    CB = { es: es, kind: kind || 'fight', sel: null, log: [] };
    if (has('armour')) P.block = 8; if (has('argos')) P.hp = Math.min(P.max, P.hp + 2);
    startTurn();
  }
  function startTurn() {
    P.turn++; P.energy = P.maxE + (P.turn === 1 && has('sandals') ? 1 : 0) + (has('trident') && P.turn % 3 === 0 ? 1 : 0);
    if (P.turn > 1 || !has('armour')) P.block = 0;
    if (P.favour) P.block += P.favour;
    CB.es.forEach(function (e) { e.intent = intent(e); });
    if (P.crew) { var live = alive(); if (live.length) { var t = pick(live); hitE(t, P.crew, true); fxText(t, 'Crew!'); } }
    draw(5 + P.nextDraw + (P.turn === 1 && has('bag') ? 2 : 0) + (has('tiresias') ? 1 : 0)); P.nextDraw = 0;
    renderCombat(); if (checkEnd()) return;
  }
  function intent(e) { var D = E[e.k]; if (e.stun) return { k: 'stun' }; var m = D.m[e.mi % D.m.length]; return m; }
  function alive() { return CB.es.filter(function (e) { return e.hp > 0; }); }
  function draw(n) { for (var i = 0; i < n; i++) { if (!P.draw.length) { if (!P.disc.length) break; P.draw = shuffle(P.disc); P.disc = []; } if (P.hand.length >= 10) break; P.hand.push(P.draw.pop()); } }
  function block(v) { P.block += Math.max(0, v); }
  function heal(v) { P.hp = Math.min(P.max, P.hp + v); }
  function all(f) { alive().forEach(f); }
  function debuff(e, s, v) { if (e === P) { if (P.art) { P.art--; return; } if (has('moly') && !P.molyShield) { P.molyShield = true; return; } } e[s] = (e[s] || 0) + v; }
  function dmgCalc(base, from, to) { var d = base + (from.str || 0); if (from.weak) d *= .75; if (to.vuln) d *= 1.5; return Math.max(0, Math.floor(d)); }
  function hit(x, base, multi) { if (!x.tg || x.tg.hp <= 0) { var l = alive(); if (!l.length) return; x.tg = l[0]; } var extra = 0; if (P.firstAtk) { extra = 4; P.firstAtk = false; } hitE(x.tg, base + extra); }
  function hitE(e, base, raw) { if (e.hp <= 0) return; var d = raw ? base : dmgCalc(base, P, e); var b = Math.min(e.block, d); e.block -= b; d -= b; e.hp = Math.max(0, e.hp - d); fxDmg(e, d, b); if (e.hp <= 0) { Kit.sfx.boom(); RUN.kills++; } else Kit.sfx.hit(); }
  function hurtP(base, from) { var d = dmgCalc(base, from, P), b = Math.min(P.block, d); P.block -= b; d -= b; P.hp -= d; if (d) { shakeP(); Kit.sfx.bad(); } if (P.hp <= 0 && has('veil') && !RUN.veilUsed) { RUN.veilUsed = true; P.hp = 10; toast('🧣 Ino’s veil saves you from the sea!'); } return d; }
  function exhaust(k) { var i = P.hand.indexOf(k); if (i >= 0) P.hand.splice(i, 1); P.exh.push(k); }
  function play(k, tg) {
    var D = C[k.id], c = cost(k); if (D.t === 'curse' || c > P.energy) return;
    if (D.tg && !tg) { var l = alive(); if (l.length === 1) tg = l[0]; else { CB.sel = k; renderCombat(); return; } }
    P.energy -= c; var i = P.hand.indexOf(k); P.hand.splice(i, 1);
    D.f({ u: k.u, tg: tg }); if (D.t === 'skill' && P.scheme) block(P.scheme);
    if (D.ex || D.t === 'power') P.exh.push(k); else P.disc.push(k);
    Kit.sfx.click(); CB.sel = null; renderCombat(); checkEnd();
  }
  function endTurn() {
    if (!CB || CB.busy) return; CB.busy = true;
    // curses at end of turn
    P.hand.forEach(function (k) { if (k.id === 'song') { P.hp -= 3; toast('🪶 The Sirens’ song: −3 HP'); } });
    P.disc = P.disc.concat(P.hand); P.hand = [];
    if (P.weak) P.weak--; if (P.vuln) P.vuln--;
    renderCombat();
    var es = alive(), i = 0;
    (function next() {
      if (checkEnd()) { CB && (CB.busy = false); return; }
      if (i >= es.length) { CB.busy = false; startTurn(); return; }
      var e = es[i++]; if (e.hp <= 0) { next(); return; }
      e.block = 0; act(e); renderCombat(); setTimeout(next, 420);
    })();
  }
  function act(e) {
    var D = E[e.k], m = e.intent;
    if (m.k === 'stun') { e.stun = 0; fxText(e, '💤'); }
    else {
      if (m.k === 'atk') { for (var n = 0; n < (m.n || 1); n++) hurtP(m.v, e); pulse(e); }
      if (m.k === 'blk') e.block += m.v;
      if (m.k === 'buf') { e.str += m.v; fxText(e, '+' + m.v + ' Strength'); }
      if (m.k === 'deb') debuff(P, m.s, m.v);
      if (m.k === 'add') { for (n = 0; n < m.n; n++) P.disc.push(card(m.c)); fxText(e, m.c === 'song' ? '♪ ♪' : m.c === 'swine' ? '🐖' : '🪷'); }
      if (m.k === 'dis') { var lost = P.draw.splice(-3, 3); P.disc = P.disc.concat(lost); hurtP(6, e); fxText(e, 'Whirlpool!'); }
      if (m.a) e.block += m.a;
      e.mi++;
    }
    if (e.weak) e.weak--; if (e.vuln) e.vuln--;
  }
  function checkEnd() {
    if (!CB) return true;
    if (P.hp <= 0) { lose(); return true; }
    if (!alive().length) { win(); return true; }
    return false;
  }
  function win() {
    var kind = CB.kind; RUN.hp = Math.min(RUN.max, P.hp + (has('loom') ? 5 : 0)); CB = null; Kit.sfx.win();
    var gold = kind === 'boss' ? 100 : kind === 'elite' ? 40 + rnd(20) : 12 + rnd(12); RUN.gold += gold;
    if (kind === 'boss') { bossDone(); return; }
    rewards(gold, kind === 'elite');
  }
  function rewards(gold, elite) {
    var opts = cardChoices(elite ? 1 : 0), relic = elite ? newRelic() : null;
    main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>Victory</h2><p>+' + gold + ' drachmae' + (relic ? ' · a gift of the gods: <b>' + REL[relic].i + ' ' + REL[relic].n + '</b> <span class="mute small">' + REL[relic].d + '</span>' : '') + '</p><p>Add a card to your deck:</p><div class="od-choice">' + opts.map(function (k, i) { return cardHTML(k, 'data-pick="' + i + '"'); }).join('') + '</div><div class="krow"><button class="btn ghost" id="skip">Skip</button></div></div>';
    if (relic) { RUN.rel.push(relic); if (relic === 'leucothea') { RUN.max += 10; RUN.hp += 10; } }
    Kit.$$('[data-pick]').forEach(function (b) { b.onclick = function () { RUN.deck.push(opts[+b.dataset.pick]); next(); }; });
    $('#skip').onclick = next; bindHud(); save();
    function next() { save(); showMap(); }
  }
  function cardChoices(bias) { var out = [], tries = 0; while (out.length < 3 && tries++ < 50) { var r = R() + bias * .25, rar = r > .93 ? 3 : r > .62 ? 2 : 1, ks = POOL.filter(function (k) { return C[k].r === rar && !out.some(function (o) { return o.id === k; }); }); if (ks.length) out.push(card(pick(ks), R() < .08 + RUN.act * .08 ? 1 : 0)); } return out; }
  function newRelic() { var ks = Object.keys(REL).filter(function (k) { return !has(k); }); return ks.length ? pick(ks) : null; }
  function bossDone() {
    if (RUN.act === 2) { finish(true); return; }
    var relic = newRelic();
    main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>👑 ' + (RUN.act === 0 ? 'Polyphemus is blinded' : 'Circe yields') + '</h2><p>' + (RUN.act === 0 ? '“Cyclops, if anyone asks who blinded you, tell him it was Odysseus, sacker of cities, son of Laertes, from Ithaca!” The giant hurls a hill at the ship and prays to Poseidon. Your voyage will be long.' : 'Circe turns your men back into men, younger and taller than before. After a year she tells you the way home lies through the land of the dead.') + '</p><p>You heal to full. A gift: <b>' + (relic ? REL[relic].i + ' ' + REL[relic].n : '') + '</b> <span class="mute small">' + (relic ? REL[relic].d : '') + '</span></p><div class="krow"><button class="btn gold" id="nx">Sail on</button></div></div>';
    if (relic) { RUN.rel.push(relic); if (relic === 'leucothea') RUN.max += 10; }
    RUN.hp = RUN.max; $('#nx').onclick = function () { RUN.act++; RUN.floor = -1; RUN.node = null; RUN.path = []; RUN.map = genMap(); save(); showMap(); }; bindHud(); save();
  }
  function lose() { CB = null; finish(false); }
  function finish(won) {
    var score = (RUN.act * 100 + (RUN.floor + 1) * 8 + RUN.kills * 3 + (won ? 500 : 0)) * (1 + RUN.asc * .25), best = Kit.store.get('od-best', 0);
    if (score > best) Kit.store.set('od-best', score); Kit.store.set('od-run', null);
    if (won) { var a = Kit.store.get('od-asc', 0); if (RUN.asc >= a) Kit.store.set('od-asc', RUN.asc + 1); }
    won ? Kit.sfx.win() : Kit.sfx.bad();
    main.innerHTML = '<div class="od-panel card od-end"><h2>' + (won ? '🏹 Home to Ithaca' : '🌊 Lost at sea') + '</h2><p>' + (won ? 'The bow is strung, the axes are passed, and the suitors lie dead in the hall. Odysseus is home after twenty years, ten of war and ten of wandering. Penelope tests him one last time with the secret of their bed, built around a living olive tree.' : 'Odysseus falls in ' + ACTS[RUN.act].sea.toLowerCase() + ', far from home. Penelope goes on weaving and unweaving the shroud.') + '</p><p>Score <b>' + Math.round(score) + '</b>' + (score > best ? ' · a new best!' : ' · best ' + Math.round(best)) + '</p><p class="mute small">Voyage ' + (RUN.act + 1) + ', ' + RUN.kills + ' foes defeated, ' + RUN.deck.length + ' cards.' + (won ? ' Harder voyages (“Wrath of Poseidon”) are now unlocked.' : '') + '</p><div class="krow"><button class="btn gold" id="again">Set sail again</button></div></div>';
    $('#again').onclick = title;
  }

  /* ---------- combat view ---------- */
  function renderCombat() {
    if (!CB) return;
    var sel = CB.sel;
    var es = CB.es.map(function (e, i) {
      var m = e.intent || {}, it = m.k === 'atk' ? '🗡️ ' + dmgCalc(m.v, e, P) + (m.n > 1 ? '×' + m.n : '') : m.k === 'blk' ? '🛡️ ' + m.v : m.k === 'buf' ? '💪' : m.k === 'deb' ? '☠️' : m.k === 'add' ? '🃏' : m.k === 'dis' ? '🌀' : m.k === 'stun' ? '💤' : '';
      if (m.a && m.k !== 'blk') it += ' 🛡️';
      return '<div class="od-foe' + (e.hp <= 0 ? ' dead' : '') + (sel && e.hp > 0 ? ' tgt' : '') + (E[e.k].boss ? ' boss' : '') + '" data-e="' + i + '" id="foe' + i + '"><div class="od-int" title="' + intentTxt(e) + '">' + it + '</div><div class="od-face">' + e.i + '</div><b>' + e.n + '</b>' + bar(e) + stat(e) + '</div>';
    }).join('');
    var hand = P.hand.map(function (k, i) { var ok = C[k.id].t !== 'curse' && cost(k) <= P.energy; return cardHTML(k, 'data-c="' + i + '"', (ok ? '' : ' no') + (sel === k ? ' sel' : ''), P.hand.length, i); }).join('');
    main.innerHTML = hudHTML() + '<div class="od-fight"><div class="od-foes">' + es + '</div><div class="od-me" id="me"><div class="od-face">🧔🏻</div><b>Odysseus</b>' + bar(P) + stat(P) + '</div>' +
      '<div class="od-tray"><div class="od-energy" title="Energy">' + P.energy + '/' + P.maxE + '</div><div class="od-pile" id="pd" title="Draw pile">🂠 ' + P.draw.length + '</div><div class="od-hand">' + hand + '</div><div class="od-pile" id="pdi" title="Discard pile">♻️ ' + P.disc.length + '</div><button class="btn gold od-end" id="et"' + (CB.busy ? ' disabled' : '') + '>End turn</button></div>' + (sel ? '<p class="od-hint">Choose a target for ' + esc(cname(sel)) + '. <button class="btn ghost" id="cx">Cancel</button></p>' : '') + '</div>';
    Kit.$$('[data-c]').forEach(function (b) { b.onclick = function () { if (CB.busy) return; var k = P.hand[+b.dataset.c]; if (CB.sel === k) { CB.sel = null; renderCombat(); return; } play(k); }; });
    Kit.$$('[data-e]').forEach(function (b) { b.onclick = function () { var e = CB.es[+b.dataset.e]; if (CB.sel && e.hp > 0) play(CB.sel, e); else if (e.hp > 0) Kit.toast(intentTxt(e)); }; });
    $('#et').onclick = endTurn; if ($('#cx')) $('#cx').onclick = function () { CB.sel = null; renderCombat(); };
    $('#pd').onclick = function () { pileModal('Draw pile (shuffled)', P.draw.slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; })); }; $('#pdi').onclick = function () { pileModal('Discard pile', P.disc); };
    bindHud();
  }
  function intentTxt(e) { var m = e.intent || {}; if (m.k === 'atk') return e.n + ' will attack for ' + dmgCalc(m.v, e, P) + (m.n > 1 ? ' × ' + m.n : '') + '.'; if (m.k === 'blk') return e.n + ' will defend.'; if (m.k === 'buf') return e.n + ' grows stronger.'; if (m.k === 'deb') return e.n + ' will curse you with ' + (m.s === 'weak' ? 'Weak' : 'Vulnerable') + '.'; if (m.k === 'add') return e.n + ' will put ' + C[m.c].n + ' cards into your deck.'; if (m.k === 'dis') return e.n + ' will swallow the sea: you lose your next cards and take damage.'; if (m.k === 'stun') return e.n + ' is stunned.'; return ''; }
  function bar(u) { return '<div class="od-hp"><i style="width:' + Math.max(0, u.hp / u.max * 100) + '%"></i><span>' + Math.max(0, u.hp) + '/' + u.max + (u.block ? ' · 🛡️' + u.block : '') + '</span></div>'; }
  function stat(u) { var s = []; if (u.str) s.push('<span title="Strength: more damage">💪' + u.str + '</span>'); if (u.weak) s.push('<span title="Weak: deals 25% less damage">🥀' + u.weak + '</span>'); if (u.vuln) s.push('<span title="Vulnerable: takes 50% more damage">💔' + u.vuln + '</span>'); if (u.art) s.push('<span title="Artifact: blocks the next debuff">✨' + u.art + '</span>'); if (u === P && P.favour) s.push('<span title="Athena’s favour">🦉' + P.favour + '</span>'); if (u === P && P.crew) s.push('<span title="Crew of Ithaca">⛵' + P.crew + '</span>'); return '<div class="od-st">' + s.join('') + '</div>'; }
  function cardHTML(k, attr, cls, n, i) {
    var D = C[k.id], rot = n ? (i - (n - 1) / 2) * Math.min(5, 26 / n) : 0;
    return '<button class="od-card t-' + D.t + ' r' + D.r + (cls || '') + '" ' + attr + ' style="--r:' + rot + 'deg"><span class="od-cost">' + (D.c < 0 ? '' : cost(k)) + '</span><b>' + esc(cname(k)) + '</b><i>' + ({ attack: 'Attack', skill: 'Skill', power: 'Power', curse: 'Curse' })[D.t] + '</i><span class="od-art">' + (ART[k.id] || '') + '</span><span class="od-d">' + cdesc(k) + (D.ex && D.d.indexOf('Exhaust') < 0 ? ' Exhaust.' : '') + '</span></button>';
  }
  function fxDmg(e, d, b) { setTimeout(function () { var el = $('#foe' + e.idx); if (!el) return; var f = document.createElement('div'); f.className = 'od-float'; f.textContent = d ? '−' + d : b ? 'blocked' : '0'; el.appendChild(f); el.classList.add('hit'); }, 20); }
  function fxText(e, t) { setTimeout(function () { var el = $('#foe' + e.idx); if (!el) return; var f = document.createElement('div'); f.className = 'od-float g'; f.textContent = t; el.appendChild(f); }, 20); }
  function pulse(e) { setTimeout(function () { var el = $('#foe' + e.idx); if (el) el.classList.add('lunge'); }, 10); }
  function shakeP() { setTimeout(function () { var el = $('#me'); if (el) el.classList.add('hit'); }, 20); }
  function toast(t) { Kit.toast(t); }
  function pileModal(t, list) { Kit.modal('<h2>' + t + '</h2><div class="od-choice small">' + (list.length ? list.map(function (k) { return cardHTML(k, ''); }).join('') : '<p>Empty.</p>') + '</div><div class="krow"><button class="btn" data-close>Close</button></div>'); }

  /* ---------- rest, shop, treasure, events ---------- */
  function rest() {
    var h = Math.round(RUN.max * .3);
    main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>🔥 Camp on the shore</h2><p>The crew pulls the ship up on the beach, kills a few goats and pours a libation of wine.</p><div class="od-two"><button class="btn gold" id="r-heal">Rest: heal ' + h + ' HP</button><button class="btn" id="r-up">Sharpen: upgrade a card</button></div></div>';
    $('#r-heal').onclick = function () { RUN.hp = Math.min(RUN.max, RUN.hp + h); save(); showMap(); };
    $('#r-up').onclick = function () { choose('Upgrade a card', RUN.deck.filter(function (k) { return !k.u && C[k.id].t !== 'curse'; }), function (k) { k.u = 1; save(); showMap(); }); };
    bindHud();
  }
  function choose(title, list, f, cancel) {
    Kit.modal('<h2>' + title + '</h2><div class="od-choice small">' + list.map(function (k, i) { return cardHTML(k, 'data-ch="' + i + '"'); }).join('') + '</div><div class="krow"><button class="btn ghost" data-close>Cancel</button></div>');
    Kit.$$('[data-ch]').forEach(function (b) { b.onclick = function () { Kit.closeModal(); f(list[+b.dataset.ch]); }; });
  }
  function shop() {
    var cards = cardChoices(.6).concat(cardChoices(.3)).slice(0, 5), rel = [newRelic(), newRelic()].filter(function (r, i, a) { return r && a.indexOf(r) === i; });
    var cp = cards.map(function (k) { return [50, 50, 80, 140][C[k.id].r] + rnd(15) + (k.u ? 30 : 0); }), rp = rel.map(function () { return 150 + rnd(60); }), removeP = 75;
    function render() {
      main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>⚖️ A Phoenician trader</h2><p class="mute">“The finest things from Sidon, my friend. For you, a special price.”</p><div class="od-choice">' + cards.map(function (k, i) { return k ? '<div class="od-buy">' + cardHTML(k, 'data-b="' + i + '"', RUN.gold < cp[i] ? ' no' : '') + '<span>' + cp[i] + ' dr</span></div>' : ''; }).join('') + '</div>' +
        '<div class="od-rels">' + rel.map(function (r, i) { return r ? '<button class="od-rel" data-r="' + i + '"' + (RUN.gold < rp[i] ? ' disabled' : '') + '>' + REL[r].i + ' <b>' + REL[r].n + '</b><small>' + REL[r].d + '</small><span>' + rp[i] + ' dr</span></button>' : ''; }).join('') + '<button class="od-rel" id="s-rm"' + (RUN.gold < removeP ? ' disabled' : '') + '>🗑️ <b>Forget a card</b><small>Remove one card from your deck.</small><span>' + removeP + ' dr</span></button></div><div class="krow"><button class="btn gold" id="s-out">Leave</button></div></div>';
      Kit.$$('[data-b]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.b; if (RUN.gold < cp[i]) return; RUN.gold -= cp[i]; RUN.deck.push(cards[i]); cards[i] = null; Kit.sfx.good(); render(); }; });
      Kit.$$('[data-r]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.r; if (RUN.gold < rp[i]) return; RUN.gold -= rp[i]; RUN.rel.push(rel[i]); if (rel[i] === 'leucothea') { RUN.max += 10; RUN.hp += 10; } rel[i] = null; Kit.sfx.good(); render(); }; });
      $('#s-rm').onclick = function () { choose('Forget which card?', RUN.deck, function (k) { RUN.deck.splice(RUN.deck.indexOf(k), 1); RUN.gold -= removeP; removeP += 25; render(); }); };
      $('#s-out').onclick = function () { save(); showMap(); }; bindHud();
    }
    render();
  }
  function treasure() { var r = newRelic(), g = 40 + rnd(40); RUN.gold += g; if (r) { RUN.rel.push(r); if (r === 'leucothea') { RUN.max += 10; RUN.hp += 10; } } main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>🏺 Treasure</h2><p>A chest washed up on the shore: ' + g + ' drachmae' + (r ? ' and <b>' + REL[r].i + ' ' + REL[r].n + '</b>: ' + REL[r].d : '') + '.</p><div class="krow"><button class="btn gold" id="t-ok">Onward</button></div></div>'; $('#t-ok').onclick = function () { save(); showMap(); }; bindHud(); }
  var EVENTS = [
    { id: 'aeolus', act: [0, 1], t: '👜 The island of Aeolus', x: 'Aeolus, keeper of the winds, gives you an ox-hide bag with every wind tied up inside except the west wind that will carry you home. Ithaca is in sight when you fall asleep. Your crew thinks the bag is full of gold.', c: [['Guard the bag', function () { if (!has('bag')) RUN.rel.push('bag'); return 'You never sleep. You gain Aeolus’ Bag.'; }], ['Let them open it', function () { RUN.gold += 90; RUN.hp = Math.max(1, RUN.hp - 8); return 'The winds burst out and blow you all the way back. In the chaos you find 90 drachmae, and lose 8 HP.'; }]] },
    { id: 'hermes', act: [1], t: '🪽 Hermes on the path', x: 'On the way to Circe’s hall, a young man with a golden wand stops you. It is Hermes. He pulls a plant out of the ground: black root, milk-white flower. The gods call it moly.', c: [['Take the moly', function () { RUN.deck.push(card('moly')); return 'You add Moly to your deck.'; }], ['Ask for his sandals instead', function () { if (R() < .5) { RUN.rel.push('sandals'); return 'He laughs and gives you a pair. Sandals of Hermes!'; } RUN.hp = Math.max(1, RUN.hp - 6); return 'He laughs and vanishes. You trip on a root: −6 HP.'; }]] },
    { id: 'lotus', act: [0], t: '🪷 The Lotus fields', x: 'The flowers smell sweet. Your men are lying in the meadow, smiling, and they do not want to leave.', c: [['Eat the lotus', function () { RUN.hp = Math.min(RUN.max, RUN.hp + 20); RUN.deck.push(card('lotus')); return 'You heal 20 HP, but you forget something important. A Lotus curse joins your deck.'; }], ['Drag the men back to the ships', function () { RUN.max += 3; RUN.hp += 3; return 'Hard work. +3 max HP.'; }]] },
    { id: 'tiresias', act: [1, 2], t: '🦯 The land of the dead', x: 'You dig a pit, pour honey, milk, wine and water, and the blood of a ram. The shades crowd round. The blind prophet Tiresias drinks and speaks. Your mother is there too, and Achilles, who says he would rather be a poor man’s slave on earth than king of all the dead.', c: [['Ask Tiresias the way', function () { if (!has('tiresias')) RUN.rel.push('tiresias'); RUN.hp = Math.max(1, RUN.hp - 10); return 'He tells you everything, and it costs you: −10 HP. You gain Tiresias’ Staff.'; }], ['Speak with your mother', function () { RUN.hp = RUN.max; return 'She died of longing for you. You try three times to hold her. You heal fully.'; }], ['Let Achilles forget a card for you', function () { return 'remove'; }]] },
    { id: 'cattle', act: [2], t: '🐂 The cattle of the Sun', x: 'Stormbound on Thrinacia, the crew are starving. Tiresias and Circe both warned you: do not touch the cattle of Helios.', c: [['Let them feast', function () { RUN.hp = RUN.max; RUN.deck.push(card('wrath')); RUN.deck.push(card('wrath')); return 'The hides crawl, the meat moos on the spits. You heal fully, but Zeus will strike the ship: two Wrath of Helios curses.'; }], ['Go hungry', function () { RUN.max += 5; RUN.hp = Math.min(RUN.max, RUN.hp + 5); return '+5 max HP. You alone will be spared.'; }]] },
    { id: 'calypso', act: [2], t: '🏝️ Calypso’s island', x: 'The nymph Calypso offers to make you immortal if you stay with her for ever. You have already been here seven years.', c: [['Build a raft and go', function () { RUN.deck.push(card(pick(['boar', 'fury', 'horse', 'favour']), 1)); return 'You take an axe and build your raft in four days. A hardened card joins your deck.'; }], ['Stay a little longer', function () { RUN.hp = RUN.max; RUN.gold = Math.max(0, RUN.gold - 40); return 'You heal fully, and lose 40 drachmae somewhere in the sand.'; }]] },
    { id: 'nausicaa', act: [2], t: '👸 Nausicaa', x: 'Washed up naked on the Phaeacian shore, you wake to girls playing ball. The princess Nausicaa does not run. She gives you clothes and tells you how to win the help of her parents.', c: [['Ask for gifts', function () { RUN.gold += 120; return 'The Phaeacians load you with treasure: +120 drachmae.'; }], ['Ask for a ship home', function () { RUN.hp = RUN.max; return 'Their magic ships need no helmsman. You heal fully.'; }]] },
    { id: 'elpenor', act: [1], t: '🍷 Elpenor’s fall', x: 'Elpenor, the youngest of the crew, slept drunk on Circe’s roof and, waking in a hurry, forgot the ladder.', c: [['Give him a proper burial', function () { RUN.max += 4; RUN.hp += 4; return 'You plant his oar on his tomb by the sea. +4 max HP.'; }], ['There is no time', function () { RUN.gold += 30; return '+30 drachmae from his kit. His ghost will reproach you in the underworld.'; }]] },
    { id: 'ajax', act: [0, 1, 2], t: '🛡️ The armour of Achilles', x: 'You remember the contest after Achilles died. You and Ajax both claimed his armour, and the Greeks gave it to you. Ajax never forgave you.', c: [['Wear it', function () { if (!has('armour')) RUN.rel.push('armour'); return 'You gain the Armour of Achilles.'; }], ['Sell it to a trader', function () { RUN.gold += 150; return '+150 drachmae.'; }]] },
    { id: 'eurylochus', act: [0, 1, 2], t: '⛵ Eurylochus speaks', x: '“You are made of iron, Odysseus. Your crew is worn out and you will not let us land.” The men mutter.', c: [['Let them rest ashore', function () { RUN.hp = Math.min(RUN.max, RUN.hp + 12); return 'They sleep, and so do you. +12 HP.'; }], ['Drill them hard', function () { RUN.deck.push(card(pick(['sword', 'arrows', 'feint', 'oar']))); RUN.hp = Math.max(1, RUN.hp - 5); return 'They grumble but they learn. A new attack joins your deck. −5 HP.'; }]] }
  ];
  function event() {
    var list = EVENTS.filter(function (e) { return e.act.indexOf(RUN.act) >= 0 && !(RUN.evDone || []).includes(e.id); });
    if (!list.length || R() < .2) { var g = R() < .5; if (g) { fight(pick(ACTS[RUN.act].fights)); return; } list = EVENTS.filter(function (e) { return e.act.indexOf(RUN.act) >= 0; }); }
    var ev = pick(list); RUN.evDone = (RUN.evDone || []).concat([ev.id]);
    main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>' + ev.t + '</h2><p class="od-tale">' + ev.x + '</p><div class="od-two">' + ev.c.map(function (c, i) { return '<button class="btn' + (i ? ' ghost' : ' gold') + '" data-ev="' + i + '">' + c[0] + '</button>'; }).join('') + '</div></div>';
    Kit.$$('[data-ev]').forEach(function (b) { b.onclick = function () { var r = ev.c[+b.dataset.ev][1](); if (r === 'remove') { choose('Which card should Achilles take to the dead?', RUN.deck, function (k) { RUN.deck.splice(RUN.deck.indexOf(k), 1); after('He takes ' + C[k.id].n + ' down to Hades.'); }); return; } after(r); }; });
    bindHud();
    function after(t) { main.innerHTML = hudHTML() + '<div class="od-panel card"><h2>' + ev.t + '</h2><p>' + t + '</p><div class="krow"><button class="btn gold" id="ev-ok">Onward</button></div></div>'; $('#ev-ok').onclick = function () { save(); showMap(); }; bindHud(); save(); }
  }

  /* ---------- hud and screens ---------- */
  function hudHTML() { var hp = CB ? P.hp : RUN.hp, max = CB ? P.max : RUN.max; return '<div class="od-hud"><span>❤️ <b>' + Math.max(0, hp) + '/' + max + '</b></span><span>🪙 <b>' + RUN.gold + '</b></span><span>🗺️ Voyage ' + (RUN.act + 1) + ' · ' + (RUN.floor + 1) + '/' + FLOORS + '</span>' + (RUN.asc ? '<span>🔱 Wrath ' + RUN.asc + '</span>' : '') + '<span class="od-relbar">' + RUN.rel.map(function (r) { return '<i title="' + REL[r].n + ': ' + REL[r].d + '">' + REL[r].i + '</i>'; }).join('') + '</span></div>'; }
  function bindHud() { Kit.$$('.od-relbar i').forEach(function (i) { i.onclick = function () { Kit.toast(i.title); }; }); }
  function save() { if (RUN && !CB) Kit.store.set('od-run', RUN); }
  function title() {
    var sv = Kit.store.get('od-run', null), asc = Kit.store.get('od-asc', 0), best = Kit.store.get('od-best', 0);
    main.innerHTML = '<div class="od-title"><div class="od-logo">🏛️ ⛵ 🏹</div><h1>Odyssey: the Deck</h1><p class="od-tale">Tell me, Muse, of the man of many turns, who wandered far after he sacked the holy citadel of Troy…</p><div class="krow" style="justify-content:center">' + (sv ? '<button class="btn gold" id="t-cont">Continue the voyage</button>' : '') + '<button class="btn' + (sv ? ' ghost' : ' gold') + '" id="t-new">New voyage</button>' + (asc ? '<select id="t-asc">' + Array.from({ length: Math.min(asc, 5) + 1 }, function (_, i) { return '<option value="' + i + '">' + (i ? 'Wrath of Poseidon ' + i : 'Normal') + '</option>'; }).join('') + '</select>' : '') + '</div><p class="mute small">' + (best ? 'Best score ' + Math.round(best) + ' · ' : '') + 'Codex: ' + Object.keys(Kit.store.get('od-codex', {})).length + ' stories found</p><button class="btn ghost" id="t-codex">📜 Stories of the Odyssey</button></div>';
    if ($('#t-cont')) $('#t-cont').onclick = function () { RUN = sv; showMap(); };
    $('#t-new').onclick = function () { newRun($('#t-asc') ? +$('#t-asc').value : 0); };
    $('#t-codex').onclick = codex;
  }
  function codex() {
    var seen = Kit.store.get('od-codex', {}); if (RUN) Object.keys(RUN.seen || {}).forEach(function (k) { seen[k] = 1; }); Kit.store.set('od-codex', seen);
    var ks = Object.keys(E).filter(function (k) { return E[k].h; });
    Kit.modal('<h2>📜 Stories of the Odyssey</h2>' + ks.map(function (k) { return seen[k] ? '<details><summary>' + E[k].i + ' <b>' + E[k].n + '</b></summary><p>' + E[k].h + '</p></details>' : '<p class="mute">❔ Meet this foe to unlock the story.</p>'; }).join('') + '<div class="krow"><button class="btn" data-close>Close</button></div>');
  }
  function deckModal() { if (!RUN) return; pileModal('Your deck (' + RUN.deck.length + ')', RUN.deck.slice().sort(function (a, b) { return C[a.id].t < C[b.id].t ? -1 : 1; })); }
  function help() { Kit.modal('<h2>How to play</h2><p>Guide Odysseus home through three voyages. Pick a path on the map; fight, rest, trade and meet the gods.</p><ul class="small"><li>Each turn you have <b>3 energy</b> and draw 5 cards. The number on a card is its cost.</li><li>Attacks deal damage; Skills give block and tricks; Powers last the whole fight.</li><li><b>Block</b> soaks up damage and disappears at the start of your next turn.</li><li>Above each enemy is its <b>intent</b>: what it will do next. 🗡️ attack, 🛡️ defend, 💪 grow stronger, ☠️ curse you, 🃏 add bad cards.</li><li>🥀 Weak deals 25% less damage. 💔 Vulnerable takes 50% more. 💪 Strength adds to every hit.</li><li>After a battle, add a card. A smaller, sharper deck is often better: forget cards at the trader.</li><li>The Olive-wood Stake blinds giants. Wax and Moly clear curses.</li></ul><div class="krow"><button class="btn gold" data-close>Sing, Muse</button></div>'); }
  $('#b-deck').onclick = deckModal; $('#b-help').onclick = help;
  $('#b-snd').onclick = function () { $('#b-snd').textContent = Kit.sfx.toggle() ? '🔊' : '🔇'; }; if (!Kit.sfx.on) $('#b-snd').textContent = '🔇';
  window.addEventListener('keydown', function (e) { if (!CB || Kit._m) return; if (e.key === 'e' || e.key === 'Enter') endTurn(); var n = parseInt(e.key, 10); if (n >= 1 && n <= 9 && P.hand[n - 1]) play(P.hand[n - 1]); if (e.key === 'Escape' && CB.sel) { CB.sel = null; renderCombat(); } });
  // the codex learns the stories of the foes you have met
  setInterval(function () { if (RUN && RUN.seen) { var s = Kit.store.get('od-codex', {}), ch = false; Object.keys(RUN.seen).forEach(function (k) { if (!s[k]) { s[k] = 1; ch = true; } }); if (ch) Kit.store.set('od-codex', s); } }, 3000);
  title(); if (!Kit.store.get('od-seen', 0)) { Kit.store.set('od-seen', 1); help(); }
  window.OD = { get RUN() { return RUN; }, get P() { return P; }, get CB() { return CB; }, newRun: newRun, enter: enter, play: play, endTurn: endTurn, fight: fight, C: C };
})();
