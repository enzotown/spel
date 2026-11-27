/* Plockepinn — dra ut en pinne i taget.
   Tio färgade pinnar ligger i en hög på sågbänken. Barnet drar ut en pinne som
   ligger fritt (inte under en annan) och pinnarna samlas i rännan längst ner.
   Varje pinne räknas högt, och till slut räknar Kotten alla tio tillsammans.

   Tränar: finmotorik (greppa och dra), tålamod och planering (vilken ligger
   överst?), samt räkning 1–10 med ett-till-ett. Lgr22: matematik (antal och
   ordningstal), språk (räkneord), motorik. Ingen förlust, ingen klocka. */

'use strict';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#3f3a34', dim: '#7d766c', cream: '#fffaf3', paper: '#fffdf7',
  bench: '#e8cf9f', benchD: '#d3b47c', benchL: '#f4e2bd',
  edge: '#c9a978', wood: '#d8a866', woodD: '#a87b3f',
  mint: '#7bcbb6', mintD: '#4fae94', coral: '#ef8064', coralD: '#c9553f',
  star: '#f7c948', starD: '#dfa616', dark: '#3b2f2a'
};

/* pinnarnas färger — tio tydliga, varma och kalla om varandra */
const PINCOL = [
  '#e8756a', '#5fa8c9', '#f0b64a', '#8fb96a', '#b57fb5',
  '#e39a4a', '#5fb9a0', '#d96a8a', '#7f93c9', '#c98a54'
];

const ROST = {
  start: 'Plockepinn!',
  hjalp: 'Dra ut en pinne som ligger fritt.',
  fel: 'Oj, den ligger under en annan pinne.',
  hint: 'Titta, den här går att ta.',
  klar: 'Alla pinnar är ute!',
  rakna: 'Nu räknar vi alla pinnar.',
  bra: 'Bra jobbat!',
  num: ['Ett', 'Två', 'Tre', 'Fyra', 'Fem', 'Sex', 'Sju', 'Åtta', 'Nio', 'Tio']
};

/* ---------------- tillstånd ---------------- */
let W = 0, H = 0, DPR = 1, T0 = performance.now();
const L = {};
const G = {
  screen: 'intro', sticks: [], taken: 0, tagna: [], grab: null, flyg: [], conf: [],
  t: 0, hits: [], misses: 0, lastTake: 0, hintOn: false,
  festT: -9, rakna: 0, raknaAt: 0, done: false
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
  const gamlaCx = L.cx, gamlaCy = L.cy, hadeLayout = !!L.stickLen;
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = Math.max(300, window.innerWidth || 300);
  H = Math.max(300, window.innerHeight || 300);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layout();
  /* vrids skärmen mitt i spelet flyttas högen med mitten i stället för att hamna snett */
  if (hadeLayout && G.sticks.length && (gamlaCx !== L.cx || gamlaCy !== L.cy)) {
    const dx = L.cx - gamlaCx, dy = L.cy - gamlaCy;
    for (const s of G.sticks) { s.x += dx; s.y += dy; }
    if (G.grab) { G.grab.x += dx; G.grab.y += dy; G.grab.x0 += dx; G.grab.y0 += dy; }
    updateFree();
  }
}

function layout() {
  L.portrait = H >= W;
  L.s = clamp(Math.min(W / 900, H / 700), 0.62, 1.4);
  L.topBar = Math.max(78, H * 0.145);
  L.trayH = clamp(H * 0.155, 76, 160);

  const top = L.topBar + 4;
  const bot = H - L.trayH - 4;
  const playH = bot - top;
  L.cx = W / 2;
  L.cy = top + playH * 0.52;
  L.stickW = clamp(Math.min(W, H) * 0.022, 9, 20);
  L.stickLen = clamp(Math.min(W * 0.38, playH * 0.55), 120, 380);
  L.pileR = Math.min(W * 0.19, playH * 0.28);

  /* rännan nere */
  L.trayY = H - L.trayH * 0.50;
  L.trayX0 = W * 0.03;
  L.trayW = W * 0.94;
  L.slotW = L.trayW / 10;
  L.miniLen = Math.min(L.slotW * 0.80, L.trayH * 0.62);
  L.miniW = Math.max(6, L.stickW * 0.62);

  /* HUD */
  L.spR = clamp(L.topBar * 0.30, 22, 40);
  L.spX = W - L.spR - Math.max(10, W * 0.022);
  L.spY = L.topBar * 0.5;
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

/* ---------------- geometri ---------------- */
function stickEnds(s) {
  const hx = Math.cos(s.ang) * s.len / 2, hy = Math.sin(s.ang) * s.len / 2;
  return { x0: s.x - hx, y0: s.y - hy, x1: s.x + hx, y1: s.y + hy };
}
function distSeg(px, py, s) {
  const e = stickEnds(s);
  const vx = e.x1 - e.x0, vy = e.y1 - e.y0;
  const wx = px - e.x0, wy = py - e.y0;
  const L2 = vx * vx + vy * vy || 1;
  let t = (wx * vx + wy * vy) / L2;
  t = clamp(t, 0, 1);
  const dx = px - (e.x0 + vx * t), dy = py - (e.y0 + vy * t);
  return Math.hypot(dx, dy);
}
function pointOn(s, f) {
  const e = stickEnds(s);
  return { x: e.x0 + (e.x1 - e.x0) * f, y: e.y0 + (e.y1 - e.y0) * f };
}
/* var två pinnar korsar varandra (i den övre pinnens lokala x) */
function korsning(a, b) {
  const p = stickEnds(a), q = stickEnds(b);
  const rx = p.x1 - p.x0, ry = p.y1 - p.y0;
  const sx = q.x1 - q.x0, sy = q.y1 - q.y0;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q.x0 - p.x0) * sy - (q.y0 - p.y0) * sx) / den;
  const u = ((q.x0 - p.x0) * ry - (q.y0 - p.y0) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t: t, x: p.x0 + rx * t, y: p.y0 + ry * t };
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
  grep: () => { tone(330, 0.05, 'triangle', 0.035); tone(180, 0.09, 'sine', 0.025, 0.01); },
  ner: () => { tone(196, 0.10, 'triangle', 0.04); tone(120, 0.14, 'sine', 0.03, 0.05); },
  fast: () => { tone(150, 0.16, 'sine', 0.045, 0, 95); tone(110, 0.12, 'triangle', 0.02, 0.02); },
  ratt: () => { tone(784, 0.11, 'triangle', 0.042); tone(1046, 0.13, 'triangle', 0.034, 0.07); },
  tick: () => tone(880, 0.07, 'sine', 0.026),
  win: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.30, 'triangle', 0.05, i * 0.10)); }
};

/* ---------------- röst ---------------- */
function speak(str, now) {
  if (!str) return;
  if (window.__rost && window.__rost(str, now)) return;
}

/* ---------------- högen ---------------- */
function nyHog() {
  const n = 10;
  const sticks = [];
  /* pinnarna ligger i några få riktningar, så de korsar varandra snett och
     täcker en lång sträcka av varandra — då betyder "under" något */
  const riktningar = [0.16, -0.30, 0.58, -0.72, 0.02];
  const ordning = shuffle([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);
  for (let i = 0; i < n; i++) {
    const ang = riktningar[ordning[i]] + (Math.random() - 0.5) * 0.26;
    let x = L.cx, y = L.cy, basta = -1;
    for (let k = 0; k < 70; k++) {
      const a = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * L.pileR;
      const px = L.cx + Math.cos(a) * rad;
      const py = L.cy + Math.sin(a) * rad * 0.74;
      const prov = { x: px, y: py, ang: ang, len: L.stickLen };
      /* hur mycket av de andra pinnarna den här skulle ligga över */
      let tacker = 0;
      for (const s of sticks) if (distSeg(s.x, s.y, prov) < L.stickW * 2.4) tacker++;
      if (tacker > basta) { basta = tacker; x = px; y = py; }
      if (tacker >= 2) break;
    }
    sticks.push({
      x: x, y: y, ang: ang, len: L.stickLen, z: i,
      col: PINCOL[i % PINCOL.length], wig: -9, freeLen: 0, freeA: 0, freeB: 1
    });
  }
  G.sticks = sticks;
  G.taken = 0;
  G.tagna = [];
  G.grab = null;
  G.flyg = [];
  G.misses = 0;
  G.hintOn = false;
  G.lastTake = G.t;
  updateFree();
}

/* fri = den längsta obetäckta sträckan av pinnen (pinnar ovanpå täcker) */
function updateFree() {
  const w = L.stickW * 0.95, N = 44;
  for (const s of G.sticks) {
    const cov = new Array(N).fill(false);
    for (const o of G.sticks) {
      if (o === s || o.z <= s.z) continue;
      for (let k = 0; k < N; k++) {
        if (cov[k]) continue;
        const p = pointOn(s, k / (N - 1));
        if (distSeg(p.x, p.y, o) < w) cov[k] = true;
      }
    }
    let best = { a: 0, b: -1 }, a = -1;
    for (let k = 0; k <= N; k++) {
      const c = k < N ? cov[k] : true;
      if (!c) { if (a < 0) a = k; }
      else if (a >= 0) {
        if (k - 1 - a > best.b - best.a) best = { a: a, b: k - 1 };
        a = -1;
      }
    }
    s.freeLen = (best.b - best.a + 1) / N * s.len;
    s.freeA = best.a / N;
    s.freeB = (best.b + 1) / N;
  }
}

function friPunkt(s) {
  const f = clamp((s.freeA + s.freeB) / 2, 0.08, 0.92);
  return pointOn(s, f);
}
/* går pinnen att ta? Den behöver en fri sträcka som går att gripa om. */
function taBar(s) { return s.freeLen >= Math.max(L.stickW * 2.5, s.len * 0.40); }
function taBara() { return G.sticks.filter(taBar); }

/* är punkten (x,y) fri på pinnen s — dvs ingen pinne ovanpå ligger där? */
function friVid(s, x, y) {
  for (const o of G.sticks) {
    if (o === s || o.z <= s.z) continue;
    if (distSeg(x, y, o) < L.stickW * 0.95) return false;
  }
  return true;
}

/* ---------------- rita ---------------- */
function drawBench() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f7edd8');
  g.addColorStop(0.45, COL.benchL);
  g.addColorStop(1, COL.bench);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  /* träådror */
  ctx.strokeStyle = 'rgba(180,150,105,.22)';
  ctx.lineWidth = 1.3;
  const step = Math.max(22, H * 0.052);
  for (let y = step; y < H; y += step) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) {
      const yy = y + Math.sin((x / W) * 6.2 + y * 0.02) * 3.2;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(190,160,110,.28)';
  ctx.fillRect(0, L.topBar - 3, W, 3);
}

function drawStick(s, x, y, ang, len, w, alpha, lifted) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  ctx.rotate(ang);
  const h = len / 2;
  ctx.lineCap = 'round';
  if (lifted) {
    ctx.shadowColor = 'rgba(70,50,25,.40)';
    ctx.shadowBlur = 20; ctx.shadowOffsetY = 12;
  }
  ctx.strokeStyle = 'rgba(74,58,40,.55)';
  ctx.lineWidth = w + 3.2;
  ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h, 0); ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.strokeStyle = s.col;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h, 0); ctx.stroke();

  /* ljus ådra och mörk undersida */
  ctx.strokeStyle = 'rgba(255,255,255,.34)';
  ctx.lineWidth = Math.max(1.6, w * 0.22);
  ctx.beginPath(); ctx.moveTo(-h + w * 0.6, -w * 0.24); ctx.lineTo(h - w * 0.6, -w * 0.24); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,40,20,.14)';
  ctx.lineWidth = Math.max(1.4, w * 0.18);
  ctx.beginPath(); ctx.moveTo(-h + w * 0.6, w * 0.30); ctx.lineTo(h - w * 0.6, w * 0.30); ctx.stroke();

  /* ändträ: en liten ljus ring i varje ände */
  ctx.strokeStyle = 'rgba(255,250,243,.55)';
  ctx.lineWidth = Math.max(1.5, w * 0.16);
  ctx.beginPath(); ctx.arc(h - w * 0.5, 0, w * 0.30, -1.4, 1.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(-h + w * 0.5, 0, w * 0.30, Math.PI - 1.4, Math.PI + 1.4); ctx.stroke();
  ctx.restore();
}

function drawHog() {
  const sorted = G.sticks.slice().sort((a, b) => a.z - b.z);
  for (const s of sorted) {
    if (G.grab && G.grab.s === s) continue;
    let x = s.x, y = s.y, rot = s.ang;
    const wob = G.t - s.wig;
    if (wob >= 0 && wob < 0.5) {
      const k = 1 - wob / 0.5;
      rot += Math.sin(wob * 46) * 0.10 * k;
      x += Math.sin(wob * 38) * 4 * k;
    }
    drawStick(s, x, y, rot, s.len, L.stickW, 1, false);
    /* skugga där en pinne ovanpå ligger över den här */
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    for (const o of G.sticks) {
      if (o === s || o.z <= s.z) continue;
      const k = korsning(s, o);
      if (!k) continue;
      const lx = (k.t - 0.5) * s.len;
      ctx.fillStyle = 'rgba(70,50,30,.15)';
      ctx.fillRect(lx - L.stickW * 0.55, -L.stickW * 0.72, L.stickW * 1.1, L.stickW * 1.44);
    }
    ctx.restore();
  }

  /* hint: pulserande ring vid den fria änden av den mest tillgängliga pinnen */
  if (G.hintOn && !G.grab) {
    const fria = taBara().sort((a, b) => b.freeLen - a.freeLen);
    const s = fria[0];
    if (s) {
      const p = friPunkt(s);
      const g = 0.5 + 0.5 * Math.sin(G.t * 4.2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, L.stickW * (2.0 + 0.5 * g), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(247,201,72,' + (0.45 + 0.35 * g) + ')';
      ctx.lineWidth = 4; ctx.stroke();
    }
  }

  /* den gripna pinnen ritas överst */
  if (G.grab) {
    const s = G.grab.s;
    drawStick(s, G.grab.x, G.grab.y, s.ang, s.len * 1.05, L.stickW * 1.05, 1, true);
  }
}

function drawTray() {
  const ty = H - L.trayH;
  ctx.save();
  rr(L.trayX0 - 4, ty + 4, L.trayW + 8, L.trayH - 10, 20, 'rgba(120,90,50,.20)');
  rr(L.trayX0, ty + 2, L.trayW, L.trayH - 14, 18, COL.woodD);
  rr(L.trayX0 + 4, ty + 6, L.trayW - 8, L.trayH - 22, 14, COL.wood);
  rr(L.trayX0 + 9, ty + 11, L.trayW - 18, L.trayH - 32, 11, '#e6c391');
  ctx.restore();

  for (let i = 0; i < 10; i++) {
    const x = L.trayX0 + L.slotW * (i + 0.5);
    const y = L.trayY + 2;
    if (i < G.taken) {
      drawStick({ col: G.tagna[i] }, x, y, 0, L.miniLen, L.miniW, 1, false);
    } else {
      /* tom plats: en blek pinnskugga så barnet ser hur många som fattas */
      ctx.save();
      ctx.translate(x, y);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(150,112,68,.30)';
      ctx.lineWidth = L.miniW;
      ctx.beginPath(); ctx.moveTo(-L.miniLen / 2, 0); ctx.lineTo(L.miniLen / 2, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,240,.45)';
      ctx.lineWidth = Math.max(1.4, L.miniW * 0.22);
      ctx.beginPath(); ctx.moveTo(-L.miniLen / 2 + 4, -L.miniW * 0.22); ctx.lineTo(L.miniLen / 2 - 4, -L.miniW * 0.22); ctx.stroke();
      ctx.restore();
    }
  }

  /* pinnar som flyger ner i rännan */
  G.flyg.forEach(f => {
    const k = clamp((G.t - f.t0) / 0.42, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    const x = f.x0 + (f.x1 - f.x0) * e;
    const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * H * 0.10;
    drawStick({ col: f.col }, x, y, f.ang * (1 - e), f.len * (1 - 0.62 * e), L.stickW * (1 - 0.4 * e), 1, true);
  });
  G.flyg = G.flyg.filter(f => G.t - f.t0 < 0.45);
}

function drawHUD() {
  const fs = clamp(L.topBar * 0.20, 13, 22);
  text('Plockepinn', W * 0.045, L.topBar * 0.5, fs, COL.ink, 'left');

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

/* ---------------- skärmar ---------------- */
function drawIntro() {
  drawBench();
  const titleFs = clamp(Math.min(W * 0.095, H * 0.082), 24, 52);
  const ty = H * (L.portrait ? 0.115 : 0.135);
  text('Plockepinn', W / 2, ty, titleFs, COL.ink, 'center');
  text('Dra ut en pinne i taget', W / 2, ty + titleFs * 0.92, clamp(titleFs * 0.36, 12, 20), COL.dim, 'center');

  /* en liten exempelhög */
  const len = clamp(Math.min(W * 0.30, H * 0.20), 80, 260);
  const cx = W * 0.5, cy = H * (L.portrait ? 0.45 : 0.50);
  const demo = [
    { ang: -0.30, dx: -0.10, dy: 0.10, col: PINCOL[0] },
    { ang: 0.42, dx: 0.12, dy: -0.06, col: PINCOL[1] },
    { ang: 0.06, dx: 0.02, dy: 0.02, col: PINCOL[2] },
    { ang: -0.72, dx: 0.20, dy: 0.18, col: PINCOL[3] },
    { ang: 0.90, dx: -0.18, dy: -0.14, col: PINCOL[4] }
  ];
  demo.forEach(d => {
    drawStick({ col: d.col }, cx + d.dx * len, cy + d.dy * len, d.ang, len, L.stickW * 1.1, 1, false);
  });

  if (window.KOTTEN) {
    const ks = clamp(H * 0.20, 70, 190);
    ctx.save();
    el(W * 0.13, H * 0.955, ks * 0.26, ks * 0.055, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.13, H * 0.94, ks, { wave: true });
    ctx.restore();
  }

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
  drawBench();
  drawHUD();
  drawTray();
  drawHog();
  if (G.t - G.lastTake > 13 && !G.hintOn && G.taken < 10) { G.hintOn = true; }
}

function drawFest() {
  drawBench();
  drawTray();
  const titleFs = clamp(Math.min(W * 0.078, H * 0.066), 22, 46);
  text('Bra jobbat!', W / 2, H * (L.portrait ? 0.13 : 0.15), titleFs, COL.ink, 'center');
  text('Du plockade alla tio', W / 2, H * (L.portrait ? 0.13 : 0.15) + titleFs * 0.95,
    clamp(titleFs * 0.38, 12, 20), COL.dim, 'center');

  /* räknaren: en ring runt den pinne Kotten räknar just nu */
  if (G.rakna > 0) {
    const i = Math.min(9, G.rakna - 1);
    const x = L.trayX0 + L.slotW * (i + 0.5);
    const g = 0.5 + 0.5 * Math.sin(G.t * 5);
    ctx.beginPath();
    ctx.arc(x, L.trayY + 2, L.miniLen * 0.42 + 4 * g, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(247,201,72,.9)';
    ctx.lineWidth = 4; ctx.stroke();
  }

  if (window.KOTTEN) {
    const ks = clamp(H * 0.19, 66, 180);
    ctx.save();
    el(W * 0.12, H - L.trayH - 4, ks * 0.26, ks * 0.055, 'rgba(90,70,45,.18)');
    KOTTEN.drawAtFeet(ctx, W * 0.12, H - L.trayH - 8, ks, { wave: true });
    ctx.restore();
  }

  const r = clamp(Math.min(W, H) * 0.068, 30, 56);
  const by = H - L.trayH - r - 34;
  const b = drawVidare(W / 2, by, r, 'again', COL.coral);
  text('En gång till', W / 2, by + r + 20, clamp(r * 0.42, 11, 16), COL.dim, 'center');
  G.hits.push(b);
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

function start() {
  G.screen = 'spel';
  G.conf = [];
  G.t = (performance.now() - T0) / 1000;
  nyHog();
  speak(ROST.start, true);
  G.sayDo = ROST.hjalp;
  G.sayAt = G.t + 1.4;
}

function stickVid(x, y) {
  /* fingret är lite större än pinnen, men inte så stor att grannpinnen tas */
  const rad = Math.max(L.stickW * 1.35, 20);
  let basta = null, bastD = 1e9;
  for (const s of G.sticks) {
    const d = distSeg(x, y, s);
    if (d > rad) continue;
    if (!basta || s.z > basta.z || (s.z === basta.z && d < bastD)) { basta = s; bastD = d; }
  }
  return basta;
}

function taUpp(s, x, y) {
  G.grab = {
    s: s, x: s.x, y: s.y, x0: s.x, y0: s.y, sx: x, sy: y, d: 0, rorde: false
  };
  SND.grep();
}

function slapp() {
  if (!G.grab) return;
  const s = G.grab.s;
  G.grab = null;
  if (G.screen !== 'spel') return;
  const i = G.taken;
  G.sticks = G.sticks.filter(k => k !== s);
  G.tagna.push(s.col);
  G.taken++;
  G.misses = 0;
  G.hintOn = false;
  G.lastTake = G.t;
  G.flyg.push({
    col: s.col, x0: s.x, y0: s.y, x1: L.trayX0 + L.slotW * (i + 0.5), y1: L.trayY + 2,
    t0: G.t, ang: s.ang, len: s.len
  });
  SND.ner();
  setTimeout(() => SND.ratt(), 90);
  speak(ROST.num[i] || ROST.num[9], true);
  konfetti(s.x, s.y, 8);
  updateFree();
  if (G.taken >= 10) {
    G.screen = 'fest';
    G.festT = G.t;
    G.rakna = 0;
    G.raknaAt = G.t + 1.1;
    SND.win();
    speak(ROST.klar, true);
    for (let k = 0; k < 34; k++) {
      G.conf.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 60, vy: 70 + Math.random() * 110,
        a: Math.random() * 6, va: (Math.random() - 0.5) * 6, s: 7 + Math.random() * 10,
        col: [COL.star, COL.mint, COL.coral, '#a97fb5'][Math.floor(Math.random() * 4)], liv: 8
      });
    }
  }
}

function onDown(x, y) {
  audio();
  const h = hitAt(x, y);
  if (h) {
    const id = String(h.id);
    if (id === 'start' || id === 'igen') { SND.tryck(); start(); return; }
    if (id === 'spela') {
      SND.tryck();
      speak(G.screen === 'spel' ? ROST.hjalp : ROST.start, true);
      return;
    }
  }
  if (G.screen !== 'spel') return;

  const s = stickVid(x, y);
  if (!s) return;
  if (taBar(s)) {
    taUpp(s, x, y);
  } else {
    s.wig = G.t;
    G.misses++;
    SND.fast();
    speak(ROST.fel, true);
    if (G.misses >= 2) {
      G.hintOn = true;
      SND.tick();
      G.sayDo = ROST.hint;
      G.sayAt = G.t + 1.5;
    }
  }
}

function onMove(x, y) {
  if (!G.grab) return;
  const g = G.grab, s = g.s;
  /* pinnen glider ut längs sin egen längd — som ur en riktig hög */
  const dx = x - g.sx, dy = y - g.sy;
  const along = dx * Math.cos(s.ang) + dy * Math.sin(s.ang);
  g.d = along;
  g.x = g.x0 + Math.cos(s.ang) * along;
  g.y = g.y0 + Math.sin(s.ang) * along;
  s.x = g.x; s.y = g.y;
  if (Math.abs(along) > 6) g.rorde = true;
}

function onUp() {
  slapp();
}

function hitAt(x, y) {
  for (let i = G.hits.length - 1; i >= 0; i--) {
    const h = G.hits[i];
    if (h.r != null) {
      if ((x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r) return h;
    } else if (Math.abs(x - h.x) <= h.w / 2 && Math.abs(y - h.y) <= h.h / 2) return h;
  }
  return null;
}

function update(dt) {
  G.t = (performance.now() - T0) / 1000;
  if (G.sayDo && G.t >= G.sayAt) {
    const s = G.sayDo;
    G.sayDo = null;
    if (G.screen === 'spel') speak(s, true);
  }
  if (G.screen === 'fest' && G.rakna < 10 && G.t >= G.raknaAt) {
    G.rakna++;
    G.raknaAt = G.t + 0.62;
    SND.tick();
    speak(ROST.num[G.rakna - 1], true);
    if (G.rakna === 10) {
      G.sayDo = ROST.bra;
      G.sayAt = G.t + 0.9;
    }
  }
  for (const c of G.conf) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.a += c.va * dt; c.liv -= dt;
  }
  G.conf = G.conf.filter(c => c.liv > 0 && c.y < H + 40);
}

/* ---------------- pek ---------------- */
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  const r = cv.getBoundingClientRect();
  onDown(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointermove', (e) => {
  if (!G.grab) return;
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  onMove(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointerup', (e) => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  onMove(e.clientX - r.left, e.clientY - r.top);
  onUp();
});
cv.addEventListener('pointercancel', () => { slapp(); });
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
window.__pp = {
  state() {
    return {
      screen: G.screen, taken: G.taken, misses: G.misses, hint: G.hintOn,
      grab: G.grab ? G.grab.s.z : null,
      sticks: G.sticks.map(s => ({
        z: s.z, x: Math.round(s.x), y: Math.round(s.y),
        free: Math.round(s.freeLen), ta: taBar(s)
      })),
      hits: G.hits.length, errs: window.__errs.slice(), size: [W, H]
    };
  },
  start() { start(); return this.state(); },
  free() { return taBara().map(s => s.z); },
  point(z) { const s = G.sticks.find(k => k.z === z); if (!s) return null; return friPunkt(s); },
  tap(z) {
    const s = G.sticks.find(k => k.z === z);
    if (!s) return this.state();
    const p = friPunkt(s);
    onDown(p.x, p.y);
    onUp();
    return this.state();
  },
  /* tryck på en punkt som ligger under en annan pinne */
  tapUnder() {
    for (const s of G.sticks) {
      for (let k = 1; k < 20; k++) {
        const p = pointOn(s, k / 20);
        if (!friVid(s, p.x, p.y)) { onDown(p.x, p.y); onUp(); return this.state(); }
      }
    }
    return this.state();
  },
  drag(z, dx, dy) {
    const s = G.sticks.find(k => k.z === z);
    if (!s) return this.state();
    const p = friPunkt(s);
    onDown(p.x, p.y);
    onMove(p.x + (dx || 0), p.y + (dy || 0));
    onUp();
    return this.state();
  },
  next() { /* fest-räknaren */ G.raknaAt = G.t - 0.01; return this.state(); },
  reset() { G.screen = 'intro'; return this.state(); }
};
