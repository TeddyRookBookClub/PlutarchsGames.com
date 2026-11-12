'use strict';
/* Heroes of Hellas — units, buildings, technologies, god powers and the campaign.
   Costs are { food, wood, gold }. Times in seconds. Speeds in tiles per second. Ranges and sight in tiles. */

const AGES = ['Archaic Age', 'Classical Age', 'Heroic Age'];
const AGE_COST = [null, { food: 400, gold: 100 }, { food: 700, gold: 300 }];
const AGE_TIME = [0, 40, 55];

const UNITS = {
  villager: { name: 'Villager', icon: '🧑‍🌾', hp: 25, atk: 3, armor: 0, range: .9, speed: 1.7, sight: 4, cost: { food: 50 }, time: 11, pop: 1, cd: 1.5, civ: true,
    info: 'Gathers food, wood and gold, and builds. The heart of your city.' },
  hoplite: { name: 'Hoplite', icon: '🛡️', hp: 70, atk: 7, armor: 2, range: .9, speed: 1.35, sight: 4, cost: { food: 60, gold: 20 }, time: 15, pop: 1, cd: 1.4, bonus: { cavalry: 2.2, myth: 1.2 },
    info: 'Spear and round shield. Strong against cavalry and steady against everything.' },
  archer: { name: 'Toxotes', icon: '🏹', hp: 32, atk: 5, armor: 0, range: 5.5, speed: 1.45, sight: 6.5, cost: { wood: 40, gold: 30 }, time: 14, pop: 1, cd: 1.9, missile: 'arrow', age: 1, bonus: { infantry: 1.4 },
    info: 'An archer. Shoots from range; keep hoplites in front.' },
  cavalry: { name: 'Hippeus', icon: '🐎', hp: 95, atk: 8, armor: 1, range: .9, speed: 2.5, sight: 5, cost: { food: 80, gold: 60 }, time: 20, pop: 2, cd: 1.6, age: 1, bonus: { archer: 2.2, siege: 2 }, type: 'cavalry',
    info: 'A horseman. Fast; rides down archers and rams.' },
  ram: { name: 'Battering ram', icon: '🪵', hp: 170, atk: 22, armor: 4, range: .9, speed: .9, sight: 3, cost: { wood: 160, gold: 70 }, time: 26, pop: 2, cd: 3, age: 2, bonus: { building: 3.5 }, onlyBuildings: true, type: 'siege',
    info: 'Batters down buildings. Cannot attack units, and cavalry make short work of it.' },
  // heroes: strong against myth creatures
  perseus: { name: 'Perseus', icon: '⚔️', hp: 260, atk: 16, armor: 3, range: .9, speed: 1.9, sight: 6, hero: true, cd: 1.2, bonus: { myth: 3 }, regen: 1.2,
    info: 'Son of Zeus. With Athena\'s polished shield he can look at the Gorgon\'s reflection and not be turned to stone.' },
  theseus: { name: 'Theseus', icon: '⚔️', hp: 300, atk: 17, armor: 3, range: .9, speed: 1.8, sight: 6, hero: true, cd: 1.2, bonus: { myth: 3 }, regen: 1.2,
    info: 'Prince of Athens. Volunteered to sail to Crete among the young people sent to the Minotaur.' },
  jason: { name: 'Jason', icon: '⚔️', hp: 280, atk: 15, armor: 3, range: .9, speed: 1.9, sight: 6, hero: true, cd: 1.2, bonus: { myth: 3 }, regen: 1.2,
    info: 'Captain of the Argo, sent to fetch the Golden Fleece from Colchis at the edge of the world.' },
  medea: { name: 'Medea', icon: '✨', hp: 160, atk: 9, armor: 1, range: 5, speed: 1.7, sight: 7, hero: true, cd: 1.6, missile: 'magic', bonus: { myth: 3 }, regen: 1.5,
    info: 'Princess of Colchis and a sorceress. She can sing the dragon to sleep.' },
  heracles: { name: 'Heracles', icon: '💪', hp: 420, atk: 24, armor: 4, range: .9, speed: 1.8, sight: 6, hero: true, cd: 1.3, bonus: { myth: 3 }, regen: 1.6,
    info: 'The strongest man alive, given twelve labours to win back his honour.' },
  ariadne: { name: 'Ariadne', icon: '🧵', hp: 60, atk: 0, armor: 0, range: 0, speed: 1.6, sight: 5, hero: true, cd: 9, civ: true, noAttack: true,
    info: 'Daughter of King Minos. Her ball of thread will lead Theseus out of the Labyrinth.' },
  // myth creatures
  medusa: { name: 'Medusa', icon: '🐍', hp: 520, atk: 14, armor: 3, range: 4, speed: 1.0, sight: 7, myth: true, cd: 2, missile: 'gaze', gaze: true, type: 'myth', info: 'A Gorgon. Anyone who meets her eyes turns to stone.' },
  minotaur: { name: 'Minotaur', icon: '🐂', hp: 900, atk: 26, armor: 3, range: 1, speed: 1.5, sight: 6, myth: true, cd: 1.8, type: 'myth', charge: true, info: 'Half man, half bull, kept in the Labyrinth beneath Knossos.' },
  dragon: { name: 'Colchian dragon', icon: '🐉', hp: 1200, atk: 20, armor: 4, range: 3.5, speed: .8, sight: 6, myth: true, cd: 2.4, missile: 'fire', splash: 1.6, type: 'myth', info: 'The serpent that never sleeps, coiled around the oak where the Golden Fleece hangs.' },
  spartos: { name: 'Spartos', icon: '💀', hp: 45, atk: 6, armor: 1, range: .9, speed: 1.4, sight: 5, myth: true, cd: 1.4, type: 'myth', info: 'A warrior sprung from a sown dragon\'s tooth.' },
  lion: { name: 'Nemean lion', icon: '🦁', hp: 800, atk: 22, armor: 2, range: 1, speed: 1.9, sight: 6, myth: true, cd: 1.4, type: 'myth', arrowproof: true, info: 'Its golden hide turns every blade and arrow. Heracles must wrestle it.' },
  hydra: { name: 'Lernaean hydra', icon: '🐲', hp: 1100, atk: 16, armor: 2, range: 2.2, speed: .7, sight: 6, myth: true, cd: 1.1, type: 'myth', regenMyth: 14, info: 'Cut off one head and two grow back. Only Heracles (and fire) can stop the regrowth.' },
  boar: { name: 'Erymanthian boar', icon: '🐗', hp: 520, atk: 15, armor: 2, range: .9, speed: 2.1, sight: 5, myth: true, cd: 1.3, type: 'myth', info: 'A monstrous boar that ravages the slopes of Mount Erymanthos.' },
  cyclops: { name: 'Cyclops', icon: '👁️', hp: 650, atk: 20, armor: 2, range: 1.2, speed: 1.1, sight: 6, myth: true, cd: 2.2, type: 'myth', info: 'A one-eyed giant.' },
};
for (const k in UNITS) { const u = UNITS[k]; u.id = k; if (!u.type) u.type = u.myth ? 'myth' : u.missile && !u.hero ? 'archer' : u.civ ? 'civ' : 'infantry'; }

const BUILDINGS = {
  agora: { name: 'Agora', icon: '🏛️', size: 3, hp: 1400, cost: { wood: 300, gold: 100 }, time: 80, pop: 5, sight: 7, drop: ['food', 'wood', 'gold'], trains: ['villager'], atk: 5, range: 6, cd: 2,
    techs: ['wheelbarrow', 'age1', 'age2'], info: 'The heart of the city. Trains villagers, takes every resource, and shoots arrows at raiders.' },
  house: { name: 'House', icon: '🏠', size: 2, hp: 350, cost: { wood: 30 }, time: 14, pop: 5, sight: 2, info: 'Room for five more people.' },
  storehouse: { name: 'Storehouse', icon: '📦', size: 2, hp: 500, cost: { wood: 100 }, time: 20, sight: 3, drop: ['food', 'wood', 'gold'], techs: ['axes', 'picks'], info: 'Build it near trees or gold so villagers walk less.' },
  farm: { name: 'Farm', icon: '🌾', size: 2, hp: 120, cost: { wood: 60 }, time: 10, sight: 1, farm: true, walkable: true, info: 'Barley that never runs out. One villager works each farm.' },
  barracks: { name: 'Barracks', icon: '⚔️', size: 3, hp: 900, cost: { wood: 150 }, time: 35, sight: 3, trains: ['hoplite', 'ram'], techs: ['bronze', 'spears'], info: 'Trains hoplites, and battering rams in the Heroic Age.' },
  range: { name: 'Archery range', icon: '🎯', size: 3, hp: 800, cost: { wood: 175 }, time: 35, sight: 3, trains: ['archer'], techs: ['fletching'], age: 1, info: 'Trains toxotai, the archers.' },
  stable: { name: 'Stable', icon: '🐴', size: 3, hp: 800, cost: { wood: 175 }, time: 35, sight: 3, trains: ['cavalry'], age: 1, info: 'Trains hippeis, the cavalry.' },
  temple: { name: 'Temple', icon: '⛩️', size: 3, hp: 1000, cost: { wood: 150, gold: 100 }, time: 45, sight: 4, age: 1, temple: true, info: 'Earns the gods\' favour over time and heals your units nearby. Spend favour on god powers.' },
  tower: { name: 'Watchtower', icon: '🗼', size: 1, hp: 600, cost: { wood: 100, gold: 50 }, time: 25, sight: 8, atk: 6, range: 7, cd: 1.8, age: 1, info: 'Shoots arrows at enemies in range.' },
  wall: { name: 'Palisade', icon: '🧱', size: 1, hp: 300, cost: { wood: 5 }, time: 4, sight: 1, wall: true, info: 'A cheap wooden wall.' },
  // scenario-only buildings
  palace: { name: 'Palace of Minos', icon: '👑', size: 4, hp: 2400, sight: 6, atk: 7, range: 6, cd: 1.6, trains: [], info: 'The great palace at Knossos.' },
  shrine: { name: 'Shrine of Athena', icon: '🦉', size: 2, hp: 99999, sight: 3, neutral: true, info: 'A small shrine to grey-eyed Athena.' },
  argo: { name: 'The Argo', icon: '⛵', size: 3, hp: 2000, sight: 5, pop: 10, drop: ['food', 'wood', 'gold'], trains: ['villager', 'hoplite'], ship: true, info: 'Jason\'s ship, built by Argos with timber from Dodona that can speak.' },
  oak: { name: 'Sacred oak', icon: '🌳', size: 2, hp: 99999, sight: 2, neutral: true, info: 'The Golden Fleece hangs in its branches.' },
  ruin: { name: 'Ruined camp', icon: '⛺', size: 2, hp: 600, sight: 4, trains: [], info: 'An enemy camp.' },
};
for (const k in BUILDINGS) BUILDINGS[k].id = k;
const BUILD_MENU = ['house', 'storehouse', 'farm', 'barracks', 'range', 'stable', 'temple', 'tower', 'wall', 'agora'];

const TECHS = {
  wheelbarrow: { name: 'Wheelbarrow', icon: '🛞', cost: { food: 150, wood: 50 }, time: 25, info: 'Villagers carry 50% more and walk a little faster.' },
  axes: { name: 'Bronze axes', icon: '🪓', cost: { food: 100, wood: 50 }, time: 20, info: 'Villagers cut wood 25% faster.' },
  picks: { name: 'Mining picks', icon: '⛏️', cost: { food: 100, wood: 75 }, time: 20, info: 'Villagers mine gold 25% faster.' },
  bronze: { name: 'Bronze shields', icon: '🥉', cost: { food: 150, gold: 100 }, time: 30, age: 1, info: '+1 armour for hoplites, archers and cavalry.' },
  spears: { name: 'Iron spearheads', icon: '🗡️', cost: { food: 120, gold: 120 }, time: 30, age: 1, info: '+2 attack for hoplites and cavalry.' },
  fletching: { name: 'Fletching', icon: '🪶', cost: { food: 100, wood: 50 }, time: 25, age: 1, info: '+1 attack and +1 range for archers and towers.' },
  age1: { name: 'Advance to the Classical Age', icon: '🏺', cost: AGE_COST[1], time: AGE_TIME[1], age: 0, ageUp: 1, info: 'Unlocks archers, cavalry, temples, towers and new technologies.' },
  age2: { name: 'Advance to the Heroic Age', icon: '🏆', cost: AGE_COST[2], time: AGE_TIME[2], age: 1, ageUp: 2, info: 'Unlocks battering rams. Heroes grow stronger (+25% attack and health).' },
};
for (const k in TECHS) TECHS[k].id = k;

const POWERS = {
  bolt: { name: 'Zeus\' thunderbolt', icon: '⚡', favor: 40, target: true, radius: 2.2, dmg: 220, info: 'Strike an area with lightning.' },
  aegis: { name: 'Athena\'s aegis', icon: '🦉', favor: 50, radius: 0, info: 'Your army takes no damage for 12 seconds.' },
  harvest: { name: 'Demeter\'s harvest', icon: '🌾', favor: 30, info: 'Gain 250 food at once.' },
  wave: { name: 'Poseidon\'s wave', icon: '🌊', favor: 60, target: true, radius: 3, dmg: 120, push: true, info: 'A great wave crashes through an area and hurls enemies aside.' },
};

const PLAYER_COLORS = [null, { main: '#2a62c9', dark: '#173c80', light: '#8db4ff', name: 'Blue' }, { main: '#c93a2a', dark: '#7d1d12', light: '#ff9a8a', name: 'Red' }, { main: '#6b4aa8', dark: '#3d2768', light: '#c3a8ff', name: 'Purple' }];

/* ---------- campaign ----------
   map: { size, seed, sea: edge or null, forest density, gold, berries, hills }
   setup(g): places buildings, units and creatures (player 1 = you, 2 = enemy, 0 = gaia/neutral, 3 = monsters)
   objectives: [{ id, text }] — scenario code marks them done; win when all 'main' objectives are done        */
const CAMPAIGN = [
  {
    id: 'perseus', title: 'Perseus and the Gorgon', place: 'Seriphos and the far west',
    intro: [
      'King Polydectes wants Danaë, the mother of Perseus, for his wife, and Perseus is in the way. So the king asks for an impossible gift: the head of Medusa, the Gorgon whose gaze turns living things to stone.',
      'Perseus is the son of Zeus, and the gods take his side. Athena will lend him her polished bronze shield, so he can watch the Gorgon in its reflection and never meet her eyes.',
      'Build up your settlement, raise an army of hoplites, and lead Perseus to the shrine of Athena. Then cross to the Gorgon\'s lair. Keep your soldiers back: only Perseus can face Medusa.'
    ],
    map: { size: 64, seed: 7, sea: 'west', forest: .55, gold: 4, berries: 4 },
    start: { food: 300, wood: 300, gold: 150, favor: 0 },
    objectives: [
      { id: 'shrine', text: 'Bring Perseus to the shrine of Athena for her shield', main: true },
      { id: 'medusa', text: 'Defeat Medusa in her lair (north-east)', main: true },
      { id: 'pop', text: 'Optional: grow your city to 20 people' },
      { id: 'hero', text: 'Perseus must survive', keep: true },
    ],
    outro: 'Perseus walked backwards into the cave, watching the shield, and struck once. From Medusa\'s neck sprang the winged horse Pegasus. On the way home Perseus used the Gorgon\'s head to turn a sea monster to stone and save Andromeda, and then he turned Polydectes and his court to stone too. He gave the head to Athena, who set it in the middle of her aegis.',
  },
  {
    id: 'theseus', title: 'Theseus and the Minotaur', place: 'Knossos, on Crete',
    intro: [
      'Every nine years Athens must send seven young men and seven young women to Crete, to be fed to the Minotaur in the Labyrinth that Daedalus built. This time Theseus, son of King Aegeus, sails with them.',
      'In Knossos, Princess Ariadne falls in love with Theseus. She gives him a ball of thread: tie it at the door, unwind it as you go, and follow it back out.',
      'Find Ariadne in the city of Minos, bring her to Theseus, then enter the Labyrinth and slay the Minotaur. King Minos will send his soldiers against your camp.'
    ],
    map: { size: 64, seed: 19, sea: 'south', forest: .35, gold: 4, berries: 3, labyrinth: true },
    start: { food: 250, wood: 300, gold: 200, favor: 0 },
    objectives: [
      { id: 'ariadne', text: 'Find Ariadne near the Palace of Minos and bring her to Theseus', main: true },
      { id: 'minotaur', text: 'Enter the Labyrinth and slay the Minotaur', main: true },
      { id: 'palace', text: 'Optional: bring down the Palace of Minos' },
      { id: 'hero', text: 'Theseus must survive', keep: true },
    ],
    outro: 'Theseus killed the Minotaur and followed Ariadne\'s thread back into the daylight. They sailed for Athens that night. But Theseus forgot his promise to his father: to change the black sails for white if he came home alive. King Aegeus saw black sails from the cliffs, and in his grief threw himself into the sea that has carried his name ever since: the Aegean.',
  },
  {
    id: 'jason', title: 'Jason and the Golden Fleece', place: 'Colchis, at the eastern edge of the Black Sea',
    intro: [
      'Pelias stole the throne of Iolcus from Jason\'s father. He promises to give it back, if Jason can bring him the Golden Fleece from Colchis, at the end of the known world.',
      'Jason gathers the greatest heroes of Greece aboard the Argo. In Colchis, King Aeëtes sets him a task he thinks will kill him: plough a field with fire-breathing bulls, then sow it with dragon\'s teeth. Warriors rise from the furrows.',
      'The king\'s daughter Medea, a sorceress, decides to help. Bring Jason and Medea to the sacred oak, defeat the dragon that guards it, and carry the Fleece back to the Argo before Aeëtes\' army can stop you.'
    ],
    map: { size: 64, seed: 33, sea: 'west', forest: .6, gold: 4, berries: 4 },
    start: { food: 300, wood: 250, gold: 250, favor: 20 },
    objectives: [
      { id: 'medea', text: 'Meet Medea in the hills east of the Argo', main: true },
      { id: 'dragon', text: 'Defeat the dragon at the sacred oak', main: true },
      { id: 'fleece', text: 'Bring the Golden Fleece back to the Argo', main: true },
      { id: 'hero', text: 'Jason must survive', keep: true },
    ],
    outro: 'Medea sang the dragon to sleep, Jason lifted down the Fleece, and the Argo slipped out of the harbour before dawn. The voyage home took them past the Sirens, the Clashing Rocks and the bronze giant Talos, and the Fleece shone in the stern the whole way to Iolcus.',
  },
  {
    id: 'heracles', title: 'The Labours of Heracles', place: 'The Peloponnese',
    intro: [
      'Driven mad by the goddess Hera, Heracles did a terrible thing. To make amends, the oracle at Delphi sent him to serve King Eurystheus of Tiryns, who set him ten labours, and then two more.',
      'Three of the labours are here. The Nemean lion, whose golden hide no weapon can pierce. The Hydra of Lerna, which grows two heads for every one cut off. And the great boar of Mount Erymanthos.',
      'Arrows bounce off the lion and the Hydra heals while Heracles is away from it, so this is work for Heracles himself. Build a city to support him; the army of Argos will test your walls.'
    ],
    map: { size: 72, seed: 51, sea: null, forest: .5, gold: 5, berries: 5 },
    start: { food: 300, wood: 300, gold: 200, favor: 30 },
    objectives: [
      { id: 'lion', text: 'Slay the Nemean lion (north)', main: true },
      { id: 'hydra', text: 'Slay the Hydra in the marsh of Lerna (south-east)', main: true },
      { id: 'boar', text: 'Capture the Erymanthian boar (east)', main: true },
      { id: 'camp', text: 'Optional: destroy the camp of Argos' },
      { id: 'hero', text: 'Heracles must survive', keep: true },
    ],
    outro: 'Heracles wore the lion\'s skin as a cloak for the rest of his life, its head as a helmet. He dipped his arrows in the Hydra\'s blood. When he carried the boar back alive, King Eurystheus was so frightened he hid in a great bronze jar. Nine labours remained, and Heracles finished every one.',
  },
];

const SKIRMISH = { id: 'skirmish', title: 'Skirmish: Athens against Sparta', skirmish: true, place: 'A plain in Boeotia',
  intro: ['A free game. Build a city, advance through the ages, and destroy the enemy Agora to win. The enemy builds and attacks on its own; it grows bolder as time passes.'],
  map: { size: 72, seed: 0, sea: null, forest: .5, gold: 5, berries: 5 },
  start: { food: 300, wood: 300, gold: 150, favor: 0 },
  objectives: [{ id: 'agora', text: 'Destroy the enemy Agora', main: true }, { id: 'tc', text: 'Keep your Agora standing', keep: true }],
  outro: 'The enemy city has fallen. Hellas will remember this day.' };
