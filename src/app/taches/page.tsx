"use client";

// Tâches (lot 7, docs/spec-taches.md) : ce qui reste à faire pour moi, puis
// mes pôles. Chacun ne voit que les pôles dont il fait partie (admins : tous).

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import { TacheLigne } from "@/components/taches/TacheLigne";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser, polesDe } from "@/lib/access";
import { aFairePour, lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { useTaches } from "@/lib/taches/useTaches";
import { todayIso } from "@/lib/scene/dimanches";
import { cocherFois, decocherFois } from "@/lib/firebase/taches";
import { prevenirFait } from "@/lib/taches/prevenir";
import { texteRetour } from "@/components/taches/retour";
import { TACHE_POLES } from "@/types/tache";

function TachesClient() {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  const poles = useMemo(
    () => (isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile)),
    [user, profile],
  );
  const { items, reload } = useTaches(loading ? [] : poles);
  const [retour, setRetour] = useState("");
  const today = todayIso();
  const lignes = items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today));
  const miennes = user ? aFairePour(lignes, user.uid) : [];

  async function cocher(l: Ligne) {
    if (!user) return;
    const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? "";
    setRetour("");
    if (l.fois) await decocherFois(l.tache.pole, l.tache.id, l.date);
    else await cocherFois(l.tache.pole, l.tache.id, { date: l.date, parUid: user.uid, parNom, le: new Date().toISOString() });
    await reload();
    if (!l.fois && l.tache.prevenir) setRetour(texteRetour(t, await prevenirFait(l.tache.pole, l.tache.id, l.date), l.tache));
  }

  if (loading) return <p className="px-4 pt-6 text-sm text-muted-foreground">{t("common.loading")}</p>;
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">
      <PageTitle title={t("taches.title")} />
      {retour && <p role="status" className="text-sm text-muted-foreground">{retour}</p>}
      {poles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("taches.aucunPole")}</p>
      ) : (
        <>
          <Group title={t("taches.aFairePourMoi")}>
            {miennes.length === 0 ? (
              <GroupRow>{<span className="text-muted-foreground">{t("taches.rienAFaire")}</span>}</GroupRow>
            ) : (
              miennes.map((l) => (
                <TacheLigne
                  key={`${l.tache.id}-${l.date}`}
                  ligne={l}
                  poleLabel={t(`taches.pole.${l.tache.pole}`)}
                  onToggle={() => cocher(l)}
                />
              ))
            )}
          </Group>
          <Group title={t("taches.poles")}>
            {poles.map((p) => {
              const n = lignes.filter((l) => !l.fois && l.tache.pole === p).length;
              return (
                <GroupRow key={p} href={`/taches/${p}`} trailing={n > 0 ? String(n) : undefined} chevron>
                  {t(`taches.pole.${p}`)}
                </GroupRow>
              );
            })}
          </Group>
        </>
      )}
    </div>
  );
}

export default function TachesPage() {
  return (
    <RequireAuth>
      <TachesClient />
    </RequireAuth>
  );
}
