"use client";

import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { CercleChromatique } from "@/components/performance/CercleChromatique";
import { compter } from "@/lib/usage";
import { useAuth } from "@/lib/firebase/auth";
import { setCouleurAccords, useChoixCouleursAccords } from "@/lib/couleurAccords";
import { FOND_CLAIR, FOND_SOMBRE, SURFACE_MENU_CLAIRE, SURFACE_MENU_SOMBRE, TEINTES, garderContraste } from "@/lib/performance/couleurIcones";

// Couleur des accords au choix de chacun (docs/spec-mode-louange-forscore-2.md, lot CA-B) : deux rangées (chants en français,
// chants en chinois) de sept pastilles : l'origine, cinq teintes, « Autre couleur » (cercle chromatique sous la rangée).
// Hôtes : « menu » (⋯ du chant, réglages de la vue partitions : Radix, la rubrique n'entre pas dans sa navigation) et
// « panneau » (Options du mode louange, qui porte son titre et passe son thème `theme`).
type Langue = "fr" | "zh";
const PRETES = TEINTES.filter((c) => c.id !== "bleu");
const IDS = ["origine", ...PRETES.map((c) => c.id), "autre"];
const PASTILLE_CHOISIE = "ring-2 ring-foreground ring-offset-2 ring-offset-popover";
// Couleurs que prend l'origine (globals.css : --chord-color, --jianpu-color, --foreground), clair puis sombre.
const ORIGINE_CLAIR = { bleu: "#3f63cf", rouge: "#b3261d", texte: "#1c1c1e" };
const ORIGINE_SOMBRE = { bleu: "#8fb0ff", rouge: "#ff7d72", texte: "#f2f2f7" };
const ARC_EN_CIEL = "conic-gradient(hsl(0 70% 50%), hsl(60 70% 50%), hsl(120 70% 50%), hsl(180 70% 50%), hsl(240 70% 50%), hsl(300 70% 50%), hsl(360 70% 50%))";

export function ChoixCouleurAccords({ variante, theme, sansMention }: { variante: "menu" | "panneau"; theme?: "light" | "dark"; sansMention?: boolean }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const sombre = (theme ?? resolvedTheme) === "dark";
  const uid = loading ? undefined : user?.uid ?? null;
  const choix = useChoixCouleursAccords(uid);
  const [ouvert, setOuvert] = useState<Langue | null>(null);
  const titre = useId();
  const surface = sombre ? SURFACE_MENU_SOMBRE : SURFACE_MENU_CLAIRE;
  const o = sombre ? ORIGINE_SOMBRE : ORIGINE_CLAIR;
  const [bleu, rouge, texte] = [o.bleu, o.rouge, o.texte].map((h) => garderContraste(h, surface));
  const fonds: Record<Langue, string> = {
    fr: `linear-gradient(135deg, ${bleu} 50%, ${texte} 50%)`,
    zh: `conic-gradient(${rouge} 0 33.4%, ${bleu} 0 66.7%, ${texte} 0)`,
  };

  // Échap ferme d'abord le cercle : en capture sur la fenêtre, avant le menu (Radix écoute le document).
  useEffect(() => {
    if (!ouvert) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOuvert(null);
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [ouvert]);

  const rangee = (langue: Langue) => {
    const valeur = choix[langue];
    const choisie = valeur === null ? "origine" : PRETES.find((c) => c.hex === valeur)?.id ?? "autre";
    const lid = `${titre}-${langue}`;
    const aller = (id: string, repetition = false) => {
      if (id === "autre") return setOuvert(langue);
      if (id !== choisie && !repetition) compter("cmd.louange.couleurAccords");
      setOuvert(null);
      setCouleurAccords(uid ?? null, langue, id === "origine" ? null : PRETES.find((c) => c.id === id)!.hex);
    };
    const pastille = (id: string, nom: string, fond: string, onClick: () => void) => (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={choisie === id}
        aria-expanded={id === "autre" ? ouvert === langue : undefined}
        aria-label={nom}
        data-teinte={id}
        disabled={loading}
        tabIndex={choisie === id ? 0 : -1}
        onClick={onClick}
        className={`h-11 w-11 shrink-0 rounded-full border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-[color:var(--chord-color)] disabled:opacity-40 ${choisie === id ? PASTILLE_CHOISIE : ""} ${id === "autre" && ouvert === langue ? "outline outline-1 outline-dashed outline-offset-[6px] outline-foreground" : ""}`}
        style={{ background: fond }}
      />
    );
    return (
      <div className="space-y-1.5 [container-type:inline-size]" data-langue={langue}>
        <div id={lid} className="px-2 text-xs text-muted-foreground">{t(langue === "fr" ? "couleurAccords.francais" : "couleurAccords.chinois")}</div>
        <div
          role="radiogroup"
          aria-labelledby={lid}
          className="grid grid-cols-4 justify-items-start gap-1.5 px-1 [@container(min-width:352px)]:flex [@container(min-width:352px)]:justify-between"
          onKeyDown={(e) => {
            // Radiogroup standard : ← ↑ et → ↓ passent à la pastille voisine en la choisissant, en boucle.
            const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
            if (d === 0) return;
            e.preventDefault();
            e.stopPropagation();
            // Partir de la pastille qui a le focus (l'arc-en-ciel ouvert n'est pas la teinte retenue), sinon de la teinte retenue.
            const depart = (e.target as HTMLElement).closest<HTMLElement>("[data-teinte]")?.dataset.teinte ?? choisie;
            const suivant = IDS[(IDS.indexOf(depart) + d + IDS.length) % IDS.length];
            aller(suivant, e.repeat);
            e.currentTarget.querySelector<HTMLElement>(`[data-teinte="${suivant}"]`)?.focus();
          }}
        >
          {pastille("origine", t("couleurAccords.origine"), fonds[langue], () => aller("origine"))}
          {PRETES.map((c) => pastille(c.id, t(`performance.iconColors.${c.id}`), garderContraste(c.hex, surface), () => aller(c.id)))}
          {pastille(
            "autre",
            valeur && choisie === "autre" ? `${t("performance.iconColors.autre")} ${valeur}` : t("performance.iconColors.autre"),
            ARC_EN_CIEL,
            () => setOuvert((l) => (l === langue ? null : langue)),
          )}
        </div>
        {ouvert === langue && (
          <CercleChromatique valeur={valeur ?? TEINTES[0].hex} fond={sombre ? FOND_SOMBRE : FOND_CLAIR} onChange={(hex) => setCouleurAccords(uid ?? null, langue, hex)} />
        )}
      </div>
    );
  };

  return (
    // Dans un menu Radix, les touches s'arrêtent ici (navigation, recherche par lettre) ; Tab reste au menu, ← → aussi (la rangée et le cercle arrêtent les leurs : ← referme le sous-menu depuis le lien).
    <div className="space-y-3 pb-1" onKeyDown={(e) => { if (variante === "menu" && e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") e.stopPropagation(); }}>
      {variante === "menu" && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("couleurAccords.titre")}</DropdownMenuLabel>}
      {rangee("fr")}
      {rangee("zh")}
      <button
        type="button"
        disabled={loading || (choix.fr === null && choix.zh === null)}
        onClick={() => { compter("cmd.louange.couleurAccords"); setOuvert(null); setCouleurAccords(uid ?? null, "fr", null); setCouleurAccords(uid ?? null, "zh", null); }}
        className="flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-[color:var(--chord-color)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
      >
        {t("couleurAccords.lien")}
      </button>
      {!sansMention && <p className="-mt-2 px-2 text-xs text-muted-foreground">{t(user ? "couleurAccords.retenueCompte" : "dispositions.retenue")}</p>}
    </div>
  );
}
