"use client";

// Garde de l'espace Back-Office (lot U6, B1) : « Réservé aux responsables » pour les autres,
// comme l'ancienne page d'administration. Affichage seulement : chaque sous-partie garde
// sa règle dans firestore.rules.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { estResponsable } from "@/lib/access";

export function EspaceBackOffice({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname() || "/back-office";
  const { user, profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }
  if (!estResponsable(user, profile)) {
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
  return <>{children}</>;
}
