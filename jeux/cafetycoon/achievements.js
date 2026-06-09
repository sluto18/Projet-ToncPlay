/* ===================================================
   ACHIEVEMENTS.JS — Module Succès & Paliers Réputation
   =================================================== */

/* ---------- PALIERS DE RÉPUTATION ---------- */

var REP_TIERS = [
  { min: 0,    label: 'Inconnu',      spawnMult: 1.0  },
  { min: 15,   label: 'Nouveau',      spawnMult: 0.85  },
  { min: 40,   label: 'Connu',        spawnMult: 0.70  },
  { min: 80,   label: 'Populaire',    spawnMult: 0.55 },
  { min: 150,  label: 'Célèbre',      spawnMult: 0.40 },
  { min: 300,  label: 'Légende',      spawnMult: 0.30 },
  { min: 500,  label: 'Institution',  spawnMult: 0.22 },
  { min: 750,  label: 'Référence',    spawnMult: 0.18 },
  { min: 1100, label: 'Phénomène',    spawnMult: 0.15 },
  { min: 1600, label: 'Mythe',        spawnMult: 0.12 },
  { min: 2500, label: 'Empereur',     spawnMult: 0.10 }
];

/**
 * Retourne le palier de réputation actuel
 */
function getCurrentRepTier() {
  var tier = REP_TIERS[0];
  for (var i = REP_TIERS.length - 1; i >= 0; i--) {
    if (state.reputation >= REP_TIERS[i].min) { tier = REP_TIERS[i]; break; }
  }
  return tier;
}

/**
 * Retourne le prochain palier de réputation (ou null si max)
 */
function getNextRepTier() {
  var current = getCurrentRepTier();
  for (var i = 0; i < REP_TIERS.length; i++) {
    if (REP_TIERS[i].min > current.min) return REP_TIERS[i];
  }
  return null;
}

/* ---------- DÉFINITION DES SUCCÈS ---------- */

var ACHIEVEMENT_CATEGORIES = [
  { id: 'plantation', name: 'Plantation',  icon: 'fa-leaf' },
  { id: 'coffee',     name: 'Coffee Shop', icon: 'fa-mug-hot' },
  { id: 'commerce',   name: 'Commerce',    icon: 'fa-truck' },
  { id: 'reputation', name: 'Réputation',  icon: 'fa-star' },
  { id: 'magasin',    name: 'Magasin',     icon: 'fa-flask' }
];

var ACHIEVEMENTS = [
  /* --- Plantation : récoltes (nombre d'actions) --- */
  { id: 'harvest_act_1',    category: 'plantation', name: 'Première récolte',    desc: 'Récoltez un caféier pour la première fois',     icon: 'fa-seedling',     check: function(s) { return s.stats.totalHarvestActions >= 1; } },
  { id: 'harvest_act_25',   category: 'plantation', name: 'Jardinier amateur',   desc: 'Effectuez 25 récoltes au total',                icon: 'fa-leaf',          check: function(s) { return s.stats.totalHarvestActions >= 25; } },
  { id: 'harvest_act_100',  category: 'plantation', name: 'Agriculteur',         desc: 'Effectuez 100 récoltes au total',               icon: 'fa-tree',          check: function(s) { return s.stats.totalHarvestActions >= 100; } },
  { id: 'harvest_act_500',  category: 'plantation', name: 'Maître planteur',     desc: 'Effectuez 500 récoltes au total',               icon: 'fa-seedling',      check: function(s) { return s.stats.totalHarvestActions >= 500; } },

  /* --- Plantation : grains récoltés (cumul) --- */
  { id: 'beans_harv_100',   category: 'plantation', name: 'Premiers grains',     desc: 'Récoltez 100 grains au total',                  icon: 'fa-box-open',      check: function(s) { return s.stats.totalHarvested >= 100; } },
  { id: 'beans_harv_1000',  category: 'plantation', name: 'Sac plein',           desc: 'Récoltez 1 000 grains au total',                icon: 'fa-box',           check: function(s) { return s.stats.totalHarvested >= 1000; } },
  { id: 'beans_harv_10000', category: 'plantation', name: 'Entrepôt rempli',     desc: 'Récoltez 10 000 grains au total',               icon: 'fa-warehouse',     check: function(s) { return s.stats.totalHarvested >= 10000; } },
  { id: 'beans_harv_50000', category: 'plantation', name: 'Roi du café vert',   desc: 'Récoltez 50 000 grains au total',               icon: 'fa-crown',         check: function(s) { return s.stats.totalHarvested >= 50000; } },

  /* --- Coffee Shop : cafés servis --- */
  { id: 'served_1',         category: 'coffee', name: 'Premier service',         desc: 'Servez votre premier café',                      icon: 'fa-mug-hot',       check: function(s) { return s.stats.totalServed >= 1; } },
  { id: 'served_10',        category: 'coffee', name: 'Barista débutant',        desc: 'Servez 10 cafés au total',                       icon: 'fa-mug-saucer',    check: function(s) { return s.stats.totalServed >= 10; } },
  { id: 'served_50',        category: 'coffee', name: 'Barista confirmé',        desc: 'Servez 50 cafés au total',                       icon: 'fa-blender',       check: function(s) { return s.stats.totalServed >= 50; } },
  { id: 'served_200',       category: 'coffee', name: 'Barista expert',          desc: 'Servez 200 cafés au total',                      icon: 'fa-star',          check: function(s) { return s.stats.totalServed >= 200; } },
  { id: 'served_1000',      category: 'coffee', name: 'Maître barista',          desc: 'Servez 1 000 cafés au total',                    icon: 'fa-trophy',        check: function(s) { return s.stats.totalServed >= 1000; } },

  /* --- Commerce : grains vendus --- */
  { id: 'sold_50',          category: 'commerce', name: 'Première vente',         desc: 'Vendez 50 grains via le commerce',              icon: 'fa-handshake',     check: function(s) { return s.stats.totalSold >= 50; } },
  { id: 'sold_500',         category: 'commerce', name: 'Petit marchand',         desc: 'Vendez 500 grains via le commerce',             icon: 'fa-shop',          check: function(s) { return s.stats.totalSold >= 500; } },
  { id: 'sold_2000',        category: 'commerce', name: 'Grossiste',             desc: 'Vendez 2 000 grains via le commerce',           icon: 'fa-truck',         check: function(s) { return s.stats.totalSold >= 2000; } },
  { id: 'sold_10000',       category: 'commerce', name: 'Magnat du commerce',    desc: 'Vendez 10 000 grains via le commerce',          icon: 'fa-building',      check: function(s) { return s.stats.totalSold >= 10000; } },

  /* --- Réputation : paliers atteints --- */
  { id: 'rep_10',           category: 'reputation', name: 'Bonne impression',     desc: 'Atteignez 10 points de réputation',             icon: 'fa-thumbs-up',     check: function(s) { return s.stats.maxReputation >= 10; } },
  { id: 'rep_50',           category: 'reputation', name: 'Bonne réputation',     desc: 'Atteignez 50 points de réputation',             icon: 'fa-star-half-stroke', check: function(s) { return s.stats.maxReputation >= 50; } },
  { id: 'rep_100',          category: 'reputation', name: 'Réputation solide',    desc: 'Atteignez 100 points de réputation',            icon: 'fa-star',          check: function(s) { return s.stats.maxReputation >= 100; } },
  { id: 'rep_250',          category: 'reputation', name: 'Café incontournable',  desc: 'Atteignez 250 points de réputation',            icon: 'fa-medal',         check: function(s) { return s.stats.maxReputation >= 250; } },
  { id: 'rep_500',          category: 'reputation', name: 'Légende locale',       desc: 'Atteignez 500 points de réputation',            icon: 'fa-crown',         check: function(s) { return s.stats.maxReputation >= 500; } },
    /* --- Plantation : terrain et jardiniers --- */
  { id: 'multi_parcelle_3',  category: 'plantation', name: 'Petit domaine',       desc: 'Possédez 3 parcelles de plantation',              icon: 'fa-map',           check: function(s) { return s.parcelles.length >= 3; } },
  { id: 'multi_parcelle_5',  category: 'plantation', name: 'Grand domaine',       desc: 'Possédez les 5 parcelles de plantation',          icon: 'fa-map-location-dot', check: function(s) { return s.parcelles.length >= 5; } },
  { id: 'slots_total_10',    category: 'plantation', name: 'Terrain étendu',      desc: 'Ayez 10 emplacements de plantation au total',      icon: 'fa-border-all',     check: function(s) { var t=0; for(var i=0;i<s.parcelles.length;i++) t+=s.parcelles[i].slots; return t>=10; } },
  { id: 'slots_total_30',    category: 'plantation', name: 'Vaste exploitation',  desc: 'Ayez 30 emplacements de plantation au total',      icon: 'fa-maximize',       check: function(s) { var t=0; for(var i=0;i<s.parcelles.length;i++) t+=s.parcelles[i].slots; return t>=30; } },
  { id: 'gardener_first',    category: 'plantation', name: 'Premier employé',     desc: 'Engagez un jardinier pour une parcelle',            icon: 'fa-person-digging', check: function(s) { for(var i=0;i<s.parcelles.length;i++) if(s.parcelles[i].hasGardener) return true; return false; } },
  { id: 'gardener_all',      category: 'plantation', name: 'Équipe complète',     desc: 'Engagez un jardinier sur chaque parcelle',          icon: 'fa-people-group',   check: function(s) { for(var i=0;i<s.parcelles.length;i++) if(!s.parcelles[i].hasGardener) return false; return s.parcelles.length>0; } },

  /* --- Coffee Shop : infrastructure --- */
  { id: 'counter_3',         category: 'coffee', name: 'Comptoir agrandi',     desc: 'Ayez 3 postes de préparation au comptoir',        icon: 'fa-blender',        check: function(s) { return s.counterSlots >= 3; } },
  { id: 'counter_5',         category: 'coffee', name: 'Grand comptoir',       desc: 'Ayez les 5 postes de préparation au comptoir',     icon: 'fa-martini-glass',  check: function(s) { return s.counterSlots >= 5; } },
  { id: 'queue_10',          category: 'coffee', name: 'File dynamique',       desc: 'Ayez une file d\'attente de 10 places',            icon: 'fa-users',          check: function(s) { return s.maxQueue >= 10; } },
  { id: 'queue_15',          category: 'coffee', name: 'File maximale',        desc: 'Ayez une file d\'attente de 15 places',            icon: 'fa-people-line',    check: function(s) { return s.maxQueue >= 15; } },

  /* --- Commerce : argent total gagné --- */
  { id: 'earned_1k',         category: 'commerce', name: 'Premiers profits',     desc: 'Gagnez 1 000$ au total (ventes + services)',      icon: 'fa-sack-dollar',    check: function(s) { return s.stats.totalEarned >= 1000; } },
  { id: 'earned_10k',        category: 'commerce', name: 'Business rentable',    desc: 'Gagnez 10 000$ au total',                         icon: 'fa-money-bill-trend-up', check: function(s) { return s.stats.totalEarned >= 10000; } },
  { id: 'earned_100k',       category: 'commerce', name: 'Fortune',              desc: 'Gagnez 100 000$ au total',                        icon: 'fa-gem',            check: function(s) { return s.stats.totalEarned >= 100000; } },
  { id: 'earned_1m',         category: 'commerce', name: 'Millionnaire',         desc: 'Gagnez 1 000 000$ au total',                      icon: 'fa-crown',          check: function(s) { return s.stats.totalEarned >= 1000000; } },

  /* --- Réputation : paliers élevés --- */
  { id: 'rep_750',           category: 'reputation', name: 'Phénomène',           desc: 'Atteignez 750 points de réputation',              icon: 'fa-fire',           check: function(s) { return s.stats.maxReputation >= 750; } },
  { id: 'rep_1100',          category: 'reputation', name: 'Mythe vivant',        desc: 'Atteignez 1 100 points de réputation',            icon: 'fa-bolt',           check: function(s) { return s.stats.maxReputation >= 1100; } },
  { id: 'rep_1600',          category: 'reputation', name: 'Légende absolue',     desc: 'Atteignez 1 600 points de réputation',            icon: 'fa-dragon',         check: function(s) { return s.stats.maxReputation >= 1600; } },
  { id: 'rep_2500',          category: 'reputation', name: 'Empereur du café',    desc: 'Atteignez 2 500 points de réputation',            icon: 'fa-chess-king',     check: function(s) { return s.stats.maxReputation >= 2500; } },

  /* --- Magasin : améliorations --- */
  { id: 'upgrade_first',     category: 'magasin', name: 'Premier investissement', desc: 'Achetez une amélioration pour la première fois',   icon: 'fa-flask-vial',     check: function(s) { for(var k in s.upgrades) if(s.upgrades[k]>=1) return true; return false; } },
  { id: 'upgrade_fert_max',  category: 'magasin', name: 'Engrais parfait',      desc: 'Engrais de qualité au niveau maximum',             icon: 'fa-leaf',           check: function(s) { return s.upgrades.fertilizer >= 5; } },
  { id: 'upgrade_mach_max',  category: 'magasin', name: 'Machine ultime',       desc: 'Machine à espresso au niveau maximum',             icon: 'fa-gears',          check: function(s) { return s.upgrades.machine >= 5; } },
  { id: 'upgrade_var_max',   category: 'magasin', name: 'Carte premium',        desc: 'Variétés premium au niveau maximum',               icon: 'fa-gem',            check: function(s) { return s.upgrades.variety >= 5; } },
  { id: 'upgrade_all_max',   category: 'magasin', name: 'Tout au max',          desc: 'Toutes les améliorations au niveau maximum',       icon: 'fa-arrow-up-right-dots', check: function(s) { for(var k in s.upgrades) if(s.upgrades[k] < UPGRADES[k].maxLevel) return false; return true; } }
];

/* ---------- LOGIQUE DE VÉRIFICATION ---------- */

var _achievementsBuilt = false;

/**
 * Vérifie tous les succès non débloqués et débloque ceux qui sont remplis.
 * Appelé périodiquement et après les actions clés.
 */
function checkAchievements() {
  if (!state.achievements) state.achievements = [];
  var unlocked = false;
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var a = ACHIEVEMENTS[i];
    if (state.achievements.indexOf(a.id) !== -1) continue;
    try {
      if (a.check(state)) {
        state.achievements.push(a.id);
        unlocked = true;
        showToast('<i class="fas fa-trophy toast-ach-icon"></i> Succès débloqué : ' + a.name, 'achievement');
        logEvent('Succès débloqué : ' + a.name, 'money');
      }
    } catch (e) {}
  }
  if (unlocked) {
    _achievementsBuilt = false;
    if (currentTab === 'succes') renderAchievementsUI();
  }
}

/**
 * Retourne le nombre de succès débloqués
 */
function getAchievementCount() {
  if (!state.achievements) return 0;
  return state.achievements.length;
}

/* ---------- RENDU INTERFACE ---------- */

/**
 * Construit l'intégralité du panneau Succès
 */
function renderAchievementsUI() {
  var total = ACHIEVEMENTS.length;
  var unlocked = getAchievementCount();
  document.getElementById('achievements-count').textContent = unlocked + ' / ' + total;

  var container = document.getElementById('achievements-content');
  var html = '';

  for (var ci = 0; ci < ACHIEVEMENT_CATEGORIES.length; ci++) {
    var cat = ACHIEVEMENT_CATEGORIES[ci];
    var catAchievements = [];
    for (var ai = 0; ai < ACHIEVEMENTS.length; ai++) {
      if (ACHIEVEMENTS[ai].category === cat.id) catAchievements.push(ACHIEVEMENTS[ai]);
    }
    var catUnlocked = 0;
    for (var cu = 0; cu < catAchievements.length; cu++) {
      if (state.achievements && state.achievements.indexOf(catAchievements[cu].id) !== -1) catUnlocked++;
    }

    html += '<div class="achievement-category">';
    html += '<div class="achievement-category-title"><i class="fas ' + cat.icon + '"></i> ' + cat.name + '<span class="achievement-category-count">' + catUnlocked + '/' + catAchievements.length + '</span></div>';
    html += '<div class="achievements-grid">';

    for (var aj = 0; aj < catAchievements.length; aj++) {
      var ach = catAchievements[aj];
      var isUnlocked = state.achievements && state.achievements.indexOf(ach.id) !== -1;
      var cls = isUnlocked ? 'unlocked' : 'locked';
      html += '<div class="achievement-card ' + cls + '">';
      html += '<div class="achievement-icon"><i class="fas ' + ach.icon + '"></i></div>';
      html += '<div class="achievement-text"><h4>' + ach.name + '</h4><p>' + ach.desc + '</p></div>';
      if (isUnlocked) html += '<i class="fas fa-check-circle achievement-check"></i>';
      html += '</div>';
    }

    html += '</div></div>';
  }

  container.innerHTML = html;
  _achievementsBuilt = true;
}

/**
 * Met à jour le compteur sans tout reconstruire
 */
function lightUpdateAchievementsCount() {
  var total = ACHIEVEMENTS.length;
  var unlocked = getAchievementCount();
  document.getElementById('achievements-count').textContent = unlocked + ' / ' + total;
}