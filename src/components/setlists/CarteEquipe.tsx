"use client";

// « L'équipe de ce service », d'après le planning (lot U4 bis) : dans l'aperçu d'une setlist (B2,
// Q4) et sur la page d'un service de Mes services (B4, Q7). Chaque rôle, ses noms ; la personne
// connectée en pastille d'encre, comme l'accueil.

import { Fragment, useId } from "react";
import { useTranslation } from "react-i18next";
import { porteLeNom } from "@/lib/planning/accueil";
import type { RoleEquipe } from "@/lib/setlist/equipeDuService";

/** Les noms d'une case, la personne connectée en évidence. */
function Noms({ valeur, monNom }: { valeur: string; monNom: string }) {
  return (
    <>
      {valeur.split(/\s*,\s*/).map((n, i) => (
        <Fragment key={i}>
          {i > 0 && ", "}
          {porteLeNom(n, monNom)
            ? <b data-testid="moi" className="rounded-md bg-foreground px-1.5 py-px font-semibold text-background">{n}</b>
            : n}
        </Fragment>
      ))}
    </>
  );
}

export function CarteEquipe({ equipe, monNom, niveau = 3 }: { equipe: RoleEquipe[]; monNom: string; niveau?: 2 | 3 }) {
  const { t } = useTranslation();
  const id = useId();
  const Titre = niveau === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className="raised rounded-2xl px-5 pb-3 pt-4">
      <Titre id={id} className="text-base font-bold">{t("setlists.apercu.equipe")}</Titre>
      <p className="text-xs text-muted-foreground">{t("setlists.apercu.dapres")}</p>
      <dl className="mt-2">
        {equipe.map(([cle, noms]) => (
          <div key={cle} className="flex min-w-0 gap-3 border-t border-border/70 py-1.5 text-sm">
            <dt className="w-24 shrink-0 text-muted-foreground">{t(cle)}</dt>
            <dd className="min-w-0"><Noms valeur={noms} monNom={monNom} /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
