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

const OLD = "::view-transition-old(root)";
const NEW = "::view-transition-new(root)";
/** Courbe de la fin du glissement (AT3). */
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/** La transition en cours et ce qui la mène (AT5). */
type Pilote = {
  vt: ReturnType<Document["startViewTransition"]>;
  sens: -1 | 1;
  largeur: number;
  anims: Animation[] | null;
  maintien: Animation | null;
  phase: "menee" | "fin" | "retour" | "inverse";
  /** Position voulue de l'image d'origine (px signé, entre 0 et sens × largeur). */
  pos: number;
  scrollY0: number;
  /** `ready` est passé : les animations peuvent être posées. */
  pret: boolean;
  /** Doigt levé avant `ready` : sa vitesse, la décision suit `ready`. */
  vitesse: number | null;
};

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
  /** `vueRendue` dit qu'une attente peut aller de l'avant (`cle` a changé). */
  const vueRendue = useRef<(() => void) | null>(null);
  /** Le pilote de la View Transition en cours (une seule mécanique : toucher, bascule, doigt). */
  const pil = useRef<Pilote | null>(null);

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

  /** Deux animations des images (old : `de` → `a`, new : décalées d'une largeur), en px. */
  const images = (p: Pilote, de: number, a: number, duree: number, easing: string) => {
    const html = document.documentElement;
    const glisse = (pseudoElement: string, d: number, v: number) =>
      html.animate([{ transform: `translateX(${d}px)` }, { transform: `translateX(${v}px)` }], { duration: duree, easing, fill: "both", pseudoElement });
    p.anims?.forEach((an) => an.cancel());
    p.anims = [glisse(OLD, de, a), glisse(NEW, de - p.sens * p.largeur, a - p.sens * p.largeur)];
    return p.anims;
  };

  /** Phase « menée » : animations linéaires en pause, `currentTime` tenu par la position `pos`. */
  const mener = (p: Pilote, pos: number) => {
    const as = images(p, 0, p.sens * p.largeur, 1000, "linear");
    as.forEach((an) => {
      an.pause();
      an.currentTime = (1000 * Math.abs(pos)) / p.largeur;
    });
    p.phase = "menee";
  };

  /** La transition se termine : on libère le maintien, `finished` fait le reste. */
  const terminer = (p: Pilote) => p.maintien?.cancel();

  /** Fin (vers le bout) ou retour (vers 0) depuis la position courante, 350 ms × la part restante (120 ms au moins). */
  const course = (p: Pilote, versLeBout: boolean) => {
    const arrivee = versLeBout ? p.sens * p.largeur : 0;
    const duree = Math.max(120, (350 * Math.abs(arrivee - p.pos)) / p.largeur);
    const as = images(p, p.pos, arrivee, duree, EASE);
    p.phase = versLeBout ? "fin" : "retour";
    Promise.all(as.map((an) => an.finished)).then(() => {
      if (p.anims !== as) return;
      if (versLeBout) terminer(p);
      else inverse(p);
    }, () => {});
  };

  /** Retour fini : la vue d'origine est rendue (côté opposé) pendant que l'image couvre l'écran, défilement remis. */
  const inverse = (p: Pilote) => {
    p.phase = "inverse";
    const o = opts.current;
    const aller = p.sens < 0 ? o.versDroite : o.versGauche;
    let fait = false;
    const minuteur = window.setTimeout(() => suite(), 1000);
    const suite = () => {
      if (fait) return;
      fait = true;
      window.clearTimeout(minuteur);
      vueRendue.current = null;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (pil.current !== p) return;
          window.scrollTo({ top: p.scrollY0, behavior: "instant" });
          terminer(p);
        }),
      );
    };
    if (!aller) return suite();
    vueRendue.current = suite;
    aller();
  };

  /** Issue au lâcher : la suite part au bout, sinon tout revient puis la vue d'origine est rendue. */
  const decider = (p: Pilote, vitesse: number) => course(p, issueDuGeste(p.pos, vitesse, p.largeur) === p.sens);

  const lacher = (p: Pilote, vitesse: number) => {
    if (p.pret) decider(p, vitesse);
    else p.vitesse = vitesse;
  };

  /** Le pilote est vidé et la page nettoyée (`saut` : la transition est abandonnée). */
  const nettoyer = (p: Pilote, saut = false) => {
    if (pil.current !== p) return;
    pil.current = null;
    p.anims?.forEach((an) => an.cancel());
    p.maintien?.cancel();
    const html = document.documentElement;
    delete html.dataset.glisseVues;
    html.style.touchAction = "";
    if (saut) {
      try {
        p.vt.skipTransition();
      } catch {
        /* déjà finie */
      }
    }
  };

  /** Changement de vue par View Transitions (AT1). `menee` : le doigt tient les images ; sinon elles vont au bout (350 ms). */
  const transition = (sens: -1 | 1, aller: () => void, menee = false) => {
    const html = document.documentElement;
    html.dataset.glisseVues = String(sens);
    // Pendant la transition les pointeurs vont à <html> : le navigateur ne doit pas prendre le doigt pour un défilement.
    html.style.touchAction = "none";
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
    const p: Pilote = {
      vt, sens, largeur: window.innerWidth, anims: null, maintien: null, phase: menee ? "menee" : "fin",
      pos: 0, scrollY0: window.scrollY, pret: false, vitesse: null,
    };
    pil.current = p;
    vt.ready.then(() => {
      if (pil.current !== p) return;
      // Garde la transition ouverte tant que le doigt ou l'animation de fin n'ont pas fini.
      p.maintien = html.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 3600000, pseudoElement: "::view-transition-group(root)" });
      p.pret = true;
      if (menee) {
        mener(p, p.pos);
        if (p.vitesse !== null) decider(p, p.vitesse);
      } else course(p, true);
    }, () => {});
    const fin = () => nettoyer(p);
    vt.finished.then(fin, fin);
  };

  /** Bascule au toucher (bouton, ligne de la Liste) : même chemin que le geste validé. `aller` remplace le rappel du sens. */
  const glisser = (sens: -1 | 1, aller = sens < 0 ? opts.current.versGauche : opts.current.versDroite) => {
    if (!opts.current.actif || entree.current) return aller?.();
    if (!aller) return;
    // Un glissement finit encore (toucher, bascule) : la vue change sans nouveau mouvement, comme en T1.
    // Mené par le doigt ou en retour : le doigt décide, le toucher est ignoré.
    if (pil.current) return pil.current.phase === "fin" ? aller() : undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      armer(sens, 0, true);
      return aller();
    }
    if ("startViewTransition" in document) return transition(sens, aller);
    // AT7 : la vue change tout de suite et la nouvelle entre du bord (effet d'entrée), sans sortie de l'ancienne.
    armer(sens, 0, false);
    aller();
  };

  /** Geste validé sans View Transitions (AT7) ou en mouvement réduit. */
  const valider = (sens: -1 | 1, vitesse: number, reduit: boolean) => {
    const o = opts.current;
    const aller = sens < 0 ? o.versGauche : o.versDroite;
    if (!aller) return retour();
    armer(sens, vitesse, reduit);
    if (reduit) return aller();
    const largeur = window.innerWidth;
    ressort(sens * largeur, vitesse, aller, (pos) => Math.abs(pos) >= largeur * 0.98);
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
      /** Le doigt mène les images de la View Transition (pilote). */
      suit: boolean;
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
      if (e.pointerType !== "touch" || !e.isPrimary || entree.current || pil.current) return;
      if (e.clientX < BORD || e.clientX > window.innerWidth - BORD) return;
      // Une fenêtre qui porte ses propres gestes (feuille « Affichage ») n'emmène pas la vue.
      if (e.target instanceof Element && e.target.closest("[data-sans-glissement]")) return;
      if (selectionEnCours() || defileEnLargeur(e.target, zone)) return;
      arreter();
      geste = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        base: x.current,
        engage: false,
        reduit: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        suit: false,
        hist: [{ x: e.clientX, t: e.timeStamp }],
      };
    };

    /** Un doigt se pose pendant la fin ou le retour du glissement : il reprend les images où elles en sont.
     *  Pendant une View Transition les pointeurs vont à <html> : écouté sur `document`, hors de la zone. */
    const reprise = (e: PointerEvent) => {
      const p = pil.current;
      if (!p || !p.pret || (p.phase !== "fin" && p.phase !== "retour")) return;
      if (e.pointerType !== "touch" || !e.isPrimary) return;
      e.stopPropagation();
      const t = getComputedStyle(document.documentElement, OLD).transform;
      const lu = t === "none" ? 0 : new DOMMatrixReadOnly(t).m41;
      p.pos = Math.max(Math.min(0, p.sens * p.largeur), Math.min(Math.max(0, p.sens * p.largeur), lu));
      mener(p, p.pos);
      geste = {
        id: e.pointerId, x0: e.clientX, y0: e.clientY, base: p.pos, engage: true, reduit: false, suit: true,
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
        const sens = dx < 0 ? -1 : 1;
        const aller = sens < 0 ? opts.current.versGauche : opts.current.versDroite;
        if (aller && !g.reduit && "startViewTransition" in document) {
          arreter();
          poser(0);
          g.base = 0;
          g.suit = true;
          transition(sens, aller, true);
        }
        try {
          zone.setPointerCapture(e.pointerId);
        } catch {
          /* pointeur déjà relâché */
        }
      }
      g.hist.push({ x: e.clientX, t: e.timeStamp });
      if (g.suit) {
        const p = pil.current;
        if (!p) return;
        const brut = g.base + dx;
        p.pos = Math.max(Math.min(0, p.sens * p.largeur), Math.min(Math.max(0, p.sens * p.largeur), brut));
        if (p.pret && p.phase === "menee") p.anims?.forEach((an) => (an.currentTime = (1000 * Math.abs(p.pos)) / p.largeur));
        return;
      }
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
      if (g.suit) {
        const p = pil.current;
        if (p) lacher(p, vitesse);
        return;
      }
      const sens = issueDuGeste(g.base + (e.clientX - g.x0), vitesse, window.innerWidth);
      if (sens === 0) return retour();
      valider(sens, vitesse, g.reduit);
    };

    const cancel = (e: PointerEvent) => {
      if (!geste || e.pointerId !== geste.id) return;
      const g = geste;
      geste = null;
      const p = pil.current;
      if (g.suit && p) lacher(p, 0);
      else retour();
    };

    // move/up/cancel sur `document` (capture) : pendant une View Transition les pointeurs vont à <html>.
    const ecoute = { capture: true, passive: true } as const;
    zone.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerdown", reprise, { capture: true });
    document.addEventListener("pointermove", move, ecoute);
    document.addEventListener("pointerup", up, ecoute);
    document.addEventListener("pointercancel", cancel, ecoute);
    return () => {
      zone.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerdown", reprise, { capture: true });
      document.removeEventListener("pointermove", move, { capture: true });
      document.removeEventListener("pointerup", up, { capture: true });
      document.removeEventListener("pointercancel", cancel, { capture: true });
      zone.style.touchAction = "";
      arreter();
      window.clearTimeout(attente.current);
      entree.current = null;
      // Plus d'écoute (mode louange, deux volets) : une transition en cours n'aurait plus de doigt pour la mener.
      if (pil.current) nettoyer(pil.current, true);
      poser(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les rappels sont lus dans `opts`
  }, [options.actif]);

  // Démontage : la transition en cours est abandonnée, la page nettoyée.
  useEffect(
    () => () => {
      if (pil.current) nettoyer(pil.current, true);
    },
    [],
  );

  return { glisser };
}
