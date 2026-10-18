import { auth } from "@/lib/firebase/config";
import { SERVICE_LIEUX } from "@/types/user";
import { BACK_OFFICE } from "@/lib/backOffice";
import type { SetlistItem } from "@/types/setList";

// ─── Categories ───────────────────────────────────────────────────────────────

// Catégories à accès restreint = les lieux de service (source unique : SERVICE_LIEUX).
export const RESTRICTED_CATEGORIES = SERVICE_LIEUX;

export const FREE_CATEGORIES = [
  "Groupe Paix",
  "Groupe Fidélité",
  "Groupe Bonté",
  "中班",
  "大班",
  "高班",
] as const;

export const ALL_CATEGORIES = [...RESTRICTED_CATEGORIES, ...FREE_CATEGORIES];

/** Catégories des setlists de fête (docs/spec-chants-fetes.md, décision 32). Hors de `ALL_CATEGORIES` :
 *  on ne crée jamais une setlist de fête depuis « Nouvelle setlist », et les écrans qui parcourent
 *  `ALL_CATEGORIES` (statistiques, prochaines setlists, profil) ne changent pas. */
export const FETE_CATEGORIES = ["Noël", "Pâques"] as const;

// ─── Firestore types ──────────────────────────────────────────────────────────

export interface FSSetlist {
  id: string;
  title: string;
  leader: string;
  category: string;
  date: string;
  language: "fr" | "zh" | "mixed";
  notes: string;
  /** Séance Campus liée — distingue matin/soir d'un même jour pour le matching
   *  setlist↔service. Absent pour les setlists hors planning / autres catégories. */
  moment?: "matin" | "soir";
  createdAt: Date | null;
  updatedAt?: Date | null;
  items: SetlistItem[];
  isDraft?: boolean;
  isPrivate?: boolean;
  ownerId?: string | null;
  /** Lien de la présentation (PPT) de la régie — écrit par /api/setlist/presentation. */
  presentationUrl?: string;
  /** L'équipe de la setlist (docs/spec-partage-setlist.md) : uids qui la voient et la modifient,
   *  choisis par le propriétaire ou un admin. Absent = personne. */
  editeurs?: string[];
  /** Rôle de chaque personne de `editeurs`, pour l'affichage (absent = musicien). */
  rolesPartage?: Record<string, "musicien" | "chanteur">;
  /** Setlist d'un passage de fête (docs/spec-chants-fetes.md) : l'édition (`programmes/{id}`), le
   *  passage et son seul « Qui » à la dernière saisie. Écrit par le serveur seul ; absent = setlist
   *  ordinaire. */
  fete?: { programme: string; passage: string; qui: string };
  /** Corbeille (SC2, docs/spec-createur-corbeille-absences.md) : date-heure ISO de la mise à la corbeille
   *  et uid de qui l'a faite. Absents = setlist en place ; présents = elle n'apparaît que dans la corbeille
   *  et le cron la purge après 30 jours. */
  supprimeeLe?: string;
  supprimeePar?: string;
}

// ─── Firestore REST API ───────────────────────────────────────────────────────
// Using the REST API instead of the Firebase SDK to avoid WebChannel
// connectivity issues in certain browser environments.

export const FS_BASE = "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents";

export async function authHeader(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// ─── Value conversion: JS → Firestore REST ────────────────────────────────────

function toFsValue(v: unknown): unknown {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, toFsValue(val)])
        ),
      },
    };
  }
  return { nullValue: null };
}

export function toFsFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFsValue(v)]));
}

// ─── Value conversion: Firestore REST → JS ────────────────────────────────────

export function fromFsValue(v: unknown): unknown {
  if (typeof v !== "object" || v === null) return null;
  const val = v as Record<string, unknown>;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue as string, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("timestampValue" in val) {
    return new Date(val.timestampValue as string);
  }
  if ("arrayValue" in val) {
    const arr = val.arrayValue as { values?: unknown[] };
    return (arr.values ?? []).map(fromFsValue);
  }
  if ("mapValue" in val) {
    const map = val.mapValue as { fields?: Record<string, unknown> };
    return Object.fromEntries(
      Object.entries(map.fields ?? {}).map(([k, v2]) => [k, fromFsValue(v2)])
    );
  }
  return null;
}

export type RawDoc = { name: string; fields: Record<string, unknown>; createTime?: string };

function fromFsDoc(raw: RawDoc): FSSetlist {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields).map(([k, v]) => [k, fromFsValue(v)])
  );
  return { id, ...data } as FSSetlist;
}

export async function checkRest(res: Response): Promise<void> {
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ??
        `Erreur Firestore (HTTP ${res.status})`
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

/** Sans l'interrupteur du back-office, une setlist de fête n'existe pas : local et en ligne partagent le même
 *  Firestore (docs/spec-chants-fetes.md, CF24). Un seul endroit pour toutes les lectures. */
const sansFetes = (s: FSSetlist): boolean => BACK_OFFICE || !s.fete;

/** Une setlist à la corbeille (`supprimeeLe`) n'apparaît dans aucune lecture ordinaire (SC2.2). */
const horsCorbeille = (s: FSSetlist): boolean => !s.supprimeeLe;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getSetlists(): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => !s.isPrivate && !s.isDraft && sansFetes(s) && horsCorbeille(s));
}

/** Setlists datées de `today` (AAAA-MM-JJ) ou après, par date, `max` au plus : la lecture
 *  bornée des « Prochaines setlists » de Chants (lot U5, docs/spec-deux-volets.md, Q17).
 *  Un seul champ, donc un index simple. Rien n'est filtré ici : brouillons, privées et
 *  visibilité se trient côté client (`upcomingSetlists`). Hors ligne : rien.
 *  `strict` : un refus (jeton expiré, règle) lève au lieu de rendre `[]` — « Pour quel
 *  service ? » (lot U5 bis) ne doit pas re-proposer un service déjà préparé. */
export async function getSetlistsFrom(today: string, max = 30, { strict = false } = {}): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        where: {
          fieldFilter: { field: { fieldPath: "date" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: today } },
        },
        orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }],
        limit: max,
      },
    }),
  });
  if (!res.ok) {
    if (strict) await checkRest(res);
    return [];
  }
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsDoc(r.document!)).filter((s) => sansFetes(s) && horsCorbeille(s));
}

/** Setlists datées de `depuis` (« AAAA-MM-JJ ») ou après, ni privées ni brouillons : celles du
 *  tableau de bord du Back-Office (lot U6). Filtre mono-champ, pas d'index composite. Contrairement
 *  à `getSetlists`, lève si la lecture échoue : un widget dit alors « Lecture impossible »,
 *  jamais « Pas de setlist ». */
export async function getSetlistsDepuis(depuis: string): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        where: { fieldFilter: { field: { fieldPath: "date" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: depuis } } },
      },
    }),
  });
  await checkRest(res);
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => !s.isPrivate && !s.isDraft && sansFetes(s) && horsCorbeille(s));
}

/** Setlists récentes pour le badge de notifications (cloche). Deux requêtes
 *  mono-champ fusionnées : `createdAt` (toutes les setlists) capte les créations,
 *  `updatedAt` (présent seulement sur les setlists éditées) capte les mises à
 *  jour. Si `sinceMs > 0`, ne lit que ce qui est postérieur (incrémental →
 *  ~0 lecture quand rien de neuf). Chaque requête est mono-champ → pas d'index
 *  composite requis. */
export async function getSetlistsSince(sinceMs: number, max: number): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const queryByField = async (field: "createdAt" | "updatedAt"): Promise<FSSetlist[]> => {
    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId: "setlists" }],
      orderBy: [{ field: { fieldPath: field }, direction: "DESCENDING" }],
      limit: max,
    };
    if (sinceMs > 0) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: field },
          op: "GREATER_THAN",
          value: { timestampValue: new Date(sinceMs).toISOString() },
        },
      };
    }
    const res = await fetch(`${FS_BASE}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ structuredQuery }),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ document?: RawDoc }>;
    return rows.filter((r) => r.document).map((r) => fromFsDoc(r.document!));
  };

  const [created, updated] = await Promise.all([
    queryByField("createdAt"),
    queryByField("updatedAt"),
  ]);
  const byId = new Map<string, FSSetlist>();
  for (const s of [...created, ...updated]) byId.set(s.id, s);
  return [...byId.values()].filter((s) => !s.isPrivate && !s.isDraft && sansFetes(s) && horsCorbeille(s));
}

/** Les setlists dont `uid` est de l'équipe (`editeurs`), brouillons écartés. Refiltrée par
 *  l'appelant : la requête n'est pas crue sur parole. */
export async function getSetlistsPartagees(uid: string): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        where: {
          fieldFilter: { field: { fieldPath: "editeurs" }, op: "ARRAY_CONTAINS", value: { stringValue: uid } },
        },
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => !s.isDraft && !!s.editeurs?.includes(uid) && sansFetes(s) && horsCorbeille(s));
}

/** Les setlists d'une édition de fête (`fete.programme`), brouillons écartés, refiltrées côté client
 *  (la requête n'est pas crue sur parole). Sans l'interrupteur du back-office : rien (CF24). */
export async function getSetlistsDeFete(programme: string): Promise<FSSetlist[]> {
  if (!BACK_OFFICE) return [];
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        where: {
          fieldFilter: { field: { fieldPath: "fete.programme" }, op: "EQUAL", value: { stringValue: programme } },
        },
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => !s.isDraft && s.fete?.programme === programme && horsCorbeille(s));
}

export async function getMySetlists(uid: string): Promise<FSSetlist[]> {
  const headers = await authHeader();
  // No orderBy to avoid requiring a composite index on (ownerId, createdAt).
  // Sorting is done client-side instead.
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "ownerId" },
            op: "EQUAL",
            value: { stringValue: uid },
          },
        },
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => s.isPrivate === true && !s.isDraft && sansFetes(s) && horsCorbeille(s))
    .sort((a, b) => {
      const aTs = a.createdAt?.getTime() ?? 0;
      const bTs = b.createdAt?.getTime() ?? 0;
      return bTs - aTs;
    });
}

export async function getSetlist(id: string): Promise<FSSetlist | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/setlists/${id}`, { headers });
  // 404 = inexistante, 403 = accès refusé par les rules (setlist privée d'un
  // autre) → null. Toute autre erreur (réseau, 5xx) est levée pour que
  // l'appelant puisse proposer de réessayer au lieu d'afficher « introuvable ».
  if (res.status === 404 || res.status === 403) return null;
  await checkRest(res);
  const raw = await res.json() as RawDoc;
  const setlist = fromFsDoc(raw);
  return sansFetes(setlist) && horsCorbeille(setlist) ? setlist : null;
}

export async function createSetlist(
  data: Omit<FSSetlist, "id" | "createdAt">
): Promise<string> {
  const headers = await authHeader();
  const fields = {
    ...toFsFields(data as Record<string, unknown>),
    createdAt: { timestampValue: new Date().toISOString() },
  };

  const res = await withTimeout(
    fetch(`${FS_BASE}/setlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ fields }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );

  await checkRest(res);
  const doc = await res.json() as RawDoc;
  return doc.name.split("/").pop()!;
}

export async function updateSetlist(
  id: string,
  data: Partial<Omit<FSSetlist, "id" | "createdAt">>
): Promise<void> {
  const headers = await authHeader();
  const fields = {
    ...toFsFields(data as Record<string, unknown>),
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const docName = `projects/gcclouange/databases/(default)/documents/setlists/${id}`;
  const mask = [...Object.keys(data), "updatedAt"]
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const res = await withTimeout(
    fetch(`${FS_BASE}/setlists/${id}?${mask}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name: docName, fields }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );

  await checkRest(res);
}

const MASQUE_CORBEILLE = ["supprimeeLe", "supprimeePar"]
  .map((f) => `updateMask.fieldPaths=${f}`)
  .join("&");

/** Met une setlist à la corbeille (SC2.1) : deux champs, pas de `updatedAt` (la setlist n'a pas été
 *  modifiée, et la cloche ne doit pas la signaler). Se défait par `restaurerSetlist`. */
export async function mettreALaCorbeille(id: string, uid: string): Promise<void> {
  const headers = await authHeader();
  const docName = `projects/gcclouange/databases/(default)/documents/setlists/${id}`;
  const res = await withTimeout(
    fetch(`${FS_BASE}/setlists/${id}?${MASQUE_CORBEILLE}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        name: docName,
        fields: toFsFields({ supprimeeLe: new Date().toISOString(), supprimeePar: uid }),
      }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );
  await checkRest(res);
}

/** Comme `deleteSetlists` : séquentiel, continue après un échec, rend les réussies et les ratées. */
export async function mettreALaCorbeilleGroupe(ids: string[], uid: string): Promise<{ ok: string[]; ko: string[] }> {
  const ok: string[] = [];
  const ko: string[] = [];
  for (const id of ids) {
    try {
      await mettreALaCorbeille(id, uid);
      ok.push(id);
    } catch {
      ko.push(id);
    }
  }
  return { ok, ko };
}

/** Sort une setlist de la corbeille (SC2.4) : le masque nomme les deux champs, le corps n'en porte
 *  aucun, Firestore les retire. */
export async function restaurerSetlist(id: string): Promise<void> {
  const headers = await authHeader();
  const docName = `projects/gcclouange/databases/(default)/documents/setlists/${id}`;
  const res = await withTimeout(
    fetch(`${FS_BASE}/setlists/${id}?${MASQUE_CORBEILLE}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name: docName, fields: {} }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );
  await checkRest(res);
}

/** Les setlists à la corbeille, la plus récemment supprimée d'abord. Même requête que `getSetlists` ;
 *  l'appelant garde celles que la personne pourrait supprimer. */
export async function getCorbeille(): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => !!s.supprimeeLe && !s.isDraft && sansFetes(s))
    .sort((a, b) => (b.supprimeeLe ?? "").localeCompare(a.supprimeeLe ?? ""));
}

export async function deleteSetlist(id: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/setlists/${id}`, { method: "DELETE", headers });
  // Sans ce contrôle, un refus des règles (403) se résolvait comme une
  // réussite : la fiche redirigeait vers une liste où la setlist était encore
  // là (docs/spec-suppression-groupee.md, R2).
  await checkRest(res);
}

/** Supprime plusieurs setlists l'une après l'autre, et **continue après un
 *  échec** : une suppression Firestore ne s'annule pas, seule la réussite
 *  partielle est honnête (docs/spec-suppression-groupee.md, R2). Séquentiel
 *  pour garder l'ordre de la liste et ne pas lancer dix DELETE d'un coup. */
export async function deleteSetlists(ids: string[]): Promise<{ ok: string[]; ko: string[] }> {
  const ok: string[] = [];
  const ko: string[] = [];
  for (const id of ids) {
    try {
      await deleteSetlist(id);
      ok.push(id);
    } catch {
      ko.push(id);
    }
  }
  return { ok, ko };
}

/** Duplique une setlist en copie privée appartenant au duplicateur.
 *  Il peut ensuite la republier via l'édition (isPrivate → false). */
export async function duplicateSetlist(
  source: FSSetlist,
  uid: string,
  title: string
): Promise<string> {
  return createSetlist({
    title,
    leader: source.leader,
    category: source.category,
    date: source.date,
    moment: source.moment,
    language: source.language,
    notes: source.notes,
    items: source.items,
    isDraft: false,
    isPrivate: true,
    ownerId: uid,
  });
}
