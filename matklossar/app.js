/* Mät med klossar — hur många klossar är saken lång?
 *
 * En sak ligger på bänken: en bok, en bänk, en stövel, en pinne. Barnet gissar
 * först hur många klossar den är lång (tre kort med siffror och prickar), lägger
 * sedan klossar kant i kant längs en mätlinje under saken — varje kloss räknas
 * högt — och får till slut kvittot: "Fem klossar! Du gissade fem."
 *
 * Icke-standardiserad mätning: enheten är barnets egen kloss, inte en linjal.
 * Gissning + mätning i samma runda, och siffran blir något barnet själv byggt.
 *
 * Ingen förlust: det går inte att lägga fel, klossarna snäpper på plats och
 * mätningen går alltid ut. Fyra saker → fest där längderna kan höras igen.
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
    floor: '#c9b28c', floorD: '#b39a72',
    green: '#6aa84f', greenD: '#4c8039', leaf: '#8fbf6a',
    star: '#f7c948', starD: '#dfa616',
    red: '#d9584f', blue: '#5f93c9', teal: '#4fae94', orange: '#e8843c'
  };

  /* ---------------- innehåll ---------------- */
  var ORD = ['', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta'];
  var ORD_STOR = ['', 'Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex', 'Sju', 'Åtta'];

  var SAKER = [
    { id: 'bok',    namn: 'boken',   best: 'Boken',   n: 3, h: 0.34, farg: '#5f93c9' },
    { id: 'bank',   namn: 'bänken',  best: 'Bänken',  n: 4, h: 0.60, farg: '#c98d4f' },
    { id: 'stovel', namn: 'stöveln', best: 'Stöveln', n: 5, h: 0.85, farg: '#b8543f' },
    { id: 'pinne',  namn: 'pinnen',  best: 'Pinnen',  n: 6, h: 0.30, farg: '#9c6434' }
  ];

  function fraga(sak) { return 'Hur många klossar är ' + sak.namn + ' lång?'; }
  function kvitto(n, giss) {
    if (giss === n) return ORD_STOR[n] + (n === 1 ? ' kloss!' : ' klossar!') + ' Rätt gissat!';
    return ORD_STOR[n] + ' klossar! Du gissade ' + ORD[giss] + '.';
  }

  /* ---------------- tillstånd ---------------- */
  var W = 0, H = 0, DPR = 1, nu = 0;
  var L = { m: 16, s: 1, topH: 150, trayTop: 700, trayH: 120, bw: 80, gap: 12,
    rowTop: 0, rowBottom: 0, rowX0: 0, objTop: 0, objBottom: 0,
    start: null, igen: null, nasta: null, kortHits: [], festKort: [] };
  var G = {
    fas: 'intro', ri: 0, giss: 0, lagt: 0, val: [],
    drag: null, tryckT: 0, valdT: -1, popT: 0, skak: 0,
    stjarnor: 0, klarT: 0, tid: 0, said: -1,
    timers: [], gnistor: [], hits: [], errsN: 0
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
  function kloss() { tone(300 + Math.random() * 40, 0.10, 0.10, 'sine', 640); }
  function pling() { tone(660, 0.10, 0.08, 'triangle'); setTimeout(function () { tone(990, 0.14, 0.06, 'triangle'); }, 95); }
  function nej() { tone(220, 0.15, 0.07, 'triangle', 170); }
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

  function layout() {
    W = Math.max(300, innerWidth);
    H = Math.max(320, innerHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';

    var s = clamp(Math.min(W, H) / 768, 0.62, 1.3);
    var m = clamp(Math.min(W, H) * 0.032, 10, 26);
    var starR = clamp(9 * s, 6, 12);
    var qY = m + starR * 2 + 16 * s;
    var gh = clamp(H * 0.105, 48, 94);
    var guessY = qY + 16 * s;
    var topH = guessY + gh + clamp(H * 0.022, 8, 20);

    var trayH = clamp(H * 0.155, 74, 150);
    var trayTop = H - trayH - clamp(H * 0.009, 4, 10);

    var bw = Math.min((W - 2 * m - 8) / 6, H * 0.155, 152);
    bw = Math.max(30, bw);
    var gap = clamp(bw * 0.14, 6, 18);
    var objH = bw * 0.95;
    var groupH = objH + gap + bw;
    var zoneTop = topH;
    var zoneBot = trayTop - clamp(H * 0.02, 6, 18);
    var groupTop = zoneTop + Math.max(0, (zoneBot - zoneTop - groupH) / 2);

    L.s = s; L.m = m; L.bw = bw; L.gap = gap;
    L.topH = topH; L.qY = qY; L.guessY = guessY; L.guessH = gh;
    L.trayTop = trayTop; L.trayH = trayH;
    L.objTop = groupTop;
    L.objBottom = groupTop + objH;
    L.rowTop = L.objBottom + gap;
    L.rowBottom = L.rowTop + bw;
    L.rowX0 = 0;
    var n = SAKER[G.ri] ? SAKER[G.ri].n : 4;
    L.rowX0 = W / 2 - (n * bw) / 2;

    var br = clamp(Math.min(W, H) * 0.10, 34, 66);
    L.start = { x: W / 2, y: H - clamp(H * 0.16, 70, 140), r: br };
    L.igen = { x: W - m - br * 0.72, y: m + br * 0.72, r: br * 0.60 };
    L.nasta = { x: W / 2, y: H - br * 0.86 - 14 * s - 12, r: br * 0.86 };
  }

  /* ---------------- ritning: grunder ---------------- */
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
  function pip(x, y, r, fill) { circ(x, y, r, fill); }
  function pipRad(n) { return n <= 5 ? 0.19 : 0.17; }

  /* prickar för ett tal 1–7 i upp till tre rader */
  function drawPips(n, cx, cy, box, col) {
    var r = box * (n >= 5 ? 0.105 : 0.125);
    var rows = n <= 3 ? [n] : (n <= 6 ? [3, n - 3] : [3, 3, n - 6]);
    var rowH = box * 0.26;
    var y0 = cy - (rows.length - 1) * rowH / 2;
    for (var ri2 = 0; ri2 < rows.length; ri2++) {
      var k = rows[ri2];
      var spacing = box * 0.27;
      var x0 = cx - (k - 1) * spacing / 2;
      for (var i = 0; i < k; i++) pip(x0 + i * spacing, y0 + ri2 * rowH, r, col);
    }
  }

  /* ---------------- sakerna (ritas i en ruta x..x+w, vilar på yb) ------------- */
  function drawSak(sak, x, yb, w, maxH, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    var h = maxH * sak.h;
    if (sak.id === 'bank') drawBank(x, yb, w, h);
    else if (sak.id === 'bok') drawBok(x, yb, w, h);
    else if (sak.id === 'stovel') drawStovel(x, yb, w, h);
    else drawPinne(x, yb, w, h);
    ctx.restore();
  }

  function skugga(x, yb, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(80,70,50,.16)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, yb + 1, w * 0.47, Math.max(2, w * 0.045), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBank(x, yb, w, h) {
    skugga(x, yb, w);
    var seatY = yb - h * 0.62;
    var t = Math.max(3, h * 0.16);
    var legW = Math.max(4, w * 0.052);
    ctx.fillStyle = COL.woodD;
    rr(x + w * 0.07, seatY + t * 0.4, legW, yb - seatY - t * 0.4, 2, COL.woodD);
    rr(x + w * 0.87 - legW, seatY + t * 0.4, legW, yb - seatY - t * 0.4, 2, COL.woodD);
    rr(x, seatY, w, t, 3, COL.wood);
    ctx.fillStyle = COL.woodL;
    ctx.fillRect(x + 2, seatY + 1, w - 4, Math.max(1, t * 0.26));
    /* ribba mellan benen */
    ctx.fillStyle = COL.woodD;
    rr(x + w * 0.07, yb - h * 0.16, w * 0.86, Math.max(2.5, t * 0.30), 2, COL.woodD);
  }

  function drawBok(x, yb, w, h) {
    skugga(x, yb, w);
    var top = yb - h;
    ctx.fillStyle = COL.cream;
    rr(x + w * 0.035, top + h * 0.10, w * 0.93, h * 0.86, h * 0.10, '#f7f2e6');
    /* sidor */
    ctx.strokeStyle = '#d9d2c0'; ctx.lineWidth = Math.max(1, h * 0.035);
    for (var i = 1; i <= 3; i++) {
      var yy = top + h * (0.22 + i * 0.16);
      ctx.beginPath(); ctx.moveTo(x + w * 0.16, yy); ctx.lineTo(x + w * 0.92, yy); ctx.stroke();
    }
    /* pärm */
    ctx.fillStyle = '#5f93c9';
    rr(x, top, w * 0.94, h * 0.92, h * 0.10, '#5f93c9');
    ctx.fillStyle = '#45719e';
    rr(x, top, w * 0.10, h * 0.92, h * 0.08, '#45719e');
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    rr(x + w * 0.16, top + h * 0.20, w * 0.52, h * 0.16, h * 0.07, 'rgba(255,255,255,.55)');
    rr(x + w * 0.16, top + h * 0.46, w * 0.34, h * 0.12, h * 0.06, 'rgba(255,255,255,.35)');
  }

  function drawStovel(x, yb, w, h) {
    skugga(x, yb, w);
    var top = yb - h;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.10, top);
    ctx.lineTo(x + w * 0.54, top);
    ctx.lineTo(x + w * 0.54, yb - h * 0.34);
    ctx.lineTo(x + w * 0.90, yb - h * 0.30);
    ctx.quadraticCurveTo(x + w * 0.99, yb - h * 0.24, x + w * 0.94, yb - h * 0.10);
    ctx.quadraticCurveTo(x + w * 0.90, yb, x + w * 0.80, yb);
    ctx.lineTo(x + w * 0.12, yb);
    ctx.quadraticCurveTo(x + w * 0.06, yb, x + w * 0.06, yb - h * 0.10);
    ctx.closePath();
    ctx.fillStyle = '#b8543f';
    ctx.fill();
    ctx.strokeStyle = '#8b3a2b'; ctx.lineWidth = Math.max(1.4, h * 0.03); ctx.stroke();
    /* skaftkant och sula */
    ctx.fillStyle = '#96422f';
    rr(x + w * 0.10, top, w * 0.44, Math.max(3, h * 0.09), 2, '#96422f');
    ctx.fillStyle = '#3f3129';
    rr(x + w * 0.06, yb - h * 0.09, w * 0.88, Math.max(3, h * 0.085), 2, '#3f3129');
    /* snöre */
    ctx.strokeStyle = '#f2e2c4'; ctx.lineWidth = Math.max(1.2, h * 0.025);
    ctx.beginPath(); ctx.moveTo(x + w * 0.13, top + h * 0.20);
    ctx.lineTo(x + w * 0.51, top + h * 0.20); ctx.stroke();
  }

  function drawPinne(x, yb, w, h) {
    skugga(x, yb, w);
    var cy = yb - h * 0.55;
    var t = Math.max(4, h * 0.62);
    ctx.strokeStyle = '#8a5a2e'; ctx.lineCap = 'round';
    ctx.lineWidth = t;
    ctx.beginPath(); ctx.moveTo(x + t * 0.6, cy); ctx.lineTo(x + w - t * 0.6, cy); ctx.stroke();
    ctx.strokeStyle = '#9c6434';
    ctx.lineWidth = t * 0.78;
    ctx.beginPath(); ctx.moveTo(x + t * 0.7, cy - t * 0.05); ctx.lineTo(x + w - t * 0.7, cy - t * 0.05); ctx.stroke();
    /* kvistar */
    ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = Math.max(2, t * 0.30);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.30, cy - t * 0.36);
    ctx.lineTo(x + w * 0.36, cy - t * 0.88);
    ctx.moveTo(x + w * 0.70, cy + t * 0.30);
    ctx.lineTo(x + w * 0.76, cy + t * 0.80);
    ctx.stroke();
    /* årsringar */
    ctx.strokeStyle = 'rgba(90,58,28,.55)'; ctx.lineWidth = Math.max(1, t * 0.10);
    [0.44, 0.62].forEach(function (p) {
      ctx.beginPath(); ctx.ellipse(x + w * p, cy, t * 0.13, t * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.lineCap = 'butt';
  }

  /* ---------------- klossar ---------------- */
  function drawKloss(x, y, w, i, alpha) {
    var ljus = i % 2 === 0;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    /* skugga */
    ctx.fillStyle = 'rgba(90,70,40,.16)';
    rr(x + w * 0.06, y + w * 0.08, w * 0.94, w * 0.92, w * 0.14, 'rgba(90,70,40,.16)');
    rr(x, y, w, w, w * 0.13, ljus ? '#efc48e' : '#e2ad6f');
    ctx.strokeStyle = '#8f5f2c'; ctx.lineWidth = Math.max(1.2, w * 0.028);
    rr(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, w - ctx.lineWidth, w * 0.12);
    ctx.stroke();
    /* överkant */
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    rr(x + w * 0.10, y + w * 0.09, w * 0.80, w * 0.13, w * 0.06, 'rgba(255,255,255,.45)');
    /* en liten prick mitt på, så klossen syns som en sak */
    circ(x + w * 0.5, y + w * 0.58, w * 0.10, 'rgba(143,95,44,.35)');
    ctx.restore();
  }

  function drawGhostKloss(x, y, w, t) {
    ctx.save();
    var a = 0.18 + 0.14 * Math.sin(t * 3.4);
    ctx.setLineDash([w * 0.16, w * 0.13]);
    ctx.lineWidth = Math.max(2, w * 0.045);
    ctx.strokeStyle = 'rgba(120,86,40,' + a.toFixed(3) + ')';
    rr(x, y, w, w, w * 0.13);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ---------------- ritning: bakgrund och HUD ---------------- */
  function bakgrund() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1);
    g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    /* sol och moln */
    var sx = W * 0.055, sy = H * 0.050, sr = clamp(Math.min(W, H) * 0.035, 12, 30);
    ctx.fillStyle = 'rgba(255,240,180,.75)';
    circ(sx, sy, sr * 1.8, 'rgba(255,240,180,.35)');
    circ(sx, sy, sr, 'rgba(255,214,96,.85)');
    /* gräskant nederst */
    ctx.fillStyle = 'rgba(143,191,106,.35)';
    ctx.beginPath();
    ctx.moveTo(0, H - 6);
    for (var x = 0; x <= W; x += 12) {
      ctx.lineTo(x, H - 6 - 4 * Math.sin(x / 41) - 2 * Math.sin(x / 13));
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }

  function stjarnrad() {
    var r = clamp(9 * L.s, 6, 12);
    var gap = r * 2.5;
    var x0 = W - L.m - r - (3) * gap;
    for (var i = 0; i < 4; i++) {
      star(x0 + i * gap + r, L.m + r + 2, r, i < G.stjarnor ? COL.star : 'rgba(255,255,255,.55)',
        i < G.stjarnor ? COL.starD : 'rgba(120,120,100,.35)');
    }
  }

  function fragaRad() {
    var s = L.s;
    var maxW = W - 2 * L.m - clamp(9 * s, 6, 12) * 10.6;
    txt('Hur många klossar är ' + SAKER[G.ri].namn + ' lång?', W / 2, L.qY, 26 * s, COL.ink, 'center', 800, Math.max(120, maxW));
  }

  function drawStartknapp(kn, etikett) {
    var pul = 1 + 0.035 * Math.sin(nu * 6.2);
    ctx.save();
    ctx.shadowColor = 'rgba(60,60,40,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    circ(kn.x, kn.y, kn.r * pul, COL.green);
    ctx.restore();
    circ(kn.x, kn.y, kn.r * pul, null);
    ctx.beginPath();
    var t = kn.r * 0.44;
    ctx.fillStyle = '#fff';
    if (etikett === 'igen') {
      ctx.lineWidth = kn.r * 0.20; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      ctx.arc(kn.x, kn.y, kn.r * 0.46, -Math.PI * 0.35, Math.PI * 1.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kn.x + kn.r * 0.30, kn.y - kn.r * 0.58);
      ctx.lineTo(kn.x + kn.r * 0.62, kn.y - kn.r * 0.44);
      ctx.lineTo(kn.x + kn.r * 0.34, kn.y - kn.r * 0.20);
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
    } else {
      ctx.moveTo(kn.x - t * 0.55, kn.y - t);
      ctx.lineTo(kn.x + t * 0.95, kn.y);
      ctx.lineTo(kn.x - t * 0.55, kn.y + t);
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }

  /* ---------------- gissningskorten ---------------- */
  function gissKort() {
    var n = SAKER[G.ri].n;
    var alt = [n - 1, n, n + 1];
    /* fast ordning: mitten är inte alltid rätt */
    var ord = G.ri % 2 === 0 ? [alt[1], alt[0], alt[2]] : [alt[0], alt[2], alt[1]];
    return ord;
  }

  function drawGiss() {
    fragaRad();
    var s = L.s;
    var vals = gissKort();
    var gap = clamp(W * 0.022, 6, 20);
    var cw = Math.min((W - 2 * L.m - 2 * gap) / 3, 190);
    var ch = L.guessH;
    var tot = 3 * cw + 2 * gap;
    var x0 = W / 2 - tot / 2;
    var y = L.guessY;
    L.kortHits = [];
    for (var i = 0; i < 3; i++) {
      var x = x0 + i * (cw + gap);
      var hov = G.valdT === i;
      rr(x, y - (hov ? 4 : 0), cw, ch, cw * 0.14, '#fffaf3');
      ctx.strokeStyle = hov ? COL.green : 'rgba(120,100,70,.35)';
      ctx.lineWidth = Math.max(2, cw * 0.022);
      rr(x, y - (hov ? 4 : 0), cw, ch, cw * 0.14);
      ctx.stroke();
      txt(String(vals[i]), x + cw / 2, y + ch * 0.36 - (hov ? 4 : 0), ch * 0.40, COL.ink, 'center', 900, cw * 0.7);
      drawPips(vals[i], x + cw / 2, y + ch * 0.74 - (hov ? 4 : 0), ch * 0.34, COL.wood);
      L.kortHits.push({ x: x, y: y - 6, w: cw, h: ch + 12, v: vals[i] });
    }
    txt('Gissa först!', W / 2, L.guessY + L.guessH + clamp(H * 0.014, 6, 14), 15 * s, COL.muted, 'center', 700);
  }

  /* ---------------- mätlinjen ---------------- */
  function drawMatyta(n) {
    var bw = L.bw;
    var x0 = L.rowX0;
    var rowW = n * bw;
    /* mjuk mätplatta */
    ctx.fillStyle = 'rgba(255,250,243,.62)';
    rr(x0 - bw * 0.30, L.objTop - bw * 0.08, rowW + bw * 0.60, (L.rowBottom - L.objTop) + bw * 0.26, bw * 0.20, 'rgba(255,250,243,.62)');
    /* mätlinje under klossarna */
    var ly = L.rowBottom + Math.max(3, bw * 0.06);
    ctx.strokeStyle = 'rgba(120,100,70,.40)'; ctx.lineWidth = Math.max(1.5, bw * 0.02);
    ctx.beginPath(); ctx.moveTo(x0 - bw * 0.26, ly); ctx.lineTo(x0 + rowW + bw * 0.26, ly); ctx.stroke();
    /* startstreck */
    ctx.strokeStyle = 'rgba(106,168,79,.85)'; ctx.lineWidth = Math.max(2, bw * 0.045);
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, L.rowBottom - bw * 0.10);
    ctx.lineTo(x0 + 0.5, ly + bw * 0.10);
    ctx.stroke();
    /* ändmärken */
    ctx.strokeStyle = 'rgba(120,100,70,.32)';
    ctx.lineWidth = Math.max(1, bw * 0.015);
    for (var i = 0; i <= n; i++) {
      var x = x0 + i * bw;
      ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x, ly + bw * 0.10); ctx.stroke();
    }
  }

  function drawTray() {
    var y = L.trayTop, h = L.trayH;
    ctx.fillStyle = 'rgba(255,250,243,.80)';
    rr(L.m, y, W - 2 * L.m, h, clamp(h * 0.25, 12, 30), 'rgba(255,250,243,.80)');
    ctx.strokeStyle = 'rgba(120,100,70,.22)'; ctx.lineWidth = 2;
    rr(L.m, y, W - 2 * L.m, h, clamp(h * 0.25, 12, 30));
    ctx.stroke();
    var bw = Math.min(L.bw, h * 0.68);
    var cx = W / 2;
    var cy = y + h * 0.55;
    /* kloss i lådan */
    var pul = 1 + 0.03 * Math.sin(nu * 5);
    var bw2 = bw * pul;
    drawKloss(cx - bw2 / 2, cy - bw2 / 2, bw2, 0);
    txt('Lägg klossar', cx, y + h * 0.17, 13 * L.s, COL.muted, 'center', 700);
  }

  /* ---------------- resultat ---------------- */
  function drawKlar() {
    var sak = SAKER[G.ri];
    var n = sak.n, g = G.giss;
    var x = W / 2;
    var y = L.topH * 0.42;
    var s = L.s;
    var ratt = g === n;
    txt(n + ' klossar!', x, y - 16 * s, 34 * s, COL.ink, 'center', 900);
    if (ratt) {
      txt('Du gissade rätt!', x, y + 22 * s, 22 * s, COL.greenD, 'center', 800);
    } else {
      txt('Du gissade ' + ORD[g] + '.', x, y + 22 * s, 22 * s, COL.muted, 'center', 800);
    }
    }

  /* ---------------- skärmar ---------------- */
  function drawIntro() {
    var s = L.s;
    txt('Mät med klossar', W / 2, H * 0.13, 34 * s, COL.ink, 'center', 900, W - 40);
    txt('Gissa hur många klossar saken är lång — lägg sedan klossarna och se!',
      W / 2, H * 0.13 + 34 * s, 16 * s, COL.muted, 'center', 700, W * 0.82);

    /* hylla med de fyra sakerna */
    var n = 4;
    var gap = clamp(W * 0.03, 8, 28);
    var cw = Math.min((W - 2 * L.m - 3 * gap) / 4, 180);
    var tot = 4 * cw + 3 * gap;
    var x0 = W / 2 - tot / 2;
    var shelfY = H * 0.50;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (cw + gap);
      drawSak(SAKER[i], x + cw * 0.06, shelfY, cw * 0.88, cw * 0.62, 1);
    }
    ctx.fillStyle = COL.wood;
    rr(x0 - gap * 0.4, shelfY, tot + gap * 0.8, Math.max(6, cw * 0.05), 3, COL.wood);
    ctx.fillStyle = COL.woodL;
    ctx.fillRect(x0 - gap * 0.4, shelfY, tot + gap * 0.8, Math.max(2, cw * 0.015));

    /* Kotten */
    var kh = Math.min(H * 0.26, 210);
    var kx = W * 0.26, ky = H * 0.82;
    ctx.fillStyle = 'rgba(80,70,50,.14)';
    ctx.beginPath(); ctx.ellipse(kx, ky + 2, kh * 0.22, kh * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    try { window.KOTTEN.drawAtFeet(ctx, kx, ky, kh * 0.60, { wave: true }); } catch (e) { errs.push('kotten: ' + e); }

    drawStartknapp(L.start, 'play');
    txt('Spela', W / 2, L.start.y + L.start.r + 16 * s, 15 * s, COL.ink, 'center', 800);
  }

  function drawFest() {
    var s = L.s;
    txt('Alla är mätta!', W / 2, H * 0.10, 32 * s, COL.ink, 'center', 900, W - 40);
    txt('Tryck på en sak och hör hur lång den är.', W / 2, H * 0.10 + 30 * s, 15 * s, COL.muted, 'center', 700, W * 0.84);

    var cols = 2, rows = 2;
    var gap = clamp(W * 0.035, 10, 30);
    var cw = Math.min((W - 2 * L.m - gap) / 2, 300);
    var ch = Math.min((H * 0.52 - gap) / 2, 150);
    var totW = cols * cw + (cols - 1) * gap;
    var x0 = W / 2 - totW / 2;
    var y0 = H * 0.28;
    L.festKort = [];
    for (var i = 0; i < SAKER.length; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      var x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
      rr(x, y, cw, ch, cw * 0.08, '#fffaf3');
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 2, y + 2, cw - 4, ch - 4); ctx.clip();
      drawSak(SAKER[i], x + cw * 0.10, y + ch * 0.88, cw * 0.80, ch * 0.50, 1);
      ctx.restore();
      drawPips(SAKER[i].n, x + cw * 0.84, y + ch * 0.17, ch * 0.28, COL.woodD);
      L.festKort.push({ x: x, y: y, w: cw, h: ch, i: i });
    }
    drawStartknapp(L.start, 'igen');
    txt('Lek igen', W / 2, L.start.y + L.start.r + 14 * s, 14 * s, COL.muted, 'center', 700);
  }

  /* ---------------- huvudritning ---------------- */
  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();

    var sak = SAKER[G.ri] || SAKER[0];
    var n = sak.n;

    if (G.fas === 'intro') {
      drawIntro();
      stjarnrad();
      return;
    }
    if (G.fas === 'fest') {
      drawFest();
      stjarnrad();
      return;
    }

    stjarnrad();

    if (G.fas === 'gissa') {
      drawGiss();
    } else if (G.fas === 'mata') {
      /* frågan står kvar som en liten rad */
      txt(sak.best + ' — mät med klossar', W / 2, L.qY, 20 * L.s, COL.ink, 'center', 800, W - 2 * L.m);
      /* gissningen som litet märke */
      var s2 = L.s;
      var gy = L.guessY + clamp(14 * s2, 10, 20);
      txt('Din gissning', W * 0.5, gy - 13 * s2, 12 * s2, COL.muted, 'center', 700);
      var bw = Math.min(L.bw * 0.5, 30 * s2);
      var gap = bw * 0.22;
      var xg = W / 2 - (G.giss * bw + (G.giss - 1) * gap) / 2;
      for (var i = 0; i < G.giss; i++) {
        rr(xg + i * (bw + gap), gy + 2, bw, bw, bw * 0.20, 'rgba(208,149,90,.85)');
      }
    } else {
      drawKlar();
    }

    /* saken och mätlinjen */
    drawMatyta(n);
    var sakW = n * L.bw;
    drawSak(sak, L.rowX0, L.objBottom, sakW, L.bw * 0.95, G.fas === 'klar' ? 1 : 0.98);

    /* lagda klossar */
    var pop = G.popT > 0 ? 1 + 0.10 * Math.sin(Math.min(1, G.popT * 6) * Math.PI) : 1;
    for (var k = 0; k < G.lagt; k++) {
      var kx = L.rowX0 + k * L.bw;
      var last = k === G.lagt - 1;
      if (last && pop !== 1) {
        var w2 = L.bw * pop;
        drawKloss(kx + (L.bw - w2) / 2, L.rowTop + (L.bw - w2), w2, k);
      } else {
        drawKloss(kx, L.rowTop, L.bw, k);
      }
    }
    /* nästa plats */
    if (G.fas === 'mata' && G.lagt < n) {
      drawGhostKloss(L.rowX0 + G.lagt * L.bw, L.rowTop, L.bw, t);
    }

    if (G.fas === 'mata') drawTray();
    if (G.fas === 'klar') {
      drawStartknapp(L.nasta, 'play');
      txt('Nästa', W / 2, L.nasta.y + L.nasta.r + 14 * L.s, 14 * L.s, COL.ink, 'center', 800);
    }

    /* gnistor */
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
    if (G.popT > 0) G.popT = Math.max(0, G.popT - dt * 2.2);
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
    if (G.fas === 'mata' && G.lagt === 0 && G.tid > 9 && G.said !== G.ri) {
      G.said = G.ri;
      say('Lägg klossarna kant i kant.', true);
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
    G.fas = 'gissa'; G.ri = 0; G.giss = 0; G.lagt = 0; G.val = [];
    G.stjarnor = 0; G.tid = 0; G.said = -1; G.klarT = 0;
    layout();
    say(fraga(SAKER[0]), true);
  }

  function gissa(v) {
    if (G.fas !== 'gissa') return;
    G.giss = v;
    G.fas = 'mata';
    G.lagt = 0;
    G.tid = 0;
    pet();
    say('Lägg klossarna kant i kant.');
  }

  function lagg() {
    if (G.fas !== 'mata') return;
    var n = SAKER[G.ri].n;
    if (G.lagt >= n) return;
    G.lagt++;
    G.popT = 1;
    kloss();
    say(ORD[G.lagt]);
    burst(L.rowX0 + (G.lagt - 0.5) * L.bw, L.rowTop + L.bw * 0.5, 3);
    if (G.lagt >= n) efter(520, klar);
  }

  function klar() {
    if (G.fas !== 'mata') return;
    G.fas = 'klar';
    var sak = SAKER[G.ri];
    var ratt = G.giss === sak.n;
    if (ratt) G.stjarnor = Math.min(4, G.stjarnor + 1);
    fanfar();
    burst(W / 2, L.rowBottom - L.bw * 0.4, 16);
    say(kvitto(sak.n, G.giss), true);
  }

  function nasta() {
    if (G.fas !== 'klar') return;
    G.ri++;
    G.lagt = 0; G.giss = 0; G.tid = 0; G.said = -1;
    if (G.ri >= SAKER.length) {
      G.fas = 'fest';
      G.ri = SAKER.length - 1;
      layout();
      burst(W / 2, H * 0.42, 26);
      say('Alla sakerna är mätta! Bra jobbat!', true);
      efter(2600, function () { if (G.fas === 'fest') say('Mät vad du vill!'); });
      return;
    }
    layout();
    G.fas = 'gissa';
    say(fraga(SAKER[G.ri]), true);
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
    return Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.12;
  }
  function iMatyta(p) {
    var n = SAKER[G.ri].n;
    return p.x >= L.rowX0 - L.bw * 0.5 &&
      p.x <= L.rowX0 + n * L.bw + L.bw * 0.5 &&
      p.y >= L.objTop - L.bw * 0.2 && p.y <= L.rowBottom + L.bw * 0.45;
  }
  function iTray(p) {
    return p.y >= L.trayTop && p.y <= L.trayTop + L.trayH;
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    var p = pos_(e);
    G.tryckT = nu;

    if (G.fas === 'intro') {
      if (iCirc(p, L.start)) { startSpel(); return; }
      return;
    }
    if (G.fas === 'fest') {
      if (iCirc(p, L.igen)) { G.fas = 'gissa'; G.ri = 0; G.giss = 0; G.lagt = 0; G.stjarnor = 0; G.tid = 0; G.said = -1; layout(); say(fraga(SAKER[0]), true); return; }
      for (var i = 0; i < L.festKort.length; i++) {
        if (iRekt(p, L.festKort[i])) {
          var s = SAKER[L.festKort[i].i];
          pet();
          say(s.best + ' är ' + ORD[s.n] + ' klossar lång.');
          burst(p.x, p.y, 4);
          return;
        }
      }
      return;
    }
    if (G.fas === 'gissa') {
      for (var k = 0; k < L.kortHits.length; k++) {
        if (iRekt(p, L.kortHits[k])) { G.valdT = k; gissa(L.kortHits[k].v); return; }
      }
      return;
    }
    if (G.fas === 'klar') {
      if (iCirc(p, L.nasta)) { nasta(); return; }
      return;
    }
    if (G.fas === 'mata') {
      if (iMatyta(p) || iTray(p)) {
        G.drag = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
        return;
      }
    }
  }, { passive: false });

  cv.addEventListener('pointermove', function (e) {
    var p = pos_(e);
    if (G.drag) {
      if (!G.drag.moved && Math.hypot(p.x - G.drag.sx, p.y - G.drag.sy) > 8) G.drag.moved = true;
      G.drag.x = p.x; G.drag.y = p.y;
      return;
    }
    if (G.fas === 'gissa') {
      G.valdT = -1;
      for (var k = 0; k < L.kortHits.length; k++) if (iRekt(p, L.kortHits[k])) G.valdT = k;
    }
  }, { passive: false });

  cv.addEventListener('pointerup', function (e) {
    if (!G.drag) return;
    var p = pos_(e);
    G.drag = null;
    if (G.fas !== 'mata') return;
    if (iMatyta(p) || iTray(p)) lagg();
  }, { passive: false });

  cv.addEventListener('pointercancel', function () { G.drag = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 140); });

  /* ---------------- testkrok ---------------- */
  window.__mk = {
    state: function () {
      var sak = SAKER[G.ri];
      return {
        fas: G.fas, ri: G.ri, n: sak ? sak.n : 0, gissa: G.giss, lagt: G.lagt,
        stjarnor: G.stjarnor, kort: gissKort(), fel: errs.length,
        W: W, H: H, s: Math.round(L.s * 100) / 100,
        bw: Math.round(L.bw), rowX0: Math.round(L.rowX0), rowTop: Math.round(L.rowTop),
        rowBottom: Math.round(L.rowBottom), objTop: Math.round(L.objTop),
        trayTop: Math.round(L.trayTop),
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        nasta: L.nasta ? { x: Math.round(L.nasta.x), y: Math.round(L.nasta.y), r: Math.round(L.nasta.r) } : null,
        hits: L.kortHits.map(function (h) { return { x: Math.round(h.x), y: Math.round(h.y), w: Math.round(h.w), h: Math.round(h.h), v: h.v }; }),
        errs: errs.slice()
      };
    },
    start: function () { startSpel(); return this.state(); },
    gissa: function (i) { var k = L.kortHits[i] || gissKort().map(function (v) { return { v: v }; })[i]; gissa(k.v); return this.state(); },
    lagg: function (k) { k = k || 1; for (var i = 0; i < k; i++) lagg(); return this.state(); },
    nasta: function () { this.spola(900); nasta(); return this.state(); },
    spola: function (ms) {
      var kvar = ms / 1000, steg = 0;
      while (kvar > 0 && steg++ < 400) {
        var d = Math.min(kvar, 0.05); kvar -= d;
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