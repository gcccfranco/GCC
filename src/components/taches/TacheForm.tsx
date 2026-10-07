"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmer } from "@/components/layout/Confirmer";
import { OngletsRail, Pilules } from "@/components/layout/Onglets";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { SERVICE_LIEUX, type UserProfile } from "@/types/user";
import { TACHE_POLES, type Prevenir, type Rythme, type Tache, type TachePole } from "@/types/tache";
import { polesDe } from "@/lib/access";
import type { TacheValues } from "@/lib/firebase/taches";

const LABEL = "text-xs font-semibold";
const FIELD = "w-full h-10 rounded-lg bg-secondary px-3 text-base md:text-sm";

function prevenirValue(p: Prevenir): string {
  if (!p) return "";
  return "pole" in p ? `pole:${p.pole}` : `regie:${p.regie}`;
}

function parsePrevenir(v: string): Prevenir {
  if (v.startsWith("pole:")) return { pole: v.slice(5) as TachePole };
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
 *  volet de droite (pôle en pilules, répétition en rail, « Annuler · Créer la tâche »), plus une
 *  feuille ; le calendrier et l'App gardent la feuille. */
export function TacheForm({ open, enLigne, pole, poles, evenement, echeance, initial, membres, onSubmit, onDelete, onClose }: {
  open: boolean;
  /** Une carte dans la page au lieu d'une feuille (Back-Office en grand). */
  enLigne?: boolean;
  pole: TachePole;
  /** Pôles où créer la tâche, depuis la fiche d'un évènement (lot 14) : un
   *  choix s'il y en a plusieurs, `pole` étant celui de départ. */
  poles?: TachePole[];
  /** Évènement auquel rattacher une nouvelle tâche (lot 14). */
  evenement?: Tache["evenement"];
  /** Échéance d'une nouvelle tâche, depuis un jour du calendrier (lot U8, C5). */
  echeance?: string;
  /** Valeurs de départ ; `null` = nouvelle tâche. */
  initial: TacheValues | null;
  /** Proposés comme responsables : ceux du pôle de la tâche. */
  membres: UserProfile[];
  onSubmit: (values: TacheValues, pole: TachePole) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  useStandaloneScrollLock(open && !enLigne);
  const { t } = useTranslation();
  if (enLigne) {
    return open ? (
      <div className="raised max-w-[720px] rounded-2xl pt-5">
        <Champs enLigne pole={pole} poles={poles} evenement={evenement} echeance={echeance} initial={initial} membres={membres} onSubmit={onSubmit} onDelete={onDelete} onClose={onClose} />
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
          <Champs pole={pole} poles={poles} evenement={evenement} echeance={echeance} initial={initial} membres={membres} onSubmit={onSubmit} onDelete={onDelete} onClose={onClose} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Champs({ enLigne, pole: poleDepart, poles, evenement, echeance, initial, membres, onSubmit, onDelete, onClose }: Omit<Parameters<typeof TacheForm>[0], "open">) {
  const { t } = useTranslation();
  const titreId = useId();
  const confirmer = useConfirmer();
  const [pole, setPole] = useState(poleDepart);
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
  const proposes = membres.filter((m) => polesDe(m).includes(pole));

  function changerPole(p: TachePole) {
    setPole(p);
    // Le responsable est un membre du pôle, et un pôle ne se prévient pas lui-même.
    const soiMeme = !!v.prevenir && "pole" in v.prevenir && v.prevenir.pole === p;
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
      await onSubmit({ ...v, titre: v.titre.trim(), lien: v.lien.trim(), note: v.note.trim() }, pole);
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
          <span className="text-[13px] text-muted-foreground">{t("taches.prevenirPole", { pole: t(`taches.pole.${pole}`) })}</span>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {poles && poles.length > 1 && (enLigne ? (
        <div className="space-y-1.5">
          <p className={LABEL}>{t("taches.champs.pole")}</p>
          <Pilules etiquette={t("taches.champs.pole")} obligatoire valeur={pole} choisir={(p) => p && changerPole(p)}
            options={poles.map((p) => ({ cle: p, nom: t(`taches.pole.${p}`) }))} />
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor="tache-pole" className={LABEL}>{t("taches.champs.pole")}</label>
          <select id="tache-pole" className={FIELD} value={pole} onChange={(e) => changerPole(e.target.value as TachePole)}>
            {poles.map((p) => <option key={p} value={p}>{t(`taches.pole.${p}`)}</option>)}
          </select>
        </div>
      ))}
      <div className="space-y-1">
        <label htmlFor="tache-titre" className={LABEL}>{t("taches.champs.titre")}</label>
        <Input id="tache-titre" value={v.titre} maxLength={80} onChange={(e) => set({ titre: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="tache-echeance" className={LABEL}>{t("taches.champs.echeance")}</label>
          <Input id="tache-echeance" type="date" value={v.echeance}
            onChange={(e) => set({
              echeance: e.target.value,
              ...(v.repetition?.rythme === "mois" && e.target.value ? { repetition: { rythme: "mois", rang: rangDe(e.target.value) } } : {}),
            })} />
        </div>
        <div className="space-y-1">
          <label htmlFor="tache-responsable" className={LABEL}>{t("taches.champs.responsable")}</label>
          <select id="tache-responsable" className={FIELD} value={v.responsableUid ?? ""}
            onChange={(e) => {
              const m = membres.find((x) => x.uid === e.target.value);
              set({ responsableUid: m?.uid ?? null, responsableNom: m ? `${m.firstName} ${m.lastName}`.trim() : "" });
            }}>
            <option value="">{t("taches.pourTous")}</option>
            {proposes.map((m) => <option key={m.uid} value={m.uid}>{`${m.firstName} ${m.lastName}`.trim() || m.email}</option>)}
            {/* Le responsable de la tâche reste affiché, membres pas encore lus ou parti du pôle. */}
            {v.responsableUid && !proposes.some((m) => m.uid === v.responsableUid) && <option value={v.responsableUid}>{v.responsableNom}</option>}
          </select>
        </div>
      </div>
      {/* Une tâche liée à un évènement ne se répète pas (lot 14) : l'évènement
          prend la place de la répétition, qui revient si on la détache. */}
      {v.evenement ? (
        <div className="space-y-1">
          <p className={LABEL}>{t("taches.champs.evenement")}</p>
          <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 rounded-lg bg-secondary pl-3 pr-1 text-base md:text-sm">
            <span className="min-w-0 break-words py-2">{v.evenement.titre}</span>
            {/* Détacher n'a de sens que sur une tâche qui existe déjà. */}
            {initial && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ evenement: null })}>
                {t("taches.detacherEvenement")}
              </Button>
            )}
          </div>
        </div>
      ) : enLigne ? (
        <div className="space-y-1.5">
          <p className={LABEL}>{t("taches.champs.repetition")}</p>
          <OngletsRail etiquette={t("taches.champs.repetition")} actif={rythme || "aucun"}
            choisir={(id) => setRythme(id === "aucun" ? "" : (id as Rythme))}
            onglets={["aucun", ...RYTHMES].map((r) => ({ id: r, label: t(`taches.rythmeCourt.${r}`) }))} />
          {rythme === "an" && <p className="text-xs text-muted-foreground">{t("taches.anAide")}</p>}
          {rythme === "mois" && (
            <div className="max-w-xs space-y-1 pt-1.5">
              <label htmlFor="tache-rang" className={LABEL}>{t("taches.champs.rang")}</label>
              <select id="tache-rang" className={FIELD} value={String(v.repetition?.rang ?? 1)}
                onChange={(e) => set({ repetition: { rythme: "mois", rang: Number(e.target.value) } })}>
                {["1", "2", "3", "4", "-1"].map((r) => <option key={r} value={r}>{t(`taches.rang.${r}`)}</option>)}
              </select>
            </div>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="tache-repetition" className={LABEL}>{t("taches.champs.repetition")}</label>
          <select id="tache-repetition" className={FIELD} value={rythme} onChange={(e) => setRythme(e.target.value as Rythme | "")}>
            <option value="">{t("taches.rythme.aucun")}</option>
            <option value="semaine">{t("taches.rythme.semaine")}</option>
            <option value="2semaines">{t("taches.rythme.2semaines")}</option>
            <option value="mois">{t("taches.rythme.mois")}</option>
            <option value="an">{t("taches.rythme.an")}</option>
          </select>
          {rythme === "an" && <p className="text-xs text-muted-foreground">{t("taches.anAide")}</p>}
        </div>
        {rythme === "mois" && (
          <div className="space-y-1">
            <label htmlFor="tache-rang" className={LABEL}>{t("taches.champs.rang")}</label>
            <select id="tache-rang" className={FIELD} value={String(v.repetition?.rang ?? 1)}
              onChange={(e) => set({ repetition: { rythme: "mois", rang: Number(e.target.value) } })}>
              {["1", "2", "3", "4", "-1"].map((r) => <option key={r} value={r}>{t(`taches.rang.${r}`)}</option>)}
            </select>
          </div>
        )}
      </div>
      )}
      <div className="space-y-1">
        <label htmlFor="tache-prevenir" className={LABEL}>{t("taches.champs.prevenir")}</label>
        <select id="tache-prevenir" className={FIELD} value={prevenirValue(v.prevenir)} onChange={(e) => set({ prevenir: parsePrevenir(e.target.value) })}>
          <option value="">{t("taches.prevenirPersonne")}</option>
          {TACHE_POLES.filter((p) => p !== pole).map((p) => (
            <option key={p} value={`pole:${p}`}>{t("taches.prevenirPole", { pole: t(`taches.pole.${p}`) })}</option>
          ))}
          {SERVICE_LIEUX.map((s) => (
            <option key={s} value={`regie:${s}`}>{t("taches.prevenirRegie", { service: t(`categories.${s}`, { defaultValue: s }) })}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="tache-lien" className={LABEL}>{t("taches.champs.lien")}</label>
        <Input id="tache-lien" type="url" inputMode="url" value={v.lien} placeholder="https://" onChange={(e) => set({ lien: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label htmlFor="tache-note" className={LABEL}>{t("taches.champs.note")}</label>
        <Input id="tache-note" value={v.note} maxLength={160} onChange={(e) => set({ note: e.target.value })} />
      </div>
      {enLigne ? (
        // Formulaires (R13) : en bas de la carte, à droite, « Annuler » puis le bouton plein.
        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>{t("taches.annuler")}</Button>
          <Button type="submit" className="rounded-full" disabled={busy}>{initial ? t("taches.enregistrer") : t("taches.creer")}</Button>
        </div>
      ) : (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" disabled={busy}>{t("taches.enregistrer")}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>{t("taches.annuler")}</Button>
        {onDelete && (
          <Button type="button" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={remove}>
            {t("taches.supprimer")}
          </Button>
        )}
      </div>
      )}
    </form>
  );
}
