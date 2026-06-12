/* ================================================
   RICOCHET ROBOT - V5 Snake Map + Robot Images
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
//     36 LEVELS - Progressive difficulty
// ================================================
const LEVELS = [
    // ACT 1 : Decouverte (1-10)
    { name: "L'Eveil",          seed: 42,    difficulty: 'easy',   par: 3 },
    { name: "Premiers Pas",     seed: 137,   difficulty: 'easy',   par: 3 },
    { name: "Le Carrefour",     seed: 256,   difficulty: 'easy',   par: 4 },
    { name: "Le Couloir",       seed: 314,   difficulty: 'easy',   par: 4 },
    { name: "La Place",         seed: 404,   difficulty: 'easy',   par: 5 },
    { name: "Le Virage",        seed: 500,   difficulty: 'easy',   par: 5 },
    { name: "Le Pont",          seed: 606,   difficulty: 'easy',   par: 5 },
    { name: "Le Rond-Point",    seed: 707,   difficulty: 'easy',   par: 6 },
    { name: "L'Impasse",        seed: 808,   difficulty: 'easy',   par: 6 },
    { name: "La Traverse",      seed: 900,   difficulty: 'easy',   par: 6 },
    // ACT 2 : Aventure (11-22)
    { name: "Le Detour",        seed: 1024,  difficulty: 'medium', par: 6 },
    { name: "L'Etoile",         seed: 1111,  difficulty: 'medium', par: 7 },
    { name: "Le Labyrinthe",    seed: 1234,  difficulty: 'medium', par: 7 },
    { name: "La Spirale",       seed: 1337,  difficulty: 'medium', par: 7 },
    { name: "Le Zigzag",        seed: 1500,  difficulty: 'medium', par: 8 },
    { name: "La Citadelle",     seed: 1666,  difficulty: 'medium', par: 8 },
    { name: "Le Fjord",         seed: 1729,  difficulty: 'medium', par: 8 },
    { name: "L'Archipel",       seed: 1888,  difficulty: 'medium', par: 9 },
    { name: "Le Maquis",        seed: 2000,  difficulty: 'medium', par: 9 },
    { name: "La Faille",        seed: 2144,  difficulty: 'medium', par: 9 },
    { name: "L'Oasis",          seed: 2288,  difficulty: 'medium', par: 9 },
    { name: "Le Crystal",       seed: 2400,  difficulty: 'medium', par: 10 },
    // ACT 3 : Expert (23-36)
    { name: "Le Chaos",         seed: 2345,  difficulty: 'hard',   par: 9 },
    { name: "La Matrice",       seed: 2500,  difficulty: 'hard',   par: 10 },
    { name: "Le Volcan",        seed: 2666,  difficulty: 'hard',   par: 10 },
    { name: "L'Abime",          seed: 2828,  difficulty: 'hard',   par: 10 },
    { name: "Le Tetra",         seed: 3000,  difficulty: 'hard',   par: 11 },
    { name: "La Forge",         seed: 3141,  difficulty: 'hard',   par: 11 },
    { name: "L'Enigme",         seed: 3333,  difficulty: 'hard',   par: 12 },
    { name: "Le Paradoxe",      seed: 3500,  difficulty: 'hard',   par: 12 },
    { name: "Le Miroir",        seed: 3636,  difficulty: 'hard',   par: 12 },
    { name: "La Tempete",       seed: 3750,  difficulty: 'hard',   par: 13 },
    { name: "L'Eclipse",        seed: 3888,  difficulty: 'hard',   par: 13 },
    { name: "L'Horizon",        seed: 4000,  difficulty: 'hard',   par: 14 },
    { name: "Le Cosmos",        seed: 4321,  difficulty: 'hard',   par: 14 },
    { name: "L'Impossible",     seed: 9999,  difficulty: 'hard',   par: 15 },
];

// Robot image paths
const ROBOT_IMAGES = {
    red: 'robot-red.png',
    blue: 'robot-blue.png',
    green: 'robot-green.png',
    yellow: 'robot-yellow.png',
    black: 'robot-black.png'
};

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
    currentScreen: 'screen-menu',
    optimalMoves: -1,

    ROBOT_IDS: ['red', 'blue', 'green', 'yellow', 'black'],

    boardEl: null, robotsLayerEl: null, countEl: null,
    targetColorEl: null, targetSymbolEl: null, toastEl: null, levelTitleEl: null,

    init() {
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
            const saved = localStorage.getItem('ricochet_progress_v5');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedLevels = data.unlockedLevels || 1;
                this.levelStars = data.levelStars || {};
            }
        } catch (e) {}
    },

    saveProgress() {
        try {
            localStorage.setItem('ricochet_progress_v5', JSON.stringify({
                unlockedLevels: this.unlockedLevels,
                levelStars: this.levelStars
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
        this.showScreen('screen-menu');
    },

    // ==============================
    //    SNAKE MAP LEVEL SELECT
    // ==============================
    renderLevelSelect() {
        const container = document.getElementById('snake-map');
        if (!container) return;
        container.innerHTML = '';

        const COLS = 6;
        const totalLevels = LEVELS.length;
        const totalRows = Math.ceil(totalLevels / COLS);

        // Chapter labels per row
        const chapterLabels = {
            0: "Acte 1 : Decouverte",
            2: "Acte 2 : Aventure",
            4: "Acte 3 : Expert"
        };

        for (let row = 0; row < totalRows; row++) {
            // Chapter header if needed
            if (chapterLabels[row]) {
                const ch = document.createElement('div');
                ch.className = 'snake-chapter';
                ch.textContent = chapterLabels[row];
                container.appendChild(ch);
            }

            // Row container
            const rowDiv = document.createElement('div');
            rowDiv.className = 'snake-row';
            // Reverse direction on odd rows for serpentine
            if (row % 2 === 1) rowDiv.classList.add('reverse');

            for (let col = 0; col < COLS; col++) {
                const i = row * COLS + col;
                if (i >= totalLevels) break;

                const level = LEVELS[i];
                const isUnlocked = i < this.unlockedLevels;
                const isCompleted = this.levelStars[i] !== undefined;
                const stars = this.levelStars[i] || 0;

                const node = document.createElement('div');
                node.classList.add('snake-node');
                if (!isUnlocked) node.classList.add('locked');
                if (isCompleted) node.classList.add('completed');
                if (i === this.unlockedLevels - 1) node.classList.add('current');

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
                    node.addEventListener('click', () => this.startLevel(i));
                } else {
                    node.innerHTML = `
                        <div class="node-lock">&#128274;</div>
                        <div class="node-name">???</div>
                    `;
                }

                rowDiv.appendChild(node);
            }

            container.appendChild(rowDiv);
        }
    },

    // ==============================
    //       MAP GENERATION
    // ==============================
    generateBoard(rng, difficulty) {
        const walls = [];
        const targets = [];

        for (let i = 0; i < GRID_SIZE; i++) {
            walls.push({ row: 0, col: i, side: 'top' });
            walls.push({ row: GRID_SIZE - 1, col: i, side: 'bottom' });
            walls.push({ row: i, col: 0, side: 'left' });
            walls.push({ row: i, col: GRID_SIZE - 1, side: 'right' });
        }

        for (const c of CENTER_COLS) {
            walls.push({ row: 6, col: c, side: 'bottom' });
            walls.push({ row: 9, col: c, side: 'top' });
        }
        for (const r of CENTER_ROWS) {
            walls.push({ row: r, col: 6, side: 'right' });
            walls.push({ row: r, col: 9, side: 'left' });
        }

        const densityMap = { easy: 1, medium: 2, hard: 3 };
        const density = densityMap[difficulty] || 2;

        for (let qi = 0; qi < 4; qi++) {
            for (let qj = 0; qj < 4; qj++) {
                const qR = qi * 4, qC = qj * 4;
                if (qi >= 1 && qi <= 2 && qj >= 1 && qj <= 2) {
                    this.placeCenterAdjacentWalls(walls, qi, qj, rng);
                    continue;
                }
                for (let w = 0; w < density; w++) {
                    this.placeWallSegment(walls, qR, qC, qi, qj, rng, difficulty);
                }
            }
        }

        if (difficulty === 'hard') {
            for (let i = 0; i < rng.nextInt(4, 8); i++) this.placeRandomExtraWall(walls, rng);
        } else if (difficulty === 'medium') {
            for (let i = 0; i < rng.nextInt(2, 4); i++) this.placeRandomExtraWall(walls, rng);
        }

        const symbols = ['\u2295', '\u25B3', '\u25A1', '\u25CB'];
        const colors = ['red', 'blue', 'green', 'yellow'];
        let allTargets = [];
        colors.forEach(color => symbols.forEach(symbol => allTargets.push({ color, symbol })));
        allTargets = rng.shuffle(allTargets);

        let targetIndex = 0;
        for (let qi = 0; qi < 4; qi++) {
            for (let qj = 0; qj < 4; qj++) {
                const qR = qi * 4, qC = qj * 4;
                let tR, tC;
                if (qi >= 1 && qi <= 2 && qj >= 1 && qj <= 2) {
                    tR = qi === 1 ? qR + 3 : qR;
                    tC = qj === 1 ? qC + 3 : qC;
                } else {
                    tR = qR + rng.nextInt(1, 2);
                    tC = qC + rng.nextInt(1, 2);
                }
                if (CENTER_ROWS.includes(tR) && CENTER_COLS.includes(tC)) {
                    tR = qR + (qi < 2 ? 0 : 3);
                    tC = qC + (qj < 2 ? 0 : 3);
                }
                targets.push({ row: tR, col: tC, color: allTargets[targetIndex].color, symbol: allTargets[targetIndex].symbol });
                targetIndex++;
            }
        }

        return { walls, targets };
    },

    placeCenterAdjacentWalls(walls, qi, qj, rng) {
        const type = rng.nextInt(0, 3);
        if (type === 0 && qi === 1) {
            const c = qj === 1 ? 5 : 9;
            walls.push({ row: 5, col: c, side: 'bottom' }); walls.push({ row: 5, col: c + 1, side: 'bottom' });
        } else if (type === 1 && qi === 2) {
            const c = qj === 1 ? 5 : 9;
            walls.push({ row: 10, col: c, side: 'top' }); walls.push({ row: 10, col: c + 1, side: 'top' });
        } else if (type === 2 && qj === 1) {
            const r = qi === 1 ? 5 : 9;
            walls.push({ row: r, col: 5, side: 'right' }); walls.push({ row: r + 1, col: 5, side: 'right' });
        } else {
            const r = qi === 1 ? 5 : 9;
            walls.push({ row: r, col: 10, side: 'left' }); walls.push({ row: r + 1, col: 10, side: 'left' });
        }
    },

    placeWallSegment(walls, qR, qC, qi, qj, rng, difficulty) {
        const available = difficulty === 'easy'
            ? ['L', 'line_h', 'line_v', 'single_h', 'single_v']
            : difficulty === 'medium'
                ? ['L', 'line_h', 'line_v', 'single_h', 'single_v', 'T']
                : ['L', 'line_h', 'line_v', 'single_h', 'single_v', 'T', 'double'];
        const type = available[rng.nextInt(0, available.length - 1)];
        switch (type) {
            case 'L': this.placeLShape(walls, qR, qC, qi, qj, rng); break;
            case 'line_h': this.placeHLine(walls, qR, qC, rng); break;
            case 'line_v': this.placeVLine(walls, qR, qC, rng); break;
            case 'single_h': { const r = qR + rng.nextInt(1, 3), c = qC + rng.nextInt(0, 3); walls.push({ row: r, col: c, side: rng.next() > 0.5 ? 'top' : 'bottom' }); break; }
            case 'single_v': { const r = qR + rng.nextInt(0, 3), c = qC + rng.nextInt(1, 3); walls.push({ row: r, col: c, side: rng.next() > 0.5 ? 'left' : 'right' }); break; }
            case 'T': this.placeTShape(walls, qR, qC, rng); break;
            case 'double': this.placeDoubleWall(walls, qR, qC, rng); break;
        }
    },

    placeLShape(walls, qR, qC, qi, qj, rng) {
        const orients = [];
        if (qi > 0 && qj > 0) orients.push(() => { this.addHWall(walls, qR, qC, qC + 2, 'top'); this.addVWall(walls, qC, qR, qR + 2, 'left'); });
        if (qi > 0 && qj < 3) orients.push(() => { this.addHWall(walls, qR, qC + 2, qC + 4, 'top'); this.addVWall(walls, qC + 4, qR, qR + 2, 'right'); });
        if (qi < 3 && qj > 0) orients.push(() => { this.addHWall(walls, qR + 4, qC, qC + 2, 'bottom'); this.addVWall(walls, qC, qR + 2, qR + 4, 'left'); });
        if (qi < 3 && qj < 3) orients.push(() => { this.addHWall(walls, qR + 4, qC + 2, qC + 4, 'bottom'); this.addVWall(walls, qC + 4, qR + 2, qR + 4, 'right'); });
        orients.push(() => { const r = qR + rng.nextInt(1, 2), c = qC + rng.nextInt(1, 2); walls.push({ row: r, col: c, side: rng.next() > 0.5 ? 'bottom' : 'top' }); walls.push({ row: r, col: c, side: rng.next() > 0.5 ? 'right' : 'left' }); });
        if (orients.length === 0) return;
        orients[rng.nextInt(0, orients.length - 1)]();
    },

    placeHLine(walls, qR, qC, rng) {
        const side = rng.next() > 0.5 ? 'top' : 'bottom';
        const row = side === 'top' ? qR : qR + 4;
        const sc = qC + rng.nextInt(0, 2);
        this.addHWall(walls, row, sc, sc + rng.nextInt(2, 3), side);
    },

    placeVLine(walls, qR, qC, rng) {
        const side = rng.next() > 0.5 ? 'left' : 'right';
        const col = side === 'left' ? qC : qC + 4;
        const sr = qR + rng.nextInt(0, 2);
        this.addVWall(walls, col, sr, sr + rng.nextInt(2, 3), side);
    },

    placeTShape(walls, qR, qC, rng) {
        const r = qR + rng.nextInt(1, 2), c = qC + rng.nextInt(1, 2);
        const d = rng.nextInt(0, 3);
        const sides = [['bottom', 'left', 'right'], ['top', 'left', 'right'], ['left', 'top', 'bottom'], ['right', 'top', 'bottom']];
        sides[d].forEach(s => walls.push({ row: r, col: c, side: s }));
    },

    placeDoubleWall(walls, qR, qC, rng) {
        if (rng.next() > 0.5) {
            const r = qR + rng.nextInt(1, 2), c = qC + rng.nextInt(0, 2);
            walls.push({ row: r, col: c, side: 'bottom' }); walls.push({ row: r, col: c + 1, side: 'bottom' });
            walls.push({ row: r + 1, col: c, side: 'top' }); walls.push({ row: r + 1, col: c + 1, side: 'top' });
        } else {
            const r = qR + rng.nextInt(0, 2), c = qC + rng.nextInt(1, 2);
            walls.push({ row: r, col: c, side: 'right' }); walls.push({ row: r + 1, col: c, side: 'right' });
            walls.push({ row: r, col: c + 1, side: 'left' }); walls.push({ row: r + 1, col: c + 1, side: 'left' });
        }
    },

    placeRandomExtraWall(walls, rng) {
        const r = rng.nextInt(2, GRID_SIZE - 3), c = rng.nextInt(2, GRID_SIZE - 3);
        if (CENTER_ROWS.includes(r) && CENTER_COLS.includes(c)) return;
        walls.push({ row: r, col: c, side: ['top', 'bottom', 'left', 'right'][rng.nextInt(0, 3)] });
    },

    addHWall(walls, row, startCol, endCol, side) {
        if (row < 0 || row >= GRID_SIZE) return;
        for (let c = Math.max(0, startCol); c < Math.min(endCol, GRID_SIZE); c++) walls.push({ row, col: c, side });
    },
    addVWall(walls, col, startRow, endRow, side) {
        if (col < 0 || col >= GRID_SIZE) return;
        for (let r = Math.max(0, startRow); r < Math.min(endRow, GRID_SIZE); r++) walls.push({ row: r, col, side });
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
        const rng = new SeededRandom(level.seed);

        const boardData = this.generateBoard(rng, level.difficulty);
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

        if (verifiedTarget) {
            this.currentTarget = verifiedTarget;
        } else {
            this.pickNewTarget();
        }

        this.showScreen('screen-game');
        setTimeout(() => {
            this.levelTitleEl.textContent = 'Niveau ' + (levelIndex + 1) + ' - ' + level.name;
            this.renderBoard(); this.renderRobots(); this.updateUI();
            document.getElementById('btn-new-game').style.display = 'none';
            document.getElementById('score-display').style.display = 'none';
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
        const difficulties = ['easy', 'medium', 'hard'];
        const difficulty = difficulties[rng.nextInt(0, 2)];
        const boardData = this.generateBoard(rng, difficulty);

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

        if (verifiedTarget) {
            this.currentTarget = verifiedTarget;
        } else {
            this.pickNewTarget();
        }

        this.showScreen('screen-game');
        setTimeout(() => {
            this.levelTitleEl.innerHTML = 'Partie Aleatoire <span class="random-badge">' + difficulty.toUpperCase() + '</span>';
            this.renderBoard(); this.renderRobots(); this.updateUI();
            document.getElementById('btn-new-game').style.display = '';
            document.getElementById('score-display').style.display = '';
        }, 100);
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
                    targetDiv.innerHTML = `<div class="target-inner"><span class="target-symbol">${targetHere.symbol}</span></div>`;
                    if (this.currentTarget === targetHere) targetDiv.classList.add('active');
                    cell.appendChild(targetDiv);
                }
                this.boardEl.appendChild(cell);
            }
        }
    },

    renderRobots() {
        this.robotsLayerEl.innerHTML = '';
        this.robots.forEach(robot => {
            const div = document.createElement('div');
            div.classList.add('robot', robot.id);
            div.dataset.robotId = robot.id;
            // Use image instead of gradient
            const img = document.createElement('img');
            img.src = ROBOT_IMAGES[robot.id];
            img.classList.add('robot-img');
            img.draggable = false;
            div.appendChild(img);
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
            setTimeout(() => div.classList.remove('landing'), 250);
        }
    },

    updateRobotSelection() {
        this.robotsLayerEl.querySelectorAll('.robot').forEach(div => {
            div.classList.toggle('selected', div.dataset.robotId === this.selectedRobotId);
        });
    },

    updateUI() {
        this.countEl.textContent = this.moveCount;
        if (this.currentTarget) {
            this.targetColorEl.textContent = this.currentTarget.color === 'black' ? 'Noir' : this.currentTarget.color;
            this.targetColorEl.className = 'color-' + this.currentTarget.color;
            this.targetSymbolEl.textContent = this.currentTarget.symbol;
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
            this.moveHistory.push({ robotId: robot.id, fromRow: robot.row, fromCol: robot.col });
            robot.row = currentRow; robot.col = currentCol;
            this.moveCount++;

            this.isAnimating = true;
            this.updateRobotPosition(robot.id, true);
            this.updateUI();

            setTimeout(() => {
                this.isAnimating = false;
                this.checkWin();
            }, 230);
            return true;
        }
        return false;
    },

    undo() {
        if (this.moveHistory.length === 0 || this.isAnimating) return;
        const last = this.moveHistory.pop();
        const robot = this.robots.find(r => r.id === last.robotId);
        if (!robot) return;
        robot.row = last.fromRow; robot.col = last.fromCol;
        this.moveCount = Math.max(0, this.moveCount - 1);
        this.updateRobotPosition(robot.id, true);
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
                this.targetsReached++;
                this.showToast('Cible atteinte ! (' + this.targetsReached + ' reussie' + (this.targetsReached > 1 ? 's' : '') + ')');
                this.moveCount = 0;
                this.moveHistory = [];
                this.pickNewTarget();
                this.renderBoard();
                this.renderRobots();
                this.updateUI();
            }
        }
    },

    // ==============================
    //     NEW STAR LOGIC
    // < 10 coups = 3 etoiles
    // 10-15 coups = 2 etoiles
    // 15-20 coups = 1 etoile
    // > 20 coups = 0 etoile (mais debloque le suivant)
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
        if (stars > prevStars) this.levelStars[this.currentLevel] = stars;
        // Always unlock next level when completing (even with 0 stars)
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
        // Show star thresholds
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

    dragState: null
};

document.addEventListener('DOMContentLoaded', () => Game.init());
