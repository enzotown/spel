/* Vilken hör inte hit? — hitta undantaget
 * Fyra saker på hyllan, tre hör ihop och en gör det inte. Barnet trycker på
 * undantaget, Kotten säger varför ("Snigeln hör inte hit – de andra kan flyga")
 * och en stjärna flyger uppAT hyllAN. Sex kategorier, sedan fest.
 *
 * Tränar kategorisering, jämförelse och negationen "inte" — steget efter att
 * sortera allt i högar (Sopsortering, Två sätt att sortera).
 *
 * Ingen förlust: fel svar ger ett vänligt nej, korten skakar lite, och efter
 * två försök lyser rätt kort. Inga poäng dras, ingen tid.
 */
(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    sky1: '#f6ecdb', sky2: '#fdf8ee',
    cream: '#fffaf3', ink: '#4a3f39', muted: '#8a7a6d',
    card: '#fffdf7', cardEdge: '#e2cfb0', cardEdgeD: '#c7ad86',
    wood: '#d8a464', woodD: '#a86f2f', woodDD: '#7f501f', woodL: '#f0cf9f',
    star: '#f7c948', starD: '#dfa616',
    coral: '#e98061', coralD: '#c9654a',
    teal: '#4fae94', tealD: '#3d8b76',
    leaf: '#6aa84f', leafD: '#4a7f36',
    blue: '#5b8fc9', blueD: '#3f6d9f',
    shade: 'rgba(30,46,40,0.16)'
  };

  /* ---------------- frågorna ---------------- */
  var RU = [
    { ratt: 'snigel', saker: ['fagel', 'fjari', 'bi', 'snigel'],
      forkl: 'Snigeln hör inte hit – de andra kan flyga.' },
    { ratt: 'stovel', saker: ['bil', 'cykel', 'vagn', 'stovel'],
      forkl: 'Stöveln hör inte hit – de andra har hjul.' },
    { ratt: 'sten', saker: ['apple', 'banan', 'brod', 'sten'],
      forkl: 'Stenen hör inte hit – de andra kan man äta.' },
    { ratt: 'katt', saker: ['fisk', 'krabba', 'sjostjarna', 'katt'],
      forkl: 'Katten hör inte hit – de andra bor i vattnet.' },
    { ratt: 'penna', saker: ['boll', 'sol', 'apelsin', 'penna'],
      forkl: 'Pennan hör inte hit – de andra är runda.' },
    { ratt: 'kudde', saker: ['trumma', 'gitarr', 'flojt', 'kudde'],
      forkl: 'Kudden hör inte hit – de andra kan man spela på.' }
  ];
  var VILA = 5.4;   /* sekunder efter rätt svar innan nästa fråga (förklaringen hinner klart) */

  var W = 0, H = 0, DPR = 1, nu = 0;
  var L = {};

  var G = {
    fas: 'intro',         /* intro | spel | fest */
    runda: 0,
    kort: [],             /* id:n i den ordning de visas */
    ratt: 0,              /* index i G.kort för undantaget */
    klar: [false, false, false, false, false, false],
    klarNu: false, klarT: 0,
    fel: 0, skak: -1, skakT: 0, hint: 0,
    pause: 0, glomd: null,
    gnistor: [], flyg: [],
    festVal: -1, festT: 0,
    auto: true
  };

  /* ---------------- ljud ---------------- */
  var AC = null;
  function ac() {
    if (!AC) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (A) { try { AC = new A(); } catch (e) { AC = null; } }
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, dur, vol, type, slide) {
    var a = ac();
    if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(vol == null ? 0.13 : vol, a.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function mjukNej() { tone(330, 0.16, 0.07, 'triangle', 250); }
  function plats() {
    tone(660, 0.13, 0.09, 'triangle');
    setTimeout(function () { tone(880, 0.16, 0.085, 'triangle'); }, 110);
  }
  function fanfar() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.26, 0.10, 'triangle'); }, i * 130);
    });
  }

  function say(text, avbryt) {
  /* rösten är en inspelad mp3-fil (Shipholm TTS) – saknas den är appen tyst */
  if (!text) return;
  if (window.__rost && window.__rost(text)) return;
}

  /* ---------------- layout ---------------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function layout() {
    W = Math.max(300, innerWidth);
    H = Math.max(320, innerHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';

    var land = W / H > 1.12;
    var m = clamp(Math.min(W, H) * 0.030, 8, 26);
    var gap = clamp(Math.min(W, H) * 0.028, 10, 26);
    var topBar = Math.max(78, H * 0.145);
    var botten = clamp(H * 0.042, 10, 34);

    var kW = clamp(Math.min(W, H) * 0.19, 62, 138);
    var kRom = kW * 0.86;                        /* plats Kotten behöver under rutnätet */

    var availW = W - 2 * m - gap;
    var availH = H - topBar - botten - gap - kRom;
    var cw = Math.min(availW / 2, availH / 2 / 0.94, 330);
    var ch = cw * 0.94;
    var totW = 2 * cw + gap, totH = 2 * ch + gap;
    var gx = (W - totW) / 2;
    var gy = topBar + Math.max(4, (H - topBar - botten - kRom - totH) / 2);

    L = {
      land: land, m: m, gap: gap, topBar: topBar, botten: botten,
      cw: cw, ch: ch, gx: gx, gy: gy, totW: totW, totH: totH,
      kort: [],
      kotten: { x: m + kW * 0.46, y: H - botten * 0.5, w: kW },
      infoZone: 0
    };
    for (var i = 0; i < 4; i++) {
      L.kort.push({
        x: gx + (i % 2) * (cw + gap) + cw / 2,
        y: gy + Math.floor(i / 2) * (ch + gap) + ch / 2,
        w: cw, h: ch
      });
    }
    /* stjärnornas mål uppe till höger */
    var r = clamp(topBar * 0.21, 8, 16), g2 = r * 2.45;
    var x0 = W - m - r - 5 * g2;
    L.stjar = [];
    for (var k = 0; k < 6; k++) L.stjar.push({ x: x0 + k * g2, y: topBar * 0.5, r: r });
  }

  /* ---------------- spelgång ---------------- */
  function blanda(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = b[i]; b[i] = b[j]; b[j] = t;
    }
    return b;
  }

  function nyRunda(i) {
    G.runda = i;
    G.kort = blanda(RU[i].saker);
    G.ratt = G.kort.indexOf(RU[i].ratt);
    G.klarNu = false; G.klarT = 0;
    G.fel = 0; G.skak = -1; G.skakT = 0; G.hint = 0;
    G.pause = 0; G.glomd = null; G.festVal = -1;
  }

  function startSpel() {
    G.fas = 'spel';
    G.klar = [false, false, false, false, false, false];
    G.gnistor = []; G.flyg = []; G.festVal = -1; G.festT = 0;
    nyRunda(0);
    say('Vilken hör inte hit?', true);
  }

  function rattSvar() {
    if (G.klarNu) return;
    G.klarNu = true; G.klarT = 0;
    G.klar[G.runda] = true;
    G.hint = 0;
    plats();
    say(RU[G.runda].forkl, true);
    var q = L.kort[G.ratt];
    for (var i = 0; i < 18; i++) {
      G.gnistor.push({
        x: q.x + (Math.random() - 0.5) * q.w * 0.7,
        y: q.y + (Math.random() - 0.5) * q.h * 0.7,
        vx: (Math.random() - 0.5) * 210, vy: -Math.random() * 240,
        liv: 1.3, col: ['#f7c948', '#ffffff', '#e98061', '#4fae94'][i % 4]
      });
    }
    G.flyg.push({ x0: q.x, y0: q.y, x1: L.stjar[G.runda].x, y1: L.stjar[G.runda].y, t: 0, dur: 0.95 });
  }

  function felSvar(i) {
    G.fel++;
    G.skak = i; G.skakT = 0.45;
    mjukNej();
    if (G.fel === 1) say('Titta igen!', true);
    else { G.hint = 1; say('Titta noga på alla fyra', true); }
    if (window.__sma) { try { window.__sma('nej'); } catch (e) {} }
  }

  function nastaRunda() {
    if (G.runda + 1 >= RU.length) { tillFest(); return; }
    nyRunda(G.runda + 1);
    if (G.runda === RU.length - 1) say('Sista frågan nu!', true);
  }

  function tillFest() {
    G.fas = 'fest';
    G.festVal = -1; G.festT = 0;
    G.pause = 0; G.glomd = null;
    fanfar();
    say('Sex rätt! Bra jobbat!', true);
    for (var i = 0; i < 46; i++) {
      G.gnistor.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.7,
        y: H * 0.24 + Math.random() * H * 0.18,
        vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 320,
        liv: 1.5, col: ['#f7c948', '#e98061', '#4fae94', '#5b8fc9'][i % 4]
      });
    }
  }

  function vanta(sek, fn) { G.pause = sek; G.glomd = fn; }

  /* ---------------- pek ---------------- */
  function pos(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function kortAt(p) {
    for (var i = 0; i < 4; i++) {
      var q = L.kort[i];
      if (Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.y - q.y) < q.h / 2) return i;
    }
    return -1;
  }
  function rundKnapp(p) {
    if (!L.igen) return false;
    var dx = p.x - L.igen.x, dy = p.y - L.igen.y;
    return dx * dx + dy * dy < L.igen.r * L.igen.r * 1.7;
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    var p = pos(e);
    if (G.fas === 'intro') {
      if (!L.start || Math.hypot(p.x - L.start.x, p.y - L.start.y) < L.start.r * 1.45) startSpel();
      return;
    }
    if (G.fas === 'fest') {
      if (rundKnapp(p)) { startSpel(); return; }
      var fi = festKortAt(p);
      if (fi >= 0) {
        G.festVal = fi; G.festT = 0;
        tone(620, 0.1, 0.07, 'triangle');
        say(RU[fi].forkl, true);
      }
      return;
    }
    if (G.pause > 0 || G.klarNu) return;
    var ki = kortAt(p);
    if (ki < 0) return;
    if (ki === G.ratt) rattSvar(); else felSvar(ki);
  }, { passive: false });

  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  /* ---------------- ritning ---------------- */
  function rr(x, y, w, h, r, fill) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function circ(x, y, r, fill) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function ell(x, y, rx, ry, fill, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function p(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
  function ln(x1, y1, x2, y2, col, w, cap) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.lineCap = cap || 'round'; ctx.stroke();
  }
  function pol(pts, fill, stroke, sw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1; ctx.stroke(); }
  }
  function textFit(str, x, y, maxW, size, col, weight) {
    var s = size;
    do {
      ctx.font = (weight || 800) + ' ' + s + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
      if (ctx.measureText(str).width <= maxW || s <= 10) break;
      s -= 1;
    } while (s > 10);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col || COL.ink;
    ctx.fillText(str, x, y);
  }
  function K(x, feetY, w, opt) {
    if (window.KOTTEN) {
      try { KOTTEN.drawAtFeet(ctx, x, feetY, w, opt || {}); }
      catch (e) { errs.push('kotten: ' + e); }
    }
  }

  /* ---------------- saker i 100x100-ruta ---------------- */
  var IT = {
    fagel: function () {
      pol([[30, 56], [8, 44], [10, 64]], '#4a7cb3');
      ell(46, 56, 23, 16, '#5b8fc9');
      ell(42, 54, 12, 8, '#7ba9da', -0.2);
      circ(67, 41, 11, '#6f9fd6');
      pol([[76, 40], [89, 45], [76, 49]], '#e9a23b');
      circ(70, 39, 1.9, '#2f3438');
      ln(44, 71, 44, 85, '#e9a23b', 2.2); ln(53, 71, 53, 85, '#e9a23b', 2.2);
      ln(40, 86, 48, 86, '#e9a23b', 2.2); ln(49, 86, 57, 86, '#e9a23b', 2.2);
    },
    fjari: function () {
      ell(32, 44, 19, 13, '#f2a2c0', -0.45);
      ell(68, 44, 19, 13, '#f2a2c0', 0.45);
      ell(34, 64, 13, 9, '#f7bfd3', -0.25);
      ell(66, 64, 13, 9, '#f7bfd3', 0.25);
      circ(30, 42, 4.6, '#e07d9e'); circ(70, 42, 4.6, '#e07d9e');
      circ(36, 64, 3.4, '#e07d9e'); circ(64, 64, 3.4, '#e07d9e');
      ell(50, 54, 3.6, 19, '#5b4b44');
      circ(50, 33, 4, '#5b4b44');
      ln(48, 29, 42, 19, '#5b4b44', 1.4); ln(52, 29, 58, 19, '#5b4b44', 1.4);
      circ(41, 18, 1.8, '#5b4b44'); circ(59, 18, 1.8, '#5b4b44');
    },
    bi: function () {
      ell(44, 40, 13, 8, 'rgba(232,244,252,0.85)', -0.5);
      ell(60, 38, 11, 7, 'rgba(232,244,252,0.7)', 0.4);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(52, 58, 20, 14, -0.1, 0, Math.PI * 2); ctx.clip();
      p(38, 40, 40, 40, '#f2c14e');
      p(44, 40, 6, 40, '#3f3a34');
      p(54, 40, 6, 40, '#3f3a34');
      p(64, 40, 5, 40, '#3f3a34');
      ctx.restore();
      circ(31, 54, 9, '#3f3a34');
      circ(28, 52, 1.6, '#f7f4ea');
      pol([[21, 58], [12, 62], [21, 62]], '#3f3a34');
      ln(33, 46, 28, 36, '#3f3a34', 1.4); ln(38, 45, 36, 34, '#3f3a34', 1.4);
      circ(27, 35, 1.6, '#3f3a34'); circ(36, 33, 1.6, '#3f3a34');
    },
    snigel: function () {
      ell(46, 78, 32, 8, '#9ec98b');
      ell(62, 66, 11, 13, '#a9d196');
      circ(65, 60, 2, '#3f3a34'); circ(70, 62, 1.6, '#3f3a34');
      ln(60, 56, 56, 42, '#9ec98b', 2); circ(56, 41, 2, '#9ec98b');
      ln(66, 54, 66, 40, '#9ec98b', 2); circ(66, 39, 2, '#9ec98b');
      circ(40, 56, 21, '#c98f4e');
      circ(40, 56, 16, '#dba86a');
      ctx.strokeStyle = '#a86f2f'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (var a = 0; a < 8.6; a += 0.25) {
        var r = 2 + a * 1.7;
        ctx.lineTo(40 + Math.cos(a) * r, 56 + Math.sin(a) * r);
      }
      ctx.stroke();
    },
    bil: function () {
      rr(14, 44, 72, 26, 8, '#e98061');
      pol([[30, 44], [40, 26], [66, 26], [74, 44]], '#e98061');
      pol([[35, 42], [42, 30], [63, 30], [69, 42]], '#cfe4ec');
      circ(33, 72, 11, '#3f3a34'); circ(33, 72, 4.4, '#cfd7dc');
      circ(69, 72, 11, '#3f3a34'); circ(69, 72, 4.4, '#cfd7dc');
      circ(82, 50, 3, '#ffe08a'); circ(18, 50, 3, '#ffe08a');
      rr(70, 46, 12, 5, 2, '#c9654a');
    },
    cykel: function () {
      ctx.strokeStyle = '#3f3a34'; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.arc(25, 66, 17, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(75, 66, 17, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#4fae94'; ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(25, 66); ctx.lineTo(47, 66); ctx.lineTo(58, 44);
      ctx.lineTo(40, 44); ctx.lineTo(25, 66);
      ctx.moveTo(47, 66); ctx.lineTo(58, 44); ctx.lineTo(75, 66);
      ctx.moveTo(47, 66); ctx.lineTo(68, 44);
      ctx.stroke();
      ln(68, 44, 80, 38, '#3f3a34', 3);
      rr(54, 38, 16, 5, 2, '#3f3a34');
      ln(36, 42, 44, 42, '#3f3a34', 4);
    },
    vagn: function () {
      rr(18, 40, 56, 30, 5, '#7bb85c');
      rr(18, 40, 56, 8, 5, '#95cc74');
      ln(74, 52, 90, 34, '#a86f2f', 4);
      ln(90, 34, 90, 30, '#a86f2f', 4);
      circ(32, 72, 9, '#3f3a34'); circ(32, 72, 3.6, '#cfd7dc');
      circ(62, 72, 9, '#3f3a34'); circ(62, 72, 3.6, '#cfd7dc');
      ln(28, 46, 64, 46, '#4a7f36', 2);
    },
    stovel: function () {
      pol([[38, 22], [64, 22], [64, 58], [82, 66], [84, 82], [36, 82], [36, 22]], '#c9654a');
      pol([[38, 22], [64, 22], [64, 30], [38, 30]], '#e98061');
      rr(34, 80, 52, 7, 3, '#7f4b33');
      ln(40, 36, 40, 60, '#b85a40', 2);
      ctx.save(); ctx.globalAlpha = 0.5; rr(44, 66, 8, 4, 2, '#e98061'); ctx.restore();
    },
    apple: function () {
      circ(50, 56, 26, '#e0563f');
      ctx.save(); ctx.globalAlpha = 0.45; circ(40, 44, 8, '#f08a73'); ctx.restore();
      ln(50, 32, 54, 20, '#7f501f', 3.2);
      ell(62, 24, 10, 5, '#6aa84f', -0.5);
    },
    banan: function () {
      ctx.beginPath();
      ctx.moveTo(22, 30);
      ctx.bezierCurveTo(24, 62, 52, 80, 82, 70);
      ctx.bezierCurveTo(84, 82, 60, 88, 40, 80);
      ctx.bezierCurveTo(24, 72, 14, 48, 22, 30);
      ctx.closePath();
      ctx.fillStyle = '#f2ce4e'; ctx.fill();
      ctx.strokeStyle = '#c9a12f'; ctx.lineWidth = 1.8; ctx.stroke();
      circ(22, 30, 3.4, '#8a6b2a');
      circ(80, 70, 3, '#8a6b2a');
    },
    brod: function () {
      rr(18, 40, 64, 34, 16, '#d9a35a');
      rr(18, 40, 64, 13, 12, '#e8bf7e');
      ['#b57e3f'].forEach(function (c) {
        ln(32, 44, 40, 38, c, 2.2); ln(46, 42, 54, 36, c, 2.2); ln(60, 44, 68, 38, c, 2.2);
      });
      ctx.save(); ctx.globalAlpha = 0.5; rr(24, 56, 22, 4, 2, '#f2d6a4'); ctx.restore();
    },
    sten: function () {
      pol([[24, 76], [16, 58], [30, 38], [54, 30], [74, 42], [76, 62], [58, 78]], '#a8a49b');
      pol([[30, 38], [54, 30], [58, 46], [40, 56]], '#c2beb3');
      pol([[58, 46], [74, 42], [76, 62], [58, 78]], '#8f8b82');
      ell(50, 82, 30, 5, 'rgba(60,60,55,0.18)');
    },
    fisk: function () {
      pol([[24, 52], [6, 36], [8, 68]], '#4a7cb3');
      ell(50, 52, 28, 17, '#5b8fc9');
      pol([[44, 36], [56, 22], [60, 40]], '#4a7cb3');
      circ(64, 46, 3, '#fffdf7'); circ(64, 46, 1.5, '#2f3438');
      ctx.strokeStyle = '#4a7cb3'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(52, 52, 9, -0.9, 0.9); ctx.stroke();
      ell(40, 50, 8, 4, '#7ba9da', 0.3);
    },
    krabba: function () {
      ['#c9654a'].forEach(function (c) {
        ln(30, 62, 16, 74, c, 2.6); ln(34, 68, 22, 82, c, 2.6);
        ln(70, 62, 84, 74, c, 2.6); ln(66, 68, 78, 82, c, 2.6);
      });
      ell(50, 56, 23, 15, '#e0563f');
      circ(26, 46, 8, '#e0563f'); pol([[18, 38], [22, 30], [28, 38]], '#e0563f');
      circ(74, 46, 8, '#e0563f'); pol([[72, 38], [78, 30], [82, 38]], '#e0563f');
      ln(42, 44, 42, 34, '#c9654a', 2); ln(58, 44, 58, 34, '#c9654a', 2);
      circ(42, 32, 4, '#fffdf7'); circ(58, 32, 4, '#fffdf7');
      circ(42, 32, 1.8, '#2f3438'); circ(58, 32, 1.8, '#2f3438');
      ctx.strokeStyle = '#c9654a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(50, 58, 10, 0.3, 2.8); ctx.stroke();
    },
    sjostjarna: function () {
      ctx.save(); ctx.translate(50, 54);
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var r = i % 2 ? 18 : 40;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fillStyle = '#e98a4a'; ctx.fill();
      ctx.strokeStyle = '#c9654a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      circ(50, 50, 3, '#f7c9a0'); circ(40, 58, 2, '#f7c9a0'); circ(60, 58, 2, '#f7c9a0');
      circ(50, 40, 2, '#f7c9a0');
    },
    katt: function () {
      ctx.strokeStyle = '#e0913f'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(70, 74); ctx.quadraticCurveTo(88, 70, 82, 50); ctx.stroke();
      ell(50, 68, 22, 16, '#e0913f');
      circ(50, 40, 16, '#efa75a');
      pol([[36, 32], [35, 14], [48, 24]], '#efa75a');
      pol([[64, 32], [65, 14], [52, 24]], '#efa75a');
      pol([[39, 29], [39, 20], [45, 26]], '#f2b98e');
      pol([[61, 29], [61, 20], [55, 26]], '#f2b98e');
      circ(44, 39, 2.4, '#3f3a34'); circ(56, 39, 2.4, '#3f3a34');
      pol([[47, 46], [53, 46], [50, 50]], '#c9654a');
      ln(34, 46, 22, 43, '#8a7a6d', 1.4); ln(34, 49, 22, 51, '#8a7a6d', 1.4);
      ln(66, 46, 78, 43, '#8a7a6d', 1.4); ln(66, 49, 78, 51, '#8a7a6d', 1.4);
    },
    boll: function () {
      circ(50, 54, 27, '#e0563f');
      ctx.save();
      ctx.beginPath(); ctx.arc(50, 54, 27, 0, Math.PI * 2); ctx.clip();
      p(23, 44, 54, 9, '#fffdf7');
      p(23, 62, 54, 7, '#f2c14e');
      ctx.restore();
      ctx.strokeStyle = 'rgba(120,60,45,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(50, 54, 27, 0, Math.PI * 2); ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.5; circ(40, 42, 7, '#ffffff'); ctx.restore();
    },
    sol: function () {
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        ln(50 + Math.cos(a) * 26, 52 + Math.sin(a) * 26,
           50 + Math.cos(a) * 37, 52 + Math.sin(a) * 37, '#f2b93b', 4);
      }
      circ(50, 52, 22, '#ffd75e');
      circ(50, 52, 15, '#ffe89a');
    },
    apelsin: function () {
      circ(50, 56, 26, '#f0a03c');
      ctx.save(); ctx.globalAlpha = 0.35; circ(41, 45, 8, '#ffd08a'); ctx.restore();
      [[36, 66], [62, 48], [58, 68], [42, 40], [66, 62]].forEach(function (d) {
        circ(d[0], d[1], 1.2, '#d9862a');
      });
      ln(50, 32, 52, 24, '#7f501f', 2.6);
      ell(60, 24, 9, 4.4, '#6aa84f', -0.5);
    },
    tallrik: function () {
      circ(50, 56, 29, '#e7dccd');
      circ(50, 56, 22, '#fffdf7');
      circ(50, 56, 12, '#f4eee2');
      ctx.strokeStyle = '#d8cbb8'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(50, 56, 22, 0, Math.PI * 2); ctx.stroke();
    },
    penna: function () {
      ctx.save(); ctx.translate(50, 52); ctx.rotate(-0.62);
      rr(-8, -38, 16, 58, 3, '#f2ce4e');
      p(-8, -26, 16, 7, '#e0b93c');
      pol([[-8, 20], [8, 20], [0, 36]], '#e8cfa8');
      pol([[-3, 30], [3, 30], [0, 36]], '#3f3a34');
      rr(-8, -46, 16, 9, 3, '#e98a9c');
      rr(-8, -40, 16, 4, 1, '#cfd7dc');
      ctx.restore();
    },
    trumma: function () {
      ell(50, 34, 26, 8, '#f6e6cc');
      pol([[24, 34], [76, 34], [72, 74], [28, 74]], '#e0563f');
      pol([[28, 74], [72, 74], [76, 34], [70, 34], [66, 72], [34, 72], [30, 34], [24, 34]], '#c9654a');
      ['#f7c948'].forEach(function (c) {
        pol([[31, 38], [34, 72], [38, 72], [35, 38]], c);
        pol([[46, 38], [47, 72], [51, 72], [50, 38]], c);
        pol([[61, 38], [64, 72], [68, 72], [65, 38]], c);
      });
      ell(50, 34, 26, 8, null);
      ctx.strokeStyle = '#d8b384'; ctx.lineWidth = 2; ctx.stroke();
      ln(20, 18, 44, 32, '#a86f2f', 3); ln(80, 18, 56, 32, '#a86f2f', 3);
      circ(19, 17, 3.4, '#d8a464'); circ(81, 17, 3.4, '#d8a464');
    },
    gitarr: function () {
      circ(46, 66, 24, '#c98f4e');
      circ(56, 46, 18, '#c98f4e');
      circ(48, 62, 10, '#8a5c37');
      rr(60, 12, 11, 40, 5, '#8a5c37');
      rr(58, 6, 15, 10, 4, '#5b4b44');
      ctx.save(); ctx.globalAlpha = 0.6;
      ln(65, 16, 65, 60, '#f0e0c8', 0.9); ln(69, 16, 69, 60, '#f0e0c8', 0.9);
      ctx.restore();
      ln(34, 58, 44, 62, '#5b4b44', 2);
      pol([[36, 92], [56, 92], [48, 82], [44, 82]], '#5b4b44');
    },
    flojt: function () {
      ctx.save(); ctx.translate(50, 54); ctx.rotate(-0.35);
      rr(-44, -8, 88, 16, 8, '#cfd7dc');
      rr(-40, -5, 80, 5, 2, '#e9eef1');
      [-24, -10, 4, 18].forEach(function (x) { circ(x, 0, 3.2, '#8a949b'); });
      rr(30, -3, 12, 6, 3, '#b6c0c6');
      ctx.restore();
    },
    kudde: function () {
      rr(16, 34, 68, 44, 16, '#a9c7e0');
      rr(22, 40, 56, 32, 12, '#bcd6ea');
      pol([[16, 38], [24, 34], [20, 46]], '#8fb3d4');
      pol([[84, 38], [76, 34], [80, 46]], '#8fb3d4');
      ctx.strokeStyle = '#8fb3d4'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(24, 76); ctx.lineTo(76, 36); ctx.stroke();
      circ(50, 56, 4, '#f4f9fd');
    }
  };

  function drawItem(id, cx, cy, s) {
    var f = IT[id];
    if (!f) return;
    ctx.save();
    ctx.translate(cx - s / 2, cy - s / 2);
    ctx.scale(s / 100, s / 100);
    f();
    ctx.restore();
  }

  /* ---------------- bakgrund ---------------- */
  function drawBg(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.sky1);
    g.addColorStop(1, COL.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.save(); ctx.globalAlpha = 0.5;
    for (var i = 0; i < 3; i++) {
      var cx = ((t * 5 + i * 440 + 60) % (W + 300)) - 150;
      var cy = L.topBar + 14 + i * 18;
      ell(cx, cy, 18, 10, '#ffffff');
      ell(cx + 22, cy + 3, 14, 8, '#ffffff');
      ell(cx - 20, cy + 4, 10, 6, '#ffffff');
    }
    ctx.restore();

    /* gräsrand längst ner */
    var gy = H - clamp(H * 0.05, 18, 46);
    ctx.save(); ctx.globalAlpha = 0.55;
    ell(W * 0.5, gy + H * 0.06, W * 0.62, H * 0.06, '#cfe0b4');
    ctx.restore();
  }

  function drawStjar(t) {
    for (var i = 0; i < 6; i++) {
      var s = L.stjar[i], fylld = G.klar[i];
      if (fylld) {
        circ(s.x, s.y, s.r, COL.star);
        ctx.save();
        ctx.translate(s.x, s.y); ctx.scale(s.r * 0.052, s.r * 0.052);
        ctx.beginPath();
        for (var k = 0; k < 10; k++) {
          var a = -Math.PI / 2 + k * Math.PI / 5;
          var rad = k % 2 ? 0.44 : 1;
          ctx.lineTo(Math.cos(a) * rad * 100, Math.sin(a) * rad * 100);
        }
        ctx.closePath(); ctx.fillStyle = '#fff8e0'; ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#c3ab8b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawHuvud(t) {
    var ts = clamp(Math.min(W, H) * 0.052, 13, 26);
    ctx.save();
    ctx.font = '800 ' + ts + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COL.ink;
    var txt = 'Vilken hör inte hit?';
    var maxW = L.stjar[0].x - L.stjar[0].r - L.m - 12;
    while (ctx.measureText(txt).width > maxW && ts > 11) {
      ts -= 1;
      ctx.font = '800 ' + ts + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    }
    ctx.fillText(txt, L.m, L.topBar * 0.5);
    ctx.restore();
    drawStjar(t);
  }

  function drawKort(i, t) {
    var q = L.kort[i];
    var id = G.kort[i];
    var ratt = G.klarNu && i === G.ratt;
    var skak = (G.skak === i && G.skakT > 0) ? Math.sin(G.skakT * 70) * 6 * (G.skakT / 0.45) : 0;
    var lyft = ratt ? clamp(G.klarT / 0.28, 0, 1) : 0;
    var dim = (G.klarNu && i !== G.ratt) ? 0.42 : 1;

    ctx.save();
    ctx.globalAlpha = dim;
    ctx.translate(q.x + skak, q.y - lyft * q.h * 0.09);
    if (ratt) { ctx.rotate(lyft * 0.035); }
    var esc = 1 + lyft * 0.06;
    ctx.scale(esc, esc);

    /* skugga */
    ctx.save(); ctx.globalAlpha = dim * (ratt ? 0.3 : 0.15);
    rr(-q.w / 2 + 3, -q.h / 2 + 6 + lyft * 4, q.w, q.h, q.w * 0.10, '#3f3a34');
    ctx.restore();

    rr(-q.w / 2, -q.h / 2, q.w, q.h, q.w * 0.10, COL.card);
    /* bilden */
    drawItem(id, 0, -q.h * 0.03, Math.min(q.w, q.h) * 0.62);
    /* en liten hyllkant under saken */
    ctx.save();
    ctx.globalAlpha = 0.5;
    rr(-q.w * 0.30, q.h * 0.30, q.w * 0.60, Math.max(3, q.h * 0.018), 3, '#e7d9c2');
    ctx.restore();

    rr(-q.w / 2, -q.h / 2, q.w, q.h, q.w * 0.10, null);
    ctx.strokeStyle = ratt ? '#f2b93b' : COL.cardEdge;
    ctx.lineWidth = ratt ? Math.max(3, q.w * 0.012) : 2;
    ctx.stroke();
    ctx.restore();

    /* rätt svar: gloria */
    if (ratt) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 9);
      ctx.strokeStyle = '#f7c948';
      ctx.lineWidth = Math.max(4, q.w * 0.022);
      rr(q.x - q.w / 2 - 5, q.y - q.h / 2 - 5, q.w + 10, q.h + 10, q.w * 0.11, null);
      ctx.stroke();
      ctx.restore();
    }
    /* ledtråd efter två fel */
    if (!G.klarNu && G.hint > 0 && i === G.ratt) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 5.2);
      ctx.strokeStyle = COL.teal;
      ctx.lineWidth = Math.max(4, q.w * 0.02);
      ctx.setLineDash([q.w * 0.06, q.w * 0.045]);
      rr(q.x - q.w / 2 - 5, q.y - q.h / 2 - 5, q.w + 10, q.h + 10, q.w * 0.11, null);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSpel(t) {
    drawHuvud(t);
    for (var i = 0; i < 4; i++) drawKort(i, t);

    /* Kotten i hörnet */
    var k = L.kotten;
    ctx.save(); ctx.globalAlpha = 0.14;
    ell(k.x, k.y - 2, k.w * 0.26, k.w * 0.05, '#3f3a34');
    ctx.restore();
    K(k.x, k.y, k.w, { wave: G.klarNu ? 0.5 + 0.5 * Math.sin(t * 5) : 0.06 });
  }

  /* ---------------- intro och fest ---------------- */
  function drawVidare(x, y, r, typ, t) {
    var puls = 1 + 0.035 * Math.sin(t * 6.2);
    ctx.save();
    ctx.translate(x, y); ctx.scale(puls, puls);
    ctx.save(); ctx.globalAlpha = 0.18; circ(0, 3, r, '#3f3a34'); ctx.restore();
    circ(0, 0, r, COL.teal);
    circ(0, 0, r * 0.88, COL.tealD);
    circ(0, 0, r * 0.80, '#4fae94');
    ctx.fillStyle = '#ffffff';
    if (typ === 'play' || typ === 'again') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.20, -r * 0.34);
      ctx.lineTo(r * 0.36, 0);
      ctx.lineTo(-r * 0.20, r * 0.34);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-r * 0.30, -r * 0.30);
      ctx.lineTo(r * 0.30, 0);
      ctx.lineTo(-r * 0.30, r * 0.30);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawIntro(t) {
    var titelY = H * 0.17;
    textFit('Vilken hör', W / 2, titelY, W * 0.84, clamp(Math.min(W, H) * 0.105, 26, 66), COL.ink, 800);
    textFit('inte hit?', W / 2, titelY + clamp(H * 0.062, 20, 44), W * 0.84,
            clamp(Math.min(W, H) * 0.105, 26, 66), COL.ink, 800);
    textFit('tre hör ihop — hitta den fjärde', W / 2, titelY + clamp(H * 0.125, 40, 92),
            W * 0.8, clamp(Math.min(W, H) * 0.036, 11, 22), COL.muted, 700);

    /* fyra små kort i solfjäder */
    var cw = clamp(Math.min(W * 0.22, H * 0.17), 62, 150);
    var cy = H * 0.55;
    var gapx = cw * 0.66;
    var demo = ['fagel', 'fjari', 'bi', 'snigel'];
    for (var i = 0; i < 4; i++) {
      var x = W / 2 + (i - 1.5) * gapx;
      var rot = (i - 1.5) * 0.075;
      ctx.save();
      ctx.translate(x, cy + Math.abs(i - 1.5) * cw * 0.05);
      ctx.rotate(rot);
      ctx.save(); ctx.globalAlpha = 0.16;
      rr(-cw / 2 + 3, -cw / 2 + 6, cw, cw, 14, '#3f3a34');
      ctx.restore();
      rr(-cw / 2, -cw / 2, cw, cw, 14, COL.card);
      drawItem(demo[i], 0, -cw * 0.02, cw * 0.66);
      rr(-cw / 2, -cw / 2, cw, cw, 14, null);
      ctx.strokeStyle = COL.cardEdge; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    var kw = clamp(Math.min(W, H) * 0.19, 66, 140);
    var kx = clamp(W * 0.16, kw * 0.7, W * 0.3), ky = H * 0.96;
    ctx.save(); ctx.globalAlpha = 0.15;
    ell(kx, ky - 2, kw * 0.26, kw * 0.05, '#3f3a34');
    ctx.restore();
    K(kx, ky, kw, { wave: 0.5 + 0.5 * Math.sin(t * 5) });

    var br = clamp(Math.min(W, H) * 0.085, 30, 58);
    var bx = W * 0.68, by = H * 0.86;
    drawVidare(bx, by, br, 'play', t);
    L.start = { x: bx, y: by, r: br };
    /* texten under knappen i egen ljus pill så den syns på gräset */
    var tx = bx, ty = by + br + clamp(H * 0.042, 14, 30);
    ctx.save();
    ctx.font = '700 ' + clamp(Math.min(W, H) * 0.028, 10, 16) + 'px "Trebuchet MS", sans-serif';
    var tw = ctx.measureText('tryck för att börja').width + 22;
    rr(tx - tw / 2, ty - 12, tw, 24, 12, 'rgba(255,250,243,0.85)');
    ctx.restore();
    textFit('tryck för att börja', tx, ty, W * 0.6, clamp(Math.min(W, H) * 0.028, 10, 16), COL.ink, 700);
  }

  function festKortAt(p) {
    if (!L.fest) return -1;
    for (var i = 0; i < L.fest.length; i++) {
      var r = L.fest[i];
      if (Math.abs(p.x - r.x) < r.w / 2 && Math.abs(p.y - r.y) < r.h / 2) return i;
    }
    return -1;
  }

  function drawFest(t) {
    var titelY = Math.max(L.topBar * 0.85, H * 0.11);
    textFit('Sex rätt!', W / 2, titelY, W * 0.8, clamp(Math.min(W, H) * 0.072, 20, 46), COL.ink, 800);

    var cols = 3, rows = 2;
    var top = titelY + clamp(H * 0.055, 22, 46);
    var bottenFri = clamp(H * 0.24, 78, 190);
    var availW = W - 2 * L.m * 1.4;
    var availH = H - top - bottenFri;
    var cw = Math.min((availW - (cols - 1) * L.gap) / cols,
                      (availH - (rows - 1) * L.gap) / rows / 0.9);
    cw = Math.min(cw, 210);
    var ch = cw * 0.9;
    var totW = cols * cw + (cols - 1) * L.gap;
    var totH = rows * ch + (rows - 1) * L.gap;
    var x0 = W / 2 - totW / 2 + cw / 2;
    var y0 = top + Math.max(0, (availH - totH) / 2) + ch / 2;

    L.fest = [];
    for (var i = 0; i < 6; i++) {
      var cx = x0 + (i % cols) * (cw + L.gap);
      var cy = y0 + Math.floor(i / cols) * (ch + L.gap);
      L.fest.push({ x: cx, y: cy, w: cw, h: ch });
      var vald = (G.festVal === i && G.festT < 1.4);
      ctx.save();
      if (vald) { ctx.translate(cx, cy); ctx.scale(1.06, 1.06); ctx.translate(-cx, -cy); }
      ctx.save(); ctx.globalAlpha = 0.16;
      rr(cx - cw / 2 + 3, cy - ch / 2 + 5, cw, ch, 14, '#3f3a34');
      ctx.restore();
      rr(cx - cw / 2, cy - ch / 2, cw, ch, 14, COL.card);
      drawItem(RU[i].ratt, cx, cy - ch * 0.05, Math.min(cw, ch) * 0.62);
      /* liten stjärna i hörnet */
      ctx.save();
      ctx.translate(cx + cw / 2 - 20, cy - ch / 2 + 20);
      ctx.scale(0.16, 0.16);
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var a = -Math.PI / 2 + k * Math.PI / 5;
        var rad = k % 2 ? 0.44 : 1;
        ctx.lineTo(Math.cos(a) * rad * 100, Math.sin(a) * rad * 100);
      }
      ctx.closePath(); ctx.fillStyle = COL.star; ctx.fill();
      ctx.restore();
      rr(cx - cw / 2, cy - ch / 2, cw, ch, 14, null);
      ctx.strokeStyle = COL.cardEdge; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    var br = clamp(Math.min(W, H) * 0.070, 27, 50);
    var bx = W / 2, by = H - clamp(H * 0.13, 44, 92);
    drawVidare(bx, by, br, 'again', t);
    L.igen = { x: bx, y: by, r: br };
    var ty = by + br + clamp(H * 0.044, 14, 32);
    ctx.save();
    ctx.font = '700 ' + clamp(Math.min(W, H) * 0.028, 10, 16) + 'px "Trebuchet MS", sans-serif';
    var tw = ctx.measureText('en gång till').width + 22;
    rr(bx - tw / 2, ty - 12, tw, 24, 12, 'rgba(255,250,243,0.85)');
    ctx.restore();
    textFit('en gång till', bx, ty, W * 0.5, clamp(Math.min(W, H) * 0.028, 10, 16), COL.ink, 700);
  }

  function drawGnistor(dt) {
    for (var i = G.gnistor.length - 1; i >= 0; i--) {
      var g = G.gnistor[i];
      g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 260 * dt; g.liv -= dt;
      if (g.liv <= 0) { G.gnistor.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, g.liv);
      circ(g.x, g.y, 3.2, g.col);
      ctx.restore();
    }
  }

  function drawFlyg(t) {
    for (var i = G.flyg.length - 1; i >= 0; i--) {
      var f = G.flyg[i];
      var pr = clamp(f.t / f.dur, 0, 1);
      var e = 1 - Math.pow(1 - pr, 3);
      var x = f.x0 + (f.x1 - f.x0) * e;
      var y = f.y0 + (f.y1 - f.y0) * e - Math.sin(pr * Math.PI) * H * 0.06;
      var r = clamp(L.topBar * 0.20, 8, 15);
      ctx.save();
      ctx.translate(x, y); ctx.scale(r * 0.042, r * 0.042);
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var a = -Math.PI / 2 + k * Math.PI / 5;
        var rad = k % 2 ? 0.42 : 1;
        ctx.lineTo(Math.cos(a) * rad * 100, Math.sin(a) * rad * 100);
      }
      ctx.closePath(); ctx.fillStyle = COL.star; ctx.fill();
      ctx.restore();
    }
  }

  function draw(t) {
    try {
      drawBg(t);
      if (G.fas === 'intro') drawIntro(t);
      else if (G.fas === 'spel') drawSpel(t);
      else drawFest(t);
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
  }

  function update(dt) {
    if (G.skakT > 0) G.skakT = Math.max(0, G.skakT - dt);
    if (G.festT < 5) G.festT += dt;
    if (G.klarNu) {
      G.klarT += dt;
      if (G.klarT > VILA && G.auto && !G.pause) {
        if (G.runda + 1 >= RU.length) { tillFest(); }
        else { nyRunda(G.runda + 1); if (G.runda === RU.length - 1) say('Sista frågan nu!', true); }
      }
    }
    for (var i = G.flyg.length - 1; i >= 0; i--) {
      G.flyg[i].t += dt;
      if (G.flyg[i].t > G.flyg[i].dur + 0.1) G.flyg.splice(i, 1);
    }
    if (G.pause > 0) {
      G.pause -= dt;
      if (G.pause <= 0) {
        var f = G.glomd; G.glomd = null;
        if (f) f();
      }
    }
  }

  var forra = performance.now();
  function frame(ts) {
    try {
      nu = ts / 1000;
      var dt = Math.min(0.05, (ts - forra) / 1000);
      forra = ts;
      update(dt);
      draw(nu);
      drawGnistor(dt);
      drawFlyg(nu);
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- testkrok ---------------- */
  window.__vh = {
    state: function () {
      return {
        fas: G.fas, runda: G.runda, kort: G.kort.slice(), ratt: G.ratt,
        rattId: G.kort[G.ratt] || null,
        fel: G.fel, klarNu: G.klarNu, klar: G.klar.slice(),
        hint: G.hint, W: W, H: H,
        kortPos: L.kort.map(function (q) {
          return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.w), h: Math.round(q.h) };
        }),
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        igen: L.igen ? { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) } : null,
        fest: L.fest ? L.fest.length : 0,
        errs: errs.length
      };
    },
    start: function () { startSpel(); return this.state(); },
    tap: function (i) {
      if (G.fas === 'spel' && !G.klarNu && G.pause <= 0) {
        if (i === G.ratt) rattSvar(); else felSvar(i);
      }
      return this.state();
    },
    tapRatt: function () { return this.tap(G.ratt); },
    tapFel: function () {
      for (var i = 0; i < 4; i++) if (i !== G.ratt) { return this.tap(i); }
      return this.state();
    },
    runda: function (i) { nyRunda(i); return this.state(); },
    nasta: function () { G.klarNu = false; G.klarT = 0; nastaRunda(); return this.state(); },
    fest: function () { tillFest(); return this.state(); },
    auto: function (v) { G.auto = v !== false; return G.auto; },
    errs: function () { return errs.slice(); },
    rita: function () { try { draw(nu); drawFlyg(nu); } catch (e) { errs.push(String(e)); } return errs.length; }
  };

  layout();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();