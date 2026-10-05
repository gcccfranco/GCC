"use client";

// Menu « Compte » (sorti de la Navbar au lot U4) : le même derrière l'initiale de la
// barre du haut et derrière celle du pied de la barre latérale. Le déclencheur est
// fourni par la barre (`children`, rendu tel quel par Radix).
import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LogOut, UserRound, BookOpen, MessageSquareHeart, TriangleAlert, Megaphone, ShieldCheck, Network, Sparkles } from "lucide-react";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { ReportDialog } from "@/components/report/ReportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Nom affiché d'un membre : prénom et nom, sinon l'adresse. */
export function useNomDuMembre() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user?.email || "";
  const initial = (profile?.firstName || user?.email || "?").trim().charAt(0).toUpperCase();
  return { displayName, initial, planningName: profile?.planningName ?? "" };
}

export function MenuCompte({
  children,
  side = "bottom",
  align = "end",
  sideOffset,
}: {
  /** Le bouton qui ouvre le menu (nommé « Compte »). */
  children: React.ReactNode;
  side?: "bottom" | "right" | "top";
  align?: "start" | "end";
  /** Écart entre le bouton et le menu (barre latérale : jusqu'à son bord). */
  sideOffset?: number;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { displayName, planningName } = useNomDuMembre();
  const [reportOpen, setReportOpen] = useState(false);
  const admin = isAdminUser(user);
  const canNotify = admin || (profile?.notify?.length ?? 0) > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent side={side} align={align} sideOffset={sideOffset} className="w-64">
          <DropdownMenuLabel>
            <div className="font-semibold truncate">{displayName}</div>
            {planningName && (
              <div className="text-xs font-normal text-muted-foreground truncate">{planningName}</div>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profil"><UserRound aria-hidden />{t("common.header.profile")}</Link>
          </DropdownMenuItem>
          {BACK_OFFICE && (
            <DropdownMenuItem asChild>
              <Link href="/equipes"><Network aria-hidden />{t("equipes.title")}</Link>
            </DropdownMenuItem>
          )}
          <HarmonieMenuItem label={t("harmonie.titre")} />
          <DropdownMenuItem asChild>
            <Link href="/guide"><BookOpen aria-hidden />{t("common.header.guide")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/questionnaire"><MessageSquareHeart aria-hidden />{t("survey.title")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <TriangleAlert aria-hidden />{t("common.report")}
          </DropdownMenuItem>
          {(canNotify || admin) && <DropdownMenuSeparator />}
          {canNotify && (
            <DropdownMenuItem asChild>
              <Link href="/notifier"><Megaphone aria-hidden />{t("common.header.notify")}</Link>
            </DropdownMenuItem>
          )}
          {admin && (
            <DropdownMenuItem asChild>
              <Link href="/admin"><ShieldCheck aria-hidden />{t("common.header.admin")}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logOut()} className="text-destructive focus:text-destructive">
            <LogOut aria-hidden />{t("common.header.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Hors de la barre : une barre transformée (navbar) ou masquée serait le repère
          du dialogue fixe, qui s'afficherait dans sa bande ou pas du tout. */}
      {reportOpen && createPortal(<ReportDialog open onClose={() => setReportOpen(false)} kind="site" />, document.body)}
    </>
  );
}

/** Entrée « Harmonie » du menu du compte. Rendue seulement une fois le menu ouvert,
 *  donc l'accès (qui lit les plannings pour trouver l'instrument) n'est calculé qu'à
 *  ce moment-là, jamais à chaque page. */
function HarmonieMenuItem({ label }: { label: string }) {
  const acces = useAccesHarmonie();
  if (acces.chargement || !acces.peut) return null;
  return (
    <DropdownMenuItem asChild>
      <Link href="/harmonie"><Sparkles aria-hidden />{label}</Link>
    </DropdownMenuItem>
  );
}
