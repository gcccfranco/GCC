"use client";

// Connexion et inscription (lot U4 bis, B5, docs/spec-pages-en-grand.md, Q13 ; planches `connexion-*`,
// `inscription-*`) : écran partagé dès la tablette paysage — la marque à gauche, le formulaire à
// droite — ; ailleurs, la marque en haut. Le panneau de marque dit « Réservé aux membres de
// l'église » ; l'inscription y montre ses trois étapes.

import Image from "next/image";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type Etape = { libelle: string; etat: "fait" | "courant" | "avenir" };

function Etapes({ etapes, onEtape }: { etapes: Etape[]; onEtape?: (i: number) => void }) {
  return (
    // En grand, l'une sous l'autre ; ailleurs, sur une ligne reliée par des traits.
    <ol className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:mt-10 lg:flex-col lg:items-start lg:gap-4">
      {etapes.map((e, i) => {
        const pastille = (
          <>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                e.etat === "fait" ? "bg-foreground text-background" : "border-2 border-foreground text-foreground",
                e.etat === "avenir" && "border-muted-foreground/50 text-muted-foreground",
              )}
            >
              {e.etat === "fait" ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-[15px] font-semibold", e.etat === "avenir" ? "text-muted-foreground" : "text-foreground")}>
              {e.libelle}
            </span>
          </>
        );
        return (
          <li
            key={e.libelle}
            data-testid="etape"
            aria-current={e.etat === "courant" ? "step" : undefined}
            className="flex items-center gap-2"
          >
            {i > 0 && <span aria-hidden className="h-0.5 w-5 bg-foreground/70 sm:w-10 lg:hidden" />}
            {e.etat === "fait" && onEtape ? (
              // On ne revient qu'en arrière : les étapes suivantes restent à valider.
              <button type="button" onClick={() => onEtape(i)} className="flex cursor-pointer items-center gap-2">
                {pastille}
              </button>
            ) : (
              <span className="flex items-center gap-2">{pastille}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function EcranMarque({
  etapes,
  onEtape,
  large,
  children,
}: {
  etapes?: Etape[];
  /** Formulaire large (inscription : la grille des services). */
  large?: boolean;
  onEtape?: (i: number) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [gcc, ...reste] = t("login.title").split(" ");

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div
        data-testid="panneau-marque"
        className="panneau-marque flex flex-col items-center justify-center px-4 py-8 text-center sm:py-12 lg:sticky lg:top-0 lg:h-screen"
      >
        <div className="relative h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36">
          <Image src="/logo.png" alt="" fill sizes="144px" className="object-contain" priority />
        </div>
        <p className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-foreground lg:mt-6 lg:text-[40px]">
          {gcc} <span className="text-brand">{reste.join(" ")}</span>
        </p>
        <p className="mt-1 text-base text-muted-foreground lg:text-lg">{t("login.reserve")}</p>
        {etapes && <Etapes etapes={etapes} onEtape={onEtape} />}
      </div>
      <div className="flex justify-center px-4 py-8 sm:py-10 lg:items-center lg:px-10">
        <div className={cn("w-full", large ? "max-w-[620px]" : "max-w-[380px]")}>{children}</div>
      </div>
    </div>
  );
}
