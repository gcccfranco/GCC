"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Groupe, Segment, usePlace } from "@/components/song/MargeAffichage";
import { IconeNote, type TypeNote } from "@/components/performance/IconeNote";
import { clampTempo, TEMPO_MAX, TEMPO_MIN, type Decompte, type Subdivision } from "@/lib/performance/tempo";
import type { Accent, Mesure } from "@/lib/performance/metronome";

// Le panneau Métronome (lot MT, MT-2) : même forme que la marge « Affichage » (colonne de 320 px dès 1 024 px, feuille de 560 px
// dès 768 px, feuille pleine largeur dessous) ; la feuille a deux crans (60 % et 92 % de l'écran). Pas d'animation en mode louange.
// Il remplacera la marge « Affichage » quand elle sera montée en louange (RU-5) : une seule colonne à la fois.
const MESURES = ["2/4", "3/4", "4/4", "6/8", "12/8"];
const NIVEAUX: Accent[] = ["fort", "moyen", "faible", "muet"];
const APPUI_LONG_MS = 500;
const REPETITION_MS = 250;
const PAUSE_TAPER_MS = 2000;
const BINAIRES: { id: Subdivision; note: TypeNote }[] = [
  { id: "aucune", note: "noire" },
  { id: "croches", note: "croches" },
  { id: "doubles", note: "doubles" },
  { id: "pointee", note: "pointee" },
];

/** − / + : un clic = 1, appui long = 5 (après 500 ms, répété toutes les 250 ms) ; au clavier, 1 par appui. */
function BoutonPas({ delta, label, desactive, onPas, children }: { delta: 1 | -1; label: string; desactive: boolean; onPas: (d: number) => void; children: React.ReactNode }) {
  const attente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boucle = useRef<ReturnType<typeof setInterval> | null>(null);
  const long = useRef(false);
  const arreter = () => {
    if (attente.current) clearTimeout(attente.current);
    if (boucle.current) clearInterval(boucle.current);
    attente.current = null;
    boucle.current = null;
  };
  useEffect(() => arreter, []);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={desactive}
      data-panneau-pas={delta > 0 ? "plus" : "moins"}
      {...(delta > 0 ? { "data-tempo-plus": "" } : { "data-tempo-moins": "" })}
      onPointerDown={() => {
        arreter();
        long.current = false;
        attente.current = setTimeout(() => {
          long.current = true;
          onPas(5 * delta);
          boucle.current = setInterval(() => onPas(5 * delta), REPETITION_MS);
        }, APPUI_LONG_MS);
      }}
      onPointerUp={arreter}
      onPointerCancel={arreter}
      onPointerLeave={arreter}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.detail === 0 || !long.current) onPas(delta);
        long.current = false;
      }}
      className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Une rangée de pastilles à choix unique (cibles de 44 px au moins, retour à la ligne si besoin). */
function Pastilles({ label, valeurs, choisie, onChoix }: { label: string; valeurs: { id: string; nom: string }[]; choisie: string; onChoix: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5 py-1">
      {valeurs.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={choisie === v.id}
          onClick={() => onChoix(v.id)}
          className={`min-h-11 min-w-11 rounded-full border border-border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${choisie === v.id ? "bg-foreground text-background" : ""}`}
        >
          {v.nom}
        </button>
      ))}
    </div>
  );
}

export function PanneauMetronome({
  ouvert, onFermer, tempo, tempoAppareil, tempoFichier, fixerTempo, effacerTempo, mesure, mesureTexte, changerMesure,
  accents, tournerAccent, subdivision, changerSubdivision, decompte, changerDecompte, marche, onMarche, bande, setBande, basBande,
}: {
  ouvert: boolean;
  onFermer: () => void;
  tempo: number;
  tempoAppareil: number | null;
  tempoFichier: number | undefined;
  fixerTempo: (n: number) => void;
  effacerTempo: () => void;
  mesure: Mesure;
  mesureTexte: string;
  changerMesure: (texte: string) => void;
  accents: Accent[];
  tournerAccent: (i: number) => void;
  subdivision: Subdivision;
  changerSubdivision: (s: Subdivision) => void;
  decompte: Decompte;
  changerDecompte: (n: Decompte) => void;
  marche: boolean;
  onMarche: () => void;
  bande: boolean;
  setBande: (v: boolean) => void;
  /** Bas de la bande des temps (CSS) : le grand cran de la feuille s'arrête dessous, la bande reste visible. */
  basBande: string;
}) {
  const { t } = useTranslation();
  const lieu = usePlace();
  const colonne = lieu === "colonne";
  const titre = useId();
  const fermer = useRef<HTMLButtonElement>(null);
  const [grand, setGrand] = useState(false);
  const [saisie, setSaisie] = useState<string | null>(null);
  const [autre, setAutre] = useState(() => !MESURES.includes(mesureTexte));
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  const appuis = useRef<number[]>([]);

  // Le focus entre dans le panneau à l'ouverture et revient au bouton qui l'a ouvert.
  useEffect(() => {
    if (!ouvert) return;
    setAutre(false);
    const ouvreur = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fermer.current?.focus();
    // Échap en capture : la feuille Outils (Radix) qui se referme encore marque l'évènement « pris » avant PerformanceMode ;
    // le champ du tempo garde le sien.
    const echap = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target instanceof HTMLInputElement && e.target.type !== "range")) return;
      e.preventDefault();
      fermerRef.current();
    };
    window.addEventListener("keydown", echap, true);
    return () => { window.removeEventListener("keydown", echap, true); if (ouvreur?.isConnected) ouvreur.focus(); };
  }, [ouvert]);

  if (!ouvert) return null;

  const pas = (d: number) => { tempoRef.current = clampTempo(tempoRef.current + d); fixerTempo(tempoRef.current); };
  const valider = () => {
    if (saisie === null) return;
    const n = parseInt(saisie, 10);
    setSaisie(null);
    if (Number.isFinite(n)) fixerTempo(n);
  };
  // Taper : moyenne des 4 derniers intervalles (5 appuis au plus), remise à zéro après 2 s, appliqué dès 2 appuis.
  const taper = () => {
    const maintenant = performance.now();
    const a = appuis.current;
    if (a.length && maintenant - a[a.length - 1] > PAUSE_TAPER_MS) a.length = 0;
    a.push(maintenant);
    if (a.length > 5) a.shift();
    if (a.length >= 2) fixerTempo(60000 / ((a[a.length - 1] - a[0]) / (a.length - 1)));
  };

  const m = autre || !MESURES.includes(mesureTexte) ? "autre" : mesureTexte;
  const niveau = (a: Accent) => t(`panneauMetronome.niveau.${a}`);
  const noteTempo: TypeNote = mesure.compose ? "noirePointee" : "noire";
  const aFixe = tempoAppareil !== null && tempoAppareil !== tempoFichier;
  const ternaire = subdivision === "triolets";
  const unite = mesure.unite;
  const geometrie = colonne
    ? { position: "fixed", top: 0, right: 0, width: 320, height: "100dvh", borderLeft: "1px solid hsl(var(--foreground))" } as const
    : {
        position: "fixed", bottom: 0, height: grand ? `calc(100dvh - ${basBande})` : "60dvh", borderRadius: "18px 18px 0 0", borderTop: "1px solid hsl(var(--border))", boxShadow: "0 -1px 0 hsl(var(--border))",
        left: 0, right: 0, // pleine largeur aussi en tablette portrait (comme le volet Harmonie de JV-5b) : pas de musique coupée de part et d'autre
      } as const;
  const decomptes: { id: string; nom: string }[] = [
    { id: "0", nom: t("panneauMetronome.aucun") },
    { id: "1", nom: t("panneauMetronome.mesure1") },
    { id: "2", nom: t("panneauMetronome.mesure2") },
  ];

  return (
    <aside
      data-panneau-metronome
      data-testid="panneau-metronome"
      data-place={lieu}
      data-cran={colonne ? undefined : grand ? "grand" : "moyen"}
      role="complementary"
      aria-labelledby={titre}
      className="marge-aff bg-card text-foreground"
      data-mode="louange"
      data-ouvert="true"
      style={{ ...geometrie, zIndex: 40, fontFamily: "system-ui, -apple-system, sans-serif", fontVariantNumeric: "tabular-nums" }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      <div className="flex h-full flex-col" style={colonne ? { width: 320 } : undefined}>
        {!colonne && (
          <button
            type="button"
            data-panneau-poignee
            aria-label={t(grand ? "panneauMetronome.reduire" : "panneauMetronome.agrandir")}
            aria-expanded={grand}
            onClick={() => setGrand((g) => !g)}
            className="mx-auto grid h-11 w-24 shrink-0 place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden className="h-1 w-9 rounded-full bg-border" />
          </button>
        )}
        <div className="flex shrink-0 items-center justify-between gap-2 px-4" style={{ paddingTop: colonne ? 8 : 0 }}>
          <h2 id={titre} className="min-w-0 truncate text-base font-semibold">{t("panneauMetronome.titre")}</h2>
          <span className="flex items-center gap-1">
            <button ref={fermer} type="button" aria-label={t("panneauMetronome.fermer")} onClick={onFermer} className="grid h-11 w-11 place-items-center rounded-full text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">×</button>
          </span>
        </div>
        <button
          type="button"
          data-metronome=""
          aria-pressed={bande}
          onClick={() => setBande(!bande)}
          className="mx-4 mt-1 flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{t("performance.metronome")}</span>
          <span aria-hidden="true" className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 ${bande ? "justify-end bg-[color:var(--couleur-icones)]" : "justify-start bg-muted-foreground/40"}`}>
            <span className="h-5 w-5 rounded-full bg-background shadow-sm" />
          </span>
        </button>
        <p role="status" className="sr-only">
          {t(marche ? "panneauMetronome.enMarche" : "panneauMetronome.arrete", { tempo, mesure: `${mesure.temps}/${mesure.unite}` })}
        </p>

        <div data-testid="panneau-corps" className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
          <div className="space-y-2 px-4 pb-3 pt-1">
            {/* (a) grand tempo */}
            <div className="flex items-center justify-between gap-2">
              <BoutonPas delta={-1} label={t("performance.tempoDown")} desactive={tempo <= TEMPO_MIN} onPas={pas}><Minus className="h-5 w-5" aria-hidden="true" /></BoutonPas>
              <div className="flex min-w-0 flex-col items-center">
                {saisie === null ? (
                  <button
                    type="button"
                    data-panneau-tempo
                    data-tempo-valeur
                    aria-label={t("panneauMetronome.saisir", { tempo })}
                    onClick={() => setSaisie(String(tempo))}
                    className="min-h-11 rounded-lg px-2 text-[64px] font-bold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {tempo}
                  </button>
                ) : (
                  <input
                    data-panneau-tempo-saisie
                    aria-label={t("panneauMetronome.saisieNom", { min: TEMPO_MIN, max: TEMPO_MAX })}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={saisie}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setSaisie(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    onBlur={valider}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") valider();
                      else if (e.key === "Escape") { e.preventDefault(); setSaisie(null); }
                    }}
                    className="h-[72px] w-[132px] rounded-lg border border-foreground bg-background text-center text-[64px] font-bold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
                <span className="flex items-center gap-1 text-[13px] text-muted-foreground" data-panneau-unite>
                  <IconeNote note={noteTempo} hauteur={16} /> {t("panneauMetronome.parMin")}
                </span>
              </div>
              <BoutonPas delta={1} label={t("performance.tempoUp")} desactive={tempo >= TEMPO_MAX} onPas={pas}><Plus className="h-5 w-5" aria-hidden="true" /></BoutonPas>
            </div>
            {/* (b) réglette */}
            <div data-reglette className="h-11">
              <input
                type="range"
                min={TEMPO_MIN}
                max={TEMPO_MAX}
                step={1}
                value={tempo}
                aria-label={t("panneauMetronome.tempo")}
                onChange={(e) => fixerTempo(Number(e.target.value))}
                className="h-11 w-full"
              />
            </div>
            {/* (c) Taper et Marche */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-panneau-taper
                onPointerDown={taper}
                onClick={(e) => { if (e.detail === 0) taper(); }}
                className="h-14 touch-manipulation rounded-xl border border-foreground text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
              >
                {t("panneauMetronome.taper")}
              </button>
              <button
                type="button"
                data-panneau-marche
                aria-pressed={marche}
                onClick={onMarche}
                className="h-14 rounded-xl bg-[color:var(--couleur-icones)] text-base font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t(marche ? "panneauMetronome.arret" : "panneauMetronome.marche")}
              </button>
            </div>
          </div>

          {/* (d) mesure */}
          <Groupe titre={t("panneauMetronome.mesure")} mention="">
            <Pastilles
              label={t("panneauMetronome.mesure")}
              valeurs={[...MESURES.map((id) => ({ id, nom: id })), { id: "autre", nom: t("panneauMetronome.autre") }]}
              choisie={m}
              onChoix={(id) => { if (id === "autre") setAutre(true); else { setAutre(false); changerMesure(id); } }}
            />
            {m === "autre" && (
              <div data-panneau-autre className="flex flex-wrap items-center gap-3 py-1">
                <span className="inline-flex items-center gap-1">
                  <button type="button" aria-label={t("panneauMetronome.tempsMoins")} disabled={mesure.temps <= 1} onClick={() => changerMesure(`${mesure.temps - 1}/${unite}`)} className="grid h-11 w-11 place-items-center rounded-full border border-border disabled:opacity-40"><Minus className="h-4 w-4" aria-hidden="true" /></button>
                  <span data-panneau-nb className="min-w-8 text-center text-lg font-semibold">{mesure.temps}</span>
                  <button type="button" aria-label={t("panneauMetronome.tempsPlus")} disabled={mesure.temps >= 12} onClick={() => changerMesure(`${mesure.temps + 1}/${unite}`)} className="grid h-11 w-11 place-items-center rounded-full border border-border disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /></button>
                </span>
                <Segment
                  label={t("panneauMetronome.unite")}
                  valeurs={[{ id: "4", nom: t("panneauMetronome.noire") }, { id: "8", nom: t("panneauMetronome.croche") }]}
                  choisie={String(unite)}
                  onChoix={(id) => changerMesure(`${mesure.temps}/${id}`)}
                />
              </div>
            )}
          </Groupe>

          {/* (e) temps */}
          <Groupe titre={t("panneauMetronome.temps")} mention="">
            <div data-panneau-temps className="flex flex-wrap" style={{ columnGap: 8, rowGap: 2 }}>
              {mesure.groupes.map((g, gi) => {
                const d = mesure.groupes.slice(0, gi).reduce((a, b) => a + b, 0);
                return (
                  <div key={gi} className="flex flex-wrap" style={{ gap: 2 }}>
                    {Array.from({ length: g }, (_, j) => {
                      const i = d + j;
                      const a = accents[i] ?? "faible";
                      return (
                        <button
                          key={i}
                          type="button"
                          data-temps={i + 1}
                          data-accent={a}
                          aria-pressed={a !== "muet"}
                          aria-label={t("panneauMetronome.tempsNom", { n: i + 1, niveau: niveau(a) })}
                          onClick={() => tournerAccent(i)}
                        >
                          <span aria-hidden="true">{i + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t("panneauMetronome.legende", { fort: niveau("fort"), moyen: niveau("moyen"), faible: niveau("faible"), muet: niveau("muet") })}</p>
          </Groupe>

          {/* (f) binaire / ternaire et subdivisions : retenues, la bande ne les joue pas encore (MT-3) */}
          <Groupe titre={t("panneauMetronome.subdivision")} mention="">
            <Segment
              label={t("panneauMetronome.subdivision")}
              valeurs={[{ id: "binaire", nom: t("panneauMetronome.binaire") }, { id: "ternaire", nom: t("panneauMetronome.ternaire") }]}
              choisie={ternaire ? "ternaire" : "binaire"}
              onChoix={(id) => changerSubdivision(id === "ternaire" ? "triolets" : "aucune")}
            />
            <div role="radiogroup" aria-label={t("panneauMetronome.subdivision")} data-panneau-subdivisions className="flex flex-wrap gap-1.5 py-1">
              {(ternaire ? [{ id: "triolets" as Subdivision, note: "triolet" as TypeNote }] : BINAIRES).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={subdivision === s.id}
                  aria-label={t(`panneauMetronome.sub.${s.id}`)}
                  title={t(`panneauMetronome.sub.${s.id}`)}
                  data-subdivision={s.id}
                  onClick={() => changerSubdivision(s.id)}
                  className={`grid min-h-11 min-w-11 place-items-center rounded-xl border border-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${subdivision === s.id ? "bg-foreground text-background" : ""}`}
                >
                  <IconeNote note={s.note} />
                </button>
              ))}
            </div>
          </Groupe>

          {/* (g) décompte */}
          <Groupe titre={t("panneauMetronome.decompte")} mention="">
            <Pastilles label={t("panneauMetronome.decompte")} valeurs={decomptes} choisie={String(decompte)} onChoix={(id) => changerDecompte(Number(id) as Decompte)} />
          </Groupe>

          {/* (h) pied */}
          <div className="space-y-1 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">{t("panneauMetronome.retenu")}</p>
            {aFixe && (
              <button
                type="button"
                data-tempo-fichier
                onClick={effacerTempo}
                className="min-h-11 rounded-lg px-1 text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("panneauMetronome.revenir")}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

