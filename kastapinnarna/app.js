/* Kasta pinnarna — yutnori, det koreanska nyårsspelet, för barn 4–7 år.
   Fyra halva pinnar kastas: de som landar på rygg räknas, antalet blir steg,
   och pjäsen hoppar lika många stenar på stigen. Kotten har en egen pjäs och
   turas om — men ingen kan förlora, och fyra eller fem pinnar ger ett extra kast.

   Tränar: mängd → antal → rörelse (ett-till-ett), räkna 1–5 med fingret,
   turordning och att läsa av en bild (vilka pinnar ligger på rygg?).
   Lgr22: matematik (antal, räkneord, ordningstal), språk, motorik.
   Ingen förlust, ingen klocka. */

'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#3f3a34', dim: '#7d766c', cream: '#fffaf3', paper: '#fffdf7',
  sand: '#f4e7c9', sandD: '#e6d2a6', sandL: '#fbf3df',
  stone: '#cfc8b7', stoneD: '#a9a190', stoneL: '#e4dfd1',
  wood: '#d8a866', woodD: '#a87b3f', woodL: '#e8c391',
  mat: '#e6cd97', matD: '#c9a869', matL: '#f2e0b4',
  mint: '#7bcbb6', mintD: '#4fae94', coral: '#ef8064', coralD: '#c9553f',
  star: '#f7c948', starD: '#dfa616', dark: '#3b2f2a',
  blue: '#5fa8c9', blueD: '#3d7f9c', grass: '#a9c98a'
};

const ROST = {
  start: 'Kasta pinnarna!',
  hjalp: 'Tryck på knappen för att kasta.',
  rakna: 'Räkna pinnarna som ligger på rygg.',
  mage: 'Den ligger på mage.',
  steg: ['', 'Ett steg.', 'Två steg.', 'Tre steg.', 'Fyra steg!', 'Fem steg!'],
  mo: 'Ingen pinne på rygg. Fem steg!',
  hoppa: 'Hoppa till stenen som lyser.',
  felSten: 'Inte dit. Hoppa till den som lyser.',
  igen: 'Du får kasta igen!',
  jagIgen: 'Jag får kasta igen.',
  minTur: 'Nu är det min tur.',
  dinTur: 'Din tur!',
  vantar: 'Jag väntar på dig!',
  fest: 'Vi är framme!',
  bra: 'Bra jobbat!',
  num: ['Ett', 'Två', 'Tre', 'Fyra', 'Fem']
};

const GOAL = 11;          /* sten 12 är sista (index 11) */
const HOP = 0.30;         /* sekunder per steg */

/* ---------------- tillstånd ---------------- */
let W = 0, H = 0, DPR = 1, T0 = performance.now();
const L = {};
const G = {
  screen: 'intro', fas: 'kast', tur: 'barn',
  pos: { barn: 0, kotten: 0 },
  sticks: [], steg: 0, antalLjus: 0, raknade: 0,
  throwT0: -9, throwWho: 'barn',
  target: -1, hop: null, timers: [], t: 0,
  hits: [], conf: [], misses: 0, flyttTips: 0,
  kottenKlar: false, festT: -9, lastFel: -9
};
window.__errs = [];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
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
}

function layout() {
  L.portrait = H >= W;
  L.topBar = Math.max(78, H * 0.145);
  L.matH = clamp(H * 0.30, 168, 320);
  L.trackTop = L.topBar + 6;
  L.trackBot = H - L.matH - 6;
  L.th = L.trackBot - L.trackTop;
  L.r = clamp(Math.min(W * 0.050, L.th * 0.10), 15, 40);

  /* tolv stenar i tre rader, fram och tillbaka som en stig */
  L.x0 = W * 0.13;
  L.x1 = W * 0.85;
  const rows = [0.86, 0.54, 0.22];
  L.stones = [];
  for (let row = 0; row < 3; row++) {
    for (let c = 0; c < 4; c++) {
      const f = row % 2 === 0 ? c / 3 : 1 - c / 3;
      L.stones.push({
        x: L.x0 + (L.x1 - L.x0) * f,
        y: L.trackTop + L.th * rows[row]
      });
    }
  }

  /* mattan och pinnarna nere */
  L.matTop = H - L.matH;
  L.stickY = L.matTop + L.matH * 0.44;
  L.sx0 = W * 0.16;
  L.sx1 = W * 0.80;
  L.slotW = (L.sx1 - L.sx0) / 4;
  L.stickLen = Math.min(L.slotW * 0.80, 152);
  L.stickW = Math.max(9, L.stickLen * 0.22);

  L.btnX = W * 0.925;
  L.btnY = L.matTop + L.matH * 0.55;
  L.btnR = clamp(Math.min(L.matH * 0.19, W * 0.055), 24, 46);

  L.kottenS = clamp(L.matH * 0.42, 54, 110);
  L.kottenX = L.kottenS * 0.5 + 8;
  L.kottenY = H - 10;

  /* HUD */
  L.tokR = clamp(L.topBar * 0.19, 13, 24);
  L.tokY = L.topBar * 0.5;
  L.helpX = W - Math.max(14, W * 0.025) - 22;
  L.helpY = L.topBar * 0.5;
  L.helpR = 22;
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
    const rr2 = i % 2 ? r * 0.46 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
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
  kast: () => { tone(240, 0.18, 'triangle', 0.030, 0, 620); tone(520, 0.12, 'sine', 0.020, 0.06, 880); },
  land: () => { tone(150, 0.10, 'triangle', 0.045); tone(96, 0.14, 'sine', 0.035, 0.05); },
  plock: () => { tone(700, 0.07, 'sine', 0.035); tone(1046, 0.09, 'triangle', 0.022, 0.03); },
  fel: () => { tone(200, 0.12, 'sine', 0.04); tone(140, 0.14, 'sine', 0.028, 0.05); },
  steg: () => tone(620, 0.05, 'sine', 0.022),
  hopp: () => { tone(420, 0.10, 'triangle', 0.035, 0, 760); },
  ratt: () => { tone(784, 0.10, 'triangle', 0.040); tone(1046, 0.12, 'triangle', 0.030, 0.06); },
  win: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.30, 'triangle', 0.05, i * 0.10)); }
};

/* ---------------- röst ---------------- */
function speak(str, now) {
  if (!str) return;
  if (window.__rost && window.__rost(str, now)) return;
}

/* ---------------- spel ---------------- */
function nyttSpel() {
  G.screen = 'spel';
  G.fas = 'kast';
  G.tur = 'barn';
  G.pos = { barn: 0, kotten: 0 };
  G.sticks = [];
  G.steg = 0; G.antalLjus = 0; G.raknade = 0;
  G.target = -1; G.hop = null; G.timers = []; G.conf = [];
  G.misses = 0; G.flyttTips = 0; G.kottenKlar = false; G.lastFel = -9;
  G.t = (performance.now() - T0) / 1000;
  speak(ROST.start, true);
  later(1.8, () => { if (G.screen === 'spel' && G.fas === 'kast') speak(ROST.hjalp, true); });
}

function kast(who) {
  G.tur = who;
  G.fas = 'kast-anim';
  G.target = -1;
  G.raknade = 0;
  G.steg = 0;
  G.sticks = [0, 1, 2, 3].map(i => ({
    i: i, ljus: Math.random() < 0.5, raknad: false, ord: 0, wig: -9
  }));
  G.antalLjus = G.sticks.filter(s => s.ljus).length;
  G.throwT0 = G.t;
  G.throwWho = who;
  SND.kast();
  later(1.05, () => {
    if (G.screen !== 'spel') return;
    SND.land();
    G.fas = 'rakna';
    if (who === 'kotten') kottenRakna();
    else {
      speak(ROST.rakna, true);
      if (G.antalLjus === 0) later(1.7, moKlar);
    }
  });
}

function kottenRakna() {
  const lj = G.sticks.filter(s => s.ljus);
  if (!lj.length) { later(1.0, moKlar); return; }
  lj.forEach((s, k) => {
    later(0.85 + k * 0.62, () => {
      if (G.screen !== 'spel') return;
      s.raknad = true; s.ord = k + 1; G.raknade = k + 1;
      SND.plock(); speak(ROST.num[k], true);
    });
  });
  later(0.85 + lj.length * 0.62 + 0.45, klarRakning);
}

function moKlar() {
  if (G.screen !== 'spel') return;
  G.steg = 5;
  G.fas = 'steg';
  speak(ROST.mo, true);
  later(2.0, () => { if (G.tur === 'kotten') kottenHoppa(); else goFlytta(); });
}

function klarRakning() {
  if (G.screen !== 'spel') return;
  G.steg = Math.max(1, G.raknade);
  G.fas = 'steg';
  speak(ROST.steg[G.steg], true);
  later(1.35, () => { if (G.tur === 'kotten') kottenHoppa(); else goFlytta(); });
}

function goFlytta() {
  G.fas = 'flytta';
  G.target = Math.min(GOAL, G.pos.barn + G.steg);
  if (G.flyttTips < 2) { G.flyttTips++; speak(ROST.hoppa, true); }
}

function kottenHoppa() {
  if (G.screen !== 'spel') return;
  G.target = Math.min(GOAL, G.pos.kotten + G.steg);
  hopStart('kotten');
}

function hopStart(who) {
  const from = G.pos[who], to = G.target;
  if (to <= from) { afterHop(); return; }
  const path = [];
  for (let i = from + 1; i <= to; i++) path.push(i);
  G.hop = { who: who, path: path, from: from, to: to, t0: G.t, spoke: 0 };
  G.fas = 'hopp';
  G.target = -1;
  SND.hopp();
}

function afterHop() {
  const who = G.tur;
  const goal = G.pos[who] >= GOAL;
  if (who === 'barn' && goal) { fest(); return; }
  if (who === 'kotten' && goal) {
    G.kottenKlar = true;
    speak(ROST.vantar, true);
    G.tur = 'barn'; G.fas = 'kast';
    return;
  }
  if (G.steg >= 4) {
    G.fas = 'kast';
    speak(who === 'barn' ? ROST.igen : ROST.jagIgen, true);
    later(1.6, () => { if (G.screen === 'spel') kast(who); });
    return;
  }
  if (who === 'barn') {
    if (G.kottenKlar) { G.fas = 'kast'; speak(ROST.dinTur, true); return; }
    G.tur = 'kotten'; G.fas = 'kast';
    speak(ROST.minTur, true);
    later(1.4, () => { if (G.screen === 'spel') kast('kotten'); });
  } else {
    G.tur = 'barn'; G.fas = 'kast';
    speak(ROST.dinTur, true);
  }
}

function fest() {
  G.screen = 'fest';
  G.festT = G.t;
  G.hop = null;
  G.timers = [];
  G.fas = 'klar';
  SND.win();
  speak(ROST.fest, true);
  G.festHop = null;
  later(1.4, () => {
    if (G.screen !== 'fest' || G.pos.kotten >= GOAL) return;
    G.festHop = { t0: G.t, from: G.pos.kotten };
    SND.hopp();
  });
  later(2.2, () => speak(ROST.bra, true));
  for (let k = 0; k < 40; k++) {
    G.conf.push({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 70, vy: 70 + Math.random() * 120,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 6, s: 7 + Math.random() * 10,
      col: [COL.star, COL.mint, COL.coral, '#a97fb5'][Math.floor(Math.random() * 4)], liv: 9
    });
  }
}

function konfetti(x, y, n) {
  for (let i = 0; i < n; i++) {
    G.conf.push({
      x: x, y: y, vx: (Math.random() - 0.5) * 260, vy: -50 - Math.random() * 190,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 8, s: 6 + Math.random() * 8,
      col: [COL.star, COL.mint, COL.coral, '#a97fb5'][Math.floor(Math.random() * 4)], liv: 1.5
    });
  }
}

/* ---------------- rita: bakgrund ---------------- */
function drawSand() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.sandL);
  g.addColorStop(0.55, COL.sand);
  g.addColorStop(1, COL.sandD);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  /* små gruskorn, samma mönster varje bildruta */
  ctx.fillStyle = 'rgba(180,155,110,.16)';
  for (let i = 0; i < 70; i++) {
    const x = ((i * 137.5) % W);
    const y = ((i * 311.7) % H);
    ctx.fillRect(x, y, 2.2, 2.2);
  }
  /* gräs vid kanterna */
  ctx.strokeStyle = 'rgba(140,175,110,.55)';
  ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = W * (0.03 + i * 0.115);
    const y = H * 0.965;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 12, x + 7, y - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.quadraticCurveTo(x + 9, y - 10, x + 13, y - 15); ctx.stroke();
  }
}

function stoneXY(i) {
  const s = L.stones[clamp(i, 0, L.stones.length - 1)];
  return s || { x: W / 2, y: H / 2 };
}

function drawStig() {
  /* en ljus stig mellan stenarna */
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  L.stones.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.strokeStyle = 'rgba(255,252,244,.78)';
  ctx.lineWidth = L.r * 1.65;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(198,174,130,.42)';
  ctx.lineWidth = L.r * 1.65;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,252,244,.85)';
  ctx.lineWidth = L.r * 1.45;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,178,136,.30)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.stroke();
  ctx.restore();
}

function drawStones() {
  L.stones.forEach((p, i) => {
    const r = L.r;
    el(p.x, p.y + r * 0.30, r * 1.10, r * 0.46, 'rgba(120,100,70,.16)');
    el(p.x, p.y, r * 1.06, r * 0.86, COL.stoneD);
    el(p.x, p.y - r * 0.10, r * 1.00, r * 0.78, COL.stone);
    el(p.x, p.y - r * 0.26, r * 0.82, r * 0.52, COL.stoneL);

    /* sista stenen har en liten flagga */
    if (i === GOAL) {
      ctx.strokeStyle = COL.woodD; ctx.lineWidth = Math.max(3, r * 0.14);
      ctx.beginPath(); ctx.moveTo(p.x + r * 1.0, p.y - r * 0.2);
      ctx.lineTo(p.x + r * 1.0, p.y - r * 2.0); ctx.stroke();
      tri([p.x + r * 1.0, p.y - r * 2.0], [p.x + r * 2.1, p.y - r * 1.65], [p.x + r * 1.0, p.y - r * 1.3], COL.coral);
    }

    text(String(i + 1), p.x, p.y + r * 0.30, r * 0.66, 'rgba(90,82,66,.72)', 'center');
  });

  /* målstenen lyser svagt när någon är nära */
  if (G.screen === 'spel' && G.fas !== 'hopp') {
    const near = Math.max(G.pos.barn, G.pos.kotten);
    if (near >= GOAL - 3) {
      const p = L.stones[GOAL];
      const g = 0.5 + 0.5 * Math.sin(G.t * 3);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, L.r * 1.4, L.r * 1.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(247,201,72,' + (0.25 + 0.30 * g) + ')';
      ctx.lineWidth = 4; ctx.stroke();
    }
  }
}

function pawnPos(who) {
  if (G.festHop && who === 'kotten') {
    const k = clamp((G.t - G.festHop.t0) / 1.5, 0, 1);
    const idx = G.festHop.from + (GOAL - G.festHop.from) * k;
    const a = Math.floor(idx), f = idx - a;
    const p = stoneXY(a), q = stoneXY(a + 1);
    return {
      x: p.x + (q.x - p.x) * f,
      y: p.y + (q.y - p.y) * f - Math.sin(f * Math.PI) * L.r * 0.5,
      moving: true
    };
  }
  if (G.hop && G.hop.who === who) {
    const h = G.hop;
    const k = (G.t - h.t0) / HOP;
    const i = clamp(Math.floor(k), 0, h.path.length - 1);
    const f = clamp(k - i, 0, 1);
    const a = i === 0 ? h.from : h.path[i - 1];
    const b = h.path[i];
    const p = stoneXY(a), q = stoneXY(b);
    return {
      x: p.x + (q.x - p.x) * f,
      y: p.y + (q.y - p.y) * f - Math.sin(f * Math.PI) * L.r * 0.95,
      moving: true
    };
  }
  const p = stoneXY(G.pos[who]);
  return { x: p.x, y: p.y, moving: false };
}

function drawToken(x, y, rad, col, ring) {
  el(x, y + rad * 0.42, rad * 1.0, rad * 0.36, 'rgba(90,70,45,.20)');
  el(x, y, rad, rad, '#fffaf3');
  el(x, y, rad * 0.82, rad * 0.82, col);
  el(x - rad * 0.24, y - rad * 0.26, rad * 0.30, rad * 0.24, 'rgba(255,255,255,.55)');
  if (ring) {
    ctx.beginPath(); ctx.arc(x, y, rad * 1.28, 0, Math.PI * 2);
    ctx.strokeStyle = ring; ctx.lineWidth = Math.max(2.5, rad * 0.22); ctx.stroke();
  }
}

function drawPawns() {
  const r = L.r;
  const pr = Math.max(7, r * 0.34);
  const bp = pawnPos('barn'), kp = pawnPos('kotten');
  /* barnets pjäs till vänster, Kottens till höger */
  const off = pr * 0.95;
  const barnAktiv = G.screen === 'spel' && G.tur === 'barn' && G.fas !== 'hopp';
  const kottenAktiv = G.screen === 'spel' && G.tur === 'kotten' && G.fas !== 'hopp';
  drawToken(bp.x - off, bp.y - r * 0.34, pr, COL.blue, barnAktiv ? 'rgba(247,201,72,.95)' : null);
  drawToken(kp.x + off, kp.y - r * 0.34, pr, COL.mintD, kottenAktiv ? 'rgba(247,201,72,.95)' : null);

  /* målring under pjäsen som ska hoppa */
  if (G.fas === 'flytta' && G.target >= 0) {
    const p = stoneXY(G.target);
    const g = 0.5 + 0.5 * Math.sin(G.t * 5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, L.r * (1.22 + 0.10 * g), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(247,201,72,' + (0.65 + 0.30 * g) + ')';
    ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, L.r * (1.55 + 0.18 * g), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(247,201,72,.28)';
    ctx.lineWidth = 3; ctx.stroke();
  }
}

/* ---------------- rita: mattan och pinnarna ---------------- */
function drawMat() {
  const y = L.matTop;
  rr(W * 0.008, y + 4, W * 0.984, L.matH - 8, 22, 'rgba(120,90,50,.20)');
  rr(W * 0.012, y + 1, W * 0.976, L.matH - 12, 20, COL.matD);
  rr(W * 0.018, y + 5, W * 0.964, L.matH - 20, 16, COL.mat);
  rr(W * 0.026, y + 10, W * 0.948, L.matH - 30, 12, COL.matL);

  /* flätade ränder */
  ctx.save();
  ctx.strokeStyle = 'rgba(190,160,110,.35)';
  ctx.lineWidth = 1.6;
  for (let i = 1; i < 7; i++) {
    const yy = y + 12 + (L.matH - 34) * i / 7;
    ctx.beginPath(); ctx.moveTo(W * 0.03, yy); ctx.lineTo(W * 0.97, yy); ctx.stroke();
  }
  ctx.restore();
}

function slotX(i) { return L.sx0 + L.slotW * (i + 0.5); }

function drawStickShape(x, y, ang, len, w, ljus, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  ctx.rotate(ang);
  const h = len / 2;

  /* mörk kant */
  rr(-h, -w / 2 - 1.5, len, w + 3, w / 2 + 1.5, 'rgba(74,58,40,.55)');
  if (ljus) {
    /* flatsidan upp: ljust trä med två bruna prickar */
    rr(-h, -w / 2, len, w, w / 2, COL.woodL);
    rr(-h + w * 0.5, -w * 0.30, len - w, w * 0.60, w * 0.28, '#f6e3bd');
    ctx.fillStyle = 'rgba(120,80,40,.75)';
    ctx.beginPath(); ctx.arc(-len * 0.20, 0, w * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(len * 0.20, 0, w * 0.13, 0, Math.PI * 2); ctx.fill();
  } else {
    /* rundsidan upp: mörkare, med en ljus ådra längs mitten */
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, '#b98a52');
    g.addColorStop(0.45, '#d8a866');
    g.addColorStop(1, '#9d6f3c');
    rr(-h, -w / 2, len, w, w / 2, g);
    ctx.strokeStyle = 'rgba(255,240,210,.45)';
    ctx.lineWidth = Math.max(1.6, w * 0.16);
    ctx.beginPath(); ctx.moveTo(-h + w * 0.7, -w * 0.10); ctx.lineTo(h - w * 0.7, -w * 0.10); ctx.stroke();
  }
  /* ändträ */
  ctx.fillStyle = 'rgba(255,250,240,.55)';
  ctx.beginPath(); ctx.arc(-h + w * 0.22, 0, w * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(h - w * 0.22, 0, w * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSticks() {
  if (!G.sticks.length) return;
  const t = G.t - G.throwT0;
  G.sticks.forEach((s, i) => {
    const x0 = slotX(i);
    let x = x0, y = L.stickY, ang = 0, alpha = 1;
    if (G.fas === 'kast-anim') {
      const k = clamp((t - i * 0.05) / 0.85, 0, 1);
      y = L.stickY - Math.sin(Math.PI * k) * L.matH * 0.92;
      ang = Math.sin(Math.PI * k) * (i % 2 ? 1 : -1) * (2.4 + i * 0.5);
      alpha = 1;
    }
    const wob = G.t - s.wig;
    if (wob >= 0 && wob < 0.5) {
      const k = 1 - wob / 0.5;
      ang += Math.sin(wob * 44) * 0.14 * k;
      x += Math.sin(wob * 36) * 4 * k;
    }
    drawStickShape(x, y, ang, L.stickLen, L.stickW, s.ljus, alpha);

    /* räkneprick: en liten stjärna över varje pinne barnet räknat */
    if (s.raknad) {
      starPath(x, L.stickY - L.matH * 0.22, Math.max(9, L.stickW * 0.75));
      ctx.fillStyle = COL.star; ctx.fill();
      ctx.strokeStyle = COL.starD; ctx.lineWidth = 1.6; ctx.stroke();
    } else if (s.ljus && G.fas === 'rakna' && G.tur === 'barn') {
      const g = 0.5 + 0.5 * Math.sin(G.t * 5 + i);
      ctx.beginPath();
      ctx.ellipse(x, y, L.stickLen * 0.56, L.stickW * (1.5 + 0.25 * g), 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(247,201,72,' + (0.45 + 0.35 * g) + ')';
      ctx.lineWidth = 4; ctx.stroke();
    }
  });
}

function drawStegPrickar() {
  if (!G.steg || G.screen !== 'spel') return;
  const n = G.steg;
  const rad = clamp(L.matH * 0.030, 5, 11);
  const gap = rad * 2.8;
  const x0 = W * 0.48 - (n - 1) * gap / 2;
  const y = L.matTop + L.matH * 0.80;
  for (let i = 0; i < n; i++) {
    el(x0 + i * gap, y, rad, rad, COL.coral);
    el(x0 + i * gap - rad * 0.28, y - rad * 0.30, rad * 0.34, rad * 0.28, 'rgba(255,255,255,.55)');
  }
}

function drawKastaKnapp() {
  const aktiv = G.screen === 'spel' && G.fas === 'kast' && G.tur === 'barn';
  const p = aktiv ? 1 + 0.04 * Math.sin(G.t * 6.0) : 1;
  const r = L.btnR * p;
  el(L.btnX, L.btnY + r * 0.14, r * 1.02, r * 0.96, 'rgba(90,70,45,.18)');
  el(L.btnX, L.btnY, r, r, aktiv ? COL.coral : '#cfc6b6');
  el(L.btnX, L.btnY, r * 0.86, r * 0.86, 'rgba(255,255,255,.18)');

  /* uppåtpil */
  ctx.save();
  ctx.strokeStyle = '#fffaf3'; ctx.lineWidth = r * 0.19;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(L.btnX, L.btnY + r * 0.34);
  ctx.lineTo(L.btnX, L.btnY - r * 0.30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(L.btnX - r * 0.26, L.btnY - r * 0.04);
  ctx.lineTo(L.btnX, L.btnY - r * 0.36);
  ctx.lineTo(L.btnX + r * 0.26, L.btnY - r * 0.04);
  ctx.stroke();
  ctx.restore();

  if (aktiv) {
    const g = 0.5 + 0.5 * Math.sin(G.t * 5);
    ctx.beginPath(); ctx.arc(L.btnX, L.btnY, r * (1.22 + 0.10 * g), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(247,201,72,' + (0.50 + 0.35 * g) + ')';
    ctx.lineWidth = 4; ctx.stroke();
    G.hits.push({ id: 'kasta', x: L.btnX, y: L.btnY, r: r + 14 });
  }
}

function drawKotten() {
  if (!window.KOTTEN) return;
  const hop = G.screen === 'fest' ? Math.abs(Math.sin(G.t * 4.2)) * 10 : 0;
  ctx.save();
  el(L.kottenX, L.kottenY - 2, L.kottenS * 0.30, L.kottenS * 0.06, 'rgba(90,70,45,.18)');
  KOTTEN.drawAtFeet(ctx, L.kottenX, L.kottenY - hop, L.kottenS, { wave: 0.55 + 0.45 * Math.sin(G.t * 2.6) });
  ctx.restore();
}

/* ---------------- rita: HUD ---------------- */
function drawHUD() {
  const fs = clamp(L.topBar * 0.185, 12, 21);
  text('Kasta pinnarna', W * 0.042, L.topBar * 0.5, fitFont('Kasta pinnarna', fs, W * 0.36, 11), COL.ink, 'left');

  /* vems tur: två pjäser i mitten, den aktivas lyser */
  const cx = W * 0.55;
  const R = L.tokR;
  const barnA = G.tur === 'barn';
  const bob = 0.5 + 0.5 * Math.sin(G.t * 4.5);
  drawToken(cx - R * 1.55, L.tokY - (barnA ? bob * 3 : 0), R * 0.82, COL.blue,
    barnA ? 'rgba(247,201,72,.95)' : 'rgba(120,110,95,.20)');
  drawToken(cx + R * 1.55, L.tokY - (barnA ? 0 : bob * 3), R * 0.82, COL.mintD,
    barnA ? 'rgba(120,110,95,.20)' : 'rgba(247,201,72,.95)');

  /* högtalare: säg om instruktionen */
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

/* ---------------- skärmar ---------------- */
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
  drawSand();
  const titleFs = clamp(Math.min(W * 0.095, H * 0.078), 24, 52);
  const ty = H * (L.portrait ? 0.115 : 0.135);
  text('Kasta pinnarna', W / 2, ty, fitFont('Kasta pinnarna', titleFs, W * 0.9, 20), COL.ink, 'center');
  text('Kasta · räkna · hoppa', W / 2, ty + titleFs * 0.95, clamp(titleFs * 0.36, 12, 20), COL.dim, 'center');

  /* fyra pinnar på en liten matta */
  const len = clamp(Math.min(W * 0.30, H * 0.20), 78, 240);
  const w = Math.max(10, len * 0.22);
  const cx = W * 0.5, cy = H * (L.portrait ? 0.44 : 0.48);
  rr(cx - len * 1.05, cy - len * 0.30, len * 2.10, len * 0.62, 16, 'rgba(201,168,105,.35)');
  const demo = [
    { dx: -0.62, dy: -0.10, ang: -0.14, ljus: true },
    { dx: -0.20, dy: 0.12, ang: 0.10, ljus: false },
    { dx: 0.22, dy: -0.06, ang: -0.06, ljus: true },
    { dx: 0.64, dy: 0.14, ang: 0.16, ljus: false }
  ];
  demo.forEach(d => drawStickShape(cx + d.dx * len, cy + d.dy * len, d.ang, len, w, d.ljus, 1));

  if (window.KOTTEN) {
    const ks = clamp(H * 0.17, 60, 150);
    ctx.save();
    el(W * 0.11, H * 0.955, ks * 0.30, ks * 0.06, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.11, H * 0.945, ks, { wave: 0.6 + 0.4 * Math.sin(G.t * 2.4) });
    ctx.restore();
  }

  const r = clamp(Math.min(W, H) * 0.072, 32, 58);
  const by = H * (L.portrait ? 0.76 : 0.78);
  const b = drawVidare(W / 2, by, r, 'play', COL.coral);
  /* texten på en ljus pill så den syns på sanden */
  const fs2 = clamp(r * 0.40, 11, 15);
  setFont(fs2);
  const tw = ctx.measureText('Börja kasta').width + 22;
  rr(W / 2 - tw / 2, by + r + 8, tw, fs2 * 1.9, fs2 * 0.95, 'rgba(255,250,243,.92)');
  text('Börja kasta', W / 2, by + r + 8 + fs2 * 0.95, fs2, COL.ink, 'center');
  G.hits.push(b);
}

function drawSpel() {
  drawSand();
  drawStig();
  drawStones();
  drawPawns();
  drawMat();
  drawKotten();
  drawSticks();
  drawStegPrickar();
  drawKastaKnapp();
  drawHUD();

  /* räkna-läget: hela pinnen är en träffyta */
  if (G.fas === 'rakna' && G.tur === 'barn') {
    for (let i = 0; i < 4; i++) {
      G.hits.push({
        id: 'pinne' + i, x: slotX(i), y: L.stickY - L.matH * 0.05,
        w: L.slotW * 0.96, h: L.matH * 0.62
      });
    }
  }
  /* flytta-läget: stenarna är träffytor */
  if (G.fas === 'flytta' && G.tur === 'barn') {
    L.stones.forEach((p, i) => {
      G.hits.push({ id: 'sten' + i, x: p.x, y: p.y, r: L.r * 1.25 });
    });
  }
}

function drawFest() {
  drawSand();
  drawStig();
  drawStones();
  drawPawns();
  drawMat();
  drawKotten();
  drawSticks();

  const titleFs = clamp(Math.min(W * 0.078, H * 0.064), 22, 46);
  const ty = L.topBar * 0.55;
  text('Bra jobbat!', W / 2, ty, fitFont('Bra jobbat!', titleFs, W * 0.8, 18), COL.ink, 'center');

  /* glittar kring målstenen */
  const p = L.stones[GOAL];
  for (let i = 0; i < 8; i++) {
    const a = G.t * 1.4 + i * Math.PI / 4;
    const rr2 = L.r * (1.5 + 0.25 * Math.sin(G.t * 3 + i));
    starPath(p.x + Math.cos(a) * rr2, p.y + Math.sin(a) * rr2 * 0.7, L.r * 0.22);
    ctx.fillStyle = i % 2 ? COL.star : COL.mint; ctx.fill();
  }

  /* knappen ligger på mattan till höger, där kastknappen står — inte över stigen */
  const r = clamp(Math.min(L.matH * 0.20, W * 0.058), 30, 52);
  const bx = W - r - 20;
  const by = L.btnY;
  const b = drawVidare(bx, by, r, 'again', COL.coral);
  const fs2 = clamp(r * 0.40, 11, 15);
  setFont(fs2);
  const tw = ctx.measureText('En gång till').width + 22;
  const ly = by - r - fs2 * 1.6;
  rr(bx - tw / 2, ly - fs2 * 0.95, tw, fs2 * 1.9, fs2 * 0.95, 'rgba(255,250,243,.92)');
  text('En gång till', bx, ly, fs2, COL.ink, 'center');
  G.hits.push(b);
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

function stickTap(i) {
  const s = G.sticks[i];
  if (!s) return;
  if (!s.ljus) {
    s.wig = G.t;
    G.misses++;
    SND.fel();
    speak(ROST.mage, true);
    return;
  }
  if (s.raknad) { speak(ROST.num[clamp((s.ord || 1) - 1, 0, 4)], true); return; }
  G.raknade++;
  s.raknad = true;
  s.ord = G.raknade;
  SND.plock();
  speak(ROST.num[clamp(G.raknade - 1, 0, 4)], true);
  if (G.raknade === G.antalLjus) later(0.95, klarRakning);
}

function onDown(x, y) {
  audio();
  const h = hitAt(x, y);
  if (h) {
    const id = String(h.id);
    if (id === 'start' || id === 'igen') { SND.tryck(); nyttSpel(); return; }
    if (id === 'kasta') { SND.tryck(); kast('barn'); return; }
    if (id === 'hjalp') {
      SND.tryck();
      if (G.fas === 'kast') speak(ROST.hjalp, true);
      else if (G.fas === 'rakna') speak(ROST.rakna, true);
      else if (G.fas === 'flytta') speak(ROST.hoppa, true);
      else speak(ROST.start, true);
      return;
    }
    if (id.indexOf('pinne') === 0 && G.fas === 'rakna' && G.tur === 'barn') {
      stickTap(Number(id.slice(5)));
      return;
    }
    if (id.indexOf('sten') === 0 && G.fas === 'flytta' && G.tur === 'barn') {
      const i = Number(id.slice(4));
      if (i === G.target) {
        hopStart('barn');
      } else {
        G.misses++;
        SND.fel();
        if (G.t - G.lastFel > 1.2) { speak(ROST.felSten, true); G.lastFel = G.t; }
      }
      return;
    }
  }
}

/* ---------------- loop ---------------- */
function update(dt) {
  G.t = (performance.now() - T0) / 1000;

  /* schemalagda händelser */
  if (G.timers.length) {
    const kvar = [];
    for (const tm of G.timers) {
      if (G.t >= tm.at) { try { tm.fn(); } catch (e) { window.__errs.push(e.message); } }
      else kvar.push(tm);
    }
    G.timers = kvar;
  }

  /* Kotten springer in till målet på festen */
  if (G.festHop && (G.t - G.festHop.t0) / 1.5 >= 1) {
    G.pos.kotten = GOAL;
    G.festHop = null;
  }

  /* hoppet */
  if (G.hop) {
    const h = G.hop;
    const k = (G.t - h.t0) / HOP;
    const n = Math.floor(k);
    if (n > h.spoke) {
      h.spoke = n;
      if (h.spoke <= h.path.length) {
        speak(ROST.num[clamp(h.spoke - 1, 0, 4)], true);
        SND.steg();
      }
    }
    if (k >= h.path.length) {
      G.pos[h.who] = h.to;
      G.hop = null;
      afterHop();
    }
  }

  for (const c of G.conf) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.a += c.va * dt; c.liv -= dt;
  }
  G.conf = G.conf.filter(c => c.liv > 0 && c.y < H + 40);
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
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  const r = cv.getBoundingClientRect();
  onDown(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('contextmenu', (e) => e.preventDefault());

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
window.__kp = {
  state() {
    return {
      screen: G.screen, fas: G.fas, tur: G.tur,
      pos: { barn: G.pos.barn, kotten: G.pos.kotten },
      steg: G.steg, antalLjus: G.antalLjus, raknade: G.raknade,
      target: G.target, kottenKlar: G.kottenKlar,
      sticks: G.sticks.map(s => ({ ljus: s.ljus, raknad: s.raknad })),
      hits: G.hits.map(h => h.id), misses: G.misses,
      errs: window.__errs.slice(), size: [W, H]
    };
  },
  start() { nyttSpel(); return this.state(); },
  kasta() { kast(G.tur); return this.state(); },
  /* tvinga ett kastresultat (antal pinnar på rygg) */
  kastaMed(n) {
    G.tur = G.tur; G.fas = 'kast-anim'; G.raknade = 0; G.target = -1;
    G.sticks = [0, 1, 2, 3].map(i => ({ i: i, ljus: i < n, raknad: false, ord: 0, wig: -9 }));
    G.antalLjus = n;
    G.throwT0 = G.t;
    SND.kast();
    later(0.2, () => {
      G.fas = 'rakna';
      if (G.tur === 'kotten') kottenRakna();
      else if (n === 0) later(0.3, moKlar);
    });
    return this.state();
  },
  tap(id) {
    const h = G.hits.find(k => k.id === id);
    if (h) onDown(h.x, h.y);
    return this.state();
  },
  pinne(i) { stickTap(i); return this.state(); },
  sten(i) {
    const h = G.hits.find(k => k.id === 'sten' + i);
    if (h) onDown(h.x, h.y);
    return this.state();
  },
  spola(ms) { G.timers.forEach(t => t.at -= ms / 1000); return this.state(); },
  hopKlar() {
    if (G.hop) { G.pos[G.hop.who] = G.hop.to; G.hop = null; afterHop(); }
    return this.state();
  },
  reset() { G.screen = 'intro'; G.timers = []; G.hop = null; return this.state(); }
};
