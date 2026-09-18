/* =========================================================
   1. CONFIGURATION & CONSTANTES
   ========================================================= */
const speedBtnGroup = document.querySelector('.speed-btn-group');
const INVERTED_SPRITES = ['zombie2', 'zombie3', 'boss1'];

const ZOMBIE_METADATA = { 
    'zombie1': { frames: 7, animDelay: 10 }, 
    'zombie2': { frames: 8, animDelay: 10 },  
    'zombie3': { frames: 8, animDelay: 10 }, 
    'zombie4': { frames: 8, animDelay: 10 }, 
    'zombie5': { frames: 8, animDelay: 10 }, 
    'zombie6': { frames: 4, animDelay: 20 }, 
    'zombie7': { frames: 18, animDelay: 8 }, 
    'zombie8': { frames: 4, animDelay: 20 }, 
    'boss1': { frames: 15, animDelay: 10 },
    'boss2': { frames: 12, animDelay: 12 },
    'boss3': { frames: 14, animDelay: 10 },
    'boss4': { frames: 13, animDelay: 11 }
};

const ZOMBIE_NAMES = {
    'zombie1': "Gégé la veste",
    'zombie2': "La veuve Brise-Crane",
    'zombie3': "Bob le chantier",
    'zombie4': "Blanche-Nuit",
    'zombie5': "Patient Zero",
    'zombie6': "L'Officier Morsure",
    'zombie7': "Boomer",
    'zombie8': "Jean L'éclair",
    'boss1': "Sylas le Sanglant",
    'boss2': "L'Œil du Chaos",
    'boss3': "Hexa-Mort",
    'boss4': "Le général de la Horde"
};

function getZombieTypeName(variant) {
    switch(variant) {
        case 'sprinter': return 'Rapide';
        case 'tank': return 'Tank';
        case 'kamikaze': return 'Kamikaze';
        case 'boss': return 'Boss';
        default: return 'Normal';
    }
}

const CONFIG = {
    coinDropMin: 5, coinDropMax: 15, bossDiamondDropBase: 50, mineBaseInterval: 10000, spawnInterval: 600, difficultyMultiplierDay: 0.25, spriteAnimSpeed: 40,
    towerDisplayWidth: 180, mineSize: 100, zombieSize: 40, bossSize: 120, arrowDisplayWidth: 8, bloodScale: 2,         
    enemies: { normal: [0, 1, 4, 5], sprinter: [3, 7], tank: 2, kamikaze: 6 },
    spells: {
        prison: { id: 'prison', name: 'Prison (1)', cost: 10, cooldown: 30000, duration: 5000, icon: './images/prison.jpg', desc: "Immobilise un ennemi.", color: '#e74c3c' },
        rain: { id: 'rain', name: 'Pluie de Flèches (2)', cost: 20, cooldown: 20000, damage: 200, radius: 90, arrowCount: 15, icon: './images/pluiefleche.jpg', desc: "Zone de dégâts.", color: '#f39c12' },
        circle: { id: 'circle', name: 'Cercle de Flèches (3)', baseCost: 20, cooldown: 10000, icon: './images/cerclefleche.png', desc: "Tire en cercle autour du bastion.", color: '#9b59b6' },
    },
    images: {
        bg: './images/fond.png', bg_menu: './images/fondaccueil.jpg', tower: './images/bastion.png', mine: './images/minediamant.png',
        coin: './images/piece.png', diamond: './images/diamant.png',
        zombies: Array.from({length: 8}, (_, i) => `./images/zombie${i+1}.png`),
        bosses: Array.from({length: 4}, (_, i) => `./images/boss${i+1}.png`),
        arrow: './images/fleche.png', blood: './images/sang.png', barreau: './images/barreau.png',
        prison_icon: './images/prison.jpg', rain_icon: './images/pluiefleche.jpg', cercle_icon: './images/cerclefleche.png'
    }
};

const FORMULAS = {
    getRange: (lvl) => 200 + ((lvl - 1) * ((500 - 200) / 24)),
    getAttackDelay: (lvl) => Math.max(150, 1000 + ((lvl - 1) * ((500 - 1000) / 24))),
    getMineProduction: (lvl) => Math.floor(1 + ((lvl - 1) * ((26 - 1) / 24))),
    getWaveBonus: (lvl) => Math.floor(((lvl - 1) / 24) * 300),
    getDamage: (lvl) => 10 + ((lvl - 1) * ((100 - 10) / 24)),
    getCritChance: (lvl) => 5 + ((lvl - 1) * ((50 - 5) / 24)),
    getMultiShotChance: (lvl) => ((lvl - 1) / 24) * 25,
    getMaxHp: (lvl) => 100 + ((lvl - 1) * ((1000 - 100) / 24)),
    getRegen: (lvl) => (lvl - 1) * 1,
    getLifesteal: (lvl) => ((lvl - 1) / 24) * 20,
    getBossDiamondBonus: (lvl) => (lvl - 1) * 2,
    getKillBonus: (lvl) => lvl,
};

const SPELL_FORMULAS = {
    getPrisonCost: (lvl) => Math.max(1, 10 - (lvl - 1)),
    getPrisonDuration: (lvl) => 5000 + ((lvl - 1) * ((15000 - 5000) / 9)),
    getRainCost: (lvl) => Math.max(10, 20 - (lvl - 1)),
    getRainDamage: (lvl) => 200 + ((lvl - 1) * ((400 - 200) / 9)),
    getCircleCost: (lvl) => Math.max(10, 20 - (lvl - 1)), 
    getCircleCount: (lvl) => 10 + ((lvl - 1) * 2) 
};

const UPGRADES_DATA = [
    { id: 'damage', name: "Dégâts", tab: "Bastion", basePrice: 50, labBasePrice:5, ratio: 1.5, maxLevel: 25, description: "Puissance de tir.", formula: FORMULAS.getDamage },
    { id: 'speed', name: "Vitesse Tir", tab: "Bastion", basePrice: 80, labBasePrice: 8, ratio: 1.6, maxLevel: 25, description: "Délai de recharge.", formula: FORMULAS.getAttackDelay },
    { id: 'crit', name: "Coup Critique", tab: "Bastion", basePrice: 120, labBasePrice: 12, ratio: 1.7, maxLevel: 25, description: "Chance de dégâts x2.", formula: FORMULAS.getCritChance },
    { id: 'multishot', name: "Tir Multiple", tab: "Bastion", basePrice: 80, labBasePrice: 8, ratio: 1.6, maxLevel: 25, description: "Chance de tirer 2 flèches.", formula: FORMULAS.getMultiShotChance },
    { id: 'range', name: "Portée Tour", tab: "Bastion", basePrice: 40, labBasePrice: 4, ratio: 1.3, maxLevel: 25, description: "Distance de tir.", formula: FORMULAS.getRange },
    { id: 'hp', name: "PV Max", tab: "PV", basePrice: 30, labBasePrice: 3, ratio: 1.4, maxLevel: 25, description: "Point de vie du Bastion.", formula: FORMULAS.getMaxHp },
    { id: 'regen', name: "Régénération", tab: "PV", basePrice: 150, labBasePrice: 15, ratio: 1.6, maxLevel: 25, description: "Soigne automatiquement.", formula: FORMULAS.getRegen },
    { id: 'lifesteal', name: "Vol de vie", tab: "PV", basePrice: 200, labBasePrice: 20, ratio: 1.8, maxLevel: 25, description: "Vole des PV aux ennemis.", formula: FORMULAS.getLifesteal },
    { id: 'wave_bonus', name: "Argent Vague", tab: "Économie", basePrice: 60, labBasePrice: 6, ratio: 1.4, maxLevel: 25, description: "Gain de pièces par vague.", formula: FORMULAS.getWaveBonus },
    { id: 'mine_rate', name: "Production Mine", tab: "Économie", basePrice: 100, labBasePrice: 10, ratio: 1.5, maxLevel: 25, description: "Diamants toute les 10s", formula: FORMULAS.getMineProduction },
    { id: 'boss_diamond', name: "Diamant Boss", tab: "Économie", basePrice: 20, labBasePrice: 2, ratio: 1.5, maxLevel: 25, description: "Diamants en plus par Boss.", formula: FORMULAS.getBossDiamondBonus },
    { id: 'kill_bonus', name: "Argent par kill", tab: "Économie", basePrice: 20, labBasePrice: 2, ratio: 1.5, maxLevel: 25, description: "+1 Pièce par ennemi tué.", formula: FORMULAS.getKillBonus },
    { id: 'prison_cost', name: "Coût Prison", tab: "Sorts", basePrice: 100, labBasePrice: 10, ratio: 1.5, maxLevel: 10, description: "Réduit le coût du sort Prison.", formula: SPELL_FORMULAS.getPrisonCost },
    { id: 'prison_duration', name: "Durée Prison", tab: "Sorts", basePrice: 150, labBasePrice: 15, ratio: 1.5, maxLevel: 10, description: "Augmente la durée d'immobilisation.", formula: SPELL_FORMULAS.getPrisonDuration },
    { id: 'rain_cost', name: "Coût Pluie", tab: "Sorts", basePrice: 100, labBasePrice: 10, ratio: 1.5, maxLevel: 10, description: "Réduit le coût de la Pluie.", formula: SPELL_FORMULAS.getRainCost },
    { id: 'rain_damage', name: "Dégâts Pluie", tab: "Sorts", basePrice: 150, labBasePrice: 15, ratio: 1.5, maxLevel: 10, description: "Augmente les dégâts de la Pluie.", formula: SPELL_FORMULAS.getRainDamage },
    { id: 'circle_cost', name: "Coût Cercle", tab: "Sorts", basePrice: 100, labBasePrice: 10, ratio: 1.5, maxLevel: 10, description: "Réduit le coût du sort Cercle.", formula: SPELL_FORMULAS.getCircleCost },
    { id: 'circle_count', name: "Flèches Plus", tab: "Sorts", basePrice: 150, labBasePrice: 15, ratio: 1.5, maxLevel: 10, description: "+2 Flèches pour le Cercle.", formula: SPELL_FORMULAS.getCircleCount }
];

const FORMATION_TYPES = { SINGLE: 'single', CLUSTER: 'cluster', SQUARE: 'square', LINE: 'line', HORDE: 'horde' };

const DAY_SCHEMAS = {
    1: [
        { wave: 1, enemies: [{type: 'normal', count: 5, hpMult: 1.0}] },
        { wave: 2, enemies: [{type: 'normal', count: 6, formation: 'cluster', hpMult: 1.1}] }, 
        { wave: 3, enemies: [{type: 'sprinter', count: 4, formation: 'single', hpMult: 0.9}, {type: 'normal', count: 4, formation: 'single', hpMult: 1.1}] },
        { wave: 4, enemies: [{type: 'kamikaze', count: 4, formation: 'line', hpMult: 1.0}] }, 
        { wave: 5, enemies: [{type: 'tank', count: 2, formation: 'single', hpMult: 1.8}, {type: 'normal', count: 5, formation: 'single', hpMult: 1.2}] },
        { wave: 6, enemies: [{type: 'sprinter', count: 8, formation: 'line', hpMult: 1.0}] },
        { wave: 7, enemies: [{type: 'normal', count: 10, formation: 'single', hpMult: 1.3}] },
        { wave: 8, enemies: [{type: 'normal', count: 8, formation: 'horde', hpMult: 1.2}] }, 
        { wave: 9, enemies: [{type: 'tank', count: 3, formation: 'line', hpMult: 1.5}] },
        { wave: 10, enemies: [{type: 'boss', count: 1, formation: 'single', hpMult: 5}] }
    ],
    2: [
        { wave: 1, enemies: [{type: 'normal', count: 6, formation: 'single', hpMult: 1.3}] },
        { wave: 2, enemies: [{type: 'sprinter', count: 8, formation: 'square', hpMult: 1.2}] }, 
        { wave: 3, enemies: [{type: 'kamikaze', count: 5, formation: 'single', hpMult: 1.2}, {type: 'normal', count: 5, formation: 'single', hpMult: 1.3}] },
        { wave: 4, enemies: [{type: 'normal', count: 10, formation: 'cluster', hpMult: 1.4}] },
        { wave: 5, enemies: [{type: 'tank', count: 2, formation: 'single', hpMult: 2.2}, {type: 'sprinter', count: 8, formation: 'single', hpMult: 1.1}] },
        { wave: 6, enemies: [{type: 'kamikaze', count: 6, formation: 'line', hpMult: 1.1}] },
        { wave: 7, enemies: [{type: 'sprinter', count: 12, formation: 'single', hpMult: 1.2}] },
        { wave: 8, enemies: [{type: 'sprinter', count: 10, formation: 'horde', hpMult: 1.3}] }, 
        { wave: 9, enemies: [{type: 'tank', count: 4, formation: 'square', hpMult: 2.0}] }, 
        { wave: 10, enemies: [{type: 'boss', count: 1, formation: 'single', hpMult: 10}] }
    ],
    3: [
        { wave: 1, enemies: [{type: 'normal', count: 8, formation: 'single', hpMult: 1.5}] },
        { wave: 2, enemies: [{type: 'tank', count: 4, formation: 'line', hpMult: 2.0}] }, 
        { wave: 3, enemies: [{type: 'normal', count: 5, formation: 'single', hpMult: 1.6}, {type: 'tank', count: 2, formation: 'single', hpMult: 2.2}] },
        { wave: 4, enemies: [{type: 'kamikaze', count: 8, formation: 'square', hpMult: 1.3}] },
        { wave: 5, enemies: [{type: 'tank', count: 3, formation: 'single', hpMult: 2.5}, {type: 'normal', count: 10, formation: 'single', hpMult: 1.6}] },
        { wave: 6, enemies: [{type: 'sprinter', count: 10, formation: 'line', hpMult: 1.4}] },
        { wave: 7, enemies: [{type: 'tank', count: 5, formation: 'single', hpMult: 2.1}] },
        { wave: 8, enemies: [{type: 'tank', count: 6, formation: 'cluster', hpMult: 2.3}] }, 
        { wave: 9, enemies: [{type: 'normal', count: 15, formation: 'horde', hpMult: 1.8}] },
        { wave: 10, enemies: [{type: 'boss', count: 1, formation: 'single', hpMult: 15}] }
    ],
    4: [
        { wave: 1, enemies: [{type: 'normal', count: 10, formation: 'single', hpMult: 1.8}] },
        { wave: 2, enemies: [{type: 'kamikaze', count: 8, formation: 'horde', hpMult: 1.2}] }, 
        { wave: 3, enemies: [{type: 'kamikaze', count: 5, formation: 'single', hpMult: 1.3}, {type: 'sprinter', count: 5, formation: 'single', hpMult: 1.5}] },
        { wave: 4, enemies: [{type: 'tank', count: 4, formation: 'square', hpMult: 2.5}] },
        { wave: 5, enemies: [{type: 'normal', count: 12, formation: 'single', hpMult: 2.0}] },
        { wave: 6, enemies: [{type: 'kamikaze', count: 10, formation: 'line', hpMult: 1.4}] }, 
        { wave: 7, enemies: [{type: 'tank', count: 3, formation: 'single', hpMult: 2.6}, {type: 'kamikaze', count: 6, formation: 'single', hpMult: 1.3}] },
        { wave: 8, enemies: [{type: 'normal', count: 15, formation: 'cluster', hpMult: 2.0}] },
        { wave: 9, enemies: [{type: 'kamikaze', count: 10, formation: 'square', hpMult: 1.5}] },
        { wave: 10, enemies: [{type: 'boss', count: 1, formation: 'single', hpMult: 22}] }
    ],
    5: [
        { wave: 1, enemies: [{type: 'normal', count: 12, formation: 'single', hpMult: 2.2}] },
        { wave: 2, enemies: [{type: 'sprinter', count: 6, formation: 'square', hpMult: 1.6}, {type: 'tank', count: 2, formation: 'square', hpMult: 2.8}] }, 
        { wave: 3, enemies: [{type: 'kamikaze', count: 6, formation: 'single', hpMult: 1.5}, {type: 'normal', count: 8, formation: 'single', hpMult: 2.2}] },
        { wave: 4, enemies: [{type: 'tank', count: 5, formation: 'line', hpMult: 2.8}] },
        { wave: 5, enemies: [{type: 'sprinter', count: 15, formation: 'single', hpMult: 1.6}] },
        { wave: 6, enemies: [{type: 'kamikaze', count: 12, formation: 'horde', hpMult: 1.5}] },
        { wave: 7, enemies: [{type: 'tank', count: 6, formation: 'single', hpMult: 2.8}, {type: 'sprinter', count: 8, formation: 'single', hpMult: 1.7}] },
        { wave: 8, enemies: [{type: 'normal', count: 20, formation: 'line', hpMult: 2.4}] }, 
        { wave: 9, enemies: [{type: 'tank', count: 4, formation: 'square', hpMult: 3.0}, {type: 'kamikaze', count: 4, formation: 'square', hpMult: 1.6}] },
        { wave: 10, enemies: [{type: 'boss', count: 1, formation: 'single', hpMult: 30}] }
    ],
    6: [
        { wave: 1, enemies: [{type: 'sprinter', count: 15, formation: 'single', hpMult: 1.8}] },
        { wave: 2, enemies: [{type: 'sprinter', count: 12, formation: 'cluster', hpMult: 1.9}] },
        { wave: 3, enemies: [{type: 'kamikaze', count: 8, formation: 'single', hpMult: 1.6}, {type: 'tank', count: 4, formation: 'single', hpMult: 3.0}] },
        { wave: 4, enemies: [{type: 'sprinter', count: 10, formation: 'line', hpMult: 2.0}] }, 
        { wave: 5, enemies: [{type: 'normal', count: 15, formation: 'single', hpMult: 2.6}] },
        { wave: 6, enemies: [{type: 'sprinter', count: 15, formation: 'horde', hpMult: 1.8}] },
        { wave: 7, enemies: [{type: 'kamikaze', count: 10, formation: 'single', hpMult: 1.7}, {type: 'sprinter', count: 10, formation: 'single', hpMult: 1.9}] },
        { wave: 8, enemies: [{type: 'tank', count: 6, formation: 'cluster', hpMult: 3.2}] },
        { wave: 9, enemies: [{type: 'sprinter', count: 20, formation: 'line', hpMult: 2.0}] },
        { wave: 10, enemies: [{type: 'boss', count: 1, formation: 'single', hpMult: 40}] }
    ],
    7: [
        { wave: 1, enemies: [{type: 'normal', count: 20, formation: 'single', hpMult: 2.8}] },
        { wave: 2, enemies: [{type: 'normal', count: 15, formation: 'horde', hpMult: 2.6}] }, 
        { wave: 3, enemies: [{type: 'tank', count: 5, formation: 'single', hpMult: 3.2}, {type: 'normal', count: 15, formation: 'single', hpMult: 2.8}] },
        { wave: 4, enemies: [{type: 'kamikaze', count: 15, formation: 'square', hpMult: 1.8}] },
        { wave: 5, enemies: [{type: 'sprinter', count: 15, formation: 'single', hpMult: 2.1}] },
        { wave: 6, enemies: [{type: 'tank', count: 8, formation: 'line', hpMult: 3.3}] }, 
        { wave: 7, enemies: [{type: 'normal', count: 25, formation: 'single', hpMult: 2.8}] },
        { wave: 8, enemies: [{type: 'normal', count: 20, formation: 'cluster', hpMult: 2.8}] },
        { wave: 9, enemies: [{type: 'kamikaze', count: 15, formation: 'line', hpMult: 1.8}] },
        { wave: 10, enemies: [{type: 'boss', count: 2, formation: 'single', hpMult: 40}] }
    ],
    8: [
        { wave: 1, enemies: [{type: 'normal', count: 15, formation: 'single', hpMult: 3.2}, {type: 'tank', count: 3, formation: 'single', hpMult: 3.5}] },
        { wave: 2, enemies: [{type: 'tank', count: 8, formation: 'square', hpMult: 3.4}] }, 
        { wave: 3, enemies: [{type: 'sprinter', count: 15, formation: 'single', hpMult: 2.3}, {type: 'kamikaze', count: 10, formation: 'single', hpMult: 1.9}] },
        { wave: 4, enemies: [{type: 'normal', count: 25, formation: 'horde', hpMult: 3.0}] },
        { wave: 5, enemies: [{type: 'tank', count: 6, formation: 'single', hpMult: 3.5}, {type: 'sprinter', count: 10, formation: 'single', hpMult: 2.3}] },
        { wave: 6, enemies: [{type: 'kamikaze', count: 15, formation: 'cluster', hpMult: 2.0}] },
        { wave: 7, enemies: [{type: 'tank', count: 10, formation: 'line', hpMult: 3.5}] },
        { wave: 8, enemies: [{type: 'sprinter', count: 20, formation: 'horde', hpMult: 2.3}] },
        { wave: 9, enemies: [{type: 'normal', count: 10, formation: 'square', hpMult: 3.4}, {type: 'kamikaze', count: 6, formation: 'square', hpMult: 2.0}] },
        { wave: 10, enemies: [{type: 'boss', count: 2, formation: 'single', hpMult: 50}] }
    ],
    9: [
        { wave: 1, enemies: [{type: 'sprinter', count: 20, formation: 'single', hpMult: 2.5}, {type: 'normal', count: 15, formation: 'single', hpMult: 3.5}] },
        { wave: 2, enemies: [{type: 'tank', count: 10, formation: 'line', hpMult: 3.8}, {type: 'kamikaze', count: 10, formation: 'line', hpMult: 2.1}] }, 
        { wave: 3, enemies: [{type: 'tank', count: 5, formation: 'single', hpMult: 3.8}, {type: 'sprinter', count: 10, formation: 'single', hpMult: 2.5}, {type: 'normal', count: 10, formation: 'single', hpMult: 3.5}] },
        { wave: 4, enemies: [{type: 'kamikaze', count: 20, formation: 'horde', hpMult: 2.2}] }, 
        { wave: 5, enemies: [{type: 'normal', count: 30, formation: 'single', hpMult: 3.5}] },
        { wave: 6, enemies: [{type: 'tank', count: 8, formation: 'square', hpMult: 3.8}] }, 
        { wave: 7, enemies: [{type: 'sprinter', count: 25, formation: 'single', hpMult: 2.5}, {type: 'tank', count: 5, formation: 'single', hpMult: 3.8}] },
        { wave: 8, enemies: [{type: 'normal', count: 25, formation: 'cluster', hpMult: 3.6}] },
        { wave: 9, enemies: [{type: 'tank', count: 10, formation: 'line', hpMult: 4.0}, {type: 'kamikaze', count: 15, formation: 'line', hpMult: 2.2}] }, 
        { wave: 10, enemies: [{type: 'boss', count: 2, formation: 'single', hpMult: 60}] } 
    ]
};

const WAVE_SCHEMA = [
    { wave: 1, enemies: [{type: 'normal', count: 30, formation: 'single', spawnInterval: 300, hpMult: 4}] },
    { wave: 2, enemies: [{type: 'sprinter', formation: 'horde', count: 20, spawnInterval: 300, hpMult: 3}, {type: 'normal', count: 20, formation: 'single', spawnInterval: 300, hpMult: 4}] },
    { wave: 3, enemies: [{type: 'tank', count: 10, formation: 'single', spawnInterval: 400, hpMult: 4}, {type: 'normal', count: 8, formation: 'line', spawnInterval: 400, hpMult: 4}] },
    { wave: 4, enemies: [{type: 'kamikaze', count: 10, spawnInterval: 300, hpMult: 3}, {type: 'kamikaze', spawnInterval: 300, count: 10, hpMult: 3}] },
    { wave: 5, enemies: [{type: 'tank', formation: 'cluster', count: 8, hpMult: 4}, {type: 'boss', count: 1, hpMult: 70}] },
    { wave: 6, enemies: [{type: 'normal', count: 40, formation: 'single', spawnInterval: 300, hpMult: 5}, {type: 'kamikaze', formation: 'single', spawnInterval: 300, count: 15, hpMult: 3.2}] },
    { wave: 7, enemies: [{type: 'tank', count: 10, formation: 'horde', spawnInterval: 200, hpMult: 5}, {type: 'sprinter', formation: 'horde', spawnInterval: 200, count: 10, hpMult: 3.5}] },
    { wave: 8, enemies: [{type: 'sprinter', count: 40, formation: 'single', spawnInterval: 200, hpMult: 1.6}, {type: 'normal', count: 5, formation: 'single', spawnInterval: 200, hpMult: 5}] },
    { wave: 9, enemies: [{type: 'kamikaze', count: 20, formation: 'horde', spawnInterval: 100, hpMult: 3.5}, {type: 'tank', count: 10, formation: 'line', spawnInterval: 100, hpMult: 6}, {type: 'normal', formation: 'single', spawnInterval: 100, count: 50, hpMult: 5}] },
    { wave: 10, enemies: [{type: 'boss', count: 2, hpMult: 70}] }
];

let playerData = {
    diamonds: 0, upgrades: {}, settings: { music: 50, sfx: 80 },
    stats: { totalRuns: 0, totalKills: 0, totalBossKills: 0, totalDiamondsEarned: 0, bestRun: { day: 0, wave: 0, diamonds: 0, date: '' } }
};

UPGRADES_DATA.forEach(u => {
    if (playerData.upgrades[u.id] === undefined) playerData.upgrades[u.id] = 1;
});

let game = {
    state: 'MENU', day: 1, wave: 1, coins: 0, hp: 100, maxHp: 100, lastTime: 0, mineTimer: 0, speedMultiplier: 1, tempLevels: {}, 
    enemies: [], projectiles: [], particles: [], floatingTexts: [], bloodSplats: [], droppedDiamonds: [],
    spells: { prison: { lastCast: 0 }, rain: { lastCast: 0 }, circle: { lastCast: 0 } },
    targetingSpell: null, fallingArrows: [], waveActive: false, waveQueue: [], waveTotalEnemies: 0, waveKilledEnemies: 0, spawnTimer: 0, runDiamonds: 0, selectedEnemy: null, mouseX: 0, mouseY: 0
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sounds = {};

function playSound(id, volumeType = 'sfx') {
    if (!sounds[id]) return;
    let vol = 1.0;
    if (volumeType === 'sfx') vol = playerData.settings.sfx / 100;
    if (volumeType === 'music') vol = playerData.settings.music / 100;
    if (vol <= 0) return;

    try {
        const snd = sounds[id];
        snd.volume = vol;
        if (id !== 'musique') {
             const clone = snd.cloneNode();
             clone.volume = vol;
             clone.play().catch(e => console.error("ÉCHEC LECTURE DU FICHIER : " + id, e));
        } else {
             snd.currentTime = 0;
             snd.play().catch(e => console.error("ÉCHEC LECTURE MUSIQUE : ", e));
        }
    } catch (e) { console.error("Erreur critique playSound:", id, e); }
}

const assets = {};
function loadAssets() {
    const loader = (key, src) => {
        const img = new Image();
        img.src = src;
        assets[key] = img;
    };
    loader('bg', CONFIG.images.bg);
    loader('bg_menu', CONFIG.images.bg_menu);
    loader('tower', CONFIG.images.tower);
    loader('mine', CONFIG.images.mine);
    loader('coin', CONFIG.images.coin);
    loader('diamond', CONFIG.images.diamond);
    loader('arrow', CONFIG.images.arrow);
    loader('blood', CONFIG.images.blood);
    loader('barreau', CONFIG.images.barreau);
    loader('prison_icon', CONFIG.images.prison_icon);
    loader('rain_icon', CONFIG.images.rain_icon);
    loader('circle_icon', CONFIG.images.cercle_icon);
    
    CONFIG.images.zombies.forEach((src, i) => loader(`zombie${i+1}`, src));
    CONFIG.images.bosses.forEach((src, i) => loader(`boss${i+1}`, src));
    
    const sndLoader = (key, src) => {
        const aud = new Audio();
        aud.src = src;
        sounds[key] = aud;
    };

    sndLoader('amelioration', './son/amelioration.mp3');
    sndLoader('erreur', './son/erreur.mp3');
    sndLoader('fermeture', './son/fermeture.mp3');
    sndLoader('fleche', './son/fleche.mp3');
    sndLoader('mort', './son/mort.mp3');
    sndLoader('mort2', './son/mort2.mp3');
    sndLoader('mort3', './son/mort3.mp3');
    sndLoader('mort4', './son/mort4.mp3');
    sndLoader('mort5', './son/mort5.mp3');
    sndLoader('mort6', './son/mort6.mp3');
    sndLoader('mortboss', './son/mortboss.mp3');
    sndLoader('musique', './son/musique.mp3');
    sounds['musique'].loop = true; 
    sounds['musique'].volume = playerData.settings.music / 100;
    sndLoader('onglet', './son/onglet.mp3');
    sndLoader('pluiefleche', './son/pluiefleche.mp3');
    sndLoader('cerclefleche', './son/cerclefleche.mp3');
    sndLoader('prison', './son/prison.mp3');
    sndLoader('explosion', './son/explosion.mp3');
    sndLoader('transitionjour', './son/transitionjour.mp3');
    sndLoader('fin', './son/fin.mp3');
}

const musicSlider = document.getElementById('vol-music');
const sfxSlider = document.getElementById('vol-sfx');

musicSlider.addEventListener('input', (e) => {
    const volumeValue = e.target.value / 100;
    if(sounds['musique']) sounds['musique'].volume = volumeValue;
    playerData.settings.music = e.target.value;
    localStorage.setItem('zombieTD_save_v7', JSON.stringify(playerData));
});

sfxSlider.addEventListener('input', (e) => {
    playerData.settings.sfx = e.target.value;
    localStorage.setItem('zombieTD_save_v7', JSON.stringify(playerData));
});

function loadData() {
    const saved = localStorage.getItem('zombieTD_save_v7');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            playerData = { ...playerData, ...parsed };
            UPGRADES_DATA.forEach(u => {
                if (playerData.upgrades[u.id] === undefined) playerData.upgrades[u.id] = 1;
            });
            document.getElementById('vol-music').value = playerData.settings.music;
            document.getElementById('vol-sfx').value = playerData.settings.sfx;
        } catch(e) { console.error("Save corrompu"); }
    }
    updateMenuUI();
    generateLabUI();
}

function saveData() {
    playerData.settings.music = document.getElementById('vol-music').value;
    playerData.settings.sfx = document.getElementById('vol-sfx').value;
    localStorage.setItem('zombieTD_save_v7', JSON.stringify(playerData));
}

function getTotalLevel(id) {
    const labLvl = playerData.upgrades[id] || 1;
    const tempLvl = game.tempLevels[id] || 0;
    return labLvl + tempLvl;
}

function initGame() {
    game.runStats = { kills: 0, bosses: 0, startTime: Date.now() };
    game.day = 1; game.wave = 1; game.coins = 100; game.runDiamonds = 0;
    game.bloodSplats = []; game.targetingSpell = null; game.fallingArrows = [];
    game.spells.prison.lastCast = -99999; game.spells.rain.lastCast = -99999; game.speedMultiplier = 1;
    
    UPGRADES_DATA.forEach(u => game.tempLevels[u.id] = 0);
    game.enemies = []; game.projectiles = []; game.particles = []; game.floatingTexts = []; game.droppedDiamonds = [];
    
    applyUpgradeStats();
    game.hp = game.maxHp; 
    game.state = 'PLAYING';
    
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');
    document.getElementById('hud-bar').classList.remove('hidden');
    speedBtnGroup.classList.remove('hidden');
    document.getElementById('btn-settings').classList.remove('hidden');
    
    updateHUD();
    startWave();
    if(sounds['musique']) {
        sounds['musique'].currentTime = 0;
        sounds['musique'].play();
    }
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function applyUpgradeStats() {
    const hpLvl = getTotalLevel('hp');
    game.maxHp = FORMULAS.getMaxHp(hpLvl);
    if (game.hp > game.maxHp) game.hp = game.maxHp;
}

function startWave() {
    game.waveActive = true;
    game.waveQueue = generateWave(game.day, game.wave);
    game.spawnTimer = 0;
    game.waveKilledEnemies = 0;
    game.waveTotalEnemies = game.waveQueue.length;
    const daySchemas = DAY_SCHEMAS[game.day];
    let customInterval = null;
    
    if (daySchemas) {
        const currentWaveSchema = daySchemas.find(w => w.wave === game.wave);
        if (currentWaveSchema && currentWaveSchema.spawnInterval) {
            customInterval = currentWaveSchema.spawnInterval;
        }
    }
    game.currentSpawnInterval = customInterval || CONFIG.spawnInterval;
    
    const bonus = FORMULAS.getWaveBonus(getTotalLevel('wave_bonus'));
    if (bonus > 0) {
        game.coins += bonus;
        createFloatingText(`+${bonus}`, canvas.width / 2, canvas.height / 2 - 50, '#f1c40f', {icon: 'coin'});
    }
    updateHUD();
}

function generateWave(day, waveNum) {
    let enemiesToQueue = [];
    const customDay = DAY_SCHEMAS[day];
    
    if (customDay) {
        const schema = customDay.find(w => w.wave === waveNum);
        if (schema) enemiesToQueue = JSON.parse(JSON.stringify(schema.enemies));
    } else {
        const schemaIndex = (waveNum - 1) % WAVE_SCHEMA.length; 
        const baseWaveData = WAVE_SCHEMA[schemaIndex];
        const difficultyScale = 1 + ((day - 10) * 0.2); 
        let waveData = JSON.parse(JSON.stringify(baseWaveData));
        waveData.enemies.forEach(group => {
            if (group.count) {
                group.count = Math.ceil(group.count * difficultyScale);
                if (group.count < 1) group.count = 1; 
            }
            if (group.hpMult) group.hpMult = group.hpMult * difficultyScale;
        });
        enemiesToQueue = waveData.enemies;
    }

    let finalQueue = [];
    enemiesToQueue.forEach(group => {
        const count = group.count || 1;
        const formation = group.formation || 'single';
        let offsets = [];
        const spread = 60; 

        if (formation === 'single') offsets = [{x:0, y:0}];
        else if (formation === 'cluster') { for(let i=0; i<3; i++) offsets.push({x: (Math.random()-0.5)*40, y: (Math.random()-0.5)*40}); }
        else if (formation === 'square') { offsets = [{x: -spread, y: -spread}, {x: spread, y: -spread}, {x: -spread, y: spread}, {x: spread, y: spread}]; }
        else if (formation === 'line') { for(let i=0; i<Math.min(count, 5); i++) offsets.push({x: (i - 2) * spread, y: 0}); }
        else if (formation === 'horde') { for(let i=0; i<Math.min(count, 10); i++) offsets.push({x: (Math.random()-0.5)*spread*3, y: (Math.random()-0.5)*spread*3}); }

        let groupSide, groupBaseX, groupBaseY;
        if (formation !== 'single') {
            const side = Math.floor(Math.random() * 4);
            const spawnMargin = 50;
            if (side === 0) { groupBaseX = Math.random() * canvas.width; groupBaseY = -spawnMargin; }
            else if (side === 1) { groupBaseX = canvas.width + spawnMargin; groupBaseY = Math.random() * canvas.height; }
            else if (side === 2) { groupBaseX = Math.random() * canvas.width; groupBaseY = canvas.height + spawnMargin; }
            else { groupBaseX = -spawnMargin; groupBaseY = Math.random() * canvas.height; }
        }

        for(let i=0; i<count; i++) {
            let finalX, finalY;
            if (formation === 'single') {
                const side = Math.floor(Math.random() * 4);
                const spawnMargin = 50;
                if (side === 0) { finalX = Math.random() * canvas.width; finalY = -spawnMargin; } 
                else if (side === 1) { finalX = canvas.width + spawnMargin; finalY = Math.random() * canvas.height; } 
                else if (side === 2) { finalX = Math.random() * canvas.width; finalY = canvas.height + spawnMargin; } 
                else { finalX = -spawnMargin; finalY = Math.random() * canvas.height; } 
            } else {
                const offset = offsets[i % offsets.length] || {x:0, y:0};
                finalX = groupBaseX + offset.x;
                finalY = groupBaseY + offset.y;
            }
            finalQueue.push({ type: group.type, hpMult: group.hpMult, spawnX: finalX, spawnY: finalY });
        }
    });
    return finalQueue;
}

function update(dt) {
    if (game.state !== 'PLAYING') return;
    if (game.selectedEnemy) updateInspectorUI();

    const effectiveDt = dt * game.speedMultiplier;
    const now = Date.now();

    game.mineTimer += effectiveDt;
    const mineProd = FORMULAS.getMineProduction(getTotalLevel('mine_rate'));
    if (game.mineTimer >= CONFIG.mineBaseInterval) {
        game.mineTimer = 0;
        playerData.diamonds += mineProd;
        game.runDiamonds += mineProd;
        saveData();
        createFloatingText(`+${mineProd}`, canvas.width - 100, canvas.height - 150, '#3498db', {icon: 'diamond'});
        updateHUD();
    }

    const regen = FORMULAS.getRegen(getTotalLevel('regen'));
    if (regen > 0 && game.hp < game.maxHp) {
        game.hp += regen * (effectiveDt / 1000);
        if(game.hp > game.maxHp) game.hp = game.maxHp;
    }

    if (game.waveQueue.length > 0) {
        game.spawnTimer += effectiveDt;
        if (game.spawnTimer >= game.currentSpawnInterval) {
            spawnEnemy(game.waveQueue.shift());
            game.spawnTimer = 0;
        }
    } else if (game.enemies.length === 0 && game.waveActive) {
        game.waveActive = false;
        game.wave++;
        setTimeout(() => {
            if (game.wave > 10) {
                game.wave = 1;
                game.day++;
                game.bloodSplats = [];
                createFloatingText(`JOUR ${game.day}`, canvas.width/2, canvas.height/2, '#fff', 40);
                playSound('transitionjour');
            }
            startWave();
        }, 2000 / game.speedMultiplier);
    }

    handleTowerShooting(effectiveDt);
    updateEntities(effectiveDt);
    updateSpells(effectiveDt);
    updateHUDProgress();
    updateDroppedDiamonds(effectiveDt);
}

function updateSpells(dt) {
    for (let i = game.fallingArrows.length - 1; i >= 0; i--) {
        const p = game.fallingArrows[i];
        p.y += p.speed * (dt/1000);
        if (p.y >= p.targetY) {
            const hitRadius = 20; 
            game.enemies.forEach(e => {
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < e.size/2 + hitRadius) {
                    e.hp -= p.damage / CONFIG.spells.rain.arrowCount; 
                    createParticles(e.x, e.y, '#fff');
                    if (e.hp <= 0) killEnemy(e);
                }
            });
            createParticles(p.x, p.y, '#aaa');
            game.fallingArrows.splice(i, 1);
        }
    }
}

function castPrison(targetEnemy) {
    const now = Date.now();
    const spell = CONFIG.spells.prison;
    const cost = SPELL_FORMULAS.getPrisonCost(getTotalLevel('prison_cost'));
    const duration = SPELL_FORMULAS.getPrisonDuration(getTotalLevel('prison_duration'));

    if (now - game.spells.prison.lastCast < spell.cooldown) return;
    if (playerData.diamonds < cost) {
        createFloatingText("Pas assez de diamants !", game.mouseX, game.mouseY, '#e74c3c');
        playSound('erreur');
        return;
    }
    playerData.diamonds -= cost;
    game.spells.prison.lastCast = now;
    saveData();
    updateHUD();
    targetEnemy.frozenUntil = now + duration;
    createFloatingText("PRISON !", targetEnemy.x, targetEnemy.y, '#e74c3c');
    playSound('prison');
    game.targetingSpell = null;
}

function castRain(x, y) {
    const now = Date.now();
    const spell = CONFIG.spells.rain;
    const cost = SPELL_FORMULAS.getRainCost(getTotalLevel('rain_cost'));
    const damage = SPELL_FORMULAS.getRainDamage(getTotalLevel('rain_damage'));

    if (now - game.spells.rain.lastCast < spell.cooldown) return;
    if (playerData.diamonds < cost) {
        createFloatingText("Pas assez de diamants !", x, y, '#e74c3c');
        playSound('erreur');
        return;
    }
    playerData.diamonds -= cost;
    game.spells.rain.lastCast = now;
    saveData();
    updateHUD();
    for(let i=0; i<spell.arrowCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * spell.radius;
        const targetX = x + Math.cos(angle) * r;
        const targetY = y + Math.sin(angle) * r;
        const startY = -100 - Math.random() * 500; 
        game.fallingArrows.push({ x: targetX, y: startY, targetY: targetY, speed: 800 + Math.random() * 400, damage: damage });
    }
    playSound('pluiefleche');
    game.targetingSpell = null;
}

function castCircleArrows() {
    const now = Date.now();
    const spell = CONFIG.spells.circle;
    const cost = SPELL_FORMULAS.getCircleCost(getTotalLevel('circle_cost'));
    const count = SPELL_FORMULAS.getCircleCount(getTotalLevel('circle_count'));
    const damage = FORMULAS.getDamage(getTotalLevel('damage'));

    if (now - game.spells.circle.lastCast < spell.cooldown) return;
    if (playerData.diamonds < cost) {
        createFloatingText("Pas assez de diamants !", game.mouseX, game.mouseY, '#e74c3c');
        playSound('erreur');
        return;
    }
    playerData.diamonds -= cost;
    game.spells.circle.lastCast = now;
    saveData();
    updateHUD();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for(let i=0; i<count; i++) {
        const angle = (Math.PI * 2 / count) * i; 
        const vx = Math.cos(angle) * 400; 
        const vy = Math.sin(angle) * 400; 
        game.projectiles.push({ x: cx, y: cy, vx, vy, damage, isCrit: false, color: '#9b59b6', life: 2000 });
    }
    playSound('cerclefleche');
    game.targetingSpell = null;
}

function spawnEnemy(data) {
    let x, y;
    if (data.spawnX !== undefined && data.spawnY !== undefined) { x = data.spawnX; y = data.spawnY; } 
    else {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { x = Math.random() * canvas.width; y = -50; }
        else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; }
        else { x = -50; y = Math.random() * canvas.height; }
    }

    let maxHp = 30 * data.hpMult;
    let speed = 65; 
    let dmg = 10 + (data.hpMult * 5); 
    let size = CONFIG.zombieSize;
    let color = '#2ecc71';
    let reward = CONFIG.coinDropMin + Math.random() * (CONFIG.coinDropMax - CONFIG.coinDropMin);
    let variant = data.type;
    let imgIndex = 0;
    let typeStr = '';

    if (variant === 'sprinter') { speed = 115; maxHp *= 0.8; imgIndex = CONFIG.enemies.sprinter[Math.floor(Math.random() * CONFIG.enemies.sprinter.length)]; }
    else if (variant === 'tank') { speed = 40; maxHp *= 2.0; imgIndex = CONFIG.enemies.tank; }
    else if (variant === 'kamikaze') { speed = 90; dmg *= 1.5; imgIndex = CONFIG.enemies.kamikaze; }
    else if (variant === 'boss') { maxHp = 100 * data.hpMult; speed = 30; dmg = 50; size = CONFIG.bossSize; color = '#e74c3c'; reward = CONFIG.bossDiamondDropBase * 5; }
    else { imgIndex = CONFIG.enemies.normal[Math.floor(Math.random() * CONFIG.enemies.normal.length)]; }

    if (variant === 'boss') {
        const bossNum = Math.min(Math.floor((game.day - 1) / 2) + 1, 4); 
        typeStr = `boss${bossNum}`;
    } else {
        typeStr = `zombie${imgIndex+1}`;
    }

    const metadataKey = typeStr;
    const framesToUse = ZOMBIE_METADATA[metadataKey]?.frames || 12;

    game.enemies.push({ x, y, type: typeStr, variant, hp: maxHp, maxHp, speed, dmg, size, baseColor: color, reward: Math.floor(reward), frame: 0, animTimer: 0, totalFrames: framesToUse, frozenUntil: 0 });
}

let shootTimer = 0;
function handleTowerShooting(dt) {
    const range = FORMULAS.getRange(getTotalLevel('range'));
    const delay = FORMULAS.getAttackDelay(getTotalLevel('speed'));
    const damage = FORMULAS.getDamage(getTotalLevel('damage'));
    const critChance = FORMULAS.getCritChance(getTotalLevel('crit'));
    const doubleShotChance = FORMULAS.getMultiShotChance(getTotalLevel('multishot'));
    
    shootTimer += dt;
    if (shootTimer >= delay) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const targets = game.enemies
            .filter(e => Math.hypot(e.x - cx, e.y - cy) <= range)
            .sort((a,b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
            
        if (targets.length > 0) {
            shootTimer = 0;
            const spawnX = cx;
            const spawnY = cy - (CONFIG.towerDisplayWidth / 2) + 20;
            let target1 = targets[0];
            let isCrit1 = Math.random() * 100 < critChance;
            let dmg1 = isCrit1 ? damage * 2 : damage;
            game.projectiles.push({ x: spawnX, y: spawnY, target: target1, speed: 400, damage: dmg1, isCrit: isCrit1 });
            playSound('fleche');
            if (targets.length > 1 && Math.random() * 100 < doubleShotChance) {
                let target2 = targets[1];
                let isCrit2 = Math.random() * 100 < critChance;
                let dmg2 = isCrit2 ? damage * 2 : damage;
                game.projectiles.push({ x: spawnX, y: spawnY, target: target2, speed: 400, damage: dmg2, isCrit: isCrit2 });
            }
        }
    }
}

function updateEntities(dt) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const now = Date.now();

    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        if (p.target) {
            if (!game.enemies.includes(p.target)) { game.projectiles.splice(i, 1); continue; }
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) {
                p.target.hp -= p.damage;
                createParticles(p.x, p.y, p.isCrit ? '#ff00ff' : '#fff');
                const ls = FORMULAS.getLifesteal(getTotalLevel('lifesteal'));
                if (ls > 0) {
                    game.hp += p.damage * (ls / 100);
                    if(game.hp > game.maxHp) game.hp = game.maxHp;
                }
                if (p.target.hp <= 0) killEnemy(p.target);
                game.projectiles.splice(i, 1);
            } else {
                p.x += (dx/dist) * p.speed * (dt/1000);
                p.y += (dy/dist) * p.speed * (dt/1000);
            }
        } else {
            p.x += p.vx * (dt/1000);
            p.y += p.vy * (dt/1000);
            p.life -= dt;
            if (p.life <= 0 || p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
                game.projectiles.splice(i, 1);
                continue;
            }
            let hit = false;
            for (let e of game.enemies) {
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < e.size / 2 + 10) {
                    e.hp -= p.damage;
                    createParticles(e.x, e.y, '#9b59b6');
                    if (e.hp <= 0) killEnemy(e);
                    hit = true;
                    break;
                }
            }
            if (hit) game.projectiles.splice(i, 1);
        }
    }

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i];
        const isFrozen = now < e.frozenUntil;
        if (!isFrozen) {
            const meta = ZOMBIE_METADATA[e.type] || { frames: 1, animDelay: 10 };
            e.animTimer += dt;
            if (e.animTimer > meta.animDelay * 8) { e.animTimer = 0; e.frame = (e.frame + 1) % e.totalFrames; }
        }
        const dx = cx - e.x;
        const dy = cy - e.y;
        const dist = Math.hypot(dx, dy);
        const hitbox = CONFIG.towerDisplayWidth / 2; 
        
        if (dist < hitbox) {
            if (e.variant === 'kamikaze') {
                game.hp -= e.dmg;
                createParticles(e.x, e.y, '#e67e22'); 
                killEnemy(e);
                continue;
            } else if (!isFrozen) {
                game.hp -= e.dmg * (dt / 1000);
                if (game.hp <= 0) gameOver();
            }
        } else {
            if (!isFrozen) {
                e.x += (dx/dist) * e.speed * (dt/1000);
                e.y += (dy/dist) * e.speed * (dt/1000);
            }
        }
    }
    updateParticles(dt);
    updateFloatingTexts(dt);
}

function updateInspectorUI() {
    const inspector = document.getElementById('enemy-inspector');
    if (game.selectedEnemy && game.enemies.includes(game.selectedEnemy)) {
        const e = game.selectedEnemy;
        inspector.classList.remove('hidden'); 
        const displayName = ZOMBIE_NAMES[e.type] || e.type;
        const displayType = getZombieTypeName(e.variant);
        document.getElementById('insp-name').innerText = displayName;
        document.getElementById('insp-hp').innerText = Math.ceil(e.hp) + ' / ' + Math.ceil(e.maxHp);
        document.getElementById('insp-dmg').innerText = e.dmg;
        document.getElementById('insp-type').innerText = displayType;
    } else {
        inspector.classList.add('hidden'); 
        game.selectedEnemy = null; 
    }
}

function killEnemy(enemy) {
    if (enemy.variant === 'boss') playSound('mortboss');
    else if (enemy.variant === 'kamikaze') playSound('explosion');
    else {
        const deathSounds = ['mort', 'mort2', 'mort3', 'mort4', 'mort5', 'mort6'];
        const randomSound = deathSounds[Math.floor(Math.random() * deathSounds.length)];
        playSound(randomSound);
    }
    const idx = game.enemies.indexOf(enemy);
    if (idx > -1) {
        game.enemies.splice(idx, 1);
        game.runStats.kills++;
        if (enemy.variant === 'boss') game.runStats.bosses++;
        game.waveKilledEnemies++;
        game.bloodSplats.push({x: enemy.x, y: enemy.y});
        if (Math.random() < 0.1) {
            const diamondValue = game.day * 10;
            game.droppedDiamonds.push({ x: enemy.x, y: enemy.y, value: diamondValue, spawnTime: Date.now(), duration: 5000, isAnimating: false, targetX: 0, targetY: 0 });
        }
        const killBonus = FORMULAS.getKillBonus(getTotalLevel('kill_bonus'));
        game.coins += enemy.reward + killBonus;
        createFloatingText(`+${enemy.reward + killBonus}`, enemy.x, enemy.y, '#f1c40f', {icon: 'coin'});
        if (enemy.variant === 'boss') {
            const bonus = CONFIG.bossDiamondDropBase + FORMULAS.getBossDiamondBonus(getTotalLevel('boss_diamond'));
            playerData.diamonds += bonus;
            game.runDiamonds += bonus;
            createFloatingText(`+${bonus}`, enemy.x, enemy.y - 20, '#3498db');
            saveData();
        }
        updateHUD();
    }
}

function createParticles(x, y, color) { for(let i=0; i<5; i++) { game.particles.push({ x, y, vx: (Math.random()-0.5)*100, vy: (Math.random()-0.5)*100, life: 500, color }); } }
function updateParticles(dt) { for (let i = game.particles.length - 1; i >= 0; i--) { const p = game.particles[i]; p.x += p.vx * (dt/1000); p.y += p.vy * (dt/1000); p.life -= dt; if (p.life <= 0) game.particles.splice(i, 1); } }
function createFloatingText(text, x, y, color, size=16, options={}) { game.floatingTexts.push({ text, x, y, color, life: 1000, maxLife: 1000, size, icon: options.icon }); }
function updateFloatingTexts(dt) { for (let i = game.floatingTexts.length - 1; i >= 0; i--) { const t = game.floatingTexts[i]; t.y -= 20 * (dt/1000); t.life -= dt; if (t.life <= 0) game.floatingTexts.splice(i, 1); } }

function updateDroppedDiamonds(dt) {
    const hudElement = document.getElementById('hud-diamonds');
    const canvasRect = canvas.getBoundingClientRect();
    const hudRect = hudElement.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const targetHudX = (hudRect.left - canvasRect.left + hudRect.width/2) * scaleX;
    const targetHudY = (hudRect.top - canvasRect.top + hudRect.height/2) * scaleY;

    for (let i = game.droppedDiamonds.length - 1; i >= 0; i--) {
        const d = game.droppedDiamonds[i];
        if (d.isAnimating) {
            const dx = targetHudX - d.x;
            const dy = targetHudY - d.y;
            d.x += dx * 0.15;
            d.y += dy * 0.15;
            if (Math.hypot(dx, dy) < 10) {
                playerData.diamonds += d.value;
                game.runDiamonds += d.value;
                createFloatingText(`+${d.value}`, targetHudX, targetHudY, '#3498db', 20);
                saveData();
                updateHUD();
                game.droppedDiamonds.splice(i, 1); 
            }
        } else {
            if (Date.now() - d.spawnTime > d.duration) game.droppedDiamonds.splice(i, 1); 
        }
    }
}

function drawDroppedDiamonds() {
    const now = Date.now();
    game.droppedDiamonds.forEach(d => {
        ctx.drawImage(assets.diamond, d.x - 12, d.y - 12, 24, 24); 
        if (!d.isAnimating) {
            const timeLeftPct = 1 - (now - d.spawnTime) / d.duration;
            ctx.strokeStyle = `rgba(52, 152, 219, ${timeLeftPct})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(d.x, d.y, 18, 0, Math.PI * 2 * timeLeftPct);
            ctx.stroke();
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (game.state === 'PLAYING') {
        let bgToDraw = assets.bg;
        if (bgToDraw && bgToDraw.complete) ctx.drawImage(bgToDraw, 0, 0, canvas.width, canvas.height);
        else { ctx.fillStyle = '#222'; ctx.fillRect(0,0,canvas.width, canvas.height); }
    }
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    if (assets.blood && assets.blood.complete) {
        game.bloodSplats.forEach(s => ctx.drawImage(assets.blood, s.x - (23*CONFIG.bloodScale)/2, s.y - (17*CONFIG.bloodScale)/2, 23*CONFIG.bloodScale, 17*CONFIG.bloodScale));
    }
    const mineX = cx + 250; 
    const mineY = cy - 150;
    if (assets.mine && assets.mine.complete) ctx.drawImage(assets.mine, mineX - CONFIG.mineSize/2, mineY - CONFIG.mineSize/2, CONFIG.mineSize, CONFIG.mineSize);
    else { ctx.fillStyle='#3498db'; ctx.fillRect(mineX-CONFIG.mineSize/2, mineY-CONFIG.mineSize/2, CONFIG.mineSize, CONFIG.mineSize); }
    ctx.fillStyle='#3498db'; ctx.font='bold 12px Arial'; ctx.textAlign='center';
    const mineProd = FORMULAS.getMineProduction(getTotalLevel('mine_rate'));
    ctx.fillText(`${mineProd} diam/10s`, mineX, mineY - CONFIG.mineSize/2 - 10);
    const barW = CONFIG.mineSize, barH = 6, barY = mineY + CONFIG.mineSize/2 + 8;
    ctx.fillStyle = '#333'; ctx.fillRect(mineX - barW/2, barY, barW, barH);
    ctx.fillStyle = '#3498db'; const barPct = game.mineTimer / CONFIG.mineBaseInterval;
    ctx.fillRect(mineX - barW/2, barY, barW * barPct, barH);

    const towerW = CONFIG.towerDisplayWidth, towerH = towerW;
    if (assets.tower && assets.tower.complete) ctx.drawImage(assets.tower, cx - towerW/2, cy - towerH/2, towerW, towerH);
    else { ctx.fillStyle='#555'; ctx.fillRect(cx - towerW/2, cy - towerH/2, towerW, towerH); }
    ctx.fillStyle='red'; ctx.fillRect(cx-30, cy - towerH/2 - 10, 60, 8);
    ctx.fillStyle='#2ecc71'; ctx.fillRect(cx-30, cy - towerH/2 - 10, 60 * (game.hp/game.maxHp), 8);
    
    const range = FORMULAS.getRange(getTotalLevel('range'));
    if (Math.hypot(game.mouseX - cx, game.mouseY - cy) < towerW/2) {
        ctx.beginPath(); ctx.arc(cx, cy, range, 0, Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(game.hp)} / ${Math.floor(game.maxHp)} PV`, cx, cy - towerH/2 - 20);
    }

    if (assets.arrow && assets.arrow.complete) {
        const arrowW = CONFIG.arrowDisplayWidth;
        const arrowH = (arrowW / 164) * 934;
        game.projectiles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            let angle = 0;
            if (p.target) angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            else angle = Math.atan2(p.vy, p.vx);
            ctx.rotate(angle + Math.PI / 2);
            ctx.drawImage(assets.arrow, -arrowW/2, -arrowH/2, arrowW, arrowH);
            ctx.restore();
        });
    } else {
        game.projectiles.forEach(p => {
            ctx.fillStyle = p.isCrit ? '#ff00ff' : 'yellow';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.isCrit?6:4, 0, Math.PI*2); ctx.fill();
        });
    }

    if (assets.arrow && assets.arrow.complete) {
        const arrowW = CONFIG.arrowDisplayWidth;
        const arrowH = (arrowW / 164) * 934;
        game.fallingArrows.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.PI);
            ctx.drawImage(assets.arrow, -arrowW/2, -arrowH/2, arrowW, arrowH);
            ctx.restore();
        });
    }

    const now = Date.now();
    game.enemies.forEach(e => {
        const sprite = assets[e.type];
        if (sprite && sprite.complete) {
            const frameW = sprite.width / e.totalFrames;
            ctx.save();
            ctx.translate(e.x, e.y);
            const dx = (canvas.width / 2) - e.x;
            let shouldFlip = (dx > 0.5);
            if (INVERTED_SPRITES.some(s => e.type.includes(s))) shouldFlip = !shouldFlip;
            if (shouldFlip) ctx.scale(-1, 1);
            if (now < e.frozenUntil) ctx.filter = 'grayscale(100%) brightness(50%)';
            ctx.drawImage(sprite, e.frame * frameW, 0, frameW, sprite.height, -e.size/2, -e.size/2, e.size, e.size);
            ctx.restore();
        }
        ctx.fillStyle='red'; ctx.fillRect(e.x-15, e.y-e.size/2-10, 30, 4);
        ctx.fillStyle='#2ecc71'; ctx.fillRect(e.x-15, e.y-e.size/2-10, 30*(e.hp/e.maxHp), 4);
        if (now < e.frozenUntil && assets.barreau && assets.barreau.complete) ctx.drawImage(assets.barreau, e.x - e.size/2, e.y - e.size/2, e.size, e.size);
    });

    game.particles.forEach(p => { ctx.globalAlpha = p.life/500; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); ctx.globalAlpha = 1; });

    game.floatingTexts.forEach(t => {
        let currentX = t.x;
        if (t.icon === 'coin' && assets.coin) { ctx.drawImage(assets.coin, t.x - 16, t.y - 10, 16, 16); currentX += 18; }
        else if (t.icon === 'diamond' && assets.diamond) { ctx.drawImage(assets.diamond, t.x - 16, t.y - 10, 16, 16); currentX += 18; }
        ctx.fillStyle = t.color; ctx.font = `bold ${t.size}px Arial`; ctx.globalAlpha = t.life/t.maxLife; ctx.fillText(t.text, currentX, t.y); ctx.globalAlpha = 1;
    });
    drawDroppedDiamonds();
    if (game.state === 'PLAYING') drawGameUI();
}

let activeTab = "Bastion";
const tabs = ["Bastion", "PV", "Économie", "Sorts"];

function drawGameUI() {
    const bottomY = canvas.height - 120;
    drawUpgradeUI(bottomY);
    drawSpellUI(bottomY);
    drawSpeedButton();
    if (game.targetingSpell) drawTargetingCursor();
}

function setSpeed(val) {
    game.speedMultiplier = val;
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById(`btn-speed-${i}`);
        if (val === i) btn.classList.add('active');
        else btn.classList.remove('active');
    }
    draw(); 
}

function drawSpeedButton() { /* Géré par le HTML */ }

function drawUpgradeUI(bottomY) {
    const upgrades = UPGRADES_DATA.filter(u => u.tab === activeTab);
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0, bottomY, canvas.width, 120);
    const tabWidth = 100;
    tabs.forEach((t, i) => {
        const tx = 20 + i*(tabWidth+10);
        ctx.fillStyle=(t===activeTab)?'#555':'#333';
        ctx.fillRect(tx, bottomY-30, tabWidth, 30);
        ctx.strokeStyle='#777'; ctx.strokeRect(tx, bottomY-30, tabWidth, 30);
        ctx.fillStyle='#fff'; ctx.font='14px Arial'; ctx.textAlign='center';
        ctx.fillText(t, tx+tabWidth/2, bottomY-10);
    });
    const btnW = 160, btnH = 90, gap = 15;
    upgrades.forEach((u, i) => {
        const bx = 20 + i*(btnW+gap);
        const by = bottomY+10;
        const totalLvl = getTotalLevel(u.id);
        const tempLvl = game.tempLevels[u.id];
        const max = u.maxLevel;
        const price = Math.floor(u.basePrice * Math.pow(u.ratio, tempLvl));
        const afford = game.coins >= price;
        const isMax = totalLvl >= max;
        ctx.fillStyle=isMax?'#2c3e50':(afford?'#34495e':'#2c3e50');
        ctx.strokeStyle=afford&&!isMax?'#f1c40f':'#555'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 5); ctx.fill(); ctx.stroke();
        ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 13px Arial';
        ctx.fillText(`${u.name} (${totalLvl}/${max})`, bx+10, by+20);
        ctx.font='11px Arial'; ctx.fillStyle='#aaa';
        ctx.fillText(`Run: +${tempLvl}`, bx+10, by+35);
        let valTxt = u.formula(totalLvl);
        if(u.id === 'multishot') valTxt = valTxt.toFixed(1) + "%";
        else if(u.id === 'crit') valTxt += "%";
        else if(u.id === 'damage') valTxt = Math.floor(valTxt) + " dégâts";
        else if(u.id === 'speed') valTxt = Math.floor(valTxt) + " ms";
        else if(u.id === 'hp') valTxt = Math.floor(valTxt) + " PV";
        else if(u.id === 'regen') valTxt = valTxt.toFixed(1) + " HP/s";
        else if(u.id === 'lifesteal') valTxt = valTxt.toFixed(1) + "%";
        else if(u.id === 'wave_bonus') valTxt += "$";
        else if(u.id === 'mine_rate') valTxt += " diam/10s";
        else if(u.id === 'boss_diamond') valTxt += " +diam";
        else if(u.id === 'kill_bonus') valTxt = `+${Math.floor(valTxt)} /kill`; 
        else if(u.id === 'prison_cost') valTxt = Math.floor(valTxt) + " 💎";
        else if(u.id === 'prison_duration') valTxt = (valTxt/1000).toFixed(1) + "s";
        else if(u.id === 'rain_cost') valTxt = Math.floor(valTxt) + " 💎";
        else if(u.id === 'rain_damage') valTxt = Math.floor(valTxt) + " dégâts";
        else if(u.id === 'circle_cost') valTxt = Math.floor(valTxt) + " 💎"; 
        else if(u.id === 'circle_count') valTxt = valTxt + " flèches"; 
        else valTxt += "px";
        ctx.fillText(valTxt, bx+10, by+50);
        if(!isMax) {
            ctx.fillStyle=afford?'#f1c40f':'#e74c3c'; ctx.font='bold 14px Arial';
            const txtAcheter = "Acheter: ";
            const startX = bx + 10;
            const widthAcheter = ctx.measureText(txtAcheter).width;
            ctx.fillText(txtAcheter, startX, by+75);
            let textX = startX + widthAcheter;
            ctx.fillText(`${price}`, textX, by+75);
            const priceWidth = ctx.measureText(`${price}`).width;
            const iconSize = 14;
            if (assets.coin && assets.coin.complete) ctx.drawImage(assets.coin, textX + priceWidth + 5, by+75-iconSize, iconSize, iconSize);
        } else { ctx.fillStyle='#2ecc71'; ctx.fillText('MAX', bx+10, by+75); }
        u.clickArea = {x:bx, y:by, w:btnW, h:btnH};
    });
}

function drawSpellUI(bottomY) {
    const spellKeys = Object.keys(CONFIG.spells);
    const iconSize = 50;
    const margin = 10;
    const startX = canvas.width - (spellKeys.length * (iconSize + margin)) - 20;
    const spellY = bottomY - 90;
    const now = Date.now();
    const cursor = game.mouseX;
    const cursorY = game.mouseY;

    spellKeys.forEach((key, index) => {
        const spell = CONFIG.spells[key];
        const x = startX + index * (iconSize + margin);
        const y = spellY; 
        let currentCost = spell.cost; 
        if (key === 'prison') currentCost = SPELL_FORMULAS.getPrisonCost(getTotalLevel('prison_cost'));
        else if (key === 'rain') currentCost = SPELL_FORMULAS.getRainCost(getTotalLevel('rain_cost'));
        else if (key === 'circle') currentCost = SPELL_FORMULAS.getCircleCost(getTotalLevel('circle_cost'));

        const isReady = (now - game.spells[key].lastCast) >= spell.cooldown;
        const canAfford = playerData.diamonds >= currentCost;
        const isActive = game.targetingSpell === key;
        ctx.fillStyle = isActive ? '#f1c40f' : '#444';
        if (!isReady) ctx.fillStyle = '#222';
        ctx.fillRect(x, y, iconSize, iconSize);
        ctx.strokeStyle = isActive ? '#fff' : '#777';
        ctx.lineWidth = isActive ? 3 : 1;
        ctx.strokeRect(x, y, iconSize, iconSize);

        let imgKey = '';
        if (key === 'prison') imgKey = 'prison_icon';
        else if (key === 'rain') imgKey = 'rain_icon';
        else if (key === 'circle') imgKey = 'circle_icon'; 

        if (assets[imgKey] && assets[imgKey].complete) ctx.drawImage(assets[imgKey], x, y, iconSize, iconSize);
        else {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
            ctx.fillText(key.charAt(0).toUpperCase(), x + iconSize/2, y + iconSize/1.5);
        }

        if (!isReady) {
            const elapsed = now - game.spells[key].lastCast;
            const pct = Math.min(1, elapsed / spell.cooldown);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(x, y, iconSize, iconSize * (1 - pct));
        }
        if (cursor >= x && cursor <= x + iconSize && cursorY >= y && cursorY <= y + iconSize) drawTooltip(spell, x, y, isReady, canAfford, currentCost);
        spell.clickArea = { x, y, w: iconSize, h: iconSize };
    });
}

function drawTooltip(spell, x, y, isReady, canAfford, dynamicCost) {
    const w = 200, h = 80;
    const tipX = x - (w - 50); 
    const tipY = y - h - 10;
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 1;
    ctx.fillRect(tipX, tipY, w, h);
    ctx.strokeRect(tipX, tipY, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left';
    ctx.fillText(spell.name, tipX + 10, tipY + 20);
    ctx.font = '12px Arial'; ctx.fillStyle = '#ccc';
    ctx.fillText(spell.desc, tipX + 10, tipY + 40);
    ctx.fillStyle = canAfford ? '#3498db' : '#e74c3c';
    ctx.fillText(`Coût: ${Math.floor(dynamicCost)} 💎`, tipX + 10, tipY + 60);
    if (!isReady) {
        const remain = Math.ceil((spell.cooldown - (Date.now() - game.spells[spell.id].lastCast))/1000);
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Recharge: ${remain}s`, tipX + 10, tipY + 75);
    }
}

function drawTargetingCursor() {
    if (game.targetingSpell === 'rain') {
        ctx.beginPath();
        ctx.arc(game.mouseX, game.mouseY, CONFIG.spells.rain.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(241, 196, 15, 0.2)'; ctx.fill();
        ctx.strokeStyle = '#f1c40f'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    } else if (game.targetingSpell === 'prison') {
        ctx.beginPath();
        ctx.arc(game.mouseX, game.mouseY, 30, 0, Math.PI * 2);
        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2; ctx.stroke();
    } else if (game.targetingSpell === 'circle') {
        const text = "Tirer";
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(text).width;
        const padding = 8, boxW = textWidth + padding * 2, boxH = 24;
        const boxX = game.mouseX - boxW / 2, boxY = game.mouseY + 25;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1; ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = '#f1c40f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, game.mouseX, boxY + boxH / 2);
    }
}

/* RESPONSIVE CANVAS FIX */
function resizeCanvas() {
    const container = document.getElementById('game-container');
    // Résolution interne fixe pour la logique du jeu
    canvas.width = 1280;
    canvas.height = 720;

    // Redimensionnement visuel CSS pour s'adapter à l'écran tout en gardant le ratio
    const aspectRatio = 16 / 9;
    let containerWidth = container.clientWidth;
    let containerHeight = container.clientHeight;

    if (containerWidth / containerHeight > aspectRatio) {
        canvas.style.width = (containerHeight * aspectRatio) + 'px';
        canvas.style.height = containerHeight + 'px';
    } else {
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = (containerWidth / aspectRatio) + 'px';
    }
}

window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

function saveRunStats() {
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    playerData.stats.totalRuns++;
    playerData.stats.totalKills += game.runStats.kills;
    playerData.stats.totalBossKills += game.runStats.bosses;
    playerData.stats.totalDiamondsEarned += game.runDiamonds;
    const current = { day: game.day, wave: game.wave, diamonds: game.runDiamonds, date: dateStr };
    const best = playerData.stats.bestRun;
    let isNewBest = false;
    if (current.day > best.day) isNewBest = true;
    else if (current.day === best.day) {
        if (current.wave > best.wave) isNewBest = true;
        else if (current.wave === best.wave) { if (current.diamonds > best.diamonds) isNewBest = true; }
    }
    if (isNewBest) playerData.stats.bestRun = current;
    saveData(); 
}

function gameOver() {
    if(sounds['musique']) sounds['musique'].pause();
    playSound('fin');
    saveRunStats(); 
    game.state = 'GAMEOVER';
    document.getElementById('gameover-overlay').classList.remove('hidden');
    document.getElementById('hud-bar').classList.add('hidden');
    speedBtnGroup.classList.add('hidden');
    document.getElementById('btn-settings').classList.add('hidden');
    document.getElementById('go-day').innerText = game.day;
    document.getElementById('go-wave').innerText = game.wave;
    document.getElementById('go-diamonds').innerText = game.runDiamonds;
}

function gameLoop(timestamp) {
    const dt = timestamp - game.lastTime;
    game.lastTime = timestamp;
    update(dt);
    draw();
    if (['PLAYING', 'MENU'].includes(game.state)) requestAnimationFrame(gameLoop);
}

/* FUSION DES ÉVÉNEMENTS SOURIS ET TACTILES (MOBILE) */
function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handlePointerDown(e) {
    if (game.state !== 'PLAYING') return;
    e.preventDefault(); // Empêche le comportement par défaut sur mobile

    const { x, y } = getEventPos(e);
    game.mouseX = x;
    game.mouseY = y;

    // 1. Vérifier les diamants déposés
    for (let i = game.droppedDiamonds.length - 1; i >= 0; i--) {
        const d = game.droppedDiamonds[i];
        const dist = Math.hypot(x - d.x, y - d.y);
        if (dist < 20) {
            d.isAnimating = true; 
            playSound('amelioration'); 
            return; 
        }
    }

    // 2. Vérifier les sorts
    let clickedSpell = false;
    Object.values(CONFIG.spells).forEach(spell => {
        if (spell.clickArea && x >= spell.clickArea.x && x <= spell.clickArea.x + spell.clickArea.w &&
            y >= spell.clickArea.y && y <= spell.clickArea.y + spell.clickArea.h) {
            if (game.targetingSpell === spell.id) game.targetingSpell = null;
            else game.targetingSpell = spell.id;
            clickedSpell = true;
        }
    });
    if (clickedSpell) return;

    // 3. Gestion ciblage sort
    if (game.targetingSpell) {
        if (game.targetingSpell === 'prison') {
            const target = game.enemies.find(en => Math.hypot(en.x - x, en.y - y) < en.size);
            if (target) castPrison(target);
            else createFloatingText("Cible invalide", x, y, '#e74c3c');
        } else if (game.targetingSpell === 'rain') {
            castRain(x, y);
        } else if (game.targetingSpell === 'circle') {
            castCircleArrows();
        }
        return;
    }

    // 4. Sélection ennemi
    let clickedEnemy = null;
    for (let enemy of game.enemies) {
        const dist = Math.hypot(x - enemy.x, y - enemy.y);
        if (dist < enemy.size / 2 + 10) { clickedEnemy = enemy; break; }
    }
    game.selectedEnemy = clickedEnemy;
    updateInspectorUI();

    // 5. Onglets
    const bottomY = canvas.height - 120;
    if (y > bottomY-30 && y < bottomY) {
        tabs.forEach((t, i) => {
            if (x > 20+i*(110) && x < 20+i*(110)+100) {
                activeTab = t;
                playSound('onglet'); 
                draw(); 
            }
        });
        return; 
    }
    
    // 6. Améliorations
    UPGRADES_DATA.filter(u => u.tab === activeTab).forEach(u => {
        if(u.clickArea && x>u.clickArea.x && x<u.clickArea.x+u.clickArea.w && y>u.clickArea.y && y<u.clickArea.y+u.clickArea.h) buyUpgrade(u);
    });
}

function handlePointerMove(e) {
    if (game.state !== 'PLAYING') return;
    e.preventDefault();
    const { x, y } = getEventPos(e);
    game.mouseX = x;
    game.mouseY = y;
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
canvas.addEventListener('touchmove', handlePointerMove, { passive: false });

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (game.state === 'PLAYING') game.targetingSpell = null;
});

function buyUpgrade(upgrade) {
    const totalLvl = getTotalLevel(upgrade.id);
    if(totalLvl >= upgrade.maxLevel) return;
    const price = Math.floor(upgrade.basePrice * Math.pow(upgrade.ratio, game.tempLevels[upgrade.id]));
    if(game.coins >= price) {
        game.coins -= price;
        game.tempLevels[upgrade.id]++;
        playSound('amelioration'); 
        createFloatingText("Upgrade!", canvas.width/2, canvas.height/2+100, '#fff');
        applyUpgradeStats();
        updateHUD();
    } else {
        createFloatingText("Pas assez !", canvas.width/2, canvas.height/2+100, 'red');
        playSound('erreur'); 
    }
}

let activeTabLab = "Bastion";

function updateHUD() {
    document.getElementById('hud-coins').innerText = game.coins;
    document.getElementById('hud-diamonds').innerText = playerData.diamonds;
    document.getElementById('hud-day').innerText = game.day;
    document.getElementById('hud-wave').innerText = game.wave;
}
function updateHUDProgress() {
    if (game.waveTotalEnemies > 0) {
        const pct = (game.waveKilledEnemies / game.waveTotalEnemies) * 100;
        document.getElementById('wave-progress').style.width = `${pct}%`;
    } else document.getElementById('wave-progress').style.width = '0%';
}
function updateMenuUI() { document.getElementById('menu-diamonds').innerText = playerData.diamonds; }

function generateLabUI() {
    const container = document.getElementById('lab-content');
    container.innerHTML = '';
    const upgrades = UPGRADES_DATA.filter(u => u.tab === activeTabLab);
    upgrades.forEach(u => {
        const lvl = playerData.upgrades[u.id] || 1;
        const max = u.maxLevel;
        const price = Math.floor(u.labBasePrice * Math.pow(u.ratio, (lvl-1)));
        const card = document.createElement('div');
        card.className = 'lab-card';
        card.innerHTML = `
            <div>
                <h3>${u.name}</h3>
                <p>Niveau Permanent: <b>${lvl}/${max}</b></p>
                <p style="font-size:0.8rem; color:#888;">${u.description}</p>
            </div>
            <div style="margin-top:10px;">
                ${lvl < max 
                  ? `<button onclick="labBuy('${u.id}')" style="cursor:pointer; width:100%; padding:8px; background:#3498db; color:white; border:none; border-radius:3px; font-weight:bold;">${price} 💎</button>` 
                  : `<button disabled style="width:100%; padding:8px; background:#27ae60; color:white; border:none; border-radius:3px;">MAX</button>`}
            </div>
        `;
        container.appendChild(card);
    });
    document.getElementById('lab-diamonds').innerText = playerData.diamonds;
}

window.labBuy = function(id) {
    const u = UPGRADES_DATA.find(x => x.id === id);
    let currentLvl = playerData.upgrades[id] || 1;
    if(currentLvl >= u.maxLevel) return;
    const price = Math.floor(u.labBasePrice * Math.pow(u.ratio, (currentLvl-1)));
    if(playerData.diamonds >= price) {
        playerData.diamonds -= price;
        playerData.upgrades[id] = currentLvl + 1;
        playSound('amelioration'); 
        saveData();
        generateLabUI();
        updateMenuUI();
    } else { playSound('erreur'); }
}

document.querySelectorAll('.lab-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        playSound('onglet');
        document.querySelectorAll('.lab-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTabLab = tab.dataset.tab;
        generateLabUI();
    });
});

function openSettings(context) {
    const btnResume = document.getElementById('btn-resume');
    const btnCloseMenu = document.getElementById('btn-close-settings-menu');
    const btnQuit = document.getElementById('btn-quit');
    const creditsSection = document.getElementById('credits-section');
    if (context === 'MENU') {
        btnResume.classList.add('hidden');
        btnCloseMenu.classList.remove('hidden');
        btnQuit.classList.add('hidden');
    } else if (context === 'GAME') {
        btnResume.classList.remove('hidden');
        btnCloseMenu.classList.add('hidden');
        btnQuit.classList.remove('hidden');
    }
    creditsSection.classList.add('hidden');
    document.getElementById('settings-overlay').classList.remove('hidden');
}

function openStats() {
    const s = playerData.stats;
    document.getElementById('stat-total-runs').innerText = s.totalRuns;
    document.getElementById('stat-total-kills').innerText = s.totalKills;
    document.getElementById('stat-total-bosses').innerText = s.totalBossKills;
    document.getElementById('stat-total-diamonds').innerText = s.totalDiamondsEarned;
    document.getElementById('stat-best-date').innerText = s.bestRun.date || '-';
    document.getElementById('stat-best-day').innerText = s.bestRun.day;
    document.getElementById('stat-best-wave').innerText = s.bestRun.wave;
    document.getElementById('stat-best-diamonds').innerText = s.bestRun.diamonds;
    document.getElementById('stat-playtime').innerText = "Données non disponibles"; 
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('stats-overlay').classList.remove('hidden');
    playSound('amelioration');
}

function closeStats() {
    document.getElementById('stats-overlay').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    playSound('fermeture');
}

document.getElementById('btn-play').addEventListener('click', () => { playSound('amelioration'); initGame(); });
document.getElementById('btn-lab').addEventListener('click', () => {
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('lab-overlay').classList.remove('hidden');
    generateLabUI();
    playSound('amelioration');
});
document.getElementById('btn-close-lab').addEventListener('click', () => {
    playSound('fermeture');
    document.getElementById('lab-overlay').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
});
document.getElementById('btn-menu').addEventListener('click', () => {
    if(sounds['musique']) sounds['musique'].pause();
    playSound('fermeture');
    document.getElementById('gameover-overlay').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    updateMenuUI();
});
document.getElementById('btn-menu-settings').addEventListener('click', () => { openSettings('MENU'); playSound('amelioration'); });
document.getElementById('btn-settings').addEventListener('click', () => {
    playSound('amelioration');
    if (game.state === 'PLAYING') { game.state = 'PAUSED'; openSettings('GAME'); }
});
document.getElementById('btn-resume').addEventListener('click', () => {
    document.getElementById('settings-overlay').classList.add('hidden');
    playSound('amelioration');
    if (game.state === 'PAUSED') {
        game.state = 'PLAYING';
        game.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
});
document.getElementById('btn-quit').addEventListener('click', () => {
    playSound('fermeture');
    saveRunStats();
    if(sounds['musique']) sounds['musique'].pause();
    document.getElementById('settings-overlay').classList.add('hidden');
    document.getElementById('hud-bar').classList.add('hidden');
    speedBtnGroup.classList.add('hidden');
    document.getElementById('btn-settings').classList.add('hidden');
    game.state = 'MENU';
    document.getElementById('menu-overlay').classList.remove('hidden');
    updateMenuUI();
});
document.getElementById('btn-close-settings-menu').addEventListener('click', () => {
    playSound('fermeture');
    document.getElementById('settings-overlay').classList.add('hidden');
});
document.getElementById('btn-reset-save').addEventListener('click', () => {
    playSound('fermeture');
    if(confirm("Êtes-vous sûr de vouloir tout réinitialiser ?")) {
        localStorage.removeItem('zombieTD_save_v7');
        location.reload();
        playSound('amelioration');
    }
});
document.getElementById('btn-toggle-credits').addEventListener('click', () => {
    document.getElementById('credits-section').classList.toggle('hidden');
    playSound('amelioration');
});
document.getElementById('btn-stats').addEventListener('click', openStats);
document.getElementById('btn-close-stats').addEventListener('click', closeStats);

loadAssets();
loadData();
resizeCanvas();

window.addEventListener('keydown', (e) => {
    if (game.state !== 'PLAYING') return;
    if (e.code === 'Numpad1') { game.targetingSpell = (game.targetingSpell === 'prison') ? null : 'prison'; }
    else if (e.code === 'Numpad2') { game.targetingSpell = (game.targetingSpell === 'rain') ? null : 'rain'; }
    else if (e.code === 'Numpad3') { game.targetingSpell = (game.targetingSpell === 'circle') ? null : 'circle'; }
    else if (e.code === 'NumpadAdd') { if (game.speedMultiplier < 3) { setSpeed(game.speedMultiplier + 1); e.preventDefault(); } }
    else if (e.code === 'NumpadSubtract') { if (game.speedMultiplier > 1) { setSpeed(game.speedMultiplier - 1); e.preventDefault(); } }
});