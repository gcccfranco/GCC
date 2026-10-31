import type { Ref } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** Bandeau D4 : « N chants non chargés », réessayer ou continuer quand même. */
export function BandeauChantsManquants({
  nombre,
  deuxVolets,
  essaiEchoue,
  essaiEnCours,
  aucunChantCharge,
  refReessayer,
  onReessayer,
  onContinuer,
  onFermer,
}: {
  nombre: number;
  deuxVolets: boolean;
  essaiEchoue: boolean;
  essaiEnCours: boolean;
  aucunChantCharge: boolean;
  refReessayer: Ref<HTMLButtonElement>;
  onReessayer: () => void;
  onContinuer: () => void;
  onFermer: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      data-chants-manquants
      // Au-dessus de la barre du bas sur téléphone et tablette portrait (même calcul que BoutonNouveau).
      className={`fixed z-50 flex max-w-md flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-lg ${
        // Deux volets : en bas à droite, sur le volet de lecture, sans couvrir le pied du sommaire.
        deuxVolets ? "bottom-4 right-6" : "inset-x-4 mx-auto bottom-[calc(var(--tabbar-bottom)+78px+8px)]"
      }`}
    >
      <span className="font-medium text-foreground">
        {t("setlists.detail.chantsNonCharges", { count: nombre })}
        {essaiEchoue && !essaiEnCours && (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{t("setlists.detail.chantsToujoursAbsents")}</span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <Button ref={refReessayer} size="sm" variant="outline" disabled={essaiEnCours} onClick={onReessayer}>
          {essaiEnCours ? t("setlists.detail.essaiEnCours") : t("common.retry")}
        </Button>
        {aucunChantCharge ? null : (
          <Button size="sm" onClick={onContinuer}>{t("setlists.detail.continuerQuandMeme")}</Button>
        )}
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={t("common.buttons.close")} onClick={onFermer}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </span>
    </div>
  );
}
