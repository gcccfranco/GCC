// Résolution « noms du planning Google Sheet » → comptes (uid).
// Serveur uniquement.

import { adminDb } from "./admin";
import { normalizeName } from "@/lib/planning/names";
import { ADMIN_EMAILS } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { estDuGroupe } from "@/lib/groupes/organigramme";
import { groupeDeLaCategorie } from "@/lib/groupes/table";
import { categoriesVisibles, type ProfilOrganigramme } from "@/lib/acces/organigramme";
import type { ServiceRole, NotifType, NotifLang } from "@/types/user";

/** « Sert dans cette catégorie » (annonces par section, scène, personnes précises). Ancien mode : la clé dans
 *  `serviceRoles`. Lot AO (`backOffice`, A4) : ce que l'organigramme ouvre (`categoriesVisibles` : lieux de Louange et
 *  de Régie, groupe, classes de l'EDD) ; `avecGroupe` ajoute le groupe lui-même, y compris Amour et Joie qui n'ont pas
 *  de setlists. */
function sertDans(data: FirebaseFirestore.DocumentData, categorie: string, backOffice: boolean, avecGroupe = false): boolean {
  if (!backOffice) return categorie in ((data.serviceRoles ?? {}) as Record<string, ServiceRole[]>);
  if (categoriesVisibles(data as ProfilOrganigramme).includes(categorie)) return true;
  return avecGroupe && !!groupeDeLaCategorie(categorie) && groupeDeLaCategorie(categorie)?.id === data.groupe;
}

/** uid des comptes administrateurs (ADMIN_EMAILS). Cible des notifications de
 *  signalement. Serveur uniquement (Admin, lit tous les profils). */
export async function adminUids(): Promise<string[]> {
  const wanted = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()));
  const snap = await adminDb().collection("users").get();
  const out: string[] = [];
  for (const doc of snap.docs) {
    const email = (doc.data().email as string | undefined)?.toLowerCase();
    if (email && wanted.has(email)) out.push(doc.id);
  }
  return out;
}

/** Index normalize(planningName) → uid(s). Plusieurs comptes peuvent partager
 *  une même graphie (rare) : on garde une liste. Lit tous les profils (Admin). */
export async function loadPlanningNameIndex(): Promise<Map<string, string[]>> {
  const snap = await adminDb().collection("users").get();
  const map = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const pn = (doc.data().planningName as string | undefined)?.trim();
    if (!pn) continue;
    const key = normalizeName(pn);
    const arr = map.get(key) ?? [];
    arr.push(doc.id);
    map.set(key, arr);
  }
  return map;
}

/** Convertit une liste de noms de planning en uid (dédupliqués).
 *  Les noms sans compte correspondant sont ignorés (choix produit) et renvoyés
 *  dans `unresolved` pour un éventuel log serveur. */
export function resolveNamesToUids(
  names: string[],
  index: Map<string, string[]>
): { uids: string[]; unresolved: string[] } {
  const uids = new Set<string>();
  const unresolved: string[] = [];
  for (const name of names) {
    const hit = index.get(normalizeName(name));
    if (hit?.length) hit.forEach((u) => uids.add(u));
    else unresolved.push(name);
  }
  return { uids: [...uids], unresolved };
}

/** uid des comptes qui servent dans `category` (clé de serviceRoles ; lot AO, `backOffice` : ce que l'organigramme
 *  ouvre, `categoriesVisibles`). Cible des annonces poussées par section. Serveur uniquement (Admin, lit tous les
 *  profils). La base se passe pour les tests. */
export async function uidsForCategory(
  category: string,
  db: FirebaseFirestore.Firestore = adminDb(),
  backOffice: boolean = BACK_OFFICE,
): Promise<string[]> {
  const snap = await db.collection("users").get();
  return snap.docs.filter((d) => sertDans(d.data(), category, backOffice)).map((d) => d.id);
}

/** uid des comptes d'une audience de groupe (lot 2, OG28, décision 45 : tout le groupe) : la clé
 *  dans `serviceRoles` (comme avant, D17) ou le groupe de la personne (`groupeDe`, interrupteur
 *  ouvert seulement, OG27). Pour une autre catégorie, la clé seule — comme `uidsForCategory`.
 *  Cible de la publication d'un trimestre et de Notifier. La base se passe pour les tests. */
export async function uidsDuGroupe(
  categorie: string,
  db: FirebaseFirestore.Firestore = adminDb(),
  backOffice: boolean = BACK_OFFICE,
): Promise<string[]> {
  const snap = await db.collection("users").get();
  // Lot AO (`backOffice`) : aussi ceux que l'organigramme met dans cette catégorie (lieux de Louange et de Régie,
  // classes de l'EDD) — les profils d'après la migration n'ont plus de `serviceRoles`.
  return snap.docs
    .filter((d) => estDuGroupe(d.data(), categorie, backOffice) || (backOffice && sertDans(d.data(), categorie, true)))
    .map((d) => d.id);
}

/** Est-ce une audience de l'organigramme (lot AO) : `equipe:<id>` ou `louange:<sous-équipe>` ? */
const estAudienceOrganigramme = (a: string) => a.startsWith("equipe:") || a.startsWith("louange:");

/** Le compte fait-il partie de cette audience de l'organigramme ? `equipe:<id>` : `dansEquipes` ∋ id ;
 *  `louange:<s>` : `sousEquipes` ∋ s (champs recopiés par le serveur). Toute autre audience : non. */
export function estDeLAudienceOrganigramme(data: FirebaseFirestore.DocumentData, audience: string): boolean {
  const liste = (k: string) => (Array.isArray(data[k]) ? (data[k] as string[]) : []);
  if (audience.startsWith("equipe:")) return liste("dansEquipes").includes(audience.slice("equipe:".length));
  if (audience.startsWith("louange:")) return liste("sousEquipes").includes(audience.slice("louange:".length));
  return false;
}

/** uid des comptes d'une audience de l'organigramme (lot AO, notify-audience) : `equipe:<id>` ou
 *  `louange:<sous-équipe>`. La base se passe pour les tests. */
export async function uidsDeLAudienceOrganigramme(
  audience: string,
  db: FirebaseFirestore.Firestore = adminDb(),
): Promise<string[]> {
  if (!estAudienceOrganigramme(audience)) return [];
  const snap = await db.collection("users").get();
  return snap.docs.filter((d) => estDeLAudienceOrganigramme(d.data(), audience)).map((d) => d.id);
}

/** Les personnes qu'un expéditeur peut viser une à une (Notifier, « personnes précises ») : celles
 *  d'au moins une de ses audiences, membres des groupes compris (OG24, OG28). Lit les profils une fois. */
export async function uidsDesAudiences(
  categories: string[],
  db: FirebaseFirestore.Firestore = adminDb(),
  backOffice: boolean = BACK_OFFICE,
): Promise<Set<string>> {
  if (!categories.length) return new Set();
  const snap = await db.collection("users").get();
  // Lot AO (`backOffice`) : « sert dans la catégorie » vient de l'organigramme (plus de `serviceRoles`), et les audiences
  // `equipe:<id>` / `louange:<s>` sont celles des équipes et sous-équipes.
  const dedans = (data: FirebaseFirestore.DocumentData, c: string) => backOffice
    ? estDeLAudienceOrganigramme(data, c) || sertDans(data, c, true, true)
    : estDuGroupe(data, c, false);
  return new Set(snap.docs.filter((d) => categories.some((c) => dedans(d.data(), c))).map((d) => d.id));
}

/** Ensemble des uid servant dans au moins une des `categories` (clés de serviceRoles).
 *  Sert à valider qu'un expéditeur a le droit de notifier des personnes précises
 *  (elles doivent appartenir à une catégorie qu'il peut notifier). Lit tous les
 *  profils une seule fois. Serveur uniquement. */
export async function uidsForCategories(
  categories: string[],
  db: FirebaseFirestore.Firestore = adminDb(),
  backOffice: boolean = BACK_OFFICE,
): Promise<Set<string>> {
  const wanted = [...new Set(categories)];
  const out = new Set<string>();
  if (!wanted.length) return out;
  const snap = await db.collection("users").get();
  for (const doc of snap.docs) {
    // Lot AO (`backOffice`) : `categoriesVisibles` de l'organigramme au lieu des clés de `serviceRoles`.
    if (wanted.some((c) => sertDans(doc.data(), c, backOffice))) out.add(doc.id);
  }
  return out;
}

/** Retire les uid ayant désactivé ce type de notification (doc notifPrefs/{uid}).
 *  Absence de doc ou de champ = activé (défaut). Sert à respecter les préférences
 *  sur les envois AUTOMATIQUES (rappels, setlist prête, annonce) — pas les envois
 *  manuels. Serveur uniquement (Admin). */
export async function filterUidsByNotifPref(uids: string[], type: NotifType): Promise<string[]> {
  if (!uids.length) return [];
  const db = adminDb();
  const snaps = await db.getAll(...uids.map((u) => db.collection("notifPrefs").doc(u)));
  // On garde tout uid qui n'a pas EXPLICITEMENT mis ce type à false.
  return snaps.filter((s) => !(s.exists && s.data()?.[type] === false)).map((s) => s.id);
}

/** Langue de chaque uid pour les envois automatiques (notifPrefs/{uid}.lang,
 *  écrite par la navbar) ; document ou champ absent = français. Serveur uniquement. */
export async function loadNotifLangs(uids: string[]): Promise<Map<string, NotifLang>> {
  const out = new Map<string, NotifLang>();
  if (!uids.length) return out;
  const db = adminDb();
  const snaps = await db.getAll(...uids.map((u) => db.collection("notifPrefs").doc(u)));
  for (const s of snaps) out.set(s.id, s.exists && s.data()?.lang === "zh-CN" ? "zh-CN" : "fr");
  return out;
}
