// Sélection du canvas et initialisation du contexte
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Mise à l'échelle du canvas
canvas.width = 1024;
canvas.height = 768;

// Variables du jeu
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let lives = 3;
let gameOver = false;
let gameSpeed = 1;
let frameCount = 0;
let comboMultiplier = 1;
let comboCount = 0;
let comboTimer = 0;
let level = 1;
let requiredScoreForNextLevel = 500;
let challengeMode = false;
let challengeScoreThreshold = 2000; // Score pour activer le mode défi
let levelUpMessageVisible = false; // Indique si le message est affiché
let levelUpMessageTimeout = 1500; // Durée d'affichage en millisecondes

// Variables pour la gestion de l'invincibilité
let invincible = false;
let invincibleTimer = 0;

// Éléments de l'interface utilisateur
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const highScoreDisplay = document.getElementById('highScore');
const comboDisplay = document.getElementById('combo');
const levelDisplay = document.getElementById('level');
const powerUpIndicators = document.getElementById('powerUpIndicators');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const pauseButton = document.getElementById('pauseButton');
const title = document.createElement('h1');


// Ajouter le titre au body
document.body.appendChild(title);

// Variable pour la gestion de la pause
let isPaused = false;

// Classe de base pour les entités
class Entity {
    constructor(x, y, radius, color, vx = 0, vy = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.exists = true;
    }

    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.1,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.vx * gameSpeed;
        this.y += this.vy * gameSpeed;
    }
}

// Classe pour les power-ups
class PowerUp extends Entity {
    constructor(x, y, radius, type) {
        super(x, y, radius, '#0000FF'); // Couleur bleue
        this.type = type;
    }

    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.1,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        // Dessiner en fonction du type
        ctx.beginPath();
        switch (this.type) {
            case 'life':
                drawHeart(ctx, this.x, this.y, this.radius);
                break;
            case 'shield':
                drawSquare(ctx, this.x, this.y, this.radius);
                break;
            case 'magnet':
                drawCross(ctx, this.x, this.y, this.radius);
                break;
            case 'doublePoints':
                drawP(ctx, this.x, this.y, this.radius);
                break;
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// Fonctions pour dessiner les symboles des power-ups
function drawHeart(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 50, size / 50);
    ctx.beginPath();
    ctx.moveTo(25, 15);
    ctx.bezierCurveTo(25, 15, 10, 0, 0, 12.5);
    ctx.bezierCurveTo(-12.5, 25, 25, 62.5, 25, 62.5);
    ctx.bezierCurveTo(25, 62.5, 62.5, 25, 50, 12.5);
    ctx.bezierCurveTo(37.5, 0, 25, 15, 25, 15);
    ctx.closePath();
    ctx.restore();
}

function drawSquare(ctx, x, y, size) {
    ctx.rect(x - size / 2, y - size / 2, size, size);
}

function drawCross(ctx, x, y, size) {
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x, y + size / 2);
}

function drawP(ctx, x, y, size) {
    ctx.moveTo(x - size / 4, y + size / 2);
    ctx.lineTo(x - size / 4, y - size / 2);
    ctx.quadraticCurveTo(x + size / 4, y - size / 2, x + size / 4, y);
    ctx.quadraticCurveTo(x + size / 4, y + size / 2, x - size / 4, y + size / 2);
}

// Classe pour les ennemis (losanges)
class Enemy extends Entity {
    constructor(x, y, radius, color, vx = 0, vy = 0) {
        super(x, y, radius, color, vx, vy);
    }

    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius); // Haut
        ctx.lineTo(this.x + this.radius, this.y); // Droite
        ctx.lineTo(this.x, this.y + this.radius); // Bas
        ctx.lineTo(this.x - this.radius, this.y); // Gauche
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// Création du joueur
let playerColor = '#00FFFF'; // Couleur par défaut
let player; // On initialisera le joueur lors du démarrage du jeu

// Tableaux pour les entités
const orbs = [];
const superOrbs = [];
const obstacles = [];
const powerUps = [];
const walls = [];
const enemies = [];

// Tableau pour les positions passées du joueur (pour la traînée)
let playerTrail = [];

// Tableau pour les particules
const particles = [];

// Variable pour contrôler la vibration
let shakeDuration = 0;

// Gestion des touches
const keys = {};

// Gestion des contrôles tactiles
let touchX = null;
let touchY = null;

// Variables pour le menu principal
let gameStarted = false;

// Variables pour le contrôle de la difficulté
let obstacleSpawnIntervalBase = 60;
let obstacleSpawnInterval = obstacleSpawnIntervalBase;
let obstacleSpeedMultiplier = 1;

let enemySpawnRateBase = 0;
let enemySpawnRate = enemySpawnRateBase;
let enemySpeedMultiplier = 1;
let maxEnemies = 0;

let wallAppearanceProbabilityBase = 0;
let wallAppearanceProbability = wallAppearanceProbabilityBase;

// Variable pour suivre le niveau actuel
let currentLevel = 1;

// Événements clavier
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    // Gérer la pause avec la touche Échap
    if (e.key === 'Escape') {
        togglePause();
    }
});

window.addEventListener('keydown', function (e) {
    // Vérifier si une touche directionnelle est pressée
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault(); // Empêche le défilement de la page
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Événements tactiles
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    touchX = null;
    touchY = null;
});

// Fonction pour gérer le mouvement du joueur
function handlePlayerMovement() {
    const speed = 5; // Vitesse constante du joueur
    if (touchX !== null && touchY !== null) {
        // Contrôles tactiles
        const dx = touchX - player.x;
        const dy = touchY - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 5) {
            player.x += (dx / distance) * speed;
            player.y += (dy / distance) * speed;
        }
    } else {
        // Contrôles clavier
        if (keys['arrowup'] || keys['z']) {
            player.y -= speed;
        }
        if (keys['arrowdown'] || keys['s']) {
            player.y += speed;
        }
        if (keys['arrowleft'] || keys['q']) {
            player.x -= speed;
        }
        if (keys['arrowright'] || keys['d']) {
            player.x += speed;
        }
    }

    // Contraintes pour que le joueur reste dans l'écran
    if (player.x < player.radius) player.x = player.radius;
    if (player.x > canvas.width - player.radius) player.x = canvas.width - player.radius;
    if (player.y < player.radius) player.y = player.radius;
    if (player.y > canvas.height - player.radius) player.y = canvas.height - player.radius;
}

// Fonction pour gérer les particules
class ParticleEffect {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3 + 2;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 100;
    }

    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 2;
    }
}

function handleParticles() {
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();

        // Retirer les particules expirées
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

// Fonction pour dessiner la traînée du joueur
function drawPlayerTrail() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < playerTrail.length; i++) {
        const pos = playerTrail[i];
        const alpha = 1 - i / playerTrail.length;
        ctx.fillStyle = `rgba(${hexToRgb(player.color)}, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Fonction pour convertir une couleur hexadécimale en RGB
function hexToRgb(hex) {
    const bigint = parseInt(hex.substring(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

// Fonction pour créer un orbe standard
function spawnOrb() {
    const x = Math.random() * (canvas.width - 20) + 10;
    const y = Math.random() * (canvas.height - 20) + 10;
    orbs.push(new Entity(x, y, 10, '#FFFF00'));
}

// Fonction pour créer un super orbe (vaut 20 points)
function spawnSuperOrb() {
    const x = Math.random() * (canvas.width - 20) + 10;
    const y = Math.random() * (canvas.height - 20) + 10;
    superOrbs.push(new Entity(x, y, 12, '#FF00FF')); // Couleur différente
}

// Fonction pour créer un obstacle
function spawnObstacle() {
    const size = Math.random() * 30 + 20;
    const x = Math.random() * (canvas.width - size * 2) + size;
    const y = -size;
    const baseSpeed = Math.random() * 1.5 + 1;
    const speed = baseSpeed * obstacleSpeedMultiplier;
    obstacles.push(new Entity(x, y, size, '#FF0000', 0, speed));
}

// Fonction pour créer un ennemi mobile (losange)
function spawnEnemy() {
    const size = 20;
    const x = Math.random() < 0.5 ? -size : canvas.width + size;
    const y = Math.random() * (canvas.height - size * 2) + size;
    const baseSpeed = Math.random() * 1.5 + 1;
    const speedX = (x < 0 ? baseSpeed : -baseSpeed) * enemySpeedMultiplier;
    enemies.push(new Enemy(x, y, size, '#8800FF', speedX, 0));
}

// Fonction pour créer un mur rouge
function spawnWall() {
    const gapCount = Math.floor(Math.random() * 2) + 3; // Entre 3 et 4 gaps
    const wallHeight = 40;
    const wallSpeed = 2 * obstacleSpeedMultiplier; // Ajuster la vitesse du mur
    const yPosition = -wallHeight;
    const gapWidth = 100; // Largeur de chaque gap
    const gaps = [];

    for (let i = 0; i < gapCount; i++) {
        const gapX = Math.random() * (canvas.width - gapWidth);
        gaps.push(gapX);
    }

    walls.push({
        y: yPosition,
        height: wallHeight,
        speed: wallSpeed,
        gaps: gaps,
        gapWidth: gapWidth
    });
}

// Fonction pour gérer les orbes
function handleOrbs() {
    orbs.forEach((orb, index) => {
        orb.draw();

        // Détection de collision avec le joueur
        const dx = orb.x - player.x;
        const dy = orb.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < orb.radius + player.radius) {
            orbs.splice(index, 1);
            comboCount++;
            if (comboCount % 5 === 0 && comboMultiplier < 5) {
                comboMultiplier++;
            }
            comboTimer = 200; // Durée du combo
            comboDisplay.style.display = 'block';
            comboDisplay.textContent = `Combo x${comboMultiplier}`;
            let pointsEarned = 10 * comboMultiplier;
            if (doublePointsActive) {
                pointsEarned *= 2;
            }
            score += pointsEarned;
            scoreDisplay.textContent = `Score : ${score}`;

            // Générer des particules
            for (let i = 0; i < 10; i++) {
                particles.push(new ParticleEffect(orb.x, orb.y, '#FFFF00'));
            }
        }
    });

    // Gestion des super orbes
    superOrbs.forEach((orb, index) => {
        orb.draw();

        // Détection de collision avec le joueur
        const dx = orb.x - player.x;
        const dy = orb.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < orb.radius + player.radius) {
            superOrbs.splice(index, 1);
            comboCount++;
            if (comboCount % 5 === 0 && comboMultiplier < 5) {
                comboMultiplier++;
            }
            comboTimer = 200;
            comboDisplay.style.display = 'block';
            comboDisplay.textContent = `Combo x${comboMultiplier}`;
            let pointsEarned = 20 * comboMultiplier;
            if (doublePointsActive) {
                pointsEarned *= 2;
            }
            score += pointsEarned;
            scoreDisplay.textContent = `Score : ${score}`;

            // Générer des particules
            for (let i = 0; i < 15; i++) {
                particles.push(new ParticleEffect(orb.x, orb.y, '#FF00FF'));
            }
        }
    });

    // Réduire le timer du combo
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            comboCount = 0;
            comboMultiplier = 1;
            comboDisplay.style.display = 'none';
        }
    }

    // Générer de nouveaux orbes si nécessaire
    if (orbs.length < 7) { // Augmenté de 5 à 7
        spawnOrb();
    }

    // Générer un super orbe rarement
    if (Math.random() < 0.002) {
        spawnSuperOrb();
    }
}

// Fonction pour gérer les obstacles
function handleObstacles() {
    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        obstacle.draw();

        // Détection de collision avec le joueur
        const dx = obstacle.x - player.x;
        const dy = obstacle.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < obstacle.radius + player.radius) {
            obstacles.splice(index, 1);

            if (!invincible && !shieldActive) {
                lives--;
                livesDisplay.textContent = `Vies : ${lives}`;

                // Réinitialiser le combo
                comboCount = 0;
                comboMultiplier = 1;
                comboDisplay.style.display = 'none';

                // Déclencher la vibration
                shakeDuration = 10; // Durée de la vibration

                // Activer l'invincibilité
                invincible = true;
                invincibleTimer = 90; // 1,5 seconde à 60 FPS

                // Générer des particules
                for (let i = 0; i < 15; i++) {
                    particles.push(new ParticleEffect(player.x, player.y, '#FF0000'));
                }

                if (lives <= 0) {
                    gameOver = true;
                }
            }
        }

        // Retirer les obstacles qui sortent de l'écran
        if (obstacle.y - obstacle.radius > canvas.height) {
            obstacles.splice(index, 1);
        }
    });

    // Générer des obstacles en fonction de l'intervalle actuel
    if (frameCount % obstacleSpawnInterval === 0) {
        spawnObstacle();
    }
}

// Fonction pour gérer les ennemis
function handleEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();

        // Détection de collision avec le joueur
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < enemy.radius + player.radius) {
            enemies.splice(index, 1);

            if (!invincible && !shieldActive) {
                lives--;
                livesDisplay.textContent = `Vies : ${lives}`;

                // Réinitialiser le combo
                comboCount = 0;
                comboMultiplier = 1;
                comboDisplay.style.display = 'none';

                // Déclencher la vibration
                shakeDuration = 10;

                // Activer l'invincibilité
                invincible = true;
                invincibleTimer = 90; // 1,5 seconde à 60 FPS

                // Générer des particules
                for (let i = 0; i < 20; i++) {
                    particles.push(new ParticleEffect(player.x, player.y, '#8800FF'));
                }

                if (lives <= 0) {
                    gameOver = true;
                }
            }
        }

        // Retirer les ennemis qui sortent de l'écran
        if (enemy.x + enemy.radius < 0 || enemy.x - enemy.radius > canvas.width) {
            enemies.splice(index, 1);
        }
    });

    // Générer des ennemis en fonction de la fréquence actuelle et du nombre maximum autorisé
    if (enemies.length < maxEnemies && Math.random() < enemySpawnRate) {
        spawnEnemy();
    }
}

// Fonction pour dessiner un rectangle avec coins arrondis personnalisés
function drawRoundedRectCustom(x, y, width, height, radius, corners) {
    ctx.beginPath();
    ctx.moveTo(x + (corners.topLeft ? radius : 0), y);
    ctx.lineTo(x + width - (corners.topRight ? radius : 0), y);
    if (corners.topRight) {
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
    } else {
        ctx.lineTo(x + width, y);
    }
    ctx.lineTo(x + width, y + height - (corners.bottomRight ? radius : 0));
    if (corners.bottomRight) {
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    } else {
        ctx.lineTo(x + width, y + height);
    }
    ctx.lineTo(x + (corners.bottomLeft ? radius : 0), y + height);
    if (corners.bottomLeft) {
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
    } else {
        ctx.lineTo(x, y + height);
    }
    ctx.lineTo(x, y + (corners.topLeft ? radius : 0));
    if (corners.topLeft) {
        ctx.arcTo(x, y, x + radius, y, radius);
    } else {
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

// Variable pour le cooldown des murs
let wallSpawnCooldown = 0;

// Fonction pour gérer les murs
function handleWalls() {
    walls.forEach((wall, index) => {
        wall.y += wall.speed * gameSpeed;

        // Dessiner le mur avec coins arrondis et dégradé
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const gradient = ctx.createLinearGradient(0, wall.y, 0, wall.y + wall.height);
        gradient.addColorStop(0, '#FF5555');
        gradient.addColorStop(1, '#FF0000');
        ctx.fillStyle = gradient;

        // Dessiner le mur principal avec coins arrondis
        drawRoundedRectCustom(0, wall.y, canvas.width, wall.height, 10, {
            topLeft: true,
            topRight: true,
            bottomRight: true,
            bottomLeft: true
        });

        // Dessiner les gaps avec coins arrondis corrects
        ctx.globalCompositeOperation = 'destination-out';
        wall.gaps.forEach((gapX) => {
            drawRoundedRectCustom(gapX, wall.y, wall.gapWidth, wall.height, 10, {
                topLeft: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false
            });
        });
        ctx.restore();

        // Détection de collision avec le joueur
        if (player.y + player.radius > wall.y && player.y - player.radius < wall.y + wall.height) {
            let inGap = false;
            wall.gaps.forEach((gapX) => {
                if (player.x > gapX && player.x < gapX + wall.gapWidth) {
                    inGap = true;
                }
            });
            if (!inGap) {
                if (!invincible && !shieldActive) {
                    lives--;
                    livesDisplay.textContent = `Vies : ${lives}`;

                    // Réinitialiser le combo
                    comboCount = 0;
                    comboMultiplier = 1;
                    comboDisplay.style.display = 'none';

                    // Déclencher la vibration
                    shakeDuration = 10;

                    // Activer l'invincibilité
                    invincible = true;
                    invincibleTimer = 90; // 1,5 seconde à 60 FPS

                    // Générer des particules
                    for (let i = 0; i < 20; i++) {
                        particles.push(new ParticleEffect(player.x, player.y, '#FF0000'));
                    }

                    if (lives <= 0) {
                        gameOver = true;
                    }
                }
            }
        }

        // Retirer le mur s'il sort de l'écran
        if (wall.y > canvas.height) {
            walls.splice(index, 1);
        }
    });

    // Générer un mur en fonction de la probabilité actuelle, en respectant un temps minimum entre deux murs
    if (wallSpawnCooldown <= 0 && Math.random() < wallAppearanceProbability) {
        spawnWall();
        wallSpawnCooldown = 500; // Temps minimum en frames entre deux murs
    } else {
        wallSpawnCooldown--;
    }
}

function spawnPowerUp(type) {
    // Générer une position aléatoire
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;

    // Créer un objet PowerUp avec les propriétés nécessaires
    const powerUp = {
        x: x,
        y: y,
        radius: 15, // Taille du power-up
        type: type,
        draw: function () {
            const points = 5; // Nombre de branches de l'étoile
            const innerRadius = this.radius / 2; // Taille intérieure des branches
            drawStar(ctx, this.x, this.y, this.radius, points, innerRadius, this.getColor());
        },
        getColor: function () {
            switch (this.type) {
                case 'life': return '#FF0000'; // Rouge pour "vie"
                case 'shield': return '#00FF00'; // Vert pour "bouclier"
                case 'magnet': return '#0000FF'; // Bleu pour "aimant"
                case 'doublePoints': return '#FFFF00'; // Jaune pour "double points"
                default: return '#FFFFFF'; // Blanc par défaut
            }
        }
    };

    // Ajouter le power-up à la liste des power-ups actifs
    powerUps.push(powerUp);
}

// Fonction pour gérer les power-ups
function handlePowerUps() {
    powerUps.forEach((powerUp, index) => {
        powerUp.draw();

        // Détection de collision avec le joueur
        const dx = powerUp.x - player.x;
        const dy = powerUp.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < powerUp.radius + player.radius) {
            powerUps.splice(index, 1);

            const powerUpColor = powerUp.getColor(); // Utilisez votre méthode pour obtenir la couleur
            updatePowerUpIndicators(powerUp.type, powerUpColor);

            // Générer des particules
            for (let i = 0; i < 15; i++) {
                particles.push(new ParticleEffect(powerUp.x, powerUp.y, '#00FFFF'));
            }

            // Appliquer l'effet du power-up
            switch (powerUp.type) {
                case 'life':
                    lives++;
                    livesDisplay.textContent = `Vies : ${lives}`;
                    break;
                case 'shield':
                    activateShield();
                    break;
                case 'magnet':
                    activateMagnet();
                    break;
                case 'doublePoints':
                    activateDoublePoints();
                    break;
            }
        }
    });

    // Générer des power-ups
    if (Math.random() < 0.001) {
        let powerUpType;
        const rand = Math.random();
        if (rand < 0.1) {
            powerUpType = 'life'; // 10% de chance
        } else if (rand < 0.4) {
            powerUpType = 'shield';
        } else if (rand < 0.7) {
            powerUpType = 'magnet';
        } else {
            powerUpType = 'doublePoints';
        }
        spawnPowerUp(powerUpType);
    }
}

// Variables pour les effets des power-ups
let shieldActive = false;
let shieldTimer = 0;
let magnetActive = false;
let magnetTimer = 0;
let doublePointsActive = false;
let doublePointsTimer = 0;

// Fonction pour activer le bouclier
function activateShield() {
    shieldActive = true;
    shieldTimer = 500; // Durée du bouclier
    updatePowerUpIndicators();
}

// Fonction pour activer l'aimant
function activateMagnet() {
    magnetActive = true;
    magnetTimer = 500;
    updatePowerUpIndicators();
}

// Fonction pour activer les doubles points
function activateDoublePoints() {
    doublePointsActive = true;
    doublePointsTimer = 500;
    updatePowerUpIndicators();
}

// Fonction pour gérer les effets des power-ups actifs
function handleActivePowerUps() {
    if (shieldActive) {
        shieldTimer--;
        // Dessiner un halo autour du joueur
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (shieldTimer <= 0) {
            shieldActive = false;
            updatePowerUpIndicators();
        }
    }
    if (magnetActive) {
        magnetTimer--;
        // Attirer les orbes vers le joueur
        orbs.forEach(orb => {
            const dx = player.x - orb.x;
            const dy = player.y - orb.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 200) {
                orb.x += dx / distance * 2;
                orb.y += dy / distance * 2;
            }
        });
        if (magnetTimer <= 0) {
            magnetActive = false;
            updatePowerUpIndicators();
        }
    }
    if (doublePointsActive) {
        doublePointsTimer--;
        if (doublePointsTimer <= 0) {
            doublePointsActive = false;
            updatePowerUpIndicators();
        }
    }
}

// Fonction pour mettre à jour les indicateurs de power-ups
function updatePowerUpIndicators() {
    const powerUpIndicators = document.getElementById('powerUpIndicators');
    powerUpIndicators.innerHTML = ''; // Réinitialiser le contenu

    // Vérifier les power-ups actifs et ajouter le texte correspondant
    if (shieldActive) {
        const shieldText = document.createElement('span');
        shieldText.textContent = 'Bouclier';
        shieldText.style.color = '#00FF00'; // Couleur verte
        shieldText.style.marginRight = '10px';
        powerUpIndicators.appendChild(shieldText);
    }

    if (magnetActive) {
        const magnetText = document.createElement('span');
        magnetText.textContent = 'Aimant';
        magnetText.style.color = '#0000FF'; // Couleur bleue
        magnetText.style.marginRight = '10px';
        powerUpIndicators.appendChild(magnetText);
    }

    if (doublePointsActive) {
        const doublePointsText = document.createElement('span');
        doublePointsText.textContent = 'Points Sup.';
        doublePointsText.style.color = '#FFFF00'; // Couleur jaune
        powerUpIndicators.appendChild(doublePointsText);
    }
}

// Fonction pour gérer l'invincibilité
function handleInvincibility() {
    if (invincible) {
        invincibleTimer--;
        // Effet visuel pendant l'invincibilité (clignotement)
        if (invincibleTimer % 10 < 5) {
            ctx.globalAlpha = 0.5;
        }
        if (invincibleTimer <= 0) {
            invincible = false;
            ctx.globalAlpha = 1;
        }
    } else {
        ctx.globalAlpha = 1;
    }
}

// Fonction pour gérer le mode défi
function handleChallenges() {
    if (!challengeMode && score >= challengeScoreThreshold) {
        challengeMode = true;
        // Augmenter la difficulté
        gameSpeed += 0.5;
        enemySpawnRate += 0.001;
        wallAppearanceProbability += 0.001;
        // Afficher un message
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mode Défi Activé!', canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
}

// Fonction pour mettre à jour la difficulté et les niveaux
function updateDifficulty() {
    if (score >= requiredScoreForNextLevel) {
        level++;
        requiredScoreForNextLevel += 500; // Augmenter le score requis pour le prochain niveau
        levelDisplay.textContent = `Niveau : ${level}`;
        // Afficher un message de transition
        showLevelUpMessage();
    }

    // Appliquer les changements de difficulté uniquement lorsque le niveau change
    if (currentLevel !== level) {
        switch (level) {
            case 1:
                // Niveau 1 : Vitesse de base et seulement des obstacles rouges qui tombent
                obstacleSpawnInterval = obstacleSpawnIntervalBase;
                obstacleSpeedMultiplier = 1;
                enemySpawnRate = 0;
                enemySpeedMultiplier = 1;
                wallAppearanceProbability = 0;
                maxEnemies = 0;
                break;
            case 2:
                // Augmentation de la fréquence et de la vitesse des obstacles rouges
                obstacleSpawnInterval = Math.floor(obstacleSpawnInterval * 0.8);
                obstacleSpeedMultiplier *= 1.05;
                // Apparition des ennemis horizontaux, maximum 2 par seconde
                enemySpawnRate = 2 / 60; // Max 2 par seconde
                enemySpeedMultiplier = 1;
                maxEnemies = 5; // Limite du nombre d'ennemis sur l'écran
                // Rare probabilité d'apparition des murs
                wallAppearanceProbability = 0.0005;
                break;
            case 3:
                // Augmentation de la fréquence et de la vitesse des obstacles rouges
                obstacleSpawnInterval = Math.floor(obstacleSpawnInterval * 0.8);
                obstacleSpeedMultiplier *= 1.05;
                // Augmentation de la fréquence et de la vitesse des ennemis
                enemySpawnRate *= 1.2;
                enemySpeedMultiplier *= 1.05;
                // Augmentation de la probabilité d'apparition des murs
                wallAppearanceProbability *= 1.2;
                break;
            case 4:
                // Même augmentation qu'au niveau 3
                obstacleSpawnInterval = Math.floor(obstacleSpawnInterval * 0.8);
                obstacleSpeedMultiplier *= 1.05;
                enemySpawnRate *= 1.2;
                enemySpeedMultiplier *= 1.05;
                wallAppearanceProbability *= 1.2;
                break;
            default:
                // Pour les niveaux supérieurs, poursuite de l'augmentation
                obstacleSpawnInterval = Math.max(20, Math.floor(obstacleSpawnInterval * 0.9));
                obstacleSpeedMultiplier *= 1.02;
                enemySpawnRate *= 1.1;
                enemySpeedMultiplier *= 1.02;
                wallAppearanceProbability *= 1.1;
                maxEnemies += 1;
                break;
        }
        currentLevel = level;
    }
}

// Fonction pour afficher un message de passage de niveau
function showLevelUpMessage() {
    levelUpMessageVisible = true; // Activer le message

    // Désactiver le message après un certain temps
    setTimeout(() => {
        levelUpMessageVisible = false; // Désactiver le message
    }, levelUpMessageTimeout);
}

// Fonction pour mettre à jour le meilleur score
function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = `Meilleur Score : ${highScore}`;
    }
}

// Fonction principale du jeu
function gameLoop() {
    if (isPaused) return;

    if (gameOver) {
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Afficher "Game Over"
        ctx.fillStyle = '#FFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);

        // Afficher les boutons
        const buttonContainer = document.getElementById("buttonContainer");
        buttonContainer.style.display = "flex";
        restartButton.style.display = 'block';
        menuButton.style.display = 'block';
        updateHighScore();
        return;
    }

    // *** Mettre à jour et dessiner l'arrière-plan dynamique uniquement dans le canvas ***
    const hue = (frameCount / 2) % 360; // Calculer la teinte
    const backgroundColor = `hsl(${hue}, 20%, 10%)`;

    // Dessiner l'arrière-plan
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Appliquer la vibration si nécessaire
    if (shakeDuration > 0) {
        const dx = (Math.random() - 0.5) * 10;
        const dy = (Math.random() - 0.5) * 10;
        ctx.translate(dx, dy);
        shakeDuration--;
    }
    // Ajouter la position actuelle du joueur au début du tableau
    playerTrail.unshift({ x: player.x, y: player.y });

    // Limiter la longueur de la traînée
    if (playerTrail.length > 20) {
        playerTrail.pop();
    }

    // Gérer les mouvements et autres éléments du jeu
    handlePlayerMovement();
    handleInvincibility();
    handleParticles();
    handleOrbs();
    handleObstacles();
    handleWalls();
    handleEnemies();
    handlePowerUps();
    handleActivePowerUps();
    updateDifficulty();
    handleChallenges();

    // Dessiner les entités
    drawPlayerTrail();
    player.draw();

    ctx.restore();

    // Afficher le message de passage de niveau
    if (levelUpMessageVisible) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Niveau ${level}`, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }

    // Incrémenter le compteur de frames
    frameCount++;
    requestAnimationFrame(gameLoop);
}

// Fonction pour afficher le menu principal
function showMainMenu() {
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Afficher le menu principal
    const mainMenu = document.createElement('div');
    mainMenu.id = 'mainMenu';



    const newGameButton = document.createElement('button');
    newGameButton.textContent = 'Nouvelle Partie';
    newGameButton.className = 'menu-button';
    newGameButton.onclick = () => {
        document.body.removeChild(mainMenu);
        player = new Entity(canvas.width / 2, canvas.height / 2, 15, playerColor);
        startGame();
    };
    mainMenu.appendChild(newGameButton);

    const tutorialButton = document.createElement('button');
    tutorialButton.textContent = 'Tutoriel';
    tutorialButton.className = 'menu-button';
    tutorialButton.onclick = () => {
        document.body.removeChild(mainMenu);
        showTutorialScreen();
    };
    mainMenu.appendChild(tutorialButton);

    const customizationButton = document.createElement('button');
    customizationButton.textContent = 'Personnalisation';
    customizationButton.className = 'menu-button';
    customizationButton.onclick = () => {
        document.body.removeChild(mainMenu);
        choosePlayerColor();
    };
    mainMenu.appendChild(customizationButton);

    document.body.appendChild(mainMenu);
}

// Fonction pour afficher le tutoriel
function showTutorialScreen() {
    // Créer l'écran du tutoriel
    const tutorialScreen = document.createElement('div');
    tutorialScreen.id = 'tutorialScreen';
    tutorialScreen.style.display = 'block';
    tutorialScreen.style.position = 'absolute';
    tutorialScreen.style.top = '0';
    tutorialScreen.style.left = '0';
    tutorialScreen.style.width = '100%';
    tutorialScreen.style.height = '100%';
    tutorialScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    tutorialScreen.style.color = '#fff';
    tutorialScreen.style.padding = '20px';
    tutorialScreen.style.boxSizing = 'border-box';
    tutorialScreen.style.textAlign = 'center';

    // Ajouter un titre
    const title = document.createElement('h2');
    title.textContent = 'Tutoriel';
    tutorialScreen.appendChild(title);

    // Ajouter les instructions
    const instructions = document.createElement('div');
    instructions.style.marginTop = '20px';
    instructions.innerHTML = `
        <p>Utilisez les touches fléchées ou ZQSD pour vous déplacer.</p>
        <p>Sur mobile, touchez et glissez pour vous déplacer.</p>
        <p>Collectez les orbes pour augmenter votre score.</p>
        <p>Évitez les obstacles et les ennemis.</p>
    `;
    tutorialScreen.appendChild(instructions);

    // Ajouter un bouton de retour au menu
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Retour au Menu';
    closeButton.className = 'close-button';
    closeButton.style.marginTop = '30px';
    closeButton.style.padding = '10px 20px';
    closeButton.style.fontSize = '18px';
    closeButton.style.backgroundColor = '#222';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
        tutorialScreen.style.display = 'none';
        showMainMenu();
    };
    tutorialScreen.appendChild(closeButton);

    // Ajouter l'écran du tutoriel au document
    document.body.appendChild(tutorialScreen);
}


// Fonction pour choisir la couleur du joueur
function choosePlayerColor() {
    const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FF0000', '#00FF00'];
    let currentIndex = colors.indexOf(playerColor);

    function drawColorSelection() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Choisissez votre couleur', canvas.width / 2, canvas.height / 2 - 100);

        ctx.fillStyle = colors[currentIndex];
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.fillText('Utilisez les touches ← → pour changer de couleur', canvas.width / 2, canvas.height / 2 + 80);
        ctx.fillText('Appuyez sur Entrée pour valider', canvas.width / 2, canvas.height / 2 + 120);
        ctx.restore();
    }

    function handleColorSelection(e) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'q') {
            currentIndex = (currentIndex - 1 + colors.length) % colors.length;
            drawColorSelection();
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            currentIndex = (currentIndex + 1) % colors.length;
            drawColorSelection();
        } else if (e.key === 'Enter') {
            playerColor = colors[currentIndex];
            document.removeEventListener('keydown', handleColorSelection);
            // Effacer le canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            showMainMenu();
        }
    }

    drawColorSelection();
    document.addEventListener('keydown', handleColorSelection);
}

// Fonction pour démarrer le jeu
function startGame() {
    // Réinitialiser les variables du jeu
    score = 0;
    lives = 3;
    gameOver = false;
    gameSpeed = 1;
    frameCount = 0;
    comboMultiplier = 1;
    comboCount = 0;
    comboTimer = 0;
    level = 1;
    requiredScoreForNextLevel = 500;
    challengeMode = false;
    invincible = false;
    invincibleTimer = 0;
    wallSpawnCooldown = 0;
    shakeDuration = 0;
    shieldActive = false;
    shieldTimer = 0;
    magnetActive = false;
    magnetTimer = 0;
    doublePointsActive = false;
    doublePointsTimer = 0;

    // Réinitialiser les variables de difficulté
    obstacleSpawnIntervalBase = 60;
    obstacleSpawnInterval = obstacleSpawnIntervalBase;
    obstacleSpeedMultiplier = 1;

    enemySpawnRateBase = 0;
    enemySpawnRate = enemySpawnRateBase;
    enemySpeedMultiplier = 1;
    maxEnemies = 0;

    wallAppearanceProbabilityBase = 0;
    wallAppearanceProbability = wallAppearanceProbabilityBase;

    currentLevel = 1;

    // Vider les tableaux
    orbs.length = 0;
    superOrbs.length = 0;
    obstacles.length = 0;
    powerUps.length = 0;
    walls.length = 0;
    enemies.length = 0;
    playerTrail.length = 0;
    particles.length = 0;

    // Réinitialiser les affichages
    scoreDisplay.textContent = `Score : ${score}`;
    livesDisplay.textContent = `Vies : ${lives}`;
    levelDisplay.textContent = `Niveau : ${level}`;
    comboDisplay.style.display = 'none';
    powerUpIndicators.innerHTML = '';
    restartButton.style.display = 'none';
    menuButton.style.display = 'none';

    // Positionner le joueur au centre
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.color = playerColor;

    // Lancer la boucle du jeu
    isPaused = false;
    requestAnimationFrame(gameLoop);
}

// Fonction pour revenir au menu depuis le Game Over
function returnToMenu() {
    restartButton.style.display = 'none';
    menuButton.style.display = 'none';
    gameOver = false;
    showMainMenu();
}

// Événement pour le bouton de retour au menu
menuButton.addEventListener('click', returnToMenu);

// Événement pour le bouton de redémarrage
restartButton.addEventListener('click', startGame);

// Fonction pour gérer la pause du jeu
function togglePause() {
    if (gameOver) return;

    isPaused = !isPaused;
    if (isPaused) {
        pauseButton.textContent = '▶️';
    } else {
        pauseButton.textContent = '⏸️';
        requestAnimationFrame(gameLoop);
    }
}

// Événement pour le bouton de pause
pauseButton.addEventListener('click', togglePause);

// Démarrage du jeu avec le menu principal
showMainMenu();

function drawStar(ctx, x, y, radius, points, innerRadius, color) {
    const step = Math.PI / points; // Angle entre chaque branche
    ctx.beginPath();
    ctx.moveTo(
        x + radius * Math.cos(0),
        y - radius * Math.sin(0)
    );

    for (let i = 0; i < 2 * points; i++) {
        const r = i % 2 === 0 ? radius : innerRadius; // Alterne entre grand et petit rayon
        const angle = i * step;
        ctx.lineTo(
            x + r * Math.cos(angle),
            y - r * Math.sin(angle)
        );
    }

    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

let backgroundColor = '#000'; // Couleur initiale

function updateBackgroundColor(frameCount) {
    const hue = (frameCount / 2) % 360; // Calcule la teinte dynamique
    backgroundColor = `hsl(${hue}, 20%, 10%)`; // Met à jour la couleur
}

function drawBackground() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Remplit tout le canvas
}
// pour le tooptip
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

const titleSpans = document.querySelectorAll('#dynamicTitle span');
let colorIndex = 0;

function updateColors() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffa500', '#00ffff'];
    titleSpans.forEach((span, index) => {
        span.style.color = colors[(colorIndex + index) % colors.length];
    });
    colorIndex = (colorIndex + 1) % colors.length;
}

// Change les couleurs toutes les 300ms
setInterval(updateColors, 300);
