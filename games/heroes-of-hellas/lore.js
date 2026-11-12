'use strict';
/* Heroes of Hellas — the Codex (gods, heroes, monsters, stories, words), Homeric Greek names and speech,
   the extra god powers, and the cheat codes typed into the chat box (press Enter in a game).
   Greek is given in Homeric (Ionic) forms where Homer uses the word; a note says when he doesn't. */

const GODS = [
  { id: 'zeus', name: 'Zeus', gr: 'Ζεύς', tr: 'Zeús', ep: 'νεφεληγερέτα Ζεύς', ept: 'nephelēgeréta Zeús', epe: 'Zeus the cloud-gatherer', power: 'bolt',
    role: 'King of the gods, lord of the sky, thunder and the law of hospitality.', sym: 'Thunderbolt, eagle, oak',
    text: 'Zeus overthrew his father Kronos and the Titans and drew lots with his brothers: Poseidon took the sea, Hades the underworld, and Zeus the sky. From Mount Olympus he weighs the fates of men; in the Iliad he lifts golden scales to decide who will die. He protects guests and strangers, so in Homer the worst crime is to wrong a guest.' },
  { id: 'hera', name: 'Hera', gr: 'Ἥρη', tr: 'Hḗrē', ep: 'λευκώλενος Ἥρη', ept: 'leukṓlenos Hḗrē', epe: 'white-armed Hera', power: 'hera',
    role: 'Queen of the gods, goddess of marriage and of women.', sym: 'Peacock, cow, diadem',
    text: 'Wife and sister of Zeus. In the Iliad she takes the side of the Greeks and once lulls Zeus to sleep so they can win a battle. She hated Heracles, Zeus\'s son by a mortal woman, and sent two snakes into his cradle; the baby strangled them.' },
  { id: 'poseidon', name: 'Poseidon', gr: 'Ποσειδάων', tr: 'Poseidáōn', ep: 'ἐννοσίγαιος', ept: 'ennosígaios', epe: 'the Earth-shaker', power: 'wave',
    role: 'God of the sea, earthquakes and horses.', sym: 'Trident, horse, bull, dolphin',
    text: 'When Odysseus blinded his son, the Cyclops Polyphemus, Poseidon kept him from home for ten years. Poseidon competed with Athena to be the patron of Athens: he struck a rock and salt water sprang out; she planted the first olive tree, and the Athenians chose her.' },
  { id: 'athena', name: 'Athena', gr: 'Ἀθήνη', tr: 'Athḗnē', ep: 'γλαυκῶπις Ἀθήνη', ept: 'glaukôpis Athḗnē', epe: 'grey-eyed (or owl-eyed) Athena', power: 'aegis',
    role: 'Goddess of wisdom, crafts and war fought with a clear head.', sym: 'Owl, olive tree, aegis, helmet',
    text: 'Athena sprang fully armed from the head of Zeus. She is the guardian of clever heroes: she lends Perseus her shield, helps Heracles, and walks beside Odysseus in disguise all through the Odyssey. Her aegis, a goatskin cloak, carries the Gorgon\'s head.' },
  { id: 'apollo', name: 'Apollo', gr: 'Ἀπόλλων', tr: 'Apóllōn', ep: 'ἑκηβόλος Ἀπόλλων', ept: 'hekēbólos Apóllōn', epe: 'Apollo who shoots from afar', power: 'heal',
    role: 'God of music, prophecy, healing, plague and the bow.', sym: 'Lyre, silver bow, laurel, the sun (later)',
    text: 'The Iliad opens with Apollo\'s anger: the Greeks insult his priest, and for nine days his arrows bring plague to their camp. His oracle at Delphi was the most famous in Greece, where the priestess (the Pythia) spoke his answers. He both sends sickness and heals it.' },
  { id: 'artemis', name: 'Artemis', gr: 'Ἄρτεμις', tr: 'Ártemis', ep: 'ἰοχέαιρα', ept: 'iokhéaira', epe: 'pourer of arrows', power: 'hunt',
    role: 'Goddess of the hunt, wild animals and the moon (later).', sym: 'Bow, deer, cypress',
    text: 'Apollo\'s twin sister. She roams the mountains with her nymphs and protects young animals and girls. When King Agamemnon killed a deer in her sacred grove, she held back the winds so the Greek fleet could not sail for Troy.' },
  { id: 'ares', name: 'Ares', gr: 'Ἄρης', tr: 'Árēs', ep: 'βροτολοιγός', ept: 'brotoloigós', epe: 'bane of mortals', power: 'fury',
    role: 'God of war\'s violence and battle-rage.', sym: 'Spear, helmet, dog, vulture',
    text: 'Even his father Zeus calls him the most hateful of the gods. In the Iliad the Greek hero Diomedes, guided by Athena, wounds Ares with a spear, and he runs bellowing back to Olympus "as loud as nine or ten thousand men."' },
  { id: 'aphrodite', name: 'Aphrodite', gr: 'Ἀφροδίτη', tr: 'Aphrodítē', ep: 'φιλομμειδὴς Ἀφροδίτη', ept: 'philommeidḕs Aphrodítē', epe: 'laughter-loving Aphrodite', power: 'charm',
    role: 'Goddess of love and beauty.', sym: 'Dove, myrtle, rose, scallop shell',
    text: 'The Trojan prince Paris judged her more beautiful than Hera and Athena, and her prize was Helen, the most beautiful woman in the world: the start of the Trojan War. In the Iliad she snatches Paris out of a duel in a cloud of mist.' },
  { id: 'hephaestus', name: 'Hephaestus', gr: 'Ἥφαιστος', tr: 'Hḗphaistos', ep: 'κλυτοτέχνης', ept: 'klutotékhnēs', epe: 'famed for his craft', power: 'forge',
    role: 'God of fire, the forge and metalwork.', sym: 'Hammer, anvil, tongs',
    text: 'The lame smith of the gods. He built the gods\' bronze palaces, golden robot servants that could walk and think, and, at the request of Achilles\' mother Thetis, a shield for Achilles covered with scenes of the whole world: cities at peace and at war, harvests, weddings and dances.' },
  { id: 'hermes', name: 'Hermes', gr: 'Ἑρμείας', tr: 'Hermeías', ep: 'ἀργεϊφόντης', ept: 'argeïphóntēs', epe: 'slayer of Argus (the usual meaning)', power: 'swift',
    role: 'Messenger of the gods, guide of travellers and of the dead; god of thieves and trade.', sym: 'Winged sandals, herald\'s staff (kerykeion)',
    text: 'On the day he was born he invented the lyre from a tortoise shell and stole Apollo\'s cattle. In the Odyssey he flies to Calypso\'s island to order Odysseus\' release, and gives Odysseus the magic herb moly to protect him from Circe.' },
  { id: 'demeter', name: 'Demeter', gr: 'Δημήτηρ', tr: 'Dēmḗtēr', ep: 'ξανθὴ Δημήτηρ', ept: 'xanthḕ Dēmḗtēr', epe: 'fair-haired Demeter', power: 'harvest',
    role: 'Goddess of grain and the harvest.', sym: 'Ears of wheat, torch',
    text: 'When Hades carried off her daughter Persephone, Demeter searched the earth and let nothing grow. Zeus made a bargain: because Persephone had eaten pomegranate seeds in the underworld, she spends part of each year there, and those months are winter.' },
  { id: 'dionysus', name: 'Dionysus', gr: 'Διώνυσος', tr: 'Diṓnusos', ep: 'μαινόμενος Διώνυσος', ept: 'mainómenos Diṓnusos', epe: 'raving Dionysus', power: 'revel',
    role: 'God of wine, theatre and wild celebration.', sym: 'Grapevine, ivy, thyrsus, panther',
    text: 'The youngest Olympian, son of Zeus and a mortal princess. Pirates once kidnapped him; vines grew up the mast, he turned into a lion, and the pirates leapt overboard and became dolphins. Athens honoured him with the festival where Greek tragedy and comedy were born.' },
  { id: 'hades', name: 'Hades', gr: 'Ἀΐδης', tr: 'Aḯdēs', ep: 'Ἀΐδης πελώριος', ept: 'Aḯdēs pelṓrios', epe: 'monstrous Hades', power: 'shades',
    role: 'Lord of the underworld and the dead. Not one of the Olympians: he lives below.', sym: 'Helmet of invisibility, Cerberus, key',
    text: 'In the Odyssey, Odysseus digs a pit and pours blood into it, and the shades of the dead come up to drink and speak: his mother, the prophet Teiresias, and Achilles, who says he would rather be a poor farmer alive than king of all the dead.' },
  { id: 'hestia', name: 'Hestia', gr: 'Ἑστίη', tr: 'Hestíē', ep: '(not in Homer)', ept: '', epe: 'Homer never names her; the Homeric Hymns do', power: 'hearth',
    role: 'Goddess of the hearth, the home and the city\'s sacred fire.', sym: 'Hearth fire',
    text: 'The eldest child of Kronos, she gave up her seat among the Twelve so Dionysus could have one, and stayed home tending the fire. Every meal began and ended with an offering to her, and colonists carried fire from their mother city\'s hearth to light the new one.' },
];
const HEROES = [
  { id: 'perseus', name: 'Perseus', gr: 'Περσεύς', tr: 'Perseús', text: 'Son of Zeus and Danaë. With Athena\'s shield, Hermes\' winged sandals and Hades\' cap of invisibility, he beheaded the Gorgon Medusa, then rescued Andromeda from a sea monster.' },
  { id: 'theseus', name: 'Theseus', gr: 'Θησεύς', tr: 'Thēseús', text: 'Prince of Athens who killed the Minotaur with Ariadne\'s help. Athenians later credited him with uniting the villages of Attica into one city.' },
  { id: 'jason', name: 'Jason', gr: 'Ἰήσων', tr: 'Iḗsōn', text: 'Leader of the Argonauts. The Odyssey (12.70) mentions the Argo as "known to all", Ἀργὼ πᾶσι μέλουσα: the voyage was already famous in Homer\'s day.' },
  { id: 'heracles', name: 'Heracles', gr: 'Ἡρακλέης', tr: 'Hēraklées', text: 'The strongest of heroes, son of Zeus and Alcmene. Homer speaks of "the might of Heracles" (βίη Ἡρακληείη). After his twelve labours he became a god on Olympus.' },
  { id: 'medea', name: 'Medea', gr: 'Μήδεια', tr: 'Mḗdeia', text: 'Princess of Colchis, granddaughter of the Sun, and a sorceress. She saved Jason more than once, but his later betrayal turned her story into one of the darkest Greek tragedies.' },
  { id: 'ariadne', name: 'Ariadne', gr: 'Ἀριάδνη', tr: 'Ariádnē', text: 'Daughter of King Minos. On Achilles\' shield, the Iliad (18.592) shows a dancing floor "like the one Daedalus made in wide Knossos for Ariadne of the lovely hair."' },
  { id: 'achilles', name: 'Achilles', gr: 'Ἀχιλλεύς', tr: 'Akhilleús', ep: 'πόδας ὠκὺς Ἀχιλλεύς · swift-footed Achilles', text: 'The greatest Greek warrior at Troy. The Iliad\'s first word is μῆνιν, "wrath": the wrath of Achilles, who quarrels with Agamemnon and refuses to fight until his friend Patroclus is killed.' },
  { id: 'odysseus', name: 'Odysseus', gr: 'Ὀδυσσεύς', tr: 'Odusseús', ep: 'πολύτροπος · of many turns', text: 'King of Ithaca and the cleverest of the Greeks; his idea was the wooden horse. The Odyssey tells his ten-year journey home to his wife Penelope.' },
  { id: 'hector', name: 'Hector', gr: 'Ἕκτωρ', tr: 'Héktōr', ep: 'κορυθαίολος · of the flashing helmet', text: 'Prince and champion of Troy. His farewell to his wife Andromache and baby son, who is frightened by his father\'s plumed helmet, is one of the most famous scenes in the Iliad.' },
];
const MONSTERS = [
  { id: 'medusa', name: 'Medusa', gr: 'Μέδουσα', tr: 'Médousa', text: 'One of the three Gorgons, the only one who could die. Snakes for hair; one look turned you to stone. The Iliad already describes the "Gorgon head, dreadful and grim" on Athena\'s aegis.' },
  { id: 'minotaur', name: 'Minotaur', gr: 'Μινώταυρος', tr: 'Minṓtauros', text: '"The bull of Minos": half man, half bull, kept in the Labyrinth that Daedalus built at Knossos. Homer does not tell this story; later poets do.' },
  { id: 'dragon', name: 'The Colchian dragon', gr: 'δράκων', tr: 'drákōn', text: 'A serpent that never slept, coiled round the oak of Ares where the Golden Fleece hung. In Homer, δράκων simply means a great snake.' },
  { id: 'lion', name: 'The Nemean lion', gr: 'λέων', tr: 'léōn', text: 'A lion with a hide no weapon could cut. Heracles trapped it in its cave and strangled it, then skinned it with its own claws.' },
  { id: 'hydra', name: 'The Hydra of Lerna', gr: 'Ὕδρη', tr: 'Húdrē', text: 'A many-headed water serpent. For every head cut off, two grew back, until Heracles\' nephew Iolaus burned each stump with a torch.' },
  { id: 'boar', name: 'The Erymanthian boar', gr: 'σῦς', tr: 'sûs', text: 'A huge boar from Mount Erymanthos. Heracles chased it into deep snow and caught it in a net.' },
  { id: 'cyclops', name: 'The Cyclopes', gr: 'Κύκλωπες', tr: 'Kúklōpes', text: 'One-eyed giants. In the Odyssey, Polyphemus traps Odysseus in his cave; Odysseus tells him his name is Οὖτις, "Nobody", so when the blinded giant shouts for help, he cries "Nobody is hurting me!"' },
  { id: 'spartoi', name: 'The Spartoi', gr: 'Σπαρτοί', tr: 'Spartoí', text: '"The sown men": warriors who sprang up fully armed from dragon\'s teeth planted in the earth, both at Thebes and in Colchis.' },
];
const STORIES = [
  { title: 'The Trojan War', text: 'Paris of Troy carried off Helen, wife of Menelaus of Sparta, and the Greeks sailed to bring her back. The siege lasted ten years. The Iliad tells a few weeks of the tenth year; the war ended when the Greeks pretended to sail away, leaving a great wooden horse with soldiers hidden inside. The Trojans pulled it into the city.' },
  { title: 'The Odyssey', text: 'Ten more years for Odysseus to get home: the Lotus-eaters, the Cyclops, the bag of winds, the witch Circe, the land of the dead, the Sirens, Scylla and Charybdis, seven years on Calypso\'s island. At home in Ithaca, suitors were eating his food and courting his wife. He came back disguised as a beggar and strung his great bow, which no one else could bend.' },
  { title: 'Prometheus', text: 'The Titan who stole fire from the gods and gave it to people. Zeus chained him to a mountain where an eagle ate his liver each day, and it grew back each night, until Heracles set him free.' },
  { title: 'Persephone', text: 'Hades carried Demeter\'s daughter down to the underworld. Her mother\'s grief brought the first winter. Because Persephone ate six pomegranate seeds there, she returns below each year, and the earth grows cold until she comes back.' },
  { title: 'The judgement of Paris', text: 'At a wedding, the goddess of strife threw down a golden apple marked "for the fairest." Hera, Athena and Aphrodite each claimed it, and Zeus made the Trojan prince Paris choose. Hera offered power, Athena victory in war, and Aphrodite the most beautiful woman in the world.' },
];
// Homeric (or Homeric-style) words for what you see in the game
const WORDS = {
  villager: ['λαός', 'laós', 'folk, the people'], hoplite: ['αἰχμητής', 'aikhmētḗs', 'spearman'], archer: ['τοξότης', 'toxótēs', 'archer'], cavalry: ['ἱππεύς', 'hippeús', 'horseman'], ram: ['κριός', 'kriós', 'ram'],
  agora: ['ἀγορή', 'agorḗ', 'assembly, meeting-place'], house: ['οἶκος', 'oîkos', 'house, household'], storehouse: ['θάλαμος', 'thálamos', 'storeroom'], farm: ['ἀγρός', 'agrós', 'field'], barracks: ['κλισίαι', 'klisíai', 'huts (of the army)'],
  range: ['σκοπός', 'skopós', 'mark, target'], stable: ['φάτνη', 'phátnē', 'manger'], temple: ['νηός', 'nēós', 'temple'], tower: ['πύργος', 'púrgos', 'tower'], wall: ['τεῖχος', 'teîkhos', 'wall'], argo: ['νηῦς', 'nēûs', 'ship'],
  food: ['σῖτος', 'sîtos', 'grain, bread'], wood: ['ὕλη', 'húlē', 'wood, forest'], gold: ['χρυσός', 'khrusós', 'gold'], favor: ['κῦδος', 'kûdos', 'glory the gods give'],
  tree: ['δένδρεον', 'déndreon', 'tree'], berry: ['σταφυλή', 'staphulḗ', 'bunch of grapes'],
  perseus: ['Περσεύς', 'Perseús', 'Perseus'], theseus: ['Θησεύς', 'Thēseús', 'Theseus'], jason: ['Ἰήσων', 'Iḗsōn', 'Jason'], heracles: ['Ἡρακλέης', 'Hēraklées', 'Heracles'], medea: ['Μήδεια', 'Mḗdeia', 'Medea'], ariadne: ['Ἀριάδνη', 'Ariádnē', 'Ariadne'],
  medusa: ['Μέδουσα', 'Médousa', 'Medusa'], minotaur: ['Μινώταυρος', 'Minṓtauros', 'Minotaur'], dragon: ['δράκων', 'drákōn', 'serpent, dragon'], lion: ['λέων', 'léōn', 'lion'], hydra: ['Ὕδρη', 'Húdrē', 'Hydra'], boar: ['σῦς', 'sûs', 'boar'], cyclops: ['Κύκλωψ', 'Kúklōps', 'Cyclops'], spartos: ['Σπαρτός', 'Spartós', 'sown man'],
  trojanhorse: ['δουράτεος ἵππος', 'douráteos híppos', 'the wooden horse'], pegasus: ['Πήγασος', 'Pḗgasos', 'Pegasus'],
};
const VOCAB = [
  ['θεός', 'theós', 'god'], ['θεά', 'theá', 'goddess'], ['ἀνήρ', 'anḗr', 'man'], ['ἄναξ', 'ánax', 'lord, king'], ['βασιλεύς', 'basileús', 'king, chief'], ['ἥρως', 'hḗrōs', 'hero, warrior'],
  ['κλέος', 'kléos', 'fame, what is told of you'], ['κῦδος', 'kûdos', 'glory from the gods'], ['μῆνις', 'mênis', 'wrath (the Iliad\'s first word)'], ['νόστος', 'nóstos', 'homecoming'], ['ξεῖνος', 'xeînos', 'guest, stranger, guest-friend'], ['ἀρετή', 'aretḗ', 'excellence'],
  ['ἔγχος', 'énkhos', 'spear'], ['ἀσπίς', 'aspís', 'shield'], ['ξίφος', 'xíphos', 'sword'], ['τόξον', 'tóxon', 'bow'], ['ἵππος', 'híppos', 'horse'], ['νηῦς', 'nēûs', 'ship'],
  ['πόλις', 'pólis', 'city'], ['τεῖχος', 'teîkhos', 'wall'], ['πόλεμος', 'pólemos', 'war'], ['μάχη', 'mákhē', 'battle'], ['θάλασσα', 'thálassa', 'sea'], ['ἠώς', 'ēṓs', 'dawn'],
  ['ῥοδοδάκτυλος Ἠώς', 'rhododáktulos Ēṓs', 'rosy-fingered Dawn'], ['οἶνοψ πόντος', 'oînops póntos', 'the wine-dark sea'], ['ἔπεα πτερόεντα', 'épea pteróenta', 'winged words'], ['χρυσός', 'khrusós', 'gold'], ['σῖτος', 'sîtos', 'grain, food'], ['οἶνος', 'oînos', 'wine'],
];
// what units say when you select or order them (Homeric phrases, kept short)
const SPEECH = {
  select: [['τί χρή;', 'tí khrḗ?', 'What is needed?'], ['πάρειμι.', 'páreimi.', 'I am here.'], ['ἄναξ;', 'ánax?', 'My lord?'], ['ναὶ δή.', 'naì dḗ.', 'Yes indeed.']],
  move: [['εἶμι.', 'eîmi.', 'I am going.'], ['ἔρχομαι.', 'érkhomai.', 'I\'m on my way.'], ['ὣς ἔσεται.', 'hṑs ésetai.', 'So it shall be.']],
  attack: [['πόλεμόνδε!', 'polemónde!', 'To war!'], ['ἐς μάχην!', 'es mákhēn!', 'Into battle!'], ['βάλλ\' οὕτως!', 'báll\' hoútōs!', 'Shoot like that!']],
  work: [['ναὶ δή, ἄναξ.', 'naì dḗ, ánax.', 'Yes, my lord.'], ['ἐργάζομαι.', 'ergázomai.', 'I\'ll get to work.']],
  build: [['τεύχω.', 'teúkhō.', 'I\'ll build it.'], ['οἰκοδομήσω.', 'oikodomḗsō.', 'I will build.']],
};
const FACTS = [
  'Homer\'s poems were sung, not read: bards (ἀοιδοί) performed them from memory to the lyre for centuries before they were written down.',
  'The Iliad is about 15,700 lines long and the Odyssey about 12,100, all in the same six-beat rhythm, dactylic hexameter.',
  'Homer\'s heroes are known by epithets like "swift-footed Achilles" and "grey-eyed Athena". They fit the rhythm of the line and helped bards compose as they sang.',
  'A Greek temple was the god\'s house, not a place for crowds: people worshipped at the altar outside, where sacrifices were made.',
  'Olympus is a real mountain, the highest in Greece at 2,918 metres.',
  'Greeks swore oaths "by Zeus, guardian of guests": hospitality to strangers (ξενία) was a sacred duty.',
  'The Trojan War may echo a real conflict: archaeologists have found a burned layer at Troy (Hisarlık, in Turkey) from around 1180 BC.',
  'Every four years the Olympic Games honoured Zeus at Olympia; a sacred truce let athletes travel safely.',
  'Athena\'s owl gave Athens its coins their nickname: "owls".',
  'The Greek word μῦθος (mûthos) in Homer just means "word" or "speech"; only later did it come to mean a myth.',
];

/* ---------- extra god powers ---------- */
Object.assign(POWERS, {
  heal: { name: 'Apollo\'s healing', icon: '☀️', favor: 35, info: 'Every one of your units is healed to full health.' },
  hunt: { name: 'Artemis\' hunt', icon: '🦌', favor: 25, info: 'Artemis sends game: +150 food and +100 wood.' },
  fury: { name: 'Ares\' battle-fury', icon: '🔥', favor: 45, info: 'For 20 seconds your army strikes 50% harder.' },
  charm: { name: 'Aphrodite\'s charm', icon: '💗', favor: 55, target: true, radius: 1.6, info: 'An enemy soldier (not a hero or monster) falls in love with your cause and changes sides.' },
  forge: { name: 'Hephaestus\' forge', icon: '🔨', favor: 30, info: 'All of your buildings are repaired.' },
  swift: { name: 'Hermes\' sandals', icon: '🪽', favor: 25, info: 'For 25 seconds all your units move 60% faster.' },
  revel: { name: 'Dionysus\' revel', icon: '🍇', favor: 40, target: true, radius: 3, info: 'Enemies in the area drop their weapons and dance for 10 seconds.' },
  shades: { name: 'Shades of Hades', icon: '💀', favor: 50, target: true, radius: 2, info: 'Five sown warriors rise from the earth to fight for you.' },
  hera: { name: 'Hera\'s favour', icon: '👑', favor: 40, info: 'Your heroes are healed and grow 20% stronger (once per game).' },
  hearth: { name: 'Hestia\'s hearth', icon: '🔥', favor: 60, info: 'Room for 10 more people, for the rest of the game (once per game).' },
});
POWERS.bolt.god = 'zeus'; POWERS.aegis.god = 'athena'; POWERS.harvest.god = 'demeter'; POWERS.wave.god = 'poseidon';
for (const g of GODS) if (POWERS[g.power]) POWERS[g.power].god = g.id;
const POWER_ORDER = GODS.map(g => g.power).filter(k => POWERS[k]);

/* ---------- cheat units ---------- */
Object.assign(UNITS, {
  trojanhorse: { id: 'trojanhorse', name: 'Trojan Horse', icon: '🐴', hp: 2500, atk: 0, armor: 6, range: 0, speed: .8, sight: 6, cd: 9, noAttack: true, cheat: true, type: 'siege', pop: 0,
    info: 'A huge wooden horse with soldiers hiding inside. Roll it up to the enemy and press "Open the horse".' },
  pegasus: { id: 'pegasus', name: 'Pegasus', icon: '🦄', hp: 260, atk: 14, armor: 2, range: .9, speed: 4.2, sight: 8, cd: 1, flying: true, cheat: true, type: 'cavalry', pop: 0, bonus: { myth: 2 },
    info: 'The winged horse that sprang from Medusa\'s neck. Flies over water, trees and walls.' },
});

/* ---------- Homeric Greek display ---------- */
const GR = { on: false };
try { GR.on = localStorage.getItem('hh-greek') === '1'; } catch (e) { }
function grName(id, english) {
  const w = WORDS[id]; if (!GR.on || !w) return english;
  return `${english} <span class="gr">${w[0]}</span> <span class="tr">${w[1]}</span>`;
}
function speak(u, kind) {
  if (!GR.on || !u || !SPEECH[kind]) return;
  if (performance.now() - (speak.t || 0) < 1500) return; speak.t = performance.now();
  const L = SPEECH[kind], s = L[Math.floor(Math.random() * L.length)];
  G.fx = G.fx.filter(f => f.k !== 'say');
  G.fx.push({ k: 'say', x: u.x, y: u.y, z: 0, t: 0, life: 2.6, gr: s[0], tr: s[1], en: s[2], follow: u.id });
}

/* ---------- power effects (called from usePower) ---------- */
function extraPower(pid, id, x, y) {
  const mine = G.ents.filter(e => e.owner === pid);
  if (id === 'heal') { for (const u of mine) if (u.kind === 'unit') u.hp = u.maxHp; say('Apollo heals your people.', 'gold'); }
  else if (id === 'hunt') { P(pid).res.food += 150; P(pid).res.wood += 100; say('Artemis sends deer from the forest: +150 food, +100 wood.', 'gold'); }
  else if (id === 'fury') { G.furyT = 20; say('Ares fills your soldiers with battle-fury!', 'gold'); }
  else if (id === 'swift') { G.swiftT = 25; say('Hermes lends your people winged feet!', 'gold'); }
  else if (id === 'forge') { for (const b of mine) if (b.kind === 'bld' && b.built >= 1) b.hp = b.maxHp; say('Hephaestus mends every wall and roof.', 'gold'); }
  else if (id === 'charm') {
    let best = null, bd = POWERS.charm.radius; for (const e of G.ents) if (e.kind === 'unit' && e.owner !== pid && e.owner !== 0 && !UNITS[e.t].hero && !UNITS[e.t].myth) { const d = dist(e.x, e.y, x, y); if (d < bd) { bd = d; best = e; } }
    if (!best) { P(pid).res.favor += POWERS.charm.favor; say('No soldier there to charm.', 'warn'); return; }
    best.owner = pid; best.state = 'idle'; best.target = null; fxText(best.x, best.y, '💗', '#ff7aa8'); recount(); say('Aphrodite\'s charm wins over a ' + UNITS[best.t].name + '.', 'gold');
  }
  else if (id === 'revel') { for (const e of G.ents) if (e.kind === 'unit' && e.owner !== pid && e.owner !== 0 && dist(e.x, e.y, x, y) < POWERS.revel.radius) { e.stun = 10; fxText(e.x, e.y, '🍇', '#c58aff'); } SND && SND.fanfare(); }
  else if (id === 'shades') { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, tx = Math.floor(x + Math.cos(a)), ty = Math.floor(y + Math.sin(a)); if (!G.block[ty * G.n + tx]) { addUnit('spartos', pid, tx, ty); fxBurst(tx + .5, ty + .5, '#556', 8); } } recount(); say('The shades of the dead rise to fight for you.', 'gold'); }
  else if (id === 'hera') { if (G.flags.heraUsed) { P(pid).res.favor += POWERS.hera.favor; say('Hera has already favoured you.', 'warn'); return; } G.flags.heraUsed = true; for (const u of mine) if (u.kind === 'unit' && UNITS[u.t].hero) { u.maxHp *= 1.2; u.hp = u.maxHp; u.heraBoost = 1.2; } say('Hera, queen of the gods, blesses your heroes.', 'gold'); }
  else if (id === 'hearth') { if (G.flags.hearthUsed) { P(pid).res.favor += POWERS.hearth.favor; say('Hestia\'s fire already burns in your city.', 'warn'); return; } G.flags.hearthUsed = true; P(pid).capBonus = 10; recount(); say('Hestia\'s sacred fire is lit: room for 10 more people.', 'gold'); }
  const god = GODS.find(g => g.power === id); if (god && GR.on) say(god.ep + ' (' + god.ept + ')', '');
}

/* ---------- cheats: AoE-style chat codes ---------- */
const CHEATS = {
  'ambrosia': ['+1,000 food', () => P(1).res.food += 1000],
  'dodona': ['+1,000 wood (the sacred oaks of Dodona)', () => P(1).res.wood += 1000],
  'midas': ['+1,000 gold (everything he touched turned to gold)', () => P(1).res.gold += 1000],
  'nectar': ['+100 favour', () => P(1).res.favor += 100],
  'marco': ['Reveal the map', () => { G.exp.fill(1); }],
  'polo': ['Lift the fog of war (type again to bring it back)', () => { G.opts.reveal = !G.opts.reveal; updateFog(); }],
  'aegis': ['Instant building and training', () => { G.opts.instant = !G.opts.instant; return G.opts.instant ? 'on' : 'off'; }],
  'trojan horse': ['A wooden horse full of soldiers', () => spawnNear('trojanhorse')],
  'pegasus': ['The winged horse', () => spawnNear('pegasus')],
  'cyclops': ['A friendly Cyclops', () => spawnNear('cyclops')],
  'olympus': ['Every age and technology', () => { const p = P(1); p.age = 2; for (const k in TECHS) p.techs.add(k); }],
  'achilles heel': ['Your heroes become nearly invulnerable', () => { for (const u of G.ents) if (u.owner === 1 && u.kind === 'unit' && UNITS[u.t].hero) { u.maxHp = 9999; u.hp = 9999; } }],
  'nike': ['Instant victory (Nike is the goddess of victory)', () => { for (const o of G.objectives) if (o.main) o.done = true; checkWin(); }],
  'hubris': ['Instant defeat (pride before a fall)', () => lose('Hubris: the gods punish the proud.')],
};
function spawnNear(t) { const h = G.ents.find(e => e.owner === 1 && e.kind === 'unit' && UNITS[e.t].hero) || G.ents.find(e => e.owner === 1); const c = center(h); const u = addUnit(t, 1, Math.floor(c.x) + 1, Math.floor(c.y) + 1); recount(); G.sel = [u]; return u; }
function runCheat(text) {
  const k = text.trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
  if (k === 'help' || k === 'cheats') { UI.toast('Try: ' + Object.keys(CHEATS).join(' · '), 'gold'); return true; }
  const c = CHEATS[k]; if (!c) { if (k) UI.toast('“' + text + '”', ''); return false; }
  const r = c[1](); G.cheated = true; UI.toast('🎲 ' + c[0] + (typeof r === 'string' ? ' (' + r + ')' : ''), 'gold'); SND && SND.fanfare(); refreshPanels(true); return true;
}
function openHorse(h) {
  if (!h || h.t !== 'trojanhorse') return;
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, x = Math.floor(h.x + Math.cos(a) * 1.5), y = Math.floor(h.y + Math.sin(a) * 1.5); if (!G.block[y * G.n + x]) { const u = addUnit('hoplite', h.owner, x, y); u.state = 'idle'; } }
  fxBurst(h.x, h.y, '#a37b4b', 30); removeEnt(h); recount(); say('The Greeks pour out of the wooden horse!', 'gold'); SND && SND.crash();
}

/* ---------- the Codex panel ---------- */
function codexHTML(tab) {
  const card = (title, gr, tr, sub, body, extra) => `<article class="cx"><h4>${title}${gr ? ` <span class="gr">${gr}</span> <span class="tr">${tr}</span>` : ''}</h4>${sub ? `<p class="sub">${sub}</p>` : ''}<p>${body}</p>${extra || ''}</article>`;
  if (tab === 'gods') return GODS.map(g => card(g.name, g.gr, g.tr, `<b>${g.role}</b> · ${g.sym}`, g.text, `<p class="ep">In Homer: <span class="gr">${g.ep}</span> ${g.ept ? `<span class="tr">${g.ept}</span>` : ''}, “${g.epe}”.</p><p class="gp">God power: ${POWERS[g.power].icon} <b>${POWERS[g.power].name}</b>, ${POWERS[g.power].favor} favour. ${POWERS[g.power].info}</p>`)).join('');
  if (tab === 'heroes') return HEROES.map(h => card(h.name, h.gr, h.tr, h.ep || '', h.text)).join('');
  if (tab === 'monsters') return MONSTERS.map(m => card(m.name, m.gr, m.tr, '', m.text)).join('');
  if (tab === 'stories') return STORIES.map(s => card(s.title, '', '', '', s.text)).join('') + `<article class="cx"><h4>Did you know?</h4><ul>${FACTS.map(f => `<li>${f}</li>`).join('')}</ul></article>`;
  if (tab === 'words') return `<p class="sub">Words and phrases from Homer's Iliad and Odyssey. Turn on <b>Homeric Greek</b> to see them on units, buildings and resources, and to hear (well, read) your people answer in Greek.</p><table class="vocab">${VOCAB.map(v => `<tr><td class="gr">${v[0]}</td><td class="tr">${v[1]}</td><td>${v[2]}</td></tr>`).join('')}</table><h4>In the game</h4><table class="vocab">${Object.keys(WORDS).filter(k => !HEROES.some(h => h.id === k)).map(k => `<tr><td class="gr">${WORDS[k][0]}</td><td class="tr">${WORDS[k][1]}</td><td>${WORDS[k][2]}</td></tr>`).join('')}</table><h4>What your people say</h4><table class="vocab">${Object.values(SPEECH).flat().map(v => `<tr><td class="gr">${v[0]}</td><td class="tr">${v[1]}</td><td>${v[2]}</td></tr>`).join('')}</table>`;
  if (tab === 'cheats') return `<p class="sub">Like the old Age of Empires games: in a game, press <kbd>Enter</kbd>, type a code and press <kbd>Enter</kbd> again. A game where you used a code still counts, but the gods will know.</p><table class="vocab">${Object.keys(CHEATS).map(k => `<tr><td><code>${k}</code></td><td>${CHEATS[k][0]}</td></tr>`).join('')}</table>`;
  return '';
}
function openCodex(tab) {
  tab = tab || UI.codexTab || 'gods'; UI.codexTab = tab;
  $('codexTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('codexBody').innerHTML = codexHTML(tab); $('codexBody').scrollTop = 0;
  if (G && G.state === 'play') G.paused = true;
  $('codex').hidden = false;
}
function closeCodex() { $('codex').hidden = true; if (G && $('pause').hidden && $('menu').hidden) G.paused = false; }
