"use client"

// « Compte rendu » d'une réunion (lot U6, R3, docs/spec-back-office.md ; planches
// bo-reunion-avant et bo-reunion-apres-telephone). Toute personne de la réunion
// (ou un admin) colle le lien du récap — tout lien https://, un Google Doc
// suggéré (question 12) —, l'ouvre ou le retire. Les autres l'apprennent le
// lendemain par une ligne du rappel du matin (src/lib/reunions/rappels.ts).
// Une seule carte pour l'App et la gestion ; B3 la posera sur la fiche du Back-Office.

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Check, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { majCompteRendu } from "@/lib/firebase/evenements"
import { lienCompteRendu, sourceDuLien } from "@/lib/reunions/compteRendu"
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

  function retirer() {
    if (window.confirm(t("evenements.compteRendu.confirmRetirer"))) void ecrire(null)
  }

  const alerte = erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>

  if (cr) {
    return (
      <section aria-labelledby="compte-rendu-titre" data-testid="compte-rendu-carte" className="space-y-2 rounded-2xl bg-card px-4 py-3.5">
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
    <section aria-labelledby="compte-rendu-titre" data-testid="compte-rendu-carte" className="space-y-3 rounded-2xl bg-card p-4">
      <div className="space-y-1">
        <h3 id="compte-rendu-titre" className="text-base font-semibold text-foreground">{t("evenements.compteRendu.titre")}</h3>
        <p className="text-sm text-muted-foreground">{t("evenements.compteRendu.aide")}</p>
      </div>
      <form onSubmit={enregistrer} noValidate className="space-y-3">
        <label className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-dashed border-muted-foreground/40 bg-background px-3.5 ring-offset-background focus-within:border-solid focus-within:border-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input type="url" inputMode="url" value={saisie} onChange={(ev) => { setSaisie(ev.target.value); setErreur("") }}
            aria-label={t("evenements.compteRendu.lien")} placeholder={t("evenements.compteRendu.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
        {alerte}
        <Button type="submit" disabled={busy || !saisie.trim()} className="gap-1.5">
          <Check className="h-4 w-4" aria-hidden />{t("evenements.compteRendu.enregistrer")}
        </Button>
      </form>
    </section>
  )
}
