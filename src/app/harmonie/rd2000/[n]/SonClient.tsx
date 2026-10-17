"use client";

// Sons du RD-2000, tranche S3 (docs/spec-sons-rd2000.md) : la page d'un son
// (`/harmonie/rd2000/0017`) ou d'une recette par famille (`/harmonie/rd2000/R4`).
// Un ★★★ a sa fiche de réglages ; les autres renvoient aux recettes.

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Group, GroupRow } from "@/components/ui/group";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { etoiles, parEcran, useRd2000, type Fiche, type Rd2000 } from "@/lib/harmonie/rd2000";

/** Les réglages d'une fiche ou d'une recette, un titre par écran du clavier. */
function Reglages({ fiche }: { fiche: Fiche }) {
  return (
    <div className="space-y-5" data-reglages>
      {parEcran(fiche.reglages).map(({ ecran, reglages }, i) => (
        <Group key={i} title={ecran}>
          {reglages.map((r, j) => (
            <div key={j} className="border-t border-border py-2.5 first:border-t-0" data-reglage>
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{r.parametre}</span>
                <span className="shrink-0 text-[17px] font-semibold tabular-nums">{r.valeur}</span>
              </p>
              {r.pourquoi && <p className="text-[13px] text-muted-foreground">{r.pourquoi}</p>}
            </div>
          ))}
        </Group>
      ))}
    </div>
  );
}

function Recettes({ donnees }: { donnees: Rd2000 }) {
  const { t } = useTranslation();
  return (
    <Group title={t("harmonie.rd2000.recettes")}>
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

function Son() {
  const { t } = useTranslation();
  const params = useParams<{ n: string }>();
  const n = decodeURIComponent(params.n);
  const acces = useAccesHarmonie();
  const { donnees, chargement } = useRd2000();

  if (acces.chargement || chargement) return null;
  if (!acces.piano) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }

  const son = donnees?.sons.find((s) => s.n === n);
  const recette = donnees?.recettes.find((r) => r.n === n);
  const fiche = donnees?.fiches.find((f) => f.n === n);
  const parN = new Map((donnees?.sons ?? []).map((s) => [s.n, s]));

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-10 space-y-6" data-son-page={n}>
      <Link href="/harmonie/rd2000" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("harmonie.rd2000.retour")}
      </Link>

      {!donnees || (!son && !recette) ? (
        <p className="py-10 text-center text-muted-foreground">{t("harmonie.rd2000.introuvable")}</p>
      ) : son ? (
        <>
          <header className="space-y-1">
            <p className="text-[34px] font-bold leading-none tabular-nums">{son.n}</p>
            <h1 className="text-[22px] font-bold leading-tight">{son.nom}</h1>
            <p className="text-[13px] text-muted-foreground">{son.categorie} › {son.sousCategorie}</p>
            <p className="text-[15px]">
              <span aria-label={`${son.louange} / 3`}>{etoiles(son.louange)}</span>
              {son.premier && <span className="ml-2 align-middle rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-foreground">{t("harmonie.rd2000.premierChoix")}</span>}
              {son.commentaire && <span className="text-muted-foreground"> · {son.commentaire}</span>}
            </p>
          </header>
          <Group>
            <div className="space-y-1 py-1 text-[15px]">
              <p><span className="text-muted-foreground">{t("harmonie.rd2000.edition")} : </span>{son.edition}</p>
              <p className="tabular-nums" data-midi>
                {t("harmonie.rd2000.midi", { msb: son.msb, lsb: son.lsb, pc: son.pc, pcMidi: son.pc - 1 })}
              </p>
            </div>
          </Group>
          {fiche ? (
            <section className="space-y-4">
              <h2 className="text-[19px] font-bold">{t("harmonie.rd2000.reglages")}</h2>
              <p className="text-[15px] font-medium">{fiche.intention}</p>
              {fiche.pourquoi && <p className="text-[15px] text-muted-foreground">{fiche.pourquoi}</p>}
              <Reglages fiche={fiche} />
            </section>
          ) : (
            <section className="space-y-4">
              <p className="text-[15px]" data-sans-fiche>{t("harmonie.rd2000.sansFiche")}</p>
              <Recettes donnees={donnees} />
            </section>
          )}
        </>
      ) : (
        recette && (
          <>
            <header className="space-y-1">
              <p className="text-[34px] font-bold leading-none tabular-nums">{recette.n}</p>
              <h1 className="text-[22px] font-bold leading-tight">{recette.nom}</h1>
              {recette.pourquoi && <p className="text-[15px] text-muted-foreground">{recette.pourquoi}</p>}
            </header>
            {recette.exemples.length > 0 && (
              <Group title={t("harmonie.rd2000.exemples")}>
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

export function SonClient() {
  return (
    <RequireAuth>
      <Son />
    </RequireAuth>
  );
}
