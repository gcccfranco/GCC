"use client"

// « Compte rendu » d'une réunion (lot U6, R3, docs/spec-back-office.md ; planches
// bo-reunion-avant et bo-reunion-apres-telephone). Toute personne de la réunion
// (ou un admin) colle le lien du récap — tout lien https://, un Google Doc
// suggéré (question 12) —, l'ouvre ou le retire. Les autres l'apprennent le
// lendemain par une ligne du rappel du matin (src/lib/reunions/rappels.ts).
// Une seule carte pour l'App et la gestion ; B3 la posera sur la fiche du Back-Office.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useConfirmer } from "@/components/layout/Confirmer"
import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BOUTON_CHAMP_ACTION, CHAMP_ACTION } from "@/components/reunions/champAction"
import { TOUCHER_44 } from "@/lib/toucher44"
import { majCompteRendu } from "@/lib/firebase/evenements"
import { lienCompteRendu, sourceDuLien } from "@/lib/reunions/compteRendu"
import { compter } from "@/lib/usage"
import type { CompteRendu, Evenement } from "@/types/evenement"
import type { UserProfile } from "@/types/user"

/** « 4 oct. » / « 10月4日 », en heure de Paris. */
function dateCourte(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })
}

export function CompteRenduCarte({ evenement: e, user, profile, onChange }: {
  evenement: Evenement
  user: { uid: string; email?: string | null }
  profile: UserProfile | null
  onChange: (compteRendu: CompteRendu | null) => void
}) {
  const { t, i18n } = useTranslation()
  const confirmer = useConfirmer()
  const [saisie, setSaisie] = useState("")
  const [erreur, setErreur] = useState("")
  const [busy, setBusy] = useState(false)
  const cr = e.compteRendu ?? null
  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  async function ecrire(valeur: CompteRendu | null) {
    setBusy(true)
    setErreur("")
    try {
      await majCompteRendu(e.id, valeur)
      if (valeur) compter("cmd.evenement.compteRendu")
      onChange(valeur)
      setSaisie("")
    } catch {
      setErreur(t("evenements.compteRendu.erreur"))
    } finally {
      setBusy(false)
    }
  }

  function enregistrer(ev: FormEvent) {
    ev.preventDefault()
    const url = lienCompteRendu(saisie)
    if (!url) { setErreur(t("evenements.compteRendu.invalide")); return }
    void ecrire({ url, parUid: user.uid, parNom: nom, le: new Date().toISOString() })
  }

  async function retirer() {
    if (await confirmer({ titre: t("evenements.compteRendu.confirmRetirer"), action: t("common.buttons.remove"), destructif: true })) void ecrire(null)
  }

  const alerte = erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>

  if (cr) {
    return (
      <section aria-labelledby="compte-rendu-titre" data-testid="compte-rendu-carte" className="space-y-2 carte-groupe rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--chord-color)]"
            style={{ background: "color-mix(in srgb, var(--chord-color) 14%, transparent)" }}>
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="compte-rendu-titre" className="text-base font-semibold text-foreground">{t("evenements.compteRendu.titre")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("evenements.compteRendu.ajoutePar", { source: sourceDuLien(cr.url), nom: cr.parNom, date: dateCourte(cr.le, i18n.language) })}
            </p>
          </div>
          <Button asChild size="sm" className="h-8 shrink-0">
            <a href={cr.url} target="_blank" rel="noopener noreferrer">{t("evenements.compteRendu.ouvrir")}</a>
          </Button>
          <button type="button" aria-label={t("evenements.compteRendu.retirer")} onClick={retirer} disabled={busy}
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {alerte}
      </section>
    )
  }

  return (
    <section aria-labelledby="compte-rendu-titre" data-testid="compte-rendu-carte" className="space-y-3 carte-groupe rounded-2xl p-4">
      <div className="space-y-1">
        <h3 id="compte-rendu-titre" className="text-base font-semibold text-foreground">{t("evenements.compteRendu.titre")}</h3>
        <p className="text-sm text-muted-foreground">{t("evenements.compteRendu.aide")}</p>
      </div>
      <form onSubmit={enregistrer} noValidate className="space-y-3">
        <label className={CHAMP_ACTION}>
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input type="url" inputMode="url" value={saisie} onChange={(ev) => { setSaisie(ev.target.value); setErreur("") }}
            aria-label={t("evenements.compteRendu.lien")} placeholder={t("evenements.compteRendu.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" />
          <Button type="submit" size="sm" disabled={busy || !saisie.trim()} className={`${BOUTON_CHAMP_ACTION} ${TOUCHER_44}`}>
            {t("evenements.compteRendu.enregistrer")}
          </Button>
        </label>
        {alerte}
      </form>
    </section>
  )
}
