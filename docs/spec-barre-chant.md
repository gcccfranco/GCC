# Spec : barre de la page d'un chant — piste A « Une barre, tout dedans »

Spec écrite le 18/10/2026 ; **piste A choisie par Timothée le 18/10/2026**. **Q5 à Q8 tranchées le 18/10/2026** sur
les recommandations (Q5 seconde rangée sur téléphone, Q6 la fenêtre « Quel PDF ? » reste, Q7 vidéo sous la barre,
bouton marqué actif, Q8 partition jusqu'à 900 px en deux volets). **Go le 18/10/2026 pour T1, T2 et T3.** Planche : https://claude.ai/artifact/YQ9eoxRh7CmRsAtMgZ2TNw (rangée A).

## Mots de Timothée

> « Je crois qu'on a pas vu la disposition des pages des partitions et des boutons d'actions types augmenter la gamme,
> télécharger les partitions en pdf et tout dans l'onglet chant, fais-moi des propositions de dispositions, essaie
> d'utiliser au maximum la place que tu as sur le volet à droite de l'écran » ; puis, devant la planche (A, B, C) :
> « Je préfère la A » (18/10/2026).

Rappel de Christelle : « comme on s'est tous habitué à certains trucs, vaut mieux pas trop changer et perdre les
gens » (20/09/2026). A est la piste du moindre changement : mêmes commandes, même place, rien de nouveau à apprendre.

## Ce que le code montre (18/10/2026, captures 390 · 820 · 1 180 · 1 440 · 1 920 px)

- `src/app/songs/[slug]/SongDetailClient.tsx` : barre `barre-chant`, rangée `rangee-chant` bornée à `max-w-3xl`
  centrée ; le contenu (`main.song-zoom`) à `max-w-2xl`. Rangée : Retour (vers une setlist seulement en deux volets),
  pilule de tonalité (− · liste · + · ↺), groupe `groupe-chant` (A− A+, Accords, Pinyin pour un chant zh, menu ⋯),
  puis `hors-menu-chant` (Idées d'harmonie, PDF) poussé à droite par `ml-auto`.
- Menu ⋯ : Vidéo, Spotify, Apple Music, Couleurs par section, Personnaliser, PDF et Idées (`dans-menu-chant`,
  cachés dès la tablette debout), Signaler.
- `globals.css` (bloc « Lot U5, T5 ») : libellés dès 620 px de rangée (`.libelle-chant`), « Idées d'harmonie » dès
  760 px ; Idées et PDF hors du menu dès 768 × 500 px de fenêtre.
- Résultat en deux volets (volet de droite ≈ 700 px à 1 440, ≈ 645 px en tablette couchée) : la rangée flotte en
  deux pilules à gauche, le bouton PDF reste seul au bord droit ; Vidéo, écoute, signalement ne se voient qu'en
  ouvrant ⋯. À 1 920 px le volet fait ≈ 1 180 px mais la partition reste à ≈ 670 px (la 简谱 à 640 px), centrée.

## Décisions (tranchées le 18/10/2026)

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **La rangée prend toute la largeur du contenu** : plus de `max-w-3xl` propre ; elle s'aligne sur les bords de la partition (même largeur, même centrage que `main`). En deux volets : toute la largeur du volet de droite. Une seule ligne, toujours. | Planche A ; aujourd'hui la barre et la partition n'ont pas les mêmes bords, et le PDF se retrouve seul (`ml-auto`). |
| Q2 | **Ordre** : [Retour, vers une setlist] [− tonalité +, ↺] [A− A+] [Accords] [Pinyin, chant zh] — espace — [Vidéo, si le chant en a une] [PDF] [Idées, si `accesHarmonie.peut`] [⋯]. Un filet sépare « lire » (à gauche) de « faire » (à droite). | Les réglages de lecture restent où la main les cherche ; les actions forment un groupe. |
| Q3 | **Menu ⋯ réduit à** : Écouter (Spotify, Apple Music, s'ils existent), Couleurs par section, Personnaliser, Signaler. Vidéo, PDF et Idées n'y sont plus dès que la rangée les montre. | « Utiliser au maximum la place » : ce qui sert à chaque répétition sort du menu ; le reste est rare. |
| Q4 | **Libellés par priorité, mesurés sur la rangée** (requêtes de conteneur, comme aujourd'hui) : d'abord Vidéo, PDF, Idées ; puis Accords et Pinyin quand tout tient sur une ligne. Seuils fixés au codage par mesure sur FR et ZH (Pinyin en plus), jamais de deuxième ligne. Planche : tablette couchée = actions libellées, Accords et Pinyin en icônes ; ordinateur 1 440 = tout libellé pour un chant FR. | Un chant zh a un bouton de plus (Pinyin) : un seuil fixe ferait déborder la rangée à 698 px. |
| Q5 | **Téléphone** (et téléphone couché) : la rangée d'aujourd'hui ne change pas ; dessous, **une seconde rangée de boutons** Vidéo · PDF · Écouter · Idées · ⋯, qui défile en largeur si besoin, colle sous la première et s'escamote avec elle. *Alternative* : téléphone inchangé (tout reste dans ⋯). **Tranché : la seconde rangée.** | Planche A-tel. Sur téléphone, PDF et Idées sont aujourd'hui dans ⋯. |
| Q6 | **PDF** : le bouton ouvre la fenêtre « Quel PDF ? » comme aujourd'hui (dernier choix retenu par appareil). *Alternative* : télécharger d'un clic dans le dernier style, l'autre style par une petite flèche. **Tranché : garder la fenêtre** (A = ne rien réapprendre). | `PdfChoiceSheet`, décidé avec le lot 5 (`spec-export-pdf.md`). Je proposais le clic direct avec la planche ; A pousse à garder la fenêtre. |
| Q7 | **Vidéo** : le bouton ouvre et ferme le lecteur sous la barre, comme aujourd'hui ; il est marqué « actif » quand le lecteur est ouvert. **Tranché.** | `showVideo` existe déjà ; seule la place du bouton change. |
| Q8 | **Grand écran** : en deux volets, la partition peut s'élargir jusqu'à **900 px** au lieu de ≈ 670 (la 简谱 suit, l'intérieur du calque n'est pas touché) ; la barre suit la même largeur. *Alternative* : largeur inchangée. **Tranché : 900 px.** | Capture 1 920 : ≈ 300 px vides de chaque côté de la 简谱. L'intérieur de `JianpuSheet` est gelé, sa largeur d'affichage ne l'est pas — à vérifier par `npm run jianpu:audit` sur deux scans. |

## Hors champ

Barre de la setlist, mode louange, contenu des PDF, panneau Personnaliser, liste des chants, « Choisis un chant ».
Pas de nouvelle fonction (pas de « + Setlist »). Rien derrière `BACK_OFFICE` : la page chant est en ligne.

## Objectif et réussite

Sur ordinateur et tablette couchée, toutes les actions courantes d'un chant (tonalité, taille, accords, pinyin, vidéo,
PDF, idées) se voient sans ouvrir de menu, sur une seule ligne alignée sur la partition. **Réussite** : à 1 440 px,
Abba Père : une rangée de la largeur du volet, « PDF » à côté de « Vidéo » et « Idées », ⋯ ne contient plus
qu'Écouter, Couleurs, Personnaliser, Signaler ; 一生爱你 en tablette couchée : la même rangée sur une ligne, Pinyin
compris ; sur téléphone, la rangée d'aujourd'hui, et (Q5) la rangée d'actions dessous.

## Tranches

- **T1** — Rangée pleine largeur, ordre, sortie du menu, libellés par priorité (ordinateur, tablettes).
- **T2** — Téléphone (selon Q5).
- **T3** — Largeur 900 px en deux volets (selon Q8), avec la planche d'audit 简谱.

## Tests

Nouvelle spec `tests/barre-chant.spec.ts`, ajoutée à `SPECS_GRAND_ECRAN` (cinq projets) : 1 chant FR (Abba Père) et
1 chant ZH avec 简谱 (一生爱你) ; sur chaque appareil, la rangée tient sur une ligne (hauteur d'une rangée), chaque
action est joignable (visible, ou dans ⋯ là où la spec le dit), +1 demi-ton change la tonalité. À relancer :
`chants-deux-volets`, `harmonie-idees`, `recommended-key`, `transpose-alternatives`, `nouveau-chant`,
`lignes-accords`. Regard à l'œil sur les quatre dispositions et 1 440 px.

## Avancement

- **T1 (18/10/2026)** — rangée alignée sur la partition (`max-w-2xl`, mêmes marges que `main`), ordre de Q2 avec un
  filet entre « lire » et « faire », Vidéo · PDF · Idées · ⋯ sortis du menu dès la tablette debout (768 × 500 px,
  même seuil qu'avant), menu ⋯ réduit à Spotify, Apple Music, Couleurs, Personnaliser, Signalement ; Vidéo marquée
  active à l'encre (`aria-pressed`) ; le PDF ouvre toujours « Quel PDF ? ». Téléphone inchangé (T2).
  **Écart à Q4** : les libellés ne suivent pas des seuils de requête de conteneur mais une mesure de la rangée
  (`data-libelles` : tous, puis ceux des actions seuls, puis aucun). Mesuré le 18/10/2026 : sans libellé la rangée va
  de 419 px (一生爱你) à 537 px (中文 avec vidéo, ↺ et Retour) ; un seuil calé sur le pire cas cachait tout sur la
  tablette couchée (568 px de rangée), où la planche montre les actions libellées. Le court « Idées » (中文 « 灵感 »)
  remplace « Idées d'harmonie » dans la rangée (le nom accessible reste complet). Tests :
  `tests/barre-chant.spec.ts` (cinq projets) ; `lignes-accords` attend désormais l'hydratation avant de cliquer sur
  Accords (course vue sur tablette).
- **T2 (18/10/2026)** — téléphone, couché compris : la rangée d'avant sans ⋯ (A− A+ et Accords gagnent la place) ;
  dessous, la seconde rangée Vidéo · PDF · Écouter · Idées · ⋯, libellée, qui défile en largeur, dans la barre (elle
  colle et s'escamote avec elle) ; marges hautes recalées (partition 92 px au lieu de 48, vidéo 126 au lieu de 82).
  Le menu ⋯ ne porte plus Vidéo, PDF ni Idées nulle part ; Spotify et Apple Music y restent dès la tablette debout,
  sous « Écouter » sur téléphone. **À savoir** : aucun des 379 chants n'a aujourd'hui de lien Spotify ou Apple Music
  (`{spotify: …}`), donc « Écouter » ne s'affiche encore nulle part. Tests mis à la règle Q5 : `chants-deux-volets`
  (téléphone), `harmonie-idees` et `export-pdf` (le bouton de la barre partout) ; `harmonie-idees` lit ses écritures
  après l'idée enregistrée (`[data-idee]`, course vue sur téléphone et tablette).
