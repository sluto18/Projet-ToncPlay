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
    dice: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>',
  };
  const icon = (name, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ============================================================
     4. ÉTAT GLOBAL
     ============================================================ */
  const state = { section: 'accueil', query: '', genre: 'Tous', sort: 'recent', view: 'grid', openNews: 0 };
  let lastAnimKey = ''; /* mémorise genre|view pour savoir quand relancer le stagger */

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
      b.innerHTML = icon(it.icon, 26) + `<span>${it.label}</span>`;
      mobile.appendChild(b);
    });
  }

  function updateNavStates() {
    $$('[data-nav]').forEach(btn => {
      const active = btn.dataset.nav === state.section;
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
    if (id === 'jeux') renderGames(true);
  }

  /* ===== Menu burger mobile ===== */
  let burgerEl = null, overlayEl = null;

  function closeMenu() {
    if (!burgerEl) return;
    burgerEl.classList.remove('open');
    overlayEl.classList.remove('open');
    burgerEl.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function initMenu() {
    burgerEl = $('#burger');
    overlayEl = $('#navOverlay');

    burgerEl.addEventListener('click', () => {
      if (overlayEl.classList.contains('open')) {
        closeMenu();
      } else {
        burgerEl.classList.add('open');
        overlayEl.classList.add('open');
        burgerEl.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }
    });

    overlayEl.addEventListener('click', e => { if (!e.target.closest('button')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
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
      return `<article class="game-card row spot-card${reveal}" style="${delay}">
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
    return `<article class="game-card spot-card${reveal}" style="${delay}">
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
     8. PAGE ACTUALITÉS
     ============================================================ */
  function renderNews() {
    $('#newsList').innerHTML = NEWS.map((n, i) => {
      const b = getNewsBadge(n.title);
      const open = state.openNews === i;
      return `<article class="news-card reveal${open ? ' open' : ''}" style="animation-delay:${Math.min(i, 8) * 0.05}s">
        <div class="news-head" role="button" tabindex="0" data-news="${i}" aria-expanded="${open}">
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
  }

  function toggleNews(i) {
    state.openNews = state.openNews === i ? -1 : i;
    $$('.news-card', $('#newsList')).forEach((card, idx) => {
      const open = idx === state.openNews;
      card.classList.toggle('open', open);
      $('.acc-body', card).classList.toggle('open', open);
      $('.news-head', card).setAttribute('aria-expanded', open);
    });
  }

  function initNewsEvents() {
    const list = $('#newsList');

    list.addEventListener('click', e => {
      const head = e.target.closest('.news-head');
      if (head) toggleNews(parseInt(head.dataset.news, 10));
    });

    /* Support clavier (Enter / Espace) */
    list.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const head = e.target.closest('.news-head');
      if (head) { e.preventDefault(); head.click(); }
    });

    list.addEventListener('animationend', e => {
      if (e.animationName === 'revealUp') e.target.classList.add('done');
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