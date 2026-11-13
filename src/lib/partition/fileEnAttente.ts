import { enregistrerPartition, idPartition, type ErreurEcriture, type PartitionDeChant } from "@/lib/firebase/partitions";

// File d'attente locale des partitions (docs/spec-ma-partition.md, « Enregistrement fiable », absorbe AN-1).
//
// Une écriture qui échoue par le réseau ou par un 5xx garde la dernière version du document dans localStorage,
// par compte (`gcc-partitions-en-attente:{uid}`, une entrée par id de document : la plus récente gagne) ; elle est
// rejouée au retour du réseau et au chargement. Un refus (403, 4xx hors 408 et 429) n'est pas mis en file : il remonte
// à l'appelant ; rencontré au rejeu, il retire l'entrée (elle ne passera jamais). Les écritures d'un compte passent
// l'une après l'autre (`chaine`) : un rejeu lent ne peut pas arriver après une version plus récente et l'écraser.
// La file est effacée à la déconnexion et au changement de compte (`effacerToutesLesCopies`,
// src/lib/setlist/copieHorsLigne.ts). Le site marche sans stockage : toute erreur de stockage est avalée.

import { PREFIXE_FILE } from "@/lib/setlist/copieHorsLigne";

export { PREFIXE_FILE };

type File = Record<string, PartitionDeChant>;

const cle = (uid: string) => PREFIXE_FILE + uid;

function lireFile(uid: string): File {
  try {
    const brut = localStorage.getItem(cle(uid));
    const f = brut ? (JSON.parse(brut) as unknown) : null;
    return f && typeof f === "object" && !Array.isArray(f) ? (f as File) : {};
  } catch {
    return {};
  }
}

function ecrireFile(uid: string, file: File): void {
  try {
    if (Object.keys(file).length) localStorage.setItem(cle(uid), JSON.stringify(file));
    else localStorage.removeItem(cle(uid));
  } catch { /* pas de stockage */ }
}

/** Échec passager (réseau, délai, limitation de débit, 5xx) : à garder en file. Un autre 4xx est un refus. */
function passager(e: unknown): boolean {
  const status = (e as ErreurEcriture).status;
  return status === undefined || status >= 500 || status === 408 || status === 429;
}

// Une chaîne de promesses par compte : enregistrements et rejeux d'un même compte ne se chevauchent jamais.
const chaine = new Map<string, Promise<unknown>>();
function aLaSuite<T>(uid: string, f: () => Promise<T>): Promise<T> {
  const suite = (chaine.get(uid) ?? Promise.resolve()).catch(() => {}).then(f);
  chaine.set(uid, suite.catch(() => {}));
  return suite;
}

/** Enregistre la partition ; sur un échec passager, la garde en file et rend `"en-attente"`. Un refus LÈVE. */
export function enregistrerOuMettreEnFile(p: PartitionDeChant): Promise<"enregistre" | "en-attente"> {
  return aLaSuite(p.ownerUid, async () => {
    const id = idPartition(p.ownerUid, p.slug);
    try {
      await enregistrerPartition(p);
    } catch (e) {
      if (!passager(e)) throw e;
      const file = lireFile(p.ownerUid);
      file[id] = p;
      ecrireFile(p.ownerUid, file);
      return "en-attente" as const;
    }
    // Écrite pour de bon : une version plus ancienne restée en file ne doit pas la réécraser au prochain rejeu.
    const file = lireFile(p.ownerUid);
    if (id in file) {
      delete file[id];
      ecrireFile(p.ownerUid, file);
    }
    return "enregistre" as const;
  });
}

/** Réessaie chaque entrée de la file de ce compte ; retire celles qui passent et celles qui sont refusées. Ne lève
 *  jamais. */
export function rejouerFile(uid: string): Promise<void> {
  return aLaSuite(uid, async () => {
    for (const [id, p] of Object.entries(lireFile(uid))) {
      try {
        await enregistrerPartition(p);
      } catch (e) {
        if (passager(e)) continue;
      }
      const file = lireFile(uid);
      delete file[id];
      ecrireFile(uid, file);
    }
  });
}
/** Rejeu automatique : tout de suite (chargement) et à chaque évènement `online`. Rend le désabonnement. */
export function suivreLaFile(uid: string): () => void {
  const rejouer = () => { void rejouerFile(uid); };
  rejouer();
  window.addEventListener("online", rejouer);
  return () => window.removeEventListener("online", rejouer);
}

/** Pour l'indicateur « Enregistré » / « En attente ». */
export function etatEnregistrement(uid: string): { etat: "enregistre" | "en-attente"; enAttente: number } {
  const enAttente = Object.keys(lireFile(uid)).length;
  return { etat: enAttente ? "en-attente" : "enregistre", enAttente };
}
