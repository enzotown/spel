/* Blinda ansiktet — fukuwarai, den japanska nyårsleken, för barn 4–7 år.
   Ett tomt ansikte ligger under en duk. Barnet drar sex delar (två ögon,
   två bryn, näsa, mun) från lådan dit det vill, utan att se var de hamnar.
   När sista delen lagts lyfts duken och ansiktet syns — och blir roligt.

   Tränar: kroppsdelarnas namn och läge (över, under, mellan, bredvid),
   rumsuppfattning när synen stängs av, och att våga göra något utan facit.
   Lgr22: språk (kroppsdelar, lägesord), matematik (läge i rummet), motorik.
   Ingen förlust, ingen poäng, ingen läsning. */

'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#3f3a34', dim: '#7d766c', cream: '#fffaf3', paper: '#fffdf7',
  wood: '#e2b877', woodD: '#b98a4d', woodL: '#f0d3a2', seam: '#cfa267',
  skin: '#f8dcc0', skinD: '#e2b48c', skinL: '#fdeade',
  hair: '#7b4f31', hairL: '#96633f',
  mint: '#7bcbb6', mintD: '#4fae94', coral: '#ef8064', coralD: '#c9553f',
  blue: '#6fb3d6', blueD: '#3d7f9c',
  star: '#f7c948', starD: '#dfa616', dark: '#3b2f2a'
};

const ROST = {
  start: 'Blinda ansiktet!',
  dra: 'Lägg delarna på duken och titta sedan!',
  blunda: 'Blunda! Dra delarna från lådan till duken.',
  oga: 'Öga',
  nasa: 'Näsa',
  mun: 'Mun',
  bryn: 'Bryn',
  titta: 'Titta!',
  rolig1: 'Vilket roligt ansikte!',
  rolig2: 'Titta var näsan hamnade!',
  rolig3: 'Hihi, vilken mun du gjorde!',
  nasta: 'Ett till ansikte!',
  fest: 'Nu får du leka fritt!',
  bra: 'Bra jobbat!',
  igen: 'En gång till!',
  hjalp: 'Dra delarna från lådan till duken.'
};

const RUNDOR = 3;
const DELAR = [
  { kind: 'bryn', k: 1.05 }, { kind: 'oga', k: 1.00 }, { kind: 'oga', k: 1.00 },
  { kind: 'nasa', k: 0.95 }, { kind: 'mun', k: 1.15 }, { kind: 'bryn', k: 1.05 }
];

/* ansiktsformer per runda: lite olika ägg, och lite olika plats på papperet */
const ANSIKTEN = [
  { dx: 0.00, dy: 0.00, rx: 1.00, ry: 1.00 },
  { dx: -0.045, dy: 0.01, rx: 1.10, ry: 0.94 },
  { dx: 0.05, dy: -0.01, rx: 0.90, ry: 1.06 }
];

let W = 0, H = 0, DPR = 1, T0 = performance.now();
const L = {};
const G = {
  screen: 'intro', fas: 'spel', t: 0,
  runda: 0, klar: 0,
  parts: [], drag: null, hits: [], conf: [], gnistor: [], timers: [],
  duk: 1, dukTarget: 1, lastDrop: 0, hintat: false, skratt: 0
};
window.__errs = [];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
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
  placeraDelarEfterLayout();
}

function layout() {
  L.portrait = H >= W;
  L.topBar = Math.max(78, H * 0.145);
  L.pad = clamp(W * 0.035, 10, 28);
  L.kottenS = clamp(Math.min(W, H) * 0.135, 50, 116);
  L.kottenX = L.kottenS * 0.50 + 8;
  L.kottenY = H - 4;
  L.starR = clamp(L.topBar * 0.15, 9, 17);
  L.helpR = clamp(L.topBar * 0.24, 16, 24);
  L.helpX = W - L.pad * 0.5 - L.helpR;
  L.helpY = L.topBar * 0.5;

  if (L.portrait) {
    L.trayH = clamp(H * 0.24, 130, 260);
    L.tray = { x: 0, y: H - L.trayH, w: W, h: L.trayH };
    const top = L.topBar + 8, bot = L.tray.y - 8;
    const availW = W - 2 * L.pad, availH = bot - top;
    const bw = Math.min(availW, availH * 0.86), bh = bw / 0.86;
    L.board = { x: (W - bw) / 2, y: top + (availH - bh) / 2, w: bw, h: bh };

    const yRow0 = L.tray.y + L.tray.h * 0.27;
    const yRow1 = L.tray.y + L.tray.h * 0.66;
    /* delarna måste rymmas i lådan: mät mot raderna, inte mot skärmen */
    L.partS = Math.min(L.board.w * 0.098, L.board.h * 0.105,
      (W - 2 * L.pad) / 3 / 2.9,
      (yRow0 - L.tray.y - 6) / 1.25,
      (H - 18 - yRow1) / 1.25);
    L.traySlots = [];
    const ext = L.partS * 1.25;
    const x0 = L.kottenX + L.kottenS * 0.62 + 10;
    const span = W - L.pad - x0;
    for (let i = 0; i < 6; i++) {
      const c = i % 3, r = Math.floor(i / 3);
      L.traySlots.push({
        x: clamp(x0 + span * (c + 0.5) / 3, ext + 6, W - ext - 6),
        y: r === 0 ? yRow0 : yRow1
      });
    }
  } else {
    const tw = clamp(W * 0.28, 200, 340);
    L.tray = { x: W - tw, y: L.topBar, w: tw, h: H - L.topBar };
    const left = L.kottenX + L.kottenS * 0.64 + L.pad;
    const top = L.topBar + 8, bot = H - 10;
    const availW = W - tw - 10 - left, availH = bot - top;
    const bw = Math.min(availW, availH * 0.88), bh = bw / 0.88;
    L.board = { x: left + (availW - bw) / 2, y: top + (availH - bh) / 2, w: bw, h: bh };
    L.partS = Math.min(L.board.w * 0.098, L.board.h * 0.105, tw / 2 / 2.9);
    L.traySlots = [];
    const ext = L.partS * 1.25;
    for (let i = 0; i < 6; i++) {
      const c = i % 2, r = Math.floor(i / 2);
      L.traySlots.push({
        x: clamp(L.tray.x + L.tray.w * (c + 0.5) / 2, L.tray.x + ext + 6, W - ext - 6),
        y: L.tray.y + L.tray.h * (r + 0.5) / 3.15
      });
    }
  }
  L.boardR = Math.min(L.board.w, L.board.h) * 0.045;
  L.btnR = clamp(Math.min(W, H) * 0.062, 28, 52);
}

function ansikte() {
  const v = ANSIKTEN[clamp(G.runda, 0, ANSIKTEN.length - 1)];
  const b = L.board;
  return {
    cx: b.x + b.w * (0.5 + v.dx),
    cy: b.y + b.h * (0.52 + v.dy),
    rx: b.w * 0.30 * v.rx,
    ry: b.h * 0.355 * v.ry
  };
}

/* Efter rotation: delarna måste hitta tillbaka till lådan (eller stanna
   innanför papperet om de redan ligger där), annars hamnar de utanför kanten. */
function placeraDelarEfterLayout() {
  if (!G.parts.length) return;
  G.drag = null;
  const b = L.board;
  G.parts.forEach(function (p, i) {
    p.s = L.partS * p.k;
    const slot = L.traySlots[i] || { x: W / 2, y: H - 60 };
    p.trayX = slot.x; p.trayY = slot.y;
    if (p.placed) {
      p.x = clamp(p.x, b.x + p.s * 0.9, b.x + b.w - p.s * 0.9);
      p.y = clamp(p.y, b.y + p.s * 0.9, b.y + b.h - p.s * 0.9);
    } else {
      p.x = p.trayX; p.y = p.trayY;
    }
  });
}

/* ---------------- text och former ---------------- */
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
  lyft: function () { tone(560, 0.05, 'sine', 0.024); },
  knapp: function () { tone(520, 0.06, 'sine', 0.026); },
  tock: function () { tone(220, 0.08, 'triangle', 0.035); tone(330, 0.06, 'sine', 0.018, 0.03); },
  skratt: function () {
    [520, 470, 520, 440].forEach(function (f, i) { tone(f, 0.09, 'triangle', 0.030, i * 0.11, f * 0.85); });
  },
  stjarna: function () { [880, 1174, 1568].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.035, i * 0.07); }); },
  win: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.30, 'triangle', 0.05, i * 0.10); }); }
};

/* ---------------- röst ---------------- */
function speak(str, now) {
  if (!str) return;
  if (window.__rost && window.__rost(str, now)) return; // röst från Shipholm
}

/* ---------------- delarna ---------------- */
function nyttSpel() {
  G.runda = 0; G.klar = 0; G.screen = 'spel';
  G.conf = []; G.gnistor = []; G.timers = [];
  nyRunda(true);
}

function nyRunda(forsta) {
  G.fas = 'spel';
  G.duk = 1; G.dukTarget = 1;
  G.lastDrop = G.t; G.hintat = false;
  G.parts = DELAR.map(function (d, i) {
    const slot = L.traySlots[i] || { x: W / 2, y: H - 60 };
    return {
      i: i, kind: d.kind, k: d.k,
      s: L.partS * d.k,
      trayX: slot.x, trayY: slot.y,
      x: slot.x, y: slot.y,
      placed: false, rot: (Math.random() - 0.5) * 0.5,
      pop: -9, vinkel: (Math.random() - 0.5) * 0.24
    };
  });
  if (!forsta) speak(ROST.nasta, true);
  else speak(ROST.blunda, true);
}

function antalPlacerade() {
  return G.parts.filter(function (p) { return p.placed; }).length;
}

function delVid(x, y) {
  const b = L.board;
  /* överst först: en del som redan ligger på papperet (bara i fri lek) */
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    if (!p.placed) continue;
    if (Math.hypot(x - p.x, y - p.y) <= p.s * 1.15) return p;
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    if (p.placed) continue;
    if (Math.hypot(x - p.x, y - p.y) <= p.s * 1.25) return p;
  }
  return null;
}

function lagg(p, x, y) {
  const b = L.board;
  if (x < b.x + p.s * 0.6 || x > b.x + b.w - p.s * 0.6 ||
      y < b.y + p.s * 0.6 || y > b.y + b.h - p.s * 0.6) return false;
  p.x = clamp(x, b.x + p.s * 0.9, b.x + b.w - p.s * 0.9);
  p.y = clamp(y, b.y + p.s * 0.9, b.y + b.h - p.s * 0.9);
  if (!p.placed) { p.rot = p.vinkel; p.pop = G.t; }
  p.placed = true;
  SND.tock();
  G.lastDrop = G.t;
  gnistor(p.x, p.y, 5, COL.star);
  if (G.fas === 'spel' && antalPlacerade() === G.parts.length) avsloja();
  return true;
}

function avsloja() {
  G.fas = 'avsloja';
  G.dukTarget = 0;
  const r0 = G.runda;
  G.klar = Math.max(G.klar, r0 + 1);
  later(0.10, function () { speak(ROST.titta, true); SND.win(); });
  later(1.15, function () {
    if (G.runda !== r0) return;          /* barnet hann trycka vidare */
    const rad = [ROST.rolig1, ROST.rolig2, ROST.rolig3][clamp(r0, 0, 2)];
    speak(rad, true); SND.skratt(); G.skratt = G.t;
    SND.stjarna();
    for (let i = 0; i < 34; i++) konfetti(W * 0.5 + (Math.random() - 0.5) * W * 0.5, L.board.y + L.board.h * 0.3, 1);
  });
}

function nasta() {
  if (G.fas !== 'avsloja') return;
  SND.knapp();
  if (G.runda < RUNDOR - 1) { G.runda++; nyRunda(false); }
  else { G.screen = 'fest'; speak(ROST.fest, true); SND.win(); }
}

function gnistor(x, y, n, farg) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 50 + Math.random() * 150;
    G.gnistor.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, liv: 0.7, col: farg || COL.star });
  }
}
function konfetti(x, y, n) {
  const farg = [COL.star, COL.coral, COL.mint, COL.blue, COL.cream];
  for (let i = 0; i < n; i++) {
    G.conf.push({
      x: x, y: y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 220,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 8, s: 6 + Math.random() * 8,
      liv: 1.6 + Math.random(), col: farg[i % farg.length]
    });
  }
}

/* ---------------- ritning: bord, papper, ansikte ---------------- */
function drawBord() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.woodL);
  g.addColorStop(1, COL.wood);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(185,138,77,.30)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 7; i++) {
    const y = H * i / 7;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,250,243,.20)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 97.3) % W, y = (i * 61.7) % H;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPapper() {
  const b = L.board;
  ctx.save();
  ctx.shadowColor = 'rgba(90,60,30,.28)';
  ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  rr(b.x, b.y, b.w, b.h, L.boardR, COL.paper);
  ctx.restore();
  ctx.save();
  rr(b.x, b.y, b.w, b.h, L.boardR);
  ctx.clip();
  ctx.fillStyle = 'rgba(226,210,178,.20)';
  for (let i = 0; i < 26; i++) {
    const x = b.x + ((i * 73.7) % b.w), y = b.y + ((i * 41.3) % b.h);
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  rr(b.x, b.y, b.w, b.h, L.boardR);
  ctx.strokeStyle = 'rgba(185,138,77,.35)'; ctx.lineWidth = 2; ctx.stroke();
}

function drawAnsikte() {
  const a = ansikte();
  /* öron */
  el(a.cx - a.rx * 0.98, a.cy + a.ry * 0.06, a.rx * 0.14, a.ry * 0.15, COL.skinD);
  el(a.cx + a.rx * 0.98, a.cy + a.ry * 0.06, a.rx * 0.14, a.ry * 0.15, COL.skinD);
  /* ansiktet */
  ctx.beginPath(); ctx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(a.cx - a.rx * 0.3, a.cy - a.ry * 0.35, a.rx * 0.2,
    a.cx, a.cy, a.rx * 1.15);
  g.addColorStop(0, COL.skinL); g.addColorStop(1, COL.skin);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = COL.skinD; ctx.lineWidth = Math.max(2, a.rx * 0.022); ctx.stroke();

  /* hår: lugg över pannans överkant */
  ctx.save();
  ctx.beginPath(); ctx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = COL.hair;
  ctx.beginPath();
  ctx.moveTo(a.cx - a.rx, a.cy - a.ry * 0.10);
  ctx.quadraticCurveTo(a.cx - a.rx * 0.5, a.cy - a.ry * 1.02, a.cx, a.cy - a.ry * 1.02);
  ctx.quadraticCurveTo(a.cx + a.rx * 0.5, a.cy - a.ry * 1.02, a.cx + a.rx, a.cy - a.ry * 0.10);
  ctx.lineTo(a.cx + a.rx, a.cy - a.ry * 1.2);
  ctx.lineTo(a.cx - a.rx, a.cy - a.ry * 1.2);
  ctx.closePath(); ctx.fill();
  /* luggen som vågor */
  ctx.fillStyle = COL.hairL;
  for (let i = 0; i < 5; i++) {
    const fx = a.cx - a.rx * 0.72 + i * a.rx * 0.36;
    ctx.beginPath();
    ctx.ellipse(fx, a.cy - a.ry * 0.62 + (i % 2 ? 6 : 0), a.rx * 0.20, a.ry * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* kinder */
  ctx.save();
  ctx.globalAlpha = 0.30;
  el(a.cx - a.rx * 0.60, a.cy + a.ry * 0.28, a.rx * 0.20, a.ry * 0.13, COL.coral);
  el(a.cx + a.rx * 0.60, a.cy + a.ry * 0.28, a.rx * 0.20, a.ry * 0.13, COL.coral);
  ctx.restore();
}

/* ---------------- delarna som bild ---------------- */
function drawDel(kind, x, y, s, rot, alfa) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(s, s);
  if (alfa != null) ctx.globalAlpha = alfa;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'oga') {
    ctx.beginPath(); ctx.ellipse(0, 0, 1, 0.62, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.paper; ctx.fill();
    ctx.strokeStyle = '#c9a887'; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.12, 0.03, 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#5b7f63'; ctx.fill();
    ctx.strokeStyle = '#3f5c46'; ctx.lineWidth = 0.06; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.12, 0.03, 0.19, 0, Math.PI * 2);
    ctx.fillStyle = '#2f3a33'; ctx.fill();
    ctx.beginPath(); ctx.arc(-0.02, -0.12, 0.10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, -0.06); ctx.quadraticCurveTo(0, -0.74, 1, -0.06);
    ctx.strokeStyle = COL.hair; ctx.lineWidth = 0.16; ctx.stroke();
  } else if (kind === 'bryn') {
    ctx.beginPath(); ctx.moveTo(-0.95, 0.20);
    ctx.quadraticCurveTo(-0.10, -0.60, 0.95, -0.02);
    ctx.strokeStyle = COL.hair; ctx.lineWidth = 0.30; ctx.stroke();
  } else if (kind === 'nasa') {
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.95);
    ctx.bezierCurveTo(0.50, -0.70, 0.56, 0.24, 0.34, 0.54);
    ctx.quadraticCurveTo(0, 0.78, -0.34, 0.54);
    ctx.bezierCurveTo(-0.56, 0.24, -0.50, -0.70, -0.08, -0.95);
    ctx.closePath();
    ctx.fillStyle = '#f0c69c'; ctx.fill();
    ctx.strokeStyle = '#c9926a'; ctx.lineWidth = 0.07; ctx.stroke();
    el(-0.19, 0.48, 0.10, 0.07, '#c9926a');
    el(0.19, 0.48, 0.10, 0.07, '#c9926a');
  } else {
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.quadraticCurveTo(-0.45, -0.66, 0, -0.14);
    ctx.quadraticCurveTo(0.45, -0.66, 1, 0);
    ctx.quadraticCurveTo(0.42, 0.74, 0, 0.74);
    ctx.quadraticCurveTo(-0.42, 0.74, -1, 0);
    ctx.closePath();
    ctx.fillStyle = '#d9534f'; ctx.fill();
    ctx.strokeStyle = '#a83b38'; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.78, 0.04);
    ctx.quadraticCurveTo(0, 0.24, 0.78, 0.04);
    ctx.strokeStyle = '#8e2f2d'; ctx.lineWidth = 0.06; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-0.22, 0.42, 0.24, 0.10, -0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  }
  ctx.restore();
}

/* ---------------- lådan med delarna ---------------- */
function drawLada() {
  const t = L.tray;
  if (L.portrait) {
    rr(t.x + 6, t.y + 4, t.w - 12, t.h - 10, 20, 'rgba(150,105,55,.28)');
    rr(t.x + 6, t.y + 2, t.w - 12, t.h - 16, 20, '#d8a866');
    rr(t.x + 12, t.y + 6, t.w - 24, t.h - 26, 15, '#c99455');
    rr(t.x + 12, t.y + 6, t.w - 24, t.h - 34, 15, '#e8c089');
  } else {
    rr(t.x + 6, t.y + 8, t.w - 14, t.h - 16, 20, 'rgba(150,105,55,.28)');
    rr(t.x + 4, t.y + 6, t.w - 16, t.h - 16, 20, '#d8a866');
    rr(t.x + 10, t.y + 12, t.w - 28, t.h - 28, 15, '#c99455');
    rr(t.x + 10, t.y + 12, t.w - 34, t.h - 28, 15, '#e8c089');
  }
  const kvar = antalPlacerade();
  /* fack för det som är kvar */
  G.parts.forEach(function (p) {
    if (p.placed) return;
    ctx.beginPath();
    ctx.ellipse(p.trayX, p.trayY, p.s * 1.18, p.s * 0.92, 0, 0, Math.PI * 2);
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(150,105,55,.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);
  });
  G.parts.forEach(function (p) {
    if (p.placed) return;
    let extra = 0;
    if (G.t - G.lastDrop > 8 && !G.hintat && G.fas === 'spel') {
      extra = 0.10 * Math.sin(G.t * 6);
    }
    drawDel(p.kind, p.trayX, p.trayY, p.s * (1 + extra), p.rot);
  });
  if (G.fas === 'spel') {
    const fs = clamp(L.partS * 0.34, 10, 15);
    text(kvar + ' av 6', L.portrait ? t.x + t.w - 14 : t.x + t.w / 2,
      L.portrait ? t.y + 16 : t.y + t.h - 16, fs, 'rgba(90,60,30,.55)', 'right');
  }
}

/* ---------------- duken ---------------- */
function drawDuk() {
  if (G.duk < 0.01) return;
  const b = L.board, a = ansikte();
  const alfa = Math.min(1, G.duk);
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.shadowColor = 'rgba(120,90,50,.25)';
  ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  rr(b.x + 2, b.y + 2, b.w - 4, b.h - 4, L.boardR - 2, '#cfe8dd');
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alfa;
  rr(b.x + 2, b.y + 2, b.w - 4, b.h - 4, L.boardR - 2);
  ctx.clip();
  /* tygets veck */
  ctx.strokeStyle = 'rgba(143,196,177,.55)';
  ctx.lineWidth = Math.max(3, b.w * 0.006);
  for (let i = 0; i < 7; i++) {
    const x = b.x + b.w * (i + 0.5) / 7;
    ctx.beginPath();
    ctx.moveTo(x, b.y);
    ctx.bezierCurveTo(x + b.w * 0.05, b.y + b.h * 0.33,
      x - b.w * 0.05, b.y + b.h * 0.66, x, b.y + b.h);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 30; i++) {
    const x = b.x + ((i * 53.9) % b.w), y = b.y + ((i * 79.1) % b.h);
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.stroke();
  }
  /* streckad ansiktskontur så barnet vet var ansiktet är */
  ctx.setLineDash([12, 11]);
  ctx.lineWidth = Math.max(3, a.rx * 0.024);
  ctx.strokeStyle = 'rgba(255,253,247,.90)';
  ctx.beginPath(); ctx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  /* sydd kant */
  ctx.setLineDash([9, 8]);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(111,163,146,.75)';
  rr(b.x + 12, b.y + 12, b.w - 24, b.h - 24, L.boardR - 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  /* ett uppvikt hörn, så det syns att det är ett tygstycke */
  ctx.save();
  ctx.globalAlpha = alfa;
  const cs = Math.min(b.w, b.h) * 0.13;
  ctx.beginPath();
  ctx.moveTo(b.x + b.w - 6 - cs, b.y + 6);
  ctx.lineTo(b.x + b.w - 6, b.y + 6);
  ctx.lineTo(b.x + b.w - 6, b.y + 6 + cs);
  ctx.closePath();
  ctx.fillStyle = '#b6d9cb'; ctx.fill();
  ctx.strokeStyle = 'rgba(111,163,146,.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  /* prickar: hur många delar som ligger */
  const n = 6, r = clamp(L.partS * 0.14, 5, 9), gap = r * 3;
  const x0 = b.x + b.w / 2 - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.arc(x0 + i * gap, b.y + b.h - Math.max(26, b.h * 0.06), r, 0, Math.PI * 2);
    ctx.fillStyle = i < antalPlacerade() ? COL.mintD : 'rgba(255,253,247,.85)';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(111,163,146,.55)'; ctx.stroke();
  }
}

/* ---------------- HUD, Kotten, knappar ---------------- */
function drawKotten() {
  if (!window.KOTTEN) return;
  const hopp = G.screen === 'fest' || G.skratt > G.t - 2 ? Math.abs(Math.sin(G.t * 4.4)) * 12 : 0;
  ctx.save();
  el(L.kottenX, L.kottenY - 2, L.kottenS * 0.30, L.kottenS * 0.06, 'rgba(90,70,45,.20)');
  KOTTEN.drawAtFeet(ctx, L.kottenX, L.kottenY - hopp, L.kottenS,
    { wave: 0.55 + 0.45 * Math.sin(G.t * 2.6) });
  ctx.restore();
}

function drawHUD() {
  const fs = clamp(L.topBar * 0.185, 12, 21);
  const titel = 'Blinda ansiktet';
  text(titel, W * 0.035, L.topBar * 0.5, fitFont(titel, fs, W * 0.34, 11), COL.ink, 'left');

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

function drawVidare(cx, cy, r, typ, tint, etikett) {
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
  if (etikett) {
    const fs = clamp(r * 0.40, 11, 15);
    setFont(fs);
    const tw = ctx.measureText(etikett).width + 24;
    const under = typ === 'play';
    const by = under ? cy + r + 8 : cy - r - fs * 1.75;
    rr(cx - tw / 2, by, tw, fs * 1.95, fs * 0.95, 'rgba(255,250,243,.94)');
    text(etikett, cx, by + fs * 0.98, fs, COL.ink, 'center');
  }
  return { id: typ === 'play' ? 'start' : (typ === 'right' ? 'nasta' : 'igen'), x: cx, y: cy, r: r * p + 12 };
}

/* ---------------- skärmar ---------------- */
function drawIntro() {
  drawBord();

  const titleFs = clamp(Math.min(W * 0.095, H * 0.078), 24, 52);
  const ty = H * (L.portrait ? 0.115 : 0.14);
  text('Blinda ansiktet', W / 2, ty, fitFont('Blinda ansiktet', titleFs, W * 0.9, 20), COL.ink, 'center');
  text('Dra · blunda · titta', W / 2, ty + titleFs * 0.95, clamp(titleFs * 0.36, 12, 20), COL.dim, 'center');

  /* demo: ett papper med duk och tre lösa delar */
  const pr = clamp(Math.min(W * 0.18, H * 0.19), 62, 140);
  const cx = W * 0.5, cy = H * (L.portrait ? 0.40 : 0.44);
  ctx.save();
  ctx.shadowColor = 'rgba(90,60,30,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  rr(cx - pr * 0.86, cy - pr, pr * 1.72, pr * 2, pr * 0.18, COL.paper);
  ctx.restore();
  rr(cx - pr * 0.78, cy - pr * 0.92, pr * 1.56, pr * 1.84, pr * 0.16, '#f3e6cd');
  ctx.setLineDash([9, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(150,105,55,.55)';
  ctx.beginPath(); ctx.ellipse(cx, cy, pr * 0.56, pr * 0.66, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  drawDel('oga', cx - pr * 0.42, cy + pr * 1.12, pr * 0.20, -0.15);
  drawDel('nasa', cx, cy + pr * 1.12, pr * 0.19, 0.10);
  drawDel('mun', cx + pr * 0.44, cy + pr * 1.12, pr * 0.23, -0.08);

  if (window.KOTTEN) {
    const ks = clamp(H * 0.16, 56, 140);
    ctx.save();
    el(W * 0.10, H * 0.965, ks * 0.30, ks * 0.06, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.10, H * 0.955, ks, { wave: 0.6 + 0.4 * Math.sin(G.t * 2.4) });
    ctx.restore();
  }

  const r = clamp(Math.min(W, H) * 0.072, 32, 58);
  const by = H * (L.portrait ? 0.76 : 0.78);
  G.hits.push(drawVidare(W / 2, by, r, 'play', COL.coral, 'Börja blunda'));
}

function drawSpel() {
  drawBord();
  drawPapper();
  drawAnsikte();
  G.parts.forEach(function (p) {
    if (p.placed && p !== (G.drag && G.drag.part)) {
      const pop = clamp((G.t - p.pop) * 3.2, 0, 1);
      const sc = 1 + 0.22 * Math.sin(pop * Math.PI);
      drawDel(p.kind, p.x, p.y, p.s * sc, p.rot);
    }
  });
  drawDuk();
  if (G.fas === 'spel') drawLada();
  if (G.drag) drawDel(G.drag.part.kind, G.drag.x, G.drag.y, G.drag.part.s * 1.12, G.drag.part.rot + 0.06);
  drawKotten();
  drawHUD();

  if (G.fas === 'avsloja') {
    const r = L.btnR;
    const cy = L.portrait ? L.tray.y + L.tray.h * 0.48 : H - r - 26;
    const cx = L.portrait ? W * 0.5 + L.kottenS * 0.35 : W - L.tray.w / 2;
    G.hits.push(drawVidare(cx, cy, r, 'right', COL.coral,
      G.runda < RUNDOR - 1 ? 'Nästa ansikte' : 'Leka fritt'));
  }
}

function drawFest() {
  drawBord();
  drawPapper();
  drawAnsikte();
  G.parts.forEach(function (p) {
    if (p === (G.drag && G.drag.part)) return;
    drawDel(p.kind, p.x, p.y, p.s, p.rot);
  });
  if (G.drag) drawDel(G.drag.part.kind, G.drag.x, G.drag.y, G.drag.part.s * 1.1, G.drag.part.rot + 0.06);
  drawKotten();
  drawHUD();

  const fs = clamp(Math.min(W * 0.062, H * 0.055), 15, 32);
  const tx = L.board.x + L.board.w / 2;
  const ty = L.board.y + fs * 1.35;
  setFont(fs);
  const tw = ctx.measureText('Bra jobbat!').width + fs * 1.8;
  rr(tx - tw / 2, ty - fs * 1.05, tw, fs * 2.1, fs, 'rgba(255,250,243,.92)');
  text('Bra jobbat!', tx, ty, fs, COL.ink, 'center');

  const r = L.btnR;
  const cy = L.portrait ? H - r - 30 : H - r - 26;
  const cx = L.portrait ? W * 0.55 : W - L.tray.w / 2;
  G.hits.push(drawVidare(cx, cy, r, 'igen', COL.coral, 'En gång till'));
}

/* ---------------- pek ---------------- */
function hitAt(x, y) {
  for (let i = G.hits.length - 1; i >= 0; i--) {
    const h = G.hits[i];
    if (h.r != null) {
      if ((x - h.x) * (x - h.x) + (y - h.y) * (y - h.y) <= h.r * h.r) return h;
    }
  }
  return null;
}

function onDown(x, y) {
  audio();
  const h = hitAt(x, y);
  if (h) {
    const id = String(h.id);
    if (id === 'start' || id === 'igen') {
      SND.knapp();
      G.screen = 'spel'; nyttSpel();
      return;
    }
    if (id === 'nasta') { nasta(); return; }
    if (id === 'hjalp') {
      SND.knapp();
      if (G.screen === 'intro') speak(ROST.start, true);
      else if (G.screen === 'fest') speak(ROST.fest, true);
      else speak(G.fas === 'avsloja' ? ROST.titta : ROST.hjalp, true);
      return;
    }
  }
  if (G.screen !== 'spel' && G.screen !== 'fest') return;
  if (G.screen === 'spel' && G.fas !== 'spel') return;
  const p = delVid(x, y);
  if (!p) return;
  G.drag = { part: p, x: x, y: y, ox: p.x, oy: p.y };
  SND.lyft();
  speak(ROST[p.kind] || '', true);
}

function onMove(x, y) {
  if (!G.drag) return;
  G.drag.x = x; G.drag.y = y;
}

function onUp(x, y) {
  const d = G.drag;
  if (!d) return;
  G.drag = null;
  onMove(x, y);
  const p = d.part;
  if (G.screen === 'fest') {
    const b = L.board;
    if (x > b.x + p.s * 0.4 && x < b.x + b.w - p.s * 0.4 &&
        y > b.y + p.s * 0.4 && y < b.y + b.h - p.s * 0.4) {
      p.x = clamp(x, b.x + p.s * 0.9, b.x + b.w - p.s * 0.9);
      p.y = clamp(y, b.y + p.s * 0.9, b.y + b.h - p.s * 0.9);
      SND.tock();
    } else {
      p.x = d.ox; p.y = d.oy;
    }
    return;
  }
  if (!lagg(p, x, y)) {
    /* utanför papperet: delen går tillbaka till lådan */
    p.x = p.trayX; p.y = p.trayY;
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

  if (G.duk > G.dukTarget) G.duk = Math.max(G.dukTarget, G.duk - dt * 1.5);
  else if (G.duk < G.dukTarget) G.duk = Math.min(G.dukTarget, G.duk + dt * 1.5);

  if (G.fas === 'spel' && !G.hintat && G.t - G.lastDrop > 10 && G.screen === 'spel') {
    G.hintat = true;
    speak(ROST.hjalp, true);
  }

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
  if (G.drag) {
    const p = G.drag.part;
    if (!p.placed) { p.x = p.trayX; p.y = p.trayY; }
    G.drag = null;
  }
});
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* ---------------- start ---------------- */
resize();
G.parts = DELAR.map(function (d, i) {
  const slot = L.traySlots[i] || { x: W / 2, y: H - 60 };
  return {
    i: i, kind: d.kind, k: d.k, s: L.partS * d.k,
    trayX: slot.x, trayY: slot.y, x: slot.x, y: slot.y,
    placed: false, rot: 0, pop: -9, vinkel: 0
  };
});
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
T0 = performance.now();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
requestAnimationFrame(frame);

/* ---------------- testkrok ---------------- */
window.__ba = {
  state: function () {
    return {
      screen: G.screen, fas: G.fas, runda: G.runda, klar: G.klar,
      duk: Math.round(G.duk * 100) / 100, placerade: antalPlacerade(),
      parts: G.parts.map(function (p) {
        return { i: p.i, kind: p.kind, placed: p.placed, x: Math.round(p.x), y: Math.round(p.y) };
      }),
      hits: G.hits.map(function (h) { return h.id; }),
      errs: window.__errs.slice(), size: [W, H],
      board: { x: Math.round(L.board.x), y: Math.round(L.board.y), w: Math.round(L.board.w), h: Math.round(L.board.h) },
      tray: L.traySlots.map(function (s) { return [Math.round(s.x), Math.round(s.y)]; })
    };
  },
  start: function () { nyttSpel(); return this.state(); },
  /* lägg del i på en punkt (samma väg som ett släpp) */
  lagg: function (i, x, y) { const p = G.parts[i]; return lagg(p, x, y) && this.state(); },
  /* spela en hel runda: lägg alla delar huller om buller på papperet */
  runda: function () {
    const b = L.board;
    G.parts.forEach(function (p, i) {
      if (p.placed) return;
      const fx = [0.30, 0.68, 0.42, 0.58, 0.50, 0.34][i % 6];
      const fy = [0.34, 0.30, 0.52, 0.56, 0.40, 0.70][i % 6];
      lagg(p, b.x + b.w * fx, b.y + b.h * fy);
    });
    return this.state();
  },
  nasta: function () { nasta(); return this.state(); },
  fest: function () { G.screen = 'fest'; return this.state(); },
  ansikte: ansikte,
  duk: function () { return G.duk; }
};
