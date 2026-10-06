"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getRegistrationOpen, signUp, saveProfile } from "@/lib/firebase/users";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
} from "@/lib/planning/names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EcranMarque } from "@/components/auth/EcranMarque";
import {
  IdentityFields,
  ServiceGrid,
  PlanningNameField,
  EMPTY_PROFILE_FORM,
  type ProfileFormValue,
} from "@/components/auth/ProfileFields";

const STEP_KEYS = ["account", "identity", "services"] as const;

export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [form, setForm] = useState<ProfileFormValue>(EMPTY_PROFILE_FORM);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [regOpen, setRegOpen] = useState<boolean | null>(null);

  useEffect(() => {
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
    getRegistrationOpen().then(setRegOpen);
  }, []);

  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  if (regOpen === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!regOpen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold text-foreground">{t("signup.closedTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("signup.closedText")}</p>
          <Link href="/login" className="text-sm text-foreground underline underline-offset-2 block">
            {t("signup.loginLink")}
          </Link>
        </div>
      </div>
    );
  }

  /** Valide l'étape courante ; renvoie un message d'erreur ou null. */
  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!email.trim()) return t("signup.errorEmail");
      if (password.length < 6) return t("signup.errorPasswordLength");
      if (password !== password2) return t("signup.errorPasswordMatch");
    }
    if (s === 1) {
      if (!form.firstName.trim() || !form.lastName.trim()) return t("profile.errorName");
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      const user = await signUp(email.trim(), password);
      await saveProfile({
        uid: user.uid,
        email: email.trim(),
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        planningName: form.planningName.trim(),
        annonces: [],
        notify: [],
      });
      router.push("/setlists");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        code === "auth/email-already-in-use"
          ? t("signup.errorEmailInUse")
          : code === "auth/invalid-email"
          ? t("signup.errorEmailInvalid")
          : t("signup.errorGeneric")
      );
      // L'email est saisi à l'étape 1 : on y retourne si c'est lui le problème
      if (code === "auth/email-already-in-use" || code === "auth/invalid-email") setStep(0);
      setLoading(false);
    }
  }

  const isLast = step === STEP_KEYS.length - 1;

  // Lot U4 bis, B5 (Q13) : les trois étapes dans le panneau de marque (à gauche en grand, en haut
  // ailleurs) ; sous le titre, la barre de progression seule.
  const etapes = STEP_KEYS.map((key, i) => ({
    libelle: t(`signup.steps.${key}`),
    etat: i < step ? "fait" : i === step ? "courant" : "avenir",
  }) as const);

  return (
    <EcranMarque large etapes={etapes} onEtape={(i) => { setError(""); setStep(i); }}>
      <h1 className="text-2xl font-bold text-foreground">{t("signup.title")}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{t("signup.subtitle")}</p>
      <div className="mb-6 mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEP_KEYS.length) * 100}%` }}
        />
      </div>

      {/* ── Étape courante ── */}
      <div>
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">
                {t("signup.email")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
                placeholder={t("signup.emailPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">
                {t("signup.password")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
                placeholder={t("signup.passwordPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password2">
                {t("signup.password2")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signup-password2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {step === 1 && <IdentityFields value={form} onChange={setForm} />}

        {step === 2 && (
          <div className="space-y-6">
            <PlanningNameField
              value={form}
              onChange={setForm}
              planningNames={planningNames}
              deriveFromPlanning={deriveFromPlanning}
            />
            <ServiceGrid value={form} onChange={setForm} deriveFromPlanning={deriveFromPlanning} />
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Navigation ── */}
      <div className="mt-5 flex items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={back} className="h-11">
            <ArrowLeft className="h-4 w-4" />
            {t("signup.back")}
          </Button>
        )}
        {isLast ? (
          <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 h-11">
            {loading ? t("signup.creating") : t("signup.create")}
          </Button>
        ) : (
          <Button type="button" onClick={next} className="flex-1 h-11">
            {t("signup.next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          {t("signup.alreadyAccount")}
        </Link>
      </div>
    </EcranMarque>
  );
}
