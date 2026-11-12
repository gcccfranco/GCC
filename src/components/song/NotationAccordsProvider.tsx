"use client";

import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { NotationAccordsContext, useNotationAccords } from "@/lib/notationAccords";

/** Pose la notation choisie et la tonalité des étiquettes affichées (celle d'une section modulée au besoin). */
export function NotationAccordsProvider({ tonalite, children }: { tonalite?: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  const notation = useNotationAccords(loading ? undefined : user?.uid ?? null);
  const valeur = useMemo(() => ({ notation, tonalite }), [notation, tonalite]);
  return <NotationAccordsContext.Provider value={valeur}>{children}</NotationAccordsContext.Provider>;
}
