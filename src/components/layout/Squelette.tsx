"use client";

// Squelette de page (lot CH, docs/spec-chargement.md, C3) : à la place du mot « Chargement… » quand une page
// entière attend la connexion, le profil ou ses premières données. Des blocs gris discrets (même gris que les
// aperçus, `bg-secondary`, clair et sombre), une pulsation douce coupée sous `prefers-reduced-motion`
// (`motion-safe:`). Les lecteurs d'écran lisent `common.loading` (texte caché aux yeux), la zone est `aria-busy`.
//
//   <Squelette />                       titre, sous-titre et trois cartes
//   <Squelette enTete={false} />        sous un EnTetePage déjà dessiné : les cartes seules
//   <Squelette cartes={5} className="…" />

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BLOC = "rounded-lg bg-secondary motion-safe:animate-pulse";

export function Squelette({
  enTete = true,
  cartes = 3,
  className,
}: {
  /** Une barre de titre et de sous-titre, à la place de l'en-tête de la page. */
  enTete?: boolean;
  cartes?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" data-testid="squelette" className={cn("px-[var(--marge-page)] py-5", className)}>
      <span role="status" className="sr-only">{t("common.loading")}</span>
      <div aria-hidden>
        {enTete && (
          <div className="mb-5">
            <div className={cn(BLOC, "h-7 w-48 max-w-full")} />
            <div className={cn(BLOC, "mt-2.5 h-4 w-72 max-w-full")} />
          </div>
        )}
        <div className="flex flex-col gap-3">
          {Array.from({ length: cartes }, (_, i) => (
            <div key={i} className={cn(BLOC, "h-20 w-full")} />
          ))}
        </div>
      </div>
    </div>
  );
}
