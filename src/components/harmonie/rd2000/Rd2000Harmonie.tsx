"use client";

// Sons du RD-2000 (docs/spec-sons-rd2000.md, tranches S1, S2, S4) : le catalogue du clavier
// de l'église, pour les pianistes. Trois vues — par moment du culte (défaut), tous les sons
// (recherche, filtres), paramètres — et le mode d'emploi en pied. Rien n'est joué.
//
// Lot U4 bis, B3 (Q6, planches `harmonie-rd2000-*`) : la liste vit dans le layout de
// `/harmonie/rd2000` (`DeuxVolets`), le son est la page de l'adresse. En grand, « Par moment »
// à gauche et le son à droite ; sans son choisi, le premier de la vue telle qu'elle est
// filtrée (Q3). Tablette debout : un moment par carte, deux par rangée. Vue, recherche et
// filtres restent d'un son à l'autre : ils vivent ici.

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { OngletsRail } from "@/components/layout/Onglets";
import { Group, GroupRow } from "@/components/ui/group";
import { Pilules } from "@/components/harmonie/Pilules";
import { SonRd2000 } from "@/components/harmonie/rd2000/SonRd2000";
import { ContexteRd2000, useRd2000Charge } from "@/components/harmonie/rd2000/contexte";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { etoiles, pourChercher, useRd2000, type Rd2000, type Son } from "@/lib/harmonie/rd2000";
import { cn } from "@/lib/utils";

type Vue = "moment" | "sons" | "parametres" | "legende";

const FILTRES = ["3", "2", "1", "0"] as const;
type FiltresSons = { recherche: string; louange: (typeof FILTRES)[number]; categorie: string | null };

/** « Tous les sons » : par catégorie, les mieux notés d'abord. La recherche porte toujours
 *  sur les 1 155 sons, filtres ignorés. */
function sonsParCategorie(donnees: Rd2000, f: FiltresSons): (readonly [string, Son[]])[] {
  const q = pourChercher(f.recherche);
  const categories = [...new Set(donnees.sons.map((s) => s.categorie))];
  const visibles = q
    ? donnees.sons.filter((s) => pourChercher(`${s.n}${s.nom}`).includes(q))
    : donnees.sons.filter((s) => s.louange >= Number(f.louange) && (!f.categorie || s.categorie === f.categorie));
  return categories
    .map((c) => [c, visibles.filter((s) => s.categorie === c).sort((a, b) => b.louange - a.louange)] as const)
    .filter(([, liste]) => liste.length > 0);
}

/** Le son de l'adresse (`/harmonie/rd2000/S01`), ou rien sur la liste. */
function sonDeLAdresse(chemin: string): string | undefined {
  const m = chemin.match(/^\/harmonie\/rd2000\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function Rd2000Harmonie({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  const { donnees, chargement } = useRd2000();
  const [vue, setVue] = useState<Vue>("moment");
  const [filtres, setFiltres] = useState<FiltresSons>({ recherche: "", louange: "3", categorie: null });
  const parN = useMemo(() => new Map((donnees?.sons ?? []).map((s) => [s.n, s])), [donnees]);
  const parCategorie = useMemo(() => (donnees ? sonsParCategorie(donnees, filtres) : []), [donnees, filtres]);
  const valeur = useMemo(() => (donnees ? { donnees, parN } : null), [donnees, parN]);

  if (acces.chargement || chargement) return null;
  if (!acces.piano) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }
  if (!donnees || !valeur) return null;

  const premier = vue === "sons" ? parCategorie[0]?.[1][0]?.n : donnees.moments[0]?.son;

  return (
    <ContexteRd2000.Provider value={valeur}>
      <DeuxVolets
        racine="/harmonie/rd2000"
        largeurListe={420}
        liste={<ListeRd2000 vue={vue} setVue={setVue} filtres={filtres} setFiltres={setFiltres} parCategorie={parCategorie} premier={premier} />}
        premier={premier ? <SonRd2000 n={premier} /> : null}
      >
        {children}
      </DeuxVolets>
    </ContexteRd2000.Provider>
  );
}

/** Un son, touchable vers sa page : le N° à taper d'abord, en gros. */
function LigneSon({ son, prefixe, actif }: { son: Son; prefixe?: string; actif?: boolean }) {
  const { t } = useTranslation();
  return (
    <GroupRow href={`/harmonie/rd2000/${son.n}`} chevron actif={actif}>
      <span className="flex items-baseline gap-2.5">
        {prefixe && <span className="text-muted-foreground">{prefixe}</span>}
        <span className="shrink-0 text-[17px] font-semibold tabular-nums" data-son={son.n}>{son.n}</span>
        <span className="min-w-0 truncate font-medium">{son.nom}</span>
        {son.premier && (
          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium", actif ? "bg-background text-foreground" : "bg-secondary text-foreground")}>
            {t("harmonie.rd2000.premierChoix")}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[13px] text-muted-foreground" aria-label={`${son.louange} / 3`}>{etoiles(son.louange)}</span>
      </span>
      {son.commentaire && <span className="block truncate text-[13px] text-muted-foreground">{son.commentaire}</span>}
    </GroupRow>
  );
}

function ParMoment({ ouvert, cartes }: { ouvert?: string; cartes: boolean }) {
  const { t } = useTranslation();
  const { donnees, parN } = useRd2000Charge();
  const groupes = useMemo(() => {
    const out = new Map<string, Rd2000["moments"]>();
    for (const m of donnees.moments) out.set(m.groupe, [...(out.get(m.groupe) ?? []), m]);
    return [...out.entries()];
  }, [donnees]);
  return (
    <div className="space-y-6" data-vue="moment">
      {groupes.map(([groupe, moments]) => (
        <section key={groupe}>
          <h2 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{groupe}</h2>
          <div className={cn(cartes && "md:grid md:grid-cols-2 md:gap-4")}>
            {moments.map((m) => {
              const son = parN.get(m.son);
              const layer = m.layer ? parN.get(m.layer) : undefined;
              return (
                <div
                  key={m.moment}
                  className={cn("border-t border-border py-2 first:border-t-0", cartes && "md:raised md:rounded-2xl md:border-t-0 md:px-4 md:py-3")}
                  data-moment={m.moment}
                >
                  <p className="text-[15px] font-semibold">{m.moment}</p>
                  {son && <LigneSon son={son} actif={son.n === ouvert} />}
                  {layer && <LigneSon son={layer} prefixe="+" actif={layer.n === ouvert} />}
                  {m.conseil && <p className="text-[13px] text-muted-foreground">{m.conseil}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <Group title={t("harmonie.rd2000.regle")}>
        <p className="text-[15px] leading-relaxed" data-regle>{donnees.regleMoments}</p>
      </Group>
    </div>
  );
}

function TousLesSons({ filtres, setFiltres, parCategorie, ouvert }: {
  filtres: FiltresSons;
  setFiltres: (f: FiltresSons) => void;
  parCategorie: (readonly [string, Son[]])[];
  ouvert?: string;
}) {
  const { t } = useTranslation();
  const { donnees } = useRd2000Charge();
  const categories = useMemo(() => [...new Set(donnees.sons.map((s) => s.categorie))], [donnees]);
  const q = pourChercher(filtres.recherche);

  return (
    <div className="space-y-4" data-vue="sons">
      <input
        type="search"
        value={filtres.recherche}
        onChange={(e) => setFiltres({ ...filtres, recherche: e.target.value })}
        placeholder={t("harmonie.rd2000.chercher")}
        aria-label={t("harmonie.rd2000.chercher")}
        className="h-11 w-full rounded-xl bg-card px-4 text-[17px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
      />
      {!q && (
        <div className="space-y-2">
          <Pilules
            etiquette={t("harmonie.rd2000.filtre")}
            options={FILTRES.map((f) => ({ cle: f, nom: t(`harmonie.rd2000.filtres.${f}`) }))}
            valeur={filtres.louange}
            choisir={(v) => setFiltres({ ...filtres, louange: v ?? "3" })}
            obligatoire
          />
          <Pilules
            etiquette={t("harmonie.rd2000.categorie")}
            options={categories.map((c) => ({ cle: c, nom: c }))}
            valeur={filtres.categorie}
            choisir={(categorie) => setFiltres({ ...filtres, categorie })}
          />
        </div>
      )}
      {parCategorie.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground" role="status">{t("harmonie.rd2000.aucun")}</p>
      ) : (
        parCategorie.map(([c, liste]) => (
          <Group key={c} title={`${c} · ${liste.length}`}>
            {liste.map((s) => <LigneSon key={s.n} son={s} actif={s.n === ouvert} />)}
          </Group>
        ))
      )}
    </div>
  );
}

function Parametres() {
  const { t } = useTranslation();
  const { donnees } = useRd2000Charge();
  const parties = useMemo(() => {
    const out = new Map<string, Map<string, Rd2000["parametres"]>>();
    for (const p of donnees.parametres) {
      const groupes = out.get(p.partie) ?? new Map<string, Rd2000["parametres"]>();
      groupes.set(p.groupe, [...(groupes.get(p.groupe) ?? []), p]);
      out.set(p.partie, groupes);
    }
    return [...out.entries()];
  }, [donnees]);
  return (
    <div className="space-y-8" data-vue="parametres">
      {parties.map(([partie, groupes]) => (
        <section key={partie} className="space-y-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{partie}</h2>
          {[...groupes.entries()].map(([groupe, liste]) => (
            <Group key={groupe} title={groupe}>
              {liste.map((p) => (
                <div key={p.nom} className="border-t border-border py-2.5 first:border-t-0" data-parametre>
                  <p className="flex items-baseline gap-2">
                    <span className="font-semibold">{p.nom}</span>
                    <span className="text-[13px] text-muted-foreground">{p.plage}</span>
                    <span className="ml-auto shrink-0 text-[13px] text-muted-foreground" aria-label={`${t("harmonie.rd2000.priorite")} ${p.priorite} / 3`}>
                      {etoiles(p.priorite)}
                    </span>
                  </p>
                  <p className="text-[15px]">{p.effet}</p>
                  {p.conseil && <p className="text-[13px] text-muted-foreground">{t("harmonie.rd2000.conseil", { valeur: p.conseil })}</p>}
                </div>
              ))}
            </Group>
          ))}
        </section>
      ))}
    </div>
  );
}

function ModeDEmploi() {
  const { donnees } = useRd2000Charge();
  // Les lignes qui ne parlent que du tableur (« les 5 onglets »…) restent dans le classeur.
  const sections = useMemo(() => {
    const out = new Map<string, Rd2000["legende"]>();
    for (const l of donnees.legende.filter((x) => !x.tableur)) out.set(l.section, [...(out.get(l.section) ?? []), l]);
    return [...out.entries()];
  }, [donnees]);
  return (
    <div className="space-y-6" data-vue="legende">
      {sections.map(([section, lignes]) => (
        <Group key={section} title={section}>
          {lignes.map((l, i) => (
            <p key={i} className="border-t border-border py-2 text-[15px] first:border-t-0">
              <span className="font-semibold">{l.element}</span> — {l.texte}
            </p>
          ))}
        </Group>
      ))}
    </div>
  );
}

function ListeRd2000({ vue, setVue, filtres, setFiltres, parCategorie, premier }: {
  vue: Vue;
  setVue: (v: Vue) => void;
  filtres: FiltresSons;
  setFiltres: (f: FiltresSons) => void;
  parCategorie: (readonly [string, Son[]])[];
  premier?: string;
}) {
  const { t } = useTranslation();
  const deuxVolets = useDeuxVolets();
  // En grand, le son montré à droite s'allume : celui de l'adresse, ou le premier (Q3).
  const ouvert = sonDeLAdresse(usePathname() ?? "/harmonie/rd2000") ?? (deuxVolets ? premier : undefined);
  const cartes = !deuxVolets;

  return (
    <div className={cn("space-y-6", deuxVolets ? "px-5 pt-4 pb-10" : "mx-auto max-w-2xl px-4 pb-10 md:max-w-none md:px-6")} data-rd2000>
      <OngletsRail
        etiquette={t("harmonie.rd2000.titre")}
        onglets={(["moment", "sons", "parametres"] as const).map((v) => ({ id: v, label: t(`harmonie.rd2000.vues.${v}`) }))}
        actif={vue}
        choisir={(v) => setVue(v as Vue)}
      />

      {vue === "moment" && <ParMoment ouvert={ouvert} cartes={cartes} />}
      {vue === "sons" && <TousLesSons filtres={filtres} setFiltres={setFiltres} parCategorie={parCategorie} ouvert={ouvert} />}
      {vue === "parametres" && <Parametres />}
      {vue === "legende" && <ModeDEmploi />}

      <p className="text-[13px] text-muted-foreground">
        <button type="button" onClick={() => setVue("legende")} className="underline underline-offset-4">
          {t("harmonie.rd2000.modeEmploi")}
        </button>
        {" · "}
        {t("harmonie.rd2000.contenuFr")}
      </p>
    </div>
  );
}
