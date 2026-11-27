/* Så för hand — mancala (pallanguzhi/oware) för barn 4–7 år.
 *
 * En rad skålar i två stockar: fyra för dig, fyra för Kotten, plus två korgar.
 * Barnet trycker på en skål med bär — skålen lyfter sig, vandrar framåt och
 * lägger ett bär i varje nästa skål medan rösten räknar (ett, två, tre …).
 * Sista bäret i din egen korg ger en gång till. När någons stock är tom
 * räknas allt ihop: ingen förlorar, vi jämför bara och festar.
 *
 * Tränar: ett-till-ett-räkning under förflyttning (varje bär får sin egen
 * nästa skål) och att antalet bevaras när det flyttas — samma bär, andra
 * skålar. Kotten är en svag motståndare utan fångstregel.
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#f6f1de', wall2: '#e3d7b4',
    cream: '#fffaf3', ink: '#4a4033', muted: '#8a7d63',
    wood: '#b07a42', woodD: '#7e5327', woodL: '#d3a269', woodIn: '#5c3d1c',
    green: '#6aa84f', greenD: '#41702f',
    star: '#f7c948', starD: '#dfa616',
    berry: '#4b5a9e', berryD: '#37436f', berryL: '#8b9bdd',
    red: '#d9584f'
  };
  var talord = ['', 'Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex', 'Sju',
    'Åtta', 'Nio', 'Tio', 'Elva', 'Tolv'];

  /* ---------------- tillstånd ---------------- */

  var W = 0, H = 0, DPR = 1, nu = 0;

  /* Brädans tio platser:
     0–3  din rad (vänster → höger)     4  din korg (höger)
     5–8  Kottens rad (höger → vänster) 9  Kottens korg (vänster)
     Såningen går 0→1→2→3→4→5→6→7→8→9→0 och hoppar över motståndarens korg. */
  var L = {
    s: 1, m: 16, hudH: 0,
    boardX: 0, boardTop: 0, boardW: 0, bh: 0, sw: 0, cell: 0,
    pr: 60, br: 16, topY: 0, botY: 0, storeRY: 60,
    pos: [], kottenH: 80, kottenX: 70, kottenFeet: 0,
    start: null, igen: null, igenR: 40, hint: null
  };

  var G = {
    fas: 'intro', turn: 'du', b: [],
    stjarnor: 0, hand: null, flyers: [], gnistor: [],
    glow: -1, glowT: 0, tid: 0, runda: 0, hintT: -1,
    timers: [], sowWho: 'du'
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
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(vol == null ? 0.12 : vol, a.currentTime + 0.012);
    g.gain.linearRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }
  function plats() { tone(430, 0.08, 0.07, 'triangle', 300); }
  function lyft() { tone(470, 0.08, 0.06, 'sine', 700); }
  function pling() { tone(660, 0.10, 0.08, 'triangle'); setTimeout(function () { tone(990, 0.14, 0.06, 'triangle'); }, 95); }
  function nej() { tone(240, 0.16, 0.05, 'triangle', 185); }
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
  /* två delar i rad: "Du fick" + "Elva" */
  function say2(a, b) {
    if (window.__rostFler && window.__rostFler([a, b])) return;
    say(a, true);
    efter(800, function () { say(b, true); });
  }
  function sagaAntal(n) {
    if (n >= 1 && n <= 12) say(talord[n], true);
    else if (n > 12) say('Oj, så många!', true);
  }
  /* vad rösten säger om en korgs antal */
  function korgord(n) {
    if (n === 0) return 'Inget';
    if (n <= 12) return talord[n];
    return 'Oj, så många!';
  }
  function efter(ms, fn) { G.timers.push({ t: ms / 1000, fn: fn }); }

  /* ---------------- platsmatematik ---------------- */

  function minRad(i) { return i >= 0 && i <= 3; }
  function kottenRad(i) { return i >= 5 && i <= 8; }
  function korg(i) { return i === 4 || i === 9; }
  function nextSlot(i, who) {
    do { i = (i + 1) % 10; } while (who === 'du' ? i === 9 : i === 4);
    return i;
  }
  function radTom(min) {
    for (var i = (min ? 0 : 5); i <= (min ? 3 : 8); i++) if (G.b[i] > 0) return false;
    return true;
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

    var s = clamp(Math.min(W, H) / 768, 0.62, 1.35);
    var m = clamp(Math.min(W, H) * 0.030, 10, 26);
    var starR = clamp(9 * s, 6, 12);
    var qY = m + starR * 2 + 10 * s;
    var hudH = qY + clamp(40 * s, 28, 54);

    L.s = s; L.m = m; L.hudH = hudH;
    L.kottenH = clamp(H * 0.155, 58, 132);
    L.kottenX = Math.max(L.kottenH * 0.42, W * 0.085);
    L.igenR = clamp(Math.min(W, H) * 0.075, 30, 46);
    L.boardX = m;
    L.boardTop = hudH + L.kottenH + 6;
    var btn = L.igenR;
    L.boardW = W - 2 * m;
    var botten = H - m - (btn * 2 + 62);   /* plats till IGEN-knappen + lgr22-raden */
    L.bh = Math.max(180, botten - L.boardTop);
    L.sw = L.boardW * 0.16;
    var innerX0 = L.boardX + L.sw + 6;
    var innerX1 = L.boardX + L.boardW - L.sw - 6;
    L.cell = (innerX1 - innerX0) / 4;
    L.pr = clamp(Math.min(L.cell * 0.40, L.bh * 0.19), 26, 74);
    L.br = L.pr * 0.26;
    L.topY = L.boardTop + L.bh * 0.30;
    L.botY = L.boardTop + L.bh * 0.74;
    L.storeRY = Math.min(L.bh * 0.36, (L.botY - L.topY) * 0.5 + L.pr * 0.9);

    var bot = function (i) { return { x: innerX0 + (i + 0.5) * L.cell, y: L.botY }; };
    L.pos = [];
    L.pos[0] = bot(0); L.pos[1] = bot(1); L.pos[2] = bot(2); L.pos[3] = bot(3);
    L.pos[4] = { x: L.boardX + L.boardW - L.sw / 2, y: L.boardTop + L.bh * 0.52 };
    var top = function (i) { return { x: bot(8 - i).x, y: L.topY }; }; /* 5 → längst höger */
    for (var k = 5; k <= 8; k++) L.pos[k] = top(k);
    L.pos[9] = { x: L.boardX + L.sw / 2, y: L.boardTop + L.bh * 0.52 };

    L.igen = { x: W / 2, y: H - m - btn * 1.9 - 16 * s, r: btn };
    L.start = { x: (W < H ? W * 0.60 : W / 2), y: H - m - btn * 1.9 - 16 * s, r: btn };
    L.hint = { x: Math.max(L.kottenX + L.kottenH * 0.5, W * 0.30), y: L.boardTop - L.kottenH * 0.35 };
    L.kottenFeet = L.boardTop - 4;
  }

  /* ---------------- bär ---------------- */

  /* Gyllene vinkel-spiral: alla n bär syns, aldrig utanför skålen,
     allt färre per bär ju fler det blir — räkningen stämmer alltid. */
  function pile(n, cx, cy, pr, skala) {
    var ut = [];
    if (n <= 0) return ut;
    var R = pr * 0.78 * (skala || 1);
    var br = pr * 0.55 / Math.sqrt(n + 2) * (skala || 1);
    if (n === 1) { ut.push({ x: cx, y: cy, r: pr * 0.32 * (skala || 1) }); return ut; }
    for (var k = 0; k < n; k++) {
      var a = k * 2.39996 + 0.7;
      var rd = R * Math.sqrt((k + 0.5) / n);
      ut.push({ x: cx + Math.cos(a) * rd, y: cy + Math.sin(a) * rd * 0.92, r: br });
    }
    return ut;
  }

  function drawBerry(x, y, r) {
    circ(x, y, r, COL.berryD);
    el(x - r * 0.18, y - r * 0.18, r * 0.92, r * 0.9, COL.berry);
    el(x - r * 0.40, y - r * 0.44, r * 0.34, r * 0.26, COL.berryL);
  }

  /* ---------------- ritgrunder ---------------- */

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
    ctx.globalAlpha = 0.35;
    circ(W - L.m - clamp(Math.min(W, H) * 0.04, 14, 26), L.m + 22, clamp(Math.min(W, H) * 0.04, 14, 26), '#ffe28a');
    ctx.globalAlpha = 1;
  }

  function stjarnrad() {
    var s = L.s, r = clamp(9 * s, 6, 12), gapx = r * 2.9;
    for (var i = 0; i < 5; i++) {
      var x = L.m + r + i * gapx, y = L.m + r;
      star(x, y, r, i < G.stjarnor ? COL.star : 'rgba(255,250,243,.85)',
        i < G.stjarnor ? COL.starD : 'rgba(140,130,110,.35)');
    }
  }

  /* status-piller uppe till höger */
  function pill(text, bg, fg) {
    var s = L.s, fs = clamp(15 * s, 11, 20), h = fs * 2.1;
    ctx.font = 800 + ' ' + fs + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    var w = ctx.measureText(text).width + h * 1.5;
    var x = W - L.m - w, y = L.m - h * 0.15;
    rr(x, y, w, h, h / 2, bg);
    txt(text, x + w / 2, y + h / 2, fs, fg || COL.ink, 'center', 800);
  }

  /* ---------------- brädet ---------------- */

  function drawBoard() {
    var x = L.boardX, y = L.boardTop, w = L.boardW, h = L.bh;
    ctx.save();
    ctx.shadowColor = 'rgba(70,50,20,.25)';
    ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    rr(x, y, w, h, clamp(Math.min(w, h) * 0.07, 14, 30), COL.wood);
    ctx.restore();
    rr(x + 3, y + 3, w - 6, h - 6, clamp(Math.min(w, h) * 0.06, 12, 26), COL.woodL);
    /* planklinjer */
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = COL.woodD;
    ctx.lineWidth = 2;
    [L.topY, L.botY].forEach(function (yy) {
      ctx.beginPath();
      ctx.moveTo(x + 14, yy); ctx.lineTo(x + w - 14, yy);
      ctx.stroke();
    });
    ctx.restore();
    rr(x, y, w, h, clamp(Math.min(w, h) * 0.07, 14, 30), null);
    ctx.strokeStyle = COL.woodD;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function drawPit(i) {
    var p = L.pos[i], pr = L.pr;
    if (korg(i)) {
      el(p.x, p.y, L.sw * 0.44, L.storeRY, COL.woodD);
      el(p.x, p.y - 4, L.sw * 0.40, L.storeRY - 6, COL.woodIn);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 6, L.sw * 0.40, L.storeRY - 6, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
      return;
    }
    el(p.x, p.y + pr * 0.16, pr * 1.04, pr * 0.9, 'rgba(70,50,20,.30)');
    el(p.x, p.y, pr, pr * 0.94, COL.woodD);
    el(p.x, p.y - pr * 0.08, pr * 0.88, pr * 0.80, COL.woodIn);
    el(p.x, p.y - pr * 0.3, pr * 0.7, pr * 0.4, 'rgba(255,255,255,.05)');
  }

  function drawGlow(i) {
    if (G.glow !== i || G.glowT <= 0) return;
    var p = L.pos[i], pr = L.pr;
    ctx.save();
    ctx.globalAlpha = 0.14 + 0.14 * Math.sin(G.glowT * 7);
    if (korg(i)) el(p.x, p.y, L.sw * 0.6, L.storeRY * 1.2, '#f7c948');
    else circ(p.x, p.y, pr * 1.35, '#f7c948');
    ctx.restore();
  }

  function drawBerries() {
    var i, n, p, spots, k;
    for (i = 0; i < 10; i++) {
      n = G.b[i];
      if (!n) continue;
      p = L.pos[i];
      if (i === 4 || i === 9) {
        /* korgen: bär uppe, siffra på en platta nertill */
        var rx = L.sw * 0.40, ry = L.storeRY - 6;
        spots = pile(Math.min(n, 13), p.x, p.y - ry * 0.16, Math.min(rx * 0.9, ry * 0.42));
        for (k = 0; k < spots.length; k++) drawBerry(spots[k].x, spots[k].y, spots[k].r);
        var br = Math.min(rx * 0.52, 32);
        var by = p.y + ry * 0.60;
        el(p.x, by, br, br, COL.cream);
        ctx.save();
        ctx.strokeStyle = 'rgba(120,95,60,.5)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        txt(String(n), p.x, by + 1, br * 1.12, COL.ink, 'center', 900, br * 1.7);
      } else {
        spots = pile(Math.min(n, 13), p.x, p.y, L.pr * 0.74);
        for (k = 0; k < spots.length; k++) drawBerry(spots[k].x, spots[k].y, spots[k].r);
      }
    }
  }

  function drawHand() {
    if (!G.hand) return;
    var h = G.hand, p = L.pos[h.cur];
    var rx = L.pr * 1.02, ry = L.pr * 0.66;
    /* skugga + skål */
    ctx.save();
    ctx.globalAlpha = 0.18;
    el(h.x, h.y + ry * 1.7, rx * 1.1, ry * 0.4, '#3f2c14');
    ctx.restore();
    var spots = pile(Math.min(h.kvar, 13), h.x, h.y - ry * 0.15, rx * 0.72);
    el(h.x, h.y, rx, ry, COL.woodD);
    el(h.x, h.y + ry * 0.12, rx * 0.94, ry * 0.7, COL.wood);
    el(h.x, h.y - ry * 0.05, rx * 0.8, ry * 0.5, COL.woodIn);
    var k;
    for (k = 0; k < spots.length; k++) drawBerry(spots[k].x, spots[k].y, spots[k].r);
    ctx.strokeStyle = COL.woodL;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, rx, ry, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  function drawFlyers() {
    for (var i = 0; i < G.flyers.length; i++) {
      var f = G.flyers[i];
      var t = Math.min(1, f.t / f.dur);
      var x = f.x0 + (f.x1 - f.x0) * t;
      var y = f.y0 + (f.y1 - f.y0) * t - Math.sin(Math.PI * t) * f.hop;
      drawBerry(x, y, L.br * 1.15);
    }
  }

  /* ---------------- vidare-knapp ---------------- */

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

  /* ---------------- skärmar ---------------- */

  function drawKotten(opts) {
    var kh = L.kottenH;
    el(L.kottenX, L.kottenFeet + 1, kh * 0.26, kh * 0.055, 'rgba(70,50,20,.16)');
    try {
      window.KOTTEN.drawAtFeet(ctx, L.kottenX, L.kottenFeet, kh * 0.62, opts || { wave: false });
    } catch (e) { errs.push('kotten: ' + e); }
  }

  function drawIntro() {
    var s = L.s;
    txt('Så för hand', W / 2, H * 0.095, clamp(38 * s, 24, 52), COL.ink, 'center', 900, W - 40);
    txt('Så ett bär i varje skål — rösten räknar.',
      W / 2, H * 0.095 + 38 * s, clamp(17 * s, 12, 22), COL.muted, 'center', 700, W * 0.88);

    /* liten demorad: tre skålar med bär i */
    var pr = clamp(Math.min(W, H) * 0.085, 34, 62);
    var y = H * 0.42;
    var cx = W * 0.30;
    var gap = pr * 3.1;
    var demo = [1, 4, 7];
    for (var i = 0; i < 3; i++) {
      var x = cx + i * gap;
      el(x, y + pr * 0.16, pr * 1.04, pr * 0.9, 'rgba(70,50,20,.30)');
      el(x, y, pr, pr * 0.94, COL.woodD);
      el(x, y - pr * 0.08, pr * 0.88, pr * 0.80, COL.woodIn);
      var spots = pile(demo[i], x, y, pr * 0.72);
      for (var k = 0; k < spots.length; k++) drawBerry(spots[k].x, spots[k].y, spots[k].r);
      if (i < 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(74,64,51,.5)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + pr * 1.35, y);
        ctx.lineTo(x + gap - pr * 1.55, y);
        ctx.lineTo(x + gap - pr * 1.85, y - pr * 0.28);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* Kotten, viftande */
    var st = { x: L.kottenX, feet: H - 6 };
    ctx.save();
    el(st.x, st.feet + 2, L.kottenH * 0.26, L.kottenH * 0.055, 'rgba(70,50,20,.14)');
    try { window.KOTTEN.drawAtFeet(ctx, st.x, st.feet, L.kottenH * 0.62, { wave: true }); } catch (e) { errs.push('kotten: ' + e); }
    ctx.restore();

    drawVidare(L.start, 'play');
    txt('Spela', L.start.x, L.start.y + L.start.r + 15 * s, clamp(15 * s, 11, 19),
      COL.ink, 'center', 800, L.start.r * 3.4);
  }

  function drawSpel() {
    var s = L.s;
    drawBerries();
    drawFlyers();
    drawHand();
    for (var i = 0; i < 10; i++) drawGlow(i);

    if (G.fas === 'fest') {
      drawVidare(L.igen, 'igen');
      txt('Igen', L.igen.x, L.igen.y + L.igen.r + 14 * s, clamp(14 * s, 10, 18),
        COL.ink, 'center', 800, L.igen.r * 3);
    }
  }

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();
    stjarnrad();

    if (G.fas === 'intro') { drawIntro(); return; }

    /* status */
    if (G.fas === 'klar') pill('Vi räknar!', '#ffe9a8', COL.ink);
    else if (G.fas === 'fest') pill('Bra spelat!', '#d9eecb', COL.greenD);
    else if (G.turn === 'kotten') pill('Kottens tur', COL.cream, COL.muted);
    else pill('Din tur', COL.cream, COL.ink);

    drawKotten({ wave: G.turn === 'du' && !G.hand });
    drawBoard();
    for (var i = 0; i < 10; i++) drawPit(i);
    drawSpel();

    for (var g = 0; g < G.gnistor.length; g++) {
      var q = G.gnistor[g];
      ctx.globalAlpha = Math.max(0, q.liv);
      star(q.x, q.y, q.r, q.farg, null);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- spelet ---------------- */

  function startSpel() {
    G.fas = 'spel';
    G.turn = 'du';
    G.b = [3, 3, 3, 3, 0, 3, 3, 3, 3, 0];
    G.stjarnor = 0;
    G.hand = null;
    G.flyers = [];
    G.glow = -1; G.glowT = 0;
    G.timers = [];
    G.tid = 0; G.runda = 0; G.hintT = -1;
    layout();
    efter(350, function () { say('Din tur.', true); });
    efter(1300, function () {
      if (G.fas === 'spel') { say('Ta en skål med bär och så framåt.', true); G.hintT = G.runda; }
    });
  }

  function startSow(i, who) {
    var n = G.b[i];
    if (!n || G.hand) return;
    G.b[i] = 0;
    G.sowWho = who;
    var p = L.pos[i];
    G.hand = {
      from: i, cur: i, kvar: n, total: n, who: who,
      before4: G.b[4],
      x: p.x, y: p.y - L.pr * 2.0,
      tx: p.x, ty: p.y - L.pr * 1.9
    };
    lyft();
    efter(260, sowStep);
  }

  function sowStep() {
    var h = G.hand;
    if (!h) return;
    if (h.kvar <= 0) { finishSow(); return; }
    var j = nextSlot(h.cur, h.who);
    h.cur = j;
    h.tx = L.pos[j].x;
    h.ty = L.pos[j].y - L.pr * 1.9;
    G.b[j]++;
    h.kvar--;
    var har = h.total - h.kvar;
    G.flyers.push({
      x0: h.x, y0: h.y, x1: L.pos[j].x, y1: L.pos[j].y,
      t: 0, dur: 0.30, hop: L.pr * 1.1
    });
    plats();
    if (har >= 1 && har <= 12) say(talord[har], true);
    else if (har > 12) tone(520, 0.06, 0.06, 'triangle');
    efter(600, sowStep);
  }

  function finishSow() {
    var h = G.hand;
    if (!h) return;
    var last = h.cur, who = h.who, vaxt = G.b[4] - h.before4;
    efter(380, function () { G.hand = null; });

    if (G.fas !== 'spel') { return; }   /* fri lek på festen — inga dragkontroller */

    if (who === 'du') {
      if (vaxt > 0 && G.stjarnor < 5) { G.stjarnor++; pling(); }
      if (last === 4) {
        say('Sista bären hamnade i din korg! En gång till!', true);
      }
    } else if (last === 9) {
      say('Oj, jag tar den!', true);
    }

    if (radTom(true) || radTom(false)) { slut(); return; }

    if (who === 'du') {
      G.turn = 'kotten';
      G.runda++;
      efter(1100, kottensTur);
    } else {
      G.turn = 'du';
      G.runda++;
      say('Din tur.', true);
      G.hintT = G.runda;
      G.tid = 0;
    }
  }

  function lastSlot(i, who) {
    var n = G.b[i], s = i;
    while (n-- > 0) s = nextSlot(s, who);
    return s;
  }

  function kottensTur() {
    if (G.fas !== 'spel' || G.turn !== 'kotten' || G.hand) return;
    say('Nu är det min tur.', true);
    efter(1250, kottensDrag);
  }

  function kottensDrag() {
    if (G.fas !== 'spel' || G.turn !== 'kotten' || G.hand) return;
    var cand = [], i;
    for (i = 5; i <= 8; i++) if (G.b[i] > 0) cand.push(i);
    if (!cand.length) { slut(); return; }
    var vald = cand[0], best = -1;
    for (i = 0; i < cand.length; i++) {
      var k = cand[i];
      var score = (lastSlot(k, 'kotten') === 9 ? 2.5 : 0) + G.b[k] * 0.3 + Math.random() * 2.2;
      if (score > best) { best = score; vald = k; }
    }
    startSow(vald, 'kotten');
  }

  function slut() {
    if (G.fas !== 'spel') return;
    G.fas = 'klar';
    G.timers = [];
    var i;
    for (i = 0; i <= 3; i++) { G.b[4] += G.b[i]; G.b[i] = 0; }
    for (i = 5; i <= 8; i++) { G.b[9] += G.b[i]; G.b[i] = 0; }
    G.glow = 4; G.glowT = 9;
    G.hand = null;
    efter(700, function () { say('Vi räknar!', true); });
    efter(2100, function () { say2('Du fick', korgord(G.b[4])); });
    efter(4400, function () { G.glow = 9; G.glowT = 4; say2('Kotten fick', korgord(G.b[9])); });
    efter(6700, function () {
      if (G.b[4] > G.b[9]) say('Din korg har fler bär!', true);
      else if (G.b[9] > G.b[4]) say('Min korg har fler bär! En gång till?', true);
      else say('Lika många! Vilket bra spel!', true);
      fanfar();
      burst(W / 2, L.boardTop + L.bh * 0.4, 26);
    });
    efter(8600, function () { say('Bra spelat!', true); });
    efter(10200, function () {
      G.fas = 'fest';
      G.turn = 'du';
      G.glow = -1;
      say('Nu leker vi bara!', true);
    });
  }

  /* ---------------- pek ---------------- */

  function pos_(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function iCirc(p, c) { return c && Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.25; }
  function pitVid(p) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < 10; i++) {
      if (korg(i)) continue;
      var d = Math.hypot(p.x - L.pos[i].x, p.y - L.pos[i].y);
      if (d < L.pr * 1.35 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function ner(p) {
    ac();
    if (G.fas === 'intro') {
      if (iCirc(p, L.start)) { startSpel(); }
      return;
    }
    if (G.fas === 'klar') return;
    if (G.fas === 'fest') {
      if (iCirc(p, L.igen)) { startSpel(); return; }
      var f = pitVid(p);
      if (f >= 0 && G.b[f] > 0 && !G.hand) { G.tid = 0; G.hintT = G.runda; startSow(f, 'du'); }
      return;
    }
    /* spel: din tur */
    if (G.hand || G.turn !== 'du') return;
    var i = pitVid(p);
    if (i < 0) return;
    if (G.b[i] === 0) { nej(); say('Välj en skål med bär.', true); return; }
    G.tid = 0;
    startSow(i, 'du');
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { ner(pos_(e)); } catch (err) { errs.push('ner: ' + err); }
  }, { passive: false });
  cv.addEventListener('pointermove', function (e) { e.preventDefault(); }, { passive: false });
  cv.addEventListener('pointerup', function (e) { e.preventDefault(); }, { passive: false });
  cv.addEventListener('pointercancel', function () {});
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
        farg: [COL.star, '#fff', COL.green, COL.berryL][i % 4]
      });
    }
  }

  function update(dt) {
    G.tid += dt;
    if (G.glowT > 0) G.glowT = Math.max(0, G.glowT - dt);
    var i;
    for (i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) {
        var fn = G.timers[i].fn;
        G.timers.splice(i, 1);
        try { fn(); } catch (e) { errs.push('timer: ' + e); }
      }
    }
    if (G.hand) {
      var k = Math.min(1, dt * 9);
      G.hand.x += (G.hand.tx - G.hand.x) * k;
      G.hand.y += (G.hand.ty - G.hand.y) * k;
    }
    for (i = G.flyers.length - 1; i >= 0; i--) {
      G.flyers[i].t += dt;
      if (G.flyers[i].t >= G.flyers[i].dur + 0.05) G.flyers.splice(i, 1);
    }
    for (i = G.gnistor.length - 1; i >= 0; i--) {
      var q = G.gnistor[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; q.liv -= dt * 0.65;
      if (q.liv <= 0) G.gnistor.splice(i, 1);
    }
    if (G.fas === 'spel' && G.turn === 'du' && !G.hand && G.tid > 18 && G.hintT !== G.runda) {
      G.hintT = G.runda;
      say('Ta en skål med bär och så framåt.', true);
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

  window.__sf = {
    state: function () {
      return {
        fas: G.fas, turn: G.turn, b: G.b.slice(), stjarnor: G.stjarnor,
        sow: G.hand ? { from: G.hand.from, cur: G.hand.cur, kvar: G.hand.kvar, who: G.hand.who } : null,
        pos: L.pos.map(function (p, i) { return { i: i, x: Math.round(p.x), y: Math.round(p.y) }; }),
        pr: Math.round(L.pr),
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        igen: { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) },
        W: W, H: H, errs: errs.slice()
      };
    },
    start: function () { startSpel(); return window.__sf.state(); },
    tap: function (x, y) { ner({ x: x, y: y }); return window.__sf.state(); },
    tapSlot: function (i) {
      var p = L.pos[i];
      if (!p) return window.__sf.state();
      ner({ x: p.x, y: p.y });
      return window.__sf.state();
    },
    dragStep: function () { sowStep(); return window.__sf.state(); },
    spola: function (ms) {
      var kvar = ms / 1000, steg = 0;
      while (kvar > 0 && steg++ < 800) {
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
        if (G.hand) {
          G.hand.x = G.hand.tx; G.hand.y = G.hand.ty;
        }
        for (var j = G.flyers.length - 1; j >= 0; j--) {
          G.flyers[j].t += d;
          if (G.flyers[j].t >= G.flyers[j].dur + 0.05) G.flyers.splice(j, 1);
        }
      }
      return window.__sf.state();
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