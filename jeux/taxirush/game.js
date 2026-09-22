/* =========================================================================
   TAXI RUSH — jeu de course de taxi arcade 3D (Three.js r128)
   -------------------------------------------------------------------------
   1.  Config, utilitaires, sauvegarde locale
   2.  Audio procédural (WebAudio, bus moteur / effets)
   3.  Scène, lumières, resize
   4.  Textures procédurales + fusion de géométries
   5.  Terrain vallonné (avec la "Butte" à fort dénivelé) + réseau routier
       (rues manquantes → cours, rond-points) + hauteur du sol (trottoirs
       épousant le relief, bordures franchissables)
   6.  Sol, plateaux (trottoirs/parcs/cours) avec murets de bordure
   7.  Immeubles (socles en pierre), magasins, maisons (inclinées selon
       la pente), arbres, bancs, rambardes, lampadaires, panneaux, feux,
       rond-points, monument de la Butte, marquages, murets périphériques
   8.  Le taxi (physique arcade, secousse de trottoir)
   9.  Trafic : réseau de segments, virages en arcs, rond-points, garées
   10. Piétons
   11. Clients + destination colorée (vert → rouge)
   12. Zone de dépôt + effets
   13. HUD
   14. Menus (options, statistiques)
   15. Déroulement de la partie
   16. Entrées + boucle principale
   NB : 1 unité monde = 1 mètre. Contrôles via e.code (ZQSD et WASD).
   ========================================================================= */
'use strict';

/* ================= 1. CONFIG, UTILITAIRES, SAUVEGARDE ================= */
const CONF = {
  GRID: 16, CELL: 64, ROAD: 22,
  TAXI_RADIUS: 1.6,
  ACCEL: 27, BRAKE: 46, REV_ACCEL: 15,
  MAX_SPEED: 36, MAX_REV: 13, DRAG: 0.78, YAW_RATE: 2.05,
  PICKUP_RADIUS: 7.5, PICKUP_TIME: 1.4, PICKUP_SPEED: 3.2, DROP_RADIUS: 8.4,
  CLIENTS: 22, MAX_MOVING: 600, MAX_PARKED: 200, PEDS: 520,
};
const HALF = CONF.GRID * CONF.CELL / 2;   // 512 → carte de 1024 m
const BLOCK = CONF.CELL - CONF.ROAD;      // 42
const HB = BLOCK / 2, RH = CONF.ROAD / 2; // 21, 11
const LANE_OFF = 3.6, PARK_OFF = 8.4;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

/* --- Persistance --- */
const DEF_OPT = { start: 60, tmult: 100, traffic: 55, volM: 80, volE: 55, volF: 85 };
const DEF_STATS = { games: 0, rides: 0, earned: 0, best: 0, dist: 0, time: 0, near: 0, cars: 0, peds: 0, tips: 0, bestTip: 0 };
function loadJSON(k){ try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
const store = {
  opt:   Object.assign({}, DEF_OPT, loadJSON('tr_opt')),
  stats: Object.assign({}, DEF_STATS, loadJSON('tr_stats')),
};
const saveOpt   = () => localStorage.setItem('tr_opt', JSON.stringify(store.opt));
const saveStats = () => localStorage.setItem('tr_stats', JSON.stringify(store.stats));

/* Premier lancement sur écran tactile : trafic réduit par défaut (perf) */
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (IS_TOUCH && !localStorage.getItem('tr_opt')){
  store.opt.traffic = 35;
  saveOpt();
}

const state = {
  mode: 'menu', phase: 'roaming', gameMode: { type: 'classic' },
  money: 0, rides: 0, timeLeft: 0,
  courseTime: 0, courseTotal: 1, courseDist: 0, fare: 0, tip: 0,
  odo: 0, serviceTime: 0, onBoard: null, pickupProgress: 0,
  run: { near: 0, cars: 0, peds: 0, tips: 0, bestTip: 0 },
};

/* ================= 2. AUDIO PROCÉDURAL ================= */
class Sfx {
  constructor(){ this.ready = false; this.muted = false; this.vol = { m: 1, e: 1, f: 1 }; }
  init(){
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.busEng = ctx.createGain(); this.busEng.connect(this.master);
    this.busFx  = ctx.createGain(); this.busFx.connect(this.master);
    /* Moteur : 2 scies désaccordées + sous-octave carrée → saturation
       douce → passe-bas. LFO de trémolo, et engine() simule une boîte
       5 rapports (le régime monte puis retombe à chaque passage). */
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass'; this.engFilter.Q.value = 0.9;
    this.engShaper = ctx.createWaveShaper();
    {
      const n = 256, curve = new Float32Array(n);
      for (let i = 0; i < n; i++){
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 2.4);
      }
      this.engShaper.curve = curve;
    }
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    this.engFilter.connect(this.engShaper);
    this.engShaper.connect(this.engGain);
    this.engGain.connect(this.busEng);
    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth';
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'sawtooth';
    this.osc3 = ctx.createOscillator(); this.osc3.type = 'square';
    this.mix1 = ctx.createGain(); this.mix1.gain.value = 0.45;
    this.mix2 = ctx.createGain(); this.mix2.gain.value = 0.45;
    this.mix3 = ctx.createGain(); this.mix3.gain.value = 0.3;
    this.osc1.connect(this.mix1); this.osc2.connect(this.mix2); this.osc3.connect(this.mix3);
    this.mix1.connect(this.engFilter); this.mix2.connect(this.engFilter); this.mix3.connect(this.engFilter);
    this.osc1.start(); this.osc2.start(); this.osc3.start();
    this.engLfo = ctx.createOscillator(); this.engLfo.type = 'sine';
    this.lfoDepth = ctx.createGain(); this.lfoDepth.gain.value = 0;
    this.engLfo.connect(this.lfoDepth);
    this.lfoDepth.connect(this.engGain.gain);
    this.engLfo.start();
    this.rpm = 0.12;
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.skidSrc = ctx.createBufferSource(); this.skidSrc.buffer = this.noiseBuf; this.skidSrc.loop = true;
    this.skidFilter = ctx.createBiquadFilter(); this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 760; this.skidFilter.Q.value = 1.1;
    this.skidGain = ctx.createGain(); this.skidGain.gain.value = 0;
    this.skidSrc.connect(this.skidFilter); this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.busFx); this.skidSrc.start();
    this.hornGain = ctx.createGain(); this.hornGain.gain.value = 0; this.hornGain.connect(this.busFx);
    [392, 494].forEach(f => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.5;
      o.connect(g); g.connect(this.hornGain); o.start();
    });
    this.ready = true;
    this.applyVol();
  }
  resume(){ if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setVolumes(m, e, f){ this.vol = { m, e, f }; this.applyVol(); }
  applyVol(){
    if (!this.ready) return;
    const t = this.ctx.currentTime, m = this.muted ? 0 : this.vol.m;
    this.master.gain.setTargetAtTime(m * 0.6, t, 0.02);
    this.busEng.gain.setTargetAtTime(this.vol.e, t, 0.02);
    this.busFx.gain.setTargetAtTime(this.vol.f, t, 0.02);
  }
  setMuted(m){ this.muted = m; this.applyVol(); }
  engine(norm, throttle, dt){
    if (!this.ready) return;
    /* Garde-fou : toute valeur non finie est ramenée à une valeur sûre
       (un NaN dans setTargetAtTime lève une exception et coupe le son) */
    if (!isFinite(norm)) norm = 0;
    if (!isFinite(throttle)) throttle = 0;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    if (!isFinite(this.rpm)) this.rpm = 0.12;
    norm = clamp(norm, 0, 1); throttle = clamp(throttle, 0, 1);
    /* Boîte 5 rapports : le régime grimpe dans le rapport courant puis
       retombe au suivant (motif dents de scie sur la vitesse) */
    const GEARS = 5;
    const inGear = clamp(norm * GEARS, 0, GEARS - 0.001) % 1;
    let target = 0.13 + inGear * 0.87;
    if (norm < 0.04) target = 0.13 + throttle * 0.5;
    this.rpm += (target - this.rpm) * Math.min(1, dt * 5.5);
    const f = 34 + this.rpm * 158;
    const t = this.ctx.currentTime;
    this.osc1.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2.frequency.setTargetAtTime(f * 1.009, t, 0.05);   // désaccord
    this.osc3.frequency.setTargetAtTime(f * 0.5, t, 0.05);     // sous-octave
    this.engFilter.frequency.setTargetAtTime(150 + this.rpm * 1250 + throttle * 300, t, 0.07);
    const vol = 0.04 + this.rpm * 0.055 + throttle * 0.025;
    this.engGain.gain.setTargetAtTime(vol, t, 0.08);
    this.engLfo.frequency.setTargetAtTime(16 + this.rpm * 60, t, 0.05);
    this.lfoDepth.gain.setTargetAtTime(vol * 0.5, t, 0.08);
  }
  engineOff(){ if (this.ready) this.engGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15); }
  skid(level){ if (this.ready) this.skidGain.gain.setTargetAtTime(clamp(level, 0, 1) * 0.16, this.ctx.currentTime, 0.05); }
  horn(on){ if (this.ready) this.hornGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.015); }
  beep(freq, t0, dur, vol = 0.18, type = 'triangle'){
    if (!this.ready) return;
    const t = this.ctx.currentTime + t0;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx2gain(this, t, dur, vol);
    o.connect(g); g.connect(this.busFx); o.start(t); o.stop(t + dur + 0.05);
  }
  ding(){ this.beep(880, 0, .18); this.beep(1174, .09, .22); }
  jingle(){ this.beep(523, 0, .14); this.beep(659, .11, .14); this.beep(784, .22, .3); this.beep(1046, .22, .3, .12); }
  fail(){ this.beep(330, 0, .2, .15, 'sawtooth'); this.beep(247, .16, .35, .15, 'sawtooth'); }
  noiseHit(freq, vol, dur){
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.busFx);
    src.start(t); src.stop(t + dur + 0.05);
  }
  crash(s){ this.noiseHit(240, clamp(s / 22, 0.15, 0.7), 0.28); }
  thud(){ this.noiseHit(140, 0.5, 0.2); }
  whoosh(v = 1){
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14 * v, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    src.connect(f); f.connect(g); g.connect(this.busFx);
    src.start(t); src.stop(t + 0.3);
  }
}
/* petit utilitaire pour beep() */
function ctx2gain(s, t, dur, vol){
  const g = s.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}
const sfx = new Sfx();

/* ================= 3. SCÈNE ================= */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = 0xf3e4c8;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 140, 640);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 1400);
camera.position.set(0, 6, -46);

scene.add(new THREE.HemisphereLight(0xfff3dd, 0x8a7a5e, 0.85));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.05);
sun.position.set(90, 130, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -110; sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110;   sun.shadow.camera.bottom = -110;
sun.shadow.camera.near = 20;   sun.shadow.camera.far = 400;
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0007;
scene.add(sun); scene.add(sun.target);

/* Le canvas remplit #stage (tout l'espace au-dessus du footer sticky) */
const stage = document.getElementById('stage');
function onResize(){
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

/* ================= 4. TEXTURES & FUSION ================= */
function canvasTexture(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
const asphaltTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#40403f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++){
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    g.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3));
  }
});
asphaltTex.repeat.set(170, 170);

const facadeCache = {};
function facadeTexture(hex){
  if (facadeCache[hex]) return facadeCache[hex];
  const t = canvasTexture(256, 256, (g) => {
    g.fillStyle = hex; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++){
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, rand(2, 10), rand(2, 8));
    }
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++){
      const x = col * 64 + 15, y = row * 64 + 13, w = 34, h = 40;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x - 3, y + h, w + 6, 5);
      g.fillStyle = Math.random() < 0.24 ? '#ffd581' : (Math.random() < 0.5 ? '#39393b' : '#2e2f33');
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.55, y);
      g.lineTo(x + w * 0.8, y); g.lineTo(x + w * 0.25, y + h); g.closePath(); g.fill();
    }
  });
  facadeCache[hex] = t; return t;
}
const checkerTex = canvasTexture(64, 64, (g) => {
  g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#17140f';
  g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
});
checkerTex.repeat.set(14, 1);
const taxiSignTex = canvasTexture(256, 96, (g) => {
  g.fillStyle = '#17140f'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#f7b32b'; g.font = 'bold 58px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('TAXI', 128, 52);
});
const puffTex = canvasTexture(64, 64, (g) => {
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,0.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
});
puffTex.wrapS = puffTex.wrapT = THREE.ClampToEdgeWrapping;
const stopTex = canvasTexture(128, 128, (g) => {
  g.translate(64, 64); g.fillStyle = '#c0392b';
  g.beginPath();
  for (let i = 0; i < 8; i++){
    const a = Math.PI / 8 + i * Math.PI / 4;
    const x = Math.cos(a) * 54, y = Math.sin(a) * 54;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath(); g.fill();
  g.fillStyle = '#f5efe4'; g.font = 'bold 34px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 0, 2);
});
const noEntryTex = canvasTexture(128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = '#c0392b'; g.lineWidth = 17;
  g.beginPath(); g.arc(64, 64, 48, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f5efe4'; g.fillRect(34, 55, 60, 18);
});
const houseTex = canvasTexture(256, 256, (g) => {
  g.fillStyle = '#e9e2d2'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#8a7a5e'; g.fillRect(0, 236, 256, 20);
  g.fillStyle = '#3a3f45';
  for (const [x, y] of [[36, 60], [164, 60], [36, 152], [164, 152]]){
    g.fillRect(x, y, 56, 62);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(x, y, 56, 16); g.fillStyle = '#3a3f45';
  }
  g.fillStyle = '#5a4632'; g.fillRect(106, 150, 46, 86);
  g.fillStyle = '#2c2620'; g.fillRect(112, 156, 34, 30);
});
const shopSignCache = {};
function shopSignTex(name, bg){
  const k = name + bg;
  if (shopSignCache[k]) return shopSignCache[k];
  const t = canvasTexture(256, 80, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 256, 80);
    g.fillStyle = '#17140f'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 73, 256, 7);
    g.fillStyle = '#f5efe4'; g.font = 'bold 42px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, 128, 43);
  });
  shopSignCache[k] = t; return t;
}
const stripeCache = {};
function stripeTex(c1, c2){
  const k = c1 + c2;
  if (stripeCache[k]) return stripeCache[k];
  const t = canvasTexture(128, 32, (g) => {
    for (let i = 0; i < 8; i++){ g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 16, 0, 16, 32); }
  });
  stripeCache[k] = t; return t;
}
const adTexs = [
  ['TAXI RUSH', 'composez 555.0199', '#b3452e'],
  ['CAFÉ LE PANORAMA', 'espresso · viennois', '#2f5d52'],
  ['HÔTEL CENTRAL', 'la nuit à 49 $', '#42476b'],
  ['DINER 24H', 'burger 5 $', '#8a5a22'],
].map(([l1, l2, bg]) => canvasTexture(512, 256, (g) => {
  g.fillStyle = '#211c16'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = bg; g.fillRect(10, 10, 492, 236);
  g.fillStyle = '#17140f';
  for (let i = 0; i < 24; i++) g.fillRect(i * 22, 10, 11, 14);
  g.fillStyle = '#f5efe4'; g.textAlign = 'center';
  g.font = 'bold 58px Arial'; g.fillText(l1, 256, 115);
  g.font = '32px Arial'; g.fillStyle = '#e8d9b5'; g.fillText(l2, 256, 175);
}));

/* Fusion de géométries avec couleurs par sommet */
const _mv = new THREE.Vector3();
function mergeParts(parts){
  const pos = [], nrm = [], col = [], c = new THREE.Color();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const sv = new THREE.Vector3(), tv = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const p of parts){
    let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    e.set(p.rx || 0, p.ry || 0, p.rz || 0); q.setFromEuler(e);
    sv.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1); tv.set(p.x || 0, p.y || 0, p.z || 0);
    m.compose(tv, q, sv); nm.getNormalMatrix(m);
    const pa = g.attributes.position, na = g.attributes.normal;
    c.set(p.color);
    for (let i = 0; i < pa.count; i++){
      _mv.fromBufferAttribute(pa, i).applyMatrix4(m); pos.push(_mv.x, _mv.y, _mv.z);
      _mv.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nrm.push(_mv.x, _mv.y, _mv.z);
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

/* ================= 5. TERRAIN, RÉSEAU ROUTIER, HAUTEUR DU SOL ================= */
const G = CONF.GRID, MAPSIZE = G * CONF.CELL;
const u = (k) => -HALF + k * CONF.CELL;         // coordonnée de la ligne de route k
const blockCX = (i) => u(i) + CONF.CELL / 2;    // centre du pâté i

/* Relief : ondulations douces + la "Butte" (gros dénivelé au nord-est) */
const HILL = { x: HALF * 0.52, z: -HALF * 0.52, amp: 22, sig: 100 };
function terrainH(x, z){
  const dx = x - HILL.x, dz = z - HILL.z;
  return Math.sin(x * 0.0058 + 2.1) * Math.cos(z * 0.0052 + 1.3) * 3.2
       + Math.sin(x * 0.011 + 0.5) * Math.sin(z * 0.0093 + 2.7) * 1.4
       + Math.cos(x * 0.021 + 4.2) * Math.sin(z * 0.018 + 0.7) * 0.6
       + HILL.amp * Math.exp(-(dx * dx + dz * dz) / (2 * HILL.sig * HILL.sig));
}

/* Réseau : hSeg[j][i] = tronçon horizontal de la rangée j entre nœuds i..i+1
   vSeg[i][j] = tronçon vertical de la colonne i entre nœuds j..j+1.
   ~25 % des rues intérieures disparaissent → cours/ints privés (raccourcis). */
const hSeg = [], vSeg = [];
for (let j = 0; j <= G; j++){ hSeg[j] = []; for (let i = 0; i < G; i++) hSeg[j][i] = (j === 0 || j === G) || Math.random() < 0.75; }
for (let i = 0; i <= G; i++){ vSeg[i] = []; for (let j = 0; j < G; j++) vSeg[i][j] = (i === 0 || i === G) || Math.random() < 0.75; }
vSeg[8][7] = vSeg[8][8] = true; // rue de départ du taxi

/* Ronds-points : 3 carrefours intérieurs (toutes branches forcées) */
const rbNodes = new Set();
{
  const cands = [[4, 4], [11, 5], [5, 11], [12, 12], [8, 3], [3, 9]].sort(() => Math.random() - 0.5);
  for (const [i, j] of cands){
    if (rbNodes.size >= 3) break;
    if ([...rbNodes].some(k => { const [a, b] = k.split(',').map(Number); return Math.abs(a - i) + Math.abs(b - j) < 3; })) continue;
    rbNodes.add(i + ',' + j);
    hSeg[j][i - 1] = hSeg[j][i] = true;
    vSeg[i][j - 1] = vSeg[i][j] = true;
  }
}
/* Chaque carrefour garde au moins 2 branches (pas d'impasse pour le trafic) */
const nodeDeg = (i, j) => (hSeg[j][i - 1] ? 1 : 0) + (hSeg[j][i] ? 1 : 0) + (vSeg[i][j - 1] ? 1 : 0) + (vSeg[i][j] ? 1 : 0);
for (let i = 1; i < G; i++) for (let j = 1; j < G; j++){
  let guard = 0;
  while (nodeDeg(i, j) < 2 && guard++ < 6){
    const fix = [];
    if (!hSeg[j][i - 1]) fix.push([hSeg[j], i - 1]);
    if (!hSeg[j][i]) fix.push([hSeg[j], i]);
    if (!vSeg[i][j - 1]) fix.push([vSeg[i], j - 1]);
    if (!vSeg[i][j]) fix.push([vSeg[i], j]);
    if (!fix.length) break;
    const [arr, idx] = pick(fix);
    arr[idx] = true;
  }
}

/* Parcs + place-belvédère au sommet de la Butte */
const parkSet = new Set();
while (parkSet.size < 12) parkSet.add(randInt(1, G - 2) + ',' + randInt(1, G - 2));
let plazaIJ = { i: 8, j: 8 };
{
  let bd = 1e9;
  for (let i = 2; i < G - 2; i++) for (let j = 2; j < G - 2; j++){
    if (parkSet.has(i + ',' + j)) continue;
    const d = Math.hypot(blockCX(i) - HILL.x, blockCX(j) - HILL.z);
    if (d < bd){ bd = d; plazaIJ = { i, j }; }
  }
}
const isPlaza = (i, j) => i === plazaIJ.i && j === plazaIJ.j;
function districtOf(i, j){
  const ring = Math.max(Math.abs(i - (G - 1) / 2), Math.abs(j - (G - 1) / 2));
  return ring >= 5.5 ? 'sub' : ring >= 3.5 ? 'mid' : 'down';
}

/* Hauteur du sol : terrain + bordure de trottoir (rampe courte → secousse).
   curbD = distance signée à la bordure la plus proche (+: côté trottoir). */
const CURB = 0.14, CW = 0.55;
function curbD(x, z){
  const gx = x + HALF, gz = z + HALF;
  if (gx < 0 || gz < 0 || gx >= MAPSIZE || gz >= MAPSIZE) return -100;
  const i = Math.min(G - 1, Math.floor(gx / CONF.CELL));
  const j = Math.min(G - 1, Math.floor(gz / CONF.CELL));
  const fx = gx - blockCX(i), fz = gz - blockCX(j);
  const ax = Math.abs(fx), az = Math.abs(fz);
  if (ax <= HB && az <= HB){ // cœur d'îlot : on scanne jusqu'à la rue ouverte
    let c = i + 1; while (c <= G && !vSeg[c][j]) c++;
    let d = (c - i) * CONF.CELL - (HB + RH) - fx;
    c = i; while (c >= 0 && !vSeg[c][j]) c--;
    d = Math.min(d, fx - ((c - i) * CONF.CELL - HB));
    let r = j + 1; while (r <= G && !hSeg[r][i]) r++;
    d = Math.min(d, (r - j) * CONF.CELL - (HB + RH) - fz);
    r = j; while (r >= 0 && !hSeg[r][i]) r--;
    d = Math.min(d, fz - ((r - j) * CONF.CELL - HB));
    return d;
  }
  if (ax > HB && az > HB) // carrefour : toujours route
    return -Math.min(ax - HB, HB + RH - ax, az - HB, HB + RH - az);
  if (ax > HB){ // bande verticale
    const k = fx > 0 ? i + 1 : i;
    if (vSeg[k][j]) return -Math.min(ax - HB, HB + RH - ax);
    return HB - az; // cour intérieure : bordures aux extrémités
  }
  const m = fz > 0 ? j + 1 : j;
  if (hSeg[m][i]) return -Math.min(az - HB, HB + RH - az);
  return HB - ax;
}
function curbK(x, z){
  const t = clamp((curbD(x, z) + CW) / (2 * CW), 0, 1);
  return t * t * (3 - 2 * t);
}
function groundH(x, z){ return terrainH(x, z) + CURB * curbK(x, z); }

/* ================= 6. SOL + PLATEAUX (trottoirs suivant le relief) ================= */
/* Sol maître : routes (asphalte) + herbe au-delà de la ville */
{
  const SIZE = MAPSIZE + 360, SEGS = 200;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [];
  const inner = HALF + RH + 4;
  const cCity = new THREE.Color(1, 1, 1), cOut = new THREE.Color(0.95, 1.1, 0.75), cc = new THREE.Color();
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, terrainH(x, z));
    const d = Math.max(Math.abs(x), Math.abs(z));
    cc.copy(cCity).lerp(cOut, clamp((d - inner) / 50, 0, 1));
    colors.push(cc.r, cc.g, cc.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: asphaltTex, vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);
}

/* Plateaux : trottoirs/parcs/cours à terrain+CURB, avec muret de bordure
   (2 tons : linteau clair + béton) descendant sous la route. Tout est
   fusionné dans UNE géométrie à couleurs de sommets. */
const PG = { pos: [], nrm: [], col: [], idx: [] };
const COL_SIDEWALK = new THREE.Color(0xbdb49c), COL_CURB = new THREE.Color(0xd8d2c2),
      COL_CONC = new THREE.Color(0x8f887c), COL_DEEP = new THREE.Color(0x6e695f),
      COL_GRASS = new THREE.Color(0x8cab66), COL_PAVE = new THREE.Color(0xc7b998),
      COL_PLAZA = new THREE.Color(0xd6cbb4);
function pgVertex(x, y, z, nx, ny, nz, c){
  PG.pos.push(x, y, z); PG.nrm.push(nx, ny, nz); PG.col.push(c.r, c.g, c.b);
  return PG.pos.length / 3 - 1;
}
function pgQuad(a, b, c, d){ PG.idx.push(a, b, c, a, c, d); }
function plateauRect(x0, z0, x1, z1, color, sides){
  const nx = Math.max(1, Math.round((x1 - x0) / 5)), nz = Math.max(1, Math.round((z1 - z0) / 5));
  const base = PG.pos.length / 3, cc = new THREE.Color();
  for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++){
    const x = x0 + (x1 - x0) * ix / nx, z = z0 + (z1 - z0) * iz / nz;
    pgVertex(x, terrainH(x, z) + CURB, z, 0, 1, 0, cc.copy(color).multiplyScalar(rand(0.95, 1.05)));
  }
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++){
    const a = base + iz * (nx + 1) + ix;
    pgQuad(a, a + nx + 1, a + nx + 2, a + 1);
  }
  const skirt = (ax, az, bx, bz, ox, oz) => {
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 3.5) + 1);
    let prev = null;
    for (let s = 0; s < n; s++){
      const t = s / (n - 1);
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const th = terrainH(x, z);
      const i0 = pgVertex(x, th + CURB, z, ox, 0, oz, COL_CURB);
      const i1 = pgVertex(x, th + CURB - 0.22, z, ox, 0, oz, COL_CONC);
      const i2 = pgVertex(x, th - 3.0, z, ox, 0, oz, COL_DEEP);
      if (prev){ pgQuad(prev[0], i0, i1, prev[1]); pgQuad(prev[1], i1, i2, prev[2]); }
      prev = [i0, i1, i2];
    }
  };
  if (sides.e) skirt(x1, z0, x1, z1, 1, 0);
  if (sides.w) skirt(x0, z1, x0, z0, -1, 0);
  if (sides.s) skirt(x1, z1, x0, z1, 0, 1);
  if (sides.n) skirt(x0, z0, x1, z0, 0, -1);
}
/* Socle en pierre (fusionné dans le même maillage — zéro draw call en plus) */
function plateauBox(x, z, w, d, y0, y1, hex){
  const hw = w / 2, hd = d / 2, c = new THREE.Color(hex);
  const v = (px, pz, nx, nz, yy) => pgVertex(px, yy, pz, nx, 0, nz, c);
  const a0 = v(x - hw, z - hd, 0, -1, y0), a1 = v(x - hw, z - hd, 0, -1, y1);
  const b0 = v(x + hw, z - hd, 0, -1, y0), b1 = v(x + hw, z - hd, 0, -1, y1);
  const c0 = v(x + hw, z + hd, 0, 1, y0),  c1 = v(x + hw, z + hd, 0, 1, y1);
  const d0 = v(x - hw, z + hd, 0, 1, y0),  d1 = v(x - hw, z + hd, 0, 1, y1);
  pgQuad(a0, b0, b1, a1); pgQuad(b0, c0, c1, b1); pgQuad(c0, d0, d1, c1); pgQuad(d0, a0, a1, d1);
  const t0 = v(x - hw, z - hd, 0, 1, y1), t1 = v(x + hw, z - hd, 0, 1, y1),
        t2 = v(x + hw, z + hd, 0, 1, y1), t3 = v(x - hw, z + hd, 0, 1, y1);
  pgQuad(t0, t1, t2, t3);
}
/* Plateau de chaque pâté (couleur selon parc / place / trottoir) */
for (let i = 0; i < G; i++) for (let j = 0; j < G; j++){
  const key = i + ',' + j;
  const col = parkSet.has(key) ? COL_GRASS : isPlaza(i, j) ? COL_PLAZA : COL_SIDEWALK;
  plateauRect(u(i) + RH, u(j) + RH, u(i + 1) - RH, u(j + 1) - RH, col,
    { e: vSeg[i + 1][j], w: vSeg[i][j], s: hSeg[j + 1][i], n: hSeg[j][i] });
}
/* Cours intérieures (rues supprimées) : dallage + bordures aux bouts */
for (let k = 1; k < G; k++) for (let j = 0; j < G; j++)
  if (!vSeg[k][j]) plateauRect(u(k) - RH, u(j) + RH, u(k) + RH, u(j + 1) - RH, COL_PAVE, { n: true, s: true });
for (let m = 1; m < G; m++) for (let i = 0; i < G; i++)
  if (!hSeg[m][i]) plateauRect(u(i) + RH, u(m) - RH, u(i + 1) - RH, u(m) + RH, COL_PAVE, { e: true, w: true });

/* ---- Contenu urbain : collectes ---- */
const colliders = [], cylinders = [], treeList = [];
const treeItems = [], benchItems = [], railItems = [], rockItems = [];

/* Parcs : arbres, rochers, bancs, rambardes, fontaines */
{
  const stone = new THREE.MeshLambertMaterial({ color: 0xb0a695 });
  let fountains = 0;
  for (const key of parkSet){
    const [i, j] = key.split(',').map(Number);
    const cx = blockCX(i), cz = blockCX(j);
    for (let n = 0, c = randInt(9, 13); n < c; n++)
      treeItems.push({ x: cx + rand(-16, 16), z: cz + rand(-16, 16), s: rand(0.9, 1.5) });
    for (let n = 0; n < randInt(2, 3); n++){
      const rx = cx + rand(-13, 13), rz = cz + rand(-13, 13);
      rockItems.push({ x: rx, z: rz, s: rand(0.6, 1.3), ry: rand(0, 6) });
      cylinders.push({ x: rx, z: rz, r: 0.9 });
      treeList.push({ x: rx, z: rz });
    }
    for (let n = 0; n < randInt(3, 5); n++){
      const a = rand(0, Math.PI * 2), r = rand(8, 15);
      benchItems.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, ry: -a + Math.PI / 2 });
    }
    const sides = [[0, -1, 0], [0, 1, Math.PI], [-1, 0, -Math.PI / 2], [1, 0, Math.PI / 2]].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const [sx, sz, ry] of sides)
      for (let s = 0; s < 10; s++){
        if (Math.random() < 0.15) continue;
        const t = -18.2 + s * 4.05 + 2;
        railItems.push({ x: cx + (sx ? sx * 19.2 : t), z: cz + (sz ? sz * 19.2 : t), ry });
      }
    if (fountains < 2){ // fontaine
      fountains++;
      const y = groundH(cx, cz);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.3, 0.9, 20), stone);
      pool.position.set(cx, y + 0.55, cz); pool.castShadow = pool.receiveShadow = true; scene.add(pool);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.1, 20),
        new THREE.MeshLambertMaterial({ color: 0x7ec4d8, transparent: true, opacity: 0.85 }));
      water.position.set(cx, y + 0.95, cz); scene.add(water);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.8, 10), stone);
      col.position.set(cx, y + 1.6, cz); col.castShadow = true; scene.add(col);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.5, 0.5, 12), stone);
      bowl.position.set(cx, y + 2.5, cz); bowl.castShadow = true; scene.add(bowl);
      cylinders.push({ x: cx, z: cz, r: 4.4 });
      treeList.push({ x: cx, z: cz });
    }
  }
}

/* ================= 7. BÂTIMENTS, MAGASINS, MAISONS, MOBILIER ================= */
const FACADES = ['#c96f4a', '#e3c9a0', '#8f9a63', '#b8a48a', '#a34a3c', '#d9a531', '#efe6d2', '#7d8a85'];
const roofMat = new THREE.MeshLambertMaterial({ color: 0x4c4642 });
const detailMat = new THREE.MeshLambertMaterial({ color: 0x5a544e });
const tankMat   = new THREE.MeshLambertMaterial({ color: 0x8a6f52 });
const plinthMat = new THREE.MeshLambertMaterial({ color: 0x7e776b });
const TEX_SPAN = 24;
const SHOP_NAMES = [
  ['CAFÉ', '#6b4a2f'], ['PIZZA', '#a8432e'], ['MARKET', '#3e6b4a'], ['HÔTEL', '#4a556b'],
  ['DINER', '#8a5a22'], ['BOULANGERIE', '#8a6a3a'], ['PHARMACIE', '#2f7a5a'], ['FLEURS', '#7a4a6b'],
];

/* Immeuble : le corps pose sur le point HAUT du terrain, un socle en pierre
   (plateauBox) comble la dénivellation → plus jamais de bâtiment flottant. */
function addBuilding(x, z, w, h, d){
  const gs = [groundH(x - w / 2, z - d / 2), groundH(x + w / 2, z - d / 2),
              groundH(x - w / 2, z + d / 2), groundH(x + w / 2, z + d / 2)];
  const gMin = Math.min(gs[0], gs[1], gs[2], gs[3]), gMax = Math.max(gs[0], gs[1], gs[2], gs[3]);
  const base = gMax + 0.02;
  plateauBox(x, z, w + 0.7, d + 0.7, gMin - 0.7, base + 0.05, 0x8f887c);
  /* Rez-de-chaussée en pierre : ancre visuellement le bâtiment au sol et
     masque la rangée de fenêtres du bas (supprime l'effet de suspension) */
  const PL = Math.min(3.4, h * 0.45);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, PL, d + 0.4), plinthMat);
  plinth.position.set(x, base + PL / 2 - 0.08, z);
  plinth.castShadow = plinth.receiveShadow = true;
  scene.add(plinth);
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++){
    const idx = f * 4 + v;
    uv.setXY(idx, uv.getX(idx) * dims[f][0] / TEX_SPAN, uv.getY(idx) * dims[f][1] / TEX_SPAN);
  }
  const mat = new THREE.MeshLambertMaterial({
    map: facadeTexture(pick(FACADES)),
    color: new THREE.Color(1, 1, 1).multiplyScalar(rand(0.86, 1)),
  });
  const mesh = new THREE.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
  mesh.position.set(x, base + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  if (h > 9 && Math.random() < 0.55){
    if (Math.random() < 0.6){
      const box = new THREE.Mesh(new THREE.BoxGeometry(rand(2.2, 3.4), rand(1.4, 2.4), rand(2.2, 3.2)), detailMat);
      box.position.set(x + rand(-w / 4, w / 4), base + h + 1, z + rand(-d / 4, d / 4));
      box.castShadow = true; scene.add(box);
    } else {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 2.1, 10), tankMat);
      tank.position.set(x + rand(-w / 4, w / 4), base + h + 1.2, z + rand(-d / 4, d / 4));
      tank.castShadow = true; scene.add(tank);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 10), tankMat);
      cap.position.set(tank.position.x, base + h + 2.8, tank.position.z);
      scene.add(cap);
    }
  }
  if (h > 14 && Math.random() < 0.28){
    const face = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5),
      new THREE.MeshBasicMaterial({ map: pick(adTexs) }));
    const off = 0.12, y = base + rand(6, h - 5);
    if (face[0]) bb.position.set(x + face[0] * (w / 2 + off), y, z);
    else bb.position.set(x, y, z + face[1] * (d / 2 + off));
    bb.rotation.y = face[0] ? face[0] * Math.PI / 2 : (face[1] > 0 ? 0 : Math.PI);
    scene.add(bb);
  }
}

/* Magasin de quartier (orienté vers une rue existante) */
function addShop(cx, cz, bi, bj){
  const sides = [];
  if (vSeg[bi + 1][bj]) sides.push([1, 0]);
  if (vSeg[bi][bj]) sides.push([-1, 0]);
  if (hSeg[bj + 1][bi]) sides.push([0, 1]);
  if (hSeg[bj][bi]) sides.push([0, -1]);
  if (!sides.length) return false;
  const [nx, nz] = pick(sides);
  const gx = cx + nx * 17, gz = cz + nz * 17;
  const hw = nx ? 5.2 : 13.6, hd = nx ? 13.6 : 5.2;
  const gs = [groundH(gx - hw, gz - hd), groundH(gx + hw, gz - hd), groundH(gx - hw, gz + hd), groundH(gx + hw, gz + hd)];
  const gMin = Math.min(...gs), gMax = Math.max(...gs);
  plateauBox(gx, gz, hw * 2 + 0.6, hd * 2 + 0.6, gMin - 0.6, gMax + 0.08, 0x8f887c);
  const g = new THREE.Group();
  g.position.set(gx, gMax + 0.02, gz);
  g.rotation.y = Math.atan2(nx, nz);
  const [name, signBg] = pick(SHOP_NAMES);
  const bMat = new THREE.MeshLambertMaterial({ map: facadeTexture(pick(['#d8c8a8', '#c4a88a', '#b0a890', '#c98a6a'])) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 9), [bMat, bMat, roofMat, roofMat, bMat, bMat]);
  body.position.set(0, 3.8, -1.5); body.castShadow = body.receiveShadow = true; g.add(body);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(27, 0.5, 10), detailMat);
  lip.position.set(0, 6.4, -1.5); g.add(lip);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(24, 0.14, 1.9),
    new THREE.MeshLambertMaterial({ map: stripeTex(pick(['#c96f4a', '#3e6b4a', '#4a556b', '#a8432e']), '#f0e8d8') }));
  aw.position.set(0, 3.6, 3.2); aw.rotation.x = -0.3; aw.castShadow = true; g.add(aw);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4),
    new THREE.MeshBasicMaterial({ map: shopSignTex(name, signBg) }));
  sign.position.set(0, 4.9, 3.06); g.add(sign);
  scene.add(g);
  colliders.push({ minX: gx - hw, maxX: gx + hw, minZ: gz - hd, maxZ: gz + hd });
  return true;
}

/* Remplissage des îlots */
for (let i = 0; i < G; i++) for (let j = 0; j < G; j++){
  const key = i + ',' + j;
  if (parkSet.has(key) || isPlaza(i, j)) continue;
  const cx = blockCX(i), cz = blockCX(j);
  const d = districtOf(i, j);
  if (d === 'sub'){ /* maisons plus bas (instanciées) */ }
  else {
    if (d === 'mid' && Math.random() < 0.3 && addShop(cx, cz, i, j)) { /* magasin */ }
    else {
      const H = d === 'down'
        ? () => clamp(rand(0.4, 1) * (14 + Math.pow(1 - Math.min(1, Math.hypot(cx, cz) / (HALF * 0.8)), 2) * 30) + 6, 10, 46)
        : () => rand(7, 18);
      if (Math.random() < 0.55) addBuilding(cx + rand(-2, 2), cz + rand(-2, 2), rand(24, 33), H(), rand(24, 33));
      else {
        const horiz = Math.random() < 0.5;
        for (const s of [-1, 1]){
          const off = s * rand(9.2, 10.2);
          if (horiz) addBuilding(cx + off, cz + rand(-2, 2), rand(11, 14), H(), rand(20, 32));
          else       addBuilding(cx + rand(-2, 2), cz + off, rand(20, 32), H(), rand(11, 14));
        }
      }
    }
  }
  /* bancs + arbres de trottoir */
  if (Math.random() < 0.22){
    const a = randInt(0, 3), t = rand(-14, 14), off = 18.6;
    const pos = [[t, -off], [t, off], [-off, t], [off, t]][a];
    benchItems.push({ x: cx + pos[0], z: cz + pos[1], ry: a < 2 ? 0 : Math.PI / 2 });
  }
  if (Math.random() < 0.55){
    const horiz = Math.random() < 0.5;
    for (let k = 0, n = randInt(2, 4); k < n; k++){
      const t = rand(-15, 15), off = 19;
      treeItems.push({
        x: horiz ? cx + t : cx + pick([-off, off]),
        z: horiz ? cz + pick([-off, off]) : cz + t, s: rand(0.75, 1.1),
      });
    }
  }
}

/* Cours intérieures : arbres + bancs */
for (let k = 1; k < G; k++) for (let j = 0; j < G; j++){
  if (vSeg[k][j]) continue;
  const n = randInt(1, 3);
  for (let t = 0; t < n; t++)
    treeItems.push({ x: u(k) + rand(-6, 6), z: u(j) + rand(14, CONF.CELL - 14), s: rand(0.8, 1.2) });
  if (Math.random() < 0.6)
    benchItems.push({ x: u(k) + pick([-6, 6]), z: u(j) + rand(16, CONF.CELL - 16), ry: Math.PI / 2 });
}
for (let m = 1; m < G; m++) for (let i = 0; i < G; i++){
  if (hSeg[m][i]) continue;
  const n = randInt(1, 3);
  for (let t = 0; t < n; t++)
    treeItems.push({ x: u(i) + rand(14, CONF.CELL - 14), z: u(m) + rand(-6, 6), s: rand(0.8, 1.2) });
  if (Math.random() < 0.6)
    benchItems.push({ x: u(i) + rand(16, CONF.CELL - 16), z: u(m) + pick([-6, 6]), ry: 0 });
}

/* Maisons individuelles : inclinées selon la pente (collées au terrain) */
{
  const spots = [];
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++){
    const key = i + ',' + j;
    if (districtOf(i, j) !== 'sub' || parkSet.has(key) || isPlaza(i, j)) continue;
    const cx = blockCX(i), cz = blockCX(j);
    for (const [ox, oz] of [[-10.5, -10.5], [10.5, -10.5], [-10.5, 10.5], [10.5, 10.5]]){
      if (Math.random() < 0.12) continue;
      spots.push({
        x: cx + ox + rand(-1.2, 1.2), z: cz + oz + rand(-1.2, 1.2),
        s: rand(0.9, 1.15), ry: pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
        c: pick([0xe9dfc6, 0xdcbd92, 0xd9b0a0, 0xc9d4c0, 0xe6cf9e, 0xd8c4b0]),
        rc: pick([0x9a4a32, 0x6b5a4a, 0x54604f, 0x74564a, 0x8a8378]),
        chim: Math.random() < 0.4,
      });
    }
    for (let k = 0; k < randInt(2, 4); k++)
      treeItems.push({ x: cx + pick([-16.5, 16.5]), z: cz + rand(-16, 16), s: rand(0.8, 1.3) });
    if (Math.random() < 0.3) benchItems.push({ x: cx + rand(-14, 14), z: cz + pick([-18.6, 18.6]), ry: 0 });
  }
  const bodyGeo = new THREE.BoxGeometry(7, 3.4, 6);
  const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); roofGeo.rotateY(Math.PI / 4);
  const chimGeo = new THREE.BoxGeometry(0.65, 1.5, 0.65);
  const bodyIM = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ map: houseTex }), spots.length);
  const roofIM = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), spots.length);
  const chimIM = new THREE.InstancedMesh(chimGeo, new THREE.MeshLambertMaterial({ color: 0x8a7362 }), spots.length);
  bodyIM.frustumCulled = roofIM.frustumCulled = chimIM.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  spots.forEach((h, k) => {
    const y = groundH(h.x, h.z);
    const sw = Math.abs(Math.sin(h.ry)) > 0.5;
    plateauBox(h.x, h.z, (sw ? 6.6 : 7.6) + 0.5, (sw ? 7.6 : 6.6) + 0.5, y - 1.4, y + 0.07, 0x9a948a);
    const fx = Math.sin(h.ry), fz = Math.cos(h.ry);
    const rx = Math.cos(h.ry), rz = -Math.sin(h.ry);
    const dhF = groundH(h.x + fx * 2.2, h.z + fz * 2.2) - groundH(h.x - fx * 2.2, h.z - fz * 2.2);
    const dhR = groundH(h.x + rx * 2.2, h.z + rz * 2.2) - groundH(h.x - rx * 2.2, h.z - rz * 2.2);
    e.set(-dhF / 4.4, h.ry, dhR / 4.4, 'YXZ'); // la maison suit la pente
    q.setFromEuler(e);
    const sink = 0.3;
    m.compose(new THREE.Vector3(h.x, y + 1.7 * h.s - sink, h.z), q, new THREE.Vector3(h.s, h.s, h.s));
    bodyIM.setMatrixAt(k, m); bodyIM.setColorAt(k, col.set(h.c));
    m.compose(new THREE.Vector3(h.x, y + (3.4 + 1.05) * h.s - sink, h.z), q, new THREE.Vector3(7.9 * h.s, 2.1 * h.s, 6.9 * h.s));
    roofIM.setMatrixAt(k, m); roofIM.setColorAt(k, col.set(h.rc));
    if (h.chim) m.compose(new THREE.Vector3(h.x + 2 * h.s, y + 4.1 * h.s - sink, h.z + 1.3 * h.s), q, new THREE.Vector3(h.s, h.s, h.s));
    else m.compose(new THREE.Vector3(0, -80, 0), q, new THREE.Vector3(0.001, 0.001, 0.001));
    chimIM.setMatrixAt(k, m);
    const swap = Math.abs(Math.sin(h.ry)) > 0.5;
    const hw = (swap ? 6.2 : 7.2) / 2, hd = (swap ? 7.2 : 6.2) / 2;
    colliders.push({ minX: h.x - hw, maxX: h.x + hw, minZ: h.z - hd, maxZ: h.z + hd });
  });
  bodyIM.instanceColor.needsUpdate = roofIM.instanceColor.needsUpdate = true;
  bodyIM.castShadow = roofIM.castShadow = chimIM.castShadow = true;
  bodyIM.receiveShadow = true;
  scene.add(bodyIM, roofIM, chimIM);
}

/* Arbres (2 InstancedMesh) */
{
  let leafGeo = new THREE.IcosahedronGeometry(1, 0);
  if (leafGeo.index) leafGeo = leafGeo.toNonIndexed();
  leafGeo.computeVertexNormals();
  const trunkIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.26, 1.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x6e4f35 }), treeItems.length);
  const leafIM = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), treeItems.length);
  trunkIM.frustumCulled = leafIM.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), one = new THREE.Vector3(1, 1, 1);
  treeItems.forEach((it, k) => {
    const y = groundH(it.x, it.z) - 0.06;
    m.compose(new THREE.Vector3(it.x, y + 0.7 * it.s, it.z), q, one.clone().setScalar(it.s));
    trunkIM.setMatrixAt(k, m);
    const ls = it.s * rand(1.5, 2.3);
    q.setFromEuler(new THREE.Euler(0, rand(0, 6), 0));
    m.compose(new THREE.Vector3(it.x, y + 1.4 * it.s + ls * 0.55, it.z), q, one.clone().set(ls, ls * rand(0.9, 1.25), ls));
    leafIM.setMatrixAt(k, m);
    leafIM.setColorAt(k, col.setHSL(rand(0.22, 0.32), rand(0.35, 0.5), rand(0.32, 0.42)));
    cylinders.push({ x: it.x, z: it.z, r: 0.35 });
    treeList.push(it);
  });
  leafIM.instanceColor.needsUpdate = true;
  trunkIM.castShadow = leafIM.castShadow = true;
  scene.add(trunkIM, leafIM);
}

/* Rochers (instanciés) */
if (rockItems.length){
  const rockIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0x9b948a }), rockItems.length);
  rockIM.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  rockItems.forEach((r, k) => {
    q.setFromEuler(new THREE.Euler(0, r.ry, 0));
    m.compose(new THREE.Vector3(r.x, groundH(r.x, r.z) + 0.25, r.z), q, one.clone().set(r.s, r.s * 0.6, r.s));
    rockIM.setMatrixAt(k, m);
    cylinders.push({ x: r.x, z: r.z, r: r.s * 0.9 });
  });
  rockIM.castShadow = true;
  scene.add(rockIM);
}

/* Bancs + rambardes */
{
  const wood = 0x8a6a48, dark = 0x3a352f, railC = 0x4a5a4e;
  const benchGeo = mergeParts([
    { geo: new THREE.BoxGeometry(1.7, 0.06, 0.45), y: 0.42, color: wood },
    { geo: new THREE.BoxGeometry(1.7, 0.42, 0.05), y: 0.68, z: -0.2, rx: -0.12, color: wood },
    { geo: new THREE.BoxGeometry(0.06, 0.42, 0.42), x: -0.75, y: 0.21, color: dark },
    { geo: new THREE.BoxGeometry(0.06, 0.42, 0.42), x: 0.75, y: 0.21, color: dark },
  ]);
  const benchIM = new THREE.InstancedMesh(benchGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, benchItems.length));
  benchIM.frustumCulled = false; benchIM.castShadow = benchIM.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  benchItems.forEach((b, k) => {
    q.setFromEuler(new THREE.Euler(0, b.ry, 0));
    m.compose(new THREE.Vector3(b.x, groundH(b.x, b.z) + 0.02, b.z), q, one);
    benchIM.setMatrixAt(k, m);
  });
  scene.add(benchIM);

  const railGeo = mergeParts([
    { geo: new THREE.BoxGeometry(3.9, 0.055, 0.055), y: 0.78, color: railC },
    { geo: new THREE.BoxGeometry(3.9, 0.055, 0.055), y: 0.45, color: railC },
    { geo: new THREE.BoxGeometry(0.06, 0.85, 0.06), x: -1.8, y: 0.42, color: railC },
    { geo: new THREE.BoxGeometry(0.06, 0.85, 0.06), y: 0.42, color: railC },
    { geo: new THREE.BoxGeometry(0.06, 0.85, 0.06), x: 1.8, y: 0.42, color: railC },
  ]);
  const railIM = new THREE.InstancedMesh(railGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, railItems.length));
  railIM.frustumCulled = false; railIM.castShadow = true;
  railItems.forEach((r, k) => {
    q.setFromEuler(new THREE.Euler(0, r.ry, 0));
    m.compose(new THREE.Vector3(r.x, groundH(r.x, r.z) + 0.02, r.z), q, one);
    railIM.setMatrixAt(k, m);
  });
  scene.add(railIM);
}

/* Lampadaires (instanciés, aux coins des carrefours) */
{
  const spots = [];
  for (let i = 1; i < G; i++) for (let j = 1; j < G; j++){
    if (Math.random() > 0.4) continue;
    const sx = pick([-1, 1]), sz = pick([-1, 1]);
    spots.push({ x: u(i) + sx * 12.8, z: u(j) + sz * 12.8, ry: Math.atan2(-sx, -sz) });
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c3a38 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff2cc, emissive: 0xffe9b0, emissiveIntensity: 0.9 });
  const mk = (geo, mat) => {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    im.frustumCulled = false; scene.add(im); return im;
  };
  const poleIM = mk(new THREE.CylinderGeometry(0.09, 0.13, 5.2, 6), poleMat);
  const armIM  = mk(new THREE.BoxGeometry(0.12, 0.1, 1.5), poleMat);
  const lampIM = mk(new THREE.BoxGeometry(0.3, 0.14, 0.75), lampMat);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  spots.forEach((L, k) => {
    const y = groundH(L.x, L.z);
    q.setFromEuler(new THREE.Euler(0, L.ry, 0));
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    m.compose(new THREE.Vector3(L.x, y + 2.6, L.z), q, one); poleIM.setMatrixAt(k, m);
    m.compose(new THREE.Vector3(L.x + dir.x * 0.75, y + 5.15, L.z + dir.z * 0.75), q, one); armIM.setMatrixAt(k, m);
    m.compose(new THREE.Vector3(L.x + dir.x * 1.35, y + 5.05, L.z + dir.z * 1.35), q, one); lampIM.setMatrixAt(k, m);
    cylinders.push({ x: L.x, z: L.z, r: 0.3 });
  });
  poleIM.castShadow = true;
}

/* Panneaux STOP + sens interdit */
{
  const spots = [];
  for (let n = 0; n < 30; n++){
    const i = randInt(1, G - 1), j = randInt(1, G - 1);
    spots.push({ x: u(i) + pick([-12.6, 12.6]), z: u(j) + pick([-12.6, 12.6]), type: 'stop' });
  }
  for (let n = 0; n < 16; n++){
    const i = randInt(1, G - 1), j = randInt(1, G - 1);
    spots.push({ x: u(i) + pick([-12.6, 12.6]), z: u(j) + pick([-12.6, 12.6]), type: 'no' });
  }
  const poleGeo = mergeParts([{ geo: new THREE.CylinderGeometry(0.05, 0.06, 2.7, 6), y: 1.35, color: 0x8a8a8a }]);
  const poleIM = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), spots.length);
  const stopIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshLambertMaterial({ map: stopTex, transparent: true, side: THREE.DoubleSide }), spots.length);
  const noIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshLambertMaterial({ map: noEntryTex, transparent: true, side: THREE.DoubleSide }), spots.length);
  poleIM.frustumCulled = stopIM.frustumCulled = noIM.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  let ks = 0, kn = 0;
  spots.forEach((s, k) => {
    const gy = groundH(s.x, s.z), ry = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    q.setFromEuler(new THREE.Euler(0, ry, 0));
    m.compose(new THREE.Vector3(s.x, gy, s.z), q, one); poleIM.setMatrixAt(k, m);
    m.compose(new THREE.Vector3(s.x, gy + 2.4, s.z), q, one);
    if (s.type === 'stop') stopIM.setMatrixAt(ks++, m); else noIM.setMatrixAt(kn++, m);
    cylinders.push({ x: s.x, z: s.z, r: 0.22 });
  });
  stopIM.count = ks; noIM.count = kn;
  poleIM.castShadow = true;
  scene.add(poleIM, stopIM, noIM);
}

/* Feux tricolores (carrefours à 3+ branches) */
const tl = { red: null, yellow: null, green: null };
{
  const ints = [];
  for (let i = 1; i < G; i++) for (let j = 1; j < G; j++){
    if (rbNodes.has(i + ',' + j) || nodeDeg(i, j) < 3 || ints.length >= 40) continue;
    const sx = pick([-1, 1]), sz = pick([-1, 1]);
    ints.push({ x: u(i) + sx * 13.4, z: u(j) + sz * 13.4, a: Math.atan2(-sx, -sz) });
  }
  if (ints.length){
    const poleGeo = mergeParts([
      { geo: new THREE.CylinderGeometry(0.09, 0.12, 5.4, 6), y: 2.7, color: 0x3a3a3c },
      { geo: new THREE.BoxGeometry(0.36, 1.15, 0.3), y: 4.9, color: 0x2a2a2c },
    ]);
    const poleIM = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), ints.length);
    poleIM.frustumCulled = false; poleIM.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    ints.forEach((L, k) => {
      q.setFromEuler(new THREE.Euler(0, L.a, 0));
      m.compose(new THREE.Vector3(L.x, groundH(L.x, L.z), L.z), q, one);
      poleIM.setMatrixAt(k, m);
      cylinders.push({ x: L.x, z: L.z, r: 0.25 });
    });
    scene.add(poleIM);
    const mkLamp = (color, yy) => {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.22, 0.08),
        new THREE.MeshBasicMaterial({ color }), ints.length);
      im.frustumCulled = false;
      ints.forEach((L, k) => {
        q.setFromEuler(new THREE.Euler(0, L.a, 0));
        const ox = Math.sin(L.a) * 0.2, oz = Math.cos(L.a) * 0.2;
        m.compose(new THREE.Vector3(L.x + ox, groundH(L.x, L.z) + yy, L.z + oz), q, one);
        im.setMatrixAt(k, m);
      });
      scene.add(im);
      return im;
    };
    tl.red = mkLamp(0xff5040, 5.25); tl.yellow = mkLamp(0xffd23f, 4.9); tl.green = mkLamp(0x50e07a, 4.55);
  }
}
function updateLights(time){
  const t = time % 13;
  if (!tl.red) return;
  tl.green.visible = t < 6;
  tl.yellow.visible = t >= 6 && t < 7.5;
  tl.red.visible = t >= 7.5;
}

/* Ronds-points : îlot + bordure + obélisque */
{
  const stone = new THREE.MeshLambertMaterial({ color: 0xb0a695 });
  const grass = new THREE.MeshLambertMaterial({ color: 0x7da35c });
  for (const key of rbNodes){
    const [i, j] = key.split(',').map(Number);
    const nx = u(i), nz = u(j), ty = terrainH(nx, nz);
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.5, 26, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xd8d2c2, side: THREE.DoubleSide }));
    curb.position.set(nx, ty + 0.25, nz); scene.add(curb);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 0.42, 26), grass);
    isl.position.set(nx, ty + 0.21, nz); isl.receiveShadow = true; scene.add(isl);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 2.8, 1), stone);
    base.position.set(nx, ty + 1.6, nz); base.castShadow = true; scene.add(base);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 4), stone);
    tip.position.set(nx, ty + 3.6, nz); tip.rotation.y = Math.PI / 4; tip.castShadow = true; scene.add(tip);
    cylinders.push({ x: nx, z: nz, r: 5.4 });
  }
}

/* Monument de la Butte (place-belvédère) */
{
  const i = plazaIJ.i, j = plazaIJ.j;
  const cx = blockCX(i), cz = blockCX(j), y = groundH(cx, cz);
  const stone = new THREE.MeshLambertMaterial({ color: 0xc4baa6 });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7, 0.9, 22), stone);
  plat.position.set(cx, y + 0.45, cz); plat.castShadow = plat.receiveShadow = true; scene.add(plat);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 4.4, 12), stone);
  col.position.set(cx, y + 3.1, cz); col.castShadow = true; scene.add(col);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 12),
    new THREE.MeshPhongMaterial({ color: 0xd9a531, shininess: 70 }));
  ball.position.set(cx, y + 5.9, cz); ball.castShadow = true; scene.add(ball);
  cylinders.push({ x: cx, z: cz, r: 6.9 });
  for (const [ox, oz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]])
    treeItems.push({ x: cx + ox, z: cz + oz, s: 1.4 });
  for (let n = 0; n < 6; n++){
    const a = n / 6 * Math.PI * 2;
    benchItems.push({ x: cx + Math.cos(a) * 10.5, z: cz + Math.sin(a) * 10.5, ry: -a + Math.PI / 2 });
  }
  treeList.push({ x: cx, z: cz });
}

/* Marquages au sol (uniquement sur les rues existantes) */
{
  const pos = [], nrm = [], col = [], idx = [];
  const cYellow = new THREE.Color(0xdca93c), cWhite = new THREE.Color(0xe9e4d8);
  function addRect(cx, cz, w, d, color){
    const i0 = pos.length / 3;
    for (const [ox, oz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]){
      const x = cx + ox, z = cz + oz;
      pos.push(x, terrainH(x, z) + 0.05, z);
      nrm.push(0, 1, 0); col.push(color.r, color.g, color.b);
    }
    idx.push(i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2);
  }
  for (let j = 0; j <= G; j++) for (let i = 0; i < G; i++){
    if (!hSeg[j][i]) continue;
    for (let x = u(i) + RH + 2.6; x + 3.2 <= u(i + 1) - RH - 2.6; x += 6.4)
      addRect(x + 1.6, u(j), 3.2, 0.32, cYellow);
  }
  for (let i = 0; i <= G; i++) for (let j = 0; j < G; j++){
    if (!vSeg[i][j]) continue;
    for (let z = u(j) + RH + 2.6; z + 3.2 <= u(j + 1) - RH - 2.6; z += 6.4)
      addRect(u(i), z + 1.6, 0.32, 3.2, cYellow);
  }
  for (let i = 0; i <= G; i++) for (let j = 0; j <= G; j++){
    if (rbNodes.has(i + ',' + j)) continue;
    const spots = [];
    if (i > 0 && hSeg[j][i - 1]) spots.push([-1, 0]);
    if (i < G && hSeg[j][i]) spots.push([1, 0]);
    if (j > 0 && vSeg[i][j - 1]) spots.push([0, -1]);
    if (j < G && vSeg[i][j]) spots.push([0, 1]);
    for (const [sx, sz] of spots){
      const px = u(i) + sx * (RH + 2.1), pz = u(j) + sz * (RH + 2.1);
      for (let k = 0; k < 5; k++){
        if (sx) addRect(px, u(j) - 5.4 + k * 2.7, 2.0, 1.15, cWhite);
        else addRect(u(i) - 5.4 + k * 2.7, pz, 1.15, 2.0, cWhite);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/* Murets périphériques (suivent le terrain) */
{
  const WD = HALF + RH + 2.5;
  const segs = [];
  for (let s = -WD; s < WD; s += 16){
    segs.push({ x: s, z: -WD, ry: 0 }, { x: s, z: WD, ry: 0 });
    segs.push({ x: -WD, z: s, ry: Math.PI / 2 }, { x: WD, z: s, ry: Math.PI / 2 });
  }
  const wallIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0xa8977a }), segs.length);
  wallIM.frustumCulled = false; wallIM.castShadow = wallIM.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  segs.forEach((w, k) => {
    q.setFromEuler(new THREE.Euler(0, w.ry, 0));
    const top = terrainH(w.x, w.z) + 1.5;
    m.compose(new THREE.Vector3(w.x, top - 2.25, w.z), q, one.clone().set(16.4, 4.5, 1.4));
    wallIM.setMatrixAt(k, m);
  });
  scene.add(wallIM);
  const B = HALF + RH;
  colliders.push(
    { minX: -B - 4, maxX: B + 4, minZ: -B - 6, maxZ: -B },
    { minX: -B - 4, maxX: B + 4, minZ: B, maxZ: B + 6 },
    { minX: -B - 6, maxX: -B, minZ: -B - 4, maxZ: B + 4 },
    { minX: B, maxX: B + 6, minZ: -B - 4, maxZ: B + 4 },
  );
}

/* Finalisation des plateaux (trottoirs + socles) : un seul maillage */
{
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(PG.pos, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(PG.nrm, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(PG.col, 3));
  geo.setIndex(PG.idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/* ================= 8. LE TAXI ================= */
const taxi = {
  pos: new THREE.Vector3(-LANE_OFF, 0, -40),
  vel: new THREE.Vector2(0, 0),
  heading: 0, steer: 0, vF: 0, vR: 0, _pvF: 0,
  roll: 0, pitch: 0, driftLevel: 0, skidActive: false,
  lastCurbK: 0,
  group: null, wheels: { fronts: [], rears: [], all: [] },
  tailMat: null, gyroMat: null, brakeLit: false,
  prevRear: [new THREE.Vector2(), new THREE.Vector2()],
};
function buildTaxi(){
  const g = new THREE.Group();
  const yellow = new THREE.MeshPhongMaterial({ color: 0xf2a41f, shininess: 55, specular: 0x665522 });
  const black  = new THREE.MeshLambertMaterial({ color: 0x211f1c });
  const glass  = new THREE.MeshPhongMaterial({ color: 0x1d2429, shininess: 95, specular: 0x99bbcc });
  const chrome = new THREE.MeshPhongMaterial({ color: 0x9fa4ab, shininess: 80, specular: 0xffffff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.58, 4.6), yellow);
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.6, 2.25), yellow);
  cabin.position.set(0, 1.2, -0.38); cabin.castShadow = true; g.add(cabin);
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.34, 1.95), glass);
  band.position.set(0, 1.26, -0.38); g.add(band);
  const sideMat = new THREE.MeshBasicMaterial({ map: checkerTex });
  for (const s of [-1, 1]){
    const p = new THREE.Mesh(new THREE.PlaneGeometry(4.55, 0.34), sideMat);
    p.rotation.y = s * Math.PI / 2; p.position.set(s * 1.16, 0.78, 0); g.add(p);
  }
  for (const s of [-1, 1]){
    const bump = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.26, 0.34), black);
    bump.position.set(0, 0.42, s * 2.32); g.add(bump);
  }
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6da, emissive: 0xfff1c0, emissiveIntensity: 1 });
  taxi.tailMat = new THREE.MeshLambertMaterial({ color: 0x992222, emissive: 0x550000, emissiveIntensity: 0.4 });
  for (const s of [-1, 1]){
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.17, 0.1), headMat);
    h.position.set(s * 0.82, 0.74, 2.31); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.1), taxi.tailMat);
    t.position.set(s * 0.82, 0.74, -2.31); g.add(t);
  }
  for (const s of [-1, 1]){
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.16), yellow);
    mir.position.set(s * 1.16, 1.32, 0.72); g.add(mir);
  }
  taxi.gyroMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: taxiSignTex, emissive: 0x000000 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 0.42), taxi.gyroMat);
  sign.position.set(0, 1.66, -0.38); g.add(sign);
  const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.32, 14); tireGeo.rotateZ(Math.PI / 2);
  const capGeo  = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8);    capGeo.rotateZ(Math.PI / 2);
  [[0.98, 1.52, true], [-0.98, 1.52, true], [0.98, -1.45, false], [-0.98, -1.45, false]].forEach(([x, z, front]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.44, z);
    const spin = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, black); tire.castShadow = true;
    spin.add(tire, new THREE.Mesh(capGeo, chrome));
    pivot.add(spin); g.add(pivot);
    (front ? taxi.wheels.fronts : taxi.wheels.rears).push({ pivot, spin });
  });
  taxi.wheels.all = [...taxi.wheels.fronts, ...taxi.wheels.rears];
  g.rotation.order = 'YXZ';
  return g;
}
taxi.group = buildTaxi();
scene.add(taxi.group);

/* NOTE : la caméra regarde vers +Z derrière le taxi → +X monde est à GAUCHE
   de l'écran. Le lacet décroît quand on tourne à droite (sens corrigé). */
function updateTaxi(dt){
  const input = {
    up: keys.ArrowUp || keys.KeyW || touchCtl.up,
    down: keys.ArrowDown || keys.KeyS || touchCtl.down,
    left: keys.ArrowLeft || keys.KeyA,
    right: keys.ArrowRight || keys.KeyD,
    hb: keys.Space || touchCtl.hb,
  };
  let fx = Math.sin(taxi.heading), fz = Math.cos(taxi.heading);
  let rx = Math.cos(taxi.heading), rz = -Math.sin(taxi.heading);
  let vF = taxi.vel.x * fx + taxi.vel.y * fz;
  let vR = taxi.vel.x * rx + taxi.vel.y * rz;

  if (input.up) vF += CONF.ACCEL * dt;
  if (input.down) vF -= (vF > 0.6 ? CONF.BRAKE : CONF.REV_ACCEL) * dt;
  vF *= Math.exp(-CONF.DRAG * dt);
  vF = clamp(vF, -CONF.MAX_REV, CONF.MAX_SPEED);

  const target = touchCtl.steerActive
    ? clamp(touchCtl.steer, -1, 1)
    : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  taxi.steer = damp(taxi.steer, target, 9, dt);
  const dir = vF < -0.3 ? -1 : 1;
  taxi.heading -= taxi.steer * CONF.YAW_RATE * Math.min(1, Math.abs(vF) / 13) * dir * (input.hb ? 1.4 : 1) * dt;

  vR *= Math.exp(-(input.hb ? 1.6 : 8.5) * dt);
  vF *= Math.exp(-Math.abs(vR) * 0.012 * dt);

  fx = Math.sin(taxi.heading); fz = Math.cos(taxi.heading);
  rx = Math.cos(taxi.heading); rz = -Math.sin(taxi.heading);
  taxi.vel.set(fx * vF + rx * vR, fz * vF + rz * vR);
  taxi.vF = vF; taxi.vR = vR;

  taxi.pos.x += taxi.vel.x * dt; taxi.pos.z += taxi.vel.y * dt;
  state.odo += taxi.vel.length() * dt;
  const LIM = HALF + RH - 1;
  if (Math.abs(taxi.pos.x) > LIM){ taxi.pos.x = clamp(taxi.pos.x, -LIM, LIM); taxi.vel.x *= -0.4; }
  if (Math.abs(taxi.pos.z) > LIM){ taxi.pos.z = clamp(taxi.pos.z, -LIM, LIM); taxi.vel.y *= -0.4; }

  collideTaxi();

  /* Bordure de trottoir : détection du franchissement (variation du
     facteur curbK) → petite secousse + claquement sonore */
  const kNow = curbK(taxi.pos.x, taxi.pos.z);
  if (Math.abs(kNow - taxi.lastCurbK) > 0.3 && taxi.vel.length() > 3){
    camShake = Math.min(0.5, camShake + 0.05 + taxi.vel.length() * 0.003);
    sfx.noiseHit(320, 0.12, 0.09);
  }
  taxi.lastCurbK = kNow;
  taxi.pos.y = damp(taxi.pos.y, groundH(taxi.pos.x, taxi.pos.z), 11, dt);

  /* Assiette : cabrage à l'accélération + tangage selon la pente */
  const accel = (vF - taxi._pvF) / Math.max(dt, 1e-3); taxi._pvF = vF;
  const hF = groundH(taxi.pos.x + fx * 1.7, taxi.pos.z + fz * 1.7);
  const hB = groundH(taxi.pos.x - fx * 1.7, taxi.pos.z - fz * 1.7);
  const slope = clamp(-(hF - hB) / 3.4, -0.45, 0.45);
  taxi.pitch = damp(taxi.pitch, clamp(-accel * 0.0035, -0.05, 0.07) + slope, 6, dt);
  taxi.roll  = damp(taxi.roll, clamp(-taxi.steer * Math.min(1, Math.abs(vF) / 22) * 0.11 - vR * 0.006, -0.18, 0.18), 6, dt);

  taxi.group.position.copy(taxi.pos);
  taxi.group.rotation.set(taxi.pitch, taxi.heading, taxi.roll);
  for (const w of taxi.wheels.fronts) w.pivot.rotation.y = -taxi.steer * 0.5;
  for (const w of taxi.wheels.all) w.spin.rotation.x += vF * dt / 0.44;

  const braking = input.down && vF > 0.5;
  if (braking !== taxi.brakeLit){
    taxi.brakeLit = braking;
    taxi.tailMat.emissive.setHex(braking ? 0xff2200 : 0x550000);
    taxi.tailMat.emissiveIntensity = braking ? 1 : 0.4;
  }
  updateSkid(input.hb);
  sfx.engine(clamp(Math.abs(vF) / CONF.MAX_SPEED, 0, 1), input.up ? 1 : 0, dt);
  taxi.driftLevel = clamp((Math.abs(vR) - 3.5) / 9, 0, 1);
  sfx.skid(taxi.driftLevel);
}

function collideTaxi(){
  const r = CONF.TAXI_RADIUS;
  let impact = 0;
  for (let i = 0; i < colliders.length; i++){
    const b = colliders[i];
    if (taxi.pos.x < b.minX - r || taxi.pos.x > b.maxX + r ||
        taxi.pos.z < b.minZ - r || taxi.pos.z > b.maxZ + r) continue;
    const cx = clamp(taxi.pos.x, b.minX, b.maxX), cz = clamp(taxi.pos.z, b.minZ, b.maxZ);
    let dx = taxi.pos.x - cx, dz = taxi.pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    let d = Math.sqrt(d2);
    if (d < 1e-4){
      const pl = taxi.pos.x - b.minX, pr = b.maxX - taxi.pos.x;
      const pt = taxi.pos.z - b.minZ, pb = b.maxZ - taxi.pos.z;
      const m = Math.min(pl, pr, pt, pb);
      dx = m === pl ? -1 : m === pr ? 1 : 0;
      dz = dx === 0 ? (m === pt ? -1 : 1) : 0;
      d = 0;
    } else { dx /= d; dz /= d; }
    taxi.pos.x += dx * (r - d); taxi.pos.z += dz * (r - d);
    const vn = taxi.vel.x * dx + taxi.vel.y * dz;
    if (vn < 0){
      taxi.vel.x -= dx * vn * 1.35; taxi.vel.y -= dz * vn * 1.35;
      impact = Math.max(impact, -vn);
    }
    taxi.vel.multiplyScalar(0.88);
  }
  for (let i = 0; i < cylinders.length; i++){
    const c = cylinders[i];
    const dx = taxi.pos.x - c.x, dz = taxi.pos.z - c.z, rr = r + c.r;
    if (dx * dx + dz * dz >= rr * rr) continue;
    const d = Math.sqrt(dx * dx + dz * dz) || 1e-4;
    const nx = dx / d, nz = dz / d;
    taxi.pos.x += nx * (rr - d); taxi.pos.z += nz * (rr - d);
    const vn = taxi.vel.x * nx + taxi.vel.y * nz;
    if (vn < 0){ taxi.vel.x -= nx * vn * 1.4; taxi.vel.y -= nz * vn * 1.4; impact = Math.max(impact, -vn); }
  }
  if (impact > 6){
    camShake = Math.min(0.6, camShake + impact * 0.02);
    sfx.crash(impact);
    for (let i = 0; i < 4; i++) spawnPuff(taxi.pos.x + rand(-1, 1), 0.6, taxi.pos.z + rand(-1, 1));
    if (impact > 9) tipEvent(-3);
  }
  /* Véhicules : cercles selon le type + poussée proportionnelle à l'impact */
  for (let i = 0; i < vehicles.length; i++){
    const v = vehicles[i];
    const spec = VEH_SPEC[v.type];
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const cvx = v.moving ? fx * v.speed : 0, cvz = v.moving ? fz * v.speed : 0;
    for (const off of spec.offs){
      const cxx = v.x + fx * off, czz = v.z + fz * off, rr = r + spec.r;
      const dx = taxi.pos.x - cxx, dz = taxi.pos.z - czz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-4;
      const nx = dx / d, nz = dz / d;
      taxi.pos.x += nx * (rr - d); taxi.pos.z += nz * (rr - d);
      const vn = (taxi.vel.x - cvx) * nx + (taxi.vel.y - cvz) * nz;
      if (vn < 0){
        taxi.vel.x -= nx * vn * 1.3; taxi.vel.y -= nz * vn * 1.3;
        const rel = -vn; // violence de l'impact
        const vt = (taxi.vel.x - cvx) * -nz + (taxi.vel.y - cvz) * nx; // glissement tangentiel
        v.applyPush(nx, nz, rel * 0.6, vt);   // ← le véhicule est poussé
        v.stun = Math.max(v.stun, 1.2);
        if (rel > 4 && v.hitCd <= 0){
          v.hitCd = 1.2; state.run.cars++;
          tipEvent(-6);
          sfx.crash(rel); camShake = Math.min(0.6, camShake + rel * 0.015);
          for (let k = 0; k < 3; k++) spawnPuff(cxx + rand(-1, 1), 0.7, czz + rand(-1, 1));
        }
      }
      taxi.vel.multiplyScalar(0.94);
    }
  }
}

/* ================= 9. TRAFIC (réseau, virages en arcs, rond-points) ================= */
const vehicles = [];
const VEH_COLORS = [0xd8d3c8, 0x8a3b2f, 0x47606e, 0x5d7050, 0x9a8b6f, 0x676c72, 0xb3543e, 0x3e4a5a, 0xc7a54a];
const MOTO_COLORS = [0xd94f3a, 0x2fa39a, 0xe6a02e, 0x4a6fd9, 0x3ecf74, 0xe4d9c2, 0x8a4ac9];
const VEH_SPEC = {
  car:   { offs: [1.15, -1.15], r: 1.2,  mass: 0.62, gap: 5.0 },
  truck: { offs: [2.5, 0.6, -2.2], r: 1.35, mass: 0.26, gap: 8.2 },
  moto:  { offs: [0], r: 0.85, mass: 1.35, gap: 4.2 },
};
const VEH_CAP = { car: 520, moto: 200, truck: 160 };
const TURN_R = 7, RING_R = 7.6;

const headVec = (axis, dir) => axis === 'x' ? { x: dir, z: 0 } : { x: 0, z: dir };
const laneVec = (axis, dir) => axis === 'x' ? { x: 0, z: LANE_OFF * dir } : { x: -LANE_OFF * dir, z: 0 };
function segAt(n, out){
  if (out.axis === 'x') return out.dir > 0 ? (n.i < G && hSeg[n.j][n.i]) : (n.i > 0 && hSeg[n.j][n.i - 1]);
  return out.dir > 0 ? (n.j < G && vSeg[n.i][n.j]) : (n.j > 0 && vSeg[n.i][n.j - 1]);
}
/* Arc de quart de cercle entre deux directions perpendiculaires (lanes 3,6 m) */
function solveArc(E, hE, X, hX){
  for (let ccw = 1; ccw >= 0; ccw--){
    const nE = ccw ? { x: -hE.z, z: hE.x } : { x: hE.z, z: -hE.x };
    const nX = ccw ? { x: -hX.z, z: hX.x } : { x: hX.z, z: -hX.x };
    const ex = nE.x - nX.x, ez = nE.z - nX.z;
    const dx = X.x - E.x, dz = X.z - E.z;
    let R = -1;
    if (Math.abs(ex) > 1e-6){ const rr = dx / ex; if (rr > 0.6 && Math.abs(dz - rr * ez) < 0.06) R = rr; }
    else if (Math.abs(ez) > 1e-6){ const rr = dz / ez; if (rr > 0.6 && Math.abs(dx - rr * ex) < 0.06) R = rr; }
    if (R > 0){
      const C = { x: E.x + nE.x * R, z: E.z + nE.z * R };
      const a0 = Math.atan2(E.z - C.z, E.x - C.x);
      return { C, R, ccw: !!ccw, a0, a1: a0 + (ccw ? Math.PI / 2 : -Math.PI / 2), len: R * Math.PI / 2 };
    }
  }
  return null;
}
/* Angle d'entrée / de sortie sur l'anneau du rond-point */
function laneAngle(hx, hz, sign){
  return Math.atan2(sign * 5 * hz + LANE_OFF * hx, sign * 5 * hx - LANE_OFF * hz);
}
function ringDelta(inc, out){
  const hI = headVec(inc.axis, inc.dir), hO = headVec(out.axis, out.dir);
  let d = laneAngle(hI.x, hI.z, -1) - laneAngle(hO.x, hO.z, 1);
  while (d < 0) d += Math.PI * 2;
  return d;
}
function pickTurn(cands, inc){
  let total = 0;
  const ws = cands.map(c => { const w = (c.axis === inc.axis && c.dir === inc.dir) ? 2.2 : 1; total += w; return w; });
  let r = Math.random() * total;
  for (let k = 0; k < cands.length; k++){ r -= ws[k]; if (r <= 0) return cands[k]; }
  return cands[cands.length - 1];
}

/* ============ VÉHICULES : classe unifiée (voiture / camion / moto) ============
   bx/bz/bh : position "rail" (voie, arc de virage ou rond-point)
   ox/oz/oh : décalage dû aux poussées (physique d'impact)
   latOff   : décalage latéral de dépassement (anti-blocage)
   Position finale rendue : rail + poussée. */
class Vehicle {
  constructor(moving, type = 'car'){
    this.moving = moving;
    this.type = type;
    this.phase = 'seg'; this.axis = 'x'; this.dir = 1;
    this.row = 0; this.col = 0; this.seg = 0; this.s = 0;
    this.cruise = moving
      ? (type === 'moto' ? rand(11, 15) : type === 'truck' ? rand(6.5, 9.5) : rand(8, 13))
      : 0;
    this.speed = this.cruise;
    this.color = type === 'moto' ? pick(MOTO_COLORS) : pick(VEH_COLORS);
    this.bx = 0; this.bz = 0; this.bh = 0;         // rail
    this.x = 0; this.z = 0; this.heading = 0;      // position finale
    this.ox = 0; this.oz = 0; this.oh = 0;         // poussée (position)
    this.vx = 0; this.vz = 0; this.vh = 0;         // poussée (vitesse)
    this.latOff = 0; this.latTarget = 0;
    this.stuckT = 0; this.bypassT = 0; this.overtake = false;
    this.lean = 0; this.prevHead = 0;              // roulis de la moto
    this.hitCd = 0; this.nearCd = 0; this.stun = 0;
    this.turn = null; this.ring = null;
    this.planned = false; this.plan = null;
    this.slot = 0;
  }

  placeRandom(){
    for (let t = 0; t < 50; t++){
      const axis = Math.random() < 0.5 ? 'x' : 'z';
      if (axis === 'x'){
        const j = randInt(0, G), i = randInt(0, G - 1);
        if (!hSeg[j][i]) continue;
        this.axis = 'x'; this.row = j; this.seg = i; this.dir = pick([-1, 1]);
        this.s = u(i) + rand(13, CONF.CELL - 13);
      } else {
        const i = randInt(0, G), j = randInt(0, G - 1);
        if (!vSeg[i][j]) continue;
        this.axis = 'z'; this.col = i; this.seg = j; this.dir = pick([-1, 1]);
        this.s = u(j) + rand(13, CONF.CELL - 13);
      }
      this.updateSegPos();
      this.x = this.bx; this.z = this.bz; this.heading = this.bh;
      if (Math.hypot(this.x - taxi.pos.x, this.z - taxi.pos.z) < 24) continue;
      let ok = true;
      for (const o of vehicles){ if (Math.hypot(this.x - o.x, this.z - o.z) < 10){ ok = false; break; } }
      if (ok) return true;
    }
    return false;
  }

  placeParked(){
    for (let t = 0; t < 50; t++){
      const axis = Math.random() < 0.5 ? 'x' : 'z';
      if (axis === 'x'){
        const j = randInt(0, G), i = randInt(0, G - 1);
        if (!hSeg[j][i]) continue;
        this.s = u(i) + rand(13, CONF.CELL - 13);
        this.bx = this.s; this.bz = u(j) + pick([-PARK_OFF, PARK_OFF]);
        this.bh = pick([Math.PI / 2, -Math.PI / 2]);
      } else {
        const i = randInt(0, G), j = randInt(0, G - 1);
        if (!vSeg[i][j]) continue;
        this.s = u(j) + rand(13, CONF.CELL - 13);
        this.bx = u(i) + pick([-PARK_OFF, PARK_OFF]); this.bz = this.s;
        this.bh = pick([0, Math.PI]);
      }
      this.x = this.bx; this.z = this.bz; this.heading = this.bh;
      if (Math.hypot(this.x - taxi.pos.x, this.z - taxi.pos.z) < 20) continue;
      let ok = true;
      for (const o of vehicles){
        if (Math.hypot(this.x - o.x, this.z - o.z) < (o.moving ? 4.5 : 7.2)){ ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  nextNode(){
    return this.axis === 'x'
      ? { i: this.dir > 0 ? this.seg + 1 : this.seg, j: this.row }
      : { i: this.col, j: this.dir > 0 ? this.seg + 1 : this.seg };
  }
  nodeAlong(){
    return this.dir > 0 ? u(this.seg + 1) : u(this.seg);
  }

  /* Position sur la voie (conduite à droite) + décalage de dépassement */
  updateSegPos(){
    const lat = LANE_OFF + this.latOff;
    if (this.axis === 'x'){
      this.bx = this.s;
      this.bz = u(this.row) + this.dir * lat;
      this.bh = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      this.bx = u(this.col) - this.dir * lat;
      this.bz = this.s;
      this.bh = this.dir > 0 ? 0 : Math.PI;
    }
  }

  planAhead(){
    this.planned = true;
    const node = this.nextNode();
    const na = this.nodeAlong();
    const exits = nodeExits(node.i, node.j, this);
    const out = exits.length ? pickTurn(exits, this) : { axis: this.axis, dir: -this.dir };
    if (rbNodes.has(node.i + ',' + node.j)){
      this.plan = { type: 'ring', out, trigger: na - this.dir * RING_MERGE, node };
    } else if (out.axis === this.axis && out.dir === this.dir){
      this.plan = { type: 'straight', trigger: na, node };
    } else {
      this.plan = { type: 'turn', out, trigger: na - this.dir * RH, node };
    }
  }

  beginTurn(plan){
    const node = plan.node, out = plan.out;
    const hE = headVec(this.axis, this.dir);
    const hX = headVec(out.axis, out.dir);
    const naE = this.nodeAlong() - this.dir * RH;
    const E = this.axis === 'x'
      ? { x: naE, z: u(this.row) + this.dir * LANE_OFF }
      : { x: u(this.col) - this.dir * LANE_OFF, z: naE };
    const naX = (out.axis === 'x' ? u(node.i) : u(node.j)) + out.dir * RH;
    const X = out.axis === 'x'
      ? { x: naX, z: u(node.j) + out.dir * LANE_OFF }
      : { x: u(node.i) - out.dir * LANE_OFF, z: naX };
    const arc = solveArc(E, hE, X, hX);
    this.planned = false; this.plan = null;
    if (!arc){ this.dir *= -1; this.updateSegPos(); return; }
    this.bx = E.x; this.bz = E.z;
    this.phase = 'turn';
    this.turn = { C: arc.C, R: arc.R, ccw: arc.ccw, a: arc.a0, a1: arc.a1 };
    this.out = out; this.node = node; this.exitS = naX;
  }

  beginRing(plan){
    const node = plan.node, out = plan.out;
    const cx = u(node.i), cz = u(node.j);
    const naM = this.nodeAlong() - this.dir * RING_MERGE;
    const px = this.axis === 'x' ? naM : u(this.col) - this.dir * LANE_OFF;
    const pz = this.axis === 'x' ? u(this.row) + this.dir * LANE_OFF : naM;
    this.bx = px; this.bz = pz;
    const hI = headVec(this.axis, this.dir);
    const hO = headVec(out.axis, out.dir);
    const aIn = Math.atan2(pz - cz, px - cx);
    const aOut = ringMergeAngle(hO.x, hO.z);
    let delta = aIn - aOut;
    while (delta < 0.06) delta += Math.PI * 2;
    this.phase = 'ring';
    this.ring = {
      cx, cz, a: aIn, a0: aIn, a1: aOut, delta,
      hIn: Math.atan2(hI.x, hI.z), hOut: Math.atan2(hO.x, hO.z),
    };
    this.out = out; this.node = node;
    this.exitS = (out.axis === 'x' ? u(node.i) : u(node.j)) + out.dir * RING_MERGE;
    this.planned = false; this.plan = null;
  }

  advance(dt){
    if (this.phase === 'turn'){
      const T = this.turn;
      T.a += (this.speed / T.R) * dt * (T.ccw ? 1 : -1);
      const done = T.ccw ? T.a >= T.a1 : T.a <= T.a1;
      if (done) T.a = T.a1;
      this.bx = T.C.x + T.R * Math.cos(T.a);
      this.bz = T.C.z + T.R * Math.sin(T.a);
      this.bh = T.ccw
        ? Math.atan2(-Math.sin(T.a), Math.cos(T.a))
        : Math.atan2(Math.sin(T.a), -Math.cos(T.a));
      if (done){
        this.axis = this.out.axis; this.dir = this.out.dir;
        if (this.axis === 'x'){ this.row = this.node.j; this.seg = this.dir > 0 ? this.node.i : this.node.i - 1; }
        else { this.col = this.node.i; this.seg = this.dir > 0 ? this.node.j : this.node.j - 1; }
        this.s = this.exitS;
        this.phase = 'seg';
        this.updateSegPos();
        this.turn = null;
      }
      return;
    }
    if (this.phase === 'ring'){
      const R = this.ring;
      R.a -= (this.speed / RING_R) * dt;
      if (R.a < R.a1) R.a = R.a1;
      const p = clamp((R.a0 - R.a) / R.delta, 0, 1);
      this.bx = R.cx + RING_R * Math.cos(R.a);
      this.bz = R.cz + RING_R * Math.sin(R.a);
      const hT = Math.atan2(Math.sin(R.a), -Math.cos(R.a));
      this.bh = p < 0.22 ? lerpAngle(R.hIn, hT, p / 0.22)
              : p > 0.78 ? lerpAngle(hT, R.hOut, (p - 0.78) / 0.22)
              : hT;
      if (R.a <= R.a1 + 1e-9){
        this.axis = this.out.axis; this.dir = this.out.dir;
        if (this.axis === 'x'){ this.row = this.node.j; this.seg = this.dir > 0 ? this.node.i : this.node.i - 1; }
        else { this.col = this.node.i; this.seg = this.dir > 0 ? this.node.j : this.node.j - 1; }
        this.s = this.exitS;
        this.phase = 'seg';
        this.updateSegPos();
        this.ring = null;
      }
      return;
    }
    if (!this.planned && (this.nodeAlong() - this.s) * this.dir < RH + 10) this.planAhead();
    if (this.planned){
      const tr = this.plan.trigger;
      if ((tr - this.s) * this.dir <= 0){
        if (this.plan.type === 'straight'){
          this.seg += this.dir;
          this.planned = false; this.plan = null;
        } else if (this.plan.type === 'turn'){
          this.beginTurn(this.plan); return;
        } else {
          this.beginRing(this.plan); return;
        }
      }
    }
    this.s += this.dir * this.speed * dt;
    this.updateSegPos();
  }

  /* Poussée proportionnelle à la violence de l'impact (appelée par la
     collision du taxi). La masse du type module l'amplitude : une moto
     est éjectée, un camion bouge à peine. */
  applyPush(nx, nz, power, vt){
    const m = VEH_SPEC[this.type].mass;
    this.vx += nx * power * m;
    this.vz += nz * power * m;
    this.vh += clamp(vt * 0.2 * m, -2.2, 2.2);
    if (power > 5 && this.moving) this.stun = Math.max(this.stun, 0.9);
  }

  update(dt){
    this.hitCd = Math.max(0, this.hitCd - dt);
    this.nearCd = Math.max(0, this.nearCd - dt);
    /* Gravité "portable" : la poussée est intégrée avec frottements */
    this.ox += this.vx * dt; this.oz += this.vz * dt;
    const fr = Math.exp(-2.6 * dt);
    this.vx *= fr; this.vz *= fr;
    this.oh += this.vh * dt; this.vh *= Math.exp(-2.2 * dt);
    if (!this.moving){
      /* Véhicule garé : il reste là où on l'a poussé */
      this.x = this.bx + this.ox; this.z = this.bz + this.oz; this.heading = this.bh + this.oh;
      return;
    }
    /* Véhicule en mouvement : il reprend peu à peu sa voie après une poussée */
    this.ox = damp(this.ox, 0, 0.6, dt);
    this.oz = damp(this.oz, 0, 0.6, dt);
    this.oh = damp(this.oh, 0, 0.9, dt);
    this.stun = Math.max(0, this.stun - dt);
    let desired = this.stun > 0 ? 0 : this.cruise;
    if (this.phase === 'turn') desired = Math.min(desired, this.type === 'truck' ? 4.2 : 5.5);
    else if (this.phase === 'ring') desired = Math.min(desired, this.type === 'truck' ? 5 : 6.5);
    else if (this.planned && this.plan.type !== 'straight'){
      const d = (this.plan.trigger - this.s) * this.dir;
      if (d > 0 && d < 9) desired = Math.min(desired, 6);
    }
    const ahead = aheadSpeed(this);
    if (ahead < desired) desired = ahead;
    /* ---- ANTI-BLOCAGE : arrêté alors que je veux rouler depuis > 2,2 s →
       contournement pendant 3,4 s : soit décalage latéral pour doubler
       (même sens), soit "je force" en ignorant les véhicules arrêtés
       (débouche les carrefours en impasse) ---- */
    if (desired > 1.5 && this.speed < 0.8) this.stuckT += dt;
    else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 2.2){
      this.bypassT = 3.4;
      this.overtake = this.phase === 'seg' && Math.random() < 0.7;
      this.stuckT = 0;
    }
    if (this.bypassT > 0){
      this.bypassT -= dt;
      this.latTarget = this.overtake ? 3.0 : 0;
    } else { this.latTarget = 0; this.overtake = false; }
    this.latOff = damp(this.latOff, this.latTarget, 3.5, dt);
    /* Moto : prise de roulis en virage */
    if (this.type === 'moto'){
      let dh = this.bh - this.prevHead;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.lean = damp(this.lean, clamp((dh / Math.max(dt, 1e-4)) * 0.45, -0.55, 0.55), 6, dt);
      this.prevHead = this.bh;
    }
    this.speed = damp(this.speed, desired, 2.8, dt);
    this.advance(dt);
    this.x = this.bx + this.ox;
    this.z = this.bz + this.oz;
    this.heading = this.bh + this.oh;
  }
}

/* --- Aides navigation --- */
const RING_MERGE = Math.sqrt(RING_R * RING_R - LANE_OFF * LANE_OFF);
function ringMergeAngle(hx, hz){
  const rx = -hz, rz = hx;
  return Math.atan2(RING_MERGE * hz + LANE_OFF * rz, RING_MERGE * hx + LANE_OFF * rx);
}
function lerpAngle(a, b, t){
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function nodeExits(i, j, inc){
  const out = [];
  if (i < G && hSeg[j][i] && !(inc.axis === 'x' && inc.dir === -1)) out.push({ axis: 'x', dir: 1 });
  if (i > 0 && hSeg[j][i - 1] && !(inc.axis === 'x' && inc.dir === 1)) out.push({ axis: 'x', dir: -1 });
  if (j < G && vSeg[i][j] && !(inc.axis === 'z' && inc.dir === -1)) out.push({ axis: 'z', dir: 1 });
  if (j > 0 && vSeg[i][j - 1] && !(inc.axis === 'z' && inc.dir === 1)) out.push({ axis: 'z', dir: -1 });
  return out;
}

/* --- Grille spatiale : anti-collision en O(1) par véhicule --- */
const VCELL = 16, vgrid = new Map();
function rebuildVGrid(){
  vgrid.clear();
  for (let i = 0; i < vehicles.length; i++){
    const v = vehicles[i];
    const k = Math.floor((v.x + 600) / VCELL) * 128 + Math.floor((v.z + 600) / VCELL);
    const arr = vgrid.get(k);
    if (arr) arr.push(v); else vgrid.set(k, [v]);
  }
}
function aheadSpeed(v){
  let desired = Infinity;
  const hx = Math.sin(v.heading), hz = Math.cos(v.heading);
  const gap = VEH_SPEC[v.type].gap;
  const bypass = v.bypassT > 0;
  const cx = Math.floor((v.x + 600) / VCELL), cz = Math.floor((v.z + 600) / VCELL);
  for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++){
    const arr = vgrid.get((cx + ox) * 128 + (cz + oz));
    if (!arr) continue;
    for (let n = 0; n < arr.length; n++){
      const o = arr[n];
      if (o === v) continue;
      const dx = o.x - v.x, dz = o.z - v.z;
      const along = dx * hx + dz * hz;
      if (along < 0.8 || along > 14) continue;
      if (Math.abs(dx * hz - dz * hx) > 2.6) continue;
      /* En mode contournement : les véhicules arrêtés ne bloquent plus
         la progression (on repasse au ralenti devant eux) */
      if (bypass && along > 3.4 && o.speed < 1.5){
        desired = Math.min(desired, 4);
        continue;
      }
      desired = Math.min(desired, Math.max(0, (along - gap) * 1.4));
    }
  }
  /* Le taxi est un obstacle — mais un taxi arrêté finit par être doublé */
  const dxt = taxi.pos.x - v.x, dzt = taxi.pos.z - v.z;
  const alongT = dxt * hx + dzt * hz;
  if (alongT > 0.8 && alongT < 15 && Math.abs(dxt * hz - dzt * hx) < 2.8){
    if (bypass && alongT > 4 && taxi.vel.length() < 2){
      desired = Math.min(desired, 4);
    } else {
      desired = Math.min(desired, Math.max(0, (alongT - gap - 0.4) * 1.4));
    }
  }
  return desired;
}

/* --- Maillages instanciés : voiture, camion et moto — 3 draw calls
       par type pour l'ensemble de la circulation --- */
const vehIM = {};
function buildVehicleMeshes(){
  const mk = (geo, mat, cap) => {
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
    return im;
  };
  const set = (body, dark, lights, cap) => {
    const s = {
      body: mk(body, new THREE.MeshLambertMaterial({ color: 0xffffff }), cap),
      dark: mk(dark, new THREE.MeshLambertMaterial({ vertexColors: true }), cap),
      lights: mk(lights, new THREE.MeshBasicMaterial({ vertexColors: true }), cap),
    };
    s.body.castShadow = s.dark.castShadow = true;
    return s;
  };

  /* Voiture */
  const carBody = mergeParts([
    { geo: new THREE.BoxGeometry(1.9, 0.55, 4.2), y: 0.55, color: 0xffffff },
    { geo: new THREE.BoxGeometry(1.72, 0.1, 2.05), y: 1.28, z: -0.15, color: 0xffffff },
  ]);
  const carDark = mergeParts([
    { geo: new THREE.BoxGeometry(1.66, 0.5, 2.1), y: 1.0, z: -0.15, color: 0x232a30 },
    ...[[0.86, 1.35], [-0.86, 1.35], [0.86, -1.35], [-0.86, -1.35]].map(([x, z]) =>
      ({ geo: new THREE.CylinderGeometry(0.36, 0.36, 0.26, 10), x, y: 0.36, z, rz: Math.PI / 2, color: 0x17181a })),
    { geo: new THREE.BoxGeometry(1.94, 0.2, 0.28), y: 0.34, z: 2.12, color: 0x2f3134 },
    { geo: new THREE.BoxGeometry(1.94, 0.2, 0.28), y: 0.34, z: -2.12, color: 0x2f3134 },
    { geo: new THREE.BoxGeometry(1.2, 0.18, 0.06), y: 0.6, z: 2.11, color: 0x3a3d40 },
  ]);
  const carLights = mergeParts([
    { geo: new THREE.BoxGeometry(0.36, 0.13, 0.05), x: 0.62, y: 0.62, z: 2.12, color: 0xfff2c8 },
    { geo: new THREE.BoxGeometry(0.36, 0.13, 0.05), x: -0.62, y: 0.62, z: 2.12, color: 0xfff2c8 },
    { geo: new THREE.BoxGeometry(0.4, 0.12, 0.05), x: 0.62, y: 0.62, z: -2.12, color: 0xff4438 },
    { geo: new THREE.BoxGeometry(0.4, 0.12, 0.05), x: -0.62, y: 0.62, z: -2.12, color: 0xff4438 },
  ]);
  vehIM.car = set(carBody, carDark, carLights, VEH_CAP.car);

  /* Camion : cabine colorée + caisse claire + 6 roues */
  const truckBody = mergeParts([
    { geo: new THREE.BoxGeometry(2.35, 2.3, 2.1), y: 1.65, z: 2.55, color: 0xffffff },
    { geo: new THREE.BoxGeometry(2.3, 0.5, 1.6), y: 0.65, z: 2.55, color: 0xffffff },
  ]);
  const truckDark = mergeParts([
    { geo: new THREE.BoxGeometry(2.5, 2.9, 5.2), y: 2.05, z: -1.5, color: 0xd8d3c8 },
    { geo: new THREE.BoxGeometry(2.2, 0.9, 0.1), y: 2.0, z: 3.62, color: 0x232a30 },
    ...[[0.95, 2.7], [-0.95, 2.7], [0.95, -0.7], [-0.95, -0.7], [0.95, -2.6], [-0.95, -2.6]].map(([x, z]) =>
      ({ geo: new THREE.CylinderGeometry(0.5, 0.5, 0.36, 10), x, y: 0.5, z, rz: Math.PI / 2, color: 0x17181a })),
    { geo: new THREE.BoxGeometry(2.45, 0.35, 0.3), y: 0.55, z: 3.7, color: 0x2f3134 },
    { geo: new THREE.BoxGeometry(0.5, 0.6, 1.6), x: 1.28, y: 0.95, z: 0.4, color: 0x8f887c },
    { geo: new THREE.BoxGeometry(0.5, 0.6, 1.6), x: -1.28, y: 0.95, z: 0.4, color: 0x8f887c },
  ]);
  const truckLights = mergeParts([
    { geo: new THREE.BoxGeometry(0.4, 0.16, 0.06), x: 0.8, y: 0.9, z: 3.72, color: 0xfff2c8 },
    { geo: new THREE.BoxGeometry(0.4, 0.16, 0.06), x: -0.8, y: 0.9, z: 3.72, color: 0xfff2c8 },
    { geo: new THREE.BoxGeometry(0.34, 0.14, 0.06), x: 1.0, y: 0.7, z: -4.12, color: 0xff4438 },
    { geo: new THREE.BoxGeometry(0.34, 0.14, 0.06), x: -1.0, y: 0.7, z: -4.12, color: 0xff4438 },
    { geo: new THREE.BoxGeometry(0.34, 0.14, 0.06), x: 1.0, y: 2.4, z: -4.12, color: 0xff4438 },
    { geo: new THREE.BoxGeometry(0.34, 0.14, 0.06), x: -1.0, y: 2.4, z: -4.12, color: 0xff4438 },
  ]);
  vehIM.truck = set(truckBody, truckDark, truckLights, VEH_CAP.truck);

  /* Moto : carénage coloré + motard (veste sombre, casque) */
  const motoBody = mergeParts([
    { geo: new THREE.BoxGeometry(0.42, 0.4, 1.7), y: 0.72, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.5, 0.16, 0.5), y: 0.92, z: 0.45, color: 0xffffff },
  ]);
  const motoDark = mergeParts([
    { geo: new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10), y: 0.32, z: 0.68, rz: Math.PI / 2, color: 0x17181a },
    { geo: new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10), y: 0.32, z: -0.68, rz: Math.PI / 2, color: 0x17181a },
    { geo: new THREE.BoxGeometry(0.6, 0.07, 0.07), y: 1.02, z: 0.55, color: 0x2a2a2c },
    { geo: new THREE.BoxGeometry(0.34, 0.2, 0.34), y: 0.92, z: -0.5, color: 0x2a2a2c },
    { geo: new THREE.BoxGeometry(0.4, 0.5, 0.3), y: 1.3, z: -0.12, color: 0x35322e },
    { geo: new THREE.SphereGeometry(0.17, 8, 6), y: 1.68, z: -0.05, color: 0x8a2f2a },
    { geo: new THREE.BoxGeometry(0.1, 0.42, 0.1), x: 0.26, y: 1.22, z: 0.22, rx: 0.7, color: 0x35322e },
    { geo: new THREE.BoxGeometry(0.1, 0.42, 0.1), x: -0.26, y: 1.22, z: 0.22, rx: 0.7, color: 0x35322e },
  ]);
  const motoLights = mergeParts([
    { geo: new THREE.BoxGeometry(0.22, 0.16, 0.06), y: 0.88, z: 0.85, color: 0xfff2c8 },
    { geo: new THREE.BoxGeometry(0.18, 0.12, 0.06), y: 0.86, z: -0.85, color: 0xff4438 },
  ]);
  vehIM.moto = set(motoBody, motoDark, motoLights, VEH_CAP.moto);
}
buildVehicleMeshes();

function rebuildTraffic(){
  vehicles.length = 0;
  const p = store.opt.traffic / 100;
  const nMov = Math.round(CONF.MAX_MOVING * p);
  const nPar = Math.round(CONF.MAX_PARKED * p);
  const used = { car: 0, truck: 0, moto: 0 };
  const randType = (parked) => {
    for (let t = 0; t < 8; t++){
      const r = Math.random();
      const type = parked
        ? (r < 0.66 ? 'car' : r < 0.88 ? 'moto' : 'truck')
        : (r < 0.58 ? 'car' : r < 0.80 ? 'moto' : 'truck');
      if (used[type] < VEH_CAP[type]) return type;
    }
    return null; // capacité d'instances pleine
  };
  const spawn = (moving) => {
    const type = randType(!moving);
    if (!type) return;
    const v = new Vehicle(moving, type);
    used[type]++;
    if (moving ? v.placeRandom() : v.placeParked()) vehicles.push(v);
    else used[type]--;
  };
  for (let i = 0; i < nMov; i++) spawn(true);
  for (let i = 0; i < nPar; i++) spawn(false);
  /* Attribution des slots d'instance par type + couleurs */
  const counters = { car: 0, truck: 0, moto: 0 };
  const col = new THREE.Color();
  for (const v of vehicles){
    v.slot = counters[v.type]++;
    vehIM[v.type].body.setColorAt(v.slot, col.set(v.color));
  }
  for (const t of ['car', 'truck', 'moto']){
    if (vehIM[t].body.instanceColor) vehIM[t].body.instanceColor.needsUpdate = true;
    vehIM[t].body.count = vehIM[t].dark.count = vehIM[t].lights.count = counters[t];
  }
  updateVehicleMeshes();
}

const _vm = new THREE.Matrix4(), _vq = new THREE.Quaternion(), _ve = new THREE.Euler(),
      _vs = new THREE.Vector3(1, 1, 1), _vt = new THREE.Vector3();
function updateVehicleMeshes(){
  for (let i = 0; i < vehicles.length; i++){
    const v = vehicles[i];
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const probe = v.type === 'truck' ? 2.2 : 1.4;
    const hF = terrainH(v.x + fx * probe, v.z + fz * probe);
    const hB = terrainH(v.x - fx * probe, v.z - fz * probe);
    _ve.set(clamp(-(hF - hB) / (probe * 2), -0.35, 0.35), v.heading, v.type === 'moto' ? v.lean : 0, 'YXZ');
    _vq.setFromEuler(_ve);
    _vt.set(v.x, terrainH(v.x, v.z), v.z);
    _vm.compose(_vt, _vq, _vs);
    const M = vehIM[v.type];
    M.body.setMatrixAt(v.slot, _vm);
    M.dark.setMatrixAt(v.slot, _vm);
    M.lights.setMatrixAt(v.slot, _vm);
  }
  for (const t of ['car', 'truck', 'moto']){
    vehIM[t].body.instanceMatrix.needsUpdate = true;
    vehIM[t].dark.instanceMatrix.needsUpdate = true;
    vehIM[t].lights.instanceMatrix.needsUpdate = true;
  }
}

/* --- Décor de la place-belvédère (complété ici : arbres + bancs autour
     du monument, posés après les instanciations générales) --- */
{
  const i = plazaIJ.i, j = plazaIJ.j;
  const cx = blockCX(i), cz = blockCX(j);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 1.4, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6e4f35 });
  const leafMat  = new THREE.MeshLambertMaterial({ color: 0x5d8a4a });
  for (const [ox, oz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]){
    const x = cx + ox, z = cz + oz, y = groundH(x, z);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, y + 0.64, z); trunk.castShadow = true; scene.add(trunk);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 0), leafMat);
    leaf.position.set(x, y + 2.7, z); leaf.castShadow = true; scene.add(leaf);
    cylinders.push({ x, z, r: 0.35 });
    treeList.push({ x, z });
  }
  const benchGeo = mergeParts([
    { geo: new THREE.BoxGeometry(1.7, 0.06, 0.45), y: 0.42, color: 0x8a6a48 },
    { geo: new THREE.BoxGeometry(1.7, 0.42, 0.05), y: 0.68, z: -0.2, rx: -0.12, color: 0x8a6a48 },
    { geo: new THREE.BoxGeometry(0.06, 0.42, 0.42), x: -0.75, y: 0.21, color: 0x3a352f },
    { geo: new THREE.BoxGeometry(0.06, 0.42, 0.42), x: 0.75, y: 0.21, color: 0x3a352f },
  ]);
  const benchMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (let n = 0; n < 6; n++){
    const a = n / 6 * Math.PI * 2;
    const bx = cx + Math.cos(a) * 10.5, bz = cz + Math.sin(a) * 10.5;
    const b = new THREE.Mesh(benchGeo, benchMat);
    b.position.set(bx, groundH(bx, bz) + 0.02, bz);
    b.rotation.y = -a + Math.PI / 2;
    b.castShadow = true;
    scene.add(b);
  }
}

/* ================= 10. PIÉTONS ================= */
const SKIN_P  = [0xeab994, 0xc98d63, 0x8a5a3b, 0xf0cfa8];
const SHIRT_P = [0xd95b43, 0x2f9e8f, 0xe6952e, 0x6f9e44, 0xc14a6a, 0xc9a227, 0x46656f, 0x8d6bb0];
const PANTS_P = [0x39414d, 0x4a3b30, 0x5a5a5a, 0x6b5a4a];
const peds = [];
const pedIM = {};
let pedActive = CONF.PEDS;

function buildPedMeshes(){
  const shirtGeo = mergeParts([
    { geo: new THREE.BoxGeometry(0.44, 0.55, 0.26), y: 0.85, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.1, 0.45, 0.1), x: -0.28, y: 0.88, rz: 0.12, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.1, 0.45, 0.1), x: 0.28, y: 0.88, rz: -0.12, color: 0xffffff },
  ]);
  const darkGeo = mergeParts([
    { geo: new THREE.BoxGeometry(0.16, 0.52, 0.16), x: -0.11, y: 0.26, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.16, 0.52, 0.16), x: 0.11, y: 0.26, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.185, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), y: 1.34, color: 0xffffff },
  ]);
  const skinGeo = mergeParts([{ geo: new THREE.SphereGeometry(0.17, 10, 8), y: 1.32, color: 0xffffff }]);
  const mk = (geo) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), CONF.PEDS);
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow = true;
    scene.add(im);
    return im;
  };
  pedIM.shirt = mk(shirtGeo); pedIM.dark = mk(darkGeo); pedIM.skin = mk(skinGeo);
}
buildPedMeshes();

/* Position sur le pourtour d'un pâté (le trottoir) */
function rectPoint(half, s){
  const L = half * 2, per = L * 4;
  s = ((s % per) + per) % per;
  if (s < L) return [s - half, -half, Math.PI / 2];
  s -= L; if (s < L) return [half, s - half, 0];
  s -= L; if (s < L) return [half - s, half, -Math.PI / 2];
  s -= L; return [-half, half - s, Math.PI];
}

function spawnPeds(){
  peds.length = 0;
  const blocks = [];
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) blocks.push([i, j]);
  for (let n = 0; n < CONF.PEDS; n++){
    const [bi, bj] = pick(blocks);
    peds.push({
      bi, bj, s: rand(0, 160), dir: pick([-1, 1]), speed: rand(1.1, 1.8),
      scale: rand(0.92, 1.12), phase: rand(0, Math.PI * 2),
      state: 'walk', t: 0, nearCd: 0, x: 0, z: 0, kvx: 0, kvz: 0,
      cShirt: pick(SHIRT_P), cPants: pick(PANTS_P), cSkin: pick(SKIN_P),
    });
  }
  const col = new THREE.Color();
  peds.forEach((p, k) => {
    pedIM.shirt.setColorAt(k, col.set(p.cShirt));
    pedIM.dark.setColorAt(k, col.set(p.cPants));
    pedIM.skin.setColorAt(k, col.set(p.cSkin));
  });
  pedIM.shirt.instanceColor.needsUpdate = true;
  pedIM.dark.instanceColor.needsUpdate = true;
  pedIM.skin.instanceColor.needsUpdate = true;
  pedActive = Math.max(6, Math.round(CONF.PEDS * store.opt.traffic / 100));
  pedIM.shirt.count = pedIM.dark.count = pedIM.skin.count = pedActive;
}

const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(),
      _ps = new THREE.Vector3(), _pt = new THREE.Vector3();
function updatePeds(dt, time){
  const playing = state.mode === 'playing';
  const taxiSpeed = taxi.vel.length();
  for (let k = 0; k < pedActive; k++){
    const p = peds[k];
    p.nearCd = Math.max(0, p.nearCd - dt);
    let rx = 0, y = groundH(p.x, p.z), a = 0;
    if (p.state === 'walk'){
      const cx = blockCX(p.bi), cz = blockCX(p.bj);
      p.s += p.dir * p.speed * dt;
      if (Math.random() < 0.0015) p.dir *= -1;
      const rp = rectPoint(19.5, p.s);
      p.x = cx + rp[0]; p.z = cz + rp[1];
      a = rp[2] + (p.dir < 0 ? Math.PI : 0);
      y += Math.abs(Math.sin(time * 7 + p.phase)) * 0.05;
    } else if (p.state === 'down'){
      p.t += dt;
      p.x += p.kvx * dt; p.z += p.kvz * dt;
      p.kvx *= Math.exp(-3 * dt); p.kvz *= Math.exp(-3 * dt);
      rx = Math.PI / 2 * Math.min(1, p.t / 0.22);
      y += 0.25 * Math.min(1, p.t / 0.22);
      if (p.t > 3.5){ p.state = 'up'; p.t = 0; }
    } else { /* se relève */
      p.t += dt;
      rx = Math.PI / 2 * Math.max(0, 1 - p.t / 0.6);
      y += 0.25 * Math.max(0, 1 - p.t / 0.6);
      if (p.t > 0.6){ p.state = 'walk'; p.s = rand(0, 160); }
    }
    /* Interactions avec le taxi : renversement / frôlement */
    if (playing && p.state !== 'down'){
      const d = Math.hypot(p.x - taxi.pos.x, p.z - taxi.pos.z);
      if (d < 1.9 && taxiSpeed > 2){
        p.state = 'down'; p.t = 0;
        p.kvx = clamp(taxi.vel.x * 0.6, -6, 6); p.kvz = clamp(taxi.vel.y * 0.6, -6, 6);
        state.run.peds++;
        tipEvent(-15);
        sfx.thud(); camShake = Math.min(0.5, camShake + 0.18);
        for (let i = 0; i < 4; i++) spawnPuff(p.x + rand(-0.5, 0.5), 0.6, p.z + rand(-0.5, 0.5));
        toast('Piéton renversé ! Pourboire amputé', 'bad');
      } else if (state.phase === 'carrying' && d < 3.2 && d > 1.9 && taxiSpeed > 9 && p.nearCd <= 0){
        p.nearCd = 4; state.run.near++;
        tipEvent(3); sfx.whoosh(0.5);
      }
    }
    const wob = p.state === 'walk' ? Math.sin(time * 9 + p.phase) * 0.06 : 0;
    _pe.set(rx, a, wob);
    _pq.setFromEuler(_pe);
    _pt.set(p.x, y, p.z);
    _ps.setScalar(p.scale);
    _pm.compose(_pt, _pq, _ps);
    pedIM.shirt.setMatrixAt(k, _pm); pedIM.dark.setMatrixAt(k, _pm); pedIM.skin.setMatrixAt(k, _pm);
  }
  pedIM.shirt.instanceMatrix.needsUpdate = true;
  pedIM.dark.instanceMatrix.needsUpdate = true;
  pedIM.skin.instanceMatrix.needsUpdate = true;
}

/* ================= 11. CLIENTS (destination + difficulté colorée) ================= */
const DIFF_GREEN = new THREE.Color(0x3ecf74);
const DIFF_YELLOW = new THREE.Color(0xf7b32b);
const DIFF_RED = new THREE.Color(0xe5484d);
function diffColor(t){
  const c = new THREE.Color();
  if (t < 0.5) c.copy(DIFF_GREEN).lerp(DIFF_YELLOW, t * 2);
  else c.copy(DIFF_YELLOW).lerp(DIFF_RED, (t - 0.5) * 2);
  return c;
}
/* Destination sur un tronçon EXISTANT (hors rond-points) */
function generateDropoff(){
  for (let t = 0; t < 80; t++){
    let x, z;
    if (Math.random() < 0.5){
      const j = randInt(0, G), i = randInt(0, G - 1);
      if (!hSeg[j][i]) continue;
      x = u(i) + rand(14, CONF.CELL - 14);
      z = u(j) + rand(-4, 4);
    } else {
      const i = randInt(0, G), j = randInt(0, G - 1);
      if (!vSeg[i][j]) continue;
      x = u(i) + rand(-4, 4);
      z = u(j) + rand(14, CONF.CELL - 14);
    }
    let bad = false;
    for (const key of rbNodes){
      const [ri, rj] = key.split(',').map(Number);
      if (Math.hypot(x - u(ri), z - u(rj)) < 15){ bad = true; break; }
    }
    if (!bad) return { x, z };
  }
  return { x: 3, z: 30 };
}

const CLOTH = [0xd95b43, 0x2f9e8f, 0xe6952e, 0x6f9e44, 0xc14a6a, 0xc9a227, 0x46656f];
class Client {
  constructor(){
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.phase = rand(0, Math.PI * 2);
    const cloth = new THREE.MeshLambertMaterial({ color: pick(CLOTH) });
    const pants = new THREE.MeshLambertMaterial({ color: pick([0x39414d, 0x4a3b30, 0x5a5a5a]) });
    const skin  = new THREE.MeshLambertMaterial({ color: pick(SKIN_P) });
    const hair  = new THREE.MeshLambertMaterial({ color: pick([0x2a2018, 0x584033, 0x1a1a1e, 0x8a6a3a]) });
    for (const s of [-1, 1]){
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.55, 0.17), pants);
      leg.position.set(s * 0.12, 0.28, 0); leg.castShadow = true; this.body.add(leg);
    }
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.3), cloth);
    torso.position.y = 0.86; torso.castShadow = true; this.body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skin);
    head.position.y = 1.4; head.castShadow = true; this.body.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    cap.position.y = 1.42; this.body.add(cap);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.11), cloth);
    armL.position.set(-0.3, 1.05, 0); this.body.add(armL);
    this.armR = new THREE.Group(); this.armR.position.set(0.3, 1.28, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.11), cloth);
    arm.position.y = -0.2; this.armR.add(arm); this.body.add(this.armR);
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 5), new THREE.MeshBasicMaterial({ color: 0xf7b32b }));
    this.marker.rotation.x = Math.PI; this.marker.position.y = 3.1; this.body.add(this.marker);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(CONF.PICKUP_RADIUS - 0.5, CONF.PICKUP_RADIUS, 48),
      new THREE.MeshBasicMaterial({ color: 0xf7b32b, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
    );
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.06;
    this.group.add(this.ring);
    scene.add(this.group);
    this.state = 'waiting'; this.t = 0;
    this.spawn();
  }

  spawn(){
    let x = 0, z = 0, ok = false, tries = 0;
    while (!ok && tries++ < 90){
      const bi = randInt(0, G - 1), bj = randInt(0, G - 1);
      if (parkSet.has(bi + ',' + bj) || isPlaza(bi, bj)) continue;
      const cx = blockCX(bi), cz = blockCX(bj);
      /* côté donnant de préférence sur une rue existante */
      const sides = [];
      if (vSeg[bi + 1][bj]) sides.push([1, 0]);
      if (vSeg[bi][bj]) sides.push([-1, 0]);
      if (hSeg[bj + 1][bi]) sides.push([0, 1]);
      if (hSeg[bj][bi]) sides.push([0, -1]);
      const side = sides.length ? pick(sides) : pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      x = cx + (side[0] ? side[0] * (HB - 1.5) : rand(-16, 16));
      z = cz + (side[1] ? side[1] * (HB - 1.5) : rand(-16, 16));
      ok = Math.hypot(x - taxi.pos.x, z - taxi.pos.z) > 70;
      if (ok) for (const tr of treeList){ if (Math.hypot(x - tr.x, z - tr.z) < 2.5){ ok = false; break; } }
      if (ok) for (const c of clients){
        if (c !== this && c.state === 'waiting' && Math.hypot(x - c.x, z - c.z) < 40){ ok = false; break; }
      }
    }
    this.x = x; this.z = z;
    this.group.position.set(x, groundH(x, z), z);
    this.group.scale.setScalar(1);
    this.group.visible = true;
    this.body.rotation.y = rand(0, Math.PI * 2);
    this.state = 'waiting'; this.t = 0;
    /* Destination + code couleur de difficulté (vert = proche, rouge = loin) */
    this.dest = generateDropoff();
    this.dist = Math.hypot(this.dest.x - x, this.dest.z - z);
    this.diffT = clamp((this.dist - 140) / 780, 0, 1);
    this.color = diffColor(this.diffT);
    this.css = '#' + this.color.getHexString();
    this.diffName = this.diffT < 0.34 ? 'Course courte' : this.diffT < 0.67 ? 'Course normale' : 'Course longue';
    this.fare = Math.round(14 + this.dist * 0.22);
    this.marker.material.color.copy(this.color);
    this.ring.material.color.copy(this.color);
  }

  board(){ this.state = 'boarding'; this.t = 0; sfx.ding(); }

  update(dt, time){
    if (this.state === 'hidden') return;
    if (this.state === 'boarding'){
      this.t += dt * 2.2;
      this.group.scale.setScalar(Math.max(0.001, 1 - this.t));
      this.group.position.y += dt * 2.5;
      if (this.t >= 1){ this.group.visible = false; this.state = 'hidden'; }
      return;
    }
    this.body.position.y = Math.abs(Math.sin(time * 5 + this.phase)) * 0.16;
    this.armR.rotation.z = 2.6 + Math.sin(time * 9 + this.phase) * 0.35;
    this.marker.position.y = 3.1 + Math.sin(time * 2.5 + this.phase) * 0.25;
    this.marker.rotation.y += dt * 2.4;
    this.ring.material.opacity = 0.55 + Math.sin(time * 3 + this.phase) * 0.2;
  }
}
const clients = [];
for (let i = 0; i < CONF.CLIENTS; i++) clients.push(new Client());

/* ================= 12. ZONE DE DÉPÔT & EFFETS ================= */
let camShake = 0;
const dropZone = { group: new THREE.Group(), visible: false };
{
  const g = dropZone.group;
  dropZone.disc = new THREE.Mesh(
    new THREE.CylinderGeometry(CONF.DROP_RADIUS - 0.6, CONF.DROP_RADIUS - 0.6, 0.5, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x2ec96e, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  dropZone.disc.position.y = 0.3; g.add(dropZone.disc);
  dropZone.ring = new THREE.Mesh(
    new THREE.RingGeometry(CONF.DROP_RADIUS - 0.9, CONF.DROP_RADIUS, 48),
    new THREE.MeshBasicMaterial({ color: 0x53e08a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  dropZone.ring.rotation.x = -Math.PI / 2; dropZone.ring.position.y = 0.08; g.add(dropZone.ring);
  dropZone.beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.6, 46, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x59e591, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  dropZone.beam.position.y = 23; g.add(dropZone.beam);
  dropZone.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.7, 5), new THREE.MeshBasicMaterial({ color: 0x53e08a }));
  dropZone.arrow.rotation.x = Math.PI; dropZone.arrow.position.y = 7; g.add(dropZone.arrow);
  g.visible = false;
  scene.add(g);
}
function showDropZone(x, z, color){
  dropZone.group.position.set(x, terrainH(x, z), z);
  dropZone.group.visible = true; dropZone.visible = true;
  dropZone.disc.material.color.copy(color).multiplyScalar(0.6);
  dropZone.ring.material.color.copy(color);
  dropZone.beam.material.color.copy(color);
  dropZone.arrow.material.color.copy(color);
}
function hideDropZone(){ dropZone.group.visible = false; dropZone.visible = false; }
function updateDropZone(dt, time){
  if (!dropZone.visible) return;
  const s = 1 + Math.sin(time * 3.2) * 0.04;
  dropZone.disc.scale.set(s, 1, s);
  dropZone.ring.scale.setScalar(1 + Math.sin(time * 3.2) * 0.05);
  dropZone.beam.material.opacity = 0.09 + Math.sin(time * 2) * 0.04;
  dropZone.arrow.position.y = 7 + Math.sin(time * 3) * 0.8;
  dropZone.arrow.rotation.y += dt * 2;
}

/* --- Traces de dérapage (buffer circulaire de quads) --- */
const SKID_MAX = 420;
const skidGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(SKID_MAX * 4 * 3);
  for (let i = 1; i < pos.length; i += 3) pos[i] = -50;
  const idx = new Uint32Array(SKID_MAX * 6);
  for (let i = 0; i < SKID_MAX; i++){
    const v = i * 4;
    idx.set([v, v + 2, v + 1, v, v + 3, v + 2], i * 6);
  }
  skidGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  skidGeo.setIndex(new THREE.BufferAttribute(idx, 1));
}
const skidMesh = new THREE.Mesh(skidGeo, new THREE.MeshBasicMaterial({ color: 0x241f1a, transparent: true, opacity: 0.4, depthWrite: false }));
skidMesh.frustumCulled = false;
scene.add(skidMesh);
let skidHead = 0;

function pushSkid(prev, x, z){
  const dx = x - prev.x, dz = z - prev.y;
  if (dx * dx + dz * dz < 0.09) return false;
  const len = Math.hypot(dx, dz) || 1;
  const w = 0.17, px = -dz / len * w, pz = dx / len * w;
  const p = skidGeo.attributes.position.array, o = skidHead * 12;
  p[o] = prev.x + px;   p[o+1] = groundH(prev.x, prev.y) + 0.06; p[o+2] = prev.y + pz;
  p[o+3] = prev.x - px; p[o+4] = groundH(prev.x, prev.y) + 0.06; p[o+5] = prev.y - pz;
  p[o+6] = x - px;      p[o+7] = groundH(x, z) + 0.06;           p[o+8] = z - pz;
  p[o+9] = x + px;      p[o+10] = groundH(x, z) + 0.06;          p[o+11] = z + pz;
  skidGeo.attributes.position.needsUpdate = true;
  skidHead = (skidHead + 1) % SKID_MAX;
  prev.set(x, z);
  return true;
}
function updateSkid(handbrake){
  const drifting = Math.abs(taxi.vR) > 5 || (handbrake && Math.abs(taxi.vF) > 7);
  if (!drifting){ taxi.skidActive = false; return; }
  const fx = Math.sin(taxi.heading), fz = Math.cos(taxi.heading);
  const rx = Math.cos(taxi.heading), rz = -Math.sin(taxi.heading);
  [[0.98, -1.45], [-0.98, -1.45]].forEach((o, i) => {
    const wx = taxi.pos.x + rx * o[0] + fx * o[1];
    const wz = taxi.pos.z + rz * o[0] + fz * o[1];
    if (!taxi.skidActive){ taxi.prevRear[i].set(wx, wz); return; }
    if (pushSkid(taxi.prevRear[i], wx, wz) && Math.random() < 0.4) spawnPuff(wx, 0.3, wz);
  });
  taxi.skidActive = true;
}
function clearSkids(){
  const p = skidGeo.attributes.position.array;
  for (let i = 1; i < p.length; i += 3) p[i] = -50;
  skidGeo.attributes.position.needsUpdate = true;
  skidHead = 0;
}

/* --- Fumée de drift --- */
const PUFF_N = 80;
const puffGeo = new THREE.BufferGeometry();
const puffPos = new Float32Array(PUFF_N * 3);
for (let i = 1; i < puffPos.length; i += 3) puffPos[i] = -100;
puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
const puffPoints = new THREE.Points(puffGeo, new THREE.PointsMaterial({
  map: puffTex, size: 1.5, transparent: true, opacity: 0.5, depthWrite: false, color: 0xcfc6b8,
}));
puffPoints.frustumCulled = false;
scene.add(puffPoints);
const puffs = Array.from({ length: PUFF_N }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
let puffCursor = 0;
function spawnPuff(x, y, z){
  const p = puffs[puffCursor];
  p.life = rand(0.4, 0.8);
  p.vx = rand(-0.8, 0.8); p.vy = rand(1.2, 2.2); p.vz = rand(-0.8, 0.8);
  puffPos[puffCursor * 3] = x; puffPos[puffCursor * 3 + 1] = y; puffPos[puffCursor * 3 + 2] = z;
  puffCursor = (puffCursor + 1) % PUFF_N;
}
function updatePuffs(dt){
  for (let i = 0; i < PUFF_N; i++){
    const p = puffs[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    puffPos[i * 3] += p.vx * dt; puffPos[i * 3 + 1] += p.vy * dt; puffPos[i * 3 + 2] += p.vz * dt;
    if (p.life <= 0) puffPos[i * 3 + 1] = -100;
  }
  puffGeo.attributes.position.needsUpdate = true;
}

/* --- Onde de livraison --- */
const burst = {
  mesh: new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.25, 48),
    new THREE.MeshBasicMaterial({ color: 0x53e08a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })),
  t: 1,
};
burst.mesh.rotation.x = -Math.PI / 2;
scene.add(burst.mesh);
function triggerBurst(x, z, color){
  burst.mesh.position.set(x, groundH(x, z) + 0.15, z);
  burst.mesh.material.color.copy(color);
  burst.t = 0;
}
function updateBurst(dt){
  if (burst.t >= 1){ burst.mesh.material.opacity = 0; return; }
  burst.t = Math.min(1, burst.t + dt * 1.6);
  burst.mesh.scale.setScalar(1 + burst.t * 10);
  burst.mesh.material.opacity = 0.85 * (1 - burst.t);
}

/* ================= 13. HUD ================= */
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), money: $('hud-money'), rides: $('hud-rides'),
  timeLabel: $('hud-time-label'), time: $('hud-time'), timeBox: document.querySelector('.hud-time'),
  speed: $('hud-speed'), needle: $('compass-needle'), needlePath: $('needle-path'),
  compassLabel: $('compass-label'), compassDist: $('compass-dist'),
  pickup: $('pickup'), pickupProg: $('pickup-prog'), pickupLabel: $('pickup-label'),
  cpBox: $('cp-box'), cpName: $('cp-name'), cpInfo: $('cp-info'),
  card: $('course-card'), ccFare: $('cc-fare'), ccTip: $('cc-tip'),
  ccPops: $('cc-pops'), ccTime: $('cc-time'), ccBar: $('cc-bar'),
  toasts: $('toasts'), menu: $('menu'), scrOver: $('scr-over'),
  overMode: $('over-mode'),
  statMoney: $('stat-money'), statRides: $('stat-rides'), statDist: $('stat-dist'), statTime: $('stat-time'),
  muteBtn: $('btn-mute'), statsList: $('stats-list'),
};
const CIRC = 2 * Math.PI * 30;
let lastMoney = -1;

function toast(msg, type = ''){
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  ui.toasts.appendChild(el);
  setTimeout(() => el.classList.add('gone'), 2200);
  setTimeout(() => el.remove(), 2700);
}
function formatTime(t){
  t = Math.max(0, t);
  if (t >= 60){
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + String(s).padStart(2, '0');
  }
  return t < 10 ? t.toFixed(1) : String(Math.ceil(t));
}
function updateHUD(){
  ui.speed.textContent = Math.round(Math.abs(taxi.vF) * 3.6);
  if (state.money !== lastMoney){
    lastMoney = state.money;
    ui.money.textContent = '$' + state.money;
    ui.money.classList.remove('bump'); void ui.money.offsetWidth; ui.money.classList.add('bump');
    ui.rides.textContent = state.rides + (state.rides > 1 ? ' courses' : ' course');
  }
  ui.time.textContent = formatTime(state.timeLeft);
  ui.timeBox.classList.toggle('danger', state.timeLeft < 10);
}

const _camDir = new THREE.Vector3();
let needleCur = 0;
function updateCompass(tx, tz, label, css, dt){
  const dx = tx - taxi.pos.x, dz = tz - taxi.pos.z;
  camera.getWorldDirection(_camDir);
  const rel = Math.atan2(dx, dz) - Math.atan2(_camDir.x, _camDir.z);
  const deg = -rel * 180 / Math.PI;
  const diff = ((deg - needleCur) % 360 + 540) % 360 - 180;
  needleCur += diff * Math.min(1, dt * 12);
  ui.needle.setAttribute('transform', `rotate(${needleCur.toFixed(1)} 50 50)`);
  ui.compassDist.textContent = Math.round(Math.hypot(dx, dz)) + ' m';
  ui.compassLabel.textContent = label;
  ui.compassLabel.style.color = css;
  ui.needlePath.style.fill = css;
}

/* Pourboire : petit chiffre flottant dans la carte de course */
function tipPop(amount){
  const s = document.createElement('span');
  s.className = 'tip-pop ' + (amount >= 0 ? 'good' : 'bad');
  s.textContent = (amount >= 0 ? '+' : '−') + '$' + Math.abs(amount);
  ui.ccPops.appendChild(s);
  setTimeout(() => s.remove(), 700);
}
function tipEvent(amount){
  if (state.phase !== 'carrying') return;
  state.tip = clamp(state.tip + amount, -30, 90);
  tipPop(amount);
}
function updateCourseCard(){
  ui.ccFare.textContent = '$' + state.fare;
  ui.ccFare.style.color = state.onBoard ? state.onBoard.css : '';
  const t = Math.round(state.tip);
  ui.ccTip.textContent = (t >= 0 ? '+$' : '−$') + Math.abs(t);
  ui.ccTip.className = t >= 0 ? 'good' : 'bad';
  ui.ccTime.textContent = formatTime(Math.max(0, state.courseTime));
  ui.ccBar.style.width = (clamp(state.courseTime / state.courseTotal, 0, 1) * 100) + '%';
}

/* ================= 14. MENUS ================= */
const pages = { main: $('pg-main'), arcade: $('pg-arcade'), options: $('pg-options'), stats: $('pg-stats') };
function showPage(name){
  for (const k in pages) pages[k].classList.toggle('hidden', k !== name);
}
 $('m-arcade').addEventListener('click', () => showPage('arcade'));
 $('m-options').addEventListener('click', () => showPage('options'));
 $('m-stats').addEventListener('click', () => { renderStats(); showPage('stats'); });
document.querySelectorAll('.btn-back').forEach(b => b.addEventListener('click', () => showPage('main')));
document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => startGame(b.dataset.mode)));

function wireOpt(inputId, valId, key, fmt, onchange){
  const inp = $(inputId), lab = $(valId);
  inp.value = store.opt[key];
  lab.textContent = fmt(store.opt[key]);
  inp.addEventListener('input', () => {
    store.opt[key] = +inp.value;
    lab.textContent = fmt(store.opt[key]);
    saveOpt();
    if (onchange) onchange();
  });
}
wireOpt('opt-start', 'ov-start', 'start', v => v + ' s');
wireOpt('opt-tmult', 'ov-tmult', 'tmult', v => v + ' %');
wireOpt('opt-traffic', 'ov-traffic', 'traffic', v => v + ' %', rebuildTraffic);
wireOpt('opt-vm', 'ov-vm', 'volM', v => v + ' %', applyVolumes);
wireOpt('opt-ve', 'ov-ve', 'volE', v => v + ' %', applyVolumes);
wireOpt('opt-vf', 'ov-vf', 'volF', v => v + ' %', applyVolumes);
function applyVolumes(){
  sfx.setVolumes(store.opt.volM / 100, store.opt.volE / 100, store.opt.volF / 100);
}
applyVolumes();

const STATS_DEF = [
  ['Parties jouées', s => s.games],
  ['Courses livrées', s => s.rides],
  ['Argent gagné (cumulé)', s => '$' + s.earned],
  ['Meilleure recette', s => '$' + s.best],
  ['Distance parcourue', s => (s.dist / 1000).toFixed(1) + ' km'],
  ['Temps de service', s => Math.floor(s.time / 60) + ' min ' + Math.round(s.time % 60) + ' s'],
  ['Frôlements réussis', s => s.near],
  ['Pourboires encaissés', s => '$' + s.tips],
  ['Meilleur pourboire', s => '$' + s.bestTip],
  ['Véhicules percutés', s => s.cars],
  ['Piétons renversés', s => s.peds],
];
function renderStats(){
  ui.statsList.innerHTML = '';
  for (const [label, get] of STATS_DEF){
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span>${label}</span><b>${get(store.stats)}</b>`;
    ui.statsList.appendChild(row);
  }
}
let wipeArmed = false;
 $('btn-wipe').addEventListener('click', function(){
  if (!wipeArmed){
    wipeArmed = true; this.textContent = 'CONFIRMER ?'; this.classList.add('confirm');
    setTimeout(() => { wipeArmed = false; this.textContent = 'EFFACER LES STATISTIQUES'; this.classList.remove('confirm'); }, 3000);
    return;
  }
  store.stats = Object.assign({}, DEF_STATS);
  saveStats(); renderStats();
  wipeArmed = false; this.textContent = 'EFFACER LES STATISTIQUES'; this.classList.remove('confirm');
});

/* ================= 15. DÉROULEMENT DE LA PARTIE ================= */
function nearestClient(){
  let best = null, bd = Infinity;
  for (const c of clients){
    if (c.state !== 'waiting') continue;
    const d = Math.hypot(c.x - taxi.pos.x, c.z - taxi.pos.z);
    if (d < bd){ bd = d; best = c; }
  }
  return best ? { client: best, dist: bd } : null;
}

function startCourse(client){
  state.phase = 'carrying';
  state.onBoard = client;
  state.courseDist = client.dist;
  state.fare = client.fare;
  state.tip = 0;
  state.courseTotal = clamp((12 + client.dist * 0.1) * store.opt.tmult / 100, 20, 150);
  state.courseTime = state.courseTotal;
  showDropZone(client.dest.x, client.dest.z, client.color);
  client.board();
  ui.card.classList.remove('hidden');
  toast(`${client.diffName} — $${client.fare} à la clef`);
}

function completeCourse(){
  const early = clamp(state.courseTime / state.courseTotal, 0, 1);
  const earlyTip = Math.round(18 * early);      // arrivée anticipée → pourboire
  state.tip += earlyTip;
  if (earlyTip > 0) tipPop(earlyTip);
  const tip = Math.round(state.tip);
  const pay = Math.max(5, state.fare + tip);
  state.money += pay;
  state.rides++;
  state.run.tips += Math.max(0, tip);
  state.run.bestTip = Math.max(state.run.bestTip, tip);
  if (state.gameMode.type === 'classic'){
    const bonus = clamp(Math.round((6 + state.courseDist * 0.045) * store.opt.tmult / 100), 6, 30);
    state.timeLeft += bonus;
    toast(`Course livrée : +$${pay} · +${bonus} s`, 'good');
  } else {
    toast(`Course livrée : +$${pay}`, 'good');
  }
  if (tip > 0) toast(`Dont $${tip} de pourboire`, 'good');
  else if (tip < 0) toast(`Pourboire négatif : $${tip}…`, 'bad');
  triggerBurst(taxi.pos.x, taxi.pos.z, state.onBoard.color);
  sfx.jingle();
  endCourse();
}
function failCourse(){
  toast('Trop tard — le client est parti…', 'bad');
  sfx.fail();
  endCourse();
}
function endCourse(){
  if (state.onBoard) state.onBoard.spawn();
  state.onBoard = null;
  state.phase = 'roaming';
  state.pickupProgress = 0;
  hideDropZone();
  ui.card.classList.add('hidden');
}

/* Frôlements de voitures (pendant une course) */
function updateNearMisses(){
  if (state.phase !== 'carrying') return;
  if (taxi.vel.length() < 12) return;
  for (const v of vehicles){
    if (v.hitCd > 0 || v.nearCd > 0) continue;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    let d = Infinity;
    for (const off of VEH_SPEC[v.type].offs)
      d = Math.min(d, Math.hypot(taxi.pos.x - (v.x + fx * off), taxi.pos.z - (v.z + fz * off)));
    if (d > 2.8 && d < 3.9){
      v.nearCd = 3; state.run.near++;
      tipEvent(4); sfx.whoosh();
    }
  }
}

function updateGameplay(dt){
  if (state.phase === 'roaming'){
    const near = nearestClient();
    let inRange = false;
    if (near){
      const c = near.client;
      updateCompass(c.x, c.z, 'CLIENT', c.css, dt);
      if (near.dist < 32){
        ui.cpBox.classList.remove('hidden');
        ui.cpName.textContent = c.diffName;
        ui.cpName.style.color = c.css;
        ui.cpInfo.textContent = `≈ ${Math.round(c.dist)} m · $${c.fare}`;
        ui.pickupProg.style.stroke = c.css;
      } else ui.cpBox.classList.add('hidden');
      if (near.dist < CONF.PICKUP_RADIUS && taxi.vel.length() < CONF.PICKUP_SPEED){
        inRange = true;
        state.pickupProgress = Math.min(1, state.pickupProgress + dt / CONF.PICKUP_TIME);
        if (state.pickupProgress >= 1){ startCourse(c); return; }
      } else {
        state.pickupProgress = Math.max(0, state.pickupProgress - dt * 2);
      }
    } else {
      ui.cpBox.classList.add('hidden');
      state.pickupProgress = 0;
    }
    if (state.pickupProgress > 0.02 || (near && near.dist < 32)){
      ui.pickup.classList.remove('hidden');
      ui.pickupProg.style.strokeDashoffset = CIRC * (1 - state.pickupProgress);
      ui.pickupLabel.textContent = inRange ? 'Chargement du client…' : 'Arrêtez-vous dans le cercle';
    } else ui.pickup.classList.add('hidden');
  } else {
    updateCompass(dropZone.group.position.x, dropZone.group.position.z, 'DESTINATION', state.onBoard.css, dt);
    ui.pickup.classList.add('hidden');
    ui.cpBox.classList.add('hidden');
    state.pickupProgress = 0;
    updateCourseCard();
    const d = Math.hypot(dropZone.group.position.x - taxi.pos.x, dropZone.group.position.z - taxi.pos.z);
    if (d < CONF.DROP_RADIUS){ completeCourse(); return; }
  }
  /* Chronos */
  state.timeLeft -= dt;
  state.serviceTime += dt;
  if (state.phase === 'carrying'){
    state.courseTime -= dt;
    if (state.courseTime <= 0) failCourse();
  }
  if (state.timeLeft <= 0) gameOver();
}

function startGame(modeStr){
  state.gameMode = modeStr === 'classic'
    ? { type: 'classic' }
    : { type: 'shift', secs: +modeStr };
  Object.assign(state, {
    mode: 'playing', phase: 'roaming', money: 0, rides: 0,
    timeLeft: state.gameMode.type === 'classic' ? store.opt.start : state.gameMode.secs,
    courseTime: 0, courseTotal: 1, courseDist: 0, fare: 0, tip: 0,
    odo: 0, serviceTime: 0, onBoard: null, pickupProgress: 0,
    run: { near: 0, cars: 0, peds: 0, tips: 0, bestTip: 0 },
  });
  /* Départ : voie de droite de la rue verticale x = 0, vers le nord de la carte */
  taxi.pos.set(-LANE_OFF, 0, u(7) + 24);
  taxi.vel.set(0, 0);
  taxi.heading = 0; taxi.vF = taxi.vR = 0; taxi._pvF = 0; taxi.steer = 0;
  taxi.pos.y = groundH(taxi.pos.x, taxi.pos.z);
  taxi.lastCurbK = curbK(taxi.pos.x, taxi.pos.z);
  for (const c of clients) c.spawn();
  for (const p of peds){ p.state = 'walk'; p.nearCd = 0; }
  hideDropZone();
  clearSkids();
  rebuildTraffic();
  spawnPeds();
  camShake = 0;
  ui.toasts.innerHTML = '';
  ui.card.classList.add('hidden');
  lastMoney = -1;
  ui.timeLabel.textContent = state.gameMode.type === 'classic' ? 'Chrono' : 'Service';
  camSmooth.pos.set(taxi.pos.x, 5.4, taxi.pos.z - 11);
  camSmooth.look.set(taxi.pos.x, 1.6, taxi.pos.z + 7);
  camera.fov = 62; camera.updateProjectionMatrix();
  ui.menu.classList.add('hidden');
  ui.scrOver.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  sfx.init(); sfx.resume(); applyVolumes();
  toast(state.gameMode.type === 'classic'
    ? 'Trouvez un client et arrêtez-vous près de lui !'
    : `Service de ${state.gameMode.secs / 60} min — un maximum de courses !`);
}

function recordRun(){
  const S = store.stats, r = state;
  S.games++; S.rides += r.rides; S.earned += r.money;
  S.best = Math.max(S.best, r.money);
  S.dist += r.odo; S.time += r.serviceTime;
  S.near += r.run.near; S.cars += r.run.cars; S.peds += r.run.peds;
  S.tips += r.run.tips; S.bestTip = Math.max(S.bestTip, r.run.bestTip);
  saveStats();
}
function gameOver(){
  if (state.mode !== 'playing') return;
  state.mode = 'over';
  recordRun();
  sfx.engineOff(); sfx.skid(0); sfx.horn(false);
  ui.hud.classList.add('hidden');
  ui.overMode.textContent = state.gameMode.type === 'classic'
    ? 'Mode Arcade classique' : `Service de ${state.gameMode.secs / 60} minutes`;
  ui.statMoney.textContent = '$' + state.money;
  ui.statRides.textContent = state.rides;
  ui.statDist.textContent = (state.odo / 1000).toFixed(1) + ' km';
  ui.statTime.textContent = Math.round(state.serviceTime) + ' s';
  ui.scrOver.classList.remove('hidden');
}
function toMenu(){
  if (state.mode === 'playing') recordRun();
  state.mode = 'menu';
  sfx.engineOff(); sfx.skid(0); sfx.horn(false);
  ui.hud.classList.add('hidden');
  ui.scrOver.classList.add('hidden');
  ui.menu.classList.remove('hidden');
  showPage('main');
}

/* --- Caméra 3e personne avec inertie --- */
const camSmooth = { pos: new THREE.Vector3(0, 6, -45), look: new THREE.Vector3(0, 1, 0) };
function updateCamera(dt){
  const fx = Math.sin(taxi.heading), fz = Math.cos(taxi.heading);
  const speed = taxi.vel.length();
  const back = 10.5 + speed * 0.08;
  camSmooth.pos.x = damp(camSmooth.pos.x, taxi.pos.x - fx * back, 4.5, dt);
  camSmooth.pos.y = damp(camSmooth.pos.y, taxi.pos.y + 5.4 + speed * 0.02, 4.5, dt);
  camSmooth.pos.z = damp(camSmooth.pos.z, taxi.pos.z - fz * back, 4.5, dt);
  camera.position.copy(camSmooth.pos);
  if (camShake > 0.002){
    camera.position.x += (Math.random() - 0.5) * camShake;
    camera.position.y += (Math.random() - 0.5) * camShake * 0.6;
    camera.position.z += (Math.random() - 0.5) * camShake;
    camShake *= Math.exp(-5 * dt);
  }
  camera.position.y = Math.max(1.4, camera.position.y);
  camSmooth.look.x = damp(camSmooth.look.x, taxi.pos.x + fx * 7, 6, dt);
  camSmooth.look.y = damp(camSmooth.look.y, taxi.pos.y + 1.6, 6, dt);
  camSmooth.look.z = damp(camSmooth.look.z, taxi.pos.z + fz * 7, 6, dt);
  camera.lookAt(camSmooth.look);
  camera.fov = damp(camera.fov, 60 + clamp(speed / CONF.MAX_SPEED, 0, 1) * 13, 3, dt);
  camera.updateProjectionMatrix();
}

/* ================= 16. ENTRÉES + BOUCLE PRINCIPALE ================= */
const keys = {};
const GAME_KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, Space: 1 };
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS[e.code]) e.preventDefault();
  if (e.code === 'KeyH' && !e.repeat){ sfx.init(); sfx.resume(); sfx.horn(true); }
  if (e.code === 'Escape' && state.mode !== 'menu') toMenu();
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'KeyH') sfx.horn(false);
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; sfx.horn(false); });

 $('btn-replay').addEventListener('click', () =>
  startGame(state.gameMode.type === 'classic' ? 'classic' : String(state.gameMode.secs)));
 $('btn-menu').addEventListener('click', toMenu);
ui.muteBtn.addEventListener('click', () => {
  sfx.init(); sfx.resume();
  sfx.setMuted(!sfx.muted);
  ui.muteBtn.classList.toggle('muted', sfx.muted);
});

/* ================= 17. CONTRÔLES TACTILES (joystick flottant) ================= */
/* Zone gauche de l'écran : le joystick apparaît là où le doigt se pose.
   Vertical = accélérer / freiner-reculer · horizontal = direction analogique.
   À droite : frein à main, klaxon, et un bouton MENU (pas d'ÉCHAP sur mobile). */
const touchCtl = { steer: 0, steerActive: false, up: false, down: false, hb: false, id: null, bx: 0, by: 0 };
if (IS_TOUCH){
  document.getElementById('touch-ui').classList.remove('hidden');
  const zone  = document.getElementById('joy-zone');
  const base  = document.getElementById('joy-base');
  const stick = document.getElementById('joy-stick');
  const R = 46; // course maximale du stick (px)

  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sfx.init(); sfx.resume(); // débloque l'audio iOS au premier toucher
    if (touchCtl.id !== null) return;
    const t = e.changedTouches[0];
    touchCtl.id = t.identifier;
    touchCtl.bx = t.clientX; touchCtl.by = t.clientY;
    base.style.display = 'block';
    base.style.left = touchCtl.bx + 'px';
    base.style.top = touchCtl.by + 'px';
    stick.style.transform = 'translate(0px, 0px)';
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches){
      if (t.identifier !== touchCtl.id) continue;
      let dx = t.clientX - touchCtl.bx, dy = t.clientY - touchCtl.by;
      const d = Math.hypot(dx, dy);
      if (d > R){ dx = dx / d * R; dy = dy / d * R; }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      touchCtl.steer = clamp(dx / 34, -1, 1);        // direction analogique
      touchCtl.steerActive = Math.abs(dx) > 8;        // zone morte
      touchCtl.up = dy < -16;                          // pousser = accélérer
      touchCtl.down = dy > 16;                         // tirer = freiner / reculer
    }
  }, { passive: false });

  const joyEnd = (e) => {
    for (const t of e.changedTouches){
      if (t.identifier !== touchCtl.id) continue;
      touchCtl.id = null;
      touchCtl.steer = 0; touchCtl.steerActive = false;
      touchCtl.up = touchCtl.down = false;
      base.style.display = 'none';
    }
  };
  zone.addEventListener('touchend', joyEnd);
  zone.addEventListener('touchcancel', joyEnd);

  /* Boutons tactiles */
  const bindBtn = (id, on, off) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); sfx.init(); sfx.resume(); on(); }, { passive: false });
    const end = (e) => { e.preventDefault(); off(); };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  };
  bindBtn('tb-hb',   () => touchCtl.hb = true, () => touchCtl.hb = false);
  bindBtn('tb-horn', () => sfx.horn(true),      () => sfx.horn(false));
  bindBtn('tb-menu', () => { if (state.mode === 'playing') toMenu(); }, () => {});
}

/* Menu / game over : la ville vit derrière le panneau */
let menuAngle = 0;
function updateIdle(dt, time){
  rebuildVGrid();
  for (const v of vehicles) v.update(dt);
  updateVehicleMeshes();
  updatePeds(dt, time);
  updateLights(time);
  for (const c of clients) c.update(dt, time);
  updateDropZone(dt, time);
  updatePuffs(dt); updateBurst(dt);
  menuAngle += dt * 0.1;
  camera.position.set(taxi.pos.x + Math.sin(menuAngle) * 17, taxi.pos.y + 6.5, taxi.pos.z + Math.cos(menuAngle) * 17);
  camera.lookAt(taxi.pos.x, taxi.pos.y + 1.2, taxi.pos.z);
  camera.fov = damp(camera.fov, 55, 2, dt);
  camera.updateProjectionMatrix();
}

function updatePlaying(dt, time){
  updateTaxi(dt);
  rebuildVGrid();
  for (const v of vehicles) v.update(dt);
  updateVehicleMeshes();
  updatePeds(dt, time);
  updateLights(time);
  for (const c of clients) c.update(dt, time);
  updateDropZone(dt, time);
  updateGameplay(dt);
  updateNearMisses();
  updateCamera(dt);
  updateHUD();
  updatePuffs(dt);
  updateBurst(dt);
  taxi.gyroMat.emissive.setHex((state.onBoard && Math.floor(time * 5) % 2) ? 0xf7b32b : 0x000000);
  sun.position.set(taxi.pos.x + 90, 150, taxi.pos.z + 60);
  sun.target.position.set(taxi.pos.x, 0, taxi.pos.z);
  sun.target.updateMatrixWorld();
}

/* Initialisation */
rebuildTraffic();
spawnPeds();
showPage('main');

let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const time = now / 1000;
  if (state.mode === 'playing') updatePlaying(dt, time);
  else updateIdle(dt, time);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);