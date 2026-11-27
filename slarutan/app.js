/* Slå rutan — ddakji, den koreanska pappersleken, för barn 4–7 år.
   Först viks ett papper tre gånger (tre svep över streckade linjer), sedan
   ligger den färdiga rutan på mattan vid kompisens ruta. Barnet sveper
   handflatan snabbt över sin ruta: luftdraget far iväg och vänder kompisens
   ruta. Fem rutor → fest, och sedan får man slå hur mycket man vill.

   Tränar: finmotorik (vikning), kraft och snabbhet i en svepning, orsak–verkan,
   och att försöka igen utan att något går förlorat.
   Lgr22: motorik, matematik (form, läge), språk.
   Ingen förlust, ingen klocka, ingen läsning. */

'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#3f3a34', dim: '#7d766c', cream: '#fffaf3', paper: '#fffdf7',
  sand: '#ecd9b0', sandD: '#d8bf90', sandL: '#f7ecd2',
  mat: '#dcc48c', matD: '#b99a5f', matL: '#efdcaa',
  mint: '#7bcbb6', mintD: '#4fae94', coral: '#ef8064', coralD: '#c9553f',
  blue: '#6fb3d6', blueD: '#3d7f9c', star: '#f7c948', starD: '#dfa616',
  kraft: '#c99a63', kraftD: '#a06f3c', dark: '#3b2f2a'
};

const ROST = {
  start: 'Slå rutan!',
  vik: 'Vik papperet! Svep över den streckade linjen.',
  vanster: 'Svep åt vänster!',
  uppat: 'Svep uppåt!',
  klar: 'Nu är rutan klar!',
  sla: 'Svep handflatan över rutan. Snabbt!',
  snabbare: 'Svep snabbare!',
  langre: 'Svep längre!',
  vand: 'Vänd den!',
  ratt: 'Rätt! Den vände sig!',
  fyra: 'Fyra kvar.',
  tre: 'Tre kvar.',
  tva: 'Två kvar.',
  en: 'En kvar.',
  alla: 'Alla fem vände sig!',
  pilen: 'Titta på den gröna pilen.',
  fest: 'Nu får du slå hur mycket du vill!',
  bra: 'Bra jobbat!',
  igen: 'En gång till!'
};

const RUNDOR = 5;
/* hur snabbt svepet måste vara, per runda (px/s) */
const FART = [500, 580, 660, 740, 820];
const KVARORD = { 4: ROST.fyra, 3: ROST.tre, 2: ROST.tva, 1: ROST.en };

/* ---------------- tillstånd ---------------- */
let W = 0, H = 0, DPR = 1, T0 = performance.now();
const L = {};
const G = {
  screen: 'intro', fas: 'spel', t: 0,
  runda: 0, klar: 0, misses: 0, hint: false,
  papper: null, mot: null, drag: null, swipe: null,
  puff: [], conf: [], gnistor: [], hits: [],
  timers: [], rundaToken: 0, startTid: 0, skak: 0
};
window.__errs = [];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function later(sec, fn) { G.timers.push({ at: G.t + sec, fn: fn }); }

/* ---------------- canvas och layout ---------------- */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = Math.max(300, window.innerWidth || 300);
  H = Math.max(300, window.innerHeight || 300);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layout();
  placeraAllt();
}

function layout() {
  L.portrait = H >= W;
  L.topBar = Math.max(78, H * 0.145);
  L.pad = clamp(W * 0.035, 10, 28);
  L.matCx = W * 0.5;
  L.playTop = L.topBar + 10;
  L.matCy = L.playTop + (H - L.playTop) * 0.42;
  L.matRx = clamp(Math.min(W * 0.46, H * 0.50), 120, 430);
  L.matRy = clamp(Math.min(W * 0.40, H * 0.34), 100, 320);
  L.motS = clamp(Math.min(W, H) * 0.185, 62, 138);
  L.minS = L.motS * 0.86;
  L.motY = L.matCy - L.matRy * 0.24;
  L.minY = L.matCy + L.matRy * 0.56;
  L.kottenS = clamp(Math.min(W, H) * 0.125, 48, 100);
  L.kottenX = L.kottenS * 0.52 + 4;
  L.kottenY = H - 4;
  L.starR = clamp(L.topBar * 0.15, 9, 17);
  L.helpR = clamp(L.topBar * 0.24, 16, 24);
  L.helpX = W - L.pad * 0.5 - L.helpR;
  L.helpY = L.topBar * 0.5;
  L.papperW = L.minS * 4;
}

/* papperet ligger mitt på mattan, rutan nere vid kanten */
function placeraAllt() {
  const p = G.papper;
  if (p && !p.done && !p.anim) {
    p.x = L.matCx; p.y = L.matCy - L.matRy * 0.06;
    p.w = L.papperW; p.h = L.papperW / 2;
    for (let i = 0; i < p.folds; i++) { if (i % 2 === 0) p.w /= 2; else p.h /= 2; }
  } else if (p && p.done) {
    p.w = L.minS; p.h = L.minS;
    p.x = L.matCx; p.y = L.minY;
  }
  const m = G.mot;
  if (m) { m.x = L.matCx; m.y = L.motY; m.s = L.motS * m.storlek; }
}

/* ---------------- text ---------------- */
function setFont(fs) {
  ctx.font = 'bold ' + fs.toFixed(1) + 'px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
}
function text(str, x, y, fs, col, align) {
  setFont(fs);
  ctx.fillStyle = col;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function fitFont(str, fs, maxW, min) {
  setFont(fs);
  while (ctx.measureText(str).width > maxW && fs > min) { fs -= 1; setFont(fs); }
  return fs;
}

/* ---------------- former ---------------- */
function el(x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
}
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
function tri(a, b, c, fill) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function starPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.46 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* ---------------- ljud ---------------- */
let actx = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume().catch(function () {});
  return actx;
}
function tone(freq, dur, type, vol, delay, slideTo) {
  const a = actx; if (!a) return;
  const t0 = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
const SND = {
  knapp: function () { tone(520, 0.06, 'sine', 0.026); },
  vik: function () { tone(340, 0.14, 'triangle', 0.026, 0, 190); },
  svep: function () { tone(520, 0.18, 'sine', 0.020, 0, 900); },
  smack: function () { tone(150, 0.10, 'square', 0.030, 0, 70); tone(90, 0.16, 'sine', 0.035); },
  ratt: function () { tone(784, 0.10, 'triangle', 0.040); tone(1046, 0.14, 'triangle', 0.030, 0.07); },
  fel: function () { tone(230, 0.10, 'sine', 0.024); tone(180, 0.12, 'sine', 0.018, 0.06); },
  stjarna: function () { [880, 1174, 1568].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.035, i * 0.07); }); },
  win: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.30, 'triangle', 0.05, i * 0.10); }); }
};

/* ---------------- röst ---------------- */
function speak(str, now) {
  if (!str) return;
  if (window.__rost && window.__rost(str, now)) return;
}

/* ---------------- papperet och vikningen ---------------- */
const PAPPERFARG = ['#fffdf5', '#fdf3e0', '#fbf7ee'];

function nyttPapper() {
  G.papper = {
    x: L.matCx, y: L.matCy - L.matRy * 0.06,
    w: L.papperW, h: L.papperW / 2,
    folds: 0, anim: null, done: false, skak: 0, farg: 0
  };
}

/* vik 1: vänster, vik 2: uppåt, vik 3: vänster */
function foldAxis() { return G.papper.folds % 2 === 0 ? 'v' : 'h'; }

function startaVik(ax) {
  const p = G.papper;
  p.anim = { ax: ax, t: 0, dur: 0.34 };
  SND.vik();
}

function vikKlar() {
  const p = G.papper;
  const ax = p.anim.ax;
  p.anim = null;
  if (ax === 'v') p.w /= 2; else p.h /= 2;
  p.folds++;
  if (p.folds >= 3) { rutanKlar(); return; }
  speak(ax === 'v' ? ROST.vanster : ROST.uppat, true);
}

function rutanKlar() {
  const p = G.papper;
  p.done = true;
  p.w = L.minS; p.h = L.minS;
  p.x = L.matCx; p.y = L.minY;
  G.screen = 'spel'; G.fas = 'spel';
  G.runda = 0; G.klar = 0; G.misses = 0; G.hint = false;
  G.puff = []; G.conf = []; G.gnistor = []; G.startTid = G.t;
  gnistor(p.x, p.y, 16, COL.star);
  SND.stjarna();
  nastaRuta(true);
  speak(ROST.klar, true);
  later(1.8, function () { if (G.screen === 'spel' && G.fas === 'spel') speak(ROST.sla, true); });
}

/* ---------------- spelet ---------------- */
const RUTFARG = [
  { col: COL.coral, mork: COL.coralD, ljus: '#ffc9b8' },
  { col: COL.blue, mork: COL.blueD, ljus: '#cbe8f5' },
  { col: COL.star, mork: COL.starD, ljus: '#ffe9a6' },
  { col: COL.mint, mork: COL.mintD, ljus: '#cdf2e8' }
];
/* barnets egen ruta har en färg som ingen kompisruta har, så de aldrig blandas */
const MINRUTA = { col: '#e3cfa4', mork: '#b99a63', ljus: '#fbf1dc' };

function nastaRuta(forsta) {
  const i = G.runda % RUTFARG.length;
  G.mot = {
    x: L.matCx, y: L.motY, s: L.motS * (1 + 0.045 * Math.min(G.runda, 4)),
    ang: (Math.random() - 0.5) * 0.34,
    upp: false, flip: 0, flipT: -1, farg: RUTFARG[i],
    storlek: 1 + 0.045 * Math.min(G.runda, 4),
    inT: forsta ? 0 : 0
  };
  G.fas = 'spel';
}

function nyttSpel() {
  G.screen = 'vik'; G.fas = 'vik';
  G.runda = 0; G.klar = 0; G.misses = 0; G.hint = false;
  G.conf = []; G.gnistor = []; G.puff = []; G.timers = []; G.drag = null; G.swipe = null;
  G.rundaToken++; G.startTid = G.t; G.skak = 0;
  nyttPapper();
  SND.knapp();
  speak(ROST.start, true);
  later(1.5, function () { if (G.screen === 'vik') speak(ROST.vik, true); });
}

function gnistor(x, y, n, farg) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 170;
    G.gnistor.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, liv: 0.7, col: farg || COL.star });
  }
}
function konfetti(x, y, n) {
  const farg = [COL.star, COL.coral, COL.mint, COL.blue, COL.cream];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 90 + Math.random() * 260;
    G.conf.push({
      x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 9,
      s: 6 + Math.random() * 8, liv: 1.5 + Math.random(), col: farg[i % farg.length]
    });
  }
}

function slap(fart, langd) {
  if (G.screen !== 'spel' && G.screen !== 'fest') return;
  if (G.fas !== 'spel') return;
  const p = G.papper;
  if (!p || !p.done) return;
  if (langd < 52) { SND.fel(); speak(ROST.langre, true); return; }
  const need = FART[clamp(G.runda, 0, FART.length - 1)];
  if (fart < need) {
    G.misses++;
    SND.fel();
    G.puff.push({ x0: p.x, y0: p.y, x1: G.mot.x, y1: G.mot.y, t: 0, svag: true });
    G.mot.skak = 0.001;
    speak(ROST.snabbare, true);
    if (G.misses >= 2 && !G.hint) {
      G.hint = true;
      later(1.0, function () { if (G.fas === 'spel') speak(ROST.pilen, true); });
    }
    return;
  }
  vandRuta();
}

function vandRuta() {
  const p = G.papper, m = G.mot;
  G.fas = 'vand';
  G.puff.push({ x0: p.x, y0: p.y, x1: m.x, y1: m.y, t: 0, svag: false });
  SND.svep();
  later(0.18, function () { m.flipT = 0; SND.smack(); });
  later(0.52, function () {
    m.upp = true; m.flip = 0; m.flipT = -1;
    G.klar++;
    SND.stjarna(); SND.ratt();
    gnistor(m.x, m.y, 14, m.farg.col);
    konfetti(m.x, m.y, 16);
    const kvar = RUNDOR - G.klar;
    if (G.screen === 'fest') speak(ROST.ratt, true);
    else if (kvar <= 0) speak(ROST.alla, true);
    else speak(KVARORD[kvar] || ROST.ratt, true);
  });
  later(1.85, function () {
    if (G.screen === 'spel') {
      if (G.klar >= RUNDOR) { fest(); return; }
      G.runda++; G.misses = 0; G.hint = false;
      nastaRuta(false);
    } else if (G.screen === 'fest') {
      G.fas = 'spel';
      G.mot.upp = false; G.mot.flip = 0; G.mot.flipT = -1;
      G.mot.farg = RUTFARG[Math.floor(Math.random() * RUTFARG.length)];
      G.mot.ang = (Math.random() - 0.5) * 0.34;
    }
  });
}

function fest() {
  G.screen = 'fest';
  G.fas = 'spel';
  G.runda = 0;
  konfetti(W / 2, H * 0.42, 80);
  SND.win();
  speak(ROST.fest, true);
  later(2.8, function () { if (G.screen === 'fest') speak(ROST.bra, true); });
}

/* ---------------- rita ---------------- */
function drawGolv() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.sandL); g.addColorStop(0.6, COL.sand); g.addColorStop(1, COL.sandD);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  /* små stenar i sanden */
  ctx.fillStyle = 'rgba(170,140,95,.18)';
  for (let i = 0; i < 30; i++) {
    const x = (i * 137.7) % W, y = (i * 211.3) % H;
    ctx.beginPath(); ctx.ellipse(x, y, 4 + (i % 3) * 2, 2.4 + (i % 2), 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawMatta() {
  const cx = L.matCx, cy = L.matCy, rx = L.matRx, ry = L.matRy;
  /* skugga */
  el(cx, cy + ry * 0.05, rx * 1.01, ry * 1.01, 'rgba(120,90,50,.16)');
  el(cx, cy, rx, ry, COL.matD);
  el(cx, cy, rx * 0.985, ry * 0.98, COL.mat);
  /* flätade ringar */
  ctx.strokeStyle = 'rgba(150,120,70,.22)'; ctx.lineWidth = 1.4;
  for (let i = 1; i < 9; i++) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * i / 9, ry * i / 9, 0, 0, Math.PI * 2); ctx.stroke();
  }
  /* strån */
  ctx.strokeStyle = 'rgba(255,245,215,.40)'; ctx.lineWidth = 1.1;
  for (let i = 0; i < 26; i++) {
    const a = i * Math.PI * 2 / 26;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rx * 0.30, cy + Math.sin(a) * ry * 0.30);
    ctx.lineTo(cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.92);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120,95,55,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2); ctx.stroke();
}

/* En vikt pappersruta: framsidan har X-mönstret, baksidan är kraftpapper
   med en liten stämpel. flip 0 = framsida, 1 = baksida. */
function drawRuta(x, y, s, ang, f, upp, flip, skak) {
  const h = s / 2;
  let sy = 1;
  let baksida = upp;
  if (flip != null && flip > 0 && flip < 1) {
    const k = flip;
    sy = Math.abs(Math.cos(k * Math.PI));
    baksida = k > 0.5;
  }
  const vink = ang + (skak ? Math.sin(G.t * 40) * 0.06 : 0);

  /* skugga */
  ctx.save();
  ctx.translate(x + s * 0.04, y + s * 0.07);
  ctx.rotate(vink);
  ctx.fillStyle = 'rgba(90,65,35,.18)';
  ctx.fillRect(-h, -h, s, s);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vink);
  ctx.scale(1, Math.max(0.03, sy));

  if (!baksida) {
    /* kanterna: papperet är vikt, så det ligger två lager */
    ctx.fillStyle = '#e8ddc6';
    ctx.fillRect(-h, -h + s * 0.035, s, s);
    ctx.fillStyle = PAPPERFARG[0];
    ctx.fillRect(-h, -h, s, s);

    /* X-mönstret: fyra trianglar från mitten */
    const mid = { x: 0, y: 0 };
    const c = [[-h, -h], [h, -h], [h, h], [-h, h]];
    const farg = [f.col, '#fffdf5', f.col, '#fffdf5'];
    for (let i = 0; i < 4; i++) {
      tri(c[i], c[(i + 1) % 4], [mid.x, mid.y], farg[i]);
    }
    /* vecken */
    ctx.strokeStyle = 'rgba(150,120,80,.30)'; ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath(); ctx.moveTo(-h, -h); ctx.lineTo(h, h); ctx.moveTo(h, -h); ctx.lineTo(-h, h); ctx.stroke();
    ctx.strokeRect(-h, -h, s, s);
    /* ljus kant */
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = Math.max(1.5, s * 0.022);
    ctx.beginPath(); ctx.moveTo(-h + s * 0.02, -h + s * 0.02); ctx.lineTo(h - s * 0.02, -h + s * 0.02); ctx.stroke();
  } else {
    ctx.fillStyle = COL.kraftD;
    ctx.fillRect(-h, -h + s * 0.035, s, s);
    ctx.fillStyle = COL.kraft;
    ctx.fillRect(-h, -h, s, s);
    ctx.strokeStyle = 'rgba(120,85,45,.45)'; ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.strokeRect(-h, -h, s, s);
    /* stämpel */
    ctx.beginPath(); ctx.arc(0, 0, s * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,250,240,.55)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120,85,45,.45)'; ctx.lineWidth = Math.max(1, s * 0.014); ctx.stroke();
  }
  ctx.restore();
}

function drawPapper() {
  const p = G.papper;
  if (!p || p.done) return;
  const hw = p.w / 2, hh = p.h / 2;
  const ax = foldAxis();

  /* skugga */
  ctx.fillStyle = 'rgba(90,65,35,.16)';
  ctx.fillRect(p.x - hw + 5, p.y - hh + 7, p.w, p.h);

  /* arket */
  ctx.fillStyle = PAPPERFARG[p.folds % 3];
  ctx.fillRect(p.x - hw, p.y - hh, p.w, p.h);
  ctx.strokeStyle = 'rgba(150,120,80,.45)'; ctx.lineWidth = 2;
  ctx.strokeRect(p.x - hw, p.y - hh, p.w, p.h);

  /* tidigare veck */
  ctx.strokeStyle = 'rgba(150,120,80,.22)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (p.folds >= 1) { ctx.moveTo(p.x + hw, p.y - hh); ctx.lineTo(p.x + hw, p.y + hh); }
  if (p.folds >= 2) { ctx.moveTo(p.x - hw, p.y + hh); ctx.lineTo(p.x + hw, p.y + hh); }
  ctx.stroke();

  /* den aktuella viklinjen */
  const puls = 0.55 + 0.45 * Math.abs(Math.sin(G.t * 2.6));
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(79,174,148,' + puls.toFixed(2) + ')';
  ctx.beginPath();
  if (ax === 'v') { ctx.moveTo(p.x, p.y - hh - 16); ctx.lineTo(p.x, p.y + hh + 16); }
  else { ctx.moveTo(p.x - hw - 16, p.y); ctx.lineTo(p.x + hw + 16, p.y); }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  /* fliken som viks: krymper mot vecket */
  if (p.anim) {
    const k = clamp(p.anim.t / p.anim.dur, 0, 1);
    const e = 1 - Math.pow(1 - k, 2.2);
    if (p.anim.ax === 'v') {
      const w2 = (p.w / 2) * (1 - e);
      ctx.fillStyle = '#f2e8d2';
      ctx.fillRect(p.x, p.y - hh, w2, p.h);
      ctx.fillStyle = 'rgba(90,65,35,.10)';
      ctx.fillRect(p.x - 6, p.y - hh, 6, p.h);
      ctx.strokeStyle = 'rgba(150,120,80,.45)'; ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y - hh, w2, p.h);
    } else {
      const h2 = (p.h / 2) * (1 - e);
      ctx.fillStyle = '#f2e8d2';
      ctx.fillRect(p.x - hw, p.y, p.w, h2);
      ctx.fillStyle = 'rgba(90,65,35,.10)';
      ctx.fillRect(p.x - hw, p.y - 6, p.w, 6);
      ctx.strokeStyle = 'rgba(150,120,80,.45)'; ctx.lineWidth = 2;
      ctx.strokeRect(p.x - hw, p.y, p.w, h2);
    }
  }

  /* svep-pilen: en hand som drar åt rätt håll */
  const visaPil = !p.anim && (p.folds < 3);
  if (visaPil) {
    const cyc = (G.t * 0.9) % 1;
    if (ax === 'v') drawSvep(p.x + hw * 0.75, p.y, p.x - hw * 0.55, p.y, cyc);
    else drawSvep(p.x, p.y + hh * 0.75, p.x, p.y - hh * 0.55, cyc);
  }
}

/* grön pil med tre vandrande prickar — visar hur svepet ska gå */
function drawSvep(x0, y0, x1, y1, cyc) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  ctx.strokeStyle = 'rgba(79,174,148,.55)';
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  /* pilspets */
  const a = Math.atan2(uy, ux);
  ctx.fillStyle = 'rgba(79,174,148,.85)';
  tri([x1 + Math.cos(a) * 14, y1 + Math.sin(a) * 14],
    [x1 + Math.cos(a + 2.4) * 14, y1 + Math.sin(a + 2.4) * 14],
    [x1 + Math.cos(a - 2.4) * 14, y1 + Math.sin(a - 2.4) * 14], 'rgba(79,174,148,.85)');
  /* prickar som glider */
  for (let i = 0; i < 3; i++) {
    const k = (cyc + i / 3) % 1;
    el(x0 + dx * k, y0 + dy * k, 7, 7, 'rgba(255,250,243,.85)');
  }
  ctx.lineCap = 'butt';
}

function drawPuff() {
  for (const p of G.puff) {
    const k = clamp(p.t / (p.svag ? 0.45 : 0.26), 0, 1);
    const x = lerp(p.x0, p.x1, k), y = lerp(p.y0, p.y1, k);
    const r = (p.svag ? 16 : 22) + k * (p.svag ? 22 : 46);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.65 * (1 - k)).toFixed(2) + ')';
    ctx.lineWidth = 5 * (1 - k) + 1; ctx.stroke();
    if (!p.svag) {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + k * 3;
        el(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, 5 * (1 - k), 5 * (1 - k),
          'rgba(255,250,243,' + (0.55 * (1 - k)).toFixed(2) + ')');
      }
    }
  }
}

function drawKotten() {
  if (!window.KOTTEN) return;
  const hopp = G.screen === 'fest' ? Math.abs(Math.sin(G.t * 4.4)) * 12 : 0;
  ctx.save();
  el(L.kottenX, L.kottenY - 2, L.kottenS * 0.30, L.kottenS * 0.06, 'rgba(90,70,45,.20)');
  KOTTEN.drawAtFeet(ctx, L.kottenX, L.kottenY - hopp, L.kottenS,
    { wave: 0.55 + 0.45 * Math.sin(G.t * 2.6) });
  ctx.restore();
}

function drawHUD() {
  const fs = clamp(L.topBar * 0.185, 12, 21);
  text('Slå rutan', W * 0.035, L.topBar * 0.5,
    fitFont('Slå rutan', fs, W * 0.34, 11), COL.ink, 'left');

  const sr = L.starR, gap = sr * 0.62;
  const span = RUNDOR * sr * 2 + (RUNDOR - 1) * gap;
  const cx = L.helpX - L.helpR - 16 - span / 2;
  for (let i = 0; i < RUNDOR; i++) {
    const x = cx - span / 2 + sr + i * (sr * 2 + gap);
    starPath(x, L.topBar * 0.5, sr);
    ctx.fillStyle = i < G.klar ? COL.star : 'rgba(255,250,243,.45)';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = i < G.klar ? COL.starD : 'rgba(168,123,63,.35)';
    ctx.stroke();
  }

  /* högtalare */
  el(L.helpX, L.helpY + 2, L.helpR * 0.98, L.helpR * 0.98, 'rgba(90,70,45,.14)');
  el(L.helpX, L.helpY, L.helpR * 0.94, L.helpR * 0.94, COL.cream);
  ctx.strokeStyle = 'rgba(160,130,90,.45)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(L.helpX, L.helpY, L.helpR * 0.94, 0, Math.PI * 2); ctx.stroke();
  const r = L.helpR;
  ctx.fillStyle = COL.mintD;
  ctx.beginPath();
  ctx.moveTo(L.helpX - r * 0.44, L.helpY - r * 0.20);
  ctx.lineTo(L.helpX - r * 0.18, L.helpY - r * 0.20);
  ctx.lineTo(L.helpX + r * 0.10, L.helpY - r * 0.48);
  ctx.lineTo(L.helpX + r * 0.10, L.helpY + r * 0.48);
  ctx.lineTo(L.helpX - r * 0.18, L.helpY + r * 0.20);
  ctx.lineTo(L.helpX - r * 0.44, L.helpY + r * 0.20);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = COL.mintD; ctx.lineWidth = r * 0.10; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(L.helpX + r * 0.14, L.helpY, r * (0.30 + i * 0.24), -0.7, 0.7);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  G.hits.push({ id: 'hjalp', x: L.helpX, y: L.helpY, r: L.helpR + 12 });
}

function drawVidare(cx, cy, r, typ, tint) {
  const p = 1 + 0.035 * Math.sin(G.t * 6.2);
  el(cx, cy + r * 0.10, r * 1.02, r * 0.98, 'rgba(90,70,45,.16)');
  el(cx, cy, r * p, r * p, tint || COL.mint);
  el(cx, cy, r * p * 0.88, r * p * 0.88, 'rgba(255,255,255,.22)');
  if (typ === 'play') {
    tri([cx - r * 0.24, cy - r * 0.36], [cx - r * 0.24, cy + r * 0.36], [cx + r * 0.40, cy], '#fffaf3');
  } else {
    ctx.strokeStyle = '#fffaf3'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0.6, Math.PI * 2 - 0.35); ctx.stroke();
    const a = Math.PI * 2 - 0.5;
    tri([cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42 - r * 0.02],
      [cx + Math.cos(a) * r * 0.10, cy + Math.sin(a) * r * 0.20 - r * 0.30],
      [cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.52], '#fffaf3');
    ctx.lineCap = 'butt';
  }
  return { id: typ === 'play' ? 'start' : 'igen', x: cx, y: cy, r: r * p + 12 };
}

function knappText(str, x, y, r) {
  const fs = clamp(r * 0.40, 11, 15);
  setFont(fs);
  const tw = ctx.measureText(str).width + 24;
  rr(x - tw / 2, y - fs * 0.95, tw, fs * 1.9, fs * 0.95, 'rgba(255,250,243,.94)');
  text(str, x, y, fs, COL.ink, 'center');
}

function drawIntro() {
  drawGolv();
  drawMatta();

  const titleFs = clamp(Math.min(W * 0.095, H * 0.078), 24, 52);
  const ty = H * (L.portrait ? 0.115 : 0.14);
  text('Slå rutan', W / 2, ty, fitFont('Slå rutan', titleFs, W * 0.9, 20), COL.ink, 'center');
  text('Vik · svep · vänd', W / 2, ty + titleFs * 0.95, clamp(titleFs * 0.36, 12, 20), COL.dim, 'center');

  /* två rutor på mattan: en som vänt sig, en som ligger kvar */
  const s = clamp(L.motS * 1.05, 54, 130);
  const cx = W * 0.5, cy = L.matCy - s * 0.15;
  drawRuta(cx - s * 0.62, cy - s * 0.10, s, -0.14, RUTFARG[1], false, null, false);
  drawRuta(cx + s * 0.60, cy + s * 0.14, s, 0.22, RUTFARG[0], true, null, false);

  if (window.KOTTEN) {
    const ks = clamp(H * 0.16, 56, 140);
    ctx.save();
    el(W * 0.10, H * 0.965, ks * 0.30, ks * 0.06, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.10, H * 0.955, ks, { wave: 0.6 + 0.4 * Math.sin(G.t * 2.4) });
    ctx.restore();
  }

  const r = clamp(Math.min(W, H) * 0.072, 32, 58);
  const by = H * (L.portrait ? 0.76 : 0.78);
  const b = drawVidare(W / 2, by, r, 'play', COL.coral);
  knappText('Börja vika', W / 2, by + r + 22, r);
  G.hits.push(b);
}

function drawVik() {
  drawGolv();
  drawMatta();
  drawPapper();
  drawKotten();
  drawHUD();

  const p = G.papper;
  const fs = clamp(Math.min(W * 0.062, H * 0.052), 15, 30);
  const ty = L.playTop + fs * 1.3;
  text('Vik papperet', W / 2, ty, fitFont('Vik papperet', fs, W * 0.72, 13), COL.ink, 'center');
  /* tre prickar: hur många vikningar som är kvar */
  const dr = clamp(fs * 0.22, 5, 8);
  const dy = ty + fs * 0.95;
  for (let i = 0; i < 3; i++) {
    const x = W / 2 + (i - 1) * dr * 3.2;
    ctx.beginPath(); ctx.arc(x, dy, dr, 0, Math.PI * 2);
    ctx.fillStyle = i < p.folds ? COL.mintD : 'rgba(255,250,243,.75)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,95,55,.30)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

function drawSpel() {
  drawGolv();
  drawMatta();
  const p = G.papper;
  if (p && p.done) {
    /* barnets ruta nere på mattan */
    drawRuta(p.x, p.y, p.w, -0.06, MINRUTA, false, null, false);
    /* en svag ring som visar var man sveper */
    const ring = 1 + 0.05 * Math.sin(G.t * 4.4);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.w * 0.80 * ring, 0, Math.PI * 2);
    ctx.strokeStyle = G.hint ? 'rgba(79,174,148,.75)' : 'rgba(79,174,148,.28)';
    ctx.lineWidth = 3; ctx.setLineDash([8, 9]); ctx.stroke(); ctx.setLineDash([]);
  }
  const m = G.mot;
  if (m) {
    const fl = m.flipT >= 0 ? clamp(m.flipT / 0.34, 0, 1) : null;
    drawRuta(m.x, m.y, m.s, m.ang, m.farg, m.upp, fl, m.skak > 0 && m.skak < 0.35);
  }
  drawPuff();
  if (G.hint && G.fas === 'spel' && p) {
    const cyc = (G.t * 1.1) % 1;
    drawSvep(p.x - p.w * 0.55, p.y - p.w * 0.50, p.x + p.w * 0.55, p.y - p.w * 0.50, cyc);
  }
  drawKotten();
  drawHUD();

  /* kraftmätare under svepet */
  if (G.swipe && p) {
    const f = clamp(G.swipe.len / 200, 0, 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w * 0.66, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    ctx.lineWidth = Math.max(4, p.w * 0.06);
    ctx.strokeStyle = f > 0.5 ? 'rgba(247,201,72,.85)' : 'rgba(255,255,255,.65)';
    ctx.stroke();
  }
}

function drawFest() {
  drawGolv();
  drawMatta();
  const p = G.papper;
  if (p && p.done) {
    drawRuta(p.x, p.y, p.w, -0.06, MINRUTA, false, null, false);
    const ring = 1 + 0.05 * Math.sin(G.t * 4.4);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.w * 0.80 * ring, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79,174,148,.30)';
    ctx.lineWidth = 3; ctx.setLineDash([8, 9]); ctx.stroke(); ctx.setLineDash([]);
  }
  const m = G.mot;
  if (m) {
    const fl = m.flipT >= 0 ? clamp(m.flipT / 0.34, 0, 1) : null;
    drawRuta(m.x, m.y, m.s, m.ang, m.farg, m.upp, fl, false);
  }
  drawPuff();
  drawKotten();
  drawHUD();

  const fs = clamp(Math.min(W * 0.070, H * 0.062), 17, 38);
  text('Bra jobbat!', W / 2, L.playTop + fs * 1.2,
    fitFont('Bra jobbat!', fs, W * 0.8, 15), COL.ink, 'center');

  const r = clamp(Math.min(W, H) * 0.060, 26, 48);
  const bx = W / 2, by = H - r - 26;
  const b = drawVidare(bx, by, r, 'igen', COL.coral);
  knappText('En gång till', bx, by - r - 20, r);
  G.hits.push(b);
}

/* ---------------- pek ---------------- */
function hitAt(x, y) {
  for (let i = G.hits.length - 1; i >= 0; i--) {
    const h = G.hits[i];
    if (h.r != null) {
      if ((x - h.x) * (x - h.x) + (y - h.y) * (y - h.y) <= h.r * h.r) return h;
    } else if (Math.abs(x - h.x) <= h.w / 2 && Math.abs(y - h.y) <= h.h / 2) return h;
  }
  return null;
}

function onDown(x, y) {
  audio();
  const h = hitAt(x, y);
  if (h) {
    const id = String(h.id);
    if (id === 'start' || id === 'igen') { SND.knapp(); nyttSpel(); return; }
    if (id === 'hjalp') {
      SND.knapp();
      if (G.screen === 'intro') speak(ROST.start, true);
      else if (G.screen === 'vik') speak(G.papper && G.papper.folds > 0 ? ROST.vik : ROST.vik, true);
      else if (G.screen === 'fest') speak(ROST.fest, true);
      else if (G.fas === 'vand') speak(ROST.ratt, true);
      else speak(G.hint ? ROST.pilen : ROST.sla, true);
      return;
    }
  }
  G.swipe = { x0: x, y0: y, x: x, y: y, len: 0, t0: performance.now(), path: 0 };
}

function onMove(x, y) {
  const s = G.swipe;
  if (!s) return;
  s.path += Math.hypot(x - s.x, y - s.y);
  s.x = x; s.y = y;
  s.len = Math.hypot(x - s.x0, y - s.y0);
}

function onUp(x, y) {
  const s = G.swipe;
  G.swipe = null;
  if (!s) return;
  s.path += Math.hypot(x - s.x, y - s.y);
  s.x = x; s.y = y;
  const dt = Math.max(0.03, (performance.now() - s.t0) / 1000);
  const langd = Math.max(Math.hypot(x - s.x0, y - s.y0), s.path * 0.6);
  const fart = langd / dt;
  G.sista = { fart: Math.round(fart), langd: Math.round(langd), dt: Math.round(dt * 1000) };

  if (G.screen === 'vik') { vikSvep(s, langd); return; }
  slap(fart, langd);
}

function vikSvep(s, langd) {
  const p = G.papper;
  if (!p || p.done || p.anim) return;
  const ax = foldAxis();
  const dx = s.x - s.x0, dy = s.y - s.y0;
  const hw = p.w / 2, hh = p.h / 2;
  let ok = false;
  if (ax === 'v') {
    ok = s.x0 > p.x + 6 && s.x < p.x - 8 && Math.abs(dy) < hh * 0.95 && Math.abs(dx) > 44;
  } else {
    ok = s.y0 > p.y + 6 && s.y < p.y - 8 && Math.abs(dx) < hw * 0.95 && Math.abs(dy) > 44;
  }
  if (ok) { startaVik(ax); return; }
  SND.fel();
  p.skak = 0.001;
  speak(ax === 'v' ? ROST.vanster : ROST.uppat, true);
}

/* ---------------- loop ---------------- */
function update(dt) {
  G.t = (performance.now() - T0) / 1000;

  if (G.timers.length) {
    const kvar = [];
    for (let i = 0; i < G.timers.length; i++) {
      const tm = G.timers[i];
      if (G.t >= tm.at) { try { tm.fn(); } catch (e) { window.__errs.push(e.message); } }
      else kvar.push(tm);
    }
    G.timers = kvar;
  }

  const p = G.papper;
  if (p) {
    if (p.anim) {
      p.anim.t += dt;
      if (p.anim.t >= p.anim.dur) vikKlar();
    }
    if (p.skak > 0) { p.skak += dt; if (p.skak > 0.4) p.skak = 0; }
  }
  const m = G.mot;
  if (m) {
    if (m.flipT >= 0) { m.flipT += dt; }
    if (m.skak > 0) { m.skak += dt; if (m.skak > 0.35) m.skak = 0; }
  }
  for (const q of G.puff) q.t += dt;
  G.puff = G.puff.filter(function (q) { return q.t < (q.svag ? 0.5 : 0.32); });

  for (const c of G.conf) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 320 * dt; c.a += c.va * dt; c.liv -= dt;
  }
  G.conf = G.conf.filter(function (c) { return c.liv > 0 && c.y < H + 50; });

  for (const g of G.gnistor) {
    g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 260 * dt; g.liv -= dt * 1.6;
  }
  G.gnistor = G.gnistor.filter(function (g) { return g.liv > 0; });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    update(dt);
    if (W !== window.innerWidth || H !== window.innerHeight) resize();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    G.hits = [];
    if (G.screen === 'intro') drawIntro();
    else if (G.screen === 'vik') drawVik();
    else if (G.screen === 'spel') drawSpel();
    else drawFest();

    for (const g of G.gnistor) {
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, g.liv));
      starPath(g.x, g.y, 7); ctx.fillStyle = g.col; ctx.fill(); ctx.restore();
    }
    for (const c of G.conf) {
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.fillStyle = c.col;
      ctx.globalAlpha = Math.min(1, c.liv);
      ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  } catch (e) {
    window.__errs.push(e.message);
  }
  requestAnimationFrame(frame);
}

/* ---------------- pek-händelser ---------------- */
cv.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  const r = cv.getBoundingClientRect();
  onDown(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointermove', function (e) {
  if (!G.swipe) return;
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  onMove(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointerup', function (e) {
  const r = cv.getBoundingClientRect();
  onUp(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointercancel', function () { G.swipe = null; });
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* ---------------- start ---------------- */
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
T0 = performance.now();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
requestAnimationFrame(frame);

/* ---------------- testkrok ---------------- */
window.__sr = {
  state: function () {
    const p = G.papper, m = G.mot;
    return {
      screen: G.screen, fas: G.fas, runda: G.runda, klar: G.klar, misses: G.misses,
      hint: G.hint, folds: p ? p.folds : -1, papperKlar: !!(p && p.done),
      papper: p ? { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h) } : null,
      mot: m ? { x: Math.round(m.x), y: Math.round(m.y), s: Math.round(m.s), upp: m.upp } : null,
      hits: G.hits.map(function (h) { return h.id; }),
      sista: G.sista || null,
      errs: window.__errs.slice(), size: [W, H]
    };
  },
  start: function () { nyttSpel(); return this.state(); },
  /* vik ett steg utan pekfinger */
  vik: function () {
    if (G.screen === 'vik' && G.papper && !G.papper.anim) startaVik(foldAxis());
    for (let i = 0; i < 400 && G.papper && (G.papper.anim || G.screen === 'vik'); i++) {
      update(1 / 60);
      if (G.screen !== 'vik') break;
      if (G.papper && !G.papper.anim) break;
    }
    return this.state();
  },
  /* simulera ett svep med given fart (px/s) */
  svep: function (fart, langd) { slap(fart == null ? 1500 : fart, langd == null ? 180 : langd); return this.state(); },
  stilla: function () {
    for (let i = 0; i < 2000; i++) {
      update(1 / 60);
      if (!G.timers.length && !G.puff.length) break;
    }
    return this.state();
  },
  spola: function (ms) { G.timers.forEach(function (t) { t.at -= ms / 1000; }); return this.state(); },
  tap: function (id) {
    const h = G.hits.find(function (k) { return k.id === id; });
    if (h) onDown(h.x, h.y);
    return this.state();
  },
  reset: function () {
    G.screen = 'intro'; G.fas = 'spel'; G.timers = []; G.swipe = null;
    G.conf = []; G.gnistor = []; G.puff = []; G.mot = null; G.papper = null;
    return this.state();
  }
};
