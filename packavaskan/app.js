/* Packa väskan — allt ska få plats i väskan.
 *
 * En öppen väska med ett rutnät står på golvet och sakerna ligger på bänken
 * bredvid. Barnet drar en sak i taget ner i väskan; den snäpper fast i rutnätet
 * om det finns plats, annars vinkas den vänligt tillbaka. Ett tryck vrider en
 * sak ett kvarts varv — och det behövs, för en lång flirt vill ligga ner.
 * När allt fått plats går locket igen, en stjärna flyger upp och nästa väska
 * står framme. Fyra väskor, sedan fest där allt får packas hur som helst.
 *
 * Tränar: rumslig packning — area och form på en gång. Att vrida på en sak i
 * huvudet och se att samma sak tar olika mycket plats åt olika håll.
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#eef4e4', wall2: '#d3e3c2',
    floor: '#dce8c9',
    cream: '#fffaf3', ink: '#3f4a3a', muted: '#7c8774',
    leather: '#8a6242', leatherD: '#6b4a2f', leatherL: '#b78b62',
    panel: '#f0e4cd', panelD: '#d9c8a8',
    green: '#6aa84f', greenD: '#4c8039',
    star: '#f7c948', starD: '#dfa616'
  };

  /* ---------------- sakerna ---------------- */

  var SAK = {
    bok:    { namn: 'Boken',    w: 2, h: 2, f: '#c9803f', d: '#a4612a', l: '#e2ab72' },
    kudde:  { namn: 'Kudden',   w: 2, h: 2, f: '#d9584f', d: '#b13e37', l: '#ef8880' },
    filt:   { namn: 'Filten',   w: 1, h: 3, f: '#5d7fb8', d: '#41608f', l: '#8aa6d4' },
    brod:   { namn: 'Brödet',   w: 1, h: 2, f: '#d8a45a', d: '#b3803a', l: '#ecc78c' },
    flaska: { namn: 'Flaskan',  w: 1, h: 2, f: '#6fae8b', d: '#4c8c69', l: '#a2d0b4' },
    lada:   { namn: 'Lådan',    w: 2, h: 2, f: '#a08e6e', d: '#7c6b4e', l: '#c4b394' },
    boll:   { namn: 'Bollen',   w: 2, h: 2, f: '#e8b23a', d: '#c08d1c', l: '#f7d583' },
    dagbok: { namn: 'Dagboken', w: 2, h: 3, f: '#7d6bb0', d: '#5d4d8c', l: '#a597d2' }
  };

  var RUNDOR = [
    { cols: 4, rows: 3, saker: ['bok', 'kudde', 'filt'] },
    { cols: 4, rows: 4, saker: ['bok', 'kudde', 'lada', 'brod', 'flaska'] },
    { cols: 5, rows: 4, saker: ['bok', 'kudde', 'lada', 'boll', 'filt'] },
    { cols: 5, rows: 4, saker: ['dagbok', 'lada', 'filt', 'kudde'] }
  ];

  var NUM = ['', 'Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex', 'Sju', 'Åtta'];

  /* ---------------- tillstånd ---------------- */

  var W = 0, H = 0, DPR = 1;

  var L = {};

  var G = {
    fas: 'intro', ri: 0, cols: 4, rows: 3,
    pieces: [], grid: [], drag: null, stjarnor: 0,
    lidT: 0, tid: 0, tystT: 0, hint: null, hintT: 0,
    gnistor: [], timers: [], hits: [], fel: 0, sista: 0,
    sager: ''
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
    g.gain.linearRampToValueAtTime(vol == null ? 0.10 : vol, a.currentTime + 0.012);
    g.gain.linearRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function lyft() { tone(430, 0.08, 0.055, 'sine', 620); }
  function snapp() { tone(300, 0.07, 0.07, 'triangle', 210); setTimeout(function () { tone(190, 0.09, 0.05, 'triangle'); }, 55); }
  function vrid() { tone(560, 0.07, 0.05, 'sine', 720); }
  function pling() { tone(660, 0.10, 0.08, 'triangle'); setTimeout(function () { tone(990, 0.14, 0.06, 'triangle'); }, 95); }
  function nej() { tone(250, 0.14, 0.045, 'triangle', 190); }
  function pet() { tone(820, 0.05, 0.03, 'sine'); }
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

  /* ---------------- rityta ---------------- */

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function dims(p, rot) {
    var r = (rot == null ? p.rot : rot) & 1;
    return r ? { w: p.h0, h: p.w0 } : { w: p.w0, h: p.h0 };
  }

  function packTray(cell, commit) {
    var tw = L.tray.w, th = L.tray.h;
    var items = [];
    var i, p;
    for (i = 0; i < G.pieces.length; i++) {
      p = G.pieces[i];
      if (p.placerad) continue;
      var d = dims(p);
      items.push({ p: p, w: d.w * cell, h: d.h * cell });
    }
    items.sort(function (a, b) { return (b.h - a.h) || (b.w - a.w); });
    var gap = Math.max(6, cell * 0.12);
    var x = 0, y = 0, rowH = 0;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.w > tw + 0.5 || it.h > th + 0.5) return false;
      if (x > 0 && x + it.w > tw + 0.5) { x = 0; y += rowH + gap; rowH = 0; }
      if (y + it.h > th + 0.5) return false;
      it.x = x; it.y = y;
      x += it.w + gap;
      rowH = Math.max(rowH, it.h);
    }
    if (commit) {
      for (i = 0; i < items.length; i++) {
        items[i].p.bx = L.tray.x + items[i].x;
        items[i].p.by = L.tray.y + items[i].y;
      }
    }
    return true;
  }

  function layout() {
    W = Math.max(300, innerWidth);
    H = Math.max(320, innerHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';

    var s = clamp(Math.min(W, H) / 768, 0.62, 1.35);
    var m = clamp(Math.min(W, H) * 0.028, 10, 26);
    var starR = clamp(9 * s, 6, 12);
    var qY = m + starR * 2 + 8 * s;

    L.W = W; L.H = H; L.s = s; L.m = m; L.starR = starR;
    L.hudH = qY + clamp(40 * s, 26, 52);

    var land = W >= H * 1.02;
    L.land = land;
    var kottenW = clamp(W * 0.18, 84, 190);
    L.kottenW = kottenW;

    var top = L.hudH + 18 * s;
    var bot = H - m - 6;

    if (land) {
      var ax = kottenW + m;
      L.bagArea = { x: ax, y: top, w: W * 0.60 - ax, h: bot - top };
      L.tray = { x: W * 0.625, y: top, w: W - m - W * 0.625, h: bot - top };
    } else {
      var ax2 = kottenW + m * 0.5;
      var bh = (bot - top) * 0.56;
      L.bagArea = { x: ax2, y: top, w: W - ax2 - m, h: bh };
      L.tray = { x: m, y: top + bh + 14 * s, w: W - 2 * m, h: bot - (top + bh + 14 * s) };
    }

    var cols = G.cols, rows = G.rows;
    var cellBag = Math.min(L.bagArea.w / cols, L.bagArea.h / rows);
    var maxdim = 1;
    for (var i = 0; i < G.pieces.length; i++) {
      maxdim = Math.max(maxdim, G.pieces[i].w0, G.pieces[i].h0);
    }
    var cell = Math.floor(Math.min(cellBag, Math.min(L.tray.w, L.tray.h) / maxdim));
    cell = Math.min(cell, 150);
    var guard = 0;
    while (cell > 18 && !packTray(cell, false) && guard++ < 200) cell -= 2;
    if (cell < 18) cell = 18;

    L.cell = cell;
    L.bagW = cols * cell;
    L.bagH = rows * cell;
    L.bagX = L.bagArea.x + (L.bagArea.w - L.bagW) / 2;
    L.bagY = L.bagArea.y + (L.bagArea.h - L.bagH) / 2;
    L.pad = Math.max(9, cell * 0.24);

    var kottenH = clamp(L.bagH * 0.95, 120, 320);
    L.kottenH = kottenH;
    L.kottenX = kottenW * 0.48 + m * 0.5;
    L.kottenFeet = L.bagY + L.bagH + L.pad;

    packTray(cell, true);
  }

  function layoutHits() {
    G.hits = [];
    if (G.fas === 'intro') {
      G.hits.push({ kind: 'start', x: W / 2, y: L.startY, r: L.startR });
    }
    if (G.fas === 'fest') {
      G.hits.push({ kind: 'igen', x: W / 2, y: L.startY, r: L.startR });
    }
  }

  /* ---------------- ritthjälpare ---------------- */

  function rr(x, y, w, h, r, fill, stroke, lw) {
    var rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function el(x, y, rx, ry, f) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = f; ctx.fill();
  }

  function circ(x, y, r, f) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fillStyle = f; ctx.fill();
  }

  function star(x, y, r, fill, edge) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr2 = i % 2 ? r * 0.45 : r;
      var px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1.2, r * 0.14); ctx.stroke(); }
  }

  function txt(s, x, y, size, col, align, weight, maxW) {
    var fs = size;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    do {
      ctx.font = (weight || 700) + ' ' + fs + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
      fs -= 1;
    } while (maxW && ctx.measureText(s).width > maxW && fs > 9);
    ctx.fillStyle = col;
    ctx.fillText(s, x, y);
  }

  /* ---------------- bakgrund ---------------- */

  function bakgrund() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1);
    g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* golvet under väskan */
    ctx.fillStyle = COL.floor;
    ctx.fillRect(0, H - Math.max(40, H * 0.07), W, Math.max(40, H * 0.07));
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(0, H - Math.max(40, H * 0.07), W, 3);

    /* en liten blomma i gräset, bara som färg */
    ctx.globalAlpha = 0.5;
    for (var i = 0; i < 3; i++) {
      circ(W * (0.14 + i * 0.05), H - Math.max(40, H * 0.07) + 12, 3, '#f4e7a8');
    }
    ctx.globalAlpha = 1;
  }

  function stjarnrad() {
    var r = L.starR, gap = r * 3.0, n = 4;
    var x0 = L.m + r, y = L.m + r;
    for (var i = 0; i < n; i++) {
      var har = i < G.stjarnor;
      star(x0 + i * gap, y, r, har ? COL.star : 'rgba(63,74,58,.14)', har ? COL.starD : null);
    }
  }

  /* ---------------- sakerna som bilder ---------------- */

  function sakRit(id, w, h, cell) {
    var S = SAK[id];
    var u = Math.min(w, h);
    var r = Math.min(12, u * 0.16);

    if (id === 'bok' || id === 'dagbok') {
      rr(-w / 2, -h / 2, w, h, r, S.f);
      ctx.fillStyle = S.d;
      if (id === 'bok') {
        rr(-w / 2, -h / 2, w * 0.17, h, r, S.d);
        rr(-w / 2 + w * 0.22, -h * 0.30, w * 0.56, h * 0.10, 3, S.l);
        rr(-w / 2 + w * 0.22, -h * 0.08, w * 0.56, h * 0.10, 3, S.l);
        rr(-w / 2 + w * 0.22, h * 0.14, w * 0.36, h * 0.10, 3, S.l);
      } else {
        rr(-w / 2, -h / 2, w * 0.16, h, r, S.d);
        rr(w * 0.12, -h / 2, w * 0.10, h * 0.62, 3, S.l);
        ctx.fillStyle = S.d;
        ctx.beginPath();
        ctx.moveTo(w * 0.12, -h / 2 + h * 0.62);
        ctx.lineTo(w * 0.17, -h / 2 + h * 0.62);
        ctx.lineTo(w * 0.17, -h / 2 + h * 0.50);
        ctx.closePath();
        ctx.fill();
      }
      /* pärmens kant */
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.lineWidth = 2;
      rr(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, r * 0.8, null, 'rgba(255,255,255,.35)', 2);
      return;
    }

    if (id === 'kudde') {
      rr(-w / 2, -h / 2, w, h, u * 0.28, S.f);
      ctx.strokeStyle = 'rgba(255,255,255,.30)';
      ctx.lineWidth = Math.max(2, u * 0.02);
      ctx.beginPath();
      ctx.moveTo(-w / 2 + u * 0.14, 0); ctx.lineTo(w / 2 - u * 0.14, 0);
      ctx.moveTo(0, -h / 2 + u * 0.14); ctx.lineTo(0, h / 2 - u * 0.14);
      ctx.stroke();
      var b = u * 0.055;
      circ(-w / 2 + u * 0.20, -h / 2 + u * 0.20, b, '#ffe9c9');
      circ(w / 2 - u * 0.20, -h / 2 + u * 0.20, b, '#ffe9c9');
      circ(-w / 2 + u * 0.20, h / 2 - u * 0.20, b, '#ffe9c9');
      circ(w / 2 - u * 0.20, h / 2 - u * 0.20, b, '#ffe9c9');
      return;
    }

    if (id === 'filt') {
      var lw2 = Math.min(w, h), lh2 = Math.max(w, h);
      var vert = h > w;
      ctx.save();
      if (!vert) ctx.rotate(Math.PI / 2);
      rr(-lw2 / 2, -lh2 / 2, lw2, lh2, Math.min(10, lw2 * 0.22), S.f);
      ctx.fillStyle = S.l;
      var n = 4, seg = lh2 / n;
      for (var i = 0; i < n; i += 2) {
        ctx.globalAlpha = 0.55;
        ctx.fillRect(-lw2 / 2 + 2, -lr2(lh2, seg, i), lw2 - 4, seg * 0.42);
      }
      ctx.globalAlpha = 1;
      /* fransar */
      ctx.fillStyle = '#c9d8ef';
      for (var k = 0; k < 5; k++) {
        ctx.fillRect(-lw2 / 2 + 3 + k * (lw2 - 6) / 4.5, lh2 / 2 - 2, lw2 * 0.06, lw2 * 0.12);
      }
      ctx.restore();
      return;
    }

    if (id === 'brod') {
      var vertB = h > w;
      ctx.save();
      if (!vertB) ctx.rotate(Math.PI / 2);
      var bw = Math.min(w, h), bh = Math.max(w, h);
      rr(-bw / 2, -bh / 2, bw, bh, bw * 0.45, S.f);
      ctx.fillStyle = S.l;
      ctx.globalAlpha = 0.5;
      rr(-bw * 0.30, -bh / 2 + bh * 0.08, bw * 0.22, bh * 0.40, bw * 0.12);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(120,80,30,.35)';
      for (var j = 0; j < 3; j++) {
        circ(-bw * 0.12 + j * bw * 0.16, bh * 0.12 + (j % 2) * bh * 0.10, bw * 0.045, 'rgba(120,80,30,.35)');
      }
      ctx.restore();
      return;
    }

    if (id === 'flaska') {
      var vertF = h > w;
      ctx.save();
      if (!vertF) ctx.rotate(-Math.PI / 2);
      var fw = Math.min(w, h), fh = Math.max(w, h);
      var neckW = fw * 0.34;
      rr(-neckW / 2, -fh / 2, neckW, fh * 0.22, neckW * 0.3, S.d);
      rr(-fw * 0.42, -fh / 2 + fh * 0.18, fw * 0.84, fh * 0.80, fw * 0.24, S.f);
      rr(-fw * 0.26, -fh / 2 + fh * 0.34, fw * 0.16, fh * 0.42, fw * 0.08, S.l);
      ctx.restore();
      return;
    }

    if (id === 'lada') {
      rr(-w / 2, -h / 2, w, h, r, S.f);
      rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, r * 0.7, null, 'rgba(0,0,0,.10)', 2);
      ctx.fillStyle = S.d;
      ctx.fillRect(-w * 0.055, -h / 2 + 2, w * 0.11, h - 4);
      ctx.fillRect(-w / 2 + 2, -h * 0.055, w - 4, h * 0.11);
      ctx.fillStyle = S.l;
      ctx.fillRect(-w * 0.055, -h / 2 + 2, w * 0.11, h * 0.14);
      return;
    }

    if (id === 'boll') {
      var R = Math.min(w, h) * 0.47;
      circ(0, 0, R, S.f);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = Math.max(2, R * 0.14);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.95, R * 0.42, 0, 0, Math.PI * 1.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.42, R * 0.95, 0, 0, Math.PI * 1.05);
      ctx.stroke();
      el(-R * 0.3, -R * 0.35, R * 0.22, R * 0.16, 'rgba(255,255,255,.6)');
      return;
    }
  }

  function lr2(lh, seg, i) { return -lh / 2 + i * seg; }

  function drawSak(p, cx, cy, cell, alpha) {
    var w = p.w0 * cell, h = p.h0 * cell;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    if (p.rot & 1) ctx.rotate(Math.PI / 2);
    /* skugga */
    ctx.save();
    ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.16;
    rr(-w / 2 + 3, -h / 2 + 4, w - 2, h - 2, Math.min(14, w * 0.16), '#3f2f1c');
    ctx.restore();
    sakRit(p.id, w, h, cell);
    ctx.restore();
  }

  /* ---------------- väskan ---------------- */

  function drawBag(openFrac) {
    var x = L.bagX, y = L.bagY, w = L.bagW, h = L.bagH, pad = L.pad;

    /* skugga på golvet */
    ctx.save();
    ctx.globalAlpha = 0.16;
    el(x + w / 2, y + h + pad * 0.7, w * 0.56, pad * 0.42, '#2c2a22');
    ctx.restore();

    /* handtag bakom */
    ctx.strokeStyle = COL.leatherD;
    ctx.lineWidth = Math.max(5, pad * 0.5);
    ctx.beginPath();
    ctx.arc(x + w / 2, y - pad * 0.5, w * 0.16, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();

    /* ytterhöljet */
    rr(x - pad, y - pad, w + 2 * pad, h + 2 * pad, pad * 1.5, COL.leather);

    /* insidan */
    rr(x, y, w, h, pad * 0.5, COL.panel);
    ctx.save();
    ctx.globalAlpha = 0.5;
    rr(x + 3, y + 3, w - 6, h - 6, pad * 0.4, null, COL.panelD, 2);
    ctx.restore();

    /* rutnätet */
    ctx.save();
    ctx.strokeStyle = 'rgba(120,105,80,.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    for (var c = 1; c < G.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(x + c * L.cell, y + 2);
      ctx.lineTo(x + c * L.cell, y + h - 2);
      ctx.stroke();
    }
    for (var r = 1; r < G.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + r * L.cell);
      ctx.lineTo(x + w - 2, y + r * L.cell);
      ctx.stroke();
    }
    ctx.restore();

    /* spännen nere */
    ctx.fillStyle = COL.leatherD;
 ctx.fillRect(x + w * 0.18, y + h + pad * 0.55, w * 0.10, pad * 0.5);
    ctx.fillRect(x + w * 0.72, y + h + pad * 0.55, w * 0.10, pad * 0.5);
  }

  /* locket ritas efter sakerna, annars ligger saker kvar ovanpå ett stängt lock */
  function drawLid(lf) {
    if (!lf || lf <= 0.001) return;
    var x = L.bagX, y = L.bagY, w = L.bagW, h = L.bagH, pad = L.pad;
    var lh = (h + 2 * pad) * lf;
    ctx.save();
    rr(x - pad, y - pad, w + 2 * pad, lh, pad * 1.5, COL.leather);
    ctx.globalAlpha = 0.18;
    rr(x - pad + 6, y - pad + 6, w + 2 * pad - 12, Math.max(6, lh - 12), pad, COL.leatherL);
    ctx.globalAlpha = 1;
    if (lf > 0.9) {
      /* spänne och söm */
      ctx.fillStyle = COL.leatherD;
      ctx.fillRect(x + w * 0.30, y + h + pad * 0.10, w * 0.40, pad * 0.34);
      circ(x + w * 0.50, y + h + pad * 0.27, pad * 0.22, COL.leatherL);
      ctx.strokeStyle = 'rgba(60,40,20,.35)';
      ctx.lineWidth = 2;
      rr(x - pad + 8, y - pad + 8, w + 2 * pad - 16, lh - 16, pad, null, 'rgba(60,40,20,.28)', 2);
    }
    ctx.restore();
  }

  /* ---------------- spel ---------------- */

  function tomGrid(cols, rows) {
    var g = [];
    for (var i = 0; i < cols * rows; i++) g.push(null);
    return g;
  }

  function newRound(ri) {
    var R = RUNDOR[ri];
    G.cols = R.cols; G.rows = R.rows;
    G.pieces = [];
    for (var i = 0; i < R.saker.length; i++) {
      var id = R.saker[i], d = SAK[id];
      G.pieces.push({ id: id, namn: d.namn, w0: d.w, h0: d.h, rot: 0, placerad: false, gx: -1, gy: -1, bx: 0, by: 0 });
    }
    G.grid = tomGrid(G.cols, G.rows);
    G.drag = null; G.hint = null; G.hintT = 0; G.tid = 0; G.fel = 0; G.lidT = 0;
    layout();
  }

  function newFest() {
    G.fas = 'fest';
    G.cols = 6; G.rows = 6;
    G.pieces = [];
    var alla = ['bok', 'kudde', 'filt', 'brod', 'flaska', 'lada', 'boll', 'dagbok'];
    for (var i = 0; i < alla.length; i++) {
      var id = alla[i], d = SAK[id];
      G.pieces.push({ id: id, namn: d.namn, w0: d.w, h0: d.h, rot: 0, placerad: false, gx: -1, gy: -1, bx: 0, by: 0 });
    }
    G.grid = tomGrid(G.cols, G.rows);
    G.drag = null; G.hint = null; G.hintT = 0; G.lidT = 0;
    layout();
    say('Nu är det fest! Packa hur du vill.', true);
  }

  function startSpel() {
    G.fas = 'spel'; G.ri = 0; G.stjarnor = 0;
    newRound(0);
    say('Packa väskan! Alla saker ska få plats.', true);
    efter(2600, function () {
      if (G.fas === 'spel') say('Dra en sak till väskan. Tryck på en sak för att vrida den.');
    });
  }

  function nasta() {
    G.ri++;
    if (G.ri >= RUNDOR.length) { newFest(); layoutHits(); return; }
    G.fas = 'spel';
    newRound(G.ri);
    say('Ny väska! Alla saker ska få plats.', true);
  }

  function cellOf(gx, gy) { return gy * G.cols + gx; }

  function canPlace(p, gx, gy, rot) {
    var d = dims(p, rot == null ? p.rot : rot);
    if (gx < 0 || gy < 0 || gx + d.w > G.cols || gy + d.h > G.rows) return false;
    for (var yy = 0; yy < d.h; yy++) {
      for (var xx = 0; xx < d.w; xx++) {
        if (G.grid[cellOf(gx + xx, gy + yy)]) return false;
      }
    }
    return true;
  }

  function placeCells(p) {
    var d = dims(p);
    for (var yy = 0; yy < d.h; yy++) {
      for (var xx = 0; xx < d.w; xx++) G.grid[cellOf(p.gx + xx, p.gy + yy)] = p;
    }
    p.placerad = true;
  }

  function unplace(p) {
    if (!p.placerad) return;
    var d = dims(p);
    for (var yy = 0; yy < d.h; yy++) {
      for (var xx = 0; xx < d.w; xx++) {
        var k = (p.gy + yy) * G.cols + (p.gx + xx);
        if (G.grid[k] === p) G.grid[k] = null;
      }
    }
    p.placerad = false;
    p.gx = -1; p.gy = -1;
  }

  function antalPlacerade() {
    var n = 0;
    for (var i = 0; i < G.pieces.length; i++) if (G.pieces[i].placerad) n++;
    return n;
  }

  function doPlace(p, gx, gy) {
    p.gx = gx; p.gy = gy;
    placeCells(p);
    snapp();
    G.hint = null; G.tid = 0; G.fel = 0;
    var n = antalPlacerade();
    if (n < G.pieces.length) say(NUM[n] || (' ' + n));
    bekräfta(p, gx, gy);
    if (n === G.pieces.length) klarRunda();
    packTray(L.cell, true);
  }

  function bekräfta(p, gx, gy) {
      var d = dims(p);
      G.glimt = { x: L.bagX + gx * L.cell, y: L.bagY + gy * L.cell, t: 0.5, w: Math.max(d.w, d.h) * L.cell, hh: d.h * L.cell, ww: d.w * L.cell };
    }

  function klarRunda() {
    if (G.fas === 'fest') return;
    G.fas = 'klar';
    G.lidT = 0;
    pling();
    efter(280, fanfar);
    burst(W / 2, L.bagY + L.bagH * 0.4, 18);
    say('Allt fick plats! Bra jobbat!', true);
    if (G.ri < RUNDOR.length - 1) G.stjarnor = Math.max(G.stjarnor, G.ri + 1);
    else G.stjarnor = 4;
    efter(2900, function () { if (G.fas === 'klar') { nasta(); layoutHits(); } });
  }

  /* ---------------- vrida ---------------- */

  function vridSak(p) {
    if (G.fas === 'klar') return;
    if (p.placerad) {
      var d0 = dims(p);
      var ny = 1 - (p.rot & 1);
      var d1 = dims(p, ny);
      var gx = p.gx, gy = p.gy;
      /* behåll mitten ungefär där den var */
      gx = Math.round(p.gx + (d0.w - d1.w) / 2);
      gy = Math.round(p.gy + (d0.h - d1.h) / 2);
      var backup = p.rot;
      var gamlaGx = p.gx, gamlaGy = p.gy;
      unplace(p);
      p.rot = ny;
      if (canPlace(p, gx, gy)) {
        p.gx = gx; p.gy = gy; placeCells(p);
        vrid(); bekräfta(p, gx, gy);
        if (antalPlacerade() === G.pieces.length) klarRunda();
        return;
      }
      /* fick inte plats vriden — lägg tillbaka som den var */
      p.rot = backup;
      p.gx = gamlaGx; p.gy = gamlaGy; placeCells(p);
      nej();
      say('Den får inte plats så. Dra ut den först.');
      return;
    }
    p.rot = 1 - (p.rot & 1);
    vrid();
    packTray(L.cell, true);
    layoutHits();
  }

  /* ---------------- partiklar ---------------- */

  function burst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 200;
      G.gnistor.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
        liv: 1, r: 4 + Math.random() * 5,
        farg: ['#f7c948', '#ffffff', '#6aa84f', '#d9584f'][i % 4]
      });
    }
  }

  /* ---------------- ritning ---------------- */

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();
    stjarnrad();

    if (G.fas === 'intro') { drawIntro(t); return; }

    /* väskan */
    drawBag(0);

    /* placerade saker */
    for (var i = 0; i < G.pieces.length; i++) {
      var p = G.pieces[i];
      if (!p.placerad) continue;
      var d = dims(p);
      drawSak(p, L.bagX + (p.gx + d.w / 2) * L.cell, L.bagY + (p.gy + d.h / 2) * L.cell, L.cell);
    }

    /* glimt där något landade */
    if (G.glimt && G.glimt.t > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, G.glimt.t) * 1.4;
      rr(G.glimt.x - 3, G.glimt.y - 3, G.glimt.ww + 6, G.glimt.hh + 6, 8, null, '#ffffff', 4);
      ctx.restore();
    }

    /* bänken */
    drawTray();

    /* ledtråd */
    if (G.hint) drawHint(t);

    /* Kotten */
    var kh = L.kottenH;
    try {
      window.KOTTEN.drawAtFeet(ctx, L.kottenX, L.kottenFeet, kh, { wave: G.fas === 'klar' || G.fas === 'fest' });
    } catch (e) { errs.push('kotten: ' + e); }

    /* dragen sak överst */
    if (G.drag && G.drag.moved) {
      var dg = dims(G.drag.p);
      drawSak(G.drag.p, G.drag.x - G.drag.ox + dg.w * L.cell / 2, G.drag.y - G.drag.oy + dg.h * L.cell / 2, L.cell, 0.92);
    }

    /* locket över allt när väskan är packad */
    if (G.fas === 'klar') drawLid(G.lidT);

    /* gnistor */
    for (var gi = 0; gi < G.gnistor.length; gi++) {
      var q = G.gnistor[gi];
      ctx.globalAlpha = Math.max(0, Math.min(1, q.liv));
      star(q.x, q.y, q.r, q.farg, null);
      ctx.globalAlpha = 1;
    }

    if (G.fas === 'klar') {
      var a = clamp((G.lidT - 0.55) / 0.4, 0, 1);
      if (a > 0) {
        ctx.save();
        ctx.globalAlpha = a;
        pill('Allt fick plats!', W / 2, L.bagY + L.bagH * 0.5, clamp(26 * L.s, 17, 34));
        ctx.restore();
      }
    }
    if (G.fas === 'fest') drawFestKnapp(t);
    layoutHits();
  }

  function pill(text, x, y, size) {
    ctx.font = '900 ' + size + 'px "Trebuchet MS", ui-rounded, system-ui, sans-serif';
    var w = ctx.measureText(text).width + size * 1.1;
    var h = size * 1.7;
    rr(x - w / 2, y - h / 2, w, h, h / 2, 'rgba(255,250,243,.94)', 'rgba(63,74,58,.10)', 2);
    txt(text, x, y + 1, size, COL.greenD, 'center', 900, w - size);
  }

  function drawTray() {
    var T = L.tray;
    if (G.pieces.length && antalPlacerade() === G.pieces.length) return;
    ctx.save();
    ctx.globalAlpha = 0.55;
    rr(T.x - 6, T.y - 6, T.w + 12, T.h + 12, Math.max(10, L.cell * 0.2), 'rgba(255,250,243,.55)');
    ctx.restore();

    if (G.fas === 'fest') {
      txt('Packa hur du vill', T.x + T.w / 2, T.y - 14 * L.s, clamp(15 * L.s, 12, 20), COL.muted, 'center', 700, T.w);
    }

    for (var i = 0; i < G.pieces.length; i++) {
      var p = G.pieces[i];
      if (p.placerad) continue;
      if (G.drag && G.drag.p === p && G.drag.moved) continue;
      var d = dims(p);
      var cx = p.bx + d.w * L.cell / 2, cy = p.by + d.h * L.cell / 2;
      drawSak(p, cx, cy, L.cell, 1);
      if (G.hint && G.hint.p === p) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        rr(p.bx - 3, p.by - 3, d.w * L.cell + 6, d.h * L.cell + 6, 12, null, COL.star, 4);
        ctx.restore();
      }
    }
  }

  function drawHint(t) {
    var h = G.hint;
    if (!h || !h.p || h.p.placerad) return;
    var d = dims(h.p, h.rot);
    var x = L.bagX + h.gx * L.cell, y = L.bagY + h.gy * L.cell;
    var puls = 0.45 + 0.35 * Math.sin(t * 4.2);
    ctx.save();
    ctx.globalAlpha = puls;
    ctx.setLineDash([7, 7]);
    rr(x + 3, y + 3, d.w * L.cell - 6, d.h * L.cell - 6, 10, 'rgba(247,201,72,.22)', COL.starD, 4);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawFestKnapp(t) {
    var r = clamp(Math.min(W, H) * 0.075, 30, 52);
    var cx = W / 2, cy = H - r - 20;
    L.startY = cy; L.startR = r;
    ctx.save();
    var puls = 1 + 0.035 * Math.sin(t * 6.2);
    ctx.translate(cx, cy);
    ctx.scale(puls, puls);
    circ(0, 3, r * 1.02, 'rgba(80,70,50,.16)');
    circ(0, 0, r, '#ffffff');
    ctx.strokeStyle = COL.greenD;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.46, Math.PI * 0.75, Math.PI * 2.35);
    ctx.stroke();
    ctx.fillStyle = COL.greenD;
    ctx.beginPath();
    ctx.moveTo(r * 0.02, -r * 0.66);
    ctx.lineTo(r * 0.52, -r * 0.40);
    ctx.lineTo(r * 0.06, -r * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    txt('en gång till', cx, cy + r + 16, clamp(13 * L.s, 11, 16), COL.muted, 'center', 700, 200);
  }

  function drawIntro(t) {
    var cy = H * 0.30;
    txt('Packa väskan', W / 2, Math.min(L.hudH + 30, H * 0.10), clamp(38 * L.s, 24, 54), COL.ink, 'center', 900, W - 30);
    txt('Alla saker ska få plats', W / 2, Math.min(L.hudH + 30, H * 0.10) + clamp(34 * L.s, 22, 44), clamp(17 * L.s, 13, 24), COL.muted, 'center', 700, W - 30);

    /* en liten väska med fyra saker i, som bild */
    var cols = 4, rows = 3;
    var cw = Math.min(W * 0.44, H * 0.30) / cols;
    var bw = cw * cols, bh = cw * rows;
    var bx = W / 2 - bw / 2, by = cy + clamp(10, 6, 20);
    var saveX = L.bagX, saveY = L.bagY, saveW = L.bagW, saveH = L.bagH, savePad = L.pad, saveCols = G.cols, saveRows = G.rows;
    L.bagX = bx; L.bagY = by; L.bagW = bw; L.bagH = bh; L.pad = cw * 0.24; G.cols = cols; G.rows = rows;
    drawBag(0);

    /* fyra saker ligger i väskan */
    var demo = [{ id: 'bok', x: 0, y: 0, w: 2, h: 2 }, { id: 'kudde', x: 2, y: 0, w: 2, h: 2 }, { id: 'filt', r: 1, x: 0, y: 2, w: 4, h: 1 }, { id: 'boll', x: 0, y: 0, w: 0, h: 0 }];
    drawSak({ id: 'bok', rot: 0, w0: 2, h0: 2 }, bx + cw, by + cw, cw);
    drawSak({ id: 'kudde', rot: 0, w0: 2, h0: 2 }, bx + cw * 3, by + cw, cw);
    drawSak({ id: 'filt', rot: 1, w0: 1, h0: 4 }, bx + bw / 2, by + cw * 2.5, cw);

    L.bagX = saveX; L.bagY = saveY; L.bagW = saveW; L.bagH = saveH; L.pad = savePad; G.cols = saveCols; G.rows = saveRows;

    try {
      window.KOTTEN.drawAtFeet(ctx, W * 0.16, by + bh + cw * 0.6, clamp(bh * 0.85, 90, 220), { wave: true });
    } catch (e) { errs.push('kotten: ' + e); }

    /* stor rund startknapp */
    var r = clamp(Math.min(W, H) * 0.085, 34, 62);
    var ky = Math.min(H - r - 40, by + bh + r + 48);
    L.startY = ky; L.startR = r;
    ctx.save();
    var puls = 1 + 0.035 * Math.sin(t * 6.2);
    ctx.translate(W / 2, ky);
    ctx.scale(puls, puls);
    circ(0, 4, r * 1.02, 'rgba(80,70,50,.16)');
    circ(0, 0, r, '#ffffff');
    ctx.fillStyle = COL.greenD;
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.42);
    ctx.lineTo(r * 0.42, 0);
    ctx.lineTo(-r * 0.26, r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    var tw = ctx.measureText('BÖRJA').width;
    rr(W / 2 - 58, ky + r + 8, 116, 26, 13, 'rgba(255,250,243,.92)');
    txt('BÖRJA', W / 2, ky + r + 21, 15, COL.ink, 'center', 900, 110);
  }

  /* ---------------- pekhändelser ---------------- */

  function pkt(e) {
    var r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function iRekt(p, x, y, extra) {
    var d = dims(p);
    var pad = extra || 6;
    return x >= p.bx - pad && x <= p.bx + d.w * L.cell + pad && y >= p.by - pad && y <= p.by + d.h * L.cell + pad;
  }

  function plocka(pt) {
    var i, p, d;
    for (i = G.pieces.length - 1; i >= 0; i--) {
      p = G.pieces[i];
      if (!p.placerad) continue;
      d = dims(p);
      var x = L.bagX + p.gx * L.cell, y = L.bagY + p.gy * L.cell;
      if (pt.x >= x - 4 && pt.x <= x + d.w * L.cell + 4 && pt.y >= y - 4 && pt.y <= y + d.h * L.cell + 4) return p;
    }
    for (i = 0; i < G.pieces.length; i++) {
      p = G.pieces[i];
      if (p.placerad) continue;
      if (iRekt(p, pt.x, pt.y, 8)) return p;
    }
    return null;
  }

  function ner(e) {
    ac();
    var pt = pkt(e);
    if (G.fas === 'intro') {
      if (Math.hypot(pt.x - W / 2, pt.y - L.startY) <= L.startR * 1.4) { startSpel(); }
      else pet();
      return;
    }
    if (G.fas === 'fest') {
      if (L.startY && Math.hypot(pt.x - W / 2, pt.y - L.startY) <= L.startR * 1.4) {
        G.stjarnor = 0; G.fas = 'spel'; G.ri = 0; startSpel(); return;
      }
    }
    if (G.fas === 'klar') return;

    var p = plocka(pt);
    if (!p) { pet(); return; }

    var d = dims(p);
    G.drag = {
      p: p,
      fran: p.placerad ? 'vaska' : 'bank',
      px: pt.x, py: pt.y, x: pt.x, y: pt.y,
      ox: pt.x - (p.placerad ? L.bagX + p.gx * L.cell : p.bx),
      oy: pt.y - (p.placerad ? L.bagY + p.gy * L.cell : p.by),
      og: p.placerad ? { gx: p.gx, gy: p.gy, rot: p.rot } : null,
      moved: false
    };
    lyft();
  }

  function ror(e) {
    if (!G.drag) return;
    var pt = pkt(e);
    G.drag.x = pt.x; G.drag.y = pt.y;
    if (!G.drag.moved && Math.hypot(pt.x - G.drag.px, pt.y - G.drag.py) > 9) {
      G.drag.moved = true;
      if (G.drag.fran === 'vaska') unplace(G.drag.p);
    }
  }

  function upp(e) {
    var d = G.drag;
    G.drag = null;
    if (!d) return;
    var p = d.p;
    var pt = e ? pkt(e) : { x: d.x, y: d.y };

    if (!d.moved) {
      vridSak(p);
      packTray(L.cell, true);
      return;
    }

    var dd = dims(p);
    var pw = dd.w * L.cell, ph = dd.h * L.cell;
    var left = d.x - d.ox, top = d.y - d.oy;
    var cx = left + pw / 2, cy = top + ph / 2;
    var gx = Math.round((left - L.bagX) / L.cell);
    var gy = Math.round((top - L.bagY) / L.cell);

    var iVaskan = cx > L.bagX - L.cell * 0.9 && cx < L.bagX + L.bagW + L.cell * 0.9 &&
                  cy > L.bagY - L.cell * 0.9 && cy < L.bagY + L.bagH + L.cell * 0.9;

    var overTray = cx > L.tray.x - L.cell * 0.6 && cx < L.tray.x + L.tray.w + L.cell * 0.6 &&
                   cy > L.tray.y - L.cell * 0.6 && cy < L.tray.y + L.tray.h + L.cell * 0.9;

    if (iVaskan && canPlace(p, gx, gy)) {
      doPlace(p, gx, gy);
      return;
    }

    if (d.fran === 'vaska' && d.og && !overTray) {
      /* tillbaka där den stod, om det går */
      p.rot = d.og.rot;
      if (canPlace(p, d.og.gx, d.og.gy)) {
        p.gx = d.og.gx; p.gy = d.og.gy; placeCells(p);
      }
      nej();
      return;
    }

    /* tillbaka till bänken */
    if (p.placerad) unplace(p);
    p.gx = -1; p.gy = -1; p.placerad = false;
    packTray(L.cell, true);
    if (d.fran === 'bank') {
      G.fel++;
      nej();
      if (iVaskan) {
        if (G.fel >= 2) {
          say('Prova att vrida den. Tryck på saken.');
          var hh = beraknaHint();
          if (hh.p) { G.hint = hh; G.hintT = 0; }
        } else {
          say('Inte där. Prova en annan plats.');
        }
      }
    } else {
      snapp();
    }
  }

  /* ---------------- ledtråd ---------------- */

  var HINT = { p: null, gx: -1, gy: -1, rot: 0 };
  function hintSak() { return HINT.p; }

  function beraknaHint() {
    HINT = { p: null, gx: -1, gy: -1, rot: 0 };
    var i, p, r, gx, gy;
    for (i = 0; i < G.pieces.length; i++) {
      p = G.pieces[i];
      if (p.placerad) continue;
      for (r = 0; r < 2; r++) {
        var rot = r ? 1 - (p.rot & 1) : (p.rot & 1);
        for (gy = 0; gy <= G.rows; gy++) {
          for (gx = 0; gx <= G.cols; gx++) {
            if (canPlace(p, gx, gy, rot)) {
              HINT = { p: p, gx: gx, gy: gy, rot: rot };
              return HINT;
            }
          }
        }
      }
    }
    return HINT;
  }

  /* ---------------- uppdatering ---------------- */

  function update(dt, t) {
    var i;
    for (i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) {
        var fn = G.timers[i].fn;
        G.timers.splice(i, 1);
        try { fn(); } catch (e) { errs.push('timer: ' + e); }
      }
    }
    for (i = G.gnistor.length - 1; i >= 0; i--) {
      var q = G.gnistor[i];
      q.vy += 420 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.liv -= dt * 0.9;
      if (q.liv <= 0) G.gnistor.splice(i, 1);
    }
    if (G.glimt) { G.glimt.t -= dt * 2; if (G.glimt.t <= 0) G.glimt = null; }

    if (G.fas === 'klar') {
      G.lidT = Math.min(1, G.lidT + dt * 1.9);
    }

    if (G.fas === 'spel' && !G.drag) {
      G.tid += dt;
      G.hintT += dt;
      if (G.tid > 9 && !G.hint) {
        var h = beraknaHint();
        if (h.p) {
          G.hint = h;
          G.hintT = 0;
          say('Titta här — här finns en plats.');
        }
      } else if (G.hint && G.hintT > 7) {
        G.hint = null; G.tid = 0;
      }
    }
    if (G.drag) G.tid = 0;

    if (innerWidth !== W || innerHeight !== H) { layout(); layoutHits(); }
  }

  /* ---------------- loop ---------------- */

  var sista = 0;
  function frame(t) {
    var nu = t / 1000;
    var dt = sista ? Math.min(0.05, nu - sista) : 0.016;
    sista = nu;
    try {
      update(dt, nu);
      draw(nu);
    } catch (e) {
      errs.push('draw: ' + (e && e.message ? e.message : e));
      if (errs.length > 20) errs.shift();
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- testkrok ---------------- */

  function state() {
    var pcs = G.pieces.map(function (p) {
      return { id: p.id, rot: p.rot, placerad: p.placerad, gx: p.gx, gy: p.gy, bx: Math.round(p.bx), by: Math.round(p.by) };
    });
    return {
      fas: G.fas, ri: G.ri, stjarnor: G.stjarnor, cols: G.cols, rows: G.rows,
      cell: L.cell, bag: { x: Math.round(L.bagX), y: Math.round(L.bagY), w: Math.round(L.bagW), h: Math.round(L.bagH) },
      tray: L.tray, pieces: pcs, placerade: antalPlacerade(), lid: Math.round(G.lidT * 100) / 100,
      hint: G.hint ? { id: G.hint.p ? G.hint.p.id : null, gx: G.hint.gx, gy: G.hint.gy } : null,
      sager: G.sager, W: W, H: H, errs: errs.slice()
    };
  }

  function solveStep() {
    /* hitta en giltig placering för första oplacerade saken, returnera dragpunkter */
    var i, p, r, gx, gy;
    for (i = 0; i < G.pieces.length; i++) {
      p = G.pieces[i];
      if (p.placerad) continue;
      for (r = 0; r < 2; r++) {
        var rot = r ? 1 - (p.rot & 1) : (p.rot & 1);
        for (gy = 0; gy <= G.rows; gy++) {
          for (gx = 0; gx <= G.cols; gx++) {
            if (canPlace(p, gx, gy, rot)) return { p: p, gx: gx, gy: gy, rot: rot };
          }
        }
      }
    }
    return null;
  }

  window.__pv = {
    state: state,
    start: function () { startSpel(); return state(); },
    tap: function (x, y) { ner({ clientX: x, clientY: y }); upp({ clientX: x, clientY: y }); return state(); },
    drag: function (x1, y1, x2, y2) {
      ner({ clientX: x1, clientY: y1 });
      ror({ clientX: (x1 + x2) / 2, clientY: (y1 + y2) / 2 });
      ror({ clientX: x2, clientY: y2 });
      upp({ clientX: x2, clientY: y2 });
      return state();
    },
    /* lägg saken pid i ruta gx,gy (med rörelse, som ett riktigt drag) */
    lagg: function (pid, gx, gy, rot) {
      var p = null, i;
      for (i = 0; i < G.pieces.length; i++) if (G.pieces[i].id === pid && !G.pieces[i].placerad) p = G.pieces[i];
      if (!p) return { fel: 'saknas: ' + pid };
      if (rot != null && (p.rot & 1) !== (rot & 1)) vridSak(p);
      var d = dims(p);
      var fx = p.bx + d.w * L.cell / 2, fy = p.by + d.h * L.cell / 2;
      var tx = L.bagX + gx * L.cell + d.w * L.cell / 2;
      var ty = L.bagY + gy * L.cell + d.h * L.cell / 2;
      return window.__pv.drag(fx, fy, tx, ty);
    },
    auto: function () {
      var s = solveStep(), steg = 0;
      while (s && steg++ < 40) {
        window.__pv.lagg(s.p.id, s.gx, s.gy, s.rot);
        s = solveStep();
      }
      return state();
    },
    vrid: function (pid) {
      var i;
      for (i = 0; i < G.pieces.length; i++) if (G.pieces[i].id === pid) vridSak(G.pieces[i]);
      return state();
    },
    nasta: function () { return window.__pv.spola(3200); },
    spola: function (ms) {
      var kvar = ms / 1000, steg = 0;
      while (kvar > 0 && steg++ < 800) {
        var d = Math.min(kvar, 0.05);
        kvar -= d;
        update(d, 0);
      }
      return state();
    },
    errs: function () { return errs.slice(); }
  };

  layout();
  layoutHits();

  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { ner(e); } catch (err) { errs.push('ner: ' + err); } }, { passive: false });
  cv.addEventListener('pointermove', function (e) { try { ror(e); } catch (err) { errs.push('ror: ' + err); } });
  cv.addEventListener('pointerup', function (e) { e.preventDefault(); try { upp(e); } catch (err) { errs.push('upp: ' + err); } }, { passive: false });
  cv.addEventListener('pointercancel', function (e) { try { upp(e); } catch (err) { errs.push('avbryt: ' + err); } });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();