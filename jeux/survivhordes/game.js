/* =========================================
   SETUP & CONSTANTS
   ========================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// --- DOM Elements ---
const loadingScreen = document.getElementById('loading-screen');
const startMenu = document.getElementById('start-menu');
const startChoicesDiv = document.getElementById('start-choices');
const levelupMenu = document.getElementById('levelup-menu');
const levelupChoicesDiv = document.getElementById('levelup-choices');
const gameoverMenu = document.getElementById('gameover-menu');
const hud = document.getElementById('hud');
const hpBar = document.getElementById('hp-bar');
const hpText = document.getElementById('hp-text');
const xpBar = document.getElementById('xp-bar');
const lvlText = document.getElementById('lvl-text');
const timerDiv = document.getElementById('game-timer');
const killCountDiv = document.getElementById('kill-count');
const spellDock = document.getElementById('spell-dock');
const homeMenu = document.getElementById('home-menu');
const optionsMenu = document.getElementById('options-menu');
const shopMenu = document.getElementById('shop-menu');
const btnPlay = document.getElementById('btn-play');
const btnOptions = document.getElementById('btn-options');
const btnShop = document.getElementById('btn-shop');
const btnOptionsBack = document.getElementById('btn-options-back');
const btnShopBack = document.getElementById('btn-shop-back');
const btnBackToHome = document.getElementById('btn-back-to-home');
const btnOptionsIngame = document.getElementById('btn-options-ingame');
const pauseMenu = document.getElementById('pause-menu');
const btnResumeGame = document.getElementById('btn-resume-game');
const btnQuitGame = document.getElementById('btn-quit-game');
const soulMenu = document.getElementById('soul-menu');
const btnSoul = document.getElementById('btn-soul');
const btnSoulBack = document.getElementById('btn-soul-back');
const historyContainer = document.getElementById('history-container');
const totalGamesEl = document.getElementById('total-games');
const totalZombiesEl = document.getElementById('total-zombies');
const totalBossEl = document.getElementById('total-boss');
const changelogMenu = document.getElementById('changelog-menu');
const btnChangelog = document.getElementById('btn-changelog');
const btnChangelogBack = document.getElementById('btn-changelog-back');

// --- Game State ---
let gameState = 'LOADING'; 
let lastTime = 0;
let startTime = 0;
let killCount = 0;
let playerDamageAccumulator = 0; 
let lastDamageUpdateTime = 0;
let elapsedSec = 0;
let pauseStartTime = 0; 
let totalPausedTime = 0;
let gcemSpawnTimer = 0; 
let levelUpFlashTimer = 0;
let bossKillCount = 0;

// --- Entities ---
let player;
let enemies = [];
let projectiles = [];
let aoes = [];
let particles = [];     
let damageNumbers = []; 
let mines = []; 
let hermitBooks = [];
let bichons = [];
let ruines = [];
let bloodStains = [];
let potions = [];
let magnets = [];
let pieces = []; 
let totalCoins = 0; 
let gcems = [];
let tondeuses = [];

// --- Events Logic (Bosses) ---
let specialEventsDone = {
    4:false, 5:false, 8:false, 10:false, 
    12:false, 15:false, 16:false, 18:false, 
    20:false, 22:false, 25:false, 27:false
};

// --- Assets ---
const images = {};
const imageSources = {
    // --- SPRITES SHEETS (NEW) ---
    player: 'images/player.png',
    zombie1: 'images/zombie1.png',
    zombie2: 'images/zombie2.png',
    zombie3: 'images/zombie3.png',
    zombie4: 'images/zombie4.png',
    zombie5: 'images/zombie5.png',
    boss1: 'images/boss1.png',
    boss2: 'images/boss2.png',
    
    // --- OTHER ASSETS ---
    pao: 'images/pao.gif',
    bao: 'images/bao.gif',
    baoe: 'images/baoe.gif',
    livre: 'images/livre.gif',
    pile: 'images/pile.gif',
    arma: 'images/arma.gif',
    slp: 'images/slp.gif',
    ballepao: 'images/ballepao.gif',
    bouton: 'images/bouton.gif',
    coupecoupe: 'images/coupecoupe.gif',
    bouclier: 'images/bouclier.gif',
    sang: 'images/sang.png',
    ruine1: 'images/ruine.gif',
    ruine2: 'images/ruine2.gif',
    ruine3: 'images/ruine3.png',
    bichon: 'images/bichon.gif',
    cle: 'images/cle.gif',
    potion: 'images/potion.gif',
    piece: 'images/piece.png',
    gcem: 'images/gcem.gif',
    magne: 'images/magne.gif',
    knife: 'images/knife.gif',
    tondeuse: 'images/tondeuse.gif'
};

// Configuration des animations (Frames et vitesse)
const spriteConfig = {
    player: { frames: 6, speed: 100 },
    zombie1: { frames: 7, speed: 300 },
    zombie2: { frames: 16, speed: 150 },
    zombie3: { frames: 16, speed: 150 },
    zombie4: { frames: 16, speed: 300 },
    zombie5: { frames: 10, speed: 200 },
    boss1: { frames: 16, speed: 150 },
    boss2: { frames: 16, speed: 150 }
};

// --- Spells Config ---
const activeSpells = ['lancePile','bombeEau','coupeCoupe'];
const passiveSpells = ['livreErmite','bombeEauExplosif','pistoletEau','armageddon','bouclier','bichonMalt3Pattes','bricolKit', 'couteauADents', 'tondeuse'];

const spellData = {
    lancePile: { name: "Super Lance Pile", desc: "Tire un projectile droit devant.", img: 'slp' },
    bombeEau: { name: "Bombe à Eau", desc: "Explosion de zone au curseur.", img: 'bao' },
    coupeCoupe: { name: "Coupe-Coupe", desc: "Tranche devant vous.", img: 'coupecoupe' },
    livreErmite: { name: "Livre Ermite", desc: "Bouclier rotatif offensif.", img: 'livre' },
    bombeEauExplosif: { name: "Mine d'Eau", desc: "Pose des mines explosives.", img: 'baoe' },
    pistoletEau: { name: "Pistolet à Eau", desc: "Tir automatique ciblé.", img: 'pao' },
    armageddon: { name: "Armageddon", desc: "Zone de feu permanente.", img: 'arma' },
    bouclier: { name: "Bouclier", desc: "Réduit les dégâts subis.", img: 'bouclier' },
    bichonMalt3Pattes: { name: "Bichon", desc: "Un compagnon qui mord.", img: 'bichon' },
    bricolKit: { name: "Kit du Bricoleur", desc: "Lance une clé qui rebondit.", img: 'cle' },
    couteauADents: { name: "Couteau à dents", desc: "Lance des couteaux devant vous.", img: 'knife' },
    tondeuse: { name: "Tondeuse à Gazon", desc: "Fauche les ennemis en spirale carrée.", img: 'tondeuse' }
};

// --- Inputs ---
const keys = { Z:false, Q:false, S:false, D:false, Space: false };
const mousePos = { x: W/2, y: H/2 };
let mouseLeftDown = false;
let mouseRightDown = false;

// --- AUDIO MANAGER ---
const Sounds = {
    pool: {},
    music: null, // Pour la musique
    volumes: {
        'clicmenu': 0.6, 'clicretour': 0.6, 'clicvalidation': 0.7,
        'sonbao': 0.5, 'sonbichon': 0.4, 'soncoupecoupe': 0.6,
        'soncouteauadent': 0.5, 'songameover': 0.8, 'sonlivreermite': 0.4,
        'sonslp': 0.5, 'sonarma': 0.3, 'sonbaoe': 0.6, 
        'soncle': 0.5, 'sonpao': 0.4
    },

    init: function() {
        const soundFiles = {
            'clicmenu': 'son/clicmenu.mp3',
            'clicretour': 'son/clicretour.mp3',
            'clicvalidation': 'son/clicvalidation.mp3',
            'sonbao1': 'son/sonbao1.mp3', 'sonbao2': 'son/sonbao2.mp3', 
            'sonbao3': 'son/sonbao3.mp3', 'sonbao4': 'son/sonbao4.mp3',
            'sonbichon1': 'son/sonbichon1.mp3', 'sonbichon2': 'son/sonbichon2.mp3', 
            'sonbichon3': 'son/sonbichon3.mp3',
            'soncoupecoupe1': 'son/soncoupecoupe1.mp3', 'soncoupecoupe2': 'son/soncoupecoupe2.mp3', 
            'soncoupecoupe3': 'son/soncoupecoupe3.mp3', 'soncoupecoupe4': 'son/soncoupecoupe4.mp3',
            'soncouteauadent': 'son/soncouteauadent.mp3',
            'songameover': 'son/songameover.mp3',
            'sonlivreermite': 'son/sonlivreermite.mp3',
            'sonslp': 'son/sonslp.mp3',
            'sonarma': 'son/sonarma.mp3',
            'sonbaoe1': 'son/sonbaoe1.mp3', 'sonbaoe2': 'son/sonbaoe2.mp3',
            'sonbaoe3': 'son/sonbaoe3.mp3', 'sonbaoe4': 'son/sonbaoe4.mp3',
            'soncle1': 'son/soncle1.mp3', 'soncle2': 'son/soncle2.mp3',
            'soncle3': 'son/soncle3.mp3', 'soncle4': 'son/soncle4.mp3',
            'sonpao1': 'son/sonpao1.mp3', 'sonpao2': 'son/sonpao2.mp3',
            'sonpao3': 'son/sonpao3.mp3'
        };

        for (let key in soundFiles) {
            const audio = new Audio(soundFiles[key]);
            audio.volume = this.volumes[key.replace(/[0-9]/g, '')] || 0.5;
            this.pool[key] = audio;
        }

         // --- Reference specifique pour Arma ---
        this.armaSound = this.pool['sonarma'];
        if (this.armaSound) {
            this.armaSound.loop = true; 
        }

        // Initialisation de la musique
        this.music = new Audio('son/musique.mp3');
        this.music.loop = true;
        this.music.volume = 0.3; // Volume de base
    },

    // Joue un son simple
    play: function(id) {
        const sound = this.pool[id];
        if (sound) {
            const clone = sound.cloneNode();
            clone.volume = sound.volume; // Applique le volume configuré
            clone.play().catch(e => {});
        }
    },

    playRandom: function(baseId, count) {
        const rand = Math.floor(Math.random() * count) + 1;
        this.play(baseId + rand);
    },

    // --- NOUVELLES FONCTIONS MUSIQUE ---

    playMusic: function() {
        if (this.music) {
            this.music.volume = 0.3; // Reset volume normal
            this.music.play().catch(e => {});
        }
    },

    stopMusic: function() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0; // Rembobiner
        }
    },

    lowerMusic: function() {
        if (this.music) {
            // Baisse de 60% (donc 40% du volume actuel, mais on va fixer un volume bas fixe pour la simplicité)
            // Si volume base = 0.3, 60% de moins = 0.12
            this.music.volume = 0.12; 
        }
    },

    restoreMusic: function() {
        if (this.music) {
            this.music.volume = 0.3;
        }
    },

    stopArma: function() {
        if (this.armaSound) {
            this.armaSound.pause();
            this.armaSound.currentTime = 0; // On rembobine pour la prochaine fois
        }
    },

    // --- CONTROLE DES VOLUMES ---
    setMusicVolume: function(val) {
        // val est entre 0 et 100
        if (this.music) {
            this.music.volume = val / 100;
        }
    },

    setSfxVolume: function(val) {
        // On applique à tous les sons du pool
        for (let key in this.pool) {
            // On garde les proportions (si un son est à 0.5 de base, il sera à 0.5 * (val/100))
            // Pour simplifier, on écrase le volume relatif
            const baseVol = this.volumes[key.replace(/[0-9]/g, '')] || 0.5;
            this.pool[key].volume = baseVol * (val / 100);
        }
    }
};

Sounds.init();

/* =========================================
   INIT & ASSETS
   ========================================= */

function loadAssets() {
    let loaded = 0;
    const total = Object.keys(imageSources).length;
    return new Promise((resolve) => {
        for (let key in imageSources) {
            const img = new Image();
            img.src = imageSources[key];
            img.onload = () => {
                loaded++;
                // Calcul automatique de la largeur d'une frame pour les sprites sheets
                if (spriteConfig[key]) {
                    img.frameWidth = img.width / spriteConfig[key].frames;
                }
                if (loaded >= total) resolve();
            };
            img.onerror = () => { loaded++; if(loaded>=total) resolve(); };
            images[key] = img;
        }
    });
}

async function main() {
    await loadAssets();
    loadingScreen.classList.add('hidden');
    showHomeMenu();
    requestAnimationFrame(gameLoop);
}

function showHomeMenu() {
    Sounds.play('clicretour');
    gameState = 'MENU';
    homeMenu.classList.remove('hidden');
    optionsMenu.classList.add('hidden');
    shopMenu.classList.add('hidden');
    startMenu.classList.add('hidden');
}

function showOptionsMenu() {
    isTimerPaused = true;
    Sounds.play('clicmenu');
    homeMenu.classList.add('hidden');
    optionsMenu.classList.remove('hidden');
}

function showShopMenu() {
    Sounds.play('clicmenu');
    homeMenu.classList.add('hidden');
    shopMenu.classList.remove('hidden');
    updateShopUI(); // Ajout : rafraîchir les prix/niveaux à l'ouverture
}

function showStartMenu() {
    // --- NETTOYAGE DES TACHES DE SANG ---
    const oldStains = document.querySelectorAll('.blood-stain');
    oldStains.forEach(stain => stain.remove());
    // Cette fonction existante doit maintenant cacher l'accueil aussi
    Sounds.play('clicvalidation'); 
    homeMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    gameoverMenu.classList.add('hidden'); 
    startChoicesDiv.innerHTML = '';

    const starters = ['lancePile', 'bombeEau', 'coupeCoupe'];
    starters.forEach(spellKey => {
        const div = document.createElement('div');
        div.className = 'card-choice';
        div.innerHTML = `
            <img src="${images[spellData[spellKey].img].src}" class="card-img">
            <div class="card-info">
                <h3>${spellData[spellKey].name}</h3>
                <p>${spellData[spellKey].desc}</p>
            </div>
        `;
        div.onclick = () => {
            Sounds.play('clicvalidation'); // Son validation
            startGame(spellKey);
        };
        startChoicesDiv.appendChild(div);
    });
}

function startGame(startingSpell) {
    startMenu.classList.add('hidden');
    gameoverMenu.classList.add('hidden');
    hud.classList.remove('hidden');
    btnOptionsIngame.classList.remove('hidden');
    let speedBonus = shopUpgrades.speed.currentLevel * shopUpgrades.speed.baseValue;
    let finalSpeed = 1.5 + speedBonus; // 1.5 = base lente, + bonus boutique
    let bonusHp = shopUpgrades.hp.currentLevel * shopUpgrades.hp.baseValue;
    let baseHp = 50; // PV de base
    let finalMaxHp = baseHp + bonusHp;
    
    player = {
        x: W/2, y: H/2,
        speed: finalSpeed,
        vx: 0, vy: 0,
        size: 32,
        hp: finalMaxHp, 
        maxHp: finalMaxHp,
        xp: 0, level: 1, xpForNext: 40,
        spells: {},
        activeSlots: [startingSpell, null],
        dashCooldown: 0,
        dashTime: 0,
        facing: 0
    };
    
    [...activeSpells, ...passiveSpells].forEach(s => player.spells[s] = 0);
    player.spells[startingSpell] = 1;

    enemies = [];
    projectiles = [];
    aoes = [];
    particles = [];
    damageNumbers = [];
    hermitBooks = [];
    mines = [];
    bichons = [];
    ruines = [];
    bloodStains = [];
    potions = [];
    magnets = [];
    pieces = [];   
    totalCoins = 0;   
    updateCoinUI();
    gcems = [];  
    tondeuses = [];  
    
    // Reset Events
    for(let k in specialEventsDone) specialEventsDone[k] = false;
    
    killCount = 0;
    startTime = performance.now();
    lastTime = startTime;
    totalPausedTime = 0;
    pauseStartTime = 0;
    elapsedSec = 0;

    Sounds.playMusic();
    updateHUD();
    updateSpellDock();
    gameState = 'PLAYING';
}

function xpNeeded(lvl) {
    return 40 + (lvl - 1) * 30;
}

/* =========================================
   GAME LOOP
   ========================================= */

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    if (gameState === 'PLAYING') {
        update(dt);
        draw();
    } else {
        draw();
    }
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // --- GESTION DU TIMER LEVEL UP ---
    if (levelUpFlashTimer > 0) {
        levelUpFlashTimer -= dt;
        if (levelUpFlashTimer <= 0) {
            levelUpFlashTimer = 0;
            levelUp(); // Une fois le flash fini, on ouvre le menu
        }
        return; // IMPORTANT : On arrête ici la fonction. Le jeu est en "pause" pendant l'animation.
    }
    // --- AFFICHAGE GROUPÉ DES DÉGÂTS JOUEUR ---
    const now = performance.now();
    
    // Toutes les 500ms (0.5 seconde), on affiche les dégâts accumulés
    if (now - lastDamageUpdateTime > 500) {
        if (playerDamageAccumulator >= 1) {
            // On arrondit à l'entier le plus proche pour l'affichage
            let damageToShow = Math.round(playerDamageAccumulator);
            
            // On affiche le nombre rouge au-dessus du joueur
            spawnDamageNumber(player.x, player.y - 30, `-${damageToShow}`, "#ff0000");
            
            // On remet l'accumulateur à zéro
            playerDamageAccumulator = 0;
        }
        lastDamageUpdateTime = now;
    }

    // --- LOGIQUE NORMALE DU JEU ---
    elapsedSec = Math.floor((performance.now() - startTime - totalPausedTime) / 1000);
    let m = Math.floor(elapsedSec / 60);
    let s = elapsedSec % 60;
    timerDiv.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateAoes(dt);
    updateParticles(dt);
    updateDamageNumbers(dt);
    updateSpawns(dt); 
    updateRuines(dt);
    checkCollisions(dt);
    updateMines(dt);
    updatePotions(dt);
    updateMagnets(dt);
    updatePieces(dt);

    if (player.hp <= 0) triggerGameOver();
}

/* =========================================
   COLLISIONS & MINES & POTIONS
   ========================================= */
function checkCollisions(dt) {
    for (let e of enemies) {
        // 1. On définit la taille de collision réelle
        let eSize = e.hitRadius || e.size; 
        
        let distE = dist(player.x, player.y, e.x, e.y);
        
        // 2. On vérifie la collision
        if (distE < player.size + eSize) { 
            if (player.dashTime <= 0) {
                // Calcul des dégâts
                let reduction = 0;
                if (player.spells.bouclier) reduction = player.spells.bouclier * 0.1;
                let damageTick = e.dmg * (dt/1000) * 5;
                damageTick = damageTick * (1 - reduction);
                
                if (damageTick > 0.1) {
                    player.hp -= damageTick;
                    playerDamageAccumulator += damageTick;
                }
            }
        }
    }
    
    mines.forEach(m => {
        if(m.active) {
            for(let e of enemies) {
                if(dist(m.x, m.y, e.x, e.y) < 20) {
                    explodeMine(m);
                    break; 
                }
            }
        }
    });

    potions.forEach(p => {
        if (!p.collected && dist(player.x, player.y, p.x, p.y) < player.size + 15) {
            p.collected = true;
            // Calcul du soin avec bonus boutique
            let healAmount = 20 + (shopUpgrades.potion.currentLevel * shopUpgrades.potion.baseValue); // 20 + (Niveau * 20)
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            spawnDamageNumber(player.x, player.y - 30, `+${healAmount} PV`, "#ff4444");
        }
    });
    potions = potions.filter(p => !p.collected);

    updateHUD();
}

function updateMines(dt) {
    let now = performance.now();
    mines.forEach(m => {
        if (m.active) {
            if (now - m.createdAt > 3000) {
                explodeMine(m);
            }
        }
    });
    mines = mines.filter(m => m.active);
}

function explodeMine(m) {
    if (!m.active) return;
    aoes.push({
        x: m.x, y: m.y,
        radius: m.radius,
        damage: m.damage,
        duration: 600,
        start: performance.now()
    });
    createParticles(m.x, m.y, 20, '#44aaff');
    m.active = false;
    Sounds.playRandom('sonbaoe', 4);
}

function updatePotions(dt) {}

/* =========================================
   ENTITIES UPDATE
   ========================================= */

function updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.Z) dy -= 1;
    if (keys.S) dy += 1;
    if (keys.Q) dx -= 1;
    if (keys.D) dx += 1;

    if (dx !== 0 || dy !== 0) {
        let len = Math.sqrt(dx*dx + dy*dy);
        dx /= len; dy /= len;
        player.facing = Math.atan2(dy, dx);
    }

    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    let currentSpeed = player.speed;
    
    if (keys.Space && player.dashCooldown <= 0 && (dx!==0 || dy!==0)) {
        player.dashTime = 200; 
        player.dashCooldown = 1500;
        createParticles(player.x, player.y, 10, '#fff');
    }

    if (player.dashTime > 0) {
        player.dashTime -= dt;
        currentSpeed *= 3.0;
        if (Math.random() > 0.5) {
             particles.push({
                x: player.x, y: player.y,
                vx: 0, vy: 0, life: 300, maxLife: 300,
                size: player.size, color: 'rgba(255,255,255,0.3)',
                isGhost: true
             });
        }
    }

    let nextX = player.x + dx * currentSpeed;
    let nextY = player.y + dy * currentSpeed;

    if (nextX < 0) nextX = 0;
    if (nextX > W) nextX = W;
    if (nextY < 0) nextY = 0;
    if (nextY > H) nextY = H;

        // --- Collision avec les Ruines ---
    let canMove = true;
    // On vérifie si la position future est dans une ruine
    for (let r of ruines) {
        // On utilise une hitbox circulaire pour la simplicité
        if (dist(nextX, nextY, r.x, r.y) < player.size + 25) { // 25 = rayon approximatif de la ruine
            canMove = false;
            break;
        }
    }

    if (canMove) {
        player.x = nextX;
        player.y = nextY;
    }

    if (mouseLeftDown && player.activeSlots[0]) tryCast(player.activeSlots[0]);
    if (mouseRightDown && player.activeSlots[1]) tryCast(player.activeSlots[1]);

    updatePassives(dt);
}

const spellTimers = {};

function tryCast(spellName) {
    const lvl = player.spells[spellName];
    if (!lvl) return;
    
    const now = performance.now();
    const last = spellTimers[spellName] || 0;
    let cooldown = 0;
    
    if (spellName === 'lancePile') {
        cooldown = 1000 - (lvl * 100); 
        if (now - last > cooldown) {
            spellTimers[spellName] = now;
            const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
            
            projectiles.push({
                x: player.x, y: player.y,
                vx: Math.cos(angle)*7, vy: Math.sin(angle)*7,
                damage: 10 + (lvl*5),
                type: 'pile', 
                img: images.pile,
                angle: angle
            });

            aoes.push({
                x: player.x, 
                y: player.y,
                duration: 200, 
                type: 'lance-visuel',
                img: images.slp,
                angle: angle, 
                start: now
            });
            Sounds.play('sonslp');
        }
    }
    
    if (spellName === 'bombeEau') {
        cooldown = 2000;
        if (now - last > cooldown) {
            spellTimers[spellName] = now;
            projectiles.push({
                x: player.x, y: player.y,
                vx: 0, vy: 0, 
                targetX: mousePos.x, targetY: mousePos.y,
                speed: 6,
                damage: 20 + (lvl*10),
                type: 'bao', img: images.bao,
                isAoE: true, radius: 40 + (lvl*10)
            });
        }
    }
    
    if (spellName === 'coupeCoupe') {
        cooldown = 800 - (lvl * 50);
        if (now - last > cooldown) {
            spellTimers[spellName] = now;
            const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
            aoes.push({
                x: player.x, y: player.y,
                radius: 60,
                damage: 25 + (lvl*5),
                duration: 200, 
                type: 'slash-visuel',
                img: images.coupecoupe,
                angle: angle, 
                cone: Math.PI / 2,
                start: now,
                id: now,
                soundPlayed: false
            });
        }
    }
}

/* =========================================
   LOGIQUE TONDEUSE À GAZON
   ========================================= */

function spawnTondeuse(lvl) {
    tondeuses.push({
        // -- ETAT DE LA SPIRALE --
        loopIndex: 0, 
        sideIndex: 0,   
        t: 0,     
        
        // -- CONFIGURATION --
        baseSize: 100,     
        sizeGrowth: 40,    // De combien le carré grandit à chaque boucle
        speed: 3,          // Vitesse de déplacement sur les côtés
        turnSpeed: 0.02,
        
        // -- STATS COMBAT --
        damage: 15 + (lvl * 10),
        active: true
    });
}

function updateTondeuses(dt, lvl) {
    tondeuses.forEach(t => {
        let maxLoops = 1 + (lvl - 1) * 2;
        let currentSize = t.baseSize + (t.loopIndex * t.sizeGrowth);
        let halfSize = currentSize / 2;
        t.t += t.turnSpeed; 

        //  GESTION DES CHANGEMENTS DE CÔTÉ ET DE BOUCLES
        if (t.t >= 1.0) {
            t.t = 0; // On reset la progression sur le côté
            t.sideIndex++; // On change de côté

            // Si on a fini les 4 côtés d'un carré
            if (t.sideIndex > 3) {
                t.sideIndex = 0;
                t.loopIndex++; // On passe au carré suivant (plus grand)

                // === CHANGEMENT ICI ===
                // Si on a atteint le nombre de carrés requis pour le niveau
                if (t.loopIndex >= maxLoops) {
                    t.active = false; // ON DÉTRUIT LA TONDEUSE
                }
                // =====================
            }
        }

        //  CALCUL DE LA POSITION RELATIVE AU JOUEUR
        let relX, relY;
        
        if (t.sideIndex === 0) { // HAUT (Gauche vers Droite)
            relX = -halfSize + (t.t * currentSize);
            relY = -halfSize;
        } 
        else if (t.sideIndex === 1) { // DROITE (Haut vers Bas)
            relX = halfSize;
            relY = -halfSize + (t.t * currentSize);
        } 
        else if (t.sideIndex === 2) { // BAS (Droite vers Gauche)
            relX = halfSize - (t.t * currentSize);
            relY = halfSize;
        } 
        else { // GAUCHE (Bas vers Haut)
            relX = -halfSize;
            relY = halfSize - (t.t * currentSize);
        }

        //  POSITION MONDIALE (RELATIVE + JOUEUR)
        let worldX = player.x + relX;
        let worldY = player.y + relY;

        // 7. COLLISIONS (Dégâts)
        enemies.forEach(e => {
            if (dist(worldX, worldY, e.x, e.y) < e.size + 15) {
                if(!e.tondeuseTimer) e.tondeuseTimer = 0;
                e.tondeuseTimer -= dt;
                
                if(e.tondeuseTimer <= 0) {
                    hitEnemy(e, t.damage);
                    e.tondeuseTimer = 150; 
                }
            }
        });

        gcems.forEach(g => {
             if (dist(worldX, worldY, g.x, g.y) < g.size + 15) {
                 g.hp -= t.damage * 0.5;
                 createParticles(g.x, g.y, 1, '#ffd700');
             }
        });
    });
    
    // === IMPORTANT : Nettoyage des tondeuses mortes (finies) ===
    tondeuses = tondeuses.filter(t => t.active);
}

function updatePassives(dt) {
    // Livre Ermite
    let ermiteLvl = player.spells.livreErmite;
    if (ermiteLvl > 0) {
        let count = Math.min(3, ermiteLvl);
        if (hermitBooks.length !== count) {
            hermitBooks = Array(count).fill(0).map((_,i) => ({ angle: (Math.PI*2/count)*i }));
        }
        let damagePerHit = ermiteLvl * 5;
        let tickCooldown = 500; 

        hermitBooks.forEach(b => {
            b.angle += 0.05; 
            let bx = player.x + Math.cos(b.angle)*70;
            let by = player.y + Math.sin(b.angle)*70;
            enemies.forEach(e => {
                if (dist(bx, by, e.x, e.y) < e.size + 15) {
                    // Système de timer
                    if(!e.ermitTimer) e.ermitTimer = 0;
                    e.ermitTimer -= dt;
                    
                    if(e.ermitTimer <= 0) {
                        hitEnemy(e, damagePerHit); 
                        e.ermitTimer = tickCooldown;
                        Sounds.play('sonlivreermite'); 
                    }
                }
            });
            gcems.forEach(g => {
                if (dist(bx, by, g.x, g.y) < g.size + 15) {
                    if(!g.ermitTimer) g.ermitTimer = 0;
                    g.ermitTimer -= dt;
                    if(g.ermitTimer <= 0) {
                        g.hp -= damagePerHit;
                        createParticles(g.x, g.y, 1, '#ffd700');
                        g.ermitTimer = tickCooldown;
                    }
                }
            });
        });
    }

    // Armageddon
    let armaLvl = player.spells.armageddon;
    if (armaLvl > 0) {
        let radius = 60 + armaLvl*20;
        
        // On vérifie s'il y a au moins un ennemi dans la zone
        let enemyInZone = false;
        
        enemies.forEach(e => {
            if (dist(player.x, player.y, e.x, e.y) < radius) {
                enemyInZone = true; // On a trouvé un ennemi
                
                // Logique de dégâts existante
                if(!e.armaTimer) e.armaTimer = 0;
                e.armaTimer -= dt;
                if(e.armaTimer <= 0) {
                    hitEnemy(e, 2 + armaLvl); 
                    e.armaTimer = 200; 
                }
            }
        });

        // --- GESTION DU SON ---
        if (Sounds.armaSound) {
            if (enemyInZone) {
                // Si ennemi présent et son arrêté -> On joue
                if (Sounds.armaSound.paused) {
                    Sounds.armaSound.play().catch(e=>{}); 
                }
            } else {
                // Si aucun ennemi et son en lecture -> On pause
                if (!Sounds.armaSound.paused) {
                    Sounds.armaSound.pause();
                    // Optionnel : rembobiner pour être prêt pour la prochaine fois
                    // Sounds.armaSound.currentTime = 0; 
                }
            }
        }

        // Dégâts aux coffres (inchangé)
        gcems.forEach(g => {
            if (dist(player.x, player.y, g.x, g.y) < radius) {
                g.hp -= (2 + armaLvl);
                createParticles(g.x, g.y, 1, '#ffd700');
            }
        });
    }

    // Pistolet Eau
    let paoLvl = player.spells.pistoletEau;
    if (paoLvl > 0) {
        const now = performance.now();
        const last = spellTimers['pistoletEau'] || 0;
        const cooldown = Math.max(500, 3000 - (paoLvl*500));
        
        if (now - last > cooldown) {
            spellTimers['pistoletEau'] = now;
            let target = getClosestEnemy();
            if (target) {
                let angle = Math.atan2(target.y - player.y, target.x - player.x);
                 projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angle)*8, vy: Math.sin(angle)*8,
                    damage: 15 + (paoLvl*5),
                    type: 'pao', img: images.ballepao
                });
            }
        }
    }
    
    // Kit Bricoleur
    let bricolLvl = player.spells.bricolKit;
    if (bricolLvl > 0) {
        const now = performance.now();
        const last = spellTimers['bricolKit'] || 0;
        const cooldown = 2500;
        
        if (now - last > cooldown) {
             spellTimers['bricolKit'] = now;
             let target = getClosestEnemy();
             if (target) {
                 let angle = Math.atan2(target.y - player.y, target.x - player.x);
                 projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angle)*6, vy: Math.sin(angle)*6,
                    damage: 10 + (bricolLvl*5),
                    type: 'cle', img: images.cle,
                    bounces: bricolLvl, 
                    hitList: [] 
                });
             }
        }
    }

    // Bombe a eau explosive
    let mineLvl = player.spells.bombeEauExplosif;
    if (mineLvl > 0) {
        const now = performance.now();
        const last = spellTimers['mineEau'] || 0;
        const cooldown = 3000; 
        
        if (now - last > cooldown) {
            spellTimers['mineEau'] = now;
            let angle = Math.random() * Math.PI * 2;
            let dist = Math.random() * 100;
            mines.push({
                x: player.x + Math.cos(angle)*dist,
                y: player.y + Math.sin(angle)*dist,
                damage: 50 + (mineLvl * 20),
                radius: 100 + (mineLvl * 10),
                active: true,
                createdAt: now, 
                img: images.baoe
            });
        }
    }

    // Bichon Maltais
    let bichonLvl = player.spells.bichonMalt3Pattes;
    if (bichonLvl > 0) {
        updateBichons(bichonLvl, dt);
    }
    checkGcemDestruction();

    // Couteau à dents
    let knifeLvl = player.spells.couteauADents;
    if (knifeLvl > 0) {
        const now = performance.now();
        const last = spellTimers['couteauADents'] || 0;
        const cooldown = 3000; // Tir toutes les 1.5 secondes

        if (now - last > cooldown) {
            spellTimers['couteauADents'] = now;
            
            // Nombre de couteaux : Niveau 1 = 1, Max 5
            let count = Math.min(5, knifeLvl);
            // Calcul de l'arc de cercle. 
            // Niveau 1 : 0 degré (droit). 
            // Niveau 2+ : Arc de 60 degrés (PI/3)
            let spreadAngle = Math.PI / 3; 
            
            let baseAngle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);

            for (let i = 0; i < count; i++) {
                let angle = baseAngle;
                
                // Répartition en arc
                if (count > 1) {
                    // Calcul du décalage pour centrer l'arc
                    // ex: pour 2 couteaux : -0.5 * step et +0.5 * step
                    let step = spreadAngle / (count - 1);
                    angle = baseAngle - spreadAngle / 2 + (i * step);
                }

                projectiles.push({
                    x: player.x,
                    y: player.y,
                    // Vitesse initiale
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    damage: 10 + (knifeLvl * 5), // Dégâts évolutifs
                    type: 'knife',
                    img: images.knife,
                    // Logique Boomerang
                    distance: 0,       // Distance parcourue
                    maxDist: 200 + (knifeLvl * 30), // Portée
                    returning: false,  // Est-ce qu'il revient ?
                    startAngle: angle  // Mémorise l'angle de départ
                });
                if(i === 0) Sounds.play('soncouteauadent');
            }
        }
    }
    // === TONDEUSE À GAZON ===
    let tondeuseLvl = player.spells.tondeuse;
    if (tondeuseLvl > 0) {
        const now = performance.now();
        const last = spellTimers['tondeuse'] || 0;
        
        // === FIX DU BUG : On regarde combien de tondeuses sont en vie ===
        // Niveau 1-3 : 1 tondeuse max
        // Niveau 4-5 : 2 tondeuses max
        let maxTondeuses = (tondeuseLvl >= 4) ? 2 : 1;
        
        // Si on a déjà atteint la limite, on n'en lance pas de nouvelle, même si le cooldown est passé
        if (tondeuses.length < maxTondeuses) {
            
            // Cooldown de base (6 secondes)
            const cooldown = 6000; 

            if (now - last > cooldown) {
                spellTimers['tondeuse'] = now;
                
                // Lancer la tondeuse principale
                spawnTondeuse(tondeuseLvl);
                
                // Si Niveau 4 ou plus : Lancer une seconde tondeuse en différé
                if (tondeuseLvl >= 4) {
                    setTimeout(() => {
                        // On vérifie AGAIN s'il y a de la place (au cas où le joueur est passé niveau 4 entre temps)
                        if(gameState === 'PLAYING' && tondeuses.length < 2) {
                            spawnTondeuse(tondeuseLvl);
                        }
                    }, 1000); // 1 seconde de délai
                }
            }
        }
        
        // Mise à jour de la physique des tondeuses
        updateTondeuses(dt, tondeuseLvl);
    }
}

function updateBichons(lvl, dt) {
    let maxBichons = Math.min(5, lvl);
    while (bichons.length < maxBichons) {
        bichons.push({
            x: player.x, y: player.y,
            target: null,
            state: 'IDLE',
            angle: Math.random() * Math.PI * 2, // Pour l'orbite
            attackCooldown: 0
        });
    }
    
    let range = 200 + (lvl * 20);
    let dmgPerHit = 5 + (lvl * 2);
    let attackRadius = 25; // Distance pour mordre

    // --- 1. ATTRIBUTION DES CIBLES (Intelligence Artificielle) ---
    // On liste les ennemis à portée
    let enemiesInRange = enemies.filter(e => 
        dist(player.x, player.y, e.x, e.y) < range
    );

    // On mélange les ennemis pour éviter que les bichons visent tous le même par défaut
    enemiesInRange.sort(() => Math.random() - 0.5);

    // On compte combien de bichons visent déjà chaque ennemi
    let targetCounts = {};
    enemies.forEach(e => targetCounts[e] = 0); // Initialisation
    
    // Premier passage : on compte les cibles actuelles valides
    bichons.forEach(b => {
        if (b.target && enemies.includes(b.target)) {
            targetCounts[b.target] = (targetCounts[b.target] || 0) + 1;
        }
    });

    // Deuxième passage : assignation des cibles
    bichons.forEach(b => {
        // Si la cible est morte ou hors portée, on la retire
        if (b.target && (!enemies.includes(b.target) || dist(player.x, player.y, b.target.x, b.target.y) > range)) {
            b.target = null;
        }

        // Si pas de cible, on en cherche une
        if (!b.target && enemiesInRange.length > 0) {
            let bestTarget = null;
            let minCount = Infinity;

            // On cherche l'ennemi qui a le moins de bichons dessus
            enemiesInRange.forEach(e => {
                let count = targetCounts[e] || 0;
                if (count < minCount) {
                    minCount = count;
                    bestTarget = e;
                }
            });

            if (bestTarget) {
                b.target = bestTarget;
                targetCounts[bestTarget] = (targetCounts[bestTarget] || 0) + 1;
            }
        }
    });

    // --- 2. MOUVEMENT ET ATTAQUE ---
    bichons.forEach((b, i) => {
        // Gestion du cooldown d'attaque
        if (b.attackCooldown > 0) b.attackCooldown -= dt;

        let destX, destY;
        let speedFactor;

        if (b.target) {
            // === MODE ATTAQUE ===
            
            // Calcul de la position désirée : on entoure l'ennemi
            // On utilise l'index i pour répartir les bichons en cercle
            let angleToEnemy = Math.atan2(b.target.y - b.y, b.target.x - b.x);
            let orbitAngle = angleToEnemy + (i * (2 * Math.PI / bichons.length));
            
            // Position idéale : un peu avant l'ennemi pour ne pas se chevaucher
            let distToTarget = dist(b.x, b.y, b.target.x, b.target.y);
            
            // Si on est loin, on vise l'ennemi. Si on est proche, on vise sa position en cercle
            if (distToTarget > 60) {
                destX = b.target.x;
                destY = b.target.y;
                speedFactor = 0.02; // Vitesse normale d'approche (lent)
            } else {
                // Cercle de rayon 30 autour de l'ennemi
                destX = b.target.x + Math.cos(orbitAngle) * 30;
                destY = b.target.y + Math.sin(orbitAngle) * 30;
                speedFactor = 0.04; // Vitesse de positionnement
            }

            // Attaque
            if (dist(b.x, b.y, b.target.x, b.target.y) < attackRadius && b.attackCooldown <= 0) {
                hitEnemy(b.target, dmgPerHit);
                b.attackCooldown = 500; // 0.5s cooldown
            }

        } else {
            // === MODE REPOS (Orbite autour du joueur) ===
            if (!b.angle) b.angle = Math.random() * Math.PI * 2;
            b.angle += 0.02; 
            
            let radiusOrbit = 40; 
            destX = player.x + Math.cos(b.angle) * radiusOrbit;
            destY = player.y + Math.sin(b.angle) * radiusOrbit;
            speedFactor = 0.08; // Vitesse de repos
        }

        // Application du mouvement (lissage)
        b.x += (destX - b.x) * speedFactor;
        b.y += (destY - b.y) * speedFactor;

        if (b.target && Math.random() < 0.005) { // Faible probabilité pour "1 fois sur 3" global
             Sounds.playRandom('sonbichon', 3);
        }
    });
}

// --- Ruines Logic ---
function spawnRuine(x, y) {
    let imgArray = [images.ruine1, images.ruine2, images.ruine3];
    let randImg = imgArray[Math.floor(Math.random()*imgArray.length)];
    let enemyTypes = ['zombie', 'zombie2', 'zombie3'];
    let randEnemyType = enemyTypes[Math.floor(Math.random()*enemyTypes.length)];

    ruines.push({
        x: x || (Math.random()*W),
        y: y || (Math.random()*H),
        radius: 35,
        img: randImg,
        spawnType: randEnemyType,
        lastSpawnTime: performance.now()
    });
}

function updateRuines(dt) {
    let now = performance.now();
    ruines.forEach(r => {
        if (now - r.lastSpawnTime > 3000) {
            r.lastSpawnTime = now;
            let stats = getEnemyStats(r.spawnType);
            
            let angle = Math.random() * Math.PI * 2;
            let spawnDist = 55;
            let spawnX = r.x + Math.cos(angle) * spawnDist;
            let spawnY = r.y + Math.sin(angle) * spawnDist;
            
            enemies.push({
                x: spawnX, y: spawnY,
                vx: 0, vy: 0,
                ...stats, maxHp: stats.hp, size: 20, flashTime: 0,
                stuckTimer: 0, // Initialiser la variable pour la nouvelle logique
                stuckDir: 0    // Initialiser la variable
            });
        }
    });
}

/* =========================================
   GESTION DE LA DIFFICULTÉ PROGRESSIVE
   ========================================= */

function applyDifficultyScaling(baseStats, currentLevel) {
    // On commence l'augmentation de difficulté après le niveau 10
    if (currentLevel <= 10) return baseStats;

    // Calcul du multiplicateur basé sur le niveau
    // Exemple : Au niveau 11, facteur = 1.1. Au niveau 20, facteur = 2.0.
    let levelsAbove10 = currentLevel - 10;
    
    // Ajuste ces valeurs pour changer la courbe de difficulté
    let hpMultiplier = 1 + (levelsAbove10 * 0.12); // +12% PV par niveau au-dessus de 10
    let dmgMultiplier = 1 + (levelsAbove10 * 0.08); // +8% Dégâts par niveau au-dessus de 10

    return {
        ...baseStats,
        hp: Math.floor(baseStats.hp * hpMultiplier),
        dmg: Math.floor(baseStats.dmg * dmgMultiplier)
    };
}

// --- Spawning Logic with Events ---
let enemySpawnTimer = 0;

function updateSpawns(dt) {
    enemySpawnTimer += dt;
    gcemSpawnTimer += dt;
    
    // Spawn des Gcem (Coffres) - inchangé
    if (gcemSpawnTimer >= 10000) { 
        gcemSpawnTimer = 0; 
        if (Math.random() < 0.05) { 
            let randX = Math.random() * (W - 100) + 50;
            let randY = Math.random() * (H - 100) + 50;
            gcems.push({
                x: randX, y: randY,
                hp: 30 + (player.level * 2), // On scale un peu les coffres aussi
                maxHp: 30 + (player.level * 2),
                size: 32
            });
            createParticles(randX, randY, 10, '#ffd700');
        }
    }
    
    // --- 1. ÉVÉNEMENTS SPÉCIAUX (Niveaux 4 à 27) ---
    if(player.level===4 && !specialEventsDone[4]) { spawnCircleOfEnemies(8,'zombie4'); specialEventsDone[4]=true; }
    if(player.level===5 && !specialEventsDone[5]) { spawnBoss(1); specialEventsDone[5]=true; }
    if(player.level===10 && !specialEventsDone[10]) { spawnBoss(1); specialEventsDone[10]=true; }
    if(player.level===12 && !specialEventsDone[12]) { spawnCircleOfEnemies(16,'zombie4'); specialEventsDone[12]=true; }
    if(player.level===15 && !specialEventsDone[15]) { spawnBoss(1); specialEventsDone[15]=true; }
    if(player.level===16 && !specialEventsDone[16]) { spawnSquareOfEnemies(16,'zombie'); specialEventsDone[16]=true; }
    if(player.level===18 && !specialEventsDone[18]) { spawnCircleOfEnemies(16,'zombie4'); specialEventsDone[18]=true; }
    if(player.level===20 && !specialEventsDone[20]) { spawnBoss(2); specialEventsDone[20]=true; }
    if(player.level===22 && !specialEventsDone[22]) { spawnSquareOfEnemies(20,'zombie2'); specialEventsDone[22]=true; }
    if(player.level===25 && !specialEventsDone[25]) { spawnBoss(2); specialEventsDone[25]=true; }
    if(player.level===27 && !specialEventsDone[27]) { spawnSquareOfEnemies(10,'zombie'); specialEventsDone[27]=true; }

    // --- 2. LOGIQUE INFINIE (Après niveau 27) ---
    if (player.level > 27 && !specialEventsDone[player.level]) {
        
        // Tous les 5 niveaux (30, 35, 40...) -> BOSS
        if (player.level % 5 === 0) {
            spawnBoss(2); // Boss type 2 (le plus dur)
        } 
        // Si niveau pair (ex: 28, 32, 36...) -> CERCLE
        else if (player.level % 2 === 0) {
            // Le nombre d'ennemis augmente légèrement avec le niveau
            let enemyCount = 16 + Math.floor((player.level - 27) / 2);
            let randomType = Math.random() > 0.5 ? 'zombie4' : 'zombie5';
            spawnCircleOfEnemies(enemyCount, 'zombie4');
        } 
        // Si niveau impair -> CARRÉ
        else {
            let enemyCount = 20 + Math.floor((player.level - 27) / 2);
            spawnSquareOfEnemies(enemyCount, 'zombie2');
        }

        specialEventsDone[player.level] = true;
    }

    // --- 3. SPAWN NORMAL (Continu) ---
    let spawnRate = 2000;
    if (elapsedSec > 60) spawnRate = 1500;
    if (elapsedSec > 180) spawnRate = 800;
    // On continue d'accélérer le spawn après 3 minutes
    if (elapsedSec > 300) spawnRate = 500; 
    
    if (enemySpawnTimer > spawnRate) {
        enemySpawnTimer = 0;
        let side = Math.floor(Math.random()*4);
        let x, y;
        if(side===0){x=Math.random()*W; y=-20;}
        else if(side===1){x=W+20; y=Math.random()*H;}
        else if(side===2){x=Math.random()*W; y=H+20;}
        else {x=-20; y=Math.random()*H;}

        let type = 'zombie';
        if (elapsedSec > 60 && Math.random()>0.7) type = 'zombie2';
        if (elapsedSec > 120 && Math.random()>0.7) type = 'zombie3';
        if (elapsedSec > 150 && Math.random() > 0.8) type = 'zombie5';
        
        let stats = getEnemyStats(type);
        
        // IMPORTANT : On applique le scaling même aux ennemis normaux !
        stats = applyDifficultyScaling(stats, player.level);

        enemies.push({
            x: x, y: y, vx: 0, vy: 0,
            ...stats, maxHp: stats.hp, size: 20, flashTime: 0
        });
    }
}

// Helpers Spawns
function spawnCircleOfEnemies(count, type) {
    let baseStats = getEnemyStats(type);
    
    // On applique la difficulté ET on réduit l'XP pour l'équilibre
    let stats = applyDifficultyScaling(baseStats, player.level);
    stats.xp = Math.max(1, Math.floor(stats.xp * 0.4)); // 40% de l'XP de base

    for(let i=0; i<count; i++) {
        let angle=(2*Math.PI*(i/count));
        let radius=400; 
        let ex=player.x+Math.cos(angle)*radius;
        let ey=player.y+Math.sin(angle)*radius;
        enemies.push({
            x:ex, y:ey, vx:0, vy:0, size:20,
            hp:stats.hp, maxHp:stats.hp, dmg:stats.dmg, speed:stats.speed, 
            img: stats.img, spriteKey: stats.spriteKey, flashTime:0, xp: stats.xp
        });
    }
}

function spawnSquareOfEnemies(count, type) {
    let radius = 250; 
    let baseStats = getEnemyStats(type);
    
    // Même logique : Difficulté progressive + XP réduite
    let stats = applyDifficultyScaling(baseStats, player.level);
    stats.xp = Math.max(1, Math.floor(stats.xp * 0.4));

    let perSide = Math.floor(count / 4);
    for(let i=0; i<4; i++) {
        for(let j=0; j<perSide; j++) {
             let ex = player.x; let ey = player.y;
             let offset = (j - perSide/2) * 30;
             if(i===0) { ey-=radius; ex+=offset; }
             if(i===1) { ex+=radius; ey+=offset; }
             if(i===2) { ey+=radius; ex+=offset; }
             if(i===3) { ex-=radius; ey+=offset; }
             
             enemies.push({
                x:ex, y:ey, vx:0, vy:0, size:20,
                hp:stats.hp, maxHp:stats.hp, dmg:stats.dmg, speed:stats.speed, 
                img: stats.img, spriteKey: stats.spriteKey, flashTime:0, xp: stats.xp
             });
        }
    }
}

function spawnBoss(typeNumber) {
    let bossKey = typeNumber === 2 ? 'boss2' : 'boss1';
    
    // Stats de base du boss
    let baseStats = {
        hp: 500 + (player.level * 50), // La formule actuelle est bien, on la garde
        dmg: 20, // Dégâts de base
        speed: 0.5,
        xp: 200
    };

    // On applique le scaling des dégâts (et un peu de PV en plus si tu veux)
    let scaledStats = applyDifficultyScaling(baseStats, player.level);

    let side = Math.floor(Math.random()*4);
    let x,y; 
    if(side===0){x=W/2;y=-50;}else{x=W/2;y=H+50;}
    
    enemies.push({
        x: x, y: y, vx: 0, vy: 0,
        hp: scaledStats.hp, 
        maxHp: scaledStats.hp, // Important de mettre à jour le maxHP aussi
        speed: scaledStats.speed, 
        dmg: scaledStats.dmg, // Dégâts maintenant scalés
        xp: scaledStats.xp,
        size: 60, type: 'boss', 
        hitRadius: 25,
        img: images[bossKey], 
        spriteKey: bossKey,
        flashTime: 0
    });
}

function getEnemyStats(type) {
    if(type==='zombie') return {hp:20, speed:1, dmg:5, img:images.zombie1, spriteKey:'zombie1', xp: 10};
    if(type==='zombie2') return {hp:40, speed:1.5, dmg:8, img:images.zombie2, spriteKey:'zombie2', xp: 10};
    if(type==='zombie3') return {hp:80, speed:0.8, dmg:15, img:images.zombie3, spriteKey:'zombie3', xp: 20};
    if(type==='zombie4') return {hp:30, speed:1.2, dmg:6, img:images.zombie4, spriteKey:'zombie4', xp: 15};
    if(type==='zombie5') return {hp:60, speed:1.5, dmg:12, img:images.zombie5, spriteKey:'zombie5', xp: 20};
    return {hp:20, speed:1, dmg:5, img:images.zombie1, spriteKey:'zombie1', xp: 10};
}

// --- End Helpers ---

function updateEnemies(dt) {
    enemies.forEach(e => {
        let angle = Math.atan2(player.y - e.y, player.x - e.x);
        let speed = e.speed;
        
        // Si l'ennemi est en train de contourner (coincé)
        if (e.stuckTimer && e.stuckTimer > 0) {
            e.stuckTimer -= dt;
            // On force un mouvement perpendiculaire (gauche ou droite)
            // e.stuckDir vaut 1 (droite) ou -1 (gauche)
            angle += (Math.PI / 2) * e.stuckDir; 
            
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            
            // On vérifie si ce mouvement de contournement est possible
            let nextX = e.x + vx;
            let nextY = e.y + vy;
            let canMove = true;
            for (let r of ruines) {
                if (dist(nextX, nextY, r.x, r.y) < e.size + 25) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove) {
                e.x = nextX;
                e.y = nextY;
            } else {
                // Si toujours bloqué même en contournant, on change de côté
                e.stuckDir *= -1; 
            }
        } 
        else {
            // --- MOUVEMENT NORMAL ---
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            
            let nextX = e.x + vx;
            let nextY = e.y + vy;

            let blockedX = false;
            let blockedY = false;

            for (let r of ruines) {
                if (dist(nextX, e.y, r.x, r.y) < e.size + 25) blockedX = true;
                if (dist(e.x, nextY, r.x, r.y) < e.size + 25) blockedY = true;
            }

            // Si on bouge pas (double blocage), c'est qu'on est vraiment coincé face à l'obstacle
            if (blockedX && blockedY) {
                // On active le mode "contournement" pour 500ms
                e.stuckTimer = 500; 
                // On choisit aléatoirement de contourner par la gauche ou la droite
                e.stuckDir = (Math.random() > 0.5) ? 1 : -1; 
            } else {
                // Sinon on applique le mouvement normal (avec glissement)
                if (!blockedX) e.x = nextX;
                if (!blockedY) e.y = nextY;
            }
        }

        if (e.flashTime > 0) e.flashTime -= dt;
    });
    enemies = enemies.filter(e => e.hp > 0);
}

function hitEnemy(e, dmg, forceDisplay = false) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.flashTime = 100;
    if (dmg > 0 || forceDisplay) {
        spawnDamageNumber(e.x, e.y - 20, Math.floor(dmg));
    }
    if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
    killCount++;
    killCountDiv.innerText = killCount;
    
    player.xp += (e.xp || 10);
    
    // DROP DE PIECES (25% de chance)
    if (Math.random() < 0.25) { 
        spawnPiece(e.x, e.y);
    }

    bloodStains.push({x: e.x, y: e.y});
    if (bloodStains.length > 100) bloodStains.shift();

    if (e.type === 'boss') {
        spawnRuine(e.x, e.y);
        bossKillCount++;
    }
    
    // Drop potion (2%)
    if (Math.random() < 0.02) {
        potions.push({x: e.x, y: e.y, collected: false});
    }

    // NOUVEAU : Drop Magnétisme
    if (Math.random() < 0.01) {
        magnets.push({x: e.x, y: e.y, collected: false});
    }
    
    if (player.xp >= player.xpForNext) {
        player.xp -= player.xpForNext;
        player.level++;
        player.xpForNext = xpNeeded(player.level);
        levelUpFlashTimer = 1200;
    }
    createParticles(e.x, e.y, 8, '#aa0000');
}

function updateProjectiles(dt) {
    projectiles.forEach(p => {
        // === LOGIQUE COUTEAU (AVANT LES COLLISIONS) ===
        if (p.type === 'knife') {
            p.distance += Math.sqrt(p.vx*p.vx + p.vy*p.vy); // Mesure distance

            if (!p.returning && p.distance >= p.maxDist) {
                p.returning = true;
            }

            if (p.returning) {
                // Retour vers le joueur
                let angleToPlayer = Math.atan2(player.y - p.y, player.x - p.x);
                // Vitesse de retour accélérée
                p.vx = Math.cos(angleToPlayer) * 8; 
                p.vy = Math.sin(angleToPlayer) * 8;
                
                // Si proche du joueur, on supprime
                if (dist(p.x, p.y, player.x, player.y) < 20) {
                    p.remove = true;
                }
            } else {
                // Rotation visuelle pendant l'aller
                if (!p.rotation) p.rotation = 0;
                p.rotation += 0.3;
            }
        }
        if (p.isAoE && p.targetX !== undefined) {
            if (p.speed) {
                let angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
                p.x += Math.cos(angle) * p.speed;
                p.y += Math.sin(angle) * p.speed;
            } else {
                 p.x += p.vx; p.y += p.vy;
            }

            if (dist(p.x, p.y, p.targetX, p.targetY) < 10) {
                aoes.push({
                    x: p.targetX, y: p.targetY,
                    radius: p.radius, damage: p.damage,
                    duration: 500, start: performance.now()
                });
                p.remove = true;
                createParticles(p.targetX, p.targetY, 15, '#4444ff');
                Sounds.playRandom('sonbao', 4);
            }
        } 
        else {
            p.x += p.vx; p.y += p.vy;
            if (p.type === 'cle') p.rotation = (p.rotation || 0) + 0.2;

            for (let e of enemies) {
                if (dist(p.x, p.y, e.x, e.y) < e.size + 10) {
                    if (p.type === 'cle') {
                        if (!p.hitList.includes(e)) {
                            hitEnemy(e, p.damage);
                            p.hitList.push(e);
                            p.bounces--;
                            Sounds.playRandom('soncle', 4);
                            if (p.bounces > 0) {
                                let newTarget = null;
                                let minD = Infinity;
                                enemies.forEach(other => {
                                    if (other !== e && !p.hitList.includes(other)) {
                                        let d = dist(p.x, p.y, other.x, other.y);
                                        if (d < 300 && d < minD) { minD = d; newTarget = other; }
                                    }
                                });
                                if (newTarget) {
                                    let angle = Math.atan2(newTarget.y - p.y, newTarget.x - p.x);
                                    p.vx = Math.cos(angle) * 6;
                                    p.vy = Math.sin(angle) * 6;
                                } else { p.vx = -p.vx; p.vy = -p.vy; }
                            } else { p.remove = true; }
                        }
                    }
                    
                    else if (p.type === 'knife') {
                        if (!p.hitList) p.hitList = {};
                        
                        const now = performance.now();
                        const lastHitTime = p.hitList[e]; 
                        const cooldown = 500; 
                        if (!lastHitTime || (now - lastHitTime > cooldown)) {
                            hitEnemy(e, p.damage);
                            createParticles(p.x, p.y, 3, '#ffffff');
                            p.hitList[e] = now; 
                        }
                    }
                    
                    else {
                        hitEnemy(e, p.damage);
                        p.remove = true;
                        Sounds.playRandom('sonpao', 3);
                    }
                    createParticles(p.x, p.y, 3, '#ffff00');
                    break;
                }
            }

            // === COLLISION AVEC LES COFFRES (GCEM) ===
            if (!p.remove) { // Si le projectile n'a pas été détruit par un ennemi
                for (let g of gcems) {
                    if (dist(p.x, p.y, g.x, g.y) < g.size + 10) {
                        g.hp -= p.damage; // Infliger des dégâts au coffre
                        p.remove = true;  // Détruire le projectile
                        createParticles(g.x, g.y, 3, '#ffd700'); // Particules dorées
                        
                        if (g.hp <= 0) {
                            // Le coffre est cassé !
                            let goldAmount = player.level;
                            totalCoins += goldAmount;
                            updateCoinUI();
                            spawnDamageNumber(g.x, g.y - 20, `+${goldAmount} Or`);
                            // Effet visuel de pièces qui jaillissent
                            for(let i=0; i<goldAmount; i++) {
                                pieces.push({
                                    x: g.x + (Math.random()*40 - 20),
                                    y: g.y + (Math.random()*40 - 20),
                                    value: 1,
                                    scaleX: 1, scaleDir: -1, life: 10000, collected: false
                                });
                            }
                            g.hp = 0; // Marquer pour suppression
                        }
                        break; // On sort de la boucle des coffres
                    }
                }
            }
        }
        if(p.x<-50 || p.x>W+50 || p.y<-50 || p.y>H+50) p.remove = true;
    });
    projectiles = projectiles.filter(p => !p.remove);
}

function updateAoes(dt) {
    let now = performance.now();
    aoes.forEach(a => {
        if (a.type === 'lance-visuel' || a.type === 'slash-visuel') {
            if (player) { // Vérification de sécurité que le joueur existe
                a.x = player.x;
                a.y = player.y;
            }
        }
        if (a.type === 'slash-visuel') {
            
            enemies.forEach(e => {
                // Si l'ennemi n'a pas de liste de mémoires, on la crée
                if (!e.hitBySlash) e.hitBySlash = [];

                // 1. Vérifier si l'ennemi est dans la zone du coup
                let angToE = Math.atan2(e.y - player.y, e.x - player.x);
                let diff = angToE - a.angle;
                while(diff > Math.PI) diff -= Math.PI*2;
                while(diff < -Math.PI) diff += Math.PI*2;
                
                let inZone = Math.abs(diff) < a.cone/2 && dist(player.x, player.y, e.x, e.y) < 90;

                if (inZone) {
                    if (!e.hitBySlash.includes(a.id)) {
                        hitEnemy(e, a.damage);
                        e.hitBySlash.push(a.id);
                        if (!a.soundPlayed) {
                            Sounds.playRandom('soncoupecoupe', 4);
                            a.soundPlayed = true; // On marque le son comme joué
                        }
                    }
                }
             });
        } else {
            enemies.forEach(e => {
                if (dist(a.x, a.y, e.x, e.y) < a.radius) {
                    if (!e.hitByAoE) e.hitByAoE = [];
                    if (!e.hitByAoE.includes(a)) {
                        hitEnemy(e, a.damage);
                        e.hitByAoE.push(a);
                    }
                }
            });
        }
        gcems.forEach(g => {
            if (dist(a.x, a.y, g.x, g.y) < a.radius + g.size/2) {
                g.hp -= a.damage; // Inflige les dégâts de la zone
                createParticles(g.x, g.y, 2, '#ffd700');
            }
        });
        if (now - a.start > a.duration) a.remove = true;
    });
    aoes = aoes.filter(a => !a.remove);
    // Nettoyage des gcems détruits
    checkGcemDestruction();
}

function checkGcemDestruction() {
    gcems.forEach(g => {
        if (g.hp <= 0 && !g.destroyed) {
            g.destroyed = true; // Marqueur pour éviter double drop
            
            // Drop de pièces
            let goldAmount = player.level; 
            totalCoins += goldAmount;
            updateCoinUI();
            spawnDamageNumber(g.x, g.y - 20, `+${goldAmount} Or`);
            
            // Fait apparaître les pièces visuellement
            for(let i=0; i<goldAmount; i++) {
                pieces.push({
                    x: g.x + (Math.random()*40 - 20),
                    y: g.y + (Math.random()*40 - 20),
                    value: 1, scaleX: 1, scaleDir: -1, life: 10000, collected: false
                });
            }
        }
    });
    // Retire les gcems détruits de la liste
    gcems = gcems.filter(g => !g.destroyed);
}

function createParticles(x, y, count, color) {
    for(let i=0; i<count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
            life: 1.0, color: color, size: Math.random()*3+1
        });
    }
}
function updateParticles(dt) {
    particles.forEach(p => {
        if (p.isGhost) { p.life -= dt; }
        else { p.x += p.vx; p.y += p.vy; p.life -= 0.05; }
    });
    particles = particles.filter(p => p.life > 0);
}

function spawnDamageNumber(x, y, val, color = '#ffffff') { // Blanc par défaut
    damageNumbers.push({ 
        x: x+(Math.random()*20-10), 
        y: y, 
        text: val, 
        life: 1.0, 
        vy: -2,
        color: color // On stocke la couleur
    });
}
function updateDamageNumbers(dt) {
    damageNumbers.forEach(d => { d.y += d.vy; d.life -= 0.02; });
    damageNumbers = damageNumbers.filter(d => d.life > 0);
}

function updateHUD() {
    let hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    hpBar.style.width = `${hpPct}%`;
    hpText.innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;
    let xpPct = (player.xp / player.xpForNext) * 100;
    xpBar.style.width = `${xpPct}%`;
    lvlText.innerText = `Niv. ${player.level}`;
}

function updateSpellDock() {
    spellDock.innerHTML = '';
    const mySpells = Object.keys(player.spells).filter(k => player.spells[k] > 0);
    mySpells.forEach(k => {
        let div = document.createElement('div');
        div.className = 'spell-icon';
        div.style.backgroundImage = `url(${images[spellData[k].img].src})`;
        let lvl = document.createElement('div');
        lvl.className = 'spell-lvl';
        lvl.innerText = player.spells[k];
        div.appendChild(lvl);
        spellDock.appendChild(div);
    });
}

// --- Level Up Logic Updated ---
function levelUp() {
    pauseStartTime = performance.now();
    gameState = 'LEVELUP';
    Sounds.lowerMusic();
    keys.Z = false; keys.Q = false; keys.S = false; keys.D = false; keys.Space = false;
    mouseLeftDown = false;
    mouseRightDown = false;
    levelupMenu.classList.remove('hidden');
    
    let myActiveCount = activeSpells.filter(s => player.spells[s] > 0).length;
    let myPassiveCount = passiveSpells.filter(s => player.spells[s] > 0).length;

    let pool = [...activeSpells, ...passiveSpells];

    // On filtre les sorts comme avant
    pool = pool.filter(s => {
        let currentLvl = player.spells[s];
        // Si niveau max (5), on ne propose plus
        if (currentLvl >= 5) return false;

        if (activeSpells.includes(s)) {
            if (currentLvl === 0 && myActiveCount >= 2) return false;
        } else {
            if (currentLvl === 0 && myPassiveCount >= 4) return false;
        }
        return true;
    });

    // === DEBUT DE LA NOUVELLE LOGIQUE ==
    levelupChoicesDiv.innerHTML = '';

    // Si le pool est vide (niveau 31+ et tout est niveau 5)
    if (pool.length === 0) {
        // Proposer 2 choix alternatifs
        
        // Choix 1 : Potion
        let divPotion = document.createElement('div');
        
        // Calcul du soin (même logique que la boutique)
        let potLvl = shopUpgrades.potion.currentLevel;
        let healAmount;
        if (potLvl >= 10) healAmount = 130;
        else if (potLvl >= 9) healAmount = 105;
        else healAmount = potLvl * 10;
        // Minimum garanti si niveau 0 (théorique)
        if (healAmount === 0) healAmount = 10; 

        divPotion.className = 'card-choice';
        divPotion.innerHTML = `
            <img src="${images.potion.src}" class="card-img">
            <div class="card-info">
                <h3>Potion de Vie</h3>
                <p>Récupère ${healAmount} points de vie.</p>
            </div>
        `;
        divPotion.onclick = () => selectSpecialReward('potion');
        levelupChoicesDiv.appendChild(divPotion);

        // Choix 2 : Gros Coffre
        let divCoffre = document.createElement('div');
        divCoffre.className = 'card-choice';
        // On vérifie si l'image existe, sinon on met un texte
        let coffreImgSrc = images.gcem ? images.gcem.src : 'images/gcem.gif'; 
        divCoffre.innerHTML = `
            <img src="${coffreImgSrc}" class="card-img">
            <div class="card-info">
                <h3>Gros Coffre</h3>
                <p>Contient des pièces d'or (x${player.level}).</p>
            </div>
        `;
        divCoffre.onclick = () => selectSpecialReward('coffre');
        levelupChoicesDiv.appendChild(divCoffre);

    } else {
        // Logique normale : proposer 3 sorts
        let choices = [];
        for(let i=0; i<3; i++) {
            if(pool.length === 0) break;
            let idx = Math.floor(Math.random() * pool.length);
            choices.push(pool[idx]);
            pool.splice(idx, 1);
        }
        
        choices.forEach(key => {
            let current = player.spells[key];
            let div = document.createElement('div');
            div.className = 'card-choice';
            div.innerHTML = `
                <img src="${images[spellData[key].img].src}" class="card-img">
                <div class="card-info">
                    <h3>${spellData[key].name} [${current+1}]</h3>
                    <p>${spellData[key].desc}</p>
                </div>
            `;
            div.onclick = () => selectUpgrade(key);
            levelupChoicesDiv.appendChild(div);
        });
    }
}

function selectUpgrade(key) {
    if (pauseStartTime > 0) {
        totalPausedTime += (performance.now() - pauseStartTime);
        pauseStartTime = 0;
    }
    Sounds.restoreMusic();
    Sounds.play('clicvalidation');
    player.spells[key]++;
    if (activeSpells.includes(key) && player.spells[key] === 1) {
        if (!player.activeSlots[0]) player.activeSlots[0] = key;
        else if (!player.activeSlots[1]) player.activeSlots[1] = key;
    }
    updateSpellDock();
    levelupMenu.classList.add('hidden');
    gameState = 'PLAYING';
    player.hp = Math.min(player.maxHp, player.hp + 20);
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    gameoverMenu.classList.remove('hidden');
    Sounds.stopMusic(); 
    Sounds.stopArma();
    Sounds.play('songameover');

    // 1. Phrases humoristiques
    const phrases = [
        "Vous ferez mieux la prochaine fois.",
        "Les zombies apprécient votre donation.",
        "L'outre-monde remercie votre contribution.",
        "La mort n'est qu'un début... ou pas.",
        "Essayez de ne pas mourir la prochaine fois.",
        "Un de moins, il en reste tant.",
        "Votre âme a été délicieusement dévorée.",
        "C'était un repas plutôt qu'un combat.",
        "Retentez votre chance, citoyen.",
        "L'erreur est humaine, la mort est zombie.",
        "Bravo, vous avez servi de buffet pour l'apéro.",
        "La prochaine fois, essayez de courir plus vite que votre voisin.",
        "Vos restes ont été recyclés en décoration d'intérieur.",
        "Votre courage n'aura servi qu'à assaisonner votre chair.",
        "Le désert ne pardonne pas, mais il digère très bien.",
        "Une mort tragique... surtout pour la qualité de la viande.",
        "Merci pour ce moment de détente pour nos mâchoires.",
        "Votre contribution à la biomasse est notée.",
        "Respirez... ah non, en fait, ne respirez plus."
    ];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    document.getElementById('gameover-subtitle').innerText = randomPhrase;

    // 2. Mise à jour des statistiques
    document.getElementById('go-time').innerText = timerDiv.innerText;
    document.getElementById('go-level').innerText = player.level;
    document.getElementById('go-kills').innerText = killCount;

    // --- AJOUT DES TACHES DE SANG ---
    const stainCount = 15; // Nombre de taches à générer (tu peux changer ce chiffre)
    
    for (let i = 0; i < stainCount; i++) {
        const stain = document.createElement('img');
        stain.src = 'images/sang.png'; // On utilise l'image demandée
        stain.className = 'blood-stain'; // Une classe pour les retrouver plus tard
        
        // Style CSS pour les positionner aléatoirement
        stain.style.position = 'absolute';
        stain.style.zIndex = '0'; // Derrière le texte (qui est par-dessus)
        stain.style.top = Math.random() * 100 + '%'; // Position Y aléatoire
        stain.style.left = Math.random() * 100 + '%'; // Position X aléatoire
        
        // Rotation aléatoire
        const rotation = Math.random() * 360;
        
        // Taille aléatoire : L'image fait 23x18, on multiplie entre 2.5 et 4.5
        // Cela donnera une taille visible entre ~60px et ~100px
        const scale = 2.5 + Math.random() * 2; 
        
        stain.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        
        // Pour que les clics passent à travers les taches de sang (au cas où)
        stain.style.pointerEvents = 'none';
        
        gameoverMenu.appendChild(stain); // On ajoute la tache au menu
    }
}

// Gestion du bouton Retour (Home)
// Ajoutez cet événement avec les autres (près de btn-restart)
document.getElementById('btn-gameover-home').onclick = () => {
    gameoverMenu.classList.add('hidden');
    hud.classList.add('hidden');
    showHomeMenu();
};

function selectSpecialReward(type) {
    if (pauseStartTime > 0) {
        totalPausedTime += (performance.now() - pauseStartTime);
        pauseStartTime = 0;
    }
    Sounds.restoreMusic(); 
    Sounds.play('clicvalidation');
    if (type === 'potion') {
        // Calcul du soin
        let potLvl = shopUpgrades.potion.currentLevel;
        let healAmount;
        if (potLvl >= 10) healAmount = 130;
        else if (potLvl >= 9) healAmount = 105;
        else healAmount = potLvl * 10;
        if (healAmount === 0) healAmount = 10;

        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        spawnDamageNumber(player.x, player.y - 30, `+${healAmount} PV`, "#ff4444");
    } 
    else if (type === 'coffre') {
        let spawnX = player.x + 50;
        let spawnY = player.y;
        
        // Si ça dépasse de l'écran, on met à gauche
        if (spawnX > W - 20) spawnX = player.x - 50;

        // On crée le coffre
        gcems.push({
            x: spawnX,
            y: spawnY,
            hp: 30, // PV du coffre
            maxHp: 30,
            size: 32
        });
        
        // Petit effet visuel pour montrer où il est apparu
        createParticles(spawnX, spawnY, 10, '#ffd700');
    }

    // Fermer le menu et reprendre le jeu
    levelupMenu.classList.add('hidden');
    gameState = 'PLAYING';
}

document.getElementById('btn-restart').onclick = () => showStartMenu();

// --- DRAW FUNCTIONS ---

// dessiner les sprites sheets
function drawSprite(img, x, y, size, flip, state) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const config = spriteConfig[state];
    if (!config || !img.frameWidth) {
        ctx.drawImage(img, x - size/2, y - size/2, size, size);
        return;
    }

    const frameWidth = img.frameWidth;
    const frameHeight = img.height;

    // Animation basée sur le temps global
    const now = performance.now();
    const frameIndex = Math.floor(now / config.speed) % config.frames;

    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);

    ctx.drawImage(
        img, 
        frameIndex * frameWidth, 0, frameWidth, frameHeight, 
        -size/2, -size/2, size, size
    );
    
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    
    // Taches de sang
    bloodStains.forEach(b => {
        ctx.drawImage(images.sang, b.x - 10, b.y - 10, 20, 20);
    });

    // Ruines au sol
    ruines.forEach(r => {
        ctx.drawImage(r.img, r.x-30, r.y-30, 60, 60);
    });

        // === DESSINER LES COFFRES (GCEM) ===
    gcems.forEach(g => {
        ctx.drawImage(images.gcem, g.x - g.size/2, g.y - g.size/2, g.size, g.size);
        
        // Barre de vie du coffre
        let barWidth = 30;
        let hpPct = g.hp / g.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(g.x - barWidth/2, g.y - g.size/2 - 8, barWidth, 5);
        ctx.fillStyle = '#ffd700'; // Couleur or
        ctx.fillRect(g.x - barWidth/2, g.y - g.size/2 - 8, barWidth * hpPct, 5);
    });
    
    // Mines
    mines.forEach(m => {
        if(m.active) {
            ctx.drawImage(m.img, m.x-16, m.y-16, 32, 32);
        }
    });

    // Potions
    potions.forEach(p => {
        ctx.drawImage(images.potion, p.x-10, p.y-10, 20, 20);
    });

    //  Aimants
    magnets.forEach(m => {
        if (!m.collected) {
            ctx.drawImage(images.magne, m.x-10, m.y-10, 20, 20);
        }
    });

    // Dessiner les pièces
    drawPieces();
    
    // Projectiles
    projectiles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if(p.type === 'cle') {
            ctx.rotate(p.rotation);
        } 
        else if (p.type === 'knife') {
            // Le couteau tourne sur lui-même
            if (p.rotation) ctx.rotate(p.rotation);
        }
        else if(p.type === 'pile') {
            if(p.angle !== undefined) {
                ctx.rotate(p.angle + Math.PI/2);
            }
        }
        
        ctx.drawImage(p.img, -8, -8, 16, 16);
        ctx.restore();
    });
    
    // Bichons
    bichons.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        if(b.target && b.target.x < b.x) ctx.scale(-1,1);
        ctx.drawImage(images.bichon, -12, -12, 24, 24);
        ctx.restore();
    });

    // === TONDEUSES ===
    tondeuses.forEach(t => {
        let maxLoops = 1 + (player.spells.tondeuse - 1) * 2; // On récupère le niveau du joueur
        let currentSize = t.baseSize + (t.loopIndex * t.sizeGrowth);
        let halfSize = currentSize / 2;
        
        let relX, relY, angle = 0;
        
        // Calcul position (copie de la logique update)
        if (t.sideIndex === 0) { 
            relX = -halfSize + (t.t * currentSize); relY = -halfSize; angle = 0; 
        } 
        else if (t.sideIndex === 1) { 
            relX = halfSize; relY = -halfSize + (t.t * currentSize); angle = Math.PI / 2; 
        } 
        else if (t.sideIndex === 2) { 
            relX = halfSize - (t.t * currentSize); relY = halfSize; angle = Math.PI; 
        } 
        else { 
            relX = -halfSize; relY = halfSize - (t.t * currentSize); angle = -Math.PI / 2; 
        }

        let worldX = player.x + relX;
        let worldY = player.y + relY;

        ctx.save();
        ctx.translate(worldX, worldY);
        ctx.rotate(angle); // Rotation dans le sens du mouvement
        
        if (images.tondeuse) {
            ctx.drawImage(images.tondeuse, -16, -16, 32, 32);
        } else {
            // Fallback si l'image ne charge pas (cercle vert)
            ctx.fillStyle = '#0f0';
            ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
    });

    // Ennemis
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        let size = e.type === 'boss' ? 60 : 40;
        
        // Flash blanc
        if (e.flashTime > 0) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size/2, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Flip si le joueur est à gauche de l'ennemi
        let flip = player.x < e.x;
        
        // Dessin avec le helper
        drawSprite(e.img, 0, 0, size, flip, e.spriteKey);
        
        ctx.restore();
    });
    
    // Joueur
    if (player && player.hp > 0) {
        let flipPlayer = Math.abs(player.facing) > Math.PI/2;
        
        // Dessin Joueur
        let drawSize = player.size * 1.4; 
        drawSprite(images.player, player.x, player.y, drawSize, flipPlayer, 'player');
        
        // Livres
        if (hermitBooks.length > 0) {
             hermitBooks.forEach(b => {
                let bx = player.x + Math.cos(b.angle)*70;
                let by = player.y + Math.sin(b.angle)*70;
                ctx.drawImage(images.livre, bx-10, by-10, 20, 20);
             });
        }
        
        // Armageddon
        if (player.spells.armageddon > 0) {
             ctx.save();
             ctx.translate(player.x, player.y); 
             ctx.beginPath();
             ctx.arc(0, 0, 60 + player.spells.armageddon*20, 0, Math.PI*2);
             ctx.strokeStyle = `rgba(255, 50, 0, ${0.3 + Math.random()*0.2})`;
             ctx.lineWidth = 3;
             ctx.stroke();
             ctx.restore();
        }
    }
    
    // FX (AoE & Coupe Coupe)
    aoes.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        if (a.type === 'slash-visuel') {
            ctx.rotate(a.angle + Math.PI / 2); 
            
            if (a.img) {
                let largeurImg = 40;  
                let hauteurImg = 60;  
                ctx.drawImage(a.img, -largeurImg/2, -30 - 50, largeurImg, hauteurImg); 
            }
        } 
        else if (a.type === 'lance-visuel') {
            // Affichage du Lance-Pile
            ctx.rotate(a.angle + Math.PI); 
            if (a.img) {
                ctx.drawImage(a.img, -30, -10, 30, 20); 
            }
        }
        else {
            ctx.beginPath();
            ctx.arc(0, 0, a.radius, 0, Math.PI*2);
            ctx.fillStyle = `rgba(100, 100, 255, 0.3)`;
            ctx.fill();
        }
        ctx.restore();
    });
    
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.isGhost) {
            ctx.globalAlpha = p.life / 300;
            if (images.player && images.player.complete) {
                 ctx.drawImage(images.player, -16, -16, 32, 32);
            }
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    });
    
    damageNumbers.forEach(d => {
        ctx.save();
        // Utilisation de la couleur définie, avec l'opacité (life)
        ctx.fillStyle = d.color.replace(')', `, ${d.life})`).replace('rgb', 'rgba'); 
        
        // Si c'est une couleur hex (#...), on gère l'opacité différemment ou on laisse tel quel
        // Pour faire simple et efficace, voici la méthode adaptée à votre code existant :
        
        // On reconstruit la couleur avec opacité si besoin, ou on utilise fillStyle direct
        // Le plus simple pour votre code actuel :
        ctx.fillStyle = d.color; 
        ctx.globalAlpha = d.life; // L'opacité gère la disparition
        
        ctx.font = "bold 14px Verdana";
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(d.text, d.x, d.y);
        ctx.fillText(d.text, d.x, d.y);
        
        ctx.globalAlpha = 1; // Reset opacité
        ctx.restore();
    });

    if (levelUpFlashTimer > 0) {
        // Calcul du temps (0 à 1)
        let duration = 1000; // 1 seconde
        let progress = levelUpFlashTimer / duration; // 1.0 -> 0.0

        // 1. Flash Blanc (disparaît vite)
        let alphaFlash = Math.max(0, (progress - 0.5) * 2); // Disparait à mi-temps
        ctx.fillStyle = `rgba(255, 255, 255, ${alphaFlash * 0.6})`;
        ctx.fillRect(0, 0, W, H);

        // 2. Texte "LEVEL UP" Animé
        let textAlpha = progress; // Disparaît progressivement
        // Echelle : commence petit (0.5), grossit jusqu'à 1.2, puis revient à 1
        let textScale = 0.5 + (1 - progress) * 0.7; 
        
        ctx.save();
        ctx.translate(W / 2, H / 2); // On se place au centre
        ctx.scale(textScale, textScale); // On applique le zoom
        
        // Style du texte
        ctx.font = "bold 48px Verdana"; // Police grande
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Contour rouge
        ctx.strokeStyle = `rgba(255, 0, 0, ${textAlpha})`;
        ctx.lineWidth = 4;
        ctx.strokeText("LEVEL UP !", 0, 0);
        
        // Texte blanc
        ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`; // Blanc
        ctx.fillText("LEVEL UP !", 0, 0);
        
        ctx.restore();
    }
    // === EFFET VISUEL MAGNETISME (ASPIRATION) ===
    magnets.forEach(m => {
        if (m.collected && performance.now() < m.endTime) {
            
            // 1. Particules d'aspiration (Apparaissent sur les bords et vont vers le joueur)
            // On génère des particules un peu plus souvent pour un flux constant
            if (Math.random() < 0.4) { 
                // On choisit un bord au hasard
                let startX, startY;
                let side = Math.floor(Math.random() * 4);
                if (side === 0) { startX = Math.random() * W; startY = -10; }
                else if (side === 1) { startX = W + 10; startY = Math.random() * H; }
                else if (side === 2) { startX = Math.random() * W; startY = H + 10; }
                else { startX = -10; startY = Math.random() * H; }

                particles.push({
                    x: startX, y: startY,
                    // On calcule la direction vers le joueur
                    vx: (player.x - startX) * 0.03, 
                    vy: (player.y - startY) * 0.03,
                    life: 1.0, 
                    color: '#00ffff', // Couleur Cyan
                    size: Math.random() * 3 + 1
                });
            }

            // 2. Traînées derrière les pièces (Effet de vitesse)
            pieces.forEach(p => {
                if (!p.collected) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    // On dessine une ligne vers l'opposé du joueur
                    let angle = Math.atan2(player.y - p.y, player.x - p.x);
                    ctx.lineTo(
                        p.x - Math.cos(angle) * 15, 
                        p.y - Math.sin(angle) * 15
                    );
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    });
}

// --- SYSTEME DE PIECES ---

function spawnPiece(x, y) {
    pieces.push({
        x: x,
        y: y,
        value: 1,
        // Propriétés pour l'animation de rotation "horizontale"
        scaleX: 1,       // 1 = face visible, 0 = profil
        scaleDir: -1,    // Direction du retournement
        life: 10000,     // Temps de vie (ms)
        collected: false
    });
}

function updatePieces(dt) {
    // Récupération du niveau de magnétisme
    const magnetLvl = shopUpgrades.magnet.currentLevel;
    const magnetRange = magnetLvl > 0 ? shopUpgrades.magnet.baseValue + (magnetLvl * 10) : 0; // Base 30 + 10 par niveau

    pieces.forEach(p => {
        if (p.collected) return;

        // 1. Animation
        p.scaleX += p.scaleDir * (dt / 450);
        
        if (p.scaleX <= -1) {
            p.scaleDir = 1;
            p.scaleX = -1;
        } else if (p.scaleX >= 1) {
            p.scaleDir = -1;
            p.scaleX = 1;
        }

        // 2. Magnétisme (Attraction)
        if (magnetLvl > 0) {
            let d = dist(player.x, player.y, p.x, p.y);
            // Si la pièce est dans le rayon de magnétisme
            if (d < magnetRange && d > 5) { // d > 5 pour éviter les tremblements
                // On attire la pièce vers le joueur
                let angle = Math.atan2(player.y - p.y, player.x - p.x);
                let speed = 4; // Vitesse d'attraction
                p.x += Math.cos(angle) * speed;
                p.y += Math.sin(angle) * speed;
            }
        }

        // 3. Collision avec le joueur (Ramassage)
        let d = dist(player.x, player.y, p.x, p.y);
        if (d < player.size + 10) {
            p.collected = true;
            totalCoins += p.value;
            saveCoins(); // Sauvegarder les pièces dès qu'on en ramasse
            updateCoinUI();
            createParticles(p.x, p.y, 5, '#ffd700');
            spawnDamageNumber(p.x, p.y - 20 - Math.random()*10, "+1", "#00ff00");
        }

        // 4. Disparition (DÉSACTIVÉ)
        // p.life -= dt;
        // if (p.life <= 0) p.collected = true;
    });

    pieces = pieces.filter(p => !p.collected);
}

function updateCoinUI() {
    // Met à jour l'affichage dans le HUD
    const hudCoins = document.getElementById('coin-count-hud');
    if(hudCoins) hudCoins.innerText = totalCoins;

    // Met à jour l'affichage dans la Boutique
    const shopCoins = document.getElementById('coin-count-shop');
    if(shopCoins) shopCoins.innerText = totalCoins;
}

function drawPieces() {
    pieces.forEach(p => {
        if (p.collected) return;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Applique la rotation horizontale (scaleX)
        // Math.abs pour éviter d'inverser l'image, on veut juste réduire la largeur
        ctx.scale(Math.abs(p.scaleX), 1);
        
        // Dessine la pièce
        ctx.drawImage(images.piece, -10, -10, 20, 20); // Taille 20x20
        
        ctx.restore();
    });
}

function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }
function getClosestEnemy() {
    let best = null, minD = Infinity;
    enemies.forEach(e => {
        let d = dist(player.x, player.y, e.x, e.y);
        if (d < minD) { minD = d; best = e; }
    });
    return best;
}

window.addEventListener('keydown', e => {
    let k = e.key.toLowerCase();
    if(k==='z'||k==='arrowup') keys.Z=true;
    if(k==='q'||k==='arrowleft') keys.Q=true;
    if(k==='s'||k==='arrowdown') keys.S=true;
    if(k==='d'||k==='arrowright') keys.D=true;
    if(e.code === 'Space') keys.Space=true;
});
window.addEventListener('keyup', e => {
    let k = e.key.toLowerCase();
    if(k==='z'||k==='arrowup') keys.Z=false;
    if(k==='q'||k==='arrowleft') keys.Q=false;
    if(k==='s'||k==='arrowdown') keys.S=false;
    if(k==='d'||k==='arrowright') keys.D=false;
    if(e.code === 'Space') keys.Space=false;
});
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - r.left) * (W/r.width);
    mousePos.y = (e.clientY - r.top) * (H/r.height);
});
canvas.addEventListener('mousedown', e => {
    if(e.button===0) mouseLeftDown=true;
    if(e.button===2) mouseRightDown=true;
});
canvas.addEventListener('mouseup', e => {
    if(e.button===0) mouseLeftDown=false;
    if(e.button===2) mouseRightDown=false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
// Navigation Accueil
btnPlay.onclick = () => showStartMenu();
btnOptions.onclick = () => showOptionsMenu();
btnShop.onclick = () => showShopMenu();

// Retours
btnOptionsBack.onclick = () => quitToHome();
btnShopBack.onclick = () => showHomeMenu();
btnBackToHome.onclick = () => showHomeMenu();

// --- GESTION MENU PAUSE ---

function showPauseMenu() {
    if (gameState !== 'PLAYING') return;
    pauseStartTime = performance.now();
    gameState = 'PAUSE';
    pauseMenu.classList.remove('hidden');
}

function hidePauseMenu() {
    if (pauseStartTime > 0) {
        // On ajoute la durée de cette pause au total
        totalPausedTime += (performance.now() - pauseStartTime);
        pauseStartTime = 0; // On reset pour la prochaine fois
    }
    pauseMenu.classList.add('hidden');
    gameState = 'PLAYING';
}

function quitToHome() {
    Sounds.stopMusic();
    pauseMenu.classList.add('hidden');
    gameoverMenu.classList.add('hidden');
    hud.classList.add('hidden'); // Cache le HUD
    btnOptionsIngame.classList.add('hidden'); // Cache le bouton option
    showHomeMenu();
}

// Evenements clic
btnOptionsIngame.onclick = () => {
    if(gameState === 'PLAYING') showPauseMenu();
};

btnResumeGame.onclick = () => hidePauseMenu();
btnQuitGame.onclick = () => quitToHome();

// Gestion Touche Echap pour ouvrir/fermer le menu pause
window.addEventListener('keydown', e => {
    // ... (vos touches existantes) ...
    
    // Ajout pour Echap
    if (e.key === 'Escape') {
        if (gameState === 'PLAYING') showPauseMenu();
        else if (gameState === 'PAUSE') hidePauseMenu();
    }
});

// --- BOUTIQUE & UPGRADES ---

// Configuration des améliorations
const shopUpgrades = {
    hp: { currentLevel: 0, maxLevel: 10, baseCost: 25, costMultiplier: 1.2, baseValue: 25 }, 
    potion: { currentLevel: 0, maxLevel: 10, baseCost: 20, costMultiplier: 1.2, baseValue: 10 },     
    magnet: { currentLevel: 0, maxLevel: 10, baseCost: 10, costMultiplier: 1.2, baseValue: 30 },
    speed: { currentLevel: 0, maxLevel: 10, baseCost: 10, costMultiplier: 1.2, baseValue: 0.12 }
};

// Chargement des améliorations ET des pièces depuis le localStorage
function loadUpgrades() {
    // 1. Upgrades
    const data = localStorage.getItem('hordesUpgrades');
    if (data) {
        const saved = JSON.parse(data);
        for (let key in saved) {
            if (shopUpgrades[key]) {
                shopUpgrades[key].currentLevel = saved[key];
        }
        }
    }

    // 2. Pièces (Nouveau)
    const savedCoins = localStorage.getItem('hordesCoins');
    if (savedCoins) {
        totalCoins = parseInt(savedCoins) || 0;
    }
}

// Sauvegarde des améliorations
function saveUpgrades() {
    const data = {};
    for (let key in shopUpgrades) {
        data[key] = shopUpgrades[key].currentLevel;
    }
    localStorage.setItem('hordesUpgrades', JSON.stringify(data));
}

// Sauvegarde des pièces (Nouveau)
function saveCoins() {
    localStorage.setItem('hordesCoins', totalCoins.toString());
}

// Calcul du coût pour le niveau suivant
function getUpgradeCost(type) {
    const upgrade = shopUpgrades[type];
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.currentLevel));
}

// Logique d'achat
function buyUpgrade(type) {
    const upgrade = shopUpgrades[type];
    if (upgrade.currentLevel >= upgrade.maxLevel) return;

    const cost = getUpgradeCost(type);

    if (totalCoins >= cost) {
        totalCoins -= cost;
        upgrade.currentLevel++;
        
        // --- LOGIQUE SPECIALE POTION ---
        if (type === 'potion') {
            // On met à jour le soin en mémoire pour l'affichage et l'utilisation
            // Niveaux 1 à 8 : +10 PV
            // Niveaux 9 et 10 : +25 PV (le 10 cumule le bonus du 9)
            if (upgrade.currentLevel === 9) {
                upgrade.currentBonus = (upgrade.currentLevel - 1) * 10 + 25; // 8*10 + 25 = 105
            } else if (upgrade.currentLevel === 10) {
                upgrade.currentBonus = (upgrade.currentLevel - 2) * 10 + 25 + 25; // 8*10 + 50 = 130
            } else {
                upgrade.currentBonus = upgrade.currentLevel * 10;
            }
        }
        // ---------------------------------

        saveUpgrades();
        saveCoins();
        updateCoinUI();
        updateShopUI();
    }
}

// Mise à jour de l'affichage de la boutique
function updateShopUI() {
    // Mise à jour Pièces
    const shopCoins = document.getElementById('coin-count-shop');
    if(shopCoins) shopCoins.innerText = totalCoins;

    // Mise à jour PV
    const hpLvl = document.getElementById('shop-hp-level');
    const hpCost = document.getElementById('shop-hp-cost');
    const hpItem = document.getElementById('shop-item-hp');
    if (hpLvl) hpLvl.innerText = `Niveau actuel : ${shopUpgrades.hp.currentLevel}/${shopUpgrades.hp.maxLevel}`;
    if (hpCost) hpCost.innerText = getUpgradeCost('hp');
    if (hpItem) {
        if (shopUpgrades.hp.currentLevel >= shopUpgrades.hp.maxLevel) {
            hpItem.classList.add('disabled');
            if(hpCost) hpCost.innerText = "MAX";
        } else {
            hpItem.classList.remove('disabled');
        }
    }

    // Mise à jour Potions
    const potLvl = document.getElementById('shop-potion-level');
    const potCost = document.getElementById('shop-potion-cost');
    const potItem = document.getElementById('shop-item-potion');
    
    // Calcul du soin total actuel
    let currentHeal = 0;
    if (shopUpgrades.potion.currentLevel > 0) {
        // On recalcule ou on utilise la valeur stockée
        let lvl = shopUpgrades.potion.currentLevel;
        if (lvl >= 10) currentHeal = 130;
        else if (lvl >= 9) currentHeal = 105;
        else currentHeal = lvl * 10;
    }
    
    if (potLvl) potLvl.innerText = `Soin actuel : +${currentHeal} PV (${shopUpgrades.potion.currentLevel}/${shopUpgrades.potion.maxLevel})`;
    if (potCost) potCost.innerText = getUpgradeCost('potion');
    if (potItem) {
        if (shopUpgrades.potion.currentLevel >= shopUpgrades.potion.maxLevel) {
            potItem.classList.add('disabled');
            if(potCost) potCost.innerText = "MAX";
        } else {
            potItem.classList.remove('disabled');
        }
    }

    // Mise à jour Magnétisme
    const magLvl = document.getElementById('shop-magnet-level');
    const magCost = document.getElementById('shop-magnet-cost');
    const magItem = document.getElementById('shop-magnet');
    if (magLvl) magLvl.innerText = `Niveau actuel : ${shopUpgrades.magnet.currentLevel}/${shopUpgrades.magnet.maxLevel}`;
    if (magCost) magCost.innerText = getUpgradeCost('magnet');
    if (magItem) {
        if (shopUpgrades.magnet.currentLevel >= shopUpgrades.magnet.maxLevel) {
            magItem.classList.add('disabled');
            if(magCost) magCost.innerText = "MAX";
        } else {
            magItem.classList.remove('disabled');
        }
    }
    // Mise à jour Vitesse 
    const speedLvl = document.getElementById('shop-speed-level');
    const speedCost = document.getElementById('shop-speed-cost');
    const speedItem = document.getElementById('shop-item-speed');
    
    // Calcul de la vitesse actuelle pour l'affichage (1.5 + niveau*0.12)
    let currentSpeedVal = (1.5 + (shopUpgrades.speed.currentLevel * 0.12)).toFixed(2);
    
    if (speedLvl) speedLvl.innerText = `Vitesse : ${currentSpeedVal} (${shopUpgrades.speed.currentLevel}/${shopUpgrades.speed.maxLevel})`;
    if (speedCost) speedCost.innerText = getUpgradeCost('speed');
    if (speedItem) {
        if (shopUpgrades.speed.currentLevel >= shopUpgrades.speed.maxLevel) {
            speedItem.classList.add('disabled');
            if(speedCost) speedCost.innerText = "MAX";
        } else {
            speedItem.classList.remove('disabled');
        }
    }
}

function updateMagnets(dt) {
    // Durée de l'effet en millisecondes (5 secondes)
    const MAGNET_DURATION = 5000; 

    magnets.forEach(m => {
        if (m.collected) return;

        // 1. Collision avec le joueur (Ramassage)
        if (dist(player.x, player.y, m.x, m.y) < player.size + 15) {
            m.collected = true;
            m.endTime = performance.now() + MAGNET_DURATION;
            
            // Feedback
            Sounds.play('clicvalidation');
            spawnDamageNumber(player.x, player.y - 30, "MAGNÉTISME !", "#00ffff");
            createParticles(m.x, m.y, 10, '#00ffff');
        }
    });

    // 2. Effet d'attraction GLOBAL
    // On vérifie s'il existe au moins un aimant actif
    let isMagnetActive = magnets.some(m => m.collected && performance.now() < m.endTime);

    if (isMagnetActive) {
        // On parcourt TOUTES les pièces de la carte
        pieces.forEach(p => {
            if (p.collected) return;
            let angle = Math.atan2(player.y - p.y, player.x - p.x);
            
            // Vitesse d'attraction 
            let speed = 6; 
            p.x += Math.cos(angle) * speed;
            p.y += Math.sin(angle) * speed;
        });
    }

    magnets = magnets.filter(m => !m.collected || performance.now() < m.endTime);
}

// Initialisation de la boutique
function initShop() {
    loadUpgrades();
    
    // Assigner les événements aux boutons
    const hpBtn = document.getElementById('shop-item-hp');
    if (hpBtn) hpBtn.onclick = () => buyUpgrade('hp');
    const potBtn = document.getElementById('shop-item-potion');
    if (potBtn) potBtn.onclick = () => buyUpgrade('potion');
    const magBtn = document.getElementById('shop-item-magnet');
    if (magBtn) magBtn.onclick = () => buyUpgrade('magnet');
    const speedBtn = document.getElementById('shop-item-speed');
    if (speedBtn) speedBtn.onclick = () => buyUpgrade('speed');
    
    updateShopUI();
}



// --- GESTION PAGE AME ---

// Afficher le menu Ame
function showSoulMenu() {
    Sounds.play('clicmenu');
    homeMenu.classList.add('hidden');
    soulMenu.classList.remove('hidden');
    updateSoulStats();
}

// Cacher le menu Ame
function hideSoulMenu() {
    soulMenu.classList.add('hidden');
    showHomeMenu();
}

// Calculer et afficher les stats
function updateSoulStats() {
    const history = getGameHistory();
    
    // Calculs totaux
    let totalGames = history.length;
    let totalZombies = 0;
    let totalBoss = 0;
    
    history.forEach(game => {
        totalZombies += game.kills;
        totalBoss += game.boss;
    });

    totalGamesEl.innerText = totalGames;
    totalZombiesEl.innerText = totalZombies;
    totalBossEl.innerText = totalBoss;

    // Affichage historique
    historyContainer.innerHTML = '';
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<p style="color:#888; text-align:center;">Aucune âme enregistrée.</p>';
        return;
    }

    // --- TRI : Meilleur temps en premier ---
    // On copie le tableau pour ne pas modifier l'original
    let sortedHistory = [...history].sort((a, b) => {
        if (b.time !== a.time) return b.time - a.time; // Temps décroissant
        return b.level - a.level; // Si égalité, niveau décroissant
    });

    // On identifie la meilleure partieglobale (pour le style doré)
    // Note : Comme le tableau est trié, c'est forcément le premier, mais on garde la logique robuste
    let bestGame = sortedHistory[0]; 

    sortedHistory.forEach(game => {
        const isBest = (game === bestGame);
        const div = document.createElement('div');
        div.className = `history-entry ${isBest ? 'best' : ''}`;
        
        // Formatage du temps
        let m = Math.floor(game.time / 60);
        let s = game.time % 60;
        let timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;

        // Formatage de la date
        let dateStr = "Date inconnue";
        if (game.date) {
            let dateObj = new Date(game.date);
            // Format JJ/MM/AAAA HH:MM
            dateStr = dateObj.toLocaleDateString('fr-FR') + " " + dateObj.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        }

        // Structure compacte
        div.innerHTML = `
            <div>
                <span class="col-header">Temps</span>
                <span class="stat-value">${timeStr}</span>
            </div>
            <div>
                <span class="col-header">Niv</span>
                <span class="stat-value">${game.level}</span>
            </div>
            <div>
                <span class="col-header">Kills</span>
                <span class="stat-value">${game.kills}</span>
            </div>
            <div>
                <span class="col-header">Boss</span>
                <span class="stat-value">${game.boss}</span>
            </div>
            <div style="text-align: right; font-size: 11px; color: #aaa;">
                ${dateStr}
                ${isBest ? '<div style="color:#ffd700; font-weight:bold; font-size:10px;">⭐ RECORD</div>' : ''}
            </div>
        `;
        historyContainer.appendChild(div);
    });
}

// Sauvegarder une partie
function saveGameSession() {
    const history = getGameHistory();
    
    // Compter les boss tués
    let bossKills = 0;
    bossKills = bossKillCount; // Approximation : chaque ruine vient d'un boss mort
    
    const session = {
        time: elapsedSec,
        level: player.level,
        kills: killCount,
        boss: bossKills,
        date: Date.now()
    };

    history.push(session);
    // On garde seulement les 20 dernières parties pour ne pas surcharger
    if (history.length > 20) history.shift();
    
    localStorage.setItem('hordesHistory', JSON.stringify(history));
}

// Récupérer l'historique
function getGameHistory() {
    const data = localStorage.getItem('hordesHistory');
    return data ? JSON.parse(data) : [];
}

// Evenements Clic
btnSoul.onclick = () => showSoulMenu();
btnSoulBack.onclick = () => hideSoulMenu();

// Modification de triggerGameOver pour sauvegarder
const originalTriggerGameOver = triggerGameOver;
triggerGameOver = function() {
    saveGameSession(); // Sauvegarde avant d'afficher le game over
    originalTriggerGameOver(); // Appelle la fonction originale
};

// Navigation Accueil -> Changelog
if (btnChangelog) {
    btnChangelog.onclick = (e) => {
        e.preventDefault(); // Empêche le lien de recharger la page
        Sounds.play('clicmenu');
        homeMenu.classList.add('hidden');
        changelogMenu.classList.remove('hidden');
    };
}

// Retour Changelog -> Accueil
if (btnChangelogBack) {
    btnChangelogBack.onclick = () => {
        Sounds.play('clicretour');
        changelogMenu.classList.add('hidden');
        homeMenu.classList.remove('hidden');
    };
}

// --- CONNEXION DES SLIDERS OPTIONS ---

// Menu Options Principal
const musicSlider = document.getElementById('music-volume');
const sfxSlider = document.getElementById('sfx-volume');

if (musicSlider) {
    musicSlider.oninput = function() {
        Sounds.setMusicVolume(this.value);
    };
    // Init au chargement
    Sounds.setMusicVolume(musicSlider.value); 
}

if (sfxSlider) {
    sfxSlider.oninput = function() {
        Sounds.setSfxVolume(this.value);
    };
    Sounds.setSfxVolume(sfxSlider.value);
}

// Menu Pause (Ingame)
const pauseMusicSlider = document.getElementById('pause-music-volume');
const pauseSfxSlider = document.getElementById('pause-sfx-volume');

if (pauseMusicSlider) {
    // On synchronise avec la valeur du menu principal
    if(musicSlider) pauseMusicSlider.value = musicSlider.value;
    
    pauseMusicSlider.oninput = function() {
        Sounds.setMusicVolume(this.value);
        if(musicSlider) musicSlider.value = this.value; // Synchro
    };
}

if (pauseSfxSlider) {
    if(sfxSlider) pauseSfxSlider.value = sfxSlider.value;
    
    pauseSfxSlider.oninput = function() {
        Sounds.setSfxVolume(this.value);
        if(sfxSlider) sfxSlider.value = this.value; // Synchro
    };
}

// --- LOGIQUE REINITIALISATION ---

// Références DOM
const btnResetData = document.getElementById('btn-reset-data');
const confirmResetModal = document.getElementById('confirm-reset-modal');
const btnConfirmYes = document.getElementById('btn-confirm-reset-yes');
const btnConfirmNo = document.getElementById('btn-confirm-reset-no');

// Afficher la confirmation
if (btnResetData) {
    btnResetData.onclick = () => {
        confirmResetModal.classList.remove('hidden');
    };
}

// Annuler
if (btnConfirmNo) {
    btnConfirmNo.onclick = () => {
        confirmResetModal.classList.add('hidden');
    };
}

// Confirmer la réinitialisation
if (btnConfirmYes) {
    btnConfirmYes.onclick = () => {
        // 1. Vider le LocalStorage
        localStorage.removeItem('hordesUpgrades');
        localStorage.removeItem('hordesHistory');
        localStorage.removeItem('hordesCoins');
        // Si vous avez d'autres clés, ajoutez-les ici (ex: totalCoins si sauvegardé)

        // 2. Réinitialiser les variables en mémoire
        totalCoins = 0;
        shopUpgrades.hp.currentLevel = 0;
        shopUpgrades.potion.currentLevel = 0;
        shopUpgrades.magnet.currentLevel = 0;
        shopUpgrades.speed.currentLevel = 0;
        
        // 3. Mettre à jour l'interface
        updateCoinUI();
        updateShopUI();
        updateSoulStats(); // Vider l'historique affiché

        // 4. Fermer le modal et afficher un retour (optionnel)
        confirmResetModal.classList.add('hidden');
        
        // Petit feedback visuel (optionnel)
        const resetBtnSpan = btnResetData.querySelector('span');
        const originalText = resetBtnSpan.innerText;
        resetBtnSpan.innerText = "Effectué !";
        setTimeout(() => resetBtnSpan.innerText = originalText, 1500);
    };
}

// Permettre de fermer le modal en cliquant ailleurs (optionnel)
confirmResetModal.onclick = (e) => {
    if (e.target === confirmResetModal) {
        confirmResetModal.classList.add('hidden');
    }
};

// Charger les upgrades AVANT de lancer le jeu
loadUpgrades(); 

// Initialiser la boutique ===
initShop(); 

// Lancer la boucle principale
main(); 