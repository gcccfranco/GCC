import { useTranslation } from "react-i18next";
import { Menu, type EntreeMenu, type OptionMenu } from "@/components/ui/menu";
import type { Lecture } from "@/lib/partition/lecture";

/** « Je lis : … ▾ » (docs/spec-ma-partition.md, « Lecture ») : quelle partition se lit pour ce chant. Sans choix
 *  (une seule entrée), rien. Les anciennes « Ma version » de la setlist ont leur petit groupe, jusqu'à MP-6. */
export function MenuJeLis({ lecture, onChoisir }: { lecture: Lecture; onChoisir: (valeur: string) => void }) {
  const { t } = useTranslation();
  if (lecture.options.length < 2) return null;
  const libelle = (o: Lecture["options"][number]) =>
    o.type === "mienne" ? t("maPartition.mienne")
    : o.type === "culte" ? t("maPartition.culte")
    : o.type === "origine" ? t("maPartition.origine")
    : o.type === "partagee" ? t("maPartition.partageePar", { nom: o.nom || t("maPartition.quelquUn") })
    : o.nom ? t("maPartition.versionDe", { nom: o.nom }) : t("maPartition.maVersion");
  const en = (anciennes: boolean): OptionMenu[] =>
    lecture.options.filter((o) => (o.type === "ancienne") === anciennes).map((o) => ({ valeur: o.valeur, libelle: libelle(o) }));
  const entrees: EntreeMenu[] = lecture.options.some((o) => o.type === "ancienne")
    ? [{ groupe: "", options: en(false) }, { groupe: t("maPartition.dansLaSetlist"), options: en(true) }]
    : en(false);
  return (
    <Menu
      label={t("maPartition.jeLis")}
      value={lecture.valeur}
      defaultValue={lecture.valeur}
      onChange={onChoisir}
      className="print:hidden"
      prefixe={<span className="font-normal text-muted-foreground">{t("maPartition.jeLis")} :</span>}
      options={entrees}
    />
  );
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
