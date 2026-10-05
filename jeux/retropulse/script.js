/* ═════════════════════════════════════════════════════════════════════
   RETROPULSE — jeu de rythme synthwave (Guitar Hero / osu!mania)
   Dix morceaux générés par Web Audio API, jouables clavier OU tactile.

   SOMMAIRE
   1.  CONFIG ............. tous les réglages gameplay (seuils, fenêtres)
   2.  OUTILS ............. petites fonctions génériques
   3.  SAUVEGARDE ......... localStorage (records, médailles, XP, options)
   4.  MOTEUR AUDIO ....... contexte, instruments synthétiques, scheduler
   5.  DONNÉES CHANSONS ... les 10 partitions (gammes, accords, patterns)
   6.  COMPILATION ........ partition → événements audio + notes de jeu
   7.  ÉTAT & JUGEMENT .... partie en cours, frappe, timing, miss, vie
   8.  RENDU CANVAS ....... fond synthwave, terrain, notes, particules
   9.  HUD ................ score, combo, multiplicateur, vie, progression
   10. MENUS .............. accueil, sélection, pause, résultats, échec
   11. ENTRÉES ............ clavier + pointeur tactile/souris + calibrage
   12. BOUCLE & INIT ...... requestAnimationFrame, démarrage
   ═════════════════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   1. CONFIG — réglages gameplay (c'est ICI qu'on ajuste tout)
   ════════════════════════════════════════════════════════════ */
const CONFIG = {
  // Fenêtres de jugement en secondes (± autour du temps exact de la note)
  WIN:   { parfait: 0.050, bien: 0.100, ok: 0.150 },

  // Points de base par jugement (× multiplicateur de combo)
  POINTS:{ parfait: 100, bien: 70, ok: 40 },

  // Multiplicateur : [seuil de combo, multiplicateur]
  MULT:  [[0,1],[10,2],[15,3],[20,4]],

  // Jauge de vie : gains / pertes par jugement
  LIFE:  { parfait:+2.2, bien:+1.2, ok:0, rate:-11, max:100 },

  // Médailles : [précision minimale, niveau] (1=bronze 2=argent 3=or)
  MEDALS:[[0.95,3],[0.85,2],[0.70,1]],

  // Temps d'approche (en s) = durée de chute d'une note du haut à la zone
  // de frappe. Plus court = chute plus rapide. Difficile = plus rapide.
  APPROACH: { facile:1.9, normal:1.45, difficile:1.05 },

  // Délai avant le début du morceau (compte à rebours)
  LEAD_IN: 3.2,

  // Gain d'XP : 1 point tous les 120 points de score
  XP_PER_POINTS: 120,

  // Latence de sortie "technique" ajoutée d'office (sûreté)
  BASE_LATENCY: 0.02,
};

// Décalage avant du scheduler audio (les sons sont programmés 0,22 s
// en avance sur l'horloge audio — jamais joués "en retard")
const LOOKAHEAD = 0.22;

// Les 4 colonnes : couleur + touche clavier (e.code, indépendant de l'OS)
const COLS = [
  { c:'#00e5ff', k:'KeyD', label:'D' },
  { c:'#7b6cff', k:'KeyF', label:'F' },
  { c:'#ff2fb3', k:'KeyJ', label:'J' },
  { c:'#ff7847', k:'KeyK', label:'K' },
];

// Appareil tactile ? (détermine textes d'aide, densité d'effets, DPR)
const IS_TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

/* ════════════════════════════════════════════════════════════
   2. OUTILS
   ════════════════════════════════════════════════════════════ */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const fmt   = n => Math.round(n).toLocaleString('fr-FR');
const DIFF_LABEL = { facile:'FACILE', normal:'NORMAL', difficile:'DIFFICILE' };
const MEDAL_COLORS = { 1:'#cd8a4a', 2:'#cfd9ea', 3:'#ffd24a' };
const MEDAL_NAMES  = { 1:'BRONZE', 2:'ARGENT', 3:'OR' };

/* ════════════════════════════════════════════════════════════
   3. SAUVEGARDE — localStorage
   ════════════════════════════════════════════════════════════ */
const SAVE_KEY = 'retropulse.v1';
let save = { xp:0, offset:0, vol:0.8, seenIds:{},
             best:{} /* { songId: { facile:{score,acc,medal}, ... } } */ };

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) save = Object.assign(save, JSON.parse(raw));
  }catch(e){ /* mode privé : on joue sans sauvegarde */ }
  save.seenIds = save.seenIds || {};
}
function writeSave(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){}
}
// Meilleure médaille d'une chanson (toutes difficultés confondues)
function bestMedalOf(songId){
  const b = save.best[songId]; if(!b) return 0;
  return Math.max(0, ...Object.values(b).map(d => d ? (d.medal||0) : 0));
}
// Déblocage en chaîne : une médaille (bronze ou mieux) sur la piste
// précédente — quelle que soit la difficulté — ouvre la suivante.
function canPlay(idx){
  return idx === 0 || bestMedalOf(SONGS[idx-1].id) >= 1;
}
// Niveau du joueur : chaque palier demande un peu plus d'XP
function levelInfo(xp){
  let level = 1, rest = xp, need = 400;
  while (rest >= need){ rest -= need; level++; need = 400 + (level-1)*250; }
  return { level, rest, need, pct: (rest/need)*100 };
}

/* ════════════════════════════════════════════════════════════
   4. MOTEUR AUDIO — contexte, instruments, scheduler
   ════════════════════════════════════════════════════════════ */
let actx = null;            // AudioContext (créé au 1er geste utilisateur)
let master, compBus;        // bus principaux
let delaySend, delayNode, delayFb, delayWet; // écho du lead
let noiseBuf = null;        // buffer de bruit blanc partagé
const activeSrc = [];       // sources en cours (pour tout couper proprement)

// Création paresseuse du contexte audio (politique autoplay navigateur).
// Appelée depuis un vrai geste utilisateur → on peut reprendre le contexte.
function ensureAudio(){
  if (actx){ if (actx.state === 'suspended' && !G.paused) actx.resume(); return; }
  actx = new (window.AudioContext || window.webkitAudioContext)();
  master = actx.createGain();
  master.gain.value = save.vol;
  compBus = actx.createDynamicsCompressor();   // évite la saturation du mix
  compBus.threshold.value = -14; compBus.ratio.value = 4; compBus.knee.value = 8;
  master.connect(compBus).connect(actx.destination);
  // Écho (durée réglée par chanson, feedback fixe)
  delaySend = actx.createGain(); delaySend.gain.value = 1;
  delayNode = actx.createDelay(2);
  delayFb   = actx.createGain(); delayFb.gain.value = 0.34;
  delayWet  = actx.createGain(); delayWet.gain.value = 0.20;
  delaySend.connect(delayNode);
  delayNode.connect(delayFb).connect(delayNode);   // boucle de feedback
  delayNode.connect(delayWet).connect(master);
  // 2 s de bruit blanc pré-générées (pour snare / hats)
  noiseBuf = actx.createBuffer(1, actx.sampleRate*2, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
}
// Enregistre une source pour pouvoir tout stopper (pause/reprise/abandon)
function trackSrc(node){
  activeSrc.push(node);
  node.onended = () => { const i = activeSrc.indexOf(node); if (i>=0) activeSrc.splice(i,1); };
}
function stopAllSources(){
  for (const s of activeSrc){ try{ s.stop(0); }catch(e){} }
  activeSrc.length = 0;
}
// Coupe progressive de la sortie (utilisé en fin de partie/abandon)
function duckMaster(down){
  if (!actx) return;
  const g = master.gain, t = actx.currentTime;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(down ? 0.0001 : save.vol, t, down ? 0.02 : 0.06);
}

/* ── Instruments (tout est synthétisé : oscillateurs + bruit) ── */
function playKick(t, v=1){
  // Basse de kick : sinus dont la hauteur chute de 150 à 44 Hz
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(44, t+0.11);
  g.gain.setValueAtTime(0.95*v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.27);
  o.connect(g).connect(master); o.start(t); o.stop(t+0.3); trackSrc(o);
  // Clic d'attaque pour le punch
  const c = actx.createOscillator(), cg = actx.createGain();
  c.type='square'; c.frequency.value = 900;
  cg.gain.setValueAtTime(0.10*v, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t+0.012);
  c.connect(cg).connect(master); c.start(t); c.stop(t+0.02); trackSrc(c);
}
function playSnare(t, v=1){
  // Claquement : bruit filtré + corps grave court
  const n = actx.createBufferSource(); n.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1900; f.Q.value=0.7;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.5*v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.17);
  n.connect(f).connect(g).connect(master); n.start(t); n.stop(t+0.2); trackSrc(n);
  const o = actx.createOscillator(), og = actx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(215, t);
  o.frequency.exponentialRampToValueAtTime(150, t+0.08);
  og.gain.setValueAtTime(0.28*v, t);
  og.gain.exponentialRampToValueAtTime(0.001, t+0.09);
  o.connect(og).connect(master); o.start(t); o.stop(t+0.1); trackSrc(o);
}
function playHat(t, open=false, v=1){
  const n = actx.createBufferSource(); n.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7600;
  const g = actx.createGain();
  const dur = open ? 0.16 : 0.035;
  g.gain.setValueAtTime((open?0.14:0.11)*v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  n.connect(f).connect(g).connect(master); n.start(t); n.stop(t+dur+0.02); trackSrc(n);
}
function playBass(t, freq, dur){
  // Basseline : dents de scie + carré une octave dessous, filtre fermé
  const flt = actx.createBiquadFilter(); flt.type='lowpass'; flt.Q.value=1.2;
  flt.frequency.setValueAtTime(950, t);
  flt.frequency.exponentialRampToValueAtTime(230, t+Math.min(dur,0.22));
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.30, t+0.008);
  g.gain.setTargetAtTime(0.16, t+0.05, 0.10);
  g.gain.setTargetAtTime(0, t+dur, 0.045);
  const o1 = actx.createOscillator(); o1.type='sawtooth'; o1.frequency.value=freq;
  const o2 = actx.createOscillator(); o2.type='square';  o2.frequency.value=freq/2;
  const g2 = actx.createGain(); g2.gain.value = 0.5;
  o1.connect(flt); o2.connect(g2).connect(flt);
  flt.connect(g).connect(master);
  o1.start(t); o2.start(t);
  o1.stop(t+dur+0.4); o2.stop(t+dur+0.4); trackSrc(o1); trackSrc(o2);
}
// Le lead accepte plusieurs timbres selon la chanson (couleur du morceau)
const WAVE_GAIN = { sawtooth:1, square:0.8, triangle:1.3 };
function playLead(t, freq, dur, oct=false, wave='sawtooth'){
  // 2 oscillateurs désaccordés, filtre ouvert, envoyés à l'écho
  const flt = actx.createBiquadFilter(); flt.type='lowpass'; flt.Q.value=1.1;
  flt.frequency.setValueAtTime(1300, t);
  flt.frequency.linearRampToValueAtTime(2700, t+0.07);
  const wg = WAVE_GAIN[wave] || 1;
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.26*wg, t+0.014);
  g.gain.setTargetAtTime(0.18*wg, t+0.04, 0.12);
  g.gain.setTargetAtTime(0, t+dur, 0.07);
  for (const det of [-7, 7]){
    const o = actx.createOscillator();
    o.type=wave; o.frequency.value=freq; o.detune.value=det;
    o.connect(flt); o.start(t); o.stop(t+dur+0.5); trackSrc(o);
  }
  if (oct){ // octave de renfort pour les refrains
    const o = actx.createOscillator();
    o.type=wave; o.frequency.value=freq*2; o.detune.value=4;
    const go = actx.createGain(); go.gain.value=0.4;
    o.connect(go).connect(flt); o.start(t); o.stop(t+dur+0.5); trackSrc(o);
  }
  flt.connect(g).connect(master);
  g.connect(delaySend);
}
function playPad(t, semis, dur, base){
  // Nappe d'accord : 3 voix × 2 scies désaccordées, attaque lente
  const flt = actx.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=820;
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.085, t+0.45);
  g.gain.setValueAtTime(0.085, t+dur-0.25);
  g.gain.linearRampToValueAtTime(0, t+dur+0.7);
  for (const st of semis){
    const f = base * Math.pow(2, st/12);
    for (const det of [-5, 5]){
      const o = actx.createOscillator();
      o.type='sawtooth'; o.frequency.value=f; o.detune.value=det;
      o.connect(flt); o.start(t); o.stop(t+dur+0.9); trackSrc(o);
    }
  }
  flt.connect(g).connect(master);
}
function playArp(t, freq){
  // Arpège cristallin : triangle pincé, envoyé à l'écho
  const o = actx.createOscillator(); o.type='triangle'; o.frequency.value=freq;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.26);
  o.connect(g).connect(master); g.connect(delaySend);
  o.start(t); o.stop(t+0.3); trackSrc(o);
}

/* ── Bruitages de l'interface et du jugement ── */
function sfxTick(colIdx){ // retour tactile discret à l'appui d'une touche
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(); o.type='square';
  o.frequency.value = 1300 + colIdx*120;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.045, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.03);
  o.connect(g).connect(master); o.start(t); o.stop(t+0.04); trackSrc(o);
}
function sfxMiss(){ // déception : impact sourd et grave
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(); o.type='sine';
  o.frequency.setValueAtTime(105, t);
  o.frequency.exponentialRampToValueAtTime(36, t+0.28);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.3);
  o.connect(g).connect(master); o.start(t); o.stop(t+0.32); trackSrc(o);
  const n = actx.createBufferSource(); n.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=240;
  const ng = actx.createGain();
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t+0.12);
  n.connect(f).connect(ng).connect(master); n.start(t); n.stop(t+0.15); trackSrc(n);
}
function sfxUI(){
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(); o.type='square'; o.frequency.value=640;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.045);
  o.connect(g).connect(master); o.start(t); o.stop(t+0.06); trackSrc(o);
}
// Petite fanfare de fin (nb de notes selon la médaille)
function jingle(level){
  if (!actx) return;
  const seqs = { 3:[659.3,784,987.8,1318.5], 2:[659.3,784,987.8], 1:[523.3,659.3], 0:[392,329.6] };
  const t0 = actx.currentTime + 0.15;
  seqs[level].forEach((f,i)=>{
    const t = t0 + i*0.13;
    const o = actx.createOscillator(); o.type='triangle'; o.frequency.value=f;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.3);
    o.connect(g).connect(master); g.connect(delaySend);
    o.start(t); o.stop(t+0.35); trackSrc(o);
  });
}

/* ════════════════════════════════════════════════════════════
   5. DONNÉES DES CHANSONS — les 10 partitions
   ────────────────────────────────────────────────────────────
   Format des patterns (16 pas par mesure = doubles-croches) :
   • bass  : 'a' fondamentale, 'o' octave, 'h' fondamentale tenue, '.' rien
   • drums : 3 chaînes k/s/h — 'x' frappe, 'o' (hat) = ouvert, '.' rien
   • mel   : motif de 1-2 mesures — liste [pas, degré, colonne, ancre?, tenu?]
     le degré est l'index dans la gamme (0=tonique, 7=octave…)
   • section : { bars, prog, pad, arp, bass, drums, mel, fill, chart, oct }
     prog = accords utilisés (index dans chords, un par mesure, en boucle)
     chart = notes de jeu "manuelles" (intros calmes) : [pas, colonne]
   • snd   : personnalité sonore { lead: timbre, echo: niveau d'écho }
   La chart de jeu EST la ligne de lead : chaque note jouable sonne vraiment.
   Les morceaux sont classés par difficulté croissante (1 → 10).
   ════════════════════════════════════════════════════════════ */
const SONGS = [
{ /* ═══ 01 · LUNE ROUSSE — chillwave onirique, 92 BPM, Do majeur ═══ */
  id:'lune', title:'Lune Rousse', genre:'Chillwave', bpm:92, diffLabel:'Très facile',
  base:130.81, ac:'#6ec4ff', jumpEvery:16,
  snd:{ lead:'triangle', echo:0.3 },
  quote:'La lune s’est couverte.',
  scale:[0,2,4,5,7,9,11],                    // Do majeur
  chords:[ {r:0,t:[0,4,7]}, {r:9,t:[0,3,7]}, {r:5,t:[0,4,7]}, {r:7,t:[0,4,7]} ], // C Am F G
  bass:{ soft:'h.......h.......', walk:'a.....a...a.....' },
  drums:{
    dream: { k:'x.......x.......', s:'',                 h:'..x...x...x...x.' },
    pulse: { k:'x.......x.......', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    swell: { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
  },
  mel:{
    themeA:{ bars:2, n:[[0,2,1],[4,4,2],[12,5,3],[16,1,1],[20,2,2],[28,0,0]] },   // E..G.....D.E.....C
    themeB:{ bars:2, n:[[0,5,3],[4,4,2],[8,3,1],[16,2,1],[20,4,2],[24,6,3],[28,4,2]] }, // A G F | E G B G
    lift:  { bars:2, n:[[0,4,2],[2,5,3],[4,7,3],[8,5,2],[12,4,1],[16,2,0],[20,4,1],[24,5,2],[28,4,1]] },
    pont:  { bars:2, n:[[0,7,3],[6,5,2],[8,4,1],[16,2,0],[22,1,1],[24,0,0]] },
    endA:  { bars:2, n:[[0,2,1],[4,4,2],[12,5,3],[16,1,1],[20,2,2],[28,0,0,0,1]] },// fin tenue
  },
  sections:[
    { bars:4, prog:[0,1,2,3], pad:1, arp:1, drums:'dream', chart:[[0,0],[8,1]] },
    { bars:8, prog:[0,1], pad:1, mel:'themeA', bass:'soft', drums:'dream' },
    { bars:8, prog:[2,3], pad:1, arp:1, mel:'themeB', bass:'walk', drums:'pulse' },
    { bars:8, prog:[0,1], pad:1, mel:'lift',   bass:'walk', drums:'swell' },
    { bars:4, prog:[0,3], pad:1, arp:1, mel:'pont', drums:'dream' },
    { bars:4, prog:[0,1], pad:1, arp:1, mel:'endA' },
  ],
},
{ /* ═══ 02 · NÉON CITY — synthwave contemplatif, 120 BPM ═══ */
  id:'neon', title:'Néon City', genre:'Synthwave', bpm:120, diffLabel:'Facile',
  base:220, ac:'#00e5ff', jumpEvery:16,
  quote:'La ville néon s’est éteinte avec vous.',
  scale:[0,2,3,5,7,8,10],                    // La mineur naturel
  chords:[ {r:0,t:[0,3,7]}, {r:8,t:[0,4,7]}, {r:3,t:[0,4,7]}, {r:10,t:[0,4,7]} ], // Am F C G
  bass:{ pump:'a.o.a.o.a.o.a.o.' },
  drums:{
    soft:{ k:'x...............', s:'',                 h:'x.x.x.x.x.x.x.x.' },
    main:{ k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    full:{ k:'x...x...x...x...', s:'....x.......x..x', h:'x.o.x.o.x.o.x.o.' },
  },
  mel:{
    themeA:{ bars:2, n:[[0,4,2],[4,2,1],[8,0,0],[14,2,1],[16,4,2],[20,7,3],[24,6,2],[28,4,1]] },   // E C A·C | E A' G E
    themeB:{ bars:2, n:[[0,6,2],[4,7,3],[8,6,2],[12,4,1],[16,2,0],[20,4,1],[24,3,2],[28,1,3]] },   // G A' G E | C E D B
    themeC:{ bars:2, n:[[0,2,1],[4,4,2],[8,7,3],[12,6,2],[16,4,1],[20,2,0],[24,4,1],[28,1,0]] },   // pont lyrique (Am·G)
    dropA: { bars:2, n:[[0,0,0],[2,3,1],[4,4,2],[6,3,1],[8,0,0],[10,3,1],[12,4,2],
                       [16,7,3],[18,4,2],[20,3,1],[22,4,2],[24,7,3],[26,4,2],[28,2,1]] },           // pompage du refrain
    endA:  { bars:2, n:[[0,4,2],[4,2,1],[8,0,0],[14,2,1],[16,4,2],[20,7,3],[24,6,2],[28,4,1,0,1]] },// thème final, note tenue
  },
  sections:[
    { bars:4,  prog:[0,1,2,3], pad:1, arp:1, drums:'soft', chart:[[0,0],[8,1]] },   // intro : nappe + arpège
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'pump', drums:'main' },        // couplet
    { bars:8,  prog:[0,3], pad:1, mel:'themeC', bass:'pump', drums:'main', arp:1 }, // pont (Am·G)
    { bars:8,  prog:[0,1], pad:1, mel:'dropA',  bass:'pump', drums:'full', oct:1 }, // refrain
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'pump', drums:'full', oct:1, fill:1 }, // rappel
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'endA' },                              // outro
  ],
},
{ /* ═══ 03 · AUTOROUTE AURORE — dream house, 132 BPM, Sol majeur ═══ */
  id:'aurore', title:'Autoroute Aurore', genre:'Dream house', bpm:132, diffLabel:'Facile +',
  base:196, ac:'#b4ff3c', jumpEvery:8,
  quote:'L’aurore ne vous a pas attendu.',
  scale:[0,2,4,5,7,9,11],                    // Sol majeur
  chords:[ {r:0,t:[0,4,7]}, {r:9,t:[0,3,7]}, {r:5,t:[0,4,7]}, {r:7,t:[0,4,7]} ], // G Em C D
  bass:{ off:'..a...a...a...a.', off2:'..a...a...a..aa.' },  // basse en contretemps
  drums:{
    hats: { k:'',                 s:'',                 h:'..x...x...x...x.' },
    main: { k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.' },
    full: { k:'x...x...x...x...', s:'....x.......x..x', h:'..x..x.x..x..x.x' },
  },
  mel:{
    themeA: { bars:2, n:[[0,5,2],[4,0,3],[8,2,3],[12,0,2],[16,1,1],[20,0,2],[24,2,3],[28,1,2]] }, // E G B G | A G B A
    themeB: { bars:2, n:[[0,2,1],[4,4,2],[8,5,3],[12,7,3],[16,5,2],[20,4,1],[24,2,0],[28,0,1]] }, // B D E G' | E D B G
    dropA:  { bars:2, n:[[0,0,0],[2,2,1],[4,4,2],[8,0,0],[10,2,1],[12,4,2],
                        [16,1,1],[18,2,2],[20,4,3],[24,5,3],[26,4,2],[28,2,1]] },                 // riff arpège Em7
    brk:    { bars:2, n:[[0,7,3,1],[8,5,2,1],[16,4,1,1],[24,2,0,1]] },  // respiration (notes ancrées)
    end:    { bars:2, n:[[0,7,3,1],[8,5,2,1],[16,4,1,1],[24,0,0,1,1]] },// fin, note tenue
  },
  sections:[
    { bars:4,  prog:[0,1,2,3], pad:1, arp:1, drums:'hats', chart:[[0,0],[8,2]] },
    { bars:8,  prog:[1,2], pad:1, mel:'themeA', bass:'off',  drums:'main' },      // Em|C
    { bars:8,  prog:[0,3], pad:1, mel:'themeB', bass:'off',  drums:'main' },      // G|D
    { bars:8,  prog:[1,2], pad:1, mel:'dropA',  bass:'off2', drums:'full', oct:1, fill:1 },
    { bars:4,  prog:[1,2], pad:1, arp:1, mel:'brk', drums:'hats' },               // break éthéré
    { bars:12, prog:[1,2], pad:1, mel:'dropA',  bass:'off2', drums:'full', oct:1, fill:1 },
    { bars:4,  prog:[1,2], pad:1, arp:1, mel:'end', drums:'hats' },               // outro
  ],
},
{ /* ═══ 04 · CHROME CASSÉ — synthpop punchy, 140 BPM, Mi mineur ═══ */
  id:'chrome', title:'Chrome Cassé', genre:'Synthpop', bpm:140, diffLabel:'Moyen',
  base:164.81, ac:'#ff6ee0', jumpEvery:8,
  snd:{ lead:'square', echo:0.18 },
  quote:'Les éclats coupent, parfois.',
  scale:[0,2,3,5,7,8,10],                    // Mi mineur
  chords:[ {r:0,t:[0,3,7]}, {r:8,t:[0,4,7]}, {r:3,t:[0,4,7]}, {r:10,t:[0,4,7]}, {r:5,t:[0,3,7]} ], // Em C G D Am
  bass:{ oct:'a.o.a.o.a.o.a.o.', run:'a..a..a..a..a.o.' },
  drums:{
    tick: { k:'',                 s:'',                 h:'x.x.x.x.x.x.x.x.' },
    main: { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    full: { k:'x...x...x...x...', s:'....x..x....x..x', h:'..x...x...x...x.' },
  },
  mel:{
    themeA: { bars:2, n:[[0,4,2],[6,3,1],[8,2,0],[14,3,1],[16,2,1],[20,4,2],[26,5,3]] }, // syncope signature
    themeB: { bars:2, n:[[0,2,1],[2,4,2],[6,2,1],[8,0,0],[14,2,1],[16,3,1],[20,4,2],[26,6,3],[28,4,2]] },
    chorus: { bars:2, n:[[0,7,3],[2,4,2],[4,2,1],[6,4,2],[8,7,3],[12,4,2],[16,5,3],[18,4,2],[24,7,3],[28,6,2]] }, // refrain qui claque
    bridge: { bars:2, n:[[0,3,2],[4,2,1],[8,0,0],[16,2,1],[20,3,2],[24,5,3]] },         // Am|C
    endA:   { bars:2, n:[[0,4,2],[6,3,1],[8,2,0],[16,2,1],[20,4,2],[28,0,0,1,1]] },
  },
  sections:[
    { bars:4,  prog:[0,1,2,3], pad:1, arp:1, drums:'tick', chart:[[0,0],[8,2]] },
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'oct', drums:'main' },      // Em|C
    { bars:8,  prog:[2,3], pad:1, mel:'themeB', bass:'oct', drums:'main' },      // G|D
    { bars:8,  prog:[0,1], pad:1, mel:'chorus', bass:'oct', drums:'full', oct:1 },
    { bars:4,  prog:[4,1], pad:1, arp:1, mel:'bridge', bass:'run', drums:'tick' }, // Am|C
    { bars:12, prog:[0,1], pad:1, mel:'chorus', bass:'oct', drums:'full', oct:1, fill:1 },
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'oct', drums:'main' },      // retombée
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'endA' },
  ],
},
{ /* ═══ 05 · SERPENT NÉON — groove modal dorien, 148 BPM, Ré dorien ═══ */
  id:'serpent', title:'Serpent Néon', genre:'Groove modal', bpm:148, diffLabel:'Moyen +',
  base:146.83, ac:'#35ffb5', jumpEvery:8,
  quote:'Le serpent vous a mordu.',
  scale:[0,2,3,5,7,9,10],                    // Ré dorien (Si bécarre)
  chords:[ {r:0,t:[0,3,7]}, {r:5,t:[0,4,7]}, {r:8,t:[0,4,7]}, {r:7,t:[0,3,7]} ], // Dm G Bb Am
  bass:{ pulse:'a.a.a.a.a.a.a.a.', snake:'a..a..a...a.a...' },
  drums:{
    ticks: { k:'',                 s:'',                 h:'x.x.x.x.x.x.x.x.' },
    main: { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    full: { k:'x...x...x...x..x', s:'....x..x....x..x', h:'x.x.x.x.x.x.x.x.' },
  },
  mel:{
    themeA: { bars:2, n:[[0,0,0],[2,2,1],[4,3,2],[8,4,3],[10,2,1],[12,0,0],
                        [16,3,1],[18,4,2],[20,5,3],[24,4,2],[28,2,1]] },  // vague montante/descendante
    themeB: { bars:2, n:[[0,7,3],[4,5,2],[8,4,1],[12,3,0],[16,3,2],[20,4,3],[24,5,3],[28,3,2]] },
    dropA:  { bars:2, n:[[0,0,0],[2,3,1],[4,7,2],[8,0,0],[10,3,1],[12,7,2],
                        [16,5,3],[18,3,2],[20,0,1],[24,5,3],[26,3,2],[28,0,1]] }, // riff hypnotique
    brk:    { bars:2, n:[[0,7,3,1],[8,5,2,1],[16,4,1,1],[24,3,0,1]] },
    end:    { bars:2, n:[[0,0,0,1],[8,3,1,1],[16,4,2,1],[24,0,0,1,1]] },
  },
  sections:[
    { bars:4,  prog:[0,1], pad:1, arp:1, drums:'ticks', chart:[[0,0],[8,1]] },
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'pulse', drums:'main' },    // Dm|G, le riff dorien
    { bars:8,  prog:[0,2], pad:1, mel:'themeB', bass:'pulse', drums:'main' },   // Dm|Bb, plus sombre
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'pulse', drums:'main' },
    { bars:8,  prog:[0,1], pad:1, mel:'dropA',  bass:'snake', drums:'full', oct:1 },
    { bars:4,  prog:[0,2], pad:1, arp:1, mel:'brk', drums:'ticks' },            // l'œil du serpent
    { bars:12, prog:[0,1], pad:1, mel:'dropA',  bass:'snake', drums:'full', oct:1, fill:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'end' },
  ],
},
{ /* ═══ 06 · TURBO RUSH — electro, 160 BPM, Mi mineur ═══ */
  id:'turbo', title:'Turbo Rush', genre:'Electro', bpm:160, diffLabel:'Serré',
  base:164.81, ac:'#ff2fb3', jumpEvery:8,
  quote:'Le turbo vous a échappé.',
  scale:[0,2,3,5,7,8,10],                    // Mi mineur
  chords:[ {r:0,t:[0,3,7]}, {r:8,t:[0,4,7]}, {r:3,t:[0,4,7]}, {r:10,t:[0,4,7]} ], // Em C G D
  bass:{ off:'..a...a...a...a.', off2:'..a...a...a..aa.' },  // basse en contretemps
  drums:{
    hats: { k:'',                 s:'',                 h:'x.x.x.x.x.x.x.x.' },
    main: { k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.' },
    full: { k:'x...x...x...x...', s:'....x..x....x..x', h:'..x..x.x..x..x.x' },
  },
  mel:{
    t1: { bars:2, n:[[0,0,0],[2,2,1],[4,3,2],[6,2,1],[8,0,0],[10,3,2],[12,4,3],
                    [16,4,3],[18,3,2],[20,2,1],[22,3,2],[24,4,3],[26,6,3],[28,4,2]] }, // thème principal
    t2: { bars:2, n:[[0,4,1],[2,6,2],[4,7,3],[8,6,2],[10,4,1],[12,6,2],
                    [16,3,0],[18,4,1],[20,6,2],[24,7,3],[26,6,2],[28,3,1]] },         // réponse (G·D)
    t3: { bars:2, n:[[0,0,0],[2,3,1],[4,4,2],[6,3,1],[8,4,2],[10,6,3],[12,4,2],
                    [16,3,1],[18,4,2],[20,6,3],[22,7,3],[24,6,2],[26,4,1],[28,3,2]] },// riff du drop
    brk: { bars:2, n:[[0,7,3,1],[8,6,2,1],[16,4,1,1],[24,2,0,1]] },  // respiration (notes ancrées)
    end: { bars:2, n:[[0,7,3,1],[8,6,2,1],[16,4,1,1],[24,0,0,1,1]] },// fin, note tenue
  },
  sections:[
    { bars:4,  prog:[0,1], pad:1, arp:1, drums:'hats', chart:[[0,0],[8,2]] },
    { bars:8,  prog:[0,1], pad:1, mel:'t1', bass:'off',  drums:'main' },
    { bars:8,  prog:[2,3], pad:1, mel:'t2', bass:'off',  drums:'main' },
    { bars:8,  prog:[0,1], pad:1, mel:'t3', bass:'off2', drums:'full', oct:1, fill:1 },
    { bars:8,  prog:[0,1], pad:1, arp:1, mel:'brk', drums:'hats' },        // break éthéré
    { bars:8,  prog:[0,1], pad:1, mel:'t3', bass:'off2', drums:'full', oct:1 },
    { bars:8,  prog:[0,1], pad:1, mel:'t1', bass:'off2', drums:'full', oct:1, fill:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'end' },                      // outro
  ],
},
{ /* ═══ 07 · CŒUR DE PLASMA — course nocturne, 168 BPM, La mineur ═══ */
  id:'plasma', title:'Cœur de Plasma', genre:'Course nocturne', bpm:168, diffLabel:'Difficile',
  base:220, ac:'#c96bff', jumpEvery:8,
  quote:'Le cœur s’est arrêté de battre.',
  scale:[0,2,3,5,7,8,10],                    // La mineur
  chords:[ {r:0,t:[0,3,7]}, {r:8,t:[0,4,7]}, {r:3,t:[0,4,7]}, {r:10,t:[0,4,7]},
            {r:5,t:[0,3,7]}, {r:7,t:[0,4,7]} ], // Am F C G Dm E(maj)
  bass:{ drive:'a.a.a.a.a.a.a.a.', run:'a.a.a.a.a.a.a.o.' },
  drums:{
    soft: { k:'x...x...x...x...', s:'',                 h:'x.x.x.x.x.x.x.x.' },
    main: { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    hard: { k:'x...x...x...x...', s:'....x..x....x..x', h:'x.x.x.x.x.x.x.xx' },
  },
  mel:{
    themeA: { bars:2, n:[[0,4,2],[2,2,1],[4,0,0],[8,4,2],[12,2,1],
                        [16,0,0],[18,2,1],[20,4,2],[24,6,3],[28,4,2]] },  // E C A E C | A C E G E
    themeB: { bars:2, n:[[0,7,3],[2,6,2],[4,4,1],[8,2,0],[12,4,1],
                        [16,4,2],[18,5,3],[20,6,3],[24,4,2],[28,2,1]] },
    dropA:  { bars:2, n:[[0,0,0],[2,3,1],[4,4,2],[6,3,1],[8,0,0],[10,3,1],[12,4,2],
                        [16,4,2],[18,1,1],[20,4,2],[24,1,1],[28,4,2]] },  // tension Am|E (bourdon de quintes)
    brk:    { bars:2, n:[[0,7,3,1],[8,4,2,1],[16,2,1,1],[24,0,0,1]] },
    final:  { bars:2, n:[[0,0,0],[4,4,2],[8,7,3],[12,4,2],[16,6,3],[20,4,2],[24,2,1],[28,4,2]] }, // hymne Am|G
    end:    { bars:2, n:[[0,4,2,1],[8,2,1,1],[16,0,0,1,1]] },
  },
  sections:[
    { bars:4,  prog:[0,1,2,3], pad:1, arp:1, drums:'soft', chart:[[0,0],[8,2]] },
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'drive', drums:'main' },   // Am|F
    { bars:8,  prog:[2,3], pad:1, mel:'themeB', bass:'drive', drums:'main' },   // C|G
    { bars:8,  prog:[0,5], pad:1, mel:'dropA',  bass:'run',  drums:'hard', oct:1 },   // Am|E
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'drive', drums:'hard', oct:1 },
    { bars:12, prog:[0,5], pad:1, mel:'dropA',  bass:'run',  drums:'hard', oct:1, fill:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'brk' },                            // apnée
    { bars:8,  prog:[0,3], pad:1, mel:'final',  bass:'drive', drums:'hard', oct:1, fill:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'end' },
  ],
},
{ /* ═══ 08 · MINUIT PERPÉTUEL — 176 BPM, Do# mineur ═══ */
  id:'minuit', title:'Minuit Perpétuel', genre:'Nightdrive', bpm:176, diffLabel:'Difficile +',
  base:138.59, ac:'#ffd24a', jumpEvery:8,
  quote:'Minuit ne pardonne pas.',
  scale:[0,2,3,5,7,8,10],                    // Do# mineur
  chords:[ {r:0,t:[0,3,7]}, {r:8,t:[0,4,7]}, {r:3,t:[0,4,7]}, {r:10,t:[0,4,7]} ], // C#m A E B
  bass:{ flow:'a.a.a.a.a.a.a.o.', dash:'a.a.aa..a.a.aa..' },
  drums:{
    main: { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    hard: { k:'x...x...x...x.x.', s:'....x..x....x..x', h:'x.x.x.x.x.x.x.x.' },
    lift: { k:'x...x...x...x...', s:'....x...x...x..x', h:'xxxxxxxxxxxxxxxx' },
  },
  mel:{
    themeA: { bars:2, n:[[0,4,2],[2,2,1],[4,0,0],[8,2,1],[12,4,2],
                        [16,6,3],[18,4,2],[20,2,1],[24,3,2],[28,4,3]] },  // pentatonique C#m
    themeB: { bars:2, n:[[0,7,3],[2,6,2],[4,3,1],[8,2,0],[12,3,1],
                        [16,4,2],[20,6,3],[24,4,2],[28,2,1]] },
    rushA:  { bars:2, n:[[0,0,0],[2,3,1],[4,6,2],[6,3,1],[8,0,0],[10,3,1],[12,6,2],
                        [16,6,3],[18,3,2],[20,1,1],[24,6,3],[28,1,1]] }, // torrent C#m|B
    climax: { bars:2, n:[[0,7,3],[2,4,2],[4,2,1],[6,4,2],[8,7,3],[12,4,2],
                        [16,2,1],[18,3,2],[20,4,3],[24,7,3],[26,6,2],[28,4,1]] },
    brk:    { bars:2, n:[[0,7,3,1],[8,6,2,1],[16,4,1,1],[24,2,0,1]] },
    end:    { bars:2, n:[[0,4,2,1],[8,2,1,1],[16,0,0,1,1]] },
  },
  sections:[
    { bars:4,  prog:[0,1,2,3], pad:1, arp:1, drums:'main', chart:[[0,0],[8,2]] },
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'flow', drums:'main' },   // C#m|A
    { bars:8,  prog:[2,3], pad:1, mel:'themeB', bass:'flow', drums:'hard' },   // E|B
    { bars:8,  prog:[0,3], pad:1, mel:'rushA',  bass:'dash', drums:'hard', oct:1 },  // C#m|B
    { bars:8,  prog:[0,1], pad:1, mel:'climax', bass:'flow', drums:'lift' },
    { bars:8,  prog:[0,3], pad:1, mel:'rushA',  bass:'dash', drums:'hard', oct:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'brk' },                           // la nuit retient son souffle
    { bars:12, prog:[0,1], pad:1, mel:'climax', bass:'dash', drums:'lift', oct:1, fill:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'end' },
  ],
},
{ /* ═══ 09 · FINAL STORM — 180 BPM, la tempête, Ré mineur ═══ */
  id:'storm', title:'Final Storm', genre:'Tempête néo-classique', bpm:180, diffLabel:'Intense',
  base:146.83, ac:'#ff7847', jumpEvery:8,
  quote:'La tempête vous a englouti.',
  scale:[0,2,3,5,7,8,10],                    // Ré mineur
  chords:[ {r:0,t:[0,3,7]}, {r:8,t:[0,4,7]}, {r:3,t:[0,4,7]}, {r:7,t:[0,4,7]} ], // Dm Bb F A(maj)
  bass:{ drive:'a.a.a.a.a.a.a.a.', gallop:'a.aaa.aaa.aaa.aa' },
  drums:{
    build: { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    main:  { k:'x...x...x...x...', s:'....x..x....x...', h:'x.x.x.x.x.x.x.x.' },
    storm: { k:'x...x...x...xx..', s:'....x..x....x..x', h:'xxxxxxxxxxxxxxxx' },
  },
  mel:{
    f1:  { bars:2, n:[[0,0,0],[2,3,1],[4,4,2],[8,7,3],[12,3,1],
                     [16,4,2],[18,5,3],[20,4,2],[24,7,3],[28,4,2]] },   // thème héroïque
    f2:  { bars:2, n:[[0,2,0],[2,4,1],[4,6,2],[8,7,3],[12,6,2],
                     [16,4,2],[18,7,3],[20,4,2],[24,1,1],[28,4,2]] },   // réponse (F·A)
    f3:  { bars:2, n:[[0,0,0],[2,3,1],[4,7,2],[6,3,1],[8,0,0],[10,3,1],[12,7,2],
                     [16,5,3],[18,3,2],[20,7,3],[22,3,2],[24,5,3],[26,3,2],[28,0,1]] }, // tourbillon
    f4:  { bars:2, n:[[0,6,1],[2,2,0],[4,4,1],[6,6,2],[8,7,3],[12,6,2],
                     [16,4,1],[18,1,0],[20,4,1],[22,7,2],[24,4,1],[28,1,0]] },         // vagues montantes
    calm:{ bars:2, n:[[0,0,0,1],[8,4,2,1],[16,7,3,1],[24,4,2,1]] },    // l'œil du cyclone
    end: { bars:2, n:[[0,0,0,1],[8,3,1,1],[16,4,2,1],[24,0,0,1,1]] },  // accord final tenu
  },
  sections:[
    { bars:4,  prog:[0,1,2,3], pad:1, arp:1, chart:[[0,0],[8,3]] },
    { bars:8,  prog:[0,1], pad:1, mel:'f1', bass:'drive',  drums:'build' },
    { bars:8,  prog:[2,3], pad:1, mel:'f2', bass:'drive',  drums:'main' },
    { bars:8,  prog:[0,1], pad:1, mel:'f3', bass:'gallop', drums:'storm', oct:1 },
    { bars:8,  prog:[0,1], pad:1, mel:'f3', bass:'gallop', drums:'storm', oct:1, fill:1 },
    { bars:8,  prog:[2,3], pad:1, mel:'f4', bass:'gallop', drums:'storm', oct:1 },
    { bars:8,  prog:[2,3], pad:1, mel:'f2', bass:'gallop', drums:'storm', oct:1, fill:1 },
    { bars:4,  prog:[0,3], pad:1, arp:1, mel:'calm' },                    // l'œil du cyclone
    { bars:8,  prog:[0,1], pad:1, mel:'f3', bass:'gallop', drums:'storm', oct:1 },
    { bars:4,  prog:[0,1], pad:1, mel:'f1', bass:'gallop', drums:'storm', oct:1, fill:1 }, // dernier assaut
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'end' },
  ],
},
{ /* ═══ 10 · SINGULARITÉ — la finale ultime, 192 BPM, La phrygien ═══ */
  id:'singularity', title:'Singularité', genre:'Boss finale', bpm:192, diffLabel:'Extrême',
  base:220, ac:'#ff4d6d', jumpEvery:8,
  snd:{ lead:'square', echo:0.12 },
  quote:'L’horizon des événements vous a happé.',
  scale:[0,1,3,5,7,8,10],                    // La phrygien (Si bémol = couleur sombre)
  chords:[ {r:0,t:[0,3,7]}, {r:1,t:[0,4,7]}, {r:10,t:[0,4,7]}, {r:7,t:[0,4,7]} ], // Am Bb G E(maj)
  bass:{ toll:'h.......h.......', crush:'a.aa.a.aa.a.aa.a' },
  drums:{
    toll:  { k:'x.......x.......', s:'',                 h:'....x.......x...' },
    main:  { k:'x...x...x...x...', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.' },
    burst: { k:'x...x...x...x.x.', s:'....x..x....x..x', h:'x.x.x.x.x.x.x.xx' },
    void:  { k:'x...x...x...x...', s:'....x...x...x...', h:'xxxxxxxxxxxxxxxx' },
  },
  mel:{
    themeA: { bars:2, n:[[0,0,0],[2,1,1],[4,2,2],[8,1,1],[12,0,0],
                        [16,1,2],[20,2,3],[24,1,2],[28,3,3]] },  // motif phrygien obsédant A-Bb-C
    themeB: { bars:2, n:[[0,4,2],[4,2,1],[8,3,2],[12,2,1],
                        [16,0,0],[20,2,1],[24,4,2],[28,2,1]] },  // Am|G
    dropA:  { bars:2, n:[[0,0,0],[2,2,1],[4,3,2],[8,0,0],[10,2,1],[12,3,2],
                        [16,1,3],[18,2,2],[20,3,1],[24,1,2],[26,2,3],[28,3,2]] }, // torrent Am|Bb
    brk:    { bars:2, n:[[0,7,3,1],[8,6,2,1],[16,5,1,1],[24,1,0,1]] },           // descente phrygienne
    end:    { bars:2, n:[[0,0,0,1],[8,1,1,1],[16,0,0,1,1]] },                    // conclusion A-Bb-A tenue
  },
  sections:[
    { bars:4,  prog:[0,1], pad:1, arp:1, drums:'toll', chart:[[0,0],[8,3]] },  // le glas
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'toll',  drums:'toll' },
    { bars:8,  prog:[0,2], pad:1, mel:'themeB', bass:'crush', drums:'main' },   // Am|G
    { bars:8,  prog:[0,1], pad:1, mel:'themeA', bass:'crush', drums:'main', oct:1 },
    { bars:8,  prog:[0,1], pad:1, mel:'dropA',  bass:'crush', drums:'burst', oct:1 },
    { bars:4,  prog:[0,1], pad:1, arp:1, mel:'brk' },                           // le vide
    { bars:12, prog:[0,1], pad:1, mel:'dropA',  bass:'crush', drums:'burst', oct:1, fill:1 },
    { bars:4,  prog:[0,2], pad:1, mel:'themeB', drums:'toll' },                 // dernière respiration
    { bars:12, prog:[0,3], pad:1, mel:'dropA',  bass:'crush', drums:'void',  oct:1, fill:1 }, // Am|E, le cataclysme
    { bars:4,  prog:[0],   pad:1, arp:1, mel:'end' },
  ],
},
];

/* ════════════════════════════════════════════════════════════
   6. COMPILATION — partition → événements audio + chart de jeu
   ════════════════════════════════════════════════════════════ */
const compileCache = {};
// Convertit un index de gamme (degré) en fréquence pour le lead
function degFreq(song, deg){
  const oct = Math.floor(deg/7), st = song.scale[deg%7] + 12*oct;
  return song.base * 2 * Math.pow(2, st/12);   // lead = 1 octave au-dessus de la base
}
function compileSong(song){
  if (compileCache[song.id]) return compileCache[song.id];

  const spb = 60/song.bpm;          // secondes par temps (noire)
  const stepDur = spb/4;            // durée d'un pas (double-croche)
  const barLen = spb*4;             // durée d'une mesure
  const ev = [], rawNotes = [], kicks = [];
  let bar = 0;

  for (const sec of song.sections){
    const melPat = sec.mel ? song.mel[sec.mel] : null;
    for (let b=0; b<sec.bars; b++){
      const barT = bar*barLen;
      const chord = song.chords[ sec.prog[b % sec.prog.length] ];

      // Nappe d'accord (une voix d'accord tenue toute la mesure)
      if (sec.pad)
        ev.push({ t:barT, inst:'pad', semis:chord.t.map(iv=>chord.r+iv), dur:barLen+0.35 });

      // Arpège en croches montantes sur les notes de l'accord
      if (sec.arp){
        const seq = [chord.r, chord.r+7, chord.r+12, chord.r+12+chord.t[1]];
        for (let s=0; s<16; s+=2)
          ev.push({ t:barT+s*stepDur, inst:'arp', st:seq[(s/2)%4] });
      }
      // Ligne de basse (pattern 16 pas — 'a', 'o' ou 'h' tenue)
      if (sec.bass){
        const pat = song.bass[sec.bass];
        for (let s=0; s<16; s++){
          const c = pat[s]; if (c==='.') continue;
          ev.push({ t:barT+s*stepDur, inst:'bass',
                    st:chord.r + (c==='o'?12:0),
                    dur: c==='h' ? stepDur*5 : stepDur*1.8 });
        }
      }
      // Batterie (avec roulement automatique en fin de section marquée fill)
      if (sec.drums){
        const g = song.drums[sec.drums];
        const ss = (sec.fill && b===sec.bars-1) ? '........x.x.xxxx' : g.s;
        for (let s=0; s<16; s++){
          const t = barT + s*stepDur;
          if (g.k[s]==='x'){ ev.push({t, inst:'kick'}); kicks.push(t); }
          if (ss [s]==='x')  ev.push({t, inst:'snare'});
          if (g.h[s]==='x'||g.h[s]==='o') ev.push({t, inst:'hat', open:g.h[s]==='o'});
        }
      }
      // Notes de jeu "manuelles" (intros/breaks) — colonne qui tourne avec la mesure
      if (sec.chart)
        for (const [s,c] of sec.chart)
          rawNotes.push({ t:barT+s*stepDur, col:(c+b)%4, anchor:true, step:s+b*16 });
      // Mélodie = chart : chaque note de lead est une note jouable
      if (melPat){
        const patBar = b % melPat.bars;
        for (const n of melPat.n){
          if (Math.floor(n[0]/16) !== patBar) continue;
          const t = barT + (n[0]%16)*stepDur;
          rawNotes.push({ t, col:n[2], anchor:!!n[3], step:n[0] });
          ev.push({ t, inst:'lead', deg:n[1],
                    dur: n[4] ? stepDur*10 : stepDur*1.7, oct: !!sec.oct });
        }
      }
      bar++;
    }
  }
  ev.sort((a,b)=>a.t-b.t);
  rawNotes.sort((a,b)=>a.t-b.t || a.col-b.col);
  const duration = ev.length ? ev[ev.length-1].t + 1.4 : 0;
  return compileCache[song.id] = { ev, rawNotes, kicks, duration, barLen };
}

/* ── Génération de la chart selon la difficulté (avec cache) ── */
const chartCache = {};
function chartFor(song, diff){
  const key = song.id + ':' + diff;
  if (chartCache[key]) return chartCache[key];
  const raw = compileSong(song).rawNotes;
  let notes;
  if (diff==='facile'){
    // FACILE : on garde les notes ancrées + une note sur deux des autres
    let i = 0;
    notes = raw.filter(n => n.anchor || (i++ % 2) === 0);
  } else {
    notes = raw.slice();               // NORMAL : toutes les notes
  }
  if (diff==='difficile'){
    // DIFFICILE : + notes simultanées sur les temps forts (1 par jumpEvery pas)
    const extra = [];
    for (const n of notes){
      if (n.step % song.jumpEvery !== 0) continue;
      const c2 = (n.col+2)%4;          // colonne "miroir" pour l'accord de doigts
      const busy = notes.some(m => m!==n && m.col===c2 && Math.abs(m.t-n.t)<0.09)
                 || extra.some(m => m.t===n.t && m.col===c2);
      if (!busy) extra.push({ t:n.t, col:c2, anchor:false, step:n.step, twin:true });
    }
    notes = notes.concat(extra).sort((a,b)=>a.t-b.t || a.col-b.col);
  }
  return chartCache[key] = notes;
}

/* ════════════════════════════════════════════════════════════
   7. ÉTAT DE PARTIE & JUGEMENT
   ════════════════════════════════════════════════════════════ */
const G = {
  state:'home',            // home | select | game | result | fail
  running:false, paused:false, finished:false,
  song:null, songIdx:0, diff:'normal',
  ev:[], evIdx:0, kicks:[], kickIdx:0, notes:[], lo:0,
  songStart:0, duration:0,
  score:0, combo:0, maxCombo:0, mult:1, life:100,
  hits:{ parfait:0, bien:0, ok:0, rate:0 },
  deltas:[],               // écarts signés (s) pour l'écart moyen des résultats
  particles:[], floats:[],
  colFlash:[0,0,0,0], padHold:[false,false,false,false],
  shake:0, redFlash:0,
};

// Temps "visuel" : horloge audio moins l'instant de départ moins la latence
// → c'est L'horloge du jeu : rendu ET jugement s'appuient dessus.
function visualNow(){
  if (!actx) return 0;
  const outLat = (actx.outputLatency || actx.baseLatency || 0);
  return actx.currentTime - G.songStart - outLat - CONFIG.BASE_LATENCY - save.offset/1000;
}
// Intensité de pulsation après le dernier kick (pour animer le fond)
function kickPulse(vNow){
  const k = G.kicks;
  while (G.kickIdx+1 < k.length && k[G.kickIdx+1] <= vNow) G.kickIdx++;
  const d = vNow - k[G.kickIdx];
  return (G.kickIdx < k.length && d >= 0) ? Math.exp(-d*7) : 0;
}
function multFor(combo){
  let m = 1;
  for (const [seuil, mult] of CONFIG.MULT) if (combo >= seuil) m = mult;
  return m;
}
function precision(){
  const h = G.hits, tot = h.parfait+h.bien+h.ok+h.rate;
  if (!tot) return 0;
  return (h.parfait + h.bien*0.7 + h.ok*0.4) / tot;
}

/* ── Frappe (déclenchée par le clavier OU par un toucher/clic) ── */
function judgeHit(col){
  if (!G.running || G.paused || G.finished) return;
  const vNow = visualNow();
  G.colFlash[col] = 1;
  sfxTick(col);

  // Cherche la note la plus proche dans la fenêtre OK (±150 ms)
  let best = null, bestAbs = Infinity;
  for (let i=G.lo; i<G.notes.length; i++){
    const n = G.notes[i];
    if (n.t > vNow + CONFIG.WIN.ok + 0.02) break;   // trié : plus rien de proche
    if (n.judged || n.col !== col) continue;
    const d = Math.abs(vNow - n.t);
    if (d <= CONFIG.WIN.ok + 0.02 && d < bestAbs){ best = n; bestAbs = d; }
  }
  if (!best) return;   // frappe "dans le vide" : pas de pénalité (anti-spam inutile)

  best.judged = true;
  G.deltas.push(vNow - best.t);
  const grade = bestAbs <= CONFIG.WIN.parfait ? 'parfait'
              : bestAbs <= CONFIG.WIN.bien   ? 'bien' : 'ok';
  applyJudge(grade, best.col);
}
function applyJudge(grade, col){
  G.hits[grade]++;
  G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
  G.mult = multFor(G.combo);
  G.score += CONFIG.POINTS[grade] * G.mult;
  G.life  = clamp(G.life + CONFIG.LIFE[grade], 0, CONFIG.LIFE.max);

  const padX = padCenterX(col);
  spawnFloat(grade, padX, judgeY - 60, grade);
  if (grade === 'parfait') spawnBurst(padX, judgeY - 14, COLS[col].c);
  comboPop();
}

/* ── Note manquée (détection automatique dans la boucle) ── */
function applyMiss(n, vNow){
  n.judged = true; n.missed = true; n.missAt = vNow;
  G.hits.rate++;
  G.combo = 0; G.mult = 1;
  G.life = clamp(G.life + CONFIG.LIFE.rate, 0, CONFIG.LIFE.max);
  sfxMiss();
  G.redFlash = 1; G.shake = 1;
  spawnFloat('rate', padCenterX(n.col), judgeY - 60, 'rate');
  if (G.life <= 0) failSong();
}

/* ── Mise à jour logique, appelée à chaque frame ── */
function updateGame(vNow){
  // Ratés automatiques : toute note dépassée de +150 ms sans frappe
  for (let i=G.lo; i<G.notes.length; i++){
    const n = G.notes[i];
    if (n.t > vNow - CONFIG.WIN.ok) break;
    if (!n.judged) applyMiss(n, vNow);
  }
  while (G.lo < G.notes.length && G.notes[G.lo].judged) G.lo++;
  // Compte à rebours pendant le délai d'entrée
  const cd = $('#count');
  if (vNow < 0){ cd.textContent = Math.max(1, Math.ceil(-vNow)); cd.style.display='flex'; }
  else cd.style.display='none';
  // Fin du morceau
  if (vNow > G.duration + 1.0) finishSong();
}

/* ── Scheduler audio : programme les sons en avance sur l'horloge.
      Il vit DANS la boucle rAF (aucun setInterval) : la position des
      notes n'en dépend pas — seule ctx.currentTime fait foi. ── */
function scheduleAudio(){
  if (!G.running || G.finished) return;
  const now = actx.currentTime;
  while (G.evIdx < G.ev.length){
    const e = G.ev[G.evIdx];
    const when = G.songStart + e.t;
    if (when >= now + LOOKAHEAD) break;
    playEvent(e, Math.max(when, now + 0.005));
    G.evIdx++;
  }
}
function playEvent(e, t){
  const s = G.song;
  switch(e.inst){
    case 'kick':  playKick(t); break;
    case 'snare': playSnare(t); break;
    case 'hat':   playHat(t, e.open); break;
    case 'bass':  playBass(t, s.base/2 * Math.pow(2, e.st/12), e.dur); break;
    case 'lead':  playLead(t, degFreq(s, e.deg), e.dur, e.oct, s.snd && s.snd.lead); break;
    case 'pad':   playPad(t, e.semis, e.dur, s.base); break;
    case 'arp':   playArp(t, s.base*2 * Math.pow(2, e.st/12)); break;
  }
}

/* ════════════════════════════════════════════════════════════
   8. RENDU CANVAS
   ════════════════════════════════════════════════════════════ */
const bg = $('#bg'),    bctx = bg.getContext('2d');
const field = $('#field'), fctx = field.getContext('2d');
let bw=0, bh=0, fw=0, fh=0, colW=0, hitY=0, judgeY=0, dpr=1;
const JUDGE_Y_OFF = 86;   // hauteur de la zone de frappe depuis le bas
let stars = [], ridge1 = [], ridge2 = [];           // décor du fond
let horizonY=0, skyGrad=null, sunGrad=null, hzGrad=null, sunCX=0, sunCY=0, sunR=0;
// Effets : halo un peu plus discret sur mobile (performance)
const NOTE_BLUR = IS_TOUCH ? 9 : 14;

function resizeAll(){
  // Sur mobile on borne la densité de pixels pour rester fluide à 60 fps
  dpr = Math.min(IS_TOUCH ? 1.75 : 2, window.devicePixelRatio || 1);
  // Fond plein écran
  bw = innerWidth; bh = innerHeight;
  bg.width = bw*dpr; bg.height = bh*dpr;
  bctx.setTransform(dpr,0,0,dpr,0,0);
  // Terrain de jeu
  fw = field.clientWidth || 0; fh = field.clientHeight || 0;
  field.width = fw*dpr; field.height = fh*dpr;
  fctx.setTransform(dpr,0,0,dpr,0,0);
  colW = fw/4; hitY = fh - JUDGE_Y_OFF; judgeY = hitY;
  // Décor du fond (recalculé une seule fois par redimensionnement,
  // pas à chaque frame — les dégradés sont mis en cache)
  horizonY = bh*0.62;
  skyGrad = bctx.createLinearGradient(0,0,0,horizonY);
  skyGrad.addColorStop(0,'#040110'); skyGrad.addColorStop(0.7,'#0c0526'); skyGrad.addColorStop(1,'#180a38');
  hzGrad = bctx.createLinearGradient(0,horizonY-30,0,horizonY+8);
  hzGrad.addColorStop(0,'rgba(255,47,179,0)'); hzGrad.addColorStop(1,'rgba(255,47,179,0.28)');
  sunR = Math.min(bw,bh)*0.17;
  sunCX = bw/2; sunCY = horizonY - sunR*0.18;
  sunGrad = bctx.createLinearGradient(0, sunCY-sunR, 0, sunCY+sunR);
  sunGrad.addColorStop(0,'#ffd75e'); sunGrad.addColorStop(0.55,'#ff6a3d'); sunGrad.addColorStop(1,'#ff2fb3');
  const nStars = Math.round(clamp(bw*bh/9000, 60, 150));
  stars = Array.from({length:nStars}, () => ({
    x:Math.random(), y:Math.random()*0.55, r:Math.random()*1.4+0.4,
    ph:Math.random()*7, sp:Math.random()*2+0.5,
  }));
  ridge1 = makeRidge(0.60, 60, 7);   // montagnes lointaines
  ridge2 = makeRidge(0.66, 44, 5);   // montagnes proches
}
// Génère une ligne de crête déterministe (silhouette de montagnes)
function makeRidge(baseFrac, amp, seg){
  const pts = []; let seed = 7;
  const rnd = () => (seed = (seed*16807) % 2147483647) / 2147483647;
  for (let i=0;i<=seg;i++)
    pts.push({ x:i/seg, y: baseFrac - amp*(0.25 + rnd()*0.75) });
  pts[0].y = pts[seg].y = baseFrac; // bords raccordés à l'horizon
  return pts;
}

/* ── Fond synthwave : soleil strié, montagnes, grille perspective ──
   CORRECTIF GRILLE : l'ancien code faisait défiler les lignes avec un
   modulo (z = (i + frac(t)) % 13) : la ligne la plus proche était
   recyclée alors qu'elle était encore VISIBLE en bas de l'écran →
   téléportation visible vers l'horizon. Le nouveau modèle est celui
   d'une vraie caméra qui avance : chaque ligne vit à une distance
   entière d devant la caméra (d = n − scroll, scroll croît sans fin),
   projetée en y = horizon + H·dMin/d. Une ligne quitte l'écran par le
   bas AVANT que son index ne sorte de la fenêtre de dessin : aucun
   recyclage n'est donc jamais visible, le défilement est continu. ── */
function drawBg(t, pulse){
  // Ciel nocturne (dégradé mis en cache au redimensionnement)
  bctx.fillStyle = skyGrad; bctx.fillRect(0,0,bw,horizonY);
  // Étoiles scintillantes
  for (const s of stars){
    bctx.globalAlpha = 0.35 + 0.6*Math.abs(Math.sin(t*s.sp + s.ph));
    bctx.fillStyle = '#bfe9ff';
    bctx.fillRect(s.x*bw, s.y*bh, s.r, s.r);
  }
  bctx.globalAlpha = 1;
  // Soleil strié (la signature synthwave) — respiration sur le beat
  bctx.save();
  bctx.translate(sunCX, sunCY);
  bctx.scale(1+0.03*pulse, 1+0.03*pulse);
  bctx.beginPath(); bctx.arc(0,0,sunR,0,7); bctx.clip();
  bctx.fillStyle = sunGrad; bctx.fillRect(-sunR,-sunR,sunR*2,sunR*2);
  bctx.fillStyle = '#0c0526';
  let by = sunR*0.05, bh2 = 2;
  while (by < sunR){ bctx.fillRect(-sunR, by, sunR*2, bh2); by += bh2 + 7; bh2 += 1.6; }
  bctx.restore();
  // Montagnes en silhouette
  drawRidge(ridge1, '#08031a');
  drawRidge(ridge2, '#0b0524');
  // Sol + grille perspective
  bctx.fillStyle = '#050213'; bctx.fillRect(0,horizonY,bw,bh-horizonY);
  bctx.save();
  bctx.strokeStyle = 'rgba(0,229,255,0.34)'; bctx.lineWidth = 1;
  // Lignes verticales convergentes (statiques)
  const vp = bw/2;
  for (let i=-11; i<=11; i++){
    bctx.globalAlpha = 0.16 + 0.1*Math.abs(i)/11;
    bctx.beginPath();
    bctx.moveTo(vp + i*26, horizonY);
    bctx.lineTo(vp + i*bw*0.13, bh);
    bctx.stroke();
  }
  // Lignes horizontales : caméra qui avance de `scroll` unités/s.
  // Index infini → jamais de "wrap" au milieu de l'écran.
  bctx.globalAlpha = 1;
  const scroll = t * 1.5;
  const span = bh - horizonY;
  const dMin = 0.5, dMax = 16;                    // fenêtre de distances dessinées
  const n0 = Math.ceil(scroll + dMin);
  const n1 = Math.floor(scroll + dMax);
  for (let n = n0; n <= n1; n++){
    const d = n - scroll;                         // distance devant la caméra
    const k = (dMin / d) * (1 - 0.05*pulse);      // 1 (proche) → ~0 (horizon)
    const y = horizonY + span * k;
    if (y < horizonY + 0.6 || y > bh + 1.5) continue;
    bctx.globalAlpha = 0.05 + 0.5 * k * k;        // fondu vers l'horizon
    bctx.beginPath(); bctx.moveTo(0,y); bctx.lineTo(bw,y); bctx.stroke();
  }
  bctx.restore();
  bctx.globalAlpha = 1;
  // Lueur d'horizon (intensité liée au beat)
  bctx.globalAlpha = 0.45 + 0.55*pulse;
  bctx.fillStyle = hzGrad; bctx.fillRect(0,horizonY-30,bw,38);
  bctx.globalAlpha = 1;
  // En jeu : on assombrit pour laisser la place au terrain
  if (G.state === 'game'){ bctx.fillStyle='rgba(4,1,14,0.55)'; bctx.fillRect(0,0,bw,bh); }
}
function drawRidge(pts, color){
  bctx.fillStyle = color; bctx.beginPath();
  bctx.moveTo(0, pts[0].y*bh);
  for (const p of pts) bctx.lineTo(p.x*bw, p.y*bh);
  bctx.lineTo(bw, horizonY); bctx.lineTo(0, horizonY); bctx.closePath(); bctx.fill();
}

/* ── Terrain de jeu (colonnes, notes, pads, effets) ── */
function padCenterX(col){ return col*colW + colW/2; }
const JUDGE_TEXT = { parfait:['PARFAIT','#00ffe1'], bien:['BIEN','#7dff9e'],
                     ok:['OK','#ffc94a'], rate:['RATÉ','#ff4d6d'] };

function renderField(vNow, dt){
  const c = fctx;
  if (!fw) return;
  c.clearRect(0,0,fw,fh);
  c.save();
  if (G.shake > 0.01){ // tremblement léger sur un raté
    c.translate((Math.random()-0.5)*7*G.shake, (Math.random()-0.5)*7*G.shake);
    G.shake *= Math.exp(-dt*6);
  }
  const pulse = kickPulse(vNow);

  // Fond du terrain + colonnes
  c.fillStyle = 'rgba(6,2,20,0.92)'; c.fillRect(0,0,fw,fh);
  for (let i=0;i<4;i++){
    if (i%2){ c.fillStyle='rgba(255,255,255,0.014)'; c.fillRect(i*colW,0,colW,fh); }
  }
  // Flash de colonne à l'appui (lueur verticale)
  for (let i=0;i<4;i++){
    G.colFlash[i] *= Math.exp(-dt*9);
    const f = G.colFlash[i];
    if (f > 0.02){
      const g = c.createLinearGradient(0,hitY,0,0);
      g.addColorStop(0, COLS[i].c + '66'); g.addColorStop(1, COLS[i].c + '00');
      c.globalAlpha = f; c.fillStyle = g;
      c.fillRect(i*colW+2, 0, colW-4, hitY); c.globalAlpha = 1;
    }
  }
  // Séparateurs de pistes
  c.strokeStyle = 'rgba(0,229,255,0.13)'; c.lineWidth = 1;
  for (let i=1;i<4;i++){ c.beginPath(); c.moveTo(i*colW,0); c.lineTo(i*colW,fh); c.stroke(); }

  // Zone de frappe : ligne + pads qui pulsent sur le kick
  c.shadowColor = '#00e5ff'; c.shadowBlur = 10 + 26*pulse;
  c.strokeStyle = `rgba(0,229,255,${0.35+0.5*pulse})`; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0,hitY); c.lineTo(fw,hitY); c.stroke();
  c.shadowBlur = 0;
  for (let i=0;i<4;i++){
    const px = i*colW+7, pw = colW-14, ph = 44, py = hitY-ph/2;
    const held = G.padHold[i], fl = G.colFlash[i];
    c.beginPath(); rr(c, px, py, pw, ph, 8);
    if (held || fl > 0.05){
      c.fillStyle = COLS[i].c; c.globalAlpha = held ? 0.85 : 0.25+0.5*fl;
      c.fill(); c.globalAlpha = 1;
      c.shadowColor = COLS[i].c; c.shadowBlur = 18*fl + (held?12:0);
      c.strokeStyle = COLS[i].c; c.stroke(); c.shadowBlur = 0;
    } else {
      c.fillStyle = 'rgba(8,4,26,0.9)'; c.fill();
      c.strokeStyle = COLS[i].c + (pulse>0.4 ? 'ff' : '88');
      c.lineWidth = 1.5; c.stroke();
    }
    // Lettre de la touche — affichée uniquement sur ordinateur (clavier physique)
    if (!IS_TOUCH){
      c.fillStyle = (held||fl>0.05) ? '#0a0620' : COLS[i].c;
      c.font = '700 17px ' + getComputedStyle(document.body).getPropertyValue('--f-mono');
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(COLS[i].label, px+pw/2, py+ph/2+1);
    }
  }

  // ── Notes ──
  const approach = CONFIG.APPROACH[G.diff];
  const speed = (hitY + 80) / approach;       // px/s : vitesse de chute
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i=G.lo; i<G.notes.length; i++){
    const n = G.notes[i];
    if (n.t > vNow + approach + 0.25) break;  // encore trop haut sur l'écran
    let alpha = 1;
    if (n.judged){
      if (!n.missed) continue;                // frappée : disparaît
      const age = vNow - n.missAt;            // ratée : s'efface en tombant
      if (age > 0.3) continue;
      alpha = 0.28*(1-age/0.3);
    }
    const y = hitY - (n.t - vNow)*speed;
    if (y < -30 || y > fh+30) continue;
    const x = n.col*colW + 13, w = colW-26, h = 20;
    c.globalAlpha = alpha;
    c.shadowColor = COLS[n.col].c; c.shadowBlur = NOTE_BLUR;
    c.fillStyle = COLS[n.col].c;
    c.beginPath(); rr(c, x, y-h/2, w, h, 6); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.85)';   // cœur brillant
    c.beginPath(); rr(c, x+5, y-h/2+5, w-10, h-10, 3); c.fill();
    c.globalAlpha = 1;
  }

  // ── Particules d'éclats (PARFAIT) ──
  for (let i=G.particles.length-1; i>=0; i--){
    const p = G.particles[i];
    p.life -= dt; if (p.life <= 0){ G.particles.splice(i,1); continue; }
    p.vy += 950*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    c.globalAlpha = clamp(p.life/p.max, 0, 1);
    c.strokeStyle = p.col; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x - p.vx*0.03, p.y - p.vy*0.03);   // étincelle orientée
    c.stroke();
    c.globalAlpha = 1;
  }
  // ── Textes flottants de jugement ──
  for (let i=G.floats.length-1; i>=0; i--){
    const f = G.floats[i];
    const age = (performance.now()/1000) - f.t0;
    if (age > 0.75){ G.floats.splice(i,1); continue; }
    c.globalAlpha = 1 - age/0.75;
    c.font = 'italic 700 20px ' + getComputedStyle(document.body).getPropertyValue('--f-disp');
    c.fillStyle = JUDGE_TEXT[f.grade][1];
    c.shadowColor = JUDGE_TEXT[f.grade][1]; c.shadowBlur = 12;
    c.fillText(JUDGE_TEXT[f.grade][0], f.x, f.y - age*46);
    c.shadowBlur = 0; c.globalAlpha = 1;
  }
  c.restore();
  // Voile rouge bref sur un raté
  if (G.redFlash > 0.02){
    c.fillStyle = `rgba(255,40,80,${0.14*G.redFlash})`;
    c.fillRect(0,0,fw,fh);
    G.redFlash *= Math.exp(-dt*5);
  }
}
// Rectangle arrondi portable
function rr(c,x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
// Effets : éclats de particules + texte flottant
function spawnBurst(x,y,col){
  const N = IS_TOUCH ? 14 : 18;   // un peu moins de particules sur mobile
  for (let i=0;i<N;i++){
    const a = Math.random()*Math.PI*2, sp = 220+Math.random()*380;
    G.particles.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-160,
                       life:0.45+Math.random()*0.2, max:0.6, col });
  }
}
function spawnFloat(grade, x, y, g){ G.floats.push({ grade:g, x, y, t0:performance.now()/1000 }); }

/* ════════════════════════════════════════════════════════════
   9. HUD — mise à jour DOM (avec caches anti-réécriture)
   ════════════════════════════════════════════════════════════ */
const hudCache = {};
function setText(sel, txt){ if (hudCache[sel] !== txt){ hudCache[sel] = txt; $(sel).textContent = txt; } }
function updateHUD(vNow){
  setText('#hud-score', fmt(G.score));
  const m = '×'+G.mult;
  if (hudCache.mult !== m){
    hudCache.mult = m;
    const el = $('#hud-mult'); el.textContent = m;
    el.className = 'm'+G.mult;
  }
  // Combo : grossit avec la valeur, pop à chaque frappe
  const cn = $('#combo');
  cn.classList.toggle('zero', G.combo === 0);
  setText('#combo-n', String(G.combo));
  cn.style.transform = `scale(${1 + Math.min(G.combo,60)*0.006})`;
  // Vie
  const life = Math.round(G.life);
  if (hudCache.life !== life){
    hudCache.life = life;
    $('#hud-life-fill').style.width = life+'%';
    $('#hud-life').classList.toggle('low', life < 30);
  }
  // Progression de la chanson
  const pr = clamp(vNow/G.duration, 0, 1)*100;
  if (hudCache.pr !== Math.round(pr)){
    hudCache.pr = Math.round(pr);
    $('#hud-progress-fill').style.width = pr+'%';
  }
}
function comboPop(){
  const cn = $('#combo');
  cn.classList.remove('pop'); void cn.offsetWidth;  // relance l'animation CSS
  cn.classList.add('pop');
}

/* ════════════════════════════════════════════════════════════
   10. MENUS & NAVIGATION
   ════════════════════════════════════════════════════════════ */
function showScreen(name){
  G.state = name;
  document.body.dataset.state = name;
  for (const s of $$('.screen')) s.classList.remove('show');
  $('#scr-'+name).classList.add('show');
  if (name === 'select') renderSelect();
  if (name !== 'game'){ resizeAllSoon(); refreshLevelUI(); }
}
let resizeTimer = null;
function resizeAllSoon(){ clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeAll, 30); }

/* ── Niveau / XP affiché dans les menus ── */
function refreshLevelUI(){
  const info = levelInfo(save.xp);
  for (const lvl of $$('.lvl')){
    lvl.querySelector('.lvl-badge b').textContent = info.level;
    lvl.querySelector('.lvl-fill').style.width = info.pct+'%';
    lvl.querySelector('.lvl-xp').textContent = `${Math.floor(save.xp)} XP`;
  }
}

/* ── Petites médailles SVG (tracklist) ── */
function medalSVG(m, size=20){
  const col = MEDAL_COLORS[m] || '#3a3660';
  return `<svg width="${size}" height="${size*1.2}" viewBox="0 0 20 24" aria-hidden="true">
    <path d="M6 0 L10 6.5 L14 0 L12.6 0 L10 4 L7.4 0 Z" fill="${col}"/>
    <circle cx="10" cy="15.5" r="7.4" fill="#0d0827" stroke="${col}" stroke-width="2"/>
    <circle cx="10" cy="15.5" r="4" fill="none" stroke="${col}" stroke-width="1.1" opacity="0.65"/>
  </svg>`;
}
/* Grande médaille animée de l'écran de résultat */
function bigMedalSVG(m){
  const col = MEDAL_COLORS[m];
  return `<svg class="big-medal" width="120" height="150" viewBox="0 0 80 100">
    <path d="M30 2 L40 32 L20 46 L14 16 Z" fill="${col}" opacity="0.9"/>
    <path d="M50 2 L40 32 L60 46 L66 16 Z" fill="${col}" opacity="0.75"/>
    <circle cx="40" cy="64" r="27" fill="#0d0827" stroke="${col}" stroke-width="4"/>
    <circle cx="40" cy="64" r="19.5" fill="none" stroke="${col}" stroke-width="1.6" opacity="0.7"/>
    <path d="M44.5 50 L33 67.5 H39.5 L36.5 79 L48.5 61.5 H41.5 Z" fill="${col}"/>
  </svg>`;
}

/* ── Tracklist (sélection de chanson, déblocage en chaîne) ── */
function renderSelect(){
  const wrap = $('#tracks');
  wrap.innerHTML = '';
  SONGS.forEach((song, idx) => {
    const compiled = compileSong(song);
    const unlocked = canPlay(idx);
    const div = document.createElement('div');
    div.className = 'track' + (unlocked ? '' : ' locked');
    div.style.setProperty('--ac', song.ac);

    // Meilleures performances (toutes difficultés)
    const b = save.best[song.id] || {};
    const bestAny = ['facile','normal','difficile']
      .map(d => b[d]).filter(Boolean).sort((x,y)=>y.score-x.score)[0];
    const medal = bestMedalOf(song.id);
    const isNew = unlocked && !save.seenIds[song.id];

    let sideHTML;
    if (!unlocked){
      sideHTML = `<span class="lock-msg">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 10V8a6 6 0 0 1 12 0v2h1.5v12h-15V10Zm2 0h8V8a4 4 0 0 0-8 0Z" fill="currentColor"/></svg>
        Médaille requise sur «&nbsp;${SONGS[idx-1].title}&nbsp;»</span>`;
    } else {
      sideHTML = `
        <span class="track-best">${bestAny ? fmt(bestAny.score) : '—'}</span>
        <span class="track-medal-row">${medal ? medalSVG(medal) + `<span>${MEDAL_NAMES[medal]}</span>` : '<span>pas de médaille</span>'}</span>
        ${isNew ? '<span class="newtag">NOUVEAU</span>' : ''}`;
    }
    const durS = Math.round(compiled.duration);
    div.innerHTML = `
      <div class="track-main">
        <div class="track-num">${String(idx+1).padStart(2,'0')}</div>
        <div class="track-info">
          <h3>${song.title} ${unlocked ? '' : '— VERROUILLÉE'}</h3>
          <div class="meta">${song.genre} · ${song.bpm} BPM · ${Math.floor(durS/60)}:${String(durS%60).padStart(2,'0')} · ${song.diffLabel}</div>
        </div>
        <div class="track-side">${sideHTML}</div>
      </div>
      <div class="diffs"><div class="diffs-inner"></div></div>`;

    if (unlocked){
      const main = div.querySelector('.track-main');
      main.addEventListener('click', () => {
        sfxUI();
        const wasOpen = div.classList.contains('open');
        $$('.track').forEach(t => t.classList.remove('open'));
        if (!wasOpen){ div.classList.add('open'); save.seenIds[song.id] = true; writeSave(); }
      });
      // Boutons de difficulté dans le panneau déplié
      const inner = div.querySelector('.diffs-inner');
      for (const d of ['facile','normal','difficile']){
        const chart = chartFor(song, d);
        const best = (save.best[song.id]||{})[d];
        const btn = document.createElement('button');
        btn.className = 'diff-btn';
        btn.innerHTML = `
          <div class="d-name">${DIFF_LABEL[d]}</div>
          <div class="d-meta">${chart.length} notes · chute ${CONFIG.APPROACH[d].toFixed(2).replace('.',',')} s</div>
          <div class="d-best">${best ? 'Record '+fmt(best.score)+(best.medal?' · '+MEDAL_NAMES[best.medal]:'') : 'Jamais joué'}</div>`;
        btn.addEventListener('click', e => { e.stopPropagation(); sfxUI(); startGame(idx, d); });
        inner.appendChild(btn);
      }
    }
    wrap.appendChild(div);
  });
}

/* ── Démarrage / arrêt d'une partie ── */
function startGame(songIdx, diff){
  ensureAudio();
  const song = SONGS[songIdx];
  const compiled = compileSong(song);
  // État runtime : les notes sont clonées (chartFor est partagée/mise en cache)
  const notes = chartFor(song, diff).map(n => ({ t:n.t, col:n.col, step:n.step, judged:false, missed:false, missAt:0 }));
  Object.assign(G, {
    song, songIdx, diff,
    ev: compiled.ev, evIdx: 0,
    kicks: compiled.kicks, kickIdx: 0,
    notes, lo: 0,
    duration: compiled.duration, songStart: 0,
    score:0, combo:0, maxCombo:0, mult:1, life:CONFIG.LIFE.max,
    hits:{parfait:0,bien:0,ok:0,rate:0}, deltas:[],
    particles:[], floats:[], colFlash:[0,0,0,0],
    shake:0, redFlash:0,
    running:true, paused:false, finished:false,
  });
  // Timbre de la chanson : tempo de l'écho + niveau de réverbe
  delayNode.delayTime.value = (60/song.bpm) * 0.75;
  delayWet.gain.value = (song.snd && song.snd.echo != null) ? song.snd.echo : 0.20;
  duckMaster(false);                        // remonte le volume général
  showScreen('game');
  resizeAll();
  // L'horloge de référence : l'instant "zéro musical" sur l'horloge AUDIO
  G.songStart = actx.currentTime + CONFIG.LEAD_IN;
  Object.keys(hudCache).forEach(k => delete hudCache[k]);
  updateHUD(0);
}
function stopSong(){
  G.running = false;
  stopAllSources();
  duckMaster(true);
}
function failSong(){
  G.finished = true;
  stopSong();
  $('#fail-quote').textContent = '« ' + G.song.quote + ' »';
  showScreen('fail');
  jingle(0);
}
function finishSong(){
  if (G.finished) return;
  G.finished = true;
  stopSong();

  const acc = precision();
  const total = G.hits.parfait + G.hits.bien + G.hits.ok + G.hits.rate;
  // Médaille (seuils dans CONFIG.MEDALS)
  let medal = 0;
  for (const [seuil, m] of CONFIG.MEDALS) if (acc >= seuil){ medal = Math.max(medal, m); break; }

  // ── Sauvegarde du record ──
  const id = G.song.id;
  save.best[id] = save.best[id] || {};
  const prev = save.best[id][G.diff];
  const isBest = !prev || G.score > prev.score;
  if (isBest)
    save.best[id][G.diff] = { score:G.score, acc:Math.round(acc*1000)/10, medal };
  else if (medal > prev.medal) prev.medal = medal;   // médaille conservée au mieux

  // ── XP & niveau ──
  const before = levelInfo(save.xp);
  const xpGain = Math.max(1, Math.round(G.score / CONFIG.XP_PER_POINTS));
  save.xp += xpGain;
  const after = levelInfo(save.xp);
  writeSave();

  // ── Remplissage de l'écran de résultat ──
  setText('#res-song', G.song.title.toUpperCase());
  setText('#res-diff', DIFF_LABEL[G.diff]);
  setText('#res-acc', Math.round(acc*100) + '%');
  setText('#res-combo', String(G.maxCombo));
  setText('#r-p', String(G.hits.parfait));
  setText('#r-b', String(G.hits.bien));
  setText('#r-o', String(G.hits.ok));
  setText('#r-m', String(G.hits.rate));
  setText('#res-xp-txt', '+' + xpGain + ' XP');
  $('#res-newbest').classList.toggle('show', isBest && !!total);
  $('#res-levelup').classList.toggle('show', after.level > before.level);
  // Médaille animée (ou mention sobre si aucune)
  $('#res-medal').innerHTML = medal
    ? bigMedalSVG(medal) + `<p class="medal-caption" style="color:${MEDAL_COLORS[medal]}">MÉDAILLE DE ${MEDAL_NAMES[medal]}</p>`
    : '<span class="medal-none">PRÉCISION INSUFFISANTE — AUCUNE MÉDAILLE</span>';
  // Écart moyen des frappes (pédagogie de calibrage)
  const avgMs = G.deltas.length
    ? Math.round((G.deltas.reduce((a,b)=>a+b,0)/G.deltas.length)*1000) : 0;
  setText('#res-delta', avgMs === 0 ? '0 ms'
    : Math.abs(avgMs) + ' ms ' + (avgMs < 0 ? 'd’avance' : 'de retard'));

  showScreen('result');
  resizeAllSoon();
  animateNumber($('#res-score'), G.score, 900);
  // Barre d'XP : on rejoue la montée du niveau
  const bar = $('#res-xp-fill');
  bar.style.transition = 'none';
  bar.style.width = before.pct + '%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = '';
    bar.style.width = after.pct + '%';
  }));
  jingle(medal);
}
function animateNumber(el, to, dur){
  const t0 = performance.now();
  (function step(){
    const k = clamp((performance.now()-t0)/dur, 0, 1);
    el.textContent = fmt(to * (1-Math.pow(1-k,3)));   // easing cubique
    if (k < 1) requestAnimationFrame(step);
  })();
}

/* ── Pause : suspension propre de l'AudioContext ── */
function setPause(on){
  if (G.state !== 'game' || G.finished || G.paused === on) return;
  G.paused = on;
  $('#overlay-pause').classList.toggle('show', on);
  if (on) actx.suspend(); else actx.resume();   // fige aussi ctx.currentTime → tout reste synchrone
}

/* ════════════════════════════════════════════════════════════
   11. ENTRÉES — clavier, pointeur (tactile/souris), calibrage
   ════════════════════════════════════════════════════════════ */

/* ── Clavier ── */
document.addEventListener('keydown', e => {
  // Frappes de jeu (D F J K) — maintien visuel du pad + jugement
  const colIdx = COLS.findIndex(c => c.k === e.code);
  if (colIdx >= 0){
    if (G.state === 'game'){
      e.preventDefault();
      if (!e.repeat){ G.padHold[colIdx] = true; judgeHit(colIdx); }
    }
    return;
  }
  // Espace : tapping de calibrage
  if (e.code === 'Space' && calib.on){
    e.preventDefault();
    registerCalibTap();
    return;
  }
  switch (e.code){
    case 'Escape':
      e.preventDefault();
      if (G.state === 'game') setPause(!G.paused);
      else if (G.state === 'select') showScreen('home');
      else if (G.state === 'result' || G.state === 'fail') showScreen('select');
      break;
    case 'Enter':
      e.preventDefault();
      if (G.state === 'home'){ ensureAudio(); sfxUI(); showScreen('select'); }
      else if (G.state === 'result' || G.state === 'fail'){ sfxUI(); startGame(G.songIdx, G.diff); }
      break;
  }
});
document.addEventListener('keyup', e => {
  const colIdx = COLS.findIndex(c => c.k === e.code);
  if (colIdx >= 0) G.padHold[colIdx] = false;
});

/* ── Pointeur : tactile multi-doigts ET souris (Pointer Events).
      Le terrain est divisé en 4 zones = 4 colonnes. Chaque doigt
      "possède" la colonne où il a atterri (elle ne change pas s'il
      glisse : évite les frappes fantômes entre pistes). La capture
      du pointeur garantit de recevoir pointerup même hors canvas. ── */
const touchMap = new Map();   // pointerId → colonne
const fieldWrap = $('#field');

function colFromPointer(e){
  const r = field.getBoundingClientRect();
  return clamp(Math.floor((e.clientX - r.left) / (r.width/4)), 0, 3);
}
fieldWrap.addEventListener('pointerdown', e => {
  if (G.state !== 'game' || G.paused || G.finished) return;
  e.preventDefault();
  ensureAudio();                        // geste utilisateur : audio autorisé
  try{ fieldWrap.setPointerCapture(e.pointerId); }catch(err){}
  const col = colFromPointer(e);
  touchMap.set(e.pointerId, col);
  G.padHold[col] = true;
  judgeHit(col);
});
function releasePointer(e){
  const col = touchMap.get(e.pointerId);
  if (col === undefined) return;
  touchMap.delete(e.pointerId);
  // On n'éteint le pad que si plus aucun doigt ne tient cette colonne
  if (![...touchMap.values()].includes(col)) G.padHold[col] = false;
}
fieldWrap.addEventListener('pointerup', releasePointer);
fieldWrap.addEventListener('pointercancel', releasePointer);
fieldWrap.addEventListener('contextmenu', e => e.preventDefault());

/* ── Calibrage : mesure de la latence par tapping sur 8 tics ── */
const calib = { on:false, ticks:[], taps:[], timer:null };
 $('#btn-calib').addEventListener('click', () => {
  ensureAudio();
  calib.on = true; calib.ticks = []; calib.taps = [];
  const status = $('#calib-status');
  $('#btn-calib-apply').classList.add('hidden');
  status.innerHTML = 'Prêt… tapez <b>en rythme</b> sur chaque tic (Espace ou toucher).';
  // Les 8 tics sont programmés sur l'horloge audio dès le départ
  const t0 = actx.currentTime + 1.2;
  for (let i=0;i<8;i++){
    const t = t0 + i*0.6;                    // 100 BPM
    calib.ticks.push(t);
    const o = actx.createOscillator(); o.type='square'; o.frequency.value = 1200;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.05);
    o.connect(g).connect(master); o.start(t); o.stop(t+0.06); trackSrc(o);
  }
  calib.timer = setTimeout(() => {
    // Résultat : moyenne des écarts frappe − tic (le 1er tap est écarté)
    const taps = calib.taps.slice(1);
    calib.on = false;
    if (taps.length < 3){ status.textContent = 'Pas assez de frappes — réessayez.'; return; }
    const avg = taps.reduce((a,b)=>a+b,0)/taps.length;      // en secondes
    const ms = clamp(Math.round(avg*1000/5)*5, -150, 150);  // arrondi à 5 ms
    status.innerHTML = `Écart moyen mesuré&nbsp;: <b>${Math.round(avg*1000)} ms</b><br>Offset conseillé&nbsp;: <b>${ms} ms</b>`;
    const applyBtn = $('#btn-calib-apply');
    applyBtn.classList.remove('hidden');
    applyBtn.onclick = () => {
      save.offset = ms; writeSave();
      $('#opt-offset').value = ms;
      $('#opt-offset-val').textContent = ms + ' ms';
      applyBtn.classList.add('hidden');
      status.textContent = 'Calibrage appliqué.';
      sfxUI();
    };
  }, (1.2 + 8*0.6 + 0.8) * 1000);
});
// Enregistrer une frappe de calibrage (Espace ou toucher de la zone)
function registerCalibTap(){
  if (!calib.on || !actx) return;
  const t = actx.currentTime;
  let best = Infinity;
  for (const tk of calib.ticks){ const d = t-tk; if (Math.abs(d) < Math.abs(best)) best = d; }
  if (Math.abs(best) < 0.3) calib.taps.push(best);
  $('#calib-status').innerHTML = `Frappe ${calib.taps.length}/8 enregistrée…`;
}
 $('#calib-zone').addEventListener('pointerdown', e => {
  if (!calib.on) return;
  e.preventDefault();
  registerCalibTap();
});

/* ════════════════════════════════════════════════════════════
   12. BOUCLE PRINCIPALE, BOUTONS & INITIALISATION
   ════════════════════════════════════════════════════════════ */
let lastFrame = performance.now();
function frame(){
  const now = performance.now();
  const dt = Math.min(0.05, (now-lastFrame)/1000);   // borne anti-saut
  lastFrame = now;
  const wallT = now/1000;

  if (G.state === 'game' && G.running){
    const vNow = visualNow();
    scheduleAudio();        // programme les sons à venir (lookahead sur l'horloge audio)
    if (!G.paused && !G.finished){
      updateGame(vNow);
      updateHUD(vNow);
    }
    renderField(vNow, dt);
    drawBg(wallT, G.paused ? 0 : kickPulse(vNow));
  } else {
    // Menus : le fond respire sur un tempo fantôme de 100 BPM
    drawBg(wallT, Math.exp(-((wallT*100/60)%1)*5));
  }
  requestAnimationFrame(frame);
}

/* ── Boutons ── */
 $('#btn-start').addEventListener('click', () => { ensureAudio(); sfxUI(); showScreen('select'); });
 $('#btn-back-home').addEventListener('click', () => { sfxUI(); showScreen('home'); });
 $('#btn-pause').addEventListener('click', () => { ensureAudio(); sfxUI(); setPause(true); });
 $('#btn-resume').addEventListener('click', () => { sfxUI(); setPause(false); });
 $('#btn-restart').addEventListener('click', () => { sfxUI(); setPause(false); stopSong(); startGame(G.songIdx, G.diff); });
 $('#btn-quit').addEventListener('click', () => { sfxUI(); setPause(false); stopSong(); showScreen('select'); });
 $('#btn-replay').addEventListener('click', () => { sfxUI(); startGame(G.songIdx, G.diff); });
 $('#btn-res-menu').addEventListener('click', () => { sfxUI(); showScreen('select'); });
 $('#btn-retry').addEventListener('click', () => { sfxUI(); startGame(G.songIdx, G.diff); });
 $('#btn-fail-menu').addEventListener('click', () => { sfxUI(); showScreen('select'); });

/* ── Modale options ── */
const modal = $('#modal-options');
 $('#btn-options').addEventListener('click', () => { ensureAudio(); sfxUI(); syncOptionsUI(); modal.classList.add('show'); });
 $('#btn-close-opt').addEventListener('click', () => { sfxUI(); modal.classList.remove('show'); });
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
function syncOptionsUI(){
  $('#opt-vol').value = Math.round(save.vol*100);
  $('#opt-vol-val').textContent = Math.round(save.vol*100)+'%';
  $('#opt-offset').value = save.offset;
  $('#opt-offset-val').textContent = save.offset+' ms';
}
 $('#opt-vol').addEventListener('input', e => {
  save.vol = e.target.value/100;
  $('#opt-vol-val').textContent = e.target.value+'%';
  if (actx) master.gain.setTargetAtTime(save.vol, actx.currentTime, 0.03);
  writeSave();
});
 $('#opt-offset').addEventListener('input', e => {
  save.offset = Number(e.target.value);
  $('#opt-offset-val').textContent = save.offset+' ms';
  writeSave();
});

/* ── Divers : redimensionnement, pause auto si l'onglet perd le focus ── */
window.addEventListener('resize', resizeAllSoon);
window.addEventListener('orientationchange', () => setTimeout(resizeAll, 250));
window.addEventListener('blur', () => { if (G.state==='game' && G.running && !G.finished) setPause(true); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state==='game' && G.running && !G.finished) setPause(true);
});

/* ── Démarrage ── */
loadSave();
resizeAll();
refreshLevelUI();
// Textes adaptés au périphérique (clavier ou écran tactile)
 $('#btn-start-label').textContent = IS_TOUCH ? 'TOUCHER POUR COMMENCER' : 'ENTRÉE POUR COMMENCER';
 if (IS_TOUCH) $('#tagline').textContent = 'Frappez les notes en rythme en touchant les colonnes.';
 $('#game-hint').innerHTML = IS_TOUCH
  ? 'Touchez les <b>colonnes</b> en rythme — bouton <b>PAUSE</b> en haut à droite'
  : '<b>D</b> · <b>F</b> · <b>J</b> · <b>K</b> — <b>Échap</b>&nbsp;: pause';
requestAnimationFrame(frame);