# Tâches : version perso d'un chant (docs/spec-version-perso.md)

## V1 — Ma version : accords et paroles
- [x] T1 Test `tests/setlist-version.spec.ts` (5 tests × 3 appareils), vu en échec
- [x] T2 `src/lib/firebase/setlistVersions.ts` : lecture (runQuery) + écriture (PATCH) ; `firestore.rules` + `access.ts`
- [x] T3 Page setlist : chargement, items affichés, bouton « Ma version », handlers par scope, « Revenir à la présidence » ; badge dans `PartitionView.tsx` ; locales FR + 中文
- [x] T4 Vert sur 3 appareils ; `npx tsc --noEmit` ; `npm run lint` ; captures regardées

## Point d'étape V1 : validation locale de Timothée

## V2 — Ma structure
- [x] T5 Test (structure perso : corps, bandeau inchangé, sommaire, « Structure seule », mode louange), vu en échec
- [x] T6 Feuille « Sections » (`SectionStructureEditor`), items affichés avec `structureOverride` perso, notes d'occurrence retirées du corps
- [x] T7 Vert 3 appareils, tsc, lint, captures

## V3 — Partage et sélecteur
- [x] T8 Test (second compte, « Version de Ruth K. », choix persistant, retrait du partage), vu en échec
- [x] T9 Interrupteur « Partager ma version », sélecteur « Présidence · Moi · … », `choices`
- [x] T10 Vert 3 appareils, tsc, lint, captures ; docs (spec « Avancement », feuille de route, vision)
