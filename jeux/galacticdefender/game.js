// Accès aux éléments HTML
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const replayButton = document.getElementById('replay-button');
const menuButton = document.createElement('button');

// Déclarations des fichiers audio
const themeBase = new Audio('son/themebase.mp3');
const themeJeu = new Audio('son/themejeu.mp3');
const gameOverMusic = new Audio('son/gameover.mp3');
themeBase.volume = 0.5; 
themeJeu.volume = 0.7;  
gameOverMusic.volume = 1.0; 


// Configuration des boucles
themeBase.loop = true;
themeJeu.loop = true;
gameOverMusic.loop = false; // Pas besoin de boucle pour le Game Over

canvas.width = 320;
canvas.height = 480;

let isGameRunning = false;
let player, bullets, enemies, effects, powerUps, bossBullets, bossLaser, coinsArray;
let score = 0;
let lives = 10;
let boss = null;
let bossInterval;
let currentPowerUp = null;
let powerUpTimer;
let shootingInterval;
let level = 1;
let baseBossInterval = 30000;
let invincibilityTimer = null;
let keys = {};
let coins = 0; // Compteur de pièces
let levelText = "";
let levelTextTimer = 0; 
let warningAlphaDirection = 1; // 1 pour augmenter, -1 pour diminuer
let activePowerUp = null; // Contient l'image du dernier power-up ramassé
let powerUpTimeout = null; // Timer pour supprimer l'image
let activePowerUpImage = null
let enemyBullets = [];
let meteorites = [];
let isShieldActive = false; // Indique si le shield est actif

function showLevelText(level) {
    levelText = `Niveau ${level}`; // Définit le texte
    levelTextTimer = 1500; // Durée d'affichage
}

const background = new Image();
background.src = 'images/fond.png';
const coinImage = new Image();
coinImage.src = 'images/piece.png';

// Configuration du bouton Menu pour l'écran de fin
menuButton.innerText = "Menu";
menuButton.style.display = "none";
menuButton.style.position = "absolute";
menuButton.style.left = "50%";
menuButton.style.transform = "translateX(-50%)";
menuButton.style.top = "320px";
document.body.appendChild(menuButton);

// Ajout de l'événement de clic pour le bouton "Menu" pour revenir au menu principal sans lancer une nouvelle partie
menuButton.addEventListener('click', () => {
    backToMenu();
});

// Fonction pour revenir au menu sans lancer une nouvelle partie
function backToMenu() {
    isGameRunning = false;
    showMenu();
    playThemeBase(); 
}

function playThemeBase() {
    stopAllMusic();
    themeBase.play();
}

function playThemeJeu() {
    stopAllMusic();
    themeJeu.play();
}

function playGameOverMusic() {
    stopAllMusic();
    gameOverMusic.play();
}

function stopAllMusic() {
    themeBase.pause();
    themeBase.currentTime = 0;

    themeJeu.pause();
    themeJeu.currentTime = 0;

    gameOverMusic.pause();
    gameOverMusic.currentTime = 0;
}

// Fonction de réinitialisation du jeu
function resetGame() {
    isGameRunning = false;
    clearInterval(bossInterval);
    init();
}

// Fonctions de gestion de l'affichage des sections
function showMenu() {
    document.getElementById("menu").style.display = "block";
    document.getElementById("tutorial").style.display = "none";
    document.getElementById("shop").style.display = "none";
    replayButton.style.display = 'none';
    menuButton.style.display = 'none';
    playThemeBase();
}

// Fonctions pour afficher les tutoriels et la boutique
function showTutorial() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("tutorial").style.display = "block";
    document.getElementById("shop").style.display = "none";
    playThemeBase();
}

function showShop() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("shop").style.display = "block";
    document.getElementById("tutorial").style.display = "none";
    playThemeBase();

    const totalCoins = parseInt(localStorage.getItem('totalCoins')) || 0;
    document.getElementById("total-coins-display").innerText = totalCoins;

    const purchasedSkins = JSON.parse(localStorage.getItem('purchasedSkins')) || [];
    const purchasedBackgrounds = JSON.parse(localStorage.getItem('purchasedBackgrounds')) || [];

    // Bouton de sélection pour l’avion de base avec image d’aperçu
    document.getElementById("skin-button-base").innerHTML = `
        <div class="shop-item">
            <img src="images/avion.png" alt="Aperçu Avion de Base" class="preview-image">
            <button onclick="selectSkin('avion.png')">Sélectionner Avion de Base</button>
        </div>`;

    // Générer le bouton pour chaque skin en fonction de l'état d'achat, avec image d'aperçu
    if (purchasedSkins.includes('avion2.png')) {
        document.getElementById("skin-button-2").innerHTML = `
            <div class="shop-item">
                <img src="images/avion2.png" alt="Aperçu Avion 2" class="preview-image">
                <button onclick="selectSkin('avion2.png')">Sélectionner Avion 2</button>
            </div>`;
    } else {
        document.getElementById("skin-button-2").innerHTML = `
            <div class="shop-item">
                <img src="images/avion2.png" alt="Aperçu Avion 2" class="preview-image">
                <button onclick="buySkin('avion2.png', 25)">Acheter Avion 2 - 25 pièces</button>
            </div>`;
    }

    if (purchasedSkins.includes('avion3.png')) {
        document.getElementById("skin-button-3").innerHTML = `
            <div class="shop-item">
                <img src="images/avion3.png" alt="Aperçu Avion 3" class="preview-image">
                <button onclick="selectSkin('avion3.png')">Sélectionner Avion 3</button>
            </div>`;
    } else {
        document.getElementById("skin-button-3").innerHTML = `
            <div class="shop-item">
                <img src="images/avion3.png" alt="Aperçu Avion 3" class="preview-image">
                <button onclick="buySkin('avion3.png', 25)">Acheter Avion 3 - 25 pièces</button>
            </div>`;
    }

    if (purchasedSkins.includes('avion4.png')) {
        document.getElementById("skin-button-4").innerHTML = `
            <div class="shop-item">
                <img src="images/avion4.png" alt="Aperçu Avion 4" class="preview-image">
                <button onclick="selectSkin('avion4.png')">Sélectionner Avion 4</button>
            </div>`;
    } else {
        document.getElementById("skin-button-4").innerHTML = `
            <div class="shop-item">
                <img src="images/avion4.png" alt="Aperçu Avion 4" class="preview-image">
                <button onclick="buySkin('avion4.png', 25)">Acheter Avion 4 - 25 pièces</button>
            </div>`;
    }

    if (purchasedSkins.includes('avion5.png')) {
        document.getElementById("skin-button-5").innerHTML = `
            <div class="shop-item">
                <img src="images/avion5.png" alt="Aperçu Avion 5" class="preview-image">
                <button onclick="selectSkin('avion5.png')">Sélectionner Avion 5</button>
            </div>`;
    } else {
        document.getElementById("skin-button-5").innerHTML = `
            <div class="shop-item">
                <img src="images/avion5.png" alt="Aperçu Avion 5" class="preview-image">
                <button onclick="buySkin('avion5.png', 25)">Acheter Avion 5 - 25 pièces</button>
            </div>`;
    }

    // Bouton de sélection pour le fond de base avec image d’aperçu
    document.getElementById("background-button-base").innerHTML = `
        <div class="shop-item">
            <img src="images/fond.png" alt="Aperçu Fond de Base" class="preview-image">
            <button onclick="selectBackground('fond.png')">Sélectionner Fond de Base</button>
        </div>`;

    // Générer le bouton pour chaque background en fonction de l'état d'achat, avec image d'aperçu
    if (purchasedBackgrounds.includes('fond2.png')) {
        document.getElementById("background-button-2").innerHTML = `
            <div class="shop-item">
                <img src="images/fond2.png" alt="Aperçu Fond 2" class="preview-image">
                <button onclick="selectBackground('fond2.png')">Sélectionner Fond 2</button>
            </div>`;
    } else {
        document.getElementById("background-button-2").innerHTML = `
            <div class="shop-item">
                <img src="images/fond2.png" alt="Aperçu Fond 2" class="preview-image">
                <button onclick="buyBackground('fond2.png', 50)">Acheter Fond 2 - 50 pièces</button>
            </div>`;
    }

    if (purchasedBackgrounds.includes('fond3.png')) {
        document.getElementById("background-button-3").innerHTML = `
            <div class="shop-item">
                <img src="images/fond3.png" alt="Aperçu Fond 3" class="preview-image">
                <button onclick="selectBackground('fond3.png')">Sélectionner Fond 3</button>
            </div>`;
    } else {
        document.getElementById("background-button-3").innerHTML = `
            <div class="shop-item">
                <img src="images/fond3.png" alt="Aperçu Fond 3" class="preview-image">
                <button onclick="buyBackground('fond3.png', 50)">Acheter Fond 3 - 50 pièces</button>
            </div>`;
    }
}

function playThemeBase() {
    if (!themeBase.paused) return; // Ne pas relancer si déjà en cours
    stopAllMusic();
    themeBase.play();
}

function playThemeJeu() {
    stopAllMusic();
    themeJeu.play();
}

function playGameOverMusic() {
    stopAllMusic();
    gameOverMusic.play();
}

function stopAllMusic() {
    themeBase.pause();
    themeBase.currentTime = 0;

    themeJeu.pause();
    themeJeu.currentTime = 0;

    gameOverMusic.pause();
    gameOverMusic.currentTime = 0;
}

// Fonction pour démarrer le jeu
function startGame() {
    playThemeJeu();
    document.getElementById("menu").style.display = "none";
    document.getElementById("tutorial").style.display = "none";
    document.getElementById("shop").style.display = "none";

    // Masquer le texte "Game Over" s'il est visible
    const gameOverText = document.getElementById('game-over-text');
    if (gameOverText) {
        gameOverText.style.display = 'none';
    }

    // Supprimer le conteneur de boutons de Game Over
    const buttonContainer = document.getElementById('game-over-buttons');
    if (buttonContainer) {
        buttonContainer.style.display = 'none'; // Masquer au lieu de supprimer
    }

    init();
    isGameRunning = true;
    showLevelText(1);
}

// Fonction d'initialisation du jeu
function init() {
    player = new Player();
    bullets = [];
    enemies = [];
    powerUps = [];
    effects = [];
    bossBullets = [];
    bossLaser = null;
    boss = null;
    coinsArray = [];
    score = 0;
    lives = 3;
    coins = 0;
    level = 1;

    // Charger le skin et le fond sélectionnés
    const selectedSkin = localStorage.getItem('selectedSkin') || 'avion.png';
    player.image.src = `images/${selectedSkin}`;

    const selectedBackground = localStorage.getItem('selectedBackground') || 'fond.png';
    background.src = `images/${selectedBackground}`;

    startBossInterval();
    player.startShooting();
    replayButton.style.display = 'none';
    menuButton.style.display = 'none';
}


// Fonction pour lancer le Boss après un délai une fois le boss précédent vaincu
function startBossInterval() {
    clearInterval(bossInterval);
    bossInterval = setInterval(() => {
        if (!boss) boss = new Boss();
    }, baseBossInterval);
}

// Classe Player
class Player {
    constructor() {
        this.width = 45;
        this.height = 45;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.speed = 5;
        this.shootDelay = 300;
        this.shielded = false;
        this.invincible = false;
        this.doubleShot = false;
        this.image = new Image();
        this.image.src = 'images/avion.png';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }

    activateDoubleShot(duration) {
        this.doubleShot = true;
        // Désactive le mode double tir après la durée spécifiée
        setTimeout(() => {
            this.doubleShot = false;
        }, duration);
    }

    draw() {
        if (this.imageLoaded) {
            ctx.globalAlpha = this.invincible ? 0.5 : 1;
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = this.shielded ? 'cyan' : 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() {
        if (keys['ArrowLeft'] || keys['q'] || keys['Q']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;
        if (keys['ArrowUp'] || keys['z'] || keys['Z']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;

        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));
    }

    shoot() {
        if (this.doubleShot) {
            // Mode double tir : tire deux projectiles
            bullets.push(new Bullet(this.x + this.width / 4, this.y));
            bullets.push(new Bullet(this.x + (3 * this.width) / 4, this.y));
        } else {
            // Tir de base : un seul projectile
            bullets.push(new Bullet(this.x + this.width / 2, this.y));
        }
    }

    startShooting() {
        if (shootingInterval) clearInterval(shootingInterval);
        shootingInterval = setInterval(() => {
            this.shoot();
        }, this.shootDelay);
    }

    stopShooting() {
        clearInterval(shootingInterval);
        shootingInterval = null;
    }

    takeDamage() {
        if (this.invincible || this.shielded) {
            // Si le shield est actif, ignore les dégâts
            return;
        }

        lives--;
        this.invincible = true;
        spawnPlayerExplosion(this.x + this.width / 2, this.y + this.height / 2);
        checkGameOver();

        if (invincibilityTimer) clearTimeout(invincibilityTimer);
        invincibilityTimer = setTimeout(() => {
            this.invincible = false;
        }, 2000);
    }
}

// Classe Coin pour les pièces
class Coin {
    constructor() {
        this.x = Math.random() * (canvas.width - 20);
        this.y = -20;
        this.width = 20; 
        this.height = 20;
        this.imageLoaded = false;
    }

    draw() {
        if (coinImage.complete) {
            ctx.drawImage(coinImage, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() {
        this.y += 2;
    }
}

// Classe Bullet
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 3;
        this.height = 15;
    }

    draw() {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y -= 8;
    }
}

// Classe BossBullet
class BossBullet {
    constructor(x, y, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 20;
        this.speedX = speedX;
        this.speedY = speedY;
    }

    draw() {
        ctx.fillStyle = 'orange';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }
}

class Meteorite {
    constructor() {
        this.x = Math.random() * canvas.width; // Position horizontale aléatoire
        this.y = -50; // Commence hors de l'écran
        this.width = 15 + Math.random() * 15; // Taille entre 15px et 30px
        this.height = this.width; // Carré
        this.speed = 1 + Math.random() * 2; // Vitesse aléatoire entre 2 et 5
        this.rotation = 0; // Angle de rotation
        this.rotationSpeed = Math.random() * 0.1; // Vitesse de rotation
        this.isFixed = Math.random() < 0.5; // 50% chance d'être fixe
        this.image = new Image();
        const images = ['images/meteorite.png', 'images/meteorite2.png', 'images/meteorite3.png'];
        this.image = new Image();
        this.image.src = images[Math.floor(Math.random() * images.length)];
    }

    update() {
        // Descend la météorite
        this.y += this.speed;

        // Applique la rotation si elle n'est pas fixe
        if (!this.isFixed) {
            this.rotation += this.rotationSpeed;
        }
    }

    draw() {
        // Sauvegarde le contexte pour appliquer la rotation
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // Centre de rotation
        ctx.rotate(this.rotation); // Applique la rotation
        ctx.drawImage(
            this.image,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        ctx.restore(); // Restaure le contexte
    }
}


// Classe Enemy
class Enemy {
    constructor(x, y) {
        this.width = 40;
        this.height = 40;
        this.x = x !== undefined ? x : Math.random() * (canvas.width - this.width);
        this.y = y !== undefined ? y : -this.height;
        this.image = new Image();
        this.image.src = 'images/ennemi.png';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }

    draw() {
        if (this.imageLoaded) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() {
        this.y += 2;
    }
}

// Classe Enemy2
class Enemy2 extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.image.src = 'images/ennemi2.png';
    }

    update() {
        super.update();
        this.x += Math.sin(this.y / 20) * 2;
    }
}

// Classe Enemy3 avec déplacement horizontal et tirs
class Enemy3 {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = Math.random() < 0.5 ? 0 : canvas.width - this.width;
        this.y = Math.random() * 100 + 20;
        this.direction = this.x === 0 ? 1 : -1;
        this.image = new Image();
        this.image.src = 'images/ennemi3.png';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
        this.shootDelay = 1000 + Math.random() * 1000;
        this.lastShotTime = Date.now();
    }

    draw() {
        if (this.imageLoaded) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'purple';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() {
        this.x += this.direction * 3;
        if (this.x <= 0 || this.x + this.width >= canvas.width) this.direction *= -1;

        const now = Date.now();
        if (now - this.lastShotTime > this.shootDelay) {
            this.shootAtPlayer();
            this.lastShotTime = now;
        }
    }

    shootAtPlayer() {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    enemyBullets.push(new BossBullet(
        this.x + this.width / 2,
        this.y + this.height,
        4 * Math.cos(angle),
        4 * Math.sin(angle)
    ));
}
}
// class ennemi 4
class Enemy4 {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = Math.random() < 0.5 ? 0 : canvas.width - this.width; // Coin gauche ou droit
        this.y = canvas.height; // Position en bas de l'écran
        this.speed = 1; // Vitesse lente initiale
        this.image = new Image();
        this.image.src = 'images/ennemi4.png';
        this.hasTurned = false; // Indique si l'ennemi a effectué le virage
        this.rotation = 0; // Rotation initiale en radians
        this.isTurning = false; // Indique si le demi-tour est en cours
    }

    update() {
    if (!this.hasTurned) {
        // Monte jusqu'à effectuer le virage
        this.y -= this.speed;

        // Commence le demi-tour progressif près du point haut
        if (this.y <= canvas.height / 2 && !this.isTurning) {
            this.isTurning = true; // Déclenche la rotation
        }

        // Effectue une rotation progressive
        if (this.isTurning) {
            this.rotation += Math.PI / 60; // Augmente l'angle progressivement (60 frames pour un demi-tour)
            if (this.rotation >= Math.PI) { // Si le demi-tour est terminé
                this.isTurning = false;
                this.hasTurned = true;
                this.angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x); // Prépare la direction vers le joueur
            }
        }
    } else {
        // Se dirige vers le joueur après le virage
        this.x += this.speed * Math.cos(this.angleToPlayer);
        this.y += this.speed * Math.sin(this.angleToPlayer);
    }
}

    draw() {
    ctx.save(); // Sauvegarde l'état actuel du contexte

    // Déplace le centre de rotation à la position de l'ennemi
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // Applique la rotation
    ctx.rotate(this.rotation);

    // Dessine l'image de l'ennemi
    ctx.drawImage(
        this.image,
        -this.width / 2, // Repositionne le coin supérieur gauche après translation
        -this.height / 2,
        this.width,
        this.height
    );

    ctx.restore(); // Restaure l'état initial du contexte
}
}

// Classe Boss
class Boss {
    constructor() {
        this.width = 80;
        this.height = 80;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = 20;
        this.health = this.getBossHealth(level);
        this.shootDelay = Math.max(3000 - level * 200, 1200);
        this.lastShotTime = Date.now();
        this.image = new Image();
        this.image.src = level >= 4 ? 'images/boss2.png' : 'images/boss.png';
        this.imageLoaded = false;
        this.image.onload = () => {
        this.imageLoaded = true;
        };
        this.laserStage = 0; // Indicateur de l'état de l'attaque laser
        this.health = this.getBossHealth(level); // Points de vie dynamiques
        this.movementPattern = this.getMovementPattern(level); // Mouvement dynamique
    }
    getBossHealth(level) {
    if (level === 1) return 10;
    if (level === 2) return 20;
    if (level === 3) return 30;
    if (level === 4) return 40;
    if (level === 5) return 50;
    return 500 + (level - 5) * 50; // +50 PV pour chaque niveau au-delà de 5
}
    getMovementPattern(level) {
    if (level === 1) return 'horizontalSlow';
    if (level === 2) return 'horizontalFast';
    if (level === 3) return 'sinusoidal';
    if (level === 4) return 'figureEight';
    return ['horizontalSlow', 'horizontalFast', 'sinusoidal', 'figureEight'][Math.floor(Math.random() * 4)];
}

    activateLaser() {
    if (this.laserStage === 0) {
        this.laserStage = 1; // Phase d’avertissement
        bossLaser = new BossLaser(this.x + this.width / 4, this.y + this.height, this.width / 2);
        bossLaser.width = 2;

        // Phase d’avertissement : 3 secondes
        setTimeout(() => {
            if (this.laserStage === 1) {
                this.laserStage = 2; // Phase d’attaque
                if (bossLaser) bossLaser.startAttack();

                // Phase d’attaque : 1 seconde
                setTimeout(() => {
                    if (this.laserStage === 2) {
                        bossLaser = null; // Réinitialise le laser
                        this.laserStage = 0; // Réinitialise l'état
                    }
                }, 1000); // Phase finale strictement limitée à 1 seconde
            }
        }, 3000); // Phase d’avertissement strictement limitée à 3 secondes
    }
}

    draw() {
        if (this.imageLoaded) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'darkred';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, (this.health / (10 + level * 3)) * this.width, 5);
    }

    update() {
         switch (this.movementPattern) {
            case 'horizontalSlow':
                this.x += Math.sin(Date.now() / 500) * 1; // Lent aller-retour horizontal
                break;
            case 'horizontalFast':
                this.x += Math.sin(Date.now() / 300) * 3; // Rapide aller-retour horizontal
                break;
            case 'sinusoidal':
                this.x += Math.sin(Date.now() / 300) * 2; // Mouvement horizontal en vague
                this.y += Math.cos(Date.now() / 300) * 1; // Mouvement vertical en vague
                break;
            case 'figureEight':
                const t = Date.now() / 1000;
                this.x = canvas.width / 2 + Math.sin(t) * 100; // Mouvement horizontal en 8
                this.y = 50 + Math.sin(2 * t) * 50; // Mouvement vertical en 8
                break;
            default:
                // Mouvement par défaut : ton code actuel
                this.x += Math.sin(Date.now() / 500) * 2;
                this.y = Math.max(0, Math.min(this.y + Math.cos(Date.now() / 1000), canvas.height / 2 - this.height));
                break;
        }
        if (bossLaser) bossLaser.update(this.x + this.width / 4);
    }

    shootAtPlayer() {
    const now = Date.now();
    if (now - this.lastShotTime > this.shootDelay) {
        const bulletX = this.x + this.width / 2; // Position initiale X
        const bulletY = this.y + this.height;    // Position initiale Y

        // Tirs en fonction du niveau (max. 3 tirs pour éviter les abus)
        for (let i = 0; i < Math.min(level, 3); i++) {
            const angleOffset = (Math.PI / 8) * (i - 1); // Ajuste les angles
            const angle = Math.atan2(player.y - bulletY, player.x - bulletX) + angleOffset;

            bossBullets.push(new BossBullet(
                bulletX,
                bulletY,
                5 * Math.cos(angle), // Vitesse X
                5 * Math.sin(angle)  // Vitesse Y
            ));
        }

        this.lastShotTime = now; // Réinitialise le délai

        // Active le laser uniquement à partir du niveau 4
        if (level >= 4 && Math.random() < 0.3) {
            this.activateLaser();
        }
    }
}
}

// Classe BossLaser avec mise à jour de position
class BossLaser {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.targetWidth = width;
        this.width = 0; // Largeur initiale (laser invisible)
        this.height = canvas.height - y; // Hauteur du laser
        this.isExpanding = true; // Phase d’avertissement active
    }

    draw() {
    if (!this.isExpanding) {
        // Phase d’attaque
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.targetWidth, this.height);
    }
}

    update(bossX) {
    this.x = bossX; // Suit la position du boss
    if (this.isExpanding) {
        const increment = this.targetWidth / (3000 / (1000 / 60)); // Divise la largeur par le nombre d'itérations en 3 secondes à 60 FPS
        this.width = Math.min(this.width + increment, this.targetWidth); // Élargissement progressif
        if (this.width >= this.targetWidth) {
            this.isExpanding = false; // Passe à la phase d’attaque
        }
    }
}

    startAttack() {
        this.isExpanding = false; // Phase d’attaque
    }
}

// Classe PowerUp
class PowerUp {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (canvas.width - 20);
        this.y = -20;
        this.width = 20;
        this.height = 20;
        this.image = new Image();
        this.image.src = `images/${type}.png`;
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }

    draw() {
        if (this.imageLoaded) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.type === 'shield' ? 'cyan' : 'yellow';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() {
        this.y += 2;
    }

activate() {
    // Réinitialiser les effets du précédent power-up
    if (currentPowerUp) {
        if (currentPowerUp === 'rapidFire') {
            player.shootDelay = 300;
            player.startShooting();
        }
        if (currentPowerUp === 'shield') {
            player.shielded = false;
        }
        if (currentPowerUp === 'doubleShot') {
            player.doubleShot = false;
        }
    }

    currentPowerUp = this.type; // Active le nouveau power-up

    if (this.type === 'shield') {
        player.shielded = true;
    }

    if (this.type === 'rapidFire') {
        player.shootDelay = 150;
        player.startShooting();
    }

    if (this.type === 'doubleShot') {
        player.doubleShot = true;
    }

    // Mettre à jour l'image du power-up actif
    activePowerUpImage = new Image();
    activePowerUpImage.src = `images/${this.type}.png`;

    // Définir la durée du power-up
    clearTimeout(powerUpTimeout); // Annule l'ancien timer actif
    powerUpTimeout = setTimeout(() => {
        if (currentPowerUp === this.type) {
            currentPowerUp = null;
            activePowerUpImage = null; // Réinitialise l'image du power-up actif
            if (this.type === 'rapidFire') {
                player.shootDelay = 300;
                player.startShooting();
            }
            if (this.type === 'shield') {
                player.shielded = false;
            }
            if (this.type === 'doubleShot') {
                player.doubleShot = false;
            }
        }
    }, 10000); // Durée du power-up (10 secondes)
}
}

// Classe Effect pour les animations d'impact
class Effect {
    constructor(x, y, color, width, height, duration) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = width;
        this.height = height;
        this.duration = duration;
        this.startTime = Date.now();
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    isExpired() {
        return Date.now() - this.startTime > this.duration;
    }
}

function drawActivePowerUp() {
    if (activePowerUpImage) {
        // Affiche l'image en bas à gauche de l'écran
        ctx.drawImage(activePowerUpImage, 10, canvas.height - 60, 50, 50);
    }
}

// Boucle de jeu
function getEnemySpawnRates(level) {
    // Définir les taux de spawn pour chaque classe d'ennemi en fonction du niveau
    const baseRate = 0.01; // Probabilité de base pour Enemy
    const scalingFactor = 0.002; // Augmentation progressive par niveau

    return {
        Enemy: baseRate + level * scalingFactor, // Ennemi de base
        Enemy2: level >= 2 ? (baseRate / 2 + (level - 2) * scalingFactor) : 0, // Débloqué au niveau 2
        Enemy3: level >= 3 ? (baseRate / 4 + (level - 3) * scalingFactor) : 0, // Débloqué au niveau 3
    };
}

//
function gameLoop() {
    if (!isGameRunning) return;

    // Dessiner l'arrière-plan
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Affichage du texte de passage de niveau (si actif)
    if (levelTextTimer > 0) {
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(levelText, canvas.width / 2, canvas.height / 2);
        levelTextTimer -= 16;
    }

    // Mise à jour et dessin du joueur
    player.update();
    player.draw();

    // Gestion des projectiles des ennemis normaux
    enemyBullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        bullet.draw();
        if (detectCollision(bullet, player)) {
            player.takeDamage();
            enemyBullets.splice(bulletIndex, 1);
        }
        if (bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
            enemyBullets.splice(bulletIndex, 1);
        }
    });

    // Gestion des projectiles du joueur
    bullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        bullet.draw();
        if (bullet.y < 0) bullets.splice(bulletIndex, 1);

        // Détection des collisions avec les ennemis
        enemies.forEach((enemy, enemyIndex) => {
            if (detectCollision(bullet, enemy)) {
                spawnEnemyExplosion(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    enemy.width,
                    enemy.height
                );
                bullet.y = -100;
                enemies.splice(enemyIndex, 1);
                score += 10;
            }
        });

        // Détection des collisions avec le boss
        if (boss && detectCollision(bullet, boss)) {
            bullet.y = -100;
            boss.health--;
            if (boss.health <= 0) {
                spawnBossExplosion(
                    boss.x + boss.width / 2,
                    boss.y + boss.height / 2
                );
                boss = null;
                bossBullets = [];
                levelUp();
            }
        }

        // Vérification du laser du boss
        if (bossLaser && detectCollision(bossLaser, player)) {
            if (!player.shielded) {
                lives--; // Réduit le nombre de vies seulement si le shield est inactif
                if (lives <= 0) {
                    endGame(); // Appelle la fonction de fin de jeu
                }
            }
            bossLaser = null; // Réinitialise le laser après un impact
        }
    });

    // Gestion des tirs des boss
    if (boss) {
        boss.update();
        boss.shootAtPlayer();
        boss.draw();
    }

    // Gestion du laser du boss
    if (bossLaser) {
        if (bossLaser.isExpanding) {
            drawWarningCorners(); // Dessine les coins rouges avec le dégradé
        }

        bossLaser.update(boss.x + boss.width / 4); // Suit la position du boss
        bossLaser.draw(); // Dessine le laser (attaque)
    }

    // Gestion des projectiles du boss
    bossBullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        bullet.draw();

        if (detectCollision(bullet, player)) {
            if (!player.shielded) {
                player.takeDamage();
            }
            bossBullets.splice(bulletIndex, 1);
        }

        if (bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
            bossBullets.splice(bulletIndex, 1);
        }
    });

    // Génération des ennemis si aucun boss n'est actif
    if (!boss) {
        const spawnRates = getEnemySpawnRates(level);

        if (Math.random() < spawnRates.Enemy) enemies.push(new Enemy());
        if (Math.random() < spawnRates.Enemy2) enemies.push(new Enemy2());
        if (Math.random() < spawnRates.Enemy3) enemies.push(new Enemy3());
        if (level >= 4 && Math.random() < 0.002) {
            enemies.push(new Enemy4());
        }
    }
    if (Math.random() < 0.003) { // 0.3 % de chance par frame
        meteorites.push(new Meteorite());
    }

    // Mise à jour et dessin des ennemis
    enemies.forEach((enemy, enemyIndex) => {
        enemy.update();
        enemy.draw();
        if (detectCollision(player, enemy)) {
            enemies.splice(enemyIndex, 1);

            // Appliquer les dégâts seulement si le shield est inactif
            if (!player.shielded) {
                player.takeDamage();
            }
        }
    });

    if (!boss && Math.random() < 0.001) { // %chance par frame
        const types = ['rapidFire', 'doubleShot', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(type));
    }

    // Gestion des power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.update();
        powerUp.draw();
        if (detectCollision(powerUp, player)) {
            powerUp.activate();
            powerUps.splice(index, 1);
        }
    });

    if (Math.random() < 0.002 + level * 0.0002) { // % de chance par frame
        coinsArray.push(new Coin());
    }

    drawEnemyExplosion();

    // Dessiner les interfaces utilisateur
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText("Score: " + score, 40, 30);
    ctx.fillText("Vies: " + lives, 40, 50);
    ctx.fillText("Niveau: " + level, 40, 70);
    ctx.fillText(coins, canvas.width - 50, 30);
    ctx.drawImage(coinImage, canvas.width - 30, 18, 16, 16);

    // Mise à jour et dessin des météorites
    meteorites.forEach((meteorite, index) => {
        meteorite.update();
        meteorite.draw();

        // Si la météorite sort de l'écran, la supprimer
        if (meteorite.y > canvas.height) {
            meteorites.splice(index, 1);
        }

        // Détection de collision avec le joueur
        if (detectCollision(player, meteorite)) {
            player.takeDamage(); // Le joueur subit des dégâts
            meteorites.splice(index, 1); // Supprime la météorite après collision
        }
    });

    drawActivePowerUp();
    drawEffects();

    coinsArray.forEach((coin, index) => {
        coin.update(); // Mise à jour de la position
        coin.draw();   // Dessin de la pièce

        // Détection de collision avec le joueur
        if (detectCollision(player, coin)) {
            coins++; // Ajoute au compteur
            coinsArray.splice(index, 1); // Retire la pièce après collecte

            // Sauvegarde le nombre total de pièces
            let totalCoins = parseInt(localStorage.getItem('totalCoins')) || 0;
            totalCoins += 1;
            localStorage.setItem('totalCoins', totalCoins);
        }

        // Supprime les pièces hors écran
        if (coin.y > canvas.height) {
            coinsArray.splice(index, 1);
        }
    });
}

function drawWarningCorners() {
    const gradientSize = canvas.width / 3; // Taille du dégradé dans les coins

    // Coin supérieur gauche
    const gradientTL = ctx.createLinearGradient(0, 0, gradientSize, gradientSize);
    gradientTL.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradientTL.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradientTL;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(gradientSize, 0);
    ctx.lineTo(0, gradientSize);
    ctx.closePath();
    ctx.fill();

    // Coin supérieur droit
    const gradientTR = ctx.createLinearGradient(canvas.width, 0, canvas.width - gradientSize, gradientSize);
    gradientTR.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradientTR.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradientTR;
    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width - gradientSize, 0);
    ctx.lineTo(canvas.width, gradientSize);
    ctx.closePath();
    ctx.fill();

    // Coin inférieur gauche
    const gradientBL = ctx.createLinearGradient(0, canvas.height, gradientSize, canvas.height - gradientSize);
    gradientBL.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradientBL.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradientBL;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(gradientSize, canvas.height);
    ctx.lineTo(0, canvas.height - gradientSize);
    ctx.closePath();
    ctx.fill();

    // Coin inférieur droit
    const gradientBR = ctx.createLinearGradient(canvas.width, canvas.height, canvas.width - gradientSize, canvas.height - gradientSize);
    gradientBR.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradientBR.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradientBR;
    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width - gradientSize, canvas.height);
    ctx.lineTo(canvas.width, canvas.height - gradientSize);
    ctx.closePath();
    ctx.fill();
}

function spawnMeteorites(count) {
    for (let i = 0; i < count; i++) {
        meteorites.push(new Meteorite());
    }
}

function buySkin(skin, price) {
    let totalCoins = parseInt(localStorage.getItem('totalCoins')) || 0;
    let purchasedSkins = JSON.parse(localStorage.getItem('purchasedSkins')) || [];

    // Vérifie si le skin est déjà acheté
    if (purchasedSkins.includes(skin)) {
        alert("Vous possédez déjà ce skin. Utilisez le bouton de sélection.");
        return;
    }

    if (totalCoins >= price) {
        totalCoins -= price;
        purchasedSkins.push(skin); // Ajoute le skin à la liste des skins achetés

        // Met à jour le localStorage
        localStorage.setItem('totalCoins', totalCoins);
        localStorage.setItem('purchasedSkins', JSON.stringify(purchasedSkins));
        localStorage.setItem('selectedSkin', skin); // Définit comme skin sélectionné
        document.getElementById("total-coins-display").innerText = totalCoins;
        alert("Skin acheté et sélectionné avec succès !");
    } else {
        alert("Vous n'avez pas assez de pièces !");
    }
}

function selectSkin(skin) {
    let purchasedSkins = JSON.parse(localStorage.getItem('purchasedSkins')) || [];

    // Permet de sélectionner l'avion de base sans vérification d'achat
    if (skin === 'avion.png' || purchasedSkins.includes(skin)) {
        localStorage.setItem('selectedSkin', skin);
        alert("Skin sélectionné !");
    } else {
        alert("Vous ne possédez pas ce skin.");
    }
}

function buyBackground(background, price) {
    let totalCoins = parseInt(localStorage.getItem('totalCoins')) || 0;
    let purchasedBackgrounds = JSON.parse(localStorage.getItem('purchasedBackgrounds')) || [];

    // Vérifie si le background est déjà acheté
    if (purchasedBackgrounds.includes(background)) {
        alert("Vous possédez déjà ce fond d'écran. Utilisez le bouton de sélection.");
        return;
    }

    if (totalCoins >= price) {
        totalCoins -= price;
        purchasedBackgrounds.push(background); // Ajoute le fond à la liste des fonds achetés

        // Met à jour le localStorage
        localStorage.setItem('totalCoins', totalCoins);
        localStorage.setItem('purchasedBackgrounds', JSON.stringify(purchasedBackgrounds));
        localStorage.setItem('selectedBackground', background); // Définit comme background sélectionné
        document.getElementById("total-coins-display").innerText = totalCoins;
        alert("Fond d'écran acheté et sélectionné avec succès !");
    } else {
        alert("Vous n'avez pas assez de pièces !");
    }
}

function selectBackground(background) {
    let purchasedBackgrounds = JSON.parse(localStorage.getItem('purchasedBackgrounds')) || [];

    // Permet de sélectionner le fond de base sans vérification d'achat
    if (background === 'fond.png' || purchasedBackgrounds.includes(background)) {
        localStorage.setItem('selectedBackground', background);
        alert("Fond d'écran sélectionné !");
    } else {
        alert("Vous ne possédez pas ce fond d'écran.");
    }
}

// Détection de collision
function detectCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// Fonction pour Explosion Boss
function spawnBossExplosion(x, y) {
    effects.push({
        x: x,
        y: y,
        radius: 10,
        maxRadius: 100,
        alpha: 1,
    });
}

function drawBossExplosion() {
    effects = effects.filter(explosion => {
        ctx.fillStyle = `rgba(255, 0, 0, ${explosion.alpha})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        explosion.radius += 5; // Explosion grandissante
        explosion.alpha -= 0.03; // Diminue l'opacité
        return explosion.alpha > 0;
    });
}

// Fonction pour explosion ennemi
function spawnEnemyExplosion(x, y, width, height) {
    const maxRadius = Math.max(width, height) * 0.5; // Rayon final réduit
    effects.push({
        x: x,
        y: y,
        radius: 0, // Rayon initial
        maxRadius: maxRadius, // Taille finale
        alpha: 1, // Opacité initiale
        draw() { // Méthode pour dessiner l'explosion
            ctx.globalCompositeOperation = "source-over"; // Empêche les mélanges
            ctx.fillStyle = `rgba(255, 0, 0, ${this.alpha})`; // Rouge pur avec opacité
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            this.radius = Math.min(this.radius + 2, this.maxRadius); // Augmente lentement le rayon
            this.alpha -= 0.05; // Réduit l'opacité progressivement
        }
    });
}

function drawEnemyExplosion() {
    effects = effects.filter(explosion => {
        ctx.fillStyle = `rgba(255, 150, 0, ${explosion.alpha})`; // Couleur orange pour les ennemis
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        explosion.radius = Math.min(explosion.radius + 2, explosion.maxRadius);
        explosion.alpha -= 0.05; // Réduction progressive de l'opacité
        return explosion.alpha > 0;
    });
}

function spawnPlayerExplosion(x, y) {
    effects.push({
        x: x,
        y: y,
        radius: 10, // Rayon initial plus grand que celui des ennemis
        maxRadius: 40, // Taille finale moyenne
        alpha: 1, // Opacité initiale
    });
}

function drawPlayerExplosion() {
    effects = effects.filter(explosion => {
        ctx.fillStyle = `rgba(255, 50, 50, ${explosion.alpha})`; // Couleur rouge pour le joueur
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        explosion.radius += 3; // Augmentation lente du rayon
        explosion.alpha -= 0.03; // Réduction progressive de l'opacité
        return explosion.alpha > 0;
    });
}

// Fonction pour la désintégration.
function spawnPlayerDestruction(x, y) {
    for (let i = 0; i < 20; i++) {
        effects.push({
            x: x + Math.random() * 40 - 20,
            y: y + Math.random() * 40 - 20,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            alpha: 1,
            size: Math.random() * 5 + 3,
            color: 'rgba(255, 50, 50, 1)',
        });
    }
}

function drawEffects() {
    effects = effects.filter(effect => {
        if (effect.color) {
            ctx.fillStyle = effect.color;
        } else {
            ctx.fillStyle = `rgba(255, 255, 50, ${effect.alpha})`;
        }
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size || effect.radius, 0, Math.PI * 2);
        ctx.fill();
        effect.x += effect.vx || 0;
        effect.y += effect.vy || 0;
        if (effect.radius) {
            effect.radius += 2; // Explosion grandissante
        }
        effect.alpha -= 0.02; // Diminue l'opacité
        return effect.alpha > 0;
    });
}

// Fonction de niveau supérieur
function levelUp() {
    level++;
    showLevelText(level);
    score += 100;
    startBossInterval();
}

// Fonction de Game Over
function gameOver() {
    isGameRunning = false;
    clearInterval(bossInterval);
    player.stopShooting();
    playGameOverMusic();

    // Affiche le texte "Game Over"
    const gameOverText = document.getElementById('game-over-text');
    if (gameOverText) {
        gameOverText.style.display = 'block';
    }

    const gameContainer = document.getElementById('game-container');

    // Vérifiez si le conteneur de boutons existe déjà
    let buttonContainer = document.getElementById('game-over-buttons');
    if (!buttonContainer) {
        // Crée un nouveau conteneur de boutons s'il n'existe pas
        buttonContainer = document.createElement('div');
        buttonContainer.id = 'game-over-buttons';
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.top = '60%'; // Position sous le texte "Game Over"
        buttonContainer.style.left = '50%';
        buttonContainer.style.transform = 'translate(-50%, -50%)';
        gameContainer.appendChild(buttonContainer);

        const replayButton = document.createElement('button');
        replayButton.innerText = 'Rejouer';
        replayButton.onclick = startGame;
        replayButton.style.margin = "10px"; // Espacement des boutons
        buttonContainer.appendChild(replayButton);

        const menuButton = document.createElement('button');
        menuButton.innerText = 'Menu';
        menuButton.onclick = function () {
            const gameOverText = document.getElementById('game-over-text');
            if (gameOverText) {
                gameOverText.style.display = 'none';
            }
            clearGameScreen();
            showMenu();
        };
        menuButton.style.margin = "10px"; // Espacement des boutons
        buttonContainer.appendChild(menuButton);
    } else {
        // Si le conteneur existe déjà, assurez-vous qu'il est visible
        buttonContainer.style.display = 'block';
    }
}


// Vérification de Game Over
function checkGameOver() {
    if (lives <= 0) {
        gameOver();
    }
}

function endGame() {
    gameOver(); // Appelle directement la fonction gameOver
}

function clearGameScreen() {
    // Efface le canvas en remplissant l'arrière-plan avec une couleur, par exemple noir
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Masquer l'écran de game over
    const gameOverDiv = document.getElementById('game-over-buttons');
    if (gameOverDiv) {
        gameOverDiv.style.display = 'none';
    }
}


// Gestion des touches pour les déplacements
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') player.startShooting();
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ') player.stopShooting();
});

function resetProgress() {
    // Alerte de confirmation
    const confirmation = confirm("Êtes-vous sûr de vouloir réinitialiser votre progression ? Cette action est irréversible.");
    
    if (confirmation) {
        // Si le joueur confirme, réinitialise les données

        // Réinitialise les pièces à zéro
        localStorage.setItem('totalCoins', 0);

        // Réinitialise les skins et fonds d'écran achetés
        localStorage.setItem('purchasedSkins', JSON.stringify([]));
        localStorage.setItem('purchasedBackgrounds', JSON.stringify([]));

        // Définit l'avion et le fond de base comme sélectionnés
        localStorage.setItem('selectedSkin', 'avion.png');
        localStorage.setItem('selectedBackground', 'fond.png');

        // Met à jour l'affichage des pièces dans la boutique
        document.getElementById("total-coins-display").innerText = 0;

        // Message de confirmation de réinitialisation
        alert("Votre progression a été réinitialisée !");
    } else {
        // Si le joueur annule, affiche un message d'annulation
        alert("Réinitialisation annulée.");
    }
}

window.onload = function () {
    showMenu();
};

// Lancement de la boucle de jeu
setInterval(gameLoop, 16); // 60 FPS

let isMuted = false;

function toggleMute() {
    isMuted = !isMuted;

    // Mettez à jour l'icône du bouton
    const muteButton = document.getElementById("mute-button");
    muteButton.textContent = isMuted ? "🔇" : "🔊";

    // Coupez ou réactivez la musique
    const allAudioElements = [themeBase, themeJeu, gameOverMusic];
    allAudioElements.forEach(audio => {
        audio.muted = isMuted;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltip = document.createElement('div'); // Crée un élément pour le tooltip
    tooltip.id = 'tooltip';
    tooltip.style.display = 'none';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);

    const logo = document.getElementById('toncplay-logo');

    if (logo) {
        // Montrer le tooltip
        logo.addEventListener('mouseenter', (e) => {
            const text = logo.getAttribute('data-tooltip');
            if (text) {
                tooltip.textContent = text;
                tooltip.style.display = 'block';
            }
        });

        // Déplacer le tooltip avec la souris
        logo.addEventListener('mousemove', (e) => {
            tooltip.style.left = e.pageX + 10 + 'px'; // Position horizontale
            tooltip.style.top = e.pageY + 10 + 'px'; // Position verticale
        });

        // Cacher le tooltip
        logo.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }
});

