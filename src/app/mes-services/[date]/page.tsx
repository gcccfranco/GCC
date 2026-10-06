"use client";

// Un service de Mes services (lot U4 bis, B4, Q7) : `/mes-services/2026-10-18`, avec
// `?service=` quand la personne sert deux fois ce jour-là, et sa séance si les deux services
// portent le même nom (`adresseDuService`).

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { DetailService } from "@/components/mesServices/DetailService";
import { useMesServices } from "@/components/mesServices/SectionMesServices";
import { serviceDeLAdresse } from "@/lib/planning/mesServices";

export default function ServicePage() {
  const { t } = useTranslation();
  const { date } = useParams<{ date: string }>();
  const requete = useSearchParams();
  const { services } = useMesServices();
  const s = serviceDeLAdresse(services, date, requete.get("service"), requete.get("moment"), requete.get("seance"));
  if (!s) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("mesServices.introuvable")}</p>
        <Link href="/mes-services" className="text-sm underline underline-offset-2">{t("mesServices.title")}</Link>
      </div>
    );
  }
  return <DetailService s={s} />;
}
