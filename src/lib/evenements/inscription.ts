import { authHeader } from "@/lib/firebase/setlists";
import type { Inscription } from "@/types/evenement";

// Inscriptions (lot 6) : toujours par le serveur, qui tient le compteur.
// Avec compte, le jeton part dans l'en-tête ; sans compte, le nom dans le corps.

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json;
}

export function inscrire(evenementId: string, invites: number, nom?: string) {
  return call<{ ok: true; inscrits: number; mine: Inscription }>("/api/evenements/inscription", nom ? { evenementId, nom, invites } : { evenementId, invites });
}

export function desinscrire(evenementId: string, inscriptionId?: string) {
  return call<{ ok: true; inscrits: number }>("/api/evenements/desinscription", inscriptionId ? { evenementId, inscriptionId } : { evenementId });
}
