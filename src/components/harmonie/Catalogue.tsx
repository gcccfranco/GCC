"use client";

// Catalogue « Harmonie » (lot 9, H1, docs/spec-harmonie.md) : ce qu'on peut faire pour
// réharmoniser un chant, fiche par fiche. Réservé aux pianistes et aux guitaristes (colonnes
// des plannings) et aux admins. Deux entrées : les filtres ressenti × usage (le niveau ordonne la liste), puis
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
import { GroupRow } from "@/components/ui/group";
import { FicheHarmonie } from "@/components/harmonie/FicheHarmonie";
import { useTerme } from "@/components/harmonie/AvisLangue";
import { ContexteCatalogue, useCatalogueHarmonie } from "@/components/harmonie/catalogueContexte";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie, useCatalogue, useInstrument } from "@/lib/harmonie/useHarmonie";
import { compter } from "@/lib/usage";
import { getSetlists } from "@/lib/firebase/setlists";
import { cn } from "@/lib/utils";
import { RESSENTIS, USAGES, type Fiche, type HarmonieIndex, type Instrument, type Ressenti, type Usage } from "@/types/harmonie";
import { ImpasseHarmonie } from "@/components/harmonie/ImpasseHarmonie";

const RANG_NIVEAU = ["facile", "intermediaire", "avance"];

type Filtres = { ressenti: Ressenti | null; usage: Usage | null };
const SANS_FILTRE: Filtres = { ressenti: null, usage: null };

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
  // Une rafale de réglages se compte une fois (3 s depuis le dernier compte), comme `modifierLigne` des setlists ;
  // un réglage qui ne change rien ne compte pas.
  const dernierFiltre = useRef(0);
  const filtrer = (f: Filtres) => {
    const maintenant = Date.now();
    if (JSON.stringify(f) !== JSON.stringify(filtres) && maintenant - dernierFiltre.current > 3000) {
      compter("cmd.harmonie.filtre");
      dernierFiltre.current = maintenant;
    }
    setFiltres(f);
  };

  const visibles = useMemo(
    () => {
      const rang = (f: Fiche) => {
        const i = RANG_NIVEAU.indexOf(f.niveau[instrument] as string);
        return i < 0 ? 3 : i;
      };
      return fiches
        .filter(
          (f) =>
            (!f.instrument || f.instrument === instrument) &&
            (!filtres.ressenti || f.ressentis.includes(filtres.ressenti)) &&
            (!filtres.usage || f.usages.includes(filtres.usage)),
        )
        .sort((a, b) => rang(a) - rang(b)); // tri stable : ordre du catalogue à niveau égal
    },
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
    () => ({ acces, fiches, instrument, setInstrument, comptesDesChants, ordre: visibles.map((f) => f.id) }),
    [acces, fiches, instrument, setInstrument, comptesDesChants, visibles],
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
        largeurListe={280}
        liste={
          <ListeCatalogue
            visibles={visibles}
            parcours={parcours}
            filtres={filtres}
            setFiltres={filtrer}
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
  const terme = useTerme();
  const { acces, fiches, instrument, setInstrument } = useCatalogueHarmonie();
  const deuxVolets = useDeuxVolets();
  const ouverte = ficheDeLAdresse(usePathname() ?? "/harmonie") ?? (deuxVolets ? visibles[0]?.id : null);
  const [toutLeParcours, setToutLeParcours] = useState(false);
  // Le parcours est replié au départ en une ligne qui se déplie sur place.
  const [parcoursOuvert, setParcoursOuvert] = useState(false);

  const parFiche = useMemo(() => new Map(fiches.map((f) => [f.id, f])), [fiches]);
  const filtre = filtres.ressenti || filtres.usage;
  // Dix lignes prenaient tout le premier écran d'un téléphone : on en montre
  // trois, le reste se déplie.
  const etapes = toutLeParcours ? parcours : parcours.slice(0, 3);
  // Tablette debout (un volet, dès 768 px) : des cartes qui utilisent la largeur (planche
  // `harmonie-tablette`) ; téléphone et volet de gauche : des lignes.
  // Le badge « à relire » n'a de sens que s'il distingue : quand toutes les fiches le sont, le bandeau suffit.
  const badgeARelire = visibles.some((f) => f.statut === "validee");
  const cartes = !deuxVolets;
  const carte = cartes ? "md:bloc-info md:blanc-sur-gris md:mx-0 md:w-full md:rounded-2xl md:px-5 md:py-3 md:before:hidden" : undefined;

  return (
    <div className={cn("flex flex-col gap-5", deuxVolets ? "px-5 pt-4 pb-10" : "mx-auto max-w-2xl px-[var(--marge-page)] pb-10 md:max-w-none")} data-harmonie>
      {/* Filtres, en rangées qui défilent (réponse 5 du 05/10), au-dessus du parcours. */}
      {/* Deux volets : les filtres sont posés sur le volet gris ; rail et pilules inactives en `--secondary-fond` (clair). */}
      <div className={cn("space-y-2", deuxVolets && "[&_[data-onglets=pilules]>button[aria-pressed=false]]:bg-secondary-fond dark:[&_[data-onglets=pilules]>button[aria-pressed=false]]:bg-secondary")}>
        <div className="flex flex-wrap items-center gap-1.5">
          {acces.piano && acces.guitare && (
            <OngletsRail
              surGris={deuxVolets}
              etiquette={t("harmonie.instrument.piano")}
              onglets={(["piano", "guitare"] as Instrument[]).map((i) => ({ id: i, label: t(`harmonie.instrument.${i}`) }))}
              actif={instrument}
              choisir={(v) => setInstrument(v as Instrument)}
            />
          )}
        </div>
        <Pilules
          etiquette={t("harmonie.ressenti.titre")}
          options={RESSENTIS.map((x) => ({ cle: x, nom: t(`harmonie.ressenti.${x}`) }))}
          valeur={filtres.ressenti}
          choisir={(ressenti) => setFiltres({ ...filtres, ressenti })}
        />
        <Pilules
          etiquette={t("harmonie.usage.titre")}
          options={USAGES.map((x) => ({ cle: x, nom: t(`harmonie.usage.${x}`) }))}
          valeur={filtres.usage}
          choisir={(usage) => setFiltres({ ...filtres, usage })}
        />
      </div>

      {/* Parcours : dix fiches dans l'ordre, sans suivi ; il s'efface au premier filtre. */}
      {!filtre && parcours.length > 0 && (
        <section data-parcours>
          <button
              type="button"
              aria-expanded={parcoursOuvert}
              onClick={() => setParcoursOuvert((v) => !v)}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-secondary-fond px-3 py-2 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{t("harmonie.parcours")}</span>
                <span className="block text-sm text-muted-foreground">{t("harmonie.parcoursSous", { count: parcours.length })}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-150", parcoursOuvert && "rotate-180")} aria-hidden />
          </button>
          {parcoursOuvert && (<>
          <div className={cn("mt-1.5", cartes && "md:grid md:grid-cols-3 md:gap-3")}>
            {etapes.map((e) => {
              const id = e.fiches.find((x) => parFiche.get(x)?.instrument === instrument) ?? e.fiches[0];
              const fiche = parFiche.get(id);
              if (!fiche) return null;
              const numero = (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold tabular-nums text-foreground">
                  {e.n}
                </span>
              );
              return (
                <GroupRow key={e.n} href={`/harmonie/${fiche.id}`} chevron className={cn(carte, cartes && "md:hover:bg-secondary-fond md:active:bg-secondary-fond md:flex-col md:items-start md:gap-2 md:[&>svg]:hidden")}>
                  <span className="flex items-center gap-3">
                    {numero}
                    <span className="min-w-0">
                      <span className="block truncate font-medium" lang="fr">{fiche.nom}</span>
                      <span className="block truncate text-sm text-muted-foreground" lang={terme(`harmonie.familles.${fiche.famille}`, fiche.familleNom).lang}>{terme(`harmonie.familles.${fiche.famille}`, fiche.familleNom).texte}</span>
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
            className="mt-3 text-base font-medium text-foreground underline underline-offset-4"
            onClick={() => setFiltres(SANS_FILTRE)}
          >
            {t("harmonie.effacerFiltres")}
          </button>
        </div>
      ) : (
        <>
          <p className="-mb-3 text-sm text-muted-foreground">{t("harmonie.duPlusSimple")}</p>
          <div className={cn(cartes && "md:grid md:grid-cols-2 md:gap-3")}>
            {visibles.map((f) => (
              <GroupRow key={f.id} href={`/harmonie/${f.id}`} chevron actif={f.id === ouverte} className={cn(carte, cartes && f.id !== ouverte && "md:hover:bg-secondary-fond md:active:bg-secondary-fond", cartes && "md:items-center")}>
                <span className="flex items-center gap-2">
                  <span className="line-clamp-2 font-medium" lang="fr">{f.nom}</span>
                  {badgeARelire && f.statut !== "validee" && (
                    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-xs", f.id === ouverte ? "bg-background font-medium text-foreground" : "bg-secondary text-muted-foreground")}>
                      {t("harmonie.aRelire")}
                    </span>
                  )}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {[
                    f.ressentis.map((x) => t(`harmonie.ressenti.${x}`)).join(" · "),
                    f.usages.map((x) => t(`harmonie.usage.${x}`)).join(t("harmonie.usage.separateur")),
                    f.niveau[instrument] ? t(`harmonie.niveau.${f.niveau[instrument]}`) : "",
                  ].filter(Boolean).join(" · ")}
                </span>
              </GroupRow>
            ))}
          </div>
        </>
      )}

      <p className="text-sm text-muted-foreground">
        {t("harmonie.aRelireTout")}{" "}
        <Link href="/guide" className="underline underline-offset-4">
          {t("common.header.guide")}
        </Link>
      </p>
    </div>
  );
}
