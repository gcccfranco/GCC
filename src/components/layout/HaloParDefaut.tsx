"use client";

import { usePathname } from "next/navigation";

// Le halo d'en-tête par défaut (retours du 06/10/2026) : toute page de l'App et du Back-Office en
// a un. Une page qui a sa couleur pose son `Halo` ; celui-ci, posé une fois dans la mise en page
// racine, s'efface alors de lui-même (`.halo-defaut`, globals.css). Sinon il montre l'encre, comme
// Moi : l'écran n'appartient à aucune section ; sous `/back-office`, le bleu gris de la planche v18
// (`--halo-back-office`, R12 de docs/spec-agencement-v18.md). Sa couleur va sur la racine, avant
// celle d'une page (plus bas dans le document, elle l'emporte) : les barres en repeignent la copie (V8).

/** La connexion et l'inscription ont leurs deux halos à elles (panneau de marque). */
const SANS_HALO = ["/login", "/signup"];

const sous = (chemin: string, p: string) => chemin === p || chemin.startsWith(`${p}/`);

export function HaloParDefaut() {
  const chemin = usePathname() ?? "";
  if (SANS_HALO.some((p) => sous(chemin, p))) return null;
  const backOffice = sous(chemin, "/back-office");
  return (
    <>
      <style>{`:root{--halo:${backOffice ? "var(--halo-back-office)" : "hsl(var(--foreground))"}}`}</style>
      <div aria-hidden="true" data-testid="halo-defaut" data-back-office={backOffice ? "" : undefined} className="halo halo-defaut" />
    </>
  );
}
