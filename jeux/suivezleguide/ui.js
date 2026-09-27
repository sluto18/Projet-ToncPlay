(function () {
  const SKILL_META = {
    block: { short: 'BLOC', name: 'BLOQUEUR', help: 'Bloque le chemin et renvoie les lemmings.' },
    dig: { short: 'CREU', name: 'CREUSEUR', help: 'Creuse sous ses pieds en profondeur.' },
    float: { short: 'PARA', name: 'PARACHUTISTE', help: 'Déploie un parachute en chute.' },
    climb: { short: 'GRIM', name: 'GRIMPEUR', help: 'Escalade les parois et se hisse en haut.' },
    bash: { short: 'FOR', name: 'FOREUR', help: 'Perce les murs devant lui.' },
    build: { short: 'BRI', name: 'BÂTISSEUR', help: 'Pose un escalier de briques.' },
    mine: { short: 'PICO', name: 'MINEUR', help: 'Creuse un tunnel en diagonale.' },
    bomb: { short: 'BOM', name: 'EXPLOSIF', help: 'Compte à rebours puis explose.' }
  };

  function bindHint(el, key) {
    const meta = SKILL_META[key] || { short: key.toUpperCase(), name: key, help: 'Compétence' };
    el.setAttribute('title', meta.name + ' — ' + meta.help);
    el.setAttribute('aria-label', meta.name + ' — ' + meta.help);

  }

  window.SkillUI = { meta: SKILL_META, bindHint };
})();
