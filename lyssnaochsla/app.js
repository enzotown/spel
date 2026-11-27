/* Lyssna och slå — karuta på mattan.
   Sex bildkort ligger utspridda på en matta. Kotten säger ett ord och barnet slår
   (trycker) på kortet med den bilden. Rätt kort lyfts, vänds och flyger ner i barnets
   hög; fel kort vickar vänligt och ordet sägs igen. När alla sex är tagna läggs sex
   nya kort fram — tre omgångar, arton ord, sedan fest.

   Tränar: lyssnarförståelse (höra ett ord och koppla det till en bild), ordförråd,
   koncentration utan tidspress. Lgr22: språk och kommunikation, ord för företeelser.
   Ingen förlust, ingen klocka, ingen text att läsa — bilden och rösten bär. */
'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#3f3a34', dim: '#7d766c', cream: '#fffaf3', paper: '#fffdf7',
  mat: '#e8d3ab', matD: '#d8bd8d', matL: '#f3e3c4', edge: '#c9a978',
  mint: '#7bcbb6', mintD: '#4fae94', coral: '#ef8064', coralD: '#c9553f',
  star: '#f7c948', starD: '#dfa616', wood: '#d8a866', woodD: '#a87b3f',
  dark: '#3b2f2a'
};

/* ---------------- orden och deras bilder ---------------- */
/* Varje bild ritas i en 100×100-ruta med origo i hörnet. */
function el(x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
}
function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
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
    const rr2 = i % 2 ? r * 0.46 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

const BILD = {
  boll() {
    el(50, 53, 34, 34, COL.coral);
    ctx.save();
    ctx.beginPath(); ctx.arc(50, 53, 34, 0, Math.PI * 2); ctx.clip();
    rect(10, 44, 80, 11, COL.cream);
    rect(10, 66, 80, 7, COL.cream);
    ctx.restore();
    el(50, 53, 34, 34, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(50, 53, 34, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(160,60,40,.35)'; ctx.lineWidth = 2.5; ctx.stroke();
    el(37, 38, 9, 7, 'rgba(255,255,255,.55)');
  },
  katt() {
    ctx.strokeStyle = '#d9a25c'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(72, 74); ctx.quadraticCurveTo(92, 66, 86, 46); ctx.stroke();
    el(48, 68, 26, 22, '#f0b96b');
    el(48, 40, 25, 22, '#f5c47c');
    tri([27, 26], [24, 6], [44, 18], '#f5c47c');
    tri([69, 26], [72, 6], [52, 18], '#f5c47c');
    tri([30, 24], [29, 13], [39, 19], '#ef9f8a');
    tri([66, 24], [67, 13], [57, 19], '#ef9f8a');
    el(39, 38, 4, 4.6, COL.ink); el(57, 38, 4, 4.6, COL.ink);
    el(38, 36.4, 1.4, 1.6, '#fff'); el(56, 36.4, 1.4, 1.6, '#fff');
    tri([45, 48], [51, 48], [48, 52], '#e08a7a');
    ctx.strokeStyle = 'rgba(80,60,45,.55)'; ctx.lineWidth = 1.8;
    [[20, 44], [20, 50], [76, 44], [76, 50]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x < 50 ? 33 : 63, y + 1); ctx.stroke();
    });
    el(38, 84, 10, 5, '#f0b96b'); el(58, 84, 10, 5, '#f0b96b');
  },
  hund() {
    ctx.strokeStyle = '#b87a45'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(74, 66); ctx.quadraticCurveTo(92, 52, 84, 36); ctx.stroke();
    el(52, 68, 27, 20, '#c98a54');
    el(30, 40, 22, 21, '#d99a62');
    el(13, 46, 9, 15, '#a86a3c');
    el(47, 34, 10, 13, '#a86a3c');
    el(24, 50, 13, 10, '#f0d8bc');
    el(15, 47, 4.6, 4, '#3b2f2a');
    el(36, 34, 4, 4.6, COL.ink);
    el(35, 32.4, 1.4, 1.6, '#fff');
    ctx.strokeStyle = '#3b2f2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(16, 54); ctx.quadraticCurveTo(24, 60, 30, 54); ctx.stroke();
    rect(36, 80, 9, 12, '#c98a54'); rect(62, 80, 9, 12, '#c98a54');
  },
  fisk() {
    tri([24, 52], [4, 30], [4, 74], '#e08a4a');
    el(50, 52, 30, 21, '#f2a25c');
    tri([44, 34], [56, 20], [62, 36], '#e08a4a');
    el(70, 46, 5, 5.4, '#fffdf7');
    el(71, 46, 2.6, 3, COL.ink);
    ctx.strokeStyle = '#c96b34'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(78, 58); ctx.quadraticCurveTo(72, 62, 66, 58); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(50, 52, 16, -0.9, 0.2); ctx.stroke();
  },
  stjarna() {
    starPath(50, 50, 42); ctx.fillStyle = COL.star; ctx.fill();
    starPath(50, 50, 42); ctx.strokeStyle = COL.starD; ctx.lineWidth = 3; ctx.stroke();
    starPath(50, 52, 20); ctx.fillStyle = '#ffe89a'; ctx.fill();
  },
  hatt() {
    rr(30, 22, 40, 50, 6, '#4b4553');
    rect(30, 56, 40, 10, COL.coral);
    rr(10, 68, 80, 13, 6.5, '#4b4553');
    rect(34, 30, 8, 24, 'rgba(255,255,255,.14)');
  },
  bil() {
    rr(26, 30, 46, 22, 9, '#e05c48');
    rr(10, 46, 80, 24, 10, COL.coral);
    rect(31, 35, 16, 13, '#cfe9f2');
    rect(51, 35, 16, 13, '#cfe9f2');
    el(28, 72, 12, 12, '#3b2f2a'); el(28, 72, 5, 5, '#d8d2c8');
    el(72, 72, 12, 12, '#3b2f2a'); el(72, 72, 5, 5, '#d8d2c8');
    el(86, 56, 4, 4, '#ffe9a8');
  },
  buss() {
    rr(8, 24, 84, 50, 10, '#f5c948');
    rect(8, 52, 84, 9, '#e0ae2c');
    rect(16, 31, 16, 15, '#cfe9f2');
    rect(36, 31, 16, 15, '#cfe9f2');
    rect(56, 31, 16, 15, '#cfe9f2');
    rect(76, 31, 10, 15, '#cfe9f2');
    el(26, 76, 11, 11, '#3b2f2a'); el(26, 76, 4.6, 4.6, '#d8d2c8');
    el(72, 76, 11, 11, '#3b2f2a'); el(72, 76, 4.6, 4.6, '#d8d2c8');
  },
  blomma() {
    ctx.strokeStyle = '#6aa25c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(50, 60); ctx.lineTo(50, 92); ctx.stroke();
    el(38, 78, 12, 7, '#7cb96b');
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      el(50 + Math.cos(a) * 19, 44 + Math.sin(a) * 19, 14, 14, i % 2 ? '#f08fb0' : '#e97a9e');
    }
    el(50, 44, 13, 13, COL.star);
    el(50, 44, 7, 7, '#e8b02c');
  },
  apple() {
    ctx.strokeStyle = '#7a5a32'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(50, 24); ctx.lineTo(52, 12); ctx.stroke();
    el(64, 16, 12, 6, '#7cb96b');
    ctx.beginPath();
    ctx.moveTo(50, 26);
    ctx.bezierCurveTo(24, 20, 12, 44, 20, 64);
    ctx.bezierCurveTo(28, 84, 44, 90, 50, 84);
    ctx.bezierCurveTo(56, 90, 72, 84, 80, 64);
    ctx.bezierCurveTo(88, 44, 76, 20, 50, 26);
    ctx.fillStyle = '#e0553f'; ctx.fill();
    el(36, 46, 8, 12, 'rgba(255,255,255,.28)');
  },
  banan() {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d9a83a'; ctx.lineWidth = 24;
    ctx.beginPath(); ctx.moveTo(24, 26); ctx.quadraticCurveTo(24, 74, 78, 78); ctx.stroke();
    ctx.strokeStyle = '#f5d76e'; ctx.lineWidth = 19;
    ctx.beginPath(); ctx.moveTo(24, 26); ctx.quadraticCurveTo(24, 74, 78, 78); ctx.stroke();
    ctx.strokeStyle = '#6f5a2a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(24, 20); ctx.lineTo(24, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(74, 78); ctx.lineTo(80, 79); ctx.stroke();
  },
  mane() {
    ctx.beginPath();
    ctx.arc(48, 50, 34, Math.PI * 0.44, Math.PI * 1.56, false);
    ctx.arc(60, 50, 27, Math.PI * 1.56, Math.PI * 0.44, true);
    ctx.closePath();
    ctx.fillStyle = COL.star; ctx.fill();
    ctx.strokeStyle = COL.starD; ctx.lineWidth = 2.4; ctx.stroke();
    el(28, 44, 3, 3.4, 'rgba(200,160,40,.5)');
    el(22, 58, 2.4, 2.6, 'rgba(200,160,40,.5)');
    el(32, 66, 2, 2.2, 'rgba(200,160,40,.45)');
  },
  sol() {
    ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2;
      ctx.beginPath();
      ctx.moveTo(50 + Math.cos(a) * 32, 50 + Math.sin(a) * 32);
      ctx.lineTo(50 + Math.cos(a) * 45, 50 + Math.sin(a) * 45);
      ctx.stroke();
    }
    el(50, 50, 26, 26, COL.star);
    el(50, 50, 19, 19, '#ffe17a');
  },
  sko() {
    ctx.beginPath();
    ctx.moveTo(14, 72);
    ctx.lineTo(14, 50);
    ctx.quadraticCurveTo(14, 36, 30, 36);
    ctx.lineTo(46, 36);
    ctx.quadraticCurveTo(56, 36, 62, 48);
    ctx.quadraticCurveTo(76, 54, 86, 66);
    ctx.lineTo(86, 72);
    ctx.closePath();
    ctx.fillStyle = '#a8714a'; ctx.fill();
    rr(10, 70, 80, 12, 6, '#6f4a30');
    ctx.strokeStyle = '#fff3dd'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, 44); ctx.lineTo(52, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 52); ctx.lineTo(54, 52); ctx.stroke();
  },
  mugg() {
    ctx.strokeStyle = '#3f9c86'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(74, 52, 13, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
    rr(22, 28, 52, 56, 9, COL.mint);
    el(48, 30, 26, 7, '#e8d3ab');
    el(48, 30, 21, 5, '#8a5a34');
    rect(28, 40, 7, 34, 'rgba(255,255,255,.32)');
  },
  nyckel() {
    ctx.strokeStyle = '#d9a83a'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.arc(30, 40, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f0c860'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(30, 40, 15, 0, Math.PI * 2); ctx.stroke();
    rr(42, 35, 44, 11, 4, '#d9a83a');
    rr(64, 44, 8, 18, 3, '#d9a83a');
    rr(78, 44, 8, 13, 3, '#d9a83a');
    el(30, 40, 5, 5, '#8a6a1e');
  },
  klocka() {
    tri([22, 24], [10, 8], [34, 14], COL.coralD);
    tri([78, 24], [90, 8], [66, 14], COL.coralD);
    el(50, 52, 36, 36, COL.coral);
    el(50, 52, 29, 29, COL.cream);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(50, 52); ctx.lineTo(50, 34); ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(50, 52); ctx.lineTo(66, 58); ctx.stroke();
    el(50, 52, 3.4, 3.4, COL.ink);
    rect(44, 86, 12, 8, COL.coralD);
  },
  tarta() {
    el(50, 86, 40, 6, 'rgba(120,95,60,.18)');
    rr(16, 58, 68, 26, 6, '#f6e2c2');
    rr(16, 50, 68, 12, 6, '#f08fb0');
    rr(16, 36, 68, 18, 7, '#fbeedd');
    ctx.strokeStyle = '#f08fb0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(18, 44); ctx.quadraticCurveTo(50, 54, 82, 44); ctx.stroke();
    el(50, 28, 7, 7, '#c9553f');
    rect(48, 10, 5, 14, '#fffaf3');
    el(50, 8, 4, 6, COL.star);
  }
};

const ORD = [
  { id: 'boll', ord: 'boll' },
  { id: 'katt', ord: 'katt' },
  { id: 'hund', ord: 'hund' },
  { id: 'fisk', ord: 'fisk' },
  { id: 'stjarna', ord: 'stjärna' },
  { id: 'hatt', ord: 'hatt' },
  { id: 'bil', ord: 'bil' },
  { id: 'buss', ord: 'buss' },
  { id: 'blomma', ord: 'blomma' },
  { id: 'apple', ord: 'äpple' },
  { id: 'banan', ord: 'banan' },
  { id: 'mane', ord: 'måne' },
  { id: 'sol', ord: 'sol' },
  { id: 'sko', ord: 'sko' },
  { id: 'mugg', ord: 'mugg' },
  { id: 'nyckel', ord: 'nyckel' },
  { id: 'klocka', ord: 'klocka' },
  { id: 'tarta', ord: 'tårta' }
];

const ROST = {
  start: 'Lyssna och slå!',
  hjalp: 'Lyssna! Slå på bilden som Kotten säger.',
  ratt: 'Rätt!',
  fel: 'Prova igen.',
  titta: 'Titta här!',
  runda: 'Alla sex har du!',
  klar: 'Bra jobbat! Nu kan du alla ord.',
  igen: 'Högtalaren säger ordet igen.'
};

/* ---------------- tillstånd ---------------- */
let W = 0, H = 0, DPR = 1, T0 = performance.now();
const L = {};
const G = {
  screen: 'intro', runda: 1, kort: [], fraga: -1, tagna: [], rundaTagna: 0, flyg: [], conf: [],
  t: 0, hits: [], misses: 0, nextDo: null, nextAt: 0, sayDo: null, sayAt: 0,
  pool: [], spelad: [], festT: -9, svarT: 0
};
window.__errs = [];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

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
}

function layout() {
  L.portrait = H >= W;
  L.s = clamp(Math.min(W / 900, H / 700), 0.62, 1.4);
  L.topBar = Math.max(78, H * 0.145);
  L.pileH = clamp(H * (L.portrait ? 0.155 : 0.175), 78, 190);

  const top = L.topBar + 6;
  const bottom = H - L.pileH - 4;
  const cols = L.portrait ? 2 : 3;
  const rows = 6 / cols;
  const bx = W * 0.035, bw = W * 0.93;
  const bh = bottom - top;
  const cw = bw / cols, ch = bh / rows;
  const cardH = Math.min(ch * 0.88, cw * 0.90 / 0.78);
  const cardW = cardH * 0.78;
  L.cardW = cardW; L.cardH = cardH;
  L.pos = [];
  for (let i = 0; i < 6; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    L.pos.push({
      x: bx + cw * (c + 0.5),
      y: top + ch * (r + 0.5),
      rot: [-0.035, 0.026, -0.022, 0.032, -0.028, 0.020][i]
    });
  }

  // stjärnrad i toppen
  L.starR = clamp(L.topBar * 0.115, 8, 17);
  L.starGap = L.starR * 2.55;
  L.starY = L.topBar * 0.52;
  L.starX0 = W / 2 - L.starGap * 2.5;

  // högtalarknapp uppe till höger
  L.spR = clamp(L.topBar * 0.30, 22, 40);
  L.spX = W - L.spR - Math.max(10, W * 0.022);
  L.spY = L.topBar * 0.5;

  // Kotten och högen nere på mattan
  L.kottenS = clamp(L.pileH * 0.86, 58, 160);
  L.kottenX = W * (L.portrait ? 0.14 : 0.09);
  L.pileX = W * (L.portrait ? 0.44 : 0.30);
  L.pileY = H - L.pileH * 0.52;
  L.miniW = clamp(L.pileH * 0.42, 28, 72);
  L.miniH = L.miniW / 0.78;
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

/* ---------------- ljud ---------------- */
let actx = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
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
  tryck: () => tone(520, 0.06, 'sine', 0.026),
  klapp: () => { tone(180, 0.07, 'triangle', 0.05); tone(90, 0.10, 'sine', 0.03, 0.01); },
  ratt: () => { tone(784, 0.12, 'triangle', 0.045); tone(1046, 0.13, 'triangle', 0.038, 0.08); tone(1318, 0.16, 'triangle', 0.03, 0.16); },
  fel: () => { tone(400, 0.12, 'sine', 0.028, 0, 300); tone(300, 0.13, 'sine', 0.02, 0.11, 230); },
  hjalp: () => { tone(880, 0.08, 'sine', 0.026); tone(1174, 0.09, 'sine', 0.024, 0.09); },
  win: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.05, i * 0.1)); }
};

/* ---------------- röst ---------------- */

function speak(str, now) {
  /* rösten är en inspelad mp3-fil (Shipholm TTS) – saknas den är appen tyst */
  if (!str) return;
  if (window.__rost && window.__rost(str)) return;
}

/* ---------------- kort ---------------- */
function drawKort(kort, x, y, w, h, rot, alpha, scale, utanOrd) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (scale) ctx.scale(scale, scale);

  const hw = w / 2, hh = h / 2;
  ctx.shadowColor = 'rgba(90,70,45,.30)';
  ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
  rr(-hw, -hh, w, h, w * 0.08, COL.paper);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.beginPath();
  rr(-hw + 1.5, -hh + 1.5, w - 3, h - 3, w * 0.075);
  ctx.strokeStyle = 'rgba(160,130,90,.45)'; ctx.lineWidth = 2; ctx.stroke();

  const pic = Math.min(w * 0.70, h * 0.52);
  const cy = -hh + h * 0.42;
  ctx.save();
  ctx.translate(-pic / 2, cy - pic / 2);
  ctx.scale(pic / 100, pic / 100);
  try { BILD[kort.id](); } catch (e) { window.__errs.push('bild ' + kort.id + ': ' + e.message); }
  ctx.restore();

  if (!utanOrd) {
    const fs = fitFont(kort.ord, Math.min(w * 0.20, h * 0.13), w * 0.82, 10);
    text(kort.ord, 0, hh - h * 0.145, fs, COL.ink, 'center');
  }
  ctx.restore();
}

function drawMatta() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f6ead2');
  g.addColorStop(0.45, COL.matL);
  g.addColorStop(1, COL.mat);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // tatami-flätning: tunna vågräta band
  ctx.strokeStyle = 'rgba(190,160,110,.30)';
  ctx.lineWidth = 1.2;
  const step = Math.max(14, H * 0.028);
  for (let y = L.topBar * 0.2; y < H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // mörkare kant nere och uppe
  ctx.fillStyle = 'rgba(190,160,110,.28)';
  ctx.fillRect(0, L.topBar - 3, W, 3);
  ctx.fillRect(0, H - L.pileH, W, 3);
}

function drawHUD() {
  // sex stjärnor = kvitto på hur många kort som tagits den här omgången
  for (let i = 0; i < 6; i++) {
    const x = L.starX0 + i * L.starGap, y = L.starY;
    const tagen = i < G.rundaTagna;
    if (tagen) {
      const p = 1 + 0.05 * Math.sin(G.t * 5 + i);
      starPath(x, y, L.starR * p); ctx.fillStyle = COL.star; ctx.fill();
      starPath(x, y, L.starR * p); ctx.strokeStyle = COL.starD; ctx.lineWidth = 1.6; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, L.starR * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(150,125,90,.45)'; ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // högtalare: säg ordet igen
  const p = 1 + 0.03 * Math.sin(G.t * 4.4);
  el(L.spX, L.spY + 2, L.spR * p, L.spR * p, 'rgba(90,70,45,.16)');
  el(L.spX, L.spY, L.spR * p, L.spR * p, COL.cream);
  ctx.beginPath(); ctx.arc(L.spX, L.spY, L.spR * p, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(160,130,90,.5)'; ctx.lineWidth = 2; ctx.stroke();
  const r = L.spR;
  ctx.fillStyle = COL.mintD;
  ctx.beginPath();
  ctx.moveTo(L.spX - r * 0.44, L.spY - r * 0.20);
  ctx.lineTo(L.spX - r * 0.18, L.spY - r * 0.20);
  ctx.lineTo(L.spX + r * 0.10, L.spY - r * 0.48);
  ctx.lineTo(L.spX + r * 0.10, L.spY + r * 0.48);
  ctx.lineTo(L.spX - r * 0.18, L.spY + r * 0.20);
  ctx.lineTo(L.spX - r * 0.44, L.spY + r * 0.20);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = COL.mintD; ctx.lineWidth = r * 0.10; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(L.spX + r * 0.14, L.spY, r * (0.30 + i * 0.24), -0.7, 0.7);
    ctx.stroke();
  }
  G.hits.push({ id: 'spela', x: L.spX, y: L.spY, r: L.spR * p + 14 });
}

function drawPile() {
  // Kotten står vid högen och tittar på
  if (window.KOTTEN) {
    ctx.save();
    el(L.kottenX, H - L.pileH * 0.10, L.kottenS * 0.26, L.kottenS * 0.055, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, L.kottenX, H - L.pileH * 0.12, L.kottenS, { wave: G.screen === 'fest' || G.tagna.length === 6 });
    ctx.restore();
  }
  // högen: ett litet kort per taget ord, solfjäder kring pileX
  const n = G.tagna.length;
  const off = clamp((W * 0.42) / Math.max(1, n), 4, L.miniW * 0.18);
  G.tagna.forEach((id, i) => {
    const ord = ORD.find(o => o.id === id) || { id: id, ord: '' };
    const x = L.pileX + (i - (n - 1) / 2) * off;
    const y = L.pileY - i * 1.6;
    drawKort(ord, x, y, L.miniW, L.miniH, (i % 2 ? 0.07 : -0.06), 1, 1, true);
  });
}

function drawBoard() {
  G.kort.forEach((k, i) => {
    if (k.tagen) return;
    const p = L.pos[i];
    let x = p.x, y = p.y, rot = p.rot;
    // vick när barnet slog fel
    const wob = G.t - k.wob;
    if (wob >= 0 && wob < 0.55) {
      rot += Math.sin(wob * 42) * 0.075 * (1 - wob / 0.55);
      y += Math.sin(wob * 30) * 3 * (1 - wob / 0.55);
    }
    if (k.glow) {
      const g = 0.5 + 0.5 * Math.sin(G.t * 6);
      ctx.save();
      ctx.shadowColor = 'rgba(247,201,72,' + (0.5 + 0.4 * g) + ')';
      ctx.shadowBlur = 26 + 12 * g;
      rr(x - L.cardW / 2, y - L.cardH / 2, L.cardW, L.cardH, L.cardW * 0.08, 'rgba(255,250,243,.9)');
      ctx.restore();
    }
    drawKort(k, x, y, L.cardW, L.cardH, rot, 1, 1);
    G.hits.push({ id: 'kort:' + i, x: x, y: y, w: L.cardW * 1.02, h: L.cardH * 1.02 });
  });

  // kort som flyger ner i högen
  G.flyg.forEach(f => {
    const k = clamp((G.t - f.t0) / 0.45, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    const x = f.x0 + (f.x1 - f.x0) * e;
    const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * L.cardH * 0.18;
    const s = 1 - 0.62 * e;
    drawKort(f.kort, x, y, L.cardW, L.cardH, f.rot + e * 0.5, 1 - 0.25 * e, s);
  });
  G.flyg = G.flyg.filter(f => G.t - f.t0 < 0.55);
}

/* ---------------- skärmar ---------------- */
function drawIntro() {
  drawMatta();
  const titleFs = clamp(Math.min(W * 0.082, H * 0.070), 24, 48);
  const ty = H * (L.portrait ? 0.115 : 0.135);
  text('Lyssna och slå', W / 2, ty, titleFs, COL.ink, 'center');
  text('Hör ordet — slå på bilden', W / 2, ty + titleFs * 0.92, clamp(titleFs * 0.36, 12, 19), COL.dim, 'center');

  // tre exempelkort på sned
  const ex = [ORD[0], ORD[6], ORD[8]];
  const cw = clamp(Math.min(W * (L.portrait ? 0.28 : 0.20), H * 0.20), 70, 190);
  const chh = cw / 0.78;
  const cy = H * (L.portrait ? 0.47 : 0.52);
  const gap = cw * 0.78;
  ex.forEach((o, i) => {
    const x = W / 2 + (i - 1) * gap;
    const y = cy + (i === 1 ? -chh * 0.06 : 0);
    drawKort(o, x, y, cw, chh, (i - 1) * 0.10, 1, 1);
  });

  // Kotten hälsar
  if (window.KOTTEN) {
    const ks = clamp(H * 0.20, 70, 190);
    ctx.save();
    el(W * 0.13, H * 0.955, ks * 0.26, ks * 0.055, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.13, H * 0.94, ks, { wave: true });
    ctx.restore();
  }

  // börja-knapp
  const r = clamp(Math.min(W, H) * 0.075, 34, 62);
  const by = H * (L.portrait ? 0.79 : 0.80);
  const b = drawVidare(W / 2, by, r, 'play', COL.mint);
  text('Börja', W / 2, by + r + 22, clamp(r * 0.42, 11, 16), COL.dim, 'center');
  G.hits.push(b);
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

function drawSpel() {
  drawMatta();
  drawHUD();
  drawBoard();
  drawPile();
  // om barnet är på väg att svara: en liten mjuk ring runt frågans kort efter en stund
  if (G.fraga >= 0 && G.misses === 0 && G.t - G.svarT > 6) {
    const p = L.pos[G.fraga];
    const g = 0.5 + 0.5 * Math.sin(G.t * 4);
    ctx.beginPath();
    ctx.arc(p.x, p.y, L.cardH * (0.56 + 0.02 * g), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(247,201,72,' + (0.30 + 0.25 * g) + ')';
    ctx.lineWidth = 4; ctx.stroke();
  }
}

function drawFest() {
  drawMatta();
  const k = clamp((G.t - G.festT) / 0.6, 0, 1);
  const titleFs = clamp(Math.min(W * 0.078, H * 0.066), 22, 44);
  text('Bra jobbat!', W / 2, H * (L.portrait ? 0.13 : 0.15), titleFs, COL.ink, 'center');
  text('Du hittade alla arton orden', W / 2, H * (L.portrait ? 0.13 : 0.15) + titleFs * 0.95,
    clamp(titleFs * 0.38, 12, 19), COL.dim, 'center');

  // alla ord i en solfjäder
  const n = ORD.length;
  const cols = L.portrait ? 6 : 9;
  const cw = clamp(Math.min(W * 0.92 / cols * 0.94, H * 0.16 / 0.78), 30, 120);
  const chh = cw / 0.78;
  const rows = Math.ceil(n / cols);
  const top = H * (L.portrait ? 0.25 : 0.30);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const x = W / 2 + (c - (cols - 1) / 2) * cw * 1.04;
    const y = top + r * chh * 1.04;
    drawKort(ORD[i], x, y, cw, chh, ((i % 3) - 1) * 0.03, 1, 1);
  }

  if (window.KOTTEN) {
    const ks = clamp(H * 0.19, 66, 180);
    ctx.save();
    el(W * 0.12, H * 0.955, ks * 0.26, ks * 0.055, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.12, H * 0.94, ks, { wave: true });
    ctx.restore();
  }

  const r = clamp(Math.min(W, H) * 0.068, 30, 56);
  const by = H * 0.845;
  const b = drawVidare(W / 2, by, r, 'again', COL.coral);
  text('En gång till', W / 2, by + r + 20, clamp(r * 0.42, 11, 16), COL.dim, 'center');
  G.hits.push(b);
  if (k < 1) { /* festen tonar in */ }
}

/* ---------------- spel ---------------- */
function konfetti(x, y, n) {
  for (let i = 0; i < n; i++) {
    G.conf.push({
      x: x, y: y, vx: (Math.random() - 0.5) * 300, vy: -60 - Math.random() * 220,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 8, s: 6 + Math.random() * 9,
      col: [COL.star, COL.mint, COL.coral, '#a97fb5'][Math.floor(Math.random() * 4)], liv: 1.6
    });
  }
}

function nyOmgang() {
  // sex ord ur poolen — aldrig samma ord två gånger i samma lek
  const val = G.pool.splice(0, 6);
  G.kort = val.map(o => ({ id: o.id, ord: o.ord, tagen: false, wob: -9, glow: false }));
  G.rundaTagna = 0;
  G.fraga = -1;
  G.misses = 0;
  G.nextDo = 'fraga';
  G.nextAt = G.t + 0.75;
}

function start() {
  G.pool = shuffle(ORD.map(o => ({ id: o.id, ord: o.ord })));
  G.tagna = [];
  G.runda = 1;
  G.conf = [];
  G.flyg = [];
  G.screen = 'spel';
  nyOmgang();
  speak(ROST.start, true);
}

function nyFraga() {
  const kvar = G.kort.map((k, i) => k.tagen ? -1 : i).filter(i => i >= 0);
  if (!kvar.length) {
    speak(ROST.runda, true);
    G.nextDo = 'runda';
    G.nextAt = G.t + 2.1;
    return;
  }
  G.fraga = kvar[Math.floor(Math.random() * kvar.length)];
  G.svarT = G.t;
  G.misses = 0;
  G.kort.forEach(k => { k.glow = false; });
  speak(G.kort[G.fraga].ord, true);
}

function nastaOmgang() {
  if (G.runda >= 3) {
    G.screen = 'fest';
    G.festT = G.t;
    SND.win();
    speak(ROST.klar, true);
    for (let i = 0; i < 40; i++) {
      G.conf.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 60, vy: 70 + Math.random() * 110,
        a: Math.random() * 6, va: (Math.random() - 0.5) * 6, s: 7 + Math.random() * 10,
        col: [COL.star, COL.mint, COL.coral, '#a97fb5'][Math.floor(Math.random() * 4)], liv: 8
      });
    }
    return;
  }
  G.runda++;
  nyOmgang();
}

function slag(i) {
  if (G.screen !== 'spel' || G.nextDo || G.fraga < 0) return;
  const k = G.kort[i];
  if (!k || k.tagen) return;
  if (i === G.fraga) {
    k.tagen = true;
    k.glow = false;
    const p = L.pos[i];
    G.flyg.push({
      kort: k, x0: p.x, y0: p.y, x1: L.pileX + G.tagna.length * L.miniW * 0.09,
      y1: L.pileY - G.tagna.length * 1.6, t0: G.t, rot: p.rot
    });
    G.tagna.push(k.id);
    G.rundaTagna++;
    SND.ratt();
    konfetti(p.x, p.y, 14);
    speak(ROST.ratt, true);
    G.fraga = -1;
    G.nextDo = 'fraga';
    G.nextAt = G.t + (G.rundaTagna >= 6 ? 1.35 : 0.95);
  } else {
    k.wob = G.t;
    G.misses++;
    SND.fel();
    speak(ROST.fel, true);
    if (G.misses >= 2) {
      G.kort[G.fraga].glow = true;
      SND.hjalp();
      speak(ROST.titta, true);
    }
    G.sayDo = G.kort[G.fraga].ord;
    G.sayAt = G.t + (G.misses >= 2 ? 1.5 : 1.1);
  }
}

function update(dt) {
  G.t = (performance.now() - T0) / 1000;
  if (G.nextDo && G.t >= G.nextAt) {
    const d = G.nextDo;
    G.nextDo = null;
    if (d === 'fraga') nyFraga();
    else if (d === 'runda') nastaOmgang();
  }
  if (G.sayDo && G.t >= G.sayAt) {
    const s = G.sayDo;
    G.sayDo = null;
    if (G.screen === 'spel' && G.fraga >= 0) speak(s, true);
  }
  for (const c of G.conf) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.a += c.va * dt; c.liv -= dt;
  }
  G.conf = G.conf.filter(c => c.liv > 0 && c.y < H + 40);
}

/* ---------------- pek ---------------- */
function hitAt(x, y) {
  for (let i = G.hits.length - 1; i >= 0; i--) {
    const h = G.hits[i];
    if (h.r != null) {
      if ((x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r) return h;
    } else if (Math.abs(x - h.x) <= h.w / 2 && Math.abs(y - h.y) <= h.h / 2) return h;
  }
  return null;
}

function onDown(x, y) {
  audio();
  const h = hitAt(x, y);
  if (!h) return;
  const id = String(h.id);
  if (id === 'start' || id === 'igen') { SND.tryck(); start(); return; }
  if (id === 'spela') {
    SND.tryck();
    if (G.screen === 'spel' && G.fraga >= 0) speak(G.kort[G.fraga].ord, true);
    else speak(ROST.igen, true);
    return;
  }
  if (id.indexOf('kort:') === 0) {
    SND.klapp();
    slag(+id.split(':')[1]);
  }
}

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  const r = cv.getBoundingClientRect();
  onDown(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointerup', (e) => { e.preventDefault(); });
cv.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------------- loop ---------------- */
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

/* ---------------- start ---------------- */
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
T0 = performance.now();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
requestAnimationFrame(frame);

/* ---------------- testkrok ---------------- */
window.__ls = {
  state() {
    return {
      screen: G.screen, runda: G.runda, fraga: G.fraga,
      fragaOrd: G.fraga >= 0 ? G.kort[G.fraga].ord : null,
      kort: G.kort.map(k => ({ ord: k.ord, tagen: k.tagen, glow: k.glow })),
      tagna: G.tagna.slice(), rundaTagna: G.rundaTagna, misses: G.misses, nextDo: G.nextDo,
      hits: G.hits.length, errs: window.__errs.slice(), size: [W, H]
    };
  },
  start() { start(); return this.state(); },
  tap(i) {
    const p = L.pos[i];
    if (!p) return null;
    onDown(p.x, p.y);
    return this.state();
  },
  tapRatt() {
    if (G.fraga < 0) return this.state();
    return this.tap(G.fraga);
  },
  tapFel() {
    if (G.fraga < 0) return this.state();
    const i = G.kort.findIndex((k, j) => j !== G.fraga && !k.tagen);
    return i < 0 ? this.state() : this.tap(i);
  },
  ord() { return G.kort.map(k => k.ord); },
  pos(i) { return L.pos[i] ? { x: L.pos[i].x, y: L.pos[i].y } : null; },
  spela() { return { x: L.spX, y: L.spY }; },
  kort() { return { w: L.cardW, h: L.cardH }; },
  skip() { G.nextAt = G.t - 0.01; },
  next() { G.nextDo = null; nyFraga(); return this.state(); },
  bild(id) { try { BILD[id](); return 'ok'; } catch (e) { return e.message; } }
};
