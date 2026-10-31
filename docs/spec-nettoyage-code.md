# Spec — nettoyer et simplifier le code (sans changement visible)

**Origine** : Timothée, 31/10/2026 — « le code est très brouillon, il y a beaucoup de choses qu'on peut simplifier,
nettoyer ». Outils externes autorisés le même jour pour un usage ponctuel (`npx knip`, `npx jscpd`, `npx madge`),
sans rien ajouter au dépôt.
**Statut** : décisions prises par Claude sur délégation (Timothée, 31/10/2026 : « Fais ce que tu penses être le mieux
pour moi »), § 4 ; **go pour N1, N2 et N3 seulement**. **N1, N2 (en partie) et N3 faits le 31/10/2026** sur la
branche `claude/sweet-wright-d533ng` (§ 6) ; trois morceaux de N2 reportés. N4 à N8 attendent un nouveau go.
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
