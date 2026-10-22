// Lot AO, AO-F (docs/spec-acces-organigramme.md) : les « rôles de service » par catégorie qu'un écran lit encore pour
// CHOISIR des personnes (« Choisir » du planning, candidats d'une setlist partagée, rôle proposé). Ancien mode :
// `serviceRoles` du profil, tel quel. Nouveau mode (`backOffice`) : déduits de l'organigramme — les lieux où l'on sert
// à Louange (`lieuxLouange`) avec ses sous-équipes (Présidence, Musiciens, Choristes), et la Régie (`lieuxRegie`).
// Ça ne donne aucun accès : c'est un classement de suggestions. Les groupes et l'EDD n'y ont pas de rôle (leur
// organigramme à eux porte les titulaires).

import { BACK_OFFICE } from "@/lib/backOffice";
import { SERVICE_LIEUX, type ServiceRole } from "@/types/user";

type Profil = {
  serviceRoles?: Record<string, readonly string[]>;
  sousEquipes?: string[];
  lieuxLouange?: string[];
  lieuxRegie?: string[];
};

const ROLE_DE_SOUS_EQUIPE: Record<string, ServiceRole> = { presidence: "presidence", musiciens: "musicien", choristes: "chanteur" };

export function rolesDeService(p: Profil, backOffice: boolean = BACK_OFFICE): Record<string, readonly string[]> {
  if (!backOffice) return p.serviceRoles ?? {};
  const roles = (p.sousEquipes ?? []).flatMap((s) => (ROLE_DE_SOUS_EQUIPE[s] ? [ROLE_DE_SOUS_EQUIPE[s]] : []));
  const out: Record<string, ServiceRole[]> = {};
  for (const lieu of SERVICE_LIEUX) {
    const r: ServiceRole[] = [...((p.lieuxLouange ?? []).includes(lieu) ? roles : []), ...((p.lieuxRegie ?? []).includes(lieu) ? ["regie" as const] : [])];
    if (r.length) out[lieu] = [...new Set(r)];
  }
  return out;
}
