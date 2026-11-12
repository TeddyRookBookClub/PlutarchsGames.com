'use strict';
/* Jimothy-san — worlds, platform chunks and mine-cart track recipes.

   Platform levels are built from hand-made chunks, chosen by a seeded random order and difficulty, so every
   level is different but always playable. A chunk lists its rows bottom-aligned: the last string is row 13,
   the floor of the level. Every chunk starts and ends with solid ground three tiles deep (rows 11–13).

   Legend
     #  ground            =  girder (jump up through, stand on top)     ^  thorns (hurt)
     o  bottle cap        L  letter (J, I, M, O in order)                K  checkpoint barrel
     p  possum (stomp or roll it)        h  hedgehog (spiky: throw a barrel, or slap the ground)
     c  crow (flies in a wave)           z  wasp (can't be stomped; only a barrel stops it)
     B  barrel to pick up and throw      T  tyre (big bounce)            M  moving girder (side to side)
     V  moving girder (up and down)      G  goal                          H  heart (heals one)        */

const THEMES = {
  forest:  { name: 'Trashwood Forest', sky: ['#7cc8ff', '#d9f2ff'], far: '#7fb39a', mid: '#4f8a5f', near: '#2f6440', ground: '#6b4a2e', top: '#58b84a', girder: '#b5522f', fog: 'rgba(255,255,255,.12)', music: 0 },
  mine:    { name: 'Old Mine Run', sky: ['#1b120c', '#3a2618'], far: '#2a1c12', mid: '#3d2a1b', near: '#55392a', rail: '#9aa0a8', tie: '#5a3b22', glow: '#ffb35c', music: 1, cart: true },
  town:    { name: 'Treetop Village', sky: ['#ff9a6b', '#ffd9a0'], far: '#c77a6b', mid: '#8e4f52', near: '#5a3040', ground: '#7a4a2a', top: '#d9a650', girder: '#8a5a32', fog: 'rgba(255,200,150,.12)', music: 2 },
  crystal: { name: 'Crystal Caverns', sky: ['#0d0b24', '#24184a'], far: '#1c1640', mid: '#2b2160', near: '#3b2c80', rail: '#b9c3ff', tie: '#3a2f6e', glow: '#8de8ff', music: 3, cart: true },
  roof:    { name: 'Neon Rooftops', sky: ['#0b0f2a', '#3b2a6b'], far: '#1a1f45', mid: '#262c5c', near: '#141833', ground: '#3b3550', top: '#8a7bb0', girder: '#c74b7a', fog: 'rgba(120,90,255,.10)', music: 4, night: true },
  lava:    { name: 'Lava Rails', sky: ['#2a0705', '#6b1a08'], far: '#3a0d08', mid: '#57160b', near: '#7a1f0b', rail: '#c9a07a', tie: '#3a1b10', glow: '#ff7a2a', music: 5, cart: true, lava: true },
  factory: { name: 'Girder Works', sky: ['#20262e', '#4a5560'], far: '#323a44', mid: '#3e4854', near: '#29313a', ground: '#4d4f55', top: '#8b9097', girder: '#d4402f', fog: 'rgba(255,170,80,.07)', music: 6 },
  snow:    { name: 'Frostbite Peaks', sky: ['#9fc8ef', '#eef6ff'], far: '#c3d6ea', mid: '#8fa9c4', near: '#5f7a96', ground: '#7a8a9c', top: '#f4f8ff', girder: '#5a7fb0', fog: 'rgba(255,255,255,.18)', music: 2, ice: true, snowfall: true },
  glacier: { name: 'Glacier Plunge', sky: ['#08223a', '#1d5a7a'], far: '#103a55', mid: '#1b5272', near: '#2a6f92', rail: '#dff4ff', tie: '#245a78', glow: '#bff0ff', music: 3, cart: true, icy: true },
  jungle:  { name: 'Waterfall Jungle', sky: ['#5fc4a8', '#dff7d8'], far: '#5fa77a', mid: '#2f7a4a', near: '#1d5a34', ground: '#5a3a24', top: '#3fae4a', girder: '#8a5a2a', fog: 'rgba(200,255,220,.12)', music: 0, jungle: true },
  temple:  { name: 'Temple Rails', sky: ['#0e2014', '#2a4a24'], far: '#1a3a1e', mid: '#2a4a26', near: '#3a5a30', rail: '#d8c08a', tie: '#4a3a1a', glow: '#9dff8a', music: 1, cart: true, ruins: true },
  dump:    { name: 'King Possum’s Dump', sky: ['#8a9a7a', '#d8d0b0'], far: '#9a9480', mid: '#7a7466', near: '#5a564a', ground: '#5a4e3e', top: '#8a8a6a', girder: '#a0522d', fog: 'rgba(200,190,150,.15)', music: 4, dump: true },
  sky:     { name: 'Sky Rails', sky: ['#4aa8ff', '#e0f4ff'], far: '#cfe8ff', mid: '#b0d4f5', near: '#ffffff', rail: '#b0b8c8', tie: '#7a8496', glow: '#ffffff', music: 7, cart: true, trestle: true, clouds: true },
  castle:  { name: 'Rook Castle', sky: ['#2a1f3d', '#7a5a8a'], far: '#3a2f4d', mid: '#4a3f5d', near: '#2a2238', ground: '#6a6470', top: '#a8a0b0', girder: '#8a2a3a', fog: 'rgba(180,140,255,.08)', music: 6, night: true, castle: true },
  moon:    { name: 'Moon Rails', sky: ['#02040e', '#141a3a'], far: '#0b1030', mid: '#141a40', near: '#0a0e26', rail: '#e8ecf8', tie: '#2a2f45', glow: '#fff3c8', music: 7, cart: true, moon: true, trestle: true },
  express: { name: 'Midnight Express', sky: ['#060a1c', '#1d2b55'], far: '#111a3a', mid: '#18244d', near: '#0c1230', rail: '#c8ccd8', tie: '#2a2f45', glow: '#ffe9a8', music: 7, cart: true, moon: true, trestle: true },
};

const LEVELS = [
  { id: 'trashwood', title: 'Trashwood Forest', theme: 'forest', kind: 'walk', seed: 11, len: 9, diff: 0 },
  { id: 'oldmine', title: 'Old Mine Run', theme: 'mine', kind: 'cart', seed: 21, len: 13000, diff: 0 },
  { id: 'treetop', title: 'Treetop Village', theme: 'town', kind: 'walk', seed: 31, len: 10, diff: 1 },
  { id: 'crystal', title: 'Crystal Caverns', theme: 'crystal', kind: 'cart', seed: 41, len: 15000, diff: 1 },
  { id: 'rooftops', title: 'Neon Rooftops', theme: 'roof', kind: 'walk', seed: 51, len: 11, diff: 2 },
  { id: 'lavarails', title: 'Lava Rails', theme: 'lava', kind: 'cart', seed: 61, len: 17000, diff: 2 },
  { id: 'girders', title: 'Girder Works', theme: 'factory', kind: 'walk', seed: 71, len: 12, diff: 3 },
  { id: 'express', title: 'Midnight Express', theme: 'express', kind: 'cart', seed: 81, len: 20000, diff: 3 },
  { id: 'frostbite', title: 'Frostbite Peaks', theme: 'snow', kind: 'walk', seed: 91, len: 11, diff: 3 },
  { id: 'glacier', title: 'Glacier Plunge', theme: 'glacier', kind: 'cart', seed: 101, len: 18000, diff: 3 },
  { id: 'waterfall', title: 'Waterfall Jungle', theme: 'jungle', kind: 'walk', seed: 111, len: 12, diff: 4 },
  { id: 'templerails', title: 'Temple Rails', theme: 'temple', kind: 'cart', seed: 121, len: 20000, diff: 4 },
  { id: 'dump', title: 'King Possum’s Dump', theme: 'dump', kind: 'walk', seed: 131, len: 9, diff: 4, boss: 'possum' },
  { id: 'skyrails', title: 'Sky Rails', theme: 'sky', kind: 'cart', seed: 141, len: 21000, diff: 4 },
  { id: 'rookcastle', title: 'Rook Castle', theme: 'castle', kind: 'walk', seed: 151, len: 12, diff: 4, boss: 'crow' },
  { id: 'moonrails', title: 'Moon Rails', theme: 'moon', kind: 'cart', seed: 161, len: 24000, diff: 4 },
];

// d: lowest difficulty the chunk may appear at
const CHUNKS = [
  { d: 0, rows: [
    '..............',
    '...o..o..o....',
    '..............',
    '##############',
    '##############',
    '##############'] },
  { d: 0, rows: [
    '.....ooo.........',
    '.................',
    '....=====........',
    '.................',
    '..........p......',
    '#################',
    '#################',
    '#################'] },
  { d: 0, rows: [
    '.......o.o.......',
    '......o...o......',
    '.................',
    '.................',
    '######.....######',
    '######.....######',
    '######.....######'] },
  { d: 0, rows: [
    '...........c......',
    '..................',
    '....o...o...o.....',
    '..................',
    '..B......p........',
    '##################',
    '##################',
    '##################'] },
  { d: 0, rows: [
    '........o........',
    '.......o.o.......',
    '..................',
    '........T.........',
    '##########.....####',
    '##########.....####',
    '##########.....####'] },
  { d: 0, rows: [
    '..........L.......',
    '..................',
    '.......=====......',
    '..................',
    '...=====....p.....',
    '..................',
    '##################',
    '##################',
    '##################'] },
  { d: 0, rows: [
    '..........',
    '....K.....',
    '##########',
    '##########',
    '##########'] },
  { d: 1, rows: [
    '....o.o.o.o.o....',
    '.................',
    '...===.....===...',
    '.................',
    '####...h.h....###',
    '####^^^^^^^^^^###',
    '#################'] },
  { d: 1, rows: [
    '...........ooo.......',
    '.....................',
    '.........=====.......',
    '.....................',
    '....=====.....=====..',
    '.....................',
    '#####...........#####',
    '#####...........#####',
    '#####...........#####'] },
  { d: 1, rows: [
    '..c.......c.......c..',
    '.....................',
    '...o...o...o...o.....',
    '.....................',
    '.....p.......p.......',
    '#####################',
    '#####################',
    '#####################'] },
  { d: 1, rows: [
    '.......o..o..o.......',
    '.....................',
    '.......MMM...........',
    '.....................',
    '.....................',
    '####.............####',
    '####.............####',
    '####.............####'] },
  { d: 1, rows: [
    '..........H........',
    '.........===.......',
    '...................',
    '.....===.....===...',
    '...................',
    '.B..h.......p......',
    '###################',
    '###################',
    '###################'] },
  { d: 1, rows: [
    '.......L..........',
    '..................',
    '..................',
    '.......T.....T....',
    '#####.....#....####',
    '#####.....#....####',
    '#####.....#....####'] },
  { d: 2, rows: [
    '....z........z.....',
    '...................',
    '...o..o..o..o..o...',
    '...................',
    '..B................',
    '###################',
    '###################',
    '###################'] },
  { d: 2, rows: [
    '.........o..........',
    '........VVV.........',
    '....................',
    '....................',
    '....................',
    '...ooo..........ooo.',
    '###.............####',
    '###^^^^^^^^^^^^^####',
    '####################'] },
  { d: 2, rows: [
    '...............ooo...',
    '...............===...',
    '..........===........',
    '.....===.......c.....',
    '.....................',
    '...p.....h.....p.....',
    '#####################',
    '#####################',
    '#####################'] },
  { d: 2, rows: [
    '.......L.............',
    '.....................',
    '......MMM.....MMM....',
    '.....................',
    '.....................',
    '###..............####',
    '###..............####',
    '###..............####'] },
  { d: 3, rows: [
    '..z.....z.....z.....',
    '....................',
    '..===.===.===.===...',
    '....................',
    '.B..h..h..h..h......',
    '####################',
    '####################',
    '####################'] },
  { d: 3, rows: [
    '.................o.o.o',
    '.................=====',
    '..........VVV.........',
    '......................',
    '...VVV................',
    '......................',
    '###...................',
    '###^^^^^^^^^^^^^^^^###',
    '######################'] },
  { d: 3, rows: [
    '........c...c...c.......',
    '.......................',
    '....o..T..o..T..o..T....',
    '##########......#.....###',
    '##########......#.....###',
    '##########......#.....###'] },
  // later worlds: frogs (f) hop toward you, crumbling girders (C) fall a moment after you land
  { d: 2, rows: [
    '.................',
    '......o.o.o......',
    '.....CCCCCC......',
    '.................',
    '..f.........f....',
    '#################',
    '#################',
    '#################'] },
  { d: 3, rows: [
    '...........o.o.o.....',
    '..........CCCCC......',
    '.....CCCC............',
    '.....................',
    '.....................',
    '###...............###',
    '###^^^^^^^^^^^^^^^###',
    '#####################'] },
  { d: 4, rows: [
    '..c......z......c......',
    '.......................',
    '...o..o..o..o..o..o....',
    '...CCC.CCC.CCC.CCC.....',
    '.......................',
    '.B.f....f....f.........',
    '########.......########',
    '########.......########',
    '########.......########'] },
  { d: 4, rows: [
    '..........L...........',
    '.........VVV..........',
    '......................',
    '...MMM.........MMM....',
    '......................',
    '..h.....f.....h.......',
    '######################',
    '######################',
    '######################'] },
  { d: 4, rows: [
    '.....o..o..o..o.....',
    '....=..=..=..=..=...',
    '....................',
    '..T....T....T....T..',
    '###..#...#...#...###',
    '###..#...#...#...###',
    '###^^#^^^#^^^#^^^###'] },
];
// Boss arenas replace the goal: beat the boss and the goal appears
const ARENA = { rows: [
  '..............................',
  '..............................',
  '..............................',
  '......=====..........=====....',
  '..............................',
  '..............................',
  '.B..........................B.',
  '##############################',
  '##############################',
  '##############################'] };

const START_CHUNK = { rows: [
  '............',
  '............',
  '############',
  '############',
  '############'] };
const END_CHUNK = { rows: [
  '..o.o.o.........',
  '................',
  '..........G.....',
  '################',
  '################',
  '################'] };

/* Mine-cart track recipe. The generator walks forward and lays pieces:
   flat runs, ramps up or down, gaps to jump, crates on the rail, low beams to duck under,
   crows to jump past or stomp, a possum in a slower cart to bounce off, and ribbons of caps.
   diff raises speed, gap width and how often things happen. */
const CART = {
  speed: [320, 350, 380, 410, 430],
  speedUp: [60, 70, 80, 95, 110],          // extra px/s by the end of the track
  gapMin: [90, 110, 130, 150, 160], gapMax: [150, 190, 230, 260, 280],
  every: [520, 470, 420, 380, 350],        // average distance between events
};
