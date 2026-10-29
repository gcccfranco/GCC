// Lien du compte rendu d'une réunion (lot U6, R3, docs/spec-back-office.md) :
// tout lien https:// complet est accepté (Doc, Drive, PDF…), un Google Doc est
// suggéré (question 12). Fonctions pures, partagées avec les tests.

/** Le lien rogné s'il est un https:// complet (un hôte, sans espace), sinon null. */
export function lienCompteRendu(saisie: string): string | null {
  const lien = saisie.trim();
  if (!/^https:\/\/\S+$/.test(lien)) return null;
  try {
    return new URL(lien).hostname ? lien : null;
  } catch {
    return null;
  }
}

/** « Google Doc », « Google Drive », sinon le nom du site sans « www. ». */
export function sourceDuLien(url: string): string {
  const hote = new URL(url).hostname.replace(/^www\./, "");
  if (hote === "docs.google.com") return "Google Doc";
  if (hote === "drive.google.com") return "Google Drive";
  return hote;
}
