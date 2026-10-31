import { delaiMax } from "@/lib/delaiMax";
import { auth, FIREBASE_PROJECT_ID } from "@/lib/firebase/config";

const FS_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function authHeader(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function docId(userId: string, setlistId: string, pageKey: string) {
  return `${userId}__${setlistId}__${pageKey}`;
}

/**
 * Charge les traits vectoriels (champ `strokes`, JSON sérialisé).
 * Les anciennes annotations PNG (champ `data`) sont ignorées.
 * `null` = document absent (404) : la page est vide. Une lecture impossible (réseau, 5xx, refus) LÈVE :
 * l'appelant n'initialise pas la page à vide et n'enregistre rien, sinon le premier trait écraserait les anciens.
 */
export async function loadAnnotation(
  userId: string,
  setlistId: string,
  pageKey: string,
): Promise<string | null> {
  const headers = await authHeader();
  const id = docId(userId, setlistId, pageKey);
  const res = await fetch(`${FS_BASE}/annotations/${encodeURIComponent(id)}`, {
    headers,
    signal: delaiMax(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Annotations illisibles (HTTP ${res.status})`);
  const raw = await res.json();
  return (raw.fields?.strokes?.stringValue as string) ?? null;
}

export async function saveAnnotation(
  userId: string,
  setlistId: string,
  pageKey: string,
  strokesJson: string,
): Promise<void> {
  try {
    const headers = await authHeader();
    const id = docId(userId, setlistId, pageKey);
    const encodedId = encodeURIComponent(id);
    const docName = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/annotations/${id}`;
    await fetch(
      `${FS_BASE}/annotations/${encodedId}?updateMask.fieldPaths=strokes&updateMask.fieldPaths=updatedAt`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name: docName,
          fields: {
            strokes: { stringValue: strokesJson },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      },
    );
  } catch {
    // Annotations are best-effort
  }
}
