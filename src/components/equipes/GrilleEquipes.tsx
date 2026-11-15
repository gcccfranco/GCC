"use client";

// Équipes en grille (CI-16, B12 de docs/spec-corrections-interface.md ; remplace le bandeau du lot U4 bis, B6).
// Les cartes se rangent dans l'ordre fixe d'EQUIPES, de gauche à droite puis ligne à ligne, à toutes les
// tailles ; la page défile en hauteur, jamais en largeur. Au-dessus, l'index : un Menu « Aller à une équipe »,
// choisir une équipe amène sa carte dans l'écran ; la coche marque la dernière équipe choisie.
// Agencement v18 (B8) : App et Back-Office la posent à la marge de la zone (`--marge-page`), sous l'en-tête commun.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "@/components/ui/menu";

/** Défilement doux, sauf si l'appareil demande moins d'animations. */
const comportement = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

export function GrilleEquipes({ cartes }: { cartes: { id: string; large: boolean; carte: ReactNode }[] }) {
  const { t } = useTranslation();
  const grille = useRef<HTMLDivElement>(null);
  const apresMenu = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(apresMenu.current), []);
  const [choisie, setChoisie] = useState<string | null>(null);

  const amener = (id: string) => {
    setChoisie(id);
    grille.current?.querySelector(`[data-carte-equipe="${id}"]`)?.scrollIntoView({ behavior: comportement(), block: "start" });
  };

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={t("equipes.index")} className="flex items-center gap-2 px-[var(--marge-page)]">
        <Menu
          label={t("equipes.index")}
          texteDeclencheur={t("equipes.allerA")}
          surGris
          value={choisie ?? ""}
          defaultValue=""
          options={cartes.map(({ id }) => ({ valeur: id, libelle: t(`equipes.court.${id}`) }))}
          // Après la fermeture du menu : tant qu'il est ouvert (puis rend le focus), Radix verrouille le défilement de la page.
          onChange={(id) => {
            clearTimeout(apresMenu.current);
            apresMenu.current = window.setTimeout(() => amener(id), 150);
          }}
        />
      </nav>

      {/* Louange et EDD (en dernier) prennent toute la rangée : leurs sous-colonnes ont la place. Jamais `grid-flow-dense` : il changerait l'ordre.
          Les cartes d'une rangée s'étirent à la même hauteur (un seul bord bas par rangée). */}
      <div
        ref={grille}
        role="region"
        aria-label={t("equipes.organigramme.region")}
        data-testid="grille-equipes"
        className="grid gap-4 px-[var(--marge-page)] pb-10 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]"
      >
        {cartes.map(({ id, large, carte }) => (
          <div
            key={id}
            data-carte-equipe={id}
            className={`scroll-mt-[calc(var(--nav-h)+12px)] [&>*]:h-full ${large ? "col-span-full" : ""}`}
          >
            {carte}
          </div>
        ))}
      </div>
    </div>
  );
}
