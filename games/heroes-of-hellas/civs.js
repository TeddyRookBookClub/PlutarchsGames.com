'use strict';
/* Heroes of Hellas: the Norse and the Irish.
   Three peoples share one engine. Each player has a civ ('greek', 'norse', 'irish'); a civ renames the shared
   buildings and ages, decides what each building trains, and brings its own gods, god powers and myth units.
   Also here: the Norse and Irish campaigns, their Codex entries, and Old Norse and Old Irish words.
   Old Norse is given in normalised Old Icelandic spelling; Old Irish in the standard spelling of the Dictionary
   of the Irish Language (eDIL). Short phrases are kept to simple, well-attested forms. */

/* ---------- new units ---------- */
Object.assign(UNITS, {
  // Greeks: a myth unit from the temple
  centaur: { name: 'Centaur', icon: '🏹', hp: 260, atk: 11, armor: 1, range: 5, speed: 2.2, sight: 7, cost: { food: 80, gold: 90, favor: 20 }, time: 24, pop: 2, cd: 1.7, missile: 'arrow', age: 2, myth: true, bonus: { infantry: 1.4 },
    info: 'Half man, half horse: the wise Chiron, teacher of heroes, was a centaur. Shoots fast from horseback.' },
  // Norse
  huskarl: { name: 'Húskarl', icon: '🪓', hp: 75, atk: 7, armor: 2, range: .9, speed: 1.4, sight: 4, cost: { food: 50, gold: 30 }, time: 15, pop: 1, cd: 1.4, bonus: { archer: 2, myth: 1.2 },
    info: 'A chieftain\'s sworn household warrior, with axe and round shield. Shrugs off arrows; beats archers.' },
  berserkr: { name: 'Berserkr', icon: '🐻', hp: 85, atk: 11, armor: 0, range: .9, speed: 1.65, sight: 4, cost: { food: 70, gold: 45 }, time: 18, pop: 1, cd: 1.3, age: 1, bonus: { infantry: 1.3 },
    info: '"Bear-shirt": a warrior who fought in a frenzy, said to feel neither fire nor iron. Hits hard, wears no armour.' },
  bowman: { name: 'Bogmaðr', icon: '🏹', hp: 34, atk: 5, armor: 0, range: 5.5, speed: 1.45, sight: 6.5, cost: { wood: 40, gold: 30 }, time: 14, pop: 1, cd: 1.9, missile: 'arrow', age: 1, bonus: { infantry: 1.4 },
    info: 'A Norse bowman. Yew bows like those found in the Hedeby harbour shot as far as any in Europe.' },
  raider: { name: 'Reiðmaðr', icon: '🐎', hp: 95, atk: 8, armor: 1, range: .9, speed: 2.5, sight: 5, cost: { food: 80, gold: 55 }, time: 20, pop: 2, cd: 1.6, age: 1, bonus: { archer: 2, siege: 2 }, type: 'cavalry',
    info: 'A rider. The Norse raided on stolen horses as often as by ship.' },
  troll: { name: 'Troll', icon: '🧌', hp: 600, atk: 18, armor: 2, range: 1, speed: 1.2, sight: 5, cost: { food: 120, gold: 80, favor: 25 }, time: 30, pop: 3, cd: 2, age: 2, myth: true, regen: 3, bonus: { building: 1.8 },
    info: 'Huge, slow and hard to kill. Trolls of the old stories lived in mountains and turned to stone in sunlight.' },
  // Irish
  fian: { name: 'Fénnid', icon: '🗡️', hp: 65, atk: 7, armor: 1, range: .9, speed: 1.55, sight: 4.5, cost: { food: 55, gold: 20 }, time: 14, pop: 1, cd: 1.3, bonus: { cavalry: 2, myth: 1.2 },
    info: 'A warrior of a fían, a band of young hunter-fighters. Spear and light shield; quick and cheap.' },
  curad: { name: 'Caur', icon: '🛡️', hp: 115, atk: 10, armor: 2, range: .9, speed: 1.4, sight: 4.5, cost: { food: 80, gold: 60 }, time: 20, pop: 1, cd: 1.4, age: 1, bonus: { infantry: 1.3, myth: 1.4 },
    info: 'A champion of the Red Branch. In the sagas, champions quarrelled over the "hero\'s portion" at every feast.' },
  slinger: { name: 'Tailmech', icon: '🪨', hp: 30, atk: 5, armor: 0, range: 5, speed: 1.55, sight: 6.5, cost: { food: 30, wood: 30 }, time: 12, pop: 1, cd: 1.7, missile: 'arrow', age: 1, bonus: { archer: 1.6, infantry: 1.2 },
    info: 'A slinger (tailm, "sling"). Cú Chulainn killed birds on the wing with his sling, and Lugh killed Balor with one.' },
  chariot: { name: 'Carpat', icon: '🛞', hp: 125, atk: 9, armor: 1, range: .9, speed: 2.4, sight: 5.5, cost: { wood: 80, gold: 60 }, time: 22, pop: 2, cd: 1.5, age: 1, bonus: { archer: 2.2, infantry: 1.2 }, type: 'cavalry',
    info: 'A war chariot with a driver and a warrior. The heroes of Ulster fought from chariots long after the rest of Europe had given them up.' },
  druid: { name: 'Druí', icon: '🌿', hp: 45, atk: 6, armor: 0, range: 5, speed: 1.5, sight: 7, cost: { food: 40, gold: 60 }, time: 18, pop: 1, cd: 2, missile: 'magic', age: 1, healer: 2.2,
    info: 'A druid: priest, judge, scholar and seer. Heals your people nearby and casts at enemies.' },
  aossi: { name: 'Áes síde', icon: '✨', hp: 270, atk: 14, armor: 1, range: .9, speed: 2.2, sight: 6, cost: { food: 60, gold: 90, favor: 20 }, time: 22, pop: 2, cd: 1.1, age: 2, myth: true, bonus: { infantry: 1.3 },
    info: '"The people of the mounds": the Otherworld folk who live inside the hills, later called the fairies.' },
  // Norse heroes
  thor: { name: 'Thor', icon: '🔨', hp: 440, atk: 25, armor: 4, range: .9, speed: 1.7, sight: 6, hero: true, cd: 1.4, bonus: { myth: 3 }, regen: 1.6, splash: 1.2, info: 'Þórr, the thunder god, defender of gods and men against the giants.' },
  loki: { name: 'Loki', icon: '🦊', hp: 190, atk: 10, armor: 1, range: 5, speed: 2, sight: 7, hero: true, cd: 1.5, missile: 'magic', bonus: { myth: 3 }, regen: 1.5, info: 'The trickster, a giant\'s son living among the gods. Clever, faithless, often the cause of trouble and sometimes the cure.' },
  sigurd: { name: 'Sigurd', icon: '⚔️', hp: 330, atk: 19, armor: 3, range: .9, speed: 1.9, sight: 6, hero: true, cd: 1.2, bonus: { myth: 3 }, regen: 1.3, info: 'Sigurðr Fáfnisbani, "Fáfnir\'s bane", the greatest hero of the North.' },
  odin: { name: 'Odin', icon: '🐦‍⬛', hp: 320, atk: 14, armor: 3, range: 5, speed: 1.8, sight: 9, hero: true, cd: 1.6, missile: 'magic', bonus: { myth: 3 }, regen: 1.5, info: 'Óðinn the All-father, with one eye, a broad hat and the spear Gungnir.' },
  vidarr: { name: 'Víðarr', icon: '👢', hp: 360, atk: 22, armor: 4, range: .9, speed: 1.8, sight: 6, hero: true, cd: 1.3, bonus: { myth: 3 }, regen: 1.4, info: 'The silent god, Odin\'s son. Fated to avenge his father on the wolf Fenrir.' },
  // Irish heroes
  lugh: { name: 'Lugh', icon: '☀️', hp: 340, atk: 17, armor: 3, range: 5, speed: 1.9, sight: 7, hero: true, cd: 1.3, missile: 'arrow', bonus: { myth: 3 }, regen: 1.5, gazeImmune: true, info: 'Lug Samildánach, "skilled in all the arts", grandson of Balor himself.' },
  nuada: { name: 'Nuada', icon: '🦾', hp: 380, atk: 20, armor: 4, range: .9, speed: 1.7, sight: 6, hero: true, cd: 1.3, bonus: { myth: 3 }, regen: 1.4, info: 'King of the Tuatha Dé Danann. He lost his arm in battle and Dian Cécht made him one of silver.' },
  dagda: { name: 'The Dagda', icon: '🏏', hp: 480, atk: 22, armor: 3, range: 1, speed: 1.5, sight: 6, hero: true, cd: 1.6, bonus: { myth: 3 }, regen: 2, splash: 1.3, info: 'The "good god", with a club that kills with one end and brings back to life with the other.' },
  cuchulainn: { name: 'Cú Chulainn', icon: '🐕', hp: 380, atk: 22, armor: 3, range: .9, speed: 2.1, sight: 6.5, hero: true, cd: 1.1, bonus: { myth: 3, infantry: 1.3 }, regen: 1.6, info: 'The Hound of Culann, champion of Ulster. In battle the ríastrad, his "warp-spasm", turns him into a monster.' },
  // Norse foes
  jotunn: { name: 'Jǫtunn', icon: '🧊', hp: 520, atk: 18, armor: 2, range: 1.2, speed: 1.1, sight: 6, myth: true, cd: 2.2, info: 'A giant of Jǫtunheimr, old enemy of the gods.' },
  thrym: { name: 'Þrymr', icon: '👑', hp: 1300, atk: 26, armor: 3, range: 1.2, speed: 1.1, sight: 6, myth: true, cd: 2, info: 'Lord of the giants, who stole Thor\'s hammer and demanded Freyja as his bride.' },
  draugr: { name: 'Draugr', icon: '💀', hp: 48, atk: 6, armor: 1, range: .9, speed: 1.3, sight: 5, myth: true, cd: 1.4, info: 'A dead man who walks again, guarding his grave mound.' },
  fenrir: { name: 'Fenrir', icon: '🐺', hp: 1500, atk: 26, armor: 3, range: 1, speed: 2.1, sight: 7, myth: true, cd: 1.4, charge: true, info: 'The great wolf, Loki\'s son, who will swallow Odin at Ragnarǫk.' },
  jormungandr: { name: 'Jǫrmungandr', icon: '🐍', hp: 1900, atk: 22, armor: 3, range: 3.2, speed: .7, sight: 7, myth: true, cd: 2.2, missile: 'fire', splash: 1.6, info: 'The Midgard Serpent, so long it circles the whole world and bites its own tail.' },
  surtr: { name: 'Surtr', icon: '🔥', hp: 1700, atk: 24, armor: 3, range: 3.5, speed: .9, sight: 7, myth: true, cd: 2, missile: 'fire', splash: 1.8, info: 'The fire giant of Múspellsheimr, whose flaming sword will burn the world.' },
  fafnir: { name: 'Fáfnir', icon: '🐉', hp: 1300, atk: 21, armor: 4, range: 3.2, speed: .7, sight: 6, myth: true, cd: 2.3, missile: 'fire', splash: 1.6, info: 'Once a man, Regin\'s brother, who killed his father for a hoard of cursed gold and became a dragon to guard it.' },
  // Irish foes and creatures
  fomor: { name: 'Fomóire', icon: '👹', hp: 300, atk: 14, armor: 2, range: 1, speed: 1.3, sight: 5, myth: true, cd: 1.7, info: 'A Fomorian: one of the misshapen sea-raiders who oppressed Ireland before the Tuatha Dé rose against them.' },
  balor: { name: 'Balor', icon: '👁️', hp: 1700, atk: 18, armor: 3, range: 6, speed: .55, sight: 9, myth: true, cd: 3.2, missile: 'gaze', burnGaze: true, info: 'King of the Fomorians. Four men lifted his eyelid with a polished handle; whatever the eye looked on was destroyed.' },
  hound: { name: 'Culann\'s hound', icon: '🐕‍🦺', hp: 700, atk: 20, armor: 2, range: 1, speed: 2.3, sight: 7, myth: true, cd: 1.2, charge: true, info: 'The smith Culann\'s great guard dog, which took three chains to hold.' },
  nechtan: { name: 'Son of Nechtan', icon: '⚔️', hp: 380, atk: 17, armor: 3, range: .9, speed: 1.8, sight: 6, hero: true, cd: 1.3, bonus: { infantry: 1.2 }, info: 'One of the three sons of Nechtan Scéne, who boasted they had killed more Ulstermen than were left alive.' },
  ferdiad: { name: 'Fer Diad', icon: '🛡️', hp: 900, atk: 21, armor: 6, range: .9, speed: 1.6, sight: 6, hero: true, cd: 1.3, bonus: { infantry: 1.2 }, info: 'Cú Chulainn\'s foster-brother, who wore a skin of horn no weapon could pierce. Medb shamed him into fighting his friend.' },
  bull: { name: 'Donn Cúailnge', icon: '🐂', hp: 1400, atk: 0, armor: 4, range: 0, speed: 1.2, sight: 4, cd: 9, noAttack: true, civ: true, info: 'The Brown Bull of Cooley, the greatest bull in Ireland, which fifty boys could play on its back.' },
});
for (const k in UNITS) { const u = UNITS[k]; u.id = k; if (!u.type) u.type = u.myth ? 'myth' : u.missile && !u.hero ? 'archer' : u.civ ? 'civ' : 'infantry'; }

/* ---------- the three peoples ---------- */
const CIVS = {
  greek: {
    name: 'Greeks', adj: 'Greek', lang: 'Homeric Greek', ages: ['Archaic Age', 'Classical Age', 'Heroic Age'], inf: 'hoplite',
    trains: { temple: ['centaur'] }, names: {}, icons: {}, villager: 'Villager',
    powers: null, // filled from POWER_ORDER below
  },
  norse: {
    name: 'Norse', adj: 'Norse', lang: 'Old Norse', ages: ['Age of Settlement', 'Age of Raids', 'Age of the Gods'], inf: 'huskarl',
    trains: { barracks: ['huskarl', 'berserkr', 'ram'], range: ['bowman'], stable: ['raider'], temple: ['troll'], palace: ['huskarl'], ruin: ['huskarl', 'berserkr'] },
    names: { agora: 'Longhouse', house: 'Turf house', storehouse: 'Storehouse', farm: 'Field', barracks: 'Warriors\' hall', range: 'Archery butts', stable: 'Horse pen', temple: 'Hof', tower: 'Watchtower', wall: 'Palisade' },
    icons: { agora: '🛖', temple: 'ᛟ', barracks: '🪓' }, villager: 'Bóndi',
    info: { agora: 'The chieftain\'s hall. Trains bœndr (farmers), takes every resource, and shoots at raiders.', temple: 'A hof, a temple of the old gods. Earns favour, heals your people, and in the Age of the Gods calls up trolls.', barracks: 'Trains húskarlar and berserkir, and rams in the Age of the Gods.' },
    powers: ['ravens', 'mjolnir', 'freyr', 'frigg', 'tyr', 'njord', 'heimdall', 'freyja', 'eir', 'idunn', 'loki', 'hel'],
  },
  irish: {
    name: 'Irish', adj: 'Irish', lang: 'Old Irish', ages: ['Age of the Ráth', 'Age of the Champions', 'Age of the Otherworld'], inf: 'fian',
    trains: { barracks: ['fian', 'curad', 'ram'], range: ['slinger'], stable: ['chariot'], temple: ['druid', 'aossi'], palace: ['fian'], ruin: ['fian', 'curad'] },
    names: { agora: 'Ringfort', house: 'Roundhouse', storehouse: 'Storehouse', farm: 'Field', barracks: 'Red Branch hall', range: 'Slingers\' yard', stable: 'Chariot shed', temple: 'Sacred grove', tower: 'Watchtower', wall: 'Palisade' },
    icons: { agora: '⭕', temple: '🌳', stable: '🛞', range: '🪨' }, villager: 'Aithech',
    info: { agora: 'A ráth: a round earth bank and palisade around the chief\'s house. Trains farmers, takes every resource, and shoots at raiders.', temple: 'A fidnemed, a sacred grove. Earns favour, heals your people, trains druids, and in the Age of the Otherworld calls the áes síde.', barracks: 'The hall of the Red Branch (Cráebrúad) of Ulster. Trains fénnidi and champions.' },
    powers: ['dagda', 'lugh', 'brigid', 'diancecht', 'morrigan', 'manannan', 'nuada', 'goibniu', 'danu', 'ogma'],
  },
  // enemies only
  jotun: { name: 'Jǫtnar', adj: 'giant', ages: ['the old age', 'the old age', 'the old age'], inf: 'jotunn', trains: { palace: ['jotunn', 'draugr'], ruin: ['draugr', 'jotunn'], barracks: ['draugr'] }, names: { ruin: 'Giants\' camp', palace: 'Hall of the giants' }, icons: {}, powers: [] },
  fomori: { name: 'Fomóire', adj: 'Fomorian', ages: ['the old age', 'the old age', 'the old age'], inf: 'fomor', trains: { palace: ['fomor'], ruin: ['fomor'], barracks: ['fomor'] }, names: { ruin: 'Fomorian camp', palace: 'Fort of the Fomóire' }, icons: {}, powers: [] },
};
CIVS.greek.powers = POWER_ORDER.slice();

/* ---------- god powers of the North and of Ireland ---------- */
// as: which existing effect a power uses (see usePower and extraPower)
Object.assign(POWERS, {
  ravens: { name: 'Odin\'s ravens', icon: '🐦‍⬛', favor: 25, as: 'ravens', god: 'odin', info: 'Huginn and Muninn ("Thought" and "Memory") fly over the world: the whole map is revealed.' },
  mjolnir: { name: 'Thor\'s hammer', icon: '🔨', favor: 45, target: true, radius: 2.4, dmg: 240, as: 'bolt', god: 'thor', info: 'Mjǫllnir strikes an area with lightning and returns to Thor\'s hand.' },
  freyr: { name: 'Freyr\'s harvest', icon: '🌾', favor: 30, as: 'harvest', god: 'freyr', info: 'Freyr rules rain and sunshine: gain 250 food at once.' },
  frigg: { name: 'Frigg\'s oath', icon: '🛡️', favor: 50, as: 'aegis', god: 'frigg', info: 'As Frigg made all things swear not to harm Baldr, your army takes no damage for 12 seconds.' },
  tyr: { name: 'Týr\'s courage', icon: '✋', favor: 45, as: 'fury', god: 'tyr', info: 'For 20 seconds your army strikes 50% harder.' },
  njord: { name: 'Njǫrðr\'s storm', icon: '🌊', favor: 60, target: true, radius: 3, dmg: 120, push: true, as: 'wave', god: 'njord', info: 'A wave from the sea god crashes through an area and hurls enemies aside.' },
  heimdall: { name: 'Gjallarhorn', icon: '📯', favor: 25, as: 'swift', god: 'heimdall', info: 'Heimdallr blows his horn: for 25 seconds all your units move 60% faster.' },
  freyja: { name: 'Freyja\'s love', icon: '💗', favor: 55, target: true, radius: 1.6, as: 'charm', god: 'freyja', info: 'An enemy soldier falls under Freyja\'s spell and changes sides.' },
  eir: { name: 'Eir\'s healing', icon: '🌿', favor: 35, as: 'heal', god: 'eir', info: 'Every one of your units is healed to full health.' },
  idunn: { name: 'Iðunn\'s apples', icon: '🍏', favor: 40, as: 'hera', god: 'idunn', info: 'Your heroes eat the apples of youth: healed and 20% stronger (once per game).' },
  loki: { name: 'Loki\'s trick', icon: '🎭', favor: 40, target: true, radius: 3, as: 'revel', god: 'loki', info: 'Enemies in the area are fooled and stand about for 10 seconds.' },
  hel: { name: 'Hel\'s host', icon: '💀', favor: 50, target: true, radius: 2, as: 'raise', spawn: 'draugr', god: 'hel', info: 'Five draugar rise from their mounds to fight for you.' },
  dagda: { name: 'The Dagda\'s cauldron', icon: '🍲', favor: 30, as: 'harvest', god: 'dagda', info: 'The cauldron no one leaves hungry: gain 250 food at once.' },
  lugh: { name: 'Lugh\'s spear', icon: '☀️', favor: 45, target: true, radius: 2.4, dmg: 240, as: 'bolt', god: 'lugh', info: 'The blazing spear of Lugh strikes an area.' },
  brigid: { name: 'Brigid\'s forge', icon: '🔨', favor: 30, as: 'forge', god: 'brigid', info: 'Brigid, goddess of smiths, mends all of your buildings.' },
  diancecht: { name: 'The well of Sláine', icon: '💧', favor: 35, as: 'heal', god: 'diancecht', info: 'Dian Cécht\'s healing well: every one of your units is healed to full health.' },
  morrigan: { name: 'The Morrígan\'s dread', icon: '🐦‍⬛', favor: 40, target: true, radius: 3, as: 'revel', god: 'morrigan', info: 'The war goddess shrieks over the enemy; they freeze in terror for 10 seconds.' },
  manannan: { name: 'Manannán\'s mist', icon: '🌫️', favor: 50, as: 'aegis', god: 'manannan', info: 'The sea god\'s cloak of mist hides your army: no damage for 12 seconds.' },
  nuada: { name: 'Nuada\'s silver hand', icon: '🦾', favor: 40, as: 'hera', god: 'nuada', info: 'Your heroes are healed and grow 20% stronger (once per game).' },
  goibniu: { name: 'Goibniu\'s weapons', icon: '⚒️', favor: 45, as: 'fury', god: 'goibniu', info: 'The smith god\'s spears never miss: for 20 seconds your army strikes 50% harder.' },
  danu: { name: 'The gift of Danu', icon: '🌍', favor: 60, as: 'hearth', god: 'danu', info: 'Room for 10 more people, for the rest of the game (once per game).' },
  ogma: { name: 'Ogma\'s eloquence', icon: '🗣️', favor: 55, target: true, radius: 1.6, as: 'charm', god: 'ogma', info: 'Ogma talks an enemy soldier round to your side.' },
});

/* ---------- civ helpers (used by the engine, the UI and the renderer) ---------- */
function civOf(pid) { const p = G && G.players && G.players[pid]; return (p && p.civ) || 'greek'; }
function CV(pid) { return CIVS[civOf(pid)] || CIVS.greek; }
function trainsOf(b) { const c = CV(b.owner), t = c.trains && c.trains[b.t]; if (t) return t; const base = BUILDINGS[b.t].trains || []; return civOf(b.owner) === 'greek' && b.t === 'temple' ? CIVS.greek.trains.temple : base; }
function bName(t, pid) { const c = CV(pid); return (c.names && c.names[t]) || BUILDINGS[t].name; }
function bIcon(t, pid) { const c = CV(pid); return (c.icons && c.icons[t]) || BUILDINGS[t].icon; }
function bInfo(t, pid) { const c = CV(pid); return (c.info && c.info[t]) || BUILDINGS[t].info; }
function uName(t, pid) { return t === 'villager' ? CV(pid).villager || 'Villager' : UNITS[t].name; }
function ageName(pid, a) { return CV(pid).ages[a == null ? P(pid).age : a]; }
function powersOf(pid) { return CV(pid).powers || []; }

/* ---------- gods ---------- */
const NORSE_GODS = [
  { id: 'odin', name: 'Odin', gr: 'Óðinn', tr: '', power: 'ravens', role: 'Chief of the Æsir: wisdom, poetry, war and the dead.', sym: 'Ravens, wolves, the spear Gungnir, the horse Sleipnir',
    text: 'Odin gave an eye for a drink from Mímir\'s well of wisdom, and hung for nine nights on the world tree Yggdrasil to win the runes. His ravens Huginn and Muninn fly over the world each day and tell him what they see. Half of those who die in battle go to his hall, Valhǫll. Wednesday is "Woden\'s day".' },
  { id: 'thor', name: 'Thor', gr: 'Þórr', tr: '', power: 'mjolnir', role: 'God of thunder, strength, and protector of people and gods.', sym: 'The hammer Mjǫllnir, goats, oak',
    text: 'Red-bearded, short-tempered and enormously strong, Thor rides in a chariot drawn by two goats and spends his days fighting giants. His hammer, Mjǫllnir, made by dwarves, comes back to his hand after every throw. People wore little hammer pendants for protection. Thursday is "Thor\'s day".' },
  { id: 'frigg', name: 'Frigg', gr: 'Frigg', tr: '', power: 'frigg', role: 'Odin\'s wife, queen of the Æsir, who knows every fate but never tells.', sym: 'Spindle, keys, falcon feathers',
    text: 'When her son Baldr dreamed of his death, Frigg made fire, water, iron, stone, earth, trees, beasts and sickness all swear not to harm him. She skipped the little mistletoe, thinking it too young to swear. Friday is probably "Frigg\'s day".' },
  { id: 'freyr', name: 'Freyr', gr: 'Freyr', tr: '', power: 'freyr', role: 'God of rain, sunshine, harvests and peace.', sym: 'The boar Gullinbursti, the ship Skíðblaðnir',
    text: 'Freyr\'s ship could be folded up and carried in a pouch. He gave away his sword to win the giantess Gerðr, so at Ragnarǫk he must fight the fire giant Surtr with only a deer\'s antler.' },
  { id: 'freyja', name: 'Freyja', gr: 'Freyja', tr: '', power: 'freyja', role: 'Goddess of love, beauty, and seiðr magic; she chooses half the battle-dead.', sym: 'Cats, the necklace Brísingamen, a falcon cloak',
    text: 'Freyja rides in a chariot pulled by cats. Half the slain go to her hall, Fólkvangr; the other half to Odin. The giants were forever trying to win her: one asked for her, the sun and the moon as payment for building Asgard\'s wall.' },
  { id: 'tyr', name: 'Týr', gr: 'Týr', tr: '', power: 'tyr', role: 'God of war and of oaths.', sym: 'One hand',
    text: 'When the gods bound the wolf Fenrir with the magic fetter Gleipnir, the wolf would only let them if one of them put a hand in his mouth as a pledge. Only Týr dared, and he lost his hand. Tuesday is "Týr\'s day".' },
  { id: 'njord', name: 'Njǫrðr', gr: 'Njǫrðr', tr: '', power: 'njord', role: 'God of the sea, the winds and wealth; father of Freyr and Freyja.', sym: 'Ships, the harbour',
    text: 'One of the Vanir, Njǫrðr married the giantess Skaði, who chose him by looking only at his feet. She hated the noise of the gulls at his harbour and he hated the wolves howling in her mountains, so they lived apart.' },
  { id: 'heimdall', name: 'Heimdallr', gr: 'Heimdallr', tr: '', power: 'heimdall', role: 'Watchman of the gods at the rainbow bridge Bifrǫst.', sym: 'The horn Gjallarhorn',
    text: 'Heimdallr needs less sleep than a bird, sees a hundred leagues by night or day, and hears the grass grow. When the giants march at Ragnarǫk, he will blow the Gjallarhorn to wake the gods.' },
  { id: 'eir', name: 'Eir', gr: 'Eir', tr: '', power: 'eir', role: 'Goddess of healing.', sym: 'Herbs',
    text: 'Snorri Sturluson calls Eir "the best of physicians". Her name simply means "help" or "mercy".' },
  { id: 'idunn', name: 'Iðunn', gr: 'Iðunn', tr: '', power: 'idunn', role: 'Keeper of the apples that keep the gods young.', sym: 'A box of golden apples',
    text: 'When Loki let the giant Þjazi carry off Iðunn and her apples, the gods began to grow old and grey. They forced Loki to fetch her back; he turned her into a nut and flew home with her as a falcon.' },
  { id: 'loki', name: 'Loki', gr: 'Loki', tr: '', power: 'loki', role: 'The trickster: a shape-changer, the gods\' friend and their doom.', sym: 'Fire, the fox, the fishing net',
    text: 'Loki solves as many problems as he causes. He guided the mistletoe dart that killed Baldr, and the gods bound him under a dripping serpent. At Ragnarǫk he will break free and sail against them.' },
  { id: 'hel', name: 'Hel', gr: 'Hel', tr: '', power: 'hel', role: 'Ruler of the land of the dead who did not die in battle.', sym: 'Half her face living, half dead',
    text: 'Loki\'s daughter. When Baldr died, Hel promised to let him go if every living thing wept for him. Everything did, except one giantess in a cave, who may have been Loki in disguise.' },
];
const IRISH_GODS = [
  { id: 'dagda', name: 'The Dagda', gr: 'In Dagdae', tr: '', power: 'dagda', role: '"The good god": father, druid, warrior and master of plenty.', sym: 'A club, a cauldron, a harp',
    text: 'The Dagda\'s cauldron sends no one away hungry; his club kills nine men with one end and brings them back to life with the other; his harp makes the seasons come in their order. Newgrange, Brú na Bóinne, was said to be his home.' },
  { id: 'lugh', name: 'Lugh', gr: 'Lug', tr: '', power: 'lugh', role: 'The many-skilled god, master of every craft.', sym: 'A spear, a sling',
    text: 'When Lugh came to the gate of Tara, the doorkeeper asked what skill he had. He was a smith, a champion, a harper, a poet, a physician, a sorcerer… "We have one of each already." "But have you one man who is all of them?" The feast of Lughnasa at harvest time is named after him.' },
  { id: 'brigid', name: 'Brigid', gr: 'Brigit', tr: '', power: 'brigid', role: 'Goddess of poetry, healing and smithcraft.', sym: 'Fire, the forge, the spring',
    text: 'Cormac\'s Glossary (about AD 900) says there were three Brigits, sisters, for poetry, healing and smithwork. Her feast, Imbolc, on 1 February, became the feast of St Brigid of Kildare.' },
  { id: 'diancecht', name: 'Dian Cécht', gr: 'Dían Cécht', tr: '', power: 'diancecht', role: 'Physician of the Tuatha Dé Danann.', sym: 'The well of Sláine',
    text: 'He made King Nuada an arm of silver. During the second battle of Mag Tuired he sang spells over a well, and the wounded who were thrown in came out whole.' },
  { id: 'morrigan', name: 'The Morrígan', gr: 'In Morrígan', tr: '', power: 'morrigan', role: 'Goddess of war, fate and prophecy, who often appears as a crow.', sym: 'The hooded crow',
    text: 'The Morrígan offered Cú Chulainn her love and he refused her, so she fought him at the ford as an eel, a wolf and a heifer. After he died, it was a crow on his shoulder that told his enemies it was safe to come near.' },
  { id: 'manannan', name: 'Manannán mac Lir', gr: 'Manannán mac Lir', tr: '', power: 'manannan', role: 'God of the sea and keeper of the Otherworld.', sym: 'A cloak of mist, a chariot over the waves',
    text: '"Son of the sea." He rides the waves as if they were a flowering plain, and his magic cloak of mist can hide anyone. The Isle of Man is said to be named after him.' },
  { id: 'nuada', name: 'Nuada', gr: 'Nuadu', tr: '', power: 'nuada', role: 'First king of the Tuatha Dé Danann in Ireland.', sym: 'A silver hand, a sword no one escapes',
    text: 'Because a king had to be without blemish, Nuada had to give up the throne when he lost his arm in the first battle of Mag Tuired. With his silver arm he became king again, and gave the leadership to Lugh before the second battle.' },
  { id: 'goibniu', name: 'Goibniu', gr: 'Goibniu', tr: '', power: 'goibniu', role: 'The smith god.', sym: 'The forge, the feast of immortality',
    text: 'Goibniu could make a spear with three blows of his hammer, and his spears never missed. His ale kept the gods from growing old.' },
  { id: 'danu', name: 'Danu', gr: 'Danu', tr: '', power: 'danu', role: 'Mother of the gods, as later writers saw her.', sym: 'Rivers, the land',
    text: 'Tuatha Dé Danann means "the peoples of the goddess Danu". The old texts say very little about her, and scholars argue about her; the Danube may share her name.' },
  { id: 'ogma', name: 'Ogma', gr: 'Ogma', tr: '', power: 'ogma', role: 'Champion and master of speech.', sym: 'The ogham letters',
    text: 'Ogma was said to have invented ogham, the Irish alphabet of strokes cut along the edge of a stone. A Greek writer, Lucian, describes the Gaulish god Ogmios leading men by golden chains fixed from his tongue to their ears.' },
];
const ALL_GODS = GODS.concat(NORSE_GODS, IRISH_GODS);
function godOf(k) { const w = POWERS[k]; return ALL_GODS.find(g => g.id === w.god) || ALL_GODS.find(g => g.power === k) || { name: w.name, gr: '' }; }

/* ---------- Codex: heroes, monsters, stories, words ---------- */
const MYTH = {
  greek: { title: 'Greek', gods: GODS, heroes: HEROES, monsters: MONSTERS, stories: STORIES, facts: FACTS, vocab: VOCAB, words: WORDS, speech: SPEECH, lang: 'Homeric Greek' },
  norse: {
    title: 'Norse', gods: NORSE_GODS, lang: 'Old Norse',
    heroes: [
      { name: 'Sigurd', gr: 'Sigurðr', tr: '', text: 'Raised by the smith Regin, he rode the horse Grani, a descendant of Sleipnir, killed the dragon Fáfnir with the reforged sword Gram, and tasted the dragon\'s heart, after which he understood the speech of birds. The gold he won was cursed and brought death to all who held it.' },
      { name: 'Brynhildr', gr: 'Brynhildr', tr: '', text: 'A valkyrie whom Odin punished with sleep inside a ring of fire. Sigurd rode through the flames to wake her. Tricked into marrying another, she brought about Sigurd\'s death and then her own.' },
      { name: 'Ragnarr Loðbrók', gr: 'Ragnarr loðbrók', tr: '', text: '"Shaggy-breeches", a legendary Viking king who won his wife by killing a serpent in clothes of tarred fur. He may be built on real raiders of the 800s; his sons led the Great Heathen Army into England.' },
      { name: 'Egill Skallagrímsson', gr: 'Egill', tr: '', text: 'Warrior and greatest poet of the Viking Age, from Iceland. His saga says he composed his first poem at three. His poem for his drowned son, Sonatorrek, is one of the finest laments in any language.' },
      { name: 'Víðarr', gr: 'Víðarr', tr: '', text: 'The silent god. He wears a thick shoe made of all the scraps people cut from their shoes at the toe and heel; with it he will hold open Fenrir\'s jaw and kill the wolf.' },
    ],
    monsters: [
      { name: 'The jǫtnar', gr: 'jǫtnar', tr: '', text: 'The giants: not always huge, often wise, sometimes beautiful. The world was made from the body of the first giant, Ymir. Gods and giants marry and fight, and at Ragnarǫk the giants win.' },
      { name: 'Fenrir', gr: 'Fenrisúlfr', tr: '', text: 'Loki\'s son, a wolf who grew so fast the gods feared him. Dwarves made the fetter Gleipnir from the sound of a cat\'s footfall, a woman\'s beard, the roots of a mountain and other things that do not exist.' },
      { name: 'Jǫrmungandr', gr: 'Miðgarðsormr', tr: '', text: 'The Midgard Serpent, another child of Loki. Odin threw it into the sea, where it grew until it circled the world. Thor once hooked it while fishing with an ox head as bait.' },
      { name: 'Fáfnir', gr: 'Fáfnir', tr: '', text: 'A dwarf\'s son who killed his father for the gold the gods paid as a fine, and turned into a dragon to guard it on Gnitaheiðr.' },
      { name: 'Draugar', gr: 'draugr', tr: '', text: 'The walking dead of the sagas: heavy, strong, smelling of the grave, they guard their burial mounds. Grettir the Strong wrestled one, Glámr, and was cursed by its gaze.' },
      { name: 'Surtr', gr: 'Surtr', tr: '', text: '"The black one", ruler of the fire-world Múspellsheimr. At Ragnarǫk he will come with a sword brighter than the sun and set the whole world alight.' },
      { name: 'Trolls', gr: 'trǫll', tr: '', text: 'In the Old Norse sources "troll" can mean a giant, a witch or any uncanny being. The big, stupid, sun-fearing trolls of folktales come later.' },
    ],
    stories: [
      { title: 'Ginnungagap and Ymir', text: 'Before the world there was only a yawning gap between ice and fire. Where they met, the giant Ymir and the cow Auðhumla came to be. Odin and his brothers killed Ymir and made the earth from his flesh, the sea from his blood, the sky from his skull and the clouds from his brains.' },
      { title: 'Yggdrasil', text: 'The world tree, an ash, holds the nine worlds in its branches and roots. A dragon gnaws at its roots, an eagle sits at the top, and a squirrel, Ratatoskr, runs up and down carrying insults between them.' },
      { title: 'The building of Asgard\'s wall', text: 'A giant offered to build the gods a wall in a single winter, for Freyja, the sun and the moon. With his horse Svaðilfari he nearly did it, until Loki turned into a mare and lured the horse away. Loki later gave birth to the eight-legged Sleipnir.' },
      { title: 'Thor in disguise', text: 'The Þrymskviða tells how the giant Þrymr stole Thor\'s hammer and asked for Freyja as his bride. Thor went in her place, veiled, with Loki as his bridesmaid. At the feast the "bride" ate an ox and eight salmon; when the hammer was laid in her lap to bless the wedding, Thor took it back.' },
      { title: 'The death of Baldr', text: 'Nothing could harm Baldr, so the gods threw things at him for fun. Loki gave the blind god Hǫðr a dart of mistletoe and guided his aim. Baldr died, and could not come back from Hel because one giantess would not weep.' },
      { title: 'Ragnarǫk', text: '"The doom of the gods." After three winters with no summer, the wolves swallow the sun and moon, Fenrir and Loki break free, and the giants march. Odin is swallowed by Fenrir, Thor kills the serpent and dies of its poison, and Surtr burns the world. Then a green earth rises from the sea, and Baldr returns.' },
    ],
    facts: [
      'Most Norse myths come from two books written in Iceland in the 1200s, two centuries after Iceland became Christian: the Poetic Edda, a collection of old poems, and the Prose Edda of Snorri Sturluson.',
      'Four days of the English week are named after Norse or Anglo-Saxon gods: Tuesday (Týr), Wednesday (Woden, Odin), Thursday (Thor) and Friday (Frigg).',
      'Runes were cut into wood, bone and stone. The Viking-age alphabet, the younger futhark, had just sixteen letters.',
      'Iceland\'s assembly, the Alþingi, first met in 930 and still sits today.',
      'Viking warriors did not wear horned helmets; that idea comes from 1800s costume designers.',
      '"Viking" (víkingr) was a job, not a people: it meant going raiding by sea.',
    ],
    vocab: [['guð', 'god'], ['áss, æsir', 'god, the gods'], ['jǫtunn', 'giant'], ['konungr', 'king'], ['jarl', 'earl, chieftain'], ['víkingr', 'sea raider'], ['skip', 'ship'], ['sverð', 'sword'], ['spjót', 'spear'], ['skjǫldr', 'shield'], ['øx', 'axe'], ['bogi', 'bow'], ['hestr', 'horse'], ['hamarr', 'hammer'], ['úlfr', 'wolf'], ['ormr', 'serpent, dragon'], ['haugr', 'burial mound'], ['saga', 'story, history'], ['skáld', 'poet'], ['rún', 'rune, secret'], ['heill', 'luck, omen; whole'], ['Valhǫll', 'hall of the slain'], ['Ragnarǫk', 'doom of the gods']],
    words: {
      villager: ['bóndi', '', 'farmer'], huskarl: ['húskarl', '', 'household warrior'], berserkr: ['berserkr', '', 'bear-shirt'], bowman: ['bogmaðr', '', 'bowman'], raider: ['reiðmaðr', '', 'rider'], troll: ['trǫll', '', 'troll'], ram: ['hrútr', '', 'ram'],
      agora: ['skáli', '', 'hall'], house: ['hús', '', 'house'], storehouse: ['búr', '', 'storehouse'], farm: ['akr', '', 'field'], barracks: ['skáli', '', 'hall'], temple: ['hof', '', 'temple'], tower: ['turn', '', 'tower'], wall: ['skíðgarðr', '', 'fence of stakes'],
      food: ['matr', '', 'food'], wood: ['viðr', '', 'wood, tree'], gold: ['gull', '', 'gold'], favor: ['heill', '', 'luck, good omen'], tree: ['tré', '', 'tree'], berry: ['ber', '', 'berry'],
      thor: ['Þórr', '', 'Thor'], loki: ['Loki', '', 'Loki'], odin: ['Óðinn', '', 'Odin'], sigurd: ['Sigurðr', '', 'Sigurd'], vidarr: ['Víðarr', '', 'Víðarr'],
      jotunn: ['jǫtunn', '', 'giant'], draugr: ['draugr', '', 'ghost, walking dead'], fenrir: ['Fenrisúlfr', '', 'the Fenris wolf'], jormungandr: ['Miðgarðsormr', '', 'the Midgard serpent'], surtr: ['Surtr', '', 'the black one'], fafnir: ['Fáfnir', '', 'Fáfnir'], thrym: ['Þrymr', '', 'Þrymr'],
    },
    speech: {
      select: [['Hvat skal gera?', '', 'What is to be done?'], ['Hér em ek.', '', 'Here I am.'], ['Já, herra.', '', 'Yes, lord.']],
      move: [['Ek fer.', '', 'I go.'], ['Svá skal vera.', '', 'So shall it be.']],
      attack: [['Fram, fram!', '', 'Forward, forward!'], ['Til vígs!', '', 'To battle!']],
      work: [['Svá skal vera.', '', 'So shall it be.'], ['Já, herra.', '', 'Yes, lord.']],
      build: [['Ek smíða.', '', 'I build.'], ['Já, herra.', '', 'Yes, lord.']],
    },
  },
  irish: {
    title: 'Irish', gods: IRISH_GODS, lang: 'Old Irish',
    heroes: [
      { name: 'Cú Chulainn', gr: 'Cú Chulainn', tr: '', text: 'Born Sétanta, he killed the smith Culann\'s fierce hound as a boy and offered to guard Culann\'s house himself until a new dog was raised: so he became "the Hound of Culann". He chose a short life with lasting fame, and died tied to a standing stone so that he could die on his feet.' },
      { name: 'Fionn mac Cumhaill', gr: 'Find mac Cumaill', tr: '', text: 'Leader of the fianna. As a boy he cooked the Salmon of Knowledge for the poet Finnéces, burned his thumb on it and sucked it, and after that, whenever he chewed his thumb, he knew whatever he needed to know.' },
      { name: 'Medb', gr: 'Medb', tr: '', text: 'Queen of Connacht. Comparing wealth in bed with her husband Ailill, she found he had one great bull more than she did, so she raised an army to steal the Brown Bull of Cooley from Ulster.' },
      { name: 'Fer Diad', gr: 'Fer Diad', tr: '', text: 'Cú Chulainn\'s foster-brother, trained with him by the warrior woman Scáthach. Medb made him fight his friend at the ford. They fought for three days, sending each other healing herbs every night, until Cú Chulainn killed him with the gáe bolga.' },
      { name: 'Emer', gr: 'Emer', tr: '', text: 'Cú Chulainn\'s wife, who had "the six gifts of womanhood": beauty, a lovely voice, sweet speech, needlework, wisdom and chastity. She made him go to Scotland to finish his training before she would marry him.' },
    ],
    monsters: [
      { name: 'Balor of the Evil Eye', gr: 'Balor', tr: '', text: 'King of the Fomóire. His eye was poisoned when, as a boy, he watched his father\'s druids brewing a spell. It was kept shut; at the second battle of Mag Tuired Lugh, his own grandson, put a sling stone through it, and it looked back on Balor\'s own army.' },
      { name: 'The Fomóire', gr: 'Fomóire', tr: '', text: 'Raiders from under or beyond the sea, often described as one-eyed, one-armed and one-legged. They taxed the Tuatha Dé so heavily that the Dagda was made to build forts for them.' },
      { name: 'The hound of Culann', gr: 'cú Chulainn', tr: '', text: 'A guard dog that took three chains, each held by three men. The boy Sétanta killed it by hurling his ball down its throat.' },
      { name: 'The Brown Bull of Cooley', gr: 'Donn Cúailnge', tr: '', text: 'The bull the Táin is fought over. At the end it fights Medb\'s white-horned bull across all Ireland, kills it, and dies of exhaustion; places all over Ireland are named after the parts of the white bull it scattered.' },
      { name: 'The áes síde', gr: 'áes síde', tr: '', text: 'When the sons of Míl took Ireland, the Tuatha Dé went into the hills, the síde, and became the Otherworld people. The bean síde, "woman of the mound", is the banshee.' },
    ],
    stories: [
      { title: 'The Book of Invasions', text: 'Lebor Gabála Érenn tells how Ireland was settled again and again: by Cessair before the Flood, by Partholón, by Nemed, by the Fir Bolg, by the Tuatha Dé Danann who came in dark clouds, and last by the sons of Míl, the ancestors of the Irish.' },
      { title: 'The second battle of Mag Tuired', text: 'Under the half-Fomorian king Bres, the Tuatha Dé were starved and taxed. Lugh came to Tara, the gods prepared for seven years, and they met the Fomóire at Mag Tuired. Goibniu made weapons, Dian Cécht healed the wounded in his well, and Lugh killed Balor with a sling stone.' },
      { title: 'The Cattle Raid of Cooley', text: 'Táin Bó Cúailnge, the great epic of Ulster. A curse laid by the goddess Macha left the men of Ulster as weak as women in childbirth when they were needed most, so seventeen-year-old Cú Chulainn held the fords alone against Medb\'s army, fighting their champions one a day.' },
      { title: 'The Children of Lir', text: 'Their jealous stepmother turned the four children of Lir into swans for nine hundred years. They kept their voices and sang so beautifully that people came from all over Ireland to hear them.' },
      { title: 'The Salmon of Knowledge', text: 'A salmon that ate the nuts of the nine hazels of wisdom held all knowledge. The poet Finnéces fished for it for seven years; his pupil, young Fionn, got the knowledge instead.' },
    ],
    facts: [
      'The Irish sagas were written down by Christian monks, mostly from the 700s to the 1100s. The oldest surviving manuscript of the Táin is in the Book of the Dun Cow, from about 1100.',
      'Irish has one of the oldest written vernacular literatures in Europe.',
      'Ogham inscriptions, notches along the edge of standing stones, are the oldest Irish writing, from about the 400s.',
      'The Hill of Tara was the seat of the High Kings; the Lia Fáil, the "stone of destiny" there, was said to roar under the rightful king.',
      'Newgrange, older than Stonehenge and the pyramids of Giza, lets the sunrise shine down its passage only around the midwinter solstice.',
      'Samhain, the old Irish new year on 1 November, when the Otherworld was open, is the root of Halloween.',
    ],
    vocab: [['día', 'god'], ['rí', 'king'], ['rígan', 'queen'], ['láech', 'warrior'], ['cath', 'battle'], ['claideb', 'sword'], ['sleg', 'spear'], ['scíath', 'shield'], ['carpat', 'chariot'], ['ech', 'horse'], ['tailm', 'sling'], ['druí', 'druid'], ['síd', 'fairy mound'], ['muir', 'sea'], ['bó', 'cow'], ['tarb', 'bull'], ['cú', 'hound'], ['fer', 'man'], ['ben', 'woman'], ['dún', 'fort'], ['tech', 'house'], ['búaid', 'victory'], ['táin', 'cattle raid']],
    words: {
      villager: ['aithech', '', 'farmer'], fian: ['fénnid', '', 'warrior of a fían'], curad: ['caur', '', 'champion'], slinger: ['tailmech', '', 'slinger'], chariot: ['carpat', '', 'chariot'], druid: ['druí', '', 'druid'], aossi: ['áes síde', '', 'people of the mounds'], ram: ['rethe', '', 'ram'],
      agora: ['ráth', '', 'ringfort'], house: ['tech', '', 'house'], storehouse: ['tech', '', 'house, store'], farm: ['gort', '', 'field'], barracks: ['Cráebrúad', '', 'the Red Branch'], temple: ['fidnemed', '', 'sacred grove'], tower: ['tor', '', 'tower'], wall: ['sonnach', '', 'palisade'],
      food: ['biad', '', 'food'], wood: ['fid', '', 'wood, tree'], gold: ['ór', '', 'gold'], favor: ['búaid', '', 'victory, virtue'], tree: ['crann', '', 'tree'], berry: ['smér', '', 'blackberry'],
      lugh: ['Lug', '', 'Lugh'], nuada: ['Nuadu', '', 'Nuada'], dagda: ['In Dagdae', '', 'the Dagda'], cuchulainn: ['Cú Chulainn', '', 'the Hound of Culann'],
      fomor: ['Fomóire', '', 'Fomorians'], balor: ['Balor', '', 'Balor'], hound: ['cú', '', 'hound'], ferdiad: ['Fer Diad', '', 'Fer Diad'], bull: ['Donn Cúailnge', '', 'the Brown Bull of Cooley'], nechtan: ['meic Nechtain', '', 'sons of Nechtan'],
    },
    speech: {
      select: [['Atú sund.', '', 'I am here.'], ['Maith.', '', 'Good.']],
      move: [['Do-tíag.', '', 'I go.'], ['Maith.', '', 'Good.']],
      attack: [['Cath!', '', 'Battle!'], ['Búaid!', '', 'Victory!']],
      work: [['Maith.', '', 'Good.'], ['Atú sund.', '', 'I am here.']],
      build: [['Maith.', '', 'Good.']],
    },
  },
};
function humanCiv() { return G && G.players ? civOf(1) : (UI && UI.civ) || 'greek'; }
// words follow the people you play; units of other peoples still show their own words
function wordFor(id, owner) {
  const civ = owner != null && G ? civOf(owner) : humanCiv(), M = MYTH[civ] || MYTH.greek;
  return (M.words && M.words[id]) || (MYTH.norse.words[id] && !WORDS[id] ? MYTH.norse.words[id] : null) || (MYTH.irish.words[id] && !WORDS[id] ? MYTH.irish.words[id] : null) || (civ === 'greek' ? WORDS[id] : null);
}
grName = function (id, english, owner) {
  const w = wordFor(id, owner); if (!GR.on || !w) return english;
  return `${english} <span class="gr">${w[0]}</span>${w[1] ? ` <span class="tr">${w[1]}</span>` : ''}`;
};
speak = function (u, kind) {
  if (!GR.on || !u) return; const M = MYTH[civOf(u.owner)] || MYTH.greek, S = M.speech || SPEECH; if (!S[kind]) return;
  if (performance.now() - (speak.t || 0) < 1500) return; speak.t = performance.now();
  const L = S[kind], s = L[Math.floor(Math.random() * L.length)];
  G.fx = G.fx.filter(f => f.k !== 'say');
  G.fx.push({ k: 'say', x: u.x, y: u.y, z: 0, t: 0, life: 2.6, gr: s[0], tr: s[1], en: s[2], follow: u.id });
};
const _codexOrig = codexHTML;
function codexWordsGreek() { return _codexOrig('words'); }
function codexCheats() { return _codexOrig('cheats'); }
codexHTML = function (tab) {
  const civ = UI.codexMyth || humanCiv(), M = MYTH[civ];
  const card = (title, gr, tr, sub, body, extra) => `<article class="cx"><h4>${title}${gr && gr !== title ? ` <span class="gr">${gr}</span>` : ''}${tr ? ` <span class="tr">${tr}</span>` : ''}</h4>${sub ? `<p class="sub">${sub}</p>` : ''}<p>${body}</p>${extra || ''}</article>`;
  const pick = `<div class="cxmyth">${Object.keys(MYTH).map(k => `<button data-myth="${k}" class="${k === civ ? 'on' : ''}">${{ greek: '🏛️', norse: 'ᚱ', irish: '☘️' }[k]} ${MYTH[k].title}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'gods') body = M.gods.map(g => { const w = POWERS[g.power]; return card(g.name, g.gr, g.tr, `<b>${g.role}</b> · ${g.sym}`, g.text, (g.ep && civ === 'greek' ? `<p class="ep">In Homer: <span class="gr">${g.ep}</span> ${g.ept ? `<span class="tr">${g.ept}</span>` : ''}, “${g.epe}”.</p>` : '') + (w ? `<p class="gp">God power: ${w.icon} <b>${w.name}</b>, ${w.favor} favour. ${w.info}</p>` : '')); }).join('');
  else if (tab === 'heroes') body = M.heroes.map(h => card(h.name, h.gr, h.tr, h.ep || '', h.text)).join('');
  else if (tab === 'monsters') body = M.monsters.map(m => card(m.name, m.gr, m.tr, '', m.text)).join('');
  else if (tab === 'stories') body = M.stories.map(s => card(s.title, '', '', '', s.text)).join('') + `<article class="cx"><h4>Did you know?</h4><ul>${M.facts.map(f => `<li>${f}</li>`).join('')}</ul></article>`;
  else if (tab === 'words') {
    if (civ === 'greek') return pick + codexWordsGreek();
    body = `<p class="sub">Words in ${M.lang}. Turn on <b>Ancient languages</b> to see them on your units, buildings and resources, and to hear your people answer. ${civ === 'norse' ? 'Old Norse is given in the standard spelling of Old Icelandic; ǫ sounds like the o in "on", þ like th in "thin", ð like th in "this".' : 'Old Irish is given in the spelling of the Dictionary of the Irish Language; an accent marks a long vowel, and many consonants were softer than they look.'}</p><table class="vocab">${M.vocab.map(v => `<tr><td class="gr">${v[0]}</td><td>${v[1]}</td></tr>`).join('')}</table><h4>In the game</h4><table class="vocab">${Object.keys(M.words).map(k => `<tr><td>${(UNITS[k] || BUILDINGS[k] || { name: k }).name || k}</td><td class="gr">${M.words[k][0]}</td><td>${M.words[k][2]}</td></tr>`).join('')}</table>`;
  }
  else if (tab === 'cheats') return codexCheats();
  return pick + body;
};

/* ---------- god-power effects that are new ---------- */
const _extraPower = extraPower;
extraPower = function (pid, id, x, y, W) {
  if (id === 'ravens') { G.exp.fill(1); say('Huginn and Muninn fly out over the world and come back with all they saw.', 'gold'); return; }
  if (id === 'raise') { const t = (W && W.spawn) || 'spartos'; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, tx = Math.floor(x + Math.cos(a)), ty = Math.floor(y + Math.sin(a)); if (!G.block[ty * G.n + tx]) { addUnit(t, pid, tx, ty); fxBurst(tx + .5, ty + .5, '#556', 8); } } recount(); say(UNITS[t].name + ' rise to fight for you.', 'gold'); return; }
  return _extraPower(pid, id, x, y);
};

/* ---------- per-frame extras: druids heal, Cú Chulainn's warp-spasm ---------- */
const _step = step;
step = function (dt) {
  _step(dt);
  if (!G || G.state !== 'play') return;
  G.civT = (G.civT || 0) + dt; if (G.civT < .5) return; const t = G.civT; G.civT = 0;
  for (const h of G.ents) {
    if (h.kind !== 'unit' || h.dead) continue; const D = UNITS[h.t];
    if (D.healer) for (const u of G.ents) if (u.kind === 'unit' && u.owner === h.owner && u !== h && u.hp < u.maxHp && dist(u.x, u.y, h.x, h.y) < 4) u.hp = Math.min(u.maxHp, u.hp + D.healer * t);
    if (h.t === 'cuchulainn') { const r = h.hp < h.maxHp * .5; if (r && !h.riastrad) { h.riastrad = true; h.heraBoost = (h.heraBoost || 1) * 1.5; say('The ríastrad comes on Cú Chulainn! His body twists, and a column of dark blood rises from his head.', 'gold'); } else if (!r && h.riastrad && h.hp > h.maxHp * .8) { h.riastrad = false; h.heraBoost = (h.heraBoost || 1.5) / 1.5; } }
  }
};

/* ---------- new games: which people each player is ---------- */
const _newGame = newGame;
newGame = function (scen, opts) {
  opts = opts || {};
  // set the civs before the scenario is laid out, so anything it trains is right
  const g = _newGame(scen, opts);
  g.players[1].civ = opts.civ || scen.civ || 'greek';
  g.players[2].civ = opts.foeCiv || scen.foeCiv || scen.civ || 'greek';
  g.players[0].civ = g.players[3].civ = scen.civ || 'greek';
  if (scen.startAge) { g.players[1].age = scen.startAge; for (let a = 1; a <= scen.startAge; a++) g.players[1].techs.add('age' + a); }
  // a skirmish starts every side with one soldier of its own people
  if (scen.skirmish) for (const e of g.ents) if (e.kind === 'unit' && e.t === 'hoplite' && civOf(e.owner) !== 'greek') e.t = CV(e.owner).inf;
  return g;
};

/* ---------- the campaigns ---------- */
for (const s of CAMPAIGN) s.civ = s.civ || 'greek';
CAMPAIGN.push(
  {
    id: 'thrym', civ: 'norse', foeCiv: 'jotun', title: 'Thor and the Stolen Hammer', place: 'Midgard and Jǫtunheimr',
    intro: [
      'Thor wakes up and his hammer is gone. Loki borrows Freyja\'s falcon cloak and flies to Jǫtunheimr, where the giant king Þrymr laughs at him: he has buried Mjǫllnir eight leagues under the earth, and will give it back only if Freyja comes to be his bride.',
      'Freyja is so furious the necklace Brísingamen bursts from her neck. So Heimdallr has an idea: dress Thor as the bride, with a veil, keys at his belt and the necklace on his chest. Loki will go as his bridesmaid.',
      'Build up your settlement and an army; you will need it when the giants learn the truth. Then lead the "bride" and the bridesmaid to Þrymr\'s hall. While Thor is veiled the giants will not attack him; at the hall he will get his hammer back.'
    ],
    map: { size: 64, seed: 113, sea: 'south', forest: .6, gold: 4, berries: 4 },
    start: { food: 300, wood: 300, gold: 150, favor: 10 },
    objectives: [
      { id: 'hall', text: 'Bring Thor and Loki to Þrymr\'s hall (north-east) for the wedding feast', main: true },
      { id: 'thrym', text: 'Get Mjǫllnir back and defeat Þrymr', main: true },
      { id: 'giants', text: 'Optional: destroy the giants\' camp in the west' },
      { id: 'hero', text: 'Thor must survive', keep: true },
    ],
    outro: 'At the feast the "bride" ate a whole ox, eight salmon and all the cakes for the women, and drank three barrels of mead. "Freyja has not eaten for eight nights, so eager was she to come," said Loki. When Þrymr peeked under the veil and saw the burning eyes, "She has not slept for eight nights," said Loki. At last the hammer was brought in to bless the bride. Thor\'s heart laughed in his chest, and he took it.',
  },
  {
    id: 'sigurd', civ: 'norse', foeCiv: 'norse', title: 'Sigurd the Dragon-Slayer', place: 'Hunaland and Gnitaheiðr',
    intro: [
      'King Sigmund fell in battle against the sons of Hunding, and Odin himself broke his sword. His son Sigurd was raised by Regin the smith, a strange, clever man who tells him of a dragon, Fáfnir, lying on a hoard of gold on the heath of Gnitaheiðr.',
      'Fáfnir is Regin\'s own brother. He killed their father for the gold, and grew into a dragon to guard it. Regin wants the gold, and he wants Sigurd to win it for him.',
      'Bring Sigurd to Regin\'s forge, where the shards of his father\'s sword will be welded into Gram. Then cross to the heath and kill Fáfnir. The sons of Hunding are still strong to the east; avenging Sigmund is up to you.'
    ],
    map: { size: 68, seed: 127, sea: 'west', forest: .55, gold: 5, berries: 4 },
    start: { food: 300, wood: 300, gold: 200, favor: 0 },
    objectives: [
      { id: 'gram', text: 'Bring Sigurd to Regin\'s forge to reforge the sword Gram', main: true },
      { id: 'fafnir', text: 'Slay Fáfnir on Gnitaheiðr (north-east)', main: true },
      { id: 'hunding', text: 'Optional: avenge Sigmund on the sons of Hunding (south-east)' },
      { id: 'hero', text: 'Sigurd must survive', keep: true },
    ],
    outro: 'Sigurd dug a pit in the dragon\'s path and stabbed up from it as Fáfnir crawled over. As he roasted the dragon\'s heart for Regin he burned his thumb, put it in his mouth, and suddenly understood the birds in the tree above: Regin meant to kill him. Sigurd struck first, loaded the gold on his horse Grani, and rode away, not knowing the gold carried a curse.',
  },
  {
    id: 'ragnarok', civ: 'norse', foeCiv: 'jotun', title: 'Ragnarǫk', place: 'The plain of Vígríðr',
    intro: [
      'Three winters have come with no summer between. The wolves have swallowed the sun and the moon. Heimdallr has blown the Gjallarhorn: Fenrir is loose, the Midgard Serpent has come ashore, and the giants march over the bridge Bifrǫst, which breaks under them.',
      'The gods know how this ends. Odin will fight the wolf. Thor will fight the serpent. Víðarr, the silent god, must avenge his father. And when the beasts are dead, Surtr will come with his burning sword.',
      'Hold the plain of Vígríðr. Kill Fenrir with Víðarr and Jǫrmungandr with Thor, then survive Surtr\'s fire until the old world sinks and a new one rises.'
    ],
    map: { size: 72, seed: 139, sea: 'east', forest: .4, gold: 5, berries: 5 },
    start: { food: 500, wood: 500, gold: 400, favor: 60 }, startAge: 2,
    objectives: [
      { id: 'fenrir', text: 'Víðarr must avenge Odin on the wolf Fenrir', main: true },
      { id: 'serpent', text: 'Thor must kill Jǫrmungandr on the shore', main: true },
      { id: 'fire', text: 'Hold out against Surtr\'s fire', main: true },
      { id: 'asgard', text: 'Your Longhouse must stand', keep: true },
    ],
    outro: 'Thor killed the serpent, walked nine steps, and fell dead of its poison. Víðarr put his great shoe on the wolf\'s lower jaw, took the upper one in his hand, and tore it apart. Then Surtr flung fire over the earth, and it sank into the sea. But the Vǫluspá goes on: the earth rises again, green and new, the fields grow without sowing, Baldr comes back from Hel, and the gods\' sons find the golden chess pieces of the old gods lying in the grass.',
  },
  {
    id: 'magtuired', civ: 'irish', foeCiv: 'fomori', title: 'Lugh and the Battle of Mag Tuired', place: 'Mag Tuired, in Connacht',
    intro: [
      'The Tuatha Dé Danann have suffered under the Fomóire. Their half-Fomorian king Bres was so mean that no one\'s knives were greased at his table and no one\'s breath smelled of ale. The Dagda himself was set to building forts for the Fomorian king.',
      'Then a young man came to the gates of Tara who was smith, champion, harper, poet, physician and sorcerer at once: Lugh. King Nuada of the silver hand gave him command. For seven years the gods prepared.',
      'Now the armies meet on the plain of Mag Tuired. Balor of the Evil Eye leads the Fomóire; whatever his eye looks on is destroyed. Only Lugh can stand before it. Build up your forces, hold the ford, and bring Lugh to Balor.'
    ],
    map: { size: 68, seed: 151, sea: 'north', forest: .45, gold: 5, berries: 4 },
    start: { food: 300, wood: 300, gold: 200, favor: 20 }, startAge: 1,
    objectives: [
      { id: 'camp', text: 'Destroy the Fomorian camp by the ford', main: true },
      { id: 'balor', text: 'Bring Lugh to Balor and put out his eye', main: true },
      { id: 'well', text: 'Optional: take the well of Sláine (west) to heal your army' },
      { id: 'hero', text: 'Lugh must survive', keep: true },
    ],
    outro: 'When Balor\'s eyelid was lifted, Lugh cast a sling stone that drove the eye out through the back of his head, so that it looked upon the Fomorian army behind him, and they fell. The Fomóire were driven back to the sea. Ogma found the sword of the Fomorian king Tethra, which told him of all the deeds it had done, and the Morrígan proclaimed the victory to the hills and rivers of Ireland.',
  },
  {
    id: 'setanta', civ: 'irish', foeCiv: 'irish', title: 'The Boyhood Deeds of Cú Chulainn', place: 'Emain Macha and the fort of the sons of Nechtan',
    intro: [
      'The boy Sétanta was late for King Conchobar\'s feast at the house of Culann the smith. By the time he came, the great hound had been let loose. He killed it with his hurley ball. When Culann grieved for his dog, the boy said he would guard Culann\'s house himself until a pup was grown: and so he was called Cú Chulainn, "the Hound of Culann".',
      'On the day he took up arms, the druid Cathbad said that whoever took arms that day would be the most famous warrior in Ireland, and his life would be short. "I don\'t care," said the boy, "if I live only a day and a night, as long as my name lives after me."',
      'Defeat Culann\'s hound, raise a war band at Emain Macha, then drive the chariot to the fort of the three sons of Nechtan Scéne on the border, who boast that they have killed more Ulstermen than are left alive.'
    ],
    map: { size: 64, seed: 167, sea: null, forest: .5, gold: 4, berries: 5 },
    start: { food: 300, wood: 300, gold: 150, favor: 0 },
    objectives: [
      { id: 'hound', text: 'Face Culann\'s hound outside the smith\'s house', main: true },
      { id: 'sons', text: 'Defeat the three sons of Nechtan Scéne', main: true },
      { id: 'fort', text: 'Optional: burn their fort', },
      { id: 'hero', text: 'Cú Chulainn must survive', keep: true },
    ],
    outro: 'Cú Chulainn came home to Emain Macha with the heads of the three sons of Nechtan on his chariot, a wild deer running behind it and a flock of swans tied to it, still in his battle fury. To cool him, the women of Emain came out to meet him; he hid his face, and the warriors plunged him into three vats of cold water. The first burst, the second boiled, and the third grew merely warm.',
  },
  {
    id: 'tain', civ: 'irish', foeCiv: 'irish', title: 'The Táin: Holding the Ford', place: 'The fords of Ulster',
    intro: [
      'Queen Medb of Connacht has marched with all the armies of Ireland to take the Brown Bull of Cooley. And the men of Ulster lie helpless under the curse of Macha, as weak as women in childbirth, all except the seventeen-year-old Cú Chulainn.',
      'He cannot beat an army alone, but he can demand the right of single combat at the ford: one champion a day. Day after day he kills them. At last Medb sends the one man who might beat him: his foster-brother, Fer Diad, whose skin is horn.',
      'Keep the Brown Bull safe, hold the ford until the Ulstermen wake from their curse, and defeat Fer Diad. Then drive Medb\'s army from Ulster.'
    ],
    map: { size: 72, seed: 181, sea: null, forest: .45, gold: 5, berries: 5 },
    start: { food: 400, wood: 300, gold: 250, favor: 20 }, startAge: 1,
    objectives: [
      { id: 'ferdiad', text: 'Defeat Fer Diad at the ford', main: true },
      { id: 'rise', text: 'Hold the ford until the men of Ulster rise (a bar shows how long)', main: true },
      { id: 'medb', text: 'Destroy Medb\'s camp', main: true },
      { id: 'bullsafe', text: 'Keep the Brown Bull of Cooley alive', keep: true },
      { id: 'hero', text: 'Cú Chulainn must survive', keep: true },
    ],
    outro: 'Cú Chulainn carried Fer Diad\'s body across the ford so that it would lie on the Ulster side, and wept over him. Then the men of Ulster rose from their sickness and routed Medb\'s army at Gáirech. But the Brown Bull had already been taken west; in Connacht it fought Medb\'s white bull through the night, killed it, carried its pieces over all Ireland, and died at the border of Ulster with its heart burst.',
  }
);

/* ---------- campaign set-up ---------- */
Object.assign(BUILDINGS, {
  forge: { id: 'forge', name: 'Regin\'s forge', icon: '⚒️', size: 2, hp: 99999, sight: 3, neutral: true, info: 'Regin the smith works here, a clever and dangerous man.' },
  hoard: { id: 'hoard', name: 'Fáfnir\'s hoard', icon: '💰', size: 2, hp: 99999, sight: 2, neutral: true, info: 'The cursed gold of Andvari.' },
  well: { id: 'well', name: 'The well of Sláine', icon: '💧', size: 2, hp: 99999, sight: 3, neutral: true, info: 'Dian Cécht\'s healing well. Your wounded heal here.' },
  stone: { id: 'stone', name: 'Standing stone', icon: '🪨', size: 1, hp: 99999, sight: 1, neutral: true, info: 'An ogham stone.' },
});
function march(u, x, y) { u.home = { x: x + .5, y: y + .5 }; u.attackMove = true; u.state = 'move'; moveTo(u, goalPoint(x, y)); return u; }
function hostile(ids, owner) { for (const id of ids) { const u = G.byId.get(id); if (u) { u.owner = owner; u.state = 'idle'; } } }
Object.assign(SETUP, {
  thrym(g) {
    startBase(1, 10, 44, { houses: 2, villagers: 5 });
    army(1, 'huskarl', 3, 15, 47);
    g.flags.hero = addUnit('thor', 1, 16, 50).id; g.flags.loki = addUnit('loki', 1, 18, 50).id;
    scatterRes(g.R, 'gold', 4, [[11, 45, 10], [50, 14, 10]]); scatterRes(g.R, 'berry', 3, [[11, 45, 8]]);
    // Þrymr's hall: the giants feast, peaceful until the bride is unveiled
    clearArea(50, 13, 9); paint(50, 13, 6, TER.stone);
    g.flags.hall = addBld('palace', 0, 48, 11).id;
    g.flags.thrym = addUnit('thrym', 0, 52, 17).id;
    g.flags.feast = army(0, 'jotunn', 5, 44, 15).map(u => u.id).concat(army(0, 'draugr', 6, 54, 9).map(u => u.id));
    // a camp of giants in the west that raids your farms
    clearArea(12, 14, 6); paint(12, 14, 3, TER.dirt); g.flags.camp = addBld('ruin', 2, 11, 13).id; addBld('tower', 2, 15, 11); army(2, 'draugr', 4, 13, 17); army(2, 'jotunn', 1, 16, 15);
  },
  sigurd(g) {
    startBase(1, 12, 30, { houses: 2, villagers: 5 });
    army(1, 'huskarl', 3, 16, 34);
    g.flags.hero = addUnit('sigurd', 1, 17, 36).id;
    scatterRes(g.R, 'gold', 5, [[13, 31, 10]]); scatterRes(g.R, 'berry', 4, [[13, 31, 8]]);
    clearArea(30, 44, 4); paint(30, 44, 3, TER.dirt); g.flags.forge = addBld('forge', 0, 29, 43).id;
    // Gnitaheiðr: a stony heath, the hoard and the dragon
    clearArea(54, 14, 8); paint(54, 14, 7, TER.stone); paint(54, 14, 3, TER.hill); g.flags.hoard = addBld('hoard', 0, 56, 10).id;
    g.flags.fafnir = addUnit('fafnir', 3, 53, 15).id;
    army(3, 'draugr', 3, 46, 20);
    // the sons of Hunding
    clearArea(54, 54, 9); paint(54, 54, 6, TER.dirt);
    g.flags.hunding = addBld('agora', 2, 53, 53).id; addBld('barracks', 2, 58, 51); addBld('range', 2, 49, 56); addBld('tower', 2, 51, 50); addBld('house', 2, 57, 57);
    army(2, 'huskarl', 5, 52, 49); army(2, 'bowman', 3, 48, 52);
  },
  ragnarok(g) {
    const n = g.n;
    startBase(1, 10, 34, { houses: 4, villagers: 8 });
    addBld('barracks', 1, 16, 28); addBld('temple', 1, 6, 28); addBld('tower', 1, 18, 38); addBld('range', 1, 14, 41);
    army(1, 'huskarl', 6, 18, 33); army(1, 'bowman', 4, 15, 36); army(1, 'berserkr', 3, 20, 36);
    g.flags.hero = addUnit('thor', 1, 21, 34).id; g.flags.vidarr = addUnit('vidarr', 1, 21, 31).id; g.flags.odin = addUnit('odin', 1, 19, 30).id;
    g.flags.agora = g.ents.find(e => e.t === 'agora' && e.owner === 1).id;
    scatterRes(g.R, 'gold', 6, [[11, 35, 12]]); scatterRes(g.R, 'berry', 5, [[11, 35, 10]]);
    // the wolf comes from the north, the serpent from the sea, the giants over the broken bridge
    clearArea(40, 8, 6); paint(40, 8, 4, TER.stone); g.flags.fenrir = addUnit('fenrir', 3, 40, 8).id;
    clearArea(n - 10, 40, 6); paint(n - 12, 40, 3, TER.sand); g.flags.serpent = addUnit('jormungandr', 3, n - 11, 40).id;
    clearArea(52, 60, 8); paint(52, 60, 5, TER.stone); g.flags.camp = addBld('palace', 2, 50, 58).id; addBld('ruin', 2, 58, 62); army(2, 'jotunn', 3, 47, 56); army(2, 'draugr', 8, 54, 55);
  },
  magtuired(g) {
    startBase(1, 10, 46, { houses: 2, villagers: 5 });
    addBld('temple', 1, 16, 52);
    army(1, 'fian', 4, 16, 44);
    g.flags.hero = addUnit('lugh', 1, 18, 47).id; addUnit('nuada', 1, 19, 49); addUnit('dagda', 1, 15, 49);
    scatterRes(g.R, 'gold', 5, [[11, 47, 10]]); scatterRes(g.R, 'berry', 4, [[11, 47, 8]]);
    // the healing well of Sláine, guarded
    clearArea(10, 20, 4); paint(10, 20, 3, TER.stone); g.flags.well = addBld('well', 0, 9, 19).id; army(3, 'fomor', 2, 13, 22);
    // a river with a ford across the middle of the plain
    for (let y = 0; y < g.n; y++) for (let dx = -1; dx <= 1; dx++) { const x = 34 + Math.round(Math.sin(y / 9) * 3) + dx; clearTile(x, y); setTer(x, y, y > 28 && y < 36 ? TER.shallow : TER.water); }
    clearArea(42, 32, 6); paint(42, 32, 4, TER.dirt); g.flags.camp = addBld('ruin', 2, 41, 30).id; addBld('tower', 2, 39, 35); army(2, 'fomor', 6, 41, 35);
    clearArea(55, 12, 8); paint(55, 12, 6, TER.stone); g.flags.fort = addBld('palace', 2, 53, 10).id; addBld('barracks', 2, 58, 15);
    g.flags.balor = addUnit('balor', 2, 56, 18, { keepHome: true }).id; army(2, 'fomor', 6, 50, 17);
  },
  setanta(g) {
    startBase(1, 10, 40, { houses: 2, villagers: 4 });
    g.flags.hero = addUnit('cuchulainn', 1, 18, 42).id; army(1, 'fian', 2, 15, 44);
    scatterRes(g.R, 'gold', 4, [[11, 41, 10]]); scatterRes(g.R, 'berry', 4, [[11, 41, 8]]);
    clearArea(26, 30, 5); paint(26, 30, 3, TER.dirt); addBld('house', 0, 24, 28); g.flags.hound = addUnit('hound', 3, 27, 32).id;
    clearArea(52, 14, 9); paint(52, 14, 6, TER.stone);
    g.flags.fort = addBld('palace', 2, 50, 12).id; addBld('tower', 2, 47, 18); addBld('tower', 2, 56, 18);
    g.flags.sons = [addUnit('nechtan', 2, 50, 18, { keepHome: true }).id, addUnit('nechtan', 2, 52, 19, { keepHome: true }).id, addUnit('nechtan', 2, 54, 18, { keepHome: true }).id];
    army(2, 'fian', 4, 48, 20); army(2, 'slinger', 2, 55, 21);
  },
  tain(g) {
    const n = g.n;
    startBase(1, 10, 50, { houses: 3, villagers: 6 });
    addBld('barracks', 1, 16, 44); army(1, 'fian', 3, 18, 50); army(1, 'slinger', 2, 15, 47);
    g.flags.hero = addUnit('cuchulainn', 1, 20, 47).id;
    g.flags.bull = addUnit('bull', 1, 8, 58).id;
    scatterRes(g.R, 'gold', 5, [[11, 51, 10]]); scatterRes(g.R, 'berry', 5, [[11, 51, 8]]);
    // the river and its ford
    for (let x = 0; x < n; x++) for (let dy = -1; dy <= 1; dy++) { const y = 34 + Math.round(Math.sin(x / 8) * 2) + dy; clearTile(x, y); setTer(x, y, x > 28 && x < 36 ? TER.shallow : TER.water); }
    clearArea(32, 30, 3); g.flags.ferdiad = addUnit('ferdiad', 2, 32, 30, { keepHome: true }).id;
    clearArea(52, 12, 10); paint(52, 12, 7, TER.dirt);
    g.flags.medb = addBld('agora', 2, 50, 10).id; addBld('barracks', 2, 56, 9); addBld('stable', 2, 46, 14); addBld('range', 2, 55, 15); addBld('house', 2, 47, 8); addBld('tower', 2, 52, 18);
    army(2, 'fian', 6, 50, 16); army(2, 'chariot', 2, 46, 18); army(2, 'slinger', 3, 54, 18);
    g.flags.riseAt = 600; // seconds until the Ulstermen rise
  },
});
// a pasture helper: farms to look at around the start
Object.assign(SCEN_TICK, {
  thrym(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Thor has fallen.');
    const l = g.byId.get(g.flags.loki), hall = g.byId.get(g.flags.hall), th = g.byId.get(g.flags.thrym);
    if (!g.flags.unveiled && hall && edgeDist(h, hall) < 3 && l && edgeDist(l, hall) < 4) {
      g.flags.unveiled = true; objective('hall', true); h.hammer = true; h.heraBoost = (h.heraBoost || 1) * 1.4;
      say('The hammer is laid in the bride\'s lap. Thor tears off the veil and grips Mjǫllnir!', 'gold'); SND && SND.thunder && SND.thunder();
      hostile([g.flags.thrym].concat(g.flags.feast), 2); if (hall) hall.owner = 2;
      for (const id of g.flags.feast) { const u = g.byId.get(id); if (u) { u.state = 'attack'; u.target = h.id; } }
    } else if (!g.flags.unveiled && hall && edgeDist(h, hall) < 3 && !l && !g.flags.lokiWarn) { g.flags.lokiWarn = true; say('Without Loki to explain the bride\'s strange ways, the giants will see through the disguise. Bring Loki too.', 'warn'); }
    if (!g.flags.unveiled && h.state === 'attack') { const t = g.byId.get(h.target); if (t && t.owner === 0) { h.state = 'idle'; h.target = null; if (!g.flags.calm) { g.flags.calm = true; say('Patience! The bride must not draw a weapon before the feast.', 'warn'); } } }
    if (g.flags.unveiled && !th && !g.flags.thrymDead) { g.flags.thrymDead = true; objective('thrym', true); }
    if (!g.byId.get(g.flags.camp)) objective('giants', true);
    checkWin();
  },
  sigurd(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Sigurd has fallen.');
    const fo = g.byId.get(g.flags.forge);
    if (!h.gram && fo && edgeDist(h, fo) < 2.5) { h.gram = true; h.heraBoost = (h.heraBoost || 1) * 1.5; objective('gram', true); say('Regin welds the shards together. Sigurd tries the new sword on the anvil, and Gram splits it to the base.', 'gold'); }
    const f = g.byId.get(g.flags.fafnir);
    if (f && !h.gram && dist(h.x, h.y, f.x, f.y) < 10 && !g.flags.warned) { g.flags.warned = true; say('Without Gram, no blade will bite on Fáfnir\'s scales. Go to Regin\'s forge first.', 'warn'); }
    if (!g.byId.get(g.flags.hunding)) objective('hunding', true);
    checkWin();
  },
  ragnarok(g) {
    if (!g.byId.get(g.flags.agora)) return lose('Asgard\'s hall has fallen.');
    const thor = g.byId.get(g.flags.hero), vid = g.byId.get(g.flags.vidarr), fen = g.byId.get(g.flags.fenrir), ser = g.byId.get(g.flags.serpent);
    if (fen && !vid) return lose('Víðarr has fallen, and no one is left to avenge Odin.');
    if (ser && !thor) return lose('Thor has fallen before the serpent was slain.');
    // the beasts come for you after a while
    if (g.time > 150 && !g.flags.unleashed) { g.flags.unleashed = true; say('Fenrir breaks free, his jaws gaping from earth to sky. The serpent crawls up the shore, spitting poison.', 'warn'); for (const b of [fen, ser]) if (b) { b.owner = 2; b.home = { x: 14.5, y: 34.5 }; b.state = 'move'; b.attackMove = true; moveTo(b, goalPoint(14, 34)); } }
    const odin = g.byId.get(g.flags.odin);
    if (odin && fen && dist(odin.x, odin.y, fen.x, fen.y) < 1.6 && !g.flags.odinDead) { g.flags.odinDead = true; kill(odin, fen); say('Fenrir swallows Odin. Now Víðarr must avenge his father.', 'warn'); }
    if (!fen && !g.flags.fenDead) { g.flags.fenDead = true; objective('fenrir', true); if (g.flags.killerF !== 'vidarr') say('The wolf is dead.', 'gold'); }
    if (!ser && !g.flags.serDead) { g.flags.serDead = true; objective('serpent', true); }
    if (g.flags.fenDead && g.flags.serDead && !g.flags.surtr) {
      g.flags.surtr = g.time; say('Surtr comes from the south with fire before and behind him. Hold out!', 'warn');
      const s = addUnit('surtr', 2, 54, 66); march(s, 14, 34); for (let k = 0; k < 6; k++) march(addUnit('jotunn', 2, 50 + k, 66), 14, 34); recount();
    }
    if (g.flags.surtr && g.time - g.flags.surtr > 150) objective('fire', true);
    checkWin();
  },
  magtuired(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Lugh has fallen.');
    const w = g.byId.get(g.flags.well);
    if (w && !g.flags.wellTaken && G.ents.some(e => e.owner === 1 && e.kind === 'unit' && edgeDist(e, w) < 3) && !G.ents.some(e => e.owner === 3 && e.kind === 'unit' && edgeDist(e, w) < 6)) { g.flags.wellTaken = true; objective('well', true); say('Dian Cécht sings over the well of Sláine: your wounded who come here will be made whole.', 'gold'); }
    if (g.flags.wellTaken && w) for (const u of G.ents) if (u.kind === 'unit' && u.owner === 1 && edgeDist(u, w) < 5) u.hp = Math.min(u.maxHp, u.hp + 6 * .25);
    if (!g.byId.get(g.flags.camp)) objective('camp', true);
    const b = g.byId.get(g.flags.balor);
    if (b && dist(h.x, h.y, b.x, b.y) < 12 && !g.flags.eye) { g.flags.eye = true; say('Four men lift Balor\'s eyelid with a polished handle. Keep the army back: the eye destroys whatever it looks on. Only Lugh can face it.', 'warn'); }
    checkWin();
  },
  setanta(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Cú Chulainn has fallen.');
    if (!g.byId.get(g.flags.hound) && !g.flags.houndDead) { g.flags.houndDead = true; objective('hound', true); say('The boy drives his ball down the hound\'s throat. "I will be your hound now," he tells Culann. From today he is Cú Chulainn.', 'gold'); }
    if (g.flags.sons.every(id => !g.byId.get(id))) objective('sons', true);
    if (!g.byId.get(g.flags.fort)) objective('fort', true);
    checkWin();
  },
  tain(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Cú Chulainn has fallen.');
    const bull = g.byId.get(g.flags.bull); if (!bull) return lose('The Brown Bull has been killed.');
    const left = Math.max(0, g.flags.riseAt - g.time);
    const o = G.objectives.find(x => x.id === 'rise'); if (o && !o.done) o.text = 'Hold the ford until the men of Ulster rise: ' + fmtTime(left);
    if (left <= 0 && !g.flags.risen) {
      g.flags.risen = true; objective('rise', true); if (o) o.text = 'The men of Ulster have risen!';
      say('The curse of Macha lifts! Conchobar and the men of Ulster come out of their sickness and march to the ford.', 'gold');
      army(1, 'curad', 6, 12, 44); army(1, 'chariot', 4, 15, 41); army(1, 'fian', 6, 18, 40); recount();
    }
    // Medb sends raiders after the bull
    const rk = Math.floor(g.time / 75); if (g.time > 90 && rk !== g.flags.raidK && !g.flags.risen) { g.flags.raidK = rk; const raid = army(2, g.time > 300 ? 'chariot' : 'fian', 3 + Math.floor(g.time / 150), 40, 26); for (const r of raid) { r.home = { x: bull.x, y: bull.y }; r.state = 'attack'; r.target = bull.id; } say('Medb\'s raiders cross the river to steal the Brown Bull!', 'warn'); recount(); }
    if (!g.byId.get(g.flags.ferdiad) && !g.flags.fdDead) { g.flags.fdDead = true; objective('ferdiad', true); say('Cú Chulainn calls for the gáe bolga and casts it with his foot. Fer Diad falls. "We were heart-companions," he says. "Now I shall have no one."', 'gold'); }
    if (!g.byId.get(g.flags.medb)) objective('medb', true);
    checkWin();
  },
});
const _onKill = SCEN_EVENTS.onKill;
SCEN_EVENTS.onKill = (d, a, how) => {
  _onKill && _onKill(d, a, how); if (!G) return;
  if (d.id === G.flags.fafnir) { objective('fafnir', true); say('Fáfnir crawls over the pit and Sigurd stabs up into his heart. "Who are you?" asks the dying dragon.', 'gold'); }
  if (d.id === G.flags.balor) { objective('balor', true); say('Lugh\'s sling stone drives the eye out through the back of Balor\'s head. It looks upon the Fomóire, and they fall.', 'gold'); for (const e of G.ents.slice()) if (e.kind === 'unit' && e.owner === 2 && dist(e.x, e.y, d.x, d.y) < 9) hit(d, e, 300); }
  if (d.id === G.flags.serpent) say('Thor kills the Midgard Serpent with his hammer.', 'gold');
  if (d.id === G.flags.fenrir) { G.flags.killerF = a && a.t; say(a && a.t === 'vidarr' ? 'Víðarr sets his shoe on the wolf\'s jaw and tears it apart. Odin is avenged.' : 'The wolf is dead.', 'gold'); }
};
