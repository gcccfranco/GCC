# Spec : dictionnaire d'accords — comment jouer un accord, à la guitare et au piano

Demande de Timothée du 21/10/2026 ; cadrée le jour même par un entretien (skill *grilling*), Q4 à Q7, Q9 à Q12 et Q15
à Q19 tranchées sur les recommandations. **Q14 (où mettre la page) reste ouverte** : Timothée veut d'abord revoir
l'inventaire de tout ce qui demande un accès particulier sur le site. Lot **DA**, après le lot IR
(`spec-idees-regroupees.md`, Q20).

**État : spec écrite le 21/10/2026, planche faite ; go le 21/10/2026 pour DA-1 à DA-3, sauf les portes d'entrée de la
page (Q14 ouverte) : ni bouton « Accords » sur la page Chants, ni entrée au menu du compte ; la page `/accords` existe,
joignable seulement par « Voir tout le dictionnaire » du panneau. Sur ordinateur, le panneau est une bulle ancrée sous
l'accord (planche) ; sur téléphone et tablette, une feuille du bas.**

## Mots de Timothée

> « Et aussi j'aimerais qu'il y ait une espèce de dictionnaire d'accords sur le site pour aider les musiciens à savoir
> comment jouer l'accord. » (21/10/2026)

## Ce que le code montre (21/10/2026)

- **Aucun dictionnaire.** Les seuls doigtés sont écrits à la main dans les fiches `docs/harmonie/` et dessinés par
  `src/components/harmonie/Diagrammes.tsx` : `DiagrammeGuitare({ doigte: "x02230" })` (6 caractères, grave → aigu,
  `x` étouffée, `0` à vide, chiffres 0-9 : **pas de case ≥ 10, pas de doigts, pas de barré dessiné**) et
  `Clavier({ notes })` (**une octave**, une seule main). Seul appelant : `FicheHarmonie.tsx`.
- **Accords des chants** (383 `.cho`, ~19 000 accords, ~2 950 avec basse) : majeur 12 865 · m 3 407 · m7 1 099 · 7 354 ·
  sus4 323 · **2** 244 · maj7 218 · maj9 35 · **4** 31 · dim 30 · **5** 27 · sus2 26 · add2 21 · m9 20 · 9 17 · 6 16 ·
  m7b5 15 · 7sus4 14 · add4 11 · puis une traîne (m11, 7b9, add9, 9sus4, 13, sus, 11, m6, dim7, 7#5, aug, m(maj7)…).
  Basses : toutes les notes, A, F#, E, B, C#, G# en tête. Des crochets portent des parenthèses : `[(D/F#)]`, `[(A)]`
  (accords facultatifs).
- **Toucher un accord ne fait rien en lecture** : `ChordLine.tsx:149-158` (span sans gestionnaire) ; en édition de
  « Ma version », c'est la **ligne** qui se touche (`SongView.tsx:683-690`) ; sur la 简谱, la zone de retouche
  (`JianpuSheet.tsx:684-700`) n'existe qu'en édition de setlist ; mode louange : gestes de page (`PerformanceMode`).
- **Capo** : la 简谱 et le mode louange affichent les accords « en positions » avec un capo (`JianpuSheet.tsx:217-220`).
- **Instrument du musicien** : `useInstrument` (`src/lib/harmonie/useHarmonie.ts:69`), tiré des colonnes Piano /
  Guitare du planning.
- **Navigation** : barre du bas = Chants, Setlists, Planning, Évènements, Moi (membre) ; Chants, Évènements
  (visiteur) — `src/lib/navigation.ts:34-46`. « Harmonie » est dans le menu du compte et demande un compte **et** un
  service piano ou guitare : **le dictionnaire ne peut pas y vivre** (Q7 : ouvert à tous).

## Décisions (tranchées le 21/10/2026)

| # | Décision |
| --- | --- |
| Q4 | **Deux entrées** : une page dictionnaire (avec recherche) **et** toucher un accord dans un chant ouvre son doigté dans un panneau. |
| Q5 | **Guitare et piano.** Premier onglet = l'instrument du musicien (`useInstrument`) ; visiteur ou sans instrument : guitare. On change d'un geste ; le dernier choix est retenu sur l'appareil. |
| Q6 | **12 notes × les qualités utilisées dans les chants** (liste ci-dessus, traîne comprise), plus les accords avec basse. Tout accord rencontré après transposition est donc dans le dictionnaire. |
| Q7 | **Ouvert à tous, sans compte, en ligne** (pas derrière `BACK_OFFICE`, pas derrière l'accès Harmonie). |
| Q9 | **Guitare : le doigté le plus simple d'abord** (ouvert si possible, sinon barré), puis **une ou deux autres positions** qu'on fait défiler (« Autre position », 1/3). |
| Q10 | **Accords avec basse** : vrai doigté pour les formes courantes, écrites à la main (`D/F#`, `G/B`, `C/E`, `A/C#`, `E/G#`, `F/A`, `G/D`, `C/G`, `D/A`, `Am/G`, `Em/D`, `B/D#`… : la liste se fixe au codage sur les basses les plus fréquentes des chants) ; sinon l'accord de base avec « basse F# » écrit à côté. |
| Q11 | **Piano : main gauche (la basse, ou la fondamentale) + main droite (l'accord)**, sur deux octaves ; un `D/F#` met fa# à la main gauche. |
| Q12 | **L'écriture suit le chant** (`Bb` reste `Bb`, `A#` reste `A#`) ; la recherche trouve l'un par l'autre. |
| Q13 | Dans « Idées d'harmonie », **toucher un accord proposé** (`Em7`) ouvre son doigté. |
| Q15 | **Toucher un accord ouvre le panneau en lecture seulement** : page chant, partition d'une setlist hors édition, calque des accords sur la 简谱 (lecture). **Jamais** en édition (« Ma version », Adapter, retouche 简谱) ni en mode louange. |
| Q16 | **Rien de visible au repos.** Survol souris : accord souligné, curseur main. Toucher : léger fond à l'appui. **Une seule fois** par appareil, une bulle : « Touchez un accord pour voir comment le jouer ». Le clavier y mène aussi (accord focalisable, Entrée). |
| Q17 | **`D2` = Dsus2** (sans tierce), **`D4` = Dsus4**, **`D5` = accord de puissance** (fondamentale + quinte). Le panneau l'écrit : « D2 = Dsus2 ». |
| Q18 | **Accord sans doigté de guitare connu** : le piano s'affiche toujours (il se calcule) ; la guitare dit « Pas encore de doigté » avec **Signaler** (le signalement existant, `/api/report`, accord et chant pré-remplis). Jamais de doigté de guitare calculé à l'aveugle. Les parenthèses `(D/F#)` s'ignorent : on ouvre `D/F#`. |
| Q19 | **Notes en lettres** (C, E, G), comme les accords du site ; une ligne d'aide en haut de la page donne C = Do, D = Ré… |
| — | **Transposition et capo** : le panneau montre **l'accord tel qu'il est affiché** (transposé ; en positions s'il y a un capo, avec « capo 2 » rappelé dans le panneau). |
| — | **Français et 中文**, comme le reste du site. |

## À trancher

**Q14 — où mettre la page dictionnaire.** *Fermée le 02/11/2026 par `spec-espace-musiciens.md` (Q3) : l'entrée « Accords » de l'espace Musiciens, pour les musiciens ; les autres y arrivent par le panneau d'un accord, comme aujourd'hui.* Proposition de l'entretien (non retenue pour l'instant) : une page
`/accords`, sans compte, avec un bouton « Accords » en haut de la page Chants, une ligne dans le menu du compte, et
« Voir tout le dictionnaire » dans le panneau. Timothée veut d'abord **l'inventaire des accès du site** (rôles,
compte, équipes…) pour revoir l'ensemble ; carte des accès et emplacement proposé :
https://claude.ai/artifact/RVnkQYaFbyyBgZ8ti4ET6s. La refonte des accès (doublons de droits) sera un chantier à part.

**Planche** (21/10/2026, à regarder par Timothée) : https://claude.ai/artifact/TvcfEjNLGYC8QjJYBhnQND — la page aux quatre dispositions + 1 440 px ; le panneau d'un accord (guitare avec
« Autre position », piano à deux mains) au téléphone et à l'ordinateur ; la bulle d'aide ; la carte d'idée
d'harmonie avec ses accords touchables.

## Données

- `src/lib/accords/` (nouveau, pur, testable) :
  - `analyse.ts` : lit une étiquette (`F#m7b5/C`, `(D/F#)`, `Bb2`) → `{ fondamentale, qualite, basse }` ; refuse
    proprement ce qu'il ne comprend pas. Réutilise `noteToIndex` de `src/lib/transpose.ts`.
  - `notes.ts` : qualité → intervalles (table explicite, une ligne par qualité de la liste Q6) → notes ; sert au piano
    (calcul) et à la vérification de la guitare.
  - `guitare.ts` : **table écrite à la main** de formes par qualité : formes ouvertes connues (C, A, G, E, D…) et formes
    barrées mobiles (type E et type A, + type C/D quand utile) d'où se tirent les 12 fondamentales ; accords avec basse
    courants (Q10). Chaque doigté porte cases, doigts (1-4), barré éventuel et case de départ.
  - **Garde-fou** : un test vérifie que **chaque** doigté de la table sonne bien les notes de l'accord (`notes.ts`),
    et que chaque accord des 383 chants (et ses 11 transpositions) trouve au moins un piano, et une guitare ou un
    « Pas encore de doigté » assumé (liste des manquants imprimée par le test).
- `Diagrammes.tsx` : étendre `DiagrammeGuitare` (case de départ ≥ 1 affichée « 5fr », barré, numéros de doigts) et
  `Clavier` (deux octaves, deux mains distinguées) **sans casser** les fiches Harmonie qui l'appellent avec le format
  actuel.

## Tranches (après Q14, la planche et le go)

- **DA-1** — Données et dessins : `src/lib/accords/`, extension des diagrammes, test garde-fou.
- **DA-2** — Le panneau d'un accord (guitare/piano, autres positions, « Pas encore de doigté » + Signaler) et la page
  dictionnaire (recherche, emplacement selon Q14), FR et 中文.
- **DA-3** — Toucher un accord : partition texte en lecture (page chant, setlist hors édition), calque 简谱 en lecture,
  accords des cartes d'« Idées d'harmonie » ; bulle d'aide une fois ; rien en édition ni en mode louange.

## Vérification

- Tests unitaires (Playwright, sans page) : `analyse`, `notes`, garde-fou de la table de guitare sur tout le
  répertoire.
- Playwright, trois appareils : toucher un accord d'un chant FR et d'un chant ZH ouvre le bon doigté, transposé (+1
  demi-ton) ; aucun panneau en édition « Ma version » ni en mode louange (helper `onStage`) ; recherche `A#` trouve
  `Bb`. La page dictionnaire entre dans `SPECS_GRAND_ECRAN` (cinq projets).
- À l'œil, aux quatre dispositions + 1 440 px : page, panneau, bulle.

## Avancement

**DA-1 à DA-3 codés et poussés le 21/10/2026, à valider par Timothée** (sans les portes d'entrée de `/accords`, Q14
ouverte).

- **DA-1** (`956ed5c`) : `src/lib/accords/` — `analyse.ts` (alias D2 = Dsus2, D4, D5, `C3` = retour à la tierce,
  `sus7` = 7sus4), `notes.ts` (notes épelées par degré, piano main gauche = basse, main droite en position serrée ;
  trois octaves si l'accord déborde), `table.ts` (formes ouvertes, barrés mobiles types E/A/D, accords avec basse :
  tierce, quinte, seconde, septième, onzième à la basse, et une trentaine d'accords avec basse ouverts écrits à la
  main), `guitare.ts` (recherche par classes de hauteur, ouvert d'abord, trois positions au plus). Diagrammes : grille
  « grand » de **5 cases** (la planche en dessine 4 ; la forme mobile add9 en couvre 5), barré, doigts, « 5fr » ;
  `ClavierMains`. Garde-fou (`tests/accords-garde-fou.spec.ts`) : chaque doigté sonne l'accord (658 formes mobiles
  sur 12 fondamentales, toutes justes) ; 1 045 accords distincts des 383 chants × 12 tonalités : 701 avec vraie
  forme, 318 en « basse à part » (doigté de l'accord + « basse X à jouer en plus »), **26 sans doigté de guitare**,
  tous `dim9` et `7#11` (Adim9, F#dim9, Ab7#11 du répertoire et leurs transpositions) : « Pas encore de doigté ».
- **DA-2** (`33a1de1`) : `PanneauAccord`, `AccordsProvider` (feuille du bas ; bulle ancrée sur ordinateur, souris
  ≥ 1 024 px), page `/accords` publique (recherche, `A#` allume `Bb`, `?accord=`), FR et 中文. `useInstrument` prend
  une préférence (guitare pour le dictionnaire, piano inchangé pour le catalogue Harmonie) ; `ReportDialog` accepte un
  titre et une description pré-remplis (Signaler un doigté manquant ; réservé aux membres connectés, comme avant).
- **DA-3** (`caf2aa9`) : `AccordTouchable` dans `ChordLine`, `ZhLine`, `JianpuLine` et le calque 简谱 en lecture ;
  montés sur la page chant et la partition de setlist hors édition ; inertes en édition et en mode louange (contexte
  inactif par défaut). Bulle d'aide une fois par appareil (`accords-aide-vue`). Accords des cartes d'« Idées
  d'harmonie » touchables (sur le code du lot IR).
- **Écarts** : le capo n'existe qu'en mode louange, où le panneau ne s'ouvre pas ; la ligne « Capo N » du panneau est
  donc prête mais ne se voit nulle part aujourd'hui. Grille de 5 cases au lieu de 4. Sur ordinateur à 720 px de haut,
  la bulle d'un accord bas sur l'écran se cale sur l'accord sans flèche (place insuffisante dessous et dessus).
- **Tests** : `accords-donnees`, `accords-garde-fou`, `accords-toucher` (trois appareils) ; `accords-page`,
  `accords-toucher-agencement` (cinq projets, captures). Échecs antérieurs à DA, non liés : `harmonie-jianpu.spec.ts`
  (4 tests « Adapter », lignes 105-157) et `jianpu-par-defaut.spec.ts:357` (page `/edit`).
- **À regarder par Timothée** : la page `/accords` (téléphone, tablette, ordinateur) ; toucher un accord d'un chant FR
  et d'un chant ZH ; la bulle d'aide ; le 中文 des libellés du panneau (écrit par l'agent).

## DA-4 — trois positions à la guitare, renversements au piano (02/11/2026)

**État : spec écrite le 02/11/2026 ; Q-DA4-1 et Q-DA4-2 tranchées sur les recommandations et go pour DA-4 (DA-4a et
DA-4b) le 02/11/2026, session orchestratrice.**

### Mots de Timothée

> « Est-ce que dans le dictionnaire des accords, c'est une bonne idée de proposer pour chaque accord tous les voicings
> de l'accord ? » — réponse : non (trop de choix, doigtés calculés contraires à Q18, panneau illisible au-delà de
> 3) ; compléter jusqu'à trois positions et ajouter les renversements au piano. Puis : « écris la spec DA-4,
> 3 positions et renversements partout » (02/11/2026). « Partout » = **dans le panneau d'un accord et sur la page
> `/accords`**, comme le reste du dictionnaire.

### Ce que le code montre (02/11/2026)

- `positionsGuitare` (`src/lib/accords/guitare.ts`) : formes ouvertes, puis formes mobiles de la plus basse à la plus
  haute, `slice(0, 3)`. Les formes mobiles (`MOBILES`, `src/lib/accords/table.ts`) n'existent souvent qu'en une ou
  deux exemplaires : majeur, m, 7, m7, sus4 = barrés type E et type A ; `sus2`, `6`, `m6`, `add9`, `add4`, `maj9`,
  `m9`, `9`, `dim`… = **une seule forme**.
- Mesuré sur les 383 chants (19 140 accords joués, tels qu'écrits) : **3 positions pour 11 702 (61 %), 2 pour 6 805
  (36 %), 1 pour 630 (3 %)**, 3 sans doigté (dim9, 7#11). Les plus joués à 2 positions : F (1 246), Bm (605), Bb
  (558), B (496), F#m (480), D/F# (397), C#m (339), Bm7 (242). À 1 position : Bb/C (77), F/G (47), Bb/F (35), A/B
  (30), E2 (26), les `maj9`, `dim`, `9`, `7b9`.
- Sur les 12 fondamentales : 2 = `sus2` n'a qu'une position dans 7 tonalités sur 12, `9` dans les 12, `maj9`, `m9`,
  `m6`, `dim`, `add4`, `add9` dans 9 à 11.
- Piano (`voicingPiano`, `src/lib/accords/notes.ts`) : **une seule disposition** — main gauche = la basse, main
  droite = l'accord serré, fondamentale en bas, juste au-dessus de la main gauche. `PanneauAccord.tsx` ne montre
  aucune flèche côté piano.

### Décisions

| # | Décision |
| --- | --- |
| R1 | **Guitare : trois positions au plus, comme Q9** ; le but devient **trois pour toute qualité courante sans basse**, sur les 12 fondamentales : majeur, m, 7, m7, maj7, sus4, sus2 (= 2), 7sus4, add9, 6, m6, maj9, m9, 9, add4, dim, m7b5, 5. La traîne (m11, 11, 13, 7b9, 7#5, 9sus4, madd9, dim7, aug, m(maj7)) : **deux au moins**. dim9 et 7#11 restent « Pas encore de doigté » (Q18). |
| R2 | **Trois zones du manche** : la 1re position reste la plus simple (ouverte si possible, sinon le barré le plus bas : rien ne change pour ce qu'on voit aujourd'hui) ; les deux autres sont choisies **dans des zones différentes** — la plus basse case pressée d'une position diffère d'au moins 3 cases de celles déjà retenues. Exemple F (à confirmer au codage, selon les formes écrites) : barré case 1 (type E, `133211`) ; la forme type D `xx3565` est écartée (case 3, à 2 cases du barré) ; restent la forme type C `x8756x` (case 5) et le barré type A `x8.10.10.10.8` (case 8), à 3 cases l'une de l'autre. Si la règle ne trouve pas trois zones, on complète par les formes restantes, de la plus basse à la plus haute. |
| R3 | **Toujours écrit à la main** (Q18 inchangée) : les nouvelles formes vont dans `MOBILES` / `OUVERTES`, aucune n'est calculée. Formes à ajouter en priorité : type D (4e corde) pour majeur, m, 7, m7, maj7, sus4, sus2 ; type E ou type C pour sus2, 6, m6, add9, maj9, m9, 9, add4, dim. La liste exacte se fixe au codage, guidée par le test R6. |
| R4 | **Jouable** : au plus 4 doigts (pouce compris si `P`), un barré au plus, **écart de 4 cases au plus** entre la plus basse et la plus haute case pressée hors barré (5 pour les formes add9 déjà admises), case ≤ 15 (`CASE_MAX`), basse = la fondamentale (ou la basse de l'accord avec basse). |
| R5 | **Piano : trois renversements de la main droite**, dans le panneau et sur la page : état fondamental (ce qu'on voit aujourd'hui, toujours en premier), 1er renversement (tierce en bas, ou la 2e note de l'accord), 2e renversement (la 3e note en bas). Les accords de 4 notes et plus s'arrêtent là (le 3e renversement n'est pas proposé) ; un accord de 2 notes (`5`) n'a que deux dispositions ; on n'affiche jamais deux fois le même jeu de touches. La **main gauche ne bouge pas** (Q11 : la basse, ou la fondamentale) ; la main droite reste strictement au-dessus d'elle, le plus bas possible ; le clavier s'étend à trois octaves si besoin, comme aujourd'hui. Calculé : c'est permis au piano (Q18 ne vise que la guitare). |
| R6 | **Même geste qu'à la guitare** : sous le clavier, la rangée de flèches de la guitare telle quelle (‹ › ronds, texte au milieu, `aria-live`), texte « État fondamental · 1 sur 3 », « 1er renversement · 2 sur 3 », « 2e renversement · 3 sur 3 » ; 中文 « 原位 · 第 1 种，共 3 种 », « 第一转位 · … », « 第二转位 · … ». Les lignes « Main gauche : … · Main droite : … » suivent le renversement affiché. Le choix repart du premier quand l'accord change (comme la guitare) ; rien n'est retenu sur l'appareil. |
| R7 | **Accords avec basse** (Q-DA4-1, tranchée) : le but de trois positions ne s'applique pas à eux ; on ajoute une 2e forme mobile pour la seconde, la tierce et la quinte à la basse (clés `/2`, `/4`, `/7`), le reste est inchangé. Au piano, leurs renversements s'appliquent à la main droite seule (`D/F#` : fa# à gauche ; ré fa# la, fa# la ré, la ré fa# à droite). |

### Tranché le 02/11/2026 (sur les recommandations)

- **Q-DA4-1 — accords avec basse.** 2 950 accords joués ; les plus courants à une seule position : Bb/C, F/G, A/B
  (accord majeur avec la seconde à la basse), Bb/F (quinte à la basse). **Recommandation** : pas de but chiffré ;
  ajouter une 2e forme mobile pour les trois basses les plus jouées (seconde, tierce, quinte : clés `/2`, `/4`,
  `/7` de `MOBILES`), sans viser trois.
- **Q-DA4-2 — planche.** Le changement d'apparence se limite à la rangée de flèches de la guitare recopiée sous le
  clavier. **Recommandation** : pas de planche ; les captures des cinq projets à la vérification en tiennent lieu.

### Tranches (après le go)

- **DA-4a — guitare** : formes ajoutées à `table.ts` ; sélection par zones (R2) dans `positionsGuitare` ;
  `MAX_DOIGTES` reste 3. Aucun changement d'interface.
- **DA-4b — piano** : `voicingPiano` rend la liste des renversements (`renversementsPiano`, ou un paramètre) ;
  `PanneauAccord.tsx` ajoute la rangée de flèches côté piano ; libellés FR et 中文 (`src/locales/fr.json`,
  `zh-CN.json`, clés `accords.*`).

### Vérification

- `tests/accords-garde-fou.spec.ts` (étendu) : chaque nouvelle forme sonne l'accord sur les 12 fondamentales (le test
  existant le fait déjà pour toute forme de `MOBILES`) ; **chaque forme est jouable (R4)** ; **chaque qualité de R1
  a trois positions sur les 12 fondamentales**, la traîne deux (liste des manques imprimée) ; les trois positions sont
  dans trois zones quand la table le permet (R2) ; la 1re position de chaque accord des chants est **la même
  qu'avant DA-4** (rien ne bouge pour ce qu'on voit d'abord).
- Piano (sans page) : chaque renversement contient exactement les notes de l'accord, la bonne note en bas de la main
  droite, la main droite au-dessus de la gauche ; pas deux renversements identiques ; l'état fondamental est celui
  d'avant DA-4.
- Playwright, trois appareils : sur un chant FR et un chant ZH, toucher `F` (ou un accord du chant qui en a trois)
  montre « Position 1 sur 3 » et les trois diagrammes ; onglet Piano, les flèches passent du fondamental au 2e
  renversement et les lignes main gauche / main droite suivent ; transposé +1 demi-ton, le panneau suit ; page
  `/accords` pareil. `accords-toucher-agencement` et `accords-page` (cinq projets) : captures du piano avec flèches.
- À l'œil, aux quatre dispositions + 1 440 px : panneau (feuille du bas, bulle de l'ordinateur), carte de la page.

### Avancement (DA-4)

**DA-4a et DA-4b codés et poussés le 02/11/2026 sur `claude/adoring-wright-4ilq21`, à valider par Timothée.** **En ligne le 02/11/2026** (ordre de Timothée ; avance rapide de `main` sur la branche).

- **DA-4a** (`9b27a79`, `c6e0192`) : `MOBILES_SECONDES` (`table.ts`), formes écrites à la main (forme de ré sur la
  4e corde, forme de do, formes sur la 6e corde), qui ne passent jamais en premier ; 2e forme pour `/2` et `/7`
  (`/4` en avait déjà deux). `positionsGuitare` : 1re position d'avant, puis deux autres dans d'autres zones (plus
  basses cases à 3 cases au moins), à défaut complétées de la plus basse à la plus haute ; une forme contenue dans
  une autre (`x3231x` dans `x32310`) n'est pas une autre position. F = `133211`, `x8756x`, `x8.10.10.10.8` (exemple
  de R2). **Toutes les qualités de R1 ont trois positions sur les 12 fondamentales, la traîne deux au moins** ;
  dim9 et 7#11 toujours sans doigté. Sur les 19 140 accords joués des chants : **3 positions pour 17 646 (92 %)**,
  2 pour 1 331 (D/F#, A/C#, B/D#, Bb/C, F/C, F/G… et les `sus2`/`2` dont la 3e forme est hors du manche), 1 pour
  160 (accords avec basse rares : B/E, Bbmaj7/F, E/A, A/D…), 3 sans doigté.
- **DA-4b** (`71a652b`) : `renversementsPiano` (`notes.ts`), rangée de flèches sous le clavier (panneau, bulle,
  carte de `/accords`), libellés fr / 中文.
- **Tests** : garde-fou étendu — jouabilité R4, comptes R1 (liste des manques imprimée : aucune), zones R2 (échoue
  si trois zones étaient possibles dans la table et n'ont pas été retenues ; 122 accords qualité × fondamentale
  restent hors zones faute de formes, complétés), 1re position inchangée pour 1 097 accords (instantané
  `tests/fixtures/accords-premieres-positions.json`, pris avant DA-4 par `scripts/accords-premieres-positions.ts`),
  renversements du piano. Playwright : 209 tests verts (`accords-*`, trois appareils ; `accords-page` et
  `accords-toucher-agencement` sur les cinq projets) ; captures regardées. Échecs antérieurs connus non relancés :
  `harmonie-jianpu.spec.ts` « Adapter », `jianpu-par-defaut.spec.ts:357`.
- **Écarts** : la forme `/4` avec pouce (`Px1243`, d'avant DA-4) compte 5 doigts et dépasse R4 ; gardée pour ne
  changer aucune 1re position (B/D#, F#/A#…), exemptée et nommée dans le test. La règle des zones retire des
  positions d'avant : G perd `320033` et le barré case 3 (remplacés par `xx5787`), E7 perd `x79797`, A/C# perd
  `x4222x` (contenu dans `x42220`). Au piano, un renversement peut descendre sous l'état fondamental (C : do mi sol
  à l'octave, puis mi sol do juste au-dessus du do de la main gauche) : c'est « le plus bas possible » de R5.
- **À regarder par Timothée** : les nouveaux doigtés (F, Bm, Bb, B, F#m, sus2, maj9, m9, 9 : page `/accords`) et
  les flèches du piano, sur un chant FR et un chant ZH.
