"use client"

import { createContext, useContext } from "react"

/** Lot U6, B2 (Q14) : un planning se gère au Back-Office (`/back-office/planning/…`, qui
 *  fournit `true`) ; dans l'App (`/planning/…`), il se lit — ni saisie, ni export, ni
 *  publication, ni brouillon, même pour qui en a le droit. */
export const GestionPlanning = createContext(false)

export const useGestionPlanning = () => useContext(GestionPlanning)
