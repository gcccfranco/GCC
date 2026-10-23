"use client";

// Widget 4 « Plannings » (lot U6, B4 ; réécrit au lot TB2-b, docs/spec-tableau-de-bord-v2.md T4) : dans les
// plannings qu'on remplit, les cases vides du prochain dimanche (avec qui relancer et « Copier le rappel »), les
// absences en conflit (jamais le motif) et, en une ligne, ce qui reste à remplir les dimanches suivants.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CalendarDays, Check } from "lucide-react";
import { canVoirAbsencesDeTous } from "@/lib/access";
import { cleNomEquipe } from "@/lib/equipes/table";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { listerToutesAbsences } from "@/lib/firebase/absences";
import { useProfile } from "@/lib/firebase/users";
import { GRILLES, grilleDe } from "@/lib/planning/grilles";
import {
  planningsCasesVides, planningsDuTableau, prochainDimanche, prochainsDimanches, texteDuRappel, type CaseVideARelancer,
} from "@/lib/tableauDeBord/donnees";
import { lireGrilles, lireProfils, useLecture } from "@/lib/tableauDeBord/lecture";
import { addDays } from "@/lib/taches/echeances";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rond, jourCourt } from "./Cadre";

const RANGEE = "flex min-w-0 items-center gap-2.5 border-t border-border/60 py-[7px] text-sm text-foreground first:border-t-0";
const LIEN = "shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground";

/** Le nom court d'un planning : son libellé, ou (en 中文, quand il est seul à le porter) le titre traduit de sa page. */
function nomPlanning(cle: string, t: TFunction, zh: boolean): string {
  const def = grilleDe(cle)!;
  const seul = GRILLES.filter((g) => g.i18nTitre === def.i18nTitre).length === 1;
  return zh && seul ? t(def.i18nTitre) : def.label;
}

export function WidgetCasesVides({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const zh = i18n.language === "zh-CN";
  const plannings = planningsCasesVides(widget.reglages, user, profile);
  const dimanche = prochainDimanche(nowIsoParis());
  const suivants = prochainsDimanches(addDays(dimanche, 7), widget.reglages.horizon ?? 4);
  const voitLesAbsences = canVoirAbsencesDeTous(user, profile);
  const { valeur, erreur } = useLecture(async () => {
    const [rows, profils, absences] = await Promise.all([
      lireGrilles(plannings), lireProfils(), voitLesAbsences ? listerToutesAbsences() : [],
    ]);
    return planningsDuTableau(rows, plannings, dimanche, suivants, profils, absences);
  }, `${dimanche}|${suivants.length}|${plannings.join()}|${voitLesAbsences}`);

  const rien = valeur && valeur.vides.length === 0 && valeur.conflits.length === 0 && suivants.length === 0;
  const plusTard = valeur && suivants.length > 0 ? valeur.plusTard : null;

  return (
    <CadreWidget
      id="planning" taille={widget.taille} Icone={CalendarDays} nom={t("tableauDeBord.widgets.planning")}
      complement={t("tableauDeBord.planning.complement")}
    >
      {plannings.length === 0 ? <Message>{t("tableauDeBord.planning.aucun")}</Message>
        : erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : rien ? <Message>{t("tableauDeBord.planning.rien")}</Message>
        : (
          <div>
            {valeur.vides.map((c) => (
              <CaseVide key={`${c.planning}-${c.colonne.cle}`} c={c} nom={nomPlanning(c.planning, t, zh)} />
            ))}
            {valeur.conflits.map((c) => (
              <div key={`${c.planning}-${c.date}-${c.colonne.cle}-${c.nom}`} data-testid="ligne-absence" className={RANGEE}>
                <Rond ton="warn">!</Rond>
                <span className="min-w-0 flex-1">
                  <b className="block break-words font-semibold">{nomPlanning(c.planning, t, zh)} · {jourCourt(c.date, i18n.language)} · {c.nom}</b>
                  <span className="block text-xs text-muted-foreground">{t("tableauDeBord.planning.absence", { poste: t(c.colonne.i18n) })}</span>
                </span>
                <Link href={`/back-office/planning/${c.planning}`} className={LIEN}>{t("tableauDeBord.planning.remplacer")}</Link>
              </div>
            ))}
            {plusTard && (
              <div data-testid="ligne-plus-tard" className={RANGEE}>
                {plusTard.nombre > 0 ? (
                  <>
                    <Rond ton="bad">{plusTard.nombre}</Rond>
                    <span className="min-w-0 flex-1">
                      <b className="block break-words font-semibold">
                        {t("tableauDeBord.planning.plusTard", { date: jourCourt(plusTard.jusquau, i18n.language) })}
                      </b>
                      <span className="block text-xs text-muted-foreground">
                        {plusTard.parPlanning.map((p) => `${nomPlanning(p.planning, t, zh)} : ${
                          p.colonnes.map((c) => `${t(c.i18n)}${c.n > 1 ? ` ×${c.n}` : ""}`).join(", ")}`).join(" · ")}
                      </span>
                    </span>
                    <Link href={`/back-office/planning/${plusTard.parPlanning[0].planning}`} className={LIEN}>
                      {t("tableauDeBord.planning.planning")}
                    </Link>
                  </>
                ) : (
                  <>
                    <Rond ton="ok"><Check className="h-3 w-3" strokeWidth={3} /></Rond>
                    <b className="min-w-0 flex-1 break-words font-semibold">
                      {t("tableauDeBord.planning.plusTardRien", { date: jourCourt(plusTard.jusquau, i18n.language) })}
                    </b>
                  </>
                )}
              </div>
            )}
          </div>
        )}
    </CadreWidget>
  );
}

/** Une case vide du prochain dimanche : qui relancer et, s'il y a un référent, le bouton qui copie le rappel. */
function CaseVide({ c, nom }: { c: CaseVideARelancer; nom: string }) {
  const { t, i18n } = useTranslation();
  const [etat, setEtat] = useState<"copie" | "repli" | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const texte = c.relancer
    ? texteDuRappel({
      prenom: c.relancer.prenom, planning: c.planning, colonne: c.colonne.cle, date: c.date,
      lien: `${location.origin}/back-office/planning/${c.planning}`,
    })
    : "";

  // « Copié » dure 2 s ; le repli prend le focus et sélectionne le texte.
  useEffect(() => {
    if (etat === "copie") {
      const id = setTimeout(() => setEtat(null), 2000);
      return () => clearTimeout(id);
    }
    if (etat === "repli") {
      zone.current?.focus();
      zone.current?.select();
    }
  }, [etat]);

  // `writeText` part dans le geste (avant tout `await`) ; refus ou API absente : le texte à sélectionner.
  const copier = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard");
      await navigator.clipboard.writeText(texte);
      setEtat("copie");
    } catch {
      setEtat("repli");
    }
  };

  return (
    <div data-testid="ligne-case-vide" className="min-w-0 border-t border-border/60 py-[7px] text-sm text-foreground first:border-t-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <Rond ton="bad">!</Rond>
        <span className="min-w-0 flex-1">
          <b className="block break-words font-semibold">{nom} · {jourCourt(c.date, i18n.language)} · {t(c.colonne.i18n)}</b>
          <span className="block text-xs text-muted-foreground">
            {c.relancer
              ? t("tableauDeBord.planning.relancer", {
                prenom: c.relancer.prenom,
                role: c.relancer.sous ? t(`acces.sousEquipe.${c.relancer.sous}`) : t(cleNomEquipe(c.relancer.equipe, true)),
              })
              : t("tableauDeBord.planning.aucunReferent")}
          </span>
        </span>
        {c.relancer && (
          <button
            type="button" onClick={copier}
            className="shrink-0 rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {etat === "copie" ? t("tableauDeBord.planning.copie") : t("tableauDeBord.planning.copier")}
          </button>
        )}
      </div>
      {etat === "repli" && (
        <div className="mt-1.5 pl-[30px]">
          <p className="mb-1 text-xs text-muted-foreground">{t("tableauDeBord.planning.copieLeTexte")}</p>
          <textarea
            ref={zone} readOnly rows={4} value={texte} onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground"
          />
        </div>
      )}
    </div>
  );
}
