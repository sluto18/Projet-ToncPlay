'use strict';
/* ================================================================
   LEMINGS — éditeur de niveau
   Même rendu que le jeu (paintRect / fond / trappe / sortie portés
   à l'identique), analyse des chutes (limite létale 75 px),
   export au format du tableau LEVELS de script.js.
   ================================================================ */

/* ---------------- utilitaires ---------------- */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
function mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------------- constantes ---------------- */
const W = 800, H = 450;
const FATAL_FALL = 75;                 // doit rester synchrone avec le jeu
const LS_KEY = 'lemings_editeur_v1';

/* ---------------- fonte pixel (enseigne EXIT, fidèle au jeu) ---------------- */
const FONT = {
  'E': '111100110100111', 'X': '101101010101101',
  'I': '111010010010111', 'T': '111010010010010'
};
function drawPText(g, str, cx, y, px, color){
  g.fillStyle = color;
  let x = Math.round(cx - (str.length * 4 * px - px) / 2);
  for (const ch of str){
    const gl = FONT[ch];
    if (gl)
      for (let k = 0; k < 15; k++)
        if (gl[k] === '1') g.fillRect(x + (k % 3) * px, y + ((k / 3) | 0) * px, px, px);
    x += 4 * px;
  }
}

/* ---------------- état ---------------- */
function defaultState(){
  return {
    name: 'MON NIVEAU', total: 20, goal: 15, dir: 1, width: 800,
    hatch: null, exit: null,
    theme: 'night',
    rects: [], carves: [], blobs: [],
    skills: { block: 4, dig: 3, float: 8, climb: 1, bash: 3, build: 1, mine: 1, bomb: 5 }
  };
}
let state = defaultState();

let tool = 'earth';
let snapOn = true, showGrid = true, showFall = true;
let drag = null, measure = null, hoverObj = null;
const mouse = { x: 0, y: 0, in: false };
let edges = [], hatchInfo = null;
let undoStack = [], redoStack = [];
let codeDirty = false, saveTimer = 0;
let curStyle = 'night.groundA', brushSize = 12;
let LW = 800, camX = 0;

const TOOL_ORDER = ['earth', 'stone', 'brush', 'carve', 'erase', 'hatch', 'exit', 'measure'];
const HINTS = {
  earth:  'TERRE — rectangle avec la matière du menu MATIÈRE (les 5 atmosphères y sont disponibles).',
  stone:  'PIERRE — rectangle ; le menu MATIÈRE bascule automatiquement sur un mur.',
  brush:  'PINCEAU — sculpte à main levée la matière choisie dans le menu MATIÈRE.',
  carve:  'FOSSE — cliquez-glissez pour retirer du terrain (piège, gouffre, galerie).',
    erase:  'GOMME — cliquez ou glissez en maintenant le clic pour effacer tout ce qui passe sous la souris.',
  hatch:  'TRAPPE — cliquez (ou glissez) pour placer la trappe d\'apparition.',
  exit:   'SORTIE — cliquez (ou glissez) pour placer la porte de sortie.',
  measure:'MÈTRE — cliquez-glissez pour mesurer (la branche verticale se colore selon la léthalité).'
};
const SEV_COL = { ok: '#5ad25a', warn: '#f4d43c', dead: '#e05548', void: '#e05548' };

/* ---------------- canvas ---------------- */
const cv = $('#game'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const terrain = document.createElement('canvas'); terrain.width = W; terrain.height = H;
const tctx = terrain.getContext('2d');
const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
const bctx = bg.getContext('2d');
const gridc = document.createElement('canvas'); gridc.width = W; gridc.height = H;
let mask = new Uint8Array(W * H);

/* ---------------- décor de fond (porté du jeu, statique) ---------------- */
/* ============ THÈMES & MOTEUR DE PEINTURE (bloc partagé avec l'éditeur) ============ */
const THEMES = {
  night: {
    name:'NUIT ÉTOILÉE',
    ambient:{ col:'#dfe4f2', vy:0, n:26, tw:true, seed:7 },
    styles:{
      groundA:{ kind:'ground', name:'TERRE FRANCHE', base:'#7c4c24', mot:['#8f5a2b','#6a3d1a','#96652f','#5c3415','#865226'], edge:'rgba(40,22,8,.5)', top:{a:'#35923a',b:'#2a7a2f',hi:'#57c24f',hi2:'#4bbd4a'} },
      groundB:{ kind:'ground', name:'TERRE SÈCHE', base:'#96682e', mot:['#a87a3e','#7c5222','#b08648','#6a4418'], edge:'rgba(50,30,8,.5)', top:{a:'#b8a03c',b:'#967e2c',hi:'#d4bc54'} },
      wallA:{ kind:'wall', name:'PIERRE', base:'#676d80', line:'#4a4f61', hi:'#8b91a6', lo:'#3c4050', spark:'#949ab0' },
      wallB:{ kind:'wall', name:'GRANIT', base:'#565c70', line:'#3a3f50', hi:'#767c92', lo:'#282c3a', spark:'#8c92a8' }
    }
  },
  dawn: {
    name:'AUBE DÉSERTIQUE',
    ambient:{ col:'#f8e8b0', vy:-0.15, n:10, tw:false, seed:12 },
    styles:{
      groundA:{ kind:'ground', name:'GRÈS', base:'#c98d52', mot:['#d89f66','#b0763e','#e0b070','#9c6432'], edge:'rgba(80,48,16,.45)', top:{a:'#4bbd4a',b:'#35923a',hi:'#6ee06a'} },
      groundB:{ kind:'ground', name:'ROCHE ROUGE', base:'#a04a30', mot:['#b25a3c','#84381f','#c06a46','#6e2c16'], edge:'rgba(50,18,8,.5)' },
      wallA:{ kind:'wall', name:'BRIQUE CUITE', base:'#b06038', line:'#8a4426', hi:'#d07c4a', lo:'#6e3018', spark:'#c87848' },
      wallB:{ kind:'wall', name:'ADOBE', base:'#d8b078', line:'#b89058', hi:'#ecd0a0', lo:'#9c7848', spark:'#e0c088' }
    }
  },
  cave: {
    name:'CAVERNE AUX CRISTAUX',
    ambient:{ col:'#58e0d8', vy:0, n:18, tw:true, seed:23 },
    styles:{
      groundA:{ kind:'ground', name:'ROCHE VIOLETTE', base:'#6a5678', mot:['#7a6490','#5a4868','#8670a0','#4c3c5c'], edge:'rgba(24,16,36,.55)', top:{a:'#46b8a0',b:'#2e9078',hi:'#6ee0c4'} },
      groundB:{ kind:'ground', name:'BASALTE', base:'#3a4258', mot:['#46506a','#2e3648','#525e7c','#262c3c'], edge:'rgba(12,16,28,.6)' },
      wallA:{ kind:'wall', name:'CRISTAL', base:'#58c8d8', line:'#3a98ac', hi:'#8ce8f4', lo:'#2a7284', spark:'#c0f4fc' },
      wallB:{ kind:'wall', name:'GRANIT SOMBRE', base:'#46425a', line:'#302c44', hi:'#625e7c', lo:'#201c34', spark:'#7a76a0' }
    }
  },
  volcano: {
    name:'VOLCAN',
    ambient:{ col:'#f4a03c', vy:-0.35, n:22, tw:true, seed:34 },
    styles:{
      groundA:{ kind:'ground', name:'ROCHE NOIRE', base:'#3c3438', mot:['#4a4046','#2e282c','#56484e','#241f24'], edge:'rgba(10,6,8,.6)', top:{a:'#6a6068',b:'#524a52',hi:'#8a8088'} },
      groundB:{ kind:'ground', name:'ROCHE MAGMATIQUE', base:'#5a2e28', mot:['#6e3a30','#46221c','#7c4638','#e0552f'], edge:'rgba(20,6,4,.6)', top:{a:'#e0552f',b:'#a83418',hi:'#f4a03c'} },
      wallA:{ kind:'wall', name:'OBSIDIENNE', base:'#2a2832', line:'#1c1a24', hi:'#46425a', lo:'#12101a', spark:'#5a5670' },
      wallB:{ kind:'wall', name:'BRIQUE CALCINÉE', base:'#6a3a2c', line:'#4a2418', hi:'#8a543c', lo:'#38180e', spark:'#c06a3c' }
    }
  },
  ice: {
    name:'BANQUISE',
    ambient:{ col:'#f0f6ff', vy:0.45, n:30, tw:false, seed:45 },
    styles:{
      groundA:{ kind:'ground', name:'NEIGE', base:'#dce8f4', mot:['#eef6ff','#c8d8ea','#f8faff','#b8cce0'], edge:'rgba(120,150,190,.35)', top:{a:'#f8faff',b:'#e4eefc',hi:'#ffffff'} },
      groundB:{ kind:'ground', name:'PERMAFROST', base:'#7c98b8', mot:['#8caac8','#6c88a8','#9cbad6','#5c7898'], edge:'rgba(30,50,80,.4)', top:{a:'#cfe4f8',b:'#b0cce8',hi:'#e8f4ff'} },
      wallA:{ kind:'wall', name:'GLACE', base:'#a8d4ec', line:'#7cb4d8', hi:'#d0ecfc', lo:'#5c94c0', spark:'#ffffff' },
      wallB:{ kind:'wall', name:'ROC GELÉ', base:'#68809a', line:'#4c627a', hi:'#8ca4bc', lo:'#38485c', spark:'#c0d4e4' }
    }
  }
};
const STYLES_K = ['groundA', 'groundB', 'wallA', 'wallB'];
let curTheme = 'night';
function setTheme(t){ curTheme = THEMES[t] ? t : 'night'; }
function styleOf(r){
  let s = r.style, theme = null, k = null;
  if (typeof s === 'string' && s.indexOf('.') > 0){
    const q = s.split('.');
    if (THEMES[q[0]] && THEMES[q[0]].styles[q[1]]){ theme = q[0]; k = q[1]; }
  }
  if (!theme){
    k = STYLES_K.includes(s) ? s : (r.stone ? 'wallA' : 'groundA');
    theme = curTheme;
  }
  return { k, st: THEMES[theme].styles[k] };
}

function paintRect(r){
  const { k, st } = styleOf(r);
  const rnd = mulberry32(r.x*73 + r.y*151 + r.w*7 + r.h*13 + k.charCodeAt(k.length-1) + (st.kind === 'wall' ? 5 : 0));
  if (st.kind === 'wall'){
    tctx.fillStyle = st.base; tctx.fillRect(r.x, r.y, r.w, r.h);
    tctx.fillStyle = st.line;
    for (let j = r.y; j < r.y + r.h; j += 8){
      tctx.fillRect(r.x, j, r.w, 1);
      const off = (((j - r.y) / 8) | 0) % 2 ? 6 : 0;
      for (let i = r.x + off; i < r.x + r.w; i += 12) tctx.fillRect(i, j, 1, 8);
    }
    tctx.fillStyle = st.hi;   tctx.fillRect(r.x, r.y, r.w, 2);
    tctx.fillStyle = st.lo;   tctx.fillRect(r.x, r.y + r.h - 2, r.w, 2);
    tctx.fillStyle = st.spark;
    for (let i = 0; i < r.w / 14; i++)
      tctx.fillRect(r.x + (rnd() * r.w) | 0, r.y + 3 + (rnd() * (r.h - 6)) | 0, 3, 1);
    return;
  }
  tctx.fillStyle = st.base; tctx.fillRect(r.x, r.y, r.w, r.h);
  const n = Math.floor(r.w * r.h / 55);
  for (let i = 0; i < n; i++){
    tctx.fillStyle = st.mot[(rnd() * st.mot.length) | 0];
    tctx.fillRect(r.x + (rnd() * r.w) | 0, r.y + (rnd() * r.h) | 0, 2 + (rnd() * 2 | 0), 2 + (rnd() * 2 | 0));
  }
  const pn = Math.floor(r.w / 55) + 2;
  for (let i = 0; i < pn; i++){
    const px = r.x + 8 + rnd() * (r.w - 20), py = r.y + 10 + rnd() * (r.h - 16);
    tctx.fillStyle = '#8d90a0'; tctx.fillRect(px, py, 5, 4);
    tctx.fillStyle = '#62657a'; tctx.fillRect(px, py + 3, 5, 1);
    tctx.fillStyle = '#a9adbd'; tctx.fillRect(px, py, 2, 1);
  }
  tctx.fillStyle = st.edge;
  tctx.fillRect(r.x, r.y + r.h - 3, r.w, 3);
  tctx.fillRect(r.x, r.y, 2, r.h); tctx.fillRect(r.x + r.w - 2, r.y, 2, r.h);
  if (r.grass && st.top){
    for (let i = r.x; i < r.x + r.w; i++){
      const over = rnd() < .16 ? -(1 + (rnd() * 2 | 0)) : 0;
      const depth = 5 + (rnd() * 3 | 0);
      tctx.fillStyle = rnd() < .45 ? st.top.a : st.top.b;
      tctx.fillRect(i, r.y + over, 1, depth - over);
      if (over < 0){ tctx.fillStyle = st.top.hi2 || st.top.hi; tctx.fillRect(i, r.y + over, 1, 1); }
      if (rnd() < .28){ tctx.fillStyle = st.top.hi; tctx.fillRect(i, r.y, 1, 1); }
    }
  }
}

/* forme à main levée : disque de terrain peint par scanlines + masque */
function paintBlob(b){
  const W = LW;
  const { k, st } = styleOf(b);
  const cx = b.x, cy = b.y, r = b.r;
  for (let j = -r; j <= r; j++){
    const y = cy + j;
    if (y < 0 || y >= H) continue;
    const half = Math.floor(Math.sqrt(r * r - j * j));
    if (half < 0) continue;
    const x0 = Math.max(0, cx - half), x1 = Math.min(W, cx + half + 1);
    if (x1 <= x0) continue;
    tctx.fillStyle = st.base;
    tctx.fillRect(x0, y, x1 - x0, 1);
    mask.fill(1, y * W + x0, y * W + x1);
    if (st.edge && j >= r - 3){ tctx.fillStyle = st.edge; tctx.fillRect(x0, y, x1 - x0, 1); }
  }
  const rnd = mulberry32(cx * 31 + cy * 17 + r * 7 + k.charCodeAt(k.length - 1));
  const n = Math.floor(r * r / 16);
  for (let i = 0; i < n; i++){
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (r - 1);
    const px = Math.round(cx + Math.cos(a) * d), py = Math.round(cy + Math.sin(a) * d);
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    tctx.fillStyle = st.kind === 'wall' ? (rnd() < .5 ? st.hi : st.line) : st.mot[(rnd() * st.mot.length) | 0];
    tctx.fillRect(px, py, 2, 2);
  }
  if (b.grass && st.top){
    for (let i = -r; i <= r; i++){
      const x = cx + i;
      if (x < 0 || x >= W) continue;
      const half = Math.floor(Math.sqrt(r * r - i * i));
      const ty = cy - half;
      if (ty < 1 || ty >= H) continue;
      if (!mask[ty * W + x] || mask[(ty - 1) * W + x]) continue;
      tctx.fillStyle = rnd() < .45 ? st.top.a : st.top.b;
      tctx.fillRect(x, ty, 1, 5 + (rnd() * 3 | 0));
      if (rnd() < .28){ tctx.fillStyle = st.top.hi; tctx.fillRect(x, ty, 1, 1); }
    }
  }
}

/* décors de fond des 5 atmosphères */
function ridge(g, color, baseY, step, amp, seed){
  const W = LW;   // ombrage : largeur monde
  const rr = mulberry32(seed);
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, H); g.lineTo(0, baseY);
  let x = 0;
  while (x < W){ x += step * (0.6 + rr() * 0.8); g.lineTo(Math.min(x, W), baseY - amp * rr()); }
  g.lineTo(W, H); g.closePath(); g.fill();
}
function dune(g, color, baseY, wlen, amp, seed){
  const W = LW;   // ombrage : largeur monde
  const rr = mulberry32(seed), p = rr() * 6.28;
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, H); g.lineTo(0, baseY);
  for (let x = 0; x <= W; x += 8)
    g.lineTo(x, baseY - amp * Math.sin(x / wlen * 6.283 + p) - amp * .3 * Math.sin(x / (wlen * .37) + p * 2));
  g.lineTo(W, H); g.closePath(); g.fill();
}
function paintSky(g, t){
  const W = LW;            // ombrage : largeur monde
  const dens = W / 800;    // densité constante des éléments répétés
  const band = (y, h, c) => { g.fillStyle = c; g.fillRect(0, y, W, h); };
  if (t === 'night'){
    band(0, H, '#0c1020');
    for (let j = -17; j <= 17; j++) for (let i = -17; i <= 17; i++){
      if (i * i + j * j > 289) continue;
      const dx = i - 8, dy = j + 6;
      if (dx * dx + dy * dy <= 210) continue;
      g.fillStyle = (i * i + j * j < 40) ? '#f2efdd' : '#e2ddc4';
      g.fillRect(W - 132 + i, 74 + j, 1, 1);
    }
    const r = mulberry32(42);
    const nst = Math.round(80 * dens);
    for (let i = 0; i < nst; i++){
      const x = (r() * W) | 0, y = (r() * 250) | 0;
      g.globalAlpha = .3 + r() * .5;
      g.fillStyle = r() < .3 ? '#8ea0d0' : '#dfe4f2';
      g.fillRect(x, y, 1, 1);
      if (r() < .12) g.fillRect(x - 1, y, 3, 1);
    }
    g.globalAlpha = 1;
    ridge(g, '#131a30', 305, 70, 95, 11);
    ridge(g, '#1a2340', 345, 55, 60, 23);
  } else if (t === 'dawn'){
    band(0, 140, '#241436'); band(140, 70, '#4a2a4e');
    band(210, 60, '#8a4656'); band(270, 40, '#c87848'); band(310, H - 310, '#e0a060');
    const dz = (y, c) => { g.fillStyle = c; for (let x = 0; x < W; x += 2) g.fillRect(x, y - 1, 1, 1); };
    dz(140, '#4a2a4e'); dz(210, '#8a4656'); dz(270, '#c87848');
    for (let j = -26; j <= 26; j++) for (let i = -26; i <= 26; i++){
      if (i * i + j * j > 676) continue;
      g.fillStyle = (i * i + j * j < 400) ? '#fce8b8' : '#f4c86a';
      g.fillRect(W - 200 + i, 236 + j, 1, 1);
    }
    const rb = mulberry32(9);
    g.fillStyle = '#33203c';
    const nss = Math.max(5, Math.round(5 * dens));
    for (let i = 0; i < nss; i++){
      const x = (30 + rb() * (W - 60)) | 0, y = (80 + rb() * 90) | 0;
      g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y, 1, 1); g.fillRect(x + 1, y + 1, 1, 1);
    }
    dune(g, '#7a4638', 330, 120, 22, 31);
    dune(g, '#54291e', 372, 90, 30, 47);
  } else if (t === 'cave'){
    band(0, H, '#05060e');
    const r2 = mulberry32(21);
    for (let x = 8; x < W; x += 14 + ((r2() * 10) | 0)){
      const len = 20 + (r2() * 70) | 0, w0 = 3 + (r2() * 4) | 0;
      for (let j = 0; j < len; j++){
        const w = Math.max(1, Math.round(w0 * (1 - j / len)));
        g.fillStyle = (j % 9 < 2) ? '#241c44' : '#181234';
        g.fillRect(x - (w >> 1), j, w, 1);
      }
    }
    const r3 = mulberry32(33), CC = ['#58e0d8', '#8a6ae8', '#e0d8ff'];
    const ncr = Math.round(26 * dens);
    for (let i = 0; i < ncr; i++){
      const x = (20 + r3() * (W - 40)) | 0, y = (300 + r3() * 120) | 0;
      const h = 5 + (r3() * 8) | 0, w = 2 + (r3() * 3) | 0;
      g.fillStyle = CC[(r3() * 3) | 0];
      for (let j = 0; j < h; j++){
        const ww = Math.max(1, Math.round(w * (j / h) + .5));
        g.fillRect(x - (ww >> 1), y + j, ww, 1);
      }
      g.fillStyle = '#ffffff'; g.fillRect(x, y + 1, 1, 1);
    }
    const r4 = mulberry32(44);
    const nsp = Math.round(40 * dens);
    for (let i = 0; i < nsp; i++){
      g.globalAlpha = .15 + r4() * .3; g.fillStyle = '#58e0d8';
      g.fillRect((r4() * W) | 0, (r4() * H) | 0, 1, 1);
    }
    g.globalAlpha = 1;
  } else if (t === 'volcano'){
    band(0, 150, '#180a0e'); band(150, 70, '#241014'); band(220, H - 220, '#30161a');
    const vx = Math.round(W * .7);
    g.fillStyle = '#0e0608';
    g.beginPath(); g.moveTo(vx - 200, H); g.lineTo(vx, 120); g.lineTo(vx + 200, H); g.closePath(); g.fill();
    g.fillStyle = '#e0552f'; g.fillRect(vx - 12, 119, 24, 3);
    g.fillStyle = '#f4d43c'; g.fillRect(vx - 7, 119, 14, 1);
    g.fillStyle = '#e0552f';
    let lx = vx + 6;
    for (let j = 0; j < 170; j++){
      g.fillRect(lx, 122 + j, 3, 1);
      if (j % 13 === 12) lx += (j % 26 === 25) ? 3 : -3;
    }
    const r5 = mulberry32(66);
    const nem = Math.round(30 * dens);
    for (let i = 0; i < nem; i++){
      g.globalAlpha = .1 + r5() * .2; g.fillStyle = '#e0552f';
      g.fillRect((r5() * W) | 0, (r5() * 260) | 0, 1, 1);
    }
    g.globalAlpha = 1;
  } else { // ice
    band(0, H, '#0a1226');
    const r6 = mulberry32(77);
    for (let x = 30; x < W - 10; x += 9){
      const hgt = 90 + Math.sin(x / 60) * 30 + r6() * 24;
      g.fillStyle = (((x / 9) | 0) % 3 === 0) ? '#46e8b0' : '#46b8e8';
      for (let y = 0; y < hgt; y++){
        g.globalAlpha = .10 + .12 * Math.abs(Math.sin(y / 14));
        g.fillRect(x + Math.round(Math.sin(y / 22) * 4), y, 3, 1);
      }
    }
    g.globalAlpha = 1;
    const r7 = mulberry32(88);
    const nis = Math.round(40 * dens);
    for (let i = 0; i < nis; i++){
      g.globalAlpha = .3 + r7() * .5; g.fillStyle = '#e8f2ff';
      g.fillRect((r7() * W) | 0, (r7() * 220) | 0, 1, 1);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#16243e'; g.fillRect(0, 396, W, H - 396);
    g.fillStyle = '#cfe0f0';
    g.beginPath(); g.moveTo(0, H); g.lineTo(0, 402);
    for (let x = 0; x <= W; x += 10) g.lineTo(x, 398 + Math.sin(x / 70) * 6);
    g.lineTo(W, H); g.closePath(); g.fill();
  }
}

/* particules ambiantes : densité constante sur mondes larges */
function makeAmbient(t){
  const W = LW;   // ombrage : largeur monde
  const a = THEMES[t].ambient, r = mulberry32(a.seed);
  const list = [];
  const n = Math.round(a.n * W / 800);
  for (let i = 0; i < n; i++)
    list.push({ x: (r() * W) | 0, y: (r() * H) | 0, ph: r() * 6.28, sp: 1 + r() * 2.5,
                big: r() < .25, vy: a.vy, col: a.col, tw: a.tw });
  return list;
}

function rebuildBGEd(){
  bg.width = LW;
  paintSky(bctx, state.theme);
  const amb = makeAmbient(state.theme);
  bctx.globalAlpha = .8;
  bctx.fillStyle = THEMES[state.theme].ambient.col;
  for (const p of amb) bctx.fillRect(p.x, p.y, p.big ? 2 : 1, p.big ? 2 : 1);
  bctx.globalAlpha = 1;
}

/* ---------------- gestion de la caméra / largeur ---------------- */
const camEl = $('#camScroll');

function syncCamSlider(){
  camEl.max = Math.max(0, LW - W);
  camEl.value = Math.round(camX);
}

camEl.addEventListener('input', () => {
  camX = clamp(+camEl.value, 0, Math.max(0, LW - W));
});

function applyWidth(){
  LW = state.width;
  camX = clamp(camX, 0, Math.max(0, LW - W));
  buildGrid();
  rebuildBGEd();
  rebuild();
  syncCamSlider();
}

/* ---------------- grille pré-rendue (10 px, accentuée toutes les 50) ---------------- */
function buildGrid(){
  gridc.width = LW; gridc.height = H;
  const g = gridc.getContext('2d');
  g.lineWidth = 1;
  for (let x = 10; x < LW; x += 10){
    g.strokeStyle = x % 50 === 0 ? 'rgba(223,227,238,.16)' : 'rgba(223,227,238,.06)';
    g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke();
  }
  for (let y = 10; y < H; y += 10){
    g.strokeStyle = y % 50 === 0 ? 'rgba(223,227,238,.16)' : 'rgba(223,227,238,.06)';
    g.beginPath(); g.moveTo(0, y + .5); g.lineTo(LW, y + .5); g.stroke();
  }
}

/* ---------------- peinture du terrain (porté du jeu, à l'identique) ---------------- */
function crumbs(x0, y0, x1, y1){
  tctx.fillStyle = 'rgba(35,20,8,.55)';
  const n = ((x1 - x0) + (y1 - y0)) / 3;
  for (let k = 0; k < n; k++){
    const side = (Math.random() * 4) | 0;
    let px, py;
    if (side === 0){ px = x0 + Math.random() * 2; py = y0 + Math.random() * (y1 - y0); }
    else if (side === 1){ px = x1 - 1 - Math.random() * 2; py = y0 + Math.random() * (y1 - y0); }
    else { px = x0 + Math.random() * (x1 - x0); py = y0 + Math.random() * 2; }
    tctx.fillRect(px | 0, py | 0, 1 + (Math.random() * 2 | 0), 1 + (Math.random() * 2 | 0));
  }
}
function carveRect(x, y, w, h){
  x = Math.round(x); y = Math.round(y);
  tctx.clearRect(x, y, w, h);
  for (let j = y; j < y + h; j++){
    if (j < 0 || j >= H) continue;
    const a = Math.max(0, x), b = Math.min(W, x + w);
    if (b > a) mask.fill(0, j * W + a, j * W + b);
  }
  crumbs(x, y, x + w, y + h);
}

function rebuild(){
  hoverObj = null;
  if (terrain.width !== LW) terrain.width = LW;
  mask = new Uint8Array(LW * H);
  tctx.clearRect(0, 0, LW, H);
  for (const r of state.rects){
    paintRect(r);
    for (let j = Math.max(0, r.y); j < Math.min(H, r.y + r.h); j++)
      mask.fill(1, j * LW + Math.max(0, r.x), j * LW + Math.min(LW, r.x + r.w));
  }
  for (const b of state.blobs) paintBlob(b);
  for (const c of state.carves) carveRect(c.x, c.y, c.w, c.h);
  analyze();
  autoCode();
  saveLocal();
}

/* ---------------- collisions / analyse ---------------- */
function colSolid(x, y){
  return x >= 0 && x < LW && y >= 0 && y < H && mask[y * LW + x] === 1;
}
function solid(x, y){
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= LW || y < 0 || y >= H) return false;
  return mask[y * LW + x] === 1;
}
function firstSolidFrom(x, y){
  x = clamp(Math.round(x), 0, LW - 1);
  for (let j = Math.max(0, Math.round(y)); j < H; j++)
    if (mask[j * LW + x]) return j;
  return -1;
}

/* Analyse des chutes : pour chaque colonne de surface, si la colonne
   voisine est vide sur 3 px, c'est un bord → distance jusqu'au sol
   suivant. Détecte aussi les bords intérieurs créés par les fosses. */
function analyze(){
  edges = [];
  const seen = new Set();
  for (let x = 0; x < LW; x++){
    for (let y = 1; y < H; y++){
      if (!mask[y * LW + x] || mask[(y - 1) * LW + x]) continue;
      for (const g of (x === 0 ? [x + 1] : x === LW - 1 ? [x - 1] : [x - 1, x + 1])){
        if (g < 0 || g >= LW) continue;
        if (mask[y * LW + g] || (y + 1 < H && mask[(y + 1) * LW + g]) ||
            (y + 2 < H && mask[(y + 2) * LW + g])) continue;
        const key = g + ':' + y;
        if (seen.has(key)) continue;
        seen.add(key);
        const land = firstSolidFrom(g, y + 3);
        if (land < 0){
          edges.push({ x: g, y, land: H, drop: -1, sev: 'void' });
        } else {
          const drop = land - y;
          if (drop >= 6)
            edges.push({ x: g, y, land, drop,
                         sev: drop <= 70 ? 'ok' : (drop <= FATAL_FALL ? 'warn' : 'dead') });
        }
      }
    }
  }
  hatchInfo = null;
  if (state.hatch){
    const hx = clamp(state.hatch.x, 0, W - 1);
    const landC = firstSolidFrom(hx, state.hatch.y + 1);
    let worst = -1, noFloor = false;
    for (let dx = -4; dx <= 4; dx += 2){
      const l = firstSolidFrom(clamp(hx + dx, 0, W - 1), state.hatch.y + 1);
      if (l < 0){ noFloor = true; break; }
      worst = Math.max(worst, l - state.hatch.y - 1);
    }
    hatchInfo = { land: landC, drop: noFloor ? -1 : worst };
  }
  updateValid();
}

function updateValid(){
  const items = [];
  const add = (sev, txt) => items.push([sev, txt]);

  add('info', state.rects.length + ' terrain(s) · ' + state.carves.length + ' fosse(s) · ' + state.blobs.length + ' forme(s)');

  // --- Vérification du dépassement de la largeur du niveau ---
  const outTerrain = state.rects.filter(r => r.x + (r.w || 0) > state.width).length +
                     state.blobs.filter(b => b.x + b.r > state.width).length +
                     state.carves.filter(c => c.x > state.width).length;
  if (outTerrain) {
    add('warn', outTerrain + ' élément(s) au-delà de x=' + state.width + ' : coupés au rendu.');
  }

  if (!state.rects.length)
    add('err', 'Aucun terrain : dessinez au moins un rectangle (TERRE / PIERRE).');

  if (!state.hatch){
    add('err', 'Trappe non placée (outil TRAPPE).');
  } else if (state.hatch.x > state.width) {
    add('err', 'Trappe hors de la carte (x=' + state.hatch.x + ' > max ' + state.width + ').');
  } else if (solid(state.hatch.x, state.hatch.y - 20)){
    add('warn', 'Trappe enterrée : placez-la au-dessus du sol.');
  } else if (hatchInfo){
    if (hatchInfo.drop < 0) add('err', 'Chute de la trappe : sans fond.');
    else if (hatchInfo.drop > FATAL_FALL)
      add('err', 'Chute de la trappe : ' + hatchInfo.drop + ' px — mortelle (limite ' + FATAL_FALL + ' px).');
    else if (hatchInfo.drop > 70)
      add('warn', 'Chute de la trappe : ' + hatchInfo.drop + ' px — juste à la limite.');
    else
      add('ok', 'Chute de la trappe : ' + hatchInfo.drop + ' px — survécue.');
  }

  if (!state.exit){
    add('err', 'Sortie non placée (outil SORTIE).');
  } else if (state.exit.x > state.width) {
    add('err', 'Sortie hors de la carte (x=' + state.exit.x + ' > max ' + state.width + ').');
  } else {
    const t = firstSolidFrom(state.exit.x, Math.max(0, state.exit.y));
    if (t < 0) add('err', 'La sortie flotte au-dessus du vide.');
    else if (Math.abs(t - state.exit.y) > 6)
      add('warn', 'Sol de la sortie à y=' + t + ' : posez la sortie à cette hauteur.');
    else add('ok', 'Sortie posée sur son sol (y=' + t + ').');
    if (solid(state.exit.x, state.exit.y - 24))
      add('warn', 'La porte est enfouie dans le terrain.');
  }

  if (state.goal > state.total)
    add('err', 'Objectif (' + state.goal + ') supérieur au nombre de lemmings (' + state.total + ').');
  else if (state.goal < 1)
    add('warn', 'Objectif à 0 : victoire dès l\'écran vide.');

  const skSum = state.skills.block + state.skills.dig + state.skills.float +
                state.skills.bash + state.skills.build + state.skills.bomb;
  if (!skSum) add('warn', 'Aucune compétence dans le kit.');

  const deadly = edges.filter(e => e.sev === 'dead' || e.sev === 'void').length;
  if (deadly) add('warn', deadly + ' bord(s) à chute mortelle ou sans fond (repères rouges).');
  else if (edges.length) add('ok', edges.length + ' bord(s) de chute analysés — tous survécus.');

  $('#valid').innerHTML = items.map(it => '<li class="' + it[0] + '">' + it[1] + '</li>').join('');
}

/* ---------------- rendu ---------------- */
function drawFalls(){
  ctx.save();
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.lineWidth = 1;
  for (const e of edges){
    const col = SEV_COL[e.sev];
    ctx.strokeStyle = col;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(e.x + .5, e.y); ctx.lineTo(e.x + .5, e.land); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
    ctx.fillText(e.sev === 'void' ? 'VIDE' : String(e.drop), e.x + 4, (e.y + e.land) / 2 + 3);
  }
  if (state.hatch && hatchInfo){
    const hx = clamp(state.hatch.x, 0, W - 1);
    const land = hatchInfo.drop < 0 ? H : hatchInfo.land;
    const sev = hatchInfo.drop < 0 || hatchInfo.drop > FATAL_FALL ? 'dead'
              : (hatchInfo.drop > 70 ? 'warn' : 'ok');
    ctx.strokeStyle = SEV_COL[sev];
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(hx + .5, state.hatch.y); ctx.lineTo(hx + .5, land); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = SEV_COL[sev];
    ctx.fillRect(hx - 3, state.hatch.y - 3, 6, 6);
    ctx.fillText(hatchInfo.drop < 0 ? 'VIDE' : hatchInfo.drop + 'px', hx + 6, (state.hatch.y + land) / 2 + 3);
  }
  ctx.restore();
}

/* trappe et porte : dessin porté du jeu (état fermé) */
function drawHatchEd(){
  if (!state.hatch) return;
  const x = state.hatch.x, y = state.hatch.y;
  const w = 48, h = 30, x0 = x - 24, y0 = y - h;
  ctx.strokeStyle = '#57432c'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 6, y0 + 6); ctx.lineTo(x0 + 6, 0);
  ctx.moveTo(x0 + w - 6, y0 + 6); ctx.lineTo(x0 + w - 6, 0);
  ctx.stroke();
  ctx.fillStyle = '#6f441c'; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#8a5a2a';
  for (let j = 0; j < 3; j++) ctx.fillRect(x0 + 3, y0 + 3 + j * 9, w - 6, 7);
  ctx.fillStyle = '#c9a35f';
  ctx.fillRect(x0 + 4, y0 + 4, 2, 2); ctx.fillRect(x0 + w - 6, y0 + 4, 2, 2);
  ctx.fillRect(x0 + 4, y0 + h - 6, 2, 2); ctx.fillRect(x0 + w - 6, y0 + h - 6, 2, 2);
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  ctx.fillStyle = '#f4d43c';
  ctx.fillRect(x - 8, y0 + 6, 16, 3);
  ctx.fillRect(x - 5, y0 + 9, 10, 3);
  ctx.fillRect(x - 2, y0 + 12, 4, 4);
  ctx.fillStyle = '#241505'; ctx.fillRect(x - 1, y0 + 13, 2, 2);
  ctx.fillStyle = '#0a0705'; ctx.fillRect(x - 12, y - 2, 24, 6);
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(x - 12, y - 3, 12, 5);
  ctx.fillRect(x, y - 3, 12, 5);
}
function drawExitEd(){
  if (!state.exit) return;
  const x = state.exit.x, gy = state.exit.y;
  const w = 46, h = 50, x0 = Math.round(x - w / 2), y0 = gy - h;
  ctx.fillStyle = '#05070d'; ctx.fillRect(x0 + 5, y0 + 6, w - 10, h - 6);
  const bw = (w - 10) / 2;
  ctx.fillStyle = '#7a4c20';
  ctx.fillRect(x0 + 5, y0 + 6, bw, h - 6);
  ctx.fillRect(x0 + w - 5 - bw, y0 + 6, bw, h - 6);
  ctx.fillStyle = '#9a6631';
  ctx.fillRect(x0 + 5, y0 + 10, bw, 2); ctx.fillRect(x0 + 5, y0 + 22, bw, 2);
  ctx.fillRect(x0 + w - 5 - bw, y0 + 10, bw, 2);
  ctx.fillRect(x0 + w - 5 - bw, y0 + 22, bw, 2);
  ctx.fillStyle = '#82868f';
  ctx.fillRect(x0, y0, 5, h); ctx.fillRect(x0 + w - 5, y0, 5, h);
  ctx.fillStyle = '#b6bac8';
  ctx.fillRect(x0, y0, 5, 2); ctx.fillRect(x0 + w - 5, y0, 5, 2);
  ctx.fillStyle = '#565c6e';
  ctx.fillRect(x0, y0 + h - 5, 5, 5); ctx.fillRect(x0 + w - 5, y0 + h - 5, 5, 5);
  ctx.fillStyle = '#82868f'; ctx.fillRect(x0 - 5, y0 - 7, w + 10, 8);
  ctx.fillStyle = '#b6bac8'; ctx.fillRect(x0 - 5, y0 - 7, w + 10, 2);
  ctx.fillStyle = '#6a7085'; ctx.fillRect(x0 - 8, gy - 3, w + 16, 4);
  ctx.fillStyle = '#10131f'; ctx.fillRect(x0 + 3, y0 - 24, w - 6, 14);
  ctx.strokeStyle = '#454c66'; ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 4, y0 - 23, w - 8, 12);
  drawPText(ctx, 'EXIT', x, y0 - 21, 2, '#ffb340');
}

function normRect(d){
  const x0 = clamp(Math.min(d.x0, d.x1), 0, LW);
  const y0 = clamp(Math.min(d.y0, d.y1), 0, H);
  const x1 = clamp(Math.max(d.x0, d.x1), 0, LW);
  const y1 = clamp(Math.max(d.y0, d.y1), 0, H);
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}
function objBounds(o){
  if (o.type === 'hatch') return { x: state.hatch.x - 24, y: state.hatch.y - 30, w: 48, h: 32 };
  if (o.type === 'exit')  return { x: state.exit.x - 23,  y: state.exit.y - 52,  w: 46, h: 54 };
  if (o.type === 'blob'){
    const b = state.blobs[o.i];
    return { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
  }
  const b = (o.type === 'carve' ? state.carves : state.rects)[o.i];
  return { x: b.x, y: b.y, w: b.w, h: b.h };
}

function drawMeasure(){
  const m = (drag && drag.kind === 'measure') ? drag : measure;
  if (!m) return;
  const dy = Math.abs(m.y1 - m.y0);
  const sevCol = dy <= 70 ? '#5ad25a' : (dy <= FATAL_FALL ? '#f4d43c' : '#e05548');
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffb340';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(m.x0 + .5, m.y0 + .5); ctx.lineTo(m.x1 + .5, m.y0 + .5); ctx.stroke();
  ctx.strokeStyle = sevCol;
  ctx.beginPath(); ctx.moveTo(m.x1 + .5, m.y0 + .5); ctx.lineTo(m.x1 + .5, m.y1 + .5); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f4f6ff';
  ctx.fillRect(m.x0 - 2, m.y0 - 2, 4, 4);
  ctx.fillRect(m.x1 - 2, m.y1 - 2, 4, 4);
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#ffb340';
  ctx.fillText('Δx ' + Math.abs(m.x1 - m.x0), (m.x0 + m.x1) / 2 + 4, m.y0 - 5);
  ctx.fillStyle = sevCol;
  ctx.fillText('Δy ' + dy, m.x1 + 5, (m.y0 + m.y1) / 2 + 4);
  ctx.restore();
}

function drawOverlays(){
  if (tool === 'brush' && mouse.in){
    ctx.save();
    ctx.strokeStyle = styleKind(curStyle) === 'wall' ? '#8b91a6' : '#5ad25a';
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, brushSize, 0, 6.2832);
    ctx.stroke();
    ctx.restore();
  }
  // objet survolé en mode gomme
  if (tool === 'erase' && hoverObj && !drag){
    const b = objBounds(hoverObj);
    ctx.save();
    ctx.fillStyle = 'rgba(224,85,72,.14)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#f4f6ff'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(b.x + .5, b.y + .5, b.w, b.h);
    ctx.restore();
  }
  // prévisualisation rectangle / fosse
  if (drag && (drag.kind === 'earth' || drag.kind === 'stone' || drag.kind === 'carve')){
    const r = normRect(drag);
    const col = drag.kind === 'carve' ? '#e05548' : '#5ad25a';
    ctx.save();
    ctx.fillStyle = drag.kind === 'carve' ? 'rgba(224,85,72,.15)' : 'rgba(90,210,90,.15)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(r.x + .5, r.y + .5, r.w, r.h);
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(r.w + ' × ' + r.h, r.x + 4, r.y < 14 ? r.y + 14 : r.y - 4);
    ctx.restore();
  }
  // fantômes trappe / sortie
  if (!drag && mouse.in && (tool === 'hatch' || tool === 'exit')){
    const gx = snap(mouse.x), gy = snap(mouse.y);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    if (tool === 'hatch'){
      const x = clamp(gx, 24, LW - 24), y = clamp(gy, 32, H);
      ctx.strokeStyle = '#c9a35f';
      ctx.strokeRect(x - 24 + .5, y - 30 + .5, 48, 32);
    } else {
      const x = clamp(gx, 25, LW - 25), y = clamp(gy, 74, H);
      ctx.strokeStyle = '#49a552';
      ctx.strokeRect(x - 23 + .5, y - 52 + .5, 46, 54);
    }
    ctx.restore();
  }
  drawMeasure();
}

function loop(){
  ctx.drawImage(bg, camX, 0, W, H, 0, 0, W, H);
  ctx.drawImage(terrain, camX, 0, W, H, 0, 0, W, H);
  ctx.save();
  ctx.translate(-camX, 0);
  if (showFall) drawFalls();
  drawHatchEd();
  drawExitEd();
  if (showGrid) ctx.drawImage(gridc, 0, 0);
  drawOverlays();
  ctx.restore();
  requestAnimationFrame(loop);
}

/* ---------------- historique (undo / redo) ---------------- */
function syncUndoBtns(){
  $('#btnUndo').disabled = !undoStack.length;
  $('#btnRedo').disabled = !redoStack.length;
}
function pushUndo(){
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoBtns();
}
function applySnapshot(json){
  state = sanitize(JSON.parse(json));
  hoverObj = null;
  LW = state.width;
  camX = clamp(camX, 0, Math.max(0, LW - W));
  buildGrid();
  rebuildBGEd();
  const q = curStyle.split('.');                    
  if (!THEMES[q[0]] || !THEMES[q[0]].styles[q[1]])  
    curStyle = state.theme + '.groundA';             
  $('#selStyle').value = curStyle;                            
  syncProps();
  rebuild();
  syncCamSlider();
  syncUndoBtns();
}
function undo(){
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  applySnapshot(undoStack.pop());
}
function redo(){
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  applySnapshot(redoStack.pop());
}

function qualStyle(s, stone, theme){
  if (typeof s === 'string' && s.indexOf('.') > 0){
    const q = s.split('.');
    if (THEMES[q[0]] && THEMES[q[0]].styles[q[1]]) return q[0] + '.' + q[1];
  }
  if (STYLES_K.includes(s)) return theme + '.' + s;
  return theme + '.' + (stone ? 'wallA' : 'groundA');
}

/* ---------------- nettoyage / import ---------------- */
function sanitize(o){
  const num = (v, d, a, b) => {
    v = Math.round(+v);
    if (!isFinite(v)) v = d;
    return clamp(v, a, b);
  };
  const LWi = clamp(Math.round(((o && o.width) || 800) / 100) * 100, 800, 3200);
  const st = {
    name: String(o && o.name || 'SANS NOM').slice(0, 24),
    theme: THEMES[o && o.theme] ? o.theme : 'night',
    width: LWi,
    total: num(o.total, 20, 1, 99),
    goal: num(o.goal, 10, 0, 99),
    dir: (o && o.dir) === -1 ? -1 : 1,
    hatch: null, exit: null, rects: [], carves: [], blobs: [],
    skills: { block: 0, dig: 0, float: 0, climb: 0, bash: 0, build: 0, mine: 0, bomb: 0 }
  };
  if (o && o.hatch && isFinite(+o.hatch.x))
    st.hatch = { x: num(o.hatch.x, 100, 24, LWi - 24), y: num(o.hatch.y, 100, 32, H) };
  if (o && o.exit && isFinite(+o.exit.x))
    st.exit = { x: num(o.exit.x, 700, 25, LWi - 25), y: num(o.exit.y, 300, 74, H) };
  if (o && Array.isArray(o.rects)) for (const r of o.rects){
    if (!r) continue;
    const x = num(r.x, 0, 0, LWi), y = num(r.y, 0, 0, H);
    const w = Math.min(num(r.w, 10, 1, LWi), LWi - x), h = Math.min(num(r.h, 10, 1, H), H - y);
    if (w >= 4 && h >= 2)
      st.rects.push({ x, y, w, h, grass: !!r.grass,
                      style: qualStyle(r.style, !!r.stone, st.theme) });
  }
  if (o && Array.isArray(o.carves)) for (const c of o.carves){
    if (!c) continue;
    if (isFinite(+c.r) && +c.r > 0 && isFinite(+c.x) && isFinite(+c.y)){
      const r = Math.round(+c.r);
      st.carves.push({ x: clamp(Math.round(c.x - r), 0, LWi), y: clamp(Math.round(c.y - r), 0, H),
                       w: Math.min(2 * r, LWi), h: Math.min(2 * r, H) });
    } else {
      const x = num(c.x, 0, 0, LWi), y = num(c.y, 0, 0, H);
      const w = Math.min(num(c.w, 10, 1, LWi), LWi - x), h = Math.min(num(c.h, 10, 1, H), H - y);
      if (w >= 2 && h >= 2) st.carves.push({ x, y, w, h });
    }
  }
  if (o && Array.isArray(o.blobs)) for (const b of o.blobs){
    if (!b) continue;
    st.blobs.push({ x: num(b.x, 100, 0, LWi), y: num(b.y, 100, 0, H),
                    r: clamp(Math.round(+b.r || 8), 3, 60),
                    style: qualStyle(b.style, false, st.theme),
                    grass: !!b.grass });
  }
  if (o && o.skills) for (const k of ['block', 'dig', 'float', 'climb', 'bash', 'build', 'mine', 'bomb'])
    st.skills[k] = num(o.skills[k], 0, 0, 99);
  return st;
}

/* ---------------- export ---------------- */
function esc(s){ return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function genCode(){
  const s = state, L = [];
  L.push('  {');
  L.push("    name: '" + esc(s.name) + "',");
  L.push('    total: ' + s.total + ', goal: ' + s.goal + ',');
  L.push('    dir: ' + s.dir + ',');
  L.push('    width: ' + s.width + ',');
  L.push("    theme: '" + s.theme + "',");
  L.push('    hatch: ' + (s.hatch ? '{ x: ' + s.hatch.x + ', y: ' + s.hatch.y + ' }' : 'null') + ',');
  L.push('    exit: ' + (s.exit ? '{ x: ' + s.exit.x + ', y: ' + s.exit.y + ' }' : 'null') + ',');
  if (s.rects.length){
    L.push('    rects: [');
    L.push(s.rects.map(r => '      { x: ' + r.x + ', y: ' + r.y + ', w: ' + r.w + ', h: ' + r.h +
      ", style: '" + r.style + "'" + (r.grass ? ', grass: true' : '') + ' }').join(',\n'));
    L.push('    ],');
  } else L.push('    rects: [],');
  if (s.carves.length){
    L.push('    carves: [');
    L.push(s.carves.map(c => '      { x: ' + c.x + ', y: ' + c.y + ', w: ' + c.w + ', h: ' + c.h + ' }').join(',\n'));
    L.push('    ],');
  }
  if (s.blobs.length){
    L.push('    blobs: [');
    L.push(s.blobs.map(b => '      { x: ' + b.x + ', y: ' + b.y + ', r: ' + b.r +
      ", style: '" + b.style + "'" + (b.grass ? ', grass: true' : '') + ' }').join(',\n'));
    L.push('    ],');
  }
  L.push('    skills: { block: ' + s.skills.block + ', dig: ' + s.skills.dig +
         ', float: ' + s.skills.float + ', climb: ' + s.skills.climb +
         ', bash: ' + s.skills.bash + ', build: ' + s.skills.build +
         ', mine: ' + s.skills.mine + ', bomb: ' + s.skills.bomb + ' }');
  L.push('  }');
  return L.join('\n');
}
function autoCode(){
  if (codeDirty) return;
  $('#code').value = genCode();
}
function codeMsg(txt, cls){
  const el = $('#codeMsg');
  el.textContent = txt;
  el.className = cls || '';
}

/* ---------------- sauvegarde locale ---------------- */
function saveLocal(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e){}
  }, 300);
}

/* ---------------- interface ---------------- */
const SK_FIELDS = [
  ['skBlock', 'block'], ['skDig', 'dig'], ['skFloat', 'float'], ['skClimb', 'climb'],
  ['skBash', 'bash'], ['skBuild', 'build'], ['skMine', 'mine'], ['skBomb', 'bomb']
];

function syncProps(){
  $('#pName').value = state.name;
  $('#pTotal').value = state.total;
  $('#pGoal').value = state.goal;
  $('#pWidth').value = state.width;
  $('#pTheme').value = state.theme;
  SK_FIELDS.forEach(([id, k]) => $('#' + id).value = state.skills[k]);
  document.querySelectorAll('#segDir button')
    .forEach(b => b.classList.toggle('on', +b.dataset.dir === state.dir));
  autoCode();
}
function syncStyleToKind(kind){
  const q = curStyle.split('.');
  const t = THEMES[q[0]] ? q[0] : state.theme;
  const letter = (q[1] || 'groundA').slice(-1);
  curStyle = t + '.' + (kind === 'wall' ? 'wall' : 'ground') + letter;
  $('#selStyle').value = curStyle;
}
function selectTool(t){
  tool = t;
  measure = null;
  if (t === 'earth') syncStyleToKind('ground');
  else if (t === 'stone') syncStyleToKind('wall');
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  updateHint();
}
function updateHint(){
  let txt;
  const m = (drag && drag.kind === 'measure') ? drag : measure;
  if (tool === 'measure' && m){
    const dy = Math.abs(m.y1 - m.y0);
    txt = 'Δx ' + Math.abs(m.x1 - m.x0) + ' px · Δy ' + dy + ' px' +
          (dy > FATAL_FALL ? ' — CHUTE MORTELLE' : (dy > 70 ? ' — limite' : ''));
  } else if (tool === 'erase' && hoverObj){
    const b = objBounds(hoverObj);
    const lbl = { hatch: 'TRAPPE', exit: 'SORTIE', carve: 'FOSSE', rect: 'TERRAIN', 'blob': 'FORME'}[hoverObj.type];
    txt = lbl + ' (' + b.x + ', ' + b.y + ' · ' + b.w + '×' + b.h + ') — cliquez pour supprimer.';
  } else txt = HINTS[tool];
  $('#stHint').textContent = txt;
}

document.querySelectorAll('.tool').forEach(b =>
  b.addEventListener('click', () => selectTool(b.dataset.tool)));

function setGrid(on){ showGrid = on; $('#btnGrid').classList.toggle('on', on); }
function setFall(on){ showFall = on; $('#btnFall').classList.toggle('on', on); }
 $('#btnGrid').addEventListener('click', () => setGrid(!showGrid));
 $('#btnFall').addEventListener('click', () => setFall(!showFall));

 $('#btnUndo').addEventListener('click', undo);
 $('#btnRedo').addEventListener('click', redo);

let newArm = 0;
 $('#btnNew').addEventListener('click', () => {
  const btn = $('#btnNew');
  if (newArm){
    clearTimeout(newArm); newArm = 0;
    btn.textContent = 'NOUVEAU';
    pushUndo();
    state = defaultState();
    syncProps(); rebuild();
  } else {
    btn.textContent = 'SÛR ?';
    newArm = setTimeout(() => { newArm = 0; btn.textContent = 'NOUVEAU'; }, 2400);
  }
});

 $('#pName').addEventListener('change', () => {
  pushUndo();
  state.name = $('#pName').value.trim().slice(0, 24) || 'SANS NOM';
  $('#pName').value = state.name;
  autoCode(); saveLocal();
});
 $('#pTotal').addEventListener('change', () => {
  pushUndo();
  state.total = clamp(Math.round(+$('#pTotal').value || 1), 1, 99);
  $('#pTotal').value = state.total;
  updateValid(); autoCode(); saveLocal();
});
 $('#pGoal').addEventListener('change', () => {
  pushUndo();
  state.goal = clamp(Math.round(+$('#pGoal').value || 0), 0, 99);
  $('#pGoal').value = state.goal;
  updateValid(); autoCode(); saveLocal();
});
$('#pWidth').addEventListener('change', () => {
  pushUndo();
  state.width = clamp(Math.round((+$('#pWidth').value || 800) / 100) * 100, 800, 3200);
  $('#pWidth').value = state.width;
  applyWidth();
  autoCode(); saveLocal();
});
SK_FIELDS.forEach(([id, k]) =>
  $('#' + id).addEventListener('change', () => {
    pushUndo();
    state.skills[k] = clamp(Math.round(+$('#' + id).value || 0), 0, 99);
    $('#' + id).value = state.skills[k];
    autoCode(); saveLocal();
  }));
document.querySelectorAll('#segDir button').forEach(b =>
  b.addEventListener('click', () => {
    pushUndo();
    state.dir = +b.dataset.dir;
    document.querySelectorAll('#segDir button').forEach(x => x.classList.toggle('on', x === b));
    autoCode(); saveLocal();
  }));

 $('#pTheme').addEventListener('change', () => {
  pushUndo();
  const oldT = state.theme;
  state.theme = $('#pTheme').value;
  const remap = s => (typeof s === 'string' && s.startsWith(oldT + '.'))
                     ? state.theme + s.slice(oldT.length) : s;
  state.rects.forEach(r => r.style = remap(r.style));
  state.blobs.forEach(b => b.style = remap(b.style));
  const q = curStyle.split('.');
  curStyle = (THEMES[q[0]] ? q[0] : state.theme) + '.' + (q[1] || 'groundA');
  $('#selStyle').value = curStyle;
  rebuildBGEd(); rebuild();
});
function buildStyleSelect(){
  const sel = $('#selStyle');
  sel.innerHTML = '';
  for (const tk of Object.keys(THEMES)){
    const og = document.createElement('optgroup');
    og.label = THEMES[tk].name;
    for (const sk of STYLES_K){
      const st = THEMES[tk].styles[sk];
      const o = document.createElement('option');
      o.value = tk + '.' + sk;
      o.textContent = (st.kind === 'wall' ? 'MUR — ' : 'SOL — ') + st.name;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }
  sel.value = curStyle;
}
function styleKind(s){
  const q = s.split('.');
  return (THEMES[q[0]] && THEMES[q[0]].styles[q[1]]) ? THEMES[q[0]].styles[q[1]].kind : 'ground';
}
 $('#selStyle').addEventListener('change', () => {
  curStyle = $('#selStyle').value;
  if (styleKind(curStyle) === 'wall' && tool === 'earth') selectTool('stone');
  else if (styleKind(curStyle) === 'ground' && tool === 'stone') selectTool('earth');
});

 $('#btnGen').addEventListener('click', () => {
  codeDirty = false;
  $('#code').value = genCode();
  const missing = [];
  if (!state.rects.length) missing.push('terrain');
  if (!state.hatch) missing.push('trappe');
  if (!state.exit) missing.push('sortie');
  codeMsg(missing.length
    ? 'Code généré — attention : ' + missing.join(', ') + ' manquant(e).'
    : 'Code généré — prêt à coller dans LEVELS.', missing.length ? 'ko' : 'ok');
});
 $('#btnCopy').addEventListener('click', () => {
  const ta = $('#code');
  if (!ta.value.trim()){ codeMsg('Générez d\'abord le code.', 'ko'); return; }
  const fallback = () => {
    ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e){}
    codeMsg(ok ? 'Code copié — collez-le dans LEVELS (script.js).'
               : 'Copie refusée : sélectionnez le texte et Ctrl+C.', ok ? 'ok' : 'ko');
  };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(ta.value)
      .then(() => codeMsg('Code copié — collez-le dans LEVELS (script.js).', 'ok'))
      .catch(fallback);
  else fallback();
});
 $('#btnLoad').addEventListener('click', () => {
  const src = $('#code').value.trim();
  if (!src){ codeMsg('Collez d\'abord un code de niveau dans la zone de texte.', 'ko'); return; }
  let obj;
  try { obj = (new Function('return (' + src + ')'))(); }
  catch (err){ codeMsg('Code illisible : ' + err.message, 'ko'); return; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)){
    codeMsg('Collez un seul objet de niveau { ... }.', 'ko'); return;
  }
  pushUndo();
  state = sanitize(obj);
  codeDirty = false;
  syncProps(); rebuild();
  codeMsg('Niveau chargé : ' + state.rects.length + ' terrain(s), ' +
          state.carves.length + ' fosse(s).', 'ok');
});
 $('#code').addEventListener('input', () => { codeDirty = true; });

/* ---------------- souris / clavier ---------------- */
function pos(e){
  const r = cv.getBoundingClientRect();
  return {
    x: clamp((e.clientX - r.left) * W / r.width, 0, W) + camX,
    y: clamp((e.clientY - r.top) * H / r.height, 0, H)
  };
}
function snap(v){ return snapOn ? Math.round(v / 10) * 10 : Math.round(v); }
function placeHatch(gx, gy){ return { x: clamp(gx, 24, LW - 24), y: clamp(gy, 32, H) }; }
function placeExit(gx, gy){ return { x: clamp(gx, 25, LW - 25), y: clamp(gy, 74, H) }; }
function stampBrush(x, y){
  const b = {
    x: clamp(Math.round(x), 0, LW), y: clamp(Math.round(y), 0, H),
    r: brushSize, style: curStyle,
    grass: $('#optGrass').checked && styleKind(curStyle) === 'ground'
  };
  state.blobs.push(b);
  paintBlob(b);
}

function hitTest(px, py){
  if (state.hatch && Math.abs(px - state.hatch.x) <= 26 &&
      py >= state.hatch.y - 32 && py <= state.hatch.y + 4) return { type: 'hatch' };
  if (state.exit && Math.abs(px - state.exit.x) <= 25 &&
      py >= state.exit.y - 54 && py <= state.exit.y + 4) return { type: 'exit' };
  for (let i = state.carves.length - 1; i >= 0; i--){
    const c = state.carves[i];
    if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return { type: 'carve', i };
  }
  for (let i = state.blobs.length - 1; i >= 0; i--){
    const b = state.blobs[i];
    if ((px - b.x) * (px - b.x) + (py - b.y) * (py - b.y) <= (b.r + 3) * (b.r + 3))
      return { type: 'blob', i };
  }
  for (let i = state.rects.length - 1; i >= 0; i--){
    const r = state.rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return { type: 'rect', i };
  }
  return null;
}
function deleteObj(o){
  if (o.type === 'hatch') state.hatch = null;
  else if (o.type === 'exit') state.exit = null;
  else if (o.type === 'carve') state.carves.splice(o.i, 1);
  else if (o.type === 'blob') state.blobs.splice(o.i, 1);
  else state.rects.splice(o.i, 1);
}

function eraseAt(px, py){
  const hit = hitTest(px, py);
  if (!hit) return;
  if (drag && drag.kind === 'erase' && !drag.begun){
    pushUndo();          // une seule entrée d'historique pour tout le trait de gomme
    drag.begun = true;
  }
  deleteObj(hit);
  hoverObj = null;
  rebuild();
}

cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err){}
  const p = pos(e), sx = snap(p.x), sy = snap(p.y);
  if (tool === 'earth' || tool === 'stone' || tool === 'carve'){
    drag = { kind: tool, x0: sx, y0: sy, x1: sx, y1: sy };
  } else if (tool === 'brush'){
    pushUndo();
    drag = { kind: 'brush', lx: p.x, ly: p.y };
    stampBrush(p.x, p.y);
  } else if (tool === 'hatch' || tool === 'exit'){
    pushUndo();
    if (tool === 'hatch') state.hatch = placeHatch(sx, sy);
    else state.exit = placeExit(sx, sy);
    drag = { kind: tool };
    analyze(); autoCode(); saveLocal();
  } else if (tool === 'erase'){
    drag = { kind: 'erase', begun: false };
    eraseAt(p.x, p.y);
  } else if (tool === 'measure'){
    measure = null;
    drag = { kind: 'measure', x0: sx, y0: sy, x1: sx, y1: sy };
  }
});
cv.addEventListener('pointermove', e => {
  const p = pos(e);
  mouse.x = p.x; mouse.y = p.y; mouse.in = true;
  const sx = snap(p.x), sy = snap(p.y);

  if (drag) {
    if (drag.kind === 'earth' || drag.kind === 'stone' || drag.kind === 'carve' || drag.kind === 'measure') {
      drag.x1 = sx; drag.y1 = sy;
    } else if (drag.kind === 'brush') {
      if (Math.hypot(p.x - drag.lx, p.y - drag.ly) >= Math.max(4, brushSize / 2)) {
        stampBrush(p.x, p.y);
        drag.lx = p.x; drag.ly = p.y;
      }
    } else if (drag.kind === 'erase') {
      // Efface continuellement pendant le glisser/déposer
      eraseAt(p.x, p.y);
    } else if (drag.kind === 'hatch') {
      state.hatch = placeHatch(sx, sy); analyze();
    } else if (drag.kind === 'exit') {
      state.exit = placeExit(sx, sy); analyze();
    }
  } else if (tool === 'erase') {
    // S'il n'y a pas de glissement, on met juste à jour le survol
    hoverObj = hitTest(p.x, p.y);
  }

  $('#stCoords').textContent = 'x: ' + Math.round(p.x) + ' · y: ' + Math.round(p.y);
  updateHint();
});
cv.addEventListener('pointerup', () => {
  if (!drag) return;
  if (drag.kind === 'earth' || drag.kind === 'stone' || drag.kind === 'carve'){
    const r = normRect(drag);
    if (r.w >= 8 && r.h >= 4){
      pushUndo();
      if (drag.kind === 'carve') state.carves.push({ x: r.x, y: r.y, w: r.w, h: r.h });
      else state.rects.push({ x: r.x, y: r.y, w: r.w, h: r.h, style: curStyle,
                              grass: drag.kind === 'earth' && $('#optGrass').checked &&
                                      styleKind(curStyle) === 'ground' });
      rebuild();
    }
  } else if (drag.kind === 'measure'){
    measure = { x0: drag.x0, y0: drag.y0, x1: drag.x1, y1: drag.y1 };
  } else if (drag.kind === 'brush'){
    analyze(); autoCode(); saveLocal();
  } else {
    autoCode(); saveLocal();
  }
  drag = null;
  updateHint();
});
cv.addEventListener('pointerleave', () => { mouse.in = false; hoverObj = null; });
cv.addEventListener('pointercancel', () => { drag = null; });

addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z'){ e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y'){ e.preventDefault(); redo(); }
  else if (e.key === 'Escape'){ drag = null; measure = null; updateHint(); }
  else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key >= '1' && e.key <= '8')
    selectTool(TOOL_ORDER[+e.key - 1]);
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); camX = Math.max(0, camX - 40); syncCamSlider(); }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); camX = Math.min(Math.max(0, LW - W), camX + 40); syncCamSlider(); }
  else if (k === 'g') setGrid(!showGrid);
  else if (k === '['){ brushSize = Math.max(4, brushSize - 2); $('#brushSize').value = brushSize; $('#brushVal').textContent = brushSize; }
  else if (k === ']'){ brushSize = Math.min(36, brushSize + 2); $('#brushSize').value = brushSize; $('#brushVal').textContent = brushSize; }
});

/* ---------------- démarrage ---------------- */
(function init(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch (err){ state = defaultState(); }
  LW = state.width;
  camX = 0;
  buildGrid();
  curStyle = state.theme + '.groundA'; 
  $('#selStyle').value = curStyle;
  syncProps();
  rebuildBGEd();
  rebuild();
  syncCamSlider();
  syncUndoBtns();
  buildStyleSelect();
  selectTool('earth');
  requestAnimationFrame(loop);
})();