import { expect, type Page } from "@playwright/test";
import { FS_BASE } from "../../src/lib/firebase/setlists";

export type EnvoiAnnulation = { body: { reservationId: string; motif: string }; auth?: string };

/** AS16 : la route d'annulation simulée : note l'appel, retire la réservation de la base simulée (ce que fait le serveur). */
export async function simulerAnnulation(page: Page): Promise<EnvoiAnnulation[]> {
  const envois: EnvoiAnnulation[] = [];
  await page.route("**/api/salles/annulation", async (route) => {
    const body = route.request().postDataJSON();
    envois.push({ body, auth: route.request().headers()["authorization"] });
    await page.evaluate((u) => fetch(u, { method: "DELETE" }), `${FS_BASE}/reservations/${body.reservationId}`);
    await route.fulfill({ json: { ok: true, notified: 1 } });
  });
  return envois;
}

/** AS16 : la feuille « Annuler la réservation… » : sans motif l'envoi est éteint ; le motif, puis l'envoi. */
export async function annulerAvecMotif(page: Page, motif: string) {
  const f = page.getByRole("alertdialog");
  const envoyer = f.getByRole("button", { name: "Annuler la réservation", exact: true });
  await expect(envoyer).toBeDisabled();
  await f.getByLabel("Motif (envoyé à l'auteur)").fill(motif);
  await envoyer.click();
  await expect(f).toHaveCount(0);
}
