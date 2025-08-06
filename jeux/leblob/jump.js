// Fichier jump.js - Logique du mode "Jump"

// Variables sp√©cifiques au mode Jump
let jumpScore = 0;
let heightScore = 0; // Score bas√© sur la hauteur parcourue
let bonusScore = 0;  // Score cumul√© des flocons d'avoine et autres bonus
let jumpPlatforms = []; // For bouncy platforms
let jumpModularPlatforms = []; // Array for modular platforms
let jumpEnemies = [];
let jumpSpikes = [];
let jumpGrounds = []; // Array for Ground objects specific to Jump mode (starting platform)
let jumpStars = []; // Array for oat collectibles
let verticalOffset = 0; // For vertical scrolling

// Constants for platform generation
const PLATFORM_WIDTH_MIN = 80;
const PLATFORM_WIDTH_MAX = 150; // Will be adjusted by GENERATION_PARAMS
const PLATFORM_GAP_Y_MIN = 80; // Will be adjusted by GENERATION_PARAMS
const PLATFORM_GAP_Y_MAX = 150; // Will be adjusted by GENERATION_PARAMS
const PLATFORM_COUNT_INITIAL = 20; // Increased for many more platforms at the start

const PLATFORM_TYPE_CHANCE = {
    modular: 0.7, // More chances to be modular
    bouncy: 0.3, // Less chances to be bouncy
};

// Constant for base jump force in Jump mode
const JUMP_MODE_BASE_JUMP_VELOCITY = -15; // The desired base jump height for Jump mode

// Score thresholds for enemy and spike appearance
const ENEMY_SPAWN_SCORE_THRESHOLD = 1500; // Enemies start appearing from this score
const SPIKE_SPAWN_SCORE_THRESHOLD = 1000; // Spikes start appearing from this score

// Generation parameters based on score (progressive difficulty)
const GENERATION_PARAMS = {
    level0: { // Very easy start
        platformGapYMin: 70,
        platformGapYMax: 120,
        platformWidthMax: 180, // Wider platforms
        enemyChance: 0,
        spikeChance: 0,
        avoineChance: 0.3, // Reduced oat chance
        enemyCount: 0,
        spikeCount: 0,
    },
    level1: { // Still easy, but slightly more difficult gaps
        platformGapYMin: 80,
        platformGapYMax: 150,
        platformWidthMax: 150,
        enemyChance: 0,
        spikeChance: 0,
        avoineChance: 0.15, // Reduced oat chance
        enemyCount: 0,
        spikeCount: 0,
    },
    level2: { // Medium difficulty, slow introduction of enemies/spikes
        platformGapYMin: 100,
        platformGapYMax: 180,
        platformWidthMax: 130,
        enemyChance: 0.20, // Significantly increased
        spikeChance: 0.15, // Significantly increased
        avoineChance: 0.1, // Reduced oat chance
        enemyCount: 1,
        spikeCount: 1,
    },
    level3: { // Medium difficulty, adjusted
        platformGapYMin: 120,
        platformGapYMax: 200,
        platformWidthMax: 110,
        enemyChance: 0.25, // Significantly increased
        spikeChance: 0.20, // Significantly increased
        avoineChance: 0.08, // Reduced oat chance
        enemyCount: 1,
        spikeCount: 1,
    },
    level4: { // More difficult, more frequent enemies/spikes, smaller platforms
        platformGapYMin: 140,
        platformGapYMax: 200, // Adjusted from 220 to 200 for better playability
        platformWidthMax: 90,
        enemyChance: 0.30, // Significantly increased
        spikeChance: 0.25, // Significantly increased
        avoineChance: 0.05, // Reduced oat chance
        enemyCount: 1,
        spikeCount: 1,
    },
    level5: { // Very difficult, max gaps, smallest platforms, high chance of enemies/spikes
        platformGapYMin: 160,
        platformGapYMax: 200, // Adjusted from 220 to 200 for better playability
        platformWidthMax: 80, // Minimum width
        enemyChance: 0.35, // Significantly increased
        spikeChance: 0.30, // Significantly increased
        avoineChance: 0.03, // Reduced oat chance
        enemyCount: 1,
        spikeCount: 1,
    }
};

// Score thresholds to transition between difficulty levels
const SCORE_THRESHOLDS = [
    { score: 0, params: "level0" },
    { score: 500, params: "level1" }, // Slower progression
    { score: 1500, params: "level2" }, // Slower progression
    { score: 3000, params: "level3" },
    { score: 6000, params: "level4" }, // Slower progression
    { score: 10000, params: "level5" } // Slower progression
];

// Class for oat flakes in Jump mode
class JumpStar {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.collected = false;
        const imagesAvoine = [images.avoine1, images.avoine2];
        this.chosenImage = imagesAvoine[Math.floor(Math.random() * imagesAvoine.length)];
    }

    draw() {
        if (!this.collected) {
            ctx.drawImage(this.chosenImage, this.x, this.y, this.size, this.size);
        }
    }
}

// Global variables for platform generation to ensure playability
let lastGeneratedPlatformX = 0;
let lastGeneratedPlatformWidth = 0;

// High Score related variables
let jumpHighScore = 0; // Initialized to 0, will be loaded from localStorage

/**
 * Loads the Jump Mode high score from local storage.
 */
function loadJumpHighScore() {
    const storedHighScore = localStorage.getItem('jumpHighScore');
    if (storedHighScore !== null) {
        jumpHighScore = parseInt(storedHighScore, 10);
    }
    // Update the display on the welcome screen (function defined in game.js)
    if (typeof updateJumpHighScoreDisplay === 'function') {
        updateJumpHighScoreDisplay();
    }
}

/**
 * Saves the current Jump Mode high score to local storage if it's a new high.
 */
function saveJumpHighScore() {
    localStorage.setItem('jumpHighScore', jumpHighScore.toString());
}

// Player class for Jump Mode (simplified, focuses on vertical movement)
class JumpPlayer extends Player { // Extends the existing Player class from game.js
    constructor() {
        super();
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.speed = 4; // Slightly slower horizontal speed for jump mode
        this.gravity = 0.5;
        this.jumpStrength = JUMP_MODE_BASE_JUMP_VELOCITY; // Base jump strength for auto-jumps
        this.onGround = false;
        this.facingRight = true;
        this.isOutOfBounds = false;
        this.outOfBoundsTimer = 0;
        this.currentGroundType = 'normal'; // To track sticky platforms
    }

    update() {
        // Horizontal movement
        this.velX *= this.friction;
        if (keys.left) {
            this.velX = -this.speed;
            this.facingRight = false;
        }
        if (keys.right) {
            this.velX = this.speed;
            this.facingRight = true;
        }
        this.x += this.velX;

        // Apply gravity
        this.velY += this.gravity;
        this.y += this.velY;

        // Wrap around horizontal edges
        if (this.x + this.width < 0) {
            this.x = canvas.width;
        } else if (this.x > canvas.width) {
            this.x = -this.width;
        }

        // Vertical scrolling: If player goes above a certain threshold, scroll the world down
        const scrollThreshold = canvas.height * 0.3; // The player should be in the top 30% of the screen
        if (this.y < scrollThreshold) {
            const scrollAmount = scrollThreshold - this.y;
            verticalOffset += scrollAmount; // Move the world down (for scoring)
            this.y = scrollThreshold; // Keep the player at the threshold position
            
            // Update the positions of all platforms, enemies, spikes, avoine, etc.
            jumpPlatforms.forEach(p => p.y += scrollAmount);
            jumpModularPlatforms.forEach(mp => mp.y += scrollAmount);
            jumpEnemies.forEach(e => e.y += scrollAmount);
            jumpSpikes.forEach(s => s.y += scrollAmount);
            jumpGrounds.forEach(g => g.y += scrollAmount);
            jumpStars.forEach(s => s.y += scrollAmount); // Update the position of the oat flakes
        }

        // Update height score directly from verticalOffset
        heightScore = Math.floor(verticalOffset / 5); // Points per 5 pixels of height
        jumpScore = heightScore + bonusScore; // Total score
        updateJumpScoreDisplayInGame(); // Update in-game display

        // Check for falling off the bottom
        if (this.y > canvas.height + this.height) { // If player falls completely off screen
            playerTakeDamage(true); // Player fell, game over for jump mode (handled by game.js)
        }
    }

    draw() {
        // Use the existing Player's draw method, which handles facing direction and invincibility
        // The offsetX is 0 for jump mode, so it won't affect horizontal drawing.
        super.draw();
    }
}


/**
 * Initializes the Jump Mode.
 */
function initJumpMode() {
    // Reset player's position and velocity for Jump Mode
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
    player.velX = 0;
    player.velY = 0;
    player.onGround = false; // Ensure player is not considered on ground initially
    player.isOutOfBounds = false;
    player.outOfBoundsTimer = 0;
    player.currentGroundType = 'normal';
    // Reset player's invincibility state
    isInvincible = false;
    invincibilityTimer = 0;


    jumpScore = 0;
    heightScore = 0;
    bonusScore = 0;
    verticalOffset = 0; // Reset scrolling
    playerLives = initialLives; // Reset lives
    isInvincible = false;
    invincibilityTimer = 0;

    jumpPlatforms = [];
    jumpModularPlatforms = []; // Reset modular platforms
    jumpEnemies = [];
    jumpSpikes = [];
    jumpGrounds = []; // Reset Jump mode grounds
    jumpStars = []; // Reset oat collectibles

    // Create the starting platform as a Ground object
    const initialGround = new Ground(canvas.width / 2 - 75, canvas.height - 20, 150, 20);
    jumpGrounds.push(initialGround);
    lastGeneratedPlatformX = initialGround.x;
    lastGeneratedPlatformWidth = initialGround.width;

    // Generate a few initial platforms above the player
    let lastPlatformY = canvas.height - 20;
    for (let i = 0; i < PLATFORM_COUNT_INITIAL; i++) {
        lastPlatformY = generateNewPlatform(lastPlatformY);
    }
    
    // Hide Adventure mode specific indicators
    levelIndicatorDiv.style.display = 'none';
    avoineIndicatorDiv.style.display = 'none';
    livesIndicatorDiv.style.display = 'flex'; // Show lives
    jumpScoreIndicator.style.display = 'flex'; // Show Jump mode score
    updateJumpScoreDisplayInGame(); // Update initial score
}

/**
 * Generates a new platform above the last one.
 * @param {number} lastPlatformY The Y coordinate of the previous platform.
 * @returns {number} The Y coordinate of the new platform.
 */
function generateNewPlatform(lastPlatformY) {
    let currentParams;
    // Find generation parameters based on current score
    for (let i = SCORE_THRESHOLDS.length - 1; i >= 0; i--) {
        if (jumpScore >= SCORE_THRESHOLDS[i].score) {
            currentParams = GENERATION_PARAMS[SCORE_THRESHOLDS[i].params];
            break;
        }
    }

    const platformWidth = Math.random() * (currentParams.platformWidthMax - PLATFORM_WIDTH_MIN) + PLATFORM_WIDTH_MIN;
    const platformY = lastPlatformY - (Math.random() * (currentParams.platformGapYMax - currentParams.platformGapYMin) + currentParams.platformGapYMin);

    // --- PlatformX generation logic to ensure playability ---
    // Max horizontal distance a player can cover in one jump
    // player.speed is the player's horizontal speed
    // (2 * Math.abs(JUMP_MODE_BASE_JUMP_VELOCITY) / player.gravity) is the number of jump frames (air time)
    const maxHorizontalReachPerJump = player.speed * (2 * Math.abs(JUMP_MODE_BASE_JUMP_VELOCITY) / player.gravity);

    // Horizontal safety margin to ensure the platform is reachable
    const horizontalSafetyMargin = 30; 

    // Calculate the reachable horizontal range from the edges of the last generated platform
    let minPossibleX = lastGeneratedPlatformX - maxHorizontalReachPerJump + horizontalSafetyMargin;
    let maxPossibleX = lastGeneratedPlatformX + lastGeneratedPlatformWidth + maxHorizontalReachPerJump - platformWidth - horizontalSafetyMargin;

    // Clamp to canvas limits
    minPossibleX = Math.max(0, minPossibleX);
    maxPossibleX = Math.min(canvas.width - platformWidth, maxPossibleX);

    // If the range is invalid (min > max), adjust to ensure a platform appears
    // This can happen if the last platform was very narrow or at the extreme edges
    if (minPossibleX > maxPossibleX) {
        // Try to center the new platform relative to the last, with a wider margin
        minPossibleX = Math.max(0, lastGeneratedPlatformX - canvas.width / 4); 
        maxPossibleX = Math.min(canvas.width - platformWidth, lastGeneratedPlatformX + lastGeneratedPlatformWidth + canvas.width / 4);
        
        // If still invalid, then use the entire canvas width (last resort)
        if (minPossibleX > maxPossibleX) {
            minPossibleX = 0;
            maxPossibleX = canvas.width - platformWidth;
        }
    }
    
    const platformX = Math.random() * (maxPossibleX - minPossibleX) + minPossibleX;
    // --- END NEW ---

    let platformType = 'modular';
    const rand = Math.random();
    if (rand < PLATFORM_TYPE_CHANCE.bouncy) {
        platformType = 'bouncy';
    } else { // If not "bouncy", it will be "modular"
        platformType = 'modular';
    }

    let newPlatform;
    if (platformType === 'modular') {
        // All modular platforms in Jump mode should disappear after being touched
        newPlatform = new ModularPlatform(platformX, platformY, platformWidth, true); // true for disappearAfterTouch
        jumpModularPlatforms.push(newPlatform);
    } else if (platformType === 'bouncy') {
        // All bouncy platforms in Jump mode should disappear after being touched
        newPlatform = new Platform(platformX, platformY, platformWidth, 'bouncy', true); // true for disappearAfterTouch
        jumpPlatforms.push(newPlatform);
    }

    // Update the coordinates of the last generated platform
    lastGeneratedPlatformX = platformX;
    lastGeneratedPlatformWidth = platformWidth;

    // Add enemies or spikes occasionally based on score and chances
    if (jumpScore >= ENEMY_SPAWN_SCORE_THRESHOLD && Math.random() < currentParams.enemyChance) {
        for (let i = 0; i < currentParams.enemyCount; i++) {
            jumpEnemies.push(new Enemy(platformX + platformWidth / 2 - 40, platformY - 50, 'volatile'));
        }
    }
    if (jumpScore >= SPIKE_SPAWN_SCORE_THRESHOLD && Math.random() < currentParams.spikeChance) {
        for (let i = 0; i < currentParams.spikeCount; i++) {
            jumpSpikes.push(new Spike(platformX + platformWidth / 2 - 25, platformY - 50, 'air'));
        }
    }

    // Add oat flakes
    if (Math.random() < currentParams.avoineChance) {
        // Position the oat flake higher above the platform for better visibility and collection
        jumpStars.push(new JumpStar(platformX + platformWidth / 2 - 15, platformY - 80)); 
    }

    return platformY;
}

/**
 * Updates the Jump Mode game state.
 */
function updateJumpMode() {
    if (isGamePaused) return;

    // Call handlePlayerInvincibility from game.js to manage the invincibility timer
    handlePlayerInvincibility(); 

    // Update player
    player.update();

    // Apply normal gravity for Jump mode (ground is at the bottom, but platforms are generated upwards)
    player.gravity = 0.5;

    // Update and filter platforms
    jumpPlatforms.forEach(p => p.update());
    jumpPlatforms = jumpPlatforms.filter(p => p.visible && p.y < canvas.height + 50); // Remove off-screen platforms

    // Update and filter modular platforms
    jumpModularPlatforms.forEach(mp => mp.update());
    jumpModularPlatforms = jumpModularPlatforms.filter(mp => mp.visible && mp.y < canvas.height + 50); // Remove off-screen modular platforms

    // Update and filter enemies
    jumpEnemies.forEach(e => e.update());
    jumpEnemies = jumpEnemies.filter(e => e.y < canvas.height + 50); // Remove off-screen enemies

    // Update and filter spikes
    jumpSpikes = jumpSpikes.filter(s => s.y < canvas.height + 50); // Remove off-screen spikes

    // Update and filter springs (not used in this version, but good to keep if added later)
    // jumpSprings = jumpSprings.filter(s => s.y < canvas.height + 50);

    // Update and filter oat flakes
    jumpStars = jumpStars.filter(s => !s.collected && s.y < canvas.height + 50); // Remove collected or off-screen oat flakes

    // Generate new platforms if needed
    // Find the highest platform among all platform types
    let highestPlatformY = canvas.height; // Start at the bottom of the canvas
    if (jumpPlatforms.length > 0) {
        highestPlatformY = Math.min(highestPlatformY, jumpPlatforms.reduce((min, p) => Math.min(min, p.y), Infinity));
    }
    if (jumpModularPlatforms.length > 0) {
        highestPlatformY = Math.min(highestPlatformY, jumpModularPlatforms.reduce((min, p) => Math.min(min, p.y), Infinity));
    }
    if (jumpGrounds.length > 0) { // Include the starting platform if it's still relevant
        highestPlatformY = Math.min(highestPlatformY, jumpGrounds.reduce((min, p) => Math.min(min, p.y), Infinity));
    }

    // Generate a new platform if the highest one is too close to the top edge
    // Or if the number of platforms is too low
    if (highestPlatformY > player.y - canvas.height * 1.5 || (jumpPlatforms.length + jumpModularPlatforms.length) < PLATFORM_COUNT_INITIAL * 2) { 
        generateNewPlatform(highestPlatformY);
    }
    
    // Check for Jump Mode specific collisions
    checkJumpCollisions();

    // Update score is now handled in player.update()
    // Conditions for Game Over in Jump Mode are now handled in player.update() and playerTakeDamage()
}

/**
 * Draws all elements for Jump Mode.
 */
function drawJumpMode() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		    const bgSkyImage = images.fondecranciel;
    const bgWidth = 1440; // Largeur de l'image de fond
    const skyBgHeight = bgSkyImage ? bgSkyImage.height : canvas.height; // Hauteur de fondecranciel.png

    if (bgSkyImage && bgSkyImage.complete) {
        // Le ciel commence ‡ la position actuelle de la camÈra (verticalOffset) et se rÈpËte vers le haut et le bas
        // pour couvrir tout le canvas visible.
        let currentSkyY = (verticalOffset % skyBgHeight) - skyBgHeight; // DÈmarrer un peu en dessous pour couvrir le bas

        // RÈpÈter l'image du ciel tant qu'elle est potentiellement visible sur le canvas
        while (currentSkyY < canvas.height) {
            const numRepeatsX = Math.ceil(canvas.width / bgWidth); // RÈpÈter sur la largeur du canvas
            for (let i = 0; i < numRepeatsX; i++) {
                ctx.drawImage(bgSkyImage, i * bgWidth, currentSkyY, bgWidth, skyBgHeight);
            }
            currentSkyY += skyBgHeight; // Descendre pour la prochaine tuile de ciel
        }
    }

    // Draw Jump mode grounds (including the starting platform)
    jumpGrounds.forEach(g => g.draw());

    // Draw platforms (bouncy)
    jumpPlatforms.forEach(p => p.draw());

    // Draw modular platforms
    jumpModularPlatforms.forEach(mp => mp.draw());

    // Draw enemies
    jumpEnemies.forEach(e => e.draw());

    // Draw spikes
    jumpSpikes.forEach(s => s.draw());

    // Draw oat flakes
    jumpStars.forEach(s => s.draw());

    // Draw player
    player.draw();

    // The score is displayed via the HTML element, not directly on the canvas
}

/**
 * Checks collisions specifically for Jump Mode.
 */
function checkJumpCollisions() {
    player.onGround = false;
    player.currentGroundType = 'normal';

    // Collision with Jump mode grounds (the starting ground)
    jumpGrounds.forEach(ground => {
        let dir = collisionDirection(player, ground);
        if (dir === 'bottom') { // Player lands on the ground
            if (player.velY >= 0) { // Condition to ensure player is falling onto the platform
                player.velY = 0; // Stop falling
                player.y = ground.y - player.height; // Snap player to the top of the platform
                player.onGround = true; // Temporarily on the ground
                player.velY = JUMP_MODE_BASE_JUMP_VELOCITY; // Trigger automatic jump with Jump mode specific value
                player.onGround = false; // Player is now in the air after jumping
                player.currentGroundType = 'normal'; // Reset ground type
            }
        }
    });

    // Collision with platforms (bouncy)
    jumpPlatforms.forEach(platform => {
        // Ignore invisible platforms (disappeared temporary ones)
        if (!platform.visible) return;

        let dir = collisionDirection(player, platform);
        if (dir === 'bottom') { // Player lands on the platform
            // Ensure player is actually falling or just touched
            if (player.velY >= 0) { // Condition to ensure player is falling onto the platform
                player.velY = 0; // Stop falling
                player.y = platform.y - player.height; // Snap player to the top of the platform
                platform.touched = true; // Mark platform as touched for disappearance
                player.onGround = true; // Temporarily on the ground for jump logic

                let actualJumpStrength = JUMP_MODE_BASE_JUMP_VELOCITY; // Base jump strength for Jump mode
                if (platform.isBouncy) {
                    actualJumpStrength *= 1.8; // Bouncy platforms give an even higher jump
                }
                player.velY = actualJumpStrength; // Apply jump strength
                player.onGround = false; // Player is now in the air after jumping
                player.currentGroundType = 'normal'; // Reset ground type
            }
        }
    });

    // Collision with modular platforms
    jumpModularPlatforms.forEach(platform => {
        if (!platform.visible) return; // Ignore if invisible

        let dir = collisionDirection(player, platform);
        if (dir === 'bottom') { // Player lands on the modular platform
            if (player.velY >= 0) {
                player.velY = 0;
                player.y = platform.y - player.height - 1; // 1px adjustment to avoid passing through
                platform.touched = true; // Mark platform as touched for disappearance
                player.onGround = true; // Temporarily on the ground
                
                // Apply the same jump strength as the base Jump mode
                player.velY = JUMP_MODE_BASE_JUMP_VELOCITY; 
                player.onGround = false; // Player is no longer on the ground after jumping
                player.currentGroundType = 'normal'; // Reset ground type
            }
        }
    });

    // Collision with enemies
    jumpEnemies.forEach(enemy => {
        let enemyHitbox = {
            x: enemy.x + enemy.hitboxShrink,
            y: enemy.y + enemy.hitboxShrink, // Correction here: use hitboxShrink, not hitboxShrbox
            width: enemy.width - (2 * enemy.hitboxShrink),
            height: enemy.height - (2 * enemy.hitboxShrink)
        };
        if (isColliding(player, enemyHitbox)) {
            playerTakeDamage(false); // Player takes damage, does not reset position
        }
    });

    // Collision with spikes
    jumpSpikes.forEach(spike => {
        let spikeHitbox = {
            x: spike.x + spikeHitboxPadding,
            y: spike.y + spikeHitboxPadding,
            width: spike.width - (2 * spikeHitboxPadding),
            height: spike.height - (2 * spikeHitboxPadding)
        };
        if (spikeHitbox.width < 0) spikeHitbox.width = 0;
        if (spikeHitbox.height < 0) spikeHitbox.height = 0;

        if (isColliding(player, spikeHitbox)) {
            playerTakeDamage(false); // Player takes damage, does not reset position
        }
    });

    // Collision with oat flakes
    jumpStars.forEach(star => {
        // Create a temporary hitbox for the star using its 'size' property
        let starHitbox = {
            x: star.x,
            y: star.y,
            width: star.size,
            height: star.size
        };
        // Use the isColliding function from game.js for more reliable detection
        if (!star.collected && isColliding(player, starHitbox)) {
            star.collected = true;
            bonusScore += 50; // Add 50 points to bonus score
            // Total score will be updated in updateJumpMode
        }
    });
}

/**
 * Updates the in-game Jump Mode score display.
 */
function updateJumpScoreDisplayInGame() { // Renamed to avoid conflict with welcome screen update
    if (jumpScoreValue) {
        jumpScoreValue.textContent = jumpScore;
    } else {
        console.warn("Element 'jumpScoreValue' not found in the DOM. Ensure it exists in your HTML file.");
    }
}

/**
 * Handles the end of a Jump Mode game.
 * This is called when the player falls off the screen or loses all lives.
 */
function gameOverJumpMode() {
    // Update high score if current score is better
    if (jumpScore > jumpHighScore) {
        jumpHighScore = jumpScore;
        saveJumpHighScore(); // Save the new high score
    }
    // Call the main game over function from game.js
    gameOver(); // Assuming gameOver is a global function in game.js
}
