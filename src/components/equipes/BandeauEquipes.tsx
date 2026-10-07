"use client";

// Équipes en bandeau (lot U4 bis, B6, docs/spec-pages-en-grand.md, Q12 ; planches `equipes-*`).
// L'écran garde sa hauteur : les équipes se rangent en colonnes (`rangerEnColonnes`, nourrie des
// hauteurs mesurées des cartes) et seul le bandeau défile de gauche à droite. La colonne suivante
// dépasse du bord, sous un fondu ; flèches ‹ › avec un pointeur fin ; accroche aux colonnes sur
// écran tactile. Au-dessus, l'index : une pilule par équipe, toucher une pilule amène sa colonne,
// la pilule de la première colonne visible s'allume.
// Agencement v18 (B8) : le Back-Office le pose aussi, à la marge de la zone (`margePage`,
// `--marge-page`), sous l'en-tête commun.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rangerEnColonnes, type Colonne } from "@/lib/equipes/rangerEnColonnes";

export interface CarteDuBandeau {
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

/** Défilement doux, sauf si l'appareil demande moins d'animations. */
const comportement = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

export function BandeauEquipes({ cartes, margePage = false }: { cartes: CarteDuBandeau[]; margePage?: boolean }) {
  const { t } = useTranslation();
  const bandeau = useRef<HTMLDivElement>(null);
  const rangee = useRef<HTMLDivElement>(null);
  const index = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const observateur = useRef<ResizeObserver | null>(null);
  const [mesures, setMesures] = useState<Mesures | null>(null);
  const [vue, setVue] = useState<Vue>({ premiere: 0, debut: true, bout: false });
  const [choisie, setChoisie] = useState<string | null>(null);

  const ids = cartes.map((c) => c.id);
  const cleIds = ids.join("|");
  const larges = cartes.flatMap((c, i) => (c.large ? [i] : []));

  // Avant la première mesure : une carte par colonne, les larges déjà en dernier.
  const colonnes: Colonne[] = mesures
    ? rangerEnColonnes(mesures.hauteurs, mesures.max, { larges, ecart: ECART })
    : cartes.map((c, i) => ({ cartes: [i], large: c.large }));

  // Lue par l'observateur des tailles : toujours la version du dernier rendu (les équipes affichées).
  const mesurerRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    mesurerRef.current = () => {
      const b = bandeau.current;
      if (!b) return;
      const style = getComputedStyle(b);
      const max = b.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const hauteurs = cleIds.split("|").map((id) => elements.current.get(id)?.offsetHeight ?? 0);
      setMesures((prev) => (prev && prev.max === max && memes(prev.hauteurs, hauteurs) ? prev : { hauteurs, max }));
    };
  }, [cleIds]);

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
  const marge = () => parseFloat(getComputedStyle(rangee.current!).paddingLeft) || 0;

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
    if (col) bandeau.current?.scrollTo({ left: col.offsetLeft - marge(), behavior: comportement() });
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
    const departs = colonnesDOM().map((c) => c.offsetLeft - marge());
    const k = sens > 0 ? departs.findIndex((d) => d > x + 1) : departs.findLastIndex((d) => d < x - 1);
    if (k >= 0) allerA(k);
  };

  const pret = mesures !== null && mesures.hauteurs.every((h) => h > 0);
  // La marge des côtés : celle de la zone au Back-Office, celle de la page de l'App sinon.
  const px = margePage ? "px-[var(--marge-page)]" : "px-4 md:px-6 xl:px-10";
  const scrollMl = margePage ? "scroll-ml-[var(--marge-page)]" : "scroll-ml-4 md:scroll-ml-6 xl:scroll-ml-10";
  const gaucheFleche = margePage ? "left-[var(--marge-page)]" : "left-4";
  const droiteFleche = margePage ? "right-[var(--marge-page)]" : "right-4";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <nav aria-label={t("equipes.index")}>
        <div
          ref={index}
          className={`relative flex gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${px}`}
        >
          {cartes.map(({ id }) => (
            <button
              key={id}
              type="button"
              data-pilule={id}
              aria-current={actif === id ? "true" : undefined}
              onClick={() => amener(id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                actif === id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`equipes.court.${id}`)}
            </button>
          ))}
        </div>
      </nav>

      <div className="relative min-h-0 flex-1">
        <div
          ref={bandeau}
          data-testid="bandeau-equipes"
          data-range={pret ? "1" : "0"}
          className="relative h-full overflow-x-auto overflow-y-hidden pb-3 pt-1 [container-type:inline-size] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [@media(pointer:coarse)]:snap-x [@media(pointer:coarse)]:snap-mandatory"
        >
          <div ref={rangee} className={`flex h-full w-max items-start gap-4 ${px}`}>
            {colonnes.map((col) => (
              <div
                key={ids[col.cartes[0]]}
                data-colonne=""
                data-large={col.large ? "1" : undefined}
                className={`flex max-h-full shrink-0 snap-start flex-col gap-3 ${scrollMl} ${
                  col.large
                    ? "w-[340px] md:w-[560px] lg:w-[calc((100cqw-64px)/2)] xl:w-[calc((100cqw-96px)/2)]"
                    : "w-[300px] lg:w-[290px]"
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
        {!vue.debut && (
          <button
            type="button"
            aria-label={t("equipes.precedentes")}
            onClick={() => fleche(-1)}
            className={`raised absolute ${gaucheFleche} top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-foreground [@media(pointer:fine)]:flex`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {!vue.bout && (
          <button
            type="button"
            aria-label={t("equipes.suivantes")}
            onClick={() => fleche(1)}
            className={`raised absolute ${droiteFleche} top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-foreground [@media(pointer:fine)]:flex`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
