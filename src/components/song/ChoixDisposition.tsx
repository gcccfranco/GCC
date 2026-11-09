"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { DISPOSITIONS_AU_MENU, type Disposition } from "@/lib/dispositionPref";
import { MiniatureDisposition } from "@/components/song/MiniatureDisposition";

// Choix de la disposition de la partition (docs/spec-mode-louange-forscore-2.md, lot DP) :
// une miniature de la page et le nom dessous, l'entrée choisie marquée (cadre de 2 px
// et nom en gras, dans la couleur d'accent). Deux hôtes :
//  - « menu » : bloc d'un menu déroulant (⋯ du chant, vue partitions) ; Radix donne le
//    rôle menuitemradio et les flèches ; le menu reste ouvert au choix ;
//  - « panneau » : boutons radio dans un panneau (Options d'affichage du mode louange),
//    la couleur d'accent est passée par `couleur` (couleur personnelle des icônes).
type Props = {
  disposition: Disposition;
  changeDisposition: (d: Disposition) => void;
};

export function ChoixDisposition(props: Props & { variante: "menu" | "panneau"; couleur?: string; labelledBy?: string }) {
  return props.variante === "menu" ? <ChoixMenu {...props} /> : <ChoixPanneau {...props} />;
}

function ChoixMenu({ disposition, changeDisposition }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("dispositions.titre")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={disposition} onValueChange={(v) => changeDisposition(v as Disposition)} className="flex flex-wrap gap-1 px-1">
        {DISPOSITIONS_AU_MENU.map((d) => (
          <DropdownMenuRadioItem
            key={d}
            value={d}
            onSelect={(e) => e.preventDefault()}
            // Le rond indicateur de shadcn (premier enfant) est masqué : la miniature encadrée en tient lieu.
            className="group min-h-11 flex-col items-center gap-1 px-1.5 py-1.5 text-center text-xs [&>span:first-child]:hidden"
          >
            <span className="rounded-md p-0.5 ring-1 ring-transparent group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-primary">
              <MiniatureDisposition disposition={d} />
            </span>
            <span className="font-normal group-data-[state=checked]:font-bold group-data-[state=checked]:text-primary">{t(`dispositions.${d}`)}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <p className="px-2 pb-1 pt-0.5 text-[11px] text-muted-foreground">{t("dispositions.retenue")}</p>
    </>
  );
}

function ChoixPanneau({ disposition, changeDisposition, couleur = "hsl(var(--primary))", labelledBy }: Props & { couleur?: string; labelledBy?: string }) {
  const { t } = useTranslation();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
      onKeyDown={(e) => {
        // Radiogroup standard : ← ↑ et → ↓ passent à l'entrée voisine en la choisissant.
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (d === 0) return;
        e.preventDefault();
        const n = DISPOSITIONS_AU_MENU.length;
        const i = (DISPOSITIONS_AU_MENU.indexOf(disposition) + d + n) % n;
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
            onClick={() => changeDisposition(d)}
            className="flex min-h-11 min-w-11 flex-col items-center gap-1 rounded-md p-1 text-xs"
          >
            <span className="rounded-md p-0.5" style={{ boxShadow: choisie ? `0 0 0 2px ${couleur}` : "0 0 0 1px transparent" }}>
              <MiniatureDisposition disposition={d} />
            </span>
            <span className={choisie ? "font-bold" : "font-normal text-muted-foreground"} style={choisie ? { color: couleur } : undefined}>
              {t(`dispositions.${d}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
