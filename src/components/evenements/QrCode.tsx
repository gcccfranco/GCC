"use client"

// Lien d'inscription d'un évènement avec son QR code (lot 6 bis) : le QR est
// visible d'emblée dans une petite tuile, un tap l'agrandit pour être
// photographié ou imprimé ; l'adresse, sans « https:// », est écrite à côté.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Copy } from "lucide-react"
import QRCode from "qrcode"
import { TOUCHER_44 } from "@/lib/toucher44"

/** `copier` (bo-evenements-5, fiche de gestion seulement : la page membre a déjà « Partager ») : le lien passe sur sa
 *  ligne, coupé n'importe où sur deux lignes au plus, avec dessous le bouton « Copier le lien ». */
export function QrCodeLink({ path, label, avecInscriptions, copier = false }: { path: string; label: string; avecInscriptions: boolean; copier?: boolean }) {
  const { t } = useTranslation()
  const [src, setSrc] = useState("")
  const [big, setBig] = useState(false)
  const [copie, setCopie] = useState(false)
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`

  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setSrc).catch(() => setSrc(""))
  }, [url])

  useEffect(() => {
    if (!copie) return
    const minuteur = window.setTimeout(() => setCopie(false), 2000)
    return () => window.clearTimeout(minuteur)
  }, [copie])

  async function copierLeLien() {
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
    } catch { /* écriture refusée */ }
  }

  return (
    <div className="flex items-center gap-3 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setBig((b) => !b)}
        aria-pressed={big}
        className={`shrink-0 overflow-hidden rounded-xl border border-border bg-white p-2 transition-[width,height] duration-200 ${big ? "h-56 w-56" : "h-16 w-16"}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={t("evenements.qrAlt", { label })} className="h-full w-full" />
        ) : (
          <span className="block h-full w-full rounded-lg bg-secondary" aria-hidden />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{t(avecInscriptions ? "evenements.lienInscription" : "evenements.lienFiche")}</p>
        <a href={url} className={`block text-sm font-medium text-foreground underline-offset-4 hover:underline ${copier ? "line-clamp-2 break-all" : "truncate"}`}>{url.replace(/^https?:\/\//, "")}</a>
        {copier && (
          <>
            <button
              type="button"
              onClick={copierLeLien}
              className={`mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70 ${TOUCHER_44}`}
            >
              {copie ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copie ? t("evenements.lienCopie") : t("evenements.copierLien")}
            </button>
            <span role="status" className="sr-only">{copie ? t("evenements.lienCopie") : ""}</span>
          </>
        )}
      </div>
    </div>
  )
}
