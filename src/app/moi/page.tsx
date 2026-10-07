"use client";

// « Moi » (décision Q9 du 15/09/2026) : la porte de tout ce qui me concerne
// sur téléphone et tablette. Rien de nouveau : des liens vers les pages qui
// existaient dans le menu et la navbar, plus les réglages de langue et de thème.
// Lot U4 bis, B5 (docs/spec-pages-en-grand.md, Q9) : carte du compte, colonnes selon
// la disposition, et les notifications dans Réglages.
// Agencement v18, A12 (docs/spec-agencement-v18.md ; planche `v18-app-moi-a`) : l'en-tête commun,
// des aperçus utiles (Mes services, Mes tâches, Harmonie, Mes équipes) et trois cartes d'aide.

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { BookOpen, ChevronRight, Globe, LogOut, Megaphone, MessageSquareHeart, Moon, ShieldCheck, TriangleAlert } from "lucide-react";
import { useDisposition } from "@/hooks/useDisposition";
import { CarteCompte } from "@/components/moi/CarteCompte";
import { ReglagesNotifications } from "@/components/moi/ReglagesNotifications";
import { ApercuEquipes, ApercuHarmonie, ApercuServices, ApercuTaches } from "@/components/moi/Apercus";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Halo } from "@/components/layout/Halo";
import { Group, GroupRow } from "@/components/ui/group";
import { ReportDialog } from "@/components/report/ReportDialog";
import { useSetLanguage } from "@/lib/I18nProvider";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser, polesDe } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { TACHE_POLES } from "@/types/tache";

const TOGGLE = "rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.96] cursor-pointer";

function MoiClient() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();
  // Catalogue « Harmonie » (lot 9) : jusqu'au 19/09/2026 il n'était joignable
  // que depuis l'onglet Chants et la page d'un chant.
  const harmonie = useAccesHarmonie();
  const setLanguage = useSetLanguage();
  const [reportOpen, setReportOpen] = useState(false);
  const disposition = useDisposition();

  const isZh = i18n.language === "zh-CN";
  const dark = resolvedTheme === "dark";
  const admin = isAdminUser(user);
  const canNotify = admin || (profile?.notify?.length ?? 0) > 0;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  // « Mes tâches » (lot 7) : seulement pour les membres d'un pôle et les admins.
  const poles = useMemo(() => (admin ? [...TACHE_POLES] : polesDe(profile)), [admin, profile]);

  const carte = "raised rounded-2xl px-4 py-1.5";
  const blocs = {
    compte: (
      <CarteCompte
        key="compte"
        nom={name}
        email={user?.email ?? ""}
        admin={admin}
        planningName={profile?.planningName ?? ""}
        serviceRoles={profile?.serviceRoles ?? {}}
      />
    ),
    // Lot U6, B2 : Notifier et l'administration sont au Back-Office (Messages, Équipes…) ;
    // en ligne, interrupteur coupé, ils restent ici.
    notifierAdmin: !BACK_OFFICE && (canNotify || admin) && (
      <Group key="notifierAdmin" className={carte}>
        {canNotify && <GroupRow href="/notifier" leading={<Megaphone />} chevron>{t("common.header.notify")}</GroupRow>}
        {admin && <GroupRow href="/admin" leading={<ShieldCheck />} chevron>{t("common.header.admin")}</GroupRow>}
      </Group>
    ),
    // Q9 : Réglages = Notifications · Langue · Thème (les notifications ont quitté le profil).
    reglages: (
      <section key="reglages" aria-label={t("moi.settings")} className="raised rounded-2xl px-4 pb-1.5 pt-3">
        <Group title={t("moi.settings")}>
          {profile && <ReglagesNotifications feuille={disposition === "telephone"} />}
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
      </section>
    ),
    deconnexion: (
      <Group key="deconnexion" className={carte}>
        <GroupRow onClick={() => logOut()} leading={<LogOut />} destructive>{t("common.header.logout")}</GroupRow>
      </Group>
    ),
  };
  const { compte, notifierAdmin, reglages, deconnexion } = blocs;

  // A12 (agencement v18) : des aperçus utiles à la place des lignes de liens d'avant (Mes services,
  // Équipes, Harmonie, Tâches) ; leur « Tout voir » mène aux pages, rien ne disparaît.
  const apercus = (
    <div key="apercus" className="grid items-start gap-4 md:grid-cols-2">
      <ApercuServices />
      {BACK_OFFICE && poles.length > 0 && user && <ApercuTaches poles={poles} uid={user.uid} />}
      {!harmonie.chargement && harmonie.peut && <ApercuHarmonie piano={harmonie.piano} />}
      {BACK_OFFICE && user && <ApercuEquipes uid={user.uid} />}
    </div>
  );
  const aide = (
    <div key="aide" className="grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
      <CarteAide href="/guide" icone={<BookOpen />} titre={t("common.header.guide")} sous={t("moi.apercus.guideSous")} />
      <CarteAide href="/questionnaire" icone={<MessageSquareHeart />} titre={t("survey.title")} sous={t("moi.apercus.avisSous")} />
      <CarteAide onClick={() => setReportOpen(true)} icone={<TriangleAlert />} titre={t("common.report")} sous={t("moi.apercus.signalerSous")} />
    </div>
  );

  // A12 : en grand, le compte, les réglages et la déconnexion à gauche (340 px), les aperçus en deux
  // colonnes à droite puis l'aide ; tablette portrait, compte et réglages côte à côte, puis les
  // aperçus en deux colonnes ; téléphone, une colonne (les réglages après l'aide).
  // Un seul arbre pour les trois : seules les classes changent, et les aperçus restent au même endroit.
  // Une rotation ou la barre pliée ne les démonte donc pas (sinon toutes leurs lectures repartiraient).
  const grand = disposition === "grand";
  const telephone = disposition === "telephone";
  const contenu = (
    <div className={grand ? "grid grid-cols-[340px_minmax(0,1fr)] items-start gap-5" : "space-y-4"}>
      <div className={grand ? "space-y-4" : telephone ? undefined : "grid grid-cols-2 items-start gap-4"}>
        {compte}
        {!telephone && <div className="space-y-4">{reglages}{notifierAdmin}{deconnexion}</div>}
      </div>
      <div className="min-w-0 space-y-4">{apercus}{aide}</div>
      {telephone && <div className="space-y-4">{notifierAdmin}{reglages}{deconnexion}</div>}
    </div>
  );

  return (
    <div className="relative">
      <Halo variant="moi" color="hsl(var(--foreground))" />
      <div className="relative pb-10">
        <EnTetePage titre={t("moi.title")} sousTitre={admin ? `${name || user?.email} · ${t("moi.admin")}` : name || user?.email} />
        <div className="px-[var(--marge-page)]">{contenu}</div>
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} kind="site" />
      </div>
    </div>
  );
}

/** Une carte d'aide (Guide, Ton avis, Signaler un problème) : icône, titre, une ligne, chevron. */
function CarteAide({ href, onClick, icone, titre, sous }: { href?: string; onClick?: () => void; icone: ReactNode; titre: string; sous: string }) {
  const inner = (
    <>
      <span aria-hidden className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-secondary [&_svg]:h-4 [&_svg]:w-4">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5">{titre}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{sous}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </>
  );
  const classe = "raised flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-foreground transition-transform duration-150 active:scale-[.98]";
  return href ? <Link href={href} className={classe}>{inner}</Link> : <button type="button" onClick={onClick} className={classe}>{inner}</button>;
}

export default function MoiPage() {
  return (
    <RequireAuth>
      <MoiClient />
    </RequireAuth>
  );
}
