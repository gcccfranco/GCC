import { authHeader } from "@/lib/firebase/setlists";

/** Signale au serveur deux créneaux qui se chevauchent malgré le refus côté
 *  client : il vérifie, puis prévient les deux auteurs (push + cloche). Silencieux
 *  en cas d'échec : le rouge dans la liste reste visible pour tout le monde. */
export async function reportConflict(programmeId: string, creneauIds: string[]): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch("/api/scene/conflit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ programmeId, creneauIds }),
    });
  } catch {
    // rien : le marquage rouge suffit à rendre le conflit visible
  }
}
