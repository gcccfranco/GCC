"use client";

// « Moi » (décision Q9 du 15/09/2026) : la porte de tout ce qui me concerne
// sur téléphone et tablette. Rien de nouveau : des liens vers les pages qui
// existaient dans le menu et la navbar, plus les réglages de langue et de thème.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { BookOpen, CalendarDays, Globe, ListChecks, LogOut, Megaphone, MessageSquareHeart, Moon, Network, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import { ReportDialog } from "@/components/report/ReportDialog";
import { useSetLanguage } from "@/lib/I18nProvider";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser, polesDe } from "@/lib/access";
import { useTaches } from "@/lib/taches/useTaches";
import { aFairePour, lignesDeTache } from "@/lib/taches/echeances";
import { todayIso } from "@/lib/scene/dimanches";
import { TACHE_POLES } from "@/types/tache";

const TOGGLE = "rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.96] cursor-pointer";

function MoiClient() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();
  const setLanguage = useSetLanguage();
  const [reportOpen, setReportOpen] = useState(false);

  const isZh = i18n.language === "zh-CN";
  const dark = resolvedTheme === "dark";
  const admin = isAdminUser(user);
  const canNotify = admin || (profile?.notify?.length ?? 0) > 0;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  // « Mes tâches » (lot 7) : seulement pour les membres d'un pôle et les admins.
  const poles = useMemo(() => (admin ? [...TACHE_POLES] : polesDe(profile)), [admin, profile]);
  const { items } = useTaches(poles);
  const today = todayIso();
  const mesTaches = user
    ? aFairePour(items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today)), user.uid).length
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">
      <PageTitle title={t("moi.title")} subtitle={name || user?.email} />

      <Group>
        <GroupRow href="/mes-services" leading={<CalendarDays />} chevron>{t("common.header.myServices")}</GroupRow>
        <GroupRow href="/equipes" leading={<Network />} chevron>{t("equipes.title")}</GroupRow>
        {poles.length > 0 && (
          <GroupRow href="/taches" leading={<ListChecks />} trailing={mesTaches > 0 ? String(mesTaches) : undefined} chevron>
            {t("taches.mesTaches")}
          </GroupRow>
        )}
        <GroupRow href="/profil" leading={<UserRound />} chevron>{t("common.header.profile")}</GroupRow>
      </Group>

      <Group>
        <GroupRow href="/guide" leading={<BookOpen />} chevron>{t("common.header.guide")}</GroupRow>
        <GroupRow href="/questionnaire" leading={<MessageSquareHeart />} chevron>{t("survey.title")}</GroupRow>
        <GroupRow onClick={() => setReportOpen(true)} leading={<TriangleAlert />}>{t("common.report")}</GroupRow>
      </Group>

      {(canNotify || admin) && (
        <Group>
          {canNotify && <GroupRow href="/notifier" leading={<Megaphone />} chevron>{t("common.header.notify")}</GroupRow>}
          {admin && <GroupRow href="/admin" leading={<ShieldCheck />} chevron>{t("common.header.admin")}</GroupRow>}
        </Group>
      )}

      <Group title={t("moi.settings")}>
        <GroupRow
          leading={<Globe />}
          trailing={
            <button type="button" onClick={() => setLanguage(isZh ? "fr" : "zh-CN")} className={TOGGLE}>
              {isZh ? t("moi.french") : "中文"}
            </button>
          }
        >
          {t("moi.language")}
        </GroupRow>
        <GroupRow
          leading={<Moon />}
          trailing={
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} className={TOGGLE}>
              {dark ? t("moi.light") : t("moi.dark")}
            </button>
          }
        >
          {t("moi.theme")}
        </GroupRow>
      </Group>

      <Group>
        <GroupRow onClick={() => logOut()} leading={<LogOut />} destructive>{t("common.header.logout")}</GroupRow>
      </Group>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} kind="site" />
    </div>
  );
}

export default function MoiPage() {
  return (
    <RequireAuth>
      <MoiClient />
    </RequireAuth>
  );
}
