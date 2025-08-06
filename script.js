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
    event.preventDefault(); // Empêche le saut de page

    // Récupère l'ID de la section cible (ex: 'accueil', 'jeux', etc.)
    const targetSectionId = link.getAttribute('data-section');

    // Cache toutes les sections
    allSections.forEach(section => {
      section.classList.add('hidden');
    });

    // Affiche uniquement la section désirée
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    // Ferme le menu sur mobile après un clic
    mainNav.classList.add('nav-closed');
  });
});

// ----- 3) GESTION DES NEWS -----
const newsItems = document.querySelectorAll('.news-item');
// Le tooltip est supprimé, donc la variable n'est plus nécessaire

newsItems.forEach(item => {
    const newsPreview = item.querySelector('.news-item-preview');
    const newsDetail = item.querySelector('.news-item-detail');
    // Le bouton est maintenant un enfant de newsPreview
    const toggleBtn = newsPreview.querySelector('.toggle-news-btn'); 

    // --- DEBUGGING: Vérifie si newsDetail et toggleBtn sont trouvés ---
    if (!newsDetail) {
        console.error("Erreur: L'élément .news-item-detail n'a pas été trouvé pour la news:", item);
        return; // Passe à l'élément de news suivant si newsDetail est manquant
    }
    if (!toggleBtn) {
        console.error("Erreur: Le bouton .toggle-news-btn n'a pas été trouvé pour la news:", item);
        return; // Passe à l'élément de news suivant si le bouton est manquant
    }

    // Initialisation : le bouton doit afficher "Lire plus" au démarrage
    toggleBtn.textContent = 'Lire plus';

    // Récupère les données complètes depuis les attributs data du .news-item parent
    const fullText = item.dataset.fullText;
    let detailContentPopulated = false; // Drapeau pour s'assurer que le contenu est peuplé une seule fois

    // Fonction pour peupler le contenu détaillé de la news
    const populateNewsDetail = () => {
        if (!detailContentPopulated) {
            const detailContentDiv = document.createElement('div');
            detailContentDiv.classList.add('news-item-detail-content');

            // L'image de détail est supprimée, seul le texte est ajouté
            const p = document.createElement('p');
            p.classList.add('news-item-detail-text');
            // Utilise innerHTML pour interpréter les balises <br> issues de &#10;
            // Ajout d'une vérification pour s'assurer que fullText n'est pas undefined ou null
            p.innerHTML = fullText ? fullText.replace(/&#10;/g, '<br>') : 'Détail non disponible.'; 
            detailContentDiv.appendChild(p);

            newsDetail.appendChild(detailContentDiv);
            detailContentPopulated = true;
        }
    };

    // ***** 1) Gestion du survol (tooltip) - Supprimé *****
    // Le tooltip est supprimé, donc les écouteurs d'événements liés sont retirés

    // ***** 2) Gestion du clic sur la news (prévisualisation ou bouton) *****
    item.addEventListener('click', (event) => {
        event.preventDefault(); // Empêche le comportement par défaut du navigateur (notamment le défilement)

        // Empêche le clic si l'élément cliqué est un lien ou un enfant de lien
        if (event.target.tagName === 'A' || event.target.closest('a')) {
            return;
        }

        const isExpanded = item.classList.contains('expanded');

        if (isExpanded) {
            // Si déjà étendu, le réduire
            // Définit max-height à sa valeur calculée avant de la réduire à 0
            newsDetail.style.maxHeight = newsDetail.scrollHeight + 'px';
            // Force un reflow pour que le navigateur applique la hauteur avant la transition
            void newsDetail.offsetWidth; 

            item.classList.remove('expanded');
            toggleBtn.textContent = 'Lire plus';
            newsDetail.style.maxHeight = '0'; // Anime vers 0
            newsDetail.style.opacity = '0'; // Anime l'opacité
        } else {
            // Si réduit, peupler le contenu (si ce n'est pas déjà fait) et l'étendre
            populateNewsDetail(); 
            
            // Pour obtenir la scrollHeight réelle, l'élément doit être visible et ne pas avoir de max-height restrictive.
            // On le rend temporairement 'auto' pour calculer sa hauteur.
            newsDetail.style.maxHeight = 'auto'; 
            const scrollHeight = newsDetail.scrollHeight; // Obtenir la hauteur réelle du contenu

            // Réinitialiser les styles pour la transition
            newsDetail.style.maxHeight = '0'; 
            newsDetail.style.opacity = '0'; 
            // Force un reflow après avoir défini max-height à 0
            void newsDetail.offsetWidth; 
            
            item.classList.add('expanded');
            toggleBtn.textContent = 'Lire moins';
            newsDetail.style.maxHeight = scrollHeight + 'px'; // Animer vers la hauteur réelle
            newsDetail.style.opacity = '1'; // Animer vers l'opacité complète
        }
    });
});

// Note sur l'encodage des caractères:
// Le symbole '' pour les caractères accentués indique généralement que le fichier JavaScript
// ou HTML n'est pas enregistré en UTF-8, ou que le navigateur ne l'interprète pas comme tel.
// Assurez-vous que tous vos fichiers (HTML, CSS, JS) sont enregistrés avec l'encodage UTF-8 sans BOM.
// Le meta charset="UTF-8" dans l'HTML est correct, mais le problème peut venir de l'enregistrement du fichier lui-même.
