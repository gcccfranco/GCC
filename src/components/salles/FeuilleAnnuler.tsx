"use client"

// AS16 : la feuille « Annuler la réservation… » de la coordination (la réservation d'un autre) : le motif est
// obligatoire (1 à 200 caractères), envoyé à l'auteur et aux personnes cochées avec la notification.

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { annulerReservation } from "@/lib/salles/annulerReservation"
import type { Reservation } from "@/lib/firebase/reservations"

const MAX = 200

/** `reservation` : celle à annuler (null = fermée). `apres` : relire les réservations une fois annulée. */
export function FeuilleAnnuler({ reservation, fermer, apres }: { reservation: Reservation | null; fermer: () => void; apres: () => Promise<unknown> }) {
  const { t } = useTranslation()
  const [motif, setMotif] = useState("")
  const [envoi, setEnvoi] = useState(false)
  const [echec, setEchec] = useState(false)

  const quitter = () => { setMotif(""); setEchec(false); fermer() }
  async function envoyer() {
    if (!reservation) return
    setEnvoi(true); setEchec(false)
    try {
      await annulerReservation(reservation.id, motif.trim())
      await apres()
      quitter()
    } catch {
      setEchec(true)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <AlertDialog open={Boolean(reservation)} onOpenChange={(o) => { if (!o) quitter() }}>
      <AlertDialogContent className="max-w-[calc(100%-32px)] rounded-2xl sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("salles.annuler.titre")}</AlertDialogTitle>
          <AlertDialogDescription>{reservation && `${reservation.quoi} · ${reservation.debut} – ${reservation.fin}`}</AlertDialogDescription>
        </AlertDialogHeader>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t("salles.annuler.motif")}</span>
          <Textarea value={motif} maxLength={MAX} onChange={(e) => setMotif(e.target.value)} />
          <span className="block text-right text-xs text-muted-foreground tabular-nums">{motif.length} / {MAX}</span>
        </label>
        {echec && <p role="alert" className="text-sm text-destructive">{t("salles.annuler.echec")}</p>}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 rounded-full">{t("common.buttons.cancel")}</AlertDialogCancel>
          <Button variant="destructive" className="rounded-full" disabled={!motif.trim() || envoi} onClick={() => void envoyer()}>{t("salles.annuler.action")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
