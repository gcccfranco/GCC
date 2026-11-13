"use client";

// Garde d'accès des pages réservées aux membres : redirige les visiteurs
// non connectés vers /login (avec retour vers la page demandée).

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/firebase/auth";
import { Squelette } from "@/components/layout/Squelette";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading) {
    return <Squelette />;
  }
  if (!user) return null;
  return <>{children}</>;
}
