"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Bascule } from "@/components/ui/bascule";
import { ChoixCouleurAccords } from "@/components/song/ChoixCouleurAccords";
import { ChoixDisposition } from "@/components/song/ChoixDisposition";
import { ChoixNotation } from "@/components/song/ChoixNotation";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useReglagesAffichage, type ReglagesAffichage } from "@/hooks/useReglagesAffichage";
import { MAX_FONT_SCALE, MIN_FONT_SCALE } from "@/lib/fontScalePref";
import { ROLE_IDS } from "@/lib/performance/roleCompte";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";

// La marge « Affichage » (docs/spec-reglages-unifies.md, RU-2, piste B) : trois groupes (Je joue, Ce que je lis, La page),
// une mention de portée sous chacun. Dès 1 024 px (tablette paysage) : colonne de 320 px qui POUSSE la musique (`children`,
// rendus à côté d'elle, jamais dessous) ; en dessous (ou sans place pour la colonne : `sansColonne`) : feuille basse opaque, sans voile, de 40 % de la hauteur,
// pleine largeur de la zone de la musique (la fenêtre ; le volet du chant dans une page à deux volets, `useDeuxVolets`) ; la musique garde
// alors une réserve en bas égale à la feuille. Deux formes seulement (B5). Les styles de mouvement : globals.css (.marge-aff).
type Place = "colonne" | "feuille";
const COLONNE = "(min-width: 1024px)";
const suivre = (f: () => void) => {
  const m = window.matchMedia(COLONNE);
  m.addEventListener("change", f);
  return () => m.removeEventListener("change", f);
};
const place = (): Place => (window.matchMedia(COLONNE).matches ? "colonne" : "feuille");
export const usePlace = () => useSyncExternalStore(suivre, place, () => "colonne" as Place);

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  /** Chant chinois : lignes Pinyin et 简谱 | Paroles. */
  zh: boolean;
  /** Le chant a une partition 简谱 : sans elle, pas de ligne 简谱 | Paroles. */
  aJianpu: boolean;
  /** 简谱 | Paroles tel que l'écran le montre, quand il suit autre chose que la clé seule (setlist : paroles par défaut du choriste, RU-4). */
  jianpuVu?: boolean;
  uid: string | null | undefined;
  mode: "page" | "louange";
  /** Remplace le contenu du groupe « La page » (RU-5 : colonnes, Demi-page, Thème…). */
  groupePage?: ReactNode;
  /** Le bouton qui a ouvert la marge : le focus lui revient à la fermeture. */
  retourFocus?: RefObject<HTMLElement | null>;
  /** Page chant : pas de groupe « Je joue », tout est montré (le rôle reste propre au mode louange). */
  sansRole?: boolean;
  /** Pas de colonne même dès 1 024 px (la musique garderait moins de 340 px) : feuille du bas sur la zone de la musique. */
  sansColonne?: boolean;
  /** RU-5, mode louange : réglages tenus par le mode (accords, pinyin, 简谱, ordre, rôle, taille, disposition), fusionnés sur le crochet. */
  reglages?: Partial<ReglagesAffichage>;
  /** RU-5 : contenu du groupe « Je joue » (le rôle du mode louange), à la place des pilules. */
  groupeRole?: ReactNode;
  /** RU-5 : lignes ajoutées à la fin de « Ce que je lis » (Paroles, Partition). */
  groupeLecture?: ReactNode;
  /** RU-5 : la ligne Pinyin quand elle diffère de `zh` (mode louange : un chant de la setlist a du pinyin). */
  avecPinyin?: boolean;
  /** La musique : placée à côté de la colonne, avec une réserve en bas sous la feuille. */
  children?: ReactNode;
};

const LIGNE = "flex min-h-11 items-center justify-between gap-3";

/** Bouton de lecture (Accords, Pinyin, Affichage, Crayon) : rond à icône seule sous 768 px, pastille icône + mot dès 768 px ; le mot : `<span className="hidden md:inline">`. */
export const BOUTON_LECTURE = "h-9 w-9 p-0 md:h-8 md:w-auto md:px-3 gap-1.5 rounded-full text-xs font-semibold flex items-center justify-center";

// alias pour PanneauMetronome (mode louange, hors tranche)
export { Bascule as Segment };

export function Groupe({ titre, mention, children }: { titre: string; mention: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} data-groupe className="space-y-1 border-t border-border px-4 py-3">
      <h3 id={id} className="text-[13px] font-semibold text-muted-foreground">{titre}</h3>
      {children}
      <p className="text-xs text-muted-foreground">{mention}</p>
    </section>
  );
}

export function MargeAffichage({ ouvert, onFermer, zh, aJianpu, jianpuVu, uid, mode, groupePage, retourFocus, sansColonne, sansRole, reglages, groupeRole, groupeLecture, avecPinyin, children }: Props) {
  const { t } = useTranslation();
  const r = { ...useReglagesAffichage(uid), ...reglages };
  const placeEcran = usePlace();
  const lieu: Place = sansColonne ? "feuille" : placeEcran;
  const fermer = useRef<HTMLButtonElement>(null);
  const enveloppe = useRef<HTMLDivElement>(null);
  // Page en deux volets : la feuille couvre le conteneur de la marge (le volet du chant), pas la liste voisine.
  const [volet, setVolet] = useState<{ gauche: number; largeur: number } | null>(null);
  const deuxVolets = useDeuxVolets();
  const surVolet = sansColonne && children !== undefined && deuxVolets;
  useEffect(() => {
    const el = enveloppe.current;
    if (!surVolet || !el) { setVolet(null); return; }
    const mesure = () => { const r = el.getBoundingClientRect(); setVolet({ gauche: r.left, largeur: r.width }); };
    mesure();
    const ro = new ResizeObserver(mesure);
    ro.observe(el);
    window.addEventListener("resize", mesure);
    return () => { ro.disconnect(); window.removeEventListener("resize", mesure); };
  }, [surVolet]);
  const titre = useId();
  const choriste = !sansRole && (r.role === "choriste" || r.role === "presidence");
  const mention = t("margeAffichage.retenu");
  const vuDejaOuvert = useRef(false);

  // Le focus entre dans la marge à l'ouverture et revient au bouton qui l'a ouverte (dépend d'`ouvert` seul :
  // un hôte qui passe `onFermer` en ligne ne doit pas renvoyer le focus au × à chaque rendu).
  const fermerRef = useRef(onFermer);
  useEffect(() => { fermerRef.current = onFermer; }, [onFermer]);
  const retourRef = useRef(retourFocus);
  useEffect(() => { retourRef.current = retourFocus; }, [retourFocus]);
  useEffect(() => {
    if (!ouvert) {
      if (vuDejaOuvert.current) retourRef.current?.current?.focus();
      vuDejaOuvert.current = false;
      return;
    }
    vuDejaOuvert.current = true;
    fermer.current?.focus();
    // Échap ferme, sauf s'il a déjà servi (un menu ouvert dans la marge se ferme seul).
    // preventDefault : l'hôte (mode louange) lit `defaultPrevented` et ne quitte pas sur le même Échap.
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); fermerRef.current(); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [ouvert]);

  const colonne = lieu === "colonne";
  const geometrie = colonne
    ? {
        position: "sticky", width: ouvert ? 320 : 0, flex: "none", ...(mode === "page" && ouvert ? { marginLeft: 24 } : {}), overflow: "hidden", alignSelf: "flex-start",
        // Page chant : sous la barre du haut et la barre du chant, comme la colonne Harmonie.
        ...(mode === "page" ? { top: "var(--nav-h)", marginTop: 48, height: "calc(100dvh - var(--nav-h) - 48px)" } : { top: 0, height: "100dvh" }),
        // Mode louange (sans `children`) : à droite de l'écran, la page se raccourcit de sa largeur (PerformanceMode).
        ...(mode === "louange" && children === undefined ? { position: "fixed" as const, right: 0, zIndex: 10000, ...(ouvert ? {} : { display: "none" as const }) } : {}),
      } as const
    : {
        position: "fixed", bottom: 0, height: "40dvh", zIndex: mode === "louange" ? 10000 : 50, borderRadius: "18px 18px 0 0", boxShadow: "0 -1px 0 hsl(var(--border))",
        ...(surVolet && volet ? { left: volet.gauche, width: volet.largeur } : { left: 0, right: 0 }), transform: `translateY(${ouvert ? 0 : 100}%)`,
        ...(mode === "louange" && !ouvert ? { display: "none" as const } : {}),
      } as const;

  const retenue = (
    <aside
      className="marge-aff bg-card text-foreground"
      id="marge-affichage"
      data-testid="marge-affichage"
      data-mode={mode}
      data-ouvert={ouvert}
      data-place={lieu}
      aria-labelledby={titre}
      role="complementary"
      style={{ ...geometrie, borderLeft: colonne ? "1px solid hsl(var(--foreground))" : undefined, borderTop: colonne ? undefined : "1px solid hsl(var(--border))" }}
    >
      <div className="flex h-full flex-col" style={colonne ? { width: 320 } : undefined}>
        {!colonne && <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" />}
        <div className="flex items-center justify-between px-4 pt-2">
          <h2 id={titre} className="text-base font-semibold">{t("margeAffichage.titre")}</h2>
          <button
            ref={fermer}
            type="button"
            aria-label={t("margeAffichage.fermer")}
            onClick={onFermer}
            className="grid h-11 w-11 place-items-center rounded-full text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ×
          </button>
        </div>
        <div data-testid="marge-corps" className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
          {/* Feuille pleine largeur : les réglages gardent une colonne de 560 px au plus, centrée (critique CI-11). */}
          <div className={colonne ? undefined : "mx-auto w-full max-w-[560px]"}>
          {!sansRole && <Groupe titre={t("margeAffichage.jeJoue")} mention={mention}>
            {groupeRole ?? <div className="py-1">
              <Bascule
                aLaLigne
                label={t("margeAffichage.jeJoue")}
                valeurs={ROLE_IDS.map((id) => ({ id, nom: t(`performance.roles.${id}`) }))}
                choisie={r.role ?? ""}
                onChoix={(id) => r.setRole(id as (typeof ROLE_IDS)[number])}
              />
            </div>}
          </Groupe>}

          <Groupe titre={t("margeAffichage.jeLis")} mention={mention}>
            {!choriste && (
              <>
                {/* Page : le bouton « Accords » de la barre double l'interrupteur (B6). */}
                {mode === "louange" && (
                  <div className={LIGNE}>
                    <span className="text-sm">{t("performance.chords")}</span>
                    <Switch checked={r.accords} onCheckedChange={r.setAccords} aria-label={t("performance.chords")} />
                  </div>
                )}
                <ChoixNotation variante="fenetre" />
              </>
            )}
            {(avecPinyin ?? zh) && (
              <div className={LIGNE}>
                <span className="text-sm">{t("performance.pinyin")}</span>
                <Switch checked={r.pinyin} onCheckedChange={r.setPinyin} aria-label={t("performance.pinyin")} />
              </div>
            )}
            {zh && aJianpu && (
              <div className={LIGNE}>
                <span className="text-sm">{t("margeAffichage.score")}</span>
                <Bascule
                  label={t("margeAffichage.score")}
                  valeurs={[{ id: "jianpu", nom: "简谱" }, { id: "paroles", nom: t("performance.lyrics") }]}
                  choisie={(jianpuVu ?? r.jianpu) ? "jianpu" : "paroles"}
                  onChoix={(id) => r.setJianpu(id === "jianpu")}
                />
              </div>
            )}
            <div className="space-y-1 py-1">
              <p className="text-sm">{t("margeAffichage.ordre")}</p>
              <Bascule
                vertical
                label={t("margeAffichage.ordre")}
                valeurs={[
                  { id: "played", nom: t("margeAffichage.ordreJoue") },
                  { id: "unique", nom: t("margeAffichage.ordreUnique") },
                  { id: "structure", nom: t("margeAffichage.ordreStructure") },
                ]}
                choisie={r.ordre}
                onChoix={(id) => r.setOrdre(id as PartitionLayout)}
              />
            </div>
            {groupeLecture}
          </Groupe>

          <Groupe titre={t("margeAffichage.laPage")} mention={mention}>
            {groupePage ?? (
              <>
                <div className="space-y-1 py-1">
                  <p id={`${titre}-disp`} className="text-sm">{t("dispositions.titre")}</p>
                  <ChoixDisposition variante="panneau" souple labelledBy={`${titre}-disp`} langue={zh ? "zh" : "fr"} disposition={r.disposition} changeDisposition={r.setDisposition} />
                </div>
                <div className={LIGNE}>
                  <span className="text-sm">{t("margeAffichage.taille")}</span>
                  <span className="inline-flex items-center gap-1">
                    <button type="button" aria-label={t("performance.textSmaller")} disabled={r.taille <= MIN_FONT_SCALE} onClick={() => r.setTaille(r.taille - 0.1)} className="grid h-11 w-11 place-items-center rounded-full border border-border text-sm font-semibold disabled:opacity-40">A−</button>
                    <span data-testid="marge-taille" className="min-w-12 text-center text-sm tabular-nums">{Math.round(r.taille * 100)} %</span>
                    <button type="button" aria-label={t("performance.textLarger")} disabled={r.taille >= MAX_FONT_SCALE} onClick={() => r.setTaille(r.taille + 0.1)} className="grid h-11 w-11 place-items-center rounded-full border border-border text-sm font-semibold disabled:opacity-40">A+</button>
                  </span>
                </div>
                {!choriste && (
                  <div className="space-y-1 py-1">
                    <p className="text-sm">{t("couleurAccords.titre")}</p>
                    <ChoixCouleurAccords variante="panneau" sansMention />
                  </div>
                )}
              </>
            )}
          </Groupe>
          </div>
        </div>
      </div>
    </aside>
  );

  if (children === undefined) return retenue;
  return (
    <div ref={enveloppe} style={{ display: "flex", alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: !colonne && ouvert ? "40dvh" : 0 }}>{children}</div>
      {retenue}
    </div>
  );
}
