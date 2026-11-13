"use client";

// Lot ST (docs/spec-jianpu-entete-statistiques.md), ST3 : la page Statistiques ouverte à tout membre
// connecté (D5), hors du layout Back-Office et de son interrupteur. Sans compte : la connexion.
// `/back-office/statistiques` y redirige (next.config.ts). Le filtre présidence reste aux admins.
import { RequireAuth } from "@/components/auth/RequireAuth";
import { StatistiquesClient } from "./StatistiquesClient";

export default function StatistiquesPage() {
  return (
    <RequireAuth>
      <StatistiquesClient />
    </RequireAuth>
  );
}
