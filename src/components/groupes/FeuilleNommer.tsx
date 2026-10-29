"use client";

// « Nommer » (admins, OG6 à OG8, décision 36) : la présidence (une place) et les vice-présidents, autant
// de places que le plafond, réglable de 1 à 9 par « − » et « + » ; chaque place ouvre la recherche
// d'OG14. Les choix se font sur un brouillon, écrit en une fois par « Enregistrer ».

import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { changerPlafondVp, placesVp } from "@/lib/groupes/organigramme";
import { MAX_VP_BORNE } from "@/lib/groupes/table";
import type { OrganigrammeGroupe, Titulaire } from "@/types/groupe";
import { Initiales } from "./Initiales";
import { Panneau } from "./Panneau";

export type PlaceNommer = { poste: "president" } | { poste: "vp"; index: number };

export function FeuilleNommer({
  ouvert, enCours, erreur, onRecharger, onFermer, onChercher, onEnregistrer, brouillon, setBrouillon,
}: {
  ouvert: boolean;
  enCours: boolean;
  erreur: string;
  onRecharger: () => void;
  onFermer: () => void;
  /** Ouvre la recherche pour une place ; le choix revient dans `brouillon` par la page. */
  onChercher: (place: PlaceNommer, ancre: DOMRect) => void;
  onEnregistrer: () => void;
  brouillon: Pick<OrganigrammeGroupe, "president" | "vp" | "maxVp">;
  setBrouillon: (b: Pick<OrganigrammeGroupe, "president" | "vp" | "maxVp">) => void;
}) {
  const { t } = useTranslation();
  const plafond = placesVp(brouillon);

  const place = (titulaire: Titulaire | null, p: PlaceNommer, retirer: () => void) => (
    <li key={p.poste === "vp" ? `vp-${p.index}` : "president"} className="flex items-center gap-2 border-t border-border py-2">
      {titulaire ? (
        <>
          <Initiales nom={titulaire.nom} pointille={!titulaire.uid} />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{titulaire.nom}</span>
          <Button variant="outline" className="h-8" onClick={retirer}>
            {t("groupes.retirer")}
          </Button>
        </>
      ) : (
        <button
          type="button"
          onClick={(e) => onChercher(p, e.currentTarget.getBoundingClientRect())}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/50"><Plus className="h-4 w-4" /></span>
          {t("groupes.enTete.aNommer")}
        </button>
      )}
    </li>
  );

  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre={t("groupes.enTete.titre")} sousTitre={t("groupes.enTete.nommesParAdmin")}>
      <div className="space-y-5">
        <section aria-label={t("groupes.enTete.president")}>
          <h3 className="text-sm font-bold text-foreground">{t("groupes.enTete.president")}</h3>
          <ul>{place(brouillon.president, { poste: "president" }, () => setBrouillon({ ...brouillon, president: null }))}</ul>
        </section>
        <section aria-label={t("groupes.enTete.vicePresidents")}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">{t("groupes.enTete.auPlus", { n: plafond })}</h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t("groupes.enTete.moinsVp")}
                disabled={plafond <= Math.max(1, brouillon.vp.length)}
                onClick={() => setBrouillon({ ...brouillon, maxVp: changerPlafondVp(brouillon, -1) })}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border disabled:opacity-40"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("groupes.enTete.plusVp")}
                disabled={plafond >= MAX_VP_BORNE}
                onClick={() => setBrouillon({ ...brouillon, maxVp: changerPlafondVp(brouillon, 1) })}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border disabled:opacity-40"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <ul>
            {Array.from({ length: plafond }, (_, i) =>
              place(brouillon.vp[i] ?? null, { poste: "vp", index: i }, () => setBrouillon({ ...brouillon, vp: brouillon.vp.filter((_, j) => j !== i) })))}
          </ul>
        </section>
        {erreur && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <span role="alert">{erreur}</span>
            <button type="button" onClick={onRecharger} className="font-semibold underline">{t("groupes.recharger")}</button>
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={onFermer} className="h-10">{t("equipes.annuler")}</Button>
          <Button onClick={onEnregistrer} disabled={enCours} className="h-10">{t("equipes.enregistrer")}</Button>
        </div>
      </div>
    </Panneau>
  );
}
