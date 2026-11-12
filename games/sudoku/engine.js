/* Sudoku engine for any box size b (N = b*b): 3 gives classic 9×9, 5 gives the 25×25 Super Sudoku.
   No DOM. Grids are flat arrays of length N*N; 0 = empty, 1..N = digits. Candidates are bitmasks (bit d-1 for digit d). */
(function (root) {
  'use strict';
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function popcount(x) { x = x - ((x >>> 1) & 0x55555555); x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }
  function lowbit(x) { return 31 - Math.clz32(x & -x); } // index of lowest set bit

  function Geometry(b) {
    var N = b * b, C = N * N, units = [], peers = [], unitsOf = [];
    for (var r = 0; r < N; r++) { var u = []; for (var c = 0; c < N; c++) u.push(r * N + c); units.push(u); }
    for (c = 0; c < N; c++) { u = []; for (r = 0; r < N; r++) u.push(r * N + c); units.push(u); }
    for (var br = 0; br < b; br++) for (var bc = 0; bc < b; bc++) { u = []; for (r = 0; r < b; r++) for (c = 0; c < b; c++) u.push((br * b + r) * N + bc * b + c); units.push(u); }
    for (var i = 0; i < C; i++) { unitsOf.push([]); peers.push([]); }
    units.forEach(function (u, k) { u.forEach(function (i) { unitsOf[i].push(k); }); });
    for (i = 0; i < C; i++) { var s = {}; unitsOf[i].forEach(function (k) { units[k].forEach(function (j) { if (j !== i) s[j] = 1; }); }); peers[i] = Object.keys(s).map(Number); }
    return { b: b, N: N, C: C, ALL: N === 32 ? -1 : (1 << N) - 1, units: units, peers: peers, unitsOf: unitsOf, row: function (i) { return Math.floor(i / N); }, col: function (i) { return i % N; }, box: function (i) { return Math.floor(Math.floor(i / N) / b) * b + Math.floor((i % N) / b); } };
  }

  // A full solution: the classic pattern, then shuffled bands, rows, stacks, columns and digits.
  function solution(G, r) {
    var b = G.b, N = G.N, g = new Array(G.C);
    var rows = [], cols = [], bands = shuffle(range(b), r), stacks = shuffle(range(b), r), digits = shuffle(range(N), r);
    bands.forEach(function (bd) { shuffle(range(b), r).forEach(function (k) { rows.push(bd * b + k); }); });
    stacks.forEach(function (st) { shuffle(range(b), r).forEach(function (k) { cols.push(st * b + k); }); });
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var rr = rows[y], cc = cols[x]; g[y * N + x] = digits[(b * (rr % b) + Math.floor(rr / b) + cc) % N] + 1; }
    if (r() < .5) g = transpose(G, g);
    return g;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function transpose(G, g) { var N = G.N, t = new Array(G.C); for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) t[x * N + y] = g[y * N + x]; return t; }

  // Candidates for every empty cell.
  function candidates(G, g) {
    var cand = new Array(G.C);
    for (var i = 0; i < G.C; i++) {
      if (g[i]) { cand[i] = 0; continue; }
      var m = G.ALL, p = G.peers[i]; for (var k = 0; k < p.length; k++) if (g[p[k]]) m &= ~(1 << (g[p[k]] - 1));
      cand[i] = m;
    }
    return cand;
  }
  // Logic solver. level 1: naked and hidden singles. level 2: also locked candidates (pointing/claiming) and naked pairs.
  // Returns { solved, grid, steps: {single, hidden, locked, pair} } without guessing.
  function logicSolve(G, g0, level) {
    var g = g0.slice(), cand = candidates(G, g), steps = { single: 0, hidden: 0, locked: 0, pair: 0 }, N = G.N;
    function place(i, d) { g[i] = d; cand[i] = 0; var bit = 1 << (d - 1), p = G.peers[i]; for (var k = 0; k < p.length; k++) cand[p[k]] &= ~bit; }
    for (var guard = 0; guard < 100000; guard++) {
      var progress = false, i, k, u, d;
      for (i = 0; i < G.C; i++) if (!g[i]) { if (!cand[i]) return { solved: false, broken: true, grid: g, steps: steps }; if (popcount(cand[i]) === 1) { place(i, lowbit(cand[i]) + 1); steps.single++; progress = true; } }
      if (progress) continue;
      for (k = 0; k < G.units.length && !progress; k++) {
        u = G.units[k];
        for (d = 0; d < N; d++) {
          var bit = 1 << d, where = -1, cnt = 0, placed = false;
          for (var j = 0; j < u.length; j++) { var c = u[j]; if (g[c] === d + 1) { placed = true; break; } if (cand[c] & bit) { cnt++; where = c; } }
          if (placed) continue;
          if (cnt === 0) return { solved: false, broken: true, grid: g, steps: steps };
          if (cnt === 1) { place(where, d + 1); steps.hidden++; progress = true; }
        }
      }
      if (progress) continue;
      if (level >= 2) {
        // locked candidates: within a box, a digit confined to one row/column is removed from the rest of that row/column (and the reverse)
        for (k = 0; k < G.units.length && !progress; k++) {
          u = G.units[k];
          for (d = 0; d < N && !progress; d++) {
            bit = 1 << d; var cells = u.filter(function (c) { return cand[c] & bit; }); if (cells.length < 2) continue;
            // other units shared by all the cells
            var shared = G.unitsOf[cells[0]].filter(function (uk) { return uk !== k && cells.every(function (c) { return G.unitsOf[c].indexOf(uk) >= 0; }); });
            shared.forEach(function (uk) { G.units[uk].forEach(function (c) { if (cells.indexOf(c) < 0 && (cand[c] & bit)) { cand[c] &= ~bit; progress = true; } }); });
            if (progress) steps.locked++;
          }
        }
        if (progress) continue;
        // naked pairs
        for (k = 0; k < G.units.length && !progress; k++) {
          u = G.units[k];
          for (var a = 0; a < u.length && !progress; a++) {
            var ca = u[a]; if (g[ca] || popcount(cand[ca]) !== 2) continue;
            for (var bb = a + 1; bb < u.length; bb++) {
              var cb = u[bb]; if (g[cb] || cand[cb] !== cand[ca]) continue;
              u.forEach(function (c) { if (c !== ca && c !== cb && (cand[c] & cand[ca])) { cand[c] &= ~cand[ca]; progress = true; } });
              if (progress) { steps.pair++; break; }
            }
          }
        }
        if (progress) continue;
      }
      break;
    }
    var solved = g.every(function (v) { return v > 0; });
    return { solved: solved, grid: g, steps: steps };
  }
  // Count solutions up to `limit` by backtracking (minimum remaining values). Used for 9×9 uniqueness checks.
  function countSolutions(G, g0, limit) {
    var g = g0.slice(), N = G.N, count = 0, cand = candidates(G, g);
    function rec() {
      var best = -1, bc = 99;
      for (var i = 0; i < G.C; i++) if (!g[i]) { var m = cand[i]; if (!m) return; var pc = popcount(m); if (pc < bc) { bc = pc; best = i; if (pc === 1) break; } }
      if (best < 0) { count++; return; }
      var m2 = cand[best];
      while (m2 && count < limit) {
        var d = lowbit(m2); m2 &= m2 - 1; var bit = 1 << d, changed = [];
        g[best] = d + 1; var p = G.peers[best];
        for (var k = 0; k < p.length; k++) if (!g[p[k]] && (cand[p[k]] & bit)) { cand[p[k]] &= ~bit; changed.push(p[k]); }
        rec();
        for (k = 0; k < changed.length; k++) cand[changed[k]] |= bit; g[best] = 0;
      }
    }
    rec(); return count;
  }

  /* Make a puzzle. diff: 0 easy … 5 extreme for 9×9; 0 easy … 2 hard for 25×25.
     Cells are removed in symmetric pairs while the puzzle stays solvable by the logic its level allows
     (singles for the easy ones, then pairs and locked candidates). Expert and harder 9×9 puzzles only need a unique solution. */
  var TARGET9 = [40, 34, 30, 27, 24, 22], TARGET25 = [0.6, 0.52, 0.46];
  function carve(G, sol, r, target, level, sym, onProgress) {
    var g = sol.slice(), order = shuffle(range(G.C), r), given = G.C;
    for (var pass = 0; pass < 2; pass++) {
      for (var k = 0; k < order.length && given > target; k++) {
        var i = order[k], j = sym && pass === 0 ? G.C - 1 - i : i; if (!g[i]) continue;
        var a = g[i], bv = g[j]; g[i] = 0; if (j !== i) g[j] = 0;
        var ok = level === 9 ? countSolutions(G, g, 2) === 1 : logicSolve(G, g, level).solved;
        if (ok) given -= (j !== i && bv) ? 2 : 1; else { g[i] = a; g[j] = bv; }
        if (onProgress && k % 25 === 0) onProgress(k / order.length);
      }
      if (given <= target) break;
    }
    return { g: g, given: given };
  }
  function generate(b, diff, seed, onProgress) {
    var G = Geometry(b), r = rng(seed), N = G.N;
    var target = b === 3 ? TARGET9[diff] : Math.round(G.C * TARGET25[diff]);
    var level = b === 3 ? (diff <= 1 ? 1 : diff === 2 ? 2 : 9) : (diff === 0 ? 1 : 2);
    var tries = b === 3 ? [1, 1, 1, 12, 24, 40][diff] : 1, best = null;
    for (var t = 0; t < tries; t++) {
      var sol = solution(G, r), c = carve(G, sol, r, target, level, true, onProgress);
      // how hard is it for a person? singles only, needs pairs/locked candidates, or beyond
      var need = logicSolve(G, c.g, 1).solved ? 1 : logicSolve(G, c.g, 2).solved ? 2 : 3;
      var want = b === 3 ? [1, 1, 2, 2, 3, 3][diff] : 1;
      var score = (need >= want ? 0 : 100) + Math.max(0, c.given - target);
      if (!best || score < best.score) best = { score: score, g: c.g, sol: sol, given: c.given, need: need };
      if (score === 0) break;
    }
    return { puzzle: best.g, solution: best.sol, givens: best.given, rate: ['', 'singles', 'pairs and locked candidates', 'advanced logic or trial'][best.need] };
  }

  var API = { Geometry: Geometry, solution: solution, candidates: candidates, logicSolve: logicSolve, countSolutions: countSolutions, generate: generate, rng: rng, popcount: popcount };
  if (typeof module === 'object' && module.exports) module.exports = API;
  root.SudokuEngine = API;
})(typeof window !== 'undefined' ? window : this);
