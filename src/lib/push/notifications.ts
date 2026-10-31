// Persistance des notifications « cloche » — un document par envoi push ponctuel
// (manuel, rappel, diffusion). Lu côté client par useNotifications (REST) pour
// afficher dans la cloche les push qui n'ont AUCUNE autre trace persistée. Les
// notifications « setlist prête » et « annonce » ne passent pas par ici : elles
// apparaissent déjà dans la cloche via les collections setlists / annonces.
// Serveur uniquement (Admin SDK, contourne firestore.rules).

import { adminDb } from "./admin";

/** Chemin interne avec sa barre finale (le site sert ses pages ainsi ; sans elle, c'est une redirection 308 que le
 *  service worker ne rejoue pas hors ligne). La barre se met avant « ? » et « # » ; une adresse à extension est laissée. */
export function avecBarreFinale(url: string): string {
  const fin = url.search(/[?#]/);
  const chemin = fin === -1 ? url : url.slice(0, fin);
  const reste = fin === -1 ? "" : url.slice(fin);
  if (!chemin.startsWith("/") || chemin.endsWith("/") || (chemin.split("/").pop() ?? "").includes(".")) return url;
  return `${chemin}/${reste}`;
}

export type BellKind = "manual" | "reminder" | "broadcast" | "presentation" | "scene" | "evenement" | "tache";

export interface RecordNotificationInput {
  title: string;
  body: string;
  /** URL ouverte au clic (chemin interne) */
  url: string;
  kind: BellKind;
  /** Destinataires exacts (uid) ; ignoré si `everyone`. */
  recipients?: string[];
  /** Diffusion à tous les membres connectés (cloche visible par tout le monde). */
  everyone?: boolean;
}

/** Écrit l'entrée de cloche correspondant à un envoi push. N'écrit rien si
 *  personne n'est ciblé (ni destinataires, ni diffusion) — évite les docs
 *  orphelins, donc des lectures inutiles côté cloche. La date est un vrai
 *  timestamp Firestore (≠ notifLog qui stocke un nombre) pour permettre le tri
 *  et la requête incrémentale `createdAt > since` côté client. */
export async function recordNotification(input: RecordNotificationInput): Promise<void> {
  const recipients = [...new Set(input.recipients ?? [])];
  const everyone = input.everyone ?? false;
  if (!everyone && recipients.length === 0) return;
  await adminDb().collection("notifications").add({
    title: input.title,
    body: input.body,
    url: avecBarreFinale(input.url),
    kind: input.kind,
    recipients,
    everyone,
    createdAt: new Date(),
  });
}
