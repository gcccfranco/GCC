// Tonalités les plus jouées à Grace Church, calculées sur les setlists passées
// (docs/spec-setlist.md, lot 3). **Lecture seule** : lit Firestore avec le compte
// de service de `.env` (FIREBASE_SERVICE_ACCOUNT) et écrit la liste à valider
// dans docs/tonalites-recommandees.md. Rien n'est inscrit dans les chants : les
// tonalités validées par Timothée sont reportées à la main ({recommended_key}).
//
//   npx tsx scripts/recommended-keys.ts

import * as fs from "fs";
import * as path from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { SetlistItem } from "../src/types/setList";
import type { SongIndexEntry } from "../src/types/song";

const OUT = path.join(process.cwd(), "docs", "tonalites-recommandees.md");

function serviceAccount() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT="));
  const raw = (line?.slice("FIREBASE_SERVICE_ACCOUNT=".length) ?? "").trim().replace(/^["']|["']$/g, "");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquant dans .env");
  return JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
}

async function main() {
  const sa = serviceAccount();
  initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
  const snap = await getFirestore().collection("setlists").get();
  const index = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "songs-index.json"), "utf8"));
  const songs = new Map<string, SongIndexEntry>(index.songs.map((s: SongIndexEntry) => [s.slug, s]));

  // slug → tonalité jouée → nombre de setlists
  const counts = new Map<string, Map<string, number>>();
  const played = (slug: string, keyOverride: string | null) => {
    const key = keyOverride || songs.get(slug)?.originalKey;
    if (!key) return;
    const byKey = counts.get(slug) ?? new Map<string, number>();
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
    counts.set(slug, byKey);
  };
  let setlists = 0;
  const dates: string[] = [];
  for (const doc of snap.docs) {
    const s = doc.data() as { isDraft?: boolean; date?: string; items?: SetlistItem[] };
    if (s.isDraft) continue;
    setlists++;
    if (s.date) dates.push(s.date.slice(0, 10));
    for (const it of s.items ?? []) {
      if (it.type === "transition") continue;
      if (it.type === "fusion") for (const f of it.fusionSongs ?? []) played(f.songSlug, f.keyOverride);
      else played(it.songSlug, it.keyOverride);
    }
  }
  dates.sort();

  const rows = [...counts].flatMap(([slug, byKey]) => {
    const song = songs.get(slug);
    const sorted = [...byKey].sort((a, b) => b[1] - a[1]);
    const [top, topN] = sorted[0];
    if (!song || top === song.originalKey) return [];
    const tie = sorted.length > 1 && sorted[1][1] === topN;
    const yes = topN >= 2 && !tie;
    return [{ song, top, topN, yes, detail: sorted.map(([k, n]) => `${k} ×${n}`).join(", ") }];
  });
  rows.sort((a, b) => Number(b.yes) - Number(a.yes) || b.topN - a.topN || a.song.title.localeCompare(b.song.title, "fr"));

  const table = rows
    .map((r) => `| ${r.song.title} | \`${r.song.slug}\` | ${r.song.originalKey} | ${r.detail} | ${r.yes ? `oui → ${r.top}` : "non"} |`)
    .join("\n");

  const md = `# Tonalités recommandées : liste à valider

Calculée le ${new Date().toLocaleDateString("fr-FR")} par \`npx tsx scripts/recommended-keys.ts\`
(lecture seule), sur **${setlists} setlists publiées** du ${dates[0]} au ${dates[dates.length - 1]}.
Seuls figurent les chants dont la tonalité la plus jouée **n'est pas** l'originale
(${rows.length} chants).

**Proposition** : « oui » quand la tonalité est jouée au moins 2 fois et arrive
seule en tête ; « non » sinon (jouée une seule fois, ou égalité).

**À faire par Timothée** : corriger la dernière colonne (« oui → D », « non », ou
une autre tonalité). Les « oui » seront inscrits dans les chants
(\`{recommended_key: D}\`), puis se changeront à la main.

| Chant | Fichier | Originale | Jouée (nombre de setlists) | Décision |
| --- | --- | --- | --- | --- |
${table}
`;
  fs.writeFileSync(OUT, md);
  console.log(`✓ ${rows.length} chants → ${path.relative(process.cwd(), OUT)}`);
  process.exit(0);
}

main();
