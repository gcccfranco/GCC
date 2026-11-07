"use client";

// Sélecteur « App · Musiciens · Back-Office » (EM-2 : le segment Musiciens, pour qui joue d'un instrument ; lot U6, docs/spec-back-office.md, Q6) : réservé à qui a le
// Back-Office (`entreesBackOffice` : les responsables seuls depuis la piste A, BO4), le même pour
// tous, posé dans les places de U4 — barre latérale dépliée (sous le label), barre du haut
// (après le label sur tablette en portrait, à sa place sur téléphone, question 5). Deux liens,
// l'espace courant marqué ; chacun rouvre la dernière page vue dans son espace pendant la
// session, sinon À faire (`/back-office`), ou `/planning` côté App (cible du logo).
import { Fragment, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Drum, House, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { useProfile } from "@/lib/firebase/users";
import { entreesBackOffice } from "@/lib/access";
import { poserFormeRetenue, useFormeRetenue } from "@/lib/marqueConnecte";
import type { Entree } from "@/types/backOffice";
import { BACK_OFFICE } from "@/lib/backOffice";
import { TOUCHER_SEGMENT } from "@/lib/toucher44";
import { entreesMusiciens, espaceAffiche, type Espace, type EntreeMusiciens } from "@/lib/navigation";

const PAR_DEFAUT: Record<Espace, string> = { app: "/planning", musiciens: "/accords", "back-office": "/back-office" };
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
type FormeAffichee = { responsable: boolean; messages: boolean; entrees: Entree[]; musiciens: EntreeMusiciens[]; retenue: boolean };

/** Lot CH, C6 : pendant l'attente (Firebase ou profil en cours) d'un membre à marque « connecté », la forme
 *  retenue la dernière fois ; sinon (ou sans forme retenue) celle que donnent les droits. Affichage seulement :
 *  aucun droit ne passe par là. */
export function useFormeAffichee(): FormeAffichee {
  const { probablementConnecte } = useAuth();
  const { user, profile, loading } = useProfile();
  const acces = useAccesHarmonie();
  const retenue = useFormeRetenue();
  // EM-2 : tant que les plannings (qui disent l'instrument) ne sont pas lus, la forme retenue vaut aussi pour `musiciens`.
  if (((loading && probablementConnecte) || (acces.chargement && probablementConnecte)) && retenue) {
    return {
      responsable: retenue.responsable, messages: retenue.messages, entrees: retenue.entreesBackOffice,
      musiciens: retenue.musiciens, retenue: true,
    };
  }
  const entrees = entreesBackOffice(user, profile);
  return {
    responsable: BACK_OFFICE && entrees.length > 0, messages: entrees.includes("messages"), entrees,
    musiciens: entreesMusiciens(acces), retenue: false,
  };
}

/** Retient la forme calculée dès que le profil est là et qu'elle change (monté une fois, dans la barre du haut). */
export function useRetenirForme() {
  const { user, profile, loading } = useProfile();
  const acces = useAccesHarmonie();
  useEffect(() => {
    if (loading || !user || !profile || acces.chargement) return;
    const entrees = entreesBackOffice(user, profile);
    poserFormeRetenue({
      responsable: BACK_OFFICE && entrees.length > 0, messages: entrees.includes("messages"), entreesBackOffice: entrees,
      musiciens: entreesMusiciens(acces),
    });
  }, [loading, user, profile, acces]);
}


export function SelecteurEspace({ pleineLargeur = false, compact = false, onChoix }: { pleineLargeur?: boolean; compact?: boolean; onChoix?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname() || "";
  // Vrai pour qui a le Back-Office (un responsable, BO4) ou joue d'un instrument (EM-2) ; pendant l'attente, la forme retenue (C6).
  const { responsable, musiciens } = useFormeAffichee();
  const musicien = musiciens.length > 0;
  const espace = espaceAffiche(pathname, { musicien });
  const cibles: Record<Espace, string> = {
    app: useDernierePage("app"), musiciens: useDernierePage("musiciens"), "back-office": useDernierePage("back-office"),
  };
  // Segments selon les droits, dans l'ordre App · Musiciens · Back-Office.
  const segments: Espace[] = ["app", ...(musicien ? (["musiciens"] as const) : []), ...(responsable ? (["back-office"] as const) : [])];
  const affiche = responsable || musicien;
  const libelles: Record<Espace, string> = {
    app: t("backOffice.selecteur.app"), musiciens: t("backOffice.selecteur.musiciens"), "back-office": t("backOffice.selecteur.backOffice"),
  };

  // Retenir la page courante pour son espace — pas la page de connexion, qu'on quitte aussitôt
  // (sinon « App » et « Revenir à l'app » y ramèneraient après s'être connecté).
  useEffect(() => {
    if (affiche && !pathname.startsWith("/login")) retenir(espace, (pathname.replace(/\/$/, "") || "/") + window.location.search);
  }, [affiche, pathname, espace]);

  if (!affiche) return null;

  const icones: Record<Espace, typeof House> = { app: House, musiciens: Drum, "back-office": ShieldCheck };

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
          e === espace ? "bg-pose text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icone className="h-[18px] w-[18px]" aria-hidden />
      </Link>
    );
    // Le filet de 1 px sépare les espaces des pages (dimanche-20) ; comme le groupe, le CSS ne le montre que réduit.
    return (
      <>
        <div
          role="group"
          aria-label={t("backOffice.selecteur.aria")}
          data-testid="selecteur-icones"
          className="barre-si-reduite w-11 shrink-0 flex-col items-center gap-2 rounded-full bg-secondary p-1"
        >
          {segments.map((e) => icone(e, libelles[e], icones[e]))}
        </div>
        <div aria-hidden data-testid="filet-espaces" className="barre-si-reduite h-px w-8 shrink-0 bg-border" />
      </>
    );
  }

  // Au toucher, une icône de 36 px n'a que 36 px de large (TOUCHER_SEGMENT suit le segment) : la zone s'étend de 8 px vers
  // l'extérieur du groupe pour le premier et le dernier segment (rien à recouvrir), de 4 px de chaque côté au milieu (44 px).
  // Les segments se touchent (pas d'écart) : seul le premier et le dernier débordent, vers l'extérieur ; celui du milieu
  // garde sa largeur, sinon sa zone mordait de 4 px sur ses voisins (fin de lot CD, back-office-espace:330).
  const ZONE_ICONE =
    "max-sm:[@media(pointer:coarse)]:first:after:left-[-8px] max-sm:[@media(pointer:coarse)]:first:after:right-0 " +
    "max-sm:[@media(pointer:coarse)]:last:after:right-[-8px] max-sm:[@media(pointer:coarse)]:last:after:left-0";

  const lien = (e: Espace, libelle: string) => {
    const courant = e === espace;
    const Icone = icones[e];
    // Barre latérale (`pleineLargeur`) : segments qui se partagent les 220 px utiles, 30 px dessinés (chants-1).
    // Barre du haut : au téléphone (< 640 px) l'espace courant garde icône et libellé, les autres une icône de 36 px
    // (back-office-1) ; sous 375 px le courant lui aussi n'est plus qu'une icône de 36 px (la pastille le marque) ; au-delà rien ne change. Le nom reste en `aria-label` et `title`.
    const forme = pleineLargeur
      ? "h-[30px] min-w-0 flex-auto px-2 text-xs tracking-[-0.01em]"
      : `py-1.5 text-sm ${ZONE_ICONE} ${courant ? "px-3.5 max-sm:h-9 max-sm:px-2.5 max-[374px]:w-9 max-[374px]:px-0" : "px-3.5 max-sm:h-9 max-sm:w-9 max-sm:px-0"}`;
    return (
      <Link
        href={cibles[e]}
        aria-current={courant ? "true" : undefined}
        aria-label={libelle}
        title={libelle}
        onClick={onChoix}
        className={`${TOUCHER_SEGMENT} flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-[background-color,color] duration-150 ${forme} ${
          courant ? "bg-pose text-foreground shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {!pleineLargeur && <Icone className="h-[18px] w-[18px] shrink-0 sm:hidden" aria-hidden />}
        <span className={pleineLargeur ? "truncate" : courant ? "max-[374px]:hidden" : "max-sm:hidden"}>{libelle}</span>
      </Link>
    );
  };

  return (
    <div
      role="group"
      aria-label={t("backOffice.selecteur.aria")}
      className={`${pleineLargeur ? "flex w-full min-w-0" : "inline-flex shrink-0"} rounded-full bg-secondary rail-sur-gris p-[3px]`}
    >
      {segments.map((e) => <Fragment key={e}>{lien(e, libelles[e])}</Fragment>)}
    </div>
  );
}
