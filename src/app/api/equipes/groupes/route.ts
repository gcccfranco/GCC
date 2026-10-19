import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { isFondateur } from "@/lib/access";
import { lireEquipes, lireGroupes, recalculerRattachement } from "@/lib/equipes/serveur";
import { changerGroupe, exigerTenirGroupe } from "@/lib/groupes/serveur";
import { BACK_OFFICE } from "@/lib/backOffice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Organigrammes des groupes (lot 2 du chantier « équipes et groupes », docs/spec-organigrammes-groupes.md,
// OG21). Après chaque écriture de groupes/{id} par le navigateur : `{ groupe, uids }` — l'appelant tient
// ce groupe (exigerTenirGroupe : admin, président ou VP, relu en base) et désigne les comptes cités
// avant et après son écriture ; le serveur relit les documents et recopie (OG19, OG20), pose `groupe`
// (OG3) et renvoie `{ maj, ignores }`. L'appelant choisit les comptes, jamais les droits.
// `{ changerGroupe: { uid, groupe } }` : admins seuls (OG5). Le profil reste fermé au navigateur.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 });
  try {
    const user = await optionalUser(req);
    const body = (await req.json().catch(() => ({}))) as { groupe?: unknown; uids?: unknown; changerGroupe?: unknown };
    const db = adminDb();
    if (body.changerGroupe && typeof body.changerGroupe === "object") {
      const c = body.changerGroupe as { uid?: unknown; groupe?: unknown };
      if (typeof c.uid !== "string" || typeof c.groupe !== "string") throw new HttpError(400, "Requête incomplète");
      return NextResponse.json({ ok: true, ...(await changerGroupe(db, user, c.uid, c.groupe)) });
    }
    const groupe = typeof body.groupe === "string" ? body.groupe : "";
    await exigerTenirGroupe(user, groupe, db);
    const uids = Array.isArray(body.uids) ? body.uids.filter((u): u is string => typeof u === "string").slice(0, 200) : null;
    if (!uids) throw new HttpError(400, "Requête incomplète");
    const [equipes, groupes] = await Promise.all([lireEquipes(db), lireGroupes(db)]);
    const { maj, ignores } = await recalculerRattachement(db, uids, equipes, groupes, isFondateur(user));
    return NextResponse.json({ ok: true, maj, ignores });
  } catch (e) {
    return errorResponse(e);
  }
}
