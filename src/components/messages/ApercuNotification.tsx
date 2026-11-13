"use client";

// Messages › Notifier (agencement v18, B11 de docs/spec-agencement-v18.md ; planche
// `v18-bo-messages-notifier`) : à droite du formulaire, l'aperçu de la notification telle qu'un
// téléphone la montre (logo, « GCC Louange », le titre et le message tapés), puis « Derniers
// envois » : les cinq dernières notifications manuelles (`kind: "manual"`, celles qu'écrit
// Notifier, api/push/notify-audience), lues dans `notifications` (lecture permise à tout connecté).
// Relecture de T5 : la requête ne lit que les envois manuels (`getEnvoisManuels`), et non plus les
// 50 dernières notifications triées après coup, où cinquante rappels cachaient un envoi plus
// ancien ; une lecture refusée se dit à part. Bilingue depuis B5b (docs/spec-corrections-audit.md).
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { getEnvoisManuels, type PushNotif } from "@/lib/firebase/notifications";

/** Une notification de téléphone, avec le titre et le message tapés. */
export function ApercuNotification({ titre, message }: { titre: string; message: string }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t("notifier.apercu")}>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t("notifier.apercu")}</h2>
      <div className="rounded-2xl bg-secondary p-3">
        <div className="rounded-2xl bg-card px-3 py-2.5 text-foreground">
          <div className="flex items-start gap-2.5">
            <span className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
              <Image src="/logo.png" alt="" fill sizes="28px" className="object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold">{t("common.header.title")}</p>
                <p className="shrink-0 text-xs text-muted-foreground">{t("notifier.maintenant")}</p>
              </div>
              <p className={`truncate text-sm font-semibold ${titre.trim() ? "" : "text-muted-foreground"}`}>
                {titre.trim() || t("notifier.titreApercu")}
              </p>
              <p className={`line-clamp-3 whitespace-pre-wrap text-sm ${message.trim() ? "" : "text-muted-foreground"}`}>
                {message.trim() || t("notifier.messageApercu")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Les cinq derniers envois de Notifier. `cle` : relu quand elle change (après un envoi). */
export function DerniersEnvois({ cle = 0 }: { cle?: number }) {
  const { t, i18n } = useTranslation();
  const [envois, setEnvois] = useState<PushNotif[] | "erreur" | null>(null);

  useEffect(() => {
    let vivant = true;
    getEnvoisManuels(5)
      .then((n) => { if (vivant) setEnvois(n); })
      .catch(() => { if (vivant) setEnvois("erreur"); });
    return () => { vivant = false; };
  }, [cle]);

  return (
    <section aria-label={t("notifier.derniersEnvois")} className="carte-groupe rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-bold text-foreground">{t("notifier.derniersEnvois")}</h2>
      {envois === null ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : envois === "erreur" ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("notifier.derniersErreur")}</p>
      ) : envois.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("notifier.aucunEnvoi")}</p>
      ) : (
        <ul className="mt-1">
          {envois.map((n) => (
            <li key={n.id} className="border-t border-border py-2.5 first:border-t-0">
              <p className="truncate text-base font-semibold text-foreground">{n.title}</p>
              <p className="text-sm text-muted-foreground">
                {n.everyone ? t("notifier.toutLeMonde") : t("notifier.personnes", { count: n.recipients.length })}
                {n.createdAt ? ` · ${n.createdAt.toLocaleDateString(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short" })}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
