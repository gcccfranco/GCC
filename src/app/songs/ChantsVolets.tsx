"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Halo } from "@/components/layout/Halo";
import { SongProposalDrawer } from "@/components/songs/SongProposalDrawer";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useSongsIndex } from "@/hooks/useSongsIndex";
import type { Theme } from "@/types/song";
import { SongListClient } from "./SongListClient";

/** Chants en un ou deux volets (lot U5, docs/spec-deux-volets.md, Q1, Q15, Q16).
 *  La disposition est décidée par le CSS (`.chants-volets`, globals.css), pour que la page
 *  arrive du serveur déjà à sa place : un volet = la liste sur /songs, la page du chant
 *  ailleurs ; deux volets = la liste à gauche, à droite « Choisis un chant » ou le chant.
 *  En un volet, la liste n'est montée que sur /songs, comme avant (elle se remonte au
 *  retour et rend sa position) ; en deux volets, elle reste montée d'un chant à l'autre.
 *  Agencement v18 (A5, R1 à R3, R10 de docs/spec-agencement-v18.md) : l'en-tête « Chants » est
 *  au-dessus de la liste, partout où elle paraît ; en deux volets, au-dessus des deux (il reste
 *  sur la page d'un chant, pour que la liste ne bouge pas d'un chant à l'autre), et la liste est
 *  une carte en relief à la marge de la zone (`.chants-volets`, globals.css). */
export function ChantsVolets({ themes, nombre, children }: { themes: Theme[]; nombre: number; children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const surListe = /^\/songs\/?$/.test(pathname);
  const actif = surListe ? null : decodeURIComponent(pathname.replace(/^\/songs\//, "").replace(/\/$/, ""));
  const deuxVolets = useDeuxVolets();
  // Lu seulement quand la liste est montée (sur /songs, ou en deux volets).
  const { songs, erreur, reessayer } = useSongsIndex(surListe || deuxVolets);

  return (
    <div className="chants-volets" data-sur-liste={surListe ? "" : undefined}>
      {/* Le halo de /songs, un seul, juste dès le premier affichage : en un volet celui de la
          liste (bleu des accords, à gauche) ; en deux volets celui de « Choisis un chant »
          (vert des couplets, à droite, planche `chants-accueil`) — le CSS en décide
          (`--halo-chants`, `.halo-chants`). Sur la page d'un chant, c'est le sien. */}
      {surListe && <Halo variant="chants" color="var(--halo-chants, var(--chord-color))" />}
      {/* Affiché par le CSS là où la liste l'est : dès le rendu du serveur, à sa place. */}
      <div className="chants-entete">
        <EnTetePage
          titre={t("common.header.songs")}
          sousTitre={t("songs.list.sousTitre", { count: nombre })}
          action={<SongProposalDrawer enTete />}
        />
      </div>
      <div data-volet-liste className="chants-liste">
        {(surListe || deuxVolets) && (
          // Le fondu de page, à chaque montage de la liste (retour à la liste en un volet).
          <div className="chants-liste-fond page-fade relative min-h-screen">
            <div className="chants-liste-corps relative px-[var(--marge-page)] pb-6">
              <SongListClient songs={songs ?? []} themes={themes} actif={actif} erreur={erreur} onReessayer={reessayer} />
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
