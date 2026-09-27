/* ---------------- données des niveaux ---------------- */
const LEVELS = [
  // niveau 1 - tutoriel
  {
    name: 'TUTORIEL',
    total: 5, goal: 4,
    dir: 1,
    width: 800,
    theme: 'night',
    hatch: { x: 150, y: 260 },
    exit: { x: 680, y: 330 },
    rects: [
      { x: 0, y: 330, w: 800, h: 120, style: 'night.groundA', grass: true },
      { x: 500, y: 270, w: 50, h: 60, style: 'night.wallA' }
    ],
    skills: { block: 0, dig: 0, float: 0, climb: 0, bash: 2, build: 0, mine: 0, bomb: 0 }
  },
  // niveau 2
  {
    name: 'INTRODUCTION',
    total: 10, goal: 8,
    dir: 1,
    theme: 'night',
    hatch: { x: 100, y: 310 },
    exit: { x: 670, y: 250 },
    tutorial: ['OBJECTIF 8/10 · GRIMPEUR POUR FRANCHIR LE MUR'],
    rects: [
      { x: 320, y: 250, w: 40, h: 150, style: 'wallA' },
      { x: 360, y: 250, w: 380, h: 50, style: 'groundA', grass: true },
      { x: 0, y: 0, w: 50, h: 380, style: 'groundA' },
      { x: 0, y: 0, w: 800, h: 30, style: 'groundA' },
      { x: 730, y: 30, w: 70, h: 420, style: 'groundA' },
      { x: 0, y: 380, w: 800, h: 70, style: 'groundA', grass: true }
    ],
    skills: { block: 0, dig: 0, float: 0, climb: 10, bash: 0, build: 0, mine: 0, bomb: 0 }
  },
  // niveau 3
  {
    name: 'PREMIÈRES CHUTES',
    theme: 'dawn',
    total: 10, goal: 8,
    dir: 1,
    width: 800,
    hatch: { x: 120, y: 180 },
    exit:  { x: 740, y: 350 },
    rects: [
      { x: 0, y: 350, w: 800, h: 100, style: 'dawn.groundA', grass: true },
      { x: 0, y: 240, w: 360, h: 18, style: 'dawn.groundA', grass: true }
    ],
    skills: { block: 0, dig: 0, float: 10, climb: 0, bash: 0, build: 0, mine: 0, bomb: 0 }
  },
  // niveau 4 
  {
    name: 'On bloque',
    total: 15, goal: 13,
    dir: 1,
    width: 800,
    theme: 'dawn',
    hatch: { x: 430, y: 80 },
    exit: { x: 670, y: 350 },
    rects: [
      { x: 260, y: 150, w: 310, h: 20, style: 'dawn.groundB', grass: true },
      { x: 120, y: 210, w: 220, h: 20, style: 'dawn.groundB', grass: true },
      { x: 0, y: 350, w: 800, h: 100, style: 'dawn.groundB', grass: true },
      { x: 300, y: 280, w: 120, h: 20, style: 'dawn.groundB', grass: true }
    ],
    skills: { block: 3, dig: 0, float: 0, climb: 0, bash: 0, build: 0, mine: 0, bomb: 0 }
  },
  // niveau 5
  {
    name: 'Le grand saut',
    total: 20, goal: 15,
    dir: 1,
    theme: 'dawn',
    hatch: { x: 400, y: 120 },
    exit: { x: 725, y: 400 },
    rects: [
      { x: 660, y: 340, w: 24, h: 60, style: 'wallA' },
      { x: 300, y: 170, w: 210, h: 30, style: 'groundB', grass: true },
      { x: 0, y: 400, w: 800, h: 50, style: 'groundB', grass: true },
      { x: 480, y: 280, w: 150, h: 20, style: 'groundB', grass: true },
      { x: 100, y: 280, w: 240, h: 20, style: 'groundB', grass: true }
    ],
    skills: { block: 1, dig: 0, float: 18, climb: 0, bash: 1, build: 0, mine: 0, bomb: 0 }
  },
  // niveau 6
  {
    name: 'LE PONT',
    total: 20, goal: 17,
    dir: 1,
    width: 800,
    theme: 'dawn',
    hatch: { x: 80, y: 320 },
    exit: { x: 710, y: 350 },
    rects: [
      { x: 0, y: 350, w: 800, h: 100, style: 'dawn.groundA', grass: true }
    ],
    carves: [ { x: 330, y: 350, w: 55, h: 100 } ],
    skills: { block: 5, dig: 0, float: 0, climb: 0, bash: 0, build: 10, mine: 0, bomb: 0 }
  },
  // niveau 7
  {
    name: 'KIRTAR',
    total: 20, goal: 16,
    dir: -1,
    width: 800,
    theme: 'ice',
    hatch: { x: 140, y: 190 },
    exit: { x: 700, y: 340 },
    rects: [
      { x: 0, y: 310, w: 160, h: 140, style: 'ice.groundA', grass: true },
      { x: 160, y: 340, w: 640, h: 110, style: 'ice.groundA', grass: true },
      { x: 160, y: 310, w: 240, h: 30, style: 'ice.groundB', grass: true },
      { x: 0, y: 250, w: 230, h: 20, style: 'ice.groundA', grass: true },
      { x: 400, y: 270, w: 30, h: 70, style: 'ice.wallA' },
      { x: 600, y: 270, w: 30, h: 70, style: 'ice.wallA' }
    ],
    skills: { block: 0, dig: 5, float: 0, climb: 0, bash: 5, build: 5, mine: 0, bomb: 0 }
  },
  // niveau 8
  {
    name: 'Enfilade',
    total: 25, goal: 20,
    dir: 1,
    width: 800,
    theme: 'ice',
    hatch: { x: 60, y: 90 },
    exit: { x: 90, y: 330 },
    rects: [
      { x: 0, y: 140, w: 240, h: 60, style: 'ice.groundA', grass: true },
      { x: 240, y: 210, w: 200, h: 40, style: 'ice.groundA', grass: true },
      { x: 440, y: 260, w: 200, h: 40, style: 'ice.groundA', grass: true },
      { x: 0, y: 330, w: 800, h: 120, style: 'ice.groundA', grass: true },
      { x: 380, y: 270, w: 22, h: 60, style: 'ice.wallA' },
      { x: 230, y: 270, w: 22, h: 60, style: 'ice.wallA' }
    ],
    carves: [
      { x: 680, y: 330, w: 70, h: 120 }
    ],
    skills: { block: 2, dig: 2, float: 0, climb: 0, bash: 2, build: 0, mine: 1, bomb: 0 }
  },
  // niveau 9
  {
    name: 'La montée',
    total: 25, goal: 22,
    dir: 1,
    width: 1400,
    theme: 'ice',
    hatch: { x: 40, y: 270 },
    exit: { x: 1320, y: 180 },
    rects: [
      { x: 0, y: 340, w: 300, h: 20, style: 'ice.groundA', grass: true },
      { x: 290, y: 300, w: 270, h: 20, style: 'ice.groundA', grass: true },
      { x: 560, y: 260, w: 290, h: 20, style: 'ice.groundA', grass: true },
      { x: 850, y: 220, w: 280, h: 20, style: 'ice.groundA', grass: true },
      { x: 1130, y: 180, w: 270, h: 20, style: 'ice.groundA', grass: true },
      { x: 0, y: 0, w: 1400, h: 20, style: 'ice.groundB' },
      { x: 970, y: 170, w: 30, h: 50, style: 'ice.wallA' },
      { x: 1230, y: 120, w: 30, h: 60, style: 'ice.wallA' }
    ],
    skills: { block: 4, dig: 0, float: 0, climb: 0, bash: 2, build: 6, mine: 0, bomb: 0 }
  },
  // niveau 10
  {
    name: 'Grotte Granit',
    total: 25, goal: 23,
    dir: 1,
    width: 1200,
    theme: 'cave',
    hatch: { x: 110, y: 90 },
    exit: { x: 990, y: 150 },
    rects: [
      { x: 0, y: 420, w: 1200, h: 30, style: 'cave.groundA', grass: true },
      { x: 0, y: 0, w: 50, h: 420, style: 'cave.groundB', grass: true },
      { x: 1150, y: 0, w: 50, h: 420, style: 'cave.groundB', grass: true },
      { x: 50, y: 0, w: 1100, h: 50, style: 'cave.groundB', grass: true },
      { x: 70, y: 150, w: 130, h: 40, style: 'cave.groundA', grass: true },
      { x: 560, y: 260, w: 30, h: 160, style: 'cave.wallB' },
      { x: 410, y: 260, w: 30, h: 160, style: 'cave.wallB' },
      { x: 410, y: 230, w: 180, h: 30, style: 'cave.groundA', grass: true },
      { x: 630, y: 190, w: 180, h: 30, style: 'cave.groundA', grass: true },
      { x: 630, y: 220, w: 30, h: 200, style: 'cave.wallB' },
      { x: 780, y: 220, w: 30, h: 200, style: 'cave.wallB' },
      { x: 850, y: 180, w: 30, h: 240, style: 'cave.wallB' },
      { x: 1000, y: 180, w: 30, h: 240, style: 'cave.wallB' },
      { x: 850, y: 150, w: 180, h: 30, style: 'cave.groundA', grass: true }
    ],
    skills: { block: 25, dig: 0, float: 25, climb: 25, bash: 0, build: 25, mine: 0, bomb: 25 }
  },
  // niveau 11
  {
    name: 'LES PONTS DE CENDRE',
    total: 30, goal: 25,
    dir: 1,
    width: 1200,
    theme: 'volcano',
    hatch: { x: 100, y: 290 },
    exit: { x: 1130, y: 430 },
    rects: [
      { x: 0, y: 360, w: 200, h: 90, style: 'volcano.groundA', grass: true },
      { x: 330, y: 260, w: 220, h: 20, style: 'volcano.wallA' },
      { x: 430, y: 280, w: 20, h: 170, style: 'volcano.wallA' },
      { x: 550, y: 310, w: 220, h: 20, style: 'volcano.wallA' },
      { x: 650, y: 330, w: 20, h: 120, style: 'volcano.wallA' },
      { x: 900, y: 180, w: 220, h: 20, style: 'volcano.wallA' },
      { x: 1000, y: 200, w: 20, h: 250, style: 'volcano.wallA' },
      { x: 1050, y: 230, w: 150, h: 220, style: 'volcano.groundA', grass: true }
    ],
    carves: [
      { x: 1070, y: 360, w: 110, h: 70 }
    ],
    skills: { block: 5, dig: 5, float: 0, climb: 0, bash: 5, build: 10, mine: 5, bomb: 0 }
  },
  // niveau 12 a refaire
  {
    name: 'MINI-DÉFI II · LE PASSAG',
    total: 15, goal: 12,
    dir: 1,
    width: 1000,
    theme: 'volcano',
    hatch: { x: 70, y: 290 },
    exit: { x: 900, y: 360 },
    rects: [
      { x: 0, y: 360, w: 1000, h: 90, style: 'volcano.groundA', grass: true },
      { x: 590, y: 285, w: 44, h: 75, style: 'volcano.wallA' },
      { x: 430, y: 290, w: 80, h: 20, style: 'volcano.groundA', grass: true },
      { x: 840, y: 280, w: 10, h: 80, style: 'volcano.wallA' },
      { x: 950, y: 280, w: 10, h: 80, style: 'volcano.wallA' },
      { x: 840, y: 270, w: 120, h: 10, style: 'volcano.wallA' }
    ],
    carves: [
      { x: 250, y: 350, w: 190, h: 100 }
    ],
    skills: { block: 3, dig: 0, float: 0, climb: 0, bash: 1, build: 4, mine: 0, bomb: 1 }
  },
  // niveau 13
  {
    name: 'LA CITADELLE NOCTURNE',
    total: 30, goal: 25,
    dir: 1, width: 1000, theme: 'night',
    hatch: { x: 80, y: 350 },
    exit: { x: 920, y: 400 },
    rects: [
      { x: 0, y: 400, w: 1000, h: 50, style: 'night.groundA', grass: true },
      { x: 250, y: 380, w: 12, h: 20, style: 'night.wallA' },
      { x: 450, y: 380, w: 12, h: 20, style: 'night.wallA' },
      { x: 830, y: 380, w: 12, h: 20, style: 'night.wallA' }
    ],
    carves: [ { x: 560, y: 400, w: 60, h: 50 } ],
    skills: { block: 4, dig: 0, float: 0, climb: 0, bash: 0, build: 2, mine: 0, bomb: 3 }
  },
  // niveau 14
  {
    name: 'LES STRATES',
    total: 35, goal: 30,
    dir: 1, width: 800, theme: 'dawn',
    hatch: { x: 120, y: 100 },
    exit: { x: 100, y: 390 },
    rects: [
      { x: 0, y: 150, w: 800, h: 25, style: 'dawn.groundA', grass: true },
      { x: 80, y: 210, w: 480, h: 25, style: 'dawn.groundA', grass: true },
      { x: 160, y: 270, w: 320, h: 25, style: 'dawn.groundA', grass: true },
      { x: 120, y: 330, w: 380, h: 25, style: 'dawn.groundA', grass: true },
      { x: 0, y: 390, w: 800, h: 60, style: 'dawn.groundA', grass: true }
    ],
    skills: { block: 2, dig: 4, float: 0, climb: 0, bash: 0, build: 0, mine: 0, bomb: 0 }
  },
  // niveau 15
  {
    name: 'LES MARCHES DU FEU',
    total: 35, goal: 31,
    dir: 1, width: 1200, theme: 'volcano',
    hatch: { x: 120, y: 330 },
    exit: { x: 1000, y: 220 },
    rects: [
      { x: 0, y: 380, w: 300, h: 70, style: 'volcano.groundA', grass: true },
      { x: 350, y: 340, w: 120, h: 22, style: 'volcano.groundB' },
      { x: 520, y: 300, w: 120, h: 22, style: 'volcano.groundB' },
      { x: 690, y: 260, w: 120, h: 22, style: 'volcano.groundB' },
      { x: 860, y: 220, w: 340, h: 230, style: 'volcano.groundA', grass: true }
    ],
    skills: { block: 10, dig: 0, float: 0, climb: 0, bash: 0, build: 10, mine: 0, bomb: 10 }
  },
  // niveau 16
  {
    name: 'LES PORTES DE CRISTAL',
    total: 15, goal: 11,
    dir: 1,
    width: 1100,
    theme: 'cave',
    hatch: { x: 100, y: 350 },
    exit: { x: 1010, y: 240 },
    rects: [
      { x: 0, y: 400, w: 1000, h: 50, style: 'cave.groundA', grass: true },
      { x: 0, y: 0, w: 1000, h: 60, style: 'cave.groundB' },
      { x: 250, y: 340, w: 10, h: 60, style: 'ice.wallA' },
      { x: 450, y: 340, w: 10, h: 60, style: 'ice.wallA' },
      { x: 650, y: 200, w: 10, h: 200, style: 'cave.wallA' },
      { x: 660, y: 250, w: 90, h: 10, style: 'cave.wallA' },
      { x: 790, y: 200, w: 10, h: 200, style: 'cave.wallA' },
      { x: 700, y: 300, w: 90, h: 10, style: 'cave.wallA' },
      { x: 660, y: 350, w: 90, h: 10, style: 'cave.wallA' },
      { x: 1030, y: 270, w: 50, h: 130, style: 'cave.wallB' },
      { x: 930, y: 270, w: 50, h: 130, style: 'cave.wallB' },
      { x: 910, y: 380, w: 90, h: 20, style: 'cave.wallB' },
      { x: 1010, y: 380, w: 90, h: 20, style: 'cave.wallB' },
      { x: 930, y: 240, w: 150, h: 30, style: 'cave.wallB' },
      { x: 620, y: 400, w: 480, h: 50, style: 'cave.groundA', grass: true },
      { x: 780, y: 250, w: 10, h: 10, style: 'cave.wallA' },
      { x: 660, y: 300, w: 10, h: 10, style: 'cave.wallA' },
      { x: 780, y: 350, w: 10, h: 10, style: 'cave.wallA' }
    ],
    carves: [
      { x: 560, y: 400, w: 60, h: 50 }
    ],
    skills: { block: 12, dig: 0, float: 0, climb: 12, bash: 0, build: 12, mine: 0, bomb: 12 }
  },
  // niveau 17
  {
    name: 'LA FISSURE',
    total: 50, goal: 45,
    dir: 1,
    width: 1400,
    theme: 'ice',
    hatch: { x: 100, y: 100 },
    exit: { x: 100, y: 410 },
    rects: [
      { x: 0, y: 150, w: 1350, h: 25, style: 'ice.groundA', grass: true },
      { x: 0, y: 280, w: 800, h: 25, style: 'ice.groundA', grass: true },
      { x: 600, y: 345, w: 800, h: 25, style: 'ice.groundA', grass: true },
      { x: 0, y: 410, w: 1400, h: 40, style: 'ice.groundA', grass: true },
      { x: 1070, y: 210, w: 330, h: 20, style: 'ice.groundA', grass: true },
      { x: 890, y: 270, w: 210, h: 20, style: 'ice.groundA', grass: true },
      { x: 690, y: 230, w: 210, h: 20, style: 'ice.groundA', grass: true }
    ],
    carves: [
      { x: 350, y: 150, w: 60, h: 25 },
      { x: 1000, y: 215, w: 70, h: 25 },
      { x: 1360, y: 340, w: 40, h: 110 },
      { x: 230, y: 410, w: 60, h: 40 }
    ],
    skills: { block: 5, dig: 5, float: 5, climb: 0, bash: 0, build: 5, mine: 0, bomb: 5 }
  },
  // niveau 18
  {
    name: 'Piocher',
    total: 50, goal: 46,
    dir: 1,
    width: 1200,
    theme: 'cave',
    hatch: { x: 60, y: 40 },
    exit: { x: 1140, y: 100 },
    rects: [
      { x: 0, y: 100, w: 1200, h: 350, style: 'cave.groundB', grass: true },
      { x: 400, y: 0, w: 50, h: 100, style: 'cave.wallB' },
      { x: 500, y: 0, w: 50, h: 100, style: 'cave.wallB' },
      { x: 600, y: 0, w: 50, h: 100, style: 'cave.wallB' },
      { x: 700, y: 0, w: 50, h: 100, style: 'cave.wallB' },
      { x: 800, y: 0, w: 50, h: 100, style: 'cave.wallB' },
      { x: 300, y: 0, w: 50, h: 100, style: 'cave.wallB' }
    ],
    carves: [
      { x: 900, y: 100, w: 150, h: 200 },
      { x: 300, y: 250, w: 150, h: 50 },
      { x: 400, y: 270, w: 150, h: 50 },
      { x: 550, y: 290, w: 150, h: 50 },
      { x: 700, y: 310, w: 150, h: 50 },
      { x: 850, y: 300, w: 200, h: 60 }
    ],
    skills: { block: 8, dig: 0, float: 8, climb: 8, bash: 8, build: 8, mine: 8, bomb: 8 }
  },
  // niveau 19
  {
    name: 'l\'Arche',
    total: 50, goal: 47,
    dir: 1,
    width: 1600,
    theme: 'dawn',
    hatch: { x: 400, y: 80 },
    exit: { x: 1400, y: 350 },
    rects: [
      { x: 0, y: 0, w: 250, h: 450, style: 'dawn.groundB' },
      { x: 1450, y: 0, w: 150, h: 450, style: 'dawn.groundB' },
      { x: 250, y: 350, w: 1200, h: 100, style: 'dawn.groundB' },
      { x: 250, y: 280, w: 200, h: 20, style: 'dawn.wallB' },
      { x: 250, y: 210, w: 250, h: 20, style: 'dawn.wallB' },
      { x: 250, y: 140, w: 300, h: 20, style: 'dawn.wallB' },
      { x: 650, y: 300, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 700, y: 290, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 750, y: 280, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 800, y: 270, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 650, y: 320, w: 20, h: 30, style: 'dawn.wallB' },
      { x: 830, y: 290, w: 20, h: 60, style: 'dawn.wallB' },
      { x: 850, y: 270, w: 100, h: 80, style: 'dawn.wallB' },
      { x: 950, y: 330, w: 100, h: 20, style: 'dawn.wallB' },
      { x: 1050, y: 270, w: 100, h: 80, style: 'dawn.wallB' },
      { x: 1150, y: 270, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 1200, y: 280, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 1250, y: 290, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 1300, y: 300, w: 50, h: 20, style: 'dawn.wallB' },
      { x: 1330, y: 320, w: 20, h: 30, style: 'dawn.wallB' }
    ],
    skills: { block: 10, dig: 10, float: 10, climb: 0, bash: 10, build: 10, mine: 0, bomb: 0 }
  },
  // niveau 20
  {
    name: 'Mirouette',
    total: 50, goal: 45,
    dir: 1,
    width: 1600,
    theme: 'volcano',
    hatch: { x: 50, y: 32 },
    exit: { x: 1430, y: 350 },
    rects: [
      { x: 0, y: 100, w: 150, h: 30, style: 'volcano.groundB', grass: true },
      { x: 130, y: 400, w: 1470, h: 50, style: 'volcano.groundB', grass: true },
      { x: 300, y: 350, w: 10, h: 50, style: 'volcano.wallA' },
      { x: 350, y: 350, w: 10, h: 50, style: 'volcano.wallA' },
      { x: 400, y: 350, w: 10, h: 50, style: 'volcano.wallA' },
      { x: 550, y: 350, w: 10, h: 50, style: 'volcano.wallA' },
      { x: 590, y: 350, w: 10, h: 50, style: 'volcano.wallA' },
      { x: 550, y: 160, w: 50, h: 190, style: 'volcano.wallA' },
      { x: 720, y: 160, w: 50, h: 240, style: 'volcano.wallA' },
      { x: 1250, y: 200, w: 100, h: 200, style: 'volcano.wallA' },
      { x: 1500, y: 200, w: 100, h: 200, style: 'volcano.wallA' },
      { x: 1350, y: 350, w: 150, h: 50, style: 'volcano.wallA' },
      { x: 1350, y: 200, w: 150, h: 50, style: 'volcano.wallA' },
      { x: 1250, y: 150, w: 50, h: 50, style: 'volcano.wallA' },
      { x: 1350, y: 150, w: 50, h: 50, style: 'volcano.wallA' },
      { x: 1450, y: 150, w: 50, h: 50, style: 'volcano.wallA' },
      { x: 1550, y: 150, w: 50, h: 50, style: 'volcano.wallA' },
      { x: 300, y: 340, w: 250, h: 10, style: 'volcano.wallA' },
      { x: 350, y: 330, w: 50, h: 10, style: 'volcano.wallA' },
      { x: 400, y: 320, w: 50, h: 20, style: 'volcano.wallA' },
      { x: 450, y: 310, w: 50, h: 30, style: 'volcano.wallA' },
      { x: 500, y: 300, w: 50, h: 40, style: 'volcano.wallA' }
    ],
    skills: { block: 20, dig: 0, float: 20, climb: 0, bash: 10, build: 20, mine: 1, bomb: 10 }
  },
  
  // niveau 21

    {
    name: 'Poteaux',
    total: 20, goal: 15,
    dir: 1,
    width: 1600,
    theme: 'dawn',
    hatch: { x: 140, y: 280 },
    exit: { x: 1490, y: 420 },
    rects: [
      { x: 50, y: 200, w: 50, h: 250, style: 'dawn.wallA' },
      { x: 350, y: 200, w: 50, h: 250, style: 'dawn.wallA' },
      { x: 650, y: 200, w: 50, h: 250, style: 'dawn.wallA' },
      { x: 100, y: 350, w: 250, h: 30, style: 'dawn.wallB' },
      { x: 40, y: 180, w: 70, h: 20, style: 'dawn.wallB' },
      { x: 340, y: 180, w: 70, h: 20, style: 'dawn.wallB' },
      { x: 640, y: 180, w: 70, h: 20, style: 'dawn.wallB' },
      { x: 400, y: 370, w: 250, h: 30, style: 'dawn.wallB' },
      { x: 950, y: 150, w: 50, h: 300, style: 'dawn.wallA' },
      { x: 1250, y: 150, w: 50, h: 300, style: 'dawn.wallA' },
      { x: 1550, y: 150, w: 50, h: 300, style: 'dawn.wallA' },
      { x: 940, y: 130, w: 70, h: 20, style: 'dawn.wallB' },
      { x: 1240, y: 130, w: 70, h: 20, style: 'dawn.wallB' },
      { x: 700, y: 330, w: 250, h: 30, style: 'dawn.wallB' },
      { x: 1540, y: 130, w: 60, h: 20, style: 'dawn.wallB' },
      { x: 1000, y: 290, w: 250, h: 30, style: 'dawn.wallB' },
      { x: 1300, y: 420, w: 250, h: 30, style: 'dawn.wallB' },
      { x: 350, y: 200, w: 10, h: 250, style: 'dawn.wallB' },
      { x: 390, y: 200, w: 10, h: 250, style: 'dawn.wallB' },
      { x: 50, y: 200, w: 10, h: 250, style: 'dawn.wallB' },
      { x: 90, y: 200, w: 10, h: 250, style: 'dawn.wallB' },
      { x: 650, y: 200, w: 10, h: 250, style: 'dawn.wallB' },
      { x: 690, y: 200, w: 10, h: 250, style: 'dawn.wallB' },
      { x: 950, y: 150, w: 10, h: 300, style: 'dawn.wallB' },
      { x: 990, y: 150, w: 10, h: 300, style: 'dawn.wallB' },
      { x: 1250, y: 150, w: 10, h: 300, style: 'dawn.wallB' },
      { x: 1290, y: 150, w: 10, h: 300, style: 'dawn.wallB' },
      { x: 1550, y: 150, w: 10, h: 300, style: 'dawn.wallB' },
      { x: 1590, y: 150, w: 10, h: 300, style: 'dawn.wallB' }
    ],
    skills: { block: 20, dig: 20, float: 20, climb: 20, bash: 20, build: 20, mine: 20, bomb: 20 }
  },
  // niveau 22
  {
    name: 'Le Chateau',
    total: 20, goal: 15,
    dir: 1,
    width: 1200,
    theme: 'volcano',
    hatch: { x: 24, y: 120 },
    exit: { x: 1110, y: 420 },
    rects: [
      { x: 150, y: 150, w: 70, h: 300, style: 'volcano.wallA' },
      { x: 220, y: 150, w: 510, h: 10, style: 'volcano.wallA' },
      { x: 220, y: 220, w: 510, h: 10, style: 'volcano.wallA' },
      { x: 220, y: 290, w: 510, h: 10, style: 'volcano.wallA' },
      { x: 220, y: 360, w: 510, h: 10, style: 'volcano.wallA' },
      { x: 220, y: 430, w: 510, h: 10, style: 'volcano.wallA' },
      { x: 350, y: 160, w: 10, h: 60, style: 'volcano.wallA' },
      { x: 150, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 170, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 190, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 210, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 730, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 750, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 770, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 790, y: 140, w: 10, h: 10, style: 'volcano.wallA' },
      { x: 100, y: 150, w: 50, h: 20, style: 'volcano.wallA' },
      { x: 50, y: 160, w: 50, h: 20, style: 'volcano.wallA' },
      { x: 0, y: 170, w: 50, h: 20, style: 'volcano.wallA' },
      { x: 730, y: 420, w: 470, h: 10, style: 'volcano.wallA' },
      { x: 730, y: 150, w: 70, h: 230, style: 'volcano.wallA' },
      { x: 590, y: 160, w: 10, h: 70, style: 'volcano.wallA' },
      { x: 470, y: 230, w: 10, h: 60, style: 'volcano.wallA' },
      { x: 320, y: 300, w: 10, h: 60, style: 'volcano.wallA' },
      { x: 570, y: 300, w: 10, h: 60, style: 'volcano.wallA' },
      { x: 440, y: 370, w: 10, h: 60, style: 'volcano.wallA' },
      { x: 240, y: 370, w: 10, h: 60, style: 'volcano.wallA' }
    ],
    skills: { block: 12, dig: 0, float: 0, climb: 0, bash: 0, build: 0, mine: 0, bomb: 10 }
  },

  // niveau 23
    {
    name: 'Franchissable',
    total: 25, goal: 25,
    dir: 1,
    width: 1200,
    theme: 'cave',
    hatch: { x: 60, y: 230 },
    exit: { x: 1150, y: 100 },
    rects: [
      { x: 0, y: 300, w: 1200, h: 150, style: 'cave.groundA', grass: true },
      { x: 200, y: 0, w: 50, h: 300, style: 'cave.wallA' },
      { x: 350, y: 0, w: 50, h: 300, style: 'cave.wallA' },
      { x: 500, y: 0, w: 50, h: 300, style: 'cave.wallA' },
      { x: 650, y: 0, w: 50, h: 300, style: 'cave.wallA' },
      { x: 800, y: 0, w: 50, h: 300, style: 'cave.wallA' },
      { x: 950, y: 0, w: 50, h: 300, style: 'cave.wallA' },
      { x: 1100, y: 100, w: 50, h: 200, style: 'cave.wallA' },
      { x: 1100, y: 100, w: 100, h: 50, style: 'cave.wallA' }
    ],
    skills: { block: 0, dig: 0, float: 1, climb: 24, bash: 6, build: 8, mine: 0, bomb: 0 }
  },
  // niveau 24
    {
    name: 'Chapiteau',
    total: 50, goal: 42,
    dir: 1,
    width: 800,
    theme: 'night',
    hatch: { x: 160, y: 190 },
    exit: { x: 650, y: 430 },
    rects: [
      { x: 0, y: 250, w: 400, h: 20, style: 'night.wallB' },
      { x: 0, y: 270, w: 50, h: 20, style: 'night.wallB' },
      { x: 0, y: 290, w: 30, h: 160, style: 'night.wallB' },
      { x: 50, y: 150, w: 50, h: 20, style: 'night.wallB' },
      { x: 0, y: 160, w: 50, h: 20, style: 'night.wallB' },
      { x: 100, y: 140, w: 450, h: 20, style: 'night.wallB' },
      { x: 600, y: 170, w: 50, h: 20, style: 'night.wallB' },
      { x: 650, y: 180, w: 50, h: 20, style: 'night.wallB' },
      { x: 700, y: 190, w: 50, h: 20, style: 'night.wallB' },
      { x: 750, y: 200, w: 50, h: 20, style: 'night.wallB' },
      { x: 540, y: 150, w: 60, h: 20, style: 'night.wallB' },
      { x: 250, y: 430, w: 550, h: 20, style: 'night.wallB' },
      { x: 150, y: 300, w: 30, h: 150, style: 'dawn.wallA' },
      { x: 120, y: 270, w: 90, h: 30, style: 'dawn.wallA' }
    ],
    skills: { block: 20, dig: 20, float: 20, climb: 20, bash: 20, build: 20, mine: 20, bomb: 20 }
  },
  // niveau 25
    {
    name: 'Ni vache ni veau',
    total: 20, goal: 15,
    dir: 1,
    width: 1600,
    theme: 'volcano',
    hatch: { x: 100, y: 280 },
    exit: { x: 1520, y: 230 },
    rects: [
      { x: 1520, y: 250, w: 30, h: 200, style: 'volcano.wallB' },
      { x: 1400, y: 250, w: 30, h: 200, style: 'volcano.wallB' },
      { x: 1380, y: 230, w: 190, h: 30, style: 'volcano.wallB' },
      { x: 1370, y: 430, w: 90, h: 20, style: 'volcano.wallB' },
      { x: 1490, y: 430, w: 90, h: 20, style: 'volcano.wallB' },
      { x: 50, y: 350, w: 20, h: 100, style: 'volcano.wallB' },
      { x: 130, y: 350, w: 20, h: 100, style: 'volcano.wallB' },
      { x: 40, y: 340, w: 120, h: 20, style: 'volcano.wallB' },
      { x: 50, y: 310, w: 20, h: 30, style: 'volcano.wallA' },
      { x: 0, y: 430, w: 450, h: 20, style: 'volcano.wallA' },
      { x: 450, y: 350, w: 30, h: 100, style: 'volcano.wallA' },
      { x: 430, y: 350, w: 20, h: 10, style: 'night.wallB' },
      { x: 410, y: 360, w: 20, h: 10, style: 'night.wallB' },
      { x: 390, y: 370, w: 20, h: 10, style: 'night.wallB' },
      { x: 370, y: 380, w: 20, h: 10, style: 'night.wallB' },
      { x: 350, y: 390, w: 20, h: 10, style: 'night.wallB' },
      { x: 310, y: 410, w: 20, h: 10, style: 'night.wallB' },
      { x: 290, y: 420, w: 20, h: 10, style: 'night.wallB' },
      { x: 480, y: 350, w: 10, h: 10, style: 'night.wallB' },
      { x: 490, y: 360, w: 10, h: 10, style: 'night.wallB' },
      { x: 500, y: 370, w: 10, h: 10, style: 'night.wallB' },
      { x: 510, y: 380, w: 10, h: 10, style: 'night.wallB' },
      { x: 520, y: 390, w: 10, h: 10, style: 'night.wallB' },
      { x: 530, y: 400, w: 10, h: 10, style: 'night.wallB' },
      { x: 540, y: 410, w: 10, h: 10, style: 'night.wallB' },
      { x: 550, y: 420, w: 10, h: 10, style: 'night.wallB' },
      { x: 560, y: 430, w: 190, h: 20, style: 'volcano.wallB' },
      { x: 850, y: 430, w: 520, h: 20, style: 'volcano.wallB' },
      { x: 730, y: 370, w: 140, h: 60, style: 'volcano.wallB' },
      { x: 710, y: 420, w: 180, h: 30, style: 'volcano.wallA' },
      { x: 1050, y: 400, w: 10, h: 30, style: 'night.wallB' },
      { x: 1090, y: 400, w: 10, h: 30, style: 'night.wallB' },
      { x: 1040, y: 390, w: 70, h: 10, style: 'night.wallB' },
      { x: 1120, y: 390, w: 70, h: 10, style: 'night.wallB' },
      { x: 1130, y: 400, w: 10, h: 30, style: 'night.wallB' },
      { x: 1170, y: 400, w: 10, h: 30, style: 'night.wallB' },
      { x: 1200, y: 390, w: 70, h: 10, style: 'night.wallB' },
      { x: 1210, y: 400, w: 10, h: 30, style: 'night.wallB' },
      { x: 1250, y: 400, w: 10, h: 30, style: 'night.wallB' },
      { x: 1080, y: 350, w: 70, h: 10, style: 'night.wallB' },
      { x: 1090, y: 360, w: 10, h: 30, style: 'night.wallB' },
      { x: 1130, y: 360, w: 10, h: 30, style: 'night.wallB' },
      { x: 1210, y: 360, w: 10, h: 30, style: 'night.wallB' },
      { x: 1170, y: 360, w: 10, h: 30, style: 'night.wallB' },
      { x: 1160, y: 350, w: 70, h: 10, style: 'night.wallB' },
      { x: 1120, y: 310, w: 80, h: 10, style: 'night.wallB' },
      { x: 1130, y: 320, w: 10, h: 30, style: 'night.wallB' },
      { x: 1180, y: 320, w: 10, h: 30, style: 'night.wallB' },
      { x: 1140, y: 280, w: 10, h: 30, style: 'night.wallB' },
      { x: 1170, y: 280, w: 10, h: 30, style: 'night.wallB' },
      { x: 1130, y: 270, w: 60, h: 10, style: 'night.wallB' },
      { x: 1380, y: 390, w: 20, h: 10, style: 'night.wallB' },
      { x: 1360, y: 400, w: 20, h: 10, style: 'night.wallB' },
      { x: 1340, y: 410, w: 20, h: 10, style: 'night.wallB' },
      { x: 1320, y: 420, w: 20, h: 10, style: 'night.wallB' },
      { x: 1290, y: 360, w: 70, h: 10, style: 'night.wallB' },
      { x: 1350, y: 320, w: 50, h: 10, style: 'night.wallB' },
      { x: 1290, y: 280, w: 60, h: 10, style: 'night.wallB' },
      { x: 300, y: 0, w: 20, h: 150, style: 'volcano.wallB' },
      { x: 580, y: 0, w: 20, h: 150, style: 'volcano.wallB' },
      { x: 280, y: 150, w: 340, h: 20, style: 'volcano.wallB' },
      { x: 1000, y: 100, w: 250, h: 20, style: 'volcano.wallB' },
      { x: 1050, y: 0, w: 20, h: 100, style: 'volcano.wallB' },
      { x: 1180, y: 0, w: 20, h: 100, style: 'volcano.wallB' },
      { x: 600, y: 400, w: 30, h: 30, style: 'volcano.wallB' },
      { x: 640, y: 400, w: 30, h: 30, style: 'volcano.wallB' },
      { x: 610, y: 370, w: 30, h: 30, style: 'volcano.wallB' },
      { x: 650, y: 370, w: 30, h: 30, style: 'volcano.wallB' },
      { x: 680, y: 400, w: 30, h: 30, style: 'volcano.wallB' },
      { x: 630, y: 340, w: 30, h: 30, style: 'volcano.wallB' }
    ],
    skills: { block: 30, dig: 5, float: 30, climb: 5, bash: 30, build: 30, mine: 0, bomb: 5 }
  }

];
