// Mode d'affichage de la vue partitions d'une setlist (coup d'œil) — par compte
// (localStorage `partition-layout-<uid>`), par appareil hors connexion (`partition-layout`).
// Reprise : un compte sans réglage propre lit la clé d'appareil si personne n'a encore pris la
// marque de migration, ou si c'est lui (premier compte de l'appareil, comme le rôle).
// « Ordre joué » par défaut (décision de Timothée du
// 20/09/2026 : les paroles suivent la structure, reprises comprises) ;
// « Structure seule » si le rôle du compte (mode louange) est Batteur et
// qu'aucun choix n'a été fait ici (lecture seule : seule l'ouverture du mode louange migre le rôle d'appareil). Voir docs/spec-coup-d-oeil.md.
import { getRoleSansMigrer, porteurMarque } from "@/lib/performance/roleCompte";

export type PartitionLayout = "played" | "unique" | "structure";

const KEY = "partition-layout";
const cle = (uid: string | null) => (uid ? `${KEY}-${uid}` : KEY);
const valide = (v: string | null): v is PartitionLayout => v === "played" || v === "unique" || v === "structure";

export function getPartitionLayoutPref(uid: string | null): PartitionLayout {
  try {
    const duCompte = localStorage.getItem(cle(uid));
    if (valide(duCompte)) return duCompte;
    if (uid) {
      const marque = porteurMarque();
      const appareil = marque === null || marque === uid ? localStorage.getItem(KEY) : null;
      if (valide(appareil)) return appareil;
    }
    return getRoleSansMigrer(uid) === "batteur" ? "structure" : "played";
  } catch {
    return "played";
  }
}

export function setPartitionLayoutPref(uid: string | null, v: PartitionLayout) {
  try { localStorage.setItem(cle(uid), v); } catch { /* ignore */ }
}
