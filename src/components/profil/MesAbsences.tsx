"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { useProfile, listProfiles } from "@/lib/firebase/users";
import { ajouterAbsence, listerAbsences, supprimerAbsence } from "@/lib/firebase/absences";
import { canSaisirAbsence, canVoirMotifAbsence, faitDesPlannings } from "@/lib/access";
import { dateAbsence } from "@/lib/planning/choisir";
import type { Absence } from "@/types/absence";
import type { UserProfile } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// « Mes absences » (SC3.2, docs/spec-createur-corbeille-absences.md) : congés, vacances ou absence d'un
// jour, vus par ceux qui font les plannings. En ligne (pas derrière BACK_OFFICE, Q11). Qui fait les
// plannings saisit aussi pour quelqu'un d'autre (Q8) : un sélecteur « Pour qui ? » apparaît alors.

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const nomAffiche = (p: UserProfile) => p.planningName || `${p.firstName} ${p.lastName}`.trim();

export function MesAbsences() {
  const { t, i18n } = useTranslation();
  const langue = i18n.language === "zh-CN" ? "zh" : "fr";
  const { user, profile } = useProfile();
  const responsable = faitDesPlannings(user, profile);

  const [cible, setCible] = useState("");
  const [comptes, setComptes] = useState<UserProfile[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const uidCible = cible || user?.uid || "";

  useEffect(() => {
    if (!responsable) return;
    let vivant = true;
    listProfiles()
      .then((ps) => { if (vivant) setComptes(ps); })
      .catch(() => { /* sans les comptes, seul « Moi » reste proposé */ });
    return () => { vivant = false; };
  }, [responsable]);

  const recharger = useCallback(async (uid: string) => {
    try {
      setAbsences(await listerAbsences(uid));
    } catch {
      setAbsences([]);
    }
  }, []);

  useEffect(() => {
    if (!uidCible) return;
    let vivant = true;
    listerAbsences(uidCible)
      .then((l) => { if (vivant) setAbsences(l); })
      .catch(() => { if (vivant) setAbsences([]); });
    return () => { vivant = false; };
  }, [uidCible]);

  const autres = useMemo(
    () => comptes.filter((p) => p.uid !== user?.uid).sort((a, b) => nomAffiche(a).localeCompare(nomAffiche(b), "fr")),
    [comptes, user?.uid],
  );

  if (!user) return null;

  const voirMotif = canVoirMotifAbsence(user, uidCible, profile);
  const peutSaisir = canSaisirAbsence(user, profile, uidCible);
  const aVenir = absences.filter((a) => a.au >= aujourdhui()).sort((a, b) => a.du.localeCompare(b.du));
  const periode = (a: Absence) => a.du === a.au
    ? t("absences.jour", { date: dateAbsence(a.du, langue) })
    : t("absences.periode", { du: dateAbsence(a.du, langue), au: dateAbsence(a.au, langue, langue === "zh") });

  function ouvrirFormulaire() {
    setDu("");
    setAu("");
    setMotif("");
    setErreur("");
    setOuvert(true);
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur("");
    try {
      await ajouterAbsence(uidCible, { du, au, motif: voirMotif ? motif : undefined });
      await recharger(uidCible);
      setOuvert(false);
    } catch {
      setErreur(t("absences.erreur"));
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(a: Absence) {
    setErreur("");
    try {
      await supprimerAbsence(uidCible, a.id);
      await recharger(uidCible);
    } catch {
      setErreur(t("absences.erreur"));
    }
  }

  return (
    <section aria-label={t("absences.titre")} className="raised rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground">{t("absences.titre")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("absences.aide")}</p>
      </div>

      {responsable && (
        <div className="space-y-1.5">
          <Label htmlFor="absences-pour-qui">{t("absences.pourQui")}</Label>
          <select
            id="absences-pour-qui"
            value={uidCible}
            onChange={(e) => { setCible(e.target.value === user.uid ? "" : e.target.value); setOuvert(false); }}
            className="h-10 w-full rounded-lg border border-transparent bg-secondary px-3 text-base md:text-sm"
          >
            <option value={user.uid}>{t("absences.moi")}</option>
            {autres.map((p) => <option key={p.uid} value={p.uid}>{nomAffiche(p)}</option>)}
          </select>
        </div>
      )}

      {aVenir.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("absences.aucune")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {aVenir.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{periode(a)}</p>
                {voirMotif && a.motif && <p className="truncate text-xs text-muted-foreground">{a.motif}</p>}
              </div>
              {peutSaisir && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t("absences.supprimer", { periode: periode(a) })}
                  onClick={() => void supprimer(a)}
                  className="shrink-0 text-muted-foreground"
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {ouvert ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="absence-du">{t("absences.du")}</Label>
              <Input
                id="absence-du"
                type="date"
                value={du}
                onChange={(e) => { setDu(e.target.value); if (!au || au < e.target.value) setAu(e.target.value); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="absence-au">{t("absences.au")}</Label>
              <Input id="absence-au" type="date" value={au} min={du || undefined} onChange={(e) => setAu(e.target.value)} />
            </div>
          </div>
          {voirMotif && (
            <div className="space-y-1.5">
              <Label htmlFor="absence-motif">{t("absences.motif")}</Label>
              <Input id="absence-motif" type="text" maxLength={200} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </div>
          )}
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          <div className="flex gap-2">
            <Button type="button" disabled={!du || !au || au < du || envoi} onClick={() => void enregistrer()} className="h-10">
              {t("common.buttons.save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOuvert(false)} className="h-10">
              {t("common.buttons.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          <Button type="button" variant="secondary" onClick={ouvrirFormulaire} className="h-10 gap-2">
            <Plus aria-hidden />
            {t("absences.ajouter")}
          </Button>
        </>
      )}
    </section>
  );
}
