import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { exigerDroitEquipes, lireEquipes, recalculerPoles } from "@/lib/equipes/serveur";
import { EQUIPES, parseOrganigramme, rattacherNoms } from "@/lib/equipes/organigramme";
import { fetchSheet } from "@/lib/planning/sheets";
import { POLE_LABELS, type Pole } from "@/types/user";
import type { MembreEquipe } from "@/types/equipe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reprise de l'onglet ORGANIGRAMME (lot 16, T5) : lit le Sheet, rattache les
// noms aux comptes, réécrit les 13 documents equipes/{id} sous leur identifiant
// fixe — le relancer ne crée donc ni équipe ni membre en double — et repose les
// pôles des comptes touchés. Le pôle d'une équipe déjà présente n'est pas
// écrasé : seule la liste des membres vient du Sheet.

type ProfilDoc = { planningName?: string; firstName?: string; lastName?: string; poles?: Pole[] };

export async function POST(req: NextRequest) {
  try {
    const user = await optionalUser(req);
    await exigerDroitEquipes(user);

    const rows = await fetchSheet("ORGANIGRAMME");
    if (rows.length === 0) throw new HttpError(502, "Onglet ORGANIGRAMME illisible");
    const { equipes, inconnues } = parseOrganigramme(rows);

    const db = adminDb();
    const users = await db.collection("users").get();
    const profils = users.docs.map((d) => {
      const p = d.data() as ProfilDoc;
      return {
        uid: d.id,
        planningName: p.planningName ?? "",
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
      };
    });
    const nomDe = (uid: string) => {
      const p = profils.find((x) => x.uid === uid);
      return `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim() || p?.planningName || uid;
    };

    const noms = [...new Set(equipes.flatMap((e) => e.membres.map((m) => m.nom)))];
    const trouve = rattacherNoms(noms, profils);

    // Comptes déjà rangés dans une équipe : eux aussi verront leurs pôles
    // recalculés, sans quoi un retrait du Sheet resterait sans effet.
    const avant = (await lireEquipes(db)).flatMap((e) => e.membres.map((m) => m.uid));
    const polesExistants = new Map(
      (await db.collection("equipes").get()).docs.map((d) => [d.id, (d.data().pole ?? null) as Pole | null]),
    );

    const par = { parUid: user!.uid, parNom: user!.email };
    const updatedAt = new Date().toISOString();
    let membresTotal = 0;
    let rattaches = 0;
    for (const lue of equipes) {
      const def = EQUIPES.find((e) => e.id === lue.id)!;
      const membres: MembreEquipe[] = lue.membres.map((m) => ({ ...m, uid: trouve[m.nom] ?? "" }));
      membresTotal += membres.length;
      rattaches += membres.filter((m) => m.uid).length;
      await db.collection("equipes").doc(lue.id).set({
        pole: polesExistants.has(lue.id) ? polesExistants.get(lue.id)! : def.pole,
        membres,
        updatedAt,
        ...par,
      });
    }

    const apres = await lireEquipes(db);
    await recalculerPoles(db, [...avant, ...Object.values(trouve)], apres);

    const dansUneEquipe = new Set(apres.flatMap((e) => e.membres.map((m) => m.uid)).filter(Boolean));
    const polesHorsOrganigramme = users.docs
      .filter((d) => ((d.data() as ProfilDoc).poles ?? []).length > 0 && !dansUneEquipe.has(d.id))
      .map((d) => ({
        uid: d.id,
        nom: nomDe(d.id),
        poles: ((d.data() as ProfilDoc).poles ?? []).map((p) => POLE_LABELS[p] ?? p),
      }));

    return NextResponse.json({
      ok: true,
      equipes: equipes.length,
      membres: membresTotal,
      rattaches,
      nonRattaches: noms.filter((n) => !trouve[n]),
      inconnues,
      polesHorsOrganigramme,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
