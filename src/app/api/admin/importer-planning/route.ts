import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { isAdminEmail } from "@/lib/access";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { loadPlanningNameIndex } from "@/lib/push/recipients";
import { grilleDe } from "@/lib/planning/grilles";
import { fetchGrille, oublierGrille } from "@/lib/planning/grille";
import { lireSheetDe } from "@/lib/planning/sheets";
import { documentDimanche, nomsNonRattaches, planifierImport } from "@/lib/planning/import";
import { normalizeName } from "@/lib/planning/names";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Import initial d'un planning (lot 17, G4, décision T8) : les dimanches du
// Google Sheet absents de la grille de l'app y sont recopiés, une seule entrée
// d'historique nommée est laissée, et la réponse liste les noms qu'aucun
// compte ne porte. Réservé aux admins (bouton dans /admin) ; rejouable sans
// doublon (les dimanches déjà écrits sont ignorés).

export async function POST(req: NextRequest) {
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    if (!isAdminEmail(user.email)) throw new HttpError(403, "Réservé aux admins");

    const { key } = (await req.json().catch(() => ({}))) as { key?: string };
    const def = key ? grilleDe(key) : undefined;
    if (!def) throw new HttpError(400, "Planning inconnu");

    const [sheet, grille, index] = await Promise.all([
      lireSheetDe(def.key),
      fetchGrille(def.key),
      loadPlanningNameIndex(),
    ]);
    const { aEcrire, ignores } = planifierImport(sheet, grille.map((r) => r[0]));

    const db = adminDb();
    const quand = new Date().toISOString();
    const auteur = await nomDeLAuteur(db, user.uid, user.email);
    const lot = db.batch();
    for (const row of aEcrire) {
      lot.set(db.doc(`plannings/${def.key}/dimanches/${row[0]}`), documentDimanche(def, row, auteur, quand));
    }
    if (aEcrire.length) {
      lot.set(db.doc(`plannings/${def.key}/history/${Date.now().toString(36)}-${user.uid}`), {
        authorUid: user.uid,
        authorName: auteur,
        at: new Date(),
        changes: [{ kind: "import", count: aEcrire.length }],
      });
    }
    await lot.commit();
    oublierGrille(def.key);

    const comptes = [...index.keys()];
    return NextResponse.json({
      ok: true,
      importes: aEcrire.length,
      ignores,
      nomsNonRattaches: nomsNonRattaches(aEcrire, def, comptes).filter((n) => !index.has(normalizeName(n))),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

async function nomDeLAuteur(db: FirebaseFirestore.Firestore, uid: string, email: string): Promise<string> {
  const snap = await db.collection("users").doc(uid).get();
  const d = snap.data() as { firstName?: string; lastName?: string } | undefined;
  return [d?.firstName, d?.lastName].filter(Boolean).join(" ") || email;
}
