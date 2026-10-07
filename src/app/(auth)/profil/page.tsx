"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
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
import { EnTetePage } from "@/components/layout/EnTetePage";
import { PushToggle } from "@/components/push/PushToggle";
import { cn } from "@/lib/utils";

const FORMULAIRE = "formulaire-profil";

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

  // A13 (agencement v18 ; planche `v18-app-profil`, plus récente que U4 bis Q10) : l'en-tête commun,
  // « ‹ Moi », « Enregistrer » à droite du titre dès 768 px (en bas sur téléphone, R7) ; deux
  // colonnes dès la tablette portrait — identité puis la carte Notifications (`PushToggle` tel quel,
  // le même réglage que Moi › Réglages) à gauche, services et rôles à droite ; une sur téléphone.
  const enregistrer = saving ? t("profile.saving") : t("profile.enregistrer");
  return (
    <div className="pb-10">
      <EnTetePage
        retour={{ href: "/moi", label: t("moi.title") }}
        titre={t("profile.title")}
        sousTitre={user.email}
        action={canEdit && (
          <Button type="submit" form={FORMULAIRE} disabled={saving} aria-label={t("profile.save")} className="hidden h-10 gap-2 rounded-full px-[18px] text-[14.5px] font-semibold md:inline-flex">
            <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            {enregistrer}
          </Button>
        )}
      />

      <div className="space-y-4 px-[var(--marge-page)]">
        {!profile && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <AlertDescription className="text-inherit">
              {t("profile.welcome")}
            </AlertDescription>
          </Alert>
        )}

        {!canEdit && (
          <Alert>
            <AlertDescription>{t("profile.locked")}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          id={FORMULAIRE}
          onSubmit={handleSubmit}
          className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.25fr)]"
        >
          <div className="min-w-0 space-y-4">
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
            <section aria-label={t("moi.notifications")} className="raised overflow-hidden rounded-2xl">
              <PushToggle />
            </section>
          </div>

          <fieldset
            disabled={!canEdit}
            aria-label={t("profile.fields.accessTitle")}
            className={cn("raised min-w-0 rounded-2xl p-5", !canEdit && "opacity-60")}
          >
            <ServiceGrid value={form} onChange={setForm} deriveFromPlanning={deriveFromPlanning} />
          </fieldset>

          {canEdit && (
            <Button type="submit" disabled={saving} className="h-11 w-full md:hidden">
              {saving ? t("profile.saving") : t("profile.save")}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
