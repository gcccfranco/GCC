"use client"

// Lien d'inscription d'un évènement avec son QR code (lot 6 bis) : le QR est
// visible d'emblée dans une petite tuile, un tap l'agrandit pour être
// photographié ou imprimé ; l'adresse, sans « https:// », est écrite à côté.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"

export function QrCodeLink({ path, label, avecInscriptions }: { path: string; label: string; avecInscriptions: boolean }) {
  const { t } = useTranslation()
  const [src, setSrc] = useState("")
  const [big, setBig] = useState(false)
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`

  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setSrc).catch(() => setSrc(""))
  }, [url])

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
        <a href={url} className="block truncate text-sm font-medium text-foreground underline-offset-4 hover:underline">{url.replace(/^https?:\/\//, "")}</a>
      </div>
    </div>
  )
}
