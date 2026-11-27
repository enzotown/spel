/* Knäppa brickor — ohajiki, det japanska knäppspelet, för barn 4–7 år.
   Tre glasbrickor ligger på bordet och en repring är målet: barnet drar en
   bricka mot ringen och släpper, brickan glider över träet och stannar där
   farten tar slut. Alla tre i ringen ger en stjärna, fyra ringar ger fest.

   Tränar: riktning och kraft (öga–hand), att uppskatta avstånd, tålamod och
   att försöka igen utan att något går förlorat.
   Lgr22: matematik (läge, avstånd, geometri), motorik, språk.
   Ingen förlust, ingen klocka, ingen läsning. */

'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#3f3a34', dim: '#7d766c', cream: '#fffaf3', paper: '#fffdf7',
  wood: '#e2b877', woodD: '#b98a4d', woodL: '#f0d3a2', seam: '#cfa267',
  mat: '#f6ecd6', matD: '#e2d2b2',
  mint: '#7bcbb6', mintD: '#4fae94', coral: '#ef8064', coralD: '#c9553f',
  blue: '#6fb3d6', blueD: '#3d7f9c',
  star: '#f7c948', starD: '#dfa616', dark: '#3b2f2a',
  rope: '#d8a866', ropeD: '#a87b3f'
};

const ROST = {
  start: 'Knäppa brickor!',
  dra: 'Dra brickan mot ringen och släpp!',
  hjalp: 'Dra brickan mot ringen och släpp!',
  kort: 'Dra längre!',
  nastan: 'Nästan! Prova igen.',
  ratt: 'Rätt i ringen!',
  tva: 'Två kvar.',
  en: 'En kvar.',
  alla: 'Alla tre i ringen!',
  hint: 'Titta på den streckade linjen.',
  fest: 'Nu får du knäppa hur mycket du vill!',
  bra: 'Bra jobbat!',
  igen: 'En gång till!'
};

const RUNDOR = 4;
const DAMP = 1.9;          /* luftmotstånd/friktion per sekund */
const STOPP = 26;          /* px/s — under detta stannar brickan */

/* ---------------- tillstånd ---------------- */
let W = 0, H = 0, DPR = 1, T0 = performance.now();
const L = {};
const G = {
  screen: 'intro', fas: 'spel', t: 0,
  runda: 0, klar: 0, misses: 0, hint: false,
  ring: { x: 0, y: 0, r: 60 },
  tiles: [], drag: null, hits: [], conf: [], gnistor: [],
  timers: [], rundaToken: 0, festIn: 0
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
  if (G.screen === 'fest') festRing(); else placeraRing();
  placeraBrickorEfterLayout();
}

/* Efter rotation: brickorna måste hitta hem igen, annars ligger de kvar på
   den gamla skärmens koordinater (utanför kanten). De som redan ligger i
   ringen flyttas med ringen i stället för att tappas. */
function placeraBrickorEfterLayout() {
  if (!G.tiles.length) return;
  G.drag = null;
  let inne = 0;
  G.tiles.forEach(function (t) {
    t.r = L.tileR;
    t.drag = false; t.moving = false; t.vx = 0; t.vy = 0; t.ret = null;
    if (t.inRing) {
      const plats = ringSlot(inne, t);
      t.x = plats.x; t.y = plats.y;
      t.hx = plats.x; t.hy = plats.y;
      t.scale = plats.scale; t.scaleTarget = plats.scale;
      inne++;
    } else {
      const h = L.homes[t.i];
      t.hx = h.x;
      t.hy = G.screen === 'fest' ? L.startY - L.tileR * 3.4 : h.y;
      t.x = t.hx; t.y = t.hy;
    }
  });
}

function layout() {
  L.portrait = H >= W;
  L.topBar = Math.max(78, H * 0.145);
  L.pad = clamp(W * 0.035, 10, 28);
  L.tileR = clamp(Math.min(W, H) * 0.058, 20, 46);
  L.startY = H - clamp(H * 0.10, 76, 122);
  L.homes = [0.27, 0.5, 0.73].map(function (f) { return { x: W * f, y: L.startY }; });
  L.playTop = L.topBar + 10;
  L.playBot = L.startY - L.tileR * 2.2;
  L.ringR = clamp(Math.min(W * 0.135, (L.playBot - L.playTop) * 0.30), 38, 108);
  L.kottenS = clamp(Math.min(W, H) * 0.135, 52, 108);
  L.kottenX = L.kottenS * 0.55 + 6;
  L.kottenY = H - 4;
  L.starR = clamp(L.topBar * 0.15, 9, 17);
  L.helpR = clamp(L.topBar * 0.24, 16, 24);
  L.helpX = W - L.pad * 0.5 - L.helpR;
  L.helpY = L.topBar * 0.5;
}

/* ringens plats per runda — nära först, längre bort sedan */
const RINGPLATS = [
  { fx: 0.50, fy: 0.78, k: 1.00 },
  { fx: 0.30, fy: 0.55, k: 0.94 },
  { fx: 0.71, fy: 0.46, k: 0.88 },
  { fx: 0.46, fy: 0.28, k: 0.82 }
];

function placeraRing() {
  const p = RINGPLATS[clamp(G.runda, 0, RINGPLATS.length - 1)];
  const r = L.ringR * p.k;
  const y = L.playTop + (L.playBot - L.playTop) * p.fy;
  const x = W * p.fx;
  G.ring.r = r;
  G.ring.x = clamp(x, r + L.pad, W - r - L.pad);
  G.ring.y = clamp(y, L.playTop + r, L.playBot - r * 0.2);
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
  lyft: function () { tone(560, 0.05, 'sine', 0.022); },
  knapp: function () { tone(520, 0.06, 'sine', 0.026); },
  skjut: function () { tone(300, 0.16, 'triangle', 0.030, 0, 760); },
  glid: function () { tone(210, 0.30, 'sine', 0.014, 0, 150); },
  tock: function () { tone(180, 0.06, 'triangle', 0.030); },
  ratt: function () { tone(784, 0.10, 'triangle', 0.040); tone(1046, 0.14, 'triangle', 0.030, 0.07); },
  fel: function () { tone(220, 0.10, 'sine', 0.028); tone(170, 0.12, 'sine', 0.022, 0.06); },
  stjarna: function () { [880, 1174, 1568].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.035, i * 0.07); }); },
  win: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.30, 'triangle', 0.05, i * 0.10); }); }
};

/* ---------------- röst ---------------- */
function speak(str, now) {
  if (!str) return;
  if (window.__rost && window.__rost(str, now)) return;
}

/* ---------------- brickorna ---------------- */
const TILEFARG = [
  { col: COL.coral, mork: COL.coralD, ljus: '#ffc4b2' },
  { col: COL.blue, mork: COL.blueD, ljus: '#c6e6f4' },
  { col: COL.mint, mork: COL.mintD, ljus: '#c8f0e5' }
];

function nyaBrickor() {
  G.tiles = L.homes.map(function (h, i) {
    return {
      i: i, r: L.tileR, x: h.x, y: h.y, hx: h.x, hy: h.y,
      vx: 0, vy: 0, moving: false, drag: false, inRing: false,
      ret: null, evald: true, runda: G.runda, pop: -9, farg: TILEFARG[i],
      scale: 1, scaleTarget: 1
    };
  });
}

function aterstallBrickor() {
  /* på festen står raden högre, så "En gång till" får plats under */
  const festLage = G.screen === 'fest';
  G.tiles.forEach(function (t) {
    const h = L.homes[t.i];
    t.hx = h.x;
    t.hy = festLage ? L.startY - L.tileR * 3.4 : h.y;
    t.x = t.hx; t.y = t.hy; t.vx = 0; t.vy = 0;
    t.moving = false; t.drag = false; t.inRing = false;
    t.ret = null; t.evald = true; t.runda = G.runda; t.pop = -9;
    t.scale = 1; t.scaleTarget = 1;
  });
}

/* När en bricka stannar i ringen läggs den som en liten pärla på sin plats,
   så att tre brickor syns som tre och inte som en enda hög. */
function ringSlot(k, t) {
  const R = G.ring;
  const drawnR = Math.min(t.r * 0.58, R.r * 0.20);
  const step = drawnR * 2 + Math.max(4, R.r * 0.05);
  return {
    x: R.x + (k - 1) * step,
    y: R.y + R.r * 0.08,
    scale: drawnR / t.r
  };
}

function brickaVid(x, y) {
  for (let i = G.tiles.length - 1; i >= 0; i--) {
    const t = G.tiles[i];
    if (t.inRing || t.ret || t.drag) continue;
    if (t.moving) continue;
    if ((x - t.x) * (x - t.x) + (y - t.y) * (y - t.y) <= (t.r * 1.35) * (t.r * 1.35)) return t;
  }
  return null;
}

function skjut(t, dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len < 14) { SND.fel(); speak(ROST.kort, true); return false; }
  const f = Math.min(1, (len - 14) / 190);
  const v = 300 + f * 940;             /* 300–1240 px/s */
  t.vx = (dx / len) * v;
  t.vy = (dy / len) * v;
  t.moving = true; t.evald = false; t.runda = G.runda;
  SND.skjut(); SND.glid();
  return true;
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

/* ---------------- spel ---------------- */
function nyttSpel() {
  G.screen = 'spel'; G.fas = 'spel';
  G.runda = 0; G.klar = 0; G.misses = 0; G.hint = false;
  G.conf = []; G.gnistor = []; G.timers = []; G.drag = null;
  G.rundaToken++; G.festIn = 0;
  placeraRing();
  nyaBrickor();
  G.t = (performance.now() - T0) / 1000;
  speak(ROST.start, true);
  later(1.9, function () { if (G.screen === 'spel' && G.fas === 'spel') speak(ROST.dra, true); });
}

function landa(t) {
  if (G.screen !== 'spel' && G.screen !== 'fest') return;
  if (t.runda !== G.runda) return;
  if (G.screen === 'fest') { landaFest(t); return; }
  if (G.fas !== 'spel') return;

  const d = Math.hypot(t.x - G.ring.x, t.y - G.ring.y);
  if (d <= G.ring.r - t.r * 0.30) {
    const k = G.tiles.filter(function (q) { return q.inRing; }).length;
    const plats = ringSlot(k, t);
    t.inRing = true; t.pop = G.t;
    t.hx = plats.x; t.hy = plats.y;
    t.scaleTarget = plats.scale;
    t.ret = { x0: t.x, y0: t.y, t: 0, dur: 0.38 };
    gnistor(t.x, t.y, 10, t.farg.col);
    SND.ratt();
    const inne = k + 1;
    if (inne >= 3) rundaKlar();
    else speak(inne === 1 ? ROST.tva : ROST.en, true);
    return;
  }

  G.misses++;
  SND.fel();
  speak(ROST.nastan, true);
  t.scaleTarget = 1;
  t.ret = { x0: t.x, y0: t.y, t: 0, dur: 0.55 };
  if (G.misses >= 2 && !G.hint) {
    G.hint = true;
    later(1.1, function () { if (G.screen === 'spel' && G.fas === 'spel') speak(ROST.hint, true); });
  }
}

function landaFest(t) {
  const d = Math.hypot(t.x - G.ring.x, t.y - G.ring.y);
  if (d <= G.ring.r - t.r * 0.30) {
    const k = G.tiles.filter(function (q) { return q.inRing; }).length;
    const plats = ringSlot(k, t);
    t.inRing = true; t.pop = G.t;
    t.hx = plats.x; t.hy = plats.y;
    t.scaleTarget = plats.scale;
    t.ret = { x0: t.x, y0: t.y, t: 0, dur: 0.38 };
    gnistor(t.x, t.y, 12, t.farg.col);
    SND.ratt();
    if (k + 1 >= 3) {
      konfetti(G.ring.x, G.ring.y, 40);
      SND.stjarna();
      later(0.9, function () {
        if (G.screen !== 'fest') return;
        G.tiles.forEach(function (q) {
          q.inRing = false;
          q.scaleTarget = 1;
          q.hx = L.homes[q.i].x;
          q.hy = L.startY - L.tileR * 3.4;
          q.ret = { x0: q.x, y0: q.y, t: 0, dur: 0.6 };
        });
      });
    }
  } else {
    t.scaleTarget = 1;
    t.ret = { x0: t.x, y0: t.y, t: 0, dur: 0.45 };
  }
}

function rundaKlar() {
  G.fas = 'klar';
  G.klar++;
  SND.stjarna();
  konfetti(G.ring.x, G.ring.y, 46);
  speak(ROST.alla, true);
  const sista = G.klar >= RUNDOR;
  later(1.7, function () {
    if (G.screen !== 'spel') return;
    if (sista) { fest(); return; }
    G.runda++;
    G.misses = 0; G.hint = false;
    G.fas = 'spel';
    placeraRing();
    aterstallBrickor();
    SND.knapp();
    speak(ROST.dra, true);
  });
}

function festRing() {
  G.ring.x = W * 0.5;
  G.ring.y = L.playTop + (L.playBot - L.playTop) * 0.42;
  G.ring.r = L.ringR * 1.22;
  G.ring.x = clamp(G.ring.x, G.ring.r + L.pad, W - G.ring.r - L.pad);
  G.ring.y = clamp(G.ring.y, L.playTop + G.ring.r, L.playBot);
}

function fest() {
  G.screen = 'fest';
  G.fas = 'fest';
  G.festIn = 0;
  G.runda = 3;
  festRing();
  aterstallBrickor();
  konfetti(W / 2, H * 0.42, 70);
  SND.win();
  speak(ROST.fest, true);
  later(2.6, function () { if (G.screen === 'fest') speak(ROST.bra, true); });
}

/* ---------------- fysik ---------------- */
function stegFysik(t, dt) {
  if (t.ret) {
    t.ret.t += dt;
    const k = clamp(t.ret.t / t.ret.dur, 0, 1);
    const e = 1 - Math.pow(1 - k, 2.2);
    t.x = lerp(t.ret.x0, t.hx, e);
    t.y = lerp(t.ret.y0, t.hy, e);
    t.scale = lerp(t.scale, t.scaleTarget, Math.min(1, dt * 9));
    if (k >= 1) {
      t.x = t.hx; t.y = t.hy; t.ret = null; t.vx = 0; t.vy = 0;
      t.scale = t.scaleTarget;
    }
    return;
  }
  if (!t.moving || t.drag) return;

  t.x += t.vx * dt;
  t.y += t.vy * dt;
  const d = Math.exp(-DAMP * dt);
  t.vx *= d; t.vy *= d;

  const minX = L.pad + t.r, maxX = W - L.pad - t.r;
  const minY = L.topBar + t.r, maxY = H - t.r - 2;
  if (t.x < minX) { t.x = minX; t.vx = Math.abs(t.vx) * 0.45; SND.tock(); }
  if (t.x > maxX) { t.x = maxX; t.vx = -Math.abs(t.vx) * 0.45; SND.tock(); }
  if (t.y < minY) { t.y = minY; t.vy = Math.abs(t.vy) * 0.45; SND.tock(); }
  if (t.y > maxY) { t.y = maxY; t.vy = -Math.abs(t.vy) * 0.45; SND.tock(); }

  if (Math.hypot(t.vx, t.vy) < STOPP) {
    t.vx = 0; t.vy = 0; t.moving = false;
    if (!t.evald) { t.evald = true; landa(t); }
  }
}

/* ---------------- rita ---------------- */
function drawBord() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.woodL); g.addColorStop(0.55, COL.wood); g.addColorStop(1, '#d3a465');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  /* plankor */
  const ph = clamp(H / 7, 70, 150);
  ctx.strokeStyle = 'rgba(160,110,55,.28)'; ctx.lineWidth = 2;
  for (let y = ph; y < H; y += ph) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,240,210,.30)'; ctx.lineWidth = 1.2;
  for (let y = ph + 3; y < H; y += ph) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  /* årsringar */
  ctx.strokeStyle = 'rgba(150,100,50,.13)'; ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const sx = (i * 97.3) % W, sy = (i * 151.7) % H, w = 26 + (i % 5) * 12;
    ctx.beginPath();
    ctx.ellipse(sx, sy, w, w * 0.26, 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRing() {
  const R = G.ring;
  const puls = G.fas === 'klar' ? 1 + 0.05 * Math.sin(G.t * 9) : 1;
  const hint = G.hint && G.fas === 'spel';
  const hp = hint ? 1 + 0.035 * Math.sin(G.t * 5.2) : 1;
  const r = R.r * puls * hp;

  /* ljus insida */
  ctx.beginPath(); ctx.arc(R.x, R.y, r, 0, Math.PI * 2);
  ctx.fillStyle = hint ? 'rgba(255,246,214,.78)' : 'rgba(255,250,243,.52)';
  ctx.fill();

  /* rep */
  ctx.beginPath(); ctx.arc(R.x, R.y, r * 0.94, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.15; ctx.strokeStyle = COL.ropeD; ctx.stroke();
  ctx.beginPath(); ctx.arc(R.x, R.y, r * 0.94, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.10; ctx.strokeStyle = COL.rope; ctx.stroke();

  /* repets tvinn */
  ctx.strokeStyle = 'rgba(120,80,35,.35)'; ctx.lineWidth = Math.max(1, r * 0.02);
  for (let i = 0; i < 18; i++) {
    const a = i * Math.PI / 9;
    ctx.beginPath();
    ctx.arc(R.x, R.y, r * 0.94, a, a + 0.16);
    ctx.stroke();
  }

  /* streckad innerkant */
  ctx.setLineDash([r * 0.10, r * 0.09]);
  ctx.lineWidth = Math.max(1.5, r * 0.022);
  ctx.strokeStyle = hint ? 'rgba(223,166,22,.75)' : 'rgba(168,123,63,.40)';
  ctx.beginPath(); ctx.arc(R.x, R.y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  /* liten stjärna i mitten som mål */
  starPath(R.x, R.y, r * 0.20);
  ctx.fillStyle = hint ? 'rgba(223,166,22,.55)' : 'rgba(168,123,63,.28)';
  ctx.fill();
}

function drawBricka(t) {
  const r = t.r * (t.scale || 1) * (1 + (t.pop > 0 ? Math.max(0, 0.18 - (G.t - t.pop) * 0.5) : 0));
  const f = t.farg;

  el(t.x + r * 0.10, t.y + r * 0.14, r * 1.02, r * 0.96, 'rgba(90,60,30,.20)');

  const g = ctx.createRadialGradient(t.x - r * 0.34, t.y - r * 0.40, r * 0.08, t.x, t.y, r * 1.05);
  g.addColorStop(0, f.ljus); g.addColorStop(0.55, f.col); g.addColorStop(1, f.mork);
  ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();

  ctx.lineWidth = Math.max(2, r * 0.10);
  ctx.strokeStyle = 'rgba(255,255,255,.50)';
  ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.90, 0, Math.PI * 2); ctx.stroke();

  if (t.inRing) {
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.strokeStyle = 'rgba(247,201,72,' + (0.55 + 0.35 * Math.sin(G.t * 5 + t.i)) + ')';
    ctx.beginPath(); ctx.arc(t.x, t.y, r * 1.10, 0, Math.PI * 2); ctx.stroke();
  }

  /* glasglans */
  ctx.beginPath();
  ctx.ellipse(t.x - r * 0.33, t.y - r * 0.38, r * 0.36, r * 0.20, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill();

  starPath(t.x, t.y + r * 0.10, r * 0.34);
  ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill();
}

function drawSikte() {
  const d = G.drag;
  if (!d) return;
  const t = d.tile;
  const dx = d.x - d.x0, dy = d.y - d.y0;
  const len = Math.hypot(dx, dy);

  /* linje från brickan genom fingret */
  if (len > 4) {
    const ux = dx / len, uy = dy / len;
    ctx.setLineDash([9, 9]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(63,58,52,.35)';
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + ux * Math.max(len, 60), t.y + uy * Math.max(len, 60)); ctx.stroke();
    ctx.setLineDash([]);
  }

  /* förhandsvisning av vägen */
  if (len >= 14) {
    const f = Math.min(1, (len - 14) / 190);
    const v = 300 + f * 940;
    let px = t.x, py = t.y, vx = (dx / len) * v, vy = (dy / len) * v;
    const dt = 1 / 60;
    for (let i = 0; i < 70; i++) {
      px += vx * dt; py += vy * dt;
      const e = Math.exp(-DAMP * dt); vx *= e; vy *= e;
      if (px < L.pad + t.r || px > W - L.pad - t.r) vx = -vx * 0.45;
      if (py < L.topBar + t.r || py > H - t.r - 2) vy = -vy * 0.45;
      if (i % 5 === 4) {
        const a = 0.45 * (1 - i / 70);
        el(px, py, 4.5, 4.5, 'rgba(63,58,52,' + a.toFixed(2) + ')');
      }
    }
  }

  /* kraftmätare vid brickan */
  const f2 = clamp((len - 14) / 190, 0, 1);
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r * 1.22, -Math.PI / 2, -Math.PI / 2 + f2 * Math.PI * 2);
  ctx.lineWidth = Math.max(3, t.r * 0.12);
  ctx.strokeStyle = 'rgba(247,201,72,.85)';
  ctx.stroke();
}

function drawHjalplinje() {
  if (!G.hint || G.fas !== 'spel') return;
  let narmast = null, bd = 1e9;
  G.tiles.forEach(function (t) {
    if (t.inRing) return;
    const d = Math.hypot(t.x - G.ring.x, t.y - G.ring.y);
    if (d < bd) { bd = d; narmast = t; }
  });
  if (!narmast) return;
  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(223,166,22,' + (0.45 + 0.25 * Math.sin(G.t * 4)).toFixed(2) + ')';
  ctx.beginPath(); ctx.moveTo(narmast.x, narmast.y); ctx.lineTo(G.ring.x, G.ring.y); ctx.stroke();
  ctx.setLineDash([]);
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
  text('Knäppa brickor', W * 0.035, L.topBar * 0.5,
    fitFont('Knäppa brickor', fs, W * 0.34, 11), COL.ink, 'left');

  /* stjärnorna: en per klar ring */
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
  }
  return { id: typ === 'play' ? 'start' : 'igen', x: cx, y: cy, r: r * p + 12 };
}

function drawIntro() {
  drawBord();

  const titleFs = clamp(Math.min(W * 0.095, H * 0.078), 24, 52);
  const ty = H * (L.portrait ? 0.115 : 0.14);
  text('Knäppa brickor', W / 2, ty, fitFont('Knäppa brickor', titleFs, W * 0.9, 20), COL.ink, 'center');
  text('Dra · sikta · släpp', W / 2, ty + titleFs * 0.95, clamp(titleFs * 0.36, 12, 20), COL.dim, 'center');

  /* en liten demo: ring och tre brickor */
  const rr2 = clamp(Math.min(W * 0.13, H * 0.13), 34, 96);
  const cx = W * 0.5, cy = H * (L.portrait ? 0.40 : 0.44);
  ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,250,243,.55)'; ctx.fill();
  ctx.lineWidth = rr2 * 0.14; ctx.strokeStyle = COL.ropeD; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, Math.PI * 2);
  ctx.lineWidth = rr2 * 0.09; ctx.strokeStyle = COL.rope; ctx.stroke();

  const tr = clamp(rr2 * 0.42, 16, 40);
  const ty2 = cy + rr2 * 1.55;
  for (let i = 0; i < 3; i++) {
    const t = { x: cx + (i - 1) * tr * 2.7, y: ty2, r: tr, i: i, inRing: false, pop: -9, farg: TILEFARG[i] };
    drawBricka(t);
  }

  if (window.KOTTEN) {
    const ks = clamp(H * 0.16, 56, 140);
    ctx.save();
    el(W * 0.10, H * 0.965, ks * 0.30, ks * 0.06, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.10, H * 0.955, ks, { wave: 0.6 + 0.4 * Math.sin(G.t * 2.4) });
    ctx.restore();
  }

  const r = clamp(Math.min(W, H) * 0.072, 32, 58);
  const by = H * (L.portrait ? 0.74 : 0.76);
  const b = drawVidare(W / 2, by, r, 'play', COL.coral);
  const fs2 = clamp(r * 0.40, 11, 15);
  setFont(fs2);
  const tw = ctx.measureText('Börja knäppa').width + 22;
  rr(W / 2 - tw / 2, by + r + 8, tw, fs2 * 1.9, fs2 * 0.95, 'rgba(255,250,243,.92)');
  text('Börja knäppa', W / 2, by + r + 8 + fs2 * 0.95, fs2, COL.ink, 'center');
  G.hits.push(b);
}

function drawSpel() {
  drawBord();
  drawRing();
  drawHjalplinje();
  G.tiles.forEach(function (t) { if (!t.drag) drawBricka(t); });
  drawSikte();
  G.tiles.forEach(function (t) { if (t.drag) drawBricka(t); });
  drawKotten();
  drawHUD();
}

function drawFest() {
  drawBord();
  drawRing();
  G.tiles.forEach(function (t) { if (!t.drag) drawBricka(t); });
  drawSikte();
  G.tiles.forEach(function (t) { if (t.drag) drawBricka(t); });
  drawKotten();
  drawHUD();

  const fs = clamp(Math.min(W * 0.075, H * 0.070), 18, 42);
  text('Bra jobbat!', W / 2, L.topBar + fs * 1.05,
    fitFont('Bra jobbat!', fs, W * 0.8, 16), COL.cream, 'center');

  const r = clamp(Math.min(W, H) * 0.062, 28, 50);
  const bx = W / 2, by = H - r - 24;
  const b = drawVidare(bx, by, r, 'igen', COL.coral);
  const fs2 = clamp(r * 0.40, 11, 15);
  setFont(fs2);
  const tw = ctx.measureText('En gång till').width + 22;
  rr(bx - tw / 2, by - r - fs2 * 1.75, tw, fs2 * 1.9, fs2 * 0.95, 'rgba(255,250,243,.92)');
  text('En gång till', bx, by - r - fs2 * 0.80, fs2, COL.ink, 'center');
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
      else if (G.screen === 'fest') speak(ROST.fest, true);
      else if (G.fas === 'klar') speak(ROST.alla, true);
      else speak(G.hint ? ROST.hint : ROST.dra, true);
      return;
    }
  }
  if (G.screen !== 'spel' && G.screen !== 'fest') return;
  if (G.fas === 'klar') return;
  const t = brickaVid(x, y);
  if (!t) return;
  G.drag = { tile: t, x0: x, y0: y, x: x, y: y };
  t.drag = true;
  t.vx = 0; t.vy = 0; t.moving = false;
  SND.lyft();
}

function onMove(x, y) {
  if (!G.drag) return;
  G.drag.x = x; G.drag.y = y;
}

function onUp(x, y) {
  const d = G.drag;
  if (!d) return;
  G.drag = null;
  const t = d.tile;
  t.drag = false;
  onMove(x, y);
  const dx = x - d.x0, dy = y - d.y0;
  if (!skjut(t, dx, dy)) {
    /* för kort drag: brickan ligger kvar */
    t.moving = false; t.evald = true;
  }
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

  for (let i = 0; i < G.tiles.length; i++) stegFysik(G.tiles[i], dt);

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
  if (!G.drag) return;
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  onMove(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointerup', function (e) {
  const r = cv.getBoundingClientRect();
  onUp(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointercancel', function () {
  if (G.drag) { G.drag.tile.drag = false; G.drag = null; }
});
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* ---------------- start ---------------- */
resize();
nyaBrickor();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
T0 = performance.now();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
requestAnimationFrame(frame);

/* ---------------- testkrok ---------------- */
window.__kb = {
  state: function () {
    return {
      screen: G.screen, fas: G.fas, runda: G.runda, klar: G.klar, misses: G.misses,
      hint: G.hint, ring: { x: Math.round(G.ring.x), y: Math.round(G.ring.y), r: Math.round(G.ring.r) },
      tiles: G.tiles.map(function (t) {
        return {
          x: Math.round(t.x), y: Math.round(t.y), inRing: t.inRing,
          moving: t.moving, drag: t.drag, ret: !!t.ret
        };
      }),
      hits: G.hits.map(function (h) { return h.id; }),
      errs: window.__errs.slice(), size: [W, H]
    };
  },
  start: function () { nyttSpel(); return this.state(); },
  bricka: function (i) { return G.tiles[i]; },
  /* skjut bricka i med vinkel mot ringen och valfri fart */
  skjutMot: function (i, fart) {
    const t = G.tiles[i];
    const dx = G.ring.x - t.x, dy = G.ring.y - t.y;
    const len = Math.hypot(dx, dy) || 1;
    const v = fart || 300 + 940 * Math.min(1, (len * DAMP - 300) / 940);
    t.vx = dx / len * v; t.vy = dy / len * v;
    t.moving = true; t.evald = false; t.runda = G.runda;
    return this.state();
  },
  /* snabbspola fysiken tills allt stannat (och låt landa() köra) */
  stilla: function () {
    for (let k = 0; k < 900; k++) {
      let ror = false;
      for (let i = 0; i < G.tiles.length; i++) {
        const t = G.tiles[i];
        if (t.moving || t.ret) { ror = true; stegFysik(t, 1 / 60); }
      }
      if (!ror) break;
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
    G.screen = 'intro'; G.timers = []; G.drag = null; G.conf = []; G.gnistor = [];
    G.fas = 'spel'; return this.state();
  }
};
