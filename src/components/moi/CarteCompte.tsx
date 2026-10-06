"use client";

// Carte du compte en tête de Moi (lot U4 bis, B5, docs/spec-pages-en-grand.md, Q9 ; planches
// `moi-*`) : nom, e-mail, rôle, nom dans les plannings, services et rôles, « Mon profil ».

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { GROUPES, SERVICE_LIEUX, SERVICE_ROLE_LABELS, type ServiceRole } from "@/types/user";
import { EDD_CLASSES } from "@/lib/planning/utils";

// Même ordre que le formulaire du profil (ProfileFields) : cultes, groupes, EDD ; rôles idem.
const ORDRE_SERVICES: readonly string[] = [...SERVICE_LIEUX, ...GROUPES, ...EDD_CLASSES];
const ORDRE_ROLES: ServiceRole[] = ["presidence", "chanteur", "musicien", "regie"];

/** Services et rôles d'un profil, dans l'ordre du formulaire ; un service inconnu passe en dernier. */
function servicesEtRoles(serviceRoles: Record<string, ServiceRole[]>): { service: string; roles: ServiceRole[] }[] {
  const rang = (s: string) => (ORDRE_SERVICES.includes(s) ? ORDRE_SERVICES.indexOf(s) : ORDRE_SERVICES.length);
  return Object.keys(serviceRoles)
    .sort((a, b) => rang(a) - rang(b))
    .map((service) => ({ service, roles: ORDRE_ROLES.filter((r) => serviceRoles[service].includes(r)) }));
}

export function CarteCompte({
  nom,
  email,
  admin,
  planningName,
  serviceRoles,
}: {
  nom: string;
  email: string;
  admin: boolean;
  planningName: string;
  serviceRoles: Record<string, ServiceRole[]>;
}) {
  const { t, i18n } = useTranslation();
  // En 中文, le service et ses rôles traduits (comme l'aperçu d'une setlist) ; en français, les
  // libellés du formulaire du profil.
  const zh = i18n.language === "zh-CN";
  const services = servicesEtRoles(serviceRoles);
  const initiale = (nom || email).trim().charAt(0).toUpperCase();

  return (
    <section aria-label={t("moi.compte")} className="raised rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-2xl font-semibold text-background">
          {initiale}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-foreground">{nom || email}</h2>
          <p className="truncate text-[13px] text-muted-foreground">{email}</p>
          {admin && (
            <span className="mt-0.5 inline-block rounded-md bg-foreground px-1.5 py-px text-[11px] font-bold text-background">
              {t("moi.admin")}
            </span>
          )}
        </div>
      </div>

      {planningName && (
        <div className="mt-4">
          <p className="text-[13px] text-muted-foreground">{t("profile.fields.planningName")}</p>
          <p className="font-semibold text-foreground">{planningName}</p>
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-3">
          <p className="text-[13px] text-muted-foreground">{t("profile.fields.accessTitle")}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {services.map(({ service, roles }) => {
              const couleur = categoryColor(service);
              return (
                <li
                  key={service}
                  data-testid="service-role"
                  className="rounded-md px-2 py-0.5 text-[13px] font-semibold"
                  style={{ color: couleur, background: `${couleur}1f` }}
                >
                  {zh ? t(`categories.${service}`, { defaultValue: service }) : categoryLabel(service)}
                  {roles.length > 0 &&
                    ` · ${roles.map((r) => (zh ? t(`equipes.role.${r === "chanteur" ? "choriste" : r}`) : SERVICE_ROLE_LABELS[r])).join(", ")}`}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Link
        href="/profil"
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-secondary px-4 text-[15px] font-semibold text-foreground transition-transform duration-150 active:scale-[.97]"
      >
        <UserRound className="h-4 w-4" aria-hidden />
        {t("common.header.profile")}
      </Link>
    </section>
  );
}
