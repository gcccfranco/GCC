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

/** Adresse d'un service : la date suffit quand il est seul ce jour-là ; sinon son nom
 *  s'ajoute (`?service=`), pour que chaque ligne ait la sienne. */
export function adresseDuService(s: Pick<ServiceGroupe, "date" | "service">, tous: Pick<ServiceGroupe, "date" | "service">[]): string {
  const base = `/mes-services/${s.date}`;
  const seul = tous.every((x) => x.date !== s.date || x.service === s.service);
  return seul ? base : `${base}?service=${encodeURIComponent(s.service)}`;
}

/** Le service d'une adresse : celui de ce nom à cette date, sinon le premier du jour. */
export function serviceDeLAdresse<S extends Pick<ServiceGroupe, "date" | "service">>(
  tous: S[],
  date: string,
  service: string | null,
): S | undefined {
  const duJour = tous.filter((s) => s.date === date);
  return duJour.find((s) => s.service === service) ?? duJour[0];
}

/** Les répétitions d'une séance (Campus) : les services qui pointent vers elle (même date
 *  de setlist et même moment) sans être elle. Une répétition n'en a pas. */
export function repetitionsDe<S extends Pick<ServiceGroupe, "date" | "service" | "setlistDate" | "moment">>(tous: S[], seance: S): S[] {
  if (seance.setlistDate) return [];
  return tous.filter((s) => s !== seance && s.setlistDate === seance.date && s.service !== seance.service && s.moment === seance.moment);
}
