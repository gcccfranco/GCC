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

**Q14 — où mettre la page dictionnaire.** Proposition de l'entretien (non retenue pour l'instant) : une page
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

*(rempli au codage)*
