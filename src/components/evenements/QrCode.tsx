"use client"

// QR code vers une adresse du site (calendrier public, fiche d'évènement),
// généré dans le navigateur, affiché en grand pour être photographié ou imprimé.

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"

export function QrCodeButton({ path, label }: { path: string; label: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState("")
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`

  useEffect(() => {
    if (!open || src) return
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setSrc).catch(() => setSrc(""))
  }, [open, src, url])

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{t("evenements.qr")}</Button>
      {open && (
        <div className="bg-card shadow-soft rounded-xl p-4 flex flex-col items-center gap-2">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={t("evenements.qrAlt", { label })} className="w-64 h-64 max-w-full" />
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}
          <p className="text-xs text-muted-foreground break-all text-center">{url}</p>
        </div>
      )}
    </div>
  )
}
