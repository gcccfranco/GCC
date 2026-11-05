"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmer } from "@/components/layout/Confirmer";
import { OngletsRail } from "@/components/layout/Onglets";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Champ } from "@/components/ui/champ";
import { ChampSelect } from "@/components/ui/champ-select";
import { Menu } from "@/components/ui/menu";
import { Input } from "@/components/ui/input";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { SERVICE_LIEUX, type UserProfile } from "@/types/user";
import type { Prevenir, Rythme, Tache } from "@/types/tache";
import { equipesDe } from "@/lib/access";
import { EQUIPES, cleNomEquipe } from "@/lib/equipes/table";
import type { TacheValues } from "@/lib/firebase/taches";

function prevenirValue(p: Prevenir): string {
  if (!p) return "";
  return "equipe" in p ? `equipe:${p.equipe}` : `regie:${p.regie}`;
}

function parsePrevenir(v: string): Prevenir {
  if (v.startsWith("equipe:")) return { equipe: v.slice(7) };
  if (v.startsWith("regie:")) return { regie: v.slice(6) };
  return null;
}

/** Semaine du mois d'une date (1 à 4 ; la 5e devient « dernière »). */
function rangDe(iso: string): number {
  const n = Math.ceil(Number(iso.slice(8, 10)) / 7);
  return n > 4 ? -1 : n;
}

const RYTHMES = ["semaine", "2semaines", "mois", "an"] as const;

/** Feuille de création ou de modification d'une tâche (lot 7). `enLigne` (agencement v18, B2 ;
 *  planche `v18-bo-tache-nouvelle`) : en grand au Back-Office, le formulaire est une carte dans le
 *  volet de droite (équipe en pilules, répétition en rail, « Annuler · Créer la tâche »), plus une
 *  feuille ; le calendrier et l'App gardent la feuille. */
export function TacheForm({ open, enLigne, equipe, equipes, evenement, echeance, initial, membres, onSubmit, onDelete, onClose }: {
  open: boolean;
  /** Une carte dans la page au lieu d'une feuille (Back-Office en grand). */
  enLigne?: boolean;
  equipe: string;
  /** Équipes où créer la tâche (`equipesOuCreer`, EQ10) : un choix s'il y en a plusieurs, `equipe`
   *  étant celle de départ. */
  equipes?: string[];
  /** Évènement auquel rattacher une nouvelle tâche (lot 14). */
  evenement?: Tache["evenement"];
  /** Échéance d'une nouvelle tâche, depuis un jour du calendrier (lot U8, C5). */
  echeance?: string;
  /** Valeurs de départ ; `null` = nouvelle tâche. */
  initial: TacheValues | null;
  /** Proposés comme responsables : ceux de l'équipe de la tâche. */
  membres: UserProfile[];
  onSubmit: (values: TacheValues, equipe: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  useStandaloneScrollLock(open && !enLigne);
  const { t } = useTranslation();
  if (enLigne) {
    return open ? (
      <div className="carte-groupe max-w-[720px] rounded-2xl pt-5">
        <Champs enLigne equipe={equipe} equipes={equipes} evenement={evenement} echeance={echeance} initial={initial} membres={membres} onSubmit={onSubmit} onDelete={onDelete} onClose={onClose} />
      </div>
    ) : null;
  }
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh] md:max-w-lg md:mx-auto" aria-describedby={undefined}>
        <DrawerHeader className="pb-1">
          <DrawerTitle>{initial ? t("taches.modifier") : t("taches.nouvelle")}</DrawerTitle>
        </DrawerHeader>
        {open && (
          <Champs equipe={equipe} equipes={equipes} evenement={evenement} echeance={echeance} initial={initial} membres={membres} onSubmit={onSubmit} onDelete={onDelete} onClose={onClose} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Champs({ enLigne, equipe: equipeDepart, equipes, evenement, echeance, initial, membres, onSubmit, onDelete, onClose }: Omit<Parameters<typeof TacheForm>[0], "open">) {
  const { t } = useTranslation();
  const titreId = useId();
  const confirmer = useConfirmer();
  const [equipe, setEquipe] = useState(equipeDepart);
  const [v, setV] = useState<TacheValues>(
    initial ?? {
      titre: "", responsableUid: null, responsableNom: "", echeance: echeance ?? "", repetition: null,
      lien: "", note: "", prevenir: null, evenement: evenement ?? null,
    },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<TacheValues>) => setV((x) => ({ ...x, ...patch }));
  const rythme = v.repetition?.rythme ?? "";
  // Les membres de l'équipe choisie, Louange élargi (EQ10).
  const proposes = membres.filter((m) => equipesDe(m).includes(equipe));

  function changerEquipe(e: string) {
    setEquipe(e);
    // Le responsable est un membre de l'équipe, et une équipe ne se prévient pas elle-même.
    const soiMeme = !!v.prevenir && "equipe" in v.prevenir && v.prevenir.equipe === e;
    set({ responsableUid: null, responsableNom: "", ...(soiMeme ? { prevenir: null } : {}) });
  }

  function setRythme(r: Rythme | "") {
    if (!r) return set({ repetition: null });
    set({ repetition: r === "mois" ? { rythme: r, rang: v.echeance ? rangDe(v.echeance) : 1 } : { rythme: r } });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.titre.trim()) return setError(t("taches.titreRequis"));
    if (!v.echeance) return setError(t("taches.echeanceRequise"));
    setBusy(true);
    setError("");
    try {
      await onSubmit({ ...v, titre: v.titre.trim(), lien: v.lien.trim(), note: v.note.trim() }, equipe);
    } catch {
      setError(t("taches.erreur"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!onDelete || !(await confirmer({ titre: t("taches.confirmerSuppression"), action: t("common.buttons.delete"), destructif: true }))) return;
    setBusy(true);
    try {
      await onDelete();
    } catch {
      setError(t("taches.erreur"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby={enLigne ? titreId : undefined} className={enLigne ? "space-y-4 px-5 pb-5" : "px-4 pb-6 space-y-4 overflow-y-auto"}>
      {enLigne && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titreId} className="text-lg font-bold">{initial ? t("taches.modifier") : t("taches.nouvelle")}</h2>
          <span className="text-[13px] text-muted-foreground">{t(cleNomEquipe(equipe, true))}</span>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {equipes && equipes.length > 1 && (
        <Champ label={t("taches.champs.equipe")}>
          <Menu label={t("taches.champs.equipe")} value={equipe} defaultValue={equipe}
            options={equipes.map((e) => ({ valeur: e, libelle: t(cleNomEquipe(e, true)) }))} onChange={changerEquipe}
            className="h-11 w-full justify-between rounded-[12px] px-3 text-base font-normal [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:text-base" />
        </Champ>
      )}
      <Champ id="tache-titre" label={t("taches.champs.titre")}>
        <Input id="tache-titre" className="h-11" value={v.titre} maxLength={80} onChange={(e) => set({ titre: e.target.value })} />
      </Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ id="tache-echeance" label={t("taches.champs.echeance")}>
          <Input id="tache-echeance" className="h-11" type="date" value={v.echeance}
            onChange={(e) => set({
              echeance: e.target.value,
              ...(v.repetition?.rythme === "mois" && e.target.value ? { repetition: { rythme: "mois", rang: rangDe(e.target.value) } } : {}),
            })} />
        </Champ>
        <Champ id="tache-responsable" label={t("taches.champs.responsable")}>
          <ChampSelect id="tache-responsable" value={v.responsableUid ?? ""}
            onChange={(e) => {
              const m = membres.find((x) => x.uid === e.target.value);
              set({ responsableUid: m?.uid ?? null, responsableNom: m ? `${m.firstName} ${m.lastName}`.trim() : "" });
            }}>
            <option value="">{t("taches.pourTous")}</option>
            {proposes.map((m) => <option key={m.uid} value={m.uid}>{`${m.firstName} ${m.lastName}`.trim() || m.email}</option>)}
            {/* Le responsable de la tâche reste affiché, membres pas encore lus ou parti de l'équipe. */}
            {v.responsableUid && !proposes.some((m) => m.uid === v.responsableUid) && <option value={v.responsableUid}>{v.responsableNom}</option>}
          </ChampSelect>
        </Champ>
      </div>
      {/* Une tâche liée à un évènement ne se répète pas (lot 14) : l'évènement
          prend la place de la répétition, qui revient si on la détache. */}
      {v.evenement ? (
        <Champ label={t("taches.champs.evenement")}>
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 rounded-lg bg-secondary pl-3 pr-1 text-base md:text-sm">
            <span className="min-w-0 break-words py-2">{v.evenement.titre}</span>
            {/* Détacher n'a de sens que sur une tâche qui existe déjà. */}
            {initial && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ evenement: null })}>
                {t("taches.detacherEvenement")}
              </Button>
            )}
          </div>
        </Champ>
      ) : enLigne ? (
        <Champ label={t("taches.champs.repetition")}>
          <OngletsRail etiquette={t("taches.champs.repetition")} actif={rythme || "aucun"}
            choisir={(id) => setRythme(id === "aucun" ? "" : (id as Rythme))}
            onglets={["aucun", ...RYTHMES].map((r) => ({ id: r, label: t(`taches.rythmeCourt.${r}`) }))} />
          {rythme === "an" && <p className="text-xs text-muted-foreground">{t("taches.anAide")}</p>}
          {rythme === "mois" && (
            <Champ id="tache-rang" label={t("taches.champs.rang")} className="max-w-xs pt-1.5">
              <ChampSelect id="tache-rang" value={String(v.repetition?.rang ?? 1)}
                onChange={(e) => set({ repetition: { rythme: "mois", rang: Number(e.target.value) } })}>
                {["1", "2", "3", "4", "-1"].map((r) => <option key={r} value={r}>{t(`taches.rang.${r}`)}</option>)}
              </ChampSelect>
            </Champ>
          )}
        </Champ>
      ) : (
      <div className="space-y-4">
        <Champ id="tache-repetition" label={t("taches.champs.repetition")}>
          <ChampSelect id="tache-repetition" value={rythme} onChange={(e) => setRythme(e.target.value as Rythme | "")}>
            <option value="">{t("taches.rythme.aucun")}</option>
            <option value="semaine">{t("taches.rythme.semaine")}</option>
            <option value="2semaines">{t("taches.rythme.2semaines")}</option>
            <option value="mois">{t("taches.rythme.mois")}</option>
            <option value="an">{t("taches.rythme.an")}</option>
          </ChampSelect>
          {rythme === "an" && <p className="text-xs text-muted-foreground">{t("taches.anAide")}</p>}
        </Champ>
        {rythme === "mois" && (
          <Champ id="tache-rang" label={t("taches.champs.rang")}>
            <ChampSelect id="tache-rang" value={String(v.repetition?.rang ?? 1)}
              onChange={(e) => set({ repetition: { rythme: "mois", rang: Number(e.target.value) } })}>
              {["1", "2", "3", "4", "-1"].map((r) => <option key={r} value={r}>{t(`taches.rang.${r}`)}</option>)}
            </ChampSelect>
          </Champ>
        )}
      </div>
      )}
      <Champ id="tache-prevenir" label={t("taches.champs.prevenir")}>
        <ChampSelect id="tache-prevenir" value={prevenirValue(v.prevenir)} onChange={(e) => set({ prevenir: parsePrevenir(e.target.value) })}>
          <option value="">{t("taches.prevenirPersonne")}</option>
          {/* Les autres équipes, sous leur nom (EQ10), puis les régies. */}
          {EQUIPES.filter((e) => e.id !== equipe).map((e) => (
            <option key={e.id} value={`equipe:${e.id}`}>{t(cleNomEquipe(e.id))}</option>
          ))}
          {SERVICE_LIEUX.map((s) => (
            <option key={s} value={`regie:${s}`}>{t("taches.prevenirRegie", { service: t(`categories.${s}`, { defaultValue: s }) })}</option>
          ))}
        </ChampSelect>
      </Champ>
      <Champ id="tache-lien" label={t("taches.champs.lien")}>
        <Input id="tache-lien" className="h-11" type="url" inputMode="url" value={v.lien} placeholder="https://" onChange={(e) => set({ lien: e.target.value })} />
      </Champ>
      <Champ id="tache-note" label={t("taches.champs.note")}>
        <Input id="tache-note" className="h-11" value={v.note} maxLength={160} onChange={(e) => set({ note: e.target.value })} />
      </Champ>
      {enLigne ? (
        // Formulaires (R13) : en bas de la carte, à droite, « Annuler » (texte, 44 px) puis le bouton plein.
        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <Button type="button" variant="ghost" className="h-11 text-foreground" onClick={onClose}>{t("taches.annuler")}</Button>
          <Button type="submit" className="h-11 rounded-full" disabled={busy}>{initial ? t("taches.enregistrer") : t("taches.creer")}</Button>
        </div>
      ) : (
      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" className="h-[50px] w-full" disabled={busy}>{initial ? t("taches.enregistrer") : t("taches.creer")}</Button>
        <Button type="button" variant="ghost" className="h-11 w-full" onClick={onClose}>{t("taches.annuler")}</Button>
        {onDelete && (
          <Button type="button" variant="ghost" className="h-11 w-full text-destructive" disabled={busy} onClick={remove}>
            {t("taches.supprimer")}
          </Button>
        )}
      </div>
      )}
    </form>
  );
}
