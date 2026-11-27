/* sma-ljud.js – ett mycket tyst "pet" när ett tryck inte låter något alls.
 *
 * Apparna har ljud för rätt, fel och stjärna. Men de allra minsta sakerna kan
 * vara tysta: en bricka som lyfts, en sida som byts, en knapp som inte gör
 * något särskilt – och då känns appen stum under fingret, särskilt för ett barn
 * som trycker på allt.
 *
 * Filen lyssnar därför på om appen själv startar ett ljud inom 220 ms efter ett
 * tryck (oscillator, ljudfil eller röst). Låter appen – då gör vi ingenting.
 * Låter den inte – då kommer ett mjukt träklapp, volym 0.02, kort som ett finger
 * mot en bricka. Ingen app behöver ändras och inget ljud spelas dubbelt.
 *
 * Egna ljud går också att be om: __sma('plock' | 'plats' | 'stjarna' | 'knapp' | 'pet')
 */
(function () {
  'use strict';

  var aktx = null;
  var horde = false;      /* spelade appen något själv? */
  var varaEgna = false;   /* vi spelar – räkna inte det som appens ljud */
  var senast = 0;

  function ctx() {
    if (!aktx) {
      var T = window.AudioContext || window.webkitAudioContext;
      if (!T) return null;
      try { aktx = new T(); } catch (e) { return null; }
    }
    if (aktx.state === 'suspended') aktx.resume().catch(function () {});
    return aktx;
  }

  /* --- hör efter om appen själv låter ----------------------------------- */
  var T = window.AudioContext || window.webkitAudioContext;
  if (T && T.prototype.createOscillator) {
    var osc = T.prototype.createOscillator;
    T.prototype.createOscillator = function () {
      if (!varaEgna) horde = true;
      return osc.apply(this, arguments);
    };
    var buf = T.prototype.createBufferSource;
    if (buf) T.prototype.createBufferSource = function () {
      if (!varaEgna) horde = true;
      return buf.apply(this, arguments);
    };
  }
  if (window.Audio) {
    var A = window.Audio;
    var Ny = function (s) { if (!varaEgna) horde = true; return new A(s); };
    Ny.prototype = A.prototype;
    window.Audio = Ny;
  }
  if (window.HTMLMediaElement && HTMLMediaElement.prototype.play) {
    var spela = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!varaEgna) horde = true; return spela.apply(this, arguments); };
  }

  /* --- ljudet ----------------------------------------------------------- */
  function ton(f, dur, typ, vol, forsink, glidTill) {
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    var t0 = a.currentTime + (forsink || 0);
    o.type = typ || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (glidTill) o.frequency.exponentialRampToValueAtTime(glidTill, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function spel(namn) {
    varaEgna = true;
    try {
      if (namn === 'plock') { ton(600, 0.06, 'triangle', 0.02, 0, 720); }
      else if (namn === 'plats') { ton(420, 0.09, 'triangle', 0.024, 0, 300); ton(260, 0.07, 'sine', 0.013, 0.03); }
      else if (namn === 'stjarna') { ton(1046, 0.09, 'sine', 0.017, 0); ton(1568, 0.11, 'sine', 0.011, 0.05); }
      else if (namn === 'knapp') { ton(360, 0.06, 'sine', 0.02, 0, 480); }
      else if (namn === 'fniss') {   /* Kotten blir petad och fnissar */
        ton(880, 0.05, 'sine', 0.02, 0);
        ton(1174, 0.05, 'sine', 0.018, 0.07);
        ton(1568, 0.07, 'sine', 0.014, 0.14);
      }
      else { ton(520, 0.05, 'sine', 0.02, 0, 400); ton(780, 0.03, 'triangle', 0.006, 0.004); }
    } finally {
      setTimeout(function () { varaEgna = false; }, 60);
    }
  }

  window.__sma = function (namn) { spel(namn); return true; };

  /* --- peta på Kotten ---------------------------------------------------- */
  /* Kotten ritas i canvas, så vi minns var han ritades senast och kollar om
     trycket landade på honom. Då fnissar han – appens eget svar blir kvar. */
  var kotte = null;

  function minns(cx, cy, size) {
    if (!size) return;
    kotte = { x: cx, y: cy, r: size * 0.55, t: Date.now() };
  }

  function kopplaKotten() {
    var K = window.KOTTEN;
    if (!K || K.__smaKopplad) return;
    K.__smaKopplad = true;
    if (K.draw) {
      var d = K.draw;
      K.draw = function (ctx, cx, cy, size, opt) { minns(cx, cy, size); return d.apply(this, arguments); };
    }
    if (K.drawAtFeet) {
      var f = K.drawAtFeet;
      K.drawAtFeet = function (ctx, x, y, width, opt) { minns(x, y - (width || 0) / 2, width); return f.apply(this, arguments); };
    }
  }
  kopplaKotten();
  setTimeout(kopplaKotten, 400);
  setTimeout(kopplaKotten, 1500);

  function paKotten(x, y) {
    if (!kotte || Date.now() - kotte.t > 1500) return false;
    var dx = x - kotte.x, dy = y - kotte.y;
    return (dx * dx + dy * dy) < kotte.r * kotte.r;
  }
  window.__smaKotten = function () { return kotte; };

  /* --- tysta tryck får ett pet ----------------------------------------- */
  function paTryck(e) {
    if (!e.isPrimary) return;
    var nu = Date.now();
    if (nu - senast < 45) return;   /* samma tryck ger ibland två event */
    senast = nu;
    var pa = null;
    try {
      var mal = e.target, r = mal && mal.getBoundingClientRect ? mal.getBoundingClientRect() : null;
      if (r && r.width) {
        /* canvas kan vara ritad i större skala än den visas – räkna om till ritkoordinater */
        var kx = mal.width ? mal.width / r.width : 1;
        var ky = mal.height ? mal.height / r.height : 1;
        if (paKotten((e.clientX - r.left) * kx, (e.clientY - r.top) * ky)) pa = 'fniss';
      }
    } catch (fel) { pa = null; }
    horde = false;
    setTimeout(function () {
      if (pa) { spel(pa); return; }      /* Kotten fnissar även om appen svarar */
      if (horde) return;
      spel('pet');
    }, 220);
  }

  if (document.addEventListener) {
    document.addEventListener('pointerdown', paTryck, { capture: true, passive: true });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { horde = false; setTimeout(function () { if (!horde) spel('pet'); }, 220); }
    }, true);
  }
})();