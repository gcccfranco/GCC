import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { nowIsoParis, refusInscription, type RefusInscription } from "@/lib/evenements/agenda";
import { HttpError, ID, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import type { Evenement } from "@/types/evenement";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inscription à un évènement (lot 6, docs/spec-evenements.md). Avec compte :
// une place au nom du profil (id = uid, réinscription = mise à jour des
// invités). Sans compte, si l'organisateur l'autorise : nom + invités, id
// aléatoire. Le compteur `inscrits` (personnes + invités) et la place sont
// écrits dans une même transaction ; refus si l'inscription se fait sur un
// formulaire externe (lot 11), si c'est fermé, pas encore ouvert, terminé,
// commencé ou complet (période d'inscription, 17/09/2026).

const REFUS: Record<RefusInscription, string> = {
  externe: "Les inscriptions se font sur un formulaire externe.",
  fermee: "Les inscriptions sont fermées.",
  pasEncore: "Les inscriptions ne sont pas encore ouvertes.",
  terminee: "Les inscriptions sont closes.",
  commencee: "L'évènement a déjà commencé.",
  complet: "Il n'y a plus assez de places.",
};

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  try {
    const user = await optionalUser(req);
    const body = (await req.json().catch(() => ({}))) as { evenementId?: unknown; invites?: unknown; nom?: unknown };
    const evenementId = typeof body.evenementId === "string" && ID.test(body.evenementId) ? body.evenementId : null;
    const invites = Number.isInteger(body.invites) && (body.invites as number) >= 0 && (body.invites as number) <= 5 ? (body.invites as number) : null;
    const nomLibre = typeof body.nom === "string" ? body.nom.trim().slice(0, 40) : "";
    if (!evenementId || invites === null) throw new HttpError(400, "Requête incomplète");
    if (!user && !nomLibre) throw new HttpError(401, "Non authentifié");

    const db = adminDb();
    const ref = db.collection("evenements").doc(evenementId);
    let nom = nomLibre;
    if (user) {
      const p = (await db.collection("users").doc(user.uid).get()).data() as { firstName?: string; lastName?: string; email?: string } | undefined;
      nom = [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() || p?.email || user.email;
    }

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, "Évènement introuvable");
      const e = snap.data() as Evenement;
      if (!user && !e.sansCompte) throw new HttpError(403, "Inscription réservée aux membres connectés.");
      const iid = user ? user.uid : ref.collection("inscriptions").doc().id;
      const iref = ref.collection("inscriptions").doc(iid);
      const existing = user ? await tx.get(iref) : null;
      const prev = existing?.exists ? 1 + ((existing.data()?.invites as number) ?? 0) : 0;
      const sansMoi = (e.inscrits ?? 0) - prev;
      const refus = refusInscription({ ...e, inscrits: sansMoi }, invites, nowIsoParis());
      if (refus) throw new HttpError(409, REFUS[refus]);
      const createdAt = existing?.exists ? (existing.data()?.createdAt as string) : new Date().toISOString();
      const inscrits = sansMoi + 1 + invites;
      tx.set(iref, { uid: user?.uid ?? null, nom, invites, createdAt });
      tx.update(ref, { inscrits });
      return { inscrits, mine: { id: iid, uid: user?.uid ?? null, nom, invites, createdAt } };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
