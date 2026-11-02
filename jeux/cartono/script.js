'use strict';
/* ════════════════════════════════════════════════════════════════════
   CARTONO
   ────────────────────────────────────────────────────────────────────
 */

/* ══════════════ 0. BILINGUE FR/EN ══════════════
   Dictionnaires chargés par index.html (js/lang.js) AVANT script.js.
   - T('ui.cle')  : chaîne d'interface, interpolations {M} {N} {X} {Y} {V}
   - setLang('fr'|'en') : bascule + persistance (localStorage cartono.lang)
   - applyLang() : traduit EN PROFONDEUR les données de jeu (ITEMS, MACHINES,
     FACTORIES, GRADES, RESEARCH, ACHIEVEMENTS, TUT, LETTERS, CAT_LABELS)
     et met à jour <html lang> + <title>. Les const de données gardent leur
     identité (mêmes objets mutés) : sauvegardes et icônes inchangées. */

const LANGS=['fr','en'];
let LANG_CUR='fr';
function LANG(){ return (window.CARTONO_LANG&&window.CARTONO_LANG[LANG_CUR])||window.CARTONO_LANG.fr; }
function curLang(){ return LANG_CUR; }
function T(key,vars){
  const L=LANG();
  const ui=(key.startsWith('ui.'))?L.ui[key.slice(3)]:undefined;
  let s=(ui!==undefined)?ui:key;
  if(vars) for(const k in vars) s=String(s).split('{'+k+'}').join(vars[k]);
  return s;
}
function multFmt(x){ return x.toFixed(2).replace('.',LANG().fmt.dec); }
function setLang(l){
  if(!LANGS.includes(l)) l='fr';
  if(l===LANG_CUR) return;
  LANG_CUR=l;
  try{ stSet('cartono.lang',l); }catch(e){}
  applyLang();
  try{ uiSnd('tab'); }catch(e){}
}
function bootLang(){
  let l=null;
  try{ l=stGet('cartono.lang'); }catch(e){}
  if(!LANGS.includes(l)) l='fr';
  LANG_CUR=l;
  applyLang();
}
function applyLang(){
  const L=LANG();
  if(typeof DIRNAMES!=='undefined') DIRNAMES.splice(0,DIRNAMES.length,...L.dirnames);
  for(const k in L.items) if(ITEMS[k]) ITEMS[k].name=L.items[k];
  for(const k in L.machines) if(MACHINES[k]){
    MACHINES[k].name=L.machines[k].name;
    MACHINES[k].short=L.machines[k].short;
    MACHINES[k].desc=L.machines[k].desc;
  }
  L.factories.forEach((f,i)=>{ if(FACTORIES[i]){ FACTORIES[i].name=f.name; FACTORIES[i].sub=f.sub; FACTORIES[i].desc=f.desc; } });
  GRADES.splice(0,GRADES.length,...L.grades);
  L.research_up.forEach((r,i)=>{ if(RESEARCH_UP[i]){ RESEARCH_UP[i].name=r.name; RESEARCH_UP[i].desc=r.desc; } });
  L.research_unlock.forEach((r,i)=>{ if(RESEARCH_UNLOCK[i]){ RESEARCH_UNLOCK[i].name=r.name; RESEARCH_UNLOCK[i].toast=r.toast; RESEARCH_UNLOCK[i].toastBody=r.toastBody; } });
  L.achievements.forEach((a,i)=>{ if(ACHIEVEMENTS[i]){ ACHIEVEMENTS[i].name=a.name; ACHIEVEMENTS[i].desc=a.desc; } });
  L.tut.forEach((t,i)=>{ if(TUT[i]){ TUT[i].title=t.title; TUT[i].text=t.text; } });
  for(const k in L.letters) LETTERS[k]=L.letters[k];
  for(const k in L.cats) CAT_LABELS[k]=L.cats[k];
  document.documentElement.lang=L.meta.htmlLang;
  document.title=L.meta.title;
}

/* Drapeaux FR / EN cliquables (écran-titre et bureau des directeurs) */
function drawFlag(code,x,y,w){
  const h=Math.round(w*2/3);
  R(x-2,y-2,w+4,h+4,'#14100b');
  if(code==='fr'){
    const bw=Math.round(w/3);
    R(x,y,bw,h,'#3b5ba5');
    R(x+bw,y,bw,h,'#e8e4d8');
    R(x+2*bw,y,w-2*bw,h,'#c9553b');
  }else{
    R(x,y,w,h,'#3b5ba5');
    ctx.fillStyle='#e8e4d8';
    for(let i=0;i<w;i++){
      const t=i/(w-1);
      ctx.fillRect(x+i,y+Math.round(t*(h-4)),1,4);
      ctx.fillRect(x+i,y+Math.round((1-t)*(h-4)),1,4);
    }
    R(x,y+Math.round(h/2)-4,w,8,'#e8e4d8');
    R(x,y+Math.round(h/2)-2,w,4,'#c9553b');
    R(x+Math.round(w/2)-4,y,8,h,'#e8e4d8');
    R(x+Math.round(w/2)-2,y,4,h,'#c9553b');
  }
  ctx.lineWidth=1; ctx.strokeStyle='#241c15'; ctx.strokeRect(x-1.5,y-1.5,w+3,h+3);
}
/* Paire de drapeaux centrée sur x ; labels optionnels ; renvoie la hauteur utilisée */
function drawLangFlags(x,y,w,withLabels){
  const h=Math.round(w*2/3);
  const gap=Math.round(w*0.55);
  const total=2*w+gap;
  const left=x-total/2;
  const info=[['fr',left],['en',left+w+gap]];
  for(const [code,fx] of info){
    const active=curLang()===code;
    ctx.globalAlpha=active?1:.6;
    drawFlag(code,fx,y,w);
    ctx.globalAlpha=1;
    ctx.lineWidth=2;
    ctx.strokeStyle=active?'#e08a3c':'#55432c';
    ctx.strokeRect(fx-3,y-3,w+6,h+6);
    if(withLabels) txt(T(code==='fr'?'ui.flagFr':'ui.flagEn'),fx+w/2,y+h+18,8,active?'#ffd9a0':'#6b563c','center','s');
    hot(fx-4,y-4,w+8,h+8,()=>setLang(code),'pointer');
  }
  return withLabels?h+28:h+8;
}



/* ══════════════ 1. CONFIGURATION — équilibrage centralisé ══════════════ */

const TICK_MS = 100;                 
const DT      = TICK_MS/1000;
const SAVE_KEY = 'cartonnerie.save.v3';
const WALL    = 8;                   
const MAXLVL  = 5;                   

const ECO = {
  beltSpeed   : [0.18,0.25,0.32,0.39,0.46,0.53], 
  prodSpeed   : [1,1.25,1.56,1.95,2.44,3.05],  
  craftSpeed  : [1,1.25,1.56,1.95,2.44,3.05],   
  costMult    : [1,0.94,0.88,0.83,0.78,0.73],   
  upBonus     : 0.30,  
  upBase      : 0.75,  
  upGrowth    : 2.4,
  sciPerEntity: 0.007,  
  offlineF    : 0.5, offlineCapH : 2,
  refund      : 0.5,  
  growthM     : 1.15, growthB : 1.06,
  promoBonus  : 0.12,   
  tradeBonus  : 0.08,  
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

const MACHINES = {
  convoyeur: { name:'Convoyeur', short:'CONVOYEUR', cat:'logistique', cost:2, growth:ECO.growthB,
    desc:'Occupe toute sa case et transporte un item à la fois, dans le sens de son grand chevron. Glissez la souris pour tracer une ligne.' },
  ruban_sout: { name:'Ruban souterrain', short:'SOUTERR.', cat:'logistique', cost:8,
    desc:'Passe SOUS machines et obstacles : posez l’ENTRÉE, puis la SORTIE (2e clic) entre 1 et 5 cases devant — jusqu’à 4 cases de vide franchies. Les deux tuiles se raccordent aux convoyeurs comme un bout de ruban.' },
  repartiteur: { name:'Répartiteur de flux', short:'RÉPARTIT.', cat:'logistique', cost:40,
    desc:'2 entrées (face arrière), 2 sorties (face avant). Fusionne deux flux en un, ou répartit un flux sur deux sorties. Tampon de 6 items. Cliquez dessus : priorité d’entrée, sortie favorite et FILTRES D’OBJETS par sortie (ex. : le papier à gauche, le carton à droite).' },
  machine_papier: { name:'Machine à papier', short:'MÀ PAPIER', cat:'extraction', cost:10, time:1.8, out:'papier',
    desc:'Transforme un bac de vieux papiers en feuilles propres, en continu. Aucune entrée.' },
  machine_papier_2: { name:'Cuve industrielle', short:'CUVE INDUS.', cat:'extraction', cost:160, time:0.9, out:'papier',
    desc:'Machine à papier industrielle : deux fois plus rapide, pour les chaînes gourmandes en papier.' },
  machine_papier_3: { name:'Ligne continue', short:'LIGNE CONT.', cat:'extraction', cost:2000, time:0.45, out:'papier',
    desc:'Ligne de production continue : le papier sort quatre fois plus vite que la machine de base.' },
  onduleuse: { name:'Onduleuse', short:'ONDULEUSE', cat:'ondulation', cost:60, time:3.0,
    in:{ papier:3 }, out:'carton',
    desc:'La machine phare : colle 3 feuilles de papier en une plaque de carton ondulé.' },
  onduleuse_2: { name:'Onduleuse double-face', short:'OND. DBLE-F', cat:'ondulation', cost:800, time:1.5,
    in:{ papier:3 }, out:'carton',
    desc:'Onduleuse double-face : deux fois plus rapide, avec une seconde paire de rouleaux.' },
  onduleuse_3: { name:'Onduleuse rotative', short:'OND. ROTAT.', cat:'ondulation', cost:9000, time:0.75,
    in:{ papier:3 }, out:'carton',
    desc:'L’onduleuse rotative géante : la cadence industrielle, pour les très grosses chaînes.' },
  atelier_renfort: { name:'Atelier renforts', short:'RENFORTS', cat:'transformation', cost:120, time:2.5,
    in:{ carton:1 }, out:'renfort', desc:'Façonne des équerres de protection à partir de carton ondulé.' },
  atelier_intercal: { name:'Atelier intercalaires', short:'INTERCAL.', cat:'transformation', cost:90, time:2.0,
    in:{ papier:1 }, out:'intercalaire', desc:'Découpe des feuilles de calage dans le papier.' },
  atelier_poignee: { name:'Découpe-poignées', short:'POIGNÉES', cat:'transformation', cost:180, time:3.0,
    in:{ carton:1 }, out:'poignee', desc:'Découpe des poignées dans le carton ondulé.' },
  imprimeuse: { name:'Imprimeuse', short:'IMPRIMEUSE', cat:'transformation', cost:240, time:3.0,
    in:{ papier:1 }, out:'impression', desc:'Imprime logos et décors sur le papier (encre bleue).' },
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
  expedition: { name:'Quai grand', short:'QUAI GRAND', cat:'vente', cost:15, wall:true, w:2, h:2,
    desc:'2×2 · Le quai de chargement : se pose CONTRE UN MUR EXTÉRIEUR, damier vers l’extérieur. Les 3 faces intérieures vendent tout item entrant, instantanément.' },
  expedition_couloir: { name:'Quai couloir', short:'QUAI COULOIR', cat:'vente', cost:14, wall:true, w:2, h:1,
    desc:'2×1 · Quai étroit : deux faces intérieures pour vendre. Se glisse dans les couloirs étroits.' },
  expedition_lane: { name:'Quai lane', short:'QUAI LANE', cat:'vente', cost:14, wall:true, w:1, h:2,
    desc:'1×2 · Quai étroit vertical : deux faces intérieures pour vendre. Se glisse entre les machines.' },
  expedition_micro: { name:'Quai micro', short:'QUAI MICRO', cat:'vente', cost:10, wall:true, w:1, h:1,
    desc:'1×1 · Micro-quai : UNE face intérieure pour vendre — cher à la case, mais se niche n’importe où le long d’un mur.' },
  benne: { name:'Benne à déchets', short:'BENNE', cat:'vente', cost:20, w:1, h:1,
    desc:'1×1 · La poubelle de l’usine : se pose LIBREMENT (mur ou pas), accepte par ses 4 faces, et rejette tout ce qui y entre au quart de sa valeur. Les rebuts ne comptent pas comme des ventes pour les objectifs.' },
};

const BASE_UNLOCKED = ['convoyeur','ruban_sout','repartiteur','machine_papier','expedition','expedition_couloir','expedition_lane','expedition_micro','benne','onduleuse','assem_petit'];

const RESEARCH_UP = [
  { id:'belt',    name:'Logistique rapide',      desc:'Vitesse des rubans ET répartiteurs : 1,8 → 5,3 cases/s', costs:[8,20,50,120,300] },
  { id:'prod',    name:'Cuves survoltées',      desc:'Cadence des machines à papier : ×1,25 / niv.',  costs:[10,30,80,200,500] },
  { id:'craft',   name:'Ateliers optimisés',    desc:'Cadence des ateliers et assembleuses : ×1,25 / niv.', costs:[15,40,100,250,600] },
  { id:'discount',name:'Fournisseurs négociés', desc:'Coût des machines : −6 % / niveau',             costs:[30,90,250,600,1500] },
  { id:'trade',   name:'Contrats commerciaux',  desc:'Prix de vente : +8 % / niveau',                  costs:[40,100,250,600,1500] },
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
];

const CATS = [
  ['logistique',    ['convoyeur','ruban_sout','repartiteur']],
  ['extraction',    ['machine_papier','machine_papier_2','machine_papier_3']],
  ['ondulation',    ['onduleuse','onduleuse_2','onduleuse_3']],
  ['transformation',['atelier_renfort','atelier_intercal','atelier_poignee','imprimeuse']],
  ['assemblage',    ['assem_petit','assem_moyen','assem_grand','assem_caisse','assem_luxe']],
  ['vente', ['expedition','expedition_couloir','expedition_lane','expedition_micro','benne']],
];

const FACTORIES = [
  { name:'Le Hangar des Bords de Route', sub:'Affectation n°1 — Stagiaire',
    grid:[16,12], start:200, sci:0,
    unlocks:[], research:{},
    goals:[{t:'money',n:600},{t:'sold',item:'petit_carton',n:60}],
    desc:'Un vieux hangar, un contrat de livraison, et vous. Faites tourner la boutique.' },
  { name:'L’Atelier du Vieux Quartier', sub:'Affectation n°2 — Chef d’atelier',
    grid:[20,14], start:450, sci:25,
    unlocks:['atelier_renfort','assem_moyen'], research:{belt:1},
    goals:[{t:'money',n:2500},{t:'sold',item:'carton_moyen',n:45}],
    desc:'Le quartier veut des cartons renforcés. Livrez, et le siège vous regardera d’un œil neuf.' },
  { name:'Le Dépôt des Poutres', sub:'Affectation spéciale — exercice d’étroitesse',
    grid:[13,9], start:900, sci:45,
    unlocks:[], research:{}, obstacles:[[2,3,4,1],[7,3,4,1],[8,5,1,3]],
    forcedDock:{type:'expedition_couloir',x:0,y:7}, goals:[{t:'money',n:1200},{t:'sold',item:'carton_moyen',n:18}],
    desc:'Dépôt minuscule, poutres indestructibles, un seul quai : le COULOIR scellé au mur ouest. Faites tenir une chaîne renforcée entre les murs.' },
  { name:'La Cartonnerie des Canaux', sub:'Affectation n°3 — Directeur adjoint',
    grid:[23,16], start:2500, sci:80,
    unlocks:['atelier_intercal','assem_grand'], research:{belt:1,prod:1},
    goals:[{t:'money',n:9000},{t:'sold',item:'grand_carton',n:40}],
    desc:'Les entrepôts des canaux réclament du volume : grands cartons obligatoires.' },
  { name:'L’Entrepôt des Pilotis', sub:'Affectation spéciale — slalom industriel',
    grid:[14,10], start:5000, sci:150,
    unlocks:[], research:{}, obstacles:[[3,3,1,4],[10,3,1,4],[6,4,2,2]],
    forcedDock:{type:'expedition',x:4,y:0}, goals:[{t:'money',n:4000},{t:'sold',item:'grand_carton',n:20}],
    desc:'Des piles de fondation coupent l’entrepôt en couloirs. Votre quai GRAND est scellé au mur nord — le seul de la mission. Livrez des grands cartons, en slalom.' },
  { name:'Le Complexe Ondulé-Central', sub:'Affectation n°4 — Directeur de site',
    grid:[26,18], start:14000, sci:260,
    unlocks:['atelier_poignee','imprimeuse','assem_caisse'], research:{belt:2,prod:1,craft:1},
    goals:[{t:'money',n:35000},{t:'sold',item:'caisse',n:18},{t:'sold',item:'renfort',n:45},{t:'sold',item:'carton',n:130}],
    desc:'Le complexe industriel du groupe. On y assemble des caisses complètes, poignées comprises.' },
  { name:'La Halle aux Cloisons', sub:'Affectation spéciale — le labyrinthe humide',
    grid:[15,10], start:25000, sci:550,
    unlocks:[], research:{}, obstacles:[[2,4,4,1],[9,4,4,1],[6,1,1,2],[6,6,1,2]],
    forcedDock:{type:'expedition_lane',x:13,y:2}, goals:[{t:'money',n:14000},{t:'sold',item:'caisse',n:10},{t:'sold',item:'impression',n:60}],
    desc:'Une halle coupée en quatre par ses cloisons d’origine. Votre quai LANE est scellé au mur est — le seul de la mission. Des caisses complètes dans ce dédale.' },
  { name:'La Méga-Cartonnerie du Port', sub:'Affectation n°5 — Directeur régional',
    grid:[30,20], start:90000, sci:900,
    unlocks:['assem_luxe'], research:{belt:2,prod:2,craft:2},
    goals:[{t:'money',n:55000},{t:'sold',item:'pack_luxe',n:20},{t:'sold',item:'poignee',n:50},{t:'sold',item:'carton_moyen',n:70}],
    desc:'Les paquebots du port n’emportent que du luxe. Le pack signature, ou rien.' },
  { name:'Le Hangar des Écluses', sub:'Affectation spéciale — le sas final',
    grid:[16,11], start:160000, sci:1900,
    unlocks:[], research:{}, obstacles:[[5,2,1,5],[10,2,1,5],[7,5,2,1]],
    forcedDock:{type:'expedition_micro',x:6,y:0}, goals:[{t:'money',n:45000},{t:'sold',item:'pack_luxe',n:11},{t:'sold',item:'intercalaire',n:35}],
    desc:'Trois compartiments d’écluse, à peine plus larges qu’un pack luxe, et un MICRO-QUAI scellé au mur nord — une seule case pour tout vendre. Le dernier exercice avant l’Impériale.' },
  { name:'L’Impériale Emballage', sub:'Affectation finale — Directeur du groupe',
    grid:[34,23], start:600000, sci:3200,
    unlocks:[], research:{belt:3,prod:2,craft:2,discount:1},
    goals:[{t:'money',n:120000},{t:'sold',item:'pack_luxe',n:28},{t:'sold',item:'carton',n:220},{t:'sold',item:'grand_carton',n:40}],
    desc:'La plus grande cartonnerie du pays. Votre nom finira sur les caisses.' },
];
const GRADES = ['Stagiaire','Chef d’atelier','Chef de chantier','Directeur adjoint','Responsable de production','Directeur de site','Directeur de complexe','Directeur régional','Directeur des opérations','Directeur du groupe','Légende de l’emballage'];

/* Tutoriel — */
const TUT = [
  { hl:'machine_papier', title:'Faites tourner la boutique',
    text:'On va y aller doucement, directeur. Prenez la MACHINE À PAPIER (onglet RUBANS… non : PAPIER, touche 1) et posez-la où bon vous semble. Elle occupe 4 cases (2×2). Repérez la goulotte ivoire à flèche : c’est sa SORTIE. Les trois autres faces — vous les reconnaîtrez à leurs encoches sombres — acceptent papier… pardon, acceptent tout ce qui arrive. La touche R l’oriente avant la pose.',
    check:()=>cnt('machine_papier')>=1 },
  { hl:'expedition', title:'Un quai, des camions',
    text:'Les camions chargent DEPUIS l’extérieur : l’EXPÉDITION (onglet QUAI) se pose CONTRE UN MUR EXTÉRIEUR — le damier jaune et noir doit regarder dehors, la rotation est automatique. Ses trois faces intérieures vendent instantanément tout ce qui y entre. Approchez le fantôme du mur jusqu’à ce qu’il passe au vert.',
    check:()=>cnt('expedition')>=1 },
  { hl:'convoyeur', title:'Reliez tout ça',
    text:'Deux écoles, directeur : ACCOLER les machines (une goulotte contre une face à encoches les nourrit directement), ou tracer des CONVOYEURS — cliquez et GLISSEZ : les rubans suivent la souris et posent même les virages tout seuls aux tournants. Objectif du conseil : voir des feuilles circuler et l’argent monter. Un papier vendu = 1 $. Et quand un obstacle barre la route : le RUBAN SOUTERRAIN (même onglet) — un clic sur l’entrée, un second sur la sortie, jusqu’à 5 cases plus loin, et le flux passe dessous.',
    check:()=>((state.stats.sold.papier)||0)>=1 },
  { hl:'onduleuse', title:'Transformer, toujours transformer',
    text:'Vendre du papier brut, c’est de la charitée. L’ONDULEUSE (onglet ONDULATION) avale 3 feuilles de papier et rend une plaque de carton ondulé — vendue 5 $, soit 5 fois le brut. Montage type : la goulotte de la machine à papier DANS une face à encoches de l’onduleuse, puis la goulotte de l’onduleuse vers le quai. Le papier entre par les faces sans goulotte : par ruban OU par machine accolée.',
    skipIfOwned:true, check:()=>((state.stats.produced.carton)||0)>=1 },
  { hl:'assem_petit', title:'Le premier produit fini',
    text:'Le carton ondulé, c’est l’économat. Les DIRIGEANTS, ils veulent du PRODUIT : l’ASSEMBLEUSE PETIT CARTON (onglet PRODUITS) prend 2 plaques et rend un petit carton à 15 $. Même montage : goulotte amont vers encoches aval, jusqu’au quai. Ce format, c’est la base de l’emballage — et de votre réputation.',
    skipIfOwned:true, check:()=>((state.stats.sold.petit_carton)||0)>=1 },
  { hl:'repartiteur', title:'Un flux, deux branches',
    text:'Le RÉPARTITEUR (onglet RUBANS) partage un flux vers deux sorties — ou fusionne deux flux en un. Posé après la machine à papier, il nourrit l’onduleuse ET une seconde branche. Vous en aurez besoin dès le carton renforcé. Ce n’est pas obligatoire tout de suite : gardez-le en tête.',
    check:()=>cnt('repartiteur')>=1 },
  { hl:null, title:'Vous êtes opérationnel', last:true,
    text:'Ce que le conseil attend d’un directeur : surveillez les panneaux « ! » — c’est un bouchon, ça coûte de l’argent. Un CLIC GAUCHE sur une machine ouvre ses états et son AMÉLIORATION (colonne de droite) ; un CLIC DROIT annule tout ; R tourne, X démolit (50 % remboursés). Les OBJECTIFS sont dans la même colonne : remplis-les et le siège vous proposera mieux. Le PACK LUXE est loin, directeur. Commencez par vendre des petits cartons. Bonne chance.' },
];

const LETTERS={
  intro0:'Bienvenue au Hangar des Bords de Route, directeur.\n\nPersonne d’autre ne voulait ce poste. Le hangar penche, le toit siffle, et le contrat de livraison précédent s’est terminé en flute. Le groupe vous fait confiance — c’est une manière de dire qu’il n’a plus personne d’autre.\n\nInstallez une production de petits cartons. Le conseil attend 600 $ et 60 petits cartons vendus avant de reparler de votre avenir.\n\nPS — Conseil d’ancien : votre première chaîne doit être courte — une machine à papier, un quai, et des rubans entre les deux. Le reste viendra.',
  intro1:'Le Vieux Quartier vous souhaite la bienvenue, directeur.\n\nVos cartons simples ont fait leur office. Le quartier, lui, expédie de la verrerie : il veut du RENFORCÉ. Nous avons donc pré-installé un atelier d’équerres de protection — vos machines et votre argent, eux, repartent de zéro : c’est la politique du groupe.\n\nLe conseil attend 2 500 $ et 45 cartons moyens. La science que vous avez signée vous suit, elle.\n\nPS — Conseil d’ancien : ne démolissez pas votre chaîne à cartons — bifurquez-la. Un répartiteur vous fera deux routes pour le prix d’une.',
  intro2:'Le Dépôt des Poutres, directeur. Lisez bien.\n\nCe dépôt n’était pas prévu au plan. Le service technique y a laissé des poutres maîtresses — indestructibles, paraît-il — et le quai est scellé au mur ouest : vous n’en poserez pas d’autre, c’est contractuel.\n\nC’est un exercice d’étroitesse, pas une usine. Prouvez qu’une chaîne renforcée tient entre les murs : 1 200 $ et 18 cartons moyens.\n\nPS — Conseil d’ancien : ici, la place vaut de l’or. Chaque virage compte double : comptez vos cases avant de poser.',
  intro3:'La Cartonnerie des Canaux vous est confiée, directeur.\n\nLes entrepôts des canaux expédient du volume : grands cartons obligatoires, calage compris. Un atelier d’intercalaires vous attend sur place — avec vos déblocages de carrière, vous avez tout en main.\n\nLe conseil attend 9 000 $ et 40 grands cartons. Le groupe commence à prononcer votre nom sans rire.\n\nPS — Vous allez avoir trois chaînes qui convergent. Prévoyez la place AVANT de poser : une arborescence se dessine du quai vers l’amont, comme une rivière à l’envers.',
  intro4:'L’Entrepôt des Pilotis, directeur.\n\nLe service technique s’excuse : les piles de fondation traversent le plancher et le quai est scellé au mur nord. Faites avec. C’est un slalom, pas un boulevard.\n\nVingt grands cartons et 4 000 $ : le conseil veut voir si vous savez contourner.\n\nPS — Conseil d’ancien : contourner n’est pas perdre — un détour de trois cases vaut mieux qu’un bouchon de trente.',
  intro5:'Le Complexe Ondulé-Central, directeur. Félicitations.\n\nIci, on assemble des CAISSES complètes : poignées, impression, calage. Découpe-poignées et imprimeuse pré-installées. Vos chaînes vont se ramifier — c’est le moment de relire vos notes sur les répartiteurs.\n\nLe conseil attend 35 000 $, 18 caisses, 45 renforts et 130 plaques de carton vendues : oui, les surplus se vendent aussi — rien ne se perd.\n\nPS — Quatre ingrédients, quatre branches. Les directeurs qui échouent ici sont ceux qui ont construit en tas ; ceux qui réussissent ont construit en arbre.',
  intro6:'La Halle aux Cloisons, directeur.\n\nLes cloisons d’origine coupent la halle en quatre et le quai est scellé au mur est. Le service technique parle de « caractère des lieux ». Le conseil parle de défi.\n\nDix caisses complètes et 14 000 $ dans ce dédale — et 60 impressions vendues : la marque commence à compter.\n\nPS — Conseil d’ancien : la marque se paie au poids — une impression mal placée bloque toute une chaîne. Placez les imprimeuses en amont, jamais en coin.',
  intro7:'La Méga-Cartonnerie du Port, directeur.\n\nLes paquebots n’emportent que du LUXE. Le pack signature : 3 plaques, une impression, un calage, une poignée, un renfort. Cinq chaînes qui convergent. L’assembleuse est pré-installée ; le reste, c’est vous.\n\nLe conseil attend 55 000 $, 20 packs, 50 poignées et 70 cartons moyens : on vide les stocks du port. Votre nom commence à circuler dans les salons.\n\nPS — Cinq chaînes convergent vers le pack. Votre usine n’est plus une ligne : c’est un fleuve. Élargissez les affluents avant le débit.',
  intro8:'Le Hangar des Écluses, directeur.\n\nTrois compartiments à peine plus larges qu’un pack luxe, un MICRO-QUAI scellé au mur nord — une seule case pour tout vendre. Le service technique dit que c’était une écluse. Le conseil dit que c’est votre dernier exercice.\n\nOnze packs et 45 000 $, plus 35 intercalaires pour le calage. Après ça : l’Impériale.\n\nPS — Dernier conseil d’ancien : ici, tout se joue au placement. Une case gagnée sur le trajet, c’est une case de chaîne en plus.',
  intro9:'L’Impériale Emballage, directeur.\n\nLa plus grande cartonnerie du pays. Votre nom finira sur les caisses — c’est écrit dans le contrat. Tout ce que vous avez signé vous attend ici, amorti.\n\nLe conseil attend 120 000 $, 28 packs vendus, 220 plaques de carton et 40 grands cartons. Faites honneur au groupe : la LÉGENDE DE L’EMBALLAGE est à ce prix.',
};

const ACHIEVEMENTS=[
  {id:'m1',  name:'Le hangar qui siffle encore', desc:'Terminer Le Hangar des Bords de Route.', cat:'mission',
   check:()=>state.factoryDone[0]},
  {id:'m2',  name:'Du renfort dans le quartier', desc:'Terminer L’Atelier du Vieux Quartier.', cat:'mission',
   check:()=>state.factoryDone[1]},
  {id:'m3',  name:'Entre les poutres',           desc:'Terminer Le Dépôt des Poutres.', cat:'mission',
   check:()=>state.factoryDone[2]},
  {id:'m4',  name:'Le nom sans rire',            desc:'Terminer La Cartonnerie des Canaux.', cat:'mission',
   check:()=>state.factoryDone[3]},
  {id:'m5',  name:'Le slalom du directeur',      desc:'Terminer L’Entrepôt des Pilotis.', cat:'mission',
   check:()=>state.factoryDone[4]},
  {id:'m6',  name:'L’arbre contre le tas',       desc:'Terminer Le Complexe Ondulé-Central.', cat:'mission',
   check:()=>state.factoryDone[5]},
  {id:'m7',  name:'Le caractère des lieux',      desc:'Terminer La Halle aux Cloisons.', cat:'mission',
   check:()=>state.factoryDone[6]},
  {id:'m8',  name:'Le fleuve du port',           desc:'Terminer La Méga-Cartonnerie du Port.', cat:'mission',
   check:()=>state.factoryDone[7]},
  {id:'m9',  name:'Le dernier sas',              desc:'Terminer Le Hangar des Écluses.', cat:'mission',
   check:()=>state.factoryDone[8]},
  {id:'m10', name:'Légende de l’Emballage',      desc:'Terminer L’Impériale Emballage.', cat:'mission',
   check:()=>state.factoryDone[9]},

  /* ── CARRIÈRE ── */
  {id:'first_sale',   name:'Premier franc',           desc:'Vendre un premier item.', cat:'carriere',
   check:()=>Object.keys(state.career.sold).length>0},
  {id:'first_carton', name:'Le carton cartonné',      desc:'Vendre un premier petit carton.', cat:'carriere',
   check:()=>(state.career.sold.petit_carton||0)>=1},
  {id:'all_items',    name:'Le catalogue complet',    desc:'Vendre au moins un item de chaque type.', cat:'carriere',
   check:()=>Object.keys(ITEMS).every(k=>(state.career.sold[k]||0)>=1)},
  {id:'speciales',    name:'Sur-excellent',           desc:'Terminer les 4 affectations spéciales.', cat:'carriere',
   check:()=>[2,4,6,8].every(i=>state.factoryDone[i])},
  {id:'luxe500',      name:'Cène de luxe',            desc:'Vendre 500 packs luxe (carrière).', cat:'carriere',
   check:()=>(state.career.sold.pack_luxe||0)>=500},
  {id:'money_total',  name:'Le poids des caisses',    desc:'Gagner 10 M $ au total (carrière).', cat:'carriere',
   check:()=>state.career.moneyTotal>=10000000},

  /* ── INGÉNIEUR ── */
  {id:'belts100',   name:'Plat de spaghettis assumé', desc:'Poser 100 convoyeurs (cumul carrière).', cat:'ingenieur',
   check:()=>state.career.placedBelts>=100},
  {id:'belts500',   name:'La ville entière en rubans', desc:'Poser 500 convoyeurs (cumul carrière).', cat:'ingenieur',
   check:()=>state.career.placedBelts>=500},
  {id:'splits5',    name:'Le carrefour',              desc:'Posséder 5 répartiteurs en même temps.', cat:'ingenieur',
   check:()=>cnt('repartiteur')>=5},
  {id:'machine50',  name:'L’usine qui dort',          desc:'50 machines en service en même temps.', cat:'ingenieur',
   check:()=>state.entities.filter(e=>e.kind==='machine').length>=50},
  {id:'lvl5',       name:'Cadence industrielle',      desc:'Amener une machine au niveau 5.', cat:'ingenieur',
   check:()=>state.entities.some(e=>(e.lvl||0)>=5&&e.kind==='machine')},
  {id:'tiers',      name:'Le haut de gamme',          desc:'Posséder une ligne continue ET une onduleuse rotative.', cat:'ingenieur',
   check:()=>cnt('machine_papier_3')>=1&&cnt('onduleuse_3')>=1},
  {id:'noblock',    name:'Zéro bouchon',              desc:'10 minutes sans « ! » avec 30 machines en service.', cat:'ingenieur',
   check:()=>state.noBlockT>=600&&state.entities.filter(e=>e.kind==='machine').length>=30},
  {id:'straight50', name:'La ligne droite',           desc:'50 convoyeurs droits d’affilée, sans virage ni répartiteur.', cat:'ingenieur',
   check:()=>state.longestLine>=50},

  {id:'paper1000', name:'Vieux papier fidèle',   desc:'Vendre 1 000 feuilles de papier brut (carrière).', cat:'excentrique',
   check:()=>(state.career.sold.papier||0)>=1000},
  {id:'cash1m',    name:'Riche et patient',      desc:'Avoir 1 M $ en banque d’un coup.', cat:'excentrique',
   check:()=>state.money>=1000000},
  {id:'konami',    name:'???', desc:'Le service technique garde un secret. Vous saurez quand vous l’aurez trouvé.', cat:'excentrique',
   check:()=>state.konamiUsed},
  {id:'hoarder',   name:'Le hamster du groupe',  desc:'200 items en attente dans les tampons, en même temps.', cat:'excentrique',
   check:()=>{
     let n=0;
     for(const e of state.entities) if(e.inBuf) for(const k in e.inBuf) n+=e.inBuf[k]||0;
     return n>=200;
   }},
];


/* ══════════════ 3. ÉTAT & GRILLE ══════════════ */

const DIRS = [ {x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1} ]; 

const ARC=Math.PI/4;                            // 0,7854 case
function pathLenFor(b,entryDir){
  if(b.curve) return ARC;
  if(entryDir!==undefined){
    const dIn=DIRS[entryDir], dOut=DIRS[b.rot];
    if(dIn.x===dOut.x&&dIn.y===dOut.y) return 1;     
    if(dIn.x===-dOut.x&&dIn.y===-dOut.y) return 1;  
    return Math.SQRT1_2;                             
  }
  return 1;
}
function pathLen(b){ return pathLenFor(b,b.item&&b.item.entry); }
const reserved=new Map();

const state = {
  screen:'loading', inRun:false,
  money:0, sci:0,
  gridW:16, gridH:12, extLevel:0,
  entities:[], grid:[],
  counts:{},
  research:{belt:0,prod:0,craft:0,discount:0,trade:0},
  unlocksDone:{}, unlocked:[...BASE_UNLOCKED],
  factoryIdx:0, maxFactoryIdx:0, factoryDone:[false,false,false,false,false,false,false,false,false,false],
  stats:{ sold:{}, produced:{}, moneyTotal:0, sciTotal:0, placed:0, destroyed:0, playTime:0 },
  career:{ moneyTotal:0, sciTotal:0, sold:{}, playTime:0, placedBelts:0 },
  rate:{money:0,sci:0},
  tut:0, tutDone:false, sound:true, time:0,
  volSfx:0.8, volMus:0.5,          
  modal:null,
  letter:null,                     
  lettersRead:[],               
  leaveTime:0,                   
  letterGain:null,           
  inspect:null,                 
  barCat:'logistique',        
  homeScroll:0, homeMax:0, barScroll:0, barMax:0,
  promoNotified:false,
  achievements:{},     
  noBlockT:0,              
  longestLine:0,          
  konamiUsed:false,
};

const build = { type:null, rot:0, expIdx:0, curve:0, destroy:false, hover:{x:-99,y:-99}, dragging:false, lastCell:null, dragPlaced:[], soutSrc:null };
const mouse = { x:-1, y:-1 };
const hots  = [];      
const toasts= [];
const log   = [];    
const fx    = [];    
const tf    = { value:'', focused:false }; 

let canvas, ctx, W=0, H=0;
let TILE=32, S=2, ox=0, oy=0, hudH=46, barH=88, sideW=230;
let gameX=0, gameY=0, gameW=0, gameH=0;      // canvas de jeu exact (grille + mur)
let blockX=0, blockY=0, blockW=0, blockH=0;  // bloc assemblé : HUD + jeu + colonne + barre
let hudX=0, hudY=0, sideX=0, sideY=0, sideH=0, barY=0;
let uid=0, animT=0, toolOrder=[], bootSave=null;
let barTip=null, homeArmed=false;
let sideTip=null;
const iconCache={};

const LONG={machine_papier_2:3, machine_papier_3:4, onduleuse_2:3, onduleuse_3:4};

function fpSize(type,rot){
  if(type==='convoyeur'||type==='ruban_sout') return {w:1,h:1};
  if(isDock(type)){
    return dockSize(type);
  }
  if(type==='repartiteur') return (rot%2===0)?{w:1,h:2}:{w:2,h:1};
  const L=LONG[type];
  if(L) return (rot%2===0)?{w:L,h:2}:{w:2,h:L};
  return {w:2,h:2};
}

function fpWorld(type,rot){
  const f=fpSize(type,rot);
  if(isDock(type)&&rot%2===0) return {w:f.h,h:f.w};
  return f;
}

/* ══ Ruban souterrain : portée max du saut sous terre (en cases) ══
   5 = entrée et sortie espacées de 5 cases, soit 4 cases de vide franchies */
const SOUT_MAX=5;
function isSout(b){ return b&&b.type==='ruban_sout'; }
/* La sortie souterraine autorise-t-elle une arrivée depuis dir ? (comme un ruban) */
function soutExitDir(b){ return b.rot; }
/* distance et alignement entrée→sortie : droit, ≤ SOUT_MAX, même sens de flux */
function soutLinkOK(a,b){
  if(!isSout(a)||!isSout(b)||a===b) return false;
  const d=DIRS[a.rot];
  const dx=b.x-a.x, dy=b.y-a.y;
  /* la sortie doit être DEVANT l'entrée, dans le sens du flux (pas derrière) */
  if(dx*d.x+dy*d.y<=0) return false;
  /* l'axe entrée→sortie doit suivre le flux de l'entrée (pas de virage sous terre) */
  if(Math.abs(dx)>0&&Math.abs(dy)>0) return false;
  const len=Math.abs(dx)+Math.abs(dy);
  if(len<1||len>SOUT_MAX) return false;
  /* la sortie poursuit le flux dans le même sens : son rot = celui de l'entrée */
  return b.rot===a.rot;
}
/* Sortie liée à une entrée souterraine (une seule sortie valide par entrée) */
function soutOf(a){
  for(const e of state.entities)
    if(isSout(e)&&e!==a&&soutLinkOK(a,e)) return e;
  return null;
}
/* Entrée liée à cette tuile (si c'est une SORTIE de tunnel) */
function soutEntranceOf(b){
  for(const a of state.entities)
    if(isSout(a)&&a!==b&&soutOf(a)===b) return a;
  return null;
}
/* Pose guidée en 2 clics : coût total du tunnel (entrée + sortie) ;
   `withEntrance` à faux quand on termine une entrée déjà posée */
function soutCosts(withEntrance){
  return (withEntrance?costOf('ruban_sout'):0)+costOf('ruban_sout',withEntrance?1:0);
}
/* (x,y) est-elle une SORTIE valide pour l'entrée (sx,sy) tournée vers rot ? */
function soutExitOK(sx,sy,rot,x,y){
  const d=DIRS[rot];
  const k=(x-sx)*d.x+(y-sy)*d.y;          /* distance signée DEVANT l'entrée */
  const side=Math.abs((x-sx)*d.y)+Math.abs((y-sy)*d.x);
  return k>=1&&k<=SOUT_MAX&&side===0&&canPlace('ruban_sout',x,y,rot);
}
/* Les deux clics de pose : 1er = l'entrée (ou reprise d'une entrée orpheline),
   2e = la sortie parmi les 4 cases devant. Rien n'est débité avant le 2e clic. */
function soutClick(x,y){
  const src=build.soutSrc;
  if(src){
    const rot=src.ent?src.ent.rot:src.rot;
    if(soutExitOK(src.x,src.y,rot,x,y)){
      const total=soutCosts(!src.ent);
      if(state.money<total){
        SFX.err();
        toast(T('ui.toastFunds'),T('ui.toastTunnelCost',{M:fmt(total)+' $'}));
        return;
      }
      if(!src.ent&&!place('ruban_sout',src.x,src.y,rot,true)){ build.soutSrc=null; return; }
      place('ruban_sout',x,y,rot,false);
      build.soutSrc=null;
      return;
    }
    /* clic ailleurs : on déplace l'entrée en attente, ou on décroche une entrée posée */
    if(src.ent){
      if(cellAt(x,y)===src.ent) build.soutSrc=null; else SFX.err();
      return;
    }
    if(canPlace('ruban_sout',x,y,build.rot)){ build.soutSrc={x,y,rot:build.rot}; return; }
    SFX.err();
    return;
  }
  /* 1er clic : terminer une ENTRÉE ORPHELINE existante, ou démarrer une nouvelle pose */
  const here=cellAt(x,y);
  if(here&&here.kind==='belt'&&isSout(here)&&!soutOf(here)){ build.soutSrc={x:here.x,y:here.y,ent:here}; return; }
  if(canPlace('ruban_sout',x,y,build.rot)){ build.soutSrc={x,y,rot:build.rot}; return; }
  SFX.err();
}


function dockSize(type){ const d=MACHINES[type]; return d&&d.w?{w:d.w,h:d.h}:{w:2,h:2}; }
/* Un type est-il un quai (multi-tailles) ? */
function isDock(type){ return !!MACHINES[type]&&!!MACHINES[type].wall; }
/* Mission à quai imposé : aucun autre quai ne peut être construit. */
function dockLocked(){ return !!FACTORIES[state.factoryIdx].forcedDock; }

function initGrid(){
  state.grid=[];
  for(let y=0;y<state.gridH;y++) state.grid.push(new Array(state.gridW).fill(null));
  for(const e of state.entities){
    const f=fpWorld(e.type,e.rot); 
    for(let dy=0;dy<f.h;dy++) for(let dx=0;dx<f.w;dx++)
      if(e.y+dy<state.gridH && e.x+dx<state.gridW) state.grid[e.y+dy][e.x+dx]=e;
  }
}
function cellAt(x,y){
  if(x<0||y<0||x>=state.gridW||y>=state.gridH) return null;
  return state.grid[y][x];
}

function obstacleAt(x,y){
  if(x<0||y<0||x>=state.gridW||y>=state.gridH) return false;
  const obs=FACTORIES[state.factoryIdx].obstacles;
  if(!obs) return false;
  for(const o of obs) if(x>=o[0]&&x<o[0]+o[2]&&y>=o[1]&&y<o[1]+o[3]) return true;
  return false;
}
function cnt(type){ return state.counts[type]||0; }

function sellMult(){
  const t=clamp(state.research.trade||0, 0, 5);
  return (1 + ECO.promoBonus * state.factoryDone.filter(Boolean).length)
       * (1 + ECO.tradeBonus * t);
}

function beltSpeedOf(b){
  const i=clamp(state.research.belt, 0, ECO.beltSpeed.length-1);
  return ECO.beltSpeed[i];
}
function speedMultOf(m){
  const base = m.type.startsWith('machine_papier') ? ECO.prodSpeed[state.research.prod] : ECO.craftSpeed[state.research.craft];
  return base * (1 + ECO.upBonus*(m.lvl||0));
}
function costOf(type,extra){
  const d=MACHINES[type];
  if(!d) return 1e12;
  return Math.ceil(d.cost * Math.pow(d.growth||ECO.growthM, cnt(type)+(extra||0)) * ECO.costMult[state.research.discount]);
}
/* Coût du prochain niveau d'amélioration d'une entité */
function upCost(e){
  return Math.ceil(MACHINES[e.type].cost * ECO.upBase * Math.pow(ECO.upGrowth, e.lvl||0) * ECO.costMult[state.research.discount]);
}
function canPlace(type,x,y,rot){
  const fp=fpWorld(type,rot);
  for(let dy=0;dy<fp.h;dy++) for(let dx=0;dx<fp.w;dx++){
    const cx=x+dx, cy=y+dy;
    if(cx<0||cy<0||cx>=state.gridW||cy>=state.gridH) return false;
    if(state.grid[cy][cx]) return false;
    if(obstacleAt(cx,cy)) return false;      
  }
  if(isDock(type) && dockRotCandidates(type,x,y).length===0) return false;
  return true;
}
function dockRotCandidates(type,x,y){
  const fm=fpWorld(type,0);
  const fh=fpSize(type,1);
  const list=[];
  if(y===0) list.push(3);
  if(y===state.gridH-fh.h) list.push(1);
  if(x===0) list.push(2);
  if(x===state.gridW-fm.w) list.push(0);
  return list;
}
function dockRotAt(type,x,y,expIdx){
  const c=dockRotCandidates(type,x,y);
  return c.length ? c[(expIdx||0)%c.length] : -1;
}
function expRotCandidates(x,y){ return dockRotCandidates('expedition',x,y); }
function expRotAt(x,y){ return dockRotAt('expedition',x,y,build.expIdx); }
function outCells(m){
  const f=fpSize(m.type,m.rot);
  const d=DIRS[m.rot];
  if(d.x){ const cx=m.x+(d.x>0?f.w:-1); return [{x:cx,y:m.y},{x:cx,y:m.y+f.h-1}]; }
  const cy=m.y+(d.y>0?f.h:-1); return [{x:m.x,y:cy},{x:m.x+f.w-1,y:cy}];
}

/* ══════════════ 3bis. SDK CRAZYGAMES (facultatif) ══════════════
   Le bundle officiel charge sdk.crazygames.com/crazygames-sdk-v3.js en tête
   de index.html. Hors CrazyGames (tests locaux, autre hébergement), le SDK
   est absent ou inactif : chaque appel est protégé, la sauvegarde retombe
   sur localStorage, et le jeu reste 100 % jouable sans lui. */

const CG = {
  sdk:null, ready:false, dataReady:false, mutedBySDK:false,
  useData(){ return (this.dataReady&&this.sdk&&this.sdk.data)||null; },
  muted(){ return this.mutedBySDK; },   /* priorité sur le réglage interne (règle CG) */
  ev(name,arg){
    if(!this.ready||!this.sdk||!this.sdk.game) return;
    const fn=this.sdk.game[name];
    if(typeof fn!=='function') return;
    try{ (arg===undefined)?fn.call(this.sdk.game):fn.call(this.sdk.game,arg); }catch(e){}
  },
  init(){
    const SDK=window.CrazyGames&&window.CrazyGames.SDK;
    if(!SDK) return Promise.resolve(false);
    this.sdk=SDK;
    const ok=()=>{
      this.ready=true;
      this.dataReady=!!(SDK.data&&typeof SDK.data.setItem==='function');
      try{ const s=SDK.game&&SDK.game.settings; this.mutedBySDK=!!(s&&s.muteAudio); }catch(e){}
      if(SDK.game&&typeof SDK.game.addSettingsChangeListener==='function'){
        try{ SDK.game.addSettingsChangeListener(ns=>{
          CG.mutedBySDK=!!(ns&&ns.muteAudio);
          if(CG.mutedBySDK&&typeof stopMusic==='function') stopMusic();  /* coupe aussi la musique en cours */
        }); }catch(e){}
      }
      return true;
    };
    return (typeof SDK.init==='function')?SDK.init().then(ok,ok):Promise.resolve(ok());
  },
};
let cgWasPlaying=false;
function cgProgressPct(){
  try{ return Math.round(100*state.factoryDone.filter(Boolean).length/FACTORIES.length); }
  catch(e){ return 0; }
}

/* Stockage unifié : module data du SDK CrazyGames quand il est actif (la
   sauvegarde suit alors le compte du joueur), localStorage toujours en
   miroir. Même API synchrone que localStorage. */
function stGet(k){
  const d=CG.useData();
  if(d){ try{ const v=d.getItem(k); if(v!==undefined&&v!==null) return v; }catch(e){} }
  try{ return localStorage.getItem(k); }catch(e){ return null; }
}
function stSet(k,v){
  const d=CG.useData();
  if(d){ try{ d.setItem(k,v); }catch(e){} }
  try{ localStorage.setItem(k,v); }catch(e){}
}
function stDel(k){
  const d=CG.useData();
  if(d){ try{ d.removeItem(k); }catch(e){} }
  try{ localStorage.removeItem(k); }catch(e){}
}

/* Mobile : relancer l'AudioContext suspendu dans un geste tactile
   (exigence CrazyGames iOS/Android, remise en avant-plan). */
document.addEventListener('touchend',()=>{ if(actx&&actx.state==='suspended'){ try{ actx.resume(); }catch(e){} } },{passive:true});

/* ══════════════ 4. AUDIO — bips discrets (Web Audio API) ══════════════ */

let actx=null;
function audio(){
  if(!state.sound||CG.muted()) return null;
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(actx&&actx.state==='suspended') actx.resume();
  return actx;
}
function beep(f,dur,type,vol,slide,isUI){
  const a=audio(); if(!a) return;
  if(!isUI&&((state.letter!==null&&state.letter!==undefined)||state.modal)) return;
  const t=a.currentTime, o=a.createOscillator(), g=a.createGain();
  o.type=type||'square'; o.frequency.setValueAtTime(f,t);
  if(slide) o.frequency.linearRampToValueAtTime(f+slide,t+dur);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime((vol||0.04)*state.volSfx,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t+dur+0.02);
}
function uiSnd(kind){
  const a=audio(); if(!a) return;
  const N={
    open:    [392,.07,'triangle'],  
    close:   [311,.08,'triangle'], 
    confirm: [523,.09,'triangle'],   
    back:    [233,.09,'triangle'],  
    tab:     [349,.05,'square'],    
    danger:  [196,.12,'sawtooth'], 
    option:  [440,.06,'square'],    
    game:    [262,.12,'triangle'], 
  }[kind]||[330,.06,'square'];
  beep(N[0],N[1],N[2],.03,N[0]*.02,true);
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

/* ══════ MUSIQUE  */

let musNodes=null, musTimer=null, musFactory=-1, musSong=null;
const NF={C2:65.41,D2:73.42,Eb2:77.78,E2:82.41,F2:87.31,G2:98.00,Ab2:103.83,A2:110.00,Bb2:116.54,B2:123.47,
  C3:130.81,D3:146.83,Eb3:155.56,E3:164.81,F3:174.61,G3:196.00,Ab3:207.65,A3:220.00,Bb3:233.08,B3:246.94,
  C4:261.63,D4:293.66,Eb4:311.13,E4:329.63,F4:349.23,G4:392.00,Ab4:415.30,A4:440.00,Bb4:466.16,B4:493.88,
  C5:523.25,D5:587.33,Eb5:622.25,F5:698.46,G5:783.99,A5:880.00,Bb5:932.33};
const THEMES={
  marimba:{
    bpm:78,
    accords:[[NF.C3,NF.E3,NF.G3],[NF.C3,NF.E3,NF.G3],[NF.F2,NF.A2,NF.C3],[NF.G2,NF.B2,NF.D3],
             [NF.C3,NF.E3,NF.G3],[NF.A2,NF.C3,NF.E3],[NF.F2,NF.A2,NF.C3],[NF.G2,NF.B2,NF.D3]],
    basse:[NF.C2,NF.C2,NF.F2,NF.G2, NF.C2,NF.A1,NF.F2,NF.G2],
    ostinato:[0,1,2,1,0,1,2,1],
    melodie:[NF.E4,NF.G4,NF.C5,NF.G4, NF.A4,NF.G4,NF.E4,NF.D4,
             NF.E4,NF.G4,NF.C5,NF.E5, NF.D5,NF.C5,NF.G4,NF.A4],
    special:false,
  },
  conseil:{
    bpm:88,
    ticHaut:NF.C4,
    ticBas:NF.C3,
    bourdons:[NF.C2,NF.C2,NF.C2,NF.C2, NF.D2,NF.D2,NF.C2,NF.C2],
    pontMarimba:[NF.E4,NF.G4,NF.C5,NF.G4],
    special:true,
  },
};
function songForFactory(i){ return (FACTORIES[i].forcedDock)?THEMES.conseil:THEMES.marimba; }

function startPiano(factoryIdx){
  const a=audio(); if(!a||musNodes) return;
  const song=songForFactory(factoryIdx);
  musFactory=factoryIdx;
  const gain=a.createGain(); gain.gain.value=state.volMus*0.9;
  const master=a.createGain(); master.gain.value=1;
  gain.connect(master); master.connect(a.destination);
  const nb=a.createBuffer(1,a.sampleRate,a.sampleRate);
  const ch=nb.getChannelData(0);
  for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;
  musNodes={gain,master,noiseBuf:nb,song};

  const BPM=song.bpm, BEAT=60/BPM, EIGHT=BEAT/2;
  const LOOP=16*4*BEAT;
  const lame=(f,t,vol,etouffee)=>{
    if(!isFinite(f)) return;
    const dur=etouffee?0.25:1.4;
    const o=a.createOscillator(), o2=a.createOscillator(), g=a.createGain();
    o.type='sine'; o.frequency.value=f;
    o2.type='sine'; o2.frequency.value=f*4;
    const g2=a.createGain(); g2.gain.value=.12;
    o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.006);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(gain);
    o.start(t); o.stop(t+dur+0.05);
    o2.start(t); o2.stop(t+dur*0.3+0.05);
  };
  const lameGrave=(f,t,vol)=>{
    if(!isFinite(f)) return;
    const o=a.createOscillator(), g=a.createGain();
    o.type='sine'; o.frequency.value=f;
    const o2=a.createOscillator(), g2=a.createGain();
    o2.type='sine'; o2.frequency.value=f*2; g2.gain.value=.2;
    o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+2.2);
    o.connect(g); g.connect(gain);
    o.start(t); o.stop(t+2.3);
    o2.start(t); o2.stop(t+1.2);
  };
  const rim=(t)=>{
    const n=a.createBufferSource(); n.buffer=nb;
    const f=a.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2500;
    const g=a.createGain();
    g.gain.setValueAtTime(.015,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.015);
    n.connect(f); f.connect(g); g.connect(gain);
    n.start(t); n.stop(t+0.02);
  };

  const schedule=(t0)=>{
    if(song.special){
      const claves=(t,haut)=>{
        if(haut) lame(song.ticHaut,t,.05,true);
        else     lame(song.ticBas,t,.06,true);
      };
      for(let bar=0;bar<8;bar++){
        const tb=t0+bar*4*BEAT;
        const silence=(bar===7);          
        if(!silence){
          for(let b=0;b<4;b++) claves(tb+b*BEAT,b%2===0);
          lameGrave(song.bourdons[bar],tb,.08);
        }else{
          claves(tb,true);               
        }
        if(bar===3||bar===4){
          const idx=(bar-3)*2;
          lame(song.pontMarimba[idx],tb+BEAT,.07,false);
          lame(song.pontMarimba[idx+1],tb+3*BEAT,.07,false);
        }
      }
      return t0+8*4*BEAT;
    }
    for(let bar=0;bar<16;bar++){
      const tb=t0+bar*4*BEAT;
      const chord=song.accords[bar%8];
      lameGrave(song.basse[bar%8],tb,.09);
      lameGrave(song.basse[bar%8],tb+2*BEAT,.06);
      for(let e=0;e<8;e++){
        lame(chord[song.ostinato[e]],tb+e*EIGHT,.045);
      }
      if(bar%2===0){ rim(tb+BEAT); rim(tb+3*BEAT); }
      if(bar>=8){
        const n1=song.melodie[(bar-8)*2];
        const n2=song.melodie[(bar-8)*2+1];
        lame(n1,tb,.07,false);
        if(n2) lame(n2,tb+2*BEAT,.05,true);
      }
    }
    return t0+LOOP;
  };

  let next=a.currentTime+0.1;
  musTimer=setInterval(()=>{
    if(!actx) return;
    while(next<a.currentTime+2) next=schedule(next);
  },500);
}

Object.assign(NF,{Db2:69.30,Db1:34.65,F1:43.65,Ab1:51.91,Bb1:58.27});

function stopMusic(){
  if(musTimer){ clearInterval(musTimer); musTimer=null; }
  if(musNodes){
    try{ musNodes.master.gain.setTargetAtTime(0,actx.currentTime,0.08); }catch(e){}
    const n=musNodes; musNodes=null;
    setTimeout(()=>{ try{ n.master.disconnect(); n.gain.disconnect(); n.delay.disconnect(); n.dGain.disconnect(); }catch(e){} },400);
  }
}
function setVolMus(v){
  state.volMus=clamp(v,0,1);
  if(musNodes&&actx) musNodes.gain.gain.setTargetAtTime(state.volMus*0.9,actx.currentTime,0.05);
}

/* ══════════════ 5. SIMULATION — tick fixe 10 Hz ══════════════ */

let winMoney=0, winSci=0, rateT=0, saveT=0;

function tick(){
  state.time+=DT; state.stats.playTime+=DT; state.career.playTime+=DT;
  reserved.clear();                              // réservations valables un tick
  for(const e of state.entities) if(e.soldThisTick) e.soldThisTick=null;

  for(const e of state.entities){
    if(e.kind!=='belt'||!e.item||e.item.p<1) continue;
    let cur=e, hops=0;
    while(cur.item&&cur.item.p>=1&&hops<8){
      const r=transferBeltItem(cur);
      if(!r) break;
      cur=r; hops++;
    }
  }
  for(const e of state.entities){
    if(e.kind!=='belt'||!e.item||e.item.p>=1) continue;
    const bs=beltSpeedOf(e), L=pathLen(e);
    let np=e.item.p+bs/L;
    if(np>1){
      const pd=e.curve?beltExitDir(e):e.rot;
      const d=DIRS[pd];
      /* tunnel : la destination est la SORTIE liée, pas la case devant */
      let c=cellAt(e.x+d.x,e.y+d.y);
      if(isSout(e)&&!e.curve){
        const out=soutOf(e);
        if(out) c=out;
      }
      if(c&&c.kind==='belt'&&!c.item&&beltPushOK(c,pd)){
        reserved.set(c.x+','+c.y,e);
        e.item.p=np; e.blockedT=0;
        continue;
      }
      np=1;
    }
    e.item.p=np;
    if(e.item.p<1) e.blockedT=0;
  }
  for(const e of state.entities){
    if(e.kind!=='machine') continue;
    tickMachine(e);
    if(e.flash>0) e.flash-=DT;
    if(e.type==='repartiteur'&&e.vItem){
      const bs=beltSpeedOf(e);
      const v=e.vItem;
      v.p+=bs*1.2;
      if(v.p>=1){
        if(v.phase==='in'){ v.p=1; v.phase='wait'; }
        else if(v.phase==='shift'){ v.p=0; v.phase='exit'; }
        else if(v.phase==='exit'){ e.vItem=null; }
      }
    }
  }
  const sg=state.entities.length*ECO.sciPerEntity*DT;
  state.sci+=sg; state.stats.sciTotal+=sg; state.career.sciTotal+=sg; winSci+=sg;

  rateT+=DT;
  if(rateT>=1){
    state.rate.money=state.rate.money*.55+winMoney*.45;
    state.rate.sci  =state.rate.sci  *.55+winSci  *.45;
    winMoney=0; winSci=0; rateT=0;
    checkGoals();
    checkAchievements();
  }
  saveT+=DT;
  if(saveT>=30){ saveT=0; saveGame(); }
  const hasBlock=state.entities.some(e=>e.blockedT>1.5);
  if(hasBlock||state.entities.filter(e=>e.kind==='machine').length<30) state.noBlockT=0;
  else state.noBlockT+=DT;
  tutCheck();
}


function tickMachine(m){
  if(isDock(m.type)) return;                    
  if(m.type==='repartiteur'){ tickRepartiteur(m); return; }
  const def=MACHINES[m.type];
  if(m.outItem){                          
    if(tryEmit(m)) m.outItem=null;
    else { m.blockedT+=DT; return; }
  }
  if(!m.active){
    if(def.in){                           
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

function emitOne(m,item){
  const cells=outCells(m);
  if(m.type==='repartiteur'){
    /* répartiteur : cellules [A,B] — on respecte le filtre de chaque sortie
       puis la priorité ; l'item ne part QUE vers une sortie filtrée pour lui */
    const cfg=repCfg(m);
    const order=repOutOrder(m);
    for(const side of order){
      const c=cells[side>0?0:1];
      if(!c) continue;
      if(!repOutAccepts(m,side,item)) continue;
      const t=cellAt(c.x,c.y);
      if(!t) continue;
      let ok=false;
      if(t.kind==='belt'){
        if(t.item||reserved.has(t.x+','+t.y)) continue;
        const d=DIRS[t.rot];
        if(cellAt(t.x+d.x,t.y+d.y)===m) continue;
        if(!beltPushOK(t,m.rot)) continue;
        t.item={ t:item, p:0, entry:m.rot };
        ok=true;
      }else{
        ok=tryMachineAccept(t,item,DIRS[m.rot],c);
      }
      if(ok){
        if(cfg.pri==='auto') m.emitIdx=((m.emitIdx||0)+1)%2;
        m.lastServed=c;
        return true;
      }
    }
    return false;
  }
  const start=(m.emitIdx||0)%cells.length;
  for(let k=0;k<cells.length;k++){
    const c=cells[(start+k)%cells.length];
    const t=cellAt(c.x,c.y);
    if(!t) continue;
    if(t.kind==='belt'){
      if(t.item) continue;
      if(reserved.has(t.x+','+t.y)) continue;
      const d=DIRS[t.rot];
      if(cellAt(t.x+d.x,t.y+d.y)===m) continue;
      if(!beltPushOK(t,m.rot)) continue;
      t.item={ t:item, p:0, entry:m.rot };
      m.emitIdx=(start+k+1)%cells.length;
      m.lastServed=c;                 /* case réellement servie */
      return true;
    }
    if(tryMachineAccept(t,item,DIRS[m.rot],c)){
      m.emitIdx=(start+k+1)%cells.length;
      m.lastServed=c;
      return true;
    }
  }
  return false;
}
function tryEmit(m){
  if(emitOne(m,m.outItem)){ m.outItem=null; return true; }
  return false;
}
function repCap(e){ return 6; }

/* ══ Répartiteur configurable ══
   config par entité : {
     in :  'auto' | 'left' | 'right'   — priorité d'entrée (dans le repère du sprite)
     outA: { any:true } | { items:[...] }  — filtre de la sortie A (vide = tout)
     outB: idem
     pri : 'auto' | 'A' | 'B'          — répartition entre sorties
   }
   Les lanes : +1 = sortie A (haut dans le repère du sprite), -1 = sortie B. */
function repCfg(m){
  if(!m.rep) m.rep={in:'auto', pri:'auto', outA:null, outB:null};
  return m.rep;
}
/* la sortie `side` (+1=A, -1=B) accepte-t-elle l'item t ? (null/[] = tout) */
function repOutAccepts(m,side,t){
  const cfg=repCfg(m);
  const f=side>0?cfg.outA:cfg.outB;
  if(!f||!f.items||!f.items.length) return true;
  return f.items.includes(t);
}
/* ordre de tentatives des sorties selon la priorité : FIFO simple quand auto */
function repOutOrder(m){
  const cfg=repCfg(m);
  if(cfg.pri==='A') return [1,-1];
  if(cfg.pri==='B') return [-1,1];
  const flip=(m.emitIdx||0)%2;
  return flip?[1,-1]:[-1,1];
}
function tickRepartiteur(m){
  let emitted=0;
  const maxE=2;
  if(m.vItem&&(m.vItem.phase==='shift'||m.vItem.phase==='exit')){ m.blockedT=0; return; }
  while(emitted<maxE&&m.queue.length){
    const lane=(m.qlanes&&m.qlanes.length)?m.qlanes[0]:((m.vItem&&m.vItem.lane)||-1);
    if(emitOne(m,m.queue[0])){
      m.queue.shift();
      if(m.qlanes&&m.qlanes.length) m.qlanes.shift();
      emitted++;
      if(m.vItem&&m.vItem.phase!=='shift'&&m.vItem.phase!=='exit'){
        const served=m.lastServed; 
        const fd=DIRS[m.rot];
        const vy={x:-fd.y,y:fd.x};
        const perpOut=(served.x-m.x)*vy.x+(served.y-m.y)*vy.y;
        const toLane=(perpOut>0)?1:-1;
        if(m.vItem.lane===toLane){
          m.vItem.phase='exit';
          m.vItem.p=0;
          m.vItem.toLane=toLane;
        }else{
          m.vItem.phase='shift';
          m.vItem.p=0;
          m.vItem.toLane=toLane;
        }
      }
    }
    else break;
  }
  if(emitted>0||m.queue.length<repCap(m)) m.blockedT=0;
  else m.blockedT+=DT;
}

function transferBeltItem(b){
  const pushDir=b.curve?beltExitDir(b):b.rot;
  const d=DIRS[pushDir];
  /* ruban souterrain ENTRÉE : si un tunnel part d'ici, l'item passe sous terre
     et réapparaît sur la sortie liée — AVANT tout test sur la case devant,
     qui peut être vide (c'est justement là que le tunnel saute). Une SORTIE
     (pas de tunnel vers l'avant) se comporte comme un ruban ordinaire. */
  if(isSout(b)&&!b.curve){
    const out=soutOf(b);
    if(out){
      if(out.item||reserved.has(out.x+','+out.y)){ b.item.p=1; b.blockedT+=DT; return null; }
      const w=Math.max(0,b.item.p-1)*pathLen(b);
      out.item={t:b.item.t,p:w/pathLenFor(out,out.rot),entry:(out.rot+2)%4};
      b.item=null; b.blockedT=0; reserved.set(out.x+','+out.y,b);
      return out;
    }
    /* pas de tunnel : ce bout est une sortie (ou une entrée orpheline) →
       il pousse devant lui comme un ruban normal */
  }
  const c=cellAt(b.x+d.x,b.y+d.y);
  if(!c){ b.item.p=1; b.blockedT+=DT; return null; }
  if(c.kind==='belt'){
    if(!c.item&&beltPushOK(c,pushDir)){
      const w=Math.max(0,b.item.p-1)*pathLen(b);    
      c.item={t:b.item.t,p:w/pathLenFor(c,pushDir),entry:pushDir};
      b.item=null; b.blockedT=0;
      return c;
    }
    b.item.p=1;           
    b.blockedT+=DT;
    return null;
  }
  if(tryMachineAccept(c,b.item.t,d,{x:b.x,y:b.y})){ b.item=null; b.blockedT=0; return null; }
  b.item.p=1; b.blockedT+=DT;
  return null;
}

function tryMachineAccept(m,t,dir,src){
  if(isDock(m.type)){
    if(src){
      const k=src.x+','+src.y;
      if(m.soldThisTick&&m.soldThisTick[k]) return false;
      sellItem(t,m);
      if(!m.soldThisTick) m.soldThisTick={};
      m.soldThisTick[k]=true;
      return true;
    }
    sellItem(t,m); return true;
  }
  if(m.type==='benne'){
    /* la benne avale tout, par ses 4 faces, peu importe la direction */
    if(src){
      const k=src.x+','+src.y;
      if(m.soldThisTick&&m.soldThisTick[k]) return false;
      sellItem(t,m);
      if(!m.soldThisTick) m.soldThisTick={};
      m.soldThisTick[k]=true;
      return true;
    }
    sellItem(t,m); return true;
  }
  if(m.type==='repartiteur'){
    if(dir){
      const out=DIRS[m.rot];
      if(dir.x!==out.x||dir.y!==out.y) return false;
    }
    if(m.queue.length>=repCap(m)) return false;
    if(src&&dir){
      const f=DIRS[m.rot];
      const vy={x:-f.y,y:f.x};
      const perp=(src.x-m.x)*vy.x+(src.y-m.y)*vy.y;
      const side=(perp>0)?1:-1;
      m.knownSides=m.knownSides||{};
      m.knownSides[side]=true;
      /* priorité d'entrée configurée : l'entrée favorite passe toujours ;
         l'autre n'entre que si le tampon est à moitié vide (débordement).
         sans priorité : alternance stricte d'origine */
      const cfg=repCfg(m);
      const prioSide=cfg.in==='left'?-1:(cfg.in==='right'?1:0);
      if(prioSide){
        if(side!==prioSide&&m.queue.length>=Math.floor(repCap(m)/2)) return false;
      }else{
        m.turnSide=(m.turnSide===undefined)?side:m.turnSide;
        if(m.knownSides[-side]&&m.turnSide!==side) return false;
        m.turnSide=-side;
      }
      m.queue.push(t);
      m.qlanes=m.qlanes||[];
      m.qlanes.push(side);
      if(!m.vItem) m.vItem={t,phase:'in',p:0,lane:side,toLane:side};
      m.flash=0.35;
      return true;
    }
    m.queue.push(t);
    m.qlanes=m.qlanes||[];
    m.qlanes.push(-1);
    if(!m.vItem) m.vItem={t,phase:'in',p:0,lane:-1,toLane:-1};
    m.flash=0.35;
    return true;
  }
  if(dir){
    const out=DIRS[m.rot];
    if(dir.x===-out.x && dir.y===-out.y) return false;
  }
  const need=MACHINES[m.type].in;
  if(!need||!need[t]) return false;
  if((m.inBuf[t]||0)>=need[t]*2+1) return false; 
  m.inBuf[t]=(m.inBuf[t]||0)+1;
  m.flash=0.35;
  return true;
}

function sellItem(t,m){
  /* benne à déchets : rejet au quart de la valeur, sans bonus commercial,
     sans science et SANS compter dans les ventes des objectifs */
  if(m&&m.type==='benne'){
    const v=Math.round(ITEMS[t].value*0.25*10)/10;
    state.money+=v; state.stats.moneyTotal+=v; state.career.moneyTotal+=v; winMoney+=v;
    const f=fpWorld(m.type,m.rot);
    addFx(ox+(m.x+f.w/2)*TILE, oy+(m.y+f.h/2)*TILE-12, '+'+fmt(v)+' $');
    SFX.sell();
    return;
  }
  const v=Math.round(ITEMS[t].value*sellMult()*10)/10;
  state.money+=v; state.stats.moneyTotal+=v; state.career.moneyTotal+=v; winMoney+=v;
  state.stats.sold[t]=(state.stats.sold[t]||0)+1;
  state.career.sold[t]=(state.career.sold[t]||0)+1;
  const sc=ITEMS[t].sci;
  if(sc){ state.sci+=sc; state.stats.sciTotal+=sc; state.career.sciTotal+=sc; winSci+=sc; }
  const f=fpWorld(m.type,m.rot);
  addFx(ox+(m.x+f.w/2)*TILE, oy+(m.y+f.h/2)*TILE-12, '+'+fmt(v)+' $');
  SFX.sell();
  if(state.stats.sold[t]===1 && ITEMS[t].value>=15) toast(T('ui.toastFirstSale')+ITEMS[t].name, fmt(v)+T('ui.toastFirstSaleUnit'), true);
}


/* ══════════════ 6. PLACEMENT, DÉMOLITION, AMÉLIORATION ══════════════ */

function place(type,x,y,rotIn,quiet,curve){
  if(isDock(type)&&dockLocked()){
    if(!quiet) SFX.err();
    return false;
  }
  const rot = isDock(type) ? dockRotAt(type,x,y,build.expIdx) : rotIn;
  if(!canPlace(type,x,y,rot)){ if(!quiet) SFX.err(); return false; }
  const cost=costOf(type);
  if(state.money<cost){ if(!quiet) SFX.err(); return false; }
  state.money-=cost;
  const fp=fpWorld(type,rot);
  const e={ id:++uid, kind:(type==='convoyeur'||type==='ruban_sout')?'belt':'machine', type, x, y, rot, lvl:0, blockedT:0, flash:0 };
  if(e.kind==='belt'){ e.item=null; e.curve=curve||0; }
  else{
    e.inBuf={}; e.active=false; e.timer=0; e.outItem=null;
    if(type==='repartiteur'){ e.queue=[]; e.visual=[]; e.rep=null; }
    const need=MACHINES[type].in;
    if(need) for(const k in need) e.inBuf[k]=0;
  }
  state.entities.push(e);
  for(let dy=0;dy<fp.h;dy++) for(let dx=0;dx<fp.w;dx++) state.grid[y+dy][x+dx]=e;
  state.counts[type]=cnt(type)+1;
  state.stats.placed++;
  if(e.kind==='belt') state.career.placedBelts=(state.career.placedBelts||0)+1;
  if(e.kind==='belt'&&!e.curve){
    let len=1, cx=e.x, cy=e.y;
    const back=DIRS[(e.rot+2)%4];
    for(;;){
      const p=cellAt(cx+back.x,cy+back.y);
      if(!p||p.kind!=='belt'||p.curve||p.rot!==e.rot) break;
      len++; cx+=back.x; cy+=back.y;
    }
    state.longestLine=Math.max(state.longestLine,len);
  }

  SFX.place();
  return true;
}

function demolishAt(x,y){
  const e=cellAt(x,y); if(!e) return;
  if(e.locked){ SFX.err(); return; }            
  const refund=Math.floor(costOf(e.type)*ECO.refund);  
  state.money+=refund;
  const f=fpWorld(e.type,e.rot);
  for(let dy=0;dy<f.h;dy++) for(let dx=0;dx<f.w;dx++) state.grid[e.y+dy][e.x+dx]=null;
  state.entities.splice(state.entities.indexOf(e),1);
  state.counts[e.type]--;
  state.stats.destroyed++;
  addFx(ox+(e.x+f.w/2)*TILE, oy+(e.y+f.h/2)*TILE-10, '+'+refund+' $');
  if(state.inspect===e) state.inspect=null;
  SFX.del();
}

function upgradeEntity(e){
  if(isDock(e.type)||e.type==='repartiteur') return;
  if(e.kind==='belt') return;
  if((e.lvl||0)>=MAXLVL) return;
  const c=upCost(e);
  if(state.money<c){ SFX.err(); return; }
  state.money-=c;
  e.lvl=(e.lvl||0)+1;
  SFX.up();
  toast(MACHINES[e.type].name+' '+T('ui.toastLevel')+e.lvl, e.type==='repartiteur'?T('ui.toastUpBodyRep'):T('ui.toastUpBody'),true);
}

function rotateEntity(e){
  if(isDock(e.type)) return;                    
  const nrot=(e.rot+1)%4;
  const old=fpSize(e.type,e.rot), nf=fpSize(e.type,nrot);
  if(old.w!==nf.w||old.h!==nf.h){
    for(let dy=0;dy<nf.h;dy++) for(let dx=0;dx<nf.w;dx++){
      const nx=e.x+dx, ny=e.y+dy;
      if(nx<0||ny<0||nx>=state.gridW||ny>=state.gridH){ SFX.err(); return; }
      const c=state.grid[ny][nx];
      if(c&&c!==e){ SFX.err(); return; }   
    }
    for(let dy=0;dy<old.h;dy++) for(let dx=0;dx<old.w;dx++) state.grid[e.y+dy][e.x+dx]=null;
    for(let dy=0;dy<nf.h;dy++) for(let dx=0;dx<nf.w;dx++) state.grid[e.y+dy][e.x+dx]=e;
  }
  e.rot=nrot;
  if(e.kind==='belt'&&e.item) delete e.item.entry;
  SFX.place();
}
function rotateAction(){
  if(build.soutSrc){
    if(build.soutSrc.ent) rotateEntity(build.soutSrc.ent);
    else { build.rot=(build.rot+1)%4; build.soutSrc.rot=build.rot; }
    return;
  }
  if(state.inspect&&!build.type&&!isDock(state.inspect.type)) rotateEntity(state.inspect);
  else if(build.type&&isDock(build.type)) build.expIdx++;
  else build.rot=(build.rot+1)%4;
}

function gridPos(mx,my){
  if(mx<ox||my<oy||mx>=ox+state.gridW*TILE||my>=oy+state.gridH*TILE) return {x:-99,y:-99};
  return { x:Math.floor((mx-ox)/TILE), y:Math.floor((my-oy)/TILE) };
}
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
  build.soutSrc=null;
  if(build.type){ build.destroy=false; state.inspect=null; }
}
function toggleDestroy(){ build.destroy=!build.destroy; if(build.destroy){ build.type=null; build.soutSrc=null; state.inspect=null; } }
function rebuildToolOrder(){
  const lockedDock=dockLocked();
  let types=(CATS.find(c=>c[0]===state.barCat)||CATS[0])[1]
    .filter(t=>MACHINES[t]&&state.unlocked.includes(t)&&!(lockedDock&&isDock(t)));
  if(!types.length){                    // onglet vide (rien de débloqué) : repli
    for(const [cat,ts] of CATS){
      const a=ts.filter(t=>MACHINES[t]&&state.unlocked.includes(t)&&!(lockedDock&&isDock(t)));
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

const KONAMI=['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright'];
let konamiIdx=0;
function konamiKey(k){
  if(state.screen!=='home'||state.modal){ konamiIdx=0; return; }
  if(k===KONAMI[konamiIdx]){
    konamiIdx++;
    if(konamiIdx>=KONAMI.length){
      konamiIdx=0;
      state.maxFactoryIdx=FACTORIES.length-1; 
      state.konamiUsed=true;
      state.tutDone=true;                        
      SFX.konami();
      toast(T('ui.toastKonami'),T('ui.toastKonamiBody'),true);
      saveGame();                              
    }
  }else{
    konamiIdx=(k===KONAMI[0])?1:0;            
  }
}

function bindEvents(){
  let lastTouch=null, touchMoved=false, touchStart=null;
  canvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(e.touches.length===1){
      const t=e.touches[0];
      lastTouch={x:t.clientX,y:t.clientY};
      touchStart={x:t.clientX,y:t.clientY};
      touchMoved=false;
      canvas.dispatchEvent(new MouseEvent('mousedown',{
        button:0,clientX:t.clientX,clientY:t.clientY,bubbles:true
      }));
    }
  },{passive:false});
  canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&lastTouch){
      const t=e.touches[0];
      if(Math.hypot(t.clientX-touchStart.x,t.clientY-touchStart.y)>8) touchMoved=true;
      canvas.dispatchEvent(new MouseEvent('mousemove',{
        clientX:t.clientX,clientY:t.clientY,bubbles:true
      }));
      lastTouch={x:t.clientX,y:t.clientY};
    }
  },{passive:false});
  canvas.addEventListener('touchend',e=>{
    e.preventDefault();
    if(lastTouch){
      canvas.dispatchEvent(new MouseEvent('mouseup',{
        clientX:lastTouch.x,clientY:lastTouch.y,bubbles:true
      }));
      if(!touchMoved){
        mouse.x=-1; mouse.y=-1;
        build.hover={x:-99,y:-99};
      }
      lastTouch=null;
    }
  },{passive:false});
  canvas.addEventListener('touchcancel',()=>{ lastTouch=null; });
  canvas.addEventListener('mousedown',e=>{
    if(e.button!==0) return;
    audio();                                    
    tf.focused=false;
    if(sliderDrag) sliderDrag=null;          
    const mx=e.clientX, my=e.clientY;
    for(let i=hots.length-1;i>=0;i--){         
      const h=hots[i];
      if(mx>=h.x&&mx<h.x+h.w&&my>=h.y&&my<h.y+h.h){ h.fn(); return; }
    }
    if(state.modal) return;
    if(state.letter!==null&&state.letter!==undefined) return;
    if(state.screen==='game'){
      const c=gridPos(mx,my);
      if(c.x>=0){
        if(build.destroy){ demolishAt(c.x,c.y); return; }
        if(build.type){
          if(build.type==='ruban_sout'){ soutClick(c.x,c.y); return; }
          const cv=build.type==='convoyeur'?(build.curve||0):0;
          if(place(build.type,c.x,c.y,build.rot,false,cv)){
            if(cv===0){
              build.dragging=true; build.lastCell=c;
              build.dragPlaced.length=0;
              if(build.type==='convoyeur') build.dragPlaced.push(cellAt(c.x,c.y));
            }
          }
          return;
        }
        const ent=cellAt(c.x,c.y);
        if(ent){ state.inspect=ent; return; }
      }
      if(state.inspect&&mx<gameX+gameW&&my>=gameY&&my<gameY+gameH) state.inspect=null;
    }
  });

  canvas.addEventListener('mousemove',e=>{
    mouse.x=e.clientX; mouse.y=e.clientY;
    if(sliderDrag) updateSliderFromMouse(sliderDrag);
    updateCursor();
    if(state.screen!=='game') return;
    build.hover=gridPos(mouse.x,mouse.y);
    if(build.dragging&&build.type==='convoyeur'){
      let l=build.lastCell;
      const c=build.hover;
      if(l&&c.x>=0){
        for(const step of stepCells(l,c)){
          const dx=step.x-l.x, dy=step.y-l.y;
          const nd=dx===1?0 : dx===-1?2 : dy===1?1 : 3;
          if(nd!==build.rot){
            const turn=(nd-build.rot+4)%4;
            if(turn===1||turn===3){
              const here=cellAt(l.x,l.y);
              const cv=turn===1?1:2;
              if(here&&here.kind==='belt'&&here.curve===0&&build.dragPlaced.includes(here)){
                here.curve=cv;
                if(here.item) here.item.entry=build.rot;
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
  });

  window.addEventListener('mouseup',()=>{ build.dragging=false; build.dragPlaced.length=0; sliderDrag=null; });
  canvas.addEventListener('mouseleave',()=>{ build.hover={x:-99,y:-99}; mouse.x=-1; });

  canvas.addEventListener('contextmenu',e=>{
    e.preventDefault();
    build.type=null; build.destroy=false; build.dragging=false; build.soutSrc=null;
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
    konamiKey(k);
    if(k==='r') rotateAction();
    else if(k==='x') toggleDestroy();
    else if(k==='f') toggleFullscreen();
    else if(k==='t'&&build.type==='convoyeur') build.curve=((build.curve||0)+1)%3;
    else if(k==='u') toggleModal('research');
    else if(k==='c') toggleModal('recipes');
    else if(k==='m') toggleModal('menu');
    else if(k==='i') toggleModal('stats');
    else if(k==='escape'){
      if(state.modal) closeModal();
      else if(state.inspect) state.inspect=null;
      else if(state.letter!==null&&state.letter!==undefined) state.letter=null;
      else if(build.soutSrc) build.soutSrc=null;
      else if(build.destroy) build.destroy=false;
      else if(build.type) build.type=null;
    }
    else if(/^[0-9]$/.test(k)){
      const idx=k==='0'?9:(+k-1);
      if(toolOrder[idx]) selectTool(toolOrder[idx]);
    }
  });
  document.addEventListener('paste',e=>{
    if(tf.focused&&e.clipboardData){ tf.value+=e.clipboardData.getData('text'); e.preventDefault(); }
  });
  window.addEventListener('beforeunload',()=>saveGame());
  window.addEventListener('resize',resize);
  ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(resize,60)));
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
  canvas.style.cursor=CURSORS[c]||c;  
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }


/* ══════════════ 7. SPRITES  ══════════════ */

function px(g,Sc,x,y,w,h,c){
  g.fillStyle=c;
  g.fillRect(Math.round(x*Sc),Math.round(y*Sc),Math.max(1,Math.round(w*Sc)),Math.max(1,Math.round(h*Sc)));
}
function R(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }

const MPAL={
  machine_papier:{f:'#74754f',l:'#a3987a',d:'#565839',e:'#2e2f20'},
  machine_papier_2:{f:'#5d6b6e',l:'#75838a',d:'#465255',e:'#28302f'}, 
  machine_papier_3:{f:'#6e5a2e',l:'#8a7440',d:'#54431f',e:'#332810'}, 
  expedition    :{f:'#8a6a45',l:'#a5825a',d:'#6b4f33',e:'#3f2d1b'},
  onduleuse     :{f:'#b26a33',l:'#c67f45',d:'#8c4f24',e:'#572f14'},
  onduleuse_2   :{f:'#8a3d2e',l:'#a54f3b',d:'#6a2c20',e:'#42190f'},   
  onduleuse_3   :{f:'#3f4a55',l:'#556470',d:'#2e3742',e:'#1c232c'},  
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
    px(g,Sc,14+dx,-8,8,16,dark);              
    px(g,Sc,15+dx,-7,6,14,c);
    px(g,Sc,16+dx,-4,2,2,dark); px(g,Sc,18+dx,-2,2,4,dark); px(g,Sc,16+dx,2,2,2,dark);
  }
}
function dockPlate(g,Sc,compact,hl){
  const x0=compact?11:14, w=compact?5:8;
  const h2=hl||16;
  px(g,Sc,x0,-(h2-1),w,(h2-1)*2,'#3a2414');
  for(let i=0;i<Math.ceil(((h2-1)*2)/3);i++) px(g,Sc,x0+1,-(h2-1)+i*3,w-2,2, i%2?'#d9a92e':'#191008');
}

function chassis(g,Sc,p,plate,compact,hl){
  hl=hl||16;
  const x0=-(hl-1), x1=hl-1;
  px(g,Sc,x0,-15,x1-x0,30,p.e);                
  px(g,Sc,x0+1,-14,x1-x0-2,28,p.f);            
  px(g,Sc,x0+1,-14,x1-x0-2,3,p.l);              
  px(g,Sc,x0+1,11,x1-x0-2,3,p.d);             
  px(g,Sc,x0,-10,2,4,'#1f1710');              
  px(g,Sc,x0,6,2,4,'#1f1710');
  for(let nx=x0+5;nx<=x1-9;nx+=16){          
    px(g,Sc,nx,-15,4,2,'#1f1710');
    px(g,Sc,nx,13,4,2,'#1f1710');
  }
  if(plate==='arrow') arrowPlate(g,Sc,false,compact,hl);
  if(plate==='dock')  dockPlate(g,Sc,compact);
}

function drawDockSprite(g,Sc,type,m){
  const p=MPAL.expedition;
  const rot=(m&&m.rot!==undefined)?m.rot:3;
  const f=fpSize(type,rot);
  const exC=f.h;
  const eyC=f.w;
  const ax=exC*8, ay=eyC*8;
  px(g,Sc,-ax,-ay,ax*2,ay*2,p.e);           
  px(g,Sc,-ax+1,-ay+1,ax*2-2,ay*2-2,p.f);
  px(g,Sc,-ax+1,-ay+1,ax*2-2,2,p.l);
  px(g,Sc,-ax+1,ay-3,ax*2-2,3,p.d);
  px(g,Sc,ax-2,-ay,3,ay*2,'#3a2414');       
  for(let i=0;i<Math.ceil(ay*2/3);i++)
    px(g,Sc,ax-1,-ay+1+i*3,2,2,(i%2)?'#d9a92e':'#191008');
  const notchC='#1f1710';                
  const placeNotches=(n,side)=>{
    if(n<=0) return;
    const span=(side==='rear')?ay*2:ax*2;
    for(let i=0;i<n;i++){
      const cc=-span/2+span*(i+0.5)/n;
      if(side==='rear') px(g,Sc,-ax,cc-2,2,4,notchC);
      else{ px(g,Sc,cc-2,-ay,4,2,notchC); px(g,Sc,cc-2,ay-2,4,2,notchC); }
    }
  };
  placeNotches(eyC,'rear');
  placeNotches(exC,'sides');
  if(exC>=2&&eyC>=2){                     
    px(g,Sc,-ax+3,-ay+3,ax*2-8,ay*2-8,'#b08a58');
    px(g,Sc,-ax+3,-ay+3,ax*2-8,2,'#c9a26c');
    px(g,Sc,-ax+3,ay-5,ax*2-8,2,'#5e4326');
    px(g,Sc,-2,-ay+3,3,ay*2-8,'#d9cfae');
    px(g,Sc,-ax+3,-2,ax*2-8,2,'#d9cfae');
    px(g,Sc,-ax+6,-ay+6,7,5,'#f2e8d2');
    px(g,Sc,-ax+7,-ay+8,5,1,'#8a6a45');
  }else{                                
    px(g,Sc,-ax+3,-ay+3,ax*2-7,ay*2-6,'#b08a58');
    px(g,Sc,-ax+3,-ay+3,ax*2-7,2,'#c9a26c');
    px(g,Sc,-ax+3,ay-5,ax*2-7,2,'#5e4326');
    px(g,Sc,-3,-ay+3,3,ay*2-6,'#d9cfae');
    if(ay>=12) px(g,Sc,-ax+5,-ay+5,5,3,'#f2e8d2');
  }
  px(g,Sc,-ax+3,ay-6,3,3,'#d8c193');   /* voyant ivoire (ex-verte : reliquat retiré) */
  if(m&&m.locked){                        
    px(g,Sc,-ax+2,-ay+2,3,3,'#e8c96a'); px(g,Sc,ax-5,-ay+2,3,3,'#e8c96a');
    px(g,Sc,-ax+2,ay-5,3,3,'#e8c96a');  px(g,Sc,ax-5,ay-5,3,3,'#e8c96a');
  }
}
function drawMachineSprite(g,type,m,Sc,pulse,compact){
  const p=MPAL[type]||MPAL.assem_petit;
  const active=m&&m.active;
  const prog=m?m.timer/MACHINES[type].time:0;
  const hl=LONG[type]?LONG[type]*8:16;         
  switch(type){
    case 'machine_papier':
    case 'machine_papier_2':
    case 'machine_papier_3':{
      const tier=type==='machine_papier_2'?2:(type==='machine_papier_3'?3:1);
      chassis(g,Sc,p,'arrow',compact,hl);
      px(g,Sc,-hl+3,-11,hl-1,22,p.e);         
      px(g,Sc,-hl+4,-10,hl-3,20,p.d);
      px(g,Sc,-hl+4,-10,hl-3,2,p.l);
      px(g,Sc,-10,-2,9,11,'#b9ae8d');           
      if(tier===1){                           
        for(let i=0;i<8;i++){
          const a=animT*2.5+i*Math.PI/4;
          const wx=Math.round(Math.cos(a)*4)-1;
          px(g,Sc,-6+wx,-1+Math.round(Math.sin(a)*4),2,2,p.l);
        }
        px(g,Sc,-7,-2,2,2,'#9a8a6e');
      }else{                                  
        for(let w=0;w<tier;w++){
          const wcx=-hl+8+w*(-6-(-hl+8))/(tier-1);
          for(let i=0;i<8;i++){
            const a=animT*(2+tier*.5)+i*Math.PI/4+w*1.7;
            px(g,Sc,Math.round(wcx+Math.cos(a)*3),Math.round(-1+Math.sin(a)*3),2,2,p.l);
          }
          px(g,Sc,Math.round(wcx)-1,-2,2,2,'#9a8a6e');
        }
      }
      px(g,Sc,-(hl-2),-13,5,5,'#d9d0b4');      
      px(g,Sc,-(hl-3),-11,3,2,'#b9ad8f');
      if(active&&Math.sin(animT*8)>0) px(g,Sc,2,3,3,3,'#f2e9d4'); 
      px(g,Sc,-(hl-3),9,3,3,active?'#d8c193':'#544a38');
      if(tier>1) px(g,Sc,-(hl-2),7,5,2,'#e8c96a');   
      if(tier>2) px(g,Sc,-(hl-2),10,5,2,'#e8c96a');
      break;
    }
    case 'onduleuse':
    case 'onduleuse_2':
    case 'onduleuse_3':{
      const tier=type==='onduleuse_2'?2:(type==='onduleuse_3'?3:1);
      chassis(g,Sc,p,'arrow',compact,hl);
      px(g,Sc,-hl+3,-5,hl+1,12,'#4a2a12');    
      px(g,Sc,-hl+3,-12,hl+1,6,'#e9dcbb');   
      px(g,Sc,-hl+3,-12,3,6,p.e);
      px(g,Sc,-hl+3,6,hl+1,6,'#d9cba6');     
      px(g,Sc,-hl+3,6,3,6,p.e);
      const nseg=Math.floor(hl/3);             
      for(let i=0;i<nseg;i++){
        const x=-hl+4+i*3;
        const dy=Math.sin(animT*(8+tier*3)+i*1.3)>0?-1:1;
        px(g,Sc,x,-4+dy,2,8-dy,'#d9ab72');
      }
      const dy2=active?Math.round(Math.sin(prog*Math.PI)*4):0; 
      px(g,Sc,-4,-14+dy2,6,4,'#8c4f24');
      px(g,Sc,-3,-10+dy2,4,2,'#c67f45');
      px(g,Sc,-(hl-5),-11,2,1,'#fff8e4');       
      if(tier>1){                            
        const mx=-Math.round(hl/2);
        px(g,Sc,mx,-12,2,6,'#e9dcbb'); px(g,Sc,mx,6,2,6,'#d9cba6');
        px(g,Sc,mx-1,-12,1,6,p.e);  px(g,Sc,mx-1,6,1,6,p.e);
      }
      if(tier>2){                               
        const q=-Math.round(hl/4);
        px(g,Sc,q,-12,2,6,'#e9dcbb'); px(g,Sc,q,6,2,6,'#d9cba6');
        px(g,Sc,q-1,-12,1,6,p.e);   px(g,Sc,q-1,6,1,6,p.e);
        px(g,Sc,-(hl-2),7,5,2,'#e8c96a');
        px(g,Sc,-(hl-2),10,5,2,'#e8c96a');
      }
      break;
    }
    case 'expedition':
    case 'expedition_couloir':
    case 'expedition_lane':
    case 'expedition_micro':{
      drawDockSprite(g,Sc,type,m);
      break;
    }
    case 'imprimeuse':{
      chassis(g,Sc,p,'arrow',compact);
      px(g,Sc,-13,-9,16,16,'#4a3620');       
      px(g,Sc,-13,-9,16,1,'#88b0c4');
      px(g,Sc,-13,6,16,1,'#88b0c4');
      drawItemAt(g,MACHINES[type].out,-5*Sc,1*Sc,Sc*.8);
      const xo=active?Math.round(Math.sin(animT*7)*4):0; 
      px(g,Sc,-6+xo,-13,5,4,'#6e6e6e');
      px(g,Sc,-5+xo,-9,3,2,'#4d6b7a');
      px(g,Sc,-13,8,16,4,'#7ba3b8');            
      px(g,Sc,-13,8,3,4,p.e);
      px(g,Sc,-7,9,2,2,'#4d6b7a');
      break;
    }
    case 'benne':{
      /* benne à déchets : caisse grise à couvercle, croix de rejet, 4 faces ouvertes */
      chassis(g,Sc,p,'none',compact);
      px(g,Sc,-12,-12,24,24,'#4a4a52');
      px(g,Sc,-11,-11,22,22,'#5c5c66');
      px(g,Sc,-11,-11,22,2,'#767681');
      px(g,Sc,-11,9,22,2,'#3a3a42');
      px(g,Sc,-12,-12,24,2,'#2c2c33');
      /* couvercle entrouvert selon le flux, sinon fermé */
      const lidUp=active?3:0;
      px(g,Sc,-13,-14+lidUp,26,3,'#6e6e7a');
      px(g,Sc,-13,-14+lidUp,26,1,'#8a8a95');
      px(g,Sc,11,-13+lidUp,2,4,'#54545e');
      /* croix de rejet (symbole « rebut ») */
      px(g,Sc,-6,-6,2,2,'#c9553b'); px(g,Sc,-4,-4,2,2,'#c9553b'); px(g,Sc,-2,-2,2,2,'#c9553b');
      px(g,Sc,2,-6,2,2,'#c9553b');  px(g,Sc,0,-4,2,2,'#c9553b');  px(g,Sc,-2,-2,2,2,'#c9553b');
      px(g,Sc,-2,2,2,2,'#c9553b');  px(g,Sc,0,0,2,2,'#c9553b');   px(g,Sc,2,2,2,2,'#c9553b');
      px(g,Sc,-6,2,2,2,'#c9553b');  px(g,Sc,-4,0,2,2,'#c9553b');
      /* cendres/tourbillon quand elle vient d'avaler */
      if(m&&m.flash>0&&Math.sin(animT*9)>0){
        px(g,Sc,-14,-6,2,2,'#9c9ca8'); px(g,Sc,12,-8,2,2,'#9c9ca8'); px(g,Sc,-10,-15,2,2,'#767681');
      }
      break;
    }
    default:{
      const isAssem=type.startsWith('assem_');
      chassis(g,Sc,p,'arrow',compact);
      if(isAssem){
        px(g,Sc,-14,-2,16,14,'#8a6a45');        
        px(g,Sc,-14,-2,16,2,'#a5825a');
        px(g,Sc,-14,11,16,2,'#5e4326');
        px(g,Sc,-12,-14,12,3,'#5e4326');       
        const dy=active?Math.round(Math.sin(prog*Math.PI)*6):0;
        px(g,Sc,-10,-11+dy,8,5,'#c9c2a8');
        px(g,Sc,-10,-11+dy,8,1,'#e8e0c4');
        px(g,Sc,-10,-7+dy,8,1,'#8f8870');
        drawItemAt(g,MACHINES[type].out,-6*Sc,4*Sc,Sc*.8); 
        if(active&&Math.sin(animT*10)>0){ px(g,Sc,-14,-2,16,1,'#f0d9a8'); px(g,Sc,-14,11,16,1,'#f0d9a8'); }
      }else{
        px(g,Sc,-13,-4,16,16,'#4a3620');      
        px(g,Sc,-13,-4,16,2,'#946b46');
        px(g,Sc,-13,10,16,2,'#5f452c');
        drawItemAt(g,MACHINES[type].out,-5*Sc,3*Sc,Sc*.75);
        const dy=active?Math.round(Math.sin(prog*Math.PI)*5):0; 
        px(g,Sc,-8,-13+dy,6,4,'#8f8f8f');
        px(g,Sc,-8,-13+dy,6,1,'#c4c4c4');
        px(g,Sc,-7,-14,4,2,'#3a2917');
      }
      break;
    }
  }
}

function drawRepartiteurSprite(g,Sc,m,pulse){
  const c=(pulse&&Math.sin(animT*8)>0)?'#e08a3c':'#d8c193';
  px(g,Sc,-8,-16,16,32,'#3a2c1e');
  px(g,Sc,-7,-15,14,30,'#463525');
  px(g,Sc,-7,-15,14,2,'#6b563c');
  px(g,Sc,-7,13,14,2,'#5b4930');
  px(g,Sc,-7,-1,14,2,'#33291f');
  px(g,Sc,-8,-10,2,4,'#1f1710');
  px(g,Sc,-8,6,2,4,'#1f1710');
  for(const yy of [-8,8]){
    px(g,Sc,-4,yy-5,3,3,c); px(g,Sc,-1,yy-2,3,4,c); px(g,Sc,-4,yy+2,3,3,c);
  }
  /* badges A / B sur les sorties + liseré doré si la sortie est filtrée */
  if(m&&m.type==='repartiteur'){
    const cfg=m.rep;
    if(cfg){
      const mark=(lab,yy,filtered)=>{
        if(filtered){ px(g,Sc,-7,yy-7,14,1,'#e0b552'); px(g,Sc,-7,yy+5,14,1,'#e0b552'); }
        px(g,Sc,5,yy-3,3,3,filtered?'#e0b552':'#8f7752');
        px(g,Sc,6,yy-2,1,1,'#191008');
      };
      mark('A',-8,cfg.outA&&cfg.outA.items&&cfg.outA.items.length>0);
      mark('B',8,cfg.outB&&cfg.outB.items&&cfg.outB.items.length>0);
      /* flèche renforcée sur la sortie prioritaire */
      if(cfg.pri==='A'||cfg.pri==='B'){
        const yy=cfg.pri==='A'?-8:8;
        px(g,Sc,-7,yy-1,5,2,'#e0b552');
      }
    }
  }
  if(m&&m.queue){
    const n=Math.min(m.queue.length,8);
    for(let i=0;i<n;i++)
      px(g,Sc,-6+i*1.8,-2,1.5,2,ITEMS[m.queue[i]]?ITEMS[m.queue[i]].c:'#d8c193');
  }
  if(m&&m.vItem){
    const v=m.vItem;
    let x, y;
    if(v.phase==='in'){ x=-8+8*v.p; y=v.lane*7; }
    else if(v.phase==='shift'){ x=0; y=v.lane*7+(v.toLane-v.lane)*7*v.p; }
    else if(v.phase==='exit'){ x=Math.min(8*v.p,8); y=v.toLane*7; }
    else { x=0; y=v.lane*7; }
    drawItemAt(g,v.t,x*Sc,y*Sc,Sc*.8);
    if(v.phase==='shift'){
      const by=v.lane*7+(v.toLane-v.lane)*7*Math.max(0,v.p-0.2);
      px(g,Sc,-6,by-1,12,2,'#3a2c1e');
      px(g,Sc,-5,by-0.5,10,1,'#c99e6a');
    }
  }
}
function drawRepartiteur(e){
  const f=fpSize(e.type,e.rot);
  const cx=ox+(e.x+f.w/2)*TILE, cy=oy+(e.y+f.h/2)*TILE;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(e.rot*Math.PI/2);
  if(isDock(e.type)){
    const d=dockSize(e.type);
    if(d.h>1){
      ctx.rotate(-e.rot*Math.PI/2);
      if(e.rot===0)      ctx.translate(-TILE/2,0);
      else if(e.rot===1) ctx.translate(0,-TILE/2);
      else if(e.rot===2) ctx.translate(TILE/2,0);
      else               ctx.translate(0,TILE/2);
      ctx.rotate(e.rot*Math.PI/2);
    }
  }
  if(e.flash>0){ ctx.globalAlpha=.4+.5*(e.flash/.35); drawRepartiteurSprite(ctx,S,e); ctx.globalAlpha=1; }
  else drawRepartiteurSprite(ctx,S,e);
  ctx.restore();
}

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

function getMachineIcon(type){
  if(iconCache[type]) return iconCache[type];
  const c=document.createElement('canvas'); c.width=48; c.height=48;
  const g=c.getContext('2d');
  g.imageSmoothingEnabled=false;
  const Sc=LONG[type]?48/(LONG[type]*16):48/32;   
  g.translate(24,24); g.rotate(-Math.PI/2);     
  if(type==='convoyeur'){
    px(g,Sc,-8,-8,16,16,'#3a2c1e');             
    px(g,Sc,-8,-6,16,12,'#463525');
    px(g,Sc,-8,-8,16,2,'#6b563c');
    px(g,Sc,-8,6,16,2,'#5b4930');
    px(g,Sc,-4,-5,3,3,'#d8c193');                
    px(g,Sc,-1,-2,3,4,'#d8c193');
    px(g,Sc,-4,2,3,3,'#d8c193');
  }else if(type==='ruban_sout'){
    /* icône : la SORTIE puis l'ENTRÉE le long du flux — deux bouches reliées */
    g.save(); g.translate(8,0); drawSoutMouth(g,Sc,'in',0);  g.restore();
    g.save(); g.translate(-8,0); drawSoutMouth(g,Sc,'out',0); g.restore();
    g.strokeStyle='#8f7752'; g.lineWidth=1; g.setLineDash([2,2]);
    g.beginPath(); g.moveTo(-4*Sc,0); g.lineTo(4*Sc,0); g.stroke();
    g.setLineDash([]);
  }else if(type==='repartiteur'){
    drawRepartiteurSprite(g,1.3,null,false);    
  }else if(isDock(type)){
    const vert=dockSize(type).h>dockSize(type).w;
    if(vert) g.rotate(Math.PI/2);
    const f=dockSize(type);
    const Sc2=Math.min(Sc,44/(16*Math.max(f.w,f.h)));
    drawDockSprite(g,Sc2,type,{rot:vert?0:3});
  }else if(type==='benne'){
    /* icône verticale (sans la rotation -90°) : la benne telle qu'en jeu */
    g.rotate(Math.PI/2);
    drawMachineSprite(g,'benne',null,1.15,false,true);
  }else{
    drawMachineSprite(g,type,null,Sc,false,true);
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

function drawObstacles(){
  const obs=FACTORIES[state.factoryIdx].obstacles;
  if(!obs) return;
  for(const o of obs){
    const x=ox+o[0]*TILE, y=oy+o[1]*TILE, w=o[2]*TILE, h=o[3]*TILE;
    R(x,y,w,h,'#241a10');                       
    R(x+2,y+2,w-4,h-4,'#4a3626');              
    const half=Math.max(4,Math.floor(TILE/2));
    ctx.fillStyle='#241a10';
    for(let by=y+2+half; by<y+h-4; by+=half) ctx.fillRect(x+2,by,w-4,2);
    let row=0;
    for(let by=y+2; by<y+h-6; by+=half, row++){
      const off=(row%2)?half:0;
      for(let bx=x+2+off+half; bx<x+w-6; bx+=TILE)
        ctx.fillRect(bx,by,2,Math.max(2,Math.min(half,y+h-4-by)));
    }
    R(x,y,w,3,'#5f4a32');                   
    R(x,y+h-3,w,3,'#171008');                   
    ctx.fillStyle='#6a5236';                    
    ctx.fillRect(x+3,y+3,3,3); ctx.fillRect(x+w-6,y+3,3,3);
    ctx.fillRect(x+3,y+h-6,3,3); ctx.fillRect(x+w-6,y+h-6,3,3);
  }
}

function beltExitDir(b){
  if(!b.curve) return b.rot;
  return b.curve===1 ? (b.rot+1)%4 : (b.rot+3)%4;
}
function beltPushOK(b,pushDir){
  return !b.curve || pushDir===b.rot;
}
const DIRNAMES=['vers la droite','vers le bas','vers la gauche','vers le haut'];
function drawBeltCurve(g,Sc,curve,bs,floorC){
  const right=curve===1;
  const kx=-8, ky=right?8:-8;                 
  const a0=right?-Math.PI/2:Math.PI/2, a1=0;  
  const lo=Math.min(a0,a1), hi=Math.max(a0,a1);
  px(g,Sc,-8,-8,16,16,floorC||'#231b13');
  const cOut=right?'#6b563c':'#5b4930';
  const cIn =right?'#5b4930':'#6b563c';
  g.beginPath(); g.arc(kx*Sc,ky*Sc,15*Sc,lo,hi); g.lineWidth=2*Sc;  g.strokeStyle=cOut; g.stroke();
  g.beginPath(); g.arc(kx*Sc,ky*Sc,1*Sc,lo,hi);  g.lineWidth=2*Sc;  g.strokeStyle=cIn;  g.stroke();
  g.beginPath(); g.arc(kx*Sc,ky*Sc,8*Sc,lo,hi);  g.lineWidth=12*Sc; g.strokeStyle='#463525'; g.stroke();
  const path=8*(hi-lo);                       
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
  const off=((animT*(bs||0.25)*160)%8+8)%8;
  for(let s=((off-2)%8+8)%8-8;s<path+8;s+=8) if(s>=0&&s<=path) chev(s,false);
  g.globalAlpha=.9; chev(path/2,true); g.globalAlpha=1;
}

/* ══ Ruban souterrain — bouche d'entrée ('in') ou de sortie ('out') ══
   Même socle que le convoyeur (cadre, lit, rails) : les bords se raccordent
   au pixel près avec les rubans voisins. La bouche sombre occupe exactement
   une MOITIÉ de la tuile — l'avant pour l'entrée (l'y plonge), l'arrière
   pour la sortie (l'y remonte) — l'autre moitié reste un vrai ruban à
   chevrons animés. bs = vitesse des chevrons (0 = statique, pour l'icône). */
function drawSoutMouth(g,Sc,mode,bs){
  const ent=mode!=='out';
  const x0=ent?1:-7;                          /* trou : x0..x0+6 */
  px(g,Sc,-8,-8,16,16,'#3a2c1e');              /* cadre = convoyeur */
  px(g,Sc,-8,-6,16,12,'#463525');              /* lit = convoyeur */
  px(g,Sc,-8,-8,16,2,'#6b563c');               /* rail haut = convoyeur */
  px(g,Sc,-8,6,16,2,'#5b4930');                /* rail bas = convoyeur */
  /* chevrons animés sur la moitié qui reste ruban */
  g.save();
  g.beginPath();
  if(ent) g.rect(-8*Sc,-6*Sc,8*Sc,12*Sc);      /* entrée : ruban à l'arrière */
  else    g.rect(0,-6*Sc,8*Sc,12*Sc);          /* sortie : ruban à l'avant */
  g.clip();
  const off=((animT*(bs||0)*160)%8+8)%8;
  for(let q=-12;q<12;q+=8){
    const x1=q+off;
    px(g,Sc,x1,-4,2,2,'#8f7752'); px(g,Sc,x1+2,-2,2,4,'#8f7752'); px(g,Sc,x1,2,2,2,'#8f7752');
  }
  g.restore();
  /* la bouche : trou sombre cerclé d'un cadre bois (garde-corps) */
  px(g,Sc,x0,-5,6,10,'#191008');
  px(g,Sc,x0,-5,6,1,'#050302');                /* ombre interne côté plafond */
  px(g,Sc,x0-1,-6,8,1,'#8f7752');              /* linteau haut */
  px(g,Sc,x0-1,5,8,1,'#8f7752');               /* seuil bas */
  px(g,Sc,x0-1,-5,1,10,'#8f7752');             /* jambage amont */
  px(g,Sc,x0+6,-5,1,10,'#8f7752');             /* jambage aval */
  /* flèche de sens : même chevron ivoire que les convoyeurs, sur la moitié ruban */
  g.globalAlpha=.9;
  if(ent){ px(g,Sc,-7,-5,3,3,'#d8c193'); px(g,Sc,-4,-2,3,4,'#d8c193'); px(g,Sc,-7,2,3,3,'#d8c193'); }
  else   { px(g,Sc,1,-5,3,3,'#d8c193');  px(g,Sc,4,-2,3,4,'#d8c193');  px(g,Sc,1,2,3,3,'#d8c193'); }
  g.globalAlpha=1;
}

function drawBeltSprite(b){
  const cx=ox+b.x*TILE+TILE/2, cy=oy+b.y*TILE+TILE/2;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(b.rot*Math.PI/2);
  if(isSout(b)){
    /* entrée (tunnel actif ou en attente de sortie) : bouche à l'avant.
       sortie : bouche à l'arrière. même socle que les convoyeurs. */
    const ent=!soutEntranceOf(b);
    drawSoutMouth(ctx,S,ent?'in':'out',beltSpeedOf(b));
  }else if(b.curve){
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
  if(isSout(b)){
    /* halo discret : une bouche de tunnel posée n'est pas un simple bout de ruban */
    ctx.strokeStyle='rgba(216,193,147,.35)';
    ctx.lineWidth=1;
    ctx.strokeRect(cx-TILE/2+1.5,cy-TILE/2+1.5,TILE-3,TILE-3);
  }
  if(b.lvl>0){
    for(let i=0;i<b.lvl;i++) R(ox+b.x*TILE+3+i*6,oy+b.y*TILE+3,4,4,'#e8c96a');
  }
}
function drawSoutLinks(){
  /* trait de tunnel entre chaque entrée et sa sortie : pointillé animé
     sous les machines/obstacles — l'item voyage sous terre */
  for(const a of state.entities){
    if(!isSout(a)||a.curve) continue;
    const b=soutOf(a);
    if(!b) continue;
    const x1=ox+a.x*TILE+TILE/2, y1=oy+a.y*TILE+TILE/2;
    const x2=ox+b.x*TILE+TILE/2, y2=oy+b.y*TILE+TILE/2;
    ctx.save();
    ctx.strokeStyle='rgba(143,119,82,.55)';
    ctx.lineWidth=3; ctx.setLineDash([7,6]);
    ctx.lineDashOffset=-((animT*40)%13);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
function drawBeltItem(b,alpha){
  if(!b.item) return;
  /* ruban souterrain : l'item s'enfonce dans la bouche d'entrée (rétrécit),
     et SORT de la bouche de sortie (grandit) — le trajet sous terre est
     invisible (seul le pointillé du tunnel s'anime) */
  if(isSout(b)){
    const cx=ox+b.x*TILE+TILE/2, cy=oy+b.y*TILE+TILE/2;
    const dOut=DIRS[b.rot], dIn=DIRS[(b.rot+2)%4];
    const sx=cx-dIn.x*TILE/2, sy=cy-dIn.y*TILE/2;
    const ex=cx+dOut.x*TILE/2, ey=cy+dOut.y*TILE/2;
    const p=clamp(b.item.p,0,1);
    /* entrée : l'item glisse jusqu'à la bouche puis S'ENFONCE (rétrécit).
       sortie : il REMONTE de la bouche (grandit) et continue devant. */
    const ent=!soutEntranceOf(b);
    const sc=S*.95*(ent?(1-0.45*p):(0.55+0.45*p));
    const px_=ent?(p<.5?p*2:1):(p<.5?0:(p-.5)*2);
    drawItemAt(ctx,b.item.t,sx+(ex-sx)*px_*.5,sy+(ey-sy)*px_*.5,sc);
    return;
  }
  if(b.item.p<0.5&&b.item.entry!==undefined){
    const din=DIRS[b.item.entry];
    const src=cellAt(b.x-din.x,b.y-din.y);
    if(src&&src.type==='repartiteur'&&src.vItem&&src.vItem.phase!=='wait'&&b.item.t===src.vItem.t){
      b.item.p=Math.min(b.item.p,0.08);   /* gel près de la frontière */
      const cx=ox+b.x*TILE+TILE/2, cy=oy+b.y*TILE+TILE/2;
      const dIn=DIRS[b.item.entry];
      const fx=cx-dIn.x*TILE/2, fy=cy-dIn.y*TILE/2;
      drawItemAt(ctx,b.item.t,fx,fy,S*.95);
      return;
    }
  }
  let belt=b, p=b.item.p, a=alpha;
  let entry=(b.item.entry!==undefined)?b.item.entry:b.rot;
  for(let hop=0;hop<3;hop++){
    const pd=belt.curve?beltExitDir(belt):belt.rot;
    if(p>=1){                                     
      const d=DIRS[pd];
      const c=cellAt(belt.x+d.x,belt.y+d.y);
      const own=c&&c.kind==='belt'&&!c.item&&beltPushOK(c,pd)
                &&(!reserved.get(c.x+','+c.y)||reserved.get(c.x+','+c.y)===belt);
      if(!own){ p=1; break; }
      const w=(p-1)*pathLenFor(belt,entry);
      belt=c; entry=pd; p=w/pathLenFor(c,pd);
      continue;
    }
    const L=pathLenFor(belt,entry), bs=beltSpeedOf(belt);
    const need=(1-p)*L/bs;                      
    if(a>need){
      const d=DIRS[pd];
      const c=cellAt(belt.x+d.x,belt.y+d.y);
      const free=c&&c.kind==='belt'&&!c.item&&beltPushOK(c,pd)
                 &&(!reserved.get(c.x+','+c.y)||reserved.get(c.x+','+c.y)===belt);
      if(free&&hop<2){ a-=need; belt=c; entry=pd; p=0; continue; }
      p=1; break;                             
    }
    p+=a*bs/L; break;
  }
  const cx=ox+belt.x*TILE+TILE/2, cy=oy+belt.y*TILE+TILE/2;
  if(belt.curve){
    const right=belt.curve===1;
    const kx=-8, ky=right?8:-8;
    const a0=right?-Math.PI/2:Math.PI/2, a1=0;
    const aa=a0+(a1-a0)*clamp(p,0,1);
    const rotA=belt.rot*Math.PI/2, co=Math.cos(rotA), si=Math.sin(rotA);
    const fx=kx+Math.cos(aa)*8, fy=ky+Math.sin(aa)*8;
    drawItemAt(ctx,b.item.t,cx+(fx*co-fy*si)*S,cy+(fx*si+fy*co)*S,S*.95);
  }else{
    const dOut=DIRS[belt.rot], dIn=DIRS[entry];
    const sx=cx-dIn.x*TILE/2,  sy=cy-dIn.y*TILE/2;
    const ex=cx+dOut.x*TILE/2, ey=cy+dOut.y*TILE/2;
    drawItemAt(ctx,b.item.t,sx+(ex-sx)*p,sy+(ey-sy)*p,S*.95);
  }
}
function drawOutItem(e){
  const f=fpSize(e.type,e.rot);
  const cx=ox+(e.x+f.w/2)*TILE, cy=oy+(e.y+f.h/2)*TILE, d=DIRS[e.rot];
  ctx.save(); ctx.translate(cx+d.x*f.w*TILE/2,cy+d.y*f.h*TILE/2); ctx.rotate(e.rot*Math.PI/2);
  drawItemAt(ctx,e.outItem,0,0,S*.95);
  ctx.restore();
}

function drawMachine(e){
  if(e.type==='repartiteur'){ drawRepartiteur(e); return; }
  const f=fpWorld(e.type,e.rot);
  let cx=ox+(e.x+f.w/2)*TILE, cy=oy+(e.y+f.h/2)*TILE;
  if(isDock(e.type)){
    const dd=dockSize(e.type);
    const din=DIRS[(e.rot+2)%4];            
    cx+=din.x*(dd.h-1)*TILE/2;
    cy+=din.y*(dd.h-1)*TILE/2;
  }
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(e.rot*Math.PI/2);
  if(isDock(e.type)){
    const d=dockSize(e.type);
    const off=(d.h-1)/2*TILE; 
    ctx.translate(off,0);
  }
  if(e.flash>0){ ctx.globalAlpha=.4+.5*(e.flash/.35); drawMachineSprite(ctx,e.type,e,S); ctx.globalAlpha=1; }
  else drawMachineSprite(ctx,e.type,e,S);
  ctx.restore();
  if(e.inBuf){                                  
    let n=0;
    for(const k in e.inBuf) for(let i=0;i<e.inBuf[k]&&n<14;i++,n++)
      R(ox+e.x*TILE+6+n*4,oy+(e.y+f.h)*TILE-6,3,3,ITEMS[k].c);
  }
  if(e.lvl>0){                                 
    for(let i=0;i<e.lvl;i++) R(ox+e.x*TILE+4+i*7,oy+e.y*TILE+4,5,5,'#e8c96a');
  }
}

function drawBlocked(e){
  const isB=(e.kind==='belt'&&e.blockedT>1.5)
    ||(e.kind==='machine'&&e.type!=='isDock'&&e.blockedT>1.5&&(e.outItem||e.type==='repartiteur'));
  if(!isB||Math.sin(animT*6)<-0.2) return;
  const f=fpWorld(e.type,e.rot);
  const x=ox+(e.x+f.w/2)*TILE, y=oy+e.y*TILE-4;
  R(x-6,y-12,12,12,'#c9553b'); R(x-6,y-12,12,2,'#5e2417'); R(x-6,y-2,12,2,'#5e2417');
  R(x-1,y-10,2,5,'#f5ead2'); R(x-1,y-3,2,2,'#f5ead2');
}

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
  const dock=isDock(type);
  const cands=dock?dockRotCandidates(type,c.x,c.y):null;
  const rot=dock?(cands.length?cands[build.expIdx%cands.length]:0):build.rot;
  const fp=fpSize(type,rot);
  const fpd=fpSize(type,rot);
  const swap=dock&&rot%2===0;
  const mw=swap?fpd.h:fpd.w, mh=swap?fpd.w:fpd.h;
  const staged=type==='ruban_sout'?build.soutSrc:null;
  const sx=staged?staged.x:c.x, sy=staged?staged.y:c.y;
  const srot=staged?(staged.ent?staged.ent.rot:staged.rot):rot;
  const scost=staged?soutCosts(!staged.ent):costOf(type);
  const ok=canPlace(type,sx,sy,srot)&&state.money>=scost;
  if(staged){
    /* étape 2 : l'entrée est en attente — on met en avant sa tuile et les
       4 cases où la SORTIE peut atterrir ; la case sous le curseur est
       surlignée si elle est valide */
    R(ox+sx*TILE,oy+sy*TILE,TILE,TILE,'rgba(120,160,80,.30)');
    const d=DIRS[srot];
    let any=false;
    for(let k=1;k<=SOUT_MAX;k++){
      const ex=sx+d.x*k, ey=sy+d.y*k;
      if(ex<0||ey<0||ex>=state.gridW||ey>=state.gridH) break;
      const valid=soutExitOK(sx,sy,srot,ex,ey);
      if(valid) any=true;
      R(ox+ex*TILE+3,oy+ey*TILE+3,TILE-6,TILE-6,valid?'rgba(143,175,106,.45)':'rgba(190,70,50,.30)');
      if(valid&&!staged.ent) R(ox+ex*TILE+1,oy+ey*TILE+1,TILE-2,TILE-2,'rgba(143,175,106,.15)');
    }
    /* le fantôme de sortie suit la souris quand elle survole la portée */
    if(soutExitOK(sx,sy,srot,c.x,c.y)){
      ctx.save();
      ctx.translate(ox+c.x*TILE+TILE/2,oy+c.y*TILE+TILE/2);
      ctx.rotate(srot*Math.PI/2);
      ctx.globalAlpha=.75;
      drawSoutMouth(ctx,S,'out',ECO.beltSpeed[state.research.belt]);
      ctx.restore();
      ctx.globalAlpha=1;
    }
    /* lien pointillé entrée → curseur : le futur trajet sous terre */
    ctx.save();
    ctx.strokeStyle='rgba(216,193,147,.6)';
    ctx.lineWidth=2; ctx.setLineDash([6,5]);
    ctx.lineDashOffset=-((animT*40)%11);
    ctx.beginPath();
    ctx.moveTo(ox+sx*TILE+TILE/2,oy+sy*TILE+TILE/2);
    ctx.lineTo(ox+c.x*TILE+TILE/2,oy+c.y*TILE+TILE/2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const my=(c.y>=1?oy+(c.y-1)*TILE-4:oy+c.y*TILE+TILE+16);
    if(!any){
      txt(T('ui.prevNoExit'),ox+sx*TILE+TILE/2,my,15,'#e8926f','center');
      txt(T('ui.prevRotate'),ox+sx*TILE+TILE/2,my+15,15,'#e8926f','center');
    }else if(state.money<scost){
      txt(T('ui.prevTunnel',{M:fmt(scost)+' $'}),ox+sx*TILE+TILE/2,my,15,'#e8926f','center');
    }
  }else{
    R(ox+c.x*TILE,oy+c.y*TILE,mw*TILE,mh*TILE,ok?'rgba(120,160,80,.30)':'rgba(190,70,50,.30)');
    /* ruban souterrain : la portée du futur saut en surbrillance douce */
    if(type==='ruban_sout'&&ok){
      const d=DIRS[rot];
      for(let k=1;k<=SOUT_MAX;k++){
        const ex=c.x+d.x*k, ey=c.y+d.y*k;
        if(ex<0||ey<0||ex>=state.gridW||ey>=state.gridH) break;
        R(ox+ex*TILE+3,oy+ey*TILE+3,TILE-6,TILE-6,'rgba(143,119,82,.28)');
      }
    }
  }
  ctx.save();
  if(staged){
    /* l'entrée en attente (ou l'entrée orpheline reprise) en plein */
    ctx.translate(ox+sx*TILE+TILE/2,oy+sy*TILE+TILE/2);
    ctx.rotate(srot*Math.PI/2);
    ctx.globalAlpha=(staged.ent?1:.9);
    drawSoutMouth(ctx,S,'in',ECO.beltSpeed[state.research.belt]);
    ctx.restore();
    ctx.globalAlpha=1;
    if(!staged.ent){
      const bx=ox+sx*TILE+TILE/2, by=oy+sy*TILE-6;
      ctx.lineWidth=2;
      ctx.strokeStyle=Math.sin(animT*6)>0?'#ffd9a0':'#e08a3c';
      ctx.strokeRect(ox+sx*TILE+1,oy+sy*TILE+1,TILE-2,TILE-2);
      txt(T('ui.prevClickExit'),bx,by,15,'#ffd9a0','center');
    }
    return;
  }
  ctx.translate(ox+(c.x+mw/2)*TILE,oy+(c.y+mh/2)*TILE);
  ctx.rotate(rot*Math.PI/2);
  ctx.globalAlpha=.75;
  if(type==='convoyeur'||type==='ruban_sout'){
    if(build.curve&&type==='convoyeur'){
      drawBeltCurve(ctx,S,build.curve,ECO.beltSpeed[state.research.belt],((c.x+c.y)%2)?'#231b13':'#261e15');
      if(ok){ ctx.globalAlpha=.85; px(ctx,S,-10,-6,2,4,'#f6e8c2'); px(ctx,S,-10,2,2,4,'#f6e8c2'); }
    }else if(type==='ruban_sout'){
      /* fantôme de la future ENTRÉE : bouche à l'avant, sens du flux */
      drawSoutMouth(ctx,S,'in',0);
      if(ok){ ctx.globalAlpha=.85; px(ctx,S,-10,-6,2,4,'#f6e8c2'); px(ctx,S,-10,2,2,4,'#f6e8c2'); }
    }else{
      px(ctx,S,-8,-8,16,16,'#3a2c1e'); px(ctx,S,-8,-6,16,12,'#463525');
      px(ctx,S,-8,-8,16,2,'#6b563c'); px(ctx,S,-8,6,16,2,'#5b4930');
      px(ctx,S,-4,-5,3,3,'#d8c193'); px(ctx,S,-1,-2,3,4,'#d8c193'); px(ctx,S,-4,2,3,3,'#d8c193');
    }
  }else if(type==='repartiteur'){
    drawRepartiteurSprite(ctx,S,null,true);
    if(ok){ ctx.globalAlpha=.85; px(ctx,S,-10,-10,2,4,'#f6e8c2'); px(ctx,S,-10,6,2,4,'#f6e8c2'); }
  }else{
    drawMachineSprite(ctx,type,{rot:rot},S,true);
    if(ok&&!dock){
      ctx.globalAlpha=.85;
      const hl2=LONG[type]?LONG[type]*8:16;
      for(let i=-12;i<=12;i+=4) px(ctx,S,-17,i,2,2,'#f6e8c2');
      const stp=hl2>=24?8:4;
      for(let i=-(hl2-4);i<=hl2-4;i+=stp){ px(ctx,S,i,-17,2,2,'#f6e8c2'); px(ctx,S,i,15,2,2,'#f6e8c2'); }
    }
  }
  ctx.restore();
  ctx.globalAlpha=1;
  if(dock&&!cands.length){
    const mx=ox+(c.x+mw/2)*TILE, my=oy+(c.y+mh)*TILE+14;
    txt(T('ui.prevMustTouch'),mx,my,15,'#e8926f','center');
    txt(T('ui.prevOuterWall'),mx,my+16,15,'#e8926f','center');
  }
}

function drawHoverOutline(){
  if(build.type||build.destroy||state.modal) return;
  const e=cellAt(build.hover.x,build.hover.y);
  if(!e) return;
  const f=fpWorld(e.type,e.rot);
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


/* ══════════════ 9. RENDU INTERFACE ══════════════ */

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
  const F=LANG().fmt;
  if(n>=1e9) return (n/1e9).toFixed(2).replace('.',F.dec)+F.g;
  if(n>=1e6) return (n/1e6).toFixed(2).replace('.',F.dec)+F.m;
  if(n>=1e5) return (n/1e3).toFixed(1).replace('.',F.dec)+F.k;
  if(n>=100||Number.isInteger(n)) return Math.round(n).toLocaleString(F.loc);
  return (Math.round(n*10)/10).toString().replace('.',F.dec);
}
function fmtSci(n){ return n<100 ? (Math.round(n*10)/10).toString().replace('.',LANG().fmt.dec) : fmt(n); }
function f1(x){ return (Math.round(x*10)/10).toString().replace('.',LANG().fmt.dec); }

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

function slider(x,y,w,label,val,set){
  const h=18;
  txt(label,x,y+13,8,'#8a755c','left','s');
  const ty=y+18;
  R(x,ty,w,h,'#141009');
  ctx.lineWidth=2; ctx.strokeStyle='#4a3a28'; ctx.strokeRect(x+1,ty+1,w-2,h-2);
  
  const ncrans=Math.max(1, Math.floor(w/12));
  const filled=Math.round(val*ncrans);
  
  for(let i=0;i<ncrans;i++){
    const cxi=x+4+i*12;
    R(cxi,ty+3,8,h-6,i<filled?'#e08a3c':'#2b221a');
    if(i<filled) R(cxi,ty+3,8,2,'#ffd9a0');
  }
  
  const phx = x + Math.round(val * (w - 12));
  
  R(phx,ty-3,12,h+6,'#c99e6a');
  R(phx,ty-3,12,3,'#e9d3a8'); R(phx,ty+h,12,3,'#8a6136');
  R(phx+4,ty+3,4,h-6,'#8a6136');
  txt(Math.round(val*100)+'%',x+w+8,ty+h-4,15,'#c9b58a');
  
  hot(x,ty,w,h,()=>{ sliderDrag={x,w,set}; }, 'pointer');
  hot(phx,ty-3,12,h+6,()=>{ sliderDrag={x,w,set}; }, 'pointer');
}
let sliderDrag=null;
function updateSliderFromMouse(d){
  const mx=mouse.x;
  const w=d.w||200;  
  const v=clamp((mx-d.x)/w,0,1);
  d.set(Math.round(v*20)/20);  
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
    const bodyLines=t.body?wrap(t.body,w-28,16):[];
    const th=32+Math.max(1,t.title?wrap(t.title,w-28,20).length:1)*20+bodyLines.length*15;
    R(tx,y,w,th,'#2b221a');
    ctx.lineWidth=2; ctx.strokeStyle='#55432c'; ctx.strokeRect(tx,y,w,th);
    R(tx,y,5,th,t.good?'#8faf6a':'#e08a3c');
    let ly=y+22;
    for(const l of (t.title?wrap(t.title,w-28,20):[])){ txt(l,tx+14,ly,20,t.good?'#c9dda0':'#ffd9a0'); ly+=21; }
    for(const l of bodyLines){ txt(l,tx+14,ly,16,'#9c8a70'); ly+=15; }
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

function entTipLines(e){
  const L=[];
  if(e.kind==='belt'){
    if(isSout(e)){
      const out=soutOf(e);
      const exit=soutEntranceOf(e);
      L.push({t:T('ui.ttSoutTitle')+(e.lvl?T('ui.ttLvl')+e.lvl:'')+(exit?T('ui.ttSoutExit'):T('ui.ttSoutEntry')),c:'#fff3d8',sz:20});
      if(exit) L.push({t:T('ui.ttTunnelFrom',{X:exit.x+1,Y:exit.y+1}),c:'#8faf6a'});
      else if(out) L.push({t:T('ui.ttTunnelTo',{X:out.x+1,Y:out.y+1}),c:'#8faf6a'});
      else L.push({t:T('ui.ttEntryNoExit'),c:'#f0a35e'});
      if(!out&&!exit) L.push({t:T('ui.ttOrDemolish'),c:'#9c8a70'});
      if(e.item) L.push({t:T('ui.ttContains')+ITEMS[e.item.t].name,c:ITEMS[e.item.t].c});
      if(e.blockedT>1.5) L.push({t:T('ui.ttSoutBlocked'),c:'#e8926f'});
      return L;
    }
    const cvName=e.curve===1?T('ui.ttCvRight'):(e.curve===2?T('ui.ttCvLeft'):'');
    L.push({t:T('ui.ttConveyorTitle')+cvName+(e.lvl?T('ui.ttLvl')+e.lvl:''),c:'#fff3d8',sz:20});
    L.push({t:T('ui.ttSpeed')+f1(beltSpeedOf(e)*10)+T('ui.ttTilesSec')+' '+T('ui.ttClickInfo'),c:'#9c8a70'});
    if(e.curve) L.push({t:T('ui.ttCurveEntry')+(e.curve===1?T('ui.ttRight'):T('ui.ttLeft'))+T('ui.ttOfThisSense'),c:'#9c8a70'});
    if(e.item) L.push({t:T('ui.ttContains')+ITEMS[e.item.t].name,c:ITEMS[e.item.t].c});
    if(e.blockedT>1.5) L.push({t:T('ui.ttBeltBlocked'),c:'#e8926f'});
    return L;
  }
    if(isDock(e.type)){
      const f=fpSize(e.type,e.rot);
      L.push({t:MACHINES[e.type].name,c:'#fff3d8',sz:20});
      L.push({t:T('ui.ttInstantSale')+f.w+'×'+f.h+'.',c:'#8faf6a'});
      if(e.locked) L.push({t:T('ui.ttDockImposed'),c:'#e8c96a'});
      return L;
    }
    if(e.type==='benne'){
      L.push({t:T('ui.ttBenneTitle'),c:'#fff3d8',sz:20});
      L.push({t:T('ui.ttBenneReject'),c:'#c9b58a'});
      L.push({t:T('ui.ttBenneNote'),c:'#9c8a70'});
      return L;
    }
    const def=MACHINES[e.type];
    L.push({t:def.name+(e.lvl?' — niv. '+e.lvl:''),c:'#fff3d8',sz:20});
  if(def.desc) L.push({t:def.desc,c:'#9c8a70'});
  if(e.type==='repartiteur'){
    const cfg=repCfg(e);
    L.push({t:T('ui.ttBuffer')+e.queue.length+' / '+repCap(e)+T('ui.ttItems'),c:'#c9b58a'});
    const inTxt=cfg.in==='left'?T('ui.ttIn1Prio'):(cfg.in==='right'?T('ui.ttIn2Prio'):T('ui.ttInEqual'));
    const priTxt=cfg.pri==='A'?T('ui.ttOutAPrio'):(cfg.pri==='B'?T('ui.ttOutBPrio'):T('ui.ttOutAlt'));
    L.push({t:T('ui.ttSettings')+inTxt+' · '+priTxt+'.',c:'#e0b552'});
    const fA=(cfg.outA&&cfg.outA.items)||[], fB=(cfg.outB&&cfg.outB.items)||[];
    if(fA.length||fB.length){
      L.push({t:T('ui.ttFilterA')+(fA.length?fA.map(k=>ITEMS[k].name).join(', '):T('ui.ttEverything'))+'.',c:'#9c8a70'});
      L.push({t:T('ui.ttFilterB')+(fB.length?fB.map(k=>ITEMS[k].name).join(', '):T('ui.ttEverything'))+'.',c:'#9c8a70'});
    }else{
      L.push({t:T('ui.ttNoFilter'),c:'#9c8a70'});
    }
    if(e.blockedT>1.5) L.push({t:T('ui.ttRepBlocked'),c:'#e8926f'});
    return L;
  }
  if(def.in) L.push({t:T('ui.ttRecipe')+recIn(def.in)+' → '+ITEMS[def.out].name,c:'#c9b58a'});
  else if(def.out) L.push({t:T('ui.ttProduct')+ITEMS[def.out].name+' / '+f1(def.time)+' s',c:'#c9b58a'});
  if(def.time&&def.in) L.push({t:T('ui.ttCycle')+f1(def.time/speedMultOf(e))+T('ui.ttCycleSuf')+multFmt(speedMultOf(e))+T('ui.ttCycleEnd'),c:'#9c8a70'});
  L.push({t:T('ui.ttEntries'),c:'#8a755c'});
  if(def.in){
    const parts=Object.keys(def.in).map(k=>{
      const have=e.inBuf[k]||0, need=def.in[k];
      return {t:ITEMS[k].name+' '+have+'/'+need+(have>=need*2+1?T('ui.ttFull'):''), c:have>=need?ITEMS[k].c:'#9c8a70'};
    });
    L.push({t:T('ui.ttInputs'),c:'#9c8a70'});
    for(const p of parts) L.push(p);
  }
  if(e.outItem){ const d=diagnoseOut(e); if(d.length) L.push(...d); }
  else if(e.active) L.push({t:T('ui.ttFabricating')+Math.round(100*e.timer/def.time)+' %',c:'#8faf6a'});
  else if(def.in){
    const missing=Object.keys(def.in).filter(k=>(e.inBuf[k]||0)<def.in[k]);
    if(missing.length){
      L.push({t:T('ui.ttWaiting')+missing.map(k=>(def.in[k]-(e.inBuf[k]||0))+'× '+ITEMS[k].name).join(', ')+'.',c:'#f0a35e'});
      const mach=Object.keys(MACHINES).find(mt=>mt!==e.type&&MACHINES[mt].out===missing[0]);
      if(mach) L.push({t:T('ui.ttBuildMachine',{N:MACHINES[mach].name}),c:'#f0a35e'});
    }
  }else L.push({t:T('ui.ttReady'),c:'#8faf6a'});
  return L;
}
function recIn(need){ return Object.keys(need).map(k=>need[k]+'× '+ITEMS[k].name).join(' + '); }

function diagnoseOut(e){
  for(const c of outCells(e)){
    const t=cellAt(c.x,c.y);
    if(!t) continue;
    if(t.kind==='belt'){
      if(t.item) return [{t:T('ui.dgBeltBusy'),c:'#e8926f'}];
      if(t.curve&&t.rot!==e.rot)
        return [{t:T('ui.dgBadCurve')+DIRNAMES[t.rot]+T('ui.dgExpectFlow'),c:'#e8926f'},
                {t:T('ui.dgBadCurveFix'),c:'#f0a35e'}];
      const d=DIRS[t.rot];
      if(cellAt(t.x+d.x,t.y+d.y)===e)
        return [{t:T('ui.dgBeltPoints'),c:'#e8926f'},
                {t:T('ui.dgTurnBelt'),c:'#f0a35e'}];
      return [];
    }
    const tdef=MACHINES[t.type];
    if(isDock(t.type)) return [];
    if(t.type==='repartiteur'){
      const push=DIRS[e.rot], tout=DIRS[t.rot];
      if(push.x!==tout.x||push.y!==tout.y)
        return [{t:T('ui.dgRepBadOrient'),c:'#e8926f'},
                {t:T('ui.dgTurnIt'),c:'#f0a35e'}];
      if(t.queue.length>=repCap(t))
        return [{t:T('ui.dgRepFull'),c:'#e8926f'},
                {t:T('ui.dgUnclog'),c:'#f0a35e'}];
      return [];
    }
    const push=DIRS[e.rot], face=DIRS[t.rot];
    if(push.x===-face.x&&push.y===-face.y)
      return [{t:T('ui.dgFaceToFace')+tdef.name+T('ui.dgFaceToFaceEnd'),c:'#e8926f'},
              {t:T('ui.dgTurn2')+tdef.name+T('ui.dgTurnAction'),c:'#f0a35e'}];
    const need=tdef.in;
    if(!need||!need[e.outItem])
      return [{t:T('ui.dgNoConsume1')+tdef.name+T('ui.dgNoConsume2')+ITEMS[e.outItem].name+T('ui.dgExpectFlow'),c:'#e8926f'},
              {t:(need?T('ui.dgItWaits')+recIn(need)+T('ui.dgDot'):T('ui.dgNoInput')),c:'#f0a35e'}];
    if((t.inBuf[e.outItem]||0)>=need[e.outItem]*2+1)
      return [{t:T('ui.dgInputFull')+tdef.name+T('ui.dgInputFullEnd'),c:'#e8926f'},
              {t:T('ui.dgItDrains'),c:'#f0a35e'}];
    return [];
  }
  return [{t:T('ui.dgNothingAhead'),c:'#e8926f'},
          {t:T('ui.dgPlaceBelt'),c:'#f0a35e'}];
}

function drawHUD(){
  R(hudX,hudY,blockW,hudH,'#241c15');
  R(hudX,hudY+hudH-3,blockW,3,'#4a3a28');
  let x=hudX+16;
  const mstr=fmt(state.money)+' $';
  txt(mstr,x,hudY+31,24,'#e0b552');
  x+=txtW(mstr,24)+6;
  txt('(+ '+fmt(state.rate.money)+'/s)',x,hudY+31,15,'#9c8a70');
  x+=txtW('(+ '+fmt(state.rate.money)+'/s)',15)+26;
  txt(T('ui.hudScience'),x,hudY+31,17,'#9c8a70');
  x+=txtW(T('ui.hudScience'),17)+6;
  const sstr=fmtSci(state.sci);
  txt(sstr,x,hudY+31,22,'#9fc4d4');
  x+=txtW(sstr,22)+5;
  txt('(+ '+fmtSci(state.rate.sci)+'/s)',x,hudY+31,15,'#9c8a70');
  x+=txtW('(+ '+fmtSci(state.rate.sci)+'/s)',15)+26;
  txt(T('ui.hudBonus')+'×'+multFmt(sellMult()),x,hudY+31,17,'#c9b58a');
  /* boutons collés au bord droit du bloc */
  let bx=hudX+blockW-10;
  const btns=[
    [T('ui.hudMenu'),'M',()=>toggleModal('menu'),{}],
    [T('ui.hudRecipes'),'C',()=>toggleModal('recipes'),{}],
    [T('ui.hudResearch'),'U',()=>toggleModal('research'),{primary:true}],
  ];
  for(const [lab,key,fn,o] of btns){
    const w=txtW(lab,9,'s')+40;
    bx-=w+6;
    button(bx,hudY+9,w,28,lab,fn,Object.assign({key},o));
  }
}
function drawSide(){
  const x=sideX, y=sideY, w=sideW, h=sideH;
  R(x,y,w,h,'#221a13');
  R(x,y,3,h,'#4a3a28');
  let cy=y+18;
  txt(T('ui.sideObjectives'),x+14,cy,8,'#ffd9a0','left','s'); cy+=14;
  const F=FACTORIES[state.factoryIdx];
  const doneN=state.factoryDone.filter(Boolean).length;
  txt(F.name,x+14,cy,13,'#8a755c'); cy+=7;
  txt(GRADES[doneN]+' · '+T('ui.sideGrid')+' '+state.gridW+'×'+state.gridH,x+14,cy+7,12,'#6b563c');
  cy+=22;
  for(const g of F.goals){
    const v=goalVal(g), done=v>=g.n;
    const counter=fmt(Math.min(v,g.n))+'/'+fmt(g.n);
    const counterW=txtW(counter,14)+8;
    checkbox(x+14,cy-11,13,done);
    const full=goalText(g);
    const maxTxt=w-45-counterW-8;
    let lines=wrap(full,maxTxt,15);
    const tronque=lines.length>1;
    if(tronque) lines=[lines[0].slice(0,Math.max(0,lines[0].length-1))+'…'];
    txt(lines[0],x+33,cy,15,done?'#8faf6a':'#e6d6b8');
    txt(counter,x+w-12,cy,14,done?'#8faf6a':'#c9b58a','right');
    if(tronque){
      const gy=cy-12;
      hot(x+14,gy,w-28,15,noop);
      if(mouse.x>=x+14&&mouse.x<x+w-14&&mouse.y>=gy&&mouse.y<gy+15&&!state.modal)
        sideTip=[{t:full,c:'#e6d6b8',sz:16}];
    }
    cy+=16;
    R(x+33,cy-5,w-104,3,'#141009');
    R(x+33,cy-5,Math.round((w-104)*Math.min(1,v/g.n)),3,done?'#8faf6a':'#e08a3c');
    cy+=10;
  }
  
  if(state.letter===null||state.letter===undefined){
    const nMach=state.entities.filter(e=>e.kind==='machine').length;
    const nBelt=state.entities.length-nMach;
    txt(nMach+(nMach>1?' '+T('ui.sideMachinesP'):' '+T('ui.sideMachinesS'))+' · '+nBelt+(nBelt>1?' '+T('ui.sideBeltsP'):' '+T('ui.sideBeltsS')),x+14,cy+2,13,'#6b563c');
    cy+=18;
  }

  if(allGoalsDone()){
    R(x+8,cy,w-16,84,'#3a2a1a');
    ctx.lineWidth=2; ctx.strokeStyle='#e08a3c'; ctx.strokeRect(x+8,cy,w-16,84);
    txt(T('ui.sidePromoTitle'),x+16,cy+16,8,'#ffd9a0','left','s');
    txt(T('ui.sidePromoL1'),x+16,cy+33,15,'#e6d6b8');
    txt(T('ui.sidePromoL2'),x+16,cy+48,15,'#e6d6b8');
    button(x+16,cy+56,w-32,20,T('ui.sidePromoBtn'),()=>openModal('promo'),{primary:true,pulse:true,small:true});
    cy+=94;
  }
  if(state.inspect){
    if(state.entities.includes(state.inspect)) cy=drawSideMachine(x,w,cy);
    else state.inspect=null;
  }
  const jy=Math.max(cy+6,y+h-114);
  R(x+12,jy,w-24,2,'#3a2d20');
  txt(T('ui.sideJournal'),x+14,jy+13,8,'#8a755c','left','s');
  const maxE=Math.max(0,Math.floor((y+h-16-(jy+22))/15));
  let ly=jy+24;
  for(const l of log.slice(0,Math.min(6,maxE))){
    txt('> '+l.title,x+14,ly,14,'#9c8a70');
    ly+=15;
  }
}
/* ══ Réglages du répartiteur (panneau latéral, section SÉLECTION) ══
   1 ligne priorité d'entrée · 1 ligne répartition · par sortie :
   une rangée de mini-icônes d'items (filtre) + un badge TOUT/FILTRÉ.
   Les icônes sont cliquables : ajout/retrait de l'item au filtre de la sortie. */
function drawRepConfig(x,w,by,e){
  const cfg=repCfg(e);
  const bw=(w-40)/3;
  /* ── priorité d'entrée ── */
  txt(T('ui.rcInPriority'),x+16,by+9,8,'#ffd9a0','left','s');
  const inOpts=[['auto',T('ui.rcEquality')],['left',T('ui.rcIn1')],['right',T('ui.rcIn2')]];
  let bx=x+16;
  for(const [val,lab] of inOpts){
    const sel=cfg.in===val;
    button(bx,by+14,bw-2,18,lab,()=>{ cfg.in=val; uiSnd('tab'); saveGame(); },{primary:sel,small:true});
    bx+=bw;
  }
  by+=38;
  /* ── répartition des sorties ── */
  txt(T('ui.rcOutDist'),x+16,by+9,8,'#ffd9a0','left','s');
  const outOpts=[['auto',T('ui.rcAlternating')],['A',T('ui.rcOutA')],['B',T('ui.rcOutB')]];
  bx=x+16;
  for(const [val,lab] of outOpts){
    const sel=cfg.pri===val;
    button(bx,by+14,bw-2,18,lab,()=>{ cfg.pri=val; uiSnd('tab'); saveGame(); },{primary:sel,small:true});
    bx+=bw;
  }
  by+=38;
  /* ── filtres par sortie ── */
  const keys=Object.keys(ITEMS);
  const cell=Math.min(22,(w-58)/keys.length);
  for(const side of [1,-1]){
    const label=side>0?T('ui.rcOutA'):T('ui.rcOutB');
    const f=side>0?cfg.outA:cfg.outB;
    const items=(f&&f.items)||[];
    const filtered=items.length>0;
    txt(label+(filtered?T('ui.rcFiltered',{N:items.length}):T('ui.rcAcceptAll')),x+16,by+9,8,filtered?'#e0b552':'#9c8a70','left','s');
    /* bouton RAZ */
    button(x+w-64,by+2,48,14,T('ui.rcReset'),()=>{
      if(side>0) cfg.outA=null; else cfg.outB=null;
      uiSnd('tab'); saveGame();
    },{small:true,disabled:!filtered});
    let ix=x+16;
    for(const k of keys){
      const on=items.includes(k);
      ctx.globalAlpha=on?1:.3;
      ctx.drawImage(getItemIcon(k),ix,by+16,18,18);
      ctx.globalAlpha=1;
      if(on){
        ctx.lineWidth=2; ctx.strokeStyle='#e0b552';
        ctx.strokeRect(ix-1,by+15,20,20);
      }
      hot(ix,by+16,18,18,()=>{
        const arr=(side>0?(cfg.outA&&cfg.outA.items):(cfg.outB&&cfg.outB.items))||[];
        const i=arr.indexOf(k);
        if(i>=0) arr.splice(i,1);
        else arr.push(k);
        if(side>0) cfg.outA={items:arr}; else cfg.outB={items:arr};
        uiSnd('tab'); saveGame();
      });
      ix+=cell;
    }
    by+=42;
  }
  return by+4;
}

function drawSideMachine(x,w,cy){
  const e=state.inspect, def=MACHINES[e.type], lvl=e.lvl||0;
  const upgable=!isDock(e.type)&&e.kind!=='belt'&&e.type!=='repartiteur';
  const iw=w-32;
  const L=[];
  if(e.kind==='belt'){
    if(isSout(e)){
      const out=soutOf(e);
      const exit=soutEntranceOf(e);
      if(exit) L.push({t:T('ui.smSoutExit',{X:exit.x+1,Y:exit.y+1}),c:'#8faf6a'});
      else if(out) L.push({t:T('ui.smSoutEntry',{X:out.x+1,Y:out.y+1}),c:'#8faf6a'});
      else L.push({t:T('ui.smNoExit'),c:'#f0a35e'});
      L.push({t:T('ui.smRange'),c:'#9c8a70'});
    }else{
      L.push({t:T('ui.smSpeed')+f1(beltSpeedOf(e)*10)+T('ui.ttTilesSec2'),c:'#c9b58a'});
      if(e.curve) L.push({t:T('ui.smCurve')+(e.curve===1?T('ui.ttRight'):T('ui.ttLeft'))+T('ui.smCurveEntry'),c:'#9c8a70'});
    }
    if(e.item) L.push({t:T('ui.ttContains')+ITEMS[e.item.t].name,c:ITEMS[e.item.t].c});
    if(e.blockedT>1.5) L.push({t:T('ui.smBlockedBelt'),c:'#e8926f'});
  }else if(isDock(e.type)){
    const f=fpSize(e.type,e.rot);
    L.push({t:T('ui.smInstant'),c:'#8faf6a'});
    L.push({t:T('ui.smFaces')+f.w+'×'+f.h+T('ui.smFacesSuf'),c:'#9c8a70'});
    if(e.locked) L.push({t:T('ui.smDockMission'),c:'#e8c96a'});
  }else if(e.type==='benne'){
    L.push({t:T('ui.smQuarter'),c:'#c9b58a'});
    L.push({t:T('ui.smSkip4'),c:'#9c8a70'});
  }else if(e.type==='repartiteur'){
    L.push({t:T('ui.smSpeed')+f1(beltSpeedOf(e)*10)+T('ui.ttTilesSec2')+T('ui.smResearch'),c:'#c9b58a'});
    L.push({t:T('ui.smBuffer')+e.queue.length+' / '+repCap(e),c:'#c9b58a'});
    const cfg=repCfg(e);
    L.push({t:cfg.in==='left'?T('ui.smIn1Prio'):(cfg.in==='right'?T('ui.smIn2Prio'):T('ui.smInEqual')),c:'#e0b552'});
    L.push({t:cfg.pri==='A'?T('ui.smOutAPrio'):(cfg.pri==='B'?T('ui.smOutBPrio'):T('ui.smOutAlt')),c:'#e0b552'});
    const fA=(cfg.outA&&cfg.outA.items)||[], fB=(cfg.outB&&cfg.outB.items)||[];
    if(fA.length) L.push({t:T('ui.ttFilterA')+fA.map(k=>ITEMS[k].name).join(', '),c:'#9c8a70'});
    if(fB.length) L.push({t:T('ui.ttFilterB')+fB.map(k=>ITEMS[k].name).join(', '),c:'#9c8a70'});
    if(!fA.length&&!fB.length) L.push({t:T('ui.smNoFilter'),c:'#9c8a70'});
    if(e.blockedT>1.5) L.push({t:T('ui.smBlocked'),c:'#e8926f'});
    else if(e.queue.length) L.push({t:T('ui.smInTransit')+e.queue.length+T('ui.smItems'),c:'#8faf6a'});
  }else{
    if(def.in) L.push({t:T('ui.ttRecipe')+recIn(def.in)+' → '+ITEMS[def.out].name,c:'#c9b58a'});
    else L.push({t:T('ui.ttProduct')+ITEMS[def.out].name,c:'#c9b58a'});
    L.push({t:T('ui.ttCycle')+f1(def.time/speedMultOf(e))+T('ui.ttCycleSuf')+multFmt(speedMultOf(e))+T('ui.ttCycleEnd'),c:'#9c8a70'});
    if(def.in) for(const k in def.in){
      const have=e.inBuf[k]||0;
      L.push({t:ITEMS[k].name+' : '+have+' / '+def.in[k]+(have>=def.in[k]*2+1?T('ui.ttFull'):''),c:have>=def.in[k]?ITEMS[k].c:'#9c8a70'});
    }
    if(e.outItem){ const d=diagnoseOut(e); if(d.length) L.push(...d); }
    else if(e.active) L.push({t:T('ui.smFabricating')+Math.round(100*e.timer/def.time)+' %',c:'#8faf6a'});
    else if(def.in) L.push({t:T('ui.smWaitingIng'),c:'#f0a35e'});
    else L.push({t:T('ui.ttReady'),c:'#8faf6a'});
  }
  const WL=[];
  for(const l of L) for(const s of wrap(l.t,iw,14)) WL.push({t:s,c:l.c});
  const bottomLimit=sideY+sideH-112;
  if(bottomLimit-cy<130) return cy;
  /* Zone d'info à HAUTEUR FIXE : les diagnostics « SORTIE BLOQUÉE »
     n'ajoutent plus de lignes variables — les boutons ne bougent plus
     quand l'état de la machine change. Les lignes surnuméraires sont
     tronquées avec un marqueur. */
  const INFO_LINES=8;
  const isRep=e.type==='repartiteur';
  /* répartiteur : + les blocs de réglages (2×38 + 2×42 + en-tête ~10) */
  const repExtra=isRep?170:0;
  const fixed=(upgable?152:112)+repExtra;
  const maxLines=Math.max(0,Math.floor((bottomLimit-cy-fixed)/15));
  const cap=Math.min(INFO_LINES,Math.max(0,maxLines));
  const shown=WL.slice(0,cap);
  const hSec=74+INFO_LINES*15+(upgable?64:24)+14+repExtra;
  R(x+8,cy,w-16,hSec,'#2b221a');
  ctx.lineWidth=2; ctx.strokeStyle='#6a5236'; ctx.strokeRect(x+8,cy,w-16,hSec);
  txt(T('ui.selTitle'),x+16,cy+14,8,'#ffd9a0','left','s');
  button(x+w-84,cy+4,72,18,T('ui.modalClose2'),()=>{state.inspect=null;},{small:true});
  /* icône + nom + niveau */
  ctx.drawImage(getMachineIcon(e.type),x+14,cy+22,36,36);
  let ny=cy+32;
  for(const nl of wrap(def.name,w-96,8,'s').slice(0,2)){ txt(nl,x+56,ny,8,'#fff3d8','left','s'); ny+=12; }
  if(upgable){
    txt(T('ui.selLevel')+lvl+'/'+MAXLVL,x+56,cy+62,13,lvl>0?'#e8c96a':'#9c8a70');
    pips(x+120,cy+54,lvl,5);
  }
  let iy=cy+74;
  for(const l of shown){ txt(l.t,x+16,iy,14,l.c); iy+=15; }
  if(WL.length>cap) txt(T('ui.selMore',{N:WL.length-cap}),x+16,iy,13,'#6b563c');
  let by=cy+74+INFO_LINES*15+6;
  if(isRep){
    /* réglages du répartiteur : priorités, répartition, filtres d'items */
    txt(T('ui.selSettings'),x+16,by+9,8,'#ffd9a0','left','s');
    by=drawRepConfig(x,w,by+14,e);
  }
  if(upgable){
    if(lvl<MAXLVL){
      const c=upCost(e);
      button(x+16,by,w-32,24,T('ui.selUpgrade')+fmt(c)+' $',()=>upgradeEntity(e),{primary:true,disabled:state.money<c,small:true});
    }else{
      button(x+16,by,w-32,24,T('ui.selMax'),noop,{disabled:true,small:true});
    }
    by+=28;
    txt(T('ui.selSpeedNote'),x+w/2,by+7,11,'#8a755c','center');
    by+=16;
  }
  const bw=(w-48)/2;
  if(!isDock(e.type)){
    button(x+16,by,bw,24,T('ui.selTurn'),()=>rotateEntity(e),{small:true});
    const armed=(e.demolishArm&&Date.now()-e.demolishArm<2000);
    button(x+24+bw,by,bw,24,armed?T('ui.selConfirm'):T('ui.selDemolish'),()=>{
      if(!armed){ e.demolishArm=Date.now(); uiSnd('danger'); return; }
      e.demolishArm=0;
      demolishAt(e.x,e.y);
    },{danger:true,small:true});
  }else{
    const armed=(e.demolishArm&&Date.now()-e.demolishArm<2000);
    button(x+16,by,w-32,24,armed?T('ui.selConfirm'):T('ui.selDemolish'),()=>{
      if(!armed){ e.demolishArm=Date.now(); uiSnd('danger'); return; }
      e.demolishArm=0;
      demolishAt(e.x,e.y);
    },{danger:true,small:true});
  }
  return cy+hSec+8;
}

const CAT_LABELS={logistique:'RUBANS',extraction:'PAPIER',ondulation:'ONDULATION',transformation:'ATELIERS',assemblage:'PRODUITS',vente:'QUAI'};
function textLink(x,y,key,label,fn,active,dim){
  const kw=txtW(key,9,'s')+6;
  const w=kw+txtW(label,9,'s');
  const hov=mouse.x>=0&&inRect(mouse.x,mouse.y,x-3,y-11,w+9,15);
  if(hov||active) R(x-3,y-11,w+9,15,active?'#4a2418':'#3a2a1a');
  txt(key,x,y,9,active?'#e8926f':(dim?'#6b563c':'#e08a3c'),'left','s');
  txt(label,x+kw,y,9,active?'#ffd9a0':(dim?'#6b563c':(hov?'#ffd9a0':'#e6d6b8')),'left','s');
  if(!dim) hot(x-3,y-11,w+9,15,fn);
}

function drawBar(){
  const y=barY;
  R(blockX,y,blockW,barH,'#241c15');
  R(blockX,y,blockW,3,'#4a3a28');
  const lx=blockX+12;
  textLink(lx,y+18,'R',T('ui.barTurn'),rotateAction,false);
  textLink(lx,y+40,'X',T('ui.barDemolish'),toggleDestroy,build.destroy);
  const cvLabel=build.curve===1?T('ui.barCvRight'):(build.curve===2?T('ui.barCvLeft'):T('ui.barCvStraight'));
  const cvSel=build.type==='convoyeur';
  textLink(lx,y+62,'T',cvLabel,()=>{
    if(build.type!=='convoyeur') selectTool('convoyeur');
    else build.curve=((build.curve||0)+1)%3;
  },cvSel&&build.curve>0,!cvSel);
  ctx.save(); ctx.translate(lx+96,y+15); ctx.rotate(build.rot*Math.PI/2);
  px(ctx,1.5,-7,-2,10,4,'#d8c193');
  px(ctx,1.5,-2,-6,4,4,'#f6e8c2');
  px(ctx,1.5,-2,2,4,4,'#f6e8c2');
  ctx.restore();
  R(blockX+126,y+8,2,barH-16,'#3a2d20');
  const tabY=y+6, tabH=20;
  let tx=blockX+138;
  for(const [cat,types] of CATS){
    if(dockLocked()&&cat==='vente') continue;  
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
  const ty=y+30, th=barH-38;
  const ox0=blockX+138, availW=blockW-138-30;
  let x=ox0-state.barScroll, slot=1;
  for(const type of toolOrder){
    if(!MACHINES[type]) continue;  
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
  if(d.in) L.push({t:T('ui.ttRecipe')+recIn(d.in)+' → '+ITEMS[d.out].name,c:'#c9b58a'});
  else if(d.out) L.push({t:T('ui.ttProduct')+ITEMS[d.out].name+' / '+f1(d.time)+' s',c:'#c9b58a'});
  L.push({t:T('ui.tbCost')+fmt(cost)+' $'+T('ui.tbOwned')+cnt(type),c:'#e0b552'});
  if(type==='convoyeur'){
    L.push({t:T('ui.tbCv1'),c:'#9c8a70'});
    const cvm=build.curve===1?T('ui.barCvRight'):(build.curve===2?T('ui.barCvLeft'):T('ui.barCvStraight'));
    L.push({t:T('ui.tbCv2',{V:cvm}),c:'#9c8a70'});
    L.push({t:T('ui.tbCv3'),c:'#9c8a70'});
  }
  else if(type==='ruban_sout'){
    L.push({t:T('ui.tbSout1'),c:'#9c8a70'});
    L.push({t:T('ui.tbSout2'),c:'#9c8a70'});
    L.push({t:T('ui.tbSout3'),c:'#9c8a70'});
  }
  else if(type==='repartiteur'){ L.push({t:T('ui.tbRep1'),c:'#9c8a70'});
    L.push({t:T('ui.tbRep2'),c:'#e0b552'}); }
  else if(isDock(type)){
    const f=dockSize(type);
    L.push({t:f.w+'×'+f.h+T('ui.tbDock'),c:'#9c8a70'});
  }
  else if(type==='benne'){
    L.push({t:T('ui.tbBenne1'),c:'#9c8a70'});
    L.push({t:T('ui.tbBenne2'),c:'#9c8a70'});
    L.push({t:T('ui.tbBenne3'),c:'#9c8a70'});
  }
  else{
    const f=fpSize(type,0);
    L.push({t:Math.min(f.w,f.h)+'×'+Math.max(f.w,f.h)+T('ui.tbMach'),c:'#9c8a70'});
  }
  return L;
}
function tutVisible(){
  return state.screen==='game'
    &&(state.letter===null||state.letter===undefined)
    &&!state.tutDone&&state.tut<TUT.length;
}
function tutBoxH(){
  if(!tutVisible()) return 0;
  /* texte à partir de y+40, boutons sur y+h-28..y+h-4 : la hauteur
     couvre en-tête + lignes + bande de boutons, sans chevauchement */
  return 40+wrap(TUT[state.tut].text,Math.min(600,gameW-60),19).length*19+38;
}
/* Lettre du siège */
function drawLetter(){
  const idx=state.letter;
  if(idx===null||idx===undefined) return;
  const F=FACTORIES[idx];
  const w=Math.min(560,W-40), h=Math.min(470,H-30);
  const x=(W-w)/2, y=(H-h)/2;
  ctx.fillStyle='rgba(10,7,5,.78)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#0b0806'; ctx.fillRect(x+4,y+4,w,h);
  ctx.fillStyle='#e9ddc0'; ctx.fillRect(x,y,w,h);           
  ctx.fillStyle='#d9c9a0'; ctx.fillRect(x,y,w,6);           
  ctx.fillStyle='#b9a67c'; ctx.fillRect(x,y+h-6,w,6);   
  R(x+18,y+18,20,20,'#c99e6a');
  R(x+18,y+22,20,3,'#8a6136'); R(x+18,y+27,20,3,'#8a6136'); R(x+18,y+32,20,3,'#8a6136');
  txt(T('ui.letterCompany'),x+46,y+30,9,'#8a6136','left','s');
  txt(T('ui.letterDivision'),x+46,y+44,13,'#a08a60');
  ctx.strokeStyle='#b9a67c'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x+18,y+56); ctx.lineTo(x+w-18,y+56); ctx.stroke();
  const first=!state.lettersRead[idx];
  if(first){
    const body=LETTERS['intro'+idx]||LETTERS.intro0;
    let cy=y+86;
    for(const para of body.split('\n')){
      if(!para){ cy+=8; continue; }
      for(const l of wrap(para,w-70,16)) { txt(l,x+36,cy,16,'#4a3826'); cy+=17; }
      cy+=6;
    }
    const gy=Math.min(cy+6,y+h-150);
    R(x+24,gy,w-48,2,'#b9a67c');
    txt(T('ui.letterGoalsTitle'),x+36,gy+16,8,'#8a6136','left','s');
    let ly=gy+32;
    for(const g of F.goals){
      txt('— '+goalText(g),x+36,ly,15,'#4a3826'); ly+=16;
    }
    txt(T('ui.letterSignature'),x+w-30,y+h-70,13,'#a08a60','right');
    txt(T('ui.letterApproval'),x+w-30,y+h-54,12,'#b9a67c','right');
    const tut=(idx===0&&!state.tutDone);
    if(tut){
      const bw=(w-76)/2;
      button(x+24,y+h-40,bw,28,T('ui.letterBtnTut'),()=>{ uiSnd('confirm'); state.letter=null; state.lettersRead[idx]=true; },{primary:true,small:true});
      button(x+36+bw,y+h-40,bw,28,T('ui.letterBtnSkipTut'),()=>{
        uiSnd('close');
        state.letter=null;
        state.lettersRead[idx]=true;
        finishTut();
      },{small:true});
    }else{
      button(x+24,y+h-40,w-48,28,T('ui.letterBtnTakePost'),()=>{ uiSnd('confirm'); state.letter=null; state.lettersRead[idx]=true; },{primary:true,small:true});
    }
  }else{
    const g=state.letterGain||{sec:0,m:0,s:0};
    const dur=g.sec>=3600?Math.floor(g.sec/3600)+' h '+Math.floor(g.sec/60)%60+' min'
             :(g.sec>=60?Math.floor(g.sec/60)+' min '+Math.floor(g.sec%60)+' s'
             :Math.floor(g.sec)+' s');
    txt(T('ui.letterNoteReturn'),x+36,y+86,10,'#8a6136','left','s');
    let cy=y+112;
    for(const l of wrap(T('ui.letterWelcomeBack')+F.name+T('ui.letterAwayFor')+dur+'.',w-70,16)){ txt(l,x+36,cy,16,'#4a3826'); cy+=17; }
    cy+=10;
    if(g.m>=1||g.s>=0.1){
      txt('+ '+fmt(g.m)+' $',x+36,cy+8,26,'#7a5a10'); cy+=30;
      txt('+ '+fmtSci(g.s)+T('ui.letterScience'),x+36,cy+4,20,'#4a5a6a'); cy+=24;
      txt(T('ui.letterGainsNote'),x+36,cy,13,'#a08a60'); cy+=20;
    }else{
      for(const l of wrap(T('ui.letterNoGains'),w-70,15)){ txt(l,x+36,cy,15,'#4a3826'); cy+=16; }
    }
    txt(T('ui.letterSigShort'),x+w-30,y+h-70,13,'#a08a60','right');
    button(x+24,y+h-40,w-48,28,T('ui.letterBtnResume'),()=>{ uiSnd('confirm'); state.letter=null; state.letterGain=null; },{primary:true,small:true});
  }
}
function drawTutorial(){
  if(!tutVisible()) return;
  const st=TUT[state.tut];
  const w=Math.min(640,gameW-16), x=gameX+(gameW-w)/2, y=gameY+8, h=tutBoxH();
  R(x+3,y+3,w,h,'#0b0806');
  R(x,y,w,h,'rgba(22,16,10,.94)');
  ctx.lineWidth=2; ctx.strokeStyle='#e08a3c'; ctx.strokeRect(x+1,y+1,w-2,h-2);
  txt(T('ui.tutStep')+(state.tut+1)+'/'+TUT.length+' — '+st.title.toUpperCase(),x+14,y+20,8,'#ffd9a0','left','s');
  let yy=y+40;
  for(const l of wrap(st.text,w-28,19)){ txt(l,x+14,yy,19,'#e6d6b8'); yy+=19; }
  if(st.last){
    const bw2=txtW(T('ui.tutBtnFinish'),8,'s')+30;
    button(x+w-20-bw2,y+h-28,bw2,24,T('ui.tutBtnFinish'),()=>{ uiSnd('confirm'); finishTut(); },{primary:true,small:true});
  }else{
    const bw2=txtW(T('ui.tutBtnSkip'),8,'s')+26;
    button(x+14,y+h-28,bw2,24,T('ui.tutBtnSkip'),()=>{ uiSnd('close'); finishTut(); },{small:true});
    const bw3=txtW(T('ui.tutBtnNext'),8,'s')+30;
    button(x+w-20-bw3,y+h-28,bw3,24,T('ui.tutBtnNext'),()=>{ uiSnd('tab'); tutAdvance(); },{primary:true,small:true});
  }
}
function drawSelection(){
  const e=state.inspect;
  if(!e||!state.entities.includes(e)) return;
  const f=fpWorld(e.type,e.rot);
  const x=ox+e.x*TILE, y=oy+e.y*TILE, sw=f.w*TILE, sh=f.h*TILE;
  ctx.lineWidth=3;
  ctx.strokeStyle=Math.sin(animT*5)>0?'#ffd9a0':'#e08a3c';
  ctx.strokeRect(x+1.5,y+1.5,sw-3,sh-3);
  const c=Math.min(10,Math.min(sw,sh)/3);
  ctx.lineWidth=4; ctx.strokeStyle='#e08a3c';
  ctx.beginPath();
  ctx.moveTo(x+1,y+c);       ctx.lineTo(x+1,y+1);       ctx.lineTo(x+c,y+1);
  ctx.moveTo(x+sw-c,y+1);    ctx.lineTo(x+sw-1,y+1);    ctx.lineTo(x+sw-1,y+c);
  ctx.moveTo(x+sw-1,y+sh-c); ctx.lineTo(x+sw-1,y+sh-1); ctx.lineTo(x+sw-c,y+sh-1);
  ctx.moveTo(x+c,y+sh-1);    ctx.lineTo(x+1,y+sh-1);    ctx.lineTo(x+1,y+sh-c);
  ctx.stroke();
  if(e.kind==='machine'&&!isDock(e.type)&&e.type!=='repartiteur'&&e.active){
    const def=MACHINES[e.type];
    const pc=Math.min(1,e.timer/def.time);
    const jw=sw-12, jx=x+6, jy=y-7;
    R(jx,jy,jw,4,'#141009');
    R(jx,jy,Math.round(jw*pc),4,'#e0b552');
    R(jx,jy,Math.round(jw*pc),1,'#f6e8c2');     
  }
  if(e.kind==='machine'&&e.type!=='repartiteur'){
    const need=MACHINES[e.type].in;
    if(need){
      const missing=Object.keys(need).filter(k=>(e.inBuf[k]||0)<need[k]);
      if(missing.length&&Math.sin(animT*4)>-0.3){     
        const f=fpSize(e.type,e.rot);
        for(let mi=0;mi<missing.length;mi++){
          const k=missing[mi];
          const faces=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0}];
          const face=faces[mi%3];
          const fx=x+sw/2+face.x*(sw/2+14);
          const fy=y+sh/2+face.y*(sh/2+14);
          ctx.strokeStyle='#e08a3c'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
          ctx.beginPath();
          ctx.moveTo(fx,fy);
          ctx.lineTo(fx-face.x*10,fy-face.y*10);
          ctx.stroke();
          ctx.setLineDash([]);
          drawItemAt(ctx,k,fx-face.x*18,fy-face.y*18,S*1.1);
          /* compteur */
          txt('×'+need[k],fx-face.x*18,fy-face.y*18+S+8,13,'#f0a35e','center');
        }
      }
    }
  }
}
function toggleModal(id){
  try{ if(typeof uiSnd==='function') uiSnd(id==='menu'||id==='research'?'open':'tab'); }catch(e){}
  if(state.modal&&state.modal.id===id){ closeModal(); return; }
  openModal(id);
}
function openModal(id){
  state.modal={id,scroll:0,maxScroll:0,data:{}};
  tf.focused=false;
  state.inspect=null;
  if(id==='save'){ tf.value=''; }
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
  button(x+w-94,y+10,82,26,T('ui.modalClose'),()=>{ uiSnd('close'); closeModal(); },{small:true});
  return {x:x+14,y:y+42,w:w-28,h:h-54};
}

function drawModal(){
  if(!state.modal) return;
  const m=state.modal;
  const titles={options:T('ui.modalTitleOptions'),menu:T('ui.modalTitleMenu'),awards:T('ui.modalTitleAwards'),promo:T('ui.modalTitlePromo'),win:T('ui.modalTitleWin'),
    research:T('ui.modalTitleResearch'),recipes:T('ui.modalTitleRecipes'),stats:T('ui.modalTitleStats'),save:T('ui.modalTitleSave')};
  const body=modalFrame(titles[m.id]||'');
  ctx.save();
  ctx.beginPath(); ctx.rect(body.x-4,body.y-4,body.w+8,body.h+8); ctx.clip();
  let cy=body.y-m.scroll;
  let contentH=0;
  const line=(s,sz,c,f)=>{ txt(s,body.x,cy,sz,c,'left',f); cy+=sz+4; contentH+=sz+4; };

  if(m.id==='research'){
    cy+=6;
    txt(T('ui.resImprovements'),body.x,cy,9,'#ffd9a0','left','s');
    txt(T('ui.resBank')+fmtSci(state.sci)+T('ui.resScienceUnit'),body.x+body.w,cy,17,'#9fc4d4','right');
    cy+=22;
    for(const u of RESEARCH_UP){
      const lvl=state.research[u.id], max=lvl>=5, cost=max?null:u.costs[lvl];
      txt(u.name,body.x,cy,20,'#e6d6b8');
      pips(body.x+240,cy-12,lvl,5);
      txt(u.desc,body.x,cy+18,15,'#9c8a70');
      if(!max){
        const label=T('ui.resBtnResearch',{M:fmt(cost)});
        const bw2=txtW(label,8,'s')+26;
        button(body.x+body.w-bw2,cy-19,bw2,26,label,()=>buyUpgrade(u),{primary:true,small:true,disabled:state.sci<cost});
      }else{
        txt(T('ui.resMaxLevel'),body.x+body.w,cy,17,'#8faf6a','right');
      }
      cy+=40; contentH+=40;
    }
    cy+=10;
    txt(T('ui.resUnlockTitle'),body.x,cy,9,'#ffd9a0','left','s');
    txt(T('ui.resCareerAcq'),body.x+body.w,cy,13,'#6b563c','right');
    cy+=22;
    for(const u of RESEARCH_UNLOCK){
      const done=!!state.unlocksDone[u.id];
      txt(u.name,body.x,cy,20,done?'#7d6b52':'#e6d6b8');
      const lines=wrap(T('ui.resUnlocks')+u.unlocks.map(t=>MACHINES[t]?MACHINES[t].name:'?').join(', '),body.w-220,15);
      let yy=cy+18;
      for(const l of lines){ txt(l,body.x,yy,15,'#9c8a70'); yy+=16; }
      if(!done){
        const label=T('ui.resBtnUnlock',{M:fmt(u.cost)});
        const bw2=txtW(label,8,'s')+26;
        button(body.x+body.w-bw2,cy-19,bw2,26,label,()=>buyUnlock(u),{primary:true,small:true,disabled:state.sci<u.cost});
      }else{
        txt(T('ui.resObtained'),body.x+body.w,cy,17,'#8faf6a','right');
      }
      cy+=22+lines.length*16; contentH+=22+lines.length*16;
    }
  }
  else if(m.id==='recipes'){
    cy+=12;
    line(T('ui.recCatalog'),15,'#9c8a70');
    const groups=[[T('ui.recG1'),['machine_papier','machine_papier_2','machine_papier_3']],
      [T('ui.recG2'),['onduleuse','onduleuse_2','onduleuse_3']],
      [T('ui.recG3'),['atelier_renfort','atelier_intercal','atelier_poignee','imprimeuse']],
      [T('ui.recG4'),['assem_petit','assem_moyen','assem_grand','assem_caisse','assem_luxe']]];
    for(const [title,types] of groups){
      let any=false;
      for(const t of types) if(state.unlocked.includes(t)) any=true;
      if(!any) continue;
      cy+=14; txt(title,body.x+2,cy,9,'#ffd9a0','left','s'); cy+=10; contentH+=24;
      for(const t of types){
        if(!state.unlocked.includes(t)) continue;
        const d=MACHINES[t];
        if(!d) continue;
        /* ── fiche : cadre, icône, chaîne, prix ── */
        const fh=46;
        R(body.x,cy,body.w,fh,'#261e15');
        ctx.lineWidth=1; ctx.strokeStyle='#3a2d20'; ctx.strokeRect(body.x+.5,cy+.5,body.w-1,fh-1);
        ctx.drawImage(getMachineIcon(t),body.x+8,cy+5,36,36);
        /* chaîne d'entrée */
        let ix=body.x+56;
        if(d.in){
          for(const k in d.in){
            ctx.drawImage(getItemIcon(k),ix,cy+6,20,20);
            txt('×'+d.in[k],ix+22,cy+20,15,'#9c8a70');
            ix+=22+txtW('×'+d.in[k],15)+14;
          }
          txt('+',ix-8,cy+20,18,'#6b563c'); ix+=6;
        }else{
          txt(T('ui.recOldPaper'),ix,cy+20,15,'#9c8a70');
          ix+=txtW(T('ui.recOldPaper'),15)+14;
        }
        txt('→',ix,cy+21,20,'#e08a3c'); ix+=24;
        ctx.drawImage(getItemIcon(d.out),ix,cy+6,22,22);
        txt(ITEMS[d.out].name,ix+28,cy+20,18,'#e6d6b8');
        /* prix : gros, à droite */
        txt(fmt(ITEMS[d.out].value)+' $',body.x+body.w-8,cy+22,22,'#e0b552','right');
        /* machine + cycle : sous la chaîne */
        txt(d.name+' · '+f1(d.time)+T('ui.recSeconds')+(ITEMS[d.out].sci?T('ui.recSci')+f1(ITEMS[d.out].sci)+T('ui.recSciUnit'):''),body.x+56,cy+37,13,'#8a755c');
        cy+=fh+8; contentH+=fh+8;
      }
    }
  }
  else if(m.id==='stats'){
    const s=state.stats, c=state.career, doneN=state.factoryDone.filter(Boolean).length;
    cy+=2; txt(T('ui.stCareer'),body.x,cy,9,'#ffd9a0','left','s'); cy+=20;
    for(const [k,v] of [[T('ui.stDoneFactories'),doneN+' / '+FACTORIES.length],[T('ui.stGrade'),GRADES[doneN]],
      [T('ui.stGroupBonus'),'×'+multFmt(sellMult())],
      [T('ui.stTrade'),T('ui.stTradeLevel')+state.research.trade+T('ui.stTradeOf')+(8*(state.research.trade||0))+T('ui.stTradePct')],
      [T('ui.stMoneyTotal'),fmt(c.moneyTotal)+' $'],[T('ui.stSciTotal'),fmtSci(c.sciTotal)],
      [T('ui.stPlayTime'),Math.floor(c.playTime/3600)+T('ui.stHours')+Math.floor(c.playTime/60)%60+T('ui.stMin')]]){
      txt(k,body.x,cy,18,'#9c8a70'); txt(v,body.x+body.w,cy,18,'#e6d6b8','right'); cy+=22; contentH+=22;
    }
    cy+=10; txt(T('ui.stCurrentH')+FACTORIES[state.factoryIdx].name.toUpperCase(),body.x,cy,9,'#ffd9a0','left','s'); cy+=20;
    for(const [k,v] of [[T('ui.stPlaced'),s.placed+' / '+s.destroyed],
      [T('ui.stInService'),state.entities.filter(e=>e.kind==='machine').length],
      [T('ui.stBelts'),state.entities.filter(e=>e.kind==='belt').length],[T('ui.stMoneyHere'),fmt(s.moneyTotal)+' $']]){
      txt(k,body.x,cy,18,'#9c8a70'); txt(v,body.x+body.w,cy,18,'#e6d6b8','right'); cy+=22; contentH+=22;
    }
    cy+=8; txt(T('ui.stSales'),body.x,cy,9,'#ffd9a0','left','s'); cy+=20;
    let any=false;
    for(const t in s.sold){
      if(!s.sold[t]) continue; any=true;
      ctx.drawImage(getItemIcon(t),body.x,cy-14,20,20);
      txt(ITEMS[t].name,body.x+26,cy+2,18,ITEMS[t].c);
      txt(String(s.sold[t]),body.x+body.w-90,cy+2,18,'#e6d6b8','right');
      txt(fmt(s.sold[t]*ITEMS[t].value)+' $',body.x+body.w,cy+2,18,'#e0b552','right');
      cy+=24; contentH+=24;
    }
    if(!any) line(T('ui.stNoSales'),16,'#8a755c');
  }
  else if(m.id==='save'){
    cy+=2; line(T('ui.svAuto'),16,'#9c8a70');
    if(!checkStorage()) line(T('ui.svStorageNA'),15,'#e8926f');
    cy+=8;
    button(body.x,cy,190,28,T('ui.svNow'),()=>{
      saveGame();
      toast(checkStorage()?T('ui.toastSaved'):T('ui.toastCantSave'),T('ui.toastSavedBody'),checkStorage());
    },{small:true});
    button(body.x+200,cy,150,28,T('ui.svCopy'),copyExport,{small:true});
    cy+=40; contentH+=48;
    txt(T('ui.svChainLabel'),body.x,cy,16,'#8a755c'); cy+=20;
    textField(body.x,cy,body.w,58); cy+=70; contentH+=90;
    button(body.x,cy,220,28,T('ui.svLoad'),tfEnter,{primary:true,small:true});
    button(body.x+230,cy,200,28,m.data.armed?T('ui.selConfirm'):T('ui.svWipe'),()=>{
      if(!m.data.armed){ m.data.armed=true; setTimeout(()=>{m.data.armed=false;},3000); return; }
      stDel(SAVE_KEY);
      m.data.armed=false; toast(T('ui.toastWiped'),T('ui.toastWipedBody'));
    },{danger:true,small:true});
    cy+=34; contentH+=34;
  }
  else if(m.id==='menu'){
    const doneN=state.factoryDone.filter(Boolean).length;
    cy+=14;
    line(T('ui.mnGrade')+GRADES[doneN],21,'#e0b552');
    line(T('ui.mnDoneLine1')+doneN+' / '+FACTORIES.length+T('ui.mnDoneLine2')+multFmt(sellMult()),17,'#c9b58a');
    line(T('ui.mnCurrent')+FACTORIES[state.factoryIdx].name,17,'#9c8a70');
    cy+=12;
    const centered=(label,fn,o)=>{
      const bw2=txtW(label,8,'s')+34;
      button(body.x+(body.w-bw2)/2,cy,bw2,28,label,fn,Object.assign({small:true},o));
    };
    centered(T('ui.mnHQ'),()=>{closeModal();uiSnd('back');goHome();},{primary:true}); cy+=36;
    centered(m.data.restart?T('ui.mnRestartConfirm'):T('ui.mnRestart'),()=>{
      if(!m.data.restart){ m.data.restart=true; uiSnd('danger'); setTimeout(()=>{m.data.restart=false;},3000); return; }
      m.data.restart=false;
      const i=state.factoryIdx;
      closeModal();
      resetRun(i);                    
      state.screen='game'; state.inRun=true;
      state.letter=null;            
      saveGame();
      uiSnd('danger');
      toast(T('ui.toastReset'),T('ui.toastResetBody'),true);
    },{danger:true}); cy+=36;
    centered(T('ui.mnStats'),()=>{closeModal();uiSnd('open');openModal('stats');},{}); cy+=36;
    {
      const n=Object.keys(state.achievements||{}).length;
      centered(T('ui.mnAwards')+n+'/'+ACHIEVEMENTS.length+T('ui.mnAwardsEnd'),()=>{closeModal();uiSnd('open');openModal('awards');},{});
    }
    cy+=36;
    centered(T('ui.mnSave'),()=>{closeModal();uiSnd('open');openModal('save');},{}); cy+=36;
    centered(T('ui.mnSound')+(state.sound?T('ui.mnOn'):T('ui.mnOff')),()=>{toggleSound();uiSnd('option');},{}); cy+=44;
    const sw2=Math.min(220,body.w-160);
    slider(body.x+(body.w-sw2)/2,cy,sw2,T('ui.mnSfx'),state.volSfx,v=>{state.volSfx=v;});
    cy+=64;
    slider(body.x+(body.w-sw2)/2,cy,sw2,T('ui.mnMus'),state.volMus,v=>{setVolMus(v);});
    cy+=70;
    line(T('ui.mnHelp1'),15,'#8a755c');
    line(T('ui.mnHelp2'),15,'#8a755c');
    line(T('ui.mnHelp3'),15,'#8a755c');
    contentH+=302;
  }
  else if(m.id==='options'){
    cy+=8;
    const centered=(label,fn,o)=>{
      const bw2=txtW(label,8,'s')+34;
      button(body.x+(body.w-bw2)/2,cy,bw2,28,label,fn,Object.assign({small:true},o));
    };
    centered(T('ui.mnSound')+(state.sound?T('ui.mnOn'):T('ui.mnOff')),()=>{toggleSound();uiSnd('option');},{});
    cy+=40;
    const sw2=Math.min(220,body.w-160);
    slider(body.x+(body.w-sw2)/2,cy,sw2,T('ui.mnSfx'),state.volSfx,v=>{state.volSfx=v;});
    cy+=64;
    slider(body.x+(body.w-sw2)/2,cy,sw2,T('ui.mnMus'),state.volMus,v=>{setVolMus(v);});
    cy+=70;
    centered(T('ui.opExport'),()=>{ openModal('save'); uiSnd('open'); },{});
    cy+=40;
    const lab=homeArmed?T('ui.opWipeAllConfirm'):T('ui.opWipeAll');
    centered(lab,()=>{
      if(!homeArmed){ homeArmed=true; uiSnd('danger'); setTimeout(()=>{homeArmed=false;},3000); return; }
      homeArmed=false;
      stDel(SAVE_KEY);
      bootSave=null;
      state.factoryDone=new Array(FACTORIES.length).fill(false);
      state.career={moneyTotal:0,sciTotal:0,sold:{},playTime:0,placedBelts:0};
      state.achievements={};
      state.noBlockT=0; state.longestLine=0; state.konamiUsed=false;
      state.unlocksDone={};
      state.maxFactoryIdx=0;
      state.lettersRead=new Array(FACTORIES.length).fill(false);
      state.letter=null; state.letterGain=null;
      state.tutDone=false; state.tut=0; state.inRun=false;
      tutEntered=-1;
      log.length=0; toasts.length=0;
      resetRun(0);
      closeModal();
      uiSnd('danger');
      toast(T('ui.toastWipe'),checkStorage()?T('ui.toastWipeBodyA'):T('ui.toastWipeBodyB'));
    },{danger:true});
    cy+=48;
    line(T('ui.opNote1'),15,'#8a755c');
    line(T('ui.opNote2'),15,'#8a755c');
    contentH+=210;
  }
  else if(m.id==='awards'){
    const total=ACHIEVEMENTS.length;
    const got=Object.keys(state.achievements||{}).length;
    cy+=4;
    txt(got+' / '+total+T('ui.awGot'),body.x+body.w/2,cy,14,'#c9b58a','center'); cy+=20;
    const cats=[['mission',T('ui.awCatMission')],['carriere',T('ui.awCatCareer')],['ingenieur',T('ui.awCatEng')],['excentrique',T('ui.awCatOdd')]];
    for(const [cat,label] of cats){
      cy+=6; txt(label,body.x,cy,9,'#ffd9a0','left','s'); cy+=12; contentH+=18;
      for(const a of ACHIEVEMENTS){
        if(a.cat!==cat) continue;
        const ok=state.achievements[a.id];
        /* fiche : fond selon obtenu, pastille, nom, description, date */
        R(body.x,cy,body.w,30,ok?'#2b221a':'#1e1711');
        ctx.lineWidth=1; ctx.strokeStyle=ok?'#6a5236':'#33281a';
        ctx.strokeRect(body.x+.5,cy+.5,body.w-1,29);
        if(ok){
          R(body.x+6,cy+8,13,13,'#e8c96a');
          R(body.x+8,cy+10,9,9,'#c99e6a');
          R(body.x+10,cy+12,5,5,'#e8c96a');
        }else{
          R(body.x+6,cy+8,13,13,'#241c15');
          ctx.strokeStyle='#33281a'; ctx.strokeRect(body.x+6.5,cy+8.5,12,12);
        }
        txt(a.name,body.x+28,cy+13,17,ok?'#e8c96a':'#6b563c');
        txt(a.desc,body.x+28,cy+25,13,ok?'#9c8a70':'#4a3a28');
        if(ok){
          const d=new Date(state.achievements[a.id]);
          const ds=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
          txt(ds,body.x+body.w-8,cy+13,13,'#8a755c','right');
        }
        cy+=34; contentH+=34;
      }
    }
  }
  else if(m.id==='promo'){
    cy+=14;                       
    if(state.screen!=='game'||!allGoalsDone()||state.factoryDone[state.factoryIdx]){
      line(T('ui.prStale'),17,'#9c8a70');
      cy+=8;
      button(body.x,cy,body.w,32,T('ui.prCloseFile'),()=>closeModal(),{primary:true});
      cy+=40; contentH+=62;
    }
    else{
      const next=state.factoryIdx+1;
      if(next>=FACTORIES.length){
        for(const l of wrap(T('ui.prFinal'),body.w,20)) line(l,20,'#e6d6b8');
        cy+=8; line(T('ui.prFinalBonus'),17,'#f0a35e'); cy+=8;
        button(body.x,cy,body.w,34,T('ui.prSign'),()=>doPromotion(),{primary:true,armed:m.data.armed});
      }else{
        const F=FACTORIES[next];
        for(const l of wrap(T('ui.prPropose',{N:F.name,S:F.sub}),body.w,20)) line(l,20,'#e6d6b8');
        cy+=6;
        line(T('ui.prGrid')+F.grid[0]+'×'+F.grid[1]+' · '+T('ui.prFunds')+fmt(F.start)+' $ · '+T('ui.prPrime')+fmtSci(F.sci)+T('ui.prPrimeSci'),17,'#c9b58a');
        if(F.unlocks.length) line(T('ui.prEquip')+F.unlocks.map(t=>MACHINES[t].name).join(', '),17,'#c9b58a');
        line(T('ui.prRecog'),17,'#f0a35e'); cy+=8;
        button(body.x,cy,body.w,34,m.data.armed?T('ui.prConfirm'):T('ui.prOpen'),()=>{
          if(!m.data.armed){ m.data.armed=true; setTimeout(()=>{m.data.armed=false;},4000); return; }
          doPromotion();
        },{primary:true});
      }
      cy+=38; contentH+=38;
    }
  }
  else if(m.id==='win'){
    for(const l of wrap(T('ui.winText'),body.w,20)) line(l,20,'#e6d6b8');
    cy+=6; line(T('ui.winBonus')+multFmt(sellMult())+T('ui.winTail'),17,'#c9b58a'); cy+=10;
    button(body.x,cy,body.w,34,T('ui.winContinue'),()=>closeModal(),{primary:true});
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
    .then(()=>toast(T('ui.toastCopied'),'',true))
    .catch(()=>toast(T('ui.toastCopyFail'),T('ui.toastCopyFailBody')));
  else toast(T('ui.toastCopyFail'),T('ui.toastCopyFailBody'));
}
function tfEnter(){
  const s=tf.value.trim();
  if(!s){ toast(T('ui.toastEmptyChain'),T('ui.toastEmptyChainBody')); return; }
  if(importString(s)){ closeModal(); toast(T('ui.toastLoaded'),'',true); }
  else toast(T('ui.toastBadChain'),T('ui.toastBadChainBody'));
}
function toggleSound(){ state.sound=!state.sound; uiSnd(state.sound?'option':'close'); toast(state.sound?T('ui.toastSoundOn'):T('ui.toastSoundOff'),''); }


/* ══════ ÉCRAN-TITRE  ══════ */

const TITLE_GLYPHS={
  C:['.XXX.','X...X','X....','X...X','.XXX.'],
  A:['.XXX.','X...X','XXXXX','X...X','X...X'],
  R:['XXXX.','X...X','XXXX.','X..X.','X...X'],
  T:['XXXXX','..X..','..X..','..X..','..X..'],
  O:['.XXX.','X...X','X...X','X...X','.XXX.'],
  N:['X...X','XX..X','X.X.X','X..XX','X...X'],
};

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
  const wyBase=Math.max(24+2.5*cell,Math.min(Math.round(H*0.30),H-380));
  drawTitleWord(word,cx,wyBase+Math.sin(animT*1.2)*4,cell);
  const wb=wyBase+2.5*cell;
  {
    const segs=[
      [T('ui.titleSegA'),'#8a755c'],
      [T('ui.wordPaper'),ITEMS.papier.c],
      [T('ui.titleSegB'),'#8a755c'],
      [T('ui.wordCardboard'),ITEMS.carton.c],
      [T('ui.titleSegC'),'#8a755c'],
    ];
    let tw=0;
    for(const [s] of segs) tw+=txtW(s,18);
    let tx2=cx-tw/2;
    for(const [s,c] of segs){
      txt(s,tx2,wb+42,18,c,'left');
      tx2+=txtW(s,18);
    }
  }
  txt(T('ui.titleTagline'),cx,wb+64,15,'#c99e6a','center');
  /* ── Ruban en U inversé : branche gauche, virage, barre du haut,
     virage, branche droite — items qui font TOUT le circuit ── */
  const uw=Math.min(440,W-60);
  const uh=190;
  const ux=cx-uw/2, uy=wb+78;
  const bw3=Math.min(200,uw-40);
  const bhh2=36, gap=14;
  const armW=18;
  const speed=34;                            
  const seg=(x1,y1,x2,y2)=>{
    const horiz=(y1===y2);
    if(horiz){
      R(x1,y1-armW/2,x2-x1,armW,'#3a2c1e');
      R(x1,y1-armW/2+2,x2-x1,armW-4,'#463525');
      R(x1,y1-armW/2,x2-x1,2,'#6b563c');
      R(x1,y1+armW/2-2,x2-x1,2,'#5b4930');
      const len=Math.abs(x2-x1);
      const off=(animT*speed)%14;
      const y0=Math.min(y1,y2);
      for(let q=0;q<len;q+=14){
        const px=x1+((x2>x1)?(q+off):(len-q-off));
        if(px>=x1&&px+8<=x1+len){
          R(px,y0-4,4,2,'#8f7752'); R(px+4,y0-1,4,4,'#8f7752'); R(px,y0+3,4,2,'#8f7752');
        }
      }
    }else{
      R(x1-armW/2,y1,armW,y2-y1,'#3a2c1e');
      R(x1-armW/2+2,y1,armW-4,y2-y1,'#463525');
      R(x1-armW/2,y1,2,y2-y1,'#6b563c');
      R(x1+armW/2-2,y1,2,y2-y1,'#5b4930');
      const len=Math.abs(y2-y1);
      const up=(y2<y1);
      const off=(animT*speed)%14;
      const x0=Math.min(x1,x2), yTop=Math.min(y1,y2);
      for(let q=0;q<len;q+=14){
        const py=up?(y1-q-off):(y1+q+off);
        if(py>=yTop&&py+7<=yTop+len){
          if(up){
            R(x0-4,py+4,2,3,'#8f7752'); R(x0-1,py+2,4,2,'#8f7752'); R(x0+3,py+4,2,3,'#8f7752');
          }else{
            R(x0-4,py,2,3,'#8f7752'); R(x0-1,py+3,4,2,'#8f7752'); R(x0+3,py,2,3,'#8f7752');
          }
        }
      }
    }
  };
  seg(ux+armW/2,uy+uh,ux+armW/2,uy+armW);                  
  seg(ux+armW,uy+armW/2,ux+uw-armW,uy+armW/2);             
  seg(ux+uw-armW/2,uy+armW,ux+uw-armW/2,uy+uh);           
  ctx.save();
  ctx.translate(ux+armW/2,uy+armW/2);
  ctx.rotate(-Math.PI/2);
  drawBeltCurve(ctx,1.15,1,0.34,'#261e15');
  ctx.restore();
  ctx.save();
  ctx.translate(ux+uw-armW/2,uy+armW/2);
  drawBeltCurve(ctx,1.15,1,0.34,'#261e15');
  ctx.restore();
  const parade=['papier','carton','renfort','intercalaire','petit_carton','carton_moyen','grand_carton','caisse','pack_luxe'];
  const legH=uh-armW;                     
  const legW=uw-armW;                      
  const circuit=2*legH+legW;                 
  const gap2=circuit/parade.length;           
  const anim2=(animT*speed)%circuit;
  for(let i=0;i<parade.length;i++){
    const d=(anim2+i*gap2)%circuit;
    if(d<legH){
      drawItemAt(ctx,parade[i],ux+armW/2,uy+uh-d,1.6);
    }else if(d<legH+legW){
      drawItemAt(ctx,parade[i],ux+armW/2+(d-legH),uy+armW/2,1.6);
    }else{
      drawItemAt(ctx,parade[i],ux+uw-armW/2,uy+armW/2+(d-legH-legW),1.6);
    }
  }
  const bstackY=uy+armW+16;
  button(cx-bw3/2,bstackY,bw3,bhh2,T('ui.btnPlay'),()=>{ uiSnd('game'); state.screen='home'; },{primary:true});
  button(cx-bw3/2,bstackY+bhh2+gap,bw3,bhh2,T('ui.btnOptions'),()=>{ uiSnd('open'); openModal('options'); },{});
  button(cx-bw3/2,bstackY+2*(bhh2+gap),bw3,bhh2,T('ui.btnAwards'),()=>{ uiSnd('open'); openModal('awards');},{});
  /* ── Choix de la langue : drapeaux FR / EN, sous les boutons ── */
  txt(T('ui.flagHint'),cx,uy+190,8,'#8a755c','center','s');
  drawLangFlags(cx,uy+200,34,true);
}
function drawHome(rdt){
  drawBackground();
  const cw=Math.min(780,W-30);
  const x=(W-cw)/2;                 
  button(x,12,120,26,T('ui.homeBack'),()=>{ uiSnd('back'); state.screen='title'; },{small:true});
  const lx=x+134;
  R(lx,16,26,26,'#c99e6a');
  R(lx,21,26,4,'#8a6136'); R(lx,28,26,4,'#8a6136'); R(lx,35,26,4,'#8a6136');
  txt('CARTONO',lx+36,36,24,'#c99e6a','left','s');
  const subFull=T('ui.homeSub');
  txt(txtW(subFull,16)>cw-360?T('ui.homeSubShort'):subFull,lx+36,56,16,'#8a755c');
  /* drapeaux FR/EN en haut à droite, à gauche des stats */
  drawLangFlags(x+cw-218,26,30,false);
  const doneN=state.factoryDone.filter(Boolean).length;
  const rx=x+cw-16;
  txt(T('ui.homeGrade')+GRADES[doneN].toUpperCase(),rx,28,9,'#e0b552','right','s');
  txt(T('ui.homeDone')+doneN+' / '+FACTORIES.length,rx,48,16,'#c9b58a','right');
  txt(T('ui.homeBonus')+'×'+multFmt(sellMult()),rx,66,16,'#c9b58a','right');
  const zoneTop=84, zoneBottom=H-4;
  ctx.save();
  ctx.beginPath(); ctx.rect(0,zoneTop,W,zoneBottom-zoneTop); ctx.clip();
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
    if(locked) txt(T('ui.homeLocked'),x+cw-16,y+24,8,'#5a4a38','right','s');
    else if(isDone&&!isCur) txt(T('ui.homeDoneBadge'),x+cw-16,y+24,8,'#8faf6a','right','s');
    else txt(state.inRun?T('ui.homeInProgress'):T('ui.homeNewAssign'),x+cw-16,y+24,8,isDone?'#8faf6a':'#ffd9a0','right','s');
    txt(F.sub,x+16,y+42,15,locked?'#5a4a38':'#8a755c');
    let yy=y+60;
    for(const l of wrap(locked?T('ui.homeDescLocked'):F.desc,cw-260,15).slice(0,2)){ txt(l,x+16,yy,15,locked?'#4a3a28':'#9c8a70'); yy+=15; }
    if(!locked)
      txt(T('ui.homeGrid')+F.grid[0]+'×'+F.grid[1]+' · '+T('ui.homeFunds')+fmt(F.start)+' $ · '+T('ui.homePrime')+fmtSci(F.sci)+' '+T('ui.homeSci')+(F.unlocks.length?' · '+T('ui.homePreinstalled'):''),x+16,y+ch-36,15,'#8a755c');
    for(const l of wrap(locked?T('ui.homeObjectivesLocked'):T('ui.homeObjectives')+F.goals.map(g=>goalText(g)).join(' · '),cw-32,15).slice(0,1))
      txt(l,x+16,y+ch-16,15,locked?'#4a3a28':'#c9b58a');
    if(locked){
      txt(T('ui.homeFinishFirst'),x+cw-16,y+78,14,'#5a4a38','right');
      for(const l of wrap(FACTORIES[i-1].name,220,15).slice(0,1))
        txt(l,x+cw-16,y+95,15,'#5a4a38','right');
    }else if(isDone&&!isCur){
      button(x+cw-146,y+ch/2-14,130,28,T('ui.homeReplay'),()=>{ uiSnd('game'); resetRun(i); state.screen='game'; state.inRun=true; },{small:true});
    }else{
      const label=isCur?(state.inRun?T('ui.homeResume'):T('ui.homeTakeOver')):T('ui.homeTakeOver');
      button(x+cw-206,y+ch/2-17,190,34,label,()=>{
        uiSnd('game');
        if(isCur) startRun();
        else{
          resetRun(i); state.screen='game'; state.inRun=true;
          if(!state.lettersRead[i]) state.letter=i;
          else{ state.letterGain=calcGains(); applyReturnGains(); state.letter=i; }
        }
      },{primary:true,small:true});
    }
    y+=ch+12;
  }
  y+=10;
  txt(T('ui.homeFooter'),W/2,y+16,15,'#6b563c','center');
  y+=34;
  ctx.restore();                                  
  const contentBottom=y+state.homeScroll;
  state.homeMax=Math.max(0,contentBottom-zoneBottom);
  state.homeScroll=clamp(state.homeScroll,0,state.homeMax);
  drawToasts(rdt);   
}

/* ══════════════ 10. PROGRESSION  ══════════════ */

function goalText(g){
  if(g.t==='money') return T('ui.goalMoney')+fmt(g.n)+' $';
  if(g.t==='sold')  return T('ui.goalSold')+g.n+'× '+ITEMS[g.item].name;
  return '?';
}
function goalVal(g){
  if(g.t==='money') return Math.floor(state.stats.moneyTotal);
  if(g.t==='sold')  return state.stats.sold[g.item]||0;
  return 0;
}
function allGoalsDone(){ return FACTORIES[state.factoryIdx].goals.every(g=>goalVal(g)>=g.n); }
function checkGoals(){
  if(allGoalsDone()&&!state.factoryDone[state.factoryIdx]&&!state.promoNotified){
    state.promoNotified=true;
    toast(T('ui.toastPromo'),T('ui.toastPromoBody'),true);
    SFX.research();
  }
}
function checkAchievements(){
  for(const a of ACHIEVEMENTS){
    if(state.achievements[a.id]) continue;
    let ok=false;
    try{ ok=a.check(); }catch(e){}
    if(ok){
      state.achievements[a.id]=Date.now();
      toast(T('ui.toastDistinction')+a.name,a.desc,true);
      SFX.research();
    }
  }
}
function doPromotion(){
  if(state.factoryDone[state.factoryIdx]||!allGoalsDone()){ closeModal(); return; }
  state.factoryDone[state.factoryIdx]=true;
  CG.ev('happytime');                            /* remise des clés : célébration CrazyGames */
  CG.ev('reportGameCompletedPercentage',cgProgressPct());
  closeModal();                                 
  if(state.factoryIdx>=FACTORIES.length-1){
    openModal('win'); SFX.promo();
    toast(T('ui.toastCareer'),T('ui.toastCareerBody'),true);
  }else{
    state.factoryIdx++;
    resetRun(state.factoryIdx);
    state.screen='home';
    state.inRun=false;
    SFX.promo();
    toast(T('ui.toastPromoSigned'),T('ui.toastPromoBody2')+FACTORIES[state.factoryIdx].name,true);
  }
  saveGame();
}
function goHome(){ saveGame(); state.leaveTime=Date.now(); state.screen='home'; state.inRun=true; state.letter=null; state.letterGain=null; }
function startRun(){
  state.screen='game'; state.inRun=true;
  if(!state.lettersRead[state.factoryIdx]){
    state.letter=state.factoryIdx;
  }else{
    state.letterGain=calcGains();    
    applyReturnGains();
    state.letter=state.factoryIdx;
  }
}
function resetRun(i){
  const F=FACTORIES[i];
  state.factoryIdx=i;
  if(i>state.maxFactoryIdx) state.maxFactoryIdx=i;   
  state.money=F.start; state.sci=F.sci||0;
  state.gridW=F.grid[0]; state.gridH=F.grid[1]; state.extLevel=0;
  state.entities=[]; state.counts={};
  state.unlocked=[...BASE_UNLOCKED];
  for(let j=0;j<=i;j++) for(const t of FACTORIES[j].unlocks||[]) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  for(const u of RESEARCH_UNLOCK) if(state.unlocksDone[u.id]) for(const t of u.unlocks) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  state.research=Object.assign({belt:0,prod:0,craft:0,discount:0,trade:0},F.research||{});
  /* les pré-acquis de l'usine marquent les recherches correspondantes comme obtenues */
  for(const u of RESEARCH_UNLOCK) if(u.unlocks.every(t=>state.unlocked.includes(t))) state.unlocksDone[u.id]=true;
  state.stats={sold:{},produced:{},moneyTotal:0,sciTotal:0,placed:0,destroyed:0,playTime:0};
  state.rate={money:0,sci:0};
  state.time=0; state.promoNotified=false; state.inRun=false;
  state.leaveTime=Date.now();           
  tutEntered=-1;                       
  build.type=null; build.rot=0; build.destroy=false; build.dragging=false; build.soutSrc=null;
  state.inspect=null;
  fx.length=0; toasts.length=0;
  initGrid();
  const fd=F.forcedDock;
  if(fd){
    const rot=dockRotAt(fd.type||'expedition',fd.x,fd.y,0);
    if(rot>=0){
      const type=fd.type||'expedition';
      const e={ id:++uid, kind:'machine', type, x:fd.x, y:fd.y,
                rot, lvl:0, inBuf:{}, active:false, timer:0, outItem:null,
                blockedT:0, flash:0, locked:true };
      state.entities.push(e);
      state.counts[type]=(state.counts[type]||0)+1;
      const f=fpWorld(type,rot);
      for(let dy=0;dy<f.h;dy++) for(let dx=0;dx<f.w;dx++) state.grid[fd.y+dy][fd.x+dx]=e;
    }
  }
  rebuildToolOrder();
}
function buyUpgrade(u){
  const lvl=state.research[u.id];
  if(lvl>=5) return;
  const cost=u.costs[lvl];
  if(state.sci<cost){ SFX.err(); return; }
  state.sci-=cost; state.research[u.id]=lvl+1;
  SFX.research();
  toast(T('ui.toastResearch')+u.name,T('ui.toastLevel')+(lvl+1)+T('ui.toastOfFive'),true);
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
  if(tutEntered===state.tut) return; 
  tutEntered=state.tut;
  if(st.hl) for(const [cat,ts] of CATS) if(ts.includes(st.hl)){ setBarCat(cat); break; }
  if(st.skipIfOwned&&cnt(st.hl)>=1) tutAdvance();   
}
function tutAdvance(){
  state.tut++;
  SFX.tut();
  if(state.tut>=TUT.length) finishTut();
  else tutStepEnter();
}
function tutCheck(){
  if(!state.inRun||state.tutDone) return;
  if(state.letter!==null&&state.letter!==undefined) return;   
  if(state.tut>=TUT.length){ finishTut(); return; }
  tutStepEnter();                        
  const st=TUT[state.tut];
  if(st&&st.check&&st.check()) tutAdvance();
}
function finishTut(){
  state.tutDone=true;
  addLog(T('ui.logTutDone'));
  toast(T('ui.toastTutEndTitle'),T('ui.toastTutEndBody'),true);
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
    volSfx:state.volSfx, volMus:state.volMus,
    lettersRead:state.lettersRead,
    achievements:state.achievements,
    stats:state.stats, rate:state.rate,
    inRun:state.inRun,
    ent:state.entities.map(e=>e.kind==='belt'
      ? {k:'b',x:e.x,y:e.y,r:e.rot,l:e.lvl||0,cv:e.curve||0,tp:e.type||'convoyeur',i:e.item?{t:e.item.t,p:e.item.p,e:e.item.entry}:null}
      : {k:'m',t:e.type,x:e.x,y:e.y,r:e.rot,l:e.lvl||0,ib:e.inBuf,a:e.active?1:0,ti:e.timer,oi:e.outItem,q:e.queue||null,rp:e.rep||null,lo:!!e.locked}),
  };
}
function saveGame(){
  if(!checkStorage()) return;  
  try{ stSet(SAVE_KEY,JSON.stringify(serialize())); }catch(e){}
}
function applySave(d){
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
  state.career=Object.assign({moneyTotal:0,sciTotal:0,sold:{},playTime:0,placedBelts:0},d.career);
  state.achievements=d.achievements||{};
  state.money=d.money; state.sci=d.sci;
  state.gridW=d.gridW; state.gridH=d.gridH; state.extLevel=d.extLevel||0;
  state.time=d.time||0;
  state.research=Object.assign({belt:0,prod:0,craft:0,discount:0,trade:0},d.research);
  state.unlocksDone=d.unlocksDone||{};
  /* unlocked = base + pré-acquis CUMULÉS des usines ≤ factoryIdx + recherches signées */
  state.unlocked=[...BASE_UNLOCKED];
  for(let j=0;j<=state.factoryIdx;j++) for(const t of FACTORIES[j].unlocks||[]) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  for(const u of RESEARCH_UNLOCK) if(state.unlocksDone[u.id]) for(const t of u.unlocks) if(!state.unlocked.includes(t)) state.unlocked.push(t);
  state.tut=d.tut||0; state.tutDone=!!d.tutDone;
  tutEntered=-1;
  state.lettersRead=(d.lettersRead||[]).slice(0,FACTORIES.length);
  while(state.lettersRead.length<FACTORIES.length) state.lettersRead.push(false);
  state.sound=d.sound!==false;
  state.volSfx=(typeof d.volSfx==='number')?d.volSfx:0.8;
  state.volMus=(typeof d.volMus==='number')?d.volMus:0.5;
  state.stats=Object.assign({sold:{},produced:{},moneyTotal:0,sciTotal:0,placed:0,destroyed:0,playTime:0},d.stats);
  state.rate=Object.assign({money:0,sci:0},d.rate);
  state.inRun=!!d.inRun;
  if(d.v<5) for(const s of d.ent||[]) if(s.k==='b'&&s.cv) s.r=(s.r+(s.cv===1?3:1))%4;
  state.entities=[]; state.counts={};
  for(const s of d.ent||[]){
    const e=s.k==='b'
      ? {id:++uid,kind:'belt',type:s.tp||'convoyeur',x:s.x,y:s.y,rot:s.r,lvl:s.l||0,curve:s.cv||0,item:s.i?{t:s.i.t,p:(isFinite(s.i.p)?s.i.p:0),entry:(s.i.e!==undefined)?s.i.e:s.r}:null,blockedT:0,flash:0}
      : {id:++uid,kind:'machine',type:s.t,x:s.x,y:s.y,rot:s.r,lvl:s.l||0,inBuf:s.ib||{},active:!!s.a,timer:s.ti||0,outItem:s.oi||null,blockedT:0,flash:0};
    if(e.type==='repartiteur'){ e.queue=s.q||[]; e.qlanes=[]; e.vItem=null; e.lastServed=null; e.rep=(s.rp&&typeof s.rp==='object')?s.rp:null; }
    if(s.lo) e.locked=true;
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

function calcGains(){
  const sec=Math.max(0,(Date.now()-(state.leaveTime||Date.now()))/1000);
  const capped=Math.min(sec,ECO.offlineCapH*3600);
  return {
    sec,
    m:state.rate.money*capped*ECO.offlineF,
    s:state.rate.sci*capped*ECO.offlineF
  };
}

function applyReturnGains(){
  const g=calcGains();
  if(g.m>=1||g.s>=0.1){
    state.money+=g.m; state.stats.moneyTotal+=g.m; state.career.moneyTotal+=g.m;
    state.sci+=g.s;   state.stats.sciTotal+=g.s;   state.career.sciTotal+=g.s;
  }
  state.leaveTime=Date.now();
}


/* ══════════════ 13. RENDU PRINCIPAL, INIT & BOUCLE ══════════════ */

function layout(){
  W=canvas.width; H=canvas.height;
  hudH=46; barH=88;
  sideW=W>=900?230:190;   
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
  ctx.setTransform(1,0,0,1,0,0);        /* garde-fou : aucune transformation ne doit fuiter d'une frame */
  ctx.globalAlpha=1;
  drawBackground();
  drawHUD();
  drawSide();
  drawBar();
  drawFloor();
  drawSoutLinks();
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
  drawSelection();   
  drawToasts(rdt);
  drawLetter();      
  let tipLines=null;
  if(barTip&&!state.modal){ tipLines=barTip; barTip=null; }
  else if(sideTip){ tipLines=sideTip; sideTip=null; }
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
  /* CrazyGames : début/fin de gameplay — une modale d'inspection n'interrompt
     pas la partie ; seule la sortie d'écran ou l'ouverture d'une lettre compte. */
  const cgPlaying=state.screen==='game'&&(state.letter===null||state.letter===undefined);
  if(cgPlaying!==cgWasPlaying){ cgWasPlaying=cgPlaying; CG.ev(cgPlaying?'gameplayStart':'gameplayStop'); }
  const wantMusic=state.screen==='game'&&(state.letter===null||state.letter===undefined)&&!state.modal&&!CG.muted();
  const songIdx=songForFactory(state.factoryIdx);
  if(wantMusic&&actx&&(!musNodes||musSong!==songIdx)){
    stopMusic();
    musSong=songIdx;
    startPiano(state.factoryIdx);
  }
  if(!wantMusic&&musNodes){ stopMusic(); musSong=null; }
  if(state.screen==='loading'){ drawLoading(rdt); return; }
  if(state.screen==='title'){ drawTitle(rdt); drawModal(); return; }
  if(state.screen==='home'){ drawHome(rdt); drawModal(); return; }
  /* simulation à pas FIXES de 100 ms, quel que soit le framerate */
  acc+=rdt*1000;
  let n=0;
  while(acc>=TICK_MS&&n<12){ tick(); acc-=TICK_MS; n++; }
  if(n>=12) acc=0;                    
  render(Math.min(1,acc/TICK_MS),rdt);
}

/* ══════ CURSEURS & FAVICON══════ */
const CURSORS={};
function buildCursors(){
  const mk=(w,h,draw,hx,hy)=>{
    const c=document.createElement('canvas'); c.width=w*2; c.height=h*2;
    const g=c.getContext('2d');
    const P=(x,y,col)=>{ g.fillStyle=col; g.fillRect(x*2,y*2,2,2); };
    draw(P);
    return 'url("'+c.toDataURL('image/png')+'") '+(hx*2)+' '+(hy*2)+', auto';
  };

  const B='#2e1f12', K='#e9d3a8', F='#c9b58a';
  CURSORS.default=mk(11,16,P=>{
    for(let y=0;y<=10;y++){
      const w=(y===0)?1:(y===10)?9:Math.min(9,y+1);        
      for(let x=0;x<=w;x++) P(x,y,(y===0||x===w)?B:((x%2===0)?F:K));
      P(0,y,K);                                            
    }
    P(1,0,B);                                              
    for(let x=2;x<=8;x++) P(x,10,B);                       
    for (let y = 11; y <= 15; y++) {
      const t = 4 + Math.floor((y - 11) / 2); // t vaut : 4, 4, 5, 5, 6
      for (let x = t; x <= t + 2; x++) P(x, y, (x === t || x === t + 2) ? B : ((x % 2 === 0) ? F : K));
    }
  },0,0);
  CURSORS.pointer=CURSORS.default;

  CURSORS.crosshair=mk(9,9,P=>{
    const B2='#2e1f12', C='#e9d3a8', O='#e08a3c';
    for(let i=0;i<9;i++){ P(i,4,B2); P(4,i,B2); }
    for(let i=1;i<8;i++){ if(i!==4){ P(i,4,(i%2===0)?F:C); P(4,i,(i%2===0)?F:C); } }
    P(4,4,O);
  },4,4);

  CURSORS['not-allowed']=mk(11,11,P=>{
    const B2='#5e2417', R='#c9553b', L='#e8926f';
    for(let y=0;y<11;y++) for(let x=0;x<11;x++)
      if(Math.abs(x-y)<=1||Math.abs(x+y-10)<=1) P(x,y,B2);
    for(let y=1;y<10;y++) for(let x=1;x<10;x++)
      if(x===y||x+y===10) P(x,y,R);
    P(5,5,L);
  },5,5);
}

function setFavicon(){
  const c=document.createElement('canvas'); c.width=32; c.height=32;
  const g=c.getContext('2d');
  const P=(x,y,w,h,col)=>{ g.fillStyle=col; g.fillRect(x*2,y*2,w*2,h*2); };
  P(0,0,16,16,'#3a2414');                             
  P(1,1,14,14,'#c99e6a');                            
  P(1,1,14,1,'#e9d3a8');                             
  P(1,14,14,1,'#8a6136');                            
  P(3,4,10,1,'#a87e4e'); P(3,7,10,1,'#a87e4e'); P(3,10,10,1,'#a87e4e'); 
  P(7,1,2,14,'#d9cfae');                             
  P(6,1,1,14,'#e9d3a8'); P(9,1,1,14,'#b9ad8f');       
  const link=document.createElement('link');
  link.rel='icon'; link.type='image/png';
  link.href=c.toDataURL('image/png');
  document.head.appendChild(link);
}
let loadStart=0, fontsDone=false;
function whenFontsReady(cb){
  let done=false;
  const finish=()=>{ if(done) return; done=true; cb(); };
  if(document.fonts&&document.fonts.ready){
    Promise.all([
      document.fonts.load('700 10px Silkscreen'),
      document.fonts.load('20px VT323'),
      document.fonts.ready
    ]).then(finish).catch(finish);
    setTimeout(finish,2500);   
  }else setTimeout(finish,0); 
}
function drawLoading(rdt){
  drawBackground();
  const cx=W/2, cy=Math.round(H*0.45);
  const bw=Math.min(320,W-80);
  R(cx-bw/2,cy+6,bw,12,'#3a2c1e');
  R(cx-bw/2,cy+8,bw,8,'#463525');
  R(cx-bw/2,cy+6,bw,2,'#6b563c'); R(cx-bw/2,cy+14,bw,2,'#5b4930');
  const chx=cx-bw/2+((animT*70)%(bw-24))+12;
  drawItemAt(ctx,'caisse',chx,cy+2,1.6);
  const bx=cx-bw/2+((animT*90)%bw);
  R(bx-2,cy+9,4,6,'#8f7752'); R(bx+2,cy+11,4,4,'#8f7752'); R(bx-2,cy+15,4,3,'#8f7752');
  const el=performance.now()-loadStart;
  const pc=fontsDone?1:Math.min(.92,el/2500);
  const pw=Math.min(280,W-100);
  R(cx-pw/2,cy+40,pw,8,'#141009');
  R(cx-pw/2,cy+40,Math.round(pw*pc),8,'#e08a3c');
  R(cx-pw/2,cy+40,Math.round(pw*pc),2,'#ffd9a0');
  ctx.font='16px monospace'; ctx.textAlign='center';
  ctx.fillStyle='#8a755c';
  ctx.fillText(fontsDone?T('ui.loadingGo'):T('ui.loadingWait'),cx,cy+72);
  ctx.textAlign='left';
  if(fontsDone&&el>500){ state.screen='title'; CG.ev('loadingStop'); }
}

function toggleFullscreen(){
  const d=document;
  if(d.fullscreenElement||d.webkitFullscreenElement){
    if(d.exitFullscreen) d.exitFullscreen(); else if(d.webkitExitFullscreen) d.webkitExitFullscreen();
  }else if(canvas.requestFullscreen){
    canvas.requestFullscreen().catch(()=>toast(T('ui.toastFsFail'),T('ui.toastFsFailBody')));
  }else if(canvas.webkitRequestFullscreen){
    canvas.webkitRequestFullscreen();
  }else{
    toast(T('ui.toastFsNA'),T('ui.toastFsNABody'));
  }
}

let storageOK=null;
function checkStorage(){
  if(storageOK!==null) return storageOK;
  try{
    const k='__cartono_probe';
    localStorage.setItem(k,'1');
    localStorage.removeItem(k);
    storageOK=true;
  }catch(e){ storageOK=false; }
  return storageOK;
}

function bootFromSave(){
  if(checkStorage()){
    try{ bootSave=JSON.parse(stGet(SAVE_KEY)); }catch(e){ bootSave=null; }
  }else bootSave=null;
  if(bootSave&&bootSave.v>=3&&bootSave.v<=5){ applySave(bootSave); }
  else{ bootSave=null; resetRun(0); }
}

function init(){
  canvas=document.getElementById('game');
  ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  resize();
  bindEvents();
  bootLang();                     /* langue sauvegardée → traduit toutes les données */
  if(!checkStorage()) toast(T('ui.toastSaveNA'),T('ui.toastSaveNABody'));
  bootFromSave();
  state.letter=null;  
  state.screen='loading';  
  buildCursors();          
  canvas.style.cursor=CURSORS.default;
  setFavicon();            
  loadStart=performance.now();
  whenFontsReady(()=>{ fontsDone=true; });
  requestAnimationFrame(t=>{ lastFrame=t; requestAnimationFrame(frame); });
  try{
    void THEMES.marimba.accords[0][0];
    void THEMES.conseil.bourdons[0];
  }catch(err){ console.error('Tables musique incomplètes :',err); }
}
init();

/* CrazyGames : une fois le SDK prêt (rapide), la sauvegarde du module data
   peut être plus récente que le localStorage local (autre appareil) — si le
   joueur n'a pas encore quitté l'écran de chargement, on la relit et on la
   réapplique ; applySave reconstruit tout l'état, la réapplication est sûre. */
CG.init().then(()=>{
  if(state.screen==='loading') CG.ev('loadingStart');
  else{ CG.ev('loadingStart'); CG.ev('loadingStop'); }
  if(state.screen!=='loading') return;
  let d=null;
  try{ d=JSON.parse(stGet(SAVE_KEY)); }catch(e){ d=null; }
  if(d&&d.v>=3&&d.v<=5) applySave(d);
  CG.ev('reportGameCompletedPercentage',cgProgressPct());
});