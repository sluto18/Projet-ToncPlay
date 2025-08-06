const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const restartBtn  = document.getElementById('restartBtn');
const gameOverImg = document.getElementById('gameOverImg');
const scoreEl     = document.getElementById('score');
const bestEl      = document.getElementById('best');
const scoreBoard  = document.getElementById('scoreBoard');

const GROUND_Y = canvas.height - 20; // Ligne du sol à 20 pixels du bas du canvas
const GRAVITY  = 0.4; // Gravité réduite pour une chute plus lente
let gameSpeed  = 3; // Vitesse de jeu initiale drastiquement réduite
let obstacles  = [];
let score      = 0;
let bestScore  = parseInt(localStorage.getItem('rastaBest')) || 0;
let startTime, animId, lastSecond = 0;
let assetsToLoad = 0;
let gameOver = false;
let explosionFrame = 0;
let backgroundX = 0; // Position horizontale du fond d'écran
const backgroundOverlap = 2; // Nombre de pixels de superposition pour le fond

// États du jeu : 'LOADING', 'MENU', 'PLAYING', 'GAME_OVER'
let gameState = 'LOADING';

// Texte des instructions pour le menu
const instructionsText = "Appuie sur Espace ou clic gauche pour sauter. Genre tu vois un truc, tu sautes. Logique.\nFlèche bas ou clic droit pour t’baisser. Genre y’a un machin chelou, tu fais : \"Ouhla, j’me baisse.\"\n\nEt voilà. C’est tout. Y’a pas de diplôme.\n\nGood vibes only!";

// Coordonnées du bouton Démarrer pour la détection de clic
let startButtonRect = {};
let isMouseOverStartButton = false; // Variable pour suivre l'état de survol du bouton Démarrer

// Charger les images
const images = {};
const names = ['rasta1','rasta2','rasta3','rasta4','baffle','camion','feuille','pied','rasta','rastaperdu', 'fondecran'];
assetsToLoad = names.length;
names.forEach(name => {
  const img = new Image();
  img.src = `images/${name}.png`;
  img.onload = () => {
    if (--assetsToLoad === 0) {
      gameState = 'MENU'; // Toutes les images sont chargées, passer au menu
      gameLoop(); // Démarrer la boucle principale pour afficher le menu
    }
  };
  img.onerror = () => console.error(`Erreur chargement ${name}.png`);
  images[name] = img;
});
bestEl.textContent = bestScore;

// Player
const player = { x:80, y:GROUND_Y - 50, w:50, h:50, dy:0, jumping:false, ducking:false, animCounter:0 };

// Contrôles
function jump() { if (!player.jumping && !player.ducking && !gameOver) { player.dy = -15; player.jumping = true; }} // Force de saut réduite
function duck() { if (!player.jumping && !player.ducking && !gameOver) { player.ducking = true; setTimeout(() => player.ducking = false, 600); }}
// Les écouteurs d'événements pour le saut et l'accroupissement sont maintenant gérés dans la fonction de clic du canvas
document.addEventListener('keydown', e=>{ if(e.code==='Space') jump(); if(e.code==='ArrowDown') duck(); });
let touchY=0; canvas.addEventListener('touchstart', e=> touchY=e.touches[0].clientY);
canvas.addEventListener('touchend', e=>{ let d=touchY-e.changedTouches[0].clientY; if(d>30) jump(); if(d<-30) duck(); });

// Rejouer
restartBtn.onclick = () => { location.reload(); };

// Spawn obstacles
function spawnObstacle() {
  if (gameOver) return;
  const elapsed = (performance.now()-startTime)/1000;
  // Ajustement de minDelay et maxDelay pour plus d'espacement entre les événements d'apparition
  const minDelay = Math.max(800, 2500 - elapsed*100); // Augmentation de la base du délai
  const maxDelay = minDelay + 1200; // Augmentation de la plage du délai max
  const count = elapsed>20 && Math.random()<0.3 ? 2+Math.floor(Math.random()*2) : 1;

  let currentXOffset = 0; // Pour gérer l'espacement au sein d'un groupe d'obstacles
  const minGapBetweenGroupedObstacles = 1; // Minimum de pixels entre les obstacles d'un groupe (réduit à 1)

  for(let i=0;i<count;i++){
    const types=['baffle','camion','feuille','pied'];
    let type=types[Math.floor(Math.random()*types.length)];
    let w=50, h=50;
    if(type==='pied'){ const f = Math.random()<0.5?0.7:1.3; w=50*f; h=50*f; }
    if(type==='camion'){ w=70; h=70; }
    // Ajustement de yOff pour les feuilles : -20 pour les faire apparaître plus bas
    const yOff=type==='feuille'?-20:0;

    // Calculer la position x pour l'obstacle actuel dans le groupe
    const obstacleX = canvas.width + currentXOffset;
    obstacles.push({x:obstacleX,type,w,h,yOff,passed:false});

    // Mettre à jour le décalage pour l'obstacle suivant dans ce groupe
    currentXOffset += w + minGapBetweenGroupedObstacles;
  }
  setTimeout(spawnObstacle, minDelay + Math.random()*(maxDelay-minDelay));
}

// Fonction pour dessiner un rectangle arrondi
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}


// Fonction pour dessiner le dégradé rasta
function drawRastaGradient(ctx, x, y, width, height) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#008000'); // Vert
    gradient.addColorStop(0.5, '#FFFF00'); // Jaune
    gradient.addColorStop(1, '#FF0000'); // Rouge
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
}

// Fonction pour mesurer la hauteur du texte
function measureTextHeight(context, text, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let totalHeight = 0;

    paragraphs.forEach((paragraph, pIndex) => {
        const words = paragraph.split(' ');
        let line = '';
        let linesInParagraph = 0;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                line = words[n] + ' ';
                linesInParagraph++;
            } else {
                line = testLine;
            }
        }
        linesInParagraph++; // Compte la dernière ligne
        totalHeight += linesInParagraph * lineHeight;
        if (pIndex < paragraphs.length - 1) {
            totalHeight += lineHeight * 0.5; // Espace entre les paragraphes
        }
    });
    return totalHeight;
}

// Fonction pour envelopper le texte sur plusieurs lignes
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let currentY = y;

    paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, currentY);
        currentY += lineHeight * 1.5; // Espace après chaque paragraphe
    });
    return currentY; // Retourne la position Y finale
}

// Fonction pour dessiner l'écran de chargement
function drawLoadingScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dessine un fond simple pour le chargement
    ctx.fillStyle = '#ADD8E6'; // Bleu clair
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333'; // Texte sombre
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Chargement du jeu...", canvas.width / 2, canvas.height / 2);
}

// Fonction pour dessiner l'écran du menu principal
function drawMenuScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessine l'image de fond sur tout le canvas
    if (images.fondecran.complete) {
        ctx.drawImage(images.fondecran, 0, 0, canvas.width, canvas.height);
    }

    // Définir la zone du menu principal
    const menuWidth = 600;
    const menuHeight = 300;
    const menuX = (canvas.width / 2) - (menuWidth / 2);
    const menuY = (canvas.height / 2) - (menuHeight / 2);
    const menuRadius = 15; // Rayon pour les coins arrondis

    // Dessiner le fond dégradé rasta pour la zone du menu avec coins arrondis
    ctx.save(); // Sauvegarder l'état du contexte
    roundRect(ctx, menuX, menuY, menuWidth, menuHeight, menuRadius);
    ctx.clip(); // Appliquer le clipping pour que le dégradé suive les coins arrondis
    drawRastaGradient(ctx, menuX, menuY, menuWidth, menuHeight);
    ctx.restore(); // Restaurer l'état du contexte (supprimer le clipping)

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    roundRect(ctx, menuX, menuY, menuWidth, menuHeight, menuRadius); // Dessiner le contour après le remplissage
    ctx.stroke();

    // Dessiner le logo Rasta
    const logoWidth = 100;
    const logoHeight = 100;
    const logoPadding = 20;
    const logoX = menuX + logoPadding; // Positionné à gauche du menu
    
    // Définir les paramètres du texte
    const textZoneWidth = menuWidth - logoWidth - logoPadding * 3; // Largeur disponible pour le texte
    const textX = menuX + logoWidth + logoPadding * 2 + textZoneWidth / 2; // Position X pour centrer le texte dans sa zone
    const lineHeight = 20;
    ctx.fillStyle = '#000000'; // Texte noir
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';

    // Calculer la hauteur totale du texte
    const totalTextHeight = measureTextHeight(ctx, instructionsText, textZoneWidth, lineHeight);

    // Calculer la position Y de départ pour centrer le texte et le bouton verticalement
    const buttonHeight = 40;
    const spacingBetweenTextAndButton = 20;
    const totalContentHeight = logoHeight + spacingBetweenTextAndButton + buttonHeight; // Hauteur du logo + bouton
    const textBlockHeight = totalTextHeight; // Hauteur du bloc de texte

    // Déterminer la hauteur maximale entre le bloc logo/bouton et le bloc texte
    const maxContentHeight = Math.max(totalContentHeight, textBlockHeight);

    // Calculer le point de départ Y pour centrer l'ensemble du contenu dans le menu
    let startContentY = menuY + (menuHeight / 2) - (maxContentHeight / 2);

    // Dessiner le logo Rasta
    const logoY = startContentY;
    if (images.rasta.complete) {
        ctx.drawImage(images.rasta, logoX, logoY, logoWidth, logoHeight);
    }

    // Dessiner le bouton "Démarrer" sous le logo
    const buttonWidth = 120; // Taille réduite
    const buttonX = logoX + (logoWidth / 2) - (buttonWidth / 2); // Centré sous le logo
    const buttonY = logoY + logoHeight + spacingBetweenTextAndButton; // Position sous le logo
    startButtonRect = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight }; // Stocker les coordonnées du bouton

    ctx.fillStyle = isMouseOverStartButton ? '#3C8E40' : '#4CAF50'; // Couleur du bouton (plus foncée au survol)
    roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8); // Dessine le rectangle arrondi
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#000000ff'; // Texte blanc sur le bouton
    ctx.font = 'bold 20px Arial'; // Taille de police ajustée pour un bouton plus petit
    ctx.fillText("Démarrer", buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 7);

    // Dessiner le texte des instructions (commence à la même hauteur que le logo pour un alignement visuel)
    const textBlockY = startContentY;
    wrapText(ctx, instructionsText, textX, textBlockY, textZoneWidth, lineHeight);
}

// Fonction pour démarrer le jeu
function startGame() {
    if (gameState !== 'PLAYING') {
        gameState = 'PLAYING';
        score = 0;
        player.y = GROUND_Y - player.h; // Réinitialiser la position du joueur
        player.dy = 0;
        player.jumping = false;
        player.ducking = false;
        obstacles = [];
        gameOver = false;
        explosionFrame = 0;
        gameSpeed = 3; // Vitesse de jeu initiale drastiquement réduite
        lastSecond = 0;
        startTime = performance.now(); // Réinitialiser le temps de début
        gameOverImg.style.display = 'none';
        restartBtn.style.display = 'none';
        setTimeout(spawnObstacle, 1500);
    }
}

// Fonction de fin de jeu
function endGame() {
    gameState = 'GAME_OVER';
    gameOverImg.style.display = 'block';
    if(score > bestScore){ // Mettre à jour le meilleur score si le score actuel est supérieur
        bestScore = score;
        localStorage.setItem('rastaBest', bestScore);
        bestEl.textContent = bestScore;
    }
    setTimeout(()=> restartBtn.style.display='block',500); // Afficher le bouton rejouer
}

// Gestionnaire de clic/toucher sur le canvas
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameState === 'MENU') {
        // Vérifier si le clic est sur le bouton "Démarrer"
        if (x >= startButtonRect.x && x <= startButtonRect.x + startButtonRect.width &&
            y >= startButtonRect.y && y <= startButtonRect.y + startButtonRect.height) {
            startGame();
        }
    } else if (gameState === 'PLAYING') {
        jump(); // Sauter pendant le jeu
    }
});

// Gestionnaire de mouvement de la souris pour l'effet de survol du bouton
canvas.addEventListener('mousemove', (e) => {
    if (gameState === 'MENU') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const wasMouseOver = isMouseOverStartButton;
        isMouseOverStartButton = (x >= startButtonRect.x && x <= startButtonRect.x + startButtonRect.width &&
                                  y >= startButtonRect.y && y <= startButtonRect.y + startButtonRect.height);

        if (wasMouseOver !== isMouseOverStartButton) {
            // Redessiner uniquement si l'état de survol a changé
            drawMenuScreen();
        }
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Empêche le menu contextuel du clic droit
    if (gameState === 'PLAYING') {
        duck();
        setTimeout(() => player.ducking = false, 300); // Se relever après un court délai
    }
});


// Boucle principale du jeu
function gameLoop(){
    if (gameState === 'LOADING') {
        drawLoadingScreen();
    } else if (gameState === 'MENU') {
        drawMenuScreen();
    } else if (gameState === 'PLAYING') {
        const now=performance.now();
        const elapsed=(now-startTime)/1000;
        const sec=Math.floor(elapsed);
        if(sec>lastSecond){ score++; lastSecond=sec; }

        // Dessiner l'image de fond défilante (par-dessus un fond transparent ou un dégradé si souhaité)
        if (images.fondecran.complete) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Efface le canvas avant de dessiner
            backgroundX -= gameSpeed * 0.5;
            if (backgroundX <= -canvas.width + backgroundOverlap) {
                backgroundX = 0;
            }
            ctx.drawImage(images.fondecran, backgroundX, 0, canvas.width, canvas.height);
            ctx.drawImage(images.fondecran, backgroundX + canvas.width - backgroundOverlap, 0, canvas.width, canvas.height);
        }

        // Joueur
        player.dy+=GRAVITY; player.y+=player.dy;
        if(player.y>GROUND_Y-player.h){ player.y=GROUND_Y-player.h; player.dy=0; player.jumping=false; }
        if(!player.jumping&&!player.ducking) player.animCounter=(player.animCounter+1)%30; // Animation de course ralentie

        // Animation d'explosion
        if(gameOver && explosionFrame<30){
            const rad = explosionFrame * 2;
            ctx.beginPath();
            ctx.arc(player.x+player.w/2, player.y+player.h/2, rad, 0, 2*Math.PI);
            ctx.fillStyle = `rgba(255,165,0,${1-explosionFrame/30})`;
            ctx.fill();
            explosionFrame++;
        }

        const sprite=player.jumping?images.rasta2: player.ducking?images.rasta4: images['rasta'+(player.animCounter<15?1:3)];
        const ph=player.ducking?30:50;
        ctx.drawImage(sprite,player.x,player.y+(50-ph),player.w,ph);

        // Obstacles
        gameSpeed=3+elapsed/30; // Vitesse augmentant plus doucement
        for(let i=obstacles.length-1;i>=0;i--){
            const o=obstacles[i]; o.x-=gameSpeed;
            const oy=GROUND_Y-o.h+o.yOff;
            ctx.drawImage(images[o.type],o.x,oy,o.w,o.h);
            // Collision
            // Ajustement de la hitbox pour la rendre moins sévère
            const collisionPaddingX = 10; // Réduit la largeur effective de la hitbox de 20px (10 de chaque côté)
            const collisionPaddingY = 10; // Réduit la hauteur effective de la hitbox de 20px (10 en haut et en bas)

            const playerCollisionLeft = player.x + collisionPaddingX;
            const playerCollisionRight = player.x + player.w - collisionPaddingX;
            const playerCollisionTop = player.y + (50 - ph) + collisionPaddingY; // py est déjà player.y + (50 - ph)
            const playerCollisionBottom = player.y + (50 - ph) + ph - collisionPaddingY;

            const obstacleCollisionLeft = o.x;
            const obstacleCollisionRight = o.x + o.w;
            const obstacleCollisionTop = oy;
            const obstacleCollisionBottom = oy + o.h;

            if(!gameOver &&
               playerCollisionRight > obstacleCollisionLeft &&
               playerCollisionLeft < obstacleCollisionRight &&
               playerCollisionBottom > obstacleCollisionTop &&
               playerCollisionTop < obstacleCollisionBottom) {
                endGame(); // Appeler endGame en cas de collision
            }
            if(o.x+o.w<player.x && !o.passed){ o.passed=true; score+=5; }
            if(o.x+o.w< -50) obstacles.splice(i,1);
        }

        scoreEl.textContent=score;

    } else if (gameState === 'GAME_OVER') {
        // Le jeu est terminé, les éléments de fin de jeu sont affichés par endGame()
        // On continue de dessiner la dernière frame du jeu pour que l'image de fin de jeu s'affiche par-dessus
        if (images.fondecran.complete) {
            ctx.drawImage(images.fondecran, backgroundX, 0, canvas.width, canvas.height);
            ctx.drawImage(images.fondecran, backgroundX + canvas.width - backgroundOverlap, 0, canvas.width, canvas.height);
        }
        const sprite=player.jumping?images.rasta2: player.ducking?images.rasta4: images['rasta'+(player.animCounter<15?1:3)];
        const ph=player.ducking?30:50;
        ctx.drawImage(sprite,player.x,player.y+(50-ph),player.w,ph);
        for(let i=obstacles.length-1;i>=0;i--){
            const o=obstacles[i];
            const oy=GROUND_Y-o.h+o.yOff;
            ctx.drawImage(images[o.type],o.x,oy,o.w,o.h);
        }
        if(explosionFrame<30){ // Continue l'animation d'explosion si elle n'est pas finie
            const rad = explosionFrame * 2;
            ctx.beginPath();
            ctx.arc(player.x+player.w/2, player.y+player.h/2, rad, 0, 2*Math.PI);
            ctx.fillStyle = `rgba(255,165,0,${1-explosionFrame/30})`;
            ctx.fill();
            explosionFrame++;
        }
    }
    animId = requestAnimationFrame(gameLoop); // Continuer la boucle
}

// Appel initial pour démarrer la boucle de jeu, qui affichera l'écran de chargement
gameLoop();
