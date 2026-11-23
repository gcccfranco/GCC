"use client";

// Comptage d'usage des fonctionnalités (docs/spec-comptage-usage.md, T1). On compte des usages, pas des personnes :
// ni uid, ni courriel, ni nom, ni heure, ni slug ne quittent l'appareil.
//
// Format du localStorage `gcc-usage` (un objet par jour local « AAAA-MM-JJ ») :
//   { "AAAA-MM-JJ": { c: { "<clé>": n }, d: "telephone" | "tablette" | "ordinateur", j: ["<clé>", …], a: 1 } }
//   - c : usages pas encore envoyés, par clé ;
//   - d : disposition de l'appareil ce jour-là (décision 2 : ventilation grossière) ;
//   - j : clés déjà envoyées comme jour-appareil ce jour-là (ne pas recompter `j` ni `d` après un envoi) ;
//   - a : 1 = `_actif.j` déjà envoyé pour ce jour.
// `gcc-usage-envoi` : date (AAAA-MM-JJ) du dernier envoi réussi ; au plus un envoi par jour et par appareil.
// Envoi : un seul POST REST `documents:commit`, un write par mois (`usage/AAAA-MM`), des `increment` :
// `<clé>.n`, `<clé>.j`, `<clé>.d.<disposition>`, `_actif.j`, `_actif.d.<disposition>`.

import { CLES_USAGE } from "@/lib/usageCles";
import { FS_BASE, authHeader, checkRest } from "@/lib/firebase/setlists";
import { deuxVoletsMaintenant } from "@/hooks/useDeuxVolets";

export { CLES_USAGE, normaliserRoute } from "@/lib/usageCles";

const STOCK = "gcc-usage";
const ENVOI = "gcc-usage-envoi";
const JOURS_MAX = 60;
const NOM_BASE = "projects/gcclouange/databases/(default)/documents";

type Disposition = "telephone" | "tablette" | "ordinateur";
type Jour = { c: Record<string, number>; d: Disposition; j?: string[]; a?: 1 };
type Stock = Record<string, Jour>;

function jourLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function disposition(): Disposition {
  if (deuxVoletsMaintenant()) return "ordinateur";
  return window.matchMedia("(min-width: 768px)").matches ? "tablette" : "telephone";
}

function lire(): Stock {
  try {
    const brut = JSON.parse(localStorage.getItem(STOCK) ?? "{}");
    return brut && typeof brut === "object" && !Array.isArray(brut) ? (brut as Stock) : {};
  } catch {
    return {};
  }
}

function ecrire(s: Stock): void {
  try {
    const jours = Object.keys(s).sort();
    for (const j of jours.slice(0, Math.max(0, jours.length - JOURS_MAX))) delete s[j];
    localStorage.setItem(STOCK, JSON.stringify(s));
  } catch {
    /* navigation privée ou stockage plein : rien n'est compté */
  }
}

/** Compte un usage. Clé hors registre : ignorée. Aucun réseau. */
export function compter(cle: string | null | undefined): void {
  if (!cle) return;
  if (!(cle in CLES_USAGE) || cle === "_actif") {
    if (process.env.NODE_ENV !== "production") console.warn(`[usage] clé inconnue ignorée : ${cle}`);
    return;
  }
  try {
    const s = lire();
    const jour = jourLocal();
    const e = (s[jour] ??= { c: {}, d: disposition() });
    e.c[cle] = (e.c[cle] ?? 0) + 1;
    ecrire(s);
  } catch {
    /* ignoré */
  }
}

/** Chemin de champ Firestore : la clé (points, slashes) est UN segment, entre accents graves. */
function segment(s: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : "`" + s.replace(/[\\`]/g, "\\$&") + "`";
}


const VERROU = "gcc-usage-verrou";
let enCours = false;

/** Envoie les comptes en attente : au plus une fois par jour et par appareil, seulement connecté. */
export async function envoyerUsage(): Promise<void> {
  if (enCours) return;
  enCours = true;
  try {
    const aujourdhui = jourLocal();
    if (localStorage.getItem(ENVOI) === aujourdhui) return;
    // Verrou partagé entre onglets (PWA + navigateur) : un seul envoi à la fois sur l'appareil.
    const verrou = Number(localStorage.getItem(VERROU) ?? 0);
    if (Date.now() - verrou < 30_000) return;
    localStorage.setItem(VERROU, String(Date.now()));
    const entete = await authHeader();
    if (!entete.Authorization) return;

    const s = lire();
    const envois: string[] = [];
    const mois = new Map<string, Map<string, number>>(); // AAAA-MM → chemin de champ → incrément
    const ajouter = (m: string, chemin: string, n: number) => {
      const t = mois.get(m) ?? new Map<string, number>();
      t.set(chemin, (t.get(chemin) ?? 0) + n);
      mois.set(m, t);
    };
    const envoye: Record<string, Record<string, number>> = {};
    for (const [jour, e] of Object.entries(s)) {
      const cles = Object.keys(e.c ?? {}).filter((c) => c in CLES_USAGE && e.c[c] > 0);
      if (cles.length === 0) continue;
      const m = jour.slice(0, 7);
      const d = e.d ?? "telephone";
      envoye[jour] = {};
      for (const c of cles) {
        envoye[jour][c] = e.c[c];
        ajouter(m, `${segment(c)}.n`, e.c[c]);
        if (!(e.j ?? []).includes(c)) {
          ajouter(m, `${segment(c)}.j`, 1);
          ajouter(m, `${segment(c)}.d.${d}`, 1);
        }
      }
      if (!e.a) {
        ajouter(m, "_actif.j", 1);
        ajouter(m, `_actif.d.${d}`, 1);
      }
      envois.push(jour);
    }
    if (envois.length === 0) return;

    const writes = [...mois.entries()].map(([m, champs]) => ({
      update: { name: `${NOM_BASE}/usage/${m}`, fields: {} },
      updateMask: { fieldPaths: [] },
      updateTransforms: [...champs.entries()].map(([fieldPath, n]) => ({
        fieldPath,
        increment: { integerValue: String(n) },
      })),
    }));
    const res = await fetch(`${FS_BASE}:commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...entete },
      body: JSON.stringify({ writes }),
      signal: AbortSignal.timeout(15_000),
    });
    await checkRest(res);

    // Succès : on retire ce qui est parti (les comptes faits pendant l'envoi restent).
    const apres = lire();
    for (const [jour, cles] of Object.entries(envoye)) {
      const e = apres[jour];
      if (!e) continue;
      const deja = new Set(e.j ?? []);
      for (const [c, n] of Object.entries(cles)) {
        deja.add(c);
        const reste = (e.c[c] ?? 0) - n;
        if (reste > 0) e.c[c] = reste;
        else delete e.c[c];
      }
      e.j = [...deja];
      e.a = 1;
      if (jour < aujourdhui && Object.keys(e.c).length === 0) delete apres[jour];
    }
    ecrire(apres);
    localStorage.setItem(ENVOI, aujourdhui);
  } catch {
    /* échec (réseau, 401, 403) : tout reste, la date d'envoi n'est pas touchée */
  } finally {
    try { localStorage.removeItem(VERROU); } catch { /* navigation privée */ }
    enCours = false;
  }
}
