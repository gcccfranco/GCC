import { authHeader } from "@/lib/firebase/setlists";
import { messageTraduit } from "@/lib/messageTraduit";
import type { Inscription } from "@/types/evenement";

// Inscriptions (lot 6) : toujours par le serveur, qui tient le compteur.
// Avec compte, le jeton part dans l'en-tête ; sans compte, le nom dans le corps.
// Le serveur renvoie un `code` de refus (evenements.refus.<code>), traduit ici selon la langue de la page.

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) {
    const cle = json.code ? `evenements.refus.${json.code}` : "";
    const traduit = cle ? messageTraduit(cle) : "";
    throw new Error(traduit || messageTraduit("evenements.inscriptionError"));
  }
  return json;
}

export function inscrire(evenementId: string, invites: number, nom?: string) {
  return call<{ ok: true; inscrits: number; mine: Inscription }>("/api/evenements/inscription", nom ? { evenementId, nom, invites } : { evenementId, invites });
}

export function desinscrire(evenementId: string, inscriptionId?: string) {
  return call<{ ok: true; inscrits: number }>("/api/evenements/desinscription", inscriptionId ? { evenementId, inscriptionId } : { evenementId });
}
