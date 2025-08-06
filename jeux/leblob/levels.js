// Fonction pour initialiser les niveaux
function initLevels(canvas) { 
    // niveau 1 Le D�part 
    levels[0] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [
            // new Platform(600, canvas.height - 150, 150),
        ],
        modularPlatforms: [
            new ModularPlatform(600, canvas.height - 150, 200),
        ],
        walls: [],
        stars: [new Star(675, canvas.height - 300)],
        enemies: [],
        spikes: [],
        springs: [],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 2 Encore plus de flocons d'avoine !!
    levels[1] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [],
        modularPlatforms: [
            new ModularPlatform(150, canvas.height - 150, 100),
            new ModularPlatform(400, canvas.height - 250, 100),
            new ModularPlatform(650, canvas.height - 350, 100),
        ],
        walls: [],
        stars: [
            new Star(450, canvas.height - 300),
            new Star(700, canvas.height - 400),
        ],
        enemies: [],
        spikes: [],
        springs: [],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 3 Premiers ennemis
    levels[2] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [],
        modularPlatforms: [
            new ModularPlatform(750, canvas.height - 150, 100),
            new ModularPlatform(600, canvas.height - 275, 100),
        ],
        walls: [],
        stars: [
            new Star(600, canvas.height - 450),
            new Star(950, canvas.height - 60),
        ],
        enemies: [new Enemy(300, canvas.height - 56)],
        spikes: [
            new Spike(450, canvas.height - 180, 'air'),
				],
        springs: [],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 4 Ca bouge tout seul ?
    levels[3] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [
            new Platform(250, canvas.height - 250, 120, 'moving'),
        ],
        modularPlatforms: [
            new ModularPlatform(0, canvas.height - 500, 100),
            new ModularPlatform(900, canvas.height - 150, 100),
            new ModularPlatform(200, canvas.height - 375, 100),
        ],
        walls: [],
        stars: [
            new Star(50, canvas.height - 550),
            new Star(950, canvas.height - 200),
        ],
    enemies: [
        new Enemy(500, canvas.height - 430, 'volatile')
    ],
        spikes: [new Spike(250, canvas.height - 70, 'ground')],
        springs: [],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 5 Premier challenge
    levels[4] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [
            new Platform(200, canvas.height - 150, 120, 'moving'),
        ],
        modularPlatforms: [
            new ModularPlatform(0, canvas.height - 250, 100),
            new ModularPlatform(200, canvas.height - 350, 500),
        ],
        walls: [],
        stars: [
            new Star(400, canvas.height - 50),
            new Star(700, canvas.height - 400),
        ],
        enemies: [new Enemy(300, canvas.height - 60)],
        spikes: [
            new Spike(200, canvas.height - 70, 'ground'),
            new Spike(300, canvas.height - 400, 'ground'),
            new Spike(900, canvas.height - 70, 'ground'),
        ],
        springs: [],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 6 Le challenge de Pics !
    levels[5] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [],
        modularPlatforms: [
            new ModularPlatform(0, canvas.height - 250, 800),
            new ModularPlatform(800, canvas.height - 150, 120),
            new ModularPlatform(100, canvas.height - 390, 120),
            new ModularPlatform(200, canvas.height - 480, 800),
        ],
        walls: [
            //new Wall(780, canvas.height - 230, 20, 100),
            //new Wall(200, canvas.height - 480, 20, 150),
        ],
        stars: [ 
            new Star(870, canvas.height - 50),
            new Star(100, canvas.height - 300),
            new Star(900, canvas.height - 550),
            new Star(170, canvas.height - 180), 
        ],
        enemies: [],
        spikes: [
            new Spike(250, canvas.height - 70, 'ground'),
            new Spike(420, canvas.height - 70, 'ground'),
            new Spike(590, canvas.height - 70, 'ground'),
            new Spike(700, canvas.height - 300, 'ground'),
            new Spike(530, canvas.height - 300, 'ground'),
            new Spike(360, canvas.height - 300, 'ground'),
            new Spike(250, canvas.height - 530, 'ground'),
            new Spike(420, canvas.height - 530, 'ground'),
            new Spike(590, canvas.height - 530, 'ground'),
        ],
        springs: [],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 7 Disparition Inopin�e
    levels[6] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [
            new Platform(450, canvas.height - 250, 120, 'disappearing'),
        ],
        modularPlatforms: [
            new ModularPlatform(200, canvas.height - 150, 150),
            new ModularPlatform(700, canvas.height - 250, 150),
            new ModularPlatform(900, canvas.height - 350, 100),
        ],
        walls: [],
        stars: [
            new Star(300, canvas.height - 230),
            new Star(900, canvas.height - 400),
        ],
        enemies: [new Enemy(300, canvas.height - 60)],
        spikes: [],
        springs: [
            new Spring(650, canvas.height - 40),
        ],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 8 Fait un bond, Blob. James Blob.
    levels[7] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [],
        modularPlatforms: [
            new ModularPlatform(450, canvas.height - 345, 150),
            new ModularPlatform(850, canvas.height - 345, 150),
            new ModularPlatform(10, canvas.height - 480, 150),
            new ModularPlatform(195, canvas.height - 280, 50),
        ],
        walls: [],
        stars: [
            new Star(515, canvas.height - 450),
            new Star(925, canvas.height - 450),
            new Star(75, canvas.height - 520),
        ],
        enemies: [
            new Enemy(200, canvas.height - 405, 'volatile')
        ],
        spikes: [
            new Spike(600, canvas.height - 70, 'ground'),
        ],
        springs: [
            new Spring(400, canvas.height - 40),
            new Spring(800, canvas.height - 40),
            new Spring(200, canvas.height - 300),
        ],
        teleporters: [],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };    
    // niveau 9 J��tais l�, maintenant je suis l�-bas
    levels[8] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [],
        modularPlatforms: [
            new ModularPlatform(10, canvas.height - 345, 980),
            new ModularPlatform(450, canvas.height - 150, 75),
        ],
        walls: [],
        stars: [
            new Star(470, canvas.height - 190),
            new Star(925, canvas.height - 380),
            new Star(450, canvas.height - 380),
        ],
        enemies: [
            new Enemy(200, canvas.height - 385, 'basic')
        ],
        spikes: [],
        springs: [],
        teleporters: [
            new Teleporter(750, canvas.height - 80, "A"),
            new Teleporter(100, canvas.height - 410, "A")
        ],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };
    // niveau 10
    levels[9] = {
        grounds: [new Ground(0, canvas.height - 20, levelWidth, 20, 'bottom')], 
        platforms: [
            new Platform(400, canvas.height - 270, 100, 'moving'),
        ],
        modularPlatforms: [
            new ModularPlatform(170, canvas.height - 420, 600),
            new ModularPlatform(110, canvas.height - 300, 70),
            new ModularPlatform(790, canvas.height - 150, 211),
            new ModularPlatform(215, canvas.height - 300, 150),
        ],
        walls: [
            new Wall(188, canvas.height - 400, 25, 380),
            new Wall(800, canvas.height - 130, 25, 110),
        ],
        stars: [
            new Star(215, canvas.height - 60),
            new Star(230, canvas.height - 460),
            new Star(970, canvas.height - 50),
        ],
        enemies: [new Enemy(300, canvas.height - 56)],
        spikes: [
				  new Spike(300, canvas.height - 469, 'ground'),
      	  new Spike(350, canvas.height - 69, 'ground'),
				],
        springs: [
           new Spring(0, canvas.height - 38),
           new Spring(125, canvas.height - 320),
        ],
        teleporters: [
            new Teleporter(215, canvas.height - 360, "B"), 
            new Teleporter(830, canvas.height - 80, "B") 
        ],
        gravityInverted: false,
        enableDoubleJump: false, 
        lifeUps: [], 
    };

    // niveau 11
    levels[10] = {
        grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
        platforms: [
            new Platform(100, canvas.height - 100, 100, 'disappearing'),
            new Platform(300, canvas.height - 200, 100, 'disappearing'),
            new Platform(500, canvas.height - 300, 100, 'disappearing'),
            new Platform(700, canvas.height - 400, 100, 'disappearing'),
        ],
        modularPlatforms: [
            new ModularPlatform(0, canvas.height - 450, 150),
            new ModularPlatform(canvas.width - 80, canvas.height - 450, 80),
        ],
        walls: [
            new Wall(250, canvas.height - 180, 20, 160),
            new Wall(650, canvas.height - 380, 20, 130),
        ],
        stars: [
            new Star(330, canvas.height - 600),
            new Star(350, canvas.height - 230),
            new Star(550, canvas.height - 330),
            new Star(750, canvas.height - 430),
        ],
        enemies: [
            new Enemy(400, canvas.height - 56, 'basic'),
            new Enemy(600, canvas.height - 250, 'volatile')
        ],
        spikes: [
            new Spike(200, canvas.height - 70, 'ground'),
            new Spike(800, canvas.height - 70, 'ground'),
        ],
        springs: [
            new Spring(50, canvas.height - 40),
        ],
        teleporters: [
            new Teleporter(10, canvas.height - 510, "C"),
            new Teleporter(canvas.width - 90, canvas.height - 80, "C"),
        ],
        gravityInverted: false,
        enableDoubleJump: false,
        lifeUps: [], 
    };

    // niveau 12 C'est invers� ?
    levels[11] = {
        grounds: [
            new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom'),
            new Ground(0, 0, canvas.width, 20, 'top')
        ],
        platforms: [],
        modularPlatforms: [
            new ModularPlatform(450, canvas.height - 450, 100), 
            new ModularPlatform(450, canvas.height - 310, 100), 				
				],
        walls: [],
        stars: [
            new Star(490, canvas.height - 550),
            new Star(490, canvas.height - 350),
            new Star(490, canvas.height - 200),
        ],
        enemies: [],
        spikes: [],
        springs: [],
        teleporters: [],
        gravityInverted: true,
        enableDoubleJump: false,
        lifeUps: [], 
    };
		
		    // niveau 13 Ca se corse !
    levels[12] = {
        grounds: [
            new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom'),
        ],
        platforms: [
            new Platform(100, canvas.height - 150, 120, 'moving'),
            new Platform(400, canvas.height - 280, 150, 'moving'),
            new Platform(700, canvas.height - 150, 120, 'moving'),
            new Platform(150, canvas.height - 400, 100, 'sticky'),
            new Platform(750, canvas.height - 400, 100, 'sticky'),
        ],
        modularPlatforms: [
            new ModularPlatform(0, canvas.height - 450, 100),
            new ModularPlatform(canvas.width - 100, canvas.height - 450, 100),
        ],
        walls: [
            new Wall(50, canvas.height - 400, 20, 300),
            new Wall(canvas.width - 70, canvas.height - 400, 20, 300),
        ],
        stars: [
            new Star(200, canvas.height - 180),
            new Star(500, canvas.height - 310),
            new Star(800, canvas.height - 180),
            new Star(canvas.width / 2, canvas.height - 420),
        ],
        enemies: [
            new Enemy(300, canvas.height - 350, 'volatile'),
            new Enemy(700, canvas.height - 350, 'volatile'),
            new Enemy(250, canvas.height - 60, 'basic'),
        ],
        spikes: [
            new Spike(350, canvas.height - 70, 'ground'),
            new Spike(600, canvas.height - 70, 'ground'),
            new Spike(450, canvas.height - 430, 'air'),
        ],
        springs: [
            new Spring(canvas.width / 2 - 20, canvas.height - 40),
        ],
        teleporters: [],
        gravityInverted: false, 
        enableDoubleJump: false,
        lifeUps: [], 
    };

// niveau 14 C'est tout gluand..
levels[13] = {
    grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
    platforms: [
        new Platform(100, canvas.height - 150, 250, 'sticky'), 
        new Platform(490, canvas.height - 350, 100, 'sticky'), 
        new Platform(590, canvas.height - 410, 100, 'sticky'), 
        new Platform(690, canvas.height - 460, 100, 'sticky'), 
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 300, 100),
        new ModularPlatform(750, canvas.height - 250, 150),
        new ModularPlatform(880, canvas.height - 400, 100),
    ],
    walls: [
        new Wall(350, canvas.height - 190, 20, 100),
    ],
    stars: [
        new Star(75, canvas.height - 330),
        new Star(450, canvas.height - 280),
        new Star(550, canvas.height - 380),
        new Star(920, canvas.height - 430),
    ],
    enemies: [
        new Enemy(200, canvas.height - 56, 'basic'),
        new Enemy(800, canvas.height - 300, 'volatile'),
    ],
    spikes: [
        new Spike(700, canvas.height - 70, 'ground'),
        new Spike(510, canvas.height - 510, 'air'),
    ],
    springs: [],
    teleporters: [],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [],
    enableHorizontalScrolling: false,
    levelWidth: canvas.width,
};
		
// niveau 15 Amusons-nous !
levels[14] = {
    grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
    platforms: [
        new Platform(100, canvas.height - 430, 120, 'moving'),
			  new Platform(600, canvas.height - 410, 120, 'disappearing'),		
		],
    modularPlatforms: [
        new ModularPlatform(250, canvas.height - 330, 150),
        new ModularPlatform(150, canvas.height - 100, 100),
				new ModularPlatform(400, canvas.height - 200, 120),
				new ModularPlatform(750, canvas.height - 150, 100),
    ],
    walls: [
		    new Wall(380, canvas.height - 310, 20, 110),
		],
    stars: [
        new Star(200, canvas.height - 130),
        new Star(950, canvas.height - 550),
        new Star(300, canvas.height - 370),
        new Star(750, canvas.height - 180),
    ],
    enemies: [
        new Enemy(500, canvas.height - 60, 'basic'),
    ],
    spikes: [
        new Spike(900, canvas.height - 68, 'ground'),
        new Spike(80, canvas.height - 510, 'air'), 
    ],
    springs: [
		    new Spring(10, canvas.height - 38, 'ground'),
		],
    teleporters: [],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [],
    enableHorizontalScrolling: false,
    levelWidth: canvas.width,
};
		
// niveau 16 Enfin un niveau plus grand
levels[15] = {
    grounds: [
        new Ground(0, canvas.height - 20, 2000, 20, 'bottom'),
    ],
    platforms: [
        new Platform(200, canvas.height - 100, 150, 'moving'),
        new Platform(500, canvas.height - 200, 100, 'sticky'),
        new Platform(800, canvas.height - 100, 150, 'disappearing'),
        new Platform(1100, canvas.height - 250, 100, 'bouncy'),
        new Platform(1400, canvas.height - 150, 120, 'temporary'),
			  new Platform(1650, canvas.height - 350, 50, 'sticky'), 
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 300, 100),
        new ModularPlatform(950, canvas.height - 350, 150),
        new ModularPlatform(1710, canvas.height - 400, 200),
    ],
    walls: [
        new Wall(400, canvas.height - 150, 20, 100),
        new Wall(1300, canvas.height - 300, 20, 200),
    ],
    stars: [
        new Star(275, canvas.height - 140),
        new Star(550, canvas.height - 230),
        new Star(990, canvas.height - 380),
        new Star(1500, canvas.height - 180),
        new Star(1800, canvas.height - 430),
    ],
    enemies: [
        new Enemy(300, canvas.height - 60, 'basic'),
        new Enemy(700, canvas.height - 260, 'volatile'),
        new Enemy(1200, canvas.height - 60, 'basic'),
    ],
    spikes: [
        new Spike(250, canvas.height - 68, 'ground'),
        new Spike(750, canvas.height - 68, 'ground'),
        new Spike(1050, canvas.height - 68, 'ground'),
        new Spike(1250, canvas.height - 480, 'air'),
    ],
    springs: [
        new Spring(1000, canvas.height - 40),
        new Spring(1600, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(10, canvas.height - 80, "F"),
        new Teleporter(1900, canvas.height - 80, "F"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(1350, canvas.height - 350),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 2000,
};

		
// niveau 17 Y'a pas de sole c'est normal ?
levels[16] = {
    grounds: [],
    platforms: [
			  new Platform(280, canvas.height - 360, 50, 'sticky'),
    	  new Platform(280, canvas.height - 360, 50, 'sticky'),
        new Platform(640, canvas.height - 50, 50, 'bouncy'),
        new Platform(790, canvas.height - 250, 50, 'bouncy'),
        new Platform(1500, canvas.height - 170, 50, 'bouncy'),
		],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 20, 150),
				new ModularPlatform(300, canvas.height - 150, 100),
   			new ModularPlatform(1000, canvas.height - 450, 100),
				new ModularPlatform(1100, canvas.height - 30, 100),
				new ModularPlatform(1250, canvas.height - 30, 100),				
        new ModularPlatform(180, canvas.height - 390, 80),
				new ModularPlatform(1780, canvas.height - 400, 100),
        new ModularPlatform(1880, canvas.height - 30, 100),
    ],
    walls: [
        new Wall(450, canvas.height - 250, 20, 150),
        new Wall(1200, canvas.height - 400, 20, 200),
    ],
    stars: [
        new Star(100, canvas.height - 400),
        new Star(1910, canvas.height - 70),
        new Star(800, canvas.height - 480),
        new Star(1040, canvas.height - 530),
        new Star(1900, canvas.height - 530),
    ],
    enemies: [
        new Enemy(350, canvas.height - 240, 'volatile'),
        new Enemy(800, canvas.height - 140, 'basic'),
        new Enemy(1400, canvas.height - 140, 'basic'),
        new Enemy(1750, canvas.height - 340, 'volatile'),
    ],
    spikes: [
        new Spike(550, canvas.height - 340, 'air'),
        new Spike(1250, canvas.height - 240, 'air'),
    ],
    springs: [],
    teleporters: [],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [],
    enableHorizontalScrolling: true,
    levelWidth: 2000,
};
		
// niveau 18 Ca se corse en invers�
levels[17] = {
    grounds: [new Ground(0, 0, canvas.width, 20, 'top')],
    platforms: [
        new Platform(800, 150, 120, 'moving'), 
        new Platform(1000, 80, 150, 'static'), 
			  new Platform(920, canvas.height - 90, 70, 'sticky'), 
    ],
    modularPlatforms: [
		    new ModularPlatform(50, 80, 200),
				new ModularPlatform(300, 150, 150),
				new ModularPlatform(550, 220, 180),
        new ModularPlatform(150, 300, 100),
        new ModularPlatform(700, 350, 150),
    ],
    walls: [
        new Wall(480, 0, 20, 80),
    ],
    stars: [
        new Star(200, canvas.height - 150),
        new Star(350, canvas.height - 380),
        new Star(620, canvas.height - 355),
        new Star(950, canvas.height - 570),
        new Star(950, canvas.height - 50),				
    ],
    enemies: [
        new Enemy(400, 30, 'volatile'),
    ],
    spikes: [
        new Spike(600, 30, 'air'), 
    ],
    springs: [],
    teleporters: [],
    gravityInverted: true,
    enableDoubleJump: false,
    lifeUps: [],
    enableHorizontalScrolling: false,
    levelWidth: canvas.width, 
    playerStartX: 50 + (200 / 2) - (60 / 2), 
    playerStartY: 80 - 60 - 1 
};
		
// niveau 19
levels[18] = {
    grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
    platforms: [
        new Platform(250, canvas.height - 150, 100, 'moving'),
        new Platform(500, canvas.height - 250, 100, 'moving'),
        new Platform(750, canvas.height - 150, 100, 'moving'),
        new Platform(400, canvas.height - 350, 80, 'sticky'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
        new ModularPlatform(900, canvas.height - 250, 120),
        new ModularPlatform(100, canvas.height - 450, 100),
    ],
    walls: [
        new Wall(450, canvas.height - 200, 20, 100),
    ],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(550, canvas.height - 280),
        new Star(800, canvas.height - 180),
        new Star(170, canvas.height - 480),
        new Star(950, canvas.height - 280),
    ],
    enemies: [
        new Enemy(300, canvas.height - 56, 'basic'),
        new Enemy(600, canvas.height - 280, 'volatile'),
    ],
    spikes: [
        new Spike(375, canvas.height - 180, 'air'),
        new Spike(625, canvas.height - 280, 'air'),
        new Spike(700, canvas.height - 70, 'ground'),
    ],
    springs: [
        new Spring(200, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(100, canvas.height - 510, "D"),
        new Teleporter(canvas.width - 90, canvas.height - 80, "D"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(450, canvas.height - 400),
    ],
    enableHorizontalScrolling: false,
    levelWidth: canvas.width,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 20
levels[19] = {
    grounds: [new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom')],
    platforms: [
        new Platform(200, canvas.height - 150, 100, 'temporary'),
        new Platform(450, canvas.height - 250, 120, 'moving'),
        new Platform(700, canvas.height - 350, 80, 'sticky'),
        new Platform(100, canvas.height - 450, 100, 'bouncy'),
        new Platform(600, canvas.height - 500, 100, 'temporary'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 100, 150),
        new ModularPlatform(canvas.width - 200, canvas.height - 100, 150),
        new ModularPlatform(300, canvas.height - 400, 80),
        new ModularPlatform(canvas.width - 150, canvas.height - 550, 100),
    ],
    walls: [
        new Wall(350, canvas.height - 300, 20, 100),
    ],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(250, canvas.height - 180),
        new Star(500, canvas.height - 280),
        new Star(730, canvas.height - 380),
        new Star(150, canvas.height - 480),
        new Star(650, canvas.height - 530),
        new Star(canvas.width - 100, canvas.height - 580),
    ],
    enemies: [
        new Enemy(300, canvas.height - 300, 'volatile'),
        new Enemy(500, canvas.height - 470, 'volatile'),
    ],
    spikes: [
        new Spike(280, canvas.height - 200, 'air'),
        new Spike(550, canvas.height - 300, 'air'),
        new Spike(780, canvas.height - 400, 'air'),
        new Spike(canvas.width - 250, canvas.height - 70, 'ground'),
    ],
    springs: [
        new Spring(canvas.width / 2 - 20, canvas.height - 40),
    ],
    teleporters: [],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(400, canvas.height - 50),
    ],
    enableHorizontalScrolling: false,
    levelWidth: canvas.width,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};

// niveau 21
levels[20] = {
    grounds: [],
    platforms: [
        new Platform(300, canvas.height - 150, 100, 'bouncy'),
        new Platform(600, canvas.height - 300, 120, 'bouncy'),
        new Platform(950, canvas.height - 100, 100, 'bouncy'),
        new Platform(1300, canvas.height - 250, 150, 'bouncy'),
        new Platform(1700, canvas.height - 400, 100, 'bouncy'),
        new Platform(2100, canvas.height - 150, 120, 'bouncy'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
        new ModularPlatform(2300, canvas.height - 80, 150),
    ],
    walls: [],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(350, canvas.height - 180),
        new Star(650, canvas.height - 330),
        new Star(1000, canvas.height - 130),
        new Star(1400, canvas.height - 280),
        new Star(1750, canvas.height - 430),
        new Star(2150, canvas.height - 180),
        new Star(2370, canvas.height - 110),
    ],
    enemies: [
        new Enemy(450, canvas.height - 200, 'volatile'),
        new Enemy(800, canvas.height - 200, 'volatile'),
        new Enemy(1500, canvas.height - 300, 'volatile'),
        new Enemy(2000, canvas.height - 250, 'volatile'),
    ],
    spikes: [
        new Spike(200, canvas.height - 180, 'air'),
        new Spike(500, canvas.height - 400, 'air'),
        new Spike(850, canvas.height - 200, 'air'),
        new Spike(1200, canvas.height - 350, 'air'),
        new Spike(1600, canvas.height - 500, 'air'),
        new Spike(2000, canvas.height - 250, 'air'),
    ],
    springs: [],
    teleporters: [
        new Teleporter(10, canvas.height - 150, "E"),
        new Teleporter(2400, canvas.height - 150, "E"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(1100, canvas.height - 50),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 2500,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 22
levels[21] = {
    grounds: [new Ground(0, canvas.height - 20, 2500, 20, 'bottom')],
    platforms: [
        new Platform(200, canvas.height - 150, 100, 'moving'),
        new Platform(500, canvas.height - 300, 120, 'disappearing'),
        new Platform(800, canvas.height - 100, 100, 'bouncy'),
        new Platform(1100, canvas.height - 250, 150, 'moving'),
        new Platform(1400, canvas.height - 400, 100, 'disappearing'),
        new Platform(1700, canvas.height - 150, 120, 'bouncy'),
        new Platform(2000, canvas.height - 300, 100, 'moving'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
        new ModularPlatform(2300, canvas.height - 80, 150),
    ],
    walls: [
        new Wall(400, canvas.height - 200, 20, 100),
        new Wall(1300, canvas.height - 350, 20, 200),
    ],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(250, canvas.height - 180),
        new Star(550, canvas.height - 330),
        new Star(850, canvas.height - 130),
        new Star(1175, canvas.height - 280),
        new Star(1450, canvas.height - 430),
        new Star(1750, canvas.height - 180),
        new Star(2050, canvas.height - 330),
        new Star(2370, canvas.height - 110),
    ],
    enemies: [
        new Enemy(350, canvas.height - 200, 'volatile'),
        new Enemy(900, canvas.height - 60, 'basic'),
        new Enemy(1500, canvas.height - 200, 'volatile'),
        new Enemy(2100, canvas.height - 60, 'basic'),
    ],
    spikes: [
        new Spike(450, canvas.height - 70, 'ground'),
        new Spike(700, canvas.height - 350, 'air'),
        new Spike(1000, canvas.height - 70, 'ground'),
        new Spike(1600, canvas.height - 450, 'air'),
    ],
    springs: [
        new Spring(600, canvas.height - 40),
        new Spring(1900, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(10, canvas.height - 80, "F"),
        new Teleporter(2400, canvas.height - 80, "F"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(1200, canvas.height - 50),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 2500,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 23
levels[22] = {
    grounds: [new Ground(0, canvas.height - 20, 2800, 20, 'bottom')],
    platforms: [
        new Platform(250, canvas.height - 150, 120, 'sticky'),
        new Platform(550, canvas.height - 280, 100, 'moving'),
        new Platform(850, canvas.height - 100, 150, 'disappearing'),
        new Platform(1200, canvas.height - 350, 100, 'bouncy'),
        new Platform(1550, canvas.height - 180, 120, 'moving'),
        new Platform(1900, canvas.height - 450, 100, 'sticky'),
        new Platform(2250, canvas.height - 450, 150, 'disappearing'),
        new Platform(2550, canvas.height - 300, 100, 'bouncy'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
        new ModularPlatform(2650, canvas.height - 80, 150),
        new ModularPlatform(1000, canvas.height - 50, 80),
        new ModularPlatform(2000, canvas.height - 100, 100),
    ],
    walls: [
        new Wall(400, canvas.height - 200, 20, 100),
        new Wall(1400, canvas.height - 400, 20, 250),
    ],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(300, canvas.height - 180),
        new Star(600, canvas.height - 310),
        new Star(900, canvas.height - 130),
        new Star(1250, canvas.height - 380),
        new Star(1600, canvas.height - 210),
        new Star(1950, canvas.height - 480),
        new Star(2300, canvas.height - 230),
        new Star(2720, canvas.height - 110),
    ],
    enemies: [
        new Enemy(450, canvas.height - 60, 'basic'),
        new Enemy(700, canvas.height - 350, 'volatile'),
        new Enemy(1300, canvas.height - 60, 'basic'),
        new Enemy(1700, canvas.height - 250, 'volatile'),
        new Enemy(2400, canvas.height - 60, 'basic'),
    ],
    spikes: [
        new Spike(350, canvas.height - 70, 'ground'),
        new Spike(750, canvas.height - 320, 'air'),
        new Spike(1100, canvas.height - 70, 'ground'),
        new Spike(1800, canvas.height - 500, 'air'),
        new Spike(2200, canvas.height - 70, 'ground'),
    ],
    springs: [
        new Spring(500, canvas.height - 40),
        new Spring(1500, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(10, canvas.height - 80, "G"),
        new Teleporter(2700, canvas.height - 80, "G"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(950, canvas.height - 200),
        new LifeUp(2100, canvas.height - 300),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 2800,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 24 a changer
levels[23] = {
    grounds: [new Ground(0, canvas.height - 20, 3000, 20, 'bottom')],
    platforms: [
        new Platform(300, canvas.height - 150, 100, 'moving'),
        new Platform(600, canvas.height - 300, 120, 'disappearing'),
        new Platform(900, canvas.height - 450, 100, 'sticky'),
        new Platform(1200, canvas.height - 200, 150, 'bouncy'),
        new Platform(1500, canvas.height - 380, 100, 'moving'),
        new Platform(1800, canvas.height - 500, 120, 'disappearing'),
        new Platform(2100, canvas.height - 250, 100, 'sticky'),
        new Platform(2400, canvas.height - 400, 150, 'bouncy'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
        new ModularPlatform(2800, canvas.height - 80, 150),
        new ModularPlatform(750, canvas.height - 50, 80),
        new ModularPlatform(1650, canvas.height - 100, 100),
    ],
    walls: [
        new Wall(450, canvas.height - 250, 20, 150),
        new Wall(1350, canvas.height - 450, 20, 250),
        new Wall(2200, canvas.height - 300, 20, 180),
    ],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(350, canvas.height - 180),
        new Star(650, canvas.height - 330),
        new Star(950, canvas.height - 480),
        new Star(1250, canvas.height - 230),
        new Star(1550, canvas.height - 410),
        new Star(1850, canvas.height - 530),
        new Star(2150, canvas.height - 280),
        new Star(2450, canvas.height - 430),
        new Star(2870, canvas.height - 110),
    ],
    enemies: [
        new Enemy(400, canvas.height - 60, 'basic'),
        new Enemy(700, canvas.height - 380, 'volatile'),
        new Enemy(1300, canvas.height - 60, 'basic'),
        new Enemy(1600, canvas.height - 450, 'volatile'),
        new Enemy(2000, canvas.height - 60, 'basic'),
        new Enemy(2500, canvas.height - 350, 'volatile'),
    ],
    spikes: [
        new Spike(200, canvas.height - 70, 'ground'),
        new Spike(500, canvas.height - 350, 'air'),
        new Spike(800, canvas.height - 70, 'ground'),
        new Spike(1100, canvas.height - 480, 'air'),
        new Spike(1400, canvas.height - 70, 'ground'),
        new Spike(1700, canvas.height - 550, 'air'),
        new Spike(2300, canvas.height - 70, 'ground'),
        new Spike(2600, canvas.height - 450, 'air'),
    ],
    springs: [
        new Spring(250, canvas.height - 40),
        new Spring(1050, canvas.height - 40),
        new Spring(1950, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(10, canvas.height - 80, "H"),
        new Teleporter(2900, canvas.height - 80, "H"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(1000, canvas.height - 300),
        new LifeUp(2200, canvas.height - 150),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 3000,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 25
levels[24] = {
    grounds: [],
    platforms: [
        new Platform(0, canvas.height - 150, 200, 'moving'),
        new Platform(400, canvas.height - 300, 100, 'bouncy'),
        new Platform(1100, canvas.height - 400, 100, 'sticky'),
        new Platform(1500, canvas.height - 200, 80, 'disappearing'),
        new Platform(1700, canvas.height - 250, 100, 'bouncy'),
        new Platform(2700, canvas.height - 350, 100, 'sticky'),
        new Platform(3100, canvas.height - 250, 80, 'disappearing'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
		    new ModularPlatform(750, canvas.height - 100, 120),
			  new ModularPlatform(1900, canvas.height - 480, 100),
				new ModularPlatform(2300, canvas.height - 100, 120),
				new ModularPlatform(950, canvas.height - 250, 120),
				new ModularPlatform(2400, canvas.height - 250, 120),
        new ModularPlatform(3300, canvas.height - 80, 150),
    ],
    walls: [],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(450, canvas.height - 330),
        new Star(800, canvas.height - 130),
        new Star(1150, canvas.height - 430),
        new Star(1550, canvas.height - 230),
        new Star(1950, canvas.height - 510),
        new Star(2350, canvas.height - 130),
        new Star(2750, canvas.height - 380),
        new Star(3150, canvas.height - 280),
        new Star(3370, canvas.height - 110),
    ],
    enemies: [
        new Enemy(300, canvas.height - 250, 'volatile'),
        new Enemy(600, canvas.height - 50, 'volatile'),
        new Enemy(1000, canvas.height - 300, 'volatile'),
        new Enemy(1400, canvas.height - 50, 'volatile'),
        new Enemy(1800, canvas.height - 300, 'volatile'),
        new Enemy(2200, canvas.height - 50, 'volatile'),
        new Enemy(2600, canvas.height - 300, 'volatile'),
        new Enemy(3000, canvas.height - 50, 'volatile'),
    ],
    spikes: [
        new Spike(250, canvas.height - 100, 'air'),
        new Spike(550, canvas.height - 200, 'air'),
        new Spike(950, canvas.height - 100, 'air'),
        new Spike(1350, canvas.height - 200, 'air'),
        new Spike(1750, canvas.height - 100, 'air'),
        new Spike(2150, canvas.height - 200, 'air'),
        new Spike(2550, canvas.height - 100, 'air'),
        new Spike(2950, canvas.height - 200, 'air'),
    ],
    springs: [],
    teleporters: [
        new Teleporter(10, canvas.height - 150, "I"),
        new Teleporter(3400, canvas.height - 150, "I"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(900, canvas.height - 300),
        new LifeUp(2500, canvas.height - 50),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 3500,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 26
levels[25] = {
    grounds: [new Ground(0, canvas.height - 20, 3200, 20, 'bottom')],
    platforms: [
        new Platform(320, canvas.height - 150, 100, 'disappearing'),
        new Platform(600, canvas.height - 300, 120, 'moving'),
        new Platform(950, canvas.height - 450, 100, 'disappearing'),
        new Platform(1300, canvas.height - 200, 150, 'bouncy'),
        new Platform(1700, canvas.height - 380, 100, 'temporary'),
        new Platform(2100, canvas.height - 500, 120, 'moving'),
        new Platform(2500, canvas.height - 250, 100, 'disappearing'),
        new Platform(2900, canvas.height - 400, 150, 'bouncy'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 110, 150),
        new ModularPlatform(3000, canvas.height - 80, 150),
        new ModularPlatform(800, canvas.height - 140, 80),
        new ModularPlatform(2000, canvas.height - 100, 100),
    ],
    walls: [
        new Wall(450, canvas.height - 250, 20, 150),
        new Wall(1550, canvas.height - 450, 20, 250),
        new Wall(2600, canvas.height - 300, 20, 180),
    ],
    stars: [
        new Star(350, canvas.height - 180),
        new Star(650, canvas.height - 330),
        new Star(1000, canvas.height - 480),
        new Star(1350, canvas.height - 230),
        new Star(1750, canvas.height - 410),
        new Star(2150, canvas.height - 530),
        new Star(2550, canvas.height - 280),
        new Star(2950, canvas.height - 430),
        new Star(3070, canvas.height - 110),
    ],
    enemies: [
        new Enemy(400, canvas.height - 60, 'basic'),
        new Enemy(750, canvas.height - 380, 'volatile'),
        new Enemy(1400, canvas.height - 60, 'basic'),
        new Enemy(1850, canvas.height - 450, 'volatile'),
        new Enemy(2300, canvas.height - 60, 'basic'),
        new Enemy(2700, canvas.height - 350, 'volatile'),
    ],
    spikes: [
        new Spike(200, canvas.height - 70, 'ground'),
        new Spike(500, canvas.height - 350, 'air'),
        new Spike(850, canvas.height - 70, 'ground'),
        new Spike(1200, canvas.height - 480, 'air'),
        new Spike(1600, canvas.height - 70, 'ground'),
        new Spike(2000, canvas.height - 550, 'air'),
        new Spike(2400, canvas.height - 70, 'ground'),
        new Spike(2800, canvas.height - 450, 'air'),
    ],
    springs: [
        new Spring(250, canvas.height - 40),
        new Spring(1050, canvas.height - 40),
        new Spring(2200, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(10, canvas.height - 80, "J"),
        new Teleporter(3100, canvas.height - 80, "J"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(1100, canvas.height - 300),
        new LifeUp(2650, canvas.height - 150),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 3200,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 27
levels[26] = {
    grounds: [new Ground(0, canvas.height - 20, 3500, 20, 'bottom')],
    platforms: [
        new Platform(200, canvas.height - 100, 80, 'bouncy'),
        new Platform(400, canvas.height - 250, 80, 'bouncy'),
        new Platform(600, canvas.height - 400, 80, 'bouncy'),
        new Platform(800, canvas.height - 200, 80, 'bouncy'),
        new Platform(1000, canvas.height - 350, 80, 'bouncy'),
        new Platform(1200, canvas.height - 500, 80, 'bouncy'),
        
        new Platform(1450, canvas.height - 250, 100, 'moving'),
        new Platform(1750, canvas.height - 400, 100, 'disappearing'),
        new Platform(2050, canvas.height - 150, 120, 'moving'),
        new Platform(2350, canvas.height - 300, 100, 'disappearing'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150),
        new ModularPlatform(3300, canvas.height - 80, 150),
        new ModularPlatform(700, canvas.height - 50, 80),
        new ModularPlatform(1900, canvas.height - 100, 100),
        new ModularPlatform(2900, canvas.height - 50, 80),
    ],
    walls: [
        new Wall(500, canvas.height - 300, 20, 150),
        new Wall(1600, canvas.height - 450, 20, 250),
    ],
    stars: [
        new Star(120, canvas.height - 110),
        new Star(250, canvas.height - 130),
        new Star(450, canvas.height - 280),
        new Star(650, canvas.height - 430),
        new Star(850, canvas.height - 230),
        new Star(1050, canvas.height - 380),
        new Star(1250, canvas.height - 530),
        new Star(1500, canvas.height - 280),
        new Star(1800, canvas.height - 430),
        new Star(2100, canvas.height - 180),
        new Star(2400, canvas.height - 330),
        new Star(3370, canvas.height - 110),
    ],
    enemies: [
        new Enemy(300, canvas.height - 300, 'volatile'),
        new Enemy(900, canvas.height - 450, 'volatile'),
        new Enemy(1600, canvas.height - 300, 'volatile'),
        new Enemy(2200, canvas.height - 200, 'volatile'),
    ],
    spikes: [
        new Spike(350, canvas.height - 450, 'air'),
        new Spike(750, canvas.height - 150, 'air'),
        new Spike(1150, canvas.height - 550, 'air'),
        new Spike(1500, canvas.height - 70, 'ground'),
        new Spike(2000, canvas.height - 450, 'air'),
        new Spike(2500, canvas.height - 70, 'ground'),
    ],
    springs: [
        new Spring(100, canvas.height - 40),
        new Spring(550, canvas.height - 40),
        new Spring(1300, canvas.height - 40),
        new Spring(2600, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(10, canvas.height - 80, "K"),
        new Teleporter(3400, canvas.height - 80, "K"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(1000, canvas.height - 50),
        new LifeUp(2000, canvas.height - 350),
    ],
    enableHorizontalScrolling: true,
    levelWidth: 3500,
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};
		
// niveau 28
levels[27] = {
    grounds: [new Ground(0, canvas.height - 20, 3800, 20, 'bottom')], 
    platforms: [
        new Platform(305, canvas.height - 200, 80, 'moving'), 
        new Platform(720, canvas.height - 335, 80, 'moving'),
        new Platform(1905, canvas.height - 200, 80, 'moving'), 
        new Platform(2405, canvas.height - 335, 80, 'moving'), 
        new Platform(3305, canvas.height - 350, 80, 'moving'), 
        new Platform(1590, canvas.height - 330, 100, 'disappearing'),
				new Platform(2900, canvas.height - 400, 100, 'disappearing'),
    ],
    modularPlatforms: [
        new ModularPlatform(60, canvas.height - 100, 140),
        new ModularPlatform(3600, canvas.height - 100, 150),
        
        new ModularPlatform(500, canvas.height - 100, 80), 
        new ModularPlatform(1050, canvas.height - 400, 100), 
        new ModularPlatform(1300, canvas.height - 100, 80), 
				new ModularPlatform(1300, canvas.height - 400, 100),
        new ModularPlatform(1700, canvas.height - 400, 100), 
        new ModularPlatform(2250, canvas.height - 100, 80), 
        new ModularPlatform(2700, canvas.height - 400, 100), 
        new ModularPlatform(2900, canvas.height - 100, 80), 
    ],
    walls: [
        new Wall(200, canvas.height - 200, 20, 40), new Wall(490, canvas.height - 200, 20, 40), 
        new Wall(600, canvas.height - 335, 20, 40), new Wall(890, canvas.height - 335, 20, 40), 
        new Wall(1900, canvas.height - 200, 20, 40), new Wall(2190, canvas.height - 200, 20, 40), 
        new Wall(2300, canvas.height - 335, 20, 40), new Wall(2590, canvas.height - 335, 20, 40), 
        new Wall(3200, canvas.height - 350, 20, 40), new Wall(3490, canvas.height - 350, 20, 40), 
    ],
    stars: [
        new Star(430, canvas.height - 250), 
        new Star(830, canvas.height - 400), 
        new Star(1100, canvas.height - 430), 
        new Star(1750, canvas.height - 430), 
        new Star(2160, canvas.height - 250), 
        new Star(2560, canvas.height - 380), 
        new Star(2750, canvas.height - 430), 
        new Star(3460, canvas.height - 400),
        new Star(3670, canvas.height - 130), 
    ],
    enemies: [
        new Enemy(400, canvas.height - 58, 'basic'),
        new Enemy(800, canvas.height - 58, 'basic'), 
        new Enemy(1200, canvas.height - 58, 'basic'), 
        new Enemy(1600, canvas.height - 58, 'basic'), 
        new Enemy(2000, canvas.height - 58, 'basic'), 
        new Enemy(2400, canvas.height - 58, 'basic'),
        new Enemy(2800, canvas.height - 58, 'basic'),
        new Enemy(3200, canvas.height - 58, 'basic'), 
        new Enemy(600, canvas.height - 440, 'volatile'), 
        new Enemy(1400, canvas.height - 470, 'volatile'), 
        new Enemy(2200, canvas.height - 440, 'volatile'), 
        new Enemy(3000, canvas.height - 470, 'volatile'), 
    ],
    spikes: [
        new Spike(320, canvas.height - 270, 'air'), 
        new Spike(720, canvas.height - 420, 'air'), 
        new Spike(2020, canvas.height - 270, 'air'), 
        new Spike(2420, canvas.height - 420, 'air'), 
        new Spike(3350, canvas.height - 420, 'air'),
    ],
    springs: [
        new Spring(20, canvas.height - 39), 
        new Spring(1000, canvas.height - 39), 
        new Spring(1560, canvas.height - 39), 
        new Spring(2600, canvas.height - 39),
    ],
    teleporters: [],
    gravityInverted: false, 
    enableDoubleJump: false, 
    lifeUps: [
        new LifeUp(600, canvas.height - 270),
        new LifeUp(2000, canvas.height - 420), 
    ],
    enableHorizontalScrolling: true,
    levelWidth: 3800, 
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: canvas.height - 80 - 60 - 1 
};

// niveau 29
levels[28] = {
    grounds: [
        new Ground(0, 0, canvas.width, 20, 'top'), 
        new Ground(0, canvas.height - 20, canvas.width, 20, 'bottom') 
    ],
    platforms: [
        new Platform(300, canvas.height - 350, 100, 'disappearing'),
        new Platform(700, canvas.height - 320, 100, 'disappearing'),
		], 
    modularPlatforms: [
        new ModularPlatform(70, 50, 130), 
        new ModularPlatform(canvas.width - 200, 400, 150), 
        new ModularPlatform(250, 100, 120), 
        new ModularPlatform(500, 200, 120), 
        new ModularPlatform(700, 50, 100), 
        new ModularPlatform(100, 300, 100), 
    ],
    walls: [], 
    stars: [
        new Star(285, 140), 
        new Star(550, 230),
        new Star(730, 80), 
        new Star(150, 330), 
        new Star(canvas.width - 120, 430),
    ],
    enemies: [
        new Enemy(300, 150, 'volatile'), 
        new Enemy(600, 250, 'volatile'), 
    ],
    spikes: [
        new Spike(400, 150, 'air'), 
        new Spike(750, 100, 'air'), 
    ],
    springs: [
        new Spring(canvas.width / 2 - 20, canvas.height - 40), 
    ],
    teleporters: [],
    gravityInverted: true, 
    enableDoubleJump: false, 
    lifeUps: [
        new LifeUp(canvas.width / 2 - 15, 100), 
    ],
    enableHorizontalScrolling: false, 
    levelWidth: canvas.width, 
    playerStartX: 50 + (150 / 2) - (60 / 2), 
    playerStartY: 50 + 20 + 1 
};
		
// niveau 30
levels[29] = { 
    grounds: [
        new Ground(0, canvas.height - 20, 3800, 20, 'bottom'),
    ],
    platforms: [
        new Platform(600, canvas.height - 200, 150, 'moving'), 
        new Platform(1500, canvas.height - 250, 150, 'disappearing'), 
        new Platform(1800, canvas.height - 350, 100, 'bouncy'), 
        new Platform(2100, canvas.height - 450, 120, 'temporary'), 
        new Platform(2400, canvas.height - 200, 100, 'bouncy'), 
        new Platform(2700, canvas.height - 300, 150, 'moving'),
        new Platform(3000, canvas.height - 400, 120, 'disappearing'), 
        new Platform(3300, canvas.height - 250, 100, 'bouncy'), 
    ],
    modularPlatforms: [
        new ModularPlatform(100, canvas.height - 300, 160), 
        new ModularPlatform(1700, canvas.height - 400, 100), 
        new ModularPlatform(2250, canvas.height - 100, 80), 
        new ModularPlatform(3600, canvas.height - 100, 150),
        new ModularPlatform(310, canvas.height - 100, 130), 
        new ModularPlatform(850, canvas.height - 300, 150), 
        new ModularPlatform(1200, canvas.height - 100, 150), 
    ],
    walls: [
        new Wall(500, canvas.height - 150, 20, 100),
        new Wall(1000, canvas.height - 350, 20, 200), 
        new Wall(1700, canvas.height - 150, 20, 100), 
        new Wall(2600, canvas.height - 350, 20, 150), 
        new Wall(3200, canvas.height - 450, 20, 200), 
    ],
    stars: [
        new Star(165, canvas.height - 330), 
        new Star(360, canvas.height - 130), 
        new Star(700, canvas.height - 250), 
        new Star(920, canvas.height - 330), 
        new Star(1260, canvas.height - 130), 
        new Star(1600, canvas.height - 300),
        new Star(1900, canvas.height - 450), 
        new Star(2200, canvas.height - 480), 
        new Star(2500, canvas.height - 230), 
        new Star(2800, canvas.height - 330), 
        new Star(3050, canvas.height - 430), 
        new Star(3400, canvas.height - 280), 
        new Star(3670, canvas.height - 150), 
    ],
    enemies: [
        new Enemy(400, canvas.height - 56, 'basic'), 
        new Enemy(1300, canvas.height - 300, 'volatile'), 

        new Enemy(2000, canvas.height - 500, 'volatile'), 
        new Enemy(2800, canvas.height - 56, 'basic'), 
        new Enemy(3200, canvas.height - 300, 'volatile'), 
    ],
    spikes: [
        new Spike(800, canvas.height - 68, 'ground'), 
        new Spike(1400, canvas.height - 68, 'ground'), 

        new Spike(1950, canvas.height - 400, 'air'), 
        new Spike(2550, canvas.height - 68, 'ground'),
        new Spike(3100, canvas.height - 450, 'air'), 
    ],
    springs: [
        new Spring(250, canvas.height - 38), 
        new Spring(1050, canvas.height - 38), 

        new Spring(2200, canvas.height - 38), 
        new Spring(3450, canvas.height - 38), 
    ],
    teleporters: [
        new Teleporter(50, canvas.height - 80, "E"), 
        new Teleporter(3700, canvas.height - 80, "E"), 
    ],
    gravityInverted: false,
    enableDoubleJump: false, 
    enableHorizontalScrolling: true, 
    levelWidth: 3800, 
    lifeUps: [
        new LifeUp(1750, canvas.height - 50),
        new LifeUp(2900, canvas.height - 450), 
    ],
    playerStartX: 120, 
    playerStartY: canvas.height - 100 - 60 - 1 
};
		
// niveau 31
levels[30] = {
    grounds: [
        new Ground(0, canvas.height - 20, 4500, 20, 'bottom'),
    ],
    platforms: [
        new Platform(400, canvas.height - 150, 100, 'moving'),
        new Platform(1000, canvas.height - 250, 120, 'disappearing'),
        new Platform(1800, canvas.height - 100, 100, 'bouncy'),
        new Platform(2500, canvas.height - 200, 150, 'moving'),
        new Platform(3200, canvas.height - 150, 100, 'temporary'),
				new Platform(1100, canvas.height - 400, 60, 'bouncy'),
    ],
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 100, 150),
        new ModularPlatform(4300, canvas.height - 100, 150),
				new ModularPlatform(850, canvas.height - 370, 100),
        // Zone T�l�porteur A
        new ModularPlatform(470, canvas.height - 470, 130),
				new ModularPlatform(470, canvas.height - 340, 130),
        // Zone T�l�porteur B
        new ModularPlatform(1170, canvas.height - 570, 130),
        new ModularPlatform(1170, canvas.height - 290, 130),
        // Zone T�l�porteur C
        new ModularPlatform(1970, canvas.height - 510, 130),
				new ModularPlatform(1970, canvas.height - 340, 130),
        // Zone T�l�porteur D
        new ModularPlatform(2770, canvas.height - 570, 130),
				new ModularPlatform(2770, canvas.height - 340, 130),
        // Zone T�l�porteur E
        new ModularPlatform(3470, canvas.height - 470, 130),
				new ModularPlatform(3470, canvas.height - 290, 130),
    ],
    walls: [
        // Zone A
        new Wall(450, canvas.height - 470, 20, 150), new Wall(600, canvas.height - 470, 20, 150),
        // Zone B
        new Wall(1150, canvas.height - 570, 20, 300), new Wall(1300, canvas.height - 570, 20, 300),
        // Zone C
        new Wall(1950, canvas.height - 520, 20, 200), new Wall(2100, canvas.height - 520, 20, 200),
        // Zone D
        new Wall(2750, canvas.height - 570, 20, 250), new Wall(2900, canvas.height - 570, 20, 250),
        // Zone E
        new Wall(3450, canvas.height - 470, 20, 200), new Wall(3600, canvas.height - 470, 20, 200),

        // Murs obstacle sur le chemin
        new Wall(800, canvas.height - 200, 20, 100),
        new Wall(2200, canvas.height - 300, 20, 150),
    ],
    stars: [
        new Star(1050, canvas.height - 280),
        new Star(1850, canvas.height - 130),
        new Star(2550, canvas.height - 230),
        new Star(3250, canvas.height - 180),
        new Star(4370, canvas.height - 150),
        new Star(1230, canvas.height - 600),
        new Star(3815, canvas.height - 370),
        new Star(540, canvas.height - 450),
        new Star(1250, canvas.height - 350),
        new Star(2050, canvas.height - 400),
        new Star(2790, canvas.height - 550),
        new Star(3530, canvas.height - 450),
    ],
    enemies: [
        new Enemy(600, canvas.height - 60, 'basic'),
        new Enemy(1500, canvas.height - 60, 'basic'),
        new Enemy(2200, canvas.height - 60, 'basic'),
        new Enemy(3000, canvas.height - 60, 'basic'),

        new Enemy(450, canvas.height - 320, 'volatile'),
        new Enemy(1250, canvas.height - 420, 'volatile'),
        new Enemy(2250, canvas.height - 370, 'volatile'),
        new Enemy(3050, canvas.height - 420, 'volatile'),
        new Enemy(3750, canvas.height - 320, 'volatile'),
    ],
    spikes: [
        new Spike(700, canvas.height - 70, 'ground'),
        new Spike(1600, canvas.height - 70, 'ground'),
        new Spike(2900, canvas.height - 70, 'ground'),

        new Spike(520, canvas.height - 550, 'air'),
        new Spike(1250, canvas.height - 220, 'air'),
        new Spike(2010, canvas.height - 480, 'air'),
        new Spike(2850, canvas.height - 550, 'air'),
        new Spike(3750, canvas.height - 370, 'air'),
    ],
    springs: [
        new Spring(200, canvas.height - 40),
        new Spring(900, canvas.height - 40),
        new Spring(1700, canvas.height - 40),
        new Spring(2400, canvas.height - 40),
        new Spring(3100, canvas.height - 40),
        new Spring(3800, canvas.height - 40),
    ],
    teleporters: [
        new Teleporter(300, canvas.height - 80, "A"),
        new Teleporter(1100, canvas.height - 80, "B"),
        new Teleporter(1900, canvas.height - 80, "C"),
        new Teleporter(2700, canvas.height - 80, "D"),
        new Teleporter(3400, canvas.height - 80, "E"),

        new Teleporter(470, canvas.height - 400, "C"),
        new Teleporter(1160, canvas.height - 360, "B"),
        new Teleporter(1960, canvas.height - 405, "D"),
        new Teleporter(2760, canvas.height - 400, "A"),
        new Teleporter(3460, canvas.height - 350, "E"),
    ],
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(3000, canvas.height - 420), 
    ],
    enableHorizontalScrolling: true,
    levelWidth: 4500,
    playerStartX: 50 + (150 / 2) - (60 / 2),
    playerStartY: canvas.height - 80 - 60 - 1
};
		
// Niveau 32 (index 31) - Le "Chemin Paisible"
levels[31] = {
    grounds: [
        new Ground(0, canvas.height - 20, 2500, 20, 'bottom'), 
    ],
    platforms: [], 
    modularPlatforms: [
        new ModularPlatform(50, canvas.height - 80, 150), 
        new ModularPlatform(2300, canvas.height - 80, 150), 
        new ModularPlatform(600, canvas.height - 300, 80), 
        new ModularPlatform(1400, canvas.height - 350, 100), 
        new ModularPlatform(400, canvas.height - 150, 100), 
        new ModularPlatform(800, canvas.height - 250, 120), 
        new ModularPlatform(1200, canvas.height - 100, 100),
        new ModularPlatform(1600, canvas.height - 200, 150), 
        new ModularPlatform(2000, canvas.height - 150, 100),
    ],
    walls: [], 
    stars: [
        new Star(120, canvas.height - 110), 
        new Star(450, canvas.height - 180), 
        new Star(850, canvas.height - 280), 
        new Star(1250, canvas.height - 130), 
        new Star(1675, canvas.height - 230), 
        new Star(2050, canvas.height - 180), 
        new Star(2370, canvas.height - 110), 
        new Star(640, canvas.height - 330), 
        new Star(1450, canvas.height - 380), 
    ],
    enemies: [
        new Enemy(700, canvas.height - 60, 'basic'), 
        new Enemy(1800, canvas.height - 60, 'basic'),
        new Enemy(1000, canvas.height - 300, 'volatile'), 
    ],
    spikes: [
        new Spike(750, canvas.height - 320, 'air'), 
        new Spike(1500, canvas.height - 270, 'air'), 
    ],
    springs: [
        new Spring(200, canvas.height - 40), 
        new Spring(1000, canvas.height - 40), 
        new Spring(2200, canvas.height - 40), 
    ],
    teleporters: [], 
    gravityInverted: false,
    enableDoubleJump: false,
    lifeUps: [
        new LifeUp(500, canvas.height - 50), 
        new LifeUp(1700, canvas.height - 50), 
    ],
    enableHorizontalScrolling: true,
    levelWidth: 2500, 
    playerStartX: 50 + (150 / 2) - (60 / 2),
    playerStartY: canvas.height - 80 - 60 - 1
};
// Niveau 33 (index 32) - La "Tour Ascendante"
levels[32] = {
    verticalScrolling: true, 
    levelHeight: 2000,       
    levelWidth: 1000,        
    grounds: [
        { x: 0, y: 2000 - 20, width: 1000, height: 20, type: 'bottom' }, 
    ],
    platforms: [
        { x: 200, y: 2000 - 150, width: 100, type: 'moving' },
        { x: 400, y: 2000 - 300, width: 120, type: 'disappearing' },
        { x: 600, y: 2000 - 450, width: 100, type: 'bouncy' },
        { x: 400, y: 2000 - 750, width: 100, type: 'moving' },
				{ x: 150, y: 2000 - 600, width: 100, type: 'disappearing' }, 
        { x: 250, y: 2000 - 970, width: 120, type: 'disappearing' }, 
        { x: 650, y: 2000 - 1200, width: 150, type: 'disappearing' },
				{ x: 270, y: 2000 - 1270, width: 60, type: 'disappearing' }, 
        { x: 100, y: 2000 - 1330, width: 100, type: 'moving' },
    ],
    modularPlatforms: [
        { x: 50, y: 2000 - 100, width: 150 }, 
        { x: 800, y: 2000 - 200, width: 200 }, 
        { x: 300, y: 2000 - 250, width: 80 }, 
        { x: 500, y: 2000 - 400, width: 100 }, 
        { x: 800, y: 2000 - 550, width: 120 }, 
        { x: 800, y: 2000 - 700, width: 200 }, 
        { x: 10, y: 2000 - 850, width: 170 }, 
				{ x: 390, y: 2000 - 1090, width: 110 }, 
        { x: 1000 - 250, y: 2000 - 1000, width: 120 }, 
        { x: 500, y: 2000 - 1200, width: 150 }, 
				{ x: 800, y: 2000 - 1200, width: 150 }, 
        { x: 330, y: 2000 - 1460, width: 120 }, 
        { x: 670, y: 2000 - 1600, width: 100 }, 
        { x: 800, y: 2000 - 1770, width: 200 }, 
        { x: 0, y: 2000 - 1880, width: 800 },
				{ x: 0, y: 2000 - 600, width: 150 }, 
				{ x: 0, y: 2000 - 710, width: 70 }, 
    ],
    walls: [
        { x: 180, y: 2000 - 200, width: 20, height: 100 }, 
        { x: 800, y: 2000 - 180, width: 20, height: 180 }, 
        { x: 360, y: 2000 - 350, width: 20, height: 100 }, 
        { x: 580, y: 2000 - 500, width: 20, height: 110 }, 
        { x: 800, y: 2000 - 650, width: 20, height: 100 }, 
        { x: 160, y: 2000 - 830, width: 20, height: 150 }, 
        { x: 500, y: 2000 - 1180, width: 20, height: 90 }, 
        { x: 250, y: 2000 - 1330, width: 20, height: 150 }, 
        { x: 450, y: 2000 - 1600, width: 20, height: 150 },
        { x: 770, y: 2000 - 1740, width: 20, height: 150 },
        { x: 780, y: 2000 - 1905, width: 20, height: 30 },
    ],
    stars: [
        { x: 900, y: 2000 - 240 }, 
        { x: 450, y: 2000 - 330 },
        { x: 825, y: 2000 - 590 }, 
        { x: 190, y: 2000 - 780 },
        { x: 1000 - 100, y: 2000 - 730 },
        { x: 400, y: 2000 - 1155 }, 
        { x: 780, y: 2000 - 1040 }, 
        { x: 750, y: 2000 - 1230 },
        { x: 180, y: 2000 - 1380 },
        { x: 700, y: 2000 - 1630 },
        { x: 880, y: 2000 - 1830 },
        { x: 100, y: 2000 - 1950 },
    ],
    enemies: [
        { x: 300, y: 2000 - 58, type: 'basic' },
        { x: 500, y: 2000 - 200, type: 'volatile' },
        { x: 700, y: 2000 - 400, type: 'volatile' },
        { x: 200, y: 2000 - 600, type: 'volatile' },
        { x: 600, y: 2000 - 1000, type: 'volatile' },
        { x: 150, y: 2000 - 1400, type: 'volatile' },
        { x: 550, y: 2000 - 1800, type: 'volatile' },
				{ x: 200, y: 2000 - 1920, type: 'basic' },
    ],
    spikes: [
        { x: 300, y: 2000 - 200, type: 'air' },
        { x: 500, y: 2000 - 350, type: 'air' },
        { x: 695, y: 2000 - 500, type: 'air' },
        { x: 850, y: 2000 - 660, type: 'air' },
        { x: 550, y: 2000 - 810, type: 'air' }, 
        { x: 550, y: 2000 - 1248, type: 'ground' },
        { x: 850, y: 2000 - 1248, type: 'ground' }, 			
        { x: 575, y: 2000 - 1650, type: 'air' },
        { x: 900, y: 2000 - 1900, type: 'air' },
    ],
    springs: [
        { x: 210, y: 2000 - 40 },
        { x: 955, y: 2000 - 300 }, // en bas a droite
    ],
    teleporters: [
        { x: 815, y: 2000 - 85, id: "A" },
        { x: 0, y: 2000 - 775, id: "A" },
    ],
    gravityInverted: false,
    enableDoubleJump: false, 
    lifeUps: [
        { x: 970, y: 2000 - 50 },
        { x: 970, y: 2000 - 110 },
    ],
    enableHorizontalScrolling: true, 
    playerStartX: 50 + (150 / 2) - (40 / 2), 
    playerStartY: 2000 - 80 - 60 - 1 
};
		
// Niveau 34 (index 33) - La "Poursuite Horizontale"
levels[33] = {
    verticalScrolling: false, 
    enableHorizontalScrolling: true, 
    levelWidth: 4500,       
    levelHeight: canvas.height, 

    grounds: [
        { x: 0, y: canvas.height - 20, width: 4500, height: 20, type: 'bottom' },
    ],
    platforms: [
        { x: 600, y: canvas.height - 150, width: 120, type: 'moving' }, 
        { x: 900, y: canvas.height - 250, width: 100, type: 'disappearing' }, 
        { x: 1200, y: canvas.height - 100, width: 150, type: 'bouncy' }, 
        { x: 1500, y: canvas.height - 300, width: 80, type: 'temporary' }, 
        { x: 1800, y: canvas.height - 200, width: 120, type: 'moving' }, 
        { x: 2100, y: canvas.height - 350, width: 100, type: 'disappearing' }, 
        { x: 2400, y: canvas.height - 150, width: 150, type: 'bouncy' }, 
        { x: 2700, y: canvas.height - 400, width: 80, type: 'temporary' }, 
        { x: 3000, y: canvas.height - 250, width: 120, type: 'moving' }, 
        { x: 3300, y: canvas.height - 350, width: 100, type: 'disappearing' }, 
        { x: 3600, y: canvas.height - 200, width: 150, type: 'bouncy' }, 
        { x: 3900, y: canvas.height - 450, width: 80, type: 'temporary' }, 
    ],
    modularPlatforms: [
        { x: 500, y: canvas.height - 80, width: 150 }, 
        { x: 4300, y: canvas.height - 80, width: 150 }, 
    ],
    walls: [],
    stars: [
        { x: 575, y: canvas.height - 110 }, 
        { x: 650, y: canvas.height - 180 },
        { x: 950, y: canvas.height - 280 },
        { x: 1275, y: canvas.height - 130 },
        { x: 1550, y: canvas.height - 330 },
        { x: 1850, y: canvas.height - 230 },
        { x: 2150, y: canvas.height - 380 },
        { x: 2475, y: canvas.height - 180 },
        { x: 2750, y: canvas.height - 430 },
        { x: 3150, y: canvas.height - 280 },
        { x: 3350, y: canvas.height - 380 },
        { x: 3675, y: canvas.height - 230 },
        { x: 3950, y: canvas.height - 480 },
        { x: 4375, y: canvas.height - 110 }, 
    ],
    enemies: [
        { x: 0, y: canvas.height - 500, type: 'volatile' }, 
        { x: 0, y: canvas.height - 400, type: 'volatile' }, 
        { x: 0, y: canvas.height - 300, type: 'volatile' }, 
        { x: 0, y: canvas.height - 200, type: 'volatile' }, 
        { x: 0, y: canvas.height - 100, type: 'volatile' }, 
				{ x: 0, y: canvas.height - 60, type: 'basic' },
    ],
    spikes: [
        { x: 800, y: canvas.height - 70, type: 'ground' },
        { x: 1400, y: canvas.height - 70, type: 'ground' },
        { x: 2000, y: canvas.height - 70, type: 'ground' },
        { x: 2600, y: canvas.height - 70, type: 'ground' },
        { x: 3200, y: canvas.height - 70, type: 'ground' },
        { x: 3800, y: canvas.height - 70, type: 'ground' },

        { x: 1000, y: canvas.height - 300, type: 'air' }, 
        { x: 1900, y: canvas.height - 400, type: 'air' }, 
        { x: 2800, y: canvas.height - 450, type: 'air' }, 
        { x: 3700, y: canvas.height - 500, type: 'air' }, 
    ],
    springs: [
        { x: 700, y: canvas.height - 40 }, 
        { x: 1600, y: canvas.height - 40 },
        { x: 2500, y: canvas.height - 40 },
        { x: 3400, y: canvas.height - 40 },
        { x: 4200, y: canvas.height - 40 }, 
    ],
    teleporters: [], 
    gravityInverted: false,
    enableDoubleJump: true, 
    lifeUps: [
        { x: 1000, y: canvas.height - 50 },
        { x: 2300, y: canvas.height - 50 },
        { x: 3500, y: canvas.height - 50 },
    ],
    playerStartX: 500, 
    playerStartY: canvas.height - 80 - 60 - 1 
};

// Niveau 35 (index 34) - Le "Voyage A�rien Paisible"
levels[34] = {
    verticalScrolling: false, 
    enableHorizontalScrolling: true, 
    levelWidth: 3500,       
    levelHeight: canvas.height,

    grounds: [],

    platforms: [], 

    modularPlatforms: [
        { x: 50, y: canvas.height - 150, width: 150 },
        { x: 300, y: canvas.height - 250, width: 120 },
        { x: 550, y: canvas.height - 100, width: 100 },
        { x: 800, y: canvas.height - 230, width: 150 },
        { x: 1100, y: canvas.height - 180, width: 100 },
        { x: 1400, y: canvas.height - 280, width: 120 },
        { x: 1700, y: canvas.height - 100, width: 100 },
				{ x: 1820, y: canvas.height - 225, width: 100 },
        { x: 2000, y: canvas.height - 350, width: 150 },
        { x: 2300, y: canvas.height - 200, width: 100 },
        { x: 2600, y: canvas.height - 300, width: 120 },
        { x: 2900, y: canvas.height - 150, width: 100 },
        { x: 3200, y: canvas.height - 250, width: 150 }, 
    ],

    walls: [],

    stars: [
        { x: 350, y: canvas.height - 280 },
        { x: 600, y: canvas.height - 130 },
        { x: 875, y: canvas.height - 330 },
        { x: 1150, y: canvas.height - 210 },
        { x: 1450, y: canvas.height - 310 },
        { x: 1750, y: canvas.height - 130 },
        { x: 2075, y: canvas.height - 380 },
        { x: 2350, y: canvas.height - 230 },
        { x: 2650, y: canvas.height - 330 },
        { x: 2950, y: canvas.height - 180 },
        { x: 3275, y: canvas.height - 280 },
    ],
    enemies: [
        { x: 700, y: canvas.height - 400, type: 'volatile' },
        { x: 1500, y: canvas.height - 50, type: 'volatile' },
        { x: 2200, y: canvas.height - 450, type: 'volatile' }, 
        { x: 3000, y: canvas.height - 50, type: 'volatile' }, 
    ],
    spikes: [], 

    springs: [
        { x: 200, y: canvas.height - 40 }, 
        { x: 1000, y: canvas.height - 40 },
        { x: 2500, y: canvas.height - 40 },
    ],
    teleporters: [],

    gravityInverted: false,
    enableDoubleJump: false, 

    lifeUps: [],
    playerStartX: 100, 
    playerStartY: canvas.height - 150 - 60 - 1 
};
		
// Niveau 36 (index 35) - Le "D�fi Chrono"
levels[35] = {
    verticalScrolling: false, 
    enableHorizontalScrolling: true, 
    levelWidth: 4000,       
    levelHeight: canvas.height,

    grounds: [
        { x: 0, y: canvas.height - 20, width: 4000, height: 20, type: 'bottom' }, 
    ],
    platforms: [
        // Plateformes temporaires et disparaissantes pour le timing
        { x: 300, y: canvas.height - 150, width: 100, type: 'temporary' },
        { x: 600, y: canvas.height - 250, width: 120, type: 'disappearing' },
        { x: 900, y: canvas.height - 100, width: 100, type: 'temporary' },
        { x: 1500, y: canvas.height - 150, width: 150, type: 'bouncy' },
        { x: 1200, y: canvas.height - 300, width: 150, type: 'disappearing' },
        { x: 1500, y: canvas.height - 200, width: 80, type: 'moving' }, 
        { x: 1800, y: canvas.height - 400, width: 100, type: 'temporary' },
        { x: 2100, y: canvas.height - 250, width: 120, type: 'disappearing' },
        { x: 2400, y: canvas.height - 100, width: 100, type: 'temporary' },
        { x: 2700, y: canvas.height - 350, width: 150, type: 'disappearing' },
        { x: 3000, y: canvas.height - 200, width: 80, type: 'moving' }, 
        { x: 3300, y: canvas.height - 450, width: 100, type: 'temporary' },
        { x: 3600, y: canvas.height - 300, width: 120, type: 'bouncy' },
    ],
    modularPlatforms: [
        { x: 50, y: canvas.height - 100, width: 150 }, 
        { x: 3800, y: canvas.height - 100, width: 150 },
        { x: 1000, y: canvas.height - 100, width: 80 }, 
        { x: 2600, y: canvas.height - 100, width: 80 }, 
    ],
    walls: [
        { x: 750, y: canvas.height - 200, width: 20, height: 100 }, 
        { x: 1950, y: canvas.height - 450, width: 20, height: 150 }, 
        { x: 3150, y: canvas.height - 250, width: 20, height: 100 },
    ],
    stars: [
        { x: 350, y: canvas.height - 180 },
        { x: 650, y: canvas.height - 280 },
        { x: 950, y: canvas.height - 130 },
        { x: 1275, y: canvas.height - 330 },
        { x: 1550, y: canvas.height - 230 },
        { x: 1850, y: canvas.height - 430 },
        { x: 2150, y: canvas.height - 280 },
        { x: 2450, y: canvas.height - 130 },
        { x: 3050, y: canvas.height - 230 },
        { x: 3350, y: canvas.height - 480 },
        { x: 3650, y: canvas.height - 330 },
        { x: 3870, y: canvas.height - 150 }, 
    ],
    enemies: [
        { x: 700, y: canvas.height - 350, type: 'volatile' },
        { x: 1600, y: canvas.height - 50, type: 'basic' }, 
        { x: 2200, y: canvas.height - 400, type: 'volatile' },
        { x: 3000, y: canvas.height - 50, type: 'basic' }, 
        { x: 3500, y: canvas.height - 500, type: 'volatile' },
    ],
    spikes: [
        { x: 450, y: canvas.height - 200, type: 'air' },
        { x: 1350, y: canvas.height - 350, type: 'air' },
        { x: 2000, y: canvas.height - 300, type: 'air' },
        { x: 2850, y: canvas.height - 400, type: 'air' },
        { x: 3700, y: canvas.height - 350, type: 'air' },
    ],
    springs: [
        { x: 200, y: canvas.height - 40 }, 
        { x: 1100, y: canvas.height - 40 }, 
        { x: 2300, y: canvas.height - 40 }, 
        { x: 3500, y: canvas.height - 40 }, 
    ],
    teleporters: [],

    gravityInverted: false,
    enableDoubleJump: true, 

    lifeUps: [
        { x: 1700, y: canvas.height - 50 }, 
        { x: 3200, y: canvas.height - 50 }, 
    ],
    playerStartX: 100, 
    playerStartY: canvas.height - 80 - 60 - 1
};
		
// Niveau 37 (index 36) - Le "Passage �quilibr�"
levels[36] = {
    verticalScrolling: false,
    enableHorizontalScrolling: true,
    levelWidth: 3200,      
    levelHeight: canvas.height,

    grounds: [
        { x: 0, y: canvas.height - 20, width: 3200, height: 20, type: 'bottom' },
    ],
    platforms: [
        { x: 400, y: canvas.height - 150, width: 100, type: 'moving' }, 
        { x: 700, y: canvas.height - 250, width: 120, type: 'disappearing' },
        { x: 1000, y: canvas.height - 100, width: 150, type: 'bouncy' },
        { x: 1300, y: canvas.height - 300, width: 80, type: 'temporary' },
        { x: 1600, y: canvas.height - 200, width: 100, type: 'moving' }, 
        { x: 1900, y: canvas.height - 350, width: 120, type: 'disappearing' },
        { x: 2200, y: canvas.height - 150, width: 100, type: 'bouncy' },
        { x: 2500, y: canvas.height - 400, width: 150, type: 'temporary' },
        { x: 2800, y: canvas.height - 250, width: 80, type: 'moving' }, 
    ],
    modularPlatforms: [
        { x: 50, y: canvas.height - 80, width: 150 }, 
        { x: 3000, y: canvas.height - 80, width: 150 }, 
        { x: 850, y: canvas.height - 50, width: 80 }, 
        { x: 2350, y: canvas.height - 50, width: 80 }, 
        { x: 1700, y: canvas.height - 450, width: 100 },
    ],
    walls: [
        { x: 600, y: canvas.height - 200, width: 20, height: 100 },
        { x: 1500, y: canvas.height - 400, width: 20, height: 150 },
        { x: 2100, y: canvas.height - 250, width: 20, height: 100 },
    ],
    stars: [
        { x: 120, y: canvas.height - 110 }, 
        { x: 450, y: canvas.height - 180 },
        { x: 750, y: canvas.height - 280 },
        { x: 1075, y: canvas.height - 130 },
        { x: 1350, y: canvas.height - 330 },
        { x: 1650, y: canvas.height - 230 },
        { x: 1950, y: canvas.height - 380 },
        { x: 2250, y: canvas.height - 180 },
        { x: 2575, y: canvas.height - 430 },
        { x: 2850, y: canvas.height - 280 },
        { x: 3070, y: canvas.height - 110 }, 
    ],
    enemies: [
        { x: 500, y: canvas.height - 60, type: 'basic' }, 
        { x: 1100, y: canvas.height - 350, type: 'volatile' }, 
        { x: 1800, y: canvas.height - 60, type: 'basic' }, 
        { x: 2400, y: canvas.height - 450, type: 'volatile' }, 
        { x: 2900, y: canvas.height - 60, type: 'basic' }, 
    ],
    spikes: [
        { x: 300, y: canvas.height - 70, type: 'ground' },
        { x: 800, y: canvas.height - 300, type: 'air' },
        { x: 1400, y: canvas.height - 70, type: 'ground' },
        { x: 1700, y: canvas.height - 500, type: 'air' }, 
        { x: 2600, y: canvas.height - 70, type: 'ground' },
        { x: 2950, y: canvas.height - 300, type: 'air' },
    ],
    springs: [
        { x: 250, y: canvas.height - 40 },
        { x: 1200, y: canvas.height - 40 },
        { x: 2000, y: canvas.height - 40 },
        { x: 2700, y: canvas.height - 40 },
    ],
    teleporters: [],
    gravityInverted: false,
    enableDoubleJump: true,
    lifeUps: [],
    playerStartX: 100,
    playerStartY: canvas.height - 80 - 60 - 1
};
		
// Niveau 38 (index 37) - L'Ascension Amusante
levels[37] = {
    verticalScrolling: true, 
    levelHeight: 1800,      
    levelWidth: 1000,        

    grounds: [
        { x: 0, y: 1800 - 20, width: 1000, height: 20, type: 'bottom' },
    ],
    platforms: [
        { x: 100, y: 1800 - 200, width: 120, type: 'moving' }, 
        { x: 400, y: 1800 - 400, width: 100, type: 'disappearing' },
        { x: 700, y: 1800 - 600, width: 150, type: 'bouncy' },
        { x: 200, y: 1800 - 800, width: 80, type: 'temporary' },
        { x: 500, y: 1800 - 1000, width: 100, type: 'moving' }, 
        { x: 800, y: 1800 - 1200, width: 120, type: 'disappearing' },
        { x: 100, y: 1800 - 1400, width: 100, type: 'bouncy' },
    ],
    modularPlatforms: [
        { x: 50, y: 1800 - 80, width: 150 }, 
        { x: 800, y: 1800 - 150, width: 100 }, 
        { x: 250, y: 1800 - 300, width: 80 },
        { x: 650, y: 1800 - 500, width: 120 },
        { x: 150, y: 1800 - 700, width: 100 },
        { x: 800, y: 1800 - 900, width: 150 },
        { x: 250, y: 1800 - 1100, width: 80 },
        { x: 610, y: 1800 - 1300, width: 120 },
        { x: 400, y: 1800 - 1500, width: 200 }, 
    ],
    walls: [
        { x: 350, y: 1800 - 440, width: 20, height: 150 },
        { x: 750, y: 1800 - 850, width: 20, height: 150 },
        { x: 350, y: 1800 - 1240, width: 20, height: 150 },
    ],
    stars: [
        { x: 120, y: 1800 - 110 },
        { x: 450, y: 1800 - 230 },
        { x: 750, y: 1800 - 330 },
        { x: 200, y: 1800 - 430 },
        { x: 550, y: 1800 - 630 },
        { x: 850, y: 1800 - 940 },
        { x: 300, y: 1800 - 1030 },
        { x: 700, y: 1800 - 1230 },
        { x: 480, y: 1800 - 1530 },
    ],
    enemies: [
        { x: 50, y: 1800 - 300, type: 'volatile' },
        { x: 900, y: 1800 - 800, type: 'volatile' },
        { x: 50, y: 1800 - 1300, type: 'volatile' },
    ],
    spikes: [
        { x: 300, y: 1800 - 250, type: 'air' },
        { x: 800, y: 1800 - 650, type: 'air' },
        { x: 200, y: 1800 - 1050, type: 'air' },
        { x: 700, y: 1800 - 1450, type: 'air' },
    ],
    springs: [
        { x: 180, y: 1800 - 40 }, 
        { x: 500, y: 1800 - 450 },
        { x: 800, y: 1800 - 1100 }, 
    ],
    teleporters: [], 

    gravityInverted: false,
    enableDoubleJump: true,
    lifeUps: [
        { x: 900, y: 1800 - 50 },
        { x: 100, y: 1800 - 900 },
    ],
    enableHorizontalScrolling: true, 
    playerStartX: 100, 
    playerStartY: 1800 - 80 - 60 - 1 
};
		
// Niveau 39 (index 38) - Le Voyage Combin� 
levels[38] = {
    verticalScrolling: true, 
    enableHorizontalScrolling: true, 
    levelHeight: 1200,       
    levelWidth: 2000,        

    grounds: [
        { x: 0, y: 1200 - 20, width: 2000, height: 20, type: 'bottom' },
        { x: 0, y: 0, width: 2000, height: 20, type: 'top' },
    ],
    platforms: [
        { x: 200, y: 1200 - 150, width: 100, type: 'moving' },
        { x: 500, y: 1200 - 220, width: 120, type: 'disappearing' }, 
        { x: 800, y: 1200 - 300, width: 100, type: 'bouncy' },
        { x: 1100, y: 1200 - 380, width: 80, type: 'temporary' }, 
        { x: 1400, y: 1200 - 480, width: 120, type: 'moving' }, 
        { x: 1700, y: 1200 - 580, width: 100, type: 'disappearing' }, 
        { x: 100, y: 1200 - 680, width: 150, type: 'bouncy' },
        { x: 400, y: 1200 - 780, width: 80, type: 'temporary' }, 
        { x: 700, y: 1200 - 880, width: 100, type: 'moving' }, 
        { x: 1000, y: 1200 - 980, width: 120, type: 'disappearing' },
    ],
    modularPlatforms: [
        { x: 50, y: 1200 - 80, width: 150 },
        { x: 1800, y: 1200 - 100, width: 150 },
        { x: 350, y: 1200 - 180, width: 80 }, 
        { x: 1600, y: 1200 - 250, width: 100 }, 
        { x: 250, y: 1200 - 350, width: 120 },
        { x: 1700, y: 1200 - 450, width: 150 }, 
        { x: 500, y: 1200 - 550, width: 80 }, 
        { x: 1500, y: 1200 - 650, width: 100 }, 
        { x: 300, y: 1200 - 750, width: 120 }, 
        { x: 1600, y: 1200 - 850, width: 150 },
        { x: 900, y: 1200 - 950, width: 200 }, 
        { x: 950, y: 1200 - 1050, width: 100 },
    ],
    walls: [
        { x: 430, y: 1200 - 250, width: 20, height: 100 },
        { x: 1000, y: 1200 - 500, width: 20, height: 150 },
        { x: 600, y: 1200 - 850, width: 20, height: 100 },
        { x: 1200, y: 1200 - 1000, width: 20, height: 150 },
    ],
    stars: [
        { x: 120, y: 1200 - 110 }, 
        { x: 550, y: 1200 - 280 },
        { x: 850, y: 1200 - 380 },
        { x: 1150, y: 1200 - 480 },
        { x: 1450, y: 1200 - 580 },
        { x: 1750, y: 1200 - 680 },
        { x: 150, y: 1200 - 780 },
        { x: 450, y: 1200 - 880 },
        { x: 750, y: 1200 - 980 },
        { x: 1050, y: 1200 - 1080 },
    ],
    enemies: [
        { x: 300, y: 1200 - 300, type: 'volatile' },
        { x: 900, y: 1200 - 600, type: 'volatile' },
        { x: 1500, y: 1200 - 900, type: 'volatile' },
    ],
    spikes: [
        { x: 600, y: 1200 - 200, type: 'air' },
        { x: 1300, y: 1200 - 500, type: 'air' },
        { x: 200, y: 1200 - 800, type: 'air' },
        { x: 1000, y: 1200 - 1000, type: 'air' },
    ],
    springs: [
        { x: 200, y: 1200 - 40 }, 
        { x: 1900, y: 1200 - 200 }, 
        { x: 50, y: 1200 - 450 },
        { x: 1800, y: 1200 - 850 },
        { x: 900, y: 1200 - 1000 }, 
    ],
    teleporters: [], 

    gravityInverted: false,
    enableDoubleJump: false, 

    lifeUps: [
        { x: 1000, y: 1200 - 50 },
        { x: 50, y: 1200 - 1000 },
    ],
    playerStartX: 100, 
    playerStartY: 1200 - 80 - 60 - 1 
};

// Niveau 40 (index 39) - Le Grand Final
levels[39] = {
    verticalScrolling: true,
    enableHorizontalScrolling: true, 
    levelHeight: 1500,       
    levelWidth: 2500,        

    grounds: [
        { x: 0, y: 1500 - 20, width: 2500, height: 20, type: 'bottom' },
    ],
    platforms: [
        { x: 200, y: 1500 - 150, width: 100, type: 'moving' },
        { x: 500, y: 1500 - 250, width: 120, type: 'disappearing' },
        { x: 800, y: 1500 - 100, width: 120, type: 'bouncy' },
        { x: 1000, y: 1500 - 300, width: 80, type: 'temporary' },
        { x: 1200, y: 1500 - 450, width: 100, type: 'moving' }, 
        { x: 1400, y: 1500 - 600, width: 100, type: 'disappearing' },
        { x: 1600, y: 1500 - 750, width: 60, type: 'bouncy' }, 

        { x: 1800, y: 1500 - 900, width: 150, type: 'moving' }, 
        { x: 2000, y: 1500 - 1050, width: 100, type: 'temporary' },
        { x: 2200, y: 1500 - 1200, width: 120, type: 'disappearing' },
        { x: 1900, y: 1500 - 1350, width: 80, type: 'moving' }, 
    ],
    modularPlatforms: [
        { x: 50, y: 1500 - 80, width: 150 }, 
        { x: 900, y: 1500 - 50, width: 100 }, 
        { x: 1700, y: 1500 - 50, width: 100 }, 
        { x: 1100, y: 1500 - 200, width: 80 },
        { x: 1300, y: 1500 - 350, width: 100 },
        { x: 1500, y: 1500 - 500, width: 120 },
        { x: 1700, y: 1500 - 650, width: 150 }, 
        { x: 200, y: 1500 - 800, width: 100 },
        { x: 500, y: 1500 - 950, width: 120 },
        { x: 800, y: 1500 - 1100, width: 150 },
        { x: 1200, y: 1500 - 1250, width: 100 },
        { x: 2000, y: 1500 - 1300, width: 200 }, 
				{ x: 1000, y: 1500 - 1400, width: 100 }, 
    ],
    walls: [
        { x: 350, y: 1500 - 200, width: 20, height: 100 },
        { x: 930, y: 1500 - 400, width: 20, height: 150 },
        { x: 1350, y: 1500 - 600, width: 20, height: 150 },
        { x: 1750, y: 1500 - 780, width: 20, height: 130 },
        { x: 1950, y: 1500 - 1000, width: 20, height: 150 },
        { x: 2150, y: 1500 - 1150, width: 20, height: 150 },
    ],
    stars: [
        { x: 120, y: 1500 - 110 }, 
       // { x: 550, y: 1500 - 280 },
       // { x: 850, y: 1500 - 130 },
       // { x: 1150, y: 1500 - 480 },
       // { x: 1450, y: 1500 - 630 },
        //{ x: 1790, y: 1500 - 780 },
        //{ x: 250, y: 1500 - 830 },
        //{ x: 550, y: 1500 - 980 },
        //{ x: 850, y: 1500 - 1130 },
        //{ x: 1250, y: 1500 - 1280 },
        //{ x: 1950, y: 1500 - 1380 },
        //{ x: 1050, y: 1500 - 1480 },
    ],
    enemies: [
        { x: 300, y: 1500 - 300, type: 'volatile' },
        { x: 1300, y: 1500 - 550, type: 'volatile' },
        { x: 1900, y: 1500 - 950, type: 'volatile' },
        { x: 2100, y: 1500 - 1100, type: 'volatile' },
        { x: 1300, y: 1500 - 1400, type: 'volatile' }, 
    ],
    spikes: [
        { x: 650, y: 1500 - 200, type: 'air' },
        { x: 1100, y: 1500 - 380, type: 'air' },
        { x: 1500, y: 1500 - 650, type: 'air' },
        { x: 1900, y: 1500 - 1000, type: 'air' },
        { x: 2250, y: 1500 - 1400, type: 'air' },
        { x: 950, y: 1500 - 1400, type: 'air' }, 
    ],
    springs: [
        { x: 100, y: 1500 - 40 }, 
        { x: 700, y: 1500 - 40 },
        { x: 1000, y: 1500 - 250 },
        { x: 200, y: 1500 - 900 },
        { x: 1100, y: 1500 - 1150 },
    ],
    teleporters: [
        { x: 2400, y: 1500 - 80, id: "FinalShortcut" }, 
        { x: 100, y: 1500 - 1300, id: "FinalShortcut" }, 
    ],
    gravityInverted: false,
    enableDoubleJump: false,

    lifeUps: [
        { x: 2000, y: 1500 - 50 },
        { x: 100, y: 1500 - 1000 },
        { x: 2400, y: 1500 - 1400 },
    ],
    playerStartX: 100, 
    playerStartY: 1500 - 80 - 60 - 1 
};
}
		

