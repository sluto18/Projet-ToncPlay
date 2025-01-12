// =============================
//        script.js
// =============================

// ----- 1) GESTION DU MENU BURGER -----
const burgerMenu = document.getElementById('burger-menu');
const mainNav = document.getElementById('main-nav');

if (burgerMenu && mainNav) {
  burgerMenu.addEventListener('click', () => {
    mainNav.classList.toggle('nav-closed');
  });
}

// ----- 2) NAVIGATION ENTRE SECTIONS -----
const menuLinks = document.querySelectorAll('#main-nav a[data-section]');
const allSections = document.querySelectorAll('main section');

menuLinks.forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault(); // évite le saut de page

    // Récupère la valeur de data-section (ex: 'accueil', 'jeux', etc.)
    const targetSectionId = link.getAttribute('data-section');

    // Cache toutes les sections
    allSections.forEach(section => {
      section.classList.add('hidden');
    });

    // Montre uniquement la section voulue
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    // Ferme le menu sur mobile après un clic
    mainNav.classList.add('nav-closed');
  });
});

// ----- 3) INSERTION DYNAMIQUE DES NEWS -----
const newsData = [
  { title: "Création du site Projet ToncPlay", date: "06/01/2025", details: "Création du site du Projet ToncPlay ainsi que de son logo. Un discord est aussi ouvert." },
  { title: "Mise a jour Surviv`Hordes", date: "02/01/2025", details: "La difficulté a été revu. Des nouveautés ont été ajoutés : des boss qui font spawn une ruine a leur mort. Les ruines spawn aussi des zombies. Deux nouveaus sort passif font leur apparition : Kit du bricoleur qui envoie un projectile qui rebondit sur les ennemis et Bichon Maltais a 3 pattes qui comme des chiens bien élevés vous suit et vous protège quand un zombie s'approche." },
  { title: "Sortie de Surviv`Hordes", date: "19/12/2024", details: "Hommage au jeu par navigateur Hordes.fr ! Jeu de type roguelike survivor inspiré par son grand frère Vampire Survivor a la sauce Hordes ! " },
  { title: "Sortie de Galactic Defender", date: "21/11/2024", details: "Jeu de SHOOT Em UP a la sauce ToncPlay, des ennemis, des météorites et des boss avec leur attaque surpuissante." },
  { title: "Sortie de Carton Game", date: "29/10/2024", details: "Jeu de type cliqueur, considéré comme le 1er jeu du Projet ToncPlay. " },
  { title: "Sortie de Luminescence", date: "28/09/2024", details: "1ere expérience du Projet ToncPlay sur une idée de GPT. Découverte du JavaScript et de ces possibilités." },
];

const newsContainer = document.getElementById('news-container');
const newsDetails = document.getElementById('news-details');
const newsDetailsTitle = document.getElementById('news-details-title');
const newsDetailsBody = document.getElementById('news-details-body');
const closeNewsDetailsBtn = document.getElementById('close-news-details');
const tooltip = document.getElementById('tooltip');

if (newsContainer) {
  newsData.forEach(newsItem => {
    const div = document.createElement('div');
    div.classList.add('news-item');

    // Titre, date, etc.
    const title = document.createElement('h2');
    title.textContent = newsItem.title;
    const date = document.createElement('p');
    date.textContent = `Date : ${newsItem.date}`;

    div.appendChild(title);
    div.appendChild(date);

    // ***** 1) GESTION DU SURVOL (tooltip) *****
    div.addEventListener('mouseover', (e) => {
      // Montre le tooltip
      tooltip.textContent = "Cliquez pour plus de détails";
      tooltip.classList.remove('hidden');
    });

    div.addEventListener('mousemove', (e) => {
      // Déplace le tooltip près de la souris
      tooltip.style.top = e.pageY + 10 + 'px';
      tooltip.style.left = e.pageX + 10 + 'px';
    });

    div.addEventListener('mouseleave', () => {
      // Cache le tooltip
      tooltip.classList.add('hidden');
    });

    // ***** 2) GESTION DU CLIC (afficher news-details) *****
    div.addEventListener('click', () => {
      // Remplir l’encart #news-details
      newsDetailsTitle.textContent = newsItem.title;
      newsDetailsBody.textContent = newsItem.details;
      // Afficher l’encart
      newsDetails.classList.remove('hidden');
    });

    newsContainer.appendChild(div);
  });
}

// Bouton "Fermer" pour l’encart de détails
if (closeNewsDetailsBtn && newsDetails) {
  closeNewsDetailsBtn.addEventListener('click', () => {
    newsDetails.classList.add('hidden');
  });
}

// ----- 4) LIVRE D'OR : FORMULAIRE ET AFFICHAGE DES MESSAGES -----
const formLivreDor = document.getElementById('livre-dor-form');
const messagesContainer = document.getElementById('messages-container');
let messages = [];

if (formLivreDor && messagesContainer) {
  formLivreDor.addEventListener('submit', function(event) {
    event.preventDefault();

    const nomInput = document.getElementById('nom');
    const messageInput = document.getElementById('message');

    const nom = nomInput.value.trim();
    const message = messageInput.value.trim();

    if (!nom || !message) {
      alert("Merci de remplir tous les champs.");
      return;
    }

    const newMessage = {
      nom: nom,
      message: message,
      date: new Date().toLocaleDateString()
    };

    messages.push(newMessage);

    // Réinitialise le formulaire
    nomInput.value = '';
    messageInput.value = '';

    // Met à jour l'affichage
    renderMessages(messages);
  });
}

// Fonction qui affiche la liste des messages
function renderMessages(list) {
  messagesContainer.innerHTML = '';

  list.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('message-item');

    const title = document.createElement('strong');
    title.textContent = `${item.nom} a écrit le ${item.date} :`;

    const text = document.createElement('p');
    text.textContent = item.message;

    div.appendChild(title);
    div.appendChild(text);
    messagesContainer.appendChild(div);
  });
}

