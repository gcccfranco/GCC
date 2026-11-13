# Mode louange actuel : inventaire (état du code, 26/10/2026)

Lecture seule du code. Chemins relatifs à `/home/user/GCC`. Les numéros de ligne
sont ceux du code à cette date.

## 0. Carte des fichiers

| Fichier | Rôle | Taille |
| --- | --- | --- |
| `src/components/performance/PerformanceMode.tsx` | Composant principal (overlay plein écran) | 1 887 lignes |
| `src/components/performance/AnnotationCanvas.tsx` | Canevas d'annotation + calque de lecture (`StrokesLayer`) | 504 lignes |
| `src/lib/performance/blocks.ts` | Construction des blocs (chants, sections, scans, en-têtes), signature d'affichage, clé de page | 487 lignes |
| `src/lib/performance/columns.ts` | Pagination une / deux colonnes, `GRAND_ECRAN` | 158 lignes |
| `src/components/song/SongView.tsx` | `SectionView`, `StructureStrip`, `NuanceBadge`, polices (utilisés aussi hors mode) | |
| `src/components/jianpu/JianpuSheet.tsx` | Scan 简谱 + calque d'accords | |
| `src/app/setlists/[id]/SetlistDetailClient.tsx` | Ouverture du mode depuis la setlist | 2 200+ lignes |
| `src/lib/annotations/strokes.ts`, `src/lib/firebase/annotations.ts` | Modèle et stockage des traits | |
| Préférences par appareil | `src/lib/fontScalePref.ts`, `pinyinPref.ts`, `chartStylePref.ts`, `partitionLayoutPref.ts`, `jianpu/preference.ts`, `setlist/personalKeys.ts` | |
| Spec | `docs/spec-mode-louange.md` (255 lignes) | |
| Specs liées | `docs/spec-coup-d-oeil.md` (vue partitions, Affichage, lot 3), `docs/spec-version-perso.md` (version perso par setlist) | |
| Tests | `tests/performance-mode.spec.ts` (463 lignes, 27 blocs `test(`), `tests/helpers/louange.ts`, `tests/mode-louange-colonnes.spec.ts`, `tests/louange-sections-uniques.spec.ts`, `tests/look-louange.spec.ts`, `tests/look-barres.spec.ts` | |

## 1. Entrée, sortie, structure de l'écran

**Entrées** (toutes ouvrent le même état `performanceMode`, pas de route propre) :
- Bouton « Mode Louange » de la barre de la setlist : `SetlistDetailClient.tsx:1844-1853`
  (`ouvrirModeLouange`, `:1402-1410` : demande le plein écran natif via
  `documentElement.requestFullscreen`, recharge les chants manquants avec `loadContents`,
  puis `setPerformanceMode(true)`).
- Lien `?louange=1` depuis l'accueil et les services : `src/components/accueil/PourMoi.tsx:89`,
  `src/components/setlists/ApercuSetlist.tsx:102`, `src/components/mesServices/DetailService.tsx:139`.
  Traitement : `SetlistDetailClient.tsx:470-479` (le paramètre est retiré de l'adresse).
- État déclaré : `SetlistDetailClient.tsx:294` ; rendu : `:2189-2207`.

**Sortie** : Échap, bouton « Quitter » (`PerformanceMode.tsx:1589-1592`), ou `onClose` qui
quitte aussi le plein écran (`SetlistDetailClient.tsx:2202-2206`).

**Structure** (rendu racine `PerformanceMode.tsx:1097-1110`, `fixed inset-0 z-[9999]`) :
- Mesure cachée à l'échelle 1, hors écran : `:1111-1188` (même largeur que le rendu, sert au calcul des pages).
- Zone de contenu mise à l'échelle par `transform: scale(fontScale)` : `:1198-1212`.
- Calque d'annotations : `:1406-1418`.
- Sommaire des chants (tiroir gauche, `w-72`) : `:1420-1465`.
- Chrome auto-masqué (`opacity`, `zIndex 20`) : `:1467-1594` :
  - barre haute (titre, tonalité, « 2 colonnes », compteur `n / N`, points de progression) : `:1474-1533` ;
  - barre basse (Sommaire `:1548`, Réglages `:1553`, Annoter si connecté `:1558-1567`, précédent/suivant `:1570-1587`, Quitter `:1590`).
- Choix du rôle (premier lancement, tiroir) : `:1597-1630`.
- Réglages (tiroir, `z-[10000]`) : `:1633-1841`.

## 2. Navigation

- **Pages, pas de défilement vertical** : chaque « page » est une page d'écran, calculée par
  mesure (`PerformanceMode.tsx:689-807`, `pagesUneColonne` / `paginateColumns` dans `columns.ts:66`, `:88`).
  Seule exception : la colonne de structure sur grand écran défile seule (`:1313`).
- **Gestes tactiles** (`:1004-1034`, sur la racine) : tap < 1/3 de l'écran = page précédente,
  > 2/3 = page suivante, centre = affiche/masque le chrome. Seuils : déplacement ≤ 40 px, durée ≤ 500 ms.
  Pas de balayage. Le stylet est ignoré (`:1006`, `:1014`). Les barres et tiroirs stoppent la propagation (`:1482-1483`, `:1544-1545`, `:1425-1426`, `:1637-1638`).
- **Clavier** (`:977-1002`) : ← / PageUp précédent ; → / PageDown / Espace suivant ; Échap ferme
  d'abord la feuille ouverte, puis quitte. Un Échap déjà traité (`defaultPrevented`) est ignoré (`:990`).
  Pédales Bluetooth visées par le commentaire `:977`.
- **Passage de chant** : bouton « Suivant : … » sur la dernière page d'un chant (`:1392-1404`, ou colonne en paysage `:1316-1324`) ;
  sommaire `:1421-1465` ; points de progression du chant courant `:1503-1514` (jusqu'à 8 pages).
- **Ancre de lecture** : la page reste sur le même bloc lors d'un recalcul (`:586-589`, `:790-804`, `blocks.ts:427-457`).
- **Veille écran** : Wake Lock `:839-857`.
- **Masquage du chrome** : 3 s (`:868`), reste affiché en annotation (`:876-883`).

## 3. Affichage

**Réglages** (tiroir `:1647-1838`, l'ordre suit l'écran) :
- **Vue (rôles)** : 5 presets `ROLE_PRESETS` (`:323-329`) : pianiste, guitariste (capo actif),
  présidence, choriste, batteur (paroles masquées). Un toucher manuel désélectionne le rôle (`:1743-1745`, `:1757-1759`, `clearRolePreset` `:476`).
- **Affichage** (radiogroupe, `:1668-1687`) : `played` (ordre joué), `unique` (sections uniques), `structure` (seule).
  Partagé avec le menu Affichage de la setlist (`SetlistDetailClient.tsx:396-399`, `partitionLayoutPref.ts`).
- **Tonalité** : repère « Revenir à X » (`:1688-1705`) ; tonalité réelle calculée dans `blocks.ts:296-301`.
- **Capo** (si rôle guitariste, par chant, `:1706-1738`, 0 à 11) : stockage `perf-capos` (`:409-419`, `:515-525`).
- **Accords** (`:1739-1749`), **Transitions** (`:1750-1752`), **Masquer les paroles** (`:1753-1763`).
- **Pinyin** (si un chant zh a du pinyin, `:1764-1768`) : `gcc.showPinyin` partagé avec la setlist (`pinyinPref.ts`).
- **Couleurs par section** (« chart »), `:1769-1771`, `chartStylePref.ts` (clé `chart-style`).
- **Partition 简谱** (si un scan existe, hors vue structure) : `:1772-1786`, `jianpu/preference.ts` (`jianpu-sheet-pref`).
- **Annotations** (connecté seulement) : `:1787-1791`.
- **Taille du texte** : A− / A+, pas de 0,1, bornes 0,8 à 1,5 (`fontScalePref.ts:8-9`, `:831-837`, `:1792-1818`).
  Clé `perf-font-scale`, avec repli sur `song-font-scale` (`fontScalePref.ts:5-6`, `:13`).
- **Thème** clair / sombre (`:1819-1838`) : `perf-theme` (`:435-443`, `:459-462`) ; bascule la classe `dark` de `<html>`, restaurée à la fermeture (`:446-457`).
- **2 colonnes** : bouton de la barre haute (`:1520-1532`), automatique si `GRAND_ECRAN` et largeur / taille ≥ 960 px (`columns.ts:18-29`, `PerformanceMode.tsx:559-573`), clé `perf-two-columns`.

**Vues** :
- **Structure** (`structureMode`, `:530`) : un chant par page (`layoutSong`, `:273-307`), agrandi jusqu'à ×3 (`:256`), réduit si ça déborde (`:816-829`). Reprises « ×2 » (`:642-671`, `blocks` → `SectionView repeat`). En-tête à l'échelle 1 (`:146-218`).
- **Ordre joué / Sections uniques** : rappel de structure en tête des pages 2 et suivantes (`:1074-1077`, `RAPPEL_RESERVE` `:260`).
- **Page scan 简谱** (`page.fit`, `:1251-1350`) : en-tête d'une ligne (titre, ♩ tempo, capo, tonalité, « setlist : X »), bandeau de structure, scan à la hauteur restante ; paysage grand écran en colonne gauche (`:1085`, `:1294-1329`).

**Rôle, taille, pinyin, thème** : les réglages sont par appareil (localStorage). Les clés
sont listées en section 7.

**Nuancier** : `NuanceBadge` (`src/components/song/SongView.tsx:414-456`), classes d'intensité
`:385-390`, définitions dans `src/lib/setlist/nuances.ts:53`. En mode louange : `nuanceSize="lg"` (`PerformanceMode.tsx:126`).

**Polices** (lot 6, `SongView.tsx:109-113`) : Atkinson Hyperlegible Next (FR, accords), Source Han Sans CN Medium (zh), Andika pour le pinyin (`src/components/song/pinyinFont.ts:8`).
Taille de base via `--lyric-size` (`src/app/globals.css:164-166`).

**简谱** : composant `JianpuSheet` (`PerformanceMode.tsx:99-111`, mode `fit` ou `flow`), scan image
+ calque d'accords, manifeste via `useJianpuManifest` (`:18`). Décisions et protocole : `docs/spec-mode-louange.md` § « Vue structure » et `scripts/jianpu/LOOP.md`.

**Tonalité / transposition** : tonalité choisie par appareil et par setlist (`src/lib/setlist/personalKeys.ts`,
lecture `PerformanceMode.tsx:625-633`), transposition des blocs `blocks.ts:296-301`, capo `blocks.ts:120-123`.
Le repère « A · setlist : G » est en `:1265-1281` (scan) et `:1489-1497` (barre haute).

## 4. Annotations

- **Qui** : connecté seulement (`:1558`, `:1407`, `:1787`).
- **Modèle** : traits vectoriels `{ w, h, strokes }` (`src/lib/annotations/strokes.ts:20-25`), outils stylo, surligneur, gomme (`AnnotationCanvas.tsx:27-33`), multi-touch pour zoom et déplacement (`:103-104`).
- **Stockage** : Firestore via REST, document `annotations/{docId(userId, setlistId, pageKey)}`, champ `strokes` (JSON). Lecture `src/lib/firebase/annotations.ts:20-35`, écriture `:37+`.
  Chaque modification est écrite aussitôt, sans attente (`PerformanceMode.tsx:960-968`).
- **Clé de page** : `computePageKey(blocks, indices, layoutSig + "x2"? + cleScan)` (`:941-942`, `blocks.ts:467`).
  `cleScan` vaut `j2` (scan) ou `j3` (scan en paysage grand écran).
- **Dépendance à la mise en page** : `signatureAffichage` (`blocks.ts:398-420`) inclut accords, transitions, paroles masquées, couleurs par section, capo, tonalité choisie, taille du texte (`z…`) et affichage (`au`). Le pinyin n'y figure pas.
  Conséquence acceptée (spec, `docs/spec-mode-louange.md:90-92`) : changer la taille du texte masque les traits faits à l'ancienne taille.
- **Affichage** : calque permanent `StrokesLayer` (`:1407-1409`), interrupteur `showAnnotations` (`:615`).

## 5. Pratique (métronome, tempo, audio)

- **Métronome** : aucun dans le mode louange ni dans `SongView.tsx` (recherche vide).
- **Audio / YouTube** : aucun dans `src/components/performance/` ni dans `SongView.tsx`. `src/lib/youtube/` existe, hors de ce périmètre.
- **Tempo** : analysé depuis `{tempo: …}` (`src/lib/chordpro/parser.ts:368-369`), porté par le bloc scan (`blocks.ts:91`, `:345`) et
  affiché seulement sur les pages de scan (`PerformanceMode.tsx:1259-1263`, `:1308`, `:1341`). Les pages texte n'affichent pas le tempo.

## 6. Gelé ou contraint

- **Zone gelée** : `docs/audit-ui-apple-design.md` § 2 (`:36-47`) liste « le mode louange » parmi les zones gelées. Dégel du 13/09/2026 (`:48`) pour le chantier ; le § 2 « Restent gelés » est au même endroit (`:36-41`).
- **Spec, Limites** (`docs/spec-mode-louange.md:237-242`) : demander avant tout changement du PDF, de l'éditeur de setlist ou du style d'ensemble ; ne jamais changer les couleurs de section, d'accords, de 简谱 ou de services ; ne jamais retoucher les calques 简谱 certifiés.
- **« Le dimanche ne casse jamais »** : `docs/feuille-de-route.md:16`.
- **Hors-ligne** (`public/sw.js`) :
  - HTML en réseau d'abord (`:56-64`, navigation, `:111-113`) : le mode louange est un état de `/setlists/[id]`, donc sa page vient de là ;
  - `/_next/static/*` en cache d'abord (`:121-123`) ;
  - `/fonts/*`, `songs-index.json`, `/api/song/*`, `/jianpu/*` en « stale-while-revalidate » (`:127-137`) : un scan n'est hors-ligne qu'après une première ouverture ;
  - `PRECACHE` ne contient que `/songs/` et `/songs-index.json` (`:34`) ;
  - version `gcc-louange-v4` (`:24`) ; rien n'est mis en cache sur `localhost` (`:26-28`).
- **Firestore** : annotations en REST uniquement (règle du projet), donc hors ligne = annotations indisponibles.
- **Trois appareils et quatre dispositions** : tout test d'interface tourne sur ordinateur, téléphone, tablette ; les specs d'agencement s'ajoutent à `SPECS_GRAND_ECRAN` (`CLAUDE.md`, « Tests — Playwright »).
- **Version perso** : la setlist passe au mode `stageItems` (`SetlistDetailClient.tsx:1355`, `withMineStructure` `:350-353`), donc la structure perso du musicien entre bien dans le mode. Spec : `docs/spec-version-perso.md`.

## 7. Réglages stockés (localStorage, par appareil)

`perf-role-preset`, `perf-role-asked`, `perf-hide-lyrics`, `perf-capos`, `perf-theme`, `perf-two-columns`, `perf-font-scale`
(propres au mode) ; partagés avec d'autres vues : `gcc.showPinyin`, `chart-style`, `partition-layout`, `jianpu-sheet-pref`,
`song-font-scale`, clés de tonalité par setlist (`personalKeys.ts`). Repli sur les anciennes clés `perf-show-pinyin`, `perf-chart-style`.
Les lectures et écritures sont entourées de try/catch (`PerformanceMode.tsx:366-373`, `:409-419`, `:435-443`, et les modules de préférence).

Écart documentaire : `docs/spec-mode-louange.md:27-28` dit « rien n'est demandé à la première ouverture ». Le code la demande (`PerformanceMode.tsx:502-508`, lot 3 fait le 14/09). La partie « Ce que le code montre » de la spec est datée du 13/09.

## 8. Limites techniques

- **Taille** : un seul composant de ~1 500 lignes (`PerformanceMode.tsx:351-1844`), une vingtaine d'états React (`useState`/`useRef`, `:365-625`) et une dizaine d'effets. Le sous-composant `IconBtn`/`SettingRow` est en bas du fichier.
- **Mise en page par mesure DOM** : un rendu caché de tous les blocs est refait à chaque changement de `blocks`, `fontScale`, `structureMode`, `twoColumns`, `affichageVu` (`:689-807`). Pas de virtualisation. Les hauteurs viennent de `getBoundingClientRect` (`:714`).
- **Boucle de réduction en vue structure** (`:816-829`) : écrit dans `layout` depuis un `useLayoutEffect`, avec un plancher à 0,3. Converge par construction, mais ajoute un passage de rendu.
- **Dépendances larges** : `blocks` (`:635-640`) est recalculé dès qu'un réglage change ; la reconstruction des blocs exige ensuite un recalcul des pages et une ré-ancre de lecture (`:782-804`), d'où la logique d'`ancreDeLecture` (`blocks.ts:444`).
- **Annotations** : un chargement REST à chaque changement de page (`:945-957`) et une écriture à chaque trait, sans regroupement (`:960-968`).
- **Thème global** : le mode modifie la classe `dark` de `<html>` (`:446-457`) ; la restauration dépend du démontage du composant.
- **Pointeurs** : les gestes passent par des écouteurs `onPointerDown/Up` sur la racine (`:1108-1109`). Chaque élément qui doit rester cliquable doit stopper la propagation (plusieurs occurrences, `:1425`, `:1482`, `:1544`, `:1601`, `:1637`).
- **Clés de page** : tout nouveau réglage qui change la mise en page doit entrer dans `signatureAffichage` ou la clé, sinon les annotations se mélangent (commentaire `:922-940`, incrémentation `j2`/`j3` à faire à la main).
- **Tests** : `tests/performance-mode.spec.ts` (27 blocs, dont `:107` ×2, `:120` trois sections, `:189` premier lancement, `:306` tonalité, `:427` nuances) ; les tests d'agencement sont dans `tests/mode-louange-colonnes.spec.ts`, `tests/louange-sections-uniques.spec.ts`, `tests/look-louange.spec.ts`, `tests/look-barres.spec.ts`.
