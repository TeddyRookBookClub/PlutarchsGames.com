/* Thermopylae: hold the pass. Leonidas stands in the middle and throws spears; the Persian army closes in from every side.
   Greek only. The game vocabulary is all found in the New Testament (Koine); the two famous quotations are classical and say so. */
(function (W, D) {
  'use strict';
  var root = D.getElementById('th'); if (!root) return;
  function $(s) { return root.querySelector(s); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // Greek, English. All of these words occur in the New Testament.
  var WORDS = [
    ['στρατιώτης', 'soldier'], ['ἱππεύς', 'horseman'], ['στράτευμα', 'army, troop'], ['βέλος', 'arrow'], ['λόγχη', 'spear'], ['θυρεός', 'shield'],
    ['μάχαιρα', 'sword'], ['περικεφαλαία', 'helmet'], ['τόξον', 'bow'], ['ἵππος', 'horse'], ['βασιλεύς', 'king'], ['πόλεμος', 'war'],
    ['μάχη', 'battle, fight'], ['νίκη', 'victory'], ['θάνατος', 'death'], ['ὄρος', 'mountain'], ['θάλασσα', 'sea'], ['πύλη', 'gate'],
    ['ὁδός', 'road, path'], ['ἡμέρα', 'day'], ['νύξ', 'night'], ['τρεῖς', 'three'], ['τριακόσιοι', 'three hundred'], ['ἀνήρ', 'man'],
    ['ἐχθρός', 'enemy'], ['φίλος', 'friend'], ['ἐλευθερία', 'freedom'], ['νόμος', 'law'], ['πατρίς', 'homeland'], ['αἷμα', 'blood']
  ];
  var HISTORY = [
    'In 480 BC the Persian king Xerxes marched a huge army into Greece. The Greeks chose to meet it at Thermopylae, a narrow pass between the mountains and the sea.',
    'Thermopylae means “hot gates”, from the hot springs there. The word for gate, πύλη, is in the name.',
    'King Leonidas of Sparta led about 7,000 Greeks, among them 300 Spartans. In the narrow pass the Persian numbers counted for little.',
    'For two days the Greeks threw back every attack, even that of the Immortals, the 10,000 picked men of the king’s guard.',
    'Told that the Persian arrows would hide the sun, the Spartan Dienekes is said to have answered: then we shall fight in the shade.',
    'A local man, Ephialtes, showed the Persians a mountain path that led behind the Greek position.',
    'Learning he was being surrounded, Leonidas sent most of the army away. The 300 Spartans stayed, with 700 Thespians and 400 Thebans.',
    'On the third day they were attacked from both sides and fought to the last. Leonidas fell in the battle.',
    'The stand bought time. Later that year the Greek fleet won at Salamis, and in 479 BC the Persian army was beaten at Plataea.',
    'Almost everything we know of the battle comes from Herodotus, Histories, book 7. He says he learned the names of all three hundred.'
  ];
  var KEY = 'trb-thermo-v1', st = { hi: 0, wave: 0 };
  try { var sv = JSON.parse(W.localStorage.getItem(KEY)); if (sv) st = sv; } catch (e) { }
  function save() { try { W.localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }

  root.innerHTML = '<canvas aria-label="Battlefield"></canvas><div class="th-hud"><span id="th-wave"></span><span id="th-score"></span><span class="sp"></span><span id="th-lives"></span><button type="button" id="th-molon" title="Spear storm (E)">μολὼν λαβέ</button><button type="button" id="th-pause" aria-label="Pause">❚❚</button></div><div class="th-word" id="th-word"></div><div class="th-ov" id="th-ov"></div>';
  var cv = $('canvas'), c = cv.getContext('2d'), dpr = 1, Wd = 0, Ht = 0;
  function fit() { dpr = Math.min(2, W.devicePixelRatio || 1); Wd = cv.clientWidth; Ht = cv.clientHeight; cv.width = Math.round(Wd * dpr); cv.height = Math.round(Ht * dpr); }
  var G = null, paused = true, keys = {}, firing = false, rocks = [];
  for (var i = 0; i < 40; i++) rocks.push([Math.random(), Math.random(), rnd(2, 7), Math.random()]);

  function newGame() {
    G = { ang: 0, cool: 0, spears: [], foes: [], fx: [], queue: [], t: 0, wave: 0, score: 0, lives: 3, inv: 0, seen: {}, arrowT: 0, over: false, glory: 0, up: { rate: 0, spread: 0, pierce: 0, guard: 0, sling: 0 }, guards: [], slingT: 0, meter: 0, combo: 0, comboT: 0, kills: 0, storm: 0 };
    nextWave();
  }
  function nextWave() {
    G.wave++; var n = G.wave, q = [], t = 0.5;
    function add(type, gap) { q.push({ at: t, type: type }); t += gap; }
    for (var a = 0; a < 3 + n; a++) add('s', Math.max(0.35, 1.1 - n * 0.05));
    for (var b = 0; b < 1 + Math.floor(n / 2); b++) add('t', 1.6);
    for (var h = 0; h < Math.max(0, n - 2); h++) add('h', 1.0);
    if (n >= 5) for (var im = 0; im < Math.floor((n - 3) / 2); im++) add('i', 1.4);
    if (n % 4 === 0) add(n >= 12 ? 'k' : 'b', 2);
    q.sort(function () { return Math.random() - 0.5; }); q.forEach(function (x, i2) { x.at = 0.5 + i2 * Math.max(0.4, 1.2 - n * 0.06); });
    G.queue = q; G.t = 0; G.arrowT = 4; hud(); var day = dayOf(n); if (n === 1 || dayOf(n - 1) !== day) banner(['', 'Day 1: the Persians attack the pass', 'Day 2: the Immortals', 'Day 3: Ephialtes has shown them the mountain path. They come from behind!'][Math.min(3, day)]); else if (n % 4 === 0) banner(n >= 12 ? 'Xerxes himself comes down from his throne!' : 'Hydarnes leads the Immortals!');
  }
  function dayOf(n) { return n <= 4 ? 1 : n <= 8 ? 2 : 3; }
  function banner(t) { if (!t) return; $('#th-word').innerHTML = '<b>' + t + '</b>'; wordT = 3.5; }
  var DEF = { i: { r: 15, sp: 30, w: 'ἀθανασία', e: 'immortality: the Immortals', pts: 60, hp: 3 }, b: { r: 24, sp: 18, w: 'στρατηγός', e: 'commander', pts: 400, hp: 14 }, k: { r: 30, sp: 12, w: 'βασιλεύς', e: 'king', pts: 1000, hp: 26 }, s: { r: 13, sp: 36, w: 'στρατιώτης', e: 'soldier', pts: 20 }, t: { r: 34, sp: 20, w: 'στράτευμα', e: 'troop', pts: 50 }, h: { r: 15, sp: 78, w: 'ἱππεύς', e: 'horseman', pts: 40 }, a: { r: 5, sp: 170, w: 'βέλος', e: 'arrow', pts: 10 } };
  function spawn(type, x, y, dir) {
    var d = DEF[type], R = Math.hypot(Wd, Ht) / 2 + 40;
    if (x == null) { var day = dayOf(G.wave), a = day >= 3 ? rnd(0, Math.PI * 2) : rnd(-0.9, 0.9) * (day === 2 ? 1.25 : 1); if (day >= 3 && Math.random() < .45) a = Math.PI + rnd(-0.7, 0.7); x = Math.cos(a) * R; y = Math.sin(a) * R; }
    var sp = d.sp * (1 + Math.min(1.2, G.wave * 0.05)) * rnd(0.85, 1.15);
    G.foes.push({ type: type, x: x, y: y, r: d.r, sp: sp, sw: type === 'a' ? 0 : rnd(-0.5, 0.5), ph: rnd(0, 6), col: type === 'i' || type === 'b' ? '#2b3d6b' : type === 'k' ? '#7a1f5a' : pick(['#6a3d9a', '#c9a227', '#1f8a70', '#b5532a']), dir: dir, hp: d.hp || 1, max: d.hp || 1, spawnT: 3 });
  }
  function say(type) { var d = DEF[type]; if (!G.seen[d.w] && W.TRBWords) W.TRBWords.log('thermopylae', 'g', d.w, d.e); G.seen[d.w] = 1; $('#th-word').innerHTML = '<b class="gr">' + d.w + '</b> = ' + d.e; wordT = 2.5; }
  var wordT = 0;
  function hud() {
    $('#th-wave').textContent = 'Day ' + dayOf(G.wave) + ' · wave ' + G.wave; $('#th-score').textContent = G.score + ' points' + (G.combo > 1 ? ' · ×' + Math.min(5, G.combo) : '') + ' · ' + G.glory + ' κλέος';
    var mb = $('#th-molon'); if (mb) { mb.style.setProperty('--m', Math.min(1, G.meter / 25)); mb.classList.toggle('ready', G.meter >= 25); }
    $('#th-lives').textContent = G.lives > 0 ? Array(G.lives + 1).join('🛡️') : '';
  }
  function fire() {
    if (G.cool > 0) return; G.cool = 0.2 * Math.pow(0.8, G.up.rate);
    var n = 1 + G.up.spread * 2; for (var i = 0; i < n; i++) { var a = G.ang + (i - (n - 1) / 2) * 0.13; G.spears.push({ x: Math.cos(a) * 24, y: Math.sin(a) * 24, a: a, life: 1.6, pierce: G.up.pierce }); }
  }
  function molon() {
    if (!G || G.over || G.meter < 25) return; G.meter = 0; G.storm = 1;
    for (var i = 0; i < 36; i++) { var a = i / 36 * Math.PI * 2; G.spears.push({ x: Math.cos(a) * 24, y: Math.sin(a) * 24, a: a, life: 2, pierce: 3 }); }
    banner('μολὼν λαβέ! Come and take them!'); hud();
  }
  function boom(x, y, col) { for (var i = 0; i < 8; i++) { var a = rnd(0, 6.28), s = rnd(40, 140); G.fx.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, col: col }); } }
  function step(dt) {
    G.t += dt; G.cool -= dt; G.inv -= dt; wordT -= dt; if (wordT <= 0 && wordT > -1) { $('#th-word').innerHTML = ''; wordT = -2; }
    if (keys.ArrowLeft || keys.a) G.ang -= 3.6 * dt; if (keys.ArrowRight || keys.d) G.ang += 3.6 * dt;
    if (firing || keys[' ']) fire();
    G.comboT -= dt; if (G.comboT <= 0 && G.combo) { G.combo = 0; hud(); }
    if (G.storm > 0) G.storm -= dt;
    // the Spartan guard circles Leonidas
    G.guards.forEach(function (g, i) { g.a += dt * 0.9; var gx = Math.cos(g.a) * 58, gy = Math.sin(g.a) * 58; g.x = gx; g.y = gy; G.foes.forEach(function (f) { if (!f.dead && f.type !== 'a' && Math.hypot(f.x - gx, f.y - gy) < f.r + 11) { hitFoe(f, 1); g.hp--; boom(gx, gy, '#8c1d2c'); } }); });
    G.guards = G.guards.filter(function (g) { return g.hp > 0; });
    if (G.up.sling) { G.slingT -= dt; if (G.slingT <= 0) { G.slingT = 1.6 / G.up.sling; var tg = null, bd = 1e9; G.foes.forEach(function (f) { var d = Math.hypot(f.x, f.y); if (d < bd && f.type !== 'a') { bd = d; tg = f; } }); if (tg) { var a = Math.atan2(tg.y, tg.x); G.spears.push({ x: 0, y: 0, a: a, life: 1.4, pierce: 0, stone: 1 }); } } }
    while (G.queue.length && G.queue[0].at <= G.t) spawn(G.queue.shift().type);
    if (G.wave >= 4 && (G.queue.length || G.foes.length)) { G.arrowT -= dt; if (G.arrowT <= 0) { spawn('a'); G.arrowT = Math.max(1.2, 4.5 - G.wave * 0.25); } }
    G.spears.forEach(function (s) { s.x += Math.cos(s.a) * 540 * dt; s.y += Math.sin(s.a) * 540 * dt; s.life -= dt; });
    G.foes.forEach(function (f) {
      if ((f.type === 'b' || f.type === 'k') && (f.spawnT -= dt) <= 0) { f.spawnT = f.type === 'k' ? 2.2 : 3; spawn(f.type === 'k' ? 'i' : 's', f.x * 1.05, f.y * 1.05); }
      if (f.flash) f.flash = Math.max(0, f.flash - dt);
      var d = Math.hypot(f.x, f.y) || 1, ux = -f.x / d, uy = -f.y / d, sw = f.sw * Math.min(1, d / 200) * Math.sin(G.t * 1.3 + f.ph);
      f.x += (ux - uy * sw) * f.sp * dt; f.y += (uy + ux * sw) * f.sp * dt;
    });
    // spears against foes
    G.spears.forEach(function (s) {
      if (s.life <= 0) return;
      for (var i = 0; i < G.foes.length; i++) {
        var f = G.foes[i]; if (f.dead) continue;
        if (Math.hypot(f.x - s.x, f.y - s.y) < f.r + 5 && (!s.hit || s.hit.indexOf(f) < 0)) {
          (s.hit = s.hit || []).push(f); hitFoe(f, s.stone ? 1 : 1);
          if (s.pierce > 0) s.pierce--; else { s.life = 0; break; }
        }
      }
    });
    // foes reaching Leonidas
    G.foes.forEach(function (f) {
      if (f.dead) return;
      if (Math.hypot(f.x, f.y) < f.r + 18) {
        f.dead = true; boom(f.x, f.y, '#fff');
        if (G.inv <= 0) { G.lives--; G.inv = 1.2; hud(); if (G.lives <= 0) return gameOver(); }
      }
    });
    G.foes = G.foes.filter(function (f) { return !f.dead; });
    G.spears = G.spears.filter(function (s) { return s.life > 0; });
    G.fx.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }); G.fx = G.fx.filter(function (p) { return p.life > 0; });
    if (!G.over && !G.queue.length && !G.foes.length) waveDone();
  }
  function hitFoe(f, dmg) {
    f.hp -= dmg; if (f.hp > 0) { boom(f.x, f.y, '#fff'); f.flash = 0.12; return; }
    f.dead = true; G.combo++; G.comboT = 1.6; var mult = Math.min(5, Math.max(1, G.combo)); G.score += DEF[f.type].pts * mult; G.kills++; G.meter++; G.glory += f.type === 'k' ? 40 : f.type === 'b' ? 20 : f.type === 'i' ? 3 : 1; boom(f.x, f.y, f.col); say(f.type);
    if (f.type === 't' || f.type === 'k') { var base = Math.atan2(-f.y, -f.x); for (var k = -1; k <= 1; k++) { spawn(f.type === 'k' ? 'i' : 's', f.x + Math.cos(base + k * 1.6) * 22, f.y + Math.sin(base + k * 1.6) * 22); } }
    hud();
  }
  // ---------- drawing ----------
  function draw() {
    if (cv.width !== Math.round(cv.clientWidth * dpr) || cv.height !== Math.round(cv.clientHeight * dpr)) fit();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = c.createRadialGradient(Wd / 2, Ht / 2, 30, Wd / 2, Ht / 2, Math.max(Wd, Ht) * 0.7); g.addColorStop(0, '#b79b6a'); g.addColorStop(1, '#6f5a3a');
    c.fillStyle = g; c.fillRect(0, 0, Wd, Ht);
    rocks.forEach(function (r) { c.fillStyle = 'rgba(60,45,25,' + (0.15 + r[3] * 0.2) + ')'; c.beginPath(); c.ellipse(r[0] * Wd, r[1] * Ht, r[2] * 1.4, r[2], 0, 0, 6.3); c.fill(); });
    // the mountain (Kallidromos) above and the Malian Gulf below: the Hot Gates
    var tt = (W.performance ? performance.now() : 0) / 1000;
    c.fillStyle = '#5d4a33'; c.beginPath(); c.moveTo(0, 0); for (var mx = 0; mx <= Wd; mx += 40) c.lineTo(mx, Ht * .13 + Math.sin(mx * .021) * 14 + Math.sin(mx * .07) * 6); c.lineTo(Wd, 0); c.fill();
    c.fillStyle = '#4a3a28'; c.beginPath(); c.moveTo(0, 0); for (mx = 0; mx <= Wd; mx += 40) c.lineTo(mx, Ht * .07 + Math.sin(mx * .03 + 1) * 10); c.lineTo(Wd, 0); c.fill();
    c.fillStyle = '#3f6f8f'; c.beginPath(); c.moveTo(0, Ht); for (mx = 0; mx <= Wd; mx += 30) c.lineTo(mx, Ht * .88 + Math.sin(mx * .018 + tt * .6) * 6); c.lineTo(Wd, Ht); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); for (mx = 0; mx <= Wd; mx += 30) c.lineTo(mx, Ht * .88 + Math.sin(mx * .018 + tt * .6) * 6); c.stroke();
    for (var sp2 = 0; sp2 < 3; sp2++) { var sx2 = Wd * (.3 + sp2 * .2), sk = (tt * .4 + sp2 * .33) % 1; c.fillStyle = 'rgba(240,240,235,' + (.25 * (1 - sk)) + ')'; c.beginPath(); c.arc(sx2 + Math.sin(sk * 6) * 6, Ht * .2 - sk * 40, 6 + sk * 12, 0, 6.3); c.fill(); }
    // the Phocian wall
    c.fillStyle = 'rgba(120,100,70,.55)'; for (var wy = Ht * .16; wy < Ht * .86; wy += 16) { c.fillRect(Wd / 2 - 70 + ((wy / 16) % 2) * 4, wy, 14, 13); }
    c.translate(Wd / 2, Ht / 2);
    if (!G) return;
    G.foes.forEach(drawFoe);
    c.strokeStyle = '#3a2a16'; c.lineWidth = 3; c.lineCap = 'round';
    G.spears.forEach(function (s) { if (s.stone) { c.fillStyle = '#444'; c.beginPath(); c.arc(s.x, s.y, 3, 0, 6.3); c.fill(); return; } c.beginPath(); c.moveTo(s.x - Math.cos(s.a) * 16, s.y - Math.sin(s.a) * 16); c.lineTo(s.x + Math.cos(s.a) * 10, s.y + Math.sin(s.a) * 10); c.stroke(); c.fillStyle = '#d9dde0'; c.beginPath(); c.arc(s.x + Math.cos(s.a) * 11, s.y + Math.sin(s.a) * 11, 2.6, 0, 6.3); c.fill(); });
    G.fx.forEach(function (p) { c.globalAlpha = Math.max(0, p.life * 2); c.fillStyle = p.col; c.fillRect(p.x - 2, p.y - 2, 4, 4); }); c.globalAlpha = 1;
    G.guards.forEach(function (g) { c.fillStyle = '#8c1d2c'; c.beginPath(); c.arc(g.x, g.y, 9, 0, 6.3); c.fill(); c.fillStyle = '#c9a227'; c.beginPath(); c.arc(g.x + Math.cos(g.a + 1.57) * 5, g.y + Math.sin(g.a + 1.57) * 5, 7, 0, 6.3); c.fill(); c.fillStyle = '#8c1d2c'; c.font = '700 9px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Λ', g.x + Math.cos(g.a + 1.57) * 5, g.y + Math.sin(g.a + 1.57) * 5 + 1); });
    if (G.storm > 0) { c.strokeStyle = 'rgba(255,220,120,' + G.storm + ')'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 40 + (1 - G.storm) * 300, 0, 6.3); c.stroke(); }
    // Leonidas: red cloak, bronze shield with a lambda, spear
    var blink = G.inv > 0 && Math.floor(G.inv * 10) % 2;
    if (!blink) {
      c.save(); c.rotate(G.ang);
      c.fillStyle = '#8c1d2c'; c.beginPath(); c.ellipse(-8, 0, 13, 16, 0, 0, 6.3); c.fill();
      c.strokeStyle = '#3a2a16'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, 13); c.lineTo(34, 13); c.stroke();
      c.fillStyle = '#d9dde0'; c.beginPath(); c.moveTo(40, 13); c.lineTo(32, 10); c.lineTo(32, 16); c.fill();
      c.fillStyle = '#c9a227'; c.beginPath(); c.arc(0, 0, 9, 0, 6.3); c.fill();
      c.fillStyle = '#8c1d2c'; c.fillRect(-9, -2, 14, 4);
      c.restore();
      c.fillStyle = '#b8892f'; c.strokeStyle = '#6b4d14'; c.lineWidth = 2; var sx = Math.cos(G.ang - 1.1) * 13, sy = Math.sin(G.ang - 1.1) * 13;
      c.beginPath(); c.arc(sx, sy, 11, 0, 6.3); c.fill(); c.stroke();
      c.fillStyle = '#8c1d2c'; c.font = '700 14px Georgia,serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Λ', sx, sy + 1);
    }
  }
  function drawFoe(f) {
    var a = Math.atan2(-f.y, -f.x);
    if (f.type === 'a') { c.strokeStyle = '#2a1c0c'; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x - Math.cos(a) * 12, f.y - Math.sin(a) * 12); c.lineTo(f.x + Math.cos(a) * 8, f.y + Math.sin(a) * 8); c.stroke(); return; }
    if (f.type === 't') {
      c.fillStyle = 'rgba(40,25,10,.18)'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.3); c.fill();
      for (var i = 0; i < 7; i++) { var q = i ? i * 1.047 : 0, d = i ? 20 : 0; man(f.x + Math.cos(q) * d, f.y + Math.sin(q) * d, 8, f.col, a); }
      label(f, 'στράτευμα'); return;
    }
    if (f.type === 'h') {
      c.save(); c.translate(f.x, f.y); c.rotate(a); c.fillStyle = '#5b3d22'; c.beginPath(); c.ellipse(0, 0, 17, 8, 0, 0, 6.3); c.fill(); c.beginPath(); c.arc(16, 0, 5, 0, 6.3); c.fill(); c.restore();
      man(f.x, f.y, 7, f.col, a); return;
    }
    if (f.type === 'b' || f.type === 'k') { c.fillStyle = f.flash ? '#fff' : f.col; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.3); c.fill(); c.fillStyle = '#e8c9a0'; c.beginPath(); c.arc(f.x, f.y, f.r * .45, 0, 6.3); c.fill(); c.fillStyle = '#d9b44a'; c.beginPath(); for (var j = 0; j < 5; j++) { var qa = -Math.PI / 2 + (j - 2) * .35; c.lineTo(f.x + Math.cos(qa) * f.r * .75, f.y + Math.sin(qa) * f.r * .75 - 4); c.lineTo(f.x + Math.cos(qa + .17) * f.r * .45, f.y + Math.sin(qa + .17) * f.r * .45 - 4); } c.fill();
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(f.x - 26, f.y + f.r + 4, 52, 5); c.fillStyle = '#e04a3a'; c.fillRect(f.x - 26, f.y + f.r + 4, 52 * f.hp / f.max, 5); label(f, f.type === 'k' ? 'Ξέρξης · βασιλεύς' : 'Ὑδάρνης · στρατηγός'); return; }
    man(f.x, f.y, f.type === 'i' ? 11 : 10, f.flash ? '#fff' : f.col, a);
    if (f.type === 'i') { c.strokeStyle = '#d9b44a'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 13, 0, 6.3); c.stroke(); if (f.hp < f.max) { c.fillStyle = '#e04a3a'; c.fillRect(f.x - 10, f.y + 15, 20 * f.hp / f.max, 3); } }
  }
  function man(x, y, r, col, a) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
    c.fillStyle = '#e8c9a0'; c.beginPath(); c.arc(x, y, r * 0.5, 0, 6.3); c.fill();
    c.strokeStyle = '#c8a86a'; c.lineWidth = Math.max(2, r * 0.45); c.beginPath(); c.arc(x, y, r + 1, a - 0.7, a + 0.7); c.stroke(); // wicker shield toward Leonidas
  }
  function label(f, txt) { c.font = '15px "Gentium Book Plus",Georgia,serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(20,12,4,.85)'; c.fillText(txt, f.x, f.y - f.r - 5); }
  // ---------- overlays ----------
  function ov(html) { var o = $('#th-ov'); o.innerHTML = '<div class="th-box">' + html + '</div>'; o.hidden = false; paused = true; return o; }
  function closeOv() { $('#th-ov').hidden = true; paused = false; last = 0; }
  function title() {
    ov('<h1>Thermopylae</h1><p class="quote gr">μολὼν λαβέ</p><p class="qsub">“Come and take them”: Leonidas’ reply when told to hand over his weapons (Plutarch). Classical Greek.</p>' +
      '<p>480 BC. You are Leonidas, holding the pass. For two days the Persians come at you through the Hot Gates; on the third, from every side. Earn glory (κλέος) to bring the 300 and the helot slingers to your side, and when the meter is full, shout <span class="gr">μολὼν λαβέ</span> for a storm of spears.</p>' +
      '<p><button type="button" class="th-btn pri" id="th-go">Hold the pass</button></p>' +
      (st.hi ? '<p class="th-small">Best: ' + st.hi + ' points, wave ' + st.wave + '</p>' : '') +
      '<details><summary>How to play</summary><ul><li><b>Mouse:</b> Leonidas faces the pointer; hold the button to throw.</li><li><b>Keyboard:</b> ← → (or A D) turn, Space throws, P pauses.</li><li><b>Phone:</b> touch where you want to throw, and hold to keep throwing.</li><li>A <span class="gr">στράτευμα</span> (troop) breaks into three soldiers when hit. Horsemen are fast. From wave 4, arrows fly in too.</li><li>You have three shields. After each wave, a right answer about a Greek word wins one back, and you can spend glory on upgrades.</li><li>The Immortals take three hits. Every fourth wave a commander comes, and in the end the king himself.</li><li><b>E</b> or Shift (or the μολὼν λαβέ button) unleashes the spear storm when the meter is full.</li><li>The Greek words in the game are all found in the New Testament, so they are Koine as well as classical. The two famous quotations are classical Greek.</li></ul></details>');
    $('#th-go').onclick = function () { newGame(); closeOv(); };
  }
  function waveDone() {
    G.over = true; G.score += 100; var n = G.wave;
    var seen = WORDS.filter(function (w) { return G.seen[w[0]]; }), pool = seen.concat(WORDS.slice(0, Math.min(WORDS.length, 6 + n * 3)));
    var w = pick(pool), opts = [w]; while (opts.length < 4) { var o = pick(WORDS); if (opts.indexOf(o) < 0) opts.push(o); }
    opts.sort(function () { return Math.random() - 0.5; });
    G.glory += 5;
    var o2 = ov('<h2>Wave ' + n + ' beaten back</h2><p>' + HISTORY[(n - 1) % HISTORY.length] + '</p><p class="th-small">What does this word mean? A right answer wins back a shield.</p><p class="big gr">' + w[0] + '</p><div class="th-opts">' +
      opts.map(function (x, i) { return '<button type="button" class="th-btn" data-o="' + i + '">' + x[1] + '</button>'; }).join('') + '</div><p id="th-res"></p><div id="th-shop"></div><button type="button" class="th-btn" id="th-next">Skip</button>');
    shop();
    var done = false;
    o2.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () {
      if (done) return; done = true; var ok = opts[+b.dataset.o] === w; b.classList.add(ok ? 'right' : 'wrong');
      o2.querySelectorAll('[data-o]').forEach(function (x) { if (opts[+x.dataset.o] === w) x.classList.add('right'); });
      if (ok) { G.score += 200; if (G.lives < 5) G.lives++; }
      $('#th-res').innerHTML = (ok ? '<b>Right!</b> +200 points' + (G.lives <= 5 ? ' and a shield. ' : '. ') : '<b>Not quite.</b> ') + '<span class="gr">' + w[0] + '</span> means “' + w[1] + '”.';
      $('#th-next').textContent = 'Next wave'; $('#th-next').classList.add('pri'); hud();
    }; });
    $('#th-next').onclick = function () { G.over = false; nextWave(); closeOv(); };
  }
  var UPS = [['rate', 'Swift arm', 'Throw 20% faster', 3, 12], ['spread', 'More spears', 'Throw a fan of spears', 2, 25], ['pierce', 'Heavy spear', 'Each spear goes through one more man', 2, 18], ['guard', 'A Spartan at your side', 'One of the 300 circles you and strikes down whoever comes close', 4, 15], ['sling', 'Helot slingers', 'Slingers throw stones at the nearest enemy', 3, 14], ['shield', 'A new shield', 'Win back a shield', 9, 20]];
  function shop() {
    var el = $('#th-shop'); if (!el) return;
    el.innerHTML = '<p class="th-small">Spend <b>κλέος</b> (glory): you have <b>' + G.glory + '</b></p><div class="th-ups">' + UPS.map(function (u) { var lv = u[0] === 'shield' ? 0 : u[0] === 'guard' ? G.guards.length : G.up[u[0]], cost = u[4] + lv * Math.round(u[4] * .6), max = u[0] === 'shield' ? G.lives >= 5 : lv >= u[3]; return '<button type="button" class="th-up" data-u="' + u[0] + '"' + (max || G.glory < cost ? ' disabled' : '') + '><b>' + u[1] + (u[0] !== 'shield' ? ' ' + '●'.repeat(lv) + '○'.repeat(Math.max(0, u[3] - lv)) : '') + '</b><small>' + u[2] + '</small><span>' + (max ? 'max' : cost + ' κλέος') + '</span></button>'; }).join('') + '</div>';
    el.querySelectorAll('[data-u]').forEach(function (b) { b.onclick = function () { var k = b.dataset.u, u = UPS.filter(function (x) { return x[0] === k; })[0], lv = k === 'shield' ? 0 : k === 'guard' ? G.guards.length : G.up[k], cost = u[4] + lv * Math.round(u[4] * .6); if (G.glory < cost) return; G.glory -= cost; if (k === 'shield') G.lives++; else if (k === 'guard') G.guards.push({ a: G.guards.length * 1.57, hp: 4, x: 0, y: 0 }); else G.up[k]++; hud(); shop(); }; });
  }
  function gameOver() {
    G.over = true; if (G.score > st.hi) { st.hi = G.score; st.wave = G.wave; save(); }
    var words = WORDS.filter(function (w) { return G.seen[w[0]]; }).map(function (w) { return '<span class="gr">' + w[0] + '</span> ' + w[1]; }).join(' · ');
    ov('<h2>The pass has fallen</h2><p>You held for ' + G.wave + ' wave' + (G.wave === 1 ? '' : 's') + ' and scored ' + G.score + ' points.</p>' +
      '<p class="quote gr" style="font-size:1.15rem">Ὦ ξεῖν’, ἀγγέλλειν Λακεδαιμονίοις ὅτι τῇδε κείμεθα, τοῖς κείνων ῥήμασι πειθόμενοι.</p><p class="qsub">“Stranger, tell the Spartans that here we lie, obedient to their words.” The epitaph at Thermopylae (Herodotus 7.228). Classical Greek.</p>' +
      (words ? '<p class="th-small">Words you met: ' + words + '</p>' : '') + '<p><button type="button" class="th-btn pri" id="th-go">Stand again</button></p>');
    $('#th-go').onclick = function () { newGame(); closeOv(); };
  }
  // ---------- input ----------
  function aim(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; if (!p || !G) return; G.ang = Math.atan2(p.clientY - r.top - r.height / 2, p.clientX - r.left - r.width / 2); }
  cv.addEventListener('mousemove', aim);
  cv.addEventListener('mousedown', function (e) { aim(e); firing = true; });
  W.addEventListener('mouseup', function () { firing = false; });
  cv.addEventListener('touchstart', function (e) { e.preventDefault(); aim(e); firing = true; }, { passive: false });
  cv.addEventListener('touchmove', function (e) { e.preventDefault(); aim(e); }, { passive: false });
  cv.addEventListener('touchend', function () { firing = false; });
  D.addEventListener('keydown', function (e) {
    if (!root.offsetParent) return; var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true;
    if (k === ' ' || k === 'ArrowLeft' || k === 'ArrowRight') { if ($('#th-ov').hidden) e.preventDefault(); }
    if (k === 'p') togglePause();
    if (k === 'e' || k === 'Shift') molon();
  });
  D.addEventListener('keyup', function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  function togglePause() {
    if (!G || G.over) return;
    if ($('#th-ov').hidden) { var o = ov('<h2>Paused</h2><p><button type="button" class="th-btn pri" id="th-res2">Resume</button> <button type="button" class="th-btn" id="th-quit">Quit to title</button></p>'); $('#th-res2').onclick = closeOv; $('#th-quit').onclick = function () { G = null; title(); }; }
    else if ($('#th-res2')) closeOv();
  }
  $('#th-pause').onclick = togglePause; $('#th-molon').onclick = molon;
  D.addEventListener('visibilitychange', function () { if (D.hidden && G && !G.over && $('#th-ov').hidden) togglePause(); });
  var last = 0;
  function frame(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    if (G && !paused && !G.over) step(dt);
    draw(); W.requestAnimationFrame(frame);
  }
  W.__th = { state: function () { return G; } };
  fit(); title(); W.requestAnimationFrame(frame);
})(window, document);
