'use strict';
/* Heroes of Hellas — interface: menus, story screens, top bar, selection and command panels, input, sound, main loop. */

const $ = id => document.getElementById(id);
const SAVE_KEY = 'heroes-of-hellas-v1';
let SAVE = { done: {} }; try { Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { }
const saveProgress = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } };

/* ---------- sound ---------- */
const SND = {
  ctx: null, vol: .5, last: {},
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = this.vol; this.out.connect(this.ctx.destination); } catch (e) { } },
  tone(f, d, v, type, when, slide) { if (!this.ctx || this.muted) return; const t = when || this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + .05); },
  noise(d, v, f) { if (!this.ctx || this.muted) return; const n = this.ctx.createBufferSource(), b = this.ctx.createBuffer(1, this.ctx.sampleRate * d, this.ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 2); n.buffer = b; const fl = this.ctx.createBiquadFilter(); fl.frequency.value = f || 1500; const g = this.ctx.createGain(); g.gain.value = v; n.connect(fl); fl.connect(g); g.connect(this.out); n.start(); },
  gate(k, gap) { const t = performance.now(); if (t - (this.last[k] || 0) < gap) return false; this.last[k] = t; return true; },
  shoot(kind) { if (this.gate('shoot', 90)) kind === 'fire' ? this.noise(.5, .15, 600) : kind === 'gaze' ? this.tone(220, .5, .06, 'sine', 0, 880) : this.noise(.12, .05, 3000); },
  clash(u) { if (this.gate('clash', 70) && u && u.owner === 1 || this.gate('clash2', 160)) { this.tone(1800 + Math.random() * 600, .06, .03, 'square'); this.noise(.06, .05, 4000); } },
  drop() { if (this.gate('drop', 300)) this.tone(660, .08, .04); },
  built() { this.tone(523, .15, .08); this.tone(784, .2, .08, 'triangle', this.ctx && this.ctx.currentTime + .1); },
  ready(u) { if (this.gate('ready', 200)) { this.tone(440, .1, .06); this.tone(660, .14, .06, 'triangle', this.ctx && this.ctx.currentTime + .08); } },
  fanfare() { if (!this.ctx) return; const t = this.ctx.currentTime;[392, 523, 659, 784].forEach((f, i) => this.tone(f, .4, .08, 'triangle', t + i * .12)); },
  alarm() { if (!this.ctx) return; const t = this.ctx.currentTime;[0, .25, .5].forEach(d => this.tone(330, .2, .1, 'sawtooth', t + d, 280)); },
  crash() { this.noise(.9, .2, 500); },
  thunder() { this.noise(1.4, .35, 300); this.tone(60, 1, .2, 'sawtooth', 0, 30); },
  wave() { this.noise(1.6, .25, 900); },
  click() { this.tone(900, .04, .03, 'square'); },
  // a quiet lyre that plucks a phrase now and then
  lyreT: 4, lyre(dt) { if (!this.ctx || this.muted || !G || G.state !== 'play') return; this.lyreT -= dt; if (this.lyreT > 0) return; this.lyreT = 9 + Math.random() * 10; const sc = [0, 2, 3, 5, 7, 8, 10, 12], base = 220 * Math.pow(2, [0, 3, 5][Math.floor(Math.random() * 3)] / 12), t = this.ctx.currentTime; let d = 0; for (let k = 0; k < 6; k++) { const s = sc[Math.floor(Math.random() * sc.length)]; this.tone(base * Math.pow(2, s / 12), 1.4, .035, 'triangle', t + d); d += .28 + Math.random() * .3; } },
};

/* ---------- screens ---------- */
const UI = {
  placing: null, power: null, mouse: null, box: null, marks: [], groups: {}, attackMove: false,
  toast(text, kind) { const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = text; $('toasts').appendChild(d); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); setTimeout(() => d.classList.add('out'), 5200); setTimeout(() => d.remove(), 6000); },
  end(won, why) {
    const s = G.scen; $('endTitle').textContent = won ? 'Victory!' : 'Defeat'; $('endText').textContent = won ? s.outro : (why || '') + ' Try again: the gods are patient.';
    $('endStats').textContent = `Time ${fmtTime(G.time)} · ${G.ents.filter(e => e.owner === 1 && e.kind === 'unit').length} people · ${ageName(1)}`;
    if (won) { SAVE.done[s.id] = true; saveProgress(); SND.fanfare(); }
    $('endNext').hidden = !won || !nextScen(s); show('end');
  },
};
const fmtTime = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function nextScen(s) { const L = CAMPAIGN.filter(c => c.civ === s.civ), i = L.indexOf(s); return i >= 0 ? L[i + 1] : null; }
function show(id) { for (const s of ['menu', 'story', 'end', 'pause', 'help']) $(s).hidden = s !== id; $('hud').hidden = !!id && id !== 'pause'; }
function buildMenu() {
  const heads = { greek: ['🏛️', 'The Greeks', 'Perseus, Theseus, Jason and Heracles'], norse: ['ᚱ', 'The Norse', 'Thor, Sigurd and Ragnarǫk'], irish: ['☘️', 'The Irish', 'Lugh, Cú Chulainn and the Táin'] };
  $('campList').innerHTML = Object.keys(heads).map(civ => { const L = CAMPAIGN.filter(s => s.civ === civ); return `<div class="campgrp"><h3>${heads[civ][0]} ${heads[civ][1]} <small>${heads[civ][2]}</small></h3>` + L.map((s, i) => { const open = i === 0 || SAVE.done[L[i - 1].id] || SAVE.unlockAll; return `<button class="camp${open ? '' : ' locked'}" data-s="${s.id}" ${open ? '' : 'disabled'}><b>${i + 1}. ${s.title}</b><small>${open ? s.place : 'Finish the previous story to unlock'}</small>${SAVE.done[s.id] ? '<em>✓ complete</em>' : ''}</button>`; }).join('') + '</div>'; }).join('');
}
function openStory(s) {
  UI.pending = s; $('storyTitle').textContent = s.title; $('storyPlace').textContent = s.place || '';
  $('storyText').innerHTML = s.intro.map(p => `<p>${p}</p>`).join('') + '<h3>Objectives</h3><ul>' + s.objectives.map(o => `<li>${o.text}</li>`).join('') + '</ul>';
  show('story');
}
function begin(s) {
  SND.init(); const pickC = v => v === 'random' ? ['greek', 'norse', 'irish'][Math.floor(Math.random() * 3)] : v; newGame(s, s.skirmish ? { diff: +($('diff').value || 1), civ: pickC($('skCiv').value), foeCiv: pickC($('skFoe').value) } : { diff: +($('diff').value || 1) });
  const start = G.ents.find(e => e.owner === 1 && (e.kind === 'unit' && UNITS[e.t].hero)) || G.ents.find(e => e.owner === 1 && e.kind === 'bld') || G.ents.find(e => e.owner === 1);
  const c = center(start); centerOn(c.x, c.y); CAM.z = innerWidth < 700 ? .85 : 1;
  G.sel = []; UI.placing = null; UI.power = null; show(null); refreshPanels(true);
  say(s.title + '. ' + (s.objectives[0] ? s.objectives[0].text + '.' : ''), 'gold');
}

/* ---------- top bar, selection and commands ---------- */
const RES_ICON = { food: '🍖', wood: '🪵', gold: '🪙', favor: '⚡' };
function costHTML(c) { return Object.keys(c || {}).map(k => `<span class="${P(1).res[k] < c[k] ? 'short' : ''}">${RES_ICON[k]}${c[k]}</span>`).join(' '); }
let lastSelKey = '', panelT = 0;
function refreshTop() {
  const p = P(1);
  for (const k of ['food', 'wood', 'gold', 'favor']) $('r_' + k).textContent = Math.floor(p.res[k]);
  $('r_pop').textContent = p.pop + '/' + p.cap; $('r_pop').parentNode.classList.toggle('full', p.pop >= p.cap);
  $('r_age').textContent = ageName(1); $('r_time').textContent = fmtTime(G.time);
  const idle = G.ents.filter(e => e.owner === 1 && e.t === 'villager' && e.state === 'idle').length; $('idleN').textContent = idle; $('btnIdle').classList.toggle('on', idle > 0);
  const temple = G.ents.some(e => e.owner === 1 && e.t === 'temple' && e.built >= 1);
  if (!$('godBox').hidden) $('powers').innerHTML = (temple ? '' : `<p class="tip">Build a ${bName('temple', 1)} (${ageName(1, 1)}) to earn favour and call on the gods.</p>`) + powersOf(1).map(k => { const w = POWERS[k], g = godOf(k); return `<button class="pw${UI.power === k ? ' on' : ''}" data-pw="${k}" ${temple && p.res.favor >= w.favor ? '' : 'disabled'} title="${w.info}"><span class="pi">${w.icon}</span><span class="pn"><b>${g.name}</b>${GR.on ? ` <span class="gr">${g.gr}</span>` : ''}<small>${w.name.replace(/^.*?(’|')s? ?/, '')} · ${w.favor} ⚡</small></span></button>`; }).join('');
  $('btnGods').classList.toggle('on', temple && p.res.favor >= 25);
  $('objectives').innerHTML = G.objectives.map(o => `<li class="${o.done ? 'done' : ''} ${o.keep ? 'keep' : ''}">${o.done ? '✓' : o.keep ? '♥' : '○'} ${o.text}</li>`).join('');
}
function refreshPanels(force) {
  const sel = G.sel.filter(e => !e.dead); G.sel = sel;
  const key = sel.map(e => e.id).join(',') + '|' + (sel[0] && sel[0].queue ? sel[0].queue.map(q => (q.unit || q.tech) + Math.floor(q.t)).join() : '') + '|' + P(1).age + '|' + Math.floor(P(1).res.food / 10) + Math.floor(P(1).res.wood / 10) + Math.floor(P(1).res.gold / 10) + (sel[0] ? Math.floor(sel[0].hp) + (sel[0].built || 0).toFixed(2) + (sel[0].carry ? Math.floor(sel[0].carry.amt) : '') + (sel[0].amount | 0) : '');
  if (!force && key === lastSelKey) return; lastSelKey = key;
  const info = $('selInfo'), cmd = $('cmds');
  if (!sel.length) { info.innerHTML = `<div class="hint">${G.scen.title}<br><small>Click or tap to select. Right-click (or tap with something selected) to give orders. Drag to box-select.</small></div>`; cmd.innerHTML = ''; return; }
  const e = sel[0], own = e.owner === 1;
  if (sel.length > 1) {
    const counts = {}; for (const s of sel) counts[s.t] = (counts[s.t] || 0) + 1;
    info.innerHTML = `<div class="multi">${Object.keys(counts).map(t => `<button class="chip" data-only="${t}">${UNITS[t] ? UNITS[t].icon : bIcon(t, sel[0].owner)}<b>${counts[t]}</b><small>${UNITS[t] ? uName(t, sel[0].owner) : bName(t, sel[0].owner)}</small></button>`).join('')}</div>`;
  } else if (e.kind === 'res') {
    info.innerHTML = `<div class="one"><span class="big">${{ tree: '🌳', gold: '🪙', berry: '🫐' }[e.t]}</span><div><b>${grName(e.t === 'gold' ? 'gold' : e.t, { tree: 'Trees', gold: 'Gold mine', berry: 'Berry bushes' }[e.t])}</b><small>${Math.ceil(e.amount)} ${resType(e.t)} left</small></div></div>`;
  } else {
    const D = D_(e); let extra = '';
    if (e.kind === 'unit') { extra = `⚔ ${Math.round(damageFor(e, { kind: 'unit', t: 'hoplite', owner: 2 }) || D.atk)} · 🛡 ${D.armor} · ${D.range > 1.5 ? 'range ' + D.range : 'melee'}`; if (e.carry && e.carry.amt >= 1) extra += ` · carrying ${Math.floor(e.carry.amt)} ${e.carry.type}`; if (e.t === 'perseus') extra += e.mirror ? ' · has Athena\'s shield' : ' · needs Athena\'s shield'; }
    else if (e.built < 1) extra = 'Building… ' + Math.floor(e.built * 100) + '%'; else if (D.atk) extra = `⚔ ${D.atk} · range ${D.range}`;
    const q = e.queue && e.queue.length ? `<div class="queue">${e.queue.map((x, i) => `<button class="qi" data-cancel="${i}" title="Click to cancel">${x.unit ? UNITS[x.unit].icon : TECHS[x.tech].icon}${i === 0 ? `<i style="width:${Math.floor(x.t / x.total * 100)}%"></i>` : ''}</button>`).join('')}</div>` : '';
    info.innerHTML = `<div class="one"><span class="big">${e.kind === 'bld' ? bIcon(e.t, e.owner) : D.icon}</span><div><b>${grName(e.t, e.kind === 'bld' ? bName(e.t, e.owner) : uName(e.t, e.owner), e.owner)}</b>${own || e.owner === 0 ? '' : ` <span class="enemy">${e.owner === 3 ? 'monster' : 'enemy'}</span>`}<div class="hp"><i style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></i><span>${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</span></div><small>${extra}</small><small class="desc">${(e.kind === 'bld' ? bInfo(e.t, e.owner) : D.info) || ''}</small></div></div>${q}`;
  }
  // commands
  let html = '';
  const btn = (attr, icon, label, cost, dis, title, hk) => `<button class="cmd" ${attr} ${dis ? 'disabled' : ''} title="${(title || label).replace(/"/g, '&quot;')}">${hk ? `<kbd>${hk}</kbd>` : ''}<span class="ic">${icon}</span><span class="lb">${label}</span>${cost ? `<span class="co">${costHTML(cost)}</span>` : ''}</button>`;
  const keys = 'QWERTYUOZXCVBNM'.split(''); let ki = 0;
  if (own && sel.every(s => s.kind === 'unit')) {
    const civ = sel.some(s => s.t === 'villager');
    if (civ) for (const b of BUILD_MENU) { const D = BUILDINGS[b], ok = (D.age || 0) <= P(1).age, nm = bName(b, 1); html += btn(`data-build="${b}"`, bIcon(b, 1), nm, D.cost, !ok || !canAfford(1, D.cost), ok ? nm + ': ' + bInfo(b, 1) : nm + ' (needs the ' + ageName(1, D.age) + ')', keys[ki++]); }
    if (sel.some(s => !UNITS[s.t].civ)) html += btn('data-act="amove"', '🎯', 'Attack-move', null, false, 'Move, fighting anything met on the way (A)', 'A');
    if (sel.some(s => s.t === 'trojanhorse')) html += btn('data-act="horse"', '🚪', 'Open the horse', null, false, 'Let the soldiers out', 'Q');
    html += btn('data-act="stop"', '✋', 'Stop', null, false, 'Stop (S)', 'S');
  } else if (own && e.kind === 'bld' && e.built >= 1 && sel.length === 1) {
    const D = BUILDINGS[e.t];
    for (const u of trainsOf(e)) { const U = UNITS[u], ok = (U.age || 0) <= P(1).age, nm = uName(u, 1); html += btn(`data-train="${u}"`, U.icon, nm, U.cost, !ok || !canAfford(1, U.cost), ok ? nm + ': ' + U.info : nm + ' (needs the ' + ageName(1, U.age) + ')', keys[ki++]); }
    for (const t of D.techs || []) { const T = TECHS[t], p = P(1); if (p.techs.has(t) || p.researching.has(t)) continue; if (T.ageUp && T.ageUp !== p.age + 1) continue; const ok = (T.age || 0) <= p.age; html += btn(`data-tech="${t}"`, T.icon, T.name, T.cost, !ok || !canAfford(1, T.cost), T.name + ': ' + T.info, keys[ki++]); }
    if (trainsOf(e).length) html += `<p class="tip">Right-click the ground (or a resource) to set a rally point.</p>`;
  }
  cmd.innerHTML = html;
}

/* ---------- selection helpers ---------- */
function pickAt(sx, sy) {
  const w = toWorld(sx, sy); let best = null, bd = 1e9;
  for (const e of G.ents) {
    if (e.kind !== 'unit') continue; const i = Math.floor(e.y) * G.n + Math.floor(e.x); if (!G.vis[i] && e.owner !== 1) continue;
    const [px, py] = toScreen(e.x, e.y), big = UNITS[e.t].myth ? 2.4 : UNITS[e.t].hero ? 1.3 : 1, dx = sx - px, dy = sy - (py - 14 * big * CAM.z), d = Math.hypot(dx, dy);
    if (d < 18 * big * CAM.z && d < bd) { bd = d; best = e; }
  }
  if (best) return best;
  const tx = Math.floor(w.x), ty = Math.floor(w.y);
  // buildings are tall: also test a couple of tiles "behind" the click
  for (const [dx, dy] of [[0, 0], [1, 1], [2, 2], [1, 0], [0, 1]]) {
    const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= G.n || y >= G.n || !G.exp[y * G.n + x]) continue;
    const id = G.occ[y * G.n + x]; if (id) { const e = G.byId.get(id); if (e && (e.kind === 'bld' || (dx === 0 && dy === 0))) return e; }
  }
  for (const e of G.ents) if (e.kind === 'bld' && BUILDINGS[e.t].farm && tx >= e.x && tx < e.x + e.size && ty >= e.y && ty < e.y + e.size) return e;
  return null;
}
function selectBox(b, add) {
  const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
  let got = G.ents.filter(e => e.kind === 'unit' && e.owner === 1 && (() => { const [px, py] = toScreen(e.x, e.y); return px >= x0 && px <= x1 && py - 10 >= y0 - 10 && py - 10 <= y1; })());
  if (got.some(e => !UNITS[e.t].civ)) got = got.filter(e => !UNITS[e.t].civ || UNITS[e.t].hero);
  G.sel = add ? [...new Set(G.sel.concat(got))] : got; refreshPanels(true);
}
function selectOne(e, add) {
  if (!e) { if (!add) G.sel = []; refreshPanels(true); return; }
  if (add && e.owner === 1 && e.kind === 'unit') { const i = G.sel.indexOf(e); if (i >= 0) G.sel.splice(i, 1); else G.sel.push(e); }
  else G.sel = [e];
  if (e.owner === 1 && e.kind === 'unit') speak(e, 'select');
  SND.click(); refreshPanels(true);
}
function command(sx, sy) {
  const w = toWorld(sx, sy), ent = pickAt(sx, sy), mine = G.sel.filter(e => e.owner === 1);
  if (!mine.length) return false;
  if (mine.length === 1 && mine[0].kind === 'bld') { const b = mine[0]; b.rally = { x: w.x, y: w.y, res: ent && ent.kind === 'res' ? ent.id : null }; UI.marks.push({ x: w.x, y: w.y, t: performance.now(), col: '#ffe066' }); return true; }
  if (UI.attackMove) { UI.attackMove = false; order(mine.filter(e => e.kind === 'unit'), 'move', w, { attackMove: true }); UI.marks.push({ x: w.x, y: w.y, t: performance.now(), col: '#ff6a5a' }); return true; }
  const r = smartOrder(mine, w.x, w.y, ent && !(ent.kind === 'unit' && ent.owner === 1) ? ent : null);
  const talker = mine.find(u => u.kind === 'unit'); if (talker) speak(talker, r === 'attack' ? 'attack' : r === 'gather' ? 'work' : r === 'build' ? 'build' : 'move');
  UI.marks.push({ x: ent ? center(ent).x : w.x, y: ent ? center(ent).y : w.y, t: performance.now(), col: r === 'attack' ? '#ff5a5a' : r === 'gather' || r === 'build' ? '#ffe066' : '#7dff7d' });
  return true;
}
function tryPlace() {
  const g = UI.ghostAt; if (!g || !g.ok) { UI.toast('Can\'t build there.', 'warn'); return false; }
  const vills = G.sel.filter(e => e.owner === 1 && e.t === 'villager');
  const b = placeBuilding(1, UI.placing, g.x, g.y, vills); if (!b) { UI.toast('Not enough resources.', 'warn'); return false; }
  SND.click(); return true;
}

/* ---------- input: mouse, touch, keys ---------- */
const view = $('world');
const ptrs = new Map(); let gesture = null, lastTap = { t: 0, id: null };
view.addEventListener('contextmenu', e => e.preventDefault());
view.addEventListener('pointerdown', e => {
  SND.init(); view.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY, t: performance.now(), type: e.pointerType, button: e.button });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { pinch: Math.hypot(a.x - b.x, a.y - b.y), z: CAM.z }; UI.box = null; return; }
  if (e.pointerType === 'mouse' && e.button === 1) { gesture = { pan: true }; return; }
  if (e.pointerType !== 'mouse') { gesture = { touch: true }; clearTimeout(gesture.lp); const id = e.pointerId; gesture.lp = setTimeout(() => { const p = ptrs.get(id); if (p && Math.hypot(p.x - p.x0, p.y - p.y0) < 10 && G && !UI.placing) { gesture.boxMode = true; UI.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; navigator.vibrate && navigator.vibrate(15); } }, 420); }
  else gesture = { mouse: true };
});
view.addEventListener('pointermove', e => {
  UI.mouse = { x: e.offsetX, y: e.offsetY };
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.offsetX - p.x, dy = e.offsetY - p.y; p.x = e.offsetX; p.y = e.offsetY;
  if (!gesture) return;
  if (gesture.pinch != null && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; CAM.z = clamp(gesture.z * Math.hypot(a.x - b.x, a.y - b.y) / gesture.pinch, .5, 1.8); CAM.x -= dx / CAM.z / 2; CAM.y -= dy / CAM.z / 2; return; }
  if (gesture.pan || (gesture.touch && !gesture.boxMode && Math.hypot(p.x - p.x0, p.y - p.y0) > 10)) { CAM.x -= dx / CAM.z; CAM.y -= dy / CAM.z; gesture.moved = true; return; }
  if ((gesture.mouse && p.button === 0 && !UI.placing && !UI.power && Math.hypot(p.x - p.x0, p.y - p.y0) > 6) || gesture.boxMode) { UI.box = { x0: p.x0, y0: p.y0, x1: p.x, y1: p.y }; }
});
function endPtr(e) {
  const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!p || !G) return;
  if (gesture && gesture.lp) clearTimeout(gesture.lp);
  if (gesture && gesture.pinch != null) { if (!ptrs.size) gesture = null; return; }
  const moved = Math.hypot(p.x - p.x0, p.y - p.y0) > (p.type === 'mouse' ? 6 : 10);
  if (UI.box) { selectBox(UI.box, e.shiftKey); UI.box = null; gesture = null; return; }
  if (gesture && (gesture.pan || gesture.moved)) { gesture = null; return; }
  gesture = null; if (moved) return;
  const sx = p.x, sy = p.y;
  if (UI.power) { const w = toWorld(sx, sy); if (usePower(1, UI.power, w.x, w.y)) UI.power = null; return; }
  if (UI.placing) { if (p.button === 2) { UI.placing = null; return; } if (tryPlace() && !e.shiftKey) UI.placing = null; return; }
  if (p.type === 'mouse') {
    if (p.button === 2) { command(sx, sy); return; }
    if (UI.attackMove) { command(sx, sy); return; }
    const ent = pickAt(sx, sy), now = performance.now();
    if (ent && ent.kind === 'unit' && ent.owner === 1 && lastTap.id === ent.t && now - lastTap.t < 350) { // double-click: all of that kind on screen
      G.sel = G.ents.filter(x => x.kind === 'unit' && x.owner === 1 && x.t === ent.t && (() => { const [a, b] = toScreen(x.x, x.y); return a > 0 && b > 0 && a < VW && b < VH; })()); refreshPanels(true); lastTap = { t: 0 }; return;
    }
    lastTap = { t: now, id: ent && ent.t }; selectOne(ent, e.shiftKey); return;
  }
  // touch: tap on your own thing selects it; tap elsewhere with your units selected gives an order
  const ent = pickAt(sx, sy), hasOwn = G.sel.some(x => x.owner === 1);
  if (UI.attackMove) { command(sx, sy); return; }
  if (ent && ent.owner === 1 && (ent.kind === 'unit' || !hasOwn || G.sel[0].kind === 'bld' || ent.built < 1 || BUILDINGS[ent.t].drop || BUILDINGS[ent.t].farm) && !(hasOwn && G.sel.some(x => x.t === 'villager') && ent.kind === 'bld' && (ent.built < 1 || BUILDINGS[ent.t].farm))) { selectOne(ent, false); return; }
  if (hasOwn) { command(sx, sy); return; }
  selectOne(ent, false);
}
view.addEventListener('pointerup', endPtr); view.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); gesture = null; UI.box = null; });
view.addEventListener('pointerleave', () => { UI.mouse = null; });
view.addEventListener('wheel', e => { e.preventDefault(); const w0 = toWorld(e.offsetX, e.offsetY); CAM.z = clamp(CAM.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), .5, 1.8); const w1 = toWorld(e.offsetX, e.offsetY); const a = proj(w0.x, w0.y), b = proj(w1.x, w1.y); CAM.x += a[0] - b[0]; CAM.y += a[1] - b[1]; }, { passive: false });
const KEYS = {};
addEventListener('keydown', e => {
  if (!G || $('hud').hidden) { if (e.code === 'Escape' && !$('pause').hidden) togglePause(); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Enter' || e.code === 'NumpadEnter') { $('chat').hidden = false; $('chatIn').focus(); e.preventDefault(); return; }
  KEYS[e.code] = true;
  if (e.code === 'Escape' && !$('codex').hidden) { closeCodex(); return; }
  if (e.code === 'Escape' && !$('godBox').hidden) { $('godBox').hidden = true; return; }
  if (e.code === 'Escape') { if (UI.placing || UI.power || UI.attackMove) { UI.placing = null; UI.power = null; UI.attackMove = false; } else if (G.sel.length) { G.sel = []; refreshPanels(true); } else togglePause(); return; }
  if (e.code === 'KeyP' || e.code === 'F10') { togglePause(); return; }
  if (e.code === 'Period') { selectIdle(); return; }
  if (e.code === 'KeyH') { const a = G.ents.find(x => x.owner === 1 && x.kind === 'bld' && (x.t === 'agora' || x.t === 'argo')); if (a) { selectOne(a); const c = center(a); centerOn(c.x, c.y); } return; }
  if (e.code === 'Space' && G.alertAt) { centerOn(G.alertAt.x, G.alertAt.y); e.preventDefault(); return; }
  if (/^Digit[1-9]$/.test(e.code)) { const k = e.code.slice(5); if (e.ctrlKey || e.metaKey) { UI.groups[k] = G.sel.filter(x => x.owner === 1).map(x => x.id); e.preventDefault(); UI.toast('Group ' + k + ' set.'); } else if (UI.groups[k]) { G.sel = UI.groups[k].map(id => G.byId.get(id)).filter(Boolean); refreshPanels(true); } return; }
  if (e.code === 'KeyA' && G.sel.some(x => x.owner === 1 && x.kind === 'unit' && !UNITS[x.t].civ)) { UI.attackMove = true; UI.toast('Attack-move: click where to go.'); return; }
  if (e.code === 'KeyS' && !e.ctrlKey) { for (const u of G.sel) if (u.owner === 1 && u.kind === 'unit') { u.state = 'idle'; u.path = null; u.target = null; } return; }
  // command hotkeys
  const kb = $('cmds').querySelector(`kbd:not(:empty)`) && [...$('cmds').querySelectorAll('button.cmd')].find(b => b.querySelector('kbd') && b.querySelector('kbd').textContent === e.key.toUpperCase());
  if (kb && !kb.disabled) { kb.click(); return; }
  if (e.code === 'Delete' && G.sel.length === 1 && G.sel[0].owner === 1) { kill(G.sel[0], null); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
function selectIdle() { const idle = G.ents.filter(x => x.owner === 1 && x.t === 'villager' && x.state === 'idle'); if (!idle.length) return; UI.idleI = ((UI.idleI || 0) + 1) % idle.length; const v = idle[UI.idleI]; selectOne(v); centerOn(v.x, v.y); }
function togglePause() { if (!G) return; if ($('pause').hidden) { G.paused = true; show('pause'); $('hud').hidden = false; } else { G.paused = false; show(null); } }

// panel clicks
$('cmds').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; SND.click();
  const sel = G.sel;
  if (b.dataset.build) { UI.placing = b.dataset.build; UI.power = null; if (!UI.mouse) UI.mouse = { x: VW / 2, y: VH / 2 }; UI.toast('Click (or tap) where to build. Right-click or Esc to cancel.'); }
  else if (b.dataset.train) { const ok = queueTrain(sel[0], b.dataset.train); if (!ok && !canAfford(1, UNITS[b.dataset.train].cost)) UI.toast('Not enough resources.', 'warn'); }
  else if (b.dataset.tech) queueTech(sel[0], b.dataset.tech);
  else if (b.dataset.act === 'stop') for (const u of sel) if (u.owner === 1 && u.kind === 'unit') { u.state = 'idle'; u.path = null; u.target = null; }
  else if (b.dataset.act === 'horse') { for (const h of sel.filter(s => s.t === 'trojanhorse')) openHorse(h); G.sel = []; }
  else if (b.dataset.act === 'amove') { UI.attackMove = true; UI.toast('Attack-move: click or tap where to go.'); }
  refreshPanels(true);
});
$('selInfo').addEventListener('click', e => {
  const c = e.target.closest('[data-cancel]'); if (c) { cancelQueue(G.sel[0], +c.dataset.cancel); refreshPanels(true); return; }
  const o = e.target.closest('[data-only]'); if (o) { G.sel = G.sel.filter(x => x.t === o.dataset.only); refreshPanels(true); }
});
$('powers').addEventListener('click', e => { const b = e.target.closest('[data-pw]'); if (!b || b.disabled) return; const k = b.dataset.pw; $('godBox').hidden = true; if (POWERS[k].target) { UI.power = UI.power === k ? null : k; UI.placing = null; if (UI.power) UI.toast(POWERS[k].name + ': choose where.'); } else usePower(1, k); refreshTop(); });
$('btnGods').addEventListener('click', () => { $('godBox').hidden = !$('godBox').hidden; refreshTop(); });
$('btnCodex').addEventListener('click', () => openCodex()); $('btnCodexM').addEventListener('click', () => openCodex()); $('codexClose').addEventListener('click', closeCodex);
$('codexTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) openCodex(b.dataset.tab); });
$('codexBody').addEventListener('click', e => { const b = e.target.closest('[data-myth]'); if (b) { UI.codexMyth = b.dataset.myth; openCodex(UI.codexTab); } });
function setGreek(on) { GR.on = on; try { localStorage.setItem('hh-greek', on ? '1' : '0'); } catch (e) { } $('greekM').checked = $('greekP').checked = on; if (G) refreshPanels(true); }
$('greekM').addEventListener('change', e => setGreek(e.target.checked)); $('greekP').addEventListener('change', e => setGreek(e.target.checked)); setGreek(GR.on);
$('chat').addEventListener('submit', e => { e.preventDefault(); const t = $('chatIn').value; $('chatIn').value = ''; $('chat').hidden = true; if (G && t.trim()) runCheat(t); view.focus && view.focus(); });
$('chatIn').addEventListener('keydown', e => { if (e.key === 'Escape') { $('chat').hidden = true; $('chatIn').value = ''; } e.stopPropagation(); });
$('btnIdle').addEventListener('click', selectIdle);
$('btnArmy').addEventListener('click', () => { G.sel = G.ents.filter(x => x.owner === 1 && x.kind === 'unit' && (!UNITS[x.t].civ || UNITS[x.t].hero) && x.t !== 'ariadne'); refreshPanels(true); if (G.sel[0]) { const h = G.sel.find(x => UNITS[x.t].hero) || G.sel[0]; centerOn(h.x, h.y); } });
$('btnMenu').addEventListener('click', togglePause);
$('btnObj').addEventListener('click', () => $('objBox').classList.toggle('open'));
mm.addEventListener('pointerdown', e => { if (!G) return; const r = mm.getBoundingClientRect(), w = minimapToWorld((e.clientX - r.left) / r.width * MM.size, (e.clientY - r.top) / r.height * (MM.size / 2 + 6)); if (e.button === 2) { order(G.sel.filter(x => x.owner === 1 && x.kind === 'unit'), 'move', w); return; } centerOn(w.x, w.y); mm.setPointerCapture(e.pointerId); mm._drag = true; });
mm.addEventListener('pointermove', e => { if (!mm._drag) return; const r = mm.getBoundingClientRect(), w = minimapToWorld((e.clientX - r.left) / r.width * MM.size, (e.clientY - r.top) / r.height * (MM.size / 2 + 6)); centerOn(w.x, w.y); });
mm.addEventListener('pointerup', () => { mm._drag = false; }); mm.addEventListener('contextmenu', e => e.preventDefault());

// menu buttons
$('campList').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) openStory(CAMPAIGN.find(s => s.id === b.dataset.s)); });
$('btnSkirmish').addEventListener('click', () => openStory(SKIRMISH));
$('btnHelp').addEventListener('click', () => show('help')); $('helpBack').addEventListener('click', () => show('menu'));
$('storyBack').addEventListener('click', () => { buildMenu(); show('menu'); });
$('storyGo').addEventListener('click', () => begin(UI.pending));
$('endMenu').addEventListener('click', () => { G = null; buildMenu(); show('menu'); });
$('endRetry').addEventListener('click', () => openStory(G.scen));
$('endNext').addEventListener('click', () => openStory(nextScen(G.scen)));
$('pResume').addEventListener('click', togglePause);
$('pRestart').addEventListener('click', () => { const s = G.scen; G.paused = false; begin(s); });
$('pQuit').addEventListener('click', () => { G = null; buildMenu(); show('menu'); });
$('pSpeed').addEventListener('change', e => { if (G) G.speed = +e.target.value; });

/* ---------- main loop ---------- */
let lastT = 0, mmT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000 || 0); lastT = now;
  if (VW !== view.clientWidth || VH !== view.clientHeight) resizeView();
  if (G && !G.paused && G.state === 'play') {
    const sdt = dt * (G.speed || 1); let left = sdt; while (left > 0) { const h = Math.min(left, 1 / 30); step(h); left -= h; }
    // keyboard and edge scrolling
    const sp = 700 * dt / CAM.z; let mx = 0, my = 0;
    if (KEYS.ArrowLeft || KEYS.KeyJ) mx -= 1; if (KEYS.ArrowRight || KEYS.KeyL) mx += 1; if (KEYS.ArrowUp || KEYS.KeyI) my -= 1; if (KEYS.ArrowDown || KEYS.KeyK) my += 1;
    if (UI.mouse && !ptrs.size && matchMedia('(pointer: fine)').matches && document.hasFocus()) { if (UI.mouse.x < 8) mx -= 1; if (UI.mouse.x > VW - 8) mx += 1; if (UI.mouse.y < 8) my -= 1; if (UI.mouse.y > VH - 8) my += 1; }
    CAM.x += mx * sp; CAM.y += my * sp;
    const [ax, ay] = proj(0, 0), [bx] = proj(G.n, 0), [cx] = proj(0, G.n), [, dy] = proj(G.n, G.n); CAM.x = clamp(CAM.x, cx, bx); CAM.y = clamp(CAM.y, ay, dy);
    SND.lyre(dt);
    UI.factT = (UI.factT == null ? 120 : UI.factT) - dt * (G.speed || 1); if (UI.factT <= 0) { UI.factT = 170; const FF = (MYTH[civOf(1)] || MYTH.greek).facts; UI.factI = ((UI.factI == null ? Math.floor(Math.random() * FF.length) : UI.factI) + 1) % FF.length; UI.toast('📖 Did you know? ' + FF[UI.factI], ''); }
  }
  drawWorld();
  if (G) {
    mmT -= dt; if (mmT <= 0) { mmT = .3; drawMinimap(); refreshTop(); }
    panelT -= dt; if (panelT <= 0) { panelT = .2; refreshPanels(); }
    UI.marks = UI.marks.filter(m => performance.now() - m.t < 600);
    view.style.cursor = UI.placing || UI.power ? 'crosshair' : UI.attackMove ? 'crosshair' : 'default';
  }
}
resizeView(); buildMenu(); show('menu'); requestAnimationFrame(frame);
window.HH = { get G() { return G; }, begin, CAMPAIGN, SKIRMISH, CAM, centerOn };
