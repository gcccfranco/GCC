"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { SERVICE_LIEUX, type UserProfile } from "@/types/user";
import { TACHE_POLES, type Prevenir, type Rythme, type TachePole } from "@/types/tache";
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

/** Feuille de création ou de modification d'une tâche (lot 7). */
export function TacheForm({ open, pole, initial, membres, onSubmit, onDelete, onClose }: {
  open: boolean;
  pole: TachePole;
  /** Valeurs de départ ; `null` = nouvelle tâche. */
  initial: TacheValues | null;
  /** Membres du pôle, proposés comme responsables. */
  membres: UserProfile[];
  onSubmit: (values: TacheValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  useStandaloneScrollLock(open);
  const { t } = useTranslation();
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh] md:max-w-lg md:mx-auto" aria-describedby={undefined}>
        <DrawerHeader className="pb-1">
          <DrawerTitle>{initial ? t("taches.modifier") : t("taches.nouvelle")}</DrawerTitle>
        </DrawerHeader>
        {open && (
          <Champs pole={pole} initial={initial} membres={membres} onSubmit={onSubmit} onDelete={onDelete} onClose={onClose} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Champs({ pole, initial, membres, onSubmit, onDelete, onClose }: Omit<Parameters<typeof TacheForm>[0], "open">) {
  const { t } = useTranslation();
  const [v, setV] = useState<TacheValues>(
    initial ?? {
      titre: "", responsableUid: null, responsableNom: "", echeance: "", repetition: null,
      lien: "", note: "", prevenir: null,
    },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<TacheValues>) => setV((x) => ({ ...x, ...patch }));
  const rythme = v.repetition?.rythme ?? "";

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
      await onSubmit({ ...v, titre: v.titre.trim(), lien: v.lien.trim(), note: v.note.trim() });
    } catch {
      setError(t("taches.erreur"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!onDelete || !window.confirm(t("taches.confirmerSuppression"))) return;
    setBusy(true);
    try {
      await onDelete();
    } catch {
      setError(t("taches.erreur"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-4 pb-6 space-y-4 overflow-y-auto">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
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
            {membres.map((m) => <option key={m.uid} value={m.uid}>{`${m.firstName} ${m.lastName}`.trim() || m.email}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="tache-repetition" className={LABEL}>{t("taches.champs.repetition")}</label>
          <select id="tache-repetition" className={FIELD} value={rythme} onChange={(e) => setRythme(e.target.value as Rythme | "")}>
            <option value="">{t("taches.rythme.aucun")}</option>
            <option value="semaine">{t("taches.rythme.semaine")}</option>
            <option value="2semaines">{t("taches.rythme.2semaines")}</option>
            <option value="mois">{t("taches.rythme.mois")}</option>
          </select>
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
      <div className="space-y-1">
        <label htmlFor="tache-prevenir" className={LABEL}>{t("taches.champs.prevenir")}</label>
        <select id="tache-prevenir" className={FIELD} value={prevenirValue(v.prevenir)} onChange={(e) => set({ prevenir: parsePrevenir(e.target.value) })}>
          <option value="">{t("taches.prevenirPersonne")}</option>
          {TACHE_POLES.filter((p) => p !== pole).map((p) => (
            <option key={p} value={`pole:${p}`}>{t("taches.prevenirPole", { pole: t(`taches.pole.${p}`) })}</option>
          ))}
          {SERVICE_LIEUX.map((s) => (
            <option key={s} value={`regie:${s}`}>{t("taches.prevenirRegie", { service: s })}</option>
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
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" disabled={busy}>{t("taches.enregistrer")}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>{t("taches.annuler")}</Button>
        {onDelete && (
          <Button type="button" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={remove}>
            {t("taches.supprimer")}
          </Button>
        )}
      </div>
    </form>
  );
}
