// Appels du navigateur vers les routes qui préviennent (lot 7). Une panne de
// notification ne doit jamais empêcher de cocher ou d'enregistrer : null.

import { authHeader } from "@/lib/firebase/setlists";
export type RetourFait = { notified: number; linked: boolean; cible: "equipe" | "regie" | null };

async function post<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(body),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export function prevenirFait(equipe: string, tacheId: string, date: string): Promise<RetourFait | null> {
  return post<RetourFait>("/api/taches/fait", { equipe, tacheId, date });
}

export function prevenirResponsable(equipe: string, tacheId: string): Promise<unknown> {
  return post("/api/taches/assigne", { equipe, tacheId });
}
