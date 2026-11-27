/* Tärningsstigen — slå tärningen och gå
 *
 * Två tärningar med 1–3 prickar slås. Barnet räknar prickarna, och Kotten går
 * lika många stenar på stigen. Varje steg räknas högt ("ett", "två" …), så
 * mängden på tärningen blir till antal och till rörelse — en-till-en-
 * korrespondens med hela kroppen.
 *
 * Ingen förlust: det finns ingen timer, inga minus, och stigen kan inte gås
 * fel. Trycker barnet innan tärningen slagits säger Kotten vänligt "Slå
 * tärningen först!" och skakar på huvudet. När Kotten nått picknickfilten
 * kommer festen, där tärningarna får slås hur mycket som helst.
 *
 * Tränar: mängd → antal → rörelse (taluppfattning, räkneramsa, addition 1–3+1–3).
 * Nästa steg efter Hämta rätt antal (plocka ett bestämt antal) — här styr ett
 * slumpat antal hur långt man går.
 */
(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    sky1: '#cfe8f2', sky2: '#f3ecd8',
    cream: '#fffaf3', ink: '#4a3f39', muted: '#8a7a6d',
    grass1: '#a8cf83', grass2: '#8abf69', grassD: '#6fa653',
    sand: '#f0d9a8', sandD: '#d3b077',
    stone: '#cfc7bb', stoneD: '#a9a094', stoneL: '#eee8de',
    wood: '#d8a464', woodD: '#a86f2f',
    star: '#f7c948', starD: '#dfa616',
    coral: '#e98061', teal: '#4fae94', tealD: '#3d8b76',
    blue: '#5b8fc9', red: '#d8604c', leaf: '#6aa84f'
  };

  var N = 10;                       /* antal stenar på stigen (0 = start) */
  var W = 0, H = 0, DPR = 1;
  var L = { pts: [], stoneR: 22, kottenW: 70, dice: [], dieSize: 46, topBar: 100, m: 16, land: true };
  var nu = 0;

  var G = {
    fas: 'intro',                   /* intro | slag | ga | fest */
    pos: 0, need: 0, moved: 0,
    d1: 0, d2: 0, rolling: false, rollT: 0, rollVarv: 0,
    hop: null, stars: 0, klarT: 0, vantT: 0, skak: 0, skakT: 0,
    gnistor: [], flyg: [], tid: 0, sagt: 0, auto: true,
    autoNasta: null
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
  /* tärningsskrammel = några korta, gälla träklappar */
  function skrammel() {
    for (var i = 0; i < 7; i++) {
      (function (k) {
        setTimeout(function () { tone(420 + Math.random() * 520, 0.045, 0.055, 'square'); }, k * 78);
      })(i);
    }
    setTimeout(function () { tone(180, 0.12, 0.10, 'triangle', 130); }, 590);
  }
  function fotsteg() { tone(300, 0.09, 0.10, 'triangle', 210); }
  function pling() {
    tone(660, 0.11, 0.09, 'triangle');
    setTimeout(function () { tone(990, 0.16, 0.08, 'triangle'); }, 105);
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

  /* ---------------- texter som finns som röst ---------------- */
  var SLAG = {
    2: 'Två! Gå två steg.', 3: 'Tre! Gå tre steg.', 4: 'Fyra! Gå fyra steg.',
    5: 'Fem! Gå fem steg.', 6: 'Sex! Gå sex steg.'
  };
  var ORD = { 1: 'ett', 2: 'två', 3: 'tre', 4: 'fyra', 5: 'fem', 6: 'sex' };

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
    var m = clamp(Math.min(W, H) * 0.030, 10, 26);
    var topBar = Math.max(92, H * 0.165);
    var playTop = topBar + clamp(H * 0.012, 6, 16);
    var playBot = H - clamp(H * 0.055, 12, 40);
    var playH = Math.max(120, playBot - playTop);
    var pts = [], i;

    if (land) {
      var x0 = m + W * 0.065, x1 = W - m - W * 0.065;
      var mid = playTop + playH * 0.54;
      for (i = 0; i <= N; i++) {
        var t = i / N;
        pts.push({ x: x0 + (x1 - x0) * t, y: mid + Math.sin(i * 0.82 + 0.35) * playH * 0.15 });
      }
    } else {
      var rowY = [playTop + playH * 0.27, playTop + playH * 0.72];
      var padX = m + W * 0.085;
      for (i = 0; i <= N; i++) {
        if (i < 6) {
          var t0 = i / 5;
          pts.push({ x: padX + (W - 2 * padX) * t0, y: rowY[0] + Math.sin(i * 1.1) * playH * 0.035 });
        } else {
          var t1 = (10 - i) / 4;
          pts.push({ x: padX + (W - 2 * padX) * t1, y: rowY[1] + Math.sin(i * 1.1) * playH * 0.035 });
        }
      }
    }

    var sp = 9999;
    for (i = 1; i <= N; i++) sp = Math.min(sp, Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    var stoneR = clamp(sp * 0.27, 13, 32);

    L.land = land; L.m = m; L.topBar = topBar; L.pts = pts;
    L.stoneR = stoneR;
    L.kottenW = clamp(stoneR * 2.5, 40, 96);
    L.playTop = playTop; L.playBot = playBot;

    var die = clamp(Math.min(W, H) * 0.085, 30, 58);
    L.dieSize = die;
    L.dice = [
      { x: W / 2 - die * 0.62, y: topBar * 0.40, s: die },
      { x: W / 2 + die * 0.62, y: topBar * 0.40, s: die }
    ];
    L.diceHit = { x: W / 2 - die * 1.18, y: topBar * 0.40 - die * 0.78, w: die * 2.36, h: die * 1.56 };

    var br = clamp(Math.min(W, H) * 0.085, 30, 60);
    L.start = { x: W / 2, y: H * 0.84, r: br };
    L.igen = { x: W / 2, y: H - clamp(H * 0.115, 46, 92), r: br * 0.86 };

    /* blommor och gräs, samma frön varje gång */
    L.blommor = [];
    for (i = 0; i < 26; i++) {
      var fx = ((i * 0.618 + 0.11) % 1) * W;
      var fy = playTop + ((i * 0.37 + 0.05) % 1) * playH;
      L.blommor.push({ x: fx, y: fy, s: 0.6 + ((i * 7) % 5) * 0.12, c: [COL.coral, '#f4f0e2', COL.blue, COL.star][i % 4] });
    }
  }

  /* ---------------- ritning ---------------- */
  function rr(x, y, w, h, r, fill) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, w + x, y, r);
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

  function drawBg(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, COL.sky1); g.addColorStop(1, COL.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* sol */
    ctx.save(); ctx.globalAlpha = 0.85;
    circ(W * 0.86, H * 0.055 + 12, clamp(Math.min(W, H) * 0.045, 14, 30), '#ffe9a8');
    ctx.restore();

    /* kullar */
    var hy = H * 0.30;
    ctx.fillStyle = '#bcd8a0';
    ctx.beginPath(); ctx.moveTo(0, hy);
    for (var x = 0; x <= W; x += W / 8) ctx.lineTo(x, hy - 18 * Math.sin(x / W * 7 + 1));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    var g2 = ctx.createLinearGradient(0, H * 0.34, 0, H);
    g2.addColorStop(0, COL.grass1); g2.addColorStop(1, COL.grass2);
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(0, H * 0.36);
    for (var x2 = 0; x2 <= W; x2 += W / 10) ctx.lineTo(x2, H * 0.36 - 14 * Math.sin(x2 / W * 5));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    /* träd i bakkanten */
    var tw = clamp(Math.min(W, H) * 0.055, 16, 40);
    for (var i = 0; i < 7; i++) {
      var tx = (i / 6) * W + (i % 2 ? 12 : -10);
      var ty = H * 0.355 - Math.sin(tx / W * 5) * 14;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#6f8f5c67';
      triTree(tx, ty, tw * (ockFras(i) * 3 + 1));
      ctx.globalAlpha = 1;
    }

    /* blommor och grästuvor */
    for (var j = 0; j < L.blommor.length; j++) {
      var b = L.blommor[j];
      var s = b.s * L.stoneR * 0.55;
      ctx.save(); ctx.globalAlpha = 0.55;
      ell(b.x, b.y, s * 1.5, s * 0.55, '#7db45e');
      for (var p = 0; p < 4; p++) {
        var a = p * Math.PI / 2 + 0.4;
        circ(b.x + Math.cos(a) * s * 0.75, b.y + Math.sin(a) * s * 0.75, s * 0.55, b.c);
      }
      circ(b.x, b.y, s * 0.5, COL.star);
      ctx.restore();
    }
  }
  function ockFras(i) { return ((i * 5) % 3) / 4; }
  function triTree(x, y, s) {
    ctx.fillStyle = '#5d7f4c';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 2.1);
    ctx.lineTo(x + s * 0.78, y - s * 0.35);
    ctx.lineTo(x - s * 0.78, y - s * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7d5a3a';
    ctx.fillRect(x - s * 0.12, y - s * 0.4, s * 0.24, s * 0.5);
  }

  function drawPath() {
    var pts = L.pts, r = L.stoneR;
    /* sandband under stenarna */
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = COL.sand;
    ctx.lineWidth = r * 1.9;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.strokeStyle = COL.sandD;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = r * 2.3;
    ctx.stroke();
    ctx.restore();
  }

  function drawStenar(t) {
    var r = L.stoneR;
    for (var i = 0; i <= N; i++) {
      var p = L.pts[i];
      if (i === 0) {
        /* startplatta */
        ell(p.x, p.y + r * 0.5, r * 1.25, r * 0.45, 'rgba(90,120,70,0.22)');
        circ(p.x, p.y, r * 0.95, COL.sand);
        circ(p.x, p.y, r * 0.78, '#f7e7c4');
        /* liten vimpel */
        var fx = p.x + r * 0.2, fy = p.y - r * 0.2;
        ctx.strokeStyle = COL.woodD; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - r * 1.1); ctx.stroke();
        ctx.fillStyle = COL.coral;
        ctx.beginPath(); ctx.moveTo(fx, fy - r * 1.1); ctx.lineTo(fx + r * 0.8, fy - r * 0.86);
        ctx.lineTo(fx, fy - r * 0.62); ctx.closePath(); ctx.fill();
        continue;
      }
      if (i === N) { drawPicknick(p); continue; }

      var next = (G.fas === 'ga' && G.moved < G.need && i === G.pos + 1);
      var här = (i === G.pos);

      /* skugga */
      ell(p.x, p.y + r * 0.62, r * 1.02, r * 0.34, 'rgba(70,60,45,0.20)');
      circ(p.x, p.y, r, COL.stoneD);
      circ(p.x, p.y, r * 0.92, COL.stone);
      circ(p.x - r * 0.22, p.y - r * 0.24, r * 0.55, COL.stoneL);

      if (next) {
        var pu = 1 + 0.09 * Math.sin(t * 5.2);
        ctx.save(); ctx.globalAlpha = 0.55;
        circ(p.x, p.y, r * 1.28 * pu, 'rgba(255,232,150,0.9)');
        ctx.restore();
      }
      if (här) {
        ctx.save();
        ctx.strokeStyle = COL.teal; ctx.lineWidth = Math.max(2.4, r * 0.14);
        circ(p.x, p.y, r * 1.12, null); ctx.stroke();
        ctx.restore();
      }
      textFit(String(i), p.x, p.y + r * 0.03, r * 1.7, r * 1.05, next ? COL.ink : 'rgba(74,63,57,0.62)', 800);
    }
  }

  function drawPicknick(p) {
    var r = L.stoneR;
    ell(p.x, p.y + r * 0.5, r * 1.7, r * 0.55, 'rgba(70,60,45,0.18)');
    /* rutig filt */
    ctx.save();
    ell(p.x, p.y + r * 0.25, r * 1.6, r * 0.85, '#f6e6cf');
    ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.25, r * 1.6, r * 0.85, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = '#e8b7a5'; ctx.lineWidth = Math.max(2, r * 0.16);
    for (var i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(p.x - r * 1.7, p.y + r * 0.25 + i * r * 0.42);
      ctx.lineTo(p.x + r * 1.7, p.y + r * 0.25 + i * r * 0.42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x + i * r * 0.48, p.y - r * 0.7);
      ctx.lineTo(p.x + i * r * 0.48, p.y + r * 1.2); ctx.stroke();
    }
    ctx.restore();
    /* tårta på tallrik */
    var cx = p.x, cy = p.y - r * 0.1;
    circ(cx, cy + r * 0.28, r * 0.62, '#ffffff');
    rr(cx - r * 0.42, cy - r * 0.30, r * 0.84, r * 0.56, r * 0.14, '#f3c9a0');
    rr(cx - r * 0.42, cy - r * 0.34, r * 0.84, r * 0.18, r * 0.09, '#fbe0c4');
    circ(cx, cy - r * 0.50, r * 0.12, COL.red);
    /* flagga: MÅL */
    var fx = p.x + r * 1.25, fy = p.y - r * 0.55;
    ctx.strokeStyle = COL.woodD; ctx.lineWidth = Math.max(2, r * 0.11); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx, fy + r * 0.6); ctx.lineTo(fx, fy - r * 0.9); ctx.stroke();
    ctx.fillStyle = COL.teal;
    ctx.beginPath(); ctx.moveTo(fx, fy - r * 0.9); ctx.lineTo(fx + r * 0.85, fy - r * 0.66);
    ctx.lineTo(fx, fy - r * 0.42); ctx.closePath(); ctx.fill();
  }

  /* ---------------- tärningar ---------------- */
  var PIPS = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]
  };

  function drawDie(x, y, s, val, vinkel, frusen) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(vinkel || 0);
    var h = s / 2;
    /* skugga + kropp */
    rr(-h + 3, -h + 4, s, s, s * 0.20, 'rgba(70,60,45,0.22)');
    var g = ctx.createLinearGradient(-h, -h, h, h);
    g.addColorStop(0, '#fffdf8'); g.addColorStop(1, '#f0e3cd');
    rr(-h, -h, s, s, s * 0.20, g);
    ctx.strokeStyle = 'rgba(168,111,47,0.45)'; ctx.lineWidth = Math.max(1.5, s * 0.035);
    rr(-h, -h, s, s, s * 0.20, null); ctx.stroke();

    if (val) {
      var pips = PIPS[val] || PIPS[1];
      var step = s * 0.245, rp = s * 0.082;
      for (var i = 0; i < pips.length; i++) {
        var px = (pips[i][0] - 1) * step, py = (pips[i][1] - 1) * step;
        circ(px, py + s * 0.012, rp, 'rgba(74,63,57,0.16)');
        circ(px, py, rp, frusen ? '#7d9c8c' : COL.ink);
        circ(px - rp * 0.28, py - rp * 0.28, rp * 0.30, 'rgba(255,255,255,0.7)');
      }
    } else {
      /* tom tärning: en liten fråga i form av tre ljusa prickar */
      ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(nu * 3);
      for (var k = -1; k <= 1; k++) circ(k * s * 0.20, 0, s * 0.045, COL.ink);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHud(t) {
    /* tärningarna: vickar lite när de väntar på ett tryck */
    var vick = 0, skakX = 0, skakY = 0;
    if (G.fas === 'slag' && !G.rolling) {
      vick = Math.sin(t * 3.4) * 0.075;
    }
    if (G.rolling) {
      vick = Math.sin(t * 20) * 0.16;
      skakX = (Math.random() - 0.5) * 5;
      skakY = (Math.random() - 0.5) * 5;
    }
    var vals = G.rolling ? [((Math.floor(t * 12) % 3) + 1), ((Math.floor(t * 9) % 3) + 1)]
                         : [G.d1, G.d2];
    if (G.fas === 'slag' && !G.rolling) { vals = [0, 0]; }

    /* glöd bakom tärningarna när det är dags att slå */
    if (G.fas === 'slag' && !G.rolling) {
      var pu = 1 + 0.06 * Math.sin(t * 4.6);
      ctx.save(); ctx.globalAlpha = 0.35;
      ell(W / 2, L.dice[0].y + 2, L.dieSize * 1.55 * pu, L.dieSize * 0.95 * pu, 'rgba(255,232,150,0.9)');
      ctx.restore();
    }

    drawDie(L.dice[0].x + skakX, L.dice[0].y + skakY, L.dieSize, vals[0], vick);
    drawDie(L.dice[1].x + skakX, L.dice[1].y + skakY, L.dieSize, vals[1], -vick);

    /* stegprickar: så många steg tärningen visar, fyllda allteftersom */
    if (G.fas === 'ga' || G.klarT > 0) {
      var n = G.need, gap = clamp(L.dieSize * 0.30, 12, 22);
      var rr2 = clamp(L.dieSize * 0.105, 4, 7);
      var y = L.dice[0].y + L.dieSize * 0.86;
      var x0 = W / 2 - (n - 1) * gap / 2;
      for (var i = 0; i < n; i++) {
        circ(x0 + i * gap, y, rr2 + 1.5, 'rgba(74,63,57,0.28)');
        circ(x0 + i * gap, y, rr2, i < G.moved ? COL.teal : 'rgba(255,250,243,0.9)');
      }
      /* siffra till höger om prickarna */
      textFit(String(n), W / 2 + (n - 1) * gap / 2 + gap * 0.95, y, gap * 1.5, rr2 * 3.1, COL.ink, 800);
    }

    /* stjärnor till höger, fylls från vänster */
    var sr = clamp(L.dieSize * 0.20, 6, 12), ns = 3;
    for (var s = 0; s < ns; s++) {
      var sx = W - L.m - sr - (ns - 1 - s) * sr * 2.5, sy = L.topBar * 0.32;
      stjarna(sx, sy, sr, s < G.stars ? COL.star : 'rgba(74,63,57,0.16)', s < G.stars);
    }
  }

  function stjarna(x, y, r, col, fylld) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    if (fylld) { ctx.fillStyle = col; ctx.fill(); }
    ctx.strokeStyle = fylld ? COL.starD : col; ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.stroke();
    ctx.restore();
  }

  /* ---------------- Kotten ---------------- */
  function kottenPunkt() {
    if (G.hop) {
      var a = L.pts[G.hop.from], b = L.pts[G.hop.to];
      var pr = clamp(G.hop.t / 0.30, 0, 1);
      var e = pr * pr * (3 - 2 * pr);
      return {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * L.stoneR * 1.5,
        lyft: Math.sin(e * Math.PI)
      };
    }
    var p = L.pts[G.pos];
    return { x: p.x, y: p.y, lyft: 0 };
  }

  function drawKotten(t, x, y, w, opt) {
    ctx.save(); ctx.globalAlpha = 0.16;
    ell(x, L.pts[G.pos].y + L.stoneR * 0.35, w * 0.26, w * 0.06, '#3f3a34');
    ctx.restore();
    K(x, y, w, opt || {});
  }

  /* ---------------- scener ---------------- */
  function drawIntro(t) {
    var titelY = H * 0.155;
    textFit('Tärningsstigen', W / 2, titelY, W * 0.86, clamp(Math.min(W, H) * 0.105, 26, 66), COL.ink, 800);
    textFit('slå tärningen och gå', W / 2, titelY + clamp(H * 0.062, 18, 42),
            W * 0.84, clamp(Math.min(W, H) * 0.036, 11, 22), COL.muted, 700);

    /* demonstration: två tärningar ovanför stigen */
        var d = L.dieSize * 1.05;
        var dy = H * (L.land ? 0.245 : 0.315);
        drawDie(W / 2 - d * 0.62, dy, d, 2, -0.06);
        drawDie(W / 2 + d * 0.62, dy, d, 3, 0.07);

    var kw = clamp(Math.min(W, H) * 0.16, 54, 110);
    var kx = clamp(W * 0.16, kw * 0.7, W * 0.3), ky = H * 0.95;
    ctx.save(); ctx.globalAlpha = 0.15;
    ell(kx, ky - 2, kw * 0.26, kw * 0.05, '#3f3a34');
    ctx.restore();
    K(kx, ky, kw, { wave: 0.5 + 0.5 * Math.sin(t * 5) });

    var br = clamp(Math.min(W, H) * 0.082, 30, 56);
    var bx = W * 0.64, by = H * 0.835;
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

  function drawSpel(t) {
    drawHud(t);
    var kp = kottenPunkt();
    var kr = Math.abs(Math.sin(t * 2.1)) * L.stoneR * 0.12;
    drawKotten(t, kp.x, kp.y - L.stoneR * 0.25 + (kp.lyft ? -kr * 1.5 : kr), L.kottenW,
               { wave: G.fas === 'slag' ? 0.45 + 0.45 * Math.sin(t * 4) : 0.10 });
  }

  function drawFest(t) {
    drawHud(t);
    var titelY = L.topBar * 0.94;
    textFit('Framme vid filten!', W / 2, titelY, W * 0.86,
            clamp(Math.min(W, H) * 0.055, 15, 34), COL.ink, 800);

    var kp = L.pts[N];
    var kw = L.kottenW * 1.05;
    var kx2 = kp.x + (kp.x < W / 2 ? L.stoneR * 1.5 : -L.stoneR * 1.5);
    kx2 = clamp(kx2, kw * 0.58, W - kw * 0.58);
    K(kx2, kp.y + L.stoneR * 0.5, kw,
      { wave: 0.5 + 0.5 * Math.sin(t * 5) });

    var br = clamp(Math.min(W, H) * 0.070, 27, 54);
    var bx = W / 2, by = H - clamp(H * 0.115, 46, 96);
    drawVidare(bx, by, br, 'again', t);
    L.igen = { x: bx, y: by, r: br };
    var ty = by + br + clamp(H * 0.044, 14, 32);
    ctx.save();
    ctx.font = '700 ' + clamp(Math.min(W, H) * 0.028, 10, 16) + 'px "Trebuchet MS", sans-serif';
    var tw = ctx.measureText('spela igen').width + 22;
    rr(bx - tw / 2, ty - 12, tw, 24, 12, 'rgba(255,250,243,0.88)');
    ctx.restore();
    textFit('spela igen', bx, ty, W * 0.4, clamp(Math.min(W, H) * 0.026, 10, 15), COL.ink, 700);
  }

  function drawVidare(x, y, r, typ, t) {
    var puls = 1 + 0.035 * Math.sin(t * 6.2);
    ctx.save();
    ctx.translate(x, y); ctx.scale(puls, puls);
    ctx.save(); ctx.globalAlpha = 0.18; circ(0, 3, r, '#3f3a34'); ctx.restore();
    circ(0, 0, r, COL.teal);
    circ(0, 0, r * 0.88, COL.tealD);
    circ(0, 0, r * 0.80, '#4fae94');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (typ === 'play' || typ === 'again') {
      ctx.moveTo(-r * 0.20, -r * 0.34);
      ctx.lineTo(r * 0.36, 0);
      ctx.lineTo(-r * 0.20, r * 0.34);
    } else {
      ctx.moveTo(-r * 0.30, -r * 0.30);
      ctx.lineTo(r * 0.30, 0);
      ctx.lineTo(-r * 0.30, r * 0.30);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
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
      stjarna(x, y, clamp(L.topBar * 0.15, 7, 14), COL.star, true);
    }
  }

  function draw(t) {
    try {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawBg(t);
      drawPath();
      drawStenar(t);
      if (G.fas === 'intro') drawIntro(t);
      else if (G.fas === 'spel' || G.fas === 'slag' || G.fas === 'ga') drawSpel(t);
      else drawFest(t);
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
  }

  /* ---------------- spellogik ---------------- */
  function startSpel(igen) {
    G.fas = 'slag'; G.pos = 0; G.need = 0; G.moved = 0; G.d1 = 0; G.d2 = 0;
    G.rolling = false; G.rollT = 0; G.hop = null; G.klarT = 0; G.stars = 0;
    G.gnistor = []; G.flyg = []; G.tid = 0; G.sagt = 0; G.autoNasta = null;
    say(igen ? 'Nu går vi igen!' : 'Slå tärningen!', true);
  }

  function slaa() {
    if (G.rolling) return;
    if (G.fas !== 'slag' && G.fas !== 'fest') return;
    G.rolling = true; G.rollT = 0;
    G.d1 = 0; G.d2 = 0;
    skrammel();
  }

  function klartSlag() {
    G.rolling = false;
    if (G.fas === 'fest') {
      G.d1 = 1 + Math.floor(Math.random() * 3);
      G.d2 = 1 + Math.floor(Math.random() * 3);
      var sum = G.d1 + G.d2;
      if (ORD[sum]) say(ORD[sum], true);
      return;
    }
    G.d1 = 1 + Math.floor(Math.random() * 3);
    G.d2 = 1 + Math.floor(Math.random() * 3);
    var s = G.d1 + G.d2;
    var kvar = N - G.pos;
    G.need = Math.min(s, Math.max(1, kvar));
    G.moved = 0;
    G.fas = 'ga';
    G.tid = 0;
    say(SLAG[s] || ('Sex! Gå sex steg.'), true);
  }

  function steg() {
    if (G.fas === 'slag') {
      if (G.tid > 0.6) {
        say('Slå tärningen först!', true);
        G.skak = 1; G.tid = 0;
      }
      return;
    }
    if (G.fas !== 'ga' || G.need <= 0 || G.moved >= G.need) return;

    var fran = G.pos;
    G.pos = Math.min(N, G.pos + 1);
    G.moved++;
    G.hop = { from: fran, to: G.pos, t: 0 };
    fotsteg();
    if (ORD[G.moved]) say(ORD[G.moved]);

    if (G.moved >= G.need || G.pos >= N) rundaKlar();
  }

  function rundaKlar() {
    if (G.klarT > 0) return;
    G.stars = Math.min(3, G.stars + 1);
    G.klarT = 1.5;
    var kp = L.pts[G.pos];
    pling();
    for (var i = 0; i < 12; i++) {
      G.gnistor.push({
        x: kp.x + (Math.random() - 0.5) * L.stoneR, y: kp.y,
        vx: (Math.random() - 0.5) * 190, vy: -Math.random() * 210,
        liv: 1.1, col: ['#f7c948', '#ffffff'][i % 2]
      });
    }
    var st = L.pts[G.pos];
    G.flyg.push({ x0: st.x, y0: st.y - L.stoneR, x1: W - L.m - L.dieSize * 0.2, y1: L.topBar * 0.32,
                  t: 0, dur: 0.7 });
    say(G.pos >= N ? 'Alla steg! Bra jobbat!' : 'Rätt! Bra räknat!', true);
  }

  function nastaRunda() {
    G.hop = null;
    if (G.pos >= N) { tillFest(); return; }
    G.fas = 'slag'; G.need = 0; G.moved = 0; G.d1 = 0; G.d2 = 0;
    G.tid = 0; G.sagt = 0;
    say('Slå tärningen!');
  }

  function tillFest() {
    G.fas = 'fest'; G.hop = null; G.klarT = 0;
    fanfar();
    say('Alla steg! Bra jobbat!', true);
    setTimeout(function () {
      if (G.fas === 'fest') say('Här kan du slå hur mycket du vill.');
    }, 2600);
  }

  function update(dt) {
    G.tid += dt;
    if (G.skak > 0) G.skak = Math.max(0, G.skak - dt * 2.2);
    if (G.hop) {
      G.hop.t += dt;
      if (G.hop.t > 0.32) G.hop = null;
    }
    if (G.rolling) {
      G.rollT += dt;
      if (G.rollT > 0.70) klartSlag();
    }
    if (G.klarT > 0) {
      G.klarT -= dt;
      if (G.klarT <= 0) { G.klarT = 0; nastaRunda(); }
    }
    for (var j = G.flyg.length - 1; j >= 0; j--) {
      G.flyg[j].t += dt;
      if (G.flyg[j].t > G.flyg[j].dur + 0.1) G.flyg.splice(j, 1);
    }
    /* påminnelse om barnet inte slår */
    if (G.fas === 'slag' && !G.rolling && G.tid > 9 && G.sagt < 1) {
      G.sagt = 1;
      say('Slå tärningen!');
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
      drawGnistor(dt);
      drawFlyg();
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- pek ---------------- */
  function pos_(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function iDice(p) {
    var d = L.diceHit;
    return p.x > d.x && p.x < d.x + d.w && p.y > d.y && p.y < d.y + d.h;
  }
  function iKnapp(p, k) {
    if (!k) return false;
    var dx = p.x - k.x, dy = p.y - k.y;
    return dx * dx + dy * dy < k.r * k.r * 2.1;
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    var p = pos_(e);

    if (G.fas === 'intro') {
      if (!L.start || iKnapp(p, L.start) || p.y > L.start.y - L.start.r * 1.3) startSpel(false);
      return;
    }
    if (G.fas === 'fest') {
      if (iKnapp(p, L.igen)) { startSpel(true); return; }
      if (iDice(p)) { slaa(); return; }
      /* fri lek: tryck på en sten och Kotten hoppar dit */
      for (var i = 1; i <= N; i++) {
        var q = L.pts[i];
        if (Math.hypot(p.x - q.x, p.y - q.y) < Math.max(L.stoneR * 1.5, 30)) {
          if (i !== G.pos) { G.hop = { from: G.pos, to: i, t: 0 }; G.pos = i; steg(); }
          return;
        }
      }
      return;
    }
    if (iDice(p) && (G.fas === 'slag' || G.rolling)) { slaa(); return; }
    if (p.y < L.topBar) return;
    steg();
  }, { passive: false });

  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  /* ---------------- testkrok ---------------- */
  window.__ts = {
    state: function () {
      return {
        fas: G.fas, pos: G.pos, need: G.need, moved: G.moved, d1: G.d1, d2: G.d2,
        rolling: G.rolling, stars: G.stars, hop: !!G.hop, klarT: Math.round(G.klarT * 10) / 10,
        W: W, H: H, land: L.land, stoneR: Math.round(L.stoneR),
        pts: L.pts.map(function (p) { return { x: Math.round(p.x), y: Math.round(p.y) }; }),
        dice: L.dice.map(function (d) { return { x: Math.round(d.x), y: Math.round(d.y), s: Math.round(d.s) }; }),
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        igen: L.igen ? { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) } : null,
        errs: errs.length
      };
    },
    start: function () { startSpel(false); return this.state(); },
    slaa: function () { slaa(); return this.state(); },
    klart: function () { G.rollT = 1; klartSlag(); return this.state(); },
    slag: function (a, b) {
      /* tvinga fram ett kast, för genomspelning */
      G.rolling = false; G.fas = 'ga';
      G.d1 = a; G.d2 = b;
      var s = a + b;
      G.need = Math.min(s, Math.max(1, N - G.pos)); G.moved = 0; G.tid = 0;
      say(SLAG[s] || 'Sex! Gå sex steg.', true);
      return this.state();
    },
    steg: function (n) { n = n == null ? 1 : n; for (var i = 0; i < n; i++) steg(); return this.state(); },
    fest: function () { G.pos = N; tillFest(); return this.state(); },
    auto: function (v) { G.auto = v !== false; return G.auto; },
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