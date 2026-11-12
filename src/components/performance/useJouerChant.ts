"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuId } from "./MenuLouange";
import type { SongHeaderBlock } from "@/lib/performance/blocks";

type Entree = { block: SongHeaderBlock; index: number };

/** Menu Setlist, onglet « Tous les chants » : toucher un chant y va (déjà dans la setlist ou ajouté) ou l'ajoute
 *  après le chant en cours puis y va ; « / » ouvre l'onglet, champ actif (ordinateur). */
export function useJouerChant({
  songEntries, pages, goToPage, positionCourante, onJouerChant, onRetirerChant, slugCourant, pageDansChant, popoverOuvert, setPopoverOuvert, annotateMode, misEnPage,
}: {
  songEntries: Entree[];
  pages: number[][];
  goToPage: (p: number, pgCount: number) => void;
  positionCourante: number;
  onJouerChant?: (slug: string, avecJianpu: boolean, positionCourante: number) => Promise<boolean>;
  onRetirerChant?: (slug: string) => void;
  /** Chant en cours et page dans ce chant (0-based). */
  slugCourant?: string;
  pageDansChant: number;
  popoverOuvert: MenuId | null;
  setPopoverOuvert: (m: MenuId | null) => void;
  annotateMode: boolean;
  /** Vrai quand la mise en page répond aux blocs en cours : avant, les pages sont provisoires et le chant ajouté
   *  n'y est pas encore à sa place (on y irait, puis la pagination refaite laisserait la page sur le chant suivant). */
  misEnPage: () => boolean;
}) {
  const [ongletSetlist, setOngletSetlist] = useState<"setlist" | "chants">("setlist");
  const [focusRecherche, setFocusRecherche] = useState(false);
  // Chant visé et page dans ce chant, une fois la mise en page refaite ; `retire` : on attend aussi qu'il ait quitté la suite.
  const enAttente = useRef<{ slug: string; page: number; retire?: string } | null>(null);
  // Où l'on était (chant de la setlist, page 0-based dans ce chant) avant le premier passage vers un ajout.
  const [retourPoint, setRetourPoint] = useState<{ slug: string; page: number } | null>(null);
  const estAjout = (slug?: string) => songEntries.some((e) => e.block.songSlug === slug && !Number.isInteger(e.block.position));
  // Le champ ne prend le focus qu'à l'ouverture par « / » : rouvert au toucher, pas de clavier qui sort.
  const [menuVu, setMenuVu] = useState(popoverOuvert);
  if (menuVu !== popoverOuvert) {
    setMenuVu(popoverOuvert);
    if (popoverOuvert !== "setlist") setFocusRecherche(false);
  }

  const aller = useCallback((slug: string, dansChant = 0) => {
    const i = songEntries.findIndex((x) => x.block.songSlug === slug);
    const page = i >= 0 ? pages.findIndex((p) => p.includes(songEntries[i].index)) : -1;
    if (page < 0) return false;
    const suivant = songEntries[i + 1] ? pages.findIndex((p) => p.includes(songEntries[i + 1].index)) : pages.length;
    goToPage(Math.min(page + dansChant, Math.max(page, suivant - 1)), pages.length);
    return true;
  }, [songEntries, pages, goToPage]);

  // Le chant ajouté apparaît dans songEntries au rendu suivant : on y va alors.
  useEffect(() => {
    const a = enAttente.current;
    if (a && misEnPage() && !songEntries.some((e) => a.retire && e.block.songSlug === a.retire) && aller(a.slug, a.page)) enAttente.current = null;
  }, [aller, misEnPage, songEntries]);

  const jouer = useCallback((slug: string, avecJianpu: boolean) => {
    // Premier passage d'un chant de la setlist vers un ajout (déjà ouvert ou à ajouter) : on note où l'on était.
    const dansSetlist = songEntries.some((e) => e.block.songSlug === slug && Number.isInteger(e.block.position));
    const depuis = !dansSetlist && !retourPoint && slugCourant && songEntries.some((e) => e.block.songSlug === slugCourant && Number.isInteger(e.block.position)) ? { slug: slugCourant, page: pageDansChant } : null;
    if (aller(slug)) {
      if (depuis && songEntries.some((e) => e.block.songSlug === slug && !Number.isInteger(e.block.position))) setRetourPoint(depuis);
      return;
    }
    enAttente.current = { slug, page: 0 };
    void onJouerChant?.(slug, avecJianpu, positionCourante).then((ok) => {
      if (!ok) enAttente.current = null;
      else if (depuis) setRetourPoint(depuis);
    });
  }, [aller, onJouerChant, positionCourante, retourPoint, slugCourant, pageDansChant, songEntries]);

  const retirer = useCallback((slug: string) => {
    const i = songEntries.findIndex((e) => e.block.songSlug === slug);
    const cible = slug === slugCourant ? (i > 0 ? { slug: songEntries[i - 1].block.songSlug, page: 0 } : null) : slugCourant ? { slug: slugCourant, page: pageDansChant } : null;
    if (onRetirerChant && cible?.slug) enAttente.current = { slug: cible.slug, page: cible.page, retire: slug };
    if (songEntries.every((e) => Number.isInteger(e.block.position) || e.block.songSlug === slug)) setRetourPoint(null);
    onRetirerChant?.(slug);
  }, [songEntries, slugCourant, pageDansChant, onRetirerChant]);

  const retourEntree = retourPoint && estAjout(slugCourant) ? songEntries.find((e) => e.block.songSlug === retourPoint.slug) : undefined;
  const retour = retourPoint && retourEntree
    ? { titre: retourEntree.block.title, page: retourPoint.page + 1, onAller: () => { aller(retourPoint.slug, retourPoint.page); setRetourPoint(null); } }
    : undefined;

  useEffect(() => {
    if (!onJouerChant) return;
    const h = (e: KeyboardEvent) => {
      const c = e.target instanceof HTMLElement ? e.target : null;
      if (e.key !== "/" || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || annotateMode || popoverOuvert) return;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      e.preventDefault();
      setOngletSetlist("chants");
      setFocusRecherche(true);
      setPopoverOuvert("setlist");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onJouerChant, annotateMode, popoverOuvert, setPopoverOuvert]);

  return { ongletSetlist, setOngletSetlist: (o: "setlist" | "chants") => { setFocusRecherche(false); setOngletSetlist(o); }, focusRecherche, jouer, retirer: onRetirerChant ? retirer : undefined, retour };
}
