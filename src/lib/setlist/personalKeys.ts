// Tonalité choisie sur la page d'un chant ouverte depuis une setlist : retenue
// pour ce chant dans cette setlist, sur cet appareil seulement — la setlist
// enregistrée et les autres appareils ne changent pas. Le mode louange joue le
// chant dans cette tonalité, avec un repère et un retour possible
// (docs/spec-mode-louange.md).
const KEY = "perf-personal-keys"; // { [setlistId]: { [songSlug]: tonalité } }

type Store = Record<string, Record<string, string>>;

function read(): Store {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return typeof raw === "object" && raw !== null ? (raw as Store) : {};
  } catch {
    return {};
  }
}

/** Tonalités choisies pour les chants d'une setlist (slug → tonalité). */
export function getPersonalKeys(setlistId: string): Record<string, string> {
  return read()[setlistId] ?? {};
}

/** Retient `key` pour ce chant, ou l'oublie (`null` : retour à la tonalité de la setlist). */
export function setPersonalKey(setlistId: string, songSlug: string, key: string | null) {
  const store = read();
  const keys = { ...store[setlistId] };
  if (key) keys[songSlug] = key;
  else delete keys[songSlug];
  if (Object.keys(keys).length > 0) store[setlistId] = keys;
  else delete store[setlistId];
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* stockage indisponible */ }
}
