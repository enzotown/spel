/* Vrid rätt — vrid biten tills den passar
 *
 * Kottens arbetsbänk: en träbit ligger på tallriken bredvid sin skugga i
 * bänken. Barnet trycker på biten och den vrids ett kvarts varv; när den står
 * rätt glider den ner i skuggan med ett klick, en stjärna flyger upp och
 * Kotten säger "Rätt! Den passar!".
 *
 * Tränar mental rotation — att vrida en form i huvudet — vilket är nästa steg
 * efter Spegelängen (spegla) och Mönsterbanan/Vad fattas (upprepa). Sex bitar,
 * sedan fest där alla åtta kan vridas fritt.
 *
 * Ingen förlust: varje tryck vrider bara, det finns ingen timer som straffar,
 * och en bit kan aldrig fastna. Efter en stund lyser skuggan som ledtråd.
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
    wood: '#d8a464', woodD: '#a86f2f', woodL: '#f0cf9f',
    star: '#f7c948', starD: '#dfa616',
    coral: '#e98061', teal: '#4fae94', tealD: '#3d8b76',
    blue: '#5b8fc9', leaf: '#6aa84f',
    shade: 'rgba(30,46,40,0.16)'
  };

  /* ---------------- bitarna ----------------
     Varje bit ritas i en 100x100-ruta med origo i hörnet, som en union av
     fyllda delar: polygoner (p), cirklar (c), ellipser (e), streck (s) och
     bågar (a). Ingen del har hål, så formen går att fylla i vilken färg som
     helst — samma kod ritar biten och skuggan i bänken. Alla bitar är
     osymmetriska, annars skulle två vridningar se likadana ut. */
  var FORM = {
    nyckel: { col: '#4fae94', delar: [
      { c: [22, 50, 19] },
      { p: [[38, 42], [84, 42], [84, 58], [38, 58]] },
      { p: [[74, 58], [82, 58], [82, 74], [74, 74]] },
      { p: [[58, 58], [66, 58], [66, 68], [58, 68]] }
    ] },
    stovel: { col: '#e98061', delar: [
      { p: [[28, 12], [54, 12], [54, 50], [64, 55], [78, 61], [88, 70], [90, 82], [26, 82]] },
      { p: [[24, 80], [90, 80], [90, 90], [24, 90]] }
    ] },
    fisk: { col: '#5b8fc9', delar: [
      { e: [44, 52, 30, 19, 0] },
      { p: [[70, 52], [96, 30], [96, 74]] },
      { p: [[44, 33], [58, 20], [60, 36]] }
    ] },
    svamp: { col: '#e0a94f', delar: [
      { e: [50, 40, 36, 24, 0] },
      { p: [[41, 52], [59, 52], [57, 86], [43, 86]] }
    ] },
    kanna: { col: '#7bb85c', delar: [
      { p: [[20, 24], [68, 24], [68, 34], [20, 34]] },
      { p: [[24, 32], [64, 32], [72, 84], [20, 84]] },
      { p: [[22, 26], [6, 12], [26, 12]] },
      { a: [68, 56, 15, -1.15, 1.15, 8] }
    ] },
    hammare: { col: '#a2739e', delar: [
      { p: [[12, 16], [72, 16], [76, 40], [12, 40]] },
      { p: [[50, 40], [60, 40], [64, 88], [54, 88]] },
      { p: [[72, 16], [82, 24], [74, 40]] }
    ] },
    lov: { col: '#8aa83c', delar: [
      { p: [[44, 8], [84, 24], [74, 58], [48, 86], [24, 68], [18, 34]] },
      { s: [36, 84, 32, 98, 5] }
    ] },
    sked: { col: '#e08aa6', delar: [
      { e: [50, 26, 27, 24, 0] },
      { p: [[46, 46], [54, 46], [56, 84], [44, 84]] },
      { p: [[43, 82], [57, 82], [57, 92], [43, 92]] }
    ] }
  };

  var ORDNING = ['nyckel', 'stovel', 'fisk', 'svamp', 'kanna', 'hammare', 'lov', "sked"];
  var RUNDOR = [
    { id: 'nyckel' },
    { id: 'stovel' },
    { id: "fisk" },
    { id: 'svamp' },
    { id: 'kanna' },
    { id: 'hammare' }
  ];
  var VILA = 3.2;      /* sekunder efter att biten fallit på plats */
  var HJALP = 8.5;     /* sekunder innan skuggan börjar lysa */

  var W = 0, H = 0, DPR = 1, nu = 0;
  var L = {};

  var G = {
    fas: 'intro',            /* intro | spel | fest */
    runda: 0,
    id: null,
    rot: 1,                  /* 0 = rätt, annars antal kvartsvarv kvar */
    rotVis: 0,               /* visad vinkel i grader */
    klar: [false, false, false, false, false, false],
    klarNu: false, klarT: 0, snap: 0,
    hint: 0, tid: 0, hintSagd: false,
    pause: 0, glomd: null,
    gnistor: [], flyg: [],
    festBit: [], festVal: -1,
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
  /* träklapp när biten vrids — stiger ett steg för varje kvartsvarv */
  function knap(steg) {
    tone(300 + steg * 55, 0.09, 0.11, 'triangle', 220 + steg * 40);
    tone(880 + steg * 90, 0.05, 0.03, 'square');
  }
  function plats() {
    tone(660, 0.12, 0.09, 'triangle');
    setTimeout(function () { tone(990, 0.18, 0.08, 'triangle'); }, 110);
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

    var land = W / H > 1.06;
    var m = clamp(Math.min(W, H) * 0.028, 8, 24);
    var topBar = Math.max(76, H * 0.145);
    var kW = clamp(Math.min(W, H) * 0.155, 52, 122);
    var kRom = kW * 0.82;
    var S, bx, by;

    if (land) {
      var availW = W - (kW + 3.2 * m);
      var availH = H - topBar - 2.2 * m;
      S = Math.max(220, Math.min(availW, availH));
      bx = (W - S) / 2;
      by = topBar + Math.max(0, (H - topBar - S) / 2 - m * 0.3);
      L.kotten = { x: m + kW * 0.46, y: H - m * 0.5, w: kW };
    } else {
      S = Math.max(210, Math.min(W - 2 * m, H - topBar - kRom - 2.4 * m));
      bx = (W - S) / 2;
      by = topBar + Math.max(2, (H - topBar - kRom - S) / 2);
      L.kotten = { x: m + kW * 0.46, y: H - m * 0.4, w: kW };
    }

    L.land = land; L.m = m; L.topBar = topBar; L.kRom = kRom;
    L.board = { x: bx, y: by, s: S };
    L.hol = { x: bx + S * 0.335, y: by + S * 0.53, s: S * 0.285 };
    L.tray = { x: bx + S * 0.695, y: by + S * 0.53, s: S * 0.285 };

    var r = clamp(topBar * 0.21, 8, 16), g2 = r * 2.45;
    var x0 = W - m - r - 5 * g2;
    L.stjar = [];
    for (var k = 0; k < 6; k++) L.stjar.push({ x: x0 + k * g2, y: topBar * 0.5, r: r });
    L.infoZone = 0;
  }

  /* ---------------- spelgång ---------------- */
  function nyRunda(i) {
    G.runda = i;
    G.id = RUNDOR[i].id;
    G.rot = 1 + Math.floor(Math.random() * 3);   /* 1–3 kvartsvarv kvar */
    G.rotVis = G.rot * 90;
    G.klarNu = false; G.klarT = 0; G.snap = 0;
    G.hint = 0; G.tid = 0; G.hintSagd = false;
    G.pause = 0; G.glomd = null; G.festVal = -1;
  }

  function startSpel(fromFest) {
    G.fas = 'spel';
    G.klar = [false, false, false, false, false, false];
    G.gnistor = []; G.flyg = []; G.festVal = -1;
    nyRunda(0);
    if (!fromFest) say('Tryck på biten och vrid den tills den passar.', true);
    else say('Nu igen!', true);
  }

  function vrid() {
    if (G.fas !== 'spel' || G.klarNu || G.pause > 0) return;
    G.rot = (G.rot + 3) % 4;              /* ett kvarts varv per tryck, alltid åt samma håll */
    knap(G.rot);
    if (window.__sma) { try { window.__sma('plock'); } catch (e) {} }
    if (G.rot === 0) rattPassa();
  }

  function rattPassa() {
    if (G.klarNu) return;
    G.klarNu = true; G.klarT = 0; G.snap = 0;
    G.klar[G.runda] = true;
    G.hint = 0;
    plats();
    say('Rätt! Den passar!', true);
    var h = L.hol;
    for (var i = 0; i < 20; i++) {
      G.gnistor.push({
        x: h.x + (Math.random() - 0.5) * h.s,
        y: h.y + (Math.random() - 0.5) * h.s,
        vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 250,
        liv: 1.3, col: ['#f7c948', '#ffffff', '#e98061', '#4fae94'][i % 4]
      });
    }
    G.flyg.push({ x0: h.x, y0: h.y, x1: L.stjar[G.runda].x, y1: L.stjar[G.runda].y, t: 0, dur: 0.95 });
  }

  function nastaRunda() {
    if (G.runda + 1 >= RUNDOR.length) { tillFest(); return; }
    nyRunda(G.runda + 1);
    if (G.runda === RUNDOR.length - 1) say('Sista biten nu!', true);
  }

  function tillFest() {
    G.fas = 'fest';
    G.festVal = -1;
    G.pause = 0; G.glomd = null;
    fanfar();
    say('Alla passar! Bra jobbat!', true);
    setTimeout(function () {
      if (G.fas === 'fest') say('Här kan du vrida alla bitar hur mycket du vill.');
    }, 3000);
    for (var i = 0; i < 40; i++) {
      G.gnistor.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.7,
        y: H * 0.24 + Math.random() * H * 0.18,
        vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 320,
        liv: 1.5, col: ['#f7c948', '#e98061', '#4fae94', '#5b8fc9'][i % 4]
      });
    }
    byggFest();
  }

  /* fri lek: alla åtta bitar på en bänk, tryck för att vrida */
  function byggFest() {
    var top = L.topBar + clamp(H * 0.075, 26, 56);
    var botten = clamp(H * 0.20, 70, 150);
    var cols = L.land ? 4 : 4, rows = 2;
    var gap = clamp(Math.min(W, H) * 0.022, 8, 22);
    var availW = W - 2 * L.m;
    var availH = H - top - botten;
    var cw = Math.min((availW - (cols - 1) * gap) / cols, (availH - (rows - 1) * gap) / rows);
    cw = Math.min(cw, 260);
    var ch = cw;
    var totW = cols * cw + (cols - 1) * gap, totH = rows * ch + (rows - 1) * gap;
    var x0 = W / 2 - totW / 2 + cw / 2;
    var y0 = top + Math.max(0, (availH - totH) / 2) + ch / 2;
    G.festBit = [];
    for (var i = 0; i < ORDNING.length; i++) {
      G.festBit.push({
        id: ORDNING[i], x: x0 + (i % cols) * (cw + gap), y: y0 + Math.floor(i / cols) * (ch + gap),
        w: cw, h: ch, rot: i % 4, rotVis: (i % 4) * 90, klar: i % 4 === 0, glod: 0
      });
    }
  }

  /* ---------------- pek ---------------- */
  function pos(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function bitAt(p) {
    var t = G.klarNu ? L.hol : L.tray;
    var r = L.tray.s * 0.78;
    var dx = p.x - t.x, dy = p.y - t.y;
    return dx * dx + dy * dy < r * r;
  }
  function festAt(p) {
    for (var i = 0; i < G.festBit.length; i++) {
      var b = G.festBit[i];
      if (Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2) return i;
    }
    return -1;
  }
  function knappAt(p) {
    if (!L.igen) return false;
    var dx = p.x - L.igen.x, dy = p.y - L.igen.y;
    return dx * dx + dy * dy < L.igen.r * L.igen.r * 1.8;
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    var p = pos(e);
    if (G.fas === 'intro') {
      if (!L.start || Math.hypot(p.x - L.start.x, p.y - L.start.y) < L.start.r * 1.8 ||
          p.y > L.start.y - L.start.r * 1.2) startSpel();
      return;
    }
    if (G.fas === 'fest') {
      if (knappAt(p)) { startSpel(true); return; }
      var fi = festAt(p);
      if (fi >= 0) {
        var b = G.festBit[fi];
        b.rot = (b.rot + 1) % 4;
        b.glod = 0;
        G.festVal = fi;
        knap(b.rot);
        if (b.rot === 0 && !b.klar) {
          b.klar = true;
          plats();
          for (var i = 0; i < 10; i++) {
            G.gnistor.push({
              x: b.x + (Math.random() - 0.5) * b.w * 0.45,
              y: b.y, vx: (Math.random() - 0.5) * 180, vy: -Math.random() * 200,
              liv: 1.1, col: ['#f7c948', '#ffffff'][i % 2]
            });
          }
        } else if (b.rot === 0) plats();
      }
      return;
    }
    if (G.pause > 0 || G.klarNu) return;
    if (bitAt(p)) vrid();
  }, { passive: false });

  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); if (G.fas === 'fest') byggFest(); });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { layout(); if (G.fas === 'fest') byggFest(); }, 120);
  });

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
  function ln(x1, y1, x2, y2, col, w, cap) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.lineCap = cap || 'round'; ctx.stroke();
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

  /* ritar en bit (eller dess skugga) — union av delarna i samma färg */
  function ritaForm(id, x, y, s, grad, col, kant) {
    var f = FORM[id];
    if (!f) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(grad * Math.PI / 180);
    ctx.scale(s / 100, s / 100);
    ctx.translate(-50, -50);
    var lager = kant ? [[1.055, kant], [1, col]] : [[1, col]];
    for (var l = 0; l < lager.length; l++) {
      var k = lager[l][0], c = lager[l][1];
      ctx.save();
      ctx.translate(50, 50); ctx.scale(k, k); ctx.translate(-50, -50);
      ctx.fillStyle = c; ctx.strokeStyle = c;
      for (var i = 0; i < f.delar.length; i++) {
        var d = f.delar[i];
        if (d.p) {
          ctx.beginPath();
          ctx.moveTo(d.p[0][0], d.p[0][1]);
          for (var j = 1; j < d.p.length; j++) ctx.lineTo(d.p[j][0], d.p[j][1]);
          ctx.closePath(); ctx.fill();
        } else if (d.c) {
          ctx.beginPath(); ctx.arc(d.c[0], d.c[1], d.c[2], 0, Math.PI * 2); ctx.fill();
        } else if (d.e) {
          ctx.beginPath(); ctx.ellipse(d.e[0], d.e[1], d.e[2], d.e[3], d.e[4] || 0, 0, Math.PI * 2); ctx.fill();
        } else if (d.s) {
          ctx.beginPath(); ctx.moveTo(d.s[0], d.s[1]); ctx.lineTo(d.s[2], d.s[3]);
          ctx.lineWidth = d.s[4]; ctx.lineCap = 'round'; ctx.stroke();
        } else if (d.a) {
          ctx.beginPath(); ctx.arc(d.a[0], d.a[1], d.a[2], d.a[3], d.a[4]);
          ctx.lineWidth = d.a[5]; ctx.lineCap = 'round'; ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBg(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.sky1);
    g.addColorStop(1, COL.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.45;
    for (var i = 0; i < 3; i++) {
      var cx = ((t * 5 + i * 440 + 60) % (W + 300)) - 150;
      var cy = L.topBar + 14 + i * 18;
      ell(cx, cy, 18, 10, '#ffffff');
      ell(cx + 22, cy + 3, 14, 8, '#ffffff');
      ell(cx - 20, cy + 4, 10, 6, '#ffffff');
    }
    ctx.restore();
    var gy = H - clamp(H * 0.05, 18, 46);
    ctx.save(); ctx.globalAlpha = 0.5;
    ell(W * 0.5, gy + H * 0.06, W * 0.62, H * 0.06, '#cfe0b4');
    ctx.restore();
  }

  function drawStjar() {
    for (var i = 0; i < 6; i++) {
      var s = L.stjar[i];
      if (G.klar[i]) {
        circ(s.x, s.y, s.r, COL.star);
        ctx.save();
        ctx.translate(s.x, s.y); ctx.scale(s.r * 0.052, s.r * 0.052);
        ctx.beginPath();
        for (var k = 0; k < 10; k++) {
          var a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? 0.44 : 1;
          ctx.lineTo(Math.cos(a) * rad * 100, Math.sin(a) * rad * 100);
        }
        ctx.closePath(); ctx.fillStyle = '#fff8e0'; ctx.fill();
        ctx.restore();
      } else {
        ctx.save(); ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#c3ab8b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawHuvud() {
    var ts = clamp(Math.min(W, H) * 0.052, 13, 26);
    ctx.save();
    ctx.font = '800 ' + ts + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COL.ink;
    var txt = 'Vrid rätt';
    var maxW = L.stjar[0].x - L.stjar[0].r - L.m - 12;
    while (ctx.measureText(txt).width > maxW && ts > 11) {
      ts -= 1;
      ctx.font = '800 ' + ts + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    }
    ctx.fillText(txt, L.m, L.topBar * 0.5);
    ctx.restore();
    drawStjar();
  }

  function drawBrada() {
    var b = L.board, S = b.s;
    ctx.save(); ctx.globalAlpha = 0.2;
    rr(b.x + 4, b.y + 10, S, S, S * 0.05, '#3f3a34');
    ctx.restore();
    var g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + S);
    g.addColorStop(0, '#e8bb85');
    g.addColorStop(1, '#cd9555');
    rr(b.x, b.y, S, S, S * 0.05, g);

    ctx.save();
    rr(b.x, b.y, S, S, S * 0.05, null);
    ctx.clip();
    ctx.globalAlpha = 0.28;
    for (var i = 0; i < 7; i++) {
      var y = b.y + S * (0.10 + i * 0.13);
      ctx.beginPath();
      ctx.moveTo(b.x - 10, y);
      ctx.bezierCurveTo(b.x + S * 0.33, y - S * 0.03, b.x + S * 0.66, y + S * 0.03, b.x + S + 10, y);
      ctx.strokeStyle = '#b27b3c'; ctx.lineWidth = Math.max(1, S * 0.006); ctx.stroke();
    }
    ctx.restore();
    rr(b.x, b.y, S, S, S * 0.05, null);
    ctx.strokeStyle = '#a86f2f'; ctx.lineWidth = Math.max(2, S * 0.008); ctx.stroke();

    [0.055, 0.945].forEach(function (fx) {
      circ(b.x + S * fx, b.y + S * 0.055, S * 0.017, '#9c8b78');
      circ(b.x + S * 0.945 - S * 0.017, b.y + S * 0.055, S * 0.017, '#9c8b78');
    });
  }

  function drawSkugga(t) {
    var h = L.hol, s = h.s;
    /* ljus kant runt urtaget */
    ritaForm(G.id, h.x, h.y, s * 1.075, 0, '#eccfa2');
    ritaForm(G.id, h.x, h.y, s, 0, '#5d4a3a', '#4a382c');

    if (G.hint > 0 && !G.klarNu) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 5.4);
      ctx.strokeStyle = '#fff3cf';
      ctx.lineWidth = Math.max(3, s * 0.03);
      ctx.setLineDash([s * 0.09, s * 0.07]);
      ctx.beginPath(); ctx.arc(h.x, h.y, s * 0.60, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawTallrik(t) {
    /* ingen tallrik: biten ligger lös på bänken, med en tunn kritring som
       visar var den hörs hemma. En ljus skiva under biten lästes som ett
       andra urtag (vision: "circular cutout containing the key"). */
    if (G.klarNu) return;
    var q = L.tray, r = q.s * 0.66;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#fdf3df';
    ctx.lineWidth = Math.max(1.6, q.s * 0.010);
    ctx.setLineDash([q.s * 0.05, q.s * 0.05]);
    ctx.beginPath(); ctx.arc(q.x, q.y + q.s * 0.02, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawBitSpel(t) {
    var q = L.tray, h = L.hol;
    var grad = G.rotVis;
    var x = q.x, y = q.y, s = q.s;
    if (G.klarNu) {
      var pr = clamp(G.klarT / 0.42, 0, 1);
      var e = 1 - Math.pow(1 - pr, 3);
      x = q.x + (h.x - q.x) * e;
      y = q.y + (h.y - q.y) * e - Math.sin(pr * Math.PI) * L.board.s * 0.04;
      s = q.s * (1 - 0.03 * Math.sin(pr * Math.PI));
    }
    ctx.save();
    ctx.globalAlpha = 0.16;
    ritaForm(G.id, x + s * 0.03, y + s * 0.06, s, grad, '#3f3a34');
    ctx.restore();
    ritaForm(G.id, x, y, s, grad, FORM[G.id].col, '#4a382c');

    if (G.klarNu) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 9);
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = Math.max(3, s * 0.02);
      ctx.beginPath(); ctx.arc(h.x, h.y, s * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else {
      /* vrid-pillen: en båge med pil, pulserar tills barnet tryckt */
      var pu = 1 + 0.06 * Math.sin(t * 4.4);
      var bx = q.x, by = q.y + q.s * 0.72;
      var br = clamp(q.s * 0.115, 13, 26) * pu;
      circ(bx, by, br, '#fffaf3');
      ctx.save();
      ctx.strokeStyle = COL.tealD; ctx.lineWidth = Math.max(2.6, br * 0.16); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(bx, by, br * 0.52, -Math.PI * 0.95, Math.PI * 0.35); ctx.stroke();
      var ax = bx + Math.cos(Math.PI * 0.35) * br * 0.52, ay = by + Math.sin(Math.PI * 0.35) * br * 0.52;
      ctx.beginPath();
      ctx.moveTo(ax + br * 0.20, ay + br * 0.02);
      ctx.lineTo(ax - br * 0.10, ay - br * 0.16);
      ctx.lineTo(ax - br * 0.02, ay + br * 0.22);
      ctx.closePath(); ctx.fillStyle = COL.tealD; ctx.fill();
      ctx.restore();
    }
  }

  function drawSpel(t) {
    drawHuvud();
    drawBrada();
    drawSkugga(t);
    drawTallrik(t);
    drawBitSpel(t);

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
    textFit('Vrid rätt', W / 2, titelY, W * 0.8, clamp(Math.min(W, H) * 0.115, 28, 70), COL.ink, 800);
    textFit('vrid biten tills den passar', W / 2, titelY + clamp(H * 0.075, 22, 50),
            W * 0.82, clamp(Math.min(W, H) * 0.038, 11, 23), COL.muted, 700);

    /* demonstration: en nyckel som vrider sig långsamt, med skuggan bredvid */
    var s = clamp(Math.min(W, H) * 0.20, 60, 150);
    var cy = H * 0.52;
    var dx = Math.min(W * 0.19, s * 1.15);
    ritaForm('nyckel', W / 2 - dx, cy, s, 0, '#5d4a3a', '#4a382c');
    ritaForm('nyckel', W / 2 + dx, cy, s, (t * 42) % 360, FORM.nyckel.col, '#4a382c');

    var kw = clamp(Math.min(W, H) * 0.17, 62, 130);
    var kx = clamp(W * 0.14, kw * 0.7, W * 0.28), ky = H * 0.95;
    ctx.save(); ctx.globalAlpha = 0.15;
    ell(kx, ky - 2, kw * 0.26, kw * 0.05, '#3f3a34');
    ctx.restore();
    K(kx, ky, kw, { wave: 0.5 + 0.5 * Math.sin(t * 5) });

    var br = clamp(Math.min(W, H) * 0.085, 30, 58);
    var bx = W * 0.66, by = H * 0.85;
    drawVidare(bx, by, br, 'play', t);
    L.start = { x: bx, y: by, r: br };
    var ty = by + br + clamp(H * 0.042, 14, 30);
    ctx.save();
    ctx.font = '700 ' + clamp(Math.min(W, H) * 0.028, 10, 16) + 'px "Trebuchet MS", sans-serif';
    var tw = ctx.measureText('tryck för att börja').width + 22;
    rr(bx - tw / 2, ty - 12, tw, 24, 12, 'rgba(255,250,243,0.85)');
    ctx.restore();
    textFit('tryck för att börja', bx, ty, W * 0.6, clamp(Math.min(W, H) * 0.028, 10, 16), COL.ink, 700);
  }

  function drawFest(t) {
    drawHuvud();
    var titelY = L.topBar + clamp(H * 0.04, 14, 34);
    textFit('Alla passar!', W / 2, titelY, W * 0.8, clamp(Math.min(W, H) * 0.058, 17, 38), COL.ink, 800);

    for (var i = 0; i < G.festBit.length; i++) {
      var b = G.festBit[i];
      var s = Math.min(b.w, b.h) * 0.62;
      ctx.save(); ctx.globalAlpha = 0.16;
      rr(b.x - b.w / 2 + 4, b.y - b.h / 2 + 7, b.w, b.h, 18, '#3f3a34');
      ctx.restore();
      var g = ctx.createLinearGradient(b.x, b.y - b.h / 2, b.x, b.y + b.h / 2);
      g.addColorStop(0, '#e8bb85'); g.addColorStop(1, '#d29a5b');
      rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 18, g);
      rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 18, null);
      ctx.strokeStyle = 'rgba(168,111,47,0.65)'; ctx.lineWidth = 2; ctx.stroke();

      if (b.klar) {
        ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 3 + i);
        ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = Math.max(3, b.w * 0.014);
        rr(b.x - b.w / 2 + 4, b.y - b.h / 2 + 4, b.w - 8, b.h - 8, 15, null); ctx.stroke();
        ctx.restore();
      }
      ritaForm(b.id, b.x, b.y, s, b.rotVis, FORM[b.id].col, '#4a382c');
      if (b.klar) {
        ctx.save();
        ctx.translate(b.x + b.w / 2 - b.w * 0.16, b.y - b.h / 2 + b.w * 0.16);
        ctx.scale(b.w * 0.00028, b.w * 0.00028);
        ctx.beginPath();
        for (var k = 0; k < 10; k++) {
          var a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? 0.44 : 1;
          ctx.lineTo(Math.cos(a) * rad * 100, Math.sin(a) * rad * 100);
        }
        ctx.closePath(); ctx.fillStyle = COL.star; ctx.fill();
        ctx.restore();
      }
    }

    var br = clamp(Math.min(W, H) * 0.070, 27, 50);
    var bx = W / 2, by = H - clamp(H * 0.115, 42, 88);
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
      ctx.save(); ctx.globalAlpha = Math.min(1, g.liv);
      circ(g.x, g.y, 3.2, g.col);
      ctx.restore();
    }
  }

  function drawFlyg() {
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
        var a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? 0.42 : 1;
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
    /* vridningen glider mjukt till sitt kvartsvarv */
    var mal = G.klarNu ? 0 : G.rot * 90;
    var d = mal - G.rotVis;
    if (Math.abs(d) > 0.2) G.rotVis += d * Math.min(1, dt * 13);
    else G.rotVis = mal;

    if (G.fas === 'spel' && !G.klarNu && G.pause <= 0) {
      G.tid += dt;
      if (G.tid > HJALP && !G.hintSagd) {
        G.hintSagd = true; G.hint = 1;
        say('Titta på skuggan!', true);
      }
    }
    if (G.klarNu) {
      G.klarT += dt;
      if (G.klarT > VILA && G.auto && !G.pause) {
        G.klarNu = false;
        nastaRunda();
      }
    }
    for (var i = G.festBit.length - 1; i >= 0; i--) {
      var b = G.festBit[i];
      var dd = (b.klar ? 0 : b.rot * 90) - b.rotVis;
      if (Math.abs(dd) > 0.2) b.rotVis += dd * Math.min(1, dt * 13); else b.rotVis = b.klar ? 0 : b.rot * 90;
    }
    for (var j = G.flyg.length - 1; j >= 0; j--) {
      G.flyg[j].t += dt;
      if (G.flyg[j].t > G.flyg[j].dur + 0.1) G.flyg.splice(j, 1);
    }
    if (G.pause > 0) {
      G.pause -= dt;
      if (G.pause <= 0) { var f = G.glomd; G.glomd = null; if (f) f(); }
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
      drawFlyg();
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- testkrok ---------------- */
  window.__vr = {
    state: function () {
      return {
        fas: G.fas, runda: G.runda, id: G.id, rot: G.rot, rotVis: Math.round(G.rotVis),
        klarNu: G.klarNu, klar: G.klar.slice(), hint: G.hint, W: W, H: H,
        bit: { x: Math.round((G.klarNu ? L.hol : L.tray).x), y: Math.round((G.klarNu ? L.hol : L.tray).y), s: Math.round(L.tray.s), r: Math.round(L.tray.s * 0.78) },
        hol: { x: Math.round(L.hol.x), y: Math.round(L.hol.y), s: Math.round(L.hol.s) },
        tray: { x: Math.round(L.tray.x), y: Math.round(L.tray.y), s: Math.round(L.tray.s) },
        board: { x: Math.round(L.board.x), y: Math.round(L.board.y), s: Math.round(L.board.s) },
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        igen: L.igen ? { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) } : null,
        fest: G.festBit.map(function (b) {
          return { id: b.id, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), rot: b.rot, klar: b.klar };
        }),
        errs: errs.length
      };
    },
    start: function () { startSpel(); return this.state(); },
    vrid: function () { vrid(); return this.state(); },
    solve: function () { var n = 0; while (G.rot !== 0 && n++ < 5) vrid(); return this.state(); },
    nasta: function () { G.klarNu = false; G.klarT = 0; nastaRunda(); return this.state(); },
    fest: function () { tillFest(); return this.state(); },
    runda: function (i) { nyRunda(i); return this.state(); },
    auto: function (v) { G.auto = v !== false; return G.auto; },
    hinta: function () { G.hint = 1; return this.state(); },
    errs: function () { return errs.slice(); },
    rita: function () { try { draw(nu); drawFlyg(); } catch (e) { errs.push(String(e)); } return errs.length; }
  };

  layout();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();