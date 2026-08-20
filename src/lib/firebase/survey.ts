import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import type { SurveyAnswers, SurveyResponse } from "@/types/survey";

function fromFsResponse(raw: RawDoc): SurveyResponse {
  const uid = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])
  );
  return {
    uid,
    authorName: (data.authorName as string) ?? "",
    authorEmail: (data.authorEmail as string) ?? "",
    answers: (data.answers as SurveyAnswers) ?? {},
    submitted: (data.submitted as boolean) ?? false,
    createdAt: (data.createdAt as Date | null) ?? null,
    updatedAt: (data.updatedAt as Date | null) ?? null,
  };
}

/** Réponse de la personne connectée (null si elle n'a pas encore répondu). */
export async function getMySurveyResponse(uid: string): Promise<SurveyResponse | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/surveyResponses/${uid}`, { headers });
  if (!res.ok) return null;
  return fromFsResponse((await res.json()) as RawDoc);
}

/** Toutes les réponses, les plus récentes d'abord (lecture réservée aux admins). */
export async function getSurveyResponses(): Promise<SurveyResponse[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "surveyResponses" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsResponse(r.document!));
}

/** Enregistre (ou met à jour) la réponse d'un membre — l'id du document est son uid.
 *  Appelé à chaque étape (`submitted: false`) puis à l'envoi final (`true`), de sorte
 *  qu'un questionnaire abandonné en cours de route reste exploitable.
 *  `createdAt` conserve la date de la première réponse. */
export async function saveSurveyResponse(
  uid: string,
  data: Pick<SurveyResponse, "authorName" | "authorEmail" | "answers" | "submitted">,
  createdAt: Date | null
): Promise<void> {
  const headers = await authHeader();
  const now = new Date();
  const fields = {
    ...toFsFields({ uid, ...data }),
    createdAt: { timestampValue: (createdAt ?? now).toISOString() },
    updatedAt: { timestampValue: now.toISOString() },
  };
  const mask = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${f}`)
    .join("&");
  const docName = `projects/gcclouange/databases/(default)/documents/surveyResponses/${uid}`;
  const res = await fetch(`${FS_BASE}/surveyResponses/${uid}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ name: docName, fields }),
  });
  await checkRest(res);
}

export async function deleteSurveyResponse(uid: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/surveyResponses/${uid}`, {
    method: "DELETE",
    headers,
  });
  await checkRest(res);
}
