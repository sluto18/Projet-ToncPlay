'use strict';

/* ==========================================================================
   SWEEPER-01 — Nettoyage en apesanteur
   Difficulté par paliers d'orbes · gros débris · options en jeu
   Rendu et audio 100 % procéduraux (aucun fichier externe).
   ========================================================================== */

/* ============================== CONFIG ============================== */

const TILE = 32;             // taille d'une case (px)
const SPR_SIZE = 16;         // résolution des sprites
const PX = 2;                // échelle sprite -> écran

const SPEED_START = 320;     // vitesse du robot au départ (px/s)
const BAG_SLOW    = 40;      // vitesse perdue PAR SAC PLEIN livré
const SPEED_MIN   = 80;     // vitesse plancher

const COMBO_WINDOW = 3.5;   // durée du combo
const COMBO_MAX    = 5;
const MAX_OBST     = 22;

/* Tactile : d-pad flottant au lieu du suivi du doigt */
const IS_TOUCH   = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const DPAD_SPEED = 340;   // vitesse de déplacement de la cible au d-pad (px/s)

const ORB_POINTS  = 100;
const COIN_PER_SEC = 1;      // pièces par seconde survécue (mission libre)
const COIN_PER_ORB = 2;      // pièces par orbe ramassée

/* --- Difficulté par paliers --- */
const TIME_PER_LEVEL = 20;
const ORBS_PER_LEVEL = 5;    // orbes nécessaires pour monter d'un niveau
const BIG_FROM_LEVEL = 3;    // les gros débris apparaissent à ce niveau (0-based)

/* --- Déchargement --- */
const UNLOAD_CD     = 20;    // recharge minimale entre deux appels (s)
const UNLOAD_STAY   = 8;     // temps de stationnement du vaisseau (s)
const UNLOAD_RANGE  = 36;    // rayon de dépôt autour du vaisseau (px)

const SAVE_KEY = 'zerog-sweeper-save-v2';
const LEGACY_BEST_KEY = 'zerog-sweeper-best';

const PRICE_LIVES  = [100, 200, 300, 400, 500];   // vies 1 -> 6
const PRICE_BAG    = [100, 200, 300, 400, 500];   // sac 5 -> 10 places
const PRICE_UNLOAD = [200, 350, 500, 750, 900];  // déchargements 0 -> 5

/* ============================== MODES ============================== */

const MODES = {
  classic: {
    name: 'MISSION LIBRE', gx: 14, gy: 14, spawn: 1, speed: 1, coins: true,
    desc: 'Nettoyez la zone à votre rythme. Les pièces ne se gagnent qu\'ici.',
  },
  asteroids: {
    name: 'CHAMP D\'ASTÉROÏDES', gx: 12, gy: 12, spawn: 2, speed: 1.05, types: ['meteor'],
    desc: 'Météorites uniquement, deux fois plus nombreuses. Grille resserrée 12x12.',
  },
  corridor: {
    name: 'COULOIR ÉTROIT', gx: 6, gy: 14, spawn: 0.9, speed: 1, types: ['screw', 'meteor'],
    desc: 'Un corridor de 6 cases de large. Aucune échappatoire latérale.',
  },
  storm: {
    name: 'ORAGE SOLAIRE', gx: 14, gy: 14, spawn: 1.5, speed: 1.3, dirs: 'v',
    desc: 'Pluie verticale de débris très rapides. Gardez le regard vers le haut.',
  },
  heavy: {
    name: 'CHANTIER PERDU', gx: 11, gy: 16, spawn: 1.5, speed: 0.8, types: ['drone', 'sat', 'bigdrone', 'bigsat'],
    desc: 'Drones et épaves lents mais très nombreux. Grille 11x16.',
  },
  sprint: {
    name: 'SPRINT 60', gx: 14, gy: 14, spawn: 1.4, speed: 1.25, timeLimit: 60, orbMul: 2,
    desc: '60 secondes chrono, tout est plus rapide, les orbes rapportent double.',
  },
};

/* ============================== ROBOTS ============================== */

const PLAYER_ROWS = [
  "................",
  ".......yy.......",
  ".......dd.......",
  ".....wwwwww.....",
  "....wwwwwwww....",
  "....wccvvvvw....",
  "....wcvvvvvw....",
  "....wvvvvvvw....",
  "....wvvvvvvw....",
  ".....ssssss.....",
  "..ddwwwwwwwwdd..",
  "..ddwwwyywwwdd..",
  "...d.wwwwww.d...",
  ".....dd..dd.....",
  ".....oo..oo.....",
  "................",
];

const SKINS = [
  { id: 'default', name: 'SWEEPER-01', price: 0,   desc: 'Le nettoyeur de série, blanc et cyan.',
    pal: { w: '#eef3f9', s: '#aebdd2', v: '#0e1a24', c: '#6fe3f2', o: '#ff9d3b', d: '#343e50', y: '#ffd94a' } },
  { id: 'mars', name: 'SP-07 MARS', price: 150, desc: 'Carrosserie rouille des chantiers martiens.',
    pal: { w: '#e8b48a', s: '#c08a5f', v: '#241109', c: '#ffd2a8', o: '#ff7a3b', d: '#5a3020', y: '#ffd94a' } },
  { id: 'neon', name: 'NX NÉON', price: 250, desc: 'Tuning de nuit pour pilotes audacieux.',
    pal: { w: '#2a2436', s: '#3e3650', v: '#12091c', c: '#ff4fd8', o: '#00e5ff', d: '#191322', y: '#f8f8ff' } },
  { id: 'frost', name: 'GL GIVRE', price: 400, desc: 'Blindage cryogénique des ceintures froides.',
    pal: { w: '#dfeefc', s: '#a8c4dd', v: '#0a1e33', c: '#ffffff', o: '#7fd4ff', d: '#33506b', y: '#bfe9ff' } },
  { id: 'gold', name: 'AU LINGOT', price: 600, desc: 'Édition prestige plaquée or massif.',
    pal: { w: '#ffd94a', s: '#d9a821', v: '#241a02', c: '#fff3c4', o: '#ff9d3b', d: '#7a5c12', y: '#ffffff' } },
];

const DEFAULT_SAVE = {
  coins: 0,
  lives: 1,        // 1 à 6
  bagLv: 0,        // 0 à 5 -> places = 5 + bagLv
  unloads: 0,      // 0 à 5 -> appels de déchargement par mission
  skin: 'default',
  owned: ['default'],
  records: {},
  achv: [],                                        // succès débloqués
  stats: { orbs: 0, deaths: 0, coinsEarned: 0 },   // compteurs cumulés
  volMusic: 0.6,
  volSfx: 0.8,
};

/* ============================== UTILS ============================== */

const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp   = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp    = (a, b, t) => a + (b - a) * t;
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const pad6    = n => String(Math.max(0, Math.floor(n))).padStart(6, '0');
const pad2    = n => String(n).padStart(2, '0');
const fmtTime = s => pad2(Math.floor(s / 60)) + ':' + pad2(Math.floor(s % 60));

function weighted(map) {
  let sum = 0;
  for (const k in map) sum += map[k];
  let r = Math.random() * sum;
  for (const k in map) {
    r -= map[k];
    if (r <= 0) return k;
  }
  return Object.keys(map)[0];
}

/* ============================== SAUVEGARDE ============================== */

function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
  if (!s || typeof s !== 'object') s = {};
  const out = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  if (Number.isFinite(s.coins))   out.coins = Math.max(0, Math.floor(s.coins));
  if (Number.isFinite(s.lives))   out.lives = clamp(Math.floor(s.lives), 1, 6);
  if (Number.isFinite(s.bagLv))   out.bagLv = clamp(Math.floor(s.bagLv), 0, 5);
  if (Number.isFinite(s.unloads)) out.unloads = clamp(Math.floor(s.unloads), 0, 5);
  if (Array.isArray(s.achv))      out.achv = s.achv.filter(x => typeof x === 'string');
  if (s.stats && typeof s.stats === 'object') {
    if (Number.isFinite(s.stats.orbs))        out.stats.orbs = Math.max(0, Math.floor(s.stats.orbs));
    if (Number.isFinite(s.stats.deaths))      out.stats.deaths = Math.max(0, Math.floor(s.stats.deaths));
    if (Number.isFinite(s.stats.coinsEarned)) out.stats.coinsEarned = Math.max(0, Math.floor(s.stats.coinsEarned));
  }
  if (typeof s.skin === 'string') out.skin = s.skin;
  if (Array.isArray(s.owned))     out.owned = s.owned.filter(x => typeof x === 'string');
  if (!out.owned.includes('default')) out.owned.unshift('default');
  if (!SKINS.some(k => k.id === out.skin)) out.skin = 'default';
  if (s.records && typeof s.records === 'object') {
    for (const k in MODES) {
      if (Number.isFinite(s.records[k])) out.records[k] = Math.floor(s.records[k]);
    }
  }
  if (Number.isFinite(s.volMusic)) out.volMusic = clamp(s.volMusic, 0, 1);
  if (Number.isFinite(s.volSfx))   out.volSfx   = clamp(s.volSfx, 0, 1);
  if (!out.records.classic) {
    try {
      const old = parseInt(localStorage.getItem(LEGACY_BEST_KEY) || '0', 10);
      if (old > 0) out.records.classic = old;
    } catch (e) {}
  }
  return out;
}

function saveSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

let save = loadSave();
const bagCapacity = () => 5 + save.bagLv;

/* ============================== SUCCÈS ============================== */

const ACHIEVEMENTS = [
  { id: 'first-orb',   icon: 'orbA',   name: 'PREMIÈRE ORBE',     desc: 'Ramasser une orbe d\'énergie.' },
  { id: 'first-death', icon: 'meteor', name: 'PREMIER CONTACT',   desc: 'Perdre le robot sur un débris.' },
  { id: 'combo5',      icon: 'orbB',   name: 'EN CHAUD',          desc: 'Atteindre un combo x5.' },
  { id: 'first-drop',  icon: 'ship',   name: 'PREMIÈRE LIVRAISON',desc: 'Déposer des sacs via le vaisseau allié.' },
  { id: 'bags3',       icon: 'crate',  name: 'PLEINE CHARGE',     desc: 'Porter 3 sacs pleins à bord en même temps.' },
  { id: 'survive2',    icon: 'player', name: 'SURVIVANT',         desc: 'Tenir 2 minutes en une mission.' },
  { id: 'survive5',    icon: 'player', name: 'MARATHON',          desc: 'Tenir 4 minutes en une mission.' },
  { id: 'survive10',   icon: 'player', name: 'ÉTERNEL',           desc: 'Tenir 7 minutes en une mission.' },
  { id: 'score10k',    icon: 'sat',    name: 'GROS SCORE',        desc: 'Marquer 5 000 points en une mission.' },
  { id: 'score25k',    icon: 'sat',    name: 'AS DE L\'ESPACE',   desc: 'Marquer 12 000 points en une mission.' },
  { id: 'score50k',    icon: 'ice',    name: 'LÉGENDE ORBITALE',  desc: 'Marquer 25 000 points en une mission.' },
  { id: 'level10',     icon: 'ember',  name: 'ZONE ROUGE',        desc: 'Atteindre le niveau 10 de difficulté.' },
  { id: 'orbs50',      icon: 'orbA',   name: 'RÉCOLTEUR',         desc: 'Ramasser 50 orbes au total.' },
  { id: 'orbs200',     icon: 'crate',  name: 'FERRAILLEUR',       desc: 'Ramasser 200 orbes au total.' },
  { id: 'magnat',      icon: 'coin',   name: 'MAGNAT',            desc: 'Gagner 1 000 pièces au total.' },
  { id: 'coins2k',     icon: 'coin',   name: 'RÉSERVE D\'OR',     desc: 'Gagner 2 000 pièces au total.' },
  { id: 'coins5k',     icon: 'coin',   name: 'COFFRE-FORT',       desc: 'Gagner 5 000 pièces au total.' },
  { id: 'buy-life',    icon: 'heart',  name: 'PREMIÈRE VIE',      desc: 'Acheter la première vie de secours.' },
  { id: 'buy-bag',     icon: 'crate',  name: 'GRAND SAC',         desc: 'Acheter la première amélioration de sac.' },
  { id: 'buy-unload',  icon: 'ship',   name: 'RENDEZ-VOUS',       desc: 'Acheter le premier déchargement.' },
  { id: 'max-lives',   icon: 'heart',  name: 'CŒUR BLINDÉ',       desc: 'Avoir les 6 vies de secours.' },
  { id: 'max-bag',     icon: 'crate',  name: 'CARGAISON',         desc: 'Sac de récolte au maximum (10 places).' },
  { id: 'max-unload',  icon: 'ship',   name: 'FLOTTE PRIVÉE',     desc: 'Avoir les 5 déchargements.' },
  { id: 'all-skins',   icon: 'player', name: 'GARAGE COMPLET',    desc: 'Posséder tous les modèles de robot.' },
];

function unlockAchv(id) {
  if (save.achv.includes(id)) return;
  save.achv.push(id);
  saveSave();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a) toast('SUCCÈS · ' + a.name);
  SFX.achv();
}

/* ============================== CANVAS & MODE ============================== */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.style.cursor = 'none';

let GX = 14, GY = 14, W = 448, H = 448;

function setMode(id) {
  game.modeId = id;
  const m = MODES[id];
  GX = m.gx; GY = m.gy;
  W = GX * TILE; H = GY * TILE;
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;   // le resize réinitialise le contexte
  starfield = new Starfield();
  decoObstacles = []; decoTimer = 0;
  hudCache.best = -1;
  if (id === 'classic') screenBox.prepend(hudEl);
  else cabEl.insertBefore(hudEl, screenBox);
}

/* ============================== AUDIO ============================== */

const AU = {
  ctx: null, sfx: null, music: null, muted: false,

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.connect(this.ctx.destination);
      this.applyVol();
    } catch (e) {}
  },

  applyVol() {
    if (!this.ctx) return;
    this.sfx.gain.value   = this.muted ? 0 : save.volSfx;
    this.music.gain.value = this.muted ? 0 : save.volMusic * 0.32;
  },
};

/* --- Bruitages --- */

const SFX = {
  tone({ f0 = 440, f1 = null, dur = 0.1, type = 'square', vol = 0.15, delay = 0 }) {
    if (!AU.ctx) return;
    const t0 = AU.ctx.currentTime + delay;
    const o = AU.ctx.createOscillator();
    const g = AU.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 || f0), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(AU.sfx);
    o.start(t0); o.stop(t0 + dur + 0.03);
  },

  noise({ dur = 0.3, vol = 0.25 }) {
    if (!AU.ctx) return;
    const t0 = AU.ctx.currentTime;
    const len = Math.max(1, Math.floor(dur * AU.ctx.sampleRate));
    const buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = AU.ctx.createBufferSource();
    src.buffer = buf;
    const g = AU.ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(AU.sfx);
    src.start(t0);
  },

  blip()   { this.tone({ f0: 520, dur: 0.05, vol: 0.08 }); },
    /* Bruitages d'interface */
  uiTap()    { this.tone({ f0: 620, f1: 560, dur: 0.045, vol: 0.07 }); },
  uiBack()   { this.tone({ f0: 430, f1: 300, dur: 0.08,  vol: 0.07 }); },
  uiConfirm(){ this.tone({ f0: 480, f1: 700, dur: 0.09,  type: 'triangle', vol: 0.09 }); },
  uiReset()  {
    this.tone({ f0: 300, f1: 80, dur: 0.3,  type: 'sawtooth', vol: 0.1 });
    this.tone({ f0: 150, f1: 55, dur: 0.35, vol: 0.08, delay: 0.05 });
  },

  pickup(combo) {
    const base = 500 + Math.min(combo, COMBO_MAX) * 45;
    this.tone({ f0: base,        dur: 0.07, vol: 0.11 });
    this.tone({ f0: base * 1.25, dur: 0.07, vol: 0.11, delay: 0.06 });
    this.tone({ f0: base * 1.5,  dur: 0.11, vol: 0.11, delay: 0.12 });
  },
  deliver() {
    this.tone({ f0: 660,  dur: 0.07, type: 'triangle', vol: 0.13 });
    this.tone({ f0: 880,  dur: 0.07, type: 'triangle', vol: 0.13, delay: 0.07 });
    this.tone({ f0: 1320, dur: 0.12, type: 'triangle', vol: 0.13, delay: 0.14 });
  },
  bagFull() {
    this.tone({ f0: 320, f1: 220, dur: 0.09, type: 'triangle', vol: 0.12 });
    this.tone({ f0: 220, f1: 150, dur: 0.13, type: 'triangle', vol: 0.12, delay: 0.08 });
  },
  achv() {
    this.tone({ f0: 523,  dur: 0.09, type: 'triangle', vol: 0.12 });
    this.tone({ f0: 659,  dur: 0.09, type: 'triangle', vol: 0.12, delay: 0.09 });
    this.tone({ f0: 784,  dur: 0.09, type: 'triangle', vol: 0.12, delay: 0.18 });
    this.tone({ f0: 1047, dur: 0.28, type: 'triangle', vol: 0.12, delay: 0.27 });
  },
  levelup() {
    this.tone({ f0: 620, f1: 930, dur: 0.12, type: 'triangle', vol: 0.1 });
  },
  summon() {
    this.tone({ f0: 200, f1: 700, dur: 0.4,  type: 'triangle', vol: 0.12 });
    this.tone({ f0: 700, f1: 500, dur: 0.25, type: 'triangle', vol: 0.08, delay: 0.35 });
  },
  deposit() {
    this.tone({ f0: 392, dur: 0.09, type: 'triangle', vol: 0.13 });
    this.tone({ f0: 523, dur: 0.09, type: 'triangle', vol: 0.13, delay: 0.08 });
    this.tone({ f0: 659, dur: 0.09, type: 'triangle', vol: 0.13, delay: 0.16 });
    this.tone({ f0: 784, dur: 0.22, type: 'triangle', vol: 0.13, delay: 0.24 });
  },
  hit() {
    this.noise({ dur: 0.25, vol: 0.3 });
    this.tone({ f0: 220, f1: 50, dur: 0.25, type: 'sawtooth', vol: 0.18 });
  },
  buy() {
    this.tone({ f0: 700,  dur: 0.06, type: 'triangle', vol: 0.12 });
    this.tone({ f0: 1050, dur: 0.1,  type: 'triangle', vol: 0.12, delay: 0.06 });
  },
  start() {
    this.tone({ f0: 260, dur: 0.09, vol: 0.11 });
    this.tone({ f0: 390, dur: 0.09, vol: 0.11, delay: 0.09 });
    this.tone({ f0: 520, dur: 0.15, vol: 0.11, delay: 0.18 });
  },
  over() {
    this.noise({ dur: 0.5, vol: 0.3 });
    this.tone({ f0: 300, f1: 55, dur: 0.6, type: 'sawtooth', vol: 0.2 });
    this.tone({ f0: 150, f1: 40, dur: 0.8, vol: 0.14, delay: 0.1 });
  },
};

/* --- Musique procédurale --- */

const midi2f = m => 440 * Math.pow(2, (m - 69) / 12);

const Music = {
  on: false, step: 0, nextT: 0, timer: null, lastSec: -1,
  stepDur: 60 / 120 / 4,

  /* Tempo : 120 BPM constant (~32 sec au total pour 256 pas) */
  bpm: [120, 120, 120, 120],

  /* Accords (index -> notes midi) : Cm, Ab, Fm, G7, Bb */
  chords: {
    1: [60, 63, 67],   // Cm
    2: [56, 60, 63],   // Ab
    3: [53, 56, 60],   // Fm
    4: [55, 59, 62],   // G7
    5: [58, 62, 65],   // Bb
  },

  /* Basse : 64 pas par phrase */
  bass: [
    [ 36,0,0,36, 0,0,36,0, 32,0,0,32, 0,0,32,0,      // 1 — Intro : Basse simple (Cm -> Ab)
      29,0,0,29, 0,0,29,0, 31,0,0,31, 0,0,31,0,
      36,0,0,36, 0,0,36,0, 32,0,0,32, 0,0,32,0,
      29,0,0,29, 0,0,29,0, 31,0,0,31, 0,31,0,0 ],
    [ 36,0,36,0, 36,0,36,0, 32,0,32,0, 32,0,32,0,      // 2 — Montée : Croches serrées
      29,0,29,0, 29,0,29,0, 31,0,31,0, 31,0,31,0,
      36,0,36,0, 36,0,36,0, 32,0,32,0, 32,0,32,0,
      29,0,29,0, 29,0,29,0, 31,0,31,0, 31,0,34,0 ],
    [ 36,48,36,48, 36,48,36,48, 32,44,32,44, 32,44,32,44, // 3 — Drop Synthwave : Octaves rapides
      29,41,29,41, 29,41,29,41, 31,43,31,43, 31,43,31,43,
      36,48,36,48, 36,48,36,48, 32,44,32,44, 32,44,32,44,
      29,41,29,41, 29,41,29,41, 31,43,31,43, 31,43,34,46 ],
    [ 36,0,0,0, 0,0,36,0, 32,0,0,0, 0,0,32,0,          // 4 — Outro : Respirations
      29,0,0,0, 0,0,29,0, 31,0,0,0, 0,0,31,0,
      36,0,0,0, 0,0,36,0, 32,0,0,0, 0,0,32,0,
      29,0,0,0, 0,0,29,0, 31,0,0,0, 0,0,0,0 ],
  ],

  /* Arpège : Arpèges montants & descendants */
  arp: [
    [ 60,0,63,0, 67,0,72,0, 70,0,67,0, 63,0,60,0,      // 1 — Arpège Cm / Ab / Fm / G7
      56,0,60,0, 63,0,68,0, 67,0,63,0, 60,0,56,0,
      53,0,56,0, 60,0,65,0, 63,0,60,0, 56,0,53,0,
      55,0,59,0, 62,0,67,0, 65,0,62,0, 59,0,55,0 ],
    [ 60,0,63,0, 67,0,72,0, 70,0,67,0, 63,0,60,0,      // 2 — Reprise
      56,0,60,0, 63,0,68,0, 67,0,63,0, 60,0,56,0,
      53,0,56,0, 60,0,65,0, 63,0,60,0, 56,0,53,0,
      55,0,59,0, 62,0,67,0, 71,0,67,0, 62,0,59,0 ],
    null,                                              // 3 — Pause sur le drop pour laisser la basse agir
    [ 72,0,67,0, 63,0,60,0, 68,0,63,0, 60,0,56,0,      // 4 — Arpège rapide de fin
      65,0,60,0, 56,0,53,0, 67,0,62,0, 59,0,55,0,
      72,0,67,0, 63,0,60,0, 68,0,63,0, 60,0,56,0,
      65,0,60,0, 56,0,53,0, 67,0,0,0, 0,0,0,0 ],
  ],

  /* Chords/Stabs : Plaqué sur les temps forts */
  skank: [
    null,
    [ 1,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,0,0,
      3,0,0,0, 0,0,0,0, 4,0,0,0, 0,0,0,0,
      1,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,0,0,
      3,0,0,0, 0,0,0,0, 4,0,0,0, 0,0,0,0 ],
    [ 1,0,0,1, 0,0,1,0, 2,0,0,2, 0,0,2,0,              // Stabs rythmés sur le drop
      3,0,0,3, 0,0,3,0, 4,0,0,4, 0,0,4,0,
      1,0,0,1, 0,0,1,0, 2,0,0,2, 0,0,2,0,
      3,0,0,3, 0,0,3,0, 4,0,0,4, 0,0,4,0 ],
    null,
  ],

  /* Lead / Thème principal */
  lead: [
    null,
    [ 72,0,0,72, 0,74,0,75, 0,74,0,72, 0,70,0,67,      // Thème mélodique 1
      68,0,0,68, 0,70,0,72, 0,70,0,68, 0,67,0,63,
      65,0,0,65, 0,67,0,68, 0,67,0,65, 0,63,0,60,
      62,0,0,62, 0,65,0,67, 0,0,0,0, 0,0,0,0 ],
    [ 72,0,0,72, 0,74,0,75, 0,74,0,72, 0,70,0,67,      // Thème mélodique énergique sur la phase 3
      68,0,0,68, 0,70,0,72, 0,70,0,68, 0,67,0,63,
      65,0,0,65, 0,67,0,68, 0,67,0,65, 0,63,0,60,
      67,0,0,67, 0,71,0,74, 0,75,0,74, 0,71,0,67 ],
    [ 72,0,0,0, 0,0,0,0, 70,0,0,0, 0,0,0,0,            // Stabs d'écho de fin
      68,0,0,0, 0,0,0,0, 67,0,0,0, 0,0,0,0,
      72,0,0,0, 0,0,0,0, 70,0,0,0, 0,0,0,0,
      68,0,0,0, 0,0,0,0, 67,0,0,0, 0,0,0,0 ],
  ],

  note(type, midi, t, dur, vol) {
    const o = AU.ctx.createOscillator();
    const g = AU.ctx.createGain();
    o.type = type;
    o.frequency.value = midi2f(midi);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AU.music);
    o.start(t); o.stop(t + dur + 0.02);
  },

  kick(t) {
    const o = AU.ctx.createOscillator();
    const g = AU.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g); g.connect(AU.music);
    o.start(t); o.stop(t + 0.14);
  },

  snare(t, vol = 0.7) {
    const len = Math.max(1, Math.floor(AU.ctx.sampleRate * 0.1));
    const buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = AU.ctx.createBufferSource();
    src.buffer = buf;
    const g = AU.ctx.createGain();
    g.gain.value = 0.16 * vol;
    src.connect(g); g.connect(AU.music);
    src.start(t);
    this.note('triangle', 62, t, 0.06, 0.08 * vol);
  },

  rim(t) {
    this.note('square', 90, t, 0.02, 0.03);
  },

  /** Nouvelle partie : la musique repart de l'intro. */
  begin() {
    this.step = 0;
    this.lastSec = -1;
  },

  start(fromBeginning = false) {
    AU.ensure();
    if (!AU.ctx) return;
    this.on = true;
    if (fromBeginning) {
      this.step = 0;
      this.lastSec = -1;
    }
    this.nextT = AU.ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 60);
  },

  stop() { this.on = false; },

  tick() {
    if (!this.on || !AU.ctx) return;
    while (this.nextT < AU.ctx.currentTime + 0.2) {
      const s = this.step;
      const sec = Math.floor(s / 64) % 4;   // phrase (0-3)
      const p = s % 64;                     // pas dans la phrase
      const s16 = p % 16;                   // pas dans la mesure
      const t = this.nextT;

      if (sec !== this.lastSec) {
        this.lastSec = sec;
        this.stepDur = 60 / this.bpm[sec] / 4;
      }

      const b = this.bass[sec][p];
      if (b) this.note('sawtooth', b, t, 0.15, 0.14); // Sawtooth pour plus d'impact bass Synthwave

      const a = this.arp[sec] && this.arp[sec][p];
      if (a) this.note('triangle', a, t, 0.09, 0.07);

      const k = this.skank[sec] && this.skank[sec][p];
      if (k) for (const n of this.chords[k]) this.note('square', n, t, 0.08, 0.04);

      const L = this.lead[sec] && this.lead[sec][p];
      if (L) {
        this.note('sawtooth', L, t, 0.16, 0.09);
        if (sec === 3) {                   // Écho synthwave sur l'outro
          this.note('sawtooth', L, t + this.stepDur * 2, 0.12, 0.04);
          this.note('sawtooth', L, t + this.stepDur * 4, 0.10, 0.02);
        }
      }

      // Batterie style Synthwave 4-on-the-floor sur la phase 3
      if (sec === 0) {
        if (s16 === 0 || s16 === 8) this.kick(t);
        if (s16 === 4 || s16 === 12) this.snare(t, 0.4);
      } else if (sec === 1 || sec === 2) {
        if (s16 % 4 === 0) this.kick(t);                     // Kick sur chaque temps (4-on-the-floor)
        if (s16 === 4 || s16 === 12) this.snare(t, 0.7);     // Snare puissante
        if (s16 % 2 === 1) this.rim(t);                      // Offbeat Hi-Hat
      } else {
        if (s16 === 0) this.kick(t);
        if (s16 === 8) this.snare(t, 0.5);
      }

      this.nextT += this.stepDur;
      this.step = (this.step + 1) % 256;
    }
  },
};

/* ============================== SPRITES ============================== */

function buildSprite(rows, pal) {
  const c = document.createElement('canvas');
  c.width = SPR_SIZE;
  c.height = SPR_SIZE;
  const g = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.' && pal[ch]) {
        g.fillStyle = pal[ch];
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return { img: c, rows, pal };
}

function spritePixels(def) {
  const out = [];
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.' && def.pal[ch]) out.push({ x, y, color: def.pal[ch] });
    }
  });
  return out;
}

const SPR = {};

function rebuildPlayerSprite() {
  const sk = SKINS.find(k => k.id === save.skin) || SKINS[0];
  SPR.player = buildSprite(PLAYER_ROWS, sk.pal);
  renderLives();  
}

/* --- Météorites : 3 designs (petits ET gros débris) --- */
const METEOR_ROWS = [
  "................",
  "....lrrrrrr.....",
  "...llrrrrrrrr...",
  "..llrrrrrrrrrr..",
  "..lrrrrrrkkrrrr.",
  ".rrrrrrrrkkrrrr.",
  ".rrrrrrrrrrrrrr.",
  ".rrrkkrrrrrkkrr.",
  ".rrrkkrrrrrkkrr.",
  ".mrrrrrrrrrrrrm.",
  ".mmrrrrrrrrrrmm.",
  "..mmrrrrrrrrmm..",
  "...RRrrrrrrRR...",
  ".....RRRRRR.....",
  "................",
  "................",
];
const ICE_ROWS = [
  "................",
  "......lr........",
  "...llrrrlr......",
  "..lrrrrrrrl.....",
  ".lrrwrrrrrrl....",
  ".lrrrrrkkrrrl...",
  "lrrrkkrrrrrrrl..",
  "lrrrrrrrrrkkrl..",
  "lrrrkkrrrrrrrl..",
  ".lrrrrrrkkrrl...",
  ".lrrrrrrrrrl....",
  "..lrrrrrrrl.....",
  "...lrrrrrl......",
  "....lRRRl.......",
  "................",
  "................",
];
const EMBER_ROWS = [
  "................",
  "....rrrrrr......",
  "...rrlrrrrr.....",
  "..rrlkkrrrrr....",
  ".rrlkkrrrrrrr...",
  ".rrkkrrrrkkrr...",
  "rrlrrrrrkkrrrr..",
  "rrrrkkrrrkkrrr..",
  "rrrkkrrrkkrrrr..",
  ".rrrkkrrrkkrr...",
  ".mrrrrkkrrrrr...",
  "..mmrrrrrrrm....",
  "...mmrrrrrmm....",
  ".....mmmmm......",
  "................",
  "................",
];

/* Design 1 : graphite à veines incandescentes */
SPR.meteor = buildSprite(METEOR_ROWS, {
  r: '#6a7286', R: '#454d61', k: '#ff9d3b', l: '#a3adc0', m: '#565e72',
});
/* Design 2 : glace anguleuse */
SPR.ice = buildSprite(ICE_ROWS, {
  r: '#9fb8c9', R: '#7290a6', k: '#4d6377', l: '#e8f4fc', m: '#87a2b5', w: '#f4faff',
});
/* Design 3 : braise, roche à fissures de lave */
SPR.ember = buildSprite(EMBER_ROWS, {
  r: '#8a3a2c', m: '#5f2317', k: '#ff9d3b', l: '#c65b3f',
});

/* --- Gros astéroïde (dessiné en 2x2 cases, 64 px) --- */
SPR.big = buildSprite([
  "................",
  "....lllllll.....",
  "..llrrrrrrrll...",
  ".llrrrrrrrrrll..",
  ".lrrrkkrrrrrrl..",
  "lrrrrrkkrrrrrrl.",
  "lrrkkrrrrrkkrrrl",
  "lrrkkrrrrrkkrrrl",
  "lrrrrrrrrrrrrrrl",
  "lrrrkkrrrrkkrrrl",
  "lrrrkkrrrrkkrrrl",
  ".lrrrrrkkrrrrrl.",
  ".llrrrrrrrrrrll.",
  "..llrrrrrrrll...",
  "....lllllll.....",
  "................",
], {
  r: '#9a7156', R: '#6e4d38', k: '#4a3324', l: '#c69a78',
});

/* --- Drone de cargo (remplace l'ancien panneau à bandes) --- */
SPR.drone = buildSprite([
  "................",
  "................",
  ".....dddddd.....",
  "....dwwwwwwd....",
  "...dwwvvvvwwd...",
  "..dwwwvccvwwwd..",
  "..dwwwvvvvwwwd..",
  "..dwwwwwwwwwwd..",
  "..dwdggggggdwd..",
  "..dwdg....gdwd..",
  "..dwdd....ddwd..",
  "...oo......oo...",
  "................",
  "................",
  "................",
  "................",
], {
  w: '#c3ccd9', g: '#8b97a8', d: '#39424f', v: '#0e1a24', c: '#6fe3f2', o: '#ff9d3b',
});

/* --- Satellite --- */
SPR.sat = buildSprite([
  ".......kk.......",
  ".......aa.......",
  "......akka......",
  ".......aa.......",
  ".....yyyyyy.....",
  ".....yyyyyy.....",
  "bbbddyykkyyddbbb",
  "bBbddyYkkYyddbBb",
  "bBbddyYkkYyddbBb",
  "bbbddyykkyyddbbb",
  ".....yyyyyy.....",
  ".....yYYYYy.....",
  ".......aa.......",
  "......aaaa......",
  "................",
  "................",
], { y: '#e0a83f', Y: '#a67726', b: '#1c4a6e', B: '#6fd0f2', d: '#4b5566', a: '#8d99ad', k: '#222b38' });

/* --- Tournevis --- */
SPR.screw = buildSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "...........ooo..",
  "..kk......kooo..",
  ".kkkggggggkooo..",
  ".kkkGGGGGGkOOO..",
  "..kk......kOOO..",
  "...........OOO..",
  "................",
  "................",
  "................",
  "................",
  "................",
], { o: '#ff9d3b', O: '#c96f22', g: '#c3ccd9', G: '#8b97a8', k: '#39424f' });

/* --- Orbe (2 frames) --- */
SPR.orbA = buildSprite([
  "................",
  "................",
  "................",
  ".......oo.......",
  "......oyyo......",
  ".....oyyyyo.....",
  "....oyywwyyo....",
  "....oywwwwyo....",
  "....oywwwwyo....",
  "....oyywwyyo....",
  ".....oyyyyo.....",
  "......oyyo......",
  ".......oo.......",
  "................",
  "................",
  "................",
], { o: '#1f7fa8', y: '#6fe3f2', w: '#eafcff' });

SPR.orbB = buildSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......oo.......",
  "......oyyo......",
  ".....oywwyo.....",
  ".....oywwyo.....",
  "......oyyo......",
  ".......oo.......",
  "................",
  "................",
  "................",
  "................",
  "................",
], { o: '#1f7fa8', y: '#6fe3f2', w: '#eafcff' });

/* --- Icônes boutique --- */
SPR.heart = buildSprite([
  "................",
  "................",
  "................",
  "...rr....rr.....",
  "..rRRr..rRRr....",
  "..rRRRrrRRRr....",
  "..rRRRRRRRRr....",
  "..rRRWWRRRRr....",
  "...rRRRRRRr.....",
  "....rRRRRr......",
  ".....rRRr.......",
  "......rr........",
  "................",
  "................",
  "................",
  "................",
], { r: '#a83420', R: '#ff6b4a', W: '#ffd0c4' });

SPR.crate = buildSprite([
  "................",
  "................",
  "..dddddddddd....",
  "..dyyyyyyyyd....",
  "..dyddddddyd....",
  "..dyddyyddyd....",
  "..dyddyyddyd....",
  "..dyddddddyd....",
  "..dyyyyyyyyd....",
  "..dddddddddd....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { y: '#ffd94a', d: '#8a6a14' });

/* --- Pièce (icône succès) --- */
SPR.coin = buildSprite([
  "................",
  "....ddddddd.....",
  "..ddyyyyyyydd...",
  ".dyyyoooooyyyd..",
  ".dyyoyyyyoyyyd..",
  "dyyoyyddyyoyyyd.",
  "dyyoyyddyyoyyyd.",
  "dyyoyyyyyyoyyyd.",
  "dyyoyyyyyyoyyyd.",
  "dyyoyyddyyoyyyd.",
  "dyyoyyddyyoyyyd.",
  ".dyyoyyyyoyyyd..",
  ".dyyyoooooyyyd..",
  "..ddyyyyyyydd...",
  "....ddddddd.....",
  "................",
], { y: '#ffd94a', d: '#8a6a14', o: '#c9982a' });

/* --- Engrenage (bouton options en jeu) --- */
SPR.gear = buildSprite([
  "................",
  ".....cc..cc.....",
  "...cccccccccc...",
  "..ccddddddddcc..",
  ".ccddd....dddcc.",
  ".ccdd......ddcc.",
  "ccddd......dddcc",
  "ccdd........ddcc",
  "ccdd........ddcc",
  "ccddd......dddcc",
  ".ccdd......ddcc.",
  ".ccddd....dddcc.",
  "..ccddddddddcc..",
  "...cccccccccc...",
  ".....cc..cc.....",
  "................",
], { c: '#6fe3f2', d: '#155a70' });

SPR.cursor = buildSprite([
  "................",
  ".......ww.......",
  "......www.......",
  "......www.......",
  "......www.......",
  "......www.......",
  "......www.......",
  ".....wwwww......",
  "....wwwwwww.....",
  "..wwwwwwwwww....",
  ".wwwwwwwwwwws...",
  ".wwwwwwwwwwws...",
  ".wwwwwwwwwwws...",
  ".swwwwwwwwws....",
  "..ooooccoooo....",
  "..dddddddddd....",
], { w: '#eef3f9', s: '#aebdd2', o: '#ff9d3b', d: '#343e50', c: '#6fe3f2' });

/* --- Flèche du D-pad --- */
SPR.arrow = buildSprite([
  "................",
  ".......ww.......",
  ".......ww.......",
  "......wwww......",
  "......wwww......",
  ".....wwwwww.....",
  ".....wwwwww.....",
  "....wwwwwwww....",
  "....wwwwwwww....",
  "...wwwwwwwwww...",
  "...wwwwwwwwww...",
  "..wwwwwwwwwwww..",
  "................",
  "................",
  "................",
  "................",
], { w: '#eef3f9' });

/* --- Vaisseau allié de déchargement --- */
SPR.ship = buildSprite([
  "................",
  ".....cccccc.....",
  "..dddddddddddd..",
  ".dwwwwwwwwwwwwd.",
  ".dwggggggggggwd.",
  "dwwwwwwwwwwwwwwd",
  "dwwvvvvvvvvvvwwd",
  "dwwvccvvvvccvwwd",
  "dwwvvvvvvvvvvwwd",
  "dwwvccvvvvccvwwd",
  "dwwvvvvvvvvvvwwd",
  "dwwwwwwwwwwwwwwd",
  ".dwggggggggggwd.",
  ".dwwwwwwwwwwwwd.",
  "..dd........dd..",
  "...oo......oo...",
], {
  w: '#eef3f9', d: '#5c6a80', c: '#6fe3f2', g: '#ffd94a',
  v: '#0e1a24', o: '#ff9d3b',
});

/** Blit d'un sprite centré sur (cx, cy). `size` permet les sprites 2x2 cases. */
function drawSprite(def, cx, cy, quarter = 0, alpha = 1, size = TILE) {
  const x = Math.round(cx - size / 2);
  const y = Math.round(cy - size / 2);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if ((quarter & 3) === 0) {
    ctx.drawImage(def.img, x, y, size, size);
  } else {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate((quarter & 3) * Math.PI / 2);
    ctx.drawImage(def.img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  if (alpha < 1) ctx.globalAlpha = 1;
}

/* ============================== DÉCOR ============================== */

class Starfield {
  constructor() {
    this.stars = [];
    for (let i = 0; i < 110; i++) {
      const layer = randInt(0, 2);
      this.stars.push({
        x: Math.random() * W, y: Math.random() * H,
        size: layer === 2 ? 2 : 1,
        speed: [3, 6, 11][layer] * rand(0.7, 1.3),
        base: [0.22, 0.42, 0.75][layer] * rand(0.7, 1),
        ph: Math.random() * Math.PI * 2,
        tw: rand(1.5, 4),
        col: pick(['#cfe6ff', '#cfe6ff', '#cfe6ff', '#9fdce8', '#ffd9a8']),
      });
    }
    this.brights = [];
    for (let i = 0; i < 7; i++) {
      this.brights.push({
        x: Math.floor(rand(8, W - 8)), y: Math.floor(rand(8, H - 8)),
        ph: Math.random() * 7,
        col: pick(['#ffffff', '#bffff2', '#ffe9c9']),
      });
    }
  }
  update(dt) {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
    }
  }
  draw(t) {
    for (const s of this.stars) {
      ctx.globalAlpha = s.base * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
      ctx.fillStyle = s.col;
      ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
    }
    for (const b of this.brights) {
      const k = 0.5 + 0.5 * Math.sin(t * 1.7 + b.ph);
      if (k < 0.35) continue;
      const x = b.x, y = b.y, r = k > 0.8 ? 3 : 2;
      ctx.fillStyle = b.col;
      ctx.globalAlpha = 0.3 + 0.7 * k;
      ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = (0.3 + 0.7 * k) * 0.7;
      ctx.fillRect(x - r, y, r * 2 + 1, 1);
      ctx.fillRect(x, y - r, 1, r * 2 + 1);
    }
    ctx.globalAlpha = 1;
  }
}

/* ============================== EFFETS ============================== */

const particles = [];
const floaters = [];

function burst(x, y, colors, n, speed = 95) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = rand(speed * 0.3, speed);
    particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: rand(0.4, 0.9), max: 0.9,
      color: pick(colors),
      size: Math.random() < 0.3 ? 2 : 1,
      drag: rand(2.2, 4),
    });
  }
}

function explodeSprite(def, cx, cy, size = TILE) {
  const scale = size / TILE;
  for (const p of spritePixels(def)) {
    const wx = cx - size / 2 + p.x * PX * scale + scale;
    const wy = cy - size / 2 + p.y * PX * scale + scale;
    const dx = wx - cx, dy = wy - cy;
    const d = Math.max(1, Math.hypot(dx, dy));
    const v = rand(45, 175);
    particles.push({
      x: wx, y: wy,
      vx: dx / d * v + rand(-30, 30), vy: dy / d * v + rand(-30, 30),
      life: rand(0.7, 1.5), max: 1.5,
      color: p.color, size: 2, drag: 0.6,
    });
  }
  burst(cx, cy, ['#ffffff', '#ffd94a'], 8, 160);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const f = Math.exp(-p.drag * dt);
    p.vx *= f; p.vy *= f;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function addFloater(x, y, text, color) {
  floaters.push({ x, y, text, color, life: 0.9, max: 0.9 });
}

function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt; f.y -= 22 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
}

function drawFloaters() {
  if (!floaters.length) return;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.life / f.max * 1.6, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
  }
  ctx.globalAlpha = 1;
}

/* ============================== JOUEUR ============================== */

class Player {
  constructor() { this.reset(); }

  reset() {
    this.x = W / 2; this.y = H / 2;
    this.tx = this.x; this.ty = this.y;
    this.speed = SPEED_START;
    this.bag = 0;          // orbes dans le sac en cours
    this.bagsFull = 0;     // sacs livrés
    this.cargo = [];       // caisses visuelles
    this.bags = []; 
    this.inv = 0;          // invincibilité (respawn)
  }

  /** Retourne true si le sac vient d'être rempli (il reste à bord). */
  addOrb() {
    this.bag++;
    if (this.cargo.length < this.bag) this.cargo.push({ x: this.x, y: this.y + 8 });
    if (this.bag >= bagCapacity()) {
      // les petites caisses se compactent en une grosse caisse pleine
      for (const s of this.cargo) {
        burst(s.x, s.y, ['#ffd94a', '#c9982a', '#fff3c4'], 6);
      }
      this.bag = 0;
      this.cargo = [];
      this.bagsFull++;
      this.bags.push({ x: this.x, y: this.y + 10 });
      this.speed = Math.max(SPEED_MIN, SPEED_START - this.bagsFull * BAG_SLOW);
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.inv > 0) this.inv -= dt;
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) {
      const ease = d < 30 ? 0.4 + 0.6 * (d / 30) : 1;
      const step = Math.min(d, this.speed * dt * ease);
      this.x += dx / d * step;
      this.y += dy / d * step;
    }
    let px = this.x, py = this.y + 6;
    for (const s of this.bags) {          // sacs pleins : caisses volumineuses
      const sx = s.x - px, sy = s.y - py;
      const sd = Math.hypot(sx, sy);
      if (sd > 9) {
        s.x = px + sx / sd * 9;
        s.y = py + sy / sd * 9;
      }
      px = s.x; py = s.y;
    }
    for (const s of this.cargo) {         // orbes du sac en cours
      const sx = s.x - px, sy = s.y - py;
      const sd = Math.hypot(sx, sy);
      if (sd > 8) {
        s.x = px + sx / sd * 8;
        s.y = py + sy / sd * 8;
      }
      px = s.x; py = s.y;
    }
  }
}

const player = new Player();

/* ============================== OBSTACLES ============================== */

const OB_DEFS = {
  meteor: { hit: 22, speedMul: 1.00, spin: [0.45, 1.00] },
  drone:  { hit: 20, speedMul: 0.80, spin: [0.25, 0.55] },
  sat:    { hit: 22, speedMul: 0.85, spin: [0.28, 0.60] },
  screw:  { hit: 12, speedMul: 1.55, spin: [0.12, 0.30] },
  big:    { hit: 44, speedMul: 0.55, spin: [0.10, 0.25], size: 2 },   // 2x2 cases
  bigdrone: { hit: 40, speedMul: 0.60, spin: [0.15, 0.35], size: 2 },
  bigsat:   { hit: 42, speedMul: 0.50, spin: [0.12, 0.30], size: 2 },
  bigscrew: { hit: 36, speedMul: 0.90, spin: [0.08, 0.20], size: 2 },
};

const DIR_QUARTER = { '1,0': 2, '-1,0': 0, '0,1': 3, '0,-1': 1 };

const obstacles = [];

class Obstacle {
  constructor(type, dir, lane, speed) {
    const def = OB_DEFS[type];
    this.type = type;
    this.hit = def.hit;
    this.size = def.size || 1;
    this.vx = dir.x * speed;
    this.vy = dir.y * speed;
    this.spin = rand(def.spin[0], def.spin[1]) * (Math.random() < 0.5 ? -1 : 1);
    this.spinT = Math.random() * 10;
    this.dead = false;

    // Costume selon le type
    // Costume selon le type
    if (type === 'meteor')        this.spr = pick([SPR.meteor, SPR.ice, SPR.ember]);
    else if (type === 'drone')    this.spr = SPR.drone;
    else if (type === 'big')      this.spr = pick([SPR.meteor, SPR.ice, SPR.ember]);
    else if (type === 'bigdrone') this.spr = SPR.drone;
    else if (type === 'bigsat')   this.spr = SPR.sat;
    else if (type === 'bigscrew') this.spr = SPR.screw;
    else if (type === 'sat')      this.spr = SPR.sat;
    else                          this.spr = SPR.screw;

    this.baseQuarter = (type === 'screw' || type === 'bigscrew')
      ? DIR_QUARTER[dir.x + ',' + dir.y]
      : randInt(0, 3);

    // Les gros débris sont centrés sur 2 lignes/colonnes
    if (this.size > 1) {
      if (dir.x !== 0) lane = Math.min(lane, GY - 2);
      else             lane = Math.min(lane, GX - 2);
    }

    const off = TILE * this.size;   // décalage de départ hors écran
    if (dir.x !== 0) {
      this.cy = lane * TILE + (this.size > 1 ? TILE : TILE / 2);
      this.cx = dir.x > 0 ? -off : W + off;
    } else {
      this.cx = lane * TILE + (this.size > 1 ? TILE : TILE / 2);
      this.cy = dir.y > 0 ? -off : H + off;
    }
  }

  update(dt) {
    this.cx += this.vx * dt;
    this.cy += this.vy * dt;
    this.spinT += dt;
    const m = 60 * this.size;
    if (this.cx < -m || this.cx > W + m || this.cy < -m || this.cy > H + m) this.dead = true;
  }

  quarter() {
    const q = this.baseQuarter + Math.floor(this.spinT * this.spin);
    return ((q % 4) + 4) % 4;
  }

  draw(alpha = 1) {
    drawSprite(this.spr, this.cx, this.cy, this.quarter(), alpha, this.size * TILE);
  }
}

/* ============================== DIFFICULTÉ & DIRECTOR ============================== */

/** Niveau de difficulté : 1 palier toutes les ORBS_PER_LEVEL orbes ramassées. */
function diffLevel() {
  return Math.floor(game.time / TIME_PER_LEVEL)
       + Math.floor(game.picks / ORBS_PER_LEVEL);
}

/** Niveau "effectif" pour les mécaniques */
function effLevel() {
  const L = diffLevel();
  return L <= 8 ? L : 8 + (L - 8) * 0.4;
}

function randomDir() {
  const m = MODES[game.modeId];
  if (m.dirs === 'v') return pick([{ x: 0, y: 1 }, { x: 0, y: -1 }]);
  return pick([{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]);
}

function randomLane(dir) {
  return dir.x !== 0 ? randInt(0, GY - 1) : randInt(0, GX - 1);
}

function pickType() {
  const m = MODES[game.modeId];
  if (m.types) return pick(m.types);
  const L = effLevel();
  const w = {
    meteor: 34,
    drone:  20,
    sat:    8 + Math.min(14, L * 2),
    screw:  5 + Math.min(20, L * 2.5),
  };
  if (L >= BIG_FROM_LEVEL) {
    const nb = L - BIG_FROM_LEVEL;
    w.big      = Math.min(12, 3 + nb * 2);
    w.bigdrone = Math.min(8,  2 + nb);
    w.bigsat   = Math.min(8,  2 + nb);
    w.bigscrew = Math.min(6,  1 + Math.floor(nb / 2));
  }
  return weighted(w);
}
function fairLane(dir) {
  for (let i = 0; i < 8; i++) {
    const lane = randomLane(dir);
    const laneMid = lane * TILE + TILE / 2;
    if (dir.x !== 0) {
      const dist = dir.x > 0 ? player.x : W - player.x;
      if (Math.abs(laneMid - player.y) < TILE * 1.5 && dist < TILE * 3) continue;
    } else {
      const dist = dir.y > 0 ? player.y : H - player.y;
      if (Math.abs(laneMid - player.x) < TILE * 1.5 && dist < TILE * 3) continue;
    }
    return lane;
  }
  return randomLane(dir);
}

const director = {
  queue: [],
  timer: 1.1,

  reset() { this.queue.length = 0; this.timer = 1.1; },

  plan() {
    const m = MODES[game.modeId];
    const L = diffLevel();
    const salvo = Math.random() < Math.min(0.30, 0.04 + L * 0.03) * m.spawn;
    const extra = Math.min(3, Math.floor(L / 5));   // +1 débris par tranche de 5 niveaux
    const n = (salvo ? randInt(2, 3) : 1) + extra;
    const dir = randomDir();
    const type = (salvo && Math.random() < 0.6) ? 'meteor' : pickType();
    const speedBase = Math.min(85 + L * 15, 220) * m.speed;

    const used = new Set();
    let made = 0, guard = 0;
    while (made < n && guard++ < 14) {
      let lane = fairLane(dir);
      if (used.has(lane)) continue;
      used.add(lane);
      if (obstacles.length + this.queue.length >= MAX_OBST) break;
      this.queue.push({
        t: 0.45, lane, dir, type,
        speed: speedBase * OB_DEFS[type].speedMul * rand(0.9, 1.15),
      });
      made++;
    }
  },

  update(dt) {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.t -= dt;
      if (q.t <= 0) {
        obstacles.push(new Obstacle(q.type, q.dir, q.lane, q.speed));
        this.queue.splice(i, 1);
      }
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.plan();
      const m = MODES[game.modeId];
      const L = effLevel();
      const base = clamp(1.4 - L * 0.09, 0.40, 1.4) / m.spawn;
      this.timer = base * rand(0.75, 1.3);
    }
  },
};

/* ============================== ORBE (unique) ============================== */

const collectibles = [];
const pendingCols = [];

class Collectible {
  constructor(gx, gy) {
    this.gx = gx; this.gy = gy;
    this.t = Math.random() * 10;
  }
  get cx() { return this.gx * TILE + TILE / 2; }
  get cy() { return this.gy * TILE + TILE / 2; }
}

function freeCell() {
  for (let tries = 0; tries < 80; tries++) {
    const gx = randInt(0, GX - 1), gy = randInt(0, GY - 1);
    const cx = gx * TILE + TILE / 2, cy = gy * TILE + TILE / 2;
    if (Math.abs(cx - player.x) < 40 && Math.abs(cy - player.y) < 40) continue;
    const blocked = obstacles.some(o =>
      Math.abs(o.cx - cx) < o.hit / 2 + 40 && Math.abs(o.cy - cy) < o.hit / 2 + 40);
    if (blocked) continue;
    return { gx, gy };
  }
  return null;
}

function spawnCollectible() {
  const cell = freeCell();
  if (!cell) return false;
  collectibles.push(new Collectible(cell.gx, cell.gy));
  return true;
}

function updateCollectibles(dt) {
  for (const c of collectibles) c.t += dt;
  for (let i = pendingCols.length - 1; i >= 0; i--) {
    pendingCols[i].t -= dt;
    if (pendingCols[i].t <= 0) {
      if (spawnCollectible()) pendingCols.splice(i, 1);
      else pendingCols[i].t = 0.08;
    }
  }
  if (collectibles.length + pendingCols.length < 1) {
    pendingCols.push({ t: rand(0.08, 0.2) });   // filet de sécurité, rapide aussi
  }
}

/* ============================== ÉTAT DU JEU ============================== */

const game = {
  state: 'menu',       // 'menu' | 'playing' | 'dying' | 'over'
  modeId: 'classic',
  paused: false,
  score: 0, time: 0, picks: 0,
  combo: 1, comboT: 0,
  lives: 1,
  unloads: 0,          // appels de déchargement restants
  unloadCd: 0,         // recharge en cours
  lastLevel: 0,        // dernier palier de difficulté annoncé
  shake: 0, flash: 0, dieT: 0,
  overAt: 0, newRecord: false,
  bannerT: 0,
};

let starfield = null;
let decoObstacles = [];
let decoTimer = 0;
let currentPage = 'title';
let gameOptOpen = false;   // options en jeu ouvertes

/* --- Vaisseau de déchargement --- */
const ship = {
  active: false,
  phase: 'out',        // 'in' | 'stay' | 'out'
  t: 0,
  timer: 0,            // temps de stationnement restant
  x: 0, y: 0,
};

/* ============================== DOM ============================== */

const $ = id => document.getElementById(id);
const cabEl = document.querySelector('.cab');
const screenBox = document.querySelector('.screen');
const hudEl = document.querySelector('.hud');
const el = {
  score: $('hudScore'), time: $('hudTime'), best: $('hudBest'),
  combo: $('hudCombo'), comboVal: $('comboVal'), comboBar: $('comboBar'),
  titleCoins: $('titleCoins'), stationCoins: $('stationCoins'),
  challengeList: $('challengeList'), stationList: $('stationList'),
  optMusic: $('optMusic'), optSfx: $('optSfx'),
  btnHelp: $('btnHelp'), helpBox: $('helpBox'), btnReset: $('btnReset'),
  oPause: $('overlayPause'), oOver: $('overlayOver'),
  overTitle: $('overTitle'), overSub: $('overSub'),
  finalScore: $('finalScore'), newRecord: $('newRecord'),
  overStats: $('overStats'), coinsWon: $('coinsWon'),
  btnRetry: $('btnRetry'), btnMenu: $('btnMenu'),
  btnUnload: $('btnUnload'), unloadBadge: $('unloadBadge'),
  btnGameOpt: $('btnGameOpt'),
  overlayGameOpt: $('overlayGameOpt'),
  optMusic2: $('optMusic2'), optSfx2: $('optSfx2'),
  btnHelp2: $('btnHelp2'), helpBox2: $('helpBox2'),
  btnResume: $('btnResume'), btnQuitHome: $('btnQuitHome'),
  toast: $('toast'),
  pages: {
    title: $('page-title'), challenge: $('page-challenge'),
    station: $('page-station'), options: $('page-options'),
    achv: $('page-achv'),
  },
  challengeList: $('challengeList'), stationList: $('stationList'),
  achvList: $('achvList'), achvCount: $('achvCount'),
  btnUnload: $('btnUnload'), unloadBadge: $('unloadBadge'),
  livesIcons: $('livesIcons'), bagSquares: $('bagSquares'), bagCount: $('bagCount'),
  btnSnd: $('btnSnd'), sndIcon: $('sndIcon'),
  dpad: $('dpad'),
};

const hudCache = { score: -1, time: -1, best: -1, combo: -1, lives: -1 };

/** Vies : mini-robots (skin équipé) dans le bandeau haut. */
function renderLives() {
  const url = SPR.player.img.toDataURL();
  let html = '';
  for (let i = 0; i < game.lives; i++) html += '<img src="' + url + '" alt="">';
  el.livesIcons.innerHTML = html;
}

/** Sac : carrés + compteur dans le bandeau bas. */
const bagHud = { cap: -1, squares: [] };
function updateBagHud() {
  const cap = bagCapacity();
  if (cap !== bagHud.cap) {
    bagHud.cap = cap;
    el.bagSquares.innerHTML = '';
    bagHud.squares = [];
    for (let i = 0; i < cap; i++) {
      const s = document.createElement('span');
      s.className = 'bag-square';
      el.bagSquares.appendChild(s);
      bagHud.squares.push(s);
    }
  }
  for (let i = 0; i < cap; i++) {
    bagHud.squares[i].classList.toggle('full', i < player.bag);
  }
  el.bagCount.textContent = 'x' + player.bagsFull;
}

function updateHUD() {
  if (game.score !== hudCache.score) {
    const gained = game.score - hudCache.score;
    hudCache.score = game.score;
    el.score.textContent = pad6(game.score);
    if (gained >= 100) {              // punch uniquement pour une orbe (pas le drip)
      el.score.classList.remove('punch');
      void el.score.offsetWidth;
      el.score.classList.add('punch');
    }
  }
  const tt = Math.floor(game.time);
  if (tt !== hudCache.time) {
    hudCache.time = tt;
    el.time.textContent = fmtTime(tt);
  }
  const best = save.records[game.modeId] || 0;
  if (best !== hudCache.best) {
    hudCache.best = best;
    el.best.textContent = pad6(best);
  }
  const comboOn = game.combo > 1 && game.comboT > 0 && game.state === 'playing';
  el.combo.classList.toggle('hidden', !comboOn);
  if (comboOn) {
    if (game.combo !== hudCache.combo) {
      hudCache.combo = game.combo;
      el.comboVal.textContent = 'x' + game.combo;
    }
    el.comboBar.style.width = (game.comboT / COMBO_WINDOW * 100).toFixed(1) + '%';
  }
  if (game.lives !== hudCache.lives) {
    hudCache.lives = game.lives;
    renderLives();
  }
}

/** Icônes en jeu : déchargement (badge) + engrenage (visibilité). */
function updateUnloadButton() {
  const inGame = game.state === 'playing' && !game.paused && !gameOptOpen;
  el.btnGameOpt.classList.toggle('hidden', !inGame);
  el.dpad.classList.toggle('hidden', !inGame || !IS_TOUCH);
  const show = inGame && save.unloads > 0;
  el.btnUnload.classList.toggle('hidden', !show);
  if (!show) return;

  if (ship.active) {
    el.unloadBadge.textContent = '!';
    el.btnUnload.disabled = true;
  } else if (game.unloads <= 0) {
    el.unloadBadge.textContent = '0';
    el.btnUnload.disabled = true;
  } else if (game.unloadCd > 0) {
    el.unloadBadge.textContent = Math.ceil(game.unloadCd);
    el.btnUnload.disabled = true;
  } else {
    el.unloadBadge.textContent = game.unloads;
    el.btnUnload.disabled = false;
  }
}

/* ============================== CYCLE DE PARTIE ============================== */

function resetRun() {
  obstacles.length = 0;
  director.reset();
  collectibles.length = 0;
  pendingCols.length = 0;
  particles.length = 0;
  floaters.length = 0;
  Object.assign(game, {
    score: 0, time: 0, picks: 0,
    combo: 1, comboT: 0,
    lives: save.lives,
    unloads: save.unloads,
    unloadCd: 0,
    lastLevel: 0,
    shake: 0, flash: 0, dieT: 0,
    newRecord: false, paused: false,
    bannerT: 2.2,
  });
  hudCache.score = -1; hudCache.time = -1; hudCache.combo = -1;
  player.reset();
  dpadHeld.up = dpadHeld.down = dpadHeld.left = dpadHeld.right = false;
  document.querySelectorAll('.dpad-btn.held').forEach(b => b.classList.remove('held'));
  ship.active = false;
  ship.phase = 'out';
  ship.t = 0;
  spawnCollectible();
}

function startGame(modeId) {
  AU.ensure();
  setMode(modeId);
  resetRun();
  game.state = 'playing';
  gameOptOpen = false;
  el.overlayGameOpt.classList.add('hidden');
  for (const k in el.pages) el.pages[k].classList.add('hidden');
  el.oPause.classList.add('hidden');
  el.oOver.classList.add('hidden');
  cabEl.classList.remove('menu', 'home');
  currentPage = null;
  Music.start(true);
  SFX.start();
}

function endRun(success) {
  game.state = 'over';
  game.overAt = performance.now();
  Music.stop();
  ship.active = false;

  const m = MODES[game.modeId];
  let coinsWon = 0;
  if (m.coins) {
    coinsWon = Math.floor(game.time * COIN_PER_SEC) + game.picks * COIN_PER_ORB;
    save.coins += coinsWon;
    save.stats.coinsEarned += coinsWon;
    if (save.stats.coinsEarned >= 1000) unlockAchv('magnat');
    if (save.stats.coinsEarned >= 2000) unlockAchv('coins2k');
    if (save.stats.coinsEarned >= 5000) unlockAchv('coins5k');
  }
  if (!success) {
    save.stats.deaths++;
    if (save.stats.deaths === 1) unlockAchv('first-death');
  }

  const rec = save.records[game.modeId] || 0;
  if (game.score > rec) {
    save.records[game.modeId] = game.score;
    game.newRecord = true;
  }
  saveSave();

  el.overTitle.textContent = success ? 'MISSION RÉUSSIE' : 'GAME OVER';
  el.overTitle.classList.toggle('success', !!success);
  el.overSub.textContent = success ? 'CHRONO TERMINÉ' : 'COLLISION AVEC UN DÉBRIS SPATIAL';
  el.finalScore.textContent = pad6(game.score);
  el.newRecord.classList.toggle('hidden', !game.newRecord);
  el.overStats.textContent = 'TEMPS ' + fmtTime(game.time) + ' · ORBES ' + game.picks
                            + ' · NIVEAU ' + (diffLevel() + 1)
                            + ' · SACS ' + player.bagsFull;
                            + ' · SURVIE +' + Math.floor(game.time * 2) + ' PTS';

  if (m.coins) {
    el.coinsWon.innerHTML =
      '<i class="coin"></i>+' + coinsWon + ' PIÈCES';
    el.coinsWon.classList.remove('nocoins');
  } else {
    el.coinsWon.innerHTML = 'PIÈCES : MISSION LIBRE UNIQUEMENT';
    el.coinsWon.classList.add('nocoins');
  }

  el.oOver.classList.remove('hidden');
}

function pickup(c) {
  game.picks++;
  game.combo = game.comboT > 0 ? Math.min(COMBO_MAX, game.combo + 1) : 1;
  game.comboT = COMBO_WINDOW;
  const m = MODES[game.modeId];
  const pts = ORB_POINTS * (m.orbMul || 1) * game.combo;

  game.score += pts;
  burst(c.cx, c.cy, ['#6fe3f2', '#c9f6ff', '#2a8fb5'], 14);
  addFloater(c.cx, c.cy - 18, '+' + pts + (game.combo > 1 ? ' x' + game.combo : ''), '#6fe3f2');
  SFX.pickup(game.combo);

  // Succès
  save.stats.orbs++;
  if (save.stats.orbs === 1)   unlockAchv('first-orb');
  if (save.stats.orbs === 50)  unlockAchv('orbs50');
  if (save.stats.orbs === 200) unlockAchv('orbs200');
  if (game.combo >= COMBO_MAX) unlockAchv('combo5');
  if (game.score >= 10000)     unlockAchv('score10k');

  if (player.addOrb()) {
    addFloater(player.x, player.y - 26, 'SAC PLEIN · VITESSE -' + BAG_SLOW, '#ffd94a');
    SFX.bagFull();
    if (player.bagsFull >= 3) unlockAchv('bags3');
  }

  collectibles.splice(collectibles.indexOf(c), 1);
  pendingCols.push({ t: rand(0.04, 0.12) });
}

function hitObstacle() {
  game.lives--;
  explodeSprite(SPR.player, player.x, player.y);
  SFX.hit();

  if (game.lives <= 0) {
    game.state = 'dying';
    game.dieT = 0;
    game.shake = 0.55;
    game.flash = 0.7;
    director.queue.length = 0;
    SFX.over();
  } else {
    player.inv = 2.5;              // invincibilité, le robot reste sur place
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (Math.hypot(o.cx - player.x, o.cy - player.y) < 110) {
        burst(o.cx, o.cy, ['#ff9d3b', '#5c6f85'], 6);
        obstacles.splice(i, 1);
      }
    }
    game.shake = 0.4;
    game.flash = 0.45;
    addFloater(player.x, player.y - 34,
      'VIE PERDUE · ' + game.lives + (game.lives > 1 ? ' RESTANTES' : ' RESTANTE'), '#ff6b4a');
  }
}

function checkCollisions() {
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    const dx = c.cx - player.x, dy = c.cy - player.y;
    if (dx * dx + dy * dy < 20 * 20) pickup(c);
  }
  if (player.inv > 0) return;
  const ph = 9;
  for (const o of obstacles) {
    const oh = o.hit / 2;
    if (Math.abs(o.cx - player.x) < oh + ph && Math.abs(o.cy - player.y) < oh + ph) {
      hitObstacle();
      return;
    }
  }
}

/* ============================== DÉCHARGEMENT ============================== */

function callUnload() {
  if (game.state !== 'playing' || game.paused || gameOptOpen) return;
  if (game.unloads <= 0) {
    addFloater(player.x, player.y - 26, 'ÉPUISÉ', '#ff6b4a');
    return;
  }
  if (ship.active) return;
  if (game.unloadCd > 0) {
    addFloater(player.x, player.y - 26, 'RECHARGE ' + Math.ceil(game.unloadCd) + 'S', '#ff6b4a');
    return;
  }
  if (player.bagsFull === 0 && player.bag === 0) {
    addFloater(player.x, player.y - 26, 'RIEN À DÉCHARGER', '#ff6b4a');
    return;
  }
  game.unloadCd = UNLOAD_CD;
  ship.active = true;
  ship.phase = 'in';
  ship.t = 0;
  ship.timer = UNLOAD_STAY;
  ship.x = W / 2;
  ship.y = -70;
  addFloater(W / 2, H / 2 - 70, 'VAISSEAU DE DÉCHARGEMENT EN APPROCHE', '#6fe3f2');
  SFX.summon();
}

function doUnloadDeposit() {
  game.unloads--;  
  const gained = player.bagsFull;
  player.bagsFull = 0;
  player.bag = 0;
  player.cargo = [];
  player.bags = []; 
  player.speed = SPEED_START;          // retour à la vitesse de base
  burst(ship.x, ship.y, ['#ffd94a', '#6fe3f2', '#fff3c4', '#c9982a'], 30, 140);
  addFloater(ship.x, ship.y - 54, 'SACS DÉPOSÉS' + (gained > 0 ? ' · ' + gained : ''), '#ffd94a');
  addFloater(ship.x, ship.y - 38, 'VITESSE MAXIMUM', '#6fe3f2');
  SFX.deposit();
  unlockAchv('first-drop');
  ship.phase = 'out';
  ship.t = 0;
}

function updateShip(dt) {
  if (game.unloadCd > 0) game.unloadCd = Math.max(0, game.unloadCd - dt);
  if (!ship.active) return;
  ship.t += dt;

  if (ship.phase === 'in') {
    const k = Math.min(1, ship.t / 1.2);
    const e = 1 - (1 - k) * (1 - k);   // arrivée en douceur
    ship.x = W / 2;
    ship.y = lerp(-70, H / 2, e);
    if (k >= 1) { ship.phase = 'stay'; ship.t = 0; }
  }
  else if (ship.phase === 'stay') {
    ship.timer -= dt;
    ship.y = H / 2 + Math.round(Math.sin(ship.t * 2) * 3);   // léger flottement
    if (game.state === 'playing' &&
        Math.hypot(player.x - ship.x, player.y - ship.y) < UNLOAD_RANGE) {
      doUnloadDeposit();
    } else if (ship.timer <= 0) {
      addFloater(ship.x, ship.y - 50, 'VAISSEAU REPARTI · DÉPÔT MANQUÉ', '#9db4c9');
      ship.phase = 'out';
      ship.t = 0;
    }
  }
  else { // 'out'
    ship.y += (80 + ship.t * 500) * dt;
    if (ship.y > H + 100) ship.active = false;
  }
}

/* --- D-pad tactile : déplace la cible du robot --- */
const dpadHeld = { up: false, down: false, left: false, right: false };

function dpadMove(dt) {
  if (!IS_TOUCH || game.state !== 'playing' || game.paused || gameOptOpen) return;
  let dx = 0, dy = 0;
  if (dpadHeld.left)  dx -= 1;
  if (dpadHeld.right) dx += 1;
  if (dpadHeld.up)    dy -= 1;
  if (dpadHeld.down)  dy += 1;
  if (!dx && !dy) return;
  const n = Math.hypot(dx, dy);   // diagonales à vitesse identique
  player.tx = clamp(player.tx + dx / n * DPAD_SPEED * dt, 16, W - 16);
  player.ty = clamp(player.ty + dy / n * DPAD_SPEED * dt, 16, H - 16);
}

/* ============================== MISE À JOUR ============================== */

function updateTitleDeco(dt) {
  decoTimer -= dt;
  if (decoTimer <= 0 && decoObstacles.length < 6) {
    const dir = randomDir();
    decoObstacles.push(new Obstacle(
      pick(['meteor', 'drone', 'sat', 'screw', 'big', 'bigdrone', 'bigsat']),
      dir, randomLane(dir), rand(25, 55)
    ));
    decoTimer = rand(0.8, 2.0);
  }
  for (const o of decoObstacles) o.update(dt);
  decoObstacles = decoObstacles.filter(o => !o.dead);
}

function update(dt) {
  if (game.paused) return;
  starfield.update(dt);

  if (game.state === 'menu') {
    updateTitleDeco(dt);
  }
  else if (game.state === 'playing') {
    game.time += dt;
    if (game.bannerT > 0) game.bannerT -= dt;
    // Points de survie : 1 point par 0,5 seconde
    game.surviveAcc = (game.surviveAcc || 0) + dt;
    if (game.surviveAcc >= 0.5) {
      const pts = Math.floor(game.surviveAcc / 0.5);
      game.score += pts;
      game.surviveAcc -= pts * 0.5;
    }
    if (game.time >= 120) unlockAchv('survive2');
    if (game.time >= 240) unlockAchv('survive5');
    if (game.time >= 420) unlockAchv('survive10');
    if (game.score >= 5000)  unlockAchv('score10k');
    if (game.score >= 12000) unlockAchv('score25k');
    if (game.score >= 25000) unlockAchv('score50k');

    const m = MODES[game.modeId];
    if (m.timeLimit && game.time >= m.timeLimit) {
      endRun(true);
      return;
    }

    // Palier de difficulté atteint ? (toutes les 20 secondes)
    const L = diffLevel();
    if (L > game.lastLevel) {
      game.lastLevel = L;
      addFloater(W / 2, 36, 'NIVEAU ' + (L + 1), '#ffd94a');
      SFX.levelup();
      if (L + 1 >= 10) unlockAchv('level10');
    }

    dpadMove(dt);
    player.update(dt);
    updateShip(dt);
    director.update(dt);
    for (const o of obstacles) o.update(dt);
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].dead) obstacles.splice(i, 1);
    }
    updateCollectibles(dt);

    if (game.comboT > 0) {
      game.comboT -= dt;
      if (game.comboT <= 0) game.combo = 1;
    }
    checkCollisions();
  }
  else if (game.state === 'dying') {
    game.dieT += dt;
    updateShip(dt * 0.25);
    for (const o of obstacles) o.update(dt * 0.25);
    if (game.dieT > 1.0) endRun(false);
  }

  updateParticles(dt);
  updateFloaters(dt);
  game.shake = Math.max(0, game.shake - dt * 1.6);
  game.flash = Math.max(0, game.flash - dt * 2.2);
}

/* ============================== RENDU ============================== */

function drawGrid() {
  // Cadre de l'écran
  ctx.fillStyle = 'rgba(111,227,242,0.16)';
  ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2);
  ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H);
  // Coins renforcés
  ctx.fillStyle = 'rgba(111,227,242,0.55)';
  ctx.fillRect(0, 0, 10, 3);          ctx.fillRect(0, 0, 3, 10);
  ctx.fillRect(W - 10, 0, 10, 3);     ctx.fillRect(W - 3, 0, 3, 10);
  ctx.fillRect(0, H - 3, 10, 3);      ctx.fillRect(0, H - 10, 3, 10);
  ctx.fillRect(W - 10, H - 3, 10, 3); ctx.fillRect(W - 3, H - 10, 3, 10);
}

function drawChevron(px, py, quarter, color) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(quarter * Math.PI / 2);
  ctx.fillStyle = color;
  ctx.fillRect(-9, -5, 3, 10);
  ctx.fillRect(-5, -3, 3, 6);
  ctx.fillRect(-1, -1, 3, 2);
  ctx.restore();
}

function drawMarkers(t) {
  for (const q of director.queue) {
    if (Math.sin(t * 16 + q.lane) < -0.3) continue;
    const col = '#ff9d3b';
    // Les gros débris sont centrés sur 2 cases
    const big = (OB_DEFS[q.type].size || 1) > 1;
    const mid = q.lane * TILE + (big ? TILE : TILE / 2);
    if (q.dir.x > 0)      drawChevron(14, mid, 0, col);
    else if (q.dir.x < 0) drawChevron(W - 14, mid, 2, col);
    else if (q.dir.y > 0) drawChevron(mid, 14, 1, col);
    else                  drawChevron(mid, H - 14, 3, col);
  }
}

function drawFlame(x, y, w, h) {
  if (h <= 0) return;
  ctx.fillStyle = '#ff9d3b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(x + 1, y, w - 2, Math.max(1, h - 2));
}

function drawPlayer(t) {
    // Sacs pleins : grosses caisses dorées, embarquées jusqu'au déchargement
  for (const s of player.bags) {
    const bx = Math.round(s.x), by = Math.round(s.y);
    ctx.fillStyle = '#8a6a14';
    ctx.fillRect(bx - 6, by - 6, 12, 12);
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(bx - 5, by - 5, 10, 10);
    ctx.fillStyle = '#8a6a14';           // renforts en croix
    ctx.fillRect(bx - 1, by - 6, 2, 12);
    ctx.fillRect(bx - 6, by - 1, 12, 2);
  }
  for (const s of player.cargo) {
    ctx.fillStyle = '#c9982a';
    ctx.fillRect(Math.round(s.x) - 3, Math.round(s.y) - 3, 6, 6);
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4);
  }

  const blink = player.inv > 0 && Math.sin(t * 24) > 0;
  if (blink) return;

  const bob = Math.round(Math.sin(t * 2.4) * 1.5);
  const px = Math.round(player.x - TILE / 2);
  const py = Math.round(player.y - TILE / 2) + bob - 1;
  ctx.drawImage(SPR.player.img, px, py, TILE, TILE);

  const k = player.speed / SPEED_START;
  const moving = Math.hypot(player.tx - player.x, player.ty - player.y) > 4;
  const f1 = Math.sin(t * 22) > 0 ? 1 : 0;
  const len = 2 + (moving ? 1 + Math.round(k * 2) : 0);
  drawFlame(px + 10, py + 29, 4, len + f1 * 2);
  drawFlame(px + 18, py + 29, 4, len + (1 - f1) * 2);
}

function drawCollectible(c, t) {
  const spr = Math.floor(c.t * 6) % 2 === 0 ? SPR.orbA : SPR.orbB;
  drawSprite(spr, c.cx, c.cy);
  const k1 = Math.sin(t * 3.1 + c.t * 5);
  const k2 = Math.sin(t * 2.6 + c.t * 8 + 2);
  ctx.fillStyle = '#ffffff';
  if (k1 > 0.6) {
    const x = Math.round(c.cx - 13), y = Math.round(c.cy - 10);
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
  }
  if (k2 > 0.6) {
    const x = Math.round(c.cx + 12), y = Math.round(c.cy + 11);
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
  }
  ctx.globalAlpha = 1;
}

function drawReticle(t) {
  if (game.state === 'menu' || game.paused) return;
  const tap = Math.sin(t * 6) > 0.6 ? 1 : 0;    // petit « toc » du doigt, discret
  const x = Math.round(player.tx) - 7;          // le bout du gant pointe la position exacte
  const y = Math.round(player.ty) - 1 + tap;
  ctx.drawImage(SPR.cursor.img, x, y, 16, 16);
}

/** Zone de dépôt marquée par 4 crochets autour du centre. */
function drawLandingZone(t) {
  const cx = W / 2, cy = H / 2, r = 46;
  const a = ship.phase === 'stay' ? 0.28 + 0.2 * Math.sin(t * 6) : 0.5;
  ctx.fillStyle = 'rgba(111,227,242,' + a.toFixed(3) + ')';
  ctx.fillRect(cx - r, cy - r, 12, 2);      ctx.fillRect(cx - r, cy - r, 2, 12);
  ctx.fillRect(cx + r - 12, cy - r, 12, 2); ctx.fillRect(cx + r - 2, cy - r, 2, 12);
  ctx.fillRect(cx - r, cy + r - 2, 12, 2);  ctx.fillRect(cx - r, cy + r - 12, 2, 12);
  ctx.fillRect(cx + r - 12, cy + r - 2, 12, 2); ctx.fillRect(cx + r - 2, cy + r - 12, 2, 12);
}

function drawShip(t) {
  if (!ship.active) return;
  const S = TILE * 2;   // le vaisseau fait 2 cases
  const x = Math.round(ship.x - S / 2);
  const y = Math.round(ship.y - S / 2);

  if (ship.phase === 'stay') {
    const w = 60;
    const k = clamp(ship.timer / UNLOAD_STAY, 0, 1);
    ctx.fillStyle = '#152234';
    ctx.fillRect(Math.round(ship.x - w / 2), y - 12, w, 4);
    ctx.fillStyle = ship.timer < 2.5 ? '#ff6b4a' : '#ffd94a';
    ctx.fillRect(Math.round(ship.x - w / 2), y - 12, Math.round(w * k), 4);
  }

  ctx.drawImage(SPR.ship.img, x, y, S, S);

  if (Math.sin(t * 9) > 0) {
    ctx.fillStyle = '#6fe3f2';
    ctx.fillRect(Math.round(ship.x) - 1, y + 3, 3, 3);
  }
  if (ship.phase !== 'stay') {
    const f = Math.sin(t * 26) > 0 ? 2 : 0;
    drawFlame(x + 12, y + S, 8, 8 + f);
    drawFlame(x + 44, y + S, 8, 8 + (2 - f));
  }
}

function drawBanner() {
  if (game.bannerT <= 0 || game.state !== 'playing') return;
  const m = MODES[game.modeId];
  ctx.globalAlpha = Math.min(1, game.bannerT / 0.4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffd94a';
  ctx.fillText(m.name, W / 2, H * 0.3);
  if (m.timeLimit) {
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#6fe3f2';
    ctx.fillText(m.timeLimit + ' SECONDES', W / 2, H * 0.3 + 16);
  }
  ctx.globalAlpha = 1;
}

function render() {
  const t = performance.now() / 1000;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#060a13';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (game.shake > 0) {
    const s = game.shake * game.shake * 9;
    ctx.translate(Math.round(rand(-s, s)), Math.round(rand(-s, s)));
  }

  starfield.draw(t);
  drawGrid();

  if (game.state === 'menu') {
    for (const o of decoObstacles) o.draw(0.5);
  } else {
    drawMarkers(t);
    for (const c of collectibles) drawCollectible(c, t);
    for (const o of obstacles) o.draw();
    if (ship.active) { drawLandingZone(t); drawShip(t); }
    if (game.state === 'playing') drawPlayer(t);
  }

  drawParticles();
  drawFloaters();
  ctx.restore();

  drawReticle(t);
  drawBanner();

  if (game.flash > 0) {
    ctx.globalAlpha = Math.min(0.75, game.flash);
    ctx.fillStyle = '#eaf2ff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

/* ============================== PAGES / BOUTIQUE ============================== */

let toastTimer = null;

function toast(text) {
  el.toast.textContent = text;
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 2000);
}

function showPage(id) {
  game.state = 'menu';
  currentPage = id;
  gameOptOpen = false;
  for (const k in el.pages) el.pages[k].classList.toggle('hidden', k !== id);
  el.oPause.classList.add('hidden');
  el.oOver.classList.add('hidden');
  el.overlayGameOpt.classList.add('hidden');
  cabEl.classList.add('menu');
  cabEl.classList.toggle('home', id === 'title');
  Music.stop();
  if (id === 'title')     el.titleCoins.textContent = save.coins;
  if (id === 'challenge') renderChallengeList();
  if (id === 'station')   renderStation();
  if (id === 'achv')      renderAchv();
}

function renderChallengeList() {
  const list = el.challengeList;
  list.innerHTML = '';
  for (const id in MODES) {
    if (id === 'classic') continue;
    const m = MODES[id];
    const card = document.createElement('div');
    card.className = 'card';

    const head = document.createElement('div');
    head.className = 'card-head';
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = m.name;
    const rec = document.createElement('span');
    rec.className = 'card-rec';
    rec.textContent = 'REC ' + pad6(save.records[id] || 0);
    head.appendChild(name); head.appendChild(rec);

    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = m.desc + ' GRILLE ' + m.gx + 'X' + m.gy + '.';

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm card-btn';
    btn.type = 'button';
    btn.textContent = 'LANCER';
    btn.addEventListener('click', () => startGame(id));

    card.appendChild(head); card.appendChild(desc); card.appendChild(btn);
    list.appendChild(card);
  }
}

function renderAchv() {
  const list = el.achvList;
  list.innerHTML = '';
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    const got = save.achv.includes(a.id);
    if (got) n++;

    const row = document.createElement('div');
    row.className = 'achv-item ' + (got ? 'unlocked' : 'locked');

    const img = document.createElement('img');
    img.className = 'achv-img';
    img.src = SPR[a.icon].img.toDataURL();
    img.alt = '';

    const info = document.createElement('div');
    info.className = 'achv-info';
    const nm = document.createElement('span');
    nm.className = 'achv-name';
    nm.textContent = a.name;
    const ds = document.createElement('span');
    ds.className = 'achv-desc';
    ds.textContent = a.desc;
    info.appendChild(nm); info.appendChild(ds);

    const check = document.createElement('span');
    check.className = 'achv-check';
    check.textContent = got ? 'OK' : '--';

    row.appendChild(img); row.appendChild(info); row.appendChild(check);
    list.appendChild(row);
  }
  el.achvCount.textContent = n + '/' + ACHIEVEMENTS.length + ' DÉBLOQUÉS';
}

function shopRow(list, imgURL, name, desc, btnSpec) {
  const row = document.createElement('div');
  row.className = 'shop-item';
  const img = document.createElement('img');
  img.className = 'shop-img';
  img.src = imgURL;
  img.alt = '';
  const info = document.createElement('div');
  info.className = 'shop-info';
  const nm = document.createElement('span');
  nm.className = 'shop-name';
  nm.textContent = name;
  const ds = document.createElement('span');
  ds.className = 'shop-desc';
  ds.textContent = desc;
  info.appendChild(nm); info.appendChild(ds);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-sm';
  btn.textContent = btnSpec.label;
  if (btnSpec.equipped) btn.classList.add('equipped');
  if (btnSpec.disabled) btn.disabled = true;
  if (btnSpec.onClick) btn.addEventListener('click', btnSpec.onClick);
  row.appendChild(img); row.appendChild(info); row.appendChild(btn);
  list.appendChild(row);
}

function shopSection(list, title) {
  const h = document.createElement('p');
  h.className = 'shop-section';
  h.textContent = title;
  list.appendChild(h);
}

function renderStation() {
  const list = el.stationList;
  list.innerHTML = '';
  el.stationCoins.textContent = save.coins;

  /* --- 1. Vies --- */
  shopSection(list, 'VIES DE SECOURS');
  {
    const maxed = save.lives >= 6;
    const price = maxed ? 0 : PRICE_LIVES[save.lives - 1];
    shopRow(list, SPR.heart.img.toDataURL(),
      'VIES DE SECOURS · ' + save.lives + '/6',
      'Repartez du centre après une collision. Vies par mission : ' + save.lives + '.',
      maxed ? { label: 'MAX', equipped: true } : {
        label: 'ACHETER · ' + price,
        disabled: save.coins < price,
        onClick: () => {
          if (save.coins < price) { toast('PAS ASSEZ DE PIÈCES'); return; }
          save.coins -= price;
          save.lives++;
          unlockAchv('buy-life');
          if (save.lives >= 6) unlockAchv('max-lives');
          saveSave();
          SFX.buy();
          toast('VIE AJOUTÉE · ' + save.lives + '/6');
          renderStation();
        },
      });
  }

  /* --- 2. Sac --- */
  shopSection(list, 'SAC DE RÉCOLTE');
  {
    const maxed = save.bagLv >= 5;
    const price = maxed ? 0 : PRICE_BAG[save.bagLv];
    shopRow(list, SPR.crate.img.toDataURL(),
      'SAC DE RÉCOLTE · ' + bagCapacity() + '/10 PLACES',
      'Un sac plus grand demande plus d\'orbes pour être plein : le robot garde sa vitesse plus longtemps.',
      maxed ? { label: 'MAX', equipped: true } : {
        label: 'ACHETER · ' + price,
        disabled: save.coins < price,
        onClick: () => {
          if (save.coins < price) { toast('PAS ASSEZ DE PIÈCES'); return; }
          save.coins -= price;
          save.bagLv++;
          unlockAchv('buy-bag');
          if (save.bagLv >= 5) unlockAchv('max-bag');
          saveSave();
          SFX.buy();
          toast('SAC AGRANDI · ' + bagCapacity() + ' PLACES');
          renderStation();
        },
      });
  }

  /* --- 3. Déchargement --- */
  shopSection(list, 'DÉCHARGEMENT');
  {
    const maxed = save.unloads >= 5;
    const price = maxed ? 0 : PRICE_UNLOAD[save.unloads];
    shopRow(list, SPR.ship.img.toDataURL(),
      'DÉCHARGEMENT · ' + save.unloads + '/5',
      'Appelle un vaisseau allié qui se pose au centre de la carte. Touchez-le pour déposer tous vos sacs et retrouver la vitesse maximale. ' +
      save.unloads + ' appel' + (save.unloads > 1 ? 's' : '') + ' par mission, recharge de ' + UNLOAD_CD + ' s. En jeu : touche E ou l\'icône en bas à droite.',
      maxed ? { label: 'MAX', equipped: true } : {
        label: 'ACHETER · ' + price,
        disabled: save.coins < price,
        onClick: () => {
          if (save.coins < price) { toast('PAS ASSEZ DE PIÈCES'); return; }
          save.coins -= price;
          save.unloads++;
          unlockAchv('buy-unload');
          if (save.unloads >= 5) unlockAchv('max-unload');
          saveSave();
          SFX.buy();
          toast('DÉCHARGEMENT · ' + save.unloads + '/5 APPELS PAR MISSION');
          renderStation();
        },
      });
  }

  /* --- 4. Robots (en dernier) --- */
  shopSection(list, 'MODÈLES DE ROBOT');
  for (const sk of SKINS) {
    const url = buildSprite(PLAYER_ROWS, sk.pal).img.toDataURL();
    const owned = save.owned.includes(sk.id);
    const equipped = save.skin === sk.id;
    let spec;
    if (equipped) {
      spec = { label: 'ÉQUIPÉ', equipped: true };
    } else if (owned) {
      spec = { label: 'ÉQUIPER', onClick: () => {
        save.skin = sk.id;
        rebuildPlayerSprite();
        saveSave();
        SFX.blip();
        toast('ROBOT ÉQUIPÉ');
        renderStation();
      }};
    } else {
      const can = save.coins >= sk.price;
      spec = {
        label: (sk.price === 0 ? 'GRATUIT' : 'ACHETER · ' + sk.price),
        disabled: !can,
        onClick: () => {
          if (save.coins < sk.price) { toast('PAS ASSEZ DE PIÈCES'); return; }
          save.coins -= sk.price;
          save.owned.push(sk.id);
          if (save.owned.length >= SKINS.length) unlockAchv('all-skins');
          save.skin = sk.id;
          rebuildPlayerSprite();
          saveSave();
          SFX.buy();
          toast('ROBOT ACQUIS ET ÉQUIPÉ');
          renderStation();
        },
      };
    }
    shopRow(list, url, sk.name, sk.desc + (sk.price ? ' PRIX : ' + sk.price + ' PIÈCES.' : ''), spec);
  }
}

/* --- Options (menu principal + en jeu, synchronisées) --- */

function syncOptions() {
  el.optMusic.value  = Math.round(save.volMusic * 100);
  el.optSfx.value    = Math.round(save.volSfx * 100);
  el.optMusic2.value = Math.round(save.volMusic * 100);
  el.optSfx2.value   = Math.round(save.volSfx * 100);
}

function bindVolume(input, key) {
  input.addEventListener('input', () => {
    save[key] = input.value / 100;
    saveSave();
    AU.applyVol();
    syncOptions();
    if (key === 'volSfx') { AU.ensure(); SFX.blip(); }
  });
}
bindVolume(el.optMusic,  'volMusic');
bindVolume(el.optMusic2, 'volMusic');
bindVolume(el.optSfx,    'volSfx');
bindVolume(el.optSfx2,   'volSfx');

el.btnHelp.addEventListener('click',  () => el.helpBox.classList.toggle('hidden'));
el.btnHelp2.addEventListener('click', () => el.helpBox2.classList.toggle('hidden'));

let resetArmed = false, resetTimer = null;

function doResetSave() {
  // Sauvegarde neuve, construite explicitement (aucune dépendance à DEFAULT_SAVE)
  save = {
    coins: 0,
    lives: 1,
    bagLv: 0,
    unloads: 0,
    skin: 'default',
    owned: ['default'],
    records: {},
    achv: [],
    stats: { orbs: 0, deaths: 0, coinsEarned: 0 },
    volMusic: save.volMusic,   // les volumes sont conservés
    volSfx: save.volSfx,
  };
  saveSave();
  try { localStorage.removeItem(LEGACY_BEST_KEY); } catch (e) {}   // ancienne clé v1
  AU.applyVol();
  rebuildPlayerSprite();
  syncOptions();
  hudCache.best = -1;
  setMode('classic');
  toast('SAUVEGARDE EFFACÉE');
  SFX.blip();
}

el.btnReset.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    SFX.uiConfirm();
    el.btnReset.textContent = 'CONFIRMER L\'EFFACEMENT ?';
    el.btnReset.classList.add('armed');
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      resetArmed = false;
      el.btnReset.textContent = 'RÉINITIALISER LA SAUVEGARDE';
      el.btnReset.classList.remove('armed');
    }, 3000);
    return;
  }
  clearTimeout(resetTimer);
  resetArmed = false;
  el.btnReset.textContent = 'RÉINITIALISER LA SAUVEGARDE';
  el.btnReset.classList.remove('armed');
  SFX.uiReset();
  doResetSave();
});

/* ============================== OPTIONS EN JEU ============================== */

function openGameOptions() {
  if (game.state !== 'playing') return;
  gameOptOpen = true;
  game.paused = true;
  el.oPause.classList.add('hidden');
  el.helpBox2.classList.add('hidden');
  syncOptions();
  el.overlayGameOpt.classList.remove('hidden');
  Music.stop();
  SFX.blip();
}

function closeGameOptions(resume) {
  gameOptOpen = false;
  el.overlayGameOpt.classList.add('hidden');
  if (resume && game.state === 'playing') {
    game.paused = false;
    Music.start();
  }
}

function quitToHome() {
  closeGameOptions(false);
  setMode('classic');
  showPage('title');
}

el.btnGameOpt.addEventListener('click', e => {
  e.stopPropagation();
  AU.ensure();
  openGameOptions();
});
el.btnResume.addEventListener('click',   () => closeGameOptions(true));
el.btnQuitHome.addEventListener('click', () => quitToHome());

/* ============================== ENTRÉES ============================== */

function action() {
  if (game.state === 'menu' && currentPage === 'title') startGame('classic');
  else if (game.state === 'over' && performance.now() - game.overAt > 600) startGame(game.modeId);
}

function togglePause() {
  if (game.state !== 'playing' || gameOptOpen) return;
  game.paused = !game.paused;
  el.oPause.classList.toggle('hidden', !game.paused);
  if (game.paused) Music.stop(); else Music.start();
  SFX.blip();
}

function toggleSound() {
  AU.ensure();
  AU.muted = !AU.muted;
  AU.applyVol();
  el.sndIcon.textContent = AU.muted ? '🔇' : '🔊';
  toast(AU.muted ? 'SON COUPÉ' : 'SON ACTIVÉ');
  if (!AU.muted) SFX.blip();
}

window.addEventListener('keydown', e => {
  AU.ensure();
  if (e.code === 'Space') { e.preventDefault(); action(); return; }
  if (e.code === 'KeyE')  { callUnload(); return; }
  if (e.code === 'KeyP')  {
    if (gameOptOpen) closeGameOptions(true);
    else togglePause();
    return;
  }
  if (e.code === 'KeyM')  { toggleSound(); return; }
  if (e.code === 'Escape') {
    if (gameOptOpen) { closeGameOptions(true); return; }
    if (game.state === 'playing') togglePause();
    else if (game.state === 'menu' && currentPage !== 'title') showPage('title');
  }
});

/* Souris : la position est convertie en coordonnées canvas.
   On ignore les événements venant des petits boutons en jeu
   (sinon le robot irait se coller à l'icône quand on la survole). */
function setTarget(e) {
  if (e.pointerType && e.pointerType !== 'mouse') return;   // tactile : contrôle au d-pad
  if (e.target && e.target.closest && e.target.closest('.screen-btn, .dpad')) return;
  const r = canvas.getBoundingClientRect();
  player.tx = clamp((e.clientX - r.left) * (W / r.width), 16, W - 16);
  player.ty = clamp((e.clientY - r.top) * (H / r.height), 16, H - 16);
}
window.addEventListener('pointermove', setTarget);
window.addEventListener('pointerdown', setTarget);

window.addEventListener('blur', () => {
  if (game.state === 'playing' && !game.paused && !gameOptOpen) togglePause();
});

/* Boutons des menus */
 $('btnPlay').addEventListener('click',      () => { AU.ensure(); startGame('classic'); });
 $('btnChallenge').addEventListener('click', () => { AU.ensure(); showPage('challenge'); });
 $('btnStation').addEventListener('click',   () => { AU.ensure(); showPage('station'); });
 $('btnOptions').addEventListener('click',   () => { AU.ensure(); showPage('options'); });
 $('backChallenge').addEventListener('click', () => showPage('title'));
 $('backStation').addEventListener('click',   () => showPage('title'));
 $('backOptions').addEventListener('click',   () => showPage('title'));
 $('btnAchv').addEventListener('click',   () => { AU.ensure(); showPage('achv'); });
 $('backAchv').addEventListener('click',  () => showPage('title'));

/* --- D-pad tactile : initialisation et événements --- */
(function bindDpad() {
  const pad = $('dpad');
  if (!pad) return;
  const url = SPR.arrow.img.toDataURL();
  pad.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.style.backgroundImage = 'url(' + url + ')';
    const dir = btn.dataset.dir;
    const release = () => {
      dpadHeld[dir] = false;
      btn.classList.remove('held');
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      AU.ensure();
      dpadHeld[dir] = true;
      btn.classList.add('held');
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });
})();

/* Bruitages de navigation */
function bindSound(idOrEl, fn) {
  const b = typeof idOrEl === 'string' ? $(idOrEl) : idOrEl;
  if (!b) return;
  b.addEventListener('click', () => { AU.ensure(); fn(); });
}
bindSound('btnPlay',       () => SFX.uiTap());
bindSound('btnChallenge',  () => SFX.uiTap());
bindSound('btnStation',    () => SFX.uiTap());
bindSound('btnOptions',    () => SFX.uiTap());
bindSound('btnAchv',       () => SFX.uiTap());
bindSound('backChallenge', () => SFX.uiBack());
bindSound('backStation',   () => SFX.uiBack());
bindSound('backOptions',   () => SFX.uiBack());
bindSound('backAchv',      () => SFX.uiBack());
bindSound(el.btnRetry,     () => SFX.uiTap());
bindSound(el.btnMenu,      () => SFX.uiBack());
bindSound(el.btnHelp,      () => SFX.uiTap());
bindSound(el.btnHelp2,     () => SFX.uiTap());
bindSound(el.btnResume,    () => SFX.uiBack());
bindSound(el.btnQuitHome,  () => SFX.uiBack());

/* Icône déchargement */
el.btnUnload.addEventListener('click', e => {
  e.stopPropagation();
  AU.ensure();
  callUnload();
});

/* Icône son (pied de page) */
el.btnSnd.addEventListener('click', () => { AU.ensure(); toggleSound(); });

/* Fin de partie */
el.btnRetry.addEventListener('click', () => { AU.ensure(); startGame(game.modeId); });
el.btnMenu.addEventListener('click', e => {
  e.stopPropagation();
  setMode('classic');
  showPage('title');
});
el.oOver.addEventListener('click', () => { AU.ensure(); action(); });

/* ============================ SCANLINES ============================ */

(function makeScanlines() {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 3;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 2, 1, 1);
  document.querySelector('.scanlines').style.backgroundImage = 'url(' + c.toDataURL() + ')';
})();

/* Favicon  */
(function makeFavicon() {
  const src = buildSprite(PLAYER_ROWS, SKINS[0].pal).img;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#060a13';
  g.fillRect(0, 0, 32, 32);
  g.drawImage(src, 0, 0, 32, 32);
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = c.toDataURL('image/png');
  document.head.appendChild(link);
})();

/* ============ Petits robots du bouton JOUER (images procédurales) ============ */

(function setMenuBots() {
  const map = { '--bot-left': 'default', '--bot-right': 'neon', '--bot-top': 'gold' };
  for (const v in map) {
    const sk = SKINS.find(k => k.id === map[v]) || SKINS[0];
    document.documentElement.style.setProperty(
      v, 'url(' + buildSprite(PLAYER_ROWS, sk.pal).img.toDataURL() + ')');
  }
})();

/* ============================ BOUCLE ============================ */

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  updateHUD();
  updateBagHud();
  updateUnloadButton();
  requestAnimationFrame(loop);
}

/* ============================ INIT ============================ */

setMode('classic');
rebuildPlayerSprite();
syncOptions();
el.btnUnload.style.backgroundImage = 'url(' + SPR.ship.img.toDataURL() + ')';
el.btnGameOpt.style.backgroundImage = 'url(' + SPR.gear.img.toDataURL() + ')';
document.documentElement.style.setProperty(
  '--cursor', 'url(' + SPR.cursor.img.toDataURL() + ') 7 1, auto');
showPage('title');
requestAnimationFrame(loop);