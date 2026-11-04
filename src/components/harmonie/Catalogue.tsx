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
import { ChevronDown } from "lucide-react";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { OngletsRail, Pilules } from "@/components/layout/Onglets";
import { Group, GroupRow } from "@/components/ui/group";
import { Menu } from "@/components/ui/menu";
import { FicheHarmonie } from "@/components/harmonie/FicheHarmonie";
import { ContexteCatalogue, useCatalogueHarmonie } from "@/components/harmonie/catalogueContexte";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie, useCatalogue, useInstrument } from "@/lib/harmonie/useHarmonie";
import { getSetlists } from "@/lib/firebase/setlists";
import { cn } from "@/lib/utils";
import { MOMENTS, SENSATIONS, type Fiche, type HarmonieIndex, type Instrument, type Niveau } from "@/types/harmonie";
import { ImpasseHarmonie } from "@/components/harmonie/ImpasseHarmonie";

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
    return <ImpasseHarmonie />;
  }

  return (
    <ContexteCatalogue.Provider value={valeur}>
      <DeuxVolets
        fond="blanc"
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
  const { t } = useTranslation();
  const { acces, fiches, instrument, setInstrument } = useCatalogueHarmonie();
  const deuxVolets = useDeuxVolets();
  const ouverte = ficheDeLAdresse(usePathname() ?? "/harmonie") ?? (deuxVolets ? visibles[0]?.id : null);
  const [toutLeParcours, setToutLeParcours] = useState(false);
  // Sur deux volets, le parcours est replié au départ en une ligne qui se déplie sur place.
  const [parcoursOuvert, setParcoursOuvert] = useState(false);

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
  // Le badge « à relire » n'a de sens que s'il distingue : quand toutes les fiches le sont, le bandeau suffit.
  const badgeARelire = visibles.some((f) => f.statut === "validee");
  const cartes = !deuxVolets;
  const carte = cartes ? "md:bloc-info md:mx-0 md:w-full md:rounded-2xl md:px-4 md:py-3 md:before:hidden" : undefined;

  return (
    <div className={cn("flex flex-col gap-5", deuxVolets ? "px-5 pt-4 pb-10" : "mx-auto max-w-2xl px-4 pb-10 md:max-w-none md:px-6")} data-harmonie>
      {/* Filtres, en rangées qui défilent (réponse 5 du 05/10), au-dessus du parcours. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {acces.piano && acces.guitare && (
            <OngletsRail
              etiquette={t("harmonie.instrument.piano")}
              onglets={(["piano", "guitare"] as Instrument[]).map((i) => ({ id: i, label: t(`harmonie.instrument.${i}`) }))}
              actif={instrument}
              choisir={(v) => setInstrument(v as Instrument)}
            />
          )}
          <Menu
            label={t("harmonie.moment.titre")}
            nom={t("harmonie.moment.titre")}
            surGris
            value={filtres.moment ?? ""}
            defaultValue=""
            onChange={(v) => setFiltres({ ...filtres, moment: v || null })}
            options={[{ valeur: "", libelle: t("harmonie.moment.tous") }, ...MOMENTS.map((m) => ({ valeur: m as string, libelle: t(`harmonie.moment.${m}`) }))]}
          />
          <Menu
            label={t("harmonie.niveau.titre")}
            nom={t("harmonie.niveau.titre")}
            surGris
            value={filtres.niveau ?? ""}
            defaultValue=""
            onChange={(v) => setFiltres({ ...filtres, niveau: v || null })}
            options={[{ valeur: "", libelle: t("harmonie.niveau.tous") }, ...NIVEAUX.map((n) => ({ valeur: n as string, libelle: t(`harmonie.niveau.${n}`) }))]}
          />
        </div>
        <Pilules
          etiquette={t("harmonie.sensation.titre")}
          options={SENSATIONS.map((s) => ({ cle: s, nom: t(`harmonie.sensation.${s}`) }))}
          valeur={filtres.sensation}
          choisir={(sensation) => setFiltres({ ...filtres, sensation })}
        />
      </div>

      {/* Parcours : dix fiches dans l'ordre, sans suivi ; il s'efface au premier filtre. */}
      {!filtre && parcours.length > 0 && (
        <section data-parcours>
          {deuxVolets ? (
            <button
              type="button"
              aria-expanded={parcoursOuvert}
              onClick={() => setParcoursOuvert((v) => !v)}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-secondary-fond px-3 py-2 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{t("harmonie.parcours")}</span>
                <span className="block text-[13px] text-muted-foreground">{t("harmonie.parcoursSous", { count: parcours.length })}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-150", parcoursOuvert && "rotate-180")} aria-hidden />
            </button>
          ) : (
            <h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">{t("harmonie.parcours")}</h2>
          )}
          {(!deuxVolets || parcoursOuvert) && (<>
          <div className={cn(deuxVolets && "mt-1.5", cartes && "md:grid md:grid-cols-3 md:gap-3")}>
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
                <GroupRow key={e.n} href={`/harmonie/${fiche.id}`} chevron className={cn(carte, cartes && "md:hover:bg-secondary-fond md:active:bg-secondary-fond md:flex-col md:items-start md:gap-2 md:[&>svg]:hidden")}>
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
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {t("harmonie.voirLesAutres", { count: parcours.length - etapes.length })}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </span>
            </GroupRow>
          )}
          </>)}
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
        <div className={cn("space-y-5", cartes && "md:columns-2 md:gap-4 md:space-y-0")}>
          {familles.map(([nom, liste]) => (
            <div key={nom} data-famille className={cn(cartes && "md:bloc-info md:mb-4 md:break-inside-avoid md:rounded-2xl md:px-4 md:pt-3.5 md:pb-1.5")}>
              <Group title={nom} className={cn(cartes && "md:[&>h2]:text-[17px] md:[&>h2]:text-foreground")}>
                {liste.map((f) => (
                  <GroupRow key={f.id} href={`/harmonie/${f.id}`} chevron actif={f.id === ouverte} className={cn(cartes && f.id !== ouverte && "md:hover:bg-secondary-fond md:active:bg-secondary-fond")}>
                    <span className="flex items-center gap-2">
                      <span className="line-clamp-2 font-medium">{f.nom}</span>
                      {badgeARelire && f.statut !== "validee" && (
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
