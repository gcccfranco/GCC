"use client";

// « Nouveau rôle » / « Modifier le rôle » (lot 2, OG10 à OG13 ; planches v19-org-role-ordinateur et
// v19-org-role-nouveau-telephone) : noms, places, au comité, colonne reliée, droits.

import { useState } from "react";
import { Link2, Lock, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { colonnesProposees } from "@/lib/groupes/organigramme";
import { nouvelIdRole } from "@/lib/groupes/edition";
import { groupeDef } from "@/lib/groupes/table";
import type { DroitsRole, OrganigrammeGroupe, RoleGroupe } from "@/types/groupe";

const SANS_DROIT: DroitsRole = { remplir: false, publier: false, notifier: false, saisirFetes: false };

export function FormulaireRole({
  groupe, role, enCours, erreur, onRecharger, onAnnuler, onEnregistrer,
}: {
  groupe: OrganigrammeGroupe;
  /** `null` : un nouveau rôle. */
  role: RoleGroupe | null;
  enCours: boolean;
  erreur: string;
  /** Relit le document après « Modifié par … entre-temps » ; le brouillon reste. */
  onRecharger: () => void;
  onAnnuler: () => void;
  onEnregistrer: (role: RoleGroupe) => void;
}) {
  const { t } = useTranslation();
  const def = groupeDef(groupe.id);
  const avecPlanning = !!def?.planning;
  const nomGroupe = t(`categories.${def?.categorie ?? ""}`);
  const [b, setB] = useState<RoleGroupe>(
    role ?? { id: nouvelIdRole(), nom: "", nomZh: "", places: null, comite: false, colonne: null, droits: SANS_DROIT, titulaires: [] },
  );
  const n = b.titulaires.length;
  // Le nombre tapé reste tel quel ; il se borne (au moins les titulaires, au moins 1) en quittant le champ.
  const [placesTexte, setPlacesTexte] = useState<string | null>(null);
  const colonnes = colonnesProposees(groupe, role?.id ?? null);
  const change = (c: Partial<RoleGroupe>) => setB((x) => ({ ...x, ...c }));
  const droit = (cle: keyof DroitsRole, v: boolean) =>
    setB((x) => ({ ...x, droits: { ...x.droits, [cle]: v, ...(cle === "publier" && v ? { remplir: true } : {}) } }));

  const caseDroit = (cle: keyof DroitsRole, libelle: string, aide: string, grise = false) => (
    <label className="flex items-start gap-3 border-t border-border py-2.5">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={b.droits[cle]}
        disabled={grise}
        onChange={(e) => droit(cle, e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">{libelle}</span>
        <span className="block text-xs text-muted-foreground">{aide}</span>
      </span>
    </label>
  );

  return (
    <form
      aria-label={role ? t("groupes.role.modifier") : t("groupes.role.nouveau")}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const places = placesTexte === null ? b.places : placesTexte === "" ? null : Math.max(Number(placesTexte), n, 1);
        if (b.nom.trim()) onEnregistrer({ ...b, places });
      }}
    >
      <p className="text-xs text-muted-foreground">{t("groupes.form.sousTitre", { groupe: nomGroupe })}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-semibold text-foreground">{t("groupes.form.nom")}</span>
          <Input value={b.nom} maxLength={80} onChange={(e) => change({ nom: e.target.value })} className="h-10" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-foreground">
            {t("groupes.form.nomZh")} <span className="font-normal text-muted-foreground">· {t("groupes.form.facultatif")}</span>
          </span>
          <Input value={b.nomZh} onChange={(e) => change({ nomZh: e.target.value })} className="h-10" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span id="places" className="text-sm font-semibold text-foreground">
            {t("groupes.form.places")} <span className="font-normal text-muted-foreground">· {t("groupes.form.videSansLimite")}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("groupes.form.moins")}
              disabled={b.places === null || b.places <= Math.max(1, n)}
              onClick={() => change({ places: (b.places ?? 1) - 1 })}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <Input
              aria-labelledby="places"
              inputMode="numeric"
              value={placesTexte ?? (b.places === null ? "" : String(b.places))}
              placeholder={t("groupes.form.sansLimite")}
              onChange={(e) => setPlacesTexte(e.target.value.replace(/\D/g, ""))}
              onBlur={() => {
                if (placesTexte !== null) change({ places: placesTexte === "" ? null : Math.max(Number(placesTexte), n, 1) });
                setPlacesTexte(null);
              }}
              className="h-10 w-28 text-center"
            />
            <button
              type="button"
              aria-label={t("groupes.form.plus")}
              onClick={() => change({ places: b.places === null ? Math.max(1, n) : b.places + 1 })}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
            <span className="text-xs text-muted-foreground">{t("groupes.form.titulaires", { count: n })}</span>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-secondary/60 p-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={b.comite} onChange={(e) => change({ comite: e.target.checked })} />
          <span>
            <span className="block text-sm font-semibold text-foreground">{t("groupes.form.auComite")}</span>
            <span className="block text-xs text-muted-foreground">{t("groupes.form.auComiteAide")}</span>
          </span>
        </label>
      </div>

      {avecPlanning ? (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">
            {t("groupes.form.colonne")} <span className="font-normal text-muted-foreground">· {t("groupes.form.colonneAide")}</span>
          </p>
          <div role="group" aria-label={t("groupes.form.colonne")} className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={b.colonne === null}
              onClick={() => change({ colonne: null })}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${b.colonne === null ? "bg-foreground text-background" : "bg-secondary text-foreground/80"}`}
            >
              {t("groupes.form.aucune")}
            </button>
            {colonnes.map((c) => {
              const prise = c.prisePar !== null;
              const active = b.colonne === c.cle;
              return (
                <button
                  key={c.cle}
                  type="button"
                  aria-pressed={active}
                  disabled={prise}
                  onClick={() => change({ colonne: c.cle })}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50 ${active ? "bg-foreground text-background" : "bg-secondary text-foreground/80"}`}
                >
                  {prise ? <Lock className="h-3 w-3" aria-label={t("groupes.form.colonnePrise")} /> : active && <Link2 className="h-3 w-3" aria-hidden />}
                  {t(c.i18n)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{t("groupes.form.cadenas")}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("groupes.form.sansPlanning", { groupe: nomGroupe })}</p>
      )}

      <div>
        <p className="pb-1 text-sm font-semibold text-foreground">{t("groupes.form.droits")}</p>
        {/* Lot RS, RS-D : Remplit · Publie · Notifie ne se cochent plus ici, la liste Responsabilités les remplace. */}
        {caseDroit("saisirFetes", t("groupes.droit.saisirFetes"), t("groupes.droit.saisirFetesAide"))}
      </div>

      {erreur && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <span role="alert">{erreur}</span>
          <button type="button" onClick={onRecharger} className="font-semibold underline">{t("groupes.recharger")}</button>
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={onAnnuler} className="h-10">{t("equipes.annuler")}</Button>
        <Button type="submit" disabled={!b.nom.trim() || enCours} className="h-10">
          {role ? t("equipes.enregistrer") : t("groupes.role.creer")}
        </Button>
      </div>
    </form>
  );
}
