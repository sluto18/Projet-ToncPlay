'use strict';
/* ══════════════════════════════════════════════════════════════════
   AILE D'ACIER v2 — shoot'em up vertical rétro
   v2 : environnements alternés, difficulté adoucie, 11 patrons de
   vagues, 4 nouveaux ennemis, biomes terrestres, écran d'accueil.
   Tout est dessiné par code (aucune image externe).
   ══════════════════════════════════════════════════════════════════ */

/* ════════ 1. CONSTANTES & UTILITAIRES ════════ */

const L = 540, H = 720;              // résolution logique du canvas de jeu
const CADENCES = [0.18, 0.16, 0.14, 0.11];   // cadence de tir par niveau d'arme

const COULEURS_ENV = { terre:'#3f8f4f', ocean:'#3e9ad0', galaxie:'#9a6fd8' };
const NOMS_ENV_LONG = {
  terre: "AU-DESSUS DE LA TERRE",
  ocean: "AU-DESSUS DE L'OCÉAN",
  galaxie: "CŒUR DE LA GALAXIE",
};
const COUL_BALLES = {
  rouge:   { b:'#c22f35', c:'#ffb0a6' },
  ambre:   { b:'#c96e0e', c:'#ffe1a0' },
  magenta: { b:'#8a2fb8', c:'#f0b0ff' },
  ombre:   { b:'#2c3548', c:'#8fa0c0' },   // bombes du bombardier
};

function nomBoss(env, niveau){
  const base = { terre:"GARDIEN D'ACIER", ocean:'KRAKEN DES ABYSSES', galaxie:'SEIGNEUR NÉBULEUX' }[env];
  const precedents = NIVEAUX.slice(0, niveau - 1).filter(s => s.env === env).length;
  return base + (SUFFIXES_BOSS[precedents] || ' MK-X');
}

function alea(a, b){ return a + Math.random() * (b - a); }
function aleaR(rng, a, b){ return a + rng() * (b - a); }
function borne(v, min, max){ return v < min ? min : v > max ? max : v; }
function choix(liste){ return liste[(Math.random() * liste.length) | 0]; }

/* Générateur pseudo-aléatoire seedé (Mulberry32) :
   chaque niveau retrouve toujours "ses" décors. */
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Interpolation angulaire (canons qui traquent le joueur) */
function diffAngle(a, b){ return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
function lerpAngle(a, cible, max){
  const d = diffAngle(a, cible);
  return a + borne(d, -max, max);
}

function cvAux(w, h){
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

/* État des entrées, fusionné clavier + tactile */
const entrees = { g:false, d:false, h:false, b:false, tir:false, joyActif:false, joyX:0, joyY:0 };

/* Texte canvas (Press Start 2P pour les titres, VT323 pour le courant) */
function texte(ctx, s, x, y, taille, couleur, align = 'left', police = '"Press Start 2P"'){
  ctx.font = taille + 'px ' + police + ',"VT323",monospace';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = couleur;
  ctx.fillText(s, x, y);
}

/* ════════ 2. MOTEUR AUDIO (SFX + musique chiptune) ════════ */

const Son = {
  ctx:null, master:null, actif:true, dernierTir:0,

  initialiser(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Tampon de bruit réutilisable pour le charley (sinon : createBuffer
    // + remplissage toutes les ~0,45 s → tension GC + thread audio)
    const nCh = Math.floor(this.ctx.sampleRate * 0.03);
    this.bufCharley = this.ctx.createBuffer(1, nCh, this.ctx.sampleRate);
    const dCh = this.bufCharley.getChannelData(0);
    for (let i = 0; i < nCh; i++) dCh[i] = (Math.random() * 2 - 1) * (1 - i / nCh);
    // Tampon de bruit long pour les explosions (zéro allocation par explosion)
    const nEx = Math.floor(this.ctx.sampleRate * 0.6);
    this.bufExplosion = this.ctx.createBuffer(1, nEx, this.ctx.sampleRate);
    const dEx = this.bufExplosion.getChannelData(0);
    for (let i = 0; i < nEx; i++) dEx[i] = (Math.random() * 2 - 1) * (1 - i / nEx);
  },

  note(freq, duree = 0.1, opts = {}){
    if (!this.ctx || !this.actif) return;
    const t = (typeof opts.t === 'number') ? opts.t : this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, opts.glide), t + duree);
    g.gain.setValueAtTime(opts.vol ?? 0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + duree + 0.02);
  },

  bruit(duree = 0.25, vol = 0.18, freq = 1400, t = null){
    if (!this.ctx || !this.actif) return;
    const tt = (typeof t === 'number') ? t : this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * duree);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, tt);
    f.frequency.exponentialRampToValueAtTime(120, tt + duree);
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(tt);
  },

  charley(t){
    if (!this.ctx || !this.actif || !this.bufCharley) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.bufCharley;
    const g = this.ctx.createGain();
    g.gain.value = 0.012;
    src.connect(g); g.connect(this.master);
    src.start(t);
  },

  tir(){
    const t = performance.now();
    if (t - this.dernierTir < 45) return;
    this.dernierTir = t;
    this.note(920, 0.07, { type:'square', vol:0.035, glide:280 });
  },
  tirEnnemi(){ this.note(300, 0.09, { type:'square', vol:0.028, glide:140 }); },
  impact(){ this.note(200, 0.05, { type:'square', vol:0.03, glide:120 }); },
  explosion(force = 1){
    const maintenant = performance.now();
    if (maintenant - (this.dernierBoom || 0) < 90) return;   // max ~11 détonations/s
    this.dernierBoom = maintenant;
    if (this.ctx && this.actif && this.bufExplosion){
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.bufExplosion;                       // référence partagée, zéro copie
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1600 * Math.min(2, force), t);
      f.frequency.exponentialRampToValueAtTime(120, t + 0.3);
      const g = this.ctx.createGain();
      g.gain.value = 0.15 * force;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t, Math.random() * 0.2, 0.32);              // tranche aléatoire du tampon
    }
    this.note(90, 0.25, { type:'triangle', vol:0.09, glide:36 });   // le boum sub-grave
  },
  joueurTouche(){
    this.bruit(0.5, 0.25, 900);
    this.note(320, 0.5, { type:'sawtooth', vol:0.09, glide:50 });
  },
  bouclier(){ this.note(520, 0.18, { type:'triangle', vol:0.08, glide:220 }); },
  bonus(){
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => this.note(f, 0.09, { type:'square', vol:0.05, t:t0 + i * 0.07 }));
  },
  alerte(){
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.note(130, 0.3, { type:'square', vol:0.09, t:t0 });
    this.note(130, 0.3, { type:'square', vol:0.09, t:t0 + 0.4 });
  },
  phase(){ this.note(180, 0.4, { type:'sawtooth', vol:0.07, glide:60 }); },
  etoile(i){ this.note(880 * Math.pow(1.25, i), 0.12, { type:'square', vol:0.06 }); },
  fanfare(){
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this.note(f, 0.16, { type:'square', vol:0.06, t:t0 + i * 0.11 }));
  },
  go(){
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.note(440, 0.08, { type:'square', vol:0.05, t:t0 });
    this.note(880, 0.14, { type:'square', vol:0.05, t:t0 + 0.1 });
  },
  basculer(){ this.actif = !this.actif; return this.actif; },
};

/* Petits motifs de 16 pas (croches) — le style suit l'environnement */
const MOTIFS = {
  terre:   { tempo:132, onde:'square',   basse:[45,45,52,45, 41,41,48,41, 43,43,50,43, 40,40,47,40], lead:[69,72,76,0, 74,72,74,0, 69,72,76,0, 79,76,74,72] },
  ocean:   { tempo:104, onde:'triangle', basse:[50,50,57,50, 48,48,55,48, 46,46,53,46, 45,45,52,45], lead:[62,65,69,0, 65,62,65,0, 63,66,70,0, 66,63,62,0] },
  galaxie: { tempo:150, onde:'square',   basse:[40,40,47,40, 38,38,45,38, 36,36,43,36, 35,35,42,35], lead:[64,67,71,0, 67,71,74,0, 76,74,71,67, 71,0,74,0] },
  carte:   { tempo:96,  onde:'triangle', basse:[48,48,55,48, 45,45,52,45, 41,41,48,41, 43,43,50,43], lead:[67,0,64,0, 69,67,64,0, 65,0,69,0, 67,64,62,0] },
};

/* Séquenceur à lookahead : planifie les notes juste avant qu'elles tombent */
const Musique = {
  style:null, pas:0, minuteur:null, prochainTemps:0, boost:1,

  demarrer(nom){
    this.style = nom; this.pas = 0; this.boost = 1;
    if (Son.ctx) this.prochainTemps = Son.ctx.currentTime + 0.1;
    if (!this.minuteur) this.minuteur = setInterval(() => this.planifier(), 50);
  },
  arreter(){ this.style = null; },
  tempoBoss(){ this.boost = 1.28; },
  tempoNormal(){ this.boost = 1; },

  planifier(){
    if (!Son.ctx || !this.style) return;
    if (!Son.actif){ this.prochainTemps = Son.ctx.currentTime + 0.05; return; }
    const m = MOTIFS[this.style];
    const secPas = 60 / (m.tempo * this.boost) / 2;
    if (this.prochainTemps < Son.ctx.currentTime - 0.2) this.prochainTemps = Son.ctx.currentTime + 0.05;
    while (this.prochainTemps < Son.ctx.currentTime + 0.16){
      const t = this.prochainTemps, p = this.pas;
      const b = m.basse[p];
      if (b) Son.note(440 * Math.pow(2, (b - 69) / 12), secPas * 0.95, { t, type:'triangle', vol:0.085 });
      const l = m.lead[p];
      if (l) Son.note(440 * Math.pow(2, (l - 69) / 12), secPas * 0.9, { t, type:m.onde, vol:0.045 });
      if (p % 2 === 1) Son.charley(t);   // charley discret (tampon réutilisé)
      this.pas = (p + 1) % 16;
      this.prochainTemps += secPas;
    }
  },
};

/* ════════ 3. PROGRESSION (localStorage) ════════ */

const Progression = {
  donnees:{ debloque:1, etoiles:{}, records:{}, record:0 },

  charger(){
    try{
      const brut = localStorage.getItem('aile-acier-v1');
      if (brut){
        const d = JSON.parse(brut);
        if (d && d.debloque) this.donnees = d;
        if (!this.donnees.records) this.donnees.records = {};   // vieilles sauvegardes
      }
    }catch(e){}
  },
  sauvegarder(){
    try{ localStorage.setItem('aile-acier-v1', JSON.stringify(this.donnees)); }catch(e){}
  },
  victoire(n, etoiles){
    const d = this.donnees;
    d.etoiles[n] = Math.max(d.etoiles[n] || 0, etoiles);
    d.debloque = Math.max(d.debloque, Math.min(NB_NIVEAUX, n + 1));
    this.sauvegarder();
  },
  reinitialiser(){
    this.donnees = { debloque:1, etoiles:{}, records:{}, record:0,
                     recordSurvie:0, campagneTerminee:false };
    this.sauvegarder();
  },
  totalEtoiles(){
    return Object.values(this.donnees.etoiles).reduce((a, b) => a + b, 0);
  },
};

/* ════════ 4. ATELIER PIXEL ART ════════
   1 caractère = 1 pixel. Les sprites symétriques ne sont
   définis qu'à moitié puis miroités. */

const PAL = {
  W:'#eef6ff', w:'#a8bcd4', d:'#4e5f78', k:'#141c2c',
  c:'#5cf7e4', C:'#179e94',
  r:'#ff6b5e', R:'#c22f35',
  o:'#ffb020', O:'#c96e0e', y:'#ffe94a', Y:'#fff7bd',
  g:'#5ede54', G:'#1f7a36',
  v:'#c79bff', V:'#6b3fc0',
};

const DEMI_JOUEUR = [
  ".....c", "....Wc", "....Wc", "...WWc", "...WwC",
  "..WWwC", ".WWwWc", "WwwW.C", "WwR...", "WW...o", "....wo",
];

/* Vaisseau d'escorte — demi-gauche (4 colonnes), miroir → 8×8 : un mini-chasseur
   blanc à cockpit cyan et tuyères ambre, même famille que le leader */
const DEMI_ESCORTE = [
  "...W",
  "..Wc",
  "..Wc",
  ".WWc",
  ".Wwc",
  "WWwc",
  "Ww.o",
  "...o",
];

const DEMI_DRONE = [
  "..R..", ".RRr.", ".RRrr", "RRrry", "RRrrr", ".RRrv", "..R.v", "....v",
];

const SPRITE_RAIDER = [
  "v.......v", "vgv...vgv", ".vggvggv.", ".vggGggv.",
  "..gGGGg..", "..gGoGg..", "..gGGGg..", "...gGg...", "...oOo...", "....o....",
];

const DEMI_ZIGZAG = [   // éclaireur rapide, cyan
  "c....", "Cc...", ".Cc..", ".cCc.", "..cCc", "..cWc", "...cc", "....c",
];

const DEMI_PLONGEUR = [  // kamikaze, dard ambre
  "o.....", "Oo....", ".Oo...", ".yOo..", "..yOo.",
  "..yOo.", "...yOo", "...yOo", "....ky",
];

const DEMI_BOMBARDIER = [ // gros porteur olive/gris (16 de large)
  ".d.....d", ".dww...d", ".dwwd..d", "..dwwddd", "..dwwwwW",
  ".dwwwWcW", ".dwwwWkW", ".dwwwWkW", "..dwwWkW", "..dwwwWw", "...ddwwW",
];
const PAL_BOMBARDIER = { d:'#3a4030', w:'#8a9464', W:'#aeb884', c:'#5cf7e4', k:'#20261a' };

/* — nouveaux ennemis : croiseur, mine, hélico, chasseur, raie, méduse — */
const DEMI_CROISEUR = [
  "w......", ".dd....", ".dww...", ".dwww..", ".dwwwW.",
  "ddwwwWw", "dwwWcWw", "dwwwwww", ".dwwwww", "..dwww.", "...dd..",
];
const DEMI_MINE = [
  "k....", ".k...", ".kd..", ".kdr.", ".kdr.", ".kd..", ".k...", "k....",
];
const DEMI_HELICO = [
  "d.......", ".d......", ".dw.....", ".dwg....", "..dwwgg.",
  "..dwWggg", "..dwgcgg", "..dwwggg", "...dwwgg",
];
const PAL_HELICO = { d:'#39424e', w:'#8b939f', W:'#c2ccd6', g:'#6b8f4e', c:'#5cf7e4' };
const DEMI_CHASSEUR = [
  "g.....", "Gg....", ".Gg...", ".gGg..", "gGggG.",
  "gGgggg", ".gGgcg", ".gGgg.", "..gGg.",
];
const PAL_CHASSEUR = { g:'#7ca86a', G:'#4e6a42', c:'#5cf7e4' };
const DEMI_RAIE = [
  "....d....", "....d....", "...bdb...", "..bbdbb..",
  ".bbbdbbb.", "bbbbBbbbb", "bbbBcBbbb", ".bbBBBbb.",
];
const PAL_RAIE = { b:'#4fd0e8', B:'#2a86a8', c:'#5cf7e4', d:'#123a4a' };
const DEMI_MEDUSE = [
  "..vv..", ".vvv..", ".vVv..", "vVVvV.", "vvvvvv", ".vvvv.",
];
const PAL_MEDUSE = { v:'#ff7ad9', V:'#b44ac0' };

const DEMI_TANK = [
  ".dd...", "dwwd..", "dwwwdd", ".dwwww", ".dwWOO",
  ".dwOkk", ".dwwww", "..dwww", "...dww", "....dw",
];

const DEMI_TOURELLE = [
  "....dww", "...dwWo", "..ddwWo", ".GGddww", "GGGGddw", "GGGGGGd",
];

/* — TERRE : forteresse angulaire (le Gardien d'acier) — */
const DEMI_BOSS_TERRE = [
  ".dddd.......",
  "dAAAAAd.....",
  "dAAwwAAAAd..",
  "dAAAwwAAAAd.",
  "dAAoookwAAd.",
  "dAAoookwAAd.",
  ".dAAAAAAAAd.",
  ".dAAwwwAAAd.",
  "..dAAAAAAd..",
  "..dAAwwAd...",
  "...dAAAAd...",
  "...dAwwAd...",
  "....dAAd....",
  ".....daad...",
];

/* — OCÉAN : kraken (manteau bombé, ventouses, cinq tentacules) — */
const DEMI_BOSS_OCEAN = [
  ".....dd.....",
  "...dAAAAd...",
  "..dAAAAAAd..",
  ".dAAAAAAAAA.",
  "dAAAAAAAAAAA",
  "dAoAAAAkkkkA",
  "dAAoAAAkkkkA",
  ".dAoAAAAkkA.",
  ".dAAAAAAAAA.",
  ".dAAd.dAAdAA",
  ".dAd..dAd.dA",
  "..dAd..dAd.A",
  "..dAd...dA.A",
  "...dA...dA.A",
];

/* — GALAXIE : cristal (losange, cœur de nébuleuse piqué de lueurs) — */
const DEMI_BOSS_GALAXIE = [
  "......d.....",
  ".....dAd....",
  "....dAAAd...",
  "...dAAAAAd..",
  "..dAoAAAAd..",
  ".dAAokkoAAd.",
  "dAAokkokkAAd",
  "dAAokkokkAAd",
  "dAAwkkokkAAd",
  ".dAAkkkkAAd.",
  "..dAAkkAAd..",
  "...dAAAAAd..",
  "....dAAAd...",
  ".....dAd....",
];

/* la silhouette de chaque monde */
const DEMIS_BOSS = {
  terre:   DEMI_BOSS_TERRE,
  ocean:   DEMI_BOSS_OCEAN,
  galaxie: DEMI_BOSS_GALAXIE,
};
const PALETTES_BOSS = {
  terre:   { A:'#c04a30', a:'#6e2415', w:'#e0a868', o:'#ffb020', d:'#38160c', k:'#160a05' },
  ocean:   { A:'#2e86b8', a:'#123f61', w:'#a8dcec', o:'#4ff2e0', d:'#0a2238', k:'#051018' },
  galaxie: { A:'#8a4fd0', a:'#452180', w:'#e4ccff', o:'#ff7ad9', d:'#1c0e38', k:'#0c0620' },
};
const COULEUR_OEIL = { terre:'#ffb020', ocean:'#4ff2e0', galaxie:'#ff7ad9' };

const DEMI_CAPSULE = [
  "..wwww", ".wWWww", "wWXXXX", "wWXXXX", "wWXXXX", "wWXXXX",
  "wWXXXX", "wWXXXX", "wWXXXX", "wWXXXX", "wWWXXX", ".wWWww", "..wwww",
];
const GLYPHE_P      = ["ppp.", "p..p", "ppp.", "p...", "p..."];
const GLYPHE_S      = [".ppp", "p...", ".pp.", "...p", "ppp."];
const GLYPHE_COEUR  = [".p.p.", "ppppp", "ppppp", ".ppp.", "..p.."];
const GLYPHE_ETOILE = ["..p..", "..p..", "ppppp", ".ppp.", ".p.p."];
const GLYPHE_O      = [".ppp.", "p...p", "p...p", "p...p", ".ppp."];
const DEFS_BONUS = {
  P: { fenetre:'#ffb020', glyphe:GLYPHE_P,      couleur:'#2a1a05' },
  S: { fenetre:'#29e6d2', glyphe:GLYPHE_S,      couleur:'#062a26' },
  V: { fenetre:'#ff5a5a', glyphe:GLYPHE_COEUR,  couleur:'#4a0e12' },
  E: { fenetre:'#ffe94a', glyphe:GLYPHE_ETOILE, couleur:'#3a2d05' },
  O: { fenetre:'#c79bff', glyphe:GLYPHE_O,      couleur:'#241348' },
};

/* Petit décor terrestre */
const SPRITE_ARBRE = [
  "..GGG..", ".GGgGG.", ".GGgGG.", "GGgGgGG", "GGGGGGG", "..GdG..", "..ddd..",
];
const SPRITE_SAPIN = [   // conifère enneigé
  "..wgw..", ".wGgGw.", ".GGgGG.", "GGgGgGG", "GGGGGGG", ".GGGGG.", "...d...", "...d...",
];
const SPRITE_CACTUS_DEMI = [
  "...g", "...g", ".G.g", ".G.g", ".Ggg", "...g", "...g", "...G",
];
const SPRITE_MAISON = [
  "....r....", "...rrr...", "..rrrrr..", ".rrrrrrr.",
  ".wwWwwWw.", ".wwwwwww.", ".wwdWdww.", ".ddddddd.",
];
const SPRITE_ROCHER = [".ggg.", "ggGgg", "ggggg"];
const DEMI_HANGAR = [   // hangar militaire (16 de large)
  "dddddddd", "dwwwwwww", "dwddwwww", "dwwwwwww",
  "dwkkkkkk", "dwkokkok", "dwkkkkkk", "dwkkkkkk", "dddddddd",
];
const SPRITE_ETOILE = [
  "...y...", "..yyy..", "yyYyYyy", ".yyyyy.", "..yyy..", ".yy.yy.", ".y...y.",
];

function miroir(lignes){
  return lignes.map(l => l + [...l].reverse().join(''));
}

function creerSprite(lignes, palette, echelle = 3){
  const h = lignes.length;
  let w = 0;
  lignes.forEach(l => w = Math.max(w, l.length));
  const cv = cvAux(w * echelle, h * echelle);
  const c = cv.getContext('2d');
  lignes.forEach((l, y) => {
    for (let x = 0; x < l.length; x++){
      const k = l[x];
      if (k === '.' || k === ' ') continue;
      const col = palette[k];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x * echelle, y * echelle, echelle, echelle);
    }
  });
  return cv;
}

/* Version monochrome d'un sprite (flash blanc à l'impact) */
function teinter(cv, couleur){
  const t = cvAux(cv.width, cv.height);
  const c = t.getContext('2d');
  c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = couleur;
  c.fillRect(0, 0, t.width, t.height);
  return t;
}

function fabriquerSpriteBonus(def){
  const spr = creerSprite(miroir(DEMI_CAPSULE), { w:'#c9d4e2', W:'#f2f7ff', X:def.fenetre }, 3);
  const c = spr.getContext('2d');
  const g = def.glyphe, gw = g[0].length, gh = g.length, e = 3;
  const ox = Math.round((spr.width - gw * e) / 2);
  const oy = Math.round((spr.height - gh * e) / 2);
  c.fillStyle = def.couleur;
  g.forEach((l, y) => {
    for (let x = 0; x < l.length; x++){
      if (l[x] !== '.' && l[x] !== ' ') c.fillRect(ox + x * e, oy + y * e, e, e);
    }
  });
  return spr;
}

/* Bibliothèque de sprites */
const SPRITES = {
  joueur:    creerSprite(miroir(DEMI_JOUEUR), PAL, 3),
  escorte:  creerSprite(miroir(DEMI_ESCORTE), PAL, 3),
  drone:     creerSprite(miroir(DEMI_DRONE), PAL, 3),
  raider:    creerSprite(SPRITE_RAIDER, PAL, 3),
  zigzag:    creerSprite(miroir(DEMI_ZIGZAG), PAL, 3),
  plongeur:  creerSprite(miroir(DEMI_PLONGEUR), PAL, 3),
  bombardier:creerSprite(miroir(DEMI_BOMBARDIER), PAL_BOMBARDIER, 3),
  tank:      creerSprite(miroir(DEMI_TANK), PAL, 3),
  tourelle:  creerSprite(miroir(DEMI_TOURELLE), PAL, 3),
  croiseur:  creerSprite(miroir(DEMI_CROISEUR), PAL, 3),
  mine:      creerSprite(miroir(DEMI_MINE), PAL, 3),
  helico:    creerSprite(miroir(DEMI_HELICO), PAL_HELICO, 3),
  chasseur:  creerSprite(miroir(DEMI_CHASSEUR), PAL_CHASSEUR, 3),
  raie:      creerSprite(miroir(DEMI_RAIE), PAL_RAIE, 3),
  meduse:    creerSprite(miroir(DEMI_MEDUSE), PAL_MEDUSE, 3),
  arbre:     creerSprite(SPRITE_ARBRE, { G:'#1f6b32', g:'#43a94f', d:'#6b4423' }, 3),
  sapin:     creerSprite(SPRITE_SAPIN, { G:'#1d5638', g:'#2f7a4c', w:'#e8f2f8', d:'#5a4632' }, 3),
  cactus:    creerSprite(miroir(SPRITE_CACTUS_DEMI), { g:'#3f9a52', G:'#2a6e3a' }, 3),
  maison:    creerSprite(SPRITE_MAISON, { r:'#c8452e', w:'#eadfc6', W:'#7fc8e8', d:'#5a4632' }, 3),
  rocher:    creerSprite(SPRITE_ROCHER, { g:'#79808f', G:'#a2aab8' }, 3),
  hangar:    creerSprite(miroir(DEMI_HANGAR), { d:'#39424e', w:'#8b939f', k:'#1a2028', o:'#ffb020' }, 3),
  etoileOr:  creerSprite(SPRITE_ETOILE, { y:'#ffe94a', Y:'#fff7bd' }, 3),
  etoileGris:creerSprite(SPRITE_ETOILE, { y:'#3a4562', Y:'#4a5878' }, 3),
};
SPRITES.boss = {};
SPRITES.bossBlanc = {};
for (const [env, pal] of Object.entries(PALETTES_BOSS)){
  SPRITES.boss[env] = creerSprite(miroir(DEMIS_BOSS[env]), pal, 4);
  SPRITES.bossBlanc[env] = teinter(SPRITES.boss[env], '#ffffff');
}
SPRITES.blanc = {};
for (const t of ['drone', 'raider', 'zigzag', 'plongeur', 'bombardier', 'tank', 'tourelle', 'joueur',
                 'croiseur', 'mine', 'helico', 'chasseur', 'raie', 'meduse']){
  SPRITES.blanc[t] = teinter(SPRITES[t], '#ffffff');
}
SPRITES.bonus = {};
for (const [type, def] of Object.entries(DEFS_BONUS)){
  SPRITES.bonus[type] = fabriquerSpriteBonus(def);
}

/* ════════ 5. DÉCORS & PARALLAX ════════ */

/* Une nappe pré-rendue qui défile verticalement en boucle */
class CoucheDefilante {
  constructor(cv, vitesse){
    this.cv = cv;
    this.v = vitesse;
    this.o = 0;
  }
  maj(dt){ this.o = (this.o + this.v * dt) % this.cv.height; }
  dessiner(ctx){
    // Défilement SOUS-PIXEL : positions fractionnaires + interpolation.
    // (en coordonnées entières, un fond à 100 px/s avance de 1,67 px par
    // frame → pas de 1 px, 2 px, 1 px… : c'était la saccade)
    const h = this.cv.height;
    ctx.imageSmoothingEnabled = true;
    let y = this.o - h;
    while (y < H){
      const coupe = Math.max(0, -y);
      const lignes = Math.min(h - coupe, y < 0 ? H : H - y);
      if (lignes > 0){
        ctx.drawImage(this.cv, 0, coupe, this.cv.width, lignes,
                      0, y + coupe, this.cv.width, lignes);
      }
      y += h;
    }
    ctx.imageSmoothingEnabled = false;   // les sprites restent bien nets
  }
}

/* ——— TERRE : 5 BIOMES qui s'enchaînent avec bords déchiquetés ——— */

function peindreRoute(c, y){
  c.fillStyle = '#70747c'; c.fillRect(0, y + 2, L, 20);
  c.fillStyle = '#8b9099'; c.fillRect(0, y + 2, L, 4);
  c.fillStyle = '#e6dfc4';
  for (let x = 8; x < L; x += 46) c.fillRect(x, y + 11, 18, 3);
}

function peindreRiviere(c, rng, eau, clair){
  const cx = 110 + rng() * (L - 220);
  for (let y = 0; y < 720; y += 6){
    const x = cx + Math.sin(y * Math.PI * 2 / 90) * 26;
    c.fillStyle = '#2c6b33'; c.fillRect(x - 22, y, 44, 6);
    c.fillStyle = eau;       c.fillRect(x - 15, y, 30, 6);
    c.fillStyle = clair;     c.fillRect(x - 8, y + 1, 16, 4);
    if (y % 42 < 6){ c.fillStyle = '#a8d4ff'; c.fillRect(x - 3, y + 2, 6, 2); }
  }
  return cx;
}

/* Sème un sprite décoratif en évitant éventuellement une zone */
function semer(c, rng, spr, nb, ok){
  const w = spr.width, h = spr.height;
  for (let i = 0; i < nb; i++){
    let x = aleaR(rng, 8, L - 8 - w), y = aleaR(rng, 26, 720 - 26 - h);
    if (ok && !ok(x, y, w, h)) x = (x + 190) % (L - w - 16) + 8;
    c.drawImage(spr, x | 0, y | 0);
  }
}

/* Équipements de la base militaire (dessinés au trait, pas en sprites) */
function dessinerRadar(c, x, y){
  c.fillStyle = '#39424e'; c.fillRect(x - 14, y - 14, 28, 28);
  c.strokeStyle = '#8b939f'; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 12, 0, 7); c.stroke();
  c.beginPath(); c.arc(x, y, 6, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(92,247,228,.9)';
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + 11, y - 8); c.stroke();   // faisceau
  c.fillStyle = '#ffb020'; c.fillRect(x - 2, y - 2, 4, 4);
}
function dessinerBunker(c, x, y){
  c.fillStyle = '#2c3440'; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill();
  c.fillStyle = '#5a6672'; c.beginPath(); c.arc(x - 3, y - 3, 6, 0, 7); c.fill();
  c.fillStyle = '#141a24'; c.fillRect(x - 6, y + 3, 12, 3);   // meurtrière
}
function dessinerCiterne(c, x, y){
  c.fillStyle = '#6e7783'; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill();
  c.fillStyle = '#8b939f'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
  c.strokeStyle = '#c96e0e'; c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, 11, 0, 7); c.stroke();
  c.fillStyle = '#ffb020'; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill();
}

const TERRAINS_TERRE = {
  prairie: {
    base:'#37854a',
    peindre(c, rng){
      const tons = ['#3d9152', '#37854a', '#46a05c'];
      for (let y = 0; y < 720; y += 24){
        c.fillStyle = tons[(rng() * 3) | 0];
        c.fillRect(0, y, L, 24);
        c.fillStyle = 'rgba(18,60,30,.16)';
        for (let i = 0; i < 8; i++) c.fillRect((rng() * L) | 0, y + ((rng() * 20) | 0), 7, 5);
        if (rng() < 0.10) peindreRoute(c, y);
      }
      const cx = peindreRiviere(c, rng, '#2f6fd8', '#5ea0f2');
      semer(c, rng, SPRITES.arbre, 14, (x, y, w) => Math.abs(x + w / 2 - cx) > 70);
      semer(c, rng, SPRITES.maison, 2, (x, y, w) => Math.abs(x + w / 2 - cx) > 80);
      semer(c, rng, SPRITES.rocher, 4, (x, y, w) => Math.abs(x + w / 2 - cx) > 60);
    },
  },
  foret: {
    base:'#2a6b3c',
    peindre(c, rng){
      const tons = ['#2e7140', '#2a6b3c', '#337a48'];
      for (let y = 0; y < 720; y += 24){
        c.fillStyle = tons[(rng() * 3) | 0];
        c.fillRect(0, y, L, 24);
        c.fillStyle = 'rgba(10,40,22,.25)';
        for (let i = 0; i < 6; i++) c.fillRect((rng() * L) | 0, y + ((rng() * 20) | 0), 8, 5);
      }
      const lx = aleaR(rng, 90, L - 90), ly = aleaR(rng, 130, 590);   // clairière-lac
      c.fillStyle = '#1d4f2a'; c.beginPath(); c.ellipse(lx, ly, 68, 40, 0, 0, 7); c.fill();
      c.fillStyle = '#2f6fd8'; c.beginPath(); c.ellipse(lx, ly, 58, 32, 0, 0, 7); c.fill();
      c.fillStyle = '#5ea0f2'; c.beginPath(); c.ellipse(lx - 8, ly - 6, 34, 18, 0, 0, 7); c.fill();
      semer(c, rng, SPRITES.arbre, 26, (x, y, w, h) => Math.hypot(x + w / 2 - lx, y + h / 2 - ly) > 95);
      semer(c, rng, SPRITES.rocher, 3);
    },
  },
  desert: {
    base:'#d3a75f',
    peindre(c, rng){
      const tons = ['#d9b26a', '#cfa558', '#e0bd76'];
      for (let y = 0; y < 720; y += 48){
        c.fillStyle = tons[(rng() * 3) | 0];
        c.fillRect(0, y, L, 48);
      }
      c.strokeStyle = 'rgba(170,125,60,.5)'; c.lineWidth = 3;   // dunes en arcs
      for (let i = 0; i < 10; i++){
        c.beginPath(); c.arc(rng() * L, rng() * 700, 30 + rng() * 46, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      }
      const cx = 130 + rng() * (L - 260);   // lit asséché
      c.fillStyle = '#e8cd8a';
      for (let y = 0; y < 720; y += 6) c.fillRect(cx + Math.sin(y * 0.02) * 30 - 14, y, 30, 6);
      semer(c, rng, SPRITES.cactus, 9);
      semer(c, rng, SPRITES.rocher, 5);
    },
  },
  neige: {
    base:'#d2dfe8',
    peindre(c, rng){
      const tons = ['#dfe8f0', '#d2dfe8', '#e8f0f6'];
      for (let y = 0; y < 720; y += 24){
        c.fillStyle = tons[(rng() * 3) | 0];
        c.fillRect(0, y, L, 24);
        c.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 5; i++) c.fillRect((rng() * L) | 0, y + ((rng() * 20) | 0), 9, 4);
      }
      c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 3;   // congères
      for (let i = 0; i < 8; i++){
        c.beginPath(); c.arc(rng() * L, rng() * 700, 26 + rng() * 40, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      }
      peindreRiviere(c, rng, '#a8ccf0', '#e2f2ff');   // rivière gelée
      semer(c, rng, SPRITES.sapin, 13);
      semer(c, rng, SPRITES.rocher, 4);
    },
  },
  base: {
    base:'#4e535a',
    peindre(c, rng){
      c.fillStyle = '#565b63'; c.fillRect(0, 0, L, 720);
      c.fillStyle = 'rgba(0,0,0,.14)';
      for (let i = 0; i < 60; i++) c.fillRect((rng() * L) | 0, (rng() * 716) | 0, 10, 6);
      // piste principale avec seuils
      const py = 300 + ((rng() * 120) | 0);
      c.fillStyle = '#454a52'; c.fillRect(0, py, L, 66);
      c.fillStyle = '#e8eefc';
      for (let x = 16; x < L; x += 58) c.fillRect(x, py + 30, 30, 4);
      c.fillStyle = '#ffb020';
      for (let k = 0; k < 8; k++){ c.fillRect(8 + k * 8, py + 6, 5, 12); c.fillRect(8 + k * 8, py + 48, 5, 12); }
      // taxiway diagonal
      c.save(); c.translate(L * 0.7, 0); c.rotate(0.35);
      c.fillStyle = '#454a52'; c.fillRect(-20, -80, 40, 900);
      c.restore();
      for (let i = 0; i < 3; i++) c.drawImage(SPRITES.hangar, (60 + rng() * (L - 180)) | 0, (60 + rng() * 180) | 0);
      for (let i = 0; i < 2; i++) dessinerRadar(c, 90 + rng() * (L - 180), 470 + rng() * 200);
      for (let i = 0; i < 3; i++) dessinerBunker(c, 80 + rng() * (L - 160), 160 + rng() * 500);
      for (let i = 0; i < 2; i++) dessinerCiterne(c, 80 + rng() * (L - 160), 120 + rng() * 480);
      c.strokeStyle = 'rgba(20,24,32,.5)'; c.lineWidth = 2; c.setLineDash([8, 6]);
      c.strokeRect(14, 14, L - 28, 692);   // clôture
      c.setLineDash([]);
    },
  },
};
Object.assign(TERRAINS_TERRE, BIOMES_SUPPLEMENTAIRES);

/* Assemble les bandes de biomes (720 px chacune) avec bords déchiquetés */
function fabriquerTerrain(seed, biomes){
  const rng = mulberry32(seed);
  const cv = cvAux(L, biomes.length * 720);
  const c = cv.getContext('2d');
  biomes.forEach((nom, i) => {
    const b = TERRAINS_TERRE[nom];
    c.save();
    c.translate(0, i * 720);
    c.beginPath(); c.rect(0, 0, L, 720); c.clip();
    b.peindre(c, rng);
    c.restore();
    if (i > 0){   // le biome précédent mord en dents de scie sur le nouveau
      c.fillStyle = TERRAINS_TERRE[biomes[i - 1]].base;
      c.fillRect(0, i * 720 - 20, L, 20);
      for (let x = -13; x < L; x += 26){
        c.beginPath();
        c.moveTo(x, i * 720);
        c.lineTo(x + 13, i * 720 + 6 + rng() * 16);
        c.lineTo(x + 26, i * 720);
        c.closePath(); c.fill();
      }
    }
  });
  return cv;
}

function fabriquerNuage(seed){
  const rng = mulberry32(seed);
  const w = 130 + ((rng() * 70) | 0), h = 64;
  const cv = cvAux(w, h);
  const c = cv.getContext('2d');
  c.fillStyle = '#e9f3fc';
  for (let i = 0; i < 5; i++){
    c.beginPath(); c.arc(w * 0.18 + rng() * w * 0.64, h * 0.42 + rng() * h * 0.18, 11 + rng() * 13, 0, 7); c.fill();
  }
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++){
    c.beginPath(); c.arc(w * 0.16 + rng() * w * 0.68, h * 0.30 + rng() * h * 0.14, 9 + rng() * 12, 0, 7); c.fill();
  }
  return cv;
}

class DecorTerre {
  constructor(seed, vFond, biomes){
    this.vFond = vFond;
    this.sol = new CoucheDefilante(fabriquerTerrain(seed, biomes || ['prairie', 'foret']), vFond);
    this.variantesNuages = [fabriquerNuage(seed + 2), fabriquerNuage(seed + 3), fabriquerNuage(seed + 4), fabriquerNuage(seed + 5)];
    this.nuages = [];   // par-dessus le sol, défile plus vite (altitude)
    this.ombres = [];   // ombres portées, défilent moins vite
    this.prochainNuage = 1; this.prochainOmbre = 2;
  }
  maj(dt){
    this.sol.maj(dt);
    this.prochainNuage -= dt;
    if (this.prochainNuage <= 0){
      this.nuages.push({ x: alea(-50, L + 20), y: -90, cv: choix(this.variantesNuages) });
      this.prochainNuage = alea(2.5, 6);
    }
    this.prochainOmbre -= dt;
    if (this.prochainOmbre <= 0){
      this.ombres.push({ x: alea(-70, L), y: -110, cv: choix(this.variantesNuages) });
      this.prochainOmbre = alea(3, 7);
    }
    for (let i = this.nuages.length - 1; i >= 0; i--){
      this.nuages[i].y += this.vFond * 1.3 * dt;
      if (this.nuages[i].y > H + 70) this.nuages.splice(i, 1);
    }
    for (let i = this.ombres.length - 1; i >= 0; i--){
      this.ombres[i].y += this.vFond * 0.72 * dt;
      if (this.ombres[i].y > H + 110) this.ombres.splice(i, 1);
    }
  }
  dessiner(ctx){
    this.sol.dessiner(ctx);
    ctx.imageSmoothingEnabled = true;   // nuages : glissement sous-pixel
    for (const o of this.ombres){
      ctx.globalAlpha = 0.16;
      ctx.drawImage(o.cv, o.x, o.y);
    }
    for (const n of this.nuages){
      ctx.globalAlpha = 0.85;
      ctx.drawImage(n.cv, n.x, n.y);
    }
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
  }
}

/* ——— OCÉAN : 3 variantes (lagon / tempête / abysses) ——— */

const PALETTES_OCEAN = {
  lagon:    { bandes:['#1a6ab0', '#1963a3', '#1a6ab0', '#1f6cb4'], houle:'rgba(130,205,235,.42)', ecume:'rgba(238,250,255,.9)',  alphaEcume:.6,  iles:true,  pluie:false, plancton:false, corail:true,  delaiIle:[5, 10] },
  tempete:  { bandes:['#0d2f56', '#0c2b4e', '#0d2f56', '#0e335e'], houle:'rgba(95,145,195,.40)',  ecume:'rgba(222,240,255,.95)', alphaEcume:.9,  iles:true,  pluie:true,  plancton:false, corail:false, delaiIle:[10, 16] },
  abysses:  { bandes:['#081f38', '#071b32', '#081f38', '#0a2440'], houle:'rgba(60,110,170,.32)',  ecume:'rgba(180,225,255,.6)',  alphaEcume:.5,  iles:false, pluie:false, plancton:true,  corail:true,  delaiIle:[99, 99] },
};
PALETTES_OCEAN.banquise = VARIANTE_BANQUISE;

function fabriquerFondOcean(bandes){
  const cv = cvAux(L, H);
  const c = cv.getContext('2d');
  const n = bandes.length;
  for (let i = 0; i < n; i++){ c.fillStyle = bandes[i]; c.fillRect(0, i * H / n, L, H / n + 1); }
  c.fillStyle = 'rgba(255,255,255,.03)';
  for (let i = 0; i < 10; i++) c.fillRect(0, (Math.random() * H) | 0, L, 4);
  return cv;
}

function fabriquerHoule(seed, couleur){
  const rng = mulberry32(seed);
  const cv = cvAux(L, 720);
  const c = cv.getContext('2d');
  c.fillStyle = couleur;
  const trait = (x, y, rot, l) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillRect(0, 0, l, 3); c.restore();
  };
  for (let y = 0; y < 720; y += 48){       // 720/48 = 15 : raccord exact
    const decal = (y / 48) % 2 ? 32 : 0;
    for (let x = -20 + decal; x < L + 20; x += 72 + ((rng() * 14) | 0)){
      trait(x, y + 14, -0.55, 11);         // petit accent circonflexe ^
      trait(x + 9, y + 9, 0.55, 11);
    }
  }
  return cv;
}

function fabriquerEcume(seed, couleur){
  const rng = mulberry32(seed);
  const cv = cvAux(L, 360);
  const c = cv.getContext('2d');
  c.fillStyle = couleur;
  for (let y = 8; y < 360; y += 36){
    for (let i = 0; i < 5; i++){
      const x = rng() * L, l = 24 + rng() * 54;
      c.fillRect(x, y, l, 3);
      c.fillRect(x + 4, y - 4, (l * 0.5) | 0, 2);
    }
  }
  return cv;
}

function fabriquerIle(seed){
  const rng = mulberry32(seed);
  const w = 110, h = 84, cx = w / 2, cy = h / 2 + 6;
  const cv = cvAux(w, h);
  const c = cv.getContext('2d');
  c.fillStyle = '#d9bd82'; c.beginPath(); c.ellipse(cx, cy, 42, 26, 0, 0, 7); c.fill();
  c.fillStyle = '#efd9a4'; c.beginPath(); c.ellipse(cx - 4, cy - 4, 34, 19, 0, 0, 7); c.fill();
  c.fillStyle = '#8d939e'; c.fillRect(cx + 16, cy + 8, 10, 7); c.fillRect(cx + 20, cy + 5, 6, 4);
  const nb = 1 + ((rng() * 2) | 0);
  for (let i = 0; i < nb; i++){   // palmiers
    const px = cx - 12 + i * 22 + rng() * 8, py = cy - 8 + rng() * 6;
    c.strokeStyle = '#8a5a30'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 6, py - 16, px + 13, py - 26); c.stroke();
    const sx = px + 13, sy = py - 26;
    c.strokeStyle = '#2e8b4a'; c.lineWidth = 3;
    for (let k = 0; k < 5; k++){
      const a = -Math.PI * 0.1 + k * Math.PI * 0.3;
      c.beginPath(); c.moveTo(sx, sy);
      c.quadraticCurveTo(sx + Math.cos(a) * 10, sy + Math.sin(a) * 10 - 4, sx + Math.cos(a) * 17, sy + Math.sin(a) * 13 + 2);
      c.stroke();
    }
  }
  return { cv, ombre: teinter(cv, '#06233f') };
}

class DecorOcean {
  constructor(seed, vFond, variante){
    const p = PALETTES_OCEAN[variante] || PALETTES_OCEAN.lagon;
    this.p = p;
    this.fond = fabriquerFondOcean(p.bandes);
    this.houle = new CoucheDefilante(fabriquerHoule(seed, p.houle), vFond * 0.5);
    this.ecume = new CoucheDefilante(fabriquerEcume(seed + 1, p.ecume), vFond * 1.25);
    this.brume = variante === 'banquise' ? new CoucheDefilante(fabriquerBrume(seed + 9), vFond * 0.8) : null;
    this.variantesIles = p.iles
      ? (variante === 'banquise'
        ? [fabriquerIceberg(seed + 2), fabriquerIceberg(seed + 3), fabriquerIceberg(seed + 4)]
        : [fabriquerIle(seed + 2), fabriquerIle(seed + 3), fabriquerIle(seed + 4)])
      : [];
    this.iles = []; this.coraux = []; this.gouttes = []; this.plancton = [];
    this.prochaineIle = 2; this.prochainCorail = 3;
    if (p.pluie) for (let i = 0; i < 46; i++) this.gouttes.push({ x: Math.random() * L, y: Math.random() * H });
    if (p.plancton) for (let i = 0; i < 30; i++)
      this.plancton.push({ x: Math.random() * L, y: Math.random() * H, r: 1.5 + Math.random() * 2.5, ph: Math.random() * 6.28 });
  }
  
  maj(dt){
    this.houle.maj(dt); this.ecume.maj(dt);
    if (this.brume) this.brume.maj(dt);
    if (this.variantesIles.length){
      this.prochaineIle -= dt;
      if (this.prochaineIle <= 0){
        this.iles.push({ x: alea(-30, L - 80), y: -100, spr: choix(this.variantesIles) });
        this.prochaineIle = alea(this.p.delaiIle[0], this.p.delaiIle[1]);
      }
    }
    for (let i = this.iles.length - 1; i >= 0; i--){
      this.iles[i].y += this.houle.v * 1.05 * dt;
      if (this.iles[i].y > H + 100) this.iles.splice(i, 1);
    }
    if (this.p.corail){
      this.prochainCorail -= dt;
      if (this.prochainCorail <= 0){
        this.coraux.push({ x: alea(20, L - 60), y: -40, t: alea(0, 6.28) });
        this.prochainCorail = alea(4, 8);
      }
    }
    for (let i = this.coraux.length - 1; i >= 0; i--){
      this.coraux[i].y += this.houle.v * 1.05 * dt;
      if (this.coraux[i].y > H + 50) this.coraux.splice(i, 1);
    }
    for (const g of this.gouttes){
      g.y += 620 * dt; g.x -= 160 * dt;
      if (g.y > H + 30){ g.y = -30; g.x = Math.random() * (L + 120); }
    }
    for (const pl of this.plancton){
      pl.y += 26 * dt; pl.ph += dt * 2;
      if (pl.y > H + 6){ pl.y = -6; pl.x = Math.random() * L; }
    }
  }

  dessiner(ctx){
    ctx.drawImage(this.fond, 0, 0);
    this.houle.dessiner(ctx);
    for (const p of this.plancton){   // lucioles bioluminescentes
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(p.ph);
      ctx.fillStyle = '#5cf7e4';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const co of this.coraux){   // amas coralliens
      for (let k = 0; k < 5; k++){
        const a = co.t + k * 1.26, r = 3 + (k % 2) * 2;
        ctx.fillStyle = k % 2 ? '#ff7ad9' : '#ff9a6a';
        ctx.beginPath(); ctx.arc(co.x + Math.cos(a) * (6 + k * 3), co.y + Math.sin(a) * (4 + k * 2), r, 0, 7); ctx.fill();
      }
    }
    ctx.imageSmoothingEnabled = true;   // îles/icebergs : glissement sous-pixel
    for (const p of this.iles){
      ctx.globalAlpha = 0.45;
      ctx.drawImage(p.spr.ombre, p.x + 9, p.y + 13);
      ctx.globalAlpha = 1;
      ctx.drawImage(p.spr.cv, p.x, p.y);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = this.p.alphaEcume;
    this.ecume.dessiner(ctx);
    ctx.globalAlpha = 1;
    if (this.brume) this.brume.dessiner(ctx);   // brume glaciale
    if (this.p.pluie){   // pluie battante de la tempête
      ctx.strokeStyle = 'rgba(200,225,255,.22)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const g of this.gouttes){ ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - 18, g.y - 34); }
      ctx.stroke();
    }
  }
}

/* ——— GALAXIE : 3 variantes (astéroïdes / comètes / nébuleuse) ——— */

function fabriquerNebuleuses(seed, teintes, nb = 5){
  const rng = mulberry32(seed);
  const cv = cvAux(L, 2160);
  const c = cv.getContext('2d');
  for (let i = 0; i < nb; i++){
    const x = 60 + rng() * (L - 120), y = 200 + rng() * 1760, r = 130 + rng() * 130;
    const [rc, gc, bc] = teintes[(rng() * teintes.length) | 0];
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rc + ',' + gc + ',' + bc + ',.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  return cv;
}

function fabriquerChampEtoiles(seed, nb, tailleMax, teintes){
  const rng = mulberry32(seed);
  const cv = cvAux(L, 720);
  const c = cv.getContext('2d');
  for (let i = 0; i < nb; i++){
    const x = (rng() * L) | 0, y = (rng() * 716) | 0, t = 1 + ((rng() * tailleMax) | 0);
    c.fillStyle = teintes[(rng() * teintes.length) | 0];
    c.fillRect(x, y, t, t);
    if (t >= 3){   // grosse étoile : croix brillante
      c.fillStyle = 'rgba(255,255,255,.7)';
      c.fillRect(x - 3, y + (t / 2 | 0), t + 6, 1);
      c.fillRect(x + (t / 2 | 0), y - 3, 1, t + 6);
    }
  }
  return cv;
}

function fabriquerPlanete(seed){
  const rng = mulberry32(seed);
  const w = 150, h = 150, cx = 75, cy = 75;
  const cv = cvAux(w, h);
  const c = cv.getContext('2d');
  const r = 42 + rng() * 22;
  const palettes = [
    ['#d8843f', '#a85a28', '#e8b06a'], ['#3f9ad8', '#2a6fa8', '#8fd4f0'],
    ['#9a6fd8', '#6b46a8', '#d0b0f0'], ['#d8c070', '#b09440', '#f0e0a0'],
  ];
  const [cl, cf, cs] = palettes[(rng() * 4) | 0];
  const anneau = rng() < 0.5;
  const dessinerAnneau = avant => {
    c.save();
    if (avant){ c.beginPath(); c.rect(0, cy, w, h / 2); c.clip(); }
    c.strokeStyle = cs; c.globalAlpha = 0.85; c.lineWidth = 7;
    c.beginPath(); c.ellipse(cx, cy, r + 26, (r + 26) * 0.32, -0.35, 0, 7); c.stroke();
    c.globalAlpha = 0.3; c.lineWidth = 13; c.stroke();
    c.restore(); c.globalAlpha = 1;
  };
  if (anneau) dessinerAnneau(false);
  c.fillStyle = cf; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip();
  c.fillStyle = cl; c.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) c.fillRect(cx - r, cy - r * 0.55 + i * r * 0.42, r * 2, r * 0.16);
  c.globalAlpha = 1;
  c.fillStyle = 'rgba(5,8,20,.55)';   // croissant éclairé
  c.beginPath(); c.arc(cx + r * 0.42, cy + r * 0.18, r, 0, 7); c.fill();
  c.fillStyle = cs; c.globalAlpha = 0.5;
  c.beginPath(); c.arc(cx - r * 0.35, cy - r * 0.3, r * 0.18, 0, 7); c.fill();
  c.beginPath(); c.arc(cx - r * 0.1, cy - r * 0.5, r * 0.1, 0, 7); c.fill();
  c.restore();
  if (anneau) dessinerAnneau(true);
  return cv;
}

function fabriquerAsteroïdes(seed){
  const rng = mulberry32(seed);
  const cv = cvAux(L, 720);
  const c = cv.getContext('2d');
  for (let i = 0; i < 9; i++){
    const cx = 40 + rng() * (L - 80), cy = 40 + rng() * 640, r = 10 + rng() * 22;
    c.fillStyle = '#55462f';
    c.beginPath();
    for (let k = 0; k < 8; k++){
      const a = k / 8 * Math.PI * 2, rr = r * (0.72 + rng() * 0.5);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      k ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath(); c.fill();
    c.fillStyle = '#6b5a44'; c.beginPath(); c.arc(cx - r * 0.2, cy - r * 0.2, r * 0.55, 0, 7); c.fill();
    c.fillStyle = '#3d3222'; c.beginPath(); c.arc(cx + r * 0.3, cy + r * 0.25, r * 0.22, 0, 7); c.fill();
  }
  return cv;
}

class DecorGalaxie {
  constructor(seed, vFond, variante){
    const teintes = {
      asteroides: [[120, 45, 160], [35, 120, 135], [150, 60, 110], [70, 60, 160]],
      cometes:    [[35, 120, 160], [60, 80, 190], [40, 150, 150]],
      nebuleuse:  [[195, 45, 70], [150, 35, 90], [120, 25, 60], [170, 60, 45]],
    }[variante] || [[120, 45, 160], [35, 120, 135]];
    const boost = variante === 'cometes' ? 1.28 : 1;
    this.nebuleuses   = new CoucheDefilante(fabriquerNebuleuses(seed, teintes, variante === 'nebuleuse' ? 8 : 5), vFond * 0.06);
    this.etoilesLoin  = new CoucheDefilante(fabriquerChampEtoiles(seed + 1, 150, 1.5, ['#5a6a8a', '#4a5f88']), vFond * 0.12 * boost);
    this.etoilesMoyen = new CoucheDefilante(fabriquerChampEtoiles(seed + 2, 90, 2.5, ['#cdd8ee', '#9fb4e8', '#ffd9a8']), vFond * 0.3 * boost);
    this.etoilesProche= new CoucheDefilante(fabriquerChampEtoiles(seed + 3, 45, 3.5, ['#ffffff', '#bfe6ff']), vFond * 0.65 * boost);
    this.asteroides = variante === 'asteroides' ? new CoucheDefilante(fabriquerAsteroïdes(seed + 8), vFond * 0.45) : null;
    this.variantesPlanetes = [fabriquerPlanete(seed + 4), fabriquerPlanete(seed + 5), fabriquerPlanete(seed + 6), fabriquerPlanete(seed + 7)];
    this.planetes = [];
    this.cometes = [];
    this.freqComete = variante === 'cometes' ? 0.45 : 0.12;
    this.delaiPlanete = variante === 'nebuleuse' ? [6, 11] : [9, 16];
    this.prochainePlanete = 3;
    this.temps = 0;
    this.trouNoir = variante === 'trounoir' ? { cx: L / 2, cy: 300, particules: [] } : null;
    if (this.trouNoir)
      for (let i = 0; i < 26; i++)
        this.trouNoir.particules.push({ r: alea(180, 440), a: alea(0, 6.28) });
    this.pulsar = variante === 'pulsar' ? { cx: L / 2, cy: 250, a: 0 } : null;
  }
  maj(dt){
    this.temps += dt;
    if (this.trouNoir)
      for (const p of this.trouNoir.particules){
        p.a += (0.9 + 160 / Math.max(60, p.r)) * dt;   // spirale accélérée
        p.r -= 36 * dt;
        if (p.r < 24){ p.r = alea(380, 460); p.a = alea(0, 6.28); }
      }
    if (this.pulsar) this.pulsar.a += dt * 0.6;
    this.nebuleuses.maj(dt);
    this.etoilesLoin.maj(dt); this.etoilesMoyen.maj(dt); this.etoilesProche.maj(dt);
    if (this.asteroides) this.asteroides.maj(dt);
    this.prochainePlanete -= dt;
    if (this.prochainePlanete <= 0){
      this.planetes.push({ x: alea(40, L - 190), y: -170, cv: choix(this.variantesPlanetes) });
      this.prochainePlanete = alea(this.delaiPlanete[0], this.delaiPlanete[1]);
    }
    for (let i = this.planetes.length - 1; i >= 0; i--){
      this.planetes[i].y += this.etoilesMoyen.v * 0.7 * dt;
      if (this.planetes[i].y > H + 160) this.planetes.splice(i, 1);
    }
    if (Math.random() < dt * this.freqComete) this.cometes.push({ x: alea(0, L), y: -40, vx: alea(-70, 70), vy: 520 });
    for (let i = this.cometes.length - 1; i >= 0; i--){
      const co = this.cometes[i];
      co.x += co.vx * dt; co.y += co.vy * dt;
      if (co.y > H + 60) this.cometes.splice(i, 1);
    }
  }
  dessiner(ctx){
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, L, H);
    this.nebuleuses.dessiner(ctx);
        // — variante TROU NOIR : disque d'accrétion + matière aspirée —
    if (this.trouNoir){
      const t = this.trouNoir;
      for (let k = 0; k < 5; k++){
        ctx.strokeStyle = 'rgba(' + (150 - k * 20) + ',' + (90 - k * 10) + ',' + (220 - k * 20) + ',' + (0.5 - k * 0.08).toFixed(2) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(t.cx, t.cy, 60 + k * 26, 24 + k * 10, 0, 0, 7);
        ctx.stroke();
      }
      ctx.fillStyle = '#cfd8ff';
      for (const p of t.particules){
        const pr = Math.max(1, (460 - p.r) / 90);
        ctx.globalAlpha = Math.min(1, (460 - p.r) / 300 + 0.25);
        ctx.beginPath();
        ctx.arc(t.cx + Math.cos(p.a) * p.r, t.cy + Math.sin(p.a) * p.r * 0.55, pr, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#020208';
      ctx.beginPath(); ctx.arc(t.cx, t.cy, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(200,180,255,.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.cx, t.cy, 27, 0, 7); ctx.stroke();
    }
    // — variante PULSAR : faisceaux balayants + étoile qui pulse —
    if (this.pulsar){
      const p = this.pulsar;
      ctx.save();
      ctx.translate(p.cx, p.cy);
      ctx.rotate(p.a);
      ctx.fillStyle = 'rgba(140,240,255,.10)';
      for (const sens of [0, Math.PI]){
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sens - 0.09) * 520, Math.sin(sens - 0.09) * 520);
        ctx.lineTo(Math.cos(sens + 0.09) * 520, Math.sin(sens + 0.09) * 520);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      const pu = 1 + Math.sin(this.temps * 5) * 0.18;
      ctx.fillStyle = 'rgba(140,240,255,.30)';
      ctx.beginPath(); ctx.arc(p.cx, p.cy, 22 * pu, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8fdff';
      ctx.beginPath(); ctx.arc(p.cx, p.cy, 10 * pu, 0, 7); ctx.fill();
    }
    this.etoilesLoin.dessiner(ctx);
    if (this.asteroides) this.asteroides.dessiner(ctx);
    ctx.imageSmoothingEnabled = true;   // planètes : glissement sous-pixel
    for (const p of this.planetes) ctx.drawImage(p.cv, p.x, p.y);
    ctx.imageSmoothingEnabled = false;
    this.etoilesMoyen.dessiner(ctx);
    this.etoilesProche.dessiner(ctx);
    ctx.strokeStyle = 'rgba(200,240,255,.7)'; ctx.lineWidth = 2;
    for (const co of this.cometes){
      ctx.beginPath(); ctx.moveTo(co.x, co.y);
      ctx.lineTo(co.x - co.vx * 0.09, co.y - co.vy * 0.09); ctx.stroke();
    }
  }
}
/* ════════ 6. PARTICULES & EXPLOSIONS ════════ */

class Particule {
  constructor(x, y, vx, vy, duree, type, opts = {}){
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.duree = duree; this.age = 0; this.type = type;
    this.taille = opts.taille || 5;
    this.couleur = opts.couleur || '#ffb020';
  }
  maj(dt){
    this.age += dt;
    if (this.age >= this.duree) return false;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= (1 - 1.5 * dt);
    return true;
  }
  dessiner(ctx){
    const t = this.age / this.duree, a = 1 - t;
    if (this.type === 'feu'){
      const r = Math.max(1, this.taille * (1 - t));
      ctx.fillStyle = t < 0.22 ? '#ffffff' : t < 0.45 ? '#ffe94a' : t < 0.7 ? '#ffb020' : '#b34a1e';
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, 7); ctx.fill();
    } else if (this.type === 'etincelle'){
      ctx.globalAlpha = a;
      ctx.strokeStyle = this.couleur; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.045, this.y - this.vy * 0.045); ctx.stroke();
    } else { // 'anneau' : onde de choc
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = this.couleur;
      ctx.lineWidth = Math.max(1, 3.5 * (1 - t));
      ctx.beginPath(); ctx.arc(this.x, this.y, 4 + t * this.taille, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function explosion(jeu, x, y, force = 1){
  jeu.secousse = Math.min(14, jeu.secousse + 4 * force);
  // en survie dense : au-delà de 240 particules vivantes, les explosions
  // comptent pour un tiers — le décor doit défiler, pas hoqueter
  const dense = jeu.particules.length < 240;
  const k = dense ? 1 : 0.35;
  for (let i = 0; i < Math.round(9 * force * k); i++){
    const a = alea(0, Math.PI * 2), v = alea(30, 190) * Math.sqrt(force);
    jeu.particules.push(new Particule(x, y, Math.cos(a) * v, Math.sin(a) * v,
      alea(0.25, 0.6), 'feu', { taille: alea(4, 9) * Math.sqrt(force) }));
  }
  for (let i = 0; i < Math.round(7 * force * k); i++){
    const a = alea(0, Math.PI * 2), v = alea(150, 420);
    jeu.particules.push(new Particule(x, y, Math.cos(a) * v, Math.sin(a) * v,
      alea(0.15, 0.4), 'etincelle', { couleur: Math.random() < 0.5 ? '#ffe94a' : '#ff8a5e' }));
  }
  if (dense)
    jeu.particules.push(new Particule(x, y, 0, 0, 0.45, 'anneau',
      { couleur: 'rgba(255,220,150,1)', taille: 40 * Math.sqrt(force) }));
  Son.explosion(force);
}

/* ════════ 7. ENTITÉS ════════ */

/* Cache de sprites de balles ennemies : 1 drawImage au lieu de
   3 arcs géométriques par balle (jusqu'à 140 balles par frame). */
const SPRITES_BALLES = {};
function spriteBalle(couleur, rayon){
  const cle = couleur + '_' + rayon;
  if (!SPRITES_BALLES[cle]){
    const c = COUL_BALLES[couleur] || COUL_BALLES.rouge;
    const cv = cvAux((rayon + 3) * 2, (rayon + 3) * 2);
    const x = cv.width / 2, y = cv.height / 2;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#141c2c';
    c2.beginPath(); c2.arc(x, y, rayon + 1.5, 0, 7); c2.fill();
    c2.fillStyle = c.b;
    c2.beginPath(); c2.arc(x, y, rayon, 0, 7); c2.fill();
    c2.fillStyle = c.c;
    c2.beginPath(); c2.arc(x - 1, y - 1.5, rayon * 0.42, 0, 7); c2.fill();
    SPRITES_BALLES[cle] = cv;
  }
  return SPRITES_BALLES[cle];
}

class Balle {
  constructor(x, y, vx, vy, opts = {}){
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.amie = !!opts.amie;
    this.rayon = opts.rayon || 5;
    this.couleur = opts.couleur || 'rouge';
  }
  maj(dt){
    this.x += this.vx * dt; this.y += this.vy * dt;
    return this.y > -30 && this.y < H + 30 && this.x > -30 && this.x < L + 30;
  }
  distanceA(e){
    const dx = e.x - this.x, dy = e.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);   // nettement plus rapide que Math.hypot
  }
  dessiner(ctx){
    if (this.amie){
      ctx.fillStyle = '#1a9e94'; ctx.fillRect(this.x - 2, this.y + 3, 4, 11);
      ctx.fillStyle = '#5cf7e4'; ctx.fillRect(this.x - 2, this.y - 7, 4, 11);
      ctx.fillStyle = '#eafffb'; ctx.fillRect(this.x - 1, this.y - 7, 2, 5);
    } else {
      const spr = spriteBalle(this.couleur, this.rayon);
      ctx.drawImage(spr, Math.round(this.x - spr.width / 2), Math.round(this.y - spr.height / 2));
    }
  }
}

/* Tableau des ennemis — tire:false = jamais de tir.
   Communs : drone, raider, zigzag, plongeur, croiseur, mine, tank,
   bombardier. Terre : tourelle, helico, chasseur. Océan : raie,
   meduse. Galaxie : serpentTete/segment, asteroide. */
const TYPES_ENNEMIS = {
  drone:      { hp:1, score:100, rayon:15, tirCd:2.8 },
  raider:     { hp:2, score:150, rayon:14, tirCd:1.7 },
  zigzag:     { hp:1, score:120, rayon:11, tirCd:2.8 },
  plongeur:   { hp:1, score:200, rayon:12, tirCd:9,   tire:false },
  croiseur:   { hp:4, score:300, rayon:18, tirCd:2.6 },
  mine:       { hp:1, score:150, rayon:13, tirCd:9,   tire:false },
  tank:       { hp:6, score:400, rayon:22, tirCd:2.1 },
  bombardier: { hp:8, score:600, rayon:23, tirCd:2.6 },
  helico:     { hp:5, score:350, rayon:17, tirCd:1.9 },
  chasseur:   { hp:2, score:180, rayon:12, tirCd:1.5 },
  raie:       { hp:3, score:250, rayon:19, tirCd:3.2 },
  meduse:     { hp:2, score:220, rayon:15, tirCd:2.9 },
  serpentTete:{ hp:3, score:300, rayon:12, tirCd:2.2 },
  segment:    { hp:1, score:80,  rayon:9,  tirCd:9,   tire:false },
  asteroide:  { hp:2, score:200, rayon:16, tirCd:9,   tire:false },
};

class Ennemi {
  constructor(type, x, y, comp = 'sinus', opts = {}){
    const t = TYPES_ENNEMIS[type];
    this.type = type; this.x = x; this.y = y; this.x0 = x; this.y0 = y;
    this.hp = t.hp; this.score = t.score; this.rayon = t.rayon;
    this.comp = comp; this.age = 0; this.flash = 0; this.mort = false;
    this.amp = opts.amp ?? 30;
    this.om = opts.om ?? 1.6;
    this.ph = opts.ph ?? 0;
    this.vy = opts.vy ?? 70;
    this.vx = opts.vx ?? 0;
    this.a0 = opts.a0 ?? 0;            // roue tournante
    this.r = opts.r ?? 110;
    this.vRot = opts.vRot ?? 0.7;
    this.yCible = opts.yCible ?? 110;  // stationnement
    this.stationnaire = opts.stationnaire ?? 3;
    this.phase = 0; this.vyFuite = 40;
    this.yDecl = opts.yDecl ?? 150;    // plongeur : altitude de déclenchement
    this.eca = opts.eca ?? 22;         // segment : distance au chef
    this.chef = opts.chef ?? null;     // segment : ennemi suivi
    this.index = opts.index ?? 0;      // segment : rang (ondulation)
    this.peutTirer = (opts.peutTirer ?? true) && (t.tire !== false);
    this.tirCd = t.tirCd * (opts.tirCd ?? 1);
    this.cd = alea(0.6, 1.8);
    this.vitesseTir = opts.vitesseTir ?? 170;
    this.fileTirs = [];
    this.rot = alea(0, 6.28);   // astéroïde : angle de rotation
    this.forme = type === 'asteroide' ? Array.from({ length: 8 }, () => alea(0.7, 1.3)) : null;
  }

  maj(dt, jeu){
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.type === 'asteroide') this.rot += 1.4 * dt;

    switch (this.comp){
      case 'sinus':
        this.y += this.vy * dt;
        this.x = this.x0 + Math.sin(this.age * this.om + this.ph) * this.amp;
        break;
      case 'traverse':
        this.x += this.vx * dt;
        this.y = this.y0 + Math.sin(this.age * 2.1) * 26;
        break;
      case 'anneau':   // roue qui tourne en descendant
        this.x = this.x0 + Math.cos(this.a0 + this.age * this.vRot) * this.r;
        this.y = this.y0 + this.vy * this.age + Math.sin(this.a0 + this.age * this.vRot) * this.r * 0.45;
        break;
      case 'hover':
        if (this.phase === 0){
          this.y += 95 * dt;
          if (this.y >= this.yCible) this.phase = 1;
        } else if (this.phase === 1){
          this.stationnaire -= dt;
          if (this.stationnaire <= 0) this.phase = 2;
        } else {
          this.vyFuite += 300 * dt;
          this.y += this.vyFuite * dt;
        }
        this.x = this.x0 + Math.sin(this.age * 1.1) * 16;
        break;
      case 'plongeon':   // kamikaze : verrouille le joueur puis pique dessus
        if (this.phase === 0){
          this.y += 95 * dt;
          if (this.y >= this.yDecl){
            this.phase = 1;
            const a = jeu.angleVersJoueur(this.x, this.y);
            this.dirX = Math.cos(a); this.dirY = Math.sin(a);
            this.vitesse = 200;
          }
        } else {
          this.vitesse = Math.min(520, this.vitesse + 560 * dt);
          this.x += this.dirX * this.vitesse * dt;
          this.y += this.dirY * this.vitesse * dt;
        }
        break;
      case 'suivant':   // segment d'hydre : suit l'ennemi de devant
        if (this.chef && !this.chef.mort){
          const dx = this.chef.x - this.x, dy = this.chef.y - this.y;
          const d = Math.hypot(dx, dy);
          if (d > this.eca){
            this.x += dx / d * 300 * dt;
            this.y += dy / d * 300 * dt;
          }
        } else {   // chef détruit : le segment devient un drone libre
          this.comp = 'sinus';
          this.x0 = this.x; this.amp = 46; this.om = 1.4;
          this.ph = alea(0, 6.28); this.vy = 80;
          this.y += this.vy * dt;
        }
        break;
      case 'serpent':   // tête d'hydre : grand slalom descendant
        this.y += 72 * dt;
        this.x = this.x0 + Math.sin(this.age * 1.5) * this.amp;
        break;
      case 'strafe':   // hélico : descend, patrouille en horizontal, repart
        if (this.phase === 0){
          this.y += 80 * dt;
          if (this.y >= this.yCible) this.phase = 1;
        } else if (this.phase === 1){
          this.x = this.x0 + Math.sin(this.age * 0.7) * 170;
          this.stationnaire -= dt;
          if (this.stationnaire <= 0) this.phase = 2;
        } else {
          this.vyFuite += 240 * dt;
          this.y += this.vyFuite * dt;
        }
        break;
      case 'descente':  // mur : tout droit
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        break;
    }

    // Tirs — période de grâce de 3 s en début de niveau
    if (jeu.temps > 3 && this.peutTirer && this.y > 30 && this.y < 480 && this.age > 0.4){
      this.cd -= dt;
      if (this.cd <= 0 && this.fileTirs.length === 0){
        const nb = this.type === 'tank' ? 3 : this.type === 'chasseur' ? 2 : 1;
        for (let i = 0; i < nb; i++) this.fileTirs.push(i * 0.15);
        this.cd = this.tirCd * alea(0.75, 1.35);
      }
    }
    if (this.fileTirs.length){
      this.fileTirs[0] -= dt;
      while (this.fileTirs.length && this.fileTirs[0] <= 0){
        this.fileTirs.shift();
        if (this.type === 'bombardier'){   // lâcher de bombe lourde
          jeu.tirEnnemi(this.x + alea(-14, 14), this.y + 24,
            Math.PI / 2 + alea(-0.06, 0.06), 148, { couleur:'ombre', rayon:7 });
        } else if (this.type === 'croiseur'){   // éventail de 3
          const a = jeu.angleVersJoueur(this.x, this.y);
          for (let k = -1; k <= 1; k++)
            jeu.tirEnnemi(this.x, this.y + 12, a + k * 0.32, this.vitesseTir);
        } else if (this.type === 'meduse'){   // couronne de bulles
          for (let k = 0; k < 6; k++)
            jeu.tirEnnemi(this.x, this.y, k * Math.PI / 3, this.vitesseTir * 0.7, { couleur:'magenta' });
        } else if (this.type === 'helico' || this.type === 'chasseur'){   // rafale vers le bas
          jeu.tirEnnemi(this.x - 6, this.y + 14, Math.PI / 2, this.vitesseTir + 30);
          jeu.tirEnnemi(this.x + 6, this.y + 14, Math.PI / 2, this.vitesseTir + 30);
        } else {
          const a = jeu.angleVersJoueur(this.x, this.y) + alea(-0.11, 0.11);
          jeu.tirEnnemi(this.x, this.y + 12, a, this.vitesseTir);
        }
        Son.tirEnnemi();
      }
    }
    return this.y < H + 70 && this.y > -230 && this.x > -90 && this.x < L + 90;
  }

  dessiner(ctx){
    // hydre : orbes violets dessinés à la main
    if (this.type === 'serpentTete' || this.type === 'segment'){
      const tete = this.type === 'serpentTete';
      const rr = tete ? 11 : 8 + Math.sin(this.age * 6 + this.index * 1.1);
      ctx.fillStyle = '#2a1444';
      ctx.beginPath(); ctx.arc(this.x, this.y, rr + 2, 0, 7); ctx.fill();
      ctx.fillStyle = this.flash > 0 ? '#ffffff' : (tete ? '#8a4fd0' : '#6b3fb8');
      ctx.beginPath(); ctx.arc(this.x, this.y, rr, 0, 7); ctx.fill();
      ctx.fillStyle = '#d9baff';
      ctx.beginPath(); ctx.arc(this.x - rr * 0.3, this.y - rr * 0.3, rr * 0.35, 0, 7); ctx.fill();
      if (tete){
        ctx.fillStyle = '#ffe94a';
        ctx.fillRect(this.x - 5, this.y - 4, 3, 3);
        ctx.fillRect(this.x + 2, this.y - 4, 3, 3);
      }
      return;
    }
        // mine : cœur rouge qui clignote
    if (this.type === 'mine'){
      const spr = SPRITES.mine;
      const px = Math.round(this.x - spr.width / 2), py = Math.round(this.y - spr.height / 2);
      ctx.drawImage(spr, px, py);
      if ((this.age * 4 | 0) % 2 === 0){
        ctx.fillStyle = '#ff5040';
        ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, 7); ctx.fill();
      }
      if (this.flash > 0){
        ctx.globalAlpha = Math.min(1, this.flash * 9);
        ctx.drawImage(SPRITES.blanc.mine, px, py);
        ctx.globalAlpha = 1;
      }
      return;
    }
    // hélico : rotor qui tourne par-dessus le fuselage
    if (this.type === 'helico'){
      const spr = SPRITES.helico;
      const px = Math.round(this.x - spr.width / 2), py = Math.round(this.y - spr.height / 2);
      ctx.drawImage(spr, px, py);
      ctx.save();
      ctx.translate(this.x, this.y - 3);
      ctx.rotate(this.age * 22);
      ctx.fillStyle = 'rgba(200,210,220,.8)';
      ctx.fillRect(-17, -1.5, 34, 3);
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-17, -1.5, 34, 3);
      ctx.restore();
      ctx.fillStyle = '#39424e';
      ctx.beginPath(); ctx.arc(this.x, this.y - 3, 3.5, 0, 7); ctx.fill();
      if (this.flash > 0){
        ctx.globalAlpha = Math.min(1, this.flash * 9);
        ctx.drawImage(SPRITES.blanc.helico, px, py);
        ctx.globalAlpha = 1;
      }
      return;
    }
    // méduse : dôme qui pulse + tentacules ondulantes
    if (this.type === 'meduse'){
      const spr = SPRITES.meduse;
      const px = Math.round(this.x - spr.width / 2), py = Math.round(this.y - spr.height / 2);
      const puls = 1 + Math.sin(this.age * 4) * 0.08;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(puls, puls);
      ctx.drawImage(spr, px - this.x, py - this.y);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,122,217,.85)';
      ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++){
        ctx.beginPath();
        ctx.moveTo(this.x + k * 7, this.y + 8);
        ctx.quadraticCurveTo(
          this.x + k * 7 + Math.sin(this.age * 5 + k) * 7, this.y + 16,
          this.x + k * 7 + Math.sin(this.age * 5 + k + 1) * 10, this.y + 24);
        ctx.stroke();
      }
      if (this.flash > 0){
        ctx.globalAlpha = Math.min(1, this.flash * 9);
        ctx.drawImage(SPRITES.blanc.meduse, px, py);
        ctx.globalAlpha = 1;
      }
      return;
    }
    // astéroïde : rocher polygonal en rotation
    if (this.type === 'asteroide'){
      ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#6b5a44';
      ctx.beginPath();
      for (let k = 0; k < 8; k++){
        const a = this.rot + k * Math.PI / 4;
        const rr = 16 * this.forme[k];
        const x = this.x + Math.cos(a) * rr, y = this.y + Math.sin(a) * rr;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#55462f';
      ctx.beginPath(); ctx.arc(this.x + 4, this.y + 3, 5, 0, 7); ctx.fill();
      return;
    }
    const spr = SPRITES[this.type];
    const px = Math.round(this.x - spr.width / 2), py = Math.round(this.y - spr.height / 2);
    ctx.drawImage(spr, px, py);
    if (this.flash > 0){
      ctx.globalAlpha = Math.min(1, this.flash * 9);
      ctx.drawImage(SPRITES.blanc[this.type], px, py);
      ctx.globalAlpha = 1;
    }
  }
}

/* Tourelle ancrée au sol : défile avec le terrain, traque puis canarde */
class Tourelle {
  constructor(x){
    this.x = x; this.y = -30;
    this.hp = 3; this.score = 150; this.rayon = 16;
    this.canon = Math.PI / 2;
    this.cd = alea(1, 2);
    this.flash = 0;
  }
  maj(dt, jeu){
    this.flash = Math.max(0, this.flash - dt);
    this.y += jeu.spec.vitesseFond * dt;
    const cible = jeu.angleVersJoueur(this.x, this.y - 4);
    this.canon = lerpAngle(this.canon, cible, 2.4 * dt);
    this.cd -= dt;
    if (jeu.temps > 5 && this.cd <= 0 && this.y > 50 && this.y < 560 &&
        Math.abs(diffAngle(this.canon, cible)) < 0.3){
      const mx = this.x + Math.cos(this.canon) * 24, my = this.y - 4 + Math.sin(this.canon) * 24;
      jeu.tirEnnemi(mx, my, this.canon, Math.min(315, 150 + jeu.diff * 11));
      Son.tirEnnemi();
      this.cd = Math.max(1.5, 2.8 - jeu.niveau * 0.12);
    }
    return this.y < H + 50;
  }
  dessiner(ctx){
    const spr = SPRITES.tourelle;
    const px = Math.round(this.x - spr.width / 2), py = Math.round(this.y - spr.height / 2 + 6);
    ctx.drawImage(spr, px, py);
    ctx.save();
    ctx.translate(this.x, this.y - 2);
    ctx.rotate(this.canon);
    ctx.fillStyle = '#39424e'; ctx.fillRect(0, -4, 20, 8);
    ctx.fillStyle = '#5a6672'; ctx.fillRect(4, -2, 16, 4);
    ctx.fillStyle = '#232b36'; ctx.fillRect(18, -5, 5, 10);
    ctx.restore();
    ctx.fillStyle = '#232b36'; ctx.beginPath(); ctx.arc(this.x, this.y - 2, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a6672'; ctx.beginPath(); ctx.arc(this.x, this.y - 2, 5, 0, 7); ctx.fill();
    if (this.flash > 0){
      ctx.globalAlpha = Math.min(1, this.flash * 9);
      ctx.drawImage(SPRITES.blanc.tourelle, px, py);
      ctx.globalAlpha = 1;
    }
  }
}

/* Boss de fin de niveau : PV et agressivité indexés sur le niveau */
class Boss {
  constructor(jeu){
    this.env = jeu.spec.env;
    this.niveau = jeu.niveau;
    this.nom = nomBoss(this.env, this.niveau);
    this.diff = jeu.diff;
    this.hpMax = this.hp = 80 + 26 * this.diff;
    this.score = 2200 + 380 * this.niveau;
    this.x = L / 2; this.y = -90; this.rayon = 42;
    this.age = 0; this.etat = 'entree'; this.flash = 0; this.phase = 1;
    this.pattern = null; this.pause = 1.2;
    this.ptTemps = 0; this.ptCd = 0; this.ptAngle = 0; this.dureePattern = 1;
    this.canonG = Math.PI / 2; this.canonD = Math.PI / 2;
    this.compteurRafale = 0;
    this.cdCanon = 1.4;
    this.vaincu = false;
    this.minuteurMort = 0; this.explosionTimer = 0;
  }

  toucher(d, jeu){
    if (this.vaincu) return;
    this.hp -= d; this.flash = 0.09;
    Son.impact();
    if (this.hp <= 0){ this.vaincu = true; jeu.bossVaincu(); }
  }

  lancerPattern(phase){
    const listes = {
      terre:   [ ['eventail','rafale'], ['eventail','rafale','invasion','rideau'], ['eventail','rafale','invasion','rideau','anneau'] ],
      ocean:   [ ['anneau','eventail'], ['anneau','eventail','rideau'], ['anneau','eventail','rideau','spirale'] ],
      galaxie: [ ['spirale','rafale'], ['spirale','rafale','anneau'], ['spirale','rafale','anneau','rideau'] ],
    };
    let dispo = listes[this.env][phase - 1];
    // les tout premiers boss n'ont pas les patterns les plus cruels
    if (this.diff < 2.2) dispo = dispo.filter(p => p !== 'rideau' && p !== 'invasion');
    this.pattern = choix(dispo);
    this.dureePattern = { eventail:2.4, spirale:2.6, rafale:1.6, anneau:1.7, rideau:1.9, invasion:0.9 }[this.pattern];
    this.ptTemps = 0; this.ptCd = 0.15; this.ptAngle = alea(0, Math.PI * 2);
    this.compteurRafale = 0;
  }

  emettre(jeu, phase){
    const v = (140 + 11 * this.diff) * (1 + 0.08 * (phase - 1));
    switch (this.pattern){
      case 'eventail': {
        const a = jeu.angleVersJoueur(this.x, this.y + 10);
        for (let k = -2; k <= 2; k++)
          jeu.tirEnnemi(this.x, this.y + 16, a + k * 0.24, v + 30, { couleur:'rouge' });
        this.ptCd = 0.5;
        break;
      }
      case 'spirale': {
        const nb = phase >= 2 ? 4 : 3;
        for (let k = 0; k < nb; k++)
          jeu.tirEnnemi(this.x, this.y + 16, this.ptAngle + k * Math.PI * 2 / nb, v * 0.9, { couleur:'magenta' });
        this.ptAngle += 0.46;
        this.ptCd = 0.09;
        break;
      }
      case 'rafale': {
        const cote = (this.compteurRafale++) % 2 ? 1 : -1;
        const bx = this.x + cote * 33;
        jeu.tirEnnemi(bx, this.y + 12, jeu.angleVersJoueur(bx, this.y), v + 60, { couleur:'rouge' });
        this.ptCd = 0.13;
        break;
      }
      case 'anneau': {
        const n = 14, dec = this.ptAngle;
        for (let k = 0; k < n; k++)
          jeu.tirEnnemi(this.x, this.y + 10, dec + k * Math.PI * 2 / n, v * 0.75, { couleur:'magenta' });
        this.ptAngle += 0.24;
        this.ptCd = 0.75;
        break;
      }
      case 'rideau': {   // mur de tirs avec couloir de survie (plus large tôt)
        const vR = v * 0.62;
        const demiTrou = 64 + Math.max(0, 6 - this.niveau) * 6;
        const couloir = alea(95, L - 95);
        for (let k = 0; k < 13; k++){
          const x = 24 + k * 41;
          if (Math.abs(x - couloir) < demiTrou) continue;
          jeu.tirEnnemi(x, this.y + 20, Math.PI / 2, vR, { couleur:'ambre' });
        }
        this.ptCd = 0.6;
        break;
      }
      case 'invasion': {   // renforts latéraux
        const cote = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0; k < 2; k++){
          jeu.ennemis.push(new Ennemi('raider',
            cote < 0 ? -30 + k * 46 : L + 30 - k * 46, alea(70, 160), 'traverse',
            { vx: cote * 140, tirCd: 0.7, vitesseTir: 190 }));
        }
        this.ptCd = 5;
        break;
      }
    }
  }

  maj(dt, jeu){
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt);

    if (this.etat === 'entree'){
      this.y += 55 * dt;
      if (this.y >= 105){ this.y = 105; this.etat = 'combat'; this.lancerPattern(this.phase); }
      return true;
    }

    if (this.etat === 'mourir'){   // longue agonie explosante
      this.minuteurMort -= dt;
      this.explosionTimer -= dt;
      if (this.explosionTimer <= 0){
        this.explosionTimer = 0.15;
        explosion(jeu, this.x + alea(-42, 42), this.y + alea(-22, 22), alea(0.8, 1.5));
      }
      this.y += 10 * dt;
      return this.minuteurMort > 0;   // false → retiré du jeu
    }

    // passage de phase (66 % puis 33 % des PV)
    const ratio = this.hp / this.hpMax;
    const phaseVoulue = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (phaseVoulue > this.phase){
      this.phase = phaseVoulue;
      this.pattern = null;
      this.pause = 1.1;
      jeu.secousse = 12;
      Son.phase();
      explosion(jeu, this.x, this.y, 1.3);
      return true;
    }

    // déplacement : grand balancement ample
    const cibleX = L / 2 + Math.sin(this.age * 0.55) * (L / 2 - 120);
    this.x += (cibleX - this.x) * Math.min(1, 1.4 * dt);
    this.y = 105 + Math.sin(this.age * 0.8) * 12;

    // enchaînement des patterns avec pauses
    if (this.pause > 0){
      this.pause -= dt;
      if (this.pause <= 0) this.lancerPattern(this.phase);
    } else if (this.pattern){
      this.ptTemps += dt;
      this.ptCd -= dt;
      if (this.ptCd <= 0) this.emettre(jeu, this.phase);
      if (this.ptTemps >= this.dureePattern){ this.pattern = null; this.pause = alea(0.7, 1.1); }
    }

    // canons latéraux traqueurs (phase 2 et 3)
    if (this.phase >= 2){
      this.canonG = lerpAngle(this.canonG, jeu.angleVersJoueur(this.x - 33, this.y), 2.6 * dt);
      this.canonD = lerpAngle(this.canonD, jeu.angleVersJoueur(this.x + 33, this.y), 2.6 * dt);
      this.cdCanon -= dt;
      if (this.cdCanon <= 0){
        for (const c of [{ cx: this.x - 33, a: this.canonG }, { cx: this.x + 33, a: this.canonD }] ){
          jeu.tirEnnemi(c.cx + Math.cos(c.a) * 24, this.y + 8 + Math.sin(c.a) * 24,
                        c.a, 200 + this.diff * 5, { couleur: 'ambre' });
        }
        Son.tirEnnemi();
        this.cdCanon = Math.max(0.9, 1.9 - this.diff * 0.07);
      }
    }
    return true;
  }

  dessiner(ctx, jeu){
    const spr = SPRITES.boss[this.env];
    const px = Math.round(this.x - spr.width / 2), py = Math.round(this.y - spr.height / 2);
    ctx.drawImage(spr, px, py);
    if (this.flash > 0 || (this.etat === 'mourir' && ((this.age * 10) | 0) % 2 === 0)){
      ctx.globalAlpha = this.flash > 0 ? Math.min(1, this.flash * 9) : 0.85;
      ctx.drawImage(SPRITES.bossBlanc[this.env], px, py);
      ctx.globalAlpha = 1;
    }
    // canons orientables
    const pal = PALETTES_BOSS[this.env];
    for (const c of [{ cx: this.x - 33, a: this.canonG }, { cx: this.x + 33, a: this.canonD }] ){
      ctx.save();
      ctx.translate(c.cx, this.y + 8);
      ctx.rotate(c.a);
      ctx.fillStyle = pal.d; ctx.fillRect(-8, -4, 20, 8);
      ctx.fillStyle = pal.a; ctx.fillRect(10, -2.5, 9, 5);
      ctx.restore();
    }
    // œil central qui guette le joueur
    const a = jeu.angleVersJoueur(this.x, this.y + 4);
    ctx.fillStyle = '#0c0614';
    ctx.beginPath(); ctx.arc(this.x, this.y + 4, 8, 0, 7); ctx.fill();
    ctx.fillStyle = COULEUR_OEIL[this.env];
    ctx.beginPath(); ctx.arc(this.x, this.y + 4, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(this.x + Math.cos(a) * 2.5, this.y + 4 + Math.sin(a) * 2.5, 2.5, 0, 7); ctx.fill();
  }
}

/* ════════ LES CAPSULES DE BONUS ════════ */

class Bonus {
  constructor(x, y, type){
    this.x = x; this.y = y; this.type = type;
    this.vy = 75; this.age = 0;
  }
  maj(dt){
    this.age += dt;
    this.y += this.vy * dt;
    this.x += Math.sin(this.age * 2.2) * 22 * dt;
    return this.y < H + 40;
  }
  dessiner(ctx){
    const spr = SPRITES.bonus[this.type];
    const p = 0.5 + 0.5 * Math.sin(this.age * 5);   // halo qui pulse
    ctx.globalAlpha = 0.22 + p * 0.18;
    ctx.fillStyle = DEFS_BONUS[this.type].fenetre;
    ctx.beginPath(); ctx.arc(this.x, this.y, 16 + p * 4, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(spr, Math.round(this.x - spr.width / 2), Math.round(this.y - spr.height / 2));
  }
}

/* ════════ LES VAISSEAUX D'ESCORTE ════════ */

class DroneEscorte {
  constructor(cote){
    this.cote = cote;                 // -1 : aile gauche, +1 : aile droite
    this.xDepart = L / 2 + cote * 130;   // point d'entrée de la glissade d'arrivée
    this.yDepart = H + 40;
    this.x = this.xDepart; this.y = this.yDepart;
    this.age = 0;
    this.integration = 0;             // 0 → 1 : courte arrivée avant le verrouillage
  }
  maj(dt, joueur){
    this.age += dt;
    // poste de formation : VERROUILLÉ sur le leader — plus aucun décalage
    const cibleX = joueur.x + this.cote * 36;
    const cibleY = joueur.y + 4 + Math.sin(this.age * 3 + this.cote) * 3;   // flottement
    if (this.integration < 1){
      // 0,45 s de glissade depuis l'extérieur, puis verrou définitif
      this.integration = Math.min(1, this.integration + dt * 2.2);
      const e = 1 - Math.pow(1 - this.integration, 3);   // easing de rentrée
      this.x = this.xDepart + (cibleX - this.xDepart) * e;
      this.y = this.yDepart + (cibleY - this.yDepart) * e;
    } else {
      this.x = cibleX;
      this.y = cibleY;
    }
  }
  dessiner(ctx, joueur){
    // flamme de propulsion (désynchronisée de l'aile opposée, ça vit)
    const f = 4 + Math.sin(performance.now() * 0.05 + this.cote * 2) * 2;
    ctx.fillStyle = '#c96e0e';
    ctx.beginPath();
    ctx.moveTo(this.x - 3, this.y + 11); ctx.lineTo(this.x + 3, this.y + 11);
    ctx.lineTo(this.x, this.y + 14 + f); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe94a';
    ctx.beginPath();
    ctx.moveTo(this.x - 1.5, this.y + 11); ctx.lineTo(this.x + 1.5, this.y + 11);
    ctx.lineTo(this.x, this.y + 12 + f * 0.55); ctx.closePath(); ctx.fill();
    // le petit vaisseau s'incline comme son leader (même gîte, même écrasement)
    const g = (joueur && joueur.gite) || 0;
    const spr = SPRITES.escorte;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1 - 0.28 * Math.abs(g), 1);
    ctx.rotate(g * 0.10);
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
  }
}

/* ════════ LE JOUEUR ════════ */

class Joueur {
  constructor(){
    this.x = L / 2;
    this.y = H + 60;              // il entre en scène par le bas
    this.vies = 3;
    this.arme = 0;                // 0 → 3 : simple, double, triple, maximal
    this.bouclier = 0;            // secondes restantes
    this.invincible = 0;
    this.cdTir = 0;
    this.rayon = 9;               // hitbox réduite, bien shmup
    this.etat = 'entree';         // entree → actif → respawn → mort → envol
    this.minuteur = 0;
    this.immunise = false;        // invulnérabilité de fin de niveau
    this.poussee = 1;             // multiplicateur de flamme (envol final)
    this.sifflement = false;      // son de départ, joué une seule fois
    this.gite = 0;                // inclinaison latérale (-1 gauche … +1 droite)
    this.drones = [];             // escadrille en orbite (0 à 2 satellites)
  }

  maj(dt, jeu){
    this.invincible = Math.max(0, this.invincible - dt);
    this.bouclier = Math.max(0, this.bouclier - dt);
    this.cdTir = Math.max(0, this.cdTir - dt);
    this.gite -= this.gite * Math.min(1, 6 * dt);   // la gîte retombe d'elle-même
    // l'escadrille orbite tant que le vaisseau est en scène
    if (this.etat !== 'mort' && this.etat !== 'respawn')
      for (const d of this.drones) d.maj(dt, this);

    if (this.etat === 'entree'){
      this.y -= 340 * dt;
      if (this.y <= H - 90){ this.y = H - 90; this.etat = 'actif'; }
      return;
    }
    if (this.etat === 'respawn'){
      this.minuteur -= dt;
      if (this.minuteur <= 0){
        this.x = L / 2; this.y = H - 90;
        this.etat = 'actif';
        this.invincible = 2.5;
      }
      return;
    }
        if (this.etat === 'envol'){   // séquence de fin : recentrage puis montée
      this.minuteur += dt;
      this.x += (L / 2 - this.x) * Math.min(1, 3.2 * dt);
      if (this.minuteur < 0.9){
        this.y += (430 - this.y) * Math.min(1, 2.6 * dt);   // placement au centre
      } else {
        if (!this.sifflement){
          this.sifflement = true;
          this.vitesseEnvol = 240;
          Son.note(240, 0.9, { type:'triangle', vol:0.05, glide:1200 });   // sifflement de départ
        }
        this.vitesseEnvol += 430 * dt;   // accélération franche
        this.poussee = 2.4;
        this.y -= this.vitesseEnvol * dt;
      }
      return;
    }
    if (this.etat !== 'actif') return;

    // déplacement : clavier + joystick fusionnés
    let dx = (entrees.d ? 1 : 0) - (entrees.g ? 1 : 0) + entrees.joyX;
    let dy = (entrees.b ? 1 : 0) - (entrees.h ? 1 : 0) + entrees.joyY;
    const norme = Math.hypot(dx, dy);
    if (norme > 1){ dx /= norme; dy /= norme; }
    this.x = borne(this.x + dx * 340 * dt, 18, L - 18);
    this.y = borne(this.y + dy * 340 * dt, 46, H - 26);
    this.gite += (borne(dx, -1, 1) - this.gite) * Math.min(1, 14 * dt);   // …et prend dès qu'on dérive

    // tir maintenu
    if (entrees.tir && this.cdTir <= 0){
      this.tirer(jeu);
      this.cdTir = CADENCES[this.arme];
    }
  }

  tirer(jeu){
    const motifs = [
      [{ dx: 0,   vx: 0 }],
      [{ dx: -8,  vx: 0 }, { dx: 8,  vx: 0 }],
      [{ dx: -10, vx: 0 }, { dx: 0,  vx: 0 }, { dx: 10, vx: 0 }],
      [{ dx: -12, vx: -70 }, { dx: -5, vx: 0 }, { dx: 5, vx: 0 }, { dx: 12, vx: 70 }],
    ];
    for (const m of motifs[this.arme]){
      jeu.balles.push(new Balle(this.x + m.dx, this.y - 14, m.vx, -640, { amie: true }));
      // flash au canon : micro-particule blanche à la bouche du tir
      jeu.particules.push(new Particule(this.x + m.dx, this.y - 16, m.vx * 0.15, -90,
        0.05, 'feu', { taille: 4 }));
    }
    // les escorteurs tirent en même temps que le vaisseau, depuis leur nez
    for (const d of this.drones){
      jeu.balles.push(new Balle(d.x, d.y - 12, 0, -640, { amie: true }));
      jeu.particules.push(new Particule(d.x, d.y - 14, 0, -90, 0.05, 'feu', { taille: 3 }));
    }
    Son.tir();
  }

  toucher(jeu){
    if (this.immunise) return;   // intouchable dès la mort du boss
    if (this.invincible > 0 || this.etat !== 'actif') return;
    if (jeu.chaine > 0) jeu.chaine = 0;   // tout dégât subi brise la chaîne
    if (this.bouclier > 0){   // le bouclier encaisse le coup
      this.bouclier = 0;
      this.invincible = 1;
      Son.bouclier();
      jeu.particules.push(new Particule(this.x, this.y, 0, 0, 0.5, 'anneau',
        { couleur: 'rgba(92,247,228,1)', taille: 55 }));
      return;
    }
    this.vies--;
    this.arme = Math.max(0, this.arme - 1);        // on perd un niveau d'arme…
    if (this.drones.length > 0) this.drones.pop(); // …et un drone de l'escadrille
    explosion(jeu, this.x, this.y, 1.6);
    Son.joueurTouche();
    if (this.vies <= 0){
      this.etat = 'mort';
      jeu.joueurElimine();
    } else {
      this.etat = 'respawn';
      this.minuteur = 1.5;
    }
  }

  dessiner(ctx){
    // l'escadrille d'abord (derrière le vaisseau), sauf mort/réapparition
    if (this.etat !== 'mort' && this.etat !== 'respawn')
      for (const d of this.drones) d.dessiner(ctx, this);
    if (this.etat === 'mort' || this.etat === 'respawn') return;
    if (this.invincible > 0 && ((this.invincible * 9) | 0) % 2 === 0) return;   // clignote

    const spr = SPRITES.joueur;

    // inclinaison : écrasement horizontal (ailes en plan) + léger roulis
    const g = this.gite || 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1 - 0.28 * Math.abs(g), 1);   // jusqu'à 28 % plus étroit à pleine dérive
    ctx.rotate(g * 0.10);                   // ~6° de roulis
    // flamme de propulsion (dessous, elle vacille) — coordonnées relatives
    const f = (5 + Math.sin(performance.now() * 0.045) * 2.5) * this.poussee;
    ctx.fillStyle = '#c96e0e';
    ctx.beginPath();
    ctx.moveTo(-5, 15); ctx.lineTo(5, 15);
    ctx.lineTo(0, 18 + f); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe94a';
    ctx.beginPath();
    ctx.moveTo(-2.5, 15); ctx.lineTo(2.5, 15);
    ctx.lineTo(0, 16 + f * 0.55); ctx.closePath(); ctx.fill();

    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();

    // bulle de bouclier tournante
    if (this.bouclier > 0){
      const visible = this.bouclier >= 2 || ((performance.now() * 0.006 | 0) % 2 === 0);
      if (visible){
        ctx.save();
        ctx.strokeStyle = 'rgba(92,247,228,.85)';
        ctx.fillStyle = 'rgba(92,247,228,.08)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([11, 8]);
        ctx.lineDashOffset = -performance.now() * 0.04;
        ctx.beginPath(); ctx.arc(this.x, this.y, 27, 0, 7);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }
}

/* Les lignes du générique de fin de campagne */
function fabriquerLignesGenerique(){
  return [
    { s: "AILE D'ACIER",              t: 18, c: '#ffb020', f: '"Press Start 2P"' },
    { s: '',                          t: 12, c: '#8fa0c0', f: '"VT323"' },
    { s: 'CAMPAGNE TERMINÉE',         t: 14, c: '#e8eefc', f: '"Press Start 2P"' },
    { s: '',                          t: 12, c: '#8fa0c0', f: '"VT323"' },
    { s: 'ACTE I · RECONNAISSANCE',   t: 22, c: '#8fa0c0', f: '"VT323"' },
    { s: 'ACTE II · CONTRE-ATTAQUE',  t: 22, c: '#8fa0c0', f: '"VT323"' },
    { s: 'ACTE III · ASSAUT FINAL',   t: 22, c: '#8fa0c0', f: '"VT323"' },
    { s: '',                          t: 12, c: '#8fa0c0', f: '"VT323"' },
    { s: '30 SECTEURS NETTOYÉS',      t: 22, c: '#5cf7e4', f: '"VT323"' },
    { s: 'TERRE · OCÉAN · GALAXIE',   t: 22, c: '#5cf7e4', f: '"VT323"' },
    { s: '',                          t: 12, c: '#8fa0c0', f: '"VT323"' },
    { s: 'ÉTOILES ' + Progression.totalEtoiles() + '/' + (NB_NIVEAUX * 3),
                                      t: 22, c: '#ffd97a', f: '"VT323"' },
    { s: 'RECORD ' + String(Progression.donnees.record).padStart(7, '0'),
                                      t: 22, c: '#ffd97a', f: '"VT323"' },
    { s: '',                          t: 12, c: '#8fa0c0', f: '"VT323"' },
    { s: 'MERCI PILOTE',              t: 16, c: '#ffb020', f: '"Press Start 2P"' },
    { s: '',                          t: 12, c: '#8fa0c0', f: '"VT323"' },
    { s: 'FIN',                       t: 12, c: '#8fa0c0', f: '"Press Start 2P"' },
  ];
}

/* Pool de patrons du mode survie, par monde, par ordre d'apparition */
const PATRONS_SURVIE = {
  terre:   ['ligne','mur','colonne','essaim','V','plongeons','tank','helicos','chasseurs','croiseurs','bombardier','mines'],
  ocean:   ['ligne','essaim','colonne','mur','cercle','raies','meduses','plongeons','embuscade','croiseurs','bombardier','mines'],
  galaxie: ['zigzags','ligne','essaim','embuscade','cercle','serpent','asteroides','plongeons','croiseurs','bombardier','mines'],
};

/* ════════ 8. LA CLASSE JEU : un niveau entier, de l'intro au boss ════════ */

class Jeu {
  constructor(niveau){
    this.survie = niveau === 0;              // 0 = mode survie
    this.niveau = this.survie ? 0 : niveau;
    this.diff = this.survie ? 1 : diffNiveau(niveau);   // courbe saturée sur 30 niveaux
    if (this.survie){
      // les trois mondes pré-générés : rotations sans à-coup
      this.decors = {
        terre:   new DecorTerre(9007, 100, ['prairie','foret','desert','neige','base','volcan','cite','prairie']),
        ocean:   new DecorOcean(9011, 90, 'tempete'),
        galaxie: new DecorGalaxie(9013, 78, 'asteroides'),
      };
      this.spec = {
        env:'terre', secteur:'MODE SURVIE',
        patrons:['ligne','mur','colonne','essaim','V'],
        intervalle:4.4, duree:Infinity, tourelles:8,
        tauxTir:0.35, vitesseFond:100,
      };
      this.decor = this.decors.terre;
      this.vagueSurvie = 0;         // compteur de vagues
      this.prochaineRotation = 45;  // changement de monde toutes les 45 s
    } else {
      this.spec = NIVEAUX[niveau - 1];
      this.decor = this.spec.env === 'terre'
        ? new DecorTerre(niveau * 1000 + 7, this.spec.vitesseFond, this.spec.biomes)
        : this.spec.env === 'ocean'
        ? new DecorOcean(niveau * 1000 + 7, this.spec.vitesseFond, this.spec.variante)
        : new DecorGalaxie(niveau * 1000 + 7, this.spec.vitesseFond, this.spec.variante);
    }
    this.joueur = new Joueur();
    this.balles = []; this.ennemis = []; this.tourelles = [];
    this.bonus = []; this.particules = []; this.messages = [];
    this.boss = null;
    this.score = 0;
    this.prochainPalierVie = 20000;   // vie bonus tous les 25 000 points
    this.secousse = 0;
    this.ralenti = 0;                 // chrono du ralenti dramatique (mort du boss)
    this.chaine = 0;                  // destructions enchaînées (≤ 2 s d'intervalle)
    this.tempsChaine = 0;             // temps restant avant expiration
    this.multiMax = 1;                // meilleur multiplicateur atteint dans le niveau
    this.temps = 0;
    this.minuteurEtat = 0;
    this.etat = 'intro';              // intro → vague → alerte → boss → victoire / defaite
    this.pause = false;
    this.prochaineVague = 1.2;
    this.prochaineTourelle = 5;
    this.dernierPatron = null;        // anti-répétition des vagues
    this.bonusGarantiFait = false;    // une capsule P offerte en début de niveau
    this.bonusODonne = false;         // un drone offert vers 40 s
    this.boutons = [];                // zones cliquables des écrans (victoire, pause…)
    this.etoileJouee = [false, false, false];
    this.nouveauRecord = false;
  }

  /* — services aux entités — */
  tirEnnemi(x, y, angle, v, opts = {}){
    if (!opts.rayon){   // plafond uniquement pour les balles standard
      let nb = 0;
      for (const b of this.balles) if (!b.amie) nb++;
      if (nb > 140) return;
    }
    this.balles.push(new Balle(x, y, Math.cos(angle) * v, Math.sin(angle) * v,
      { couleur: opts.couleur, rayon: opts.rayon }));
  }
  angleVersJoueur(x, y){
    const j = this.joueur;
    if (j.etat !== 'actif') return Math.PI / 2;   // droit vers le bas
    return Math.atan2(j.y - y, j.x - x);
  }

  bossVaincu(){
    if (this.etat === 'defaite') return;   // sécurité : la partie est déjà perdue
    const b = this.boss;
    b.etat = 'mourir';
    b.minuteurMort = 2.1;
    b.explosionTimer = 0;
    const gainBoss = Math.round(b.score * this.multiplicateur());
    this.score += gainBoss;
    this.palierVie();
    this.message(b.x, b.y, '+' + gainBoss, '#ffd97a', 1.4);   // prime du boss (chaîne comprise)
    Musique.arreter();
    this.ralenti = 0.45;   // petit temps suspendu avant l'envol
    // le pilote devient intouchable et le ciel se nettoie aussitôt
    this.joueur.immunise = true;
    for (let i = this.balles.length - 1; i >= 0; i--)
      if (!this.balles[i].amie) this.balles.splice(i, 1);
  }

  demarrerEnvol(){
    this.etat = 'envol';
    this.minuteurEtat = 0;
    const j = this.joueur;
    // si le pilote était en pleine réapparition, on le remet en scène
    if (j.etat === 'respawn'){ j.etat = 'actif'; j.x = L / 2; j.y = H - 90; }
    if (j.etat === 'actif'){
      j.etat = 'envol';
      j.minuteur = 0;
    }
  }

  /* Rotation de monde en survie : transition filmée entre les deux décors */
  lancerRotationSurvie(){
    const envs = ['terre', 'ocean', 'galaxie'];
    const envSortant = this.spec.env;
    const env = envs[(envs.indexOf(envSortant) + 1) % 3];
    this.spec.env = env;
    this.spec.tourelles = env === 'terre' ? 8 : 0;
    this.decor = this.decors[env];            // l'entrant défile dès maintenant
    this.message(L / 2, 300, NOMS_ENV_LONG[env], '#5cf7e4', 1.8);
    Musique.demarrer(env);
    this.transition = {
      sortant: this.decors[envSortant],
      entrant: this.decors[env],
      t: 0, duree: 2.8,
      type:  envSortant === 'terre' ? 'versOcean'
           : envSortant === 'ocean' ? 'versEspace'
           : 'rentree',
      facteur: envSortant === 'ocean' ? 6 : envSortant === 'terre' ? 5 : 0.3,
    };
    // le souffle de la transition
    if (this.transition.type === 'versEspace')
      Son.note(180, 1.4, { type:'triangle', vol:0.06, glide:1200 });   // remontée
    else if (this.transition.type === 'rentree')
      Son.note(420, 2.0, { type:'triangle', vol:0.06, glide:70 });     // mise en orbite
    else
      Son.bruit(0.8, 0.10, 2400);                                      // traversée
  }

  /* Décor sortant, transformé, par-dessus l'entrant */
  dessinerSortant(ctx){
    const tr = this.transition;
    const p = Math.min(1, tr.t / tr.duree);
    if (tr.type === 'versOcean'){
      // TRAVERSÉE : la terre défile sous nous, glisse et s'efface
      this.dessinerDecorTrans(ctx, tr.sortant, 1 - p, 1 + 0.6 * p, 760 * p * p);
      this.dessinerTrainees(ctx, p, 0.35);
    } else {
      // PERCÉE DE SURFACE : on remonte, l'océan se précipite vers nous,
      // la vague d'écume traverse l'écran, l'éclat révèle l'espace
      const echelle = 1 + 1.9 * Math.min(1, p / 0.55);
      const dy = 520 * p * p;
      const alpha = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.3);
      this.dessinerDecorTrans(ctx, tr.sortant, alpha, echelle, dy);
      // la crête d'écume qui descend (la surface qu'on traverse)
      if (p > 0.18 && p < 0.72){
        const yB = -70 + ((p - 0.18) / 0.54) * (H + 140);
        for (const [coul, lw] of [['rgba(232,246,255,.85)', 13], ['rgba(255,255,255,.95)', 4]]){
          ctx.strokeStyle = coul;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let x = 0; x <= L; x += 22)
            ctx.lineTo(x, yB + Math.sin(x * 0.035 + tr.t * 9) * 9);
          ctx.stroke();
        }
      }
      // l'éblouissement de la surface, qui s'ouvre sur les étoiles
      const e = p < 0.2 ? 0
              : p < 0.55 ? (p - 0.2) / 0.35
              : Math.max(0, 1 - (p - 0.55) / 0.4);
      if (e > 0.02){
        ctx.fillStyle = 'rgba(223,244,255,' + (e * 0.92).toFixed(3) + ')';
        ctx.fillRect(0, 0, L, H);
      }
    }
  }

  /* APPROCHE ORBITALE : le terrain apparaît dans un disque grandissant
     cerclé d'atmosphère, pendant que les étoiles s'estompent */
  dessinerTransition(ctx){
    const tr = this.transition;
    const p = Math.min(1, tr.t / tr.duree);
    // le ciel d'étoiles s'efface doucement
    this.dessinerDecorTrans(ctx, tr.sortant, 1 - p, 1, 0);
    // la planète : le terrain visible dans un disque qui grandit
    const rr = Math.max(1, 460 * (1 - Math.pow(1 - p, 2.2)));   // freinage d'arrivée
    ctx.save();
    ctx.beginPath();
    ctx.arc(L / 2, H / 2, rr, 0, 7);
    ctx.clip();
    tr.entrant.dessiner(ctx);
    ctx.restore();
    // liseré atmosphérique
    ctx.strokeStyle = 'rgba(92,247,228,.5)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(L / 2, H / 2, rr, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,244,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(L / 2, H / 2, rr + 5, 0, 7); ctx.stroke();
  }

  /* Dessine un décor avec alpha / échelle / décalage vertical */
  dessinerDecorTrans(ctx, decor, alpha, echelle, dy){
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(L / 2, H / 2 + dy);
    ctx.scale(echelle, echelle);
    ctx.translate(-L / 2, -H / 2);
    decor.dessiner(ctx);
    ctx.restore();
  }

  /* Traînées de vitesse verticales (traversée / rentrée) */
  dessinerTrainees(ctx, p, intens){
    ctx.strokeStyle = 'rgba(255,240,220,.6)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++){
      const x = (k * 61 + 23) % L;
      const y = ((this.transition.t * 900 + k * 173) % (H + 160)) - 80;
      ctx.globalAlpha = intens * (1 - p) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x, y + 70);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  joueurElimine(){
    this.etat = 'defaite';
    this.minuteurEtat = 0;
    this.tempsVol = this.temps;   // temps de vol figé à l'instant du crash
    Musique.arreter();
    if (this.survie){
      const ancien = Progression.donnees.recordSurvie || 0;
      this.nouveauRecordSurvie = this.score > ancien;
      Progression.donnees.recordSurvie = Math.max(ancien, this.score);
      Progression.sauvegarder();
    }
  }

  passerVictoire(){
    this.minuteurEtat = 0;
    this.etoiles = this.calculerEtoiles();
    this.etoileJouee = [false, false, false];
    const ancien = Progression.donnees.record;
    this.nouveauRecord = this.score > ancien;
    Progression.donnees.record = Math.max(ancien, this.score);
    // record du secteur (sauvegardé par Progression.victoire, juste après)
    const ancienNiveau = Progression.donnees.records[this.niveau] || 0;
    this.nouveauRecordNiveau = this.score > ancienNiveau;
    Progression.donnees.records[this.niveau] = Math.max(ancienNiveau, this.score);
    Progression.victoire(this.niveau, this.etoiles);

    if (this.niveau === NB_NIVEAUX){   // ══ LE GRAND FINAL ══
      Progression.donnees.campagneTerminee = true;
      Progression.sauvegarder();
      this.etat = 'generique';
      this.lignesGen = fabriquerLignesGenerique();
      this.dureeGen = (H + 60 + (this.lignesGen.length - 1) * 38 - 170) / 80 + 1;
      this.joueur.etat = 'mort';   // il a quitté la scène : place au cinématique
      Musique.demarrer('carte');   // le thème du menu porte le générique
    } else {
      this.etat = 'victoire';
      Son.fanfare();
    }
  }

  calculerEtoiles(){
    const v = this.joueur.vies;   // 3 vies → 3★, 2 vies → 2★, sinon 1★
    return v >= 3 ? 3 : v === 2 ? 2 : 1;
  }

  basculerPause(forcer){
    if (this.etat === 'victoire' || this.etat === 'defaite' || this.etat === 'generique') return;
    this.pause = (forcer === undefined) ? !this.pause : !!forcer;
    if (this.pause) Musique.arreter();
    else Musique.demarrer(this.spec.env);
  }

  /* — fabrique de vagues : 12 patrons, anti-répétition, densité indexée — */
  fabriquerVague(){
    if (this.survie){
      this.vagueSurvie++;
      // le sac de patrons s'agrandit d'un cran par vague
      const pool = PATRONS_SURVIE[this.spec.env];
      this.spec.patrons = pool.slice(0, Math.min(pool.length, 5 + this.vagueSurvie));
    }
    const debutVague = this.ennemis.length;   // repère pour les renforts
    let patron = choix(this.spec.patrons);
    if (patron === this.dernierPatron && this.spec.patrons.length > 1)
      patron = choix(this.spec.patrons);   // on évite deux fois le même
    this.dernierPatron = patron;

    const d = this.diff;
    const accel = Math.min(2.3, 1 + d * 0.04);   // vitesses bornées…
    const vTir = Math.min(315, 135 + d * 11);    // …(la campagne, plafonnée à 289, ne change pas)
    const taux = this.spec.tauxTir;
    const drone = (x, y, comp, opts = {}) =>
      this.ennemis.push(new Ennemi('drone', x, y, comp, Object.assign(
        { peutTirer: Math.random() < taux, vitesseTir: vTir }, opts)));

    switch (patron){
      case 'ligne': {   // rangée qui descend en serpentant ensemble
        const nb = 4 + Math.min(3, (d / 3) | 0);
        const cx = alea(130, L - 130), amp = alea(26, 55), ph = alea(0, 6.28);
        for (let i = 0; i < nb; i++)
          drone(cx + (i - (nb - 1) / 2) * 52, -28, 'sinus', { amp, om: 1.4, ph, vy: 72 * accel });
        break;
      }
      case 'mur': {   // rideau droit avec un trou aléatoire
        const nb = 7 + Math.min(2, (d / 4) | 0);
        const x0 = alea(30, 90), pas = (L - 60 - x0) / (nb - 1);
        const trou = (Math.random() * nb) | 0;
        for (let i = 0; i < nb; i++){
          if (i === trou) continue;
          drone(x0 + i * pas, -28 - (i % 2) * 16, 'descente',
            { vy: 84 * accel, peutTirer: Math.random() < taux * 0.5 });
        }
        break;
      }
      case 'colonne': {   // file indienne sur un flanc
        const cote = Math.random() < 0.5 ? alea(70, 170) : alea(L - 170, L - 70);
        const nb = 3 + Math.min(2, (d / 4) | 0);
        for (let i = 0; i < nb; i++)
          drone(cote, -28 - i * 48, 'sinus', { amp: 42, om: 1.8, ph: i * 0.9, vy: 82 * accel });
        break;
      }
      case 'V': {   // formation en V derrière un meneur
        const nb = 5 + (d >= 6 ? 2 : 0);
        const cx = alea(150, L - 150);
        for (let i = 0; i < nb; i++){
          const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
          drone(cx + k * 46, -28 - Math.abs(k) * 40, 'sinus', { amp: 20, om: 1.2, ph: 0, vy: 68 * accel });
        }
        break;
      }
      case 'cercle': {   // roue qui tourne en descendant
        const nb = 7 + Math.min(3, (d / 3) | 0);
        const r = alea(80, 130);
        const vRot = alea(0.55, 0.9) * (Math.random() < 0.5 ? -1 : 1);
        for (let i = 0; i < nb; i++)
          drone(L / 2, -150, 'anneau', { a0: i * Math.PI * 2 / nb, r, vRot, vy: 55 * accel, tirCd: 1.2 });
        break;
      }
      case 'essaim': {   // nuée désordonnée
        const nb = 8 + Math.min(4, (d / 2) | 0);
        for (let i = 0; i < nb; i++)
          drone(alea(60, L - 60), -28 - alea(0, 190), 'sinus',
            { amp: alea(20, 60), om: alea(1.2, 2.2), ph: alea(0, 6.28), vy: alea(78, 98) * accel });
        break;
      }
      case 'embuscade': {   // raiders qui traversent par les côtés
        const nb = 2 + (d >= 3 ? 2 : 0);
        for (let i = 0; i < nb; i++){
          const gauche = i % 2 === 0;
          this.ennemis.push(new Ennemi('raider', gauche ? -30 : L + 30, alea(60, 190), 'traverse',
            { vx: (gauche ? 1 : -1) * alea(130, 170), tirCd: 1.4, vitesseTir: vTir + 20 }));
        }
        break;
      }
      case 'zigzags': {   // éclaireurs cyan ultra-rapides en tresse
        const nb = 2 + Math.min(2, (d / 3) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('zigzag', alea(120, L - 120), -26 - i * 70, 'sinus',
            { amp: alea(105, 150), om: alea(3.8, 4.8), ph: alea(0, 6.28), vy: 105 * accel,
              peutTirer: Math.random() < taux * 0.5, vitesseTir: vTir }));
        break;
      }
      case 'plongeons': {   // kamikazes qui piquent sur le joueur
        const nb = 2 + Math.min(3, (d / 2) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('plongeur', alea(60, L - 60), -26 - i * 64, 'plongeon',
            { yDecl: alea(110, 190), vitesseTir: vTir }));
        break;
      }
      case 'serpent': {   // hydre : une tête + sa chaîne de segments
        const tete = new Ennemi('serpentTete', alea(150, L - 150), -30, 'serpent',
          { amp: alea(120, 160), tirCd: 1, vitesseTir: vTir });
        this.ennemis.push(tete);
        let chef = tete;
        const nbSeg = 5 + Math.min(2, (d / 4) | 0);
        for (let i = 0; i < nbSeg; i++){
          const seg = new Ennemi('segment', tete.x, tete.y - (i + 1) * 22, 'suivant',
            { chef, eca: 22, index: i });
          this.ennemis.push(seg);
          chef = seg;
        }
        break;
      }
      case 'bombardier': {   // porteurs qui stationnent et lâchent des bombes
        const nb = 1 + (d >= 5 ? 1 : 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('bombardier', alea(90, L - 90), -44, 'hover',
            { yCible: alea(100, 145), stationnaire: 5.5, tirCd: 2.6, vitesseTir: vTir }));
        break;
      }
            case 'croiseurs': {   // communs : éventails disciplinés
        const nb = 2 + Math.min(1, (d / 5) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('croiseur', alea(120, L - 120), -36 - i * 80, 'sinus',
            { amp: alea(30, 55), om: 0.9, ph: i * 1.6, vy: 46 * accel, vitesseTir: vTir }));
        break;
      }
      case 'mines': {   // communs : champ de mines dérivantes
        const nb = 5 + Math.min(4, (d / 2) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('mine', alea(40, L - 40), -24 - alea(0, 260), 'sinus',
            { amp: alea(10, 30), om: alea(0.6, 1.1), ph: alea(0, 6.28), vy: alea(40, 60) }));
        break;
      }
      case 'helicos': {   // TERRE : patrouilles d'hélicos
        for (let i = 0; i < 2; i++)
          this.ennemis.push(new Ennemi('helico', alea(190, L - 190), -30 - i * 90, 'strafe',
            { yCible: alea(120, 170), stationnaire: 5 + d * 0.2, vitesseTir: vTir + 20 }));
        break;
      }
      case 'chasseurs': {   // TERRE : escadrille en rase-mottes
        const nb = 3 + Math.min(2, (d / 4) | 0);
        const gauche = Math.random() < 0.5;
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('chasseur', gauche ? -30 : L + 30, 80 + i * 66, 'traverse',
            { vx: (gauche ? 1 : -1) * alea(200, 240), tirCd: 1.2, vitesseTir: vTir + 40 }));
        break;
      }
      case 'raies': {   // OCÉAN : planeuses majestueuses
        const nb = 2 + Math.min(1, (d / 6) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('raie', alea(180, L - 180), -30 - i * 70, 'sinus',
            { amp: alea(130, 165), om: 0.55, ph: i * 2, vy: 42 * accel,
              tirCd: 1.2, vitesseTir: vTir - 15 }));
        break;
      }
      case 'meduses': {   // OCÉAN : dérive de méduses
        const nb = 3 + Math.min(3, (d / 3) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('meduse', alea(50, L - 50), -24 - alea(0, 200), 'sinus',
            { amp: alea(18, 40), om: alea(0.5, 0.9), ph: alea(0, 6.28), vy: alea(34, 50),
              tirCd: 1.4, vitesseTir: vTir + 20 }));
        break;
      }
      case 'asteroides': {   // GALAXIE : gabarits dérivants qui se scindent
        const nb = 3 + Math.min(2, (d / 4) | 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('asteroide', alea(50, L - 50), -30 - alea(0, 240), 'sinus',
            { amp: alea(20, 60), om: alea(0.4, 0.8), ph: alea(0, 6.28), vy: alea(55, 80) }));
        break;
      }
      case 'tank': {   // blindés qui stationnent et canardent
        const nb = 1 + (d >= 6 ? 1 : 0);
        for (let i = 0; i < nb; i++)
          this.ennemis.push(new Ennemi('tank', alea(90, L - 90), -40, 'hover',
            { yCible: alea(95, 165), stationnaire: 3.6 + d * 0.2,
              tirCd: Math.max(0.8, 1.5 - d * 0.06), vitesseTir: vTir }));
        break;
      }
    }
    if (this.survie){
      // RENFORTS : le volume, lui, n'a pas de plafond
      const renforts = this.ennemis.length < 46 ? Math.min(16, (this.vagueSurvie / 5) | 0) : 0;
      for (let i = 0; i < renforts; i++)
        this.ennemis.push(new Ennemi('drone', alea(40, L - 40), -30 - alea(0, 320), 'sinus',
          { amp: alea(20, 60), om: alea(1.2, 2.2), ph: alea(0, 6.28), vy: alea(78, 105) * accel,
            peutTirer: Math.random() < taux, vitesseTir: vTir }));
      // vagues profondes : ennemis plus coriaces et plus nerveux
      const kHp = 1 + Math.min(2, this.vagueSurvie * 0.012);
      const kTir = Math.max(0.55, 1 - this.vagueSurvie * 0.004);
      for (let i = debutVague; i < this.ennemis.length; i++){
        this.ennemis[i].hp = Math.ceil(this.ennemis[i].hp * kHp);
        this.ennemis[i].tirCd *= kTir;
      }
    }
  }

  /* — mise à jour générale — */
  maj(dt){
    // ralenti dramatique : le monde tourne au ralenti, mais le chrono
    // du ralenti, lui, s'écoule en temps réel
    if (this.ralenti > 0){
      this.ralenti -= dt;
      dt *= 0.4;
    }
    this.temps += dt;
    this.minuteurEtat += dt;
    this.secousse = Math.max(0, this.secousse - 26 * dt);
    // la chaîne expire si on ne détruit plus rien
    if (this.chaine > 0){
      this.tempsChaine -= dt;
      if (this.tempsChaine <= 0) this.chaine = 0;
    }
    this.decor.maj(dt);
    // transition de monde (survie) : le décor sortant accélère puis s'efface
    if (this.transition){
      this.transition.t += dt;
      this.transition.sortant.maj(dt * (1 + this.transition.facteur * (this.transition.t / this.transition.duree)));
      if (this.transition.t >= this.transition.duree) this.transition = null;
    }
    this.joueur.maj(dt, this);

    switch (this.etat){
      case 'intro':
        if (this.minuteurEtat > 2.6){ this.etat = 'vague'; this.minuteurEtat = 0; Son.go(); }
        break;

      case 'vague':
        if (this.survie){
          // rotation des mondes toutes les 45 s, avec transition filmée
          if (this.temps > this.prochaineRotation){
            this.prochaineRotation += 45;
            this.lancerRotationSurvie();
          }
          // la pression monte SANS PLAFOND : les vitesses dérivées sont bornées,
          // mais le volume, la cadence et l'endurance ennemis ne le sont jamais
          this.spec.intervalle = Math.max(1.25, 4.2 * Math.pow(0.994, this.vagueSurvie));
          this.spec.tauxTir = Math.min(1, 0.35 + this.vagueSurvie * 0.02);
          this.diff = 1 + this.vagueSurvie * 0.5;
        }
        if (this.temps < this.spec.duree){
          // une capsule P offerte vers 10 s : la montée en puissance se mérite vite
          if (!this.bonusGarantiFait && this.temps > 10){
            this.bonusGarantiFait = true;
            this.bonus.push(new Bonus(alea(80, L - 80), -30, 'P'));
          }
          this.prochaineVague -= dt;
          if (this.prochaineVague <= 0){
            this.fabriquerVague();
            this.prochaineVague = this.spec.intervalle * alea(0.85, 1.25);
          }
          if (this.spec.tourelles > 0 && this.temps > 6 && this.temps < this.spec.duree - 9 &&
              this.temps >= this.prochaineTourelle){
            const maxT = 2 + ((this.niveau / 4) | 0);
            if (this.tourelles.length < maxT){
              this.tourelles.push(new Tourelle(alea(60, L - 60)));
              this.prochaineTourelle = this.temps + this.spec.tourelles * alea(0.8, 1.35);
            } else {
              this.prochaineTourelle = this.temps + 2;
            }
          }
        } else if (this.ennemis.length === 0 || this.temps > this.spec.duree + 9){
          this.etat = 'alerte';
          this.minuteurEtat = 0;
          Son.alerte();
          Musique.tempoBoss();
        }
        break;

      case 'alerte':
        if (this.minuteurEtat > 2.2){
          this.boss = new Boss(this);
          this.etat = 'boss';
          this.minuteurEtat = 0;
        }
        break;

      case 'boss':
        if (this.boss && !this.boss.maj(dt, this)){
          this.boss = null;
          this.demarrerEnvol();
        }
        break;

      case 'envol':   // montée finale : étincelles de poussée puis victoire
        if (this.joueur.minuteur > 0.9)
          this.particules.push(new Particule(this.joueur.x + alea(-6, 6), this.joueur.y + 20,
            alea(-30, 30), alea(220, 400), 0.3, 'etincelle', { couleur:'#5cf7e4' }));
        if (this.joueur.y < -60) this.passerVictoire();
        break;
    }

    // — entités —
    for (let i = this.ennemis.length - 1; i >= 0; i--)
      if (!this.ennemis[i].maj(dt, this)) this.ennemis.splice(i, 1);
    for (let i = this.tourelles.length - 1; i >= 0; i--)
      if (!this.tourelles[i].maj(dt, this)) this.tourelles.splice(i, 1);
    for (let i = this.bonus.length - 1; i >= 0; i--)
      if (!this.bonus[i].maj(dt)) this.bonus.splice(i, 1);
    for (let i = this.balles.length - 1; i >= 0; i--)
      if (!this.balles[i].maj(dt)) this.balles.splice(i, 1);
    for (let i = this.particules.length - 1; i >= 0; i--)
      if (!this.particules[i].maj(dt)) this.particules.splice(i, 1);
    for (let i = this.messages.length - 1; i >= 0; i--){
      const m = this.messages[i];
      m.age += dt; m.y -= 30 * dt;
      if (m.age > (m.duree || 1.15)) this.messages.splice(i, 1);
    }

    this.gererCollisions();
  }

  /* — collisions — */
  gererCollisions(){
    const j = this.joueur;

    for (let i = this.balles.length - 1; i >= 0; i--){
      const b = this.balles[i];
      if (b.amie){
        let cible = null, sorte = null;
        for (const e of this.ennemis){ if (b.distanceA(e) < e.rayon + b.rayon + 2){ cible = e; sorte = 'ennemi'; break; } }
        if (!cible) for (const t of this.tourelles){ if (b.distanceA(t) < t.rayon + b.rayon + 2){ cible = t; sorte = 'tourelle'; break; } }
        if (!cible && this.boss && this.boss.etat !== 'mourir' &&
            b.distanceA(this.boss) < this.boss.rayon + b.rayon){
          cible = this.boss; sorte = 'boss';
        }
        if (cible){
          this.impact(b.x, b.y);   // étincelles d'impact
          this.balles.splice(i, 1);
          if (sorte === 'boss'){
            this.boss.toucher(1, this);
          } else {
            cible.hp--; cible.flash = 0.08;
            if (cible.hp <= 0){
              if (sorte === 'tourelle'){
                explosion(this, cible.x, cible.y - 4, 1.1);
                const gainT = cible.score * this.enregistrerKill(cible.x, cible.y);
                this.score += gainT;
                this.palierVie();
                this.message(cible.x, cible.y - 12, '+' + gainT);
                if (Math.random() < (this.survie ? 0.15 : 0.30)) this.lacherBonus(cible.x, cible.y);
                this.tourelles.splice(this.tourelles.indexOf(cible), 1);
              } else {
                this.detruireEnnemi(cible);
              }
            }
          }
        }
      } else if (j.etat === 'actif' && b.distanceA(j) < j.rayon + b.rayon){
        this.balles.splice(i, 1);
        j.toucher(this);
      }
    }

    // corps à corps + ramassage
    if (j.etat === 'actif'){
      for (let i = this.ennemis.length - 1; i >= 0; i--){
        const e = this.ennemis[i];
        if (Math.hypot(e.x - j.x, e.y - j.y) < e.rayon + j.rayon + 3){
          this.detruireEnnemi(e);
          j.toucher(this);
          break;
        }
      }
      if (this.boss && this.boss.etat !== 'mourir' &&
          Math.hypot(this.boss.x - j.x, this.boss.y - j.y) < this.boss.rayon + j.rayon){
        j.toucher(this);
      }
      for (let i = this.bonus.length - 1; i >= 0; i--){
        const b = this.bonus[i];
        if (Math.hypot(b.x - j.x, b.y - j.y) < 32){
          this.ramasserBonus(b.type);
          this.bonus.splice(i, 1);
        }
      }
    }
  }

    /* Étincelles d'impact : la balle éclabousse en traits blancs */
  impact(x, y){
    for (let k = 0; k < 3; k++){
      const a = alea(0.2, Math.PI - 0.2);   // demi-cercle bas : la balle arrive d'en dessous
      const v = alea(70, 240);
      this.particules.push(new Particule(x, y, Math.cos(a) * v, Math.sin(a) * v,
        alea(0.12, 0.26), 'etincelle', { couleur: '#eafffb' }));
    }
  }

  /* Texte flottant (scores, bonus) — file plafonnée à 8 pour rester lisible */
  message(x, y, texte, couleur = '#ffd97a', duree = 0.7){
    this.messages.push({ x: borne(x, 46, L - 46), y, texte, age: 0, couleur, duree });
    if (this.messages.length > 8) this.messages.shift();
  }

    /* Multiplicateur courant : un palier tous les 4 points, plafonné à ×8 */
  multiplicateur(){
    return Math.min(8, 1 + ((this.chaine / 4) | 0));
  }

  /* Un point de chaîne par destruction ; annonce les paliers */
  enregistrerKill(x, y){
    const avant = this.multiplicateur();
    this.chaine++;
    this.tempsChaine = 2;
    const m = this.multiplicateur();
    if (m > this.multiMax) this.multiMax = m;
    if (m > avant && m >= 2){
      this.message(x, y - 30, 'CHAÎNE ×' + m + ' !', '#ffe94a', 0.9);
      Son.note(330 * m, 0.12, { type: 'square', vol: 0.05 });   // ding montant
    }
    return m;
  }

  detruireEnnemi(e){
    e.mort = true;   // les segments d'hydre le lisent pour se libérer
    explosion(this, e.x, e.y, (e.type === 'tank' || e.type === 'bombardier') ? 2.2 : 1);
    const gain = e.score * this.enregistrerKill(e.x, e.y);
    this.score += gain;
    this.palierVie();
    this.message(e.x, e.y - 8, '+' + gain);      // score flottant, chaîne comprise
    // la mine détruite libère une couronne de tirs
    if (e.type === 'mine')
      for (let k = 0; k < 8; k++)
        this.tirEnnemi(e.x + Math.cos(k * Math.PI / 4) * 20, e.y + Math.sin(k * Math.PI / 4) * 20,
                       k * Math.PI / 4, 170);
    // l'astéroïde se scinde en deux fragments (drones cachés dedans)
    if (e.type === 'asteroide')
      for (const s of [-1, 1])
        this.ennemis.push(new Ennemi('drone', e.x + s * 14, e.y, 'descente',
          { vx: s * 90, vy: 130, peutTirer: false, ph: alea(0, 6.28), amp: 14, om: 3 }));
    const proba = { drone:0.10, raider:0.22, zigzag:0.12, plongeur:0.15, croiseur:0.35,
                    mine:0.10, bombardier:0.8, tank:0.7, serpentTete:0.6, segment:0.04,
                    helico:0.45, chasseur:0.12, raie:0.4, meduse:0.3, asteroide:0.15 }[e.type] || 0;
    if (Math.random() < (this.survie ? proba * 0.45 : proba)) this.lacherBonus(e.x, e.y);
    const i = this.ennemis.indexOf(e);
    if (i >= 0) this.ennemis.splice(i, 1);
  }

  lacherBonus(x, y){
    const r = Math.random();
    const type = r < 0.35 ? 'P' : r < 0.55 ? 'E' : r < 0.78 ? 'S' : r < 0.90 ? 'O' : 'V';
    this.bonus.push(new Bonus(x, y, type));
  }

  ramasserBonus(type){
    const j = this.joueur;
    let libelle = '';
    switch (type){
      case 'P':
        if (j.arme < 3){ j.arme++; libelle = ['DOUBLE TIR', 'TIR TRIPLE', 'TIR MAXIMAL'][j.arme - 1]; }
        else { this.score += 800; this.palierVie(); libelle = '+800'; }
        break;
      case 'E': j.bouclier = 8; libelle = 'BOUCLIER !'; break;
      case 'S': this.score += 1500; this.palierVie(); libelle = '+1500'; break;
      case 'O':
        if (j.drones.length < 2){
          j.drones.push(new DroneEscorte(j.drones.length === 0 ? -1 : 1));   // un de chaque côté
          libelle = j.drones.length === 1 ? "VAISSEAU D'ESCORTE" : 'FORMATION COMPLÈTE';
        } else { this.score += 800; this.palierVie(); libelle = '+800'; }
        break;
      case 'V':
        if (j.vies < 6){ j.vies++; libelle = 'VIE +1'; }
        else { this.score += 2000; this.palierVie(); libelle = '+2000'; }
        break;
    }
    this.messages.push({ x: j.x, y: j.y - 34, texte: libelle, age: 0 });
    Son.bonus();
  }

  palierVie(){
    while (this.score >= this.prochainPalierVie){
      this.prochainPalierVie += this.survie ? 60000 : 25000;
      if (this.joueur.vies < 6){
        this.joueur.vies++;
        this.messages.push({ x: this.joueur.x, y: this.joueur.y - 34, texte: 'VIE BONUS !', age: 0 });
        Son.bonus();
      }
    }
  }

  /* — rendu — */
  dessiner(ctx){
    this.boutons.length = 0;
    ctx.save();
    if (this.secousse > 0.3)
      ctx.translate((Math.random() - 0.5) * this.secousse, (Math.random() - 0.5) * this.secousse);

    if (this.transition && this.transition.type === 'rentree'){
      this.dessinerTransition(ctx);   // rentrée : les deux mondes dans l'ordre inverse
    } else {
      this.decor.dessiner(ctx);
      if (this.transition) this.dessinerSortant(ctx);
    }
    for (const t of this.tourelles) t.dessiner(ctx, this);
    for (const b of this.bonus) b.dessiner(ctx);
    for (const e of this.ennemis) e.dessiner(ctx);
    if (this.boss) this.boss.dessiner(ctx, this);
    for (const b of this.balles) b.dessiner(ctx);
    this.joueur.dessiner(ctx);
    for (const p of this.particules) p.dessiner(ctx);
    for (const m of this.messages){
      ctx.globalAlpha = Math.max(0, 1 - m.age / (m.duree || 1.15));
      texte(ctx, m.texte, m.x, m.y, 20, m.couleur || '#5cf7e4', 'center', '"VT323"');
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.dessinerHUD(ctx);
    if (this.etat === 'intro') this.dessinerIntro(ctx);
    else if (this.etat === 'alerte') this.dessinerAlerte(ctx);
    else if (this.etat === 'victoire') this.dessinerVictoire(ctx);
    else if (this.etat === 'generique') this.dessinerGenerique(ctx);
    else if (this.etat === 'defaite') this.dessinerDefaite(ctx);
    if (this.pause) this.dessinerPause(ctx);
  }

  dessinerHUD(ctx){
    const j = this.joueur;
    for (let i = 0; i < Math.min(j.vies, 8); i++)
      ctx.drawImage(SPRITES.joueur, 8 + i * 27, 8, 24, 22);
    texte(ctx, String(this.score).padStart(7, '0'), L - 8, 12, 14, '#e8eefc', 'right');
    if (this.survie)
      texte(ctx, 'VAGUE ' + this.vagueSurvie, L - 8, 34, 10, '#ffd97a', 'right');

    // jauges arme / bouclier
    for (let i = 0; i < j.arme; i++){ ctx.fillStyle = '#ffb020'; ctx.fillRect(8 + i * 13, 36, 9, 5); }
    if (j.bouclier > 0){
      ctx.fillStyle = '#123f3a'; ctx.fillRect(8, 46, 82, 5);
      ctx.fillStyle = (j.bouclier < 2 && (this.temps * 6 | 0) % 2 === 0) ? '#ffffff' : '#5cf7e4';
      ctx.fillRect(8, 46, 82 * Math.min(1, j.bouclier / 8), 5);
    }

        // la chaîne : multiplicateur + jauge du temps restant (haut-centre)
    if (this.chaine > 0){
      const m = this.multiplicateur();
      const coul = m >= 2 ? '#ffd97a' : '#8fa0c0';
      texte(ctx, 'CHAÎNE ×' + m, L / 2, 6, 10, coul, 'center');
      ctx.fillStyle = 'rgba(143,160,192,.30)';
      ctx.fillRect(L / 2 - 28, 19, 56, 3);
      ctx.fillStyle = coul;
      ctx.fillRect(L / 2 - 28, 19, 56 * Math.max(0, this.tempsChaine / 2), 3);
    }

    // barre de vie du boss
    if (this.boss && this.boss.etat !== 'mourir'){
      const bw = 330, bx = (L - bw) / 2, by = 34;
      texte(ctx, this.boss.nom, L / 2, 22, 9, '#ffb0a6', 'center');
      ctx.fillStyle = '#141c2c'; ctx.fillRect(bx - 2, by - 2, bw + 4, 13);
      const ratio = Math.max(0, this.boss.hp / this.boss.hpMax);
      ctx.fillStyle = '#c22f35'; ctx.fillRect(bx, by, bw * ratio, 9);
      ctx.fillStyle = 'rgba(255,255,255,.30)'; ctx.fillRect(bx, by, bw * ratio, 3);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      for (let k = 1; k < 10; k++) ctx.fillRect((bx + bw * k / 10) | 0, by, 1, 9);
    }
  }

  dessinerIntro(ctx){
    const t = this.minuteurEtat;
    const a = t < 0.35 ? t / 0.35 : t > 2.25 ? Math.max(0, (2.6 - t) / 0.35) : 1;
    ctx.fillStyle = 'rgba(4,8,16,' + (a * 0.55).toFixed(3) + ')';
    ctx.fillRect(0, 250, L, 175);
    ctx.globalAlpha = a;
    texte(ctx, this.survie ? 'MODE SURVIE' : 'NIVEAU ' + this.niveau, L / 2, 278, 21, '#ffb020', 'center');
    texte(ctx, this.survie ? 'VAGUES SANS FIN' : this.spec.secteur, L / 2, 318, 15, '#e8eefc', 'center');
    texte(ctx, NOMS_ENV_LONG[this.spec.env], L / 2, 350, 11, '#8fa0c0', 'center');
    texte(ctx, 'PRÊT ?', L / 2, 386, 12, '#5cf7e4', 'center');
    ctx.globalAlpha = 1;
  }

  dessinerAlerte(ctx){
    if (Math.sin(this.minuteurEtat * 14) < -0.3) return;   // clignotement
    ctx.fillStyle = 'rgba(60,4,8,.35)';
    ctx.fillRect(0, H / 2 - 110, L, 190);
    texte(ctx, '!!  ALERTE  !!', L / 2, H / 2 - 84, 26, '#ff5040', 'center');
    texte(ctx, nomBoss(this.spec.env, this.niveau), L / 2, H / 2 - 22, 13, '#ffb0a6', 'center');
    texte(ctx, 'APPAREILLE', L / 2, H / 2 + 8, 10, '#8fa0c0', 'center');
  }

  dessinerVictoire(ctx){
    const t = this.minuteurEtat;
    ctx.fillStyle = 'rgba(4,8,16,.80)';
    ctx.fillRect(0, 0, L, H);
    texte(ctx, 'SECTEUR NETTOYÉ !', L / 2, 178, 20, '#ffb020', 'center');
    texte(ctx, this.spec.secteur, L / 2, 214, 14, '#e8eefc', 'center');

    // les étoiles apparaissent une à une, avec un "pop"
    for (let i = 0; i < 3; i++){
      const tApp = 0.9 + i * 0.5;
      const gagnee = i < this.etoiles;
      let spr = SPRITES.etoileGris, taille = 40;
      if (gagnee && t > tApp){
        spr = SPRITES.etoileOr;
        const p = Math.min(1, (t - tApp) * 3.5);
        taille = 40 + 26 * (1 - p);
        if (!this.etoileJouee[i]){ this.etoileJouee[i] = true; Son.etoile(i); }
      }
      const x = L / 2 + (i - 1) * 62, y = 288;
      ctx.drawImage(spr, x - taille / 2, y - taille / 2, taille, taille);
    }

    texte(ctx, 'SCORE FINAL', L / 2, 330, 10, '#8fa0c0', 'center');
    texte(ctx, String(this.score).padStart(7, '0'), L / 2, 344, 18, '#e8eefc', 'center');
    if (this.multiMax > 1)
      texte(ctx, 'CHAÎNE MAX ×' + this.multiMax, L / 2, 370, 10, '#ffd97a', 'center');
    texte(ctx, 'RECORD DU SECTEUR', L / 2, 392, 9, '#8fa0c0', 'center');
    texte(ctx, String(Progression.donnees.records[this.niveau] || 0).padStart(7, '0'),
          L / 2, 404, 13, '#ffd97a', 'center');
    if (this.nouveauRecordNiveau && (t * 2 | 0) % 2 === 0)
      texte(ctx, 'RECORD BATTU !', L / 2, 428, 11, '#ffe94a', 'center');

    const bw = 185, bh = 46, esp = 22;
    const bx = (L - bw * 2 - esp) / 2, by = H - 150;
    this.dessinerBouton(ctx, bx, by, bw, bh, 'REJOUER', 'rejouer');
    this.dessinerBouton(ctx, bx + bw + esp, by, bw, bh, 'CARTE', 'carte');
    texte(ctx, 'R : rejouer · C : carte', L / 2, H - 78, 10, '#5c688a', 'center');
  }

    /* Le générique de fin de campagne */
  dessinerGenerique(ctx){
    const t = this.minuteurEtat;
    const termine = t > this.dureeGen;
    ctx.fillStyle = 'rgba(4,7,14,.80)';
    ctx.fillRect(0, 0, L, H);

    if (!termine){
      // les lignes défilent de bas en haut, avec fondu aux bords
      this.lignesGen.forEach((l, i) => {
        const y = H + 60 + i * 38 - t * 80;
        if (y < -30 || y > H + 40) return;
        const fondu = Math.min(1, (H + 20 - y) / 70, (y + 30) / 70);
        if (fondu <= 0) return;
        ctx.globalAlpha = fondu;
        texte(ctx, l.s, L / 2, y, l.t, l.c, 'center', l.f);
        ctx.globalAlpha = 1;
      });
      texte(ctx, 'ESPACE · TOUCHER : PASSER', L / 2, H - 38, 10, '#5c688a', 'center');
      // toute la surface sert à passer (le clic comme le toucher la déclenchent)
      this.boutons.push({ x: 0, y: 0, w: L, h: H, action: 'passer' });
    } else {
      texte(ctx, 'MERCI PILOTE', L / 2, H / 2 - 96, 20, '#ffb020', 'center');
      texte(ctx, 'ÉTOILES ' + Progression.totalEtoiles() + '/' + (NB_NIVEAUX * 3),
            L / 2, H / 2 - 34, 24, '#ffd97a', 'center', '"VT323"');
      texte(ctx, 'RECORD ' + String(Progression.donnees.record).padStart(7, '0'),
            L / 2, H / 2, 24, '#ffd97a', 'center', '"VT323"');
      const bw = 240, bh = 46;
      this.dessinerBouton(ctx, (L - bw) / 2, H - 150, bw, bh, 'RETOUR À LA CARTE', 'carte');
      texte(ctx, 'C : carte', L / 2, H - 78, 10, '#5c688a', 'center');
    }
    // l'escadre file vers l'horizon, par-dessus le générique
    this.dessinerEscadreFin(ctx, t);
  }

  /* L'escadre en croisière (les ailiers réels du joueur, s'il en a) */
  dessinerEscadreFin(ctx, t){
    const x = L / 2 + Math.sin(t * 0.55) * 18;
    const y = 118 + Math.sin(t * 1.4) * 5;
    const g = Math.cos(t * 0.55) * 0.35;   // gîte de croisière
    const cotes = [-36, 36];
    this.joueur.drones.forEach((d, k) => {
      const ex = x + cotes[k], ey = y + 4 + Math.sin(t * 3 + cotes[k]) * 3;
      const f = 4 + Math.sin(performance.now() * 0.05 + cotes[k]) * 2;
      ctx.fillStyle = '#c96e0e';
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey + 11); ctx.lineTo(ex + 3, ey + 11);
      ctx.lineTo(ex, ey + 14 + f); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe94a';
      ctx.beginPath();
      ctx.moveTo(ex - 1.5, ey + 11); ctx.lineTo(ex + 1.5, ey + 11);
      ctx.lineTo(ex, ey + 12 + f * 0.55); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1 - 0.28 * Math.abs(g), 1);
      ctx.rotate(g * 0.10);
      ctx.drawImage(SPRITES.escorte, -SPRITES.escorte.width / 2, -SPRITES.escorte.height / 2);
      ctx.restore();
    });
    // le leader, flamme puis coque
    const f = 6 + Math.sin(performance.now() * 0.045) * 2.5;
    ctx.fillStyle = '#c96e0e';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 15); ctx.lineTo(x + 5, y + 15);
    ctx.lineTo(x, y + 18 + f); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe94a';
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y + 15); ctx.lineTo(x + 2.5, y + 15);
    ctx.lineTo(x, y + 16 + f * 0.55); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 - 0.28 * Math.abs(g), 1);
    ctx.rotate(g * 0.10);
    ctx.drawImage(SPRITES.joueur, -SPRITES.joueur.width / 2, -SPRITES.joueur.height / 2);
    ctx.restore();
  }

  dessinerDefaite(ctx){
    const t = this.minuteurEtat;
    const a = Math.min(1, Math.max(0, (t - 0.7) / 0.6));   // laisse l'explosion respirer
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(24,4,10,.82)';
    ctx.fillRect(0, 0, L, H);
    if (this.survie){
      // ══ TABLEAU DE VOL ══
      texte(ctx, 'PARTIE TERMINÉE', L / 2, 168, 20, '#ff5040', 'center');
      const mins = (this.tempsVol / 60) | 0, secs = (this.tempsVol % 60) | 0;
      texte(ctx, 'VAGUES SURVÉCUES', L / 2, 222, 9, '#8fa0c0', 'center');
      texte(ctx, String(this.vagueSurvie), L / 2, 236, 24, '#e8eefc', 'center');
      texte(ctx, 'TEMPS DE VOL', L / 2, 276, 9, '#8fa0c0', 'center');
      texte(ctx, mins + ':' + String(secs).padStart(2, '0'), L / 2, 290, 24, '#e8eefc', 'center');
      texte(ctx, 'SCORE', L / 2, 330, 9, '#8fa0c0', 'center');
      texte(ctx, String(this.score).padStart(7, '0'), L / 2, 344, 24, '#e8eefc', 'center');
      if (this.multiMax > 1)
        texte(ctx, 'CHAÎNE MAX ×' + this.multiMax, L / 2, 382, 10, '#ffd97a', 'center');
      texte(ctx, 'RECORD SURVIE  ' + String(Progression.donnees.recordSurvie || 0).padStart(7, '0'),
            L / 2, 406, 11, '#ffd97a', 'center');
      if (this.nouveauRecordSurvie && (t * 2 | 0) % 2 === 0)
        texte(ctx, 'RECORD BATTU !', L / 2, 432, 11, '#ffe94a', 'center');
    } else {
      texte(ctx, 'VAISSEAU DÉTRUIT', L / 2, 235, 20, '#ff5040', 'center');
      texte(ctx, 'GAME OVER', L / 2, 275, 14, '#8fa0c0', 'center');
      texte(ctx, 'SCORE  ' + String(this.score).padStart(7, '0'), L / 2, 330, 14, '#e8eefc', 'center');
    }
    const bw = 185, bh = 46, esp = 22;
    const bx = (L - bw * 2 - esp) / 2, by = H - 150;
    this.dessinerBouton(ctx, bx, by, bw, bh, 'REJOUER', 'rejouer');
    if (this.survie)
      this.dessinerBouton(ctx, bx + bw + esp, by, bw, bh, 'ACCUEIL', 'accueil');
    else
      this.dessinerBouton(ctx, bx + bw + esp, by, bw, bh, 'CARTE', 'carte');
    texte(ctx, this.survie ? 'R : rejouer · C : accueil' : 'R : rejouer · C : carte',
          L / 2, H - 78, 10, '#5c688a', 'center');
    ctx.globalAlpha = 1;
  }

  dessinerPause(ctx){
    ctx.fillStyle = 'rgba(4,8,16,.66)';
    ctx.fillRect(0, 0, L, H);
    texte(ctx, 'PAUSE', L / 2, 270, 24, '#e8eefc', 'center');
    const bw = 185, bh = 46, esp = 22;
    const bx = (L - bw * 2 - esp) / 2, by = 350;
    this.dessinerBouton(ctx, bx, by, bw, bh, 'REPRENDRE', 'reprendre');
    this.dessinerBouton(ctx, bx + bw + esp, by, bw, bh, 'QUITTER', 'quitter');
  }

  dessinerBouton(ctx, x, y, w, h, libelle, action){
    ctx.fillStyle = '#11162a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    texte(ctx, libelle, x + w / 2, y + h / 2 - 6, 12, '#ffb020', 'center');
    this.boutons.push({ x, y, w, h, action });
  }
}

/* ════════ 9. ACCUEIL ANIMÉ, CARTE & ENTRÉES ════════ */

const application = {
  jeu: null,
  ctx: null,
  dernierT: performance.now(),
  ecran: 'accueil',
};

/* ————— L'accueil : titre lettre à lettre + vaisseau en orbite ————— */

const LA = 540, HA = 560;   // dimensions logiques du canvas d'accueil
const canvasAccueil = document.getElementById('canvas-accueil');
const ctxA = canvasAccueil.getContext('2d');
ctxA.imageSmoothingEnabled = false;

const accueil = {
  t: 0,
  etoiles: [],       // champ d'étoiles qui dérive
  trainee: [],       // traînée du vaisseau
  comete: null,      // étoile filante
  prochainComete: 2.5,
};

function positionVaisseauAccueil(){
  const a = accueil.t * 0.75;               // angle sur l'ellipse
  const cx = LA / 2, cy = 185;              // centre = le titre
  const rx = 195, ry = 78;
  const x = cx + Math.cos(a) * rx;
  const y = cy + Math.sin(a) * ry;
  const vx = -Math.sin(a), vy = Math.cos(a);
  const rot = Math.atan2(vx, -vy);          // le nez suit la trajectoire
  const profondeur = Math.sin(a);           // > 0 : devant le titre
  const echelle = 0.75 + 0.45 * (profondeur + 1) / 2;
  return { x, y, rot, profondeur, echelle };
}

function majAccueil(dt){
  for (const e of accueil.etoiles){
    e.y += e.v * dt;
    if (e.y > HA){ e.y = -3; e.x = Math.random() * LA; }
  }
  if (!accueil.comete && accueil.t > accueil.prochainComete){
    accueil.comete = { x: alea(100, LA - 40), y: alea(20, 160), vx: -190, vy: 260, age: 0 };
  }
  if (accueil.comete){
    const co = accueil.comete;
    co.x += co.vx * dt; co.y += co.vy * dt; co.age += dt;
    if (co.age > 0.8 || co.y > HA){
      accueil.comete = null;
      accueil.prochainComete = accueil.t + alea(2.5, 6);
    }
  }
  // traînée de moteur
  const p = positionVaisseauAccueil();
  accueil.trainee.push({ x: p.x, y: p.y, age: 0 });
  for (let i = accueil.trainee.length - 1; i >= 0; i--){
    accueil.trainee[i].age += dt;
    if (accueil.trainee[i].age > 0.5) accueil.trainee.splice(i, 1);
  }
}

function dessinerVaisseauAccueil(v, alpha){
  ctxA.save();
  ctxA.globalAlpha = alpha;
  ctxA.translate(v.x, v.y);
  ctxA.rotate(v.rot);
  ctxA.scale(v.echelle, v.echelle);
  const f = 5 + Math.sin(performance.now() * 0.045) * 2.5;
  ctxA.fillStyle = '#c96e0e';
  ctxA.beginPath();
  ctxA.moveTo(-5, 15); ctxA.lineTo(5, 15); ctxA.lineTo(0, 18 + f);
  ctxA.closePath(); ctxA.fill();
  ctxA.fillStyle = '#ffe94a';
  ctxA.beginPath();
  ctxA.moveTo(-2.5, 15); ctxA.lineTo(2.5, 15); ctxA.lineTo(0, 16 + f * 0.55);
  ctxA.closePath(); ctxA.fill();
  ctxA.drawImage(SPRITES.joueur, -18, -16.5);
  ctxA.restore();
}

function dessinerAccueil(){
  const t = accueil.t;
  ctxA.fillStyle = '#070a12';
  ctxA.fillRect(0, 0, LA, HA);

  // champ d'étoiles
  for (const e of accueil.etoiles){
    ctxA.fillStyle = e.t > 2.4 ? '#ffffff' : e.t > 1.4 ? '#8fa0c0' : '#4a5f88';
    ctxA.fillRect(e.x, e.y, e.t, e.t);
  }
  // étoile filante
  if (accueil.comete){
    const co = accueil.comete, a = Math.max(0, 1 - co.age / 0.8);
    ctxA.strokeStyle = 'rgba(220,240,255,' + (a * 0.8).toFixed(2) + ')';
    ctxA.lineWidth = 2;
    ctxA.beginPath();
    ctxA.moveTo(co.x, co.y);
    ctxA.lineTo(co.x - co.vx * 0.12, co.y - co.vy * 0.12);
    ctxA.stroke();
  }

  const v = positionVaisseauAccueil();
  const fonduVaisseau = Math.min(1, t * 1.5);

  // traînée + vaisseau DERrière le titre (haut de l'ellipse)
  if (v.profondeur <= 0){
    dessinerTraineeAccueil();
    dessinerVaisseauAccueil(v, 0.8 * fonduVaisseau);
  }

  // ————— le titre, lettre par lettre —————
  const mot = "AILE D'ACIER";
  ctxA.font = '34px "Press Start 2P","VT323",monospace';
  ctxA.textAlign = 'left';
  ctxA.textBaseline = 'top';
  const largeurs = [...mot].map(ch => ctxA.measureText(ch).width);
  const total = largeurs.reduce((a, b) => a + b, 0);
  let lx = (LA - total) / 2;
  for (let i = 0; i < mot.length; i++){
    const e = Math.min(1, Math.max(0, (t - 0.2 - i * 0.07) / 0.5));
    if (e > 0){
      const ease = 1 - Math.pow(1 - e, 3);
      ctxA.globalAlpha = ease;
      const y = 168 - 60 * (1 - ease);   // les lettres tombent en place
      ctxA.fillStyle = '#7a3c00'; ctxA.fillText(mot[i], lx + 3, y + 3);
      ctxA.fillStyle = '#ffb020'; ctxA.fillText(mot[i], lx, y);
      ctxA.globalAlpha = 1;
    }
    lx += largeurs[i];
  }

  // sous-titre + encadrés ambre
  if (t > 1.1){
    const a = Math.min(1, (t - 1.1) / 0.6);
    ctxA.globalAlpha = a;
    texte(ctxA, "SHOOT'EM UP RÉTRO", LA / 2, 300, 26, '#8fa0c0', 'center', '"VT323"');
    ctxA.fillStyle = '#ffb020';
    ctxA.fillRect(LA / 2 - 200, 309, 70, 2);
    ctxA.fillRect(LA / 2 + 130, 309, 70, 2);
    ctxA.globalAlpha = 1;
  }

  // traînée + vaisseau DEVANT le titre (bas de l'ellipse)
  if (v.profondeur > 0){
    dessinerTraineeAccueil();
    dessinerVaisseauAccueil(v, fonduVaisseau);
  }

  // panneau bas : progression du pilote
  if (t > 1.5){
    const a = Math.min(1, (t - 1.5) / 0.6);
    ctxA.globalAlpha = a;
    // badge de campagne terminée
    if (Progression.donnees.campagneTerminee){
      const bx = LA / 2 - 150, by = 428;
      ctxA.fillStyle = '#11162a';
      ctxA.fillRect(bx, by, 300, 36);
      ctxA.strokeStyle = '#ffb020';
      ctxA.lineWidth = 2;
      ctxA.strokeRect(bx + 1, by + 1, 298, 34);
      ctxA.drawImage(SPRITES.etoileOr, bx - 34, by + 7, 22, 22);
      ctxA.drawImage(SPRITES.etoileOr, bx + 312, by + 7, 22, 22);
      texte(ctxA, 'CAMPAGNE TERMINÉE', LA / 2, by + 13, 10, '#ffb020', 'center');
    }
    ctxA.drawImage(SPRITES.etoileOr, LA / 2 - 176, 486, 24, 24);
    texte(ctxA, Progression.totalEtoiles() + '/' + (NB_NIVEAUX * 3) + ' ÉTOILES',
      LA / 2 - 144, 490, 22, '#e8ddc0', 'left', '"VT323"');
    texte(ctxA, 'CAMPAGNE ' + String(Progression.donnees.record || 0).padStart(7, '0'),
      LA / 2 + 36, 483, 20, '#7f8db0', 'left', '"VT323"');
    texte(ctxA, 'SURVIE   ' + String(Progression.donnees.recordSurvie || 0).padStart(7, '0'),
      LA / 2 + 36, 507, 20, '#5cf7e4', 'left', '"VT323"');
    ctxA.globalAlpha = 1;
  }
}

function dessinerTraineeAccueil(){
  for (const tr of accueil.trainee){
    const k = 1 - tr.age / 0.5;
    ctxA.globalAlpha = 0.45 * k;
    ctxA.fillStyle = '#ffb020';
    ctxA.beginPath(); ctxA.arc(tr.x, tr.y, 4.5 * k, 0, 7); ctxA.fill();
  }
  ctxA.globalAlpha = 1;
}

/* Chemin serpentin généré pour les 30 niveaux */
const PAS_CARTE = 66;
const HAUTEUR_CARTE = NB_NIVEAUX * PAS_CARTE + 100;

function pointsCarte(){
  const pts = [];
  for (let i = 0; i < NB_NIVEAUX; i++)
    pts.push([215 + Math.sin(i * 0.55 + 0.3) * 118, HAUTEUR_CARTE - 60 - i * PAS_CARTE]);
  return pts;
}

const SVG_CADENAS = '<svg class="cadenas" viewBox="0 0 24 24"><path fill="currentColor" d="M17 10V7a5 5 0 0 0-10 0v3H5v11h14V10h-2zM9 7a3 3 0 0 1 6 0v3H9V7z"/></svg>';
const SVG_ETOILE_NOEUD = '<svg class="etoile" viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';

/* Trace un chemin en courbes S passant par les points donnés */
function cheminSVG(points){
  let d = 'M ' + points[0][0] + ' ' + points[0][1];
  for (let i = 1; i < points.length; i++){
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    if (Math.abs(x1 - x0) > Math.abs(y1 - y0)){   // segment surtout horizontal
      const mx = (x0 + x1) / 2;
      d += ' C ' + mx + ' ' + y0 + ', ' + mx + ' ' + y1 + ', ' + x1 + ' ' + y1;
    } else {                                       // segment surtout vertical
      const my = (y0 + y1) / 2;
      d += ' C ' + x0 + ' ' + my + ', ' + x1 + ' ' + my + ', ' + x1 + ' ' + y1;
    }
  }
  return d;
}

function dessinerFondCarte(){
  const cv = document.getElementById('fond-carte');
  const r = cv.parentElement.getBoundingClientRect();
  if (r.width < 5) return;   // écran caché : on repeindra à l'affichage
  cv.width = r.width | 0;
  cv.height = r.height | 0;
  const c = cv.getContext('2d');
  c.fillStyle = '#0c1220';
  c.fillRect(0, 0, cv.width, cv.height);
  const rng = mulberry32(4242);
  // voiles stellaires discrets, aux trois couleurs des mondes
  for (const rgb of ['63,143,79', '62,154,208', '154,111,216']){
    const x = rng() * cv.width, y = rng() * cv.height, ray = cv.width * (0.55 + rng() * 0.5);
    const g = c.createRadialGradient(x, y, 0, x, y, ray);
    g.addColorStop(0, 'rgba(' + rgb + ',.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, ray, 0, 7); c.fill();
  }
  for (let i = 0; i < 130; i++){
    const t = 1 + rng() * 2.2;
    c.fillStyle = rng() < 0.7 ? '#c9d6ea' : rng() < 0.5 ? '#8fa0c0' : '#ffd9a8';
    c.globalAlpha = 0.3 + rng() * 0.7;
    c.fillRect(rng() * cv.width, rng() * cv.height, t, t);
  }
  c.globalAlpha = 1;
}

function construireCarte(){
  const defile = document.getElementById('defilement-carte');
  const contenu = document.getElementById('contenu-carte');
  const svg = document.getElementById('trace');
  contenu.querySelectorAll('.noeud').forEach(n => n.remove());
  svg.innerHTML = '';

  const points = pointsCarte();
  // le contenu garde exactement les proportions du viewBox, à toute largeur
  contenu.style.aspectRatio = '430 / ' + HAUTEUR_CARTE;
  svg.setAttribute('viewBox', '0 0 430 ' + HAUTEUR_CARTE);
  svg.setAttribute('preserveAspectRatio', 'none');

  const NS = 'http://www.w3.org/2000/svg';
  const tracer = (d, classe) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', classe);
    svg.appendChild(p);
  };
  tracer(cheminSVG(points), 'trace-base');
  const debloque = Progression.donnees.debloque;
  if (debloque > 1) tracer(cheminSVG(points.slice(0, debloque)), 'trace-progression');

  points.forEach((pt, i) => {
    const n = i + 1;
    const verrouille = n > debloque;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'noeud';
    el.style.left = (pt[0] / 430 * 100) + '%';
    el.style.top = (pt[1] / HAUTEUR_CARTE * 100) + '%';
    el.style.setProperty('--couleur-env', COULEURS_ENV[NIVEAUX[i].env]);
    if (verrouille) el.classList.add('verrouille');
    if (Progression.donnees.etoiles[n]) el.classList.add('complet');
    if (n === debloque && !Progression.donnees.etoiles[n]) el.classList.add('courant');
    el.title = 'Niveau ' + n + ' — ' + NIVEAUX[i].secteur;

    let contenuNoeud = '<span class="numero">' + n + '</span>';
    if (verrouille){
      contenuNoeud += SVG_CADENAS;
    } else {
      const gagnees = Progression.donnees.etoiles[n] || 0;
      contenuNoeud += '<span class="etoiles-noeud">' + [0, 1, 2].map(k =>
        SVG_ETOILE_NOEUD.replace('class="etoile"', 'class="etoile' + (k < gagnees ? ' gagnee' : '') + '"')
      ).join('') + '</span>';
    }
    el.innerHTML = contenuNoeud;

    el.addEventListener('click', () => ouvrirPanneauNiveau(n));
    contenu.appendChild(el);
  });

    // le panneau d'information, créé une seule fois
  if (!document.getElementById('panneau-niveau')){
    const carte = document.getElementById('carte-monde');
    const volet = document.createElement('div');
    volet.id = 'volet-niveau';
    volet.addEventListener('click', fermerPanneauNiveau);
    const panneau = document.createElement('div');
    panneau.id = 'panneau-niveau';
    carte.appendChild(volet);
    carte.appendChild(panneau);
  }

  document.getElementById('stat-etoiles').textContent = Progression.totalEtoiles() + '/' + (NB_NIVEAUX * 3);
  document.getElementById('stat-record').textContent = Progression.donnees.record;
  dessinerFondCarte();

  // on amène le niveau courant au centre de la fenêtre
  const courant = Math.min(debloque, NB_NIVEAUX) - 1;
  const yCible = points[Math.max(0, courant)][1];
  requestAnimationFrame(() => {
    defile.scrollTop = Math.max(0, (yCible / HAUTEUR_CARTE) * defile.scrollHeight
                                   - defile.clientHeight * 0.45);
  });
}

/* ————— La fiche de secteur (clic sur un nœud) ————— */

function fermerPanneauNiveau(){
  document.getElementById('panneau-niveau').classList.remove('ouvert');
  document.getElementById('volet-niveau').style.display = 'none';
}

function ouvrirPanneauNiveau(n){
  const spec = NIVEAUX[n - 1];
  const d = Progression.donnees;
  const verrouille = n > d.debloque;
  const etoiles = d.etoiles[n] || 0;
  const record = d.records[n] || 0;
  const envCourt = { terre:'TERRE', ocean:'OCÉAN', galaxie:'GALAXIE' }[spec.env];
  const panneau = document.getElementById('panneau-niveau');
  panneau.innerHTML =
    '<p class="p-num">NIVEAU ' + n + '</p>' +
    '<p class="p-secteur">' + spec.secteur + '</p>' +
    '<p class="p-env"><i class="pastille" style="background:' + COULEURS_ENV[spec.env] + '"></i>' +
      envCourt + ' · ' + nomBoss(spec.env, n) + '</p>' +
    '<div class="p-etoiles">' + [0, 1, 2].map(k =>
      SVG_ETOILE_NOEUD.replace('class="etoile"', 'class="etoile' + (k < etoiles ? ' gagnee' : '') + '"')
    ).join('') + '</div>' +
    '<p class="p-record">' + (verrouille
      ? '— SECTEUR VERROUILLÉ —'
      : (record > 0 ? 'RECORD ' + String(record).padStart(7, '0') : 'RECORD —')) + '</p>' +
    '<div class="p-boutons">' +
      (verrouille ? '' : '<button type="button" id="bouton-lancer">LANCER</button>') +
      '<button type="button" id="bouton-fermer-niveau">FERMER</button>' +
    '</div>';
  panneau.classList.add('ouvert');
  document.getElementById('volet-niveau').style.display = 'block';
  document.getElementById('bouton-fermer-niveau').addEventListener('click', fermerPanneauNiveau);
  if (!verrouille)
    document.getElementById('bouton-lancer').addEventListener('click', () => {
      fermerPanneauNiveau();
      demarrerNiveau(n);
    });
  Son.initialiser();
  Son.note(520, 0.06, { type:'square', vol:0.03 });   // petit clic d'interface
}

/* ————— Cycle de vie des écrans ————— */

function montrerEcran(nom){
  application.ecran = nom;
  document.getElementById('ecran-accueil').classList.toggle('cache', nom !== 'accueil');
  document.getElementById('ecran-carte').classList.toggle('cache', nom !== 'carte');
  document.getElementById('ecran-jeu').classList.toggle('cache', nom !== 'jeu');
}

function demarrerNiveau(n){
  Son.initialiser();
  montrerEcran('jeu');
  application.jeu = new Jeu(n);
  application.dernierT = performance.now();
  Musique.tempoNormal();
  Musique.demarrer(NIVEAUX[n - 1].env);
}

function demarrerSurvie(){
  Son.initialiser();
  montrerEcran('jeu');
  application.jeu = new Jeu(0);
  application.dernierT = performance.now();
  Musique.tempoNormal();
  Musique.demarrer('terre');
}

function retourCarte(){
  application.jeu = null;
  montrerEcran('carte');
  construireCarte();
  Musique.tempoNormal();
  Musique.demarrer('carte');
  majBoutonSurvie();
}

function retourAccueil(){
  application.jeu = null;
  montrerEcran('accueil');
  Musique.tempoNormal();
  Musique.demarrer('carte');
}

function allerCarte(){
  Son.initialiser();
  montrerEcran('carte');
  construireCarte();
  Musique.tempoNormal();
  Musique.demarrer('carte');
}

/* ————— La boucle principale ————— */

function boucle(t){
  requestAnimationFrame(boucle);
  let dt = (t - application.dernierT) / 1000;
  application.dernierT = t;
  dt = Math.min(Math.max(dt, 0), 0.034);   // frame long → tout ralentit d'un chouïa,
                                           // plutôt qu'un à-coup visible du décor
  if (application.ecran === 'jeu' && application.jeu){
    if (!application.jeu.pause) application.jeu.maj(dt);
    application.jeu.dessiner(application.ctx);
  } else if (application.ecran === 'accueil'){
    accueil.t += dt;
    majAccueil(dt);
    dessinerAccueil();
  }
}

function activerBoutonJeu(b){
  const jeu = application.jeu;
  if (!jeu || !b) return;
  switch (b.action){
    case 'rejouer':
      if (jeu.survie) demarrerSurvie();
      else demarrerNiveau(jeu.niveau);
      break;
    case 'carte': case 'quitter': retourCarte(); break;
    case 'accueil': retourAccueil(); break;
    case 'reprendre': jeu.basculerPause(false); break;
    case 'passer': jeu.minuteurEtat = Math.max(jeu.minuteurEtat, jeu.dureeGen - 0.4); break;
  }
}

/* ————— Clavier : flèches + ZQSD/WASD (mêmes touches physiques) + Espace ————— */

const TOUCHES_CODEES = {
  ArrowLeft: 'g', ArrowRight: 'd', ArrowUp: 'h', ArrowDown: 'b',
  KeyW: 'h', KeyA: 'g', KeyS: 'b', KeyD: 'd',
  Space: 'tir',
};

window.addEventListener('keydown', e => {
  premierGeste();
  // accueil : Entrée / Espace lance la campagne
  if (application.ecran === 'accueil' && (e.code === 'Enter' || e.code === 'Space')){
    e.preventDefault();
    allerCarte();
    return;
  }
    // générique de fin : Espace/Entrée pour passer (ou quitter au panneau final)
  if (application.jeu && application.jeu.etat === 'generique' &&
      (e.code === 'Enter' || e.code === 'Space')){
    e.preventDefault();
    if (application.jeu.minuteurEtat > application.jeu.dureeGen) retourCarte();
    else application.jeu.minuteurEtat = application.jeu.dureeGen - 0.4;
    return;
  }
  const t = TOUCHES_CODEES[e.code];
  if (t){ entrees[t] = true; e.preventDefault(); return; }
  switch (e.code){
    case 'KeyP': case 'Escape':
      if (application.jeu){
        if (application.jeu.etat === 'victoire' || application.jeu.etat === 'defaite') retourCarte();
        else application.jeu.basculerPause();
      }
      e.preventDefault();
      break;
    case 'KeyM': basculerSon(); break;
    case 'KeyR':
      if (application.jeu && (application.jeu.etat === 'victoire' || application.jeu.etat === 'defaite')){
        if (application.jeu.survie) demarrerSurvie();
        else demarrerNiveau(application.jeu.niveau);
      }
      break;
    case 'KeyC':
      if (application.jeu && (application.jeu.etat === 'victoire' ||
          application.jeu.etat === 'defaite' || application.jeu.etat === 'generique')){
        if (application.jeu.survie && application.jeu.etat === 'defaite') retourAccueil();
        else retourCarte();
      }
      break;
  }
});
window.addEventListener('keyup', e => {
  const t = TOUCHES_CODEES[e.code];
  if (t){ entrees[t] = false; e.preventDefault(); }
});

/* ————— Son & modale de réinitialisation ————— */

function basculerSon(){
  Son.initialiser();
  const actif = Son.basculer();
  document.getElementById('son-on').classList.toggle('cache', !actif);
  document.getElementById('son-off').classList.toggle('cache', actif);
}
document.getElementById('bouton-son').addEventListener('click', basculerSon);

const voile = document.getElementById('voile-modale');
document.getElementById('bouton-reset').addEventListener('click', () => voile.classList.add('ouvert'));
document.getElementById('bouton-annuler').addEventListener('click', () => voile.classList.remove('ouvert'));
document.getElementById('bouton-confirmer').addEventListener('click', () => {
  Progression.reinitialiser();
  construireCarte();
  majBoutonSurvie();
  voile.classList.remove('ouvert');
});

/* ————— Clics sur les boutons dessinés au canvas (souris) ————— */

const canvas = document.getElementById('jeu');
canvas.addEventListener('pointerdown', e => {
  premierGeste();
  const jeu = application.jeu;
  if (!jeu || !jeu.boutons.length) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * L / r.width;
  const y = (e.clientY - r.top) * H / r.height;
  for (const b of jeu.boutons){
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h){ activerBoutonJeu(b); return; }
  }
});

/* ————— Contrôles tactiles : joystick virtuel + bouton de tir ————— */

const overlay = document.getElementById('overlay-tactile');
const baseJoystick = document.getElementById('base-joystick');
const knob = document.getElementById('knob');
const btnTir = document.getElementById('bouton-tir');
const btnPause = document.getElementById('bouton-pause');

if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)
  document.body.classList.add('tactile');

let idJoystick = null;
let origineJoystick = { x: 0, y: 0 };
const idsTir = new Set();
let tirBouton = false;

function rafraichirTir(){ entrees.tir = idsTir.size > 0 || tirBouton; }

function positionnerJoystick(cx, cy){
  const r = overlay.getBoundingClientRect();
  baseJoystick.style.left = (cx - r.left) + 'px';
  baseJoystick.style.top = (cy - r.top) + 'px';
  baseJoystick.style.display = 'block';
  origineJoystick = { x: cx, y: cy };
}

function majJoystick(t){
  let dx = t.clientX - origineJoystick.x;
  let dy = t.clientY - origineJoystick.y;
  const d = Math.hypot(dx, dy), max = 48;
  if (d > max){ dx = dx / d * max; dy = dy / d * max; }
  entrees.joyX = dx / max;
  entrees.joyY = dy / max;
  knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
}

function relacherJoystick(){
  idJoystick = null;
  entrees.joyX = entrees.joyY = 0;
  baseJoystick.style.display = 'none';
  knob.style.transform = 'translate(-50%, -50%)';
}

overlay.addEventListener('touchstart', e => {
  e.preventDefault();
  Son.initialiser();
  // priorité aux boutons dessinés au canvas (victoire, pause…)
  if (application.jeu && application.jeu.boutons.length){
    const r = canvas.getBoundingClientRect();
    for (const t of e.changedTouches){
      const x = (t.clientX - r.left) * L / r.width;
      const y = (t.clientY - r.top) * H / r.height;
      for (const b of application.jeu.boutons){
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h){
          activerBoutonJeu(b);
          return;
        }
      }
    }
  }
  for (const t of e.changedTouches){
    if (t.clientX < window.innerWidth / 2 && idJoystick === null){
      idJoystick = t.identifier;
      positionnerJoystick(t.clientX, t.clientY);
      majJoystick(t);
    } else {
      idsTir.add(t.identifier);   // moitié droite = tir aussi
      rafraichirTir();
    }
  }
}, { passive: false });

overlay.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches)
    if (t.identifier === idJoystick) majJoystick(t);
}, { passive: false });

const finToucher = e => {
  for (const t of e.changedTouches){
    if (t.identifier === idJoystick) relacherJoystick();
    idsTir.delete(t.identifier);
  }
  rafraichirTir();
};
overlay.addEventListener('touchend', finToucher);
overlay.addEventListener('touchcancel', finToucher);

btnTir.addEventListener('touchstart', e => {
  e.preventDefault(); e.stopPropagation();
  Son.initialiser();
  tirBouton = true; rafraichirTir();
  btnTir.classList.add('actif');
}, { passive: false });
const finBtnTir = e => {
  e.preventDefault();
  tirBouton = false; rafraichirTir();
  btnTir.classList.remove('actif');
};
btnTir.addEventListener('touchend', finBtnTir, { passive: false });
btnTir.addEventListener('touchcancel', finBtnTir, { passive: false });

btnPause.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
btnPause.addEventListener('click', () => { if (application.jeu) application.jeu.basculerPause(); });

/* ————— Première interaction : on réveille l'audio (contrainte navigateur) ————— */

function premierGeste(){
  Son.initialiser();
  if (!application.jeu && !Musique.style && application.ecran !== 'jeu') Musique.demarrer('carte');
}
window.addEventListener('pointerdown', premierGeste);

/* ════════ 10. DÉMARRAGE ════════ */

Progression.charger();
application.ctx = canvas.getContext('2d');
application.ctx.imageSmoothingEnabled = false;   // pixels bien nets

// champ d'étoiles de l'accueil
for (let i = 0; i < 70; i++)
  accueil.etoiles.push({
    x: Math.random() * LA, y: Math.random() * HA,
    t: 1 + Math.random() * 2.5, v: 8 + Math.random() * 30,
  });

// pré-chargement des polices canvas
if (document.fonts && document.fonts.load){
  document.fonts.load('34px "Press Start 2P"');
  document.fonts.load('22px "VT323"');
}

construireCarte();
window.addEventListener('resize', dessinerFondCarte);

// petit logo pixel art de l'écran carte
(function dessinerLogo(){
  const c = document.getElementById('logo').getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(SPRITES.joueur, 12, 11);
})();

// accueil → carte, retour accueil
document.getElementById('bouton-jouer').addEventListener('click', allerCarte);
document.getElementById('bouton-accueil').addEventListener('click', () => montrerEcran('accueil'));

// le mode survie, déverrouillé une fois la campagne terminée
const boutonSurvie = document.getElementById('bouton-survie');
function majBoutonSurvie(){
  const ok = !!Progression.donnees.campagneTerminee;
  boutonSurvie.classList.toggle('verrouille', !ok);
  boutonSurvie.title = ok
    ? 'Vagues sans fin — record : ' + (Progression.donnees.recordSurvie || 0)
    : 'Terminez la campagne pour débloquer';
}
boutonSurvie.addEventListener('click', () => {
  if (Progression.donnees.campagneTerminee) demarrerSurvie();
});
majBoutonSurvie();

// pause automatique si l'onglet passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden && application.jeu) application.jeu.basculerPause(true);
});

montrerEcran('accueil');
requestAnimationFrame(boucle);