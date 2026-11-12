/* Sudoku and Super Sudoku: the game page. Box size comes from window.SUDOKU_BOX (3 for 9×9, 5 for 25×25).
   Features modelled on the best sudoku apps: difficulty levels, timer and pause, mistakes (with an optional limit),
   notes, auto-notes, hints, undo, erase, highlighting of the row, column, box and matching digits, conflicts,
   digits-left counts, completion flashes, a daily challenge with a calendar, detailed stats, and resume. */
(function (W, D) {
  'use strict';
  var E = W.SudokuEngine, b = W.SUDOKU_BOX || 3, G = E.Geometry(b), N = G.N, C = G.C, BIG = b > 3;
  var KEY = 'pg-sudoku-' + N, $ = Kit.$, $$ = Kit.$$;
  var DIFFS = BIG ? ['Easy', 'Medium', 'Hard'] : ['Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Extreme'];
  var SYMS = BIG ? 'ABCDEFGHIJKLMNOPQRSTUVWXY' : '123456789';
  var settings = Object.assign({ limit: true, autocheck: true, hlArea: true, hlSame: true, hlDup: true, autoNotes: true, timer: true, sound: true, numbers: false, digitFirst: false }, Kit.store.get(KEY + '-settings', {}));
  var stats = Kit.store.get(KEY + '-stats', {});
  var daily = Kit.store.get(KEY + '-daily', {});
  var S = null; // the game in progress
  var sel = -1, notesMode = false, worker = null, armed = 0;

  function sym(d) { return settings.numbers && BIG ? String(d) : SYMS[d - 1]; }
  function saveSettings() { Kit.store.set(KEY + '-settings', settings); }
  function saveGame() { if (S && !S.over) Kit.store.set(KEY + '-game', S); else Kit.store.set(KEY + '-game', null); }
  function st(diff) { var k = String(diff); return stats[k] || (stats[k] = { started: 0, won: 0, perfect: 0, best: 0, total: 0, streak: 0, bestStreak: 0 }); }

  /* ---------- layout ---------- */
  Kit.bar(BIG ? 'Super Sudoku' : 'Sudoku', [['b-stats', '📊', 'Statistics'], ['b-daily', '📅', 'Daily challenge'], ['b-set', '⚙️', 'Settings'], ['b-help', '?', 'How to play']]);
  var app = D.createElement('main'); app.className = 'sd' + (BIG ? ' big' : ''); D.body.appendChild(app);
  app.innerHTML =
    '<div class="sd-top"><div class="seg" id="sd-diff">' + DIFFS.map(function (d, i) { return '<button type="button" data-d="' + i + '">' + d + '</button>'; }).join('') + '</div>' +
    '<button class="btn ghost" id="sd-new">New game</button></div>' +
    '<div class="sd-info"><span id="sd-level"></span><span id="sd-mist"></span><span id="sd-score"></span><span class="sd-time"><b id="sd-time">0:00</b><button id="sd-pause" title="Pause (P)">❚❚</button></span></div>' +
    '<div class="sd-main"><div class="sd-boardwrap"><div class="sd-board" id="sd-board" role="grid" aria-label="Sudoku grid"></div>' +
    '<div class="sd-veil" id="sd-veil" hidden><div><p>Paused</p><button class="btn gold" id="sd-resume">▶ Resume</button></div></div>' +
    '<div class="sd-veil" id="sd-load" hidden><div><p>Building your puzzle…</p><div class="sd-bar"><i id="sd-prog"></i></div></div></div></div>' +
    '<div class="sd-side"><div class="sd-tools">' +
    '<button id="t-undo" title="Undo (Ctrl+Z)"><span>↶</span>Undo</button><button id="t-erase" title="Erase (Delete)"><span>⌫</span>Erase</button>' +
    '<button id="t-notes" title="Notes (N)"><span>✎</span>Notes <em id="t-noteson">OFF</em></button><button id="t-auto" title="Fill in every candidate"><span>✦</span>Auto-notes</button>' +
    '<button id="t-hint" title="Hint (H)"><span>💡</span>Hint <em id="t-hints"></em></button></div>' +
    '<div class="sd-pad" id="sd-pad"></div></div></div>';
  var boardEl = $('#sd-board'), cells = [];
  (function buildBoard() {
    var h = '';
    for (var i = 0; i < C; i++) {
      var r = G.row(i), c = G.col(i), cls = 'c' + (c % b === b - 1 && c < N - 1 ? ' br' : '') + (r % b === b - 1 && r < N - 1 ? ' bb' : '');
      h += '<div class="' + cls + '" data-i="' + i + '" role="gridcell"></div>';
    }
    boardEl.innerHTML = h; boardEl.style.setProperty('--n', N); cells = $$('.c', boardEl);
    var pad = ''; for (var d = 1; d <= N; d++) pad += '<button data-n="' + d + '"><b>' + sym(d) + '</b><small></small></button>';
    $('#sd-pad').innerHTML = pad; $('#sd-pad').style.setProperty('--cols', BIG ? 9 : 9);
  })();

  /* ---------- new game ---------- */
  function newGame(diff, seed, isDaily) {
    seed = seed || ((Math.random() * 4294967295) >>> 0);
    $('#sd-load').hidden = false; $('#sd-prog').style.width = '0';
    var done = function (p) {
      $('#sd-load').hidden = true;
      S = { b: b, diff: diff, seed: seed, daily: isDaily || null, puzzle: p.puzzle, sol: p.solution, g: p.puzzle.slice(), notes: new Array(C).fill(0),
        given: p.puzzle.map(function (v) { return v ? 1 : 0; }), mistakes: 0, hints: 0, time: 0, undo: [], over: false, score: 0, rate: p.rate };
      st(diff).started++; Kit.store.set(KEY + '-stats', stats);
      sel = -1; notesMode = false; render(); saveGame(); armed = 1;
    };
    if (W.Worker && location.protocol !== 'file:') {
      try {
        if (worker) worker.terminate();
        worker = new Worker('/games/sudoku/worker.js');
        worker.onmessage = function (e) { if (e.data.progress != null) $('#sd-prog').style.width = Math.round(e.data.progress * 100) + '%'; if (e.data.done) { worker.terminate(); worker = null; done(e.data); } };
        worker.postMessage({ b: b, diff: diff, seed: seed }); return;
      } catch (e) { }
    }
    setTimeout(function () { done(E.generate(b, diff, seed)); }, 30);
  }

  /* ---------- moves ---------- */
  function conflicts(i, d) { var p = G.peers[i]; for (var k = 0; k < p.length; k++) if (S.g[p[k]] === d) return true; return false; }
  function pushUndo() { S.undo.push({ g: S.g.slice(), notes: S.notes.slice() }); if (S.undo.length > 300) S.undo.shift(); }
  function input(d) {
    if (!S || S.over || sel < 0 || S.given[sel] || paused()) return;
    if (S.g[sel] === S.sol[sel] && settings.autocheck) return; // already right
    if (notesMode) { pushUndo(); if (S.g[sel]) S.g[sel] = 0; S.notes[sel] ^= 1 << (d - 1); Kit.sfx.click(); render(); saveGame(); return; }
    pushUndo(); S.g[sel] = d; S.notes[sel] = 0;
    var wrong = d !== S.sol[sel];
    if (wrong && settings.autocheck) {
      S.mistakes++; Kit.sfx.bad(); cells[sel].classList.add('shake'); setTimeout(function () { cells[sel] && cells[sel].classList.remove('shake'); }, 400);
      if (settings.limit && S.mistakes >= 3) { render(); return lose(); }
    } else {
      if (settings.autoNotes) G.peers[sel].forEach(function (p) { S.notes[p] &= ~(1 << (d - 1)); });
      if (!wrong) { S.score += [10, 20, 30, 45, 60, 80][S.diff] * (BIG ? 2 : 1); Kit.sfx.click(); flashDone(sel); }
    }
    render(); saveGame();
    if (S.g.every(function (v, i) { return v === S.sol[i]; })) win();
  }
  function erase() { if (!S || S.over || sel < 0 || S.given[sel] || (S.g[sel] === S.sol[sel] && settings.autocheck)) return; pushUndo(); S.g[sel] = 0; S.notes[sel] = 0; render(); saveGame(); }
  function undo() { if (!S || S.over || !S.undo.length) return; var u = S.undo.pop(); S.g = u.g; S.notes = u.notes; render(); saveGame(); }
  function autoNotes() { if (!S || S.over) return; pushUndo(); var cand = E.candidates(G, S.g.map(function (v, i) { return v === S.sol[i] || !settings.autocheck ? v : 0; })); for (var i = 0; i < C; i++) if (!S.g[i]) S.notes[i] = cand[i]; Kit.toast('Every candidate filled in.'); render(); saveGame(); }
  function hint() {
    if (!S || S.over) return;
    // prefer the selected cell; otherwise the easiest empty cell (fewest candidates)
    var i = sel >= 0 && !S.given[sel] && S.g[sel] !== S.sol[sel] ? sel : -1;
    if (i < 0) { var cand = E.candidates(G, S.g.map(function (v, k) { return v === S.sol[k] ? v : 0; })), best = 99; for (var k = 0; k < C; k++) if (S.g[k] !== S.sol[k]) { var pc = E.popcount(cand[k]); if (pc < best) { best = pc; i = k; } } }
    if (i < 0) return;
    pushUndo(); S.g[i] = S.sol[i]; S.notes[i] = 0; S.hints++; sel = i;
    G.peers[i].forEach(function (p) { S.notes[p] &= ~(1 << (S.sol[i] - 1)); });
    Kit.sfx.good(); flashDone(i); render(); saveGame(); cells[i].classList.add('hinted');
    if (S.g.every(function (v, k) { return v === S.sol[k]; })) win();
  }
  // flash a row, column or box the moment it is finished
  function flashDone(i) {
    G.unitsOf[i].forEach(function (uk) {
      var u = G.units[uk]; if (!u.every(function (c) { return S.g[c] === S.sol[c]; })) return;
      u.forEach(function (c, k) { setTimeout(function () { cells[c].classList.add('glow'); setTimeout(function () { cells[c].classList.remove('glow'); }, 450); }, k * (BIG ? 12 : 30)); });
    });
  }

  /* ---------- win / lose ---------- */
  function win() {
    S.over = 'won'; var s = st(S.diff); s.won++; s.total += S.time; if (!s.best || S.time < s.best) { s.best = S.time; S.newBest = true; } if (!S.mistakes) s.perfect++;
    s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
    S.score += Math.max(0, Math.round((BIG ? 6000 : 1500) * (S.diff + 1) / Math.max(60, S.time) * 10)) - S.hints * 50;
    if (S.daily) { daily[S.daily] = { time: S.time, mistakes: S.mistakes }; Kit.store.set(KEY + '-daily', daily); }
    Kit.store.set(KEY + '-stats', stats); saveGame(); Kit.sfx.win(); render();
    cells.forEach(function (c, k) { setTimeout(function () { c.classList.add('glow'); }, (G.row(k) + G.col(k)) * (BIG ? 15 : 40)); });
    setTimeout(function () {
      Kit.modal('<h2>Solved! 🎉</h2><p class="mute">' + DIFFS[S.diff] + (S.daily ? ' · daily challenge ' + S.daily : '') + '</p>' +
        '<table class="kt"><tr><td>Time</td><td class="num"><b>' + Kit.fmtTime(S.time) + '</b>' + (S.newBest ? ' · new best!' : '') + '</td></tr><tr><td>Mistakes</td><td class="num">' + S.mistakes + '</td></tr><tr><td>Hints</td><td class="num">' + S.hints + '</td></tr><tr><td>Score</td><td class="num">' + S.score + '</td></tr>' +
        '<tr><td>Best time at this level</td><td class="num">' + Kit.fmtTime(s.best) + '</td></tr><tr><td>Win streak</td><td class="num">' + s.streak + '</td></tr></table>' +
        '<div class="krow"><button class="btn gold" data-close id="w-new">New game</button><button class="btn ghost" data-close id="w-stats">Statistics</button></div>');
      $('#w-new').onclick = function () { newGame(S.diff); }; $('#w-stats').onclick = showStats;
    }, BIG ? 1300 : 900);
  }
  function lose() {
    S.over = 'lost'; st(S.diff).streak = 0; Kit.store.set(KEY + '-stats', stats); saveGame();
    Kit.modal('<h2>Three mistakes</h2><p>The game is over. You can keep going without the limit, or start again.</p><div class="krow"><button class="btn gold" data-close id="l-cont">Second chance</button><button class="btn ghost" data-close id="l-new">New game</button></div>', { sticky: true });
    $('#l-cont').onclick = function () { S.over = false; S.mistakes = 2; S.second = true; render(); saveGame(); };
    $('#l-new').onclick = function () { newGame(S.diff); };
  }

  /* ---------- render ---------- */
  function paused() { return !$('#sd-veil').hidden; }
  function render() {
    if (!S) return;
    var sv = sel >= 0 ? S.g[sel] : 0, counts = new Array(N + 1).fill(0);
    for (var i = 0; i < C; i++) if (S.g[i] && (S.g[i] === S.sol[i] || !settings.autocheck)) counts[S.g[i]]++;
    for (i = 0; i < C; i++) {
      var el = cells[i], v = S.g[i], cls = el.className.replace(/ (sel|area|same|given|wrong|dup|note|right)\b/g, '');
      if (S.given[i]) cls += ' given';
      if (i === sel) cls += ' sel';
      else if (sel >= 0 && settings.hlArea && (G.row(i) === G.row(sel) || G.col(i) === G.col(sel) || G.box(i) === G.box(sel))) cls += ' area';
      if (v && sv && v === sv && settings.hlSame && i !== sel) cls += ' same';
      if (v && !S.given[i]) { if (settings.autocheck && v !== S.sol[i]) cls += ' wrong'; else cls += ' right'; }
      if (v && settings.hlDup && !S.given[i] && conflicts(i, v)) cls += ' dup';
      if (!v && S.notes[i]) cls += ' note';
      el.className = cls;
      if (v) el.textContent = sym(v);
      else if (S.notes[i]) { var h = ''; for (var d = 1; d <= N; d++) var on = S.notes[i] & (1 << (d - 1)); h += '<i' + (on && sv === d && settings.hlSame ? ' class="m"' : '') + '>' + (on ? sym(d) : '') + '</i>'; el.innerHTML = '<span class="nt">' + h + '</span>'; }
      else el.textContent = '';
    }
    $$('#sd-pad button').forEach(function (bt) { var d = +bt.dataset.n, left = N - counts[d]; bt.querySelector('small').textContent = left; bt.classList.toggle('done', left <= 0); bt.classList.toggle('cur', d === sv); });
    $$('#sd-diff button').forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.d === S.diff); });
    $('#sd-level').innerHTML = (S.daily ? '📅 ' + S.daily + ' · ' : '') + '<b>' + DIFFS[S.diff] + '</b>';
    $('#sd-mist').innerHTML = 'Mistakes: <b>' + S.mistakes + (settings.limit && !S.second ? '/3' : '') + '</b>';
    $('#sd-score').innerHTML = 'Score: <b>' + S.score + '</b>';
    $('#t-noteson').textContent = notesMode ? 'ON' : 'OFF'; $('#t-notes').classList.toggle('on', notesMode);
    $('#t-hints').textContent = S.hints ? '×' + S.hints : '';
    $('#sd-time').textContent = settings.timer ? Kit.fmtTime(S.time) : '—';
  }

  /* ---------- panels ---------- */
  function showStats() {
    var tabs = DIFFS.map(function (d, i) { return '<button data-sd="' + i + '"' + (i === (S ? S.diff : 0) ? ' class="on"' : '') + '>' + d + '</button>'; }).join('');
    function body(i) { var s = st(i); return '<table class="kt"><tr><td>Games started</td><td class="num">' + s.started + '</td></tr><tr><td>Games won</td><td class="num">' + s.won + '</td></tr><tr><td>Win rate</td><td class="num">' + (s.started ? Math.round(s.won / s.started * 100) : 0) + '%</td></tr><tr><td>Wins with no mistakes</td><td class="num">' + s.perfect + '</td></tr><tr><td>Best time</td><td class="num">' + (s.best ? Kit.fmtTime(s.best) : '—') + '</td></tr><tr><td>Average time</td><td class="num">' + (s.won ? Kit.fmtTime(s.total / s.won) : '—') + '</td></tr><tr><td>Current win streak</td><td class="num">' + s.streak + '</td></tr><tr><td>Best win streak</td><td class="num">' + s.bestStreak + '</td></tr></table>'; }
    Kit.modal('<h2>Statistics</h2><div class="seg" id="st-tabs">' + tabs + '</div><div id="st-body" style="margin-top:10px">' + body(S ? S.diff : 0) + '</div><div class="krow"><button class="btn ghost" data-close>Close</button><button class="btn ghost" id="st-reset">Reset statistics</button></div>');
    $('#st-tabs').onclick = function (e) { var x = e.target.closest('[data-sd]'); if (!x) return; $$('#st-tabs button').forEach(function (q) { q.classList.toggle('on', q === x); }); $('#st-body').innerHTML = body(+x.dataset.sd); };
    $('#st-reset').onclick = function () { if (confirmTwice(this)) { stats = {}; Kit.store.set(KEY + '-stats', stats); Kit.closeModal(); Kit.toast('Statistics reset.'); } };
  }
  function confirmTwice(btn) { if (btn.dataset.sure) return true; btn.dataset.sure = 1; btn.textContent = 'Tap again to confirm'; return false; }
  function showDaily() {
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), h = '';
    for (var k = 0; k < first; k++) h += '<span></span>';
    for (var d = 1; d <= days; d++) { var key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), won = daily[key], future = d > now.getDate(); h += '<button class="dd' + (won ? ' won' : '') + (d === now.getDate() ? ' today' : '') + '" data-day="' + key + '"' + (future ? ' disabled' : '') + '>' + (won ? '🏆' : d) + '</button>'; }
    var wonN = Object.keys(daily).filter(function (k) { return k.indexOf(y + '-' + String(m + 1).padStart(2, '0')) === 0; }).length;
    Kit.modal('<h2>Daily challenge</h2><p class="mute">' + now.toLocaleString(undefined, { month: 'long', year: 'numeric' }) + ' · ' + wonN + ' solved this month. Everyone gets the same puzzle each day.</p><div class="dcal"><b>S</b><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b>' + h + '</div><div class="krow"><button class="btn gold" id="dd-today" data-close>Play today’s</button><button class="btn ghost" data-close>Close</button></div>');
    function play(key) { var dd = Kit.hash(key + '|' + N); newGame(BIG ? 1 : 2 + (dd % 2), dd, key); Kit.closeModal(); }
    $('#dd-today').onclick = function () { play(Kit.today()); };
    $$('.dcal [data-day]').forEach(function (bt) { bt.onclick = function () { play(bt.dataset.day); }; });
  }
  function showSettings() {
    var opts = [['limit', 'Mistakes limit', 'The game ends after three mistakes.'], ['autocheck', 'Check for mistakes', 'Wrong numbers turn red as soon as you enter them.'], ['hlDup', 'Highlight duplicates', 'Show numbers that repeat in a row, column or box.'], ['hlArea', 'Highlight areas', 'Shade the row, column and box of the selected cell.'], ['hlSame', 'Highlight identical numbers', ''], ['autoNotes', 'Auto-remove notes', 'Placing a number clears it from notes in the same row, column and box.'], ['timer', 'Show the timer', ''], ['sound', 'Sound', ''], ['digitFirst', 'Number first', 'Tap a number, then tap cells to fill them (good on phones).']].concat(BIG ? [['numbers', 'Use numbers 1–25 instead of letters A–Y', '']] : []);
    Kit.modal('<h2>Settings</h2>' + opts.map(function (o) { return '<label class="sw"><input type="checkbox" data-s="' + o[0] + '"' + (settings[o[0]] ? ' checked' : '') + '><span><b>' + o[1] + '</b>' + (o[2] ? '<small>' + o[2] + '</small>' : '') + '</span></label>'; }).join('') + '<div class="krow"><button class="btn gold" data-close>Done</button></div>');
    $$('[data-s]').forEach(function (cb) { cb.onchange = function () { settings[cb.dataset.s] = cb.checked; if (cb.dataset.s === 'sound') Kit.sfx.on = cb.checked; saveSettings(); if (cb.dataset.s === 'numbers') $$('#sd-pad button').forEach(function (bt) { bt.querySelector('b').textContent = sym(+bt.dataset.n); }); render(); }; });
  }
  function showHelp() {
    Kit.modal('<h2>How to play</h2><p>Fill the grid so every row, every column and every ' + b + '×' + b + ' box contains ' + (BIG ? 'each of the letters A to Y (or the numbers 1 to 25) exactly once.' : 'the digits 1 to 9 exactly once.') + '</p>' +
      '<ul><li><b>Select</b> a cell, then tap a ' + (BIG ? 'letter' : 'number') + ' below or type it. Arrow keys move.</li><li><b>Notes</b> (' + (BIG ? 'Shift+N' : 'N') + ') jot down possibilities; <b>Auto-notes</b> fills in every candidate for you.</li><li><b>Hint</b> (' + (BIG ? 'Shift+H' : 'H') + ') fills the selected cell, or the easiest one.</li><li><b>Undo</b> (Ctrl+Z), <b>Erase</b> (Delete), <b>Pause</b> (P).</li><li>The small number under each key shows how many are still to place.</li></ul>' +
      (BIG ? '<p class="mute">Super Sudoku has 625 cells: a long, satisfying game. Your progress is saved in this browser, so you can come back to it.</p>' : '') + '<div class="krow"><button class="btn gold" data-close>Got it</button></div>');
  }

  /* ---------- input ---------- */
  boardEl.addEventListener('click', function (e) {
    var c = e.target.closest('.c'); if (!c || !S) return; var i = +c.dataset.i;
    if (settings.digitFirst && S.pick) { sel = i; input(S.pick); return; }
    sel = i; render();
  });
  $('#sd-pad').addEventListener('click', function (e) { var bt = e.target.closest('[data-n]'); if (!bt) return; var d = +bt.dataset.n; if (settings.digitFirst) { S.pick = S.pick === d ? 0 : d; $$('#sd-pad button').forEach(function (q) { q.classList.toggle('pick', +q.dataset.n === S.pick); }); if (sel >= 0 && !S.g[sel]) input(d); return; } input(d); });
  $('#t-undo').onclick = undo; $('#t-erase').onclick = erase; $('#t-hint').onclick = hint; $('#t-auto').onclick = autoNotes;
  $('#t-notes').onclick = function () { notesMode = !notesMode; render(); };
  $('#sd-new').onclick = function () { newGame(S ? S.diff : 0); };
  $('#sd-diff').onclick = function (e) { var x = e.target.closest('[data-d]'); if (!x) return; if (S && !S.over && S.g.some(function (v, i) { return v && !S.given[i]; }) && !x.dataset.sure) { x.dataset.sure = 1; Kit.toast('Tap ' + DIFFS[+x.dataset.d] + ' again to start a new game.'); setTimeout(function () { delete x.dataset.sure; }, 2500); return; } newGame(+x.dataset.d); };
  $('#b-stats').onclick = showStats; $('#b-daily').onclick = showDaily; $('#b-set').onclick = showSettings; $('#b-help').onclick = showHelp;
  function pause(on) { if (!S || S.over) return; $('#sd-veil').hidden = !on; boardEl.classList.toggle('hide', on); }
  $('#sd-pause').onclick = function () { pause(!paused()); }; $('#sd-resume').onclick = function () { pause(false); };
  D.addEventListener('visibilitychange', function () { if (D.hidden) pause(true); });
  D.addEventListener('keydown', function (e) {
    if (!S || D.querySelector('.kmodal')) return;
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (k === 'p' || k === 'P') { pause(!paused()); return; }
    if (paused()) return;
    var mv = { ArrowUp: -N, ArrowDown: N, ArrowLeft: -1, ArrowRight: 1 }[k];
    if (mv) { e.preventDefault(); if (sel < 0) sel = 0; else { var r = G.row(sel), c = G.col(sel); if (k === 'ArrowUp') r = (r + N - 1) % N; if (k === 'ArrowDown') r = (r + 1) % N; if (k === 'ArrowLeft') c = (c + N - 1) % N; if (k === 'ArrowRight') c = (c + 1) % N; sel = r * N + c; } render(); return; }
    if (k === 'Backspace' || k === 'Delete' || k === '0') { erase(); return; }
    if (!BIG && /^[1-9]$/.test(k)) { input(+k); return; }
    if (BIG && e.shiftKey && (k === 'N' || k === 'H')) { if (k === 'N') { notesMode = !notesMode; render(); } else hint(); return; }
    if (BIG && !settings.numbers && /^[a-yA-Y]$/.test(k)) { input(k.toUpperCase().charCodeAt(0) - 64); return; }
    if (BIG && settings.numbers && /^[0-9]$/.test(k)) { // two-digit numbers: type 1 then 2 quickly for 12
      clearTimeout(numT); numBuf += k; var v = +numBuf;
      if (numBuf.length >= 2 || v > 2) { numBuf = ''; if (v >= 1 && v <= 25) input(v); } else numT = setTimeout(function () { var w = +numBuf; numBuf = ''; if (w >= 1) input(w); }, 600);
      return;
    }
    if (!BIG && (k === 'n' || k === 'N')) { notesMode = !notesMode; render(); return; }
    if (!BIG && (k === 'h' || k === 'H')) { hint(); return; }
  });
  var numBuf = '', numT = 0;

  // timer
  setInterval(function () { if (S && !S.over && !paused() && !D.hidden && armed) { S.time++; if (settings.timer) $('#sd-time').textContent = Kit.fmtTime(S.time); if (S.time % 5 === 0) saveGame(); } }, 1000);
  Kit.sfx.on = settings.sound;

  // resume or start
  var saved = Kit.store.get(KEY + '-game', null);
  if (saved && saved.b === b && !saved.over) { S = saved; armed = 1; render(); Kit.toast('Welcome back. Your game is where you left it.'); }
  else newGame(BIG ? 0 : 1);
  W.SD = { get S() { return S; }, newGame: newGame, input: input, hint: hint, select: function (i) { sel = i; render(); } };
})(window, document);
