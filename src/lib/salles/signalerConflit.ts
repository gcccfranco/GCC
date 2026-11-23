import { authHeader } from "@/lib/firebase/setlists";

/** SA9 : signale au serveur deux réservations qui se chevauchent malgré le refus de la feuille ; il vérifie, puis
 *  prévient les deux auteurs (push + cloche). Silencieux en cas d'échec : les deux blocs restent visibles dans Salles. */
export async function signalerConflit(reservationIds: string[]): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch("/api/salles/conflit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ reservationIds }),
    });
  } catch {
    // rien : le chevauchement reste visible dans la Liste et la Grille
  }
}
