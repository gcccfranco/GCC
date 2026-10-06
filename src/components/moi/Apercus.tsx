"use client";

// Les aperçus de Moi (agencement v18, A12 de docs/spec-agencement-v18.md ; planche `v18-app-moi-a`) :
// Mes services, Mes tâches, Harmonie, Mes équipes. Chacun reprend une ligne de liens d'avant (U4 bis,
// B5) et la remplit de ce qui sert : son « Tout voir » mène à la page. Rien n'est écrit ; les données
// sont celles des pages (plannings, tâches, progression du cours, organigramme), lues comme elles.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Minus, Piano, Sparkles } from "lucide-react";
import { Tile } from "@/components/ui/tile";
import { adresseDeLaLigne } from "@/components/taches/SectionTaches";
import { dateCourte } from "@/components/taches/TacheLigne";
import { BACK_OFFICE } from "@/lib/backOffice";
import { listEquipes } from "@/lib/firebase/equipes";
import { useProfile } from "@/lib/firebase/users";
import { EQUIPES } from "@/lib/equipes/organigramme";
import { leconsDansLOrdre, useCoursIndex, useCoursProgres } from "@/lib/harmonie/useCours";
import { joursAvant, reunirServices, type ServiceDuJour } from "@/lib/planning/accueil";
import { adresseDuService } from "@/lib/planning/mesServices";
import { loadPlanningData, type PlanningData } from "@/lib/planning/names";
import { lirePetitDej } from "@/lib/petitdej/lignes";
import { servicesDuCompte } from "@/lib/petitdej/services";
import { todayIso } from "@/lib/scene/dimanches";
import { aFairePour, lignesDeTache } from "@/lib/taches/echeances";
import { useTaches } from "@/lib/taches/useTaches";
import { serviceColor } from "@/lib/serviceColors";
import type { Equipe } from "@/types/equipe";
import type { LignePetitDej } from "@/types/petitDej";
import type { TachePole } from "@/types/tache";

const LIGNE = "flex items-center gap-3 py-2.5";
const SOUS = "block truncate text-[13px] text-muted-foreground";

/** Le cadre d'un aperçu : titre, « Tout voir » à droite (son libellé dit combien), puis les lignes. */
function Apercu({ titre, lien, children }: { titre: string; lien: { href: string; label: string }; children: ReactNode }) {
  return (
    <section aria-label={titre} className="raised min-w-0 rounded-2xl px-4 pb-1.5 pt-3.5">
      <div className="flex items-center gap-2 pb-2.5">
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-bold text-foreground">{titre}</h2>
        <Link
          href={lien.href}
          aria-label={`${titre} · ${lien.label}`}
          className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 text-[13px] font-semibold text-foreground transition-colors hover:text-muted-foreground"
        >
          {lien.label}
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
      <div className="divide-y divide-border border-t border-border">{children}</div>
    </section>
  );
}

/** Une ligne vide : ce que l'aperçu n'a pas (rien à faire, aucune équipe). */
const Vide = ({ children }: { children: ReactNode }) => <p className="py-3 text-[14px] text-muted-foreground">{children}</p>;

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");

// ── Mes services ────────────────────────────────────────────────────────────────────────────

/** Les services à venir de la personne, comme Mes services les lit (plannings, petits déj par le compte). */
function useServicesAVenir(): { aVenir: ServiceDuJour[]; tous: ServiceDuJour[]; aujourdhui: string } {
  const { user, profile } = useProfile();
  const [data, setData] = useState<PlanningData | null>(null);
  const [petitDej, setPetitDej] = useState<LignePetitDej[]>([]);
  const aujourdhui = todayIso();
  useEffect(() => {
    let vivant = true;
    loadPlanningData().then((d) => { if (vivant) setData(d); }, () => {});
    if (BACK_OFFICE) lirePetitDej().then((l) => { if (vivant) setPetitDej(l); }, () => {});
    return () => { vivant = false; };
  }, []);
  const tous = useMemo(
    () => (data && user && profile ? reunirServices(servicesDuCompte(data, petitDej, user.uid, profile.planningName ?? "")) : []),
    [data, user, profile, petitDej],
  );
  return { aVenir: tous.filter((s) => s.date >= aujourdhui), tous, aujourdhui };
}

export function ApercuServices() {
  const { t, i18n } = useTranslation();
  const { aVenir, tous, aujourdhui } = useServicesAVenir();
  return (
    <Apercu titre={t("common.header.myServices")} lien={{ href: "/mes-services", label: t("mesServices.upcomingCount", { count: aVenir.length }) }}>
      {aVenir.length === 0 && <Vide>{t("mesServices.emptyUpcoming")}</Vide>}
      {aVenir.slice(0, 3).map((s) => {
        const jour = new Date(`${s.date}T12:00:00`);
        const couleur = serviceColor(s.service);
        const long = jour.toLocaleDateString(locale(i18n.language), { weekday: "long", day: "numeric", month: "long" });
        const jours = joursAvant(s.date, aujourdhui);
        const quand = [
          long.charAt(0).toUpperCase() + long.slice(1),
          jours === 0 ? t("mesServices.today") : jours <= 14 ? t("mesServices.inDays", { count: jours }) : null,
        ].filter(Boolean).join(" · ");
        return (
          <div key={`${s.date}|${s.service}|${s.setlistDate ?? ""}|${s.moment ?? ""}`} data-testid="apercu-ligne">
            <Link href={adresseDuService(s, tous)} className={LIGNE}>
              <Tile color={couleur} big={jour.getDate()} small={new Intl.DateTimeFormat(locale(i18n.language), { month: "short" }).format(jour)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">{s.service}</span>
                <span className={SOUS}>{quand}</span>
              </span>
              <span
                className="max-w-[40%] shrink-0 truncate rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: `color-mix(in srgb, ${couleur} 13%, transparent)`, color: couleur }}
              >
                {s.roles.join(", ")}
              </span>
            </Link>
          </div>
        );
      })}
    </Apercu>
  );
}

// ── Mes tâches ──────────────────────────────────────────────────────────────────────────────

export function ApercuTaches({ poles, uid }: { poles: TachePole[]; uid: string }) {
  const { t, i18n } = useTranslation();
  const { items } = useTaches(poles);
  const aujourdhui = todayIso();
  const aFaire = useMemo(
    () => aFairePour(items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui)), uid).sort((a, b) => a.date.localeCompare(b.date)),
    [items, aujourdhui, uid],
  );
  return (
    <Apercu titre={t("taches.mesTaches")} lien={{ href: "/taches", label: t("moi.apercus.aFaire", { count: aFaire.length }) }}>
      {aFaire.length === 0 && <Vide>{t("moi.apercus.rienAFaire")}</Vide>}
      {aFaire.slice(0, 3).map((l) => {
        const enCours = l.fois?.etat === "encours";
        const details = [enCours ? t("taches.etat.encours") : null, dateCourte(l.date, i18n.language), t(`taches.pole.${l.tache.pole}`)]
          .filter(Boolean).join(" · ");
        return (
          <div key={`${l.tache.pole}/${l.tache.id}/${l.date}`} data-testid="apercu-ligne">
            <Link href={adresseDeLaLigne(l)} className={LIGNE}>
              <span
                aria-hidden
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${enCours ? "border-foreground text-foreground" : "border-muted-foreground/50"}`}
              >
                {enCours && <Minus className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-foreground">{l.tache.titre}</span>
                <span className={SOUS}>{details}</span>
              </span>
            </Link>
          </div>
        );
      })}
    </Apercu>
  );
}

// ── Harmonie ────────────────────────────────────────────────────────────────────────────────

export function ApercuHarmonie() {
  const { t } = useTranslation();
  const { chapitres } = useCoursIndex();
  const { fini } = useCoursProgres();
  const lecons = leconsDansLOrdre(chapitres);
  const faits = lecons.filter((c) => fini[c.id]).length;
  const prochain = lecons.find((c) => !fini[c.id]);
  const lien = (href: string, icone: ReactNode, label: string) => (
    <Link href={href} className={LIGNE}>
      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground [&_svg]:h-4 [&_svg]:w-4">{icone}</span>
      <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
  return (
    <Apercu titre={t("harmonie.titre")} lien={{ href: "/harmonie", label: t("moi.apercus.ouvrir") }}>
      {lecons.length > 0 && (
        <Link href={prochain ? `/harmonie/cours/${prochain.id}` : "/harmonie/cours"} className="block py-2.5">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{t("moi.apercus.cours")}</span>
            <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
              {t("moi.apercus.chapitres", { faits, total: lecons.length })}
            </span>
          </span>
          <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-foreground" style={{ width: `${(faits / lecons.length) * 100}%` }} />
          </span>
          <span className={`${SOUS} mt-2`}>
            {prochain ? t("moi.apercus.prochain", { titre: `${prochain.numero}. ${prochain.titre}` }) : t("moi.apercus.coursFini")}
          </span>
        </Link>
      )}
      {lien("/harmonie", <Sparkles />, t("moi.apercus.fiches"))}
      {lien("/harmonie/rd2000", <Piano />, t("moi.apercus.sons"))}
    </Apercu>
  );
}

// ── Mes équipes ─────────────────────────────────────────────────────────────────────────────

export function ApercuEquipes({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const [equipes, setEquipes] = useState<Equipe[] | null>(null);
  useEffect(() => {
    let vivant = true;
    listEquipes().then((e) => { if (vivant) setEquipes(e); }, () => { if (vivant) setEquipes([]); });
    return () => { vivant = false; };
  }, []);
  // Dans l'ordre de l'organigramme ; une équipe hors de la table n'existe pas (EQUIPES).
  const miennes = EQUIPES.flatMap((def) => {
    const e = equipes?.find((x) => x.id === def.id);
    const moi = e?.membres.find((m) => m.uid === uid);
    return e && moi ? [{ id: def.id, moi, nombre: e.membres.length }] : [];
  });
  return (
    <Apercu titre={t("moi.apercus.mesEquipes")} lien={{ href: "/equipes", label: t("moi.apercus.organigramme") }}>
      {equipes && miennes.length === 0 && <Vide>{t("moi.apercus.aucuneEquipe")}</Vide>}
      {miennes.slice(0, 3).map(({ id, moi, nombre }) => {
        const nom = t(`equipes.court.${id}`);
        const role = moi.referent ? t("equipes.referent") : moi.groupe || moi.mention || t("moi.apercus.membre");
        return (
          <div key={id} data-testid="apercu-ligne" className={LIGNE}>
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-foreground">
              {nom.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-foreground">{nom}</span>
              <span className={SOUS}>{`${role} · ${t("moi.apercus.membres", { count: nombre })}`}</span>
            </span>
          </div>
        );
      })}
    </Apercu>
  );
}
