"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Star, Trash2 } from "lucide-react";
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
            {values.length ? avg.toFixed(1) : "—"}
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
            <div key={i} className="rounded-lg border border-border bg-background px-3 py-2">
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

/** Dépouillement du questionnaire de satisfaction (onglet /admin). */
export function SurveyResults() {
  const { t } = useTranslation();
  const [all, setAll] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  // Les questionnaires abandonnés en cours de route restent exploitables, mais on
  // peut les écarter pour ne lire que les réponses complètes.
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>("general");

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
    setBusy(r.uid);
    try {
      await deleteSurveyResponse(r.uid);
      setAll((prev) => prev.filter((x) => x.uid !== r.uid));
    } finally {
      setBusy(null);
    }
  }

  return (
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
              : "border-primary bg-primary/10 text-primary"
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

            {showPeople &&
              byName.map((r) => {
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
          </div>
        </>
      )}
    </div>
  );
}
