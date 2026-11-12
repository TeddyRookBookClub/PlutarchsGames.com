/* Walls of Syracuse — tower defence. 213–212 BC: Rome besieges Syracuse, and Archimedes defends it with machines.
   Plutarch tells the story in his Life of Marcellus (14–19): the claw that lifted ships out of the sea, the catapults
   that fired at every range, and Marcellus joking that he was fighting a geometrical Briareus with a hundred hands.
   Canvas 2D; four maps; five machines with three levels each; day and night waves (the mirrors need the sun). */
(function (W, D) {
  'use strict';
  var Wd = 960, Hd = 600;
  Kit.bar('Walls of Syracuse', [['b-speed', '▶▶', 'Speed (F)'], ['b-pause', '❚❚', 'Pause (Space)'], ['b-snd', '🔊', 'Sound'], ['b-help', '?', 'How to play']]);
  var main = D.createElement('main'); main.className = 'sy'; D.body.appendChild(main);
  main.innerHTML = '<div class="sy-stage"><canvas id="cv"></canvas><div class="sy-hud"><span id="h-gold"></span><span id="h-lives"></span><span id="h-wave"></span><span id="h-time"></span></div>' +
    '<button class="btn gold sy-go" id="b-wave">Send the next wave ▶</button><div class="sy-panel" id="panel" hidden></div></div>' +
    '<div class="sy-shop" id="shop"></div>';
  var cv = Kit.$('#cv'), ctx = cv.getContext('2d'), SC = 1, DPR = 1;
  function resize() { var st = Kit.$('.sy-stage'), w = st.clientWidth; SC = w / Wd; DPR = Math.min(2, W.devicePixelRatio || 1); cv.width = Math.round(w * DPR); cv.height = Math.round(Hd * SC * DPR); cv.style.height = Math.round(Hd * SC) + 'px'; }
  W.addEventListener('resize', resize);

  /* ---------- machines ---------- */
  var TOWERS = {
    archer: { name: 'Archers', icon: '🏹', cost: 70, range: 125, rate: .55, dmg: 8, info: 'Fast, cheap, and good against anything. Weak against the testudo.' },
    scorpion: { name: 'Scorpion', icon: '🎯', cost: 110, range: 175, rate: 1.4, dmg: 26, pierce: 3, info: 'A bolt-thrower whose heavy bolt flies through up to three enemies in a line.' },
    catapult: { name: 'Catapult', icon: '🪨', cost: 150, range: 215, min: 60, rate: 2.6, dmg: 34, splash: 48, info: 'Hurls stones into crowds. Cannot hit anything closer than its minimum range.' },
    claw: { name: 'Archimedes’ Claw', icon: '🦀', cost: 180, range: 78, rate: 5, dmg: 160, ships: true, seaOnly: true, info: 'Only on the sea wall. Grabs a ship by the bow, lifts it and drops it: small ships sink at once.' },
    mirror: { name: 'Burning mirror', icon: '☀️', cost: 220, range: 190, rate: 0, dmg: 4, beam: true, info: 'Focuses sunlight on one enemy; the longer it holds, the hotter it burns. Useless at night. (A later legend, but a famous one.)' },
  };
  var UPG = [1, 1.6, 2.4], UPCOST = [0, .8, 1.3];
  var ENEMY = {
    legionary: { name: 'Legionaries', hp: 34, speed: 42, gold: 6, leak: 1, land: true, r: 9 },
    testudo: { name: 'Testudo', hp: 110, speed: 30, gold: 14, leak: 2, land: true, r: 13, arrowArmor: .5 },
    tower: { name: 'Siege tower', hp: 520, speed: 16, gold: 60, leak: 6, land: true, r: 22, big: true },
    lembus: { name: 'Lembus', hp: 28, speed: 64, gold: 6, leak: 1, sea: true, r: 11 },
    quinq: { name: 'Quinquereme', hp: 190, speed: 30, gold: 22, leak: 3, sea: true, r: 20 },
    sambuca: { name: 'Sambuca', hp: 900, speed: 15, gold: 120, leak: 10, sea: true, r: 30, big: true },
  };

  /* ---------- maps: paths are polylines; spots are where machines can stand ('sea' spots face the water) ---------- */
  var MAPS = [
    { name: 'The harbour of Ortygia', note: 'Marcellus attacks from the sea with sixty quinqueremes. Archimedes’ machines are waiting on the walls of Ortygia, the island at the heart of Syracuse.', waves: 12, gold: 260,
      sea: [[[-30, 120], [220, 140], [420, 110], [600, 170], [700, 300], [760, 400]]], land: [],
      wall: [[640, 600], [700, 470], [840, 380], [960, 360]], shore: [[0, 600], [0, 600]], city: [800, 520],
      spots: [[700, 360, 'sea'], [600, 280, 'sea'], [520, 210, 'sea'], [380, 220, 'sea'], [300, 210, 'sea'], [470, 60, 'wall'], [640, 90, 'wall'], [790, 300, 'sea'], [220, 230, 'sea'], [120, 220, 'sea']], night: [5, 9] },
    { name: 'The heights of Epipolae', note: 'Appius Claudius leads the legions against the long northern wall. On land the claw is useless, so trust the archers and the catapults.', waves: 14, gold: 300,
      sea: [], land: [[[-30, 300], [150, 280], [260, 180], [420, 160], [520, 300], [640, 420], [800, 430], [990, 470]]],
      wall: [], city: [880, 520],
      spots: [[150, 200, 'wall'], [260, 270, 'wall'], [350, 90, 'wall'], [420, 250, 'wall'], [520, 200, 'wall'], [600, 330, 'wall'], [560, 450, 'wall'], [700, 350, 'wall'], [760, 500, 'wall'], [860, 400, 'wall'], [300, 360, 'wall']], night: [4, 8, 12] },
    { name: 'The Great Harbour', note: 'Ships in the bay and soldiers on the shore road, at the same time. Build on both fronts.', waves: 16, gold: 420,
      sea: [[[-30, 80], [200, 90], [380, 150], [520, 230], [620, 320]]], land: [[[-30, 520], [180, 470], [330, 500], [470, 430], [600, 400], [700, 420]]],
      wall: [[560, 600], [640, 360], [960, 330]], city: [820, 470],
      spots: [[300, 70, 'wall'], [450, 140, 'sea'], [540, 170, 'sea'], [600, 240, 'sea'], [360, 230, 'sea'], [250, 170, 'sea'], [250, 430, 'wall'], [400, 420, 'wall'], [520, 340, 'wall'], [440, 530, 'wall'], [680, 300, 'sea'], [120, 410, 'wall']], night: [6, 11, 15] },
    { name: 'The Hexapylon gate', note: 'The last assault. Marcellus brings the great sambuca, eight ships lashed together under a siege ladder, and towers against the Six Gates. Plutarch says the Romans grew so afraid that a rope or a beam over the wall sent them running.', waves: 20, gold: 560,
      sea: [[[-30, 60], [300, 70], [520, 120], [660, 200], [720, 260]]], land: [[[-30, 340], [140, 360], [280, 300], [420, 360], [520, 460], [660, 470], [740, 420]], [[200, 630], [260, 520], [420, 360]]],
      wall: [[700, 600], [760, 240], [960, 220]], city: [860, 420],
      spots: [[420, 40, 'wall'], [560, 70, 'sea'], [620, 150, 'sea'], [690, 180, 'sea'], [430, 150, 'sea'], [250, 140, 'sea'], [180, 290, 'wall'], [330, 400, 'wall'], [470, 290, 'wall'], [600, 390, 'wall'], [380, 520, 'wall'], [560, 540, 'wall'], [700, 520, 'wall'], [120, 440, 'wall']], night: [5, 10, 15, 19] },
  ];

  /* ---------- state ---------- */
  var save = Kit.store.get('pg-syracuse', { done: {}, stars: {} });
  var M, G;   // map, game
  function start(mi) {
    M = MAPS[mi]; G = { mi: mi, gold: M.gold, lives: M.sea.length && M.land.length ? 30 : 20, wave: 0, towers: [], foes: [], shots: [], fx: [], queue: [], t: 0, speed: 1, paused: false, sel: null, build: null, waveOn: false, night: false, over: false, beams: [] };
    M.paths = M.sea.map(function (p) { return { pts: p, kind: 'sea', len: plen(p) }; }).concat(M.land.map(function (p) { return { pts: p, kind: 'land', len: plen(p) }; }));
    if (!M.auto) { M.spots = autoSpots(M); M.auto = true; }
    shop(); Kit.closeModal(); hud();
  }

  // Build spots follow the routes: every so often, on alternating sides, a little way off the road or the sea lane.
  // Spots beside a sea lane are 'sea' spots (the claw can stand there). The hand-placed spots are only a fallback.
  function autoSpots(M) {
    var out = [];
    function ok(x, y) { if (x < 26 || y < 30 || x > Wd - 26 || y > Hd - 24) return false; if (out.some(function (o) { return Math.hypot(o[0] - x, o[1] - y) < 62; })) return false; return !M.paths.some(function (p) { for (var d = 0; d < p.len; d += 12) { var q = at(p, d); if (Math.hypot(q[0] - x, q[1] - y) < (p.kind === 'sea' ? 66 : 34)) return true; } return false; }); }
    M.paths.forEach(function (p) {
      var off = p.kind === 'sea' ? 84 : 58, step = p.kind === 'sea' ? 95 : 85;
      for (var d = 60, side = 1; d < p.len - 20; d += step, side = -side) {
        var q = at(p, d), nx = -Math.sin(q[2]), ny = Math.cos(q[2]);
        for (var tryS = 0; tryS < 2; tryS++) { var sd = tryS ? -side : side, x = q[0] + nx * off * sd, y = q[1] + ny * off * sd; if (ok(x, y)) { out.push([Math.round(x), Math.round(y), p.kind === 'sea' ? 'sea' : 'wall']); break; } }
      }
    });
    return out.length >= 6 ? out : M.spots;
  }
  function plen(p) { var l = 0; for (var i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; }
  function at(path, d) { var p = path.pts; for (var i = 1; i < p.length; i++) { var s = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (d <= s) { var k = d / s; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k, Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0])]; } d -= s; } var l = p[p.length - 1]; return [l[0], l[1], 0]; }

  // Waves grow with the number; sea maps send ships, land maps soldiers, mixed maps both. The last wave brings a boss.
  function makeWave(n) {
    var q = [], hasSea = M.sea.length, hasLand = M.land.length, k = Math.floor(n * 0.9) + Math.floor(G.mi / 2), hpMul = 1 + n * 0.09 + G.mi * 0.08;
    var both = hasSea && hasLand ? .6 : 1;
    function add(type, count, gap, path) { count = Math.max(1, Math.round(count * both)); for (var i = 0; i < count; i++) q.push({ type: type, t: q.length ? q[q.length - 1].t + gap : 0, path: path, hpMul: hpMul }); }
    var seaP = function () { return M.paths.filter(function (p) { return p.kind === 'sea'; })[Math.floor(Math.random() * M.sea.length)]; };
    var landP = function () { var lp = M.paths.filter(function (p) { return p.kind === 'land'; }); return lp[Math.floor(Math.random() * lp.length)]; };
    if (hasLand) { add('legionary', 4 + k, .7, landP()); if (n >= 3) add('testudo', Math.floor(k / 2), 1.3, landP()); if (n >= 6 && n % 3 === 0) add('tower', 1 + Math.floor(n / 8), 4, landP()); }
    if (hasSea) { add('lembus', 3 + Math.floor(k * .7), .9, seaP()); if (n >= 2) add('quinq', 1 + Math.floor(k / 3), 2.4, seaP()); }
    if (n === M.waves) { if (hasSea) add('sambuca', 1 + Math.floor(G.mi / 2), 6, seaP()); else add('tower', 3, 3, landP()); }
    q.sort(function (a, b) { return a.t - b.t; }); return q;
  }
  function sendWave() {
    if (!G || G.waveOn || G.over || G.wave >= M.waves) return;
    G.wave++; G.queue = makeWave(G.wave); G.waveT = 0; G.waveOn = true; G.night = M.night.indexOf(G.wave) >= 0;
    Kit.toast((G.night ? '🌙 Night attack: the mirrors are dark. ' : '') + 'Wave ' + G.wave + ' of ' + M.waves); Kit.sfx.tone(196, .5, .1, 'sawtooth', 0, 160); hud();
  }

  /* ---------- simulation ---------- */
  function step(dt) {
    if (!G || G.paused || G.over) return;
    G.t += dt;
    if (G.waveOn) {
      G.waveT += dt;
      while (G.queue.length && G.queue[0].t <= G.waveT) { var q = G.queue.shift(), E = ENEMY[q.type]; G.foes.push({ type: q.type, E: E, path: q.path, d: 0, hp: E.hp * q.hpMul, max: E.hp * q.hpMul, slow: 0, heat: 0, x: -50, y: -50, a: 0, bob: Math.random() * 6 }); }
      if (!G.queue.length && !G.foes.length) { G.waveOn = false; G.gold += 40 + G.wave * 6; Kit.toast('Wave ' + G.wave + ' beaten. +' + (40 + G.wave * 6) + ' drachmae'); if (G.wave >= M.waves) win(); hud(); }
    }
    for (var i = G.foes.length - 1; i >= 0; i--) {
      var f = G.foes[i];
      if (f.lift != null) { f.lift += dt; if (f.lift > 1.6) { G.foes.splice(i, 1); splash(f.x, f.y, 30); continue; } continue; }
      f.d += f.E.speed * dt * (f.slow > 0 ? .5 : 1); f.slow -= dt; f.bob += dt;
      var p = at(f.path, f.d); f.x = p[0]; f.y = p[1]; f.a = p[2];
      if (f.d >= f.path.len) { G.lives -= f.E.leak; G.foes.splice(i, 1); Kit.sfx.bad(); G.fx.push({ k: 'leak', x: f.x, y: f.y, t: 0 }); if (G.lives <= 0) { G.lives = 0; lose(); } hud(); }
    }
    G.beams = [];
    G.towers.forEach(function (t) {
      var T = TOWERS[t.type], mul = UPG[t.lvl], range = T.range * (1 + t.lvl * .1);
      t.cd -= dt;
      if (T.beam) {
        if (G.night) { t.target = null; return; }
        var tg = t.target && G.foes.indexOf(t.target) >= 0 && dist(t, t.target) < range ? t.target : nearest(t, range);
        if (tg !== t.target) { t.heat = 0; t.target = tg; }
        if (tg) { t.heat = Math.min(15, t.heat + dt * (1 + t.lvl)); hurt(tg, (T.dmg + t.heat * t.heat * .25) * mul * dt, 'fire'); G.beams.push([t, tg]); }
        return;
      }
      if (t.cd > 0) return;
      var targets = G.foes.filter(function (f) { return f.lift == null && dist(t, f) < range && (!T.min || dist(t, f) > T.min) && (!T.ships || f.E.sea); });
      if (!targets.length) return;
      targets.sort(function (a, b) { return b.d / b.path.len - a.d / a.path.len; }); // the one furthest along
      var tgt = targets[0]; t.cd = T.rate / (1 + t.lvl * .15); t.ang = Math.atan2(tgt.y - t.y, tgt.x - t.x);
      if (t.type === 'claw') { if (tgt.hp <= 220 * mul && !tgt.E.big) { tgt.lift = 0; G.gold += tgt.E.gold; Kit.sfx.tone(140, .6, .14, 'sawtooth', 0, 400); G.fx.push({ k: 'claw', x: tgt.x, y: tgt.y, t: 0, from: t }); } else { hurt(tgt, T.dmg * mul, 'claw'); G.fx.push({ k: 'claw', x: tgt.x, y: tgt.y, t: 0, from: t }); } return; }
      G.shots.push({ type: t.type, x: t.x, y: t.y - 14, tx: tgt.x, ty: tgt.y, target: tgt, sp: t.type === 'catapult' ? 260 : t.type === 'scorpion' ? 520 : 420, dmg: T.dmg * mul, splash: T.splash, pierce: T.pierce, hit: [], ang: t.ang, t: 0, total: dist(t, tgt) / (t.type === 'catapult' ? 260 : 420) });
      Kit.sfx.tone(t.type === 'catapult' ? 120 : 600, .08, .04, 'triangle');
    });
    for (i = G.shots.length - 1; i >= 0; i--) {
      var s = G.shots[i]; s.t += dt;
      if (s.type === 'scorpion') { // flies straight on through
        s.x += Math.cos(s.ang) * s.sp * dt; s.y += Math.sin(s.ang) * s.sp * dt;
        G.foes.forEach(function (f) { if (f.lift == null && s.hit.indexOf(f) < 0 && Math.hypot(f.x - s.x, f.y - s.y) < f.E.r + 4) { s.hit.push(f); hurt(f, s.dmg, 'bolt'); } });
        if (s.hit.length >= s.pierce || s.x < -40 || s.x > Wd + 40 || s.y < -40 || s.y > Hd + 40) G.shots.splice(i, 1);
        continue;
      }
      if (s.target && G.foes.indexOf(s.target) >= 0 && s.type !== 'catapult') { s.tx = s.target.x; s.ty = s.target.y; }
      var dx = s.tx - s.x, dy = s.ty - s.y, dd = Math.hypot(dx, dy), stp = s.sp * dt;
      if (dd <= stp) {
        G.shots.splice(i, 1);
        if (s.splash) { G.foes.forEach(function (f) { if (f.lift == null && Math.hypot(f.x - s.tx, f.y - s.ty) < s.splash + f.E.r) hurt(f, s.dmg, 'stone'); }); G.fx.push({ k: 'boom', x: s.tx, y: s.ty, t: 0, r: s.splash }); Kit.sfx.hit(); }
        else if (s.target && G.foes.indexOf(s.target) >= 0) hurt(s.target, s.dmg, 'arrow');
        continue;
      }
      s.x += dx / dd * stp; s.y += dy / dd * stp;
    }
    for (i = G.fx.length - 1; i >= 0; i--) { G.fx[i].t += dt; if (G.fx[i].t > 1.2) G.fx.splice(i, 1); }
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function nearest(t, r) { var best = null, bd = r; G.foes.forEach(function (f) { var d = dist(t, f); if (f.lift == null && d < bd) { bd = d; best = f; } }); return best; }
  function hurt(f, dmg, kind) {
    if (kind === 'arrow' && f.E.arrowArmor) dmg *= f.E.arrowArmor;
    f.hp -= dmg;
    if (f.hp <= 0 && G.foes.indexOf(f) >= 0) { G.foes.splice(G.foes.indexOf(f), 1); G.gold += f.E.gold; G.fx.push({ k: f.E.sea ? 'sink' : 'fall', x: f.x, y: f.y, t: 0, r: f.E.r }); if (f.E.big) Kit.sfx.boom(); hud(); }
  }
  function splash(x, y, r) { G.fx.push({ k: 'sink', x: x, y: y, t: 0, r: r }); Kit.sfx.noise(.4, .15, 700); }
  function win() {
    G.over = 'won'; var stars = G.lives >= 18 ? 3 : G.lives >= 10 ? 2 : 1; save.done[G.mi] = 1; save.stars[G.mi] = Math.max(save.stars[G.mi] || 0, stars); Kit.store.set('pg-syracuse', save); Kit.sfx.win();
    Kit.modal('<h2>The walls hold! ' + '⭐'.repeat(stars) + '</h2><p>' + (G.mi < 3 ? 'The Romans fall back from ' + M.name + '.' : 'Marcellus gives up the assault and settles in for a long blockade.') + '</p>' + (G.mi === 3 ? '<p class="mute">History: in 212 BC, during a festival of Artemis, Roman soldiers climbed a poorly guarded stretch of wall and the city fell. Archimedes was killed by a soldier, according to Plutarch while working on a geometry problem, though Marcellus had ordered him spared.</p>' : '') + '<div class="krow">' + (G.mi < 3 ? '<button class="btn gold" id="w-next" data-close>Next: ' + MAPS[G.mi + 1].name + '</button>' : '') + '<button class="btn ghost" id="w-menu" data-close>Maps</button></div>', { sticky: true });
    if (Kit.$('#w-next')) Kit.$('#w-next').onclick = function () { intro(G.mi + 1); }; Kit.$('#w-menu').onclick = menu;
  }
  function lose() { G.over = 'lost'; Kit.sfx.bad(); Kit.modal('<h2>The wall is breached</h2><p>The legions are inside. Try another arrangement of machines: catapults cover a lot of road, and the claw is deadly on the sea wall.</p><div class="krow"><button class="btn gold" id="l-again" data-close>Try again</button><button class="btn ghost" id="l-menu" data-close>Maps</button></div>', { sticky: true }); Kit.$('#l-again').onclick = function () { start(G.mi); }; Kit.$('#l-menu').onclick = menu; }

  /* ---------- drawing ---------- */
  function draw() {
    ctx.setTransform(SC * DPR, 0, 0, SC * DPR, 0, 0);
    if (!M) { ctx.fillStyle = '#2f78b7'; ctx.fillRect(0, 0, Wd, Hd); return; }
    var night = G && G.night, t = G ? G.t : 0;
    // land
    ctx.fillStyle = '#d9c38c'; ctx.fillRect(0, 0, Wd, Hd);
    // sea lanes become water: draw broad water along sea paths, plus the bay
    M.paths.forEach(function (p) { if (p.kind !== 'sea') return; ctx.strokeStyle = '#3a86c2'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 150; stroke(p.pts); ctx.strokeStyle = '#4a97cf'; ctx.lineWidth = 110; stroke(p.pts); });
    if (M.sea.length) { ctx.fillStyle = '#3a86c2'; ctx.fillRect(0, 0, Wd, 40); }
    // texture: waves on water, grass tufts and olive trees on land
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    M.paths.forEach(function (p) { if (p.kind !== 'sea') return; for (var d = 20; d < p.len; d += 38) { var q = at(p, (d + t * 12) % p.len); var o = Math.sin(d) * 35; ctx.beginPath(); ctx.moveTo(q[0] - 8 + o, q[1] + o * .5); ctx.quadraticCurveTo(q[0] + o, q[1] - 4 + o * .5, q[0] + 8 + o, q[1] + o * .5); ctx.stroke(); } });
    for (var k = 0; k < 40; k++) { var x = (k * 211) % Wd, y = (k * 137) % Hd; if (onWater(x, y)) continue; ctx.fillStyle = 'rgba(110,140,70,.35)'; ctx.beginPath(); ctx.arc(x, y, 6 + k % 5, 0, Math.PI * 2); ctx.fill(); }
    // roads
    M.paths.forEach(function (p) { if (p.kind !== 'land') return; ctx.strokeStyle = '#b89a62'; ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; stroke(p.pts); ctx.strokeStyle = '#cdb27a'; ctx.lineWidth = 36; stroke(p.pts); ctx.setLineDash([3, 14]); ctx.strokeStyle = 'rgba(120,90,50,.4)'; ctx.lineWidth = 2; stroke(p.pts); ctx.setLineDash([]); });
    // the city
    var c = M.city; ctx.fillStyle = '#efe6cf'; for (var i = 0; i < 9; i++) { var bx = c[0] - 70 + (i % 3) * 50, by = c[1] - 50 + Math.floor(i / 3) * 40; ctx.fillRect(bx, by, 36, 26); ctx.fillStyle = '#c4613f'; ctx.fillRect(bx - 2, by - 6, 40, 8); ctx.fillStyle = '#efe6cf'; }
    ctx.fillStyle = '#f7f2e4'; ctx.fillRect(c[0] - 20, c[1] - 92, 60, 30); for (i = 0; i < 6; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(c[0] - 16 + i * 10, c[1] - 88, 4, 26); } ctx.fillStyle = '#d9cfb3'; ctx.beginPath(); ctx.moveTo(c[0] - 24, c[1] - 92); ctx.lineTo(c[0] + 10, c[1] - 108); ctx.lineTo(c[0] + 44, c[1] - 92); ctx.fill();
    // walls along paths' ends
    M.paths.forEach(function (p) { var e = p.pts[p.pts.length - 1], a = at(p, p.len - 1)[2]; ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = '#a89f8c'; ctx.fillRect(-60, -6, 120, 14); for (var j = -60; j < 60; j += 12) ctx.fillRect(j, -12, 7, 7); ctx.restore(); });
    // build spots
    if (G) M.spots.forEach(function (s, idx) {
      var used = G.towers.some(function (t) { return t.spot === idx; }); if (used) return;
      var hov = G.hover === idx, ok = G.build && (G.build !== 'claw' || s[2] === 'sea');
      ctx.fillStyle = hov ? 'rgba(216,184,96,.85)' : ok ? 'rgba(216,184,96,.55)' : 'rgba(120,110,90,.35)'; ctx.beginPath(); ctx.arc(s[0], s[1], 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s[2] === 'sea' ? '#2a62c9' : '#7a6a4a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (G.build) { ctx.fillStyle = '#1f1806'; ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', s[0], s[1]); }
    });
    if (!G) return;
    // enemies
    G.foes.forEach(function (f) { drawFoe(f); });
    // towers
    G.towers.forEach(function (tw) {
      var T = TOWERS[tw.type]; if (G.sel === tw || G.hoverT === tw) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tw.x, tw.y, T.range * (1 + tw.lvl * .1), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      drawTower(tw);
    });
    G.beams.forEach(function (b) { var tw = b[0], f = b[1]; ctx.strokeStyle = 'rgba(255,240,150,' + (.5 + Math.random() * .3) + ')'; ctx.lineWidth = 2 + tw.heat * .5; ctx.beginPath(); ctx.moveTo(tw.x, tw.y - 22); ctx.lineTo(f.x, f.y); ctx.stroke(); ctx.fillStyle = 'rgba(255,160,40,.6)'; ctx.beginPath(); ctx.arc(f.x, f.y, 6 + tw.heat, 0, Math.PI * 2); ctx.fill(); });
    G.shots.forEach(function (s) {
      if (s.type === 'catapult') { var k2 = Math.min(1, s.t / s.total), arc = Math.sin(k2 * Math.PI) * 60; ctx.fillStyle = '#6a6458'; ctx.beginPath(); ctx.arc(s.x, s.y - arc, 6, 0, Math.PI * 2); ctx.fill(); }
      else { var a = s.type === 'scorpion' ? s.ang : Math.atan2(s.ty - s.y, s.tx - s.x); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = s.type === 'scorpion' ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(a) * (s.type === 'scorpion' ? 18 : 10), s.y - Math.sin(a) * (s.type === 'scorpion' ? 18 : 10)); ctx.stroke(); }
    });
    G.fx.forEach(function (f) {
      var k3 = f.t / 1.2;
      if (f.k === 'boom') { ctx.fillStyle = 'rgba(120,100,70,' + (1 - k3) * .6 + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (.4 + k3), 0, Math.PI * 2); ctx.fill(); }
      if (f.k === 'sink') { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k3) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + k3 * 1.5), 0, Math.PI * 2); ctx.stroke(); }
      if (f.k === 'fall') { ctx.fillStyle = 'rgba(160,40,30,' + (1 - k3) * .5 + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * .8, 0, Math.PI * 2); ctx.fill(); }
      if (f.k === 'leak') { ctx.fillStyle = 'rgba(255,60,40,' + (1 - k3) + ')'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('−', f.x, f.y - 20 - k3 * 30); }
      if (f.k === 'claw') { ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.from.x, f.from.y - 30); ctx.quadraticCurveTo((f.from.x + f.x) / 2, Math.min(f.from.y, f.y) - 80, f.x, f.y - Math.sin(k3 * Math.PI) * 40); ctx.stroke(); }
    });
    // lifted ships dangle from the claw
    G.foes.forEach(function (f) { if (f.lift == null) return; });
    if (night) { ctx.fillStyle = 'rgba(10,20,50,.42)'; ctx.fillRect(0, 0, Wd, Hd); }
    // placement preview
    if (G.build && G.mouse) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(G.mouse[0], G.mouse[1], TOWERS[G.build].range, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  function onWater(x, y) { if (M.sea.length && y < 40) return true; for (var i = 0; i < M.paths.length; i++) { var p = M.paths[i]; if (p.kind !== 'sea') continue; for (var d = 0; d < p.len; d += 20) { var q = at(p, d); if (Math.hypot(q[0] - x, q[1] - y) < 75) return true; } } return false; }
  function stroke(pts) { ctx.beginPath(); pts.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); }
  function drawFoe(f) {
    var x = f.x, y = f.y, E = f.E;
    ctx.save(); ctx.translate(x, y);
    if (f.lift != null) { ctx.translate(0, -Math.sin(Math.min(1, f.lift / .8) * Math.PI / 2) * 50 + (f.lift > .8 ? (f.lift - .8) * 120 : 0)); ctx.rotate(f.lift * 1.6); }
    if (E.sea) {
      ctx.rotate(f.a + Math.sin(f.bob * 2) * .03); var L = E.r * 1.6, Wd2 = E.r * .55;
      if (f.type === 'sambuca') { for (var s = -1; s <= 1; s += 2) { ctx.fillStyle = '#6b4422'; ctx.beginPath(); ctx.ellipse(0, s * Wd2 * 1.1, L, Wd2, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#8a6a4a'; ctx.fillRect(-L * .2, -Wd2 * 2, L * 1.3, Wd2 * 4); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-L * .2, 0); ctx.lineTo(L * 1.4, 0); ctx.stroke(); }
      else { ctx.fillStyle = '#6b4422'; ctx.beginPath(); ctx.ellipse(0, 0, L, Wd2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a5a2e'; ctx.beginPath(); ctx.ellipse(0, 0, L * .8, Wd2 * .6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1; for (var o = -L * .6; o < L * .6; o += 6) { ctx.beginPath(); ctx.moveTo(o, -Wd2); ctx.lineTo(o - 3, -Wd2 - 7 - Math.sin(f.bob * 6 + o) * 2); ctx.moveTo(o, Wd2); ctx.lineTo(o - 3, Wd2 + 7 + Math.sin(f.bob * 6 + o) * 2); ctx.stroke(); } ctx.fillStyle = '#b8342a'; ctx.fillRect(-3, -Wd2 * 1.6, 6, Wd2 * 3.2); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-2, -Wd2 * 1.4, 4, Wd2 * 2.8); }
    } else {
      if (f.type === 'tower') { ctx.fillStyle = '#7a5530'; ctx.fillRect(-16, -38, 32, 40); ctx.fillStyle = '#5a3b22'; for (var j = 0; j < 4; j++) ctx.fillRect(-16, -38 + j * 10, 32, 2); ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(-12, 4, 5, 0, Math.PI * 2); ctx.arc(12, 4, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b8342a'; ctx.fillRect(-2, -48, 4, 10); }
      else if (f.type === 'testudo') { ctx.fillStyle = '#9a2a22'; for (var r = 0; r < 3; r++) for (var cc = 0; cc < 3; cc++) { ctx.fillRect(-12 + cc * 8, -12 + r * 8, 7, 7); } ctx.fillStyle = '#d8b860'; for (r = 0; r < 3; r++) for (cc = 0; cc < 3; cc++) ctx.fillRect(-9 + cc * 8, -9 + r * 8, 1.5, 1.5); }
      else { for (var m = 0; m < 3; m++) { var mx = (m - 1) * 7, my = (m % 2) * 5 - 2 + Math.sin(f.bob * 8 + m) * 1; ctx.fillStyle = '#b8342a'; ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c9a03a'; ctx.beginPath(); ctx.arc(mx, my - 4, 2.6, 0, Math.PI * 2); ctx.fill(); } }
    }
    ctx.restore();
    if (f.hp < f.max && f.lift == null) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 16, y - E.r - 14, 32, 4); ctx.fillStyle = f.hp / f.max > .5 ? '#5adf5a' : f.hp / f.max > .25 ? '#e8c03a' : '#ef4a3a'; ctx.fillRect(x - 16, y - E.r - 14, 32 * Math.max(0, f.hp / f.max), 4); }
  }
  function drawTower(tw) {
    var x = tw.x, y = tw.y, T = TOWERS[tw.type];
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 10, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b9b09e'; ctx.fillRect(x - 18, y - 16, 36, 26); ctx.fillStyle = '#d1c8b4'; ctx.fillRect(x - 18, y - 20, 36, 6); for (var j = -18; j < 18; j += 9) ctx.fillRect(x + j, y - 26, 6, 6);
    ctx.save(); ctx.translate(x, y - 24);
    if (tw.type === 'archer') { ctx.fillStyle = '#2a62c9'; ctx.beginPath(); ctx.arc(0, -4, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.cos(tw.ang || 0) * 6, -4 + Math.sin(tw.ang || 0) * 6, 7, (tw.ang || 0) - 1.2, (tw.ang || 0) + 1.2); ctx.stroke(); }
    if (tw.type === 'scorpion') { ctx.rotate(tw.ang || 0); ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-4, -3, 24, 6); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(10, 0); ctx.lineTo(4, 10); ctx.stroke(); }
    if (tw.type === 'catapult') { ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-12, -2, 24, 6); var arm = tw.cd > TOWERS.catapult.rate * .8 ? -1.2 : .4; ctx.save(); ctx.rotate(arm); ctx.fillRect(-2, -22, 4, 22); ctx.fillStyle = '#6a6458'; ctx.beginPath(); ctx.arc(0, -22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (tw.type === 'claw') { ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.lineTo(26 * Math.cos(tw.ang || -.6), -26 + 20 * Math.sin(tw.ang || -.6)); ctx.stroke(); ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.arc(26 * Math.cos(tw.ang || -.6), -26 + 20 * Math.sin(tw.ang || -.6), 6, 0, Math.PI * 2); ctx.fill(); }
    if (tw.type === 'mirror') { var shine = G.night ? '#556' : '#ffe066'; ctx.fillStyle = '#c9a03a'; ctx.fillRect(-1, -2, 2, 10); ctx.fillStyle = shine; ctx.beginPath(); ctx.ellipse(0, -10, 12, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-4, -13, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    for (var l = 0; l < tw.lvl; l++) { ctx.fillStyle = '#ffd447'; ctx.beginPath(); ctx.arc(x - 8 + l * 8, y + 6, 3, 0, Math.PI * 2); ctx.fill(); }
  }

  /* ---------- interface ---------- */
  function shop() {
    Kit.$('#shop').innerHTML = Object.keys(TOWERS).map(function (k) { var T = TOWERS[k]; return '<button class="sy-buy" data-t="' + k + '" title="' + T.info + '"><span>' + T.icon + '</span><b>' + T.name + '</b><small>' + T.cost + ' ₯</small></button>'; }).join('') + '<p class="mute small">Choose a machine, then a gold circle. Blue-ringed circles face the sea. Tap a machine to upgrade or sell it.</p>';
  }
  function hud() {
    if (!G) return;
    Kit.$('#h-gold').innerHTML = '₯ <b>' + Math.floor(G.gold) + '</b>'; Kit.$('#h-lives').innerHTML = '🏛️ <b>' + G.lives + '</b>'; Kit.$('#h-wave').innerHTML = 'Wave <b>' + G.wave + '/' + M.waves + '</b>'; Kit.$('#h-time').innerHTML = G.night ? '🌙 Night' : '☀️ Day';
    Kit.$$('.sy-buy').forEach(function (b) { b.classList.toggle('on', G.build === b.dataset.t); b.disabled = G.gold < TOWERS[b.dataset.t].cost; });
    var bw = Kit.$('#b-wave'); bw.hidden = G.waveOn || G.over || G.wave >= M.waves; bw.textContent = G.wave === 0 ? 'Send the first wave ▶' : 'Next wave (' + (G.wave + 1) + ') ▶' + (M.night.indexOf(G.wave + 1) >= 0 ? ' 🌙' : '');
    panel();
  }
  function panel() {
    var p = Kit.$('#panel'), tw = G && G.sel; if (!tw) { p.hidden = true; return; }
    var T = TOWERS[tw.type], up = tw.lvl < 2 ? Math.round(T.cost * UPCOST[tw.lvl + 1]) : 0, sell = Math.round(tw.spent * .7);
    p.hidden = false; p.style.left = Math.min(Wd - 200, Math.max(0, tw.x - 90)) * SC + 'px'; p.style.top = Math.max(0, tw.y - 140) * SC + 'px';
    p.innerHTML = '<b>' + T.icon + ' ' + T.name + '</b> <span class="mute">level ' + (tw.lvl + 1) + '</span><div class="krow">' + (tw.lvl < 2 ? '<button class="btn" id="p-up"' + (G.gold < up ? ' disabled' : '') + '>Upgrade · ' + up + '</button>' : '<span class="chip">max level</span>') + '<button class="btn ghost" id="p-sell">Sell · ' + sell + '</button></div>';
    if (Kit.$('#p-up')) Kit.$('#p-up').onclick = function () { if (G.gold < up) return; G.gold -= up; tw.spent += up; tw.lvl++; Kit.sfx.good(); hud(); };
    Kit.$('#p-sell').onclick = function () { G.gold += sell; G.towers.splice(G.towers.indexOf(tw), 1); G.sel = null; hud(); };
  }
  function toWorld(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / SC, (e.clientY - r.top) / SC]; }
  cv.addEventListener('pointermove', function (e) { if (!G) return; var m = toWorld(e); G.mouse = m; G.hover = M.spots.findIndex(function (s) { return Math.hypot(s[0] - m[0], s[1] - m[1]) < 24; }); G.hoverT = G.towers.find(function (t) { return Math.hypot(t.x - m[0], t.y - m[1]) < 24; }); });
  cv.addEventListener('click', function (e) {
    if (!G || G.over) return; var m = toWorld(e);
    var tw = G.towers.find(function (t) { return Math.hypot(t.x - m[0], t.y - m[1]) < 24; });
    if (tw) { G.sel = G.sel === tw ? null : tw; G.build = null; hud(); return; }
    var si = M.spots.findIndex(function (s) { return Math.hypot(s[0] - m[0], s[1] - m[1]) < 24; });
    if (si >= 0 && G.build && !G.towers.some(function (t) { return t.spot === si; })) {
      var T = TOWERS[G.build], s = M.spots[si];
      if (T.seaOnly && s[2] !== 'sea') { Kit.toast('The claw only works on the sea wall (blue-ringed spots).', true); return; }
      if (G.gold < T.cost) { Kit.toast('Not enough drachmae.', true); return; }
      G.gold -= T.cost; G.towers.push({ type: G.build, x: s[0], y: s[1], spot: si, lvl: 0, cd: 0, spent: T.cost, heat: 0 }); Kit.sfx.good();
      if (G.gold < T.cost) G.build = null; hud(); return;
    }
    G.sel = null; hud();
  });
  Kit.$('#shop').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b || !G) return; G.build = G.build === b.dataset.t ? null : b.dataset.t; G.sel = null; hud(); });
  Kit.$('#b-wave').onclick = sendWave;
  Kit.$('#b-speed').onclick = function () { if (!G) return; G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; this.textContent = G.speed === 1 ? '▶▶' : '×' + G.speed; };
  Kit.$('#b-pause').onclick = function () { if (G) { G.paused = !G.paused; this.textContent = G.paused ? '▶' : '❚❚'; } };
  Kit.$('#b-snd').onclick = function () { this.textContent = Kit.sfx.toggle() ? '🔊' : '🔇'; };
  Kit.$('#b-help').onclick = help;
  D.addEventListener('keydown', function (e) { if (!G) return; if (e.code === 'Space') { e.preventDefault(); Kit.$('#b-pause').click(); } if (e.key === 'f' || e.key === 'F') Kit.$('#b-speed').click(); if (e.key === 'Enter' || e.key === 'w') sendWave(); if (e.key === 'Escape') { G.build = null; G.sel = null; hud(); } var n = +e.key; if (n >= 1 && n <= 5) { G.build = Object.keys(TOWERS)[n - 1]; hud(); } });

  function help() { Kit.modal('<h2>Walls of Syracuse</h2><p>Rome besieges Syracuse, 213 BC. The city’s defence is in the hands of Archimedes, the greatest mathematician of the age. Plutarch says the Romans faced machines that seemed to come from the gods.</p><ul>' + Object.keys(TOWERS).map(function (k, i) { var T = TOWERS[k]; return '<li><b>' + (i + 1) + ' ' + T.icon + ' ' + T.name + '</b> (' + T.cost + '): ' + T.info + '</li>'; }).join('') + '</ul><p class="mute">Testudos shrug off arrows. Siege towers and the great sambuca are slow but tough. Each map ends with a big final wave. Space pauses, F changes speed, Enter sends the next wave, 1–5 pick a machine.</p><div class="krow"><button class="btn gold" data-close>To the walls</button></div>'); }
  function intro(mi) { var m = MAPS[mi]; Kit.modal('<p class="chip">Map ' + (mi + 1) + ' of 4</p><h2>' + m.name + '</h2><p>' + m.note + '</p><p class="mute small">' + m.waves + ' waves · start with ' + m.gold + ' drachmae' + (m.night.length ? ' · ' + m.night.length + ' night attacks' : '') + '</p><div class="krow"><button class="btn gold" data-close id="i-go">Defend</button></div>', { sticky: true }); Kit.$('#i-go').onclick = function () { start(mi); }; }
  function menu() {
    var h = MAPS.map(function (m, i) { var open = i === 0 || save.done[i - 1]; return '<button class="sy-map' + (open ? '' : ' lock') + '" data-m="' + i + '"' + (open ? '' : ' disabled') + '><b>' + (i + 1) + '. ' + m.name + '</b><span>' + (save.stars[i] ? '⭐'.repeat(save.stars[i]) : open ? m.waves + ' waves' : '🔒') + '</span></button>'; }).join('');
    Kit.modal('<h2>Walls of Syracuse</h2><p>213 BC. “Archimedes,” says Plutarch, “regarded the building of machines as a hobby of geometry.” Now his hobby is all that stands between Syracuse and Rome.</p><div class="sy-maps">' + h + '</div><div class="krow"><button class="btn ghost" id="m-help">How to play</button></div>', { sticky: true });
    Kit.$$('.sy-map').forEach(function (b) { b.onclick = function () { intro(+b.dataset.m); }; }); Kit.$('#m-help').onclick = help;
  }

  var last = 0;
  function frame(now) { requestAnimationFrame(frame); var dt = Math.min(.05, (now - last) / 1000 || 0); last = now; if (G) for (var i = 0; i < G.speed; i++) step(dt); draw(); if (G && Math.floor(G.t * 4) !== G.hudT) { G.hudT = Math.floor(G.t * 4); hud(); } }
  resize(); requestAnimationFrame(frame); M = MAPS[0]; M.paths = M.sea.map(function (p) { return { pts: p, kind: 'sea', len: plen(p) }; }); menu();
  W.SY = { get G() { return G; }, start: start, sendWave: sendWave, step: step, TOWERS: TOWERS, MAPS: MAPS };
})(window, document);
