import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadNotifLangs, loadPlanningNameIndex } from "@/lib/push/recipients";
import { changementPlanningMessage, changementPlanningParDefaut } from "@/lib/push/messages";
import { isAdminEmail } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { getPlanning, droitsDePrevenir, triVisibilitiesAnnee, TRI_ORDER } from "@/lib/planning/releases";
import { getTri } from "@/lib/planning/utils";
import type { ProfilOrganigramme } from "@/lib/acces/organigramme";
import { grilleDe } from "@/lib/planning/grilles";
import { colonneDePersonnes } from "@/lib/planning/choisir";
import { normalizeName, splitNames } from "@/lib/planning/names";
import {
  borne, datesDesChangements, etatApres, personnesTouchees, premierDimancheDepuis, referenceRemplace, verifierChangements, verifierReference,
  type ChangementAnnonce, type EtatAnnonce,
} from "@/lib/planning/prevenir";
import { jourDeParis } from "@/lib/evenements/bascule";
import fr from "@/locales/fr.json";
import zh from "@/locales/zh-CN.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Prévenir des changements d'un planning publié (lot 3, docs/spec-planning-gestes.md, PG36 à PG46).
// Trois actions sur l'« état annoncé » (planningReleases/{clé}_{année}.annonces.{T}, écrit ici seulement) :
//   reference : la grille envoie les cases du trimestre telles qu'elle les affiche (après une
//               publication, ou à la première ouverture par un publieur : `siAbsent`) ;
//   ignorer   : « Ne pas prévenir » — l'état prend les valeurs actuelles des cases changées ;
//   envoyer   : idem, puis un push et une entrée de cloche PAR PERSONNE, dans sa langue.
// Réservé à `peutPrevenir` ; l'appelant et chaque changement sont revérifiés ici. Envoi manuel : ni
// préférences de notification, ni `notifLog` (le double clic est arrêté par la transaction).

class Conflit extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, max = 200): v is string => typeof v === "string" && v.length <= max;

function changementsValides(v: unknown): v is ChangementAnnonce[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 500 && v.every((c) =>
    c && typeof c === "object" && str(c.date, 10) && DATE.test(c.date) && str(c.cle, 40) && /^[A-Za-z0-9]+$/.test(c.cle) && str(c.avant) && str(c.apres));
}

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 });

  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let uid: string;
  let email: string;
  try {
    const decoded = await verifyIdToken(token);
    uid = decoded.uid;
    email = (decoded.email ?? "").toLowerCase();
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string; key?: string; annee?: number; tri?: string; cases?: unknown; siAbsent?: boolean; apresPublication?: boolean;
    changements?: unknown; noms?: unknown; titre?: unknown; message?: unknown;
  };
  const planning = body.key ? getPlanning(body.key) : undefined;
  const definition = body.key ? grilleDe(body.key) : undefined;
  const annee = body.annee;
  const tri = body.tri;
  if (!planning || !definition || typeof annee !== "number" || !Number.isInteger(annee) || annee < 2026 || annee > 2100 ||
    !tri || !(TRI_ORDER as readonly string[]).includes(tri) || !["reference", "ignorer", "envoyer"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // Droits de l'appelant, relus ici (jamais crus sur parole).
  const isAdmin = isAdminEmail(email);
  // Lot 2 (OG23) : aussi `publieParRole` et `notifieParRole`, relus (interrupteur ouvert seulement). Lot AO : et l'organigramme
  // (`referentDe`…), que `droitsDePrevenir` lit à la place de `notify`. Lot RS : `responsabilites` (le gestionnaire du
  // planning prévient, la Régie et `notifieParRole` ne comptent plus), relu avec le reste du profil.
  const me = isAdmin
    ? null
    : ((await adminDb().collection("users").doc(uid).get()).data() as
      ({ notify?: string[]; publieParRole?: string[]; notifieParRole?: string[] } & ProfilOrganigramme) | undefined) ?? null;
  if (!droitsDePrevenir(planning, isAdmin, me)) return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });

  const db = adminDb();
  const ref = db.collection("planningReleases").doc(`${planning.key}_${annee}`);
  const maintenant = new Date().toISOString();
  const lireEtat = (data: FirebaseFirestore.DocumentData | undefined): EtatAnnonce | undefined => {
    const e = data?.annonces?.[tri] as EtatAnnonce | undefined;
    return e && typeof e === "object" ? { ...e, cases: e.cases ?? {} } : undefined;
  };

  // ── reference ──
  // Sans `siAbsent` ni `apresPublication`, rien : une référence n'écrase pas un état existant à la demande.
  const dimanchesDe = async (dates: string[], lire: (r: FirebaseFirestore.DocumentReference[]) => Promise<FirebaseFirestore.DocumentSnapshot[]>) => {
    const col = db.collection("plannings").doc(planning.key).collection("dimanches");
    const docs = dates.length ? await lire(dates.map((d) => col.doc(d))) : [];
    return Object.fromEntries(docs.map((d) => [d.id, (d.data() ?? {}) as Record<string, string>]));
  };
  if (body.action === "reference") {
    const cases = body.cases;
    if ((!body.siAbsent && !body.apresPublication) || !cases || typeof cases !== "object" || Array.isArray(cases) ||
      !Object.values(cases).every((v) => typeof v === "string")) {
      return NextResponse.json({ error: "Cases invalides" }, { status: 400 });
    }
    const tronquees = Object.fromEntries(Object.entries(cases as Record<string, string>).map(([k, v]) => [k, borne(v)]));
    const dates = [...new Set(Object.keys(tronquees).map((k) => k.split("|")[0]))];
    const ecrit = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existant = lireEtat(snap.data());
      const dimanches = await dimanchesDe(dates, (r) => tx.getAll(...r));
      const verdict = verifierReference(tronquees, dimanches, { annee, tri });
      if (!verdict.ok) throw new Conflit(verdict.raison);
      // Le trimestre doit être visible des membres (publié, en cours ou passé) : jamais un brouillon (PG34).
      const jour = jourDeParis();
      const publies = (snap.data()?.published as string[] | undefined) ?? [];
      const visible = triVisibilitiesAnnee(annee, Number(jour.slice(0, 4)), publies, getTri(jour), false).some((v) => v.tri === tri && v.visible);
      if (!visible || (body.apresPublication && !publies.includes(tri))) throw new Conflit("trimestre non publié");
      // Trimestre publié une fois, masqué puis republié : la référence reste (referenceRemplace).
      if (!referenceRemplace(body, existant)) return false;
      const publieLe = body.apresPublication ? jour : existant?.publieLe;
      tx.set(ref, { annonces: { [tri]: { cases: tronquees, le: maintenant, par: uid, ...(publieLe ? { publieLe } : {}) } } }, { mergeFields: [`annonces.${tri}`] });
      return true;
    }).catch((e) => { if (e instanceof Conflit) return null; throw e; });
    if (ecrit === null) return NextResponse.json({ error: "Référence refusée" }, { status: 400 });
    return NextResponse.json({ ok: true, ecrit });
  }

  // ── ignorer / envoyer ──
  if (!changementsValides(body.changements)) return NextResponse.json({ error: "Changements invalides" }, { status: 400 });
  const changements = body.changements;
  const dimancheEnCours = premierDimancheDepuis(jourDeParis());
  const dates = datesDesChangements(changements);

  // Les comptes et les langues se lisent AVANT la transaction : un échec ici ne touche pas à l'état annoncé.
  const index = body.action === "envoyer" ? await loadPlanningNameIndex() : new Map<string, string[]>();
  const personnes = personnesTouchees(changements, (nom) => index.has(normalizeName(nom)));
  const coches = new Set((Array.isArray(body.noms) ? body.noms : []).filter((n): n is string => typeof n === "string").map(normalizeName));
  const choisies = personnes.filter((p) => p.compte && coches.has(normalizeName(p.nom)));
  const parUid = new Map<string, string[]>();
  for (const p of choisies) for (const u of index.get(normalizeName(p.nom)) ?? []) parUid.set(u, [...(parUid.get(u) ?? []), p.nom]);
  const langs = await loadNotifLangs([...parUid.keys()]);

  let dimanches: Record<string, Record<string, string>> = {};
  try {
    await db.runTransaction(async (tx) => {
      const etat = lireEtat((await tx.get(ref)).data());
      dimanches = await dimanchesDe(dates, (r) => tx.getAll(...r));
      const verdict = verifierChangements(etat, dimanches, changements, dimancheEnCours, { annee, tri },
        new Set(definition.colonnes.filter((c) => !c.lectureSeule).map((c) => c.cle)));
      if (!verdict.ok) throw new Conflit(verdict.raison);
      tx.set(ref, { annonces: { [tri]: { ...(etat?.publieLe ? { publieLe: etat.publieLe } : {}), cases: etatApres(etat, changements), le: maintenant, par: uid } } }, { mergeFields: [`annonces.${tri}`] });
    });
  } catch (e) {
    if (e instanceof Conflit) return NextResponse.json({ error: "Le planning a changé entre-temps" }, { status: 409 });
    throw e;
  }
  if (body.action === "ignorer") return NextResponse.json({ ok: true });

  // L'état est validé : le double clic ne repasse plus la vérification. Reste l'envoi.
  const titre = str(body.titre, 200) && body.titre.trim() ? body.titre : undefined;
  const message = str(body.message, 1000) && body.message.trim() ? body.message : undefined;
  const tag = `planning-${planning.key}-${annee}-${tri}-${Date.now()}`;

  let prevenus = 0;
  for (const [u, noms] of parUid) {
    const lang = langs.get(u) ?? "fr";
    const libelles = (lang === "zh-CN" ? zh : fr).planning.roles as Record<string, string>;
    const siens = new Set(noms.map(normalizeName));
    const jours = datesDesChangements(changements.filter((c) => personnes.some((p) => siens.has(normalizeName(p.nom)) && p.motifs.some((m) => m.date === c.date && m.cle === c.cle)))).map((date) => ({
      date,
      // Sa place APRÈS le changement, toutes colonnes confondues, lue dans le document du dimanche.
      roles: definition.colonnes
        .filter((c) => colonneDePersonnes(c.cle) && splitNames(dimanches[date]?.[c.cle] ?? "").some((n) => siens.has(normalizeName(n))))
        .map((c) => libelles[c.i18n.replace("planning.roles.", "")] ?? c.cle),
    }));
    const defaut = changementPlanningParDefaut({ label: planning.label, dates }, lang);
    const msg = changementPlanningMessage({ titre: titre ?? defaut.title, message: message ?? defaut.body, jours }, lang);
    try {
      await sendPushToUids([u], { ...msg, url: "/mes-services", tag });
      await recordNotification({ ...msg, url: "/mes-services", kind: "manual", recipients: [u] });
      prevenus++;
    } catch {
      // Une personne injoignable ne bloque pas les autres.
    }
  }
  return NextResponse.json({ ok: true, prevenus, sansCompte: personnes.filter((p) => !p.compte).map((p) => p.nom) });
}
