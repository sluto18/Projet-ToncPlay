'use strict';
/* ================================================================
   SUIVEZ LE GUIDE — prototype hommage à Lemmings (1991)
   Tout est généré par le code : sprites, terrain, icônes, sons.
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
const TICK = 1000 / 60;
let TOTAL_LEMMINGS = 20, GOAL = 15;   // renseignés par le niveau courant
let HATCH = { x: 100, y: 118 };       // bas de la trappe
let EXIT  = { x: 740, y: 370 };       // sol devant la porte
let RECTS = [];                       // géométrie du niveau courant
let curLevel = 0;                     // index du niveau en cours
let SPAWN_DIR = 1;                    // direction de sortie de trappe (+1 droite, -1 gauche)
let LW = 800;                 // largeur du monde (niveau) — W reste l'écran (800)
let camX = 0;                 // défilement : bord gauche visible
let camY = 0, zoomLevel = 1;
let keyL = false, keyR = false;
let mmRect = null, mmDrag = false, frameCount = 0;
let touchGesture = null;
const mmCv = document.createElement('canvas');

const FATAL_FALL = 75;                // hauteur de chute létale (px)
const STEP_MAX = 13;   // hauteur de marche franchissable — montée ET descente
const GRAV = 0.32, TERMINAL = 4.6;    // gravité & vitesse terminale
const FLOAT_FALL = 1.15;              // vitesse de chute sous parachute

/* ---------------- mini fonte pixel 3x5 ---------------- */
const FONT = {
  '0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001011001111',
  '4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001010010010',
  '8':'111101111101111','9':'111101111001111',
  'B':'110101110101110','L':'100100100100111','O':'111101101101111','C':'111100100100111',
  'D':'110101101101110','I':'111010010010111','G':'111100101101111','F':'111100110100100',
  'A':'010101111101101','S':'111100111001111','H':'101101111101101','M':'101111101101101',
  'E':'111100110100111','X':'101101010101101','T':'111010010010010','R':'110101110110101',
  'U':'101101101101111','P':'111101111100100','N':'101111111101101','V':'101101101101010',
  'W':'101101101111101','Y':'101101010010010','Z':'111001010100111','É':'111100110100111',
  '-':'000000111000000',' ':'000000000000000'
};
function drawPText(g, str, cx, y, px, color, center = true){
  g.fillStyle = color;
  const chars = [...str];
  const tw = chars.length * 4 * px - px;
  let x = center ? Math.round(cx - tw / 2) : cx;
  for (const ch of chars){
    const gl = FONT[ch];
    if (gl){
      for (let k = 0; k < 15; k++){
        if (gl[k] === '1') g.fillRect(x + (k % 3) * px, y + ((k / 3) | 0) * px, px, px);
      }
    }
    x += 4 * px;
  }
}

/* ---------------- palette & sprites pixel art ---------------- */
const PAL = {
  K:'#141420', G:'#3ab54a', g:'#238431', F:'#f2c592', f:'#c9925f',
  B:'#2f52d9', b:'#20369c', W:'#f4f6ff', O:'#e08a2d', o:'#a05f1c',
  S:'#c6cad6', s:'#82868f', R:'#e03a2f', r:'#9c2119', Y:'#f4d43c'
};
function makeSprite(rows, px = 2){
  const c = document.createElement('canvas');
  c.width = rows[0].length * px; c.height = rows.length * px;
  const g = c.getContext('2d');
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++){
      const ch = row[i];
      if (ch !== '.'){ g.fillStyle = PAL[ch]; g.fillRect(i * px, j * px, px, px); }
    }
  });
  return c;
}

const SPR_WALK = [
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "...BBBBBB...","..BBBBBBBF..","..BBBBBBBB..","...bBBBBb...","...BB..BB...",
  "..bB....Bb..",".bB......Bb.",".B........B." ],
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "...BBBBBB...","..FBBBBBB...","..BBBBBBBB..","...bBBBBb...","....BBBB....",
  "....B..B....","....B..B....","....b..b...." ],
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "...BBBBBB...","..BBBBBBBB..","..FBBBBBB...","...bBBBBb...","...BB..BB...",
  "..BB....BB..","..Bb....bB..","..B......B.." ],
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "...BBBBBB...","..BBBBBBBF..","..BBBBBBBB..","...bBBBBb...","....BBBB....",
  "....B..B....","....B..B....","....b..b...." ]
];
const SPR_FALL = [
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "..BBBBBBBB..","FFBBBBBBBBFF","..bBBBBBBb..","...BBBBBB...","...BB..BB...",
  "...B....B...","...b....b..." ],
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "..BBBBBBBB..","FFBBBBBBBBFF","..bBBBBBBb..","...BBBBBB...","....BBBB....",
  "....B.B.....","....b.b....." ]
];
const SPR_FLOAT = [
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "...BBBBBB...","..BBBBBBBB..","...bBBBBb...","...BB..BB...","...B....B...","...b....b..." ],
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF....",
  "...BBBBBB...","..BBBBBBBB..","...bBBBBb...","...BBBBB....","....B..B....","....b..b...." ]
];
const SPR_CANOPY = [
  "...RRRRRRRR...",
  ".RRWWRRRRWWRR.",
  "RRWWRRWWRRWWRR",
  "RRWWRRWWRRWWRR",
  ".RRRRRRRRRRRR."
];
const SPR_DIG = [
[ "....GGGG....",
  "...GGGGGG...",
  "...GgFFFK...",
  "...GFFFFF...",
  "....FFFF....",
  "...BBBBBB...",
  "..BBBBBBB...",
  "..bBBBBBb...",
  "...BB.BB....",
  "...B...B....",
  "...B.O.B....",
  "...BOoOB....",
  "....OOO....." ],
[ "....GGGG....",
  "...GGGGGG...",
  "...GgFFFK...",
  "...GFFFFF...",
  "....FFFF....",
  "...BBBBBB...",
  "..BBBBBBB...",
  "..bBBBBBb...",
  "...BB.BB....",
  "...B...B....",
  "...B.S.B....",
  "...BSoSB....",
  "....SSS....." ]
];
const SPR_BASH = [
[ "....GGGG........","...GGGGGG.......","...GgFFFK.......","...GFFFFF.......","....FFFF........",
  "...BBBBBBF......","..BBBBBBBFOOS...","..bBBBBBBBOS....","....BBBBBB......","....BB.BB.......",
  "....B...B.......","....b...b......." ],
[ "....GGGG........","...GGGGGG.......","...GgFFFK.......","...GFFFFF.......","....FFFF........",
  "...BBBBBBF......","..BBBBBBBFOOSS..","..bBBBBBBBO.....","....BBBBBB......","....BBBBB.......",
  "....B..B........","....b..b........" ]
];
const SPR_BLOCK = [
[ ".....GGGG.....","....GGGGGG....","....GKFFKG....","....GFFFFG....",".....FFFF.....",
  "F...BBBBBB...F","FF.BBBBBBBB.FF","FFBBBBBBBBBBFF","FF.BBBBBBBB.FF","....BB..BB....",
  "...BB....BB...","...b......b..." ],
[ ".....GGGG.....","....GGGGGG....","....GKFFKG....","....GFFFFG....",".....FFFF.....",
  ".....BBBBBB...","FF..BBBBBBBBFF","FFBBBBBBBBBBFF","FF.BBBBBBBB.FF","....BB..BB....",
  "...BB....BB...","...b......b..." ]
];
const SPR_BUILD = [
[ "...GGGG.......","..GGGGGG......","..GgFFFK......","..GFFFFF......","...FFFF.......",
  "...BBBBBB.....","..FBBBBBB.....","..FbBBBBb.....","...BBBBBB.....","...BB..BB.....",
  "...B....B.....","...b....b....." ],
[ "....GGGG......","....GGGGGG....","....GgFFFK....","....GFFFFF....",".....FFFF.....",
  "...BBBBBB.....","...BBBBBBBF...","...bBBBBbF....","...BBBBBB.....","...BB..BB.....",
  "...B....B.....","...b....b....." ]
];
const SPR_CLIMB = [
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFF.F..",
  "...BBBBBBF..","..FBBBBBB...","..FbBBBBb...","...BBBBBB...","...BB..BB...",
  "...B....B...","...b....b..." ],
[ "....GGGG....","...GGGGGG...","...GgFFFK...","...GFFFFF...","....FFFFF...",
  "...BBBBBB...","..FBBBBBBF..","..FbBBBBb...","...BBBBBB...","...BB..BB...",
  "...B....B...","...b....b..." ]
];
const SPR_MINE = [
[ ".....GGGG.....","....GGGGGG....","....GKFFKG....","....GFFFFG..S.",".....FFFF..OS.",
  "....BBBBBB.O..","...BBBBBBBBO..","...BBBBBBBB...","....bBBBBb....","....BB.BB.....",
  "...BB...BB....","...b.....b...." ],
[ ".....GGGG.....","....GGGGGG....","....GKFFKG....","....GFFFFG....",".....FFFF.....",
  "....BBBBBB....","...BBBBBBB.S..","...BBBBBBBOS..","....bBBBBbO...","....BB.BB.....",
  "...BB...BB....","...b.....b...." ]
];
const SPR_WAVE = [
[ "....GGGG..F.",
  "...GGGGGGFF.",
  "...GgFFFK.F.",
  "...GFFFFF.F.",
  "....FFFF.FF.",
  "...BBBBBBF..",
  "..BBBBBBB...",
  "...bBBBBb...",
  "...BBBBBB...",
  "...BB..BB...",
  "...B....B...",
  "...B....B...",
  "...b....b..." ],
[ "....GGGG....",
  "...GGGGGG...",
  "...GgFFFK...",
  "...GFFFFF...",
  "....FFFF....",
  "...BBBBBBFF.",
  "..BBBBBBBFF.",
  "...bBBBBbF..",
  "...BBBBBB...",
  "...BB..BB...",
  "...B....B...",
  "...B....B...",
  "...b....b..." ]
];
const SPR_SPLAT = [
  ".G..GG..G...",
  ".BBBBBBBBBB.",
  "BbBBBBBBBBbB",
  ".F.F....F.F."
];
const SPR_BOMB = [
  ".......YY...",
  "......Y.....",
  "......KK....",
  "..KKKKK.....",
  ".KKKKKKKK...",
  ".KKKWWKKKK..",
  ".KKWWKKKKK..",
  "KKKKKKKKKK..",
  "KKKKKKKKKK..",
  ".KKKKKKKK...",
  "..KKKKKK...."
];
for (const set of [SPR_WALK, SPR_FALL, SPR_FLOAT, SPR_DIG, SPR_BASH, SPR_BLOCK, SPR_BUILD, SPR_CLIMB, SPR_MINE,SPR_WAVE])
  set.forEach((f, i) => set[i] = makeSprite(f));
const SPR_CAN = makeSprite(SPR_CANOPY), SPR_SPL = makeSprite(SPR_SPLAT), SPR_BMB = makeSprite(SPR_BOMB);

/* ---------------- canvas ---------------- */
const cv = $('#game'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const terrain = document.createElement('canvas'); terrain.width = W; terrain.height = H;
const tctx = terrain.getContext('2d');
const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
const bctx = bg.getContext('2d');

/* ---------------- audio : synthé WebAudio ---------------- */
const SFX = window.AudioGame ? window.AudioGame.SFX : {
  ac: null, on: true, last: {}, vol: .8, master: null,
  ensure(){}, setVol(v){ this.vol = v; }, tone(){}, noise(){}, throttle(){ return true; },
  assign(){}, err(){}, pop(){}, dig(){}, bash(){}, save(){}, splat(){}, offscreen(){}, boom(){}, nuke(){}, win(){}, lose(){}
};

const TRACKS = window.AudioGame ? window.AudioGame.TRACKS : [];
const MUSIC = window.AudioGame ? window.AudioGame.MUSIC : {
  playing: false, step: 0, nextT: 0, timer: 0, vol: .5, master: null,
  track: null, spb: 0,
  ensure(){}, setVol(){}, setTrack(){}, start(){}, stop(){}, tick(){}, playStep(){}
};


/* ---------------- sauvegarde locale ---------------- */
const SAVE = {
  key: 'lemings_save_v1',
  data: { progress: 1, scores: {}, opt: { sfx: .8, mus: .5, fx: 1 }, levelVersion: 2 },
  load(){
    try {
      const d = JSON.parse(localStorage.getItem(this.key));
      if (d){
        const savedProgress = Math.max(1, d.progress | 0);
        const savedScores = d.scores || {};
        if ((d.levelVersion | 0) < 2){
          const challengeAfter = [4, 9, 14, 19];
          const mapOldLevel = index => index + challengeAfter.filter(after => after < index).length;
          const oldMaxIndex = 20;
          const oldLastUnlocked = Math.min(oldMaxIndex, savedProgress - 1);
          const migratedScores = {};
          for (const [index, score] of Object.entries(savedScores)){
            const oldIndex = Number(index);
            if (Number.isInteger(oldIndex) && oldIndex >= 0 && oldIndex <= oldMaxIndex)
              migratedScores[mapOldLevel(oldIndex)] = score;
          }
          this.data.progress = Math.min(LEVELS.length, mapOldLevel(oldLastUnlocked) + 1);
          this.data.scores = migratedScores;
          this.data.levelVersion = 2;
        } else {
          this.data.progress = Math.min(LEVELS.length, savedProgress);
          this.data.scores = savedScores;
          this.data.levelVersion = 2;
        }
        this.data.opt = Object.assign(this.data.opt, d.opt || {});
        if ((d.levelVersion | 0) < 2) this.save();
      }
    } catch(e){}
    return this.data;
  },
  save(){ try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch(e){} }
};

/* ---------------- état global ---------------- */
let mask = new Uint8Array(W * H);
let lemmings = [], parts = [], fx = [], bricks = [];
let stats = { spawned: 0, saved: 0, lost: 0, time: 0 };
let toSpawn = TOTAL_LEMMINGS, spawnT = 1400, spawnInterval = 1200;
let hatchT = 0, exitOpenT = 0, shake = 0, flashT = 0, endT = 0;
let running = false, paused = false, ended = false, speedMult = 1, dragFloat = false;
let campaignSaved = 0; 
let undoSnapshot = null;
const mouse = { x: 0, y: 0, in: false };
const tutorial = { active: false, step: -1, ticks: 0, anchor: null, targetLem: null };
const tutorialCoach = $('#tutorialCoach');
let flashColor = '255,244,210';
let visualIntensity = 1;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function triggerImpact(amount, flash = 0, color = '255,244,210'){
  if (!reduceMotion) shake = Math.max(shake, amount * visualIntensity);
  if (flash > 0 && visualIntensity > 0){
    flashT = Math.max(flashT, flash * visualIntensity);
    flashColor = color;
  }
}

function burstParticles(x, y, count, colors, speed = 1.5, gravity = .08){
  for (let i = 0; i < Math.round(count * visualIntensity); i++){
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (.35 + Math.random() * .9);
    parts.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - speed * .35,
      g: gravity,
      life: 14 + Math.random() * 24,
      c: colors[(Math.random() * colors.length) | 0],
      s: 1 + (Math.random() * 3 | 0),
      glint: Math.random() < .35
    });
  }
}

function addShockwave(x, y, color){
  if (visualIntensity <= 0) return;
  parts.push({ kind:'ring', x, y, r:3, vx:0, vy:0, g:0, life:14, maxLife:14, c:color, s:0 });
}

const SKILLS = {
  block: { name:'BLOQUEUR',     tag:'BLOC', count:4, max:4 },
  dig:   { name:'CREUSEUR',     tag:'DIG',  count:3, max:3 },
  float: { name:'PARACHUTISTE', tag:'FLOT', count:8, max:8 },
  climb: { name:'GRIMPEUR',     tag:'CLIM', count:2, max:2 },
  bash:  { name:'FOREUR',       tag:'BASH', count:3, max:3 },
  build: { name:'BÂTISSEUR',    tag:'BLD',  count:6, max:6 },
  mine:  { name:'MINEUR',       tag:'MINE', count:2, max:2 },
  bomb:  { name:'EXPLOSIF',     tag:'BOOM', count:5, max:5 }
};
const SKILL_KEYS = Object.keys(SKILLS);
let selSkill = null;


/* ---------------- peinture du terrain ---------------- */
function paintTerrain(){
  tctx.clearRect(0, 0, LW, H);
  for (const r of RECTS) paintRect(r);
}
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

/* particules ambiantes : étoiles (nuit), braises (volcan), flocons (banquise)... */
function makeAmbient(t){
  const W = LW;   // ombrage : largeur monde
  const a = THEMES[t].ambient, r = mulberry32(a.seed);
  const list = [];
  const n = Math.round(a.n * W / 800);   // densité constante sur mondes larges
  for (let i = 0; i < n; i++)
    list.push({ x: (r() * W) | 0, y: (r() * H) | 0, ph: r() * 6.28, sp: 1 + r() * 2.5,
                big: r() < .25, vy: a.vy, col: a.col, tw: a.tw });
  return list;
}

let twinkles = [];
function rebuildBG(){
  bg.width = LW;
  paintSky(bctx, curTheme);
  twinkles = makeAmbient(curTheme);
}
function drawAmbient(now){
  for (const s of twinkles){
    if (s.vy){ s.y += s.vy; if (s.y >= H) s.y -= H; if (s.y < 0) s.y += H; }
    ctx.globalAlpha = s.tw ? .2 + .6 * (Math.sin(now * s.sp + s.ph) * .5 + .5) : .7;
    ctx.fillStyle = s.col;
    ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
    if (s.big){ ctx.fillRect((s.x | 0) - 1, s.y | 0, 3, 1); ctx.fillRect(s.x | 0, (s.y | 0) - 1, 1, 3); }
  }
  ctx.globalAlpha = 1;
}

/* ---------------- destruction du décor ---------------- */
function isSolid(x, y, lemming = null){
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= LW) return true;    // murs invisibles latéraux du MONDE
  if (y < 0 || y >= H) return false;    // ciel / néant
  if (mask[y * LW + x] !== 1) return false;
  if (lemming){
    for (const brick of bricks){
      if (x < brick.x || x >= brick.x + brick.w ||
          y < brick.y || y >= brick.y + brick.h) continue;
      if (lemming.brickBlind) return false;   // sonde foreur : un pixel de brique
                                             // n'est JAMAIS un mur ni un solide
      if (!brickAlive(brick)) continue;
      if (!brick.dir) continue;                      // raccord : solide pour tous
      if (brick.dir === lemming.dir) continue;       // sens de montée : solide
      if (lemming.y > brick.y + 2) return false;     // sous la voûte à contresens : traversable
      // pieds affleurant ou au-dessus du sommet, à contresens : solide
      // → le lemming DESCEND l'escalier marche par marche
    }
  }
  return true;
}
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

/* ---------------- effacement terrain + masque ---------------- */
function carveRect(x, y, w, h){
  const W = LW;
  x = Math.round(x); y = Math.round(y);
  tctx.clearRect(x, y, w, h);
  for (let j = y; j < y + h; j++){
    if (j < 0 || j >= H) continue;
    const a = Math.max(0, x), b = Math.min(W, x + w);
    if (b > a) mask.fill(0, j * W + a, j * W + b);
  }
  crumbs(x, y, x + w, y + h);
}
function carveCircle(cx, cy, r){ carveEllipse(cx, cy, r, r); }

function carveEllipse(cx, cy, rx, ry){
  const W = LW;   // ombrage : largeur monde — sans cette ligne, le masque du
                  // cratère est écrit à un mauvais index sur les niveaux larges
  tctx.save();
  tctx.globalCompositeOperation = 'destination-out';
  tctx.fillStyle = '#000';
  tctx.beginPath(); tctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); tctx.fill();
  tctx.restore();
  // masque de collision
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W, Math.ceil(cx + rx));
  for (let j = Math.max(0, Math.floor(cy - ry)); j <= Math.min(H - 1, Math.ceil(cy + ry)); j++){
    const dy = (j - cy) / ry, row = j * W;
    for (let i = x0; i < x1; i++){
      const dx = (i - cx) / rx;
      if (dx * dx + dy * dy <= 1) mask[row + i] = 0;
    }
  }
  // liseré brûlé : miettes sombres accrochées au terrain restant
  for (let k = 0; k < 34; k++){
    const a = Math.random() * 6.2832;
    const px = Math.round(cx + Math.cos(a) * (rx + 1 + Math.random() * 2));
    const py = Math.round(cy + Math.sin(a) * (ry + 1 + Math.random() * 2));
    if (px >= 0 && px < W && py >= 0 && py < H && mask[py * W + px]){
      tctx.fillStyle = Math.random() < .5 ? 'rgba(20,10,4,.7)' : 'rgba(64,32,10,.55)';
      tctx.fillRect(px, py, 1 + (Math.random() * 2 | 0), 1);
    }
  }
}
function anySolid(x0, x1, y0, y1, lemming = null){
  for (let j = Math.round(y0); j <= Math.round(y1); j++)
    for (let i = Math.round(x0); i <= Math.round(x1); i++)
      if (isSolid(i, j, lemming)) return true;
  return false;
}
function firstSolidRowIn(x0, x1, y0, y1, lemming = null){
  for (let j = Math.round(y0); j <= Math.round(y1); j++)
    for (let i = Math.round(x0); i <= Math.round(x1); i++)
      if (isSolid(i, j, lemming)) return j;
  return null;
}

function brickInRect(x0, x1, y0, y1){
  for (const b of bricks){
    if (!brickAlive(b)) continue;
    if (b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0) return true;
  }
  return false;
}

function brickBlockingTunnel(x0, x1, y){
  const mid = (x0 + x1) / 2;
  for (const b of bricks){
    if (!brickAlive(b)) continue;
    if (b.y >= y) continue;   
    if (!b.dir) continue; 
    const cx = b.x + b.w / 2;
    if (cx > x0 - 2 && cx < x1 + 2) return true;
  }
  return false;
}

/* ---------------- lemmings ---------------- */
let LID = 0;
function makeLem(x, y){
  return {
    id: ++LID, x, y,
    dir: SPAWN_DIR,
    state: 'fall', vy: 0, fall: 0,
    floater: false, climber: false, chute: false, bashArm: false, buildArm: false,
    steps: 0, buildT: 0, digLeft: 0, mineLeft: 0, bashLeft: 0,
    animT: (Math.random() * 32) | 0,
    bombT: -1, missT: 0, splatT: 0, exitT: 0
  };
}

function rescue(l){
  stats.saved++;
  l.state = 'exit'; l.exitT = 18;
  l.dir = EXIT.x >= l.x ? 1 : -1;
  exitOpenT = 26; SFX.save();
  triggerImpact(.8, 2, '90,210,100');
  fx.push({ txt: 'IN', x: EXIT.x, y: EXIT.y - 46, t: 0, color: '#5ad25a' });
  burstParticles(EXIT.x, EXIT.y - 24, 16, ['#5ad25a', '#dfe3ee', '#ffb340'], 1.6, .035);
}
function drown(l){ l.dead = true; stats.lost++; SFX.offscreen(); }

function explode(l){
  l.dead = true; stats.lost++;
  carveEllipse(Math.round(l.x), Math.round(l.y - 7), 26, 20);
  triggerImpact(11, 7, '255,110,48'); SFX.boom();
  const cols = ['#7c4c24', '#a06434', '#f4d43c', '#e08a2d', '#e03a2f'];
  burstParticles(l.x, l.y - 8, 42, cols, 3.4, .13);
  addShockwave(l.x, l.y - 7, '#ffd36a');
}
function nuke(){
  undoSnapshot = captureUndoSnapshot();
  refreshUndoButton();
  SFX.nuke();
  for (const l of lemmings)
    if (!l.dead && l.bombT < 0 && l.state !== 'exit' && l.state !== 'splat')
      l.bombT = (50 + Math.random() * 280) | 0;
}

/* ---------------- physique / états ---------------- */
function updateLem(l){
  l.animT++;
  if (l.bombT >= 0 && l.state !== 'exit' && l.state !== 'splat'){
    l.bombT--;
    if (l.bombT <= 0){ explode(l); return; }
  }
  switch (l.state){
    case 'walk':  stepWalk(l); break;
    case 'fall':  stepFall(l); break;
    case 'dig':   stepDig(l);  break;
    case 'bash':  stepBash(l); break;
    case 'climb': stepClimb(l); break;
    case 'mine':  stepMine(l);  break;
    case 'build': stepBuild(l); break;
    case 'exit':
      l.x += Math.sign(EXIT.x - l.x) * .5;
      if (--l.exitT <= 0) l.dead = true;
      break;
    case 'splat':
      if (--l.splatT <= 0) l.dead = true;
      break;
    case 'block':
      if (!isSolid(l.x, l.y + 1, l) && !isSolid(l.x, l.y + 2, l)){
        l.state = 'fall'; l.vy = 0; l.fall = 0;
      }
      break;
  }
}

function stepWalk(l){
  // 1. Bâtisseur armé : construction IMMÉDIATE à réception de l'ordre.
  if (l.buildArm){
    const b = brickUnderFeet(l.x, l.y);
    const uphill = b && nextBrickAhead(l.x, l.dir, b) &&
                   nextBrickAhead(l.x, l.dir, b).y < b.y;
    if (!uphill){
      l.state = 'build'; l.animT = 0; l.steps = BUILD_BRICKS; l.buildT = 0; l.buildArm = false;
      return;
    }
  }

    // 1bis
  if (isSolid(l.x, l.y, l)){
    let lift = 0;
    while (isSolid(l.x, l.y - lift, l) && lift < 26) lift++;
    l.y -= lift;
    // re-vérifie le sol après remontée : le lemming est SUR quelque chose
  }

  // 2. Déplacement horizontal
  l.x += l.dir * .4;
  if (l.x < 6){ l.x = 6; l.dir = 1; }
  if (l.x > LW - 6){ l.x = LW - 6; l.dir = -1; }

  // 3. Sol : descente (≤3 px), fissure plate (≤4 px de dénivelé), 
  // enjambement avec descente (sol 5-8 px plus bas), ou chute
  if (!isSolid(l.x, l.y + 1, l)){
    let down = 0;
    for (let s = 1; s <= 3; s++) {
      if (isSolid(l.x, l.y + 1 + s)){ down = s; break; }
    }
    if (down) {
      l.y += down;
    } else if (!groundAhead(l.x, l.y, l.dir, l)) {
      l.state = 'fall'; l.vy = 0; l.fall = 0; l.chute = false; return;
    } else if (deepGroundAhead(l.x, l.y, l.dir, l)) {
      l.y += 3;   // sol de l'autre côté 5-8 px plus bas : on descend vers lui
    }
    // sinon : fissure d'au plus 6 px — le lemming marche par-dessus
  }

  // 4. Obstacle devant / Franchissement de marche
  const ahead = l.x + l.dir * 5;
  if (isSolid(ahead, l.y - 3, l) || isSolid(ahead, l.y - 7, l)){
    let up = 0;
    for (let s = 1; s <= STEP_MAX; s++) {
      if (!isSolid(ahead, l.y - 3 - s, l) && !isSolid(ahead, l.y - 7 - s, l) &&
          isSolid(l.x + l.dir * 6, l.y - s, l)){ up = s; break; }
    }
    if (up) l.y -= up;
    else {
      const pa = l.dir > 0 ? l.x + 1 : l.x - 11;
      if (l.bashArm && (anySolid(pa, pa + 12, l.y - 26, l.y - BASH_WALL_MIN, BASH_PROBE) ||
                        massAheadOf(pa, pa + 12, l.y)) &&
          !brickBlockingTunnel(pa, pa + 12, l.y)){
        l.state = 'bash'; l.animT = 0; l.missT = 0; l.bashArm = false;
        l.bashLeft = BASH_MAX_WIDTH;
      }
      // FIN DU REMPLACEMENT
      else if (l.climber){
        l.state = 'climb'; l.animT = 0;
      }
      else { l.dir *= -1; return; }
    }
  }

  // 5. Bloqueurs
  for (const b of lemmings){
    if (b === l || b.state !== 'block') continue;
    if (Math.abs(b.y - l.y) > 10) continue;
    const dx = b.x - l.x;
    if (Math.abs(dx) < 9 && (dx === 0 || Math.sign(dx) === l.dir)){
      l.dir *= -1; l.x += l.dir;
      break;
    }
  }

  if (Math.abs(l.x - EXIT.x) < 8 && Math.abs(l.y - EXIT.y) < 14) rescue(l);
}

function stepFall(l){
  if (l.floater && l.fall > 12) l.chute = true;   // déploiement du parachute
  if (l.chute) l.vy += (FLOAT_FALL - l.vy) * .18;
  else { l.vy += GRAV; if (l.vy > TERMINAL) l.vy = TERMINAL; }
  l.y += l.vy; l.fall += l.vy;

  if (l.y > H + 30){ drown(l); return; }
  if (isSolid(l.x, l.y, l)){
    while (isSolid(l.x, l.y, l)) l.y--;
    const hard = l.fall > FATAL_FALL && !l.floater;
    l.vy = 0; l.fall = 0;
    if (hard){
      l.state = 'splat'; l.splatT = 45; stats.lost++; SFX.splat();
      triggerImpact(4, 2, '255,80,64');
      burstParticles(l.x, l.y - 8, 12, ['#e05548', '#ffb340', '#dfe3ee'], 1.4, .12);
    }
    else { l.state = 'walk'; l.chute = false; }
  }
  // un grimpeur qui glisse le long d'une paroi frontale s'y agrippe
  if (l.climber && isSolid(l.x + l.dir * 5, l.y - 2, l) && isSolid(l.x + l.dir * 5, l.y - 10, l)){
    l.state = 'climb'; l.animT = 0;
    l.vy = 0; l.fall = 0; l.chute = false;
  }
}

/* ---------------- grimpeur ---------------- */
function stepClimb(l){
  const ahead = l.x + l.dir * 5;
  // plafond au-dessus de la tête : il décroche et retombe (demi-tour)
  if (isSolid(l.x, l.y - 31, l)){
    l.state = 'fall'; l.dir *= -1; l.vy = 0; l.fall = 0; l.chute = false; return;
  }
  // paroi dégagée au niveau des pieds : sommet atteint (ou paroi détruite)
  if (!isSolid(ahead, l.y - 2, l)){
    const nx = l.x + l.dir * 5;
    if (isSolid(ahead, l.y - 14, l) || anySolid(nx, nx, l.y - 24, l.y - 4, l)){
      // surplomb au-dessus du rebord : impossible de se hisser, il décroche
      l.state = 'fall'; l.dir *= -1; l.vy = 0; l.fall = 0; l.chute = false;
    } else {
      l.x = nx;
      while (isSolid(l.x, l.y, l)) l.y--;   // se pose sur le rebord, pieds hors du sol
      l.state = 'walk';
    }
    return;
  }
  if (l.animT % 2) return;
  l.y--;   // progression : 1 px tous les 2 ticks (plus lent que la marche)
}

const DIG_MAX_DEPTH = 70;   // un creuseur s'arrête après cette profondeur (px)
const BASH_WALL_MIN = 12;   // un « vrai mur » dépasse les pieds d'au moins 12px
const BASH_PROBE = { brickBlind: true };   // sonde foreur : ignore les escaliers
const BASH_MAX_WIDTH = 300;   // largeur maximale forée par mission (px)
const MINE_MAX_DEPTH = 90;   // descente maximale d'un mineur (px)
const MINE_SWING = 5;        // ticks entre deux coups de pioche
const GAP_BRIDGE = 6;   // largeur maximale de trou franchi en marchant (px)

function groundAhead(x, y, dir, lemming){
  for (let d = 1; d <= 7; d++){          // 7 px : couvre la demi-largeur d'une brique (14/2)
    const gx = x + dir * d;
    // sol au niveau des pieds ou jusqu'à 4 px plus bas (descente de marche + fissure)
    if (isSolid(gx, y + 1, lemming)) return true;
    for (let s = 2; s <= 8; s++)
      if (isSolid(gx, y + s, lemming)) return true;
    // sol PLUS HAUT de 1 à 8 px (palier affleurant) : on y monte au lieu de tomber
    for (let s = 0; s <= 8; s++)
      if (isSolid(gx, y - s, lemming)) return true;
  }
  return false;
}

function massAheadOf(x0, x1, y){
  for (let i = Math.round(x0); i <= Math.round(x1); i++){
    if (isSolid(i, y, BASH_PROBE) || isSolid(i, y + 1, BASH_PROBE)){
      if (isSolid(i, y - 1, BASH_PROBE) || isSolid(i, y - 2, BASH_PROBE) ||
          isSolid(i, y - 3, BASH_PROBE)) return true;
    }
  }
  return false;
}

function deepGroundAhead(x, y, dir, lemming){
  for (let d = 1; d <= 7; d++){
    const gx = x + dir * d;
    for (let s = 5; s <= 8; s++)
      if (isSolid(gx, y + s, lemming)) return s;
  }
  return 0;
}

function stepDig(l){
  if (l.animT % 4) return;
  carveRect(l.x - 8, l.y, 17, 2);
  l.y += 2;
  l.digLeft -= 2;
  SFX.dig();
  triggerImpact(.55);
  for (let k = 0; k < 5; k++)
    parts.push({ x: l.x + Math.random() * 16 - 8, y: l.y - 6,
                 vx: (Math.random() - .5) * 1.4, vy: -Math.random() * 1.5,
                 g: .12, life: 14 + Math.random() * 12,
                 c: ['#8f5a2b', '#6a3d1a', '#96652f'][(Math.random() * 3) | 0], s: 1 + (Math.random() * 3 | 0),
                 glint: Math.random() < .25 });
  // Sonde : elle part MAINTENANT du pixel y (le prochain à creuser) et sonde
  // 6 px de profondeur — l'ancienne démarrait à y+1 et pouvait sauter le
  // tout dernier pixel de la plateforme (la fameuse ligne).
  if (!anySolid(l.x - 8, l.x + 8, l.y, l.y + 6, l)){
    l.state = 'fall'; l.vy = 0; l.fall = 0; l.chute = false;
  } else if (l.digLeft <= 0){
    while (isSolid(l.x, l.y, l)) l.y--;   // pieds remis au-dessus du sol restant
    l.state = 'walk';
  }
}

function stepMine(l){
  if (l.animT % MINE_SWING) return;
  const a = l.dir > 0 ? l.x + 1 : l.x - 11;    // bande de 10 px devant lui
  carveRect(a, l.y - 26, 10, 30);              // galerie : corps + sol devant
  l.x += l.dir * 2; l.y += 2;                  // descente à 45° (marches de 2 px)
  l.mineLeft -= 2;
  SFX.mine();
  triggerImpact(.7);
  for (let k = 0; k < 5; k++)
    parts.push({ x: l.x + l.dir * 4, y: l.y - Math.random() * 20,
                 vx: -l.dir * Math.random() * 1.4, vy: -Math.random() * 1.3,
                 g: .12, life: 12 + Math.random() * 12,
                 c: ['#8f5a2b', '#6a3d1a', '#96652f'][(Math.random() * 3) | 0], s: 1 + (Math.random() * 3 | 0),
                 glint: Math.random() < .2 });
  if (l.x < 6 || l.x > LW - 6){ l.state = 'walk'; return; }   // bord d'écran
  if (l.mineLeft <= 0){ l.state = 'walk'; return; }          // profondeur max
  // plus rien à miner devant ? sol sous les pieds -> marche ; vide -> chute
  const na = l.dir > 0 ? l.x + 1 : l.x - 11;
  if (!anySolid(na, na + 10, l.y - 26, l.y + 3, l)){
    if (isSolid(l.x, l.y + 1, l) || isSolid(l.x, l.y + 2, l)) l.state = 'walk';
    else { l.state = 'fall'; l.vy = 0; l.fall = 0; l.chute = false; }
  }
}

function stepBash(l){
  if (l.bashLeft <= 0){
    l.state = 'walk';
    fx.push({ txt: 'FIN', x: l.x, y: l.y - 42, t: 0, color: '#8b91a6' });
    return;
  }
  if (l.animT % 7) return;   // un coup tous les 7 ticks : ~8,6 px/s (était 12)
        
  const grounded = isSolid(l.x, l.y + 1, l) || isSolid(l.x, l.y + 2, l);
  if (!grounded && !groundAhead(l.x, l.y, l.dir, l)){
    // pas de sol proche : on regarde plus bas — atterrissage de rattrapage
    let landing = -1;
    for (let s = 3; s <= 12 && landing < 0; s++)
      if (isSolid(l.x, l.y + s, l)) landing = s;
    if (landing > 0){
      l.y += landing - 1;             // se pose sur le sol trouvé dessous
      while (isSolid(l.x, l.y, l)) l.y--;
    } else {
      l.state = 'fall'; l.vy = 0; l.fall = 0; return;
    }
  }

  const a = l.dir > 0 ? l.x + 1 : l.x - 11;
  const b = a + 12;
  const wallAbove = anySolid(a, b, l.y - 26, l.y - BASH_WALL_MIN, BASH_PROBE);
  const massAhead = massAheadOf(a, b, l.y);   // « le terrain monte-t-il devant ? »
  if ((wallAbove || massAhead) && !brickBlockingTunnel(a, b, l.y)){
    carveRect(a, l.y - 27, 8, 27); 
    l.bashLeft -= 8;   // le carve avance de 8 px par coup
    l.x += l.dir;
    l.missT = 0;
    SFX.bash();
    triggerImpact(1.25, 1, '255,190,110');
    for (let k = 0; k < 6; k++)
      parts.push({ x: l.x + l.dir * 5, y: l.y - 4 - Math.random() * 20,
                   vx: -l.dir * Math.random() * 1.2, vy: (Math.random() - .7) * 1.2,
                   g: .1, life: 12 + Math.random() * 10,
                   c: ['#82868f', '#b6bac8', '#6a3d1a', '#ffb340'][(Math.random() * 4) | 0],
                   s: 1 + (Math.random() * 3 | 0), glint: Math.random() < .55 });
  } else if (++l.missT >= 3){
    l.state = 'walk';
  }
}

/* ---------------- bâtisseur ---------------- */
const BUILD_PHASE = 26;    // cycle brique 
const BUILD_BRICKS = 12;   // briques par mission de construction
const BRICK_W = 14;        // largeur d'une brique
const BUILD_STEP_X = 8;   // avancée horizontale par brique 
const BUILD_STEP_Y = 4;    // élévation par brique (inchangée)

function addBrick(x, y, w, h, dir){
  const W = LW;   // ombrage : largeur monde
  x = Math.round(x); y = Math.round(y);
  tctx.fillStyle = '#a05a2c'; tctx.fillRect(x, y, w, h);
  tctx.fillStyle = '#c07440'; tctx.fillRect(x, y, w, 1);
  tctx.fillStyle = '#7c421e';
  tctx.fillRect(x, y + 2, w, 1);
  tctx.fillRect(x + 5, y, 1, 1);
  tctx.fillRect(x + 3, y, 1, 2);
  const a = Math.max(0, x), b = Math.min(W, x + w);
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    if (b > a) mask.fill(1, j * W + a, j * W + b);
  bricks.push({ x, y, w, h, dir: dir || 0 });   // ← le champ qui manquait
}

/* registre des briques : continuité du bâtisseur + prévisualisation.
   brickAlive vérifie le masque : une brique détruite (explosion, creusage)
   sort de fait du registre. */
function brickAlive(b){ return isSolid(b.x + 3, b.y + 2); }

function brickUnderFeet(x, y){
  for (const c of bricks){
    if (!brickAlive(c)) continue;                 // ← la ligne qui manque
    if (x >= c.x - 1 && x <= c.x + c.w + 1 && Math.abs(c.y - y) <= 3) return c;
  }
  return null;
}

/* une brique vivante dans la zone de grimpe ? (pieds entre deux niveaux) */
function brickNear(x, y){
  for (const b of bricks){
    if (!brickAlive(b)) continue;
    if (b.x - 12 <= x && x <= b.x + b.w + 12 && b.y - 8 <= y + 1 && y <= b.y + 6) return true;
  }
  return false;
}

function nextBrickAhead(x, dir, b){
  const lo = Math.min(x + dir * 2, x + dir * (BUILD_STEP_X + 4));
  const hi = Math.max(x + dir * 2, x + dir * (BUILD_STEP_X + 4));
  for (const b2 of bricks){
    if (b2 === b || !brickAlive(b2)) continue;
    if (b2.x + b2.w < lo || b2.x > hi) continue;
    const dy = b2.y - b.y;
    if ((dy <= -1 && dy >= -7) || (dy >= 1 && dy <= 7)) return b2;
  }
  return null;
}

function stepBuild(l) {
  // 1. Vide sous le lemming ?
  if (!isSolid(l.x, l.y + 1, l) && !isSolid(l.x, l.y + 2, l)) {
    l.state = 'fall'; l.vy = 0; l.fall = 0; l.chute = false; return;
  }

  // 2. Progression de l'animation
  l.buildT++;
  if (l.buildT < BUILD_PHASE) return;
  l.buildT = 0;

  // 3. Plus de briques ?
  if (l.steps <= 0) { l.state = 'walk'; return; }

  // 4. Position de la prochaine brique — TOUJOURS montante (zigzag)
  const nextY = Math.round(l.y - BUILD_STEP_Y);
  const nextX = Math.round(l.x + l.dir * BUILD_STEP_X);
  const bx = l.dir > 0 ? Math.round(l.x) : Math.round(l.x - BRICK_W);

  // 5. DÉCOR brut dans la zone de pose ? (sonde BRICK-BLIND : les briques
  //    existantes sont des APPUIS, jamais des obstacles — le zigzag pose
  //    à travers l'escalier descendant ; seul le terrain arrête)
  const sx0 = l.dir > 0 ? bx + 6 : bx;
  const sx1 = l.dir > 0 ? bx + BRICK_W : bx + 8;
  const hitRow = firstSolidRowIn(sx0, sx1, nextY - 2, nextY + 4, { brickBlind: true });
  if (hitRow !== null){
    const brickY = Math.max(nextY, Math.min(hitRow - 2, nextY - 2));
    addBrick(bx, brickY, BRICK_W, 6, 0);
    triggerImpact(.45);
    l.steps--;
    l.x = nextX; l.y = brickY - 1;
    l.state = 'walk';
    fx.push({ txt: 'STOP', x: l.x, y: l.y - 42, t: 0, color: '#e05548' });
    return;
  }

  // 6. PLAFOND / mur haut de TERRAIN (brick-blind pareil)
  if (anySolid(bx, bx + BRICK_W, nextY - 22, nextY - 5, { brickBlind: true })){
    l.state = 'walk';
    fx.push({ txt: 'STOP', x: l.x, y: l.y - 42, t: 0, color: '#e05548' });
    return;
  }

  // 7. Pose normale et calage
  addBrick(bx, nextY, BRICK_W, 6, l.dir);
  triggerImpact(.45);
  l.steps--;
  l.x = nextX;
  l.y = nextY;
}

/* brique en vol  */
function drawBrickAt(x, y, w = BRICK_W){
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#a05a2c'; ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = '#c07440'; ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = '#7c421e';
  ctx.fillRect(x, y + 2, w, 1);
  ctx.fillRect(x, y + 5, w, 1);
  ctx.fillRect(x + 3, y, 1, 2);
  if (w >= 12) ctx.fillRect(x + 9, y, 1, 2);   // second joint vertical sur briques larges
}

function drawBuildBrick(l, x, y, h){
  const t = l.buildT;
  if (t <= 0 || t >= BUILD_PHASE) return;
  const bx = l.dir > 0 ? x + 1 : x - (BRICK_W + 1);   // cible : coin haut-gauche
  const tx = bx + BRICK_W / 2, ty = y;                 // centre de la cible
  const kx0 = x - l.dir * BUILD_STEP_X, ky0 = y - 15;  // derrière le dos
  const kx1 = x + l.dir,              ky1 = y - h - 9; // au-dessus de la tête
  let cx, cy;
  if (t < 9){       const u = t / 9;       cx = kx0 + (kx1 - kx0) * u; cy = ky0 + (ky1 - ky0) * u; }
  else if (t < 18){ const u = (t - 9) / 9;  cx = kx1 + (tx - kx1) * u; cy = ky1 + (ty - ky1) * u; }
  else { cx = tx; cy = ty; }                           // maintien en position de pose
  drawBrickAt(cx - BRICK_W / 2, cy - 3);
}

/* ---------------- pas de simulation ---------------- */
function update(){
  if (ended) return;
  stats.time++;
  if (toSpawn > 0 && --spawnT <= 0){
    lemmings.push(makeLem(HATCH.x + Math.random() * 8 - 4, HATCH.y));
    toSpawn--; stats.spawned++;
    spawnT = spawnInterval;
    hatchT = 14; SFX.pop();
  }
  if (hatchT > 0) hatchT--;
  if (exitOpenT > 0) exitOpenT--;
  if (flashT > 0) flashT--;
  shake = shake > .3 ? shake * .86 : 0;

  for (const l of lemmings) updateLem(l);
  lemmings = lemmings.filter(l => !l.dead);

  for (const p of parts){
    if (p.kind === 'ring') p.r += 2.2;
    else { p.x += p.vx; p.y += p.vy; p.vy += p.g; }
    p.life--;
  }
  parts = parts.filter(p => p.life > 0 && (p.kind === 'ring' || p.y < H + 12));
  for (const f of fx) f.t++;
  fx = fx.filter(f => f.t < 46);

  updateHUD();
  updateTutorial();
  checkEnd();
}

/* ---------------- HUD DOM ---------------- */
const cOut = $('#cOut'), cOutTotal = $('#cOutTotal'), cIn = $('#cIn'), cLost = $('#cLost'),
      cAlive = $('#cAlive'), cTime = $('#cTime');
function fmtTime(t){
  const s = Math.floor(t / 60);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function aliveCount(){
  let n = 0;
  for (const l of lemmings)
    if (l.state !== 'splat' && l.state !== 'exit') n++;
  return n;
}
function updateHUD(){
  cOut.textContent = stats.spawned;
  cOutTotal.textContent = '/' + TOTAL_LEMMINGS;
  cIn.textContent = stats.saved;
  cLost.textContent = stats.lost;
  cAlive.textContent = aliveCount();
  cTime.textContent = fmtTime(stats.time);
}

function checkEnd(){
  if (ended) return;
  const remaining = TOTAL_LEMMINGS - stats.spawned;
  if (lemmings.length === 0 && remaining === 0) finish(stats.saved >= GOAL);
}
function finish(win){
  ended = true;
  paused = true;
  acc = 0;
  if (win){
    const rec = SAVE.data.scores[curLevel];
    if (!rec || stats.saved > rec.saved ||
        (stats.saved === rec.saved && stats.time < rec.time))
      SAVE.data.scores[curLevel] = { saved: stats.saved, time: stats.time };
    SAVE.data.progress = Math.max(SAVE.data.progress, Math.min(curLevel + 2, LEVELS.length));
    SAVE.save();
  }
  const isLast = curLevel >= LEVELS.length - 1;
  const t = $('#endTitle'), nxt = $('#btnNext');
  if (win && isLast){
    t.textContent = 'TRIBU SAUVÉE !';
    t.className = 'ok';
    nxt.classList.add('hidden');
  } else if (win){
    t.textContent = 'NIVEAU TERMINÉ !';
    t.className = 'ok';
    nxt.classList.remove('hidden');
  } else {
    t.textContent = 'MISSION ÉCHOUÉE';
    t.className = 'ko';
    nxt.classList.add('hidden');
  }
  let msg = 'SAUVÉS <b>' + stats.saved + '/' + TOTAL_LEMMINGS + '</b> — PERDUS <b>' +
            stats.lost + '</b> — TEMPS <b>' + fmtTime(stats.time) + '</b>';
  if (win && isLast)
    msg += '<br>Campagne terminée — total sauvé : <b>' + (campaignSaved + stats.saved) +
           '</b> lemmings sur ' + (TOTAL_LEMMINGS * LEVELS.length) + '.';
  else if (win)
    msg += '<br>Prochaine étape : <b>' + LEVELS[curLevel + 1].name + '</b>.';
  else
    msg += '<br>Il fallait en sauver ' + GOAL + '. Réessayez !';
  $('#endStats').innerHTML = msg;
  if (win) SFX.win(); else SFX.lose();
  setTimeout(() => $('#end').classList.remove('hidden'), 900);
}

/* ---------------- rendu ---------------- */
function render(){
  frameCount++;
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  const viewW = W / zoomLevel, viewH = H / zoomLevel;
  ctx.drawImage(bg, camX, camY, viewW, viewH, 0, 0, W, H);
  ctx.drawImage(terrain, camX, camY, viewW, viewH, 0, 0, W, H);
  ctx.save();
  ctx.scale(zoomLevel, zoomLevel);
  ctx.translate(-camX, -camY);
  const now = performance.now() / 1000;
  drawAmbient(now);
  drawHatch();
  if (selSkill && running && !ended && !paused && mouse.in) drawHoverOutline();
  for (const l of lemmings) drawLem(l);
  drawExit();
  for (const p of parts){
    ctx.globalAlpha = Math.min(1, p.life / 12) * visualIntensity;
    if (p.kind === 'ring'){
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s);
    if (p.glint && p.life % 4 < 2){
      ctx.fillRect((p.x | 0) - 1, p.y | 0, p.s + 2, 1);
      ctx.fillRect(p.x | 0, (p.y | 0) - 1, 1, p.s + 2);
    }
  }
  ctx.globalAlpha = 1;
  for (const f of fx){
    ctx.globalAlpha = 1 - f.t / 46;
    drawPText(ctx, f.txt, f.x, f.y - f.t * .5, 2, f.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.restore();

  positionTutorialBubble();
  if (flashT > 0){
    ctx.fillStyle = 'rgba(' + flashColor + ',' + (flashT / 7 * .55 * visualIntensity).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (paused && running && !ended) drawPauseVeil();
  drawCursor();
  drawMinimap();
  drawLogo(now);
  if (homeOpen){ drawHomeBanner(now); if (homeSec === 'help') animateHelp(); }
}

function lemSprite(l){
  switch (l.state){
    case 'walk': case 'exit': return SPR_WALK[(l.animT >> 3) & 3];
    case 'fall':  return l.chute ? SPR_FLOAT[(l.animT >> 2) & 1]
                                 : SPR_FALL[(l.animT >> 2) & 1];
    case 'dig':   return SPR_DIG[(l.animT >> 3) & 1];
    case 'bash':  return SPR_BASH[(l.animT >> 3) & 1];
    case 'build': return SPR_BUILD[l.buildT < 13 ? 0 : 1];
    case 'climb': return SPR_CLIMB[(l.animT >> 2) & 1];
    case 'mine':  return SPR_MINE[(l.animT >> 3) & 1];
    case 'block': return SPR_BLOCK[(l.animT >> 4) & 1];
  }
  return null;
}

function drawLem(l){
  const x = Math.round(l.x), y = Math.round(l.y);
  if (l.state === 'splat'){
    ctx.drawImage(SPR_SPL, x - 12, y - 8);
    return;
  }
  const spr = lemSprite(l);
  if (!spr) return;
  const h = spr.height;
  ctx.save();
  if (l.state === 'exit') ctx.globalAlpha = Math.max(.1, l.exitT / 18);
  if (l.dir < 0 && l.state !== 'block'){
    ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0);
  }
  ctx.drawImage(spr, x - (spr.width >> 1), y - h);
  ctx.restore();

  if (l.state === 'build') drawBuildBrick(l, x, y, h);
  if (l.chute){
    const cy = y - h - 10;
    ctx.drawImage(SPR_CAN, x - 14, cy);
    ctx.strokeStyle = '#e8ebf5'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 11, cy + 10); ctx.lineTo(x - 6, y - h + 8);
    ctx.moveTo(x + 11, cy + 10); ctx.lineTo(x + 6, y - h + 8);
    ctx.stroke();
  } else if (l.floater && l.state !== 'exit' && l.state !== 'splat'){
    // parachute plié sur la tête : repère visuel du parachutiste
    ctx.fillStyle = '#f4f6ff'; ctx.fillRect(x - 3, y - h - 2, 6, 2);
    ctx.fillStyle = '#e05548'; ctx.fillRect(x - 1, y - h - 4, 2, 2);
  }
  if (l.bashArm && !l.chute && l.state !== 'exit' && l.state !== 'splat' && ((l.animT >> 3) & 1)){
    // mission de forage en attente : chevron orange clignotant
    ctx.fillStyle = '#e08a2d';
    ctx.fillRect(x - 4, y - h - 10, 8, 2);
    ctx.fillRect(x - 2, y - h - 8, 4, 2);
    ctx.fillRect(x - 1, y - h - 6, 2, 2);
  }
  if (l.buildArm && !l.chute && l.state !== 'exit' && l.state !== 'splat' && ((l.animT >> 3) & 1)){
    // mission de construction en attente : petite brique jaune clignotante
    ctx.fillStyle = '#f4d43c';
    ctx.fillRect(x - 3, y - h - 11, 7, 2);
    ctx.fillRect(x - 3, y - h - 9, 2, 2);
    ctx.fillRect(x + 2, y - h - 9, 2, 2);
  }
  if (l.bombT >= 0 && l.state !== 'exit' && l.state !== 'splat'){
    const n = Math.max(1, Math.ceil(l.bombT / 60));
    const col = (l.bombT < 120 && ((l.bombT >> 3) & 1)) ? '#f4f6ff' : '#e0552f';
    drawPText(ctx, String(n), x, y - h - (l.chute ? 24 : 12), 2, col);
  }
}

function drawHatch(){
  const x = HATCH.x, y = HATCH.y;
  const w = 48, h = 30, x0 = x - 24, y0 = y - h;
  // cordes de suspension vers le haut de l'écran
  ctx.strokeStyle = '#57432c'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 6, y0 + 6);  ctx.lineTo(x0 + 6, 0);
  ctx.moveTo(x0 + w - 6, y0 + 6); ctx.lineTo(x0 + w - 6, 0);
  ctx.stroke();
  // caisse en bois
  ctx.fillStyle = '#6f441c'; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#8a5a2a';
  for (let j = 0; j < 3; j++) ctx.fillRect(x0 + 3, y0 + 3 + j * 9, w - 6, 7);
  ctx.fillStyle = '#c9a35f';
  ctx.fillRect(x0 + 4, y0 + 4, 2, 2); ctx.fillRect(x0 + w - 6, y0 + 4, 2, 2);
  ctx.fillRect(x0 + 4, y0 + h - 6, 2, 2); ctx.fillRect(x0 + w - 6, y0 + h - 6, 2, 2);
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  // enseigne : flèche descendante
  ctx.fillStyle = '#f4d43c';
  ctx.fillRect(x - 8, y0 + 6, 16, 3);
  ctx.fillRect(x - 5, y0 + 9, 10, 3);
  ctx.fillRect(x - 2, y0 + 12, 4, 4);
  ctx.fillStyle = '#241505'; ctx.fillRect(x - 1, y0 + 13, 2, 2);
  // bouche + volets animés
  const open = hatchT > 0 ? Math.sin(Math.PI * (1 - hatchT / 14)) : 0;
  ctx.fillStyle = '#0a0705'; ctx.fillRect(x - 12, y - 2, 24, 6);
  ctx.fillStyle = '#8a5a2a';
  const vw = Math.max(0, 12 * (1 - open));
  ctx.fillRect(x - 12, y - 3, vw, 5);
  ctx.fillRect(x + 12 - vw, y - 3, vw, 5);
}

function drawExit(){
  const x = EXIT.x, gy = EXIT.y;
  const w = 46, h = 50, x0 = Math.round(x - w / 2), y0 = gy - h;
  const open = Math.min(1, exitOpenT / 22);
  // intérieur
  ctx.fillStyle = '#05070d'; ctx.fillRect(x0 + 5, y0 + 6, w - 10, h - 6);
  if (open > 0){
    ctx.fillStyle = '#1d3f26'; ctx.fillRect(x0 + 5, y0 + 6, w - 10, h - 6);
    ctx.fillStyle = '#2f6e3a'; ctx.fillRect(x0 + 8, y0 + 12, w - 16, h - 14);
    ctx.fillStyle = '#49a552'; ctx.fillRect(x0 + 12, gy - 20, w - 24, 14);
  }
  // battants coulissants
  const bw = (w - 10) / 2 * (1 - open * .94);
  ctx.fillStyle = '#7a4c20';
  ctx.fillRect(x0 + 5, y0 + 6, bw, h - 6);
  ctx.fillRect(x0 + w - 5 - bw, y0 + 6, bw, h - 6);
  ctx.fillStyle = '#9a6631';
  if (bw > 4){
    ctx.fillRect(x0 + 5, y0 + 10, bw, 2); ctx.fillRect(x0 + 5, y0 + 22, bw, 2);
    ctx.fillRect(x0 + w - 5 - bw, y0 + 10, bw, 2);
    ctx.fillRect(x0 + w - 5 - bw, y0 + 22, bw, 2);
  }
  // piliers de pierre
  ctx.fillStyle = '#82868f';
  ctx.fillRect(x0, y0, 5, h); ctx.fillRect(x0 + w - 5, y0, 5, h);
  ctx.fillStyle = '#b6bac8';
  ctx.fillRect(x0, y0, 5, 2); ctx.fillRect(x0 + w - 5, y0, 5, 2);
  ctx.fillStyle = '#565c6e';
  ctx.fillRect(x0, y0 + h - 5, 5, 5); ctx.fillRect(x0 + w - 5, y0 + h - 5, 5, 5);
  // linteau + plinthe
  ctx.fillStyle = '#82868f'; ctx.fillRect(x0 - 5, y0 - 7, w + 10, 8);
  ctx.fillStyle = '#b6bac8'; ctx.fillRect(x0 - 5, y0 - 7, w + 10, 2);
  ctx.fillStyle = '#6a7085'; ctx.fillRect(x0 - 8, gy - 3, w + 16, 4);
  // enseigne EXIT
  ctx.fillStyle = '#10131f'; ctx.fillRect(x0 + 3, y0 - 24, w - 6, 14);
  ctx.strokeStyle = '#454c66'; ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 4, y0 - 23, w - 8, 12);
  drawPText(ctx, 'EXIT', x, y0 - 21, 2, '#ffb340');
}

function drawPauseVeil(){
  ctx.fillStyle = 'rgba(5,7,13,.55)';
  ctx.fillRect(0, 0, W, H);
  drawPText(ctx, 'PAUSE', W / 2, 196, 6, '#ffb340');
  drawPText(ctx, 'ESPACE POUR REPRENDRE', W / 2, 248, 2, '#8b91a6');
}

function drawCursor(){
  if (!mouse.in || !running || ended) return;
  const x = Math.round(mouse.x), y = Math.round(mouse.y);
  ctx.fillStyle = '#f4f6ff';
  ctx.fillRect(x - 9, y, 6, 2); ctx.fillRect(x + 3, y, 6, 2);
  ctx.fillRect(x, y - 9, 2, 6); ctx.fillRect(x, y + 3, 2, 6);
  if (!selSkill) return;   // rien d'armé : réticule seul, pas de boîte
  const sk = SKILLS[selSkill], ico = skillIcons[selSkill];
  const px = x > W - 60 ? x - 46 : x + 12;
  const py = y > H - 66 ? y - 46 : y + 12;
  ctx.fillStyle = 'rgba(16,18,28,.88)';
  ctx.fillRect(px, py, 34, 34);
  ctx.strokeStyle = sk.count > 0 ? '#ffb340' : '#e05548';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, 32, 32);
  if (ico) ctx.drawImage(ico, px + 17 - (ico.width >> 1), py + 11 - (ico.height >> 1));
  drawPText(ctx, String(sk.count), px + 17, py + 23, 2, sk.count > 0 ? '#ffb340' : '#e05548');
}

const logoCtx = $('#logo').getContext('2d');
function drawLogo(now){
  logoCtx.clearRect(0, 0, 350, 40);
  drawPText(logoCtx, 'SUIVEZ LE GUIDE', 158, 15, 5, '#173d1f');
  drawPText(logoCtx, 'SUIVEZ LE GUIDE', 155, 12, 5, '#5ad25a');
  logoCtx.drawImage(SPR_WALK[((now * 9) | 0) % 4], 312, 9);
  logoCtx.save();
  logoCtx.translate(324, 0); logoCtx.scale(-1, 1); logoCtx.translate(-324, 0);
  logoCtx.drawImage(SPR_WALK[(((now * 9) | 0) + 2) % 4], 312, 9);
  logoCtx.restore();
}

/* ---------------- caméra & mini-carte ---------------- */
function updateCamera(dt){
  const maxC = LW - W / zoomLevel;
  if (maxC <= 0){ camX = 0; return; }
  let v = 0;
  if (keyL) v -= 700;
  if (keyR) v += 700;
  if (running && !paused && !ended && !homeOpen && mouse.in && !mmDrag){
    if (mouse.x < 26) v -= 700;
    else if (mouse.x > W - 26) v += 700;
  }
  if (v) camX = clamp(camX + v * dt, 0, maxC);
}

function drawMinimap(){
  mmRect = null;
  if ((LW <= W && zoomLevel <= 1) || homeOpen) return;
  const h = 30, w = Math.max(60, Math.round(LW * h / H));
  if (frameCount % 45 === 1 || mmCv.width !== w){
    mmCv.width = w; mmCv.height = h;
    mmCv.getContext('2d').drawImage(terrain, 0, 0, LW, H, 0, 0, w, h);
  }
  const mx = W - w - 10, my = 8;
  ctx.fillStyle = 'rgba(5,7,13,.72)';
  ctx.fillRect(mx - 3, my - 3, w + 6, h + 6);
  ctx.strokeStyle = '#454c66'; ctx.lineWidth = 1;
  ctx.strokeRect(mx - 2.5, my - 2.5, w + 5, h + 5);
  ctx.drawImage(mmCv, mx, my);
  for (const l of lemmings){
    ctx.fillStyle = l.state === 'block' ? '#e05548' : '#f4d43c';
    ctx.fillRect(mx + l.x / LW * w - 1, my + l.y / H * h - 1, 2, 2);
  }
  ctx.fillStyle = '#c9a35f';
  ctx.fillRect(mx + HATCH.x / LW * w - 1, my + (HATCH.y - 26) / H * h, 2, 3);
  ctx.fillStyle = '#5ad25a';
  ctx.fillRect(mx + EXIT.x / LW * w - 1, my + (EXIT.y - 36) / H * h, 2, 3);
  ctx.strokeStyle = '#ffb340';
  ctx.strokeRect(mx + camX / LW * w + .5, my + camY / H * h + .5,
                 W / zoomLevel / LW * w, H / zoomLevel / H * h);
  mmRect = { mx, my, w, h };
}

function camFromMinimap(){
  if (!mmRect) return;
  camX = clamp((mouse.x - mmRect.mx) / mmRect.w * LW - W / zoomLevel / 2,
               0, LW - W / zoomLevel);
  camY = clamp((mouse.y - mmRect.my) / mmRect.h * H - H / zoomLevel / 2,
               0, H - H / zoomLevel);
}

/* ---------------- icônes de compétences ---------------- */
const ICON_SRC = {
  block: [
    "..RRRRRRRR..",
    ".RRRRRRRRRR.",
    "RRRWWWWWWRRR",
    "RRWWWWWWWWRR",
    "RRWWWWWWWWRR",
    "RRRWWWWWWRRR",
    ".RRRRRRRRRR.",
    "..RRRRRRRR.."
  ],
  dig: [
    "....OO....",
    "....OO....",
    "..OOOOOO..",
    "....OO....",
    "....OO....",
    ".o......o.",
    ".oo....oo.",
    ".oooooooo.",
    "..oooooo.."
  ],
  float: [
    "..RRRRRRRR..",
    ".RWWRRRRWWR.",
    "RRRRRRRRRRRR",
    "R..R....R..R",
    "...B....B...",
    "...BBBBBB...",
    "....BBBB....",
    "....B..B....",
    "...b....b..."
  ],
  climb: [
    "........F...",
    ".......FF...",
    "..GG...FF...",
    ".GGGG..BBB..",
    "..GG..BBBB.S",
    "......BBBB.S",
    "......B..B.S",
    "......b..b.S"
  ],
  bash: [
    "......O.....",
    "......OO....",
    "OOOOOOOOOO..",
    "OOOOOOOOOOOO",
    "OOOOOOOOOO..",
    "......OO....",
    "......O....."
  ],
  build: [
    "..........OO",
    "..........OO",
    "......OOOOOO",
    "......OOOOOO",
    "..OOOOOOOOOO",
    "..OOOOOOOOOO"
  ],
  mine: [
    "..........S.",
    ".........SSS",
    "........O.S.",
    ".......O....",
    "......O.....",
    ".....O......",
    "....O.......",
    "...O........"
  ]
};
const skillIcons = {};
for (const k of SKILL_KEYS) skillIcons[k] = ICON_SRC[k] ? makeSprite(ICON_SRC[k]) : SPR_BMB;

const skillsEl = $('#skills');
for (const k of SKILL_KEYS){
  const sk = SKILLS[k];
  const b = document.createElement('button');
  b.className = 'skill'; b.dataset.k = k; b.type = 'button';
  b.title = sk.name;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const ico = skillIcons[k];
  g.drawImage(ico, (32 - ico.width) >> 1, (32 - ico.height) >> 1);
  b.appendChild(c);
  if (window.SkillUI && window.SkillUI.bindHint) {
    window.SkillUI.bindHint(b, k);
  } else {
    b.title = sk.name;
    b.setAttribute('aria-label', sk.name);
  }
  const ct = document.createElement('span');
  ct.className = 'count'; ct.textContent = sk.count;
  b.appendChild(ct);
  b.addEventListener('click', () => {
    selSkill = (selSkill === k) ? null : k;
    refreshSkills();
  });
  skillsEl.appendChild(b);
}
function refreshSkills(){
  document.querySelectorAll('.skill').forEach(b => {
    const sk = SKILLS[b.dataset.k];
    b.classList.toggle('sel', b.dataset.k === selSkill);
    b.classList.toggle('empty', sk.count <= 0);
    b.querySelector('.count').textContent = sk.count;
  });
}

/* ---------------- attribution au clic ---------------- */
function pickLem(mx, my){
  let best = null, bd = 1e9;
  for (const l of lemmings){
    if (l.state === 'splat' || l.state === 'exit') continue;
    if (mx >= l.x - 15 && mx <= l.x + 15 && my >= l.y - 32 && my <= l.y + 6){
      const d = (mx - l.x) * (mx - l.x) + (my - l.y + 13) * (my - l.y + 13);
      if (d < bd){ bd = d; best = l; }
    }
  }
  return best;
}

function captureUndoSnapshot(){
  return {
    lemmings: JSON.parse(JSON.stringify(lemmings)),
    parts: JSON.parse(JSON.stringify(parts)),
    fx: JSON.parse(JSON.stringify(fx)),
    bricks: JSON.parse(JSON.stringify(bricks)),
    stats: { ...stats },
    save: {
      progress: SAVE.data.progress,
      scores: JSON.parse(JSON.stringify(SAVE.data.scores))
    },
    mask: mask.slice(),
    terrain: tctx.getImageData(0, 0, LW, H),
    skillCounts: Object.fromEntries(SKILL_KEYS.map(key => [key, SKILLS[key].count])),
    tutorial: {
      active: tutorial.active,
      step: tutorial.step,
      ticks: tutorial.ticks,
      anchor: tutorial.anchor ? { ...tutorial.anchor } : null,
      targetLemIndex: lemmings.indexOf(tutorial.targetLem),
      coachHidden: tutorialCoach.classList.contains('hidden'),
      title: $('#tutorialTitle').textContent,
      text: $('#tutorialText').textContent
    },
    simulation: {
      toSpawn, spawnT, spawnInterval, hatchT, exitOpenT, shake, flashT, flashColor,
      camX, camY, zoomLevel, paused, speedMult, ended, selSkill, accumulator: acc,
      spawnRate: spawnEl.value
    }
  };
}

function refreshUndoButton(){
  const button = $('#btnUndo');
  if (button) button.disabled = !undoSnapshot || !running;
}

function undoLastAction(){
  if (!undoSnapshot || !running) return;
  const snapshot = undoSnapshot;
  undoSnapshot = null;
  lemmings = snapshot.lemmings;
  parts = snapshot.parts;
  fx = snapshot.fx;
  bricks = snapshot.bricks;
  stats = snapshot.stats;
  SAVE.data.progress = snapshot.save.progress;
  SAVE.data.scores = snapshot.save.scores;
  SAVE.save();
  mask = snapshot.mask;
  tctx.putImageData(snapshot.terrain, 0, 0);
  for (const key of SKILL_KEYS) SKILLS[key].count = snapshot.skillCounts[key];
  tutorial.active = snapshot.tutorial.active;
  tutorial.step = snapshot.tutorial.step;
  tutorial.ticks = snapshot.tutorial.ticks;
  tutorial.anchor = snapshot.tutorial.anchor;
  tutorial.targetLem = snapshot.tutorial.targetLemIndex >= 0
    ? lemmings[snapshot.tutorial.targetLemIndex]
    : null;
  $('#tutorialTitle').textContent = snapshot.tutorial.title;
  $('#tutorialText').textContent = snapshot.tutorial.text;
  tutorialCoach.classList.toggle('hidden', snapshot.tutorial.coachHidden);
  toSpawn = snapshot.simulation.toSpawn;
  spawnT = snapshot.simulation.spawnT;
  spawnInterval = snapshot.simulation.spawnInterval;
  hatchT = snapshot.simulation.hatchT;
  exitOpenT = snapshot.simulation.exitOpenT;
  shake = snapshot.simulation.shake;
  flashT = snapshot.simulation.flashT;
  flashColor = snapshot.simulation.flashColor;
  camX = snapshot.simulation.camX;
  camY = snapshot.simulation.camY;
  zoomLevel = snapshot.simulation.zoomLevel;
  paused = snapshot.simulation.paused;
  speedMult = snapshot.simulation.speedMult;
  ended = snapshot.simulation.ended;
  selSkill = snapshot.simulation.selSkill;
  spawnEl.value = snapshot.simulation.spawnRate;
  spawnVal.textContent = (spawnEl.value / 100).toFixed(1) + 's';
  acc = snapshot.simulation.accumulator;
  document.querySelectorAll('#speedSeg button').forEach(button =>
    button.classList.toggle('on', +button.dataset.sp === speedMult));
  $('#end').classList.add('hidden');
  refreshSkills();
  updateHUD();
  drawPauseIcon();
  refreshUndoButton();
}

function buildGhostBricks(x, y, dir){
  const out = [];
  const BLIND = { brickBlind: true };
  for (let i = 0; i < BUILD_BRICKS; i++){
    const nextY = Math.round(y - BUILD_STEP_Y);
    const bx = dir > 0 ? Math.round(x) : Math.round(x - BRICK_W);
    const sx0 = dir > 0 ? bx + 6 : bx;
    const sx1 = dir > 0 ? bx + BRICK_W : bx + 8;
    const hitRow = firstSolidRowIn(sx0, sx1, nextY - 2, nextY + 4, BLIND);
    if (hitRow !== null){
      out.push({ x: bx, y: Math.max(nextY, Math.min(hitRow - 2, nextY - 2)) });
      break;
    }
    out.push({ x: bx, y: nextY });
    if (anySolid(bx, bx + BRICK_W, nextY - 22, nextY - 5, BLIND)) break;
    x = Math.round(x + dir * BUILD_STEP_X); y = nextY;
  }
  return out;
}

function drawBuildPreview(l){
  if (l.state !== 'walk') return;
  const ok = SKILLS.build.count > 0;
  const col = ok ? '#ffb340' : '#e05548';
  const ghosts = buildGhostBricks(l.x, l.y, l.dir);
  ctx.save();
  if (!ghosts.length){
    drawPText(ctx, 'X', Math.round(l.x), Math.round(l.y) - 38, 2, col);
  } else {
    for (const g of ghosts){
      const gx = Math.round(g.x), gy = Math.round(g.y);
      ctx.fillStyle = ok ? 'rgba(255,179,64,.16)' : 'rgba(224,85,72,.14)';
      ctx.fillRect(gx, gy, BRICK_W, 6);
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.strokeRect(gx + .5, gy + .5, BRICK_W - 1, 5);
    }
    const top = ghosts[ghosts.length - 1];
    drawPText(ctx, String(ghosts.length),
              Math.round(top.x) + (BRICK_W >> 1), Math.round(top.y) - 10, 2, col);
  }
  ctx.restore();
}

function previewColors(skill, valid){
  const usable = valid && SKILLS[skill].count > 0;
  return {
    fill: usable ? 'rgba(255,179,64,.28)' : 'rgba(224,85,72,.28)',
    stroke: usable ? '#ffb340' : '#e05548'
  };
}

function drawDigPreview(l){
  const valid = l.state === 'walk';
  const colors = previewColors('dig', valid);
  if (!valid){
    drawPText(ctx, 'X', Math.round(l.x), Math.round(l.y) - 38, 2, colors.stroke);
    return;
  }
  const x = Math.round(l.x) - 8;
  const startY = Math.round(l.y);
  let depth = 0;
  ctx.fillStyle = colors.fill;
  for (; depth < DIG_MAX_DEPTH && startY + depth < H; depth += 2){
    if (!anySolid(x, x + 16, startY + depth, startY + depth + 6)) break;
    ctx.fillRect(x, startY + depth, 17, 2);
  }
  if (depth > 0){
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, startY + .5, 16, depth - 1);
  } else drawPText(ctx, 'X', Math.round(l.x), startY - 38, 2, colors.stroke);
}

function drawBashPreview(l){
  const valid = l.state === 'walk' || l.state === 'fall';
  const colors = previewColors('bash', valid);
  if (!valid){
    drawPText(ctx, 'X', Math.round(l.x), Math.round(l.y) - 38, 2, colors.stroke);
    return;
  }
  let firstHit = -1, lastHit = -1, gaps = 0;
  for (let distance = 0; distance <= BASH_MAX_WIDTH; distance += 2){
    const px = Math.round(l.x + l.dir * distance);
    const x = l.dir > 0 ? px + 1 : px - 11;
    const hit = anySolid(x, x + 12, l.y - 26, l.y - BASH_WALL_MIN, BASH_PROBE);
    if (hit){
      if (firstHit < 0) firstHit = distance;
      lastHit = distance;
      gaps = 0;
    } else if (firstHit >= 0 && ++gaps >= 3) break;
  }
  ctx.save();
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1;
  if (firstHit >= 0){
    const x0 = l.x + l.dir * firstHit;
    const x1 = l.x + l.dir * lastHit;
    const left = Math.min(x0, x1) + (l.dir > 0 ? 0 : -8);
    const width = Math.max(8, Math.abs(x1 - x0) + 8);
    ctx.fillRect(left, l.y - 27, width, 27);
    ctx.strokeRect(left + .5, l.y - 26.5, width - 1, 26);
  } else {
    const maxDist = Math.min(48, BASH_MAX_WIDTH);
    const start = l.x + l.dir * 7;
    const end = l.x + l.dir * maxDist;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(start, l.y - 14);
    ctx.lineTo(end, l.y - 14);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
function drawMinePreview(l){
  const valid = l.state === 'walk' && (isSolid(l.x, l.y + 1) || isSolid(l.x, l.y + 2));
  const colors = previewColors('mine', valid);
  if (!valid){
    drawPText(ctx, 'X', Math.round(l.x), Math.round(l.y) - 38, 2, colors.stroke);
    return;
  }
  let x = Math.round(l.x), y = Math.round(l.y), depth = 0;
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1;
  while (depth < MINE_MAX_DEPTH && y < H){
    const carveX = l.dir > 0 ? x + 1 : x - 11;
    if (!anySolid(carveX, carveX + 10, y - 26, y + 3)) break;
    ctx.fillRect(carveX, y - 26, 10, 30);
    ctx.strokeRect(carveX + .5, y - 25.5, 9, 29);
    x += l.dir * 2;
    y += 2;
    depth += 2;
    const nextX = l.dir > 0 ? x + 1 : x - 11;
    if (!anySolid(nextX, nextX + 10, y - 26, y + 3)) break;
  }
  if (depth === 0) drawPText(ctx, 'X', Math.round(l.x), Math.round(l.y) - 38, 2, colors.stroke);
}

/* contour de sélection du lemming survolé (compétence armée) */
const silCv = document.createElement('canvas');
function drawHoverOutline(){
  const l = pickLem(camX + mouse.x / zoomLevel, camY + mouse.y / zoomLevel);
  if (!l) return;
  const spr = lemSprite(l);
  if (!spr) return;
  // teinte le sprite en couleur unie
  silCv.width = spr.width; silCv.height = spr.height;   // le reset efface aussi
  const g = silCv.getContext('2d');
  g.drawImage(spr, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = SKILLS[selSkill].count > 0 ? '#ffb340' : '#e05548';
  g.fillRect(0, 0, silCv.width, silCv.height);
  // silhouette décalée dans les 4 directions, avec le même miroir que drawLem
  const x = Math.round(l.x), y = Math.round(l.y), h = spr.height;
  ctx.save();
  if (l.dir < 0 && l.state !== 'block'){
    ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0);
  }
  for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]])
    ctx.drawImage(silCv, x - (spr.width >> 1) + d[0], y - h + d[1]);
  ctx.restore();
  if (selSkill === 'build') drawBuildPreview(l);
  else if (selSkill === 'dig') drawDigPreview(l);
  else if (selSkill === 'bash') drawBashPreview(l);
  else if (selSkill === 'mine') drawMinePreview(l);
}
function deny(){
  SFX.err();
  const el = document.querySelector('.skill[data-k="' + selSkill + '"]');
  if (el){ el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); }
}
function tryAssign(){
  if (!selSkill || !running || ended || paused) return;
  const l = pickLem(camX + mouse.x / zoomLevel, camY + mouse.y / zoomLevel);
  if (!l) return;
    // débloquer un bloqueur : clic direct sur lui, gratuit (aucun décompte),
  // et possible même quand le stock de bloqueurs est à zéro
  if (selSkill === 'block' && l.state === 'block'){
    undoSnapshot = captureUndoSnapshot();
    l.state = 'walk';
    SFX.assign('block');
    fx.push({ txt: 'FREE', x: l.x, y: l.y - 44, t: 0, color: '#8b91a6' });
    for (let k = 0; k < 6; k++){
      const a = k / 6 * 6.283;
      parts.push({ x: l.x + Math.cos(a) * 8, y: l.y - 13 + Math.sin(a) * 8,
                   vx: Math.cos(a) * .5, vy: Math.sin(a) * .5 - .3,
                   g: .02, life: 14, c: '#dfe3ee', s: 2 });
    }
    refreshUndoButton();
    return;   // on sort AVANT le sk.count-- : rien n'est décompté
  }
  const sk = SKILLS[selSkill];
  if (sk.count <= 0){ deny(); return; }
  const canAssign =
    (selSkill === 'block' && l.state === 'walk') ||
    ((selSkill === 'dig' || selSkill === 'mine') && l.state === 'walk') ||
    (selSkill === 'bash' && !l.bashArm && (l.state === 'walk' || l.state === 'fall')) ||
    (selSkill === 'build' && l.state === 'walk' && !l.buildArm) ||
    (selSkill === 'float' && !l.floater && l.state !== 'block') ||
    (selSkill === 'climb' && !l.climber && l.state !== 'block') ||
    (selSkill === 'bomb' && l.bombT < 0);
  if (!canAssign){ deny(); return; }
  const undoBeforeAction = captureUndoSnapshot();
  let ok = false;
  if (selSkill === 'block' && l.state === 'walk'){ l.state = 'block'; ok = true; }
  else if (selSkill === 'dig' && l.state === 'walk'){
    l.state = 'dig'; l.animT = 0;
    l.y = Math.round(l.y);          // aligne les pieds au pixel : puits continu garanti
    l.digLeft = DIG_MAX_DEPTH;
    ok = true;
  }
  else if (selSkill === 'mine' && l.state === 'walk'){
    l.state = 'mine'; l.animT = 0;
    l.y = Math.round(l.y);            // marches de 2 px : pieds alignés au pixel
    l.mineLeft = MINE_MAX_DEPTH;
    ok = true;
  }
  else if (selSkill === 'bash' && !l.bashArm && (l.state === 'walk' || l.state === 'fall')){
    l.bashArm = true; l.bashLeft = BASH_MAX_WIDTH; ok = true;
  }
  else if (selSkill === 'build' && l.state === 'walk' && !l.buildArm){
    l.buildArm = true; ok = true;   // armé : immédiat sur sol normal, au sommet d'un escalier sinon
  }
  else if (selSkill === 'float' && !l.floater && l.state !== 'block'){ l.floater = true; ok = true; }
  else if (selSkill === 'climb' && !l.climber && l.state !== 'block'){ l.climber = true; ok = true; }
  else if (selSkill === 'bomb' && l.bombT < 0){
    l.bombT = 300; ok = true;
    fx.push({ txt: 'OH NO', x: l.x, y: l.y - 40, t: 0, color: '#e05548' });
  }
  if (ok){
    undoSnapshot = undoBeforeAction;
    if (selSkill !== 'bash') l.bashArm = false;    // une seule mission à la fois
    if (selSkill !== 'build') l.buildArm = false;
    sk.count--;
    SFX.assign(selSkill);
    for (let k = 0; k < 6; k++){
      const a = k / 6 * 6.283;
      parts.push({ x: l.x + Math.cos(a) * 8, y: l.y - 13 + Math.sin(a) * 8,
                   vx: Math.cos(a) * .5, vy: Math.sin(a) * .5 - .3,
                   g: .02, life: 14, c: '#f4f6ff', s: 2 });
    }
    refreshSkills();
    refreshUndoButton();
    if (tutorial.active && tutorial.step === 6 && selSkill === 'bash'){
      tutorial.targetLem = l;
      paused = true;
      tutorial.step = 7;
      showTutorialBubble('Bien joué !', 'Ce petit bonhomme a reçu l’ordre de forer. Observe-le ouvrir le passage et guider son groupe jusqu’à la sortie.', l.x - camX + 24, l.y - 82);
      drawPauseIcon();
    }
  } else deny();
}

/* ---------------- contrôles ---------------- */
function drawPauseIcon(){
  const g = $('#icoPause').getContext('2d');
  g.clearRect(0, 0, 22, 22);
  g.fillStyle = '#dfe3ee';
  if (!paused){ g.fillRect(5, 4, 4, 14); g.fillRect(13, 4, 4, 14); }
  else {
    g.beginPath();
    g.moveTo(6, 4); g.lineTo(18, 11); g.lineTo(6, 18);
    g.closePath(); g.fill();
  }
}
function drawSoundIcon(){
  const g = $('#icoSound').getContext('2d');
  g.clearRect(0, 0, 22, 22);
  g.fillStyle = '#dfe3ee';
  g.fillRect(2, 8, 4, 6);
  g.beginPath();
  g.moveTo(6, 8); g.lineTo(11, 3); g.lineTo(11, 19); g.lineTo(6, 14);
  g.closePath(); g.fill();
  if (SFX.on){
    g.strokeStyle = '#ffb340'; g.lineWidth = 2;
    g.beginPath(); g.arc(12, 11, 4, -.85, .85); g.stroke();
    g.beginPath(); g.arc(12, 11, 8, -.85, .85); g.stroke();
  } else {
    g.strokeStyle = '#e05548'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(14, 7); g.lineTo(20, 15);
    g.moveTo(20, 7); g.lineTo(14, 15);
    g.stroke();
  }
}
(function drawNukeIcon(){
  const g = $('#icoNuke').getContext('2d');
  g.fillStyle = '#f4e8dc';
  g.fillRect(6, 2, 10, 9); g.fillRect(4, 4, 14, 6); g.fillRect(7, 11, 8, 4);
  g.fillStyle = '#2a0c08';
  g.fillRect(7, 6, 3, 3); g.fillRect(12, 6, 3, 3); g.fillRect(10, 11, 2, 2);
  g.fillStyle = '#f4e8dc';
  g.fillRect(8, 15, 1, 3); g.fillRect(10, 15, 1, 3); g.fillRect(12, 15, 1, 3);
})();

function togglePause(){
  if (!running || ended) return;
  if (!gameOptionsEl.classList.contains('hidden')) return;
  if (tutorial.active && !tutorialCoach.classList.contains('hidden')) return;
  paused = !paused;
  drawPauseIcon();
}
 $('#btnPause').addEventListener('click', togglePause);

document.querySelectorAll('#speedSeg button').forEach(b =>
  b.addEventListener('click', () => {
    speedMult = +b.dataset.sp;
    document.querySelectorAll('#speedSeg button').forEach(x => x.classList.toggle('on', x === b));
  })
);

const spawnEl = $('#spawnRate'), spawnVal = $('#spawnVal');
function applySpawn(){
  spawnInterval = Math.round(+spawnEl.value * .6);
  spawnVal.textContent = (+spawnEl.value / 100).toFixed(1) + 's';
}
spawnEl.addEventListener('input', applySpawn);

const nukeBtn = $('#btnNuke');
$('#btnUndo').addEventListener('click', undoLastAction);
let nukeArm = 0;
function setNukeLabel(label){
  if (!nukeBtn) return;
  nukeBtn.title = label;
  nukeBtn.textContent = label;
}

nukeBtn.addEventListener('click', () => {
  if (!running || ended) return;
  if (nukeArm){
    clearTimeout(nukeArm); nukeArm = 0;
    setNukeLabel('NUKE');
    nuke();
  } else {
    setNukeLabel('SÛR ?');
    nukeArm = setTimeout(() => { nukeArm = 0; setNukeLabel('NUKE'); }, 2400);
  }
});

function toggleSound(){
  SFX.on = !SFX.on;
  drawSoundIcon();
}
 $('#btnSound').addEventListener('click', toggleSound);
document.addEventListener('pointerdown', () => SFX.ensure());

addEventListener('keydown', e => {
  if (!gameOptionsEl.classList.contains('hidden')){
    if (e.key === 'Escape') closeGameOptions();
    return;
  }
  if (e.key === 'ArrowLeft'){ keyL = true; e.preventDefault(); }
  else if (e.key === 'ArrowRight'){ keyR = true; e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'Space'){ e.preventDefault(); togglePause(); }
  else if (e.key === 'z' || e.key === 'Z'){ e.preventDefault(); undoLastAction(); }
  else if (e.key >= '1' && e.key <= '8'){
    const k = SKILL_KEYS[+e.key - 1];
    selSkill = (selSkill === k) ? null : k;
    refreshSkills();
  }
  else if (e.key === 'Escape'){ selSkill = null; refreshSkills(); }
  else if ((e.key === 'r' || e.key === 'R') && !homeOpen) restart();
  else if (e.key === 'm' || e.key === 'M') toggleSound();
  else if (e.key === 'n' || e.key === 'N'){   // optionnel : saut de niveau (tests)
    if (running && !ended){
      curLevel = (curLevel + 1) % LEVELS.length;
      initLevel(); running = true;
    }
  }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') keyL = false;
  if (e.key === 'ArrowRight') keyR = false;
});

function toCanvas(e){
  const r = cv.getBoundingClientRect();
  mouse.x = clamp((e.clientX - r.left) * W / r.width, 0, W);
  mouse.y = clamp((e.clientY - r.top) * H / r.height, 0, H);
}
function canvasPoint(touch){
  const r = cv.getBoundingClientRect();
  return {
    x: clamp((touch.clientX - r.left) * W / r.width, 0, W),
    y: clamp((touch.clientY - r.top) * H / r.height, 0, H)
  };
}
function beginPinch(touches){
  const first = canvasPoint(touches[0]), second = canvasPoint(touches[1]);
  const centerX = (first.x + second.x) / 2, centerY = (first.y + second.y) / 2;
  touchGesture = {
    type: 'pinch',
    distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
    zoom: zoomLevel,
    worldX: camX + centerX / zoomLevel,
    worldY: camY + centerY / zoomLevel
  };
  mmDrag = false;
  mouse.in = false;
}
function updatePinch(touches){
  const first = canvasPoint(touches[0]), second = canvasPoint(touches[1]);
  const centerX = (first.x + second.x) / 2, centerY = (first.y + second.y) / 2;
  const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
  zoomLevel = clamp(touchGesture.zoom * distance / touchGesture.distance, 1, 2.4);
  camX = clamp(touchGesture.worldX - centerX / zoomLevel, 0, Math.max(0, LW - W / zoomLevel));
  camY = clamp(touchGesture.worldY - centerY / zoomLevel, 0, H - H / zoomLevel);
}
cv.addEventListener('mousemove', e => { toCanvas(e); mouse.in = true; if (mmDrag) camFromMinimap(); });
cv.addEventListener('mouseleave', () => { mouse.in = false; });
cv.addEventListener('mousedown', e => {
  e.preventDefault(); toCanvas(e); SFX.ensure();
  if (mmRect && mouse.x >= mmRect.mx && mouse.x <= mmRect.mx + mmRect.w &&
      mouse.y >= mmRect.my && mouse.y <= mmRect.my + mmRect.h){
    mmDrag = true; camFromMinimap(); return;      // clic sur la mini-carte : déplacement de vue
  }
  tryAssign();
});
addEventListener('mouseup', () => { mmDrag = false; });
cv.addEventListener('touchstart', e => {
  e.preventDefault(); SFX.ensure();
  if (e.touches.length >= 2){
    if (!touchGesture || touchGesture.type !== 'pinch') beginPinch(e.touches);
    return;
  }
  toCanvas(e.touches[0]);
  mouse.in = true;
  if (mmRect && mouse.x >= mmRect.mx && mouse.x <= mmRect.mx + mmRect.w &&
      mouse.y >= mmRect.my && mouse.y <= mmRect.my + mmRect.h){
    touchGesture = { type:'minimap' };
    mmDrag = true; camFromMinimap(); return;
  }
  touchGesture = { type:'tap', startX:mouse.x, startY:mouse.y };
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!e.touches.length) return;
  if (e.touches.length >= 2){
    if (!touchGesture || touchGesture.type !== 'pinch') beginPinch(e.touches);
    updatePinch(e.touches);
    return;
  }
  if (touchGesture && touchGesture.type === 'minimap'){
    toCanvas(e.touches[0]);
    camFromMinimap();
  } else if (touchGesture && touchGesture.type === 'tap'){
    toCanvas(e.touches[0]);
    if (Math.hypot(mouse.x - touchGesture.startX, mouse.y - touchGesture.startY) > 12)
      touchGesture.moved = true;
  }
}, { passive: false });
cv.addEventListener('touchend', e => {
  if (e.touches.length) return;
  if (touchGesture && touchGesture.type === 'tap' && !touchGesture.moved){
    if (e.changedTouches.length) toCanvas(e.changedTouches[0]);
    tryAssign();
  }
  touchGesture = null;
  mmDrag = false;
  mouse.in = false;
});
cv.addEventListener('touchcancel', () => { touchGesture = null; mmDrag = false; mouse.in = false; });
cv.addEventListener('contextmenu', e => {
  e.preventDefault();
  selSkill = null;
  refreshSkills();
});
cv.style.touchAction = 'none';

/* ---------------- accueil ---------------- */
const homeEl = $('#home');
const gameOptionsEl = $('#gameOptions');
let homeOpen = true, homeSec = 'main', helpSprites = [];
let gameOptionsWasPaused = false, tutorialCoachWasVisible = false;

function homeShow(sec){
  homeSec = sec;
  ['Main', 'Levels', 'Scores', 'Options', 'Help'].forEach(s =>
    $('#hm' + s).classList.toggle('hidden', s.toLowerCase() !== sec));
  if (sec === 'levels') buildLevelList();
  if (sec === 'scores') buildScoreTable();
}
function showHome(){
  homeOpen = true; running = false; paused = false; ended = false;
  gameOptionsEl.classList.add('hidden');
  tutorial.active = false; tutorial.step = -1; tutorial.anchor = null;
  tutorialCoach.classList.add('hidden');
  document.body.classList.add('homeMode');
  homeEl.classList.remove('hidden');
  $('#end').classList.add('hidden');
  homeShow('main');
}
function startLevel(i){
  SFX.ensure();
  curLevel = i;
  initLevel();
  homeOpen = false;
  document.body.classList.remove('homeMode');
  homeEl.classList.add('hidden');
  running = true;
  beginTutorial();
}

function openGameOptions(){
  if (!running || ended || !gameOptionsEl.classList.contains('hidden')) return;
  gameOptionsWasPaused = paused;
  tutorialCoachWasVisible = !tutorialCoach.classList.contains('hidden');
  if (tutorialCoachWasVisible) tutorialCoach.classList.add('hidden');
  keyL = false; keyR = false;
  paused = true;
  drawPauseIcon();
  gameOptionsEl.classList.remove('hidden');
}

function closeGameOptions(){
  if (gameOptionsEl.classList.contains('hidden')) return;
  gameOptionsEl.classList.add('hidden');
  paused = gameOptionsWasPaused;
  if (tutorialCoachWasVisible && tutorial.active) tutorialCoach.classList.remove('hidden');
  tutorialCoachWasVisible = false;
  drawPauseIcon();
}

function returnToMainMenu(){
  gameOptionsEl.classList.add('hidden');
  SFX.ensure();
  showHome();
}

 $('#hPlay').addEventListener('click', () => startLevel(0));
 $('#hLevels').addEventListener('click', () => homeShow('levels'));
 $('#hScores').addEventListener('click', () => homeShow('scores'));
 $('#hOptions').addEventListener('click', () => homeShow('options'));
 $('#optHelp').addEventListener('click', () => homeShow('help'));
 $('#btnMenu').addEventListener('click', openGameOptions);
 $('#gameOptReturn').addEventListener('click', closeGameOptions);
 $('#gameOptMenu').addEventListener('click', returnToMainMenu);
 $('#btnHomeEnd').addEventListener('click', () => { SFX.ensure(); showHome(); });
document.querySelectorAll('#home .back').forEach(b =>
  b.addEventListener('click', () => homeShow(b.dataset.back || 'main')));

function buildLevelList(){
  const box = $('#lvlList');
  box.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const unlocked = i < SAVE.data.progress;
    const rec = SAVE.data.scores[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lvlBtn' + (unlocked ? '' : ' locked');
    b.disabled = !unlocked;
    
    const nm = document.createElement('b');
    nm.textContent = String(i + 1).padStart(2, '0') + ' · ' + lvl.name;
    b.appendChild(nm);
    
    const sm = document.createElement('small');
    const trackName = TRACKS[i % TRACKS.length].name;
    
    sm.textContent = unlocked
      ? (rec ? 'RECORD ' + rec.saved + '/' + lvl.total + ' · ' + fmtTime(rec.time)
             : 'OBJECTIF ' + lvl.goal + '/' + lvl.total) + ' · ♪ ' + trackName
      : 'VERROUILLÉ — réussissez le niveau précédent';
      
    b.appendChild(sm);
    if (unlocked) b.addEventListener('click', () => startLevel(i));
    box.appendChild(b);
  });
}

const THEME_DOT = { night:'#8ea0d0', dawn:'#f4c86a', cave:'#8a6ae8', volcano:'#e0552f', ice:'#a8d4ec' };

function buildScoreTable(){
  const box = $('#scoreBody');
  box.replaceChildren();
  const records = LEVELS.reduce((count, level, index) => count + (SAVE.data.scores[index] ? 1 : 0), 0);
  const savedTotal = LEVELS.reduce((total, level, index) =>
    total + (SAVE.data.scores[index] ? SAVE.data.scores[index].saved : 0), 0);
  const possibleTotal = LEVELS.reduce((total, level) => total + level.total, 0);
  const overview = document.createElement('div');
  overview.className = 'scoreOverview';
  overview.innerHTML = '<strong>' + savedTotal + ' / ' + possibleTotal + '</strong>' +
    '<span>LEMMINGS SAUVÉS · ' + records + ' / ' + LEVELS.length + ' RECORDS</span>';
  box.appendChild(overview);

  const groupNames = ['Le départ', 'Premiers défis', 'Techniques avancées', 'La maîtrise', 'Dernière ligne droite'];
  for (let start = 0; start < LEVELS.length; start += 5){
    const end = Math.min(start + 5, LEVELS.length);
    const group = document.createElement('details');
    group.className = 'scoreGroup';
    group.open = start === 0;
    const groupRecords = LEVELS.slice(start, end)
      .reduce((count, level, offset) => count + (SAVE.data.scores[start + offset] ? 1 : 0), 0);
    const summary = document.createElement('summary');
    summary.innerHTML = '<strong>' + String(start + 1).padStart(2, '0') + '–' +
      String(end).padStart(2, '0') + ' · ' + groupNames[Math.floor(start / 5)] +
      '</strong><span>' + groupRecords + ' / ' + (end - start) + ' RECORDS</span>';
    group.appendChild(summary);

    const rows = document.createElement('div');
    rows.className = 'scoreRows';
    for (let index = start; index < end; index++){
      const level = LEVELS[index], record = SAVE.data.scores[index];
      const row = document.createElement('div');
      row.className = 'scoreRow' + (record ? '' : ' noRecord');
      const name = document.createElement('div');
      name.className = 'scoreName';
      const dot = document.createElement('i');
      dot.className = 'tdot';
      dot.style.background = THEME_DOT[level.theme] || THEME_DOT.night;
      const label = document.createElement('span');
      label.textContent = String(index + 1).padStart(2, '0') + ' · ' + level.name;
      name.append(dot, label);

      const progress = document.createElement('span');
      progress.className = 'scoreProgress';
      const fill = document.createElement('i');
      fill.style.width = record ? Math.min(100, Math.round(record.saved / level.total * 100)) + '%' : '0%';
      progress.appendChild(fill);

      const result = document.createElement('span');
      result.className = 'scoreResult';
      result.textContent = record
        ? record.saved + '/' + level.total + ' · ' + fmtTime(record.time)
        : 'AUCUN RECORD';
      row.append(name, progress, result);
      rows.appendChild(row);
    }
    group.appendChild(rows);
    box.appendChild(group);
  }
}

/* options */
const sfxEl = $('#optSfx'), musEl = $('#optMus'), fxEl = $('#optFx');
const gameSfxEl = $('#gameOptSfx'), gameMusEl = $('#gameOptMus'), gameFxEl = $('#gameOptFx');
function syncOpts(){
  sfxEl.value = Math.round(SAVE.data.opt.sfx * 100);
  musEl.value = Math.round(SAVE.data.opt.mus * 100);
  fxEl.value = Math.round((SAVE.data.opt.fx ?? 1) * 100);
  gameSfxEl.value = sfxEl.value;
  gameMusEl.value = musEl.value;
  gameFxEl.value = fxEl.value;
  visualIntensity = fxEl.value / 100;
  $('#optSfxVal').textContent = sfxEl.value + '%';
  $('#optMusVal').textContent = musEl.value + '%';
  $('#optFxVal').textContent = fxEl.value + '%';
  $('#gameOptSfxVal').textContent = gameSfxEl.value + '%';
  $('#gameOptMusVal').textContent = gameMusEl.value + '%';
  $('#gameOptFxVal').textContent = gameFxEl.value + '%';
}
function setSfxVolume(slider){
  SAVE.data.opt.sfx = slider.value / 100;
  SFX.ensure(); SFX.setVol(SAVE.data.opt.sfx);
  sfxEl.value = gameSfxEl.value = slider.value;
  $('#optSfxVal').textContent = $('#gameOptSfxVal').textContent = slider.value + '%';
  SAVE.save();
}
function setMusicVolume(slider){
  SAVE.data.opt.mus = slider.value / 100;
  MUSIC.ensure(); MUSIC.setVol(SAVE.data.opt.mus);
  musEl.value = gameMusEl.value = slider.value;
  $('#optMusVal').textContent = $('#gameOptMusVal').textContent = slider.value + '%';
  SAVE.save();
}
function setVisualIntensity(slider){
  visualIntensity = slider.value / 100;
  SAVE.data.opt.fx = visualIntensity;
  fxEl.value = gameFxEl.value = slider.value;
  $('#optFxVal').textContent = $('#gameOptFxVal').textContent = slider.value + '%';
  SAVE.save();
}
sfxEl.addEventListener('input', () => setSfxVolume(sfxEl));
gameSfxEl.addEventListener('input', () => setSfxVolume(gameSfxEl));
musEl.addEventListener('input', () => setMusicVolume(musEl));
gameMusEl.addEventListener('input', () => setMusicVolume(gameMusEl));
fxEl.addEventListener('input', () => setVisualIntensity(fxEl));
gameFxEl.addEventListener('input', () => setVisualIntensity(gameFxEl));
let resetArm = 0;
 $('#optReset').addEventListener('click', () => {
  const b = $('#optReset');
  if (resetArm){
    clearTimeout(resetArm); resetArm = 0;
    SAVE.data.progress = 1; SAVE.data.scores = {}; SAVE.save();
    b.textContent = 'RÉINITIALISER LA PARTIE';
  } else {
    b.textContent = 'SÛR ? (PROGRESSION + SCORES)';
    resetArm = setTimeout(() => { resetArm = 0; b.textContent = 'RÉINITIALISER LA PARTIE'; }, 2600);
  }
});

/* aide : lignes avec lemmings animés (réutilisation de lemSprite) */
function buildHelp(){
  const body = $('#helpBody');
  body.innerHTML = '';
  const sect = t => { const h = document.createElement('h3'); h.textContent = t; body.appendChild(h); };
  const p = t => { const e = document.createElement('p'); e.textContent = t; body.appendChild(e); };
  sect('LE PRINCIPE');
  p('Les lemmings déferlent de la trappe et marchent sans réfléchir. Guidez-en assez ' +
    'vers la porte de sortie pour atteindre l\'objectif du niveau. Le niveau se termine ' +
    'quand il ne reste plus aucun lemming à l\'écran.');
  p('Une chute de plus de 75 pixels est mortelle — sauf pour un parachutiste. Le stock ' +
    'de chaque compétence est limité : cliquez sur un lemming pour lui donner la ' +
    'compétence sélectionnée, et économisez vos exemplaires.');
  sect('CONTRÔLES');
  const ul = document.createElement('ul');
  ul.innerHTML =
    '<li><b>Clic gauche</b> : attribuer la compétence au lemming visé</li>' +
    '<li><b>Clic droit / Échap</b> : désarmer la compétence</li>' +
    '<li><b>Touches 1-8</b> : sélectionner une compétence</li>' +
    '<li><b>Espace</b> : pause · <b>×1 / ×2 / ×4</b> : vitesse · <b>R</b> : recommencer · <b>M</b> : son</li>';
  body.appendChild(ul);
  sect('LES COMPÉTENCES');
  const DESC = [
    ['block', '1', "S'immobilise et renvoie les autres lemmings dans l'autre sens. Re-cliquez sur un bloqueur avec la compétence bloqueur pour le libérer — gratuit."],
    ['dig',   '2', 'Creuse verticalement sous ses pieds, jusqu\'à 70 px de profondeur.'],
    ['float', '3', 'Déploie un parachute et survit à toutes les chutes. Capacité permanente.'],
    ['climb', '4', 'Escalade les parois verticales et se hisse au sommet. Décroche sous un plafond. Capacité permanente.'],
    ['bash',  '5', 'Perce horizontalement les murs. La mission reste armée jusqu\'au premier vrai mur (chevron orange).'],
    ['build', '6', 'Èrige un escalier de 12 briques. Sur un escalier existant, il bâtit depuis le sommet (brique jaune = mission en attente).'],
    ['mine',  '7', 'Creuse un tunnel diagonal à 45° avec sa pioche, jusqu\'à 90 px de descente.'],
    ['bomb',  '8', 'Compte à rebours de 5 secondes puis explose en détruisant le terrain alentour.']
  ];
  helpSprites = [];
  for (const [k, key, txt] of DESC){
    const row = document.createElement('div');
    row.className = 'hrow';
    const c = document.createElement('canvas');
    c.width = 28; c.height = 40;
    row.appendChild(c);
    const d = document.createElement('div');
    d.innerHTML = '<b>' + SKILLS[k].name + ' <span class="key">TOUCHE ' + key + '</span></b>' +
                  '<span>' + txt + '</span>';
    row.appendChild(d);
    body.appendChild(row);
    const fake = { state: k === 'float' ? 'fall' : (k === 'bomb' ? 'walk' : k),
                   animT: 0, dir: 1, chute: k === 'float', buildT: 13 };
    helpSprites.push({ cv: c, fake });
  }
  sect('ASTUCES');
  p('Un bloqueur seul en fin de niveau ? Le NUKE (double clic) ou libérez-le au clic. ' +
    'Parachutiste + grimpeur combinés franchissent les grands vides. Briques et terrain ' +
    'se détruisent à l\'explosion — utile pour se désenfouir.');
}
function animateHelp(){
  for (const h of helpSprites){
    h.fake.animT++;
    const g = h.cv.getContext('2d');
    g.clearRect(0, 0, 28, 40);
    const spr = lemSprite(h.fake);
    if (!spr) continue;
    g.drawImage(spr, (28 - spr.width) >> 1, 40 - spr.height);
    if (h.fake.chute) g.drawImage(SPR_CAN, 0, 40 - spr.height - 10);
  }
}

/* bannière animée de l'accueil */
const hbCtx = $('#homeBanner').getContext('2d');
const WAVE_WORDS = ['COUCOU', 'SALUT', 'CA VA ?', 'BONJOUR', 'HOLA', 'HELLO',
                    'SAUVEZ-VOUS', 'AU SECOURS', "C'EST PAR OU ?", 'HELP !',
                    'SAUVEZ MOI !', 'TONCPLAY !'];
const bannerLems = [];
let hbLast = 0, hbWaveT = 3;
(function initBannerLems(){
  for (let i = 0; i < 6; i++) bannerLems.push({ x: 40 + i * 90,  dir: 1,  wave: 0, anim: i * 3 });
  for (let i = 0; i < 4; i++) bannerLems.push({ x: 520 - i * 125, dir: -1, wave: 0, anim: i * 3 + 1 });
})();

function drawHomeBanner(now){
  const g = hbCtx, w = 560, h = 130;
  const dt = hbLast ? Math.min(.1, now - hbLast) : 0;   // delta borné (retour d'onglet)
  hbLast = now;

  g.fillStyle = '#0c1020'; g.fillRect(0, 0, w, h);
  const rs = mulberry32(3);
  for (let i = 0; i < 30; i++){
    g.globalAlpha = .3 + rs() * .5; g.fillStyle = '#dfe4f2';
    g.fillRect((rs() * w) | 0, (rs() * 60) | 0, 1, 1);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#7c4c24'; g.fillRect(0, h - 14, w, 14);
  g.fillStyle = '#2a7a2f'; g.fillRect(0, h - 17, w, 4);
  g.fillStyle = '#35923a';
  for (let x = 0; x < w; x += 2) g.fillRect(x, h - 19, 1, 2);
  drawPText(g, 'SUIVEZ LE GUIDE', w / 2 + 3, 15, 8, '#173d1f');
  drawPText(g, 'SUIVEZ LE GUIDE', w / 2, 12, 8, '#5ad25a');
  drawPText(g, 'MENEZ LES VERS LA LIBERTÉ', w / 2, 58, 3, '#ffb340');

  // toutes les 3 s : un marcheur visible au hasard s'arrête, tire un mot
  // au sort et fait coucou 2 s
  hbWaveT -= dt;
  if (hbWaveT <= 0){
    hbWaveT = 3;
    const cands = bannerLems.filter(l => !l.wave && l.x > 34 && l.x < w - 34);
    if (cands.length){
      const c = cands[(Math.random() * cands.length) | 0];
      c.wave = 2;
      c.word = WAVE_WORDS[(Math.random() * WAVE_WORDS.length) | 0];
    }
  }

  const gy = h - 17 - 26;   // ligne de sol des lemmings (inchangée)
  for (const l of bannerLems){
    l.anim += dt * 9;
    const x = Math.round(l.x);
    if (l.wave > 0){
      l.wave -= dt;
      g.save();
      if (l.dir < 0){ g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
      g.drawImage(SPR_WAVE[((now * 5) | 0) & 1], x - 12, gy);
      g.restore();
      drawPText(g, l.word || 'COUCOU', x, gy - 12, 2, '#f4d43c');
    } else {
      l.x += l.dir * 22 * dt;
      if (l.dir > 0 && l.x > w + 16) l.x = -16;
      if (l.dir < 0 && l.x < -16) l.x = w + 16;
      g.save();
      if (l.dir < 0){ g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
      g.drawImage(SPR_WALK[(l.anim | 0) % 4], x - 12, gy);
      g.restore();
    }
  }
}

/* ---------------- niveau & boucle ---------------- */
function showTutorialBubble(title, text, x, y, centered = false){
  $('#tutorialTitle').textContent = title;
  $('#tutorialText').textContent = text;
  tutorial.anchor = { x, y, centered };
  tutorialCoach.classList.remove('hidden');
  positionTutorialBubble();
}

function positionTutorialBubble(){
  if (!tutorial.anchor || tutorialCoach.classList.contains('hidden')) return;
  const wrapRect = $('#gameWrap').getBoundingClientRect();
  const canvasRect = cv.getBoundingClientRect();
  const margin = 12;
  let left, top;
  if (tutorial.anchor.centered){
    left = (wrapRect.width - tutorialCoach.offsetWidth) / 2;
    top = (wrapRect.height - tutorialCoach.offsetHeight) / 2;
  } else {
    const anchorX = canvasRect.left - wrapRect.left + tutorial.anchor.x * canvasRect.width / W;
    const anchorY = canvasRect.top - wrapRect.top + tutorial.anchor.y * canvasRect.height / H;
    left = anchorX < wrapRect.width * .58 ? anchorX + 18 : anchorX - tutorialCoach.offsetWidth - 18;
    top = anchorY - tutorialCoach.offsetHeight - 12;
  }
  left = clamp(left, margin, wrapRect.width - tutorialCoach.offsetWidth - margin);
  top = clamp(top, margin, wrapRect.height - tutorialCoach.offsetHeight - margin);
  tutorialCoach.style.left = left + 'px';
  tutorialCoach.style.top = top + 'px';
}

function beginTutorial(){
  tutorial.active = curLevel === 0;
  tutorial.step = tutorial.active ? 0 : -1;
  tutorial.ticks = 0;
  tutorial.anchor = null;
  tutorialCoach.classList.add('hidden');
  if (!tutorial.active) return;
  paused = true;
  showTutorialBubble('Salutations !', 'Bienvenue dans Suivez le Guide. Tu vas apprendre à guider ces bon hommes et à les aider à rejoindre la sortie.', 0, 0, true);
  drawPauseIcon();
}

function advanceTutorial(event){
  event.stopPropagation();
  if (!tutorial.active) return;
  if (tutorial.step === 0){
    tutorial.step = 1;
    showTutorialBubble('La trappe', 'C’est ici que les Bon hommes arrivent. Ils avancent tout seuls dès qu’ils sortent.', HATCH.x + 52, HATCH.y - 56);
  } else if (tutorial.step === 1){
    tutorial.step = 2;
    tutorial.ticks = 0;
    tutorialCoach.classList.add('hidden');
    paused = false;
    drawPauseIcon();
  } else if (tutorial.step === 3){
    tutorial.step = 4;
    tutorial.ticks = 0;
    tutorialCoach.classList.add('hidden');
    paused = false;
    drawPauseIcon();
  } else if (tutorial.step === 5){
    tutorial.step = 6;
    tutorialCoach.classList.add('hidden');
    paused = false;
    drawPauseIcon();
  } else if (tutorial.step === 7){
    tutorial.step = 8;
    tutorial.ticks = 0;
    tutorialCoach.classList.add('hidden');
    paused = false;
    drawPauseIcon();
  } else if (tutorial.step === 11){
    tutorial.step = 12;
    tutorialCoach.classList.add('hidden');
    paused = false;
    drawPauseIcon();
  } else if (tutorial.step === 13){
    tutorial.step = 14;
    showTutorialBubble('Bonne chance !', 'Tu connais les bases. À toi de jouer, et bonne chance pour sauver toute la tribu !', W / 2, H / 2, true);
  } else if (tutorial.step === 14){
    tutorial.active = false;
    tutorial.step = -1;
    tutorialCoach.classList.add('hidden');
    paused = false;
    drawPauseIcon();
  }
}

function updateTutorial(){
  if (!tutorial.active) return;
  if (tutorial.step === 2 && stats.spawned > 0){
    tutorial.ticks++;
    if (tutorial.ticks >= 60){
      const firstLemming = lemmings.find(lem => lem.state !== 'splat' && lem.state !== 'exit');
      if (!firstLemming) return;
      paused = true;
      tutorial.step = 3;
      showTutorialBubble('Les Bon hommes', 'C’est ce petit personnage que tu dois guider. Il marche seul : à toi de lui donner les bons ordres pour le libérer.', firstLemming.x - camX + 18, firstLemming.y - 52);
      drawPauseIcon();
    }
  } else if (tutorial.step === 4){
    tutorial.ticks++;
    if (tutorial.ticks >= 18){
      const firstLemming = lemmings.find(lem => lem.state !== 'splat' && lem.state !== 'exit');
      if (!firstLemming) return;
      paused = true;
      tutorial.step = 5;
      showTutorialBubble('Donner un ordre', 'Les compétences permettent de leur faire accomplir des actions. Pour ce tutoriel, sélectionne FOREUR puis clique sur un bonhomme : il percera le mur et ouvrira le chemin vers la sortie.', firstLemming.x - camX + 20, firstLemming.y - 52);
      drawPauseIcon();
    }
  } else if (tutorial.step === 8){
    if (tutorial.targetLem && tutorial.targetLem.state === 'bash') tutorial.step = 9;
  } else if (tutorial.step === 9){
    if (!tutorial.targetLem || tutorial.targetLem.state !== 'bash'){
      tutorial.step = 10;
      tutorial.ticks = 0;
    }
  } else if (tutorial.step === 10){
    tutorial.ticks++;
    if (tutorial.ticks >= 60){
      paused = true;
      tutorial.step = 11;
      const target = tutorial.targetLem;
      showTutorialBubble('Le chemin est libre !', 'Le mur est percé : ils n’ont plus qu’à marcher vers la sortie et retrouver leur liberté.', target.x - camX + 24, target.y - 76);
      drawPauseIcon();
    }
  } else if (tutorial.step === 12){
    const nearExit = lemmings.find(lem =>
      lem.state === 'walk' && Math.abs(lem.x - EXIT.x) <= 32 && Math.abs(lem.y - EXIT.y) < 14);
    if (nearExit){
      paused = true;
      tutorial.step = 13;
      showTutorialBubble('Une dernière règle', 'Parfois, il faut accepter de sacrifier quelques lemmings pour permettre au reste du groupe d’atteindre la sortie. Chaque niveau demande de choisir ses priorités.', nearExit.x - camX + 20, nearExit.y - 72);
      drawPauseIcon();
    }
  }
}

tutorialCoach.addEventListener('click', advanceTutorial);
tutorialCoach.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' '){
    event.preventDefault();
    advanceTutorial(event);
  }
});

function initLevel(){
  const lvl = LEVELS[curLevel];
  undoSnapshot = null;
  selSkill = null;
  zoomLevel = 1;
  camY = 0;
  touchGesture = null;
  TOTAL_LEMMINGS = lvl.total;
  cOutTotal.textContent = '/' + TOTAL_LEMMINGS;
  GOAL = lvl.goal;
  HATCH = lvl.hatch;
  EXIT = lvl.exit;
  RECTS = lvl.rects;
  LW = lvl.width || 800;
  setTheme(lvl.theme || 'night');
  rebuildBG();

  terrain.width = LW;                       // reset du canvas terrain
  mask = new Uint8Array(LW * H);
  paintTerrain();
  for (const r of RECTS)
    for (let j = Math.max(0, r.y); j < Math.min(H, r.y + r.h); j++)
      mask.fill(1, j * LW + Math.max(0, r.x), j * LW + Math.min(LW, r.x + r.w));
  for (const b of (lvl.blobs || [])) paintBlob(b);
  for (const c of (lvl.carves || [])){
    if (c.r) carveCircle(c.x, c.y, c.r);
    else carveRect(c.x, c.y, c.w, c.h);
  }

  lemmings = []; parts = []; fx = []; bricks = [];
  stats = { spawned: 0, saved: 0, lost: 0, time: 0 };
  toSpawn = TOTAL_LEMMINGS; spawnT = 55;
  hatchT = 0; exitOpenT = 0; shake = 0; flashT = 0; flashColor = '255,244,210';
  ended = false; paused = false;
  tutorial.active = false; tutorial.step = -1; tutorial.ticks = 0; tutorial.anchor = null; tutorial.targetLem = null;
  tutorialCoach.classList.add('hidden');
  for (const k of SKILL_KEYS){
    SKILLS[k].max = lvl.skills[k] || 0;
    SKILLS[k].count = SKILLS[k].max;
  }
  applySpawn();
  MUSIC.setTrack(curLevel);
  refreshSkills();
  updateHUD();
  camX = clamp((HATCH ? HATCH.x : LW / 2) - W / 2, 0, Math.max(0, LW - W));  // départ : centré sur la trappe
  $('#lvlName').textContent = 'NIVEAU ' + String(curLevel + 1).padStart(2, '0') + ' · ' + lvl.name;
  if (lvl.tutorial && lvl.tutorial.length) {
    $('#lvlGoal').textContent = lvl.tutorial.join('  •  ');
  } else {
    $('#lvlGoal').textContent = 'OBJECTIF — SAUVER ' + GOAL + ' LEMMINGS SUR ' + TOTAL_LEMMINGS;
  }
  $('#end').classList.add('hidden');
  $('#btnNext').classList.add('hidden');
  drawPauseIcon();
  drawSoundIcon();
  refreshUndoButton();
}
function restart(){ initLevel(); running = true; beginTutorial(); }

 $('#btnRetry').addEventListener('click', () => { SFX.ensure(); restart(); });
 $('#btnNext').addEventListener('click', () => {
  SFX.ensure();
  campaignSaved += stats.saved;
  curLevel = Math.min(curLevel + 1, LEVELS.length - 1);
  initLevel();
  acc = 0;
  last = performance.now();
  running = true;
});

SAVE.load();
SFX.setVol(SAVE.data.opt.sfx);
MUSIC.setVol(SAVE.data.opt.mus);
syncOpts();
buildHelp();
initLevel();
showHome();

let last = performance.now(), acc = 0;
function loop(now){
  requestAnimationFrame(loop);
  let dt = now - last; last = now;
  if (dt > 200) dt = 200;
  const wantMusic = running && !paused && !ended && SFX.on;
  if (wantMusic !== MUSIC.playing) wantMusic ? MUSIC.start() : MUSIC.stop();
  if (running && !paused){
    acc += dt;
    while (acc >= TICK && !paused && !ended){
      acc -= TICK;
      for (let s = 0; s < speedMult && !paused && !ended; s++) update();
    }
  }
  updateCamera(dt / 1000);
  render();
}
requestAnimationFrame(loop);