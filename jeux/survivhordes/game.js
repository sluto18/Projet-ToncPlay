const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

let gameOver = false;

let player;
let enemies;
let projectiles;
let aoes;
let hermitBooks;
let keys;
let mousePos;
let mouseLeftDown;
let mouseRightDown;

let enemySpawnInterval;
let lastEnemySpawn;
let enemySpeed;
let enemyHpBase;

let lastLancePileShot;
let lastBombeEauShot;
let lastBombeEauExplosif;
let lastPistoletEau;
let lastCoupeCoupeShot;

let killCount = 0;
let startTime = 0;

let levelUpPending = false;
let inLevelUpMenu = false;
let inGameOverMenu = false;
let hoveredChoice = null;
let levelUpChoicesRects = [];
let inStartMenu = true; 
let startMenuChoicesRects = [];
let currentLevelUpChoices = null;
let bloodStains = [];
let coupeCoupeSlash = null;
// On place le bouton rejouer plus bas
let gameOverRect = {x:W/2-75,y:H/2+35,width:150,height:40}; // 80
let ruines = [];
let bichons = [];
let lastBricolShot = 0;
let specialEventsDone = {4:false,8:false};
// Par exemple, juste après vos const W, H, etc.
let inIntroMessage = true; // On commence sur la page d’accueil
let introRect = { x: 0, y: 0, width: 400, height: 200 }; // On ajustera dans drawIntroMessage
let playButtonRect = { x: 0, y: 0, width: 150, height: 40 };

const introText = 
"Bienvenue dans Surviv'Hordes !\n\n" +
"Affrontez des hordes de zombies et survivez aussi longtemps que possible.\n\n" +
"Déplacez-vous avec ZQSD ou les flèches. Vous disposez de 2 sorts actifs cliquables \n" +
"avec la souris et de 3 sorts passifs maximum pour optimiser vos chances de survie.\n\n" +
"Un défi intense mêlant action frénétique et stratégie vous attend.\n\n" +
"Bonne chance !";

const paoImg = new Image(); paoImg.src = 'images/pao.gif';
const baoImg = new Image(); baoImg.src = 'images/bao.gif';
const baoeImg = new Image(); baoeImg.src = 'images/baoe.gif';
const livreImg = new Image(); livreImg.src = 'images/livre.gif';
const pileImg = new Image(); pileImg.src = 'images/pile.gif';
const playerImg = new Image(); playerImg.src = 'images/player.gif';
const enemyImg = new Image(); enemyImg.src = 'images/zombie.gif';
const enemy2Img = new Image(); enemy2Img.src = 'images/zombie2.png';
const enemy3Img = new Image(); enemy3Img.src = 'images/zombie3.png';
const enemy4Img = new Image(); enemy4Img.src = 'images/zombie4.png';
const armaImg = new Image(); armaImg.src = 'images/arma.gif';
const lpImg = new Image(); lpImg.src = 'images/lp.gif';
const ballepaoImg = new Image(); ballepaoImg.src = 'images/ballepao.gif';
const fondAmelioImg = new Image(); fondAmelioImg.src = 'images/fondamelio.jpg';
const boutonImg = new Image(); boutonImg.src = 'images/bouton.gif';
const coupecoupeImg = new Image(); coupecoupeImg.src = 'images/coupecoupe.gif';
const bouclierImg = new Image(); bouclierImg.src = 'images/bouclier.gif';
const sangImg = new Image(); sangImg.src = 'images/sang.png';
const bossImg = new Image(); bossImg.src = 'images/boss.png';
const ruineImg1 = new Image(); ruineImg1.src = 'images/ruine.gif'; 
const ruineImg2 = new Image(); ruineImg2.src = 'images/ruine2.gif';
const ruineImg3 = new Image(); ruineImg3.src = 'images/ruine3.png';
const bichonImg = new Image(); bichonImg.src = 'images/bichon.gif';
const cleImg = new Image(); cleImg.src = 'images/cle.gif';
const rpImg = new Image(); rpImg.src = "images/rp.gif";
const petitZombieImg = new Image(); petitZombieImg.src = "images/petitzombie.gif";
const mortImg = new Image(); mortImg.src = "images/mort.gif";
const heroImg = new Image(); heroImg.src = "images/hero.gif";

const playerFrames = [];
for (let i=0; i<6; i++) {
  let img = new Image();
  img.src = `images/gif/frame_${i}.gif`;
  playerFrames.push(img);
}
let playerFrameIndex = 0;   // index de la frame actuelle (0..5)
let playerFrameTime = 0;    // temps accumulé depuis le dernier changement de frame
let playerFrameDelay = 100; // délai (en millisecondes) entre 2 frames

const activeSpells = ['lancePile','bombeEau','coupeCoupe'];
const passiveSpells = ['livreErmite','bombeEauExplosif','pistoletEau','armageddon','bouclier','bichonMalt3Pattes','bricolKit' ];
const HIT_FLASH_DURATION = 100;
const spellDescriptions = {
    lancePile: "Tire un projectile droit devant. Améliorer augmente la cadence.",
    bombeEau: "Lance une bombe à eau AoE sur la position de la souris.",
    livreErmite: "Un livre tourne autour du joueur, infligeant des dégâts aux ennemis proches.",
    bombeEauExplosif: "Pose régulièrement une bombe à eau explosive près du joueur (passif).",
    pistoletEau: "Tire automatiquement sur les ennemis les plus proches. Plus de niveaux = plus de projectiles et moins d'interval.",
    armageddon: "Une zone de dégâts entoure le joueur en permanence (passif).",
    bouclier: "Réduit les dégâts subis par le joueur (passif).",
    coupeCoupe: "Attaque en arc autour du joueur. Améliorer réduit le cooldown et augmente la longueur."
};

function initGame() {
    player = {
        x: W/2,
        y: H/2,
        speed: 0.5,
        vx:0,
        vy:0,
        size:20,
        hp:80,
        maxHp:80,
        xp:0,
        xpForNextLevel: xpNeededForLevel(1),
        level:1,
        directionAngle:0,
        spells: {
            lancePile:0,
            bombeEau:0,
            livreErmite:0,
            bombeEauExplosif:0,
            pistoletEau:0,
            armageddon:0,
            bouclier:0,
            coupeCoupe:0,
            bichonMalt3Pattes: 0,
            bricolKit: 0         
        },
        activeSlots:[null,null]
    };

    enemies=[];
    projectiles=[];
    aoes=[];
    hermitBooks=[]; 
    bloodStains = [];

    keys={Z:false,Q:false,S:false,D:false};
    mousePos={x:W/2,y:H/2};
    mouseLeftDown=false;
    mouseRightDown=false;

    enemySpawnInterval=5000; 
    lastEnemySpawn=0;
    enemySpeed=1;
    enemyHpBase=20;

    lastLancePileShot=0;
    lastBombeEauShot=0;
    lastBombeEauExplosif=0;
    lastPistoletEau=0;
    lastCoupeCoupeShot=0;

    levelUpPending=false;
    inLevelUpMenu=false;
    inGameOverMenu=false;
    hoveredChoice=null;
    levelUpChoicesRects=[];
    inStartMenu=true;
    startMenuChoicesRects=[];
    currentLevelUpChoices=null;

    specialEventsDone={4:false,8:false};

    killCount=0;
    gameOver=false;
    startTime=performance.now();

    requestAnimationFrame(gameLoop);
}

function xpNeededForLevel(lvl) {
    let baseXP = 40;      // XP requis pour passer du lvl 1 au lvl 2
    let increment = 25;   // incrément par niveau

    // xpNeeded = baseXP + (lvl-1)*increment
    // ex: lvl=1->2 = 40 XP, lvl=2->3 = 65 XP, lvl=3->4 = 90 XP, etc.
    return baseXP + (lvl - 1) * increment;
}

function distance(x1,y1,x2,y2) {
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

function angleBetween(x1,y1,x2,y2) {
    return Math.atan2(y2-y1,x2 - x1);
}

function killEnemy(e) {
    gainXp(10);
    e.hp=0;
    if (e.type === 'boss') {
      spawnRuine();
    }
    e.lastHitTime = performance.now();
    bloodStains.push({x: e.x, y: e.y});
    killCount++;
}

function spawnRuine() {
  // Choix de l’image
  let imgArray = [ruineImg1, ruineImg2, ruineImg3];
  let randImg = imgArray[Math.floor(Math.random()*imgArray.length)];

  // Choix de l’ennemi
  let enemyTypes = ['zombie','zombie2','zombie3'];
  let randEnemyType = enemyTypes[Math.floor(Math.random()*enemyTypes.length)];

  // Position aléatoire avec marge
  let margin = 25;
  let x = margin + Math.random() * (W - 2*margin);
  let y = margin + Math.random() * (H - 2*margin);
  // (ou randomSpawnLocation() si vous préférez aux bords)

  // On stocke la ruine dans un tableau
  ruines.push({
    x: x,
    y: y,
    radius: 35,
    img: randImg,
    spawnType: randEnemyType,
    lastSpawnTime: performance.now()
  });
}

function gainXp(amount) {
    player.xp += amount;
    if(player.xp>=player.xpForNextLevel) {
        player.xp -= player.xpForNextLevel;
        player.level++;
        player.xpForNextLevel = xpNeededForLevel(player.level);
        levelUpPending=true;
        showLevelUpAnimation();
        currentLevelUpChoices = generateLevelUpChoices();
    }
}

function randomSpawnLocation() {
    let side=Math.floor(Math.random()*4);
    let x,y;
    if(side===0){x=0;y=Math.random()*H;}
    else if(side===1){x=W;y=Math.random()*H;}
    else if(side===2){x=Math.random()*W;y=0;}
    else {x=Math.random()*W;y=H;}
    return {x:x,y:y};
}

function damageReduction(dmg) {
    let shieldLevel = player.spells.bouclier;
    if(shieldLevel>0) {
        let reduction=0.1*shieldLevel; 
        dmg = dmg*(1-reduction);
    }
    return dmg;
}

// Input

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Empêche le défilement de la page avec les flèches
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    // Contrôles ZQSD
    if (key === 'z') keys.Z = true;
    if (key === 'q') keys.Q = true;
    if (key === 's') keys.S = true;
    if (key === 'd') keys.D = true;

    // Contrôles flèches directionnelles
    if (e.key === 'ArrowUp') keys.Z = true;     // Flèche Haut comme Z
    if (e.key === 'ArrowLeft') keys.Q = true;   // Flèche Gauche comme Q
    if (e.key === 'ArrowDown') keys.S = true;   // Flèche Bas comme S
    if (e.key === 'ArrowRight') keys.D = true;  // Flèche Droite comme D
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();

    // Empêche le défilement de la page avec les flèches
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    // Contrôles ZQSD
    if (key === 'z') keys.Z = false;
    if (key === 'q') keys.Q = false;
    if (key === 's') keys.S = false;
    if (key === 'd') keys.D = false;

    // Contrôles flèches directionnelles
    if (e.key === 'ArrowUp') keys.Z = false;     // Flèche Haut comme Z
    if (e.key === 'ArrowLeft') keys.Q = false;   // Flèche Gauche comme Q
    if (e.key === 'ArrowDown') keys.S = false;   // Flèche Bas comme S
    if (e.key === 'ArrowRight') keys.D = false;  // Flèche Droite comme D
});

canvas.addEventListener('mousemove', handleMouseMove);

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        mouseLeftDown = true;
        handleClick();
    }
    if (e.button === 2) {
        mouseRightDown = true;
        handleClick();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseLeftDown = false;
    if (e.button === 2) mouseRightDown = false;
});

document.addEventListener('contextmenu', (e) => {
    if (e.target === canvas) e.preventDefault();
});

function handleMouseMove(e) {
    const rect=canvas.getBoundingClientRect();
    let mx=e.clientX-rect.left;
    let my=e.clientY-rect.top;
    mousePos.x=mx;
    mousePos.y=my;

    if(inLevelUpMenu) {
        hoveredChoice=null;
        for(let c of levelUpChoicesRects) {
            if(mx>=c.x && mx<=c.x+c.w && my>=c.y && my<=c.y+c.h) {
                hoveredChoice=c;break;
            }
        }
    }

    if(inStartMenu) {
        hoveredChoice=null;
        for(let c of startMenuChoicesRects) {
            if(mx>=c.x && mx<=c.x+c.w && my>=c.y && my<=c.y+c.h) {
                hoveredChoice=c;break;
            }
        }
    }

    if(inGameOverMenu) {
        // On ne fait rien pour hoveredChoice ici, pas besoin de tooltip.
    }
}

function handleClick() {
  // 1) Si on est dans le message d’accueil
  if (inIntroMessage) {
    if (
      mousePos.x >= playButtonRect.x &&
      mousePos.x <= playButtonRect.x + playButtonRect.width &&
      mousePos.y >= playButtonRect.y &&
      mousePos.y <= playButtonRect.y + playButtonRect.height
    ) {
      // On quitte l’intro pour aller au menu de sélection de sort actif, par ex.
      inIntroMessage = false;
      // Ex. si vous avez un inStartMenu = true, vous pouvez l’activer :
      // drawStartMenu = true;

      // ou vous appelez une fonction showSelectActiveSpellMenu() si elle existe
      // showSelectActiveSpellMenu();

      return; // On sort du handleClick
    }
    // Sinon, on ne fait rien (on reste dans l’intro).
    return;
  }
    if (inLevelUpMenu && hoveredChoice) {
        let spell = hoveredChoice.spell;
        let oldLevel = player.spells[spell];

        // On incrémente si < 5
        if (oldLevel < 5) {
            player.spells[spell] = oldLevel + 1;
        }

        // On ferme le menu
        levelUpPending = false;
        inLevelUpMenu = false;
        currentLevelUpChoices = null;
        hoveredChoice = null;

        // Si c'est un sort actif qu'on n'avait pas (0)
        if (activeSpells.includes(spell) && oldLevel === 0) {
            let ownedActives = activeSpells.filter(sp => player.spells[sp] > 0);
            if (ownedActives.length === 1) {
                player.activeSlots[0] = spell;
            } else if (ownedActives.length === 2) {
                player.activeSlots[1] = spell;
            }
        }
    }
    // Si on est dans le menu de départ (inStartMenu)
    if (inStartMenu && hoveredChoice) {
        let spell = hoveredChoice.spell;
        player.spells[spell] = 1; 
        inStartMenu = false;
        hoveredChoice = null;
        // Premier actif attribué au clic gauche
        player.activeSlots[0] = spell;
    }

    if(inGameOverMenu) {
        let mx=mousePos.x;
        let my=mousePos.y;
        if(mx>=gameOverRect.x && mx<=gameOverRect.x+gameOverRect.width &&
           my>=gameOverRect.y && my<=gameOverRect.y+gameOverRect.height) {
            ruines = [];
            initGame();
        }
    }
}

function tryActiveSpell(spell) {
    if(spell==='lancePile') {
        tryLancePile();
    } else if(spell==='bombeEau') {
        tryBombeEau();
    } else if(spell==='coupeCoupe') {
        tryCoupeCoupe();
    }
}

function tryLancePile() {
    let level = player.spells.lancePile; // Obtenir le niveau du sort
    if (level > 0) {
        let cooldown = 0;
        let damage = 0;

        // Définir le cooldown et les dégâts selon le niveau
        switch (level) {
            case 1:
                cooldown = 1000;  // 1 tir/seconde
                damage = 10;
                break;
            case 2:
                cooldown = 800;  // ~1.25 tir/seconde
                damage = 12;
                break;
            case 3:
                cooldown = 700;  // ~1.43 tir/seconde
                damage = 15;
                break;
            case 4:
                cooldown = 600;  // ~1.67 tir/seconde
                damage = 17;
                break;
            case 5:
                cooldown = 500;  // 2 tirs/seconde
                damage = 20;
                break;
            default:
                return; // Si le niveau est en dehors de la plage prévue
        }

        // Vérifier le cooldown avant de tirer
        if (performance.now() - lastLancePileShot > cooldown) {
            lastLancePileShot = performance.now(); // Mettre à jour le dernier tir
            let ang = angleBetween(player.x, player.y, mousePos.x, mousePos.y);
            let speed = 6;

            // Ajouter le projectile
            projectiles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                damage: damage,
                from: 'player',
                type: 'lancePile',
                img: pileImg
            });
        }
    }
}

function tryBombeEau() {
  let level = player.spells.bombeEau;
  if (level > 0) {
    let cooldown;
    let extraRadius = 0; // +0, +10, +20, +30, +40
    switch(level) {
      case 1:
        cooldown = 1000; // 1 tir/s
        extraRadius = 0;
        break;
      case 2:
        cooldown = 1333; // ~0.75 tir/s
        extraRadius = 10;
        break;
      case 3:
        cooldown = 2000; // ~0.5 tir/s
        extraRadius = 20;
        break;
      case 4:
        cooldown = 2000;
        extraRadius = 30;
        break;
      case 5:
        cooldown = 2000;
        extraRadius = 40;
        break;
    }

    // On déclenche le tir si cooldown ok
    if (performance.now() - lastBombeEauShot > cooldown) {
      lastBombeEauShot = performance.now();
      let ang = angleBetween(player.x, player.y, mousePos.x, mousePos.y);
      let speed = 6;
      // On stocke extraRadius dans le projectile ou on calcule radius = base + extraRadius
      projectiles.push({
        x: player.x, y: player.y,
        vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed,
        from: 'player',
        type: 'bao',
        targetX: mousePos.x,
        targetY: mousePos.y,
        img: baoImg,
        extraRadius: extraRadius // pour qu'à l'impact on ajoute ce rayon
      });
    }
  }
}

function tryCoupeCoupe() {
    let level = player.spells.coupeCoupe;
    if (level > 0) {
        let interval = 1000;
        let arc = Math.PI/2;
        let length = 65;
        if (level === 2) {interval=750; arc=Math.PI*(135/180);}
        if (level === 3) {interval=500; arc=Math.PI;}
        if (level === 4) {interval=500; arc=Math.PI; length=75;}
        if (level === 5) {interval=500; arc=Math.PI; length=85;}

        if (performance.now() - lastCoupeCoupeShot > interval) {
            lastCoupeCoupeShot = performance.now();
            let baseAngle = angleBetween(player.x, player.y, mousePos.x, mousePos.y);

            // Paramètres du coupecoupe (segment)
            let handleLength = 5; // Manche
            let bladeLength = length - handleLength;

            // Points A et B du segment
            let Ax = player.x + Math.cos(baseAngle)*(-handleLength);
            let Ay = player.y + Math.sin(baseAngle)*(-handleLength);
            let Bx = player.x + Math.cos(baseAngle)*bladeLength;
            let By = player.y + Math.sin(baseAngle)*bladeLength;

            // Dégâts
            for (let e of enemies) {
                let dist = distancePointToSegment(e.x, e.y, Ax, Ay, Bx, By);
                if (dist <= e.size) {
                    e.hp -= 20; // Ajustez les dégâts si nécessaire
                    e.lastHitTime = performance.now();
                    if (e.hp <= 0) killEnemy(e);
                }
            }

            // On stocke juste baseAngle et length, pas besoin d'arc ni d'animation
            // On garde un temps d’affichage de 200ms par exemple
            coupeCoupeSlash = {
                baseAngle: baseAngle,
                arc: arc,     // arc n'est plus utilisé pour l'animation, mais on peut le laisser
                start: performance.now(),
                length: length
            };
        }
    }
}

function distancePointToSegment(Px, Py, Ax, Ay, Bx, By) {
    let APx = Px - Ax;
    let APy = Py - Ay;
    let ABx = Bx - Ax;
    let ABy = By - Ay;

    let ab2 = ABx*ABx + ABy*ABy;
    if (ab2 === 0) {
        return Math.sqrt(APx*APx + APy*APy); 
    }

    let t = (APx*ABx + APy*ABy) / ab2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;

    let closestX = Ax + t*ABx;
    let closestY = Ay + t*ABy;
    let dx = Px - closestX;
    let dy = Py - closestY;
    return Math.sqrt(dx*dx + dy*dy);
}

function drawStartMenu() {
    inStartMenu=true;
    let choices = [
        {spell:'lancePile',name:"Lance pile",img:lpImg},
        {spell:'bombeEau',name:"Bombe à eau",img:baoImg},
        {spell:'coupeCoupe',name:"Coupe Coupe",img:coupecoupeImg}
    ];

    let menuWidth=400;
    let menuHeight=350; 
    let menuX=(W-menuWidth)/2;
    let menuY=(H-menuHeight)/2;
    ctx.save();
    ctx.globalAlpha=0.9;
    ctx.drawImage(fondAmelioImg,menuX,menuY,menuWidth,menuHeight);
    ctx.globalAlpha=1;

    ctx.font="20px Roboto";
    ctx.fillStyle="#fff";
    let title="Choisissez votre sort actif de départ";
    let tw=ctx.measureText(title).width;
    ctx.fillText(title,(W-tw)/2,menuY+40);

    let choiceWidth=300;
    let choiceHeight=50;
    let startX=(W-choiceWidth)/2;
    let startY=menuY+80;
    startMenuChoicesRects=[];

    for(let i=0;i<choices.length;i++) {
        let c=choices[i];
        let x=startX;
        let y=startY+i*(choiceHeight+10);
        ctx.drawImage(boutonImg,x,y,choiceWidth,choiceHeight);

        if(hoveredChoice && hoveredChoice.spell===c.spell) {
            ctx.strokeStyle="#fff";
            ctx.lineWidth=2;
            ctx.strokeRect(x,y,choiceWidth,choiceHeight);
        }

        ctx.drawImage(c.img,x+5,y+(choiceHeight-32)/2,32,32);
        ctx.fillStyle="#fff";
        ctx.font="16px Roboto";
        let ntw=ctx.measureText(c.name).width;
        ctx.fillText(c.name,x+40+(choiceWidth-40-ntw)/2,y+choiceHeight/2+5);

        startMenuChoicesRects.push({x:x,y:y,w:choiceWidth,h:choiceHeight,spell:c.spell});
    }
    ctx.restore();
}

function getSpellSlotImage(spell) {
    switch(spell) {
        case 'lancePile': return lpImg;
        case 'bombeEau': return baoImg;
        case 'livreErmite': return livreImg;
        case 'bombeEauExplosif': return baoeImg;
        case 'pistoletEau': return paoImg;
        case 'armageddon': return armaImg;
        case 'bouclier': return bouclierImg;
        case 'coupeCoupe': return coupecoupeImg;
        case 'bichonMalt3Pattes': return bichonImg;
        case 'bricolKit': return cleImg;
    }
    return lpImg;
}

function getSpellName(spell) {
    switch(spell) {
        case 'lancePile': return "Lance pile";
        case 'bombeEau': return "Bombe à eau";
        case 'livreErmite': return "Livre ermite";
        case 'bombeEauExplosif': return "Bombe à eau explosif";
        case 'pistoletEau': return "Pistolet à eau";
        case 'armageddon': return "Armageddon";
        case 'bouclier': return "Bouclier";
        case 'coupeCoupe': return "Coupe Coupe";
        case 'bichonMalt3Pattes': return "Bichon maltais à 3 pattes";
        case 'bricolKit': return "Kit du Bricoleur";
    }
    return "Sort inconnu";
}

function showLevelUpAnimation() {
  const levelUpText = document.getElementById('level-up-text');
  if (!levelUpText) return;

  // Remettre l'animation à none
  levelUpText.style.animation = 'none';

  // Forcer un reflow pour que l'animation reparte de zéro
  // (Truc classique en CSS)
  void levelUpText.offsetWidth; 

  // Appliquer l'animation
  levelUpText.style.animation = 'pulseShake 1.8s ease-out forwards';

  setTimeout(() => {
    openLevelUpMenu();
  }, 1800);
}

function openLevelUpMenu() {
  levelUpPending = true;
  inLevelUpMenu = true;
  currentLevelUpChoices = generateLevelUpChoices();
  // ... tout ce qu'il faut pour afficher le menu
}

function drawLevelUpMenu() {
    inLevelUpMenu = true;

    let menuWidth = 400;
    let menuHeight = 460;
    let menuX = (W - menuWidth) / 2;
    let menuY = (H - menuHeight) / 2;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(fondAmelioImg, menuX, menuY, menuWidth, menuHeight);
    ctx.globalAlpha = 1;

    ctx.font = "20px Roboto";
    ctx.fillStyle = "#fff";
    let title = "Choisissez une amélioration";
    let tw = ctx.measureText(title).width;
    ctx.fillText(title, (W - tw) / 2, menuY + 40);

    // On suppose que `currentLevelUpChoices` existe et contient 3 objets
    let choiceWidth = 300;
    let choiceHeight = 50;
    let startX = (W - choiceWidth) / 2;
    let startY = menuY + 80;

    levelUpChoicesRects = [];  // Zones cliquables pour handleClick()

    for (let i = 0; i < currentLevelUpChoices.length; i++) {
        let c = currentLevelUpChoices[i]; // ex: { spell:'bombeEau', name:'Bombe à eau' }

        let x = startX;
        let y = startY + i * (choiceHeight + 10);

        // Dessin du bouton (fond)
        ctx.drawImage(boutonImg, x, y, choiceWidth, choiceHeight);

        // Survol : tracé d'un contour
        if (hoveredChoice && hoveredChoice.spell === c.spell) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, choiceWidth, choiceHeight);
        }

        // Image du sort
        let img = getSpellSlotImage(c.spell); 
        let imgSize = 32;
        ctx.drawImage(img, x + 5, y + (choiceHeight - imgSize) / 2, imgSize, imgSize);

        // Niveau actuel du sort (0 si on ne l'a pas encore)
        let currentLvl = player.spells[c.spell] || 0;
        // Niveau qu'on atteindra si on choisit ce sort
        let displayedLevel = (currentLvl >= 5)
            ? "5 (MAX)"
            : (currentLvl + 1);

        // Exemple : "Bombe à eau (Niv. 2)"
        let displayName = c.name + " (Niv. " + displayedLevel + ")";

        ctx.fillStyle = "#fff";
        ctx.font = "16px Roboto";
        let textX = x + imgSize + 15;
        let textY = y + choiceHeight / 2 + 5;
        ctx.fillText(displayName, textX, textY);

        levelUpChoicesRects.push({
            x: x,
            y: y,
            w: choiceWidth,
            h: choiceHeight,
            spell: c.spell,
            name: c.name
        });
    }

    ctx.restore();
}

function getEnemyStats(type) {
    let hp = enemyHpBase+(player.level*5);
    let dmg=0.1;
    let spd=enemySpeed;

    if(type==='zombie2') {
        dmg=0.2;
    }
    if(type==='zombie3') {
        spd=enemySpeed*0.75;
    }
    if(type==='zombie4') {
        hp=(enemyHpBase+(player.level*5))*0.5;
    }

    if (type === 'boss') {
      hp = 100;       // Gros HP
      dmg = 0.5;      // Dégâts plus élevés si souhaité
      spd = 0.5;      // Lent
    }

    return {hp:hp,dmg:dmg,speed:spd};
}

function randChoice(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

function generateLevelUpChoices() {
    // Filtrer les sorts actifs/passifs qui ne sont pas déjà au niveau 5
    let availableActives = activeSpells.filter(sp => player.spells[sp] < 5);
    let availablePassives = passiveSpells.filter(sp => player.spells[sp] < 5);

    // On veut idéalement 1 actif + 2 passifs

    // Choisir 1 actif si disponible
    let chosenActive = null;
    if (availableActives.length > 0) {
        chosenActive = randChoice(availableActives);
    }

    // Choisir 2 passifs
    let chosenPassives = [];
    if (availablePassives.length > 0) {
        let p1 = randChoice(availablePassives);
        chosenPassives.push(p1);
        let pool = availablePassives.filter(sp => sp !== p1);
        if (pool.length > 0) {
            let p2 = randChoice(pool);
            chosenPassives.push(p2);
        }
    }

    // Construire le tableau final
    let finalChoices = [];

    // Ajouter l’actif si on en a un
    if (chosenActive) {
        finalChoices.push({
            spell: chosenActive,
            name: getSpellName(chosenActive)
        });
    }

    // Ajouter les passifs
    for (let sp of chosenPassives) {
        finalChoices.push({
            spell: sp,
            name: getSpellName(sp)
        });
    }

    return finalChoices;
}

function updatePlayer(dt) {
    playerFrameTime += dt;
    if (playerFrameTime > playerFrameDelay) {
      playerFrameTime -= playerFrameDelay; 
      playerFrameIndex = (playerFrameIndex + 1) % playerFrames.length;
    }
    let dx=0,dy=0;
    if(keys.Z) dy-=player.speed;
    if(keys.S) dy+=player.speed;
    if(keys.Q) dx-=player.speed;
    if(keys.D) dx+=player.speed;

    let oldX = player.x;
    let oldY = player.y;
    let newX = oldX + dx;
    let newY = oldY + dy;

    for (let r of ruines) {
      let distAfter = distance(newX, newY, r.x, r.y);
      // si distAfter < (16 + player.size) => collision
      // Suppose que player.size=16 par ex.
      if (distAfter < (r.radius + player.size)) {
        // collision => on empêche le déplacement
        dx=0; dy=0;
        newX=oldX; newY=oldY;
        break; // On sort de la boucle
      }
    }

    player.x = newX;
    player.y = newY;

    if(dx!==0||dy!==0) {
        player.directionAngle=Math.atan2(dy,dx);
    }

    player.x+=dx; player.y+=dy;
    if(player.x<0) player.x=0;
    if(player.x>W) player.x=W;
    if(player.y<0) player.y=0;
    if(player.y>H) player.y=H;

    // Pistolet a eau : nouvelle logique
    let peLevel=player.spells.pistoletEau;
    if(peLevel>0) {
        let interval=3000; 
        let nbProjectiles=1;
        if(peLevel===2) { nbProjectiles=2; } 
        if(peLevel===3) { nbProjectiles=3; }
        if(peLevel===4) { nbProjectiles=3; interval=2000; }
        if(peLevel===5) { nbProjectiles=3; interval=1000; }

        if(performance.now()-lastPistoletEau>interval) {
            lastPistoletEau=performance.now();
            if(enemies.length>0) {
                let targets=enemies.slice().sort((a,b)=>{
                    return distance(player.x,player.y,a.x,a.y)-distance(player.x,player.y,b.x,b.y);
                }).slice(0,nbProjectiles);

                for(let t of targets) {
                    let ang=angleBetween(player.x,player.y,t.x,t.y);
                    projectiles.push({
                        x:player.x,
                        y:player.y,
                        vx:Math.cos(ang)*5,
                        vy:Math.sin(ang)*5,
                        damage:10*peLevel,
                        from:'player',
                        type:'pistolet',
                        img:ballepaoImg
                    });
                }
            }
        }
    }

    //=======================
    // Bichon maltais a 3 pattes
    // ====================
let bichonLevel = player.spells.bichonMalt3Pattes; 
if (bichonLevel > 0) {
    let maxBichons = 1;
    let radius = 200;
    let dps = 20; // dégât par seconde

    switch(bichonLevel) {
        case 1: maxBichons=1; radius=200; dps=20; break;
        case 2: maxBichons=2; radius=250; dps=20; break;
        case 3: maxBichons=3; radius=300; dps=20; break;
        case 4: maxBichons=4; radius=300; dps=25; break;
        case 5: maxBichons=5; radius=300; dps=30; break;
    }

    // Ajuster la taille de bichons[] 
    // On recrée s’il n’existe pas, ou modifie le nombre
    while (bichons.length < maxBichons) {
        bichons.push({
            x: player.x, 
            y: player.y,
            target: null,
            radius: radius,
            damage: dps,
            img: bichonImg
        });
    }
    while (bichons.length > maxBichons) {
        bichons.pop();
    }

    // Mettre à jour radius/damage pour tous
    for (let b of bichons) {
        b.radius = radius;
        b.damage = dps;
    }

    // Déplacement / attaque
    updateBichons(dt);
} else {
    bichons = [];
}
    //=======================
    // Kit du bricoleur
    // ====================
  let kitLevel = player.spells.bricolKit || 0;
  if (kitLevel > 0) {
    let cooldown = 3000; // niv1 = 3s par défaut
    let damage = 20;
    let maxRebounds = 1;

    switch (kitLevel) {
      case 1: cooldown=3000; damage=20; maxRebounds=1; break;
      case 2: cooldown=2500; damage=20; maxRebounds=2; break;
      case 3: cooldown=2000; damage=20; maxRebounds=3; break;
      case 4: cooldown=2000; damage=25; maxRebounds=4; break;
      case 5: cooldown=2000; damage=25; maxRebounds=5; break;
    }

    if (performance.now() - lastBricolShot > cooldown) {
      lastBricolShot = performance.now();

      // On choisit un ennemi pour le 1er tir (ici : ennemi le plus proche)
      let target = getClosestEnemy(player.x, player.y);
      if (target) {
        projectiles.push({
          x: player.x,
          y: player.y,
          vx: 0, 
          vy: 0,
          type: 'cle',
          img: cleImg,
          rotation: 0,
          rotationSpeed: 0.3,
          speed: 6,
          damage: damage,
          rebounds: maxRebounds,
          currentTarget: target,
          remove: false
        });
      }
    }
  }
    // =====================
    // LIVRE ERMITE (passif)
    // =====================
let ermiteLevel = player.spells.livreErmite;
if (ermiteLevel > 0) {
    let numberOfBooks = Math.min(3, ermiteLevel);
    let angleSpeed = 0.05;
    if (ermiteLevel === 4) angleSpeed = 0.07;
    if (ermiteLevel === 5) angleSpeed = 0.09;

    // Si le nombre de livres souhaité ne correspond pas à la taille actuelle du tableau
    // on réinitialise leur position de façon régulière.
    if (hermitBooks.length !== numberOfBooks) {
        hermitBooks = [];
        for (let i = 0; i < numberOfBooks; i++) {
            let initialAngle = (2 * Math.PI * i) / numberOfBooks; 
            hermitBooks.push({
                angle: initialAngle,
                radius: 65,
                level: ermiteLevel
            });
        }
    }

    // Faire tourner les livres et infliger des dégâts
    for (let hb of hermitBooks) {
        hb.angle += angleSpeed;
        let bx = player.x + Math.cos(hb.angle) * hb.radius;
        let by = player.y + Math.sin(hb.angle) * hb.radius;

        for (let e of enemies) {
            if (distance(bx, by, e.x, e.y) < (20 + e.size)) {
                e.hp -= 0.4;
                e.lastHitTime = performance.now();
                if (e.hp <= 0) killEnemy(e);
            }
        }
    }
} else {
    hermitBooks = [];
}


    // =============================
    // BOMBE A EAU EXPLOSIF (passif)
    // =============================
if (player.spells.bombeEauExplosif > 0) {
    let boeLevel = player.spells.bombeEauExplosif;

    // Paramètres en fonction du niveau
    let bombsCount = 1; 
    let interval = 5000; 
    let radiusBonus = 0;

    switch (boeLevel) {
        case 1:
            bombsCount = 1; 
            interval = 5000; 
            radiusBonus = 0;
            break;
        case 2:
            bombsCount = 2; 
            interval = 4000; 
            radiusBonus = 0;
            break;
        case 3:
            bombsCount = 3; 
            interval = 3000; 
            radiusBonus = 0;
            break;
        case 4:
            bombsCount = 3; 
            interval = 3000; 
            radiusBonus = 10; // Rayon légèrement augmenté
            break;
        case 5:
            bombsCount = 3; 
            interval = 3000; 
            radiusBonus = 20; // Rayon encore plus grand
            break;
    }

    // Gestion du cooldown
    if (performance.now() - lastBombeEauExplosif > interval) {
        lastBombeEauExplosif = performance.now();

        // Génération des bombes selon le niveau
        for (let i = 0; i < bombsCount; i++) {
            // Position aléatoire autour du joueur
            let bx = player.x + (Math.random() * 200 - 100);
            let by = player.y + (Math.random() * 200 - 100);
            let ang = angleBetween(player.x, player.y, bx, by);
            let speed = 4;

            // Création d'un projectile 'baoe'
            projectiles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                damage: 20 * boeLevel,
                from: 'player',
                type: 'baoe',
                targetX: bx,
                targetY: by,
                radiusBonus: radiusBonus, // Ajout du bonus de rayon
                img: baoeImg
            });
        }
    }
}
    // ============
    // ARMAGEDDON (passif)
    // ============
if (player.spells.armageddon > 0) {
    let level = player.spells.armageddon;
    let baseRadius = 50; // Rayon de base
    let radius = baseRadius; 
    let damage = 0.1 * level; // Dégâts progressifs par niveau

    // Ajuster le rayon et les dégâts selon le niveau
    switch (level) {
        case 1:
            radius = 50; 
            damage = 0.4; // Dégâts modestes
            break;
        case 2:
            radius = 60; 
            damage = 0.5; // Dégâts légèrement augmentés
            break;
        case 3:
            radius = 70; 
            damage = 0.7; // Dégâts moyens
            break;
        case 4:
            radius = 100; 
            damage = 1.0; // Dégâts élevés
            break;
        case 5:
            radius = 130; 
            damage = 1.5; // Dégâts maximum
            break;
    }

    // Appliquer les dégâts aux ennemis dans la zone
    for (let e of enemies) {
        if (distance(player.x, player.y, e.x, e.y) < radius) {
            e.hp -= damage; // dt représente le facteur de temps
            e.lastHitTime = performance.now(); // Enregistrement du coup
            if (e.hp <= 0) killEnemy(e); // Ennemis tués si PV <= 0
        }
    }
}

    // Attaques actives
    if(mouseLeftDown && player.activeSlots[0]) {
        tryActiveSpell(player.activeSlots[0]);
    }
    if(mouseRightDown && player.activeSlots[1]) {
        tryActiveSpell(player.activeSlots[1]);
    }

    if(player.hp<=0 && !gameOver) {
        player.hp=0;
        gameOver=true;
        inGameOverMenu=true;
    }
}

function getSpawnInfoForLevel(lvl) {
    let interval=5000;
    let types=['zombie'];

    if(lvl===1) {interval=5000;types=['zombie'];}
    else if(lvl===2) {interval=4500;types=['zombie','zombie2'];}
    else if(lvl===3) {interval=4000;types=['zombie3'];}
    else if(lvl===4) {interval=4000;types=['zombie4'];}
    else if(lvl===5) {interval=10000;types=['zombie'];}
    else if(lvl===6) {interval=3000;types=['zombie2','zombie3'];}
    else if(lvl===7) {interval=2500;types=['zombie','zombie2','zombie3'];}
    else if(lvl===8) {interval=2500;types=['zombie4'];}
    else if(lvl===9) {interval=2000;types=['zombie','zombie2','zombie3','zombie4'];}
    else if(lvl===10) {interval=10000;types=['zombie'];}
    else if(lvl===11) {interval=3000;types=['zombie2','zombie3'];}
    else if(lvl===12) {interval=2500;types=['zombie4'];}
    else if(lvl===13) {interval=2500;types=['zombie','zombie2'];}
    else if(lvl===14) {interval=2000;types=['zombie','zombie3'];}
    else if(lvl===15) {interval=10000;types=['zombie'];}
    else if(lvl===16) {interval=5000;types=['zombie'];}
    else if(lvl===17) {interval=3000;types=['zombie2','zombie3'];}
    else if(lvl===18) {interval=500;types=['zombie4'];}
    else if(lvl===19) {interval=500;types=['zombie'];}
    else if(lvl===20) {interval=10000;types=['zombie'];}
    else if(lvl===21) {interval=500;types=['zombie'];}
    else if(lvl===22) {interval=500;types=['zombie'];}
    else if(lvl===23) {interval=500;types=['zombie'];}
    else if(lvl===24) {interval=500;types=['zombie'];}
    else if(lvl===25) {interval=10000;types=['zombie'];}
    else if(lvl>21) {
        let extra = (lvl-10)*100;
        interval=Math.max(100,500-extra);
        types=['zombie','zombie2','zombie3','zombie4'];
    }

    return {interval:interval,types:types};
}

function spawnCircleOfEnemies(count,type) {
    for(let i=0;i<count;i++) {
        let angle=(2*Math.PI*(i/count));
        let radius=400; 
        let ex=player.x+Math.cos(angle)*radius;
        let ey=player.y+Math.sin(angle)*radius;

        let stats=getEnemyStats(type);
        enemies.push({
            x:ex,y:ey,
            vx:0,vy:0,
            size:20,
            hp:stats.hp,
            dmg:stats.dmg,
            speed:stats.speed,
            img:(type==='zombie'?enemyImg:(type==='zombie2'?enemy2Img:(type==='zombie3'?enemy3Img:enemy4Img)))
        });
    }
}

function spawnSquareOfEnemies(count, type) {
    let radius = 200; // Distance du joueur, ajustez selon vos besoins
    let stats = getEnemyStats(type);

    // On va répartir les ennemis sur 4 côtés. 
    // Si count n'est pas un multiple de 4, on répartit le reste.
    let perSide = Math.floor(count / 4);
    let remainder = count % 4;

    let sideCounts = [perSide, perSide, perSide, perSide];
    for (let i = 0; i < remainder; i++) {
        sideCounts[i]++;
    }

    // Fonction d'aide pour l'image
    let chosenImg = (type === 'zombie' ? enemyImg :
                     type === 'zombie2' ? enemy2Img :
                     type === 'zombie3' ? enemy3Img :
                     enemy4Img);

    // Côté supérieur (de gauche à droite)
    if (sideCounts[0] > 0) {
        for (let i = 0; i < sideCounts[0]; i++) {
            let x = player.x - radius + (i * (2*radius/(sideCounts[0]-1)));
            let y = player.y - radius;
            enemies.push({
                x:x, y:y,
                vx:0, vy:0,
                size:20,
                hp:stats.hp,
                dmg:stats.dmg,
                speed:stats.speed,
                img: chosenImg
            });
        }
    }

    // Côté droit (de haut en bas)
    if (sideCounts[1] > 0) {
        for (let i = 0; i < sideCounts[1]; i++) {
            let x = player.x + radius;
            let y = player.y - radius + (i * (2*radius/(sideCounts[1]-1)));
            enemies.push({
                x:x, y:y,
                vx:0, vy:0,
                size:20,
                hp:stats.hp,
                dmg:stats.dmg,
                speed:stats.speed,
                img: chosenImg
            });
        }
    }

    // Côté inférieur (de droite à gauche)
    if (sideCounts[2] > 0) {
        for (let i = 0; i < sideCounts[2]; i++) {
            let x = player.x + radius - (i * (2*radius/(sideCounts[2]-1)));
            let y = player.y + radius;
            enemies.push({
                x:x, y:y,
                vx:0, vy:0,
                size:20,
                hp:stats.hp,
                dmg:stats.dmg,
                speed:stats.speed,
                img: chosenImg
            });
        }
    }

    // Côté gauche (de bas en haut)
    if (sideCounts[3] > 0) {
        for (let i = 0; i < sideCounts[3]; i++) {
            let x = player.x - radius;
            let y = player.y + radius - (i * (2*radius/(sideCounts[3]-1)));
            enemies.push({
                x:x, y:y,
                vx:0, vy:0,
                size:20,
                hp:stats.hp,
                dmg:stats.dmg,
                speed:stats.speed,
                img: chosenImg
            });
        }
    }
}

function spawnBoss(count, type) {
  for (let i = 0; i < count; i++) {
    let loc = randomSpawnLocation(); // par ex. aux bords de la map
    let stats = getEnemyStats(type);
    // On redimensionne l’image côté dessin : 
    // on peut juste mettre e.size=30 au lieu de 20, pour être "plus gros".

    enemies.push({
      x: loc.x, 
      y: loc.y,
      vx: 0, 
      vy: 0,
      size: 70,     
      hp: stats.hp,
      dmg: stats.dmg,
      speed: stats.speed,
      img: bossImg,        // image du boss
      type: 'boss'         // pour le reconnaître facilement
    });
  }
}

function updateEnemies(dt) {
    if(player.level===4 && !specialEventsDone[4]) {
        spawnCircleOfEnemies(8,'zombie4');
        specialEventsDone[4]=true;
    }
    if(player.level===5 && !specialEventsDone[5]) {
        spawnBoss(1,'boss');
        specialEventsDone[5]=true;
    }
    if(player.level===10 && !specialEventsDone[10]) {
        spawnBoss(1,'boss');
        specialEventsDone[10]=true;
    }
    if(player.level===12 && !specialEventsDone[12]) {
        spawnCircleOfEnemies(16,'zombie4');
        specialEventsDone[12]=true;
    }
    if(player.level===15 && !specialEventsDone[15]) {
        spawnBoss(1,'boss');
        specialEventsDone[15]=true;
    }
    if(player.level===16 && !specialEventsDone[16]) {
        spawnSquareOfEnemies(16,'zombie');
        specialEventsDone[16]=true;
    }
    if(player.level===18 && !specialEventsDone[18]) {
        spawnCircleOfEnemies(16,'zombie4');
        specialEventsDone[18]=true;
    }
    if(player.level===20 && !specialEventsDone[20]) {
        spawnBoss(2,'boss');
        specialEventsDone[20]=true;
    }
    if(player.level===22 && !specialEventsDone[22]) {
        spawnSquareOfEnemies(20,'zombie2');
        specialEventsDone[22]=true;
    }
    if(player.level===25 && !specialEventsDone[25]) {
        spawnBoss(2,'boss');
        specialEventsDone[25]=true;
    }
    if(player.level===27 && !specialEventsDone[27]) {
        spawnSquareOfEnemies(10,'zombie');
        specialEventsDone[27]=true;
    }

    let spawnInfo=getSpawnInfoForLevel(player.level);
    let spawnInterval=spawnInfo.interval;
    let enemyTypes=spawnInfo.types;

    if(!levelUpPending && !gameOver && !inStartMenu && performance.now()-lastEnemySpawn>spawnInterval) {
        lastEnemySpawn=performance.now();
        let chosenType=randChoice(enemyTypes);

        let loc=randomSpawnLocation();
        let stats=getEnemyStats(chosenType);
        enemies.push({
            x:loc.x,y:loc.y,
            vx:0,vy:0,
            size:20,
            hp:stats.hp,
            dmg:stats.dmg,
            lastHitTime: 0,
            speed:stats.speed,
            img:(chosenType==='zombie'?enemyImg:(chosenType==='zombie2'?enemy2Img:(chosenType==='zombie3'?enemy3Img:enemy4Img)))
        });
    }

    for(let e of enemies) {
        let ang=Math.atan2(player.y-e.y,player.x-e.x);
        e.vx=Math.cos(ang)*e.speed;
        e.vy=Math.sin(ang)*e.speed;
        e.x+=e.vx;
        e.y+=e.vy;

        if(distance(player.x,player.y,e.x,e.y)<(player.size+e.size)) {
            let dmg=e.dmg;
            dmg=damageReduction(dmg);
            player.hp-=dmg;
        }
    }
    enemies=enemies.filter(e=>e.hp>0);
}

function updateBichons(dt) {
  // On parcourt chaque bichon
  for (let i=0; i<bichons.length; i++) {
    let b = bichons[i];

    // Si la target est morte (hp<=0), on annule la target
    if (b.target && b.target.hp <= 0) {
      b.target = null;
    }

    // 1) Si le bichon n’a pas de cible, on en cherche une
    if (!b.target) {
      // Cherche un ennemi dans le rayon b.radius autour du joueur
      let nearEnemy = enemies.find(e => 
        e.hp>0 && distance(player.x, player.y, e.x, e.y) < b.radius
      );
      if (nearEnemy) {
        b.target = nearEnemy;
      }
    }

    let tx, ty; // position vers laquelle le bichon se dirige
    if (b.target) {
      // 2) Aller vers l’ennemi ciblé
      tx = b.target.x;
      ty = b.target.y;
    } else {
      // 3) Sinon, se place sur un cercle autour du joueur
      let angle = i * (2*Math.PI / bichons.length);
      let offsetRadius = 40;  // distance par rapport au joueur
      tx = player.x + Math.cos(angle)*offsetRadius;
      ty = player.y + Math.sin(angle)*offsetRadius;
    }

    // Déplacement
    let dx = tx - b.x;
    let dy = ty - b.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let speed = 3; // Vitesse du bichon

    if (dist > 2) {
      let angle = Math.atan2(dy, dx);
      b.x += Math.cos(angle)*speed;
      b.y += Math.sin(angle)*speed;
    } else {
      // Si on touche l’ennemi, on inflige des dégâts (par seconde)
      if (b.target) {
        // Sur dt ms => b.damage*(dt/1000)
        let damageThisFrame = b.damage*(dt/1000);
        b.target.hp -= damageThisFrame;
        if (b.target.hp <= 0) {
          killEnemy(b.target);
          b.target = null;
        }
      }
    }
  }
}

function updateRuines(dt) {
  for (let r of ruines) {
    // Si 3s se sont écoulées depuis le dernier spawn
    if (performance.now() - r.lastSpawnTime > 3000) {
      r.lastSpawnTime = performance.now();

      // On spawn 1 ennemi du type r.spawnType
      // On place l’ennemi à la position de la ruine
      let stats = getEnemyStats(r.spawnType);
      enemies.push({
        x: r.x,
        y: r.y,
        vx: 0,
        vy: 0,
        size: 20,
        hp: stats.hp,
        dmg: stats.dmg,
        speed: stats.speed,
        img: (r.spawnType === 'zombie' ? enemyImg :
             (r.spawnType === 'zombie2' ? enemy2Img : enemy3Img))
      });
    }
  }
}

function updateProjectiles(dt) {
    // On parcourt tous les projectiles
    for (let p of projectiles) {

        // --- 1) Cas du projectile "cle" ---
    if (p.type === 'cle') {
      // Faire tourner la clé
      p.rotation += p.rotationSpeed;

      // Se déplacer vers la cible si elle est encore en vie
      if (p.currentTarget && p.currentTarget.hp > 0) {
        let dx = p.currentTarget.x - p.x;
        let dy = p.currentTarget.y - p.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 2) {
          let ang = Math.atan2(dy, dx);
          p.x += Math.cos(ang)*p.speed;
          p.y += Math.sin(ang)*p.speed;
        } else {
          // On touche la cible => inflige dégâts
          p.currentTarget.hp -= p.damage;
          if (p.currentTarget.hp <= 0) {
            killEnemy(p.currentTarget); 
          }
          // Gérer les rebonds
          p.rebounds--;
          if (p.rebounds > 0) {
            let newT = findAnotherEnemy(p.currentTarget);
            if (newT) {
              p.currentTarget = newT;
            } else {
              p.remove = true;
            }
          } else {
            p.remove = true;
          }
        }
      } else {
        // plus de target => on retire le projectile
        p.remove = true;
      }
    }

        // --- 2) Cas du projectile "bao" ou "baoe" ---
        else if (p.type === 'bao' || p.type === 'baoe') {
            let distToTarget = distance(p.x, p.y, p.targetX, p.targetY);
            if (distToTarget < 5) {
                // AoE
                let baseRadius = (p.type === 'bao') ? 30 : 50; 
                let extraRadius = 0;

                // Ajuster selon le niveau de la bombe
                if (p.type === 'bao') {
                    extraRadius = p.extraRadius || 0;
                } else if (p.type === 'baoe') {
                    switch (player.spells.bombeEauExplosif) {
                        case 4: extraRadius = 10; break;
                        case 5: extraRadius = 20; break;
                        default: extraRadius = 0; break;
                    }
                }
                let totalRadius = baseRadius + extraRadius;

                aoes.push({
                    x: p.targetX,
                    y: p.targetY,
                    radius: totalRadius,
                    damage: p.damage,
                    duration: 1000,
                    start: performance.now()
                });
                p.remove = true;

            } else {
                // Déplacement de la bombe vers la cible
                let ang = angleBetween(p.x, p.y, p.targetX, p.targetY);
                let speed = (p.type === 'bao' ? 6 : 4);
                p.vx = Math.cos(ang)*speed;
                p.vy = Math.sin(ang)*speed;
                p.x += p.vx;
                p.y += p.vy;
            }
        }

        // --- 3) Tous les autres projectiles ---
        else {
            p.x += p.vx; 
            p.y += p.vy;

            // Collision avec les ennemis
            if (p.from === 'player' && p.type !== 'bao' && p.type !== 'baoe') {
                for (let e of enemies) {
                    if (distance(p.x, p.y, e.x, e.y) < (10 + e.size)) {
                        e.hp -= p.damage;
                        e.lastHitTime = performance.now();
                        p.remove = true;
                        if (e.hp <= 0) killEnemy(e);
                        break;
                    }
                }
            }
        }

        // --- 4) Supprimer les projectiles hors limites ---
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) p.remove = true;

    } // fin du for (let p of projectiles)

    // Enfin, on filtre ceux à enlever
    projectiles = projectiles.filter(p => !p.remove);
}


function updateAoes(dt) {
    let now=performance.now();
    for(let a of aoes) {
        for(let e of enemies) {
            if(distance(a.x,a.y,e.x,e.y)<a.radius) {
                e.hp-=0.2*(a.damage/10);
                e.lastHitTime = performance.now();
                if(e.hp<=0) killEnemy(e);
            }
        }
        if(now - a.start > a.duration) {
            a.remove=true;
        }
    }
    aoes=aoes.filter(a=>!a.remove);
}

function gameLoop() {
    let now=performance.now();
    let dt=now-(this.lastTime||now);
    this.lastTime=now;

    if(!levelUpPending && !gameOver && !inStartMenu) {
        updatePlayer(dt);
        updateEnemies(dt);
        updateProjectiles(dt);
        updateAoes(dt);
        updateRuines(dt)
    }

    draw();

    if(!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}


function tryActiveSpell(spell) {
    if(spell==='lancePile') {
        tryLancePile();
    } else if(spell==='bombeEau') {
        tryBombeEau();
    } else if(spell==='coupeCoupe') {
        tryCoupeCoupe();
    }
}

function drawStartMenu() {
    inStartMenu=true;
    let choices = [
        {spell:'lancePile',name:"Lance pile",img:lpImg},
        {spell:'bombeEau',name:"Bombe à eau",img:baoImg},
        {spell:'coupeCoupe',name:"Coupe Coupe",img:coupecoupeImg}
    ];

    let menuWidth=400;
    let menuHeight=350; 
    let menuX=(W-menuWidth)/2;
    let menuY=(H-menuHeight)/2;
    ctx.save();
    ctx.globalAlpha=0.9;
    ctx.drawImage(fondAmelioImg,menuX,menuY,menuWidth,menuHeight);
    ctx.globalAlpha=1;

    ctx.font="20px Roboto";
    ctx.fillStyle="#fff";
    let title="Choisissez votre sort actif de départ";
    let tw=ctx.measureText(title).width;
    ctx.fillText(title,(W-tw)/2,menuY+40);

    let choiceWidth=300;
    let choiceHeight=50;
    let startX=(W-choiceWidth)/2;
    let startY=menuY+80;
    startMenuChoicesRects=[];

    for(let i=0;i<choices.length;i++) {
        let c=choices[i];
        let x=startX;
        let y=startY+i*(choiceHeight+10);
        ctx.drawImage(boutonImg,x,y,choiceWidth,choiceHeight);

        if(hoveredChoice && hoveredChoice.spell===c.spell) {
            ctx.strokeStyle="#fff";
            ctx.lineWidth=2;
            ctx.strokeRect(x,y,choiceWidth,choiceHeight);
        }

        ctx.drawImage(c.img,x+5,y+(choiceHeight-32)/2,32,32);
        ctx.fillStyle="#fff";
        ctx.font="16px Roboto";
        let ntw=ctx.measureText(c.name).width;
        ctx.fillText(c.name,x+40+(choiceWidth-40-ntw)/2,y+choiceHeight/2+5);

        startMenuChoicesRects.push({x:x,y:y,w:choiceWidth,h:choiceHeight,spell:c.spell});
    }
    ctx.restore();
}

function drawLevelUpMenu() {
    inLevelUpMenu = true;

    let menuWidth = 400;
    let menuHeight = 350;
    let menuX = (W - menuWidth) / 2;
    let menuY = (H - menuHeight) / 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(fondAmelioImg, menuX, menuY, menuWidth, menuHeight);
    ctx.globalAlpha = 1;

    ctx.font = "20px Roboto";
    ctx.fillStyle = "#fff";
    let title = "Choisissez une amélioration";
    let tw = ctx.measureText(title).width;
    ctx.fillText(title, (W - tw) / 2, menuY + 40);

    // Supposez que `currentLevelUpChoices` contient le tableau retourné par generateLevelUpChoices().
    // => ex: [ {spell:'bombeEau', name:'Bombe à eau'}, {...}, {...} ]
    let choiceWidth = 300;
    let choiceHeight = 50;
    let startX = (W - choiceWidth) / 2;
    let startY = menuY + 80;

    levelUpChoicesRects = [];

    for (let i = 0; i < currentLevelUpChoices.length; i++) {
        let c = currentLevelUpChoices[i]; 
        // c = { spell:'bombeEau', name:'Bombe à eau' } par ex

        let x = startX;
        let y = startY + i * (choiceHeight + 10);

        // Dessin du bouton
        ctx.drawImage(boutonImg, x, y, choiceWidth, choiceHeight);

        // Survol
        if (hoveredChoice && hoveredChoice.spell === c.spell) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, choiceWidth, choiceHeight);
        }

        // On dessine l'image du sort
        let img = getSpellSlotImage(c.spell);
        let imgSize = 32;
        ctx.drawImage(img, x + 5, y + (choiceHeight - imgSize) / 2, imgSize, imgSize);

        // Niveau actuel du sort
        let currentLvl = player.spells[c.spell] || 0;
        // Le niveau qu'on aura si on choisit ce sort
        // => ex: si on a déjà niv. 1, on affiche "Niv. 2"
        let displayedLevel = (currentLvl >= 5) 
            ? 5 // ou "5 (MAX)" si vous préférez
            : (currentLvl + 1);

        // ex: "Bombe à eau (Niv. 2)"
        let displayName = c.name + " (Niv. " + displayedLevel + ")";

        ctx.fillStyle = "#fff";
        ctx.font = "16px Roboto";
        let textX = x + imgSize + 15;
        let textY = y + choiceHeight / 2 + 5;
        ctx.fillText(displayName, textX, textY);

        // On stocke la zone cliquable
        levelUpChoicesRects.push({
            x: x,
            y: y,
            w: choiceWidth,
            h: choiceHeight,
            spell: c.spell,
            name: c.name
        });
    }

    ctx.restore();
}

function drawGameOverMenu() {
    ctx.save();

    // 1) Fond amelio
    ctx.globalAlpha = 0.9;
    let menuWidth = 400;
    let menuHeight = 200;
    let menuX = (W - menuWidth)/2;
    let menuY = (H - menuHeight)/2;
    ctx.drawImage(fondAmelioImg, menuX, menuY, menuWidth, menuHeight);
    ctx.globalAlpha = 1;

    // 2) Titre "Partie Terminée"
    ctx.fillStyle = '#fff';
    ctx.font = "24px Roboto";
    let txt = "Partie Terminée";
    let tw = ctx.measureText(txt).width;
    ctx.fillText(txt, (W - tw)/2, menuY + 40);

    // 3) On affiche le temps, kills, etc. ou tout autre info
    // ... exemple ...
    let survivalTime = (this.lastTime - startTime)/1000;
    survivalTime = Math.floor(survivalTime);
    let minutes = Math.floor(survivalTime/60);
    let seconds = survivalTime % 60;
    let timeText = "Temps survécu: " + minutes + "m " + seconds + "s";
    let killText = "Ennemis tués: " + killCount;

    ctx.fillText(timeText, (W - ctx.measureText(timeText).width)/2, menuY + 80);
    ctx.fillText(killText, (W - ctx.measureText(killText).width)/2, menuY + 110);

    // 4) Bouton Rejouer
    // On suppose que gameOverRect est global ou local
    // let gameOverRect = {x: W/2 -75, y: H/2+35, width:150, height:40};

    // Dessin du bouton
    ctx.drawImage(boutonImg,
                  gameOverRect.x,
                  gameOverRect.y,
                  gameOverRect.width,
                  gameOverRect.height);

    // Survol : tracer un contour
    if (mousePos.x >= gameOverRect.x &&
        mousePos.x <= gameOverRect.x + gameOverRect.width &&
        mousePos.y >= gameOverRect.y &&
        mousePos.y <= gameOverRect.y + gameOverRect.height) {
      
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(gameOverRect.x,
                       gameOverRect.y,
                       gameOverRect.width,
                       gameOverRect.height);
    }

    // Texte "Rejouer"
    ctx.fillStyle = '#fff';
    ctx.font = "18px Roboto";
    let txt2 = "Rejouer";
    let tw2 = ctx.measureText(txt2).width;
    ctx.fillText(txt2,
                 gameOverRect.x + (gameOverRect.width - tw2)/2,
                 gameOverRect.y + gameOverRect.height/2 + 6);

    ctx.restore();
}

function draw() {
    ctx.clearRect(0,0,W,H);
    if (inIntroMessage) {
      drawIntroMessage();
      return;
    }
    // joueur
    ctx.save();
    ctx.translate(player.x,player.y);
    let currentImg = playerFrames[playerFrameIndex];
    ctx.drawImage(currentImg, -16, -16, 32, 32);
    ctx.restore();
    for (let b of bloodStains) {
        ctx.drawImage(sangImg, b.x - 8, b.y - 8, 20, 20);
    }
    // ennemis
    for (let e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'boss') {
        // Boss plus grand
        ctx.drawImage(e.img, -40, -40, 80, 80);
      } else {
        // Ennemi normal
        ctx.drawImage(e.img, -16, -16, 32, 32);
      }

      ctx.restore();
    }

    if(player.spells.livreErmite>0) {
        for(let hb of hermitBooks){
            let bx = player.x + Math.cos(hb.angle)*hb.radius;
            let by = player.y + Math.sin(hb.angle)*hb.radius;
            ctx.save();
            ctx.translate(bx,by);
            ctx.drawImage(livreImg,-8,-8,16,16);
            ctx.restore();
        }
    }

for (let p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);

  if (p.type==='cle') {
    ctx.rotate(p.rotation);
    ctx.drawImage(p.img, -16, -16, 16, 16);
  } else {
      let imgToDraw = p.img || pileImg;
      ctx.drawImage(imgToDraw, -8, -8, 16, 16);
    }

    ctx.restore();
}

    for(let a of aoes) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(a.x,a.y,a.radius,0,Math.PI*2);
        ctx.fillStyle='rgba(0,0,255,0.3)';
        ctx.fill();
        ctx.restore();
    }

    // dessins bichon
    for (let b of bichons) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.drawImage(b.img, -16, -16, 16, 16);
      ctx.restore();
    }


    // Dessin des ruines
    for (let r of ruines) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.drawImage(r.img, -16, -16, 70, 70);
      ctx.restore();
    }

    // Armageddon (zone)
if (player.spells.armageddon > 0) {
    ctx.save();
    let level = player.spells.armageddon;
    let baseRadius = 50; 
    let radius = baseRadius;

    // Ajuster le rayon selon le niveau
    switch (level) {
        case 1:
            radius = 50;
            break;
        case 2:
            radius = 60;
            break;
        case 3:
            radius = 70;
            break;
        case 4:
            radius = 100;
            break;
        case 5:
            radius = 130;
            break;
    }

    // Dessiner le cercle Armageddon
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}
    let now = performance.now();
    for (let e of enemies) {
     let recentlyHit = (now - e.lastHitTime < HIT_FLASH_DURATION);

     ctx.save();
     ctx.translate(e.x,e.y);

     if (recentlyHit) {
         // L'ennemi a été touché récemment, on va le faire clignoter.
         // Par exemple, on peut changer son alpha (transparence) ou son mode de composition
         ctx.globalAlpha = 0.5; // Le rendre plus transparent ou
         ctx.globalCompositeOperation = 'lighter'; // ajouter un effet de surbrillance
         // Vous pouvez aussi dessiner un rectangle coloré derrière l'image pour mieux le signaler
     }

     ctx.drawImage(e.img,-16,-16,32,32);

     ctx.restore();
}


    drawUI();
    if(inStartMenu) {
        drawStartMenu();
    }

    if(inLevelUpMenu) {
        drawLevelUpMenu();
    }

    if(inGameOverMenu) {
        drawGameOverMenu();
    }

    drawTooltip();
    drawCoupeCoupeSlash();
}

function drawCoupeCoupeSlash() {
    if (!coupeCoupeSlash) return;
    let now = performance.now();
    let elapsed = now - coupeCoupeSlash.start;
    if (elapsed > 200) {
        coupeCoupeSlash = null;
        return;
    }

    let baseAngle = coupeCoupeSlash.baseAngle;
    let length = coupeCoupeSlash.length;

    ctx.save();
    ctx.translate(player.x, player.y);

    // Manche marron (optionnel)
    ctx.strokeStyle='brown';
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(baseAngle)*(-5), Math.sin(baseAngle)*(-5));
    ctx.stroke();

    // Lame blanche
    ctx.strokeStyle='white';
    ctx.lineWidth=4; 
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(baseAngle)*length, Math.sin(baseAngle)*length);
    ctx.stroke();

    ctx.restore();
}

function drawUI() {
    let hpRatio=player.hp/player.maxHp;
    let xpRatio=player.xp/player.xpForNextLevel;

    let hpWidth=200;let hpHeight=20;
    ctx.fillStyle='#555';
    ctx.fillRect(10,10,hpWidth,hpHeight);
    ctx.fillStyle='#e00';
    ctx.fillRect(10,10,hpWidth*hpRatio,hpHeight);
    ctx.strokeStyle='#aaa';
    ctx.strokeRect(10,10,hpWidth,hpHeight);
    ctx.fillStyle='#fff';
    ctx.font="14px Roboto";
    ctx.fillText("Vie",10+hpWidth-30,10+hpHeight-5);

    let xpWidth=200; let xpHeight=20;
    ctx.fillStyle='#555';
    ctx.fillRect(W-10 - xpWidth,10,xpWidth,xpHeight);
    ctx.fillStyle='#0f0';
    ctx.fillRect(W-10 - xpWidth,10,xpWidth*xpRatio,xpHeight);
    ctx.strokeStyle='#aaa';
    ctx.strokeRect(W-10 - xpWidth,10,xpWidth,xpHeight);
    ctx.fillStyle='#fff';
    ctx.fillText("Exp",W-10 - xpWidth + xpWidth -30,10+xpHeight-5);

    ctx.font="20px Roboto";
    let lvlTxt="Niv: "+player.level;
    let mt=ctx.measureText(lvlTxt).width;
    ctx.fillText(lvlTxt,(W-mt)/2,30);

    // Affichage du killCount en bas à droite
    let killText = "Ennemis tués: "+killCount;
    let ktw=ctx.measureText(killText).width;
    ctx.fillStyle='#fff';
    ctx.font='16px Roboto';
    ctx.fillText(killText, W-ktw-10, H-10);

    let unlockedSpells=Object.keys(player.spells).filter(sp=>player.spells[sp]>0);
    let slotSize=32;
    let startX=10;
    let startY=H-slotSize-10;
    let offsetX=5;
    for(let i=0;i<unlockedSpells.length;i++) {
        let sp=unlockedSpells[i];
        let imgSlot=getSpellSlotImage(sp);
        ctx.drawImage(imgSlot,startX+i*(slotSize+offsetX),startY,slotSize,slotSize);
    }
}

function drawTooltip() {
    if(!hoveredChoice || !hoveredChoice.spell) return;
    let sp = hoveredChoice.spell;
    if(!spellDescriptions[sp]) return;

    let txt = spellDescriptions[sp];
    ctx.save();
    ctx.font="14px Roboto";
    ctx.shadowColor="#000";
    ctx.shadowBlur=2;
    let tw = ctx.measureText(txt).width;

    let tx = mousePos.x + 15;
    let ty = mousePos.y + 15;
    let padding = 5;
    let bgWidth = tw + padding*2;
    let bgHeight = 24; 

    if(tx+bgWidth > W) tx = W - bgWidth - 10;
    if(ty+bgHeight > H) ty = H - bgHeight - 10;

    ctx.fillStyle="rgba(0,0,0,0.8)";
    ctx.fillRect(tx,ty,bgWidth,bgHeight);
    ctx.strokeStyle="#fff";
    ctx.lineWidth=1;
    ctx.strokeRect(tx,ty,bgWidth,bgHeight);

    ctx.fillStyle="#fff";
    ctx.fillText(txt, tx+padding, ty+bgHeight - 8);

    ctx.restore();
}

function randChoice(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

function generateLevelUpChoices() {
    // 1) Filtrer les sorts actifs/passifs qui ne sont pas encore au niveau 5
    let notMaxActives = activeSpells.filter(sp => player.spells[sp] < 5);
    let notMaxPassives = passiveSpells.filter(sp => player.spells[sp] < 5);

    // 2) Vérifier les sorts déjà possédés
    let ownedActives = notMaxActives.filter(sp => player.spells[sp] > 0);
    let ownedPassives = notMaxPassives.filter(sp => player.spells[sp] > 0);

    // maxActive et maxPassive décrivent la limite de sorts actifs/passifs *possédés*
    let maxActive=2;
    let maxPassive=3;

    // === Choisir l'actif ===
    // S’il a déjà 2 actifs possédés (et pas au niveau 5),
    // on pioche parmi ceux qu'il possède (pour l'augmenter).
    // Sinon on pioche parmi tous les sorts actifs non-max.
    let chosenActive;
    if (ownedActives.length >= maxActive) {
        if (ownedActives.length > 0) {
            chosenActive = randChoice(ownedActives);
        } else {
            chosenActive = null; // Plus aucun actif possible
        }
    } else {
        if (notMaxActives.length > 0) {
            chosenActive = randChoice(notMaxActives);
        } else {
            chosenActive = null; // aucun actif non-max
        }
    }

    // === Choisir 2 passifs ===
    let chosenPassives=[];
    if (ownedPassives.length >= maxPassive) {
        // on pioche 2 dans ceux qu’il possède et pas max
        if (ownedPassives.length > 0) {
            let pool = ownedPassives.slice();
            let p1 = randChoice(pool);
            chosenPassives.push(p1);
            pool = pool.filter(sp=>sp!==p1);
            if (pool.length>0) {
                let p2=randChoice(pool);
                chosenPassives.push(p2);
            }
        }
    } else {
        // on pioche 2 dans tous les passifs non-max
        if (notMaxPassives.length > 0) {
            let p1 = randChoice(notMaxPassives);
            chosenPassives.push(p1);
            let pool = notMaxPassives.filter(sp => sp !== p1);
            if (pool.length > 0) {
                let p2 = randChoice(pool);
                chosenPassives.push(p2);
            }
        }
    }

    // 3) Construire le tableau final
    let finalChoices = [];
    if (chosenActive) {
        finalChoices.push({ spell: chosenActive, name: getSpellName(chosenActive) });
    }

    for (let sp of chosenPassives) {
        finalChoices.push({ spell: sp, name: getSpellName(sp) });
    }

    return finalChoices;
}

function getClosestEnemy(px, py) {
  let target = null;
  let minDist = Infinity;

  // Parcourt tous les ennemis
  for (let e of enemies) {
    if (e.hp > 0) { // Uniquement ceux qui sont encore en vie
      let d = distance(px, py, e.x, e.y);
      if (d < minDist) {
        minDist = d;
        target = e;
      }
    }
  }
  return target;  // null si aucun ennemi en vie, ou l'ennemi le plus proche
}

function findAnotherEnemy(ignoredEnemy) {
  // par ex. n’importe quel ennemi vivant :
  for (let e of enemies) {
    if (e !== ignoredEnemy && e.hp>0) {
      return e; // On renvoie le premier trouvé
    }
  }
  return null;
}

function drawIntroMessage() {
  ctx.save();

  // Dimensions de la "bulle"
  let bubbleWidth = 650;
  let bubbleHeight = 300;
  introRect.width = bubbleWidth;
  introRect.height = bubbleHeight;
  introRect.x = (W - bubbleWidth) / 2;
  introRect.y = (H - bubbleHeight) / 2 - 40;

  // 1) Dessin du fondAmelioImg à la place du rectangle
  ctx.drawImage(
    fondAmelioImg,
    introRect.x,
    introRect.y,
    introRect.width,
    introRect.height
  );

  // 2) Texte en blanc
  ctx.fillStyle = "#fff";
  ctx.font = "16px Roboto";

  // Petit offset à l'intérieur de la bulle
  let lines = introText.split("\n");
  let lineHeight = 20;
  let textX = introRect.x + 20;
  let textY = introRect.y + 40;

  for (let line of lines) {
    ctx.fillText(line, textX, textY);
    textY += lineHeight;
  }

  // 3) Bouton "Jouer" avec l'image boutonImg
  playButtonRect.width = 150;
  playButtonRect.height = 40;
  playButtonRect.x = introRect.x + (introRect.width - playButtonRect.width) / 2;
  playButtonRect.y = introRect.y + introRect.height - 60; // un peu plus bas que la fin du texte

  // Dessin du bouton (image)
  ctx.drawImage(
    boutonImg,
    playButtonRect.x,
    playButtonRect.y,
    playButtonRect.width,
    playButtonRect.height
  );

  // Survol => contour blanc
  if (
    mousePos.x >= playButtonRect.x &&
    mousePos.x <= playButtonRect.x + playButtonRect.width &&
    mousePos.y >= playButtonRect.y &&
    mousePos.y <= playButtonRect.y + playButtonRect.height
  ) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      playButtonRect.x,
      playButtonRect.y,
      playButtonRect.width,
      playButtonRect.height
    );
  }

  // 4) Texte "Jouer" en blanc, centré dans le bouton
  ctx.fillStyle = "#fff";
  ctx.font = "18px Roboto";
  let txt = "Jouer";
  let tw = ctx.measureText(txt).width;
  ctx.fillText(
    txt,
    playButtonRect.x + (playButtonRect.width - tw) / 2,
    playButtonRect.y + 26
  );

  ctx.restore();
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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

initGame();


