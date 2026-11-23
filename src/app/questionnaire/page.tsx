"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TOUCHER_44, TOUCHER_PILULE } from "@/lib/toucher44";
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
import { useDisposition } from "@/hooks/useDisposition";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { Impasse } from "@/components/layout/Impasse";
import { Squelette } from "@/components/layout/Squelette";
import { compter } from "@/lib/usage";

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
  manquante,
}: {
  q: SurveyQuestion;
  value: SurveyAnswer | undefined;
  onChange: (value: SurveyAnswer) => void;
  /** « Suivant » a été refusé et cette question obligatoire attend sa réponse. */
  manquante?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div id={`question-${q.id}`} className="scroll-mt-32 space-y-2.5 py-3.5">
      <p className="text-base font-semibold text-foreground leading-snug">
        {t(`survey.q.${q.id}.label`)}
        {q.required ? (
          <span className="text-destructive"> *</span>
        ) : (
          <span className="text-muted-foreground font-normal"> {t("survey.optional")}</span>
        )}
        {q.type === "multi" && (
          <span className="text-muted-foreground font-normal">
            {" · "}
            {t("survey.multiHint")}
          </span>
        )}
        {manquante && <span className="block text-sm font-semibold text-destructive">{t("survey.attendue")}</span>}
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
                  className={`${TOUCHER_44} h-10 w-10 rounded-lg border border-transparent bg-secondary flex items-center justify-center transition-colors hover:border-muted-foreground/50`}
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
          <div className="flex justify-between text-xs text-muted-foreground max-w-[224px]">
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
                className={`${TOUCHER_PILULE} inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 ${
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
  const [manquantes, setManquantes] = useState<string[]>([]);
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
  // La barre du haut se cache au défilement vers le bas (téléphone) : la bande d'étape monte alors en haut de l'écran.
  const barreVisible = useScrollDirection();
  const grand = disposition === "grand";

  if (loading || (user && loadingAnswers)) {
    return <Squelette />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Impasse
          icone={MessageSquareHeart}
          titre={t("survey.loginRequired")}
          sortie={{ href: "/login?from=/questionnaire", label: t("mesServices.login") }}
        />
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
    setManquantes([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleNext() {
    const missing = questions.filter((q) => q.required && !isAnswered(answers[q.id]));
    if (missing.length > 0) {
      setError(t("survey.errorRequired"));
      setManquantes(missing.map((q) => q.id));
      // La page défile jusqu'à la première question obligatoire sans réponse.
      document.getElementById(`question-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      await persist(isLast);
      if (isLast) {
        compter("cmd.questionnaire.envoyer");
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

  const entete = <EnTetePage fond="blanc" retour={{ href: "/moi", label: t("moi.title") }} titre={t("survey.title")} sousTitre={t("survey.sousTitre")} />;
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
        <div className="relative">
          {entete}
          {lecture(
            grand && <div aria-hidden />,
            <div className="bloc-info flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
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

  // La bande dit « Étape 1 / 3 » : la barre en montre déjà un tiers (critique).
  const progress = steps.length > 0 ? ((step + 1) / steps.length) * 100 : 100;
  const etapeSur = t("survey.stepOf", { step: step + 1, total: steps.length });

  // En grand : les étapes, l'étape en cours en encre (on y avance par « Suivant », comme avant).
  const sommaire = grand ? (
    <nav aria-label={t("survey.etapes")} className="sticky top-[calc(var(--nav-h)+24px)] self-start">
      <p className="px-2.5 pb-2 pt-1 text-sm font-semibold text-muted-foreground">{etapeSur}</p>
      <ol className="flex flex-col gap-0.5">
        {steps.map((s, i) => {
          const courante = i === step;
          return (
            <li
              key={s.id}
              aria-current={courante ? "step" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-base ${courante ? "bg-foreground font-semibold text-background" : "text-foreground/80"}`}
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
      <p className="px-2.5 pt-3.5 text-sm leading-[19px] text-muted-foreground">
        {t("survey.sautees")} {t("survey.autosave")}
      </p>
    </nav>
  ) : (
    /* Ailleurs (compte-15) : une bande collante de 44 px sous la barre du haut, la barre de 3 px sur son bord bas. */
    <div
      data-testid="bande-etape"
      className="material-bar sticky z-20 max-md:-mx-[var(--marge-page)] !shadow-none transition-[top] duration-300 motion-reduce:transition-none"
      style={{ top: barreVisible ? "var(--nav-h)" : "var(--sat, 0px)" }}
    >
      <div className="flex h-[41px] items-center justify-between gap-2 max-md:px-[var(--marge-page)]">
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{t(`survey.steps.${current.id}`)}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{etapeSur}</span>
      </div>
      <div className="h-[3px] bg-secondary">
        <div className="h-full bg-primary transition-[width] duration-300 [transition-timing-function:cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-background/80 to-transparent" />
    </div>
  );

  return (
    <div className="relative min-h-screen pb-10">
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

            {!grand && <p className="text-sm text-muted-foreground">{t("survey.sautees")}</p>}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Une carte par étape, un bloc par section : moins de scroll qu'une carte par question. */}
            <section data-testid="questions" aria-label={t(`survey.steps.${current.id}`)} className="pb-4 pt-5">
              {groups.map((group, i) => (
                <div key={group.id} className={i > 0 ? "mt-4 border-t border-border pt-5" : ""}>
                  <h2 className="text-lg font-bold leading-tight text-foreground">{t(`survey.s.${group.id}.title`)}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t(`survey.s.${group.id}.hint`)}</p>
                  <div className="mt-2 divide-y divide-border border-t border-border">
                    {group.questions.map((q) => (
                      <QuestionField
                        key={q.id}
                        q={q}
                        value={answers[q.id]}
                        manquante={manquantes.includes(q.id) && !isAnswered(answers[q.id])}
                        onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {error && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className={grand ? "mt-1 flex flex-wrap items-center gap-3 border-t border-border pt-4" : "mt-1 space-y-3 border-t border-border pt-4"}>
                <span className={grand ? "min-w-0 flex-1 text-sm text-muted-foreground" : "block text-sm text-muted-foreground"}>{t("survey.identityNotice", { name: authorName })}</span>
                <div className={grand ? "flex gap-2" : "grid grid-cols-2 gap-2"}>
                  {(grand || step > 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => goTo(step - 1)}
                      disabled={step === 0 || saving}
                      className={grand ? "h-10 rounded-full" : "h-11 rounded-full"}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      {t("survey.previous")}
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={saving}
                    className={grand ? "h-10 rounded-full" : `h-11 rounded-full ${step === 0 ? "col-span-2" : ""}`}
                  >
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
