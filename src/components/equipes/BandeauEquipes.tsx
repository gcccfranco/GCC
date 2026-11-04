"use client";

// Équipes en bandeau (lot U4 bis, B6, docs/spec-pages-en-grand.md, Q12 ; planches `equipes-*`).
// L'écran garde sa hauteur : les équipes se rangent en colonnes (`rangerEnColonnes`, nourrie des
// hauteurs mesurées des cartes) et seul le bandeau défile de gauche à droite. La colonne suivante
// dépasse du bord, sous un fondu ; flèches ‹ › avec un pointeur fin ; accroche aux colonnes sur
// écran tactile. Au-dessus, l'index : une pilule par équipe, toucher une pilule amène sa colonne,
// la pilule de la première colonne visible s'allume.
// Agencement v18 (B8, tranche Z) : App et Back-Office le posent à la marge de la zone
// (`--marge-page`), sous l'en-tête commun.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rangerEnColonnes, type Colonne } from "@/lib/equipes/rangerEnColonnes";
import { TOUCHER_44 } from "@/lib/toucher44";

interface CarteDuBandeau {
  id: string;
  /** Louange, EDD : une colonne large chacune, en dernier. */
  large: boolean;
  carte: ReactNode;
}

/** Écart vertical entre deux cartes d'une colonne (`gap-3`). */
const ECART = 12;

type Mesures = { hauteurs: number[]; max: number };
type Vue = { premiere: number; debut: boolean; bout: boolean };

const memes = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Sous 640 px : une seule colonne, les cartes pleine largeur l'une sous l'autre ; la page défile, pas le bandeau. */
const TELEPHONE = "(max-width: 639px)";
const surTelephone = () => window.matchMedia(TELEPHONE).matches;

/** Défilement doux, sauf si l'appareil demande moins d'animations. */
const comportement = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Dès 1 024 px : les colonnes larges (Louange, EDD) ont une demi-largeur ; la garde au démarrage ne joue qu'ici. */
const ORDINATEUR = "(min-width: 1024px)";
/** Largeur plancher d'une colonne large rétrécie par la garde au démarrage. */
const LARGE_MIN = 340;

export function BandeauEquipes({ cartes }: { cartes: CarteDuBandeau[] }) {
  const { t } = useTranslation();
  const bandeau = useRef<HTMLDivElement>(null);
  const rangee = useRef<HTMLDivElement>(null);
  const index = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const observateur = useRef<ResizeObserver | null>(null);
  const [mesures, setMesures] = useState<Mesures | null>(null);
  const [vue, setVue] = useState<Vue>({ premiere: 0, debut: true, bout: false });
  const [choisie, setChoisie] = useState<string | null>(null);
  /** Par colonne du DOM : son arrêt est retiré (elle n'accroche plus au défilement tactile). */
  const [retires, setRetires] = useState<boolean[]>([]);

  const ids = cartes.map((c) => c.id);
  const cleIds = ids.join("|");
  const larges = cartes.flatMap((c, i) => (c.large ? [i] : []));

  // Avant la première mesure : une carte par colonne, les larges déjà en dernier.
  const colonnes: Colonne[] = mesures
    ? rangerEnColonnes(mesures.hauteurs, mesures.max, { larges, ecart: ECART })
    : cartes.map((c, i) => ({ cartes: [i], large: c.large }));

  /** Les arrêts du bandeau (back-office-4) : le début de chaque colonne, borné au bout. Un arrêt où une colonne large
   *  serait visible entre sa moitié et sa largeur entière moins la marge droite est retiré (le bout et le départ restent). */
  const arrets = useCallback(() => {
    const b = bandeau.current;
    const r = rangee.current;
    if (!b || !r) return { departs: [] as number[], valables: [] as boolean[], liste: [0] };
    const m = parseFloat(getComputedStyle(r).paddingLeft) || 0;
    const largeur = b.clientWidth;
    const max = Math.max(0, b.scrollWidth - largeur);
    const cols = [...b.querySelectorAll<HTMLElement>("[data-colonne]")];
    const larges = cols.filter((c) => c.dataset.large === "1");
    const departs = cols.map((c) => Math.min(Math.max(0, c.offsetLeft - m), max));
    const valables = departs.map((d, k) =>
      k === 0 || d >= max - 1 || larges.every((c) => {
        const x0 = c.offsetLeft - d;
        const w = c.offsetWidth;
        return x0 + w <= largeur - m + 1 || x0 >= largeur - w / 2 - 1;
      }),
    );
    const liste = [...new Set([...departs.filter((_, k) => valables[k]), max])].sort((a, c) => a - c);
    return { departs, valables, liste };
  }, []);

  /** Garde au démarrage (ordinateur) puis arrêts retirés : une colonne large qui dépasse déjà de plus de la moitié au
   *  départ prend la place restante sans descendre sous 340 px. Idempotent : on repart de la largeur naturelle. */
  const calculer = useCallback(() => {
    const b = bandeau.current;
    const r = rangee.current;
    if (!b || !r) return;
    const cols = [...b.querySelectorAll<HTMLElement>("[data-colonne]")];
    const larges = cols.filter((c) => c.dataset.large === "1");
    for (const c of larges) c.style.width = "";
    if (!surTelephone() && window.matchMedia(ORDINATEUR).matches) {
      const m = parseFloat(getComputedStyle(r).paddingLeft) || 0;
      const largeur = b.clientWidth;
      let decalage = 0;
      for (const c of larges) {
        const x0 = c.offsetLeft - decalage;
        const w = c.offsetWidth;
        if (x0 + w > largeur - m && largeur - x0 > w / 2) {
          const reste = Math.max(LARGE_MIN, Math.floor(largeur - m - x0));
          if (reste < w) {
            c.style.width = `${reste}px`;
            decalage += w - reste;
          }
        }
      }
    }
    const { valables } = arrets();
    const retires = surTelephone() ? [] : valables.map((v) => !v);
    setRetires((prev) => (prev.length === retires.length && prev.every((x, i) => x === retires[i]) ? prev : retires));
  }, [arrets]);

  // Lue par l'observateur des tailles : toujours la version du dernier rendu (les équipes affichées).
  const mesurerRef = useRef<() => void>(() => {});
  const image = useRef(0);
  useLayoutEffect(() => {
    mesurerRef.current = () => {
      const b = bandeau.current;
      if (!b) return;
      const style = getComputedStyle(b);
      const max = surTelephone() ? Infinity : b.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const hauteurs = cleIds.split("|").map((id) => elements.current.get(id)?.offsetHeight ?? 0);
      setMesures((prev) => (prev && prev.max === max && memes(prev.hauteurs, hauteurs) ? prev : { hauteurs, max }));
      // Hors de la notification en cours : changer la largeur d'une colonne en pleine notification en relancerait une.
      cancelAnimationFrame(image.current);
      image.current = requestAnimationFrame(calculer);
    };
  }, [cleIds, calculer]);

  // Après chaque rangement des colonnes : largeurs de départ et arrêts.
  useLayoutEffect(() => {
    calculer();
  }, [calculer, mesures, cleIds]);

  const obs = () => {
    if (!observateur.current && typeof ResizeObserver !== "undefined") {
      observateur.current = new ResizeObserver(() => mesurerRef.current());
    }
    return observateur.current;
  };

  useEffect(() => {
    const b = bandeau.current;
    if (b) obs()?.observe(b);
    return () => {
      cancelAnimationFrame(image.current);
      observateur.current?.disconnect();
      observateur.current = null;
    };
  }, []);

  /** La carte rangée : mesurée tant qu'elle est montée (React 19 : la ref rend son nettoyage). */
  const refCarte = (id: string) => (el: HTMLElement | null) => {
    if (!el) return;
    elements.current.set(id, el);
    obs()?.observe(el);
    return () => {
      observateur.current?.unobserve(el);
      if (elements.current.get(id) === el) elements.current.delete(id);
    };
  };

  const colonnesDOM = () => [...(bandeau.current?.querySelectorAll<HTMLElement>("[data-colonne]") ?? [])];

  const lireVue = useCallback(() => {
    const b = bandeau.current;
    if (!b) return;
    const x = b.scrollLeft;
    const cols = [...b.querySelectorAll<HTMLElement>("[data-colonne]")];
    // Première colonne visible : la première dont le milieu n'est pas encore passé à gauche.
    const premiere = Math.max(0, cols.findIndex((c) => c.offsetLeft + c.offsetWidth / 2 > x));
    const vue = { premiere, debut: x <= 1, bout: x >= b.scrollWidth - b.clientWidth - 1 };
    setVue((prev) => (prev.premiere === vue.premiere && prev.debut === vue.debut && prev.bout === vue.bout ? prev : vue));
  }, []);

  useEffect(() => {
    const b = bandeau.current;
    if (!b) return;
    lireVue();
    b.addEventListener("scroll", lireVue, { passive: true });
    return () => b.removeEventListener("scroll", lireVue);
  }, [lireVue, mesures]);

  const colonneDe = (id: string) => colonnes.findIndex((c) => c.cartes.some((i) => ids[i] === id));
  const premiere = colonnes[Math.min(vue.premiere, colonnes.length - 1)];
  // La pilule touchée reste allumée tant que sa colonne est la première visible, ou au bout du
  // bandeau (Louange sur téléphone : EDD la suit, le bandeau ne peut pas aller plus loin).
  const kChoisie = choisie ? colonneDe(choisie) : -1;
  const actif = choisie && (kChoisie === vue.premiere || (vue.bout && kChoisie >= vue.premiere))
    ? choisie
    : ids[premiere?.cartes[0] ?? 0];

  // La pilule allumée reste dans la rangée de l'index.
  useEffect(() => {
    const rang = index.current;
    const pilule = rang?.querySelector<HTMLElement>(`[data-pilule="${actif}"]`);
    if (!rang || !pilule) return;
    if (pilule.offsetLeft < rang.scrollLeft || pilule.offsetLeft + pilule.offsetWidth > rang.scrollLeft + rang.clientWidth) {
      rang.scrollTo({ left: Math.max(0, pilule.offsetLeft - 16), behavior: comportement() });
    }
  }, [actif]);

  const allerA = (k: number) => {
    const col = colonnesDOM()[k];
    if (col && surTelephone()) col.scrollIntoView({ behavior: comportement(), block: "start" });
    else if (col) {
      // Une colonne dont le début est retiré : l'arrêt précédent, où elle est entière.
      const { departs, valables, liste } = arrets();
      const d = valables[k] ? departs[k] : (liste.findLast((x) => x < departs[k]) ?? 0);
      bandeau.current?.scrollTo({ left: d, behavior: comportement() });
    }
  };

  const amener = (id: string) => {
    setChoisie(id);
    allerA(colonneDe(id));
  };

  const fleche = (sens: 1 | -1) => {
    const b = bandeau.current;
    if (!b) return;
    setChoisie(null);
    const x = b.scrollLeft;
    const { liste } = arrets();
    const d = sens > 0 ? liste.find((a) => a > x + 1) : liste.findLast((a) => a < x - 1);
    if (d !== undefined) b.scrollTo({ left: d, behavior: comportement() });
  };

  const pret = mesures !== null && mesures.hauteurs.every((h) => h > 0);
  // La marge des côtés : celle de la zone au Back-Office, celle de la page de l'App sinon.
  const px = "px-[var(--marge-page)]";
  const scrollMl = "scroll-ml-[var(--marge-page)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* BO-G, 6 : dès 640 px l'index passe à la ligne (aucune pilule au-delà de la marge) et les flèches ‹ › vivent
          au bout de sa rangée, plus flottantes sur les colonnes ; sur téléphone il défile, comme avant. */}
      <nav aria-label={t("equipes.index")} className="flex items-end gap-2 sm:px-[var(--marge-page)]">
        <div
          ref={index}
          className="relative flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-[var(--marge-page)] py-1 [scrollbar-width:none] sm:flex-wrap sm:gap-y-3.5 sm:overflow-x-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {cartes.map(({ id }) => (
            <button
              key={id}
              type="button"
              data-pilule={id}
              aria-current={actif === id ? "true" : undefined}
              onClick={() => amener(id)}
              className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-[''] transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                actif === id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`equipes.court.${id}`)}
            </button>
          ))}
        </div>
        {/* back-office-5 : flèches de 36 px habillées comme les pilules, calées sur le bas de la dernière rangée (pb-1 = py-1
            de l'index). Elles n'existent qu'au pointeur fin ; TOUCHER_44 ne joue que sur
            un écran tactile qui annonce aussi un pointeur fin (portable tactile). */}
        <div className="hidden shrink-0 gap-2 pb-1 [@media(pointer:fine)]:flex">
          {!vue.debut && (
            <button
              type="button"
              aria-label={t("equipes.precedentes")}
              onClick={() => fleche(-1)}
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground ${TOUCHER_44}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {!vue.bout && (
            <button
              type="button"
              aria-label={t("equipes.suivantes")}
              onClick={() => fleche(1)}
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground ${TOUCHER_44}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </nav>

      <div className="relative min-h-0 flex-1">
        <div
          ref={bandeau}
          role="region"
          tabIndex={0}
          aria-label={t("equipes.organigramme.region")}
          data-testid="bandeau-equipes"
          data-range={pret ? "1" : "0"}
          className="relative h-full overflow-x-auto overflow-y-hidden pb-3 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-auto max-sm:overflow-visible [container-type:inline-size] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [@media(pointer:coarse)]:snap-x [@media(pointer:coarse)]:snap-mandatory"
        >
          <div ref={rangee} className={`flex h-full w-max items-start gap-4 max-sm:h-auto max-sm:w-full max-sm:flex-col ${px}`}>
            {colonnes.map((col, k) => (
              <div
                key={ids[col.cartes[0]]}
                data-colonne=""
                data-large={col.large ? "1" : undefined}
                className={`flex max-h-full shrink-0 ${retires[k] ? "snap-align-none" : "snap-start"} flex-col gap-3 max-sm:w-full max-sm:scroll-mt-[calc(var(--nav-h)+12px)] ${scrollMl} ${
                  // BO-G, 6 : tablette debout (768 à 1 023 px), deux colonnes entières dans la largeur : la suivante
                  // commence hors champ au lieu de dépasser à moitié (plus de « TEAM DÉCORATIO » coupé au bord).
                  col.large
                    ? "w-[340px] max-sm:w-full md:w-[calc(100cqw_-_2*var(--marge-page))] lg:w-[calc((100cqw_-_2*var(--marge-page)_-_16px)/2)]"
                    : "w-[300px] max-sm:w-full md:w-[calc((100cqw_-_2*var(--marge-page)_-_16px)/2)] lg:w-[290px]"
                } ${
                  // Une carte plus haute que le bandeau défile dans sa colonne : jamais plus haut que l'écran.
                  // Seulement alors : le défilement couperait l'ombre des cartes.
                  mesures && col.cartes.some((i) => mesures.hauteurs[i] > mesures.max) ? "overflow-y-auto" : ""
                }`}
              >
                {col.cartes.map((i) => (
                  <div key={ids[i]} ref={refCarte(ids[i])}>
                    {cartes[i].carte}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* La suite dépasse du bord, sous un fondu ; rien au bout. */}
        {!vue.bout && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background to-transparent md:w-16"
          />
        )}
      </div>
    </div>
  );
}
