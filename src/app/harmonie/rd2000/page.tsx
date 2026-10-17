"use client";

// Sons du RD-2000 (docs/spec-sons-rd2000.md, tranches S1, S2, S4) : le
// catalogue du clavier de l'église, pour les pianistes. Trois vues — par moment
// du culte (défaut), tous les sons (recherche, filtres), paramètres — et le mode
// d'emploi en pied. Rien n'est joué.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import { Pilules } from "@/components/harmonie/Pilules";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { etoiles, pourChercher, useRd2000, type Rd2000, type Son } from "@/lib/harmonie/rd2000";

type Vue = "moment" | "sons" | "parametres" | "legende";

/** Un son, touchable vers sa page : le N° à taper d'abord, en gros. */
function LigneSon({ son, prefixe }: { son: Son; prefixe?: string }) {
  const { t } = useTranslation();
  return (
    <GroupRow href={`/harmonie/rd2000/${son.n}`} chevron>
      <span className="flex items-baseline gap-2.5">
        {prefixe && <span className="text-muted-foreground">{prefixe}</span>}
        <span className="shrink-0 text-[17px] font-semibold tabular-nums" data-son={son.n}>{son.n}</span>
        <span className="min-w-0 truncate font-medium">{son.nom}</span>
        {son.premier && <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-foreground">{t("harmonie.rd2000.premierChoix")}</span>}
        <span className="ml-auto shrink-0 text-[13px] text-muted-foreground" aria-label={`${son.louange} / 3`}>{etoiles(son.louange)}</span>
      </span>
      {son.commentaire && <span className="block truncate text-[13px] text-muted-foreground">{son.commentaire}</span>}
    </GroupRow>
  );
}

function ParMoment({ donnees, parN }: { donnees: Rd2000; parN: Map<string, Son> }) {
  const { t } = useTranslation();
  const groupes = useMemo(() => {
    const out = new Map<string, Rd2000["moments"]>();
    for (const m of donnees.moments) out.set(m.groupe, [...(out.get(m.groupe) ?? []), m]);
    return [...out.entries()];
  }, [donnees]);
  return (
    <div className="space-y-6" data-vue="moment">
      {groupes.map(([groupe, moments]) => (
        <Group key={groupe} title={groupe}>
          {moments.map((m) => {
            const son = parN.get(m.son);
            const layer = m.layer ? parN.get(m.layer) : undefined;
            return (
              <div key={m.moment} className="border-t border-border py-2 first:border-t-0" data-moment={m.moment}>
                <p className="text-[15px] font-semibold">{m.moment}</p>
                {son && <LigneSon son={son} />}
                {layer && <LigneSon son={layer} prefixe="+" />}
                {m.conseil && <p className="text-[13px] text-muted-foreground">{m.conseil}</p>}
              </div>
            );
          })}
        </Group>
      ))}
      <Group title={t("harmonie.rd2000.regle")}>
        <p className="text-[15px] leading-relaxed" data-regle>{donnees.regleMoments}</p>
      </Group>
    </div>
  );
}

const FILTRES = ["3", "2", "1", "0"] as const;

function TousLesSons({ donnees }: { donnees: Rd2000 }) {
  const { t } = useTranslation();
  const [recherche, setRecherche] = useState("");
  const [louange, setLouange] = useState<(typeof FILTRES)[number]>("3");
  const [categorie, setCategorie] = useState<string | null>(null);
  const categories = useMemo(() => [...new Set(donnees.sons.map((s) => s.categorie))], [donnees]);

  // La recherche porte toujours sur les 1 155 sons, filtres ignorés.
  const q = pourChercher(recherche);
  const visibles = q
    ? donnees.sons.filter((s) => pourChercher(`${s.n}${s.nom}`).includes(q))
    : donnees.sons.filter((s) => s.louange >= Number(louange) && (!categorie || s.categorie === categorie));
  const parCategorie = categories
    .map((c) => [c, visibles.filter((s) => s.categorie === c).sort((a, b) => b.louange - a.louange)] as const)
    .filter(([, liste]) => liste.length > 0);

  return (
    <div className="space-y-4" data-vue="sons">
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder={t("harmonie.rd2000.chercher")}
        aria-label={t("harmonie.rd2000.chercher")}
        className="h-11 w-full rounded-xl bg-card px-4 text-[17px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
      />
      {!q && (
        <div className="space-y-2">
          <Pilules
            etiquette={t("harmonie.rd2000.filtre")}
            options={FILTRES.map((f) => ({ cle: f, nom: t(`harmonie.rd2000.filtres.${f}`) }))}
            valeur={louange}
            choisir={(v) => setLouange(v ?? "3")}
            obligatoire
          />
          <Pilules
            etiquette={t("harmonie.rd2000.categorie")}
            options={categories.map((c) => ({ cle: c, nom: c }))}
            valeur={categorie}
            choisir={setCategorie}
          />
        </div>
      )}
      {parCategorie.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground" role="status">{t("harmonie.rd2000.aucun")}</p>
      ) : (
        parCategorie.map(([c, liste]) => (
          <Group key={c} title={`${c} · ${liste.length}`}>
            {liste.map((s) => <LigneSon key={s.n} son={s} />)}
          </Group>
        ))
      )}
    </div>
  );
}

function Parametres({ donnees }: { donnees: Rd2000 }) {
  const { t } = useTranslation();
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

function ModeDEmploi({ donnees }: { donnees: Rd2000 }) {
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

function Rd2000Client() {
  const { t, i18n } = useTranslation();
  const acces = useAccesHarmonie();
  const { donnees, chargement } = useRd2000();
  const [vue, setVue] = useState<Vue>("moment");
  const parN = useMemo(() => new Map((donnees?.sons ?? []).map((s) => [s.n, s])), [donnees]);

  if (acces.chargement || chargement) return null;
  if (!acces.piano) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }
  if (!donnees) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-10 space-y-6" data-rd2000>
      <Link href="/harmonie" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("harmonie.retour")}
      </Link>
      <div>
        <PageTitle title={t("harmonie.rd2000.titre")} />
        <p className="mt-1 text-[15px] text-muted-foreground">{t("harmonie.rd2000.sousTitre")}</p>
        {i18n.language.startsWith("zh") && <p className="mt-1 text-[13px] text-muted-foreground">{t("harmonie.rd2000.contenuFr")}</p>}
      </div>

      <Pilules
        etiquette={t("harmonie.rd2000.titre")}
        options={(["moment", "sons", "parametres"] as const).map((v) => ({ cle: v, nom: t(`harmonie.rd2000.vues.${v}`) }))}
        valeur={vue === "legende" ? null : vue}
        choisir={(v) => setVue(v ?? "moment")}
        obligatoire
      />

      {vue === "moment" && <ParMoment donnees={donnees} parN={parN} />}
      {vue === "sons" && <TousLesSons donnees={donnees} />}
      {vue === "parametres" && <Parametres donnees={donnees} />}
      {vue === "legende" && <ModeDEmploi donnees={donnees} />}

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

export default function Rd2000Page() {
  return (
    <RequireAuth>
      <Rd2000Client />
    </RequireAuth>
  );
}
