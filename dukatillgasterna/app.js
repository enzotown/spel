/* Duka till gästerna — ett-till-ett för barn 4–7 år.
 *
 * Tre gäster sitter bakom bordet. På bänken står tre högar: tallrikar, glas
 * och gafflar — exakt en till varje gäst. Barnet drar (eller trycker) en sak
 * i taget till en gästs plats, och saken snäpper fast i sin ruta. När varje
 * gäst har allt sitt kommer maten in, gästerna säger tack och en stjärna flyger
 * upp. Sedan ett bord till: fyra gäster, och till sist servetter också.
 *
 * Tränar: ett-till-ett-principen för en hel uppsättning per person — inte bara
 * "en sak till en korg" utan tallrik OCH glas OCH gaffel till var och en, och
 * att högarna räcker precis till alla (Tirosh m.fl., ZDM 2020, om dukning som
 * lekplats för 1–1-korrespondens; barns svårighet sitter i placeringen och i
 * vad som blir över).
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#f7f2e2', wall2: '#e9dfc4',
    floor: '#c9a273', floorD: '#a8834f',
    cream: '#fffaf3', ink: '#4a4033', muted: '#8a7d63',
    wood: '#c08a52', woodD: '#8a5c2e', woodL: '#d9ad78', woodIn: '#6d451f',
    green: '#6aa84f', greenD: '#41702f',
    star: '#f7c948', starD: '#dfa616',
    plate: '#fffdf7', plateD: '#d8cdb6', plateIn: '#efe7d4',
    glass: '#cfe6ee', water: '#8fc9e0',
    steel: '#b9c2c8', steelD: '#8e989f',
    napkin: '#7bcbb6', napkinD: '#4fae94',
    red: '#d9584f', pink: '#e8a9a0'
  };

  var ARTIKEL = {
    tallrik: { obest: 'en tallrik', best: 'tallriken' },
    glas: { obest: 'ett glas', best: 'glaset' },
    gaffel: { obest: 'en gaffel', best: 'gaffeln' },
    servett: { obest: 'en servett', best: 'servetten' }
  };

  var GASTFARG = {
    hare: { kropp: '#d9d2c4', mage: '#f2eee4', inner: '#e8a9a0', nos: '#c98f86' },
    bjorn: { kropp: '#a9784f', mage: '#d9b98a', inner: '#c79b6a', nos: '#5b3a22' },
    fagel: { kropp: '#7fb2d9', mage: '#dceef8', inner: '#e8a13a', nos: '#e8a13a' },
    rav: { kropp: '#e08a4e', mage: '#f7ddc4', inner: '#f6d6b8', nos: '#5b3a22' }
  };

  var RUNDOR = [
    { gaster: ['hare', 'bjorn', 'fagel'], saker: ['tallrik', 'glas', 'gaffel'] },
    { gaster: ['rav', 'hare', 'bjorn', 'fagel'], saker: ['tallrik', 'glas', 'gaffel'] },
    { gaster: ['bjorn', 'fagel', 'rav', 'hare'], saker: ['tallrik', 'glas', 'gaffel', 'servett'] }
  ];

  /* ---------------- tillstånd ---------------- */

  var W = 0, H = 0, DPR = 1, nu = 0;
  var L = {};
  var G = {
    fas: 'intro', runda: 0, gaster: [], kvar: {}, hand: null,
    stjarnor: 0, timers: [], gnistor: [], losa: [], tid: 0, hintT: 0,
    pek: { x: 0, y: 0 }, ner: null, mat: 0, sagtPlacera: 0
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
    g.gain.linearRampToValueAtTime(vol == null ? 0.10 : vol, a.currentTime + 0.012);
    g.gain.linearRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }
  function lyft() { tone(470, 0.08, 0.06, 'sine', 700); }
  function plats() { tone(430, 0.09, 0.07, 'triangle', 300); }
  function klirr() { tone(880, 0.07, 0.05, 'triangle'); setTimeout(function () { tone(1240, 0.09, 0.035, 'sine'); }, 70); }
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

    var s = clamp(Math.min(W, H) / 768, 0.60, 1.35);
    var m = clamp(Math.min(W, H) * 0.028, 8, 24);
    L.s = s; L.m = m;
    L.topBar = Math.max(62, H * 0.105);
    L.benchH = clamp((H - L.topBar) * 0.235, 92, 210);
    L.benchTop = H - L.benchH - 12;
    L.tableTop = L.topBar + (L.benchTop - L.topBar) * 0.30;
    L.tableBot = L.benchTop - 6;
    L.guestR = clamp((L.tableTop - L.topBar) * 0.30, 22, 62);

    var n = G.gaster.length || 3;
    var innerW = W - 2 * m;
    L.gap = innerW / n;
    L.matW = Math.min(L.gap * 0.84, 320);
    L.matH = Math.min((L.tableBot - L.tableTop) * 0.74, 200);
    L.matY = L.tableTop + (L.tableBot - L.tableTop) * 0.50 - L.matH * 0.42;
    L.plateR = Math.min(L.matW * 0.205, L.matH * 0.30);

    L.mats = [];
    L.slots = [];
    for (var i = 0; i < n; i++) {
      var cx = m + (i + 0.5) * L.gap;
      var mat = { cx: cx, x: cx - L.matW / 2, y: L.matY, w: L.matW, h: L.matH };
      L.mats.push(mat);
      var pr = L.plateR;
      L.slots.push({
        tallrik: { x: cx, y: L.matY + L.matH * 0.52, r: pr },
        glas: { x: cx + L.matW * 0.29, y: L.matY + L.matH * 0.22, r: pr * 0.55 },
        gaffel: { x: cx - L.matW * 0.33, y: L.matY + L.matH * 0.50, r: pr * 0.85 },
        servett: { x: cx + L.matW * 0.29, y: L.matY + L.matH * 0.80, r: pr * 0.55 }
      });
    }
    L.guestHeadY = L.tableTop - L.guestR * 1.55;

    /* bänken: en hög per sak, bara det som behövs den här rundan */
    var saker = G.saker || RUNDOR[0].saker;
    L.pileU = clamp(Math.min(L.benchH * 0.30, innerW / (saker.length * 3.1)), 16, 44);
    L.piles = [];
    var step = Math.min(innerW / saker.length, L.pileU * 3.6);
    var x0 = W / 2 - (saker.length - 1) * step / 2;
    L.pileY = L.benchTop + L.benchH * 0.50;
    for (var k = 0; k < saker.length; k++) {
      L.piles.push({ kind: saker[k], x: x0 + k * step, y: L.pileY, r: L.pileU });
    }

    var btn = clamp(Math.min(W, H) * 0.075, 30, 50);
    L.start = { x: W < H ? W * 0.62 : W / 2, y: H - m - btn * 2.1 - 22 * s, r: btn };
    L.nasta = { x: W / 2, y: L.benchTop + L.benchH * 0.48, r: btn * 1.15 };
    L.igen = { x: W / 2, y: L.benchTop + L.benchH * 0.48, r: btn * 1.15 };
    L.kottenH = clamp(H * 0.16, 54, 130);
  }

  /* ---------------- ritthjälpare ---------------- */

  function rr(x, y, w, h, r, fill) {
    var rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function el(x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function circ(x, y, r, fill) { el(x, y, r, r, fill); }
  function star(x, y, r, fill, edge) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr2 = i % 2 ? r * 0.46 : r;
      var px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.stroke(); }
  }
  function txt(s, x, y, size, col, align, weight, maxW) {
    var fs = size;
    var fam = ' "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    ctx.font = (weight || 700) + ' ' + fs + 'px' + fam;
    if (maxW) {
      while (ctx.measureText(s).width > maxW && fs > 8) {
        fs -= 1;
        ctx.font = (weight || 700) + ' ' + fs + 'px' + fam;
      }
    }
    ctx.fillStyle = col; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  /* ---------------- saker: tallrik, glas, gaffel, servett ---------------- */

  function drawSak(kind, x, y, u, alfa) {
    ctx.save();
    if (alfa != null) ctx.globalAlpha = alfa;
    if (kind === 'tallrik') {
      el(x, y + u * 0.10, u, u * 0.92, 'rgba(70,50,20,.14)');
      el(x, y, u, u * 0.94, COL.plateD);
      el(x, y - u * 0.03, u * 0.94, u * 0.88, COL.plate);
      el(x, y - u * 0.03, u * 0.62, u * 0.56, COL.plateIn);
    } else if (kind === 'glas') {
      var w = u * 0.94, h = u * 1.42;
      el(x, y + h * 0.52, w * 0.42, h * 0.07, 'rgba(70,50,20,.14)');
      ctx.beginPath();
      ctx.moveTo(x - w * 0.46, y - h * 0.5);
      ctx.lineTo(x + w * 0.46, y - h * 0.5);
      ctx.lineTo(x + w * 0.34, y + h * 0.5);
      ctx.lineTo(x - w * 0.34, y + h * 0.5);
      ctx.closePath();
      ctx.fillStyle = COL.glass; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = COL.water;
      ctx.fillRect(x - w * 0.5, y - h * 0.02, w, h * 0.6);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(x - w * 0.30, y - h * 0.44, w * 0.10, h * 0.82);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(x - w * 0.46, y - h * 0.5);
      ctx.lineTo(x + w * 0.46, y - h * 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = Math.max(1.4, u * 0.10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - w * 0.34, y + h * 0.5);
      ctx.lineTo(x + w * 0.34, y + h * 0.5);
      ctx.strokeStyle = 'rgba(90,110,120,.35)';
      ctx.lineWidth = Math.max(1.2, u * 0.08);
      ctx.stroke();
    } else if (kind === 'gaffel') {
      var hw = u * 0.42, hh = u * 1.05;
      el(x, y + hh * 0.52, hw * 0.9, hh * 0.06, 'rgba(70,50,20,.12)');
      /* handtag */
      rr(x - hw * 0.30, y - hh * 0.05, hw * 0.60, hh * 0.98, hw * 0.26, COL.steel);
      rr(x - hw * 0.30, y - hh * 0.05, hw * 0.24, hh * 0.98, hw * 0.12, 'rgba(255,255,255,.45)');
      /* huvud med tre tänder */
      ctx.beginPath();
      ctx.moveTo(x - hw, y - hh * 0.98);
      ctx.lineTo(x + hw, y - hh * 0.98);
      ctx.lineTo(x + hw * 0.86, y - hh * 0.20);
      ctx.lineTo(x - hw * 0.86, y - hh * 0.20);
      ctx.closePath();
      ctx.fillStyle = COL.steel; ctx.fill();
      for (var t = -1; t <= 1; t++) {
        rr(x + t * hw * 0.62 - hw * 0.11, y - hh * 1.34, hw * 0.22, hh * 0.46, hw * 0.11, COL.steelD);
      }
      rr(x - hw * 0.86, y - hh * 0.26, hw * 1.72, hh * 0.14, hw * 0.07, COL.steelD);
    } else if (kind === 'servett') {
      var s2 = u * 1.55;
      el(x, y + s2 * 0.42, s2 * 0.5, s2 * 0.10, 'rgba(70,50,20,.12)');
      rr(x - s2 * 0.5, y - s2 * 0.5, s2, s2, s2 * 0.12, COL.napkinD);
      rr(x - s2 * 0.5, y - s2 * 0.5, s2, s2 * 0.86, s2 * 0.12, COL.napkin);
      ctx.beginPath();
      ctx.moveTo(x - s2 * 0.5, y + s2 * 0.14);
      ctx.lineTo(x + s2 * 0.5, y - s2 * 0.30);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = Math.max(1.5, s2 * 0.07);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* tom plats: streckad kontur i samma form */
  function drawKontur(kind, x, y, u, stark) {
    ctx.save();
    ctx.setLineDash([Math.max(3, u * 0.18), Math.max(3, u * 0.16)]);
    ctx.strokeStyle = stark ? 'rgba(106,168,79,.95)' : 'rgba(138,125,99,.45)';
    ctx.lineWidth = stark ? Math.max(2.5, u * 0.11) : Math.max(1.5, u * 0.06);
    if (kind === 'tallrik') {
      ctx.beginPath(); ctx.arc(x, y - u * 0.03, u * 0.88, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'glas') {
      rr(x - u * 0.46, y - u * 0.72, u * 0.92, u * 1.42, u * 0.12); ctx.stroke();
    } else if (kind === 'gaffel') {
      rr(x - u * 0.42, y - u * 1.34, u * 0.84, u * 2.30, u * 0.2); ctx.stroke();
    } else {
      var s2 = u * 1.55;
      rr(x - s2 * 0.5, y - s2 * 0.5, s2, s2, s2 * 0.12); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------- gäster ---------------- */

  function drawGast(kind, x, headY, R, t, glad) {
    var f = GASTFARG[kind] || GASTFARG.hare;
    var bob = Math.sin(t * 2.1 + x * 0.01) * R * 0.035;
    headY += bob;
    var hy = headY;

    /* kropp (bakom bordet) */
    el(x, hy + R * 1.55, R * 1.18, R * 1.30, f.kropp);
    el(x, hy + R * 1.75, R * 0.72, R * 0.85, f.mage);

    /* öron / huvudprydnad */
    if (kind === 'hare') {
      [[-1, -0.22], [1, 0.22]].forEach(function (e) {
        ctx.save();
        ctx.translate(x + e[0] * R * 0.44, hy - R * 0.85);
        ctx.rotate(e[0] * 0.22 + e[1]);
        el(0, -R * 0.55, R * 0.24, R * 0.72, f.kropp);
        el(0, -R * 0.55, R * 0.13, R * 0.55, f.inner);
        ctx.restore();
      });
    } else if (kind === 'bjorn') {
      [-1, 1].forEach(function (sd) {
        circ(x + sd * R * 0.72, hy - R * 0.70, R * 0.34, f.kropp);
        circ(x + sd * R * 0.72, hy - R * 0.70, R * 0.19, f.inner);
      });
    } else if (kind === 'fagel') {
      for (var c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(x + c * R * 0.34 - R * 0.16, hy - R * 0.86);
        ctx.lineTo(x + c * R * 0.34, hy - R * 1.34 + Math.abs(c) * R * 0.16);
        ctx.lineTo(x + c * R * 0.34 + R * 0.16, hy - R * 0.86);
        ctx.closePath();
        ctx.fillStyle = COL.napkinD; ctx.fill();
      }
    } else if (kind === 'rav') {
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.moveTo(x + sd * R * 0.90, hy - R * 0.42);
        ctx.lineTo(x + sd * R * 0.66, hy - R * 1.30);
        ctx.lineTo(x + sd * R * 0.20, hy - R * 0.72);
        ctx.closePath();
        ctx.fillStyle = f.kropp; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + sd * R * 0.78, hy - R * 0.52);
        ctx.lineTo(x + sd * R * 0.64, hy - R * 1.06);
        ctx.lineTo(x + sd * R * 0.40, hy - R * 0.70);
        ctx.closePath();
        ctx.fillStyle = f.inner; ctx.fill();
      });
    }

    /* huvud */
    circ(x, hy, R, f.kropp);

    /* kinder */
    ctx.globalAlpha = 0.55;
    circ(x - R * 0.52, hy + R * 0.28, R * 0.20, COL.pink);
    circ(x + R * 0.52, hy + R * 0.28, R * 0.20, COL.pink);
    ctx.globalAlpha = 1;

    /* nosparti */
    el(x, hy + R * 0.36, R * 0.44, R * 0.33, f.mage);
    if (kind === 'fagel') {
      ctx.beginPath();
      ctx.moveTo(x - R * 0.22, hy + R * 0.20);
      ctx.lineTo(x + R * 0.22, hy + R * 0.20);
      ctx.lineTo(x, hy + R * 0.56);
      ctx.closePath();
      ctx.fillStyle = f.nos; ctx.fill();
    } else {
      circ(x, hy + R * 0.26, R * 0.10, f.nos);
      ctx.beginPath();
      ctx.arc(x, hy + R * 0.38, R * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = 'rgba(74,64,51,.65)';
      ctx.lineWidth = Math.max(1.4, R * 0.075);
      ctx.stroke();
    }

    /* ögon */
    var blink = (Math.sin(t * 1.3 + x * 0.02) > 0.985) ? 0.18 : 1;
    [-1, 1].forEach(function (sd) {
      el(x + sd * R * 0.36, hy - R * 0.10, R * 0.115, R * 0.115 * blink, COL.ink);
      if (blink > 0.5) circ(x + sd * R * 0.36 + R * 0.04, hy - R * 0.15, R * 0.038, '#fff');
    });

    /* glad: små hjärtan/gnistor runt huvudet */
    if (glad > 0) {
      for (var q = 0; q < 3; q++) {
        var a = -Math.PI / 2 + (q - 1) * 0.6;
        var d = R * (1.35 + 0.15 * Math.sin(t * 6 + q));
        star(x + Math.cos(a) * d, hy + Math.sin(a) * d, R * 0.16 * glad, COL.star, null);
      }
    }
  }

  /* ---------------- bakgrund och bord ---------------- */

  function bakgrund() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1);
    g.addColorStop(0.72, COL.wall2);
    g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* tapet: små ljusare prickar */
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    var d = Math.max(46, Math.min(W, H) * 0.085);
    for (var y = d * 0.5; y < H; y += d) {
      for (var x = (Math.round(y / d) % 2) * d * 0.5; x < W; x += d) {
        circ(x, y, Math.max(2, d * 0.055), 'rgba(255,255,255,.35)');
      }
    }
    ctx.restore();

    /* golv */
    ctx.fillStyle = COL.floor;
    ctx.fillRect(0, L.benchTop - 4, W, H - L.benchTop + 4);
    ctx.fillStyle = 'rgba(120,80,40,.16)';
    for (var fx = 0; fx < W; fx += Math.max(70, W * 0.09)) {
      ctx.fillRect(fx, L.benchTop - 4, 2, H - L.benchTop + 4);
    }
  }

  function drawBord() {
    var y0 = L.tableTop, y1 = L.tableBot;
    /* bordsskiva */
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, COL.woodL);
    g.addColorStop(0.55, COL.wood);
    g.addColorStop(1, COL.wood);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);

    /* träådror */
    ctx.save();
    ctx.strokeStyle = 'rgba(120,80,40,.16)';
    ctx.lineWidth = Math.max(1.5, L.s * 2);
    for (var i = 1; i < 6; i++) {
      var yy = y0 + (y1 - y0) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(W * 0.3, yy + 3, W * 0.6, yy - 3, W, yy);
      ctx.stroke();
    }
    ctx.restore();

    /* bakkant och framkant */
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(0, y0, W, Math.max(2, L.s * 3));
    ctx.fillStyle = COL.woodD;
    ctx.fillRect(0, y1 - Math.max(5, L.s * 7), W, Math.max(5, L.s * 7));
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.fillRect(0, y1, W, Math.max(3, L.s * 5));

    /* duk under varje gästs plats */
    for (var k = 0; k < L.mats.length; k++) {
      var mt = L.mats[k];
      ctx.save();
      ctx.globalAlpha = 0.30;
      rr(mt.x, mt.y, mt.w, mt.h, L.s * 14, '#fffdf5');
      ctx.restore();
      ctx.save();
      ctx.setLineDash([Math.max(4, L.s * 6), Math.max(4, L.s * 6)]);
      ctx.strokeStyle = 'rgba(255,253,245,.55)';
      ctx.lineWidth = Math.max(1.5, L.s * 2);
      rr(mt.x, mt.y, mt.w, mt.h, L.s * 14);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBank() {
    var y = L.benchTop;
    /* skiva */
    rr(L.m * 0.6, y, W - L.m * 1.2, L.benchH, L.s * 16, COL.woodD);
    rr(L.m * 0.6, y, W - L.m * 1.2, L.benchH * 0.82, L.s * 16, COL.wood);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fillRect(L.m * 0.6 + 4, y + 2, W - L.m * 1.2 - 8, Math.max(2, L.s * 3));
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.fillRect(L.m * 0.6, y + L.benchH - Math.max(4, L.s * 6), W - L.m * 1.2, Math.max(4, L.s * 6));
  }

  function drawHogar() {
    if (G.fas === 'byter' || G.fas === 'fest') return;
    var u = L.pileU;
    for (var i = 0; i < L.piles.length; i++) {
      var p = L.piles[i];
      var kvar = G.kvar[p.kind] || 0;
      var glod = (G.glod === p.kind);
      /* fack på bänken */
      ctx.save();
      ctx.setLineDash([Math.max(4, u * 0.3), Math.max(4, u * 0.24)]);
      ctx.strokeStyle = glod ? 'rgba(106,168,79,.9)' : 'rgba(74,64,51,.25)';
      ctx.lineWidth = glod ? Math.max(3, u * 0.12) : Math.max(1.5, u * 0.06);
      rr(p.x - u * 1.5, p.y - u * 1.55, u * 3.0, u * 2.9, u * 0.5);
      ctx.stroke();
      ctx.restore();
      if (glod) {
        ctx.save();
        ctx.globalAlpha = 0.16 + 0.10 * Math.sin(nu * 6);
        rr(p.x - u * 1.5, p.y - u * 1.55, u * 3.0, u * 2.9, u * 0.5, '#7bcb86');
        ctx.restore();
      }

      var visa = Math.min(kvar, 4);
      for (var j = 0; j < visa; j++) {
        var dx = (j - (visa - 1) / 2) * u * 0.62;
        var dy = (j % 2) * u * 0.12;
        drawSak(p.kind, p.x + dx, p.y + dy, u * 0.80);
      }
      if (kvar === 0) {
        /* tomt: en bock — allt är slut, det räckte till alla */
        ctx.save();
        ctx.strokeStyle = COL.greenD;
        ctx.lineWidth = Math.max(3, u * 0.16);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - u * 0.42, p.y);
        ctx.lineTo(p.x - u * 0.10, p.y + u * 0.34);
        ctx.lineTo(p.x + u * 0.48, p.y - u * 0.40);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ---------------- mat och fest ---------------- */

  function drawMat() {
    if (G.mat <= 0) return;
    var n = G.gaster.length;
    var cx = W / 2;
    var cy = L.tableTop + (L.tableBot - L.tableTop) * 0.5;
    var r = clamp(L.plateR * 0.85, 22, 54);
    /* bara i mitten om det finns plats: annars ovanför mittenraden */
    var fr = clamp((L.tableBot - L.tableTop) * 0.26, 20, 46);
    cy = L.tableTop + fr * 1.05;

    ctx.save();
    ctx.globalAlpha = Math.min(1, G.mat);
    /* gryta */
    el(cx, cy + r * 0.25, r * 1.12, r * 0.98, COL.woodD);
    el(cx, cy - r * 0.05, r * 1.04, r * 0.86, COL.steelD);
    el(cx, cy - r * 0.16, r * 0.92, r * 0.66, '#e9d9b4');
    /* ånga */
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      var sx = cx + i * r * 0.42;
      ctx.beginPath();
      ctx.moveTo(sx, cy - r * 0.85);
      ctx.bezierCurveTo(sx + r * 0.25, cy - r * 1.15, sx - r * 0.25, cy - r * 1.35, sx, cy - r * 1.65);
      ctx.stroke();
    }
    ctx.restore();
    L.matPos = { x: cx, y: cy, r: r };
  }

  /* ---------------- HUD ---------------- */

  function drawHud() {
    var s = L.s;
    var r = clamp(11 * s, 8, 16);
    var gap = r * 2.7;
    var x0 = W - L.m - r;
    for (var i = 0; i < RUNDOR.length; i++) {
      var x = x0 - (RUNDOR.length - 1 - i) * gap;
      var y = L.m + r + 4;
      star(x, y, r, i < G.stjarnor ? COL.star : 'rgba(255,255,255,.55)', i < G.stjarnor ? COL.starD : 'rgba(138,125,99,.45)');
    }
  }

  function pill(text, bg, fg) {
    var s = L.s;
    var fs = clamp(16 * s, 11, 22);
    ctx.font = '800 ' + fs + 'px "Trebuchet MS", ui-rounded, sans-serif';
    var w = Math.min(ctx.measureText(text).width + fs * 2.4, W - 2 * L.m - 100);
    var h = fs * 2.1;
    var x = W / 2 - w / 2, y = L.topBar * 0.5 - h / 2 + 2;
    rr(x, y, w, h, h / 2, bg);
    txt(text, W / 2, y + h / 2, fs, fg, 'center', 800, w - fs * 1.6);
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

  function knapptext(kn, text) {
    var s = L.s;
    var fs = clamp(14 * s, 10, 18);
    ctx.font = '800 ' + fs + 'px "Trebuchet MS", ui-rounded, sans-serif';
    var w = ctx.measureText(text).width + fs * 2.0;
    var h = fs * 1.9;
    var y = kn.y + kn.r + 8 * s;
    rr(kn.x - w / 2, y, w, h, h / 2, 'rgba(255,250,243,.92)');
    txt(text, kn.x, y + h / 2, fs, COL.ink, 'center', 800, w - 8);
  }

  /* ---------------- skärmar ---------------- */

  function drawIntro() {
    var s = L.s;
    txt('Duka till gästerna', W / 2, H * 0.085, clamp(34 * s, 21, 48), COL.ink, 'center', 900, W - 40);
    txt('En tallrik, ett glas och en gaffel till var och en.',
      W / 2, H * 0.085 + clamp(30 * s, 20, 44), clamp(16 * s, 11, 21), COL.muted, 'center', 700, W * 0.90);

    /* liten demorad: tre dukade platser */
    var n = 3;
    var demoY = H * 0.44;
    var gap = Math.min(W * 0.30, H * 0.26);
    var cx0 = W / 2 - gap;
    var R = clamp(Math.min(gap * 0.30, H * 0.10), 20, 46);
    var pr = R * 0.85;

    for (var i = 0; i < n; i++) {
      var x = cx0 + i * gap;
      drawGast(['hare', 'bjorn', 'fagel'][i], x, demoY - R * 1.35, R, nu, 0);
    }
    /* bordsyta över kropparna */
    rr(W * 0.06, demoY - R * 0.2, W * 0.88, R * 2.9, 18 * s, COL.wood);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(W * 0.06, demoY - R * 0.2, W * 0.88, Math.max(2, 2 * s));
    for (var k = 0; k < n; k++) {
      var xx = cx0 + k * gap;
      drawSak('tallrik', xx, demoY + R * 0.85, pr);
      drawSak('glas', xx + pr * 1.25, demoY + R * 0.35, pr * 0.55);
      drawSak('gaffel', xx - pr * 1.25, demoY + R * 0.80, pr * 0.80);
    }

    /* Kotten vinkar */
    ctx.save();
    el(L.kottenH * 0.30, H - 6, L.kottenH * 0.26, L.kottenH * 0.055, 'rgba(70,50,20,.14)');
    try { window.KOTTEN.drawAtFeet(ctx, L.kottenH * 0.30, H - 6, L.kottenH * 0.62, { wave: true }); } catch (e) { errs.push('kotten: ' + e); }
    ctx.restore();

    drawVidare(L.start, 'play');
    knapptext(L.start, 'Spela');
  }

  function drawSpel() {
    for (var i = 0; i < G.gaster.length; i++) {
      var g = G.gaster[i];
      var mt = L.mats[i];
      var glad = g.glad > 0 ? Math.min(1, g.glad) : 0;
      drawGast(g.kind, mt.cx, L.guestHeadY, L.guestR, nu, glad);
    }
    drawBord();

    for (var j = 0; j < G.gaster.length; j++) {
      var gg = G.gaster[j];
      var sl = L.slots[j];
      var saker = G.saker || [];
      for (var q = 0; q < saker.length; q++) {
        var kind = saker[q];
        var plats = sl[kind];
        if (!plats) continue;
        if (gg.har[kind]) {
          var t0 = gg.har[kind];
          var pop = Math.min(1, (nu - t0) / 0.22);
          var sk = 0.72 + 0.28 * pop + 0.06 * Math.sin(pop * Math.PI);
          drawSak(kind, plats.x, plats.y, plats.r * sk);
        } else {
          drawKontur(kind, plats.x, plats.y, plats.r, !!(G.hand && G.hand.kind === kind));
        }
      }
    }

    /* lösa saker (fest) */
    for (var li = 0; li < G.losa.length; li++) {
      var lo = G.losa[li];
      drawSak(lo.kind, lo.x, lo.y, L.plateR * 0.8);
    }

    drawBank();
    drawMat();
    drawHogar();
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();

    if (G.fas === 'intro') { drawIntro(); drawGnistor(); return; }

    drawHud();
    drawSpel();

    /* statusrad */
    if (G.fas === 'spel') {
      var klara = 0;
      for (var i = 0; i < G.gaster.length; i++) if (gastKlar(G.gaster[i])) klara++;
      pill(klara + ' av ' + G.gaster.length + ' platser dukade', COL.cream, COL.muted);
    } else if (G.fas === 'byter') {
      pill('Alla platser är dukade!', '#d9eecb', COL.greenD);
      drawVidare(L.nasta, 'play');
      knapptext(L.nasta, G.runda < RUNDOR.length - 1 ? 'Nästa bord' : 'Fest');
    } else if (G.fas === 'fest') {
      pill('Bra dukat!', '#ffe9a8', COL.ink);
      drawVidare(L.igen, 'igen');
      knapptext(L.igen, 'En gång till');
    }

    drawHand();
    drawGnistor();
  }

  function drawHand() {
    if (!G.hand) return;
    var u = L.plateR * (G.fas === 'fest' ? 0.8 : 0.9);
    var x = G.hand.x, y = G.hand.y - u * 0.55;
    ctx.save();
    ctx.globalAlpha = 0.20;
    el(x, y + u * 1.05, u * 0.75, u * 0.16, '#2f2a20');
    ctx.restore();
    drawSak(G.hand.kind, x, y, u);
  }

  function drawGnistor() {
    for (var g = 0; g < G.gnistor.length; g++) {
      var q = G.gnistor[g];
      ctx.save();
      ctx.globalAlpha = Math.max(0, q.liv);
      star(q.x, q.y, q.r, q.farg, null);
      ctx.restore();
    }
  }

  /* ---------------- spelregler ---------------- */

  function gastKlar(g) {
    var saker = G.saker || [];
    for (var i = 0; i < saker.length; i++) if (!g.har[saker[i]]) return false;
    return true;
  }
  function allaKlara() {
    for (var i = 0; i < G.gaster.length; i++) if (!gastKlar(G.gaster[i])) return false;
    return G.gaster.length > 0;
  }

  function starta(idx) {
    var r = RUNDOR[idx] || RUNDOR[0];
    G.runda = idx;
    G.saker = r.saker.slice();
    G.gaster = r.gaster.map(function (k) { return { kind: k, har: {}, glad: 0 }; });
    G.kvar = {};
    for (var i = 0; i < r.saker.length; i++) G.kvar[r.saker[i]] = r.gaster.length;
    G.hand = null;
    G.losa = [];
    G.gnistor = [];
    G.timers = [];
    G.tid = 0; G.hintT = 0; G.mat = 0; G.glod = null; G.sagtPlacera = 0;
    G.fas = 'spel';
    layout();
    efter(300, function () { say('Duka till gästerna.', true); });
    efter(1500, function () {
      if (G.fas === 'spel') say('Lägg en tallrik, ett glas och en gaffel hos varje gäst.', true);
    });
    if (idx === 2) efter(4200, function () { if (G.fas === 'spel') say('Nu dukar vi med servetter!', true); });
  }

  function nastaRunda() {
    if (G.runda < RUNDOR.length - 1) {
      klirr();
      starta(G.runda + 1);
      efter(900, function () { if (G.fas === 'spel') say('Ett till bord!', true); });
    } else {
      fest();
    }
  }

  function fest() {
    G.fas = 'fest';
    G.mat = 1;
    G.hand = null;
    G.timers = [];
    for (var i = 0; i < G.gaster.length; i++) G.gaster[i].glad = 1;
    layout();
    fanfar();
    burst(W / 2, L.tableTop + (L.tableBot - L.tableTop) * 0.4, 26);
    efter(400, function () { say('Alla har fått lika mycket!', true); });
    efter(2400, function () { say('Bra dukat!', true); });
    efter(4600, function () { say('Nu leker vi bara!', true); });
  }

  function rundaKlar() {
    if (G.fas !== 'spel') return;
    G.fas = 'byter';
    G.stjarnor = Math.max(G.stjarnor, G.runda + 1);
    G.hand = null;
    G.mat = 0;
    fanfar();
    burst(W / 2, L.guestHeadY, 24);
    say('Nu är alla platser dukade!', true);
    efter(2400, function () {
      G.mat = 1;
      pling();
      say('Varsågod, maten är klar!', true);
    });
    for (var i = 0; i < G.gaster.length; i++) G.gaster[i].glad = 1;
  }

  function lagg(gi, kind) {
    var g = G.gaster[gi];
    if (!g) return false;
    if (g.har[kind]) {
      nej();
      say('Oj, där finns redan ' + ARTIKEL[kind].obest + '.', true);
      return false;
    }
    g.har[kind] = nu;
    G.kvar[kind] = Math.max(0, (G.kvar[kind] || 0) - 1);
    G.glod = null;
    G.tid = 0;
    plats();
    burst(L.slots[gi][kind].x, L.slots[gi][kind].y, 5);
    if (gastKlar(g)) {
      g.glad = 1;
      pling();
      efter(240, function () { say('Tack så mycket!', true); });
    } else {
      say('Tack!', true);
    }
    if (allaKlara()) efter(700, rundaKlar);
    return true;
  }

  function pileVid(p) {
    for (var i = 0; i < L.piles.length; i++) {
      var pl = L.piles[i];
      if (Math.abs(p.x - pl.x) < pl.r * 1.75 && Math.abs(p.y - pl.y) < pl.r * 1.9) return pl.kind;
    }
    return null;
  }

  function gastVid(p) {
    if (p.y < L.topBar * 0.9 || p.y > L.tableBot + 18) return -1;
    for (var i = 0; i < L.mats.length; i++) {
      if (Math.abs(p.x - L.mats[i].cx) < L.gap * 0.5) return i;
    }
    return -1;
  }

  function sakVid(p) {
    /* fest: en redan placerad sak på en plats, eller en lös sak på bordet */
    for (var i = 0; i < G.gaster.length; i++) {
      var g = G.gaster[i], sl = L.slots[i];
      for (var k in g.har) {
        if (!g.har[k] || !sl[k]) continue;
        var d = Math.hypot(p.x - sl[k].x, p.y - sl[k].y);
        if (d < Math.max(L.plateR * 0.9, 26)) return { typ: 'plats', gi: i, kind: k };
      }
    }
    for (var j = 0; j < G.losa.length; j++) {
      var lo = G.losa[j];
      if (Math.hypot(p.x - lo.x, p.y - lo.y) < L.plateR * 0.9) return { typ: 'los', idx: j, kind: lo.kind };
    }
    return null;
  }

  function slapp(p) {
    var h = G.hand;
    if (!h) return;
    var gi = gastVid(p);
    if (G.fas === 'spel') {
      if (gi >= 0) { G.hand = null; lagg(gi, h.kind); return; }
      G.hand = null;
      plats();
      return;
    }
    if (G.fas === 'fest') {
      if (gi >= 0 && !G.gaster[gi].har[h.kind]) {
        G.hand = null;
        lagg(gi, h.kind);
        return;
      }
      /* allt som släpps hamnar på bordet — inget kan tappas bort */
      laggLos(h.kind, p.x, p.y);
      G.hand = null;
      plats();
    }
  }

  function laggLos(kind, x, y) {
    G.losa.push({
      kind: kind,
      x: clamp(x, L.m + 20, W - L.m - 20),
      y: clamp(y, L.tableTop + 26, L.tableBot - 20)
    });
  }

  /* ---------------- pek ---------------- */

  function pos_(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function iCirc(p, c) { return c && Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.30; }

  function tryck(p) {
    ac();
    G.pek = p;
    if (G.fas === 'intro') {
      if (iCirc(p, L.start)) starta(0);
      return;
    }
    if (G.fas === 'byter') {
      if (iCirc(p, L.nasta)) nastaRunda();
      return;
    }
    if (G.fas === 'fest' && iCirc(p, L.igen)) { klirr(); starta(0); return; }

    if (G.hand) { slapp(p); return; }

    var kind = (G.fas === 'spel') ? pileVid(p) : null;
    if (kind) {
      if ((G.kvar[kind] || 0) <= 0) { nej(); return; }
      G.hand = { kind: kind, x: p.x, y: p.y };
      lyft();
      if (G.fas === 'spel' && !G.sagtPlacera) {
        G.sagtPlacera = 1;
        say('Lägg den hos en gäst.', true);
      }
      return;
    }

    if (G.fas === 'fest') {
      var s = sakVid(p);
      if (s) {
        G.hand = { kind: s.kind, x: p.x, y: p.y };
        if (s.typ === 'plats') {
          var g = G.gaster[s.gi];
          if (g) delete g.har[s.kind];
        } else {
          G.losa.splice(s.idx, 1);
        }
        lyft();
      }
    }
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var p = pos_(e);
    G.ner = p;
    try { tryck(p); } catch (err) { errs.push('ner: ' + err); }
  }, { passive: false });
  cv.addEventListener('pointermove', function (e) {
    e.preventDefault();
    var p = pos_(e);
    G.pek = p;
    if (G.hand) { G.hand.x = p.x; G.hand.y = p.y; }
  }, { passive: false });
  cv.addEventListener('pointerup', function (e) {
    e.preventDefault();
    var p = pos_(e);
    if (G.hand && G.ner && Math.hypot(p.x - G.ner.x, p.y - G.ner.y) > 14) {
      try { slapp(p); } catch (err) { errs.push('slapp: ' + err); }
    }
    G.ner = null;
  }, { passive: false });
  cv.addEventListener('pointercancel', function () { G.ner = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 140); });

  /* ---------------- uppdatering ---------------- */

  function burst(x, y, antal) {
    for (var i = 0; i < antal; i++) {
      var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 190;
      G.gnistor.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90,
        r: 3 + Math.random() * 5, liv: 1,
        farg: [COL.star, '#fff', COL.green, COL.napkin][i % 4]
      });
    }
  }

  function uppdatera(dt) {
    G.tid += dt;
    var i;
    for (i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) {
        var fn = G.timers[i].fn;
        G.timers.splice(i, 1);
        try { fn(); } catch (e) { errs.push('timer: ' + e); }
      }
    }
    for (i = G.gaster.length - 1; i >= 0; i--) {
      if (G.gaster[i].glad > 0) G.gaster[i].glad = Math.max(0, G.gaster[i].glad - dt * 0.35);
    }
    for (i = G.gnistor.length - 1; i >= 0; i--) {
      var q = G.gnistor[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; q.liv -= dt * 0.62;
      if (q.liv <= 0) G.gnistor.splice(i, 1);
    }
    /* hjälp om barnet tvekar: lys på högen och den plats som fattas */
    if (G.fas === 'spel' && !G.hand && G.tid > 14 && G.hintT !== G.runda) {
      G.hintT = G.runda;
      var saknas = null;
      for (var k = 0; k < G.saker.length && !saknas; k++) {
        for (var j = 0; j < G.gaster.length; j++) {
          if (!G.gaster[j].har[G.saker[k]]) { saknas = G.saker[k]; break; }
        }
      }
      if (saknas) {
        G.glod = saknas;
        say('Titta, här fattas ' + ARTIKEL[saknas].obest + '.', true);
      }
    }
  }

  var forra = performance.now();
  function frame(ts) {
    try {
      nu = ts / 1000;
      var dt = Math.min(0.05, (ts - forra) / 1000);
      forra = ts;
      if (Math.abs(innerWidth - W) > 1 || Math.abs(innerHeight - H) > 1) layout();
      uppdatera(dt);
      draw();
    } catch (e) {
      errs.push(String((e && e.stack) || e));
      if (errs.length > 20) errs.shift();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- testkrok ---------------- */

  window.__dk = {
    state: function () {
      return {
        fas: G.fas, runda: G.runda, saker: (G.saker || []).slice(),
        gaster: G.gaster.map(function (g) { return { kind: g.kind, har: Object.keys(g.har) }; }),
        kvar: JSON.parse(JSON.stringify(G.kvar)),
        hand: G.hand ? G.hand.kind : null,
        stjarnor: G.stjarnor, mat: G.mat,
        losa: G.losa.map(function (l) { return { kind: l.kind, x: Math.round(l.x), y: Math.round(l.y) }; }),
        piles: (L.piles || []).map(function (p) { return { kind: p.kind, x: Math.round(p.x), y: Math.round(p.y), r: Math.round(p.r) }; }),
        slots: (L.slots || []).map(function (s) {
          var o = {};
          for (var k in s) o[k] = { x: Math.round(s[k].x), y: Math.round(s[k].y), r: Math.round(s[k].r) };
          return o;
        }),
        mats: (L.mats || []).map(function (m) { return { cx: Math.round(m.cx), y: Math.round(m.y), w: Math.round(m.w), h: Math.round(m.h) }; }),
        start: { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) },
        nasta: { x: Math.round(L.nasta.x), y: Math.round(L.nasta.y), r: Math.round(L.nasta.r) },
        W: W, H: H, errs: errs.slice()
      };
    },
    start: function (i) { starta(i || 0); return window.__dk.state(); },
    tap: function (x, y) { tryck({ x: x, y: y }); return window.__dk.state(); },
    drag: function (x1, y1, x2, y2) {
      tryck({ x: x1, y: y1 });
      if (G.hand) { G.hand.x = x2; G.hand.y = y2; slapp({ x: x2, y: y2 }); }
      return window.__dk.state();
    },
    plocka: function (kind) {
      var p = null;
      for (var i = 0; i < L.piles.length; i++) if (L.piles[i].kind === kind) p = L.piles[i];
      if (!p) return window.__dk.state();
      tryck({ x: p.x, y: p.y });
      return window.__dk.state();
    },
    lagg: function (gi, kind) { lagg(gi, kind); return window.__dk.state(); },
    nasta: function () { nastaRunda(); return window.__dk.state(); },
    seek: function (ms) {
      var kvar = ms / 1000;
      while (kvar > 0) { var d = Math.min(kvar, 0.05); kvar -= d; uppdatera(d); }
      return window.__dk.state();
    },
    klar: function () {
      while (G.fas === 'spel') {
        var gjort = false;
        for (var i = 0; i < G.gaster.length && !gjort; i++) {
          for (var k = 0; k < G.saker.length && !gjort; k++) {
            if (!G.gaster[i].har[G.saker[k]]) { lagg(i, G.saker[k]); gjort = true; }
          }
        }
        if (!gjort) break;
      }
      window.__dk.seek(1200);
      return window.__dk.state();
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
