// Appels du navigateur aux routes /api/fetes/* (docs/spec-chants-fetes.md, CF16, CF17, CF23).

import { authHeader } from "@/lib/firebase/setlists";

type ReponseFetes<T> = { ok: true; data: T } | { ok: false; status: number; erreur: string };

/** POST d'une route des fêtes avec le jeton de la personne connectée. Ne lève jamais : un réseau coupé
 *  rend `status: 0`. */
export async function appelerFetes<T>(route: "droits" | "saisir" | "musiques", corps: Record<string, unknown>): Promise<ReponseFetes<T>> {
  try {
    const res = await fetch(`/api/fetes/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(corps),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, status: res.status, erreur: json.error ?? "" };
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 0, erreur: "" };
  }
}
