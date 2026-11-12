"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuId } from "./MenuLouange";
import type { SongHeaderBlock } from "@/lib/performance/blocks";

type Entree = { block: SongHeaderBlock; index: number };

/** Menu Setlist, onglet « Tous les chants » : toucher un chant y va (déjà dans la setlist ou ajouté) ou l'ajoute
 *  après le chant en cours puis y va ; « / » ouvre l'onglet, champ actif (ordinateur). */
export function useJouerChant({
  songEntries, pages, goToPage, positionCourante, onJouerChant, popoverOuvert, setPopoverOuvert, annotateMode, misEnPage,
}: {
  songEntries: Entree[];
  pages: number[][];
  goToPage: (p: number, pgCount: number) => void;
  positionCourante: number;
  onJouerChant?: (slug: string, avecJianpu: boolean, positionCourante: number) => Promise<boolean>;
  popoverOuvert: MenuId | null;
  setPopoverOuvert: (m: MenuId | null) => void;
  annotateMode: boolean;
  /** Vrai quand la mise en page répond aux blocs en cours : avant, les pages sont provisoires et le chant ajouté
   *  n'y est pas encore à sa place (on y irait, puis la pagination refaite laisserait la page sur le chant suivant). */
  misEnPage: () => boolean;
}) {
  const [ongletSetlist, setOngletSetlist] = useState<"setlist" | "chants">("setlist");
  const [focusRecherche, setFocusRecherche] = useState(false);
  const enAttente = useRef<string | null>(null);
  // Le champ ne prend le focus qu'à l'ouverture par « / » : rouvert au toucher, pas de clavier qui sort.
  const [menuVu, setMenuVu] = useState(popoverOuvert);
  if (menuVu !== popoverOuvert) {
    setMenuVu(popoverOuvert);
    if (popoverOuvert !== "setlist") setFocusRecherche(false);
  }

  const aller = useCallback((slug: string) => {
    const e = songEntries.find((x) => x.block.songSlug === slug);
    const page = e ? pages.findIndex((p) => p.includes(e.index)) : -1;
    if (page < 0) return false;
    goToPage(page, pages.length);
    return true;
  }, [songEntries, pages, goToPage]);

  // Le chant ajouté apparaît dans songEntries au rendu suivant : on y va alors.
  useEffect(() => {
    if (enAttente.current && misEnPage() && aller(enAttente.current)) enAttente.current = null;
  }, [aller, misEnPage]);

  const jouer = useCallback((slug: string, avecJianpu: boolean) => {
    if (aller(slug)) return;
    enAttente.current = slug;
    void onJouerChant?.(slug, avecJianpu, positionCourante).then((ok) => { if (!ok) enAttente.current = null; });
  }, [aller, onJouerChant, positionCourante]);

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

  return { ongletSetlist, setOngletSetlist: (o: "setlist" | "chants") => { setFocusRecherche(false); setOngletSetlist(o); }, focusRecherche, jouer };
}
