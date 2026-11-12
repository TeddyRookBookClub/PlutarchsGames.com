'use strict';
/* Heroes of Hellas — scenario set-up and scripted events. */

function startBase(pid, x, y, opts) {
  opts = opts || {};
  clearArea(x + 1.5, y + 1.5, opts.clear || 7); paint(x + 1.5, y + 1.5, 3.2, TER.dirt);
  const a = addBld('agora', pid, x, y);
  const houses = opts.houses == null ? 1 : opts.houses;
  for (let k = 0; k < houses; k++) addBld('house', pid, x + 4 + k * 2, y - 2 + (k % 2) * 6);
  const v = opts.villagers == null ? 4 : opts.villagers;
  for (let k = 0; k < v; k++) addUnit('villager', pid, x + (k % 3), y + 3 + Math.floor(k / 3));
  if (opts.berries !== false) berries(x - 4, y + 4);
  if (opts.gold !== false) goldMine(x + 6, y + 5);
  return a;
}
function army(pid, t, n, x, y, extra) { const out = []; for (let k = 0; k < n; k++) out.push(addUnit(t, pid, x + (k % 3), y + Math.floor(k / 3), extra)); return out; }
function statues(x, y, n) { for (let k = 0; k < n; k++) G.fx.push({ k: 'statue', x: x + (G.R() - .5) * 7, y: y + (G.R() - .5) * 7, t: 0, life: 1e9, unit: ['hoplite', 'archer', 'villager'][k % 3], owner: 2, face: G.R() < .5 ? 1 : -1 }); }
function mazeAt(x0, y0, cells) {
  // walls everywhere on a (2*cells+1)^2 block, then carve a perfect maze by depth-first search
  const S = cells * 2 + 1;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { clearTile(x0 + i, y0 + j); setTer(x0 + i, y0 + j, TER.maze); }
  const seen = new Set(), stack = [[0, 0]], R = G.R; seen.add('0,0'); setTer(x0 + 1, y0 + 1, TER.stone);
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1], nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < cells && b < cells && !seen.has(a + ',' + b));
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = nb[Math.floor(R() * nb.length)]; seen.add(nx + ',' + ny);
    setTer(x0 + 1 + cx * 2 + dx, y0 + 1 + cy * 2 + dy, TER.stone); setTer(x0 + 1 + nx * 2, y0 + 1 + ny * 2, TER.stone); stack.push([nx, ny]);
  }
  // open the middle into a hall for the Minotaur
  const m = Math.floor(cells / 2); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) setTer(x0 + 1 + (m + i) * 2, y0 + 1 + (m + j) * 2, TER.stone);
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) setTer(x0 + 1 + m * 2 + i, y0 + 1 + m * 2 + j, TER.stone);
  return { entrance: { x: x0 + 1, y: y0 + S - 1 }, center: { x: x0 + 1 + m * 2, y: y0 + 1 + m * 2 } };
}

const SETUP = {
  skirmish(g) {
    const n = g.n;
    startBase(1, 10, n - 16, { villagers: 4 }); startBase(2, n - 16, 10, { villagers: 4 });
    addUnit('hoplite', 1, 14, n - 12); addUnit('hoplite', 2, n - 12, 14);
    scatterRes(g.R, 'gold', 6, [[11, n - 15, 12], [n - 15, 11, 12]]); scatterRes(g.R, 'berry', 5, [[11, n - 15, 10], [n - 15, 11, 10]]);
    g.flags.myAgora = g.ents.find(e => e.t === 'agora' && e.owner === 1).id; g.flags.aiAgora = g.ents.find(e => e.t === 'agora' && e.owner === 2).id;
  },
  perseus(g) {
    startBase(1, 14, 44, { houses: 2, villagers: 5 });
    army(1, 'hoplite', 3, 19, 47);
    g.flags.hero = addUnit('perseus', 1, 18, 50).id;
    scatterRes(g.R, 'gold', 4, [[15, 45, 10], [52, 12, 10]]); scatterRes(g.R, 'berry', 3, [[15, 45, 8]]);
    // Athena's shrine
    clearArea(33, 29, 4); paint(33, 29, 3, TER.stone); g.flags.shrine = addBld('shrine', 0, 32, 28).id;
    // the Gorgon's lair
    clearArea(52, 12, 8); paint(52, 12, 6, TER.stone); paint(52, 12, 3, TER.hill);
    statues(52, 13, 9);
    g.flags.medusa = addUnit('medusa', 3, 52, 11).id;
    army(3, 'cyclops', 1, 47, 17); army(3, 'cyclops', 1, 55, 18);
    // Polydectes' soldiers camp on the island and raid you
    clearArea(50, 47, 6); paint(50, 47, 3, TER.dirt);
    addBld('ruin', 2, 49, 46); addBld('tower', 2, 47, 44); army(2, 'hoplite', 4, 51, 50);
  },
  theseus(g) {
    startBase(1, 8, 38, { houses: 2, villagers: 4 });
    army(1, 'hoplite', 4, 12, 44);
    g.flags.hero = addUnit('theseus', 1, 12, 47).id;
    scatterRes(g.R, 'gold', 3, [[9, 39, 9], [40, 14, 16]]); scatterRes(g.R, 'berry', 3, [[9, 39, 8], [40, 14, 16]]);
    // Knossos
    clearArea(34, 42, 9); paint(34, 42, 7, TER.stone);
    g.flags.palace = addBld('palace', 2, 32, 40).id; addBld('barracks', 2, 38, 45); addBld('barracks', 2, 28, 46); addBld('tower', 2, 37, 39); addBld('tower', 2, 30, 39); addBld('house', 2, 26, 41); addBld('house', 2, 41, 41);
    army(2, 'hoplite', 6, 34, 46); army(2, 'archer', 3, 33, 37);
    g.flags.ariadne = addUnit('ariadne', 0, 25, 36).id;
    // the Labyrinth
    const M = mazeAt(40, 4, 9); g.flags.maze = M;
    g.flags.gate = addBld('wall', 0, M.entrance.x, M.entrance.y).id;
    clearArea(M.entrance.x, M.entrance.y + 2, 3); paint(M.entrance.x, M.entrance.y + 2, 2, TER.stone);
    g.flags.minotaur = addUnit('minotaur', 3, M.center.x, M.center.y).id;
  },
  jason(g) {
    clearArea(8, 32, 7); paint(10, 32, 3, TER.sand);
    const argo = addBld('argo', 1, 3, 30); g.flags.argo = argo.id;
    for (let k = 0; k < 5; k++) addUnit('villager', 1, 9 + (k % 3), 29 + Math.floor(k / 3));
    army(1, 'hoplite', 5, 10, 34);
    g.flags.hero = addUnit('jason', 1, 9, 33).id;
    berries(14, 28); goldMine(15, 37);
    scatterRes(g.R, 'gold', 3, [[9, 32, 10], [50, 30, 8], [46, 50, 10]]); scatterRes(g.R, 'berry', 3, [[9, 32, 8]]);
    clearArea(27, 18, 3); paint(27, 18, 2, TER.hill); g.flags.medea = addUnit('medea', 0, 27, 18).id;
    // the sacred oak and the dragon
    clearArea(51, 30, 7); paint(51, 30, 5, TER.dirt); g.flags.oak = addBld('oak', 0, 50, 29).id;
    g.flags.dragon = addUnit('dragon', 3, 48, 32).id;
    // Aeëtes' city
    clearArea(47, 51, 9); paint(47, 51, 6, TER.stone);
    addBld('agora', 2, 46, 50); addBld('barracks', 2, 51, 49); addBld('range', 2, 42, 52); addBld('tower', 2, 44, 47); addBld('tower', 2, 50, 46); addBld('house', 2, 51, 54);
    army(2, 'hoplite', 5, 46, 46); army(2, 'archer', 3, 42, 48);
  },
  heracles(g) {
    const n = g.n;
    startBase(1, 12, 34, { houses: 2, villagers: 5 });
    army(1, 'hoplite', 2, 16, 39);
    g.flags.hero = addUnit('heracles', 1, 17, 41).id;
    scatterRes(g.R, 'gold', 5, [[13, 35, 10]]); scatterRes(g.R, 'berry', 4, [[13, 35, 8]]);
    clearArea(34, 8, 6); paint(34, 8, 5, TER.hill); paint(34, 8, 2, TER.stone); g.flags.lion = addUnit('lion', 3, 34, 8).id;
    clearArea(58, 60, 7); paint(58, 60, 7, TER.marsh); paint(60, 63, 2, TER.shallow); paint(55, 62, 1.5, TER.shallow); g.flags.hydra = addUnit('hydra', 3, 58, 59).id;
    clearArea(64, 34, 5); paint(64, 34, 4, TER.hill); g.flags.boar = addUnit('boar', 3, 64, 34).id;
    clearArea(58, 13, 7); paint(58, 13, 4, TER.dirt); addBld('ruin', 2, 57, 12); addBld('barracks', 2, 61, 15); addBld('tower', 2, 55, 16); army(2, 'hoplite', 4, 56, 17); army(2, 'archer', 2, 60, 11);
    g.flags.camp = g.ents.find(e => e.t === 'ruin').id;
  },
};

const SCEN_TICK = {
  skirmish(g) {
    if (!g.byId.get(g.flags.aiAgora)) { objective('agora', true); checkWin(); }
    if (!g.ents.some(e => e.owner === 1 && e.kind === 'bld' && e.t === 'agora')) lose('Your Agora has fallen.');
  },
  perseus(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Perseus has fallen.');
    const sh = g.byId.get(g.flags.shrine);
    if (!h.mirror && sh && edgeDist(h, sh) < 2.5) { h.mirror = true; objective('shrine', true); say('Athena lends Perseus her polished shield. Now he can watch Medusa in its reflection.', 'gold'); }
    const m = g.byId.get(g.flags.medusa);
    if (m && !h.mirror && dist(h.x, h.y, m.x, m.y) < 11 && !g.flags.warned) { g.flags.warned = true; say('Turn back! Without Athena\'s shield, Medusa\'s gaze will turn Perseus to stone.', 'warn'); }
    if (P(1).pop >= 20) objective('pop', true);
    checkWin();
  },
  theseus(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Theseus has fallen.');
    const a = g.byId.get(g.flags.ariadne);
    if (!a && !g.flags.ariadneJoined) return lose('Ariadne was killed.');
    if (a && a.owner === 0 && dist(a.x, a.y, h.x, h.y) < 3) {
      a.owner = 1; g.flags.ariadneJoined = true; objective('ariadne', true);
      say('Ariadne gives Theseus her ball of thread. The gate of the Labyrinth swings open.', 'gold');
      const gate = g.byId.get(g.flags.gate); if (gate) removeEnt(gate);
      const M = g.flags.maze; const r = findPath(M.entrance.x + .5, M.entrance.y + .5, goalPoint(M.center.x, M.center.y), 20000); g.thread = [{ x: M.entrance.x + .5, y: M.entrance.y + 1.5 }].concat(r.path);
    }
    if (!g.flags.ariadneJoined && dist(h.x, h.y, g.flags.maze.entrance.x, g.flags.maze.entrance.y) < 4 && !g.flags.warned) { g.flags.warned = true; say('The Labyrinth is locked, and no one who enters ever finds the way out. Find Ariadne first.', 'warn'); }
    if (!g.byId.get(g.flags.palace)) objective('palace', true);
    checkWin();
  },
  jason(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Jason has fallen.');
    const md = g.byId.get(g.flags.medea), dr = g.byId.get(g.flags.dragon), oak = g.byId.get(g.flags.oak), argo = g.byId.get(g.flags.argo);
    if (!argo) return lose('The Argo was destroyed.');
    if (md && md.owner === 0 && dist(md.x, md.y, h.x, h.y) < 3.5) { md.owner = 1; objective('medea', true); say('Medea joins Jason. "The dragon never sleeps," she says, "unless I sing to it."', 'gold'); }
    if (!g.flags.sown && h.x > 32) {
      g.flags.sown = true; say('King Aeëtes has sown the dragon\'s teeth. Armed warriors burst from the earth!', 'warn');
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, x = Math.floor(h.x + Math.cos(a) * 4), y = Math.floor(h.y + Math.sin(a) * 4); if (!G.block[y * G.n + x]) { const s = addUnit('spartos', 2, x, y); s.state = 'attack'; s.target = h.id; } }
    }
    g.flags.drowsy = !!(md && md.owner === 1 && dr && dist(md.x, md.y, dr.x, dr.y) < 6);
    if (g.flags.drowsy && !g.flags.sang) { g.flags.sang = true; say('Medea sings, and the dragon\'s great eyes begin to close. It fights slowly and weakly while she is near.', 'gold'); }
    if (!dr && !g.flags.dragonDead) { g.flags.dragonDead = true; objective('dragon', true); }
    if (g.flags.dragonDead && !h.fleece && oak && edgeDist(h, oak) < 2.5) { h.fleece = true; say('Jason lifts the Golden Fleece from the oak. Now back to the Argo, quickly!', 'gold'); for (const s of G.ents) if (s.kind === 'unit' && s.owner === 2 && !UNITS[s.t].civ) { s.state = 'move'; s.attackMove = true; moveTo(s, goalPoint(h.x, h.y)); } }
    if (h.fleece && argo && edgeDist(h, argo) < 3) { objective('fleece', true); }
    checkWin();
  },
  heracles(g) {
    const h = g.byId.get(g.flags.hero); if (!h) return lose('Heracles has fallen.');
    if (!g.byId.get(g.flags.lion)) objective('lion', true);
    if (!g.byId.get(g.flags.hydra)) objective('hydra', true);
    if (!g.byId.get(g.flags.boar)) objective('boar', true);
    if (!g.byId.get(g.flags.camp)) objective('camp', true);
    const hy = g.byId.get(g.flags.hydra); if (hy && dist(h.x, h.y, hy.x, hy.y) < 9 && !g.flags.warnH) { g.flags.warnH = true; say('The Hydra\'s heads grow back unless Heracles himself keeps striking it.', 'warn'); }
    const li = g.byId.get(g.flags.lion); if (li && G.time - (li.lastHit || -99) < 1 && !g.flags.warnL && li.hp > li.maxHp * .95) { g.flags.warnL = true; say('Arrows glance off the lion\'s golden hide. Send Heracles to wrestle it.', 'warn'); }
    checkWin();
  },
};
SCEN_EVENTS.onKill = (d, a, how) => {
  if (!G) return;
  if (d.id === G.flags.medusa) objective('medusa', true);
  if (d.id === G.flags.minotaur) objective('minotaur', true);
  if (d.id === G.flags.boar) say('Heracles wrestles the great boar into a net.', 'gold');
  if (d.id === G.flags.lion) say('No blade could pierce the lion, so Heracles strangled it with his bare hands.', 'gold');
  if (d.id === G.flags.hydra) say('Heracles burns each neck as he cuts it, and the Hydra grows no more heads.', 'gold');
};
