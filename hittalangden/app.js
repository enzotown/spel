/* Hitta längden — vilken sak är precis lika lång som ribban?
 *
 * En ribba av klossar ligger på bänken: tre, fyra, fem eller sex klossar kant i
 * kant. Under den står tre saker på hyllan, och bara en av dem är exakt lika lång
 * som ribban. Barnet trycker på en sak — den lyfts ner, läggs kant i kant med
 * ribbans vänsterkant och barnet ser själv om den når ända fram.
 *
 * Rätt sak stannar, får en stjärna och rösten säger längden i ord. Fel sak sägs
 * vänligt ("Fem klossar. Leta vidare!") och flyttas tillbaka — inga minuspoäng,
 * ingen förlust, och efter två försök lyser rätt sak.
 *
 * Mätningens trappa baklänges: måttet är givet och barnet ska hitta saken som
 * passar (indirekt jämförelse + transitivity). Fyra rundor → fest där alla sju
 * sakerna får höras igen.
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#eaf3e2', wall2: '#d6e6c8',
    cream: '#fffaf3', cream2: '#f4e8d4', ink: '#3f4a3a', muted: '#7c8774',
    wood: '#d0955a', woodD: '#a86f2f', woodL: '#eec08c', woodPale: '#f6dcba',
    green: '#6aa84f', greenD: '#4c8039',
    star: '#f7c948', starD: '#dfa616',
    red: '#d9584f', blue: '#5f93c9', orange: '#e8843c', grey: '#8a8f98'
  };

  /* ---------------- innehåll ---------------- */

  var SAKER = {
    bok:     { id: 'bok',     namn: 'boken',    best: 'Boken',    n: 3, hb: 1.45, farg: '#5f93c9' },
    sked:    { id: 'sked',    namn: 'skeden',   best: 'Skeden',   n: 3, hb: 0.62, farg: '#bfb8a8' },
    hammare: { id: 'hammare', namn: 'hammaren', best: 'Hammaren', n: 4, hb: 1.50, farg: '#8a8f98' },
    bank:    { id: 'bank',    namn: 'bänken',   best: 'Bänken',   n: 4, hb: 1.20, farg: '#c98d4f' },
    stovel:  { id: 'stovel',  namn: 'stöveln',  best: 'Stöveln',  n: 5, hb: 1.90, farg: '#b8543f' },
    morot:   { id: 'morot',   namn: 'moroten',  best: 'Moroten',  n: 5, hb: 0.68, farg: '#e8843c' },
    pinne:   { id: 'pinne',   namn: 'pinnen',   best: 'Pinnen',   n: 6, hb: 0.52, farg: '#9c6434' }
  };

  var RUNDOR = [
    { n: 3, ids: ['bok', 'stovel', 'pinne'] },
    { n: 4, ids: ['sked', 'bank', 'morot'] },
    { n: 5, ids: ['hammare', 'stovel', 'pinne'] },
    { n: 6, ids: ['pinne', 'sked', 'morot'] }
  ];

  var ORD = ['', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta'];
  var ORD_STOR = ['', 'Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex', 'Sju', 'Åtta'];

  function runda() { return RUNDOR[G.ri] || RUNDOR[0]; }
  function mal() { return runda().n; }
  function fraga() { return 'Hitta den som är ' + ORD[mal()] + ' klossar lång.'; }

  /* ---------------- tillstånd ---------------- */

  var W = 0, H = 0, DPR = 1, nu = 0;
  var L = {
    m: 16, s: 1, qY: 0, bw: 48, gap: 12, x0: 0,
    ribbaTop: 0, cmpTop: 0, cmpBottom: 0,
    shelfY: 0, shelfTop: 0, shelfH: 0, ppbShelf: 30, slotW: 100, gapS: 8, slotX: [0, 0, 0],
    start: null, igen: null, nasta: null
  };
  var G = {
    fas: 'intro', ri: 0, jmf: null, forsok: 0, glow: 0,
    stjarnor: 0, tid: 0, saidT: -1,
    timers: [], gnistor: [], shelfHits: [], festHits: [], hits: []
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
    g.gain.linearRampToValueAtTime(vol == null ? 0.12 : vol, a.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function lyft() { tone(420, 0.11, 0.09, 'sine', 700); }
  function pling() { tone(660, 0.10, 0.08, 'triangle'); setTimeout(function () { tone(990, 0.14, 0.06, 'triangle'); }, 95); }
  function nej() { tone(230, 0.16, 0.06, 'triangle', 175); }
  function fanfar() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.26, 0.09, 'triangle'); }, i * 120);
    });
  }
  function pet() { tone(880, 0.05, 0.03, 'sine'); }

  function say(text, avbryt) {
  /* rösten är en inspelad mp3-fil (Shipholm TTS) – saknas den är appen tyst */
  if (!text) return;
  if (window.__rost && window.__rost(text)) return;
}

  function efter(ms, fn) { G.timers.push({ t: ms / 1000, fn: fn }); }

  /* ---------------- layout ---------------- */

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function layout() {
    W = Math.max(300, innerWidth);
    H = Math.max(320, innerHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';

    var s = clamp(Math.min(W, H) / 768, 0.62, 1.35);
    var m = clamp(Math.min(W, H) * 0.032, 10, 26);
    var starR = clamp(9 * s, 6, 12);
    var qY = m + starR * 2 + 14 * s;

    var shelfH = clamp(H * 0.20, 88, 170);
    var padBot = clamp(H * 0.045, 18, 44);

    var roomTop = qY + clamp(24 * s, 16, 40);
    var bw = clamp(Math.min((W / 2 - m) / 4.6, (H * 0.42) / 3.05), 22, 96);
    var gap = clamp(bw * 0.22, 8, 24);
    var gapShelf = clamp(30 * s, 16, 52);
    var groupH = bw + gap + 1.9 * bw + gapShelf + shelfH * 1.34;
    var ledig = Math.max(0, H - padBot - roomTop - groupH);
    var groupTop = roomTop + Math.min(ledig * 0.55, ledig);

    var n = mal();

    L.s = s; L.m = m; L.qY = qY;
    L.bw = bw; L.gap = gap;
    L.ribbaTop = groupTop;
    L.cmpTop = groupTop + bw + gap;
    L.cmpBottom = groupTop + bw + gap + 1.9 * bw;
    L.x0 = W / 2 - (n * bw) / 2;

    L.shelfH = shelfH; L.shelfY = groupTop + bw + gap + 1.9 * bw + gapShelf + shelfH;
    L.shelfTop = L.shelfY - shelfH;
    var gapS = clamp(m * 0.7, 6, 20);
    var slotW = (W - 2 * m - 2 * gapS) / 3;
    L.gapS = gapS; L.slotW = slotW;
    L.slotX = [m, m + slotW + gapS, m + 2 * (slotW + gapS)];
    L.ppbShelf = Math.min(slotW * 0.88 / 6.2, shelfH / 2.05);

    var br = clamp(Math.min(W, H) * 0.10, 34, 66);
    L.start = { x: W / 2, y: H - clamp(H * 0.16, 64, 132), r: br };
    L.igen = { x: W / 2, y: H - br * 0.72 - 30 * s, r: br * 0.72 };
    L.nasta = { x: W / 2, y: H - br * 0.86 - 14 * s - 10, r: br * 0.86 };
  }

  /* ---------------- ritning: grunder ---------------- */

  function rr(x, y, w, h, r, fill) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
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
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function txt(s, x, y, size, col, align, weight, maxW) {
    weight = weight || 800;
    var f = size;
    ctx.font = weight + ' ' + f + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    if (maxW) {
      while (ctx.measureText(s).width > maxW && f > 9) {
        f -= 1;
        ctx.font = weight + ' ' + f + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
      }
    }
    ctx.fillStyle = col;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
    return f;
  }
  function star(x, y, r, fill, edge) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr2 = (i % 2 ? r * 0.46 : r);
      var px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, r * 0.13); ctx.stroke(); }
  }

  /* ---------------- sakerna (ritas i rutan x..x+w, vilar på yb) ------------- */

  function skugga(x, yb, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(80,70,50,.16)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, yb + 1, w * 0.47, Math.max(2, w * 0.04), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBok(x, yb, w, h) {
    skugga(x, yb, w);
    var top = yb - h;
    /* sidorna sticker ut till höger */
    rr(x + w * 0.10, top + h * 0.06, w * 0.90, h * 0.88, h * 0.07, '#f7f2e6');
    ctx.strokeStyle = '#d9d2c0'; ctx.lineWidth = Math.max(1, h * 0.028);
    for (var i = 0; i < 4; i++) {
      var yy = top + h * (0.20 + i * 0.15);
      ctx.beginPath(); ctx.moveTo(x + w * 0.84, yy); ctx.lineTo(x + w * 0.94, yy); ctx.stroke();
    }
    /* pärmen */
    rr(x, top, w * 0.87, h * 0.94, h * 0.09, '#5f93c9');
    ctx.fillStyle = '#45719e';
    rr(x, top, w * 0.07, h * 0.94, h * 0.06, '#45719e');
    /* pärmens överkant ljusare */
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    rr(x + w * 0.07, top + h * 0.02, w * 0.78, h * 0.07, h * 0.04, 'rgba(255,255,255,.30)');
    /* titelband och en bildruta */
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    rr(x + w * 0.14, top + h * 0.18, w * 0.44, h * 0.14, h * 0.05, 'rgba(255,255,255,.62)');
    rr(x + w * 0.14, top + h * 0.44, w * 0.34, h * 0.10, h * 0.04, 'rgba(255,255,255,.38)');
    /* bokmärke */
    ctx.beginPath();
    ctx.moveTo(x + w * 0.62, top + h * 0.94);
    ctx.lineTo(x + w * 0.62, top + h * 1.06);
    ctx.lineTo(x + w * 0.68, top + h * 1.00);
    ctx.lineTo(x + w * 0.74, top + h * 1.06);
    ctx.lineTo(x + w * 0.74, top + h * 0.94);
    ctx.closePath();
    ctx.fillStyle = '#e8843c'; ctx.fill();
  }

  function drawBank(x, yb, w, h) {
    skugga(x, yb, w);
    var seatY = yb - h * 0.60;
    var t = Math.max(3, h * 0.17);
    var legW = Math.max(4, w * 0.05);
    rr(x + w * 0.07, seatY + t * 0.4, legW, yb - seatY - t * 0.4, 2, COL.woodD);
    rr(x + w * 0.87 - legW, seatY + t * 0.4, legW, yb - seatY - t * 0.4, 2, COL.woodD);
    rr(x, seatY, w, t, 3, COL.wood);
    ctx.fillStyle = COL.woodL;
    ctx.fillRect(x + 2, seatY + 1, Math.max(1, w - 4), Math.max(1, t * 0.26));
    rr(x + w * 0.07, yb - h * 0.17, w * 0.86, Math.max(2.5, t * 0.30), 2, COL.woodD);
  }

  function drawStovel(x, yb, w, h) {
    skugga(x, yb, w);
    var top = yb - h;
    var shaftR = x + w * 0.34;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.03, yb - h * 0.06);
    ctx.lineTo(x + w * 0.03, top + h * 0.10);
    ctx.quadraticCurveTo(x + w * 0.03, top, x + w * 0.10, top);
    ctx.lineTo(shaftR - w * 0.05, top);
    ctx.quadraticCurveTo(shaftR, top, shaftR, top + h * 0.12);
    ctx.lineTo(shaftR, yb - h * 0.40);
    ctx.quadraticCurveTo(x + w * 0.55, yb - h * 0.34, x + w * 0.86, yb - h * 0.30);
    ctx.quadraticCurveTo(x + w * 0.99, yb - h * 0.28, x + w * 0.99, yb - h * 0.14);
    ctx.lineTo(x + w * 0.99, yb - h * 0.05);
    ctx.quadraticCurveTo(x + w * 0.99, yb, x + w * 0.90, yb);
    ctx.lineTo(x + w * 0.06, yb);
    ctx.quadraticCurveTo(x + w * 0.03, yb, x + w * 0.03, yb - h * 0.06);
    ctx.closePath();
    ctx.fillStyle = '#b8543f';
    ctx.fill();
    ctx.strokeStyle = '#8b3a2b'; ctx.lineWidth = Math.max(1.4, h * 0.028); ctx.stroke();
    /* skaftets överkant */
    ctx.fillStyle = '#96422f';
    rr(x + w * 0.05, top, shaftR - x - w * 0.07, Math.max(3, h * 0.08), 2, '#96422f');
    /* sula */
    ctx.fillStyle = '#3f3129';
    rr(x + w * 0.05, yb - h * 0.075, w * 0.91, Math.max(3, h * 0.075), 2, '#3f3129');
    /* snöre kring skaftet */
    ctx.strokeStyle = '#f2e2c4'; ctx.lineWidth = Math.max(1.4, h * 0.03);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, top + h * 0.24);
    ctx.lineTo(shaftR - w * 0.01, top + h * 0.24);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(shaftR - w * 0.02, top + h * 0.24, h * 0.06, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  function drawPinne(x, yb, w, h) {
    skugga(x, yb, w);
    var cy = yb - h * 0.62;
    var t = Math.max(4, h * 0.62);
    ctx.strokeStyle = '#8a5a2e'; ctx.lineCap = 'round';
    ctx.lineWidth = t;
    ctx.beginPath(); ctx.moveTo(x + t * 0.5, cy); ctx.lineTo(x + w - t * 0.5, cy); ctx.stroke();
    ctx.strokeStyle = '#9c6434';
    ctx.lineWidth = t * 0.76;
    ctx.beginPath(); ctx.moveTo(x + t * 0.6, cy - t * 0.05); ctx.lineTo(x + w - t * 0.6, cy - t * 0.05); ctx.stroke();
    ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = Math.max(2, t * 0.28);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.24, cy - t * 0.34);
    ctx.lineTo(x + w * 0.30, cy - t * 0.86);
    ctx.moveTo(x + w * 0.68, cy + t * 0.28);
    ctx.lineTo(x + w * 0.74, cy + t * 0.78);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawHammare(x, yb, w, h) {
    skugga(x, yb, w);
    var headW = Math.max(10, w * 0.20);
    var hh = Math.max(5, h * 0.24);
    /* skaft */
    ctx.fillStyle = '#b07a42';
    rr(x + headW * 0.55, yb - h * 0.62, w - headW * 0.55, hh, hh * 0.4, '#b07a42');
    ctx.fillStyle = '#c88f52';
    rr(x + headW * 0.55, yb - h * 0.62, w - headW * 0.55, hh * 0.38, hh * 0.2, '#c88f52');
    /* huvud */
    ctx.fillStyle = '#8a8f98';
    rr(x, yb - h, headW, h, Math.min(h * 0.14, headW * 0.28), '#8a8f98');
    ctx.fillStyle = '#a8adb6';
    rr(x + headW * 0.12, yb - h * 0.94, headW * 0.34, h * 0.88, headW * 0.12, 'rgba(255,255,255,.45)');
    ctx.fillStyle = '#6d727a';
    rr(x + headW * 0.72, yb - h * 0.98, headW * 0.26, h * 0.96, headW * 0.10, '#6d727a');
  }

  function drawSked(x, yb, w, h) {
    skugga(x, yb, w);
    var bowlW = Math.max(12, w * 0.30);
    var hh = Math.max(5, h * 0.34);
    /* skaft */
    ctx.fillStyle = '#b9b3a6';
    rr(x + bowlW * 0.62, yb - h * 0.40 - hh * 0.5, w - bowlW * 0.62, hh, hh * 0.5, '#b9b3a6');
    ctx.fillStyle = '#d6d0c2';
    rr(x + bowlW * 0.62, yb - h * 0.40 - hh * 0.5, w - bowlW * 0.62, hh * 0.36, hh * 0.2, 'rgba(255,255,255,.6)');
    /* skål */
    ctx.beginPath();
    ctx.ellipse(x + bowlW * 0.48, yb - h * 0.5, bowlW * 0.48, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c6c0b2'; ctx.fill();
    ctx.strokeStyle = '#9a9488'; ctx.lineWidth = Math.max(1.2, h * 0.05); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + bowlW * 0.46, yb - h * 0.58, bowlW * 0.32, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  }

  function drawMorot(x, yb, w, h) {
    skugga(x, yb, w);
    var top = yb - h;
    /* blast till vänster */
    ctx.strokeStyle = '#5b9a45'; ctx.lineWidth = Math.max(3, h * 0.14); ctx.lineCap = 'round';
    [-0.34, 0, 0.30].forEach(function (d, i) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.06, yb - h * 0.35);
      ctx.quadraticCurveTo(x - w * 0.02, yb - h * (0.7 + d), x + w * 0.02, top + h * (0.05 + i * 0.1));
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
    /* kropp */
    ctx.beginPath();
    ctx.moveTo(x + w * 0.04, top + h * 0.02);
    ctx.quadraticCurveTo(x + w * 0.55, top - h * 0.10, x + w * 0.98, yb - h * 0.52);
    ctx.quadraticCurveTo(x + w * 0.55, yb + h * 0.02, x + w * 0.05, yb - h * 0.05);
    ctx.closePath();
    ctx.fillStyle = '#e8843c'; ctx.fill();
    ctx.strokeStyle = '#c4661f'; ctx.lineWidth = Math.max(1.4, h * 0.06); ctx.stroke();
    /* ränder */
    ctx.strokeStyle = 'rgba(196,102,31,.55)'; ctx.lineWidth = Math.max(1, h * 0.045);
    [0.30, 0.52, 0.72].forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo(x + w * p, yb - h * 0.82 + h * 0.12 * p);
      ctx.lineTo(x + w * (p + 0.03), yb - h * 0.18 - h * 0.1 * p);
      ctx.stroke();
    });
  }

  function drawSak(id, x, yb, w, h) {
    if (id === 'bok') drawBok(x, yb, w, h);
    else if (id === 'bank') drawBank(x, yb, w, h);
    else if (id === 'stovel') drawStovel(x, yb, w, h);
    else if (id === 'pinne') drawPinne(x, yb, w, h);
    else if (id === 'hammare') drawHammare(x, yb, w, h);
    else if (id === 'sked') drawSked(x, yb, w, h);
    else drawMorot(x, yb, w, h);
  }

  /* ---------------- klossar ---------------- */

  function drawKloss(x, y, w, i, alpha) {
    var ljus = i % 2 === 0;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(90,70,40,.16)';
    rr(x + w * 0.06, y + w * 0.08, w * 0.94, w * 0.92, w * 0.14, 'rgba(90,70,40,.16)');
    rr(x, y, w, w, w * 0.13, ljus ? '#efc48e' : '#e2ad6f');
    ctx.strokeStyle = '#8f5f2c'; ctx.lineWidth = Math.max(1.2, w * 0.028);
    rr(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, w - ctx.lineWidth, w * 0.12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    rr(x + w * 0.10, y + w * 0.09, w * 0.80, w * 0.13, w * 0.06, 'rgba(255,255,255,.45)');
    circ(x + w * 0.5, y + w * 0.58, w * 0.10, 'rgba(143,95,44,.35)');
    ctx.restore();
  }

  /* ---------------- bakgrund och HUD ---------------- */

  function bakgrund() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1);
    g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var sx = W * 0.055, sy = H * 0.048, sr = clamp(Math.min(W, H) * 0.035, 12, 30);
    circ(sx, sy, sr * 1.8, 'rgba(255,240,180,.35)');
    circ(sx, sy, sr, 'rgba(255,214,96,.85)');
    /* gräskant nederst */
    ctx.fillStyle = 'rgba(143,191,106,.22)';
    ctx.beginPath();
    ctx.moveTo(0, H - 4);
    for (var x = 0; x <= W; x += 14) {
      ctx.lineTo(x, H - 4 - 3 * Math.sin(x / 43) - 2 * Math.sin(x / 17));
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }

  function stjarnrad() {
    var r = clamp(9 * L.s, 6, 12);
    var gap = r * 3.0;
    var x0 = W - L.m - r - 3 * gap;
    for (var i = 0; i < 4; i++) {
      star(x0 + i * gap + r, L.m + r + 2, r, i < G.stjarnor ? COL.star : 'rgba(255,255,255,.55)',
        i < G.stjarnor ? COL.starD : 'rgba(120,120,100,.35)');
    }
  }

  function fragaRad() {
    var s = L.s;
    var maxW = W - 2 * L.m - clamp(9 * s, 6, 12) * 10.6;
    txt('Hitta den som är ' + ORD[mal()] + ' klossar lång', W / 2, L.qY, 26 * s, COL.ink, 'center', 800, Math.max(140, maxW));
  }

  function drawVidare(kn, typ) {
    var pul = 1 + 0.035 * Math.sin(nu * 6.2);
    ctx.save();
    ctx.shadowColor = 'rgba(60,60,40,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    circ(kn.x, kn.y, kn.r * pul, COL.green);
    ctx.restore();
    var t = kn.r * 0.44;
    if (typ === 'igen') {
      ctx.lineWidth = kn.r * 0.20; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(kn.x, kn.y, kn.r * 0.46, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(kn.x + kn.r * 0.16, kn.y - kn.r * 0.62);
      ctx.lineTo(kn.x + kn.r * 0.62, kn.y - kn.r * 0.44);
      ctx.lineTo(kn.x + kn.r * 0.18, kn.y - kn.r * 0.16);
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(kn.x - t * 0.55, kn.y - t);
      ctx.lineTo(kn.x + t * 0.95, kn.y);
      ctx.lineTo(kn.x - t * 0.55, kn.y + t);
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
    }
  }

  /* ---------------- ribban och jämförelseytan ---------------- */

  function drawRibba() {
    var n = mal(), bw = L.bw;
    /* mjuk platta under ribban */
    ctx.fillStyle = 'rgba(255,250,243,.70)';
    rr(L.x0 - bw * 0.28, L.ribbaTop - bw * 0.16, n * bw + bw * 0.56, bw * 1.30, bw * 0.18, 'rgba(255,250,243,.70)');
    for (var i = 0; i < n; i++) drawKloss(L.x0 + i * bw, L.ribbaTop, bw, i);
  }

  function drawJmfYta() {
    var bw = L.bw;
    var top = L.cmpTop - bw * 0.16;
    var bot = L.cmpBottom + bw * 0.28;
    ctx.fillStyle = 'rgba(255,250,243,.52)';
    rr(L.m, top, W - 2 * L.m, bot - top, bw * 0.16, 'rgba(255,250,243,.52)');
    /* mätlinjen längst ner */
    ctx.strokeStyle = 'rgba(120,100,70,.35)';
    ctx.lineWidth = Math.max(1.5, bw * 0.022);
    var ly = bot - Math.max(3, bw * 0.06);
    ctx.beginPath(); ctx.moveTo(L.m + bw * 0.2, ly); ctx.lineTo(W - L.m - bw * 0.2, ly); ctx.stroke();
    /* startkant */
    ctx.strokeStyle = 'rgba(106,168,79,.9)';
    ctx.lineWidth = Math.max(2, bw * 0.05);
    ctx.beginPath();
    ctx.moveTo(L.x0, L.ribbaTop + bw * 0.9);
    ctx.lineTo(L.x0, ly + bw * 0.1);
    ctx.stroke();
  }

  function drawMalLinje(ok) {
    var bw = L.bw;
    var x = L.x0 + mal() * bw;
    var ly = L.cmpBottom + bw * 0.22;
    ctx.save();
    ctx.setLineDash([Math.max(4, bw * 0.12), Math.max(4, bw * 0.10)]);
    ctx.lineWidth = Math.max(2, bw * 0.04);
    ctx.strokeStyle = ok ? 'rgba(76,128,57,.95)' : 'rgba(120,100,70,.55)';
    ctx.beginPath();
    ctx.moveTo(x, L.ribbaTop + bw * 0.45);
    ctx.lineTo(x, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ---------------- hyllan ---------------- */

  function shelfObjektRect(i) {
    var r = runda();
    var id = r.ids[i];
    var sak = SAKER[id];
    var w = sak.n * L.ppbShelf;
    var x = L.slotX[i] + (L.slotW - w) / 2;
    return { id: id, x: x, yb: L.shelfY, w: w, h: sak.hb * L.ppbShelf };
  }

  function drawHyllan() {
    var H2 = L.shelfH;
    /* plankan */
    var plankH = Math.max(7, L.s * 9);
    ctx.fillStyle = COL.woodD;
    rr(L.m - L.gapS * 0.4, L.shelfY + plankH * 0.5, W - 2 * (L.m - L.gapS * 0.4), plankH * 0.7, 3, COL.woodD);
    ctx.fillStyle = COL.wood;
    rr(L.m - L.gapS * 0.4, L.shelfY, W - 2 * (L.m - L.gapS * 0.4), plankH, 3, COL.wood);
    ctx.fillStyle = COL.woodL;
    ctx.fillRect(L.m - L.gapS * 0.4, L.shelfY, W - 2 * (L.m - L.gapS * 0.4), Math.max(2, plankH * 0.28));
    /* ben */
    ctx.fillStyle = COL.woodD;
    rr(L.m + L.slotW * 0.12, L.shelfY + plankH, Math.max(6, L.s * 8), H2 * 0.32, 3, COL.woodD);
    rr(W - L.m - L.slotW * 0.12 - Math.max(6, L.s * 8), L.shelfY + plankH, Math.max(6, L.s * 8), H2 * 0.32, 3, COL.woodD);

    G.shelfHits = [];
    for (var i = 0; i < 3; i++) {
      var o = shelfObjektRect(i);
      var tagen = G.jmf && G.jmf.i === i;
      if (!tagen) drawSak(o.id, o.x, o.yb, o.w, o.h);
      /* träffyta: hela facket, minst 60 px */
      G.shelfHits.push({
        x: L.slotX[i] - L.gapS * 0.5,
        y: L.shelfY - L.slotW * 0.55,
        w: L.slotW + L.gapS,
        h: L.shelfH * 0.62 + L.shelfH * 0.1
      });
      if (G.glow > 0 && !G.jmf && runda().ids[i] && SAKER[runda().ids[i]].n === mal()) {
        var a = 0.35 + 0.35 * Math.sin(nu * 4.2);
        ctx.save();
        ctx.strokeStyle = 'rgba(247,201,72,' + a.toFixed(3) + ')';
        ctx.lineWidth = Math.max(3, L.s * 5);
        rr(L.slotX[i] - L.gapS * 0.3, L.shelfY - L.shelfH * 0.95,
          L.slotW + L.gapS * 0.6, L.shelfH * 1.02, 18);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ---------------- den valda saken ---------------- */

  function jmfRekt() {
    var j = G.jmf;
    if (!j) return null;
    var sak = SAKER[j.id];
    var fran = shelfObjektRect(j.i);
    var till = { x: L.x0, yb: L.cmpBottom, w: sak.n * L.bw, h: sak.hb * L.bw };
    var t = j.t * j.t * (3 - 2 * j.t); /* mjuk start och stop */
    return {
      id: j.id,
      x: lerp(fran.x, till.x, t),
      yb: lerp(fran.yb, till.yb, t),
      w: lerp(fran.w, till.w, t),
      h: lerp(fran.h, till.h, t)
    };
  }

  function drawJmf() {
    var o = jmfRekt();
    if (!o) return;
    if (G.jmf.t > 0.7) drawMalLinje(G.jmf.ok && G.jmf.t >= 1);
    drawSak(o.id, o.x, o.yb, o.w, o.h);
    /* kvittotext vid rätt svar */
    if (G.jmf.ok && G.jmf.t >= 0.98) {
      var s = L.s;
      var yy = Math.min(L.cmpTop + L.bw * 0.5, L.cmpBottom - SAKER[G.jmf.id].hb * L.bw - 14 * s);
      txt(ORD_STOR[mal()] + ' klossar!', W / 2, Math.max(L.qY + 30 * s, yy), 24 * s, COL.greenD, 'center', 900, W - 2 * L.m);
    }
  }

  /* ---------------- skärmar ---------------- */

  function drawIntro() {
    var s = L.s;
    txt('Hitta längden', W / 2, H * 0.12, 34 * s, COL.ink, 'center', 900, W - 40);
    txt('Ribban visar hur långt det ska vara. Vilken sak passar?',
      W / 2, H * 0.12 + 34 * s, 16 * s, COL.muted, 'center', 700, W * 0.84);

    /* en liten ribba av fyra klossar och tre saker under */
    var bw = clamp(Math.min(W * 0.055, H * 0.075), 26, 62);
    var x0 = W / 2 - 2 * bw;
    var ry = H * 0.36;
    for (var i = 0; i < 4; i++) drawKloss(x0 + i * bw, ry, bw, i);
    ctx.save();
    ctx.setLineDash([bw * 0.14, bw * 0.12]);
    ctx.strokeStyle = 'rgba(120,100,70,.55)';
    ctx.lineWidth = Math.max(2, bw * 0.05);
    ctx.beginPath(); ctx.moveTo(x0 + 4 * bw, ry + bw * 0.4); ctx.lineTo(x0 + 4 * bw, ry + bw * 2.4); ctx.stroke();
    ctx.restore();

    var ids = ['bok', 'stovel', 'pinne'];
    var gap = clamp(W * 0.04, 10, 40);
    var slotW = Math.min((W - 2 * L.m - 2 * gap) / 3, 210);
    var tot = slotW * 3 + gap * 2;
    var sx0 = W / 2 - tot / 2;
    var ppb = Math.min(slotW * 0.7 / 6, H * 0.06);
    var shelfY = ry + bw * 2.6 + 4;
        ctx.fillStyle = COL.woodD;
        rr(sx0 - gap * 0.3, shelfY + 7, tot + gap * 0.6, 8, 3, COL.woodD);
        ctx.fillStyle = COL.wood;
        rr(sx0 - gap * 0.3, shelfY, tot + gap * 0.6, Math.max(7, bw * 0.13), 3, COL.wood);
        ctx.fillStyle = COL.woodL;
        ctx.fillRect(sx0 - gap * 0.3, shelfY, tot + gap * 0.6, Math.max(2, bw * 0.04));
        for (var k = 0; k < 3; k++) {
          var sak = SAKER[ids[k]];
          var w2 = sak.n * ppb;
          var x = sx0 + k * (slotW + gap) + (slotW - w2) / 2;
          drawSak(ids[k], x, shelfY, w2, sak.hb * ppb);
        }

        var kh = Math.min(H * 0.24, 200);
        var kx = W * (W < H ? 0.21 : 0.17), ky = H - clamp(H * 0.02, 8, 20);
        ctx.fillStyle = 'rgba(80,70,50,.14)';
        ctx.beginPath(); ctx.ellipse(kx, ky + 2, kh * 0.22, kh * 0.05, 0, 0, Math.PI * 2); ctx.fill();
        try { window.KOTTEN.drawAtFeet(ctx, kx, ky, kh * 0.60, { wave: true }); } catch (e) { errs.push('kotten: ' + e); }

        var kn = L.start;
        if (W < H) { kn.x = W * 0.62; }
        drawVidare(kn, 'play');
        txt('Spela', kn.x, kn.y + kn.r + 16 * s, 15 * s, COL.ink, 'center', 800);
  }

  function drawFest() {
    var s = L.s;
    txt('Alla hittade!', W / 2, H * 0.085, 32 * s, COL.ink, 'center', 900, W - 40);
    txt('Tryck på en sak och hör hur lång den är.', W / 2, H * 0.085 + 30 * s, 15 * s, COL.muted, 'center', 700, W * 0.86);

    var ids = ['bok', 'sked', 'hammare', 'bank', 'stovel', 'morot', 'pinne'];
    var cols = 3, gap = clamp(W * 0.025, 8, 26);
    var top = H * 0.085 + 62 * s;
    var bot = L.igen.y - L.igen.r - 26 * s;
    var cw = (W - 2 * L.m - (cols - 1) * gap) / cols;
    var rows = 3;
    var ch = (bot - top - (rows - 1) * gap) / rows;
    var ppb = Math.min(cw * 0.84 / 6.2, ch * 0.68 / 2.0);
    G.festHits = [];
    for (var i = 0; i < ids.length; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      var x = L.m + c * (cw + gap), y = top + r * (ch + gap);
      ctx.fillStyle = 'rgba(255,250,243,.55)';
      rr(x, y, cw, ch, 14, 'rgba(255,250,243,.55)');
      var sak = SAKER[ids[i]];
      var w2 = sak.n * ppb, h2 = sak.hb * ppb;
      drawSak(ids[i], x + (cw - w2) / 2, y + ch * 0.5 + h2 * 0.5, w2, h2);
      G.festHits.push({ x: x, y: y, w: cw, h: ch, id: ids[i] });
    }
    drawVidare(L.igen, 'igen');
    txt('Lek igen', L.igen.x, L.igen.y + L.igen.r + 14 * s, 14 * s, COL.ink, 'center', 800);
  }

  /* ---------------- huvudritning ---------------- */

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();

    if (G.fas === 'intro') { drawIntro(); stjarnrad(); return; }
    if (G.fas === 'fest') { drawFest(); stjarnrad(); return; }

    stjarnrad();
    fragaRad();
    drawRibba();
    drawJmfYta();
    if (!G.jmf) drawMalLinje(false);
    drawHyllan();
    drawJmf();

    if (G.glow > 0 && !G.jmf) {
      txt('Titta var ribban slutar', W / 2, L.shelfTop - 10 * L.s, 13 * L.s, COL.muted, 'center', 700, W - 2 * L.m);
    }

    for (var g = 0; g < G.gnistor.length; g++) {
      var p = G.gnistor[g];
      ctx.globalAlpha = Math.max(0, p.liv);
      star(p.x, p.y, p.r, p.farg, null);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- uppdatering ---------------- */

  function burst(x, y, antal) {
    for (var i = 0; i < antal; i++) {
      var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 170;
      G.gnistor.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70,
        r: 3 + Math.random() * 5, liv: 1,
        farg: [COL.star, '#fff', COL.green, COL.orange][i % 4]
      });
    }
  }

  function update(dt) {
    G.tid += dt;
    if (G.jmf && G.jmf.t < 1) G.jmf.t = Math.min(1, G.jmf.t + dt / 0.30);
    for (var i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) {
        var fn = G.timers[i].fn;
        G.timers.splice(i, 1);
        try { fn(); } catch (e) { errs.push('timer: ' + e); }
      }
    }
    for (var g = G.gnistor.length - 1; g >= 0; g--) {
      var s = G.gnistor[g];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; s.liv -= dt * 0.65;
      if (s.liv <= 0) G.gnistor.splice(g, 1);
    }
    if (G.fas === 'spel' && !G.jmf && G.tid > 10 && G.saidT !== G.ri) {
      G.saidT = G.ri;
      say('Titta på ribban. Vilken når ända fram?', true);
    }
  }

  var forra = performance.now();
  function frame(ts) {
    try {
      nu = ts / 1000;
      var dt = Math.min(0.05, (ts - forra) / 1000);
      forra = ts;
      if (Math.abs(innerWidth - W) > 1 || Math.abs(innerHeight - H) > 1) layout();
      update(dt);
      draw(nu);
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- spel ---------------- */

  function startSpel() {
    G.fas = 'spel'; G.ri = 0;
    G.jmf = null; G.forsok = 0; G.glow = 0;
    G.stjarnor = 0; G.tid = 0; G.saidT = -1;
    layout();
    say(fraga(), true);
  }

  function valj(i) {
    if (G.fas !== 'spel' || G.jmf) return;
    var r = runda();
    if (!r.ids[i]) return;
    var id = r.ids[i];
    var ok = SAKER[id].n === mal();
    G.jmf = { i: i, id: id, t: 0, ok: ok };
    lyft();
    efter(340, function () { bedom(ok); });
  }

  function bedom(ok) {
    if (!G.jmf || G.fas !== 'spel') return;
    var sak = SAKER[G.jmf.id];
    if (ok) {
      G.fas = 'klar';
      G.stjarnor = Math.min(4, G.stjarnor + 1);
      pling();
      burst(L.x0 + mal() * L.bw, L.cmpBottom - sak.hb * L.bw * 0.4, 12);
      say('Precis! ' + ORD_STOR[mal()] + ' klossar!', true);
      efter(2400, function () { if (G.fas === 'klar') nasta(); });
    } else {
      nej();
      G.forsok++;
      say(ORD_STOR[sak.n] + ' klossar. Leta vidare!', true);
      if (G.forsok >= 2) {
        G.glow = 1;
        efter(1200, function () {
          if (G.fas === 'spel') say('Titta var ribban slutar.', true);
        });
      }
      efter(1750, function () {
        if (G.fas === 'spel') { G.jmf = null; G.tid = 0; G.saidT = G.ri; }
      });
    }
  }

  function nasta() {
    if (G.fas !== 'klar') return;
    G.fas = 'spel';
    G.jmf = null;
    G.ri++;
    G.forsok = 0; G.glow = 0; G.tid = 0; G.saidT = -1;
    if (G.ri >= RUNDOR.length) {
      G.ri = RUNDOR.length - 1;
      G.fas = 'fest';
      layout();
      fanfar();
      burst(W / 2, H * 0.4, 26);
      say('Alla hittade! Bra jobbat!', true);
      efter(2600, function () {
        if (G.fas === 'fest') say('Tryck på en sak och hör hur lång den är.');
      });
      return;
    }
    layout();
    say(fraga(), true);
  }

  /* ---------------- pek ---------------- */

  function pos_(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function iRekt(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  function iCirc(p, c) {
    return Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.15;
  }

  function tryck(p) {
    if (G.fas === 'intro') {
      if (iCirc(p, L.start)) { startSpel(); return; }
      return;
    }
    if (G.fas === 'fest') {
      if (iCirc(p, L.igen)) { startSpel(); return; }
      for (var i = 0; i < G.festHits.length; i++) {
        if (iRekt(p, G.festHits[i])) {
          var s = SAKER[G.festHits[i].id];
          pet();
          burst(p.x, p.y, 4);
          say(s.best + ' är ' + ORD[s.n] + ' klossar lång.');
          return;
        }
      }
      return;
    }
    if (G.fas === 'klar') {
      return;
    }
    for (var k = 0; k < G.shelfHits.length; k++) {
      if (iRekt(p, G.shelfHits[k])) { valj(k); return; }
    }
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    tryck(pos_(e));
  }, { passive: false });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 140); });

  /* ---------------- testkrok ---------------- */

  window.__hl = {
    state: function () {
      return {
        fas: G.fas, ri: G.ri, mal: mal(),
        sak: runda().ids.slice(),
        ratt: runda().ids.map(function (id) { return SAKER[id].n === mal() ? 1 : 0; }),
        jmf: G.jmf ? { i: G.jmf.i, ok: G.jmf.ok, t: Math.round(G.jmf.t * 100) / 100 } : null,
        forsok: G.forsok, glow: G.glow, stjarnor: G.stjarnor,
        W: W, H: H, s: Math.round(L.s * 100) / 100,
        bw: Math.round(L.bw), x0: Math.round(L.x0),
        ribbaTop: Math.round(L.ribbaTop), cmpTop: Math.round(L.cmpTop), cmpBottom: Math.round(L.cmpBottom),
        shelfY: Math.round(L.shelfY), shelfTop: Math.round(L.shelfTop),
        shelf: G.shelfHits.map(function (h) { return { x: Math.round(h.x), y: Math.round(h.y), w: Math.round(h.w), h: Math.round(h.h) }; }),
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        igen: L.igen ? { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) } : null,
        nasta: L.nasta ? { x: Math.round(L.nasta.x), y: Math.round(L.nasta.y), r: Math.round(L.nasta.r) } : null,
        errs: errs.slice()
      };
    },
    start: function () { startSpel(); return this.state(); },
    valj: function (i) { valj(i); return this.state(); },
    tryck: function (x, y) { tryck({ x: x, y: y }); return this.state(); },
    nasta: function () { this.spola(2000); nasta(); return this.state(); },
    spola: function (ms) {
      var kvar = ms / 1000, steg = 0;
      while (kvar > 0 && steg++ < 400) {
        var d = Math.min(kvar, 0.05); kvar -= d;
        if (G.jmf && G.jmf.t < 1) G.jmf.t = Math.min(1, G.jmf.t + d / 0.30);
        for (var i = G.timers.length - 1; i >= 0; i--) {
          G.timers[i].t -= d;
          if (G.timers[i].t <= 0) {
            var fn = G.timers[i].fn;
            G.timers.splice(i, 1);
            try { fn(); } catch (e) { errs.push('timer: ' + e); }
          }
        }
      }
      return this.state();
    },
    rita: function () { try { draw(nu); } catch (e) { errs.push(String(e)); } return errs.length; },
    errs: function () { return errs.slice(); }
  };

  layout();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();