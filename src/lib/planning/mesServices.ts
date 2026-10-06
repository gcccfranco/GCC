// Mes services en deux volets (lot U4 bis, B4, docs/spec-pages-en-grand.md, Q7) : l'adresse
// d'un service (`/mes-services/[date]`) et ce que sa page lit. Pur, testé sans navigateur.

import type { ServiceEntry } from "./names";

/** Un service d'une personne, ses rôles réunis (une ligne de Mes services). */
export type ServiceGroupe = {
  date: string;
  service: string;
  roles: string[];
  time?: string;
  location?: string;
  setlistDate?: string;
  leader?: string;
  moment?: "matin" | "soir";
};

/** Regroupe les entrées par date+service en fusionnant les rôles. La séance cible
 *  (setlistDate+moment) fait partie de la clé : deux répétitions campus de séances
 *  différentes le même jour restent deux cartes (heures/lieux distincts). */
export function grouperServices(entries: ServiceEntry[]): ServiceGroupe[] {
  const map = new Map<string, ServiceGroupe>();
  for (const e of entries) {
    const key = cleDuService(e);
    const g = map.get(key);
    if (g) {
      if (!g.roles.includes(e.role)) g.roles.push(e.role);
    } else {
      map.set(key, { date: e.date, service: e.service, roles: [e.role], time: e.time, location: e.location, setlistDate: e.setlistDate, leader: e.leader, moment: e.moment });
    }
  }
  return [...map.values()];
}

export const cleDuService = (s: Pick<ServiceGroupe, "date" | "service" | "setlistDate" | "moment">) =>
  `${s.date}|${s.service}|${s.setlistDate ?? ""}|${s.moment ?? ""}`;

type Repere = Pick<ServiceGroupe, "date" | "service" | "setlistDate" | "moment">;

/** Adresse d'un service : la date suffit quand il est seul ce jour-là ; sinon son nom
 *  s'ajoute (`?service=`), et, si un autre service du même nom tombe ce jour-là (les
 *  répétitions du Campus pour la séance du matin et pour celle du soir), sa séance
 *  (`&moment=…&seance=<date de la setlist>`) : chaque ligne a la sienne. */
export function adresseDuService(s: Repere, tous: Repere[]): string {
  const duJour = tous.filter((x) => x.date === s.date);
  const parts: string[] = [];
  if (duJour.some((x) => x.service !== s.service)) parts.push(`service=${encodeURIComponent(s.service)}`);
  if (duJour.some((x) => x.service === s.service && cleDuService(x) !== cleDuService(s))) {
    parts.push(`moment=${encodeURIComponent(s.moment ?? "")}`, `seance=${encodeURIComponent(s.setlistDate ?? "")}`);
  }
  const base = `/mes-services/${s.date}`;
  return parts.length ? `${base}?${parts.join("&")}` : base;
}

/** Le service d'une adresse : celui de ce nom (et de cette séance, si l'adresse la porte) à
 *  cette date, sinon le premier de ce nom, sinon le premier du jour. */
export function serviceDeLAdresse<S extends Repere>(
  tous: S[],
  date: string,
  service: string | null,
  moment: string | null = null,
  seance: string | null = null,
): S | undefined {
  const duJour = tous.filter((s) => s.date === date);
  const duNom = service === null ? duJour : duJour.filter((s) => s.service === service);
  const candidats = duNom.length ? duNom : duJour;
  return candidats.find((s) => (moment === null || (s.moment ?? "") === moment) && (seance === null || (s.setlistDate ?? "") === seance)) ?? candidats[0];
}

/** Les répétitions d'une séance (Campus) : les services qui pointent vers elle (même date
 *  de setlist et même moment) sans être elle. Une répétition n'en a pas. */
export function repetitionsDe<S extends Pick<ServiceGroupe, "date" | "service" | "setlistDate" | "moment">>(tous: S[], seance: S): S[] {
  if (seance.setlistDate) return [];
  return tous.filter((s) => s !== seance && s.setlistDate === seance.date && s.service !== seance.service && s.moment === seance.moment);
}
