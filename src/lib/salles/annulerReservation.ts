import { authHeader } from "@/lib/firebase/setlists";

/** AS16 : la coordination annule la réservation d'un autre avec un motif ; le serveur la supprime et prévient l'auteur
 *  et les personnes cochées. Lève une erreur en cas d'échec (la réservation n'est alors pas supprimée). */
export async function annulerReservation(reservationId: string, motif: string): Promise<void> {
  const res = await fetch("/api/salles/annulation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ reservationId, motif }),
  });
  if (!res.ok) throw new Error(`annulation ${res.status}`);
}
