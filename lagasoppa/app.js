/* Laga soppa — följ receptet och laga soppa åt Kotten
 *
 * Ett receptkort överst visar tre saker i ordning, med lika många prickar som
 * det ska i grytan. Barnet drar (eller trycker) saken från bänken ner i
 * grytan: varje nedläggning fyller en prick och sägs högt ("ett", "två"), och
 * när pricken är slut går receptet vidare till nästa sak. Till slut kokar
 * soppan, Kotten smakar och får en stjärna.
 *
 * Ingen förlust: fel sak ger ett vänligt "nej" och stannar kvar på bänken,
 * inga minus, ingen tid. Fyra soppor → fest där alla saker får åka i grytan.
 *
 * Tränar: instruktionsföljd (recept i ordning), antal 1–3 kopplat till en
 * handling, ordförråd (grönsaker) och orsak–verkan (grytan förändras direkt).
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#f9eeda', wall2: '#ecd8ba',
    cream: '#fffaf3', cream2: '#f6e7cf', ink: '#4a3f39', muted: '#8a7a6d',
    wood: '#d0955a', woodD: '#a86f2f', woodL: '#e9bb87',
    pot: '#5b6672', potD: '#3d4650', potL: '#7d8996',
    rim: '#8b96a2', steel: '#c9d2da',
    star: '#f7c948', starD: '#dfa616',
    green: '#6aa84f', greenD: '#4c8039', coral: '#e98061',
    teal: '#4fae94', blue: '#6cc0e8', red: '#d9484a'
  };

  /* ---------------- innehåll ---------------- */
  var ING = {
    morot:   { namn: 'Morot',   sing: 'morot',   plur: 'morötter',  genus: 'en',  farg: '#e8843c' },
    potatis: { namn: 'Potatis', sing: 'potatis', plur: 'potatisar', genus: 'en',  farg: '#c99a63' },
    lok:     { namn: 'Lök',     sing: 'lök',     plur: 'lökar',     genus: 'en',  farg: '#efdfc4' },
    svamp:   { namn: 'Svamp',   sing: 'svamp',   plur: 'svampar',   genus: 'en',  farg: '#c2694a' },
    aple:    { namn: 'Äpple',   sing: 'äpple',   plur: 'äpplen',    genus: 'ett', farg: '#d9484a' },
    blabar:  { namn: 'Blåbär',  sing: 'blåbär',  plur: 'blåbär',    genus: 'ett', farg: '#5b6fc0' },
    artor:   { namn: 'Ärtor',   sing: 'ärta',    plur: 'ärtor',     genus: 'en',  farg: '#7cb342' },
    vatten:  { namn: 'Vatten',  sing: 'vatten',  plur: 'vatten',    genus: 'en',  farg: '#6cc0e8' }
  };
  var ORD = ['', 'ett', 'två', 'tre'];

  var SOPPOR = [
    { namn: 'Morotssoppa', farg: '#e79a3f', ing: [['morot', 2], ['potatis', 1], ['vatten', 1]] },
    { namn: 'Svampsoppa',  farg: '#c9a878', ing: [['svamp', 3], ['lok', 1], ['vatten', 1]] },
    { namn: 'Ärtsoppa',    farg: '#bcc95a', ing: [['artor', 3], ['morot', 1], ['vatten', 1]] },
    { namn: 'Fruktsoppa',  farg: '#c96f8a', ing: [['aple', 2], ['blabar', 2], ['vatten', 1]] }
  ];

  function stegText(id, n) {
    if (id === 'vatten') return 'Lägg i vatten.';
    var it = ING[id];
    var antal = n === 1 ? (it.genus === 'ett' ? 'ett' : 'en') : (n === 2 ? 'två' : 'tre');
    var ord = n === 1 ? it.sing : it.plur;
    return 'Lägg i ' + antal + ' ' + ord + '.';
  }

  /* ---------------- tillstånd ---------------- */
  var W = 0, H = 0, DPR = 1, nu = 0;
  var L = {
    land: true, m: 16, topBar: 120, tableTop: 500, shelfTop: 700, shelfH: 190,
    pot: { x: 0, y: 0, r: 60 }, kort: [], start: null, igen: null, nasta: null, platser: []
  };
  var G = {
    fas: 'intro', ri: 0, steg: 0, lagt: 0,
    kort: [], fyll: [], drag: null, vald: null,
    skak: 0, fel: 0, kokT: 0, klarT: 0, tid: 0,
    timers: [], bubblor: [], gnistor: [], hits: [],
    over: false, sagt: 0
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
  function plopp() { tone(300, 0.12, 0.10, 'sine', 720); }
  function pling() {
    tone(660, 0.10, 0.09, 'triangle');
    setTimeout(function () { tone(990, 0.14, 0.07, 'triangle'); }, 95);
  }
  function nej() { tone(210, 0.16, 0.09, 'triangle', 160); }
  function fanfar() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.26, 0.09, 'triangle'); }, i * 130);
    });
  }
  function bubbla() { tone(520 + Math.random() * 320, 0.07, 0.05, 'sine', 900); }

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

    var land = W / H > 1.06;
    var m = clamp(Math.min(W, H) * 0.030, 10, 26);
    var topBar = clamp(H * 0.185, 96, 200);
    var potCy = topBar + (H - topBar) * 0.34;
    var potR = clamp(Math.min(W * 0.245, (H - topBar) * 0.20), 42, 132);
    var shelfH = clamp(H * 0.255, 96, 230);
    var shelfTop = H - shelfH - clamp(H * 0.008, 4, 12);
    var tableTop = Math.min(shelfTop - clamp(H * 0.012, 6, 16), potCy + potR * 0.82);

    L.land = land; L.m = m; L.topBar = topBar;
    L.pot = { x: W / 2, y: potCy, r: potR };
    L.tableTop = tableTop;
    L.shelfTop = shelfTop;
    L.shelfH = shelfH - clamp(H * 0.008, 4, 12);

    var br = clamp(Math.min(W, H) * 0.095, 36, 64);
    L.start = { x: W / 2, y: H - clamp(H * 0.13, 56, 116), r: br };
    L.igen = { x: W - m - br * 0.62, y: m + br * 0.62, r: br * 0.58 };
    L.nasta = { x: W / 2, y: 0, r: br * 0.92 };

    L.platser = platser(G.kort.length || 4);
  }

  /* kortens platser på bänken, n kort */
  function platser(n) {
    n = Math.max(1, n);
    var m = L.m, gap = clamp(W * 0.018, 5, 16);
    var cw = Math.min((W - 2 * m - gap * (n - 1)) / n, 168);
    var ch = Math.min(L.shelfH * 0.92, cw * 1.16);
    var tot = n * cw + (n - 1) * gap;
    var x0 = W / 2 - tot / 2;
    var y = L.shelfTop + (L.shelfH - ch) * 0.52;
    var ut = [];
    for (var i = 0; i < n; i++) ut.push({ x: x0 + i * (cw + gap), y: y, w: cw, h: ch });
    return ut;
  }

  /* ---------------- ritning: grunder ---------------- */
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
      if (ctx.measureText(str).width <= maxW || s <= 9) break;
      s -= 1;
    } while (s > 9);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col || COL.ink;
    ctx.fillText(str, x, y);
  }
  function K(x, feetY, w) {
    if (window.KOTTEN) {
      try { KOTTEN.drawAtFeet(ctx, x, feetY, w, {}); }
      catch (e) { errs.push('kotten: ' + e); }
    }
  }
  function star(x, y, r, col) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr2 = i % 2 ? r * 0.46 : r;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    }
    ctx.closePath();
    ctx.fillStyle = col || COL.star; ctx.fill();
  }

  /* ---------------- ritning: saker (100-ruta, centrerad) ---------------- */
  function ing(id, x, y, s, rot) {
    if (!s || s < 1) return;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s / 100, s / 100);
    switch (id) {
      case 'morot': {
        ctx.fillStyle = '#e8843c';
        ctx.beginPath();
        ctx.moveTo(-19, -30); ctx.lineTo(19, -30);
        ctx.quadraticCurveTo(9, 18, 1, 42);
        ctx.quadraticCurveTo(-8, 18, -19, -30);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(170,85,25,.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (var i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-11 + i * 8, -14 + i * 6);
          ctx.lineTo(6 + i * 3, -14 + i * 6);
          ctx.stroke();
        }
        ctx.fillStyle = '#5f9e3f';
        [-24, -10, 4].forEach(function (dx, k) {
          ell(dx + 8, -38 - (k === 1 ? 5 : 0), 11, 17, '#5f9e3f', (k - 1) * 0.5);
        });
        break;
      }
      case 'potatis': {
        ell(0, 2, 34, 28, '#c99a63');
        ctx.fillStyle = 'rgba(130,95,55,.55)';
        circ(-13, -4, 4); circ(9, 8, 3.4); circ(18, -9, 2.8); circ(-4, 15, 3);
        ctx.fillStyle = 'rgba(255,246,228,.35)';
        ell(-9, -12, 11, 6, 'rgba(255,246,228,.35)', -0.4);
        break;
      }
      case 'lok': {
        ell(0, 8, 29, 32, '#f0e2ca');
        ctx.strokeStyle = 'rgba(150,100,150,.45)'; ctx.lineWidth = 3;
        [-14, 0, 14].forEach(function (dx) {
          ctx.beginPath(); ctx.arc(dx * 0.5, 8, 26, -1.4, 1.4); ctx.stroke();
        });
        ctx.strokeStyle = '#6f9e4b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        [-8, 2].forEach(function (dx) {
          ctx.beginPath(); ctx.moveTo(dx, -20); ctx.quadraticCurveTo(dx * 2.2, -38, dx * 3.4, -46); ctx.stroke();
        });
        break;
      }
      case 'svamp': {
        rr(-13, -2, 26, 34, 10, '#f2e6cf');
        ctx.fillStyle = '#c2694a';
        ctx.beginPath(); ctx.arc(0, 0, 38, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,244,222,.9)';
        circ(-18, -14, 6); circ(4, -22, 5); circ(20, -10, 4.4); circ(-2, -8, 3.4);
        break;
      }
      case 'aple': {
        circ(-11, 6, 25, '#c93a3c'); circ(12, 6, 25, '#e05050');
        ell(0, -2, 21, 22, '#d9484a');
        ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(3, -36); ctx.stroke();
        ell(16, -32, 13, 7, '#6aa84f', -0.5);
        ell(-9, -4, 6, 4, 'rgba(255,235,225,.5)', -0.5);
        break;
      }
      case 'blabar': {
        [[-16, 12], [16, 12], [0, -12]].forEach(function (p) {
          circ(p[0], p[1], 16, '#5b6fc0');
          circ(p[0] - 5, p[1] - 6, 4.4, 'rgba(220,235,255,.75)');
        });
        break;
      }
      case 'artor': {
        ctx.save(); ctx.rotate(-0.5);
        ell(0, 4, 40, 18, '#8ec25a');
        ctx.restore();
        [[-20, 10], [-7, 2], [6, 0], [19, 6]].forEach(function (p) {
          circ(p[0], p[1], 9.5, '#5f9e3f');
          circ(p[0] - 3, p[1] - 3, 3.2, 'rgba(230,245,205,.6)');
        });
        break;
      }
      case 'vatten': {
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.bezierCurveTo(26, -8, 32, 8, 32, 18);
        ctx.arc(0, 18, 32, 0, Math.PI);
        ctx.bezierCurveTo(-32, 8, -26, -8, 0, -42);
        ctx.closePath();
        ctx.fillStyle = COL.blue; ctx.fill();
        ell(-11, 8, 7, 12, 'rgba(240,252,255,.65)', -0.3);
        break;
      }
    }
    ctx.restore();
  }

  /* ---------------- bakgrund ---------------- */
  function drawBg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1); g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* tapetrutor */
    ctx.save();
    ctx.strokeStyle = 'rgba(180,150,115,.16)';
    ctx.lineWidth = 1.5;
    var step = clamp(W / 12, 54, 110);
    for (var x = step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.tableTop); ctx.stroke();
    }
    for (var y = step; y < L.tableTop; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    /* bänken */
    var t = L.tableTop;
    var gw = ctx.createLinearGradient(0, t, 0, H);
    gw.addColorStop(0, COL.woodL); gw.addColorStop(0.22, COL.wood); gw.addColorStop(1, COL.woodD);
    ctx.fillStyle = gw; ctx.fillRect(0, t, W, H - t);
    ctx.fillStyle = 'rgba(255,240,215,.75)';
    ctx.fillRect(0, t, W, Math.max(2, H * 0.006));
    ctx.save();
    ctx.strokeStyle = 'rgba(120,72,30,.20)'; ctx.lineWidth = 2;
    for (var x2 = W / 7; x2 < W; x2 += W / 7) {
      ctx.beginPath(); ctx.moveTo(x2, t + 8); ctx.lineTo(x2, H); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------- grytan ---------------- */
  function drawPot(t) {
    var p = L.pot, x = p.x, y = p.y, r = p.r;
    var sop = G.fas === 'intro' ? '#efe1c8' : (SOPPOR[Math.min(G.ri, SOPPOR.length - 1)] || SOPPOR[0]).farg;
    if (G.fas === 'fest') sop = G.festFarg || '#e5cf9f';

    /* skugga på bänken */
    ell(x, y + r * 0.86, r * 0.95, r * 0.17, 'rgba(120,80,40,.22)');

    /* handtag */
    ctx.save();
    ctx.strokeStyle = COL.potD; ctx.lineWidth = Math.max(6, r * 0.14); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.96, y - r * 0.10); ctx.lineTo(x - r * 1.24, y - r * 0.10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.96, y - r * 0.10); ctx.lineTo(x + r * 1.24, y - r * 0.10); ctx.stroke();
    ctx.restore();

    /* kropp */
    var gp = ctx.createLinearGradient(x - r, y, x + r, y);
    gp.addColorStop(0, COL.potL); gp.addColorStop(0.45, COL.pot); gp.addColorStop(1, COL.potD);
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.28);
    ctx.quadraticCurveTo(x - r * 0.98, y + r * 0.86, x - r * 0.62, y + r * 0.86);
    ctx.lineTo(x + r * 0.62, y + r * 0.86);
    ctx.quadraticCurveTo(x + r * 0.98, y + r * 0.86, x + r, y - r * 0.28);
    ctx.closePath();
    ctx.fillStyle = gp; ctx.fill();

    /* kant */
    ell(x, y - r * 0.28, r, r * 0.30, COL.rim);
    ell(x, y - r * 0.30, r * 0.87, r * 0.25, '#3f4852');

    /* soppan */
    var surfY = y - r * 0.30 + Math.sin(t * 1.7) * r * 0.012;
    var gs = ctx.createRadialGradient(x - r * 0.3, surfY - r * 0.1, r * 0.1, x, surfY, r * 0.95);
    gs.addColorStop(0, shade(sop, 26)); gs.addColorStop(1, shade(sop, -14));
    ell(x, surfY, r * 0.86, r * 0.245, gs);

    /* det som lagts i */
    for (var i = 0; i < G.fyll.length; i++) {
      var f = G.fyll[i];
      var fx = x + Math.cos(f.a) * r * 0.56 * f.d;
      var fy = surfY + Math.sin(f.a) * r * 0.14 * f.d + Math.sin(t * 2 + f.a) * r * 0.012;
      ctx.save();
      ctx.globalAlpha = 0.96;
      ing(f.id, fx, fy, r * 0.34, f.a);
      ctx.restore();
    }

    /* bubblor när det kokar */
    if (G.fas === 'kokar' || G.fas === 'klar' || G.fas === 'fest') {
      for (var b = 0; b < G.bubblor.length; b++) {
        var bu = G.bubblor[b];
        ctx.save();
        ctx.globalAlpha = 0.55 * bu.liv;
        circ(x + bu.x * r, surfY + bu.y * r * 0.2 - bu.up * r * 0.30, bu.r * r, 'rgba(255,255,255,.85)');
        ctx.restore();
      }
    }

    /* ånga */
    if (G.fas === 'kokar' || G.fas === 'klar') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.62)'; ctx.lineWidth = Math.max(2, r * 0.05); ctx.lineCap = 'round';
      for (var s = 0; s < 3; s++) {
        var sx = x + (s - 1) * r * 0.34;
        ctx.beginPath();
        for (var k = 0; k <= 12; k++) {
          var yy = y - r * 0.45 - k * r * 0.055;
          var xx = sx + Math.sin(t * 2.2 + k * 0.5 + s) * r * 0.075;
          ctx[k ? 'lineTo' : 'moveTo'](xx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* glödring när man drar något över grytan */
    if (G.drag && overPot(G.drag.x, G.drag.y)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(106,168,79,.9)'; ctx.lineWidth = Math.max(3, r * 0.06);
      ell(x, y - r * 0.30, r * 1.06, r * 0.34);
      ctx.stroke();
      ctx.restore();
    }
  }

  function shade(hex, d) {
    if (hex.charAt(0) !== '#') return hex;
    var n = parseInt(hex.slice(1), 16);
    var r = clamp(((n >> 16) & 255) + d, 0, 255);
    var g = clamp(((n >> 8) & 255) + d, 0, 255);
    var b = clamp((n & 255) + d, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ---------------- receptkortet ---------------- */
  function drawRecept(t) {
    var x = L.m, y = clamp(H * 0.008, 4, 10), w = W - 2 * L.m, h = L.topBar - y - 6;
    if (G.fas === 'fest' || G.fas === 'intro') {
      return;
    }
    ctx.save();
    ctx.shadowColor = 'rgba(120,90,55,.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    rr(x, y, w, h, clamp(h * 0.16, 10, 20), COL.cream);
    ctx.restore();

    var rec = SOPPOR[G.ri];
    var pad = clamp(w * 0.014, 6, 14);
    var cw = (w - pad * 4) / 3;

    for (var i = 0; i < 3; i++) {
      var step = rec.ing[i];
      var cx = x + pad + i * (cw + pad);
      var cy = y + pad * 0.8;
      var ch = h - pad * 1.6;
      var done = i < G.steg;
      var cur = i === G.steg && G.fas === 'laga';

      if (cur) {
        rr(cx, cy, cw, ch, clamp(ch * 0.18, 8, 16), '#eef7e4');
        ctx.save();
        ctx.strokeStyle = COL.green; ctx.lineWidth = 3;
        rr(cx, cy, cw, ch, clamp(ch * 0.18, 8, 16));
        ctx.stroke();
        ctx.restore();
      } else {
        rr(cx, cy, cw, ch, clamp(ch * 0.18, 8, 16), done ? '#f1efe8' : COL.cream2);
      }

      ctx.save();
      if (done) ctx.globalAlpha = 0.45;
      var isz = Math.min(cw * 0.58, ch * 0.56);
      ing(step[0], cx + cw / 2, cy + ch * 0.42, isz, 0);
      ctx.restore();

      /* antal som prickar */
      var n = step[1];
      var dr = clamp(ch * 0.070, 3, 8);
      var gap = dr * 2.7;
      var dx0 = cx + cw / 2 - (n - 1) * gap / 2;
      var dy = cy + ch - dr * 2.1;
      for (var p = 0; p < n; p++) {
        var fylld = done || (cur && p < G.lagt);
        circ(dx0 + p * gap, dy, dr, fylld ? (done ? COL.green : '#e08a3c') : 'rgba(120,100,80,.20)');
        if (!fylld) {
          ctx.strokeStyle = 'rgba(120,100,80,.35)'; ctx.lineWidth = 1.6;
          circ(dx0 + p * gap, dy, dr); ctx.stroke();
        }
      }

      if (done) {
        var tickX = cx + cw - dr * 1.9, tickY = cy + dr * 2.1, tr = dr * 1.5;
        circ(tickX, tickY, tr, COL.green);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, tr * 0.34); ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tickX - tr * 0.45, tickY + tr * 0.05);
        ctx.lineTo(tickX - tr * 0.08, tickY + tr * 0.42);
        ctx.lineTo(tickX + tr * 0.48, tickY - tr * 0.38);
        ctx.stroke();
      }
    }
  }

  /* ---------------- bänken med saker ---------------- */
  function drawBank(t) {
    if (G.fas === 'intro' || G.fas === 'kokar' || G.fas === 'klar') return;
    var n = G.kort.length;
    var pl = platser(n);
    L.platser = pl;
    var rec = SOPPOR[Math.min(G.ri, SOPPOR.length - 1)];
    var behov = G.fas === 'laga' && rec ? rec.ing[G.steg][0] : null;
    var visa = G.fel >= 2 && behov;

    for (var i = 0; i < n; i++) {
      var r0 = pl[i];
      var id = G.kort[i];
      var valdKort = G.vald === id && G.fas === 'laga';

      ctx.save();
      ctx.shadowColor = 'rgba(110,72,30,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
      rr(r0.x, r0.y, r0.w, r0.h, clamp(r0.w * 0.16, 8, 18), COL.cream);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = valdKort ? COL.green : 'rgba(150,120,85,.35)';
      ctx.lineWidth = valdKort ? 3 : 1.6;
      rr(r0.x, r0.y, r0.w, r0.h, clamp(r0.w * 0.16, 8, 18));
      ctx.stroke();
      ctx.restore();

      var isz = Math.min(r0.w * 0.62, r0.h * 0.58);
      ing(id, r0.x + r0.w / 2, r0.y + r0.h * 0.42, isz, 0);

      textFit(ING[id].namn, r0.x + r0.w / 2, r0.y + r0.h - Math.max(11, r0.h * 0.11),
        r0.w - 8, clamp(r0.w * 0.15, 9, 15), COL.ink, 700);

      if (visa && id === behov) {
        var pul = 0.5 + 0.5 * Math.sin(t * 4.5);
        ctx.save();
        ctx.strokeStyle = 'rgba(247,201,72,' + (0.45 + 0.45 * pul) + ')';
        ctx.lineWidth = 4 + 3 * pul;
        rr(r0.x - 4, r0.y - 4, r0.w + 8, r0.h + 8, clamp(r0.w * 0.18, 10, 22));
        ctx.stroke();
        ctx.restore();
      }

      G.hits.push({ kind: 'kort', id: id, x: r0.x, y: r0.y, w: r0.w, h: r0.h });
    }
  }

  /* ---------------- skärmar ---------------- */
  function drawIntro(t) {
    var p = L.pot;

    /* Kotten vid bänken */
    var kw = clamp(Math.min(W, H) * 0.19, 56, 130);
    K(W * (L.land ? 0.19 : 0.20), L.tableTop + kw * 0.30, kw);

    drawPot(t);

    /* rubrik */
    var ty = L.topBar * 0.34;
    textFit('Laga soppa', W / 2, ty, W - 2 * L.m, clamp(W * 0.105, 28, 62), COL.ink, 800);
    textFit('Dra sakerna ner i grytan', W / 2, ty + clamp(H * 0.055, 22, 42),
      W - 2 * L.m, clamp(W * 0.036, 13, 24), COL.muted, 700);

    var b = L.start;
    pulsKnapp(b.x, b.y, b.r, t, 'play');
    textFit('BÖRJA', b.x, b.y + b.r + clamp(H * 0.030, 14, 26), 200, clamp(b.r * 0.36, 11, 18), COL.ink, 800);
    G.hits.push({ kind: 'start', x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 });
  }

  function pulsKnapp(x, y, r, t, typ) {
    var s = 1 + 0.035 * Math.sin(t * 6.2);
    ctx.save();
    ctx.shadowColor = 'rgba(80,60,35,.30)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    circ(x, y, r * s, COL.green);
    ctx.restore();
    circ(x, y, r * s * 0.90, COL.greenD);
    ctx.fillStyle = '#fff';
    ctx.save();
    ctx.translate(x, y);
    if (typ === 'play') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.27, -r * 0.36);
      ctx.lineTo(r * 0.40, 0);
      ctx.lineTo(-r * 0.27, r * 0.36);
      ctx.closePath(); ctx.fill();
    } else if (typ === 'right') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.30, -r * 0.34);
      ctx.lineTo(r * 0.34, 0);
      ctx.lineTo(-r * 0.30, r * 0.34);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(-r * 0.40, -r * 0.34, r * 0.13, r * 0.68);
    } else {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.17; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.28, -0.4, Math.PI * 1.55); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.20, -r * 0.42); ctx.lineTo(r * 0.34, -r * 0.10); ctx.lineTo(-r * 0.02, -r * 0.12);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawKokar(t) {
    drawPot(t);
    var kw = clamp(Math.min(W, H) * 0.17, 52, 120);
    K(W * (L.land ? 0.20 : 0.21), L.tableTop + kw * 0.28, kw);
    var y = Math.max(L.topBar * 0.46, 56);
    var w = Math.min(W - 2 * L.m, 360), h = clamp(H * 0.062, 34, 54);
    ctx.save();
    ctx.shadowColor = 'rgba(110,80,45,.20)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    rr(W / 2 - w / 2, y - h / 2, w, h, h / 2, COL.cream);
    ctx.restore();
    textFit('Nu kokar soppan!', W / 2, y, w - 18,
      clamp(w * 0.062, 14, 26), COL.ink, 800);
  }

  function drawKlar(t) {
    drawPot(t);
    var p = L.pot;

    /* skål med soppa vid grytan */
    var rec = SOPPOR[Math.min(G.ri, SOPPOR.length - 1)];
    var bx = L.land ? W * 0.30 : W * 0.27, by = L.tableTop + 4, br = clamp(p.r * 0.42, 22, 54);
    var col = rec ? rec.farg : '#e79a3f';

    var kw = clamp(Math.min(W, H) * 0.17, 52, 118);
    K(L.land ? W * 0.72 : W * 0.72, L.tableTop + kw * 0.28, kw);

    ell(bx, by + br * 0.30, br * 1.25, br * 0.24, 'rgba(120,80,40,.18)');
    ctx.beginPath();
    ctx.moveTo(bx - br, by - br * 0.30);
    ctx.quadraticCurveTo(bx, by + br * 1.05, bx + br, by - br * 0.30);
    ctx.closePath();
    ctx.fillStyle = COL.cream; ctx.fill();
    ell(bx, by - br * 0.30, br, br * 0.34, shade(col, 12));

    /* panel */
    var pw = Math.min(W - 2 * L.m, 520), ph = clamp(H * 0.30, 150, 230);
    var px = W / 2 - pw / 2, py = L.topBar * 0.30;
    ctx.save();
    ctx.shadowColor = 'rgba(90,60,30,.28)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    rr(px, py, pw, ph, 20, COL.cream);
    ctx.restore();

    star(px + pw * 0.5, py + ph * 0.30, clamp(ph * 0.20, 14, 30), COL.star);
    textFit('Soppan är klar!', px + pw / 2, py + ph * 0.62, pw - 30,
      clamp(pw * 0.075, 17, 34), COL.ink, 800);
    textFit('Kotten säger mums', px + pw / 2, py + ph * 0.83, pw - 30,
      clamp(pw * 0.045, 11, 18), COL.muted, 700);

    /* nästa-knapp på bänken framför grytan */
    var nb = L.nasta;
    nb.r = clamp(Math.min(W, H) * 0.095, 34, 64);
    nb.y = L.tableTop + (L.shelfTop - L.tableTop) * 0.50;
    if (nb.y + nb.r > H - 10) nb.y = H - 10 - nb.r;
    pulsKnapp(nb.x, nb.y, nb.r, t, 'right');
    textFit('NÄSTA SOPPA', nb.x, nb.y + nb.r + clamp(H * 0.024, 11, 22), 260,
      clamp(nb.r * 0.30, 10, 15), COL.ink, 800);
    G.hits.push({ kind: 'nasta', x: nb.x - nb.r * 1.2, y: nb.y - nb.r * 1.2, w: nb.r * 2.4, h: nb.r * 2.4 });
  }

  function drawFest(t) {
    drawPot(t);
    var kw = clamp(Math.min(W, H) * 0.15, 46, 108);
    K(L.land ? W * 0.17 : W * 0.18, L.tableTop + kw * 0.26, kw);

    textFit('Laga vad du vill!', W * 0.5, L.topBar * 0.40, W * 0.62,
      clamp(W * 0.058, 18, 36), COL.ink, 800);
    textFit('Tryck på en sak', W * 0.5, L.topBar * 0.40 + clamp(H * 0.05, 20, 32), W * 0.7,
      clamp(W * 0.032, 11, 18), COL.muted, 700);

    var ig = L.igen;
    ctx.save();
    ctx.shadowColor = 'rgba(90,60,30,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    circ(ig.x, ig.y, ig.r, COL.cream);
    ctx.restore();
    pulsKnapp(ig.x, ig.y, ig.r * 0.82, t, 'again');
    G.hits.push({ kind: 'igen', x: ig.x - ig.r * 1.4, y: ig.y - ig.r * 1.4, w: ig.r * 2.8, h: ig.r * 2.8 });
  }

  /* ---------------- huvudritning ---------------- */
  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    G.hits = [];

    var sk = G.skak > 0 ? Math.sin(t * 40) * G.skak * 9 : 0;
    ctx.save();
    ctx.translate(sk, 0);

    drawBg();
    if (G.fas === 'laga') drawRecept(t);
    drawBowlCount();
    drawBank(t);

    if (G.fas === 'intro') drawIntro(t);
    else if (G.fas === 'laga') { drawPot(t); drawKotte(t); drawHint(t); }
    else if (G.fas === 'kokar') drawKokar(t);
    else if (G.fas === 'klar') drawKlar(t);
    else if (G.fas === 'fest') drawFest(t);

    /* stjärnrad uppe till höger, under receptkortet i fest */
    drawStars();

    ctx.restore();

    /* dragen sak följer fingret */
    if (G.drag) {
      var ds = Math.min(L.pot.r * 0.5, 58);
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = 'rgba(80,55,25,.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ing(G.drag.id, G.drag.x, G.drag.y, ds * 2, 0);
      ctx.restore();
    }

    drawGnistor();
  }

  function drawKotte(t) {
    var kw = clamp(Math.min(W, H) * 0.155, 44, 108);
    var x = L.land ? W * 0.115 : W * 0.135;
    K(x, L.tableTop + kw * 0.30, kw);
  }

  function drawHint(t) {
    var p = L.pot;
    if (G.lagt === 0 && G.fel === 0 && G.steg === 0) {
      var y = p.y + p.r * 1.30;
      if (y > L.shelfTop - 22) y = L.shelfTop - 22;
      var w = Math.min(W - 2 * L.m, 330), h = clamp(H * 0.055, 30, 46);
      ctx.save();
      ctx.globalAlpha = 0.9;
      rr(W / 2 - w / 2, y - h / 2, w, h, h / 2, '#fff4e2');
      ctx.restore();
      textFit('Dra en sak till grytan', W / 2, y, w - 16, clamp(h * 0.44, 11, 17), COL.muted, 700);
    }
  }

  function drawBowlCount() {
    /* stjärnorna flyger till hyllan; ritas separat */
  }

  function drawStars() {
    if (G.fas === 'intro' || G.fas === 'klar') return;
    var rec = SOPPOR.length;
    var r = clamp(Math.min(W, H) * 0.018, 7, 13);
    var gap = r * 2.5;
    var y = (G.fas === 'laga' || G.fas === 'kokar' || G.fas === 'klar') ? L.topBar + r * 1.6 : L.m + r * 1.6;
    /* i festen sitter "igen"-knappen uppe till höger: lägg stjärnorna till vänster */
    var x0 = G.fas === 'fest' ? L.m + (rec - 1) * gap + r : W - L.m - r;
    for (var i = 0; i < rec; i++) {
      var x = x0 - (rec - 1 - i) * gap;
      var tagen = (G.fas === 'fest') || i < G.ri || (i === G.ri && G.fas === 'klar');
      if (tagen) star(x, y, r, COL.star);
      else {
        ctx.save();
        ctx.globalAlpha = 0.28;
        star(x, y, r, '#9c8a74');
        ctx.restore();
      }
    }
  }

  function drawGnistor() {
    for (var i = G.gnistor.length - 1; i >= 0; i--) {
      var g = G.gnistor[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, g.liv);
      star(g.x, g.y, g.r * g.liv, COL.star);
      ctx.restore();
    }
  }

  /* ---------------- logik ---------------- */
  function byggKort(behov) {
    var alla = Object.keys(ING).filter(function (k) { return k !== behov; });
    for (var i = alla.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = alla[i]; alla[i] = alla[j]; alla[j] = tmp;
    }
    var kort = [behov, alla[0], alla[1], alla[2]];
    for (var k = kort.length - 1; k > 0; k--) {
      var l = Math.floor(Math.random() * (k + 1));
      var tm = kort[k]; kort[k] = kort[l]; kort[l] = tm;
    }
    return kort;
  }

  function startSpel(franFest) {
    G.timers = []; G.fyll = []; G.gnistor = []; G.bubblor = [];
    G.ri = 0; G.steg = 0; G.lagt = 0; G.fel = 0; G.skak = 0;
    G.vald = null; G.drag = null;
    if (!franFest) { /* samma väg */ }
    startaRunda();
  }

  function startaRunda() {
    G.fas = 'laga';
    G.steg = 0; G.lagt = 0; G.fel = 0; G.fyll = []; G.vald = null; G.drag = null;
    G.skak = 0; G.sagt = 0;
    var rec = SOPPOR[G.ri];
    G.kort = byggKort(rec.ing[0][0]);
    L.platser = platser(G.kort.length);
    say('Nu lagar vi ' + rec.namn.toLowerCase() + '!', true);
    efter(1500, function () {
      if (G.fas !== 'laga') return;
      say(stegText(rec.ing[G.steg][0], rec.ing[G.steg][1]), true);
    });
  }

  function place(id) {
    if (G.fas !== 'laga' && G.fas !== 'fest') return;
    ac();

    if (G.fas === 'fest') {
      if (G.fyll.length >= 14) G.fyll.shift();
      G.fyll.push({ id: id, a: Math.random() * 6.28, d: 0.4 + Math.random() * 0.6 });
      G.festFarg = blend(G.festFarg || '#e5cf9f', ING[id].farg, 0.22);
      plopp();
      G.vald = null;
      if (Math.random() < 0.55) say(ING[id].sing, true);
      return;
    }

    var rec = SOPPOR[G.ri];
    var behov = rec.ing[G.steg];
    if (id !== behov[0]) {
      G.fel++;
      G.skak = 1;
      nej();
      say('Nej, den hör inte i soppan.', true);
      efter(1600, function () {
        if (G.fas !== 'laga') return;
        say(stegText(behov[0], behov[1]), true);
      });
      return;
    }

    G.lagt++;
    G.fyll.push({ id: id, a: Math.random() * 6.28, d: 0.35 + Math.random() * 0.6 });
    plopp();
    G.vald = null;
    say(ORD[Math.min(3, G.lagt)], true);
    if (G.lagt >= behov[1]) {
      efter(750, nastaSteg);
    }
  }

  function nastaSteg() {
    if (G.fas !== 'laga') return;
    var rec = SOPPOR[G.ri];
    G.steg++;
    G.lagt = 0;
    G.fel = 0;
    if (G.steg >= rec.ing.length) { koka(); return; }
    var behov = rec.ing[G.steg];
    G.kort = byggKort(behov[0]);
    L.platser = platser(G.kort.length);
    say(stegText(behov[0], behov[1]), true);
  }

  function koka() {
    G.fas = 'kokar';
    G.kokT = 0;
    G.bubblor = [];
    for (var i = 0; i < 14; i++) {
      G.bubblor.push({ x: (Math.random() * 2 - 1) * 0.7, y: (Math.random() * 2 - 1), up: Math.random(), r: 0.03 + Math.random() * 0.05, liv: 1 });
    }
    say('Nu kokar soppan!', true);
    efter(2800, function () {
      if (G.fas !== 'kokar') return;
      G.fas = 'klar';
      G.klarT = 0;
      fanfar();
      for (var k = 0; k < 10; k++) {
        G.gnistor.push({
          x: L.pot.x + (Math.random() * 2 - 1) * L.pot.r, y: L.pot.y,
          r: 6 + Math.random() * 8, vx: (Math.random() * 2 - 1) * 60, vy: -120 - Math.random() * 90,
          liv: 1
        });
      }
      say('Soppan är klar! Bra jobbat!', true);
    });
  }

  function nastaRecept() {
    G.ri++;
    G.gnistor = [];
    if (G.ri >= SOPPOR.length) fest();
    else startaRunda();
  }

  function fest() {
    G.fas = 'fest';
    G.timers = [];
    G.fyll = [];
    G.festFarg = '#e5cf9f';
    G.kort = Object.keys(ING);
    L.platser = platser(G.kort.length);
    G.bubblor = [];
    for (var i = 0; i < 10; i++) {
      G.bubblor.push({ x: (Math.random() * 2 - 1) * 0.7, y: (Math.random() * 2 - 1), up: Math.random(), r: 0.03 + Math.random() * 0.04, liv: 1 });
    }
    fanfar();
    say('Nu får du laga vad du vill!', true);
  }

  function blend(a, b, k) {
    function p(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    var A = p(a), B = p(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' +
      Math.round(A[1] + (B[1] - A[1]) * k) + ',' +
      Math.round(A[2] + (B[2] - A[2]) * k) + ')';
  }

  function overPot(x, y) {
    var p = L.pot;
    var dx = (x - p.x) / (p.r * 1.35);
    var dy = (y - (p.y - p.r * 0.10)) / (p.r * 1.45);
    return dx * dx + dy * dy < 1;
  }

  function update(dt) {
    G.tid += dt;
    if (G.skak > 0) G.skak = Math.max(0, G.skak - dt * 2.0);

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
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt; s.liv -= dt * 0.55;
      if (s.liv <= 0) G.gnistor.splice(g, 1);
    }

    if (G.fas === 'kokar' || G.fas === 'klar' || G.fas === 'fest') {
      for (var b = 0; b < G.bubblor.length; b++) {
        var bu = G.bubblor[b];
        bu.up += dt * (0.6 + bu.r * 6);
        if (bu.up > 1) {
          bu.up = 0;
          bu.x = (Math.random() * 2 - 1) * 0.7;
          bu.y = (Math.random() * 2 - 1);
          if (G.fas !== 'klar' && Math.random() < 0.25) bubbla();
        }
        bu.liv = 1 - bu.up;
      }
    }

    if (G.fas === 'kokar') G.kokT += dt;

    /* påminnelse */
    if (G.fas === 'laga' && G.sagt < 1 && G.tid > 14 && G.lagt === 0) {
      G.sagt = 1;
      var rec = SOPPOR[G.ri], behov = rec.ing[G.steg];
      say(stegText(behov[0], behov[1]), true);
    }
    if (G.fas === 'laga') G.sagt = 0;
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

  /* ---------------- pek ---------------- */
  function pos_(e) {
    var b = cv.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  function iRekt(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    ac();
    var p = pos_(e);
    G.over = false;

    for (var i = G.hits.length - 1; i >= 0; i--) {
      var h = G.hits[i];
      var traff = false;
      if (h.kind === 'start' || h.kind === 'nasta' || h.kind === 'igen') {
        traff = iRekt(p, h);
      } else if (h.kind === 'kort') {
        traff = iRekt(p, { x: h.x - 3, y: h.y - 3, w: h.w + 6, h: h.h + 6 });
      }
      if (!traff) continue;

      if (h.kind === 'start') { startSpel(false); return; }
      if (h.kind === 'nasta') { nastaRecept(); return; }
      if (h.kind === 'igen') { startSpel(false); return; }
      if (h.kind === 'kort') {
        G.drag = { id: h.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
        G.vald = h.id;
        G.over = true;
        return;
      }
    }

    /* tryck i grytan: lägg den valda saken */
    if (overPot(p.x, p.y) && G.vald) {
      var v = G.vald;
      G.vald = null;
      place(v);
      return;
    }
    G.vald = null;
  }, { passive: false });

  cv.addEventListener('pointermove', function (e) {
    if (!G.drag) return;
    var p = pos_(e);
    if (!G.drag.moved && Math.hypot(p.x - G.drag.sx, p.y - G.drag.sy) > 8) G.drag.moved = true;
    G.drag.x = p.x; G.drag.y = p.y;
  }, { passive: false });

  cv.addEventListener('pointerup', function (e) {
    if (!G.drag) return;
    var d = G.drag;
    var p = pos_(e);
    G.drag = null;
    if (overPot(p.x, p.y)) {
      place(d.id);
    } else if (!d.moved) {
      /* ett tryck på kortet lägger saken direkt */
      place(d.id);
    } else {
      G.vald = null;
    }
  }, { passive: false });

  cv.addEventListener('pointercancel', function () { G.drag = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  /* ---------------- testkrok ---------------- */
  window.__ls = {
    state: function () {
      var rec = SOPPOR[Math.min(G.ri, SOPPOR.length - 1)];
      var behov = rec && G.steg < rec.ing.length ? rec.ing[G.steg] : null;
      return {
        fas: G.fas, ri: G.ri, steg: G.steg, lagt: G.lagt,
        behov: behov ? { id: behov[0], n: behov[1] } : null,
        kort: G.kort.slice(), fyll: G.fyll.length, fel: G.fel,
        timers: G.timers.length, W: W, H: H, land: L.land,
        pot: { x: Math.round(L.pot.x), y: Math.round(L.pot.y), r: Math.round(L.pot.r) },
        start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
        platser: platser(G.kort.length || 4).map(function (r) {
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
        }),
        errs: errs.length
      };
    },
    recept: function () { return SOPPOR.map(function (s) { return s.namn + ': ' + s.ing.map(function (x) { return x[0] + ' ' + x[1]; }).join(', '); }); },
    start: function () { startSpel(false); return this.state(); },
    tap: function (id) { place(id); return this.state(); },
    spola: function (ms) {
      var kvar = ms / 1000;
      var steg = 0;
      while (kvar > 0 && steg++ < 400) {
        var d = Math.min(kvar, 0.05);
        kvar -= d;
        G.tid += d;
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
    nasta: function () { nastaRecept(); return this.state(); },
    fest: function () { fest(); return this.state(); },
    errs: function () { return errs.slice(); },
    rita: function () { try { draw(nu); } catch (e) { errs.push(String(e)); } return errs.length; }
  };

  layout();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();