/* Switch 2 Pro Controller over USB-C, right in the browser (Chrome, Edge, Brave: anything with WebUSB and WebHID).
   macOS has no driver for this controller: it stays silent until it is sent a vendor "wake-up" handshake on its
   USB interface 1. This file sends that handshake with WebUSB, reads the controller's reports with WebHID, and
   hands games an ordinary "standard" gamepad through navigator.getGamepads(), so any game that already supports
   gamepads works unchanged. Handshake bytes and report layouts from the open-source switch2pro-bridge project.
   The browser asks permission twice the first time (USB, then HID); after that it reconnects by itself. */
(function (W, D) {
  'use strict';
  if (W.ProCon2) return;
  var VID = 0x057e, PIDS = [0x2069]; // Switch 2 Pro Controller
  var CMDS = [
    [0x03, 0x91, 0x00, 0x0D, 0x00, 0x08, 0x00, 0x00, 0x01, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], // init
    [0x09, 0x91, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // player 1 light
    [0x0C, 0x91, 0x00, 0x02, 0x00, 0x04, 0x00, 0x00, 0x27, 0x00, 0x00, 0x00],
    [0x0C, 0x91, 0x00, 0x04, 0x00, 0x04, 0x00, 0x00, 0x27, 0x00, 0x00, 0x00]
  ];
  var SELECT_COMMON = [0x03, 0x91, 0x00, 0x0A, 0x00, 0x04, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00]; // full 0x05 reports
  // bits of the 32-bit button word in the 0x05 report
  var B = { Y: 1 << 0, X: 1 << 1, B: 1 << 2, A: 1 << 3, R: 1 << 6, ZR: 1 << 7, MINUS: 1 << 8, PLUS: 1 << 9, RS: 1 << 10, LS: 1 << 11, HOME: 1 << 12, CAP: 1 << 13, C: 1 << 14,
    DOWN: 1 << 16, UP: 1 << 17, RIGHT: 1 << 18, LEFT: 1 << 19, L: 1 << 22, ZL: 1 << 23 };

  var P = W.ProCon2 = { usb: null, hid: null, ready: false, woke: false, state: null, last: 0 };
  var center = null, calib = [], hidAt = 0, commonSent = false;

  function filters() { return PIDS.map(function (p) { return { vendorId: VID, productId: p }; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- 1. wake it up over USB ---------- */
  async function wake(dev, extra) {
    if (!dev.opened) await dev.open();
    if (!dev.configuration) await dev.selectConfiguration(1);
    var itf = dev.configuration.interfaces.find(function (i) { return i.interfaceNumber === 1; });
    if (!itf) throw new Error('This controller has no USB interface 1.');
    if (!itf.claimed) await dev.claimInterface(1);
    var alt = itf.alternate || itf.alternates[0];
    var out = alt.endpoints.find(function (e) { return e.direction === 'out'; }), inn = alt.endpoints.find(function (e) { return e.direction === 'in'; });
    var list = extra ? [extra] : CMDS;
    for (var k = 0; k < list.length; k++) {
      var r = await dev.transferOut(out ? out.endpointNumber : 2, new Uint8Array(list[k]));
      if (r.status !== 'ok') { try { await dev.clearHalt('out', out ? out.endpointNumber : 2); } catch (e) { } throw new Error('The controller did not accept the wake-up message (' + r.status + ').'); }
      if (inn) dev.transferIn(inn.endpointNumber, 64).catch(function () { }); // drain its reply
      await sleep(25);
    }
    P.usb = dev; P.woke = true;
  }

  /* ---------- 2. read it over HID ---------- */
  function u12(dv, o) { var v = dv.getUint8(o) | (dv.getUint8(o + 1) << 8) | (dv.getUint8(o + 2) << 16); return [v & 0xfff, (v >> 12) & 0xfff]; }
  function onReport(ev) {
    var dv = ev.data, id = ev.reportId, btn = 0, ls, rs;
    if (id === 0x05 && dv.byteLength >= 16) { btn = dv.getUint32(4, true); ls = u12(dv, 10); rs = u12(dv, 13); }
    else if (id === 0x09 && dv.byteLength >= 11) {
      var b0 = dv.getUint8(2), b1 = dv.getUint8(3), b2 = dv.getUint8(4);
      if (b0 & 1) btn |= B.Y; if (b0 & 2) btn |= B.X; if (b0 & 4) btn |= B.B; if (b0 & 8) btn |= B.A; if (b0 & 0x40) btn |= B.R; if (b0 & 0x80) btn |= B.ZR;
      if (b1 & 1) btn |= B.MINUS; if (b1 & 2) btn |= B.PLUS; if (b1 & 4) btn |= B.RS; if (b1 & 8) btn |= B.LS; if (b1 & 0x10) btn |= B.HOME; if (b1 & 0x20) btn |= B.CAP;
      if (b2 & 1) btn |= B.DOWN; if (b2 & 2) btn |= B.UP; if (b2 & 4) btn |= B.RIGHT; if (b2 & 8) btn |= B.LEFT; if (b2 & 0x40) btn |= B.L; if (b2 & 0x80) btn |= B.ZL;
      ls = u12(dv, 5); rs = u12(dv, 8);
    } else return;
    // learn where the sticks rest (they are rarely exactly at 2048)
    if (!center) { calib.push([ls[0], ls[1], rs[0], rs[1]]); if (calib.length >= 8) { var c = [0, 0, 0, 0]; calib.forEach(function (s) { for (var i = 0; i < 4; i++) c[i] += s[i] / calib.length; }); center = c.map(function (v) { return Math.abs(v - 2048) < 400 ? v : 2048; }); } }
    var cc = center || [2048, 2048, 2048, 2048];
    P.state = { btn: btn, ax: [axis(ls[0], cc[0]), -axis(ls[1], cc[1]), axis(rs[0], cc[2]), -axis(rs[1], cc[3])] };
    P.last = performance.now();
    if (!P.ready) { P.ready = true; say('🎮 Switch 2 Pro Controller ready. Have fun!'); ui(); }
  }
  function axis(v, c) { var d = (v - c) / 1500; if (Math.abs(d) < 0.1) return 0; d = Math.sign(d) * (Math.abs(d) - 0.1) / 0.9; return Math.max(-1, Math.min(1, d)); }
  async function listen(dev) {
    if (!dev.opened) await dev.open();
    dev.removeEventListener('inputreport', onReport); dev.addEventListener('inputreport', onReport);
    P.hid = dev; hidAt = performance.now();
    // if nothing arrives, ask the controller for its full report format instead
    setTimeout(function () { if (!P.ready && P.usb && !commonSent) { commonSent = true; wake(P.usb, SELECT_COMMON).catch(function () { }); } }, 1500);
    ui();
  }

  /* ---------- the gamepad games see ---------- */
  var realGet = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : function () { return []; };
  function mine(g) { return g && /057e/i.test(g.id) && /2069/i.test(g.id); }
  function pad() {
    var s = P.state, b = s.btn, on = function (m) { var p = !!(b & m); return { pressed: p, touched: p, value: p ? 1 : 0 }; };
    // standard layout by position: 0 bottom (B), 1 right (A), 2 left (Y), 3 top (X)
    return { id: 'Nintendo Switch 2 Pro Controller (USB) (Vendor: 057e Product: 2069)', index: 0, connected: true, mapping: 'standard', timestamp: P.last,
      buttons: [on(B.B), on(B.A), on(B.Y), on(B.X), on(B.L), on(B.R), on(B.ZL), on(B.ZR), on(B.MINUS), on(B.PLUS), on(B.LS), on(B.RS), on(B.UP), on(B.DOWN), on(B.LEFT), on(B.RIGHT), on(B.HOME)],
      axes: s.ax.slice(), vibrationActuator: null };
  }
  navigator.getGamepads = function () {
    var real = Array.prototype.slice.call(realGet() || []);
    if (!P.ready || !P.state || performance.now() - P.last > 2000) return real;
    var out = [pad()]; real.forEach(function (g) { if (g && !mine(g)) out.push(g); });
    return out;
  };

  /* ---------- a small connect button ---------- */
  var btnEl = null, tipEl = null;
  function say(t) {
    if (!tipEl) { tipEl = D.createElement('div'); tipEl.style.cssText = 'position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:99999;background:#12251b;color:#f3dfa3;font:600 14px system-ui,sans-serif;padding:10px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:min(92vw,560px);text-align:center;transition:opacity .3s'; D.body.appendChild(tipEl); }
    tipEl.textContent = t; tipEl.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(function () { tipEl.style.opacity = 0; }, 5200);
  }
  function ui() {
    if (!D.body) return;
    if (!btnEl) {
      btnEl = D.createElement('button'); btnEl.type = 'button';
      btnEl.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;border:1px solid rgba(243,223,163,.5);background:rgba(18,37,27,.92);color:#f3dfa3;font:600 13px system-ui,sans-serif;padding:8px 12px;border-radius:999px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3)';
      btnEl.onclick = connect; D.body.appendChild(btnEl);
    }
    btnEl.hidden = P.ready;
    btnEl.textContent = !P.woke ? '🎮 Connect Switch 2 controller (USB)' : !P.hid ? '🎮 Step 2 of 2: finish connecting' : '🎮 Waiting for the controller…';
  }
  async function connect() {
    if (!navigator.usb || !navigator.hid) { say('This browser cannot talk to USB controllers. Use Chrome or Edge (in Brave, allow "USB devices" and "HID devices" in Settings → Privacy → Site settings).'); return; }
    try {
      if (!P.woke) {
        var dev = await navigator.usb.requestDevice({ filters: filters() });
        await wake(dev); ui();
        // the second permission needs a fresh click in some browsers; try straight away, else the button asks
        try { var h = await navigator.hid.requestDevice({ filters: filters() }); if (h && h[0]) await listen(h[0]); } catch (e) { }
        if (!P.hid) say('Nearly there: click the button once more and choose the controller again.');
        return;
      }
      if (!P.hid) { var hs = await navigator.hid.requestDevice({ filters: filters() }); if (hs && hs[0]) await listen(hs[0]); return; }
      say('Press any button on the controller. If nothing happens, unplug it, plug it back in and reload the page.');
    } catch (e) {
      if (e && e.name === 'NotFoundError') return; // closed the chooser
      say((e && e.message) || 'Could not connect the controller.');
      if (e && /claim|access|SecurityError/i.test(e.message + e.name)) say('Another app is using the controller (Steam?). Quit it, unplug and replug, then try again.');
    }
  }

  /* ---------- reconnect by itself once allowed ---------- */
  async function auto() {
    try {
      if (navigator.usb) { var us = await navigator.usb.getDevices(); var u = us.find(function (d) { return d.vendorId === VID && PIDS.indexOf(d.productId) >= 0; }); if (u) await wake(u); }
      if (navigator.hid) { var hs = await navigator.hid.getDevices(); var h = hs.find(function (d) { return d.vendorId === VID && PIDS.indexOf(d.productId) >= 0; }); if (h && P.woke) await listen(h); }
    } catch (e) { }
    ui();
  }
  if (navigator.usb) navigator.usb.addEventListener('connect', function (e) { if (e.device.vendorId === VID) { P.woke = false; P.ready = false; P.hid = null; center = null; calib = []; commonSent = false; setTimeout(auto, 400); } });
  if (navigator.usb) navigator.usb.addEventListener('disconnect', function (e) { if (e.device === P.usb) { P.usb = null; P.woke = false; P.ready = false; P.hid = null; center = null; calib = []; ui(); } });
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', auto); else auto();
})(window, document);
