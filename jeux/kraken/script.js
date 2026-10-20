"use strict";
/* ============================================================================
   PROTOCOLE KRAKEN — script.js
   Datacenter composé de COULOIRS et de SALLES SERVEURS :
     - les données à récolter sont uniquement dans les salles ;
     - les drones gardiens patrouillent les couloirs (rapides, mais incapables
       de franchir une porte de salle) ;
     - le SPECTRE-RÉSEAU traverse les murs et traque le joueur en permanence,
       partout, mais plus lentement que les drones.
   Tout le graphisme est du pixel art 100% procédural (Canvas 2D),
   le son est 100% synthétisé (Web Audio), aucun asset externe.

   Sommaire :
     1.  Constantes, thèmes, équilibrage des secteurs
     2.  Utilitaires + fonte bitmap 3x5
     3.  Audio synthétique
     4.  Entrées (clavier, d-pad tactile, joystick à glisser)
     5.  Sprites (drone joueur, drones gardiens, spectre) + rendu spectre
     6.  Génération de la carte (salles, portes, couloirs garantis)
     7.  Fond statique pré-rendu (racks, conduits, dock, flèches de portes)
     8.  Décor dynamique (LEDs, flux réseau, pluie de glyphes)
     9.  Drones gardiens (BFS sur couloirs, ligne de vue, poursuite)
     10. Spectre-RéSEAU (poursuite à travers les murs, traînée, scan)
     11. Joueur (déplacement libre, récolte, extraction)
     12. Bonus, particules, popups, annonces
     13. Monde : mise à jour + collisions
     14. HUD & overlays (game over spécifique à la cause de la mort)
     15. Machine à états + boucle principale
   ============================================================================ */

/* ---------------------------------------------------------------- 1. CONFIG */

let W = 240, NC = 15;              
const H = 320, TILE = 16, NR = 20, TAU = Math.PI * 2;

/* types de tuiles */
const T_WALL = 0, T_CORR = 1, T_ROOM = 2, T_DOOR = 3, T_DOCK = 4, T_STRUCT = 5, T_VAULT = 6;

const THEMES = [
  { name: 'PÉRIPHÉRIE',  accent: '#3dff7a', bg: '#04080a' },
  { name: 'NŒUDS CACHE', accent: '#2ee6ff', bg: '#04070c' },
  { name: 'SOUS-RÉSEAU', accent: '#ff3ec8', bg: '#07040b' },
  { name: 'CORE-7',      accent: '#ffb02e', bg: '#090704' },
  { name: 'ZÉRO JOUR',  accent: '#ff4b4b', bg: '#0a0406' },
];

const ROW_BANDS = [[3, 6], [8, 11], [13, 16]];
function mapCols(s) { return s >= 7 ? 21 : s >= 5 ? 19 : s >= 3 ? 17 : 15; }
function guardCols(nc) { return [1, nc >> 1, nc - 2]; }
function colBands(nc) {
  const gc = guardCols(nc), out = [];
  for (let i = 0; i < gc.length - 1; i++) out.push([gc[i] + 1, gc[i + 1] - 1]);
  return out;
}

function carveRoom(cx, ry, tall, label) {
  const [cx0, cx1] = cx, bw = cx1 - cx0 + 1;
  const y0 = ry[0], y1 = tall ? ry[0] + 8 : ry[1];
  /* intérieur principal */
  const maxWi = Math.max(1, Math.min(bw - 2, 6));
  const wi = irnd(Math.min(2, maxWi), maxWi);
  const hi = tall ? irnd(3, 6) : (Math.random() < .6 ? 2 : 1);
  const ix0 = irnd(cx0 + 1, cx1 - wi);
  const iy0 = tall ? irnd(y0 + 1, y1 - hi) : (hi === 2 ? y0 + 1 : irnd(y0 + 1, y0 + 2));
  const rects = [], inTiles = [];
  const push = (x, y, w, h) => {
    rects.push({ x: x - 1, y: y - 1, w: w + 2, h: h + 2 });          
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) inTiles.push([tx, ty]);
  };
  push(ix0, iy0, wi, hi);
  if (!tall && Math.random() < .45) {
    const side = Math.random() < .5 ? 1 : -1;
    const aw = irnd(1, 2), ah = irnd(1, hi);
    const ax = side > 0 ? ix0 + wi : ix0 - aw;
    const ay = iy0 + irnd(0, hi - ah);
    if (ax >= cx0 + 1 && ax + aw - 1 <= cx1 - 1) push(ax, ay, aw, ah);
  }
  const inter = new Set(inTiles.map(t => t[0] + ',' + t[1]));
  const wallSet = new Set();
  for (const [tx, ty] of inTiles)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (inter.has(nx + ',' + ny) || wallSet.has(nx + ',' + ny)) continue;
      if (nx < cx0 || nx > cx1 || ny < y0 || ny > y1) continue;
      wallSet.add(nx + ',' + ny);
    }
  for (const [tx, ty] of inTiles) grid[ty][tx] = T_ROOM;
  for (const k of wallSet) { const p = k.split(','); grid[+p[1]][+p[0]] = T_WALL; }
  const cand = { 0: [], 1: [], 2: [], 3: [] };     
  for (const k of wallSet) {
    const p = k.split(','), tx = +p[0], ty = +p[1];
    if (inter.has(tx + ',' + (ty - 1)) && tileAt(tx, ty + 1) === T_CORR) cand[1].push([tx, ty]);
    if (inter.has(tx + ',' + (ty + 1)) && tileAt(tx, ty - 1) === T_CORR) cand[0].push([tx, ty]);
    if (inter.has((tx - 1) + ',' + ty) && tileAt(tx + 1, ty) === T_CORR) cand[3].push([tx, ty]);
    if (inter.has((tx + 1) + ',' + ty) && tileAt(tx - 1, ty) === T_CORR) cand[2].push([tx, ty]);
  }
  const doors = [];
  let want = (tall || wi >= 4 || inTiles.length >= 7) ? irnd(2, 3) : (Math.random() < .3 ? 2 : 1);
  for (const s of shuffle([0, 1, 2, 3])) {         
    if (want <= 0 || !cand[s].length) continue;
    const [dx, dy] = pick(cand[s]);
    grid[dy][dx] = T_DOOR;
    doors.push({ x: dx, y: dy, out: s });
    want--;
  }
  const room = { rects, doors, label, done: false, spots: [] };
  const mkSpot = (tx, ty) => room.spots.push([tx, ty]);
  const mx = ix0 + (wi >> 1), my = iy0 + (hi >> 1);
  if (tall)                { mkSpot(mx, iy0); mkSpot(mx, iy0 + hi - 1); }
  else if (rects.length > 1) {
    const a = rects[1];
    mkSpot(mx, my);
    mkSpot(a.x + 1 + ((a.w - 2) >> 1), a.y + 1 + ((a.h - 2) >> 1));
  }
  else if (wi >= 5)        { mkSpot(ix0 + 1, my); mkSpot(ix0 + wi - 2, my); }
  else                     mkSpot(mx, my);
  return room;
}
let CORNERS = [[20, 46], [220, 46], [20, 294], [220, 294]]; 
const PAD = { x: 120, y: 16 };                             

const NEXT_INTRO = {
  2: 'des vers de façade surgissent des baies — surveillez les trappes.',
  3: 'FRAGMENT SOUVERAIN en coffre au sud — deux vers le gardent.',
  4: 'un drone gardien supplémentaire surveille les couloirs.',
  5: 'le tourbillon accélère… et des vers nichent dans les salles.',
  6: 'les vers déploient leurs cycles plus rapidement.',
  7: 'ALERTE ROUGE — défenses maximales. Bonne chance.',
  8: 'le datacenter n\u2019a plus rien à perdre.',
};

function sectorParams(s) {
  return {
    dataTarget:  s <= 2 ? 2 : s <= 4 ? 3 : s <= 6 ? 4 : s <= 8 ? 5 : 6,  
    special:     s >= 3,                       
    drones:     Math.min(5, 1 + Math.ceil(s / 2)),
    droneSpd:   Math.min(84, 46 + s * 6),
    spectreSpd: Math.min(26, 17 + s * 1.5),
    spectreWander: .45,
    spectreDetect: Math.min(105, 72 + s * 5),
    worms:      Math.min(9, 3 + Math.floor((s - 1) / 2)),  
    wormSpd:    Math.min(2, 1.05 + (s - 1) * .1),          
    harvest:    Math.min(2.2, 1.05 + s * 0.14),
  };
}

/* --- labo / améliorations --- */
const UPGRADES = [
  { id: 'thr', name: 'PROPULSEURS',         desc: '+5 px/s de vitesse par niveau',  max: 4, cost: [40, 70, 110, 160] },
  { id: 'chp', name: 'CHÂSSIS RENFORCÉ',    desc: '+1 bouclier au départ',           max: 2, cost: [120, 260] },
  { id: 'ext', name: 'EXTRACTEUR QUANT.',   desc: '-12% de temps de hack',           max: 3, cost: [50, 90, 150] },
  { id: 'def', name: 'DÉFLECTEUR',          desc: '+2s de bouclier bonus',           max: 3, cost: [45, 80, 130] },
  { id: 'chr', name: 'CHRONO-FILTRE',       desc: '+1.5s de ralenti bonus',          max: 3, cost: [45, 80, 130] },
  { id: 'mag', name: 'AIMANT À DONNÉES',    desc: '+5 px de rayon de ramassage',     max: 3, cost: [35, 60, 100] },
  { id: 'dec', name: 'LEURRE ÉLECTRONIQUE', desc: '-6% de rayon de détection',       max: 3, cost: [60, 100, 160] },
  { id: 'ant', name: 'ANTENNE LARGUE',      desc: 'bonus ~13% plus fréquents',       max: 2, cost: [40, 75] },
];
UPGRADES.forEach(u => u.cost = u.cost.map(c => Math.round(c * 1.5 / 5) * 5));
const LAB = { frags: 0, lv: {} };
function labStats() {
  const L = id => LAB.lv[id] || 0;
  return {
    speed: 82 + 5 * L('thr'),
    lives: 3 + L('chp'),
    harvestMul: 1 - .12 * L('ext'),
    shieldDur: 6 + 2 * L('def'),
    slowDur: 5 + 1.5 * L('chr'),
    pickup: 11 + 5 * L('mag'),
    detectMul: 1 - .06 * L('dec'),
    bonusFreq: 1 - .13 * L('ant'),
  };
}

/* ------------------------------------------------ 2. UTILITAIRES + FONTE */

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const pad2 = n => String(n).padStart(2, '0');
const pad6 = n => String(n).padStart(6, '0');

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const f = x => Math.round(lerp((x >> 16) & 255, (B >> 16) & 255, t)) + ',' +
    Math.round(lerp((x >> 8) & 255, (B >> 8) & 255, t)) + ',' + Math.round(lerp(x & 255, B & 255, t));
  return `rgb(${f(A)})`;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const FONT = {
  A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110',
  E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101',
  I:'111010010010111', J:'001001001101010', K:'101101110101101', L:'100100100100111',
  M:'101111111101101', N:'111101101101101', O:'010101101101010', P:'110101110100100',
  R:'110101110101101', S:'011100010001110', T:'111010010010010', U:'101101101101111',
  V:'101101101101010', W:'101101101111101', X:'101101010101101', Y:'101101010010010',
  Z:'111001010100111',
  0:'111101101101111', 1:'010110010010111', 2:'110001010100111', 3:'111001011001111',
  4:'101101111001001', 5:'111100110001110', 6:'111100111101111', 7:'111001010010010',
  8:'111101111101111', 9:'111101111001111',
  '+':'000010111010000', '-':'000000111000000', '.':'000000000000010', ':':'000010000010000',
  '/':'001001010100100', '>':'100010001010100', '!':'010010010000010', '?':'110001010000010',
  '_':'000000000000111', '[':'110100100100110', ']':'011001001001110', '%':'101001010100101',
};
function txt3(c, s, x, y, col, scale = 1, alpha = 1) {
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  c.globalAlpha = alpha; c.fillStyle = col;
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch];
    if (g) for (let i = 0; i < 15; i++)
      if (g[i] === '1') c.fillRect(cx + (i % 3) * scale, y + ((i / 3) | 0) * scale, scale, scale);
    cx += 4 * scale;
  }
  c.globalAlpha = 1;
}

/* ------------------------------------------------------------- 3. AUDIO */

const SFX = (() => {
  let ac = null, master = null, musicBus = null, humG = null, proxO = null, proxG = null, thrG = null, muted = false, sfxVol = .8, musVol = .8;
  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.55 * sfxVol; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = muted ? 0 : .5 * musVol; musicBus.connect(ac.destination); 
      /* bourdon de datacenter */
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter();
      o1.type = 'sawtooth'; o1.frequency.value = 46; o2.type = 'sine'; o2.frequency.value = 92.4;
      f.type = 'lowpass'; f.frequency.value = 150;
      humG = ac.createGain(); humG.gain.value = 0.012;
      o1.connect(f); o2.connect(f); f.connect(humG); humG.connect(master);
      o1.start(); o2.start();
      proxO = ac.createOscillator(); proxO.type = 'sawtooth'; proxO.frequency.value = 48;
      const pf = ac.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 260;
      proxG = ac.createGain(); proxG.gain.value = 0;
      proxO.connect(pf); pf.connect(proxG); proxG.connect(master); proxO.start();
      /* souffle discret du propulseur du drone */
      const t = ac.createOscillator(); t.type = 'triangle'; t.frequency.value = 84;
      thrG = ac.createGain(); thrG.gain.value = 0;
      t.connect(thrG); thrG.connect(master); t.start();
      startMusic();                                
    } catch (e) { ac = null; }
    return !!ac;
  }
  function tone(f0, dur, { type = 'square', vol = .1, f1 = 0, at = 0 } = {}) {
    if (!ac) return;
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noize(dur, vol, freq = 900, at = 0) {
    if (!ac) return;
    const t = ac.currentTime + at, n = ac.sampleRate * dur | 0, buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  let musicOn = false;
  function startMusic() {
    if (musicOn || !ac || !musicBus) return; musicOn = true;
    const BPM = 112, SPB = 60 / BPM, S16 = SPB / 4, LOOP = 256;   // 16 mesures × 16 pas
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    /* écho croche pointée pour arpège et lead */
    const dly = ac.createDelay(1); dly.delayTime.value = SPB * .75;
    const dfb = ac.createGain(); dfb.gain.value = .32;
    const dwet = ac.createGain(); dwet.gain.value = .22;
    dly.connect(dfb); dfb.connect(dly); dly.connect(dwet); dwet.connect(musicBus);
    const echo = ac.createGain(); echo.connect(musicBus); echo.connect(dly);
    const note = (type, freq, t, dur, vol, dest, cut = 0) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      if (cut) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; o.connect(f); f.connect(g); }
      else o.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .012);
      g.gain.setTargetAtTime(0.0001, t + dur, .05);
      g.connect(dest); o.start(t); o.stop(t + dur + .4);
    };
    const pad = (tones, t, dur) => {
      const g = ac.createGain(), f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 780; f.connect(g); g.connect(musicBus);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(.045, t + .6);
      g.gain.setValueAtTime(.045, t + dur);
      g.gain.setTargetAtTime(0.0001, t + dur, .45);
      for (const m of tones) for (const det of [-6, 6]) {
        const o = ac.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = N(m); o.detune.value = det; o.connect(f);
        o.start(t); o.stop(t + dur + 1.3);
      }
    };
    const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const nz = (t, dur, vol, fq, hp) => {
      const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
      s.buffer = nb; s.loop = true; f.type = hp ? 'highpass' : 'bandpass'; f.frequency.value = fq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, (t * 7) % 1); s.stop(t + dur + .02);
    };
    const kick = t => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + .1);
      g.gain.setValueAtTime(.38, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .17);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + .2);
    };
    const snare = (t, v) => { nz(t, .14, v, 1800); note('triangle', 180, t, .06, v * .5, musicBus); };
    const hat = (t, v) => nz(t, .03, v, 8200, true);
    const CH = { A: [45, 48, 52], F: [41, 45, 48], G: [43, 47, 50] };
    const PROG = 'A A F G A A F G A A F G F F G G'.split(' ');
    const ARP = [0, 7, 12, 15, 19, 15, 12, 7];
    const LEAD = [
      [8, 0, 69, 6], [8, 8, 72, 4], [8, 12, 76, 3],
      [9, 0, 74, 7], [9, 8, 72, 4], [9, 12, 69, 3],
      [10, 0, 69, 6], [10, 8, 72, 4], [10, 12, 74, 3],
      [11, 0, 71, 6], [11, 8, 74, 6],
      [12, 0, 76, 8], [12, 10, 74, 2], [12, 12, 72, 2],
      [13, 0, 69, 12],
      [14, 0, 72, 6], [14, 8, 69, 6],
    ];
    function step(s, t) {
      const bar = s >> 4, st = s & 15, ch = CH[PROG[bar]];
      if (st === 0) pad(ch, t, SPB * 4.3);                          
      if (st % 2 === 0 && bar >= 2 && (bar < 14 || st === 0 || st === 8)) {
        const oct = (st === 14 && bar % 2 === 1) ? 12 : 0;         
        note('sawtooth', N(ch[0] - 24 + oct), t, S16 * 1.7, .15, musicBus, 380);
      }
      if (bar >= 2 && (st === 0 || st === 8)) kick(t);
      if (st === 11 && (bar === 5 || bar === 7 || bar === 13)) kick(t);
      if (bar >= 2 && bar < 15 && (st === 4 || st === 12)) snare(t, .16);
      if (bar === 15 && st >= 8) snare(t, .08 + (st - 8) * .02);   
      if (bar >= 1 && st % 2 === 0) hat(t, st % 4 === 2 ? .07 : .045);
      if (bar >= 2 && bar < 14)                                    
        note('square', N(ch[0] + 12 + ARP[st % 8]), t, S16 * .9, .045, echo, 2400);
      for (const L of LEAD) if (L[0] === bar && L[1] === st)
        note('triangle', N(L[2]), t, S16 * L[3], .1, echo, 3200);
      if ((bar === 2 || bar === 6 || bar === 10) && st % 4 === 3 && ((s * 2654435761) >>> 0) % 3 === 0)
        note('square', 1300 + ((s * 7919) % 7) * 220, t, .045, .03, musicBus);   
    }
    let ns = 0, nt = ac.currentTime + .15;
    setInterval(() => {
      const now = ac.currentTime;
      if (nt < now - .5) {                                       
        const skip = Math.ceil((now - nt) / S16); ns += skip; nt += skip * S16;
      }
      while (nt < now + .18) { step(ns % LOOP, nt); ns++; nt += S16; }
    }, 40);
  }
  return {
    ensure,
    setMuted(m) { muted = m;
      if (master) master.gain.value = m ? 0 : 0.55 * sfxVol;
      if (musicBus) musicBus.gain.value = m ? 0 : .5 * musVol; },
    setVol(s, m) { sfxVol = s; musVol = m;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55 * s, ac.currentTime, .02);
      if (musicBus) musicBus.gain.setTargetAtTime(muted ? 0 : .5 * m, ac.currentTime, .02); },
    get muted() { return muted; },
    hum(level) { if (humG && ac) humG.gain.setTargetAtTime(0.012 * level, ac.currentTime, .4); },
    setProx(l) { if (proxG && ac) { const t = ac.currentTime;
      proxG.gain.setTargetAtTime(l * l * 0.055, t, .09); proxO.frequency.setTargetAtTime(44 + l * 30, t, .12); } },
    thrust(on) { if (thrG && ac) thrG.gain.setTargetAtTime(on ? 0.013 : 0, ac.currentTime, .06); },
    tick()   { tone(940, .04, { type: 'triangle', vol: .06 }); },
    key()    { [523, 784, 1046].forEach((f, i) => tone(f, .09, { type: 'triangle', vol: .09, at: i * .07 })); noize(.12, .03, 2400, .1); },
    deliver(){ [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, .1, { type: 'square', vol: .07, at: i * .075 })); },
    hit()    { tone(220, .34, { type: 'sawtooth', vol: .12, f1: 48 }); noize(.22, .12, 500); },
    bonus()  { tone(880, .07, { type: 'sine', vol: .1 }); tone(1318, .1, { type: 'sine', vol: .1, at: .08 }); },
    spawn()  { tone(620, .05, { type: 'sine', vol: .05 }); },
    shield() { tone(1200, .05, { type: 'sine', vol: .05 }); },
    alert()  { tone(1240, .05, { vol: .05 }); tone(930, .05, { vol: .05, at: .06 }); },
    scan()   { tone(560, .1, { type: 'sine', vol: .03, f1: 340 }); },
    worm()    { tone(110, .28, { type: 'sawtooth', vol: .05, f1: 55 }); noize(.16, .05, 320); },
    assimilate() { tone(300, .7, { type: 'sawtooth', vol: .11, f1: 38 }); noize(.5, .08, 240); },
    spectreSpawn() { tone(62, 1.2, { type: 'sine', vol: .09, f1: 124 });   
                     tone(494, .45, { type: 'sine', vol: .03, f1: 988, at: .25 }); },
    boot()         { tone(392, .06, { type: 'square', vol: .05 });
                    tone(523, .06, { type: 'square', vol: .05, at: .07 });
                    tone(784, .1,  { type: 'square', vol: .05, at: .14 }); },
    levelup(){ [440, 554, 659, 880, 1108, 1318].forEach((f, i) => tone(f, .09, { type: 'square', vol: .07, at: i * .06 })); },
    over()   { [330, 262, 196, 131].forEach((f, i) => tone(f, .3, { type: 'triangle', vol: .1, at: i * .22 })); },
    ui()     { tone(700, .03, { vol: .05 }); },
  };
})();

/* ------------------------------------------------------------- 4. ENTRÉES */

const keyHeld = { L: 0, R: 0, U: 0, D: 0 };
const padHeld = { L: 0, R: 0, U: 0, D: 0 };
const joy = { x: 0, y: 0, active: false, ox: 0, oy: 0, cx: 0, cy: 0 };
const mouse = { x: 120, y: 60 };

function inputVec() {
  let x = (keyHeld.R ? 1 : 0) - (keyHeld.L ? 1 : 0)
        + (padHeld.R ? 1 : 0) - (padHeld.L ? 1 : 0) + joy.x;
  let y = (keyHeld.D ? 1 : 0) - (keyHeld.U ? 1 : 0)
        + (padHeld.D ? 1 : 0) - (padHeld.U ? 1 : 0) + joy.y;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y, m: Math.min(1, m) };
}

function bindInput() {
  const KEYMAP = {  
    ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D',
    KeyA: 'L', KeyD: 'R', KeyW: 'U', KeyS: 'D',
  };
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (TUTO.open) {                      
      if (['Space', 'Enter', 'NumpadEnter', 'ArrowRight', 'ArrowDown'].includes(e.code)) { e.preventDefault(); tutoNext(); return; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') { e.preventDefault(); tutoPrev(); return; }
      if (e.code === 'Escape') { closeTuto(); return; }
      return;
    }
    if (e.code === 'KeyT' && G.state === 'title' && !$('ov-lab').classList.contains('show')) { openTuto(); return; }
    const d = KEYMAP[e.code];
    if (d) {
      if (OPT.open) return;                  
      e.preventDefault(); keyHeld[d] = 1; return;
    }
    if (['Space', 'Enter', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); actionKey(); return; }
    const labOn = $('ov-lab').classList.contains('show');
    if (e.code === 'KeyL' && !labOn && (G.state === 'title' || G.state === 'over')) {
      openLab(G.state === 'title' ? 'ov-title' : 'ov-over'); return;
    }
    if (e.code === 'Escape' && labOn) { closeLab(); return; }
    if (OPT.open) { if (e.code === 'Escape' || e.code === 'KeyP') closeOptions(); return; }
    if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
    if (e.code === 'KeyM') { toggleSound(); return; }
  });
  window.addEventListener('keyup', e => {
    const d = KEYMAP[e.code];
    if (d) keyHeld[d] = 0;
  });

  document.querySelectorAll('.pad').forEach(btn => {
    const d = btn.dataset.dir;
    const down = e => { e.preventDefault(); SFX.ensure(); btn.classList.add('held'); padHeld[d] = 1; };
    const up = () => { btn.classList.remove('held'); padHeld[d] = 0; };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
  });

  const scr = $('screen');
  const scrPos = e => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  };
  scr.addEventListener('touchstart', e => {
    SFX.ensure();
    if (G.state !== 'playing') return;   
    const p = scrPos(e.touches[0]);
    joy.active = true; joy.ox = joy.cx = p.x; joy.oy = joy.cy = p.y; joy.x = joy.y = 0;
    e.preventDefault();
  }, { passive: false });
  scr.addEventListener('touchmove', e => {
    if (!joy.active) return;
    e.preventDefault();
    const p = scrPos(e.touches[0]);
    const dx = clamp(p.x - joy.ox, -26, 26), dy = clamp(p.y - joy.oy, -26, 26);
    joy.x = dx / 26; joy.y = dy / 26; joy.cx = joy.ox + dx; joy.cy = joy.oy + dy;
  }, { passive: false });
  const endJoy = () => { joy.active = false; joy.x = joy.y = 0; };
  scr.addEventListener('touchend', endJoy);
  scr.addEventListener('touchcancel', endJoy);

  scr.addEventListener('mousemove', e => {
    const r = scr.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * W;
    mouse.y = (e.clientY - r.top) / r.height * H;
  });
}

/* --------------------------------------------------------- 5. SPRITES */
const PAL_DRONE = { C:'#9df1ff', c:'#22c9ea', k:'#071826', m:'#2a3f52', d:'#0d3a4e', e:'#052030', w:'#eaffff' };
const SPR_DRONE = [
  '...CCCCCCCC...',
  '..kcccccccck..',
  '.kmccccccccmk.',
  '.kmceeeeeecmk.',
  '.kmceewweecmk.',
  '.kmceewweecmk.',
  '.kmceeeeeecmk.',
  '.kmccccccccmk.',
  '..kddddddddk..',
  '...kk.kk.kk...',
];

const PAL_HUNT = {
  K:'#120b14',  
  B:'#4d6076',  
  b:'#33425c',  
  d:'#1c2536', 
  V:'#0b0e19',  
  y:'#ffe14a',  
  r:'#8f2038',  
  R:'#ff5a70',  
  o:'#5e1526',  
  t:'#ff9d5c', 
};
const SPR_HUNT_A = [
  '...R......R...',
  '...K......K...',
  '..KKBBBBBBKK..',
  '.KBBbbbbbbBBK.',
  'KBdVVVVVVVVdBK',
  'KBdVyyVVVVVdBK',
  'KBborrrrrrobBK',
  '.KKooddddooKK.',
  '...K..dd..K...',
  '...t..tt..t...',
];
const SPR_HUNT_B = [
  '...r......r...',
  '...K......K...',
  '..KKBBBBBBKK..',
  '.KBBbbbbbbBBK.',
  'KBdVVVVVVVVdBK',
  'KBdVVVVVyyVdBK',
  'KBborrrrrrobBK',
  '.KKooddddooKK.',
  '...K..dd..K...',
  '....t....t....',
];

function drawSprite(c, spr, pal, x, y, flip = false, skew = 0, vs = 1) {
  const h = spr.length, w = spr[0].length;
  const oy = Math.round(h * (1 - vs) / 2);           
  let prev = -99;
  for (let r = 0; r < h; r++) {
    const dx = Math.round(skew * ((r - (h - 1) / 2) / ((h - 1) / 2 || 1)));
    const row = spr[r];
    const ry = y + oy + Math.round(r * vs);
    const fill = ry > prev + 1;                        
    for (let i = 0; i < w; i++) {
      const col = pal[row[i]];
      if (!col) continue;
      c.fillStyle = col;
      const px = x + (flip ? w - 1 - i : i) + dx;
      c.fillRect(px, ry, 1, 1);
      if (fill) c.fillRect(px, ry - 1, 1, 1);
    }
    prev = ry;
  }
}

const droneCv = document.createElement('canvas');
droneCv.width = 20; droneCv.height = 19;
const droneCtx = droneCv.getContext('2d');
const DRONE_TILT = .14;                     

function renderDroneC(d, vs, flame) {
  const c = droneCtx;
  c.clearRect(0, 0, 20, 19);
  drawSprite(c, SPR_DRONE, PAL_DRONE, 3, 5, false, 0, vs);   
  if (d !== 'U') {
    c.fillStyle = '#0a2030';
    const px = d === 'R' ? 1 : d === 'L' ? -1 : (P.facing > 0 ? 1 : 0);
    c.fillRect(9 + px, 9, 1, 2);
  }
  /* rotors animés */
  const rw = [7, 5, 3][Math.floor(G.rt * 18) % 3];
  c.fillStyle = '#9db6c9';
  c.fillRect(5 - (rw >> 1), 1, rw, 1); c.fillRect(14 - (rw >> 1), 1, rw, 1);
  c.fillStyle = '#3a5468';
  c.fillRect(5, 2, 1, 2); c.fillRect(14, 2, 1, 2);
  /* antenne + balise */
  c.fillStyle = '#3a5468'; c.fillRect(10, 2, 1, 3);
  if (Math.floor(G.rt * 3) % 2) { c.fillStyle = '#ff4b4b'; c.fillRect(10, 1, 1, 1); }
  /* propulseur en montée */
  if (flame) {
    const f = Math.floor(G.rt * 20) % 2;
    c.fillStyle = '#9df1ff'; c.fillRect(9, 15, 3, 1);
    c.fillStyle = f ? '#eaffff' : '#22c9ea';
    c.fillRect(f ? 9 : 10, 16, f ? 3 : 1, 1);
  }
}

const CODE_CHARS = '01<>/{}#*&%$;:=?!'.split('');

const SAFE = { x: 90, y: -10, w: 60, h: 42 };
function inSafe(x, y, m = 0) {
  return x > SAFE.x - m && x < SAFE.x + SAFE.w + m &&
         y > SAFE.y - m && y < SAFE.y + SAFE.h + m;
}

/* ------------------------------------------- 6. GÉNÉRATION DE LA CARTE */

let grid = [], rooms = [], nodes = [], corrTiles = [];
let drones = [];
let worms = [];
let doorFront = new Set();  

function tileAt(tx, ty) { return (grid[ty] && grid[ty][tx] !== undefined) ? grid[ty][tx] : T_WALL; }
function solidPlayer(t) { return t === T_WALL || t === T_STRUCT; }   

function genMap(sector) {
  NC = mapCols(sector);
  W = NC * TILE;
  cv.width = W; ctx.imageSmoothingEnabled = false;   
  bgC.width = W; bgx.imageSmoothingEnabled = false;
  $('stage').style.width = 'min(96vw, ' + (NC * 30 + 20) + 'px)';  
  PAD.x = W / 2; SAFE.x = W / 2 - 30;
  BG.docks = [[W / 2 - 26, 8], [W / 2 + 26, 8]];
  CORNERS = [[20, 46], [W - 20, 46], [20, 294], [W - 20, 294]];

  grid = Array.from({ length: NR }, () => Array(NC).fill(T_CORR));
  for (let x = 0; x < NC; x++) grid[NR - 1][x] = T_WALL;
  for (let y = 0; y < NR; y++) { grid[y][0] = T_WALL; grid[y][NC - 1] = T_WALL; }
  for (let y = 0; y < 2; y++) for (let x = 1; x < NC - 1; x++) grid[y][x] = T_STRUCT;
  const mid = NC >> 1;
  for (let y = 0; y < 2; y++) for (let x = mid - 1; x <= mid + 1; x++) grid[y][x] = T_DOCK;

  const cbs = colBands(NC);
  const slots = [];
  for (let ri = 0; ri < ROW_BANDS.length; ri++)
    for (let bi = 0; bi < cbs.length; bi++)
      slots.push({ bi, ri, cx: cbs[bi], label: String.fromCharCode(65 + ri * cbs.length + bi) });
  /* salles : cible + 1 à 3 en trop → celles sans fragment sont VIDES */
  const want = Math.min(slots.length, G.params.dataTarget + 1 + irnd(0, 2));
  const chosen = shuffle([...slots]).slice(0, want).sort((a, b) => a.ri - b.ri || a.bi - b.bi);
  const taken = new Set(chosen.map(s => s.bi + ',' + s.ri));

  rooms = []; nodes = [];
  for (const s of chosen) {
    /* grande salle sur 2 niveaux : consomme aussi le slot du dessous */
    const tall = s.ri < 2 && !taken.has(s.bi + ',' + (s.ri + 1)) && Math.random() < .25;
    rooms.push(carveRoom(s.cx, ROW_BANDS[s.ri], tall, s.label));
  }

  if (G.params.special) {
    for (let x = mid - 1; x <= mid + 1; x++) grid[NR - 1][x] = T_VAULT;
    const vault = { rects: [{ x: mid - 2, y: NR - 1, w: 5, h: 1 }], doors: [],
                    label: 'V', done: false, empty: false, spots: [], vault: true };
    rooms.push(vault);
    nodes.push({ x: mid * TILE + 8, y: (NR - 1) * TILE + 8, room: vault, harvested: false, special: true });
  }

  let need = G.params.dataTarget - (G.params.special ? 1 : 0);
  const giveSpot = r => {
    const s = r.spots.splice(irnd(0, r.spots.length - 1), 1)[0];
    nodes.push({ x: s[0] * TILE + 8, y: s[1] * TILE + 8, room: r, harvested: false, special: false });
    need--;
  };
  for (const r of shuffle([...rooms.filter(r => !r.vault && r.spots.length)])) {
    if (need <= 0) break;
    giveSpot(r);
  }
  if (need > 0)
    for (const r of shuffle([...rooms.filter(r => !r.vault && r.spots.length)])) {
      if (need <= 0) break;
      giveSpot(r);
    }
  for (const r of rooms) r.empty = !r.vault && !nodes.some(n => n.room === r);
  spawnWorms();
  corrTiles = [];
  for (let y = 0; y < NR; y++) for (let x = 0; x < NC; x++)
    if (grid[y][x] === T_CORR) corrTiles.push([x, y]);
  doorFront = new Set();
  for (let y = 1; y < NR - 1; y++) for (let x = 1; x < NC - 1; x++) {
    if (grid[y][x] !== T_CORR) continue;
    if (tileAt(x + 1, y) === T_DOOR || tileAt(x - 1, y) === T_DOOR ||
        tileAt(x, y + 1) === T_DOOR || tileAt(x, y - 1) === T_DOOR)
      doorFront.add(x + ',' + y);
  }
}

/* ------------------------------------------- 7. FOND STATIQUE PRÉ-RENDU */

const cv = $('game'), ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
const bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H;
const bgx = bgC.getContext('2d');

let TH = THEMES[0];                                   
const BG = { leds: [], streams: [], docks: [[94, 8], [146, 8]] };

function hazard(c, x, y, w, h) {                      
  c.globalAlpha = .35; c.fillStyle = '#e8b400';
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++)
    if ((xx + yy) % 6 < 3) c.fillRect(x + xx, y + yy, 1, 1);
  c.globalAlpha = 1;
}
function tri(c, cx, cy, dir, col, a) {               
  c.globalAlpha = a; c.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const w = (dir === 0 || dir === 3) ? (5 - i) >> 1 : i >> 1;
    if (dir < 2) c.fillRect(cx - w, cy + i, 2 * w + 1, 1);
    else c.fillRect(cx + i, cy - w, 1, 2 * w + 1);
  }
  c.globalAlpha = 1;
}

function buildBg(sector) {
  BG.leds = []; BG.streams = [];
  const c = bgx;
  c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);

  for (let ty = 0; ty < NR; ty++) for (let tx = 0; tx < NC; tx++) {
    const t = grid[ty][tx], px = tx * TILE, py = ty * TILE;
    if (t === T_CORR || t === T_ROOM || t === T_DOOR) {
      c.fillStyle = t === T_ROOM ? '#0a0f1a' : '#060a12';
      c.fillRect(px, py, TILE, TILE);
      c.fillStyle = 'rgba(140,170,210,.05)';
      c.fillRect(px, py, TILE, 1); c.fillRect(px, py, 1, TILE);
      if (t === T_ROOM) { c.fillStyle = rgba(TH.accent, .06); c.fillRect(px, py + 15, TILE, 1); }
      if (t === T_CORR && Math.random() < .12) { c.fillStyle = rgba(TH.accent, .06); c.fillRect(px + 3, py + 7, 10, 1); }
    } else if (t === T_WALL) {
      /* mur de salle = façade de baie serveur (plats + LED animée) */
      c.fillStyle = '#0d1523'; c.fillRect(px, py, TILE, TILE);
      c.fillStyle = '#182338'; c.fillRect(px, py, TILE, 1); c.fillRect(px, py + 15, TILE, 1);
      for (let i = 0; i < 2; i++) {
        const yy = py + 2 + i * 7;
        c.fillStyle = '#111b2d'; c.fillRect(px + 1, yy, 14, 5);
        c.fillStyle = '#0a1120';
        for (let v = 0; v < 4; v++) c.fillRect(px + 2 + v * 3, yy + 1, 2, 3);
        c.fillStyle = '#233350'; c.fillRect(px + 13, yy + 1, 1, 3);
      }
      if (Math.random() < .85)
        BG.leds.push({ x: px + 2 + irnd(0, 2) * 4, y: py + 2 + irnd(0, 1) * 7, sp: rnd(.6, 3), ph: Math.random(), dut: rnd(.3, .7) });
    } else if (t === T_DOCK) {
      c.fillStyle = '#0a1120'; c.fillRect(px, py, TILE, TILE);
      c.fillStyle = '#101a2c'; c.fillRect(px + 1, py + 1, 14, 14);
      c.fillStyle = rgba(TH.accent, .12); c.fillRect(px + 1, py + 7, 14, 1); c.fillRect(px + 7, py + 1, 1, 14);
    } else if (t === T_VAULT) {                        
      c.fillStyle = '#120e04'; c.fillRect(px, py, TILE, TILE);
      c.fillStyle = '#241a06'; c.fillRect(px + 1, py + 1, 14, 14);
      c.fillStyle = rgba('#ffd24a', .18);
      c.fillRect(px + 1, py + 1, 14, 1); c.fillRect(px + 1, py + 14, 14, 1);
      c.fillStyle = '#3a2a06';
      c.fillRect(px + 2, py + 2, 1, 12); c.fillRect(px + 13, py + 2, 1, 12);
    } else {
      c.fillStyle = '#0a0e17'; c.fillRect(px, py, TILE, TILE);
      c.fillStyle = '#131b2b'; c.fillRect(px, py, TILE, 1);
      c.fillStyle = '#0a1120'; c.fillRect(px, py + 15, TILE, 1);
      c.fillStyle = '#050810'; c.fillRect(px + 5, py, 5, TILE);
      c.fillStyle = rgba(TH.accent, .22); c.fillRect(px + 6, py, 1, TILE);
      c.fillStyle = rgba('#ff3ec8', .15); c.fillRect(px + 8, py, 1, TILE);
      if (Math.random() < .2) { c.fillStyle = '#1a2436'; c.fillRect(px + 2, py + 4, 11, 7);
                                c.fillStyle = '#0a0f1a'; c.fillRect(px + 4, py + 6, 7, 3); }
      if (Math.random() < .4)
        BG.leds.push({ x: px + irnd(2, 13), y: py + irnd(2, 13), sp: rnd(.4, 2), ph: Math.random(), dut: rnd(.2, .6) });
    }
  }
  for (const r of rooms) {
    for (const d of r.doors) {
      if (d.out < 2) { hazard(c, (d.x - 1) * TILE + 13, d.y * TILE, 3, TILE);
                       hazard(c, (d.x + 1) * TILE, d.y * TILE, 3, TILE); }
      else           { hazard(c, d.x * TILE, (d.y - 1) * TILE + 13, TILE, 3);
                       hazard(c, d.x * TILE, (d.y + 1) * TILE, TILE, 3); }
      c.fillStyle = rgba(TH.accent, .35);           
      if (d.out === 0) c.fillRect(d.x * TILE, d.y * TILE + 14, TILE, 1);
      if (d.out === 1) c.fillRect(d.x * TILE, d.y * TILE + 1, TILE, 1);
      if (d.out === 2) c.fillRect(d.x * TILE + 14, d.y * TILE, 1, TILE);
      if (d.out === 3) c.fillRect(d.x * TILE + 1, d.y * TILE, 1, TILE);
      const dir = [0, 1, 3, 2][d.out];
      const cx = d.out === 2 ? (d.x - 1) * TILE + 8 : d.out === 3 ? (d.x + 1) * TILE + 8 : d.x * TILE + 8;
      const cy = d.out === 0 ? (d.y - 1) * TILE + 8 : d.out === 1 ? (d.y + 1) * TILE + 8 : d.y * TILE + 8;
      tri(c, cx, cy - 4, dir, TH.accent, .4);
      tri(c, cx, cy + 3, dir, TH.accent, .22);
    }
    if (!r.vault) {
      const q = r.rects[0];
      txt3(c, 'SRV-' + r.label, (q.x + 1) * TILE, (q.y + 1) * TILE + 1, rgba(TH.accent, .45));
      if (r.empty) txt3(c, 'VIDE', (q.x + 1) * TILE, (q.y + 1) * TILE + 7, 'rgba(140,100,60,.55)');
    }
  }

  if (grid[NR - 1][NC >> 1] === T_VAULT) {
    const vx = (NC >> 1) * TILE;
    hazard(c, vx - TILE, (NR - 2) * TILE, TILE, 3);
    hazard(c, vx + TILE, (NR - 2) * TILE, TILE, 3);
    txt3(c, 'COFFRE', vx - 10, (NR - 2) * TILE + 11, rgba('#ffd24a', .55));
    tri(c, vx + 8, (NR - 3) * TILE + 8, 0, '#ffd24a', .4);
  }

  txt3(c, 'EXT-01', W / 2 - 56, 6, rgba(TH.accent, .5));
  txt3(c, 'DOCK', W / 2 + 32, 6, rgba(TH.accent, .35));
  tri(c, W / 2, 22, 0, TH.accent, .3);

  txt3(c, 'ORPHEE-9 // SECTEUR ' + pad2(sector), Math.round(W / 2 - 44), 18 * TILE + 6, rgba(TH.accent, .16));

  for (const row of [2, 7, 12, 17, 18]) if (Math.random() < .8)
    BG.streams.push({ axis: 'h', line: row * TILE + irnd(3, 12), pos: rnd(0, W), sp: rnd(20, 50) * (Math.random() < .5 ? -1 : 1) });
  for (const col of guardCols(NC)) if (Math.random() < .8)
    BG.streams.push({ axis: 'v', line: col * TILE + irnd(3, 12), pos: rnd(0, H), sp: rnd(20, 50) * (Math.random() < .5 ? -1 : 1) });
}

/* --------------------------------------------- 8. DÉCOR DYNAMIQUE */

function drawLeds(c) {
  for (const l of BG.leds) {
    if (((G.wt * l.sp + l.ph) % 1) >= l.dut) continue;
    c.fillStyle = Math.sin(G.wt * 2 + l.ph * 9) > .1 ? TH.accent : mix(TH.accent, '#ffffff', .5);
    c.fillRect(l.x, l.y, 2, 2);
  }
}
function updateStreams(edt) {
  for (const s of BG.streams) {
    const span = s.axis === 'h' ? W : H;
    s.pos = ((s.pos + s.sp * edt) % span + span) % span;
  }
}
function drawStreams(c) {
  for (const s of BG.streams) {
    const hx = s.axis === 'h';
    const x = hx ? s.pos : s.line, y = hx ? s.line : s.pos;
    if (tileAt(Math.floor(x / 16), Math.floor(y / 16)) !== T_CORR) continue;
    c.fillStyle = rgba(TH.accent, .5);
    if (hx) c.fillRect(Math.round(x), Math.round(y), 3, 1); else c.fillRect(Math.round(x), Math.round(y), 1, 3);
    const bx = hx ? x - Math.sign(s.sp) * 4 : x, by = hx ? y : y - Math.sign(s.sp) * 4;
    if (tileAt(Math.floor(bx / 16), Math.floor(by / 16)) === T_CORR) {
      c.fillStyle = rgba(TH.accent, .2);
      if (hx) c.fillRect(Math.round(bx), Math.round(y), 3, 1); else c.fillRect(Math.round(x), Math.round(by), 1, 3);
    }
  }
}
const RAIN = [];
function buildRain() {
  RAIN.length = 0;
  for (let i = 0; i < 14; i++)
    RAIN.push({ x: rnd(4, W - 4), y: rnd(0, H), sp: rnd(8, 20), ch: pick('01KXZ#<>+%:/'.split('')) });
}
function updateRain(edt) {
  for (const d of RAIN) {
    d.y += d.sp * edt;
    if (d.y > H) { d.y = -6; d.x = rnd(4, W - 4); d.ch = pick('01KXZ#<>+%:/'.split('')); }
  }
}
function drawRain(c) {
  for (const d of RAIN) {
    if (tileAt(Math.floor(d.x / 16), Math.floor(d.y / 16)) !== T_CORR) continue;
    for (let k = 0; k < 3; k++) {
      const y = Math.round(d.y - k * 6);
      if (y < 0 || tileAt(Math.floor(d.x / 16), Math.floor(y / 16)) !== T_CORR) continue;
      txt3(c, k === 0 ? d.ch : (k === 1 ? '?' : '0'), Math.round(d.x), y, TH.accent, 1, k === 0 ? .22 : .09);
    }
  }
}

function spectreInRoom(r) {
  return r.rects.some(q => Sp.x > q.x * TILE && Sp.x < (q.x + q.w) * TILE &&
                           Sp.y > q.y * TILE && Sp.y < (q.y + q.h) * TILE);
}
function drawDoors(c) {
  for (const r of rooms) {
    let col;
    if (spectreInRoom(r)) col = Math.floor(G.wt * 10) % 2 ? '#ff4b4b' : '#7a1a1a';
    else if (r.done || r.empty) col = '#2e3c50';
    else col = Math.floor(G.wt * 3) % 2 ? TH.accent : mix(TH.accent, '#000000', .45);
    for (const d of r.doors) {
      const px = d.x * TILE + 8, py = d.y * TILE + 8;
      c.fillStyle = rgba(col, .25);
      c.fillRect(px - 3, py - 3, 7, 7);
      c.fillStyle = col;
      c.fillRect(px - 1, py - 1, 3, 3);
    }
    if (spectreInRoom(r)) {
      c.fillStyle = rgba('#ff4b4b', .08 + .05 * Math.sin(G.wt * 18));
      for (const q of r.rects)
        c.fillRect((q.x + 1) * TILE, (q.y + 1) * TILE, (q.w - 2) * TILE, (q.h - 2) * TILE);
    }
  }
}

function drawNodes(c) {
  for (const n of nodes) {
    if (n.harvested) continue;
    if (n.special) {                                    
      const p = .5 + .5 * Math.sin(G.wt * 4);
      c.fillStyle = rgba('#ffd24a', .12 + .1 * p);
      c.fillRect(n.x - 11, n.y - 11, 22, 22);
      drawSprite(c, SPR_FRAG, PAL_FRAG, Math.round(n.x - 3), Math.round(n.y - 3));
      for (let k = 0; k < 2; k++) {
        const a = G.wt * 2.6 + k * Math.PI;
        c.fillStyle = k ? '#ffffff' : '#ffd24a';
        c.fillRect(Math.round(n.x + Math.cos(a) * 11), Math.round(n.y + Math.sin(a) * 11), 1, 1);
      }
      continue;
    }
    const p = .5 + .5 * Math.sin(G.wt * 3 + n.x * .1);
    c.fillStyle = rgba('#ffd24a', .1 + .08 * p);
    c.fillRect(n.x - 7, n.y - 7, 14, 14);
    drawSprite(c, SPR_DATA, PAL_DATA, Math.round(n.x - 4), Math.round(n.y - 4));
    const a = G.wt * 2.2 + n.x;
    c.fillStyle = '#ffd24a';
    c.fillRect(Math.round(n.x + Math.cos(a) * 9), Math.round(n.y + Math.sin(a) * 9), 1, 1);
  }
}
const PAL_FRAG = { k:'#3a2a06', W:'#ffffff', Y:'#ffd24a', w:'#c98a12' };
const SPR_FRAG = [
  '...k...', '..kWk..', '.kWYwk.', 'kWYYYwk', '.kWYwk.', '..kWk..', '...k...',
];
const PAL_DATA = { k:'#3a2a06', y:'#c98a12', Y:'#ffd24a' };
const SPR_DATA = [
  '....k....', '...kyk...', '..kyyYk..', '.kyyYYYk.', 'kyyYYYYyk',
  '.kyyYYYk.', '..kyyYk..', '...kyk...', '....k....',
];

function drawExtraction(c) {
  const open = G.extractionOpen, cx = W / 2;
  for (const [bx, by] of BG.docks) {
    const on = open ? Math.floor(G.wt * 6) % 2 : Math.floor(G.wt * 1.5) % 2;
    c.fillStyle = on ? (open ? '#ffd24a' : '#ff4b4b') : '#3a1520';
    c.fillRect(bx, by, 3, 2);
  }
  if (!open) return;
  const p = .5 + .5 * Math.sin(G.wt * 5);
  c.fillStyle = rgba('#ffd24a', .08 + .06 * p); c.fillRect(cx - 22, 2, 44, 28);
  c.strokeStyle = rgba('#ffd24a', .5 + .3 * p); c.lineWidth = 1;
  c.strokeRect(cx - 21.5, 2.5, 43, 27);
  for (let i = 0; i < 3; i++) {                   
    const ph = (G.wt * 14 + i * 8) % 24;
    tri(c, cx, 26 - ph, 1, '#ffd24a', .7 * (1 - ph / 24));
  }
  txt3(c, 'EXT', cx - 6, 4, rgba('#ffd24a', .6 + .3 * p));
}

/* --------------------------------------------- 9. DRONES GARDIENS */

function bfs(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  if (tileAt(tx, ty) !== T_CORR) return null;
  const prev = new Int16Array(NC * NR).fill(-1);
  const start = sy * NC + sx;
  prev[start] = start;
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    const cx = cur % NC, cy = (cur / NC) | 0;
    if (cx === tx && cy === ty) {
      const path = [];
      let n = cur;
      while (n !== start) { path.push([n % NC, (n / NC) | 0]); n = prev[n]; }
      return path.reverse();
    }
    const nb = [cur - 1, cur + 1, cur - NC, cur + NC];
    const ok = [cx > 0, cx < NC - 1, cy > 0, cy < NR - 1];
    for (let i = 0; i < 4; i++) {
      if (!ok[i]) continue;
      const n = nb[i];
      if (prev[n] !== -1) continue;
      if (grid[(n / NC) | 0][n % NC] !== T_CORR) continue;
      prev[n] = cur; q.push(n);
    }
  }
  return null;
}

function droneSees(d) {
  const ptx = Math.floor(P.x / 16), pty = Math.floor(P.y / 16);
  const inCorr = tileAt(ptx, pty) === T_CORR;
  const dist = Math.hypot(P.x - d.x, P.y - d.y);
  if (dist < 34 && inCorr) return true;         
  if (dist > 130 || !inCorr) return false;       
  const dtx = Math.floor(d.x / 16), dty = Math.floor(d.y / 16);
  if (dtx === ptx) {
    for (let ty = Math.min(dty, pty) + 1; ty < Math.max(dty, pty); ty++)
      if (grid[ty][dtx] !== T_CORR) return false;
    return true;
  }
  if (dty === pty) {
    for (let tx = Math.min(dtx, ptx) + 1; tx < Math.max(dtx, ptx); tx++)
      if (grid[dty][tx] !== T_CORR) return false;
    return true;
  }
  return false;
}

class Drone {
  constructor(tx, ty, spd) {
    this.x = tx * TILE + 8; this.y = ty * TILE + 8;
    this.spd = spd; this.path = null; this.pi = 0;
    this.chaseT = 0; this.repath = 0; this.seeFlash = 0; this.stun = 0; this.face = 1;
    this.scanT = 0;        
    this.crowdT = 0;       
    this.touched = false;  
    this.wasChase = false; 
  }

  pickPatrol(minDist = 2) {
    const mx = Math.floor(this.x / 16), my = Math.floor(this.y / 16);
    for (let tries = 0; tries < 10; tries++) {
      const t = pick(corrTiles);
      if (Math.abs(t[0] - mx) + Math.abs(t[1] - my) < minDist) continue;
      if (doorFront.has(t[0] + ',' + t[1])) continue;
      const p = bfs(mx, my, t[0], t[1]);
      if (p && p.length) { this.path = p; this.pi = 0; return true; }
    }
    return false;
  }

  startScan() {
    this.scanT = .45; this.path = null; this.pi = 0;
    spawnPing(this.x, this.y, 9, '#ffb02e');
  }

  unstick() {
    this.crowdT = 0;
    const mx = Math.floor(this.x / 16), my = Math.floor(this.y / 16);
    let best = null, bd = -1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = mx + dx, ny = my + dy;
      if (tileAt(nx, ny) !== T_CORR) continue;
      let dd = 1e9;
      for (const o of drones) if (o !== this)
        dd = Math.min(dd, Math.hypot(o.x - (nx * TILE + 8), o.y - (ny * TILE + 8)));
      if (dd > bd) { bd = dd; best = [nx, ny]; }
    }
    for (let i = 0; i < 3; i++) spawnSpark(this.x + rnd(-4, 4), this.y + rnd(-3, 3));
    if (best) { this.x = best[0] * TILE + 8; this.y = best[1] * TILE + 8; }
    this.path = null; this.pi = 0; this.repath = 0;
    if (this.chaseT <= 0) this.pickPatrol(3);   
  }

  update(edt) {
    if (this.seeFlash > 0) this.seeFlash -= edt;
    if (this.stun > 0) {                       // sonné par le bouclier
      this.stun -= edt;
      if (Math.random() < .2) spawnSpark(this.x + rnd(-4, 4), this.y + rnd(-3, 3));
      return;
    }
    if (this.crowdT > .6) { this.unstick(); return; }
    const sees = droneSees(this);
    if (sees) {
      if (this.chaseT <= 0) { this.seeFlash = .6; SFX.alert(); }
      this.chaseT = 2.2;
      if (this.scanT > 0) { this.scanT = 0; this.repath = 0; }   
    } else {
      this.chaseT = Math.max(0, this.chaseT - edt * 2.8);         
    }
    const chasing = this.chaseT > 0;
    if (this.scanT > 0) {
      this.scanT -= edt;
      if (this.scanT <= 0) {
        this.chaseT = 0; this.wasChase = false;
        this.pickPatrol(4);                     
      }
      return;
    }

    if (chasing) {
      this.repath -= edt;
      if (this.repath <= 0) {
        this.repath = .4;
        const ptx = Math.floor(P.x / 16), pty = Math.floor(P.y / 16);
        const inCorr = tileAt(ptx, pty) === T_CORR;
        const tgt = inCorr ? [ptx, pty] : [P.lastCorr.x, P.lastCorr.y];
        const p = bfs(Math.floor(this.x / 16), Math.floor(this.y / 16), tgt[0], tgt[1]);
        if (p && p.length) {
          const pp = inCorr ? p : p.slice(0, -1);
          if (pp.length) { this.path = pp; this.pi = 0; }
          else this.startScan();              
        } else if (!this.path || this.pi >= this.path.length) this.startScan();
      }
    } else {
      if (this.wasChase) { this.path = null; this.pi = 0; this.repath = 0; }  
      if (!this.path || this.pi >= this.path.length) {
        this.repath -= edt;
        if (this.repath <= 0) { this.repath = .35; this.pickPatrol(2); }
      }
    }
    this.wasChase = chasing;

    const spd = Math.min(this.spd * (chasing ? 1.2 : 1), 90);
    if (this.path && this.pi < this.path.length) {
      const wp = this.path[this.pi];
      const wx = wp[0] * TILE + 8, wy = wp[1] * TILE + 8;
      const dx = wx - this.x, dy = wy - this.y, d = Math.hypot(dx, dy);
      if (d < 1.3) this.pi++;
      else {
        const mv = Math.min(spd * edt, d);
        this.x += dx / d * mv; this.y += dy / d * mv;
        if (Math.abs(dx) > .5) this.face = Math.sign(dx);
      }
    }

    if (Math.random() < .1) spawnThrust(this.x - this.face * 5, this.y, '#ff4b4b');
  }
}
function separation(edt) {                   
  for (const d of drones) d.touched = false;
  for (let i = 0; i < drones.length; i++) for (let j = i + 1; j < drones.length; j++) {
    const a = drones[i], b = drones[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 11) continue;
    a.touched = b.touched = true;
    let nx, ny;
    if (d < .001) { const ang = i * 2.4 + G.rt; nx = Math.cos(ang); ny = Math.sin(ang); }
    else { nx = dx / d; ny = dy / d; }
    const ap = a.chaseT > 0 && a.scanT <= 0, bp = b.chaseT > 0 && b.scanT <= 0;
    let aw = .5, bw = .5;
    if (ap !== bp) { aw = ap ? .2 : .8; bw = bp ? .2 : .8; }
    else { aw = .25; bw = .75; }
    const push = 11 - d;
    const move = (dr, w, sgn) => {
      const px2 = dr.x + sgn * nx * push * w, py2 = dr.y + sgn * ny * push * w;
      if (tileAt(Math.floor(px2 / 16), Math.floor(py2 / 16)) === T_CORR) { dr.x = px2; dr.y = py2; }
    };
    move(a, aw, -1); move(b, bw, 1);
  }
  for (const d of drones)
    d.crowdT = d.touched ? d.crowdT + edt : Math.max(0, d.crowdT - edt * 2);
}
function drawDrones(c) {
  for (const d of drones) {
    if (d.stun > 0 && Math.floor(G.rt * 16) % 2) continue;    
    const x = Math.round(d.x), y = Math.round(d.y);
    drawSprite(c, Math.floor(G.rt * 10) % 2 ? SPR_HUNT_A : SPR_HUNT_B, PAL_HUNT, x - 7, y - 5, d.face < 0);
    if (d.chaseT > 0) {                                      
      c.fillStyle = '#ff2b5e'; c.fillRect(x - 4, y - 1, 8, 2);
      if (Math.floor(G.rt * 8) % 2) { c.fillStyle = '#fff'; c.fillRect(x - 2, y - 1, 3, 2); }
    }
    if (d.seeFlash > 0 && Math.floor(G.rt * 8) % 2) txt3(c, '!', x - 1, y - 11, '#ff4b4b');
    if (d.scanT > 0 && Math.floor(G.rt * 5) % 2) txt3(c, '?', x - 1, y - 12, '#ffb02e');
  }
}
function spawnDrones(n) {
  drones = [];
  let pool = corrTiles.filter(([x, y]) => Math.hypot(x * 16 + 8 - PAD.x, y * 16 + 8 - PAD.y) > 130);
  if (!pool.length) pool = corrTiles;       
  shuffle(pool);
  for (let i = 0; i < n; i++) {
    const [x, y] = pool[i % pool.length];
    drones.push(new Drone(x, y, G.params.droneSpd));
    spawnRing(x * 16 + 8, y * 16 + 8, 12, '#e8394f');
  }
}

/* --------------------------------------------- 10. SPECTRE-RÉSEAU */

function chaikin(pts, it) {          
  for (let k = 0; k < it; k++) {
    if (pts.length < 3) break;
    const o = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      o.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 },
              { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
    }
    o.push(pts[pts.length - 1]); pts = o;
  }
  return pts;
}
function samplePath(pts, step) {    
  const out = [{ x: pts[0].x, y: pts[0].y, cum: 0, i: 0, nx: 0, ny: 1 }];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || .001;
    const n = Math.max(1, Math.round(d / step));
    for (let k = 1; k <= n; k++)
      out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n,
                 cum: out[out.length - 1].cum + d / n, i: out.length,
                 nx: -(b.y - a.y) / d, ny: (b.x - a.x) / d });
  }
  return out;
}

class Worm {
  constructor(ax, ay, cells, spd, opts = {}) {
    this.ax = Math.round(ax); this.ay = Math.round(ay);
    this.cells = cells;
    this.vault = !!opts.vault;
    this.facade = !!opts.facade;                
    this.out = opts.out || { dx: 0, dy: 1 };    
    const wps = [{ x: this.ax, y: this.ay },
                 ...cells.map(cl => ({ x: cl.x * TILE + 8, y: cl.y * TILE + 8 }))];
    this.pts = samplePath(chaikin(wps, 2), 4);
    this.cd = cells.map(cl => {
      const px = cl.x * TILE + 8, py = cl.y * TILE + 8; let bi = 0, bd = 1e9;
      this.pts.forEach((p, i) => { const d = (p.x - px) ** 2 + (p.y - py) ** 2; if (d < bd) { bd = d; bi = i; } });
      return this.pts[bi].cum;
    });
    this.tHide = rnd(1.8, 3.6) / spd;
    this.tWarn = (opts.warn || .75) / Math.sqrt(spd);
    this.tCell = .22 / spd;
    this.tHold = rnd(.7, 1.4) / spd;
    this.state = 'hidden'; this.timer = this.tHide * rnd(.1, 1); this.ext = 0;
    this.dead = false;
  }
  update(edt) {
    if (this.dead) return;
    this.timer -= edt;
    const n = this.cells.length;
    switch (this.state) {
      case 'hidden': if (this.timer <= 0) { this.state = 'warn'; this.timer = this.tWarn; } break;
      case 'warn':   if (this.timer <= 0) { this.state = 'ext';
                       if (G.state === 'playing' && Math.hypot(P.x - this.ax, P.y - this.ay) < 150) SFX.worm(); } break;
      case 'ext':
        this.ext += edt / this.tCell;
        if (this.ext >= n) { this.ext = n; this.state = 'hold'; this.timer = this.tHold; }
        break;
      case 'hold':   if (this.timer <= 0) this.state = 'ret'; break;
      case 'ret':
        this.ext -= edt / (this.tCell * .7);
        if (this.ext <= 0) { this.ext = 0; this.state = 'hidden'; this.timer = this.tHide * rnd(.75, 1.25); }
        break;
    }
  }
  danger(i) {
    if (this.state === 'hold') return true;
    if (this.state === 'ext') return this.ext >= i + .92;
    if (this.state === 'ret') return this.ext > i + .3;
    return false;
  }
  get len() {
    const n = this.cells.length, e = clamp(this.ext, 0, n);
    if (this.state === 'hidden' || this.state === 'warn' || e <= 0) return 0;
    if (e <= 1) return e * this.cd[0];
    const i = Math.min(n - 1, Math.ceil(e) - 1);
    const f = e - i;
    const a = i > 0 ? this.cd[i - 1] : 0;
    return a + (this.cd[i] - a) * f;
  }
  pointAt(L) {
    const p = this.pts;
    for (let i = 1; i < p.length; i++) {
      if (p[i].cum >= L) {
        const a = p[i - 1], b = p[i], f = (L - a.cum) / Math.max(.0001, b.cum - a.cum);
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, nx: a.nx, ny: a.ny };
      }
    }
    return p[p.length - 1];
  }
  draw(c) {
    const px = this.ax, py = this.ay;
    if (this.facade && this.out.dx !== 0) {     
      c.fillStyle = '#10192a'; c.fillRect(px - 3, py - 6, 6, 12);
      c.fillStyle = '#1d2a42'; c.fillRect(px - 3, py - 6, 1, 12); c.fillRect(px + 2, py - 6, 1, 12);
      c.fillStyle = '#0a0f1a'; c.fillRect(px - 1, py - 4, 2, 8);
    } else {                                        
      c.fillStyle = '#10192a'; c.fillRect(px - 6, py - 3, 12, 6);
      c.fillStyle = '#1d2a42'; c.fillRect(px - 6, py - 3, 12, 1); c.fillRect(px - 6, py + 2, 12, 1);
      c.fillStyle = '#0a0f1a'; c.fillRect(px - 4, py - 1, 8, 2);
    }
    let col = rgba(TH.accent, .45 + .2 * Math.sin(G.wt * 2 + px));
    if (this.state === 'warn') col = Math.floor(G.wt * 9) % 2 ? '#ffb02e' : '#ff4b4b';
    else if (this.state !== 'hidden') col = '#ff4b4b';
    c.fillStyle = col; c.fillRect(px - 1, py - 1, 2, 2);

    const L = this.len; if (L <= 0) return;
    for (const p of this.pts) {
      if (p.cum > L) break;
      const wob = Math.sin(G.wt * 3.2 + p.cum * .22) * Math.min(1.3, p.cum * .06);
      const x = Math.round(p.x + p.nx * wob), y = Math.round(p.y + p.ny * wob);
      const w = 8 + (this.cells.length <= 1 ? 1 : 0)         
                - Math.min(3, Math.floor(p.cum / 24));
      c.fillStyle = '#221536'; c.fillRect(x - (w >> 1), y - (w >> 1), w, w);
      c.fillStyle = '#3a2456'; c.fillRect(x - (w >> 1) + 1, y - (w >> 1) + 1, w - 2, w - 2);
      if ((p.i & 1) === 0) { c.fillStyle = TH.accent; c.fillRect(x, y - (w >> 1), 1, 1); }
      if (p.i % 3 === 0 && p.cum > 6) {                         
        c.fillStyle = '#3a2456';
        c.fillRect(Math.round(x + p.nx * (w / 2 + 1)), Math.round(y + p.ny * (w / 2 + 1)), 1, 1);
      }
    }
    const tp = this.pointAt(L), tx = Math.round(tp.x), ty = Math.round(tp.y);
    c.fillStyle = '#221536'; c.fillRect(tx - 4, ty - 4, 8, 8);
    c.fillStyle = '#4a2f6e'; c.fillRect(tx - 3, ty - 3, 6, 6);
    c.fillStyle = '#221536';
    c.fillRect(Math.round(tx + tp.nx * 5) - 1, Math.round(ty + tp.ny * 5) - 1, 3, 3);
    c.fillRect(Math.round(tx - tp.nx * 5) - 1, Math.round(ty - tp.ny * 5) - 1, 3, 3);
    c.fillStyle = '#eaffff';
    c.fillRect(tx - 2, ty - 3, 1, 1); c.fillRect(tx + 1, ty - 3, 1, 1);
    c.fillStyle = Math.floor(G.wt * 10) % 2 ? '#ffffff' : '#ff5a3c';
    c.fillRect(tx - 1, ty - 1, 3, 3);
    if (this.state === 'hold' && Math.random() < .06) spawnSpark(tx, ty);
  }
}
function drawWorms(c) { for (const w of worms) if (!w.dead) w.draw(c); }

function spawnWorms() {
  worms = [];
  const mid = NC >> 1;

  if (G.params.special) {
    const vSpd = G.params.wormSpd * 1.12;
    const Lc = [], Rc = [];
    for (let x = 2; x <= mid; x++) Lc.push({ x, y: NR - 2 });
    Lc.push({ x: mid, y: NR - 1 });
    for (let x = NC - 3; x >= mid; x--) Rc.push({ x, y: NR - 2 });
    Rc.push({ x: mid, y: NR - 1 });
    worms.push(new Worm(TILE + 8, (NR - 2) * TILE + 8, Lc, vSpd, { vault: true, warn: .95 }));
    worms.push(new Worm((NC - 2) * TILE + 8, (NR - 2) * TILE + 8, Rc, vSpd, { vault: true, warn: .95 }));
  }
  const nearDoor = (tx, ty) =>
    [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => tileAt(tx + dx, ty + dy) === T_DOOR);
  const onNode = (tx, ty) => nodes.some(nd => !nd.harvested &&
    Math.abs(nd.x - (tx * TILE + 8)) < 17 && Math.abs(nd.y - (ty * TILE + 8)) < 17);

  const corrA = [], roomA = [];
  for (let y = 2; y < NR - 1; y++) for (let x = 1; x < NC - 1; x++) {
    if (grid[y][x] !== T_WALL) continue;                   
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const tx = x + dx, ty = y + dy, t = tileAt(tx, ty);
      if (ty < 4 || ty > NR - 3) continue;                   
      if (nearDoor(tx, ty) || onNode(tx, ty)) continue;     
      if (t === T_CORR) corrA.push({ x, y, dx, dy, tx, ty });
      else if (t === T_ROOM && G.sector >= 5) roomA.push({ x, y, dx, dy, tx, ty });
    }
  }
  shuffle(corrA); shuffle(roomA);

  const used = new Set(), selA = [], selT = [];
  const tryPool = pool => {
    while (pool.length) {
      const a = pool.pop();
      if (used.has(a.x + ',' + a.y) || used.has('t' + a.tx + ',' + a.ty)) continue;
      if (selA.some(c => Math.abs(c.x - a.x) + Math.abs(c.y - a.y) < 3)) continue;  
      if (selT.some(t => Math.max(Math.abs(t.x - a.tx), Math.abs(t.y - a.ty)) < 2)) continue;
      used.add(a.x + ',' + a.y); used.add('t' + a.tx + ',' + a.ty);
      selA.push(a); selT.push({ x: a.tx, y: a.ty });
      return true;
    }
    return false;
  };
  let n = G.params.worms;
  while (n > 0) {
    let ok = false;
    if (G.sector >= 5 && roomA.length && Math.random() < .35) ok = tryPool(roomA); 
    if (!ok && corrA.length) ok = tryPool(corrA);
    if (!ok && G.sector >= 5 && roomA.length) ok = tryPool(roomA);                  
    if (!ok) break;
    n--;
  }
  for (const a of selA)
    worms.push(new Worm(a.x * TILE + 8, a.y * TILE + 8,
      [{ x: a.tx, y: a.ty }], G.params.wormSpd,
      { facade: true, out: { dx: a.dx, dy: a.dy } }));
}

const Sp = {
  x: 120, y: 160, t: 0, cool: 0, scanT: 2, trail: [], tt: 0,
  wtx: 120, wty: 160, rage: 0,
  mode: 'wander', aggro: 0, detect: 80, blocked: 0, safeCamp: 0,
  spin: 0, emit: 0,
};

function updateSpectre(edt) {
  Sp.t += edt; Sp.rage = Math.max(0, Sp.rage - edt);

  let pSafe = false, pdist = 999;
  if (G.state === 'playing') {
    pSafe = inSafe(P.x, P.y);
    pdist = Math.hypot(P.x - Sp.x, P.y - Sp.y);
    if (pSafe) {
      Sp.safeCamp += edt;
      if (Sp.safeCamp > 2.6) { Sp.aggro = 0; Sp.safeCamp = 0; }  
    } else {
      Sp.safeCamp = 0;
      if (pdist < Sp.detect) Sp.aggro = Math.max(Sp.aggro, 2.6); 
      else Sp.aggro = Math.max(0, Sp.aggro - edt);
    }
    if (Sp.aggro > 0 && Sp.mode === 'wander') {                  
      Sp.mode = 'chase';
      announce('SPECTRE VERROUILLÉ', '#ff3ec8', 'fuyez hors de son rayon pour le semer');
      SFX.alert(); Sp.rage = .9;
      spawnPing(Sp.x, Sp.y, 26, '#ff3ec8');
    } else if (Sp.aggro <= 0 && Sp.mode === 'chase') {
      Sp.mode = 'wander';
    }
  }
  let tx, ty, spd;
  if (Sp.mode === 'chase' && (G.state === 'playing' || G.state === 'dying')) {
    tx = G.state === 'dying' ? G.deathPos.x : P.x;
    ty = G.state === 'dying' ? G.deathPos.y : P.y;
    spd = G.params.spectreSpd;
  } else {                                                      
    if (Math.hypot(Sp.wtx - Sp.x, Sp.wty - Sp.y) < 14) {
    Sp.wtx = rnd(24, W - 24); Sp.wty = rnd(52, 296);
    }
    tx = Sp.wtx; ty = Sp.wty;
    spd = G.params.spectreSpd * G.params.spectreWander;
  }
  let dx = tx - Sp.x, dy = ty - Sp.y;
  const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
  let vx, vy;
  if (Sp.cool > 0) { Sp.cool -= edt; vx = -dx; vy = -dy; }       
  else {
    const w = Math.sin(Sp.t * (Sp.mode === 'chase' ? 3.2 : 1.5)) * .55;
    vx = dx - dy * w; vy = dy + dx * w;                          
  }
  const m = Math.hypot(vx, vy) || 1, step = spd * edt;
  const nx = clamp(Sp.x + vx / m * step, 6, W - 6);
  const ny = clamp(Sp.y + vy / m * step, 6, H - 6);
  let moved = 0;
  if (!inSafe(nx, Sp.y, 9)) { moved += Math.abs(nx - Sp.x); Sp.x = nx; }
  if (!inSafe(Sp.x, ny, 9)) { moved += Math.abs(ny - Sp.y); Sp.y = ny; }
  Sp.blocked = (Sp.mode === 'chase' && pSafe && moved < step * .3)
    ? Sp.blocked + edt : Math.max(0, Sp.blocked - edt * 2);
  Sp.spin += edt * (Sp.mode === 'chase' ? 7.5 : 2.6) * (Sp.blocked > .3 ? 1.5 : 1);
  if (Sp.blocked > .3 && Math.random() < .35) {                 
    const bx = clamp(Sp.x, SAFE.x, SAFE.x + SAFE.w), by = clamp(Sp.y, SAFE.y, SAFE.y + SAFE.h);
    spawnSpark(bx + rnd(-2, 2), by + rnd(-2, 2));
  }
  Sp.tt -= edt;
  if (Sp.tt <= 0) {
    Sp.trail.unshift({ x: Sp.x, y: Sp.y, a: .5, ch: pick(CODE_CHARS),
                       col: Sp.mode === 'chase' ? '#ff3ec8' : '#9d7bff' });
    if (Sp.trail.length > 6) Sp.trail.pop();
    Sp.tt = .075;
  }
  for (const tr of Sp.trail) tr.a -= edt * .85;
  Sp.trail = Sp.trail.filter(t => t.a > 0);

  Sp.emit -= edt;
  if (Sp.emit <= 0) {
    Sp.emit = Sp.mode === 'chase' ? .06 : .13;
    parts.push({ k: 'v', ang: rnd(0, TAU), rad: 15 + rnd(0, 4), l: .9, L: .9,
                 ch: pick(CODE_CHARS), col: Sp.mode === 'chase' ? '#ff9de0' : '#c9b4ff' });
  }

  Sp.scanT -= edt;
  if (Sp.scanT <= 0) {
    Sp.scanT = Sp.mode === 'chase' ? 1.6 : 2.7;
    spawnPing(Sp.x, Sp.y, Sp.mode === 'chase' ? 28 : Sp.detect,
              Sp.mode === 'chase' ? '#ff3ec8' : '#9d7bff');
    if (G.state === 'playing' && pdist < 160) SFX.scan();
  }

  SFX.setProx(G.state === 'playing' ? clamp(1 - pdist / 95, 0, 1) : 0);
}
function drawSpectre(c) {
  const x = Math.round(Sp.x), y = Math.round(Sp.y);
  const chasing = Sp.mode === 'chase' && (G.state === 'playing' || G.state === 'dying');
  const angry = Sp.blocked > .3;
  const col = chasing ? '#ff3ec8' : '#9d7bff';
  const spin = Sp.spin;

  c.fillStyle = rgba(chasing ? '#ff3ec8' : '#9d7bff', chasing ? .3 : .13);
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU - spin * .25;
    c.fillRect(Math.round(x + Math.cos(a) * Sp.detect), Math.round(y + Math.sin(a) * Sp.detect), 1, 1);
  }

  for (const tr of Sp.trail)
    txt3(c, tr.ch, Math.round(tr.x) - 1, Math.round(tr.y) - 2, tr.col, 1, tr.a * .45);

  const glitch = chasing && Math.random() < .25;
  const jx = glitch ? irnd(-1, 1) : 0, jy = glitch ? irnd(-1, 1) : 0;
  for (let arm = 0; arm < 4; arm++) {
    const base = arm * (TAU / 4);
    c.fillStyle = rgba(col, .55);
    for (let s = 0; s < 12; s++) {                   
      const t = s / 11, r = 14 * (1 - t * .88), a = base + spin * (1 + t * 2.4);
      c.fillRect(Math.round(x + jx + Math.cos(a) * r), Math.round(y + jy + Math.sin(a) * r), 1, 1);
    }
    for (let k = 0; k < 5; k++) {                 
      const t = (k + .5) / 5, r = 14 * (1 - t * .88), a = base + spin * (1 + t * 2.4);
      const ch = CODE_CHARS[(arm * 5 + k * 3 + Math.floor(spin * 2)) % CODE_CHARS.length];
      txt3(c, ch, Math.round(x + jx + Math.cos(a) * r) - 1, Math.round(y + jy + Math.sin(a) * r) - 2,
           k >= 3 ? '#ffffff' : col, 1, .3 + .7 * t);
    }
  }

  const pulse = .5 + .5 * Math.sin(G.rt * (angry ? 14 : chasing ? 9 : 4));
  c.fillStyle = '#04060c';
  c.fillRect(x - 2, y - 4, 5, 9); c.fillRect(x - 4, y - 2, 9, 5);
  c.fillRect(x - 1, y - 5, 3, 11); c.fillRect(x - 5, y - 1, 11, 3);
  c.fillStyle = rgba(angry ? '#ff4b4b' : col, .4 + .5 * pulse);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + spin * 1.4;
    c.fillRect(Math.round(x + Math.cos(a) * 5.5), Math.round(y + Math.sin(a) * 5.5), 1, 1);
  }
  c.fillStyle = (angry || Math.floor(G.rt * (chasing ? 12 : 5)) % 3 === 0)
    ? '#ffffff' : (chasing ? '#ff2b5e' : '#d9ccff');
  c.fillRect(x - 1, y - 1, 3, 3);
  let ex, ey;
  if (G.state === 'playing' || G.state === 'dying') {
    ex = clamp((P.x - Sp.x) / 50, -1, 1); ey = clamp((P.y - Sp.y) / 50, -1, 1);
  } else {
    ex = clamp((mouse.x - Sp.x) / 60, -1, 1); ey = clamp((mouse.y - Sp.y) / 60, -1, 1);
  }
  c.fillStyle = '#04060c';
  c.fillRect(x + Math.round(ex), y + Math.round(ey), 1, 1);
}

function drawSafeZone(c) {
  const x0 = SAFE.x, x1 = SAFE.x + SAFE.w, y1 = SAFE.y + SAFE.h;
  const near = Math.hypot(Sp.x - (x0 + x1) / 2, Sp.y - y1 / 2) < 80;
  const col = near ? '#2ee6ff' : TH.accent;
  const a = near ? .45 + .3 * Math.sin(G.rt * 10) : .16;
  if (near) { c.fillStyle = 'rgba(46,230,255,.05)'; c.fillRect(x0, 0, SAFE.w, y1); }
  c.fillStyle = rgba(col, a);
  for (let x = x0 + 2; x < x1 - 1; x += 4) c.fillRect(x, y1, 2, 1);   
  for (let y = 2; y < y1 - 2; y += 4) { c.fillRect(x0, y, 1, 2); c.fillRect(x1 - 1, y, 1, 2); }
  c.fillStyle = rgba(col, Math.min(1, a + .25));                      
  c.fillRect(x0, y1 - 2, 4, 1); c.fillRect(x0, y1 - 4, 1, 4);
  c.fillRect(x1 - 4, y1 - 2, 4, 1); c.fillRect(x1 - 1, y1 - 4, 1, 4);
  txt3(c, 'SAFE', W / 2 - 8, y1 + 2, rgba(col, near ? .8 : .25));
}

/* --------------------------------------------- 11. JOUEUR */

const P = {
  x: PAD.x, y: PAD.y, vx: 0, facing: 1, invuln: 0, shield: 0, alive: true,
  node: null, harvest: 0, lastTick: -1, lastCorr: { x: 7, y: 2 }, thrustT: 0,
  dir: 'front', idleT: 2, moving: false,
};
function resetPlayer() {
  P.x = PAD.x; P.y = PAD.y; P.vx = 0; P.harvest = 0; P.lastTick = -1;
  P.node = null; P.alive = true; P.lastCorr = { x: 7, y: 2 };
  P.dir = 'front'; P.idleT = 2; P.moving = false;
}

function boxHits(cx, cy, hw, hh, solid) {
  for (let ty = Math.floor((cy - hh) / 16); ty <= Math.floor((cy + hh) / 16); ty++)
    for (let tx = Math.floor((cx - hw) / 16); tx <= Math.floor((cx + hw) / 16); tx++)
      if (solid(tileAt(tx, ty))) return true;
  return false;
}
function slide(e, dx, dy, hw, hh, solid) {
  let s = Math.sign(dx), rem = Math.abs(dx);
  while (rem > 0) {
    const st = Math.min(1, rem), nx = e.x + s * st;
    if (!boxHits(nx, e.y, hw, hh, solid)) { e.x = nx; rem -= st; } else break;
  }
  s = Math.sign(dy); rem = Math.abs(dy);
  while (rem > 0) {
    const st = Math.min(1, rem), ny = e.y + s * st;
    if (!boxHits(e.x, ny, hw, hh, solid)) { e.y = ny; rem -= st; } else break;
  }
}

function updatePlayer(dt) {
  if (!P.alive) return;
  P.invuln = Math.max(0, P.invuln - dt);
  P.shield = Math.max(0, P.shield - dt);
  P.thrustT -= dt;

  const v = inputVec();
  const px = P.x, py = P.y;
  slide(P, v.x * G.stats.speed * dt, v.y * G.stats.speed * dt, 5, 5, solidPlayer);
  P.vx = (P.x - px) / Math.max(dt, .001);
  if (Math.abs(v.x) > .1) P.facing = Math.sign(v.x);

  P.moving = v.m >= .2 && (P.x !== px || P.y !== py);
  if (P.moving)
    P.dir = Math.abs(v.x) >= Math.abs(v.y) ? (v.x > 0 ? 'R' : 'L') : (v.y > 0 ? 'D' : 'U');
  else
    P.dir = 'front';

  SFX.thrust(v.m > .15);
  if (P.moving && P.thrustT <= 0) { P.thrustT = .06; spawnThrust(P.x - v.x * 6, P.y - v.y * 6 + 2, TH.accent); }

  const ptx = Math.floor(P.x / 16), pty = Math.floor(P.y / 16);
  if (tileAt(ptx, pty) === T_CORR) P.lastCorr = { x: ptx, y: pty };

  P.node = null;
  if (v.m < .35)
    for (const n of nodes)
      if (!n.harvested && Math.hypot(P.x - n.x, P.y - n.y) < 14) { P.node = n; break; }
  if (P.node) {
    const dur = G.params.harvest * (P.node.special ? 1.5 : 1);
    P.harvest += dt;
    const st = Math.floor(P.harvest / dur * 3);
    if (st !== P.lastTick && st > 0) { P.lastTick = st; SFX.tick(); }
    if (Math.random() < .35) spawnGlyph(P.node.x + rnd(-6, 6), P.node.y + rnd(-5, 5));
    if (P.harvest >= dur) harvestNode(P.node);
  } else { P.harvest = Math.max(0, P.harvest - dt * 2); P.lastTick = -1; }

  if (G.extractionOpen && Math.hypot(P.x - PAD.x, P.y - PAD.y) < 15) sectorCleared();
}

function harvestNode(n) {
  n.harvested = true;
  n.room.done = !nodes.some(m => m.room === n.room && !m.harvested);
  G.data++;
  if (n.special) {
    addScore(300 * G.sector, n.x, n.y - 10);
    LAB.frags += 15; saveLab();
    popups.push({ x: n.x, y: n.y + 4, t: '+15 FRAG', l: 1.2, col: '#2ee6ff' });
    announce('FRAGMENT SOUVERAIN SÉCURISÉ', '#ffd24a');
    for (const w of worms) if (w.vault && !w.dead) {
      w.dead = true;
      spawnRing(w.ax, w.ay, 12, '#ffd24a');
      for (let i = 0; i < 6; i++) spawnSpark(w.ax + rnd(-6, 6), w.ay + rnd(-4, 4));
    }
  } else {
    addScore(100 * G.sector + 50, n.x, n.y - 10);
    LAB.frags += 6; saveLab();
    popups.push({ x: n.x, y: n.y + 4, t: '+6 FRAG', l: 1, col: '#2ee6ff' });
  }
  SFX.key(); spawnRing(n.x, n.y, n.special ? 26 : 20, '#ffd24a');
  for (let i = 0; i < (n.special ? 16 : 10); i++) spawnGlyph(n.x + rnd(-8, 8), n.y + rnd(-6, 6));
  P.harvest = 0; P.lastTick = -1;
  updateHUDData();
  if (G.data >= G.dataTotal) openExtraction();
}
function openExtraction() {
  G.extractionOpen = true;
  Sp.aggro = 99;                                     
  Sp.detect = Math.min(130, Sp.detect + 18);        
  announce('EXTRACTION OUVERTE', '#ffd24a', 'retournez au dock EXT-01');
  SFX.deliver();
  spawnRing(PAD.x, PAD.y, 26, '#ffd24a');
  spawnPing(PAD.x, PAD.y, 40, '#ffd24a');
}

function drawPlayer(c) {
  if (!P.alive) return;
  const x = Math.round(P.x), y = Math.round(P.y);
  if (P.invuln > 0) {
    c.fillStyle = rgba(TH.accent, .15 + .1 * Math.sin(G.rt * 16));
    c.fillRect(x - 9, y - 7, 18, 14);
    c.globalAlpha = .55 + .25 * Math.sin(G.rt * 16);
  }
  if (P.shield > 0) {                                          
    const s = 10 + (Math.floor(G.rt * 6) % 2);
    c.fillStyle = 'rgba(46,230,255,.08)'; c.fillRect(x - s, y - s, s * 2, s * 2);
    c.fillStyle = 'rgba(46,230,255,.5)';
    [[-s, -s, 3, 1], [-s, -s, 1, 3], [s - 3, -s, 3, 1], [s - 1, -s, 1, 3],
     [-s, s - 1, 3, 1], [-s, s - 3, 1, 3], [s - 3, s - 1, 3, 1], [s - 1, s - 3, 1, 3]]
      .forEach(r => c.fillRect(x + r[0], y + r[1], r[2], r[3]));
  }
  const d = P.dir;
  let vs = 1, bob = 0, flame = false;
  if (d === 'U')      { vs = .84; flame = P.moving; }         
  else if (d === 'D') vs = 1.12;                                 
  else if (!P.moving) bob = Math.round(Math.sin(G.rt * 2.4));   

  renderDroneC(d, vs, flame);
  if (d === 'L' || d === 'R') {
    c.save();
    c.translate(x, y);
    c.rotate(d === 'R' ? DRONE_TILT : -DRONE_TILT);            
    c.drawImage(droneCv, -10, -10);
    c.restore();
  } else {
    c.drawImage(droneCv, x - 10, y - 10 + bob);
  }
  if (P.node && P.harvest > 0) {
    const dur = G.params.harvest * (P.node.special ? 1.5 : 1);
    const w = Math.round(P.harvest / dur * 16);
    c.fillStyle = '#0a1120'; c.fillRect(x - 9, y - 14, 18, 4);
    c.fillStyle = '#ffd24a'; c.fillRect(x - 8, y - 13, Math.min(16, w), 2);
  }
  c.globalAlpha = 1;
}

/* --------------------------------------- 12. BONUS / PARTICULES / ANNONCES */

const PAL_SHIELD = { k:'#062028', c:'#2ee6ff', w:'#eaffff' };
const SPR_SHIELD = [
  '.kkkkkkk.', 'kccccccck', 'kccccwwck', 'kcccwwcck', 'kccwwccck',
  'kcccwwcck', 'kccccwwck', '.kccccck.', '..kcck...', '...kk....',
];
const PAL_CLOCK = { k:'#2a0620', M:'#ff3ec8', w:'#ffe9f6' };
const SPR_CLOCK = [
  '.kkkkkkk.', 'kMMMMMMMk', 'kMMwwMMMk', 'kMMMwMMMk', 'kMMMwwMMk',
  'kMMwMMMMk', 'kMMMMMMMk', 'kMMMMMMMk', '.kkkkkkk.',
];
const BONUS_TYPES = [
  { t: 'SHD', spr: SPR_SHIELD, pal: PAL_SHIELD, col: '#2ee6ff', w: .30 },
  { t: 'SLW', spr: SPR_CLOCK,  pal: PAL_CLOCK,  col: '#ff3ec8', w: .25 },
  { t: 'DAT', spr: SPR_DATA,   pal: PAL_DATA,   col: '#ffd24a', w: .45 },
];
const bonus = { on: false, timer: 8, type: null, c: 0, r: 0, life: 0 };

function updateBonus(edt) {
  if (bonus.on) {
    bonus.life -= edt;
    if (bonus.life <= 0) bonus.on = false;
    return;
  }
  bonus.timer -= edt;
  if (bonus.timer > 0) return;
  if (G.state !== 'playing') { bonus.timer = 3; return; }
  for (let t = 0; t < 10; t++) {                          
    const [tx, ty] = pick(corrTiles);
    if (Math.hypot(tx * 16 + 8 - P.x, ty * 16 + 8 - P.y) > 60) { bonus.c = tx; bonus.r = ty; break; }
  }
  let roll = Math.random(), acc = 0, type = BONUS_TYPES[2];
  for (const b of BONUS_TYPES) { acc += b.w; if (roll <= acc) { type = b; break; } }
  bonus.type = type; bonus.on = true; bonus.life = 7;
  bonus.timer = rnd(11, 17) * G.stats.bonusFreq;
  SFX.spawn();
  spawnRing(bonus.c * 16 + 8, bonus.r * 16 + 8, 14, type.col);
}
function drawBonus(c) {
  if (!bonus.on) return;
  if (bonus.life < 2 && Math.floor(G.wt * 8) % 2) return;  
  const x = bonus.c * 16 + 8, y = bonus.r * 16 + 8 + Math.sin(G.wt * 3) * 1.5;
  const s = 8 + Math.floor(Math.sin(G.wt * 4) * 1.5);
  c.fillStyle = rgba(bonus.type.col, .1); c.fillRect(x - s, y - s, s * 2, s * 2);
  drawSprite(c, bonus.type.spr, bonus.type.pal, Math.round(x - 4), Math.round(y - 5));
}
function pickBonus() {
  SFX.bonus();
  spawnRing(bonus.c * 16 + 8, bonus.r * 16 + 8, 18, bonus.type.col);
  if (bonus.type.t === 'SHD') P.shield = G.stats.shieldDur;
  else if (bonus.type.t === 'SLW') G.slowT = G.stats.slowDur;
  else {
    addScore(500, bonus.c * 16 + 8, bonus.r * 16);
    LAB.frags += 10; saveLab();
    popups.push({ x: bonus.c * 16 + 8, y: bonus.r * 16 - 12, t: '+10 FRAG', l: 1, col: '#2ee6ff' });
  }
  bonus.on = false;
}
const parts = [], popups = [];
function spawnSpark(x, y)   { parts.push({ k: 's', x, y, vx: rnd(-24, 24), vy: rnd(-24, 24), l: rnd(.2, .5), L: .5, col: Math.random() < .5 ? '#fff' : '#ff5a3c' }); }
function spawnDebris(x, y)  { parts.push({ k: 'd', x, y, vx: rnd(-50, 50), vy: rnd(-70, 20), l: rnd(.5, 1), L: 1, col: Math.random() < .6 ? '#22c9ea' : '#0d3a4e' }); }
function spawnThrust(x, y, col) { parts.push({ k: 's', x, y, vx: rnd(-8, 8), vy: rnd(-8, 8), l: .25, L: .25, col }); }
function spawnGlyph(x, y)   { parts.push({ k: 'g', x, y, vx: rnd(-4, 4), vy: rnd(-26, -14), l: rnd(.5, 1), L: 1, col: '#ffd24a', ch: pick('01KXZ#<>+'.split('')) }); }
function spawnRing(x, y, max, col) { parts.push({ k: 'r', x, y, l: .45, L: .45, max, col }); }
function spawnPing(x, y, max, col) { parts.push({ k: 'p', x, y, l: .55, L: .55, max, col }); }

function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.l -= dt;
    if (p.l <= 0) { parts.splice(i, 1); continue; }
    if (p.k === 'v') {                       
      p.ang += 7.5 * dt; p.rad -= 52 * dt;
      if (p.rad <= 1.5) { parts.splice(i, 1); continue; }
      p.x = Sp.x + Math.cos(p.ang) * p.rad;
      p.y = Sp.y + Math.sin(p.ang) * p.rad;
      continue;
    }
    if (p.k !== 'r' && p.k !== 'p') {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'd') p.vy += 130 * dt;
    }
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].y -= 12 * dt; popups[i].l -= dt;
    if (popups[i].l <= 0) popups.splice(i, 1);
  }
}
function drawParts(c) {
  for (const p of parts) {
    const a = p.l / p.L;
    if (p.k === 'r') {
      const s = Math.round(p.max * (1 - a));
      c.strokeStyle = rgba(p.col, a); c.lineWidth = 1;
      c.strokeRect(Math.round(p.x - s) + .5, Math.round(p.y - s) + .5, s * 2, s * 2);
    } else if (p.k === 'p') {                     
      const s = p.max * (1 - a);
      c.fillStyle = rgba(p.col, a);
      for (let i = 0; i < 14; i++) {
        const ang = i / 14 * TAU;
        c.fillRect(Math.round(p.x + Math.cos(ang) * s), Math.round(p.y + Math.sin(ang) * s), 1, 1);
      }
    } else if (p.k === 'g' || p.k === 'v') {
      txt3(c, p.ch, Math.round(p.x), Math.round(p.y), p.col, 1, a);
    } else {
      c.globalAlpha = a; c.fillStyle = p.col;
      const s = p.k === 'd' ? 2 : 1;
      c.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      c.globalAlpha = 1;
    }
  }
  for (const q of popups)
    txt3(c, q.t, Math.round(q.x - q.t.length * 2), Math.round(q.y), q.col || '#ffd24a', 1, Math.min(1, q.l));
}
function addScore(n, x, y) {
  G.score += n;
  if (x !== undefined) popups.push({ x, y, t: '+' + n, l: .9 });
}

let ann = null;
function announce(t, col, sub) { ann = { t, col, sub, l: 2.4, L: 2.4 }; }
function drawAnnounce(c) {
  if (!ann) return;
  const age = ann.L - ann.l;
  const alpha = Math.min(1, age / .15, ann.l / .5);
  const w = ann.t.length * 8;
  const x = Math.round((W - w) / 2);
  c.fillStyle = 'rgba(3,6,10,.72)';
  c.fillRect(x - 5, 38, w + 10, ann.sub ? 26 : 16);
  c.fillStyle = ann.col;
  c.fillRect(x - 5, 38, w + 10, 1);
  c.fillRect(x - 5, ann.sub ? 63 : 53, w + 10, 1);
  txt3(c, ann.t, x, 42, ann.col, 2, Math.max(0, alpha));
  if (ann.sub) txt3(c, ann.sub, Math.round((W - ann.sub.length * 4) / 2), 54, '#9fb4c8', 1, Math.max(0, alpha));
}

/* --------------------------------------------- 13. MONDE : UPDATE + COLLISIONS */

const G = {
  state: 'title', score: 0, best: 0, bestSector: 0, lives: 3, sector: 1,
  data: 0, dataTotal: 0, extractionOpen: false, params: sectorParams(1),
  stats: labStats(),
  slowT: 0, shake: 0, alertT: 0, flash: 0, clearT: 0,
  deathT: 0, deathDur: 1, deathCause: '', deathPos: { x: 0, y: 0 },
  wt: 0, rt: 0,
};

function updateWorld(edt) {
  for (const d of drones) d.update(edt);
  separation(edt);
  for (const w of worms) w.update(edt);
  updateSpectre(edt);
  updateBonus(edt);
  updateRain(edt);
  updateStreams(edt);
}

function checkCollisions() {
  if (G.state !== 'playing' || !P.alive) return;
  const safe = P.invuln > 0;
  /* drones gardiens */
  for (const d of drones) {
    if (d.stun > 0) continue;
    if (Math.abs(d.x - P.x) < 8 && Math.abs(d.y - P.y) < 7) {
      if (P.shield > 0) {                        // le bouclier sonne le drone
        const nx = d.x + Math.sign(d.x - P.x || 1) * 18;
        if (tileAt(Math.floor(nx / 16), Math.floor(d.y / 16)) === T_CORR) d.x = nx;
        d.stun = 1.3; SFX.shield();
        for (let i = 0; i < 4; i++) spawnSpark(d.x, d.y);
      } else if (!safe) { hitPlayer('drone'); return; }
    }
  }

  if (!safe && P.shield <= 0)
    for (const w of worms) {
      if (w.dead) continue;
      for (let i = 0; i < w.cells.length; i++) {
        if (!w.danger(i)) continue;
        const cl = w.cells[i];
        if (Math.abs(P.x - (cl.x * 16 + 8)) < 9.5 && Math.abs(P.y - (cl.y * 16 + 8)) < 9.5) {
          hitPlayer('worm'); return;
        }
      }
    }
  if (!inSafe(P.x, P.y) && Math.hypot(Sp.x - P.x, Sp.y - P.y) < 10) {
    if (P.shield > 0) {
      if (Sp.cool <= 0) { Sp.cool = .9; SFX.shield(); spawnRing(P.x, P.y, 12, '#2ee6ff');
        for (let i = 0; i < 4; i++) spawnSpark(P.x, P.y); }
    } else if (!safe) { hitPlayer('spectre'); return; }
  }
  /* bonus */
  if (bonus.on) {
    const bx = bonus.c * 16 + 8, by = bonus.r * 16 + 8 + Math.sin(G.wt * 3) * 1.5;
    if (Math.hypot(P.x - bx, P.y - by) < G.stats.pickup) pickBonus();
  }
}

function hitPlayer(cause) {
  if (G.state !== 'playing' || !P.alive) return;
  G.lives--; G.shake = 8; G.alertT = 1; G.flash = .45;
  P.harvest = 0; P.lastTick = -1; P.node = null;
  SFX.thrust(false);
  if (cause === 'spectre') { SFX.assimilate(); Sp.rage = 1; }
  else { SFX.hit(); for (let i = 0; i < 12; i++) spawnDebris(P.x, P.y); }
  updateHUDLives();
  if (G.lives <= 0) {                            
    P.alive = false; G.state = 'dying';
    G.deathCause = cause; G.deathPos = { x: P.x, y: P.y };
    G.deathT = G.deathDur = (cause === 'spectre' ? 1.35 : 1.15);
    if (cause === 'spectre') for (let i = 0; i < 16; i++) spawnGlyph(P.x + rnd(-6, 6), P.y + rnd(-6, 6));
    else { G.shake = 10; for (let i = 0; i < 26; i++) spawnDebris(P.x, P.y); }
  } else {                                       
    P.invuln = 3; P.dir = 'front'; P.moving = false;
    if (cause === 'spectre') Sp.cool = 1.2;       
    for (const d of drones) { d.chaseT = 0; d.path = null; d.repath = 0;
                              d.scanT = 0; d.crowdT = 0; d.wasChase = false; }
    spawnRing(P.x, P.y, 16, TH.accent);
  }
}

function drawDyingPlayer(c) {
  if (G.deathCause === 'drone') return;              
  const k = 1 - G.deathT / G.deathDur;
  const x = lerp(G.deathPos.x, Sp.x, k * k), y = lerp(G.deathPos.y, Sp.y, k * k);
  const alpha = 1 - k;
  for (let r = 0; r < SPR_DRONE.length; r++) {
    if (((r + Math.floor(G.rt * 24)) % 3) === 0) continue;   
    c.globalAlpha = alpha;
    for (let i = 0; i < 14; i++) {
      const col = PAL_DRONE[SPR_DRONE[r][i]];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(Math.round(x) - 7 + i, Math.round(y) - 5 + r, 1, 1);
    }
  }
  c.globalAlpha = 1;
}

/* --------------------------------------------- 14. HUD & OVERLAYS */

const HUDC = { score: '', best: '', sector: '', name: '' };
function updateHUDScore() {
  const s = pad6(G.score);
  if (s !== HUDC.score) { HUDC.score = s; $('h-score').textContent = s; }
  const b = pad6(G.best);
  if (b !== HUDC.best) { HUDC.best = b; $('h-best').textContent = b; }
}
function updateHUDLives() {
  const el = $('h-lives'); el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('i');
    if (i < G.lives) b.className = 'on';
    el.appendChild(b);
  }
}
function updateHUDData() {
  const el = $('h-keys'); el.innerHTML = '';
  for (let i = 0; i < G.dataTotal; i++) {
    const k = document.createElement('i');
    if (i < G.data) k.className = 'on';
    el.appendChild(k);
  }
}
function updateHUDSector() {
  const tag = pad2(G.sector);
  if (tag !== HUDC.sector) { HUDC.sector = tag; $('h-sector').textContent = tag; }
  const nm = sectorName(G.sector);
  if (nm !== HUDC.name) { HUDC.name = nm; $('h-secname').textContent = nm; }
}
function updateHUDFx() {
  const sh = $('chip-shield'), sl = $('chip-slow');
  sh.classList.toggle('on', P.shield > 0);
  sl.classList.toggle('on', G.slowT > 0);
  if (P.shield > 0) sh.querySelector('i').innerHTML = `<b style="width:${P.shield / G.stats.shieldDur * 100}%"></b>`;
  if (G.slowT > 0) sl.querySelector('i').innerHTML = `<b style="width:${G.slowT / G.stats.slowDur * 100}%"></b>`;
}
function updateHUD() { updateHUDScore(); updateHUDSector(); updateHUDFx(); }

function setTheme(sector) {
  const idx = sector <= 5 ? sector - 1 : (sector % 2 === 0 ? 4 : 3);
  TH = THEMES[idx];
  document.documentElement.style.setProperty('--accent', TH.accent);
}
function sectorName(s) {
  if (s <= 5) return THEMES[s - 1].name;
  return 'ZÉRO JOUR +' + (s - 5);
}
function show(id, on) { $(id).classList.toggle('show', on); }

function drawOverIcon(cause) {
  const ic = $('over-icon'), c = ic.getContext('2d');
  ic.width = 16; ic.height = 16; c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 16, 16);
  if (cause === 'spectre') {
    for (let arm = 0; arm < 3; arm++) for (let k = 0; k < 4; k++) {
      const r = 7 - k * 1.7, a = arm * (TAU / 3) + k * 1.15;
      txt3(c, CODE_CHARS[(arm * 4 + k) % CODE_CHARS.length],
        Math.round(8 + Math.cos(a) * r) - 1, Math.round(8 + Math.sin(a) * r) - 2,
        k >= 2 ? '#ffffff' : '#ff3ec8', 1);
    }
    c.fillStyle = '#04060c'; c.fillRect(6, 6, 5, 5);
    c.fillStyle = '#ff2b5e'; c.fillRect(7, 7, 3, 3);
  } else if (cause === 'worm') {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i % 2 ? '#221536' : '#3a2456';
      c.fillRect(2 + i * 2, 8 - Math.round(Math.sin(i) * 2), 3, 3);
    }
    c.fillStyle = '#221536'; c.fillRect(12, 5, 4, 4);
    c.fillStyle = '#ff5a3c'; c.fillRect(13, 6, 2, 2);
  } else drawSprite(c, SPR_HUNT_A, PAL_HUNT, 1, 3);
}

const BOOT = [
  'KRN-SHELL v4.1 — terminal d\u2019intrusion',
  'liaison chiffrée X-25519 ........ OK',
  'cible : DATACENTER ORPHÉE-9',
  'unité embarquée : WISP-4 [drone]',
  'défenses : drones RX-3 // vers // TOURBILLON',
  'briefing disponible — touche [T]',
  'injection du protocole ........ OK',
];
function runTypewriter() {
  const el = $('boot-lines');
  let li = 0, ci = 0, done = false;
  const caret = document.createElement('span'); caret.className = 'caret';
  let lineEl = null;                               // référence explicite à la ligne courante
  const finish = () => { $('title-ui').classList.add('on'); $('title-block').classList.add('on'); };
  const iv = setInterval(() => {
    if (li >= BOOT.length) { clearInterval(iv); caret.remove(); done = true; finish(); return; }
    const line = BOOT[li];
    if (ci === 0) { lineEl = document.createElement('div'); lineEl.textContent = '> '; el.appendChild(lineEl); }
    if (ci < line.length) {
      ci++;
      lineEl.textContent = '> ' + line.slice(0, ci);
      lineEl.appendChild(caret);                
    } else { li++; ci = 0; }
  }, 13);
  const skip = () => {
    if (done) return;
    done = true; clearInterval(iv); caret.remove();
    el.innerHTML = BOOT.map(l => '<div>&gt; ' + l + '</div>').join('');
    finish();
  };
  window.addEventListener('keydown', skip, { once: true });
  window.addEventListener('pointerdown', skip, { once: true });
}

const TUTO_SLIDES = [
  { title: 'MISSION',
    body: 'Infiltrez le datacenter <b>ORPHÉE-9</b>. Les fragments de données se cachent dans les <b>salles serveurs</b> — récoltez-les tous, puis regagnez le <b>dock d\u2019extraction</b> en haut pour valider le secteur.',
    draw(c) {
      drawSprite(c, SPR_FRAG, PAL_FRAG, 28, 18);
      const p = .5 + .5 * Math.sin(G.rt * 4);
      c.fillStyle = rgba('#ffd24a', .3 + .4 * p);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + G.rt;
        c.fillRect(Math.round(31.5 + Math.cos(a) * 12), Math.round(21.5 + Math.sin(a) * 9), 1, 1);
      }
      txt3(c, 'FRAG', 26, 34, '#ffd24a');
    } },
  { title: 'CONTRÔLES',
    body: 'Déplacez WISP-4 avec les <b>flèches</b> ou <b>ZQSD</b>. Sur mobile : glissez le doigt sur l\u2019écran. <b>P</b> — pause · <b>M</b> — son. Restez <b>immobile</b> près d\u2019un fragment pour le hacker.',
    draw(c) {
      drawSprite(c, SPR_DRONE, PAL_DRONE, 25, 19);
      tri(c, 12, 24, 2, TH.accent, .8); tri(c, 52, 24, 3, TH.accent, .8);
      tri(c, 32, 8, 1, TH.accent, .8);  tri(c, 32, 40, 0, TH.accent, .8);
    } },
  { title: 'DRONES GARDIENS',
    body: 'Rapides et agressifs, mais <b>confinés aux couloirs</b> : ils ne franchissent jamais une porte. Les <b>salles serveurs</b> sont vos zones d\u2019abri contre eux.',
    draw(c) {
      drawSprite(c, SPR_HUNT_A, PAL_HUNT, 25, 17);
      txt3(c, 'COULOIRS SEULEMENT', 8, 30, '#ff7b8a');
      hazard(c, 8, 36, 48, 4);
    } },
  { title: 'TOURBILLON DE CODE',
    body: 'Il traverse <b>murs, salles et couloirs</b> — nulle part n\u2019est à l\u2019abri… sauf le <b>dock</b> : son champ de containment lui est interdit. Lent, mais entrez dans son <b>rayon de scan</b> et il vous traque sans relâche.',
    draw(c) {
      const cx = 32, cy = 22;
      for (let arm = 0; arm < 3; arm++) for (let k = 0; k < 5; k++) {
        const r = 14 - k * 2.6, a = arm * (TAU / 3) + k * 1.1 + G.rt * 1.2;
        txt3(c, CODE_CHARS[(arm * 5 + k) % CODE_CHARS.length],
          Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 2,
          k >= 3 ? '#ffffff' : '#ff3ec8', 1);
      }
      c.fillStyle = '#04060c'; c.fillRect(29, 19, 7, 7);
      c.fillStyle = '#ff2b5e'; c.fillRect(31, 21, 3, 3);
    } },
  { title: 'VERS DE MAINTENANCE',
    body: 'Des vers surgissent des <b>façades des baies</b> : une <b>LED orange</b> clignote avant chaque sortie. Dans certains secteurs, deux <b>longs vers</b> gardent le <b>FRAGMENT SOUVERAIN</b> au sud — attendez leur rétractation.',
    draw(c) {
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? '#221536' : '#3a2456';
        c.fillRect(8 + i * 6, 30 - i * 3, 5, 5);
      }
      c.fillStyle = '#221536'; c.fillRect(38, 12, 7, 7);
      c.fillStyle = '#4a2f6e'; c.fillRect(39, 13, 5, 5);
      c.fillStyle = '#eaffff'; c.fillRect(40, 14, 1, 1); c.fillRect(43, 14, 1, 1);
      c.fillStyle = '#ff5a3c'; c.fillRect(41, 16, 2, 2);
      c.fillStyle = Math.floor(G.rt * 4) % 2 ? '#ffb02e' : '#ff4b4b';
      c.fillRect(9, 33, 2, 2);
    } },
  { title: 'EXTRACTION & LABO',
    body: 'Fragments récoltés → le dock <b>s\u2019active</b> : flèches dorées, retour obligatoire. Les <b>FRAG</b> gagnés financent le <b>laboratoire</b> : vitesse, bouclier, rayon de ramassage… Améliorez entre deux runs.',
    draw(c) {
      const ph = (G.rt * 10) % 12;
      for (let i = 0; i < 3; i++) {
        const y = 34 - i * 9 - ph;
        if (y > 6) tri(c, 32, Math.round(y), 1, '#ffd24a', .8 - i * .2);
      }
      c.fillStyle = '#1a2434'; c.fillRect(18, 38, 28, 4);
      txt3(c, 'EXT-01', 22, 30, '#ffd24a');
      txt3(c, '+FRAG', 40, 12, '#2ee6ff');
    } },
];
const TUTO = { open: false, i: 0 };
function drawTutoSlide() {
  const cvt = $('tuto-cv'); if (!cvt) return;
  const c = cvt.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 64, 48);
  TUTO_SLIDES[TUTO.i].draw(c);
}
function renderTuto() {
  $('tuto-step').textContent = (TUTO.i + 1) + '/' + TUTO_SLIDES.length;
  $('tuto-title').textContent = TUTO_SLIDES[TUTO.i].title;
  $('tuto-body').innerHTML = TUTO_SLIDES[TUTO.i].body;
  $('tuto-next').textContent = TUTO.i >= TUTO_SLIDES.length - 1 ? 'TERMINÉ' : 'SUIVANT';
  const dots = $('tuto-dots'); dots.innerHTML = '';
  TUTO_SLIDES.forEach((_, k) => {
    const d = document.createElement('i');
    if (k === TUTO.i) d.className = 'on';
    dots.appendChild(d);
  });
  drawTutoSlide();
}
function openTuto() {
  TUTO.open = true; TUTO.i = 0;
  show('ov-title', false); show('ov-tuto', true);
  renderTuto(); SFX.ui();
}
function tutoNext() {
  TUTO.i++;
  if (TUTO.i >= TUTO_SLIDES.length) { closeTuto(); return; }
  renderTuto(); SFX.tick();
}
function tutoPrev() {
  if (TUTO.i > 0) { TUTO.i--; renderTuto(); }
}
function closeTuto() {
  TUTO.open = false;
  show('ov-tuto', false); show('ov-title', true);
  SFX.ui();
}

function saveLab() {
  try {
    localStorage.setItem('kraken.frags', LAB.frags);
    localStorage.setItem('kraken.upgrades', JSON.stringify(LAB.lv));
  } catch (e) {}
}
function loadLab() {
  try {
    LAB.frags = parseInt(localStorage.getItem('kraken.frags')) || 0;
    LAB.lv = JSON.parse(localStorage.getItem('kraken.upgrades') || '{}');
    if (!LAB.lv || typeof LAB.lv !== 'object') LAB.lv = {};
    for (const u of UPGRADES) {                       
      const v = LAB.lv[u.id];
      if (typeof v !== 'number' || v < 0) delete LAB.lv[u.id];
      else if (v > u.max) LAB.lv[u.id] = u.max;
    }
  } catch (e) { LAB.lv = {}; }
}
let labReturn = 'ov-title';                            
function renderLab() {
  $('lab-frags').textContent = LAB.frags;
  $('title-frags').textContent = LAB.frags;
  $('over-frags').textContent = LAB.frags;
  const el = $('lab-list'); el.innerHTML = '';
  for (const u of UPGRADES) {
    const lv = LAB.lv[u.id] || 0, maxed = lv >= u.max;
    const cost = maxed ? 0 : u.cost[lv];
    const can = !maxed && LAB.frags >= cost;
    const row = document.createElement('div');
    row.className = 'lab-row' + (maxed ? ' max' : can ? '' : ' locked');
    let pips = '';
    for (let i = 0; i < u.max; i++) pips += `<i${i < lv ? ' class="on"' : ''}></i>`;
    row.innerHTML =
      `<div class="lr-main">
         <div class="lr-name"><span>${u.name}</span><span class="lr-pips">${pips}</span></div>
         <div class="lr-desc">${u.desc}</div>
       </div>
       <button class="lr-buy" tabindex="-1">${maxed ? 'MAX' : cost + ' FR'}</button>`;
    if (!maxed) row.addEventListener('click', () => buyUpgrade(u.id));
    el.appendChild(row);
  }
}
function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id), lv = LAB.lv[id] || 0;
  if (lv >= u.max) return;
  const cost = u.cost[lv];
  if (LAB.frags < cost) { SFX.ui(); return; }
  LAB.frags -= cost; LAB.lv[id] = lv + 1;
  saveLab(); renderLab(); SFX.bonus();
}
function openLab(fromId) {
  labReturn = fromId;
  show(fromId, false); show('ov-lab', true);
  renderLab(); SFX.ui();
}
function closeLab() {
  show('ov-lab', false); show(labReturn, true);
  SFX.ui();
}

const OPT = { open: false, pausedUs: false, sfx: .8, mus: .8 };

function openOptions() {
  if (G.state === 'clear' || G.state === 'dying') return;      
  if ($('ov-lab').classList.contains('show')) return;
  OPT.pausedUs = (G.state === 'playing' || G.state === 'paused');
  if (G.state === 'playing') G.state = 'paused';             
  show('ov-pause', false);
  $('opt-resume').textContent = OPT.pausedUs ? 'REPRENDRE [ÉCHAP]' : 'FERMER [ÉCHAP]';
  $('opt-home').style.display = OPT.pausedUs ? '' : 'none';
  OPT.open = true;
  show('ov-options', true);
  SFX.ui();
}
function closeOptions() {
  show('ov-options', false);
  OPT.open = false;
  if (OPT.pausedUs && G.state === 'paused') G.state = 'playing';
  OPT.pausedUs = false;
  SFX.ui();
}
function syncTitleCounters(){
  const rd = k => parseInt(localStorage.getItem(k) || '0', 10) || 0;
  $('title-frags').textContent = rd('kraken.frags');
  $('title-best').textContent = rd('kraken.best');
  $('title-max').textContent  = rd('kraken.maxsector') > 0 ? pad2(rd('kraken.maxsector')) : '—';
}
(function(){
  const ovTitle = document.getElementById('ov-title')
               || document.querySelector('.ov-title');
  if (!ovTitle) return;
  new MutationObserver(function(){
    if (ovTitle.classList.contains('show')) syncTitleCounters();
  }).observe(ovTitle, { attributes:true, attributeFilter:['class'] });
})();
function quitToTitle() {
  syncTitleCounters();
  show('ov-options', false); show('ov-pause', false); show('ov-over', false); show('ov-clear', false);
  show('ov-tuto', false); TUTO.open = false;
  OPT.open = false; OPT.pausedUs = false;
  G.state = 'title'; G.slowT = 0; ann = null;
  SFX.setProx(0); SFX.thrust(false); SFX.hum(.6);
  resetPlayer();
  const cn = pick(CORNERS);
  Sp.x = cn[0]; Sp.y = cn[1]; Sp.mode = 'wander'; Sp.aggro = 0; Sp.trail = [];
  for (const d of drones) { d.chaseT = 0; d.path = null; d.scanT = 0; d.crowdT = 0; }
  $('title-frags').textContent = LAB.frags;
  show('ov-title', true);
  SFX.ui();
}
function initOptions() {
  const ld = (k, d) => { try { const v = parseFloat(localStorage.getItem(k)); return isNaN(v) ? d : v; } catch (e) { return d; } };
  OPT.sfx = ld('kraken.sfxvol', .8); OPT.mus = ld('kraken.musvol', .8);
  $('opt-sfx').value = Math.round(OPT.sfx * 100);
  $('opt-sfx-v').textContent = Math.round(OPT.sfx * 100);
  $('opt-mus').value = Math.round(OPT.mus * 100);
  $('opt-mus-v').textContent = Math.round(OPT.mus * 100);
  SFX.setVol(OPT.sfx, OPT.mus);
}

/* --------------------------------------- 15. ÉTATS, BOUCLE, ÉVÉNEMENTS */

function saveRecords() {
  try {
    localStorage.setItem('kraken.best', G.best);
    localStorage.setItem('kraken.maxsector', G.bestSector);
  } catch (e) {}
}
function loadRecords() {
  try {
    G.best = parseInt(localStorage.getItem('kraken.best')) || 0;
    G.bestSector = parseInt(localStorage.getItem('kraken.maxsector')) || 0;
  } catch (e) {}
  $('title-best').textContent = G.best;
  $('title-max').textContent = G.bestSector > 0 ? pad2(G.bestSector) : '—';
}

function newGame() {
  G.stats = labStats();
  G.score = 0; G.lives = G.stats.lives; G.slowT = 0; G.shake = 0; G.alertT = 0; G.flash = 0;
  startSector(1);
  ['ov-title', 'ov-clear', 'ov-over', 'ov-pause'].forEach(id => show(id, false));
  G.state = 'playing';
  SFX.hum(1); SFX.ui();
  updateHUDLives(); updateHUDData(); updateHUDScore();
}
function startSector(s) {
  G.sector = s; G.params = sectorParams(s);
  G.params.harvest *= G.stats.harvestMul;        
  setTheme(s); genMap(s); buildBg(s); buildRain();
  G.dataTotal = nodes.length; G.data = 0; G.extractionOpen = false;
  spawnDrones(G.params.drones);
  const cn = pick(CORNERS);              
  Sp.x = cn[0]; Sp.y = cn[1];
  Sp.mode = 'wander'; Sp.aggro = 0;
  Sp.detect = G.params.spectreDetect * G.stats.detectMul;  
  Sp.trail = []; Sp.cool = 0; Sp.rage = 0; Sp.scanT = 2;
  Sp.spin = rnd(0, TAU); Sp.blocked = 0; Sp.safeCamp = 0; Sp.emit = 0;
  Sp.wtx = rnd(30, W - 30); Sp.wty = rnd(60, 280);
  resetPlayer(); P.invuln = 2;
  spawnRing(PAD.x, PAD.y, 15, TH.accent);   
  SFX.boot();
  bonus.on = false; bonus.timer = 7;
  parts.length = 0; popups.length = 0;
  updateHUDData(); updateHUDSector();
  announce(s === 1 ? 'TOURBILLON DE CODE DÉTECTÉ' : 'LE TOURBILLON RÔDE ENCORE',
           '#ff3ec8',
           G.params.special ? 'coffre-fort au sud : fragment souverain gardé par les vers'
                            : 'restez hors de son rayon de scan — le dock reste une zone safe');
  SFX.spectreSpawn();
  spawnPing(Sp.x, Sp.y, 30, '#ff3ec8');
}
function sectorCleared() {
  G.state = 'clear'; G.clearT = 3.4;
  G.score += 300 * G.sector;                      
  G.bestSector = Math.max(G.bestSector, G.sector);
  LAB.frags += 20; saveLab();
  saveRecords();
  SFX.levelup(); SFX.hum(.4); SFX.setProx(0); SFX.thrust(false);
  $('clear-head').textContent = `SECTEUR ${pad2(G.sector)} — SÉCURISÉ`;
  $('clear-stats').innerHTML =
    `données extraites : ${G.data}/${G.dataTotal}<br>fragments : +20 <span style="color:#2ee6ff">(total ${LAB.frags})</span><br>score : ${pad6(G.score)}<br>intégrité WISP-4 : ${'▮'.repeat(G.lives) || '—'}`;
  const n = G.sector + 1;
  $('clear-next').textContent = `SECTEUR ${pad2(n)} — ${sectorName(n)}`;
  $('clear-desc').textContent = NEXT_INTRO[n] || 'les défenses s\u2019adaptent.';
  show('ov-clear', true);
}
function nextSector() {
  show('ov-clear', false);
  G.lives = Math.min(5, G.lives + 1);           
  updateHUDLives();
  startSector(G.sector + 1);
  G.state = 'playing'; SFX.hum(1);
}
function gameOver(cause) {
  G.state = 'over';
  const rec = G.score > G.best;
  if (rec) G.best = G.score;
  saveRecords();
  const ov = $('ov-over');
  ov.classList.remove('by-drone', 'by-spectre');
  if (cause === 'spectre') {
    ov.classList.add('by-spectre');
    $('over-title').textContent = 'ASSIMILÉ';
    $('over-sub').textContent = 'le tourbillon de code a décompilé le signal de WISP-4';
    $('over-flavor').textContent = 'aucun mur ne retient le spectre. vos routines tournent désormais dans le réseau.';
  } else if (cause === 'worm') {
    ov.classList.add('by-drone');
    $('over-title').textContent = 'DÉVORÉ';
    $('over-sub').textContent = 'un ver de maintenance a décompacté WISP-4';
    $('over-flavor').textContent = 'les vers sortent en cycles télégraphiés — surveillez la LED de leur écoutille.';
  } else {
    ov.classList.add('by-drone');
    $('over-title').textContent = 'SIGNAL PERDU';
    $('over-sub').textContent = 'un drone gardien RX-3 a neutralisé WISP-4';
    $('over-flavor').textContent = 'les drones ne quittent jamais les couloirs. vous y avez traîné trop longtemps.';
  }
  drawOverIcon(cause);
  $('over-score').textContent = pad6(G.score);
  $('over-best').textContent = pad6(G.best);
  $('over-frags').textContent = LAB.frags;
  $('over-new').hidden = !rec;
  show('ov-over', true);
  SFX.setProx(0); SFX.hum(.25); SFX.over();
}
function togglePause() {
  if (OPT.open) { closeOptions(); return; }
  if (G.state === 'playing') { G.state = 'paused'; show('ov-pause', true); SFX.thrust(false); }
  else if (G.state === 'paused') { G.state = 'playing'; show('ov-pause', false); }
}
function toggleSound() {
  SFX.ensure();
  SFX.setMuted(!SFX.muted);
  const b = $('btn-sound'); if (b) b.classList.toggle('muted', SFX.muted);
  try { localStorage.setItem('kraken.muted', SFX.muted ? '1' : ''); } catch (e) {}
}
function actionKey() {
  if ($('ov-lab').classList.contains('show') || OPT.open) return;   
  if (G.state === 'title') newGame();
  else if (G.state === 'clear') G.clearT = 0;
  else if (G.state === 'over') newGame();
  else if (G.state === 'paused') togglePause();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.shake > 0)
    ctx.translate(Math.round(rnd(-1, 1) * G.shake), Math.round(rnd(-1, 1) * G.shake));
  ctx.drawImage(bgC, 0, 0);
  drawRain(ctx); drawStreams(ctx); drawLeds(ctx);
  drawDoors(ctx); drawNodes(ctx); drawExtraction(ctx); drawSafeZone(ctx); drawWorms(ctx);
  drawBonus(ctx); drawDrones(ctx); drawSpectre(ctx);
  if (P.alive) drawPlayer(ctx);
  else if (G.state === 'dying') drawDyingPlayer(ctx);
  drawParts(ctx); drawAnnounce(ctx);
  if (joy.active && G.state === 'playing') {       
    ctx.fillStyle = rgba(TH.accent, .4);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      ctx.fillRect(Math.round(joy.ox + Math.cos(a) * 12), Math.round(joy.oy + Math.sin(a) * 12), 1, 1);
    }
    ctx.fillStyle = rgba(TH.accent, .7);
    ctx.fillRect(Math.round(joy.cx) - 1, Math.round(joy.cy) - 1, 3, 3);
  }
  const sy = Math.floor(G.wt * 11) % (H + 20) - 10;      
  ctx.fillStyle = rgba(TH.accent, .06); ctx.fillRect(0, sy, W, 1);
  ctx.fillStyle = rgba(TH.accent, .03); ctx.fillRect(0, sy - 2, W, 2);
  if (G.alertT > 0) {                                    
    ctx.fillStyle = rgba('#ff4b4b', .35 * G.alertT);
    ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3);
    ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
  }
  if (G.slowT > 0) { ctx.fillStyle = 'rgba(46,150,255,.05)'; ctx.fillRect(0, 0, W, H); }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${.3 * G.flash})`; ctx.fillRect(0, 0, W, H); }
}

let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = clamp((ts - last) / 1000, 0, .05); last = ts;
  G.rt += dt;
  document.body.classList.toggle('ingame',
    G.state === 'playing' || G.state === 'paused' || G.state === 'dying' || G.state === 'clear');
  document.body.classList.toggle('on-title', G.state === 'title');
  let edt = dt * (G.slowT > 0 ? .4 : 1);        
  if (G.state === 'dying') edt *= .5;

  if (G.state !== 'paused' && ann) { ann.l -= dt; if (ann.l <= 0) ann = null; }

  switch (G.state) {
    case 'title': case 'over':
      G.wt += edt; updateWorld(edt); updateParts(dt);
      break;
    case 'playing':
      G.wt += edt; G.slowT = Math.max(0, G.slowT - dt);
      updatePlayer(dt); updateWorld(edt); checkCollisions(); updateParts(dt);
      break;
    case 'dying':
      G.wt += edt; updateWorld(edt);
      if (G.deathCause === 'spectre' && Math.random() < .6) {  
        const k = 1 - G.deathT / G.deathDur;
        const sx = lerp(G.deathPos.x, Sp.x, Math.random()), sy2 = lerp(G.deathPos.y, Sp.y, Math.random());
        const ddx = Sp.x - sx, ddy = Sp.y - sy2, dd = Math.hypot(ddx, ddy) || 1;
        parts.push({ k: 'g', x: sx, y: sy2, vx: ddx / dd * rnd(70, 130), vy: ddy / dd * rnd(70, 130),
                     l: .35, L: .35, col: '#ffd24a', ch: pick('01KXZ#<>+'.split('')) });
        void k;
      }
      updateParts(dt);
      G.deathT -= dt;
      if (G.deathT <= 0) gameOver(G.deathCause);
      break;
    case 'clear':
      G.wt += dt; updateParts(dt);
      G.clearT -= dt;
      $('clear-bar').style.width = ((1 - G.clearT / 3.4) * 100) + '%';
      if (G.clearT <= 0) nextSector();
      break;
    case 'paused':
      break;
  }
  G.shake = Math.max(0, G.shake - dt * 14);
  G.alertT = Math.max(0, G.alertT - dt * 1.6);
  G.flash = Math.max(0, G.flash - dt * 1.8);
  if (G.state === 'playing') updateHUD();
  if (TUTO.open) drawTutoSlide();           
  render();
}

function bindUI() {
  $('btn-start').addEventListener('click', e => { SFX.ensure(); newGame(); e.currentTarget.blur(); });
  $('btn-retry').addEventListener('click', e => { SFX.ensure(); newGame(); e.currentTarget.blur(); });
  $('btn-resume').addEventListener('click', e => { togglePause(); e.currentTarget.blur(); });
  $('btn-pause').addEventListener('click', e => { togglePause(); e.currentTarget.blur(); });
  $('btn-opt').addEventListener('click', e => { SFX.ensure(); openOptions(); e.currentTarget.blur(); });
  $('opt-resume').addEventListener('click', e => { closeOptions(); e.currentTarget.blur(); });
  $('opt-home').addEventListener('click', e => { quitToTitle(); e.currentTarget.blur(); });
  $('opt-sfx').addEventListener('input', e => {
    OPT.sfx = e.target.value / 100;
    $('opt-sfx-v').textContent = e.target.value;
    SFX.ensure(); SFX.setVol(OPT.sfx, OPT.mus); SFX.ui();      
    try { localStorage.setItem('kraken.sfxvol', OPT.sfx); } catch (err) {}
  });
  $('opt-mus').addEventListener('input', e => {
    OPT.mus = e.target.value / 100;
    $('opt-mus-v').textContent = e.target.value;
    SFX.setVol(OPT.sfx, OPT.mus);
    try { localStorage.setItem('kraken.musvol', OPT.mus); } catch (err) {}
  });
  $('btn-lab').addEventListener('click', e => { SFX.ensure(); openLab('ov-title'); e.currentTarget.blur(); });
  $('btn-tuto').addEventListener('click', e => { SFX.ensure(); openTuto(); e.currentTarget.blur(); });
  $('tuto-next').addEventListener('click', e => { e.stopPropagation(); tutoNext(); e.currentTarget.blur(); });
  $('tuto-skip').addEventListener('click', e => { e.stopPropagation(); closeTuto(); e.currentTarget.blur(); });
  $('ov-tuto').addEventListener('click', e => { if (!e.target.closest('button')) tutoNext(); });
  $('btn-lab2').addEventListener('click', e => { SFX.ensure(); openLab('ov-over'); e.currentTarget.blur(); });
  $('btn-home').addEventListener('click', e => { SFX.ensure(); quitToTitle(); e.currentTarget.blur(); });
  $('btn-lab-close').addEventListener('click', e => { closeLab(); e.currentTarget.blur(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'playing') togglePause();
  });
  try { if (localStorage.getItem('kraken.muted')) SFX.setMuted(true); } catch (e) {}
}

function init() {
  document.body.classList.add('on-title');
  loadLab(); loadRecords();
  bindInput(); bindUI(); initOptions();
  setTheme(1); genMap(1); buildBg(1); buildRain();
  G.dataTotal = nodes.length;
  spawnDrones(G.params.drones);
  const cn = pick(CORNERS); Sp.x = cn[0]; Sp.y = cn[1];
  resetPlayer();
  updateHUDLives(); updateHUDData(); updateHUDSector();
  $('h-best').textContent = pad6(G.best);
  $('title-frags').textContent = LAB.frags;
  runTypewriter();
  requestAnimationFrame(ts => { last = ts; requestAnimationFrame(frame); });
}
init();