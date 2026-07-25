import { FS_BASE, authHeader, fromFsValue, type RawDoc } from "./setlists";

// Lecture des notifications « cloche » (collection écrite côté serveur, cf.
// src/lib/push/notifications.ts). Même chemin léger et incrémental que
// getAnnoncesSince : si `sinceMs > 0`, ne lit que les docs créés APRÈS.
// Le ciblage par destinataire se fait CÔTÉ CLIENT (cf. useNotifications) :
// cohérent avec le modèle de confidentialité assumé du projet (read si connecté).

export interface PushNotif {
  id: string;
  title: string;
  body: string;
  url: string;
  kind: "manual" | "reminder" | "broadcast";
  recipients: string[];
  everyone: boolean;
  createdAt: Date | null;
}

function fromFsNotif(raw: RawDoc): PushNotif {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])
  );
  return {
    id,
    title: (data.title as string) ?? "",
    body: (data.body as string) ?? "",
    url: (data.url as string) ?? "/",
    kind: (data.kind as PushNotif["kind"]) ?? "manual",
    recipients: (data.recipients as string[]) ?? [],
    everyone: (data.everyone as boolean) ?? false,
    createdAt: (data.createdAt as Date | null) ?? null,
  };
}

export async function getNotifsSince(sinceMs: number, max: number): Promise<PushNotif[]> {
  const headers = await authHeader();
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: "notifications" }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit: max,
  };
  if (sinceMs > 0) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: "createdAt" },
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
  return rows.filter((r) => r.document).map((r) => fromFsNotif(r.document!));
}
