// Lecture du comptage d'usage (docs/spec-comptage-usage.md, T4) : les documents `usage/{AAAA-MM}` sont lus en REST
// (un GET par mois), puis `calculerLignes` (pure) en tire le tableau. Format écrit par `usage.ts` : un champ par clé du
// registre, `{ n, j, d: {…} }`.
import { CLES_USAGE } from "@/lib/usageCles";
import { FS_BASE, authHeader, fromFsValue, type RawDoc } from "@/lib/firebase/setlists";

type Compte = { n?: number; j?: number };
export type MoisUsage = Record<string, Compte | undefined>;

/** Clés rares par nature, jamais candidates au retrait, affichées à part (spec : corbeille restaurer/supprimer,
 *  signaler un problème, publier un planning, admin et comptes, questionnaire, notifier, création d'évènement). */
export const CLES_EXCEPTIONS: readonly string[] = [
  "cmd.setlist.corbeille.restaurer",
  "cmd.setlist.corbeille.supprimer",
  "cmd.chant.signaler",
  "cmd.planning.publier",
  "ecran.admin", "ecran.login", "ecran.signup", // admin et comptes
  "cmd.questionnaire.envoyer", "ecran.questionnaire", "ecran.back-office/messages/questionnaire",
  "cmd.notifier.envoyer", "ecran.notifier", "ecran.back-office/messages/notifier",
  "cmd.evenement.creer", "ecran.evenements/nouveau", "ecran.back-office/evenements/nouveau",
];

export type LigneUsage = { cle: string; libelle: string; j: number; n: number; part: number; parMois: number; candidate: boolean; exception: boolean };

/** Les `nombre` derniers mois « AAAA-MM », le mois courant compris, du plus ancien au plus récent. */
export function derniersMois(nombre: number, depuis = new Date()): string[] {
  return Array.from({ length: nombre }, (_, i) => {
    const d = new Date(depuis.getFullYear(), depuis.getMonth() - (nombre - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

/** Un mois lu ; document absent (404) = mois vide (`null`). */
async function lireMois(mois: string): Promise<MoisUsage | null> {
  const res = await fetch(`${FS_BASE}/usage/${mois}`, { headers: await authHeader() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Erreur Firestore (HTTP ${res.status})`);
  const raw = (await res.json()) as RawDoc;
  return Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v) as Compte])) as MoisUsage;
}

export const lireUsage = (mois: string[]) => Promise.all(mois.map(lireMois));

/** Une ligne par clé du registre sauf `_actif`, de la moins à la plus utilisée (j, n, clé). Seuil : part de `_actif.j` sous 1 %
 *  ET moins de 4 jours-appareils par mois (aucune candidate sans donnée : total nul) ; la moyenne se fait sur les mois qui ont un document (au moins 1). */
export function calculerLignes(mois: (MoisUsage | null)[]): { total: number; moisLus: number; lignes: LigneUsage[] } {
  const lus = mois.filter((m): m is MoisUsage => !!m);
  const somme = (cle: string, champ: "j" | "n") => lus.reduce((s, m) => s + (m[cle]?.[champ] ?? 0), 0);
  const total = somme("_actif", "j");
  const lignes = Object.entries(CLES_USAGE)
    .filter(([cle]) => cle !== "_actif")
    .map(([cle, libelle]) => {
      const j = somme(cle, "j");
      const part = total > 0 ? j / total : 0;
      const parMois = j / Math.max(1, lus.length);
      const exception = CLES_EXCEPTIONS.includes(cle);
      return { cle, libelle, j, n: somme(cle, "n"), part, parMois, exception, candidate: total > 0 && !exception && part < 0.01 && parMois < 4 };
    })
    .sort((a, b) => a.j - b.j || a.n - b.n || a.cle.localeCompare(b.cle));
  return { total, moisLus: lus.length, lignes };
}
