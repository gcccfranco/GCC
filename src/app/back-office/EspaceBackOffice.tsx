"use client";

// Garde de l'espace Back-Office (lot U6, B1) : « Réservé aux responsables » pour les autres,
// comme l'ancienne page d'administration. Affichage seulement : chaque sous-partie garde
// sa règle dans firestore.rules.
// Retouches v18, lot G (G3, D29) : un membre d'équipe sans autre rôle entre, pour la seule
// entrée Réunions (et « Plus », la page de la barre du bas) ; toute autre adresse y ramène.
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { entreesBackOffice, estResponsable } from "@/lib/access";

export function EspaceBackOffice({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || "/back-office";
  const { user, profile, loading } = useProfile();
  const entrees = entreesBackOffice(user, profile);
  const horsReunions = !loading && entrees.length > 0 && !estResponsable(user, profile)
    && !/^\/back-office\/(reunions|plus)(\/|$)/.test(pathname);
  useEffect(() => { if (horsReunions) router.replace("/back-office/reunions"); }, [horsReunions, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }
  if (entrees.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("backOffice.reserve")}</p>
        {!user && (
          <Link
            href={`/login?from=${encodeURIComponent(pathname.replace(/\/$/, "") || "/back-office")}`}
            className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground"
          >
            {t("backOffice.seConnecter")}
          </Link>
        )}
      </div>
    );
  }
  if (horsReunions) return null;
  // `relative` : le contenu se peint au-dessus du halo fixe (globals.css, `.halo`) ; sans lui, le
  // bleu gris du Back-Office (agencement v18, R12) voilait le titre et les premières cartes.
  return <div className="relative">{children}</div>;
}
