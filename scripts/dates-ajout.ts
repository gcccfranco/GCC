import { execFileSync } from "child_process";

// Date d'ajout de chaque chant (agencement v18, A7 de docs/spec-agencement-v18.md) : lue dans
// git par `build:index`, en une passe, pour la carte « Nouveaux au répertoire » de Chants.
// Sans historique (hors dépôt, clone superficiel de Vercel sans `VERCEL_DEEP_CLONE=true`), rien :
// un clone superficiel donnerait à tous les chants la date du dernier commit cloné.

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const CHANT = /^content\/songs\/([^/]+)\.cho$/;

/** Le journal `git log --diff-filter=A --name-only --format=%cs` (le plus récent d'abord) en
 *  slug (NFC) → AAAA-MM-JJ ; un fichier ajouté deux fois (retiré puis remis) garde sa dernière addition. */
export function lireJournalDesAjouts(journal: string): Map<string, string> {
  const dates = new Map<string, string>();
  let jour: string | null = null;
  for (const ligne of journal.split("\n")) {
    const l = ligne.trim();
    if (JOUR.test(l)) { jour = l; continue; }
    const m = CHANT.exec(l);
    // NFC : macOS peut écrire un nom accentué décomposé, et git le rendre tel quel.
    const slug = m?.[1].normalize("NFC");
    if (slug && jour && !dates.has(slug)) dates.set(slug, jour);
  }
  return dates;
}

/** Les dates d'ajout des chants du dépôt `racine` ; vide sans historique complet, sans erreur. */
export function datesAjout(racine: string): Map<string, string> {
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "core.quotePath=false", ...args], { cwd: racine, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024 });
  try {
    if (git("rev-parse", "--is-shallow-repository").trim() !== "false") return new Map();
    return lireJournalDesAjouts(git("log", "--diff-filter=A", "--name-only", "--format=%cs", "--", "content/songs"));
  } catch {
    return new Map(); // hors dépôt, ou git absent
  }
}
