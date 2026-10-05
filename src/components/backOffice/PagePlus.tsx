"use client";

// Page « Plus » du Back-Office (lot U6, B6 ; planche bo-telephone-plus) : une carte par
// entrée hors de la barre du bas (icône, nom, contenu selon les droits, pastille Q15),
// « Personnaliser la barre » (question 9) et « Revenir à l'app ». Sur téléphone et tablette
// en portrait ; sur grand écran, la barre latérale montre déjà toutes les entrées.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ChevronRight, SlidersHorizontal } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { useDernierePage } from "@/components/layout/SelecteurEspace";
import { FeuilleBarreDuBas } from "@/components/backOffice/FeuilleBarreDuBas";
import { useProfile } from "@/lib/firebase/users";
import { entreesBackOffice, isAdminUser, isCoordination, polesDe } from "@/lib/access";
import { entreeBackOffice } from "@/lib/navigation";
import { barreAffichee } from "@/lib/tableauDeBord/barre";
import { enregistrerBarreDuBas, useBarreDuBas } from "@/lib/tableauDeBord/useBarreDuBas";
import { useTaches } from "@/lib/taches/useTaches";
import { aFairePour, lignesDeTache } from "@/lib/taches/echeances";
import { todayIso } from "@/lib/scene/dimanches";
import { getReports } from "@/lib/firebase/reports";
import { getSongProposals } from "@/lib/firebase/songProposals";
import { TACHE_POLES } from "@/types/tache";
import type { Entree } from "@/types/backOffice";

/** Cartes de la planche : la gestion, puis Messages, puis Statistiques, chacune à part. */
const CARTES: readonly (readonly Entree[])[] = [
  ["tableau", "calendrier", "planning", "taches", "evenements", "equipes"],
  ["messages"],
  ["statistiques"],
];

/** Ce que contient une entrée pour cette personne (table Q2), en morceaux de libellés. */
function morceaux(e: Entree, admin: boolean, coordination: boolean): string[] {
  const d = "backOffice.plus.contenu";
  switch (e) {
    case "planning": return [`${d}.plannings`, ...(admin ? [`${d}.import`, `${d}.sansCompte`] : [])];
    case "taches": return [admin ? `${d}.tousLesPoles` : `${d}.tesPoles`];
    case "evenements": return [`${d}.fiches`, ...(coordination ? [`${d}.scene`] : [])];
    case "equipes": return [`${d}.organigramme`, ...(admin ? [`${d}.personnes`] : [])];
    case "messages": return admin ? [`${d}.reception`, `${d}.notifier`, `${d}.questionnaire`] : [`${d}.notifier`];
    default: return [`${d}.${e}`];
  }
}

/** Signalements et propositions de chants en attente (admins, Q15). */
function useEnAttente(actif: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    Promise.all([getReports(), getSongProposals()]).then(
      ([r, p]) => { if (vivant) setN(r.filter((x) => x.status === "pending").length + p.filter((x) => x.status === "pending").length); },
      () => {},
    );
    return () => { vivant = false; };
  }, [actif]);
  return actif ? n : 0;
}

export function PagePlus() {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [feuille, setFeuille] = useState(false);
  const [erreur, setErreur] = useState(false);
  const app = useDernierePage("app");
  const admin = isAdminUser(user);
  const permises = entreesBackOffice(user, profile);
  const { charge, enregistree } = useBarreDuBas(user && permises.length > 0 ? user.uid : null);
  const barre = barreAffichee(enregistree, permises);
  const horsBarre = charge ? permises.filter((e) => !barre.includes(e)) : [];

  // Pastilles (Q15) : comptées seulement pour une entrée posée ici.
  // `useTaches` relit selon la liste des pôles (en texte) : un nouveau tableau à chaque rendu ne relance rien.
  const { items } = useTaches(horsBarre.includes("taches") ? (admin ? [...TACHE_POLES] : polesDe(profile)) : []);
  const today = todayIso();
  const aFaire = user ? aFairePour(items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today)), user.uid).length : 0;
  const enAttente = useEnAttente(admin && horsBarre.includes("messages"));
  const pastille: Partial<Record<Entree, number>> = { taches: aFaire, messages: enAttente };

  const libelle = (e: Entree) => {
    const texte = morceaux(e, admin, isCoordination(user, profile)).map((k) => t(k)).join(" · ");
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  };

  async function enregistrer(nouvelle: Entree[] | null) {
    if (!user) return;
    setErreur(false);
    try {
      await enregistrerBarreDuBas(user.uid, nouvelle);
    } catch {
      setErreur(true);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
      <PageTitle title={t("backOffice.barre.plus")} />
      {erreur && <p role="alert" className="mb-3 text-sm text-destructive">{t("backOffice.barre.erreur")}</p>}
      <div className="space-y-3.5">
        {CARTES.map((carte) => carte.filter((e) => horsBarre.includes(e))).filter((c) => c.length > 0).map((carte) => (
          <div key={carte[0]} className="raised rounded-[18px] p-1 divide-y divide-border">
            {carte.map((e) => {
              const { href, cle, Icone } = entreeBackOffice(e);
              const n = pastille[e] ?? 0;
              return (
                <Link key={e} href={href} data-testid="plus-entree" className={LIGNE}>
                  <Icone className="h-[22px] w-[22px] shrink-0 text-foreground/80" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-foreground">{t(cle)}</span>
                    <span className="block text-[13px] leading-snug text-muted-foreground">{libelle(e)}</span>
                  </span>
                  {n > 0 && (
                    <span data-testid="pastille" className="min-w-[20px] rounded-full bg-destructive px-1.5 text-center text-xs font-bold leading-5 text-destructive-foreground">
                      {n}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
                </Link>
              );
            })}
          </div>
        ))}
        <div className="raised rounded-[18px] p-1">
          <button type="button" onClick={() => setFeuille(true)} disabled={!charge} aria-describedby="plus-personnaliser-aide" className={LIGNE}>
            <SlidersHorizontal className="h-[22px] w-[22px] shrink-0 text-foreground/80" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">{t("backOffice.barre.personnaliser")}</span>
              <span id="plus-personnaliser-aide" className="block text-[13px] leading-snug text-muted-foreground">{t("backOffice.barre.personnaliserAide")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
          </button>
        </div>
        <div className="raised rounded-[18px] p-1">
          <Link href={app} className={LIGNE}>
            <ArrowLeftRight className="h-[22px] w-[22px] shrink-0 text-foreground/80" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">{t("backOffice.plus.revenir")}</span>
              <span className="block text-[13px] leading-snug text-muted-foreground">{t("backOffice.plus.revenirAide")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
          </Link>
        </div>
      </div>
      {charge && (
        <FeuilleBarreDuBas
          open={feuille}
          onClose={() => setFeuille(false)}
          barre={barre}
          permises={permises}
          enregistree={enregistree}
          coordination={isCoordination(user, profile)}
          onEnregistrer={enregistrer}
        />
      )}
    </div>
  );
}

const LIGNE =
  "flex w-full min-h-[60px] items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors duration-150 active:bg-secondary/70 disabled:opacity-60";
