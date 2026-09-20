import { authHeader } from "@/lib/firebase/setlists";

/** Demande au serveur de prévenir les membres concernés d'un nouvel évènement
 *  (push + cloche, préférence « Évènements »). Silencieux en cas d'échec. */
export async function notifyEvenement(evenementId: string): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch("/api/push/notify-evenement", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ evenementId }),
    });
  } catch {
    // rien : la fiche existe, le push n'est qu'un confort
  }
}
