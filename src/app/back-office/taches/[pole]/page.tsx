"use client";

// Tâches d'un pôle (lot 7, docs/spec-taches.md) : En retard · Cette semaine ·
// Plus tard · Faites. Réservé aux membres du pôle et aux admins. Lot U6 (B3) :
// la page passe au Back-Office › Tâches, sous l'en-tête de l'entrée (titre
// « Tâches », un onglet par pôle) ; le nom du pôle devient un titre de niveau 2.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Group } from "@/components/ui/group";
import { Button } from "@/components/ui/button";
import { TacheLigne } from "@/components/taches/TacheLigne";
import { TacheForm } from "@/components/taches/TacheForm";
import { useProfile, listProfiles } from "@/lib/firebase/users";
import { isPoleMember, polesDe } from "@/lib/access";
import { createTache, cyclerEtat, deleteTache, updateTache, type TacheValues } from "@/lib/firebase/taches";
import { grouperLignes, lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { useTaches } from "@/lib/taches/useTaches";
import { prevenirFait, prevenirResponsable } from "@/lib/taches/prevenir";
import { texteRetour } from "@/components/taches/retour";
import { todayIso } from "@/lib/scene/dimanches";
import { TACHE_POLES, type Tache, type TachePole } from "@/types/tache";
import type { UserProfile } from "@/types/user";

function PoleClient() {
  const { t } = useTranslation();
  const { pole: raw } = useParams<{ pole: string }>();
  const pole = (TACHE_POLES as readonly string[]).includes(raw) ? (raw as TachePole) : null;
  const { user, profile, loading } = useProfile();
  const membre = !!pole && isPoleMember(user, profile, pole);

  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  return (
    <div className="max-w-2xl space-y-6">
      {pole && membre ? (
        <PoleTaches pole={pole} />
      ) : (
        <>
          <TitrePole titre={pole ? t(`taches.pole.${pole}`) : t("taches.title")} />
          <p className="text-sm text-muted-foreground">{t("taches.pasMembre")}</p>
        </>
      )}
    </div>
  );
}

/** Le nom du pôle sous le titre de l'entrée, et l'action de la page à droite. */
function TitrePole({ titre, action }: { titre: string; action?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground">{titre}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("taches.subtitle")}</p>
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}

function PoleTaches({ pole }: { pole: TachePole }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const { items, loading, reload } = useTaches(useMemo(() => [pole], [pole]));
  const [membres, setMembres] = useState<UserProfile[]>([]);
  const [editing, setEditing] = useState<Tache | "new" | null>(null);
  const [retour, setRetour] = useState("");
  const today = todayIso();

  useEffect(() => {
    listProfiles().then((all) => setMembres(all.filter((p) => polesDe(p).includes(pole)))).catch(() => {});
  }, [pole]);

  const lignes = items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today));
  const g = grouperLignes(lignes, today);
  const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user?.email ?? "";

  // À faire → En cours → Terminé → À faire : on ne prévient qu'à « Terminé ».
  async function toggle(l: Ligne) {
    if (!user) return;
    setRetour("");
    const etat = await cyclerEtat(pole, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom });
    await reload();
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(pole, l.tache.id, l.date), l.tache));
    }
  }

  async function save(values: TacheValues) {
    if (!user) return;
    const avant = editing && editing !== "new" ? editing : null;
    const id = avant ? avant.id : await createTache(pole, values, user.uid);
    if (avant) await updateTache(pole, avant.id, values);
    setEditing(null);
    await reload();
    // Nommé par quelqu'un d'autre : le nouveau responsable est prévenu.
    if (values.responsableUid && values.responsableUid !== user.uid && values.responsableUid !== avant?.responsableUid) {
      prevenirResponsable(pole, id);
    }
  }

  async function remove() {
    if (!editing || editing === "new") return;
    const fois = items.find((x) => x.tache.id === editing.id)?.fois ?? [];
    await deleteTache(pole, editing.id, fois);
    setEditing(null);
    await reload();
  }

  const sections: [string, Ligne[]][] = [
    [t("taches.groupes.enRetard"), g.enRetard],
    [t("taches.groupes.cetteSemaine"), g.cetteSemaine],
    [t("taches.groupes.plusTard"), g.plusTard],
    [t("taches.groupes.faites"), g.faites],
  ];

  return (
    <>
      <TitrePole
        titre={t(`taches.pole.${pole}`)}
        action={<Button size="sm" onClick={() => setEditing("new")}>{t("taches.nouvelle")}</Button>}
      />
      {retour && <p role="status" className="text-sm text-muted-foreground">{retour}</p>}
      {!loading && lignes.length === 0 && <p className="text-sm text-muted-foreground">{t("taches.vide")}</p>}
      {sections.filter(([, ls]) => ls.length > 0).map(([titre, ls]) => (
        <Group key={titre} title={titre}>
          {ls.map((l) => (
            <TacheLigne key={`${l.tache.id}-${l.date}`} ligne={l} onToggle={() => toggle(l)} onOpen={() => setEditing(l.tache)} />
          ))}
        </Group>
      ))}
      <TacheForm
        open={editing !== null}
        pole={pole}
        initial={editing && editing !== "new" ? editing : null}
        membres={membres}
        onSubmit={save}
        onDelete={editing && editing !== "new" ? remove : undefined}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

export default function TachesPolePage() {
  return (
    <RequireAuth>
      <PoleClient />
    </RequireAuth>
  );
}
