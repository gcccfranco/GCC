# Spec — nettoyer et simplifier le code (sans changement visible)

**Origine** : Timothée, 31/10/2026 — « le code est très brouillon, il y a beaucoup de choses qu'on peut simplifier,
nettoyer ». Outils externes autorisés le même jour pour un usage ponctuel (`npx knip`, `npx jscpd`, `npx madge`),
sans rien ajouter au dépôt.
**Statut** : spec écrite, **aucun lot n'a de go**. Questions à trancher au § 4.
**Mesuré sur** : commit `f8510da` (= `main` au 31/10/2026). Une autre session pousse en parallèle : chaque lot
**refait les mesures** sur la branche à jour avant de coder (§ 5).

---

## 1. Ce qu'on a mesuré

| Mesure | Outil | Résultat |
| --- | --- | --- |
| Taille | `wc` | 619 fichiers dans `src/`, ~86 600 lignes |
| Copier-coller (≥ 12 lignes) | jscpd 4 | **0,4 %** du code : 410 lignes, 18 clones |
| Code inutilisé | knip 5 | 20 fichiers, 3 dépendances, 130 exports, 87 types exportés, 2 alias en double |
| Imports circulaires | madge 8 | 13 cycles, dont 10 par `import type` seulement (sans effet au chargement), 3 réels |
| Fonctions géantes | ESLint `max-lines-per-function` 300 | 16 fonctions ; `complexity` > 30 : 44 |

Fonctions les plus longues : `SetlistDetailClient.tsx` 1 958 lignes, `PerformanceMode.tsx` 1 498, `PlanningGrille.tsx`
880, `setlists/page.tsx` 650, `SongDetailClient.tsx` 558, `SetlistForm.tsx` 448, `Notifier.tsx` 438.

**Lecture** : le code n'est pas recopié partout ni plein de code mort. Ce qui le rend brouillon, ce sont **quelques
composants géants** et une poignée de **petites fonctions écrites plusieurs fois** (transposition vers la tonalité de
l'item, ordre joué, contrôle du jeton dans les routes API, lectures Firestore REST, dates ISO).

Rapports bruts : à relancer (`npx -y knip@5 --reporter compact`, `npx -y jscpd@4 src --min-lines 12 --min-tokens 80`,
`npx -y madge@8 --circular --extensions ts,tsx --ts-config tsconfig.json src`) — ils ne sont pas versionnés.

## 2. Règle commune

**Aucun changement visible ni de comportement.** Chaque lot :
- se code en tranches avec `/tranche` (session orchestratrice, consigne du CLAUDE.md) ;
- avant une fonction pure sortie d'un composant : une spec qui l'importe et **fige son comportement actuel** ;
- passe `npx tsc --noEmit`, `npm run lint`, `npm run validate`, et les specs Playwright citées, **sur les trois
  appareils** (cinq projets pour les specs d'agencement, `SPECS_GRAND_ECRAN`) ;
- garde classes, attributs `data-*`, `data-testid` et ordre du DOM ;
- un commit par tranche, message en français.

## 3. Lots proposés (du plus sûr au plus risqué)

### N1 — Code mort sûr · risque faible · gain : moins à lire

- **Dépendances** inutilisées : `@radix-ui/react-select`, `@radix-ui/react-separator`, `json2csv` (`package.json`,
  aucun import nulle part).
- **14 exports que plus rien n'utilise** (même pas leur fichier) : `estReferentEdd`, `estReferentRegie`
  (`lib/acces/organigramme.ts`) ; `ecrireCase` (`lib/firebase/planningGrille.ts`) ; `ecritDansLApp`
  (`lib/planning/grille.ts`) ; `JOURC`, `EDD_PERIODES_LABELS`, `fdLong` (`lib/planning/utils.ts`) ;
  `NOTIFY_CATEGORIES` (`lib/push/audiences.ts`) ; `equipesDuRail` (`lib/taches/echeances.ts`) ; `POUR_EGLISE`
  (`types/evenement.ts`) ; `PERFORMER_ROLES` (`types/user.ts`) ; `hauteurMax` (`lib/tableauDeBord/colonnes.ts`) ;
  `ETAPES` (`lib/acces/repriseResponsabilites.ts`) ; `referentRegie` (`tests/helpers/fakeSession.ts`).
- **Code mort interne** : `toSegments` en commentaire (`components/song/ChordLine.tsx:9-47`) ; `rootRef` posé jamais lu
  et alias `MIN_SCALE`/`MAX_SCALE` (`PerformanceMode.tsx`) ; `fromSetlist` qui refait `setlistDOrigine`
  (`SongDetailClient.tsx`) ; alias `dansLaFenetre` (`PlanningGrille.tsx`) ; chaînages `setlist?.` après la garde
  `if (!setlist) return` (`SetlistDetailClient.tsx`) ; bornes 0.8 / 1.5 en dur au lieu de
  `MIN_FONT_SCALE`/`MAX_FONT_SCALE` (`SongDetailClient.tsx`).
- **Doc** : `docs/ARCHITECTURE.md` cite `npm run docs:diagrammes`, absent de `package.json` ; `.puppeteerrc.cjs` cite
  `scripts/diagrammes/generer.mjs`, qui n'existe pas (le vrai est `generer.ts`).
- Option (Q5) : retirer `export` des **97 noms** utilisés seulement dans leur fichier (liste knip).

**À garder** (faux positifs) : le kit shadcn de `components/ui/` (15 noms), `public/sw.js`, `.puppeteerrc.cjs`, le banc
`scripts/rude-epreuve/`, les scripts lancés à la main (`recommended-keys`, `releve-pianistes-fidelite`,
`jianpu/sweep-browser`, `jianpu/zoom-browser`, `diagrammes/generer`), l'alias `canHaveSetlistVersion` (miroir de
`firestore.rules`).

### N2 — Une seule fonction pour ce qui est écrit plusieurs fois · risque faible

| Recopié | Où | Devient |
| --- | --- | --- |
| Contrôle du jeton Firebase (Bearer + `verifyIdToken`) | 8 routes de `src/app/api/` | `authentifier(req)`, `src/lib/api/authentifier.ts` |
| Transposer vers la tonalité de l'item | `PartitionView.tsx` ×2, `SetlistFullPDF.tsx` ×2, `lib/performance/blocks.ts` | `transposerVers(ast, cle)`, `lib/transposeAST.ts` |
| Ordre joué (`structure?.length ? resolveStructureOverride(…) : sections`) | 8 endroits (blocks, playedSections, PartitionView, PDF ×2, SongView, history, formItems) | `ordreJoue(sections, structure)`, `lib/chordpro/structure.ts` |
| Base d'un identifiant d'occurrence (`uid.replace(/-\d+$/, "")`) | 8 fois dans 6 fichiers | `idDeSection(uid)`, `lib/setlist/sectionOrigins.ts` |
| `isCJK` | `SongView`, `JianpuLine`, `EditLineSheet`, `SongPDF` | `lib/cjk.ts` |
| `toSegments` (accords ↔ paroles) | `SongView.tsx`, `SongPDF.tsx` (identiques) | `lib/chordpro/segments.ts` |
| Dates ISO (`DAY`, `utc`/`toUtc`, `iso`/`toIso`) | `scene/fetes.ts`, `scene/saison.ts`, `scene/dimanches.ts`, `taches/echeances.ts` | `lib/dates/iso.ts` |
| Firestore REST : `authHeader` + `FS_BASE` | `firebase/setlists.ts`, `firebase/annotations.ts` | importés de `setlists.ts` (déjà exportés) |
| Firestore REST : `runQuery`, lecture/écriture d'historique, contrôle de version 409 | `setlists.ts` ×2, `programmes`/`taches`, `planningHistorique`/`setlistHistory`, `notifications`, `equipes`/`groupes` | un petit module REST partagé (`lireRequete`, `lireCollection`, `lireHistorique`, `ecrireEntree`, `verifierVersion`) |
| Suivi des deux volets (`suivre`, prédicat) | `hooks/useDeuxVolets.ts`, `hooks/useEditeurDeuxColonnes.ts` | `lib/deuxVolets.ts` (existe déjà) |
| Téléchargement d'un blob, plein écran natif, `--barre-left` | `SetlistDetailClient` ×2/×3, `SongDetailClient` | `telechargerBlob`, `demanderPleinEcran` (synchrone dans le geste), `useBarreLeft` |
| Boutons de champs d'une ligne d'éditeur | `SetlistFormRows.tsx:232-286` et `:484-539` | sous-composant `BoutonsChamps` (risque moyen, à regarder) |

**Faux doublon, ne pas fusionner** : les six `dateCourte` (planning, tâches, réunions ×2, ChoisisUnChant, scène) ont le
même nom mais des sorties différentes.

### N3 — Couper les imports circulaires · risque faible

- 10 cycles par `import type` : déplacer les types `SetlistVersions`/`VersionItem` (`firebase/setlistVersions.ts`),
  `EtatAnnonce` (`planning/prevenir.ts`), `DateServie` (`access.ts`), `ReminderService` (`push/reminderMessage.ts`)
  dans `src/types/`.
- 3 cycles réels, coupure mécanique : contexte et `useMesTaches` → `components/taches/contexteTaches.tsx` ;
  `useMesServices` → `components/mesServices/contexteMesServices.tsx` ; `Fleche`, `TuileDate`, `BadgeHorsGrille` →
  `app/evenements/scene/pieces.tsx`.

### N4 — Découper `SetlistDetailClient.tsx` · risque moyen

Ordre : sous-composants présentationnels (en-têtes, barres d'outils, menus, boîtes de dialogue, `IdeesDuChant`) →
fonctions pures (`adresseVue`, `with*` de version vers `lib/setlist/versionChoice.ts` en **gardant l'identité d'objet**,
`fabriquerPdfSetlist`) → hooks `usePreferencesAffichage`, `useContenusChants`, `useEntreeLouange`, `useEditionLignes`,
`useLectureSetlist`. Contrainte : tous les hooks restent avant les retours anticipés ; l'effet `?louange=1` utilise des
fonctions déclarées plus bas.

### N5 — Découper `PerformanceMode.tsx` (mode louange) · risque moyen

Fonctions pures de pagination vers `lib/performance/` (`paginer`, `pageAncree`, `replisStructure`,
`positionDansLeChant`, `splitSheetPages`, `layoutSong`), avec spec d'import ; puis sous-composants (barres, feuilles
Rôle et Réglages, sommaire, `PageScan`, `PageTexte`) ; puis hooks `useWakeLock`, `useThemeScene` (garder l'ordre :
l'observateur se déconnecte avant la restauration du thème), `useTempoChant`, `useAnnotationsPage`, `useRoleScene`.
Les feuilles gardent `stopPropagation` sur `onPointerDown`/`onPointerUp` (sinon un toucher tourne la page).
**Se coordonner avec le lot JE** (en-tête 简谱, PDF) avant `PageScan`.

### N6 — Découper `PlanningGrille.tsx` · risque moyen

Fonctions pures (`motifDuRefus`, `doitSemer`, `colonneDe` ×5, `sansCompteDe`, `phraseHistorique`, `styleCase`) ;
sous-composants (cartes téléphone, historique, en-tête, cellule date) ; hooks `useHistoriqueGrille`,
`useEcritureGrille`, `useCopiePrecedent`, `useCollageGrille`. `laCase` et `champ` **restent des fonctions de rendu**
(un composant défini dans la fonction perdrait le focus à chaque frappe).

### N7 — `setlists/page.tsx`, `SongDetailClient.tsx`, `SongPDF.tsx` · risque faible à moyen

- `setlists/page.tsx` : `clesDeMesServices`/`estDeMesServices` (format des clés campus écrit deux fois),
  `trierSetlists`, hooks de listes, de corbeille, de suppression groupée, `useMessageTemporaire` (4 `setTimeout`) ;
  écrans et boîtes de dialogue en sous-composants. `langueCourte(i18n)` (7 fois).
- `SongDetailClient.tsx` : petits hooks (`useRecents`, `useTailleTexte`, `useBarreRappelee`), sous-composants
  (`PiluleTonalite`, `ActionsChant` rendu deux fois, `MenuChant`). `usePersonnalisationChant` en dernier (risque élevé).
- `SongPDF.tsx` : couper le fichier en `pdf/song/{lignes,sections,pages}.tsx`, sans toucher au rendu (après le lot JE).

### N8 — Les deux extractions à risque élevé · facultatif

`useVuesG` (Liste ↔ Partitions de `SetlistDetailClient` : refs partagées entre quatre effets, état ajusté pendant le
rendu) et `usePaginationScene` (`PerformanceMode` : refs de mesure, `useLayoutEffect`). Seulement après N4 et N5, et si
le gain vaut encore le risque.

## 4. Questions à trancher (Timothée)

| # | Question | Recommandation |
| --- | --- | --- |
| Q1 | Scripts de migration `scripts/poles-vers-equipes.ts` (relevé à 0 opération), `scripts/acces-vers-organigramme.ts` (feuille de route : « à lancer »), `scripts/responsabilites-reprise.ts` (« à blanc ») et le brouillon `scripts/tmp/t.ts` : garder ou supprimer ? | Supprimer `t.ts` et `poles-vers-equipes.ts` (+ son `ETAPES`) ; garder les deux autres tant qu'ils ne sont pas joués |
| Q2 | La « 简谱 simple » (`{jianpu: …}` au-dessus des paroles) ne s'affiche plus nulle part : `useJianpu` vaut toujours `false` (page chant, réglages, mode louange, PDF). Supprimer la fonction, ou la rebrancher ? | Supprimer le code d'affichage (les scans 简谱 l'ont remplacée) ; le parseur continue de lire la directive |
| Q3 | La page campus en mode back-office coupé (`app/planning/campus/AncienTableau.tsx`) recopie ~130 lignes de `page.tsx` | Une carte de séance commune ; garder l'interrupteur |
| Q4 | `canChangeSetlistCategory = canDeleteSetlist` (`access.ts`) ne sert qu'à un test d'identité | Garder (la règle reste nommée) |
| Q5 | Retirer `export` des 97 noms utilisés seulement dans leur fichier ? | Oui, dans N1 (mécanique, aucun risque à l'exécution) |
| Q6 | Jusqu'où aller ? | N1 à N3 d'abord (petits, sûrs) ; N4 à N7 un par un, selon le résultat ; N8 seulement si ça vaut encore le coup |

## 5. Coordination avec les autres sessions

- Une autre session code en parallèle : avant chaque lot, `git pull --rebase`, relancer les trois outils et ne garder
  que les constats encore vrais.
- Un lot dit les fichiers qu'il touche ; on ne lance pas un lot sur un fichier qu'une autre session modifie en même
  temps (en particulier `PerformanceMode.tsx`, `SongPDF.tsx` et la 简谱 tant que le lot JE est ouvert).
