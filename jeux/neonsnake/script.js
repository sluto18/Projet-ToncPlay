// --- CONFIGURATION ET GLOBALES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');
const hud = document.getElementById('hud');

// UI Elements
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const modeDisplayEl = document.getElementById('mode-display');
const msgEl = document.getElementById('game-over-msg');
const pseudoInput = document.getElementById('player-pseudo');
const powerupContainer = document.getElementById('powerup-container');
const snakeColorsContainer = document.getElementById('snake-colors');
const gridThemesContainer = document.getElementById('grid-themes');

// Constantes Jeu
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE; // 30x30
const MAX_FRUITS = 6; // Nombre de fruits simultanés
const MAX_OBSTACLES = (TILE_COUNT * TILE_COUNT) * 0.6; // 60% de la carte
const COMBO_TIMEOUT = 3000; // 3 secondes pour garder le combo

// --- 1. CONFIGURATION PERSONNALISABLE (Skins & Thèmes) ---
const SKINS = [
    { id: 'neon-green', color: '#00ff88', glow: '#00ff88', name: 'Néon Vert' },
    { id: 'neon-pink', color: '#ff0055', glow: '#ff0055', name: 'Néon Rose' },
    { id: 'neon-blue', color: '#00ccff', glow: '#00ccff', name: 'Cyan' },
    { id: 'neon-gold', color: '#ffd700', glow: '#ffaa00', name: 'Or' },
    { id: 'neon-purple', color: '#bf00ff', glow: '#bf00ff', name: 'Violet' },
    { id: 'white', color: '#ffffff', glow: '#ffffff', name: 'Blanc Pur' }
];

const THEMES = [
    { id: 'dark', color1: '#16213e', color2: '#1a2644', name: 'Nuit' }, 
    { id: 'cyber', color1: '#0f0f1a', color2: '#141424', name: 'Cyber' }, 
    { id: 'matrix', color1: '#001a00', color2: '#002600', name: 'Matrix' },
    { id: 'lava', color1: '#2b0a0a', color2: '#3d0e0e', name: 'Lave' },
    { id: 'ice', color1: '#0a1a2b', color2: '#0e243d', name: 'Glace' }
];

let userConfig = {
    skin: SKINS[0],
    theme: THEMES[0]
};

// --- ETAT DU JEU ---
let gameLoop;
let score = 0;
let snake = [];
let velocity = { x: 0, y: 0 };
let speed = 100;
let currentMode = 'classic';
let isGameRunning = false;
let isPaused = false;

// Variables Combo
let combo = {
    count: 1,
    lastTime: 0,
    active: false,
    textScale: 1
};

// Entités
let items = []; // Contient fruits et powerups
let obstacles = [];
let particles = [];
let floatingTexts = []; // Pour afficher "COMBO x3" ou "+50"

// Power-ups Actifs
let activeEffects = {
    magnet: 0,   // Timestamp fin
    shield: false,
    slow: 0      // Timestamp fin
};
let originalSpeed = 100;

// Fruits
const FRUIT_TYPES = [
    { type: 'apple', color: '#ff0055', score: 10, chance: 0.7, symbol: '🍎' },
    { type: 'grape', color: '#bf00ff', score: 30, chance: 0.2, symbol: '🍇' },
    { type: 'pineapple', color: '#ffee00', score: 50, chance: 0.1, symbol: '🍍' }
];

// Power-up Types
const POWERUPS = [
    { type: 'slow', color: '#00ccff', icon: '⏱', duration: 5000, label: 'Slow Mo' },
    { type: 'magnet', color: '#ffaa00', icon: '🧲', duration: 8000, label: 'Aimant' },
    { type: 'shield', color: '#ffffff', icon: '🛡', duration: 0, label: 'Bouclier' },
    { type: 'cut', color: '#ff0000', icon: '✂️', duration: 0, label: 'Coupe' }
];

// --- 2. INITIALISATION SYSTEME ---

function initSystem() {
    loadScores();
    loadCustomization();
    buildCustomizationUI();
    updateLeaderboardUI();
}

function loadCustomization() {
    const stored = localStorage.getItem('neonSnakeConfig');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            userConfig.skin = SKINS.find(s => s.id === parsed.skinId) || SKINS[0];
            userConfig.theme = THEMES.find(t => t.id === parsed.themeId) || THEMES[0];
        } catch (e) {
            console.error("Erreur chargement config", e);
        }
    }
}

function saveCustomization() {
    localStorage.setItem('neonSnakeConfig', JSON.stringify({
        skinId: userConfig.skin.id,
        themeId: userConfig.theme.id
    }));
    showScreen('home-screen');
}

function buildCustomizationUI() {
    snakeColorsContainer.innerHTML = '';
    SKINS.forEach(skin => {
        const div = document.createElement('div');
        div.className = `color-option ${userConfig.skin.id === skin.id ? 'selected' : ''}`;
        div.style.backgroundColor = skin.color;
        div.style.boxShadow = `0 0 10px ${skin.glow}`;
        div.title = skin.name;
        div.onclick = () => {
            userConfig.skin = skin;
            buildCustomizationUI(); 
            drawPreview();
        };
        snakeColorsContainer.appendChild(div);
    });

    gridThemesContainer.innerHTML = '';
    THEMES.forEach(theme => {
        const div = document.createElement('div');
        div.className = `theme-option ${userConfig.theme.id === theme.id ? 'selected' : ''}`;
        div.style.background = `linear-gradient(45deg, ${theme.color1}, ${theme.color2})`;
        div.innerText = theme.name;
        div.onclick = () => {
            userConfig.theme = theme;
            buildCustomizationUI();
            drawPreview(); 
        };
        gridThemesContainer.appendChild(div);
    });
}

function drawPreview() {
    ctx.fillStyle = userConfig.theme.color1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    
    const previewSnake = [{x:14, y:15}, {x:15, y:15}, {x:16, y:15}];
    previewSnake.forEach((segment, index) => {
        ctx.shadowColor = userConfig.skin.glow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = index === 0 ? '#fff' : userConfig.skin.color;
        drawRoundedRect(segment.x, segment.y, 5, ctx.fillStyle);
    });
}

// --- 3. LOGIQUE JEU ---

function startGame(mode) {
    currentMode = mode;
    showScreen('none');
    resetGame();
    
    let modeName = 'Classique';
    if(mode === 'speed') modeName = 'Vitesse Max';
    if(mode === 'challenge') modeName = 'Challenge';
    modeDisplayEl.textContent = `Mode: ${modeName}`;
    
    isGameRunning = true;
    isPaused = false;
    requestAnimationFrame(gameCycle);
}

function resetGame() {
    snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    velocity = { x: 0, y: -1 };
    score = 0;
    scoreEl.innerText = score;
    items = [];
    obstacles = [];
    particles = [];
    floatingTexts = [];
    
    activeEffects = { magnet: 0, shield: false, slow: 0 };
    combo = { count: 1, lastTime: 0, active: false, textScale: 1 };
    
    updatePowerupHUD();

    // Vitesse de départ
    if (currentMode === 'speed') originalSpeed = 120;
    else if (currentMode === 'classic') originalSpeed = 160; // Ralenti (plus le chiffre est haut, plus c'est lent)
    else originalSpeed = 100;
    speed = originalSpeed;

    // Remplissage initial
    for(let i=0; i<MAX_FRUITS; i++) spawnItem('food');
}

function togglePause() {
    if (!isGameRunning) return;
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pause-screen').classList.add('active');
        hud.style.opacity = '0.5';
    } else {
        document.getElementById('pause-screen').classList.remove('active');
        hud.style.opacity = '1';
        requestAnimationFrame(gameCycle);
    }
}

function quitGame() {
    isPaused = false;
    isGameRunning = false;
    showScreen('home-screen');
}

// Boucle principale
let lastTime = 0;
function gameCycle(currentTime) {
    if (!isGameRunning || isPaused) return;

    window.requestAnimationFrame(gameCycle);

    const secondsSinceLastRender = (currentTime - lastTime) / 1000;
    let currentSpeed = speed;
    
    // Effet Ralenti
    if (Date.now() < activeEffects.slow) {
        currentSpeed = speed * 2; 
    }

    if (secondsSinceLastRender < currentSpeed / 1000) return;
    
    lastTime = currentTime;
    update();
    draw();
    updatePowerupHUD(); 
}

function update() {
    // 1. Gestion du Combo (Perte si trop lent)
    if (combo.count > 1 && Date.now() - combo.lastTime > COMBO_TIMEOUT) {
        combo.count = 1;
        createFloatingText("Combo Perdu...", snake[0].x, snake[0].y, '#aaa');
    }

    // 2. Calcul position tête future
    let head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // 3. Gestion Collisions et Bouclier
    if (checkCollision(head)) {
        if (activeEffects.shield) {
            // Effet visuel
            createParticles(head.x, head.y, '#ffffff');
            createFloatingText("BOUCLIER !", head.x, head.y, '#fff');
            
            // Si c'est un mur ou obstacle, on essaie de tourner
            if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT || isObstacle(head)) {
                 if(tryAutoTurn()) {
                     // Recalculer la tête avec la nouvelle direction
                     head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
                     activeEffects.shield = false; // Consommer le bouclier
                 } else {
                     gameOver("Coincé !");
                     return;
                 }
            } else {
                // C'est une collision avec la queue (self) : on ignore simplement et on consomme
                activeEffects.shield = false;
                // On laisse le serpent avancer (il va techniquement traverser sa queue sur une frame)
            }
        } else {
            let reason = "Ouch !";
            if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) reason = "Le mur a gagné !";
            else if (obstacles.some(o => o.x === head.x && o.y === head.y)) reason = "Attention aux murs gris !";
            else reason = "Tu t'es mordu la queue !";
            
            gameOver(reason);
            return;
        }
    }

    snake.unshift(head);

    // 4. Interaction Items (Aimant & Manger)
    let ateIndex = -1;
    
    // Aimant
    if (Date.now() < activeEffects.magnet) {
        items.forEach(item => {
            const dist = Math.abs(item.x - head.x) + Math.abs(item.y - head.y);
            if (dist < 6 && dist > 0) {
                if (item.x < head.x) item.x++;
                else if (item.x > head.x) item.x--;
                else if (item.y < head.y) item.y++;
                else if (item.y > head.y) item.y--;
            }
        });
    }

    items.forEach((item, index) => {
        if (head.x === item.x && head.y === item.y) {
            ateIndex = index;
            handleItemCollection(item);
        }
    });

    if (ateIndex !== -1) {
        items.splice(ateIndex, 1);
        
        // Spawn Powerup (Chance dans tous les modes)
        if (Math.random() < 0.08) { // 8% de chance
            spawnItem('powerup');
        }
    } else {
        snake.pop();
    }
    
    // Maintenir le nombre de fruits
    maintainItems();

    handleModeRules();
}

// Nouvelle fonction pour le bouclier : Tente de tourner à 90 degrés
function tryAutoTurn() {
    const currentHead = snake[0];
    const leftTurn = { x: velocity.y, y: -velocity.x }; // Tourner à gauche (math vectoriel)
    const rightTurn = { x: -velocity.y, y: velocity.x }; // Tourner à droite

    // Test Gauche
    let testPos = { x: currentHead.x + leftTurn.x, y: currentHead.y + leftTurn.y };
    if (!checkCollisionSimple(testPos)) {
        velocity = leftTurn;
        return true;
    }

    // Test Droite
    testPos = { x: currentHead.x + rightTurn.x, y: currentHead.y + rightTurn.y };
    if (!checkCollisionSimple(testPos)) {
        velocity = rightTurn;
        return true;
    }
    
    return false; // Impossible de tourner
}

// Vérification collision sans effet de bord (pour l'IA du bouclier)
function checkCollisionSimple(pos) {
    if (pos.x < 0 || pos.x >= TILE_COUNT || pos.y < 0 || pos.y >= TILE_COUNT) return true;
    for (let s of snake) { if (pos.x === s.x && pos.y === s.y) return true; }
    if (currentMode === 'challenge') {
        for (let o of obstacles) { if (pos.x === o.x && pos.y === o.y) return true; }
    }
    return false;
}

function isObstacle(pos) {
    if (currentMode !== 'challenge') return false;
    return obstacles.some(o => o.x === pos.x && o.y === pos.y);
}

function maintainItems() {
    const foodCount = items.filter(i => i.category === 'food').length;
    if (foodCount < MAX_FRUITS) {
        spawnItem('food');
    }
}

function handleModeRules() {
    if (currentMode === 'speed') {
        speed = Math.max(30, speed * 0.995);
    }
    // Challenge : Spawn murs plus régulier
    if (currentMode === 'challenge') {
        // Stop spawn si 60% occupé
        if (obstacles.length < MAX_OBSTACLES) {
             // Utilisation du score ou d'un timer random pour densifier
             if (Math.random() < 0.02) { // Petite chance chaque frame ou utiliser score
                // On garde la logique score aussi dans handleItemCollection
             }
        }
    }
}

function handleItemCollection(item) {
    if (item.category === 'food') {
        // --- LOGIQUE COMBO ---
        const now = Date.now();
        if (now - combo.lastTime < COMBO_TIMEOUT) {
            combo.count++;
            createFloatingText(`COMBO x${combo.count}!`, snake[0].x, snake[0].y, '#ffee00');
        } else {
            combo.count = 1;
        }
        combo.lastTime = now;
        
        // Calcul Score avec multiplicateur
        const points = item.score * combo.count;
        score += points;
        scoreEl.innerText = score;
        
        createParticles(item.x, item.y, item.color);
        
        // Règles Modes
        if (currentMode === 'speed') {
            speed = Math.max(30, speed * 0.95);
        }
        else if (currentMode === 'classic') {
            speed = Math.max(50, speed - 0.5);
        }
        else if (currentMode === 'challenge') {
            // Spawn obstacle tous les 100 points bruts (sans combo) pour régularité
            // ou juste basé sur la prise de pomme
            if (obstacles.length < MAX_OBSTACLES) {
                addObstacle();
                // Spawn plus agressif : parfois 2 murs
                if(Math.random() > 0.5) addObstacle();
            }
        }
    } 
    else if (item.category === 'powerup') {
        createParticles(item.x, item.y, '#fff');
        createFloatingText(item.data.label, item.x, item.y, '#fff');
        activatePowerUp(item.data);
    }
}

function activatePowerUp(pData) {
    if (pData.type === 'slow') activeEffects.slow = Date.now() + pData.duration;
    if (pData.type === 'magnet') activeEffects.magnet = Date.now() + pData.duration;
    if (pData.type === 'shield') activeEffects.shield = true;
    if (pData.type === 'cut') {
        if (snake.length > 5) {
            snake = snake.slice(0, snake.length - 3); 
        }
    }
}

function spawnItem(category) {
    let valid = false;
    let item = {};
    let attempts = 0;
    
    while (!valid && attempts < 100) {
        attempts++;
        item.x = Math.floor(Math.random() * TILE_COUNT);
        item.y = Math.floor(Math.random() * TILE_COUNT);
        
        valid = !snake.some(s => s.x === item.x && s.y === item.y) &&
                !obstacles.some(o => o.x === item.x && o.y === item.y) &&
                !items.some(i => i.x === item.x && i.y === item.y);
    }

    if (!valid) return; // Carte pleine

    if (category === 'food') {
        const rand = Math.random();
        let type = FRUIT_TYPES[0];
        if (rand > 0.9) type = FRUIT_TYPES[2]; 
        else if (rand > 0.7) type = FRUIT_TYPES[1]; 
        
        item.category = 'food';
        item.color = type.color;
        item.score = type.score;
        item.symbol = type.symbol;
    } else {
        const pType = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
        item.category = 'powerup';
        item.color = pType.color;
        item.symbol = pType.icon;
        item.data = pType;
    }
    
    items.push(item);
}

function addObstacle() {
    let valid = false;
    let obs = {};
    let attempts = 0;
    while (!valid && attempts < 50) {
        attempts++;
        obs.x = Math.floor(Math.random() * TILE_COUNT);
        obs.y = Math.floor(Math.random() * TILE_COUNT);
        const distHead = Math.abs(obs.x - snake[0].x) + Math.abs(obs.y - snake[0].y);
        
        // On évite de spawn juste devant le serpent
        valid = distHead > 5 && 
                !snake.some(s => s.x === obs.x && s.y === obs.y) &&
                !items.some(i => i.x === obs.x && i.y === obs.y) &&
                !obstacles.some(o => o.x === obs.x && o.y === obs.y);
    }
    if (valid) obstacles.push(obs);
}

function checkCollision(pos) {
    if (pos.x < 0 || pos.x >= TILE_COUNT || pos.y < 0 || pos.y >= TILE_COUNT) return true;
    for (let s of snake) { if (pos.x === s.x && pos.y === s.y) return true; }
    if (currentMode === 'challenge') {
        for (let o of obstacles) { if (pos.x === o.x && pos.y === o.y) return true; }
    }
    return false;
}

// --- RENDU ---

function draw() {
    // 1. Fond & Grille
    ctx.fillStyle = userConfig.theme.color1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // 2. Obstacles
    ctx.fillStyle = '#535c68';
    ctx.shadowBlur = 0;
    obstacles.forEach(obs => drawRoundedRect(obs.x, obs.y, 4, '#535c68'));

    // 3. Items
    items.forEach(item => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = item.color;
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = '#fff'; // Couleur du texte
        ctx.fillText(item.symbol, item.x * GRID_SIZE + GRID_SIZE/2, item.y * GRID_SIZE + GRID_SIZE/2 + 2);
    });

    // 4. Serpent
    snake.forEach((segment, index) => {
        ctx.shadowColor = userConfig.skin.glow;
        ctx.shadowBlur = index === 0 ? 20 : 10;
        ctx.fillStyle = index === 0 ? '#fff' : userConfig.skin.color;
        
        if (index === 0 && activeEffects.shield) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(segment.x * GRID_SIZE + 10, segment.y * GRID_SIZE + 10, 12, 0, Math.PI*2);
            ctx.stroke();
        }

        drawRoundedRect(segment.x, segment.y, 5, ctx.fillStyle);
    });

    updateAndDrawParticles();
    updateAndDrawFloatingText();
}

function drawGrid() {
    ctx.fillStyle = userConfig.theme.color2;
    ctx.shadowBlur = 0;
    for (let x = 0; x < TILE_COUNT; x++) {
        for (let y = 0; y < TILE_COUNT; y++) {
            if ((x + y) % 2 === 0) {
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
        }
    }
}

function drawRoundedRect(x, y, r, color) {
    const px = x * GRID_SIZE;
    const py = y * GRID_SIZE;
    const s = GRID_SIZE - 2; 
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, s, s, r);
    ctx.fill();
}

function updatePowerupHUD() {
    let html = '';
    const now = Date.now();
    
    if (now < activeEffects.slow) {
        const pct = ((activeEffects.slow - now) / 5000) * 100;
        html += createBarHTML('⏱', pct, '#00ccff');
    }
    if (now < activeEffects.magnet) {
        const pct = ((activeEffects.magnet - now) / 8000) * 100;
        html += createBarHTML('🧲', pct, '#ffaa00');
    }
    if (activeEffects.shield) {
        html += `<div class="powerup-bar-wrap"><span>🛡 ACTIF</span></div>`;
    }
    // Affichage Combo
    if (combo.count > 1) {
         html += `<div class="powerup-bar-wrap" style="border: 1px solid #ffee00; color:#ffee00;">
            <span>🔥 x${combo.count}</span>
         </div>`;
    }
    
    powerupContainer.innerHTML = html;
}

function createBarHTML(icon, pct, color) {
    return `
    <div class="powerup-bar-wrap">
        <span>${icon}</span>
        <div class="powerup-bar-bg">
            <div class="powerup-bar-fill" style="width:${pct}%; background:${color}"></div>
        </div>
    </div>`;
}

// Système de particules
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x * GRID_SIZE + 10,
            y: y * GRID_SIZE + 10,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: color
        });
    }
}

function createFloatingText(text, x, y, color) {
    floatingTexts.push({
        text: text,
        x: x * GRID_SIZE,
        y: y * GRID_SIZE,
        life: 1.0,
        color: color
    });
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
        else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

function updateAndDrawFloatingText() {
    ctx.shadowBlur = 0;
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y -= 1; // Monte vers le haut
        ft.life -= 0.02;
        
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
        } else {
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = "bold 16px Arial";
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.globalAlpha = 1.0;
        }
    }
}

// --- GESTION FIN ---

function gameOver(reason) {
    isGameRunning = false;
    finalScoreEl.innerText = score;
    container.classList.add('shake');
    
    msgEl.innerText = reason; 
    
    pseudoInput.value = '';
    setTimeout(() => { showScreen('game-over'); pseudoInput.focus(); }, 500);
}

// --- STORAGE & NAVIGATION ---

const defaultScores = { 
    classic: [
        { pseudo: "Chuck Norris", score: 99999 },
        { pseudo: "Poupoune", score: 7850 },
        { pseudo: "Inconnu3310", score: 200 }
    ], 
    speed: [
        { pseudo: "Chuck Norris", score: 99999 },
        { pseudo: "Poupoune", score: 7850 },
        { pseudo: "Inconnu3310", score: 200 }
    ], 
    challenge: [
        { pseudo: "Chuck Norris", score: 99999 },
        { pseudo: "Poupoune", score: 7850 },
        { pseudo: "Inconnu3310", score: 200 }
    ] 
};

function loadScores() {
    const stored = localStorage.getItem('neonSnakeScores');
    // Si pas de scores en mémoire, on enregistre les scores par défaut
    if (!stored) {
        localStorage.setItem('neonSnakeScores', JSON.stringify(defaultScores));
    }
}

function getScores() {
    const stored = localStorage.getItem('neonSnakeScores');
    return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(defaultScores));
}

function updateLeaderboardUI() {
    const scores = getScores();
    ['classic', 'speed', 'challenge'].forEach(mode => {
        const listEl = document.getElementById(`list-${mode}`);
        listEl.innerHTML = '';
        const top5 = scores[mode].sort((a, b) => b.score - a.score).slice(0, 5);
        if (top5.length === 0) listEl.innerHTML = '<li style="justify-content:center; opacity:0.5;">Aucun score</li>';
        else top5.forEach((entry, i) => {
            listEl.innerHTML += `<li><span>${i+1}. ${entry.pseudo}</span><div><span class="score">${entry.score}</span></div></li>`;
        });
    });
}

function resetAllScores() {
    if(confirm("Tout effacer ?")) { localStorage.removeItem('neonSnakeScores'); updateLeaderboardUI(); }
}

function showScreen(screenId) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    if (screenId === 'none') { hud.style.display = 'flex'; }
    else {
        hud.style.display = 'none';
        document.getElementById(screenId).classList.add('active');
        container.classList.remove('shake');
        if (screenId === 'home-screen') updateLeaderboardUI();
    }
}

function saveAndExit() {
    const pseudo = pseudoInput.value.trim() || "Anonyme";
    const scores = getScores();
    scores[currentMode].push({ pseudo, score, date: new Date().toLocaleDateString() });
    localStorage.setItem('neonSnakeScores', JSON.stringify(scores));
    showScreen('home-screen');
}

// --- INPUTS (ZQSD + Flèches) ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('game-over').classList.contains('active')) { saveAndExit(); return; }
    if (e.code === 'Space') { togglePause(); return; }
    
    // Empêcher scroll
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", "Space"].includes(e.code)) e.preventDefault();

    if (!isGameRunning || isPaused) return;

    const key = e.key.toLowerCase();
    
    if ((key === 'arrowup' || key === 'z' || key === 'w') && velocity.y === 0) velocity = { x: 0, y: -1 };
    else if ((key === 'arrowdown' || key === 's') && velocity.y === 0) velocity = { x: 0, y: 1 };
    else if ((key === 'arrowleft' || key === 'q' || key === 'a') && velocity.x === 0) velocity = { x: -1, y: 0 };
    else if ((key === 'arrowright' || key === 'd') && velocity.x === 0) velocity = { x: 1, y: 0 };
});

// Lancer
initSystem();