"use client";

// Sélecteur « App · Back-Office » (lot U6, docs/spec-back-office.md, Q6) : réservé à qui a le
// Back-Office (`entreesBackOffice` : les responsables seuls depuis la piste A, BO4), le même pour
// tous, posé dans les places de U4 — barre latérale dépliée (sous le label), barre du haut
// (après le label sur tablette en portrait, à sa place sur téléphone, question 5). Deux liens,
// l'espace courant marqué ; chacun rouvre la dernière page vue dans son espace pendant la
// session, sinon À faire (`/back-office`), ou `/planning` côté App (cible du logo).
import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { House, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { entreesBackOffice } from "@/lib/access";
import { poserFormeRetenue, useFormeRetenue } from "@/lib/marqueConnecte";
import type { Entree } from "@/types/backOffice";
import { BACK_OFFICE } from "@/lib/backOffice";
import { espaceDe, type Espace } from "@/lib/navigation";

const PAR_DEFAUT: Record<Espace, string> = { app: "/planning", "back-office": "/back-office" };
const cle = (espace: Espace) => `gcc-derniere-page-${espace}`;

/** Mémoire de session : une absence (navigation privée, stockage bloqué) = la page par défaut. */
function derniere(espace: Espace): string {
  try {
    return sessionStorage.getItem(cle(espace)) || PAR_DEFAUT[espace];
  } catch {
    return PAR_DEFAUT[espace];
  }
}
// Les sélecteurs montés ensemble (barre du haut, barre latérale) relisent la mémoire à chaque page retenue.
const abonnes = new Set<() => void>();
function suivre(changement: () => void) {
  abonnes.add(changement);
  return () => abonnes.delete(changement);
}
function retenir(espace: Espace, chemin: string) {
  try {
    sessionStorage.setItem(cle(espace), chemin);
  } catch {
    /* stockage indisponible : les cibles restent par défaut */
  }
  abonnes.forEach((f) => f());
}

/** La page que rouvre le lien d'un espace : la dernière vue pendant la session, sinon celle
 *  par défaut (l'onglet « App » de la barre du bas du Back-Office, BO2, la suit aussi). */
export function useDernierePage(espace: Espace): string {
  return useSyncExternalStore(suivre, () => derniere(espace), () => PAR_DEFAUT[espace]);
}

/** La forme que dessinent le sélecteur, l'icône Messages et les entrées du Back-Office (barres comprises). */
type FormeAffichee = { responsable: boolean; messages: boolean; entrees: Entree[]; retenue: boolean };

/** Lot CH, C6 : pendant l'attente (Firebase ou profil en cours) d'un membre à marque « connecté », la forme
 *  retenue la dernière fois ; sinon (ou sans forme retenue) celle que donnent les droits. Affichage seulement :
 *  aucun droit ne passe par là. */
export function useFormeAffichee(): FormeAffichee {
  const { probablementConnecte } = useAuth();
  const { user, profile, loading } = useProfile();
  const retenue = useFormeRetenue();
  if (loading && probablementConnecte && retenue) {
    return { responsable: retenue.responsable, messages: retenue.messages, entrees: retenue.entreesBackOffice, retenue: true };
  }
  const entrees = entreesBackOffice(user, profile);
  return { responsable: BACK_OFFICE && entrees.length > 0, messages: entrees.includes("messages"), entrees, retenue: false };
}

/** Retient la forme calculée dès que le profil est là et qu'elle change (monté une fois, dans la barre du haut). */
export function useRetenirForme() {
  const { user, profile, loading } = useProfile();
  useEffect(() => {
    if (loading || !user || !profile) return;
    const entrees = entreesBackOffice(user, profile);
    poserFormeRetenue({ responsable: BACK_OFFICE && entrees.length > 0, messages: entrees.includes("messages"), entreesBackOffice: entrees });
  }, [loading, user, profile]);
}

/** Vrai pour qui a le Back-Office (un responsable ; un simple membre d'équipe n'en a plus, BO4),
 *  interrupteur du back-office ouvert. Pendant l'attente, la forme retenue (C6). */
function useResponsable(): boolean {
  return useFormeAffichee().responsable;
}

export function SelecteurEspace({ pleineLargeur = false, compact = false, onChoix }: { pleineLargeur?: boolean; compact?: boolean; onChoix?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname() || "";
  const responsable = useResponsable();
  const espace = espaceDe(pathname);
  const cibles: Record<Espace, string> = { app: useDernierePage("app"), "back-office": useDernierePage("back-office") };

  // Retenir la page courante pour son espace — pas la page de connexion, qu'on quitte aussitôt
  // (sinon « App » et « Revenir à l'app » y ramèneraient après s'être connecté).
  useEffect(() => {
    if (responsable && !pathname.startsWith("/login")) retenir(espace, (pathname.replace(/\/$/, "") || "/") + window.location.search);
  }, [responsable, pathname, espace]);

  if (!responsable) return null;

  // BO-G, 10 : barre latérale réduite (ordinateur replié, tablette en paysage) : deux icônes, le nom en `aria-label` et
  // en infobulle. Le CSS ne la montre que dans la barre réduite (`barre-si-reduite`) ; le dessin tient dans 44 px de large,
  // la cible de toucher à 44 px par un `::after`.
  if (compact) {
    const icone = (e: Espace, libelle: string, Icone: typeof House) => (
      <Link
        key={e}
        href={cibles[e]}
        aria-label={libelle}
        title={libelle}
        aria-current={e === espace ? "true" : undefined}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] transition-[background-color,color] duration-150 ${
          e === espace ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icone className="h-[18px] w-[18px]" aria-hidden />
      </Link>
    );
    return (
      <div
        role="group"
        aria-label={t("backOffice.selecteur.aria")}
        data-testid="selecteur-icones"
        className="barre-si-reduite w-11 shrink-0 flex-col items-center gap-2 rounded-full bg-secondary p-1"
      >
        {icone("app", t("backOffice.selecteur.app"), House)}
        {icone("back-office", t("backOffice.selecteur.backOffice"), ShieldCheck)}
      </div>
    );
  }

  const lien = (e: Espace, libelle: string) => {
    const courant = e === espace;
    return (
      <Link
        href={cibles[e]}
        aria-current={courant ? "true" : undefined}
        onClick={onChoix}
        className={`relative flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] text-[13px] font-semibold transition-[background-color,color] duration-150 ${
          pleineLargeur ? "flex-1" : ""
        } ${courant ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        {libelle}
      </Link>
    );
  };

  return (
    <div
      role="group"
      aria-label={t("backOffice.selecteur.aria")}
      className={`${pleineLargeur ? "flex" : "inline-flex"} shrink-0 rounded-full bg-secondary p-[3px]`}
    >
      {lien("app", t("backOffice.selecteur.app"))}
      {lien("back-office", t("backOffice.selecteur.backOffice"))}
    </div>
  );
}
