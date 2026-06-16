/* ================================================
   Slider Robot
   ================================================ */

const GRID_SIZE = 16;
const CELL_PCT = (100 / GRID_SIZE);
const CENTER_ROWS = [7, 8];
const CENTER_COLS = [7, 8];

// ================================================
//            SEEDED RANDOM GENERATOR
// ================================================
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
}

// ================================================
//        ROBOT IMAGE CONSTANTS
// ================================================
const ROBOT_IMAGES = {
    red: 'images/robotrouge.png',
    blue: 'images/robotbleu.png',
    green: 'images/robotvert.png',
    yellow: 'images/robotjaune.png',
    black: 'images/robotnoir.png'
};
const ROBOT_WALK_IMAGES = {
    red: 'images/robotrougemarche.png',
    blue: 'images/robotbleumarche.png',
    green: 'images/robotvertmarche.png',
    yellow: 'images/robotjaunemarche.png',
    black: 'images/robotnoirmarche.png'
};
const ROBOT_SELECTED_IMAGES = {
    red: 'images/robotrougecc.png',
    blue: 'images/robotbleucc.png',
    green: 'images/robotvertcc.png',
    yellow: 'images/robotjaunecc.png',
    black: 'images/robotnoircc.png'
};

const SYMBOL_IMAGES = {
    '\u2295': 'images/batterie.png',
    '\u25B3': 'images/boulon.png',
    '\u25A1': 'images/cle.png',
    '\u25CB': 'images/eclair.png'
};

// ================================================
//     QUADRANT DATA (8 quadrants from Ricochet Robots)
//     Board positions: TL (0-7,0-7), TR (0-7,8-15),
//                      BL (8-15,0-7), BR (8-15,8-15)
//     Each position has 2 variants:
//       TL: Q1 or Q5, TR: Q2 or Q6,
//       BL: Q3 or Q7, BR: Q4 or Q8
//     Incompatible pairs (same position):
//       Q1≠Q5, Q2≠Q6, Q3≠Q7, Q4≠Q8
// ================================================
const QUADRANTS = {
    1: {
        walls: [
            { row: 1, col: 5, side: "bottom" },
            { row: 1, col: 5, side: "left" },
            { row: 4, col: 3, side: "bottom" },
            { row: 4, col: 3, side: "right" },
            { row: 6, col: 1, side: "top" },
            { row: 6, col: 1, side: "right" },
            { row: 5, col: 6, side: "top" },
            { row: 5, col: 6, side: "left" },
            { row: 3, col: 0, side: "bottom" },
            { row: 0, col: 2, side: "right" }
        ],
        targets: [
            { row: 1, col: 5, color: "blue", symbol: "\u25A1" },
            { row: 5, col: 6, color: "green", symbol: "\u25A1" },
            { row: 4, col: 3, color: "red", symbol: "\u25A1" },
            { row: 6, col: 1, color: "yellow", symbol: "\u25A1" }
        ],
        centerHole: { row: 7, col: 7 }
    },
    2: {
        walls: [
            { row: 1, col: 10, side: "top" },
            { row: 1, col: 10, side: "left" },
            { row: 4, col: 8, side: "bottom" },
            { row: 4, col: 8, side: "right" },
            { row: 2, col: 15, side: "bottom" },
            { row: 0, col: 9, side: "left" },
            { row: 5, col: 13, side: "bottom" },
            { row: 5, col: 13, side: "left" },
            { row: 6, col: 13, side: "right" }
        ],
        targets: [
            { row: 4, col: 8, color: "blue", symbol: "\u2295" },
            { row: 5, col: 13, color: "green", symbol: "\u2295" },
            { row: 1, col: 10, color: "red", symbol: "\u2295" },
            { row: 6, col: 13, color: "yellow", symbol: "\u2295" }
        ],
        centerHole: { row: 7, col: 8 }
    },
    3: {
        walls: [
            { row: 9, col: 4, side: "top" },
            { row: 9, col: 4, side: "right" },
            { row: 9, col: 0, side: "bottom" },
            { row: 15, col: 5, side: "right" },
            { row: 12, col: 6, side: "bottom" },
            { row: 12, col: 6, side: "right" },
            { row: 13, col: 6, side: "left" },
            { row: 14, col: 3, side: "bottom" },
            { row: 14, col: 3, side: "left" }
        ],
        targets: [
            { row: 12, col: 6, color: "blue", symbol: "\u25CB" },
            { row: 13, col: 6, color: "green", symbol: "\u25CB" },
            { row: 14, col: 3, color: "red", symbol: "\u25CB" },
            { row: 9, col: 4, color: "yellow", symbol: "\u25CB" }
        ],
        centerHole: { row: 8, col: 7 }
    },
    4: {
        walls: [
            { row: 9, col: 10, side: "bottom" },
            { row: 9, col: 10, side: "right" },
            { row: 11, col: 12, side: "top" },
            { row: 11, col: 12, side: "right" },
            { row: 11, col: 13, side: "bottom" },
            { row: 13, col: 9, side: "top" },
            { row: 13, col: 9, side: "left" },
            { row: 15, col: 10, side: "right" },
            { row: 13, col: 15, side: "top" }
        ],
        targets: [
            { row: 13, col: 9, color: "blue", symbol: "\u25B3" },
            { row: 11, col: 13, color: "green", symbol: "\u25B3" },
            { row: 11, col: 12, color: "red", symbol: "\u25B3" },
            { row: 9, col: 10, color: "yellow", symbol: "\u25B3" }
        ],
        centerHole: { row: 8, col: 8 }
    },
    5: {
        walls: [
            { row: 2, col: 6, side: "top" },
            { row: 2, col: 6, side: "left" },
            { row: 3, col: 2, side: "top" },
            { row: 3, col: 2, side: "right" },
            { row: 3, col: 3, side: "bottom" },
            { row: 5, col: 1, side: "bottom" },
            { row: 5, col: 1, side: "right" },
            { row: 7, col: 5, side: "bottom" },
            { row: 7, col: 5, side: "right" },
            { row: 6, col: 0, side: "bottom" },
            { row: 0, col: 4, side: "right" }
        ],
        targets: [
            { row: 3, col: 2, color: "blue", symbol: "\u25CB" },
            { row: 3, col: 3, color: "green", symbol: "\u2295" },
            { row: 5, col: 1, color: "red", symbol: "\u25A1" },
            { row: 2, col: 6, color: "yellow", symbol: "\u25B3" }
        ],
        centerHole: { row: 7, col: 7 }
    },
    6: {
        walls: [
            { row: 2, col: 11, side: "bottom" },
            { row: 2, col: 11, side: "right" },
            { row: 3, col: 13, side: "top" },
            { row: 3, col: 13, side: "right" },
            { row: 4, col: 10, side: "bottom" },
            { row: 4, col: 10, side: "left" },
            { row: 5, col: 12, side: "top" },
            { row: 5, col: 12, side: "left" },
            { row: 5, col: 15, side: "bottom" },
            { row: 0, col: 11, side: "right" }
        ],
        targets: [
            { row: 5, col: 12, color: "blue", symbol: "\u25B3" },
            { row: 4, col: 10, color: "green", symbol: "\u25A1" },
            { row: 2, col: 11, color: "red", symbol: "\u2295" },
            { row: 3, col: 13, color: "yellow", symbol: "\u25CB" }
        ],
        centerHole: { row: 7, col: 8 }
    },
    7: {
        walls: [
            { row: 9, col: 3, side: "top" },
            { row: 9, col: 3, side: "right" },
            { row: 11, col: 6, side: "top" },
            { row: 11, col: 6, side: "left" },
            { row: 12, col: 1, side: "bottom" },
            { row: 12, col: 1, side: "left" },
            { row: 14, col: 4, side: "bottom" },
            { row: 14, col: 4, side: "right" },
            { row: 15, col: 6, side: "right" },
            { row: 13, col: 0, side: "bottom" }
        ],
        targets: [
            { row: 11, col: 6, color: "blue", symbol: "\u2295" },
            { row: 12, col: 1, color: "green", symbol: "\u25B3" },
            { row: 14, col: 4, color: "red", symbol: "\u25CB" },
            { row: 9, col: 3, color: "yellow", symbol: "\u25A1" }
        ],
        centerHole: { row: 8, col: 7 }
    },
    8: {
        walls: [
            { row: 9, col: 12, side: "top" },
            { row: 9, col: 12, side: "left" },
            { row: 10, col: 10, side: "bottom" },
            { row: 10, col: 10, side: "right" },
            { row: 12, col: 14, side: "top" },
            { row: 12, col: 14, side: "right" },
            { row: 14, col: 11, side: "bottom" },
            { row: 14, col: 11, side: "left" },
            { row: 15, col: 13, side: "right" },
            { row: 9, col: 15, side: "bottom" }
        ],
        targets: [
            { row: 9, col: 12, color: "blue", symbol: "\u25A1" },
            { row: 14, col: 11, color: "green", symbol: "\u25CB" },
            { row: 12, col: 14, color: "red", symbol: "\u25B3" },
            { row: 10, col: 10, color: "yellow", symbol: "\u2295" }
        ],
        centerHole: { row: 8, col: 8 }
    }
};

/**
 * Generate a board from a combination of 4 quadrants.
 * @param {number[]} quadrantIds - Array of 4 quadrant IDs [TL, TR, BL, BR]
 * @returns {{ walls: Array, targets: Array }} Board data
 */
function generateBoardFromQuadrants(quadrantIds) {
    const walls = [];
    const targets = [];

    // Add border walls
    for (let i = 0; i < GRID_SIZE; i++) {
        walls.push({ row: 0, col: i, side: 'top' });
        walls.push({ row: GRID_SIZE - 1, col: i, side: 'bottom' });
        walls.push({ row: i, col: 0, side: 'left' });
        walls.push({ row: i, col: GRID_SIZE - 1, side: 'right' });
    }

    // Add center block walls
    for (const c of CENTER_COLS) {
        walls.push({ row: 6, col: c, side: 'bottom' });
        walls.push({ row: 9, col: c, side: 'top' });
    }
    for (const r of CENTER_ROWS) {
        walls.push({ row: r, col: 6, side: 'right' });
        walls.push({ row: r, col: 9, side: 'left' });
    }

    // Add quadrant walls and targets
    for (const qId of quadrantIds) {
        const q = QUADRANTS[qId];
        if (!q) continue;
        // Walls are already in absolute board coordinates
        for (const w of q.walls) {
            walls.push({ row: w.row, col: w.col, side: w.side });
        }
        // Targets are already in absolute board coordinates
        for (const t of q.targets) {
            targets.push({ row: t.row, col: t.col, color: t.color, symbol: t.symbol });
        }
    }

    return { walls, targets };
}

/**
 * Get all valid quadrant combinations (2^4 = 16 possible boards).
 * Returns array of [TL, TR, BL, BR] quadrant ID arrays.
 */
function getAllQuadrantCombinations() {
    const combos = [];
    const pairs = [[1, 5], [2, 6], [3, 7], [4, 8]];

    // 16 ensembles : on prend exactement 1 quadrant par paire
    const sets = [];
    for (let m = 0; m < 16; m++) {
        const set = [];
        for (let i = 0; i < 4; i++) {
            set.push(pairs[i][(m >> i) & 1]);
        }
        sets.push(set);
    }

    // 24 permutations par ensemble
    function permute(arr, l) {
        if (l === arr.length) {
            combos.push([...arr]);
            return;
        }
        for (let i = l; i < arr.length; i++) {
            [arr[l], arr[i]] = [arr[i], arr[l]];
            permute(arr, l + 1);
            [arr[l], arr[i]] = [arr[i], arr[l]];
        }
    }

    for (const set of sets) {
        permute(set, 0);
    }

    return combos;
}

// Pre-compute all 16 board configurations
const QUADRANT_BOARDS = getAllQuadrantCombinations();

// ================================================
//         REACHABILITY CHECK (fast)
// ================================================
function getReachableCells(wallsSet, startRow, startCol) {
    const dirs = [
        { dr: -1, dc: 0, wsc: 'top', wsn: 'bottom' },
        { dr: 1, dc: 0, wsc: 'bottom', wsn: 'top' },
        { dr: 0, dc: -1, wsc: 'left', wsn: 'right' },
        { dr: 0, dc: 1, wsc: 'right', wsn: 'left' }
    ];
    const visited = new Set();
    const queue = [[startRow, startCol]];
    visited.add(startRow * GRID_SIZE + startCol);

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        for (const { dr, dc, wsc, wsn } of dirs) {
            let cr = r, cc = c;
            while (true) {
                const nr = cr + dr, nc = cc + dc;
                if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;
                if (CENTER_ROWS.includes(nr) && CENTER_COLS.includes(nc)) break;
                if (wallsSet.has(cr + '-' + cc + '-' + wsc)) break;
                if (wallsSet.has(nr + '-' + nc + '-' + wsn)) break;
                cr = nr; cc = nc;
                const key = cr * GRID_SIZE + cc;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([cr, cc]);
                }
            }
        }
    }
    return visited;
}

// ================================================
//     BFS SOLVER (multi-robot, with depth limit)
// ================================================
function solvePuzzle(wallsSet, robots, targetRobotId, targetRow, targetCol, maxDepth) {
    const robotIds = robots.map(r => r.id);
    const dirs = ['up', 'down', 'left', 'right'];
    const dirDeltas = {
        up: [-1, 0, 'top', 'bottom'], down: [1, 0, 'bottom', 'top'],
        left: [0, -1, 'left', 'right'], right: [0, 1, 'right', 'left']
    };

    function makeState(positions) {
        return robotIds.map(id => positions[id].r * GRID_SIZE + positions[id].c).join(',');
    }

    function slideRobot(positions, robotId, dir) {
        const [dr, dc, wsc, wsn] = dirDeltas[dir];
        let cr = positions[robotId].r, cc = positions[robotId].c;
        const isTargetRobot = robotId === targetRobotId;
        while (true) {
            const nr = cr + dr, nc = cc + dc;
            if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;
            if (CENTER_ROWS.includes(nr) && CENTER_COLS.includes(nc)) break;
            if (wallsSet.has(cr + '-' + cc + '-' + wsc)) break;
            if (wallsSet.has(nr + '-' + nc + '-' + wsn)) break;
            let blocked = false;
            for (const id of robotIds) {
                if (id !== robotId && positions[id].r === nr && positions[id].c === nc) { blocked = true; break; }
            }
            if (blocked) break;
            cr = nr; cc = nc;
            if (isTargetRobot && cr === targetRow && cc === targetCol) break;
        }
        return { r: cr, c: cc };
    }

    const initPositions = {};
    robots.forEach(r => { initPositions[r.id] = { r: r.row, c: r.col }; });

    const initState = makeState(initPositions);
    const visited = new Set([initState]);
    const queue = [{ positions: initPositions, depth: 0 }];
    let iterations = 0;
    const MAX_ITER = 80000;

    while (queue.length > 0 && iterations < MAX_ITER) {
        const { positions, depth } = queue.shift();
        if (depth >= maxDepth) continue;
        iterations++;

        for (const robotId of robotIds) {
            for (const dir of dirs) {
                const newPos = slideRobot(positions, robotId, dir);
                if (newPos.r === positions[robotId].r && newPos.c === positions[robotId].c) continue;
                if (robotId === targetRobotId && newPos.r === targetRow && newPos.c === targetCol) {
                    return depth + 1;
                }
                const newPositions = {};
                for (const id of robotIds) {
                    newPositions[id] = id === robotId ? newPos : { r: positions[id].r, c: positions[id].c };
                }
                const state = makeState(newPositions);
                if (!visited.has(state)) {
                    visited.add(state);
                    queue.push({ positions: newPositions, depth: depth + 1 });
                }
            }
        }
    }
    return -1;
}

// ================================================
//            SOUND MANAGER
// ================================================
const SoundManager = {
    volume: 0.5,
    sounds: {},
    init() {
        // Charger le volume sauvegardé
        try {
            const savedVol = localStorage.getItem('slide_robot_volume');
            if (savedVol !== null) this.volume = parseFloat(savedVol);
        } catch(e) {}

        // Initialisation des sons
        this.sounds.deplacementrobot = [
            new Audio('audio/deplacementrobot1.mp3'),
            new Audio('audio/deplacementrobot2.mp3'),
            new Audio('audio/deplacementrobot3.mp3')
        ];
        this.sounds.erreur = new Audio('audio/erreur.mp3');
        this.sounds.victoire = new Audio('audio/victoire.mp3');
        this.sounds.annuler = new Audio('audio/annuler.mp3');
        this.sounds.niveau = new Audio('audio/niveau.mp3');

        // Appliquer le volume initial
        this.setVolume(this.volume);
    },
    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        try { localStorage.setItem('slide_robot_volume', this.volume); } catch(e) {}
        
        for (const key in this.sounds) {
            if (Array.isArray(this.sounds[key])) {
                this.sounds[key].forEach(s => s.volume = this.volume);
            } else {
                this.sounds[key].volume = this.volume;
            }
        }
    },
    play(name) {
        if (this.volume === 0) return;
        const sound = this.sounds[name];
        if (!sound) return;
        
        if (Array.isArray(sound)) {
            const randomSound = sound[Math.floor(Math.random() * sound.length)];
            randomSound.currentTime = 0; // Recommencer si déjà en cours
            randomSound.play().catch(e => {}); // .catch() évite les erreurs sur mobile
        } else {
            sound.currentTime = 0;
            sound.play().catch(e => {});
        }
    }
};

// ================================================
//                GAME OBJECT
// ================================================
const Game = {
    mode: null,
    currentLevel: null,
    randomSeed: null,
    robots: [],
    wallsData: [],
    wallsSet: new Set(),
    targetsData: [],
    currentTarget: null,
    selectedRobotId: null,
    moveCount: 0,
    moveHistory: [],
    isAnimating: false,
    targetsReached: 0,
    unlockedLevels: 1,
    levelStars: {},
    levelMoves: {},
    currentScreen: 'screen-menu',
    pendingLevelIndex: null,
    optimalMoves: -1,
    robotDirections: {},
    roundStartPositions: null,
    timerInterval: null,
    timerSeconds: 0,

    ROBOT_IDS: ['red', 'blue', 'green', 'yellow', 'black'],

    boardEl: null, robotsLayerEl: null, countEl: null,
    targetColorEl: null, targetSymbolEl: null, toastEl: null, levelTitleEl: null,

    init() {
        SoundManager.init();
        this.boardEl = document.getElementById('board');
        this.robotsLayerEl = document.getElementById('robots-layer');
        this.countEl = document.getElementById('count');
        this.targetColorEl = document.getElementById('target-color');
        this.targetSymbolEl = document.getElementById('target-symbol');
        this.toastEl = document.getElementById('toast');
        this.levelTitleEl = document.getElementById('level-title');
        this.loadProgress();
        this.renderLevelSelect();
        this.setupInput();
    },

    loadProgress() {
        try {
            const saved = localStorage.getItem('ricochet_progress_v6');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedLevels = data.unlockedLevels || 1;
                this.levelStars = data.levelStars || {};
                this.levelMoves = data.levelMoves || {};
            }
        } catch (e) {}
    },

    saveProgress() {
        try {
            localStorage.setItem('ricochet_progress_v6', JSON.stringify({
                unlockedLevels: this.unlockedLevels,
                levelStars: this.levelStars,
                levelMoves: this.levelMoves
            }));
        } catch (e) {}
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(screenId);
        if (el) requestAnimationFrame(() => el.classList.add('active'));
        this.currentScreen = screenId;
        if (screenId === 'screen-levels') this.renderLevelSelect();
    },

    showModal(modalId) { document.getElementById(modalId).classList.add('active'); },
    hideModal(modalId) { document.getElementById(modalId).classList.remove('active'); },

    goHome() {
        this.selectedRobotId = null;
        this.stopTimer();
        this.showScreen('screen-menu');
    },

    // ==============================
    //    CONFIRMATION DIALOGS
    // ==============================
    confirmRestart() {
        this.showModal('modal-confirm-restart');
    },
    confirmNewGame() {
        this.showModal('modal-confirm-new');
    },
    doRestart() {
        SoundManager.play('niveau');
        this.hideModal('modal-confirm-restart');
        this.restart();
    },
    doNewGame() {
        SoundManager.play('niveau');
        this.hideModal('modal-confirm-new');
        this.newRandomGame();
    },

    // ==============================
    //    LEVEL INFO MODAL
    // ==============================
    showLevelInfo(levelIndex) {
        const level = LEVELS[levelIndex];
        if (!level) return;
        const isUnlocked = levelIndex < this.unlockedLevels;
        const isCompleted = this.levelStars[levelIndex] !== undefined;
        const stars = this.levelStars[levelIndex] || 0;
        const bestMoves = this.levelMoves[levelIndex];

        // Icon
        const iconEl = document.getElementById('level-info-icon');
        iconEl.className = 'level-info-icon';
        if (isCompleted) iconEl.classList.add('completed-icon');
        if (!isUnlocked) iconEl.classList.add('locked-icon');
        iconEl.textContent = levelIndex + 1;

        // Title
        document.getElementById('level-info-title').textContent =
            isUnlocked ? `Niveau ${levelIndex + 1} - ${level.name}` : `Niveau ${levelIndex + 1} - Verrouille`;

        // Details (difficulty + par)
        const diffLabels = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
        const details = isUnlocked
            ? `${diffLabels[level.difficulty] || level.difficulty} &bull; Possible en : ${level.par} coups`
            : 'Terminez le niveau precedent pour debloquer';
        document.getElementById('level-info-details').innerHTML = details;

        // Stars
        const starsEl = document.getElementById('level-info-stars');
        starsEl.innerHTML = '';
        for (let s = 0; s < 3; s++) {
            const span = document.createElement('span');
            span.classList.add('star');
            if (s < stars) span.classList.add('earned');
            span.innerHTML = '&#9733;';
            starsEl.appendChild(span);
        }

        // Record
        const recordEl = document.getElementById('level-info-record');
        if (isCompleted && bestMoves !== undefined) {
            recordEl.textContent = `Meilleur score : ${bestMoves} coup${bestMoves > 1 ? 's' : ''}`;
        } else if (isUnlocked) {
            recordEl.textContent = 'Pas encore termine';
        } else {
            recordEl.textContent = '';
        }

        // Buttons
        const playBtn = document.getElementById('btn-level-play');
        if (isUnlocked) {
            playBtn.style.display = '';
            playBtn.textContent = isCompleted ? 'Rejouer' : 'Jouer';
        } else {
            playBtn.style.display = 'none';
        }

        this.pendingLevelIndex = levelIndex;
        this.showModal('modal-level-info');
    },

    launchLevelFromInfo() {
        SoundManager.play('niveau');
        this.hideModal('modal-level-info');
        if (this.pendingLevelIndex !== null) {
            this.startLevel(this.pendingLevelIndex);
            this.pendingLevelIndex = null;
        }
    },

    // ==============================
    //       SETTINGS SCREEN
    // ==============================
    showSettings() {
        // Met à jour le visuel du slider au moment d'ouvrir la page
        document.getElementById('volume-slider').value = Math.round(SoundManager.volume * 100);
        document.getElementById('vol-value').textContent = Math.round(SoundManager.volume * 100) + '%';
        this.showScreen('screen-settings');
    },
    doResetGame() {
        this.hideModal('modal-confirm-reset-game');
        // Réinitialisation complète des données
        this.unlockedLevels = 1;
        this.levelStars = {};
        this.levelMoves = {};
        this.saveProgress();
        this.showToast("Partie reinitialisee !");
        this.showScreen('screen-menu');
    },

    // ==============================
    //    SERPENTINE MAP LEVEL SELECT
    // ==============================
    renderLevelSelect() {
        const container = document.getElementById('snake-map');
        if (!container) return;
        container.innerHTML = '';

        const totalLevels = LEVELS.length;

        // ── Calculate node positions along a serpentine S-curve ──
        // We use percentage-based X positioning so it scales with container width
        // Y positions are in pixels
        const nodeSpacingY = 76;
        const padding = { top: 40, bottom: 80 };
        const centerX = 50; // percentage

        // Chapters define gaps in the path for chapter banners
        const chapters = [
            { startIndex: 0, label: "Acte 1 : Decouverte" },
            { startIndex: 10, label: "Acte 2 : Aventure" },
            { startIndex: 22, label: "Acte 3 : Expert" },
            { startIndex: 36, label: "Acte 4 : Maitre" }
        ];

        // Positions: { xPct (0-100%), y (px) }
        const positions = [];

        // Build a set of chapter start indices for gap insertion
        const chapterStartSet = new Set(chapters.map(c => c.startIndex));

        for (let i = 0; i < totalLevels; i++) {
            // Add extra spacing before chapter starts (except the first)
            const chapterGap = (chapterStartSet.has(i) && i > 0) ? 44 : 0;

            const y = padding.top + i * nodeSpacingY + chapterGap;

            // Cosine wave creates the serpentine S-curve
            // -cos starts at -1 (left side) at i=0, then swings right, left, right...
            // One full oscillation every ~6 levels
            const phase = (i / 3) * Math.PI;
            const waveValue = -Math.cos(phase);

            // X position: 15% to 85% range
            const xPct = centerX + waveValue * 35;

            positions.push({ xPct, y });
        }

        const totalHeight = positions.length > 0
            ? positions[positions.length - 1].y + padding.bottom
            : 300;

        container.style.height = totalHeight + 'px';
        container.style.width = '100%';

        // ── Draw SVG path connecting all nodes ──
        // Use a viewBox matching a 100x{totalHeight} coordinate system
        // so X coordinates map to percentage positions
        const svgW = 100;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('snake-path-svg');
        svg.setAttribute('viewBox', `0 0 ${svgW} ${totalHeight}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.width = '100%';
        svg.style.height = totalHeight + 'px';

        if (positions.length >= 2) {
            // Build smooth path using cardinal spline
            let pathD = `M ${positions[0].xPct.toFixed(2)} ${positions[0].y.toFixed(1)}`;

            for (let i = 0; i < positions.length - 1; i++) {
                const p0 = positions[Math.max(0, i - 1)];
                const p1 = positions[i];
                const p2 = positions[i + 1];
                const p3 = positions[Math.min(positions.length - 1, i + 2)];

                // Cardinal spline tension
                const t = 0.3;
                const cp1x = p1.xPct + (p2.xPct - p0.xPct) * t;
                const cp1y = p1.y + (p2.y - p0.y) * t;
                const cp2x = p2.xPct - (p3.xPct - p1.xPct) * t;
                const cp2y = p2.y - (p3.y - p1.y) * t;

                pathD += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(1)}, ${p2.xPct.toFixed(2)} ${p2.y.toFixed(1)}`;
            }

            // Background path (shadow/border)
            const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathBg.setAttribute('d', pathD);
            pathBg.classList.add('snake-path-line-bg');
            svg.appendChild(pathBg);

            // Main path
            const pathMain = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathMain.setAttribute('d', pathD);
            pathMain.classList.add('snake-path-line');
            svg.appendChild(pathMain);

            // Dotted overlay
            const pathDots = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathDots.setAttribute('d', pathD);
            pathDots.classList.add('snake-path-dots');
            svg.appendChild(pathDots);
        }

        container.appendChild(svg);

        // ── Create level nodes ──
        for (let i = 0; i < totalLevels; i++) {
            const level = LEVELS[i];
            const isUnlocked = i < this.unlockedLevels;
            const isCompleted = this.levelStars[i] !== undefined;
            const stars = this.levelStars[i] || 0;
            const pos = positions[i];

            const node = document.createElement('div');
            node.classList.add('snake-node');
            if (!isUnlocked) node.classList.add('locked');
            if (isCompleted) node.classList.add('completed');
            if (i === this.unlockedLevels - 1) node.classList.add('current');

            // Use percentage for X, pixel for Y
            node.style.left = pos.xPct + '%';
            node.style.top = pos.y + 'px';

            let starsHTML = '';
            for (let s = 0; s < 3; s++) {
                starsHTML += `<span class="${s < stars ? 'earned' : ''}">&#9733;</span>`;
            }

            if (isUnlocked) {
                node.innerHTML = `
                    <div class="node-num">${i + 1}</div>
                    <div class="node-name">${level.name}</div>
                    <div class="node-stars">${starsHTML}</div>
                `;
                node.addEventListener('click', () => this.showLevelInfo(i));
            } else {
                node.innerHTML = `
                    <div class="node-lock">&#128274;</div>
                    <div class="node-name">???</div>
                `;
                node.addEventListener('click', () => this.showLevelInfo(i));
            }

            container.appendChild(node);
        }

        // ── Add chapter banners offset from the path ──
        for (const ch of chapters) {
            if (ch.startIndex >= totalLevels) continue;
            const chPos = positions[ch.startIndex];
            const banner = document.createElement('div');
            banner.classList.add('snake-chapter');
            banner.textContent = ch.label;
            // Position banner above the first level, shifted to the opposite side of the path
            const bannerX = chPos.xPct < 50 ? '70%' : '30%';
            banner.style.left = bannerX;
            banner.style.top = (chPos.y - 40) + 'px';
            banner.style.transform = 'translate(-50%, 0)';
            container.appendChild(banner);
        }

        // ── Add decorative robot images around the serpentine path ──
        const robotImgs = ['images/robotrouge.png', 'images/robotbleu.png', 'images/robotvert.png', 'images/robotjaune.png', 'images/robotnoir.png', 'images/robotrougecc.png', 'images/robotbleucc.png', 'images/robotvertcc.png', 'images/robotjaunecc.png', 'images/robotnoircc.png'];
        const decoRobotPositions = [];
        
        // Ajustement de la taille et des marges selon l'écran
        const isMobile = window.innerWidth <= 500;
        const decoSize = isMobile ? 28 : 55; // Plus petit sur mobile pour ne pas déborder
        const leftMargin = isMobile ? 4 : 6;  // Marge sécurisée gauche
        const rightMargin = isMobile ? 96 : 94;// Marge sécurisée droite
        const spacingY = isMobile ? 140 : 170; // Espacement vertical suffisant pour éviter les superpositions

        let decoIdx = 0;
        for (let dy = 80; dy < totalHeight - 80; dy += spacingY) {
            const side = (decoIdx % 2 === 0) ? 'left' : 'right';
            const xPct = side === 'left' ? leftMargin : rightMargin;
            const imgIdx = decoIdx % robotImgs.length;
            decoRobotPositions.push({ xPct, y: dy, img: robotImgs[imgIdx] });
            decoIdx++;
        }

        for (const deco of decoRobotPositions) {
            const img = document.createElement('img');
            img.src = deco.img;
            img.classList.add('deco-robot');
            img.style.left = deco.xPct + '%';
            img.style.top = deco.y + 'px';
            img.style.width = decoSize + 'px';
            img.style.height = decoSize + 'px';
            img.style.transform = 'translate(-50%, -50%)';
            container.appendChild(img);
        }

        // ── Scroll to current level ──
        const scrollEl = document.querySelector('.snake-scroll');
        if (scrollEl && this.unlockedLevels > 0) {
            const currentPos = positions[Math.min(this.unlockedLevels - 1, totalLevels - 1)];
            setTimeout(() => {
                scrollEl.scrollTop = currentPos.y - scrollEl.clientHeight / 2;
            }, 100);
        }
    },

    // ==============================
    //     RANDOM ROBOT PLACEMENT
    // ==============================
    placeRobotsRandomly(rng, targetsData) {
        const targetCells = new Set(targetsData.map(t => t.row + ',' + t.col));
        const validCells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (CENTER_ROWS.includes(r) && CENTER_COLS.includes(c)) continue;
                if (targetCells.has(r + ',' + c)) continue;
                validCells.push({ row: r, col: c });
            }
        }
        const shuffled = rng.shuffle(validCells);
        const positions = shuffled.slice(0, 5);
        return this.ROBOT_IDS.map((id, i) => ({ id, row: positions[i].row, col: positions[i].col }));
    },

    placeRobotsWithSolveCheck(rng, targetsData, wallsSet) {
        for (let attempt = 0; attempt < 80; attempt++) {
            const robots = this.placeRobotsRandomly(rng, targetsData);
            const reachableTargets = [];
            for (const target of targetsData) {
                const robot = robots.find(r => r.id === target.color);
                if (!robot) continue;
                const reachable = getReachableCells(wallsSet, robot.row, robot.col);
                if (reachable.has(target.row * GRID_SIZE + target.col)) {
                    reachableTargets.push(target);
                }
            }
            if (reachableTargets.length > 0) {
                const target = reachableTargets[Math.floor(rng.next() * reachableTargets.length)];
                const solvDepth = solvePuzzle(wallsSet, robots, target.color, target.row, target.col, 10);
                if (solvDepth > 0 && solvDepth <= 10) {
                    return { robots, verifiedTarget: target };
                }
                return { robots, verifiedTarget: reachableTargets[0] };
            }
        }
        return { robots: this.placeRobotsRandomly(rng, targetsData), verifiedTarget: null };
    },

    // ==============================
    //        GAME START
    // ==============================
    startLevel(levelIndex) {
        this.mode = 'levels';
        this.currentLevel = levelIndex;
        const level = LEVELS[levelIndex];

        // Check if the level uses quadrant-based generation
        if (level.quadrants) {
            // ── Quadrant-based level ──
            const boardData = generateBoardFromQuadrants(level.quadrants);
            this.wallsData = boardData.walls;
            this.targetsData = boardData.targets;
            this.wallsSet = new Set();
            this.wallsData.forEach(w => this.wallsSet.add(w.row + '-' + w.col + '-' + w.side));

            if (level.robots) {
                // ── Robots manuels ──
                this.robots = level.robots.map(r => ({ id: r.id, row: r.row, col: r.col }));

                if (level.firstTarget) {
                    this.currentTarget = level.firstTarget;
                } else {
                    this.pickNewTarget();
                }
            } else {
                // ── Robots aléatoires avec vérification solve ──
                const rng = new SeededRandom(level.quadrants.reduce((acc, q) => acc * 10 + q, 0));
                const { robots, verifiedTarget } = this.placeRobotsWithSolveCheck(rng, this.targetsData, this.wallsSet);
                this.robots = robots;

                if (level.firstTarget) {
                    this.currentTarget = level.firstTarget;
                } else if (verifiedTarget) {
                    this.currentTarget = verifiedTarget;
                } else {
                    this.pickNewTarget();
                }
            }
            } else if (level.manual && level.walls && level.targets && level.robots) {
            // ── Hand-crafted level ──
            // Add border walls and center walls automatically
            const walls = [...level.walls];

            // Add border walls
            for (let i = 0; i < GRID_SIZE; i++) {
                walls.push({ row: 0, col: i, side: 'top' });
                walls.push({ row: GRID_SIZE - 1, col: i, side: 'bottom' });
                walls.push({ row: i, col: 0, side: 'left' });
                walls.push({ row: i, col: GRID_SIZE - 1, side: 'right' });
            }

            // Add center block walls
            for (const c of CENTER_COLS) {
                walls.push({ row: 6, col: c, side: 'bottom' });
                walls.push({ row: 9, col: c, side: 'top' });
            }
            for (const r of CENTER_ROWS) {
                walls.push({ row: r, col: 6, side: 'right' });
                walls.push({ row: r, col: 9, side: 'left' });
            }

            this.wallsData = walls;
            this.targetsData = level.targets;
            this.robots = level.robots.map(r => ({ id: r.id, row: r.row, col: r.col }));
            this.wallsSet = new Set();
            this.wallsData.forEach(w => this.wallsSet.add(w.row + '-' + w.col + '-' + w.side));

            // Set the first target
            if (level.firstTarget) {
                this.currentTarget = level.firstTarget;
            } else {
                this.pickNewTarget();
            }
        }

        this.moveCount = 0;
        this.moveHistory = [];
        this.selectedRobotId = null;
        this.isAnimating = false;
        this.targetsReached = 0;
        this.robotDirections = {};

        this.showScreen('screen-game');
        setTimeout(() => {
            this.levelTitleEl.textContent = 'Niveau ' + (levelIndex + 1) + ' - ' + level.name;
            this.renderBoard(); this.renderRobots(); this.updateUI();
            document.getElementById('btn-new-game').style.display = 'none';
            document.getElementById('score-display').style.display = 'none';
            document.getElementById('timer-display').style.display = 'none';
        }, 100);
    },

    startRandom() {
        this.mode = 'random';
        this.currentLevel = null;
        this.randomSeed = Date.now();
        this.initRandomGame();
    },

    initRandomGame() {
        const rng = new SeededRandom(this.randomSeed);
        const comboIndex = rng.nextInt(0, QUADRANT_BOARDS.length - 1);
        const quadrantIds = QUADRANT_BOARDS[comboIndex];
        const boardData = generateBoardFromQuadrants(quadrantIds);

        this.wallsData = boardData.walls;
        this.targetsData = boardData.targets;
        this.wallsSet = new Set();
        this.wallsData.forEach(w => this.wallsSet.add(w.row + '-' + w.col + '-' + w.side));

        const { robots, verifiedTarget } = this.placeRobotsWithSolveCheck(rng, this.targetsData, this.wallsSet);
        this.robots = robots;

        this.moveCount = 0;
        this.moveHistory = [];
        this.selectedRobotId = null;
        this.isAnimating = false;
        this.targetsReached = 0;
        this.robotDirections = {};
        this.roundStartPositions = null;

        if (verifiedTarget) {
            this.currentTarget = verifiedTarget;
        } else {
            this.pickNewTarget();
        }

        // Save round start positions for return mechanic
        this.saveRoundStartPositions();

        // Start timer
        this.startTimer();

        this.showScreen('screen-game');
        setTimeout(() => {
            this.levelTitleEl.innerHTML = 'Partie Aleatoire';
            this.renderBoard(); this.renderRobots(); this.updateUI();
            document.getElementById('btn-new-game').style.display = '';
            document.getElementById('score-display').style.display = '';
            document.getElementById('timer-display').style.display = '';
        }, 100);
    },

    // ==============================
    //    RANDOM MODE: ROUND MECHANICS
    // ==============================
    saveRoundStartPositions() {
        this.roundStartPositions = this.robots.map(r => ({ id: r.id, row: r.row, col: r.col }));
    },

    startTimer() {
        this.stopTimer();
        this.timerSeconds = 0;
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timerSeconds++;
            this.updateTimerDisplay();
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    updateTimerDisplay() {
        const el = document.getElementById('timer-value');
        if (!el) return;
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        el.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    },

    completeRandomGame() {
        this.stopTimer();
        const mins = Math.floor(this.timerSeconds / 60);
        const secs = this.timerSeconds % 60;
        const timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        this.showToast('Bravo ! Les 16 cibles en ' + timeStr + ' !');
    },

    restart() {
        if (this.mode === 'levels' && this.currentLevel !== null) {
            this.startLevel(this.currentLevel);
        } else if (this.mode === 'random') {
            this.initRandomGame();
        }
    },

    newRandomGame() {
        this.randomSeed = Date.now();
        this.initRandomGame();
    },

    backFromGame() {
        this.selectedRobotId = null;
        this.stopTimer();
        this.showScreen(this.mode === 'levels' ? 'screen-levels' : 'screen-menu');
    },

    // ==============================
    //       TARGET SELECTION
    // ==============================
    pickNewTarget() {
        if (this.targetsData.length === 0) return;
        const solvableTargets = [];
        for (const t of this.targetsData) {
            if (t === this.currentTarget) continue;
            const robot = this.robots.find(r => r.id === t.color);
            if (!robot) continue;
            const reachable = getReachableCells(this.wallsSet, robot.row, robot.col);
            if (reachable.has(t.row * GRID_SIZE + t.col)) {
                solvableTargets.push(t);
            }
        }
        if (solvableTargets.length > 0) {
            this.currentTarget = solvableTargets[Math.floor(Math.random() * solvableTargets.length)];
        } else {
            let newTarget, attempts = 0;
            do {
                newTarget = this.targetsData[Math.floor(Math.random() * this.targetsData.length)];
                attempts++;
            } while (newTarget === this.currentTarget && this.targetsData.length > 1 && attempts < 20);
            this.currentTarget = newTarget;
        }
        this.optimalMoves = -1;
    },

    // ==============================
    //          RENDERING
    // ==============================
    renderBoard() {
        this.boardEl.innerHTML = '';
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row; cell.dataset.col = col;

                if (this.hasWall(row, col, 'top')) cell.classList.add('wall-top');
                if (this.hasWall(row, col, 'bottom')) cell.classList.add('wall-bottom');
                if (this.hasWall(row, col, 'left')) cell.classList.add('wall-left');
                if (this.hasWall(row, col, 'right')) cell.classList.add('wall-right');
                if (CENTER_ROWS.includes(row) && CENTER_COLS.includes(col)) cell.classList.add('center-block');
                const targetHere = this.targetsData.find(t => t.row === row && t.col === col);
                if (targetHere) {
                    const targetDiv = document.createElement('div');
                    targetDiv.classList.add('target', targetHere.color);
                    targetDiv.innerHTML = `<div class="target-inner"><img class="target-symbol-img" src="${SYMBOL_IMAGES[targetHere.symbol] || ''}" alt="${targetHere.symbol}"></div>`;
                    if (this.currentTarget === targetHere) targetDiv.classList.add('active');
                    cell.appendChild(targetDiv);
                }
                this.boardEl.appendChild(cell);
            }
        }

        // ── Center logo overlay ──
        // Remove any existing center logo
        const existingLogo = this.boardEl.querySelector('.center-logo');
        if (existingLogo) existingLogo.remove();

        const logoDiv = document.createElement('div');
        logoDiv.classList.add('center-logo');
        logoDiv.style.position = 'absolute';
        // Center block spans rows 7-8, cols 7-8 = 2 cells wide and 2 cells tall
        logoDiv.style.left = (7 * CELL_PCT) + '%';
        logoDiv.style.top = (7 * CELL_PCT) + '%';
        logoDiv.style.width = (2 * CELL_PCT) + '%';
        logoDiv.style.height = (2 * CELL_PCT) + '%';

        const logoImg = document.createElement('img');
        logoImg.src = 'images/logo.png';
        logoImg.alt = 'Logo';
        logoImg.style.width = '100%';
        logoImg.style.height = '100%';
        logoImg.style.objectFit = 'contain';
        logoImg.draggable = false;
        logoImg.style.pointerEvents = 'none';
        logoDiv.appendChild(logoImg);

        this.boardEl.appendChild(logoDiv);
    },

    renderRobots() {
        this.robotsLayerEl.innerHTML = '';
        this.robots.forEach(robot => {
            const div = document.createElement('div');
            div.classList.add('robot', robot.id);
            div.dataset.robotId = robot.id;

            // Use idle image by default
            const img = document.createElement('img');
            img.src = ROBOT_IMAGES[robot.id];
            img.classList.add('robot-img');
            img.draggable = false;
            div.appendChild(img);

            // Apply facing-left if direction is left
            if (this.robotDirections[robot.id] === 'left') {
                div.classList.add('facing-left');
            }

            this.positionRobot(div, robot.row, robot.col);
            if (robot.id === this.selectedRobotId) div.classList.add('selected');
            this.robotsLayerEl.appendChild(div);
        });
    },

    positionRobot(div, row, col) {
        const margin = CELL_PCT * 0.10;
        const size = CELL_PCT * 0.80;
        div.style.left = (col * CELL_PCT + margin) + '%';
        div.style.top = (row * CELL_PCT + margin) + '%';
        div.style.width = size + '%';
        div.style.height = size + '%';
    },

    updateRobotPosition(robotId, animate = true) {
        const robot = this.robots.find(r => r.id === robotId);
        const div = this.robotsLayerEl.querySelector('[data-robot-id="' + robotId + '"]');
        if (!robot || !div) return;
        if (!animate) div.style.transition = 'none';
        this.positionRobot(div, robot.row, robot.col);
        if (!animate) { div.offsetHeight; div.style.transition = ''; }
        if (animate) {
            div.classList.add('landing');
            setTimeout(() => div.classList.remove('landing'), 350);
        }
    },

    updateRobotSelection() {
        this.robotsLayerEl.querySelectorAll('.robot').forEach(div => {
            const isSelected = div.dataset.robotId === this.selectedRobotId;
            div.classList.toggle('selected', isSelected);
            const img = div.querySelector('.robot-img');
            if (img) {
                img.src = isSelected ? ROBOT_SELECTED_IMAGES[div.dataset.robotId] : ROBOT_IMAGES[div.dataset.robotId];
            }
        });
    },

    updateUI() {
        this.countEl.textContent = this.moveCount;
        if (this.currentTarget) {
            this.targetColorEl.textContent = this.currentTarget.color === 'black' ? 'Noir' : this.currentTarget.color;
            this.targetColorEl.className = 'color-' + this.currentTarget.color;
            this.targetSymbolEl.textContent = '';
            this.targetSymbolEl.innerHTML = '';
            const symImg = SYMBOL_IMAGES[this.currentTarget.symbol];
            if (symImg) {
                this.targetSymbolEl.innerHTML = `<img src="${symImg}" class="target-chip-img" alt="${this.currentTarget.symbol}">`;
            }
        }
        this.boardEl.querySelectorAll('.target').forEach(t => t.classList.remove('active'));
        if (this.currentTarget) {
            const cells = this.boardEl.querySelectorAll('.cell');
            const idx = this.currentTarget.row * GRID_SIZE + this.currentTarget.col;
            const targetEl = cells[idx] && cells[idx].querySelector('.target');
            if (targetEl) targetEl.classList.add('active');
        }
        if (this.mode === 'random') {
            const scoreEl = document.getElementById('targets-count');
            if (scoreEl) scoreEl.textContent = this.targetsReached;
        }
    },

    hasWall(r, c, side) { return this.wallsSet.has(r + '-' + c + '-' + side); },

    // ==============================
    //       ROBOT MOVEMENT
    // ==============================
    moveRobot(direction) {
        if (this.isAnimating) return false;

        if (!this.selectedRobotId) {
            this.selectedRobotId = this.currentTarget.color;
            this.updateRobotSelection();
        }

        const robot = this.robots.find(r => r.id === this.selectedRobotId);
        if (!robot) return false;

        const dirMap = {
            up:    { dr: -1, dc: 0, wsc: 'top',    wsn: 'bottom' },
            down:  { dr: 1,  dc: 0, wsc: 'bottom', wsn: 'top' },
            left:  { dr: 0,  dc: -1, wsc: 'left',  wsn: 'right' },
            right: { dr: 0,  dc: 1, wsc: 'right',  wsn: 'left' }
        };
        const { dr, dc, wsc, wsn } = dirMap[direction];
        let currentRow = robot.row, currentCol = robot.col;
        const isTargetRobot = this.currentTarget && robot.id === this.currentTarget.color;

        while (true) {
            const nextRow = currentRow + dr, nextCol = currentCol + dc;
            if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) break;
            if (CENTER_ROWS.includes(nextRow) && CENTER_COLS.includes(nextCol)) break;
            if (this.hasWall(currentRow, currentCol, wsc)) break;
            if (this.hasWall(nextRow, nextCol, wsn)) break;
            if (this.robots.some(r => r.id !== robot.id && r.row === nextRow && r.col === nextCol)) break;
            currentRow = nextRow; currentCol = nextCol;
            if (isTargetRobot && currentRow === this.currentTarget.row && currentCol === this.currentTarget.col) break;
        }

        if (currentRow !== robot.row || currentCol !== robot.col) {
            SoundManager.play('deplacementrobot');
            this.moveHistory.push({ robotId: robot.id, fromRow: robot.row, fromCol: robot.col });
            robot.row = currentRow; robot.col = currentCol;
            this.moveCount++;

            // ── Switch to walking image ──
            const div = this.robotsLayerEl.querySelector('[data-robot-id="' + robot.id + '"]');
            if (div) {
                const img = div.querySelector('.robot-img');
                if (img) img.src = ROBOT_WALK_IMAGES[robot.id];

                // Set direction for facing
                if (direction === 'left') {
                    div.classList.add('facing-left');
                    this.robotDirections[robot.id] = 'left';
                } else if (direction === 'right') {
                    div.classList.remove('facing-left');
                    this.robotDirections[robot.id] = 'right';
                }
                // up/down keep the current facing direction
            }

            this.isAnimating = true;
            this.updateRobotPosition(robot.id, true);
            this.updateUI();

            // ── Revert to idle/selected image after movement ──
            setTimeout(() => {
                this.isAnimating = false;

                // Switch back to selected or idle image
                const divAfter = this.robotsLayerEl.querySelector('[data-robot-id="' + robot.id + '"]');
                if (divAfter) {
                    const imgAfter = divAfter.querySelector('.robot-img');
                    if (imgAfter) {
                        imgAfter.src = (this.selectedRobotId === robot.id)
                            ? ROBOT_SELECTED_IMAGES[robot.id]
                            : ROBOT_IMAGES[robot.id];
                    }
                }

                this.checkWin();
            }, 350);
            return true;
        }
        SoundManager.play('erreur');
        return false;
    },

    undo() {
        if (this.moveHistory.length === 0 || this.isAnimating) return;
        SoundManager.play('annuler');
        const last = this.moveHistory.pop();
        const robot = this.robots.find(r => r.id === last.robotId);
        if (!robot) return;
        robot.row = last.fromRow; robot.col = last.fromCol;
        this.moveCount = Math.max(0, this.moveCount - 1);

        // Revert to idle or selected image
        const div = this.robotsLayerEl.querySelector('[data-robot-id="' + last.robotId + '"]');
        if (div) {
            const img = div.querySelector('.robot-img');
            if (img) {
                img.src = (this.selectedRobotId === last.robotId)
                    ? ROBOT_SELECTED_IMAGES[last.robotId]
                    : ROBOT_IMAGES[last.robotId];
            }
        }

        this.updateRobotPosition(last.robotId, true);
        this.updateUI();
    },

    // ==============================
    //        WIN CHECK
    // ==============================
    checkWin() {
        if (!this.currentTarget) return;
        const targetRobot = this.robots.find(r => r.id === this.currentTarget.color);
        if (!targetRobot) return;

        if (targetRobot.row === this.currentTarget.row && targetRobot.col === this.currentTarget.col) {
            SoundManager.play('victoire');
            // Flash effect
            const robotEl = this.robotsLayerEl.querySelector('[data-robot-id="' + targetRobot.id + '"]');
            if (robotEl) {
                robotEl.style.filter = 'brightness(1.5) drop-shadow(0 0 8px #27ae60)';
                robotEl.style.transform = 'scale(1.25)';
                setTimeout(() => { robotEl.style.filter = ''; robotEl.style.transform = ''; }, 500);
            }

            if (this.mode === 'levels') {
                this.completeLevel();
            } else {
                // ── Random mode: return other robots to start positions ──
                this.targetsReached++;

                // The target robot stays at its target position
                // All other moved robots return to their round start positions
                if (this.roundStartPositions) {
                    this.robots.forEach(r => {
                        if (r.id !== targetRobot.id) {
                            const startPos = this.roundStartPositions.find(s => s.id === r.id);
                            if (startPos && (r.row !== startPos.row || r.col !== startPos.col)) {
                                r.row = startPos.row;
                                r.col = startPos.col;
                                this.robotDirections[r.id] = undefined;
                            }
                        }
                    });
                }

                if (this.targetsReached >= 16) {
                    this.completeRandomGame();
                } else {
                    this.showToast('Cible atteinte ! (' + this.targetsReached + ' reussie' + (this.targetsReached > 1 ? 's' : '') + ')');
                }

                this.moveCount = 0;
                this.moveHistory = [];
                this.pickNewTarget();

                // Save new round start positions
                this.saveRoundStartPositions();

                this.renderBoard();
                this.renderRobots();
                this.updateUI();
            }
        }
    },

    // ==============================
    //     STAR LOGIC
    // ==============================
    calculateStars(moves) {
        if (moves < 10) return 3;
        if (moves <= 15) return 2;
        if (moves <= 20) return 1;
        return 0;
    },

    completeLevel() {
        const stars = this.calculateStars(this.moveCount);
        const prevStars = this.levelStars[this.currentLevel] || 0;
        const prevMoves = this.levelMoves[this.currentLevel];
        if (stars > prevStars) this.levelStars[this.currentLevel] = stars;
        // Save best (lowest) move count
        if (prevMoves === undefined || this.moveCount < prevMoves) {
            this.levelMoves[this.currentLevel] = this.moveCount;
        }
        if (this.currentLevel + 1 >= this.unlockedLevels && this.currentLevel + 1 < LEVELS.length) {
            this.unlockedLevels = this.currentLevel + 2;
        }
        this.saveProgress();
        setTimeout(() => this.showCompleteScreen(stars, this.moveCount), 400);
    },

    showCompleteScreen(stars, moves) {
        const starsDisplay = document.getElementById('stars-display');
        starsDisplay.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.classList.add('star');
            if (i < stars) span.classList.add('earned');
            span.innerHTML = '&#9733;';
            starsDisplay.appendChild(span);
        }
        document.getElementById('complete-moves').textContent = 'Realise en ' + moves + ' coup' + (moves > 1 ? 's' : '');
        let starInfo = '';
        if (stars === 3) starInfo = 'Parfait ! Moins de 10 coups !';
        else if (stars === 2) starInfo = 'Bien joue ! Essayez moins de 10 coups pour 3 etoiles';
        else if (stars === 1) starInfo = 'Passe ! Essayez moins de 15 coups pour 2 etoiles';
        else starInfo = 'Niveau debloque ! Essayez moins de 20 coups pour 1 etoile';
        document.getElementById('complete-par').textContent = starInfo;
        const btnNext = document.getElementById('btn-next-level');
        btnNext.style.display = this.currentLevel >= LEVELS.length - 1 ? 'none' : '';
        this.showScreen('screen-complete');
    },

    nextLevel() {
        if (this.currentLevel !== null && this.currentLevel < LEVELS.length - 1) {
            this.startLevel(this.currentLevel + 1);
        }
    },

    showToast(message) {
        this.toastEl.textContent = message;
        this.toastEl.classList.add('show');
        setTimeout(() => this.toastEl.classList.remove('show'), 2000);
    },

    // ==============================
    //       INPUT HANDLING
    // ==============================
    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (this.currentScreen !== 'screen-game') return;
            const keyMap = {
                ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
                z: 'up', s: 'down', q: 'left', d: 'right', w: 'up', a: 'left'
            };
            if (keyMap[e.key]) { e.preventDefault(); this.moveRobot(keyMap[e.key]); }
            if (e.key === 'Escape') { this.selectedRobotId = null; this.updateRobotSelection(); }
            if (e.key === 'u' || e.key === 'U') this.undo();
            if (e.key === 'Tab') {
                e.preventDefault();
                const idx = this.ROBOT_IDS.indexOf(this.selectedRobotId);
                this.selectedRobotId = this.ROBOT_IDS[(idx + 1) % this.ROBOT_IDS.length];
                this.updateRobotSelection();
            }
        });

        this.robotsLayerEl.addEventListener('mousedown', (e) => {
            const robotEl = e.target.closest('.robot');
            if (robotEl) {
                e.preventDefault();
                this.selectedRobotId = robotEl.dataset.robotId;
                this.updateRobotSelection();
                this.dragState = { active: true, robotId: robotEl.dataset.robotId, startX: e.clientX, startY: e.clientY, lastDirection: null };
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.dragState || !this.dragState.active) return;
            const dx = e.clientX - this.dragState.startX, dy = e.clientY - this.dragState.startY;
            const threshold = 20;
            let dir = null;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) dir = dx > 0 ? 'right' : 'left';
            else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) dir = dy > 0 ? 'down' : 'up';
            if (dir && !this.isOpposite(dir, this.dragState.lastDirection)) {
                this.selectedRobotId = this.dragState.robotId;
                this.updateRobotSelection();
                if (this.moveRobot(dir)) { this.dragState.startX = e.clientX; this.dragState.startY = e.clientY; this.dragState.lastDirection = dir; }
            }
        });
        window.addEventListener('mouseup', () => { this.dragState = null; });

        this.robotsLayerEl.addEventListener('touchstart', (e) => {
            const robotEl = e.target.closest('.robot');
            if (robotEl) {
                e.preventDefault();
                this.selectedRobotId = robotEl.dataset.robotId;
                this.updateRobotSelection();
                const t = e.touches[0];
                this.dragState = { active: true, robotId: robotEl.dataset.robotId, startX: t.clientX, startY: t.clientY, lastDirection: null };
            }
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (!this.dragState || !this.dragState.active) return;
            e.preventDefault();
            const t = e.touches[0];
            const dx = t.clientX - this.dragState.startX, dy = t.clientY - this.dragState.startY;
            const threshold = 20;
            let dir = null;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) dir = dx > 0 ? 'right' : 'left';
            else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) dir = dy > 0 ? 'down' : 'up';
            if (dir && !this.isOpposite(dir, this.dragState.lastDirection)) {
                this.selectedRobotId = this.dragState.robotId;
                this.updateRobotSelection();
                if (this.moveRobot(dir)) { this.dragState.startX = t.clientX; this.dragState.startY = t.clientY; this.dragState.lastDirection = dir; }
            }
        }, { passive: false });
        window.addEventListener('touchend', () => { this.dragState = null; });

        this.boardEl.addEventListener('click', (e) => {
            if (this.currentScreen !== 'screen-game') return;
            const cell = e.target.closest('.cell');
            if (!cell) return;
            const row = parseInt(cell.dataset.row), col = parseInt(cell.dataset.col);
            const robotHere = this.robots.find(r => r.row === row && r.col === col);
            if (robotHere) {
                this.selectedRobotId = robotHere.id;
            } else {
                let minDist = Infinity, nearest = null;
                this.robots.forEach(r => {
                    const dist = Math.abs(r.row - row) + Math.abs(r.col - col);
                    if (dist < minDist) { minDist = dist; nearest = r; }
                });
                if (nearest) this.selectedRobotId = nearest.id;
            }
            this.updateRobotSelection();
        });
    },

    isOpposite(d1, d2) {
        if (!d1 || !d2) return false;
        return (d1 === 'up' && d2 === 'down') || (d1 === 'down' && d2 === 'up') ||
               (d1 === 'left' && d2 === 'right') || (d1 === 'right' && d2 === 'left');
    },

    dragState: null,

};

document.addEventListener('DOMContentLoaded', () => Game.init());
