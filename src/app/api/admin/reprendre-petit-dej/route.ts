import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { isAdminEmail } from "@/lib/access";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { fetchGrille } from "@/lib/planning/grille";
import { lireTableSheet } from "@/lib/planning/sheets";
import { currentSundayStr } from "@/lib/planning/utils";
import { grillePourReprise, lirePetitDej, oublierPetitDej, planifierReprise } from "@/lib/petitdej/lignes";
import { BACK_OFFICE } from "@/lib/backOffice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// La reprise du petit déj (lot U3, PD5, docs/spec-petit-dej.md, T11 et Q13) :
// les noms à venir de la grille Table, telle qu'elle s'affichait avant U3
// (grille de l'app réunie au Sheet, colonne 2, `grillePourReprise`), deviennent des lignes
// `petitDej/{id}`, une par case, texte tel quel, `uid` vide. Un dimanche qui a
// déjà une ligne est ignoré : relancer n'écrit rien de plus. Réservée aux admins
// (bouton dans /admin), sur le patron de l'import G4 ; à lancer une fois, le
// jour du retrait de l'interrupteur.

export async function POST(req: NextRequest) {
  // Back-office coupé (Q14) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 });
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    if (!isAdminEmail(user.email)) throw new HttpError(403, "Réservé aux admins");

    // Les lignes relues en base, jamais le cache de cinq minutes de l'instance :
    // une seconde reprise doit voir celles que la première a écrites. Une
    // lecture en échec lève (Q10) : rien n'est écrit.
    oublierPetitDej();
    const [grille, sheet, lignes] = await Promise.all([fetchGrille("table"), lireTableSheet(), lirePetitDej()]);
    // Sheet illisible : rien n'est repris, l'admin relance plus tard (relancer est sans risque).
    const aReprendre = grillePourReprise(grille, sheet);
    if (!aReprendre) throw new HttpError(503, "Sheet du planning illisible : rien n'est repris, relance plus tard.");
    const { aEcrire, ignores } = planifierReprise(aReprendre, lignes, currentSundayStr());

    const db = adminDb();
    const quand = new Date().toISOString();
    const lot = db.batch();
    for (const { dimanche, nom } of aEcrire) {
      lot.create(db.collection("petitDej").doc(), {
        dimanche, nom, uid: "", auteurUid: user.uid, creeLe: quand, modifieLe: quand,
      });
    }
    await lot.commit();
    oublierPetitDej();

    return NextResponse.json({ ok: true, reprises: aEcrire.length, ignores });
  } catch (e) {
    return errorResponse(e);
  }
}
