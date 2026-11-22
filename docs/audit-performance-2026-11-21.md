# Audit de performance — 21/11/2026

Demande de Timothée (21/11, nuit) : « le site lag énormément, ça met du temps à activer le mode crayon, lancer le mode
louange. C'est un peu toutes les actions » ; « trouve moi les raisons » (son mini-PC a 8 cœurs et 32 Go) ; « pas
seulement les mêmes actions mais toutes les actions possibles sur le site, pour voir comment on peut optimiser tout ça ».

Ce document : les mesures, les causes, puis les corrections proposées, classées. **Aucun code du site n'est changé
ici** ; chaque correction se code sur un go de Timothée.

## 1. Premières mesures (session d'origine, 21/11)

Méthode : Playwright, Chromium sans écran, conteneur de 4 cœurs ; setlist simulée de quatre chants (deux FR, deux ZH),
page `/setlists/{id}` ; temps entre le clic et l'écran prêt, et part de « tâches longues » (le navigateur ne répond
pas). Même script en `next dev` et sur une version construite (`next build` + `next start`). Script gardé dans
`scripts/perf/mesure-actions.spec.ts.txt` (à copier dans `tests/` pour le lancer ; `MESURE_BASE`, `MESURE_LARGEUR`).

| Action | construit, 1 280 px | construit, 1 512 px | dev, 1 280 px | dev, 1 512 px |
|---|---|---|---|---|
| Activer le Crayon | 0,13 s | 0,65 s | 0,1 à 0,5 s | 0,1 à 1,1 s |
| Quitter le Crayon (« Terminé ») | 0,15 s | **2,0 s** | 0,1 à 0,2 s | 0,1 à 2,4 s |
| Lancer le mode louange | 0,6 s | **2,6 à 3,0 s** | 1,4 à 1,5 s | 3,3 s |
| Page suivante (mode louange) | 0,15 s | 0,15 s | 0,33 s | 0,5 s |
| Quitter le mode louange | 0,08 s | 0,08 s | 0,1 s | 0,1 s |

Ce que ça dit :
- **La largeur de l'écran est la première cause.** Sur la version construite, la même action coûte 4 à 13 fois plus
  à 1 512 px qu'à 1 280 px, et presque tout ce temps est du calcul dans le navigateur (tâches longues). C'est le
  navigateur de l'appareil qui travaille : la puissance du mini-PC qui sert le site n'y change rien.
- **Le mode développement ajoute sa part** (≈ ×2,4 au lancement du mode louange à 1 280 px), mais n'explique pas
  l'écart de largeur.
- Piste déjà ouverte : R6 (`docs/spec-retouches-2026-11-21.md`), la mesure des lignes d'accords (`ChordLine`). À
  vérifier : pourquoi 1 512 px et pas 1 280 px (seuil de disposition), et si « Terminé » du Crayon a la même cause.

## 2. Toutes les actions (session d'audit, 21/11, nuit)

**Base mesurée** : commit `d383521` (avant R6), version construite (`NEXT_DIST_DIR=.next-prod next build`, puis
`next start -p 3300`), Chromium du conteneur (4 cœurs), session simulée (`tests/helpers/fakeSession.ts`, noms
fictifs). R6 a été poussée pendant l'audit (`fdce7d1`) : l'avant/après des actions qu'elle touche est au § 2.4.

**Méthode** (banc dans `scripts/perf/banc/`, mode d'emploi dans son `LISEZMOI.md`) : chaque action part du geste réel (premier `pointerdown` ou `keydown`)
et finit quand le DOM et le processeur se taisent (dernière mutation du DOM ou dernière tâche longue, suivie de
500 ms de calme). Entre parenthèses : la part en **tâches longues** (le navigateur ne répond plus) ; c'est le
« lag » ressenti. Une ouverture de page part de la navigation. Firestore : requêtes comptées dans la base simulée.
Une valeur de quelques dizaines de ms est sous le seuil de perception ; au-dessus de 0,3 s le geste « traîne ».

Largeurs : 390 px (téléphone, processeur ralenti ×4 par CDP), 810, 1 280, 1 512 px ; seuil balayé de 1 280 à 1 680 px.

### 2.1 Ce qui est lent (version construite, avant R6)

| Action | 1 280 px | 1 512 px | Firestore |
|---|---|---|---|
| Setlist : ouvrir la page (`/setlists/{id}`, 4 chants) | 1,39 s (0,45) | **4,88 s (3,90)** | 44 |
| Setlist : ouvrir « Affichage » | 0,34 s | **1,47 s (1,32)** | 0 |
| Setlist : fermer « Affichage » | 0,36 s | **4,86 s (4,74)** | 0 |
| Setlist : activer le Crayon | 0,10 s | **1,72 s (1,72)** | 0 |
| Setlist : quitter le Crayon (« Terminé ») | 0,09 s | **3,18 s (3,18)** | 0 |
| Mode louange : lancer | 0,88 à 1,12 s (0,65 à 0,92) | **4,5 à 5,0 s (4,3 à 4,8)** | 3 |
| Mode louange : Affichage › « Tout le chant » | 0,57 s (0,39) | **4,32 s (4,10)** | 3 |
| Mode louange : ouvrir le menu Setlist / Affichage | 0,41 s | 0,16 à 0,18 s | 2 |
| Mode louange : disposition « Partition » | 0,46 s (0,39) | 0,29 s | 2 |
| Mode louange : changer de chant (menu Setlist) | 0,23 s | 0,25 s | 1 |
| Ouvrir une page quelconque (chargement complet) | 0,4 à 1,5 s | 0,5 à 1,2 s | **25 à 107** |
| Chants : toucher un chant dans la liste | 0,59 s | 0,84 s | 19 |
| Navigation : onglet Setlists | 0,50 s | 0,65 s | 32 |
| Langue : passer en chinois | 0,49 s | 0,75 s | 17 |
| Chants : recherche (5 lettres tapées) | 0,40 s | 0,38 s | 0 |

### 2.2 Ce qui est rapide (sous 0,15 s à 1 280 et 1 512 px)

Page d'un chant, FR (`abba-pere`, `jireh`) comme ZH (`为我而来`) : Tonalité, transposition, chacun des réglages
d'« Affichage » (Lettres/Chiffres, Tout le chant/Une fois chacune/Plan, dispositions, couleurs, Pinyin, 简谱/Paroles),
Crayon, accord touché : tous entre 0 et 0,12 s, **sans écart de largeur**. Liste des chants : filtres, index
alphabétique, effacer. Setlist : sommaire, réglages d'Affichage un à un (0,02 à 0,14 s), accord touché. Mode louange :
page suivante (0,02 s ; 0,2 s quand elle change de chant), menus Repères et Outils, annotation (0,1 s), quitter
(0,1 s). Thème (0,06 à 0,35 s). Onglets Planning, Évènements, Moi, Chants (0,07 à 0,26 s).

Constat central : **la lenteur n'est pas « toutes les actions »**. Elle se concentre sur la page setlist et le mode
louange, à partir d'une certaine largeur d'écran, et sur le chargement de chaque page (requêtes à la base, § 3.2).
Les gestes qui recomposent toutes les lignes d'accords d'une setlist (ouvrir, fermer Affichage, Crayon, lancer le
mode louange, changer l'ordre des sections) coûtent 4 à 30 fois plus à 1 512 px qu'à 1 280 px.

### 2.3 Le téléphone (390 px, processeur ×4, version construite)

Avant R6 → après R6 (`fdce7d1`) :

| Action | avant R6 | après R6 |
|---|---|---|
| Mode louange : lancer | 2,9 à 4,8 s | **3,4 à 4,0 s** |
| Setlist : Liste → Partitions | 3,2 s (1,5 s la 2e fois) | **2,4 s** (1,6 s) |
| Ouvrir un chant (liste ou adresse) | 2,5 à 3,4 s | non remesuré (R6 n'y touche pas) |
| Mode louange : « Tout le chant » | 2,4 s | 1,6 s |
| Mode louange : changer de chant | 1,3 s | 1,2 s |
| Setlist : A+ / A− / Tout le chant | 0,3 à 1,3 s | 0,4 à 0,6 s |
| Ouvrir une page (chargement complet) | 1,0 à 3,8 s | — |

Au téléphone, « Repères » (3,2 s) et l'annotation (2,8 s) passent par Outils puis une ligne, en plusieurs gestes : le
chiffre les additionne et doit se lire comme un ordre de grandeur. À 810 px (tablette, processeur non ralenti), aucune
action ne dépasse 1,7 s.

### 2.4 Avant / après R6 (version construite)

| Action | 1 280 px avant → après | 1 512 px avant → après |
|---|---|---|
| Setlist : ouvrir la page | 1,39 → 1,60 s | **4,88 → 2,06 s** |
| Setlist : fermer « Affichage » | 0,36 → 0,32 s | **4,86 → 0,50 s** |
| Setlist : activer / quitter le Crayon | 0,10 / 0,09 → 0,07 / 0,09 s | **1,72 / 3,18 → 0,16 à 0,23 / 0,24 à 0,27 s** |
| Mode louange : lancer | 0,88 à 1,12 → 0,83 à 1,11 s | **4,5 à 5,0 → 1,57 à 1,73 s** |
| Mode louange : « Tout le chant » | 0,57 → 0,56 s | **4,32 → 0,80 s** |

R6 a supprimé l'essentiel de l'écart de largeur. Il en reste un, mesuré en balayant la largeur après R6 (§ 4.2) :
quitter le Crayon 76 ms à 1 280 px, 207 ms à 1 420 px, 293 ms à 1 680 px (mise en page 8 → 193 ms) ; lancer le mode
louange 0,96 s → 1,2 à 1,3 s.

### 2.5 Mode développement contre version construite

Même commit (après R6), même machine, 1 512 px : lancer le mode louange 2,6 à 3,0 s en `next dev` contre 1,6 à 1,7 s
construit (×1,7) ; quitter le Crayon 0,49 à 0,55 s contre 0,24 à 0,27 s (×2) ; « Tout le chant » 1,5 à 1,8 s contre
0,8 s (×2). Au téléphone (×4) en `next dev`, activer le Crayon de la setlist prend **8,6 s** et « Tout le chant »
10,7 s : le mode développement multiplie surtout le coût du rendu React (vérifications `jsxDEV`, § 4.1). La première
ouverture d'une page en `next dev` ajoute en plus sa compilation (13 s pour `/setlists/` ici).

## 3. Poids et requêtes

### 3.1 Requêtes à la base (Firestore) : la piste de Timothée

Comptées dans la base simulée, compte musicien ou admin, chargement complet de la page (`scripts/perf/`, § 2).
**La durée réelle de ces requêtes n'est pas mesurable ici** (base simulée, réponse instantanée) ; ce qui suit dit
combien de requêtes partent, pas combien de temps elles prennent chez Timothée. Chaque requête de collection
(`runQuery`) est facturée au nombre de documents rendus : sur la vraie base, une requête peut coûter des dizaines de
lectures.

| Page (chargement complet) | Requêtes Firestore |
|---|---|
| N'importe quelle page, même sans données (`/accords/`, `/harmonie/`) | **25 à 33** |
| Chants, page d'un chant | 15 à 18 (+ 1 à 2 si le compte est connu depuis peu) |
| Planning, accueil, Mes services | 34 à 35 |
| Setlists, une setlist | 39 à 44 |
| Moi (admin) | **70** |
| Back-office : À faire, Équipes, Planning, Messages, Usage | 66 à 70 |
| Back-office : Calendrier | **107** |
| Gestes sans changement de page | 0 à 3 (mode louange : 1 à 3 par réglage ; onglet Setlists : 32 ; onglet Moi : 36 ; passer en chinois : 17 à 25) |

D'où viennent les ≈ 30 requêtes communes (recherche dans le code, chaîne vérifiée par `git grep`) :
- **13 `plannings/{clé}/dimanches` + 8 `planningReleases/{clé}_{année}` + 1 `petitDej`** : `loadPlanningData`
  (`src/lib/planning/names.ts:33-60`), appelé par `useAccesHarmonie` (`src/lib/harmonie/useHarmonie.ts:44-62`), lui-même
  monté **5 ou 6 fois** dans le cadre commun : `MobileTabBar.tsx:34`, `useFormeAffichee`
  (`SelecteurEspace.tsx:62-65`) appelé par `Navbar.tsx:113`, `BarreLaterale.tsx:218`, `MobileTabBar.tsx:32`, et
  `useRetenirForme` (`SelecteurEspace.tsx:82-84`, `Navbar.tsx:118`). Seuls les caches de bas niveau (`grille.ts`,
  `sheets.ts`, 5 min) évitent que chaque instance relise tout ; `loadPlanningData` n'a pas de promesse partagée, et
  ces caches repartent à zéro à chaque chargement complet. Tout ça pour savoir si le membre a accès à Harmonie et
  quelle « forme » (espace) afficher.
- **2 `evenements`, 2 `notifications`, 4 à 8 `setlists`** : `NotificationsProvider` (`src/app/layout.tsx`) →
  `useNotifications` (`src/hooks/useNotifications.ts:60`, effet `:162-180`). La passe part deux fois : `refresh` dépend
  de `[user, profile]`, et l'arrivée du profil relance une passe sans passer par la garde de 60 s (`ECART_MIN_MS`).
  `getSetlistsSince` (`setlists.ts:317`) fait deux requêtes par passe et n'a pas de cache.
- **1 écriture `PATCH notifPrefs/{uid}` à chaque chargement** : `Navbar.tsx:89-99` (`saveNotifLang`) ; la garde est
  un `useRef`, vide à chaque chargement, sans comparaison avec la langue déjà enregistrée.
- `users/{uid}` (`users.ts:62`, seul cache partagé) et `onboarding/{uid}` (`Accueil.tsx:120-130`) : une fois chacun.
- **Admin, `/moi/` et back-office** : une requête `taches` et une `fois` **par équipe** (18 équipes) : `Apercus.tsx:143`
  → `useTaches` (`src/lib/taches/useTaches.ts:13`, sans cache) → `listTaches`/`listFoisEquipe`
  (`src/lib/firebase/taches.ts:78`, ≈ `:107`). Sur `/back-office/calendrier/`, les `taches` partent **trois fois** :
  `chargerCalendrier` (`lib/calendrier/charger.ts:70`, effet `CalendrierClient.tsx:194-199`, relancé quand le profil
  arrive) et la pastille « À faire » (`BarreLaterale.tsx:92` → `usePastilles.ts:29-45` → `lecture.ts:109-132`).

Ce que ça pèse dans le « lag » : sur la version construite, les gestes lents du § 2.1 envoient 0 à 3 requêtes ; leur
temps est du calcul local (tâches longues). Les requêtes pèsent sur **l'ouverture des pages et les changements
d'onglet** (Setlists : 32 requêtes au toucher de l'onglet, Moi : 36), et sur un téléphone en 4G ou un réseau d'église
chargé, où chaque aller-retour coûte 50 à 300 ms (ordre de grandeur, non mesuré ici). Firebase ne les envoie pas
toutes en série, mais le navigateur n'en mène que six à la fois par serveur en HTTP/1.1 (beaucoup plus en HTTP/2, le
cas de Firestore) : le coût est surtout la facture de lectures et le travail du téléphone, pas un mur de latence.

### 3.2 Poids

- **JavaScript par page** (chargement complet, version construite, compressé gzip / brut) : 500 à 910 Ko / 1,6 à
  2,9 Mo. Le socle commun est lourd : une page vide (`/accords/`) charge déjà 622 Ko / 1,97 Mo ; une setlist 909 Ko /
  2,88 Mo. Next 16 (Turbopack) n'affiche plus les tailles par route à la construction : mesuré dans le navigateur.
- Plus gros fichier construit : **le moteur PDF** (`@react-pdf/renderer`, 1,4 Mo, 464 Ko compressé). Il est importé à
  la demande (`SongDetailClient.tsx:496`, `SetlistDetailClient.tsx:974`, `lib/planning/exporter.tsx:67`) ; reste à
  vérifier qu'aucune page ne le précharge (non fait faute de temps). Viennent ensuite deux fichiers de 337 et 163 Ko
  (pinyin, accords).
- `public/songs-index.json` : 406 Ko, **30 Ko compressé**, chargé par la liste des chants : sans effet notable.
- Polices : chinoise (`SourceHanSansCN-Medium-sub.woff2`) 368 Ko, **pinyin `Andika-Regular.woff2` 296 Ko** (police
  latine complète pour quelques dizaines de lettres accentuées : un sous-ensemble ferait ≈ 20 à 40 Ko, estimé),
  KaiTi des titres 61 Ko, Atkinson et Gelasio 25 à 32 Ko chacune. Chargées sans préchargement (`preload: false`).
- Images 简谱 : 191 pages `.webp`, 134 Ko en moyenne (90 à 250 Ko) ; calque des accords `public/jianpu/chords.json`
  554 Ko (99 Ko compressé), chargé une fois dès qu'un scan s'affiche (`lib/jianpu/images.ts:87`).

## 4. Causes

### 4.1 Les dix actions les plus lentes et leur cause

Profils CPU (CDP `Profiler`, `next dev` après R6 pour avoir les noms, ramenés à `fichier:ligne` par les source maps ;
temps inclusifs). Classement sur la version construite.

| # | Action (pire largeur, version construite) | Avant R6 | Après R6 | Cause |
|---|---|---|---|---|
| 1 | Mode louange : lancer (1 512 px ; téléphone) | 5,0 s ; 4,8 s | 1,7 s ; 4,0 s | A puis B, C |
| 2 | Setlist : ouvrir la page (1 512 px) | 4,9 s | 2,1 s | A, B, D |
| 3 | Setlist : fermer « Affichage » (1 512 px) | 4,9 s | 0,5 s | A, C |
| 4 | Mode louange : « Tout le chant » (1 512 px ; téléphone) | 4,3 s ; 2,4 s | 0,8 s ; 1,6 s | A puis B |
| 5 | Setlist : quitter le Crayon (1 512 px) | 3,2 s | 0,27 s | A, C, B |
| 6 | Ouvrir un chant au téléphone | 2,5 à 3,4 s | (inchangé) | B, D, E |
| 7 | Setlist : Liste → Partitions (téléphone) | 3,2 s | 2,4 s | B |
| 8 | Mode louange : annotation, Repères (téléphone) | 2,8 à 3,2 s | idem | B (gestes en plusieurs temps) |
| 9 | Setlist : activer le Crayon (1 512 px ; téléphone en dev) | 1,7 s | 0,2 s ; 8,6 s en dev | B, C |
| 10 | Changer d'onglet vers Setlists / Moi, ouvrir une page | 0,5 à 2,4 s | idem | D, E |

**A. Mesure ligne par ligne des lignes d'accords** (`ChordLine.tsx`, avant R6 `:211-268`) : chaque ligne écrivait son
style puis relisait sa boîte, une mise en page forcée par ligne, sur toute la page. **Corrigée par R6** (mesure
groupée, `viderMesures`, `ChordLine.tsx:167`). Après R6, `viderMesures` pèse encore 0,6 s (dev) au lancement du mode
louange à 1 512 px.

**B. Toutes les lignes d'accords se re-rendent à chaque geste** : `ChordLine` (`ChordLine.tsx:202`) n'est pas
mémoïsé (aucun `memo` dans `ChordLine.tsx` ni `SongView.tsx`) ; le moindre changement d'état de la page setlist
(Crayon, Affichage, accord touché) ou du mode louange refait le rendu de chaque ligne, mot à mot (`:349-362`), avec un
nouveau `ref` en fonction par mot (`:360`), et refait `ZhLine` (`SongView.tsx:226`, `:431-443`). Profil, téléphone
(×4, dev), activer le Crayon : 9,6 s de processeur dont 2,7 s dans le rendu de `ChordLine` et 1,1 s dans `ZhLine`,
4,2 s de `jsxDEV`, pour un geste qui ne change aucune ligne. Mode louange, 1 512 px : rendu `ChordLine` 0,5 s,
`ZhLine` 0,2 s + 0,2 s de mesure (`SongView.tsx:342`), `PerformanceMode` 0,14 s ; le mode louange rend chaque chant
deux fois (page à l'écran et copie de mesure cachée). C'est la cause qui reste après R6, surtout au téléphone.

**C. Multicolonne CSS au-delà d'environ 1 400 px : pourquoi la largeur compte.** Balayage après R6 : la vue Partitions
de la setlist mesure 918 px de large à 1 280 et 1 360 px, puis 1 058 à 1 080 px dès 1 420 px ; le conteneur
`partition` passe alors 1 000 px et les sections des chants FR se posent en **deux colonnes CSS équilibrées**
(`[@container_partition_(min-width:1000px)]:columns-2`, `SongView.tsx:1574`, `PartitionView.tsx:305` ; largeur
`SetlistDetailClient.tsx:2348`). Une mise en page multicolonne équilibrée se recalcule en entier et en plusieurs
passes à chaque changement : quitter le Crayon passe de 8 ms de mise en page à 1 280 px à 129 ms à 1 420 px et 193 ms
à 1 680 px. Avant R6, chacune des ≈ 160 mises en page forcées par la mesure ligne par ligne (A) payait ce prix : d'où
le facteur 4 à 30 entre 1 280 et 1 512 px. Le seuil est donc entre 1 360 et 1 420 px de fenêtre (barre latérale
comprise), pas une règle sur 1 440 px.

**D. Requêtes communes et ouverture des pages** (§ 3.1) : 25 à 107 requêtes par chargement, dont ≈ 22 pour le
planning (5 ou 6 appels de `loadPlanningData`), une écriture inutile, des passes de notifications en double.

**E. Poids du JavaScript commun** (§ 3.2) : 620 Ko compressés avant le premier écran, à analyser et exécuter par un
téléphone à chaque chargement complet.

## 5. Corrections proposées (aucune codée ; chacune sur un go)

Gains « mesurés » : constatés ici sur un essai ; « estimés » : déduits du profil, à confirmer après codage.

| # | Correction | Gain attendu | Taille | Risque, tests | Dépend de | Forme |
|---|---|---|---|---|---|---|
| 1 | **Mémoïser les lignes** : `memo` sur `ChordLine`, `ZhLine`, `SectionView`, avec des props stables (jetons de l'AST déjà mémoïsés, rappels en `useCallback`) ; `ref` des mots par un tableau stable au lieu d'une fonction par mot | Estimé : Crayon, Affichage, accord touché sans rendu des lignes (téléphone : de plusieurs secondes à quelques centaines de ms) ; lancement du mode louange −30 à 50 % | 2 à 4 fichiers, 30 à 80 lignes | Une ligne qui ne se met plus à jour (notation, tonalité, couleur : le contexte `NotationAccordsContext` passe quand même) ; specs `lignes-accords`, `louange-accords`, `notation-accords`, `couleur-accords`, `ma-partition-*` | R6 (fait) | **Lot** court (une tranche) |
| 2 | **Une seule lecture du planning par page** : promesse partagée dans `loadPlanningData` (`names.ts:33`), ou `useAccesHarmonie` lu une fois dans un contexte | Mesurable : ≈ 22 requêtes de moins par chargement complet, sur toutes les pages | 1 à 2 fichiers, 10 à 30 lignes | Accès Harmonie ou forme d'espace faux après changement de rôle (invalidation) ; specs `harmonie-*`, `navigation-grand-ecran`, `chargement` | — | **Retouche** |
| 3 | **Supprimer l'écriture de langue à chaque chargement** : garde en `sessionStorage` ou comparaison avec `notifPrefs.lang` (`Navbar.tsx:89-99`) | Mesurable : une écriture Firestore de moins par chargement | 1 fichier, ≈ 10 lignes | Rappels envoyés dans l'ancienne langue si la garde est trop forte ; spec des préférences de notification | — | **Retouche** |
| 4 | **Notifications en une passe** : `refresh` qui ne dépend plus de `profile` entier (`useNotifications.ts`) et cache de `getSetlistsSince` | Mesurable : 4 à 6 requêtes de moins par chargement | 1 à 2 fichiers, 10 à 20 lignes | Pastille de notifications en retard ; specs notifications | — | **Retouche** |
| 5 | **Tâches par équipe lues une fois** : cache partagé (`useTaches`, `charger.ts:70`, `lecture.ts:109`) | Mesurable : 36 à 72 requêtes de moins sur `/moi/` et le calendrier du back-office (admin) | 3 fichiers, 30 à 60 lignes | À faire périmé après une coche (invalider à l'écriture) ; specs `taches-*`, `calendrier` | — | **Lot** court |
| 6 | **Multicolonne de la setlist sans équilibrage coûteux** : `column-fill: auto` avec hauteur, ou deux colonnes en grille calculées une fois, ou garder une colonne en Crayon | Mesuré : écart de largeur restant (mise en page 8 → 193 ms) ; estimé −0,3 à −0,5 s au lancement du mode louange à 1 512 px | 2 fichiers | Changement visible de la répartition des sections (planche ou avis de Timothée) ; specs `pupitre-partitions`, `dispositions-partition`, `coup-d-oeil` | 1 conseillé avant | **Lot** (touche l'apparence) |
| 7 | **Copie de mesure du mode louange allégée** : ne rendre en mesure que ce qui change la hauteur, ou réutiliser les mesures du chant déjà vu | Estimé : lancement −20 à 40 % | `PerformanceMode.tsx`, pagination | Pagination fausse (pages coupées) ; specs `louange-*`, `mode-louange-colonnes` ; **zone où codent UP-7 et R7** | 1 | **Lot** |
| 8 | **Police pinyin en sous-ensemble** (`Andika` 296 Ko → ≈ 30 Ko, estimé) dans `scripts/build-fonts.py` | Estimé : −260 Ko au premier chant chinois | script + police | Glyphe manquant (`npm run validate` le signale) | — | **Retouche** |
| 9 | **Vérifier le préchargement du moteur PDF** et analyser le socle JS commun (620 Ko) | À mesurer | — | — | — | Enquête |
| 10 | **Servir une version construite sur le mini-PC** (§ 6) | Mesuré : ×1,7 à ×2 sur les gestes, et plus de compilation à la première ouverture | Aucun code | Aucun | — | Réglage |

Ordre conseillé : 10 (immédiat, sans code), 2 + 3 + 4 ensemble (retouches indépendantes), 1, puis 6 et 7 sur
mesure, 5 si le back-office traîne, 8 et 9 à l'occasion.

## 6. En clair pour Timothée

Le site ne rame pas partout : les gestes de la page d'un chant, des menus et du planning réagissent en moins d'un
dixième de seconde. Ce qui traîne a quatre raisons :

1. **Les lignes d'accords se recalculaient une par une.** Sur un écran large, chaque ligne obligeait le navigateur à
   refaire la mise en page de toute la setlist. C'est corrigé ce soir (R6) : lancer le mode louange sur ton Mac passe
   d'environ 5 s à 1,7 s, et quitter le Crayon de 3 s à un quart de seconde.
2. **Chaque geste redessine toutes les lignes d'accords**, même celles qui ne changent pas. Sur iPhone, c'est encore
   3 à 4 s pour lancer le mode louange. La correction n° 1 (« mémoïser ») s'attaque à ça.
3. **Sur un écran de plus d'environ 1 400 px**, la setlist se met en deux colonnes, plus coûteuses à recalculer :
   c'est pour ça que ta grande fenêtre était bien plus lente qu'une petite.
4. **Ton intuition sur la base de données est juste pour l'ouverture des pages** : chaque page envoie 25 à 107
   lectures, dont une vingtaine pour le planning sur n'importe quelle page, et même une écriture inutile. Ça ne fait
   pas « laguer » les boutons, mais ça ralentit chaque ouverture, surtout au téléphone, et ça coûte des lectures. Trois
   petites retouches (n° 2, 3, 4) en retirent une trentaine par page.

**Le mode développement** (`npm run dev`) rend chaque geste à peu près **deux fois plus lent** et compile chaque page
à sa première ouverture (une dizaine de secondes). Pour servir sur le mini-PC une version construite :

```bash
git pull && npm ci && npm run build && npm run start -- -p 3000
```

(à relancer après chaque mise à jour du code ; `npm run build` refait l'index des chants puis le site). Sur l'iPhone,
c'est le téléphone qui calcule : seule la correction du code l'accélérera.

## 7. Corrections lancées (go de Timothée du 22/11/2026 : « Go corrige »)

Le go porte sur les corrections n° 1, 2, 3 et 4 du § 5 (et sur les tests rouges du mode louange, R8 de
`docs/spec-retouches-2026-11-21.md`). Les n° 5 à 9 n'ont pas de go.

- **P1 — n° 1, mémoïser les lignes** (une session) : `memo` sur `ChordLine`, `ZhLine`, `SectionView`, props stables.
  Le rendu ne change pas (boîtes des accords identiques avant/après, FR et ZH, cinq largeurs, comme en R6) ; une ligne
  doit toujours se mettre à jour quand sa notation, sa tonalité, sa couleur, sa taille, son pinyin, une retouche du
  Crayon ou un dessin changent. Mesures avant/après avec `scripts/perf/banc/` (téléphone ×4 et 1 512 px), écrites ici.
- **P2 — n° 2, 3 et 4, lectures de la base** (une session, un commit par retouche) : planning lu une fois par page,
  plus d'écriture de langue à chaque chargement, notifications en une passe. Nombre de requêtes par page avant/après
  (base simulée), écrit ici. Aucune permission ne change (`access.ts`, `firestore.rules` intacts).

### Avancement

