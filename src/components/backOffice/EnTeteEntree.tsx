"use client";

// En-tête d'une entrée du Back-Office (lot U6, B2) : le titre et les sous-parties en
// contrôle segmenté (« Écrans » de la spec : comme « Les plus joués · Jamais joués · À
// redécouvrir » ; planche bo-reception-ordinateur : « Messages » puis « Réception ·
// Notifier · Questionnaire » sur la même ligne). Une seule sous-partie : pas de contrôle.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

export type SousPartie = {
  href: string;
  label: string;
  /** Courante sur d'autres adresses que la sienne (« Plannings » sur chaque planning). */
  actif?: (chemin: string) => boolean;
};

export function EnTeteEntree({ titre, sousParties = [] }: { titre: string; sousParties?: SousPartie[] }) {
  const { t } = useTranslation();
  const chemin = (usePathname() || "").replace(/\/$/, "");

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
      <h1 className="text-2xl font-bold text-foreground">{titre}</h1>
      {sousParties.length > 1 && (
        <nav aria-label={t("backOffice.sousParties")} className="flex rounded-full bg-secondary p-[3px] max-w-full overflow-x-auto scrollbar-none">
          {sousParties.map(({ href, label, actif }) => {
            const courant = actif ? actif(chemin) : chemin === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={courant ? "page" : undefined}
                className={`flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-[background-color,color] duration-150 ${
                  courant ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
