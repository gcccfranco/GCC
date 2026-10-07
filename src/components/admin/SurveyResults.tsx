"use client";

// Dépouillement du questionnaire (ancienne administration ; Back-Office › Messages ›
// Questionnaire). Agencement v18 (B12 de docs/spec-agencement-v18.md ; planche
// `v18-bo-messages-questionnaire`), au Back-Office (`backOffice`) : en grand, deux volets
// (`DeuxVolets`) — à gauche le nombre de réponses et le sommaire des parties (avec la moyenne
// quand la partie a des notes), à droite la partie choisie (la première d'office, en état local),
// une carte par question ; « Par personne » et « Voir la page du questionnaire » en pied de liste.
// Un volet : les parties dépliables d'avant, la première ouverte. En français seulement (Q16 de U6).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, ChevronUp, Star, Trash2 } from "lucide-react";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { useConfirmer } from "@/components/layout/Confirmer";
import { useDisposition } from "@/hooks/useDisposition";
import { getSurveyResponses, deleteSurveyResponse } from "@/lib/firebase/survey";
import {
  RATING_MAX,
  SURVEY_QUESTIONS,
  SURVEY_SECTIONS,
  type SurveyQuestion,
  type SurveyResponse,
} from "@/types/survey";

/** Barre horizontale « n sur total » avec libellé et compte. */
function CountBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionBlock({
  q,
  responses,
}: {
  q: SurveyQuestion;
  responses: SurveyResponse[];
}) {
  const { t } = useTranslation();
  const [showTexts, setShowTexts] = useState(false);
  const label = t(`survey.q.${q.id}.label`);

  if (q.type === "rating") {
    const values = responses
      .map((r) => r.answers[q.id])
      .filter((v): v is number => typeof v === "number");
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <span className="text-sm font-bold text-foreground shrink-0 tabular-nums">
            {values.length ? virgule(avg) : "—"}
            <span className="text-xs font-normal text-muted-foreground">
              /{RATING_MAX} ({values.length})
            </span>
          </span>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: RATING_MAX }, (_, i) => RATING_MAX - i).map((n) => (
            <CountBar
              key={n}
              label={`${n} ★`}
              count={values.filter((v) => v === n).length}
              total={values.length}
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "choice" || q.type === "multi") {
    // Le total de référence est le nombre de personnes qui ont répondu à CETTE
    // question (les questions conditionnelles n'ont pas été posées à tout le monde).
    const answered = responses.filter((r) => {
      const v = r.answers[q.id];
      return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v !== "";
    });
    const countOf = (opt: string) =>
      answered.filter((r) => {
        const v = r.answers[q.id];
        return Array.isArray(v) ? v.includes(opt) : v === opt;
      }).length;
    const options = [...(q.options ?? [])].sort((a, b) => countOf(b) - countOf(a));
    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {answered.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {options.map((opt) => (
            <CountBar
              key={opt}
              label={t(`survey.q.${q.id}.opt.${opt}`)}
              count={countOf(opt)}
              total={answered.length}
            />
          ))}
        </div>
      </div>
    );
  }

  // text
  const texts = responses
    .map((r) => ({ name: r.authorName, text: (r.answers[q.id] as string | undefined)?.trim() }))
    .filter((x): x is { name: string; text: string } => !!x.text);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{texts.length}</span>
      </div>
      {texts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune réponse.</p>
      ) : (
        <>
          {(showTexts ? texts : texts.slice(0, 3)).map((x, i) => (
            <div key={i} className="rounded-lg border border-transparent bg-secondary px-3 py-2">
              <p className="text-xs text-foreground whitespace-pre-wrap">{x.text}</p>
              <p className="text-[11px] text-muted-foreground mt-1">— {x.name}</p>
            </div>
          ))}
          {texts.length > 3 && (
            <button
              type="button"
              onClick={() => setShowTexts((v) => !v)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {showTexts ? "Réduire" : `Voir les ${texts.length} réponses`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Formate une réponse pour le détail par personne. */
function answerText(q: SurveyQuestion, value: unknown, t: (k: string) => string): string {
  if (value === undefined || value === null || value === "") return "—";
  if (q.type === "rating") return `${value}/${RATING_MAX}`;
  if (q.type === "text") return String(value);
  if (Array.isArray(value)) {
    return value.length ? value.map((o) => t(`survey.q.${q.id}.opt.${o}`)).join(", ") : "—";
  }
  return t(`survey.q.${q.id}.opt.${value}`);
}

/** Moyenne des notes d'une partie (toutes ses questions notées), ou `null` sans note. */
function moyenneDeLaPartie(section: string, responses: SurveyResponse[]): number | null {
  const notes = SURVEY_QUESTIONS.filter((q) => q.section === section && q.type === "rating")
    .flatMap((q) => responses.map((r) => r.answers[q.id]))
    .filter((v): v is number => typeof v === "number");
  return notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
}

const virgule = (n: number) => n.toFixed(1).replace(".", ",");

/** Dépouillement du questionnaire de satisfaction (onglet /admin ; Back-Office si `backOffice`). */
export function SurveyResults({ backOffice = false }: { backOffice?: boolean }) {
  const { t } = useTranslation();
  const confirmer = useConfirmer();
  const grand = useDisposition() === "grand" && backOffice;
  /** Back-Office en grand : la partie ouverte à droite, ou « personnes » (détail par personne). */
  const [partie, setPartie] = useState<string>(SURVEY_SECTIONS[0].id);
  const [all, setAll] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  // Les questionnaires abandonnés en cours de route restent exploitables, mais on
  // peut les écarter pour ne lire que les réponses complètes.
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>(backOffice ? SURVEY_SECTIONS[0].id : "general");

  useEffect(() => {
    getSurveyResponses()
      .then(setAll)
      .finally(() => setLoading(false));
  }, []);

  const drafts = all.filter((r) => !r.submitted).length;
  const responses = useMemo(
    () => (includeDrafts ? all : all.filter((r) => r.submitted)),
    [all, includeDrafts]
  );
  const byName = useMemo(
    () => [...responses].sort((a, b) => a.authorName.localeCompare(b.authorName, "fr")),
    [responses]
  );

  async function handleDelete(r: SurveyResponse) {
    // Irréversible : la fenêtre du site d'abord (R9).
    if (!(await confirmer({
      titre: `Supprimer la réponse de ${r.authorName} ?`,
      texte: "Elle disparaît des résultats, définitivement.",
      action: "Supprimer",
      destructif: true,
    }))) return;
    setBusy(r.uid);
    try {
      await deleteSurveyResponse(r.uid);
      setAll((prev) => prev.filter((x) => x.uid !== r.uid));
    } finally {
      setBusy(null);
    }
  }

  const parPersonne = (
    <>
      {byName.map((r) => {
                const open = expanded === r.uid;
                return (
                  <div key={r.uid} className="rounded-xl border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : r.uid)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.authorName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.updatedAt ? r.updatedAt.toLocaleDateString("fr-FR") : ""}
                          {r.submitted ? "" : " · en cours"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {typeof r.answers.overall === "number" && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {r.answers.overall}
                          </span>
                        )}
                        {open ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        {SURVEY_QUESTIONS.filter((q) => r.answers[q.id] !== undefined).map((q) => (
                          <div key={q.id}>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              {t(`survey.q.${q.id}.label`)}
                            </p>
                            <p className="text-xs text-foreground whitespace-pre-wrap">
                              {answerText(q, r.answers[q.id], t)}
                            </p>
                          </div>
                        ))}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            disabled={busy === r.uid}
                            className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-destructive flex items-center justify-center disabled:opacity-50"
                            aria-label="Supprimer la réponse"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
    </>
  );

  if (grand) {
    const derniere = all.reduce<Date | null>((d, r) => (r.updatedAt && (!d || r.updatedAt > d) ? r.updatedAt : d), null);
    const section = SURVEY_SECTIONS.find((x) => x.id === partie);
    const questions = SURVEY_QUESTIONS.filter((q) => q.section === partie);
    const moyenne = section ? moyenneDeLaPartie(section.id, responses) : null;
    const ligne = (id: string, titre: string, detail: string, note: string | null) => {
      const actif = partie === id;
      return (
        <button
          key={id}
          type="button"
          aria-current={actif ? "true" : undefined}
          onClick={() => setPartie(id)}
          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150 ${
            actif ? "bg-foreground text-background" : "hover:bg-secondary"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{titre}</span>
            <span className={`block text-[13px] ${actif ? "text-background/75" : "text-muted-foreground"}`}>{detail}</span>
          </span>
          {note && <span className="shrink-0 text-[14px] font-semibold tabular-nums">{note}</span>}
          <ChevronRight className={`h-4 w-4 shrink-0 ${actif ? "text-background" : "text-muted-foreground/60"}`} aria-hidden />
        </button>
      );
    };
    const liste = (
      <div className="px-2.5 pb-4 pt-4">
        <p className="px-2.5 pb-3 text-[13px] text-muted-foreground">
          <span className="mr-1.5 text-[28px] font-bold leading-none text-foreground tabular-nums">{all.length}</span>{" "}
          {all.length > 1 ? "réponses" : "réponse"}
          {derniere ? ` · la dernière le ${derniere.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
          {drafts > 0 ? ` · ${drafts} en cours` : ""}
        </p>
        {drafts > 0 && (
          <button
            type="button"
            onClick={() => setIncludeDrafts((v) => !v)}
            className="mx-2.5 mb-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {includeDrafts ? `Écarter les ${drafts} questionnaire(s) en cours` : `Réintégrer les ${drafts} questionnaire(s) en cours`}
          </button>
        )}
        <div className="space-y-0.5">
          {SURVEY_SECTIONS.map((x) => {
            const n = SURVEY_QUESTIONS.filter((q) => q.section === x.id).length;
            const m = moyenneDeLaPartie(x.id, responses);
            return ligne(x.id, t(`survey.s.${x.id}.title`), `${n} question${n > 1 ? "s" : ""}`, m === null ? null : `${virgule(m)}/${RATING_MAX}`);
          })}
          {ligne("personnes", "Par personne", `${byName.length} répondant${byName.length > 1 ? "s" : ""}`, null)}
        </div>
        <Link href="/questionnaire" className="mt-3 block px-2.5 text-[13px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Voir la page du questionnaire
        </Link>
      </div>
    );
    const droite = loading ? (
      <p className="py-10 text-sm text-muted-foreground">Chargement…</p>
    ) : responses.length === 0 ? (
      <p className="py-10 text-sm text-muted-foreground">Aucune réponse pour l&apos;instant.</p>
    ) : partie === "personnes" ? (
      <div className="space-y-2">
        <h2 className="text-[24px] font-bold leading-tight tracking-tight text-foreground">Par personne</h2>
        {parPersonne}
      </div>
    ) : (
      <div>
        <h2 className="text-[24px] font-bold leading-tight tracking-tight text-foreground">{t(`survey.s.${partie}.title`)}</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {questions.length} question{questions.length > 1 ? "s" : ""}
          {moyenne !== null ? ` · moyenne ${virgule(moyenne)} sur ${RATING_MAX}` : ""}
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
          {questions.map((q) => (
            <div key={q.id} className="raised rounded-2xl px-5 py-4">
              <QuestionBlock q={q} responses={responses} />
            </div>
          ))}
        </div>
      </div>
    );
    return (
      <DeuxVolets racine="/back-office/messages/questionnaire" liste={liste} premier={droite} largeurListe={340}>
        {null}
      </DeuxVolets>
    );
  }

  const carte = (
    <div className="rounded-xl bg-card shadow-soft p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Questionnaire
        </h2>
        <span className="text-xs text-muted-foreground">
          {all.length} réponse(s){drafts > 0 ? ` · ${drafts} en cours` : ""}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Avis des membres sur le site (page <span className="font-mono">/questionnaire</span>).
        Chacun n&apos;a qu&apos;une réponse, qu&apos;il peut modifier à tout moment. Les
        questions hors sujet n&apos;étant pas posées à tout le monde, le compte affiché à
        droite de chaque question est son nombre de répondants.
      </p>

      {drafts > 0 && (
        <button
          type="button"
          onClick={() => setIncludeDrafts((v) => !v)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            includeDrafts
              ? "bg-background border-border text-muted-foreground hover:text-foreground"
              : "border-primary bg-secondary text-foreground"
          }`}
        >
          {includeDrafts
            ? `Écarter les ${drafts} questionnaire(s) en cours`
            : `Réintégrer les ${drafts} questionnaire(s) en cours`}
        </button>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
      ) : responses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
          Aucune réponse pour l&apos;instant.
        </p>
      ) : (
        <>
          {/* Résultats section par section (dépliables) */}
          <div className="space-y-2">
            {SURVEY_SECTIONS.map((s) => {
              const questions = SURVEY_QUESTIONS.filter((q) => q.section === s.id);
              const open = openSection === s.id;
              return (
                <div key={s.id} className="rounded-xl border border-border bg-background">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSection(open ? null : s.id)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {t(`survey.s.${s.id}.title`)}
                    </p>
                    {open ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-border px-4 py-4 space-y-5">
                      {questions.map((q) => (
                        <QuestionBlock key={q.id} q={q} responses={responses} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Détail par personne */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={() => setShowPeople((v) => !v)}
              className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5"
            >
              {showPeople ? "Masquer le détail par personne" : "Détail par personne"}
            </button>

            {showPeople && parPersonne}
          </div>
        </>
      )}
    </div>
  );
  // Back-Office, un volet : la carte à la marge de la zone.
  return backOffice ? <div className="px-[var(--marge-page)] pb-10">{carte}</div> : carte;
}
