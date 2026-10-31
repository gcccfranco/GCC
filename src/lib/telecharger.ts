// Téléchargement d'un Blob par un lien <a download> éphémère.

export function telechargerBlob(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/** Plein écran natif : appel SYNCHRONE, à garder dans le geste de l'utilisateur (aucun await avant). */
export function demanderPleinEcran() {
  document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
}
