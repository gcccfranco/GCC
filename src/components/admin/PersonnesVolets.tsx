"use client";

// Back-Office › Équipes › Personnes (agencement v18, B9 de docs/spec-agencement-v18.md ; planche
// `v18-bo-equipes-personnes`). En-tête commun : « Équipes », le compte des inscrits, le rail, et
// dans sa rangée la carte des inscriptions (version courte de `InscriptionsComptes`). En grand,
// deux volets (`DeuxVolets`) : la liste (recherche, filtres en pilules, tri) et la personne
// choisie, lue dans l'adresse (`?uid=`, remplacée sans entrée d'historique) ; la première de la
// liste d'office. « Modifier » montre le formulaire d'aujourd'hui dans le volet. Un volet
// (tablette debout, téléphone) : la liste, la personne se déplie sur place, comme avant.
// Anciens blocs d'administration : en français seulement (Q16 de U6).
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { useDisposition } from "@/hooks/useDisposition";
import { isAdminUser } from "@/lib/access";
import { majPoles } from "@/lib/firebase/equipes";
import { polesDesEquipes } from "@/lib/equipes/organigramme";
import { findMyServices, type PlanningData } from "@/lib/planning/names";
import { GRILLES } from "@/lib/planning/grilles";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { todayIso } from "@/lib/scene/dimanches";
import { SERVICE_ROLE_LABELS, type UserProfile } from "@/types/user";
import type { Equipe } from "@/types/equipe";
import { RailEquipes } from "@/app/back-office/equipes/RailEquipes";
import { InscriptionsComptes } from "./InscriptionsComptes";
import {
  Avatar, FiltresPersonnes, FormulairePersonne, LignePersonne, ListePersonnes, PolesDuMembre, isRecent,
  useDonneesPersonnes, useFiltresPersonnes,
} from "./Personnes";

const RACINE = "/back-office/equipes/personnes";
const nom = (p: UserProfile) => `${p.firstName} ${p.lastName}`.trim() || p.email;

export function PersonnesVolets() {
  const { t } = useTranslation();
  const d = useDonneesPersonnes();
  const f = useFiltresPersonnes(d.profiles);
  const grand = useDisposition() === "grand";
  const router = useRouter();
  const uid = useSearchParams().get("uid");
  const [modif, setModif] = useState(false);

  const choisi = d.profiles.find((p) => p.uid === uid) ?? f.displayed[0] ?? null;
  const choisir = (u: string | null) => {
    setModif(false);
    router.replace(u ? `${RACINE}?uid=${encodeURIComponent(u)}` : RACINE, { scroll: false });
  };
  const maj = (u: UserProfile) => d.setProfiles((prev) => prev.map((x) => (x.uid === u.uid ? u : x)));
  const voirNouveaux = () => {
    f.setQuery("");
    f.setFilter("Tous");
    f.setSort("recent");
    choisir(d.profiles.filter((p) => isRecent(p.createdAt)).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0]?.uid ?? null);
  };

  const { stats } = d;
  const entete = (
    <EnTetePage
      titre={t("backOffice.entrees.equipes")}
      sousTitre={d.loadingProfiles ? undefined : [
        t("equipes.compte.inscrits", { count: d.profiles.length }),
        t("equipes.compte.musiciens", { count: stats.musiciens }),
        t("equipes.compte.presidences", { count: stats.presidences }),
      ].join(" · ")}
      onglets={<RailEquipes />}
      apres={<InscriptionsComptes court nouveaux={stats.nouveaux} onVoir={voirNouveaux} />}
    />
  );

  if (!grand)
    return (
      <>
        {entete}
        <div className="px-[var(--marge-page)] pb-10">
          <div className="raised rounded-2xl p-3 space-y-3 sm:p-4">
            <FiltresPersonnes f={f} />
            {/* Un volet : la personne de l'adresse se déplie sur place. */}
            <ListePersonnes d={d} f={f} deplie={uid} setDeplie={choisir} />
          </div>
        </div>
      </>
    );

  // Dans la colonne de 400 px, les filtres se replient sur plusieurs lignes (planche) au lieu de
  // défiler en largeur comme la rangée de `Pilules` le fait ailleurs.
  const liste = (
    <div className="p-3 space-y-3 [&_[data-onglets=pilules]]:mx-0 [&_[data-onglets=pilules]]:flex-wrap [&_[data-onglets=pilules]]:overflow-visible [&_[data-onglets=pilules]]:px-0">
      <FiltresPersonnes f={f} />
      {d.loadingProfiles ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : f.displayed.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {d.profiles.length === 0 ? "Aucun profil pour l'instant." : "Aucun membre ne correspond."}
        </p>
      ) : (
        <div className="space-y-0.5">
          {f.displayed.map((p) => {
            const actif = choisi?.uid === p.uid;
            return (
              <div key={p.uid} className={`rounded-xl transition-colors ${actif ? "bg-secondary" : "hover:bg-secondary/60"}`}>
                <LignePersonne
                  p={p}
                  compact
                  actif={actif}
                  onClick={() => choisir(p.uid)}
                  fin={<ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const droite = !choisi ? (
    <p className="py-10 text-sm text-muted-foreground">
      {d.loadingProfiles ? "Chargement…" : "Aucun profil pour l'instant."}
    </p>
  ) : modif ? (
    <div className="max-w-[760px] space-y-4">
      <div className="flex items-center gap-4">
        <Avatar p={choisi} grand />
        <h2 className="text-[24px] font-bold leading-tight tracking-tight text-foreground">{nom(choisi)}</h2>
      </div>
      <div className="raised rounded-2xl p-5">
        <FormulairePersonne
          key={choisi.uid}
          p={choisi}
          equipes={d.equipes}
          planningData={d.planningData}
          planningNames={d.planningNames}
          onAnnule={() => setModif(false)}
          onEnregistre={(u) => { maj(u); setModif(false); }}
          onPoles={(poles) => maj({ ...choisi, poles })}
        />
      </div>
    </div>
  ) : (
    <FicheDuMembre
      p={choisi}
      equipes={d.equipes}
      planning={d.planningData}
      // La personne passe dans l'adresse dès « Modifier » : sans `?uid=`, la choisie est la
      // première de la liste filtrée, et chercher ou trier remonterait le formulaire sur une autre.
      onModifier={() => { choisir(choisi.uid); setModif(true); }}
      onPoles={(poles) => maj({ ...choisi, poles })}
    />
  );

  return (
    <>
      {entete}
      <DeuxVolets racine={RACINE} liste={liste} premier={droite} largeurListe={400}>
        {null}
      </DeuxVolets>
    </>
  );
}

/** Une carte de la fiche : titre, puis ses lignes. */
function Carte({ titre, note, children, className }: { titre: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`raised rounded-2xl px-5 py-4 ${className ?? ""}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-bold text-foreground">{titre}</h3>
        {note && <span className="text-[12px] text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** La personne choisie : services et rôles, pôles, droits, prochains services. */
function FicheDuMembre({
  p, equipes, planning, onModifier, onPoles,
}: {
  p: UserProfile;
  equipes: Equipe[];
  planning: PlanningData | null;
  onModifier: () => void;
  onPoles: (poles: UserProfile["poles"]) => void;
}) {
  const aujourdhui = todayIso();
  const services = planning && p.planningName
    ? findMyServices(planning, p.planningName).filter((s) => s.date >= aujourdhui).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
    : [];
  const plannings = (p.plannings ?? []).map((k) => GRILLES.find((g) => g.key === k)?.label ?? k);
  const ligne = "flex items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0";

  return (
    <article className="space-y-4">
      <header className="flex items-center gap-4">
        <Avatar p={p} grand />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[24px] font-bold leading-tight tracking-tight text-foreground">{nom(p)}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {p.email}
            {p.createdAt ? ` · inscrit le ${p.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onModifier}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-background px-4 text-[14px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Modifier
        </button>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        <Carte titre="Services et rôles">
          {Object.keys(p.serviceRoles).length === 0 ? (
            <p className="text-sm text-muted-foreground">Ne sert pas.</p>
          ) : (
            Object.entries(p.serviceRoles).map(([cat, roles]) => (
              <div key={cat} className={ligne}>
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: categoryColor(cat) }} />
                  {categoryLabel(cat)}
                </span>
                <span className="text-muted-foreground">{roles.map((r) => SERVICE_ROLE_LABELS[r]).join(" · ") || "—"}</span>
              </div>
            ))
          )}
        </Carte>
        <div className="space-y-4">
          <Carte titre="Pôles" note="donnés par l'organigramme">
            <PolesDuMembre profile={p} equipes={equipes} onDecoche={async () => { await majPoles([p.uid]); onPoles(polesDesEquipes(p.uid, equipes)); }} />
          </Carte>
          <Carte titre="Droits">
            <div className={ligne}>
              <span className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" aria-hidden />Admin</span>
              <span className="text-foreground">{isAdminUser(p) ? "Oui" : "Non"}</span>
            </div>
            <div className={ligne}>
              <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" aria-hidden />Écrit dans</span>
              <span className="text-right text-foreground">{plannings.length ? plannings.join(", ") : "—"}</span>
            </div>
            <div className={ligne}>
              <span className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4" aria-hidden />Nom au planning</span>
              <span className="text-foreground">{p.planningName || "—"}</span>
            </div>
          </Carte>
        </div>
      </div>

      <Carte titre="Ses prochains services" note={<Link href="/planning" className="font-semibold text-foreground underline underline-offset-2">Planning</Link>}>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {planning ? "Aucun service à venir dans les plannings." : "Chargement…"}
          </p>
        ) : (
          services.map((s, i) => {
            const date = new Date(`${s.date}T12:00:00`);
            return (
              <div key={`${s.date}-${s.service}-${s.role}-${i}`} className={ligne}>
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-secondary leading-none">
                    <span className="text-[15px] font-bold text-foreground">{date.getDate()}</span>
                    <span className="text-[10px] text-muted-foreground">{date.toLocaleDateString("fr-FR", { month: "short" })}</span>
                  </span>
                  <span className="font-semibold text-foreground">{s.service}</span>
                </span>
                <span className="text-muted-foreground">{s.role}</span>
              </div>
            );
          })
        )}
      </Carte>
    </article>
  );
}
