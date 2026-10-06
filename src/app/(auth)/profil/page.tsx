"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile, saveProfile } from "@/lib/firebase/users";
import { canEditProfile } from "@/lib/access";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
} from "@/lib/planning/names";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IdentityFields,
  PlanningNameField,
  ServiceGrid,
  EMPTY_PROFILE_FORM,
  type ProfileFormValue,
} from "@/components/auth/ProfileFields";
import { PageTitle } from "@/components/layout/PageTitle";
import { cn } from "@/lib/utils";

export default function ProfilPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  const [form, setForm] = useState<ProfileFormValue | null>(null);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  // Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) router.replace("/login?from=/profil");
  }, [loading, user, router]);

  // Initialisation du formulaire une fois le profil chargé
  useEffect(() => {
    if (loading || form) return;
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        planningName: profile.planningName,
        serviceRoles: profile.serviceRoles,
      });
    } else {
      setForm(EMPTY_PROFILE_FORM);
    }
  }, [loading, profile, form]);

  if (loading || !user || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form || !canEditProfile(user, profile)) return;
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t("profile.errorName"));
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        uid: user.uid,
        email: user.email ?? "",
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        planningName: form.planningName.trim(),
        // Les droits (annonces, notify, poles, equipes, plannings) ne sont pas
        // envoyés : saveProfile n'écrit que les champs donnés, ils restent intacts.
      });
      // Retour à la page d'origine (?from=…) plutôt que /setlists systématique
      const from = new URLSearchParams(window.location.search).get("from");
      router.push(from && from.startsWith("/") ? from : "/setlists");
    } catch {
      setError(t("profile.saveError"));
      setSaving(false);
    }
  }

  const canEdit = canEditProfile(user, profile);
  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  // Q10 (lot U4 bis, B5) : deux colonnes dès la tablette portrait — identité et « Enregistrer » à
  // gauche, services et rôles à droite ; une sur téléphone, « Enregistrer » en bas. Plus de carte
  // Notifications : elle est dans Moi › Réglages.
  return (
    <div className="mx-auto max-w-[var(--largeur-lecture)] px-4 pb-10 pt-6 md:px-6">
      <PageTitle title={t("profile.title")} subtitle={user.email} />

      {!profile && (
        <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <AlertDescription className="text-inherit">
            {t("profile.welcome")}
          </AlertDescription>
        </Alert>
      )}

      {!canEdit && (
        <Alert className="mb-5">
          <AlertDescription>{t("profile.locked")}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid items-start gap-4 md:grid-cols-2 md:grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
      >
        <fieldset
          disabled={!canEdit}
          aria-label={t("signup.steps.identity")}
          className={cn("raised min-w-0 space-y-6 rounded-2xl p-5", !canEdit && "opacity-60")}
        >
          <IdentityFields value={form} onChange={setForm} />
          <PlanningNameField
            value={form}
            onChange={setForm}
            planningNames={planningNames}
            deriveFromPlanning={deriveFromPlanning}
          />
        </fieldset>

        <fieldset
          disabled={!canEdit}
          aria-label={t("profile.fields.accessTitle")}
          className={cn("raised min-w-0 rounded-2xl p-5 md:col-start-2 md:row-span-2 md:row-start-1", !canEdit && "opacity-60")}
        >
          <ServiceGrid value={form} onChange={setForm} deriveFromPlanning={deriveFromPlanning} />
        </fieldset>

        {(error || canEdit) && (
          <div className="space-y-4 md:col-start-1 md:row-start-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {canEdit && (
              <Button type="submit" disabled={saving} className="w-full h-11">
                {saving ? t("profile.saving") : t("profile.save")}
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
