"use client";

// Catalogue « Harmonie » (lot 9, H1, docs/spec-harmonie.md) : ce qu'on peut
// faire pour réharmoniser un chant, fiche par fiche. Réservé aux pianistes et
// aux guitaristes (colonnes des plannings) et aux admins. Deux entrées : le
// parcours « Par où commencer », et les filtres sensation × moment × niveau.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import { Pilules } from "@/components/harmonie/Pilules";
import { useAccesHarmonie, useCatalogue, useInstrument } from "@/lib/harmonie/useHarmonie";
import { MOMENTS, SENSATIONS, type Fiche, type Instrument, type Niveau } from "@/types/harmonie";

const NIVEAUX: Niveau[] = ["facile", "intermediaire", "avance"];

function HarmonieClient() {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  const { fiches, parcours, chargement } = useCatalogue();
  const [instrument, setInstrument] = useInstrument(acces);
  const [sensation, setSensation] = useState<string | null>(null);
  const [moment, setMoment] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<string | null>(null);
  const [toutLeParcours, setToutLeParcours] = useState(false);

  const visibles = useMemo(
    () =>
      fiches.filter(
        (f) =>
          (!f.instrument || f.instrument === instrument) &&
          (!sensation || f.sensations.includes(sensation as never)) &&
          (!moment || f.moments.includes(moment as never)) &&
          (!niveau || f.niveau[instrument] === niveau),
      ),
    [fiches, instrument, sensation, moment, niveau],
  );

  const familles = useMemo(() => {
    const out = new Map<string, Fiche[]>();
    for (const f of visibles) out.set(f.familleNom, [...(out.get(f.familleNom) ?? []), f]);
    return [...out.entries()];
  }, [visibles]);

  const parFiche = useMemo(() => new Map(fiches.map((f) => [f.id, f])), [fiches]);
  const filtre = sensation || moment || niveau;
  // Dix lignes prenaient tout le premier écran d'un téléphone : on en montre
  // trois, le reste se déplie.
  const etapes = toutLeParcours ? parcours : parcours.slice(0, 3);

  if (acces.chargement || chargement) return null;
  if (!acces.peut) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 space-y-6" data-harmonie>
      <PageTitle title={t("harmonie.titre")} />
      <p className="text-[15px] text-muted-foreground">{t("harmonie.sousTitre")}</p>

      {acces.piano && acces.guitare && (
        <Pilules
          etiquette={t("harmonie.instrument.piano")}
          options={(["piano", "guitare"] as Instrument[]).map((i) => ({ cle: i, nom: t(`harmonie.instrument.${i}`) }))}
          valeur={instrument}
          choisir={(v) => setInstrument((v ?? "piano") as Instrument)}
          obligatoire
        />
      )}

      {/* Parcours : dix fiches dans l'ordre, sans suivi */}
      {!filtre && parcours.length > 0 && (
        <Group title={t("harmonie.parcours")}>
          {etapes.map((e) => {
            const id = e.fiches.find((x) => parFiche.get(x)?.instrument === instrument) ?? e.fiches[0];
            const fiche = parFiche.get(id);
            if (!fiche) return null;
            return (
              <GroupRow
                key={e.n}
                href={`/harmonie/${fiche.id}`}
                chevron
                leading={
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold tabular-nums">
                    {e.n}
                  </span>
                }
              >
                <span className="block truncate font-medium">{fiche.nom}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{fiche.familleNom}</span>
              </GroupRow>
            );
          })}
          {!toutLeParcours && parcours.length > etapes.length && (
            <GroupRow onClick={() => setToutLeParcours(true)}>
              <span className="font-medium">{t("harmonie.voirPlus")}</span>
            </GroupRow>
          )}
        </Group>
      )}

      {/* Filtres */}
      <div className="space-y-2">
        <Pilules
          etiquette={t("harmonie.sensation.titre")}
          options={SENSATIONS.map((s) => ({ cle: s, nom: t(`harmonie.sensation.${s}`) }))}
          valeur={sensation}
          choisir={setSensation}
        />
        <Pilules
          etiquette={t("harmonie.moment.titre")}
          options={MOMENTS.map((m) => ({ cle: m, nom: t(`harmonie.moment.${m}`) }))}
          valeur={moment}
          choisir={setMoment}
        />
        <Pilules
          etiquette={t("harmonie.niveau.titre")}
          options={NIVEAUX.map((n) => ({ cle: n, nom: t(`harmonie.niveau.${n}`) }))}
          valeur={niveau}
          choisir={setNiveau}
        />
      </div>

      {visibles.length === 0 ? (
        <div className="py-10 text-center" role="status">
          <p className="text-muted-foreground">{t("harmonie.aucuneFiche")}</p>
          <button
            className="mt-3 text-[15px] font-medium text-foreground underline underline-offset-4"
            onClick={() => { setSensation(null); setMoment(null); setNiveau(null); }}
          >
            {t("harmonie.effacerFiltres")}
          </button>
        </div>
      ) : (
        familles.map(([nom, liste]) => (
          <Group key={nom} title={nom}>
            {liste.map((f) => (
              <GroupRow key={f.id} href={`/harmonie/${f.id}`} chevron>
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{f.nom}</span>
                  {f.statut !== "validee" && (
                    <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {t("harmonie.aRelire")}
                    </span>
                  )}
                </span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {f.sensations.map((s) => t(`harmonie.sensation.${s}`)).join(" · ")}
                </span>
              </GroupRow>
            ))}
          </Group>
        ))
      )}

      <p className="text-[13px] text-muted-foreground">
        {t("harmonie.aRelireTout")}{" "}
        <Link href="/guide" className="underline underline-offset-4">
          {t("common.header.guide")}
        </Link>
      </p>
    </div>
  );
}

export default function HarmoniePage() {
  return (
    <RequireAuth>
      <HarmonieClient />
    </RequireAuth>
  );
}
