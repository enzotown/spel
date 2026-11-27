/* Dela lika — tre vänner ska få lika många bär.
 *
 * En skål med bär står längst ner och tre vänner har var sin tallrik. Barnet drar
 * ett bär i taget från skålen till en tallrik; rösten räknar hur många tallriken
 * har. När alla har lika många och det inte finns nog kvar att ge alla ett till
 * är rundan klar — och bären som blir över ligger kvar i skålen, synliga.
 *
 * Tränar: fair sharing (division som rättvisa), ett-till-ett-utdelning ("dealing
 * by ones") och resten som konkret erfarenhet. Ingen förlust, ingen tidspress.
 * Fyra rundor med rest (8→2 var + 2 över, 10→3 var + 1 över) och tre utan.
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#eef4e4', wall2: '#d6e5c5',
    cream: '#fffaf3', ink: '#3f4a3a', muted: '#7c8774',
    wood: '#c98f52', woodD: '#9a6733', woodL: '#e2b47c',
    green: '#6aa84f', greenD: '#4c8039',
    star: '#f7c948', starD: '#dfa616',
    berry: '#4b5a9e', berryD: '#37436f', berryL: '#8b9bdd',
    red: '#d9584f'
  };

  /* ---------------- innehåll ---------------- */

  var VANNER = ['Haren', 'Igelkotten', 'Fågeln'];
  var NUM = ['', 'Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex'];
  var VAR = { 1: 'Ett var!', 2: 'Två var!', 3: 'Tre var!', 4: '', 5: 'Fem var!', 6: 'Sex var!' };
  var REST = { 0: 'Inget bär blev över.', 1: 'Ett bär blev över.', 2: 'Två bär blev över.' };
  VAR[4] = 'Fyra var!';

  /* antal bär per runda (tre vänner) och vad som blir över */
  var RUNDOR = [
    { antal: 6 },    /* 2 var, 0 över */
    { antal: 9 },    /* 3 var, 0 över */
    { antal: 8 },    /* 2 var, 2 över */
    { antal: 10 },   /* 3 var, 1 över */
    { antal: 12 }    /* 4 var, 0 över */
  ];

  /* ---------------- tillstånd ---------------- */

  var W = 0, H = 0, DPR = 1, nu = 0;

  var L = {
    m: 16, s: 1, qY: 0, hudH: 0,
    friendH: 120, friendFeet: 0, friendX: [0, 0, 0],
    plateCY: 0, plateRX: 100, plateRY: 40,
    br: 16, bowlCX: 0, bowlCY: 0, bowlW: 200, bowlRY: 40,
    kottenH: 100, kottenX: 70, start: null, igen: null
  };

  var G = {
    fas: 'intro', ri: 0, bowl: [], plates: [[], [], []],
    nid: 1, drag: null, stjarnor: 0, tid: 0, saidT: -1,
    hintKey: '', glowIdx: -1, glowT: 0, gnistor: [],
    timers: [], sel: null
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
    g.gain.linearRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function lyft() { tone(440, 0.09, 0.07, 'sine', 660); }
  function plats() { tone(300, 0.09, 0.07, 'triangle', 250); }
  function pling() { tone(660, 0.10, 0.08, 'triangle'); setTimeout(function () { tone(990, 0.14, 0.06, 'triangle'); }, 95); }
  function nej() { tone(240, 0.16, 0.05, 'triangle', 185); }
  function pet() { tone(880, 0.05, 0.03, 'sine'); }
  function fanfar() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.26, 0.09, 'triangle'); }, i * 120);
    });
  }

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

    var s = clamp(Math.min(W, H) / 768, 0.62, 1.35);
    var m = clamp(Math.min(W, H) * 0.030, 10, 26);
    var starR = clamp(9 * s, 6, 12);
    var qY = m + starR * 2 + 10 * s;
    var hudH = qY + clamp(44 * s, 30, 58);
    var room = H - hudH;

    var friendH = clamp(room * 0.33, 58, 220);
    var friendFeet = hudH + room * 0.46;

    var plateW = W / 3 * 0.86;
    var bowlW = clamp(W * 0.46, 150, 380);
    var br = clamp(Math.min(plateW / (3 * 2.4), bowlW / 15), 7.5, 18);

    L.s = s; L.m = m; L.qY = qY; L.hudH = hudH;
    L.friendH = friendH;
    L.friendFeet = friendFeet;
    L.br = br;
    L.plateRX = br * 3.4;
    L.plateRY = br * 1.55;
    L.plateCY = friendFeet + L.plateRY * 0.55;
    L.bowlW = bowlW;
    L.bowlRY = Math.max(br * 2.2, bowlW * 0.15);
    L.bowlCX = W / 2;
    L.bowlCY = hudH + room * 0.84;
    L.friendX = [W * 0.20, W * 0.50, W * 0.80];

    L.kottenH = clamp(H * 0.15, 56, 130);
    L.kottenX = Math.max(L.kottenH * 0.42, W * 0.085);

    var kr = clamp(Math.min(W, H) * 0.095, 34, 66);
    L.start = { x: W / 2, y: H - clamp(H * 0.13, 58, 110), r: kr };
    L.igen = { x: W - Math.max(kr * 1.6, 86), y: H - kr * 0.85 - 34 * s, r: kr * 0.8 };
    if (W < H) { L.start.x = W * 0.62; }
  }

  /* ---------------- platser för bär ---------------- */

  function plateSpots(n, cx, cy) {
    var br = L.br, rows = [], left = n;
    var a = Math.min(3, left); rows.push(a); left -= a;
    var b = Math.min(2, left); rows.push(b); left -= b;
    while (left > 0) { var c = Math.min(3, left); rows.push(c); left -= c; }
    var ut = [];
    for (var r = 0; r < rows.length; r++) {
      var c2 = rows[r];
      if (!c2) continue;
      var y = cy + br * 0.30 - r * br * 1.42;
      for (var i = 0; i < c2; i++) {
        ut.push({ x: cx + (i - (c2 - 1) / 2) * br * 2.1, y: y });
      }
    }
    return ut;
  }

  function bowlSpots(n, cx, cy) {
    var br = L.br;
    var maxRow = Math.max(3, Math.floor((L.bowlW * 0.74) / (br * 2.15)));
    var k = Math.max(1, Math.ceil(n / maxRow));
    var rows = [], kvar = n;
    for (var r = 0; r < k; r++) {
      var c = Math.ceil(kvar / (k - r));
      if (c > maxRow) c = maxRow;
      rows.push(c); kvar -= c;
    }
    if (kvar > 0) rows[rows.length - 1] += kvar;
    var ut = [];
    for (var m = 0; m < rows.length; m++) {
      var c2 = rows[m];
      var y = cy + br * 0.22 - m * br * 1.52;
      for (var i = 0; i < c2; i++) {
        ut.push({ x: cx + (i - (c2 - 1) / 2) * br * 2.08, y: y });
      }
    }
    return ut;
  }

  function platePos(i, idx) {
    var s = plateSpots(G.plates[i].length, L.friendX[i], L.plateCY);
    return s[idx] || { x: L.friendX[i], y: L.plateCY };
  }
  function bowlPos(idx) {
    return bowlSpots(G.bowl.length, L.bowlCX, L.bowlCY)[idx] || { x: L.bowlCX, y: L.bowlCY };
  }

  /* ---------------- ritning: grunder ---------------- */

  function rr(x, y, w, h, r, fill) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }

  function el(x, y, rx, ry, f) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (f) { ctx.fillStyle = f; ctx.fill(); }
  }
  function tri(a, b, c, f) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
    ctx.closePath();
    if (f) { ctx.fillStyle = f; ctx.fill(); }
  }
  function circ(x, y, r, f) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    if (f) { ctx.fillStyle = f; ctx.fill(); }
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

  function bakgrund() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1);
    g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var rs = clamp(Math.min(W, H) * 0.030, 10, 22);
    ctx.globalAlpha = 0.40;
    circ(W - L.m - rs, L.m + rs, rs, '#ffe28a');
    ctx.globalAlpha = 1;
    /* mjuk matta under tallrikar och skål */
    ctx.save();
    ctx.globalAlpha = 0.5;
    el(W / 2, L.plateCY + L.plateRY * 1.5, W * 0.47, L.plateRY * 1.1, 'rgba(255,250,243,.55)');
    ctx.restore();
  }

  function stjarnrad() {
    var s = L.s, r = clamp(9 * s, 6, 12), gapx = r * 2.9;
    for (var i = 0; i < 5; i++) {
      var x = L.m + r + i * gapx, y = L.m + r;
      star(x, y, r, i < G.stjarnor ? COL.star : 'rgba(255,250,243,.8)',
        i < G.stjarnor ? COL.starD : 'rgba(140,130,110,.35)');
    }
  }

  function rubrik() {
    var s = L.s;
    var text = G.fas === 'fest'
      ? 'Lek fritt! Dra bären hur du vill.'
      : 'Dela bären så att alla får lika många.';
    txt(text, W / 2, L.hudH - 16 * s, clamp(18 * s, 12, 25), COL.ink, 'center', 800, W - 2 * L.m);
  }

  /* ---------------- bär och tallrikar ---------------- */

  function drawBerry(x, y, r, lyft) {
    if (lyft) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      el(x, y + r * 1.5, r * 0.95, r * 0.4, '#3f4a3a');
      ctx.restore();
      r = r * 1.12;
    }
    circ(x, y, r, COL.berryD);
    el(x - r * 0.18, y - r * 0.18, r * 0.92, r * 0.9, COL.berry);
    el(x - r * 0.42, y - r * 0.46, r * 0.34, r * 0.26, COL.berryL);
    /* den lilla kronan högst upp */
    ctx.save();
    ctx.strokeStyle = 'rgba(30,36,70,.55)';
    ctx.lineWidth = Math.max(1, r * 0.13);
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = -Math.PI / 2 + (i - 1) * 0.9;
      ctx.moveTo(x + Math.cos(a) * r * 0.24, y + Math.sin(a) * r * 0.24);
      ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPlate(i, glow) {
    var cx = L.friendX[i], cy = L.plateCY;
    var rx = L.plateRX, ry = L.plateRY;
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.16 + 0.14 * Math.sin(glow * 6);
      el(cx, cy, rx * 1.32, ry * 1.7, '#f7c948');
      ctx.restore();
    }
    el(cx, cy + ry * 0.7, rx * 0.94, ry * 0.38, 'rgba(80,70,50,.16)');
    el(cx, cy, rx, ry, '#e6d6bb');
    el(cx, cy - ry * 0.05, rx * 0.91, ry * 0.82, COL.cream);
    ctx.save();
    ctx.strokeStyle = 'rgba(196,178,148,.75)';
    ctx.lineWidth = Math.max(1, ry * 0.09);
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.05, rx * 0.66, ry * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBowlBack() {
    var cx = L.bowlCX, cy = L.bowlCY, rx = L.bowlW / 2, ry = L.bowlRY;
    el(cx, cy + ry * 0.9, rx * 1.02, ry * 0.45, 'rgba(80,70,50,.18)');
    el(cx, cy, rx, ry, COL.woodD);
    el(cx, cy - ry * 0.04, rx * 0.97, ry * 0.94, COL.wood);
    el(cx, cy - ry * 0.12, rx * 0.87, ry * 0.78, '#5c3f22');
    el(cx, cy - ry * 0.20, rx * 0.86, ry * 0.62, 'rgba(0,0,0,.32)');
  }
  function drawBowlFront() {
    var cx = L.bowlCX, cy = L.bowlCY, rx = L.bowlW / 2, ry = L.bowlRY;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0.02, Math.PI - 0.02);
    ctx.lineWidth = ry * 0.46;
    ctx.strokeStyle = COL.wood;
    ctx.lineCap = 'butt';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.02, rx, ry, 0, 0.05, Math.PI - 0.05);
    ctx.lineWidth = ry * 0.10;
    ctx.strokeStyle = COL.woodL;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------- vännerna ---------------- */

  function drawFriend(i, size, feetY, mood) {
    var cx = L.friendX[i];
    ctx.save();
    el(cx, feetY + size * 0.03, size * 0.30, size * 0.06, 'rgba(80,70,50,.16)');
    ctx.translate(cx, feetY);
    ctx.scale(size / 100, size / 100);
    try {
      if (i === 0) dHare(mood);
      else if (i === 1) dIgelkotte(mood);
      else dFagel(mood);
    } catch (e) { errs.push('van ' + i + ': ' + e); }
    ctx.restore();
  }

  function dHare(mood) {
    el(-1, 16, 27, 23, '#cbb193');
    el(3, 23, 17, 15, '#f4e8d6');
    el(-20, 30, 11, 9, '#bfa184');
    el(2, -6, 17, 16, '#d5bb9a');
    /* öron */
    el(-7, -30, 6.4, 18, '#d5bb9a');
    el(-7, -30, 3.2, 13, '#efc6ba');
    el(10, -31, 6.4, 18, '#d5bb9a');
    el(10, -31, 3.2, 13, '#efc6ba');
    /* nos och kinder */
    el(2, 2, 11, 8.4, '#f4e8d6');
    el(2, -0.5, 3.6, 2.9, '#a56f5c');
    /* ögon */
    el(-5, -9, 3.1, 3.7, '#3b2f2a');
    el(9, -9, 3.1, 3.7, '#3b2f2a');
    el(-4.1, -10.2, 1.1, 1.3, '#fff');
    el(9.9, -10.2, 1.1, 1.3, '#fff');
    /* morrhår */
    ctx.save();
    ctx.strokeStyle = 'rgba(90,72,58,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 2); ctx.lineTo(-16, 0);
    ctx.moveTo(-4, 4); ctx.lineTo(-16, 7);
    ctx.moveTo(8, 2); ctx.lineTo(20, 0);
    ctx.moveTo(8, 4); ctx.lineTo(20, 7);
    ctx.stroke();
    ctx.restore();
    /* framtassar */
    el(-7, 39, 8, 4.6, '#c3a686');
    el(9, 40, 8.4, 4.6, '#c3a686');
    if (mood === 'glad') {
      ctx.save();
      ctx.strokeStyle = '#8a5b4a'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(2, -2, 4, 0.25, Math.PI - 0.25); ctx.stroke();
      ctx.restore();
    }
  }

  function dIgelkotte(mood) {
    /* taggar runt ovankanten, först så kroppen täcker deras bas */
    for (var k = 0; k < 13; k++) {
      var a = Math.PI + k * (Math.PI / 12);
      var x1 = Math.cos(a) * 23, y1 = 14 + Math.sin(a) * 20;
      var x2 = Math.cos(a - 0.09) * 38, y2 = 14 + Math.sin(a - 0.09) * 33;
      var x3 = Math.cos(a + 0.09) * 38, y3 = 14 + Math.sin(a + 0.09) * 33;
      tri([x1, y1], [x2, y2], [x3, y3], '#6f5136');
    }
    el(0, 16, 30, 23, '#8b6a4a');
    el(-3, 22, 22, 14, '#a07c57');
    /* ansikte till höger */
    el(21, 13, 15, 14, '#dcc7a5');
    el(33, 14, 4.4, 3.6, '#3b2f2a');
    el(24, 6, 3, 3.6, '#3b2f2a');
    el(25, 5, 1.1, 1.3, '#fff');
    if (mood === 'glad') {
      ctx.save();
      ctx.strokeStyle = '#8a5b4a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(28, 15, 4, 0.2, Math.PI - 0.3); ctx.stroke();
      ctx.restore();
    }
    /* ben */
    el(-13, 36, 7, 5, '#7a5c3f');
    el(7, 37, 7, 5, '#7a5c3f');
  }

  function dFagel(mood) {
    el(0, 12, 27, 22, '#7fb7d9');
    el(2, 20, 18, 13, '#f5d76e');
    el(-16, 6, 15, 16, '#6ea8cc');
    el(14, -10, 17, 16, '#8fc0dd');
    el(14, -20, 16, 10, '#5b9bc6');
    tri([28, -10], [42, -6], [28, -2], '#f0a33c');
    el(18, -13, 3.6, 4, COL.ink);
    el(19, -14, 1.2, 1.4, 'rgba(255,255,255,.85)');
    el(-6, 8, 12, 7, '#5b9bc6');
    ctx.save();
    ctx.strokeStyle = '#f0a33c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 32); ctx.lineTo(-3, 40); ctx.moveTo(8, 32); ctx.lineTo(9, 40); ctx.stroke();
    ctx.restore();
    tri([-16, 4], [-38, -8], [-24, 14], '#5b9bc6');
  }

  /* ---------------- skärmar ---------------- */

  function drawVidare(kn, typ) {
    var r = kn.r, puls = 1 + 0.035 * Math.sin(nu * 6.2);
    ctx.save();
    ctx.globalAlpha = 0.18;
    circ(kn.x, kn.y + r * 0.22, r * 1.10 * puls, '#3f4a3a');
    ctx.restore();
    circ(kn.x, kn.y, r * puls, COL.green);
    circ(kn.x, kn.y - r * 0.3, r * 0.72, 'rgba(255,255,255,.20)');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    if (typ === 'play') {
      ctx.moveTo(kn.x - r * 0.26, kn.y - r * 0.42);
      ctx.lineTo(kn.x + r * 0.46, kn.y);
      ctx.lineTo(kn.x - r * 0.26, kn.y + r * 0.42);
    } else {
      ctx.arc(kn.x, kn.y, r * 0.44, -Math.PI * 0.35, Math.PI * 1.25);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = r * 0.16;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kn.x + r * 0.30, kn.y - r * 0.52);
      ctx.lineTo(kn.x + r * 0.56, kn.y - r * 0.18);
      ctx.lineTo(kn.x + r * 0.10, kn.y - r * 0.14);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawIntro() {
    var s = L.s;
    txt('Dela lika', W / 2, H * 0.095, clamp(38 * s, 24, 50), COL.ink, 'center', 900, W - 40);
    txt('Tre vänner vill ha bär. Alla ska få lika många.',
      W / 2, H * 0.095 + 40 * s, clamp(17 * s, 12, 22), COL.muted, 'center', 700, W * 0.88);

    /* liten demorad: tre tallrikar med två bär var, två bär kvar i skålen */
    var fh = clamp(H * 0.17, 58, 140);
    var feet = H * 0.095 + 40 * s + fh + 24 * s;
    var old = { fx: L.friendX, pc: L.plateCY, prx: L.plateRX, pry: L.plateRY, br: L.br };
    L.friendX = [W * 0.20, W * 0.50, W * 0.80];
    L.friendFeet = feet;
    L.br = clamp(Math.min(W * 0.05, fh * 0.11), 7, 16);
    L.plateRX = L.br * 3.4;
    L.plateRY = L.br * 1.55;
    L.plateCY = feet + L.plateRY * 0.55;
    for (var i = 0; i < 3; i++) {
      drawFriend(i, fh, feet, 'glad');
      drawPlate(i, 0);
      var sp = plateSpots(2, L.friendX[i], L.plateCY);
      for (var k = 0; k < sp.length; k++) drawBerry(sp[k].x, sp[k].y, L.br);
    }
    var bx = W / 2, by = H * 0.64;
    L.bowlCX = bx; L.bowlCY = by;
    L.bowlW = clamp(W * 0.34, 120, 250);
    L.bowlRY = Math.max(L.br * 2.2, L.bowlW * 0.15);
    drawBowlBack();
    var bs = bowlSpots(2, bx, by);
    for (var q = 0; q < bs.length; q++) drawBerry(bs[q].x, bs[q].y, L.br);
    drawBowlFront();

    var kh = clamp(H * 0.20, 70, 150);
    var kx = W * (W < H ? 0.20 : 0.14), ky = H - 8;
    el(kx, ky + 1, kh * 0.24, kh * 0.05, 'rgba(80,70,50,.14)');
    try { window.KOTTEN.drawAtFeet(ctx, kx, ky, kh * 0.62, { wave: true }); } catch (e) { errs.push('kotten: ' + e); }

    drawVidare(L.start, 'play');
    txt('Spela', L.start.x, L.start.y + L.start.r + 16 * s, clamp(15 * s, 11, 19), COL.ink, 'center', 800);

    L.friendX = old.fx; L.plateCY = old.pc; L.plateRX = old.prx; L.plateRY = old.pry; L.br = old.br;
    L.bowlCX = W / 2; L.bowlCY = L.hudH + (H - L.hudH) * 0.84;
  }

  function drawSpel() {
    var s = L.s, i, k;
    for (i = 0; i < 3; i++) drawFriend(i, L.friendH, L.friendFeet, 'glad');
    for (i = 0; i < 3; i++) {
      drawPlate(i, (G.glowIdx === i && G.glowT > 0) ? G.glowT : 0);
      var sp = plateSpots(G.plates[i].length, L.friendX[i], L.plateCY);
      for (k = sp.length - 1; k >= 0; k--) {
        if (G.drag && G.drag.from === 'plate' && G.drag.pi === i && G.drag.idx === k) continue;
        drawBerry(sp[k].x, sp[k].y, L.br);
      }
    }

    drawBowlBack();
    var bs = bowlSpots(G.bowl.length, L.bowlCX, L.bowlCY);
    for (k = bs.length - 1; k >= 0; k--) {
      if (G.drag && G.drag.from === 'bowl' && G.drag.idx === k) continue;
      drawBerry(bs[k].x, bs[k].y, L.br);
    }
    drawBowlFront();

    /* Kotten tittar på */
    var kh = L.kottenH;
    el(L.kottenX, H - 4, kh * 0.26, kh * 0.055, 'rgba(80,70,50,.14)');
    try { window.KOTTEN.drawAtFeet(ctx, L.kottenX, H - 2, kh * 0.62, { wave: false }); } catch (e) { errs.push('kotten: ' + e); }

    if (G.drag) drawBerry(G.drag.x, G.drag.y, L.br, true);

    /* festens knapp */
    if (G.fas === 'fest') {
      drawVidare(L.igen, 'igen');
      txt('Lek igen', L.igen.x, L.igen.y + L.igen.r + 14 * s, clamp(14 * s, 10, 18), COL.ink, 'center', 800);
    }

  }

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();
    stjarnrad();
    if (G.fas === 'intro') { drawIntro(); return; }
    rubrik();
    drawSpel();

    for (var g = 0; g < G.gnistor.length; g++) {
      var q = G.gnistor[g];
      ctx.globalAlpha = Math.max(0, q.liv);
      star(q.x, q.y, q.r, q.farg, null);
      ctx.globalAlpha = 1;
    }
    if (G.fas === 'klar') {
      ctx.save();
      txt('Lika många!', W / 2, L.hudH + 16 * L.s, clamp(24 * L.s, 16, 32), COL.greenD, 'center', 900, W - 30);
      ctx.restore();
    }
  }

  /* ---------------- spel ---------------- */

  function newBowl(n) {
    G.bowl = [];
    G.plates = [[], [], []];
    for (var i = 0; i < n; i++) G.bowl.push(G.nid++);
  }

  function startSpel() {
    G.fas = 'spel'; G.ri = 0; G.stjarnor = 0; G.drag = null;
    G.hintKey = ''; G.glowIdx = -1; G.glowT = 0; G.saidT = -1; G.tid = 0;
    newBowl(RUNDOR[0].antal);
    layout();
    say('Dela ut ett bär i taget. Alla ska få lika många.', true);
  }

  function nasta() {
    G.ri++;
    if (G.ri >= RUNDOR.length) {
      G.ri = RUNDOR.length - 1;
      G.fas = 'fest';
      newBowl(12);
      G.drag = null; G.glowIdx = -1;
      layout();
      fanfar();
      burst(W / 2, H * 0.3, 24);
      say('Alla bär är delade! Bra jobbat!', true);
      efter(2600, function () {
        if (G.fas === 'fest') say('Nu är det fest! Dra bären hur du vill.');
      });
      return;
    }
    G.fas = 'spel';
    G.drag = null; G.hintKey = ''; G.glowIdx = -1; G.glowT = 0; G.saidT = -1; G.tid = 0;
    newBowl(RUNDOR[G.ri].antal);
    layout();
    say('Dela ut ett bär i taget. Alla ska få lika många.', true);
  }

  function counts() { return [G.plates[0].length, G.plates[1].length, G.plates[2].length]; }

  function kolla() {
    if (G.fas !== 'spel') return;
    var c = counts(), b = G.bowl.length;
    var lika = c[0] === c[1] && c[1] === c[2];
    var key = c.join(',') + '|' + b;

    if (lika && c[0] > 0 && b < 3) { vinst(c[0], b); return; }

    if (lika && b >= 3) {
      if (G.hintKey !== key + '|mer') {
        G.hintKey = key + '|mer';
        pling();
        say('Alla har lika många. Men det är fler bär kvar — ge alla ett till!', true);
      }
      return;
    }

    if (b === 0 && !lika) {
      var mx = Math.max(c[0], c[1], c[2]);
      G.glowIdx = c.indexOf(mx);
      G.glowT = 2.6;
      if (G.hintKey !== key + '|ojamn') {
        G.hintKey = key + '|ojamn';
        nej();
        say('Nästan! Alla ska ha lika många.', true);
        efter(1500, function () {
          if (G.fas === 'spel') say('Flytta ett bär från den som har flest.', true);
        });
      }
    }
  }

  function vinst(n, rest) {
    G.fas = 'klar';
    G.drag = null; G.glowIdx = -1; G.glowT = 0;
    G.stjarnor = Math.min(5, G.stjarnor + 1);
    pling();
    burst(W / 2, L.plateCY - L.plateRY, 18);
    say('Alla har lika många!', true);
    efter(1600, function () { if (VAR[n]) say(VAR[n], true); });
    efter(2600, function () { if (REST[rest]) say(REST[rest], true); });
    efter(5200, function () { if (G.fas === 'klar') nasta(); });
  }

  function sagaN(antal) {
    if (antal <= 0) return;
    if (antal <= 6) say(NUM[antal], true);
    else say('Oj, så många!', true);
  }

  function flytta(from, pi, idx, tillPlats) {
    var arr = from === 'bowl' ? G.bowl : G.plates[pi];
    if (idx < 0 || idx >= arr.length) return false;
    var id = arr.splice(idx, 1)[0];
    if (from === 'bowl' && tillPlats >= 0) {
      G.plates[tillPlats].push(id);
      plats();
      if (G.fas === 'spel') { efter(650, kolla); }
      return G.plates[tillPlats].length;
    }
    if (from === 'plate' && tillPlats >= 0 && tillPlats !== pi) {
      G.plates[tillPlats].push(id);
      plats();
      if (G.fas === 'spel') efter(650, kolla);
      return G.plates[tillPlats].length;
    }
    /* tillbaka till skålen */
    G.bowl.push(id);
    plats();
    if (G.fas === 'spel') efter(650, kolla);
    return -1;
  }

  /* ---------------- pek ---------------- */

  function pos_(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function iCirc(p, c) { return Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.2; }

  function plateVid(p) {
    for (var i = 0; i < 3; i++) {
      var dx = (p.x - L.friendX[i]) / (L.plateRX * 1.35);
      var dy = (p.y - L.plateCY) / (L.plateRY * 2.0);
      if (dx * dx + dy * dy <= 1) return i;
    }
    return -1;
  }
  function overBowl(p) {
    var dx = (p.x - L.bowlCX) / (L.bowlW * 0.58);
    var dy = (p.y - L.bowlCY) / (L.bowlRY * 1.7);
    return dx * dx + dy * dy <= 1;
  }

  function berryVid(p) {
    var best = null, bd = 1e9, i, k;
    /* tallrikarna först (de ligger framme), överst först */
    for (i = 0; i < 3; i++) {
      var sp = plateSpots(G.plates[i].length, L.friendX[i], L.plateCY);
      for (k = sp.length - 1; k >= 0; k--) {
        var d = Math.hypot(p.x - sp[k].x, p.y - sp[k].y);
        if (d < L.br * 1.7 && d < bd) { bd = d; best = { from: 'plate', pi: i, idx: k }; }
      }
    }
    var bs = bowlSpots(G.bowl.length, L.bowlCX, L.bowlCY);
    for (k = bs.length - 1; k >= 0; k--) {
      var d2 = Math.hypot(p.x - bs[k].x, p.y - bs[k].y);
      if (d2 < L.br * 1.7 && d2 < bd) { bd = d2; best = { from: 'bowl', pi: -1, idx: k }; }
    }
    return best;
  }

  function ner(p) {
    if (G.fas === 'intro') { if (iCirc(p, L.start)) startSpel(); return; }
    if (G.fas === 'fest' && iCirc(p, L.igen)) { startSpel(); return; }
    if (G.fas !== 'spel' && G.fas !== 'fest') return;
    var b = berryVid(p);
    if (!b) return;
    G.drag = { from: b.from, pi: b.pi, idx: b.idx, x: p.x, y: p.y, ox: p.x, oy: p.y, rord: false };
    lyft();
  }

  function ror(p) {
    if (!G.drag) return;
    G.drag.x = p.x; G.drag.y = p.y;
    if (Math.hypot(p.x - G.drag.ox, p.y - G.drag.oy) > 8) G.drag.rord = true;
  }

  function upp(p) {
    if (!G.drag) return;
    var d = G.drag;
    G.drag = null;
    var pl = plateVid(p);
    var antal = -1;
    if (pl >= 0 && !(d.from === 'plate' && d.pi === pl)) {
      antal = flytta(d.from, d.pi, d.idx, pl);
    } else if (overBowl(p) && d.from === 'plate') {
      antal = flytta('plate', d.pi, d.idx, -1);
    } else if (!d.rord && d.from === 'plate') {
      /* ett tryck på ett bär på tallriken: säg hur många den har */
      pet();
      say('' + (G.plates[d.pi].length ? NUM[Math.min(6, G.plates[d.pi].length)] : ''), true);
      return;
    }
    if (antal > 0) { sagaN(antal); }
    else if (antal === -1 && d.from === 'bowl') { /* ned igen */ }
    if (G.fas === 'fest' && antal > 0) efter(500, function () {});
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    try { ner(pos_(e)); } catch (err) { errs.push('ner: ' + err); }
  }, { passive: false });
  cv.addEventListener('pointermove', function (e) {
    if (!G.drag) return;
    e.preventDefault();
    try { ror(pos_(e)); } catch (err) { errs.push('ror: ' + err); }
  }, { passive: false });
  cv.addEventListener('pointerup', function (e) {
    if (!G.drag) return;
    e.preventDefault();
    try { upp(pos_(e)); } catch (err) { errs.push('upp: ' + err); }
  }, { passive: false });
  cv.addEventListener('pointercancel', function () { G.drag = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 140); });

  /* ---------------- uppdatering ---------------- */

  function burst(x, y, antal) {
    for (var i = 0; i < antal; i++) {
      var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 170;
      G.gnistor.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70,
        r: 3 + Math.random() * 5, liv: 1,
        farg: [COL.star, '#fff', COL.green, '#e8843c'][i % 4]
      });
    }
  }

  function update(dt) {
    G.tid += dt;
    if (G.glowT > 0) G.glowT = Math.max(0, G.glowT - dt);
    for (var i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) {
        var fn = G.timers[i].fn;
        G.timers.splice(i, 1);
        try { fn(); } catch (e) { errs.push('timer: ' + e); }
      }
    }
    for (var g = G.gnistor.length - 1; g >= 0; g--) {
      var q = G.gnistor[g];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; q.liv -= dt * 0.65;
      if (q.liv <= 0) G.gnistor.splice(g, 1);
    }
    if (G.fas === 'spel' && !G.drag && G.tid > 14 && G.saidT !== G.ri) {
      G.saidT = G.ri;
      say('Titta på tallrikarna. Vem har minst?', true);
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

  /* ---------------- testkrok ---------------- */

  function state() {
    return {
      fas: G.fas, ri: G.ri, stjarnor: G.stjarnor,
      bowl: G.bowl.length, plates: counts(),
      drag: G.drag ? { from: G.drag.from, pi: G.drag.pi, idx: G.drag.idx } : null,
      br: Math.round(L.br * 10) / 10,
      bowlRekt: { cx: Math.round(L.bowlCX), cy: Math.round(L.bowlCY), w: Math.round(L.bowlW) },
      plateY: Math.round(L.plateCY), friendX: L.friendX.map(function (v) { return Math.round(v); }),
      friendFeet: Math.round(L.friendFeet), friendH: Math.round(L.friendH),
      start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
      igen: L.igen ? { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) } : null,
      W: W, H: H, errs: errs.slice()
    };
  }

  window.__dl = {
    state: state,
    pos: function () {
      return {
        bowl: bowlSpots(G.bowl.length, L.bowlCX, L.bowlCY),
        plates: [0, 1, 2].map(function (i) { return plateSpots(G.plates[i].length, L.friendX[i], L.plateCY); }),
        plateY: L.plateCY, bowlCX: L.bowlCX, bowlCY: L.bowlCY
      };
    },
    start: function () { startSpel(); return state(); },
    tap: function (x, y) { ner({ x: x, y: y }); upp({ x: x, y: y }); return state(); },
    drag: function (x1, y1, x2, y2) {
      ner({ x: x1, y: y1 }); ror({ x: x2, y: y2 }); upp({ x: x2, y: y2 });
      return state();
    },
    /* lägg n bär från skålen på tallrik pi, för snabb genomspelning */
    put: function (pi, n) {
      for (var i = 0; i < n && G.bowl.length; i++) {
        var bs = bowlSpots(G.bowl.length, L.bowlCX, L.bowlCY);
        var k = bs.length - 1;
        var sp = plateSpots(G.plates[pi].length, L.friendX[pi], L.plateCY);
        var mål = sp[0] || { x: L.friendX[pi], y: L.plateCY };
        ner({ x: bs[k].x, y: bs[k].y });
        ror({ x: mål.x, y: mål.y });
        upp({ x: mål.x, y: mål.y });
      }
      return state();
    },
    kolla: function () { kolla(); return state(); },
    nasta: function () { nasta(); return state(); },
    spola: function (ms) {
      var kvar = ms / 1000, steg = 0;
      while (kvar > 0 && steg++ < 500) {
        var d = Math.min(kvar, 0.05); kvar -= d;
        if (G.glowT > 0) G.glowT = Math.max(0, G.glowT - d);
        for (var i = G.timers.length - 1; i >= 0; i--) {
          G.timers[i].t -= d;
          if (G.timers[i].t <= 0) {
            var fn = G.timers[i].fn;
            G.timers.splice(i, 1);
            try { fn(); } catch (e) { errs.push('timer: ' + e); }
          }
        }
      }
      return state();
    },
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