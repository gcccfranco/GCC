"use client";

import { usePathname } from "next/navigation";
import { Halo } from "@/components/layout/Halo";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useSongsIndex } from "@/hooks/useSongsIndex";
import type { Theme } from "@/types/song";
import { SongListClient } from "./SongListClient";

/** Chants en un ou deux volets (lot U5, docs/spec-deux-volets.md, Q1, Q15, Q16).
 *  La disposition est décidée par le CSS (`.chants-volets`, globals.css), pour que la page
 *  arrive du serveur déjà à sa place : un volet = la liste sur /songs, la page du chant
 *  ailleurs ; deux volets = la liste à gauche, à droite « Choisis un chant » ou le chant.
 *  En un volet, la liste n'est montée que sur /songs, comme avant (elle se remonte au
 *  retour et rend sa position) ; en deux volets, elle reste montée d'un chant à l'autre. */
export function ChantsVolets({ themes, children }: { themes: Theme[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const surListe = /^\/songs\/?$/.test(pathname);
  const actif = surListe ? null : decodeURIComponent(pathname.replace(/^\/songs\//, "").replace(/\/$/, ""));
  const deuxVolets = useDeuxVolets();
  const songs = useSongsIndex();

  return (
    <div className="chants-volets" data-sur-liste={surListe ? "" : undefined}>
      {/* Le halo de /songs, un seul, juste dès le premier affichage : en un volet celui de la
          liste (bleu des accords, à gauche) ; en deux volets celui de « Choisis un chant »
          (vert des couplets, à droite, planche `chants-accueil`) — le CSS en décide
          (`--halo-chants`, `.halo-chants`). Sur la page d'un chant, c'est le sien. */}
      {surListe && <Halo variant="chants" color="var(--halo-chants, var(--chord-color))" />}
      <div data-volet-liste className="chants-liste">
        {(surListe || deuxVolets) && (
          // Le fondu de page, à chaque montage de la liste (retour à la liste en un volet).
          <div className="page-fade relative min-h-screen">
            <div className="relative mx-auto max-w-2xl px-4 py-6">
              <SongListClient songs={songs ?? []} themes={themes} actif={actif} />
            </div>
          </div>
        )}
      </div>
      {/* Le fondu de page à chaque chant : PageTransition ne remonte plus Chants entier. */}
      <div key={pathname} data-volet-chant className="chants-chant page-fade">
        {children}
      </div>
    </div>
  );
}
