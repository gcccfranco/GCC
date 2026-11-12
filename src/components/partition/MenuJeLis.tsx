import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Menu, type EntreeMenu, type OptionMenu } from "@/components/ui/menu";
import { PartagerMaPartition, type PartageProps } from "@/components/partition/PartagerMaPartition";
import { aDesRetouches } from "@/lib/jianpu/retouches";
import type { PartitionDeChant } from "@/lib/firebase/partitions";
import type { Lecture, OptionLecture } from "@/lib/partition/lecture";
import type { TFunction } from "i18next";
import { compter } from "@/lib/usage";

const PARTAGER = "__partager";

/** Le libellé d'un choix « Je lis » (aussi la rubrique « Partition » de « Je joue »). */
export function libelleLecture(t: TFunction, o: OptionLecture): string {
  return o.type === "mienne" ? t("maPartition.mienne")
    : o.type === "culte" ? t("maPartition.culte")
    : o.type === "origine" ? t("maPartition.origine")
    : o.type === "partagee" ? t("maPartition.partageePar", { nom: o.nom || t("maPartition.quelquUn") })
    : o.nom ? t("maPartition.versionDe", { nom: o.nom }) : t("maPartition.maVersion");
}

/** « Je lis : … ▾ » (docs/spec-ma-partition.md, « Lecture ») : quelle partition se lit pour ce chant. Sans choix
 *  (une seule entrée), rien. Les anciennes « Ma version » de la setlist ont leur petit groupe, jusqu'à MP-6. */
export function MenuJeLis({ lecture, onChoisir, partage }: { lecture: Lecture; onChoisir: (valeur: string) => void; partage?: PartageProps }) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  if (lecture.options.length < 2) return null;
  const libelle = (o: OptionLecture) => libelleLecture(t, o);
  const en = (anciennes: boolean): OptionMenu[] =>
    lecture.options.filter((o) => (o.type === "ancienne") === anciennes).map((o) => ({ valeur: o.valeur, libelle: libelle(o) }));
  const entrees: EntreeMenu[] = lecture.options.some((o) => o.type === "ancienne")
    ? [{ groupe: "", options: en(false) }, { groupe: t("maPartition.dansLaSetlist"), options: en(true) }]
    : en(false);
  // Rien à partager sans partition à moi pour ce chant : l'entrée n'est offerte que si j'en ai une.
  if (partage && lecture.options.some((o) => o.type === "mienne")) {
    entrees.push({ groupe: "", options: [{ valeur: PARTAGER, libelle: t("maPartition.partage.entree") }] });
  }
  const menu = (
    <Menu
      label={t("maPartition.jeLis")}
      value={lecture.valeur}
      defaultValue={lecture.valeur}
      onChange={(v) => {
        if (v !== PARTAGER) return onChoisir(v);
        compter("cmd.chant.partagerPartition");
        // Après la fermeture du menu, qui rend le focus à son déclencheur : le popover ne s'y ferait pas dessus.
        setTimeout(() => setOuvert(true), 0);
      }}
      className="print:hidden"
      prefixe={<span className="font-normal text-muted-foreground">{t("maPartition.jeLis")} :</span>}
      options={entrees}
    />
  );
  return partage ? <PartagerMaPartition ouvert={ouvert} onOpenChange={setOuvert} {...partage}>{menu}</PartagerMaPartition> : menu;
}

/** « Ma partition · retouchée le 2 nov. · En attente » : graphite, quand je lis la mienne. « Enregistré » ne se dit pas en lecture. */
export function LigneMaPartition({ date, enAttente }: { date?: Date | string; enAttente: boolean }) {
  const { t, i18n } = useTranslation();
  const d = date ? new Date(date) : null;
  const court = d && !Number.isNaN(d.getTime())
    ? new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short" }).format(d)
    : null;
  return (
    <p data-ma-partition-ligne className="text-xs print:hidden" style={{ color: "var(--graphite)" }}>
      {court ? t("maPartition.retouchee", { date: court }) : t("maPartition.retoucheeSansDate")}
      {enAttente && t("maPartition.enAttente")}
    </p>
  );
}

/** « Partition de Noa · Garder une copie » : graphite, quand je lis une partition partagée. Si j'en ai déjà une
 *  retouchée, la copie la remplace : confirmation. */
export function LignePartagee({ nom, mienne, onGarder }: { nom?: string; mienne: PartitionDeChant | null; onGarder: () => void }) {
  const { t } = useTranslation();
  const [confirmer, setConfirmer] = useState(false);
  const retouchee = !!mienne && (mienne.content !== null || mienne.structure !== null || mienne.traits.length > 0 || aDesRetouches(mienne.jianpuChords));
  return (
    <p data-partitions-partagee-ligne className="flex items-center gap-1 text-xs print:hidden" style={{ color: "var(--graphite)" }}>
      {t("maPartition.partageePar", { nom: nom || t("maPartition.quelquUn") })} ·
      <button type="button" onClick={() => (retouchee ? setConfirmer(true) : onGarder())} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
        {t("maPartition.partage.garderCopie")}
      </button>
      <AlertDialog open={confirmer} onOpenChange={setConfirmer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("maPartition.partage.remplacerTitre")}</AlertDialogTitle>
            <AlertDialogDescription>{t("maPartition.partage.remplacerTexte")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onGarder}>{t("maPartition.partage.garderCopie")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </p>
  );
}
