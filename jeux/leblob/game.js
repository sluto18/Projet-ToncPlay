// Définition des objets images et de leur chargement
const images = {};
const imageNames = [
  "avoine1", "avoine2", "blob", "blobinverse", "blobsaut", "blobsautinverse",
  "limace", "limaceinverse", "pic", "teleporter", "trampo", "sole", 
  "plateformegauche", "plateformemilieu", "plateformedroite", "plateformeverre", 
  "plateformeverregauche", "plateformeverredroite", 
  "plateformebois", "plateformeboisgauche", "plateformeboisdroit",
  "oiseau", "oiseauinverse", "mur", "blobfixe",  "blobtouchegauche", 
  "blobtouchedroite", "blobfin", "blobfuck",
  "plateformecollante1", "plateformecollante2","plateformecollante3", "picair", 
  "plateformerebondissante1", "plateformerebondissante2", "plateformerebondissante3",  
  "plateformetemporarygauche","plateformetemporarymilieu", "plateformetemporarydroite",
  "fondecran", "fondecranciel" // NOUVEAU: Ajout des images de fond
];

let imagesLoaded = 0;
const totalImages = imageNames.length;

function loadImages(callback) {
  imageNames.forEach(name => {
    const img = new Image();
    img.src = `images/${name}.png`;
    img.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) { // Correction ici
        callback();
      }
    };
    img.onerror = () => { 
      console.error(`Erreur de chargement de l'image: images/${name}.png`);
    };
    images[name] = img;
  });
}

// Récupération des éléments du DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelIndicatorDiv = document.getElementById('levelIndicator');
const welcomeScreen = document.getElementById('welcomeScreen'); 
// Changement des IDs de bouton pour correspondre à index.html
const playAdventureModeBtn = document.getElementById('playAdventureModeBtn');
const playJumpModeBtn = document.getElementById('playJumpModeBtn');
const helpBtn = document.getElementById('helpBtn');
const backFromHelpBtn = document.getElementById('backFromHelpBtn');
const helpModal = document.getElementById('helpModal');

const levelSelect = document.getElementById('levelSelect');   
const avoineIndicatorDiv = document.getElementById('avoineIndicator');
const collectedAvoineSpan = document.getElementById('collectedAvoine');
const totalAvoineSpan = document.getElementById('totalAvoine'); 
const livesIndicatorDiv = document.getElementById('livesIndicator'); 
const playerLivesSpan = document.getElementById('playerLives');     
const collisionShrink = 8;     
const spikeHitboxPadding = 10; 

// NOUVEAU: Éléments pour le score du mode Jump
const jumpScoreIndicator = document.getElementById('jumpScoreIndicator');
const jumpScoreValue = document.getElementById('jumpScoreValue');
const jumpHighScoreDisplay = document.getElementById('jumpHighScoreDisplay'); // Nouveau
const highScoreValueSpan = document.getElementById('highScoreValue'); // Nouveau


// Récupération des éléments de la fenêtre Game Over
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverTitle = document.getElementById('gameOverTitle'); // NOUVEAU
const gameOverMessage = document.getElementById('gameOverMessage'); // NOUVEAU
const restartGameBtn = document.getElementById('restartGameBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');

// NOUVEAU: Éléments pour la fenêtre de confirmation de réinitialisation
const resetConfirmModal = document.getElementById('resetConfirmModal');
const confirmResetBtn = document.getElementById('confirmResetBtn');
const cancelResetBtn = document.getElementById('cancelResetBtn');

// NOUVEAU: Bouton "Retour à l'Accueil" en jeu
const backToHomeInGameBtn = document.getElementById('backToHomeInGameBtn');

// NOUVEAU: Référence à la modale de fin de jeu (déclarée ici, assignée dans init)
let endGameModal; 
let restartButtonEndGame; // Bouton dans la modale de fin de jeu (déclaré ici, assigné dans init)


// Variables globales pour le défilement horizontal
let enableHorizontalScrolling = false; 
let levelWidth = canvas.width; 
let offsetX = 0; 
const SCROLL_THRESHOLD_PERCENTAGE = 0.4; 

// --- NOUVELLES VARIABLES GLOBALES POUR LE DÉFILEMENT VERTICAL ---
let verticalScrollingEnabled = false; // Indique si le défilement vertical est actif pour le niveau actuel
let levelHeight = 0; // La hauteur totale du monde du niveau actuel
let cameraY = 0;     // Le décalage vertical de la caméra (position du haut de la vue sur le monde)


// Variables pour le système de vies et l'invincibilité
const initialLives = 3;
let playerLives = initialLives;
let isInvincible = false;
let invincibilityTimer = 0;
const invincibilityDuration = 60; // 1 seconde à 60 FPS

// Variables pour l'animation de fin de niveau
let isLastStarCollectedAnimation = false;
let lastStarAnimationTimer = 0;
const lastStarAnimationDuration = 120; // 2 secondes à 60 FPS

// Variable pour contrôler la pause du jeu
let isGamePaused = false;

// ID de la frame d'animation pour pouvoir l'annuler
let gameFrameId = null; 

// Variable pour le mode de jeu actuel ('adventure' ou 'jump')
let currentMode = 'adventure'; 

// Variables pour le mode Aventure
let highestUnlockedLevel = 0; // Index du niveau le plus élevé débloqué (0 = Niveau 1)

// Gestion des entrées clavier
const keys = {
    left: false,
    right: false,
    up: false
};

document.addEventListener('keydown', (e) => {
    if (isGamePaused) return; // Ignorer les entrées si le jeu est en pause
    if (e.key === 'ArrowLeft' || e.key === 'q') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'z') keys.up = true;
});
document.addEventListener('keyup', (e) => {
    if (isGamePaused) return; // Ignorer les entrées si le jeu est en pause
    if (e.key === 'ArrowLeft' || e.key === 'q') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'z') keys.up = false;
});

// Classe du joueur
class Player {
    constructor() {
        this.width = 60;
        this.height = 60;
        // La position initiale sera définie par loadLevel ou playerTakeDamage
        this.x = 100; 
        this.y = canvas.height - this.height - 20; 
        this.speed = 5;
        this.velX = 0;
        this.velY = 0;
        this.gravity = 0.5;
        this.friction = 0.9;
        this.jumpStrengthAdventure = -12; // Force de saut d'origine pour le mode Aventure
        this.onGround = false;
        this.facingRight = true;
        this.isOutOfBounds = false; 
        this.outOfBoundsTimer = 0; 		
        this.justTeleported = false; // Pour éviter les téléportations multiples instantanées
        this.currentGroundType = 'normal'; // Pour suivre le type de surface sur laquelle le joueur se trouve
    }

    update() {
        // Mouvement horizontal
        this.velX *= this.friction;
        if (keys.left) {
            this.velX = -this.speed;
            this.facingRight = false;
        }
        if (keys.right) {
            this.velX = this.speed;
            this.facingRight = true;
        }

        // Appliquer la vélocité horizontale à la position du joueur
        this.x += this.velX;

        // Saut (modifié pour la gravité inversée et plateformes collantes)
        // En mode Jump, le saut est automatique au contact des plateformes,
        // donc la touche 'up' n'est pas utilisée pour déclencher le saut ici.
        // Elle est utilisée seulement en mode Aventure.
        if (currentMode === 'adventure' && keys.up && this.onGround) {
            let actualJumpStrength = this.jumpStrengthAdventure; // Utilise la force de saut Aventure
            if (this.currentGroundType === 'sticky') {
                actualJumpStrength *= 0.6; // Réduction du saut plus prononcée pour les plateformes collantes (passé de 0.4 à 0.6)
            }
            // Applique la force de saut dans la direction opposée à la gravité actuelle
            this.velY = actualJumpStrength * (this.gravity / Math.abs(this.gravity));
            this.onGround = false;
            this.currentGroundType = 'normal'; // Le joueur quitte le type de sol après le saut
        }

        // Gravité
        this.velY += this.gravity;
        this.y += this.velY;

        // --- GESTION DES BORDS ET DU DÉFILEMENT HORIZONTAL (EXISTANT) ---
        if (currentMode === 'adventure' && enableHorizontalScrolling) {
            // Logique de défilement horizontal : le joueur reste centré ou dans un seuil
            // this.x est la position réelle du joueur dans le monde.
            // offsetX est la coordonnée X du coin supérieur gauche de la caméra dans le monde.

            // Calculer la position du joueur à l'écran
            const playerScreenX = this.x - offsetX;

            // Décalage pour le scroll vers la droite (quand le joueur dépasse le seuil droit de l'écran visible)
            if (playerScreenX > canvas.width * (1 - SCROLL_THRESHOLD_PERCENTAGE)) {
                offsetX = this.x - canvas.width * (1 - SCROLL_THRESHOLD_PERCENTAGE);
            }
            // Décalage pour le scroll vers la gauche (quand le joueur passe le seuil gauche de l'écran visible)
            else if (playerScreenX < canvas.width * SCROLL_THRESHOLD_PERCENTAGE) {
                offsetX = this.x - canvas.width * SCROLL_THRESHOLD_PERCENTAGE;
            }

            // Clamping offsetX aux limites du niveau
            if (offsetX < 0) {
                offsetX = 0;
            }
            if (offsetX + canvas.width > levelWidth) {
                offsetX = levelWidth - canvas.width;
            }

            // Bloquer le joueur aux limites du niveau (coordonnées mondiales)
            if (this.x < 0) {
                this.x = 0;
                this.velX = 0;
            } else if (this.x + this.width > levelWidth) {
                this.x = levelWidth - this.width;
                this.velX = 0;
            }

        } else {
            // Comportement par défaut : bloquer le joueur aux bords du canvas (pas de défilement)
            if (this.x < 0) {
                this.x = 0;
                this.velX = 0;
            } else if (this.x + this.width > canvas.width) {
                this.x = canvas.width - this.width;
                this.velX = 0;
            }
        }
        // --- FIN DU CODE POUR LA GESTION DES BORDS ET DU DÉFILEMENT HORIZONTAL ---


        // Vérification de sortie de limites avec délai (pour la mort par chute)
        const outOfBoundsMargin = 100; // Distance en pixels au-delà du canvas avant que le timer ne commence
        const respawnDelayFrames = 120; // Délai de 2 secondes (à 60 FPS, 120 frames = 2 secondes)

        let currentlyOutOfBounds = false;

        // Vérification des limites horizontales (toujours les mêmes)
        if (this.x + this.width < -outOfBoundsMargin || this.x > levelWidth + outOfBoundsMargin) { // Utiliser levelWidth
            currentlyOutOfBounds = true;
        }

        // --- MODIFICATION POUR LA VÉRIFICATION DES LIMITES VERTICALES AVEC DÉFILEMENT ---
        if (currentMode === 'adventure' && verticalScrollingEnabled) {
            // En mode défilement vertical, le joueur est hors limites s'il sort de la hauteur totale du niveau
            if (this.y + this.height < -outOfBoundsMargin || this.y > levelHeight + outOfBoundsMargin) {
                currentlyOutOfBounds = true;
            }
        } else if (currentMode === 'adventure' && gravityInverted) {
            // Gravité inversée : le "sol" est en haut du canvas
            if (this.y + this.height < -outOfBoundsMargin || this.y > canvas.height + outOfBoundsMargin) {
                currentlyOutOfBounds = true;
            }
        } else {
            // Gravité normale : le "sol" est en bas du canvas (ou pas de défilement vertical)
            if (this.y < -outOfBoundsMargin || this.y + this.height > canvas.height + outOfBoundsMargin) {
                currentlyOutOfBounds = true;
            }
        }
        // --- FIN DE LA MODIFICATION POUR LA VÉRIFICATION DES LIMITES VERTICALES ---

        if (currentlyOutOfBounds) {
            // Si le joueur vient juste de sortir des limites
            if (!this.isOutOfBounds) {
                this.isOutOfBounds = true;
                this.outOfBoundsTimer = 0; // Réinitialise le timer
            }
            this.outOfBoundsTimer++; // Incrémente le timer
            
            // Si le timer a atteint le délai, le joueur prend des dégâts et respawn
            if (this.outOfBoundsTimer >= respawnDelayFrames) {
                playerTakeDamage(true); // Appelle playerTakeDamage avec resetPosition = true
                this.isOutOfBounds = false; // Réinitialise le drapeau
                this.outOfBoundsTimer = 0; // Réinitialise le timer
            }
        } else {
            // Si le joueur était hors limites mais est revenu dans la zone jouable
            if (this.isOutOfBounds) {
                this.isOutOfBounds = false;
                this.outOfBoundsTimer = 0;
            }
        }
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        // Gérer l'animation de la dernière étoile collectée
        if (isLastStarCollectedAnimation) {
            ctx.save();
            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjusted = this.y - cameraY;

            if (currentMode === 'adventure' && gravityInverted) {
                ctx.translate((this.x - offsetX) + this.width / 2, drawYAdjusted + this.height / 2);
                ctx.scale(1, -1);
                ctx.translate(-((this.x - offsetX) + this.width / 2), -(drawYAdjusted + this.height / 2));
            }
            ctx.drawImage(images.blobfin, this.x - offsetX, drawYAdjusted, this.width, this.height);
            ctx.restore();
            return; // Ne pas dessiner l'image normale du joueur
        }

        // Gérer le clignotement et l'image de dégâts pendant l'invincibilité
        let imageToDraw;
        if (isInvincible) {
            imageToDraw = this.facingRight ? images.blobtouchedroite : images.blobtouchegauche;
            // Si invincible, et c'est la phase "off" du clignotement, ne rien dessiner.
            if (Math.floor(invincibilityTimer / 10) % 2 !== 0) {
                return; // Ne dessine rien pour l'effet de clignotement
            }
        } else {
            if (!this.onGround) {
                imageToDraw = this.facingRight ? images.blobsaut : images.blobsautinverse;
            } else {
                imageToDraw = this.facingRight ? images.blob : images.blobinverse;
            }
        }

        ctx.save(); // Sauvegarder l'état actuel du canvas

        // Appliquer offsetX pour le défilement horizontal
        let drawX = this.x - offsetX;
        // Appliquer cameraY pour le défilement vertical
        let drawY = this.y - cameraY; 

        if (currentMode === 'adventure' && gravityInverted) {
            // Inverser l'image verticalement autour de son centre
            ctx.translate(drawX + this.width / 2, drawY + this.height / 2); 
            ctx.scale(1, -1); // Appliquer l'inversion verticale
            ctx.translate(-(drawX + this.width / 2), -(drawY + this.height / 2)); 
        }

        // Dessiner l'image avec le décalage horizontal et vertical
        ctx.drawImage(imageToDraw, drawX, drawY, this.width, this.height); 
        ctx.restore(); // Restaurer l'état précédent du canvas
    }
}

// Classe pour les plateformes de différents types
class Platform {
    constructor(x, y, width, type = 'static', disappearAfterTouch = false) { // Ajout de disappearAfterTouch
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 20;
        this.type = type;
        this.speed = (type === 'moving') ? 2 : 0;
        this.direction = 1;
        this.visible = true;
        this.timer = 0; 
        this.isSticky = (type === 'sticky');
        this.isBouncy = (type === 'bouncy'); 
        this.isTemporary = (type === 'temporary'); 
        this.touched = false; 

        this.disappearTimer = 0; 
        this.disappearDelay = 120; 

        this.reappearTimer = 0;
        this.reappearDelay = 180; 
        this.isDisappeared = false; 

        // Choisir une image aléatoire pour les plateformes collantes
        if (this.isSticky) {
            const stickyImages = [images.plateformecollante1, images.plateformecollante2, images.plateformecollante3];
            this.chosenStickyImage = stickyImages[Math.floor(Math.random() * stickyImages.length)];
        }
        // NOUVEAU: Choisir une image aléatoire pour les plateformes rebondissantes (une seule, étirée)
        if (this.isBouncy) {
            const bouncyImages = [images.plateformerebondissante1, images.plateformerebondissante2, images.plateformerebondissante3];
            this.chosenBouncyImage = bouncyImages[Math.floor(Math.random() * bouncyImages.length)];
        }
    }

    update() {
        if (this.type === 'moving') {
            let nextX = this.x + this.speed * this.direction;
            let collided = false;

            // Vérifier les collisions avec les murs et autres plateformes avant d'appliquer le mouvement
            // Créer une plateforme hypothétique à la prochaine position pour la détection de collision
            let hypotheticalPlatform = { x: nextX, y: this.y, width: this.width, height: this.height };

            // Vérifier les collisions avec les murs
            currentWalls.forEach(wall => {
                if (isColliding(hypotheticalPlatform, wall)) {
                    collided = true;
                    const dir = collisionDirection(hypotheticalPlatform, wall); // Using hypoPlayer, should be hypotheticalPlatform
                    if (dir === 'left') { // La plateforme hypothétique a frappé le mur depuis sa gauche (côté droit du mur)
                        nextX = wall.x + wall.width;
                    } else if (dir === 'right') { // La plateforme hypothétique a frappé le mur depuis sa droite (côté gauche du mur)
                        nextX = wall.x - this.width;
                    }
                }
            });

            // Vérifier les collisions avec d'autres plateformes (statiques, collantes, modulaires)
            const allOtherPlatforms = [
                ...currentPlatforms.filter(p => p !== this && p.type !== 'moving' && p.visible),
                ...currentModularPlatforms
            ];

            allOtherPlatforms.forEach(otherObj => {
                // Mettre à jour la plateforme hypothétique avec le nextX potentiellement ajusté par les murs
                hypotheticalPlatform.x = nextX; 
                if (isColliding(hypotheticalPlatform, otherObj)) {
                    collided = true;
                    const dir = collisionDirection(hypotheticalPlatform, otherObj);
                    if (dir === 'left') { // La plateforme hypothétique a frappé l'autre objet depuis sa gauche
                        nextX = otherObj.x + otherObj.width;
                    } else if (dir === 'right') { // La plateforme hypothétique a frappé l'autre objet depuis sa droite
                        nextX = otherObj.x - this.width;
                    }
                }
            });

            // Si une collision a eu lieu, inverser la direction
            if (collided) {
                this.direction *= -1;
            }
            
            this.x = nextX; // Appliquer la nouvelle position (potentiellement ajustée)

            // Assurer que la plateforme ne sort pas des limites du niveau
            if (this.x < 0) {
                this.x = 0;
                this.direction = 1;
            } else if (this.x + this.width > levelWidth) {
                this.x = levelWidth - this.width;
                this.direction = -1;
            }

        } else if (this.type === 'disappearing') {
            if (this.isDisappeared) { 
                this.reappearTimer++;
                if (this.reappearTimer >= this.reappearDelay) {
                    this.visible = true; 
                    this.isDisappeared = false; 
                    this.reappearTimer = 0; 
                    this.timer = 0; 
                }
            } else { 
                this.timer++;
                if (this.timer > 100) { 
                    this.visible = false; 
                    this.isDisappeared = true; 
                    this.timer = 0; 
                }
            }
        } else if (this.isTemporary && this.touched) {
            this.disappearTimer++;
            if (this.disappearTimer >= this.disappearDelay) {
                this.visible = false; 
            }
        }
        
        // NOUVEAU: Logique de disparition pour les plateformes du mode Jump
        if (this.disappearAfterTouch && this.touched) {
            this.disappearTimer++;
            if (this.disappearTimer >= this.disappearDelay) {
                this.visible = false;
            }
        }
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        if (this.visible) {
            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjusted = this.y - cameraY;

            if (this.isSticky) {
                // Dessiner l'image de la plateforme collante
                if (this.chosenStickyImage && this.chosenStickyImage.complete) {
                    ctx.drawImage(this.chosenStickyImage, this.x - offsetX, drawYAdjusted, this.width, this.height);
                } else {
                    // Fallback couleur si l'image ne charge pas
                    ctx.fillStyle = '#A0522D';
                    ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height);
                }
            } else if (this.isBouncy) {
                // NOUVEAU: Dessiner l'image de la plateforme rebondissante (une seule, étirée)
                if (this.chosenBouncyImage && this.chosenBouncyImage.complete) {
                    ctx.drawImage(this.chosenBouncyImage, this.x - offsetX, drawYAdjusted, this.width, this.height);
                } else {
                    // Fallback couleur si l'image ne charge pas
                    ctx.fillStyle = '#00FF00'; 
                    ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX
                }
            } else if (this.isTemporary) {
                const imgLeft = images.plateformetemporarygauche;
                const imgMiddle = images.plateformetemporarymilieu; 
                const imgRight = images.plateformetemporarydroite;

                if (!imgLeft || !imgMiddle || !imgRight ||
                    !imgLeft.complete || !imgMiddle.complete || !imgRight.complete ||
                    imgLeft.height === 0 || imgMiddle.height === 0 || imgRight.height === 0) {
                    ctx.fillStyle = '#FFD700'; // Fallback couleur si les images ne chargent pas
                    ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX
                    return;
                }

                const platformDrawingHeight = this.height; 
                const scaledLeftWidth = imgLeft.width * (platformDrawingHeight / imgLeft.height);
                const scaledMiddleTileWidth = imgMiddle.width * (platformDrawingHeight / imgMiddle.height);
                const scaledRightWidth = imgRight.width * (platformDrawingHeight / imgRight.height);
                
                const overlapAmount = 2; // Ajustez si nécessaire pour un raccord parfait

                ctx.drawImage(imgLeft, this.x - offsetX, drawYAdjusted, scaledLeftWidth, platformDrawingHeight); // Appliquer offsetX

                const middleStartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
                const middleSectionTargetEnd = (this.x - offsetX) + this.width - scaledRightWidth + overlapAmount; // Appliquer offsetX

                let actualMiddleDrawingWidth = middleSectionTargetEnd - middleStartX;
                if (actualMiddleDrawingWidth < 0) { actualMiddleDrawingWidth = 0; }

                if (actualMiddleDrawingWidth > 0) {
                    const effectiveTileWidthForPositioning = scaledMiddleTileWidth - overlapAmount; 
                    const safeEffectiveTileWidth = Math.max(1, effectiveTileWidthForPositioning); 

                    let currentX = middleStartX; 

                    while (currentX < middleSectionTargetEnd) {
                        let drawWidth = scaledMiddleTileWidth; 

                        if (currentX + scaledMiddleTileWidth > middleSectionTargetEnd) {
                            drawWidth = middleSectionTargetEnd - currentX;
                        }

                        if (drawWidth <= 0) break;

                        ctx.drawImage(imgMiddle, currentX, drawYAdjusted, drawWidth, platformDrawingHeight);
                        currentX += safeEffectiveTileWidth; 
                    }
                }

                const rightPartDrawingX = (this.x - offsetX) + this.width - scaledRightWidth - overlapAmount; // Appliquer offsetX
                const minRightPartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
                const finalRightPartXForDrawing = Math.max(rightPartDrawingX, minRightPartX);

                ctx.drawImage(imgRight, finalRightPartXForDrawing, drawYAdjusted, scaledRightWidth, platformDrawingHeight);
            } else if (this.type === 'disappearing') { 
                const imgLeft = images.plateformeverregauche;
                const imgMiddle = images.plateformeverre; 
                const imgRight = images.plateformeverredroite;

                if (!imgLeft || !imgMiddle || !imgRight ||
                    !imgLeft.complete || !imgMiddle.complete || !imgRight.complete ||
                    imgLeft.height === 0 || imgMiddle.height === 0 || imgRight.height === 0) {
                    ctx.fillStyle = '#FF00FF'; 
                    ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX
                    return;
                }

                const platformDrawingHeight = this.height; 
                const scaledLeftWidth = imgLeft.width * (platformDrawingHeight / imgLeft.height);
                const scaledMiddleTileWidth = imgMiddle.width * (platformDrawingHeight / imgMiddle.height);
                const scaledRightWidth = imgRight.width * (platformDrawingHeight / imgRight.height);
                
                const overlapAmount = 2; 

                ctx.drawImage(imgLeft, this.x - offsetX, drawYAdjusted, scaledLeftWidth, platformDrawingHeight); // Appliquer offsetX

                const middleStartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
                const middleSectionTargetEnd = (this.x - offsetX) + this.width - scaledRightWidth + overlapAmount; // Appliquer offsetX

                let actualMiddleDrawingWidth = middleSectionTargetEnd - middleStartX;
                if (actualMiddleDrawingWidth < 0) { actualMiddleDrawingWidth = 0; }

                if (actualMiddleDrawingWidth > 0) {
                    const effectiveTileWidthForPositioning = scaledMiddleTileWidth - overlapAmount; 
                    const safeEffectiveTileWidth = Math.max(1, effectiveTileWidthForPositioning); 

                    let currentX = middleStartX; 

                    while (currentX < middleSectionTargetEnd) {
                        let drawWidth = scaledMiddleTileWidth; 

                        if (currentX + scaledMiddleTileWidth > middleSectionTargetEnd) {
                            drawWidth = middleSectionTargetEnd - currentX;
                        }

                        if (drawWidth <= 0) break;

                        ctx.drawImage(imgMiddle, currentX, drawYAdjusted, drawWidth, platformDrawingHeight);
                        currentX += safeEffectiveTileWidth; 
                    }
                }

                const rightPartDrawingX = (this.x - offsetX) + this.width - scaledRightWidth - overlapAmount; // Appliquer offsetX
                const minRightPartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
                const finalRightPartXForDrawing = Math.max(rightPartDrawingX, minRightPartX);

                ctx.drawImage(imgRight, finalRightPartXForDrawing, drawYAdjusted, scaledRightWidth, platformDrawingHeight);
            } else if (this.type === 'moving') { 
                const imgLeft = images.plateformeboisgauche;
                const imgMiddle = images.plateformebois; 
                const imgRight = images.plateformeboisdroit; 

                if (!imgLeft || !imgMiddle || !imgRight ||
                    !imgLeft.complete || !imgMiddle.complete || !imgRight.complete ||
                    imgLeft.height === 0 || imgMiddle.height === 0 || imgRight.height === 0) {
                    ctx.fillStyle = '#A52A2A'; 
                    ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX
                    return;
                }

                const platformDrawingHeight = this.height; 
                const scaledLeftWidth = imgLeft.width * (platformDrawingHeight / imgLeft.height);
                const scaledMiddleTileWidth = imgMiddle.width * (platformDrawingHeight / imgMiddle.height);
                const scaledRightWidth = imgRight.width * (platformDrawingHeight / imgRight.height);
                
                const overlapAmount = 2; 

                ctx.drawImage(imgLeft, this.x - offsetX, drawYAdjusted, scaledLeftWidth, platformDrawingHeight); // Appliquer offsetX

                const middleStartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
                const middleSectionTargetEnd = (this.x - offsetX) + this.width - scaledRightWidth + overlapAmount; // Appliquer offsetX

                let actualMiddleDrawingWidth = middleSectionTargetEnd - middleStartX;
                if (actualMiddleDrawingWidth < 0) { actualMiddleDrawingWidth = 0; }

                if (actualMiddleDrawingWidth > 0) {
                    const effectiveTileWidthForPositioning = scaledMiddleTileWidth - overlapAmount; 
                    const safeEffectiveTileWidth = Math.max(1, effectiveTileWidthForPositioning); 

                    let currentX = middleStartX; 

                    while (currentX < middleSectionTargetEnd) {
                        let drawWidth = scaledMiddleTileWidth; 

                        if (currentX + scaledMiddleTileWidth > middleSectionTargetEnd) {
                            drawWidth = middleSectionTargetEnd - currentX;
                        }

                        if (drawWidth <= 0) break;

                        ctx.drawImage(imgMiddle, currentX, drawYAdjusted, drawWidth, platformDrawingHeight);
                        currentX += safeEffectiveTileWidth; 
                    }
                }

                const rightPartDrawingX = (this.x - offsetX) + this.width - scaledRightWidth - overlapAmount; // Appliquer offsetX
                const minRightPartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
                const finalRightPartXForDrawing = Math.max(rightPartDrawingX, minRightPartX);

                ctx.drawImage(imgRight, finalRightPartXForDrawing, drawYAdjusted, scaledRightWidth, platformDrawingHeight);
            } else {
                ctx.fillStyle = '#654321'; 
                ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX
            }
        }
    }
}

// Classe pour les plateformes modulaires (composées d'images gauche, milieu, droite)
class ModularPlatform {
    constructor(x, y, width, disappearAfterTouch = false) { // Ajout de disappearAfterTouch
        this.x = x;
        this.y = y;
        this.width = width; 
        this.height = 20; 

        this.imgLeft = images.plateformegauche;
        this.imgMiddle = images.plateformemilieu;
        this.imgRight = images.plateformedroite;

        this.disappearAfterTouch = disappearAfterTouch; // Nouvelle propriété
        this.touched = false;
        this.disappearTimer = 0;
        this.disappearDelay = 120; // Délai avant disparition (2 secondes à 60 FPS)
        this.visible = true;
    }

    update() {
        if (this.disappearAfterTouch && this.touched) {
            this.disappearTimer++;
            if (this.disappearTimer >= this.disappearDelay) {
                this.visible = false;
            }
        }
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        if (!this.visible) return; // Ne dessine pas si invisible

        // Appliquer le décalage de la caméra Y pour le dessin
        let drawYAdjusted = this.y - cameraY;

        if (!this.imgLeft || !this.imgMiddle || !this.imgRight ||
            !this.imgLeft.complete || !this.imgMiddle.complete || !this.imgRight.complete ||
            this.imgLeft.height === 0 || this.imgMiddle.height === 0 || this.imgRight.height === 0) { 
            ctx.fillStyle = '#808080'; 
            ctx.fillRect(this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX
            return;
        }

        const platformDrawingHeight = this.height; 
        const scaledLeftWidth = this.imgLeft.width * (platformDrawingHeight / this.imgLeft.height);
        const scaledMiddleTileWidth = this.imgMiddle.width * (platformDrawingHeight / this.imgMiddle.height);
        const scaledRightWidth = this.imgRight.width * (platformDrawingHeight / this.imgRight.height);
        
        const overlapAmount = 1; 

        ctx.drawImage(this.imgLeft, this.x - offsetX, drawYAdjusted, scaledLeftWidth, platformDrawingHeight); // Appliquer offsetX

        const middleStartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
        const middleSectionTargetEnd = (this.x - offsetX) + this.width - scaledRightWidth + overlapAmount; // Appliquer offsetX

        let actualMiddleDrawingWidth = middleSectionTargetEnd - middleStartX;
        if (actualMiddleDrawingWidth < 0) { actualMiddleDrawingWidth = 0; }

        if (actualMiddleDrawingWidth > 0) {
            const effectiveTileWidthForPositioning = scaledMiddleTileWidth - overlapAmount; 
            const safeEffectiveTileWidth = Math.max(1, effectiveTileWidthForPositioning); 

            let currentX = middleStartX; 

            while (currentX < middleSectionTargetEnd) {
                let drawWidth = scaledMiddleTileWidth; 

                if (currentX + scaledMiddleTileWidth > middleSectionTargetEnd) {
                    drawWidth = middleSectionTargetEnd - currentX;
                }

                if (drawWidth <= 0) break;

                ctx.drawImage(this.imgMiddle, currentX, drawYAdjusted, drawWidth, platformDrawingHeight);
                currentX += safeEffectiveTileWidth; 
            }
        }

        const rightPartDrawingX = (this.x - offsetX) + this.width - scaledRightWidth - overlapAmount; // Appliquer offsetX
        const minRightPartX = (this.x - offsetX) + scaledLeftWidth - overlapAmount; // Appliquer offsetX
        const finalRightPartXForDrawing = Math.max(rightPartDrawingX, minRightPartX);

        ctx.drawImage(this.imgRight, finalRightPartXForDrawing, drawYAdjusted, scaledRightWidth, platformDrawingHeight);
    }
}

// Classe pour le sol/plafond
class Ground {
    constructor(x, y, width, height, position = 'bottom') { // Ajout de 'position'
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.position = position; // 'bottom' ou 'top'
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        const img = images.sole;
        if (img && img.complete && img.width > 0 && img.height > 0) { 
            const tileWidth = img.width; 
            const tileHeight = img.height; 

            const numTilesX = Math.ceil(this.width / tileWidth);

            ctx.save(); // Sauvegarder l'état du canvas

            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjusted = this.y - cameraY;

            if (currentMode === 'adventure' && this.position === 'top' && gravityInverted) {
                // Inverser l'image verticalement autour de l'axe X du sol
                ctx.translate((this.x - offsetX) + this.width / 2, drawYAdjusted + this.height / 2); // Appliquer offsetX
                ctx.scale(1, -1);
                ctx.translate(-(this.x - offsetX) + this.width / 2, -(drawYAdjusted + this.height / 2)); // Appliquer offsetX
            }

            for (let i = 0; i < numTilesX; i++) {
                ctx.drawImage(img, (this.x - offsetX) + (i * tileWidth), drawYAdjusted, tileWidth, this.height); // Appliquer offsetX
            }
            ctx.restore(); // Restaurer l'état du canvas
        } else {
            ctx.fillStyle = '#A0522D'; 
            ctx.fillRect(this.x - offsetX, this.y - cameraY, this.width, this.height); // Appliquer offsetX et cameraY
        }
    }
}

// Classe pour les murs
class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        const img = images.mur;
        if (img && img.complete && img.width > 0 && img.height > 0) {
            const wallDrawingWidth = this.width; 
            const wallDrawingHeight = this.height; 

            const scaledTileHeight = img.height * (wallDrawingWidth / img.width);

            const numTilesY = Math.ceil(wallDrawingHeight / scaledTileHeight);

            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjustedStart = this.y - cameraY;

            for (let i = 0; i < numTilesY; i++) {
                let drawY = drawYAdjustedStart + (i * scaledTileHeight);
                let drawHeight = scaledTileHeight;

                if (drawY + drawHeight > drawYAdjustedStart + wallDrawingHeight) {
                    drawHeight = (drawYAdjustedStart + wallDrawingHeight) - drawY;
                }

                if (drawHeight > 0) {
                    ctx.drawImage(img, this.x - offsetX, drawY, wallDrawingWidth, drawHeight); // Appliquer offsetX
                }
            }
        } else {
            ctx.fillStyle = '#654321'; 
            ctx.fillRect(this.x - offsetX, this.y - cameraY, this.width, this.height); // Appliquer offsetX et cameraY
        }
    }
}

// Classe pour les étoiles (avoine)
class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30; 
        this.collected = false;
        const imagesAvoine = [images.avoine1, images.avoine2]; 
        this.chosenImage = imagesAvoine[Math.floor(Math.random() * imagesAvoine.length)];
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        if (!this.collected) {
            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjusted = this.y - cameraY;
            ctx.drawImage(this.chosenImage, this.x - offsetX, drawYAdjusted, this.size, this.size); // Appliquer offsetX et cameraY
        }
    }
}

// Classe pour les collectables de vie
class LifeUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30; // Même taille que le texte des vies
        this.collected = false;
        this.width = this.size; // Ajouter la largeur pour la détection de collision
        this.height = this.size; // Ajouter la hauteur pour la détection de collision
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        if (!this.collected) {
            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjusted = this.y - cameraY;
            // Utilise l'image blobfixe.png
            ctx.drawImage(images.blobfixe, this.x - offsetX, drawYAdjusted, this.size, this.size); // Appliquer offsetX et cameraY
        }
    }
}

// Classe pour les ennemis
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type; 
        // Marge de rétrécissement pour la hitbox des ennemis volatils
        this.hitboxShrink = (type === 'volatile') ? 15 : 0; 

        if (this.type === 'volatile') {
            this.width = 80;  
            this.height = 40;
            this.speed = 3;   
        } else { 
            this.width = 40;
            this.height = 40;
            this.speed = 2;
        }

        this.direction = 1; 
        this.facingRight = true; 
    }

    update() {
        let nextX = this.x + this.speed * this.direction;
        let collided = false;

        // Créer une hitbox hypothétique pour la prochaine position de l'ennemi
        let hypotheticalEnemy = {
            x: nextX,
            y: this.y,
            width: this.width,
            height: this.height
        };

        // Vérifier les collisions avec les murs
        currentWalls.forEach(wall => {
            if (isColliding(hypotheticalEnemy, wall)) {
                collided = true;
                const dir = collisionDirection(hypotheticalEnemy, wall);
                if (dir === 'left') { // L'ennemi hypothétique a frappé le mur depuis sa gauche (côté droit du mur)
                    nextX = wall.x + wall.width;
                } else if (dir === 'right') { // L'ennemi hypothétique a frappé le mur depuis sa droite (côté gauche du mur)
                    nextX = wall.x - this.width;
                }
            }
        });

        // Vérifier les collisions avec les plateformes
        const allPlatforms = [
            ...currentPlatforms.filter(p => p.visible), // Inclure toutes les plateformes visibles
            ...currentModularPlatforms.filter(mp => mp.visible) // Inclure toutes les plateformes modulaires visibles
        ];

        allPlatforms.forEach(platform => {
            // Mettre à jour la position hypothétique avec le nextX potentiellement ajusté par les murs
            hypotheticalEnemy.x = nextX; 
            if (isColliding(hypotheticalEnemy, platform)) {
                collided = true;
                const dir = collisionDirection(hypotheticalEnemy, platform);
                if (dir === 'left') {
                    nextX = platform.x + platform.width;
                } else if (dir === 'right') {
                    nextX = platform.x - this.width;
                }
            }
        });

        // Si une collision a eu lieu, inverser la direction
        if (collided) {
            this.direction *= -1;
            this.facingRight = !this.facingRight; // Inverser l'orientation de l'image
        }
        
        this.x = nextX; // Appliquer la nouvelle position (potentiellement ajustée)

        // Limiter les ennemis aux bords du niveau (pas seulement du canvas visible)
        if (this.x < 0) {
            this.x = 0; 
            this.direction = 1; 
            this.facingRight = true; 
        } else if (this.x + this.width > levelWidth) { // Utiliser levelWidth
            this.x = levelWidth - this.width; 
            this.direction = -1; 
            this.facingRight = false; 
        }
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        let imageToDraw;
        if (this.type === 'volatile') {
            imageToDraw = this.facingRight ? images.oiseau : images.oiseauinverse;
        } else { 
            imageToDraw = this.facingRight ? images.limace : images.limaceinverse;
        }
        // Appliquer le décalage de la caméra Y pour le dessin
        let drawYAdjusted = this.y - cameraY;
        ctx.drawImage(imageToDraw, this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX et cameraY
    }
}

// Classe pour les pics (maintenant avec un type pour l'image)
class Spike {
    constructor(x, y, type = 'ground') { // Ajout du paramètre 'type'
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.type = type; // 'ground' ou 'air'
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        let img;
        if (this.type === 'air') {
            img = images.picair; // Utilise la nouvelle image pour les pics aériens
        } else {
            img = images.pic; // Utilise l'image normale pour les pics au sol
        }
        
        if (img && img.complete) {
            // Appliquer le décalage de la caméra Y pour le dessin
            let drawYAdjusted = this.y - cameraY;
            ctx.drawImage(img, this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX et cameraY
        } else {
            // Fallback couleur si l'image ne charge pas
            ctx.fillStyle = '#FF0000'; 
            ctx.fillRect(this.x - offsetX, this.y - cameraY, this.width, this.height); // Appliquer offsetX et cameraY
        }
    }
}

// Classe pour les ressorts (trampolines)
class Spring {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 20;
    }

    // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
    draw() {
        // Appliquer le décalage de la caméra Y pour le dessin
        let drawYAdjusted = this.y - cameraY;
        ctx.drawImage(images.trampo, this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX et cameraY
    }
}

// Classe pour les téléporteurs
class Teleporter {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.width = 80;
    this.height = 80;
    this.id = id; 
  }

  // --- MODIFICATION DE LA MÉTHODE DRAW DU JOUEUR ---
  draw() {
    const img = images.teleporter;
    // Appliquer le décalage de la caméra Y pour le dessin
    let drawYAdjusted = this.y - cameraY;
    ctx.drawImage(img, this.x - offsetX, drawYAdjusted, this.width, this.height); // Appliquer offsetX et cameraY
  }
}

// Fonction pour trouver le téléporteur jumelé
function getPairedTeleporter(current) {
    return currentTeleporters.find(tp => tp.id === current.id && tp !== current);
}

// Variables de jeu globales
let levels = []; // Tableau des niveaux (rempli par initLevels de levels.js)
let currentLevelIndex = 0;

let player; // Déclaration globale du joueur

let currentPlatforms = [];
let currentStars = [];
let currentEnemies = [];
let currentSpikes = [];
let currentSprings = [];
let currentTeleporters = [];
let currentWalls = [];
let currentLifeUps = []; 
let levelComplete = false;
let gravityInverted = false;
let levelTransitionTimer = 0;
let inLevelTransition = false;
let currentGrounds = []; 
let currentModularPlatforms = [];
let starsCollectedInCurrentLevel = 0;
let totalStarsInCurrentLevel = 0;


/**
 * Updates the high score display on the welcome screen.
 * This function is now in jump.js.
 */
function updateJumpHighScoreDisplay() { // Kept here as it's called from game.js for initial load
    const highScoreValueSpan = document.getElementById('highScoreValue');
    if (highScoreValueSpan) {
        // Access jumpHighScore from jump.js if it's made global, or pass it as parameter
        // For now, it will be called after jump.js has loaded and initialized jumpHighScore.
        highScoreValueSpan.textContent = typeof jumpHighScore !== 'undefined' ? jumpHighScore : 0;
    }
}


/**
 * Charge un niveau spécifique.
 * @param {number} index L'index du niveau à charger.
 */
function loadLevel(index) {
    let levelData = levels[index]; // Use a different name to avoid confusion with the global 'level' variable

    // Create new instances for all game objects to ensure a fresh state
    currentGrounds = levelData.grounds.map(g => new Ground(g.x, g.y, g.width, g.height, g.position));
    currentPlatforms = levelData.platforms.map(p => new Platform(p.x, p.y, p.width, p.type, p.disappearAfterTouch));
    currentModularPlatforms = levelData.modularPlatforms.map(mp => new ModularPlatform(mp.x, mp.y, mp.width, mp.disappearAfterTouch));
    currentWalls = levelData.walls.map(w => new Wall(w.x, w.y, w.width, w.height));
    currentStars = levelData.stars.map(s => new Star(s.x, s.y)); // This is the key fix for stars
    currentEnemies = levelData.enemies.map(e => new Enemy(e.x, e.y, e.type));
    currentSpikes = levelData.spikes.map(s => new Spike(s.x, s.y, s.type));
    currentSprings = levelData.springs.map(s => new Spring(s.x, s.y));
    currentTeleporters = levelData.teleporters.map(t => new Teleporter(t.x, t.y, t.id));
    currentLifeUps = (levelData.lifeUps || []).map(lu => new LifeUp(lu.x, lu.y));

    gravityInverted = levelData.gravityInverted || false;
    enableHorizontalScrolling = levelData.enableHorizontalScrolling || false;
    levelWidth = levelData.levelWidth || canvas.width;
    offsetX = 0; // Réinitialise le décalage de la caméra à chaque nouveau niveau

    // --- NOUVELLE LOGIQUE POUR LE DÉFILEMENT VERTICAL DANS loadLevel ---
    verticalScrollingEnabled = levelData.verticalScrolling || false;
    levelHeight = levelData.levelHeight || canvas.height; // Utilise la hauteur du niveau ou la hauteur du canvas par défaut

    player = new Player(); // Crée un nouveau joueur pour le niveau (réinitialise sa position)
    // Utilise les coordonnées de spawn du niveau si définies
    if (levelData.playerStartX !== undefined && levelData.playerStartY !== undefined) {
        player.x = levelData.playerStartX;
        player.y = levelData.playerStartY;
    }

    // Position initiale de la caméra pour le défilement vertical
    if (verticalScrollingEnabled) {
        // La caméra commence en bas du niveau, montrant la zone de départ du joueur.
        // Cela place le bas du canvas à la hauteur totale du niveau.
        cameraY = levelHeight - canvas.height;
    } else {
        cameraY = 0; // Pas de défilement vertical, la caméra est fixe en haut
    }
    console.log(`Niveau ${index + 1} chargé. Défilement vertical : ${verticalScrollingEnabled}, Hauteur du niveau : ${levelHeight}`);
    // --- FIN DE LA NOUVELLE LOGIQUE POUR LE DÉFILEMENT VERTICAL DANS loadLevel ---


    levelComplete = false;
    inLevelTransition = false;
    levelTransitionTimer = 0;
    isLastStarCollectedAnimation = false;
    
    starsCollectedInCurrentLevel = 0; 
    totalStarsInCurrentLevel = currentStars.length; // Use the newly instantiated stars array length
    updateAvoineIndicatorHTML(); 
    updateLivesIndicatorHTML(); 
    if (levelIndicatorDiv) { 
        levelIndicatorDiv.textContent = `Niveau: ${currentLevelIndex + 1}`;
    }

    isGamePaused = false;
    gameOverScreen.style.display = 'none';
    backToHomeInGameBtn.style.display = 'block';
}

/**
 * Gère la fin de partie (Game Over).
 */
function gameOver() {
    isGamePaused = true; // Met le jeu en pause

    // Personnaliser le message de Game Over
    if (currentMode === 'adventure') {
        gameOverTitle.textContent = "Game Over, petit Blob !";
        gameOverMessage.textContent = "Tu as perdu toutes tes vies. Le chemin de l'avoine est seme d'embuches, mais ne lache rien !";
    } else if (currentMode === 'jump') {
        gameOverTitle.textContent = "Game Over ! Ton Blob a fait un plongeon memorable !";
        gameOverMessage.textContent = "Meme les meilleurs blobs finissent par gouter au vide. Mais hey, au moins tu as fait un beau saut... vers le bas !";
        // La mise à jour du high score est maintenant gérée dans gameOverJumpMode() de jump.js
    }

    showGameOverScreen(); // Affiche l'écran Game Over personnalisé
    backToHomeInGameBtn.style.display = 'none'; // Cache le bouton "Retour à l'Accueil" en jeu
}

/**
 * Affiche l'écran personnalisé de Game Over.
 */
function showGameOverScreen() {
    gameOverScreen.style.display = 'flex'; // Affiche la fenêtre Game Over
}

// NOUVEAU: Fonction pour afficher la modale de fin de jeu
function showEndGameModal() {
    isGamePaused = true; // Met le jeu en pause
    if (gameFrameId) {
        cancelAnimationFrame(gameFrameId);
        gameFrameId = null;
    }
    if (endGameModal) { // Vérifie si endGameModal est défini avant d'accéder à .style
        endGameModal.style.display = 'flex'; // Affiche la modale
    }
    // Cacher les éléments de l'UI du jeu
    if (levelIndicatorDiv) levelIndicatorDiv.style.display = 'none';
    if (avoineIndicatorDiv) avoineIndicatorDiv.style.display = 'none';
    if (livesIndicatorDiv) livesIndicatorDiv.style.display = 'none'; // Cache l'indicateur de vies
    if (backToHomeInGameBtn) backToHomeInGameBtn.style.display = 'none'; // Cache le bouton "Retour à l'Accueil" en jeu
}

/**
 * Gère les dégâts subis par le joueur.
 * Décrémente une vie et applique l'invincibilité.
 * Si plus de vies, appelle gameOver().
 * Le joueur est réinitialisé au début du niveau si des vies restent.
 * @param {boolean} resetPosition Indique si le joueur doit être réinitialisé à sa position de départ.
 */
function playerTakeDamage(resetPosition = false) {
    // If it's a fall-off in Jump mode, it's always game over, regardless of invincibility
    if (currentMode === 'jump' && resetPosition) {
        gameOverJumpMode();
        return; // Exit function immediately
    }

    if (isInvincible) {
        return; // For other damage types, respect invincibility
    }

    playerLives--; // Décrémente une vie
    updateLivesIndicatorHTML(); // Met à jour l'affichage des vies

    isInvincible = true; // Active l'invincibilité
    invincibilityTimer = 0; // Réinitialise le timer d'invincibilité

    // Appliquer un effet de recul (knockback)
    const knockbackForce = 10; // Force de recul réduite drastiquement
    if (player.facingRight) {
        player.velX = -knockbackForce; // Recul vers la gauche
    } else {
        player.velX = knockbackForce; // Recul vers la droite
    }
    player.velY = -knockbackForce; // Recul vers le haut

    // Ensure player is off the ground after being hit
    player.onGround = false; // Explicitly set to false
    // Adjust player's Y position slightly to prevent immediate re-collision with the same platform
    // This is important if player was on a platform when hit
    if (player.gravity > 0) { // Normal gravity
        player.y -= 30; // Move up slightly more
    } else { // Inverted gravity
        player.y += 30; // Move down slightly more
    }

    if (playerLives <= 0) {
        if (currentMode === 'jump') {
            gameOverJumpMode(); // Si les vies sont épuisées en mode Jump
        } else {
            gameOver(); // Si les vies sont épuisées en mode Aventure
        }
    } else {
        // Seulement réinitialiser la position pour le mode Aventure si des vies restent
        if (resetPosition && currentMode === 'adventure') {
            player = new Player();
            if (levels[currentLevelIndex].playerStartX !== undefined && levels[currentLevelIndex].playerStartY !== undefined) {
                player.x = levels[currentLevelIndex].playerStartX;
                player.y = levels[currentLevelIndex].playerStartY;
            }
            offsetX = 0;
            // Réinitialiser la caméra Y si le défilement vertical est activé
            if (verticalScrollingEnabled) {
                cameraY = levelHeight - canvas.height;
            } else {
                cameraY = 0;
            }
        }
    }
}

/**
 * Gère le timer d'invincibilité du joueur.
 */
function handlePlayerInvincibility() {
    if (isInvincible) {
        invincibilityTimer++;
        if (invincibilityTimer >= invincibilityDuration) {
            isInvincible = false;
            invincibilityTimer = 0;
        }
    }
}

// Fonction de mise à jour principale du jeu pour le mode Aventure
function updateAdventureMode() {
    if (isGamePaused) return;

    if (inLevelTransition) {
        levelTransitionTimer++;
        if (levelTransitionTimer > 60) {
            inLevelTransition = false;
        }
        return;
    }

    handlePlayerInvincibility(); // Gérer le timer d'invincibilité

    // Gérer l'animation de la dernière étoile collectée
    if (isLastStarCollectedAnimation) {
        lastStarAnimationTimer++;
        if (lastStarAnimationTimer >= lastStarAnimationDuration) {
            isLastStarCollectedAnimation = false; // Fin de l'animation
            levelComplete = true; // Déclenche la logique normale de fin de niveau
        }
        return; // Mettre en pause la logique du jeu pendant cette animation
    }

    // Ajuster la gravité du joueur en fonction du niveau
    if (gravityInverted) {
        player.gravity = -0.5;
    } else {
        player.gravity = 0.5;
    }

    player.update(); 
    currentPlatforms.forEach(platform => platform.update()); 
    currentEnemies.forEach(enemy => enemy.update()); 
    currentModularPlatforms.forEach(mp => mp.update()); 
    checkCollisions(); 

    // --- LOGIQUE DE LA CAMÉRA POUR LE DÉFILEMENT VERTICAL (À AJOUTER) ---
    if (verticalScrollingEnabled) {
        // Garder le joueur dans le tiers central de l'écran verticalement
        const playerScreenY = player.y - cameraY; // Position Y du joueur par rapport au haut de l'écran
        const deadZoneTop = canvas.height * 0.3; // 30% du haut de l'écran
        const deadZoneBottom = canvas.height * 0.7; // 70% du haut de l'écran

        if (playerScreenY < deadZoneTop) {
            // Le joueur monte, la caméra doit suivre vers le haut
            cameraY = Math.max(0, player.y - deadZoneTop);
        } else if (playerScreenY > deadZoneBottom) {
            // Le joueur descend, la caméra doit suivre vers le bas
            cameraY = Math.min(levelHeight - canvas.height, player.y - deadZoneBottom);
        }

        // S'assurer que la caméra ne dépasse pas les limites du niveau
        cameraY = Math.max(0, Math.min(levelHeight - canvas.height, cameraY));
    }
    // --- FIN DE LA LOGIQUE DE LA CAMÉRA POUR LE DÉFILEMENT VERTICAL ---


    if (levelComplete) {
        // Réinitialiser levelComplete immédiatement pour éviter les sauts de niveau
        levelComplete = false; 
        inLevelTransition = true;
        levelTransitionTimer = 0;
        
        // Vérifier si c'est le dernier niveau (niveau 40, index 39)
        if (currentLevelIndex === levels.length - 1) {
            showEndGameModal(); // Afficher la modale de félicitations
        } else {
            // Avant d'incrémenter, vérifier si le niveau suivant doit être débloqué
            if (currentLevelIndex + 1 < levels.length && (currentLevelIndex + 1) > highestUnlockedLevel) {
                highestUnlockedLevel = currentLevelIndex + 1;
                saveAdventureProgress(); // Sauvegarder le nouveau niveau débloqué
                populateLevelSelect(); // Mettre à jour le sélecteur de niveaux
            }

            currentLevelIndex++;
            if (currentLevelIndex < levels.length) {
                setTimeout(() => {
                    loadLevel(currentLevelIndex); 
                }, 1000); 
            } else {
                // Si on arrive ici, c'est que currentLevelIndex est > levels.length
                // et ce n'était pas le dernier niveau (donc il n'y a plus de niveau)
                gameOver(); 
            }
        }
    }
}

// Fonction de dessin principale pour le mode Aventure
function drawAdventureMode() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (inLevelTransition) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Niveau ${currentLevelIndex + 1}`, canvas.width / 2, canvas.height / 2);
    } else {
        // --- NOUVEAU: Dessin du fond d'écran ---
        const bgImage = images.fondecran;
        const bgSkyImage = images.fondecranciel;
        const bgWidth = 1440; // Largeur de l'image de fond
        const bgHeight = 1024; // Hauteur de l'image de fond

        if (bgImage && bgImage.complete) {
            if (verticalScrollingEnabled) {
                // Pour les niveaux à défilement vertical, dessiner le sol et le ciel
                // Dessiner le fond du sol (fondecran.png)
                const groundBgY = levelHeight - bgHeight; // Position Y du bas du fond d'écran
                let startDrawY = groundBgY - cameraY;

                // S'assurer que le fond du sol est dessiné si visible
                if (startDrawY < canvas.height) {
                    // Calculer le nombre de répétitions horizontales
                    const numRepeatsX = Math.ceil(levelWidth / bgWidth);
                    for (let i = 0; i < numRepeatsX; i++) {
                        ctx.drawImage(bgImage, i * bgWidth - offsetX, startDrawY, bgWidth, bgHeight);
                    }
                }

                // Dessiner le fond du ciel (fondecranciel.png) au-dessus du fond du sol
                if (bgSkyImage && bgSkyImage.complete) {
                    const skyBgHeight = bgSkyImage.height;
                    const skyBgYStart = groundBgY - skyBgHeight; // Le ciel commence juste au-dessus du fond du sol

                    // Dessiner le ciel en le répétant verticalement au-dessus du sol
                    // Le ciel doit s'étendre jusqu'au sommet du niveau (ou plus haut si le niveau est court)
                    let currentSkyY = skyBgYStart;
                    while (currentSkyY > -skyBgHeight) { // Tant que le ciel est potentiellement visible au-dessus du canvas
                        let drawSkyY = currentSkyY - cameraY;
                        if (drawSkyY < canvas.height && drawSkyY + skyBgHeight > 0) { // Si la partie du ciel est visible
                            // Répéter horizontalement le ciel
                            const numRepeatsX = Math.ceil(levelWidth / bgWidth);
                            for (let i = 0; i < numRepeatsX; i++) {
                                ctx.drawImage(bgSkyImage, i * bgWidth - offsetX, drawSkyY, bgWidth, skyBgHeight);
                            }
                        }
                        currentSkyY -= skyBgHeight; // Monter pour la prochaine tuile de ciel
                    }
                }

            } else if (enableHorizontalScrolling) {
                // Pour les niveaux à défilement horizontal, répéter fondecran.png
                const numRepeats = Math.ceil(levelWidth / bgWidth);
                for (let i = 0; i < numRepeats; i++) {
                    ctx.drawImage(bgImage, i * bgWidth - offsetX, 0, bgWidth, canvas.height);
                }
            } else {
                // Pour les niveaux sans défilement, dessiner fondecran.png une seule fois
                ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
            }
        }
        // --- FIN NOUVEAU: Dessin du fond d'écran ---

        // Dessiner tous les objets Ground
        currentGrounds.forEach(ground => { 
            ground.draw(); // La méthode draw de Ground utilise déjà cameraY
        });
        // Dessiner le joueur
        player.draw(); // La méthode draw du Player utilise déjà cameraY
        // Dessiner les plateformes
        currentPlatforms.forEach(platform => platform.draw()); // La méthode draw de Platform utilise déjà cameraY
        // Dessiner les étoiles
        currentStars.forEach(star => star.draw()); // La méthode draw de Star utilise déjà cameraY
        // Dessiner les ennemis
        currentEnemies.forEach(enemy => enemy.draw()); // La méthode draw de Enemy utilise déjà cameraY
        // Dessiner les pics
        currentSpikes.forEach(spike => spike.draw()); // La méthode draw de Spike utilise déjà cameraY
        // Dessiner les ressorts
        currentSprings.forEach(spring => spring.draw()); // La méthode draw de Spring utilise déjà cameraY
        // Dessiner les murs
        currentWalls.forEach(wall => wall.draw()); // La méthode draw de Wall utilise déjà cameraY
        // Dessiner les plateformes modulaires
        currentModularPlatforms.forEach(mp => mp.draw()); // La méthode draw de ModularPlatform utilise déjà cameraY
        // Dessiner les téléporteurs
        currentTeleporters.forEach(teleporter => teleporter.draw()); // La méthode draw de Teleporter utilise déjà cameraY
        currentLifeUps.forEach(lifeUp => lifeUp.draw()); 
    }
}

// Fonction pour peupler le sélecteur de niveaux dans l'interface
function populateLevelSelect() {
    const levelSelect = document.getElementById('levelSelect'); 
    levelSelect.innerHTML = ''; 

    levels.forEach((level, index) => {
        const option = document.createElement('option');
        option.value = index; 
        option.textContent = `Niveau ${index + 1}`; 
        // Désactiver les options si l'index est supérieur au niveau le plus élevé débloqué
        option.disabled = (index > highestUnlockedLevel);
        levelSelect.appendChild(option);
    });

    // S'assurer que le niveau sélectionné est accessible
    if (currentLevelIndex > highestUnlockedLevel) {
        currentLevelIndex = highestUnlockedLevel; // Revenir au niveau le plus élevé débloqué
    }
    levelSelect.value = currentLevelIndex;
}

// Fonction de vérification des collisions
function checkCollisions() {
    player.onGround = false; // Réinitialiser à chaque frame
    player.currentGroundType = 'normal'; // Réinitialiser le type de sol à chaque frame

    // Collision avec les objets Ground (le sol et le plafond)
    currentGrounds.forEach(ground => { 
        let dirGround = collisionDirection(player, ground);
        if (gravityInverted) {
            if (dirGround === 'top') { 
                player.onGround = true;
                player.velY = 0;
                player.y = ground.y + ground.height; 
                player.currentGroundType = 'normal'; 
            } else if (dirGround === 'bottom') { 
                player.velY = 0;
                player.y = ground.y - player.height; 
                player.onGround = false; // Ne pas être sur le sol si on frappe le "plafond" inversé
            } else if (dirGround === 'left' || dirGround === 'right') {
                player.velX = 0;
                player.onGround = false; // Ne pas être sur le sol si on frappe les côtés
            }
        } else { // Gravité normale
            if (dirGround === 'bottom') { 
                player.onGround = true;
                player.velY = 0;
                player.y = ground.y - player.height;
                player.currentGroundType = 'normal'; 
            } else if (dirGround === 'top') { 
                player.velY = 0;
                player.y = ground.y + ground.height;
                player.onGround = false; // Ne pas être sur le sol si on frappe le plafond
            } else if (dirGround === 'left' || dirGround === 'right') {
                player.velX = 0;
                player.onGround = false; // Ne pas être sur le sol si on frappe les côtés
            }
        }
    });


    currentPlatforms.forEach(platform => {
        // Si la plateforme est de type 'disappearing' et n'est pas visible, le joueur passe à travers
        if (platform.type === 'disappearing' && !platform.visible) {
            return; 
        }

        let dir = collisionDirection(player, platform);
        if (dir === 'left' || dir === 'right') {
            player.velX = 0;
            player.onGround = false; // Ne pas être sur le sol si on frappe les côtés de la plateforme
        } else if (gravityInverted) {
            if (dir === 'top') { 
                player.onGround = true;
                player.velY = 0;
                player.y = platform.y + platform.height; 
                player.currentGroundType = platform.isSticky ? 'sticky' : 'normal'; 
            } else if (dir === 'bottom') { 
                player.velY = 0;
                player.y = platform.y - player.height; 
                player.onGround = false; // Ne pas être sur le sol si on frappe le dessous de la plateforme (gravité inversée)
            }
        } else { // Gravité normale
            if (dir === 'bottom') { 
                player.onGround = true;
                player.velY = 0;
                player.y = platform.y - player.height;
                if (platform.isBouncy) {
                    player.velY = player.jumpStrengthAdventure * 1.5; // Utilise la jumpStrengthAdventure
                    player.onGround = false; 
                    player.currentGroundType = 'normal'; 
                }
                if (platform.isSticky) {
                    player.velX *= 0.05; // Ralentissement encore plus significatif
                    player.currentGroundType = 'sticky'; 
                }
                if (platform.isTemporary && !platform.touched) {
                    platform.touched = true;
                }
            } else if (dir === 'top') { 
                player.velY = 0;
                player.y = platform.y + platform.height;
                player.onGround = false; // Ne pas être sur le sol si on frappe le dessous de la plateforme (gravité normale)
            }
        }
    });

    currentModularPlatforms.forEach(mp => {
        let dir = collisionDirection(player, mp); 
        if (dir === 'left' || dir === 'right') {
            player.velX = 0;
            player.onGround = false; // Ne pas être sur le sol si on frappe les côtés de la plateforme modulaire
        } else if (gravityInverted) {
            if (dir === 'top') { 
                player.onGround = true;
                player.velY = 0;
                player.y = mp.y + mp.height;
                player.currentGroundType = 'normal'; 
            } else if (dir === 'bottom') { 
                player.velY = 0;
                player.y = mp.y - player.height;
                player.onGround = false; // Ne pas être sur le sol si on frappe le dessous de la plateforme modulaire (gravité inversée)
            }
        } else { // Gravité normale
            if (dir === 'bottom') { 
                player.onGround = true;
                player.velY = 0;
                player.y = mp.y - player.height;
                player.currentGroundType = 'normal'; 
            } else if (dir === 'top') { 
                player.velY = 0;
                player.y = mp.y + mp.height;
                player.onGround = false; // Ne pas être sur le sol si on frappe le dessous de la plateforme modulaire (gravité normale)
            }
        }
    });

    currentWalls.forEach(wall => {
        let dir = collisionDirection(player, wall);
        if (dir === 'left') { // Collide from player's left side with wall's right side
            player.velX = 0;
            player.x = wall.x + wall.width; // Repousser le joueur à droite du mur
            player.onGround = false; // Ne pas être sur le sol si on frappe un mur
        } else if (dir === 'right') { // Collide from player's right side with wall's left side
            player.velX = 0;
            player.x = wall.x - player.width; // Repousser le joueur à gauche du mur
            player.onGround = false; // Ne pas être sur le sol si on frappe un mur
        } else if (gravityInverted) {
            if (dir === 'top') { 
                player.onGround = true;
                player.velY = 0;
                player.y = wall.y + wall.height;
                player.currentGroundType = 'normal'; 
            } else if (dir === 'bottom') { 
                player.velY = 0;
                player.y = wall.y - player.height;
                player.onGround = false; // Ne pas être sur le sol si on frappe le dessous d'un mur (gravité inversée)
            }
        } else { // Gravité normale
            if (dir === 'bottom') { 
                player.onGround = true;
                player.velY = 0;
                player.y = wall.y - player.height;
                player.currentGroundType = 'normal'; 
            } else if (dir === 'top') { 
                player.velY = 0;
                player.y = wall.y + wall.height;
                player.onGround = false; // Ne pas être sur le sol si on frappe le dessous d'un mur (gravité normale)
            }
        }
    });

    currentStars.forEach(star => {
        let starHitbox = {
        x: star.x + collisionShrink, 
        y: star.y + collisionShrink, 
        width: star.size - (2 * collisionShrink), 
        height: star.size - (2 * collisionShrink) 
    };

        if (!star.collected && isColliding(player, starHitbox)) {
            star.collected = true;
            starsCollectedInCurrentLevel++;
            updateAvoineIndicatorHTML()
            if (currentStars.every(s => s.collected)) {
                // Déclenche l'animation de fin de niveau au lieu de passer directement au niveau suivant
                isLastStarCollectedAnimation = true;
                lastStarAnimationTimer = 0;
            }
        }
    });

    currentEnemies.forEach(enemy => {
        // Utilisation de hitboxShrink pour les ennemis
        let enemyHitbox = {
            x: enemy.x + enemy.hitboxShrink,
            y: enemy.y + enemy.hitboxShrink,
            width: enemy.width - (2 * enemy.hitboxShrink),
            height: enemy.height - (2 * enemy.hitboxShrink)
        };

        if (isColliding(player, enemyHitbox)) { 
            const wasInvincibleBefore = isInvincible;
            playerTakeDamage(false); 
            if (!wasInvincibleBefore && isInvincible) { // Si des dégâts viennent d'être pris (devient invincible)
                // Appliquer une poussée directe pour séparer le joueur de l'ennemi
                const pushAmount = 5; // Poussée réduite
                if (player.x < enemy.x) { // Le joueur est à gauche de l'ennemi
                    player.x -= pushAmount;
                } else { // Le joueur est à droite de l'ennemi
                    player.x += pushAmount;
                }
                if (player.y < enemy.y) { // Le joueur est au-dessus de l'ennemi
                    player.y -= pushAmount;
                } else { // Le joueur est en dessous de l'ennemi
                    player.y += pushAmount;
                }
            }
        }
    });

    currentSpikes.forEach(spike => {
        let spikeHitbox = {
            x: spike.x + spikeHitboxPadding,
            y: spike.y + spikeHitboxPadding,
            width: spike.width - (2 * spikeHitboxPadding),
            height: spike.height - (2 * spikeHitboxPadding)
        };

        if (spikeHitbox.width < 0) spikeHitbox.width = 0;
        if (spikeHitbox.height < 0) spikeHitbox.height = 0;

        if (isColliding(player, spikeHitbox)) { 
            const wasInvincibleBefore = isInvincible;
            playerTakeDamage(false); 
            if (!wasInvincibleBefore && isInvincible) { // Si des dégâts viennent d'être pris
                // Appliquer une poussée directe pour séparer le joueur du pic
                const pushAmount = 5; // Poussée réduite
                if (player.x < spike.x) { // Le joueur est à gauche du pic
                    player.x -= pushAmount;
                } else { // Le joueur est à droite du pic
                    player.x += pushAmount;
                }
                if (player.y < spike.y) { // Le joueur est au-dessus du pic
                    player.y -= pushAmount;
                } else { // Le joueur est en dessous du pic
                    player.y += pushAmount;
                }
            }
        }
    });

    currentSprings.forEach(spring => {
        if (isColliding(player, spring)) {
            player.velY = player.jumpStrengthAdventure * 1.5; // Utilise la jumpStrengthAdventure
            player.onGround = false;
            player.currentGroundType = 'normal'; 
        }
    });

    currentTeleporters.forEach(tp => {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const teleporterCenterX = tp.x + tp.width / 2;
        const teleporterCenterY = tp.y + tp.height / 2;

        const centerCollisionTolerance = 20; 

        const centersAreClose =
            Math.abs(playerCenterX - teleporterCenterX) < centerCollisionTolerance &&
            Math.abs(playerCenterY - teleporterCenterY) < centerCollisionTolerance;

        if (centersAreClose) {
            if (!player.justTeleported) {
                const pair = getPairedTeleporter(tp);
                if (pair) {
                    player.x = pair.x + pair.width + 5; 
                    player.y = pair.y;

                    // Mettre à jour offsetX immédiatement après la téléportation
                    if (enableHorizontalScrolling) {
                        offsetX = player.x - (canvas.width / 2);
                        if (offsetX < 0) {
                            offsetX = 0;
                        }
                        if (offsetX + canvas.width > levelWidth) {
                            offsetX = levelWidth - canvas.width;
                        }
                    } else {
                        offsetX = 0;
                    }
                    // --- NOUVELLE LOGIQUE POUR LE TÉLÉPORTEUR ET CAMERA Y ---
                    if (verticalScrollingEnabled) {
                        cameraY = player.y - (canvas.height / 2);
                        if (cameraY < 0) {
                            cameraY = 0;
                        }
                        if (cameraY + canvas.height > levelHeight) {
                            cameraY = levelHeight - canvas.height;
                        }
                    } else {
                        cameraY = 0;
                    }
                    // --- FIN NOUVELLE LOGIQUE ---


                    player.justTeleported = true;

                    setTimeout(() => {
                        player.justTeleported = false;
                    }, 2000); 
                }
            }
        }
    });

    // Collision avec les collectables de vie
    currentLifeUps.forEach(lifeUp => {
        if (!lifeUp.collected && isColliding(player, lifeUp)) {
            lifeUp.collected = true;
            playerLives++; // Incrémente la vie sans limite
            updateLivesIndicatorHTML(); // Met à jour l'affichage des vies
        }
    });
}

// Fonction pour déterminer la direction de la collision
function collisionDirection(obj1, obj2) {
    let vectorX = (obj1.x + obj1.width / 2) - (obj2.x + obj2.width / 2);
    let vectorY = (obj1.y + obj1.height / 2) - (obj2.y + obj2.height / 2);

    let halfWidths = (obj1.width / 2) + (obj2.width / 2);
    let halfHeights = (obj1.height / 2) + (obj2.height / 2);

    let collisionDirection = null;

    if (Math.abs(vectorX) < halfWidths && Math.abs(vectorY) < halfHeights) {
        let overlapX = halfWidths - Math.abs(vectorX); 
        let overlapY = halfHeights - Math.abs(vectorY); 

        if (overlapX < overlapY) {
            if (vectorX > 0) {
                collisionDirection = 'left';
            } else {
                collisionDirection = 'right';
            }
        } else {
            if (vectorY > 0) {
                collisionDirection = 'top';
            } else {
                collisionDirection = 'bottom';
            }
        }
    }
    return collisionDirection;
}

// Fonction de vérification de collision simple (AABB)
function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// Fonction de dessin principale
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentMode === 'adventure') {
        drawAdventureMode();
    } else if (currentMode === 'jump') {
        drawJumpMode(); // Appel de la fonction de dessin du mode Jump
    }
}

// Boucle de jeu
function gameLoop() {
    // Annuler la frame d'animation précédente avant d'en demander une nouvelle
    if (gameFrameId) {
        cancelAnimationFrame(gameFrameId);
    }
    gameFrameId = requestAnimationFrame(gameLoop);

    if (!isGamePaused) {
        if (currentMode === 'adventure') {
            updateAdventureMode();
        } else if (currentMode === 'jump') {
            updateJumpMode(); // Appel de la fonction de mise à jour du mode Jump
        }
    }
    draw();
}

// Met à jour l'affichage de l'indicateur d'avoine (étoiles)
function updateAvoineIndicatorHTML() {
    if (currentMode === 'adventure') {
        avoineIndicatorDiv.style.display = 'flex'; // Afficher en mode aventure
        levelIndicatorDiv.style.display = 'flex'; // Afficher l'indicateur de niveau
        jumpScoreIndicator.style.display = 'none'; // Cacher en mode aventure
        livesIndicatorDiv.style.display = 'flex'; // NOUVEAU: Afficher explicitement les vies en mode aventure
        collectedAvoineSpan.textContent = starsCollectedInCurrentLevel;
        totalAvoineSpan.textContent = totalStarsInCurrentLevel;
    } else if (currentMode === 'jump') { // Explicitly for jump mode
        avoineIndicatorDiv.style.display = 'none'; // Cacher en mode jump
        levelIndicatorDiv.style.display = 'none'; // Cacher l'indicateur de niveau
        jumpScoreIndicator.style.display = 'flex'; // Afficher en mode jump
        livesIndicatorDiv.style.display = 'flex'; // NOUVEAU: Afficher explicitement les vies en mode jump
    }
}

// Fonction pour mettre à jour l'affichage des vies
function updateLivesIndicatorHTML() {
    // MODIFICATION: Cette fonction ne gère plus la visibilité, seulement le texte
    playerLivesSpan.textContent = playerLives;
}

// Fonction pour charger la progression du mode Aventure
function loadAdventureProgress() {
    const savedProgress = localStorage.getItem('highestUnlockedLevel');
    if (savedProgress !== null) {
        highestUnlockedLevel = parseInt(savedProgress, 10);
    } else {
        highestUnlockedLevel = 0; // Débloque le niveau 1 par défaut (index 0)
    }
    populateLevelSelect(); // Mettre à jour le sélecteur après le chargement
}

// Fonction pour sauvegarder la progression du mode Aventure
function saveAdventureProgress() {
    localStorage.setItem('highestUnlockedLevel', highestUnlockedLevel.toString());
}


// Fonction pour démarrer un mode de jeu
function startGame(mode) {
    currentMode = mode;
    welcomeScreen.style.display = 'none'; // Cache l'écran d'accueil
    helpModal.style.display = 'none'; // Cache le modal d'aide si ouvert
    resetConfirmModal.style.display = 'none'; // Cache le modal de confirmation si ouvert
    if (endGameModal) { // Vérifie si endGameModal est défini avant d'accéder à .style
        endGameModal.style.display = 'none'; // S'assurer que la modale de fin de jeu est cachée
    }
    isGamePaused = false;
    playerLives = initialLives; // Réinitialise les vies pour chaque nouvelle partie

    // NOUVEAU: Assurer que l'indicateur de vies est visible au début du jeu
    livesIndicatorDiv.style.display = 'flex'; 

    if (currentMode === 'adventure') {
        player = new Player(); // Crée une instance de Player pour le mode Aventure
        currentLevelIndex = parseInt(levelSelect.value, 10);
        loadLevel(currentLevelIndex);
    } else if (currentMode === 'jump') {
        // Assurez-vous que JumpPlayer est défini avant d'être instancié
        player = new JumpPlayer(); // Crée une instance de JumpPlayer pour le mode Jump
        initJumpMode(); // Initialise le mode Jump (qui gère l'affichage de jumpScoreIndicator et livesIndicatorDiv)
    }
    updateAvoineIndicatorHTML(); // Appelle cette fonction pour gérer la visibilité des indicateurs
    updateLivesIndicatorHTML(); // Met à jour l'affichage des vies
    backToHomeInGameBtn.style.display = 'block'; // Affiche le bouton "Retour à l'Accueil"
    gameLoop(); // Décommenté : Lance la boucle de jeu lorsque le jeu démarre
}


// Initialisation du jeu après le chargement des images
loadImages(() => {
    // Récupérer les éléments de la modale de fin de jeu ici, après que le DOM soit prêt
    endGameModal = document.getElementById('endGameModal');
    restartButtonEndGame = document.getElementById('restartButton');

    initLevels(canvas); 
    loadAdventureProgress(); // Charge la progression de l'aventure AVANT de peupler le sélecteur
    populateLevelSelect(); 
    loadJumpHighScore(); // Charge le meilleur score Jump au démarrage (fonction de jump.js)
    updateJumpHighScoreDisplay(); // Met à jour l'affichage sur la page d'accueil
    welcomeScreen.style.display = 'flex'; 

    // Écouteurs d'événements pour les nouveaux boutons
    playAdventureModeBtn.addEventListener('click', () => {
        startGame('adventure');
    });

    playJumpModeBtn.addEventListener('click', () => {
        startGame('jump');
    });

    helpBtn.addEventListener('click', () => {
        isGamePaused = true; // Met le jeu en pause quand l'aide est ouverte
        helpModal.style.display = 'flex'; // Affiche le modal d'aide
        welcomeScreen.style.display = 'none'; // Cache l'écran d'accueil
        resetConfirmModal.style.display = 'none'; // S'assurer que le modal de confirmation est caché
        if (endGameModal) { // Vérifie si endGameModal est défini avant d'accéder à .style
            endGameModal.style.display = 'none'; // S'assurer que la modale de fin de jeu est cachée
        }
        backToHomeInGameBtn.style.display = 'none'; // Cache le bouton "Retour à l'Accueil" en jeu
    });

    backFromHelpBtn.addEventListener('click', () => {
        helpModal.style.display = 'none'; // Cache le modal d'aide
        welcomeScreen.style.display = 'flex'; // Affiche l'écran d'accueil
        isGamePaused = false; // Reprend le jeu si on était en jeu, sinon n'a pas d'effet
        backToHomeInGameBtn.style.display = 'none'; // Cache le bouton "Retour à l'Accueil" en jeu
    });

    // NOUVEAU: Écouteur d'événement pour le bouton "Supprimer la progression"
    const resetProgressBtn = document.getElementById('resetProgressBtn');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', () => {
            helpModal.style.display = 'none'; // Cacher le modal d'aide
            resetConfirmModal.style.display = 'flex'; // Afficher le modal de confirmation
        });
    }

    // NOUVEAU: Écouteurs d'événements pour les boutons de confirmation de réinitialisation
    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', () => {
            localStorage.removeItem('jumpHighScore');
            jumpHighScore = 0; // Réinitialiser en mémoire
            updateJumpHighScoreDisplay(); // Mettre à jour l'affichage sur l'écran d'accueil
            updateJumpScoreDisplayInGame(); // Mettre à jour l'affichage en jeu si en mode Jump
            
            // NOUVEAU: Réinitialiser la progression du mode Aventure
            localStorage.removeItem('highestUnlockedLevel');
            highestUnlockedLevel = 0; // Réinitialiser en mémoire
            populateLevelSelect(); // Mettre à jour le sélecteur de niveaux

            resetConfirmModal.style.display = 'none'; // Cacher le modal de confirmation
            welcomeScreen.style.display = 'flex'; // Retourner à l'écran d'accueil
            console.log("Progression supprimée ! Votre meilleur score Jump et votre progression Aventure ont été remis à zéro.");
        });
    }

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => {
            resetConfirmModal.style.display = 'none'; // Cacher le modal de confirmation
            welcomeScreen.style.display = 'flex'; // Retourner à l'écran d'accueil
        });
    }

    // Gestion des boutons de la fenêtre Game Over
    restartGameBtn.addEventListener('click', () => {
        console.log("Bouton Rejouer cliqué.");
        gameOverScreen.style.display = 'none'; // Cache l'écran Game Over
        playerLives = initialLives; // Réinitialise les vies
        isGamePaused = false; // S'assure que le jeu n'est plus en pause
        // Redémarrer le mode actuel
        if (currentMode === 'adventure') {
            currentLevelIndex = 0; // Retour au premier niveau pour l'aventure
            loadLevel(currentLevelIndex); // Recharge le premier niveau
        } else if (currentMode === 'jump') {
            initJumpMode(); // Réinitialise le mode Jump
        }
        updateAvoineIndicatorHTML(); // Met à jour la visibilité des indicateurs
        updateLivesIndicatorHTML(); // Met à jour l'affichage des vies
        backToHomeInGameBtn.style.display = 'block'; // Affiche le bouton "Retour à l'Accueil" en jeu
        console.log("État du jeu réinitialisé. isGamePaused:", isGamePaused);
    });

    backToHomeBtn.addEventListener('click', () => {
        gameOverScreen.style.display = 'none'; // Cache l'écran Game Over
        welcomeScreen.style.display = 'flex'; // Affiche l'écran d'accueil
        playerLives = initialLives; // Réinitialise les vies
        currentLevelIndex = 0; // Réinitialise le niveau sélectionné
        populateLevelSelect(); // Met à jour le sélecteur de niveau (important pour les niveaux débloqués)
        // Arrête la boucle de jeu si elle est en cours
        if (gameFrameId) {
            cancelAnimationFrame(gameFrameId);
            gameFrameId = null;
        }
        isGamePaused = true; // S'assure que le jeu est en pause sur l'écran d'accueil
        updateAvoineIndicatorHTML(); // Met à jour la visibilité des indicateurs
        // NOUVEAU: Cacher l'indicateur de vies en revenant à l'accueil
        livesIndicatorDiv.style.display = 'none'; 
        jumpScoreIndicator.style.display = 'none'; // Cacher l'indicateur de score du mode Jump
        loadJumpHighScore(); // Recharge le meilleur score pour l'affichage sur la page d'accueil
        updateJumpHighScoreDisplay(); // Assure que le meilleur score est affiché sur l'accueil
        backToHomeInGameBtn.style.display = 'none'; // Cache le bouton "Retour à l'Accueil" en jeu
    });

    // NOUVEAU: Écouteur d'événement pour le bouton "Retour à l'Accueil" en jeu
    if (backToHomeInGameBtn) {
        backToHomeInGameBtn.addEventListener('click', () => {
            console.log("Bouton Retour à l'Accueil en jeu cliqué.");
            // Arrête la boucle de jeu
            if (gameFrameId) {
                cancelAnimationFrame(gameFrameId);
                gameFrameId = null;
            }
            isGamePaused = true; // Met le jeu en pause
            welcomeScreen.style.display = 'flex'; // Affiche l'écran d'accueil
            canvas.style.display = 'block'; // S'assurer que le canvas est visible pour l'écran d'accueil
            gameOverScreen.style.display = 'none'; // Cache l'écran Game Over
            helpModal.style.display = 'none'; // Cache le modal d'aide
            resetConfirmModal.style.display = 'none'; // Cache le modal de confirmation
            if (endGameModal) { // Vérifie si endGameModal est défini avant d'accéder à .style
                endGameModal.style.display = 'none'; // Cache la modale de fin de jeu
            }

            // Réinitialise l'état du jeu pour un nouveau départ
            playerLives = initialLives;
            currentLevelIndex = 0;
            populateLevelSelect(); // Met à jour le sélecteur de niveau (important pour les niveaux débloqués)
            updateAvoineIndicatorHTML(); // Met à jour la visibilité des indicateurs
            // NOUVEAU: Cacher l'indicateur de vies en revenant à l'accueil
            livesIndicatorDiv.style.display = 'none'; 
            jumpScoreIndicator.style.display = 'none'; // Cacher l'indicateur de score du mode Jump
            loadJumpHighScore(); // Recharge le meilleur score pour l'affichage sur la page d'accueil
            updateJumpHighScoreDisplay(); // Assure que le meilleur score est affiché sur l'accueil
            backToHomeInGameBtn.style.display = 'none'; // Cache le bouton "Retour à l'Accueil" en jeu
        });
    }

    // NOUVEAU: Attacher l'écouteur d'événement au bouton de la modale de fin de jeu
    if (restartButtonEndGame) { // Vérifie si restartButtonEndGame est défini
        restartButtonEndGame.addEventListener('click', () => {
            // Réinitialise l'état du jeu pour un nouveau départ
            playerLives = initialLives;
            currentLevelIndex = 0;
            populateLevelSelect(); // Met à jour le sélecteur de niveau (important pour les niveaux débloqués)
            updateAvoineIndicatorHTML(); // Met à jour la visibilité des indicateurs
            livesIndicatorDiv.style.display = 'none'; 
            jumpScoreIndicator.style.display = 'none'; 
            loadJumpHighScore(); 
            updateJumpHighScoreDisplay(); 
            backToHomeInGameBtn.style.display = 'none'; 

            if (endGameModal) { // Vérifie si endGameModal est défini
                endGameModal.style.display = 'none'; // Cache la modale de fin de jeu
            }
            welcomeScreen.style.display = 'flex'; // Affiche l'écran d'accueil
            // Arrête la boucle de jeu si elle est en cours
            if (gameFrameId) {
                cancelAnimationFrame(gameFrameId);
                gameFrameId = null;
            }
            isGamePaused = true; // S'assure que le jeu est en pause sur l'écran d'accueil
        });
    }

    // Appel initial pour démarrer la boucle de jeu
    // gameLoop(); // Commenté : La boucle de jeu est maintenant lancée par startGame()
});
