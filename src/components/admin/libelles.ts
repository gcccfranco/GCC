// Libellés du Back-Office et de l'administration, dans la langue active (lot B5b de
// docs/spec-corrections-audit.md) : services, rôles de profil, audiences de notification et
// libellés de planning (services et rôles de `findMyServices`). En français, les mots d'avant
// (`categoryLabel`, `SERVICE_ROLE_LABELS`, `audienceLabel`) ; en 中文, les clés de Moi
// (`categories.*`, `equipes.role.*` avec chanteur → choriste) et des plannings (`planning.roles.*`).
import type { TFunction } from "i18next";
import { NOTIFY_ALL, audienceLabel } from "@/lib/push/audiences";
import { EQUIPES } from "@/lib/equipes/table";
import { categoryLabel } from "@/lib/serviceColors";
import { SERVICE_ROLE_LABELS, type ServiceRole } from "@/types/user";

/** Un lieu de service ou un groupe (« Culte Francophone », « Groupe Paix »…). */
export function libelleService(t: TFunction, zh: boolean, categorie: string): string {
  return zh ? t(`categories.${categorie}`, { defaultValue: categorie }) : categoryLabel(categorie);
}

/** Un rôle de profil (chanteur se dit choriste, comme dans Moi). */
export function libelleRole(t: TFunction, zh: boolean, role: ServiceRole): string {
  return zh ? t(`equipes.role.${role === "chanteur" ? "choriste" : role}`) : SERVICE_ROLE_LABELS[role];
}

/** Une audience de notification : tout le monde, un culte, un groupe, une classe, une équipe. */
export function libelleAudience(t: TFunction, zh: boolean, a: string): string {
  if (!zh) return audienceLabel(a);
  if (a === NOTIFY_ALL) return t("notifier.toutLeMonde");
  if (a.startsWith("equipe:")) {
    const id = a.slice("equipe:".length);
    if (id === "louange") return t("notifier.touteLaLouange");
    return t(`equipes.team.${id}`, { defaultValue: EQUIPES.find((e) => e.id === id)?.nom ?? a });
  }
  if (a.startsWith("louange:")) {
    const sous = a.slice("louange:".length);
    return `${t("equipes.public.louange")} · ${t(`acces.sousEquipe.${sous}`, { defaultValue: sous })}`;
  }
  return libelleService(t, zh, a);
}

/** Le service d'une ligne de planning (« Culte Franco », « EDD 中班 », « Campus (soir) »…). */
export function libelleServicePlanning(t: TFunction, zh: boolean, service: string): string {
  if (!zh) return service;
  if (service === "Culte Franco") return t("categories.Culte Francophone");
  if (service === "Prépa. Table") return t("admin.service.prepaTable");
  if (service === "Petit déj") return t("planning.roles.petitDej");
  if (service.startsWith("EDD ")) return t("admin.service.edd", { classe: service.slice(4) });
  if (service === "Campus (matin)" || service === "Campus matin") return t("admin.service.campusMatin");
  if (service === "Campus (soir)" || service === "Campus soir") return t("admin.service.campusSoir");
  if (service === "Campus (répét.)") return t("admin.service.campusRepet");
  return t(`categories.${service}`, { defaultValue: service });
}

const ROLES_PLANNING: Record<string, string> = {
  "Présidence": "planning.roles.presidence", Choriste: "planning.roles.choristes", Chant: "planning.roles.choristes",
  Piano: "planning.roles.piano", Guitare: "planning.roles.guitare", Batterie: "planning.roles.batterie",
  Sono: "planning.roles.sono", PPT: "planning.roles.ppt", Orateur: "planning.roles.orateur",
  Traduction: "planning.roles.trad", "Sainte cène": "planning.roles.sainteCene", Musicien: "planning.roles.musiciens",
  "Suppléant": "planning.roles.suppleant", Cajon: "planning.roles.cajon", "Cajon/Batterie": "planning.roles.cajonBatt",
  "Équipe": "planning.roles.equipe", Percussion: "planning.roles.percussion", Cours: "planning.roles.cours",
  "Régie": "equipes.role.regie",
};

/** Le rôle d'une ligne de planning (« Piano », « Présidence »…), tel quel s'il est inconnu. */
export function libelleRolePlanning(t: TFunction, zh: boolean, role: string): string {
  const cle = ROLES_PLANNING[role];
  return zh && cle ? t(cle) : role;
}
