(function () {
  'use strict';

const SUPABASE_URL      = 'https://zdqfwohllyuhdcorxieg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcWZ3b2hsbHl1aGRjb3J4aWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1Mjk0OTIsImV4cCI6MjEwODEwNTQ5Mn0.P7SM20pWVNIILw7OsVMUpWywrKuhGQsA0sZMQ7GbHVE';

  const FORUM = {
    topicsPerPage: 8,    
    postsPerPage:  6,   
    maxPseudo: 30,     
    maxTitle:  150,      
    maxChars: 1000,    
    cooldown: 10,      
    storageDemo:   'toncplay_forum_v2_demo',   
    storagePseudo: 'toncplay_forum_pseudo',    
    storageToken:  'toncplay_forum_token',    
  };

  const TAGLINE = 'Le QG des discussions du Projet ToncPlay : catégories, forums, sous-forums et sujets.';

  const isConfigured = !SUPABASE_URL.includes('VOTRE-PROJET')
                    && !SUPABASE_ANON_KEY.includes('VOTRE_CLE')
                    && typeof window.supabase !== 'undefined';

  const db = isConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const state = {
    view: 'home',       // home | forum | topic | newtopic
    forumId: null,
    topicId: null,
    page: 1,
    cooldownUntil: 0,   // anti-spam : timestamp limite
    cooldownTimer: null,
  };

  const AVATAR_COLORS = ['#00e676', '#2dff97', '#6bb6ff', '#4dd0e1', '#ffb74d', '#ff8a65', '#ba68c8', '#f06292'];


  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }


  function hashString(str) {
    let h = 0;
    for (const c of String(str || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
  }

  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function avatarStyle(pseudo) {
    const c = AVATAR_COLORS[hashString(pseudo) % AVATAR_COLORS.length];
    return 'color:' + c + ';background:' + hexToRgba(c, .12) + ';border-color:' + hexToRgba(c, .35);
  }

  function initials(pseudo) {
    const parts = String(pseudo || '?').trim().split(/\s+/);
    return ((parts[0][0] || '?') + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function timeAgo(iso) {
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 45)   return "à l'instant";
    const m = Math.floor(s / 60); if (m < 60) return 'il y a ' + m + ' min';
    const h = Math.floor(m / 60); if (h < 24) return 'il y a ' + h + ' h';
    const d = Math.floor(h / 24); if (d < 7)  return 'il y a ' + d + ' j';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fullDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
         + ' à ' + new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function savedPseudo() { try { return localStorage.getItem(FORUM.storagePseudo) || ''; } catch (e) { return ''; } }
  function savePseudo(v) { try { localStorage.setItem(FORUM.storagePseudo, v); } catch (e) {} }

  function getToken() {
    let t = null;
    try { t = localStorage.getItem(FORUM.storageToken); } catch (e) {}
    if (!t) {
      t = 'tp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
      try { localStorage.setItem(FORUM.storageToken, t); } catch (e) {}
    }
    return t;
  }

  async function sha256Hex(str) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    return (((h1 >>> 0).toString(16)) + ((h2 >>> 0).toString(16))).padEnd(64, '0').slice(0, 64);
  }

  let tokenHashPromise = null;
  function getTokenHash() {          
    if (!tokenHashPromise) tokenHashPromise = sha256Hex(getToken());
    return tokenHashPromise;
  }

  /* Annonce discrète pour les lecteurs d'écran */
  function announce(text) {
    const zone = $('#forumAnnounce');
    if (!zone) return;
    zone.textContent = '';
    setTimeout(() => { zone.textContent = text; }, 50);
  }

  function friendlyError(err) {
    const raw = (err && (err.message || err.msg || err.hint || err.details)) || String(err || '');
    if (/failed to fetch|networkerror|load failed/i.test(raw))
      return "Serveur injoignable : vérifiez l'URL du projet et votre connexion.";
    if (/jwt|api[- ]?key|invalid api key/i.test(raw))
      return 'Clé ou URL invalide : recopiez-les depuis Settings → API (GUIDE §3).';
    if (/relation .* does not exist|schema cache/i.test(raw))
      return "Les tables du forum sont introuvables : exécutez d'abord supabase-forum.sql dans l'éditeur SQL (GUIDE §2).";
    if (/row-level security|policy/i.test(raw))
      return 'Refusé par la sécurité RLS : rejouez le script supabase-forum.sql (GUIDE §2).';
    if (/verrouill/i.test(raw))
      return 'Ce forum ou ce sujet est verrouillé.';
    if (/jeton invalide|introuvable/i.test(raw))
      return "Action refusée : ce contenu n'est pas le vôtre (ou le jeton a changé).";
    if (/impossible de supprimer un sujet/i.test(raw))
      return 'Impossible de supprimer un sujet qui a reçu des réponses.';
    if (raw) return 'Erreur : ' + raw;
    return 'Erreur inconnue — ouvrez la console (F12) pour les détails.';
  }

  const ICONS = {
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    chat:   '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    lock:   '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    pin:    '<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
    eye:    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    reply:  '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    edit:   '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    back:   '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    send:   '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  };
  const icon = (name, size) =>
    '<svg viewBox="0 0 24 24" width="' + (size || 14) + '" height="' + (size || 14) +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || '') + '</svg>';


  const DEMO_HASH = 'f'.repeat(58) + 'c0ffee';  

  const DemoDB = {
    d: null,

    load() {
      let parsed = null;
      try { parsed = JSON.parse(localStorage.getItem(FORUM.storageDemo) || 'null'); }
      catch (e) { parsed = null; }
      this.d = (parsed && parsed.topics && parsed.forums) ? parsed : demoSeed();
      this.save();
      return this.d;
    },

    save() {
      try { localStorage.setItem(FORUM.storageDemo, JSON.stringify(this.d)); }
      catch (e) { console.warn('[Forum] localStorage indisponible :', e); }
    },

    overviewOf(f) {
      const d = this.d;
      const topics = d.topics.filter(t => t.forum_id === f.id);
      const ids = new Set(topics.map(t => t.id));
      const posts = d.posts.filter(p => ids.has(p.topic_id));
      let last = null;
      for (const p of posts) if (!last || p.created_at > last.created_at) last = p;
      const lastTopic = last ? d.topics.find(t => t.id === last.topic_id) : null;
      const parent = f.parent_id ? d.forums.find(x => x.id === f.parent_id) : null;
      const cat = d.categories.find(c => c.id === f.category_id);
      return {
        id: f.id, category_id: f.category_id, parent_id: f.parent_id,
        parent_name: parent ? parent.name : null,
        slug: f.slug, name: f.name, description: f.description,
        position: f.position, is_locked: f.is_locked,
        category_name: cat ? cat.name : '',
        topic_count: topics.length, post_count: posts.length,
        last_topic_id: lastTopic ? lastTopic.id : null,
        last_topic_title: lastTopic ? lastTopic.title : null,
        last_author: last ? last.author : null,
        last_activity: last ? last.created_at : null,
      };
    },

    topicOverviewOf(t) {
      const d = this.d;
      const posts = d.posts.filter(p => p.topic_id === t.id)
                           .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      const f = d.forums.find(x => x.id === t.forum_id);
      const parent = f.parent_id ? d.forums.find(x => x.id === f.parent_id) : null;
      const cat = d.categories.find(c => c.id === f.category_id);
      const last = posts[posts.length - 1] || null;
      return Object.assign({}, t, {
        post_count: posts.length,
        last_post_author: last ? last.author : null,
        last_post_at: last ? last.created_at : null,
        forum_name: f.name, forum_parent_id: f.parent_id,
        forum_parent_name: parent ? parent.name : null,
        forum_locked: !!f.is_locked,
        category_name: cat ? cat.name : '',
      });
    },
  };

  function demoSeed() {
    const now = Date.now();
    const iso = min => new Date(now - min * 60000).toISOString();
    const d = { nextId: 1, categories: [], forums: [], topics: [], posts: [] };

    const cat = (id, name, description) =>
      d.categories.push({ id, slug: 'c' + id, name, description, position: id, created_at: iso(43200) });

    const forum = (id, categoryId, parentId, name, description, locked) =>
      d.forums.push({ id, category_id: categoryId, parent_id: parentId || null,
        slug: 'f' + id, name, description, position: id, is_locked: !!locked, created_at: iso(40320) });

    const topic = (id, forumId, title, author, pinned, views, createdMin, posts) => {
      d.topics.push({ id, forum_id: forumId, title, author, author_token_hash: DEMO_HASH,
        is_pinned: !!pinned, is_locked: false, views: views || 0,
        created_at: iso(createdMin), last_activity_at: iso(Math.min.apply(null, posts.map(p => p[1]))) });
      posts.forEach(p => d.posts.push({ id: d.nextId++, topic_id: id, author: p[0],
        author_token_hash: DEMO_HASH, content: p[2], created_at: iso(p[1]), edited_at: null }));
    };

    cat(1, 'Communauté',          'Présentez-vous, papotez, partagez vos records.');
    cat(2, 'Le Projet ToncPlay', "L'atelier du créateur : idées, annonces et coulisses.");
    cat(3, 'Entraide',           'Bloqué sur un jeu ? La communauté débloque.');

    forum(1,  1, null, 'Discussions générales', 'Le grand fil : tout ce qui tourne autour des jeux ToncPlay.');
    forum(2,  1, 1,    'Présentations',          'Nouveau joueur ? Passez dire bonjour !');
    forum(3,  1, 1,    'Le bar à café',          'Hors-sujet garanti, café optionnel.');
    forum(4,  1, null, 'Vos jeux préférés',     'Vos coups de cœur, vos records, vos avis.');
    forum(5,  2, null, 'Idées & suggestions',   'Une idée pour améliorer le site ou un jeu ? C\u2019est ici.');
    forum(6,  2, 5,    'Idées de jeux',         'Proposez vos concepts, croquis et mécaniques.');
    forum(7,  2, null, 'Annonces officielles',  'Les nouvelles du Projet, par Sluto. (lecture seule)', true);
    forum(8,  3, null, 'Bugs & problèmes',      'Un jeu qui plante, une page qui déconne ? Dites tout.');
    forum(9,  3, null, 'FAQ & astuces',         'Questions fréquentes et bonnes astuces.');

    const M = 1, H = 60 * M, J = 24 * H;
    topic(1,  1, "Règles du forum — lisez-moi d'abord", 'Sluto', true, 42, 7 * J, [
      ['Sluto', 7 * J, "Trois règles, pas plus :\n1. Soyez sympas, on est là pour jouer.\n2. Pas de spam, Roger lit tout (il voit TOUT, même la nuit).\n3. Un bug ? Direction « Entraide » avec un maximum de détails."],
      ['Roger', 2 * J, 'Approuvé. Et appliqué. Surtout la règle 2.'],
    ]);
    topic(2,  1, 'Bienvenue sur le nouveau forum du Projet ToncPlay !', 'Roger', false, 27, 5 * J, [
      ['Roger', 5 * J, "Bonjour à toutes et à tous ! Le forum remplace enfin le vieux livre d'or : catégories, sous-forums, sujets… de quoi discuter proprement."],
      ['Sluto', 3 * J, 'Piochez une catégorie et lancez la discussion. Et oui, un VRAI forum cette fois.'],
      ['PixelPirate', 20 * M, 'Premier ! (désolé, il fallait que ça soit fait)'],
    ]);
    topic(3,  1, 'Votre jeu préféré de la ludothèque ?', 'PixelPirate', false, 15, 2 * J, [
      ['PixelPirate', 2 * J, "Moi c'est simple : Snake Indiscret. Je fais des scores honteusement bas, mais j'adore ça."],
      ['MissCliq', 1 * J, "Le mien : celui où Roger apparaît en cameo. Vous saurez pourquoi."],
    ]);
    topic(4,  1, 'Le topic des records', 'MissCliq', false, 9, 30 * H, [
      ['MissCliq', 30 * H, 'Postez vos records, je maintiens le tableau des 10 meilleurs. Preuves à l\u2019appui, pas de triche !'],
    ]);
    topic(5,  1, 'Une mission secrète se cache quelque part…', 'Sluto', false, 31, 3 * J, [
      ['Sluto', 3 * J, 'Indice n°1 : elle ne s\u2019active que le mardi. Indice n°2 : regardez le pied de la page d\u2019accueil. Bonne chasse.'],
      ['PixelPirate', 6 * H, 'Trouvé ! Je dis rien ici, les autres méritent de chercher aussi.'],
    ]);
    topic(6,  1, "Suggestions d'amélioration du site", 'PixelPirate', false, 12, 4 * J, [
      ['PixelPirate', 4 * J, 'Un bouton « retour en haut » sur les pages longues ? Le footer est loin quand on scrolle.'],
      ['Sluto', 20 * H, 'Bonne idée, notée pour la prochaine mise à jour.'],
    ]);
    topic(7,  1, 'Deux mots par jour #challenge', 'MissCliq', false, 6, 2 * J, [
      ['MissCliq', 2 * J, 'Le concept : décrire votre journée en exactement deux mots. Je commence : « pixels obtenus ».'],
    ]);
    topic(8,  1, 'Le fil des captures d\u2019écran', 'Roger', false, 8, 3 * J, [
      ['Roger', 3 * J, 'Vos plus beaux moments de jeu, en image. Un bon vieux fil à captures, comme au bon vieux temps.'],
      ['MissCliq', 5 * H, 'J\u2019attache celle de ma mort absurde au niveau 3. C\u2019est de l\u2019art.'],
    ]);
    topic(9,  1, 'Quelle plateforme pour jouer ?', 'MissCliq', false, 5, 40 * H, [
      ['MissCliq', 40 * H, 'PC, mobile, console de salon, frigo connecté ? On joue à ToncPlay sur quoi chez vous ?'],
    ]);
    topic(10, 1, 'Patch note du forum v2', 'Sluto', false, 18, 26 * H, [
      ['Sluto', 26 * H, 'Ajouté : catégories, sous-forums, épinglage, verrouillage, édition de messages, pagination, compteur de vues. Retiré : le silence.'],
      ['Roger', 2 * H, 'Mise à jour approuvée. Le bar à café reste mon sous-forum préféré.'],
    ]);
    topic(11, 2, 'Salut, moi c\u2019est PixelPirate', 'PixelPirate', false, 8, 4 * J, [
      ['PixelPirate', 4 * J, 'Salut ! Pixel collector, amateur de jeux avec trop de pixels et juste assez de café. Ravi d\u2019être là.'],
      ['MissCliq', 3 * J, 'Bienvenue par ici ! Accroche-toi, les scores montent vite.'],
    ]);
    topic(12, 2, 'Nouvelle ici — MissCliq', 'MissCliq', false, 4, 3 * J, [
      ['MissCliq', 3 * J, 'Bonjour de la part d\u2019une joueuse du dimanche (et parfois du mercredi). Promis, je thread bien.'],
    ]);
    topic(13, 3, 'Le vrai sujet : café ou thé ?', 'Roger', false, 22, 2 * J, [
      ['Roger', 2 * J, 'Question d\u2019une importance capitale. (La réponse attendue est « cacao ». Choisissez bien.)'],
      ['MissCliq', 50 * M, 'Cacao, évidemment. Un forum qui commence par une bonne question.'],
    ]);
    topic(14, 4, 'Snake Indiscret : mon top 3', 'PixelPirate', false, 7, 20 * H, [
      ['PixelPirate', 20 * H, '1. Les virages serrés à gauche. 2. La pomme dorée du niveau 4. 3. Le mode deux serpents (rumeur ou réalité ?).'],
    ]);
    topic(15, 5, 'Un mode 2 joueurs ?', 'MissCliq', false, 14, 2 * J, [
      ['MissCliq', 2 * J, 'Un petit mode 2 joueurs local, même sur un seul clavier, serait parfait pour les soirées.'],
      ['Sluto', 9 * H, 'C\u2019est sur la liste ! Pas de date, mais c\u2019est sur la liste.'],
    ]);
    topic(16, 6, 'Et si on faisait un tower defense ?', 'PixelPirate', false, 9, 30 * H, [
      ['PixelPirate', 30 * H, 'Des pixels, des vagues d\u2019ennemis, un café qui refroidit : le tower defense parfait. Qui est partant ?'],
    ]);
    topic(17, 7, 'Le forum ouvre ses portes !', 'Sluto', true, 63, 6 * J, [
      ['Sluto', 6 * J, "C'est officiel : le forum du Projet ToncPlay est ouvert !\nCatégories, sous-forums, réponses, édition, tout y est. À vous de jouer."],
    ]);
    topic(18, 8, 'Le jeu se bloque au niveau 3 (Safari)', 'MissCliq', false, 11, 1 * J, [
      ['MissCliq', 1 * J, "Impossible de passer le niveau 3 sous Safari, l'écran gèle après le deuxième tir. Une idée ?"],
      ['Sluto', 20 * M, 'Bien vu, je regarde ça ce week-end. En attendant : Firefox ou Chrome le contourne.'],
    ]);
    topic(19, 9, 'Comment retrouver mes scores ?', 'PixelPirate', false, 6, 26 * H, [
      ['PixelPirate', 26 * H, 'Question bête : mes scores sont-ils sauvés quelque part ? Je change souvent de navigateur.'],
    ]);

    return d;
  }

  const byId = (arr, id) => arr.find(x => String(x.id) === String(id));

  const DemoAPI = {
    isDemo: true,

    async getHome() {
      const d = DemoDB.d || DemoDB.load();
      return {
        categories: d.categories.slice().sort((a, b) => a.position - b.position),
        forums: d.forums.map(f => DemoDB.overviewOf(f)).sort((a, b) => a.position - b.position),
      };
    },

    async getForum(forumId, page) {
      const d = DemoDB.d || DemoDB.load();
      const f = byId(d.forums, forumId);
      if (!f) return { forum: null, subs: [], topics: [], total: 0 };
      const all = d.topics.filter(t => t.forum_id === f.id)
        .map(t => DemoDB.topicOverviewOf(t))
        .sort((a, b) => (b.is_pinned - a.is_pinned) ||
                        (a.last_activity_at < b.last_activity_at ? 1 : -1));
      return {
        forum: DemoDB.overviewOf(f),
        subs: d.forums.filter(x => x.parent_id === f.id).map(x => DemoDB.overviewOf(x)),
        topics: all.slice((page - 1) * FORUM.topicsPerPage, page * FORUM.topicsPerPage),
        total: all.length,
      };
    },

    async getTopic(topicId, page) {
      const d = DemoDB.d || DemoDB.load();
      const t = byId(d.topics, topicId);
      if (!t) return { topic: null, posts: [], total: 0 };
      const all = d.posts.filter(p => p.topic_id === t.id)
        .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
      return {
        topic: DemoDB.topicOverviewOf(t),
        posts: all.slice((page - 1) * FORUM.postsPerPage, page * FORUM.postsPerPage),
        total: all.length,
      };
    },

    async getRawPost(postId) {
      const d = DemoDB.d || DemoDB.load();
      const p = byId(d.posts, postId);
      return p ? p.content : '';
    },

    async createTopic(forumId, title, author, content, hash) {
      const d = DemoDB.d || DemoDB.load();
      const f = byId(d.forums, forumId);
      if (!f) throw new Error('Forum introuvable.');
      if (f.is_locked) throw new Error('Ce forum est verrouillé : impossible d\u2019y créer un sujet.');
      const now = new Date().toISOString();
      d.topics.push({ id: d.nextId++, forum_id: f.id, title, author,
        author_token_hash: hash, is_pinned: false, is_locked: false,
        views: 0, created_at: now, last_activity_at: now });
      d.posts.push({ id: d.nextId++, topic_id: d.topics[d.topics.length - 1].id,
        author, author_token_hash: hash, content, created_at: now, edited_at: null });
      DemoDB.save();
      return { id: d.topics[d.topics.length - 1].id };
    },

    async createPost(topicId, author, content, hash) {
      const d = DemoDB.d || DemoDB.load();
      const t = byId(d.topics, topicId);
      if (!t) throw new Error('Sujet introuvable.');
      if (t.is_locked) throw new Error('Ce sujet est verrouillé.');
      const f = d.forums.find(x => x.id === t.forum_id);
      if (f && f.is_locked) throw new Error('Ce forum est verrouillé.');
      const now = new Date().toISOString();
      d.posts.push({ id: d.nextId++, topic_id: t.id, author,
        author_token_hash: hash, content, created_at: now, edited_at: null });
      t.last_activity_at = now;
      DemoDB.save();
    },

    async editPost(postId, token, content) {
      const d = DemoDB.d || DemoDB.load();
      const p = byId(d.posts, postId);
      const hash = await sha256Hex(token);
      if (!p || p.author_token_hash !== hash) throw new Error('Modification refusée : message introuvable ou jeton invalide.');
      p.content = content;
      p.edited_at = new Date().toISOString();
      DemoDB.save();
    },

    async deletePost(postId, token) {
      const d = DemoDB.d || DemoDB.load();
      const hash = await sha256Hex(token);
      const i = d.posts.findIndex(x => String(x.id) === String(postId));
      if (i === -1 || d.posts[i].author_token_hash !== hash) throw new Error('Suppression refusée : message introuvable ou jeton invalide.');
      d.posts.splice(i, 1);
      DemoDB.save();
    },

    async deleteTopic(topicId, token) {
      const d = DemoDB.d || DemoDB.load();
      const t = byId(d.topics, topicId);
      const hash = await sha256Hex(token);
      if (!t || t.author_token_hash !== hash) throw new Error('Suppression refusée : sujet introuvable ou jeton invalide.');
      if (d.posts.filter(p => p.topic_id === t.id).length > 1) throw new Error('Impossible de supprimer un sujet qui a reçu des réponses.');
      d.posts = d.posts.filter(p => p.topic_id !== t.id);
      d.topics = d.topics.filter(x => x.id !== t.id);
      DemoDB.save();
    },

    async incrementViews(topicId) {
      const d = DemoDB.d || DemoDB.load();
      const t = byId(d.topics, topicId);
      if (t) { t.views += 1; DemoDB.save(); }
    },
  };

  const SupaAPI = {
    isDemo: false,

    async getHome() {
      const [cats, fours] = await Promise.all([
        db.from('forum_categories').select('*').order('position'),
        db.from('forum_overview').select('*'),
      ]);
      if (cats.error)  throw cats.error;
      if (fours.error) throw fours.error;
      return { categories: cats.data || [], forums: fours.data || [] };
    },

    async getForum(forumId, page) {
      const f = await db.from('forum_overview').select('*').eq('id', forumId).limit(1);
      if (f.error) throw f.error;
      const forum = (f.data || [])[0] || null;
      if (!forum) return { forum: null, subs: [], topics: [], total: 0 };

      const [subs, tops] = await Promise.all([
        db.from('forum_overview').select('*').eq('parent_id', forumId).order('position'),
        db.from('topic_overview').select('*', { count: 'exact' })
          .eq('forum_id', forumId)
          .order('is_pinned', { ascending: false })      
          .order('last_activity_at', { ascending: false })
          .range((page - 1) * FORUM.topicsPerPage, page * FORUM.topicsPerPage - 1),
      ]);
      if (subs.error) throw subs.error;
      if (tops.error) throw tops.error;
      return { forum, subs: subs.data || [], topics: tops.data || [], total: tops.count || 0 };
    },

    async getTopic(topicId, page) {
      const t = await db.from('topic_overview').select('*').eq('id', topicId).limit(1);
      if (t.error) throw t.error;
      const topic = (t.data || [])[0] || null;
      if (!topic) return { topic: null, posts: [], total: 0 };

      const posts = await db.from('forum_posts').select('*', { count: 'exact' })
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true })
        .range((page - 1) * FORUM.postsPerPage, page * FORUM.postsPerPage - 1);
      if (posts.error) throw posts.error;
      return { topic, posts: posts.data || [], total: posts.count || 0 };
    },

    async getRawPost(postId) {
      const { data, error } = await db.from('forum_posts').select('content').eq('id', postId).limit(1);
      if (error) throw error;
      return (data && data[0] && data[0].content) || '';
    },

    async createTopic(forumId, title, author, content, hash) {
      const t = await db.from('forum_topics')
        .insert({ forum_id: forumId, title, author, author_token_hash: hash })
        .select('id').single();
      if (t.error) throw t.error;
      /* 2) …et son premier message */
      const p = await db.from('forum_posts')
        .insert({ topic_id: t.data.id, author, author_token_hash: hash, content });
      if (p.error) throw p.error;
      return { id: t.data.id };
    },

    async createPost(topicId, author, content, hash) {
      const { error } = await db.from('forum_posts')
        .insert({ topic_id: topicId, author, author_token_hash: hash, content });
      if (error) throw error;
    },

    async editPost(postId, token, content) {
      const { error } = await db.rpc('forum_edit_post',
        { p_post_id: postId, p_token: token, p_content: content });
      if (error) throw error;
    },

    async deletePost(postId, token) {
      const { error } = await db.rpc('forum_delete_post',
        { p_post_id: postId, p_token: token });
      if (error) throw error;
    },

    async deleteTopic(topicId, token) {
      const { error } = await db.rpc('forum_delete_topic',
        { p_topic_id: topicId, p_token: token });
      if (error) throw error;
    },

    async incrementViews(topicId) {
      try { await db.rpc('forum_increment_views', { p_topic_id: topicId }); }
      catch (e) { /* compteur non bloquant */ }
    },
  };

  const api = isConfigured ? SupaAPI : DemoAPI;

  function rvA(animate, i, base) {
    const cls = base ? base + ' ' : '';
    if (!animate) return 'class="' + cls + 'reveal done"';
    const d = (Math.min(i, 14) * 0.04).toFixed(2);
    return 'class="' + cls + 'reveal" style="animation-delay:' + d + 's"';
  }

  function badge(type, label) {
    return '<span class="forum-badge forum-badge--' + type + '">' + esc(label) + '</span>';
  }

  function crumbNav(items) {
    return '<nav class="forum-crumb" aria-label="Fil d\u2019Ariane">' + items.map((it, i) => {
      const sep = i ? '<span class="crumb-sep" aria-hidden="true">›</span>' : '';
      if (it.current) return sep + '<span class="crumb-current">' + esc(it.label) + '</span>';
      if (it.plain)   return sep + '<span class="crumb-plain">'   + esc(it.label) + '</span>';
      return sep + '<button type="button" class="crumb-link" data-fnav="' + it.nav + '"' +
             (it.id != null ? ' data-id="' + it.id + '"' : '') + '>' + esc(it.label) + '</button>';
    }).join('') + '</nav>';
  }

  function forumRowHTML(f, subs, animate, gi, ri) {
    const last = f.last_activity
      ? '<button type="button" class="row-last" data-fnav="topic" data-id="' + f.last_topic_id + '" data-page="' +
        Math.max(1, Math.ceil(f.post_count / FORUM.postsPerPage)) + '" title="Voir le dernier message">' +
          '<span class="row-last-line"><span class="row-last-author">' + esc(f.last_author) + '</span>' +
          '<time data-iso="' + f.last_activity + '">' + timeAgo(f.last_activity) + '</time></span>' +
          '<span class="row-last-title clamp-2">' + esc(f.last_topic_title) + '</span>' +
        '</button>'
      : '<span class="row-last muted">Aucun message</span>';
    return '<article ' + rvA(animate, gi + ri + 1, 'forum-row spot-card' + (f.is_locked ? ' is-locked' : '')) + '>' +
      '<span class="row-icon" aria-hidden="true">' + icon(f.is_locked ? 'lock' : 'folder', 18) + '</span>' +
      '<div class="row-main">' +
        '<p class="row-title">' +
          '<button type="button" class="row-link" data-fnav="forum" data-id="' + f.id + '">' + esc(f.name) + '</button>' +
          (f.is_locked ? badge('lock', 'Lecture seule') : '') +
        '</p>' +
        (f.description ? '<p class="row-desc">' + esc(f.description) + '</p>' : '') +
        (subs && subs.length
          ? '<p class="row-subs"><span class="row-subs-label">Sous-forums :</span>' +
            subs.map(s => '<button type="button" class="chip" data-fnav="forum" data-id="' + s.id + '">' +
              esc(s.name) + '<span class="chip-count">' + s.topic_count + '</span></button>').join('') +
            '</p>'
          : '') +
      '</div>' +
      '<div class="row-side">' +
        '<p class="row-stats">' + f.topic_count + ' sujet' + (f.topic_count > 1 ? 's' : '') +
          ' · ' + f.post_count + ' message' + (f.post_count > 1 ? 's' : '') + '</p>' +
        '<div class="row-last-wrap">' + last + '</div>' +
      '</div>' +
    '</article>';
  }

  function topicRowHTML(t, animate, i) {
    const replies = Math.max(0, (t.post_count || 1) - 1);
    const pinned = !!t.is_pinned, locked = !!t.is_locked;
    return '<article ' + rvA(animate, i + 1, 'forum-row forum-row--topic spot-card' + (pinned ? ' is-pinned' : '')) + '>' +
      '<span class="row-icon" aria-hidden="true">' + icon(locked ? 'lock' : (pinned ? 'pin' : 'chat'), 18) + '</span>' +
      '<div class="row-main">' +
        '<p class="row-title">' +
          '<button type="button" class="row-link" data-fnav="topic" data-id="' + t.id + '">' + esc(t.title) + '</button>' +
          (pinned ? badge('pin', 'Épinglé') : '') +
          (locked ? badge('lock', 'Clos') : '') +
        '</p>' +
        '<p class="row-desc">par <b>' + esc(t.author) + '</b> · ' +
          '<time data-iso="' + t.created_at + '">' + timeAgo(t.created_at) + '</time></p>' +
      '</div>' +
      '<div class="row-side">' +
        '<p class="row-stats">' + replies + ' réponse' + (replies > 1 ? 's' : '') + ' · ' + (t.views || 0) + ' vues</p>' +
        (t.last_post_at
          ? '<button type="button" class="row-last" data-fnav="topic" data-id="' + t.id + '" data-page="' +
              Math.max(1, Math.ceil((t.post_count || 1) / FORUM.postsPerPage)) + '" title="Voir le dernier message">' +
              '<span class="row-last-author">' + esc(t.last_post_author) + '</span>' +
              '<time data-iso="' + t.last_post_at + '">' + timeAgo(t.last_post_at) + '</time></button>'
          : '<span class="row-last muted">—</span>') +
      '</div>' +
    '</article>';
  }

  function renderPost(text) {
    let safe = esc(text);
    safe = safe.replace(/(https?:\/\/[^\s<]+)/g,
      u => '<a class="msg-link" href="' + u + '" target="_blank" rel="noopener nofollow">' + u + '</a>');
    return safe.replace(/\r?\n/g, '<br>');
  }

  function postHTML(p, index, myHash, animate) {
    const mine = p.author_token_hash === myHash;
    return '<article ' + rvA(animate, Math.min(index, 10), 'forum-msg spot-card') + ' data-post="' + p.id + '">' +
      '<span class="msg-avatar" style="' + avatarStyle(p.author) + '" aria-hidden="true">' + esc(initials(p.author)) + '</span>' +
      '<div class="msg-body">' +
        '<p class="msg-meta">' +
          '<b class="msg-pseudo">' + esc(p.author) + '</b>' +
          '<time class="msg-date" data-iso="' + p.created_at + '" title="' + esc(fullDate(p.created_at)) + '">' +
            timeAgo(p.created_at) + '</time>' +
          (index === 0 ? '<span class="msg-flag">Auteur du sujet</span>' : '') +
          '<span class="msg-num">#' + (index + 1) + '</span>' +
          (p.edited_at ? '<span class="msg-flag msg-flag--edit">modifié</span>' : '') +
        '</p>' +
        '<div class="msg-content" data-role="content">' + renderPost(p.content) + '</div>' +
        (mine
          ? '<p class="msg-actions">' +
              '<button type="button" class="btn-mini" data-faction="edit-post" data-id="' + p.id + '">' + icon('edit', 12) + ' Modifier</button>' +
              '<button type="button" class="btn-mini btn-mini--danger" data-faction="delete-post" data-id="' + p.id + '">' + icon('trash', 12) + ' Supprimer</button>' +
            '</p>'
          : '') +
      '</div>' +
    '</article>';
  }

  const ELL = '<span class="page-ellipsis">…</span>';
  function pagerHTML(view, id, page, pages) {
    if (pages <= 1) return '';
    const nav = p => 'data-fnav="page" data-view="' + view + '" data-id="' + id + '" data-page="' + p + '"';
    const nums = [];
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - page) <= 1)
        nums.push('<button type="button" class="page-btn' + (p === page ? ' active' : '') + '" ' + nav(p) + '>' + p + '</button>');
      else if (nums[nums.length - 1] !== ELL) nums.push(ELL);
    }
    return '<nav class="forum-pager" aria-label="Pagination">' +
      '<button type="button" class="page-btn" ' + nav(page - 1) + (page <= 1 ? ' disabled' : '') + '>‹</button>' +
      nums.join('') +
      '<button type="button" class="page-btn" ' + nav(page + 1) + (page >= pages ? ' disabled' : '') + '>›</button>' +
    '</nav>';
  }

  function skeletonHTML() {
    const row = () => '<article class="forum-row skeleton"><span class="row-icon"></span>' +
      '<div class="row-main"><span class="sk-line w40"></span><span class="sk-line w90"></span></div>' +
      '<div class="row-side"><span class="sk-line w60"></span></div></article>';
    return row() + row() + row();
  }

  function crashHTML(msg) {
    return '<div class="empty forum-crash">' +
      '<div class="empty-icon">' + icon('chat', 22) + '</div>' +
      '<h3>Oups, une erreur est survenue</h3>' +
      '<p>' + esc(msg) + '</p>' +
      '<button type="button" class="empty-reset" id="forumRetry">' + icon('back', 13) + ' Retour à l\u2019accueil du forum</button>' +
    '</div>';
  }

  function validate(v) {
    const pseudo = (v.pseudo || '').trim().replace(/\s+/g, ' ');
    if (pseudo.length < 2) return 'Indiquez un pseudo (2 caractères min).';
    if (pseudo.length > FORUM.maxPseudo) return 'Pseudo trop long (' + FORUM.maxPseudo + ' caractères max).';
    if (v.title !== undefined) {
      const t = v.title.trim();
      if (t.length < 3) return 'Le titre doit faire au moins 3 caractères.';
      if (t.length > FORUM.maxTitle) return 'Titre trop long (' + FORUM.maxTitle + ' caractères max).';
    }
    if (v.requireContent) {
      const c = (v.content || '').trim();
      if (!c) return 'Votre message est vide.';
      if (c.length > FORUM.maxChars) return 'Message trop long (' + FORUM.maxChars + ' caractères max).';
    }
    return null;
  }

  function setHint(el, text, type) {
    el.textContent = text;
    el.dataset.type = type || '';
  }


  async function render(animate) {
    const root = $('#forumRoot');
    if (!root) return;
    root.innerHTML = skeletonHTML();
    try {
      if (state.view === 'home')          await renderHome(root, animate);
      else if (state.view === 'forum')    await renderForumView(root, animate);
      else if (state.view === 'topic')    await renderTopicView(root, animate);
      else if (state.view === 'newtopic') await renderNewTopicView(root, animate);
    } catch (err) {
      console.error('[Forum ToncPlay]', err);
      root.innerHTML = crashHTML(friendlyError(err));
      const r = $('#forumRetry');
      if (r) r.addEventListener('click', () => go('home'));
    }
  }

  function go(view, opts) {
    opts = opts || {};
    state.view   = view;
    state.forumId  = (opts.forumId  != null) ? opts.forumId  : null;
    state.topicId  = (opts.topicId  != null) ? opts.topicId  : null;
    state.page   = opts.page || 1;
    render(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function renderHome(root, animate) {
    const data = await api.getHome();
    const subOf = {};
    data.forums.forEach(f => { if (f.parent_id) (subOf[f.parent_id] = subOf[f.parent_id] || []).push(f); });

    const totalTopics = data.forums.reduce((n, f) => n + (f.topic_count || 0), 0);
    const totalPosts  = data.forums.reduce((n, f) => n + (f.post_count  || 0), 0);
    const count = $('#forumCount');
    if (count) {
      count.textContent = data.categories.length + ' catégorie' + (data.categories.length > 1 ? 's' : '') +
        ' · ' + data.forums.length + ' forums · ' + totalTopics + ' sujets · ' + totalPosts + ' messages';
      count.hidden = false;
    }
    const sub = $('#forumSub');
    if (sub) sub.textContent = TAGLINE;

    root.innerHTML = data.categories.map((cat, ci) => {
      const roots = data.forums
        .filter(f => f.category_id === cat.id && !f.parent_id)
        .sort((a, b) => a.position - b.position);
      if (!roots.length) return '';
      return '<section ' + rvA(animate, ci, 'forum-cat') + '>' +
        '<header class="forum-cat-head">' +
          '<p class="forum-cat-name">// ' + esc(cat.name) + '</p>' +
          (cat.description ? '<p class="forum-cat-desc">' + esc(cat.description) + '</p>' : '') +
        '</header>' +
        '<div class="forum-rows">' +
          roots.map((f, i) =>
            forumRowHTML(f, (subOf[f.id] || []).sort((a, b) => a.position - b.position), animate, ci, i)
          ).join('') +
        '</div>' +
      '</section>';
    }).join('');
  }

  async function renderForumView(root, animate) {
    const r = await api.getForum(state.forumId, state.page);
    if (!r.forum) { state.view = 'home'; return renderHome(root, animate); }
    const forum = r.forum;
    state.forumId = forum.id;                        /* pour les allers-retours */
    const pages = Math.max(1, Math.ceil(r.total / FORUM.topicsPerPage));
    $('#forumCount').hidden = true;
    const sub = $('#forumSub');
    if (sub) sub.textContent = 'Forum « ' + forum.name + ' » — ' + forum.category_name + '.';

    const locked = !!forum.is_locked;
    root.innerHTML =
      crumbNav([
        { label: 'Forum', nav: 'home' },
        { label: forum.category_name, plain: true },
        forum.parent_id ? { label: forum.parent_name, nav: 'forum', id: forum.parent_id } : { label: '', plain: true, skip: true },
        { label: forum.name, current: true },
      ].filter(it => !it.skip)) +

      '<div ' + rvA(animate, 0, 'forum-viewhead') + '>' +
        '<div>' +
          '<h3 class="forum-viewtitle">' + icon(locked ? 'lock' : 'folder', 16) + ' ' + esc(forum.name) +
            (locked ? badge('lock', 'Lecture seule') : '') + '</h3>' +
          '<p class="forum-viewsub">' +
            (forum.description ? esc(forum.description) + ' · ' : '') +
            r.total + ' sujet' + (r.total > 1 ? 's' : '') + ' · ' + forum.post_count + ' message' + (forum.post_count > 1 ? 's' : '') +
          '</p>' +
        '</div>' +
        (locked ? '' : '<button type="button" class="btn-play" data-fnav="newtopic" data-id="' + forum.id + '">' +
          icon('plus', 14) + ' Nouveau sujet</button>') +
      '</div>' +

      (r.subs.length
        ? '<div ' + rvA(animate, 1, 'forum-boards') + '>' +
            '<p class="forum-boards-label">Sous-forums</p>' +
            '<p class="forum-boards-chips">' +
              r.subs.map(s => '<button type="button" class="chip" data-fnav="forum" data-id="' + s.id + '">' +
                esc(s.name) + '<span class="chip-count">' + s.topic_count + '</span></button>').join('') +
            '</p>' +
          '</div>'
        : '') +

      (locked
        ? '<p class="forum-banner forum-banner--info">' + icon('lock', 13) +
          ' Forum verrouillé : vous pouvez lire les sujets mais pas en créer de nouveaux.</p>'
        : '') +

      '<div class="forum-rows">' +
        (r.topics.length
          ? r.topics.map((t, i) => topicRowHTML(t, animate, i)).join('')
          : '<div ' + rvA(animate, 2, 'empty') + '>' +
              '<div class="empty-icon">' + icon('chat', 22) + '</div>' +
              '<h3>Aucun sujet pour l\u2019instant</h3>' +
              '<p>' + (locked ? 'Ce forum est en lecture seule.' : 'Soyez la première personne à lancer une discussion !') + '</p>' +
            '</div>') +
      '</div>' +
      pagerHTML('forum', forum.id, state.page, pages);
  }

  async function renderTopicView(root, animate) {
    await api.incrementViews(state.topicId);
    const r = await api.getTopic(state.topicId, state.page);
    if (!r.topic) { state.view = 'home'; return renderHome(root, animate); }
    const topic = r.topic;
    state.topicId = topic.id;
    state.forumId = topic.forum_id;              
    const pages = Math.max(1, Math.ceil(r.total / FORUM.postsPerPage));
    $('#forumCount').hidden = true;
    const sub = $('#forumSub');
    if (sub) sub.textContent = 'Sujet dans « ' + topic.forum_name + ' » — ' + topic.category_name + '.';

    const myHash   = await getTokenHash();
    const replies  = Math.max(0, (topic.post_count || 1) - 1);
    const locked   = !!(topic.is_locked || topic.forum_locked);
    const mineTopic = topic.author_token_hash === myHash && (topic.post_count || 1) <= 1;

    root.innerHTML =
      crumbNav([
        { label: 'Forum', nav: 'home' },
        { label: topic.category_name, plain: true },
        topic.forum_parent_id ? { label: topic.forum_parent_name, nav: 'forum', id: topic.forum_parent_id } : { label: '', plain: true, skip: true },
        { label: topic.forum_name, nav: 'forum', id: topic.forum_id },
        { label: topic.title, current: true },
      ].filter(it => !it.skip)) +

      '<div ' + rvA(animate, 0, 'forum-viewhead forum-viewhead--topic') + '>' +
        '<div>' +
          '<h3 class="forum-viewtitle">' + icon(topic.is_pinned ? 'pin' : 'chat', 16) + ' ' + esc(topic.title) +
            (topic.is_pinned ? badge('pin', 'Épinglé') : '') +
            (topic.is_locked ? badge('lock', 'Clos') : '') + '</h3>' +
          '<p class="forum-viewsub">par <b>' + esc(topic.author) + '</b> · ' +
            replies + ' réponse' + (replies > 1 ? 's' : '') + ' · ' + (topic.views || 0) + ' vues</p>' +
        '</div>' +
        '<div class="forum-viewhead-actions">' +
          (mineTopic
            ? '<button type="button" class="btn-mini btn-mini--danger" data-faction="delete-topic" data-id="' + topic.id + '">' +
                icon('trash', 13) + ' Supprimer le sujet</button>'
            : '') +
          (locked ? '' : '<button type="button" class="btn-play" data-faction="jump-reply">' + icon('reply', 14) + ' Répondre</button>') +
        '</div>' +
      '</div>' +

      '<div class="forum-posts">' +
        r.posts.map((p, i) => postHTML(p, (state.page - 1) * FORUM.postsPerPage + i, myHash, animate)).join('') +
      '</div>' +

      pagerHTML('topic', topic.id, state.page, pages) +

      (locked
        ? '<p class="forum-banner forum-banner--info">' + icon('lock', 13) + ' ' +
          (topic.is_locked
            ? 'Ce sujet est clos : les réponses sont désactivées.'
            : 'Forum en lecture seule : impossible de répondre ici.') + '</p>'
        : replyFormHTML(topic));

    if (!locked) wireReplyForm(r.total);
  }

  function replyFormHTML(topic) {
    return '<form class="forum-form" id="forumReplyForm" novalidate>' +
      '<p class="form-title">' + icon('reply', 15) + ' Répondre</p>' +
      '<div class="form-field">' +
        '<label class="form-label" for="frPseudo">Pseudo</label>' +
        '<input id="frPseudo" type="text" maxlength="' + FORUM.maxPseudo + '" autocomplete="nickname" ' +
          'placeholder="Ex : Roger" value="' + esc(savedPseudo()) + '">' +
      '</div>' +
      '<div class="form-field">' +
        '<div class="form-label-row">' +
          '<label class="form-label" for="frContent">Votre message</label>' +
          '<span class="char-count" id="frCount">0 / ' + FORUM.maxChars + '</span>' +
        '</div>' +
        '<textarea id="frContent" rows="5" maxlength="' + FORUM.maxChars + '" ' +
          'placeholder="Écrivez quelque chose de mémorable… (Ctrl + Entrée pour envoyer)"></textarea>' +
      '</div>' +
      '<div class="form-actions">' +
        '<span class="form-hint" id="frHint" role="status">Soyez sympa, Roger lit tout.</span>' +
        '<button type="submit" class="btn-send" data-label="Répondre">' +
          '<span class="btn-send-icon-w">' + icon('send', 14) + '</span>' +
          '<span class="btn-send-label">Répondre</span>' +
        '</button>' +
      '</div>' +
    '</form>';
  }

  function wireReplyForm(currentTotal) {
    const form = $('#forumReplyForm');
    if (!form) return;
    const pseudo = $('#frPseudo'), ta = $('#frContent'), cnt = $('#frCount'),
          hint = $('#frHint'), btn = form.querySelector('.btn-send'),
          lab = btn.querySelector('.btn-send-label');

    const refresh = () => {
      cnt.textContent = ta.value.length + ' / ' + FORUM.maxChars;
      cnt.classList.toggle('warn', ta.value.length >= FORUM.maxChars * .9);
    };
    ta.addEventListener('input', refresh); refresh();
    ta.addEventListener('keydown', e => {        
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit ? form.requestSubmit() : btn.click();
      }
    });
    pseudo.addEventListener('input', () => savePseudo(pseudo.value.trim()));

    if (Date.now() < state.cooldownUntil) startCooldown();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const p = pseudo.value.trim().replace(/\s+/g, ' ');
      const err = validate({ pseudo: p, content: ta.value, requireContent: true });
      if (err) { setHint(hint, err, 'warn'); return; }
      if (Date.now() < state.cooldownUntil) { setHint(hint, 'Doucement ! Attendez la fin du compte à rebours.', 'warn'); return; }

      btn.disabled = true; lab.textContent = 'Envoi…';
      setHint(hint, 'Envoi…', '');
      try {
        await api.createPost(state.topicId, p, ta.value.trim(), await getTokenHash());
        savePseudo(p);
        announce('Réponse publiée.');
        if (FORUM.cooldown > 0) state.cooldownUntil = Date.now() + FORUM.cooldown * 1000;
        /* Saut direct vers la dernière page pour voir le message publié */
        go('topic', { topicId: state.topicId, page: Math.max(1, Math.ceil((currentTotal + 1) / FORUM.postsPerPage)) });
      } catch (err2) {
        console.error("[Forum ToncPlay] Échec de l'envoi :", err2);
        setHint(hint, friendlyError(err2), 'err');
        btn.disabled = false; lab.textContent = 'Répondre';
      }
    });
  }

  async function renderNewTopicView(root, animate) {
    const r = await api.getForum(state.forumId, 1);
    if (!r.forum || r.forum.is_locked) { state.view = 'forum'; return renderForumView(root, animate); }
    const forum = r.forum;
    state.forumId = forum.id;
    $('#forumCount').hidden = true;
    const sub = $('#forumSub');
    if (sub) sub.textContent = 'Nouveau sujet dans « ' + forum.name + ' ».';

    root.innerHTML =
      crumbNav([
        { label: 'Forum', nav: 'home' },
        { label: forum.category_name, plain: true },
        forum.parent_id ? { label: forum.parent_name, nav: 'forum', id: forum.parent_id } : { label: '', plain: true, skip: true },
        { label: forum.name, nav: 'forum', id: forum.id },
        { label: 'Nouveau sujet', current: true },
      ].filter(it => !it.skip)) +

      '<form ' + rvA(animate, 0, 'forum-form') + ' id="forumTopicForm" novalidate>' +
        '<p class="form-title">' + icon('plus', 15) + ' Lancer un nouveau sujet</p>' +
        '<div class="form-field">' +
          '<label class="form-label" for="ftPseudo">Pseudo</label>' +
          '<input id="ftPseudo" type="text" maxlength="' + FORUM.maxPseudo + '" autocomplete="nickname" ' +
            'placeholder="Ex : Roger" value="' + esc(savedPseudo()) + '">' +
        '</div>' +
        '<div class="form-field">' +
          '<label class="form-label" for="ftTitle">Titre du sujet</label>' +
          '<input id="ftTitle" type="text" maxlength="' + FORUM.maxTitle + '" ' +
            'placeholder="Résumez votre sujet en une phrase accrocheuse…">' +
        '</div>' +
        '<div class="form-field">' +
          '<div class="form-label-row">' +
            '<label class="form-label" for="ftContent">Premier message</label>' +
            '<span class="char-count" id="ftCount">0 / ' + FORUM.maxChars + '</span>' +
          '</div>' +
          '<textarea id="ftContent" rows="7" maxlength="' + FORUM.maxChars + '" ' +
            'placeholder="Décrivez votre sujet, posez votre question… (Ctrl + Entrée pour publier)"></textarea>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn-back" data-fnav="forum" data-id="' + forum.id + '">' + icon('back', 14) + ' Annuler</button>' +
          '<button type="submit" class="btn-send" data-label="Publier le sujet">' +
            '<span class="btn-send-icon-w">' + icon('send', 14) + '</span>' +
            '<span class="btn-send-label">Publier le sujet</span>' +
          '</button>' +
        '</div>' +
        '<p class="form-hint form-hint--solo" id="ftHint" role="status"></p>' +
      '</form>';

    wireTopicForm();
  }

  function wireTopicForm() {
    const form = $('#forumTopicForm');
    if (!form) return;
    const pseudo = $('#ftPseudo'), title = $('#ftTitle'), ta = $('#ftContent'),
          cnt = $('#ftCount'), hint = $('#ftHint'),
          btn = form.querySelector('button[type="submit"]'),
          lab = btn.querySelector('.btn-send-label');

    const refresh = () => {
      cnt.textContent = ta.value.length + ' / ' + FORUM.maxChars;
      cnt.classList.toggle('warn', ta.value.length >= FORUM.maxChars * .9);
    };
    ta.addEventListener('input', refresh); refresh();
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit ? form.requestSubmit() : btn.click();
      }
    });
    pseudo.addEventListener('input', () => savePseudo(pseudo.value.trim()));

    if (Date.now() < state.cooldownUntil) startCooldown();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const p = pseudo.value.trim().replace(/\s+/g, ' ');
      const err = validate({ pseudo: p, title: title.value, content: ta.value, requireContent: true });
      if (err) { setHint(hint, err, 'warn'); return; }
      if (Date.now() < state.cooldownUntil) { setHint(hint, 'Doucement ! Attendez la fin du compte à rebours.', 'warn'); return; }

      btn.disabled = true; lab.textContent = 'Publication…';
      setHint(hint, 'Publication du sujet…', '');
      try {
        /* 1) création du sujet, 2) insertion de son premier message */
        const created = await api.createTopic(state.forumId, title.value.trim(), p,
                                              ta.value.trim(), await getTokenHash());
        savePseudo(p);
        announce('Sujet publié.');
        if (FORUM.cooldown > 0) state.cooldownUntil = Date.now() + FORUM.cooldown * 1000;
        go('topic', { topicId: created.id, page: 1 });
      } catch (err2) {
        console.error('[Forum ToncPlay] Échec de la création :', err2);
        setHint(hint, friendlyError(err2), 'err');
        btn.disabled = false; lab.textContent = 'Publier le sujet';
      }
    });
  }


  async function startEditPost(btn) {
    const card = btn.closest('.forum-msg');
    const target = card.querySelector('.msg-content');
    btn.disabled = true;
    let content = '';
    try { content = await api.getRawPost(btn.dataset.id); }
    catch (err) { btn.disabled = false; return; }
    target.innerHTML =
      '<div class="forum-edit">' +
        '<textarea rows="5" maxlength="' + FORUM.maxChars + '">' + esc(content) + '</textarea>' +
        '<p class="msg-actions msg-actions--edit">' +
          '<button type="button" class="btn-mini btn-mini--ok" data-faction="save-edit" data-id="' + btn.dataset.id + '">' + icon('send', 12) + ' Enregistrer</button>' +
          '<button type="button" class="btn-mini" data-faction="cancel-edit">Annuler</button>' +
        '</p>' +
      '</div>';
    const ta = target.querySelector('textarea');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function armButton(btn) {
    btn.dataset.armed = '1';
    btn.dataset.prev  = btn.innerHTML;
    btn.classList.add('armed');
    btn.innerHTML = 'Confirmer ?';
    clearTimeout(btn._armTimer);
    btn._armTimer = setTimeout(() => disarmButton(btn), 4000);
  }
  function disarmButton(btn) {
    if (!btn || !btn.dataset.armed) return;
    btn.dataset.armed = '';
    btn.classList.remove('armed');
    if (btn.dataset.prev) btn.innerHTML = btn.dataset.prev;
    btn.disabled = false;
  }

  function initActions() {
    const root = $('#forumRoot');

    root.addEventListener('click', async e => {
      /* ----- navigation ----- */
      const nav = e.target.closest('[data-fnav]');
      if (nav) {
        const kind = nav.dataset.fnav;
        const page = parseInt(nav.dataset.page, 10) || 1;
        if (kind === 'home')     return go('home');
        if (kind === 'forum')    return go('forum',    { forumId: nav.dataset.id });
        if (kind === 'topic')    return go('topic',    { topicId: nav.dataset.id, page: page });
        if (kind === 'newtopic') return go('newtopic', { forumId: nav.dataset.id });
        if (kind === 'page') {
          const p = parseInt(nav.dataset.page, 10) || 1;
          if (nav.dataset.view === 'forum') return go('forum', { forumId: nav.dataset.id, page: p });
          return go('topic', { topicId: nav.dataset.id, page: p });
        }
      }

      const act = e.target.closest('[data-faction]');
      if (!act) return;
      const { faction, id } = act.dataset;

      try {
        if (faction === 'jump-reply') {
          const f = $('#forumReplyForm');
          if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#frContent').focus(); }
          return;
        }
        if (faction === 'edit-post')   return startEditPost(act);
        if (faction === 'cancel-edit') return render(false);

        if (faction === 'save-edit') {
          const ta = act.closest('.forum-edit').querySelector('textarea');
          const val = (ta.value || '').trim();
          if (!val) return;                    /* message vide → on ne sauvegarde pas */
          act.disabled = true;
          await api.editPost(id, getToken(), val);
          announce('Message modifié.');
          return render(false);
        }

        if (faction === 'delete-post' || faction === 'delete-topic') {
          if (!act.dataset.armed) return armButton(act);
          act.disabled = true;
          if (faction === 'delete-post') {
            await api.deletePost(id, getToken());
            announce('Message supprimé.');
            return render(false);
          }
          const fid = state.forumId;
          await api.deleteTopic(id, getToken());
          announce('Sujet supprimé.');
          return go('forum', { forumId: fid });
        }
      } catch (err) {
        console.error('[Forum ToncPlay]', err);
        disarmButton(act);
        root.innerHTML = crashHTML(friendlyError(err));
        const r = $('#forumRetry');
        if (r) r.addEventListener('click', () => go('home'));
      }
    });

    root.addEventListener('mousemove', e => {
      const card = e.target.closest('.spot-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });

    root.addEventListener('animationend', e => {
      if (e.animationName === 'revealUp') e.target.classList.add('done');
    });
  }

  function startCooldown() {
    clearInterval(state.cooldownTimer);
    const tick = () => {
      const rest = Math.ceil((state.cooldownUntil - Date.now()) / 1000);
      const btn = $('#forumRoot .btn-send');
      if (rest <= 0) {
        clearInterval(state.cooldownTimer);
        state.cooldownTimer = null; state.cooldownUntil = 0;
        if (btn) {
          btn.disabled = false;
          const l = btn.querySelector('.btn-send-label');
          if (l) l.textContent = btn.dataset.label || 'Envoyer';
        }
        const hint = $('#frHint') || $('#ftHint');
        if (hint && hint.dataset.type !== 'err') setHint(hint, 'Soyez sympa, Roger lit tout.', '');
        return;
      }
      if (btn) {
        btn.disabled = true;
        const l = btn.querySelector('.btn-send-label');
        if (l) l.textContent = 'Patientez ' + rest + ' s…';
      }
    };
    tick();
    state.cooldownTimer = setInterval(tick, 1000);
  }

  function refreshDates() {
    $$('time[data-iso]', $('#forumRoot')).forEach(t => { t.textContent = timeAgo(t.dataset.iso); });
  }

  function showDemoBanner() {
    const banner = $('#forumBanner');
    if (!banner) return;
    banner.hidden = false;
    banner.innerHTML =
      '<b>Mode démo actif</b> — Supabase n\u2019est pas encore branché : le forum ' +
      'fonctionne avec des données d\u2019exemple stockées dans <em>votre</em> navigateur ' +
      '(créez un sujet, répondez, modifiez… tout est testable). ' +
      'Pour passer en réel : exécutez <code>supabase-forum.sql</code> puis ouvrez ' +
      '<code>js/forum.js</code> et remplacez <code>SUPABASE_URL</code> + ' +
      '<code>SUPABASE_ANON_KEY</code> (2 lignes tout en haut).';
    const sub = $('#forumSub');
    if (sub) sub.textContent = 'Forum en mode démo — les discussions restent locales à votre navigateur.';
  }

  function init() {
    if (!isConfigured) showDemoBanner();
    initActions();

    document.addEventListener('click', e => {
      if (e.target.closest('[data-nav="forum"]')) render(true);
    });

    render(true);                       
    setInterval(refreshDates, 60000);   
  }

  document.addEventListener('DOMContentLoaded', init);
})();

