import { normalizeName, type Servant } from "@/lib/planning/names";

// Lien de la présentation (PPT) rangé dans la setlist par la régie.
// Voir docs/spec-regie.md.

/** Lien accepté (tout lien https), nettoyé ; null s'il n'est pas valable. */
export function parsePresentationUrl(raw: string): string | null {
  if (raw.length > 2000) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** La personne (nom de planning de son profil) est-elle inscrite à la régie
 *  (Sono, PPT ; Campus : régie de la séance) pour le service de cette setlist ?
 *  `servants` = servantsForDate(planning, date de la setlist). Serveur : seul
 *  lui lit le planning, les règles Firestore ne le peuvent pas. */
export function isOnDutyRegie(
  servants: Servant[],
  setlist: { category: string; leader?: string | null; moment?: "matin" | "soir" },
  planningName: string,
): boolean {
  const me = normalizeName(planningName);
  if (!me) return false;
  return servants.some(
    (s) =>
      s.serviceRole === "regie" &&
      s.category === setlist.category &&
      normalizeName(s.name) === me &&
      // Campus : matin et soir d'un même jour ont chacun leur régie (même
      // départage que la notification « setlist prête »).
      (setlist.category !== "Campus" ||
        (setlist.moment ? s.moment === setlist.moment : normalizeName(s.leader) === normalizeName(setlist.leader ?? ""))),
  );
}

/** Comptes à prévenir quand le lien est posé ou remplacé : tous ceux dont le
 *  nom de planning est celui du président de la setlist, sauf l'auteur du
 *  lien. `linked` dit si au moins un compte porte ce nom (sinon la régie doit
 *  savoir que personne n'a été prévenu). `index` = loadPlanningNameIndex(). */
export function presidentRecipients(
  leader: string,
  index: Map<string, string[]>,
  authorUid: string,
): { uids: string[]; linked: boolean } {
  const all = leader.trim() ? index.get(normalizeName(leader)) ?? [] : [];
  return { uids: all.filter((u) => u !== authorUid), linked: all.length > 0 };
}

/** Clé notifLog d'un envoi « présentation prête » : une par setlist et par
 *  lien (empreinte FNV-1a du lien), pour ne jamais prévenir deux fois du même. */
export function presentationNotifKey(setlistId: string, url: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `presentation-${setlistId}-${h.toString(16)}`;
}
