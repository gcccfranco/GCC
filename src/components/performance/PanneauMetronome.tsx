"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Groupe, Segment } from "@/components/song/MargeAffichage";
import { MenuLouange } from "@/components/performance/MenuLouange";
import { IconeNote, type TypeNote } from "@/components/performance/IconeNote";
import { EntrainementMetronome } from "@/components/performance/EntrainementMetronome";
import type { CasesEntrainement } from "@/components/performance/hooks/useEntrainement";
import { contexteAudio } from "@/lib/audio/contexte";
import { clampTempo, TEMPO_MAX, TEMPO_MIN, type Decompte, type Entrainement, type SonMetro, type Subdivision } from "@/lib/performance/tempo";
import type { Accent, Mesure } from "@/lib/performance/metronome";

// Le panneau Métronome (lot MT, MT-2) : une fenêtre comme le menu « Setlist » du mode louange (décision de Timothée, 13/11) :
// MenuLouange, popover ancré sous ♩ de la barre dès 768 px, feuille du bas au téléphone ; toucher ailleurs ou Échap le ferme.
const MESURES = ["2/4", "3/4", "4/4", "6/8", "12/8"];
const APPUI_LONG_MS = 500;
const REPETITION_MS = 250;
const BINAIRES: { id: Subdivision; note: TypeNote }[] = [
  { id: "aucune", note: "noire" },
  { id: "croches", note: "croches" },
  { id: "doubles", note: "doubles" },
  { id: "pointee", note: "pointee" },
];

/** iPhone ou iPad (y compris l'iPad qui se présente en Macintosh) : le bouton silencieux coupe Web Audio. */
const surIOS = () => typeof navigator !== "undefined" && (/iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

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
  accents, tournerAccent, subdivision, changerSubdivision, decompte, changerDecompte, marche, onMarche, bande, setBande, son, setSon, sonType, changerSonType, volume, changerVolume, couleur,
  taper, clavier, entrOuvert, setEntrOuvert, cases, changerCase, valeursEntr, changerValeursEntr, appui,
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
  /** `--couleur-icones` corrigée (le Portal du menu sort de la racine du mode). */
  couleur: string;
  son: boolean;
  setSon: (v: boolean) => void;
  sonType: SonMetro;
  changerSonType: (s: SonMetro) => void;
  volume: number;
  changerVolume: (n: number) => void;
  /** Taper (série partagée avec la touche T). */
  taper: () => void;
  /** Un clavier a été vu : annonce les touches Espace et T. */
  clavier: boolean;
  entrOuvert: boolean;
  setEntrOuvert: (v: boolean) => void;
  cases: CasesEntrainement;
  changerCase: (c: keyof CasesEntrainement, v: boolean) => void;
  valeursEntr: Entrainement;
  changerValeursEntr: (v: Partial<Entrainement>) => void;
  appui: { current: number };
}) {
  const { t } = useTranslation();
  const titre = useId();
  const [saisie, setSaisie] = useState<string | null>(null);
  const [autre, setAutre] = useState(() => !MESURES.includes(mesureTexte));
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;

  // « Autre » se replie à chaque ouverture (le focus et Échap : Radix, comme les autres menus).
  useEffect(() => { if (ouvert) setAutre(false); }, [ouvert]);

  const pas = (d: number) => { tempoRef.current = clampTempo(tempoRef.current + d); fixerTempo(tempoRef.current); };
  const valider = () => {
    if (saisie === null) return;
    const n = parseInt(saisie, 10);
    setSaisie(null);
    if (Number.isFinite(n)) fixerTempo(n);
  };
  const m = autre || !MESURES.includes(mesureTexte) ? "autre" : mesureTexte;
  const niveau = (a: Accent) => t(`panneauMetronome.niveau.${a}`);
  const noteTempo: TypeNote = mesure.compose ? "noirePointee" : "noire";
  const aFixe = tempoAppareil !== null && tempoAppareil !== tempoFichier;
  const ternaire = subdivision === "triolets";
  const unite = mesure.unite;
  const decomptes: { id: string; nom: string }[] = [
    { id: "0", nom: t("panneauMetronome.aucun") },
    { id: "1", nom: t("panneauMetronome.mesure1") },
    { id: "2", nom: t("panneauMetronome.mesure2") },
  ];

  return (
    <MenuLouange id="metronome" titre={t("panneauMetronome.titre")} ouvert={ouvert} onOuvertChange={(o) => !o && onFermer()} couleur={couleur} titreCache>
    <div
      data-panneau-metronome
      data-testid="panneau-metronome"
      aria-labelledby={titre}
      className="-mx-1 text-foreground"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontVariantNumeric: "tabular-nums" }}
    >
        <div className="flex items-center justify-between gap-2 px-4">
          <h2 id={titre} className="min-w-0 truncate text-base font-semibold">{t("panneauMetronome.titre")}</h2>
          <button type="button" aria-label={t("panneauMetronome.fermer")} onClick={onFermer} className="grid h-11 w-11 place-items-center rounded-full text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">×</button>
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
          {t(marche ? "panneauMetronome.enMarche" : "panneauMetronome.arrete", { tempo, mesure: `${mesure.temps}/${mesure.unite}` })}{son ? ` ${t("panneauMetronome.sonAllume")}` : ""}
        </p>

        <div data-testid="panneau-corps">
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
                aria-keyshortcuts="T"
                onPointerDown={taper}
                onClick={(e) => { if (e.detail === 0) taper(); }}
                className="h-14 touch-manipulation rounded-xl border border-foreground text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
              >
                <span>{t("panneauMetronome.taper")}</span>
                {clavier && <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 font-sans text-xs font-medium text-muted-foreground">T</kbd>}
              </button>
              <button
                type="button"
                data-panneau-marche
                aria-pressed={marche}
                aria-keyshortcuts="Space"
                onClick={onMarche}
                className="h-14 rounded-xl bg-[color:var(--couleur-icones)] text-base font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{t(marche ? "panneauMetronome.arret" : "panneauMetronome.marche")}</span>
                {clavier && <kbd className="ml-2 rounded border border-background/60 px-1.5 py-0.5 font-sans text-xs font-medium">{t("panneauMetronome.espace")}</kbd>}
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

          {/* (f) binaire / ternaire et subdivisions : la bande les joue, son allumé (subdivisions douces) */}
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

          {/* (f2) son : jamais retenu allumé ; le son choisi et le volume le sont */}
          <Groupe titre={t("panneauMetronome.son")} mention="">
            <button
              type="button"
              data-metronome-son
              aria-pressed={son}
              onClick={() => { if (!son) contexteAudio(); setSon(!son); }} // le contexte se crée dans le geste (déblocage iOS)
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{t("panneauMetronome.son")}</span>
              <span aria-hidden="true" className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 ${son ? "justify-end bg-[color:var(--couleur-icones)]" : "justify-start bg-muted-foreground/40"}`}>
                <span className="h-5 w-5 rounded-full bg-background shadow-sm" />
              </span>
            </button>
            {surIOS() && <p data-son-ios className="text-xs text-muted-foreground">{t("panneauMetronome.sonIos")}</p>}
            <div data-son-type={sonType}>
              <Segment
                label={t("panneauMetronome.sonType")}
                valeurs={[{ id: "clic", nom: t("panneauMetronome.clic") }, { id: "bois", nom: t("panneauMetronome.bois") }, { id: "cloche", nom: t("panneauMetronome.cloche") }]}
                choisie={sonType}
                onChoix={(id) => changerSonType(id as SonMetro)}
                desactive={!son}
              />
            </div>
            <div className={`flex min-h-11 items-center gap-3 ${son ? "" : "opacity-40"}`}>
              <span className="text-sm">{t("panneauMetronome.volume")}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                disabled={!son}
                data-son-volume
                aria-label={t("panneauMetronome.volume")}
                onChange={(e) => changerVolume(Number(e.target.value))}
                className="h-11 min-w-0 flex-1"
                style={{ accentColor: "currentColor" }}
              />
            </div>
          </Groupe>

          {/* (g) décompte */}
          <Groupe titre={t("panneauMetronome.decompte")} mention="">
            <Pastilles label={t("panneauMetronome.decompte")} valeurs={decomptes} choisie={String(decompte)} onChoix={(id) => changerDecompte(Number(id) as Decompte)} />
          </Groupe>

          {/* (g2) S'entraîner (replié) : mesures muettes, accélération, minuteur */}
          <EntrainementMetronome ouvert={entrOuvert} setOuvert={setEntrOuvert} cases={cases} changerCase={changerCase} valeurs={valeursEntr} changerValeurs={changerValeursEntr} marche={marche} appui={appui} />

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
    </MenuLouange>
  );
}

