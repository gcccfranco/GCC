"use client"

// Lien d'une fiche d'évènement avec son QR code (lot 6 bis) : le QR est
// visible d'emblée en petit, un tap l'agrandit pour être photographié ou
// imprimé ; l'adresse est écrite à côté.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"

export function QrCodeLink({ path, label }: { path: string; label: string }) {
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
        className={`shrink-0 overflow-hidden rounded-xl bg-white p-1.5 transition-[width,height] duration-200 ${big ? "h-56 w-56" : "h-20 w-20"}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={t("evenements.qrAlt", { label })} className="h-full w-full" />
        ) : (
          <span className="block h-full w-full rounded-lg bg-secondary" aria-hidden />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{t("evenements.lienFiche")}</p>
        <p className="break-all text-xs text-muted-foreground">{url}</p>
      </div>
    </div>
  )
}
