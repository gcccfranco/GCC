"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { getPdfStylePref, setPdfStylePref, type PdfStyle } from "@/lib/pdfStylePref";

/** Fenêtre « Quel PDF ? » (lot 5, docs/spec-export-pdf.md) : deux choix pour
 *  un chant, trois pour une setlist ; le dernier choix de l'appareil revient
 *  présélectionné. `onDownload` génère le fichier ; la fenêtre se ferme après.
 *  `onListe` (setlist en deux volets, docs/spec-deux-volets.md, Q8) : le PDF
 *  liste en plus, puisqu'il n'y a plus de vue liste pour le télécharger. */
export function PdfChoiceSheet({
  open,
  onClose,
  forSetlist,
  onDownload,
  onListe,
}: {
  open: boolean;
  onClose: () => void;
  forSetlist: boolean;
  onDownload: (style: PdfStyle) => Promise<void>;
  onListe?: () => Promise<void>;
}) {
  useStandaloneScrollLock(open);
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="md:max-w-md md:mx-auto" aria-describedby={undefined}>
        {/* Monté à l'ouverture : la préférence est relue à chaque fois. */}
        {open && <Choices forSetlist={forSetlist} onClose={onClose} onDownload={onDownload} onListe={onListe} />}
      </DrawerContent>
    </Drawer>
  );
}

function Choices({ forSetlist, onClose, onDownload, onListe }: Omit<Parameters<typeof PdfChoiceSheet>[0], "open">) {
  const { t } = useTranslation();
  const [style, setStyle] = useState<PdfStyle | "liste">(() => getPdfStylePref(forSetlist));
  const [busy, setBusy] = useState(false);
  const styles: (PdfStyle | "liste")[] = forSetlist ? ["classic", "colors", "compact"] : ["classic", "colors"];
  if (onListe) styles.push("liste");

  async function download() {
    setBusy(true);
    // La liste n'est pas une mise en page de partition : elle n'est pas retenue.
    if (style !== "liste") setPdfStylePref(style);
    try {
      await (style === "liste" ? onListe?.() : onDownload(style));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DrawerHeader className="pb-1">
        <DrawerTitle>{t("pdf.choice.title")}</DrawerTitle>
      </DrawerHeader>
      <div className="px-4 pb-6 space-y-4">
        <div role="radiogroup" aria-label={t("pdf.choice.title")} className="overflow-hidden rounded-xl bg-card">
          {styles.map((s) => {
            const checked = s === style;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setStyle(s)}
                className="group-row relative flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 active:bg-secondary/70 cursor-pointer"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base text-foreground">{t(`pdf.choice.${s}`)}</span>
                  <span className="block text-sm text-muted-foreground">{t(`pdf.choice.${s}Help`)}</span>
                </span>
                <Check aria-hidden className={`h-5 w-5 shrink-0 text-foreground ${checked ? "" : "invisible"}`} />
              </button>
            );
          })}
        </div>
        <Button type="button" className="w-full" disabled={busy} onClick={download}>
          {busy ? t("pdf.choice.preparing") : t("pdf.choice.download")}
        </Button>
      </div>
    </>
  );
}
