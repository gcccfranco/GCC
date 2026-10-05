"use client";

// Sélecteur « App · Back-Office » (lot U6, docs/spec-back-office.md, Q6) : réservé aux
// responsables (`estResponsable`), le même pour tous, posé dans les places de U4 — barre
// latérale dépliée (sous le label), barre du haut (après le label sur tablette en portrait,
// à sa place sur téléphone, question 5). Deux liens, l'espace courant marqué ; chacun rouvre
// la dernière page vue dans son espace pendant la session, sinon le tableau de bord, ou
// `/planning` côté App (cible du logo).
import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { estResponsable } from "@/lib/access";
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

/** Vrai pour un responsable, interrupteur du back-office ouvert. */
export function useResponsable(): boolean {
  const { user, profile } = useProfile();
  return BACK_OFFICE && estResponsable(user, profile);
}

export function SelecteurEspace({ pleineLargeur = false, onChoix }: { pleineLargeur?: boolean; onChoix?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname() || "";
  const responsable = useResponsable();
  const espace = espaceDe(pathname);
  const cibles: Record<Espace, string> = {
    app: useSyncExternalStore(suivre, () => derniere("app"), () => PAR_DEFAUT.app),
    "back-office": useSyncExternalStore(suivre, () => derniere("back-office"), () => PAR_DEFAUT["back-office"]),
  };

  // Retenir la page courante pour son espace.
  useEffect(() => {
    if (responsable) retenir(espace, (pathname.replace(/\/$/, "") || "/") + window.location.search);
  }, [responsable, pathname, espace]);

  if (!responsable) return null;

  const lien = (e: Espace, libelle: string) => {
    const courant = e === espace;
    return (
      <Link
        href={cibles[e]}
        aria-current={courant ? "true" : undefined}
        onClick={onChoix}
        className={`flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-[background-color,color] duration-150 ${
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
