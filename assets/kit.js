/* Plutarch's Games: small helpers shared by the games made on this site.
   Kit.store (localStorage that never throws), Kit.toast, Kit.modal, Kit.sfx (tiny synth), Kit.rng (seeded), Kit.theme. */
(function (W) {
  'use strict';
  var D = W.document;
  var Kit = {};
  Kit.store = {
    get: function (k, d) { try { var v = W.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { W.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  Kit.$ = function (s, r) { return (r || D).querySelector(s); };
  Kit.$$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  Kit.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  Kit.toast = function (html, bad, ms) {
    var box = Kit.$('.ktoasts'); if (!box) { box = D.createElement('div'); box.className = 'ktoasts'; D.body.appendChild(box); }
    var t = D.createElement('div'); t.className = 'ktoast' + (bad ? ' bad' : ''); t.innerHTML = html; box.appendChild(t);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { t.classList.add('out'); }, ms || 2600); setTimeout(function () { t.remove(); }, (ms || 2600) + 700);
  };
  // Kit.modal(html, {onClose}) shows a card over the page; buttons with data-close close it. Returns the element.
  Kit.modal = function (html, opt) {
    Kit.closeModal();
    var m = D.createElement('div'); m.className = 'kmodal'; m.innerHTML = '<div class="card" role="dialog" aria-modal="true">' + html + '</div>';
    D.body.appendChild(m); Kit._m = m; Kit._mo = opt || {};
    m.addEventListener('click', function (e) { if (e.target === m && !(opt && opt.sticky)) Kit.closeModal(); var c = e.target.closest('[data-close]'); if (c) Kit.closeModal(); });
    return m;
  };
  Kit.closeModal = function () { if (Kit._m) { var o = Kit._mo; Kit._m.remove(); Kit._m = null; if (o && o.onClose) o.onClose(); } };
  Kit.rng = function (seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  Kit.hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  Kit.today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  Kit.fmtTime = function (s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  // a tiny synth for clicks, chimes and thuds
  Kit.sfx = {
    ctx: null, on: Kit.store.get('pg-sound', true),
    init: function () { if (this.ctx || !this.on) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (W.AudioContext || W.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = .35; this.out.connect(this.ctx.destination); } catch (e) { } },
    tone: function (f, d, v, type, delay, slide) { if (!this.ctx || !this.on) return; var t = this.ctx.currentTime + (delay || 0), o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v || .1, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + .05); },
    noise: function (d, v, f) { if (!this.ctx || !this.on) return; var n = this.ctx.createBufferSource(), b = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * d), this.ctx.sampleRate), a = b.getChannelData(0); for (var i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 2); n.buffer = b; var fl = this.ctx.createBiquadFilter(); fl.frequency.value = f || 1200; var g = this.ctx.createGain(); g.gain.value = v || .15; n.connect(fl); fl.connect(g); g.connect(this.out); n.start(); },
    click: function () { this.tone(880, .05, .05, 'square'); },
    good: function () { this.tone(660, .12, .08); this.tone(990, .18, .08, 'triangle', .08); },
    bad: function () { this.tone(220, .25, .1, 'sawtooth', 0, 140); },
    win: function () { var s = this;[523, 659, 784, 1047, 1319].forEach(function (f, i) { s.tone(f, .4, .09, 'triangle', i * .12); }); },
    hit: function () { this.noise(.12, .14, 1600); },
    boom: function () { this.noise(.5, .25, 400); },
    toggle: function () { this.on = !this.on; Kit.store.set('pg-sound', this.on); if (this.on) this.init(); return this.on; }
  };
  D.addEventListener('pointerdown', function () { Kit.sfx.init(); }, { once: false, passive: true });
  // light/dark, shared with the rest of the site
  Kit.theme = function () { var d = D.documentElement, saved = Kit.store.get('pg-theme-k', null); try { saved = W.localStorage.getItem('pg-theme'); } catch (e) { } d.dataset.theme = saved || (W.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
  Kit.toggleTheme = function () { var d = D.documentElement, n = d.dataset.theme === 'dark' ? 'light' : 'dark'; d.dataset.theme = n; try { W.localStorage.setItem('pg-theme', n); } catch (e) { } };
  Kit.theme();
  // standard top bar: Kit.bar('Title', [['id','label','title'], ...])
  Kit.bar = function (title, buttons) {
    var b = D.createElement('header'); b.className = 'kbar';
    b.innerHTML = '<a class="home" href="/" title="All games"><i>Π</i><span>Plutarch\'s Games</span></a><h1>' + title + '</h1><div class="sp"></div>' +
      (buttons || []).map(function (x) { return '<button type="button" id="' + x[0] + '" title="' + (x[2] || x[1]) + '">' + x[1] + '</button>'; }).join('') +
      '<button type="button" id="k-theme" title="Light or dark">◐</button>';
    D.body.insertBefore(b, D.body.firstChild);
    Kit.$('#k-theme').onclick = Kit.toggleTheme;
    return b;
  };
  W.Kit = Kit;
})(window);
