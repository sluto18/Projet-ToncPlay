// ============================================================
// RASTA JUMP — Refonte Optimisée (Mécanique T-Rex)
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');

// --- Constantes Physiques ---
const GROUND_Y        = canvas.height - 20;
const GRAVITY         = 1500;     // Gravité forte pour un saut réactif
const JUMP_FORCE      = -750;     // Force de saut de base
const COLLISION_PAD_X = 10;
const COLLISION_PAD_Y = 10;
const SPRITE_FRAMES   = 16;
const BG_OVERLAP      = 2;

// --- Variables globales ---
let gameSpeed      = 180; // px/s
let obstacles      = [];
let score          = 0;
let bestScore      = parseInt(localStorage.getItem('rastaBest')) || 0;
let elapsedTime    = 0;
let lastFrameTime  = 0;
let backgroundX    = 0;
let spawnTimer     = 1.5;
let globalDistanceTraveled = 0;

let gameState = 'LOADING';

// Saut (Façon T-Rex)
let isJumpHeld = false;

// Sprite sheet
let spriteFrameW = 50, spriteFrameH = 50;

// Systèmes visuels
let particles  = [];
let scorePops  = [];
let speedLines = [];
let clouds     = [];
let leaves     = [];

// Screen shake
let shakeAmount   = 0;
let shakeDuration = 0;

// Suivi du joueur
let wasJumping        = false;
let explosionSpawned  = false;

// Boutons canvas
let startButtonRect   = {};
let helpButtonRect    = {};
let helpCloseRect     = {};
let helpPanelRect     = {};
let restartButtonRect = {};
let homeButtonRect    = {};

// Survol boutons
let isMouseOverStart      = false;
let isMouseOverHelp       = false;
let isMouseOverHelpClose  = false;
let isMouseOverRestart    = false;
let isMouseOverHome       = false;

// Panel aide
let showHelp = false;
let globalTime = 0;

bestEl.textContent = bestScore;

// ============================================================
// CHARGEMENT DES IMAGES
// ============================================================
const images = {};
const imgNames = ['rasta1','rasta2','rasta3','rasta4','baffle','camion','feuille','pied','rasta','rastaperdu','fondecran','rastanim'];
let assetsToLoad = imgNames.length;

imgNames.forEach(name => {
  const img = new Image();
  img.src = `images/${name}.png`;
  img.onload = () => {
    if (name === 'rastanim') {
      spriteFrameW = Math.max(1, img.width / SPRITE_FRAMES);
      spriteFrameH = Math.max(1, img.height);
    }
    if (--assetsToLoad === 0) {
      gameState = 'MENU';
      initClouds();
      initLeaves();
    }
  };
  img.onerror = () => {
    console.warn(`Image ${name}.png non trouvée. Utilisation d'un placeholder.`);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 50; tempCanvas.height = 50;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#FF00FF'; tempCtx.fillRect(0, 0, 50, 50);
    img.src = tempCanvas.toDataURL();
  };
  images[name] = img;
});

// ============================================================
// JOUEUR
// ============================================================
const player = {
  x: 80, y: GROUND_Y - 50, w: 50, h: 50,
  dy: 0, jumping: false, ducking: false
};

// ============================================================
// INITIALISATIONS
// ============================================================
function initClouds() {
  clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 20 + Math.random() * 120,
      w: 60 + Math.random() * 100,
      h: 20 + Math.random() * 25,
      speed: 15 + Math.random() * 25,
      alpha: 0.12 + Math.random() * 0.18
    });
  }
}

function initLeaves() {
  leaves = [];
  for (let i = 0; i < 12; i++) leaves.push(makeLeaf(Math.random() * canvas.height));
}

function makeLeaf(startY) {
  return {
    x: Math.random() * canvas.width,
    y: startY !== undefined ? startY : -25 - Math.random() * 40,
    size: 12 + Math.random() * 18,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2,
    fallSpeed: 20 + Math.random() * 50,
    swaySpeed: 1 + Math.random(),
    swayAmount: 15 + Math.random() * 25,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.35 + Math.random() * 0.4
  };
}

// ============================================================
// UTILITAIRES
// ============================================================
function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top)  * (canvas.height / rect.height)
  };
}

function isInRect(px, py, r) {
  return r.width && px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

function drawRastaFill(c, x, y, w, h) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#009933');
  g.addColorStop(0.5, '#FFCC00');
  g.addColorStop(1, '#CC0000');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
}

function wrapText(c, text, x, y, maxW, lh) {
  let curY = y;
  text.split('\n').forEach(para => {
    let line = '';
    para.split(' ').forEach(word => {
      const test = line + word + ' ';
      if (c.measureText(test).width > maxW && line) {
        c.fillText(line, x, curY); line = word + ' '; curY += lh;
      } else line = test;
    });
    c.fillText(line, x, curY); curY += lh * 1.5;
  });
  return curY;
}

// ============================================================
// PARTICULES
// ============================================================
function addParticle(x, y, vx, vy, size, color, life) {
  particles.push({ x, y, vx, vy, size: Math.max(0.5, size), color, life, maxLife: life });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; 
    p.vy += 400 * dt; 
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size * a), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function spawnJumpParticles() {
  for (let i = 0; i < 10; i++) {
    addParticle(
      player.x + player.w / 2 + (Math.random() - 0.5) * 20, GROUND_Y,
      (Math.random() - 0.5) * 150, -Math.random() * 150 - 50,
      2 + Math.random() * 4, Math.random() < 0.5 ? '#8B7355' : '#A0926B',
      0.4 + Math.random() * 0.3
    );
  }
}

function spawnExplosionParticles() {
  const colors = ['#FF4500','#FF6347','#FFD700','#FF8C00','#FF0000','#FFCC00'];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 350;
    addParticle(
      player.x + player.w / 2, player.y + player.h / 2,
      Math.cos(angle) * speed, Math.sin(angle) * speed - 100,
      2 + Math.random() * 6, colors[Math.floor(Math.random() * colors.length)],
      0.6 + Math.random() * 0.8
    );
  }
}

// ============================================================
// SCORE POPS & SHAKE
// ============================================================
function addScorePop(x, y, text, color) {
  scorePops.push({ x, y, text, color: color || '#FFCC00', life: 1.0, vy: -120 });
}

function updateScorePops(dt) {
  for (let i = scorePops.length - 1; i >= 0; i--) {
    const p = scorePops[i];
    p.y += p.vy * dt; p.vy *= 0.96; p.life -= dt;
    if (p.life <= 0) scorePops.splice(i, 1);
  }
}

function drawScorePops() {
  scorePops.forEach(p => {
    const a = Math.max(0, p.life);
    ctx.globalAlpha = a;
    ctx.font = 'bold 18px Quicksand, Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;
}

function triggerShake(amount, duration) { 
  shakeAmount = 0; 
  shakeDuration = 0; 
}

function applyShake(dt) {
  if (shakeDuration > 0) {
    ctx.translate((Math.random() - 0.5) * shakeAmount * 2, (Math.random() - 0.5) * shakeAmount * 2);
    shakeDuration -= dt; 
    shakeAmount *= 0.9;
  }
}

// ============================================================
// NUAGES, FEUILLES & LIGNES DE VITESSE
// ============================================================
function updateClouds(dt) {
  clouds.forEach(c => {
    c.x -= c.speed * dt;
    if (c.x + c.w < 0) { c.x = canvas.width + Math.random() * 100; c.y = 20 + Math.random() * 120; }
  });
}

function drawClouds() {
  clouds.forEach(c => {
    ctx.globalAlpha = c.alpha; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.3, c.y, c.w * 0.3, c.h * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.55, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.78, c.y + c.h * 0.1, c.w * 0.22, c.h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function updateLeaves(dt) {
  leaves.forEach(l => {
    l.y += l.fallSpeed * dt;
    l.x += Math.sin(globalTime * l.swaySpeed + l.phase) * l.swayAmount * dt;
    l.rotation += l.rotSpeed * dt;
    if (l.y > canvas.height + 25) { l.y = -25; l.x = Math.random() * canvas.width; }
  });
}

function drawLeaves() {
  if (!images.feuille.complete || images.feuille.width === 0) return;
  leaves.forEach(l => {
    ctx.save(); ctx.globalAlpha = l.alpha;
    ctx.translate(l.x, l.y); ctx.rotate(l.rotation);
    ctx.drawImage(images.feuille, -l.size / 2, -l.size / 2, l.size, l.size);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function updateSpeedLines(dt) {
  if (gameSpeed > 300 && Math.random() < (gameSpeed - 300) * 0.001) {
    speedLines.push({
      x: canvas.width, y: Math.random() * (GROUND_Y - 30) + 10,
      length: 15 + Math.random() * 35, speed: gameSpeed * 1.5 + Math.random() * 200,
      alpha: 0.12 + Math.random() * 0.18, life: 2.0
    });
  }
  for (let i = speedLines.length - 1; i >= 0; i--) {
    speedLines[i].x -= speedLines[i].speed * dt;
    speedLines[i].life -= dt;
    if (speedLines[i].x + speedLines[i].length < 0 || speedLines[i].life <= 0) speedLines.splice(i, 1);
  }
}

function drawSpeedLines() {
  speedLines.forEach(l => {
    ctx.globalAlpha = l.alpha * Math.max(0, l.life / 2.0);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + l.length, l.y); ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// ============================================================
// CONTRÔLES (T-REX STYLE)
// ============================================================
function jump() {
  if (!player.jumping && !player.ducking && gameState === 'PLAYING') {
    player.dy = JUMP_FORCE;
    player.jumping = true;
    isJumpHeld = true;
    spawnJumpParticles();
  }
}

function releaseJump() {
  // Si le joueur relâche tôt et que le personnage monte encore, on coupe l'ascension
  if (player.jumping && player.dy < 0 && isJumpHeld) {
    player.dy *= 0.5; 
  }
  isJumpHeld = false;
}

function duck() {
  if (!player.jumping && !player.ducking && gameState === 'PLAYING') {
    player.ducking = true;
    setTimeout(() => { if (player.ducking) player.ducking = false; }, 600);
  }
}

// Clavier
document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && showHelp) { showHelp = false; return; }
  if (e.code === 'Space' || e.code === 'ArrowUp') { 
    e.preventDefault(); 
    if (gameState === 'PLAYING') jump(); 
    else if (gameState === 'MENU' && !showHelp) startGame();
    else if (gameState === 'GAME_OVER') startGame();
  }
  if (e.code === 'ArrowDown') { e.preventDefault(); duck(); }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { 
    e.preventDefault(); 
    if (gameState === 'PLAYING') releaseJump(); 
  }
});

// Souris & Touch
let pointerStartX = 0;
let pointerStartY = 0;
let isPointerDown = false;
let didSwipe = false;

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  isPointerDown = true;
  didSwipe = false;
  
  const c = getCanvasCoords(e.clientX, e.clientY);
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;

  if (gameState === 'MENU') {
    if (showHelp) {
      if (isInRect(c.x, c.y, helpCloseRect) || !isInRect(c.x, c.y, helpPanelRect)) showHelp = false;
      return;
    }
    if (isInRect(c.x, c.y, startButtonRect)) { startGame(); return; }
    if (isInRect(c.x, c.y, helpButtonRect))  { showHelp = true; return; }
    return;
  }

  if (gameState === 'GAME_OVER') {
    if (isInRect(c.x, c.y, restartButtonRect)) { startGame(); return; }
    if (isInRect(c.x, c.y, homeButtonRect))    { gameState = 'MENU'; return; }
    return;
  }

  // Souris PC (clic gauche) : sauter directement
  if (gameState === 'PLAYING' && e.pointerType === 'mouse' && e.button === 0) {
    jump();
  }
});

canvas.addEventListener('pointermove', e => {
  const c = getCanvasCoords(e.clientX, e.clientY);

  if (e.pointerType === 'mouse') {
    if (gameState === 'MENU') {
      isMouseOverStart     = isInRect(c.x, c.y, startButtonRect);
      isMouseOverHelp      = isInRect(c.x, c.y, helpButtonRect);
      isMouseOverHelpClose = isInRect(c.x, c.y, helpCloseRect);
    }
    if (gameState === 'GAME_OVER') {
      isMouseOverRestart = isInRect(c.x, c.y, restartButtonRect);
      isMouseOverHome    = isInRect(c.x, c.y, homeButtonRect);
    }
  }

  // Détection du glissement (swipe) uniquement en mode tactile/toucher
  if (isPointerDown && gameState === 'PLAYING' && !didSwipe && e.pointerType !== 'mouse') {
    const dy = e.clientY - pointerStartY;
    const dx = e.clientX - pointerStartX;

    // Déplacement vertical minimum de 25px
    if (Math.abs(dy) > 25 && Math.abs(dy) > Math.abs(dx)) {
      didSwipe = true;
      if (dy < 0) {
        jump(); // Glissement vers le haut = sauter
      } else {
        duck(); // Glissement vers le bas = se baisser
      }
    }
  }
});

canvas.addEventListener('pointerup', e => {
  e.preventDefault();
  isPointerDown = false;
  if (gameState === 'PLAYING') {
    releaseJump();
  }
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault(); 
  if (gameState === 'PLAYING') {
    duck(); 
  }
});

// ============================================================
// SPAWN OBSTACLES
// ============================================================
function spawnObstacle() {
  if (gameState !== 'PLAYING') return;
  
  const minDelay = Math.max(0.7, 2.0 - elapsedTime * 0.02);
  const maxDelay = minDelay + 1.0;
  spawnTimer = minDelay + Math.random() * (maxDelay - minDelay);

  // Génération de groupes de 1 à 3 obstacles rapprochés
  let count = 1;
  const rand = Math.random();
  if (elapsedTime > 20 && rand < 0.15) count = 3;
  else if (elapsedTime > 10 && rand < 0.30) count = 2;

  let xOff = 0;
  for (let i = 0; i < count; i++) {
    const types = ['baffle','camion','feuille','pied'];
    let type = types[Math.floor(Math.random() * types.length)];
    let w = 50, h = 50;
    if (type === 'pied')   { const f = Math.random() < 0.5 ? 0.7 : 1.3; w = 50 * f; h = 50 * f; }
    if (type === 'camion') { w = 70; h = 70; }
    const yOff = type === 'feuille' ? -20 : 0;
    obstacles.push({ x: canvas.width + xOff, type, w, h, yOff, passed: false });
    xOff += w + 20; // Espace très réduit entre les obstacles groupés
  }
}

// ============================================================
// DÉMARRAGE / FIN
// ============================================================
function startGame() {
  if (gameState === 'PLAYING') return;
  gameState = 'PLAYING';
  score = 0;
  player.y = GROUND_Y - player.h;
  player.dy = 0;
  player.jumping = false;
  player.ducking = false;
  obstacles = [];
  particles = [];
  scorePops = [];
  speedLines = [];
  isJumpHeld = false;
  explosionSpawned = false;
  wasJumping = false;
  gameSpeed = 180;
  elapsedTime = 0;
  globalDistanceTraveled = 0;
  backgroundX = 0;
  shakeAmount = 0;
  shakeDuration = 0;
  spawnTimer = 1.5;
  scoreEl.textContent = '0';
}

function endGame() {
  gameState = 'GAME_OVER';
  if (!explosionSpawned) {
    spawnExplosionParticles();
    triggerShake(8, 0.25);
    explosionSpawned = true;
  }
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('rastaBest', bestScore);
    bestEl.textContent = bestScore;
  }
}

// ============================================================
// DESSIN — ÉLÉMENTS COMMUNS
// ============================================================
function drawBackground(dt) {
  if (!images.fondecran.complete || images.fondecran.width === 0) return;
  const spd = gameState === 'PLAYING' ? gameSpeed * 0.5 : 15;
  backgroundX -= spd * dt;
  if (backgroundX <= -canvas.width + BG_OVERLAP) backgroundX = 0;
  ctx.drawImage(images.fondecran, backgroundX, 0, canvas.width, canvas.height);
  ctx.drawImage(images.fondecran, backgroundX + canvas.width - BG_OVERLAP, 0, canvas.width, canvas.height);
}

function drawGround() {
  const gg = ctx.createLinearGradient(0, GROUND_Y, 0, canvas.height);
  gg.addColorStop(0, '#5D4E37'); gg.addColorStop(0.3, '#4A3C2A'); gg.addColorStop(1, '#3A2E20');
  ctx.fillStyle = gg;
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
  ctx.strokeStyle = '#7D6E57'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(canvas.width, GROUND_Y); ctx.stroke();
  ctx.fillStyle = '#6D5E47';
  const off = (elapsedTime * gameSpeed * 0.05) % 200;
  for (let i = -1; i < canvas.width / 200 + 2; i++) {
    const bx = i * 200 - off;
    ctx.beginPath(); ctx.arc(bx + 30, GROUND_Y + 8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 120, GROUND_Y + 12, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 170, GROUND_Y + 6, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPlayer() {
  const ph = player.ducking ? 30 : 50;
  const drawY = player.y + (50 - ph);

  if (player.jumping) {
    if (images.rasta2.complete && images.rasta2.width > 0)
      ctx.drawImage(images.rasta2, player.x, drawY, player.w, ph);
  } else if (player.ducking) {
    if (images.rasta4.complete && images.rasta4.width > 0)
      ctx.drawImage(images.rasta4, player.x, drawY, player.w, ph);
  } else if (images.rastanim.complete && images.rastanim.width > 0) {
    // Animation synchronisée sur la distance (plus on va vite, plus on pédale vite)
    const frame = Math.floor(globalDistanceTraveled / 15) % SPRITE_FRAMES;
    ctx.drawImage(images.rastanim,
      frame * spriteFrameW, 0, spriteFrameW, spriteFrameH,
      player.x, player.y, player.w, 50);
  } else {
    const sprite = images['rasta' + (Math.floor(globalDistanceTraveled / 150) % 2 === 0 ? 1 : 3)];
    if (sprite.complete && sprite.width > 0)
      ctx.drawImage(sprite, player.x, player.y, player.w, 50);
  }
}

function drawObstacles() {
  obstacles.forEach(o => {
    if (images[o.type].complete && images[o.type].width > 0) {
      ctx.drawImage(images[o.type], o.x, GROUND_Y - o.h + o.yOff, o.w, o.h);
    }
  });
}

// ============================================================
// ÉCRANS
// ============================================================
function drawLoadingScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFCC00'; ctx.font = 'bold 28px Quicksand, Arial'; ctx.textAlign = 'center';
  ctx.fillText('Chargement...', canvas.width / 2, canvas.height / 2);
  const bw = 200, bh = 8, bx = (canvas.width - bw) / 2, by = canvas.height / 2 + 20;
  const prog = 1 - (assetsToLoad / imgNames.length);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; roundRect(ctx, bx, by, bw, bh, 4); ctx.fill();
  if (prog > 0) {
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#009933'); g.addColorStop(0.5, '#FFCC00'); g.addColorStop(1, '#CC0000');
    ctx.fillStyle = g; roundRect(ctx, bx, by, bw * prog, bh, 4); ctx.fill();
  }
}

const instructionsText = "Sur PC : Clic gauche ou Espace pour sauter, Clic droit ou Flèche bas pour te baisser.\n\nSur Mobile : Glisse vers le haut pour sauter, glisse vers le bas pour te baisser.\n\nGood vibes only !";

function drawMenuScreen(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(dt);
  updateClouds(dt); drawClouds();
  updateLeaves(dt); drawLeaves();
  drawGround();
  globalTime += dt;

  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pw = 400, ph = 310;
  const px = (canvas.width - pw) / 2, py = (canvas.height - ph) / 2;

  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5;
  ctx.save(); roundRect(ctx, px, py, pw, ph, 15); ctx.clip(); drawRastaFill(ctx, px, py, pw, ph); ctx.restore();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; roundRect(ctx, px, py, pw, ph, 15); ctx.stroke();

  const cx = canvas.width / 2;
  const ls = 100;
  const bounce = Math.sin(globalTime * 3) * 5;
  const lx = cx - ls / 2, ly = py + 28 + bounce;
  if (images.rasta.complete && images.rasta.width > 0) ctx.drawImage(images.rasta, lx, ly, ls, ls);

  const dbw = 160, dbh = 44;
  const dbx = cx - dbw / 2, dby = ly + ls + 22;
  startButtonRect = { x: dbx, y: dby, width: dbw, height: dbh };
  ctx.fillStyle = isMouseOverStart ? '#2E7D32' : '#388E3C';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  roundRect(ctx, dbx, dby, dbw, dbh, 8); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5; roundRect(ctx, dbx, dby, dbw, dbh, 8); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Quicksand, Arial'; ctx.textAlign = 'center';
  ctx.fillText('Démarrer', dbx + dbw / 2, dby + dbh / 2 + 7);

  const hbw = 120, hbh = 38;
  const hbx = cx - hbw / 2, hby = dby + dbh + 14;
  helpButtonRect = { x: hbx, y: hby, width: hbw, height: hbh };
  ctx.fillStyle = isMouseOverHelp ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)';
  roundRect(ctx, hbx, hby, hbw, hbh, 8); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; roundRect(ctx, hbx, hby, hbw, hbh, 8); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.font = 'bold 16px Quicksand, Arial';
  ctx.fillText('Aide', hbx + hbw / 2, hby + hbh / 2 + 5);

  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.font = 'italic 14px Quicksand, Arial';
  ctx.fillText('Good vibes only !', cx, py + ph - 18);

  if (showHelp) drawHelpOverlay();
}

function drawHelpOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const hw = 480, hh = 320;
  const hx = (canvas.width - hw) / 2, hy = (canvas.height - hh) / 2;
  helpPanelRect = { x: hx, y: hy, width: hw, height: hh };

  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5;
  ctx.save(); roundRect(ctx, hx, hy, hw, hh, 15); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(hx, hy, hw, hh);
  ctx.restore();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#009933'; ctx.lineWidth = 3; roundRect(ctx, hx, hy, hw, hh, 15); ctx.stroke();

  const hcx = canvas.width / 2;
  ctx.fillStyle = '#009933'; ctx.font = 'bold 26px Luckiest Guy, Quicksand, Arial'; ctx.textAlign = 'center';
  ctx.fillText('Comment jouer ?', hcx, hy + 42);
  ctx.strokeStyle = 'rgba(0,153,51,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hx + 40, hy + 58); ctx.lineTo(hx + hw - 40, hy + 58); ctx.stroke();
  ctx.fillStyle = '#333'; ctx.font = '600 15px Quicksand, Arial';
  wrapText(ctx, instructionsText, hcx, hy + 82, hw - 80, 22);

  const cbw = 120, cbh = 38;
  const cbx = hcx - cbw / 2, cby = hy + hh - 55;
  helpCloseRect = { x: cbx, y: cby, width: cbw, height: cbh };
  ctx.fillStyle = isMouseOverHelpClose ? '#C62828' : '#E53935';
  ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
  roundRect(ctx, cbx, cby, cbw, cbh, 8); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Quicksand, Arial';
  ctx.fillText('Fermer', cbx + cbw / 2, cby + cbh / 2 + 5);
}

function drawGameOverScreen(dt) {
  drawBackground(dt);
  updateClouds(dt); drawClouds();
  updateLeaves(dt); drawLeaves();
  drawGround();
  drawObstacles();
  drawPlayer();
  drawSpeedLines();
  drawParticles();

  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;

  if (images.rastaperdu.complete && images.rastaperdu.width > 0) {
    const iw = 150, ih = 150;
    ctx.drawImage(images.rastaperdu, cx - iw / 2, canvas.height / 2 - 135, iw, ih);
  }

  ctx.fillStyle = '#FFCC00'; ctx.font = 'bold 32px Luckiest Guy, Quicksand, Arial'; ctx.textAlign = 'center';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
  const st = 'Score: ' + score;
  ctx.strokeText(st, cx, canvas.height / 2 + 5);
  ctx.fillText(st, cx, canvas.height / 2 + 5);

  if (score >= bestScore && score > 0) {
    ctx.fillStyle = '#FF4500'; ctx.font = 'bold 20px Quicksand, Arial'; ctx.lineWidth = 3;
    ctx.strokeText('Nouveau record !', cx, canvas.height / 2 + 35);
    ctx.fillText('Nouveau record !', cx, canvas.height / 2 + 35);
  }

  const bw = 130, bh = 42, gap = 20;
  const totalBtnW = bw * 2 + gap;
  const btnStartX = cx - totalBtnW / 2;
  const btnY = canvas.height / 2 + 55;

  restartButtonRect = { x: btnStartX, y: btnY, width: bw, height: bh };
  ctx.fillStyle = isMouseOverRestart ? '#C62828' : '#E53935';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  roundRect(ctx, btnStartX, btnY, bw, bh, 8); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5; roundRect(ctx, btnStartX, btnY, bw, bh, 8); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Quicksand, Arial';
  ctx.fillText('Rejouer', btnStartX + bw / 2, btnY + bh / 2 + 6);

  const homeX = btnStartX + bw + gap;
  homeButtonRect = { x: homeX, y: btnY, width: bw, height: bh };
  ctx.fillStyle = isMouseOverHome ? '#555' : '#666';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  roundRect(ctx, homeX, btnY, bw, bh, 8); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5; roundRect(ctx, homeX, btnY, bw, bh, 8); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Quicksand, Arial';
  ctx.fillText('Accueil', homeX + bw / 2, btnY + bh / 2 + 6);
}

// ============================================================
// BOUCLE PRINCIPALE
// ============================================================
function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  let dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  if (dt > 0.1) dt = 0.1; 

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'LOADING') {
    drawLoadingScreen();

  } else if (gameState === 'MENU') {
    drawMenuScreen(dt);

  } else if (gameState === 'PLAYING') {
    elapsedTime += dt;
    const sec = Math.floor(elapsedTime);
    if (sec > Math.floor(elapsedTime - dt)) score++; 

    gameSpeed = 180 + elapsedTime * 5 + Math.max(0, elapsedTime - 60) * 10;
    globalDistanceTraveled += gameSpeed * dt; // Pour l'animation de course
    
    applyShake(dt);
    drawBackground(dt);
    updateClouds(dt); drawClouds();
    updateSpeedLines(dt); drawSpeedLines();
    drawGround();

    // Physique Joueur (T-Rex)
    player.dy += GRAVITY * dt;
    player.y += player.dy * dt;
    
    if (wasJumping && !player.jumping && player.y >= GROUND_Y - player.h) {
      triggerShake(2, 0.1);
    }
    wasJumping = player.jumping;
    
    if (player.y > GROUND_Y - player.h) {
      player.y = GROUND_Y - player.h; player.dy = 0; player.jumping = false;
    }

    drawPlayer();

    // Obstacles
    const ph = player.ducking ? 30 : 50;
    const pdy = player.y + (50 - ph);

    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnObstacle();

    drawObstacles(); // Affichage des obstacles

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]; 
      o.x -= gameSpeed * dt;
      const oy = GROUND_Y - o.h + o.yOff;

      if (player.x + player.w - COLLISION_PAD_X > o.x &&
          player.x + COLLISION_PAD_X < o.x + o.w &&
          pdy + ph - COLLISION_PAD_Y > oy &&
          pdy + COLLISION_PAD_Y < oy + o.h) {
        endGame();
      }

      if (o.x + o.w < player.x && !o.passed) {
        o.passed = true; score += 5;
        addScorePop(o.x + o.w + 20, oy - 10, '+5');
        if (player.x + COLLISION_PAD_X - (o.x + o.w) < 18) {
          score += 10;
          addScorePop(o.x + o.w + 20, oy - 38, 'CLOSE! +10', '#FF4500');
          triggerShake(2, 0.1);
        }
      }
      if (o.x + o.w < -50) obstacles.splice(i, 1);
    }

    updateParticles(dt); drawParticles();
    updateScorePops(dt); drawScorePops();
    scoreEl.textContent = score;

  } else if (gameState === 'GAME_OVER') {
    drawGameOverScreen(dt);
    updateParticles(dt); updateScorePops(dt); updateClouds(dt);
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);