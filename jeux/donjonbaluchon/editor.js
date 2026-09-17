/* ============================================================
   SOKOBAN — editor.js
   Éditeur de niveaux, gestion des niveaux perso, import/export
   ============================================================ */

// ─── Clés localStorage ──────────────────────────────────────
const CUSTOM_LEVELS_KEY = 'sokoban-custom-levels-v1';
const CUSTOM_SCORES_KEY  = 'sokoban-custom-scores-v1';

// ─── Constantes de l'éditeur ────────────────────────────────
const EDITOR_TILES = {
  wall:        '#',
  floor:       ' ',
  goal:        '.',
  block:       '$',
  blockOnGoal: '*',
  player:      '@',
  playerOnGoal:'+',   // pour imports / affichage
  eraser:      ' '    // = floor
};
const EDITOR_CELL_SIZE = 40;

// ─── État de l'éditeur ──────────────────────────────────────
let editorCols = 10;
let editorRows = 10;
let editorGrid = [];
let editorTool = 'wall';
let isPainting = false;
let editingLevelId = null;
let editorInitialized = false;

// ─── Ajuster la taille de la grille (steppers +/-) ─────────
function adjustGridSize(dim, delta) {
  if (dim === 'cols') {
    const v = Math.max(1, Math.min(20, editorCols + delta));
    document.getElementById('editor-cols').value = v;
    resizeEditor(v, editorRows);
  } else {
    const v = Math.max(1, Math.min(20, editorRows + delta));
    document.getElementById('editor-rows').value = v;
    resizeEditor(editorCols, v);
  }
}

// Appelé quand on tape manuellement dans les inputs
function onSizeInputChange() {
  const cols = Math.max(1, Math.min(20, parseInt(document.getElementById('editor-cols').value) || editorCols));
  const rows = Math.max(1, Math.min(20, parseInt(document.getElementById('editor-rows').value) || editorRows));
  document.getElementById('editor-cols').value = cols;
  document.getElementById('editor-rows').value = rows;
  resizeEditor(cols, rows);
}

// ─── Adapter le canvas à l'écran 
function fitEditorCanvas() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;
  const wrap = canvas.parentElement; // .editor-canvas-wrap
  if (!wrap) return;

  // Réinitialiser
  canvas.style.width  = '';
  canvas.style.height = '';

  // Forcer le reflow
  void wrap.offsetHeight;

  const availW = wrap.clientWidth - 4;
  const availH = wrap.clientHeight - 4;

  if (availW <= 0 || availH <= 0) return;

  const naturalW = editorCols * EDITOR_CELL_SIZE;
  const naturalH = editorRows * EDITOR_CELL_SIZE;

  if (naturalW <= 0 || naturalH <= 0) return;

  // Calculer la taille d'affichage
  const ratio = naturalW / naturalH;
  let dispW = availW;
  let dispH = dispW / ratio;

  if (dispH > availH) {
    dispH = availH;
    dispW = dispH * ratio;
  }

  // Ne pas agrandir au-delà de la taille native (pas de zoom avant)
  if (dispW > naturalW) {
    dispW = naturalW;
    dispH = naturalH;
  }

  canvas.style.width  = Math.floor(dispW) + 'px';
  canvas.style.height = Math.floor(dispH) + 'px';
}

// ─── Redimensionner la grille ───────────────────────────────
function resizeEditor(newCols, newRows) {
  newCols = Math.max(1, Math.min(20, parseInt(newCols) || editorCols));
  newRows = Math.max(1, Math.min(20, parseInt(newRows) || editorRows));

  const oldCols = editorGrid[0]?.length || editorCols;
  const oldRows = editorGrid.length || editorRows;

  if (newCols === oldCols && newRows === oldRows) return;

  // Nouvelle grille : préserver l'existant, sol pour les nouvelles cases
  const newGrid = [];
  for (let r = 0; r < newRows; r++) {
    const row = [];
    for (let c = 0; c < newCols; c++) {
      if (r < oldRows && c < oldCols && editorGrid[r] && editorGrid[r][c] !== undefined) {
        row.push(editorGrid[r][c]);
      } else {
        row.push(EDITOR_TILES.floor); // sol pour les nouvelles cases
      }
    }
    newGrid.push(row);
  }

  editorCols = newCols;
  editorRows = newRows;
  editorGrid = newGrid;

  // Murs automatiques sur tout le pourtour extérieur
  fillBorder();
}

// ─── Persistance : niveaux ──────────────────────────────────
function loadCustomLevels() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_LEVELS_KEY)) || []; }
  catch { return []; }
}
function saveCustomLevels(levels) {
  try { localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels)); } catch {}
}
function generateCustomId() {
  const levels = loadCustomLevels();
  let max = 0;
  levels.forEach(l => {
    const m = l.id && l.id.match(/^custom-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]));
  });
  return 'custom-' + (max + 1);
}

// ─── Persistance : scores ───────────────────────────────────
function loadCustomScores() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SCORES_KEY)) || {}; }
  catch { return {}; }
}
function saveCustomScores(scores) {
  try { localStorage.setItem(CUSTOM_SCORES_KEY, JSON.stringify(scores)); } catch {}
}
function saveCustomLevelScore(levelId, mv, time, par) {
  const scores = loadCustomScores();
  const stars  = getStars(mv, par);
  const prev   = scores[levelId];
  scores[levelId] = {
    completed: true,
    bestMoves: !prev || mv < (prev.bestMoves ?? Infinity) ? mv : prev.bestMoves,
    bestTime:  !prev || time < (prev.bestTime  ?? Infinity) ? time : prev.bestTime,
    stars:     !prev || stars > prev.stars ? stars : prev.stars
  };
  saveCustomScores(scores);
}

// ─── Initialisation de l'éditeur ────────────────────────────
function initEditor() {
  editorCols = 10;
  editorRows = 10;
  document.getElementById('editor-cols').value = 10;
  document.getElementById('editor-rows').value = 10;

  editorGrid = [];
  for (let r = 0; r < editorRows; r++) {
    const row = [];
    for (let c = 0; c < editorCols; c++) row.push(EDITOR_TILES.floor);
    editorGrid.push(row);
  }

  editingLevelId = null;
  document.getElementById('editor-name').value = '';
  document.getElementById('editor-par').value = '';
  selectEditorTool('wall');
  fillBorder();
  editorInitialized = true;
}

function openEditor() {
  initEditor();
  showScreen('editor');
}

function newEditorLevel() {
  if (!confirm('Créer un nouveau niveau ? Les modifications non sauvegardées seront perdues.')) return;
  initEditor();
  showEditorMessage('Nouveau niveau initialisé.', 'info');
}

// ─── Validation en temps réel ──────────────────────────────
function updateEditorValidation() {
  let playerCount = 0, blockCount = 0, goalCount = 0;
  for (let r = 0; r < editorRows; r++)
    for (let c = 0; c < editorCols; c++) {
      const t = editorGrid[r][c];
      if (t === '@' || t === '+') playerCount++;
      if (t === '$' || t === '*') blockCount++;
      if (t === '.' || t === '*' || t === '+') goalCount++;
    }

  const badge = document.getElementById('editor-validation');
  if (!badge) return;

  if (playerCount === 1 && blockCount > 0 && blockCount === goalCount) {
    badge.textContent = `✓ Valide : 1 joueur · ${blockCount} sac(s) / ${goalCount} cible(s)`;
    badge.className = 'editor-validation valid';
  } else {
    let errors = [];
    if (playerCount === 0) errors.push('Aucun joueur (@)');
    else if (playerCount > 1) errors.push(`${playerCount} joueurs (1 requis)`);
    if (blockCount === 0) errors.push('Aucun sac ($)');
    if (blockCount !== goalCount) errors.push(`Sacs (${blockCount}) ≠ Cibles (${goalCount})`);
    badge.textContent = '✕ ' + errors.join(' · ');
    badge.className = 'editor-validation invalid';
  }
}

// ─── Rendu Canvas de la grille éditeur ─────────────────────
function drawEditorCanvas() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Taille interne du canvas (résolution native)
  canvas.width  = editorCols * EDITOR_CELL_SIZE;
  canvas.height = editorRows * EDITOR_CELL_SIZE;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < editorRows; r++) {
    for (let c = 0; c < editorCols; c++) {
      const tile = editorGrid[r][c];
      const x = c * EDITOR_CELL_SIZE;
      const y = r * EDITOR_CELL_SIZE;

      // Sol (tout sauf mur)
      if (tile !== '#') {
        const fImg = IMAGES.floors && IMAGES.floors[0];
        if (fImg && fImg.complete && fImg.naturalWidth > 0) {
          ctx.drawImage(fImg, x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        } else {
          ctx.fillStyle = '#ded6ae';
          ctx.fillRect(x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        }
      }

      // Mur
      if (tile === '#') {
        const wImg = IMAGES.walls && IMAGES.walls[0];
        if (wImg && wImg.complete && wImg.naturalWidth > 0) {
          ctx.drawImage(wImg, x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        } else {
          ctx.fillStyle = '#5b5530';
          ctx.fillRect(x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        }
      }

      // Cible (parquet) — sous le sac ou le joueur
      if (tile === '.' || tile === '*' || tile === '+') {
        const gImg = IMAGES.parquet1;
        if (gImg && gImg.complete && gImg.naturalWidth > 0) {
          ctx.drawImage(gImg, x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        } else {
          ctx.fillStyle = '#914430';
          ctx.beginPath();
          ctx.arc(x + EDITOR_CELL_SIZE / 2, y + EDITOR_CELL_SIZE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Sac (baluchon)
      if (tile === '$' || tile === '*') {
        const bImg = (tile === '*') ? IMAGES.baluchon3 : IMAGES.baluchon1;
        if (bImg && bImg.complete && bImg.naturalWidth > 0) {
          ctx.drawImage(bImg, x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        } else {
          ctx.fillStyle = (tile === '*') ? '#ba6a15' : '#ffbb5b';
          ctx.fillRect(x + 4, y + 4, EDITOR_CELL_SIZE - 8, EDITOR_CELL_SIZE - 8);
          ctx.strokeStyle = '#000';
          ctx.strokeRect(x + 4, y + 4, EDITOR_CELL_SIZE - 8, EDITOR_CELL_SIZE - 8);
        }
      }

      // Joueur
      if (tile === '@' || tile === '+') {
        const pImg = IMAGES.joueurfacefixe;
        if (pImg && pImg.complete && pImg.naturalWidth > 0) {
          ctx.drawImage(pImg, x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
        } else {
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(x + EDITOR_CELL_SIZE / 2, y + EDITOR_CELL_SIZE / 3, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + EDITOR_CELL_SIZE / 2 - 2, y + EDITOR_CELL_SIZE / 3, 4, EDITOR_CELL_SIZE / 2);
        }
      }

      // Lignes de grille
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.strokeRect(x, y, EDITOR_CELL_SIZE, EDITOR_CELL_SIZE);
    }
  }

  // Adapter l'affichage à l'écran
  fitEditorCanvas();
  updateEditorValidation();
}

// ─── Peinture ───────────────────────────────────────────────
function paintCell(r, c) {
  if (r < 0 || r >= editorRows || c < 0 || c >= editorCols) return;

  const newTile = EDITOR_TILES[editorTool];

  if (editorTool === 'player') {
    for (let rr = 0; rr < editorRows; rr++)
      for (let cc = 0; cc < editorCols; cc++) {
        if (rr === r && cc === c) continue;
        if (editorGrid[rr][cc] === '@') editorGrid[rr][cc] = ' ';
        else if (editorGrid[rr][cc] === '+') editorGrid[rr][cc] = '.';
      }
  }

  editorGrid[r][c] = newTile;
  drawEditorCanvas();
}

function selectEditorTool(tool) {
  editorTool = tool;
  document.querySelectorAll('.editor-tool').forEach(t => {
    t.classList.toggle('active', t.dataset.tool === tool);
  });
}

// ─── Fin de peinture (global) ───────────────────────────────
document.addEventListener('mouseup',  () => { isPainting = false; });
document.addEventListener('touchend', () => { isPainting = false; });

// ─── Raccourcis clavier (1-7) ───────────────────────────────
document.addEventListener('keydown', (e) => {
  if (currentScreen !== 'editor') return;
  const map = { '1':'wall','2':'floor','3':'goal','4':'block','5':'blockOnGoal','6':'player','7':'eraser' };
  if (map[e.key]) { selectEditorTool(map[e.key]); e.preventDefault(); }
});

// ─── Bordure auto ──────────────────────────────────────────
function fillBorder() {
  for (let r = 0; r < editorRows; r++)
    for (let c = 0; c < editorCols; c++)
      if (r === 0 || r === editorRows - 1 || c === 0 || c === editorCols - 1)
        editorGrid[r][c] = EDITOR_TILES.wall;
  drawEditorCanvas();
}

// ─── Tout effacer (garde uniquement les murs extérieurs) ──
function clearAllEditor() {
  for (let r = 0; r < editorRows; r++)
    for (let c = 0; c < editorCols; c++)
      editorGrid[r][c] = EDITOR_TILES.floor;
  fillBorder(); // remet les murs sur les bords + redessine le canvas
}

// ─── Export de la grille en chaîne SOK ──────────────────────
function getEditorDataString() {
  let maxC = 0, maxR = 0;
  for (let r = 0; r < editorRows; r++)
    for (let c = editorCols - 1; c >= 0; c--)
      if (editorGrid[r][c] !== EDITOR_TILES.floor) { maxC = Math.max(maxC, c); break; }
  for (let r = editorRows - 1; r >= 0; r--)
    for (let c = 0; c < editorCols; c++)
      if (editorGrid[r][c] !== EDITOR_TILES.floor) { maxR = Math.max(maxR, r); break; }
  const rows = [];
  for (let r = 0; r <= maxR; r++) {
    let row = '';
    for (let c = 0; c <= maxC; c++) row += editorGrid[r][c];
    rows.push(row);
  }
  return rows.join('\n');
}

// ─── Validation ─────────────────────────────────────────────
function validateEditor() {
  let playerCount = 0, blockCount = 0, goalCount = 0;
  for (let r = 0; r < editorRows; r++)
    for (let c = 0; c < editorCols; c++) {
      const t = editorGrid[r][c];
      if (t === '@' || t === '+') playerCount++;
      if (t === '$' || t === '*') blockCount++;
      if (t === '.' || t === '*' || t === '+') goalCount++;
    }
  if (playerCount !== 1)
    return { valid: false, error: `Le niveau doit contenir exactement 1 joueur (@). Actuellement : ${playerCount}.` };
  if (blockCount === 0)
    return { valid: false, error: 'Le niveau doit contenir au moins 1 sac ($).' };
  if (blockCount !== goalCount)
    return { valid: false, error: `Sacs (${blockCount}) ≠ Cibles (${goalCount}). Les deux nombres doivent être égaux.` };
  return { valid: true };
}

function autoEstimatePar() {
  let n = 0;
  for (let r = 0; r < editorRows; r++)
    for (let c = 0; c < editorCols; c++)
      if (editorGrid[r][c] === '$' || editorGrid[r][c] === '*') n++;
  return Math.max(5, n * 6);
}

// ─── Sauvegarde ─────────────────────────────────────────────
function saveEditorLevel() {
  const v = validateEditor();
  if (!v.valid) { showEditorMessage(v.error, 'error'); return; }

  const name = document.getElementById('editor-name').value.trim() || 'Niveau sans nom';
  let par = parseInt(document.getElementById('editor-par').value);
  if (!par || par < 1) par = autoEstimatePar();

  const data = getEditorDataString();
  const levels = loadCustomLevels();

  if (editingLevelId) {
    const idx = levels.findIndex(l => l.id === editingLevelId);
    if (idx !== -1) {
      levels[idx].name = name;
      levels[idx].data = data;
      levels[idx].par  = par;
    }
  } else {
    const newLevel = { id: generateCustomId(), name, data, par, diff: 3 };
    levels.unshift(newLevel);
    editingLevelId = newLevel.id;
  }
  saveCustomLevels(levels);
  showEditorMessage('Niveau sauvegardé dans « Niveaux Perso » !', 'success');
}

// ─── Tester le niveau ───────────────────────────────────────
function testEditorLevel() {
  const v = validateEditor();
  if (!v.valid) { showEditorMessage(v.error, 'error'); return; }

  const name = document.getElementById('editor-name').value.trim() || 'Test';
  let par = parseInt(document.getElementById('editor-par').value);
  if (!par || par < 1) par = autoEstimatePar();

  currentLevel = {
    id: 'test-' + Date.now(),
    name, par, diff: 3,
    data: getEditorDataString(),
    isCustom: true, isTest: true
  };
  showScreen('game');
}

// ─── Export (presse-papier) ─────────────────────────────────
function exportEditorLevel() {
  if (!editorGrid.length) { showEditorMessage('Grille vide.', 'error'); return; }
  const name = document.getElementById('editor-name').value.trim() || 'Niveau sans nom';
  let par = parseInt(document.getElementById('editor-par').value);
  if (!par || par < 1) par = autoEstimatePar();
  const code = JSON.stringify({ name, data: getEditorDataString(), par });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => showEditorMessage('Code copié dans le presse-papier !', 'success'))
      .catch(() => fallbackCopy(code));
  } else { fallbackCopy(code); }
}
function fallbackCopy(code) {
  const ta = document.getElementById('editor-export-text');
  ta.value = code; ta.style.display = 'block'; ta.select();
  try { document.execCommand('copy'); showEditorMessage('Code copié.', 'success'); }
  catch { showEditorMessage('Code affiché ci-dessous, copiez-le manuellement.', 'info'); }
}

// ─── Import ────────────────────────────────────────────────
function openImportModal() {
  closeSettings(); closeResetConfirm();
  document.getElementById('modal-import').classList.add('active');
  setTimeout(() => document.getElementById('import-textarea').focus(), 100);
}
function closeImportModal() {
  document.getElementById('modal-import').classList.remove('active');
  document.getElementById('import-textarea').value = '';
  document.getElementById('import-error').textContent = '';
}

// Ajoute aux niveaux perso
function importLevelFromText() {
  const text = document.getElementById('import-textarea').value.trim();
  const errEl = document.getElementById('import-error');
  errEl.textContent = '';
  if (!text) { errEl.textContent = 'Veuillez coller un code.'; return; }

  let parsed;
  try { parsed = JSON.parse(text); }
  catch { errEl.textContent = 'Format invalide : JSON attendu.'; return; }
  if (!parsed || !parsed.data || !parsed.name) {
    errEl.textContent = 'Code incomplet (name et data requis).'; return;
  }
  // Validation du contenu
  const rows = parsed.data.split('\n').filter(r => r !== '');
  if (!rows.length) { errEl.textContent = 'Aucune ligne dans data.'; return; }
  let p = 0, b = 0, g = 0;
  rows.forEach(row => [...row].forEach(ch => {
    if (ch === '@' || ch === '+') p++;
    if (ch === '$' || ch === '*') b++;
    if (ch === '.' || ch === '+' || ch === '*') g++;
  }));
  if (p !== 1) { errEl.textContent = `1 joueur requis. Trouvé : ${p}.`; return; }
  if (b === 0) { errEl.textContent = 'Aucun sac.'; return; }
  if (b !== g) { errEl.textContent = `Sacs (${b}) ≠ Cibles (${g}).`; return; }

  const levels = loadCustomLevels();
  levels.unshift({
    id: generateCustomId(),
    name: parsed.name,
    data: parsed.data,
    par: parsed.par || b * 6,
    diff: parsed.diff || 3
  });
  saveCustomLevels(levels);
  closeImportModal();
  showScreen('customLevels');
}

// Charge dans l'éditeur pour modification
function importIntoEditorFromModal() {
  const text = document.getElementById('import-textarea').value.trim();
  const errEl = document.getElementById('import-error');
  errEl.textContent = '';
  if (!text) { errEl.textContent = 'Veuillez coller un code.'; return; }

  let parsed;
  try { parsed = JSON.parse(text); }
  catch { errEl.textContent = 'Format invalide : JSON attendu.'; return; }
  if (!parsed || !parsed.data) {
    errEl.textContent = 'Code incomplet (data requis).'; return;
  }

  loadLevelIntoEditor(parsed);
  closeImportModal();
  showScreen('editor');
}

function loadLevelIntoEditor(parsed) {
  const rows = parsed.data.split('\n').filter(r => r !== '');
  const dataCols = Math.max(...rows.map(r => r.length));
  const dataRows = rows.length;
  const newCols = Math.min(20, Math.max(1, dataCols));
  const newRows = Math.min(20, Math.max(1, dataRows));

  editorCols = newCols;
  editorRows = newRows;
  document.getElementById('editor-cols').value = newCols;
  document.getElementById('editor-rows').value = newRows;

  editorGrid = [];
  for (let r = 0; r < newRows; r++) {
    const row = [];
    for (let c = 0; c < newCols; c++) {
      const ch = rows[r] ? rows[r][c] : undefined;
      row.push(ch || EDITOR_TILES.wall);
    }
    editorGrid.push(row);
  }
  document.getElementById('editor-name').value = parsed.name || 'Import';
  document.getElementById('editor-par').value = parsed.par || '';
  editingLevelId = null;
  editorInitialized = true;
  selectEditorTool('wall');
  fillBorder();

  if (dataCols > 20 || dataRows > 20)
    showEditorMessage('Niveau chargé (rogné à 20×20 max).', 'info');
  else
    showEditorMessage('Niveau chargé dans l\'éditeur.', 'info');
}

// ─── Message d'état ────────────────────────────────────────
function showEditorMessage(text, type) {
  const msg = document.getElementById('editor-message');
  msg.textContent = text;
  msg.className = 'editor-message ' + (type || 'info');
  clearTimeout(showEditorMessage._t);
  showEditorMessage._t = setTimeout(() => {
    msg.textContent = ''; msg.className = 'editor-message';
  }, 3500);
}

// ─── Éditer un niveau perso existant ───────────────────────
function editCustomLevel(id) {
  const level = loadCustomLevels().find(l => l.id === id);
  if (!level) return;
  const rows = level.data.split('\n').filter(r => r !== '');
  const dataCols = Math.max(...rows.map(r => r.length));
  const dataRows = rows.length;
  const newCols = Math.min(20, Math.max(1, dataCols));
  const newRows = Math.min(20, Math.max(1, dataRows));

  editorCols = newCols;
  editorRows = newRows;
  document.getElementById('editor-cols').value = newCols;
  document.getElementById('editor-rows').value = newRows;

  editorGrid = [];
  for (let r = 0; r < newRows; r++) {
    const row = [];
    for (let c = 0; c < newCols; c++) {
      const ch = rows[r] ? rows[r][c] : undefined;
      row.push(ch || EDITOR_TILES.wall);
    }
    editorGrid.push(row);
  }
  editingLevelId = id;
  document.getElementById('editor-name').value = level.name || '';
  document.getElementById('editor-par').value = level.par || '';
  editorInitialized = true;
  selectEditorTool('wall');
  fillBorder();
  showScreen('editor');
}

// ─── Supprimer un niveau perso ─────────────────────────────
function deleteCustomLevel(id) {
  if (!confirm('Supprimer définitivement ce niveau ?')) return;
  saveCustomLevels(loadCustomLevels().filter(l => l.id !== id));
  const scores = loadCustomScores();
  delete scores[id];
  saveCustomScores(scores);
  renderCustomLevels();
}

// ─── Exporter depuis la liste perso ────────────────────────
function exportCustomLevel(id) {
  const level = loadCustomLevels().find(l => l.id === id);
  if (!level) return;
  const code = JSON.stringify({ name: level.name, data: level.data, par: level.par });
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => alert('Code copié !'))
      .catch(() => prompt('Code du niveau :', code));
  } else { prompt('Code du niveau :', code); }
}

// ─── Jouer un niveau perso ─────────────────────────────────
function playCustomLevel(id) {
  const level = loadCustomLevels().find(l => l.id === id);
  if (!level) return;
  currentLevel = { ...level, isCustom: true, isTest: false };
  showScreen('game');
}

// ─── Rendu de la liste des niveaux perso ────────────────────
function renderCustomLevels() {
  const levels = loadCustomLevels();
  const scores = loadCustomScores();
  const wrap = document.getElementById('cl-grid');
  const countEl = document.getElementById('cl-count');
  if (countEl) countEl.textContent = levels.length + ' niveau' + (levels.length > 1 ? 'x' : '') + ' créé' + (levels.length > 1 ? 's' : '');
  wrap.innerHTML = '';

  if (levels.length === 0) {
    wrap.innerHTML = `<div class="cl-empty">
      <p>Vous n'avez pas encore créé de niveau.</p>
      <p>Rendez-vous dans l'<strong>Éditeur de Niveau</strong> pour commencer, ou importez un code fourni par un ami.</p>
    </div>`;
    return;
  }

  levels.forEach(level => {
    const score = scores[level.id];
    const card = document.createElement('div');
    card.className = 'custom-card';

    const preview = document.createElement('div');
    preview.className = 'cl-preview';
    preview.innerHTML = renderLevelPreview(level.data);

    let starsHtml = '';
    if (score?.completed)
      for (let i = 1; i <= 3; i++)
        starsHtml += `<img src="images/symboleetoile.png" class="lc-star-img${score.stars >= i ? ' earned' : ''}" alt="">`;

    const info = document.createElement('div');
    info.className = 'cl-info';
    info.innerHTML = `
      <div class="cl-name">${escapeHtml(level.name)}</div>
      <div class="cl-meta">
        <span>Réalisable en : ${level.par || '?'}</span>
        ${score?.completed ? `<span class="cl-best">Fait en ${score.bestMoves}</span>` : '<span class="cl-pending">Non réussi</span>'}
      </div>
      ${starsHtml ? `<div class="cl-stars">${starsHtml}</div>` : ''}
    `;

    const actions = document.createElement('div');
    actions.className = 'cl-actions';
    actions.innerHTML = `
      <button class="btn btn-primary btn-small" data-act="play">Jouer</button>
      <button class="btn btn-outline btn-small" data-act="edit">Éditer</button>
      <button class="btn btn-outline btn-small" data-act="export">Copier code</button>
      <button class="btn btn-danger btn-small" data-act="delete">Suppr.</button>
    `;
    actions.querySelector('[data-act="play"]').onclick   = () => playCustomLevel(level.id);
    actions.querySelector('[data-act="edit"]').onclick   = () => editCustomLevel(level.id);
    actions.querySelector('[data-act="export"]').onclick  = () => exportCustomLevel(level.id);
    actions.querySelector('[data-act="delete"]').onclick  = () => deleteCustomLevel(level.id);

    card.appendChild(preview);
    card.appendChild(info);
    card.appendChild(actions);
    wrap.appendChild(card);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ─── Mini-prévisualisation d'un niveau ────────────────────
function renderLevelPreview(data) {
  const rows = data.split('\n').filter(r => r !== '');
  const cols = Math.max(...rows.map(r => r.length));
  const rowCount = rows.length;
  let html = `<div class="preview-grid" style="grid-template-columns: repeat(${cols}, 1fr); aspect-ratio: ${cols} / ${rowCount};">`;
  rows.forEach(row => {
    const padded = row.padEnd(cols, ' ');
    [...padded].forEach(ch => {
      let cls = 'pcell-floor';
      if (ch === '#') cls = 'pcell-wall';
      else if (ch === '@' || ch === '+') cls = 'pcell-player';
      else if (ch === '$') cls = 'pcell-block';
      else if (ch === '*') cls = 'pcell-blockongoal';
      else if (ch === '.') cls = 'pcell-goal';
      html += `<div class="${cls}"></div>`;
    });
  });
  html += '</div>';
  return html;
}

// ─── Resize : adapter le canvas éditeur ─────────────────────
window.addEventListener('resize', () => {
  if (currentScreen === 'editor') {
    clearTimeout(window._editorFitTimer);
    window._editorFitTimer = setTimeout(fitEditorCanvas, 100);
  }
});

// ─── Conversion coordonnées souris → grille ───────────────
function getEditorCoords(clientX, clientY) {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return { r: -1, c: -1 };
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top)  * scaleY;
  return {
    c: Math.floor(x / EDITOR_CELL_SIZE),
    r: Math.floor(y / EDITOR_CELL_SIZE)
  };
}

// ─── Initialiser les events du canvas ──────────────────────
function initEditorCanvasEvents() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) return;

  // --- Souris ---
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isPainting = true;
    const { r, c } = getEditorCoords(e.clientX, e.clientY);
    paintCell(r, c);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isPainting) return;
    const { r, c } = getEditorCoords(e.clientX, e.clientY);
    paintCell(r, c);
  });

  // --- Tactile ---
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isPainting = true;
    const t = e.touches[0];
    const { r, c } = getEditorCoords(t.clientX, t.clientY);
    paintCell(r, c);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isPainting) return;
    const t = e.touches[0];
    const { r, c } = getEditorCoords(t.clientX, t.clientY);
    paintCell(r, c);
  }, { passive: false });

  // --- Clic droit = gomme rapide ---
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const prevTool = editorTool;
    selectEditorTool('eraser');
    const { r, c } = getEditorCoords(e.clientX, e.clientY);
    paintCell(r, c);
    selectEditorTool(prevTool);
  });
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', initEditorCanvasEvents);