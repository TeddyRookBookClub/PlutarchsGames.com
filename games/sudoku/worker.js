/* Builds puzzles off the main thread so big grids never freeze the page. */
self.importScripts('engine.js');
onmessage = function (e) { var d = e.data; var p = SudokuEngine.generate(d.b, d.diff, d.seed, function (f) { postMessage({ progress: f }); }); postMessage({ done: true, puzzle: p.puzzle, solution: p.solution, givens: p.givens, rate: p.rate }); };
