// Réglages des widgets du tableau de bord (lot U6, B5, docs/spec-back-office.md § Widgets) :
// les pastilles de « Réglages du widget » (planche `bo-tableau-de-bord`). Module pur.
// Une clé absente des réglages = le défaut de la table ; les choix actifs se lisent avec
// les mêmes règles que les widgets (`./donnees`), donc ce qu'on voit coché est ce qui s'affiche.
import { grilleDe, GRILLES } from "@/lib/planning/grilles";
import { categoryLabel } from "@/lib/serviceColors";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import type { Reglages, WidgetId } from "@/types/backOffice";
import type { UserProfile } from "@/types/user";
import {
  SERVICES, planningsCasesVides, polesAFaire, raccourcisPermis, servicesDuDimanche, servicesSetlists,
} from "./donnees";

type AuthUser = { uid: string; email?: string | null };

/** Un choix : son nom est un texte tel quel (service, programme) ou une clé de traduction. */
export type ChoixReglage = { valeur: string; texte?: string; i18n?: string; params?: Record<string, unknown> };

export type GroupeReglages = {
  cle: keyof Reglages;
  /** Clé de traduction du titre du groupe (« Services », « Sur », « Afficher »…). */
  titre: string;
  /** Plusieurs choix à la fois (services, pôles…) ou un seul (nombre, horizon…). */
  plusieurs: boolean;
  choix: ChoixReglage[];
  actifs: string[];
};

const T = "tableauDeBord.reglages";
const NUMERIQUES: (keyof Reglages)[] = ["nombre", "horizon"];

const plusieurs = (cle: keyof Reglages, titre: string, choix: ChoixReglage[], actifs: string[]): GroupeReglages =>
  ({ cle, titre: `${T}.${titre}`, plusieurs: true, choix, actifs });
const unSeul = (cle: keyof Reglages, titre: string, choix: ChoixReglage[], actif: string | number): GroupeReglages =>
  ({ cle, titre: `${T}.${titre}`, plusieurs: false, choix, actifs: [String(actif)] });

const services = (liste: string[]) => liste.map((s) => ({ valeur: s, texte: categoryLabel(s) }));
const duree = (unite: "semaines" | "dimanches", n: number[]) =>
  n.map((count) => ({ valeur: String(count), i18n: `${T}.${unite}`, params: { count } }));

/** Les groupes de réglages d'un widget, avec leurs choix permis et ceux qui sont actifs. */
export function groupesDeReglages(
  id: WidgetId, r: Reglages, user: AuthUser | null, profile: UserProfile | null,
  programmes: { id: string; nom: string }[] = [],
): GroupeReglages[] {
  switch (id) {
    case "dimanche":
      return [plusieurs("services", "services", services(SERVICES), servicesDuDimanche(r, user, profile))];
    case "afaire":
      return [plusieurs("poles", "poles",
        polesAFaire({}, user, profile).map((p) => ({ valeur: p, i18n: `taches.pole.${p}` })), polesAFaire(r, user, profile))];
    case "setlists":
      return [
        plusieurs("services", "services", services(servicesSetlists({ services: SERVICES }, user, profile)), servicesSetlists(r, user, profile)),
        unSeul("horizon", "sur", duree("semaines", [2, 4]), r.horizon ?? 4),
      ];
    case "planning":
      return [
        plusieurs("plannings", "plannings",
          planningsCasesVides({ plannings: GRILLES.map((g) => g.key) }, user, profile).map((k) => ({ valeur: k, texte: grilleDe(k)!.label })),
          planningsCasesVides(r, user, profile)),
        unSeul("horizon", "sur", duree("dimanches", [2, 4, 8]), r.horizon ?? 4),
      ];
    case "evenements":
      return [
        unSeul("nombre", "afficher", [3, 5, 10].map((n) => ({ valeur: String(n), texte: String(n) })), r.nombre ?? 3),
        unSeul("section", "section", [{ valeur: "", i18n: `${T}.toutes` }, ...services([...ANNONCE_SECTIONS])], r.section ?? ""),
      ];
    case "petitdej":
      return [unSeul("horizon", "sur", duree("dimanches", [4, 8]), r.horizon ?? 4)];
    case "scene":
      return [unSeul("programme", "programme",
        [{ valeur: "", i18n: `${T}.programmeAffiche` }, ...programmes.map((p) => ({ valeur: p.id, texte: p.nom }))], r.programme ?? "")];
    case "chants":
      // Lot U7, S5 : la période du widget (12 mois par défaut, comme la page Statistiques).
      return [unSeul("periode", "periode", [
        ...[3, 6, 12].map((count) => ({ valeur: `${count}m`, i18n: `${T}.mois`, params: { count } })),
        { valeur: "tout", i18n: `${T}.depuisLeDebut` },
      ], r.periode ?? "12m")];
    case "comptes":
      return [unSeul("liste", "liste",
        [{ valeur: "sansCompte", i18n: `${T}.sansCompte` }, { valeur: "nouveaux", i18n: `${T}.nouveaux` }], r.liste ?? "sansCompte")];
    case "raccourcis":
      return [plusieurs("raccourcis", "raccourcis",
        raccourcisPermis(user, profile, {}).map((x) => ({ valeur: x.id, i18n: `tableauDeBord.raccourcis.${x.id}` })),
        raccourcisPermis(user, profile, r).map((x) => x.id))];
    default:
      // Calendrier (U8) apporte ses réglages avec son lot.
      return [];
  }
}

/**
 * Toucher une pastille. Plusieurs choix : cocher ou décocher, dans l'ordre des choix ; le
 * dernier ne se décoche pas (un widget sans source n'aurait rien à montrer). Un seul choix :
 * le prendre ; « » (Toutes, Celui qui est affiché) retire la clé, donc revient au défaut.
 */
export function choisirReglage(r: Reglages, g: GroupeReglages, valeur: string): Reglages {
  if (g.plusieurs) {
    const actifs = g.actifs.includes(valeur) ? g.actifs.filter((v) => v !== valeur) : [...g.actifs, valeur];
    if (actifs.length === 0) return r;
    return { ...r, [g.cle]: g.choix.map((c) => c.valeur).filter((v) => actifs.includes(v)) };
  }
  if (valeur === "") {
    const reste = { ...r };
    delete reste[g.cle];
    return reste;
  }
  return { ...r, [g.cle]: NUMERIQUES.includes(g.cle) ? Number(valeur) : valeur };
}
