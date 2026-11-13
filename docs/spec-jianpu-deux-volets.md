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

## Questions à Timothée (récapitulatif, la recommandation en premier)

| # | Question | Recommandation |
|---|---|---|
| Q1 | « Paroles » du responsable dans l'éditeur | **Tranchée : retiré** (Timothée, 13/11 : « oui ») |
| Q2 | Le « Je joue » compte-t-il hors du mode louange ? | **Tranchée : oui**, partout dans la setlist (Timothée, 13/11 : « oui ») |
| Q3 | Deux colonnes d'un chant en paroles | **Tranchée : lues en colonnes** (Timothée, 13/11 : « oui pour ce que tu propsoes ») ; rouvre P1 |
| Q6 | Piste pour le 简谱 en deux volets | **B**, demi-lignes en deux colonnes (taille de lecture gardée) |
| Q7 | Le mode louange aussi ? | **Oui**, sous l'interrupteur « 2 colonnes » existant |
| Q4 | Notation de la bande d'idée d'harmonie | **Une seule**, celle choisie par la personne (Lettres par défaut) |
| Q5 | Idées d'harmonie sur le scan | **Remplacée** : toucher une section montre toutes ses propositions (§ Point 2, « Reprise du 13/11 ») ; **tranchée : le volet Harmonie** s'ouvre au toucher du nom de la section (Timothée, 13/11, « Ok ») |

Tranchées par la session (décisions déléguées, 13/11, faciles à défaire) : seuil d'une colonne sous 11 px d'accords
imprimés ; coupe entre colonnes au début de section si l'écart ne dépasse pas deux demi-lignes ; page chant inchangée.
JV-1 n'attend que Q1 et Q2.

**Go de Timothée (13/11/2026, 16 h 40 UTC environ : « go pour les pistes des 2 artefacts »)** : Q6 = **B**, Q7 = **oui**
(le mode louange aussi, dans la piste B de la planche). Couvre **JV-3 puis JV-4** (tranches enchaînées, `CLAUDE.md`
§ Go), avec les décisions déléguées ci-dessus ; levée de la décision du 03/10 (`spec-deux-volets.md`) à écrire datée en
JV-4. **Pas encore de go** : JV-1 (Q1, Q2), JV-2 (Q3), JV-5 (Q4, Q5 ; le point d'harmonie dessiné dans la planche B
reste à faire avec JV-5b). JV-4 ne se code pas pendant TC-4 (même fichier `PerformanceMode.tsx`).

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

### Constat (prouvé)

- Vue Partitions : le scan est enveloppé (`data-enveloppe-scan`) et plafonné à 920 px, **sur une rangée entière** de
  la grille (`_components/PartitionView.tsx:645-650`) ; décision Q3 de T4 (`docs/spec-exemples-usage.md:280`, commit
  `622160a4`). Les chants en paroles passent en deux colonnes dès 1 000 px de zone ; le scan, jamais : d'où la bande
  vide à droite sur écran large.
- 189 scans sur 190 n'ont **qu'une page** (portrait, ≈ 1 600 × 2 353 px ; seul 为我而来 en a deux) : « deux pages
  côte à côte » n'existe presque jamais ; deux volets veulent dire couper une page (mesure de la planche, sur
  `public/jianpu/systemes.json`, `marges.json`, `chords.json`).
- Le découpage existe déjà dans le mode louange : tranches entre deux lignes (lot JP-B, `src/components/performance/PageScan.tsx:15-17`) et
  demi-lignes au téléphone (lot JP-C, `tranchesDemiLignes`, `JianpuSheet` `tranche.demi`), calque déjà calé et testé
  sur ces fenêtres. La décision du 03/10/2026 (`docs/spec-deux-volets.md:78`, « un chant en 简谱 reste tel quel, sans
  coupe en deux pages ») est donc déjà levée de fait pour les tranches.
- Page chant : colonne de 672 px (`max-w-2xl`), une colonne aussi pour les chants en paroles.

### Planche

`docs/planches/planche-jianpu-deux-volets.html`, artefact privé https://claude.ai/artifact/FJmdbWyBhbKPUwkQcUPUqA. Trois pistes, mesurées sur
全新的你 (7 lignes, une page) :

| Piste | Idée | Accords imprimés à 1 280 (aujourd'hui 14,4 px) | Verdict |
|---|---|---|---|
| A. Recueil ouvert | la page coupée en deux moitiés côte à côte, tout le chant à l'écran | ≈ 7,6 px | illisible à bout de bras |
| **B. Demi-lignes en deux volets (recommandée)** | chaque ligne coupée sur la barre la plus proche du milieu (comme au téléphone), demi-lignes réparties en deux colonnes équilibrées | ≈ 13,1 px (14,4 à 1 440, plafonnée) | même taille, largeur remplie, cohérente avec les chants en paroles |
| C. Pupitre, tourne d'un volet | deux volets à hauteur d'écran, tourne d'un volet | comme B | piège le défilement, une tourne de plus à apprendre |

À dire franchement : à taille égale, aucune piste ne montre plus de musique (une page portrait sur un écran paysage
occupe déjà la surface) ; B supprime la bande vide et fait gagner ≈ 10 % de hauteur, elle ne supprime pas le défilement.

Critique de la planche (critique-design, « à retoucher », non reprise faute d'agent prévu) : les dessins
d'ordinateur sont réduits (la différence de lisibilité A / B ne se voit pas, l'étiquette d'harmonie fait ≈ 4 px), la
tablette paysage et le 1 440 ne sont qu'en tableau, A et C sont dessinées avec leurs défauts, et les 2 px entre deux
moitiés d'une ligne se perdent dans le blanc du scan. À reprendre si Timothée hésite entre A et B ; sans effet sur la
recommandation, qui tient aux mesures.

### Proposition (piste B)

- **Vue Partitions** (tablette paysage, ordinateur, 1 440) : dès 1 000 px de zone (même règle que les paroles), le scan
  passe en deux colonnes de demi-lignes, échelle calculée sur la colonne et **plafonnée à celle d'aujourd'hui** (à 1 440
  l'air reste à droite). Coupe entre les colonnes au début de section le plus proche si les colonnes ne diffèrent pas
  de plus de deux demi-lignes, sinon au milieu. Une colonne si les accords imprimés tomberaient sous **11 px** (seuil de
  la planche : 3 scans sur 190 à 1 280). Téléphone et tablette portrait : inchangés.
- **Mode louange** : le scan suit l'interrupteur « 2 colonnes » existant ; une page d'écran se remplit de deux
  colonnes de demi-lignes au lieu de tranches de lignes entières ; pagination, « Ensuite » et demi-page inchangées.
- **Page chant** : une colonne, inchangée dans ce lot.
- Le calque n'est jamais touché à l'intérieur : chaque demi-ligne est une fenêtre `JianpuSheet` déjà calée.

- **Q6 — Piste** : **B** (**recommandée**), A (tout le chant d'un coup, accords deux fois plus petits) ou C.
- **Q7 — Mode louange aussi** : oui, le scan suit l'interrupteur « 2 colonnes » (**recommandé**, et la levée de la
  décision du 03/10 s'écrit datée dans `spec-deux-volets.md`) ou vue Partitions seulement.

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
- **Q5 — Idées sur le scan** : point en marge à la hauteur de la section (**recommandé**, même geste qu'en paroles ;
  dans la vue Partitions visible d'office pour qui a accès à l'harmonie, dans le mode louange derrière le réglage
  « Idées d'harmonie » éteint par défaut, comme H8 ; rien écrit sur l'encre ni dans le calque) ou une liste « Idées
  d'harmonie » au-dessus du scan (plus simple, mais loin de la musique).

---


### Reprise du 13/11 (Timothée, sur cette proposition)

> « ce qu'il faudrait c'est que quand on appuie sur le refrain par exemple il y a toutes les propositions d'harmonie
> qui apparaissent »

Ce qui change : non plus **la première** idée d'une section (point d'H8, `spec-harmonie-accords.md`, « au plus un
[point] par section ») mais **toutes** les propositions de la section, au toucher de la section elle-même.
Proposition, à dessiner sur planche avant le go (changement d'apparence, `CLAUDE.md` § Design) :

- **Geste** : toucher le **nom de la section** (« Refrain », « Pont ») ouvre la liste de toutes les propositions
  d'harmonie de ce passage ; un second toucher la referme. Sur un scan 简谱, le geste se fait sur une étiquette de
  section posée dans la marge, à la hauteur où la section commence (`public/jianpu/sections.json`).
- **Vue Partitions et page chant** : la liste s'ouvre sous le nom de la section, ou bien la colonne Harmonie
  (porte 2, `HarmonieDuChant`) s'ouvre au bloc de ce passage, mécanisme déjà là pour « Ici »
  (`src/components/accords/LigneIci.tsx:3-4`). À trancher sur planche.
- **Mode louange** : la bande d'H8 devient une liste (une ligne par proposition, avant → après, une seule notation),
  sans animation, sans tourner la page ; le réglage « Idées d'harmonie » reste (éteint par défaut).
- Notation : une seule, celle que la personne a choisie (Q4 ci-dessus, recommandation gardée).

JV-5a et JV-5b sont remplacées par cette reprise.

**Planche** (13/11/2026) : `docs/planches/planche-harmonie-toutes-les-idees.html`, artefact privé
https://claude.ai/artifact/QyuUMtnuQ6TVvKuPQis6Fp. Comptage sur 1 616 sections (idées calculées, tonalité
recommandée) : médiane 6 idées, 29 % en ont 9 ou plus, jusqu'à 20 ; 49 n'en ont aucune.

- A. L'ossia : chaque idée écrite en petit au-dessus de l'accord qu'elle change. Belle à deux idées, illisible à six ;
  impossible sur le scan ; touche au rendu des accords (`ChordLine`).
- **B. Le tableau d'échange (recommandée)** : sous le nom touché, une liste « ce qu'on joue → ce qu'on peut jouer »
  alignée sur une colonne de flèches ; l'accord d'origine écrit une fois par groupe ; groupes rangés par sûreté (très
  sûre, sûre, puis « à écouter » en graisse normale) ; idées de forme sur une ligne « Aussi : intro, tag » ; idées de
  l'équipe ensuite ; deux colonnes au-delà de six rangées dès 768 px ; le trait de la section descend le long de la
  liste. Hors mode louange : nom de la fiche en gris, Écouter, lien « Tout sur ce passage » vers la porte 2. Mode
  louange : rangées seules, à la taille des accords, aucune animation, la page ne tourne pas. Scan : étiquette de section
  dans la marge blanche (`marges.json`) à la hauteur de sa ligne (`sections.json`), liste insérée entre deux lignes.
  Exemple : Refrain de Promesses, 8 idées en 5 groupes.
- C. Le pupitre voisin : la colonne Harmonie s'ouvre à côté, au bloc du passage. La moins chère hors louange, mais elle
  cache la partition au téléphone et fait recompter les pages en louange.

Critique (« à retoucher ») à corriger en code, sans changer la recommandation : accord d'origine à 55 % trop pâle
(3,8:1, viser ≥ 4,5:1 : `--muted-foreground`) et flèche invisible (1,27:1 : la tracer en `--muted-foreground`) ;
compteur collé au nom qui se lit comme un numéro (« Couplet 1 6 » = « Couplet 16 ») ; Écouter à moins de 44 px l'un de
l'autre dans un groupe ; la section à 9 idées ou plus et le passage en deux colonnes ne sont pas dessinés.

**Décision de Timothée (13/11/2026)** : « C'est pas mieux de faire un volet comme quand on clique sur harmonie pour un
chant ? », puis « Ok » à la proposition ci-dessous. **Le volet Harmonie (piste C, adaptée) remplace B** ; H-Q1 et H-Q2
tombent (pas de liste dans la partition, pas de compteur sur le nom).

- **Geste** : toucher le nom d'une section (« Refrain », « Pont ») ouvre le volet Harmonie du chant (porte 2,
  `src/components/harmonie/HarmonieDuChant.tsx`) **au bloc de ce passage**, comme « Ici » le fait déjà
  (`src/components/accords/LigneIci.tsx:3-4` ; branchement `SetlistDetailClient.tsx:1974`, `onIci`). Toutes les
  propositions y sont, avec nom, « Pourquoi », Écouter et Essayer. Volet déjà ouvert : il défile au bloc. Le nom n'est
  touchable que si l'accès Harmonie est ouvert (et, en louange, si le réglage « Idées d'harmonie » est allumé).
- **Tablette paysage, ordinateur, 1 440** (page chant, vue Partitions) : le volet existant, à côté de la partition.
- **Téléphone et tablette portrait** : une **feuille à mi-hauteur** qui monte du bas, la section touchée restant visible
  au-dessus ; on la tire vers le haut pour tout voir. Décision déléguée (session de cadrage, 13/11) : mi-hauteur = 50 %
  de l'écran, poignée et fermeture au glissé vers le bas ou par Échap.
- **Mode louange** : le volet **se pose par-dessus** le bord droit de la page (feuille à mi-hauteur au téléphone), sans
  la rétrécir ni recompter les pages ; aucune animation (R4) ; le toucher ne tourne pas la page. Le point et la bande
  d'H8 (`IdeeHarmonieMarge.tsx`) sont retirés : le nom de section devient la seule cible. Une seule notation, celle de
  la personne (`src/lib/notationAccords.ts`), dans le volet comme ailleurs (H7-2).
- **Scan 简谱** : une étiquette de section dans la marge blanche (`public/jianpu/marges.json`), à la hauteur de la ligne
  où la section commence (`public/jianpu/sections.json`), porte le même geste ; rien sur l'encre ni dans le calque.
  Étiquette dans la langue de l'interface, forme courte (« Couplets 1–4 » si plusieurs sections commencent sur la même
  ligne ; initiale seule sous 40 px de marge). Le lien `sections.json` ↔ passages (`sectionOrigins.ts`) est à établir.

Tranches (une session chacune ; **go de Timothée le 13/11/2026 : « Go »**, enchaînées sans nouveau go) :
- **JV-5a — Le nom de section ouvre le volet** (S à M) : `SongView.tsx` (nom en bouton, sans toucher aux accords),
  `PartitionView.tsx`, `SongDetailClient.tsx`, `SetlistDetailClient.tsx` (même chemin que `onIci`), feuille à
  mi-hauteur au téléphone. Après JV-2 (même `PartitionView.tsx`). Tests : `harmonie-montrer.spec.ts` (voisine),
  nouvelle spec d'agencement `harmonie-volet-section.spec.ts` dans `SPECS_GRAND_ECRAN` (Promesses : toucher « Pont »
  ouvre le volet au bloc du Pont, F → Fmaj7 visible ; téléphone : feuille à 50 %, le Pont reste visible).
- **JV-5b — Mode louange** (M) : `PerformanceMode.tsx` (volet posé par-dessus, rendu de `HarmonieDuChant` ou de sa
  partie « idées du passage »), retrait de `IdeeHarmonieMarge.tsx`. Après TC-4 et JV-4. Tests :
  `louange-harmonie.spec.ts` réécrite (réglage éteint par défaut ; allumé, le nom ouvre le volet ; page non tournée,
  pages non recomptées).
- **JV-5c — Scan 简谱** (M) : étiquettes de marge dans `JianpuSheet.tsx` (couche sœur du calque) et `PageScan.tsx`,
  lien sections ↔ passages. Après JV-3 et JV-4. Tests : `harmonie-jianpu.spec.ts` étendue, `npm run jianpu:audit` sur
  deux scans.

## Tranches

Une session par tranche (`CLAUDE.md`, « Une session par tranche ») ; tests de la tranche sur les trois appareils,
les cinq projets pour une spec d'agencement (ajoutée à `SPECS_GRAND_ECRAN`) ; captures aux quatre dispositions et à
1 440 px dès que l'apparence change ; un chant FR et un chant ZH. JV-1 se code seule ; JV-2 et JV-3 touchent
`PartitionView.tsx` : l'une après l'autre ; JV-4 et JV-5 touchent `PerformanceMode.tsx` : pas pendant un autre
chantier sur ce fichier.

### JV-1 — 简谱 d'office pour les musiciens (S à M ; point 3, Q1 et Q2 tranchées le 13/11)

- Fichiers : `src/lib/jianpu/preference.ts` (`sheetEnabled(pref, role)`, `prefPourRole` absorbé) ; appelants
  `SetlistDetailClient.tsx:995, :1823`, `PartitionView.tsx:505`, `ListView.tsx:276`, `Sommaire.tsx:76`,
  `IdeesDuChant.tsx:146`, `SetlistFullPDF.tsx:129`, `Pupitre.tsx:106`, `blocks.ts:172`, `PerformanceMode.tsx:720`
  (rôle hors louange : `getRole(uid)` de `roleCompte.ts`) ; éditeur `editeur/Volets.tsx:115-130` (radiogroup « Jouer
  sur » retiré) et `editeur/ListeCourte.tsx:199` (badge retiré) ; libellés devenus orphelins dans `src/locales/`.
  `choixScan` des ajouts locaux inchangé. Aucune règle Firestore, aucune permission.
- Critères : préférence non réglée + item `jianpuSheet: false` → le scan pour un musicien et pour une personne sans
  rôle, dans la vue Partitions, la Liste, le Sommaire, le Pupitre, le PDF et le mode louange ; paroles + pinyin pour
  choriste et présidence ; « always » / « never » de la personne l'emportent toujours ; l'éditeur n'offre plus
  « Jouer sur » ; une setlist ancienne avec `jianpuSheet: false` s'ouvre sans erreur.
- Tests : `tests/jianpu-par-defaut.spec.ts` (table `:28-47` réécrite avec le rôle ; `:211-213` devient « non réglée :
  le scan, quel que soit le choix du responsable » ; cas choriste et présidence hors louange) ;
  `tests/louange-roles-jianpu.spec.ts` (voisine) ; `tests/setlist-editeur-piste2.spec.ts:245-256` (le test de
  l'interrupteur « Jouer sur » se réécrit : il n'existe plus, les accords retouchés restent). Specs qui posent
  `jianpuSheet: false` pour **forcer les paroles** d'un chant à scan : passer par la préférence « never » de
  l'appareil (localStorage `jianpu-sheet-pref`) — `accords-toucher.spec.ts:44`, `captures-a6.spec.ts:27`,
  `harmonie-montrer.spec.ts:42, :158`, `jianpu-par-defaut.spec.ts:177, :289`, `mode-louange-colonnes.spec.ts:215,
  :343`, `pupitre-partitions.spec.ts:27, :29`. Aucune garde retirée.

### JV-2 — Deux colonnes lues en colonnes (S ; point 4, Q3 tranchée le 13/11 ; après JV-3, même fichier)

- Fichiers : `PartitionView.tsx:295` et `src/components/song/SongView.tsx:1496` (même grille, T4) : `grid-cols-2`
  → `columns: 2` + `break-inside: avoid` sur les sections, mêmes seuil, largeur et gouttière.
- Critères : à 1 440 × 900, Hosanna se lit colonne gauche de haut en bas puis colonne droite ; aucune section coupée
  entre deux colonnes ; aucune ligne de paroles coupée ; 1 280 et tablette paysage inchangés (une colonne de 920 px).
- Tests : `tests/pupitre-partitions.spec.ts` (garde « lecture en rangées » réécrite en « lecture en colonnes ») ;
  voisines `pages-en-grand-setlists`, `setlist-deux-volets`.

### JV-3 — 简谱 en deux volets dans la vue Partitions (M ; point 1, piste B)

- Fichiers : nouvelle fonction pure dans `src/lib/performance/tranchesScan.ts` (répartir les demi-lignes en deux
  colonnes, coupe au début de section par `public/jianpu/sections.json`) ; `PartitionView.tsx:645-650` (l'enveloppe
  passe en deux colonnes sous la même requête de conteneur, échelle plafonnée) ; `JianpuSheet.tsx` seulement appelé
  avec `tranche.demi` (si le mode demi doit s'ouvrir au rendu en flux : une ligne du conteneur, pas le calque).
- Critères : à 1 440 et en tablette paysage, deux colonnes de demi-lignes, accords imprimés ≥ 11 px et ≤ ceux
  d'aujourd'hui ; calque calé sur l'image (étiquette ↔ accord imprimé à ±2 px) ; 为我而来 (deux pages) sans trou ;
  une colonne sous le seuil ; téléphone et tablette portrait inchangés.
- Tests : nouvelle `tests/jianpu-deux-volets.spec.ts` (dans `SPECS_GRAND_ECRAN`) ; à changer
  `pupitre-partitions.spec.ts` (garde « 简谱 ≤ 920 px sur une rangée entière ») ; voisines `jianpu-integration`,
  `jianpu-tonalite-cho`, `harmonie-jianpu`. `npm run jianpu:audit` sur deux scans, PNG regardés.

### JV-4 — 简谱 en deux colonnes dans le mode louange (M ; si Q7 = oui)

- Fichiers : `PerformanceMode.tsx`, `src/lib/performance/columns.ts`, `PageScan.tsx` ; levée datée dans
  `docs/spec-deux-volets.md` (tableau des décisions, ligne du 03/10).
- Critères : interrupteur « 2 colonnes » allumé, ordinateur et tablette paysage : une page d'écran = deux colonnes
  de demi-lignes ; éteint : comme aujourd'hui ; pagination, « Ensuite », demi-page et annotations inchangées.
- Tests : `louange-jianpu-tranches.spec.ts`, `mode-louange-colonnes.spec.ts`, `performance-mode.spec.ts` (voisine).

### JV-5 — Idées d'harmonie : notation, puis scan (S puis M ; point 2, Q4 et Q5)

- **JV-5a** : `src/components/performance/IdeeHarmonieMarge.tsx:112` suit `src/lib/notationAccords.ts` (une seule
  notation) ; `docs/spec-harmonie-accords.md:319` mis à jour. Test : `tests/louange-harmonie.spec.ts` (bande en
  lettres par défaut, en chiffres si la personne a choisi « Chiffres »).
- **JV-5b** : lien `sections.json` ↔ passages (`src/lib/setlist/sectionOrigins.ts`) ; point et bande sur le scan
  (couche sœur du calque, marge gauche de la colonne, hauteur de la première ligne de la section) ; étiquettes du
  calque avec `data-section-uids` pour « Ici ». Critères : un chant ZH à scan avec idée montre son point dans la vue
  Partitions (accès harmonie) et dans le mode louange (réglage allumé) ; toucher : la bande s'ouvre sans recouvrir
  l'encre ; « Ici » dans le panneau d'un accord du calque. Tests : `tests/harmonie-jianpu.spec.ts` (étendue),
  `tests/louange-harmonie.spec.ts`.

## Avancement

- 13/11/2026 : cadrage (diagnostic par un `chercheur`, planche `/planche`, spec). Aucun code, aucun test lancé. Attend
  le go de Timothée. Point 5 du pilote (menu Setlist du mode louange) : `docs/spec-louange-tous-les-chants.md` §
  « Reprise du 13/11 », tranche TC-4.
- 13/11/2026 : **go de Timothée pour JV-1 et JV-2** (« oui », après la question « Go pour JV-1 et JV-2, et je lance la
  planche des idées d'harmonie ? ») : JV-1 lancée ; JV-2 après JV-3 (même `PartitionView.tsx`), lancée par la session de
  JV-3 ; planche « toutes les idées d'une section » lancée par la session de cadrage.
- 13/11/2026 : go de Timothée pour les pistes des deux planches (B ici, A pour TC-4) : JV-3 lancée (session
  orchestratrice neuve), puis JV-4 après TC-4.
- 13/11/2026 : **JV-1 codée** (session orchestratrice). `sheetEnabled(pref, role)` ; le `jianpuSheet` de l'item n'est plus
  lu (sauf `choixScan`). La page setlist passe `prefPourRole(pref, getRoleSansMigrer(uid))` à la vue Partitions, à la
  Liste, au Sommaire, aux idées, aux réglages d'affichage et au PDF ; l'aperçu de setlist et le Pupitre lisent le même
  « Je joue » (le Pupitre ne lit plus le rôle du planning) ; le mode louange garde le sien (`PerformanceMode.tsx:720`
  inchangé). « Jouer sur » et le badge 简谱 sont retirés de l'éditeur, avec leurs libellés ; l'aide « Partition 简谱 »
  est réécrite (fr, zh). Décisions déléguées (session, 13/11) : `getRoleSansMigrer` plutôt que `getRole`, pour ne pas
  migrer le rôle hors du mode louange (même résultat) ; `prefPourRole` gardé, pour que l'interrupteur montre ce que la
  personne voit, comme dans le mode louange. Tests : huit specs (dont `jianpu-par-defaut`, `louange-roles-jianpu`,
  `setlist-editeur-piste2`, et six specs passées de `jianpuSheet: false` à la préférence « never »), trois appareils
  (plus les deux grands écrans pour les specs d'agencement) : 447 passés, 175 sautés (gardes d'appareil), 1 échec de
  connexion simulée (`pupitre-partitions:716`, ordinateur), repassé seul ; **19,6 min**. tsc, lint : 0 erreur.
  Relecteur : un appelant oublié (`ApercuSetlist.tsx`), corrigé.
- 13/11/2026 : **go de Timothée pour JV-5a à JV-5c** (« Go »). Chaîne : **JV-2 lance JV-5a** à sa fin (même
  `PartitionView.tsx`) ; **JV-4 lance JV-5b**, qui lance **JV-5c** (même `PerformanceMode.tsx`, puis `PageScan.tsx` et
  `JianpuSheet.tsx`). JV-5a et JV-5b peuvent tourner en même temps (fichiers distincts ; ajouts courts dans
  `SetlistDetailClient.tsx`). La dernière tranche du lot fait tourner les specs du lot et écrit au pilote.
- 13/11/2026 : **JV-3 codée** (session orchestratrice, `/tranche`). `voletsDemiLignes` (`tranchesScan.ts`, pur ; fenêtres
  d'une ligne mises en commun avec `tranchesDemiLignes`, inchangée) ; hook `useVoletsScan` ; `JianpuSheet` reçoit `volets`
  (conteneur seulement : grille de deux colonnes, même corps de fenêtre que les demi-lignes du téléphone, calque intact,
  une colonne à l'impression) ; `PartitionView` : `EnveloppeScan`, témoin CSS `@container partition (min-width:1000px)`
  lu par ResizeObserver, `data-scan-volets`. Décisions déléguées (session, 13/11) : la **tablette paysage** (1 080 px,
  zone < 1 000 px) et l'ordinateur 1 280 gardent une colonne, comme les paroles (la règle des 1 000 px l'emporte sur la
  ligne « tablette paysage » des critères) ; en **édition des accords** (Adapter, Ma version) le scan garde la page
  entière ; sans calque (pas de `chords`), une colonne. Limites connues de la piste B, vues à l'œil et acceptées
  (`critique-design` : « à livrer ») : liaisons coupées à la coupe de demi-ligne, comme au téléphone ; à 1 440 l'échelle
  plafonnée laisse ≈ 47 px entre les colonnes. Tests : nouvelle `jianpu-deux-volets.spec.ts` (dans `SPECS_GRAND_ECRAN`),
  `pupitre-partitions` (garde des 920 px limitée sous 1 000 px de zone), voisines `jianpu-integration`,
  `jianpu-tonalite-cho`, `harmonie-jianpu`, `louange-jianpu-tranches` : 563 passés au premier tour (17 min), quatre
  échecs propres à la nouvelle spec corrigés en deux tours ; repasse après rebase sur JV-1 : 268 passés, 0 échec
  (**8,9 min**). `jianpu:audit` 为我而来 et 全新的你 : calque calé, PNG regardés. tsc, lint : 0 erreur.
- 13/11/2026 : **JV-2 codée** (session orchestratrice, `/tranche`). Dès 1 000 px de zone, `PartitionView.tsx` (chants
  fusionnés) et `SongView.tsx` (corps) passent de `grid-cols-2` à `columns-2` (gouttière 24 px, mêmes seuil et largeur),
  enfants en `break-inside-avoid` ; règle `nth-last-child(2)` des rangées retirée ; `print:columns-auto` ajouté
  (`print:block` ne neutralisait plus les colonnes ; relecteur). `EnveloppeScan` (JV-3) et la règle « chinois avec
  pinyin = une colonne » intacts. À 1 440, Hosanna se lit Intro, Couplet 1, Refrain à gauche puis Couplet 2, Pont à
  droite ; ≈ 115 px de vide sous la colonne la plus courte (le prix de sections jamais coupées, risque dit à Q3).
  Garde T4 de `pupitre-partitions` réécrite « lecture en colonnes » (ordre DOM gauche puis droite, hauts alignés,
  `getClientRects() === 1`) ; « couplet 1 à 27 % » retirée (sans objet en colonnes) ; test « captures JV-2 » (cinq
  projets, FR et ZH, sombre à 1 440). Tests : `pupitre-partitions`, `pages-en-grand-setlists`, `setlist-deux-volets`,
  `jianpu-deux-volets`, `statistiques-chant`, cinq projets : 235 passés, 225 sautés (gardes d'appareil), 0 échec
  (**7,7 min**). `regard` sur les douze captures : rien à corriger. tsc, lint : 0 erreur. Le chemin fusion de
  `PartitionView` n'a pas d'assertion de colonnes propre (même classe que SongView). JV-5a lancée à la suite.
- 13/11/2026 : **JV-5a codée** (session orchestratrice, `/tranche` calé sur des agents `general-purpose`). Le nom de
  section (`NomSection`, `SongView.tsx` : disposition par défaut, Partition, Repères et Scène sans corps) est un bouton
  quand l'accès Harmonie est ouvert, hors Crayon ; il appelle `IciDuChant.ouvrir(uid, undefined, { depuisNom })`
  (`useIciDuChant`, `AccordsProvider.tsx`), page chant et vue Partitions (`iciDe`, `onIci`). Grand écran : la colonne.
  Téléphone et tablette portrait : feuille à 50 % (crans 0,5 et 1, `HarmonieDuChant.tsx`), la page défile pour garder
  le nom au-dessus. Décisions déléguées (session, 13/11) : marge basse de 50 dvh sur la page et dans la liste de la
  feuille tant qu'elle est ouverte à mi-hauteur (sans elles, la dernière section d'un chant court, le Pont de
  Promesses, ne peut ni monter au-dessus de la feuille ni en haut du volet) ; « Ici » et le bouton Harmonie gardent
  leur feuille de 67 dvh ; Repères et Scène avec corps (nom en pastille) restent sans bouton. Limite connue : page
  chant ouverte avec la liste à gauche, la zone de lecture fait moins de 824 px même à 1 440, et c'est la feuille
  existante qui sort (règle antérieure, comme le bouton Harmonie). Au passage : guillemets de `jianpuSheetHint`
  (fr.json), rouges dans `coherence.spec.ts` depuis JV-1. Tests : nouvelle `harmonie-volet-section.spec.ts`
  (`SPECS_GRAND_ECRAN`) ; voisines `harmonie-montrer`, `harmonie-colonne`, `harmonie-setlist`, `harmonie-passages`,
  `pupitre-partitions`, `jianpu-deux-volets`, `coherence`, `statistiques-chant`, `retouches-usage-t1`, cinq projets :
  370 passés, 197 sautés, 1 course (`retouches-usage-t1:49`, téléphone, verte seule) (**9,0 min**) ; repasse de la
  spec JV-5a après correctif : 39 passés (**1,2 min**). `regard` sur 17 captures (bloc du Pont en bas de la feuille à
  la tablette : corrigé). tsc, lint : 0 erreur. `critique-design` (six captures) : « à retoucher », rien de bloquant ni de propre à la tranche ;
  suites notées, toutes antérieures : feuille de la page chant centrée sur la page et non sur la lecture à 1 440 ;
  double cadre du surlignage d'« Ici » (`.harmonie-surligne`, `globals.css`) ; poignée pâle de toutes les feuilles
  (`drawer.tsx`) ; titres des fiches en français dans l'interface chinoise ; « Ne marche pas sur ce chant » seul sur
  sa ligne en français. JV-5a ne lance rien après elle (JV-5b vient de JV-4).
- 13/11/2026 : **JV-4 codée** (session orchestratrice). `tranchesDeuxColonnes` (`tranchesScan.ts`, pur) : sous « 2 colonnes »
  allumé (ordinateur, tablette paysage, 1 440), chaque page d'écran d'un scan certifié montre deux colonnes de
  demi-lignes (gauche, puis droite, puis page suivante ; dernière page équilibrée ; jamais de coupe entre les deux
  moitiés d'une ligne), échelle = colonne / plus large fenêtre, **plafonnée à celle des lignes entières** ; sous 11 px
  d'accords imprimés (`chords.json`, `labelH`) ou pour une ligne seule, les tranches d'avant. `Demi.colonne2` (indice de
  la première fenêtre de droite) ; `JianpuSheet` pose les deux colonnes (`data-jianpu-volets`, gouttière 24 px, calque
  intact) ; `PageScan` cale la tête de feuille sur leur largeur ; clé d'annotation **« j6-<y0> »** (composition
  nouvelle, comme j4 / j5) ; `DemiPage` : les colonnes de scan comptent comme celles du texte (coupe verticale, filet
  dans la gouttière). Éteint : lignes entières comme avant ; téléphone et tablette portrait inchangés. Levée de la
  décision du 03/10 écrite datée dans `spec-deux-volets.md`. Décisions déléguées (session, 13/11) : coupe gloutonne
  par page d'écran (la coupe « au début de section » de JV-3 ne s'applique pas : la page d'écran borne déjà les
  colonnes) ; chaque page de scan se pagine seule (为我而来 : ses deux pages ne se mêlent pas, comme JP-B) ; demi-page en
  coupe verticale (même règle que le texte en deux colonnes). Tests : nouvelle `louange-jianpu-deux-colonnes.spec.ts`
  (`SPECS_GRAND_ECRAN` ; pur, toutes les lignes une fois, éteint, petits écrans, clé j6, 为我而来, demi-page, captures FR
  et ZH clair et sombre) ; `louange-jianpu-tranches` et le test scan de `louange-demi-page` passent « 2 colonnes »
  éteint (ils gardent le chemin des lignes entières). Premier tour (six specs, cinq projets) : 726 passés, 30 échecs
  attendus (anciens tests en deux colonnes) (25 min) ; repasse : 434 passés, 3 échecs **antérieurs** (`jianpu-integration`
  264, 661, 682 à 1 440, vue Partitions, rouges aussi sans la tranche) (**16 min**). tsc, lint : 0 erreur.
