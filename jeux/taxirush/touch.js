/* =========================================================================
   TAXI RUSH — contrôles tactiles (joystick flottant + boutons) v2
   -------------------------------------------------------------------------
   Fichier AUTONOME : aucune modification de game.js.
   Injecte ses entrées dans `keys` (codes e.code identiques au clavier).
   Activation :
   1. immédiate si l'appareil se déclare tactile au chargement ;
   2. dynamique au PREMIER événement tactile, où qu'il soit (couvre la vue
      adaptative de Firefox où la simulation tactile est activée après
      le chargement de la page — aucun rechargement nécessaire) ;
   3. manuelle avec la touche T (test garanti sur tout navigateur).
   Le joystick n'apparaît qu'en cours de partie (il vit dans le HUD).
   ========================================================================= */
'use strict';

(function(){

  let active = false;

  function activate(){
    if (active) return;
    if (typeof keys === 'undefined' || typeof sfx === 'undefined'){
      console.warn('[touch.js] game.js introuvable — vérifiez l’ordre des balises <script>.');
      return;
    }
    const el = {
      root:  document.getElementById('touch-ui'),
      zone:  document.getElementById('joy-zone'),
      base:  document.getElementById('joy-base'),
      stick: document.getElementById('joy-stick'),
      hb:    document.getElementById('tb-hb'),
      horn:  document.getElementById('tb-horn'),
      menu:  document.getElementById('tb-menu'),
    };
    if (!el.root || !el.zone){
      console.warn('[touch.js] #touch-ui absent du HTML — index.html pas à jour.');
      return;
    }
    active = true;
    el.root.classList.remove('hidden');

    const joy = { id: null, bx: 0, by: 0 };
    const R = 46;    // course maximale du stick (px)
    const DEAD = 10; // zone morte horizontale (px)
    const TILT = 16; // seuil vertical accélérateur/frein (px)
    const key = (code, on) => { keys[code] = on; };

    function applySteer(dx, dy){
      key('KeyA', dx < -DEAD);   // gauche
      key('KeyD', dx >  DEAD);   // droite
      key('KeyW', dy < -TILT);   // accélérer
      key('KeyS', dy >  TILT);   // freiner / marche arrière
    }
    function releaseDrive(){
      key('KeyA', false); key('KeyD', false);
      key('KeyW', false); key('KeyS', false);
    }

    /* --- Joystick flottant : il apparaît là où le doigt se pose --- */
    el.zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      sfx.init(); sfx.resume();          // déblocage audio iOS au 1er toucher
      if (joy.id !== null) return;       // un seul doigt dirige
      const t = e.changedTouches[0];
      joy.id = t.identifier;
      joy.bx = t.clientX; joy.by = t.clientY;
      el.base.style.display = 'block';
      el.base.style.left = joy.bx + 'px';
      el.base.style.top  = joy.by + 'px';
      el.stick.style.transform = 'translate(0px, 0px)';
    }, { passive: false });

    el.zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches){
        if (t.identifier !== joy.id) continue;
        let dx = t.clientX - joy.bx, dy = t.clientY - joy.by;
        const d = Math.hypot(dx, dy);
        if (d > R){ dx = dx / d * R; dy = dy / d * R; }   // borné au rayon
        el.stick.style.transform = `translate(${dx}px, ${dy}px)`;
        applySteer(dx, dy);
      }
    }, { passive: false });

    const joyEnd = (e) => {
      for (const t of e.changedTouches){
        if (t.identifier !== joy.id) continue;
        joy.id = null;
        releaseDrive();
        el.base.style.display = 'none';
      }
    };
    el.zone.addEventListener('touchend', joyEnd);
    el.zone.addEventListener('touchcancel', joyEnd);

    /* --- Boutons (maintien = touche enfoncée) --- */
    function bindHold(btn, on, off){
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sfx.init(); sfx.resume();
        on();
      }, { passive: false });
      const up = (e) => { e.preventDefault(); off(); };
      btn.addEventListener('touchend', up);
      btn.addEventListener('touchcancel', up);
    }
    bindHold(el.hb,   () => key('Space', true), () => key('Space', false));
    bindHold(el.horn, () => sfx.horn(true),     () => sfx.horn(false));
    bindHold(el.menu, () => { if (state.mode === 'playing') toMenu(); }, () => {});

    console.info('[touch.js] contrôles tactiles ACTIVÉS');
  }

  /* 1) Immédiat sur un vrai appareil tactile */
  if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window){
    activate();
  }

  /* 2) Dynamique : dès qu'un événement tactile arrive, où que ce soit
        dans la page. Idempotent (activate() ne fait rien si déjà actif),
        donc on peut le laisser branché en permanence sans coût. */
  window.addEventListener('touchstart', activate, { capture: true, passive: true });

  /* 3) Échappatoire manuelle : la touche T active l'UI tactile
        (utile pour tester sans simulation tactile du tout) */
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && !e.repeat) activate();
  });
})();