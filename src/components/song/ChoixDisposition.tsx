"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { DISPOSITIONS_AU_MENU, type Disposition } from "@/lib/dispositionPref";
import { MiniatureDisposition } from "@/components/song/MiniatureDisposition";
import { compter } from "@/lib/usage";

// Choix de la disposition de la partition (docs/spec-mode-louange-forscore-2.md, lot DP) :
// une miniature de la page et le nom dessous, l'entrée choisie marquée (cadre de 2 px
// et nom en gras, dans la couleur d'accent). Deux hôtes :
//  - « menu » : bloc d'un menu déroulant (⋯ du chant, vue partitions) ; Radix donne le
//    rôle menuitemradio et les flèches ; le menu reste ouvert au choix ;
//  - « panneau » : boutons radio dans un panneau (Options d'affichage du mode louange),
//    la couleur d'accent est passée par `couleur` (couleur personnelle des icônes).
// Cinq colonnes égales dans les deux hôtes (jamais une entrée seule sur sa ligne), noms sur deux lignes au plus.
// `langue` : celle du chant affiché, la miniature Classique en prend les couleurs.
type Props = {
  disposition: Disposition;
  changeDisposition: (d: Disposition) => void;
  langue?: "fr" | "zh";
};
// Accent de l'entrée choisie dans les menus du site : le bleu des actions (le primaire du site est noir et blanc).
const ACCENT_SITE = "var(--chord-color)";
const NOM = "block min-h-[2.5em] w-full text-center text-xs leading-tight";

export function ChoixDisposition(props: Props & { variante: "menu" | "panneau"; couleur?: string; labelledBy?: string }) {
  return props.variante === "menu" ? <ChoixMenu {...props} /> : <ChoixPanneau {...props} />;
}

// Les cinq entrées sont en grille : Radix ne connaît que ↑/↓. ← et → déplacent le focus sur la voisine sans changer le choix
// (Entrée ou Espace choisit) ; stopPropagation pour que ← ne referme pas le sous-menu Affichage. Aux bords (← sur la première,
// → sur la dernière) la touche reste à Radix : ← referme alors le sous-menu, comme ailleurs.
function flechesGaucheDroite(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
  const i = items.indexOf(document.activeElement as HTMLElement);
  const voisine = i < 0 ? undefined : items[i + (e.key === "ArrowRight" ? 1 : -1)];
  if (!voisine) return;
  e.preventDefault();
  e.stopPropagation();
  voisine.focus();
}

function ChoixMenu({ disposition, changeDisposition, langue }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("dispositions.titre")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={disposition} onValueChange={(v) => { compter("cmd.chant.disposition"); changeDisposition(v as Disposition); }} className="grid w-[min(25rem,calc(100vw-34px))] grid-cols-5 gap-0.5 px-1" onKeyDown={flechesGaucheDroite}>
        {DISPOSITIONS_AU_MENU.map((d) => (
          <DropdownMenuRadioItem
            key={d}
            value={d}
            onSelect={(e) => e.preventDefault()}
            // Le rond indicateur de shadcn (premier enfant) est masqué : la miniature encadrée en tient lieu. Pas de fond gris de focus :
            // le focus clavier est l'anneau de la miniature.
            className="group min-h-11 min-w-0 flex-col items-center justify-start gap-1 px-0 py-1.5 focus:bg-transparent data-[highlighted]:bg-transparent [&>span:first-child]:hidden"
            style={{ "--accent-choix": ACCENT_SITE } as React.CSSProperties}
          >
            <span className="block max-w-full rounded-md p-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-[color:var(--accent-choix)]">
              <MiniatureDisposition disposition={d} langue={langue} />
            </span>
            <span className={`${NOM} font-medium group-data-[state=checked]:font-bold group-data-[state=checked]:text-[color:var(--accent-choix)]`}>{t(`dispositions.${d}`)}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <p className="px-2 pb-1 pt-0.5 text-xs text-muted-foreground">{t("dispositions.retenue")}</p>
    </>
  );
}

function ChoixPanneau({ disposition, changeDisposition, langue, couleur = ACCENT_SITE, labelledBy }: Props & { couleur?: string; labelledBy?: string }) {
  const { t } = useTranslation();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-5 gap-1"
      onKeyDown={(e) => {
        // Radiogroup standard : ← ↑ et → ↓ passent à l'entrée voisine en la choisissant.
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (d === 0) return;
        e.preventDefault();
        const n = DISPOSITIONS_AU_MENU.length;
        const i = (DISPOSITIONS_AU_MENU.indexOf(disposition) + d + n) % n;
        compter("cmd.chant.disposition");
        changeDisposition(DISPOSITIONS_AU_MENU[i]);
        refs.current[i]?.focus();
      }}
    >
      {DISPOSITIONS_AU_MENU.map((d, i) => {
        const choisie = d === disposition;
        return (
          <button
            key={d}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={choisie}
            tabIndex={choisie ? 0 : -1}
            onClick={() => { if (!choisie) compter("cmd.chant.disposition"); changeDisposition(d); }}
            className="flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-md px-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block max-w-full rounded-md p-0.5" style={{ boxShadow: choisie ? `0 0 0 2px ${couleur}` : "0 0 0 1px transparent" }}>
              <MiniatureDisposition disposition={d} langue={langue} taille="panneau" />
            </span>
            <span className={`${NOM} flex-1 ${choisie ? "font-bold" : "font-medium"}`} style={choisie ? { color: couleur } : undefined}>
              {t(`dispositions.${d}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
