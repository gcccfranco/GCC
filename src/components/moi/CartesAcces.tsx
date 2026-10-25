"use client";

// Lot AO, AO-B (docs/spec-acces-organigramme.md, « Ce que tu peux faire » ; maquette `Moi, ce que tu peux
// faire`) : les deux cartes de Moi qui remplacent, au Back-Office, les services et rôles déclarés. « Mes
// équipes » vient du profil (ce que le serveur recopie de l'organigramme) ; « Ce que tu peux faire » est la
// liste de `ceQueCaOuvre` — la même source que les droits : l'écran ne recalcule rien.
// Piste A (BO4) : chaque équipe de « Mes équipes » ouvre sa page, `/equipes/<id>` (une sous-équipe de Louange : `/equipes/louange`).

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Apercu, Vide } from "@/components/moi/Apercus";
import { ceQueCaOuvre } from "@/lib/acces/organigramme";
import { cleNomEquipe, EQUIPES } from "@/lib/equipes/table";
import { categoryLabel } from "@/lib/serviceColors";
import { SOUS_EQUIPES } from "@/types/equipe";
import { SERVICE_LIEUX, type UserProfile } from "@/types/user";

const SOUS = "block truncate text-[13px] text-muted-foreground";
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Le nom d'un lieu ou d'un groupe : celui du site en français (« Culte Franco »), la traduction en 中文. */
function useNommer() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  return (cle: string) => (cle.startsWith("categories.") && !zh ? categoryLabel(cle.slice("categories.".length)) : t(cle));
}

type Ligne = { cle: string; id: string; nom: string; sous?: string; referent: boolean };

/** « Mes équipes » : celles où la personne figure (équipes et sous-équipes de Louange), dans l'ordre de la table. */
export function CarteMesEquipes({ profile }: { profile: UserProfile | null }) {
  const { t } = useTranslation();
  const nommer = useNommer();
  const dans = profile?.dansEquipes ?? [];
  const referentDe = profile?.referentDe ?? [];
  const lignes: Ligne[] = [];
  for (const { id } of EQUIPES) {
    if (!dans.includes(id) && !referentDe.includes(id)) continue;
    const nom = t(cleNomEquipe(id, true));
    if (id !== "louange") { lignes.push({ cle: id, id, nom, referent: referentDe.includes(id) }); continue; }
    const siennes = SOUS_EQUIPES.filter((s) => (profile?.sousEquipes ?? []).includes(s) || (profile?.referentSous ?? []).includes(s));
    if (referentDe.includes(id) || siennes.length === 0) lignes.push({ cle: id, id, nom, referent: referentDe.includes(id) });
    for (const s of siennes) lignes.push({ cle: `${id}/${s}`, id, nom, sous: t(`acces.sousEquipe.${s}`), referent: (profile?.referentSous ?? []).includes(s) });
  }
  const lieux = SERVICE_LIEUX.filter((l) => (profile?.lieuxLouange ?? []).includes(l) || (profile?.lieuxRegie ?? []).includes(l));
  const joue = profile?.sousEquipes?.includes("musiciens") ? (profile.joue ?? []) : [];
  const sers = [
    t("moi.carteEquipes.sers", { lieux: lieux.map((l) => nommer(`categories.${l}`)).join(", ") }),
    ...(joue.length ? [majuscule(joue.map((i) => t(`acces.instrument.${i}`)).join(", "))] : []),
  ].join(" · ");
  return (
    <Apercu titre={t("moi.apercus.mesEquipes")} lien={{ href: "/equipes", label: t("moi.apercus.organigramme") }}>
      {lignes.length === 0 && <Vide>{t("moi.apercus.aucuneEquipe")}</Vide>}
      {lignes.map((l) => (
        <Link key={l.cle} href={`/equipes/${l.id}`} data-testid="equipe-ligne" className="flex min-h-[44px] items-center gap-3 py-2.5 text-[15px] text-foreground">
          <span className="min-w-0 flex-1">
            {l.sous ? <>{l.nom} · <b>{l.sous}</b></> : <b>{l.nom}</b>}
            {l.referent && <span className="text-muted-foreground"> — {t("equipes.referent")}</span>}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
        </Link>
      ))}
      {lieux.length > 0 && <p className={`${SOUS} py-2.5`}>{sers}</p>}
    </Apercu>
  );
}

/** « Ce que tu peux faire » : chaque accès, sa raison en gris dessous, puis l'invitation à demander au référent. */
export function CarteCeQueTuPeuxFaire({ profile, admin }: { profile: UserProfile | null; admin: boolean }) {
  const { t } = useTranslation();
  const nommer = useNommer();
  const acces = admin ? [] : ceQueCaOuvre(profile, nommer);
  return (
    <Apercu titre={t("moi.carteFaire.titre")}>
      {admin && <Vide>{t("moi.carteFaire.admin")}</Vide>}
      {!admin && acces.length === 0 && <Vide>{t("moi.carteFaire.aucun")}</Vide>}
      {acces.map((a, i) => (
        <div key={`${a.cle}-${i}`} data-testid="acces-ligne" className="py-2.5">
          <span className="block text-[15px] text-foreground">{t(a.cle, a.params)}</span>
          <span className={SOUS}>{t(a.pourquoi, a.params)}</span>
        </div>
      ))}
      {!admin && <p className="py-3 text-[13px] leading-[1.45] text-muted-foreground">{t("acces.manque")}</p>}
    </Apercu>
  );
}
