# Plan de réalisation : version perso d'un chant dans une setlist

Spec : `docs/spec-version-perso.md` (go de Timothée le 14/09/2026, soir).
Tâches : `tasks/todo.md`. Un commit par lot, sur demande.

## Décisions d'architecture

- **Un point de substitution** : toutes les vues passent par `itemAst(item)` +
  `resolveStructureOverride(item.structureOverride)`. La page setlist calcule
  des items « affichés » (`contentOverride` ← ma version, `structureOverride`
  ← ma structure en V2) et les donne à la vue partitions, au sommaire et au
  mode louange. Liste, PDF, historique et éditeur gardent `setlist.items`.
- **Un document par personne et par setlist** (`setlists/{id}/versions/{uid}`),
  lu en une requête, réécrit en entier à chaque changement
  (`src/lib/firebase/setlistVersions.ts`, patron de `setlistHistory.ts`).
- **Mêmes gestes qu'Adapter** : la feuille d'édition de ligne et ses
  handlers sont réutilisés ; seul le « scope » change (setlist ou ma version).
  En V1, pas de copie d'occurrence pour ma version (hypothèse 3 confirmée).
- **Permissions en double** : `firestore.rules` (versions/{uid}) et
  `src/lib/access.ts` (`canHaveSetlistVersion` = `canSeeSetlist`).

## Ordre

V1 accords et paroles → V2 structure → V3 partage et sélecteur. Chaque lot :
test Playwright écrit d'abord (3 appareils, 1 FR + 1 ZH), vu en échec, puis
vert ; `npx tsc --noEmit`, `npm run lint` ; captures regardées.

## Risques

| Risque | Impact | Parade |
| --- | --- | --- |
| Règles Firestore pas publiées à la mise en ligne | l'enregistrement échoue | message d'erreur d'Adapter réutilisé ; la page reste utilisable |
| Section de la présidence absente de ma version (copie ajoutée après) | étape ignorée dans mon corps | hypothèse 4 de la spec, sélecteur « Présidence » en V3 |
| Mode louange mesure une copie invisible | ma version doit passer par `items` | items affichés donnés à `PerformanceMode` |
