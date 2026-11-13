"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { getPdfStylePref, setPdfStylePref, type PdfStyle } from "@/lib/pdfStylePref";

export type PdfVersion = "mine" | "presidence";

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
  versionChoice,
}: {
  open: boolean;
  onClose: () => void;
  forSetlist: boolean;
  onDownload: (style: PdfStyle, version: PdfVersion) => Promise<void>;
  onListe?: () => Promise<void>;
  /** Setlist : propose « Ma version » / « Version de la présidence » (docs/spec-version-perso.md). */
  versionChoice?: boolean;
}) {
  useStandaloneScrollLock(open);
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="md:max-w-md md:mx-auto" aria-describedby={undefined}>
        {/* Monté à l'ouverture : la préférence est relue à chaque fois. */}
        {open && <Choices forSetlist={forSetlist} onClose={onClose} onDownload={onDownload} onListe={onListe} versionChoice={versionChoice} />}
      </DrawerContent>
    </Drawer>
  );
}

function Choices({ forSetlist, onClose, onDownload, onListe, versionChoice }: Omit<Parameters<typeof PdfChoiceSheet>[0], "open">) {
  const { t } = useTranslation();
  const [style, setStyle] = useState<PdfStyle | "liste">(() => getPdfStylePref(forSetlist));
  // Présélectionnée à chaque ouverture, jamais mémorisée.
  const [version, setVersion] = useState<PdfVersion>("mine");
  const [busy, setBusy] = useState(false);
  const styles: (PdfStyle | "liste")[] = forSetlist ? ["classic", "colors", "compact"] : ["classic", "colors"];
  if (onListe) styles.push("liste");

  async function download() {
    setBusy(true);
    // La liste n'est pas une mise en page de partition : elle n'est pas retenue.
    if (style !== "liste") setPdfStylePref(style);
    try {
      await (style === "liste" ? onListe?.() : onDownload(style, versionChoice ? version : "presidence"));
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
        <Group
          label={t("pdf.choice.title")}
          options={styles.map((s) => ({ value: s, label: t(`pdf.choice.${s}`), help: t(`pdf.choice.${s}Help`) }))}
          value={style}
          onChange={setStyle}
        />
        {versionChoice && style !== "liste" && (
          <Group
            label={t("pdf.choice.version")}
            options={(["mine", "presidence"] as const).map((v) => ({ value: v, label: t(`pdf.choice.${v}`), help: t(`pdf.choice.${v}Help`) }))}
            value={version}
            onChange={setVersion}
          />
        )}
        <Button type="button" className="w-full" disabled={busy} onClick={download}>
          {busy ? t("pdf.choice.preparing") : t("pdf.choice.download")}
        </Button>
      </div>
    </>
  );
}

function Group<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string; help: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="overflow-hidden rounded-xl bg-card">
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className="group-row relative flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 active:bg-secondary/70 cursor-pointer"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base text-foreground">{o.label}</span>
              <span className="block text-sm text-muted-foreground">{o.help}</span>
            </span>
            <Check aria-hidden className={`h-5 w-5 shrink-0 text-foreground ${checked ? "" : "invisible"}`} />
          </button>
        );
      })}
    </div>
  );
}
