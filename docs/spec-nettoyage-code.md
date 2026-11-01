# Spec — nettoyer et simplifier le code (sans changement visible)

**Origine** : Timothée, 31/10/2026 — « le code est très brouillon, il y a beaucoup de choses qu'on peut simplifier,
nettoyer ». Outils externes autorisés le même jour pour un usage ponctuel (`npx knip`, `npx jscpd`, `npx madge`),
sans rien ajouter au dépôt.
**Statut** : décisions prises par Claude sur délégation (Timothée, 31/10/2026 : « Fais ce que tu penses être le mieux
pour moi »), § 4 ; go pour N1 à N3, puis (Timothée, 31/10/2026 : « go pour toutes les modifications qu'il faut
faire ») pour le reste. **N1 à N7 faits les 31/10 et 01/11/2026** sur la branche `claude/sweet-wright-d533ng` (§ 6 et
§ 7) ; N8 exclu (§ 3). Pas encore sur `main` : la mise en ligne attend l'ordre de Timothée.
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

## 4. Décisions (Claude sur délégation, 31/10/2026 ; Timothée peut en rouvrir une)

| # | Question | Décision |
| --- | --- | --- |
| Q1 | Scripts de migration et brouillon | **Supprimer** `scripts/tmp/t.ts` et `scripts/poles-vers-equipes.ts` (relevé à 0 opération) avec l'`ETAPES` de `lib/equipes/migration.ts` s'il ne sert plus à rien d'autre. **Garder** `acces-vers-organigramme.ts` et `responsabilites-reprise.ts` (pas encore joués ; le second appartient au lot RS en cours) |
| Q2 | « 简谱 simple » jamais affichée (`useJianpu` toujours `false`) | **Différé** : c'est une fonction, pas une faute ; on la retire dans un lot à part si Timothée confirme qu'elle est abandonnée. N1 n'y touche pas |
| Q3 | Campus : `AncienTableau.tsx` recopie `page.tsx` | **Carte de séance commune** (`components/planning/`), interrupteur gardé — dans N2 |
| Q4 | Alias `canChangeSetlistCategory` | **Gardé** |
| Q5 | Retirer `export` des 97 noms internes | **Oui**, dans N1, sauf les fichiers du lot RS (§ 5) et `tests/helpers/` (gardés comme boîte à outils de test) |
| Q6 | Jusqu'où | **N1 → N2 → N3** maintenant ; bilan ; N4 à N7 un par un sur nouveau go ; N8 seulement si le gain vaut encore le risque |

## 5. Coordination avec les autres sessions

- Une autre session code en parallèle : avant chaque lot, `git pull --rebase`, relancer les trois outils et ne garder
  que les constats encore vrais.
- Un lot dit les fichiers qu'il touche ; on ne lance pas un lot sur un fichier qu'une autre session modifie en même
  temps (en particulier `PerformanceMode.tsx`, `SongPDF.tsx` et la 简谱 tant que le lot JE est ouvert).
- **31/10/2026** : le lot RS « Responsabilités » code en ce moment. Tant qu'il n'est pas fusionné, N1–N3 **ne touchent
  pas** `src/lib/access.ts`, `firestore.rules`, `src/lib/acces/*`, `src/lib/equipes/responsabilites.ts`,
  `scripts/responsabilites-reprise.ts` ni leurs tests : les constats qui y tombent (`estReferentEdd`,
  `estReferentRegie`, `ETAPES` de `repriseResponsabilites.ts`, le type `DateServie` de N3, exports en trop de
  `lib/acces/`) attendent. Le lot JE est terminé (`f8510da`).

## 6. Avancement (31/10/2026)

Branche `claude/sweet-wright-d533ng`, `main` fusionné par merge (lot RS mis en ligne, rappel de structure, lot SP).
Pas encore sur `main` : la mise en ligne attend l'ordre de Timothée.

| Tranche | Commit | Contenu | Tests (trois appareils) |
| --- | --- | --- | --- |
| N1a | `d79324f` | 3 dépendances, 15 exports morts, code mort interne, `scripts/tmp/t.ts` et `poles-vers-equipes.ts` (Q1), doc des diagrammes | 15 specs |
| N1b | `a8f4728` | `export` retiré de ~205 noms internes (Q5) ; exports morts des fichiers RS (`estReferentEdd`, `estReferentRegie`, `ETAPES` de la reprise) | 13 specs, 1 334 passés |
| N2a | `38424f3` | `authentifier(req)` (`lib/api/authentifier.ts`) dans 8 routes et `appelant` des tâches | 568 + `back-office-coupe` 263 |
| N2b | `d025e40` | `transposerVers`, `ordreJoue`, `idDeSection`, `lib/cjk.ts`, `lib/chordpro/segments.ts` ; `tests/nettoyage-fonctions-chant.spec.ts` (FR + ZH) | 14 specs, 907 passés |
| N2c | `84e87e8` | `lib/dates/iso.ts`, `FS_BASE`/`authHeader` importés dans `annotations.ts`, `suivreDisposition` (deux volets), `lib/telecharger.ts` (téléchargement, plein écran) | 6 specs, 504 passés |
| N3 | `e1d2af2` | 13 cycles → 0 : types dans `src/types/` (`setlistVersions`, `planning`, `rappels`, `FSSetlist`) ; `contexteTaches`, `contexteMesServices`, `scene/pieces.tsx` | 15 specs ; échecs sous charge relancés seuls : 236 passés |
| — | `e0a67c6` | `LAST_PHRASE` de nouveau exporté (importé par `lib/setlist/dp.ts`, arrivé de `main`) | après le merge de `main` : rappel ×3, sections uniques, statistiques, spec N2b : 413 passés |

**Mesures avant → après** (knip 5, jscpd 4, madge 8) :

| | Avant (`b768681`) | Après |
| --- | --- | --- |
| Fichiers inutilisés (knip) | 20 | 18 (faux positifs gardés : `sw.js`, banc `rude-epreuve`, scripts à la main) |
| Dépendances inutilisées | 3 | 0 |
| Exports inutilisés | 70 | 11 (kit `components/ui`, `tests/helpers`, 3 importés par des scripts) |
| Types exportés inutilisés | 87 | 8 (`components/ui`, `tests/helpers`, `Seg`, `StepGroup` arrivé de `main`) |
| Copier-coller (≥ 12 lignes) | 18 clones, 410 lignes (0,38 %) | 13 clones, 338 lignes (0,31 %) |
| Imports circulaires | 13 | 0 |

Lignes des tranches N : +875 / −1 253 (dont ~180 lignes de la spec de N2b).

**Reportés** (N2, à reprendre dans un lot à part, sur go) :
- carte de séance campus commune (`AncienTableau.tsx` / page campus, Q3) et `BoutonsChamps` (`SetlistFormRows.tsx`) :
  il faut regarder les captures, plus risqué que le reste ; reportés pour tenir le temps de la session ;
- module REST partagé (`runQuery`, historique, contrôle de version 409) : il touche cinq modules Firestore et leurs cas
  d'erreur ;
- `useBarreLeft` : les effets de `SetlistDetailClient` et `SongDetailClient` ne sont pas équivalents (mesure de
  l'en-tête, `removeProperty`), rien à mettre en commun tel quel ;
- ré-exports de type gardés par N3 (`FSSetlist` dans `setlists.ts`, `EtatAnnonce` dans `prevenir.ts`,
  `ReminderService` dans `reminderMessage.ts`) : une quarantaine d'importeurs à repointer vers `src/types/`.

**Notes** :
- `tests/performance-mode.spec.ts:243` (tablette) échoue environ une fois sur quatre : le test clique « Agrandir le
  texte » avant l'hydratation de la page du chant (un clic perdu → 110 % au lieu de 120 %). Vu aussi sans N2b ; 5/5 sur
  `f8510da`. À durcir (attendre l'hydratation) dans un lot de tests.
- Deux tranches menées en parallèle (N2a et N3, deux copies de travail) ont saturé la machine (charge ~15 sur 4 cœurs)
  et donné des dizaines de faux échecs : une suite Playwright à la fois. `reuseExistingServer: true` branche
  silencieusement une suite sur le serveur d'une autre copie qui occupe le même port.
- Un `git pull --rebase` simple après un merge de `main` a recopié 20 commits de `main` sous d'autres identifiants ;
  réparé par un second merge (`main` redevient ancêtre, aucun fichier changé). Après un merge : `git pull --rebase=merges`.

## 7. Avancement, suite (01/11/2026) : fin de N2, N4 à N7

`main` fusionné une seconde fois (lot LF, lectures Firestore) : conflits résolus en gardant le comportement de LF
(`FSSetlist` reste dans `src/types/setList.ts`, `majLe` ajouté ; `lireProfils` gardé 10 min, lu par `lireRequete`).

| Tranche | Commit | Contenu | Tests (trois appareils, cinq projets pour l'agencement) |
| --- | --- | --- | --- |
| N2d | `bccde047` | `FSSetlist`, `EtatAnnonce`, `ReminderService` importés de `src/types/` (44 fichiers), ré-exports retirés ; `performance-mode:243` durci (attend l'hydratation, 10/10) | 892 passés (imports de types seulement) |
| N2e | `9d277de6` | `lireRequete` (firebase/setlists.ts) : 3 `runQuery` locaux et les copies strictement équivalentes | passe commune N2e–N4b : 1 707 passés + 27 (ancien tableau campus) |
| N2f | `595f1a3c` | `CarteJourCampus` (page campus et `AncienTableau`, Q3) ; `BoutonsChamps` (éditeur) | id. |
| N4a | `fc5a781c` | page d'une setlist : 7 fichiers de sous-composants (écrans, menus, dialogues, bascule, idées, bandeau, titre) | id. |
| N4b | `b76cc45f` | `lib/setlist/adresseVue.ts`, `with*` purs dans `versionChoice.ts` ; spec de 9 tests | id. |
| N4c | `fd54618e` | `usePreferencesAffichage`, `useContenusChants`, `useEntreeLouange` | 437 passés |
| N5a | `f86262d9` | `lib/performance/pagination.ts` (paginer, pageAncree, replisStructure, splitSheetPages, layoutSong…) ; spec de 37 tests | 1 036 passés |
| N5b | `4b8333d6` | mode louange : SommaireChants, BarreHaut, BarreBas, FeuilleRole, PageScan, PageTexte | passe N5b–N5c : 1 158 passés |
| N5c | `4e53c3d4` | `useWakeLock`, `useThemeScene`, `useTempoChant`, `useAnnotationsPage` | id. |
| N6a–b | `b4da2ded` | `lib/planning/grilleAffichage.ts` (colonneDe ×5, motifDuRefus ×3…) ; GrilleEnTete, GrilleCelluleDate, GrilleHistorique, GrilleCarte ; spec de 6 tests | passe N6–N7a : 998 + 58 passés |
| N6c | `f522a98b` | `useHistoriqueGrille`, `useCopiePrecedent` | id. |
| N7a | `41e0bb2d` | `langueCourte` (20 copies) ; `lib/setlist/liste.ts` ; `useMessageTemporaire` ; 3 sous-composants de la liste ; spec de 9 tests | id. |
| N7b | `f353406b`, `cacf9286` | PDF d'un chant coupé en `pdf/song/{lignes,sections,pages}.tsx` ; page chant : 3 hooks, 3 sous-composants | 395 + `jianpu-integration` 222 passés |

Chaque échec vu pendant ces passes a été relancé seul, et pour les cas douteux comparé au code d'avant la tranche :
tous passent seuls (`setlist-g:199/210`, `look-louange:160`, `jianpu-integration:711` et `:92`, `a-faire`, Mes services
en deux volets). Ce sont des courses sous charge (clic avant hydratation, mesure pendant une animation, pixels) ;
`setlist-g:199/210` échouent même davantage sur le code d'avant N4 (8/20).

**Composants géants, avant → après** :

| Fichier | Avant | Après |
| --- | --- | --- |
| `SetlistDetailClient.tsx` | 2 490 | 2 093 |
| `PerformanceMode.tsx` | 2 263 | 1 632 |
| `PlanningGrille.tsx` | 1 130 | 961 |
| `setlists/page.tsx` | 813 | 648 |
| `SongDetailClient.tsx` | 740 | 567 |
| `SongPDF.tsx` | 1 332 | 53 (+ 3 fichiers) |

**Mesures, début du lot → fin** (knip 5, jscpd 4, madge 8) :

| | Avant (`b768681`) | Fin |
| --- | --- | --- |
| Dépendances inutilisées | 3 | 0 |
| Exports inutilisés | 70 | 9 hors kit `components/ui` et `tests/helpers` : 3 importés par des scripts, 2 arrivés de `main` (LF) |
| Types exportés inutilisés | 87 | 2 hors kit et helpers (`CopieListe`, `StepGroup`, arrivés de `main`) |
| Copier-coller (≥ 12 lignes) | 18 clones, 410 lignes (0,38 %) | 8 clones, 142 lignes (0,12 %) |
| Imports circulaires | 13 | 0 |
| Lint | 0 erreur, 70 avertissements | 0 erreur, 69 avertissements |

**Laissé, et pourquoi** (aucune de ces extractions n'est sûre telle quelle) :
- `SetlistDetailClient` : en-tête deux volets, barre G, `PartitionsView` (≈ 25 props chacun) ; hooks
  `useLectureSetlist` et `useEditionLignes` (états partagés, pas de bloc contigu) ; `useVuesG` (N8).
- `PerformanceMode` : feuille Réglages (≈ 40 props), copie de mesure ; `useRoleScene` (états initialisés les uns des
  autres) ; `usePaginationScene` (N8).
- `PlanningGrille` : corps du tableau ; écriture et collage (sans hook React, les regrouper aurait demandé 10 à 17
  paramètres : refusé) ; `laCase` et `champ` restent des fonctions de rendu (spec).
- `setlists/page.tsx` : hooks de listes, corbeille, suppression groupée (mêlés aux effets de chargement).
- `SongDetailClient` : `usePersonnalisationChant` (risque élevé, spec).
- `useBarreLeft` (§ 6) ; les copies REST qui lèvent une erreur, partagent leurs en-têtes ou ajoutent un délai (N2e).

**Pour aller plus loin** : les gros blocs restants demandent de regrouper des props (objet ou contexte) : c'est un
choix de structure, pas un nettoyage ; à décider avant tout N8.
