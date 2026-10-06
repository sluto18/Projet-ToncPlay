'use strict';
/* ════════════════════════════════════════════════════════════════════
   CARTONNERIE — Tycoon de fabrication de cartons (v3)
   ────────────────────────────────────────────────────────────────────
   Tout est dessiné dans UN SEUL canvas plein écran :
     · HUD haut : argent | science | bonus || [RECH] [RECET] [MENU]
     · zone de jeu centrale (vue maximale quand la colonne est masquée)
     · colonne droite : OBJECTIFS & LOGS, repliable
     · barre bas : [R] Tourner | [X] Démolir || outils numérotés | AGRANDIR
   Règles de placement :
     · machines 2×2 : 1 face de sortie (goulotte à flèche), 3 faces d'entrée
     · expédition 2×2 : OBLIGATOIREMENT contre un mur extérieur ;
       la face murale est le quai (damier), les 3 faces internes vendent tout
     · convoyeur : 1 case pleine, grand chevron de sens
   Clic gauche sans outil : panneau d'infos + AMÉLIORER. Clic droit : annuler.
   Sommaire :
     1. CONFIGURATION       6. PLACEMENT & ENTRÉES      11. TUTORIEL
     2. DONNÉES             7. SPRITES                  12. SAUVEGARDE
     3. ÉTAT & GRILLE       8. RENDU JEU                13. INIT & BOUCLE
     4. AUDIO               9. RENDU INTERFACE
     5. SIMULATION         10. PROGRESSION (usines)
   ════════════════════════════════════════════════════════════════════ */


/* ══════════════ 1. CONFIGURATION — équilibrage centralisé ══════════════ */

const TICK_MS = 100;                 // tick de simulation fixe : 10 Hz
const DT      = TICK_MS/1000;
const SAVE_KEY = 'cartonnerie.save.v3';
const WALL    = 8;                   // mur dessiné autour de la grille
const MAXLVL  = 5;                   // niveaux d'amélioration par machine

const ECO = {
  beltSpeed   : [0.18,0.25,0.32,0.39,0.46,0.53], // cases/tick — 6 valeurs (niveaux 0 à 5 !)
  prodSpeed   : [1,1.25,1.56,1.95,2.44,3.05],   // cadence machines à papier
  craftSpeed  : [1,1.25,1.56,1.95,2.44,3.05],   // cadence ateliers/assembleuses
  costMult    : [1,0.94,0.88,0.83,0.78,0.73],   // remise sur coût des machines
  upBonus     : 0.30,   // +30 % de vitesse PAR NIVEAU d'amélioration individuelle
  upBase      : 0.75,   // coût d'amélioration = base × 0.75 × 2.4^niveau
  upGrowth    : 2.4,
  sciPerEntity: 0.007,  // science passive / s / entité construite
  offlineF    : 0.5, offlineCapH : 2,
  refund      : 0.5,    // remboursement à la démolition
  growthM     : 1.15, growthB : 1.06,
  promoBonus  : 0.12,   // +12 % de ventes par usine terminée
};


/* ══════════════ 2. DONNÉES ══════════════ */

const ITEMS = {
  papier      : { name:'Papier',              value:1,   sci:0,   c:'#f2e9d4', c2:'#b9ad8f' },
  carton      : { name:'Carton ondulé',       value:5,   sci:0,   c:'#cf9f66', c2:'#8a6136' },
  renfort     : { name:'Renfort',             value:3,   sci:0,   c:'#e3b74e', c2:'#97722a' },
  intercalaire: { name:'Intercalaire',        value:2,   sci:0,   c:'#d9d3bd', c2:'#a59a80' },
  poignee     : { name:'Poignée',             value:4,   sci:0,   c:'#d78b4e', c2:'#8f5426' },
  impression  : { name:'Impression',          value:6,   sci:0,   c:'#88b0c4', c2:'#4d6b7a' },
  petit_carton: { name:'Petit carton',        value:15,  sci:0.2, c:'#c08a52', c2:'#7d5230' },
  carton_moyen: { name:'Carton moyen',        value:30,  sci:0.6, c:'#c99760', c2:'#7d5230' },
  grand_carton: { name:'Grand carton',        value:60,  sci:1.5, c:'#b3824e', c2:'#6d4726' },
  caisse      : { name:'Caisse de transport', value:120, sci:4,   c:'#9a7046', c2:'#5b3d22' },
  pack_luxe   : { name:'Pack luxe',           value:250, sci:10,  c:'#7a5236', c2:'#452d1c' },
};

/* ══ CANONIQUE : les 17 machines, d'un seul tenant ══ */
const MACHINES = {
  /* ── LOGISTIQUE ── */
  convoyeur: { name:'Convoyeur', short:'CONVOYEUR', cat:'logistique', cost:2, growth:ECO.growthB,
    desc:'Occupe toute sa case et transporte un item à la fois, dans le sens de son grand chevron. Glissez la souris pour tracer une ligne.' },
  repartiteur: { name:'Répartiteur de flux', short:'RÉPARTIT.', cat:'logistique', cost:40,
    desc:'2 entrées (face arrière), 2 sorties (face avant). Fusionne deux flux en un, ou répartit un flux sur deux sorties, en alternance. Tampon interne de 6 items.' },

  /* ── PAPIER (3 paliers) ── */
  machine_papier: { name:'Machine à papier', short:'MÀ PAPIER', cat:'extraction', cost:10, time:1.8, out:'papier',
    desc:'Transforme un bac de vieux papiers en feuilles propres, en continu. Aucune entrée.' },
  machine_papier_2: { name:'Cuve industrielle', short:'CUVE INDUS.', cat:'extraction', cost:160, time:0.9, out:'papier',
    desc:'Machine à papier industrielle : deux fois plus rapide, pour les chaînes gourmandes en papier.' },
  machine_papier_3: { name:'Ligne continue', short:'LIGNE CONT.', cat:'extraction', cost:2000, time:0.45, out:'papier',
    desc:'Ligne de production continue : le papier sort quatre fois plus vite que la machine de base.' },

  /* ── ONDULATION (3 paliers) ── */
  onduleuse: { name:'Onduleuse', short:'ONDULEUSE', cat:'ondulation', cost:60, time:3.0,
    in:{ papier:3 }, out:'carton',
    desc:'La machine phare : colle 3 feuilles de papier en une plaque de carton ondulé.' },
  onduleuse_2: { name:'Onduleuse double-face', short:'OND. DBLE-F', cat:'ondulation', cost:800, time:1.5,
    in:{ papier:3 }, out:'carton',
    desc:'Onduleuse double-face : deux fois plus rapide, avec une seconde paire de rouleaux.' },
  onduleuse_3: { name:'Onduleuse rotative', short:'OND. ROTAT.', cat:'ondulation', cost:9000, time:0.75,
    in:{ papier:3 }, out:'carton',
    desc:'L’onduleuse rotative géante : la cadence industrielle, pour les très grosses chaînes.' },

  /* ── ATELIERS (composants) ── */
  atelier_renfort: { name:'Atelier renforts', short:'RENFORTS', cat:'transformation', cost:120, time:2.5,
    in:{ carton:1 }, out:'renfort', desc:'Façonne des équerres de protection à partir de carton ondulé.' },
  atelier_intercal: { name:'Atelier intercalaires', short:'INTERCAL.', cat:'transformation', cost:90, time:2.0,
    in:{ papier:1 }, out:'intercalaire', desc:'Découpe des feuilles de calage dans le papier.' },
  atelier_poignee: { name:'Découpe-poignées', short:'POIGNÉES', cat:'transformation', cost:180, time:3.0,
    in:{ carton:1 }, out:'poignee', desc:'Découpe des poignées dans le carton ondulé.' },
  imprimeuse: { name:'Imprimeuse', short:'IMPRIMEUSE', cat:'transformation', cost:240, time:3.0,
    in:{ papier:1 }, out:'impression', desc:'Imprime logos et décors sur le papier (encre bleue).' },

  /* ── PRODUITS FINIS ── */
  assem_petit: { name:'Assembleuse petit carton', short:'PETIT CTN', cat:'assemblage', cost:80, time:2.5,
    in:{ carton:2 }, out:'petit_carton', desc:'Assemble 2 plaques de carton ondulé en un petit carton.' },
  assem_moyen: { name:'Assembleuse carton moyen', short:'CTN MOYEN', cat:'assemblage', cost:220, time:3.5,
    in:{ carton:2, renfort:1 }, out:'carton_moyen', desc:'Carton renforcé : 2 plaques + 1 équerre de protection.' },
  assem_grand: { name:'Assembleuse grand carton', short:'CTN GRAND', cat:'assemblage', cost:500, time:4.5,
    in:{ carton:3, renfort:2, intercalaire:1 }, out:'grand_carton', desc:'Grand carton : 3 plaques, 2 renforts, 1 intercalaire.' },
  assem_caisse: { name:'Assembleuse caisse', short:'CAISSE', cat:'assemblage', cost:1200, time:6.0,
    in:{ carton:4, renfort:2, intercalaire:2, poignee:1 }, out:'caisse',
    desc:'Caisse de transport lourde : 4 plaques, 2 renforts, 2 intercalaires, 1 poignée.' },
  assem_luxe: { name:'Assembleuse pack luxe', short:'PACK LUXE', cat:'assemblage', cost:3000, time:7.0,
    in:{ carton:3, impression:1, intercalaire:1, poignee:1, renfort:1 }, out:'pack_luxe',
    desc:'Le produit phare : 3 plaques, impression, calage, poignée et renfort. 5 chaînes convergent.' },

  /* ── VENTE ── */
  expedition: { name:'Expédition', short:'EXPÉDITION', cat:'vente', cost:15, wall:true,
    desc:'Le quai de chargement : se pose CONTRE UN MUR EXTÉRIEUR, damier vers l’extérieur. Les 3 faces intérieures vendent tout item entrant, instantanément.' },
};

const BASE_UNLOCKED = ['convoyeur','repartiteur','machine_papier','expedition','onduleuse','assem_petit'];

const RESEARCH_UP = [
  { id:'belt',    name:'Convoyeurs rapides',    desc:'Vitesse des rubans : 1,8 → 5,3 cases/s',       costs:[8,20,50,120,300] },
  { id:'prod',    name:'Cuves survoltées',      desc:'Cadence des machines à papier : ×1,25 / niv.',  costs:[10,30,80,200,500] },
  { id:'craft',   name:'Ateliers optimisés',    desc:'Cadence des ateliers et assembleuses : ×1,25 / niv.', costs:[15,40,100,250,600] },
  { id:'discount',name:'Fournisseurs négociés', desc:'Coût des machines : −6 % / niveau',             costs:[30,90,250,600,1500] },
];
const RESEARCH_UNLOCK = [
  { id:'u_papier2', name:'Cuve industrielle',     cost:60,   unlocks:['machine_papier_2'],
    toast:'Nouvelle machine : CUVES INDUSTRIELLES', toastBody:'Machine à papier deux fois plus rapide.' },
  { id:'u_ond2',    name:'Onduleuse double-face', cost:150,  unlocks:['onduleuse_2'],
    toast:'Nouvelle machine : ONDULEUSE DOUBLE-FACE', toastBody:'Ondulation deux fois plus rapide.' },
  { id:'u_papier3', name:'Ligne continue',        cost:500,  unlocks:['machine_papier_3'],
    toast:'Nouvelle machine : LIGNE CONTINUE', toastBody:'Le papier sort quatre fois plus vite.' },
  { id:'u_ond3',    name:'Onduleuse rotative',    cost:1200, unlocks:['onduleuse_3'],
    toast:'Nouvelle machine : ONDULEUSE ROTATIVE', toastBody:'L’ondulation à la cadence industrielle.' },
  { id:'u_renfort',  name:'Équerres de protection', cost:20,  unlocks:['atelier_renfort','assem_moyen'],
    toast:'Nouveau produit : CARTON MOYEN', toastBody:'Atelier renforts débloqué : 2 cartons + 1 renfort.' },
  { id:'u_intercal', name:'Calage de précision',    cost:80,  unlocks:['atelier_intercal','assem_grand'],
    toast:'Nouveau produit : GRAND CARTON', toastBody:'Atelier intercalaires débloqué : la chaîne se ramifie.' },
  { id:'u_annexe',   name:'Poignées & impression',  cost:250, unlocks:['atelier_poignee','imprimeuse','assem_caisse'],
    toast:'Nouveau produit : CAISSE DE TRANSPORT', toastBody:'Découpe-poignées et imprimeuse débloquées.' },
  { id:'u_luxe',     name:'Ligne signature',        cost:800, unlocks:['assem_luxe'],
    toast:'Nouveau produit : PACK LUXE', toastBody:'Le produit phare : 5 ingrédients convergent.' },
];

const CATS = [
  ['logistique',    ['convoyeur','repartiteur']],
  ['extraction',    ['machine_papier','machine_papier_2','machine_papier_3']],
  ['ondulation',    ['onduleuse','onduleuse_2','onduleuse_3']],
  ['transformation',['atelier_renfort','atelier_intercal','atelier_poignee','imprimeuse']],
  ['assemblage',    ['assem_petit','assem_moyen','assem_grand','assem_caisse','assem_luxe']],
  ['vente',         ['expedition']],
];

/* La carrière :  Objectifs remplis → promotion au siège. */
const FACTORIES = [
  { name:'Le Hangar des Bords de Route', sub:'Affectation n°1 — Stagiaire',
    grid:[16,12], start:80, sci:0,
    unlocks:[], research:{},
    goals:[{t:'money',n:900},{t:'sold',item:'petit_carton',n:10}],
    desc:'Un vieux hangar, un contrat de livraison, et vous. Faites tourner la boutique.' },
  { name:'L’Atelier du Vieux Quartier', sub:'Affectation n°2 — Chef d’atelier',
    grid:[20,14], start:450, sci:25,
    unlocks:['atelier_renfort','assem_moyen'], research:{belt:1},
    goals:[{t:'money',n:7000},{t:'sold',item:'carton_moyen',n:8}],
    desc:'Le quartier veut des cartons renforcés. Livrez, et le siège vous regardera d’un œil neuf.' },
  /* ── missions spéciales : petites grilles, murs porteurs indestructibles,
     objectifs modestes — des examens de compacité entre deux affectations ── */
  { name:'Le Dépôt des Poutres', sub:'Affectation spéciale — exercice d’étroitesse',
    grid:[13,9], start:900, sci:45,
    unlocks:[], research:{}, obstacles:[[2,3,4,1],[7,3,4,1],[6,5,1,3]],
    goals:[{t:'money',n:2500},{t:'sold',item:'carton_moyen',n:5}],
    desc:'Un dépôt minuscule traversé de poutres maîtresses : prouvez qu’une chaîne renforcée tient entre les murs. Les poutres sont indestructibles.' },
  { name:'La Cartonnerie des Canaux', sub:'Affectation n°3 — Directeur adjoint',
    grid:[23,16], start:2500, sci:80,
    unlocks:['atelier_intercal','assem_grand'], research:{belt:1,prod:1},
    goals:[{t:'money',n:45000},{t:'sold',item:'grand_carton',n:6}],
    desc:'Les entrepôts des canaux réclament du volume : grands cartons obligatoires.' },
  { name:'L’Entrepôt des Pilotis', sub:'Affectation spéciale — slalom industriel',
    grid:[14,10], start:5000, sci:150,
    unlocks:[], research:{}, obstacles:[[3,3,1,4],[10,3,1,4],[6,4,2,2]],
    goals:[{t:'money',n:16000},{t:'sold',item:'grand_carton',n:4}],
    desc:'Des piles de fondation coupent l’entrepôt en couloirs. Livrez quand même des grands cartons, en slalom.' },
  { name:'Le Complexe Ondulé-Central', sub:'Affectation n°4 — Directeur de site',
    grid:[26,18], start:14000, sci:260,
    unlocks:['atelier_poignee','imprimeuse','assem_caisse'], research:{belt:2,prod:1,craft:1},
    goals:[{t:'money',n:280000},{t:'sold',item:'caisse',n:5}],
    desc:'Le complexe industriel du groupe. On y assemble des caisses complètes, poignées comprises.' },
  { name:'La Halle aux Cloisons', sub:'Affectation spéciale — le labyrinthe humide',
    grid:[15,10], start:25000, sci:550,
    unlocks:[], research:{}, obstacles:[[2,4,4,1],[9,4,4,1],[6,1,1,2],[6,7,1,2]],
    goals:[{t:'money',n:90000},{t:'sold',item:'caisse',n:3}],
    desc:'Une halle couper en quatre par ses cloisons d’origine. Trois caisses complètes dans ce dédale, et le siège citera votre nom.' },
  { name:'La Méga-Cartonnerie du Port', sub:'Affectation n°5 — Directeur régional',
    grid:[30,20], start:90000, sci:900,
    unlocks:['assem_luxe'], research:{belt:2,prod:2,craft:2},
    goals:[{t:'money',n:1800000},{t:'sold',item:'pack_luxe',n:3}],
    desc:'Les paquebots du port n’emportent que du luxe. Le pack signature, ou rien.' },
  { name:'Le Hangar des Écluses', sub:'Affectation spéciale — le sas final',
    grid:[16,11], start:160000, sci:1900,
    unlocks:[], research:{}, obstacles:[[5,2,1,7],[10,2,1,7],[7,5,2,1]],
    goals:[{t:'money',n:450000},{t:'sold',item:'pack_luxe',n:2}],
    desc:'Trois compartiments d’écluse, à peine plus larges qu’un pack luxe. Le dernier exercice avant l’Impériale.' },
  { name:'L’Impériale Emballage', sub:'Affectation finale — Directeur du groupe',
    grid:[34,23], start:600000, sci:3200,
    unlocks:[], research:{belt:3,prod:2,craft:2,discount:1},
    goals:[{t:'money',n:12000000},{t:'sold',item:'pack_luxe',n:25}],
    desc:'La plus grande cartonnerie du pays. Votre nom finira sur les caisses.' },
];
const GRADES = ['Stagiaire','Chef d’atelier','Chef de chantier','Directeur adjoint','Responsable de production','Directeur de site','Directeur de complexe','Directeur régional','Directeur des opérations','Directeur du groupe','Légende de l’emballage'];

/* Tutoriel — */
const TUT = [
  { hl:'machine_papier', title:'Bienvenue, stagiaire !',
    text:'Sélectionnez la MACHINE À PAPIER dans la barre du bas et placez-la. Elle occupe 4 cases (2×2) : la goulotte à flèche ivoire marque sa SORTIE, les 3 autres faces sont des ENTRÉES. La touche R l’oriente.',
    check:()=>cnt('machine_papier')>=1 },
  { hl:'expedition', title:'Un quai contre le mur',
    text:'Placez une EXPÉDITION CONTRE UN MUR EXTÉRIEUR : les camions chargent depuis l’extérieur, le damier jaune et noir marque la face du mur. Rotation automatique. Ses 3 faces intérieures acceptent tout — chaque item qui y entre est vendu.',
    check:()=>cnt('expedition')>=1 },
  { hl:'convoyeur', title:'Reliez la machine',
    text:'Reliez la sortie de la machine au quai : soit en ACCOLANT une machine contre la suivante (les faces d’entrée se nourrissent toutes seules), soit avec des CONVOYEURS — glissez la souris pour tracer une ligne, les rubans s’orientent seuls. Objectif : voir les feuilles circuler et l’argent monter.',
    check:()=>((state.stats.sold.papier)||0)>=1 },
  { hl:'onduleuse', title:'Première transformation',
    text:'Placez une ONDULEUSE sur le chemin (onglet ONDULATION, touche 1) : 3× Papier → 1× Carton ondulé, vendu 5 $ au lieu de 1 $. Les items entrent par les faces sans goulotte — par ruban ou machine accolée. NB : si vous en possédez déjà une, cette étape se validera d’elle-même.',
    skipIfOwned:true, check:()=>((state.stats.produced.carton)||0)>=1 },
  { hl:'assem_petit', title:'Le premier produit fini',
    text:'Placez l’ASSEMBLEUSE PETIT CARTON (onglet PRODUITS) : 2× Carton ondulé → 1× Petit carton (15 $). Insérez-la dans la chaîne puis vendez votre premier petit carton.',
    skipIfOwned:true, check:()=>((state.stats.sold.petit_carton)||0)>=1 },
  { hl:null, title:'Bouchons, objectifs, promotion', last:true,
    text:'Leçon finale : une machine ou un ruban bloqué affiche un panneau « ! ». Un CLIC GAUCHE sur une machine ouvre ses infos et son AMÉLIORATION dans la colonne de droite. Un CLIC DROIT annule la sélection. Et surveillez la colonne OBJECTIFS : remplissez-la pour que le siège vous propose la promotion vers une usine plus grande. Bonne chance !' },
];


/* ══════════════ 3. ÉTAT & GRILLE ══════════════ */

const DIRS = [ {x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1} ]; // 0:droite 1:bas 2:gauche 3:haut

const state = {
  screen:'title', inRun:false,
  money:0, sci:0,
  gridW:16, gridH:12, extLevel:0,
  entities:[], grid:[],
  counts:{},
  research:{belt:0,prod:0,craft:0,discount:0},
  unlocksDone:{}, unlocked:[...BASE_UNLOCKED],
  factoryIdx:0, maxFactoryIdx:0, factoryDone:[false,false,false,false,false,false,false,false,false,false],
  stats:{ sold:{}, produced:{}, moneyTotal:0, sciTotal:0, placed:0, destroyed:0, playTime:0 },
  career:{ moneyTotal:0, sciTotal:0, sold:{}, playTime:0 },
  rate:{money:0,sci:0},
  tut:0, tutDone:false, sound:true, time:0,
  modal:null,
  inspect:null,                    // entité examinée (clic gauche sans outil)
  barCat:'logistique',             // onglet actif de la barre de construction
  sideCollapsed:false,             // colonne OBJECTIFS & LOGS repliée
  homeScroll:0, homeMax:0, barScroll:0, barMax:0,
  promoNotified:false, offlineApplied:false,
};

const build = { type:null, rot:0, expIdx:0, curve:0, destroy:false, hover:{x:-99,y:-99}, dragging:false, lastCell:null, dragPlaced:[] };
const mouse = { x:-1, y:-1 };
const hots  = [];      // zones cliquables de la frame (remplies au rendu, testées au clic)
const toasts= [];
const log   = [];      // journal (colonne droite)
const fx    = [];      // textes flottants "+15 $"
const tf    = { value:'', focused:false }; // champ texte (import de sauvegarde)

let canvas, ctx, W=0, H=0;
let TILE=32, S=2, ox=0, oy=0, hudH=46, barH=88, sideW=230;
let gameX=0, gameY=0, gameW=0, gameH=0;      // canvas de jeu exact (grille + mur)
let blockX=0, blockY=0, blockW=0, blockH=0;  // bloc assemblé : HUD + jeu + colonne + barre
let hudX=0, hudY=0, sideX=0, sideY=0, sideH=0, barY=0;
let uid=0, animT=0, toolOrder=[], bootSave=null, bootSaveTime=0;
let barTip=null, homeArmed=false;
const iconCache={};

/* Machines LONGUES : longueur (cases) DANS le sens du flux — 2 de large. */
const LONG={machine_papier_2:3, machine_papier_3:4, onduleuse_2:3, onduleuse_3:4};

/* Empreinte (w×h cases) selon le type ET la rotation :
   convoyeur 1×1 · machines 2×2 · répartiteur 2×1 perpendiculaire au flux
   · machines longues 2×N (N dans le sens du flux, pivote avec R). */
function fpSize(type,rot){
  if(type==='convoyeur') return {w:1,h:1};
  if(type==='repartiteur') return (rot%2===0)?{w:1,h:2}:{w:2,h:1};
  const L=LONG[type];
  if(L) return (rot%2===0)?{w:L,h:2}:{w:2,h:L};
  return {w:2,h:2};
}

function initGrid(){
  state.grid=[];
  for(let y=0;y<state.gridH;y++) state.grid.push(new Array(state.gridW).fill(null));
  for(const e of state.entities){
    const f=fpSize(e.type,e.rot);
    for(let dy=0;dy<f.h;dy++) for(let dx=0;dx<f.w;dx++)
      if(e.y+dy<state.gridH && e.x+dx<state.gridW) state.grid[e.y+dy][e.x+dx]=e;
  }
}
function cellAt(x,y){
  if(x<0||y<0||x>=state.gridW||y>=state.gridH) return null;
  return state.grid[y][x];
}
/* Mur porteur permanent (missions spéciales) : case condamnée — rien ne
   s'y pose, aucun item ne la traverse. Dérivé des données de la mission,
   donc jamais sauvegardé. */
function obstacleAt(x,y){
  if(x<0||y<0||x>=state.gridW||y>=state.gridH) return false;
  const obs=FACTORIES[state.factoryIdx].obstacles;
  if(!obs) return false;
  for(const o of obs) if(x>=o[0]&&x<o[0]+o[2]&&y>=o[1]&&y<o[1]+o[3]) return true;
  return false;
}
function cnt(type){ return state.counts[type]||0; }
function sellMult(){ return 1 + ECO.promoBonus * state.factoryDone.filter(Boolean).length; }
/* Vitesse d'un ruban — l'indice de recherche est BORNÉ au tableau :
   un niveau hors bornes (données incohérentes) prend la dernière valeur
   au lieu de produire un NaN qui gèle toute la simulation. */
function beltSpeedOf(b){
  const i=clamp(state.research.belt, 0, ECO.beltSpeed.length-1);
  const v=ECO.beltSpeed[i] * (1 + ECO.upBonus*(b.lvl||0));
  return isFinite(v)?v:ECO.beltSpeed[0];
}
function speedMultOf(m){
  const base = m.type.startsWith('machine_papier') ? ECO.prodSpeed[state.research.prod] : ECO.craftSpeed[state.research.craft];
  return base * (1 + ECO.upBonus*(m.lvl||0));
}
function costOf(type){
  const d=MACHINES[type];
  if(!d) return 1e12;   // type inconnu : prix rédhibitoire, jamais achetable (garde-fou)
  return Math.ceil(d.cost * Math.pow(d.growth||ECO.growthM, cnt(type)) * ECO.costMult[state.research.discount]);
}
/* Coût du prochain niveau d'amélioration d'une entité */
function upCost(e){
  return Math.ceil(MACHINES[e.type].cost * ECO.upBase * Math.pow(ECO.upGrowth, e.lvl||0) * ECO.costMult[state.research.discount]);
}
function canPlace(type,x,y,rot){
  const fp=fpSize(type,rot);
  for(let dy=0;dy<fp.h;dy++) for(let dx=0;dx<fp.w;dx++){
    const cx=x+dx, cy=y+dy;
    if(cx<0||cy<0||cx>=state.gridW||cy>=state.gridH) return false;
    if(state.grid[cy][cx]) return false;
    if(obstacleAt(cx,cy)) return false;          // mur porteur : rien ne se pose dessus
  }
  /* L'expédition doit toucher un mur extérieur (le quai perce le mur) */
  if(type==='expedition' && expRotCandidates(x,y).length===0) return false;
  return true;
}
/* Rotations valides d'une expédition en (x,y) : les murs touchés par l'empreinte 2×2 */
function expRotCandidates(x,y){
  const list=[];
  if(y===0)              list.push(3);  // mur haut    → quai vers le haut
  if(y+2===state.gridH)  list.push(1);  // mur bas
  if(x===0)              list.push(2);  // mur gauche
  if(x+2===state.gridW)  list.push(0);  // mur droit
  return list;
}
function expRotAt(x,y){
  const c=expRotCandidates(x,y);
  return c.length ? c[build.expIdx % c.length] : -1;
}
/* Les 2 cases devant la face de sortie — machines 2×2 comme répartiteur. */
function outCells(m){
  const f=fpSize(m.type,m.rot);
  const d=DIRS[m.rot];
  if(d.x){ const cx=m.x+(d.x>0?f.w:-1); return [{x:cx,y:m.y},{x:cx,y:m.y+f.h-1}]; }
  const cy=m.y+(d.y>0?f.h:-1); return [{x:m.x,y:cy},{x:m.x+f.w-1,y:cy}];
}


/* ══════════════ 4. AUDIO — bips discrets (Web Audio API) ══════════════ */

let actx=null;
function audio(){
  if(!state.sound) return null;
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(actx&&actx.state==='suspended') actx.resume();
  return actx;
}
function beep(f,dur,type,vol,slide){
  const a=audio(); if(!a) return;
  const t=a.currentTime, o=a.createOscillator(), g=a.createGain();
  o.type=type||'square'; o.frequency.setValueAtTime(f,t);
  if(slide) o.frequency.linearRampToValueAtTime(f+slide,t+dur);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol||0.04,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.02);
}
let lastSellSnd=0, lastErrSnd=0;
const SFX={
  place(){ beep(190,.07,'square',.035,60); },
  del(){   beep(170,.09,'square',.03,-90); },
  sell(){  const n=performance.now(); if(n-lastSellSnd>90){ lastSellSnd=n; beep(620,.05,'sine',.016); setTimeout(()=>beep(830,.05,'sine',.012),45);} },
  err(){   const n=performance.now(); if(n-lastErrSnd>250){ lastErrSnd=n; beep(110,.12,'sawtooth',.022,-30);} },
  research(){ beep(330,.08,'triangle',.04); setTimeout(()=>beep(415,.08,'triangle',.04),90); setTimeout(()=>beep(495,.12,'triangle',.04),180); },
  up(){    beep(520,.06,'square',.03,80); setTimeout(()=>beep(700,.08,'square',.025,60),70); },
  tut(){   beep(440,.06,'square',.028,110); },
  promo(){ [262,330,392,523,660].forEach((f,i)=>setTimeout(()=>beep(f,.16,'triangle',.05),i*110)); },
  expand(){ beep(240,.1,'square',.04,120); },
  konami(){ [392,523,659,784,1046,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.11,'square',.045),i*90)); },
};


/* ══════════════ 5. SIMULATION — tick fixe 10 Hz ══════════════ */

let winMoney=0, winSci=0, rateT=0, saveT=0;

function tick(){
  state.time+=DT; state.stats.playTime+=DT; state.career.playTime+=DT;

  /* 1) Machines : fabrication + émission des items finis */
  for(const e of state.entities){
    if(e.kind!=='machine') continue;
    tickMachine(e);
    if(e.flash>0) e.flash-=DT;
  }
  /* 2) Items arrivés en bout de ruban → transfert vers la case suivante */
  for(const e of state.entities)
    if(e.kind==='belt' && e.item && e.item.p>=1) tryTransfer(e);
  /* 3) Progression sur les rubans (vitesse recherche + niveau du ruban) */
  for(const e of state.entities)
    if(e.kind==='belt' && e.item && e.item.p<1){
      e.item.p=Math.min(1,e.item.p+beltSpeedOf(e));
      if(e.item.p<1) e.blockedT=0;
    }
  /* 4) Science passive */
  const sg=state.entities.length*ECO.sciPerEntity*DT;
  state.sci+=sg; state.stats.sciTotal+=sg; state.career.sciTotal+=sg; winSci+=sg;

  /* 5) Fenêtre d'1 s → taux affichés + objectifs */
  rateT+=DT;
  if(rateT>=1){
    state.rate.money=state.rate.money*.55+winMoney*.45;
    state.rate.sci  =state.rate.sci  *.55+winSci  *.45;
    winMoney=0; winSci=0; rateT=0;
    checkGoals();
  }
  /* 6) Autosave */
  saveT+=DT;
  if(saveT>=30){ saveT=0; saveGame(); }
  /* 7) Tutoriel */
  tutCheck();
}

/* Cycle d'une machine : sortir → consommer (TOUT ou rien) → fabriquer */
function tickMachine(m){
  if(m.type==='expedition') return;               // quai passif : vente à l'arrivée
  if(m.type==='repartiteur'){ tickRepartiteur(m); return; }
  const def=MACHINES[m.type];
  if(m.outItem){                                  // item fini en attente sur la goulotte
    if(tryEmit(m)) m.outItem=null;
    else { m.blockedT+=DT; return; }
  }
  if(!m.active){
    if(def.in){                                   // démarrage seulement si TOUT est réuni
      for(const k in def.in) if((m.inBuf[k]||0)<def.in[k]) return;
      for(const k in def.in) m.inBuf[k]-=def.in[k];
    }
    m.active=true; m.timer=0;
  }
  m.timer+=DT*speedMultOf(m);
  if(m.timer>=def.time){
    m.active=false; m.timer=0;
    m.outItem=def.out;
    state.stats.produced[def.out]=(state.stats.produced[def.out]||0)+1;
    if(tryEmit(m)) m.outItem=null;
  }
  m.blockedT=0;
}

/* Tente d'émettre UN item sur l'une des 2 cases de sortie, en ALTERNANCE
   (une machine accolée ET un ruban côte à côte reçoivent un item sur deux ;
   si une case refuse, l'autre prend tout). */
function emitOne(m,item){
  const cells=outCells(m);
  const start=(m.emitIdx||0)%cells.length;
  for(let k=0;k<cells.length;k++){
    const c=cells[(start+k)%cells.length];
    const t=cellAt(c.x,c.y);
    if(!t) continue;
    if(t.kind==='belt'){
      if(t.item) continue;
      const d=DIRS[t.rot];
      if(cellAt(t.x+d.x,t.y+d.y)===m) continue;  // ruban qui pointerait vers la machine
      if(!beltPushOK(t,m.rot)) continue;        // virage : seulement dans son sens d'entrée
      t.item={ t:item, p:0, entry:m.rot };
      m.emitIdx=(start+k+1)%cells.length;
      return true;
    }
    if(tryMachineAccept(t,item,DIRS[m.rot])){
      m.emitIdx=(start+k+1)%cells.length;
      return true;
    }
  }
  return false;
}
function tryEmit(m){
  if(emitOne(m,m.outItem)){ m.outItem=null; return true; }
  return false;
}
/* Capacité du tampon interne du répartiteur (grandit avec le niveau). */
function repCap(e){ return 6+(e.lvl||0)*2; }
/* Tick du répartiteur : vide sa file vers les sorties (max 2+niveau par
   tick). Bloqué = tampon plein ET aucune émission ce tick. */
function tickRepartiteur(m){
  let emitted=0;
  const maxE=2+(m.lvl||0);
  while(emitted<maxE&&m.queue.length){
    if(emitOne(m,m.queue[0])){ m.queue.shift(); emitted++; }
    else break;                        // sorties refusent : on réessaiera
  }
  if(emitted>0||m.queue.length<repCap(m)) m.blockedT=0;
  else m.blockedT+=DT;
}

/* Transfert d'un item en bout de ruban vers la case suivante */
function tryTransfer(b){
  const pushDir=b.curve?beltExitDir(b):b.rot;   // direction de sortie effective
  const d=DIRS[pushDir];
  const c=cellAt(b.x+d.x,b.y+d.y);
  if(!c){ b.blockedT+=DT; return; }
  if(c.kind==='belt'){
    if(!c.item){
      if(beltPushOK(c,pushDir)){
        c.item={t:b.item.t,p:0,entry:pushDir};
        b.item=null; b.blockedT=0;
      }else b.blockedT+=DT;                     // virage à contre-sens : bouchon
    }
    else b.blockedT+=DT;                        // case suivante occupée : bouchon
    return;
  }
  if(tryMachineAccept(c,b.item.t,d)){ b.item=null; b.blockedT=0; }
  else b.blockedT+=DT;
}

/* Acceptation d'un item par une machine : l'expédition accepte tout ;
   les autres refusent la face de sortie et les items hors recette / tampon plein. */
function tryMachineAccept(m,t,dir){
  if(m.type==='expedition'){ sellItem(t,m); return true; }
  if(m.type==='repartiteur'){
    /* n'accepte que par sa face d'ENTRÉE : la poussée doit être DANS le
       sens du flux (dir = direction de sortie du répartiteur) */
    if(dir){
      const out=DIRS[m.rot];
      if(dir.x!==out.x||dir.y!==out.y) return false;
    }
    if(m.queue.length>=repCap(m)) return false;  // tampon plein → blocage amont
    m.queue.push(t);
    m.flash=0.35;
    return true;
  }
  /* Un ruban qui pousse en direction "dir" touche la face de normale -dir
     (la face qui le regarde). On refuse SEULEMENT si cette face touchée est
     la face de SORTIE de la machine : c'est le cas quand la poussée est
     OPPOSÉE à la direction de sortie. Les 3 autres faces acceptent, sur
     chacune de leurs 2 cases → 6 points d'entrée possibles. */
  if(dir){
    const out=DIRS[m.rot];
    if(dir.x===-out.x && dir.y===-out.y) return false;
  }
  const need=MACHINES[m.type].in;
  if(!need||!need[t]) return false;
  if((m.inBuf[t]||0)>=need[t]*2+1) return false;  // entrée pleine → blocage amont
  m.inBuf[t]=(m.inBuf[t]||0)+1;
  m.flash=0.35;
  return true;
}

function sellItem(t,m){
  const v=Math.round(ITEMS[t].value*sellMult()*10)/10;
  state.money+=v; state.stats.moneyTotal+=v; state.career.moneyTotal+=v; winMoney+=v;
  state.stats.sold[t]=(state.stats.sold[t]||0)+1;
  state.career.sold[t]=(state.career.sold[t]||0)+1;
  const sc=ITEMS[t].sci;
  if(sc){ state.sci+=sc; state.stats.sciTotal+=sc; state.career.sciTotal+=sc; winSci+=sc; }
  addFx(ox+(m.x+1)*TILE, oy+(m.y+1)*TILE-12, '+'+fmt(v)+' $');
  SFX.sell();
  if(state.stats.sold[t]===1 && ITEMS[t].value>=15) toast('Première vente : '+ITEMS[t].name, fmt(v)+' $ l’unité.', true);
}


/* ══════════════ 6. PLACEMENT, DÉMOLITION, AMÉLIORATION ══════════════ */

function place(type,x,y,rotIn,quiet,curve){
  /* rotation effective AVANT la vérification (l'empreinte du répartiteur
     dépend de son orientation) ; l'expédition prend celle du mur touché */
  const rot = type==='expedition' ? expRotAt(x,y) : rotIn;
  if(!canPlace(type,x,y,rot)){ if(!quiet) SFX.err(); return false; }
  const cost=costOf(type);
  if(state.money<cost){ if(!quiet) SFX.err(); return false; }
  state.money-=cost;
  const fp=fpSize(type,rot);
  const e={ id:++uid, kind:type==='convoyeur'?'belt':'machine', type, x, y, rot, lvl:0, blockedT:0, flash:0 };
  if(e.kind==='belt'){ e.item=null; e.curve=curve||0; }
  else{
    e.inBuf={}; e.active=false; e.timer=0; e.outItem=null;
    if(type==='repartiteur') e.queue=[];      // file interne du répartiteur
    const need=MACHINES[type].in;
    if(need) for(const k in need) e.inBuf[k]=0;
  }
  state.entities.push(e);
  for(let dy=0;dy<fp.h;dy++) for(let dx=0;dx<fp.w;dx++) state.grid[y+dy][x+dx]=e;
  state.counts[type]=cnt(type)+1;
  state.stats.placed++;
  SFX.place();
  return true;
}

function demolishAt(x,y){
  const e=cellAt(x,y); if(!e) return;
  const refund=Math.floor(costOf(e.type)*ECO.refund);   // calcul AVANT décrément
  state.money+=refund;
  const f=fpSize(e.type,e.rot);
  for(let dy=0;dy<f.h;dy++) for(let dx=0;dx<f.w;dx++) state.grid[e.y+dy][e.x+dx]=null;
  state.entities.splice(state.entities.indexOf(e),1);
  state.counts[e.type]--;
  state.stats.destroyed++;
  addFx(ox+(e.x+f.w/2)*TILE, oy+(e.y+f.h/2)*TILE-10, '+'+refund+' $');
  if(state.inspect===e) state.inspect=null;
  SFX.del();
}

/* Amélioration individuelle : +30 % de vitesse par niveau (5 max) */
function upgradeEntity(e){
  if((e.lvl||0)>=MAXLVL) return;
  const c=upCost(e);
  if(state.money<c){ SFX.err(); return; }
  state.money-=c;
  e.lvl=(e.lvl||0)+1;
  SFX.up();
  toast(MACHINES[e.type].name+' niveau '+e.lvl, e.type==='repartiteur'?'+1 émission/tick et +2 de tampon.':'+30 % de vitesse pour cette machine.',true);
}

/* Rotation d'une entité posée. Toute entité dont l'empreinte CHANGE en
   tournant (répartiteur, machines longues) vérifie bornes et place, puis
   réécrit la grille. Correctif au passage : l'ancien test ne vérifiait pas
   les bornes de la grille (cellAt renvoie null hors grille) — tourner un
   répartiteur collé au bord bas/droit pouvait écrire hors tableau. */
function rotateEntity(e){
  if(e.type==='expedition') return;
  const nrot=(e.rot+1)%4;
  const old=fpSize(e.type,e.rot), nf=fpSize(e.type,nrot);
  if(old.w!==nf.w||old.h!==nf.h){
    for(let dy=0;dy<nf.h;dy++) for(let dx=0;dx<nf.w;dx++){
      const nx=e.x+dx, ny=e.y+dy;
      if(nx<0||ny<0||nx>=state.gridW||ny>=state.gridH){ SFX.err(); return; }
      const c=state.grid[ny][nx];
      if(c&&c!==e){ SFX.err(); return; }        // pas la place : refus
    }
    for(let dy=0;dy<old.h;dy++) for(let dx=0;dx<old.w;dx++) state.grid[e.y+dy][e.x+dx]=null;
    for(let dy=0;dy<nf.h;dy++) for(let dx=0;dx<nf.w;dx++) state.grid[e.y+dy][e.x+dx]=e;
  }
  e.rot=nrot;
  if(e.kind==='belt'&&e.item) delete e.item.entry;
  SFX.place();
}
/* Rotation "contextuelle" : machine sélectionnée dans la colonne droite,
   sinon fantôme de placement (R bascule aussi le mur visé pour l'expédition). */
function rotateAction(){
  if(state.inspect&&!build.type&&state.inspect.type!=='expedition') rotateEntity(state.inspect);
  else if(build.type==='expedition') build.expIdx++;
  else build.rot=(build.rot+1)%4;
}

function gridPos(mx,my){
  if(mx<ox||my<oy||mx>=ox+state.gridW*TILE||my>=oy+state.gridH*TILE) return {x:-99,y:-99};
  return { x:Math.floor((mx-ox)/TILE), y:Math.floor((my-oy)/TILE) };
}
/* Chemin orthogonal entre deux cases (tracé de rubans en glissant) */
function stepCells(a,b){
  const cells=[]; let x=a.x,y=a.y;
  while(x!==b.x||y!==b.y){
    if(Math.abs(b.x-x)>=Math.abs(b.y-y)) x+=Math.sign(b.x-x);
    else y+=Math.sign(b.y-y);
    cells.push({x,y});
  }
  return cells;
}

function selectTool(t){
  build.type=(build.type===t)?null:t;
  if(build.type){ build.destroy=false; state.inspect=null; }
}
function toggleDestroy(){ build.destroy=!build.destroy; if(build.destroy){ build.type=null; state.inspect=null; } }
/* toolOrder ne contient plus que les machines de l'ONGLET ACTIF :
   les raccourcis 1-9 s'appliquent donc à l'onglet affiché. */
function rebuildToolOrder(){
  let types=(CATS.find(c=>c[0]===state.barCat)||CATS[0])[1].filter(t=>MACHINES[t]&&state.unlocked.includes(t));
  if(!types.length){                    // onglet vide (rien de débloqué) : repli
    for(const [cat,ts] of CATS){
      const a=ts.filter(t=>state.unlocked.includes(t));
      if(a.length){ state.barCat=cat; types=a; break; }
    }
  }
  toolOrder=types;
}
function setBarCat(cat){
  if(state.barCat===cat) return;
  state.barCat=cat;
  rebuildToolOrder();
  state.barScroll=0;
}

/* ── Code de triche : le KONAMI (↑↑↓↓←→←→), premier code de l'histoire
   du jeu vidéo (Gradius, 1986). Actif UNIQUEMENT sur la page du bureau
   des directeurs, sans modal ouvert : il débloque l'ACCÈS à toutes les
   usines (grades, bonus et progression inchangés) et c'est persistant.
   Toute touche fautive remet la séquence à zéro. */
const KONAMI=['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright'];
let konamiIdx=0;
function konamiKey(k){
  if(state.screen!=='home'||state.modal){ konamiIdx=0; return; }
  if(k===KONAMI[konamiIdx]){
    konamiIdx++;
    if(konamiIdx>=KONAMI.length){
      konamiIdx=0;
      state.maxFactoryIdx=FACTORIES.length-1;   // toutes les cartes accessibles
      state.tutDone=true;                        // pas de tutoriel dans les usines avancées
      SFX.konami();
      toast('CODE KONAMI !','↑ ↑ ↓ ↓ ← → ← → — toutes les usines du groupe sont accessibles.',true);
      saveGame();                                // l'accès débloqué est conservé
    }
  }else{
    konamiIdx=(k===KONAMI[0])?1:0;               // touche fausse : on repart de zéro
  }
}

function bindEvents(){
  canvas.addEventListener('mousedown',e=>{
    if(e.button!==0) return;
    audio();                                    // réveille le contexte audio
    tf.focused=false;
    const mx=e.clientX, my=e.clientY;
    /* 1) zones cliquables dessinées à la dernière frame (priorité au dessus) */
    for(let i=hots.length-1;i>=0;i--){
      const h=hots[i];
      if(mx>=h.x&&mx<h.x+h.w&&my>=h.y&&my<h.y+h.h){ h.fn(); return; }
    }
    if(state.modal) return;
    /* clic dans la zone de jeu */
    if(state.screen==='game'){
      const c=gridPos(mx,my);
      if(c.x>=0){
        if(build.destroy){ demolishAt(c.x,c.y); return; }
        if(build.type){
          const cv=build.type==='convoyeur'?(build.curve||0):0;
          if(place(build.type,c.x,c.y,build.rot,false,cv)){
            /* mode virage : pose UNE pièce par clic — le tracé en ligne
               reste réservé au mode droit */
            if(cv===0){
              build.dragging=true; build.lastCell=c;
              build.dragPlaced.length=0;                 // nouveau tracé
              if(build.type==='convoyeur') build.dragPlaced.push(cellAt(c.x,c.y));
            }
          }
          return;
        }
        /* aucun outil : clic gauche = sélectionner (ou CHANGER de machine) */
        const ent=cellAt(c.x,c.y);
        if(ent){ state.inspect=ent; return; }
      }
      /* clic dans le canvas de jeu mais hors grille : refermer la sélection.
         Les clics sur la colonne droite / HUD / barre ne ferment rien. */
      if(state.inspect&&mx<gameX+gameW&&my>=gameY&&my<gameY+gameH) state.inspect=null;
    }
  });
  canvas.addEventListener('mousemove',e=>{
    mouse.x=e.clientX; mouse.y=e.clientY;
    if(state.screen!=='game') return;
    build.hover=gridPos(mouse.x,mouse.y);
    /* tracé de lignes de convoyeurs en glissant */
    if(build.dragging&&build.type==='convoyeur'){
      let l=build.lastCell;
      const c=build.hover;
      if(l&&c.x>=0){
        for(const step of stepCells(l,c)){
          const dx=step.x-l.x, dy=step.y-l.y;
          const nd=dx===1?0 : dx===-1?2 : dy===1?1 : 3;   // direction du segment
          if(nd!==build.rot){
            /* VIRAGE AUTOMATIQUE au tournant. La case l est :
               · un ruban DROIT posé pendant CE tracé → TRANSFORMÉ en virage
                 en place (même type, déjà payé — les rubans préexistants du
                 joueur ne sont jamais touchés) ;
               · libre → virage neuf posé ;
               · occupée par autre chose → rien.
               Flux entrant = ancien sens (rot inchangé), sortie = nouveau.
               Garde demi-tour : turn=2 (180°) ne se représente pas sur une
                 case — on ne transforme rien, le joueur retrace ce segment. */
            const turn=(nd-build.rot+4)%4;               // 1 = à droite, 3 = à gauche
            if(turn===1||turn===3){
              const here=cellAt(l.x,l.y);
              const cv=turn===1?1:2;
              if(here&&here.kind==='belt'&&here.curve===0&&build.dragPlaced.includes(here)){
                here.curve=cv;                           // transformation en virage
                if(here.item) here.item.entry=build.rot; // chemin d'entrée cohérent
              }else if(!here&&canPlace('convoyeur',l.x,l.y,build.rot)){
                if(place('convoyeur',l.x,l.y,build.rot,true,cv))
                  build.dragPlaced.push(cellAt(l.x,l.y));
              }
            }
            build.rot=nd;
          }
          if(place(build.type,step.x,step.y,build.rot,true,0))
            build.dragPlaced.push(cellAt(step.x,step.y));
          l=step;
        }
      }
      build.lastCell=c;
    }
    updateCursor();
  });
  window.addEventListener('mouseup',()=>{ build.dragging=false; build.dragPlaced.length=0; });
  canvas.addEventListener('mouseleave',()=>{ build.hover={x:-99,y:-99}; mouse.x=-1; });
  /* CLIC DROIT : annule la sélection en cours (outil / démolition / panneau / modal) */
  canvas.addEventListener('contextmenu',e=>{
    e.preventDefault();
    build.type=null; build.destroy=false; build.dragging=false;
    state.inspect=null;
    if(state.modal) closeModal();
  });
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const d=Math.sign(e.deltaY);
    if(state.modal&&state.modal.maxScroll>0) state.modal.scroll=clamp(state.modal.scroll+d*40,0,state.modal.maxScroll);
    else if(state.screen==='home') state.homeScroll=clamp(state.homeScroll+d*40,0,state.homeMax);
    else if(state.screen==='game'&&mouse.y>barY&&mouse.y<barY+barH) state.barScroll=clamp(state.barScroll+d*108,0,state.barMax);
  },{passive:false});
  /* Collage dans le champ texte (import de sauvegarde) */
  document.addEventListener('paste',e=>{
    if(tf.focused&&e.clipboardData){ tf.value+=e.clipboardData.getData('text'); e.preventDefault(); }
  });
  window.addEventListener('keydown',e=>{
    if(tf.focused){
      const k=e.key;
      if(k==='Escape'){ tf.focused=false; return; }
      if(e.ctrlKey&&k.toLowerCase()==='a'){ tf.value=''; e.preventDefault(); return; }
      if(k==='Backspace'){ tf.value=tf.value.slice(0,-1); e.preventDefault(); return; }
      if(k==='Enter'){ tfEnter(); return; }
      if(k.length===1&&!e.ctrlKey&&!e.metaKey){ tf.value+=k; e.preventDefault(); }
      return;
    }
    const k=e.key.toLowerCase();
    konamiKey(k);              // suivi du code Konami (actif au bureau des directeurs)
    if(k==='r') rotateAction();
    else if(k==='x') toggleDestroy();
    else if(k==='t'&&build.type==='convoyeur') build.curve=((build.curve||0)+1)%3;
    else if(k==='u') toggleModal('research');
    else if(k==='c') toggleModal('recipes');
    else if(k==='m') toggleModal('menu');
    else if(k==='i') toggleModal('stats');
    else if(k==='escape'){
      if(state.modal) closeModal();
      else if(state.inspect) state.inspect=null;
      else if(build.destroy) build.destroy=false;
      else if(build.type) build.type=null;
    }
    else if(/^[0-9]$/.test(k)){
      const idx=k==='0'?9:(+k-1);
      if(toolOrder[idx]) selectTool(toolOrder[idx]);
    }
  });
  window.addEventListener('beforeunload',()=>saveGame());
  window.addEventListener('resize',resize);
}

function updateCursor(){
  let c='default';
  if(tf.focused) c='text';
  else{
    for(const h of hots) if(mouse.x>=h.x&&mouse.x<h.x+h.w&&mouse.y>=h.y&&mouse.y<h.y+h.h){ c=h.cursor||'pointer'; break; }
    if(c==='default'&&state.screen==='game'&&!state.modal){
      const g=gridPos(mouse.x,mouse.y);
      if(g.x>=0) c=build.destroy?'not-allowed':(build.type?'crosshair':'pointer');
    }
  }
  canvas.style.cursor=c;
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }


/* ══════════════ 7. SPRITES — "unités sprite" : 1 case = 16 u ══════════════ */
/* Chaque machine 2×2 est dessinée dans un repère centré, tourné : +x = sortie. */

function px(g,Sc,x,y,w,h,c){
  g.fillStyle=c;
  g.fillRect(Math.round(x*Sc),Math.round(y*Sc),Math.max(1,Math.round(w*Sc)),Math.max(1,Math.round(h*Sc)));
}
function R(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }

const MPAL={
  machine_papier:{f:'#74754f',l:'#8a8b64',d:'#565839',e:'#2e2f20'},
  machine_papier_2:{f:'#5d6b6e',l:'#75838a',d:'#465255',e:'#28302f'},   // acier bleuté
  machine_papier_3:{f:'#6e5a2e',l:'#8a7440',d:'#54431f',e:'#332810'},   // bronze
  expedition    :{f:'#8a6a45',l:'#a5825a',d:'#6b4f33',e:'#3f2d1b'},
  onduleuse     :{f:'#b26a33',l:'#c67f45',d:'#8c4f24',e:'#572f14'},
  onduleuse_2   :{f:'#8a3d2e',l:'#a54f3b',d:'#6a2c20',e:'#42190f'},     // rouge oxydé
  onduleuse_3   :{f:'#3f4a55',l:'#556470',d:'#2e3742',e:'#1c232c'},     // acier industriel
  atelier_renfort  :{f:'#7d5a3a',l:'#946b46',d:'#5f452c',e:'#3a2917'},
  atelier_intercal :{f:'#7d5a3a',l:'#946b46',d:'#5f452c',e:'#3a2917'},
  atelier_poignee  :{f:'#7d5a3a',l:'#946b46',d:'#5f452c',e:'#3a2917'},
  imprimeuse    :{f:'#6e5a44',l:'#84704f',d:'#54442f',e:'#33281a'},
  assem_petit   :{f:'#6b4c31',l:'#82603f',d:'#503923',e:'#301f10'},
  assem_moyen   :{f:'#6b4c31',l:'#82603f',d:'#503923',e:'#301f10'},
  assem_grand   :{f:'#6b4c31',l:'#82603f',d:'#503923',e:'#301f10'},
  assem_caisse  :{f:'#6b4c31',l:'#82603f',d:'#503923',e:'#301f10'},
  assem_luxe    :{f:'#6b4c31',l:'#82603f',d:'#503923',e:'#301f10'},
};

/* La goulotte-flèche ivoire : LE repère de sens, sur la face de sortie.
   Version "compact" (contenue dans la case) pour les icônes. */
Object.assign(MPAL,{
  machine_papier_2:{f:'#5d6b6e',l:'#75838a',d:'#465255',e:'#28302f'},   // acier bleuté
  machine_papier_3:{f:'#6e5a2e',l:'#8a7440',d:'#54431f',e:'#332810'},   // bronze
  onduleuse_2     :{f:'#8a3d2e',l:'#a54f3b',d:'#6a2c20',e:'#42190f'},   // rouge oxydé
  onduleuse_3     :{f:'#3f4a55',l:'#556470',d:'#2e3742',e:'#1c232c'},   // acier industriel
});

/* La goulotte-flèche ivoire, sur la face de sortie — décalée au vrai bord
   pour les machines longues (dx). Version compacte pour les icônes. */
function arrowPlate(g,Sc,pulse,compact,hl){
  hl=hl||16;
  const dx=hl-16;
  const c=(pulse&&Math.sin(animT*8)>0)?'#e08a3c':'#f6e8c2';
  const dark='#3a2414';
  if(compact){
    px(g,Sc,11+dx,-7,5,14,dark);
    px(g,Sc,12+dx,-6,3,12,c);
    px(g,Sc,12+dx,-4,1,2,dark); px(g,Sc,13+dx,-2,1,4,dark); px(g,Sc,12+dx,2,1,2,dark);
  }else{
    px(g,Sc,14+dx,-8,8,16,dark);                // support qui déborde sur la case voisine
    px(g,Sc,15+dx,-7,6,14,c);
    px(g,Sc,16+dx,-4,2,2,dark); px(g,Sc,18+dx,-2,2,4,dark); px(g,Sc,16+dx,2,2,2,dark);
  }
}
/* Le quai de chargement : damier jaune/noir posé SUR le mur extérieur */
function dockPlate(g,Sc,compact){
  const x0=compact?11:14, w=compact?5:8;
  px(g,Sc,x0,-15,w,30,'#3a2414');
  for(let i=0;i<10;i++) px(g,Sc,x0+1,-15+i*3,w-2,2, i%2?'#d9a92e':'#191008');
}

/* Châssis commun + encoches d'entrée. hl = demi-longueur en unités
   (16 = machine 2×2 ; 24 = 2×3 ; 32 = 2×4) — la longueur suit le flux.
   Une encoche par cane sur les faces longues, 2 sur la face arrière. */
function chassis(g,Sc,p,plate,compact,hl){
  hl=hl||16;
  const x0=-(hl-1), x1=hl-1;
  px(g,Sc,x0,-15,x1-x0,30,p.e);                 // bord
  px(g,Sc,x0+1,-14,x1-x0-2,28,p.f);             // face
  px(g,Sc,x0+1,-14,x1-x0-2,3,p.l);              // arête éclairée
  px(g,Sc,x0+1,11,x1-x0-2,3,p.d);               // ombre basse
  px(g,Sc,x0,-10,2,4,'#1f1710');                // encoches face arrière (2 carnes)
  px(g,Sc,x0,6,2,4,'#1f1710');
  for(let nx=x0+5;nx<=x1-9;nx+=16){             // encoches faces longues (1 par cane)
    px(g,Sc,nx,-15,4,2,'#1f1710');
    px(g,Sc,nx,13,4,2,'#1f1710');
  }
  if(plate==='arrow') arrowPlate(g,Sc,false,compact,hl);
  if(plate==='dock')  dockPlate(g,Sc,compact);
}

/* ── Sprite d'une machine (empreinte 32×32 u ; +x = sortie) ── */
function drawMachineSprite(g,type,m,Sc,pulse,compact){
  const p=MPAL[type]||MPAL.assem_petit;
  const active=m&&m.active;
  const prog=m?m.timer/MACHINES[type].time:0;
  const hl=LONG[type]?LONG[type]*8:16;          // demi-longueur : 16 / 24 / 32
  switch(type){
    case 'machine_papier':
    case 'machine_papier_2':
    case 'machine_papier_3':{
      /* paliers : 2×2 (1 roue), 2×3 (2 roues), 2×4 (3 roues) — roues réparties
         sur la longueur ; cuve teintée par la palette du palier */
      const tier=type==='machine_papier_2'?2:(type==='machine_papier_3'?3:1);
      chassis(g,Sc,p,'arrow',compact,hl);
      px(g,Sc,-hl+3,-11,hl-1,22,p.e);           // cuve allongée
      px(g,Sc,-hl+4,-10,hl-3,20,p.d);
      px(g,Sc,-hl+4,-10,hl-3,2,p.l);
      px(g,Sc,-10,-2,9,11,'#b9ae8d');           // tas de pâte (côté sortie)
      if(tier===1){                             // roue unique (identique à avant)
        for(let i=0;i<8;i++){
          const a=animT*2.5+i*Math.PI/4;
          const wx=Math.round(Math.cos(a)*4)-1;
          px(g,Sc,-6+wx,-1+Math.round(Math.sin(a)*4),2,2,p.l);
        }
        px(g,Sc,-7,-2,2,2,'#9a9b74');
      }else{                                    // roues réparties le long de la cuve
        for(let w=0;w<tier;w++){
          const wcx=-hl+8+w*(-6-(-hl+8))/(tier-1);
          for(let i=0;i<8;i++){
            const a=animT*(2+tier*.5)+i*Math.PI/4+w*1.7;
            px(g,Sc,Math.round(wcx+Math.cos(a)*3),Math.round(-1+Math.sin(a)*3),2,2,p.l);
          }
          px(g,Sc,Math.round(wcx)-1,-2,2,2,'#9a9b74');
        }
      }
      px(g,Sc,-(hl-2),-13,5,5,'#d9d0b4');       // vieux papier à l'entrée
      px(g,Sc,-(hl-3),-11,3,2,'#b9ad8f');
      if(active&&Math.sin(animT*8)>0) px(g,Sc,2,3,3,3,'#f2e9d4'); // feuilles en sortie
      px(g,Sc,-(hl-3),9,3,3,active?'#9fc06a':'#544a38');
      if(tier>1) px(g,Sc,-(hl-2),7,5,2,'#e8c96a');   // liseré doré : palier supérieur
      if(tier>2) px(g,Sc,-(hl-2),10,5,2,'#e8c96a');
      break;
    }
    case 'onduleuse':
    case 'onduleuse_2':
    case 'onduleuse_3':{
      /* paliers : 2×2, 2×3 (double-face), 2×4 (rotative) — paires de rouleaux
         additionnaires réparties sur la longueur */
      const tier=type==='onduleuse_2'?2:(type==='onduleuse_3'?3:1);
      chassis(g,Sc,p,'arrow',compact,hl);
      px(g,Sc,-hl+3,-5,hl+1,12,'#4a2a12');      // zone de passage allongée
      px(g,Sc,-hl+3,-12,hl+1,6,'#e9dcbb');      // rouleau haut
      px(g,Sc,-hl+3,-12,3,6,p.e);
      px(g,Sc,-hl+3,6,hl+1,6,'#d9cba6');        // rouleau bas
      px(g,Sc,-hl+3,6,3,6,p.e);
      const nseg=Math.floor(hl/3);              // feuille ondulée sur toute la longueur
      for(let i=0;i<nseg;i++){
        const x=-hl+4+i*3;
        const dy=Math.sin(animT*(8+tier*3)+i*1.3)>0?-1:1;
        px(g,Sc,x,-4+dy,2,8-dy,'#d9ab72');
      }
      const dy2=active?Math.round(Math.sin(prog*Math.PI)*4):0; // presse (côté sortie)
      px(g,Sc,-4,-14+dy2,6,4,'#8c4f24');
      px(g,Sc,-3,-10+dy2,4,2,'#c67f45');
      px(g,Sc,-(hl-5),-11,2,1,'#fff8e4');       // point de colle
      if(tier>1){                               // paire de rouleaux à mi-longueur
        const mx=-Math.round(hl/2);
        px(g,Sc,mx,-12,2,6,'#e9dcbb'); px(g,Sc,mx,6,2,6,'#d9cba6');
        px(g,Sc,mx-1,-12,1,6,p.e);  px(g,Sc,mx-1,6,1,6,p.e);
      }
      if(tier>2){                               // rotative : 2e paire au quart + liserés
        const q=-Math.round(hl/4);
        px(g,Sc,q,-12,2,6,'#e9dcbb'); px(g,Sc,q,6,2,6,'#d9cba6');
        px(g,Sc,q-1,-12,1,6,p.e);   px(g,Sc,q-1,6,1,6,p.e);
        px(g,Sc,-(hl-2),7,5,2,'#e8c96a');
        px(g,Sc,-(hl-2),10,5,2,'#e8c96a');
      }
      break;
    }
    case 'expedition':{
      /* Pas de flèche : le quai est collé au mur, tout entre par les 3 autres faces */
      chassis(g,Sc,p,'dock',compact);
      px(g,Sc,-14,6,26,7,'#8a6a45');             // palette
      px(g,Sc,-14,6,26,2,'#a5825a');
      px(g,Sc,-12,-12,17,17,'#b08a58');          // caisse principale
      px(g,Sc,-12,-12,17,2,'#c9a26c');
      px(g,Sc,-12,4,17,2,'#5e4326');
      px(g,Sc,-6,-12,3,17,'#d9cfae');            // scotch
      px(g,Sc,-12,-3,17,2,'#d9cfae');
      px(g,Sc,-9,-8,7,5,'#f2e8d2');              // étiquette de livraison
      px(g,Sc,-8,-6,5,1,'#8a6a45');
      px(g,Sc,-8,-4,3,1,'#8a6a45');
      px(g,Sc,1,-6,4,9,'#c9a26c');               // caissette empilée
      px(g,Sc,1,-6,4,2,'#e0c290');
      px(g,Sc,-13,9,3,3,'#9fc06a');              // feu verte "prête"
      break;
    }
    case 'imprimeuse':{
      chassis(g,Sc,p,'arrow',compact);
      px(g,Sc,-13,-9,16,16,'#4a3620');           // châssis
      px(g,Sc,-13,-9,16,1,'#88b0c4');
      px(g,Sc,-13,6,16,1,'#88b0c4');
      drawItemAt(g,MACHINES[type].out,-5*Sc,1*Sc,Sc*.8);
      const xo=active?Math.round(Math.sin(animT*7)*4):0; // tête imprimante mobile
      px(g,Sc,-6+xo,-13,5,4,'#6e6e6e');
      px(g,Sc,-5+xo,-9,3,2,'#4d6b7a');
      px(g,Sc,-13,8,16,4,'#7ba3b8');             // rouleau d'encre
      px(g,Sc,-13,8,3,4,p.e);
      px(g,Sc,-7,9,2,2,'#4d6b7a');
      break;
    }
    default:{
      /* Ateliers (transformation) et assembleuses (produits finis) */
      const isAssem=type.startsWith('assem_');
      chassis(g,Sc,p,'arrow',compact);
      if(isAssem){
        px(g,Sc,-14,-2,16,14,'#8a6a45');         // table d'assemblage
        px(g,Sc,-14,-2,16,2,'#a5825a');
        px(g,Sc,-14,11,16,2,'#5e4326');
        px(g,Sc,-12,-14,12,3,'#5e4326');         // portique
        const dy=active?Math.round(Math.sin(prog*Math.PI)*6):0; // presseur
        px(g,Sc,-10,-11+dy,8,5,'#c9c2a8');
        px(g,Sc,-10,-11+dy,8,1,'#e8e0c4');
        px(g,Sc,-10,-7+dy,8,1,'#8f8870');
        drawItemAt(g,MACHINES[type].out,-6*Sc,4*Sc,Sc*.8); // produit cible
        if(active&&Math.sin(animT*10)>0){ px(g,Sc,-14,-2,16,1,'#f0d9a8'); px(g,Sc,-14,11,16,1,'#f0d9a8'); }
      }else{
        px(g,Sc,-13,-4,16,16,'#4a3620');         // établi
        px(g,Sc,-13,-4,16,2,'#946b46');
        px(g,Sc,-13,10,16,2,'#5f452c');
        drawItemAt(g,MACHINES[type].out,-5*Sc,3*Sc,Sc*.75);
        const dy=active?Math.round(Math.sin(prog*Math.PI)*5):0; // lame de coupe
        px(g,Sc,-8,-13+dy,6,4,'#8f8f8f');
        px(g,Sc,-8,-13+dy,6,1,'#c4c4c4');
        px(g,Sc,-7,-14,4,2,'#3a2917');
      }
      break;
    }
  }
}

/* ── Répartiteur (repère tourné : +x = sens du flux). Emprise 16 u le long
   du flux × 32 u en large : 2 canaux, encoches d'entrée sur la face -x. ── */
function drawRepartiteurSprite(g,Sc,m,pulse){
  const c=(pulse&&Math.sin(animT*8)>0)?'#e08a3c':'#d8c193';
  px(g,Sc,-8,-16,16,32,'#3a2c1e');               // bord
  px(g,Sc,-7,-15,14,30,'#463525');               // corps
  px(g,Sc,-7,-15,14,2,'#6b563c');                // arête éclairée
  px(g,Sc,-7,13,14,2,'#5b4930');                 // ombre
  px(g,Sc,-7,-1,14,2,'#33291f');                 // séparateur des 2 canaux
  px(g,Sc,-8,-10,2,4,'#1f1710');                 // encoche entrée canal 1
  px(g,Sc,-8,6,2,4,'#1f1710');                   // encoche entrée canal 2
  for(const yy of [-8,8]){                       // chevron de sens par canal
    px(g,Sc,-4,yy-5,3,3,c); px(g,Sc,-1,yy-2,3,4,c); px(g,Sc,-4,yy+2,3,3,c);
  }
  if(m&&m.queue){                                // file interne : un point par item
    const n=Math.min(m.queue.length,8);
    for(let i=0;i<n;i++)
      px(g,Sc,-6+i*1.8,-2,1.5,2,ITEMS[m.queue[i]]?ITEMS[m.queue[i]].c:'#d8c193');
  }
}
function drawRepartiteur(e){
  const f=fpSize(e.type,e.rot);
  const cx=ox+(e.x+f.w/2)*TILE, cy=oy+(e.y+f.h/2)*TILE;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(e.rot*Math.PI/2);
  if(e.flash>0){ ctx.globalAlpha=.4+.5*(e.flash/.35); drawRepartiteurSprite(ctx,S,e); ctx.globalAlpha=1; }
  else drawRepartiteurSprite(ctx,S,e);
  ctx.restore();
  if(e.lvl>0) for(let i=0;i<e.lvl;i++) R(ox+e.x*TILE+4+i*7,oy+e.y*TILE+4,5,5,'#e8c96a');
}

/* ── Sprite d'un item, centré sur (cx,cy) ── */
function drawItemAt(g,t,cx,cy,Sc){
  const it=ITEMS[t];
  g.save(); g.translate(cx,cy);
  const r=(x,y,w,h,c)=>px(g,Sc,x,y,w,h,c);
  const box=(w,decor)=>{
    const x0=-w/2,y0=-w/2;
    r(x0,y0,w,w,it.c);
    r(x0,y0,w,1,'#f0dcb4');
    r(x0,y0+w-1,w,1,it.c2);
    r(x0+w-1,y0,1,w,it.c2);
    r(x0,y0+2,w,1,'rgba(0,0,0,.18)');
    if(decor) decor(x0,y0,w);
  };
  switch(t){
    case 'papier':
      r(-4,-4,8,9,it.c); r(-4,4,8,1,it.c2); r(4,-4,1,9,it.c2);
      r(-3,-3,6,1,'#b9ad8f'); r(-3,-1,6,1,'#b9ad8f'); r(-3,1,4,1,'#b9ad8f'); break;
    case 'carton':
      r(-5,-5,10,10,it.c); r(-5,4,10,1,it.c2); r(4,-5,1,10,it.c2);
      for(let i=0;i<4;i++){ const y=-4+i*2; r(-4,y,3,1,it.c2); r(0,y,2,1,it.c2); r(3,y,2,1,it.c2); } break;
    case 'renfort':
      r(-4,-4,9,3,it.c); r(-4,-4,3,9,it.c);
      r(3,-4,2,1,it.c2); r(-4,4,2,1,it.c2);
      r(-1,-1,2,1,it.c2); r(1,0,1,1,it.c2); break;
    case 'intercalaire':
      r(-5,-3,10,7,it.c); r(-5,3,10,1,it.c2); r(4,-3,1,7,it.c2);
      r(1,-3,3,2,it.c2); r(-4,-1,4,1,'#b9ad8f'); break;
    case 'poignee':
      r(-4,0,1,4,it.c); r(3,0,1,4,it.c); r(-3,-4,6,2,it.c); r(-3,-2,6,1,it.c);
      r(-3,3,6,1,it.c2); break;
    case 'impression':
      r(-4,-4,8,9,'#f3efe4'); r(-4,4,8,1,it.c2); r(4,-4,1,9,it.c2);
      r(-2,-3,4,1,'#7ba3b8'); r(-3,-1,6,3,'#7ba3b8'); r(-2,2,4,1,'#7ba3b8'); break;
    case 'petit_carton': box(8); break;
    case 'carton_moyen': box(9,(x0,y0,w)=>r(x0+3,y0,2,w,'#d9cfae')); break;
    case 'grand_carton': box(10,(x0,y0,w)=>{
      r(x0,y0,2,2,'#e3b74e'); r(x0+w-2,y0,2,2,'#e3b74e'); r(x0,y0+w-2,2,2,'#e3b74e'); r(x0+w-2,y0+w-2,2,2,'#e3b74e'); }); break;
    case 'caisse': box(10,(x0,y0,w)=>{ r(x0+1,y0,1,w,'#4a3320'); r(x0+w-2,y0,1,w,'#4a3320'); }); break;
    case 'pack_luxe': box(10,(x0,y0,w)=>{
      r(x0,-1,w,2,'#e8c96a'); r(-1,y0,2,w,'#e8c96a'); r(-1,-1,2,2,'#f6e6a8'); }); break;
  }
  g.restore();
}

/* ── Icônes en cache (barre, panneaux) — CORRECTION du bug convoyeur :
   la version précédente appelait la primitive px() avec des arguments
   décalés, ce qui dessinait l'icône hors canvas (d'où son absence). ── */
function getMachineIcon(type){
  if(iconCache[type]) return iconCache[type];
  const c=document.createElement('canvas'); c.width=48; c.height=48;
  const g=c.getContext('2d');
  g.imageSmoothingEnabled=false;
  const Sc=LONG[type]?48/(LONG[type]*16):48/32;   // machines longues : réduites pour tenir
  g.translate(24,24); g.rotate(-Math.PI/2);       // sortie vers le haut (lisibilité)
  if(type==='convoyeur'){
    px(g,Sc,-8,-8,16,16,'#3a2c1e');               // la case COMPLÈTE est le ruban
    px(g,Sc,-8,-6,16,12,'#463525');
    px(g,Sc,-8,-8,16,2,'#6b563c');
    px(g,Sc,-8,6,16,2,'#5b4930');
    px(g,Sc,-4,-5,3,3,'#d8c193');                 // grand chevron de sens
    px(g,Sc,-1,-2,3,4,'#d8c193');
    px(g,Sc,-4,2,3,3,'#d8c193');
  }else if(type==='repartiteur'){
    drawRepartiteurSprite(g,1.3,null,false);      // flux vertical : entrées en bas, sorties en haut
  }else if(type==='convoyeur'&&false){
    drawBeltCurve(g,Sc,1,0.25);                   // (icône virage : réservée, inutilisée pour l'instant)
  }else{
    drawMachineSprite(g,type,null,Sc,false,true); // plaques en version compacte
  }
  iconCache[type]=c; return c;
}
function getItemIcon(t){
  const k='i_'+t;
  if(iconCache[k]) return iconCache[k];
  const c=document.createElement('canvas'); c.width=26; c.height=26;
  drawItemAt(c.getContext('2d'),t,13,13,2.2);
  iconCache[k]=c; return c;
}


/* ══════════════ 8. RENDU JEU ══════════════ */

function drawBackground(){
  R(0,0,W,H,'#191310');
  for(let y=0;y<H;y+=14) R(0,y,W,7,'#1b1410');
  /* ombre portée + cadre sombre autour du bloc assemblé (jeu seulement) */
  if(state.screen==='game'){
    R(blockX+5,blockY+5,blockW,blockH,'rgba(0,0,0,.45)');
    ctx.lineWidth=3; ctx.strokeStyle='#0d0a07';
    ctx.strokeRect(blockX-1.5,blockY-1.5,blockW+3,blockH+3);
  }
}
function drawFloor(){
  const gw=state.gridW, gh=state.gridH;
  R(ox-WALL,oy-WALL,gw*TILE+WALL*2,gh*TILE+WALL*2,'#42331f');
  R(ox-WALL,oy-WALL,gw*TILE+WALL*2,3,'#55432c');
  R(ox-WALL,oy+gh*TILE+WALL-3,gw*TILE+WALL*2,3,'#2c2115');
  for(let x=ox-WALL+8;x<ox+gw*TILE;x+=24){ R(x,oy-WALL+3,3,3,'#5a4830'); R(x,oy+gh*TILE+WALL-6,3,3,'#5a4830'); }
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++)
    R(ox+x*TILE,oy+y*TILE,TILE,TILE,(x+y)%2?'#231b13':'#261e15');
  drawObstacles();   // murs porteurs des missions spéciales
}

/* Murs porteurs en briques kraft : mortier sombre, joints décalés,
   arête éclairée, ombre basse, rivets d'angle. Indestructibles. */
function drawObstacles(){
  const obs=FACTORIES[state.factoryIdx].obstacles;
  if(!obs) return;
  for(const o of obs){
    const x=ox+o[0]*TILE, y=oy+o[1]*TILE, w=o[2]*TILE, h=o[3]*TILE;
    R(x,y,w,h,'#241a10');                        // mortier
    R(x+2,y+2,w-4,h-4,'#4a3626');                // champ de briques
    const half=Math.max(4,Math.floor(TILE/2));
    ctx.fillStyle='#241a10';
    for(let by=y+2+half; by<y+h-4; by+=half) ctx.fillRect(x+2,by,w-4,2);
    let row=0;
    for(let by=y+2; by<y+h-6; by+=half, row++){
      const off=(row%2)?half:0;
      for(let bx=x+2+off+half; bx<x+w-6; bx+=TILE)
        ctx.fillRect(bx,by,2,Math.max(2,Math.min(half,y+h-4-by)));
    }
    R(x,y,w,3,'#5f4a32');                        // arête éclairée
    R(x,y+h-3,w,3,'#171008');                    // ombre basse
    ctx.fillStyle='#6a5236';                     // rivets d'angle
    ctx.fillRect(x+3,y+3,3,3); ctx.fillRect(x+w-6,y+3,3,3);
    ctx.fillRect(x+3,y+h-6,3,3); ctx.fillRect(x+w-6,y+h-6,3,3);
  }
}

/* ── Virages, modèle "sens du flux" ──
   b.rot = direction du flux ENTRANT (celle du ruban droit qui alimente
   le virage) : alterner DROIT / V. DROITE / V. GAUCHE ne change PAS le
   sens affiché. Sortie : rot+1 (virage à droite) ou rot+3 (à gauche). */
function beltExitDir(b){
  if(!b.curve) return b.rot;
  return b.curve===1 ? (b.rot+1)%4 : (b.rot+3)%4;
}
/* Un virage n'accepte que les items qui voyagent dans SON sens d'entrée :
   le pousseur (ruban ou machine) doit pousser dans la direction b.rot. */
function beltPushOK(b,pushDir){
  return !b.curve || pushDir===b.rot;
}
const DIRNAMES=['vers la droite','vers le bas','vers la gauche','vers le haut'];

/* Bande courbe — repère tourné : +x = SENS DU FLUX ENTRANT, sortie à
   droite (+y) ou gauche (-y). Géométrie calibrée pour des RACCORDS EXACTS
   avec les rubans droits : sur la face d'entrée comme sur la face de
   sortie, la coupe présente rail (2) + bande (12) + rail (2), aux mêmes
   positions et couleurs que le ruban adjacent. Rayons : rail extérieur
   15, bande 8 (épaisseur 12), rail intérieur 1. La zone non couverte par
   le tapis montre le dallage (couleur passée en paramètre). Chevrons
   défilants à la MÊME vitesse que les rubans droits (bs × 160 unités/s),
   même espacement (8), même phase : un chevron qui quitte un ruban droit
   glisse dans le virage sans à-coup. */
function drawBeltCurve(g,Sc,curve,bs,floorC){
  const right=curve===1;
  const kx=-8, ky=right?8:-8;                  // coin centre du virage
  const a0=right?-Math.PI/2:Math.PI/2, a1=0;   // milieu d'entrée → milieu de sortie
  const lo=Math.min(a0,a1), hi=Math.max(a0,a1);
  /* sol : dallage visible dans la zone non couverte par le tapis */
  px(g,Sc,-8,-8,16,16,floorC||'#231b13');
  /* rails + bande. NB : le rail clair est à GAUCHE du flux — extérieur
     d'un virage à droite, intérieur d'un virage à gauche — c'est ce qui
     le fait courir sans rupture de couleur à travers les raccords. */
  const cOut=right?'#6b563c':'#5b4930';
  const cIn =right?'#5b4930':'#6b563c';
  g.beginPath(); g.arc(kx*Sc,ky*Sc,15*Sc,lo,hi); g.lineWidth=2*Sc;  g.strokeStyle=cOut; g.stroke();
  g.beginPath(); g.arc(kx*Sc,ky*Sc,1*Sc,lo,hi);  g.lineWidth=2*Sc;  g.strokeStyle=cIn;  g.stroke();
  g.beginPath(); g.arc(kx*Sc,ky*Sc,8*Sc,lo,hi);  g.lineWidth=12*Sc; g.strokeStyle='#463525'; g.stroke();
  /* chevron (petit défilant ou grand statique) à la distance d'arc s de
     l'entrée, orienté selon la tangente au point */
  const path=8*(hi-lo);                         // longueur d'arc ≈ 12,6 u
  const chev=(s,big)=>{
    const t=clamp(s/path,0,1);
    const aa=a0+(a1-a0)*t;
    const ab=a0+(a1-a0)*clamp((s+0.9)/path,0,1);
    const ac=a0+(a1-a0)*clamp((s-0.9)/path,0,1);
    const phi=Math.atan2(Math.sin(ab)-Math.sin(ac),Math.cos(ab)-Math.cos(ac));
    g.save(); g.translate((kx+Math.cos(aa)*8)*Sc,(ky+Math.sin(aa)*8)*Sc); g.rotate(phi);
    if(big){ px(g,Sc,-4,-5,3,3,'#d8c193'); px(g,Sc,-1,-2,3,4,'#d8c193'); px(g,Sc,-4,2,3,3,'#d8c193'); }
    else   { px(g,Sc,-2,-4,2,2,'#8f7752'); px(g,Sc,0,-2,2,4,'#8f7752'); px(g,Sc,-2,2,2,2,'#8f7752'); }
    g.restore();
  };
  /* phase partagée avec les rubans droits : off = (animT × bs × 160) % 8.
     Les centres des chevrons droits sont à x ≡ off+6 (mod 8) ; ils
     franchissent la face d'entrée quand off ≡ 2 (mod 8) → sur l'arc,
     centres à s ≡ off-2 (mod 8) : main-ouverte parfaite à l'entrée. */
  const off=((animT*(bs||0.25)*160)%8+8)%8;
  for(let s=((off-2)%8+8)%8-8;s<path+8;s+=8) if(s>=0&&s<=path) chev(s,false);
  g.globalAlpha=.9; chev(path/2,true); g.globalAlpha=1;   // chevron statique de sens, mi-arc
}

/* Convoyeur : ruban droit pleine case (chevrons défilants) ou virage. */
function drawBeltSprite(b){
  const cx=ox+b.x*TILE+TILE/2, cy=oy+b.y*TILE+TILE/2;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(b.rot*Math.PI/2);
  if(b.curve){
    drawBeltCurve(ctx,S,b.curve,beltSpeedOf(b),((b.x+b.y)%2)?'#231b13':'#261e15');
  }else{
    px(ctx,S,-8,-8,16,16,'#3a2c1e');
    px(ctx,S,-8,-6,16,12,'#463525');
    px(ctx,S,-8,-8,16,2,'#6b563c');
    px(ctx,S,-8,6,16,2,'#5b4930');
    const off=((animT*beltSpeedOf(b)*160)%8+8)%8;
    for(let q=-12;q<12;q+=8){
      const x0=q+off;
      px(ctx,S,x0,-4,2,2,'#8f7752'); px(ctx,S,x0+2,-2,2,4,'#8f7752'); px(ctx,S,x0,2,2,2,'#8f7752');
    }
    ctx.globalAlpha=.9;
    px(ctx,S,-4,-5,3,3,'#d8c193'); px(ctx,S,-1,-2,3,4,'#d8c193'); px(ctx,S,-4,2,3,3,'#d8c193');
    ctx.globalAlpha=1;
  }
  ctx.restore();
  if(b.lvl>0){
    for(let i=0;i<b.lvl;i++) R(ox+b.x*TILE+3+i*6,oy+b.y*TILE+3,4,4,'#e8c96a');
  }
}

/* PASSE 2 — l'item, par-dessus rubans et machines.
   Virage : l'item suit l'ARC, de la face arrière à la face de sortie.
   Droit : ligne du milieu du côté d'entrée au milieu du côté de sortie.
   rr non borné à 1 : débordement visuel sur le ruban suivant, avec les
   MÊMES règles d'acceptation que tryTransfer (aucun « anticipation »). */
function drawBeltItem(b,alpha){
  if(!b.item) return;
  const bs=beltSpeedOf(b);
  const pushDir=b.curve?beltExitDir(b):b.rot;   // direction de sortie effective
  let belt=b, rr=b.item.p+alpha*bs;
  if(rr>1){
    const d=DIRS[pushDir];
    const c=cellAt(b.x+d.x,b.y+d.y);
    if(c&&c.kind==='belt'&&!c.item&&beltPushOK(c,pushDir)&&rr<2){ belt=c; rr-=1; }
    else rr=1;                                   // bloqué : à la frontière de sortie
  }
  const cx=ox+belt.x*TILE+TILE/2, cy=oy+belt.y*TILE+TILE/2;
  if(belt.curve){
    const right=belt.curve===1;
    const kx=-8, ky=right?8:-8;
    const a0=right?-Math.PI/2:Math.PI/2, a1=0;
    const aa=a0+(a1-a0)*clamp(rr,0,1);
    const rotA=belt.rot*Math.PI/2, co=Math.cos(rotA), si=Math.sin(rotA);
    const fx=kx+Math.cos(aa)*8, fy=ky+Math.sin(aa)*8;    // repère virage → monde
    drawItemAt(ctx,b.item.t,cx+(fx*co-fy*si)*S,cy+(fx*si+fy*co)*S,S*.95);
  }else{
    const dOut=DIRS[belt.rot];
    const dIn =DIRS[(belt===b)?((b.item.entry!==undefined)?b.item.entry:b.rot):pushDir];
    const sx=cx-dIn.x*TILE/2,  sy=cy-dIn.y*TILE/2;
    const ex=cx+dOut.x*TILE/2, ey=cy+dOut.y*TILE/2;
    drawItemAt(ctx,b.item.t,sx+(ex-sx)*rr,sy+(ey-sy)*rr,S*.95);
  }
}

/* Item fini coincé : dessiné au milieu de la face de sortie, quelle que
   soit la taille de l'empreinte. */
function drawOutItem(e){
  const f=fpSize(e.type,e.rot);
  const cx=ox+(e.x+f.w/2)*TILE, cy=oy+(e.y+f.h/2)*TILE, d=DIRS[e.rot];
  ctx.save(); ctx.translate(cx+d.x*f.w*TILE/2,cy+d.y*f.h*TILE/2); ctx.rotate(e.rot*Math.PI/2);
  drawItemAt(ctx,e.outItem,0,0,S*.95);
  ctx.restore();
}

function drawMachine(e){
  if(e.type==='repartiteur'){ drawRepartiteur(e); return; }
  const f=fpSize(e.type,e.rot);
  const cx=ox+(e.x+f.w/2)*TILE, cy=oy+(e.y+f.h/2)*TILE;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(e.rot*Math.PI/2);
  if(e.flash>0){ ctx.globalAlpha=.4+.5*(e.flash/.35); drawMachineSprite(ctx,e.type,e,S); ctx.globalAlpha=1; }
  else drawMachineSprite(ctx,e.type,e,S);
  ctx.restore();
  if(e.inBuf){                                   // tampons d'entrée : points colorés
    let n=0;
    for(const k in e.inBuf) for(let i=0;i<e.inBuf[k]&&n<14;i++,n++)
      R(ox+e.x*TILE+6+n*4,oy+(e.y+f.h)*TILE-6,3,3,ITEMS[k].c);
  }
  if(e.lvl>0){                                   // chevrons dorés du niveau
    for(let i=0;i<e.lvl;i++) R(ox+e.x*TILE+4+i*7,oy+e.y*TILE+4,5,5,'#e8c96a');
  }
}

/* Panneau « ! » clignotant sur les entités bloquées */
function drawBlocked(e){
  const isB=(e.kind==='belt'&&e.blockedT>1.5)
    ||(e.kind==='machine'&&e.type!=='expedition'&&e.blockedT>1.5&&(e.outItem||e.type==='repartiteur'));
  if(!isB||Math.sin(animT*6)<-0.2) return;
  const f=fpSize(e.type,e.rot);
  const x=ox+(e.x+f.w/2)*TILE, y=oy+e.y*TILE-4;
  R(x-6,y-12,12,12,'#c9553b'); R(x-6,y-12,12,2,'#5e2417'); R(x-6,y-2,12,2,'#5e2417');
  R(x-1,y-10,2,5,'#f5ead2'); R(x-1,y-3,2,2,'#f5ead2');
}

/* Aperçu de placement : fantôme + teinte + faces d'entrée pointillées ;
   pour l'expédition : rotation imposée par le mur + message si mur absent. */
function drawPreview(){
  if(!build.destroy&&!build.type) return;
  const c=build.hover;
  if(c.x<0) return;
  if(build.destroy){
    const e=cellAt(c.x,c.y);
    if(e){
      const f=fpSize(e.type,e.rot);
      R(ox+e.x*TILE+2,oy+e.y*TILE+2,f.w*TILE-4,f.h*TILE-4,'rgba(190,70,50,.4)');
      R(ox+e.x*TILE+8,oy+e.y*TILE+f.h*TILE/2-2,f.w*TILE-16,4,'#e8926f');
      R(ox+e.x*TILE+f.w*TILE/2-2,oy+e.y*TILE+8,4,f.h*TILE-16,'#e8926f');
    }
    return;
  }
  const type=build.type;
  const isExp=type==='expedition';
  const cands=isExp?expRotCandidates(c.x,c.y):null;
  const rot=isExp?(cands.length?cands[build.expIdx%cands.length]:3):build.rot;
  const fp=fpSize(type,rot);
  const ok=canPlace(type,c.x,c.y,rot)&&state.money>=costOf(type);
  R(ox+c.x*TILE,oy+c.y*TILE,fp.w*TILE,fp.h*TILE,ok?'rgba(120,160,80,.30)':'rgba(190,70,50,.30)');
  ctx.save();
  ctx.translate(ox+(c.x+fp.w/2)*TILE,oy+(c.y+fp.h/2)*TILE);
  ctx.rotate(rot*Math.PI/2);
  ctx.globalAlpha=.75;
  if(type==='convoyeur'){
    if(build.curve){
      drawBeltCurve(ctx,S,build.curve,ECO.beltSpeed[state.research.belt],((build.hover.x+build.hover.y)%2)?'#231b13':'#261e15');
      if(ok){                                    // face d'entrée (arrière) : pointillés ivoire
        ctx.globalAlpha=.85;
        px(ctx,S,-10,-6,2,4,'#f6e8c2'); px(ctx,S,-10,2,2,4,'#f6e8c2');
      }
    }else{
      px(ctx,S,-8,-8,16,16,'#3a2c1e'); px(ctx,S,-8,-6,16,12,'#463525');
      px(ctx,S,-8,-8,16,2,'#6b563c'); px(ctx,S,-8,6,16,2,'#5b4930');
      px(ctx,S,-4,-5,3,3,'#d8c193'); px(ctx,S,-1,-2,3,4,'#d8c193'); px(ctx,S,-4,2,3,3,'#d8c193');
    }
  }else if(type==='repartiteur'){
    drawRepartiteurSprite(ctx,S,null,true);
    if(ok){                                     // face d'entrée (2 cellules) en pointillés ivoire
      ctx.globalAlpha=.85;
      px(ctx,S,-10,-10,2,4,'#f6e8c2'); px(ctx,S,-10,6,2,4,'#f6e8c2');
    }
  }else{
    drawMachineSprite(ctx,type,null,S,true);
    if(ok){                                     // faces d'entrée en pointillés ivoire
      ctx.globalAlpha=.85;
      const hl2=LONG[type]?LONG[type]*8:16;     // faces longues : sur toute la longueur
      for(let i=-12;i<=12;i+=4) px(ctx,S,-17,i,2,2,'#f6e8c2');   // face arrière (2 carnes)
      const stp=hl2>=24?8:4;
      for(let i=-(hl2-4);i<=hl2-4;i+=stp){
        px(ctx,S,i,-17,2,2,'#f6e8c2');          // face haut
        px(ctx,S,i,15,2,2,'#f6e8c2');           // face bas
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha=1;
  if(isExp&&!cands.length){
    const mx=ox+(c.x+1)*TILE, my=oy+(c.y+2)*TILE+16;
    txt('DOIT TOUCHER',mx,my,15,'#e8926f','center');
    txt('UN MUR EXTÉRIEUR',mx,my+16,15,'#e8926f','center');
  }
}

function drawHoverOutline(){
  if(build.type||build.destroy||state.modal) return;
  const e=cellAt(build.hover.x,build.hover.y);
  if(!e) return;
  const f=fpSize(e.type,e.rot);
  ctx.strokeStyle='#c99e6a'; ctx.lineWidth=2;
  ctx.strokeRect(ox+e.x*TILE+1,oy+e.y*TILE+1,f.w*TILE-2,f.h*TILE-2);
}

function addFx(pxX,pyY,txtStr){ if(fx.length<40) fx.push({x:pxX,y:pyY,txt:txtStr,age:0}); }
function drawFx(rdt){
  ctx.font='17px VT323'; ctx.textAlign='center';
  for(let i=fx.length-1;i>=0;i--){
    const f=fx[i]; f.age+=rdt;
    if(f.age>1.2){ fx.splice(i,1); continue; }
    const a=Math.max(0,1-f.age/1.2), yy=f.y-f.age*24;
    ctx.globalAlpha=a;
    ctx.fillStyle='#141009'; ctx.fillText(f.txt,f.x+1,yy+1);
    ctx.fillStyle='#ffe6a8'; ctx.fillText(f.txt,f.x,yy);
    ctx.globalAlpha=1;
  }
  ctx.textAlign='left';
}


/* ══════════════ 9. RENDU INTERFACE — tout dans le canvas ══════════════ */
/* hot() enregistre une zone cliquable PENDANT le rendu : le rendu et le
   hit-test du clic partagent ainsi exactement la même géométrie. */

function hot(x,y,w,h,fn,cursor){ hots.push({x,y,w,h,fn,cursor}); }
function noop(){}
function inRect(mx,my,x,y,w,h){ return mx>=x&&mx<x+w&&my>=y&&my<y+h; }

function txt(s,x,y,sz,c,align,f){
  ctx.font=(f==='s'?'700 '+sz+'px Silkscreen':sz+'px VT323');
  ctx.fillStyle=c; ctx.textAlign=align||'left'; ctx.textBaseline='alphabetic';
  ctx.fillText(s,x,y);
}
function txtW(s,sz,f){ ctx.font=(f==='s'?'700 '+sz+'px Silkscreen':sz+'px VT323'); return ctx.measureText(s).width; }
function wrap(s,maxW,sz,f){
  const words=String(s).split(' '); const lines=[]; let cur='';
  for(const w of words){
    const t=cur?cur+' '+w:w;
    if(txtW(t,sz,f)>maxW&&cur){ lines.push(cur); cur=w; } else cur=t;
  }
  if(cur) lines.push(cur);
  return lines;
}
function fmt(n){
  if(n>=1e9) return (n/1e9).toFixed(2).replace('.',',')+' Md';
  if(n>=1e6) return (n/1e6).toFixed(2).replace('.',',')+' M';
  if(n>=1e5) return (n/1e3).toFixed(1).replace('.',',')+'k';
  if(n>=100||Number.isInteger(n)) return Math.round(n).toLocaleString('fr-FR');
  return (Math.round(n*10)/10).toString().replace('.',',');
}
function fmtSci(n){ return n<100 ? (Math.round(n*10)/10).toString().replace('.',',') : fmt(n); }
function f1(x){ return (Math.round(x*10)/10).toString().replace('.',','); }

/* Bouton pixel — dessine ET enregistre la zone cliquable */
function button(x,y,w,h,label,fn,o){
  o=o||{};
  const dis=o.disabled;
  let bg=dis?'#2e2418':o.armed?'#6b3419':o.primary?'#4a3418':'#3a2d20';
  let bd=dis?'#453720':o.armed?'#d06b4f':o.danger?'#8a4a34':o.primary?'#e08a3c':'#6a5236';
  if(o.pulse&&Math.sin(animT*6)>0){ bd='#ffd9a0'; bg='#5a4020'; }
  ctx.fillStyle='#14100b'; ctx.fillRect(x,y+3,w,h);
  ctx.fillStyle=bg; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle=bd; ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.font='700 '+(o.small?8:9)+'px Silkscreen';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=dis?'#6b563c':o.danger?'#e8a284':o.primary?'#ffd9a0':'#e6d6b8';
  ctx.fillText(label,x+w/2-(o.key?7:0),y+h/2+1);
  if(o.key){ ctx.font='8px Silkscreen'; ctx.fillStyle='#9c8a70'; ctx.fillText('['+o.key+']',x+w-16,y+h/2+1); }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  if(!dis) hot(x,y,w,h,fn);
}

function checkbox(x,y,sz,done){
  R(x,y,sz,sz,'#1c150e');
  ctx.lineWidth=2; ctx.strokeStyle=done?'#8faf6a':'#6a5236'; ctx.strokeRect(x+1,y+1,sz-2,sz-2);
  if(done){ ctx.strokeStyle='#8faf6a'; ctx.beginPath();
    ctx.moveTo(x+3,y+sz/2); ctx.lineTo(x+sz/2-1,y+sz-4); ctx.lineTo(x+sz-4,y+3); ctx.stroke(); }
}
function pips(x,y,lvl,max){
  for(let i=0;i<max;i++){
    ctx.fillStyle=i<lvl?'#e08a3c':'#1c150e';
    ctx.fillRect(x+i*11,y,8,8);
    ctx.lineWidth=1; ctx.strokeStyle='#55432c'; ctx.strokeRect(x+i*11+.5,y+.5,8,8);
  }
}
function toast(title,body,good){
  toasts.push({title,body,good,t:0});
  while(toasts.length>4) toasts.shift();
  addLog(title);
}
function addLog(title){
  log.unshift({title});
  if(log.length>9) log.length=9;
}
/* Toasts : dans la zone de jeu en partie ; en haut à droite sur le
   bureau (sous le bloc grade, qui descend à y≈66) et l'écran-titre. */
function drawToasts(rdt){
  for(let i=toasts.length-1;i>=0;i--){
    const t=toasts[i]; t.t+=rdt;
    if(t.t>4.5) toasts.splice(i,1);
  }
  const inGame=state.screen==='game';
  const tx=inGame?gameX+12:Math.max(8,W-306);
  let y=inGame?gameY+12+(tutVisible()?tutBoxH()+8:0):92;
  const w=inGame?Math.min(290,gameW-24):290;
  for(const t of toasts){
    const a=t.t>3.8?Math.max(0,1-(t.t-3.8)/.7):1;
    ctx.globalAlpha=a;
    const th=46+(t.body?14:0);
    R(tx,y,w,th,'#2b221a');
    ctx.lineWidth=2; ctx.strokeStyle='#55432c'; ctx.strokeRect(tx,y,w,th);
    R(tx,y,5,th,t.good?'#8faf6a':'#e08a3c');
    txt(t.title,tx+14,y+19,20,t.good?'#c9dda0':'#ffd9a0');
    if(t.body) txt(t.body,tx+14,y+38,16,'#9c8a70');
    ctx.globalAlpha=1;
    y+=th+8;
  }
}
function drawTooltip(mx,my,lines){
  if(!lines||!lines.length||mx<0) return;
  let w=0;
  for(const l of lines) w=Math.max(w,txtW(l.t,l.sz||18));
  w+=22;
  const lh=19, h=lines.length*lh+12;
  const x=clamp(mx+16,4,W-w-8), y=clamp(my+18,4,H-h-8);
  ctx.fillStyle='rgba(20,16,11,.93)'; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle='#55432c'; ctx.strokeRect(x+1,y+1,w-2,h-2);
  let yy=y+18;
  for(const l of lines){ txt(l.t,x+11,yy,l.sz||18,l.c||'#e6d6b8'); yy+=lh; }
}

/* Tooltip d'une entité survolée */
function entTipLines(e){
  const L=[];
  if(e.kind==='belt'){
    const cvName=e.curve===1?' — virage à droite':(e.curve===2?' — virage à gauche':'');
    L.push({t:'Convoyeur'+cvName+(e.lvl?' niv. '+e.lvl:''),c:'#fff3d8',sz:20});
    L.push({t:'Vitesse : '+f1(beltSpeedOf(e)*10)+' cases/s. Clic gauche : infos & amélioration.',c:'#9c8a70'});
    if(e.curve) L.push({t:'Entrée : face arrière (sens de la flèche) · sortie à '+(e.curve===1?'droite':'gauche')+' de ce sens.',c:'#9c8a70'});
    if(e.item) L.push({t:'Contient : '+ITEMS[e.item.t].name,c:ITEMS[e.item.t].c});
    if(e.blockedT>1.5) L.push({t:'BLOQUÉ — la case suivante est occupée ou refuse l’item.',c:'#e8926f'});
    return L;
  }
  const def=MACHINES[e.type];
  L.push({t:def.name+(e.lvl?' — niv. '+e.lvl:''),c:'#fff3d8',sz:20});
  if(def.desc) L.push({t:def.desc,c:'#9c8a70'});
  if(e.type==='repartiteur'){
    L.push({t:'Tampon : '+e.queue.length+' / '+repCap(e)+' items.',c:'#c9b58a'});
    L.push({t:'2 entrées (face arrière) · 2 sorties (face avant) · alternance.',c:'#9c8a70'});
    L.push({t:'Fusionne 2→1 ou répartit 1→2 selon le câblage.',c:'#9c8a70'});
    if(e.blockedT>1.5) L.push({t:'BLOQUÉ — tampon plein et sorties refusées.',c:'#e8926f'});
    return L;
  }
  if(def.in) L.push({t:'Recette : '+recIn(def.in)+' → '+ITEMS[def.out].name,c:'#c9b58a'});
  else if(def.out) L.push({t:'Produit : '+ITEMS[def.out].name+' / '+f1(def.time)+' s',c:'#c9b58a'});
  if(def.time&&def.in) L.push({t:'Cycle : '+f1(def.time/speedMultOf(e))+' s (×'+speedMultOf(e).toFixed(2).replace('.',',')+')',c:'#9c8a70'});
  L.push({t:'Entrées : 3 faces — par ruban ou machine accolée. Clic gauche : infos.',c:'#8a755c'});
  if(e.type==='expedition'){ L.push({t:'Prête à vendre — les items entrent par les 3 faces intérieures.',c:'#8faf6a'}); return L; }
  if(def.in){
    const parts=Object.keys(def.in).map(k=>{
      const have=e.inBuf[k]||0, need=def.in[k];
      return {t:ITEMS[k].name+' '+have+'/'+need+(have>=need*2+1?' (plein)':''), c:have>=need?ITEMS[k].c:'#9c8a70'};
    });
    L.push({t:'Entrées :',c:'#9c8a70'});
    for(const p of parts) L.push(p);
  }
  if(e.outItem){ const d=diagnoseOut(e); if(d.length) L.push(...d); }
  else if(e.active) L.push({t:'Fabrication en cours — '+Math.round(100*e.timer/def.time)+' %',c:'#8faf6a'});
  else if(def.in){
    const missing=Object.keys(def.in).filter(k=>(e.inBuf[k]||0)<def.in[k]);
    if(missing.length){
      L.push({t:'En attente : '+missing.map(k=>(def.in[k]-(e.inBuf[k]||0))+'× '+ITEMS[k].name).join(', ')+'.',c:'#f0a35e'});
      const mach=Object.keys(MACHINES).find(mt=>mt!==e.type&&MACHINES[mt].out===missing[0]);
      if(mach) L.push({t:'Construisez : '+MACHINES[mach].name+', relié à une face d’entrée.',c:'#f0a35e'});
    }
  }else L.push({t:'Prête.',c:'#8faf6a'});
  return L;
}
function recIn(need){ return Object.keys(need).map(k=>need[k]+'× '+ITEMS[k].name).join(' + '); }

/* Diagnostic précis d'une sortie bloquée : pourquoi la case devant la
   goulotte refuse-t-elle l'item ? (ruban occupé, ruban à contre-sens,
   machines face à face, mauvaise recette, entrée pleine, ou rien devant) */
function diagnoseOut(e){
  for(const c of outCells(e)){
    const t=cellAt(c.x,c.y);
    if(!t) continue;
    if(t.kind==='belt'){
      if(t.item) return [{t:'SORTIE BLOQUÉE — le ruban devant la goulotte est occupé (bouchon).',c:'#e8926f'}];
      if(t.curve&&t.rot!==e.rot)
        return [{t:'SORTIE BLOQUÉE — virage mal orienté : il attend un flux '+DIRNAMES[t.rot]+'.',c:'#e8926f'},
                {t:'Tournez le virage (clic gauche → TOURNER) ou mettez un ruban droit.',c:'#f0a35e'}];
      const d=DIRS[t.rot];
      if(cellAt(t.x+d.x,t.y+d.y)===e)
        return [{t:'SORTIE BLOQUÉE — le ruban devant la goulotte pointe vers cette machine.',c:'#e8926f'},
                {t:'Tournez le ruban (clic gauche → TOURNER).',c:'#f0a35e'}];
      return [];                                   // libre : se résout au tick suivant
    }
    const tdef=MACHINES[t.type];
    if(t.type==='expedition') return [];           // vente : se résout au tick suivant
    if(t.type==='repartiteur'){
      const push=DIRS[e.rot], tout=DIRS[t.rot];
      if(push.x!==tout.x||push.y!==tout.y)
        return [{t:'SORTIE BLOQUÉE — répartiteur mal orienté (flux à contre-sens).',c:'#e8926f'},
                {t:'Tournez-le (clic gauche → TOURNER).',c:'#f0a35e'}];
      if(t.queue.length>=repCap(t))
        return [{t:'SORTIE BLOQUÉE — tampon du répartiteur plein.',c:'#e8926f'},
                {t:'Débouchez ses sorties (aval).',c:'#f0a35e'}];
      return [];
    }
    const push=DIRS[e.rot], face=DIRS[t.rot];
    if(push.x===-face.x&&push.y===-face.y)
      return [{t:'SORTIE BLOQUÉE — face à face : la goulotte de '+tdef.name+' pointe vers cette machine.',c:'#e8926f'},
              {t:'Tournez '+tdef.name+' (clic gauche → TOURNER).',c:'#f0a35e'}];
    const need=tdef.in;
    if(!need||!need[e.outItem])
      return [{t:'SORTIE BLOQUÉE — '+tdef.name+' ne consomme pas de '+ITEMS[e.outItem].name+'.',c:'#e8926f'},
              {t:(need?'Elle attend : '+recIn(need)+'.':'Elle ne consomme rien (machine source).'),c:'#f0a35e'}];
    if((t.inBuf[e.outItem]||0)>=need[e.outItem]*2+1)
      return [{t:'SORTIE BLOQUÉE — l’entrée de '+tdef.name+' est pleine.',c:'#e8926f'},
              {t:'Elle se vide au prochain cycle — ou ajoutez un 2e consommateur.',c:'#f0a35e'}];
    return [];
  }
  return [{t:'SORTIE BLOQUÉE — rien devant la goulotte.',c:'#e8926f'},
          {t:'Posez un ruban OU une machine accolée par une face d’entrée.',c:'#f0a35e'}];
}


/* HUD haut — une seule ligne, collée au-dessus du canvas :
   argent | science | bonus || [RECH] [RECET] [MENU] */
function drawHUD(){
  R(hudX,hudY,blockW,hudH,'#241c15');
  R(hudX,hudY+hudH-3,blockW,3,'#4a3a28');
  let x=hudX+16;
  const mstr=fmt(state.money)+' $';
  txt(mstr,x,hudY+31,24,'#e0b552');
  x+=txtW(mstr,24)+6;
  txt('(+ '+fmt(state.rate.money)+'/s)',x,hudY+31,15,'#9c8a70');
  x+=txtW('(+ '+fmt(state.rate.money)+'/s)',15)+26;
  txt('Science :',x,hudY+31,17,'#9c8a70');
  x+=txtW('Science :',17)+6;
  const sstr=fmtSci(state.sci);
  txt(sstr,x,hudY+31,22,'#9fc4d4');
  x+=txtW(sstr,22)+5;
  txt('(+ '+fmtSci(state.rate.sci)+'/s)',x,hudY+31,15,'#9c8a70');
  x+=txtW('(+ '+fmtSci(state.rate.sci)+'/s)',15)+26;
  txt('Bonus : ×'+sellMult().toFixed(2).replace('.',','),x,hudY+31,17,'#c9b58a');
  /* boutons collés au bord droit du bloc */
  let bx=hudX+blockW-10;
  const btns=[
    ['MENU','M',()=>toggleModal('menu'),{}],
    ['RECET','C',()=>toggleModal('recipes'),{}],
    ['RECH','U',()=>toggleModal('research'),{primary:true}],
  ];
  for(const [lab,key,fn,o] of btns){
    const w=txtW(lab,9,'s')+40;
    bx-=w+6;
    button(bx,hudY+9,w,28,lab,fn,Object.assign({key},o));
  }
}

/* Colonne droite — OBJECTIFS, machine sélectionnée, journal.
   Toujours affichée (le bouton MASQUER a été retiré). */
function drawSide(){
  const x=sideX, y=sideY, w=sideW, h=sideH;
  R(x,y,w,h,'#221a13');
  R(x,y,3,h,'#4a3a28');
  let cy=y+18;
  txt('OBJECTIFS',x+14,cy,8,'#ffd9a0','left','s'); cy+=14;
  const F=FACTORIES[state.factoryIdx];
  const doneN=state.factoryDone.filter(Boolean).length;
  txt(F.name,x+14,cy,13,'#8a755c'); cy+=7;
  txt(GRADES[doneN]+' · grille '+state.gridW+'×'+state.gridH,x+14,cy+7,12,'#6b563c');
  cy+=22;
  /* objectifs avec compteurs */
  for(const g of F.goals){
    const v=goalVal(g), done=v>=g.n;
    checkbox(x+14,cy-11,13,done);
    txt(goalText(g),x+33,cy,15,done?'#8faf6a':'#e6d6b8');
    txt(fmt(Math.min(v,g.n))+'/'+fmt(g.n),x+w-12,cy,14,done?'#8faf6a':'#c9b58a','right');
    cy+=16;
    R(x+33,cy-5,w-104,3,'#141009');
    R(x+33,cy-5,Math.round((w-104)*Math.min(1,v/g.n)),3,done?'#8faf6a':'#e08a3c');
    cy+=10;
  }
  /* nombre de MACHINES en service — les convoyeurs ne comptent plus */
  const nMach=state.entities.filter(e=>e.kind==='machine').length;
  const nBelt=state.entities.length-nMach;
  txt(nMach+(nMach>1?' machines':' machine')+' · '+nBelt+(nBelt>1?' rubans':' ruban'),x+14,cy+2,13,'#6b563c');
  cy+=18;
  /* avis de promotion dès que TOUS les objectifs sont remplis — y compris
     sur une usine REJOUÉE déjà validée (c'était le cas qui bloquait) */
  if(allGoalsDone()){
    R(x+8,cy,w-16,84,'#3a2a1a');
    ctx.lineWidth=2; ctx.strokeStyle='#e08a3c'; ctx.strokeRect(x+8,cy,w-16,84);
    txt('AVIS DE PROMOTION',x+16,cy+16,8,'#ffd9a0','left','s');
    txt('Objectifs remplis — le siège',x+16,cy+33,15,'#e6d6b8');
    txt('vous propose mieux.',x+16,cy+48,15,'#e6d6b8');
    button(x+16,cy+56,w-32,20,'OUVRIR LE DOSSIER',()=>openModal('promo'),{primary:true,pulse:true,small:true});
    cy+=94;
  }
  /* machine sélectionnée au clic gauche : infos + actions */
  if(state.inspect){
    if(state.entities.includes(state.inspect)) cy=drawSideMachine(x,w,cy);
    else state.inspect=null;
  }
  /* journal, ancré en bas, rogné selon la place restante */
  const jy=Math.max(cy+6,y+h-114);
  R(x+12,jy,w-24,2,'#3a2d20');
  txt('JOURNAL',x+14,jy+13,8,'#8a755c','left','s');
  const maxE=Math.max(0,Math.floor((y+h-16-(jy+22))/15));
  let ly=jy+24;
  for(const l of log.slice(0,Math.min(6,maxE))){
    txt('> '+l.title,x+14,ly,14,'#9c8a70');
    ly+=15;
  }
}

/* Section « machine sélectionnée » de la colonne droite : état détaillé
   (mêmes diagnostics que le tooltip) + AMÉLIORER / TOURNER / DÉMOLIR. */
function drawSideMachine(x,w,cy){
  const e=state.inspect, def=MACHINES[e.type], lvl=e.lvl||0;
  const upgable=e.type!=='expedition';
  const iw=w-32;
  /* ── lignes d'information ── */
  const L=[];
  if(e.kind==='belt'){
    L.push({t:'Vitesse : '+f1(beltSpeedOf(e)*10)+' cases/s',c:'#c9b58a'});
    if(e.curve) L.push({t:'Virage à '+(e.curve===1?'droite':'gauche')+' · entrée par la face arrière (sens de la flèche).',c:'#9c8a70'});
    if(e.item) L.push({t:'Contient : '+ITEMS[e.item.t].name,c:ITEMS[e.item.t].c});
    if(e.blockedT>1.5) L.push({t:'BLOQUÉ — case suivante occupée ou refusée.',c:'#e8926f'});
  }else if(e.type==='expedition'){
    L.push({t:'Vente instantanée de tout item entrant.',c:'#8faf6a'});
    L.push({t:'Entrées : les 3 faces intérieures.',c:'#9c8a70'});
  }else if(e.type==='repartiteur'){
    L.push({t:'Tampon : '+e.queue.length+' / '+repCap(e),c:'#c9b58a'});
    L.push({t:'Émissions max : '+(2+(e.lvl||0))+' / tick',c:'#9c8a70'});
    if(e.blockedT>1.5) L.push({t:'BLOQUÉ — tampon plein, sorties occupées.',c:'#e8926f'});
    else if(e.queue.length) L.push({t:'En transit : '+e.queue.length+' item(s).',c:'#8faf6a'});
  }else{
    if(def.in) L.push({t:'Recette : '+recIn(def.in)+' → '+ITEMS[def.out].name,c:'#c9b58a'});
    else L.push({t:'Produit : '+ITEMS[def.out].name,c:'#c9b58a'});
    L.push({t:'Cycle : '+f1(def.time/speedMultOf(e))+' s (×'+speedMultOf(e).toFixed(2).replace('.',',')+')',c:'#9c8a70'});
    if(def.in) for(const k in def.in){
      const have=e.inBuf[k]||0;
      L.push({t:ITEMS[k].name+' : '+have+' / '+def.in[k]+(have>=def.in[k]*2+1?' (plein)':''),c:have>=def.in[k]?ITEMS[k].c:'#9c8a70'});
    }
    if(e.outItem){ const d=diagnoseOut(e); if(d.length) L.push(...d); }
    else if(e.active) L.push({t:'Fabrication : '+Math.round(100*e.timer/def.time)+' %',c:'#8faf6a'});
    else if(def.in) L.push({t:'En attente d’ingrédients…',c:'#f0a35e'});
    else L.push({t:'Prête.',c:'#8faf6a'});
  }
  /* replie les lignes à la largeur, puis rogne selon la place disponible */
  const WL=[];
  for(const l of L) for(const s of wrap(l.t,iw,14)) WL.push({t:s,c:l.c});
  const bottomLimit=sideY+sideH-112;             // le journal garde sa place en bas
  if(bottomLimit-cy<130) return cy;              // trop bas : on saute la section
  const fixed=upgable?152:112;                   // hauteur hors lignes d'info
  const maxLines=Math.max(0,Math.floor((bottomLimit-cy-fixed)/15));
  const shown=WL.slice(0,maxLines);
  /* ── cadre ── */
  const hSec=74+shown.length*15+(upgable?64:24)+14;
  R(x+8,cy,w-16,hSec,'#2b221a');
  ctx.lineWidth=2; ctx.strokeStyle='#6a5236'; ctx.strokeRect(x+8,cy,w-16,hSec);
  txt('SÉLECTION',x+16,cy+14,8,'#ffd9a0','left','s');
  button(x+w-84,cy+4,72,18,'FERMER',()=>{state.inspect=null;},{small:true});
  /* icône + nom + niveau */
  ctx.drawImage(getMachineIcon(e.type),x+14,cy+22,36,36);
  let ny=cy+32;
  for(const nl of wrap(def.name,w-96,8,'s').slice(0,2)){ txt(nl,x+56,ny,8,'#fff3d8','left','s'); ny+=12; }
  if(upgable){
    txt('NIV. '+lvl+'/'+MAXLVL,x+56,cy+62,13,lvl>0?'#e8c96a':'#9c8a70');
    pips(x+120,cy+54,lvl,5);
  }
  /* infos */
  let iy=cy+74;
  for(const l of shown){ txt(l.t,x+16,iy,14,l.c); iy+=15; }
  /* actions */
  let by=iy+6;
  if(upgable){
    if(lvl<MAXLVL){
      const c=upCost(e);
      button(x+16,by,w-32,24,'AMÉLIORER · '+fmt(c)+' $',()=>upgradeEntity(e),{primary:true,disabled:state.money<c,small:true});
    }else{
      button(x+16,by,w-32,24,'NIVEAU MAXIMUM',noop,{disabled:true,small:true});
    }
    by+=28;
    txt(e.type==='repartiteur'?'+1 émission/tick et +2 tampon par niveau':'+30 % de vitesse par niveau',x+w/2,by+7,11,'#8a755c','center');
    by+=16;
  }
  const bw=(w-48)/2;
  if(e.type!=='expedition'){
    button(x+16,by,bw,24,'TOURNER',()=>rotateEntity(e),{small:true});
    button(x+24+bw,by,bw,24,'DÉMOLIR',()=>demolishAt(e.x,e.y),{danger:true,small:true});
  }else{
    button(x+16,by,w-32,24,'DÉMOLIR',()=>demolishAt(e.x,e.y),{danger:true,small:true});
  }
  return cy+hSec+8;
}

/* Libellés des onglets de la barre de construction */
const CAT_LABELS={logistique:'RUBANS',extraction:'PAPIER',ondulation:'ONDULATION',transformation:'ATELIERS',assemblage:'PRODUITS',vente:'QUAI'};

/* Lien texte cliquable : touche en accent + mot en clair. Surligné au
   survol, teinté en rouge quand l'outil est actif (mode démolition). */
function textLink(x,y,key,label,fn,active,dim){
  const kw=txtW(key,9,'s')+6;
  const w=kw+txtW(label,9,'s');
  const hov=mouse.x>=0&&inRect(mouse.x,mouse.y,x-3,y-11,w+9,15);
  if(hov||active) R(x-3,y-11,w+9,15,active?'#4a2418':'#3a2a1a');
  txt(key,x,y,9,active?'#e8926f':(dim?'#6b563c':'#e08a3c'),'left','s');
  txt(label,x+kw,y,9,active?'#ffd9a0':(dim?'#6b563c':(hov?'#ffd9a0':'#e6d6b8')),'left','s');
  if(!dim) hot(x-3,y-11,w+9,15,fn);
}

/* Barre du bas — liens texte R·TOURNER / X·DÉMOLIR à gauche, onglets de
   catégories, puis les machines de l'onglet actif (numérotées 1-9). */
function drawBar(){
  const y=barY;
  R(blockX,y,blockW,barH,'#241c15');
  R(blockX,y,blockW,3,'#4a3a28');
  /* ── liens texte (remplacent les gros boutons R / X) ── */
  const lx=blockX+12;
  textLink(lx,y+18,'R','TOURNER',rotateAction,false);
  textLink(lx,y+40,'X','DÉMOLIR',toggleDestroy,build.destroy);
  /* T : cycle DROIT / V. DROITE / V. GAUCHE (pose manuelle, un par un).
     Le tracé en glissement, lui, pose TOUJOURS les virages automatiquement
     quand la souris change de direction — quel que soit le mode affiché. */
  const cvLabel=build.curve===1?'V. DROITE':(build.curve===2?'V. GAUCHE':'DROIT');
  const cvSel=build.type==='convoyeur';
  textLink(lx,y+62,'T',cvLabel,()=>{
    if(build.type!=='convoyeur') selectTool('convoyeur');
    else build.curve=((build.curve||0)+1)%3;
  },cvSel&&build.curve>0,!cvSel);
  /* flèche miniature : direction courante du placement */
  ctx.save(); ctx.translate(lx+96,y+15); ctx.rotate(build.rot*Math.PI/2);
  px(ctx,1.5,-7,-2,10,4,'#d8c193');
  px(ctx,1.5,-2,-6,4,4,'#f6e8c2');
  px(ctx,1.5,-2,2,4,4,'#f6e8c2');
  ctx.restore();
  R(blockX+126,y+8,2,barH-16,'#3a2d20');
  /* ── onglets de catégories (masqués tant que rien n'y est débloqué) ── */
  const tabY=y+6, tabH=20;
  let tx=blockX+138;
  for(const [cat,types] of CATS){
    if(!types.some(t=>state.unlocked.includes(t))) continue;
    const label=CAT_LABELS[cat]||cat.toUpperCase();
    const tw=txtW(label,8,'s')+16;
    const sel=state.barCat===cat;
    ctx.fillStyle=sel?'#3a2a1a':'#241c15';
    ctx.fillRect(tx,tabY,tw,tabH);
    ctx.lineWidth=2; ctx.strokeStyle=sel?'#e08a3c':'#4a3a28';
    ctx.strokeRect(tx+1,tabY+1,tw-2,tabH-2);
    txt(label,tx+tw/2,tabY+14,8,sel?'#ffd9a0':'#9c8a70','center','s');
    hot(tx,tabY,tw,tabH,()=>setBarCat(cat));
    tx+=tw+6;
  }
  /* ── machines de l'onglet actif ── */
  const ty=y+30, th=barH-38;
  const ox0=blockX+138, availW=blockW-138-30;
  let x=ox0-state.barScroll, slot=1;
  for(const type of toolOrder){
    if(!MACHINES[type]) continue;   // type inconnu : ignoré, jamais de gel du rendu
    drawTool(type,x,ty,th,slot);
    x+=108; slot++;
  }
  state.barMax=Math.max(0,(toolOrder.length*108+4)-availW);
  state.barScroll=clamp(state.barScroll,0,state.barMax);
  if(state.barMax>0){
    const ax=blockX+blockW-24;
    const canL=state.barScroll>0, canR=state.barScroll<state.barMax;
    ctx.globalAlpha=canL?1:.3;
    R(ax,y+34,20,20,canL?'#3a2d20':'#241c15');
    txt('◄',ax+10,y+50,18,'#e6d6b8','center');
    if(canL) hot(ax,y+34,20,20,()=>{state.barScroll-=108;});
    ctx.globalAlpha=canR?1:.3;
    R(ax,y+58,20,20,canR?'#3a2d20':'#241c15');
    txt('►',ax+10,y+74,18,'#e6d6b8','center');
    if(canR) hot(ax,y+58,20,20,()=>{state.barScroll+=108;});
    ctx.globalAlpha=1;
  }
}
/* Case-machine compacte de l'onglet actif (icône + nom + prix + raccourci) */
function drawTool(type,x,y,h,slot){
  const cost=costOf(type), sel=build.type===type, poor=state.money<cost;
  const tutoHl=!state.tutDone&&TUT[state.tut]&&TUT[state.tut].hl===type;
  const w=106;
  ctx.fillStyle=sel?'#3a2a1a':'#2b221a'; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2;
  ctx.strokeStyle=sel?'#e08a3c':(tutoHl&&Math.sin(animT*6)>0?'#ffd9a0':'#55432c');
  ctx.strokeRect(x+1,y+1,w-2,h-2);
  txt(String(slot%10),x+w-11,y+13,8,'#6b563c','center','s');
  ctx.globalAlpha=poor&&!sel?.55:1;
  ctx.drawImage(getMachineIcon(type),x+5,y+(h-38)/2,38,38);
  ctx.globalAlpha=1;
  let ny=y+16;
  for(const nl of wrap(MACHINES[type].short,52,7,'s').slice(0,2)){ txt(nl,x+48,ny,7,'#e6d6b8','left','s'); ny+=10; }
  txt(fmt(cost)+' $',x+48,y+h-8,15,poor?'#d06b4f':'#e0b552');
  hot(x,y,w,h,()=>selectTool(type));
  if(mouse.x>=0&&inRect(mouse.x,mouse.y,x,y,w,h)&&!state.modal) barTip=toolTipLines(type,cost);
}
function toolTipLines(type,cost){
  const d=MACHINES[type], L=[{t:d.name,c:'#fff3d8',sz:20}];
  if(d.desc) L.push({t:d.desc,c:'#9c8a70'});
  if(d.in) L.push({t:'Recette : '+recIn(d.in)+' → '+ITEMS[d.out].name,c:'#c9b58a'});
  else if(d.out) L.push({t:'Produit : '+ITEMS[d.out].name+' / '+f1(d.time)+' s',c:'#c9b58a'});
  L.push({t:'Coût : '+fmt(cost)+' $ · possédés : '+cnt(type),c:'#e0b552'});
  if(type==='convoyeur'){
    L.push({t:'1 case pleine · glissez pour tracer une ligne (mode droit).',c:'#9c8a70'});
    const cvm=build.curve===1?'V. DROITE':(build.curve===2?'V. GAUCHE':'DROIT');
    L.push({t:'T : pose manuelle '+cvm+' (un par un) · la flèche marque le flux ENTRANT.',c:'#9c8a70'});
    L.push({t:'En glissement, les virages se posent automatiquement quand la souris tourne.',c:'#9c8a70'});
  }
  else if(type==='repartiteur') L.push({t:'2×1 · 2 entrées / 2 sorties · fusion ou répartition · R pour tourner.',c:'#9c8a70'});
  else if(type==='expedition') L.push({t:'2×2 · SEULEMENT contre un mur extérieur · rotation automatique.',c:'#9c8a70'});
  else{
    const f=fpSize(type,0);
    L.push({t:Math.min(f.w,f.h)+'×'+Math.max(f.w,f.h)+' · entrées sur les 3 faces sans goulotte : ruban OU machine accolée · R pour tourner.',c:'#9c8a70'});
  }
  return L;
}

/* ── Boîte tutoriel ── */
function tutVisible(){ return state.screen==='game'&&!state.tutDone&&state.tut<TUT.length; }
function tutBoxH(){
  if(!tutVisible()) return 0;
  return wrap(TUT[state.tut].text,Math.min(600,gameW-60),19).length*19+42;
}
function drawTutorial(){
  if(!tutVisible()) return;
  const st=TUT[state.tut];
  const w=Math.min(640,gameW-16), x=gameX+(gameW-w)/2, y=gameY+8, h=tutBoxH();
  R(x+3,y+3,w,h,'#0b0806');
  R(x,y,w,h,'rgba(22,16,10,.94)');
  ctx.lineWidth=2; ctx.strokeStyle='#e08a3c'; ctx.strokeRect(x+1,y+1,w-2,h-2);
  txt('ÉTAPE '+(state.tut+1)+'/'+TUT.length+' — '+st.title.toUpperCase(),x+14,y+20,8,'#ffd9a0','left','s');
  button(x+w-88,y+8,76,20,st.last?'TERMINER':'PASSER',()=>finishTut(),{small:true});
  let yy=y+40;
  for(const l of wrap(st.text,w-28,19)){ txt(l,x+14,yy,19,'#e6d6b8'); yy+=19; }
}

/* Contour de l'entité sélectionnée + jauge de fabrication (EXCLUSIVEMENT
   ici : c'est le seul endroit du rendu où une barre de progression existe).
   Rectangle orange pulsant à coins renforcés ; jauge au-dessus de
   l'empreinte, à la largeur de celle-ci. */
function drawSelection(){
  const e=state.inspect;
  if(!e||!state.entities.includes(e)) return;
  const f=fpSize(e.type,e.rot);
  const x=ox+e.x*TILE, y=oy+e.y*TILE, sw=f.w*TILE, sh=f.h*TILE;
  ctx.lineWidth=3;
  ctx.strokeStyle=Math.sin(animT*5)>0?'#ffd9a0':'#e08a3c';
  ctx.strokeRect(x+1.5,y+1.5,sw-3,sh-3);
  /* coins renforcés, pour un repérage immédiat */
  const c=Math.min(10,Math.min(sw,sh)/3);
  ctx.lineWidth=4; ctx.strokeStyle='#e08a3c';
  ctx.beginPath();
  ctx.moveTo(x+1,y+c);       ctx.lineTo(x+1,y+1);       ctx.lineTo(x+c,y+1);
  ctx.moveTo(x+sw-c,y+1);    ctx.lineTo(x+sw-1,y+1);    ctx.lineTo(x+sw-1,y+c);
  ctx.moveTo(x+sw-1,y+sh-c); ctx.lineTo(x+sw-1,y+sh-1); ctx.lineTo(x+sw-c,y+sh-1);
  ctx.moveTo(x+c,y+sh-1);    ctx.lineTo(x+1,y+sh-1);    ctx.lineTo(x+1,y+sh-c);
  ctx.stroke();
  /* jauge de fabrication — machine sélectionnée en train de produire */
  if(e.kind==='machine'&&e.type!=='expedition'&&e.type!=='repartiteur'&&e.active){
    const def=MACHINES[e.type];
    const pc=Math.min(1,e.timer/def.time);
    const jw=sw-12, jx=x+6, jy=y-7;
    R(jx,jy,jw,4,'#141009');
    R(jx,jy,Math.round(jw*pc),4,'#e0b552');
    R(jx,jy,Math.round(jw*pc),1,'#f6e8c2');      // reflet du haut de la jauge
  }
}

/* ── Panneaux modaux ── */
function toggleModal(id){
  if(state.modal&&state.modal.id===id){ closeModal(); return; }
  openModal(id);
}
function openModal(id){
  state.modal={id,scroll:0,maxScroll:0,data:{}};
  tf.focused=false;
  state.inspect=null;
  if(id==='save') tf.value=exportString();
}
function closeModal(){ state.modal=null; tf.focused=false; }

function modalFrame(title){
  const w=Math.min(680,W-40), h=Math.min(560,H-40);
  const x=(W-w)/2, y=(H-h)/2;
  ctx.fillStyle='rgba(10,7,5,.74)'; ctx.fillRect(0,0,W,H);
  hot(0,0,W,H,()=>closeModal(),'default');      // clic hors fenêtre = fermer
  ctx.fillStyle='#0b0806'; ctx.fillRect(x+4,y+4,w,h);
  ctx.fillStyle='#2b221a'; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle='#55432c'; ctx.strokeRect(x+1,y+1,w-2,h-2);
  hot(x,y,w,h,noop);                            // …mais pas dans la fenêtre elle-même
  txt(title,x+16,y+26,12,'#c99e6a','left','s');
  button(x+w-94,y+10,82,26,'FERMER',()=>closeModal(),{small:true});
  return {x:x+14,y:y+42,w:w-28,h:h-54};
}

function drawModal(){
  if(!state.modal) return;
  const m=state.modal;
  const titles={options:'OPTIONS',menu:'MENU',promo:'AVIS DE PROMOTION',win:'LÉGENDE DE L’EMBALLAGE',offline:'PENDANT VOTRE ABSENCE…',
    research:'RECHERCHE',recipes:'RECETTES CONNUES',stats:'STATISTIQUES',save:'SAUVEGARDE'};
  const body=modalFrame(titles[m.id]||'');
  ctx.save();
  ctx.beginPath(); ctx.rect(body.x-4,body.y-4,body.w+8,body.h+8); ctx.clip();
  let cy=body.y-m.scroll;
  let contentH=0;
  const line=(s,sz,c,f)=>{ txt(s,body.x,cy,sz,c,'left',f); cy+=sz+4; contentH+=sz+4; };

  if(m.id==='research'){
    cy+=6;
    txt('AMÉLIORATIONS (5 NIVEAUX)',body.x,cy,9,'#ffd9a0','left','s');
    txt('Banque : '+fmtSci(state.sci)+' science',body.x+body.w,cy,17,'#9fc4d4','right');
    cy+=22;
    for(const u of RESEARCH_UP){
      const lvl=state.research[u.id], max=lvl>=5, cost=max?null:u.costs[lvl];
      txt(u.name,body.x,cy,20,'#e6d6b8');
      pips(body.x+240,cy-12,lvl,5);
      txt(u.desc,body.x,cy+18,15,'#9c8a70');
      if(!max){
        const label='RECHERCHER · '+fmt(cost)+' SCI';
        const bw2=txtW(label,8,'s')+26;
        button(body.x+body.w-bw2,cy-19,bw2,26,label,()=>buyUpgrade(u),{primary:true,small:true,disabled:state.sci<cost});
      }else{
        txt('NIVEAU MAX',body.x+body.w,cy,17,'#8faf6a','right');
      }
      cy+=40; contentH+=40;
    }
    cy+=10;
    txt('DÉBLOCAGE DE PRODUITS',body.x,cy,9,'#ffd9a0','left','s');
    txt('acquis pour toute la carrière',body.x+body.w,cy,13,'#6b563c','right');
    cy+=22;
    for(const u of RESEARCH_UNLOCK){
      const done=!!state.unlocksDone[u.id];
      txt(u.name,body.x,cy,20,done?'#7d6b52':'#e6d6b8');
      const lines=wrap('Débloque : '+u.unlocks.map(t=>MACHINES[t]?MACHINES[t].name:'?').join(', '),body.w-220,15);
      let yy=cy+18;
      for(const l of lines){ txt(l,body.x,yy,15,'#9c8a70'); yy+=16; }
      if(!done){
        const label='DÉBLOQUER · '+fmt(u.cost)+' SCI';
        const bw2=txtW(label,8,'s')+26;
        button(body.x+body.w-bw2,cy-19,bw2,26,label,()=>buyUnlock(u),{primary:true,small:true,disabled:state.sci<u.cost});
      }else{
        txt('OBTENU',body.x+body.w,cy,17,'#8faf6a','right');
      }
      cy+=22+lines.length*16; contentH+=22+lines.length*16;
    }
  }
  else if(m.id==='recipes'){
    cy+=2; line('Plus un produit est transformé, plus il se vend cher. Les recettes non débloquées n’apparaissent pas.',16,'#9c8a70');
    const groups=[['MATIÈRES PREMIÈRES',['machine_papier','machine_papier_2','machine_papier_3']],
      ['ONDULATION',['onduleuse','onduleuse_2','onduleuse_3']],
      ['ATELIERS & COMPOSANTS',['atelier_renfort','atelier_intercal','atelier_poignee','imprimeuse']],
      ['PRODUITS FINIS',['assem_petit','assem_moyen','assem_grand','assem_caisse','assem_luxe']]];
    for(const [title,types] of groups){
      let any=false;
      for(const t of types) if(state.unlocked.includes(t)) any=true;
      if(!any) continue;
      cy+=12; txt(title,body.x,cy,9,'#ffd9a0','left','s'); cy+=18; contentH+=30;
      for(const t of types){
        if(!state.unlocked.includes(t)) continue;
        const d=MACHINES[t];
        if(!d) continue;                     // type inconnu : ignoré silencieusement
        let x=body.x;
        if(d.in){
          for(const k in d.in){
            ctx.drawImage(getItemIcon(k),x,cy-16,22,22); x+=26;
            txt('×'+d.in[k],x,cy+2,16,'#9c8a70'); x+=txtW('×'+d.in[k],16)+8;
          }
        }else{ txt('vieux papier',x,cy+2,16,'#9c8a70'); x+=txtW('vieux papier',16)+10; }
        txt('→',x,cy+2,22,'#e08a3c'); x+=26;
        ctx.drawImage(getItemIcon(d.out),x,cy-16,22,22); x+=28;
        txt(ITEMS[d.out].name,x,cy+2,19,'#e6d6b8');
        txt(d.name+' · '+f1(d.time)+' s'+(ITEMS[d.out].sci?' · +'+f1(ITEMS[d.out].sci)+' sci':''),body.x,cy+20,15,'#8a755c');
        txt(fmt(ITEMS[d.out].value)+' $',body.x+body.w,cy+2,19,'#e0b552','right');
        cy+=34; contentH+=34;
      }
    }
  }
  else if(m.id==='stats'){
    const s=state.stats, c=state.career, doneN=state.factoryDone.filter(Boolean).length;
    cy+=2; txt('CARRIÈRE',body.x,cy,9,'#ffd9a0','left','s'); cy+=20;
    for(const [k,v] of [['Usines terminées',doneN+' / '+FACTORIES.length],['Grade',GRADES[doneN]],
      ['Bonus de vente du groupe','×'+sellMult().toFixed(2).replace('.',',')],
      ['Argent total gagné',fmt(c.moneyTotal)+' $'],['Science totale produite',fmtSci(c.sciTotal)],
      ['Temps de jeu',Math.floor(c.playTime/3600)+' h '+Math.floor(c.playTime/60)%60+' min']]){
      txt(k,body.x,cy,18,'#9c8a70'); txt(v,body.x+body.w,cy,18,'#e6d6b8','right'); cy+=22; contentH+=22;
    }
    cy+=10; txt('USINE COURANTE — '+FACTORIES[state.factoryIdx].name.toUpperCase(),body.x,cy,9,'#ffd9a0','left','s'); cy+=20;
    for(const [k,v] of [['Machines posées / démolies',s.placed+' / '+s.destroyed],
      ['Machines en service',state.entities.filter(e=>e.kind==='machine').length],
      ['Rubans en service',state.entities.filter(e=>e.kind==='belt').length],['Argent gagné ici',fmt(s.moneyTotal)+' $']]){
      txt(k,body.x,cy,18,'#9c8a70'); txt(v,body.x+body.w,cy,18,'#e6d6b8','right'); cy+=22; contentH+=22;
    }
    cy+=8; txt('VENTES (usine courante)',body.x,cy,9,'#ffd9a0','left','s'); cy+=20;
    let any=false;
    for(const t in s.sold){
      if(!s.sold[t]) continue; any=true;
      ctx.drawImage(getItemIcon(t),body.x,cy-14,20,20);
      txt(ITEMS[t].name,body.x+26,cy+2,18,ITEMS[t].c);
      txt(String(s.sold[t]),body.x+body.w-90,cy+2,18,'#e6d6b8','right');
      txt(fmt(s.sold[t]*ITEMS[t].value)+' $',body.x+body.w,cy+2,18,'#e0b552','right');
      cy+=24; contentH+=24;
    }
    if(!any) line('Aucune vente pour l’instant.',16,'#8a755c');
  }
  else if(m.id==='save'){
    cy+=2; line('Sauvegarde automatique toutes les 30 s et à la fermeture (localStorage).',16,'#9c8a70');
    cy+=8;
    button(body.x,cy,190,28,'SAUVEGARDER MAINTENANT',()=>{saveGame();toast('Partie sauvegardée','',true);},{small:true});
    button(body.x+200,cy,150,28,'COPIER L’EXPORT',copyExport,{small:true});
    cy+=40; contentH+=48;
    txt('Chaîne de sauvegarde (cliquez dedans, Ctrl+V pour coller une autre partie) :',body.x,cy,16,'#8a755c'); cy+=20;
    textField(body.x,cy,body.w,58); cy+=70; contentH+=90;
    button(body.x,cy,220,28,'CHARGER CETTE CHAÎNE',tfEnter,{primary:true,small:true});
    button(body.x+230,cy,200,28,m.data.armed?'CONFIRMER ?':'EFFACER LA SAUVEGARDE',()=>{
      if(!m.data.armed){ m.data.armed=true; setTimeout(()=>{m.data.armed=false;},3000); return; }
      try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
      m.data.armed=false; toast('Sauvegarde effacée','La partie en cours continue.');
    },{danger:true,small:true});
    cy+=34; contentH+=34;
  }
  else if(m.id==='offline'){
    const d=m.data;
    for(const l of wrap('L’usine a tourné sans vous pendant '+d.dur+'.',body.w,21)) line(l,21,'#e6d6b8');
    line('+ '+fmt(d.m)+' $',26,'#e0b552'); line('+ '+fmtSci(d.s)+' science',26,'#9fc4d4');
    line('(50 % du taux de production, plafonné à 2 h.)',16,'#8a755c');
    cy+=14;
    button(body.x,cy,body.w,32,'REPRENDRE LE TRAVAIL',()=>closeModal(),{primary:true});
    cy+=36; contentH+=36;
  }
  else if(m.id==='menu'){
    const doneN=state.factoryDone.filter(Boolean).length;
    cy+=4;
    line('GRADE : '+GRADES[doneN],21,'#e0b552');
    line('Usines terminées : '+doneN+' / 6 · bonus de vente ×'+sellMult().toFixed(2).replace('.',','),17,'#c9b58a');
    line('Usine courante : '+FACTORIES[state.factoryIdx].name,17,'#9c8a70');
    cy+=12;
    button(body.x,cy,body.w,32,'RETOUR AU SIÈGE',()=>{closeModal();goHome();},{primary:true}); cy+=40;
    button(body.x,cy,body.w,32,'STATISTIQUES',()=>{closeModal();openModal('stats');},{}); cy+=40;
    button(body.x,cy,body.w,32,'SAUVEGARDE (EXPORT / IMPORT)',()=>{closeModal();openModal('save');},{}); cy+=40;
    button(body.x,cy,body.w,32,'SON : '+(state.sound?'ACTIVÉ':'COUPÉ'),()=>toggleSound(),{}); cy+=48;
    line('R : tourner · X : démolir · clic droit : annuler la sélection',15,'#8a755c');
    line('Clic gauche sur une machine : infos & amélioration',15,'#8a755c');
    line('U : recherche · C : recettes · molette : faire défiler',15,'#8a755c');
    contentH+=150;
  }
  else if(m.id==='options'){
    cy+=6;
    button(body.x,cy,body.w,32,'SON : '+(state.sound?'ACTIVÉ':'COUPÉ'),()=>toggleSound(),{}); cy+=44;
    button(body.x,cy,body.w,32,'SAUVEGARDE — EXPORT / IMPORT',()=>{ openModal('save'); },{small:true}); cy+=44;
    button(body.x,cy,body.w,32,homeArmed?'CONFIRMER ? TOUT EFFACER':'EFFACER TOUTE LA PROGRESSION',()=>{
      if(!homeArmed){ homeArmed=true; setTimeout(()=>{homeArmed=false;},3000); return; }
      homeArmed=false;
      try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
      bootSave=null; bootSaveTime=0;
      state.factoryDone=new Array(FACTORIES.length).fill(false);
      state.career={moneyTotal:0,sciTotal:0,sold:{},playTime:0};
      state.unlocksDone={};
      state.maxFactoryIdx=0;
      state.tutDone=false; state.tut=0; state.inRun=false; state.offlineApplied=false;
      log.length=0; toasts.length=0;
      resetRun(0);
      closeModal();
      toast('Progression effacée','Nouvelle carrière disponible.');
    },{danger:true,small:true});
    cy+=48;
    line('La sauvegarde est locale à ce navigateur : automatique toutes les 30 s,',15,'#8a755c');
    line('à la fermeture de la page, et à chaque changement d’usine.',15,'#8a755c');
    contentH+=160;
  }
  else if(m.id==='promo'){
    /* Garde structurelle : le dossier n'existe que pour l'usine en cours,
       objectifs remplis et non encore signés — jamais depuis le bureau. */
    cy+=14;                       // dégagement sous le titre : première ligne entière
    if(state.screen!=='game'||!allGoalsDone()||state.factoryDone[state.factoryIdx]){
      line('Ce dossier n’est plus disponible : les objectifs ne sont plus d’actualité.',17,'#9c8a70');
      cy+=8;
      button(body.x,cy,body.w,32,'FERMER LE DOSSIER',()=>closeModal(),{primary:true});
      cy+=40; contentH+=62;
    }
    else{
      const next=state.factoryIdx+1;
      if(next>=FACTORIES.length){
        for(const l of wrap('Le conseil d’administration vous attend. Les dix sites du groupe portent déjà votre signature : il ne reste plus qu’à signer la dernière.',body.w,20)) line(l,20,'#e6d6b8');
        cy+=8; line('Reconnaissance du groupe : +12 % de ventes permanentes, grade LÉGENDE DE L’EMBALLAGE.',17,'#f0a35e'); cy+=8;
        button(body.x,cy,body.w,34,'SIGNER — TERMINER LA CARRIÈRE',()=>doPromotion(),{primary:true,armed:m.data.armed});
      }else{
        const F=FACTORIES[next];
        for(const l of wrap('Le siège vous propose la direction de '+F.name+' ('+F.sub+'). L’usine actuelle sera remise au groupe : machines, argent et recherches locales.',body.w,20)) line(l,20,'#e6d6b8');
        cy+=6;
        line('Grille '+F.grid[0]+'×'+F.grid[1]+' · fonds de départ '+fmt(F.start)+' $ · prime '+fmtSci(F.sci)+' science',17,'#c9b58a');
        if(F.unlocks.length) line('Équipement pré-installé : '+F.unlocks.map(t=>MACHINES[t].name).join(', '),17,'#c9b58a');
        line('Reconnaissance du groupe : +12 % de ventes permanentes.',17,'#f0a35e'); cy+=8;
        button(body.x,cy,body.w,34,m.data.armed?'CONFIRMER — SIGNER LA PROMOTION':'OUVRIR LA PROMOTION',()=>{
          if(!m.data.armed){ m.data.armed=true; setTimeout(()=>{m.data.armed=false;},4000); return; }
          doPromotion();
        },{primary:true});
      }
      cy+=38; contentH+=38;
    }
  }
  else if(m.id==='win'){
    for(const l of wrap('Les dix sites du groupe tournent à plein régime et chaque caisse qui quitte un quai porte votre nom. Le conseil vous déclare LÉGENDE DE L’EMBALLAGE.',body.w,20)) line(l,20,'#e6d6b8');
    cy+=6; line('Bonus de vente final : ×'+sellMult().toFixed(2).replace('.',',')+'. Vous pouvez continuer à agrandir l’Impériale librement.',17,'#c9b58a'); cy+=10;
    button(body.x,cy,body.w,34,'CONTINUER À DIRIGER L’USINE',()=>closeModal(),{primary:true});
    cy+=38; contentH+=38;
  }
  ctx.restore();
  m.maxScroll=Math.max(0,contentH-body.h+20);
  m.scroll=clamp(m.scroll,0,m.maxScroll);
  if(m.maxScroll>0){
    const bh=Math.max(30,body.h*(body.h/(contentH+20)));
    R(body.x+body.w+6,body.y+(body.h-bh)*(m.scroll/m.maxScroll),4,bh,'#6a5236');
  }
}

/* Champ texte (import de sauvegarde) */
function textField(x,y,w,h){
  const foc=tf.focused;
  ctx.fillStyle='#1c150e'; ctx.fillRect(x,y,w,h);
  ctx.lineWidth=2; ctx.strokeStyle=foc?'#e08a3c':'#55432c'; ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.font='14px VT323'; ctx.fillStyle='#b9d3a0'; ctx.textAlign='left'; ctx.textBaseline='middle';
  let s=tf.value; while(s&&txtW(s,14)>w-18) s=s.slice(0,-1);
  ctx.fillText(s,x+8,y+h/2);
  if(foc&&Math.sin(animT*6)>0) ctx.fillRect(x+8+txtW(s,14)+2,y+h/2-8,2,16);
  ctx.textBaseline='alphabetic';
  hot(x,y,w,h,()=>{ tf.focused=true; },'text');
}
function copyExport(){
  if(navigator.clipboard) navigator.clipboard.writeText(exportString())
    .then(()=>toast('Sauvegarde copiée','',true))
    .catch(()=>toast('Copie impossible ici','Sélectionnez le texte et Ctrl+C.'));
  else toast('Copie impossible ici','Sélectionnez le texte et Ctrl+C.');
}
function tfEnter(){
  const s=tf.value.trim();
  if(!s){ toast('Chaîne vide','Collez une sauvegarde d’abord.'); return; }
  if(importString(s)){ closeModal(); toast('Sauvegarde chargée','',true); }
  else toast('Sauvegarde invalide','La chaîne n’a pas pu être lue.');
}
function toggleSound(){ state.sound=!state.sound; toast(state.sound?'Son activé':'Son coupé',''); }


/* ══════ ÉCRAN-TITRE : CARTONO pixelisé + JOUER + OPTIONS ══════ */

/* Glyphes 5×5 du logo (1 caractère = 1 gros pixel du titre) */
const TITLE_GLYPHS={
  C:['.XXX.','X...X','X....','X...X','.XXX.'],
  A:['.XXX.','X...X','XXXXX','X...X','X...X'],
  R:['XXXX.','X...X','XXXX.','X..X.','X...X'],
  T:['XXXXX','..X..','..X..','..X..','..X..'],
  O:['.XXX.','X...X','X...X','X...X','.XXX.'],
  N:['X...X','XX..X','X.X.X','X..XX','X...X'],
};

/* Le mot du logo : gros pixels kraft « ondulés » — cannelures horizontales,
   arête éclairée en haut, ombre basse, ombre portée derrière. */
function drawTitleWord(word,cx,cy,cell){
  const sh=Math.max(2,Math.floor(cell/6));
  const stp=Math.max(2,Math.floor(cell/4));
  const th=Math.max(1,Math.floor(cell/7));
  const x0=cx-(word.length*6*cell-cell)/2, y0=cy-2.5*cell;
  for(let pass=0;pass<2;pass++){
    for(let i=0;i<word.length;i++){
      const rows=TITLE_GLYPHS[word[i]]||[];
      for(let r=0;r<5;r++) for(let c=0;c<5;c++){
        if(rows[r][c]!=='X') continue;
        const bx=x0+i*6*cell+c*cell+(pass?0:sh);
        const by=y0+r*cell+(pass?0:sh);
        if(pass===0){ R(bx,by,cell,cell,'rgba(0,0,0,.42)'); continue; }
        if(r===0) R(bx,by,cell,cell,'#e9d3a8');
        else if(r===4) R(bx,by,cell,cell,'#8a6136');
        else{
          R(bx,by,cell,cell,'#c99e6a');
          for(let s=stp;s<cell-2;s+=stp) R(bx,by+s,cell,th,'#b98d58');
          R(bx+cell-2,by,2,cell,'#b98d58');
        }
      }
    }
  }
}

function drawTitle(rdt){
  drawBackground();
  const cx=W/2, word='CARTONO';
  const cell=clamp(Math.floor((W-100)/45),9,20);
  /* position de base FIXE : seul le mot du logo flotte (±4 px) —
     sous-titres, ruban, boutons JOUER et OPTIONS restent immobiles */
  const wyBase=Math.max(24+2.5*cell,Math.min(Math.round(H*0.30),H-380));
  drawTitleWord(word,cx,wyBase+Math.sin(animT*1.2)*4,cell);
  const wb=wyBase+2.5*cell;
  txt('LE TYCOON DE LA CARTONNERIE',cx,wb+38,10,'#c99e6a','center','s');
  txt('une filiale du groupe ToncPlay',cx,wb+60,17,'#8a755c','center');
  /* ── ruban animé : la gamme du groupe défile ── */
  const subY=wb+60;
  const withBelt=subY+46+53+104+16+30<=H-8;       // tout tient avec le ruban ?
  const beltY=subY+46, jy=withBelt?beltY+53:subY+36;
  if(withBelt){
    const bw=Math.min(540,W-140), bx=cx-bw/2;
    R(bx,beltY-9,bw,18,'#3a2c1e');
    R(bx,beltY-7,bw,14,'#463525');
    R(bx,beltY-9,bw,2,'#6b563c'); R(bx,beltY+5,bw,2,'#5b4930');
    const off=(animT*34)%14;
    for(let q=-14;q<bw;q+=14){
      R(bx+q+off,beltY-4,4,2,'#8f7752');
      R(bx+q+off+4,beltY-1,4,4,'#8f7752');
      R(bx+q+off,beltY+3,4,2,'#8f7752');
    }
    const parade=['papier','papier','carton','renfort','intercalaire','petit_carton','carton_moyen','grand_carton','caisse','pack_luxe'];
    ctx.save(); ctx.beginPath(); ctx.rect(bx-8,beltY-28,bw+16,56); ctx.clip();
    for(let i=0;i<parade.length;i++)
      drawItemAt(ctx,parade[i],bx+((animT*30+i*(bw/parade.length))%bw),beltY-1,1.7);
    ctx.restore();
  }
  /* ── bouton carré JOUER ── */
  const js=104, jx=cx-js/2;
  ctx.fillStyle='#0b0806'; ctx.fillRect(jx+4,jy+4,js,js);
  ctx.fillStyle='#4a3418'; ctx.fillRect(jx,jy,js,js);
  ctx.lineWidth=3; ctx.strokeStyle=Math.sin(animT*3)>0?'#ffd9a0':'#e08a3c';
  ctx.strokeRect(jx+1.5,jy+1.5,js-3,js-3);
  for(let yy=0;yy<14;yy++){                        // triangle « lecture » pixelisé
    const w2=Math.round(10*(1-Math.abs(yy-7)/8));
    R(cx-8,jy+22+yy,w2,1,'#e08a3c');
  }
  ctx.font='700 15px Silkscreen'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#ffd9a0'; ctx.fillText('JOUER',cx,jy+js-28);
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  hot(jx,jy,js,js,()=>{ state.screen='home'; });
  /* ── OPTIONS : son, sauvegarde, effacement ── */
  button(cx-85,jy+js+16,170,30,'OPTIONS',()=>openModal('options'),{small:true});
  drawToasts(rdt);
}

/* ══════ BUREAU DES DIRECTEURS : choix de mission ══════ */
function drawHome(rdt){
  drawBackground();
  const cw=Math.min(780,W-30);
  const x=(W-cw)/2;                 // colonne des missions (servira aussi à l'en-tête)
  /* retour à l'écran-titre, aligné sur la colonne */
  button(x,12,120,26,'RETOUR TITRE',()=>{ state.screen='title'; },{small:true});
  /* en-tête aligné sur la LARGEUR DES MISSIONS (plus de textes dans les coins) :
     identité à droite du bouton, bilan calé sur le bord droit de la colonne */
  const lx=x+134;
  R(lx,16,26,26,'#c99e6a');
  R(lx,21,26,4,'#8a6136'); R(lx,28,26,4,'#8a6136'); R(lx,35,26,4,'#8a6136');
  txt('CARTONO',lx+36,36,24,'#c99e6a','left','s');
  const subFull='Groupe Papier & Ondulé — Bureau des directeurs';
  txt(txtW(subFull,16)>cw-360?'Groupe Papier & Ondulé':subFull,lx+36,56,16,'#8a755c');
  const doneN=state.factoryDone.filter(Boolean).length;
  const rx=x+cw-16;
  txt('GRADE : '+GRADES[doneN].toUpperCase(),rx,28,9,'#e0b552','right','s');
  txt('Usines terminées : '+doneN+' / '+FACTORIES.length,rx,48,16,'#c9b58a','right');
  txt('Bonus de vente : ×'+sellMult().toFixed(2).replace('.',','),rx,66,16,'#c9b58a','right');
  /* zone scrollable : de l'en-tête (≈84 px) au bas de la fenêtre.
     Le clip garantit que cartes et phrase défilent BIEN DANS cette zone —
     plus de texte fixe par-dessus les cartes. */
  const zoneTop=84, zoneBottom=H-4;
  ctx.save();
  ctx.beginPath(); ctx.rect(0,zoneTop,W,zoneBottom-zoneTop); ctx.clip();
  /* cartes des usines — 132 px : nom+statut / sous-titre / description
     (place réservée au bouton) / grille+fonds / objectifs */
  let y=90-state.homeScroll;
  for(let i=0;i<FACTORIES.length;i++){
    const F=FACTORIES[i];
    const isDone=i<state.factoryIdx||state.factoryDone[i];
    const isCur=i===state.factoryIdx;
    const locked=i>state.maxFactoryIdx;
    const ch=132;
    ctx.fillStyle=locked?'#1e1711':isDone?'#261e15':'#2b221a';
    ctx.fillRect(x,y,cw,ch);
    ctx.lineWidth=2;
    ctx.strokeStyle=isCur?'#e08a3c':isDone?'#6a5236':'#4a3a28';
    ctx.strokeRect(x+1,y+1,cw-2,ch-2);
    if(isCur&&Math.sin(animT*4)>0){ ctx.strokeStyle='#ffd9a0'; ctx.strokeRect(x+1,y+1,cw-2,ch-2); }
    txt(F.name,x+16,y+24,11,locked?'#6b563c':'#e6d6b8','left','s');
    if(locked) txt('VERROUILLÉE',x+cw-16,y+24,8,'#5a4a38','right','s');
    else if(isDone&&!isCur) txt('TERMINÉE ✓',x+cw-16,y+24,8,'#8faf6a','right','s');
    else txt(state.inRun?'EN COURS':'NOUVELLE AFFECTATION',x+cw-16,y+24,8,isDone?'#8faf6a':'#ffd9a0','right','s');
    txt(F.sub,x+16,y+42,15,locked?'#5a4a38':'#8a755c');
    let yy=y+60;
    for(const l of wrap(locked?'? ? ?':F.desc,cw-260,15).slice(0,2)){ txt(l,x+16,yy,15,locked?'#4a3a28':'#9c8a70'); yy+=15; }
    if(!locked)
      txt('Grille '+F.grid[0]+'×'+F.grid[1]+' · fonds '+fmt(F.start)+' $ · prime '+fmtSci(F.sci)+' sci'+(F.unlocks.length?' · pré-installé':''),x+16,y+ch-36,15,'#8a755c');
    for(const l of wrap(locked?'Objectifs : ? ? ?':'Objectifs : '+F.goals.map(g=>goalText(g)).join(' · '),cw-32,15).slice(0,1))
      txt(l,x+16,y+ch-16,15,locked?'#4a3a28':'#c9b58a');
    if(locked){
      txt('Terminez d’abord :',x+cw-16,y+78,14,'#5a4a38','right');
      for(const l of wrap(FACTORIES[i-1].name,220,15).slice(0,1))
        txt(l,x+cw-16,y+95,15,'#5a4a38','right');
    }else if(isDone&&!isCur){
      button(x+cw-146,y+ch/2-14,130,28,'REJOUER',()=>{ resetRun(i); state.screen='game'; state.inRun=true; },{small:true});
    }else{
      /* Usine COURANTE : reprendre la partie en cours (startRun conserve
         le layout). Usine DÉBLOQUÉE mais en aval (code Konami) : on en
         prend RÉELLEMENT la direction — grille, fonds et pré-acquis. */
      const label=isCur?(state.inRun?'REPRENDRE L’USINE':'PRENDRE LA DIRECTION'):'PRENDRE LA DIRECTION';
      button(x+cw-206,y+ch/2-17,190,34,label,()=>{
        if(isCur) startRun();
        else{ resetRun(i); state.screen='game'; state.inRun=true; }
      },{primary:true,small:true});
    }
    y+=ch+12;
  }
  y+=10;
  /* phrase de sauvegarde : DANS LE FLUX DU SCROLL, sous la dernière mission,
     avec sa propre ligne au-dessus du bas du contenu — visible seulement
     quand on a défilé jusqu'en bas. */
  txt('Sauvegarde automatique toutes les 30 s · clic droit : annuler · glisser : tracer des rubans',W/2,y+16,15,'#6b563c','center');
  y+=34;
  ctx.restore();                                  // fin du clip de la zone scrollable
  /* homeMax : hauteur de contenu qui DÉPASSE la zone (mesure absolue —
     y contient déjà −homeScroll, on le retire pour obtenir la vraie hauteur). */
  const contentBottom=y+state.homeScroll;
  state.homeMax=Math.max(0,contentBottom-zoneBottom);
  state.homeScroll=clamp(state.homeScroll,0,state.homeMax);
  drawToasts(rdt);   // notifications visibles au bureau (hors zone clippée)
}

/* ══════════════ 10. PROGRESSION — objectifs, extensions, promotion ══════════════ */

function goalText(g){
  if(g.t==='money') return 'Gagner '+fmt(g.n)+' $';
  if(g.t==='sold')  return 'Vendre '+g.n+'× '+ITEMS[g.item].name;
  return '?';
}
function goalVal(g){
  if(g.t==='money') return Math.floor(state.stats.moneyTotal);
  if(g.t==='sold')  return state.stats.sold[g.item]||0;
  return 0;
}
function allGoalsDone(){ return FACTORIES[state.factoryIdx].goals.every(g=>goalVal(g)>=g.n); }
function checkGoals(){
  /* Objectifs remplis → toast, même sur une usine rejouée déjà validée :
     l'avis doit toujours proposer la suite. */
  if(allGoalsDone()&&!state.factoryDone[state.factoryIdx]&&!state.promoNotified){
    state.promoNotified=true;
    toast('AVIS DE PROMOTION','Tous les objectifs sont remplis — le siège vous attend.',true);
    SFX.research();
  }
}
function doPromotion(){
  /* Garde anti-rejeu : une usine déjà signée, ou des objectifs retombés à
     zéro, ne peut plus être « re-promue » — le dossier se ferme, point.
     C'est ce qui rend la cascade de promotions impossible. */
  if(state.factoryDone[state.factoryIdx]||!allGoalsDone()){ closeModal(); return; }
  state.factoryDone[state.factoryIdx]=true;
  closeModal();                                  // AUCUN dossier ne survit à la signature
  if(state.factoryIdx>=FACTORIES.length-1){
    openModal('win'); SFX.promo();
    toast('CARRIÈRE LÉGENDAIRE','Les dix sites du groupe portent votre nom.',true);
  }else{
    state.factoryIdx++;
    resetRun(state.factoryIdx);
    state.screen='home';
    state.inRun=false;
    SFX.promo();
    toast('PROMOTION SIGNÉE','Nouvelle affectation : '+FACTORIES[state.factoryIdx].name,true);
  }
  saveGame();
}
function goHome(){ saveGame(); state.screen='home'; state.inRun=true; }
function startRun(){
  state.screen='game'; state.inRun=true;
  if(!state.offlineApplied&&bootSave){
    state.offlineApplied=true;
    applyOffline(bootSaveTime);
  }
}
/* Remise à plat pour prendre la direction de l'usine i */
function resetRun(i){
  const F=FACTORIES[i];
  state.factoryIdx=i;
  if(i>state.maxFactoryIdx) state.maxFactoryIdx=i;   // usine la plus haute atteinte (verrouillage du siège)
  state.money=F.start; state.sci=F.sci||0;
  state.gridW=F.grid[0]; state.gridH=F.grid[1]; state.extLevel=0;
  state.entities=[]; state.counts={};
  /* Déblocages CUMULATIFS : tout ce que les usines 0..i pré-installent, PLUS
     les recherches de déblocage déjà signées (permanentes pour la carrière —
     corrigeait la disparition de l'atelier renforts dès l'usine 3). */
  state.unlocked=[...BASE_UNLOCKED];
  for(let j=0;j<=i;j++) for(const t of FACTORIES[j].unlocks||[]) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  for(const u of RESEARCH_UNLOCK) if(state.unlocksDone[u.id]) for(const t of u.unlocks) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  state.research=Object.assign({belt:0,prod:0,craft:0,discount:0},F.research||{});
  /* les pré-acquis de l'usine marquent les recherches correspondantes comme obtenues */
  for(const u of RESEARCH_UNLOCK) if(u.unlocks.every(t=>state.unlocked.includes(t))) state.unlocksDone[u.id]=true;
  state.stats={sold:{},produced:{},moneyTotal:0,sciTotal:0,placed:0,destroyed:0,playTime:0};
  state.rate={money:0,sci:0};
  state.time=0; state.promoNotified=false; state.inRun=false;
  tutEntered=-1;                          // le tutoriel repart proprement
  build.type=null; build.rot=0; build.destroy=false; build.dragging=false;
  state.inspect=null;
  fx.length=0; toasts.length=0;
  initGrid();
  rebuildToolOrder();
}
function buyUpgrade(u){
  const lvl=state.research[u.id];
  if(lvl>=5) return;
  const cost=u.costs[lvl];
  if(state.sci<cost){ SFX.err(); return; }
  state.sci-=cost; state.research[u.id]=lvl+1;
  SFX.research();
  toast('Recherche : '+u.name,'Niveau '+(lvl+1)+' / 5',true);
}
function buyUnlock(u){
  if(state.unlocksDone[u.id]) return;
  if(state.sci<u.cost){ SFX.err(); return; }
  state.sci-=u.cost;
  state.unlocksDone[u.id]=true;
  for(const t of u.unlocks) if(MACHINES[t]&&!state.unlocked.includes(t)) state.unlocked.push(t);
  SFX.research();
  toast(u.toast,u.toastBody,true);
  rebuildToolOrder();
}


/* ══════════════ 11. TUTORIEL ══════════════ */

let tutEntered=-1;
function tutStepEnter(){
  const st=TUT[state.tut];
  if(!st) return;
  if(tutEntered===state.tut) return;   // déjà entré : on ne rebascule pas
  tutEntered=state.tut;
  if(st.hl) for(const [cat,ts] of CATS) if(ts.includes(st.hl)){ setBarCat(cat); break; }
  if(st.skipIfOwned&&cnt(st.hl)>=1) tutAdvance();   // déjà posée : étape sautée
}
/* Avancement d'une étape (avec son bip et l'entrée dans la suivante). */
function tutAdvance(){
  state.tut++;
  SFX.tut();
  if(state.tut>=TUT.length) finishTut();
  else tutStepEnter();
}
function tutCheck(){
  if(!state.inRun||state.tutDone) return;
  if(state.tut>=TUT.length){ finishTut(); return; }
  tutStepEnter();                        // gère l'entrée/skip au premier tick
  const st=TUT[state.tut];
  if(st&&st.check&&st.check()) tutAdvance();
}
function finishTut(){
  state.tutDone=true;
  addLog('Tutoriel terminé');
  toast('Tutoriel terminé','L’usine est à vous. Objectif : le PACK LUXE !',true);
}


/* ══════════════ 12. SAUVEGARDE ══════════════ */

function serialize(){
  return {
    v:5, t:Date.now(),
    factoryIdx:state.factoryIdx, maxFactoryIdx:state.maxFactoryIdx, factoryDone:state.factoryDone,
    career:state.career,
    money:state.money, sci:state.sci,
    gridW:state.gridW, gridH:state.gridH, extLevel:state.extLevel,
    time:state.time, research:state.research, unlocksDone:state.unlocksDone,
    tut:state.tut, tutDone:state.tutDone, sound:state.sound,
    stats:state.stats, rate:state.rate,
    inRun:state.inRun, sideCollapsed:state.sideCollapsed,
    /* layout complet : type + position + direction + niveau + état interne */
    ent:state.entities.map(e=>e.kind==='belt'
      ? {k:'b',x:e.x,y:e.y,r:e.rot,l:e.lvl||0,cv:e.curve||0,i:e.item?{t:e.item.t,p:e.item.p,e:e.item.entry}:null}
      : {k:'m',t:e.type,x:e.x,y:e.y,r:e.rot,l:e.lvl||0,ib:e.inBuf,a:e.active?1:0,ti:e.timer,oi:e.outItem,q:e.queue||null}),
  };
}
function saveGame(){
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify(serialize())); }catch(e){}
}
function applySave(d){
  /* Migration v3 → v4 : insertion des 4 missions spéciales — les anciens
     indices 0..5 deviennent 0,1,3,5,7,9 (missions normales), les
     spéciales (2,4,6,8) restent non terminées. */
  if(d.v===3){
    const MAP=[0,1,3,5,7,9];
    d.factoryIdx=MAP[d.factoryIdx||0]||0;
    d.maxFactoryIdx=MAP[d.maxFactoryIdx||0]||0;
    if(d.factoryDone){
      const nd=new Array(FACTORIES.length).fill(false);
      for(let i=0;i<6&&i<d.factoryDone.length;i++) nd[MAP[i]]=!!d.factoryDone[i];
      d.factoryDone=nd;
    }
  }
  state.factoryIdx=clamp(d.factoryIdx||0,0,FACTORIES.length-1);
  state.maxFactoryIdx=Math.max(d.maxFactoryIdx||0,state.factoryIdx);
  state.factoryDone=(d.factoryDone||[]).slice(0,FACTORIES.length);
  while(state.factoryDone.length<FACTORIES.length) state.factoryDone.push(false);
  state.career=Object.assign({moneyTotal:0,sciTotal:0,sold:{},playTime:0},d.career);
  state.money=d.money; state.sci=d.sci;
  state.gridW=d.gridW; state.gridH=d.gridH; state.extLevel=d.extLevel||0;
  state.time=d.time||0;
  state.research=Object.assign({belt:0,prod:0,craft:0,discount:0},d.research);
  state.unlocksDone=d.unlocksDone||{};
  /* unlocked = base + pré-acquis CUMULÉS des usines ≤ factoryIdx + recherches signées */
  state.unlocked=[...BASE_UNLOCKED];
  for(let j=0;j<=state.factoryIdx;j++) for(const t of FACTORIES[j].unlocks||[]) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  for(const u of RESEARCH_UNLOCK) if(state.unlocksDone[u.id]) for(const t of u.unlocks) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  state.tut=d.tut||0; state.tutDone=!!d.tutDone;
  tutEntered=-1;
  state.sound=d.sound!==false;
  state.stats=Object.assign({sold:{},produced:{},moneyTotal:0,sciTotal:0,placed:0,destroyed:0,playTime:0},d.stats);
  state.rate=Object.assign({money:0,sci:0},d.rate);
  state.inRun=!!d.inRun; state.offlineApplied=false;
  state.sideCollapsed=!!d.sideCollapsed;
    /* Migration v4 → v5 : sémantique des virages. En v4, rot = SORTIE du
     virage ; en v5, rot = sens du flux ENTRANT. Nouveau rot = ancienne
     direction d'entrée : (r+3) pour un virage droite, (r+1) pour un
     virage gauche — entrée et sortie physiques préservées. */
  if(d.v<5) for(const s of d.ent||[]) if(s.k==='b'&&s.cv) s.r=(s.r+(s.cv===1?3:1))%4;
  state.entities=[]; state.counts={};
  for(const s of d.ent||[]){
    const e=s.k==='b'
      ? {id:++uid,kind:'belt',type:'convoyeur',x:s.x,y:s.y,rot:s.r,lvl:s.l||0,curve:s.cv||0,item:s.i?{t:s.i.t,p:(isFinite(s.i.p)?s.i.p:0),entry:(s.i.e!==undefined)?s.i.e:s.r}:null,blockedT:0,flash:0}
      : {id:++uid,kind:'machine',type:s.t,x:s.x,y:s.y,rot:s.r,lvl:s.l||0,inBuf:s.ib||{},active:!!s.a,timer:s.ti||0,outItem:s.oi||null,blockedT:0,flash:0};
    if(e.type==='repartiteur') e.queue=s.q||[];   // file interne du répartiteur
    state.entities.push(e);
    state.counts[e.type]=(state.counts[e.type]||0)+1;
  }
  initGrid();
  rebuildToolOrder();
  return d.t;
}
function exportString(){ return 'CARTO3.'+btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); }
function importString(s){
  try{
    if(s.startsWith('CARTO3.')) s=s.slice(7);
    const d=JSON.parse(decodeURIComponent(escape(atob(s))));
    if(d.v<3||d.v>5) return false;
    applySave(d);
    return true;
  }catch(e){ return false; }
}
/* Gains hors-ligne : extrapolation du taux, plafonnés à 2 h */
function applyOffline(saveTime){
  const dt=(Date.now()-saveTime)/1000;
  if(dt<60) return;
  const capped=Math.min(dt,ECO.offlineCapH*3600);
  const gm=state.rate.money*capped*ECO.offlineF;
  const gs=state.rate.sci*capped*ECO.offlineF;
  if(gm<1&&gs<0.1) return;
  state.money+=gm; state.stats.moneyTotal+=gm; state.career.moneyTotal+=gm;
  state.sci+=gs; state.stats.sciTotal+=gs; state.career.sciTotal+=gs;
  const hh=Math.floor(capped/3600), mm=Math.floor(capped/60)%60;
  openModal('offline');
  state.modal.data={m:gm,s:gs,dur:(hh?hh+' h ':'')+mm+' min'};
}


/* ══════════════ 13. RENDU PRINCIPAL, INIT & BOUCLE ══════════════ */

function layout(){
  W=canvas.width; H=canvas.height;
  hudH=46; barH=88;
  sideW=W>=900?230:190;    // objectifs toujours affichés (plus de repli)
  /* La plus grande case possible dans l'espace restant, puis le bloc
     (HUD au-dessus + canvas + colonne à droite + barre en dessous)
     est assemblé et centré dans la fenêtre. */
  const availW=W-sideW-16, availH=H-hudH-barH-16;
  TILE=clamp(Math.floor(Math.min((availW-WALL*2)/state.gridW,(availH-WALL*2)/state.gridH)),12,56);
  S=TILE/16;
  gameW=state.gridW*TILE+WALL*2;
  gameH=state.gridH*TILE+WALL*2;
  blockW=gameW+sideW;
  blockH=hudH+gameH+barH;
  blockX=Math.round((W-blockW)/2);
  blockY=Math.round((H-blockH)/2);
  hudX=blockX; hudY=blockY;
  gameX=blockX; gameY=blockY+hudH;
  barY=blockY+hudH+gameH;
  sideX=blockX+gameW; sideY=gameY; sideH=gameH;
  ox=gameX+WALL; oy=gameY+WALL;
}
function resize(){
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  layout();
}
function render(alpha,rdt){
  layout();
  drawBackground();
  drawHUD();
  drawSide();
  drawBar();
  drawFloor();
  for(const e of state.entities) if(e.kind==='belt') drawBeltSprite(e);
  for(const e of state.entities) if(e.kind==='machine') drawMachine(e);
  /* les items passent TOUJOURS au-dessus des rubans et des machines :
     plus jamais masqués en entrant sur le ruban voisin */
  for(const e of state.entities) if(e.kind==='machine'&&e.outItem) drawOutItem(e);
  for(const e of state.entities) if(e.kind==='belt') drawBeltItem(e,alpha);
  for(const e of state.entities) drawBlocked(e);
  drawHoverOutline();
  drawPreview();
  drawFx(rdt);
  drawTutorial();
  drawSelection();    // contour de l'entité sélectionnée (infos dans la colonne droite)
  drawToasts(rdt);
  /* tooltip : outil de la barre, ou entité survolée (sans outil ni panneau) */
  let tipLines=null;
  if(barTip&&!build.type){ tipLines=barTip; barTip=null; }
  else if(!build.type&&!build.destroy&&!state.modal&&mouse.x>=0){
    const e=cellAt(build.hover.x,build.hover.y);
    if(e) tipLines=entTipLines(e);
  }
  if(tipLines) drawTooltip(mouse.x,mouse.y,tipLines);
  drawModal();
}

let lastFrame=0, acc=0;
function frame(now){
  requestAnimationFrame(frame);
  const rdt=Math.min(.5,(now-lastFrame)/1000);
  lastFrame=now; animT=now/1000;
  hots.length=0;
  if(state.screen==='title'){ drawTitle(rdt); drawModal(); return; }
  if(state.screen==='home'){ drawHome(rdt); drawModal(); return; }
  /* simulation à pas FIXES de 100 ms, quel que soit le framerate */
  acc+=rdt*1000;
  let n=0;
  while(acc>=TICK_MS&&n<12){ tick(); acc-=TICK_MS; n++; }
  if(n>=12) acc=0;                     // onglet revenu d'un long sommeil
  render(Math.min(1,acc/TICK_MS),rdt); // rendu interpolé entre les ticks
}

function init(){
  canvas=document.getElementById('game');
  ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  resize();
  bindEvents();
  /* restauration de la carrière sauvegardée (on démarre au siège) */
  try{ bootSave=JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){ bootSave=null; }
  if(bootSave&&bootSave.v>=3&&bootSave.v<=5){ bootSaveTime=applySave(bootSave)||Date.now(); }
  else{ bootSave=null; resetRun(0); }
  state.screen='title';   // démarrage sur l'écran-titre CARTONO
  if(document.fonts){ document.fonts.load('700 10px Silkscreen'); document.fonts.load('20px VT323'); }
  requestAnimationFrame(t=>{ lastFrame=t; requestAnimationFrame(frame); });
}
init();