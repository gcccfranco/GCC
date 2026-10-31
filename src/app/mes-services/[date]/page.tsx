"use client";

// Un service de Mes services (lot U4 bis, B4, Q7) : `/mes-services/2026-10-18`, avec
// `?service=` quand la personne sert deux fois ce jour-là, et sa séance si les deux services
// portent le même nom (`adresseDuService`).

import { CalendarX } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { DetailService } from "@/components/mesServices/DetailService";
import { useMesServices } from "@/components/mesServices/SectionMesServices";
import { serviceDeLAdresse } from "@/lib/planning/mesServices";
import { Impasse } from "@/components/layout/Impasse";

export default function ServicePage() {
  const { t } = useTranslation();
  const { date } = useParams<{ date: string }>();
  const requete = useSearchParams();
  const { services } = useMesServices();
  const s = serviceDeLAdresse(services, date, requete.get("service"), requete.get("moment"), requete.get("seance"));
  if (!s) {
    return (
      <Impasse icone={CalendarX} titre={t("mesServices.introuvable")} sortie={{ href: "/mes-services", label: t("mesServices.title") }} />
    );
  }
  return <DetailService s={s} />;
}
