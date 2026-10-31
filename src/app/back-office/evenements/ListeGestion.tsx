"use client";

// Listes du Back-Office (lot U6, B3) : « Évènements », ceux qu'on gère (organisateur,
// coordination), réunions à part ; « Réunions » (entrée à part depuis l'agencement v18, B15),
// celles de ses équipes, Louange élargi (toutes pour un admin). Lignes compactes du calendrier, vers la fiche de gestion.
// Agencement v18 (B3, B4, docs/spec-agencement-v18.md ; planches `v18-bo-evenements-a`, `v18-bo-reunions`) :
// la liste vit dans le layout de l'entrée (`VoletsGestion`), sous l'en-tête commun, et reste montée
// d'une fiche à l'autre ; en grand, à droite, la fiche de l'adresse ou, sur la liste, la prochaine (R11).
// Évènements : infos épinglées, puis les mois, « Évènements passés (n) » repliés ; Réunions : « À venir »
// puis « Passées ». L'action « Nouvel évènement » / « Nouvelle réunion » est dans l'en-tête (R7).
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { User } from "firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { canEditEvenement, creatableEvenementPours, estDeLaReunion, estReunion, publicDeReunion } from "@/lib/access";
import { EVENEMENTS_CHANGED, listEvenements } from "@/lib/firebase/evenements";
import { baseBackOffice } from "@/lib/navigation";
import { byDate, groupByMonth, isInfo, isPast } from "@/lib/evenements/agenda";
import { todayIso } from "@/lib/scene/dimanches";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import type { Evenement } from "@/types/evenement";
import type { UserProfile } from "@/types/user";
import { EvenementCard } from "@/app/evenements/EvenementCard";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { cn } from "@/lib/utils";
import { Squelette } from "@/components/layout/Squelette";

/** Qui peut créer dans l'entrée : une réunion (Réunions : une équipe dont on est référent) ou un
 *  évènement (Évènements : tout public ouvert, une équipe comprise). Décision 43 (lot 1 du chantier
 *  « équipes et groupes », EQ21) : les référents créent les évènements d'équipe qui ne sont pas des
 *  réunions ; le choix V18POLE (docs/spec-retouches-v18.md) est levé. Même règle pour
 *  `droits.evenement` du Calendrier. */
export function peutCreerDans(user: User | null, profile: UserProfile | null, reunions: boolean): boolean {
  const pours = creatableEvenementPours(user, profile, ANNONCE_SECTIONS);
  return reunions ? pours.some(publicDeReunion) : pours.length > 0;
}

type Gestion = { chargement: boolean; aVenir: Evenement[]; passes: Evenement[] };

/** Les évènements (ou les réunions) de la personne, à venir (infos comprises) et passés ; relus
 *  à chaque création, modification ou suppression (`EVENEMENTS_CHANGED`). */
function useGestion(reunions: boolean): Gestion {
  const { user, profile, loading } = useProfile();
  const [evenements, setEvenements] = useState<Evenement[] | null>(null);

  useEffect(() => {
    if (!user) return;
    // Les relectures se croisent : seule la dernière demandée s'affiche. Un échec (hors ligne)
    // garde la liste déjà là plutôt que de la vider.
    let derniere = 0;
    let vivant = true;
    const lire = () => {
      const n = ++derniere;
      const aJour = () => vivant && n === derniere;
      listEvenements(false)
        .then((l) => { if (aJour()) setEvenements(l); })
        .catch(() => { if (aJour()) setEvenements((l) => l ?? []); });
    };
    lire();
    window.addEventListener(EVENEMENTS_CHANGED, lire);
    return () => { vivant = false; window.removeEventListener(EVENEMENTS_CHANGED, lire); };
  }, [user]);

  return useMemo(() => {
    const miens = (evenements ?? []).filter((e) =>
      reunions ? estReunion(e) && estDeLaReunion(user, profile, e) : !estReunion(e) && canEditEvenement(user, profile, e));
    const today = todayIso();
    return {
      chargement: loading || evenements === null,
      aVenir: miens.filter((e) => isInfo(e) || !isPast(e, today)).sort(byDate),
      passes: miens.filter((e) => !isInfo(e) && isPast(e, today)).sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [evenements, reunions, user, profile, loading]);
}

/**
 * L'entrée Évènements ou Réunions sous son en-tête, pour une fiche, « nouveau » ou « modifier » : en grand,
 * la liste en carte à gauche et la page à droite ; en un volet, la page seule, qui pose alors son propre
 * en-tête (« ‹ Évènements »). BO16 (f) : les listes seules redirigent vers le Calendrier (BO-C) et ne
 * passent plus par ici, d'où ni fiche ouverte d'office ni état vide à droite.
 */
export function VoletsGestion({ reunions, enTete, children }: { reunions: boolean; enTete: React.ReactNode; children: React.ReactNode }) {
  const chemin = usePathname() ?? "";
  const deuxVolets = useDeuxVolets();
  const racine = reunions ? "/back-office/reunions" : "/back-office/evenements";
  const gestion = useGestion(reunions);
  const segment = decodeURIComponent(chemin.replace(/\/+$/, "").split("/")[3] ?? "");
  const idActif = segment === "nouveau" || segment === "nouvelle" ? undefined : segment;

  return (
    <div className="pb-16">
      {deuxVolets && enTete}
      <DeuxVolets
        racine={racine}
        largeurListe={reunions ? 360 : 380}
        liste={<ListeGestion reunions={reunions} gestion={gestion} idActif={deuxVolets ? idActif : undefined} />}
      >
        {children}
      </DeuxVolets>
    </div>
  );
}

function ListeGestion({ reunions, gestion, idActif }: { reunions: boolean; gestion: Gestion; idActif?: string }) {
  const { t, i18n } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const [passesVus, setPassesVus] = useState(false);
  const { chargement, aVenir, passes } = gestion;
  const cadre = cn("space-y-5", deuxVolets ? "px-3 py-4" : "px-[var(--marge-page)]");

  if (chargement) return <Squelette enTete={false} className={cadre} />;

  const ligne = (e: Evenement, passe = false) => (
    <EvenementCard key={e.id} evenement={e} past={passe} actif={e.id === idActif} href={`${baseBackOffice(e)}/${e.id}`} />
  );
  const titre = (texte: string) => <h2 className="px-1 text-sm font-semibold text-muted-foreground first-letter:uppercase">{texte}</h2>;

  if (reunions) {
    return (
      <div className={cadre}>
        {aVenir.length === 0 && passes.length === 0 && <p className="px-1 text-sm text-muted-foreground">{t("backOffice.aucuneReunion")}</p>}
        {aVenir.length > 0 && <section className="space-y-1">{titre(t("backOffice.aVenir"))}{aVenir.map((e) => ligne(e))}</section>}
        {passes.length > 0 && <section className="space-y-1">{titre(t("backOffice.passees"))}{passes.map((e) => ligne(e, true))}</section>}
      </div>
    );
  }

  const infos = aVenir.filter(isInfo);
  const mois = groupByMonth(aVenir, i18n.language);
  return (
    <div className={cadre}>
      {aVenir.length === 0 && <p className="px-1 text-sm text-muted-foreground">{t("backOffice.aucunEvenement")}</p>}
      {infos.length > 0 && <section className="space-y-1" aria-label={t("evenements.infos")}>{infos.map((e) => ligne(e))}</section>}
      {mois.map((g) => <section key={g.key} className="space-y-1">{titre(g.label)}{g.evenements.map((e) => ligne(e))}</section>)}
      {passes.length > 0 && (
        <section className="space-y-1 border-t border-border/70 pt-3">
          <button type="button" className="px-1 text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={() => setPassesVus(!passesVus)}>
            {passesVus ? t("evenements.hidePast") : t("evenements.past")} ({passes.length})
          </button>
          {passesVus && passes.map((e) => ligne(e, true))}
        </section>
      )}
    </div>
  );
}
