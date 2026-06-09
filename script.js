
/* ============================================================
  DONNÉES — Jeux
  ============================================================ */
const GAMES = [
{
  img: 'jaquette/cafetycoon.png',
  title: 'Café Tycoon',
  desc: 'Cultivez, Préparez, Progressez !',
  link: 'jeux/cafetycoon/index.html'
},
{
  img: 'jaquette/deadzonebastion.jpg',
  title: 'Dead Zone Bastion',
  desc: "Des zombies, des pixels, des upgrades et c'est surtout beaucoup plus simple que d'expliquer à sa grand-mère comment vider le cache de son navigateur.",
  link: 'jeux/deadzonebastion/index.html'
},
{
  img: 'jaquette/neonsnake.png',
  title: 'Neon Snake',
  desc: "Un serpent qui brille dans le futur. On a gardé le concept de base parce qu'on n'a toujours pas trouvé comment faire plus simple que « manger et ne pas se rentrer dedans ».",
  link: 'jeux/neonsnake/index.html'
},
{
  img: 'jaquette/leblob.png',
  title: 'Le Blob',
  desc: "Un Blob en quête de flocons d'avoine. Il y a plus épique comme quête, mais pas plus nourrissant.",
  link: 'jeux/leblob/index.html'
},
{
  img: 'jaquette/rastajump.png',
  title: 'Rasta Jump',
  desc: "Un rasta qui saute. Voilà. La vie est parfois une histoire simple.",
  link: 'jeux/rastajump/index.html'
},
{
  img: 'jaquette/survivhordes.jpg',
  title: "Surviv'Hordes",
  desc: "« Vous les entendez. Il en vient de partout ! » C'est un Roguelike. Des zombies. Beaucoup de zombies. On vous a prévenus.",
  link: 'jeux/survivhordes/index.html'
},
{
  img: 'jaquette/galacticdefender.png',
  title: 'Galactic Defender',
  desc: "Un Shoot 'Em Up où ça explose de partout. Si vous aimez les météorites et les boss qui vous filent un torticolis, c'est pour vous !",
  link: 'jeux/galacticdefender/index.html'
},
{
  img: 'jaquette/cartongame.png',
  title: 'Carton Game',
  desc: "Cliquez, optimisez, vendez. Devenez le magnat du carton, la matière la plus excitante depuis le papier bulle.",
  link: 'jeux/cartongame/index.html'
},
{
  img: 'jaquette/luminescence.jpg',
  title: 'Luminescence',
  desc: "Notre tout premier jeu. On ramasse des orbes et on évite des obstacles. C'est pas ouf, mais c'est notre bébé.",
  link: 'jeux/luminescence/index.html'
}
];

/* ============================================================
  DONNÉES — Actualités
  ============================================================ */
const NEWS = [
{
  img: 'jaquette/cafetycoon.png',
  title: 'Sortie de Café Tycoon',
  date: '09/06/2026',
  text: 'Cultivez. Préparez. Progressez. Bienvenue dans Coffee Tycoon !'
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
  <i>Le changelog complet est dispo directement sur Surviv'Hordes. C'est un peu long à lire, mais c'est toujours mieux que la notice d'un buffet suédois.</i>`
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
  Prêt à retourner au charbon ? On vous attend en jeu !`
},
{
  img: 'jaquette/deadzonebastion.jpg',
  title: 'Sortie de Dead Zone Bastion',
  date: '25/01/2026',
  text: `Le Projet ToncPlay vient de lâcher Dead Zone Bastion. Le concept ? On vous donne une tour, des diamants et beaucoup de problèmes qui grognent.<br><br>
  C'est simple : vous améliorez votre Bastion au labo, ou vous servez de buffet à volonté pour zombies en manque d'affection. À vous de voir.<br><br>
  Dead Zone Bastion : c'est du pixel, c'est du stress, et c'est surtout beaucoup plus simple que d'expliquer à sa grand-mère comment vider le cache de son navigateur. Jouez maintenant !`
},
{
  img: 'jaquette/neonsnake.png',
  title: 'Sortie de Neon Snake',
  date: '06/01/2026',
  text: `Pour les 1 an de ToncPlay, on aurait pu vous offrir un voyage sur Mars ou un NFT d'art abstrait. On a préféré faire mieux : déterrer notre tout premier projet, le Snake, et lui offrir une cure de jouvence.<br><br>
  C'est le jeu par lequel tout a commencé, l'ADN brut du Projet ToncPlay, remis au goût du jour. Pas de chichis, juste un serpent, des pixels et ce plaisir nostalgique de ne surtout pas se mordre la queue.`
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
  Bref : c'est du Blob, c'est de la plateforme, c'est de l'avoine. Et c'est probablement le seul jeu au monde où on peut tomber dans le vide en criant : « Mais pourquoi j'ai pas pris du quinoa ?! »`
},
{
  img: 'jaquette/cartongame.png',
  title: 'Mise à jour Carton Game',
  date: '02/08/2025',
  text: `Attention les mirettes, on a dépoussiéré le site avec une mise à jour visuelle qui claque, même si on n'avait qu'un rouleau de scotch et un feutre.<br><br>
  On a regroupé toutes les fonctionnalités sur la page « Jeu » pour que vous ne vous perdiez plus comme un dahu dans la forêt du web.<br><br>
  Et, cerise sur le carton, on a mis à jour les succès ! C'est le moment de prouver que vous êtes un as du clic, ou du moins, un amateur éclairé du carton.`
},
{
  img: 'jaquette/rastajump.png',
  title: 'Sortie de Rasta Jump',
  date: '15/06/2025',
  text: `Petit jeu de saut avec un Rasta en mascote ! Pourquoi pas ?<br><br>
  Création de toutes les images et de quelques lignes de code pour un résultat simple mais satisfaisant.`
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
  Allez viens, c'est gratuit, c'est bizarre, c'est ToncPlay.`
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
  • <b>Bichon Maltais à trois pattes :</b> il te suit partout, il mord les zombies, il boite un peu, mais il t'aime d'un amour pur et féroce. Et franchement, t'as besoin de ça dans ta vie.`
},
{
  img: 'jaquette/survivhordes.jpg',
  title: "Sortie de Surviv'Hordes",
  date: '19/12/2024',
  text: `Hommage pas très propre à Hordes.fr — avec du sang, du sable et du pixel.<br><br>
  Tu te souviens de Hordes.fr ? Ce bon vieux jeu où tu crevais de soif, de faim, ou d'un coup de pelle d'un voisin un peu trop motivé ?<br><br>
  Ben voilà. On lui a rendu hommage. Mais façon roguelike-survivor, version 2025, avec des zombies, du loot, des vagues, et beaucoup moins d'organisation communautaire (on a viré le forum, t'inquiète).<br><br>
  C'est inspiré de Vampire Survivors, mais ça sent le désert, la poussière et la paranoïa.<br><br>
  Tu survis, tu claques, tu recommences — en espérant looter un truc utile avant de servir de repas. Ici, pas de tour de garde ni de plan de construction, juste toi, un flingue et quelques regrets.`
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
  Un jeu 100% arcade, 0% gluten, avec juste ce qu'il faut de rage et de bruitages bizarres. Appuie sur start. Et serre les fesses.`
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
  Bref, deviens l'empereur de l'emballage, sans jamais sortir de ton fauteuil.`
},
{
  img: 'jaquette/luminescence.jpg',
  title: 'Sortie de Luminescence',
  date: '28/09/2024',
  text: `ToncPlay : le premier jeu, le premier bug, la première larme.<br><br>
  Tout a commencé par une idée générée par une intelligence artificielle. Et au lieu de l'ignorer poliment comme on fait avec les idées cheloues de tonton Francis, on l'a faite. À la main. Avec du JavaScript, des cafés froids, et Google ouvert en triple écran.<br><br>
  C'est notre toute première expérience. Notre premier jeu. Et potentiellement le premier projet à faire crasher ton navigateur avec le sourire.<br><br>
  Un jeu modeste, un peu bancal, mais bourré de curiosité, d'envie et d'effets sonores douteux.<br><br>
  Bref : un projet d'apprentissage, de fun, et de pixels pas trop mal alignés.`
}
];

/* ============================================================
  RENDU DYNAMIQUE
  ============================================================ */

/* --- Icône SVG utilitaire --- */
function getIcon(id) {
const tpl = document.getElementById(id);
return tpl ? tpl.content.cloneNode(true) : '';
}

/* --- Rendu des jeux --- */
function renderGames() {
const grid = document.getElementById('games-grid');
grid.innerHTML = GAMES.map((g, i) => `
  <article class="game-card" style="animation-delay:${i * 0.06}s">
    <div class="game-cover">
      <img src="${g.img}" alt="${g.title}" loading="lazy">
    </div>
    <div class="game-info">
      <h2>${g.title}</h2>
      <p>${g.desc}</p>
      <a href="${g.link}" class="btn-play"></a>
    </div>
  </article>
`).join('');

// Injecte les icônes play dans les boutons
grid.querySelectorAll('.btn-play').forEach(btn => {
  btn.appendChild(getIcon('icon-play'));
  btn.appendChild(document.createTextNode('Jouer'));
});
}

/* --- Rendu des actualités --- */
function renderNews() {
const container = document.getElementById('news-container');
container.innerHTML = NEWS.map(n => `
  <article class="news-card">
    <div class="news-header" role="button" tabindex="0" aria-expanded="false">
      <div class="news-thumb">
        <img src="${n.img}" alt="${n.title}" loading="lazy">
      </div>
      <div class="news-meta">
        <h2>${n.title}</h2>
        <span class="news-date">${n.date}</span>
      </div>
      <span class="news-toggle" aria-hidden="true"></span>
    </div>
    <div class="news-body">
      <div class="news-body-inner">${n.text}</div>
    </div>
  </article>
`).join('');

// Injecte les icônes chevron
container.querySelectorAll('.news-toggle').forEach(toggle => {
  toggle.appendChild(getIcon('icon-chevron'));
});
}

/* ============================================================
  NAVIGATION ENTRE SECTIONS
  ============================================================ */
function initNavigation() {
const sections = document.querySelectorAll('.section-page');
// Sélectionne tous les liens de navigation (desktop + mobile)
const allLinks = document.querySelectorAll('[data-section]');

function switchSection(targetId) {
  if (!targetId) return;

  // Met à jour les sections
  sections.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add('active');
    // Déclenche l'animation stagger des cartes jeux
    if (targetId === 'jeux') staggerGameCards();
  }

  // Met à jour l'état actif de tous les liens
  allLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === targetId);
  });

  // Remonte en haut de la page
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

allLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchSection(link.getAttribute('data-section'));
    closeMobileNav();
  });
});
}

/* ============================================================
  ANIMATION STAGGER DES CARTES JEUX
  ============================================================ */
function staggerGameCards() {
const cards = document.querySelectorAll('.game-card');
// Réinitialise puis anime avec délai croissant
cards.forEach((card, i) => {
  card.classList.remove('revealed');
  card.style.animationDelay = `${i * 0.06}s`;
  // Force le reflow pour relancer l'animation
  void card.offsetWidth;
  card.classList.add('revealed');
});
}

/* ============================================================
  MENU BURGER MOBILE
  ============================================================ */
function initBurgerMenu() {
const burger = document.getElementById('burger');
const overlay = document.getElementById('navOverlay');

function closeMobileNav() {
  burger.classList.remove('open');
  overlay.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function openMobileNav() {
  burger.classList.add('open');
  overlay.classList.add('open');
  burger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

burger.addEventListener('click', () => {
  const isOpen = overlay.classList.contains('open');
  isOpen ? closeMobileNav() : openMobileNav();
});

// Fermer en cliquant en dehors des liens
overlay.addEventListener('click', e => {
  if (!e.target.closest('a')) closeMobileNav();
});

// Fermer avec Échap
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('open')) {
    closeMobileNav();
    burger.focus();
  }
});
}

/* ============================================================
  TOGGLE NEWS (DÉPLIEMENT / REPLIEMENT)
  ============================================================ */
function initNewsToggle() {
const container = document.getElementById('news-container');

container.addEventListener('click', e => {
  const header = e.target.closest('.news-header');
  if (!header) return;

  const card = header.closest('.news-card');
  const body = card.querySelector('.news-body');
  const isExpanded = card.classList.contains('expanded');

  if (isExpanded) {
    // Réduction : passe par la hauteur calculée avant de mettre 0
    body.style.maxHeight = body.scrollHeight + 'px';
    void body.offsetWidth; // force reflow
    body.style.maxHeight = '0';
    card.classList.remove('expanded');
    header.setAttribute('aria-expanded', 'false');
  } else {
    // Ferme les autres news ouvertes (accordéon)
    container.querySelectorAll('.news-card.expanded').forEach(other => {
      const otherBody = other.querySelector('.news-body');
      otherBody.style.maxHeight = otherBody.scrollHeight + 'px';
      void otherBody.offsetWidth;
      otherBody.style.maxHeight = '0';
      other.classList.remove('expanded');
      other.querySelector('.news-header').setAttribute('aria-expanded', 'false');
    });

    // Expansion
    body.style.maxHeight = 'auto';
    const h = body.scrollHeight;
    body.style.maxHeight = '0';
    void body.offsetWidth;
    body.style.maxHeight = h + 'px';
    card.classList.add('expanded');
    header.setAttribute('aria-expanded', 'true');
  }
});

// Support clavier pour le toggle
container.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const header = e.target.closest('.news-header');
    if (header) {
      e.preventDefault();
      header.click();
    }
  }
});
}

/* ============================================================
  INITIALISATION
  ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
renderGames();
renderNews();
initNavigation();
initBurgerMenu();
initNewsToggle();
});