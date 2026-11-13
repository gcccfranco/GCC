# Spec : 简谱 sur deux volets, idées d'harmonie sur le scan, 简谱 d'office pour les musiciens (lot JV)

Session de cadrage du 13/11/2026 (diagnostic, planche, spec ; **aucun code**). **Attend le go de Timothée**, tranche
par tranche ou pour le lot (`CLAUDE.md`, § Go). Branche `claude/corrections-design`.

## Demande (Timothée, 13/11/2026, ses mots)

> « est ce que c'est possible de faire en sorte que les jianpu soient aussi sur deux volets quand c'est possible parce
> qu'avoir un truc comme ça c'est pas pratique, de plus les idées d'harmonies s'affichent bizarre en jianpu y'a pas
> d'idée d'harmonie alors que ce serait bien que ce le soit. Dans les setlists c'est mieux que tous les musiciens aient
> les jianpu par défaut et que ça ne dépende pas de ce que le président de séance à choisit »

Plus tôt : « pour tous les musiciens il faut que dans les setlists les jianpu soit par défaut ». Puis, relayé par le
pilote, sur la vue partitions du chant « Promesses » en paroles et accords : « la partition ici elle est affiché
bizarrement » (point 4 ci-dessous). Le point 5 du pilote (menu Setlist du mode louange) est traité à part, dans
`docs/spec-louange-tous-les-chants.md` § « Reprise du 13/11 ».

Points, dans l'ordre où ils se codent : **3** (简谱 d'office, codable seul, tranche JV-1), **4** (lecture des deux
colonnes), **1** (简谱 sur deux volets), **2** (idées d'harmonie : notation, puis scan).

---

## Point 3 — 简谱 d'office pour les musiciens dans les setlists

### Constat (prouvé)

- `src/lib/jianpu/preference.ts:33-37` : `sheetEnabled(pref, itemChoice)` ; préférence « auto » (personne n'a rien
  réglé) → `itemChoice !== false`, donc le « Paroles » du responsable (`jianpuSheet: false` sur l'item) l'emporte.
  « always » / « never » (la personne a touché l'interrupteur) l'emportent sur lui. C'est la décision **D4** de
  `docs/spec-jianpu-integration.md:31` (« le choix de la personne prime », lu au 08/10 : le choix du responsable ne
  vaut que pour qui n'a jamais touché l'interrupteur).
- Le responsable règle « Paroles » dans l'éditeur : `src/components/setlists/editeur/Volets.tsx:121` (lit
  `item.jianpuSheet !== false`) et `:128` (`onPatch({ jianpuSheet: sur })`) ; badge en lecture seule
  `src/components/setlists/editeur/ListeCourte.tsx:199`. L'interrupteur de la personne est ailleurs
  (`src/app/setlists/[id]/_components/MenusSetlist.tsx:118-128`, `changeJianpuPref`).
- Le rôle n'existe que dans le mode louange : `prefPourRole` (`preference.ts:52-54`) passe « auto » à « never » pour
  choriste et présidence ; appelé seulement à `src/components/performance/PerformanceMode.tsx:720`, avec `rolePreset`
  = le « Je joue » choisi par la personne (`getRole(uid)`, `PerformanceMode.tsx:468-475` ;
  `src/lib/performance/roleCompte.ts`, localStorage par compte, rien dans Firestore). Le rôle du planning
  (`rolePlanning`, `src/app/setlists/[id]/SetlistDetailClient.tsx:297-303`) n'est qu'une proposition au mode louange,
  « jamais appliquée seule ».
- Hors mode louange, `sheetEnabled` est appelé **sans rôle** : `SetlistDetailClient.tsx:995` et `:1823`,
  `_components/PartitionView.tsx:505`, `_components/ListView.tsx:276`, `_components/Sommaire.tsx:76`,
  `_components/IdeesDuChant.tsx:146`, `src/components/pdf/SetlistFullPDF.tsx:129`,
  `src/components/setlists/Pupitre.tsx:106`, `src/lib/performance/blocks.ts:172`. La page chant passe `undefined`
  (`src/app/songs/[slug]/SongDetailClient.tsx:194`) : non concernée.
- Les chants ajoutés dans le mode louange (« Avec 简谱 / Sans » du lot TC) écrivent aussi `jianpuSheet`
  (`src/lib/performance/ajoutsLocaux.ts:23`) mais passent d'abord par `choixScan` (`blocks.ts:172`,
  `ajoutsLocaux.ts:31`) : à garder tel quel.
- **Permissions** : aucune. `jianpuSheet` n'apparaît ni dans `firestore.rules` ni dans `src/lib/access.ts` (seule
  mention, un commentaire, `access.ts:865`). Rien à publier par Timothée.

### Proposition

Une seule règle, partout dans les setlists (vue Partitions, Liste, Sommaire, Pupitre, PDF de setlist, mode louange) :

| Préférence de la personne (son appareil) | Rôle « Je joue » | Ce qu'elle voit |
|---|---|---|
| « always » (interrupteur allumé par elle) | tout rôle | le scan |
| « never » (interrupteur éteint par elle) | tout rôle | paroles + pinyin |
| non réglée | choriste, présidence | paroles + pinyin |
| non réglée | musicien (pianiste, guitariste, batteur) ou pas de rôle | **le scan** |

Le `jianpuSheet` de l'item n'est plus lu pour décider (sauf `choixScan` des ajouts locaux). Concrètement :
`sheetEnabled(pref, role)` remplace `sheetEnabled(pref, itemChoice)` et absorbe `prefPourRole` ; les appelants hors
mode louange lisent le rôle par `getRole(uid)` (même source que le mode louange, déjà par compte).

**Le « Paroles » du responsable est retiré** de l'éditeur (`Volets.tsx`, badge de `ListeCourte.tsx`) : il ne
servirait plus qu'aux choristes, qui ont déjà paroles + pinyin par défaut. Le champ reste dans le type et dans les
setlists existantes (lecture tolérée, plus écrit, aucune migration Firestore) ; l'historique
(`SetlistHistory.tsx:75`) continue d'afficher les anciennes entrées.

### Questions à trancher

- **Q1 — Le « Paroles » du responsable** : retiré (**recommandé** : plus personne n'en a besoin, et la règle devient
  lisible) ou gardé pour les seuls choristes (un réglage de plus qui ne change rien par défaut).
- **Q2 — Le rôle hors mode louange** : la vue Partitions et le PDF suivent aussi le « Je joue » de la personne
  (**recommandé** : une choriste voit la même chose partout) ou seul le mode louange en tient compte (hors louange,
  tout le monde voit le scan par défaut). Le rôle du planning reste une proposition, jamais appliqué seul.

---

## Point 4 — Lecture des deux colonnes d'un chant en paroles (vue Partitions)

### Constat (prouvé)

- Les deux colonnes **lues en rangées** sont voulues : décision **P1** de `docs/spec-exemples-usage.md:25` (« Deux
  colonnes lues en rangées (Intro | Couplet 1, puis Refrain | Couplet 2) »), planche validée par Timothée le 11/11
  (« Ok » sur les onze questions, `spec-exemples-usage.md:3-5`). Codée en T4, commit `622160a4` (12/11/2026) :
  `src/app/setlists/[id]/_components/PartitionView.tsx:295`, grille CSS `grid-cols-2` sous requête de conteneur
  (≥ 1 000 px de zone), `items-start`, ordre du DOM = ordre du chant ; même grille dans `src/components/song/SongView.tsx`.
  Le compte rendu de T4 notait déjà la conséquence (« un cadre court laisse un vide sous lui jusqu'à la rangée
  suivante, lecture en rangées voulue », `spec-exemples-usage.md:294`).
- Ce n'est donc **pas une régression** ; c'est une décision que Timothée remet en cause sur pièce. Le mode louange,
  lui, remplit une colonne puis l'autre (`src/components/performance/DemiPage.tsx:131-141`, pages en deux colonnes) :
  les deux écrans se lisent différemment, ce qui explique l'impression de « bizarre ».
- « Les blocs d'une même rangée ne sont pas alignés en haut » : `items-start` les aligne en haut de la rangée ; ce
  que la capture montre est l'écart de hauteur entre un cadre court et un long (le suivant attend la rangée d'après),
  effet direct de P1.
- Les styles différents par section sont voulus (disposition « classique », `SongView.tsx:144-175` : couplet sans
  cadre, pré-refrain trait à gauche, refrain fond teinté, pont cadre ; couleurs gelées `--sec-*`, P8).
- Les sections répétées redéployées : affichage « Déroulé » (`played`), défaut de la préférence `partition-layout`
  (`src/lib/partitionLayoutPref.ts:11-15`), partagée avec le mode louange (`blocks.ts:162-165`) ; « Une fois »
  (`unique`) les replie. Voulu.

### Proposition

Rouvrir P1 : **lecture en colonnes** (une colonne descend, puis l'autre), comme le mode louange. Grille remplacée par
des colonnes CSS (`columns: 2`, sections en `break-inside: avoid`, équilibrage par défaut), sans changer l'ordre du
DOM ni le seuil (≈ 1 000 px de zone, 528 px par colonne, gouttière 24 px). Le scan 简谱 garde sa rangée entière en
attendant le point 1.

- **Q3 — Lecture des deux colonnes** : en colonnes, la gauche puis la droite (**recommandé**, comme le mode louange)
  ou en rangées (P1 actuel). Risque à dire : une section plus haute que la moitié de l'écran fait défiler la colonne
  gauche avant de passer à droite ; sur un chant long, il faut remonter pour lire la colonne droite.

---

## Point 1 — 简谱 sur deux volets

_Section complétée après la planche (ci-dessous)._

---

## Point 2 — Idées d'harmonie : « 4 → 4maj7 · F → Fmaj7 » et le scan 简谱

### Constat (prouvé)

- La ligne vient de la **bande d'H8**, dans le **mode louange** seulement :
  `src/components/performance/IdeeHarmonieMarge.tsx:112` rend `{enChiffres(avantL)} → {enChiffres(apresL)} ·
  {avantL} → {apresL}` ; seul utilisateur `PerformanceMode.tsx:71` et `:176-198`. La vue Partitions et la page chant
  n'ont pas cette bande (leur ligne « Ici », `src/components/accords/LigneIci.tsx:104`, suit **une seule** notation).
- Le mélange est **voulu par la spec** : `docs/spec-harmonie-accords.md:317-319` (« 4 5 → 2m7 5 · G A → Em7 A » ;
  « la bande montre les deux (le mode louange ne suit pas la bascule Lettres / Chiffres) »). Les valeurs sont justes :
  Promesses est en C (`content/songs/promesses.cho:3`), Pont F C Am G (`:32-34`) ; F = 4, Fmaj7 = 4maj7
  (`src/lib/harmonie/suggestions.ts:229-242`, `src/lib/harmonie/degres.ts:85-98`). Ce n'est donc pas une donnée
  fausse, mais une règle qui contredit H7-2 (`spec-harmonie-accords.md:289`, « une seule notation » pour les lignes
  d'harmonie) et que Timothée trouve « bizarre ».
- **Sur un scan 简谱, aucune idée** : décision 3 (`spec-harmonie-accords.md:55-56`, « rien sur le calque 简谱 », pour
  les chiffres) et H5 (`:183-185`, accord hors section : chiffre et Écouter seulement). Les étiquettes du calque
  (`src/components/jianpu/JianpuSheet.tsx:557`, `AccordTouchable`) ouvrent le panneau d'accord, mais `JianpuSheet` ne
  porte pas de `data-section-uids` : pas de passage, donc ni « Ici », ni point d'H8. `tests/harmonie-jianpu.spec.ts`
  ne teste que les retouches « Crayon » (`:7-12`), aucune idée.
- Données pour situer une idée sur le scan : `public/jianpu/sections.json` (par chant : `{id, label, ligne, page}`,
  début de chaque section) et `public/jianpu/chords.json` (par étiquette : `c, x, y, w, h`). Le lien entre l'`id` de
  `sections.json` (`verse-1`) et le passage du chant (`src/lib/setlist/sectionOrigins.ts:10-11`, `idDeSection`) est à
  établir : c'est le seul travail nouveau.

### Proposition

1. **Notation de la bande** (JV-4a, petite) : la bande suit la bascule Lettres / Chiffres comme le reste, une seule
   notation (« 4 → 4maj7 » ou « F → Fmaj7 »), en reprenant le test de `LigneIci.tsx:104` dans
   `IdeeHarmonieMarge.tsx:112`. Le mode louange n'a pas la bascule (`ChoixNotation` n'est rendu que dans
   `MenusSetlist.tsx:116` et la page chant) : la bande lit la préférence enregistrée de la personne
   (`src/lib/notationAccords.ts`, par compte, « lettres » par défaut), réglée hors du mode louange. Pas de bascule
   ajoutée au mode louange dans ce lot.
2. **Idées sur le scan** (JV-4b) : le même point d'H8 dans la marge gauche du scan, à la hauteur de la première ligne
   de chaque section qui a une idée (page et ligne de `sections.json`, hauteur de ligne tirée des `y` de
   `chords.json`) ; même bande dessous, même notation. Sur la page chant et la vue Partitions, les étiquettes du calque
   portent le passage de leur section (`data-section-uids`) pour que le panneau d'accord montre « Ici ».

- **Q4 — Notation de la bande** : une seule, celle de la bascule (**recommandé**, cohérent avec H7-2) ou les deux
  (décision H8 actuelle).
- **Q5 — Idées sur le scan** : point en marge à la hauteur de la section (**recommandé**, même geste qu'en paroles)
  ou une liste « Idées d'harmonie » au-dessus du scan (plus simple, mais loin de la musique).

---

## Tranches

_Complétées après la planche._

## Avancement

- 13/11/2026 : cadrage (diagnostic, planche, spec). Aucun code. Attend le go de Timothée.
