"use client";

// Confirmer un déplacement (lot U8, C6, docs/spec-calendrier.md § Écrans « Confirmation ») :
// la même pour un dépôt dans la grille et pour « Déplacer… » (qui demande d'abord la date).
// « Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ? », la case « Prévenir
// les inscrits (4) » ou « … les membres de la réunion », les tâches liées qui ne bougent
// pas, pour un créneau les créneaux libres du jour visé ; « Annuler » · « Déplacer ». Un
// refus se dit en une phrase. Rien ne s'écrit sans « Déplacer ».

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DonneesCalendrier, EntreeCalendrier } from "@/lib/calendrier/entrees";
import { planDeplacement, questionDeplacement, type PlanDeplacement } from "@/lib/calendrier/deplacer";
import { titreJour } from "@/lib/calendrier/grille";
import { updateEvenement } from "@/lib/firebase/evenements";
import { updateCreneau } from "@/lib/firebase/programmes";
import { deplacerTache } from "@/lib/firebase/taches";
import { heureLocale, type Place } from "@/lib/scene/saison";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Une demande : l'entrée, et le jour visé (un dépôt) ou `null` (« Déplacer… » : un champ date). */
export type DemandeDeplacement = { entree: EntreeCalendrier; vers: string | null };

const BOUTON =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50";

const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

async function ecrire(plan: PlanDeplacement, choix: { prevenir: boolean; place: Place | null }, uid: string) {
  switch (plan.type) {
    case "tache":
      return deplacerTache(plan.tache.pole, plan.tache.id, plan.vers, plan.fois);
    case "evenement": {
      // Case cochée : `deplacement` pour le rappel du matin (C7) ; sinon vidé, pour
      // qu'un déplacement précédent ne soit pas annoncé à la place de celui-ci.
      const deplacement =
        plan.prevenir && choix.prevenir
          ? { de: plan.evenement.date, vers: plan.champs.date, le: new Date().toISOString(), parUid: uid }
          : null;
      return updateEvenement(plan.evenement.id, { ...plan.champs, deplacement });
    }
    case "creneau":
      if (!choix.place) return;
      return updateCreneau(plan.programmeId, plan.creneau.id, { dimanche: choix.place.jour, debut: choix.place.debut, fin: choix.place.fin });
  }
}

export function DialogueDeplacer({
  demande,
  donnees,
  aujourdhui,
  lang,
  uid,
  onFermer,
  onDeplace,
}: {
  demande: DemandeDeplacement;
  donnees: Pick<DonneesCalendrier, "evenements" | "taches" | "scene">;
  aujourdhui: string;
  lang: NotifLang;
  uid: string;
  onFermer: () => void;
  onDeplace: () => void;
}) {
  const { t } = useTranslation();
  const { entree } = demande;
  const avecChamp = demande.vers === null;
  const [date, setDate] = useState("");
  const vers = demande.vers ?? date;
  const plan = useMemo(
    () => (vers ? planDeplacement(entree, vers, donnees, { today: aujourdhui, maintenant: heureLocale() }) : null),
    [entree, vers, donnees, aujourdhui],
  );
  const [prevenir, setPrevenir] = useState(true);
  // Le créneau choisi : celui de la personne, sinon la même heure si elle est libre.
  const [placeChoisie, setPlace] = useState<Place | null>(null);
  const place = plan?.type === "creneau" ? (placeChoisie && placeChoisie.jour === vers ? placeChoisie : plan.parDefaut) : null;
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  const refus = plan?.type === "refus" ? t(`calendrier.deplacer.refus.${plan.refus}`) : null;
  const question = vers && vers !== entree.date ? questionDeplacement(entree.titre, entree.date, vers, lang) : null;
  const titre = avecChamp ? t("calendrier.deplacer.titre", { titre: entree.titre }) : (refus ?? question ?? "");
  const pret = !!plan && plan.type !== "refus" && (plan.type !== "creneau" || !!place);

  async function confirmer() {
    if (!plan || !pret) return;
    setEnCours(true);
    setErreur(false);
    try {
      await ecrire(plan, { prevenir, place }, uid);
      onDeplace();
    } catch {
      setErreur(true);
      setEnCours(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && !enCours && onFermer()}>
      <AlertDialogContent className="max-w-md gap-5 rounded-3xl max-sm:w-[calc(100%-32px)] max-sm:rounded-3xl">
        <AlertDialogHeader className="text-left sm:text-left">
          <AlertDialogTitle className="text-[17px] leading-snug">{titre}</AlertDialogTitle>
          {/* Le titre porte déjà la phrase ; la description, ce qui l'accompagne. */}
          <AlertDialogDescription asChild className="flex flex-col gap-3 text-[15px] text-foreground">
            <div>
              {avecChamp && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-muted-foreground">{t("calendrier.deplacer.nouvelleDate")}</span>
                  <input
                    type="date"
                    min={aujourdhui}
                    max="9999-12-31"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setErreur(false); }}
                    className="h-11 rounded-xl border border-border bg-background px-3 text-[15px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  />
                </label>
              )}
              {avecChamp && (refus ?? question) && (
                <p role={refus ? "alert" : undefined} className={cn(refus && "font-semibold text-destructive")}>{refus ?? question}</p>
              )}
              {plan?.type === "evenement" && plan.prevenir && (
                <div>
                  <label className="flex items-center gap-2.5 font-semibold">
                    <input
                      type="checkbox"
                      checked={prevenir}
                      onChange={(e) => setPrevenir(e.target.checked)}
                      className="h-[18px] w-[18px] shrink-0 accent-foreground"
                    />
                    {plan.prevenir === "membres"
                      ? t("calendrier.deplacer.prevenirMembres")
                      : t("calendrier.deplacer.prevenirInscrits", { count: plan.prevenir.inscrits })}
                  </label>
                  <p className="ml-[28px] mt-0.5 text-[13px] text-muted-foreground">{t("calendrier.deplacer.rappel")}</p>
                </div>
              )}
              {plan?.type === "evenement" && plan.tachesLiees.length > 0 && (
                <p className="text-[13px] text-muted-foreground">
                  {t("calendrier.deplacer.tachesLiees", { liste: plan.tachesLiees.join(", ") })}
                </p>
              )}
              {plan?.type === "creneau" && (
                <div>
                  <p id="deplacer-places" className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
                    {t("calendrier.deplacer.creneauxLibres", { jour: lang === "fr" ? minuscule(titreJour(vers, lang)) : titreJour(vers, lang) })}
                  </p>
                  <div role="radiogroup" aria-labelledby="deplacer-places" className="flex flex-wrap gap-2">
                    {plan.places.map((p) => {
                      const choisi = !!place && place.debut === p.debut;
                      return (
                        <label
                          key={p.debut}
                          className={cn(
                            "relative inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-sm font-semibold tabular-nums transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground",
                            choisi ? "bg-foreground text-background" : "bg-secondary text-foreground",
                          )}
                        >
                          <input
                            type="radio"
                            name="place"
                            checked={choisi}
                            onChange={() => setPlace(p)}
                            className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
                          />
                          {`${p.debut} – ${p.fin}`}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {erreur && <p role="alert" className="font-semibold text-destructive">{t("calendrier.deplacer.erreur")}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          {refus && !avecChamp ? (
            <button type="button" onClick={onFermer} className={cn(BOUTON, "bg-foreground text-background")}>
              {t("calendrier.deplacer.ok")}
            </button>
          ) : (
            <>
              <button type="button" onClick={onFermer} disabled={enCours} className={cn(BOUTON, "bg-secondary text-foreground")}>
                {t("calendrier.deplacer.annuler")}
              </button>
              {(!avecChamp || (plan && plan.type !== "refus")) && (
                <button
                  type="button"
                  onClick={() => void confirmer()}
                  disabled={!pret || enCours}
                  className={cn(BOUTON, "bg-foreground text-background")}
                >
                  {t("calendrier.deplacer.confirmer")}
                </button>
              )}
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
