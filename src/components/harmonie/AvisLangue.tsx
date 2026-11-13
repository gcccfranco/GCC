"use client";

// Avis unique des pages Harmonie (docs/spec-corrections-design/harmonie.md, harmonie-5) : en interface
// 中文, le contenu des fiches, du cours et des sons reste en français, et le dit de la même façon partout.
// `relecture` ajoute la ligne « fiches en relecture » dans le même bloc (en français, elle s'affiche seule).

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AvisLangue({ relecture }: { relecture?: boolean }) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  if (!zh && !relecture) return null;
  return (
    <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-sm text-foreground" data-avis-langue={zh ? "" : undefined} data-avis-relecture={relecture ? "" : undefined}>
      {zh && (
        <p className="flex items-center gap-2">
          <Languages className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t("harmonie.avisFrancais")}</span>
        </p>
      )}
      {relecture && <p className={zh ? "mt-1" : undefined}>{t("harmonie.aRelireTout")}</p>}
    </div>
  );
}

/** Un terme d'index ou de données traduit s'il a une entrée dans la table, sinon gardé en français (`lang="fr"`). */
export function useTerme() {
  const { t, i18n } = useTranslation();
  return (cle: string, nom: string) => {
    const traduit = i18n.exists(cle);
    return { texte: t(cle, { defaultValue: nom }), lang: traduit || !i18n.language.startsWith("zh") ? undefined : ("fr" as const) };
  };
}
