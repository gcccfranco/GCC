// Rôle du mode louange (« Je joue ») — par compte, sur cet appareil (localStorage ; rien dans Firestore).
// Connecté : `perf-role-preset-<uid>` / `perf-role-asked-<uid>` ; hors connexion (uid null) : les clés d'appareil
// `perf-role-preset` / `perf-role-asked`, inchangées. Migration : à la première lecture par un compte, le rôle
// d'appareil existant est recopié vers ce compte et la marque `perf-role-migre` (= son uid) est posée ; un autre
// compte du même appareil n'hérite de rien. Les clés d'appareil ne sont pas effacées (elles servent hors connexion).
// Stockage en try/catch : indisponible = aucun rôle, question reposée.
export const ROLE_IDS = ["pianiste", "guitariste", "presidence", "choriste", "batteur"] as const;
export type RolePreset = (typeof ROLE_IDS)[number];

const PRESET = "perf-role-preset";
const ASKED = "perf-role-asked";
const MARQUE = "perf-role-migre";
// Couleur des icônes (couleurIcones.ts) : même marque, même premier compte.
const ICONES = "perf-couleur-icones";

const clePreset = (uid: string | null) => (uid ? `${PRESET}-${uid}` : PRESET);
const cleAsked = (uid: string | null) => (uid ? `${ASKED}-${uid}` : ASKED);

/** Compte qui a pris la marque de migration sur cet appareil, ou null. */
export function porteurMarque(): string | null {
  try { return localStorage.getItem(MARQUE); } catch { return null; }
}

/** Le compte est celui qui a hérité des réglages d'appareil (marque = son uid). */
export function estPremierCompte(uid: string | null): boolean {
  return uid !== null && porteurMarque() === uid;
}

/** Première lecture d'un compte : recopie les clés d'appareil si la marque est absente, puis la pose. */
function migrer(uid: string | null) {
  if (!uid) return;
  try {
    if (localStorage.getItem(MARQUE) !== null) return;
    for (const [appareil, compte] of [[PRESET, clePreset(uid)], [ASKED, cleAsked(uid)], [ICONES, `${ICONES}-${uid}`]] as const) {
      const v = localStorage.getItem(appareil);
      if (v !== null && localStorage.getItem(compte) === null) localStorage.setItem(compte, v);
    }
    localStorage.setItem(MARQUE, uid);
  } catch { /* stockage indisponible */ }
}

/** Rôle mémorisé pour ce compte (ou cet appareil si uid null), ou null. */
export function getRole(uid: string | null): RolePreset | null {
  migrer(uid);
  try {
    const v = localStorage.getItem(clePreset(uid));
    return v && (ROLE_IDS as readonly string[]).includes(v) ? (v as RolePreset) : null;
  } catch {
    return null;
  }
}

/** Lecture seule du rôle d'un compte : comme `getRole`, mais sans poser la marque ni recopier (la migration ne se fait qu'à
 *  l'ouverture du mode louange). Un compte sans marque lit la clé d'appareil seulement si personne ne l'a encore reprise. */
export function getRoleSansMigrer(uid: string | null): RolePreset | null {
  try {
    const valide = (v: string | null) => (v && (ROLE_IDS as readonly string[]).includes(v) ? (v as RolePreset) : null);
    const duCompte = valide(localStorage.getItem(clePreset(uid)));
    if (duCompte || !uid) return duCompte;
    return porteurMarque() === null ? valide(localStorage.getItem(PRESET)) : null;
  } catch {
    return null;
  }
}

/** La question du rôle a déjà reçu une réponse (un rôle, ou « Aucun »). */
export function roleDemande(uid: string | null): boolean {
  migrer(uid);
  try {
    return localStorage.getItem(clePreset(uid)) !== null || localStorage.getItem(cleAsked(uid)) !== null;
  } catch {
    return true;
  }
}

/** Choisir un rôle ou le retirer (null) vaut réponse : la question n'est plus reposée. */
export function setRole(uid: string | null, id: RolePreset | null) {
  migrer(uid);
  try {
    if (id) localStorage.setItem(clePreset(uid), id);
    else localStorage.removeItem(clePreset(uid));
    localStorage.setItem(cleAsked(uid), "1");
  } catch { /* stockage indisponible */ }
}
