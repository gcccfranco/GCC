// À importer AVANT tout module REST de src/lib/firebase : `firebase/auth` refuse de
// s'initialiser sans clé d'API (absente hors de Next). Une clé factice suffit : aucun
// jeton n'est demandé (`auth.currentUser` reste vide) et le test remplace `fetch`.
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= "cle-de-test";
