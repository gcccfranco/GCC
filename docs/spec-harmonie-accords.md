# Spec : Harmonie et Accords (chantier 4 de la demande AP)

Statut : **recommandations acceptées par Timothée (« Go », 11/11/2026) ; spec écrite, chaque lot attend son go de code.** Cadrage : `docs/spec-pupitre-musicien.md` (§ Le site de référence, § Chantiers proposés, réponse 7).
Planche : `docs/planches/planche-harmonie-accords.html`, artefact privé « Planche — Harmonie et Accords ».

## Demande (Timothée, 11/11/2026)

Revoir l'onglet Harmonie (« pas très pratique ») ; compléter les idées d'harmonie (« il manque beaucoup de choses ») ;
bibliothèque d'accords : « quand on change d'accord au piano, ça fait des zooms sur le clavier » ; accords en chiffres
sur les partitions ; idées d'harmonie dans le mode louange ; reprendre ce qui est bien sur wangshubianqu.com/chord-map.

## Constat technique

Le « zoom » : `ClavierMains` (`src/components/harmonie/Diagrammes.tsx:236`) dessine 2 ou 3 octaves selon l'accord
(336 ou 504 px), puis `PanneauAccord.tsx:241` le réduit à la largeur (`[&_svg]:max-w-full`) : l'échelle change à
chaque accord.

## Pistes de la planche

- **A. Le cahier des boucles (recommandée)** : on entre par la boucle jouée, en chiffres (1 5 6m 4 · 146 chants) ;
  toucher un chiffre de la boucle liste les idées qui s'y jouent, puis les chants qui la jouent (liens). Les 69 fiches
  restent dans « Toutes les idées », en familles. Fiche : « Avant → après » en chiffres et en lettres, « Où
  l'entendre » en liens, précédente / suivante. Ordinateur : deux volets jusqu'à 1 440 px (fiche ≥ 640 px).
- **B. La roue des quintes** : carte du cycle, flèches « quel accord ensuite » avec notes communes. Belle, lente au
  pouce sur scène ; la moitié des fiches n'y a pas de place.
- **C. Le parcours de répétition** : six chiffres → dix boucles → idées par moment du chant, avec « étape suivante ».
- **/accords (commun)** : clavier fixe à trois octaves (16 px par touche au téléphone, 24 ailleurs), variantes
  au-dessus du diagramme au téléphone, « ‹ Chants » retiré, chiffre de chaque variante dans la tonalité si l'on vient
  d'une fiche.

Critique : « à retoucher ». Corrigé à la relecture : compteurs non mesurés en gris « — chants » (plus d'orange),
5/7 au lieu de 5/3, bascule « Lettres / Chiffres », police système, deux volets à l'ordinateur. Restent visibles sur
la planche : /accords dessinée trois fois presque pareil, tablette paysage non dessinée, octave grave non grisée,
« 4 sur 5 » rangée sous « Idées sur le 4 ». Seules trois boucles sont mesurées (146, 103, 102).

## Questions posées à Timothée (recommandation en premier)

1. Piste : A, B ou C ? → A, en reprenant « Et ensuite ? » de B en texte et le pied précédente / suivante de C.
2. Clavier : trois octaves fixes, ou deux (main droite, basse écrite) ? → trois octaves.
3. Chiffres sur les partitions : bascule « Lettres / Chiffres » près de la tonalité, mémorisée par musicien, basse en
   degré (5/7) ; rien sur le calque 简谱 ; PDF en lettres. → oui.
4. Idées en mode louange (décision du 17/09 rouverte) : un point en marge, au plus un par section, bande « Avant →
   après » sans animation, désactivé par défaut. → oui, ou les laisser en répétition seulement.
5. Écoute : synthèse Web Audio sur demande (fiche, /accords), jamais en mode louange. → oui, tranche optionnelle.
6. Exercices d'oreille : → pas dans ce lot.

## Décisions de Timothée (11/11/2026, « Go » sur les six recommandations)

Ce « Go » valide les décisions et la spec ; il ne vaut pas go de code (un go par lot, après la spec).

1. Piste **A, le cahier des boucles**, avec « Et ensuite ? » de B en texte (sans roue) et le pied précédente / suivante
   de C.
2. Clavier d'accord **fixe à trois octaves** : 21 touches blanches, octave grave grisée pour la main gauche, 16 px par
   touche au téléphone, 24 ailleurs ; la largeur ne dépend plus de l'accord.
3. **Chiffres sur les partitions** : bascule « Lettres / Chiffres » (字母 / 数字) à côté de la tonalité, mémorisée par
   musicien ; mêmes positions, `--chord-color` ; basse en degré (A/C# en D = 5/7) ; rien sur le calque 简谱 ; PDF en
   lettres.
4. **Idées d'harmonie en mode louange** : oui, désactivées par défaut, activables par musicien ; un point
   `--chord-color` en marge, au plus un par section ; la touche ouvre sans animation une bande d'une ligne
   « 4 5 → 2m7 5 · G A → Em7 A », la touche suivante la referme ; aucun « Pourquoi » sur scène.
5. **Écoute** : synthèse Web Audio sur demande (fiche, /accords), jamais en lecture automatique ni en mode louange ;
   lot optionnel.
6. **Exercices d'oreille** : pas dans ce chantier.

## Décisions de Timothée (12/11/2026, « Ok pour tes recommandations » sur la planche « trois portes »)

Elles remplacent le point 1 (piste A, entrée par boucles, écartée) et complètent les points 2 à 6 ci-dessus.

1. Piste **B, la grille du chant** : un seul contenu, l'harmonie d'un chant passage par passage, ouvert par trois
   portes. **Porte 1**, panneau de l'accord touché dans la partition : doigté, chiffre (« 4 dans D »), Écouter, ligne
   « Ensuite : 1 · 6m · 4 » dépliable (notes gardées / qui bougent), ligne « Ici : 4 → 2m7 » si une idée s'applique,
   qui ouvre la porte 2 au passage. **Porte 2**, « Harmonie de ce chant » (remplace la feuille « Idées
   d'harmonie ») : bouton « Harmonie 和声 » près de la tonalité (page chant) et dans la barre du chant courant
   (setlist) ; par passage : filet de section, grille, ce qu'il fait en une phrase, Écouter, idées avec avant / après ;
   un passage sans idée n'a pas de bloc vide ; dans une setlist, « Faire monter le dernier refrain » au dernier
   refrain et « Vers le chant suivant » en dernier. **Porte 3**, l'onglet Harmonie (gardé dans Musiciens) : bibliothèque.
2. Porte 2 : **feuille** au téléphone et en tablette portrait (deux tiers de la hauteur) ; **colonne** sans voile en
   tablette paysage et à l'ordinateur, **fermée par défaut**, mémorisée par musicien.
3. Filtres : **Ressenti** à quatre valeurs (chaleureux 温暖, mélancolique 忧伤, élan 推进, couleur 色彩) à la place des
   onze ambiances ; **Usage** à cinq (couplet, pré-refrain, refrain, fin, transition) ; instrument gardé ; le niveau
   ordonne la liste au lieu de la filtrer. Correspondance ambiances → ressentis à valider fiche par fiche.
4. Idées de l'équipe **rangées au passage** qu'elles concernent, sous les idées calculées.
5. « **Jouer ensemble** » = un **cours** (rôles, piano main gauche et basse, deux guitares, intro / pont / fin), dont
   les exemples renvoient à des passages de chants de GCC.
6. Les lignes d'harmonie **suivent la bascule Lettres / Chiffres** (une seule notation).
7. Mode louange : **le point en marge et la bande d'une ligne**, sans animation, désactivés par défaut.
8. Écoute centrale (un même bouton Écouter dans les trois portes), synthèse dans le navigateur, sur demande, jamais en
   mode louange. Exercices d'oreille : plus tard.

À dessiner au moment de la spec du lot concerné (manque de la planche) : tablette paysage 1 180 × 820 et page chant à
1 440 px avec la colonne, la bulle de l'accord fermée quand la colonne est ouverte.

## Lots (chacun attend son go ; H1 fait)

| Lot | Contenu | Dépend de |
| --- | --- | --- |
| **H1** | /accords : clavier fixe, « Les plus joués » au-dessus du diagramme au téléphone (fait, 991cf38) | — |
| **H2** | Données : pour chaque chant, ses passages (section) avec grille en degrés et fonction ; idées calculées et idées de l'équipe ancrées à un passage ; « Où l'entendre » → chant + section ; étiquettes ressenti / usage des 69 fiches (proposées, à valider) | rien |
| **H3** | Écoute : un module de synthèse (accord, suite d'accords, avant / après) et le bouton Écouter commun | rien |
| **H4** | Porte 2 : « Harmonie de ce chant » en feuille et en colonne, page chant et setlist (remplace `IdeesSheet`) | H2, H3 |
| **H5** | Porte 1 : panneau d'accord enrichi (chiffre, Écouter, Ensuite, Ici) | H2, H3 |
| **H6** | Porte 3 : bibliothèque (filtres, fiche avec liens vers les passages, précédente / suivante, fiche ≥ 640 px à l'ordinateur) | H2, H3 |
| **H7** | Bascule Lettres / Chiffres sur les partitions, suivie par les lignes d'harmonie | rien |
| **H8** | Mode louange : point en marge et bande | H5, état AO |
| **H9** | Contenu : cours « Jouer ensemble » et fiches manquantes (liste ci-dessous) | H2 |

### H2 — contrat de données (décisions de l'orchestratrice du lot, 12/11/2026, déléguées)

Aucun écran ne change ; H4 à H6 lisent ces données. Une seule tranche.
- **Passages** (`src/lib/harmonie/passages.ts`, pur, calculé dans le navigateur comme les suggestions) : un passage
  par section du chant (`uid`, nom, type, rang). Grille = lignes d'accords lus en degrés (`chiffreDuDegre`) avec leur
  **fonction tonale** (`T` : 1, 3m, 6m ; `SD` : 2m, 4 ; `D` : 5, 7dim ; `autre` : le reste, emprunts et passages) ;
  `resume` = la suite sans répétitions immédiates, ramenée à sa **boucle** si elle se répète (« 1 5 6m 4 ») ;
  **fonction du passage** en code (`repos` : finit sur le 1 ; `vers-refrain` : finit ailleurs et précède un refrain ;
  `suspens` : finit ailleurs ; `sans-accords`). La phrase affichée sera écrite en FR et 中文 par H4, pas ici.
  Pourquoi au navigateur : les degrés ne dépendent pas de la tonalité et l'AST est déjà chargé ; pas de second index.
- **Idées ancrées** : `harmonieDuChant` range les suggestions calculées (`suggestionsPour`, refus appliqués) et les
  idées de l'équipe dans leur passage, calculées d'abord. Une idée d'équipe porte désormais `passage` (uid de section)
  et `passageNom` (Firestore, champs facultatifs ; `firestore.rules` ne filtre pas les champs : rien à publier). Uid
  disparu (chant réécrit) → rattachée par le nom ; sinon dans `sansPassage` (les idées d'avant H2 aussi).
- **Où l'entendre** : `fiche.ecoutes` = `{ slug, section, nom }` par chant **et** section où le « après » est joué
  (`build-harmonie.ts`), à côté de `exemples` (gardé pour l'onglet actuel).
- **Ressenti / usage** : deux lignes `Ressenti` et `Usage` dans le tableau de chaque fiche (`docs/harmonie/*.md`),
  vocabulaire fermé (chaleureux · mélancolique · élan · couleur ; couplet · pré-refrain · refrain · fin ·
  transition), suivies de « (proposé) » tant que Timothée ne les a pas validées (`fiche.etiquettesProposees`).
  Proposition tirée des **deux premières** sensations de la fiche (au plus deux ressentis : quatre ne filtraient
  plus rien) et des moments : Douceur, Repos, Lumière → chaleureux ; Tendresse, Gravité → mélancolique ; Épique, Majesté, Joie, Tension → élan ; Surprise, Émerveillement,
  Suspendu → couleur ; Couplet → couplet ; Montée et Pont → pré-refrain ; Refrain → refrain ; Fin → fin ; Intro et
  Transition → transition. Les sensations et moments restent dans les fiches jusqu'à H6.

### H3 — écoute (décisions de l'orchestratrice du lot, 12/11/2026, déléguées)

Une seule tranche ; aucun écran ne change (H4 à H6 posent le bouton).
- **Module** `src/lib/audio/synthese.ts` : partie pure, `planDeLecture` (suite d'accords → pas datés avec leurs
  fréquences, voicing de `voicingPiano` : basse puis accord serré, do de base = C3) et `planAvantApres` (avant, un
  silence, après) ; un accord illisible garde sa place en silence. Partie navigateur : un seul `AudioContext`, créé
  ou repris **au geste** (iOS), oscillateurs triangle avec enveloppe courte ; une lecture en arrête une autre.
- **Bouton** `src/components/harmonie/BoutonEcouter.tsx` : « Écouter / 试听 », « Arrêter / 停止 » pendant la lecture,
  `aria-pressed` ; accepte une suite ou un avant / après ; même style que les petits boutons secondaires existants ;
  rien si le navigateur n'a pas Web Audio. Pas de survol : un appui joue, un second arrête. Jamais en mode louange.

### H4 — porte 2, « Harmonie de ce chant » (décisions de l'orchestratrice du lot, 12/11/2026, déléguées)

Deux tranches. La première remplace le contenu et garde la feuille à toutes les tailles ; la seconde pose la colonne.
- **H4-1, contenu et feuille.** `IdeesSheet.tsx` devient `HarmonieDuChant.tsx` (mêmes props, `git mv`) ; titre
  « Harmonie de ce chant » / « 这首歌的和声 » ; feuille aux deux tiers de la hauteur (`67dvh`).
  - **Un bloc par passage**, dans l'ordre du chant (`harmonieDuChant`, refus appliqués) ; les reprises d'une même
    section (`idDeSection` identique) se replient dans le premier bloc, nom suivi de « ×n », idées dédoublonnées par
    fiche. Bloc : filet gauche `--sec-<type>`, nom (`formatSectionName`), grille en chiffres (`font-chord`,
    `--chord-color`) avec les lettres en dessous en gris (H7 fera la bascule) — `resume` si `boucle` (suivi de
    « en boucle / 循环 »), sinon les lignes jointes par « · », lignes consécutives identiques fusionnées ; une phrase
    selon `fonction` (FR et 中文 : `repos` « Finit sur le 1 : le passage se pose. », `vers-refrain` « Finit sur le
    {x} : il appelle le refrain. », `suspens` « Finit sur le {x} : il reste en suspens. », `sans-accords` « Pas
    d'accords dans ce passage. ») ; `BoutonEcouter` sur la suite du passage en lettres (une fois la boucle).
  - **Idées calculées** sous la grille : une carte par idée et par passage (plus de « Essayer où ? » ni de
    « Montrer i/n » : « Montrer » va à ce passage, « Essayer » s'y applique) ; avant → après en lettres et en
    chiffres, `BoutonEcouter` avant / après, « Ne marche pas sur ce chant ». Ordre et limite de `cinqPremieres` par
    passage (3 montrées, « Voir plus » dans le bloc). Puis les **idées de l'équipe** du passage. Un passage sans idée
    n'a pas de bloc d'idées vide.
  - **En bas** : idées de l'équipe sans passage, idées écartées (comme aujourd'hui), formulaire d'ajout avec un choix
    « Passage » (facultatif, « Tout le chant » par défaut) qui écrit `passage` et `passageNom`.
  - **Setlist** : « Faire monter le dernier refrain » juste après le bloc du dernier refrain (au lieu d'une section à
    part), « Vers le chant suivant » en dernier, avec un `BoutonEcouter` (dernier accord du chant, accord
    d'approche s'il y en a, accord du 1 du chant suivant).
  - **Boutons d'entrée** : page chant, un bouton texte « Harmonie » / « 和声 » juste après `PiluleTonalite` (l'icône
    étincelle de `ActionsChant` disparaît) ; setlist, la puce du chant courant et les liens de fusion disent
    « Harmonie ». Mêmes conditions d'accès qu'aujourd'hui (`accesHarmonie.peut`).
- **H4-2, colonne.** En tablette paysage (≥ 1 024 px) et à l'ordinateur, la porte 2 est une colonne de 400 px à droite
  de la partition, sans voile, avec sa croix ; **fermée par défaut**, ouverte ou fermée mémorisé par appareil
  (`localStorage`, comme les autres préférences de lecture). La lecture garde son plafond de 1 440 px : à 1 440 px,
  partition et colonne côte à côte ; la bulle d'un accord se ferme à l'ouverture de la colonne. Même colonne dans la
  setlist (chant courant). Le téléphone et la tablette portrait gardent la feuille. Après « Exemples d'usage T4 »
  (deux colonnes de `SongView`) : la tranche se pose sur leur travail.

### H5 — porte 1, panneau d'accord enrichi (décisions de l'orchestratrice du lot, 12/11/2026, déléguées)

Deux tranches. Le panneau (`PanneauAccord`, feuille au téléphone, bulle ailleurs) garde tout ce qu'il montre ; les
ajouts n'apparaissent que pour un accord touché **dans la partition d'un chant** (page chant, setlist), jamais sur
/accords ni dans la porte 2, ni en mode louange (`PerformanceMode` n'a pas le panneau).
- **Données** : un contexte `HarmonieDesAccords` (dans `AccordsProvider` ou à côté), donné par la page chant et par
  chaque chant de la setlist (`ChantDesAccords`) : tonalité **affichée** (celle des étiquettes, capo compris : les
  degrés ne bougent pas), passages du chant (`harmonieDuChant`, refus appliqués) et, pour H5-2, l'ouverture de la
  porte 2. Le passage de l'accord touché se lit au DOM : `closest("[data-section-uids]")` de l'ancre, et la place de
  l'accord parmi les `[data-accord-touchable]` de cette section (ce qui suit dans la partition). Accord hors section
  (calque 简谱, en-tête) : chiffre et Écouter seulement.
- **H5-1, chiffre, Écouter, Ensuite.**
  - **Chiffre** sous le nom, devant la description : « 4 dans D » / « D 调的 4 » (`chiffreDuDegre`, en
    `--chord-color`, `font-chord`) ; un accord hors tonalité garde son chiffre d'emprunt (« b7 dans D ») ; rien si la
    tonalité est inconnue.
  - **Écouter** (`BoutonEcouter`, l'accord seul, en sons réels : étiquette + capo) à droite du nom, à côté de la croix.
  - **Ensuite** : une ligne repliée « Ensuite : 5 · 6m · 1 » / « 接下来：5 · 6m · 1 » (chiffres), au plus trois
    accords : d'abord celui qui suit **vraiment** dans la partition (s'il diffère), marqué « dans ce chant » / « 本歌中 »,
    puis les suites usuelles par degré (`src/lib/harmonie/suites.ts`, pur : 1 → 4, 5, 6m ; 2m → 5, 4 ; 3m → 6m, 4 ;
    4 → 5, 1, 2m ; 5 → 1, 6m, 4 ; 6m → 4, 2m, 5 ; 7dim → 1 ; le reste → 1, 5), sans doublon. Un appui déplie (bouton,
    `aria-expanded`) une ligne par suite : chiffre, lettre (`AccordTouchable` « nu », qui ouvre son propre panneau),
    étiquette « dans ce chant » s'il y a lieu, et les notes : « garde B D · G → F# » / « 保留 B D · G → F# » (notes
    communes, puis chaque note qui bouge vers la plus proche du nouvel accord ; « tout bouge » / « 全部移动 » si rien
    n'est commun), avec un `BoutonEcouter` des deux accords (ceci → suite). Pas de clavier dans la ligne (le panneau en
    a déjà un). Repliée à chaque ouverture du panneau.
- **H5-2, Ici.** Si une idée du passage de l'accord (calculée ou de l'équipe, refus appliqués) a cet accord dans son
  « avant », une ligne « Ici : 4 → 2m7 » / « 这里：4 → 2m7 » (chiffres, nom de la fiche en dessous, `lang="fr"`) sous
  Ensuite ; un appui ferme le panneau et ouvre la porte 2 (feuille ou colonne, selon la place) **au bloc de ce
  passage**, défilé et mis en valeur comme « Montrer ». Mêmes conditions d'accès que la porte 2
  (`accesHarmonie.peut`) ; au plus une ligne Ici (la première idée du passage qui s'applique).
- Tests : nouvelle spec `harmonie-porte1.spec.ts` (chant FR `a-jamais-tu-es-saint`, chant ZH `一切歌颂赞美`, fonctions
  pures de `suites.ts`, chiffre, Ensuite déplié, Ici ouvre la porte 2) ; voisines `accords-toucher*`, `harmonie-*`.
  Captures : feuille au téléphone, bulle en tablette portrait, paysage, ordinateur et 1 440 px, FR et 中文.

### H6 — porte 3, bibliothèque (décisions de l'orchestratrice du lot, 12/11/2026, déléguées)

Deux tranches. La première refait la liste, la seconde la fiche. Les données de H2 suffisent (`ressentis`, `usages`,
`etiquettesProposees`, `ecoutes`) : rien dans `docs/harmonie/` (H9 y écrit), ni dans le panneau d'accord, le module
d'écoute, `BoutonEcouter` (H5), `SongView` ou `PerformanceMode`.
- **H6-1, liste.** (`Catalogue.tsx`)
  - **Filtres** : deux rangées de `Pilules`, **Ressenti** (chaleureux 温暖, mélancolique 忧伤, élan 推进, couleur 色彩)
    puis **Usage** (couplet 主歌, pré-refrain 副歌前奏, refrain 副歌, fin 结尾, transition 过渡 : les mots chinois
    des sections du site) ; un appui choisit, un second rend « tous ». Les menus Moment et Niveau et les pilules
    d'ambiances disparaissent ; Piano · Guitare gardé. Le compteur `cmd.harmonie.filtre` reste.
  - **Le niveau ordonne** : liste à plat, du plus simple au plus avancé pour l'instrument choisi (facile,
    intermédiaire, avancé, puis sans niveau), ordre du catalogue à niveau égal ; une ligne grise au-dessus
    « Du plus simple au plus avancé » / « 由浅入深 ». Plus de groupes par famille (la famille reste dans la fiche).
    Pourquoi à plat : le niveau ne peut ordonner qu'une seule liste ; les familles coupaient l'ordre en douze.
  - **Ligne** : nom de la fiche (`lang="fr"`, deux lignes au plus), dessous en gris les ressentis puis les usages
    puis le niveau, **en entier** (« Chaleureux · Élan · Couplet, pré-refrain · Facile »), sur deux lignes au besoin,
    sans « … » (musiciens-7). Badge « à relire » gardé.
  - **Par où commencer** replié partout en une ligne qui se déplie sur place, comme déjà en deux volets
    (musiciens-11) ; il s'efface toujours au premier filtre.
  - **Largeur** : en deux volets, liste de **280 px** (au lieu de 400 ; 320 laissait 608 px, mesuré) : la fiche passe de ~530 à ≥ 640 px à
    l'ordinateur 1 280 (musiciens-10, planche : 320 + 712). Tablette portrait (un volet) : les lignes en cartes sur
    deux colonnes (`md:grid-cols-2`), sans trous sous les cartes courtes.
  - **Ordre partagé** : le contexte du catalogue expose `ordre` (ids de la liste visible, dans l'ordre affiché) ; la
    fiche s'en sert en H6-2.
  - Tests : nouvelle spec `harmonie-bibliotheque.spec.ts` (dans `SPECS_GRAND_ECRAN` : largeur de la fiche ≥ 640 px
    sur `ordinateur`), filtres Ressenti et Usage, ordre par niveau, lignes sans troncature, parcours replié ; mises à
    jour des specs qui cherchaient les ambiances ou les menus (`harmonie-catalogue`, `pages-en-grand-harmonie*`,
    `agencement-v18-harmonie`).
- **H6-2, fiche.** (`FicheHarmonie.tsx`, plus un petit hook pour la page chant)
  - **En-tête** : nom, puis une rangée de pastilles grises (ressentis, usages, niveau) à la place des lignes
    d'ambiances et de moments ; famille gardée en petit au-dessus ou à côté ; si `etiquettesProposees`, un mot gris
    « proposées » / « 待确认 » après les pastilles.
  - **Écouter** : dans la carte « Avant → après », un `BoutonEcouter` avant / après lu dans le texte de la fiche (les
    deux premiers accords entre accents graves avant « · degrés » : `` `G → A` devient `Em7 → A` ``, flèches et « … »
    séparent, parenthèses ôtées), transposé avec le menu Tonalité ; texte illisible → pas de bouton. Fonction pure
    dans `src/lib/harmonie/` (testée).
  - **Où l'entendre en liens vers les passages** (musiciens-5) : avec `fiche.ecoutes`, **une ligne par chant**
    (classés par setlists comme les exemples, 6 puis « Voir les autres ») : titre (et pinyin) en lien vers
    `/songs/<slug>?passage=<uid JSON>` (premier passage), dessous les noms des passages en gris (type traduit par
    les clés de section du site + numéro, repli sur `nom`), trois au plus puis « +n ». Ces chants sortent de la liste
    « n chants qui le jouent déjà », qui ne garde que les autres. Les titres de la phrase écrite « Où l'entendre »
    (`repertoire`) restent des liens vers le chant, à la section si un passage d'`ecoutes` du même chant existe.
  - **Page chant** : un hook `useAllerAuPassage` (fichier à part, une ligne d'appel dans `SongDetailClient`) lit
    `passage` (JSON, comme les autres paramètres), attend la section (`[data-section-uids]`, uid exact puis même
    `idDeSection`), la fait défiler au centre et l'entoure comme « Montrer » (`harmonie-surligne`) ; introuvable :
    rien. Une fois.
  - **Précédente / suivante** (musiciens-12) : en bas de chaque fiche, une rangée de deux liens « ‹ nom » / « nom › »
    (« Fiche précédente » / « 上一张 », « Fiche suivante » / « 下一张 » en `aria-label`) qui suit `ordre` (liste
    filtrée) ; rien aux bouts ; une fiche hors de la liste filtrée suit l'ordre complet.
  - Tests : `harmonie-bibliotheque.spec.ts` complétée (Écouter présent, liens d'Où l'entendre avec `passage`, la page
    chant défile au passage — chant FR `a-jamais-tu-es-saint` —, précédente / suivante suit le filtre, fonction
    avant / après) ; voisines `harmonie-catalogue`, `pages-en-grand-harmonie*`, `harmonie-ecoute`.
- Captures des deux tranches : téléphone, tablette portrait, tablette paysage, ordinateur 1 280 et 1 440, FR et
  中文 ; `regard`, puis `critique-design` sur ses signalements.

Avant chaque lot : vérifier ses constats d'usage (musiciens-5, 7, 10, 11, 12) sur la tête de branche. Libellés
nouveaux en FR et 中文 avec `scripts/build-fonts.py`. Captures sur les quatre dispositions et 1 440 px.

## Avancement

- 11/11/2026 : captures de l'existant (téléphone, tablette, ordinateur), un `/planche` (3 agents), retouches à la
  relecture, artefact publié, questions posées.
- 11/11/2026 : « Go » de Timothée sur les six recommandations ; décisions et lots écrits. Prochain : go pour H1 ?
- 11/11/2026 : go de Timothée pour H1 ; H1 codé (non testé, non commité), puis **en attente, règle des trois chantiers ;
  reprise au début de H1**.
- 11/11/2026 : « reprends » de Timothée ; H1 relancé dans une session orchestratrice, réduit au clavier fixe et à
  « Les plus joués » au téléphone (le retour « ‹ Chants » est fait par T6 des retouches d'usage). Ensuite : une
  session par tranche, enchaînées (Timothée).
- 11/11/2026 : **H1 fait** (session neuve) : clavier piano toujours 3 octaves (viewBox 504×96, octave main gauche en
  `fill-muted`), « Les plus joués » sous les 12 notes au téléphone (`md:hidden` / `hidden md:block`) ; nouveau test de
  largeur C = F#m7b5 (`accords-page.spec.ts`). tsc et lint propres ; `tests/accords-*` : 219 passés, 1 rouge, la course
  préexistante « chant ZH : le panneau d'un accord » [telephone] (`accords-toucher-agencement.spec.ts:82`, élément
  détaché ; rouge aussi sans H1, 4 fois sur 12). Captures 390/820/1180/1440 : largeur du clavier identique pour C et
  F#m7b5 (308/299/326/389 px), aucun débordement. Le gris de l'octave gauche se voit à peine en thème clair.

- 11/11/2026 : H1 fini par sa session (commit 991cf38). Timothée n'aime pas l'entrée par boucles : H2 à H4 suspendus.
  Inventaire du site de référence de A à Z : `docs/inventaire-wangshubianqu.md`. Prochain : nouvelle planche d'Harmonie à
  partir de l'inventaire, sur accord de Timothée.

- 12/11/2026 : planche « trois portes » (`docs/planches/planche-harmonie-trois-portes.html`, artefact privé) : un seul
  contenu, l'harmonie d'un chant passage par passage ; porte 1 = panneau de l'accord touché, porte 2 = feuille ou
  colonne « Harmonie de ce chant », porte 3 = bibliothèque par ressenti et usage. Pistes A (pupitre), **B (grille du
  chant, recommandée)**, C (carnet). Critique « à retoucher » : tablette paysage et 1 440 px non dessinés ; boutons
  Écouter secondaires passés en contour à la relecture. Questions posées.
- 12/11/2026 : Timothée valide toutes les recommandations ; décisions et lots H2 à H9 réécrits. Prochain : go pour H2 ?
- 12/11/2026 : **go de Timothée pour H2** (« go pour Harmonie H2 », au pilote), en quatrième chantier de code. Session
  neuve lancée par le pilote ; le go ne couvre pas H3.
- 12/11/2026 : **H2 fait** (une tranche, session orchestratrice) : `src/lib/harmonie/passages.ts` (passages par
  section, grille en degrés avec fonction tonale T / SD / D / autre, résumé ramené à la boucle, fonction du passage
  `repos` / `vers-refrain` / `suspens` / `sans-accords` ; `harmonieDuChant` range les idées calculées puis celles de
  l'équipe dans leur passage) ; idée d'équipe : champs `passage` et `passageNom` (rien à publier dans les rules) ;
  `fiche.ecoutes` au build (2 374 écoutes chant + section sur 38 fiches à règle) ; lignes `Ressenti` et `Usage`
  « (proposé) » dans les 69 fiches. Décision en route : au plus deux ressentis par fiche, tirés des deux premières
  sensations (la première passe en donnait jusqu'à quatre). À savoir pour H4 : une boucle doit se répéter au moins
  deux fois en entier ; le repli par nom prend le premier passage du même nom. Tests : tsc, lint (0 erreur), validate,
  build:index ; 7 specs harmonie × 3 appareils, 189 passés, 3,0 min (nouvelle `harmonie-passages.spec.ts` : chant FR
  `a-jamais-tu-es-saint`, chant ZH `一切歌颂赞美`). **À valider par Timothée** : les ressentis et usages proposés,
  fiche par fiche dans `docs/harmonie/*.md` (retirer « (proposé) » une fois validé). H3 attend son go.

- 12/11/2026 : **H3 fait** (une tranche, session orchestratrice) : `src/lib/audio/synthese.ts` (plan pur : accord →
  fréquences par `voicingPiano`, do de base C3, 1,2 s par accord, un illisible garde sa place en silence ; avant /
  après séparés de 0,8 s ; lecture Web Audio, un seul `AudioContext` créé ou repris dans le geste, une lecture arrête
  l'autre et rend « Écouter » au bouton qui jouait) ; `BoutonEcouter.tsx` (« Écouter / 试听 », « Arrêter / 停止 »,
  `aria-pressed`, caché sans Web Audio, désactivé si rien n'est lisible), posé dans aucun écran : H4 à H6 le poseront.
  Tests : tsc, lint (0 erreur), validate ; nouvelle `harmonie-ecoute.spec.ts` (pure, chant FR `a-jamais-tu-es-saint`,
  ZH `一切歌颂赞美`) et trois specs harmonie voisines × 3 appareils, 87 passés, 19 s. Non testé : le son réel (aucune
  page avant H4) ; à écouter sur iOS et Android quand H4 posera le bouton.

- 12/11/2026 : **H4-1 fait** (session orchestratrice, executant + testeur + relecteur + regard) : `IdeesSheet.tsx`
  devient `HarmonieDuChant.tsx`, « Harmonie de ce chant » / « 这首歌的和声 » : un bloc par passage (filet de
  section, grille en chiffres et lettres, phrase de fonction FR et 中文, Écouter), idées calculées par passage (3 puis
  « Voir plus »), idées de l'équipe du passage, choix « Passage » au formulaire ; setlist : modulation après le
  dernier refrain, « Vers le chant suivant » en dernier avec Écouter. Bouton « Harmonie » / « 和声 » après la pilule
  de tonalité (icône étincelle seule quand la barre manque de place, niveau 3 de `data-libelles` ; libellés de la
  barre en `nowrap`) ; puce setlist « Harmonie ». **Décisions déléguées (session H4, 12/11)** : « Ne marche pas sur ce
  chant » refuse la fiche dans tous les passages (comme le libellé) ; titre chinois « 这首歌的和声 » plutôt que
  « 本歌和声 » (plus naturel, à la relecture) ; les specs « Montrer i/n », « Essayer où ? » et la contraction
  « Couplets 1 et 2 » sont retirées (sans objet). Tests : tsc, lint (0 erreur), validate ; 12 specs voisines × projets,
  373 passés et 23 échecs au premier tour (12,2 min), puis les specs en échec : 137 + 109 passés (≈ 9 min). Restent
  rouges, hors tranche (relecteur : rouges aussi sur la tête sans ce diff, ou course) : `chants-deux-volets.spec.ts:495`
  et `:512` (ordinateur, tablette paysage). Connu, non corrigé : les noms des fiches restent en français dans
  l'interface chinoise (contenu des fiches, H9) ; « Essayer » d'un bloc replié (×n) vise la première reprise. Son réel
  non écouté (à faire sur iOS et Android). Prochain : H4-2 (colonne), session neuve.

- 12/11/2026 : critique-design de H4-1 (4 captures) : « à retoucher ». **À faire en tête de H4-2** (décisions
  déléguées, session H4, 12/11) : (1) lettres de la grille sans pastille, en gris, toujours touchables (variante de
  `AccordTouchable`), seuls les chiffres en `--chord-color` ; (2) nom du passage en `text-base font-semibold`, nom
  d'idée en `text-sm font-semibold` ; (3) bouton d'entrée texte seul « Harmonie » / « 和声 », sans étincelle, page
  chant et puce setlist, libellé gardé à tous les niveaux de `data-libelles` (ce sont les autres libellés qui
  tombent) ; (4) transition dans l'ordre joué « A → B → E », chant suivant et tonalité sur leur ligne ; (5) « À
  vérifier en jouant » une seule fois, en tête des idées de la feuille ; (6) chaque côté de la flèche des chiffres en
  `whitespace-nowrap` ; plus un bouton de fermeture visible (croix) et `lang="fr"` sur le nom des fiches en interface
  chinoise.
- 12/11/2026 : **H4-2 faite, H4 fait** (session orchestratrice de H4-2). Retouches de la critique de H4-1 : lettres de
  la grille grises sans pastille et touchables (`AccordTouchable` variante `nu`), noms en semibold, bouton texte seul
  « Harmonie » / « 和声 » (page chant et puce setlist), actif (`bg-foreground`) quand la porte est ouverte, transition
  « A → B → E » avec le chant suivant sur sa ligne, « À vérifier en jouant » une fois, flèches en `nowrap`, légende des
  chiffres sous les pastilles, « Ne marche pas sur ce chant » en `text-xs` gris, croix (« Fermer » / 关闭) dans la
  feuille et la colonne, `lang="fr"` sur les noms de fiches. **Colonne** : `<aside data-harmonie-colonne>` de 400 px à
  droite de la partition, collante, sans voile, fermée par défaut, préférence `gcc-harmonie-colonne` par appareil
  (`src/hooks/useColonneHarmonie.ts`), Échap et croix ferment et rendent le focus, bulle d'accord fermée à l'ouverture
  (sans déplacer le focus, `fermerSansFocus`), « Montrer » et « Essayer » la laissent ouverte. **Décisions déléguées
  (session H4-2, 12/11)** : (1) la colonne ne s'ouvre que si la **zone de lecture** mesure au moins 824 px
  (400 + 24 + 400 de partition) ; en deçà, la feuille. Conséquence : la setlist a la colonne dès 1 024 px, mais la
  page chant, déjà en deux volets (liste des chants à gauche) dès 1 024 px, ne l'a que vers 1 650 px de fenêtre ;
  avant, la partition tombait à 90-216 px (titre coupé mot à mot, accords chevauchés). Piste pour plus tard : replier
  la liste des chants quand la colonne s'ouvre (à décider, changement d'agencement des deux volets). (2) Dans la
  setlist, la colonne relit la préférence et suit le chant lu ; elle garde le nom du chant (plusieurs chants), masqué
  sur la page chant. (3) « Harmonie » ne tombant plus, le suffixe de tonalité « (orig.) / (reco.) » de la barre tombe
  le premier (visible au seul niveau 3 de `data-libelles`). Connu, laissé : la puce setlist ne se marque pas active ;
  marges de la colonne calées sur `pb-16`/`pb-8` de la zone (`SetlistDetailClient`) ; noms des fiches en français en
  interface chinoise (H9). Tests : tsc, lint (0 erreur), validate ; `harmonie-colonne.spec.ts` (nouvelle, dans
  `SPECS_GRAND_ECRAN`) ; specs Harmonie, `barre-chant`, `chants-deux-volets`, `accords-toucher*`, `pupitre-partitions`
  sur tous les projets : premier tour 369 passés / 18 échecs (12 min, code en cours de retouche), puis après
  corrections 111 + 209 passés (10 min) et un tour ciblé des trois derniers rouges (1 min). Restent rouges, hors
  tranche : `chants-deux-volets.spec.ts:495` (trois projets) et `:512` (tablette paysage, débordement de 12 px déjà
  rouge avant). Instable, non lié : `accords-toucher-agencement.spec.ts:75` (téléphone, élément détaché ; 3/3 seul).
  Durée totale des tests ≈ 45 min. `regard` sur 17 captures, `critique-design` sur 6 (« à retoucher » : 5 retouches
  faites), relecteur (Échap, deux volets, focus : corrigés). Reposée sur « Exemples d'usage T4 » (conflit dans
  `SetlistDetailClient`) : colonne fermée, les partitions gardent la requête de conteneur `partition` de T4 (1 080 px, deux
  colonnes) ; colonne ouverte, partition à 920 px en une colonne. `harmonie-colonne`, `pupitre-partitions`,
  `harmonie-setlist`, `harmonie-montrer`, `pages-en-grand-setlists` verts après la reprise (8 min).
## Fiches d'harmonie qui manquent (choix délégué par Timothée)

69 fiches en 12 familles aujourd'hui. À ajouter, dans l'ordre d'utilité pour le répertoire :
- **substitutions** : **5/4 → 3m** (« le 3m après le 4 »), **1/5 avant 5** (quarte-sixte de cadence), **6m pour 4** (« 1 6m 5 » au lieu de « 1 4 5 »).
- **couleurs** : **add9 sur le 4 et le 1** (le 2 des chants à la guitare), **m9 sur le 6m**, **5 7sus4 → 5 7** pour
  une fin, **1 sur 1 avec la 9 à la basse de la main droite** (son « pad »).
- **passage** : **3 majeur (5 du 6m) dans un couplet**, **dominante secondaire du 2m avant le 2m7-5**.
- **emprunts** : **4m6** (couleur gospel d'avant la fin), **b7 en mineur → 1** (« Hosanna » mixolydien).
- **mineur** : famille absente ; **6m comme tonique** (chants en mineur : 6m 4 1 5 lu depuis le 6m), **5 majeur en
  mineur** (cadence harmonique).
- **boucles** : une fiche par boucle mesurée qui n'en a pas : **1 4 5 1**, **1 6m 4 5**, **4 1 5 6m**, **1 5 4**.
- **rythme** : **arrêt sur le temps (stop) avant le dernier refrain**, **demi-temps au pont**.
- **voicings** : **guitare : accords de 4 à la place des barrés**, **piano : 1 et 5 à gauche, triade à droite en
  renversement le plus proche** (fiche « mains » pour débuter).
- **transitions** : **d'un chant en 6/8 vers un 4/4** (même tempo de noire pointée).
- 12/11/2026 : **go de Timothée pour H3** (« tu peux lancer h3 », au pilote). Les quatre places de code sont prises :
  H3 part à la première place libre (fin du comptage T3), avant le pupitre (une tranche courte passe devant une chaîne
  de six ; décision déléguée, pilote, 12/11). H4 et suivants : un go par lot.
- 12/11/2026 (après-midi) — **Go de Timothée pour H4** (« go pour Harmonie H4 »). Lancé en cinquième chantier ; H5 et
  suivants gardent leur go.
- 12/11/2026 (16 h 55 UTC) — **Go de Timothée pour H5 à H9** (« tout ce qui est dans la file donne-leur le go mais ils se
  lancent chacun leur tour »). Ordre : H5, H6, H7, H9, puis H8 en dernier (mode louange, après AN et le pupitre) ; un
  lot à la fois, chaque session lance le suivant. H5 lancé.
- 12/11/2026 — **H9, découpage** (orchestratrice H9, décision déléguée) : trois tranches. **T1** le cours « Jouer
  ensemble » ; **T2** les fiches qui entrent dans les familles existantes, première moitié (substitutions, couleurs,
  passage, emprunts : 11 fiches) ; **T3** le reste (famille **mineur** nouvelle, boucles, rythme, voicings,
  transitions : 12 fiches). Fiches en français seulement, comme les 69 (README : le 中文 d'une famille s'écrit après la
  validation de son français) ; les noms des fiches en interface chinoise (relevé par H4) attendent donc cette
  validation, pas H9. Ressenti et usage « (proposé) » selon la règle de H2. Pas de règle de suggestion nouvelle
  (`regles.ts` est du code) : à proposer à part, fiche par fiche. T3 : la famille `mineur` demande sa ligne
  `harmonie.familles.mineur` dans `src/locales/fr.json` et `zh-CN.json` (libellés, pas un composant).
- 12/11/2026 — **H9 T1 faite** : le chapitre 17 du cours devient « Jouer ensemble » (même Id `jouer-en-groupe`, la
  progression des musiciens reste) plutôt qu'un chapitre de plus (décision déléguée : 17 couvrait déjà les rôles ; un
  nouveau chapitre aurait renuméroté 18 à 26). Trois parties ajoutées : 17.8 piano main gauche et basse, 17.9 deux
  guitares, 17.10 intro / pont / fin, avec des passages de nos chants (*Digne est Ton Nom*, *Ébloui*, *Ce Nom si
  merveilleux*, *Amour sans fin*, 你是我的平安, 得胜的宣告), et deux exercices (81 au lieu de 79 :
  `harmonie-cours.spec.ts` suit). Statut du chapitre : « à valider » (Timothée). Reste à faire, code : les exemples
  sont du texte ; un lien vers le passage (chant + section) demanderait une syntaxe de lien dans `cours.ts` et
  `LecteurCours`. Tests : build:index, validate, tsc ; `harmonie-cours` et `harmonie-cours-lecture` sur les trois
  appareils, 51 passés (1,4 min). Relecteur : exact ; une basse précisée. Prochaine : T2.
- 12/11/2026 — **H9 T2 faite** : 11 fiches en français, statut « à valider », ressenti et usage « (proposé) » :
  S7 le 3m après le 4 (`4 – 5/4 – 3m – 6m`), S8 la quarte-sixte de cadence, S9 le 6m à la place du 4 ; C8 les deux
  notes du haut tenues, C9 le m9 sur le 6m, C10 le sus4 qui se résout sur le 7, C11 le 1 tenu en nappe ; P7 le 3m
  qui devient majeur, P8 le 2m7b5 de passage ; E6 le 4m6 avant le dernier 1, E7 le b7 qui conclut. Passages du
  répertoire relevés par script sur les `.cho`, puis vérifiés un à un par le relecteur (quatre citations corrigées).
  Décisions déléguées (orchestratrice H9 T2, 12/11) : cinq idées de la liste recouvraient une fiche existante. Elles
  ont donc pris un angle distinct : « add9 sur le 4 et le 1 » devient C8 (toute une grille sur deux notes tenues, C1
  colorait un seul accord) ; « 3 majeur » part d'un 3m déjà écrit (P1 part du 1/3) ; « dominante secondaire du 2m
  avant le 2m7-5 » devient P8, le 2m7b5 de passage, avec P3 en variante (aucun `3m7b5 – 6 7 → 2m` dans le
  répertoire, le 2m7b5 y est deux fois) ; le 4m6 et le b7 → 1 se distinguent de E1 et de E3 par leur couleur et
  leur arrivée directe. C11 reste proche de C1 (même accord, tenu en nappe) : Timothée peut la fondre dans C1.
  Chaque fiche porte « **Règle.** Aucune : catalogue seul » (convention des familles sans règle ; le test exige la
  ligne). Reste à faire, en code et hors périmètre : une règle de suggestion par fiche, à proposer à part. Tests
  (5,2 min) : build:index (80 fiches), validate, tsc ; `harmonie-catalogue`, `harmonie-regles`, `harmonie-passages`,
  `agencement-v18-harmonie`, `pages-en-grand-harmonie-corrections` sur les trois appareils : 244 passés, 6 ignorés.
  Les 6 échecs de la ligne « Règle » sont corrigés et `harmonie-regles` repasse (27). Les tests comptent 80 fiches.
  Prochaine tranche : T3.
- 12/11/2026 : **H6-1 faite** (session orchestratrice de H6, executant + testeur + relecteur + regard) : bibliothèque
  avec deux rangées de pilules **Ressenti** et **Usage** (menus Moment et Niveau et pilules d'ambiances retirés),
  liste à plat ordonnée par niveau de l'instrument (« Du plus simple au plus avancé » / « 由浅入深 »), sous-titre
  « ressentis · usages · niveau » en entier (usages séparés par « 、 » en 中文), « Par où commencer » replié partout,
  cartes sur deux colonnes en tablette portrait, `ordre` de la liste dans le contexte du catalogue (pour H6-2).
  **Décisions déléguées (session H6, 12/11)** : (1) liste de **280 px** en deux volets, pas 320 : à 320 la fiche ne
  mesurait que 608 px à 1 280 ; (2) dans ce volet, le sous-titre peut prendre trois lignes (le texte entier prime,
  musiciens-7) ; (3) liste à plat sans familles (le niveau ne peut ordonner qu'une liste). Tests : tsc, lint
  (0 erreur), validate ; `harmonie-bibliotheque.spec.ts` (nouvelle, dans `SPECS_GRAND_ECRAN`) et voisines
  (`harmonie-catalogue`, `pages-en-grand-harmonie*`, `agencement-v18-harmonie`, `usage-reste`,
  `retouches-usage-t5`) : premier tour 355 passés / 13 échecs (8,2 min), puis les specs en échec 92 passés (2 min) et
  un dernier tour après retouches 85 + 3 passés (2,2 min). Reste rouge, hors tranche : `usage-reste.spec.ts:157`
  (`cmd.setlists.pupitre.jouer` de `Pupitre.tsx` absent de `CLES_USAGE`, chantier du pupitre). **Pour H6-2**
  (regard, 20 captures) : à 1 280 et 1 440, la fiche passe à deux colonnes et laisse un grand vide sous « Pourquoi »
  (la colonne de droite empile instrument et « Quand l'éviter ») ; « Où l'entendre » : les chants chinois n'ont ni
  détail ni accords, rangées inégales ; en-tête de fiche encore en ambiances / moments (H6-2 le remplace) ; clés
  orphelines `harmonie.niveau.titre|tous`, `moment.titre|tous`, `sensation.titre` à retirer si H6-2 les laisse
  orphelines. `critique-design` passera une fois, à la fin de H6-2, sur la liste et la fiche. Connu : pilules de
  28 px de haut (composant commun, hors lot) ; noms des fiches en français en 中文 (H9). Prochain : H6-2, session neuve.
- 12/11/2026 — **H9 T3 faite, lot H9 fini** : 11 fiches en français, statut « à valider », ressenti et usage
  « (proposé) », chacune « **Règle.** Aucune : catalogue seul ». Famille nouvelle **13 · Mineur**
  (`docs/harmonie/13-mineur.md`, code N, libellé `harmonie.familles.mineur` : « Mineur » / « 小调 ») : N1 le 6m comme
  centre, N2 le 5 majeur qui ramène au mineur. Boucles L7 `1 – 4 – 5 – 1`, L8 `1 – 6m – 4 – 5`, L9 `4 – 1 – 5 – 6m`,
  L10 `1 – 5 – 4` ; rythme R5 le stop au début du dernier refrain, R6 le demi-temps au pont ; voicings V7 piano, les
  deux mains pour débuter, V8 guitare, les accords à quatre cordes ; transitions T7 du 6/8 vers le 4/4. Plan du
  README remis à jour (91 fiches, 13 familles ; il était resté à 69 après T2). Décisions déléguées (orchestratrice H9
  T3, 12/11) : la liste de la spec compte **11** fiches et non 12 (le découpage avait arrondi) : 91 fiches, pas 92 ;
  code **N** pour le mineur (M est pris par les montées) ; angles distincts là où une fiche voisine existait : N1
  (section qui part du 6m et y revient) face à L3 et à la cadence rompue S4, N2 (cadence qui conclut en mineur,
  après le 4m) face à P1 et P7, R5 (silence **dans** le refrain) face à M5 (silence avant), V7 (recette débutant)
  face à V1 et V2, V8 (même accord sur quatre cordes) face à V4 (cordes à vide), L9 dite comme rotation de L3. T7
  cite seulement les trois chants notés en 6/8 ou 12/8 (pas de passage : une transition vit entre deux chants).
  Passages relevés par script sur les `.cho` (degrés de `passagesDuChant`), vérifiés un à un par le relecteur
  (28 citations, 20 doigtés : rien à corriger ; F# ajouté à la liste de V8, à laquelle renvoie N2). Reste à faire,
  code, hors périmètre : (1) le gras « **La boucle** » / « **Le principe** » des fiches L n'est pas un intertitre
  de `fiches.ts` : la boucle n'arrive pas dans l'app (L1 à L10) ; (2) T7 pourrait être proposée dans la setlist
  d'après `{time}` (`transitions.ts`) ; (3) le 中文 des fiches et une règle de suggestion par fiche, à proposer à
  part. Tests (5,0 min) : build:index (91 fiches), validate, tsc ; `harmonie-catalogue`, `harmonie-regles`,
  `harmonie-passages`, `agencement-v18-harmonie`, `pages-en-grand-harmonie-corrections` sur les trois appareils
  (cinq projets) : 244 passés, 6 ignorés, aucun échec. Les tests comptent 91 fiches.
