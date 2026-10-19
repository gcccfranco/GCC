"use client";

// Catalogue « Harmonie » (lot 9, H1, docs/spec-harmonie.md) : ce qu'on peut faire pour
// réharmoniser un chant, fiche par fiche. Réservé aux pianistes et aux guitaristes (colonnes
// des plannings) et aux admins. Deux entrées : les filtres sensation × moment × niveau, puis
// le parcours « Par où commencer » (question 5 de U4 bis : un seul ordre partout).
//
// Lot U4 bis, B3 (docs/spec-pages-en-grand.md, Q6) : le catalogue vit dans le layout de la
// section (`DeuxVolets`), la fiche est la page de l'adresse. En grand, le catalogue à gauche
// et la fiche à droite ; sans fiche choisie, la première de la liste telle qu'elle est filtrée
// (Q3). Les filtres et l'instrument restent d'une fiche à l'autre : ils vivent ici.

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { GraduationCap, Piano } from "lucide-react";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { OngletsRail, Pilules } from "@/components/layout/Onglets";
import { Group, GroupRow } from "@/components/ui/group";
import { FicheHarmonie } from "@/components/harmonie/FicheHarmonie";
import { ContexteCatalogue, useCatalogueHarmonie } from "@/components/harmonie/catalogueContexte";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie, useCatalogue, useInstrument } from "@/lib/harmonie/useHarmonie";
import { useCoursIndex, useCoursProgres } from "@/lib/harmonie/useCours";
import { getSetlists } from "@/lib/firebase/setlists";
import { useRd2000 } from "@/lib/harmonie/rd2000";
import { cn } from "@/lib/utils";
import { MOMENTS, SENSATIONS, type Fiche, type HarmonieIndex, type Instrument, type Niveau } from "@/types/harmonie";

const NIVEAUX: Niveau[] = ["facile", "intermediaire", "avance"];

type Filtres = { sensation: string | null; moment: string | null; niveau: string | null };
const SANS_FILTRE: Filtres = { sensation: null, moment: null, niveau: null };

/** L'identifiant de la fiche ouverte, lu dans l'adresse (`/harmonie/substitutions/2m7-pour-4`). */
function ficheDeLAdresse(chemin: string): string | null {
  const reste = chemin.replace(/^\/harmonie\/?/, "").replace(/\/+$/, "");
  return reste ? reste.split("/").map(decodeURIComponent).join("/") : null;
}

export function HarmonieCatalogue({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  const { fiches, parcours, chargement } = useCatalogue();
  const [instrument, setInstrument] = useInstrument(acces);
  const [filtres, setFiltres] = useState<Filtres>(SANS_FILTRE);

  const visibles = useMemo(
    () =>
      fiches.filter(
        (f) =>
          (!f.instrument || f.instrument === instrument) &&
          (!filtres.sensation || f.sensations.includes(filtres.sensation as never)) &&
          (!filtres.moment || f.moments.includes(filtres.moment as never)) &&
          (!filtres.niveau || f.niveau[instrument] === filtres.niveau),
      ),
    [fiches, instrument, filtres],
  );
  // Les setlists (pour classer les exemples d'une fiche) : lues une fois pour la section, à la
  // première fiche ouverte, et non plus à chaque fiche (relecture du lot). Sans elles, l'ordre reste
  // celui du répertoire.
  const comptes = useRef<Promise<Record<string, number>> | null>(null);
  const comptesDesChants = useCallback(() => {
    comptes.current ??= getSetlists()
      .then((setlists) => {
        const n: Record<string, number> = {};
        for (const s of setlists) for (const it of s.items ?? []) if (it.songSlug) n[it.songSlug] = (n[it.songSlug] ?? 0) + 1;
        return n;
      })
      .catch(() => ({}));
    return comptes.current;
  }, []);
  const valeur = useMemo(
    () => ({ acces, fiches, instrument, setInstrument, comptesDesChants }),
    [acces, fiches, instrument, setInstrument, comptesDesChants],
  );

  if (acces.chargement || chargement) return null;
  // Sans droit, une phrase, une seule fois : ni liste ni fiche.
  if (!acces.peut) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }

  return (
    <ContexteCatalogue.Provider value={valeur}>
      <DeuxVolets
        racine="/harmonie"
        largeurListe={400}
        liste={
          <ListeCatalogue
            visibles={visibles}
            parcours={parcours}
            filtres={filtres}
            setFiltres={setFiltres}
          />
        }
        premier={visibles[0] ? <FicheHarmonie id={visibles[0].id} /> : null}
      >
        {children}
      </DeuxVolets>
    </ContexteCatalogue.Provider>
  );
}

function ListeCatalogue({
  visibles,
  parcours,
  filtres,
  setFiltres,
}: {
  visibles: Fiche[];
  parcours: HarmonieIndex["parcours"];
  filtres: Filtres;
  setFiltres: (f: Filtres) => void;
}) {
  const { t, i18n } = useTranslation();
  const { acces, fiches, instrument, setInstrument } = useCatalogueHarmonie();
  const deuxVolets = useDeuxVolets();
  const ouverte = ficheDeLAdresse(usePathname() ?? "/harmonie") ?? (deuxVolets ? visibles[0]?.id : null);
  const { chapitres } = useCoursIndex();
  const lecons = chapitres.filter((c) => c.niveau !== null);
  const { fini } = useCoursProgres();
  const faits = lecons.filter((c) => fini[c.id]).length;
  // Sons du RD-2000 (docs/spec-sons-rd2000.md) : pour les pianistes seulement.
  const { donnees: rd2000 } = useRd2000(acces.piano);
  const [toutLeParcours, setToutLeParcours] = useState(false);

  const familles = useMemo(() => {
    const out = new Map<string, Fiche[]>();
    for (const f of visibles) out.set(f.familleNom, [...(out.get(f.familleNom) ?? []), f]);
    return [...out.entries()];
  }, [visibles]);

  const parFiche = useMemo(() => new Map(fiches.map((f) => [f.id, f])), [fiches]);
  const filtre = filtres.sensation || filtres.moment || filtres.niveau;
  // Dix lignes prenaient tout le premier écran d'un téléphone : on en montre
  // trois, le reste se déplie.
  const etapes = toutLeParcours ? parcours : parcours.slice(0, 3);
  // Tablette debout (un volet, dès 768 px) : des cartes qui utilisent la largeur (planche
  // `harmonie-tablette`) ; téléphone et volet de gauche : des lignes.
  const cartes = !deuxVolets;
  const carte = cartes ? "md:raised md:mx-0 md:w-full md:rounded-2xl md:px-4 md:py-3 md:before:hidden" : undefined;

  return (
    <div className={cn("space-y-5", deuxVolets ? "px-5 pt-6 pb-10" : "mx-auto max-w-2xl px-4 pb-10 md:max-w-none md:px-6")} data-harmonie>
      {/* Cours et sons du clavier : en tête, au-dessus des fiches, sur téléphone seulement ; dès
          768 px, le rail de l'en-tête (agencement v18, A16) les remplace. */}
      {(lecons.length > 0 || rd2000) && (
        <div className="md:hidden">
          {lecons.length > 0 && (
            <GroupRow href="/harmonie/cours" chevron leading={<GraduationCap aria-hidden />}>
              <span className="block truncate font-medium">{t("harmonie.cours.ligne")}</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {faits > 0
                  ? t("harmonie.cours.progres", { fait: faits, total: lecons.length })
                  : t("harmonie.cours.chapitres", { count: lecons.length })}
              </span>
            </GroupRow>
          )}
          {acces.piano && rd2000 && (
            <GroupRow href="/harmonie/rd2000" chevron leading={<Piano aria-hidden />}>
              <span className="block truncate font-medium">{t("harmonie.rd2000.titre")}</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {t("harmonie.rd2000.resume", {
                  essentiels: rd2000.sons.filter((s) => s.louange === 3).length,
                  total: rd2000.sons.length.toLocaleString(i18n.language),
                })}
              </span>
            </GroupRow>
          )}
        </div>
      )}

      {/* Filtres, en rangées qui défilent (réponse 5 du 05/10), au-dessus du parcours. */}
      <div className="space-y-2">
        {acces.piano && acces.guitare && (
          <OngletsRail
            etiquette={t("harmonie.instrument.piano")}
            onglets={(["piano", "guitare"] as Instrument[]).map((i) => ({ id: i, label: t(`harmonie.instrument.${i}`) }))}
            actif={instrument}
            choisir={(v) => setInstrument(v as Instrument)}
          />
        )}
        <Pilules
          etiquette={t("harmonie.sensation.titre")}
          options={SENSATIONS.map((s) => ({ cle: s, nom: t(`harmonie.sensation.${s}`) }))}
          valeur={filtres.sensation}
          choisir={(sensation) => setFiltres({ ...filtres, sensation })}
        />
        <Pilules
          etiquette={t("harmonie.moment.titre")}
          options={MOMENTS.map((m) => ({ cle: m, nom: t(`harmonie.moment.${m}`) }))}
          valeur={filtres.moment}
          choisir={(moment) => setFiltres({ ...filtres, moment })}
        />
        <Pilules
          etiquette={t("harmonie.niveau.titre")}
          options={NIVEAUX.map((n) => ({ cle: n, nom: t(`harmonie.niveau.${n}`) }))}
          valeur={filtres.niveau}
          choisir={(niveau) => setFiltres({ ...filtres, niveau })}
        />
      </div>

      {/* Parcours : dix fiches dans l'ordre, sans suivi ; il s'efface au premier filtre. */}
      {!filtre && parcours.length > 0 && (
        <section data-parcours>
          <h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.parcours")}</h2>
          <div className={cn(cartes && "md:grid md:grid-cols-3 md:gap-3")}>
            {etapes.map((e) => {
              const id = e.fiches.find((x) => parFiche.get(x)?.instrument === instrument) ?? e.fiches[0];
              const fiche = parFiche.get(id);
              if (!fiche) return null;
              const numero = (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold tabular-nums text-foreground">
                  {e.n}
                </span>
              );
              return (
                <GroupRow key={e.n} href={`/harmonie/${fiche.id}`} chevron className={cn(carte, cartes && "md:flex-col md:items-start md:gap-2 md:[&>svg]:hidden")}>
                  <span className="flex items-center gap-3">
                    {numero}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{fiche.nom}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">{fiche.familleNom}</span>
                    </span>
                  </span>
                </GroupRow>
              );
            })}
          </div>
          {!toutLeParcours && parcours.length > etapes.length && (
            <GroupRow onClick={() => setToutLeParcours(true)} className={cn(cartes && "md:min-h-0")}>
              <span className="font-medium text-muted-foreground">{t("harmonie.voirPlus")}</span>
            </GroupRow>
          )}
        </section>
      )}

      {visibles.length === 0 ? (
        <div className="py-10 text-center" role="status">
          <p className="text-muted-foreground">{t("harmonie.aucuneFiche")}</p>
          <button
            className="mt-3 text-[15px] font-medium text-foreground underline underline-offset-4"
            onClick={() => setFiltres(SANS_FILTRE)}
          >
            {t("harmonie.effacerFiltres")}
          </button>
        </div>
      ) : (
        <div className={cn("space-y-5", cartes && "md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0")}>
          {familles.map(([nom, liste]) => (
            <div key={nom} data-famille className={cn(cartes && "md:raised md:rounded-2xl md:px-4 md:pt-3.5 md:pb-1.5")}>
              <Group title={nom} className={cn(cartes && "md:[&>h2]:text-[17px] md:[&>h2]:text-foreground")}>
                {liste.map((f) => (
                  <GroupRow key={f.id} href={`/harmonie/${f.id}`} chevron actif={f.id === ouverte}>
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{f.nom}</span>
                      {f.statut !== "validee" && (
                        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[11px]", f.id === ouverte ? "bg-background font-medium text-foreground" : "bg-secondary text-muted-foreground")}>
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
            </div>
          ))}
        </div>
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
