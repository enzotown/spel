/* Kulramen — rekenrek (kulram med fem och fem) för barn 4–7 år.
 *
 * Två rader med tio kulor, fem röda och fem vita. Barnet skjuter kulorna
 * åt vänster med ett finger; Kotten frågar "Visa sju kular!" och rösten säger
 * hur många som ligger framme. När talet stämmer flyger en stjärna upp.
 *
 * Tränar: femstrukturen (5 + något), subitisering och talbilder — att se
 * mängden som en grupp i stället för att räkna en och en. Ingen förlust:
 * fel antal ger bara "Prova igen!", och efter två försök lyser rätt kula.
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    bg1: '#f6f1de', bg2: '#e7dcc0',
    cream: '#fffaf3', ink: '#4a4033', muted: '#8a7d63',
    wood: '#b07a42', woodD: '#7e5327', woodL: '#d3a269',
    wire: '#7b6a52',
    red: '#d9584f', redD: '#a83f38', redL: '#f09089',
    white: '#fffaf3', whiteD: '#cdbfa5', whiteL: '#ffffff',
    green: '#6aa84f', greenD: '#41702f',
    star: '#f7c948', starD: '#dfa616',
    shadow: 'rgba(74,64,51,.18)'
  };

  var TAL = ['', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'];
  var TALSTOR = ['', 'Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex', 'Sju', 'Åtta', 'Nio', 'Tio'];
  var FEMFRAS = {
    6: 'Fem och ett — sex', 7: 'Fem och två — sju', 8: 'Fem och tre — åtta',
    9: 'Fem och fyra — nio', 10: 'Fem och fem — tio'
  };

  var W = 0, H = 0, DPR = 1, nu = 0;
  var s = 1;
  var hits = [];

  var L = {
    rackX: 0, rackW: 0, d: 60, r: 26, x0: 0, xR: 0, rows: 1,
    rowY: [0, 0], blockTop: 0, blockH: 0,
    sign: null, spel: null, kotten: { x: 0, y: 0, h: 0 }, lyssna: null, igen: null
  };

  var G = {
    fas: 'intro', runda: 0, mal: 0, stjarnor: 0,
    rader: [{ antal: 0 }, { antal: 0 }],
    beads: [[], []],
    idle: 0, felAntal: 0, hint: false, hintT: 0, klarT: 0, tid: 0,
    saForAntal: -1, flyers: [], gnistor: [], konfetti: [], skaka: 0
  };

  var MALS = [3, 5, 7, 4, 8, 6, 9, 10];

  /* ---------------- ljud ---------------- */

  var AC = null;
  function ac() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }

  function tone(f, dur, vol, typ, slide) {
    var a = ac();
    if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain();
      o.type = typ || 'sine';
      o.frequency.setValueAtTime(f, a.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, a.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur + 0.02);
    } catch (e) {}
  }

  function klick(n) { tone(300 + n * 46, 0.09, 0.10, 'triangle', 260 + n * 40); }
  function pling() { tone(880, 0.18, 0.13, 'sine'); setTimeout(function () { tone(1320, 0.26, 0.10, 'sine'); }, 110); }
  function nej() { tone(300, 0.14, 0.07, 'sine', 240); }
  function festLjud() {
    [523, 659, 784, 1046].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.28, 0.10, 'triangle'); }, i * 120);
    });
  }

  function say(t, now) {
  /* rösten är en inspelad mp3-fil (Shipholm TTS) – saknas den är appen tyst */
  if (!t) return;
  if (window.__rost && window.__rost(t)) return;
}

  /* ---------------- layout ---------------- */

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(300, window.innerWidth);
    H = Math.max(300, window.innerHeight);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    layout();
  }

  /* kulornas plats på tråden: framflyttade kulor ligger till vänster,
     resten bunches vid höger ände — luckan mellan grupperna är femman */
  function placera() {
    for (var row = 0; row < 2; row++) {
      if (!G.beads[row] || G.beads[row].length !== 10) {
        G.beads[row] = [];
        for (var k = 0; k < 10; k++) G.beads[row].push({ x: 0, y: 0, inited: false });
      }
      for (var j = 0; j < 10; j++) {
        var b = G.beads[row][j];
        var tx = (j < G.rader[row].antal) ? (L.x0 + j * L.d) : (L.xR - (9 - j) * L.d);
        if (!b.inited) { b.x = tx; b.inited = true; }
        b.tx = tx;
        b.y = L.rowY[row];
      }
    }
  }

  function layout() {
    s = Math.max(0.72, Math.min(1.3, Math.min(W, H) / 768));
    L.rows = (G.fas === 'fest' || G.fas === 'intro') ? 2 : 1;

    var rackWmax = Math.min(W * 0.92, 1000);
    var bandTop = H * 0.20, bandBot = H * 0.755;
    var availH = bandBot - bandTop;
    var need = 2.5 * L.rows + 0.5 * (L.rows - 1);
    L.d = Math.min(rackWmax / 11.7, availH / need);
    L.r = L.d * 0.44;

    var postW = Math.max(13, Math.min(26, W * 0.022));
    L.rackW = 11.7 * L.d + 2 * postW + 8;
    L.rackX = (W - L.rackW) / 2;
    L.x0 = L.rackX + postW + 8 + L.r;
    L.xR = L.x0 + 10.7 * L.d;

    L.blockH = need * L.d;
    L.blockTop = bandTop + (availH - L.blockH) / 2;
    for (var r = 0; r < 2; r++) L.rowY[r] = L.blockTop + L.d * 1.25 + r * 3 * L.d;

    /* kulornas mål-x räknas ur radens antal */
    placera();

    /* skylten med talet */
    var sw = Math.min(W * 0.60, 520 * s), sh = Math.max(70, Math.min(H * 0.135, 132 * s));
    L.sign = { x: (W - sw) / 2, y: Math.max(10, H * 0.045), w: sw, h: sh };
    L.lyssna = { x: Math.min(W - 36, L.sign.x + sw + 40 * s), y: L.sign.y + sh / 2, r: 25 * s };

    /* Kotten nere till vänster */
    var kh = Math.min(H * 0.235, W * 0.27, 260);
    L.kotten.h = kh;
    L.kotten.x = Math.max(kh * 0.55, W * 0.115);
    L.kotten.y = H - 4;

    /* "en gång till"-knappen i festen — ovanför Lgr22-märket i hörnet */
    var rr = 40 * s;
    L.igen = { x: W - rr - 30 * s, y: H - rr - 78 * s, r: rr };
  }

  /* ---------------- spel ---------------- */

  function startGame() {
    G.fas = 'spel'; G.runda = 0; G.stjarnor = 0;
    G.rader[0].antal = 0; G.rader[1].antal = 0;
    G.flyers = []; G.gnistor = []; G.konfetti = [];
    layout();
    say('Fem röda och fem vita.');
    setTimeout(function () { if (G.fas === 'spel') newRound(); }, 900);
  }

  function newRound() {
    if (G.runda >= MALS.length) { fest(); return; }
    G.fas = 'spel';
    G.mal = MALS[G.runda];
    G.rader[0].antal = 0;
    G.idle = 0; G.idleSedan = 0; G.felAntal = 0; G.hint = false; G.hintT = 0; G.saForAntal = -1;
    G.skaka = 0;
    layout();
    say('Visa ' + TAL[G.mal] + ' kular.', true);
  }

  function fest() {
    G.fas = 'fest';
    G.rader[0].antal = 5; G.rader[1].antal = 0;
    G.mal = 0;
    layout();
    konfettiBurst(70);
    festLjud();
    say('Nu är det fest!', true);
    setTimeout(function () { if (G.fas === 'fest') say('Dra kularna dit du vill.'); }, 1500);
  }

  function restart() {
    G.rader[0].antal = 0; G.rader[1].antal = 0;
    startGame();
  }

  function pick(row, i) {
    if (G.fas === 'intro') return;
    if (row === 1 && G.fas !== 'fest') return;   /* undre raden är bara med på festen */
    var r = G.rader[row];
    var ny = (i + 1 > r.antal) ? i + 1 : i;
    if (ny === r.antal) { klick(ny); return; }
    r.antal = ny;
    placera();
    klick(ny);
    G.idle = 0; G.idleSedan = 0; G.saForAntal = -1;
    if (G.fas === 'fest') {
      if (ny > 0) say(ny > 5 ? FEMFRAS[ny] : TALSTOR[ny]);
      return;
    }
    if (G.fas === 'spel') {
      if (ny === G.mal) { ratt(); }
      else if (ny > 0) say(TALSTOR[ny]);
    }
  }

  function ratt() {
    G.fas = 'ratt';
    G.klarT = 0;
    G.klarT0 = performance.now();
    G.stjarnor = Math.min(MALS.length, G.runda + 1);
    pling();
    var n = G.mal;
    say(n > 5 ? FEMFRAS[n] : TALSTOR[n], true);
    setTimeout(function () { if (G.fas === 'ratt') say('Precis!'); }, 800);
    /* stjärna som flyger upp från skylten */
    G.flyers.push({ x: L.sign.x + L.sign.w / 2, y: L.sign.y + L.sign.h / 2, t: 0, vx: 0, vy: -120 });
    konfettiBurst(26);
  }

  function konfettiBurst(n) {
    for (var i = 0; i < n; i++) {
      G.konfetti.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.5,
        y: H * 0.28 + (Math.random() - 0.5) * H * 0.1,
        vx: (Math.random() - 0.5) * 260,
        vy: -160 - Math.random() * 220,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 8,
        c: [COL.star, COL.red, COL.green, COL.woodL, '#8b9bdd'][i % 5],
        t: 0, size: 6 + Math.random() * 7
      });
    }
  }

  /* ---------------- pek ---------------- */

  function tap(x, y) {
    ac();
    for (var k = hits.length - 1; k >= 0; k--) {
      var h = hits[k];
      var dx = x - h.x, dy = y - h.y;
      var rr = h.r + 10;
      if (dx * dx + dy * dy <= rr * rr) {
        if (h.kind === 'bead') { pick(h.row, h.i); return true; }
        if (h.kind === 'spela') { startGame(); return true; }
        if (h.kind === 'lyssna') { repeat(); return true; }
        if (h.kind === 'igen') { restart(); return true; }
      }
    }
    return false;
  }

  function repeat() {
    if (G.fas === 'spel') say('Visa ' + TAL[G.mal] + ' kular.', true);
    else if (G.fas === 'ratt') say(TALSTOR[G.mal], true);
    else if (G.fas === 'fest') say('Dra kularna dit du vill.', true);
    else say('Tryck på en kula.', true);
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    tap(e.clientX, e.clientY);
  }, { passive: false });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  /* ---------------- rita ---------------- */

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(t, x, y, size, col, weight, align) {
    ctx.font = (weight || '700') + ' ' + size + 'px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = col;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }

  function star(x, y, r, col, colD) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rad = (i % 2 === 0) ? r : r * 0.45;
      var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    if (colD) { ctx.lineWidth = Math.max(1.2, r * 0.10); ctx.strokeStyle = colD; ctx.stroke(); }
  }

  function bg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.bg1); g.addColorStop(1, COL.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    /* mjukt ljus bakom ramen */
    var rg = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.45, Math.max(W, H) * 0.55);
    rg.addColorStop(0, 'rgba(255,252,240,.85)');
    rg.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRack() {
    var postW = Math.max(13, Math.min(26, W * 0.022));
    var top = L.blockTop - 0.55 * L.d;
    var bot = L.blockTop + L.blockH + 0.55 * L.d;
    var xL = L.rackX, xR2 = L.rackX + L.rackW;

    /* skugga under ramen */
    ctx.save();
    ctx.shadowColor = COL.shadow;
    ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = COL.wood;
    rr(xL, top, postW, bot - top, postW * 0.4); ctx.fill();
    rr(xR2 - postW, top, postW, bot - top, postW * 0.4); ctx.fill();
    ctx.restore();

    /* träets ljusa kant */
    ctx.fillStyle = COL.woodL;
    rr(xL + 3, top + 4, postW * 0.32, bot - top - 8, postW * 0.16); ctx.fill();
    rr(xR2 - postW + 3, top + 4, postW * 0.32, bot - top - 8, postW * 0.16); ctx.fill();

    var visar = (L.rows === 1) ? 1 : 2;
    for (var r = 0; r < visar; r++) {
      var y = L.rowY[r];
      var dim = (L.rows === 2 && r === 1 && (G.fas === 'spel' || G.fas === 'ratt'));
      /* ståltråden */
      ctx.strokeStyle = COL.wire;
      ctx.lineWidth = Math.max(3, L.d * 0.055);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(L.x0 - L.r * 1.5, y);
      ctx.lineTo(L.xR + L.r * 1.5, y);
      ctx.stroke();
      /* liten glans på tråden */
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = Math.max(1, L.d * 0.016);
      ctx.beginPath();
      ctx.moveTo(L.x0 - L.r * 1.4, y - L.d * 0.02);
      ctx.lineTo(L.xR + L.r * 1.4, y - L.d * 0.02);
      ctx.stroke();

      ctx.save();
      if (dim) ctx.globalAlpha = 0.45;
      for (var i = 0; i < 10; i++) {
        drawBead(r, i, G.beads[r][i].x, y);
      }
      ctx.restore();
    }

  }

  function drawBead(row, i, x, y) {
    var r = L.r;
    var rod = i < 5;
    var base = rod ? COL.red : COL.white;
    var dark = rod ? COL.redD : COL.whiteD;

    /* skugga */
    ctx.beginPath();
    ctx.ellipse(x + r * 0.10, y + r * 0.20, r * 0.96, r * 0.92, 0, 0, 6.283);
    ctx.fillStyle = 'rgba(74,64,51,.18)';
    ctx.fill();

    /* kulan */
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.40, r * 0.15, x, y, r * 1.05);
    g.addColorStop(0, rod ? COL.redL : COL.whiteL);
    g.addColorStop(0.55, base);
    g.addColorStop(1, dark);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = dark;
    ctx.stroke();

    /* glans */
    ctx.beginPath();
    ctx.ellipse(x - r * 0.33, y - r * 0.38, r * 0.24, r * 0.16, -0.7, 0, 6.283);
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.fill();

    /* hål för tråden */
    ctx.beginPath();
    ctx.arc(x, y, r * 0.16, 0, 6.283);
    ctx.fillStyle = 'rgba(74,64,51,.35)';
    ctx.fill();

    /* lysande ring på rätt kula när barnet kört fast */
    if (G.fas === 'spel' && row === 0 && G.hint && i === G.mal - 1) {
      var pul = 0.5 + 0.5 * Math.sin(nu * 6);
      ctx.beginPath();
      ctx.arc(x, y, r * (1.28 + 0.14 * pul), 0, 6.283);
      ctx.strokeStyle = 'rgba(247,201,72,' + (0.55 + 0.4 * pul) + ')';
      ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.stroke();
    }

    hits.push({ kind: 'bead', row: row, i: i, id: row + ':' + i, x: x, y: y, r: Math.max(30, r * 1.15) });
  }

  function drawSign() {
    var b = L.sign;
    /* plakett i trä */
    ctx.save();
    ctx.shadowColor = COL.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = COL.wood;
    rr(b.x, b.y, b.w, b.h, b.h * 0.26); ctx.fill();
    ctx.restore();
    ctx.fillStyle = COL.woodD;
    rr(b.x + 5, b.y + b.h - 12, b.w - 10, 7, 3); ctx.fill();
    ctx.fillStyle = COL.cream;
    rr(b.x + 10, b.y + 8, b.w - 20, b.h - 22, b.h * 0.20); ctx.fill();

    var cx = b.x + b.w / 2, cy = b.y + (b.h - 14) / 2 + 4;

    if (G.fas === 'ratt') {
      text('PRECIS!', cx, cy - b.h * 0.10, Math.min(b.h * 0.22, 26 * s), COL.greenD, '800');
      text(TALSTOR[G.mal].toUpperCase() + '!', cx, cy + b.h * 0.20, Math.min(b.h * 0.46, 58 * s), COL.ink, '900');
    } else {
      text('VISA', cx, cy - b.h * 0.26, Math.min(b.h * 0.20, 24 * s), COL.muted, '800');
      /* talet stort, med en liten rad prickar under */
      var fs = Math.min(b.h * 0.58, 72 * s);
      text(String(G.mal), cx, cy + b.h * 0.10, fs, COL.ink, '900');
    }

    /* upprepa-knapp */
    var l = L.lyssna;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, 6.283);
    ctx.fillStyle = COL.cream;
    ctx.fill();
    ctx.lineWidth = Math.max(2, l.r * 0.10);
    ctx.strokeStyle = COL.wood;
    ctx.stroke();
    /* högtalare */
    var q = l.r * 0.42;
    ctx.fillStyle = COL.woodD;
    ctx.beginPath();
    ctx.moveTo(l.x - q * 0.95, l.y - q * 0.42);
    ctx.lineTo(l.x - q * 0.30, l.y - q * 0.42);
    ctx.lineTo(l.x + q * 0.22, l.y - q * 0.95);
    ctx.lineTo(l.x + q * 0.22, l.y + q * 0.95);
    ctx.lineTo(l.x - q * 0.30, l.y + q * 0.42);
    ctx.lineTo(l.x - q * 0.95, l.y + q * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COL.woodD;
    ctx.lineWidth = Math.max(1.6, l.r * 0.10);
    ctx.beginPath();
    ctx.arc(l.x + q * 0.25, l.y, q * 0.75, -0.8, 0.8);
    ctx.stroke();
    hits.push({ kind: 'lyssna', id: 'lyssna', x: l.x, y: l.y, r: Math.max(30, l.r) });
  }

  function drawStars() {
    var n = MALS.length, r = Math.min(11 * s, W * 0.016);
    var x0 = 16 * s + r;
    var y = 22 * s;
    for (var i = 0; i < n; i++) {
      var fylld = i < G.stjarnor;
      star(x0 + i * (r * 2.5), y, r, fylld ? COL.star : 'rgba(74,64,51,.13)', fylld ? COL.starD : null);
    }
  }

  function drawKotten() {
    var k = L.kotten;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(k.x, k.y - 2, k.h * 0.28, k.h * 0.075, 0, 0, 6.283);
    ctx.fillStyle = 'rgba(74,64,51,.16)';
    ctx.fill();
    ctx.restore();
    try {
      KOTTEN.drawAtFeet(ctx, k.x, k.y, k.h, { wave: (Math.sin(nu * 1.6) * 0.5 + 0.5) * 0.5 });
    } catch (e) { errs.push('kotten: ' + e.message); }
  }

  function drawIntro() {
    /* ramen står med fem kulor framme som en hälsning */
    drawRack();
    var b = L.sign;
    ctx.save();
    ctx.shadowColor = COL.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = COL.wood;
    rr(b.x, b.y, b.w, b.h, b.h * 0.26); ctx.fill();
    ctx.restore();
    ctx.fillStyle = COL.cream;
    rr(b.x + 10, b.y + 8, b.w - 20, b.h - 22, b.h * 0.20); ctx.fill();
    text('KULRAMEN', b.x + b.w / 2, b.y + (b.h - 14) / 2 + 4, Math.min(b.h * 0.34, 44 * s), COL.ink, '900');

    var under = 'Fem röda och fem vita';
    text(under, W / 2, b.y + b.h + 16 * s, Math.min(18 * s, 24), COL.muted, '700');

    /* stor rund startknapp */
    var r = Math.min(52 * s, W * 0.09, H * 0.08);
    var cx = W * 0.66, cy = H - r - 44 * s;
    var pul = 1 + 0.035 * Math.sin(nu * 6.2);
    ctx.save();
    ctx.shadowColor = 'rgba(65,112,47,.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r * pul, 0, 6.283);
    ctx.fillStyle = COL.green;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r * pul, 0, 6.283);
    ctx.lineWidth = 4; ctx.strokeStyle = COL.greenD; ctx.stroke();
    /* play-ikon */
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.26, cy - r * 0.38);
    ctx.lineTo(cx + r * 0.42, cy);
    ctx.lineTo(cx - r * 0.26, cy + r * 0.38);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    hits.push({ kind: 'spela', id: 'spela', x: cx, y: cy, r: r });

    /* liten pill med text under knappen */
    var tw = 150 * s, th = 26 * s;
    ctx.fillStyle = COL.cream;
    rr(cx - tw / 2, cy + r + 12 * s, tw, th, th / 2); ctx.fill();
    text('BÖRJA', cx, cy + r + 12 * s + th / 2 + 1, 14 * s, COL.ink, '800');
  }

  function drawFest() {
    drawRack();
    var b = L.sign;
    ctx.save();
    ctx.shadowColor = COL.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = COL.wood;
    rr(b.x, b.y, b.w, b.h, b.h * 0.26); ctx.fill();
    ctx.restore();
    ctx.fillStyle = COL.cream;
    rr(b.x + 10, b.y + 8, b.w - 20, b.h - 22, b.h * 0.20); ctx.fill();
    text('FEST!', b.x + b.w / 2, b.y + (b.h - 14) / 2 + 4, Math.min(b.h * 0.40, 52 * s), COL.greenD, '900');

    /* en gång till */
    var g = L.igen;
    var pul = 1 + 0.035 * Math.sin(nu * 6.2);
    ctx.save();
    ctx.shadowColor = 'rgba(65,112,47,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r * pul, 0, 6.283);
    ctx.fillStyle = COL.green; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r * pul, 0, 6.283);
    ctx.lineWidth = 3.5; ctx.strokeStyle = COL.greenD; ctx.stroke();
    /* cirkelpil */
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(4, g.r * 0.15); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r * 0.46, -0.5, 4.4);
    ctx.stroke();
    var a = 4.4, ax = g.x + Math.cos(a) * g.r * 0.46, ay = g.y + Math.sin(a) * g.r * 0.46;
    ctx.beginPath();
    ctx.moveTo(ax + 9, ay - 2);
    ctx.lineTo(ax - 4, ay - 6);
    ctx.lineTo(ax + 1, ay + 7);
    ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    hits.push({ kind: 'igen', id: 'igen', x: g.x, y: g.y, r: g.r });

    var tw = 118 * s, th = 24 * s;
    ctx.fillStyle = COL.cream;
    rr(g.x - tw / 2, g.y + g.r + 10 * s, tw, th, th / 2); ctx.fill();
    text('igen', g.x, g.y + g.r + 10 * s + th / 2 + 1, 13 * s, COL.ink, '800');
  }

  function drawParticles(dt) {
    var i;
    for (i = G.flyers.length - 1; i >= 0; i--) {
      var f = G.flyers[i];
      f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 90 * dt;
      var a = Math.max(0, 1 - f.t / 1.2);
      ctx.save();
      ctx.globalAlpha = a;
      star(f.x, f.y, 18 * s, COL.star, COL.starD);
      ctx.restore();
      if (f.t > 1.2) G.flyers.splice(i, 1);
    }
    for (i = G.konfetti.length - 1; i >= 0; i--) {
      var k = G.konfetti[i];
      k.t += dt;
      k.vy += 420 * dt;
      k.x += k.vx * dt; k.y += k.vy * dt;
      k.rot += k.vr * dt;
      if (k.y > H + 40 || k.t > 4) { G.konfetti.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k.t - 2.4) / 1.6);
      ctx.translate(k.x, k.y);
      ctx.rotate(k.rot);
      ctx.fillStyle = k.c;
      ctx.fillRect(-k.size / 2, -k.size / 4, k.size, k.size / 2);
      ctx.restore();
    }
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bg();
    hits.length = 0;
    if (G.fas === 'intro') {
      drawIntro();
    } else if (G.fas === 'fest') {
      drawFest();
      drawStars();
    } else {
      drawRack();
      drawSign();
      drawStars();
    }
    drawKotten();
    drawParticles(G.dt || 0);
  }

  /* ---------------- loop ---------------- */

  var forra = 0;
  function frame(ts) {
    var dt = forra ? Math.min(0.05, (ts - forra) / 1000) : 0.016;
    forra = ts;
    G.dt = dt;
    nu += dt;
    G.tid += dt;

    /* mjuka kulor */
    for (var row = 0; row < 2; row++) {
      for (var i = 0; i < 10; i++) {
        var b = G.beads[row][i];
        if (!b) continue;
        b.x += (b.tx - b.x) * Math.min(1, dt * 16);
      }
    }

    if (G.fas === 'spel') {
      var n = G.rader[0].antal;
      if (n > 0 && n !== G.mal) {
        /* räkna med klockan, inte med bildrutor: en flik i bakgrunden får bara
           någon bild i sekunden, och då skulle tipset aldrig komma */
        if (!G.idleSedan) G.idleSedan = performance.now();
        G.idle = (performance.now() - G.idleSedan) / 1000;
        if (G.idle > 2.4 && G.saForAntal !== n) {
          G.saForAntal = n;
          G.felAntal++;
          say(TALSTOR[n] + '. Prova igen!');
          nej();
          if (G.felAntal >= 2) {
            G.hint = true;
            setTimeout(function () { if (G.fas === 'spel' && G.hint) say('Titta på den kulan!'); }, 1400);
          }
        }
      } else {
        G.idle = 0; G.idleSedan = 0;
      }
    } else if (G.fas === 'ratt') {
      G.klarT = (performance.now() - (G.klarT0 || performance.now())) / 1000;
      if (G.klarT > 2.0) {
        G.runda++;
        if (G.runda >= MALS.length) fest(); else newRound();
      }
    }

    if (G.hint) G.hintT += dt;

    try { draw(); } catch (e) { errs.push(e.message); }
    requestAnimationFrame(frame);
  }

  /* ---------------- start ---------------- */

  resize();
  /* intro: fem kulor framme, som en riktig femstruktur */
  G.rader[0].antal = 5;
  layout();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* testkrok */
  window.__kul = {
    state: function () {
      return {
        fas: G.fas, runda: G.runda, mal: G.mal, stjarnor: G.stjarnor,
        antal: [G.rader[0].antal, G.rader[1].antal],
        hint: G.hint, errs: errs.slice()
      };
    },
    tap: function (row, i) { pick(row, i); },
    tapXY: function (x, y) { return tap(x, y); },
    start: function () { startGame(); },
    next: function () { if (G.fas === 'ratt') { G.klarT0 = performance.now() - 3000; } },
    restart: function () { restart(); },
    fest: function () { fest(); },
    layout: function () {
      return {
        W: W, H: H, r: L.r, d: L.d, rows: L.rows, x0: L.x0, xR: L.xR,
        rowY: L.rowY.slice(), sign: L.sign, kotten: L.kotten,
        beadX: G.beads[0].map(function (b) { return Math.round(b.x); })
      };
    },
    hits: function () {
      return hits.map(function (h) {
        return { kind: h.kind, id: h.id, x: Math.round(h.x), y: Math.round(h.y), r: Math.round(h.r) };
      });
    }
  };
})();
