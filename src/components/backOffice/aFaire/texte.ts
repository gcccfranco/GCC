// Le texte d'une ligne de « À faire » (BO-B) : les données de `lib/tableauDeBord/aFaire` mises en mots,
// dans la langue de la page. Les lignes ne portent que des données ; le français tutoyé et le 中文 sont ici.
import type { TFunction } from "i18next";
import { cleNomEquipe } from "@/lib/equipes/table";
import { GRILLES, grilleDe } from "@/lib/planning/grilles";
import type { LigneAFaire } from "@/lib/tableauDeBord/aFaire";

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");
const date = (iso: string) => new Date(`${iso}T12:00:00`);

/** En français, le premier du mois s'écrit « 1er ». */
const premier = (s: string, lang: string) => (lang === "zh-CN" ? s : s.replace(/(^|\s)1 /, (_, a: string) => `${a}1er `));
/** « 25 octobre », « 1er novembre » */
export const jourLong = (iso: string, lang: string) =>
  premier(new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long" }).format(date(iso)), lang);
/** « Samedi 24 octobre » */
export const jourComplet = (iso: string, lang: string) => {
  const s = premier(new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long" }).format(date(iso)), lang);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/** « 28/10 » */
export const jourMois = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Le nom court d'un planning : son libellé, ou (en 中文, quand il est seul à le porter) le titre traduit de sa page. */
export function nomPlanning(cle: string, t: TFunction, lang: string): string {
  const def = grilleDe(cle);
  if (!def) return cle;
  const seul = GRILLES.filter((g) => g.i18nTitre === def.i18nTitre).length === 1;
  return lang === "zh-CN" && seul ? t(def.i18nTitre) : def.label;
}

export type TexteLigne = {
  titre: string;
  /** La ligne de contexte ; `retard` = la date de la tâche, à mettre en rouge. */
  contexte: string;
  retard?: string;
  verbe: string;
};

export function texteLigne(l: LigneAFaire, t: TFunction, lang: string, today: string): TexteLigne {
  const verbe = t(`backOffice.aFaire.verbe.${l.verbe}`);
  const p = "backOffice.aFaire.";
  switch (l.sorte) {
    case "cases": {
      const colonnes = (l.colonnes ?? []).map((c) => `${t(c.i18n)}${c.n && c.n > 1 ? ` ×${c.n}` : ""}`).join(", ");
      const titre = t(`${p}cases.titre`, { planning: nomPlanning(l.planning ?? "", t, lang), colonnes });
      const d = jourLong(l.date ?? "", lang);
      // `relancer` n'est posé que sur les cases du prochain dimanche.
      const contexte = l.relancer === undefined ? t(`${p}cases.plusTard`, { date: d })
        : l.relancer.length > 0 ? t(`${p}cases.semaine`, { date: d, noms: l.relancer.join(", ") })
        : t(`${p}cases.semaineSansReferent`, { date: d });
      return { titre, contexte, verbe };
    }
    case "tache": {
      const qui = l.aMoi ? t(`${p}tache.aToi`) : t(cleNomEquipe(l.equipe ?? "", true));
      const enRetard = (l.date ?? today) < today;
      return {
        titre: l.titre ?? "", verbe,
        contexte: `${qui} · `,
        retard: t(`${p}tache.${enRetard ? "enRetard" : "pour"}`, { date: jourMois(l.date ?? today) }),
      };
    }
    case "inscriptions": {
      const e = l.inscriptions;
      const contexte = e?.cas === "places" ? t(`${p}inscriptions.places`, { inscrits: e.inscrits, max: e.max })
        : e?.cas === "sansLimite" ? t(`${p}inscriptions.sansLimite`, { count: e.inscrits }) : "";
      return { titre: t(`${p}inscriptions.titre`, { titre: l.titre }), contexte, verbe };
    }
    case "scene":
      return {
        titre: t(`${p}scene.titre`, { titre: l.titre }), verbe,
        contexte: t(`${p}scene.contexte`, { count: l.nombre ?? 0, date: jourLong(l.date ?? today, lang) }),
      };
    case "compteRendu":
      return {
        titre: t(`${p}compteRendu.titre`, { titre: l.titre }), verbe,
        contexte: t(`${p}compteRendu.contexte`, { date: jourLong(l.date ?? today, lang) }),
      };
    case "messages":
      return {
        titre: t(`${p}messages.titre`), verbe,
        contexte: [
          (l.signalements ?? 0) > 0 && t(`${p}messages.signalements`, { count: l.signalements }),
          (l.propositions ?? 0) > 0 && t(`${p}messages.propositions`, { count: l.propositions }),
        ].filter(Boolean).join(" · "),
      };
    case "comptes":
      return { titre: t(`${p}comptes.titre`), contexte: t(`${p}comptes.contexte`, { count: l.nombre ?? 0 }), verbe };
  }
}
