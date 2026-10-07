"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MessageSquareHeart, Star } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { getMySurveyResponse, saveSurveyResponse } from "@/lib/firebase/survey";
import {
  RATING_MAX,
  visibleQuestions,
  visibleSteps,
  type SurveyAnswer,
  type SurveyAnswers,
  type SurveyQuestion,
} from "@/types/survey";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Halo } from "@/components/layout/Halo";
import { useDisposition } from "@/hooks/useDisposition";

function isAnswered(a: SurveyAnswer | undefined): boolean {
  if (a === undefined) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "string") return a.trim().length > 0;
  return true;
}

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: SurveyQuestion;
  value: SurveyAnswer | undefined;
  onChange: (value: SurveyAnswer) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2.5 py-3.5">
      <p className="text-[15px] font-semibold text-foreground leading-snug">
        {t(`survey.q.${q.id}.label`)}
        {q.required ? (
          <span className="text-destructive"> *</span>
        ) : (
          <span className="text-muted-foreground/70 font-normal"> {t("survey.optional")}</span>
        )}
        {q.type === "multi" && (
          <span className="text-muted-foreground/70 font-normal">
            {" · "}
            {t("survey.multiHint")}
          </span>
        )}
      </p>

      {q.type === "rating" && (
        <div className="space-y-1">
          <div className="flex gap-1.5">
            {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => {
              const active = typeof value === "number" && n <= value;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  aria-label={`${n}/${RATING_MAX}`}
                  className="h-10 w-10 rounded-lg border border-transparent bg-secondary flex items-center justify-center transition-colors hover:border-muted-foreground/50"
                >
                  <Star
                    className={`h-[18px] w-[18px] ${
                      active ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground max-w-[224px]">
            <span>{t(`survey.q.${q.id}.low`)}</span>
            <span>{t(`survey.q.${q.id}.high`)}</span>
          </div>
        </div>
      )}

      {(q.type === "choice" || q.type === "multi") && (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((opt) => {
            const checked =
              q.type === "multi"
                ? Array.isArray(value) && value.includes(opt)
                : value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (q.type !== "multi") {
                    onChange(opt);
                    return;
                  }
                  const current = Array.isArray(value) ? value : [];
                  onChange(
                    current.includes(opt)
                      ? current.filter((o) => o !== opt)
                      : [...current, opt]
                  );
                }}
                aria-pressed={checked}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                  checked
                    ? "bg-foreground text-background"
                    : "bg-card text-foreground/80 ring-1 ring-inset ring-border hover:text-foreground"
                }`}
              >
                {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden />}
                {t(`survey.q.${q.id}.opt.${opt}`)}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "text" && (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(`survey.q.${q.id}.placeholder`)}
          rows={2}
        />
      )}
    </div>
  );
}

export default function QuestionnairePage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [loadingAnswers, setLoadingAnswers] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // "done" = questionnaire envoyé et non rouvert pour modification
  const [done, setDone] = useState(false);
  // Une réponse partielle a été reprise (enregistrement automatique à chaque étape)
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMySurveyResponse(user.uid)
      .then((r) => {
        if (!r) return;
        setAnswers(r.answers);
        setCreatedAt(r.createdAt);
        setDone(r.submitted);
        setResumed(!r.submitted);
      })
      .finally(() => setLoadingAnswers(false));
  }, [user]);

  // Les sections hors sujet sautent : quelqu'un qui ne coche pas « Mode Louange »
  // ne voit jamais le bloc correspondant (et l'étape disparaît s'il ne reste rien).
  const steps = useMemo(() => visibleSteps(answers), [answers]);
  const current = steps[Math.min(step, steps.length - 1)];
  const groups = useMemo(
    () =>
      (current?.sections ?? []).map((s) => ({
        id: s.id,
        questions: visibleQuestions(s.id, answers),
      })),
    [current, answers]
  );
  const questions = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const isLast = step >= steps.length - 1;
  // A15 (agencement v18 ; planche `v18-app-questionnaire`) : en grand, la lecture (R14) — les étapes
  // en sommaire à gauche (260 px), les questions de l'étape à 720 px ; ailleurs, la progression d'avant.
  const disposition = useDisposition();
  const grand = disposition === "grand";

  if (loading || (user && loadingAnswers)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <MessageSquareHeart className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("survey.loginRequired")}</p>
        <Link
          href="/login?from=/questionnaire"
          className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground"
        >
          {t("common.header.login")}
        </Link>
      </div>
    );
  }

  const authorName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : user.email ?? "Utilisateur";

  /** Enregistre l'état courant. `submitted` passe à true à la dernière étape. */
  async function persist(submitted: boolean): Promise<void> {
    await saveSurveyResponse(
      user!.uid,
      { authorName, authorEmail: user!.email ?? "", answers, submitted },
      createdAt
    );
    if (!createdAt) setCreatedAt(new Date());
  }

  function goTo(next: number) {
    setStep(next);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleNext() {
    const missing = questions.filter((q) => q.required && !isAnswered(answers[q.id]));
    if (missing.length > 0) {
      setError(t("survey.errorRequired"));
      return;
    }
    setSaving(true);
    try {
      await persist(isLast);
      if (isLast) {
        setDone(true);
        setResumed(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        goTo(step + 1);
      }
    } catch {
      setError(t("survey.error"));
    } finally {
      setSaving(false);
    }
  }

  const entete = <EnTetePage retour={{ href: "/moi", label: t("moi.title") }} titre={t("survey.title")} sousTitre={t("survey.sousTitre")} />;
  const lecture = (sommaire: ReactNode, colonne: ReactNode) => (
    <div
      className={
        grand
          ? "grid grid-cols-[260px_minmax(0,720px)] gap-x-10 px-[var(--marge-page)]"
          : "max-w-[calc(720px+2*var(--marge-page))] space-y-4 px-[var(--marge-page)]"
      }
    >
      {sommaire}
      <div className="min-w-0 space-y-4">{colonne}</div>
    </div>
  );

  if (done) {
    return (
      <div className="relative min-h-screen pb-10">
        <Halo variant="moi" color="hsl(var(--foreground))" />
        <div className="relative">
          {entete}
          {lecture(
            grand && <div aria-hidden />,
            <div className="raised flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <h2 className="text-lg font-bold text-foreground">{t("survey.thanksTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("survey.thanksBody")}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setDone(false);
                  setStep(0);
                }}
                className="h-11 mt-2"
              >
                {t("survey.edit")}
              </Button>
            </div>,
          )}
        </div>
      </div>
    );
  }

  const progress = steps.length > 1 ? (step / (steps.length - 1)) * 100 : 100;
  const etapeSur = t("survey.stepOf", { step: step + 1, total: steps.length });

  // En grand : les étapes, l'étape en cours en encre (on y avance par « Suivant », comme avant).
  const sommaire = grand ? (
    <nav aria-label={t("survey.etapes")} className="sticky top-[calc(var(--nav-h)+24px)] self-start">
      <p className="px-2.5 pb-2 pt-1 text-[13px] font-semibold text-muted-foreground">{etapeSur}</p>
      <ol className="flex flex-col gap-0.5">
        {steps.map((s, i) => {
          const courante = i === step;
          return (
            <li
              key={s.id}
              aria-current={courante ? "step" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[14.5px] ${courante ? "bg-foreground font-semibold text-background" : "text-foreground/80"}`}
            >
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${courante ? "bg-background text-foreground" : "bg-secondary"}`}
              >
                {i + 1}
              </span>
              {t(`survey.steps.${s.id}`)}
            </li>
          );
        })}
      </ol>
      <p className="px-2.5 pt-3.5 text-[13px] leading-[19px] text-muted-foreground">
        {t("survey.sautees")} {t("survey.autosave")}
      </p>
    </nav>
  ) : (
    /* Ailleurs : la progression d'avant. */
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">{t(`survey.steps.${current.id}`)}</p>
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{etapeSur}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{t("survey.sautees")}</p>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-10">
      <Halo variant="moi" color="hsl(var(--foreground))" />
      <div className="relative">
        {entete}
        {lecture(
          sommaire,
          <>
            {resumed && (
              <Alert>
                <AlertDescription>{t("survey.resumed")}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Une carte par étape, un bloc par section : moins de scroll qu'une carte par question. */}
            <section data-testid="questions" aria-label={t(`survey.steps.${current.id}`)} className="raised rounded-2xl px-5 pb-4 pt-5 md:px-6">
              {groups.map((group, i) => (
                <div key={group.id} className={i > 0 ? "mt-4 border-t border-border pt-5" : ""}>
                  <h2 className="text-[19px] font-bold leading-tight text-foreground">{t(`survey.s.${group.id}.title`)}</h2>
                  <p className="mt-0.5 text-[14px] text-muted-foreground">{t(`survey.s.${group.id}.hint`)}</p>
                  <div className="mt-2 divide-y divide-border border-t border-border">
                    {group.questions.map((q) => (
                      <QuestionField
                        key={q.id}
                        q={q}
                        value={answers[q.id]}
                        onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">{t("survey.identityNotice", { name: authorName })}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goTo(step - 1)}
                    disabled={step === 0 || saving}
                    className="h-10 rounded-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    {t("survey.previous")}
                  </Button>
                  <Button onClick={handleNext} disabled={saving} className="h-10 rounded-full">
                    {saving
                      ? t("survey.submitting")
                      : isLast
                        ? t("survey.submit")
                        : t("survey.next")}
                    {!saving && !isLast && <ArrowRight className="h-4 w-4 ml-1.5" />}
                  </Button>
                </div>
              </div>
            </section>

            {!grand && <p className="text-xs text-muted-foreground text-center">{t("survey.autosave")}</p>}
          </>,
        )}
      </div>
    </div>
  );
}
