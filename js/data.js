/* ============================================================
   PROJET TONCPLAY — DONNÉES (jeux & actualités)
   ------------------------------------------------------------
   C'EST LE SEUL FICHIER À ÉDITER pour ajouter du contenu.
   Le site se met à jour tout seul : filtres, compteurs,
   recherche, dates… rien d'autre à toucher.

   Sommaire :
   1. GAMES ........ la liste des jeux
   2. NEWS ......... la liste des actualités
   3. GENRE_ORDER .. l'ordre des boutons de filtre
   4. GENRE_STYLES . la couleur du badge de chaque genre
   ============================================================ */


/* ============================================================
   1. JEUX
   ------------------------------------------------------------
   Pour ajouter un jeu, copiez le bloc ci-dessous et collez-le
   dans la liste GAMES (en haut pour qu'il apparaisse en premier
   avec le tri « Plus récents ») :

   {
     img:   'jaquette/monjeu.png',              // jaquette du jeu
     title: 'Mon Jeu',                           // titre affiché
     desc:  'Une description courte et drôle.',  // description
     link:  'jeux/monjeu/index.html',            // lien vers le jeu
     genre: 'Arcade',                            // UN genre de GENRE_ORDER (point 3)
     tags:  ['Tag1', 'Tag2', 'Tag3'],            // 2-3 tags de style (#affichés comme ceci)
     date:  '31/12/2026',                        // date de sortie (affichée sur la carte)
     iso:   '2026-12-31',                        // MÊME date au format AAAA-MM-JJ (sert au tri)
   },
   ============================================================ */
const GAMES = [
  {
    img: 'jaquette/taxirush.jpg',
    title: 'Taxi Rush',
    desc: "C'est comme Crazy Taxi, mais en moins bien et avec le permis B obtenu au bénéfice du doute.",
    link: 'jeux/taxirush/index.html',
    genre: 'Arcade',
    tags: ['Course', '3D', 'Livraison'],
    date: '22/09/2026',
    iso: '2026-09-22',
  },
  {
    img: 'jaquette/donjonbaluchon.png',
    title: 'Donjon & Baluchon',
    desc: "Oublie les dragons ! Ta mission : pousser tes baluchons aux bons endroits du donjon.",
    link: 'jeux/donjonbaluchon/index.html',
    genre: 'Réflexion',
    tags: ['Casse-tête', 'Sokoban', 'Éditeur'],
    date: '17/09/2026',
    iso: '2026-09-17',
  },
  {
    img: 'jaquette/sliderobot.png',
    title: 'Slide Robot',
    desc: 'Jeu de réflexion mécanique.',
    link: 'jeux/sliderobot/index.html',
    genre: 'Réflexion',
    tags: ['Logique', 'Mécanique', 'Stratégie'],
    date: '17/06/2026',
    iso: '2026-06-17',
  },
  {
    img: 'jaquette/cafetycoon.png',
    title: 'Café Tycoon',
    desc: 'Cultivez, Préparez, Progressez !',
    link: 'jeux/cafetycoon/index.html',
    genre: 'Gestion',
    tags: ['Simulation', 'Idle', 'Café'],
    date: '09/06/2026',
    iso: '2026-06-09',
  },
  {
    img: 'jaquette/deadzonebastion.jpg',
    title: 'Dead Zone Bastion',
    desc: "Des zombies, du pixel et du tir. Plus simple que d'expliquer à mamie comment vider son cache !",
    link: 'jeux/deadzonebastion/index.html',
    genre: 'Action',
    tags: ['Zombies', 'Upgrades', 'Pixels'],
    date: '25/01/2026',
    iso: '2026-01-25',
  },
  {
    img: 'jaquette/neonsnake.png',
    title: 'Neon Snake',
    desc: "Le serpent rétro en version néon. On a gardé la seule vraie règle : manger sans se mordre !",
    link: 'jeux/neonsnake/index.html',
    genre: 'Arcade',
    tags: ['Classique', 'Rétro', 'Néon'],
    date: '06/01/2026',
    iso: '2026-01-06',
  },
  {
    img: 'jaquette/leblob.png',
    title: 'Le Blob',
    desc: "Un Blob glissant en quête de flocons d'avoine. Une quête pas très épique, mais nourrissante.",
    link: 'jeux/leblob/index.html',
    genre: 'Plateforme',
    tags: ['Collecte', 'Aventure', 'Glissant'],
    date: '06/08/2025',
    iso: '2025-08-06',
  },
  {
    img: 'jaquette/rastajump.png',
    title: 'Rasta Jump',
    desc: "Un rasta qui saute. Voilà. La vie est parfois une histoire simple.",
    link: 'jeux/rastajump/index.html',
    genre: 'Plateforme',
    tags: ['Saut', 'Arcade', 'Chill'],
    date: '15/06/2025',
    iso: '2025-06-15',
  },
  {
    img: 'jaquette/survivhordes.jpg',
    title: "Surviv'Hordes",
    desc: "« Vous les entendez. Il en vient de partout ! » Des zombies. Beaucoup de zombies. On vous a prévenus.",
    link: 'jeux/survivhordes/index.html',
    genre: 'Survie',
    tags: ['Roguelike', 'Zombies', 'Vagues'],
    date: '19/12/2024',
    iso: '2024-12-19',
  },
  {
    img: 'jaquette/galacticdefender.png',
    title: 'Galactic Defender',
    desc: "Shoot 'em up explosif ! Si vous aimez les météorites et les boss coriaces, c'est pour vous.",
    link: 'jeux/galacticdefender/index.html',
    genre: 'Action',
    tags: ["Shoot'em up", 'Espace', 'Boss'],
    date: '21/11/2024',
    iso: '2024-11-21',
  },
  {
    img: 'jaquette/cartongame.png',
    title: 'Carton Game',
    desc: "Cliquez, optimisez, vendez. Devenez le magnat du carton, la matière la plus excitante depuis le papier bulle.",
    link: 'jeux/cartongame/index.html',
    genre: 'Gestion',
    tags: ['Clicker', 'Idle', 'Business'],
    date: '29/10/2024',
    iso: '2024-10-29',
  },
  {
    img: 'jaquette/luminescence.jpg',
    title: 'Luminescence',
    desc: "Notre tout premier jeu. On ramasse des orbes et on évite des obstacles. C'est pas ouf, mais c'est notre bébé.",
    link: 'jeux/luminescence/index.html',
    genre: 'Arcade',
    tags: ['Collecte', 'Réflexes', 'First'],
    date: '28/09/2024',
    iso: '2024-09-28',
  },
];


/* ============================================================
   2. ACTUALITÉS
   ------------------------------------------------------------
   Pour ajouter une news, copiez le bloc ci-dessous et collez-le
   EN HAUT de la liste NEWS (les news s'affichent dans l'ordre
   de la liste) :

   {
     img:   'jaquette/monjeu.png',     // vignette
     title: 'Sortie de Mon Jeu',        // titre
     date:  '31/12/2026',               // date affichée
     text:  'Le texte de la news…',     // HTML simple autorisé : <b>, <i>, <br>
   },

   Le badge de la news est détecté automatiquement selon le
   début du titre :
   • « Sortie de… »    → badge SORTIE (vert)
   • « Mise à jour… »  → badge MAJ (orange)
   • tout le reste     → badge ÉVÉNEMENT (bleu)
   ============================================================ */
const NEWS = [
  {
    img: 'jaquette/taxirush.jpg',
    title: 'Sortie de Taxi Rush',
    date: '22/09/2026',
    text: `<b>Taxi Rush est là !</b> Notre nouveau jeu d'arcade 3D est en ligne. Embarquez vos clients, évitez les platanes et gardez les yeux sur la route.`,
  },
  {
    img: 'jaquette/donjonbaluchon.png',
    title: 'Sortie de Donjon & Baluchon !',
    date: '17/09/2026',
    text: `Donjon & Baluchon est enfin disponible ! Oubliez les dragons : incarnez un chevalier, poussez vos sacs à travers 25 donjons et créez vos propres casse-têtes grâce à l éditeur inclus.`,
  },
  {
    img: 'jaquette/sliderobot.png',
    title: 'Sortie de Slide Robot !',
    date: '17/06/2026',
    text: `Sortie de Slide Robot : un jeu de réflexion mécanique et stratégique où la logique est votre seule alliée, même si, à un moment donné, on a tous juste envie de cliquer partout en espérant que ça passe.`,
  },
  {
    img: 'jaquette/cafetycoon.png',
    title: 'Sortie de Café Tycoon',
    date: '09/06/2026',
    text: `Cultivez. Préparez. Progressez. Bienvenue dans Coffee Tycoon !`,
  },
  {
    img: 'jaquette/survivhordes.jpg',
    title: "Mise à jour Surviv'Hordes",
    date: '21/02/2026',
    text: `<b>Flash Maj 1.2 : Plus propre, plus moche, plus riche.</b><br><br>
    On a ouvert le capot avec Roger (l'IA) et voici ce qui en est tombé :<br><br>
    • <b>L'Oseille :</b> Arrivée de la boutique. Devenez riche (en pixels uniquement, désolé).<br>
    • <b>Le Nécrologe :</b> Nouveaux zombies et un Boss. Plus fluides, mais toujours aussi malpolis.<br>
    • <b>Option Jardinage :</b> Sort « Tondeuse à Gazon ». C'est propre, mais c'est n'importe quoi.<br>
    • <b>Couteau à dents :</b> Skinner ou Bowie... peu importe, ça tranche sec.<br>
    • <b>Relooking :</b> Une « Page d'Âme » pour vos stats et un Bichon qui marche enfin comme un vrai chien.<br>
    • <b>SAV :</b> La Bombe à eau donne enfin de l'XP. On n'est pas une association caritative pour zombies.<br><br>
    <i>C'est en ligne, c'est gratuit, et c'est garanti sans gluten.</i><br><br>
    <i>Le changelog complet est dispo directement sur Surviv'Hordes. C'est un peu long à lire, mais c'est toujours mieux que la notice d'un buffet suédois.</i>`,
  },
  {
    img: 'jaquette/deadzonebastion.jpg',
    title: 'Mise à jour Dead Zone Bastion',
    date: '04/02/2026',
    text: `On a revu la copie ! Voici les changements sur Dead Zone Bastion (garantis sans conservateurs, mais avec beaucoup de zombies).<br><br>
    <b>Côté Castagne</b><br>
    • Soldes : Le Tir Multiple coûte désormais le même prix que le % Critique. C'est cadeau.<br>
    • Nouveauté : Arrivée du sort Cercle de flèche et de ses options au labo.<br>
    • Équilibrage : La vitesse d'attaque baisse drastiquement et les PV des boss deviennent exponentiels. C'est plus dur ? Oui, c'est le concept.<br>
    • Prison : Temps de recharge plus long et les ennemis ne font plus de dégâts quand ils sont sous Prison.<br><br>
    <b>Nos amis les monstres</b><br>
    • Casting : Deux nouveaux zombies font leur entrée.<br>
    • Espionnage : Cliquez sur un ennemi pour voir son nom et ses stats. Utile pour savoir qui va vous manger.<br>
    • Pognon : Les boss lâchent plus de diamants. Les zombies aussi, mais attention : s'ils traînent par terre, ils disparaissent. Un peu comme votre dignité après une défaite.<br><br>
    <b>Confort de jeu</b><br>
    • Turbo : Ajout de la Vitesse X3 et des raccourcis clavier.<br>
    • Look : Nouveau fond d'écran, nouveau pointeur et correction des fautes qui piquaient les yeux.<br><br>
    Prêt à retourner au charbon ? On vous attend en jeu !`,
  },
  {
    img: 'jaquette/deadzonebastion.jpg',
    title: 'Sortie de Dead Zone Bastion',
    date: '25/01/2026',
    text: `Le Projet ToncPlay vient de lâcher Dead Zone Bastion. Le concept ? On vous donne une tour, des diamants et beaucoup de problèmes qui grognent.<br><br>
    C'est simple : vous améliorez votre Bastion au labo, ou vous servez de buffet à volonté pour zombies en manque d'affection. À vous de voir.<br><br>
    Dead Zone Bastion : c'est du pixel, c'est du stress, et c'est surtout beaucoup plus simple que d'expliquer à sa grand-mère comment vider le cache de son navigateur. Jouez maintenant !`,
  },
  {
    img: 'jaquette/neonsnake.png',
    title: 'Sortie de Neon Snake',
    date: '06/01/2026',
    text: `Pour les 1 an de ToncPlay, on aurait pu vous offrir un voyage sur Mars ou un NFT d'art abstrait. On a préféré faire mieux : déterrer notre tout premier projet, le Snake, et lui offrir une cure de jouvence.<br><br>
    C'est le jeu par lequel tout a commencé, l'ADN brut du Projet ToncPlay, remis au goût du jour. Pas de chichis, juste un serpent, des pixels et ce plaisir nostalgique de ne surtout pas se mordre la queue.`,
  },
  {
    img: 'jaquette/leblob.png',
    title: 'Sortie de Le Blob',
    date: '06/08/2025',
    text: `Dans un monde où les céréales sont rares et gluantes, un être mou s'élève.<br><br>
    Et cet être… c'est toi.<br><br>
    Oui, toi, le Blob.<br><br>
    Pas très rapide, pas très net, mais drivé par une seule obsession : les flocons d'avoine.<br><br>
    C'est un jeu de plateforme, tu sautes, tu glisses, tu baves un peu, et tu récupères des flocons comme si ta vie en dépendait. (Spoiler : c'est peut-être le cas.)<br><br>
    Chaque niveau est une ode au gluten lent, chaque obstacle un rappel que la gravité n'aime pas les blobs. Mais tu es tenace, et surtout, t'as faim.<br><br>
    Bref : c'est du Blob, c'est de la plateforme, c'est de l'avoine. Et c'est probablement le seul jeu au monde où on peut tomber dans le vide en criant : « Mais pourquoi j'ai pas pris du quinoa ?! »`,
  },
  {
    img: 'jaquette/cartongame.png',
    title: 'Mise à jour Carton Game',
    date: '02/08/2025',
    text: `Attention les mirettes, on a dépoussiéré le site avec une mise à jour visuelle qui claque, même si on n'avait qu'un rouleau de scotch et un feutre.<br><br>
    On a regroupé toutes les fonctionnalités sur la page « Jeu » pour que vous ne vous perdiez plus comme un dahu dans la forêt du web.<br><br>
    Et, cerise sur le carton, on a mis à jour les succès ! C'est le moment de prouver que vous êtes un as du clic, ou du moins, un amateur éclairé du carton.`,
  },
  {
    img: 'jaquette/rastajump.png',
    title: 'Sortie de Rasta Jump',
    date: '15/06/2025',
    text: `Petit jeu de saut avec un Rasta en mascotte ! Pourquoi pas ?<br><br>
    Création de toutes les images et de quelques lignes de code pour un résultat simple mais satisfaisant.`,
  },
  {
    img: 'images/logo.png',
    title: 'Création du site Projet ToncPlay',
    date: '06/01/2025',
    text: `« Un projet sans site, c'est comme une pizza sans fromage : ça existe, mais c'est triste. »<br><br>
    Alors voilà, on a fait un site. Paf.<br><br>
    Tous nos jeux gratuits réunis au même endroit, parce que :<br>
    • C'est plus propre.<br>
    • C'est plus classe.<br>
    • Et surtout, on avait envie de cliquer sur notre propre logo.<br><br>
    Le Projet ToncPlay a maintenant un QG digital pour stocker des pixels, des idées étranges, et potentiellement un bug ou deux (offerts).<br><br>
    Allez viens, c'est gratuit, c'est bizarre, c'est ToncPlay.`,
  },
  {
    img: 'jaquette/survivhordes.jpg',
    title: "Mise à jour Surviv'Hordes 1.1",
    date: '02/01/2025',
    text: `Mise à jour 1.1 — Attention où tu mets les pieds… les ruines arrivent.<br><br>
    On a revu la difficulté à la baisse, histoire que ton clavier ne parte pas en grève au bout de cinq minutes. Mais ne te détends pas trop vite : de nouvelles mécaniques viennent mettre du piment dans ta survie.<br><br>
    <b>Les Boss débarquent.</b> Et comme tout boss qui se respecte, ils ne repartent pas sans laisser un petit cadeau :<br>
    • À leur mort, une ruine apparaît.<br>
    • Ces ruines, c'est pas de la déco façon « ambiance château hanté » : elles génèrent des vagues de zombies prêts à te mordre les chaussettes.<br><br>
    <b>Nouveaux sorts passifs au menu :</b><br>
    • <b>Kit du Bricoleur :</b> un petit gadget bien pensé qui balance un projectile rebondissant. Idéal pour les couloirs étroits ou impressionner ta belle-famille.<br>
    • <b>Bichon Maltais à trois pattes :</b> il te suit partout, il mord les zombies, il boite un peu, mais il t'aime d'un amour pur et féroce. Et franchement, t'as besoin de ça dans ta vie.`,
  },
  {
    img: 'jaquette/survivhordes.jpg',
    title: "Sortie de Surviv'Hordes",
    date: '19/12/2024',
    text: `Hommage pas très propre à Hordes.fr — avec du sang, du sable et du pixel.<br><br>
    Tu te souviens de Hordes.fr ? Ce bon vieux jeu où tu crevais de soif, de faim, ou d'un coup de pelle d'un voisin un peu trop motivé ?<br><br>
    Ben voilà. On lui a rendu hommage. Mais façon roguelike-survivor, version 2025, avec des zombies, du loot, des vagues, et beaucoup moins d'organisation communautaire (on a viré le forum, t'inquiète).<br><br>
    C'est inspiré de Vampire Survivors, mais ça sent le désert, la poussière et la paranoïa.<br><br>
    Tu survis, tu claques, tu recommences — en espérant looter un truc utile avant de servir de repas. Ici, pas de tour de garde ni de plan de construction, juste toi, un flingue et quelques regrets.`,
  },
  {
    img: 'jaquette/galacticdefender.png',
    title: 'Sortie de Galactic Defender',
    date: '21/11/2024',
    text: `ToncPlay présente : Le shoot'em up qui fait transpirer les pixels.<br><br>
    Tu veux du calme ? Va jardiner. Ici, c'est du shoot'em up survitaminé, version ToncPlay. Pas de pause, pas de sieste, juste toi, des ennemis en sueur, et des météorites qui te jugent.<br><br>
    • Dézinguer des hordes d'ennemis comme si t'étais dans une pub pour de la lessive (mais en plus explosive).<br>
    • Esquiver des météorites comme Matrix version grotte spatiale.<br>
    • Affronter des boss aussi charismatiques qu'un politicien en campagne… mais avec beaucoup plus de dégâts et moins de promesses.<br><br>
    Ton objectif ? Survivre. Tirer. Hurler un peu. Et recommencer.<br><br>
    Un jeu 100% arcade, 0% gluten, avec juste ce qu'il faut de rage et de bruitages bizarres. Appuie sur start. Et serre les fesses.`,
  },
  {
    img: 'jaquette/cartongame.png',
    title: 'Sortie de Carton Game',
    date: '29/10/2024',
    text: `Oublie les diamants, l'or ou les NFT moches : l'avenir, c'est le carton.<br><br>
    Dans ce jeu cliqueur hautement recyclable, tu incarnes un magnat du carton, prêt à transformer du pauvre papier en empire du packaging.<br><br>
    • Tu chopes du papier.<br>
    • Tu le presses, tu le plies, tu le cartonnes.<br>
    • Et tu vends ça à prix d'or aux rois de la livraison express.<br><br>
    Optimise tes machines, débloque des améliorations débiles (genre presse à hamster ou intelligence artificielle en carton), et grimpe jusqu'au sommet de la chaîne logistique mondiale.<br><br>
    Bref, deviens l'empereur de l'emballage, sans jamais sortir de ton fauteuil.`,
  },
  {
    img: 'jaquette/luminescence.jpg',
    title: 'Sortie de Luminescence',
    date: '28/09/2024',
    text: `ToncPlay : le premier jeu, le premier bug, la première larme.<br><br>
    Tout a commencé par une idée générée par une intelligence artificielle. Et au lieu de l'ignorer poliment comme on fait avec les idées cheloues de tonton Francis, on l'a faite. À la main. Avec du JavaScript, des cafés froids, et Google ouvert en triple écran.<br><br>
    C'est notre toute première expérience. Notre premier jeu. Et potentiellement le premier projet à faire crasher ton navigateur avec le sourire.<br><br>
    Un jeu modeste, un peu bancal, mais bourré de curiosité, d'envie et d'effets sonores douteux.<br><br>
    Bref : un projet d'apprentissage, de fun, et de pixels pas trop mal alignés.`,
  },
];


/* ============================================================
   3. GENRE_ORDER — ordre des boutons de filtre sur la page Jeux
   ============================================================ */
const GENRE_ORDER = ['Action', 'Arcade', 'Réflexion', 'Plateforme', 'Gestion', 'Survie'];


/* ============================================================
   4. GENRE_STYLES — couleur du badge de chaque genre
   ------------------------------------------------------------
   Pour créer un nouveau genre :
   1. Ajoutez son nom dans GENRE_ORDER (ci-dessus).
   2. Ajoutez ses couleurs ici (color = texte, bg = fond,
      border = bordure — utilisez des valeurs rgba semi-
      transparentes pour rester dans l'esprit du design).
   Note : un jeu déclaré avec un genre inconnu de cette liste
   est toléré : il apparaîtra automatiquement en fin de filtres
   avec la couleur accent par défaut.
   ============================================================ */
const GENRE_STYLES = {
  'Action':     { color: '#ff7a6b', bg: 'rgba(255,122,107,.1)',  border: 'rgba(255,122,107,.32)' },
  'Arcade':     { color: '#ffd166', bg: 'rgba(255,209,102,.09)', border: 'rgba(255,209,102,.3)'  },
  'Réflexion':  { color: '#6bb6ff', bg: 'rgba(107,182,255,.09)', border: 'rgba(107,182,255,.3)' },
  'Plateforme': { color: '#c39bff', bg: 'rgba(195,155,255,.09)', border: 'rgba(195,155,255,.3)' },
  'Gestion':    { color: '#ff9f6b', bg: 'rgba(255,159,107,.09)', border: 'rgba(255,159,107,.3)' },
  'Survie':     { color: '#00e676', bg: 'rgba(0,230,118,.09)',   border: 'rgba(0,230,118,.32)'  },
};