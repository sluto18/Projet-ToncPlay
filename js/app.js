/* ============================================================
   PROJET TONCPLAY — Application (JavaScript vanilla, zéro dépendance)
   ------------------------------------------------------------
   Fonctionne en ouverture directe (file://) comme en ligne.

   Fichiers :
   • index.html ..... squelette de la page
   • css/style.css .. styles
   • js/data.js ..... LES DONNÉES (jeux & news) ← éditez ce fichier
   • js/app.js ...... ce fichier (logique d'affichage)
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     1. DONNÉES DÉRIVÉES
     (un genre inconnu trouvé dans GAMES est ajouté automatiquement
      en fin de filtres, avec la couleur accent par défaut)
     ============================================================ */
  const EXTRA_GENRES = [...new Set(GAMES.map(g => g.genre).filter(Boolean))]
    .filter(g => !GENRE_ORDER.includes(g));
  const ALL_GENRES = [...GENRE_ORDER, ...EXTRA_GENRES];

  const genreStyle = g => GENRE_STYLES[g] ||
    { color: '#00e676', bg: 'rgba(0,230,118,.09)', border: 'rgba(0,230,118,.32)' };

  const GENRE_COUNTS = { 'Tous': GAMES.length };
  ALL_GENRES.forEach(g => { GENRE_COUNTS[g] = GAMES.filter(x => x.genre === g).length; });

  /* ============================================================
     2. OUTILS
     ============================================================ */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* Normalisation (minuscules + sans accents) pour la recherche */
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* Badge automatique des news selon le début du titre */
  function getNewsBadge(title) {
    const t = (title || '').toLowerCase();
    if (t.startsWith('mise à jour')) return { label: 'MAJ',        color: '#ffb74d', bg: 'rgba(255,183,77,.12)',  border: 'rgba(255,183,77,.32)'  };
    if (t.startsWith('sortie'))      return { label: 'SORTIE',     color: '#00e676', bg: 'rgba(0,230,118,.1)',    border: 'rgba(0,230,118,.32)'   };
    return                                  { label: 'ÉVÉNEMENT', color: '#6bb6ff', bg: 'rgba(107,182,255,.1)',  border: 'rgba(107,182,255,.32)' };
  }

  /* ============================================================
     3. ICÔNES SVG
     ============================================================ */
  const ICONS = {
    play:     '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
    search:   '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    x:        '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chevron:  '<path d="m6 9 6 6 6-6"/>',
    home:     '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    gamepad:  '<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="3"/>',
    news:     '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
    grid:     '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
    list:     '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    sort:     '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    reset:    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    image:       '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    arrowLeft:   '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight:'<path d="m9 18 6-6-6-6"/>',
    dice: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>',
  };
  const icon = (name, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ============================================================
     4. ÉTAT GLOBAL
     ============================================================ */
  const state = { section: 'accueil', query: '', genre: 'Tous', sort: 'recent', view: 'grid', openNews: 0, detailGame: null, gamesScrollY: 0, skipGamesAnim: false, newsPage: 0 };
  let lastAnimKey = ''; /* mémorise genre|view pour savoir quand relancer le stagger */
  let lightbox = null; /* état de la visionneuse de screenshots */

  const NAV_ITEMS = [
    { id: 'accueil', label: 'Accueil',    icon: 'home'    },
    { id: 'jeux',    label: 'Jeux',       icon: 'gamepad' },
    { id: 'actus',   label: 'Actualités', icon: 'news'    },
  ];

  /* ============================================================
     5. NAVIGATION
     ============================================================ */
  function buildNav() {
    const desktop = $('#desktopNav');
    const mobile  = $('#mobileNav');

    NAV_ITEMS.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.nav = it.id;
      b.innerHTML = icon(it.icon, 15) + `<span>${it.label}</span>`;
      desktop.appendChild(b);
    });
    NAV_ITEMS.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.nav = it.id;
      b.innerHTML = icon(it.icon, 16) + `<span>${it.label}</span>`;
      mobile.appendChild(b);
    });
  }

  function updateNavStates() {
    $$('[data-nav]').forEach(btn => {
      const activeNav = state.section === 'detail' ? 'jeux' : state.section;
      const active = btn.dataset.nav === activeNav;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  /* Déplace la pilule sous le lien actif (nav desktop) */
  function moveNavPill() {
    const nav = $('#desktopNav');
    const slider = $('#navSlider');
    const el = nav.querySelector(`[data-nav="${state.section}"]`);
    if (!el) { slider.hidden = true; return; }
    const lr = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    slider.hidden = false;
    slider.style.left = (r.left - lr.left) + 'px';
    slider.style.width = r.width + 'px';
  }

  function switchSection(id) {
    if (!NAV_ITEMS.some(it => it.id === id)) return;
    state.section = id;
    closeMenu();

    $$('.page').forEach(p => { p.hidden = p.id !== 'page-' + id; });

    /* Relance l'animation d'entrée de la section */
    const page = $('#page-' + id);
    page.classList.remove('section-anim');
    void page.offsetWidth; /* force le reflow */
    page.classList.add('section-anim');

    window.scrollTo(0, 0);
    updateNavStates();
    moveNavPill();

    /* Relance le stagger des cartes à chaque visite de la page Jeux */
    if (id === 'jeux') renderGames(!state.skipGamesAnim);
    state.skipGamesAnim = false;
  }

/* ===== Menu burger mobile (déroulant compact) ===== */
let burgerEl = null, dropdownEl = null;

function closeMenu() {
  if (!burgerEl) return;
  burgerEl.classList.remove('open');
  dropdownEl.classList.remove('open');
  burgerEl.setAttribute('aria-expanded', 'false');
}

function initMenu() {
  burgerEl = $('#burger');
  dropdownEl = $('#navDropdown');

  burgerEl.addEventListener('click', e => {
    e.stopPropagation(); /* ce clic ne doit pas être vu comme un clic « extérieur » */
    if (dropdownEl.classList.contains('open')) {
      closeMenu();
    } else {
      burgerEl.classList.add('open');
      dropdownEl.classList.add('open');
      burgerEl.setAttribute('aria-expanded', 'true');
    }
  });

  /* Ferme le menu si on clique ailleurs sur la page */
  document.addEventListener('click', e => {
    if (!dropdownEl.classList.contains('open')) return;
    if (e.target.closest('#burger') || e.target.closest('#navDropdown')) return;
    closeMenu();
  });

  /* Échap ferme le menu */
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* Passage en desktop (redimensionnement) : referme le menu resté ouvert */
  window.addEventListener('resize', () => { if (window.innerWidth >= 768) closeMenu(); });
}

  /* ============================================================
     6. HÉROS — tilt 3D de l'image
     ============================================================ */
  function initHeroTilt() {
    const el = $('#heroTilt');
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    el.addEventListener('mousemove', e => {
      if (reduced) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(1000px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = 'perspective(1000px)'; });
  }

  /* ============================================================
     7. PAGE JEUX
     ============================================================ */
  function genreBadgeHTML(genre, small) {
    const s = genreStyle(genre);
    return `<span class="genre-badge${small ? ' small' : ''}" style="color:${s.color};background:${s.bg};border-color:${s.border}">${genre}</span>`;
  }

  function gameCardHTML(g, i, animate) {
    const reveal = animate ? ' reveal' : '';
    const delay  = animate ? `animation-delay:${(i * 0.05).toFixed(2)}s;` : '';
    const tags   = (g.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

    /* ----- Vue liste ----- */
    if (state.view === 'list') {
      return `<article class="game-card row spot-card${reveal}" style="${delay}" data-game="${g.title}" role="button" tabindex="0" aria-label="Voir la fiche de ${g.title}">
        <div class="cover-list"><img src="${g.img}" alt="${g.title}" loading="lazy" decoding="async"></div>
        <div class="card-main">
          <div class="title-row"><h3>${g.title}</h3>${genreBadgeHTML(g.genre, true)}</div>
          <p class="clamp-2">${g.desc}</p>
          <div class="tags">${tags}</div>
        </div>
        <a href="${g.link}" class="btn-play">${icon('play', 12)}Jouer</a>
      </article>`;
    }

    /* ----- Vue grille ----- */
    return `<article class="game-card spot-card${reveal}" style="${delay}" data-game="${g.title}" role="button" tabindex="0" aria-label="Voir la fiche de ${g.title}">
      <div class="cover">
        <img src="${g.img}" alt="${g.title}" loading="lazy" decoding="async">
        <span class="cover-shade"></span>
        ${genreBadgeHTML(g.genre, false)}
        <span class="date-chip">${g.date}</span>
      </div>
      <div class="card-main">
        <h3>${g.title}</h3>
        <p class="clamp-2">${g.desc}</p>
        <div class="tags">${tags}</div>
        <a href="${g.link}" class="btn-play">${icon('play', 13)}Jouer</a>
      </div>
    </article>`;
  }

  function buildGenreChips() {
    $('#genreRow').innerHTML = ['Tous', ...ALL_GENRES].map(g =>
      `<button type="button" class="chip${g === state.genre ? ' active' : ''}" data-genre="${g}">${g}<span class="chip-count">${GENRE_COUNTS[g] || 0}</span></button>`
    ).join('');
  }

  function renderGames(forceAnimate) {
    const grid = $('#gamesGrid');
    const empty = $('#gamesEmpty');

    /* ----- Filtrage ----- */
    const q = norm(state.query.trim());
    let list = GAMES.filter(g => {
      const okGenre = state.genre === 'Tous' || g.genre === state.genre;
      const okQuery = !q || [g.title, g.desc, g.genre, (g.tags || []).join(' ')].some(f => norm(f).includes(q));
      return okGenre && okQuery;
    });

    /* ----- Tri ----- */
    switch (state.sort) {
      case 'recent': list = [...list].sort((a, b) => (b.iso || '').localeCompare(a.iso || '')); break;
      case 'old':    list = [...list].sort((a, b) => (a.iso || '').localeCompare(b.iso || '')); break;
      case 'az':     list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'fr')); break;
      case 'za':     list = [...list].sort((a, b) => b.title.localeCompare(a.title, 'fr')); break;
      case 'genre':  list = [...list].sort((a, b) => (a.genre || '').localeCompare(b.genre || '', 'fr') || a.title.localeCompare(b.title, 'fr')); break;
    }

    /* Le stagger se relance au changement de genre/vue ou d'entrée
       sur la page — mais PAS à chaque frappe dans la recherche. */
    const animKey = state.genre + '|' + state.view;
    const animate = forceAnimate === true || animKey !== lastAnimKey;
    lastAnimKey = animKey;

    /* ----- Compteur (textContent : pas d'injection HTML) ----- */
    $('#resultCount').textContent =
      `${list.length} / ${GAMES.length} jeux` +
      (state.genre !== 'Tous' ? ` · ${state.genre}` : '') +
      (state.query.trim() ? ` · « ${state.query.trim()} »` : '');

    if (!list.length) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.style.display = '';
    grid.className = state.view === 'list' ? 'games-list' : 'games-grid';
    grid.innerHTML = list.map((g, i) => gameCardHTML(g, i, animate)).join('');
  }

  function resetFilters() {
    state.query = ''; state.genre = 'Tous'; state.sort = 'recent';
    $('#searchInput').value = '';
    $('#searchClear').hidden = true;
    $('#searchKbd').hidden = false;
    $('#sortSelect').value = 'recent';
    buildGenreChips();
    renderGames(false);
  }

  function buildEmptyState() {
    $('#gamesEmpty').innerHTML = `
      <div class="empty-icon">${icon('search', 22)}</div>
      <h3>Aucun jeu trouvé</h3>
      <p>Même Roger (l'IA) n'a rien trouvé. Essayez autre chose.</p>
      <button type="button" class="empty-reset" id="resetFilters">${icon('reset', 14)} Réinitialiser les filtres</button>`;
    $('#resetFilters').addEventListener('click', resetFilters);
  }

  function setView(v) {
    if (state.view === v) return;
    state.view = v;
    $('#viewGrid').classList.toggle('active', v === 'grid');
    $('#viewList').classList.toggle('active', v === 'list');
    renderGames(false); /* animKey change → le stagger repart */
  }

  function initGamesEvents() {
    const search = $('#searchInput');
    const clear  = $('#searchClear');
    const kbd    = $('#searchKbd');

    search.addEventListener('input', () => {
      state.query = search.value;
      clear.hidden = !state.query;
      kbd.hidden = !!state.query;
      renderGames(false);
    });

    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (state.query) {
          search.value = ''; state.query = '';
          clear.hidden = true; kbd.hidden = false;
          renderGames(false);
        } else {
          search.blur();
        }
      }
    });

    clear.addEventListener('click', () => {
      search.value = ''; state.query = '';
      clear.hidden = true; kbd.hidden = false;
      renderGames(false);
      search.focus();
    });

    $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; renderGames(false); });
    $('#viewGrid').addEventListener('click', () => setView('grid'));
    $('#viewList').addEventListener('click', () => setView('list'));

    /* Filtres genre (délégation : les puces sont reconstruites) */
    $('#genreRow').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.genre = chip.dataset.genre;
      $$('.chip', $('#genreRow')).forEach(c => c.classList.toggle('active', c === chip));
      renderGames(false); /* animKey change → le stagger repart */
    });

    /* Spotlight + fin d'animation (délégation sur le conteneur) */
    const results = $('#gamesResults');
    results.addEventListener('mousemove', e => {
      const card = e.target.closest('.spot-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    results.addEventListener('animationend', e => {
      if (e.animationName === 'revealUp') e.target.classList.add('done');
    });
        /* Clic sur une carte → fiche du jeu (le bouton « Jouer » garde son comportement) */
    results.addEventListener('click', e => {
      if (e.target.closest('a')) return; /* lien Jouer : le lien fait son travail */
      const card = e.target.closest('.game-card');
      if (card) openGameDetail(card.dataset.game);
    });

    /* Clavier : Entrée / Espace sur une carte → fiche du jeu */
    results.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('a')) return;
      const card = e.target.closest('.game-card');
      if (card) { e.preventDefault(); openGameDetail(card.dataset.game); }
    });
  }

  /* ===== Jeu aléatoire ===== */
function initRandomGame() {
  const btn = $('#randomGame');
  btn.addEventListener('click', () => {
    const g = GAMES[Math.floor(Math.random() * GAMES.length)];
    /* Relance l'animation du dé avant de partir */
    btn.classList.remove('rolling');
    void btn.offsetWidth;
    btn.classList.add('rolling');
    setTimeout(() => { window.location.href = g.link; }, 480);
  });
}

/* ============================================================
   PAGE FICHE JEU
   ============================================================ */
function openGameDetail(title) {
  const g = GAMES.find(x => x.title === title);
  if (!g) return;

  /* Mémorise la position de scroll de la grille pour le retour */
  if (state.section === 'jeux') state.gamesScrollY = window.scrollY;

  state.section = 'detail';
  state.detailGame = title;
  renderDetail(g);

  $$('.page').forEach(p => { p.hidden = p.id !== 'page-detail'; });
  const page = $('#page-detail');
  page.classList.remove('section-anim');
  void page.offsetWidth;
  page.classList.add('section-anim');

  window.scrollTo(0, 0);
  updateNavStates();
}

function closeDetail() {
  state.skipGamesAnim = true;              /* pas d'animation au retour */
  switchSection('jeux');
  window.scrollTo(0, state.gamesScrollY);  /* restaure la position dans la grille */
}

function renderDetail(g) {
  const s = genreStyle(g.genre);
  const screens = (g.screens && g.screens.length) ? g.screens : null;
  state.detailScreens = screens;
  const desc = g.descLong || g.desc;

  /* News liées : le titre de la news mentionne le titre du jeu */
  const relatedNews = NEWS.map((n, i) => ({ n, i }))
    .filter(o => norm(o.n.title).includes(norm(g.title)));

  /* Galerie : screenshots ou placeholder */
  const shotsHTML = screens
    ? `<div class="shots">${screens.map((src, i) =>
        `<button type="button" class="shot" data-shot="${i}" aria-label="Agrandir la capture ${i + 1}">
           <img src="${src}" alt="Capture d'écran ${i + 1} de ${g.title}" loading="lazy">
         </button>`).join('')}</div>`
    : `<div class="shots-empty">
         <div class="shots-empty-icon">${icon('image', 24)}</div>
         <p class="shots-empty-title">Screenshots bientôt disponibles</p>
         <p class="shots-empty-sub">Les rushs sont encore au montage. Revenez vite, ça va clignoter.</p>
       </div>`;

  /* Journal du jeu (section masquée si aucune news liée) */
  const journalHTML = relatedNews.length ? `
    <section class="detail-section">
      <p class="detail-kicker">// Journal du jeu</p>
      <h3>Ça s'est passé ici</h3>
      <div class="journal-list">
        ${relatedNews.map(({ n, i }) => {
          const b = getNewsBadge(n.title);
          return `<button type="button" class="journal-item" data-open-news="${i}">
            <span class="news-badge" style="color:${b.color};background:${b.bg};border-color:${b.border}">${b.label}</span>
            <span class="journal-date">${n.date}</span>
            <span class="journal-title">${n.title}</span>
            <span class="journal-arrow">${icon('chevronRight', 14)}</span>
          </button>`;
        }).join('')}
      </div>
    </section>` : '';

  $('#detailContent').innerHTML = `
    <button type="button" class="btn-back" data-action="back">${icon('arrowLeft', 14)}<span>Retour</span></button>

    <div class="detail-hero">
      <div class="detail-cover">
        <img src="${g.img}" alt="${g.title}">
        <span class="genre-badge" style="color:${s.color};background:${s.bg};border-color:${s.border}">${g.genre}</span>
      </div>
      <div class="detail-info">
        <h2>${g.title}</h2>
        <p class="detail-release">Sorti le <b>${g.date}</b> · Gratuit · Jouable dans le navigateur</p>
        <div class="tags">${(g.tags || []).map(t => `<span class="tag">#${t}</span>`).join('')}</div>
        <a href="${g.link}" class="btn-play btn-play-big">${icon('play', 15)}<span>Jouer maintenant</span></a>
      </div>
    </div>

    <section class="detail-section">
      <p class="detail-kicker">// À propos</p>
      <h3>Le concept</h3>
      <p class="detail-desc">${desc}</p>
    </section>

    <section class="detail-section">
      <p class="detail-kicker">// Galerie</p>
      <h3>Screenshots</h3>
      ${shotsHTML}
    </section>

    ${journalHTML}

    <div class="detail-actions">
      <button type="button" class="btn-back" data-action="back">${icon('arrowLeft', 14)}<span>Retour aux jeux</span></button>
      <a href="${g.link}" class="btn-play btn-play-big">${icon('play', 15)}<span>Jouer à ${g.title}</span></a>
    </div>
  `;
}

/* Ouvre la page Actualités, sur la bonne page, directement dépliée sur la news choisie */
function goToNews(idx) {
  state.newsPage = Math.floor(idx / NEWS_PER_PAGE); /* bascule sur la page qui contient la news */
  switchSection('actus');
  renderNews();
  if (state.openNews !== idx) toggleNews(idx);
  const card = $(`.news-card[data-news="${idx}"]`, $('#newsList'));
  if (card) requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

/* ===== Visionneuse de screenshots (lightbox) ===== */
function openLightbox(screens, idx) {
  closeLightbox();
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <button type="button" class="lb-btn lb-close" aria-label="Fermer">${icon('x', 18)}</button>
    <button type="button" class="lb-btn lb-prev" aria-label="Capture précédente">${icon('chevronLeft', 16)}</button>
    <img src="${screens[idx]}" alt="Capture d'écran agrandie">
    <button type="button" class="lb-btn lb-next" aria-label="Capture suivante">${icon('chevronRight', 16)}</button>
    <span class="lb-count"></span>`;
  document.body.appendChild(lb);
  document.body.style.overflow = 'hidden';
  lightbox = { screens, idx, lb };

  const show = () => {
    $('img', lb).src = lightbox.screens[lightbox.idx];
    $('.lb-count', lb).textContent = (lightbox.idx + 1) + ' / ' + lightbox.screens.length;
    const multi = lightbox.screens.length > 1;
    $('.lb-prev', lb).hidden = !multi;
    $('.lb-next', lb).hidden = !multi;
  };
  lightbox.show = show;
  show();

  lb.addEventListener('click', e => {
    if (e.target.closest('.lb-close')) { closeLightbox(); return; }
    if (e.target.closest('.lb-prev'))  { lightbox.idx = (lightbox.idx - 1 + lightbox.screens.length) % lightbox.screens.length; show(); return; }
    if (e.target.closest('.lb-next'))  { lightbox.idx = (lightbox.idx + 1) % lightbox.screens.length; show(); return; }
    if (!e.target.closest('img')) closeLightbox(); /* clic sur le fond */
  });
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.lb.remove();
  lightbox = null;
  document.body.style.overflow = '';
}

function initDetailEvents() {
  const page = $('#page-detail');

  /* Clics dans la fiche (délégation) */
  page.addEventListener('click', e => {
    if (e.target.closest('[data-action="back"]')) { closeDetail(); return; }
    if (e.target.closest('[data-open-news]'))     { goToNews(parseInt(e.target.closest('[data-open-news]').dataset.openNews, 10)); return; }
    const shot = e.target.closest('.shot');
    if (shot && state.detailScreens) openLightbox(state.detailScreens, parseInt(shot.dataset.shot, 10));
  });

  /* Clavier de la visionneuse : Échap ferme, flèches naviguent */
  document.addEventListener('keydown', e => {
    if (!lightbox) return;
    if (e.key === 'Escape')          { closeLightbox(); }
    else if (e.key === 'ArrowLeft')  { lightbox.idx = (lightbox.idx - 1 + lightbox.screens.length) % lightbox.screens.length; lightbox.show(); }
    else if (e.key === 'ArrowRight') { lightbox.idx = (lightbox.idx + 1) % lightbox.screens.length; lightbox.show(); }
  });
}

/* ============================================================
   PAGE ACTUALITÉS (paginée : 10 news par page)
   ============================================================ */
const NEWS_PER_PAGE = 10;

/* Numéros de pages à afficher : [1, …, 4, 5, 6, …, 9] si beaucoup de pages */
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

function renderNews() {
  const totalPages = Math.max(1, Math.ceil(NEWS.length / NEWS_PER_PAGE));
  if (state.newsPage > totalPages - 1) state.newsPage = 0; /* news supprimées : retour page 1 */
  const start = state.newsPage * NEWS_PER_PAGE;
  const slice = NEWS.slice(start, start + NEWS_PER_PAGE);

  /* data-news porte l'index GLOBAL (utilisé par le journal des fiches jeu) */
  $('#newsList').innerHTML = slice.map((n, k) => {
    const i = start + k;
    const b = getNewsBadge(n.title);
    const open = state.openNews === i;
    return `<article class="news-card reveal${open ? ' open' : ''}" style="animation-delay:${Math.min(k, 8) * 0.05}s" data-news="${i}">
      <div class="news-head" role="button" tabindex="0" aria-expanded="${open}">
        <span class="news-thumb"><img src="${n.img}" alt="" loading="lazy" decoding="async"></span>
        <span class="news-meta">
          <span class="news-title-row">
            <span class="news-badge" style="color:${b.color};background:${b.bg};border-color:${b.border}">${b.label}</span>
            <h3>${n.title}</h3>
          </span>
          <span class="news-date">${icon('calendar', 11)}${n.date}</span>
        </span>
        <span class="news-toggle">${icon('chevron', 15)}</span>
      </div>
      <div class="acc-body${open ? ' open' : ''}">
        <div class="acc-inner">
          <div class="news-rich">${n.text}</div>
        </div>
      </div>
    </article>`;
  }).join('');

  /* Pagination (masquée s'il n'y a qu'une seule page) */
  const pag = $('#newsPagination');
  if (totalPages <= 1) { pag.hidden = true; pag.innerHTML = ''; return; }
  pag.hidden = false;
  const cur = state.newsPage + 1;
  let html = `<button type="button" class="page-btn" data-page="${state.newsPage - 1}"${state.newsPage === 0 ? ' disabled' : ''} aria-label="Page précédente">${icon('chevronLeft', 14)}</button>`;
  pageNumbers(state.newsPage, totalPages).forEach(p => {
    if (p === '…') html += `<span class="page-ellipsis">…</span>`;
    else html += `<button type="button" class="page-btn${p === cur ? ' active' : ''}" data-page="${p - 1}"${p === cur ? ' aria-current="page"' : ''}>${p}</button>`;
  });
  html += `<button type="button" class="page-btn" data-page="${state.newsPage + 1}"${state.newsPage === totalPages - 1 ? ' disabled' : ''} aria-label="Page suivante">${icon('chevronRight', 14)}</button>`;
  pag.innerHTML = html;
}

function toggleNews(i) {
  state.openNews = state.openNews === i ? -1 : i;
  $$('.news-card', $('#newsList')).forEach(card => {
    const open = parseInt(card.dataset.news, 10) === state.openNews;
    card.classList.toggle('open', open);
    $('.acc-body', card).classList.toggle('open', open);
    $('.news-head', card).setAttribute('aria-expanded', open);
  });
}

function initNewsEvents() {
  const list = $('#newsList');

  list.addEventListener('click', e => {
    const head = e.target.closest('.news-head');
    if (head) toggleNews(parseInt(head.closest('.news-card').dataset.news, 10));
  });

  list.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest('.news-head');
    if (head) { e.preventDefault(); head.click(); }
  });

  list.addEventListener('animationend', e => {
    if (e.animationName === 'revealUp') e.target.classList.add('done');
  });

  /* ===== Pagination ===== */
  $('#newsPagination').addEventListener('click', e => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    const p = parseInt(btn.dataset.page, 10);
    const totalPages = Math.ceil(NEWS.length / NEWS_PER_PAGE);
    if (p < 0 || p >= totalPages || p === state.newsPage) return;
    state.newsPage = p;
    state.openNews = -1; /* on referme la news ouverte en changeant de page */
    renderNews();
    /* Remonte au début de la liste, sous le header fixe */
    const y = $('#newsList').getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
}

  /* ============================================================
     9. RACCOURCIS CLAVIER
     ============================================================ */
  function initShortcuts() {
    /* « / » : bascule sur la page Jeux et focus la recherche */
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName)) {
        e.preventDefault();
        if (state.section !== 'jeux') switchSection('jeux');
        $('#searchInput').focus();
      }
    });

    /* Clic sur n'importe quel bouton [data-nav] (logo, nav, menu mobile) */
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-nav]');
      if (btn) switchSection(btn.dataset.nav);
    });
  }

  /* ============================================================
     10. INITIALISATION
     ============================================================ */
  function init() {
    /* Icônes statiques présentes dans le HTML */
    $$('[data-icon]').forEach(el => {
      el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 14);
    });
    $('#searchClear').innerHTML = icon('x', 12);
    $('#viewGrid').innerHTML   = icon('grid', 12);
    $('#viewList').innerHTML   = icon('list', 12);

    buildEmptyState();
    buildNav();
    buildGenreChips();
    initMenu();
    initHeroTilt();
    initGamesEvents();
    initRandomGame();
    initNewsEvents();
    initDetailEvents();
    initShortcuts();

    $('#gamesCount').textContent =
      `${GAMES.length} titres gratuits, jouables directement dans votre navigateur.`;

    renderNews();
    renderGames(true);

    /* Section visible au chargement + état de la navigation */
    $('#page-accueil').classList.add('section-anim');
    updateNavStates();
    moveNavPill();
    setTimeout(moveNavPill, 150); /* re-mesure après rendu complet */
    window.addEventListener('resize', moveNavPill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveNavPill);
  }

  document.addEventListener('DOMContentLoaded', init);
})();