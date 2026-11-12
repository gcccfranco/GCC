"use client";

// H5-2 : « Ici : 4 → 2m7 » sous « Ensuite » — l'idée du passage de l'accord touché qui le contient dans son « avant ».
// Un appui ferme le panneau et ouvre la porte 2 au bloc de ce passage.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useOuvrirAccord, type HarmonieDuPanneau } from "./AccordsProvider";
import { getIdees, getRejets, suggestionsEcartees, type Idee, type Rejet } from "@/lib/firebase/harmonie";
import { apercuDuChangement } from "@/lib/harmonie/suggestions";
import { harmonieDuChant } from "@/lib/harmonie/passages";
import { chiffreDuDegre, chiffrerEtiquette, degreDeLAccord } from "@/lib/harmonie/degres";
import { useAccesHarmonie, useCatalogue } from "@/lib/harmonie/useHarmonie";
import { idDeSection } from "@/lib/setlist/sectionOrigins";
import { compter } from "@/lib/usage";
import { semitonesTo, transposeChord } from "@/lib/transpose";
import { useNotationDuCompte } from "@/components/song/NotationAccordsProvider";

// Un appel par chant : le panneau se rouvre à chaque accord touché. Vidé si l'appel échoue.
const cache = new Map<string, Promise<[Rejet[], Idee[]]>>();
function donneesDuChant(slug: string) {
  let p = cache.get(slug);
  if (!p) {
    p = Promise.all([getRejets(slug), getIdees(slug)]);
    cache.set(slug, p);
    p.catch(() => cache.delete(slug));
  }
  return p;
}

const chiffre = (accord: string, tonalite: string) => {
  const d = degreDeLAccord(accord, tonalite);
  return d ? chiffreDuDegre(d) : "";
};
const chiffres = (accords: string[], tonalite: string) => accords.map((a) => chiffre(a, tonalite)).filter(Boolean).join(" ");

// Les lettres d'une suite, de la tonalité `de` à la tonalité affichée ; comme `chiffres`, sans ce qui n'est pas un accord.
const lettres = (accords: string[], de: string, vers: string) =>
  accords.filter((a) => chiffre(a, de)).map((a) => (de === vers ? a : transposeChord(a, semitonesTo(de, vers), vers))).join(" ");

export function LigneIci({ accord, harmonie, slug, bulle }: { accord: string; harmonie: HarmonieDuPanneau; slug?: string; bulle: boolean }) {
  const { t } = useTranslation();
  const notation = useNotationDuCompte();
  const { peut } = useAccesHarmonie();
  const { fiches } = useCatalogue();
  const { fermerSansFocus } = useOuvrirAccord();
  const [donnees, setDonnees] = useState<{ rejets: Rejet[]; idees: Idee[] } | null>(null);
  const { ici, sectionUids } = harmonie;

  useEffect(() => {
    if (!peut || !slug) return;
    let vivant = true;
    donneesDuChant(slug)
      .then(([rejets, idees]) => vivant && setDonnees({ rejets, idees }))
      .catch(() => { /* rien à montrer */ });
    return () => { vivant = false; };
  }, [peut, slug]);

  const ligne = useMemo(() => {
    if (!peut || !donnees || !ici || !sectionUids) return null;
    const { passages } = harmonieDuChant(ici.sections, ici.tonalite, fiches, suggestionsEcartees(donnees.rejets), donnees.idees);
    const passage = passages.find((p) => sectionUids.includes(p.uid)) ?? passages.find((p) => sectionUids.some((u) => idDeSection(u) === idDeSection(p.uid)));
    const touche = chiffre(accord, harmonie.tonalite);
    if (!passage || !touche) return null;
    for (const s of passage.idees) {
      const endroit = s.endroits.find((e) => e.sectionUid === passage.uid && e.accords.some((a) => chiffre(a, ici.tonalite) === touche));
      const apercu = endroit && apercuDuChangement(s, ici.tonalite, endroit);
      if (apercu) return { passage, avant: chiffres(endroit.accords, ici.tonalite), apres: chiffres(apercu.apresListe, ici.tonalite), avantL: lettres(endroit.accords, ici.tonalite, harmonie.tonalite), apresL: lettres(apercu.apresListe, ici.tonalite, harmonie.tonalite), nom: s.fiche.nom, fr: true, idee: s.id };
    }
    for (const idee of passage.ideesEquipe) {
      if (!idee.avant || !idee.apres) continue;
      const origine = ici.tonaliteOrigine ?? ici.tonalite;
      const avant = idee.avant.split(/\s*[–-]\s*|\s+/).filter(Boolean);
      const apres = idee.apres.split(/\s*[–-]\s*|\s+/).filter(Boolean);
      if (!avant.some((a) => chiffre(a, origine) === touche)) continue;
      const fiche = fiches.find((f) => f.id === idee.ficheId);
      return {
        passage, avant: chiffres(avant, origine), apres: chiffres(apres, origine),
        avantL: lettres(avant, origine, harmonie.tonalite), apresL: lettres(apres, origine, harmonie.tonalite),
        nom: fiche?.nom ?? idee.texte, fr: !!fiche, idee: idee.id,
      };
    }
    return null;
  }, [peut, donnees, ici, sectionUids, fiches, accord, harmonie.tonalite]);

  if (!ligne || !ici) return null;
  // Comme la grille et les partitions : le chiffre de l'étiquette entière (« 2m7 », pas seulement « 2m »).
  const enChiffres = (l: string) => l.split(" ").map((a) => chiffrerEtiquette(a, harmonie.tonalite)).join(" ");
  return (
    <button
      type="button"
      data-ici=""
      onClick={() => {
        compter("cmd.chant.ici");
        fermerSansFocus();
        ici.ouvrir(ligne.passage.uid, ligne.idee);
      }}
      className={`mt-1 flex w-full items-center gap-1 rounded-lg text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${bulle ? "min-h-8" : "min-h-11"}`}
    >
      <span className="min-w-0 flex-1">
        <span>
          {t("accords.ici")}{" "}
          <span className="font-chord font-semibold text-[color:var(--chord-color)]">{notation === "chiffres" ? `${enChiffres(ligne.avantL)} → ${enChiffres(ligne.apresL)}` : `${ligne.avantL} → ${ligne.apresL}`}</span>
        </span>
        <span {...(ligne.fr ? { lang: "fr" } : {})} className={`block text-xs text-muted-foreground ${ligne.fr ? "" : "line-clamp-1"}`}>{ligne.nom}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}
