import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
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

// ─── CRUD ─────────────────────────────────────────────────────────────────────

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
  const ref = await withTimeout(
    addDoc(collection(db, "setlists"), { ...data, createdAt: serverTimestamp() }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );
  return ref.id;
}

export async function updateSetlist(
  id: string,
  data: Partial<Omit<FSSetlist, "id" | "createdAt">>
): Promise<void> {
  await withTimeout(
    updateDoc(doc(db, "setlists", id), data as Record<string, unknown>),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );
}

export async function deleteSetlist(id: string): Promise<void> {
  await deleteDoc(doc(db, "setlists", id));
}
