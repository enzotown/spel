/* Längdraden — fem pinnar ska stå i rad, kortast först.
 *
 * Pinnarna står huller om buller på sågbänken. Barnet drar ( eller trycker )
 * en pinneupp till raden med fem streckade platser. Alla pinnar vilar på samma
 * underkant, så det är topparna som avgör — och när raden stämmer ritas en
 * trappa ovanför som visar hur mycket längre varje pinne är.
 *
 * Ingen förlust: en rad som inte stämmer lämnar tillbaka bara de pinnar som
 * ligger fel, och efter två försök lyser den kortaste pinnen. Båda riktningarna
 * godtas (kortast först eller längst först) — trappan följer med.
 *
 * Seriell ordning (seriation), nästa steg efter Hitta längden: där jämfördes en
 * sak mot ett mått, här måste flera saker ordnas mot varandra.
 */

(function () {
  'use strict';

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var errs = [];
  window.__errs = errs;

  var COL = {
    wall1: '#eef4e4', wall2: '#d8e7c8',
    cream: '#fffaf3', ink: '#3f4a3a', muted: '#7c8774',
    wood: '#d0955a', woodD: '#a86f2f', woodL: '#eec08c', woodPale: '#f6dcba',
    green: '#6aa84f', greenD: '#4c8039',
    star: '#f7c948', starD: '#dfa616',
    red: '#d9584f'
  };

  /* ---------------- innehåll ---------------- */

  /* Fyra rundor med olika längder (i enheter). Första rundan har stora steg,
     sista har ojämna steg så att barnet måste jämföra i stället för att gissa. */
  var RUNDOR = [
    { len: [2, 3, 4, 5, 6] },
    { len: [1.6, 2.2, 2.8, 3.4, 4.0] },
    { len: [1.2, 1.5, 1.8, 2.1, 2.4] },
    { len: [1.5, 2.1, 2.4, 3.4, 4.6] }
  ];

  var TRA = [
    { ljus: '#e7b878', mork: '#b07a45' },
    { ljus: '#dcae72', mork: '#a06c39' },
    { ljus: '#efc793', mork: '#bd8853' },
    { ljus: '#d7a469', mork: '#98652f' },
    { ljus: '#e4b581', mork: '#ac7742' }
  ];

  var ORD = ['', 'ett', 'två', 'tre', 'fyra', 'fem'];

  /* ---------------- tillstånd ---------------- */

  var W = 0, H = 0, DPR = 1, nu = 0;

  var L = {
    m: 16, s: 1, qY: 0,
    rowTop: 0, rowBase: 0, trayTop: 0, trayBase: 0, maxH: 200, u: 40,
    slotW: 100, slotX: [], th: 30,
    start: null, igen: null
  };

  var G = {
    fas: 'intro', ri: 0, pins: [], slot: [null, null, null, null, null],
    sel: null, drag: null, forsok: 0, glow: 0, stjarnor: 0,
    tid: 0, saidT: -1, trapp: 0, asc: true,
    timers: [], gnistor: [], trayHits: [], slotHits: []
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
  function lyft() { tone(430, 0.10, 0.08, 'sine', 680); }
  function plats() { tone(300, 0.09, 0.07, 'triangle', 240); }
  function pling() { tone(660, 0.10, 0.08, 'triangle'); setTimeout(function () { tone(990, 0.14, 0.06, 'triangle'); }, 95); }
  function nej() { tone(230, 0.16, 0.055, 'triangle', 175); }
  function trappTon(i) { tone(392 + i * 74, 0.16, 0.07, 'triangle'); }
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

    var s = clamp(Math.min(W, H) / 768, 0.62, 1.35);
    var m = clamp(Math.min(W, H) * 0.030, 10, 26);
    var starR = clamp(9 * s, 6, 12);
    var qY = m + starR * 2 + 12 * s;

    var padBot = clamp(H * 0.035, 12, 36);
    var roomTop = qY + clamp(42 * s, 30, 60);
    var gapTray = clamp(34 * s, 20, 56);

    var maxH = Math.min((H - padBot - roomTop - gapTray) / 2, H * 0.40);
    maxH = Math.max(90, maxH);

    var slotW = (W - 2 * m) / 5;
    var th = clamp(slotW * 0.20, 12, 44);

    L.s = s; L.m = m; L.qY = qY;
    L.maxH = maxH; L.slotW = slotW; L.th = th;
    L.slotX = [0, 1, 2, 3, 4].map(function (i) { return m + i * slotW; });
    L.rowTop = roomTop;
    L.rowBase = roomTop + maxH;
    L.trayTop = L.rowBase + gapTray;
    L.trayBase = L.trayTop + maxH;

    var br = clamp(Math.min(W, H) * 0.10, 34, 66);
    L.start = { x: W / 2, y: H - clamp(H * 0.15, 60, 120), r: br };
    L.igen = { x: W / 2, y: H - br * 0.72 - 26 * s, r: br * 0.72 };

    uScale();
    raknaHits();
  }

  function maxLen() {
    var r = RUNDOR[G.ri] || RUNDOR[0], mx = 0;
    r.len.forEach(function (v) { if (v > mx) mx = v; });
    return mx;
  }
  function uScale() { L.u = L.maxH / maxLen(); }

  /* träffytor räknas ur tillståndet, inte bara när bilden ritas — då fungerar
     ett tryck även om en bildruta skulle ha hoppats över (iPad i bakgrunden) */
  function raknaHits() {
    var s = L.s;
    G.slotHits = [0, 1, 2, 3, 4].map(function (i) {
      return { i: i, x: L.slotX[i], y: L.rowTop - 14 * s, w: L.slotW, h: L.maxH + 34 * s };
    });
    G.trayHits = [];
    G.pins.forEach(function (p) {
      if (slotOf(p.id) >= 0) return;
      var cx = trayCx(p), len = pinLen(p);
      var hw = Math.max(L.th * 1.6, Math.min(L.slotW * 0.46, 46 * s));
      G.trayHits.push({ id: p.id, cx: cx, len: len, x: cx - hw, y: L.trayBase - len - 8, w: hw * 2, h: len + 14 });
    });
  }
  function pinLen(p) { return p.len * L.u; }
  function slotCx(i) { return L.slotX[i] + L.slotW / 2; }

  function pinById(id) {
    for (var i = 0; i < G.pins.length; i++) if (G.pins[i].id === id) return G.pins[i];
    return null;
  }
  function slotOf(id) { return G.slot.indexOf(id); }

  /* lediga platser i lådan (en pinne per plats) */
  function friaLada(utomId) {
    var tken = {};
    G.pins.forEach(function (q) {
      if (q.id !== utomId && slotOf(q.id) < 0) tken[q.tray] = 1;
    });
    return [0, 1, 2, 3, 4].filter(function (n) { return !tken[n]; });
  }

  /* positionen en pinne ritas på (null om den inte hör hemma någonstans) */
  function pinPos(p) {
    if (G.drag && G.drag.id === p.id) return { cx: G.drag.x, base: G.drag.y, lyft: true };
    var si = slotOf(p.id);
    if (si >= 0) {
      var lift = (G.sel === p.id) ? L.s * 6 : 0;
      return { cx: slotCx(si), base: L.rowBase - lift, lyft: false };
    }
    var lift2 = (G.sel === p.id) ? L.s * 8 : 0;
    return { cx: trayCx(p), base: L.trayBase - lift2, lyft: false };
  }
  function trayIdx(p) { return p.tray; }
  function trayCx(p) {
    var i = (p.tray === undefined || p.tray < 0) ? 0 : p.tray;
    return L.slotX[i] + L.slotW / 2;
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

  function bakgrund() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.wall1);
    g.addColorStop(1, COL.wall2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    /* sol uppe till höger, liten och i HUD-bandet */
    var rs = clamp(Math.min(W, H) * 0.030, 10, 22);
    ctx.globalAlpha = 0.45;
    circ(W - L.m - rs, L.m + rs, rs, '#ffe28a');
    ctx.globalAlpha = 1;
  }

  function stjarnrad() {
    var s = L.s;
    var r = clamp(9 * s, 6, 12);
    var gapx = r * 2.9;
    for (var i = 0; i < 4; i++) {
      var x = L.m + r + i * gapx, y = L.m + r;
      star(x, y, r, i < G.stjarnor ? COL.star : 'rgba(255,250,243,.75)', i < G.stjarnor ? COL.starD : 'rgba(140,130,110,.35)');
    }
  }

  function fragaRad() {
    var s = L.s;
    var text = G.fas === 'fest' ? 'Tryck på en pinne och hör hur den är.' : 'Pinnarna ska stå i rad — kortast först.';
    txt(text, W / 2, L.qY + 12 * s, clamp(19 * s, 13, 26), COL.ink, 'center', 800, W - 2 * L.m);
  }

  /* ---------------- pinnarna ---------------- */

  function drawPin(cx, base, len, th, opt) {
    opt = opt || {};
    var top = base - len;
    var ljus = opt.ljus || TRA[0].ljus, mork = opt.mork || TRA[0].mork;

    /* skugga på underlaget */
    ctx.save();
    ctx.fillStyle = 'rgba(80,70,50,.15)';
    ctx.beginPath();
    ctx.ellipse(cx, base + Math.max(1, th * 0.10), th * 1.05, Math.max(2, th * 0.24), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (opt.glow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(opt.glow * 5);
      circ(cx, top + len * 0.4, len * 0.42 + th, '#f7c948');
      ctx.restore();
    }

    /* stammen: rak med rundad topp */
    var gr = ctx.createLinearGradient(cx - th / 2, 0, cx + th / 2, 0);
    gr.addColorStop(0, mork);
    gr.addColorStop(0.30, ljus);
    gr.addColorStop(0.72, ljus);
    gr.addColorStop(1, mork);
    ctx.fillStyle = gr;
    rr(cx - th / 2, top + th * 0.45, th, len - th * 0.45, th * 0.30, gr);
    circ(cx, top + th * 0.48, th * 0.5, ljus);
    /* toppen lite ljusare, som en nyklippt yta */
    ctx.globalAlpha = 0.55;
    circ(cx, top + th * 0.45, th * 0.34, '#f6dcba');
    ctx.globalAlpha = 1;

    /* bark: ett par korta streck och en kvist */
    ctx.save();
    ctx.strokeStyle = 'rgba(110,70,35,.22)';
    ctx.lineWidth = Math.max(1, th * 0.07);
    var k1 = top + len * 0.30, k2 = top + len * 0.62;
    ctx.beginPath();
    ctx.moveTo(cx - th * 0.22, k1); ctx.lineTo(cx - th * 0.02, k1);
    ctx.moveTo(cx + th * 0.05, k2); ctx.lineTo(cx + th * 0.24, k2);
    ctx.stroke();
    ctx.restore();

    /* foten: en mörk ring där pinnen möter underlaget */
    ctx.save();
    ctx.globalAlpha = 0.35;
    rr(cx - th / 2, base - th * 0.16, th, th * 0.16, th * 0.08, mork);
    ctx.restore();

    /* lyft markering */
    if (opt.sel) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = COL.green;
      ctx.lineWidth = Math.max(2, th * 0.10);
      ctx.setLineDash([th * 0.5, th * 0.4]);
      rr(cx - th * 1.1, top - th * 0.5, th * 2.2, len + th * 0.8, th * 0.5, null);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRow() {
    var s = L.s;
    /* mätbrädan under raden */
    ctx.fillStyle = 'rgba(255,250,243,.72)';
    rr(L.m * 0.5, L.rowTop - 10 * s, W - L.m, L.maxH + 26 * s, 16 * s, 'rgba(255,250,243,.72)');

    /* streckade platser */
    G.slotHits = [];
    for (var i = 0; i < 5; i++) {
      var cx = slotCx(i);
      ctx.save();
      ctx.setLineDash([8 * s, 7 * s]);
      ctx.strokeStyle = 'rgba(124,135,116,.55)';
      ctx.lineWidth = Math.max(1.6, 2.2 * s);
      ctx.beginPath();
      ctx.moveTo(cx, L.rowTop + 4 * s);
      ctx.lineTo(cx, L.rowBase - 4 * s);
      ctx.stroke();
      ctx.restore();
      G.slotHits.push({ i: i, x: L.slotX[i], y: L.rowTop - 14 * s, w: L.slotW, h: L.maxH + 34 * s });
    }

    /* den gemensamma startlinjen — radens underkant */
    ctx.save();
    ctx.strokeStyle = COL.greenD;
    ctx.lineWidth = Math.max(3, 4 * s);
    ctx.beginPath();
    ctx.moveTo(L.m - 6 * s, L.rowBase);
    ctx.lineTo(W - L.m + 6 * s, L.rowBase);
    ctx.stroke();
    ctx.restore();
    /* en liten pil som säger "kortast hit" */
    var ax = L.m - 4 * s, ay = L.rowBase + 16 * s;
    ctx.save();
    ctx.globalAlpha = G.fas === 'spel' && G.slot[0] === null ? 0.85 : 0.4;
    ctx.fillStyle = COL.greenD;
    ctx.beginPath();
    ctx.moveTo(ax + 26 * s, ay); ctx.lineTo(ax, ay - 8 * s); ctx.lineTo(ax, ay + 8 * s);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawTray() {
    var s = L.s;
    /* sågbänken */
    ctx.fillStyle = COL.woodD;
    rr(L.m * 0.4, L.trayBase + 2, W - L.m * 0.8, clamp(12 * s, 8, 18), 4, COL.woodD);
    ctx.fillStyle = COL.wood;
    rr(L.m * 0.4, L.trayBase - 4 * s, W - L.m * 0.8, clamp(12 * s, 8, 18), 4, COL.wood);
    ctx.fillStyle = COL.woodL;
    ctx.fillRect(L.m * 0.4, L.trayBase - 4 * s, W - L.m * 0.8, Math.max(2, 3 * s));
  }

  function dragHit() {
    if (!G.drag) return null;
    var el = cv.getBoundingClientRect();
    return { x: G.drag.x + el.left, y: G.drag.y + el.top };
  }

  /* ---------------- skärmar ---------------- */

  function drawIntro() {
    var s = L.s;
    txt('Längdraden', W / 2, H * 0.11, clamp(36 * s, 22, 46), COL.ink, 'center', 900, W - 40);
    txt('Fem pinnar. Lägg dem i rad — kortast först.', W / 2, H * 0.11 + 34 * s, clamp(17 * s, 12, 22), COL.muted, 'center', 700, W * 0.88);

    /* en färdig trappa av fem pinnar som rullar in i intro */
    var maxH = Math.min(H * 0.30, 260);
    var u = maxH / 5.2;
    var bw = clamp(Math.min(W * 0.055, 56), 16, 44);
    var startX = W / 2 - (5 * (bw + bw * 0.45)) / 2;
    var base = H * 0.10 + maxH + 76 * s;
    for (var i = 0; i < 5; i++) {
      var len = (1 + i) * u * 0.92;
      drawPin(startX + i * (bw + bw * 0.45) + bw / 2, base, len, bw, TRA[i]);
    }
    ctx.save();
    ctx.strokeStyle = COL.greenD;
    ctx.lineWidth = Math.max(3, 4 * s);
    ctx.beginPath();
    ctx.moveTo(L.m * 0.9, base);
    ctx.lineTo(W - L.m * 0.9, base);
    ctx.stroke();
    ctx.restore();

    var kh = Math.min(H * 0.22, 190);
    var kx = W * (W < H ? 0.22 : 0.17), ky = H - clamp(H * 0.02, 6, 18);
    ctx.fillStyle = 'rgba(80,70,50,.14)';
    ctx.beginPath();
    ctx.ellipse(kx, ky + 2, kh * 0.22, kh * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    try { window.KOTTEN.drawAtFeet(ctx, kx, ky, kh * 0.60, { wave: true }); } catch (e) { errs.push('kotten: ' + e); }

    var kn = L.start;
    if (W < H) kn.x = W * 0.63;
    drawVidare(kn, 'play');
    txt('Spela', kn.x, kn.y + kn.r + 16 * s, clamp(15 * s, 11, 19), COL.ink, 'center', 800);
  }

  function drawSpel() {
    drawRow();
    drawTray();

    /* trappan ovanför topparna, när raden stämmer */
    if (G.trapp > 0) drawTrappa();

    /* placerade pinnar först, sedan de i lådan, sist den som dras */
    var i, p, pos;
    for (i = 0; i < G.pins.length; i++) {
      p = G.pins[i];
      if (G.drag && G.drag.id === p.id) continue;
      if (slotOf(p.id) < 0) continue;
      pos = pinPos(p);
      drawPin(pos.cx, pos.base, pinLen(p), L.th, {
        ljus: p.ljus, mork: p.mork, sel: G.sel === p.id,
        glow: (G.glow > 0 && p.id === G.glowId) ? G.tid : 0
      });
    }
    G.trayHits = [];
    for (i = 0; i < G.pins.length; i++) {
      p = G.pins[i];
      if (slotOf(p.id) >= 0) continue;
      if (G.drag && G.drag.id === p.id) continue;
      pos = pinPos(p);
      drawPin(pos.cx, pos.base, pinLen(p), L.th, {
        ljus: p.ljus, mork: p.mork, sel: G.sel === p.id,
        glow: (G.glow > 0 && p.id === G.glowId) ? G.tid : 0
      });
      var hw = Math.max(L.th * 1.6, Math.min(L.slotW * 0.46, 46 * L.s));
      G.trayHits.push({
        id: p.id, cx: pos.cx, len: pinLen(p),
        x: pos.cx - hw, y: L.trayBase - pinLen(p) - 8, w: hw * 2, h: pinLen(p) + 14
      });
    }
    if (G.drag) {
      p = pinById(G.drag.id);
      if (p) drawPin(G.drag.x, G.drag.y, pinLen(p), L.th, { ljus: p.ljus, mork: p.mork });
    }

    /* hjälprad om barnet dröjer */
    if (G.fas === 'spel' && G.hint) {
      txt(G.hint, W / 2, L.rowBase + 22 * L.s, clamp(13 * L.s, 10, 16), COL.muted, 'center', 700, W - 2 * L.m);
    }

    /* stjärnfest */
    for (var g = 0; g < G.gnistor.length; g++) {
      var q = G.gnistor[g];
      ctx.globalAlpha = Math.max(0, q.liv);
      star(q.x, q.y, q.r, q.farg, null);
      ctx.globalAlpha = 1;
    }
  }

  function drawTrappa() {
    var s = L.s, t = G.trapp;
    var pts = [], i;
    for (i = 0; i < 5; i++) {
      var id = G.slot[i];
      var p = id ? pinById(id) : null;
      if (!p) return;
      pts.push({ x: slotCx(i), y: L.rowBase - pinLen(p), half: L.slotW * 0.5 - 1 });
    }
    var prog = t * 5, sist = 0;
    /* trappans överkant, steg för steg; börjar med moveTo */
    function kant() {
      var x0 = pts[0].x - pts[0].half;
      ctx.beginPath();
      ctx.moveTo(x0, pts[0].y);
      sist = x0;
      for (var k = 0; k < 5; k++) {
        var a = Math.max(0, Math.min(1, prog - k));
        if (a <= 0) break;
        var x1 = pts[k].x - pts[k].half, x2 = pts[k].x + pts[k].half;
        var x = x1 + (x2 - x1) * a;
        ctx.lineTo(x, pts[k].y);
        sist = x;
        if (a >= 1 && k < 4) ctx.lineTo(x2, pts[k + 1].y);
      }
    }
    ctx.save();
    /* den fyllda trappan: överkanten och rakt ner till startlinjen */
    kant();
    ctx.lineTo(sist, L.rowBase);
    ctx.lineTo(pts[0].x - pts[0].half, L.rowBase);
    ctx.closePath();
    ctx.fillStyle = 'rgba(106,168,79,.20)';
    ctx.fill();
    /* själva trappsteget som en linje */
    kant();
    ctx.strokeStyle = COL.greenD;
    ctx.lineWidth = Math.max(2.5, 3.5 * s);
    ctx.lineJoin = 'round';
    ctx.stroke();
    /* en prick på varje topp */
    for (i = 0; i < 5; i++) {
      var a2 = Math.max(0, Math.min(1, prog - i));
      if (a2 <= 0) break;
      circ(pts[i].x, pts[i].y, Math.max(3, 4 * s) * a2, '#fffaf3');
      ctx.strokeStyle = COL.greenD;
      ctx.lineWidth = Math.max(1.5, 2 * s);
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, Math.max(3, 4 * s) * a2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVidare(kn, typ) {
    var r = kn.r;
    var puls = 1 + 0.035 * Math.sin(nu * 6.2);
    ctx.save();
    ctx.globalAlpha = 0.18;
    circ(kn.x, kn.y + r * 0.22, r * 1.10 * puls, '#3f4a3a');
    ctx.restore();
    ctx.fillStyle = COL.green;
    circ(kn.x, kn.y, r * puls, COL.green);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    circ(kn.x, kn.y - r * 0.3, r * 0.72, 'rgba(255,255,255,.22)');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    if (typ === 'play') {
      ctx.moveTo(kn.x - r * 0.26, kn.y - r * 0.42);
      ctx.lineTo(kn.x + r * 0.46, kn.y);
      ctx.lineTo(kn.x - r * 0.26, kn.y + r * 0.42);
    } else {
      /* cirkelpil = igen */
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

  function drawFest() {
    var s = L.s;
    drawRow();
    if (ordning() !== 0) drawTrappa();
    var i, p, pos;
    for (i = 0; i < G.pins.length; i++) {
      p = G.pins[i];
      if (G.drag && G.drag.id === p.id) continue;
      pos = pinPos(p);
      if (slotOf(p.id) < 0) continue;
      drawPin(pos.cx, pos.base, pinLen(p), L.th, { ljus: p.ljus, mork: p.mork, sel: G.sel === p.id });
    }
    G.trayHits = [];
    for (i = 0; i < G.pins.length; i++) {
      p = G.pins[i];
      if (slotOf(p.id) >= 0) continue;
      if (G.drag && G.drag.id === p.id) continue;
      pos = pinPos(p);
      drawPin(pos.cx, pos.base, pinLen(p), L.th, { ljus: p.ljus, mork: p.mork, sel: G.sel === p.id });
      var hw = Math.max(L.th * 1.6, Math.min(L.slotW * 0.46, 46 * s));
      G.trayHits.push({
        id: p.id, cx: pos.cx,
        x: pos.cx - hw, y: L.trayBase - pinLen(p) - 8, w: hw * 2, h: pinLen(p) + 14
      });
    }
    if (G.drag) {
      p = pinById(G.drag.id);
      if (p) drawPin(G.drag.x, G.drag.y, pinLen(p), L.th, { ljus: p.ljus, mork: p.mork });
    }
    drawVidare(L.igen, 'igen');
    txt('Lek igen', L.igen.x, L.igen.y + L.igen.r + 14 * s, clamp(14 * s, 10, 18), COL.ink, 'center', 800);
  }

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    bakgrund();
    if (G.fas === 'intro') { stjarnrad(); drawIntro(); return; }
    stjarnrad();
    fragaRad();
    if (G.fas === 'fest') { drawFest(); return; }
    drawSpel();
  }

  /* ---------------- spel ---------------- */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function nyRunda() {
    var r = RUNDOR[G.ri] || RUNDOR[0];
    G.pins = r.len.map(function (len, i) {
      return { id: 'p' + i, len: len, tray: 0, ljus: TRA[i].ljus, mork: TRA[i].mork };
    });
    var ord = shuffle([0, 1, 2, 3, 4]);
    G.pins.forEach(function (p, i) { p.tray = ord[i]; });
    G.slot = [null, null, null, null, null];
    G.sel = null; G.drag = null;
    G.forsok = 0; G.glow = 0; G.glowId = null;
    G.trapp = 0; G.tid = 0; G.saidT = -1; G.hint = '';
    uScale();
  }

  function startSpel() {
    G.fas = 'spel'; G.ri = 0; G.stjarnor = 0;
    nyRunda();
    layout();
    say('Lägg pinnarna i rad. Den kortaste först.', true);
  }

  function nasta() {
    if (G.fas !== 'klar') return;
    G.ri++;
    if (G.ri >= RUNDOR.length) {
      G.ri = RUNDOR.length - 1;
      G.fas = 'fest';
      nyRunda();
      /* alla pinnar i raden, i rätt ordning, så festen börjar färdig */
      G.pins.slice().sort(function (a, b) { return a.len - b.len; }).forEach(function (p, i) { G.slot[i] = p.id; p.tray = -1; });
      G.trapp = 1;   /* trappan står kvar i festen */
      layout();
      fanfar();
      burst(W / 2, H * 0.35, 26);
      say('Alla pinnar i rad! Bra jobbat!', true);
      efter(2800, function () {
        if (G.fas === 'fest') say('Tryck på en pinne och hör hur den är.');
      });
      return;
    }
    G.fas = 'spel';
    nyRunda();
    layout();
    say('Lägg pinnarna i rad. Den kortaste först.', true);
  }

  /* har raden rätt ordning? returnerar 1 = stigande, -1 = fallande, 0 = nej */
  function ordning() {
    var l = [];
    for (var i = 0; i < 5; i++) {
      var p = G.slot[i] ? pinById(G.slot[i]) : null;
      if (!p) return 0;
      l.push(p.len);
    }
    var asc = true, desc = true;
    for (var k = 1; k < 5; k++) {
      if (!(l[k] > l[k - 1])) asc = false;
      if (!(l[k] < l[k - 1])) desc = false;
    }
    if (asc) return 1;
    if (desc) return -1;
    return 0;
  }

  function kontroll() {
    var o = ordning();
    if (o !== 0) return klar(o === 1);
    G.forsok++;
    nej();
    var riktning = 1; /* vilket håll barnet är närmast: räkna rätt platser */
    var sorterad = G.pins.slice().sort(function (a, b) { return a.len - b.len; });
    var rattUpp = 0, rattNer = 0;
    for (var i = 0; i < 5; i++) {
      if (G.slot[i] === sorterad[i].id) rattUpp++;
      if (G.slot[i] === sorterad[4 - i].id) rattNer++;
    }
    if (rattNer > rattUpp) riktning = -1;

    /* bara de pinnar som ligger fel flyttas tillbaka — resten står kvar */
    var kvar = [];
    for (var k = 0; k < 5; k++) {
      var p = pinById(G.slot[k]);
      var ska = riktning === 1 ? sorterad[k] : sorterad[4 - k];
      if (!p || p.id !== ska.id) { kvar.push(p); }
    }
    kvar.forEach(function (q) { if (!q) return; var s = slotOf(q.id); if (s >= 0) G.slot[s] = null; });
    kvar.forEach(function (q) {
      if (!q) return;
      var ledig = friaLada(q.id);
      if (ledig.length) q.tray = ledig[0];
    });
    G.sel = null; G.drag = null;
    say('Nästan! Titta på topparna igen.', true);
    G.hint = 'Bara de som låg fel hoppade tillbaka.';
    efter(1600, function () { G.hint = ''; });
    if (G.forsok >= 2) {
      var kortast = null;
      for (var n = 0; n < G.pins.length; n++) {
        var q = G.pins[n];
        if (slotOf(q.id) >= 0) continue;
        if (!kortast || q.len < kortast.len) kortast = q;
      }
      if (kortast) {
        G.glow = 1; G.glowId = kortast.id;
        efter(1200, function () { say('Börja med den kortaste pinnen.', true); });
      }
    }
  }

  function klar(asc) {
    G.fas = 'klar';
    G.asc = asc;
    G.trapp = 0;
    G.stjarnor = Math.min(4, G.stjarnor + 1);
    pling();
    burst(W / 2, L.rowBase - L.maxH * 0.4, 16);
    say('Nu blir det en trappa!', true);
    efter(1450, function () {
      if (G.fas === 'klar' || G.fas === 'fest') say(asc ? 'Precis! Kortast först, längst sist!' : 'Precis! Längst först, kortast sist!', true);
    });
    /* trappan byggs steg för steg med ett litet ljud per steg */
    for (var i = 0; i < 5; i++) {
      (function (k) {
        setTimeout(function () { if (G.fas === 'klar' || G.fas === 'fest') trappTon(k); }, k * 150);
      })(i);
    }
    efter(2900, function () { if (G.fas === 'klar') nasta(); });
  }

  /* i festen: säg hur pinnen är jämfört med de andra */
  function sagoOrd(id) {
    var p = pinById(id);
    if (!p) return;
    var sorterad = G.pins.slice().sort(function (a, b) { return a.len - b.len; });
    var rank = sorterad.indexOf(p);
    var fras = ['Kortast.', 'Näst kortast.', 'I mitten.', 'Näst längst.', 'Längst.'][rank] || '';
    pet();
    if (fras) say(fras, true);
  }

  function placera(id, i) {
    var p = pinById(id);
    if (!p) return;
    var gammal = slotOf(id);
    /* platsen är tagen: den som står där flyttar — i festen till ledig plats,
       annars tillbaka till lådan */
    var upptagen = G.slot[i];
    if (upptagen && upptagen !== id) {
      var q = pinById(upptagen);
      if (q && G.fas === 'fest' && gammal >= 0) {
        G.slot[gammal] = q.id;
      } else if (q) {
        var ledig = friaLada(q.id);
        if (ledig.length) q.tray = ledig[0];
      }
    }
    if (gammal >= 0) G.slot[gammal] = null;
    G.slot[i] = id;
    p.tray = -1;   /* pinnen står i raden, inte i lådan */
    G.sel = null; G.drag = null;
    plats();
    if (G.fas === 'spel' && G.slot.every(function (s) { return s !== null; })) efter(340, kontroll);
  }

  function tillbakaTillLada(id) {
    var p = pinById(id);
    if (!p) return;
    var s = slotOf(id);
    if (s >= 0) G.slot[s] = null;
    var ledig = friaLada(id);
    if (ledig.length) p.tray = ledig[0];
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
    return Math.hypot(p.x - c.x, p.y - c.y) <= c.r * 1.18;
  }
  function slotVid(p) {
    for (var i = 0; i < G.slotHits.length; i++) if (iRekt(p, G.slotHits[i])) return G.slotHits[i].i;
    return -1;
  }
  function pinVid(p) {
    raknaHits();
    /* placerade pinnar först (de står överst), sedan lådan */
    for (var i = 0; i < 5; i++) {
      var id = G.slot[i];
      if (!id) continue;
      var q = pinById(id);
      var hw = Math.max(L.th * 1.3, 26);
      if (Math.abs(p.x - slotCx(i)) <= hw && p.y >= L.rowBase - pinLen(q) - 12 && p.y <= L.rowBase + 8) return id;
    }
    var bast = null, bastD = 1e9;
    for (var k = 0; k < G.trayHits.length; k++) {
      var h = G.trayHits[k];
      if (!iRekt(p, h)) continue;
      var d = Math.abs(p.x - h.cx);
      if (d < bastD) { bastD = d; bast = h.id; }
    }
    return bast;
  }

  function ner(p) {
    if (G.fas === 'intro') { if (iCirc(p, L.start)) startSpel(); return; }
    if (G.fas === 'fest') {
      if (iCirc(p, L.igen)) { startSpel(); return; }
      var f = pinVid(p);
      if (f) {
        G.drag = { id: f, x: p.x, y: p.y, startX: p.x, startY: p.y, rord: false, inSlot: slotOf(f) >= 0, franSlot: slotOf(f), lyftFranPlats: false };
        G.sel = f;
        lyft();
        return;
      }
      var sf = slotVid(p);
      if (sf >= 0 && G.sel) placera(G.sel, sf);
      return;
    }
    if (G.fas === 'klar') return;
    var id = pinVid(p);
    if (id) {
      var inSlot = slotOf(id) >= 0;
      G.drag = { id: id, x: p.x, y: p.y, startX: p.x, startY: p.y, rord: false, inSlot: inSlot, lyftFranPlats: false };
      lyft();
      return;
    }
    var sl = slotVid(p);
    if (sl >= 0 && G.sel) placera(G.sel, sl);
  }

  function ror(p) {
    if (!G.drag) return;
    G.drag.x = p.x; G.drag.y = p.y;
    if (Math.hypot(p.x - G.drag.startX, p.y - G.drag.startY) > 8) {
      G.drag.rord = true;
      /* först när pinnen faktiskt flyttas lämnar den sin plats */
      if (G.drag.inSlot && !G.drag.lyftFranPlats) {
        var s = slotOf(G.drag.id);
        if (s >= 0) G.slot[s] = null;
        G.drag.lyftFranPlats = true;
        G.sel = null;
      }
    }
  }

  function upp(p) {
    if (!G.drag) return;
    var d = G.drag;
    G.drag = null;
    if (!d.rord) {
      /* ett tryck: välj pinnen, den ligger kvar där den låg */
      G.sel = d.id;
      if (G.fas === 'fest') sagoOrd(d.id);
      return;
    }
    var si = slotVid(p);
    if (si >= 0) placera(d.id, si);
    else if (G.fas === 'fest') {
      /* i festen finns ingen låda: pinnen går tillbaka till sin plats */
      if (d.franSlot >= 0 && G.slot[d.franSlot] === null) G.slot[d.franSlot] = d.id;
      else {
        for (var k = 0; k < 5; k++) if (G.slot[k] === null) { G.slot[k] = d.id; break; }
      }
      plats();
    } else tillbakaTillLada(d.id);
    G.sel = null;   /* efter ett släpp ska ingen pinne stå markerad */
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
  cv.addEventListener('pointercancel', function () {
    if (G.drag) { tillbakaTillLada(G.drag.id); G.drag = null; }
  });
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
    if (G.fas === 'klar' && G.trapp < 1) G.trapp = Math.min(1, G.trapp + dt / 0.9);
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
    if (G.fas === 'spel' && !G.drag && G.tid > 12 && G.saidT !== G.ri) {
      G.saidT = G.ri;
      say('Titta på topparna. Vilken pinne är kortast?', true);
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
    raknaHits();
    return {
      fas: G.fas, ri: G.ri, forsok: G.forsok, stjarnor: G.stjarnor, trapp: Math.round(G.trapp * 100) / 100,
      slot: G.slot.slice(),
      slotLen: G.slot.map(function (id) { var p = id ? pinById(id) : null; return p ? p.len : null; }),
      pins: G.pins.map(function (p) {
        return { id: p.id, len: p.len, tray: p.tray, slot: slotOf(p.id), x: Math.round(trayCx(p)) };
      }),
      sel: G.sel, drag: G.drag ? { id: G.drag.id, x: Math.round(G.drag.x), y: Math.round(G.drag.y) } : null,
      tray: G.trayHits.map(function (h) { return { id: h.id, x: Math.round(h.x), y: Math.round(h.y), w: Math.round(h.w), h: Math.round(h.h) }; }),
      slots: G.slotHits.map(function (h) { return { i: h.i, x: Math.round(h.x), y: Math.round(h.y), w: Math.round(h.w), h: Math.round(h.h) }; }),
      trayBase: Math.round(L.trayBase), rowBase: Math.round(L.rowBase), rowTop: Math.round(L.rowTop),
      maxH: Math.round(L.maxH), u: Math.round(L.u * 10) / 10, th: Math.round(L.th),
      W: W, H: H, s: Math.round(L.s * 100) / 100,
      start: L.start ? { x: Math.round(L.start.x), y: Math.round(L.start.y), r: Math.round(L.start.r) } : null,
      igen: L.igen ? { x: Math.round(L.igen.x), y: Math.round(L.igen.y), r: Math.round(L.igen.r) } : null,
      errs: errs.slice()
    };
  }

  window.__lr = {
    state: state,
    start: function () { startSpel(); return state(); },
    /* placera pinne p<index> på plats i */
    place: function (pi, i) { placera('p' + pi, i); return state(); },
    /* rätt ordning, för genomspelning */
    ratt: function () {
      var s = G.pins.slice().sort(function (a, b) { return a.len - b.len; });
      return s.map(function (p) { return Number(p.id.slice(1)); });
    },
    tap: function (x, y) { ner({ x: x, y: y }); upp({ x: x, y: y }); return state(); },
    nasta: function () { this.spola(3200); nasta(); return state(); },
    trappKlar: function () { G.trapp = 1; return state(); },
    spola: function (ms) {
      var kvar = ms / 1000, steg = 0;
      while (kvar > 0 && steg++ < 400) {
        var d = Math.min(kvar, 0.05); kvar -= d;
        if (G.fas === 'klar' && G.trapp < 1) G.trapp = Math.min(1, G.trapp + d / 0.9);
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