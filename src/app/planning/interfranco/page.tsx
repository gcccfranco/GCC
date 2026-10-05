"use client"

import { PageDatesChoisies } from "@/components/planning/PageDatesChoisies"
import { fetchInterfranco, fetchIntergroupe } from "@/lib/planning/sheets"
import { GRILLE_INTERFRANCO } from "@/lib/planning/grilles"
import { BACK_OFFICE } from "@/lib/backOffice"
import { AncienTableau } from "./AncienTableau"

// Une séance par trimestre, pas de publication par trimestre : toute l'année
// s'affiche. Rempli dans l'app depuis le 19/09/2026 (lot 17, G6) ; dès 2027,
// les dimanches se posent dans l'app, jamais un dimanche de l'Intergroupe (lot U2).

function InterfrancoPage() {
  return <PageDatesChoisies definition={GRILLE_INTERFRANCO} lire={fetchInterfranco} lireAutre={fetchIntergroupe} />
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? InterfrancoPage : AncienTableau
