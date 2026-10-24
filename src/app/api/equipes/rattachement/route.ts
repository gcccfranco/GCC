import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { isAdminEmail } from "@/lib/access";
import { exigerDroitEquipes, lireEquipes, lireGroupes, appelantPeut, recalculerDepuisOrganigramme, recalculerRattachement } from "@/lib/equipes/serveur";
import { BACK_OFFICE } from "@/lib/backOffice"
import type { ProfilOrganigramme } from "@/lib/acces/organigramme";
import { lireUidsRattachement } from "@/lib/push/bornes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rattachement aux équipes (lot 16, D4 du 18/09/2026 ; route renommée au
// lot 1 du chantier « équipes et groupes », EQ28). `users/{uid}.dansEquipes` et `referentDe`
// restent fermés au navigateur (`allow update: if isAdmin()` dans firestore.rules) : c'est
// cette route qui les repose, après avoir revérifié que l'appelant a bien le droit de tenir
// l'organigramme. Elle n'écrit que ce que les équipes disent — l'appelant ne choisit que les
// comptes à recalculer. `{ tous: true }` (bouton admin « Recalculer depuis l'organigramme »,
// lot U6, R4) le fait pour tous les membres des équipes : admins seuls.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  try {
    const user = await optionalUser(req);
    await exigerDroitEquipes(user);
    const raw = await req.json().catch(() => ({}));
    const body = (raw && typeof raw === "object" ? raw : {}) as { tous?: unknown };
    if (body.tous === true) {
      if (!isAdminEmail(user!.email)) throw new HttpError(403, "Réservé aux admins");
      return NextResponse.json({ ok: true, maj: await recalculerDepuisOrganigramme(adminDb()) });
    }
    const uids = lireUidsRattachement(raw);

    const db = adminDb();
    // Les référents que la recopie ajoute ne passent que si l'appelant peut changer ceux de l'équipe (profil relu ici).
    const profilAppelant = ((await db.collection("users").doc(user!.uid).get()).data() ?? null) as ProfilOrganigramme | null;
    const admin = isAdminEmail(user!.email);
    const peut = appelantPeut(admin, profilAppelant);
    // Les groupes aussi (lot 2, OG20) : la recopie n'efface ni les ids de comité ni les listes par rôle.
    const [equipes, groupes] = await Promise.all([lireEquipes(db), lireGroupes(db)]);
    const { maj } = await recalculerRattachement(db, uids, equipes, groupes, { peut });
    return NextResponse.json({ ok: true, maj });
  } catch (e) {
    return errorResponse(e);
  }
}
