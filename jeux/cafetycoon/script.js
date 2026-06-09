/* ===================================================
   CONSTANTESplot-card
   =================================================== */

var MAX_SLOTS_PER_PARCELLE = 12;
var MAX_PARCELLES = 5;
var PLANT_COST = 10;
var BASE_GROW_TIME = 30000;
var BASE_YIELD_MIN = 5;
var BASE_YIELD_MAX = 10;
var MILK_COST = 20;
var MILK_AMOUNT = 10;
var BASE_SPAWN_INTERVAL = 14000;
var MIN_SPAWN_INTERVAL = 1000;
var BASE_PATIENCE = 32000;
var SAVE_INTERVAL = 20000;
var PRICE_CHANGE_MIN = 5000;
var PRICE_CHANGE_MAX = 12000;
var BASE_MILK_PRICE = 2.00;
var MILK_PRICE_MIN = 1.00;
var MILK_PRICE_MAX = 4.00;
var MILK_PRICE_CHANGE_MIN = 6000;
var MILK_PRICE_CHANGE_MAX = 15000;
var BASE_QUEUE_SIZE = 5;
var MAX_QUEUE_SIZE = 15;
var BASE_COUNTER_SLOTS = 1;
var MAX_COUNTER_SLOTS = 5;
var GARDENER_PLANT_COST = 12;
var PLANT_BEANS_COST = 2;
var GARDENER_BEANS_SALARY = 2;
var URGENT_OFFER_MAX_ACTIVE = 3;
var URGENT_OFFER_CHECK_INTERVAL = 5000;
var _nextUrgentOfferId = 1;
var _urgentPauseStart = 0;
var _urgentTotalPausedMs = 0;
var GROUP_NAMES = ['Un couple', 'Un trio d\'amis', 'Un groupe de collègues', 'Une famille', 'Des amis'];
var GROUP_SPAWN_CHANCE = 0.12;
var GRAIN_BOOST_COST = 250;
var GRAIN_BOOST_DURATION = 45000;
var GRAIN_BOOST_CD = 180000;
var GRAIN_BOOST_MULT = 1.8;
var MILK_DROP_COST = 400;
var MILK_DROP_DURATION = 60000;
var MILK_DROP_CD = 300000;
var AD_COST = 350;
var AD_DURATION = 60000;
var AD_CD = 240000;
var AD_SPAWN_MULT = 0.6;
var BARISTA_COST = 5000;
var BARISTA_PREP_COST = 2;
var GRAIN_PRICE_SPIKE_CHANCE = 0.04;
var GRAIN_PRICE_SPIKE_MIN = 1.5;
var GRAIN_PRICE_SPIKE_MAX = 3.5;
var MILK_PRICE_SPIKE_CHANCE = 0.03;
var MILK_PRICE_SPIKE_MIN = 1.0;
var MILK_PRICE_SPIKE_MAX = 3.0;

var SLOT_COSTS = [30, 50, 80, 120, 170, 230, 300, 380, 470, 570];
var PARCELLE_COSTS = [500, 1500, 4000, 10000, 25000];

var RECIPES = {
  espresso:      { name: 'Espresso',       beans: 2, milk: 0, basePrice: 15,  prepTime: 5000,  repGain: 3  },
  doubleespresso:{ name: 'Double Espresso', beans: 4, milk: 0, basePrice: 28,  prepTime: 7000,  repGain: 4  },
  latte:         { name: 'Latte',          beans: 3, milk: 1, basePrice: 25,  prepTime: 8000,  repGain: 4  },
  cappuccino:    { name: 'Cappuccino',     beans: 3, milk: 1, basePrice: 30,  prepTime: 10000, repGain: 5  },
  toncplay:      { name: 'Café Tonc Play', beans: 6, milk: 3, basePrice: 65,  prepTime: 14000, repGain: 10  }
};

var SELLERS = {
  local:       { name: 'Marchand Local',        icon: 'fa-shop',            quota: 50,  priceMult: 1.0,  cooldown: 25000,  urgent: { minBeans: 50,  maxBeans: 150,  minDuration: 90000,  maxDuration: 120000, bonusMin: 4,   bonusMax: 7   } },
  corporate:   { name: 'Livraison Pro',          icon: 'fa-van-shuttle',     quota: 100, priceMult: 0.9,  cooldown: 35000,  urgent: { minBeans: 100, maxBeans: 200,  minDuration: 100000, maxDuration: 150000, bonusMin: 4.5, bonusMax: 7.5 } },
  supermarket: { name: 'Supermarché',           icon: 'fa-cart-shopping',   quota: 200, priceMult: 0.85, cooldown: 50000,  urgent: { minBeans: 200, maxBeans: 500,  minDuration: 110000, maxDuration: 160000, bonusMin: 5,   bonusMax: 8   } },
  export:      { name: 'Export International',   icon: 'fa-plane-departure', quota: 500, priceMult: 0.7,  cooldown: 90000,  urgent: { minBeans: 500, maxBeans: 1500, minDuration: 120000, maxDuration: 180000, bonusMin: 5.5, bonusMax: 9   } }
};

var UPGRADES = {
  fertilizer: { name: 'Engrais de qualité',       desc: 'Réduit le temps de pousse de 15 % par niveau.',       icon: 'fa-flask-vial', maxLevel: 5, costs: [100, 300, 700, 1500, 3200] },
  research:   { name: 'Recherche agronomique',     desc: 'Augmente le rendement de 20 % par niveau.',          icon: 'fa-microscope', maxLevel: 5, costs: [150, 400, 900, 2000, 4200] },
  machine:    { name: 'Machine à espresso',        desc: 'Réduit le temps de préparation de 15 % par niveau.', icon: 'fa-gears',      maxLevel: 5, costs: [200, 550, 1200, 2600, 5400] },
  variety:    { name: 'Variétés premium',          desc: 'Augmente les prix de vente de 15 % par niveau.',     icon: 'fa-gem',        maxLevel: 5, costs: [250, 650, 1400, 3000, 6200] },
  counter:    { name: 'Comptoir élargi',           desc: 'Ajoute 1 place au comptoir (max 5 places).',         icon: 'fa-blender',    maxLevel: 4, costs: [800, 2500, 6000, 15000] },
  queue:      { name: 'File d\'attente agrandie',  desc: 'Ajoute 2 places à la file (max 15 places).',        icon: 'fa-users',      maxLevel: 5, costs: [400, 1200, 3000, 7000, 15000] }
};

var CUSTOMER_NAMES = [
  'Marie','Pierre','Sophie','Jean','Claire','Lucas','Emma',
  'Hugo','Léa','Thomas','Camille','Antoine','Julie','Maxime',
  'Chloé','Nathan','Manon','Romain','Laura','Alexandre',
  'Sarah','Gabriel','Inès','Louis','Jade', 'Zoé', 'Patricia', 'Arsène',
];
var RECIPE_KEYS = Object.keys(RECIPES);

/* ===================================================
   ÉTAT DU JEU
   =================================================== */

var state = null;

function createFreshState() {
  return {
    money: 500,
    reputation: 0,
    rawBeans: 0,
    milk: 0,
    shopOpen: true,
    parcelles: [{ slots: 2, plots: [null, null], hasGardener: false, gardenerActive: false }],
    currentParcelle: 0,
    activeOrders: [],
    counterSlots: BASE_COUNTER_SLOTS,
    maxQueue: BASE_QUEUE_SIZE,
    customers: [],
    nextCustomerId: 1,
    spawnTimer: 6000,
    marketPrice: 3.50,
    previousPrice: 3.50,
    priceChangeTimer: 10000,
    sellerCooldowns: { local: 0, corporate: 0, supermarket: 0, export: 0 },
    upgrades: { fertilizer: 0, research: 0, machine: 0, variety: 0, counter: 0, queue: 0 },
    achievements: [],
    milkMarketPrice: BASE_MILK_PRICE,
    milkPreviousPrice: BASE_MILK_PRICE,
    milkPriceChangeTimer: 12000,
    priceHistory: {
      beans: [3.50],
      milk: [BASE_MILK_PRICE]
    },
    stats: {
      totalHarvested: 0,
      totalHarvestActions: 0,
      totalServed: 0,
      totalSold: 0,
      totalEarned: 0,
      maxReputation: 0
    },
    urgentOffers: [],
    urgentOfferTimer: 30000,
    urgentOffersPaused: false,
    lastUrgentGenTime: Date.now(),
    grainBoostTimer: 0,
    grainBoostCd: 0,
    milkDropTimer: 0,
    milkDropCd: 0,
    adTimer: 0,
    adCd: 0,
    plantPayMode: 'money',
    hasBarista: false,
    baristaActive: false,
    activityLog: [],
    lastSaveTime: Date.now()
  };
}

/* ===================================================
   CALCULS DÉRIVÉS
   =================================================== */

function getGrowDuration() { return BASE_GROW_TIME * Math.max(0.25, 1 - state.upgrades.fertilizer * 0.15); }
function getYieldAmount() {
  var m = 1 + state.upgrades.research * 0.2;
  var mn = Math.floor(BASE_YIELD_MIN * m), mx = Math.floor(BASE_YIELD_MAX * m);
  return mn + Math.floor(Math.random() * (mx - mn + 1));
}
function getPrepDuration(k) { return RECIPES[k].prepTime * Math.max(0.25, 1 - state.upgrades.machine * 0.15); }
function getSellPrice(k) { return Math.ceil(RECIPES[k].basePrice * (1 + state.upgrades.variety * 0.15)); }
function getSpawnInterval() {
  var factor = 1 + (state.reputation / 100);
  var interval = BASE_SPAWN_INTERVAL / factor;
  if (state.adTimer > 0) {
    var tier = getCurrentRepTier();
    interval *= (1 - tier.spawnMult * 0.4);
  }
  return Math.max(MIN_SPAWN_INTERVAL, interval);
}
function getPatience() { return BASE_PATIENCE + Math.min(state.reputation * 80, 20000); }
function getSlotCost(pIdx) {
  var s = state.parcelles[pIdx].slots;
  if (s >= MAX_SLOTS_PER_PARCELLE) return Infinity;
  return SLOT_COSTS[s - 2];
}
function getParcelleCost() {
  var c = state.parcelles.length;
  if (c >= MAX_PARCELLES) return Infinity;
  return PARCELLE_COSTS[c - 1];
}
function getPlots() { return state.parcelles[state.currentParcelle].plots; }
function getSlots() { return state.parcelles[state.currentParcelle].slots; }
function updateMaxReputation() {
  if (state.reputation > state.stats.maxReputation) state.stats.maxReputation = state.reputation;
}

function getPlantCost() {
  if (state.plantPayMode === 'beans') return { type: 'beans', beans: PLANT_BEANS_COST, money: 0 };
  return { type: 'money', beans: 0, money: PLANT_COST };
}
function getGardenerPlantCost() {
  if (state.plantPayMode === 'beans') return { type: 'beans', beans: PLANT_BEANS_COST, money: GARDENER_BEANS_SALARY };
  return { type: 'money', beans: 0, money: GARDENER_PLANT_COST };
}
function getPlantCostLabel() {
  if (state.plantPayMode === 'beans') return PLANT_BEANS_COST + ' grains';
  return PLANT_COST + '$';
}

/* ===================================================
   SAUVEGARDE / CHARGEMENT
   =================================================== */

function saveGame() {
  try { state.lastSaveTime = Date.now(); localStorage.setItem('coffeeTycoonSave', JSON.stringify(state)); } catch (e) {}
}

function loadGame() {
  try {
    var raw = localStorage.getItem('coffeeTycoonSave');
    if (!raw) return;
    var saved = JSON.parse(raw);
    var fresh = createFreshState();
    for (var key in fresh) {
      if (saved[key] !== undefined) {
        if (typeof fresh[key] === 'object' && !Array.isArray(fresh[key]) && fresh[key] !== null) {
          state[key] = {};
          for (var sub in fresh[key]) { state[key][sub] = saved[key][sub] !== undefined ? saved[key][sub] : fresh[key][sub]; }
        } else {
          state[key] = saved[key];
        }
      }
    }
    if (!state.parcelles || state.parcelles.length === 0) {
      if (saved.plots && saved.plots.length > 0) {
        state.parcelles = [{ slots: Math.min(saved.plots.length, MAX_SLOTS_PER_PARCELLE), plots: saved.plots.slice(0, MAX_SLOTS_PER_PARCELLE) }];
      } else {
        state.parcelles = [{ slots: 2, plots: [null, null] }];
      }
      state.currentParcelle = 0;
    }
    if (state.shopOpen === undefined) state.shopOpen = true;
    if (state.currentParcelle === undefined) state.currentParcelle = 0;
    if (!state.activeOrders) state.activeOrders = saved.activeOrder ? [saved.activeOrder] : [];
    if (state.counterSlots === undefined) state.counterSlots = BASE_COUNTER_SLOTS;
    if (state.maxQueue === undefined) state.maxQueue = BASE_QUEUE_SIZE;
    if (!state.achievements) state.achievements = [];
    if (state.upgrades.counter === undefined) state.upgrades.counter = 0;
    if (state.upgrades.queue === undefined) state.upgrades.queue = 0;
    if (state.stats.totalHarvestActions === undefined) state.stats.totalHarvestActions = 0;
    if (state.stats.maxReputation === undefined) state.stats.maxReputation = state.reputation || 0;
    if (state.milkMarketPrice === undefined) state.milkMarketPrice = BASE_MILK_PRICE;
    if (state.milkPreviousPrice === undefined) state.milkPreviousPrice = BASE_MILK_PRICE;
    if (state.milkPriceChangeTimer === undefined) state.milkPriceChangeTimer = 12000;
    if (!state.priceHistory) state.priceHistory = { beans: [state.marketPrice || 3.50], milk: [state.milkMarketPrice || BASE_MILK_PRICE] };
    state.counterSlots = Math.min(BASE_COUNTER_SLOTS + (state.upgrades.counter || 0), MAX_COUNTER_SLOTS);
    state.maxQueue = Math.min(BASE_QUEUE_SIZE + (state.upgrades.queue || 0) * 2, MAX_QUEUE_SIZE);
    for (var p = 0; p < state.parcelles.length; p++) {
      state.parcelles[p].slots = Math.min(state.parcelles[p].slots || 2, MAX_SLOTS_PER_PARCELLE);
      state.parcelles[p].hasGardener = state.parcelles[p].hasGardener || false;
      state.parcelles[p].gardenerActive = state.parcelles[p].gardenerActive !== undefined ? state.parcelles[p].gardenerActive : state.parcelles[p].hasGardener;
      while (state.parcelles[p].plots.length < state.parcelles[p].slots) state.parcelles[p].plots.push(null);
      if (state.parcelles[p].plots.length > state.parcelles[p].slots) state.parcelles[p].plots.length = state.parcelles[p].slots;
    }
    state.currentParcelle = Math.min(state.currentParcelle, state.parcelles.length - 1);
    if (state.hasBarista === undefined) state.hasBarista = false;
    if (state.baristaActive === undefined) state.baristaActive = false;
    if (state.plantPayMode === undefined) state.plantPayMode = 'money';
    if (state.plantPayMode !== 'beans' && state.plantPayMode !== 'money') state.plantPayMode = 'money';
    if (!state.activityLog) state.activityLog = [];
    while (state.activityLog.length > 50) state.activityLog.shift();
    /* --- Récolte hors-ligne : calculer ce qui a mûri pendant l'absence --- */
    var _offlineElapsed = Math.max(0, Date.now() - (state.lastSaveTime || Date.now()));
    if (_offlineElapsed > 30000) {
      var _readyPlots = [];
      var _totalReadyBeans = 0;
      var _now = Date.now();
      for (var _opi = 0; _opi < state.parcelles.length; _opi++) {
        for (var _opp = 0; _opp < state.parcelles[_opi].plots.length; _opp++) {
          var _oplot = state.parcelles[_opi].plots[_opp];
          if (_oplot && (_now - _oplot.plantedAt >= _oplot.growDuration)) {
            _readyPlots.push({ parcelle: _opi + 1, slot: _opp + 1, yieldAmount: _oplot.yieldAmount });
            _totalReadyBeans += _oplot.yieldAmount;
          }
        }
      }
      if (_readyPlots.length > 0) {
        offlineHarvestData = { elapsed: _offlineElapsed, plots: _readyPlots, totalBeans: _totalReadyBeans };
      }
    }
    /* Fin récolte hors-ligne — les timestamps réels sont conservés, la pousse continue naturellement */
    var now = Date.now();
    state.activeOrders = state.activeOrders.filter(function(o) { return now - o.startTime < o.prepDuration + 30000; });
    if (!state.urgentOffers) state.urgentOffers = [];
    if (state.urgentOfferTimer === undefined) state.urgentOfferTimer = 30000;
    if (state.lastUrgentGenTime === undefined) state.lastUrgentGenTime = Date.now();
    if (state.grainBoostTimer === undefined) state.grainBoostTimer = 0;
    if (state.grainBoostCd === undefined) state.grainBoostCd = 0;
    if (state.milkDropTimer === undefined) state.milkDropTimer = 0;
    if (state.milkDropCd === undefined) state.milkDropCd = 0;
    if (state.adTimer === undefined) state.adTimer = 0;
    if (state.adCd === undefined) state.adCd = 0;
    if (state.urgentOffersPaused === undefined) state.urgentOffersPaused = false;
    if (state.urgentOffersPaused) state.urgentOffersPaused = false;
    _urgentPauseStart = 0;
    _urgentTotalPausedMs = 0;
    var loadNow = Date.now();
    state.urgentOffers = state.urgentOffers.filter(function(o) {
      return loadNow - o.createdAt < o.duration;
    });
    _nextUrgentOfferId = 1;
    for (var uo = 0; uo < state.urgentOffers.length; uo++) {
      if (state.urgentOffers[uo].id >= _nextUrgentOfferId) _nextUrgentOfferId = state.urgentOffers[uo].id + 1;
    }
    state.customers = [];
    state.spawnTimer = 4000;
    state.sellerCooldowns = { local: 0, corporate: 0, supermarket: 0, export: 0 };
    state.priceChangeTimer = 8000;
  } catch (e) { console.warn('Erreur de chargement:', e); }
}

/* ===================================================
   MODALS — Paramètres, Aide, Reset
   =================================================== */

function openModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  // Insérer le backdrop s'il n'existe pas
  if (!el.querySelector('.modal-backdrop')) {
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.addEventListener('click', function() { closeModal(id); });
    el.insertBefore(bd, el.firstChild);
  }
  el.classList.add('visible');
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

function doResetGame() {
  closeModal('reset-overlay');
  closeModal('settings-overlay');
  state = createFreshState();
  localStorage.removeItem('coffeeTycoonSave');
  invalidateAllUI();
  document.getElementById('sellers-grid').innerHTML = '';
  document.getElementById('upgrades-grid').innerHTML = '';
  document.getElementById('recipes-info').innerHTML = '';
  document.getElementById('plant-purchases-grid').innerHTML = '';
  document.getElementById('achievements-content').innerHTML = '';
  initPlots();
  updateUI();
  showToast('Partie réinitialisée. Bonne chance !', 'info');
}

/* ===================================================
   TOASTS
   =================================================== */

function showToast(message, type) {
  type = type || 'info';
  if (type === 'success' || type === 'info' || type === 'warning') return;
  var c = document.getElementById('toast-container');
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = message;
  c.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, 3200);
}

/* ===================================================
   JOURNAL D'ACTIVITÉ (Dashboard)
   =================================================== */

var _dashboardLogBuilt = false;
var _lastGardenerLogTime = 0;

function logEvent(message, type) {
  type = type || 'info';
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var s = String(now.getSeconds()).padStart(2, '0');
  var entry = { time: h + ':' + m + ':' + s, message: message, type: type };
  state.activityLog.push(entry);
  if (state.activityLog.length > 50) state.activityLog.shift();
  if (currentTab === 'dashboard') appendLogEntry(entry);
}

function renderActivityLog() {
  var container = document.getElementById('activity-log-content');
  var emptyEl = document.getElementById('log-empty');
  if (!container) return;
  if (emptyEl) emptyEl.remove();
  /* Vider et reconstruire */
  var children = container.querySelectorAll('.log-entry');
  for (var i = 0; i < children.length; i++) children[i].remove();
  for (var j = 0; j < state.activityLog.length; j++) {
    appendLogEntry(state.activityLog[j], false);
  }
  container.scrollTop = container.scrollHeight;
  var countEl = document.getElementById('log-count');
  if (countEl) countEl.textContent = state.activityLog.length + ' entr\u00e9e' + (state.activityLog.length !== 1 ? 's' : '');
}

function appendLogEntry(entry, doScroll) {
  if (doScroll === undefined) doScroll = true;
  var container = document.getElementById('activity-log-content');
  if (!container) return;
  var emptyEl = document.getElementById('log-empty');
  if (emptyEl) emptyEl.remove();
  var div = document.createElement('div');
  div.className = 'log-entry log-' + entry.type;
  div.innerHTML = '<span class="log-time">[' + entry.time + ']</span><span class="log-dot"></span><span class="log-msg">' + entry.message + '</span>';
  container.appendChild(div);
  if (doScroll) container.scrollTop = container.scrollHeight;
  var countEl = document.getElementById('log-count');
  if (countEl) countEl.textContent = state.activityLog.length + ' entr\u00e9e' + (state.activityLog.length !== 1 ? 's' : '');
}

/* ===================================================
   PLANTATION
   =================================================== */

function initPlots() {
  var grid = document.getElementById('plots-grid');
  grid.innerHTML = '';
  var slots = getSlots();
  for (var i = 0; i < slots; i++) {
    var div = document.createElement('div');
    div.className = 'plot-card empty';
    div.id = 'plot-' + i;
    grid.appendChild(div);
  }
}

function plantPlot(index) {
  var plots = getPlots();
  if (plots[index]) return;
  var cost = getPlantCost();
  if (cost.type === 'beans') {
    if (state.rawBeans < cost.beans) { showToast('Pas assez de grains pour planter ! (' + cost.beans + ' requis)', 'error'); return; }
    state.rawBeans -= cost.beans;
  } else {
    if (state.money < cost.money) { showToast('Pas assez d\'argent pour planter !', 'error'); return; }
    state.money -= cost.money;
  }
  plots[index] = { plantedAt: Date.now(), growDuration: getGrowDuration(), yieldAmount: getYieldAmount() };
  showToast('Emplacement ' + (index + 1) + ' planté !', 'success');
  logEvent('Plantation emplacement ' + (index + 1) + ' (' + getPlantCostLabel() + ')', 'success');
}

function harvestPlot(index, e) {
  var plots = getPlots();
  var plot = plots[index];
  if (!plot) return;
  if (Date.now() - plot.plantedAt < plot.growDuration) return;
  state.rawBeans += plot.yieldAmount;
  state.stats.totalHarvested += plot.yieldAmount;
  state.stats.totalHarvestActions++;
  /* Texte flottant positionné exactement au clic */
  if (e) showFloatingText(e.clientX, e.clientY, '+' + plot.yieldAmount);
  var btn = document.getElementById('pbtn-' + index);
  if (btn) popButton(btn);
  plots[index] = null;
  showToast('+' + plot.yieldAmount + ' grains récoltés !', 'success');
  logEvent('Récolte : +' + plot.yieldAmount + ' grains (empl. ' + (index + 1) + ')', 'success');
}

function switchParcelle(idx) {
  if (idx === state.currentParcelle || idx < 0 || idx >= state.parcelles.length) return;
  state.currentParcelle = idx;
  plotStates = [];
  for (var i = 0; i < getSlots(); i++) plotStates.push('init');
  _parcelleNavKey = '';
  _plantPurchKey = '';
  _gardenerKey = '';
  initPlots();
  updateUI();
}

/* ===================================================
   UTILITAIRES CLIENTS / GROUPES
   =================================================== */

function getCustomerOrders(customer) {
  return customer.orders || [customer.orderKey];
}

function getCustomerTotalRequirements(customer) {
  var orders = getCustomerOrders(customer);
  var totalBeans = 0, totalMilk = 0;
  for (var i = 0; i < orders.length; i++) {
    totalBeans += RECIPES[orders[i]].beans;
    totalMilk += RECIPES[orders[i]].milk;
  }
  return { beans: totalBeans, milk: totalMilk };
}

function getConsolidatedOrderName(orders) {
  if (!orders || orders.length === 0) return '???';
  if (orders.length === 1) return RECIPES[orders[0]].name;
  var counts = {};
  for (var i = 0; i < orders.length; i++) {
    var name = RECIPES[orders[i]].name;
    counts[name] = (counts[name] || 0) + 1;
  }
  var parts = [];
  for (var n in counts) {
    parts.push(counts[n] > 1 ? counts[n] + '\u00d7 ' + n : n);
  }
  return parts.join(', ');
}

function refuseCustomer(customerId) {
  var idx = -1;
  for (var i = 0; i < state.customers.length; i++) {
    if (state.customers[i].id === customerId) { idx = i; break; }
  }
  if (idx === -1) return;
  var c = state.customers[idx];
  state.reputation = Math.max(0, state.reputation - 1);
  state.customers.splice(idx, 1);
  updateMaxReputation();
  showToast(c.name + ' refusé(e) ! (-1 rép.)', 'warning');
  logEvent(c.name + ' refusé(e) (-1 rép.)', 'warning');
}

/* ===================================================
   COFFEE SHOP
   =================================================== */

function toggleShop() {
  state.shopOpen = !state.shopOpen;
  if (state.shopOpen) { state.spawnTimer = 3000; showToast('Le café est maintenant ouvert !', 'success'); logEvent('Le café est ouvert', 'info'); }
  else { showToast('Le café est maintenant fermé.', 'info'); logEvent('Le café est fermé', 'info'); }
}

function spawnCustomer() {
  if (state.customers.length >= state.maxQueue) return;

  // Modifié : La chance de groupe augmente avec la réputation (+1% tous les 10 points de rép, max 50%)
  var dynamicGroupChance = Math.min(0.50, 0.12 + (state.reputation / 1000));
  var isGroup = state.reputation >= 20 && Math.random() < dynamicGroupChance;
  
  var name, orders;

  if (isGroup) {
    name = GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
    
    // Modifié : Taille du groupe selon la réputation (Ajout du palier 200+ pour des groupes de 3 à 5)
    var groupSize = 2;
    if (state.reputation >= 200) {
      groupSize = Math.floor(Math.random() * 3) + 3; // Groupes de 3, 4 ou 5 personnes !
    } else if (state.reputation >= 60) {
      groupSize = Math.random() < 0.6 ? 2 : 3;      // Logique d'origine (60% de chance d'être 2, sinon 3)
    } else {
      groupSize = 2;                                 // Logique d'origine si < 60 de réputation
    }

    orders = [];
    for (var g = 0; g < groupSize; g++) {
      var r = Math.random(), ok;
      // Conservation stricte de tes règles d'origine pour les types de boissons
      if (state.reputation < 60) {
        ok = r < 0.3 ? 'espresso' : r < 0.65 ? 'latte' : 'cappuccino';
      } else if (state.reputation < 150) {
        ok = r < 0.15 ? 'espresso' : r < 0.35 ? 'doubleespresso' : r < 0.6 ? 'latte' : r < 0.85 ? 'cappuccino' : 'toncplay';
      } else {
        // Gère aussi automatiquement les réputations >= 200 avec les boissons de fin de jeu
        ok = r < 0.10 ? 'espresso' : r < 0.22 ? 'doubleespresso' : r < 0.42 ? 'latte' : r < 0.68 ? 'cappuccino' : 'toncplay';
      }
      orders.push(ok);
    }
  } else {
    // Client seul (Code d'origine conservé à 100%)
    name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    var r2 = Math.random(), ok2;
    if (state.reputation < 20) ok2 = r2 < 0.55 ? 'espresso' : r2 < 0.8 ? 'latte' : 'cappuccino';
    else if (state.reputation < 60) ok2 = r2 < 0.25 ? 'espresso' : r2 < 0.45 ? 'doubleespresso' : r2 < 0.7 ? 'latte' : 'cappuccino';
    else if (state.reputation < 150) ok2 = r2 < 0.15 ? 'espresso' : r2 < 0.30 ? 'doubleespresso' : r2 < 0.55 ? 'latte' : r2 < 0.80 ? 'cappuccino' : 'toncplay';
    else ok2 = r2 < 0.10 ? 'espresso' : r2 < 0.22 ? 'doubleespresso' : r2 < 0.42 ? 'latte' : r2 < 0.68 ? 'cappuccino' : 'toncplay';
    orders = [ok2];
  }

  // Logique de patience et d'insertion d'origine conservée à 100%
  var extraPatience = isGroup ? 8000 : 0;
  var patience = getPatience() + extraPatience;
  state.customers.push({
    id: state.nextCustomerId++,
    name: name,
    orderKey: isGroup ? null : orders[0],
    orders: isGroup ? orders : null,
    isGroup: isGroup,
    patience: patience,
    maxPatience: patience
  });
}

function prepareOrder(customerId) {
  if (state.activeOrders.length >= state.counterSlots) {
    showToast('Comptoir plein ! (' + state.activeOrders.length + '/' + state.counterSlots + ')', 'warning');
    return;
  }
  var idx = -1;
  for (var i = 0; i < state.customers.length; i++) { if (state.customers[i].id === customerId) { idx = i; break; } }
  if (idx === -1) return;
  var customer = state.customers[idx];
  var orders = getCustomerOrders(customer);
  var totalBeans = 0, totalMilk = 0, totalPrice = 0, totalPrepTime = 0, totalRepGain = 0;
  for (var j = 0; j < orders.length; j++) {
    var recipe = RECIPES[orders[j]];
    totalBeans += recipe.beans;
    totalMilk += recipe.milk;
    totalPrice += getSellPrice(orders[j]);
    totalPrepTime += getPrepDuration(orders[j]);
    totalRepGain += recipe.repGain;
  }
  if (state.rawBeans < totalBeans) { showToast('Pas assez de grains ! (' + totalBeans + ' requis)', 'error'); logEvent('Préparation impossible : pas assez de grains', 'warning'); return; }
  if (state.milk < totalMilk) { showToast('Pas assez de lait ! (' + totalMilk + ' requis)', 'error'); logEvent('Préparation impossible : pas assez de lait', 'warning'); return; }  if (state.milk < totalMilk) { showToast('Pas assez de lait ! (' + totalMilk + ' requis)', 'error'); logEvent('Préparation impossible : pas assez de lait', 'warning'); return; }
  state.rawBeans -= totalBeans;
  state.milk -= totalMilk;
  state.customers.splice(idx, 1);
  /* Efficacité groupe : 75% du temps cumulé, prix à 90% */
  var batchMult = customer.isGroup ? 0.75 : 1;
  var priceMult = customer.isGroup ? 0.9 : 1;
  state.activeOrders.push({
    customerId: customer.id,
    name: customer.name,
    orderKey: customer.orderKey,
    orders: customer.orders,
    isGroup: customer.isGroup,
    orderName: getConsolidatedOrderName(orders),
    startTime: Date.now(),
    prepDuration: Math.ceil(totalPrepTime * batchMult),
    price: Math.floor(totalPrice * priceMult),
    totalRepGain: totalRepGain
  });
}

function serveOrder(orderIndex) {
  if (orderIndex < 0 || orderIndex >= state.activeOrders.length) return;
  var order = state.activeOrders[orderIndex];
  if (Date.now() - order.startTime < order.prepDuration) return;
  state.money += order.price;
  var repGain = order.totalRepGain;
  state.reputation += repGain;
  state.stats.totalServed++;
  state.stats.totalEarned += order.price;
  updateMaxReputation();
  var btn = document.querySelector('#counter-content .counter-slot.ready .btn');
  if (btn) {
    spawnParticle('+' + order.price + '$', 'money', btn);
    setTimeout(function() { spawnParticle('+' + repGain + ' r\u00e9p.', 'rep', btn); }, 150);
    popButton(btn);
  }
  showToast(order.name + ' servi(e) : ' + order.orderName + ' +' + order.price + '$ (+' + repGain + ' rép.)', 'success');
  logEvent(order.name + ' servi(e) : ' + order.orderName + ' → +' + order.price + '$, +' + repGain + ' rép.', 'money');
  state.activeOrders.splice(orderIndex, 1);
}

function updateGardeners() {
  var now = Date.now();
  for (var pi = 0; pi < state.parcelles.length; pi++) {
    var p = state.parcelles[pi];
    if (!p.gardenerActive) continue;

    for (var i = 0; i < p.plots.length; i++) {
      var plot = p.plots[i];
      
      if (!plot) {
        var gc = getGardenerPlantCost();
        var canAfford = state.rawBeans >= gc.beans && state.money >= gc.money;
        if (canAfford) {
          state.rawBeans -= gc.beans;
          state.money -= gc.money;
          p.plots[i] = { plantedAt: now, growDuration: getGrowDuration(), yieldAmount: getYieldAmount() };
        }
      } else if (now - plot.plantedAt >= plot.growDuration) {
        // Si la plante est prête, on récolte
        state.rawBeans += plot.yieldAmount;
        state.stats.totalHarvested += plot.yieldAmount;
        state.stats.totalHarvestActions++;
        if (now - _lastGardenerLogTime > 8000) {
          logEvent('Jardinier P' + (pi + 1) + ' : +' + plot.yieldAmount + ' grains', 'success');
          _lastGardenerLogTime = now;
        }
        p.plots[i] = null; // Devient vide, sera replanté au prochain tour de boucle si l'argent le permet
      }
    }
  }
}

function baristaBuyMilk() {
  var currentMilkPrice = state.milkDropTimer > 0 ? MILK_PRICE_MIN : state.milkMarketPrice;
  var cost = Math.ceil(currentMilkPrice * MILK_AMOUNT);
  if (state.money < cost) return false;
  state.money -= cost;
  state.milk += MILK_AMOUNT;
  showToast('<i class="fas fa-mug-hot"></i> Barista : +' + MILK_AMOUNT + ' lait acheté (' + cost + '$)', 'info');
  logEvent('Barista : achat auto de ' + MILK_AMOUNT + ' lait (' + cost + '$)', 'info');
  return true;
}

function updateBaristas() {
  if (!state.hasBarista || !state.baristaActive) return;

  /* A) ENCAISSEMENT AUTOMATIQUE — parcourir à l'envers pour garder les index valides */
  for (var i = state.activeOrders.length - 1; i >= 0; i--) {
    var o = state.activeOrders[i];
    if (Date.now() - o.startTime >= o.prepDuration) {
      serveOrder(i);
    }
  }

  /* B) PRÉPARATION AUTOMATIQUE — un seul client par frame pour rester lisible */
  if (state.activeOrders.length < state.counterSlots && state.customers.length > 0) {
    var firstCustomer = state.customers[0];
    var req = getCustomerTotalRequirements(firstCustomer);
    /* Si le client demande du lait mais le stock est insuffisant, le barista achète du lait */
    if (req.milk > 0 && state.milk < req.milk) {
      baristaBuyMilk();
    }
    /* Re-vérifier après l'achat éventuel, puis préparer */
    if (state.rawBeans >= req.beans && state.milk >= req.milk && state.money >= BARISTA_PREP_COST) {
      state.money -= BARISTA_PREP_COST;
      prepareOrder(firstCustomer.id);
    }
  }
}

function updateCustomers(dt) {
  for (var i = state.customers.length - 1; i >= 0; i--) {
    state.customers[i].patience -= dt;
    if (state.customers[i].patience <= 0) {
      var c = state.customers[i];
      if (state.shopOpen) { state.reputation = Math.max(0, state.reputation - 3); showToast(c.name + ' est parti(e) : file d\'attente trop longue ! (-3 rép.)', 'warning'); logEvent(c.name + ' a quitté la file d\'attente (-3 rép.)', 'danger'); }
      else { showToast(c.name + ' est parti(e) (caf\u00e9 ferm\u00e9).', 'info'); }
      state.customers.splice(i, 1);
    }
  }
  for (var j = state.activeOrders.length - 1; j >= 0; j--) {
    var o = state.activeOrders[j];
    if (Date.now() - o.startTime > o.prepDuration + 30000) {
      state.reputation = Math.max(0, state.reputation - 5);
      showToast('Commande de ' + o.name + ' abandonn\u00e9e au comptoir ! (-5 rép.)', 'error');
      logEvent('Commande de ' + o.name + ' abandonnée au comptoir (-5 rép.)', 'danger');
      state.activeOrders.splice(j, 1);
    }
  }
  updateMaxReputation();
  if (state.shopOpen) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.customers.length < state.maxQueue) spawnCustomer();
      state.spawnTimer = getSpawnInterval();
    }
  }
}

/* ===================================================
   BESOINS URGENTS
   =================================================== */

function generateUrgentOffer() {
  if (state.urgentOffers.length >= URGENT_OFFER_MAX_ACTIVE) return;
  var sellerIds = Object.keys(SELLERS);
  var available = sellerIds.filter(function(sid) {
    return !state.urgentOffers.some(function(o) { return o.sellerId === sid; });
  });
  if (available.length === 0) return;
  var sellerId = available[Math.floor(Math.random() * available.length)];
  var uCfg = SELLERS[sellerId].urgent;
  var beansRequired = uCfg.minBeans + Math.floor(Math.random() * (uCfg.maxBeans - uCfg.minBeans + 1));
  var bonusPerBean = uCfg.bonusMin + Math.random() * (uCfg.bonusMax - uCfg.bonusMin);
  var bonusReward = Math.floor(beansRequired * bonusPerBean);
  var duration = uCfg.minDuration + Math.floor(Math.random() * (uCfg.maxDuration - uCfg.minDuration));
  state.urgentOffers.push({
    id: _nextUrgentOfferId++,
    sellerId: sellerId,
    beansRequired: beansRequired,
    bonusReward: bonusReward,
    duration: duration,
    createdAt: Date.now()
  });
  state.lastUrgentGenTime = Date.now();
  _urgentStates = {};
  showToast('<i class="fas fa-bolt"></i> Besoin urgent chez ' + SELLERS[sellerId].name + ' : ' + beansRequired + ' grains pour ' + formatNumber(bonusReward) + '$ !', 'warning');
}

function deliverUrgentOffer(offerId) {
  var idx = -1;
  for (var i = 0; i < state.urgentOffers.length; i++) {
    if (state.urgentOffers[i].id === offerId) { idx = i; break; }
  }
  if (idx === -1) return;
  var offer = state.urgentOffers[idx];
  if (state.rawBeans < offer.beansRequired) {
    showToast('Pas assez de grains ! (' + offer.beansRequired + ' requis)', 'error');
    return;
  }
  state.rawBeans -= offer.beansRequired;
  state.money += offer.bonusReward;
  state.stats.totalSold += offer.beansRequired;
  state.stats.totalEarned += offer.bonusReward;
  state.urgentOffers.splice(idx, 1);
  _urgentStates = {};
  _sellerStates = {};
  showToast('<i class="fas fa-truck-fast"></i> ' + offer.beansRequired + ' grains livrés : +' + formatNumber(offer.bonusReward) + '$ bonus !', 'success');
  logEvent('Livraison urgente : ' + offer.beansRequired + ' grains → +' + formatNumber(offer.bonusReward) + '$ bonus', 'money');
}

/* ===================================================
   SUSPENSION DES BESOINS URGENTS
   =================================================== */

function toggleUrgentOffers() {
  state.urgentOffersPaused = !state.urgentOffersPaused;
  if (state.urgentOffersPaused) {
    _urgentPauseStart = Date.now();
    showToast('<i class="fas fa-pause-circle"></i> Besoins urgents suspendus.', 'info');
  } else {
    if (_urgentPauseStart > 0) {
      _urgentTotalPausedMs += Date.now() - _urgentPauseStart;
      _urgentPauseStart = 0;
    }
    showToast('<i class="fas fa-play-circle"></i> Besoins urgents repris.', 'success');
  }
}

/* ===================================================
   COMMERCE
   =================================================== */

function sellToMerchant(sellerId) {
  var seller = SELLERS[sellerId];
  if (!seller || state.sellerCooldowns[sellerId] > 0 || state.rawBeans <= 0) {
    if (state.rawBeans <= 0) showToast('Aucun grain à vendre !', 'error');
    return;
  }
  var amount = Math.min(seller.quota, state.rawBeans);
  var effectiveSellPrice = state.marketPrice * (state.grainBoostTimer > 0 ? GRAIN_BOOST_MULT : 1);
  var total = Math.floor(amount * effectiveSellPrice * seller.priceMult);
  state.rawBeans -= amount;
  state.money += total;
  state.sellerCooldowns[sellerId] = seller.cooldown;
  state.stats.totalSold += amount;
  state.stats.totalEarned += total;
  showToast(amount + ' grains vendus à ' + seller.name + ' : +' + total + '$', 'success');
  logEvent('Vente : ' + amount + ' grains à ' + seller.name + ' → +' + total + '$', 'money');
}

function updateCommerce(dt) {
  for (var id in state.sellerCooldowns) { if (state.sellerCooldowns[id] > 0) state.sellerCooldowns[id] = Math.max(0, state.sellerCooldowns[id] - dt); }
  state.priceChangeTimer -= dt;
  if (state.priceChangeTimer <= 0) {
  state.previousPrice = state.marketPrice;
  var grainDelta = (Math.random() - 0.52) * 0.8;
  if (Math.random() < GRAIN_PRICE_SPIKE_CHANCE) {
    grainDelta += GRAIN_PRICE_SPIKE_MIN + Math.random() * (GRAIN_PRICE_SPIKE_MAX - GRAIN_PRICE_SPIKE_MIN);
  }
  state.marketPrice = Math.max(1.50, Math.min(10.00, state.marketPrice + grainDelta));
  state.priceChangeTimer = PRICE_CHANGE_MIN + Math.random() * (PRICE_CHANGE_MAX - PRICE_CHANGE_MIN);
  state.priceHistory.beans.push(state.marketPrice * (state.grainBoostTimer > 0 ? GRAIN_BOOST_MULT : 1));
  }
  /* Fluctuation du prix du lait */
  state.milkPriceChangeTimer -= dt;
  if (state.milkPriceChangeTimer <= 0) {
  state.milkPreviousPrice = state.milkMarketPrice;
  var milkDelta = (Math.random() - 0.52) * 0.6;
  if (Math.random() < MILK_PRICE_SPIKE_CHANCE) {
    milkDelta += MILK_PRICE_SPIKE_MIN + Math.random() * (MILK_PRICE_SPIKE_MAX - MILK_PRICE_SPIKE_MIN);
  }
  state.milkMarketPrice = Math.max(MILK_PRICE_MIN, Math.min(8.00, state.milkMarketPrice + milkDelta));
  state.milkPriceChangeTimer = MILK_PRICE_CHANGE_MIN + Math.random() * (MILK_PRICE_CHANGE_MAX - MILK_PRICE_CHANGE_MIN);
  state.priceHistory.milk.push(state.milkDropTimer > 0 ? MILK_PRICE_MIN : state.milkMarketPrice);
  }

  /* Enregistrer l'historique (toutes les ~5s de fluctuation, une entrée est ajoutée) */
  if (state.priceHistory.beans.length > 150) state.priceHistory.beans.shift();
  if (state.priceHistory.milk.length > 150) state.priceHistory.milk.shift();
  /* Timers manipulations de marché */
  var _prevGrainBoost = state.grainBoostTimer;
  var _prevMilkDrop = state.milkDropTimer;
  if (state.grainBoostTimer > 0) state.grainBoostTimer = Math.max(0, state.grainBoostTimer - dt);
  if (state.grainBoostCd > 0) state.grainBoostCd = Math.max(0, state.grainBoostCd - dt);
  if (state.milkDropTimer > 0) state.milkDropTimer = Math.max(0, state.milkDropTimer - dt);
  if (state.milkDropCd > 0) state.milkDropCd = Math.max(0, state.milkDropCd - dt);
  if (state.adTimer > 0) state.adTimer = Math.max(0, state.adTimer - dt);
  if (state.adCd > 0) state.adCd = Math.max(0, state.adCd - dt);
  if (_prevGrainBoost > 0 && state.grainBoostTimer === 0) {
    state.priceHistory.beans.push(state.marketPrice);
    _lastChartKey = '';
  }
  if (_prevMilkDrop > 0 && state.milkDropTimer === 0) {
    state.priceHistory.milk.push(state.milkMarketPrice);
    _lastChartKey = '';
  }
  
  /* Besoins urgents : gelés si suspendus */
  if (!state.urgentOffersPaused) {
    state.urgentOfferTimer -= dt;
    if (state.urgentOfferTimer <= 0) {
      var timeSinceGen = Date.now() - (state.lastUrgentGenTime || 0) - _urgentTotalPausedMs;
      var chance = Math.min(0.85, Math.max(0, 0.3 + (timeSinceGen - 30000) / 10000 * 0.1));
      if (Math.random() < chance) generateUrgentOffer();
      state.urgentOfferTimer = URGENT_OFFER_CHECK_INTERVAL;
    }
    var uoBefore = state.urgentOffers.length;
    var uoNow = Date.now();
    state.urgentOffers = state.urgentOffers.filter(function(o) {
      if (uoNow - o.createdAt - _urgentTotalPausedMs >= o.duration) {
        showToast('Le besoin urgent chez ' + SELLERS[o.sellerId].name + ' a expiré.', 'warning');
        logEvent('Besoin urgent expiré chez ' + SELLERS[o.sellerId].name, 'warning');
        return false;
      }
      return true;
    });
    if (state.urgentOffers.length !== uoBefore) { _urgentStates = {}; _sellerStates = {}; }
  }
}

var priceChart = null;
var _chartBuilt = false;
var _lastChartKey = '';

function initPriceChart() {
  if (_chartBuilt) return;
  _chartBuilt = true;

  var ctx = document.getElementById('price-chart');
  if (!ctx) return;

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Grain',
          data: [],
          borderColor: '#6b9e50',
          backgroundColor: 'rgba(107,158,80,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#6b9e50',  // pour le dataset grain
          pointHoverBackgroundColor: '#fff'
        },
        {
          label: 'Lait',
          data: [],
          borderColor: '#7ab8e0',
          backgroundColor: 'rgba(122,184,224,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#7ab8e0',
          pointHoverBackgroundColor: '#fff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2e2018',
          titleColor: '#f0e0d0',
          bodyColor: '#c0a890',
          borderColor: '#3d2e22',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ' : ' + ctx.parsed.y.toFixed(2) + '$'; }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            color: '#7a6454',
            font: { size: 9, family: 'DM Sans' },
            maxTicksLimit: 12,
            maxRotation: 0
          }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#7a6454',
            font: { size: 11, family: 'DM Sans' },
            callback: function(val) { return val.toFixed(1) + '$'; }
          },
          min: 0.5,
          suggestedMax: 11
        }
      },
      animation: { duration: 300 }
    }
  });
}

function updatePriceChart() {
  if (!priceChart) return;
  var bh = state.priceHistory.beans;
  var mh = state.priceHistory.milk;
  /* Ne mettre à jour QUE si les données ont changé (nouveau point ajouté) */
  var key = bh.length + '|' + mh.length + '|' + (bh[bh.length - 1] || '') + '|' + (mh[mh.length - 1] || '');
  if (key === _lastChartKey) return;
  _lastChartKey = key;

  var len = Math.max(bh.length, mh.length);
  var labels = [];
  for (var i = 0; i < len; i++) labels.push('');

  priceChart.data.labels = labels;
  priceChart.data.datasets[0].data = bh.slice();
  priceChart.data.datasets[1].data = mh.slice();
  priceChart.update();
}

/* ===================================================
   MAGASIN
   =================================================== */

function buyMilk() {
  var currentMilkPrice = state.milkDropTimer > 0 ? MILK_PRICE_MIN : state.milkMarketPrice;
  var cost = Math.ceil(currentMilkPrice * MILK_AMOUNT);
  if (state.money < cost) { showToast('Pas assez d\'argent ! (' + cost + '$)', 'error'); return; }
  state.money -= cost;
  state.milk += MILK_AMOUNT;
  showToast('+' + MILK_AMOUNT + ' unités de lait achetées pour ' + cost + '$.', 'success');
  logEvent('Achat : +' + MILK_AMOUNT + ' lait pour ' + cost + '$', 'money');
}

function buyPlotSlot() {
  var idx = state.currentParcelle, p = state.parcelles[idx];
  if (p.slots >= MAX_SLOTS_PER_PARCELLE) return;
  var cost = getSlotCost(idx);
  if (state.money < cost) { showToast('Pas assez d\'argent !', 'error'); return; }
  state.money -= cost; p.slots++; p.plots.push(null);
  showToast('Emplacement ajouté à la parcelle ' + (idx + 1) + ' !', 'success');
  logEvent('Nouvel emplacement ajouté (Parcelle ' + (idx + 1) + ')', 'success');
  plotStates.push('init'); initPlots(); _plantPurchKey = ''; updateUI();
}

function getGardenerCost(pIdx) {
  // Le prix est le double du prix d'achat de la parcelle concernée
  if (pIdx >= PARCELLE_COSTS.length) return Infinity;
  return PARCELLE_COSTS[pIdx] * 2;
}

function buyGardener(pIdx) {
  var p = state.parcelles[pIdx];
  if (p.hasGardener) return;
  var cost = getGardenerCost(pIdx);
  if (state.money < cost) { showToast('Pas assez d\'argent pour engager un jardinier !', 'error'); return; }
  state.money -= cost;
  p.hasGardener = true;
  p.gardenerActive = true;
  _gardenerKey = '';
  showToast('Jardinier embauché pour la Parcelle ' + (pIdx + 1) + ' !', 'success');
  logEvent('Jardinier embauché pour la Parcelle ' + (pIdx + 1), 'success');
}

function buyParcelle() {
  if (state.parcelles.length >= MAX_PARCELLES) return;
  var cost = getParcelleCost();
  if (state.money < cost) { showToast('Pas assez d\'argent !', 'error'); return; }
  state.money -= cost;
  state.parcelles.push({ slots: 2, plots: [null, null], hasGardener: false, gardenerActive: false });
  state.currentParcelle = state.parcelles.length - 1;
  showToast('Nouvelle parcelle achetée !', 'success');
  logEvent('Nouvelle parcelle achetée (Parcelle ' + state.parcelles.length + ')', 'success');
  plotStates = ['init', 'init']; _parcelleNavKey = ''; _plantPurchKey = ''; initPlots(); updateUI();
}

function buyUpgrade(id) {
  var ug = UPGRADES[id];
  if (!ug) return;
  var level = state.upgrades[id];
  if (level >= ug.maxLevel) return;
  var cost = ug.costs[level];
  if (state.money < cost) { showToast('Pas assez d\'argent ! (' + cost + '$)', 'error'); return; }
  state.money -= cost;
  state.upgrades[id]++;
  if (id === 'counter') { state.counterSlots = Math.min(BASE_COUNTER_SLOTS + state.upgrades.counter, MAX_COUNTER_SLOTS); _counterKey = ''; }
  if (id === 'queue') { state.maxQueue = Math.min(BASE_QUEUE_SIZE + state.upgrades.queue * 2, MAX_QUEUE_SIZE); _lastQueueKey = ''; }
  var msgs = {
    fertilizer: 'Engrais niv.' + state.upgrades[id] + ' : pousse plus rapide !',
    research: 'Recherche niv.' + state.upgrades[id] + ' : meilleur rendement !',
    machine: 'Machine niv.' + state.upgrades[id] + ' : préparation plus rapide !',
    variety: 'Variété niv.' + state.upgrades[id] + ' : prix augmentés !',
    counter: 'Comptoir élargi : ' + state.counterSlots + '/' + MAX_COUNTER_SLOTS + ' places !',
    queue: 'File agrandie : ' + state.maxQueue + '/' + MAX_QUEUE_SIZE + ' places !'
  };
  showToast(msgs[id], 'success');
}

/* ===================================================
   MANIPULATIONS DE MARCHÉ
   =================================================== */

function buyGrainBoost() {
  if (state.grainBoostCd > 0 || state.grainBoostTimer > 0) return;
  if (state.money < GRAIN_BOOST_COST) { showToast('Pas assez d\'argent ! (' + GRAIN_BOOST_COST + '$)', 'error'); return; }
  state.money -= GRAIN_BOOST_COST;
  state.grainBoostTimer = GRAIN_BOOST_DURATION;
  state.grainBoostCd = GRAIN_BOOST_CD + GRAIN_BOOST_DURATION;
  state.priceHistory.beans.push(state.marketPrice * GRAIN_BOOST_MULT);
  _lastChartKey = '';
  _manipBuilt = false;
  showToast('<i class="fas fa-arrow-trend-up"></i> Cours du grain boosté de +80% !', 'success');
  logEvent('Cours du grain boosté de +80% pendant 45s', 'money');
}

function buyMilkDrop() {
  if (state.milkDropCd > 0 || state.milkDropTimer > 0) return;
  if (state.money < MILK_DROP_COST) { showToast('Pas assez d\'argent ! (' + MILK_DROP_COST + '$)', 'error'); return; }
  state.money -= MILK_DROP_COST;
  state.milkDropTimer = MILK_DROP_DURATION;
  state.milkDropCd = MILK_DROP_CD + MILK_DROP_DURATION;
  state.priceHistory.milk.push(MILK_PRICE_MIN);
  _lastChartKey = '';
  _manipBuilt = false;
  showToast('<i class="fas fa-arrow-trend-down"></i> Prix du lait au minimum !', 'success');
  logEvent('Prix du lait réduit au minimum pendant 60s', 'money');
}

function buyAd() {
  if (state.adCd > 0 || state.adTimer > 0) return;
  if (state.money < AD_COST) { showToast('Pas assez d\'argent ! (' + AD_COST + '$)', 'error'); return; }
  state.money -= AD_COST;
  state.adTimer = AD_DURATION;
  state.adCd = AD_CD + AD_DURATION;
  _manipBuilt = false;
  showToast('<i class="fas fa-bullhorn"></i> Campagne publicitaire lancée !', 'success');
  logEvent('Campagne pub lancée : clients +40% plus rapides pendant 60s', 'money');
}

/* ===================================================
   MISE À JOUR INTERFACE (DIFFÉRENTIELLE)
   =================================================== */

var plotStates = [];
var _counterKey = '';
var _lastQueueKey = '';
var _sellerStates = {};
var _upgradeLevels = {};
var _recipesRendered = false;
var _sellersBuilt = false;
var _upgradesBuilt = false;
var _parcelleNavKey = '';
var _plantPurchKey = '';
var _repTierKey = '';

function invalidateAllUI() {
  _chartBuilt = false;
  if (priceChart) { priceChart.destroy(); priceChart = null; }
  _lastChartKey = '';
  _sellersBuilt = false; _upgradesBuilt = false; _recipesRendered = false;
  _plantPurchKey = ''; _parcelleNavKey = ''; _counterKey = ''; _lastQueueKey = '';
  _sellerStates = {}; _upgradeLevels = {}; _achievementsBuilt = false; _repTierKey = '';
  _gardenerKey = '';
  _plantModeKey = '';
  _baristaKey = '';
  _baristaPurchKey = '';
  _manipBuilt = false;
  _manipStates = {};
  _urgentStates = {};
  plotStates = [];
  _dashboardLogBuilt = false;
  for (var i = 0; i < getSlots(); i++) plotStates.push('init');
}

function updateDashboard() {
  document.getElementById('dash-money').textContent = formatNumber(state.money) + '$';
  document.getElementById('dash-beans').textContent = formatNumber(state.rawBeans);
  document.getElementById('dash-milk').textContent = formatNumber(state.milk);
  document.getElementById('dash-rep').textContent = formatNumber(state.reputation);
  var tier = getCurrentRepTier(), next = getNextRepTier();
  document.getElementById('dash-tier').textContent = tier.label;
  document.getElementById('dash-next-tier').textContent = next ? next.min + ' r\u00e9p.' : 'MAX';
  document.getElementById('dash-served').textContent = formatNumber(state.stats.totalServed);
  document.getElementById('dash-harvested').textContent = formatNumber(state.stats.totalHarvested);
  document.getElementById('dash-earned').textContent = formatNumber(state.stats.totalEarned) + '$';
  document.getElementById('dash-sold').textContent = formatNumber(state.stats.totalSold);
  document.getElementById('dash-achievements').textContent = getAchievementCount() + '/' + ACHIEVEMENTS.length;
  if (!_dashboardLogBuilt) { renderActivityLog(); _dashboardLogBuilt = true; }
}

function updateUI() {
  updateHeader();
  updateShopToggle();
  if (currentTab === 'dashboard') updateDashboard();
  if (currentTab === 'plantation') { updatePlantModeUI(); updatePlantationNav(); updatePlantationInfo(); updateGardenerUI(); updatePlantation(); }
  if (currentTab === 'coffeeshop') { updateRepTierBar(); updateBaristaUI(); updateCoffeeShop(); }
  if (currentTab === 'commerce') updateCommerceUI();
  if (currentTab === 'magasin') { updatePlantPurchases(); updateBaristaPurchaseUI(); updateMagasinUI(); updateMilkPriceDisplay(); }
  if (currentTab === 'succes') { if (!_achievementsBuilt) renderAchievementsUI(); else lightUpdateAchievementsCount(); }
  updateCommerceBadge();
}

function updateHeader() {
  document.getElementById('stat-money').textContent = formatNumber(state.money);
  document.getElementById('stat-beans').textContent = formatNumber(state.rawBeans);
  document.getElementById('stat-milk').textContent = formatNumber(state.milk);
  document.getElementById('stat-rep').textContent = formatNumber(state.reputation);
}

function updateShopToggle() {
  var dot = document.getElementById('shop-dot'), label = document.getElementById('shop-label'), btn = document.getElementById('shop-toggle-btn');
  if (state.shopOpen) { dot.className = 'shop-dot'; label.textContent = 'Ouvert'; label.style.color = 'var(--success)'; btn.textContent = 'Fermer le café'; btn.className = 'btn btn-sm btn-toggle-close'; }
  else { dot.className = 'shop-dot closed'; label.textContent = 'Fermé'; label.style.color = 'var(--danger)'; btn.textContent = 'Ouvrir le café'; btn.className = 'btn btn-sm btn-toggle-open'; }
}

/* ===================== PLANTATION ===================== */

var _gardenerKey = '';

function updatePlantationNav() {
  var key = state.parcelles.length + '_' + state.currentParcelle;
  if (key === _parcelleNavKey) return; _parcelleNavKey = key;
  var nav = document.getElementById('parcelle-nav');
  if (state.parcelles.length <= 1) { nav.innerHTML = ''; return; }
  var html = '<span class="parcelle-nav-label">Parcelles :</span>';
  for (var i = 0; i < state.parcelles.length; i++) html += '<button class="parcelle-tab' + (i === state.currentParcelle ? ' active' : '') + '" id="ptab-' + i + '">Parcelle ' + (i + 1) + '</button>';
  nav.innerHTML = html;
  for (var j = 0; j < state.parcelles.length; j++) { (function(idx) { var tab = document.getElementById('ptab-' + idx); if (tab) tab.addEventListener('click', function() { switchParcelle(idx); }); })(j); }
}

function updatePlantationInfo() {
  var p = state.parcelles[state.currentParcelle];
  document.getElementById('parcelle-info').textContent = 'Parcelle ' + (state.currentParcelle + 1) + ' \u2014 ' + p.slots + '/' + MAX_SLOTS_PER_PARCELLE + ' emplacements';
}

function updateGardenerUI() {
  var p = state.parcelles[state.currentParcelle];
  var key = !p.hasGardener ? 'buy' : (p.gardenerActive ? 'active' : 'paused');
  var el = document.getElementById('gardener-container');
  if (!el) return;

  if (_gardenerKey !== key) {
    _gardenerKey = key;
    if (!p.hasGardener) {
      var cost = getGardenerCost(state.currentParcelle);
      el.innerHTML = '<div class="resource-card">' +
        '<div class="resource-icon" style="background:rgba(56,189,248,0.15);color:#38bdf8;"><i class="fas fa-person-digging"></i></div>' +
        '<div class="resource-info"><h4>Engager un jardinier</h4><p>Récolte et replante automatiquement (Coût : ' + getPlantCostLabel() + (state.plantPayMode === 'beans' ? ' + ' + GARDENER_BEANS_SALARY + '$' : '') + ')</p><span class="resource-price">' + formatNumber(cost) + '$</span></div>' +
        '<button class="btn btn-accent" id="buy-gardener-btn">Engager</button></div>';
      var btn = document.getElementById('buy-gardener-btn');
      if (btn) {
        btn.addEventListener('click', function() { buyGardener(state.currentParcelle); });
        if (state.money < cost) btn.disabled = true;
      }
    } else if (p.gardenerActive) {
      el.innerHTML = '<div class="resource-card" style="border-color:var(--success);">' +
        '<div class="resource-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;"><i class="fas fa-person-digging"></i></div>' +
        '<div class="resource-info"><h4>Jardinier Actif</h4><p>Coût/plantation : ' + getPlantCostLabel() + (state.plantPayMode === 'beans' ? ' + ' + GARDENER_BEANS_SALARY + '$ salaire' : '') + '</p><span class="resource-price" style="color:var(--success);">Actif ✅</span></div>' +
        '<button class="btn btn-sm btn-toggle-close" id="toggle-gardener-btn">Pause</button></div>';
      document.getElementById('toggle-gardener-btn').addEventListener('click', function() { toggleGardener(state.currentParcelle); });
    } else {
      el.innerHTML = '<div class="resource-card" style="opacity:0.6;">' +
        '<div class="resource-icon" style="background:rgba(122,122,122,0.15);color:#7a7a7a;"><i class="fas fa-person-digging"></i></div>' +
        '<div class="resource-info"><h4>Jardinier En pause</h4><p>Coût/plantation : ' + getPlantCostLabel() + (state.plantPayMode === 'beans' ? ' + ' + GARDENER_BEANS_SALARY + '$ salaire' : '') + '</p><span class="resource-price" style="color:var(--text-muted);">En pause ⏸️</span></div>' +
        '<button class="btn btn-sm btn-toggle-open" id="toggle-gardener-btn">Activer</button></div>';
      document.getElementById('toggle-gardener-btn').addEventListener('click', function() { toggleGardener(state.currentParcelle); });
    }
  } else {
    // Mise à jour légère du prix
    var btnBuy = document.getElementById('buy-gardener-btn');
    if (btnBuy) btnBuy.disabled = (state.money < getGardenerCost(state.currentParcelle));
  }
}

function toggleGardener(pIdx) {
  var p = state.parcelles[pIdx];
  if (!p.hasGardener) return;
  p.gardenerActive = !p.gardenerActive;
  _gardenerKey = '';
  showToast(p.gardenerActive ? 'Jardinier activé sur la parcelle ' + (pIdx + 1) + ' !' : 'Jardinier mis en pause.', 'info');
  logEvent(p.gardenerActive ? 'Jardinier activé (P' + (pIdx + 1) + ')' : 'Jardinier en pause (P' + (pIdx + 1) + ')', 'info');
}

function updatePlantation() {
  var now = Date.now(), growDur = getGrowDuration();
  document.getElementById('plant-cost-display').textContent = getPlantCostLabel();
  document.getElementById('grow-time-display').textContent = (growDur / 1000).toFixed(1) + 's';
  var yMin = Math.floor(BASE_YIELD_MIN * (1 + state.upgrades.research * 0.2)), yMax = Math.floor(BASE_YIELD_MAX * (1 + state.upgrades.research * 0.2));
  document.getElementById('yield-display').textContent = yMin + '-' + yMax;
  var plots = getPlots(), slots = getSlots();
  for (var i = 0; i < slots; i++) {
    var el = document.getElementById('plot-' + i); if (!el) continue;
    var plot = plots[i], ns;
    if (!plot) ns = 'empty'; else ns = (now - plot.plantedAt >= plot.growDuration) ? 'ready' : 'growing';
    if (plotStates[i] !== ns) { plotStates[i] = ns; buildPlotHTML(el, i, plot, ns); } else lightUpdatePlot(el, i, plot, ns, now);
  }
}

function buildPlotHTML(el, i, plot, ns) {
  var CIRCLE_R = 45;
  var CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

  if (ns === 'empty') {
    el.className = 'plot-card empty';
    el.innerHTML =
      '<div class="plot-visual">' +
        '<img src="images/pousse0.png" alt="Parcelle vide">' +
      '</div>' +
      '<span class="plot-status">Vide</span>' +
      '<div class="plot-action"><button class="btn btn-accent btn-sm" id="pbtn-' + i + '"><i class="fas fa-seedling"></i> Planter (' + getPlantCostLabel() + ')</button></div>';
    document.getElementById('pbtn-' + i).addEventListener('click', function(e) { plantPlot(i); });
    var pCost = getPlantCost();
    if ((pCost.type === 'beans' && state.rawBeans < pCost.beans) || (pCost.type === 'money' && state.money < pCost.money)) document.getElementById('pbtn-' + i).disabled = true;

  } else if (ns === 'ready') {
    el.className = 'plot-card ready';
    el.innerHTML =
      '<div class="plot-visual">' +
        '<img src="images/pousse4.png" alt="Plante mature">' +
      '</div>' +
      '<span class="plot-status ready-text">Prêt !</span>' +
      '<span class="plot-yield"><i class="fas fa-box-open"></i> +' + plot.yieldAmount + ' grains</span>' +
      '<div class="plot-action"><button class="btn btn-success btn-sm" id="pbtn-' + i + '"><i class="fas fa-hand-sparkles"></i> Récolter</button></div>';
    document.getElementById('pbtn-' + i).addEventListener('click', function(e) { harvestPlot(i, e); });

  } else {
    el.className = 'plot-card growing';
    el.innerHTML =
      '<div class="plot-visual">' +
        '<img src="images/pousse1.png" alt="Pousse" id="pimg-' + i + '">' +
        '<svg class="plot-circle-svg" viewBox="0 0 100 100">' +
          '<circle class="plot-circle-bg" cx="50" cy="50" r="' + CIRCLE_R + '"/>' +
          '<circle class="plot-circle-fill" id="pcircle-' + i + '" cx="50" cy="50" r="' + CIRCLE_R + '" ' +
            'stroke-dasharray="' + CIRCUMFERENCE.toFixed(2) + '" ' +
            'stroke-dashoffset="' + CIRCUMFERENCE.toFixed(2) + '"/>' +
        '</svg>' +
      '</div>' +
      '<span class="plot-timer" id="ptimer-' + i + '"></span>' +
      '<span class="plot-pct" id="ppct-' + i + '"></span>';
  }
}

function lightUpdatePlot(el, i, plot, ns, now) {
  if (ns === 'empty') {
    var b = document.getElementById('pbtn-' + i);
    if (b) {
      var pCost = getPlantCost();
      b.disabled = (pCost.type === 'beans' ? state.rawBeans < pCost.beans : state.money < pCost.money);
    }
    return;
  }
  if (ns === 'ready') return;

  var elapsed = now - plot.plantedAt;
  var progress = Math.min(1, elapsed / plot.growDuration);
  var pct = Math.round(progress * 100);
  var remaining = Math.max(0, plot.growDuration - elapsed);

  /* Mise à jour de l'image selon le stade */
  var img = document.getElementById('pimg-' + i);
  if (img) {
    var newSrc;
    if (progress < 0.3) newSrc = 'images/pousse1.png';
    else if (progress < 0.7) newSrc = 'images/pousse2.png';
    else newSrc = 'images/pousse3.png';
    if (img.getAttribute('src') !== newSrc) img.src = newSrc;
  }

  /* Mise à jour du cercle de progression */
  var CIRCLE_R = 45;
  var CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
  var circle = document.getElementById('pcircle-' + i);
  if (circle) {
    circle.setAttribute('stroke-dashoffset', (CIRCUMFERENCE * (1 - progress)).toFixed(2));
    var colorClass = 'plot-circle-fill';
    if (progress > 0.95) colorClass += ' danger';
    else if (progress > 0.8) colorClass += ' warning';
    if (circle.className !== colorClass) circle.className = colorClass;
  }

  /* Timer et pourcentage */
  var te = document.getElementById('ptimer-' + i);
  var pe = document.getElementById('ppct-' + i);
  if (te) te.textContent = formatTime(remaining);
  if (pe) pe.textContent = pct + '%';
}

/* ===================== MODE DE PAIEMENT PLANTATION ===================== */

var _plantModeKey = '';

function togglePlantMode() {
  state.plantPayMode = (state.plantPayMode === 'money') ? 'beans' : 'money';
  _plantModeKey = '';
  _gardenerKey = '';
  /* Forcer le rebuild de toutes les cartes de parcelles vides */
  var plots = getPlots();
  for (var i = 0; i < plots.length; i++) { if (!plots[i]) plotStates[i] = 'init'; }
  showToast('Mode plantation : ' + (state.plantPayMode === 'beans' ? 'Payer en grains' : 'Payer en dollars'), 'info');
}

function updatePlantModeUI() {
  var key = state.plantPayMode;
  if (key === _plantModeKey) return;
  _plantModeKey = key;
  var el = document.getElementById('plant-mode-container');
  if (!el) return;
  var isMoney = (state.plantPayMode === 'money');
  el.innerHTML =
    '<div class="plant-mode-toggle">' +
      '<button class="plant-mode-btn' + (isMoney ? ' active' : '') + '" id="pmode-money"><i class="fas fa-coins"></i> Payer en $ (' + PLANT_COST + '$)</button>' +
      '<button class="plant-mode-btn' + (!isMoney ? ' active' : '') + '" id="pmode-beans"><i class="fas fa-seedling"></i> Payer en grains (' + PLANT_BEANS_COST + ')</button>' +
    '</div>';
  document.getElementById('pmode-money').addEventListener('click', function() { if (state.plantPayMode !== 'money') togglePlantMode(); });
  document.getElementById('pmode-beans').addEventListener('click', function() { if (state.plantPayMode !== 'beans') togglePlantMode(); });
}

/* ===================== MAÎTRE BARISTA ===================== */

var _baristaKey = '';

function buyBarista() {
  if (state.hasBarista) return;
  if (state.money < BARISTA_COST) { showToast('Pas assez d\'argent pour engager un Maître Barista !', 'error'); return; }
  state.money -= BARISTA_COST;
  state.hasBarista = true;
  state.baristaActive = true;
  _baristaKey = '';
  _baristaPurchKey = '';
  showToast('Maître Barista embauché ! Préparation et service automatiques activés.', 'success');
  logEvent('Maître Barista embauché !', 'success');
}

function toggleBarista() {
  if (!state.hasBarista) return;
  state.baristaActive = !state.baristaActive;
  _baristaKey = '';
  showToast(state.baristaActive ? 'Maître Barista activé !' : 'Maître Barista mis en pause.', 'info');
  logEvent(state.baristaActive ? 'Maître Barista activé' : 'Maître Barista en pause', 'info');
}

function updateBaristaUI() {
  var key = !state.hasBarista ? 'buy' : (state.baristaActive ? 'active' : 'paused');
  var el = document.getElementById('barista-container');
  if (!el) return;

  if (_baristaKey !== key) {
    _baristaKey = key;
    if (!state.hasBarista) {
      el.innerHTML = '<div class="resource-card">' +
        '<div class="resource-icon" style="background:rgba(212,149,106,0.12);color:var(--accent);border:1px solid rgba(212,149,106,0.25);"><i class="fas fa-mug-hot"></i></div>' +
        '<div class="resource-info"><h4>Maître Barista</h4><p>Prépare et sert automatiquement (coût : ' + BARISTA_PREP_COST + '$/cmd)</p><span class="resource-price">' + formatNumber(BARISTA_COST) + '$</span></div>' +
        '<button class="btn btn-accent" id="buy-barista-btn">Engager</button></div>';
      var btn = document.getElementById('buy-barista-btn');
      if (btn) {
        btn.addEventListener('click', buyBarista);
        if (state.money < BARISTA_COST) btn.disabled = true;
      }
    } else if (state.baristaActive) {
      el.innerHTML = '<div class="resource-card" style="border-color:var(--success);">' +
        '<div class="resource-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);"><i class="fas fa-mug-hot"></i></div>' +
        '<div class="resource-info"><h4>Maître Barista</h4><p>Prépare et sert automatiquement (' + BARISTA_PREP_COST + '$/cmd)</p><span class="resource-price" style="color:var(--success);">Actif ✅</span></div>' +
        '<button class="btn btn-sm btn-toggle-close" id="toggle-barista-btn">Pause</button></div>';
      document.getElementById('toggle-barista-btn').addEventListener('click', toggleBarista);
    } else {
      el.innerHTML = '<div class="resource-card" style="opacity:0.6;">' +
        '<div class="resource-icon" style="background:rgba(122,122,122,0.15);color:#7a7a7a;border:1px solid rgba(122,122,122,0.25);"><i class="fas fa-mug-hot"></i></div>' +
        '<div class="resource-info"><h4>Maître Barista</h4><p>Prépare et sert automatiquement (' + BARISTA_PREP_COST + '$/cmd)</p><span class="resource-price" style="color:var(--text-muted);">En pause ⏸️</span></div>' +
        '<button class="btn btn-sm btn-toggle-open" id="toggle-barista-btn">Activer</button></div>';
      document.getElementById('toggle-barista-btn').addEventListener('click', toggleBarista);
    }
  } else {
    var btnBuy = document.getElementById('buy-barista-btn');
    if (btnBuy) btnBuy.disabled = (state.money < BARISTA_COST);
  }
}

/* ===================== RÉPUTATION TIER BAR ===================== */

function updateRepTierBar() {
  var tier = getCurrentRepTier(), next = getNextRepTier(), key = tier.label + '_' + state.reputation;
  if (key === _repTierKey) return; _repTierKey = key;
  document.getElementById('rep-tier-label').textContent = tier.label;
  var multPct = Math.round((1 - tier.spawnMult) * 100);
  document.getElementById('rep-tier-effect').textContent = 'Fréquence clients : ' + (multPct > 0 ? '+' + multPct + '%' : 'normale');
  var nextEl = document.getElementById('rep-tier-next');
  if (next) { nextEl.textContent = 'Prochain : ' + next.min + ' rép. (' + next.label + ')'; nextEl.style.color = ''; nextEl.style.fontWeight = ''; }
  else { nextEl.textContent = 'Palier maximum atteint'; nextEl.style.color = 'var(--gold)'; nextEl.style.fontWeight = '700'; }
}

/* ===================== COFFEE SHOP ===================== */

function updateCoffeeShop() {
  var counterEl = document.getElementById('counter-content'), queueEl = document.getElementById('queue-content');
  document.getElementById('counter-slots-count').textContent = '(' + state.activeOrders.length + '/' + state.counterSlots + ')';
  document.getElementById('queue-count').textContent = '(' + state.customers.length + '/' + state.maxQueue + ')';
  var cStates = [];
  for (var ci = 0; ci < state.activeOrders.length; ci++) { var o = state.activeOrders[ci]; var op = Math.min(1, (Date.now() - o.startTime) / o.prepDuration); cStates.push(o.customerId + ':' + (op >= 1 ? 'r' : 'p')); }
  var ck = state.counterSlots + '|' + cStates.join(',');
  if (ck !== _counterKey) { _counterKey = ck; buildCounterHTML(counterEl); } else lightUpdateCounter(counterEl);
  var ids = []; for (var qi = 0; qi < state.customers.length; qi++) ids.push(state.customers[qi].id);
  var qk = ids.join(',');
  if (qk !== _lastQueueKey) { _lastQueueKey = qk; buildQueueHTML(queueEl); } else lightUpdateQueue(queueEl);
  renderRecipesInfo();
}

function buildCounterHTML(el) {
  var html = '', now = Date.now();
  for (var si = 0; si < state.counterSlots; si++) {
    var order = state.activeOrders[si];
    if (!order) {
      html += '<div class="counter-slot empty"><span class="slot-label">Poste ' + (si + 1) + '</span><i class="fas fa-blender"></i><span class="slot-label">Libre</span></div>';
      continue;
    }
    var elapsed = now - order.startTime, progress = Math.min(1, elapsed / order.prepDuration), isReady = progress >= 1;
    var gTag = order.isGroup ? ' <span class="group-badge-sm"><i class="fas fa-users"></i></span>' : '';
    /* Les deux états ont exactement la même structure : label, row, recipe, bar, bottom */
    if (isReady) {
      var serveMax = 30000, overTime = elapsed - order.prepDuration;
      var serveRem = Math.max(0, serveMax - overTime), servePct = Math.round((serveRem / serveMax) * 100);
      html += '<div class="counter-slot ready">' +
        '<span class="slot-label">Poste ' + (si + 1) + '</span>' +
        '<div class="slot-row"><span class="slot-customer">' + order.name + gTag + '</span><span class="slot-price">' + order.price + '$</span></div>' +
        '<span class="slot-recipe">' + order.orderName + '</span>' +
        '<div class="progress-bar thin danger" id="obar-' + si + '"><div class="progress-fill" id="ofill-' + si + '" style="width:' + servePct + '%"></div></div>' +
        '<div class="slot-row slot-bottom"><span class="slot-timer" id="otimer-' + si + '" style="color:var(--danger);">' + formatTime(serveRem) + '</span><button class="btn btn-success btn-sm slot-serve-btn" onclick="serveOrder(' + si + ')"><i class="fas fa-bell-concierge"></i> Servir</button></div>' +
      '</div>';
    } else {
      var pct = Math.round(progress * 100), remaining = Math.max(0, order.prepDuration - elapsed);
      var barClass = 'progress-bar thin green';
      if (progress > 0.95) barClass = 'progress-bar thin danger';
      else if (progress > 0.8) barClass = 'progress-bar thin warning';
      html += '<div class="counter-slot preparing">' +
        '<span class="slot-label">Poste ' + (si + 1) + '</span>' +
        '<div class="slot-row"><span class="slot-customer">' + order.name + gTag + '</span><span class="slot-price">' + order.price + '$</span></div>' +
        '<span class="slot-recipe">' + order.orderName + '</span>' +
        '<div class="' + barClass + '" id="obar-' + si + '"><div class="progress-fill" id="ofill-' + si + '" style="width:' + pct + '%"></div></div>' +
        '<div class="slot-row slot-bottom"><span class="slot-timer" id="otimer-' + si + '">' + formatTime(remaining) + '</span><span class="slot-prep-text"><i class="fas fa-spinner fa-spin"></i> Prép.</span></div>' +
      '</div>';
    }
  }
  el.innerHTML = html;
}

function lightUpdateCounter(el) {
  var now = Date.now();
  for (var si = 0; si < state.activeOrders.length; si++) {
    var order = state.activeOrders[si]; if (!order) continue;
    var elapsed = now - order.startTime, progress = Math.min(1, elapsed / order.prepDuration);
    var fe = document.getElementById('ofill-' + si), te = document.getElementById('otimer-' + si), be = document.getElementById('obar-' + si);

    if (progress >= 1) {
      var serveMax = 30000, overTime = elapsed - order.prepDuration;
      var serveRem = Math.max(0, serveMax - overTime), servePct = Math.round((serveRem / serveMax) * 100);
      if (fe) fe.style.width = servePct + '%';
      if (te) te.textContent = formatTime(serveRem);
      continue;
    }

    var pct = Math.round(progress * 100), remaining = Math.max(0, order.prepDuration - elapsed);
    if (fe) fe.style.width = pct + '%';
    if (te) te.textContent = formatTime(remaining);
    if (be) {
      var bc = 'progress-bar thin green';
      if (progress > 0.95) bc = 'progress-bar thin danger';
      else if (progress > 0.8) bc = 'progress-bar thin warning';
      if (be.className !== bc) be.className = bc;
    }
  }
}

function buildQueueHTML(el) {
  if (state.customers.length === 0) { el.innerHTML = '<p class="empty-msg"><i class="fas fa-hourglass-half"></i> En attente de clients...</p>'; return; }
  var h = '';
  for (var ci = 0; ci < state.customers.length; ci++) {
    var c = state.customers[ci];
    var req = getCustomerTotalRequirements(c);
    var cp = state.activeOrders.length < state.counterSlots && state.rawBeans >= req.beans && state.milk >= req.milk;
    var dName = c.isGroup ? getConsolidatedOrderName(c.orders) : RECIPES[c.orderKey].name;
    var gBadge = c.isGroup ? ' <span class="group-badge"><i class="fas fa-users"></i> Groupe</span>' : '';
    var icon = c.isGroup ? 'people-group' : 'user';
    h += '<div class="customer-card' + (c.isGroup ? ' group-card' : '') + '" id="ccard-' + c.id + '">' +
      '<div class="customer-header">' +
        '<span class="customer-name"><i class="fas fa-' + icon + '"></i> ' + c.name + gBadge + '</span>' +
        '<span class="customer-order">' + dName + '</span>' +
      '</div>' +
      '<div class="customer-requirements">' +
        '<span><i class="fas fa-seedling"></i> ' + req.beans + '</span>' +
        (req.milk > 0 ? '<span><i class="fas fa-droplet"></i> ' + req.milk + '</span>' : '<span></span>') +
      '</div>' +
      '<div class="customer-patience"><div class="progress-bar thin green" id="cbar-' + c.id + '"><div class="progress-fill" id="cfill-' + c.id + '"></div></div></div>' +
      '<div class="customer-actions">' +
        '<button class="btn btn-accent btn-sm" style="flex:1;" id="cbtn-' + c.id + '" ' + (cp ? '' : 'disabled') + '><i class="fas fa-blender"></i> Pr\u00e9parer</button>' +
        '<button class="btn refuse-btn" id="cref-' + c.id + '" title="Refuser (-1 r\u00e9p.)"><i class="fas fa-xmark"></i></button>' +
      '</div>' +
    '</div>';
  }
  el.innerHTML = h;
  for (var bi = 0; bi < state.customers.length; bi++) {
    (function(id) {
      var b = document.getElementById('cbtn-' + id);
      if (b) b.addEventListener('click', function() { prepareOrder(id); });
      var rb = document.getElementById('cref-' + id);
      if (rb) rb.addEventListener('click', function() { refuseCustomer(id); });
    })(state.customers[bi].id);
  }
}

function lightUpdateQueue(el) {
  for (var ci = 0; ci < state.customers.length; ci++) {
    var c = state.customers[ci], pp = Math.max(0, (c.patience / c.maxPatience) * 100);
    var req = getCustomerTotalRequirements(c);
    var fe = document.getElementById('cfill-' + c.id), be = document.getElementById('cbar-' + c.id);
    if (fe) fe.style.width = pp + '%';
    if (be) { var pc = 'progress-bar thin green'; if (pp < 40) pc = 'progress-bar thin danger'; else if (pp < 70) pc = 'progress-bar thin warning'; if (be.className !== pc) be.className = pc; }
    var canPrepare = state.activeOrders.length < state.counterSlots && state.rawBeans >= req.beans && state.milk >= req.milk;
    var b = document.getElementById('cbtn-' + c.id); if (b) b.disabled = !canPrepare;
  }
}

function renderRecipesInfo() {
  if (_recipesRendered) return; _recipesRendered = true;
  var el = document.getElementById('recipes-info'), h = '';
  for (var ri = 0; ri < RECIPE_KEYS.length; ri++) {
    var k = RECIPE_KEYS[ri], r = RECIPES[k], p = getSellPrice(k), pr = getPrepDuration(k);
    h += '<div class="recipe-info-card"><h4>' + r.name + '</h4><div class="recipe-cost"><span><i class="fas fa-seedling"></i> ' + r.beans + ' grains</span>' + (r.milk > 0 ? '<span><i class="fas fa-droplet"></i> ' + r.milk + ' lait</span>' : '<span></span>') + '</div><div class="recipe-price"><span class="recipe-prep-time"><i class="fas fa-clock"></i> ' + (pr / 1000).toFixed(1) + 's</span><strong>' + p + '$</strong></div></div>';
  }
  el.innerHTML = h;
}

/* ===================== COMMERCE ===================== */

function updateCommerceUI() {
  initPriceChart();
  updatePriceChart();
  var effectiveGrainPrice = state.marketPrice * (state.grainBoostTimer > 0 ? GRAIN_BOOST_MULT : 1);
  var pe = document.getElementById('market-price'), te = document.getElementById('market-trend');
  pe.textContent = effectiveGrainPrice.toFixed(2) + '$';
  if (state.grainBoostTimer > 0) { te.className = 'market-trend boosted'; te.innerHTML = '<i class="fas fa-arrow-trend-up"></i> Boost\u00e9 !'; }
  else { var d = state.marketPrice - state.previousPrice; if (d > 0.05) { te.className = 'market-trend up'; te.innerHTML = '<i class="fas fa-arrow-trend-up"></i> Hausse'; } else if (d < -0.05) { te.className = 'market-trend down'; te.innerHTML = '<i class="fas fa-arrow-trend-down"></i> Baisse'; } else { te.className = 'market-trend stable'; te.innerHTML = '<i class="fas fa-minus"></i> Stable'; } }
  document.getElementById('commerce-beans').textContent = formatNumber(state.rawBeans);
  var ub = document.getElementById('toggle-urgent-btn');
  if (ub) {
    if (state.urgentOffersPaused) {
      ub.className = 'btn btn-sm btn-toggle-open';
      ub.innerHTML = '<i class="fas fa-play"></i> Reprendre les évènements';
    } else {
      ub.className = 'btn btn-sm btn-toggle-close';
      ub.innerHTML = '<i class="fas fa-pause"></i> Suspendre les évènements';
    }
  }
  if (!_sellersBuilt) {
    _sellersBuilt = true;
    var g = document.getElementById('sellers-grid'), gh = '';
    for (var sid in SELLERS) { var s = SELLERS[sid]; gh += '<div class="seller-card" id="seller-' + sid + '"><div class="seller-icon"><i class="fas ' + s.icon + '"></i></div><h4>' + s.name + '</h4><div class="seller-details" id="sdetails-' + sid + '"></div><div class="seller-action" id="saction-' + sid + '"></div><div class="urgent-offer-container" id="urgent-' + sid + '"></div></div>'; }
    g.innerHTML = gh;
  }
  for (var sid2 in SELLERS) {
    var seller = SELLERS[sid2], cd = state.sellerCooldowns[sid2], ss = cd > 0 ? 'cooldown' : 'idle';
    updateSellerDetails(sid2, seller);
    if (_sellerStates[sid2] !== ss) { 
      _sellerStates[sid2] = ss; 
      buildSellerAction(sid2, seller, cd); 
    }
    else if (ss === 'cooldown') { 
      lightUpdateSellerCooldown(sid2, seller, cd); 
    }
    else if (ss === 'idle') {
      // AJOUT : Mise à jour légère du bouton pour réagir au stock de grains
      var sellBtn = document.getElementById('scdbtn-' + sid2);
      if (sellBtn) sellBtn.disabled = (state.rawBeans <= 0);
    }
  }
  updateUrgentOffersUI();
  /* Prix du lait */
  var effectiveMilkPrice = state.milkDropTimer > 0 ? MILK_PRICE_MIN : state.milkMarketPrice;
  var milkPe = document.getElementById('milk-market-price');
  var milkTe = document.getElementById('milk-market-trend');
  if (milkPe) milkPe.textContent = effectiveMilkPrice.toFixed(2) + '$';
  if (milkTe) {
    if (state.milkDropTimer > 0) { milkTe.className = 'market-trend dropped'; milkTe.innerHTML = '<i class="fas fa-arrow-trend-down"></i> Mini !'; }
    else { var milkD = state.milkMarketPrice - (state.milkPreviousPrice || state.milkMarketPrice); if (milkD > 0.05) { milkTe.className = 'market-trend up'; milkTe.innerHTML = '<i class="fas fa-arrow-trend-up"></i> Hausse'; } else if (milkD < -0.05) { milkTe.className = 'market-trend down'; milkTe.innerHTML = '<i class="fas fa-arrow-trend-down"></i> Baisse'; } else { milkTe.className = 'market-trend stable'; milkTe.innerHTML = '<i class="fas fa-minus"></i> Stable'; } }
  }
  var milkStockEl = document.getElementById('commerce-milk');
  if (milkStockEl) milkStockEl.textContent = formatNumber(state.milk);
}

function updateSellerDetails(sid, seller) {
  var el = document.getElementById('sdetails-' + sid); if (!el) return;
  var ppb = state.marketPrice * seller.priceMult, pt = Math.floor(seller.quota * ppb), aa = Math.min(seller.quota, state.rawBeans), at = Math.floor(aa * ppb);
  var rl = (state.rawBeans > 0 && state.rawBeans < seller.quota) ? '<div class="seller-detail"><span>Gain réel</span><strong style="color:var(--gold);">' + at + '$ (' + aa + ' g.)</strong></div>' : '';
  var h = '<div class="seller-detail"><span>Quota max</span><strong>' + seller.quota + ' grains</strong></div><div class="seller-detail"><span>Prix/unité</span><strong>' + ppb.toFixed(2) + '$</strong></div><div class="seller-detail"><span>Gain max</span><strong style="color:var(--gold);">' + pt + '$</strong></div>' + rl;
  if (el.innerHTML !== h) el.innerHTML = h;
}

function buildSellerAction(sid, seller, cd) {
  var el = document.getElementById('saction-' + sid); if (!el) return;
  if (cd > 0) { el.innerHTML = '<div class="cooldown-bar"><div class="progress-bar thin cooldown" id="scdbar-' + sid + '"><div class="progress-fill" id="scdfill-' + sid + '"></div></div><span id="scdtimer-' + sid + '"></span></div>'; }
  else { el.innerHTML = '<button class="btn btn-success btn-sm" style="width:100%;" id="scdbtn-' + sid + '" ' + (state.rawBeans <= 0 ? 'disabled' : '') + '><i class="fas fa-handshake"></i> Vendre</button>'; document.getElementById('scdbtn-' + sid).addEventListener('click', function() { sellToMerchant(sid); }); }
}

function lightUpdateSellerCooldown(sid, seller, cd) {
  var fe = document.getElementById('scdfill-' + sid), te = document.getElementById('scdtimer-' + sid), cp = Math.round((cd / seller.cooldown) * 100);
  if (fe) fe.style.width = cp + '%'; if (te) te.textContent = formatTime(cd);
}

var _manipBuilt = false;
var _manipStates = {};

function updateMarketManipUI() {
  var gState = (state.grainBoostTimer > 0 ? 'active' : (state.grainBoostCd > 0 ? 'cd' : 'idle'));
  var mState = (state.milkDropTimer > 0 ? 'active' : (state.milkDropCd > 0 ? 'cd' : 'idle'));
  var aState = (state.adTimer > 0 ? 'active' : (state.adCd > 0 ? 'cd' : 'idle'));
  if (!_manipBuilt || _manipStates.grain !== gState || _manipStates.milk !== mState || _manipStates.ad !== aState) {
    _manipBuilt = true;
    _manipStates = { grain: gState, milk: mState, ad: aState };
    buildMarketManipHTML();
  } else {
    lightUpdateMarketManip();
  }
}

function buildMarketManipHTML() {
  var g = document.getElementById('market-manip-grid');
  if (!g) return;
  var h = '';
  
  /* Carte Grain Boost */
  if (state.grainBoostTimer > 0) {
    h += '<div class="upgrade-card" style="border-color:rgba(107,158,80,0.3);"><div class="upgrade-icon" style="background:rgba(107,158,80,0.15);color:var(--success);border-color:rgba(107,158,80,0.3);"><i class="fas fa-arrow-trend-up"></i></div><div class="upgrade-info"><h4>Boost Grain +80%</h4><p>Les ventes de grains sont temporairement augment\u00e9es.</p><div class="progress-bar thin green" id="mfill-grain"><div class="progress-fill" id="mfillg" style="width:100%"></div></div></div><div class="upgrade-action"><span class="slot-timer" id="mtimer-grain" style="font-size:0.78rem;color:var(--success);"></span></div></div>';
  } else if (state.grainBoostCd > 0) {
    h += '<div class="upgrade-card"><div class="upgrade-icon" style="opacity:0.4;"><i class="fas fa-arrow-trend-up"></i></div><div class="upgrade-info"><h4>Boost Grain +80%</h4><p>Les ventes de grains sont temporairement augment\u00e9es.</p><div class="progress-bar thin cooldown" id="mfill-grain"><div class="progress-fill" id="mfillg" style="width:0%"></div></div></div><div class="upgrade-action"><span class="slot-timer" id="mtimer-grain" style="font-size:0.78rem;color:var(--text-muted);"></span></div></div>';
  } else {
    h += '<div class="upgrade-card"><div class="upgrade-icon"><i class="fas fa-arrow-trend-up"></i></div><div class="upgrade-info"><h4>Boost Cours du Grain</h4><p>Augmente le cours du grain pendant 45s pour mieux vendre.</p></div><div class="upgrade-action"><button class="btn btn-accent btn-sm" id="mbtn-grain"><i class="fas fa-coins"></i> ' + GRAIN_BOOST_COST + '$</button></div></div>';
  }

  /* Carte Milk Drop */
  if (state.milkDropTimer > 0) {
    h += '<div class="upgrade-card" style="border-color:rgba(122,184,224,0.3);"><div class="upgrade-icon" style="background:rgba(122,184,224,0.15);color:#7ab8e0;border-color:rgba(122,184,224,0.3);"><i class="fas fa-arrow-trend-down"></i></div><div class="upgrade-info"><h4>Prix Lait Minimum</h4><p>Le prix du lait est temporairement au plus bas.</p><div class="progress-bar thin" id="mfill-milk" style=""><div class="progress-fill" id="mfillm" style="width:100%;background:linear-gradient(90deg, #3a8ab8, #7ab8e0);"></div></div></div><div class="upgrade-action"><span class="slot-timer" id="mtimer-milk" style="font-size:0.78rem;color:#7ab8e0;"></span></div></div>';
  } else if (state.milkDropCd > 0) {
    h += '<div class="upgrade-card"><div class="upgrade-icon" style="opacity:0.4;"><i class="fas fa-arrow-trend-down"></i></div><div class="upgrade-info"><h4>Prix Lait Minimum</h4><p>Le prix du lait est temporairement au plus bas.</p><div class="progress-bar thin cooldown" id="mfill-milk"><div class="progress-fill" id="mfillm" style="width:0%"></div></div></div><div class="upgrade-action"><span class="slot-timer" id="mtimer-milk" style="font-size:0.78rem;color:var(--text-muted);"></span></div></div>';
  } else {
    h += '<div class="upgrade-card"><div class="upgrade-icon"><i class="fas fa-arrow-trend-down"></i></div><div class="upgrade-info"><h4>Prix Lait Minimum</h4><p>Fait baisser le prix du lait au minimum pendant 60s pour approvisionner pas cher.</p></div><div class="upgrade-action"><button class="btn btn-accent btn-sm" id="mbtn-milk"><i class="fas fa-coins"></i> ' + MILK_DROP_COST + '$</button></div></div>';
  }

  /* Carte Publicité */
  if (state.adTimer > 0) {
    h += '<div class="upgrade-card" style="border-color:rgba(212,149,106,0.3);"><div class="upgrade-icon" style="background:rgba(212,149,106,0.15);color:var(--accent);border-color:rgba(212,149,106,0.3);"><i class="fas fa-bullhorn"></i></div><div class="upgrade-info"><h4>Campagne publicitaire</h4><p>Les clients arrivent 40% plus vite.</p><div class="progress-bar thin" id="mfill-ad"><div class="progress-fill" id="mfilla" style="width:100%;background:linear-gradient(90deg, var(--accent-dark), var(--accent));"></div></div></div><div class="upgrade-action"><span class="slot-timer" id="mtimer-ad" style="font-size:0.78rem;color:var(--accent);"></span></div></div>';
  } else if (state.adCd > 0) {
    h += '<div class="upgrade-card"><div class="upgrade-icon" style="opacity:0.4;"><i class="fas fa-bullhorn"></i></div><div class="upgrade-info"><h4>Campagne publicitaire</h4><p>Les clients arrivent 40% plus vite.</p><div class="progress-bar thin cooldown" id="mfill-ad"><div class="progress-fill" id="mfilla" style="width:0%"></div></div></div><div class="upgrade-action"><span class="slot-timer" id="mtimer-ad" style="font-size:0.78rem;color:var(--text-muted);"></span></div></div>';
  } else {
    h += '<div class="upgrade-card"><div class="upgrade-icon"><i class="fas fa-bullhorn"></i></div><div class="upgrade-info"><h4>Campagne publicitaire</h4><p>Attirez 40% de clients en plus pendant 60s.</p></div><div class="upgrade-action"><button class="btn btn-accent btn-sm" id="mbtn-ad"><i class="fas fa-coins"></i> ' + AD_COST + '$</button></div></div>';
  }

  g.innerHTML = h;
  var gb = document.getElementById('mbtn-grain'); if (gb) { gb.addEventListener('click', buyGrainBoost); if (state.money < GRAIN_BOOST_COST) gb.disabled = true; }
  var mb = document.getElementById('mbtn-milk'); if (mb) { mb.addEventListener('click', buyMilkDrop); if (state.money < MILK_DROP_COST) mb.disabled = true; }
  var ab = document.getElementById('mbtn-ad'); if (ab) { ab.addEventListener('click', buyAd); if (state.money < AD_COST) ab.disabled = true; }
}

function lightUpdateMarketManip() {
  if (state.grainBoostTimer > 0) {
    var gf = document.getElementById('mfillg'), gt = document.getElementById('mtimer-grain');
    if (gf) gf.style.width = Math.round((state.grainBoostTimer / GRAIN_BOOST_DURATION) * 100) + '%';
    if (gt) gt.textContent = formatTime(state.grainBoostTimer);
  } else if (state.grainBoostCd > 0) {
    var gcf = document.getElementById('mfillg'), gct = document.getElementById('mtimer-grain');
    if (gcf) gcf.style.width = Math.round((state.grainBoostCd / (GRAIN_BOOST_CD + GRAIN_BOOST_DURATION)) * 100) + '%';
    if (gct) gct.textContent = 'CD ' + formatTime(state.grainBoostCd);
  } else {
    var mbtn = document.getElementById('mbtn-milk'); if (mbtn) mbtn.disabled = (state.money < MILK_DROP_COST);
  }

  if (state.adTimer > 0) {
    var af = document.getElementById('mfilla'), at = document.getElementById('mtimer-ad');
    if (af) af.style.width = Math.round((state.adTimer / AD_DURATION) * 100) + '%';
    if (at) at.textContent = formatTime(state.adTimer);
  } else if (state.adCd > 0) {
    var acf = document.getElementById('mfilla'), act = document.getElementById('mtimer-ad');
    if (acf) acf.style.width = Math.round((state.adCd / (AD_CD + AD_DURATION)) * 100) + '%';
    if (act) act.textContent = 'CD ' + formatTime(state.adCd);
  } else {
    var abtn = document.getElementById('mbtn-ad'); if (abtn) abtn.disabled = (state.money < AD_COST);
  }

  if (state.milkDropTimer > 0) {
    var mf = document.getElementById('mfillm'), mt = document.getElementById('mtimer-milk');
    if (mf) mf.style.width = Math.round((state.milkDropTimer / MILK_DROP_DURATION) * 100) + '%';
    if (mt) mt.textContent = formatTime(state.milkDropTimer);
  } else if (state.milkDropCd > 0) {
    var mcf = document.getElementById('mfillm'), mct = document.getElementById('mtimer-milk');
    if (mcf) mcf.style.width = Math.round((state.milkDropCd / (MILK_DROP_CD + MILK_DROP_DURATION)) * 100) + '%';
    if (mct) mct.textContent = 'CD ' + formatTime(state.milkDropCd);
  } else {
    var mbtn = document.getElementById('mbtn-milk'); if (mbtn) mbtn.disabled = (state.money < MILK_DROP_COST);
  }
}

/* ===================== MAGASIN ===================== */

function updatePlantPurchases() {
  var p = state.parcelles[state.currentParcelle], key = p.slots + '_' + state.parcelles.length;
  if (key === _plantPurchKey) { lightUpdatePlantPurchases(); return; } _plantPurchKey = key;
  var el = document.getElementById('plant-purchases-grid'), h = '';
  if (p.slots < MAX_SLOTS_PER_PARCELLE) { var sc = getSlotCost(state.currentParcelle); h += '<div class="resource-card"><div class="resource-icon plot-slot-icon"><i class="fas fa-seedling"></i></div><div class="resource-info"><h4>Emplacement de plantation</h4><p>Ajoute 1 emplacement à la parcelle ' + (state.currentParcelle + 1) + ' (' + p.slots + '/' + MAX_SLOTS_PER_PARCELLE + ')</p><span class="resource-price">' + sc + '$</span></div><button class="btn btn-accent" id="buy-slot-btn">Acheter</button></div>'; }
  if (state.parcelles.length < MAX_PARCELLES) { var pc = getParcelleCost(); h += '<div class="resource-card"><div class="resource-icon parcelle-icon"><i class="fas fa-map"></i></div><div class="resource-info"><h4>Nouvelle parcelle</h4><p>Une nouvelle parcelle avec 2 emplacements (' + state.parcelles.length + '/' + MAX_PARCELLES + ' parcelles)</p><span class="resource-price">' + pc + '$</span></div><button class="btn btn-accent" id="buy-parcelle-btn">Acheter</button></div>'; }
  if (!h) h = '<p class="empty-msg"><i class="fas fa-check-circle"></i> Terrain entièrement exploité !</p>';
  el.innerHTML = h;
  var sb = document.getElementById('buy-slot-btn'); if (sb) { sb.addEventListener('click', buyPlotSlot); if (state.money < getSlotCost(state.currentParcelle)) sb.disabled = true; }
  var pb = document.getElementById('buy-parcelle-btn'); if (pb) { pb.addEventListener('click', buyParcelle); if (state.money < getParcelleCost()) pb.disabled = true; }
}

function lightUpdatePlantPurchases() {
  var sb = document.getElementById('buy-slot-btn'); if (sb) sb.disabled = (state.money < getSlotCost(state.currentParcelle));
  var pb = document.getElementById('buy-parcelle-btn'); if (pb) pb.disabled = (state.money < getParcelleCost());
}

function updateMilkPriceDisplay() {
  var currentMilkPrice = state.milkDropTimer > 0 ? MILK_PRICE_MIN : state.milkMarketPrice;
  var cost = Math.ceil(currentMilkPrice * MILK_AMOUNT);
  var el = document.getElementById('milk-price-display');
  if (el) el.textContent = cost + '$';
  var btn = document.getElementById('buy-milk-btn');
  if (btn) btn.disabled = (state.money < cost);
}

var _baristaPurchKey = '';

function updateBaristaPurchaseUI() {
  var key = (state.hasBarista ? 'owned' : 'buy') + '_' + state.money;
  if (key === _baristaPurchKey) return;
  _baristaPurchKey = key;
  var el = document.getElementById('barista-purchase-container');
  if (!el) return;

  if (state.hasBarista) {
    el.innerHTML = '<div class="upgrade-card" style="border-color:rgba(107,158,80,0.3);">' +
      '<div class="upgrade-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;border-color:rgba(34,197,94,0.3);"><i class="fas fa-mug-hot"></i></div>' +
      '<div class="upgrade-info"><h4>Maître Barista</h4><p>Prépare et sert automatiquement les commandes. Coût : ' + BARISTA_PREP_COST + '$ par commande.</p></div>' +
      '<div class="upgrade-action"><span class="maxed-text">ACQUIS</span></div></div>';
  } else {
    el.innerHTML = '<div class="upgrade-card">' +
      '<div class="upgrade-icon"><i class="fas fa-mug-hot"></i></div>' +
      '<div class="upgrade-info"><h4>Maître Barista</h4><p>Prépare et sert automatiquement les commandes. Coût d\'entretien : ' + BARISTA_PREP_COST + '$ par commande.</p></div>' +
      '<div class="upgrade-action"><button class="btn btn-accent btn-sm" id="buy-barista-magasin-btn" ' + (state.money < BARISTA_COST ? 'disabled' : '') + '><i class="fas fa-coins"></i> ' + formatNumber(BARISTA_COST) + '$</button></div></div>';
    var btn = document.getElementById('buy-barista-magasin-btn');
    if (btn) btn.addEventListener('click', buyBarista);
  }
}

function updateMagasinUI() {
  if (!_upgradesBuilt) {
    _upgradesBuilt = true;
    var g = document.getElementById('upgrades-grid'), h = '';
    for (var uid in UPGRADES) {
      var u = UPGRADES[uid], pips = '';
      for (var p = 0; p < u.maxLevel; p++) pips += '<div class="level-pip" id="upip-' + uid + '-' + p + '"></div>';
      h += '<div class="upgrade-card" id="upgrade-' + uid + '"><div class="upgrade-icon"><i class="fas ' + u.icon + '"></i></div><div class="upgrade-info"><h4>' + u.name + '</h4><p>' + u.desc + '</p><div class="upgrade-levels">' + pips + '</div></div><div class="upgrade-action" id="uaction-' + uid + '"></div></div>';
    }
    g.innerHTML = h;
  }
  for (var id in UPGRADES) {
    var ug = UPGRADES[id], lv = state.upgrades[id], mx = lv >= ug.maxLevel;
    if (_upgradeLevels[id] !== lv) {
      _upgradeLevels[id] = lv;
      for (var pi = 0; pi < ug.maxLevel; pi++) { var pip = document.getElementById('upip-' + id + '-' + pi); if (pip) { if (pi < lv) pip.classList.add('filled'); else pip.classList.remove('filled'); } }
      var ae = document.getElementById('uaction-' + id);
      if (ae) {
        if (mx) { ae.innerHTML = '<span class="maxed-text">MAX</span>'; }
        else {
          var c = ug.costs[lv];
          ae.innerHTML = '<button class="btn btn-accent btn-sm" id="ubtn-' + id + '"><i class="fas fa-coins"></i> ' + c + '$</button>';
          /* IIFE pour capturer correctement l'id dans la closure */
          (function(upgradeId, cost) {
            document.getElementById('ubtn-' + upgradeId).addEventListener('click', function() { buyUpgrade(upgradeId); });
            if (state.money < cost) document.getElementById('ubtn-' + upgradeId).disabled = true;
          })(id, c);
        }
      }
    } else if (!mx) {
      var c2 = ug.costs[lv], b = document.getElementById('ubtn-' + id);
      if (b) b.disabled = (state.money < c2);
    }
  }
  updateMarketManipUI();
}

var _urgentStates = {};

function updateUrgentOffersUI() {
  for (var sid in SELLERS) {
    var offer = null;
    for (var i = 0; i < state.urgentOffers.length; i++) {
      if (state.urgentOffers[i].sellerId === sid) { offer = state.urgentOffers[i]; break; }
    }
    var nState = offer ? 'offer-' + offer.id : 'none';
    if (_urgentStates[sid] !== nState) {
      _urgentStates[sid] = nState;
      buildUrgentOfferHTML(sid, offer);
    } else if (offer) {
      lightUpdateUrgentOffer(sid, offer);
    }
  }
}

function buildUrgentOfferHTML(sid, offer) {
  var el = document.getElementById('urgent-' + sid);
  if (!el) return;
  if (!offer) { el.innerHTML = ''; return; }
  var canDeliver = state.rawBeans >= offer.beansRequired;
  el.innerHTML =
    '<div class="urgent-offer">' +
      '<div class="urgent-offer-header"><i class="fas fa-bolt"></i> Besoin urgent</div>' +
      '<div class="urgent-offer-details">' +
        '<span><i class="fas fa-seedling"></i> ' + offer.beansRequired + ' grains requis</span>' +
        '<span><i class="fas fa-coins"></i> Récompense : <strong>' + formatNumber(offer.bonusReward) + '$</strong></span>' +
      '</div>' +
      '<div class="progress-bar thin warning" id="ubar-' + offer.id + '"><div class="progress-fill" id="ufill-' + offer.id + '"></div></div>' +
      '<div class="urgent-offer-footer">' +
        '<span class="urgent-offer-timer safe" id="utimer-' + offer.id + '"></span>' +
        '<button class="btn btn-accent btn-sm" id="ubtn-' + offer.id + '" ' + (canDeliver ? '' : 'disabled') + '><i class="fas fa-truck-fast"></i> Livrer</button>' +
      '</div>' +
    '</div>';
  (function(oid) {
    var b = document.getElementById('ubtn-' + oid);
    if (b) b.addEventListener('click', function() { deliverUrgentOffer(oid); });
  })(offer.id);
  lightUpdateUrgentOffer(sid, offer);
}

function lightUpdateUrgentOffer(sid, offer) {
  if (!offer) return;
  var elapsed = Date.now() - offer.createdAt - _urgentTotalPausedMs;
  if (state.urgentOffersPaused && _urgentPauseStart > 0) elapsed -= (Date.now() - _urgentPauseStart);
  elapsed = Math.max(0, elapsed);
  var remaining = Math.max(0, offer.duration - elapsed);
  var progress = remaining / offer.duration;
  var pct = Math.round(progress * 100);
  var fe = document.getElementById('ufill-' + offer.id);
  var te = document.getElementById('utimer-' + offer.id);
  var be = document.getElementById('ubar-' + offer.id);
  if (fe) fe.style.width = pct + '%';
  if (te) te.textContent = formatTime(remaining);
  if (be) {
    var bc = 'progress-bar thin warning';
    if (progress < 0.3) bc = 'progress-bar thin danger';
    else if (progress < 0.5) bc = 'progress-bar thin danger';
    if (be.className !== bc) be.className = bc;
  }
  if (te) {
    if (progress < 0.3) te.className = 'urgent-offer-timer';
    else te.className = 'urgent-offer-timer safe';
  }
  var btn = document.getElementById('ubtn-' + offer.id);
  if (btn) btn.disabled = (state.rawBeans < offer.beansRequired);
}

/* ===================================================
   UTILITAIRES
   =================================================== */
function showFloatingText(x, y, text) {
  var el = document.createElement('div');
  el.className = 'harvest-float';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 1000);
}

function spawnParticle(text, type, originEl) {
  var particle = document.createElement('span');
  particle.className = 'float-particle ' + (type || '');
  particle.textContent = text;
  document.body.appendChild(particle);

  /* Positionner la particule au-dessus de l'élément déclencheur */
  if (originEl) {
    var rect = originEl.getBoundingClientRect();
    particle.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    particle.style.top = (rect.top - 10) + 'px';
  } else {
    particle.style.left = '50%';
    particle.style.top = '50%';
  }

  setTimeout(function() { if (particle.parentNode) particle.remove(); }, 1100);
}

function popButton(btnEl) {
  if (!btnEl) return;
  btnEl.classList.remove('btn-pop');
  /* Forcer le reflow pour relancer l'animation si elle vient de se jouer */
  void btnEl.offsetWidth;
  btnEl.classList.add('btn-pop');
  setTimeout(function() { btnEl.classList.remove('btn-pop'); }, 300);
}
function formatTime(ms) { var ts = Math.ceil(ms / 1000), m = Math.floor(ts / 60), s = ts % 60; return m > 0 ? m + 'm ' + s + 's' : s + 's'; }
function formatNumber(n) { n = Math.floor(n); if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 10000) return (n / 1000).toFixed(1) + 'k'; return n.toString(); }

function updateCommerceBadge() {
  var btn = document.querySelector('[data-tab="commerce"]');
  if (!btn) return;
  var existing = btn.querySelector('.tab-badge');
  if (state.urgentOffers && state.urgentOffers.length > 0) {
    if (!existing) {
      var badge = document.createElement('span');
      badge.className = 'tab-badge';
      btn.appendChild(badge);
    }
  } else {
    if (existing) existing.remove();
  }
}

/* ===================================================
   RÉCOLTE HORS-LIGNE
   =================================================== */

function showOfflineHarvestModal() {
  if (!offlineHarvestData) return;
  var data = offlineHarvestData;
  var el = document.getElementById('offline-content');
  if (!el) return;

  var h = '';

  /* Durée d'absence */
  h += '<div class="offline-elapsed-display">';
  h += '<span class="offline-elapsed-icon"><i class="fas fa-leaf" style="color:var(--success);"></i></span>';
  h += '<p class="offline-elapsed-label">Vous étiez absent pendant</p>';
  h += '<p class="offline-elapsed-value">' + formatAbsenceTime(data.elapsed) + '</p>';
  h += '</div>';

  /* Détail des récoltes */
  h += '<div class="offline-harvest-card">';
  h += '<p class="offline-harvest-title"><i class="fas fa-seedling"></i> ' + data.plots.length + ' caféier' + (data.plots.length > 1 ? 's' : '') + ' prêt' + (data.plots.length > 1 ? 's' : '') + ' à récolter</p>';
  h += '<div class="offline-harvest-list">';
  for (var i = 0; i < data.plots.length; i++) {
    var p = data.plots[i];
    h += '<div class="offline-harvest-row"><span>Parcelle ' + p.parcelle + ' · Empl. ' + p.slot + '</span><span>+' + p.yieldAmount + ' grains</span></div>';
  }
  h += '</div>';
  h += '<div class="offline-harvest-total"><span class="offline-harvest-total-label">Total</span><span class="offline-harvest-total-value">+' + data.totalBeans + ' grains</span></div>';
  h += '</div>';

  /* Bouton récolter */
  h += '<button class="btn btn-success" style="width:100%;" id="offline-harvest-btn"><i class="fas fa-hand-sparkles"></i> Récolter tout (' + data.plots.length + ')</button>';
  h += '<button class="offline-skip-btn" id="offline-skip-btn">Plus tard</button>';

  el.innerHTML = h;

  /* Événements */
  document.getElementById('offline-harvest-btn').addEventListener('click', function () {
    harvestAllReadyPlots();
    closeModal('offline-overlay');
    offlineHarvestData = null;
  });
  document.getElementById('offline-skip-btn').addEventListener('click', function () {
    closeModal('offline-overlay');
    offlineHarvestData = null;
  });
  document.getElementById('offline-close-btn').addEventListener('click', function () {
    closeModal('offline-overlay');
    offlineHarvestData = null;
  });

  openModal('offline-overlay');
}

function harvestAllReadyPlots() {
  var now = Date.now();
  var totalHarvested = 0;
  var harvestCount = 0;
  for (var pi = 0; pi < state.parcelles.length; pi++) {
    for (var pp = 0; pp < state.parcelles[pi].plots.length; pp++) {
      var plot = state.parcelles[pi].plots[pp];
      if (plot && (now - plot.plantedAt >= plot.growDuration)) {
        totalHarvested += plot.yieldAmount;
        harvestCount++;
        state.parcelles[pi].plots[pp] = null;
      }
    }
  }
  if (harvestCount > 0) {
    state.rawBeans += totalHarvested;
    state.stats.totalHarvested += totalHarvested;
    state.stats.totalHarvestActions += harvestCount;
    showToast('Récolte hors-ligne : +' + totalHarvested + ' grains (' + harvestCount + ' caféiers)', 'success');
    logEvent('Récolte hors-ligne : +' + totalHarvested + ' grains (' + harvestCount + ' caféiers)', 'success');
    /* Forcer le rebuild des parcelles */
    plotStates = [];
    for (var i = 0; i < getSlots(); i++) plotStates.push('init');
    initPlots();
    updateUI();
  }
}

function formatAbsenceTime(ms) {
  var seconds = Math.floor(ms / 1000);
  if (seconds < 60) return seconds + ' seconde' + (seconds > 1 ? 's' : '');
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' minute' + (minutes > 1 ? 's' : '');
  var hours = Math.floor(minutes / 60);
  if (hours < 24) {
    var remMin = minutes % 60;
    return hours + 'h' + (remMin > 0 ? ' ' + remMin + 'min' : '');
  }
  var days = Math.floor(hours / 24);
  var remHours = hours % 24;
  return days + ' jour' + (days > 1 ? 's' : '') + (remHours > 0 ? ' ' + remHours + 'h' : '');
}

/* ===================================================
   NAVIGATION
   =================================================== */

var currentTab = 'dashboard';
var offlineHarvestData = null;

function switchTab(tabId) {
  if (tabId === currentTab) return;
  var btns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < btns.length; i++) { var a = btns[i].getAttribute('data-tab') === tabId; btns[i].classList.toggle('active', a); btns[i].setAttribute('aria-selected', a ? 'true' : 'false'); }
  var panels = document.querySelectorAll('.tab-panel');
  for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
  var np = document.getElementById('tab-' + tabId); if (np) np.classList.add('active');
  currentTab = tabId;
  if (tabId === 'coffeeshop') { _recipesRendered = false; _repTierKey = ''; }
  if (tabId === 'magasin') _plantPurchKey = '';
  if (tabId === 'succes') _achievementsBuilt = false;
  if (tabId === 'dashboard') _dashboardLogBuilt = false;
  updateUI();
}

/* ===================================================
   BOUCLE PRINCIPALE
   =================================================== */

var lastFrameTime = 0, saveAcc = 0, uiAcc = 0, achieveAcc = 0;
var UI_INT = 180, ACHIEVE_INT = 2000;

function gameLoop(now) {
  if (lastFrameTime === 0) lastFrameTime = now;
  var dt = Math.min(now - lastFrameTime, 500); lastFrameTime = now;
  updateGardeners();
  updateBaristas();
  updateCustomers(dt);
  updateCommerce(dt);
  saveAcc += dt; if (saveAcc >= SAVE_INTERVAL) { saveAcc = 0; saveGame(); }
  achieveAcc += dt; if (achieveAcc >= ACHIEVE_INT) { achieveAcc = 0; checkAchievements(); }
  uiAcc += dt; if (uiAcc >= UI_INT) { uiAcc = 0; updateUI(); }
  requestAnimationFrame(gameLoop);
}

/* ===================================================
   INITIALISATION
   =================================================== */

function init() {
  state = createFreshState();
  loadGame();
  if (state.activityLog.length === 0) {
    logEvent('Bienvenue dans Coffee Tycoon ! Votre aventure caf\u00e9 commence ici.', 'info');
  }
  while (state.parcelles[state.currentParcelle].plots.length < state.parcelles[state.currentParcelle].slots) state.parcelles[state.currentParcelle].plots.push(null);
  state.counterSlots = Math.min(BASE_COUNTER_SLOTS + (state.upgrades.counter || 0), MAX_COUNTER_SLOTS);
  state.maxQueue = Math.min(BASE_QUEUE_SIZE + (state.upgrades.queue || 0) * 2, MAX_QUEUE_SIZE);
  plotStates = [];
  for (var i = 0; i < getSlots(); i++) plotStates.push('init');
  initPlots();

  var tabBtns = document.querySelectorAll('.tab-btn');
  for (var t = 0; t < tabBtns.length; t++) { (function(btn) { btn.addEventListener('click', function() { switchTab(btn.getAttribute('data-tab')); }); })(tabBtns[t]); }
  document.getElementById('shop-toggle-btn').addEventListener('click', toggleShop);

  /* Bouton paramètres */
  document.getElementById('settings-btn').addEventListener('click', function() { openModal('settings-overlay'); });
  document.getElementById('settings-close-btn').addEventListener('click', function() { closeModal('settings-overlay'); });

  /* Modal Aide */
  document.getElementById('help-btn').addEventListener('click', function() { openModal('help-overlay'); });
  document.getElementById('help-close-btn').addEventListener('click', function() { closeModal('help-overlay'); });

  /* Modal Reset confirmation */
  document.getElementById('reset-btn').addEventListener('click', function() { openModal('reset-overlay'); });
  document.getElementById('reset-cancel-btn').addEventListener('click', function() { closeModal('reset-overlay'); });
  document.getElementById('reset-confirm-btn').addEventListener('click', function() { doResetGame(); });

  /* Fermer les modals avec Escape */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (document.getElementById('help-overlay').classList.contains('visible')) { closeModal('help-overlay'); return; }
      if (document.getElementById('reset-overlay').classList.contains('visible')) { closeModal('reset-overlay'); return; }
      if (document.getElementById('settings-overlay').classList.contains('visible')) { closeModal('settings-overlay'); return; }
    }
  });

  var milkBtn = document.getElementById('buy-milk-btn');
  if (milkBtn) milkBtn.addEventListener('click', buyMilk);
  var urgentBtn = document.getElementById('toggle-urgent-btn');
  if (urgentBtn) urgentBtn.addEventListener('click', toggleUrgentOffers);

  updateUI();
  setTimeout(checkAchievements, 500);
  /* Afficher le modal de récolte hors-ligne si applicable */
  if (offlineHarvestData) {
    setTimeout(showOfflineHarvestModal, 600);
  }
  lastFrameTime = 0;
  requestAnimationFrame(gameLoop);
  window.addEventListener('beforeunload', function() { saveGame(); });
  document.addEventListener('visibilitychange', function() { if (document.hidden) saveGame(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();