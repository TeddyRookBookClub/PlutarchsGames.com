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
];

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
  speed: [320, 350, 380, 410],
  speedUp: [60, 70, 80, 95],          // extra px/s by the end of the track
  gapMin: [90, 110, 130, 150], gapMax: [150, 190, 230, 260],
  every: [520, 470, 420, 380],        // average distance between events
};
