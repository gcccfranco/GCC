"use client";

// « Comment ça marche ? » en bas des pages principales (lot 8,
// docs/spec-nouveaux-membres.md) : mène à la section du guide, réservé aux
// connectés (le guide l'est aussi).

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/firebase/auth";

export function GuideLien({ section }: { section: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;
  return (
    <p className="pt-2 text-center">
      <Link href={`/guide#${section}`} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        {t("guide.commentCaMarche")}
      </Link>
    </p>
  );
}
