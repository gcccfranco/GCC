import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { isAdminEmail } from "@/lib/access";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Migration des annonces vers le calendrier (lot 6, docs/spec-evenements.md) :
// chaque annonce devient un évènement de type « info » (section, épingle,
// expiration, images, liens, auteur), sous l'id `annonce-{id}` — relancer ne
// crée donc jamais de doublon. Réservé aux admins ; bouton dans /admin.

type AnnonceDoc = {
  section?: string; title?: string; body?: string; links?: { label: string; url: string }[]; images?: string[];
  pinned?: boolean; expiresAt?: string | null; authorId?: string; authorName?: string; createdAt?: { toDate(): Date } | null;
};

export async function POST(req: NextRequest) {
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    if (!isAdminEmail(user.email)) throw new HttpError(403, "Réservé aux admins");

    const db = adminDb();
    const annonces = await db.collection("annonces").get();
    let migrated = 0, skipped = 0;
    for (const doc of annonces.docs) {
      const ref = db.collection("evenements").doc(`annonce-${doc.id}`);
      if ((await ref.get()).exists) { skipped++; continue; }
      const a = doc.data() as AnnonceDoc;
      const createdAt = a.createdAt?.toDate?.().toISOString() ?? new Date().toISOString();
      await ref.set({
        titre: a.title ?? "", type: "info", pour: a.section ?? "eglise", date: "", heure: "", heureFin: "", dateFin: "",
        lieu: "", description: a.body ?? "", liens: a.links ?? [], images: a.images ?? [], placesMax: null,
        inscriptionOuverte: false, sansCompte: false, contact: "", organisateurUid: a.authorId ?? "",
        organisateurNom: a.authorName ?? "", epingle: a.pinned ?? false, expiresAt: a.expiresAt ?? null,
        inscrits: 0, createdAt, updatedAt: createdAt,
      });
      migrated++;
    }
    return NextResponse.json({ ok: true, migrated, skipped });
  } catch (e) {
    return errorResponse(e);
  }
}
