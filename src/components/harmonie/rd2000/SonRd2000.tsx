"use client";

// Sons du RD-2000, tranche S3 (docs/spec-sons-rd2000.md) : la page d'un son
// (`/harmonie/rd2000/0017`) ou d'une recette par famille (`/harmonie/rd2000/R4`).
// Un ★★★ a sa fiche de réglages ; les autres renvoient aux recettes.
//
// Lot U4 bis, B3 (Q6, planches `harmonie-rd2000-*`) : des cartes ; en grand, à droite de la
// liste, sans « Retour », le N° à côté du nom et les réglages sur deux colonnes.

import { Retour } from "@/components/layout/EnTetePage";
import { useTranslation } from "react-i18next";
import { Group, GroupRow } from "@/components/ui/group";
import { useRd2000Charge } from "@/components/harmonie/rd2000/contexte";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { couperEnDeuxColonnes, etoiles, parEcran, type Fiche, type Reglage } from "@/lib/harmonie/rd2000";
import { cn } from "@/lib/utils";

const CARTE = "raised rounded-2xl px-4 pt-3.5 pb-1";

function Ecran({ ecran, reglages, suite }: { ecran: string; reglages: Reglage[]; suite?: boolean }) {
  const { t } = useTranslation();
  return (
    <section className={CARTE}>
      {/* La suite d'un écran coupé n'est pas un nouvel écran : un rappel, pas un titre. */}
      {suite
        ? <p className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.rd2000.suite", { ecran })}</p>
        : <h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">{ecran}</h2>}
      {reglages.map((r, j) => (
        <div key={j} className="border-t border-border py-2.5" data-reglage>
          <p className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{r.parametre}</span>
            <span className="shrink-0 text-[17px] font-semibold tabular-nums">{r.valeur}</span>
          </p>
          {r.pourquoi && <p className="text-[13px] text-muted-foreground">{r.pourquoi}</p>}
        </div>
      ))}
    </section>
  );
}

/** Les réglages d'une fiche ou d'une recette, une carte par écran du clavier ; en grand, sur
 *  deux colonnes (`couperEnDeuxColonnes`). */
function Reglages({ fiche }: { fiche: Fiche }) {
  const deuxVolets = useDeuxVolets();
  const groupes = parEcran(fiche.reglages);
  if (!deuxVolets) {
    return (
      <div className="space-y-4" data-reglages>
        {groupes.map((g, i) => <Ecran key={i} {...g} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 items-start gap-4" data-reglages>
      {couperEnDeuxColonnes(groupes).map((colonne, i) => (
        <div key={i} className="space-y-4" data-colonne-reglages>
          {colonne.map((g, j) => <Ecran key={j} {...g} />)}
        </div>
      ))}
    </div>
  );
}

function Recettes() {
  const { t } = useTranslation();
  const { donnees } = useRd2000Charge();
  return (
    <Group title={t("harmonie.rd2000.recettes")} className={cn(CARTE, "pb-2")}>
      {donnees.recettes.map((r) => (
        <GroupRow key={r.n} href={`/harmonie/rd2000/${r.n}`} chevron>
          <span className="flex items-baseline gap-2.5">
            <span className="shrink-0 font-semibold tabular-nums">{r.n}</span>
            <span className="truncate font-medium">{r.nom}</span>
          </span>
        </GroupRow>
      ))}
    </Group>
  );
}

export function SonRd2000({ n }: { n: string }) {
  const { t } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const { donnees, parN } = useRd2000Charge();

  const son = donnees.sons.find((s) => s.n === n);
  const recette = donnees.recettes.find((r) => r.n === n);
  const fiche = donnees.fiches.find((f) => f.n === n);
  // En grand, sous l'en-tête « Harmonie » : un h2 de 24 px (agencement v18, R3) ; seul, le h1.
  const Titre = deuxVolets ? "h2" : "h1";
  const titre = cn("font-bold leading-tight", deuxVolets ? "text-[24px]" : "text-[22px]");

  return (
    <div
      className={cn("space-y-6 pb-10", deuxVolets ? undefined : "mx-auto max-w-2xl px-4 pt-3 md:max-w-3xl md:px-6")}
      data-son-page={n}
    >
      {!deuxVolets && (
        <Retour href="/harmonie/rd2000">{t("harmonie.rd2000.retour")}</Retour>
      )}

      {!son && !recette ? (
        <p className="py-10 text-center text-muted-foreground">{t("harmonie.rd2000.introuvable")}</p>
      ) : son ? (
        <>
          <header className="space-y-2">
            <div className="flex items-center gap-4">
              <p className="text-[34px] font-bold leading-none tabular-nums">{son.n}</p>
              <div className="min-w-0">
                <Titre className={titre}>{son.nom}</Titre>
                <p className="text-[13px] text-muted-foreground">{son.categorie} › {son.sousCategorie}</p>
              </div>
            </div>
            <p className="text-[15px]">
              <span aria-label={`${son.louange} / 3`}>{etoiles(son.louange)}</span>
              {son.premier && <span className="ml-2 align-middle rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-foreground">{t("harmonie.rd2000.premierChoix")}</span>}
              {son.commentaire && <span className="text-muted-foreground"> · {son.commentaire}</span>}
            </p>
          </header>
          <div className="raised divide-y divide-border rounded-2xl px-4 text-[15px]">
            <p className="py-3"><span className="text-muted-foreground">{t("harmonie.rd2000.edition")} : </span>{son.edition}</p>
            <p className="py-3 tabular-nums" data-midi>
              {t("harmonie.rd2000.midi", { msb: son.msb, lsb: son.lsb, pc: son.pc, pcMidi: son.pc - 1 })}
            </p>
          </div>
          {fiche ? (
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-[19px] font-bold">{t("harmonie.rd2000.reglages")}</h2>
                <p className="text-[15px] font-medium">{fiche.intention}</p>
                {fiche.pourquoi && <p className="text-[15px] text-muted-foreground">{fiche.pourquoi}</p>}
              </div>
              <Reglages fiche={fiche} />
            </section>
          ) : (
            <section className="space-y-4">
              <p className="text-[15px]" data-sans-fiche>{t("harmonie.rd2000.sansFiche")}</p>
              <Recettes />
            </section>
          )}
        </>
      ) : (
        recette && (
          <>
            <header className="space-y-1">
              <p className="text-[34px] font-bold leading-none tabular-nums">{recette.n}</p>
              <Titre className={titre}>{recette.nom}</Titre>
              {recette.pourquoi && <p className="text-[15px] text-muted-foreground">{recette.pourquoi}</p>}
            </header>
            {recette.exemples.length > 0 && (
              <Group title={t("harmonie.rd2000.exemples")} className={cn(CARTE, "pb-2")}>
                {recette.exemples.flatMap((x) => {
                  const s = parN.get(x);
                  return s
                    ? [(
                      <GroupRow key={x} href={`/harmonie/rd2000/${x}`} chevron>
                        <span className="flex items-baseline gap-2.5">
                          <span className="shrink-0 font-semibold tabular-nums">{s.n}</span>
                          <span className="truncate">{s.nom}</span>
                        </span>
                      </GroupRow>
                    )]
                    : [];
                })}
              </Group>
            )}
            <Reglages fiche={recette} />
          </>
        )
      )}
    </div>
  );
}
