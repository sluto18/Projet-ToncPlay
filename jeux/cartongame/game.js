// Les variables globales du jeu
let totalCarton = 0;
let stockCarton = 0;
let papierDispo = 0;
let argent = 0; 
let prixVenteBaseMin = 0.10;
let prixVenteBaseMax = 0.20;
let prixVenteCarton = 0;
let prixAchatPapier = 0;
let productionParClic = 1;
let stockageMax = 0;
let autoprod = 0;
let doublepapier = false;
let statsAvancees = false;
let cartonsParSeconde = 0;
let isAutoPaperActive = false;
let eventLogMessages = [];

// --- DÉBUT NOUVELLES VARIABLES ÉVÉNEMENTS ---
let activeEvents = [];
let eventTimerIntervals = {};
let originalPrixAchatPapier = null;
let eventInterval;
let isPriceEventActive = false;
// --- FIN NOUVELLES VARIABLES ÉVÉNEMENTS ---

// --- DÉBUT NOUVELLES VARIABLES INTERVALS POUR GESTION DU RESET ---
let autoProductionInterval;
let marketUpdateInterval;
// --- FIN NOUVELLES VARIABLES INTERVALS ---


// Prix des améliorations
let prixameliorations = {
    hangar: 100,
    productionamelioree: 50,
    autoprod: 200,
    speria: 500,
    spanthera: 1000,
    experfold: 2000,
    usine: 5000,
    exporter: 10000,
    influencemarche: 1000,
    doublepapier: 100,
    statsavancees: 150,
    machinepapier: 500
};

// Niveaux actuels des améliorations
let niveauxameliorations = {
    hangar: 0,
    productionamelioree: 0,
    autoprod: 0,
    speria: 0,
    spanthera: 0,
    experfold: 0,
    usine: 0,
    exporter: 0,
    influencemarche: 0,
    doublepapier: 0,
    statsAvancees: 0,
    machinepapier: 0
};

// Statistiques de jeu supplémentaires
let totalPapierAchete = 0;
let totalVendu = 0;
// Liste des index des succès déjà complétés
let completedSuccessions = [];

// Définition des succès du jeu
const successions = [
    { condition: () => totalCarton >= 10, text: "Fabriquer 10 cartons" },
    { condition: () => totalCarton >= 100, text: "Fabriquer 100 cartons" },
    { condition: () => totalCarton >= 500, text: "Fabriquer 500 cartons" },
    { condition: () => totalCarton >= 1000, text: "Fabriquer 1000 cartons" },
    { condition: () => totalCarton >= 5000, text: "Fabriquer 5000 cartons" },
    { condition: () => totalCarton >= 10000, text: "Fabriquer 10 000 cartons" },
    { condition: () => totalCarton >= 50000, text: "Fabriquer 50 000 cartons" },
    { condition: () => totalCarton >= 100000, text: "Fabriquer 100 000 cartons" },
    { condition: () => totalCarton >= 500000, text: "Fabriquer 500 000 cartons" },
    { condition: () => totalCarton >= 1000000, text: "Fabriquer 1 000 000 cartons" },
    { condition: () => totalAmeliorations() >= 1, text: "Acheter votre première amélioration" },
    { condition: () => totalAmeliorations() >= 10, text: "Acheter 10 améliorations" },
    { condition: () => totalAmeliorations() >= 25, text: "Acheter 25 améliorations" },
    { condition: () => totalAmeliorations() >= 50, text: "Acheter 50 améliorations" },
    { condition: () => totalAmeliorations() >= 100, text: "Acheter 100 améliorations" },
    { condition: () => niveauxameliorations.statsavancees >= 1, text: "Acheter la Stats Avancées" },
    { condition: () => niveauxameliorations.autoprod >= 1, text: "Avoir un Autoprod" },
    { condition: () => niveauxameliorations.speria >= 1, text: "Avoir une SPeria" },
    { condition: () => niveauxameliorations.spanthera >= 1, text: "Avoir une SPanthera" },
    { condition: () => niveauxameliorations.experfold >= 1, text: "Avoir une ExperFold" },
    { condition: () => niveauxameliorations.usine >= 1, text: "Avoir une Usine" },
    { condition: () => niveauxameliorations.exporter >= 1, text: "Avoir Exporter" },
    { condition: () => niveauxameliorations.influencemarche >= 1, text: "Influer le marché" },
    { condition: () => niveauxameliorations.doublepapier >= 1, text: "Acheter Double Papier" },
    { condition: () => niveauxameliorations.machinepapier >= 1, text: "Acheter Machine à Papier" },
    { condition: () => totalVendu >= 10, text: "Vendre vos premiers cartons" },
    { condition: () => totalVendu >= 1000, text: "Vendre 1000 cartons" },
    { condition: () => totalVendu >= 5000, text: "Vendre 5000 cartons" },
    { condition: () => totalVendu >= 10000, text: "Vendre 10 000 cartons" },
    { condition: () => totalVendu >= 50000, text: "Vendre 50 000 cartons" },
    { condition: () => totalVendu >= 100000, text: "Vendre 100 000 cartons" },
    { condition: () => totalVendu >= 500000, text: "Vendre 500 000 cartons" },
    { condition: () => totalVendu >= 1000000, text: "Vendre 1 000 000 cartons" },
    { condition: () => totalPapierAchete >= 10000, text: "Acheter 10 000 papiers" },
    { condition: () => totalPapierAchete >= 50000, text: "Acheter 50 000 papiers" },
    { condition: () => totalPapierAchete >= 500000, text: "Acheter 500 000 papiers" },
    { condition: () => totalPapierAchete >= 1000000, text: "Acheter 1 000 000 papiers" },
    { condition: () => cartonsParSeconde >= 10, text: "Produisez 10 cartons par seconde" },
    { condition: () => cartonsParSeconde >= 50, text: "Produisez 50 cartons par seconde" },
    { condition: () => cartonsParSeconde >= 100, text: "Produisez 100 cartons par seconde" },
    { condition: () => cartonsParSeconde >= 500, text: "Produisez 500 cartons par seconde" },
    { condition: () => cartonsParSeconde >= 1000, text: "Produisez 1000 cartons par seconde" },
    { condition: () => argent >= 10000, text: "Accumulez 10 000 €" },
    { condition: () => argent >= 50000, text: "Accumulez 50 000 €" },
    { condition: () => argent >= 100000, text: "Accumulez 100 000 €" },
    { condition: () => argent >= 500000, text: "Accumulez 500 000 €" },
    { condition: () => papierDispo >= 10000, text: "Accumulez 10 000 de papier disponible" },
    { condition: () => papierDispo >= 50000, text: "Accumulez 50 000 de papier disponible" },
    { condition: () => papierDispo >= 100000, text: "Accumulez 100 000 de papier disponible" },
    { condition: () => papierDispo >= 500000, text: "Accumulez 500 000 de papier disponible" },
    { condition: () => niveauxameliorations.productionamelioree >= 10, text: "Augmenter l'amélioration Production améliorée au niveau 10" },
    { condition: () => niveauxameliorations.autoprod >= 10, text: "Augmenter l'amélioration Autoproduction au niveau 10" },
    { condition: () => niveauxameliorations.speria >= 10, text: "Augmenter l'amélioration SPeria au niveau 10" },
    { condition: () => niveauxameliorations.spanthera >= 10, text: "Augmenter l'amélioration SPanthera au niveau 10" },
    { condition: () => niveauxameliorations.experfold >= 10, text: "Augmenter l'amélioration ExperFold au niveau 10" },
    { condition: () => niveauxameliorations.usine >= 10, text: "Augmenter l'amélioration Usine au niveau 10" },
    { condition: () => niveauxameliorations.exporter >= 10, text: "Augmenter l'amélioration Exporter au niveau 10" },
    { condition: () => niveauxameliorations.influencemarche >= 10, text: "Augmenter l'amélioration Influence Marché au niveau 10" },
    { condition: () => niveauxameliorations.doublepapier >= 10, text: "Augmenter l'amélioration Double Papier au niveau 10" }
];



const possibleEvents = [
    { type: 'priceIncrease', name: 'incendie_papeterie', message: "Une papeterie voisine est en feu, le prix du papier explose (+200%)!", priceModifier: 3, duration: 60000 },
    { type: 'priceIncrease', name: 'explosion_usine', message: "Une usine à papier a littéralement explosé. Les prix flambent (+100%)!", priceModifier: 2, duration: 60000 },
    { type: 'priceDecrease', name: 'nouvelle_machine', message: "Une nouvelle machine ultra-performante est mise en service, le prix du papier chute (-50%)!", priceModifier: 0.5, duration: 60000 },
    { type: 'specialBuy', name: 'surplus_cartons', message: "L'usine AubonCarton a un surplus de production. Il vous propose des cartons au rabais.", quantity: 500, price: 0.05, duration: 60000 },
    { type: 'specialSell', name: 'laiterie_urgente', message: "La laiterie QuiVaLa a un besoin urgent de carton! Possibilité de vendre plus cher.", quantity: 200, price: 0.50, duration: 60000 },
    { type: 'specialBuy', name: 'recylage_ecocarton', message: "L'entreprise 'EcoCarton' lance un programme de recyclage, achetez leur surplus de cartons à un prix dérisoire.", quantity: 1000, price: 0.02, duration: 60000 },
    { type: 'specialSell', name: 'equipe_f1', message: "L'équipe de F1 'Carton Racing' a besoin de cartons pour ses moteurs. Vendez-les à prix d'or !", quantity: 150, price: 0.85, duration: 60000 }
];

// Fonction pour initialiser toutes les variables du jeu à leurs valeurs par défaut
function initializeGameVariables() {
    totalCarton = 0;
    stockCarton = 0;
    papierDispo = 1000;
    argent = 0;
    prixVenteBaseMin = 0.10;
    prixVenteBaseMax = 0.20;
    prixVenteCarton = (Math.random() * (prixVenteBaseMax - prixVenteBaseMin) + prixVenteBaseMin).toFixed(2);
    prixAchatPapier = (Math.random() * (0.05 - 0.01) + 0.01).toFixed(2);
    productionParClic = 1;
    stockageMax = 1000;
    autoprod = 0;
    doublepapier = false;
    statsAvancees = false;
    cartonsParSeconde = 0;
    isAutoPaperActive = false;
    totalPapierAchete = 0;
    totalVendu = 0;
    completedSuccessions = [];
    eventLogMessages = [];
    activeEvents = [];
    originalPrixAchatPapier = null;
    isPriceEventActive = false;
    
    // Réinitialisation des prix et niveaux des améliorations
    prixameliorations = {
        hangar: 100, productionamelioree: 50, autoprod: 200, speria: 500, spanthera: 1000,
        experfold: 2000, usine: 5000, exporter: 10000, influencemarche: 1000, doublepapier: 100,
        statsavancees: 150, machinepapier: 500
    };
    niveauxameliorations = {
        hangar: 0, productionamelioree: 0, autoprod: 0, speria: 0, spanthera: 0,
        experfold: 0, usine: 0, exporter: 0, influencemarche: 0, doublepapier: 0,
        statsAvancees: 0, machinepapier: 0
    };
}


function totalAmeliorations() {
    return Object.values(niveauxameliorations).reduce((acc, niveau) => acc + niveau, 0);
}

function saveGame() {
    let gameData = {
        totalCarton,
        stockCarton,
        papierDispo,
        argent,
        prixVenteCarton,
        prixAchatPapier,
        prixVenteBaseMin,
        prixVenteBaseMax,
        productionParClic,
        stockageMax,
        autoprod,
        doublepapier,
        statsAvancees,
        cartonsParSeconde,
        isAutoPaperActive,
        prixameliorations,
        niveauxameliorations,
        totalPapierAchete,
        totalVendu,
        completedSuccessions,
        eventLogMessages,
        activeEvents,
        originalPrixAchatPapier,
        isPriceEventActive
    };
    localStorage.setItem("cartonGameSave", JSON.stringify(gameData));
}

function loadGame() {
    let savedData = JSON.parse(localStorage.getItem("cartonGameSave"));
    if (savedData) {
        totalCarton = savedData.totalCarton || 0;
        stockCarton = savedData.stockCarton || 0;
        papierDispo = savedData.papierDispo || 1000;
        argent = savedData.argent || 0;
        prixVenteBaseMin = savedData.prixVenteBaseMin || 0.10;
        prixVenteBaseMax = savedData.prixVenteBaseMax || 0.20;
        prixVenteCarton = savedData.prixVenteCarton || (Math.random() * (prixVenteBaseMax - prixVenteBaseMin) + prixVenteBaseMin).toFixed(2);
        prixAchatPapier = savedData.prixAchatPapier || (Math.random() * (0.05 - 0.01) + 0.01).toFixed(2);
        productionParClic = savedData.productionParClic || 1;
        stockageMax = savedData.stockageMax || 1000;
        autoprod = savedData.autoprod || 0;
        doublepapier = savedData.doublepapier || false;
        statsAvancees = savedData.statsAvancees || false;
        cartonsParSeconde = savedData.cartonsParSeconde || 0;
        isAutoPaperActive = savedData.isAutoPaperActive || false;
        prixameliorations = savedData.prixameliorations || prixameliorations;
        niveauxameliorations = savedData.niveauxameliorations || niveauxameliorations;
        totalPapierAchete = savedData.totalPapierAchete || 0;
        totalVendu = savedData.totalVendu || 0;
        completedSuccessions = savedData.completedSuccessions || [];
        eventLogMessages = savedData.eventLogMessages || [];

        activeEvents = savedData.activeEvents || [];
        originalPrixAchatPapier = savedData.originalPrixAchatPapier;
        isPriceEventActive = savedData.isPriceEventActive || false;
        if (isPriceEventActive) {
            const priceEvent = activeEvents.find(e => e.type.includes('price'));
            if (priceEvent) {
                const timeLeft = priceEvent.endTime - Date.now();
                if (timeLeft > 0) {
                    setTimeout(() => endEvent(priceEvent), timeLeft);
                } else {
                    endEvent(priceEvent);
                }
            }
        }

        // NEW: Restore the visual state of one-time purchase improvements
        if (niveauxameliorations.statsavancees > 0) {
            const acheterStatsAvanceesButton = document.getElementById("acheter-statsavancees");
            const ameliorationStatsAvanceesDiv = document.getElementById("amelioration-statsavancees");
            if (acheterStatsAvanceesButton && ameliorationStatsAvanceesDiv) {
                acheterStatsAvanceesButton.remove();
                ameliorationStatsAvanceesDiv.insertAdjacentHTML('beforeend', '<p>Acquis</p>');
            }
        }
        
        if (niveauxameliorations.machinepapier > 0) {
            const acheterMachinePapierButton = document.getElementById("acheter-machinepapier");
            const ameliorationMachinePapierDiv = document.getElementById("amelioration-machinepapier");
            if (acheterMachinePapierButton && ameliorationMachinePapierDiv) {
                acheterMachinePapierButton.remove();
                ameliorationMachinePapierDiv.insertAdjacentHTML('beforeend', '<p>Acquis</p>');
            }
            const toggleAutoPaperButton = document.getElementById("toggleAutoPaperButton");
            if (toggleAutoPaperButton) {
                toggleAutoPaperButton.addEventListener('click', toggleAutoPaper);
            }
        }
        
    } else {
        // Si aucune donnée n'est trouvée, initialiser le jeu à partir de zéro
        initializeGameVariables();
    }
}

window.addEventListener("beforeunload", saveGame);

function updateStats() {
    if (document.getElementById("totalCarton")) document.getElementById("totalCarton").innerText = totalCarton;
    if (document.getElementById("niveauHangar")) document.getElementById("niveauHangar").innerText = niveauxameliorations.hangar;
    if (document.getElementById("niveauProductionamelioree")) document.getElementById("niveauProductionamelioree").innerText = niveauxameliorations.productionamelioree;
    if (document.getElementById("niveauAutoprod")) document.getElementById("niveauAutoprod").innerText = niveauxameliorations.autoprod;
    if (document.getElementById("niveauSperia")) document.getElementById("niveauSperia").innerText = niveauxameliorations.speria;
    if (document.getElementById("niveauSpanthera")) document.getElementById("niveauSpanthera").innerText = niveauxameliorations.spanthera;
    if (document.getElementById("niveauExperfold")) document.getElementById("niveauExperfold").innerText = niveauxameliorations.experfold;
    if (document.getElementById("niveauUsine")) document.getElementById("niveauUsine").innerText = niveauxameliorations.usine;
    if (document.getElementById("niveauExporter")) document.getElementById("niveauExporter").innerText = niveauxameliorations.exporter;
    if (document.getElementById("niveauInfluencemarche")) document.getElementById("niveauInfluencemarche").innerText = niveauxameliorations.influencemarche;
    if (document.getElementById("niveauDoublepapier")) document.getElementById("niveauDoublepapier").innerText = niveauxameliorations.doublepapier;
    
    if (document.getElementById("argent")) document.getElementById("argent").innerText = argent.toFixed(2) + ' €';
    if (document.getElementById("prixVenteCarton")) document.getElementById("prixVenteCarton").innerText = prixVenteCarton + ' €';
    if (document.getElementById("prixAchatPapier")) document.getElementById("prixAchatPapier").innerText = prixAchatPapier;
    
    if (document.getElementById("stockCarton")) document.getElementById("stockCarton").innerText = stockCarton;
    if (document.getElementById("stockageMax")) document.getElementById("stockageMax").innerText = stockageMax;

    if (document.getElementById("papierDispo")) document.getElementById("papierDispo").innerText = papierDispo;


    if (document.getElementById("prixHangar")) document.getElementById("prixHangar").innerText = prixameliorations.hangar;
    if (document.getElementById("prixProductionamelioree")) document.getElementById("prixProductionamelioree").innerText = prixameliorations.productionamelioree;
    if (document.getElementById("prixAutoprod")) document.getElementById("prixAutoprod").innerText = prixameliorations.autoprod;
    if (document.getElementById("prixSperia")) document.getElementById("prixSperia").innerText = prixameliorations.speria;
    if (document.getElementById("prixSpanthera")) document.getElementById("prixSpanthera").innerText = prixameliorations.spanthera;
    if (document.getElementById("prixExperfold")) document.getElementById("prixExperfold").innerText = prixameliorations.experfold;
    if (document.getElementById("prixUsine")) document.getElementById("prixUsine").innerText = prixameliorations.usine;
    if (document.getElementById("prixExporter")) document.getElementById("prixExporter").innerText = prixameliorations.exporter;
    if (document.getElementById("prixInfluencemarche")) document.getElementById("prixInfluencemarche").innerText = prixameliorations.influencemarche;
    if (document.getElementById("prixDoublepapier")) document.getElementById("prixDoublepapier").innerText = prixameliorations.doublepapier;
    if (document.getElementById("prixStatsavancees")) document.getElementById("prixStatsavancees").innerText = prixameliorations.statsavancees;
    if (document.getElementById("prixMachinepapier")) document.getElementById("prixMachinepapier").innerText = prixameliorations.machinepapier;


    const cartonParSecondeLabelElement = document.getElementById("cartonParSecondeLabel");
    const cartonParSecondeValueElement = document.getElementById("cartonParSecondeValue");
    const cpsElement = document.getElementById("cps");

    if (statsAvancees && cartonParSecondeLabelElement && cartonParSecondeValueElement && cpsElement) {
        cartonParSecondeLabelElement.style.display = "block";
        cartonParSecondeValueElement.style.display = "block";
        cpsElement.innerText = cartonsParSeconde.toFixed(2);
    } else if (cartonParSecondeLabelElement && cartonParSecondeValueElement) {
        cartonParSecondeLabelElement.style.display = "none";
        cartonParSecondeValueElement.style.display = "none";
    }

    const autoPapierStatLabelElement = document.getElementById("autoPapierStatLabel");
    const autoPapierStatValueElement = document.getElementById("autoPapierStatValue");
    const toggleAutoPaperButton = document.getElementById("toggleAutoPaperButton");

    if (niveauxameliorations.machinepapier > 0 && autoPapierStatLabelElement && autoPapierStatValueElement && toggleAutoPaperButton) {
        autoPapierStatLabelElement.style.display = "block";
        autoPapierStatValueElement.style.display = "block";
        toggleAutoPaperButton.innerText = isAutoPaperActive ? 'ON' : 'OFF';
        toggleAutoPaperButton.classList.toggle('off', !isAutoPaperActive);
    } else if (autoPapierStatLabelElement && autoPapierStatValueElement) {
        autoPapierStatLabelElement.style.display = "none";
        autoPapierStatValueElement.style.display = "none";
    }

    const eventButtonContainer = document.querySelector('.event-button-container');
    const priceAlertIcon = document.getElementById('priceAlertIcon');

    if (eventButtonContainer) {
        eventButtonContainer.style.display = activeEvents.length > 0 ? 'flex' : 'none';
    }
    
    // --- NOUVELLE LOGIQUE POUR L'ICÔNE D'ALERTE PRIX ---
    if (priceAlertIcon) {
        if (isPriceEventActive) {
            priceAlertIcon.style.display = 'inline-block';
            const priceEvent = activeEvents.find(e => e.type.includes('price'));
            if (priceEvent) {
                const imageSrc = priceEvent.priceModifier > 1 ? 'image/prixplus.png' : 'image/prixmoins.png';
                priceAlertIcon.src = imageSrc;
            }
        } else {
            priceAlertIcon.style.display = 'none';
            priceAlertIcon.src = ''; // On efface la source pour être propre
        }
    }
    // --- FIN NOUVELLE LOGIQUE ---
}

function calculerCartonsParSeconde() {
    cartonsParSeconde = autoprod;
    updateStats();
}

function addEventToLog(message) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds}`;
    eventLogMessages.push(`${timestamp} - ${message}`);
    if (eventLogMessages.length > 100) {
        eventLogMessages.shift();
    }
    updateEventLogDisplay();
}

function updateEventLogDisplay() {
    const eventLogElement = document.getElementById('eventLog');
    const fullEventLogElement = document.getElementById('fullEventLog');
    const viewFullHistoryLink = document.getElementById('viewFullHistoryLink');

    if (!eventLogElement) {
        console.error("Erreur: L'élément 'eventLog' est introuvable.");
        return;
    }

    eventLogElement.innerHTML = '';
    
    if (fullEventLogElement) {
        fullEventLogElement.innerHTML = '';
    }

    const startIndex = Math.max(0, eventLogMessages.length - 5);
    const limitedMessages = eventLogMessages.slice(startIndex);
    limitedMessages.forEach(msg => {
        const logEntry = document.createElement('div');
        logEntry.textContent = msg;
        eventLogElement.appendChild(logEntry);
    });
    eventLogElement.scrollTop = eventLogElement.scrollHeight;


    if (fullEventLogElement) {
        eventLogMessages.forEach(msg => {
            const logEntry = document.createElement('div');
            logEntry.textContent = msg;
            fullEventLogElement.appendChild(logEntry);
        });
        fullEventLogElement.scrollTop = fullEventLogElement.scrollHeight;
    }

    if (viewFullHistoryLink) {
        if (eventLogMessages.length > 5) {
            viewFullHistoryLink.style.display = 'block';
        } else {
            viewFullHistoryLink.style.display = 'none';
        }
    }
}

// Nouvelle fonction pour afficher la modale d'alerte personnalisée
function showAlertModal(message) {
    console.log("Appel de showAlertModal avec le message:", message);
    const modal = document.getElementById('alertModal');
    const messageElement = document.getElementById('alertModalMessage');
    const closeButton = document.getElementById('closeAlertModal');

    if (!modal || !messageElement || !closeButton) {
        console.error("Erreur: Éléments de la modale d'alerte introuvables. Vérifiez vos IDs HTML.");
        return;
    }

    messageElement.textContent = message;
    modal.classList.add('is-open');

    // On s'assure que les anciens événements sont retirés avant d'ajouter le nouveau
    closeButton.onclick = null;
    closeButton.onclick = () => {
        closeAlertModal();
    };
}

// Nouvelle fonction pour afficher la modale de confirmation personnalisée
function showConfirmModal(message, onConfirm) {
    console.log("Appel de showConfirmModal avec le message:", message);
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmModalMessage');
    const acceptButton = document.getElementById('acceptConfirmModal');
    const cancelButton = document.getElementById('cancelConfirmModal');

    if (!modal || !messageElement || !acceptButton || !cancelButton) {
        console.error("Erreur: Éléments de la modale de confirmation introuvables. Vérifiez vos IDs HTML.");
        return;
    }

    messageElement.textContent = message;
    modal.classList.add('is-open');

    // On s'assure que les anciens événements sont retirés avant d'ajouter le nouveau
    acceptButton.onclick = null;
    cancelButton.onclick = null;

    const handleAccept = () => {
        onConfirm();
        closeConfirmModal();
    };
    
    const handleCancel = () => {
        closeConfirmModal();
    };

    acceptButton.onclick = handleAccept;
    cancelButton.onclick = handleCancel;
}

// Fonction pour fermer la modale d'alerte
function closeAlertModal() {
    console.log("Fermeture de la modale d'alerte.");
    const modal = document.getElementById('alertModal');
    if (modal) {
        modal.classList.remove('is-open');
    }
}

// Fonction pour fermer la modale de confirmation
function closeConfirmModal() {
    console.log("Fermeture de la modale de confirmation.");
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('is-open');
    }
}


function acheteramelioration(type) {
    if (!type) {
        console.error('Erreur : type d\'amélioration indéfini.');
        return;
    }

    let prix = prixameliorations[type];
    if (prix === undefined) {
        console.error(`Erreur : le prix pour l'amélioration de type '${type}' est indéfini. Vérifiez que le type est bien défini et que les prix sont bien chargés.`);
        return;
    }

    if (Number(argent) >= Number(prix)) {
        argent -= prix;
        let upgradeName = "";
        switch (type) {
            case 'machinepapier':
                const acheterMachinePapierButton = document.getElementById("acheter-machinepapier");
                const ameliorationMachinePapierDiv = document.getElementById("amelioration-machinepapier");
                if (acheterMachinePapierButton && ameliorationMachinePapierDiv) {
                    acheterMachinePapierButton.remove();
                    ameliorationMachinePapierDiv.insertAdjacentHTML('beforeend', '<p>Acquis</p>');
                }
                niveauxameliorations.machinepapier = 1;
                isAutoPaperActive = true;
                const autoPapierStatLabelElement = document.getElementById("autoPapierStatLabel");
                const autoPapierStatValueElement = document.getElementById("autoPapierStatValue");
                const toggleAutoPaperButton = document.getElementById("toggleAutoPaperButton");

                if (autoPapierStatLabelElement && autoPapierStatValueElement && toggleAutoPaperButton) {
                    autoPapierStatLabelElement.style.display = "block";
                    autoPapierStatValueElement.style.display = "block";
                    toggleAutoPaperButton.innerText = 'ON';
                    toggleAutoPaperButton.addEventListener('click', toggleAutoPaper);
                }
                upgradeName = "Machine à Papier";
                break;
            case 'hangar':
                stockageMax += 1000;
                niveauxameliorations.hangar++;
                prixameliorations.hangar = Math.round(prixameliorations.hangar * 1.2);
                upgradeName = "Hangar";
                break;
            case 'productionamelioree':
                productionParClic += 1;
                niveauxameliorations.productionamelioree++;
                prixameliorations.productionamelioree = Math.round(prixameliorations.productionamelioree * 1.5);
                upgradeName = "Production améliorée";
                break;
            case 'autoprod':
                autoprod += 1;
                niveauxameliorations.autoprod++;
                prixameliorations.autoprod = Math.round(prixameliorations.autoprod * 2);
                upgradeName = "Autoproduction";
                break;
            case 'speria':
                autoprod += 3;
                niveauxameliorations.speria++;
                prixameliorations.speria = Math.round(prixameliorations.speria * 1.7);
                upgradeName = "SPeria";
                break;
            case 'spanthera':
                autoprod += 10;
                niveauxameliorations.spanthera++;
                prixameliorations.spanthera = Math.round(prixameliorations.spanthera * 1.8);
                upgradeName = "SPanthera";
                break;
            case 'experfold':
                autoprod += 20;
                niveauxameliorations.experfold++;
                prixameliorations.experfold = Math.round(prixameliorations.experfold * 1.9);
                upgradeName = "ExperFold";
                break;
            case 'usine':
                autoprod += 100;
                niveauxameliorations.usine++;
                prixameliorations.usine = Math.round(prixameliorations.usine * 2.0);
                upgradeName = "Usine";
                break;
            case 'exporter':
                autoprod += 1000;
                niveauxameliorations.exporter++;
                prixameliorations.exporter = Math.round(prixameliorations.exporter * 2.5);
                upgradeName = "Exporter";
                break;
            case 'influencemarche':
                prixVenteBaseMin = parseFloat(prixVenteBaseMin) + 0.05;
                prixVenteBaseMax = parseFloat(prixVenteBaseMax) + 0.05;
                prixVenteCarton = (Math.random() * (prixVenteBaseMax - prixVenteBaseMin) + prixVenteBaseMin).toFixed(2);
                niveauxameliorations.influencemarche++;
                prixameliorations.influencemarche = Math.round(prixameliorations.influencemarche * 1.4);
                upgradeName = "Influence Marché";
                break;
            case 'doublepapier':
                doublepapier = true;
                niveauxameliorations.doublepapier++;
                prixameliorations.doublepapier = Math.round(prixameliorations.doublepapier * 1.5);
                upgradeName = "Double Papier";
                break;
            case 'statsavancees':
                statsAvancees = true;
                const acheterStatsAvanceesButton = document.getElementById("acheter-statsavancees");
                const ameliorationStatsAvanceesDiv = document.getElementById("amelioration-statsavancees");
                if (acheterStatsAvanceesButton && ameliorationStatsAvanceesDiv) {
                    acheterStatsAvanceesButton.remove();
                    ameliorationStatsAvanceesDiv.insertAdjacentHTML('beforeend', '<p>Acquis</p>');
                }
                niveauxameliorations.statsavancees = 1;
                prixameliorations.statsavancees = Math.round(prixameliorations.statsavancees * 1.6);
                upgradeName = "Statistiques Avancées";
                break;
            default:
                console.error('Type d\'amélioration non reconnu:', type);
                break;
        }

        // --- MODIFICATION SUGGÉRÉE ---
        // On calcule les cartons par seconde ici pour une mise à jour immédiate
        calculerCartonsParSeconde(); 
        
        addEventToLog(`Vous avez acheté l'amélioration "${upgradeName}" pour ${prix} €.`);
        updateStats();
        checkSuccessions(); // On vérifie les succès juste après l'achat
    } else {
        showAlertModal("Pas assez d'argent pour acheter cette amélioration.");
    }
}


function toggleAutoPaper() {
    isAutoPaperActive = !isAutoPaperActive;
    addEventToLog(`Machine à Papier : ${isAutoPaperActive ? 'Activée' : 'Désactivée'}.`);
    updateStats();
}

function checkSuccessions() {
    successions.forEach((success, index) => {
        if (!completedSuccessions.includes(index) && success.condition()) {
            completedSuccessions.push(index);
            const succesListUl = document.getElementById('succèsList');
            if (succesListUl) {
                const successElement = succesListUl.children[index];
                if (successElement) {
                    successElement.classList.add('completed');
                    successElement.style.textDecoration = 'line-through';
                    addEventToLog(`Succès débloqué : "${success.text}" !`);
                    updateSuccessCounter(); // Mettre à jour le compteur ici
                }
            } else {
                console.error("Erreur: L'élément 'succèsList' est introuvable lors de la vérification des succès.");
            }
        }
    });
}

function initSuccessions() {
    const succesListUl = document.getElementById('succèsList');
    if (succesListUl) {
        succesListUl.innerHTML = '';
        successions.forEach((success, index) => {
            let li = document.createElement('li');
            li.textContent = success.text;
            succesListUl.appendChild(li);
        });
    } else {
        console.error("Erreur: L'élément 'succèsList' est introuvable lors de l'initialisation des succès.");
    }
}

function updateSuccessDisplay() {
    const succesListUl = document.getElementById('succèsList');
    if (succesListUl) {
        succesListUl.innerHTML = '';
        initSuccessions();
        completedSuccessions.forEach(index => {
            const successElement = succesListUl.children[index];
            if (successElement) {
                successElement.classList.add('completed');
                successElement.style.textDecoration = 'line-through';
            }
        });
        updateSuccessCounter(); // Mettre à jour le compteur ici aussi
    } else {
        console.error("Erreur: L'élément 'succèsList' est introuvable lors de la mise à jour de l'affichage des succès.");
    }
}

// Nouvelle fonction pour mettre à jour le compteur de succès
function updateSuccessCounter() {
    const counterElement = document.getElementById('succesCounter');
    if (counterElement) {
        const completedCount = completedSuccessions.length;
        const totalCount = successions.length;
        counterElement.innerText = `${completedCount}/${totalCount} succès débloqués`;
    }
}

function attachImprovementButtonListeners() {
    const ameliorationButtons = document.querySelectorAll('.amelioration-item button');
    ameliorationButtons.forEach(button => {
        button.removeEventListener('click', handleImprovementButtonClick);
        button.addEventListener('click', handleImprovementButtonClick);
    });
}

function handleImprovementButtonClick(e) {
    e.preventDefault();
    let ameliorationType = this.closest('.amelioration-item').getAttribute('data-type');
    acheteramelioration(ameliorationType);
}

function startRandomEvent() {
    if (isPriceEventActive) {
        return;
    }

    const randomIndex = Math.floor(Math.random() * possibleEvents.length);
    const event = { ...possibleEvents[randomIndex] };
    
    event.startTime = Date.now();
    event.endTime = event.startTime + event.duration;

    activeEvents.push(event);
    addEventToLog(`Nouvel événement : ${event.message}`);
    
    if (event.type.includes('price')) {
        isPriceEventActive = true;
        originalPrixAchatPapier = prixAchatPapier;
        prixAchatPapier = (originalPrixAchatPapier * event.priceModifier).toFixed(2);
        
        setTimeout(() => endEvent(event), event.duration);
    } else {
        setTimeout(() => endEvent(event), event.duration);
    }
    
    updateStats();
}

function endEvent(event) {
    if (!event) return;

    activeEvents = activeEvents.filter(e => e.name !== event.name);
    
    if (event.type.includes('price')) {
        isPriceEventActive = false;
        prixAchatPapier = originalPrixAchatPapier;
        originalPrixAchatPapier = null;
        addEventToLog(`L'événement de prix est terminé.`);
    } else {
         addEventToLog(`L'événement "${event.name}" est terminé.`);
    }
    
    updateStats();
    if (activeEvents.length === 0) {
        document.getElementById('eventModal').style.display = 'none';
    }
}

function openEventModal() {
    const eventModal = document.getElementById('eventModal');
    const eventContainer = document.getElementById('eventContainer');
    eventContainer.innerHTML = '';

    Object.values(eventTimerIntervals).forEach(intervalId => clearInterval(intervalId));
    eventTimerIntervals = {};

    activeEvents.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.classList.add('event-item');
        
        let actionsHtml = '';
        if (event.type === 'specialBuy') {
            const totalCost = (event.quantity * event.price).toFixed(2);
            actionsHtml = `
                <div class="event-details">
                    <p>Quantité: ${event.quantity} cartons</p>
                    <p>Prix total: ${totalCost} €</p>
                    <p>Prix à l'unité: ${event.price.toFixed(2)} €</p>
                </div>
                <div class="event-actions">
                    <button class="btn-game" onclick="handleSpecialAction('${event.name}')">Acheter</button>
                    <button class="btn-game" onclick="handleRejectAction('${event.name}')">Rejeter</button>
                </div>
            `;
        } else if (event.type === 'specialSell') {
            const totalGain = (event.quantity * event.price).toFixed(2);
            actionsHtml = `
                <div class="event-details">
                    <p>Quantité: ${event.quantity} cartons</p>
                    <p>Gain total: ${totalGain} €</p>
                    <p>Prix à l'unité: ${event.price.toFixed(2)} €</p>
                </div>
                <div class="event-actions">
                    <button class="btn-game" onclick="handleSpecialAction('${event.name}')">Vendre</button>
                    <button class="btn-game" onclick="handleRejectAction('${event.name}')">Rejeter</button>
                </div>
            `;
        }

        eventDiv.innerHTML = `
            <p>${event.message}</p>
            ${actionsHtml}
            ${event.duration ? `<p class="countdown-timer">Temps restant : <span id="timer-${event.name}"></span></p>` : ''}
        `;
        eventContainer.appendChild(eventDiv);

        if (event.duration) {
            const timerElement = document.getElementById(`timer-${event.name}`);
            const updateTimer = () => {
                const timeLeft = Math.max(0, Math.floor((event.endTime - Date.now()) / 1000));
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                if (timerElement) {
                    timerElement.innerText = `${minutes}:${String(seconds).padStart(2, '0')}s`;
                }
                if (timeLeft <= 0) {
                    clearInterval(eventTimerIntervals[event.name]);
                    delete eventTimerIntervals[event.name];
                    endEvent(event);
                    if (activeEvents.length === 0) {
                         closeEventModal();
                    }
                }
            };
            updateTimer();
            eventTimerIntervals[event.name] = setInterval(updateTimer, 1000);
        }
    });
    
    if (activeEvents.length > 0) {
        eventModal.style.display = 'flex';
    } else {
        addEventToLog("Aucun événement spécial n'est en cours.");
        eventModal.style.display = 'none';
    }
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    Object.values(eventTimerIntervals).forEach(intervalId => clearInterval(intervalId));
    eventTimerIntervals = {};
}

function handleSpecialAction(eventName) {
    const event = activeEvents.find(e => e.name === eventName);
    if (!event) return;
    
    if (event.type === 'specialBuy') {
        const cost = event.quantity * event.price;
        if (argent >= cost && stockCarton + event.quantity <= stockageMax) {
            argent -= cost;
            stockCarton += event.quantity;
            totalCarton += event.quantity;
            addEventToLog(`Vous avez acheté ${event.quantity} cartons via un événement spécial pour ${cost.toFixed(2)} €.`);
            endEvent(event);
            updateStats();
        } else {
            showAlertModal("Pas assez d'argent ou d'espace de stockage pour cette transaction !");
        }
    } else if (event.type === 'specialSell') {
        const gain = event.quantity * event.price;
        if (stockCarton >= event.quantity) {
            argent += gain;
            stockCarton -= event.quantity;
            totalVendu += event.quantity;
            addEventToLog(`Vous avez vendu ${event.quantity} cartons via un événement spécial pour ${gain.toFixed(2)} €.`);
            endEvent(event);
            updateStats();
        } else {
            showAlertModal("Pas assez de cartons en stock pour cette vente !");
        }
    }
    if (activeEvents.length === 0) {
        closeEventModal();
    } else {
        openEventModal();
    }
}

function handleRejectAction(eventName) {
    const event = activeEvents.find(e => e.name === eventName);
    if (!event) return;

    addEventToLog(`Vous avez rejeté l'événement : "${event.message}"`);
    endEvent(event);

    if (activeEvents.length === 0) {
        closeEventModal();
    } else {
        openEventModal();
    }
}

window.onload = () => {
    setTimeout(() => {
        console.log("--- Starting game.js DOM interaction (after window.onload and setTimeout(0)) ---");

        loadGame();

        const fabriquerCartonButton = document.getElementById("fabriquerCarton");
        const vendreCartonLink = document.getElementById("vendreCarton");
        const acheterPapierLink = document.getElementById("acheterpapier");
        const resetGameButton = document.getElementById("resetGame");
        const succesListUl = document.getElementById('succèsList');
        const accueilTab = document.getElementById('accueil');
        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');
        const tooltip = document.createElement('div');
        const logo = document.getElementById('toncplay-logo');
        const eventLogElement = document.getElementById('eventLog');
        const viewFullHistoryLink = document.getElementById('viewFullHistoryLink');
        const fullHistoryModal = document.getElementById('fullHistoryModal');
        const closeButton = document.querySelector('#fullHistoryModal .close-button');
        const eventButton = document.getElementById('eventButton');
        const eventModal = document.getElementById('eventModal');
        const closeEventModalButton = document.getElementById('closeEventModal');

        console.log("Debug: document.body:", document.body);
        console.log("Debug: resetGameButton element:", resetGameButton);
        console.log("Debug: succesListUl element:", succesListUl);
        console.log("Debug: accueilTab element:", accueilTab);
        console.log("Debug: tabLinks elements (length):", tabLinks.length);
        tabLinks.forEach(link => {
            console.log(`Debug: Tab Link data-tab="${link.getAttribute('data-tab')}"`);
        });
        console.log("Debug: tabContents elements (length):", tabContents.length);
        tabContents.forEach(content => {
            console.log(`Debug: Tab Content id="${content.id}"`);
        });
        console.log("Debug: eventLogElement:", eventLogElement);
        console.log("Debug: viewFullHistoryLink:", viewFullHistoryLink);
        console.log("Debug: fullHistoryModal:", fullHistoryModal);
        console.log("Debug: closeButton:", closeButton);
        console.log("Debug: eventButton:", eventButton);
        console.log("Debug: eventModal:", eventModal);
        console.log("Debug: closeEventModalButton:", closeEventModalButton);

        // Nouveaux écouteurs pour les modales d'alerte et de confirmation
        const closeAlertModalBtn = document.getElementById('closeAlertModal');
        if(closeAlertModalBtn) closeAlertModalBtn.addEventListener('click', closeAlertModal);
        const cancelConfirmModalBtn = document.getElementById('cancelConfirmModal');
        if(cancelConfirmModalBtn) cancelConfirmModalBtn.addEventListener('click', closeConfirmModal);


        if (fabriquerCartonButton) {
            fabriquerCartonButton.addEventListener("click", (e) => {
                if (papierDispo > 0 && stockCarton < stockageMax) {
                    let cartonsPossibles = Math.min(productionParClic, stockageMax - stockCarton);
                    if (cartonsPossibles > 0) {
                        papierDispo -= cartonsPossibles;
                        stockCarton += cartonsPossibles;
                        totalCarton += cartonsPossibles;

                        const floatingProductionText = document.createElement('div');
                        floatingProductionText.classList.add('floating-production-text');
                        floatingProductionText.textContent = `+${productionParClic}`;

                        const floatingCartonImage = document.createElement('img');
                        floatingCartonImage.classList.add('floating-carton-image');
                        const randomImageIndex = Math.floor(Math.random() * 5) + 1;
                        floatingCartonImage.src = `image/cartonclic${randomImageIndex}.png`;
                        floatingCartonImage.alt = `Carton +${productionParClic}`;
                        floatingCartonImage.onerror = function() {
                            this.src = 'https://placehold.co/40x40/cccccc/000000?text=IMG';
                        };

                        const randomFallDirection = Math.random() < 0.5 ? 'Left' : 'Right';
                        floatingCartonImage.style.animation = `fallAndFade${randomFallDirection} 1.5s forwards`;

                        floatingProductionText.style.left = `${e.clientX + window.scrollX}px`;
                        floatingProductionText.style.top = `${e.clientY + window.scrollY - 20}px`;

                        floatingCartonImage.style.left = `${e.clientX + window.scrollX + (randomFallDirection === 'Right' ? 10 : -10)}px`;
                        floatingCartonImage.style.top = `${e.clientY + window.scrollY - 20}px`;

                        document.body.appendChild(floatingProductionText);
                        document.body.appendChild(floatingCartonImage);

                        setTimeout(() => {
                            floatingProductionText.remove();
                            floatingCartonImage.remove();
                        }, 1500);
                        calculerCartonsParSeconde();
                        updateStats();
                        checkSuccessions();
                    } else {
                        showAlertModal("Capacité de stockage atteinte ! Vous ne pouvez plus fabriquer de cartons tant que vous n'avez pas vendu ou augmenté votre stockage.");
                        addEventToLog("Échec de fabrication : Stockage maximum atteint.");
                    }
                } else if (stockCarton >= stockageMax) {
                    showAlertModal("Stockage maximum atteint ! Veuillez vendre vos cartons ou augmenter la capacité de stockage.");
                    addEventToLog("Échec de fabrication : Stockage maximum atteint.");
                } else if (papierDispo <= 0) {
                    showAlertModal("Vous n'avez plus de papier !");
                    addEventToLog("Échec de fabrication : Plus de papier disponible.");
                }
            });
        } else {
            console.error("Erreur: Le bouton 'fabriquerCarton' est introuvable.");
        }

        if (vendreCartonLink) {
            vendreCartonLink.addEventListener("click", (e) => {
                e.preventDefault();
                if (stockCarton > 0) {
                    const cartonsVendues = stockCarton;
                    const argentGagne = (stockCarton * prixVenteCarton).toFixed(2);
                    totalVendu += cartonsVendues;
                    argent += parseFloat(argentGagne);
                    stockCarton = 0;
                    updateStats();
                    checkSuccessions();
                    addEventToLog(`Vous avez vendu ${cartonsVendues} cartons pour ${argentGagne} €.`);
                } else {
                    showAlertModal("Vous n'avez pas de cartons à vendre !");
                    addEventToLog("Échec de vente : Pas de cartons en stock.");
                }
            });
        } else {
            console.error("Erreur: Le lien 'vendreCarton' est introuvable.");
        }

        if (acheterPapierLink) {
            acheterPapierLink.addEventListener("click", (e) => {
                e.preventDefault();
                let quantitePapier = doublepapier ? 2000 : 1000;
                let coutPapier = (prixAchatPapier * quantitePapier).toFixed(2);
                if (argent >= parseFloat(coutPapier)) {
                    argent -= parseFloat(coutPapier);
                    papierDispo += quantitePapier;
                    totalPapierAchete += quantitePapier;
                    updateStats();
                    checkSuccessions();
                    addEventToLog(`Vous avez acheté ${quantitePapier} papiers pour ${coutPapier} €.`);
                } else {
                    showAlertModal("Pas assez d'argent pour acheter du papier.");
                    addEventToLog(`Échec d'achat de papier : Pas assez d'argent (${coutPapier} € requis).`);
                }
            });
        } else {
            console.error("Erreur: Le lien 'acheterpapier' est introuvable.");
        }

        const toggleAutoPaperButton = document.getElementById("toggleAutoPaperButton");
        if (toggleAutoPaperButton) {
            toggleAutoPaperButton.addEventListener('click', toggleAutoPaper);
        }

        if (eventButton) {
            eventButton.addEventListener('click', openEventModal);
        }
        if (closeEventModalButton) {
            closeEventModalButton.addEventListener('click', closeEventModal);
        }
        eventInterval = setInterval(startRandomEvent, 30000);

        attachImprovementButtonListeners();

        autoProductionInterval = setInterval(() => {
            if (niveauxameliorations.machinepapier > 0 && isAutoPaperActive && papierDispo <= 0 && argent >= prixAchatPapier * 1000) {
                let quantitePapier = doublepapier ? 2000 : 1000;
                let coutPapierAuto = (prixAchatPapier * quantitePapier).toFixed(2);
                if (argent >= parseFloat(coutPapierAuto)) {
                    argent -= parseFloat(coutPapierAuto);
                    papierDispo += quantitePapier;
                    totalPapierAchete += quantitePapier;
                }
                updateStats();
                checkSuccessions();
            }
            if (autoprod > 0) {
                let cartonsProduit = Math.min(autoprod, papierDispo, stockageMax - stockCarton);
                if (cartonsProduit > 0) {
                    papierDispo -= cartonsProduit;
                    stockCarton += cartonsProduit;
                    totalCarton += cartonsProduit;
                }
                calculerCartonsParSeconde();
                updateStats();
                checkSuccessions();
            }
        }, 1000);

        marketUpdateInterval = setInterval(() => {
            if (!isPriceEventActive) {
                prixAchatPapier = (Math.random() * (0.05 - 0.01) + 0.01).toFixed(2);
            }
            prixVenteBaseMin = parseFloat(prixVenteBaseMin);
            prixVenteBaseMax = parseFloat(prixVenteBaseMax);
            prixVenteCarton = (Math.random() * (prixVenteBaseMax - prixVenteBaseMin) + prixVenteBaseMin).toFixed(2);
            updateStats();
        }, 5000);

        tabLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const target = this.getAttribute('data-tab');
                tabContents.forEach(tab => {
                    tab.classList.remove('active');
                });
                const targetElement = document.getElementById(target);
                if (targetElement) {
                    targetElement.classList.add('active');
                } else {
                    console.error(`Erreur: L'onglet avec l'ID '${target}' est introuvable.`);
                }
            });
        });

        if (accueilTab) {
            accueilTab.classList.add('active');
        } else {
            console.error("Erreur: L'onglet 'accueil' est introuvable.");
        }

        if (resetGameButton) {
            resetGameButton.addEventListener("click", (e) => {
                e.preventDefault();
                showConfirmModal("Êtes-vous sûr de vouloir réinitialiser votre partie ? Toutes vos données seront perdues.", () => {
                    localStorage.removeItem("cartonGameSave");
                    
                    clearInterval(autoProductionInterval);
                    clearInterval(marketUpdateInterval);
                    clearInterval(eventInterval);

                    initializeGameVariables();

                    const ameliorationStatsAvanceesDiv = document.getElementById("amelioration-statsavancees");
                    if (ameliorationStatsAvanceesDiv) {
                        ameliorationStatsAvanceesDiv.innerHTML = '<h4>Statistiques Avancées</h4><p class="amelioration-description">Affiche des statistiques avancées sur votre production.</p><div class="amelioration-details-group"><p class="amelioration-level">Prix: <span id="prixStatsavancees">150</span> €</p><div class="price-button-stack"><button id="acheter-statsavancees">Acheter</button></div></div>';
                    }
                    const ameliorationMachinePapierDiv = document.getElementById("amelioration-machinepapier");
                    if (ameliorationMachinePapierDiv) {
                        ameliorationMachinePapierDiv.innerHTML = '<h4>Machine à Papier</h4><p class="amelioration-description">Achète automatiquement du papier quand le stock atteint 0.</p><div class="amelioration-details-group"><p class="amelioration-level">Prix: <span id="prixMachinepapier">500</span> €</p><div class="price-button-stack"><button id="acheter-machinepapier">Acheter</button></div></div>';
                    }

                    const autoPapierStatLabelElement = document.getElementById("autoPapierStatLabel");
                    const autoPapierStatValueElement = document.getElementById("autoPapierStatValue");
                    if (autoPapierStatLabelElement) autoPapierStatLabelElement.style.display = "none";
                    if (autoPapierStatValueElement) autoPapierStatValueElement.style.display = "none";

                    const cartonParSecondeLabelElement = document.getElementById("cartonParSecondeLabel");
                    const cartonParSecondeValueElement = document.getElementById("cartonParSecondeValue");
                    if (cartonParSecondeLabelElement) cartonParSecondeLabelElement.style.display = "none";
                    if (cartonParSecondeValueElement) cartonParSecondeValueElement.style.display = "none";

                    completedSuccessions = [];
                    initSuccessions();
                    updateSuccessDisplay();
                    updateStats();
                    updateEventLogDisplay();
                    attachImprovementButtonListeners();

                    autoProductionInterval = setInterval(() => {
                        if (niveauxameliorations.machinepapier > 0 && isAutoPaperActive && papierDispo <= 0 && argent >= prixAchatPapier * 1000) {
                            let quantitePapier = doublepapier ? 2000 : 1000;
                            let coutPapierAuto = (prixAchatPapier * quantitePapier).toFixed(2);
                            if (argent >= parseFloat(coutPapierAuto)) {
                                argent -= parseFloat(coutPapierAuto);
                                papierDispo += quantitePapier;
                                totalPapierAchete += quantitePapier;
                            }
                            updateStats();
                            checkSuccessions();
                        }
                        if (autoprod > 0) {
                            let cartonsProduit = Math.min(autoprod, papierDispo, stockageMax - stockCarton);
                            if (cartonsProduit > 0) {
                                papierDispo -= cartonsProduit;
                                stockCarton += cartonsProduit;
                                totalCarton += cartonsProduit;
                            }
                            calculerCartonsParSeconde();
                            updateStats();
                            checkSuccessions();
                        }
                    }, 1000);

                    marketUpdateInterval = setInterval(() => {
                        if (!isPriceEventActive) {
                            prixAchatPapier = (Math.random() * (0.05 - 0.01) + 0.01).toFixed(2);
                        }
                        prixVenteBaseMin = parseFloat(prixVenteBaseMin);
                        prixVenteBaseMax = parseFloat(prixVenteBaseMax);
                        prixVenteCarton = (Math.random() * (prixVenteBaseMax - prixVenteBaseMin) + prixVenteBaseMin).toFixed(2);
                        updateStats();
                    }, 5000);
                    
                    eventInterval = setInterval(startRandomEvent, 30000);

                    addEventToLog("Le jeu a été réinitialisé. Nouvelle partie commencée !");
                });
            });
        } else {
            console.error("Erreur: Le bouton de réinitialisation avec l'ID 'resetGame' est introuvable au chargement.");
        }

        tooltip.id = 'tooltip';
        tooltip.style.cssText = `
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            pointer-events: none;
            white-space: nowrap;
            z-index: 1000;
        `;
        document.body.appendChild(tooltip);

        if (logo) {
            logo.addEventListener('mouseenter', (e) => {
                const text = logo.getAttribute('data-tooltip');
                if (text) {
                    tooltip.textContent = text;
                    tooltip.style.display = 'block';
                }
            });
            logo.addEventListener('mousemove', (e) => {
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY + 10 + 'px';
            });
            logo.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        }

        initSuccessions();
        updateSuccessDisplay();
        updateEventLogDisplay();

        if (viewFullHistoryLink && fullHistoryModal && closeButton) {
            viewFullHistoryLink.addEventListener('click', (e) => {
                e.preventDefault();
                fullHistoryModal.style.display = 'flex';
                updateEventLogDisplay();
            });

            closeButton.addEventListener('click', () => {
                fullHistoryModal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === fullHistoryModal) {
                    fullHistoryModal.style.display = 'none';
                }
            });
        } else {
            console.error("Erreur: Éléments de la modale d'historique introuvables.");
        }

        addEventToLog("Bienvenue dans Carton Game !");
        console.log("--- Finished game.js DOM interaction setup ---");

    }, 0);
};
