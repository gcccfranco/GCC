"use client";

// Mes services (lot U4 bis, B4, docs/spec-pages-en-grand.md, Q7 ; planches `mes-services-*`) :
// la section lit tout une fois (plannings, petits déj, setlists, index des chants) et la liste
// vit ici, dans le layout de `/mes-services` (Q2). En grand, la liste à gauche, le service à
// droite (la page `/mes-services/[date]`), ou le premier de la liste sur son adresse (Q3).
// Un volet : la liste, puis le service en page.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Lock, UserPen } from "lucide-react";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useProfile } from "@/lib/firebase/users";
import { getSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { loadPlanningData, type PlanningData } from "@/lib/planning/names";
import { setlistDuService } from "@/lib/planning/accueil";
import { grouperServices, serviceDeLAdresse, cleDuService, type ServiceGroupe } from "@/lib/planning/mesServices";
import { canSeeSetlist } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { lirePetitDej } from "@/lib/petitdej/lignes";
import { servicesDuCompte, servicesPetitDejDuCompte } from "@/lib/petitdej/services";
import type { LignePetitDej } from "@/types/petitDej";
import type { SongIndexEntry } from "@/types/song";
import { ListeMesServices, type Onglet } from "./ListeMesServices";
import { DetailService } from "./DetailService";

type Valeur = {
  /** Tous les services de la personne, dans l'ordre des dates. */
  services: ServiceGroupe[];
  aujourdhui: string;
  planning: PlanningData;
  songs: Record<string, SongIndexEntry>;
  monNom: string;
  /** La setlist liée à un service, si la personne peut l'ouvrir. */
  setlistDe: (s: ServiceGroupe) => FSSetlist | undefined;
};

const Contexte = createContext<Valeur | null>(null);

export function useMesServices(): Valeur {
  const v = useContext(Contexte);
  if (!v) throw new Error("useMesServices hors de SectionMesServices");
  return v;
}

/** Date du jour en heure LOCALE (pas UTC) — sinon le partage à venir / passés est décalé
 *  d'un jour quelques heures autour de minuit. */
function aujourdhuiLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** La date de l'adresse (`/mes-services/2026-10-18`), ou rien sur la liste. */
function dateDeLAdresse(chemin: string): string | undefined {
  return chemin.match(/^\/mes-services\/([^/]+)/)?.[1];
}

export function SectionMesServices({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useProfile();
  const chemin = usePathname() ?? "/mes-services";
  const requete = useSearchParams();
  const deuxVolets = useDeuxVolets();
  const [data, setData] = useState<PlanningData | null>(null);
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [songs, setSongs] = useState<Record<string, SongIndexEntry>>({});
  const [onglet, setOnglet] = useState<Onglet>("upcoming");
  // Petits déj rattachés par le compte (U3, Q9) ; null tant qu'ils ne sont pas lus.
  // Coupé, aucune lecture des inscriptions (Q14).
  const [lignesPetitDej, setLignesPetitDej] = useState<LignePetitDej[] | null>(BACK_OFFICE ? null : []);
  const aujourdhui = useMemo(() => aujourdhuiLocal(), []);

  useEffect(() => {
    loadPlanningData().then(setData);
    // Même lecture que loadPlanningData (cache partagé) ; en échec, aucune ligne.
    if (BACK_OFFICE) lirePetitDej().then(setLignesPetitDej, () => setLignesPetitDej([]));
    fetch("/songs-index.json").then((r) => r.json())
      .then((index: { songs?: SongIndexEntry[] }) => setSongs(Object.fromEntries((index.songs ?? []).map((s) => [s.slug, s]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    getSetlists().then(setSetlists);
    // Vide à la déconnexion / au changement d'utilisateur (pas de setState synchrone).
    return () => setSetlists([]);
  }, [user]);

  const services = useMemo(() => {
    if (!data || !user || !profile) return [];
    return grouperServices(servicesDuCompte(data, lignesPetitDej ?? [], user.uid, profile.planningName ?? ""));
  }, [data, user, profile, lignesPetitDej]);

  const affiches = useMemo(
    () => onglet === "upcoming"
      ? services.filter((e) => e.date >= aujourdhui)
      : services.filter((e) => e.date < aujourdhui).reverse(),
    [services, onglet, aujourdhui],
  );

  const valeur = useMemo<Valeur | null>(() => {
    if (!data || !user) return null;
    const lisibles = setlists.filter((s) => canSeeSetlist(user, profile, s));
    return {
      services,
      aujourdhui,
      planning: data,
      songs,
      monNom: profile?.planningName ?? "",
      setlistDe: (s) => setlistDuService(lisibles, s),
    };
  }, [data, user, profile, setlists, services, aujourdhui, songs]);

  // Un compte sans nom de planning qui a des lignes voit la page avec ses petits déj (U3, question 4).
  const aDesPetitsDej = !!user && !!lignesPetitDej && servicesPetitDejDuCompte(lignesPetitDej, user.uid, "").length > 0;

  if (authLoading || (profile && !profile.planningName && !lignesPetitDej)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("mesServices.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("mesServices.loginPrompt")}</p>
        <Link href={`/login?from=${chemin}`} className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground">
          {t("mesServices.login")}
        </Link>
      </div>
    );
  }

  if (!profile || (!profile.planningName && !aDesPetitsDej)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <UserPen className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          {profile ? t("mesServices.chooseName") : t("mesServices.completeProfile")}
        </p>
        <Link href="/profil" className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground">
          {t("mesServices.myProfile")}
        </Link>
      </div>
    );
  }

  // Le service choisi : celui de l'adresse, ou en grand le premier de la liste (Q3).
  const date = dateDeLAdresse(chemin);
  const nom = profile.planningName || `${profile.firstName} ${profile.lastName}`.trim();
  const aVenir = services.filter((e) => e.date >= aujourdhui).length;
  const choisi = date ? serviceDeLAdresse(services, date, requete.get("service"), requete.get("moment"), requete.get("seance")) : affiches[0];
  const liste = (
    <ListeMesServices
      services={services}
      affiches={affiches}
      charge={!!data}
      onglet={onglet}
      setOnglet={setOnglet}
      aujourdhui={aujourdhui}
      actif={choisi ? cleDuService(choisi) : undefined}
      setlistDe={valeur?.setlistDe}
    />
  );

  // Agencement v18 (A11, R1 à R3) : l'en-tête au-dessus des deux volets, partout où la liste
  // paraît ; en un volet, un service en page n'a que son retour « ‹ Mes services » (R8).
  const avecEnTete = deuxVolets || !date;

  return (
    <div className="min-h-screen bg-background">
      {avecEnTete && (
        <EnTetePage
          titre={t("mesServices.title")}
          // Une ligne : la phrase se coupe par « … », jamais « n à venir » qui la suit (A11).
          sousTitre={
            <span className="flex min-w-0">
              <span className="truncate">{t("mesServices.subtitle", { name: nom })}</span>
              {aVenir > 0 && <span className="shrink-0 whitespace-pre">{` · ${t("mesServices.upcomingCount", { count: aVenir })}`}</span>}
            </span>
          }
        />
      )}
      <Contexte.Provider value={valeur}>
        <DeuxVolets
          racine="/mes-services"
          largeurListe={400}
          liste={liste}
          premier={valeur && affiches[0] ? <DetailService s={affiches[0]} /> : null}
        >
          {valeur ? children : null}
        </DeuxVolets>
      </Contexte.Provider>
    </div>
  );
}
