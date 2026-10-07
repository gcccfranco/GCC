"use client";

// Mes tâches (lot 7, docs/spec-taches.md ; lot U6, B3 : « À faire pour moi », les pages des
// pôles au Back-Office). Lot U4 bis, B4 (docs/spec-pages-en-grand.md, Q8 ; planches
// `mes-taches-*`) : la liste vit dans le layout de `/taches` (Q2) ; toucher une tâche ouvre sa
// fiche à lire (`/taches/[pole]/[id]`), plus le formulaire. En grand, la liste à gauche et la
// fiche à droite (sur `/taches`, la première tâche à faire, Q3) ; un volet : la liste, puis la
// fiche en page. Tablette portrait : « À faire pour moi » et « Les tâches des pôles » côte à côte.

import { createContext, useContext, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Group, GroupRow } from "@/components/ui/group";
import { TacheLigne } from "@/components/taches/TacheLigne";
import { FicheTache } from "@/components/taches/FicheTache";
import { texteRetour } from "@/components/taches/retour";
import { useDisposition } from "@/hooks/useDisposition";
import { useProfile } from "@/lib/firebase/users";
import { entreesBackOffice, isAdminUser, polesDe } from "@/lib/access";
import { estSurLaListe } from "@/lib/deuxVolets";
import { aFairePour, lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { useTaches } from "@/lib/taches/useTaches";
import { todayIso } from "@/lib/scene/dimanches";
import { cyclerEtat, type TacheAvecFois } from "@/lib/firebase/taches";
import { prevenirFait } from "@/lib/taches/prevenir";
import { cn } from "@/lib/utils";
import { TACHE_POLES, type TachePole } from "@/types/tache";

type Valeur = {
  /** Les pôles de la personne (un admin : tous). */
  poles: TachePole[];
  items: TacheAvecFois[];
  chargement: boolean;
  /** Sans pôle, relit tout ; avec, seulement ce pôle (après une écriture dans ce pôle). */
  reload: (pole?: TachePole) => Promise<void>;
  aujourdhui: string;
  /** Nom écrit sur une fois commencée ou terminée. */
  parNom: string;
  /** Adresse des fiches : `/taches` (App) ou `/back-office/taches` (agencement v18, B1). */
  racine: string;
  /** Back-Office › Tâches (B1, B2) : la fiche porte « ⋯ », l'historique, et « Modifier » ouvre le
   *  formulaire dans le volet en grand ; dans l'App, la fiche d'aujourd'hui. */
  backOffice: boolean;
};

const Contexte = createContext<Valeur | null>(null);

/** Donne les tâches d'une section à ses pages (`SectionTaches` dans l'App ; le layout de
 *  Back-Office › Tâches, agencement v18, B1). */
export const FournirTaches = Contexte.Provider;

export function useMesTaches(): Valeur {
  const v = useContext(Contexte);
  if (!v) throw new Error("useMesTaches hors de SectionTaches");
  return v;
}

/** Adresse de la fiche d'une ligne ; une tâche répétée dit laquelle de ses fois. */
export function adresseDeLaLigne(l: Ligne, racine = "/taches"): string {
  const base = `${racine}/${l.tache.pole}/${l.tache.id}`;
  return l.tache.repetition ? `${base}?date=${l.date}` : base;
}

export function SectionTaches({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const chemin = usePathname() ?? "/taches";
  const dateVoulue = useSearchParams().get("date");
  const disposition = useDisposition();
  const { user, profile, loading } = useProfile();
  const poles = useMemo(
    () => (isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile)),
    [user, profile],
  );
  const { items, loading: chargement, reload } = useTaches(loading ? [] : poles);
  const [retour, setRetour] = useState("");
  const aujourdhui = todayIso();
  const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user?.email ?? "";
  const lignes = items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui));
  // Dans l'ordre des échéances, tous pôles mêlés.
  const miennes = user ? aFairePour(lignes, user.uid).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const valeur: Valeur = { poles, items, chargement, reload, aujourdhui, parNom, racine: "/taches", backOffice: false };

  // Même cycle que la page d'un pôle : À faire → En cours → Terminé → À faire.
  async function cocher(l: Ligne) {
    if (!user) return;
    setRetour("");
    const etat = await cyclerEtat(l.tache.pole, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom });
    await reload();
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(l.tache.pole, l.tache.id, l.date), l.tache));
    }
  }

  if (loading) return <p className="px-4 pt-6 text-sm text-muted-foreground">{t("common.loading")}</p>;

  // La tâche ouverte : celle de l'adresse, ou en grand la première à faire (Q3).
  const [, , pole, id] = chemin.split("/");
  const premiere = miennes[0];
  const ouverte = id ? { pole, id, date: dateVoulue } : premiere ? { pole: premiere.tache.pole, id: premiere.tache.id, date: premiere.date } : null;
  const estOuverte = (l: Ligne) =>
    disposition === "grand" && !!ouverte && l.tache.pole === ouverte.pole && l.tache.id === ouverte.id
    && (!ouverte.date || !l.tache.repetition || ouverte.date === l.date);

  const versBackOffice = entreesBackOffice(user, profile).includes("taches");
  const liste = (
    <div className={cn("space-y-6", disposition === "grand" ? "px-4 py-4" : "px-[var(--marge-page)] pb-10")}>
      {retour && <p role="status" className="text-sm text-muted-foreground">{retour}</p>}
      {poles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("taches.aucunPole")}</p>
      ) : (
        <div className={cn("space-y-6", disposition === "tablette" && versBackOffice && "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-5 space-y-0")}>
          <Group title={t("taches.aFairePourMoi")} className={cn(disposition !== "grand" && "raised rounded-2xl px-4 pb-1 pt-3")}>
            {miennes.length === 0 ? (
              <GroupRow>{<span className="text-muted-foreground">{t("taches.rienAFaire")}</span>}</GroupRow>
            ) : (
              miennes.map((l) => (
                <TacheLigne
                  key={`${l.tache.pole}-${l.tache.id}-${l.date}`}
                  ligne={l}
                  poleLabel={t(`taches.pole.${l.tache.pole}`)}
                  onToggle={() => cocher(l)}
                  onOpen={() => router.push(adresseDeLaLigne(l))}
                  actif={estOuverte(l)}
                />
              ))
            )}
          </Group>
          {versBackOffice && (
            <Group className={cn(disposition !== "grand" && "raised rounded-2xl px-4 py-1")}>
              <GroupRow href="/back-office/taches" leading={<ListChecks />} trailing={t("backOffice.selecteur.backOffice")} chevron>
                {t("backOffice.tachesDesPoles")}
              </GroupRow>
            </Group>
          )}
        </div>
      )}
    </div>
  );

  // Agencement v18 (R1, R3, tranche Z) : l'en-tête commun « Tâches » au-dessus des deux volets
  // (et de la liste seule) ; en un volet, la fiche est une page qui pose le sien (« ‹ Tâches »).
  const surLaListe = estSurLaListe(chemin, "/taches");
  return (
    <div className="min-h-screen bg-background">
      <Contexte.Provider value={valeur}>
        {(disposition === "grand" || surLaListe) && <EnTetePage titre={t("taches.title")} />}
        <DeuxVolets
          racine="/taches"
          largeurListe={400}
          liste={liste}
          premier={premiere ? <FicheTache pole={premiere.tache.pole} id={premiere.tache.id} date={premiere.date} /> : null}
        >
          {children}
        </DeuxVolets>
      </Contexte.Provider>
    </div>
  );
}
