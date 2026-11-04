"use client";

// La pastille d'un rôle de Mes services, partagée entre la liste et le détail (services-1, services-2) :
// fond à 13 % de la couleur du service, texte par `texte-service` (lisible en sombre), fond du site sur la ligne active.

import { useTranslation } from "react-i18next";
import { serviceColor } from "@/lib/serviceColors";
import { styleTexteService } from "@/lib/couleurSombre";
import { cn } from "@/lib/utils";

/** Libellé du planning -> clé `planning.roles.*` (valeurs de CULTE_ROLES, GROUPE_ROLES, FIDELITE_ROLES,
 *  EDD_ROLES_COLS, INTERGROUPE_ROLES, INTERFRANCO_ROLES ; « Chant » et « Régie » du Campus n'ont pas de clé). */
export const CLE_ROLE: Record<string, string> = {
  "Présidence": "presidence", "Choriste": "choristes", "Piano": "piano", "Guitare": "guitare", "Batterie": "batterie",
  "Sono": "sono", "PPT": "ppt", "Orateur": "orateur", "Traduction": "trad", "Sainte cène": "sainteCene",
  "Musicien": "musiciens", "Percussion": "percussion", "Suppléant": "suppleant", "Cajon": "cajon",
  "Cajon/Batterie": "cajonBatt", "Cours": "cours", "Équipe": "equipe",
};

/** En français le libellé brut du planning ; en 中文 la clé `planning.roles.*` (libellé brut si elle manque). */
export function libelleRole(role: string, lang: string, t: (cle: string, options?: { defaultValue: string }) => string): string {
  const cle = CLE_ROLE[role];
  return lang === "zh-CN" && cle ? t(`planning.roles.${cle}`, { defaultValue: role }) : role;
}

export function PastilleRole({ role, service, actif = false }: { role: string; service: string; actif?: boolean }) {
  const { t, i18n } = useTranslation();
  const couleur = serviceColor(service);
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-xs font-semibold texte-service", actif && "!bg-background")}
      style={{ background: `color-mix(in srgb, ${couleur} 13%, transparent)`, ...styleTexteService(couleur) }}
    >
      {libelleRole(role, i18n.language, t)}
    </span>
  );
}
