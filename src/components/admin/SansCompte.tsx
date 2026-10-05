"use client";

// Planning › Sans compte (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 1106) : les noms
// des plannings liés à aucun compte. Admins seuls (lecture de tous les profils).
import { useEffect, useMemo, useState } from "react";
import { listProfiles } from "@/lib/firebase/users";
import { loadPlanningData, collectPlanningNames, normalizeName, type PlanningData } from "@/lib/planning/names";
import type { UserProfile } from "@/types/user";

/** `onCompte` : nombre de noms sans compte (pastille de l'onglet). */
export function SansCompte({ onCompte }: { onCompte?: (n: number) => void }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);

  useEffect(() => {
    listProfiles().then(setProfiles);
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  // Noms présents dans les plannings mais liés à aucun compte (planningName) :
  // ces personnes échappent aux rappels et aux notifs « setlist prête » (ciblage
  // par nom de planning, cf. src/lib/push/recipients.ts). Visibilité pour l'admin.
  const unlinkedNames = useMemo(() => {
    const linked = new Set(
      profiles.map((p) => normalizeName(p.planningName.trim())).filter(Boolean)
    );
    return planningNames.filter((n) => !linked.has(normalizeName(n.trim())));
  }, [planningNames, profiles]);

  useEffect(() => {
    onCompte?.(unlinkedNames.length);
  }, [onCompte, unlinkedNames.length]);

  return (
    <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Planning sans compte ({unlinkedNames.length})
      </h2>
      <p className="text-xs text-muted-foreground">
        Ces noms apparaissent dans les plannings mais ne sont liés à aucun compte —
        ces personnes ne reçoivent ni rappels ni notification « setlist prête ».
      </p>
      {planningData == null ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : unlinkedNames.length === 0 ? (
        <p className="text-sm text-foreground">
          ✅ Tous les noms du planning sont liés à un compte.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {unlinkedNames.map((n) => (
            <span
              key={n}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
