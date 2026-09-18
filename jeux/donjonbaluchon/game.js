/* ============================================================
   SOKOBAN — game.js
   Moteur de jeu, niveaux, gestion d'écran, scores
   ============================================================ */

// ─── Niveaux (format SOK standard) ───────────────────────────
const LEVELS = [
  { id:1,  name:"Premiers Pas",   diff:1, par:6,
    data:"#####\n#.###\n# $ #\n# @ #\n#####" },
  { id:2, name: "Le Nœud Obscur", diff: 1, par: 9, data: "######\n#  $.#\n#    #\n#  $@#\n#.   #\n#    #\n######" },
  { id: 3, name: "Petit Effort", diff: 2, par: 18, data: "#######\n##   ##\n## $ ##\n# . ###\n#.$  ##\n#   *@#\n#######" },
  { id: 4, name: "L'Encre", diff: 2, par: 30, data: "#########\n#      ##\n#  $#$ ##\n#   #   #\n# #.#.#$#\n#* # #  #\n#   @  .#\n#########\n#########" },
  { id: 5, name: "Serpentin", diff: 2, par: 14, data: "########\n##.#####\n##$#   #\n#@*    #\n##$#####\n##.#####\n########" },
  { id: 6, name: "L'entrepot", diff: 3, par: 39, data: "########\n#.    .#\n## $$ ##\n#.$ $ .#\n#.$ $ .#\n##    ##\n#.$@ $.#\n########" },
  { id: 7, name: "Le Croisement", diff: 3, par: 35, data: "########\n#      #\n# $    #\n#   $  #\n# $   .#\n#@#   .#\n##   .*#\n########" },
  { id: 8, name: "La Vieille Salle Fermée", diff: 4, par: 58, data: "############\n#. $.##.  .#\n#          #\n####  $$   #\n####       #\n##    ######\n#       ####\n#   #@   $ #\n#   #      #\n############" },
  { id: 9, name: "L'Alien", diff: 4, par: 84, data: "#########\n#   #   #\n# # # # #\n# .$*$. #\n###    ##\n#### @###\n####  ###\n#########" },
  { id: 10, name: "Apprenti Sokoban", diff: 4, par: 73, data: "#########\n#####  .#\n#.    @ #\n# $$$   #\n### #####\n##   ####\n#.      #\n#  $  . #\n#     ###\n#########" },
  { id: 11, name: "Le Verrou", diff: 3, par: 32, data: "###########\n# .   @   #\n# #   .#$$#\n#   #     #\n#$ #   #  #\n#. #   #  #\n##     $  #\n###     #.#\n###########" },
  { id: 12, name: "L'Etau", diff: 3, par: 58, data: "########\n##     #\n##   $ #\n## ##$##\n#.  @.##\n########" },
  { id: 13, name: "Oui qui ?", diff: 4, par: 34, data: "########\n###   ##\n#.@$  ##\n### $.##\n#.##$ ##\n# # . ##\n#$ *$$.#\n#   .  #\n########" },
  { id: 14, name: "Le Passage Clé", diff: 4, par: 68, data: "##########\n#.#.#.   #\n#$  ###$ #\n#.     $ #\n# $      #\n# #  #  ##\n#@ ##.  ##\n##   #$# #\n#        #\n##########" },
  { id: 15, name: "Le Vieux Vase", diff: 3, par: 28, data: "##########\n#.$    . #\n# $      #\n# ##  ## #\n#  #  #@ #\n#  #### $#\n#.   $  .#\n##########" },
  { id: 16, name: "La Routine", diff: 3, par: 34, data: "###########\n######@####\n###### ####\n###    ####\n### #   $.#\n#.# #   ###\n# #$  # #.#\n#     # $ #\n#  ##     #\n###########" },
  { id: 17, name: "Le Ring Central", diff: 4, par: 53, data: "###########\n#         #\n# #.$   # #\n# .#####  #\n#  #.  #$ #\n# $#$  #  #\n#  #   #  #\n#  ##*##. #\n# #     # #\n#    @    #\n###########" },
  { id: 18, name: "Le Labyrinthe Fermé", diff: 4, par: 38, data: "###########\n# . # .   #\n# $   $   #\n#   #@#  ##\n# # $ # $ #\n# .   .   #\n###########" },
  { id: 19, name: "L'Engrenage Complexe", diff: 5, par: 35, data: "#########\n#....####\n#  $##  #\n# $$    #\n#@$ #   #\n##  #####\n#########" },
  { id: 20, name: "Maitre Sokoban", diff: 5, par: 45, data: "########\n### @###\n###$$  #\n### $. #\n#... ###\n###$ ###\n###  ###\n########" },
  { id: 21, name: "Ça se corse", diff: 5, par: 185, data: "#############\n##@       ###\n#         ###\n#  #  # #$###\n# #.  # # ###\n# ##. # # ###\n#  ##.# # ###\n#   ### # ###\n#       $ $ #\n##          #\n#############" },
  { id: 22, name: "La Clé de sol", diff: 5, par: 102, data: "##########\n######   #\n######   #\n######  ##\n######  ##\n###  .  ##\n### . .  #\n###$###  #\n# $  #   #\n#    $   #\n###     ##\n###   ####\n###@######\n##########" },
  { id: 23, name: "Tétromino", diff: 5, par: 82, data: "###########\n###   @ ###\n#  $ ##$  #\n# $.## .$ #\n#  $ . $  #\n###. . .###\n###########" },
  { id: 24, name: "Patience...", diff: 5, par: 110, data: "#########\n#  ######\n#@  #####\n## $ ####\n## $  ###\n## $  ###\n## $  ###\n#### ####\n###..*  #\n#  *..  #\n#     ###\n#########" },
  { id: 25, name: "Bravo", diff: 1, par: 25, data: "################\n################\n################\n################\n################\n################\n################\n#.$            #\n#############  #\n#@   $        .#\n################" },
];

// ─── Constantes de cellules ──────────────────────────────────
const T = { wall:'#', player:'@', playerOnGoal:'+', block:'$', blockOnGoal:'*', goal:'.', empty:' ' };

// ─── Tutoriel niveau 1 ──────────────────────────────────────
const TUTORIAL_KEY = 'sokoban-tutorial-v1';
let tutorialStep = 0;

const TUTORIAL_STEPS = [
  {
    img: 'images/joueurfacefixe.png',
    text: 'Bienvenue, preux <strong>chevalier</strong> ! Votre donjon est en désordre. Votre quête : ranger les <strong>baluchons</strong> sur les emplacements de <strong>parquet</strong> sacré.'
  },
  {
    img: 'images/symbolefleche.png',
    text: 'Déplacez-vous avec les <strong>flèches</strong> du clavier ou <strong>ZQSD</strong>. Sur mobile, utilisez les <strong>flèches tactiles</strong> à l\'écran.'
  },
  {
    img: 'images/baluchon1.png',
    text: 'Marchez vers un <strong>baluchon</strong> pour le pousser. Attention : vous ne pouvez en pousser qu\'<strong>un seul à la fois</strong> !'
  },
  {
    img: 'images/baluchon3.png',
    text: 'Placez le baluchon sur le <strong>parquet sacré</strong> pour le sécuriser. Quand <strong>tous les baluchons</strong> sont rangés, le niveau est terminé !'
  }
];

function markTutorialDone() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {}
}

function startTutorial() {
  tutorialStep = 0;
  showTutorialStep();
}

function showTutorialStep() {
  if (tutorialStep >= TUTORIAL_STEPS.length) { closeTutorial(); return; }

  const step = TUTORIAL_STEPS[tutorialStep];
  const overlay = document.getElementById('tutorial-overlay');

  document.getElementById('tutorial-img').src = step.img;
  document.getElementById('tutorial-text').innerHTML = step.text;

  // Bouton : "Compris !" sur la dernière étape
  const btn = document.getElementById('tutorial-next');
  btn.textContent = (tutorialStep === TUTORIAL_STEPS.length - 1) ? 'Compris !' : 'Continuer';

  // Points de progression
  const dotsEl = document.getElementById('tutorial-dots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const dot = document.createElement('div');
    dot.className = 'tutorial-dot' + (i === tutorialStep ? ' active' : '');
    dotsEl.appendChild(dot);
  }

  overlay.style.display = 'flex';
}

function nextTutorialStep() {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    closeTutorial();
  } else {
    showTutorialStep();
  }
}

function skipTutorial() {
  closeTutorial();
}

function closeTutorial() {
  document.getElementById('tutorial-overlay').style.display = 'none';
  tutorialStep = 0;
  if (!gameWon) {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
  }
}

// ─── État global ─────────────────────────────────────────────
let currentScreen = 'home';
let currentLevel = null;
let cells = [];
let crateTypes = [];
let wallTypes = []; 
let floorTypes = []; 
let currentGoalImage = null;
let playerPos = { row:0, col:0 };
let gridW = 0;
let moves = 0;
let history = [];
let startTime = 0;
let timerInterval = null;
let gameWon = false;
let rafId = null;
let idleTimeout = null;
let isIdle = false;

const GRID = 56; // taille d'une cellule en px

// ─── Chargement des images et animations ─────────────────────
const imageFiles = {
  baluchon1: 'images/baluchon1.png',
  baluchon2: 'images/baluchon2.png',
  baluchon3: 'images/baluchon3.png',
  joueurdos1: 'images/joueurdos1.png',
  joueurdos2: 'images/joueurdos2.png',
  joueurfacefixe: 'images/joueurfacefixe.png',
  joueurface1: 'images/joueurface1.png',
  joueurface2: 'images/joueurface2.png',
  joueurlateral1: 'images/joueurlateral1.png',
  joueurlateral2: 'images/joueurlateral2.png',
  joueurdospousse1: 'images/joueurdospousse1.png',
  joueurdospousse2: 'images/joueurdospousse2.png',
  joueurfacepousse1: 'images/joueurfacepousse1.png',
  joueurfacepousse2: 'images/joueurfacepousse2.png',
  joueurlateralpousse1: 'images/joueurlateralpousse1.png',
  joueurlateralpousse2: 'images/joueurlateralpousse2.png',
  
};

const IMAGES = {};
for (const key in imageFiles) {
  IMAGES[key] = new Image();
  IMAGES[key].src = imageFiles[key];
}

// Chargement des parquets (objectifs)
IMAGES.parquet1 = new Image();
IMAGES.parquet1.src = 'images/parquet1.jpg';
IMAGES.parquet2 = new Image();
IMAGES.parquet2.src = 'images/parquet2.jpg';

// Chargement des murs et sols
IMAGES.walls = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `images/mur${i}.jpg`;
  IMAGES.walls.push(img);
}

IMAGES.floors = [];
for (let i = 1; i <= 8; i++) {
  const img = new Image();
  img.src = `images/sol${i}.jpg`;
  IMAGES.floors.push(img);
}

// Variables d'animation
let playerDir = 'down'; 
let playerAnimFrame = 0; 
let isMoving = false; 
let isPushing = false;
let movingTimeout = null;
let pushTimeout = null;
let lastFrameTime = 0;

// ─── Scores (localStorage) ───────────────────────────────────
const SAVE_KEY = 'sokoban-scores-v1';
const SETTINGS_KEY = 'sokoban-settings-v1';
let settings = { musicVolume: 50, sfxVolume: 50 };

function loadScores() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function saveScores(scores) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(scores)); } catch {}
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s) settings = { ...settings, ...s };
  } catch {}
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

function getStars(moves, par) {
  if (moves <= par) return 3;
  if (moves <= par * 1.5) return 2;
  return 1;
}
function saveLevelScore(levelId, mv, time, par) {
  const scores = loadScores();
  const stars = getStars(mv, par);
  const prev = scores[levelId];
  scores[levelId] = {
    completed: true,
    bestMoves: !prev || mv < (prev.bestMoves ?? Infinity) ? mv : prev.bestMoves,
    bestTime:  !prev || time < (prev.bestTime  ?? Infinity) ? time : prev.bestTime,
    stars: !prev || stars > prev.stars ? stars : prev.stars
  };
  saveScores(scores);
}
function isLevelUnlocked(levelId) {
  if (levelId === 1) return true;
  const scores = loadScores();
  return scores[levelId - 1]?.completed === true;
}

// ─── Navigation entre écrans ─────────────────────────────────
function showScreen(name) {
  closeSettings();
  closeResetConfirm();
  if (typeof closeImportModal === 'function') closeImportModal();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  currentScreen = name;

  if (name === 'home') updateHomeStats();
  if (name === 'levelSelect') renderLevelSelect();
  if (name === 'customLevels') renderCustomLevels();
  if (name === 'game') startGame();
  if (name === 'editor' && typeof fitEditorCanvas === 'function') {
    setTimeout(fitEditorCanvas, 60);
  }
}

// ─── Écran Accueil ───────────────────────────────────────────
function updateHomeStats() {
  const scores = loadScores();
  const completed = Object.values(scores).filter(s => s.completed).length;
  const totalStars = Object.values(scores).reduce((s, v) => s + v.stars, 0);
  document.getElementById('stat-levels').textContent = completed + '/' + LEVELS.length;
  document.getElementById('stat-stars').textContent = totalStars + '/' + (LEVELS.length * 3);
}

function continueGame() {
  const scores = loadScores();
  const firstIncomplete = LEVELS.find(l => !scores[l.id]?.completed);
  currentLevel = firstIncomplete || LEVELS[0];
  showScreen('game');
}

// ─── Écran Sélection Niveaux ─────────────────────────────────
function renderLevelSelect() {
  const scores = loadScores();
  const completed = Object.values(scores).filter(s => s.completed).length;
  document.getElementById('ls-completed-text').textContent = completed + '/' + LEVELS.length + ' complétés';

  const grid = document.getElementById('ls-grid');
  grid.innerHTML = '';

  LEVELS.forEach(level => {
    const unlocked = isLevelUnlocked(level.id);
    const score = scores[level.id];
    const card = document.createElement('button');
    card.className = 'level-card' + (unlocked ? '' : ' locked');
    card.disabled = !unlocked;

    // RAJOUTER CES DEUX LIGNES :
    let diffDots = '';
    for (let i = 1; i <= 5; i++) diffDots += `<div class="lc-diff-dot${i <= level.diff ? ' filled' : ''}"></div>`;

    let starsHtml = '';
    for (let i = 1; i <= 3; i++) {
      const earned = score?.stars >= i;
      starsHtml += `<img src="images/symboleetoile.png" class="lc-star-img${earned ? ' earned' : ''}" alt="Étoile">`;
    }

    let topRight = '';
    if (!unlocked) topRight = `<svg class="lc-lock" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    else if (score?.completed) topRight = `<img src="images/symbolevalider.png" class="lc-check-img" alt="Validé">`;

    card.innerHTML = `
      <div class="lc-top">
        <span class="lc-num">${String(level.id).padStart(2,'0')}</span>
        <div class="lc-info">
          <div class="lc-name">${level.name}</div>
          <div class="lc-diff">${diffDots}</div>
        </div>
        ${topRight}
      </div>
      ${score?.completed ? `<div class="lc-score"><div class="lc-stars">${starsHtml}</div><span class="lc-best">${score.bestMoves} coups</span></div>` : ''}
    `;

    if (unlocked) card.addEventListener('click', () => { currentLevel = level; showScreen('game'); });
    grid.appendChild(card);
  });
}

// ─── Moteur de jeu ───────────────────────────────────────────
function parseLevel(levelData) {
  currentGoalImage = Math.random() < 0.5 ? IMAGES.parquet1 : IMAGES.parquet2;
  const rows = levelData.split('\n').filter(r => r);
  cells = [];
  crateTypes = []; 
  wallTypes = []; // Initialisation
  floorTypes = []; // Initialisation
  gridW = 0;
  playerPos = { row:0, col:0 };
  
  rows.forEach((rowData, row) => {
    cells[row] = [];
    crateTypes[row] = [];
    wallTypes[row] = [];
    floorTypes[row] = [];
    if (rowData.length > gridW) gridW = rowData.length;
    
    [...rowData].forEach((ch, col) => {
      cells[row][col] = ch;
      
      // Assignation aléatoire fixe pour les murs et sols
      wallTypes[row][col] = Math.floor(Math.random() * 5); // Index de 0 à 4
      floorTypes[row][col] = Math.floor(Math.random() * 8); // Index de 0 à 7
      
      if (ch === T.block || ch === T.blockOnGoal) {
        crateTypes[row][col] = Math.random() < 0.5 ? 1 : 2;
      }
      if (ch === T.player || ch === T.playerOnGoal) playerPos = { row, col };
    });
  });
}

function cloneCells() { return cells.map(r => [...r]); }

function moveEntity(start, end, isPlayer) {
  const sc = cells[start.row][start.col];
  const ec = cells[end.row][end.col];
  
  // Si c'est une caisse qui bouge, on transfère son type d'image
  if (sc === T.block || sc === T.blockOnGoal) {
    crateTypes[end.row][end.col] = crateTypes[start.row][start.col];
    crateTypes[start.row][start.col] = null;
  }

  switch (sc) {
    case T.player: case T.block: cells[start.row][start.col] = T.empty; break;
    case T.playerOnGoal: case T.blockOnGoal: cells[start.row][start.col] = T.goal; break;
  }
  switch (ec) {
    case T.empty: cells[end.row][end.col] = isPlayer ? T.player : T.block; break;
    case T.goal: cells[end.row][end.col] = isPlayer ? T.playerOnGoal : T.blockOnGoal; break;
  }
}

function tryMove(dr, dc) {
  if (gameWon) return;
  const r = playerPos.row + dr, c = playerPos.col + dc;
  const cell = cells[r]?.[c];
  if (!cell) return;

  let moved = false;
  let pushedCrate = false;

  // Mise à jour de la direction du joueur
  let newDir = playerDir;
  if (dr === -1) newDir = 'up';
  else if (dr === 1) newDir = 'down';
  else if (dc === -1) newDir = 'left';
  else if (dc === 1) newDir = 'right';

  // Si on change de direction, on réinitialise le timer d'immobilité
  if (newDir !== playerDir) {
    playerDir = newDir;
    isIdle = false;
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => { isIdle = true; }, 2000);
  }

  // Si c'est un mur, on s'arrête net, ça ne compte pas comme un déplacement
  if (cell === T.wall) return;

  if (cell === T.empty || cell === T.goal) {
    history.push({ 
      cells: cloneCells(), 
      playerPos: { ...playerPos },
      crateTypes: crateTypes.map(row => [...row]) 
    });
    moveEntity(playerPos, { row:r, col:c }, true);
    playerPos = { row:r, col:c };
    moves++;
    moved = true;
  } else if (cell === T.block || cell === T.blockOnGoal) {
    const nr = r + dr, nc = c + dc;
    const next = cells[nr]?.[nc];
    
    // Si la caisse est bloquée par un mur ou une autre caisse, on s'arrête net
    if (next !== T.empty && next !== T.goal) return;

    history.push({ 
      cells: cloneCells(), 
      playerPos: { ...playerPos },
      crateTypes: crateTypes.map(row => [...row]) 
    });
    moveEntity({ row:r, col:c }, { row:nr, col:nc }, false);
    moveEntity(playerPos, { row:r, col:c }, true);
    playerPos = { row:r, col:c };
    moves++;
    moved = true;
    pushedCrate = true;
  }

  if (moved) {
    // Animation du joueur
    const now = Date.now();
    if (now - lastFrameTime > 100) {
      playerAnimFrame = playerAnimFrame === 0 ? 1 : 0;
      lastFrameTime = now;
    }
    
    // Gestion de l'état "en mouvement" pour la frame fixe de face
    isMoving = true;
    isPushing = pushedCrate; // On définit si on pousse
    
    clearTimeout(movingTimeout);
    movingTimeout = setTimeout(() => { isMoving = false; }, 150);

    // NOUVEAU : Si on pousse, on maintient l'image de poussée pendant 1 seconde (1000ms)
    if (isPushing) {
      clearTimeout(pushTimeout);
      pushTimeout = setTimeout(() => { isPushing = false; }, 1000);
    }

    // Gestion de l'immobilité (2 sec)
    isIdle = false;
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => { isIdle = true; }, 2000);

    document.getElementById('hud-moves').textContent = moves;
    checkWin();
  }
}

function checkWin() {
  for (const row of cells)
    for (const cell of row)
      if (cell === T.block) return; // un bloc pas sur un objectif
      
  // Tous les blocs sont sur des objectifs !
  gameWon = true;
  clearInterval(timerInterval); // On arrête le chrono tout de suite
  
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  
  // On lance la victoire après 1 seconde (1000 ms)
  setTimeout(() => {
    showVictory(moves, elapsed);
  }, 1000);
}

// ─── Texture mur (pré-rendue) ────────────────────────────────
let wallImg = null;
function buildWallTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = GRID;
  const x = c.getContext('2d');
  x.fillStyle = '#5b5530';
  x.fillRect(0, 0, GRID, GRID);
  x.fillStyle = '#a19555';
  x.fillRect(1, 1, GRID-2, 18);
  x.fillRect(0, 21, 18, 16);
  x.fillRect(20, 21, GRID-20, 16);
  x.fillRect(0, 39, 36, GRID-39);
  x.fillRect(38, 39, GRID-38, GRID-39);
  wallImg = c;
}

// ─── Rendu Canvas ────────────────────────────────────────────
function drawGame() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      const cell = cells[r][c];
      // sol
      if (cell !== T.wall) {
        const fIdx = floorTypes[r] && floorTypes[r][c] !== undefined ? floorTypes[r][c] : 0;
        const fImg = IMAGES.floors[fIdx];
        if (fImg && fImg.complete) {
          ctx.drawImage(fImg, c * GRID, r * GRID, GRID, GRID);
        } else {
          ctx.fillStyle = '#ded6ae'; // Fallback
          ctx.fillRect(c * GRID, r * GRID, GRID, GRID);
        }
      }
      
      // mur
      if (cell === T.wall) {
        const wIdx = wallTypes[r] && wallTypes[r][c] !== undefined ? wallTypes[r][c] : 0;
        const wImg = IMAGES.walls[wIdx];
        if (wImg && wImg.complete) {
          ctx.drawImage(wImg, c * GRID, r * GRID, GRID, GRID);
        } else {
          ctx.fillStyle = '#5b5530'; // Fallback
          ctx.fillRect(c * GRID, r * GRID, GRID, GRID);
        }
      }

      // objectif
      if (cell === T.goal || cell === T.playerOnGoal || cell === T.blockOnGoal) {
        if (currentGoalImage && currentGoalImage.complete) {
          ctx.drawImage(currentGoalImage, c * GRID, r * GRID, GRID, GRID);
        } else {
          // Fallback (cercle rouge) si l'image n'est pas encore chargée
          ctx.fillStyle = '#914430';
          ctx.beginPath();
          ctx.arc((c+0.5)*GRID, (r+0.5)*GRID, 8, 0, Math.PI*2);
          ctx.fill();
        }
      }
      
      // bloc (baluchon) 
      if (cell === T.block || cell === T.blockOnGoal) {
        const type = crateTypes[r] && crateTypes[r][c] ? crateTypes[r][c] : 1;
        const img = type === 1 ? IMAGES.baluchon1 : IMAGES.baluchon2;
        
        if (img && img.complete) {
          ctx.drawImage(img, c*GRID, r*GRID, GRID, GRID);
        } else {
          // Fallback si l'image n'est pas encore chargée
          ctx.fillStyle = cell === T.block ? '#ffbb5b' : '#ba6a15';
          ctx.fillRect(c*GRID, r*GRID, GRID, GRID);
        }
      }
      
      // joueur
      if (cell === T.player || cell === T.playerOnGoal) {
        let img;
        
        if (isIdle) {
          img = IMAGES.joueurfacefixe; // Force l'image fixe si immobile depuis 2s
        } else if (isPushing) {
          // Si le joueur pousse un baluchon
          if (playerDir === 'up') {
            img = playerAnimFrame === 0 ? IMAGES.joueurdospousse1 : IMAGES.joueurdospousse2;
          } else if (playerDir === 'down') {
            img = playerAnimFrame === 0 ? IMAGES.joueurfacepousse1 : IMAGES.joueurfacepousse2;
          } else { // left ou right
            img = playerAnimFrame === 0 ? IMAGES.joueurlateralpousse1 : IMAGES.joueurlateralpousse2;
          }
        } else {
          // Marche normale sans pousser
          if (playerDir === 'up') {
            img = playerAnimFrame === 0 ? IMAGES.joueurdos1 : IMAGES.joueurdos2;
          } else if (playerDir === 'down') {
            img = !isMoving ? IMAGES.joueurfacefixe : (playerAnimFrame === 0 ? IMAGES.joueurface1 : IMAGES.joueurface2);
          } else { // left ou right
            img = playerAnimFrame === 0 ? IMAGES.joueurlateral1 : IMAGES.joueurlateral2;
          }
        }

        if (img && img.complete) {
          // Si le joueur va à gauche, on inverse l'image latérale
          if (playerDir === 'left' && !isIdle) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(img, -(c*GRID + GRID), r*GRID, GRID, GRID);
            ctx.restore();
          } else {
            ctx.drawImage(img, c*GRID, r*GRID, GRID, GRID);
          }
        } else {
          // Fallback si l'image n'est pas encore chargée
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc((c+0.5)*GRID, (r+0.3)*GRID, 7, 0, Math.PI*2);
          ctx.fill();
          ctx.fillRect((c+0.48)*GRID, (r+0.3)*GRID, 2, GRID/2.5);
        }
      }
    }
  }

  rafId = requestAnimationFrame(drawGame);
}

// ─── Responsive : adapter la taille du canvas ────────────────
function fitGameCanvas() {
  const canvas = document.getElementById('game-canvas');
  const wrap = document.querySelector('.game-canvas-wrap');
  if (!canvas || !wrap || !canvas.width || !canvas.height) return;

  // Sur mobile/tactile, on laisse une marge plus grande pour les boutons flottants
  const isTouch = window.matchMedia("(max-width: 640px), (hover: none) and (pointer: coarse)").matches;
  const safeMargin = isTouch ? 60 : 32;

  const availW = wrap.clientWidth - safeMargin;
  const availH = wrap.clientHeight - safeMargin;
  if (availW <= 0 || availH <= 0) return;

  const aspect = canvas.width / canvas.height;
  let dispW = availW;
  let dispH = dispW / aspect;
  if (dispH > availH) {
    dispH = availH;
    dispW = dispH * aspect;
  }
  canvas.style.width = Math.floor(dispW) + 'px';
  canvas.style.height = Math.floor(dispH) + 'px';
  // Synchroniser la taille du parchemin
  const endParchmentWrap = document.getElementById('endgame-parchment-wrap');
  if (endParchmentWrap) {
    endParchmentWrap.style.width = canvas.style.width;
    endParchmentWrap.style.height = canvas.style.height;
  }
}

// ─── Démarrer / arrêter le jeu ────────────────────────────────
function startGame() {
  const level = currentLevel;
  if (!level) return;

  gameWon = false;
  moves = 0;
  history = [];
  playerDir = 'down';
  isIdle = true;
  isPushing = false;
  clearTimeout(idleTimeout);
  clearTimeout(pushTimeout);

  let prefix = '';
  if (level.isCustom) prefix = 'Perso : ';
  else prefix = level.id + '. ';
  document.getElementById('hud-level-name').textContent = prefix + level.name;
  document.getElementById('hud-moves').textContent = '0';
  document.getElementById('hud-par').textContent = level.par;
  document.getElementById('hud-time').textContent = '0:00';

  parseLevel(level.data);

  const canvas = document.getElementById('game-canvas');
  canvas.width = gridW * GRID;
  canvas.height = cells.length * GRID;
  canvas.style.width = '';
  canvas.style.height = '';

  if (rafId) cancelAnimationFrame(rafId);
  if (!wallImg) buildWallTexture();
  drawGame();

  requestAnimationFrame(() => fitGameCanvas());

  // Gestion des overlays spéciaux (Tutoriel Lvl 1 ou Parchemin fin Lvl 25)
  const needTutorial = !currentLevel.isCustom && currentLevel.id === 1;
  const showEndParchment = !currentLevel.isCustom && currentLevel.id === 25;
  
  // Afficher ou cacher le parchemin de fin
  const endParchmentWrap = document.getElementById('endgame-parchment-wrap');
  if (endParchmentWrap) {
    endParchmentWrap.style.display = showEndParchment ? 'block' : 'none';
  }

  if (needTutorial) {
    setTimeout(startTutorial, 500);
  } else {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
  }
}

function updateTimer() {
  if (gameWon) return;
  const s = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('hud-time').textContent = formatTime(s);
}

function formatTime(s) {
  return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
}

function stopGame() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  clearInterval(timerInterval);
}

// ─── Actions joueur ──────────────────────────────────────────
function undoMove() {
  if (history.length === 0 || gameWon) return;
  const last = history.pop();
  cells = last.cells;
  playerPos = last.playerPos;
  crateTypes = last.crateTypes;
  moves = Math.max(0, moves - 1);
  document.getElementById('hud-moves').textContent = moves;
}

function resetLevel() {
  stopGame();
  startGame();
}

function backToLevels() {
  stopGame();
  if (currentLevel?.isTest) showScreen('editor');
  else if (currentLevel?.isCustom) showScreen('customLevels');
  else showScreen('levelSelect');
}

// ─── Victoire ─────────────────────────────────────────────────
function showVictory(mv, time) {
  const level = currentLevel;
  if (!level) return;

  // Sauvegarde du score (sauf pour un test depuis l'éditeur)
  if (!level.isTest) {
    if (level.isCustom) saveCustomLevelScore(level.id, mv, time, level.par);
    else saveLevelScore(level.id, mv, time, level.par);
  }

  const stars = getStars(mv, level.par);
  document.getElementById('victory-level-name').textContent = level.name;
  document.getElementById('victory-moves').textContent = mv;
  document.getElementById('victory-time').textContent = formatTime(time);
  document.getElementById('victory-par').textContent = level.par;

  const starsEl = document.getElementById('victory-stars');
  starsEl.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const img = document.createElement('img');
    img.src = 'images/symboleetoile.png';
    img.alt = 'Étoile';
    img.setAttribute('class', 'v-star-img' + (i <= stars ? ' earned' : ''));
    starsEl.appendChild(img);
  }

  const btnNext = document.getElementById('btn-next-level');
  let showNext = false;
  if (level.isCustom || level.isTest) {
    showNext = false;
  } else {
    const idx = LEVELS.findIndex(l => l.id === level.id);
    showNext = (idx !== -1 && idx < LEVELS.length - 1);
  }
  btnNext.classList.toggle('hide', !showNext);

  const particlesEl = document.getElementById('victory-particles');
  particlesEl.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = (10 + Math.random() * 80) + '%';
    p.style.top = (20 + Math.random() * 60) + '%';
    p.style.animationDelay = (Math.random() * 2.5) + 's';
    p.style.animationDuration = (2 + Math.random() * 2) + 's';
    const crateImg = Math.random() < 0.5 ? 'images/baluchon1.png' : 'images/baluchon2.png';
    p.style.backgroundImage = `url('${crateImg}')`;
    const size = 20 + Math.random() * 25;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    
    particlesEl.appendChild(p);
  }

  // Bouton retour selon le type de niveau
  const isEditorLevel = level.isCustom || level.isTest;
  const backBtn = document.getElementById('btn-back-to-list');
  if (isEditorLevel) {
    if (level.isTest) {
      backBtn.textContent = 'Retour à l\'éditeur';
      backBtn.onclick = () => showScreen('editor');
    } else {
      backBtn.textContent = 'Retour aux niveaux perso';
      backBtn.onclick = () => showScreen('customLevels');
    }
  } else {
    backBtn.textContent = 'Retour à la carte';
    backBtn.onclick = () => showScreen('levelSelect');
  }

  showScreen('victory');
}

function nextLevel() {
  const level = currentLevel;
  if (!level) return;
  if (level.isCustom || level.isTest) {
    showScreen(level.isTest ? 'editor' : 'customLevels');
    return;
  }
  const idx = LEVELS.findIndex(l => l.id === level.id);
  if (idx !== -1 && idx < LEVELS.length - 1) {
    currentLevel = LEVELS[idx + 1];
    showScreen('game');
  } else {
    showScreen('levelSelect');
  }
}

function replayLevel() {
  showScreen('game');
}

// ─── Paramètres ──────────────────────────────────────────────
function openSettings() {
  document.getElementById('vol-music').value = settings.musicVolume;
  document.getElementById('vol-sfx').value = settings.sfxVolume;
  document.getElementById('vol-music-val').textContent = settings.musicVolume + '%';
  document.getElementById('vol-sfx-val').textContent = settings.sfxVolume + '%';
  document.getElementById('modal-settings').classList.add('active');
}

function closeSettings() {
  document.getElementById('modal-settings').classList.remove('active');
}

function updateMusicVolume(val) {
  settings.musicVolume = parseInt(val);
  document.getElementById('vol-music-val').textContent = val + '%';
  saveSettings();
  // TODO: appliquer le volume à la musique quand les sons seront ajoutés
}

function updateSfxVolume(val) {
  settings.sfxVolume = parseInt(val);
  document.getElementById('vol-sfx-val').textContent = val + '%';
  saveSettings();
  // TODO: appliquer le volume aux effets sonores quand les sons seront ajoutés
}

// ─── Réinitialisation de la progression ──────────────────────
function showResetConfirm() {
  document.getElementById('modal-reset-confirm').classList.add('active');
}

function closeResetConfirm() {
  document.getElementById('modal-reset-confirm').classList.remove('active');
}

function resetProgress() {
  localStorage.removeItem(SAVE_KEY);
  closeResetConfirm();
  closeSettings();
  updateHomeStats();
}

// ─── Page d'aide ─────────────────────────────────────────────
function showHelp() {
  closeSettings();
  showScreen('help');
}

// ─── Fonctions de dessin pour l'aide ─────────────────────────
const HG = 36; // Taille de grille pour les illustrations d'aide

function drawHelpFloor(ctx, x, y, g) {
  ctx.fillStyle = '#ded6ae';
  ctx.fillRect(x, y, g, g);
}

// ─── Clavier ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // Échap pour fermer les modales
  if (e.key === 'Escape') {
    if (document.getElementById('modal-reset-confirm').classList.contains('active')) {
      closeResetConfirm();
      e.preventDefault();
      return;
    }
    if (document.getElementById('modal-settings').classList.contains('active')) {
      closeSettings();
      e.preventDefault();
      return;
    }
  }

  // Tutoriel : Entrer/Espace = avancer, Échap = passer
  const tutEl = document.getElementById('tutorial-overlay');
  if (tutEl && tutEl.style.display !== 'none') {
    if (e.key === 'Enter' || e.key === ' ') {
      nextTutorialStep();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      skipTutorial();
      e.preventDefault();
      return;
    }
    return; // Bloque les autres touches pendant le tutoriel
  }

  if (currentScreen !== 'game') return;

  const keyMap = {
    ArrowUp:    [-1,0], ArrowDown:  [1,0], ArrowLeft:  [0,-1], ArrowRight: [0,1],
    z: [-1,0], w: [-1,0], Z: [-1,0], W: [-1,0],
    q: [0,-1], a: [0,-1], Q: [0,-1], A: [0,-1],
    s: [1,0],  S: [1,0],
    d: [0,1],  D: [0,1],
  };

  if (e.key === 'u' || e.key === 'U') { undoMove(); e.preventDefault(); return; }
  if (e.key === 'r' || e.key === 'R') { resetLevel(); e.preventDefault(); return; }

  const dir = keyMap[e.key];
  if (dir) { tryMove(dir[0], dir[1]); e.preventDefault(); }
});

// ─── D-Pad tactile ───────────────────────────────────────────
document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
  const dirs = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
  const handler = e => {
    e.preventDefault();
    const d = dirs[btn.dataset.dir];
    if (d) tryMove(d[0], d[1]);
  };
  btn.addEventListener('touchstart', handler, { passive: false });
  btn.addEventListener('mousedown', handler);
});

// ─── Déplacement par clic/toucher sur la grille ───────────
const gameCanvas = document.getElementById('game-canvas');
if (gameCanvas) {
  const handleGridTap = (e) => {
    // On n'agit que si on est sur l'écran de jeu
    if (currentScreen !== 'game') return;
    // On ignore si le jeu est gagné ou si le tuto/fin est ouvert
    if (gameWon) return;
    const tutEl = document.getElementById('tutorial-overlay');
    if (tutEl && tutEl.style.display !== 'none') return;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculer la case cliquée en tenant compte de la taille d'affichage du canvas
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = gameCanvas.width / rect.width;
    const scaleY = gameCanvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const col = Math.floor(x / GRID);
    const row = Math.floor(y / GRID);

    // Vérifier si la case cliquée est juste à côté du joueur (haut, bas, gauche, droite)
    const dr = row - playerPos.row;
    const dc = col - playerPos.col;

    // La somme des valeurs absolues doit être 1 pour être une case adjacente (pas de diagonale)
    if (Math.abs(dr) + Math.abs(dc) === 1) {
      tryMove(dr, dc);
      e.preventDefault(); // Empêche le zoom/double tap sur mobile
    }
  };

  // Écouteurs pour le tactile et la souris
  gameCanvas.addEventListener('touchstart', handleGridTap, { passive: false });
  gameCanvas.addEventListener('mousedown', handleGridTap);
}

// ─── Resize ──────────────────────────────────────────────────
let resizeTimeout = null;
window.addEventListener('resize', () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (currentScreen === 'game') fitGameCanvas();
    if (currentScreen === 'editor' && typeof fitEditorCanvas === 'function') fitEditorCanvas();
  }, 100);
});

// ─── Init ────────────────────────────────────────────────────
loadSettings();
showScreen('home');
