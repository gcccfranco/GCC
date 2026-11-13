"use client";

// Garde de l'espace Back-Office (lot U6, B1) : « Réservé aux responsables » pour les autres,
// comme l'ancienne page d'administration. Affichage seulement : chaque sous-partie garde
// sa règle dans firestore.rules.
// Piste A (BO4) : un simple membre d'équipe n'a plus de Back-Office, il reçoit cette garde ;
// ses équipes viennent à lui dans l'app (BO-D).
// G2 : un connecté qui suit le lien d'une réunion (cloche, notification, rappel) sans pouvoir
// ouvrir les réunions du Back-Office est mené à sa fiche de l'App.
// BO4, BO7 : un connecté sans entrée de Back-Office qui suit le lien d'une équipe ou de ses tâches
// (`/back-office/equipes/<id>`, `/back-office/taches/<id>`) est mené à la page de l'équipe de l'App.
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { droitsDesPages, entreesBackOffice } from "@/lib/access";
import { Squelette } from "@/components/layout/Squelette";

export function EspaceBackOffice({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || "/back-office";
  const { user, profile, loading } = useProfile();
  const entrees = entreesBackOffice(user, profile);
  const reunionId = !loading && user && !droitsDesPages(user, profile).reunions
    ? /^\/back-office\/reunions\/([\w-]+)\/?$/.exec(pathname)?.[1] : undefined;
  const equipe = !loading && user && entrees.length === 0
    ? /^\/back-office\/(equipes|taches)\/([\w-]+)(?:\/([\w-]+))?\/?$/.exec(pathname) : null;
  // La fiche d'une tâche a sa page dans l'App (`/taches/<équipe>/<id>`) ; le reste mène à l'équipe.
  const tacheId = equipe?.[1] === "taches" && equipe[3] && equipe[3] !== "nouvelle" ? equipe[3] : null;
  const versEquipe = equipe && equipe[2] !== "personnes"
    ? tacheId ? `/taches/${equipe[2]}/${tacheId}${typeof window === "undefined" ? "" : window.location.search}` : `/equipes/${equipe[2]}`
    : null;
  const versApp = reunionId && reunionId !== "nouvelle" ? `/evenements/${reunionId}` : versEquipe;
  useEffect(() => { if (versApp) router.replace(versApp); }, [versApp, router]);

  if (loading) {
    return <Squelette />;
  }
  if (versApp) return null;
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
  // `relative` : le contenu se peint au-dessus du halo fixe (globals.css, `.halo`) ; sans lui, le
  // bleu gris du Back-Office (agencement v18, R12) voilait le titre et les premières cartes.
  return <div className="relative">{children}</div>;
}
