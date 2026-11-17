"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";

// Glissement entre deux vues voisines, au doigt (setlist G : Liste à gauche,
// Partitions à droite ; docs/spec-deux-volets.md, question 13, tranche T3).
// Pointer Events et un ressort écrit à la main, sans bibliothèque (question 8).

/** Un geste parti à moins de 24 px d'un bord appartient au système (retour). */
const BORD = 24;
/** Le geste choisit son sens après 10 px. */
const ENGAGEMENT = 10;
/** Horizontal s'il dépasse 1,5 fois l'écart vertical ; sinon le défilement gagne. */
const RAPPORT = 1.5;
/** Validé si la position projetée dépasse un tiers de l'écran. */
const PART = 1 / 3;
/** Vitesse lue sur les 100 dernières ms du geste. */
const FENETRE_VITESSE = 100;
/** Ressort critique (sans rebond), réponse de 0,35 s. */
const REPONSE = 0.35;

/** Ce que dit le début d'un geste : pas encore assez loin, glisser ou défiler. */
export function lireIntention(dx: number, dy: number): "attente" | "glisser" | "defiler" {
  if (Math.hypot(dx, dy) < ENGAGEMENT) return "attente";
  return Math.abs(dx) > RAPPORT * Math.abs(dy) ? "glisser" : "defiler";
}

/** Où l'élan porterait la vue (px), comme la décélération d'un défilement. */
export function projection(vitesse: number, deceleration = 0.998): number {
  return ((vitesse / 1000) * deceleration) / (1 - deceleration);
}

/** Issue du geste au lâcher : -1 vers la gauche, 1 vers la droite, 0 retour en place.
 *  La projection doit dépasser le tiers du côté où la vue a été emmenée. */
export function issueDuGeste(dx: number, vitesse: number, largeur: number): -1 | 0 | 1 {
  const p = dx + projection(vitesse);
  if (Math.abs(p) <= largeur * PART || Math.sign(p) !== Math.sign(dx)) return 0;
  return p < 0 ? -1 : 1;
}

/** Résistance au-delà d'une borne : plus on tire, moins la vue suit. */
function elastique(depassement: number, dimension: number, constante = 0.55): number {
  return (depassement * dimension * constante) / (dimension + constante * Math.abs(depassement));
}

/** La cible du doigt est dans un élément qui défile en largeur. */
function defileEnLargeur(cible: EventTarget | null, zone: HTMLElement): boolean {
  for (let el = cible instanceof Element ? cible : null; el && el !== zone; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el);
    if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
}

const selectionEnCours = () => {
  const s = window.getSelection();
  return !!s && !s.isCollapsed;
};

type Options = {
  /** Où le doigt se pose (ses événements y sont écoutés). */
  zone: RefObject<HTMLElement | null>;
  /** Ce qui suit le doigt : la vue affichée. */
  vue: RefObject<HTMLElement | null>;
  /** La vue affichée : quand elle change après un geste validé, la nouvelle arrive du côté du geste. */
  cle: string;
  /** Doigt vers la gauche : la vue de droite. Absent : rien de ce côté. */
  versGauche?: () => void;
  /** Doigt vers la droite : la vue de gauche. */
  versDroite?: () => void;
  actif: boolean;
};

/** Le doigt emmène la vue ; au lâcher, elle part du côté du geste (puis la
 *  nouvelle arrive de l'autre bord) ou revient en ressort. Mouvement réduit :
 *  la vue ne bouge pas, la nouvelle apparaît en fondu. */
export function useSwipeViews(options: Options) {
  const opts = useRef(options);
  useLayoutEffect(() => {
    opts.current = options;
  });
  /** Décalage affiché et animation en cours (interrompue si le doigt reprend la vue). */
  const x = useRef(0);
  const anim = useRef(0);
  /** Geste validé : la vue est sortie, on attend la nouvelle (`cle`). */
  const entree = useRef<{ sens: -1 | 1; vitesse: number; fondu: boolean } | null>(null);
  const attente = useRef(0);
  /** Une View Transition est en cours ; `vueRendue` dit qu'elle peut aller de l'avant (`cle` a changé). */
  const enTransition = useRef(false);
  const vueRendue = useRef<(() => void) | null>(null);

  const poser = (v: number) => {
    x.current = v;
    const el = opts.current.vue.current;
    const zone = opts.current.zone.current;
    if (!el) return;
    el.style.transform = v === 0 ? "" : `translate3d(${v}px,0,0)`;
    // La vue hors de sa colonne ne doit pas élargir la page le temps du geste.
    if (zone) zone.style.overflowX = v === 0 ? "" : "clip";
  };

  const arreter = () => {
    cancelAnimationFrame(anim.current);
    anim.current = 0;
  };

  /** Ressort critique de la position affichée vers `vers`, à la vitesse du doigt. */
  const ressort = (vers: number, vitesse: number, fini?: () => void, assez = (_v: number) => false) => {
    arreter();
    const w = (2 * Math.PI) / REPONSE;
    let v = vitesse;
    let avant = performance.now();
    const pas = (now: number) => {
      const dt = Math.min(0.032, (now - avant) / 1000);
      avant = now;
      let pos = x.current;
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        v += (-w * w * (pos - vers) - 2 * w * v) * h;
        pos += v * h;
      }
      if ((Math.abs(pos - vers) < 0.5 && Math.abs(v) < 20) || assez(pos)) {
        anim.current = 0;
        poser(assez(pos) ? pos : vers);
        fini?.();
        return;
      }
      poser(pos);
      anim.current = requestAnimationFrame(pas);
    };
    anim.current = requestAnimationFrame(pas);
  };

  const retour = () => {
    if (x.current !== 0) ressort(0, 0);
  };

  /** Geste ou toucher validé : on attend la nouvelle vue (`cle`) ; si elle ne vient pas, la vue revient. */
  const armer = (sens: -1 | 1, vitesse: number, fondu: boolean) => {
    entree.current = { sens, vitesse, fondu };
    window.clearTimeout(attente.current);
    attente.current = window.setTimeout(() => {
      if (!entree.current) return;
      entree.current = null;
      retour();
    }, 1000);
  };

  /** Changement de vue par View Transitions (AT1) : l'image de l'ancienne vue et la nouvelle glissent ensemble. */
  const transition = (sens: -1 | 1, aller: () => void) => {
    const html = document.documentElement;
    html.dataset.glisseVues = String(sens);
    enTransition.current = true;
    const vt = document.startViewTransition(async () => {
      // Pas de requestAnimationFrame ici : le rendu est suspendu pendant ce rappel.
      const rendue = new Promise<boolean>((fin) => {
        vueRendue.current = () => fin(true);
        window.setTimeout(() => fin(false), 1000);
      });
      flushSync(aller);
      poser(0);
      if (!(await rendue)) vt.skipTransition();
      vueRendue.current = null;
    });
    const glisse = (pseudoElement: string, de: number, a: number) =>
      html.animate(
        [{ transform: `translateX(${de}vw)` }, { transform: `translateX(${a}vw)` }],
        { duration: 350, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "both", pseudoElement },
      );
    let anims: Animation[] = [];
    vt.ready.then(() => {
      anims = [glisse("::view-transition-old(root)", 0, sens * 100), glisse("::view-transition-new(root)", -sens * 100, 0)];
    }, () => {});
    const fin = () => {
      anims.forEach((a) => a.cancel());
      delete html.dataset.glisseVues;
      enTransition.current = false;
    };
    vt.finished.then(fin, fin);
  };

  const valider = (sens: -1 | 1, vitesse: number, reduit: boolean) => {
    const o = opts.current;
    const aller = sens < 0 ? o.versGauche : o.versDroite;
    if (!aller) return retour();
    if (enTransition.current) return;
    if (!reduit && "startViewTransition" in document) return transition(sens, aller);
    armer(sens, vitesse, reduit);
    if (reduit) return aller();
    const largeur = window.innerWidth;
    ressort(sens * largeur, vitesse, aller, (pos) => Math.abs(pos) >= largeur * 0.98);
  };

  /** Bascule au toucher (bouton, ligne de la Liste) : même chemin que le geste validé. `aller` remplace le rappel du sens. */
  const glisser = (sens: -1 | 1, aller = sens < 0 ? opts.current.versGauche : opts.current.versDroite) => {
    if (!opts.current.actif || entree.current || enTransition.current) return aller?.();
    if (!aller) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      armer(sens, 0, true);
      return aller();
    }
    if ("startViewTransition" in document) return transition(sens, aller);
    // AT7 : la vue change tout de suite et la nouvelle entre du bord (effet d'entrée), sans sortie de l'ancienne.
    armer(sens, 0, false);
    aller();
  };

  // La nouvelle vue est là : elle arrive du bord opposé au geste (ou en fondu).
  useLayoutEffect(() => {
    vueRendue.current?.();
    const e = entree.current;
    const el = opts.current.vue.current;
    if (!e || !el) return;
    entree.current = null;
    window.clearTimeout(attente.current);
    if (e.fondu) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
      return;
    }
    const largeur = window.innerWidth;
    poser(-e.sens * largeur);
    // Élan du doigt gardé, borné pour ne pas dépasser sa place.
    const lim = ((2 * Math.PI) / REPONSE) * largeur * 0.8;
    ressort(0, Math.max(-lim, Math.min(lim, e.vitesse)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seul le changement de vue compte
  }, [options.cle]);

  useEffect(() => {
    const zone = opts.current.zone.current;
    if (!options.actif || !zone) return;
    // Le navigateur garde le défilement vertical ; le geste horizontal est à nous.
    zone.style.touchAction = "pan-y pinch-zoom";

    let geste: {
      id: number;
      x0: number;
      y0: number;
      base: number;
      engage: boolean;
      reduit: boolean;
      hist: { x: number; t: number }[];
    } | null = null;

    // Après un glissement, le doigt levé ne touche pas la ligne ou le lien de départ. Le
    // clic de ce doigt, s'il vient, suit aussitôt son lâcher : le toucher suivant (un
    // nouveau pointerdown) n'est jamais avalé, même dans les 400 ms.
    const avalerClic = () => {
      const finir = () => {
        zone.removeEventListener("click", stop, { capture: true });
        window.removeEventListener("pointerdown", finir, { capture: true });
        window.clearTimeout(minuteur);
      };
      const stop = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        finir();
      };
      zone.addEventListener("click", stop, { capture: true });
      window.addEventListener("pointerdown", finir, { capture: true });
      const minuteur = window.setTimeout(finir, 400);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !e.isPrimary || entree.current) return;
      if (e.clientX < BORD || e.clientX > window.innerWidth - BORD) return;
      if (selectionEnCours() || defileEnLargeur(e.target, zone)) return;
      arreter();
      geste = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        base: x.current,
        engage: false,
        reduit: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        hist: [{ x: e.clientX, t: e.timeStamp }],
      };
    };

    const move = (e: PointerEvent) => {
      const g = geste;
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x0;
      if (!g.engage) {
        const intention = lireIntention(dx, e.clientY - g.y0);
        if (intention === "attente") return;
        if (intention === "defiler" || selectionEnCours()) {
          geste = null;
          return retour();
        }
        g.engage = true;
        try {
          zone.setPointerCapture(e.pointerId);
        } catch {
          /* pointeur déjà relâché */
        }
      }
      g.hist.push({ x: e.clientX, t: e.timeStamp });
      if (g.reduit) return;
      const brut = g.base + dx;
      const o = opts.current;
      const possible = brut < 0 ? o.versGauche : o.versDroite;
      poser(possible ? brut : elastique(brut, window.innerWidth));
    };

    const up = (e: PointerEvent) => {
      const g = geste;
      if (!g || e.pointerId !== g.id) return;
      geste = null;
      if (!g.engage) return retour();
      avalerClic();
      const recents = g.hist.filter((h) => h.t >= e.timeStamp - FENETRE_VITESSE);
      const premier = recents[0];
      const dernier = recents[recents.length - 1];
      const duree = recents.length > 1 ? (dernier.t - premier.t) / 1000 : 0;
      const vitesse = duree > 0 ? (dernier.x - premier.x) / duree : 0;
      const sens = issueDuGeste(g.base + (e.clientX - g.x0), vitesse, window.innerWidth);
      if (sens === 0) return retour();
      valider(sens, vitesse, g.reduit);
    };

    const cancel = (e: PointerEvent) => {
      if (!geste || e.pointerId !== geste.id) return;
      geste = null;
      retour();
    };

    zone.addEventListener("pointerdown", down, { passive: true });
    zone.addEventListener("pointermove", move, { passive: true });
    zone.addEventListener("pointerup", up, { passive: true });
    zone.addEventListener("pointercancel", cancel, { passive: true });
    return () => {
      zone.removeEventListener("pointerdown", down);
      zone.removeEventListener("pointermove", move);
      zone.removeEventListener("pointerup", up);
      zone.removeEventListener("pointercancel", cancel);
      zone.style.touchAction = "";
      arreter();
      window.clearTimeout(attente.current);
      entree.current = null;
      poser(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les rappels sont lus dans `opts`
  }, [options.actif]);

  return { glisser };
}
