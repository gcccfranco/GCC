import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./config";
import type { SetlistItem } from "@/lib/types";

// ─── Categories ───────────────────────────────────────────────────────────────

export const RESTRICTED_CATEGORIES = [
  "Culte Francophone",
  "Intergroupe",
  "Interfranco",
  "Campus",
] as const;

export const FREE_CATEGORIES = [
  "Groupe Paix",
  "Groupe Fidélité",
  "Groupe Bonté",
  "中班",
  "大班",
  "高班",
] as const;

export const ALL_CATEGORIES = [...RESTRICTED_CATEGORIES, ...FREE_CATEGORIES];

export function isRestricted(category: string): boolean {
  return (RESTRICTED_CATEGORIES as readonly string[]).includes(category);
}

// ─── Firestore types ──────────────────────────────────────────────────────────

export interface FSSetlist {
  id: string;
  title: string;
  leader: string;
  category: string;
  date: string;
  language: "fr" | "zh" | "mixed";
  notes: string;
  createdAt: Timestamp | null;
  items: SetlistItem[];
  isDraft?: boolean;
}

// ─── CRUD reads (Firebase SDK) ────────────────────────────────────────────────

export async function getSetlists(): Promise<FSSetlist[]> {
  const q = query(collection(db, "setlists"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSSetlist));
}

export async function getSetlist(id: string): Promise<FSSetlist | null> {
  const snap = await getDoc(doc(db, "setlists", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FSSetlist;
}

export async function deleteSetlist(id: string): Promise<void> {
  await deleteDoc(doc(db, "setlists", id));
}

// ─── REST API writes (bypasses WebChannel — works on all browsers/networks) ──

const FS_REST = `https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents`;

function fsValue(v: unknown): unknown {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, fsValue(val)])
        ),
      },
    };
  }
  return { nullValue: null };
}

function fsFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fsValue(v)]));
}

async function authHeader(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function checkRest(res: Response): Promise<void> {
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ||
        `Erreur Firestore (HTTP ${res.status})`
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export async function createSetlist(
  data: Omit<FSSetlist, "id" | "createdAt">
): Promise<string> {
  const headers = await authHeader();
  const fields = {
    ...fsFields(data as Record<string, unknown>),
    createdAt: { timestampValue: new Date().toISOString() },
  };

  const res = await withTimeout(
    fetch(`${FS_REST}/setlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ fields }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );

  await checkRest(res);
  const doc = await res.json() as { name: string };
  return doc.name.split("/").pop()!;
}

export async function updateSetlist(
  id: string,
  data: Partial<Omit<FSSetlist, "id" | "createdAt">>
): Promise<void> {
  const headers = await authHeader();
  const fields = fsFields(data as Record<string, unknown>);
  const docName = `projects/gcclouange/databases/(default)/documents/setlists/${id}`;
  const mask = Object.keys(data)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");

  const res = await withTimeout(
    fetch(`${FS_REST}/setlists/${id}?${mask}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name: docName, fields }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );

  await checkRest(res);
}
