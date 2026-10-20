'use strict';

const NB_NIVEAUX = 30;
function diffNiveau(n){ return Math.min(14, (n - 1) * 0.55); }
const SUFFIXES_BOSS = ['', ' MK-II', ' MK-III', ' MK-IV', ' MK-V',
                       ' MK-VI', ' MK-VII', ' MK-VIII', ' MK-IX', ' MK-X'];

const NIVEAUX = [
  //  ACTE I 
  { env:'terre',   secteur:'PLAINES DU SUD',          biomes:['prairie','foret','prairie','foret','prairie','foret'],       patrons:['ligne','mur','colonne'],                                                intervalle:4.8, duree:32, tourelles:11,  tauxTir:0.30, vitesseFond:100 },
  { env:'ocean',   secteur:'LAGON TURQUOISE',         variante:'lagon',      patrons:['ligne','essaim','colonne','mur'],                   intervalle:4.6, duree:35, tauxTir:0.36, vitesseFond:85  },
  { env:'galaxie', secteur:"CEINTURE D'ASTÉROÏDES",   variante:'asteroides', patrons:['zigzags','ligne','asteroides','embuscade'],          intervalle:4.4, duree:38, tauxTir:0.42, vitesseFond:70  },
  { env:'terre',   secteur:'DUNES ROUGES',            biomes:['desert','desert','prairie','desert','desert','desert'],       patrons:['V','plongeons','ligne','helicos','tank','mur'],                         intervalle:4.1, duree:40, tourelles:8,   tauxTir:0.48, vitesseFond:105 },
  { env:'ocean',   secteur:"MER DÉCHAÎNÉE",           variante:'tempete',    patrons:['cercle','bombardier','essaim','raies','embuscade'],  intervalle:3.9, duree:43, tauxTir:0.54, vitesseFond:95  },
  { env:'galaxie', secteur:'PORTES STELLAIRES',       variante:'cometes',    patrons:['serpent','zigzags','cercle','embuscade','essaim'],    intervalle:3.6, duree:46, tauxTir:0.60, vitesseFond:75  },
  { env:'terre',   secteur:'MONTAGNES GIVRÉES',       biomes:['neige','foret','neige','neige','foret','neige'],              patrons:['V','cercle','plongeons','tank','essaim','chasseurs','embuscade'],        intervalle:3.4, duree:48, tourelles:6.5, tauxTir:0.66, vitesseFond:110 },
  { env:'ocean',   secteur:'ABYSSES DU KRAKEN',       variante:'abysses',    patrons:['meduses','bombardier','cercle','essaim','plongeons'], intervalle:3.2, duree:50, tauxTir:0.72, vitesseFond:80  },
  { env:'galaxie', secteur:'NÉBULEUSE ÉCARLATE',      variante:'nebuleuse',  patrons:['serpent','cercle','zigzags','embuscade','bombardier'], intervalle:3.0, duree:52, tauxTir:0.78, vitesseFond:80  },
  { env:'terre',   secteur:'BASE SECRÈTE K-7',        biomes:['base','prairie','base','base','desert','base'],              patrons:['plongeons','cercle','helicos','tank','bombardier','chasseurs','essaim'], intervalle:2.8, duree:54, tourelles:5,   tauxTir:0.85, vitesseFond:115 },
  //  ACTE II 
  { env:'ocean',   secteur:'LA BANQUISE',             variante:'banquise',   patrons:['ligne','mur','colonne','essaim','meduses'],          intervalle:3.8, duree:46, tauxTir:0.70, vitesseFond:85  },
  { env:'galaxie', secteur:"L'HORIZON DES ÉVÉNEMENTS",variante:'trounoir',   patrons:['asteroides','serpent','zigzags','cercle','embuscade'], intervalle:3.6, duree:48, tauxTir:0.74, vitesseFond:75  },
  { env:'terre',   secteur:'VOLCANS EN FURIE',        biomes:['volcan','volcan','desert','volcan','volcan','volcan'],        patrons:['V','plongeons','helicos','tank','croiseurs','essaim'],                   intervalle:3.5, duree:50, tourelles:6,   tauxTir:0.78, vitesseFond:110 },
  { env:'ocean',   secteur:'BARRIÈRE DE CORAIL',      variante:'lagon',      patrons:['raies','cercle','bombardier','essaim','meduses'],     intervalle:3.4, duree:52, tauxTir:0.80, vitesseFond:90  },
  { env:'galaxie', secteur:'LE PULSAR',               variante:'pulsar',     patrons:['serpent','zigzags','croiseurs','asteroides','embuscade'], intervalle:3.3, duree:54, tauxTir:0.82, vitesseFond:80  },
  { env:'terre',   secteur:'MÉTROPOLE NOCTURNE',      biomes:['cite','cite','prairie','cite','cite','cite'],                 patrons:['chasseurs','croiseurs','mines','plongeons','tank','essaim'],             intervalle:3.2, duree:56, tourelles:5,   tauxTir:0.85, vitesseFond:110 },
  { env:'ocean',   secteur:'TEMPÊTE PERPÉTUELLE',     variante:'tempete',    patrons:['cercle','raies','bombardier','essaim','plongeons','meduses'], intervalle:3.1, duree:58, tauxTir:0.88, vitesseFond:100 },
  { env:'galaxie', secteur:'DÉBRIS ORBITAUX',         variante:'asteroides', patrons:['asteroides','serpent','zigzags','embuscade','croiseurs'], intervalle:3.0, duree:60, tauxTir:0.90, vitesseFond:80  },
  { env:'terre',   secteur:'LA GRANDE SYLVE',         biomes:['foret','neige','foret','foret','neige','foret'],              patrons:['V','cercle','croiseurs','tank','chasseurs','plongeons'],                 intervalle:2.9, duree:60, tourelles:4.5, tauxTir:0.92, vitesseFond:110 },
  { env:'ocean',   secteur:'ABYSSES SANS FOND',       variante:'abysses',    patrons:['meduses','bombardier','cercle','essaim','raies','plongeons'], intervalle:2.8, duree:62, tauxTir:0.94, vitesseFond:85 },
  //  ACTE III 
  { env:'galaxie', secteur:'NUÉE MAGNÉTIQUE',         variante:'nebuleuse',  patrons:['serpent','cercle','zigzags','asteroides','croiseurs','embuscade'], intervalle:2.8, duree:62, tauxTir:0.96, vitesseFond:80 },
  { env:'terre',   secteur:'MIRAGE DE CENDRE',        biomes:['desert','volcan','desert','volcan','desert','volcan'],        patrons:['plongeons','helicos','croiseurs','tank','essaim','chasseurs','mines'],    intervalle:2.7, duree:64, tourelles:4,   tauxTir:0.98, vitesseFond:115 },
  { env:'ocean',   secteur:'GLACE ÉTERNELLE',         variante:'banquise',   patrons:['meduses','raies','essaim','colonne','mines','cercle'], intervalle:2.7, duree:64, tauxTir:1,    vitesseFond:85  },
  { env:'galaxie', secteur:'TRAÎNÉE COMÉTIQUE',       variante:'cometes',    patrons:['asteroides','serpent','zigzags','croiseurs','mines','embuscade'], intervalle:2.6, duree:66, tauxTir:1, vitesseFond:85  },
  { env:'terre',   secteur:"FORTERESSE D'ACIER",      biomes:['base','cite','base','base','cite','base'],                   patrons:['helicos','chasseurs','croiseurs','tank','mines','bombardier','plongeons'], intervalle:2.6, duree:66, tourelles:3.5, tauxTir:1, vitesseFond:120 },
  { env:'ocean',   secteur:'ABYSSES INFINIES',        variante:'abysses',    patrons:['meduses','bombardier','cercle','essaim','raies','mines'], intervalle:2.5, duree:68, tauxTir:1,    vitesseFond:90  },
  { env:'galaxie', secteur:'GUEULE DU VIDE',          variante:'trounoir',   patrons:['serpent','asteroides','zigzags','croiseurs','embuscade','mines'], intervalle:2.5, duree:68, tauxTir:1, vitesseFond:85 },
  { env:'terre',   secteur:"CŒUR DU VOLCAN",          biomes:['volcan','base','volcan','volcan','base','volcan'],            patrons:['helicos','chasseurs','plongeons','tank','croiseurs','mines','essaim'],    intervalle:2.4, duree:70, tourelles:3.2, tauxTir:1,    vitesseFond:120 },
  { env:'ocean',   secteur:'TEMPÊTE FINALE',          variante:'tempete',    patrons:['cercle','raies','meduses','bombardier','essaim','mines','plongeons'], intervalle:2.4, duree:70, tauxTir:1, vitesseFond:100 },
  { env:'galaxie', secteur:'CŒUR DU PULSAR',          variante:'pulsar',     patrons:['serpent','asteroides','croiseurs','zigzags','mines','embuscade','bombardier'], intervalle:2.3, duree:72, tauxTir:1, vitesseFond:90 },
];

const BIOMES_SUPPLEMENTAIRES = {
  volcan: {
    base:'#4a3b3e',
    peindre(c, rng){
      const tons = ['#4a3b3e', '#544346', '#3f3336'];
      for (let y = 0; y < 720; y += 24){
        c.fillStyle = tons[(rng() * 3) | 0];
        c.fillRect(0, y, L, 24);
        c.fillStyle = 'rgba(0,0,0,.22)';
        for (let i = 0; i < 6; i++) c.fillRect((rng() * L) | 0, y + ((rng() * 20) | 0), 9, 6);
      }
      for (let k = 0; k < 2; k++){
        const cx = 100 + rng() * (L - 200);
        for (let y = 0; y < 720; y += 6){
          const x = cx + Math.sin(y * 0.021 + k * 2.4) * 34;
          c.fillStyle = '#7a2410'; c.fillRect(x - 16, y, 32, 6);   // berge brûlée
          c.fillStyle = '#ff6a2a'; c.fillRect(x - 11, y, 22, 6);
          c.fillStyle = '#ffd24a'; c.fillRect(x - 5, y + 1, 10, 4);
        }
      }
      for (let k = 0; k < 3; k++){
        const x = 70 + rng() * (L - 140), y = 80 + rng() * 560, r = 20 + rng() * 22;
        c.fillStyle = '#241b1e'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = '#ff6a2a'; c.lineWidth = 5;
        c.beginPath(); c.arc(x, y, r - 2, 0, 7); c.stroke();
        c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(x, y, r * 0.3, 0, 7); c.fill();
      }
      semer(c, rng, SPRITES.rocher, 9);
    },
  },
  cite: {
    base:'#232830',
    peindre(c, rng){
      c.fillStyle = '#232830'; c.fillRect(0, 0, L, 720);
      // grille de rues
      c.fillStyle = '#3a4250';
      for (let y = 20; y < 720; y += 120) c.fillRect(0, y, L, 16);
      for (let x = 30; x < L; x += 130) c.fillRect(x, 0, 14, 720);
      c.fillStyle = '#c9a93e';
      for (let y = 20; y < 720; y += 120)
        for (let x = 10; x < L; x += 44) c.fillRect(x, y + 7, 20, 2);
      for (let y = 44; y < 700; y += 120){
        for (let x = 50; x < L - 90; x += 130){
          const w = 36 + ((rng() * 40) | 0), h = 34 + ((rng() * 44) | 0);
          const bx = x + ((rng() * 30) | 0), by = y + ((rng() * 30) | 0);
          if (bx + w > L - 20 || by + h > 716) continue;
          c.fillStyle = '#39404c'; c.fillRect(bx, by, w, h);
          c.fillStyle = '#4a525e'; c.fillRect(bx, by, w, 5);   
          for (let fy = by + 9; fy < by + h - 5; fy += 8)
            for (let fx = bx + 6; fx < bx + w - 5; fx += 9){
              c.fillStyle = rng() < 0.55 ? '#ffd24a' : '#2a2f38';
              c.fillRect(fx, fy, 4, 4);
            }
          if (rng() < 0.4){ c.fillStyle = '#ff5040'; c.fillRect(bx + w - 6, by + 2, 3, 3); }
        }
      }
    },
  },
};

const VARIANTE_BANQUISE = {
  bandes:['#8fb8cf', '#84aec8', '#98c0d6', '#8ab2cc'],
  houle:'rgba(230,246,252,.38)', ecume:'rgba(255,255,255,.85)', alphaEcume:.5,
  iles:true, pluie:false, plancton:false, corail:false, delaiIle:[6, 11],
};

function fabriquerIceberg(seed){
  const rng = mulberry32(seed);
  const w = 120, h = 90, cx = w / 2, cy = h / 2;
  const cv = cvAux(w, h);
  const c = cv.getContext('2d');
  c.fillStyle = '#e8f4fb';
  c.beginPath();
  for (let k = 0; k < 9; k++){
    const a = k / 9 * Math.PI * 2, r = 30 + rng() * 16;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.62;
    k ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath(); c.fill();
  c.fillStyle = '#bcdcec';
  c.beginPath(); c.ellipse(cx, cy + 12, 30, 15, 0, 0, 7); c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(cx - 6, cy - 8, 20, 10, 0, 0, 7); c.fill();
  return { cv, ombre: teinter(cv, '#27506b') };
}

function fabriquerBrume(seed){
  const rng = mulberry32(seed);
  const cv = cvAux(L, 720);
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(232,244,251,.16)';
  for (let y = 30; y < 720; y += 110){
    const nb = 3 + ((rng() * 3) | 0);
    for (let i = 0; i < nb; i++){
      c.beginPath();
      c.ellipse(rng() * L, y, 60 + rng() * 130, 9 + rng() * 8, 0, 0, 7);
      c.fill();
    }
  }
  return cv;
}